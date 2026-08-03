<#
.SYNOPSIS
    Tear down an EAIM Reference Architecture dev/prod environment completely.

.DESCRIPTION
    Deletes the resource group and purges soft-deletable resources (Key Vault,
    OpenAI) so resource names and custom subdomains are immediately free to reuse.

    Speech Services does NOT use soft-delete — it is fully removed with the RG.

    Usage:
        .\infra\cleanup.ps1 -Environment dev
        .\infra\cleanup.ps1 -Environment prod   (requires typing 'delete prod' to confirm)
#>

param(
    [Parameter(Mandatory)][ValidateSet('dev', 'prod')]
    [string]$Environment
)

$ProjectName   = 'eaim'
$ResourceGroup = "rg-$ProjectName-$Environment"

# --- Safety gate for prod ----------------------------------------------------
if ($Environment -eq 'prod') {
    Write-Host 'WARNING: You are about to delete the PRODUCTION environment.' -ForegroundColor Red
    $confirm = Read-Host "Type 'delete prod' to confirm"
    if ($confirm -ne 'delete prod') {
        Write-Host 'Aborted.' -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ''
Write-Host "This will permanently delete resource group: $ResourceGroup" -ForegroundColor Yellow
Write-Host 'All resources inside it (OpenAI, Speech, Key Vault, App Service) will be destroyed.'
$confirm = Read-Host 'Proceed? (y/N)'
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host 'Aborted.' -ForegroundColor Yellow
    exit 0
}

Write-Host ''

# --- Collect resource names before deleting the RG ---------------------------
Write-Host 'Finding resources in resource group...' -ForegroundColor Cyan

$kvName      = az keyvault list `
    --resource-group $ResourceGroup `
    --query '[0].name' `
    --output tsv 2>$null

$kvLocation  = az keyvault list `
    --resource-group $ResourceGroup `
    --query '[0].location' `
    --output tsv 2>$null

$oaiName     = az cognitiveservices account list `
    --resource-group $ResourceGroup `
    --query "[?kind=='OpenAI'].name | [0]" `
    --output tsv 2>$null

$oaiLocation = az cognitiveservices account list `
    --resource-group $ResourceGroup `
    --query "[?kind=='OpenAI'].location | [0]" `
    --output tsv 2>$null

$speechName  = az cognitiveservices account list `
    --resource-group $ResourceGroup `
    --query "[?kind=='SpeechServices'].name | [0]" `
    --output tsv 2>$null

Write-Host "  Key Vault   : $kvName"
Write-Host "  OpenAI      : $oaiName"
Write-Host "  Speech      : $speechName (no soft-delete — removed with RG)"
Write-Host ''

# --- Delete the resource group -----------------------------------------------
Write-Host "Deleting resource group '$ResourceGroup'..." -ForegroundColor Cyan
az group delete --name $ResourceGroup --yes --no-wait
Write-Host 'Resource group deletion initiated (running in background).' -ForegroundColor Green

# --- Wait for RG to finish deleting ------------------------------------------
Write-Host 'Waiting for resource group to finish deleting (up to 5 min)...' -ForegroundColor Cyan
$timeout = 300
$elapsed = 0
while ($elapsed -lt $timeout) {
    $exists = az group exists --name $ResourceGroup
    if ($exists -eq 'false') {
        Write-Host 'Resource group deleted.' -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 10
    $elapsed += 10
    Write-Host "  ...still deleting ($elapsed s elapsed)"
}

Write-Host ''

# --- Purge soft-deleted Key Vault so name is free to reuse -------------------
if ($kvName) {
    Write-Host "Purging soft-deleted Key Vault '$kvName'..." -ForegroundColor Cyan
    az keyvault purge --name $kvName --location $kvLocation 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'Key Vault purged.' -ForegroundColor Green
    } else {
        Write-Host 'Key Vault purge skipped (may not be in soft-deleted state yet).' -ForegroundColor Yellow
        Write-Host "If redeploy fails on KV name conflict, run:" -ForegroundColor Yellow
        Write-Host "  az keyvault purge --name $kvName --location $kvLocation" -ForegroundColor Cyan
    }
}

Write-Host ''

# --- Purge soft-deleted OpenAI account so custom subdomain is free -----------
if ($oaiName) {
    Write-Host "Purging soft-deleted OpenAI account '$oaiName'..." -ForegroundColor Cyan
    az cognitiveservices account purge `
        --name $oaiName `
        --resource-group $ResourceGroup `
        --location $oaiLocation 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'OpenAI account purged.' -ForegroundColor Green
    } else {
        Write-Host 'OpenAI purge skipped (may not be in soft-deleted state yet).' -ForegroundColor Yellow
        Write-Host 'If redeploy fails on subdomain conflict, run:' -ForegroundColor Yellow
        Write-Host "  az cognitiveservices account purge --name $oaiName --resource-group $ResourceGroup --location $oaiLocation" -ForegroundColor Cyan
    }
}

Write-Host ''
Write-Host 'Cleanup complete. You can redeploy with:' -ForegroundColor Green
Write-Host "  .\infra\deploy.ps1 -Environment $Environment" -ForegroundColor Cyan

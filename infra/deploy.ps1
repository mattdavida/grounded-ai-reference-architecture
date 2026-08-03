<#
.SYNOPSIS
    Deploy the Enterprise AI Modernization Reference Architecture infrastructure to Azure.

.DESCRIPTION
    Creates the resource group if it does not exist, runs a Bicep what-if preview,
    then deploys on confirmation. Fetches API keys and writes backend/.env.
    No portal required.

    Resources provisioned:
      - Azure OpenAI (gpt-5.4 GlobalStandard)
      - Azure Speech Services (F0 free for dev / S0 for prod) — on by default
      - Azure Key Vault (placeholder secrets; real values set post-deploy)
      - App Service Plan + Backend + Frontend (optional — use -DeployAppService)

    Default deploy (dev — OpenAI + Speech + Key Vault):
        .\infra\deploy.ps1

    Skip Speech (reuse an existing F0 Speech resource on the subscription):
        .\infra\deploy.ps1 -SkipSpeech

    Deploy with App Service (full cloud stack):
        .\infra\deploy.ps1 -DeployAppService

.PARAMETER Environment
    Target environment: 'dev' or 'prod'. Default: dev.

.PARAMETER DeployAppService
    Include App Service resources (backend + frontend). Off by default.

.PARAMETER SkipSpeech
    Do not provision Azure Speech. Use when the subscription already has an
    F0 Speech resource (Azure allows only one). Set AZURE_SPEECH_* in
    backend/.env from the existing resource after deploy.

.PARAMETER SkipWhatIf
    Skip the what-if preview and deploy immediately.

.EXAMPLE
    .\infra\deploy.ps1

.EXAMPLE
    .\infra\deploy.ps1 -SkipSpeech

.EXAMPLE
    .\infra\deploy.ps1 -SkipSpeech -SkipWhatIf
#>

param(
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',

    [switch]$DeployAppService,

    [switch]$SkipSpeech,

    [switch]$SkipWhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Config ------------------------------------------------------------------
$ProjectName    = 'eaim'
$ResourceGroup  = "rg-$ProjectName-$Environment"
$Location       = 'eastus'
$DeploymentName = "$ProjectName-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmm')"
$TemplateFile   = Join-Path $PSScriptRoot 'main.bicep'
$ParamsFile     = Join-Path $PSScriptRoot "params\$Environment.bicepparam"

# --- Pre-flight checks -------------------------------------------------------
Write-Host ''
Write-Host '=== EAIM Reference Architecture — Bicep Deploy ===' -ForegroundColor Cyan
Write-Host "Environment  : $Environment"
Write-Host "Resource Grp : $ResourceGroup"
Write-Host "Location     : $Location"
Write-Host "Template     : $TemplateFile"
Write-Host "Params       : $ParamsFile"
# Track as a bool so the F0 prompt can flip it without fighting [switch] semantics.
$provisionSpeech = -not $SkipSpeech.IsPresent

Write-Host "Speech       : $provisionSpeech"
Write-Host "App Service  : $($DeployAppService.IsPresent)"
Write-Host ''

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI not found. Install from https://aka.ms/installazurecliwindows and re-run.'
}

$accountJson = az account show 2>$null
if (-not $accountJson) {
    Write-Host 'Not logged in to Azure. Running az login...' -ForegroundColor Yellow
    az login | Out-Null
}
$account = az account show | ConvertFrom-Json
Write-Host "Logged in as  : $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription  : $($account.name) ($($account.id))"
Write-Host ''

# --- Check for existing F0 Speech resource (dev only, when Speech is enabled) -
if ($Environment -eq 'dev' -and $provisionSpeech) {
    Write-Host 'Checking for existing F0 Speech resource on this subscription...' -ForegroundColor Cyan
    $existingF0 = az cognitiveservices account list `
        --query "[?kind=='SpeechServices' && sku.name=='F0'].{name:name, rg:resourceGroup}" `
        --output json 2>$null | ConvertFrom-Json

    if ($existingF0) {
        # az may return a single object or an array
        if ($existingF0 -isnot [System.Array]) { $existingF0 = @($existingF0) }
        $f0Name = $existingF0[0].name
        $f0Rg   = $existingF0[0].rg

        Write-Host ''
        Write-Host "WARNING: An F0 Speech resource already exists: $f0Name (RG: $f0Rg)" -ForegroundColor Yellow
        Write-Host '         Azure allows only one F0 Speech resource per subscription.' -ForegroundColor Yellow
        Write-Host ''
        Write-Host '         Recommended: skip Speech provisioning and reuse that resource.' -ForegroundColor Yellow
        Write-Host '         Or cancel and re-run with:  .\infra\deploy.ps1 -SkipSpeech' -ForegroundColor Yellow
        Write-Host ''
        $choice = Read-Host 'Skip Speech and continue with OpenAI + Key Vault? (Y/n)'
        if ($choice -eq '' -or $choice -eq 'y' -or $choice -eq 'Y') {
            $provisionSpeech = $false
            Write-Host 'Speech provisioning skipped — will reuse existing F0.' -ForegroundColor Green
            Write-Host ''
        } else {
            Write-Host 'Deployment cancelled. Re-run with -SkipSpeech, or change speech.bicep sku to S0.' -ForegroundColor Yellow
            exit 0
        }
    } else {
        Write-Host 'No existing F0 Speech resource found. Speech will be provisioned.' -ForegroundColor Green
        Write-Host ''
    }
}

# --- Create resource group if needed -----------------------------------------
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq 'false') {
    Write-Host "Creating resource group '$ResourceGroup' in '$Location'..." -ForegroundColor Yellow
    az group create --name $ResourceGroup --location $Location | Out-Null
    Write-Host 'Resource group created.' -ForegroundColor Green
} else {
    Write-Host "Resource group '$ResourceGroup' already exists." -ForegroundColor Green
}
Write-Host ''

# --- Build deployment arguments ----------------------------------------------
$deployArgs = @(
    '--resource-group', $ResourceGroup,
    '--template-file', $TemplateFile,
    '--parameters', $ParamsFile
)

if ($DeployAppService) {
    $deployArgs += '--parameters', 'deployAppService=true'
}

if (-not $provisionSpeech) {
    $deployArgs += '--parameters', 'deploySpeech=false'
}

# --- What-if preview ---------------------------------------------------------
if (-not $SkipWhatIf) {
    Write-Host 'Running what-if preview (no changes made yet)...' -ForegroundColor Cyan
    az deployment group what-if @deployArgs
    Write-Host ''
    $confirm = Read-Host 'Proceed with deployment? (y/N)'
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host 'Deployment cancelled.' -ForegroundColor Yellow
        exit 0
    }
    Write-Host ''
}

# --- Deploy ------------------------------------------------------------------
Write-Host 'Deploying... (OpenAI provisioning takes 3-5 minutes)' -ForegroundColor Cyan
$resultJson = az deployment group create `
    @deployArgs `
    --name $DeploymentName `
    --output json

if ($LASTEXITCODE -ne 0) {
    throw 'Deployment failed. Check the Azure portal Activity Log for details.'
}

$result  = $resultJson | ConvertFrom-Json
$outputs = $result.properties.outputs

Write-Host ''
Write-Host 'Deployment succeeded!' -ForegroundColor Green
Write-Host ''

# --- Fetch OpenAI API key (not in Bicep outputs for security) ----------------
Write-Host 'Fetching OpenAI API key...' -ForegroundColor Cyan
$openaiAccountName = $outputs.openaiAccountName.value
$openaiKey = az cognitiveservices account keys list `
    --name $openaiAccountName `
    --resource-group $ResourceGroup `
    --query 'key1' `
    --output tsv

# --- Fetch Speech API key (only if Speech was provisioned) -------------------
$speechKey = ''
$speechAccountName = ''
if ($provisionSpeech -and $outputs.speechAccountName.value) {
    Write-Host 'Fetching Speech API key...' -ForegroundColor Cyan
    $speechAccountName = $outputs.speechAccountName.value
    $speechKey = az cognitiveservices account keys list `
        --name $speechAccountName `
        --resource-group $ResourceGroup `
        --query 'key1' `
        --output tsv
} else {
    Write-Host 'Speech was skipped — leave AZURE_SPEECH_* blank and fill from your existing resource.' -ForegroundColor Yellow
}

# --- Push real keys into Key Vault -------------------------------------------
Write-Host 'Writing API keys to Key Vault...' -ForegroundColor Cyan
$kvName = az keyvault list `
    --resource-group $ResourceGroup `
    --query '[0].name' `
    --output tsv

az keyvault secret set --vault-name $kvName --name 'AZURE-OPENAI-API-KEY' --value $openaiKey | Out-Null
if ($speechKey) {
    az keyvault secret set --vault-name $kvName --name 'AZURE-SPEECH-API-KEY' --value $speechKey | Out-Null
}
Write-Host 'Keys stored in Key Vault.' -ForegroundColor Green
Write-Host ''

# --- Extract remaining outputs -----------------------------------------------
$openaiEndpoint  = $outputs.openaiEndpoint.value
$chatDeployment  = $outputs.chatDeploymentName.value
$speechRegion    = $outputs.speechRegion.value
$backendUrl      = $outputs.backendUrl.value
$frontendUrl     = $outputs.frontendUrl.value
$keyVaultUri     = $outputs.keyVaultUri.value

# --- Write backend/.env directly (UTF-8, no special chars) -------------------
$backendDir = Join-Path (Split-Path $PSScriptRoot) 'backend'
if (-not (Test-Path -LiteralPath $backendDir)) {
    New-Item -ItemType Directory -Path $backendDir | Out-Null
}
$backendEnvPath = Join-Path $backendDir '.env'

$speechKeyLine = if ($speechKey) { "AZURE_SPEECH_API_KEY=$speechKey" } else { 'AZURE_SPEECH_API_KEY=' }

$envContent = @(
    "AZURE_OPENAI_API_KEY=$openaiKey"
    "AZURE_OPENAI_ENDPOINT=$openaiEndpoint"
    "AZURE_OPENAI_API_VERSION=2024-02-01"
    "AZURE_OPENAI_CHAT_DEPLOYMENT=$chatDeployment"
    ""
    $speechKeyLine
    "AZURE_SPEECH_REGION=$speechRegion"
    ""
    "CHECKPOINTS_DB=./voice_chat.db"
    "ALLOWED_ORIGINS=http://localhost:4001"
) -join "`n"

[System.IO.File]::WriteAllText($backendEnvPath, $envContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "backend/.env written to: $backendEnvPath" -ForegroundColor Green
Write-Host ''

$speechNote = if (-not $provisionSpeech) {
    @"

Speech was NOT provisioned (reuse existing F0).
Set AZURE_SPEECH_API_KEY in backend/.env from your existing resource, e.g.:

  az cognitiveservices account keys list \
    --name <existing-speech-name> \
    --resource-group <its-rg> \
    --query key1 -o tsv

"@
} else {
    ''
}

# --- Print summary -----------------------------------------------------------
$summary = @"

============================================================
 Deployment complete
============================================================

OpenAI endpoint  : $openaiEndpoint
Speech deployed  : $provisionSpeech
Speech region    : $speechRegion
Backend URL      : $backendUrl
Frontend URL     : $frontendUrl
Key Vault URI    : $keyVaultUri
$speechNote
backend/.env has been written automatically (UTF-8).

Next steps:
  1. cd backend
  2. uv sync
  3. uv run alembic upgrade head
  4. uv run python scripts/seed_db.py
  5. uv run uvicorn app.main:app --reload --port 8000
  6. Open a second terminal:
     cd frontend
     pnpm install && pnpm dev
  7. Verify: GET http://localhost:8000/api/health

============================================================
"@

Write-Host $summary -ForegroundColor Yellow

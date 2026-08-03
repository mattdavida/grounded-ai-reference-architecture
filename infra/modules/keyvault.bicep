/*
  Azure Key Vault module — Enterprise AI Modernization Reference Architecture
  ───────────────────────────────────────────────────────────────────────────
  Provisions a Key Vault for secret storage.

  Two secrets are pre-created as placeholders immediately after provisioning.
  Real values are set by deploy.ps1 using:
    az keyvault secret set --vault-name <name> --name AZURE-OPENAI-API-KEY --value <key>
    az keyvault secret set --vault-name <name> --name AZURE-SPEECH-API-KEY  --value <key>

  In prod, App Service app settings reference secrets using Key Vault references:
    @Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/AZURE-OPENAI-API-KEY/)
  This means secrets never appear in plaintext in the portal or deployment outputs.

  Access model: RBAC (recommended over legacy access policies).
  The App Service managed identities are granted "Key Vault Secrets User" in
  the app-service module after both resources exist.
*/

param name string
param location string

@allowed(['dev', 'prod'])
param environment string

// ── Key Vault ─────────────────────────────────────────────────────────────────

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: environment == 'prod' ? 90 : 7
    enabledForDeployment: false
    enabledForTemplateDeployment: true
    publicNetworkAccess: 'Enabled'
  }
}

// ── Secret placeholders ───────────────────────────────────────────────────────
// deploy.ps1 overwrites these with real values post-deploy.

resource secretOpenAIKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AZURE-OPENAI-API-KEY'
  properties: {
    value: 'REPLACE-AFTER-DEPLOY'
    contentType: 'text/plain'
    attributes: { enabled: true }
  }
}

resource secretSpeechKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AZURE-SPEECH-API-KEY'
  properties: {
    value: 'REPLACE-AFTER-DEPLOY'
    contentType: 'text/plain'
    attributes: { enabled: true }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output vaultName string = keyVault.name
output uri string = keyVault.properties.vaultUri
output id string = keyVault.id

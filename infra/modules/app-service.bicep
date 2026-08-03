/*
  App Service module — Enterprise AI Modernization Reference Architecture
  ───────────────────────────────────────────────────────────────────────
  Provisions:
    - App Service Plan (Linux, B1 dev / B2 prod)
    - Backend App Service  (FastAPI / Python via uv)
    - Frontend App Service (Next.js / Node 20)

  Both apps use system-assigned managed identities to authenticate
  to Key Vault without storing credentials anywhere.

  This module is optional — off by default for local dev.
  Set deployAppService=true in main.bicep params or pass --parameters deployAppService=true
  to deploy.ps1 when you are ready for a full cloud deployment.

  App settings reference Key Vault secrets using the Key Vault reference syntax:
    @Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<secret-name>/)
  The managed identity on the backend app must be granted "Key Vault Secrets User"
  role on the vault — handled by the RBAC assignments at the bottom of this file.
*/

param planName string
param backendAppName string
param frontendAppName string
param location string

@allowed(['dev', 'prod'])
param environment string

param openaiEndpoint string
param openaiChatDeployment string
param speechRegion string
param keyVaultName string

var planSku = environment == 'prod'
  ? { name: 'B2', tier: 'Basic', size: 'B2', family: 'B', capacity: 1 }
  : { name: 'B1', tier: 'Basic', size: 'B1', family: 'B', capacity: 1 }

// ── App Service Plan ──────────────────────────────────────────────────────────

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: planSku
  properties: {
    reserved: true
  }
}

// ── Backend App Service (FastAPI / Python via uv) ─────────────────────────────

resource backendApp 'Microsoft.Web/sites@2023-01-01' = {
  name: backendAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      alwaysOn: environment == 'prod'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'AZURE_OPENAI_API_KEY',          value: 'SET-FROM-KEYVAULT-AFTER-DEPLOY' }
        { name: 'AZURE_OPENAI_ENDPOINT',          value: openaiEndpoint }
        { name: 'AZURE_OPENAI_API_VERSION',       value: '2024-02-01' }
        { name: 'AZURE_OPENAI_CHAT_DEPLOYMENT',   value: openaiChatDeployment }
        { name: 'AZURE_SPEECH_API_KEY',           value: 'SET-FROM-KEYVAULT-AFTER-DEPLOY' }
        { name: 'AZURE_SPEECH_REGION',            value: speechRegion }
        { name: 'CHECKPOINTS_DB',                 value: '/home/site/voice_chat.db' }
        { name: 'ALLOWED_ORIGINS',                value: 'https://${frontendAppName}.azurewebsites.net' }
        { name: 'LOG_LEVEL',                      value: environment == 'prod' ? 'WARNING' : 'INFO' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE',       value: '0' }
      ]
      appCommandLine: 'pip install uv && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000'
    }
  }
}

// ── Frontend App Service (Next.js / Node 20) ──────────────────────────────────

resource frontendApp 'Microsoft.Web/sites@2023-01-01' = {
  name: frontendAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: environment == 'prod'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'NEXT_PUBLIC_API_URL',            value: 'https://${backendAppName}.azurewebsites.net' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE',       value: '0' }
      ]
    }
  }
}

// ── Key Vault RBAC: grant backend "Key Vault Secrets User" ────────────────────

var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource kvRoleBackend 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultName, backendApp.name, kvSecretsUserRoleId)
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: backendApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output backendUrl string = 'https://${backendApp.properties.defaultHostName}'
output frontendUrl string = 'https://${frontendApp.properties.defaultHostName}'
output backendPrincipalId string = backendApp.identity.principalId

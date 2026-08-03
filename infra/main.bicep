/*
  Enterprise AI Modernization Reference Architecture — Azure Infrastructure
  ==========================================================================
  Top-level deployment. Orchestrates all modules and outputs the
  values needed to populate .env.

  Resources provisioned:
    - Azure OpenAI (gpt-5.4 GlobalStandard)
    - Azure Speech Services (F0 free / S0 paid) — on by default; skip with deploySpeech=false
    - Azure Key Vault (secret storage for API keys)
    - App Service Plan + Backend + Frontend (optional — off by default for local dev)

  Deploy dev (OpenAI + Speech + Key Vault — starting-point default):
    az group create --name rg-eaim-dev --location eastus
    az deployment group create \
      --resource-group rg-eaim-dev \
      --template-file infra/main.bicep \
      --parameters infra/params/dev.bicepparam

  Deploy without Speech (reuse an existing F0 Speech resource on the subscription):
    az deployment group create \
      --resource-group rg-eaim-dev \
      --template-file infra/main.bicep \
      --parameters infra/params/dev.bicepparam \
      --parameters deploySpeech=false

  Prefer using deploy.ps1 which handles all of the above automatically.
*/

@description('Environment name — used to select SKUs and name resources.')
@allowed(['dev', 'prod'])
param environment string

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Short name used in all resource names. Keep to 8 chars max.')
@maxLength(8)
param projectName string = 'eaim'

@description('Azure OpenAI chat model deployment name (the logical name used in API calls).')
param chatModelName string = 'gpt-5.4'

@description('Deploy Azure Speech Services. On by default (starting point). Set false to reuse an existing Speech resource on the subscription (Azure allows only one F0).')
param deploySpeech bool = true

@description('Deploy App Service resources. Set to false for local-only dev (default). Flip to true for cloud deploy.')
param deployAppService bool = false

// ── Name tokens ───────────────────────────────────────────────────────────────
// uniqueString produces a deterministic 13-char hash from the resource group id.
// This ensures globally unique names without manual coordination across deploys.
var suffix = uniqueString(resourceGroup().id)
var shortSuffix = take(suffix, 6)

var names = {
  openai:         'oai-${projectName}-${environment}-${shortSuffix}'
  speech:         'cog-speech-${projectName}-${environment}-${shortSuffix}'
  keyVault:       'kv-${projectName}-${environment}-${shortSuffix}'
  appServicePlan: 'asp-${projectName}-${environment}'
  backendApp:     'app-${projectName}-api-${environment}-${shortSuffix}'
  frontendApp:    'app-${projectName}-web-${environment}-${shortSuffix}'
}

// ── Modules ───────────────────────────────────────────────────────────────────

module openai 'modules/openai.bicep' = {
  name: 'openai-deploy'
  params: {
    name: names.openai
    location: location
    chatDeploymentName: chatModelName
    environment: environment
  }
}

module speech 'modules/speech.bicep' = if (deploySpeech) {
  name: 'speech-deploy'
  params: {
    name: names.speech
    location: location
    environment: environment
  }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault-deploy'
  params: {
    name: names.keyVault
    location: location
    environment: environment
  }
}

module appService 'modules/app-service.bicep' = if (deployAppService) {
  name: 'appservice-deploy'
  params: {
    planName: names.appServicePlan
    backendAppName: names.backendApp
    frontendAppName: names.frontendApp
    location: location
    environment: environment
    openaiEndpoint: openai.outputs.endpoint
    openaiChatDeployment: chatModelName
    speechRegion: location
    keyVaultName: names.keyVault
  }
}

// ── Outputs — copy these into .env ────────────────────────────────────────────

@description('Paste into AZURE_OPENAI_ENDPOINT in .env')
output openaiEndpoint string = openai.outputs.endpoint

@description('Paste into AZURE_OPENAI_CHAT_DEPLOYMENT in .env')
output chatDeploymentName string = chatModelName

@description('Paste into AZURE_SPEECH_REGION in .env (location even when Speech is skipped)')
output speechRegion string = location

@description('OpenAI account name — used by deploy.ps1 to fetch the API key')
output openaiAccountName string = openai.outputs.accountName

@description('Speech account name — empty string if deploySpeech is false')
output speechAccountName string = deploySpeech ? speech.outputs.accountName : ''

@description('Whether Speech was provisioned in this deployment')
output speechDeployed bool = deploySpeech

@description('Backend App Service URL (empty string if deployAppService is false)')
output backendUrl string = deployAppService ? appService.outputs.backendUrl : 'localhost:8000 (run locally)'

@description('Frontend App Service URL (empty string if deployAppService is false)')
output frontendUrl string = deployAppService ? appService.outputs.frontendUrl : 'localhost:4001 (run locally)'

@description('Key Vault URI — use for secret references in prod')
output keyVaultUri string = keyVault.outputs.uri

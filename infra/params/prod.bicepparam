using '../main.bicep'

// Prod environment — S0 Speech (paid), higher OpenAI TPM, App Service included.
//
// Speech S0 rates:  $1/hour STT, $15/1M neural TTS characters
// OpenAI prod:      80K TPM capacity
//
// Always deploy with deployAppService=true in prod.

param environment     = 'prod'
param location        = 'eastus'
param projectName     = 'eaim'
param chatModelName   = 'gpt-5.4'
param deployAppService = true

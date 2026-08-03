using '../main.bicep'

// Dev environment — F0 Speech (free), lower OpenAI TPM, no App Service by default.
// Destroy and recreate freely during POC iteration.
//
// Speech F0 free tier:  5 audio hours STT/month + 500K neural TTS chars/month
// OpenAI dev capacity:  30K TPM (raise to 80K in prod.bicepparam)
//
// deploySpeech defaults to true (starting point). Set false — or pass
// deploySpeech=false / use deploy.ps1 -SkipSpeech — when the subscription
// already has an F0 Speech resource to reuse.
//
// deployAppService defaults to false — OpenAI (+ Speech) + Key Vault for local dev.

param environment  = 'dev'
param location     = 'eastus'
param projectName  = 'eaim'
param chatModelName = 'gpt-5.4'

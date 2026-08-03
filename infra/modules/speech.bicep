/*
  Azure Speech Services module — Enterprise AI Modernization Reference Architecture
  ────────────────────────────────────────────────────────────────────────────────
  Provisions:
    - Azure Cognitive Services account (kind: SpeechServices)

  SKU selection:
    dev  → F0 (free tier): 5 audio hours STT/month + 500K neural TTS chars/month
    prod → S0 (paid):      $1/hour STT, $15/1M neural TTS chars

  IMPORTANT — F0 limit:
    Azure allows only ONE F0 Speech resource per subscription.
    If your subscription already has one, change the dev sku to 'S0'.
    Check first: az cognitiveservices account list --query "[?kind=='SpeechServices']"

  No model deployments are needed — Speech Services uses pre-built
  neural models accessed via the Speech SDK using region + API key.

  API key is intentionally NOT output here — fetched post-deploy by deploy.ps1:
    az cognitiveservices account keys list --name <account> --resource-group <rg> --query key1 -o tsv
*/

param name string
param location string

@allowed(['dev', 'prod'])
param environment string

// ── Speech Services Account ───────────────────────────────────────────────────

resource speechAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: name
  location: location
  kind: 'SpeechServices'
  sku: {
    name: environment == 'prod' ? 'S0' : 'F0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output accountName string = speechAccount.name
output accountId string = speechAccount.id

// The SDK uses region (location string) + API key — not an endpoint URL.
// Region is passed through from main.bicep's location param.
output region string = location

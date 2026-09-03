param(
  [Parameter(Position = 0)]
  [ValidateSet("create", "address", "validate", "copy-key", "balance")]
  [string]$Action = "address",

  [switch]$Force
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$walletDirectory = Join-Path $projectRoot ".mythic"
$secretPath = Join-Path $walletDirectory "sepolia-wallet.key"
$addressPath = Join-Path $walletDirectory "sepolia-wallet.address"
$defaultRpcUrl = "http://127.0.0.1:8545"
$encryptionEntropy = [Text.Encoding]::UTF8.GetBytes("MythicBazaar-Sepolia-Wallet-v1")

function Assert-WalletExists {
  if (-not (Test-Path -LiteralPath $secretPath) -or -not (Test-Path -LiteralPath $addressPath)) {
    throw "No Mythic test wallet exists. Run 'npm run wallet:create' first."
  }
}

function Read-PrivateKey {
  Assert-WalletExists
  $encryptedBytes = [Convert]::FromBase64String([IO.File]::ReadAllText($secretPath).Trim())
  $plainBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
    $encryptedBytes,
    $encryptionEntropy,
    [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  )

  try {
    return [Text.Encoding]::UTF8.GetString($plainBytes)
  }
  finally {
    [Array]::Clear($plainBytes, 0, $plainBytes.Length)
  }
}

function Read-WalletAddress {
  Assert-WalletExists
  return [IO.File]::ReadAllText($addressPath).Trim()
}

switch ($Action) {
  "create" {
    if ((Test-Path -LiteralPath $secretPath) -and -not $Force) {
      throw "A Mythic test wallet already exists. Its address is $(Read-WalletAddress). Use -Force only if you intend to replace it."
    }

    $walletJson = & node (Join-Path $PSScriptRoot "generate-test-wallet.mjs")
    if ($LASTEXITCODE -ne 0) {
      throw "The local Ethereum keypair could not be generated."
    }

    $wallet = $walletJson | ConvertFrom-Json
    New-Item -ItemType Directory -Force -Path $walletDirectory | Out-Null
    $plainBytes = [Text.Encoding]::UTF8.GetBytes($wallet.privateKey)
    $encryptedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
      $plainBytes,
      $encryptionEntropy,
      [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $encryptedPrivateKey = [Convert]::ToBase64String($encryptedBytes)
    $utf8WithoutBom = New-Object Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($secretPath, $encryptedPrivateKey, $utf8WithoutBom)
    [IO.File]::WriteAllText($addressPath, $wallet.address, $utf8WithoutBom)
    [Array]::Clear($plainBytes, 0, $plainBytes.Length)
    $wallet.privateKey = $null
    $walletJson = $null

    Write-Output "Created a Windows-encrypted Ethereum test wallet."
    Write-Output "Address: $(Read-WalletAddress)"
  }

  "address" {
    Write-Output (Read-WalletAddress)
  }

  "validate" {
    $privateKey = Read-PrivateKey
    $derivedAddress = $privateKey | & node (Join-Path $PSScriptRoot "derive-wallet-address.mjs")
    $privateKey = $null
    if (-not $derivedAddress.Equals((Read-WalletAddress), [StringComparison]::OrdinalIgnoreCase)) {
      throw "The encrypted private key does not match the saved wallet address."
    }
    Write-Output "Encrypted wallet validation passed."
  }

  "copy-key" {
    $privateKey = Read-PrivateKey
    Set-Clipboard -Value $privateKey
    $privateKey = $null
    Write-Output "The test-only private key is on the Windows clipboard. Import it into MetaMask, then replace the clipboard contents immediately."
  }

  "balance" {
    $address = Read-WalletAddress
    $rpcUrl = if ([string]::IsNullOrWhiteSpace($env:NEXT_PUBLIC_LOCAL_RPC_URL)) {
      $defaultRpcUrl
    }
    else {
      $env:NEXT_PUBLIC_LOCAL_RPC_URL
    }

    & node (Join-Path $PSScriptRoot "read-wallet-balance.mjs") $address $rpcUrl
    Write-Output ""
  }
}

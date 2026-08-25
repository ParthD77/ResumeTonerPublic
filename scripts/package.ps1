$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root 'dist'
$Out = Join-Path $Root 'resume-toner-chrome.zip'
if (-not (Test-Path -LiteralPath (Join-Path $Dist 'manifest.json'))) { throw 'Build dist first.' }
if (Test-Path -LiteralPath $Out) { Remove-Item -LiteralPath $Out }
Compress-Archive -Path (Join-Path $Dist '*') -DestinationPath $Out -CompressionLevel Optimal
Write-Host "Created $Out"


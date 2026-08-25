$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root 'dist'
if (-not (Test-Path -LiteralPath $Dist)) { throw 'Run npm run build first.' }
$Forbidden = @('127.0.0.1', 'localhost:3848', 'OLLAMA_', 'GEMINI_API_KEY=', '.venv', 'resume/imports', 'outputs/current')
$Files = Get-ChildItem -LiteralPath $Dist -Recurse -File
foreach ($Needle in $Forbidden) {
  $Hit = $Files | Select-String -SimpleMatch -Pattern $Needle -List
  if ($Hit) { throw "Release audit failed: found '$Needle' in $($Hit.Path -join ', ')" }
}
$Unexpected = $Files | Where-Object { $_.Extension -in @('.py','.db','.tex','.env','.map') }
if ($Unexpected) { throw "Release audit failed: unexpected artifacts: $($Unexpected.FullName -join ', ')" }
Write-Host 'Release audit passed.'

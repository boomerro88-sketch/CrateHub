$ErrorActionPreference = 'Stop'
$env:CRATE_DESKTOP_DATA = "$env:RUNNER_TEMP\cratehub-ui-test"
$p = Start-Process -FilePath "$PWD\dist\CrateHub\CrateHub.exe" -PassThru
try {
 $loaded = $false
 for ($attempt=0; $attempt -lt 45; $attempt++) {
  Start-Sleep -Seconds 2
  if ($p.HasExited) { throw "Native app exited early: $($p.ExitCode)" }
  try {
   $health = Invoke-RestMethod 'http://localhost:8890/desktop-health' -TimeoutSec 3
   if ($health.app -eq 'cratehub' -and $health.window_loaded) { $loaded=$true; break }
  } catch { Write-Host "Waiting for native window ($attempt)" }
 }
 if (-not $loaded) { throw 'The native WebView2 window did not finish loading' }
 Write-Host "Native window loaded: $($health | ConvertTo-Json -Compress)"
 $page = Invoke-WebRequest 'http://localhost:8890/crate_e_digger.html' -UseBasicParsing
 if ($page.StatusCode -ne 200) { throw 'Catalogue not available' }
 foreach ($asset in @('/vinyl-player/assets/record-crate-empty.png','/vinyl-player/assets/record-layers/records-00.png','/vinyl-player/assets/record-layers/records-30.png','/vinyl-player/assets/vinyl-crackle.wav')) {
  $response = Invoke-WebRequest ('http://localhost:8890'+$asset) -UseBasicParsing
  if ($response.StatusCode -ne 200 -or $response.RawContentLength -lt 100) { throw "Missing asset: $asset" }
  Write-Host "Asset OK: $asset"
 }
} finally {
 if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
 if (Test-Path "$env:CRATE_DESKTOP_DATA\desktop.log") { Get-Content "$env:CRATE_DESKTOP_DATA\desktop.log" | Select-Object -Last 15 }
}

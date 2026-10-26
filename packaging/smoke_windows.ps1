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
} finally {
 if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
 if (Test-Path "$env:CRATE_DESKTOP_DATA\desktop.log") { Get-Content "$env:CRATE_DESKTOP_DATA\desktop.log" | Select-Object -Last 15 }
}

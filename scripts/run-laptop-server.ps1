# Starts the Studio Hub app and worker on this Windows laptop.
# Intended to run at logon via Task Scheduler or the Startup folder.
$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$node = Join-Path $env:ProgramFiles "nodejs\node.exe"
$logDir = Join-Path $env:LOCALAPPDATA "StudioHub\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Test-PortListening([int]$port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Test-WorkerRunning {
  $processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
  return [bool]($processes | Where-Object { $_.CommandLine -like "*worker.ts*" })
}

if (-not (Test-PortListening 3000)) {
  Start-Process -FilePath $node `
    -ArgumentList @("node_modules/next/dist/bin/next", "start", "-p", "3000") `
    -WorkingDirectory $project `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "app.out.log") `
    -RedirectStandardError (Join-Path $logDir "app.err.log")
}

if (-not (Test-WorkerRunning)) {
  Start-Process -FilePath $node `
    -ArgumentList @("node_modules/tsx/dist/cli.mjs", "scripts/worker.ts") `
    -WorkingDirectory $project `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "worker.out.log") `
    -RedirectStandardError (Join-Path $logDir "worker.err.log")
}

# Tailscale runs as a Windows service. Funnel configuration normally persists,
# but re-assert it after a reboot in case the node profile changed.
$tailscale = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
if (Test-Path $tailscale) {
  for ($i = 0; $i -lt 20; $i++) {
    try {
      $health = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/health" -UseBasicParsing -TimeoutSec 2
      if ($health.StatusCode -eq 200) { break }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  & $tailscale funnel --bg 3000 2>&1 | Out-Null
}

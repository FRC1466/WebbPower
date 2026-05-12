#!/usr/bin/env pwsh
# WebbPower one-shot dev launcher (Windows).
# Equivalent to bin/dev for macOS / Linux.
#
# Run from any directory:
#   .\bin\dev.ps1
# Or (from any shell, no execution-policy fiddling):
#   bin\dev
#
# What it does on a fresh checkout:
#   1. Installs Bun if missing.
#   2. Installs node_modules.
#   3. First time: runs `convex dev --once` interactively so you can log into
#      Convex and provision the deployment on your personal team.
#   4. Sets default Convex env vars (TBA_API_KEY, NT4_DEFAULT_HOST,
#      BROWNOUT_THRESHOLD_V) if they aren't already set.
#   5. Starts `convex dev` and `vite` in parallel with interleaved logs.
#
# Subsequent runs skip the one-time setup automatically.

$ErrorActionPreference = "Stop"

# cd to repo root (this script lives in bin/).
$RepoDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $RepoDir

function Write-Step($msg) {
  Write-Host "[webbpower] $msg" -ForegroundColor Cyan
}

# 1. Ensure Bun is installed.
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  $BunBin = Join-Path $env:USERPROFILE ".bun\bin"
  if (Test-Path (Join-Path $BunBin "bun.exe")) {
    $env:Path = "$BunBin;$env:Path"
  } else {
    Write-Step "Bun not installed. Installing..."
    Invoke-RestMethod -Uri "https://bun.sh/install.ps1" | Invoke-Expression
    $env:Path = "$BunBin;$env:Path"
  }
}

# 2. Install deps if missing.
if (-not (Test-Path "node_modules") -or -not (Test-Path "node_modules\convex")) {
  Write-Step "Installing dependencies..."
  bun install
  if ($LASTEXITCODE -ne 0) { throw "bun install failed" }
}

# 3. First-time Convex setup (interactive login + project pick).
$GeneratedApi = "convex\_generated\api.d.ts"
if (-not (Test-Path $GeneratedApi) -or -not (Test-Path ".env.local")) {
  Write-Host ""
  Write-Step "First-time Convex setup."
  Write-Step "A browser will open to log into Convex."
  Write-Step "Pick your PERSONAL team and create a new project named WebbPower."
  Write-Host ""
  bunx convex dev --once
  if ($LASTEXITCODE -ne 0) { throw "convex dev --once failed" }
}

# 4. Seed Convex env vars (idempotent — only sets if missing).
function Set-ConvexEnvIfMissing {
  param([string]$Key, [string]$Value)
  bunx convex env get $Key 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Step "Setting Convex env $Key"
    bunx convex env set $Key $Value | Out-Null
  }
}

Set-ConvexEnvIfMissing "TBA_API_KEY"          "vniP6u9DZ4nl15XPoKS9dd0x0X4GJ9PyEkJTkL7tuhvlz6cHgb6cdXfl3qgHeDbn"
Set-ConvexEnvIfMissing "NT4_DEFAULT_HOST"     "roborio-1466-frc.local"
Set-ConvexEnvIfMissing "BROWNOUT_THRESHOLD_V" "6.75"

# 5. Run convex dev + vite together.
Write-Step "Starting convex dev + vite in parallel..."
bun run dev:parallel

<#
.SYNOPSIS
    Vibe Island Windows Desktop Launcher
.DESCRIPTION
    Launches Vibe Island in standalone desktop app mode, positioned
    at the top-center of your primary display. Automatically starts
    the local event bridge if not already running.
#>

$BRIDGE_URL = "http://127.0.0.1:37891"
$ROOT_DIR = Split-Path -Parent $PSScriptRoot
$BRIDGE_SCRIPT = Join-Path $ROOT_DIR "bridge\antigravity_bridge.py"
$HTML_FILE = Join-Path $ROOT_DIR "src\index.html"

# Calculate top-center position on primary screen
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$windowWidth = 620
$windowHeight = 480
$posX = [int](($screen.Width - $windowWidth) / 2)
$posY = 0

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  LAUNCHING VIBE ISLAND FOR WINDOWS       " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[*] Display: $($screen.Width)x$($screen.Height)" -ForegroundColor Gray
Write-Host "[*] Docking at Top-Center (X: $posX, Y: $posY)..." -ForegroundColor Gray

# 1. Check if bridge is running, auto-start if needed
$bridgeActive = $false
try {
    $resp = Invoke-RestMethod -Uri "$BRIDGE_URL/api/status" -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($resp.status -eq "ok") {
        $bridgeActive = $true
    }
} catch {}

if (-not $bridgeActive) {
    Write-Host "[*] Starting local event bridge..." -ForegroundColor Yellow
    Start-Process -FilePath "python" -ArgumentList "`"$BRIDGE_SCRIPT`"" -WindowStyle Hidden
    Start-Sleep -Milliseconds 600
    try {
        $resp = Invoke-RestMethod -Uri "$BRIDGE_URL/api/status" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "ok") {
            $bridgeActive = $true
            Write-Host "[+] Local bridge connected on $BRIDGE_URL" -ForegroundColor Green
        }
    } catch {}
} else {
    Write-Host "[+] Local bridge already active on $BRIDGE_URL" -ForegroundColor Green
}

$targetUrl = if ($bridgeActive) { $BRIDGE_URL } else { "file:///$($HTML_FILE -replace '\\', '/')" }

# 2. Launch using Edge App Mode (Frameless, clean window, zero extra dependencies)
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

if (Test-Path $edgePath) {
    Start-Process $edgePath -ArgumentList `
        "--app=`"$targetUrl`"", `
        "--window-size=$windowWidth,$windowHeight", `
        "--window-position=$posX,$posY", `
        "--disable-features=Translate,OptimizationHints", `
        "--no-first-run"
    Write-Host "🚀 Vibe Island is now running at the top of your screen!" -ForegroundColor Green
} else {
    # Fallback to default browser
    Start-Process $targetUrl
}

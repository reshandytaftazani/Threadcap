<#
.SYNOPSIS
    Vibe Island Antigravity CLI Wrapper for Windows PowerShell
.DESCRIPTION
    Wraps Antigravity CLI (agy) commands and pushes live status, progress,
    and completion events to Vibe Island on http://127.0.0.1:37891.
#>

param(
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$AgyArgs
)

$BRIDGE_URL = "http://127.0.0.1:37891/api/notify"
$SESSION_ID = "antigravity:" + [guid]::NewGuid().ToString()
$script:eventRevision = 0
$PROJECT_NAME = (Split-Path -Leaf (Get-Location))

function Send-VibeEvent {
    param(
        [string]$Status,
        [string]$Message,
        [string]$Command = "",
        [string]$Duration = ""
    )
    $script:eventRevision += 1
    $body = @{
        eventId    = [guid]::NewGuid().ToString()
        sourceRevision = $script:eventRevision
        eventKind = $(if ($Status -eq 'running') { 'prompt' } else { 'session_end' })
        connectionStatus = $(if ($Status -eq 'running') { 'connected' } else { 'disconnected' })
        agentId    = "antigravity"
        id         = $SESSION_ID
        session_id = $SESSION_ID
        agent      = "Antigravity CLI"
        project    = $PROJECT_NAME
        taskTitle  = $taskDesc
        status     = $Status
        message    = $Message
        command    = $Command
        duration   = $Duration
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri $BRIDGE_URL `
                          -Method Post `
                          -Body $body `
                          -ContentType "application/json" `
                          -TimeoutSec 1 `
                          -ErrorAction SilentlyContinue | Out-Null
    } catch {
        # Bridge is optional
    }
}

# 1. Send Thinking / Started Event
$startTime = [System.Diagnostics.Stopwatch]::StartNew()
$taskDesc = ($AgyArgs -join " ")
if (-not $taskDesc) { $taskDesc = "Interactive Session" }

Send-VibeEvent -Status "running" -Message $taskDesc -Command "agy $taskDesc"

Write-Host "⚡ [Vibe Island] Monitoring Antigravity CLI session ($PROJECT_NAME)..." -ForegroundColor Cyan

# 2. Execute Antigravity CLI
& agy @AgyArgs
$exitCode = $LASTEXITCODE

$startTime.Stop()
$elapsedSeconds = [math]::Round($startTime.Elapsed.TotalSeconds, 1)
$elapsedStr = "${elapsedSeconds}s"

# 3. Send Completed or Failed Event
if ($exitCode -eq 0) {
    Send-VibeEvent -Status "completed" -Message "Antigravity task completed." -Duration $elapsedStr
    Write-Host "✅ [Vibe Island] Task completed ($elapsedStr)" -ForegroundColor Green
} else {
    Send-VibeEvent -Status "failed" -Message "Antigravity task exited with code $exitCode." -Duration $elapsedStr
    Write-Host "❌ [Vibe Island] Task failed with exit code $exitCode" -ForegroundColor Red
}

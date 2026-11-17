param([Parameter(Mandatory=$true)][string]$Manifest)
$fixture = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
$fixture.env.PSObject.Properties | ForEach-Object { [Environment]::SetEnvironmentVariable($_.Name, [string]$_.Value, 'Process') }
if ($fixture.provider -eq 'codex') {
    $fixture.event | ConvertTo-Json -Depth 12 -Compress | & $fixture.helper hook --port $fixture.port --state-file $fixture.cache
} else {
    & node (Join-Path $PSScriptRoot 'navigation-antigravity-fixture.cjs') $Manifest
}
if ($LASTEXITCODE -ne 0) { throw 'Navigation fixture observer failed' }
Start-Sleep -Seconds 600

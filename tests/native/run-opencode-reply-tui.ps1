param([Parameter(Mandatory=$true)][string]$Manifest, [switch]$KeepOrcaIdentity)
$fixture = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
Get-ChildItem Env: | Where-Object { (!$KeepOrcaIdentity -and $_.Name.StartsWith('ORCA_')) -or $_.Name.StartsWith('OPENCODE_') } | ForEach-Object { Remove-Item -LiteralPath ('Env:' + $_.Name) }
$fixture.env.PSObject.Properties | ForEach-Object { [Environment]::SetEnvironmentVariable($_.Name, [string]$_.Value, 'Process') }
& $fixture.binary --server $fixture.serverUrl --session $fixture.sessionId $fixture.directory

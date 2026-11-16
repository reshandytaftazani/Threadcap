$fixturePath=Join-Path $PSScriptRoot '../../artifacts/opencode-lifetime-manifest.json'
$fixture=Get-Content -LiteralPath $fixturePath -Raw | ConvertFrom-Json
Get-ChildItem Env: | Where-Object Name -like 'ORCA_*' | ForEach-Object {[Environment]::SetEnvironmentVariable($_.Name,$null,'Process')}
foreach($name in @('LOCALAPPDATA','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','XDG_STATE_HOME','OPENCODE_SERVER_PASSWORD')) {[Environment]::SetEnvironmentVariable($name,$fixture.env.$name,'Process')}
& $fixture.binary --server $fixture.serverUrl --session $fixture.sessionId $fixture.directory

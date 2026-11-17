param([guid]$Resume)

$codexExecutable = (Get-Command codex.exe -CommandType Application -ErrorAction Stop).Source
$previousMarker = [Environment]::GetEnvironmentVariable('THREADCAP_CODEX_LOCAL_CLIENT')
try {
    $env:THREADCAP_CODEX_LOCAL_CLIENT = '1'
    if ($PSBoundParameters.ContainsKey('Resume')) {
        & $codexExecutable --no-daemon resume $Resume.ToString()
    } else {
        & $codexExecutable --no-daemon
    }
} finally {
    [Environment]::SetEnvironmentVariable('THREADCAP_CODEX_LOCAL_CLIENT', $previousMarker)
}

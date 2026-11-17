$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$scope = [System.Windows.Automation.TreeScope]::Descendants
$property = [System.Windows.Automation.AutomationElement]::ControlTypeProperty
$type = [System.Windows.Automation.ControlType]::TabItem
$condition = [System.Windows.Automation.PropertyCondition]::new($property, $type)
$pattern = [System.Windows.Automation.SelectionItemPattern]::Pattern
$selectedId = $env:THREADCAP_TERMINAL_TAB
$results = [System.Collections.Generic.List[object]]::new()
foreach ($entry in ([string]$env:THREADCAP_TERMINAL_WINDOWS).Split(',')) {
    if ($entry -notmatch '^(\d+):(\d+)$') { continue }
    $handle = [long]$Matches[1]
    $owner = [int]$Matches[2]
    try {
        $window = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$handle)
        if ($window.Current.ProcessId -ne $owner) { continue }
        $items = $window.FindAll($scope, $condition)
        foreach ($item in $items) {
            if ($item.Current.ProcessId -ne $owner) { continue }
            $selection = $null
            if (!$item.TryGetCurrentPattern($pattern, [ref]$selection)) { continue }
            $id = $item.GetRuntimeId() -join ':'
            if (!$selectedId) {
                $results.Add(@{hwnd=$handle; id=$id; label=$item.Current.Name})
                if ($results.Count -ge 256) { break }
            } elseif ($id -eq $selectedId) {
                if (!$selection.Current.IsSelected) { $selection.Select() }
                for ($attempt = 0; $attempt -lt 10; $attempt++) {
                    if ($selection.Current.IsSelected) { '{"selected":true}'; exit }
                    Start-Sleep -Milliseconds 50
                }
            }
        }
    } catch {
        continue
    }
    if ($results.Count -ge 256) { break }
}
if ($selectedId) { '{"selected":false}' }
else { ConvertTo-Json -InputObject @($results.ToArray()) -Depth 3 -Compress }

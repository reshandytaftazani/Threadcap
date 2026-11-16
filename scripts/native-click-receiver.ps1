$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class ClickReceiverDpi { [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window,int command); }'
[void][ClickReceiverDpi]::SetThreadDpiAwarenessContext([IntPtr](-4))
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Vibe Island outside-click test target'
$form.StartPosition = 'Manual'
$form.Location = New-Object System.Drawing.Point(40, ([System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea.Bottom - 180))
$form.ClientSize = New-Object System.Drawing.Size(240,100)
$form.TopMost = $true
$script:clickCount = 0
$form.Add_Shown({
    [void][ClickReceiverDpi]::ShowWindow($form.Handle,4)
    $point = $form.PointToScreen([System.Drawing.Point]::new(120,50))
    [Console]::WriteLine((@{kind='ready';processId=$PID;x=$point.X;y=$point.Y} | ConvertTo-Json -Compress))
})
$form.Add_MouseDown({
    $script:clickCount += 1
    [Console]::WriteLine((@{kind='click';count=$script:clickCount} | ConvertTo-Json -Compress))
})
try { [void]$form.ShowDialog() } finally { $form.Dispose() }

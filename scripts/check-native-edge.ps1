param([Parameter(Mandatory)][int]$NativeProcessId,[ValidateSet('baseline','css-transparent','dwm-none')][string]$Mode='baseline')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IslandEdgeProbe {
    [StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left,Top,Right,Bottom;}
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr w,out Rect r);
    [DllImport("user32.dll")] public static extern int GetWindowRgn(IntPtr w,IntPtr r);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int l,int t,int r,int b);
    [DllImport("gdi32.dll")] public static extern int GetRgnBox(IntPtr r,out Rect b);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr r);
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr w);
    [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr w,int a,ref uint value,int size);
}
'@
[void][IslandEdgeProbe]::SetThreadDpiAwarenessContext([IntPtr](-4))
$process=Get-Process -Id $NativeProcessId
$expected=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../src-tauri/target/release/vibe-island.exe'))
if($process.Path -ne $expected){throw 'Edge probe only accepts the workspace test executable.'}
$window=$process.MainWindowHandle
if($window -eq [IntPtr]::Zero){throw 'Native test window unavailable.'}
$activated=[IslandEdgeProbe]::SetForegroundWindow($window)
Start-Sleep -Milliseconds 150
$result=$null
if($Mode -eq 'dwm-none'){$color=[uint32]4294967294;$result=[IslandEdgeProbe]::DwmSetWindowAttribute($window,34,[ref]$color,4);Start-Sleep -Milliseconds 150}
$region=[IslandEdgeProbe]::CreateRectRgn(0,0,0,0)
try {
    [void][IslandEdgeProbe]::GetWindowRgn($window,$region)
    $r=New-Object IslandEdgeProbe+Rect;$w=New-Object IslandEdgeProbe+Rect
    [void][IslandEdgeProbe]::GetRgnBox($region,[ref]$r);[void][IslandEdgeProbe]::GetWindowRect($window,[ref]$w)
    $width=$r.Right-$r.Left;$height=$r.Bottom-$r.Top
    $bitmap=New-Object System.Drawing.Bitmap(($width+8),$height)
    $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.CopyFromScreen(($w.Left+$r.Left-4),($w.Top+$r.Top),0,0,$bitmap.Size)
        $output=Join-Path $PSScriptRoot "../artifacts/native-edge-$Mode.png"
        $bitmap.Save($output,[System.Drawing.Imaging.ImageFormat]::Png)
        $bright=0
        foreach($x in @(2,3,4,5,($width+2),($width+3),($width+4),($width+5))){for($y=8;$y -lt [Math]::Min(20,$height);$y++){$c=$bitmap.GetPixel($x,$y);if($c.R -gt 150 -and $c.G -gt 150 -and $c.B -gt 150){$bright++}}}
        @{mode=$Mode;brightEdgePixels=$bright;dwmResult=$result;width=$width;height=$height;activated=$activated} | ConvertTo-Json -Compress
    } finally {$graphics.Dispose();$bitmap.Dispose()}
} finally {[void][IslandEdgeProbe]::DeleteObject($region)}

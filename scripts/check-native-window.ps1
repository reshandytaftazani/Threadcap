param([Parameter(Mandatory)][int]$NativeProcessId,[string]$GeometryFile=(Join-Path $PSScriptRoot '../artifacts/native-runtime.json'),[switch]$CompactResult)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IslandWindowProbe {
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct Point { public int X,Y; public Point(int x,int y) { X=x;Y=y; } }
    private delegate bool Visitor(IntPtr window, IntPtr data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(Visitor visitor,IntPtr data);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window,out uint process);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window,out Rect bounds);
    [DllImport("user32.dll")] public static extern int GetWindowRgn(IntPtr window,IntPtr region);
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window,uint flag);
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int left,int top,int right,int bottom);
    [DllImport("gdi32.dll")] public static extern int GetRgnBox(IntPtr region,out Rect bounds);
    [DllImport("gdi32.dll")] public static extern bool PtInRegion(IntPtr region,int x,int y);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr value);
    public static IntPtr Find(uint process) {
        IntPtr found=IntPtr.Zero;
        EnumWindows((window,data)=>{ uint candidate; GetWindowThreadProcessId(window,out candidate);
            if(candidate==process && IsWindowVisible(window)){found=window;return false;}return true; },IntPtr.Zero);
        return found;
    }
}
'@

$previousDpi = [IslandWindowProbe]::SetThreadDpiAwarenessContext([IntPtr](-4))
$region = [IslandWindowProbe]::CreateRectRgn(0,0,0,0)
try {
    $window = [IslandWindowProbe]::Find($NativeProcessId)
    if ($window -eq [IntPtr]::Zero) { throw 'Visible native island window not found.' }
    $regionType = [IslandWindowProbe]::GetWindowRgn($window,$region)
    $bounds = New-Object IslandWindowProbe+Rect
    [void][IslandWindowProbe]::GetRgnBox($region,[ref]$bounds)
    $windowBounds = New-Object IslandWindowProbe+Rect
    [void][IslandWindowProbe]::GetWindowRect($window,[ref]$windowBounds)
    $insidePoint = [IslandWindowProbe+Point]::new([int]($windowBounds.Left + ($bounds.Left + $bounds.Right) / 2), ($windowBounds.Top + $bounds.Top + 2))
    $outsidePoint = [IslandWindowProbe+Point]::new(($windowBounds.Left + 1), ($windowBounds.Top + 2))
    $geometry = (Get-Content -Raw -Encoding utf8 $GeometryFile | ConvertFrom-Json).geometry
    $checks = [ordered]@{
        visible = [IslandWindowProbe]::IsWindowVisible($window)
        nativeRegionPresent = $regionType -gt 1
        squareUpperCorner = [IslandWindowProbe]::PtInRegion($region,$bounds.Left,$bounds.Top)
        roundedLowerCorner = -not [IslandWindowProbe]::PtInRegion($region,$bounds.Left,($bounds.Bottom - 1))
        insideHitsIsland = [IslandWindowProbe]::GetAncestor([IslandWindowProbe]::WindowFromPoint($insidePoint),2) -eq $window
        transparentAreaPassesThrough = [IslandWindowProbe]::GetAncestor([IslandWindowProbe]::WindowFromPoint($outsidePoint),2) -ne $window
        widthMatchesRenderedSurface = [math]::Abs(($bounds.Right - $bounds.Left) - $geometry.width * $geometry.scale) -le 2
        heightMatchesRenderedSurface = [math]::Abs(($bounds.Bottom - $bounds.Top) - $geometry.height * $geometry.scale) -le 2
    }
    if ($CompactResult) { [pscustomobject]@{checks=$checks;regionWidth=($bounds.Right - $bounds.Left);regionHeight=($bounds.Bottom - $bounds.Top)} | ConvertTo-Json -Depth 4 }
    else {
        $checks | ConvertTo-Json
        [pscustomobject]@{ regionWidth=($bounds.Right - $bounds.Left); regionHeight=($bounds.Bottom - $bounds.Top); expectedWidth=($geometry.width * $geometry.scale); expectedHeight=($geometry.height * $geometry.scale) } | ConvertTo-Json
    }
    if ($checks.Values -contains $false) { exit 1 }
} finally {
    [void][IslandWindowProbe]::DeleteObject($region)
    [void][IslandWindowProbe]::SetThreadDpiAwarenessContext($previousDpi)
}

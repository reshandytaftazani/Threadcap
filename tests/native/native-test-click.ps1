param([Parameter(Mandatory)][int]$ExpectedProcessId,[int]$X,[int]$Y,[switch]$Right,[switch]$Locate)
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IslandTestClick {
    [StructLayout(LayoutKind.Sequential)] public struct Point {public int X,Y;public Point(int x,int y){X=x;Y=y;}}
    [StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left,Top,Right,Bottom;}
    [StructLayout(LayoutKind.Sequential)] public struct Mouse { public int X,Y;public uint Data,Flags,Time;public UIntPtr Extra; }
    [StructLayout(LayoutKind.Explicit)] public struct InputData { [FieldOffset(0)] public Mouse Mouse; }
    [StructLayout(LayoutKind.Sequential)] public struct Input { public uint Type;public InputData Data; }
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window,uint flags);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window,out Rect bounds);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint process);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll",SetLastError=true)] public static extern uint SendInput(uint count,Input[] input,int size);
    public static uint ForegroundProcess() { uint process;GetWindowThreadProcessId(GetForegroundWindow(),out process);return process; }
    public static Point Locate(int process) {
        SetThreadDpiAwarenessContext(new IntPtr(-4));
        var window=System.Diagnostics.Process.GetProcessById(process).MainWindowHandle;
        Rect bounds;if(window==IntPtr.Zero || !GetWindowRect(window,out bounds)) throw new InvalidOperationException("Native test window not found.");
        return new Point(bounds.Left,bounds.Top);
    }
    public static void Click(int process,int x,int y,bool right) {
        SetThreadDpiAwarenessContext(new IntPtr(-4));
        var root=GetAncestor(WindowFromPoint(new Point(x,y)),2);uint owner;GetWindowThreadProcessId(root,out owner);
        if(owner!=process) throw new InvalidOperationException("Click target is not the owned test window (expected "+process+", found "+owner+").");
        Point previous;GetCursorPos(out previous);
        try {
            SetCursorPos(x,y);
            var down=new Input();down.Data.Mouse.Flags=right?8u:2u;
            var up=new Input();up.Data.Mouse.Flags=right?16u:4u;
            if(SendInput(2,new[]{down,up},Marshal.SizeOf(typeof(Input)))!=2) throw new InvalidOperationException("Native input injection failed.");
            System.Threading.Thread.Sleep(80);
        } finally { SetCursorPos(previous.X,previous.Y); }
    }
}
'@
if ($Locate) {
    $point = [IslandTestClick]::Locate($ExpectedProcessId)
    @{x=$point.X;y=$point.Y;foregroundProcessId=[IslandTestClick]::ForegroundProcess()} | ConvertTo-Json -Compress
} else { [IslandTestClick]::Click($ExpectedProcessId,$X,$Y,$Right.IsPresent) }

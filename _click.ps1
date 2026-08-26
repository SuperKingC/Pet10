param([int]$x,[int]$y)
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class M {
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int X,int Y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint f,int dx,int dy,uint d,UIntPtr e);
}
"@
[M]::SetCursorPos($x,$y) | Out-Null
Start-Sleep -Milliseconds 200
[M]::mouse_event(0x0002,0,0,0,[UIntPtr]::Zero)
[M]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero)
Write-Output "CLICKED $x,$y"

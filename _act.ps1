Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text;
public class W3 {
 public delegate bool EnumDelegate(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumDelegate d, IntPtr l);
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 public static IntPtr found = IntPtr.Zero;
 public static bool Cb(IntPtr h, IntPtr l){
   StringBuilder sb = new StringBuilder(256); GetWindowText(h, sb, 256);
   if(sb.ToString().Contains("pet10-miniapp")){ found = h; return false; }
   return true;
 }
}
"@
[W3]::EnumWindows([W3+EnumDelegate]{ param($h,$l); [W3]::Cb($h,$l) }, [IntPtr]::Zero) | Out-Null
$h = [W3]::found
if($h -eq [IntPtr]::Zero){ Write-Output "NOT FOUND"; exit 1 }
if([W3]::IsIconic($h)){ [W3]::ShowWindow($h, 9) | Out-Null }
[W3]::SetForegroundWindow($h) | Out-Null
Write-Output "RESTORED $h"

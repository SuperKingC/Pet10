Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text;
public class W4 {
 public delegate bool EnumDelegate(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumDelegate d, IntPtr l);
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
 public static IntPtr found = IntPtr.Zero;
 public static bool Cb(IntPtr h, IntPtr l){
   StringBuilder sb = new StringBuilder(256); GetWindowText(h, sb, 256);
   if(sb.ToString().Contains("pet10-miniapp")){ found = h; return false; }
   return true;
 }
}
"@
[W4]::EnumWindows([W4+EnumDelegate]{ param($h,$l); [W4]::Cb($h,$l) }, [IntPtr]::Zero) | Out-Null
$h = [W4]::found
Write-Output ("iconic=" + [W4]::IsIconic($h))
$r1 = [W4]::ShowWindow($h, 9); Write-Output "restore9=$r1"
Start-Sleep -Milliseconds 500
$r2 = [W4]::ShowWindow($h, 5); Write-Output "show5=$r2"
Start-Sleep -Milliseconds 500
$r = New-Object W4+RECT; [W4]::GetWindowRect($h,[ref]$r) | Out-Null
Write-Output ("rect=" + $r.L + "," + $r.T + "," + ($r.R-$r.L) + "x" + ($r.B-$r.T))

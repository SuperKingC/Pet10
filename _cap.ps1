param([string]$out="d:\Pet10\cap_full.png")
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text;
public class W2 {
 public delegate bool EnumDelegate(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumDelegate d, IntPtr l);
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
 public static IntPtr found = IntPtr.Zero;
 public static bool Cb(IntPtr h, IntPtr l){
   if(!IsWindowVisible(h)) return true;
   StringBuilder sb = new StringBuilder(256); GetWindowText(h, sb, 256);
   if(sb.ToString().Contains("pet10-miniapp")){ found = h; return false; }
   return true;
 }
}
"@
[W2]::EnumWindows([W2+EnumDelegate]{ param($h,$l); [W2]::Cb($h,$l) }, [IntPtr]::Zero) | Out-Null
$h = [W2]::found
if($h -eq [IntPtr]::Zero){ Write-Output "WINDOW NOT FOUND"; exit 1 }
$r = New-Object W2+RECT
[W2]::GetWindowRect($h,[ref]$r) | Out-Null
$w=$r.R-$r.L; $hgt=$r.B-$r.T
$bmp = New-Object System.Drawing.Bitmap $w,$hgt
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.L,$r.T,0,0,(New-Object System.Drawing.Size $w,$hgt))
$bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "SAVED $w x $hgt at $($r.L),$($r.T)"

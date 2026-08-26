Add-Type -TypeDefinition @"
using System; using System.Collections.Generic; using System.Runtime.InteropServices; using System.Text;
public class W {
 public delegate bool EnumDelegate(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumDelegate d, IntPtr l);
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
 public static List<string> outp = new List<string>();
 public static bool Cb(IntPtr h, IntPtr l){
   if(!IsWindowVisible(h)) return true;
   StringBuilder sb = new StringBuilder(256); GetWindowText(h, sb, 256);
   string t = sb.ToString();
   if(t.Contains("pet10") || t.Contains("微信开发者")){
     RECT r; GetWindowRect(h, out r); uint pid; GetWindowThreadProcessId(h, out pid);
     outp.Add(pid + "|" + h.ToInt64() + "|" + r.L + "," + r.T + "," + (r.R-r.L) + "x" + (r.B-r.T) + "|" + t);
   }
   return true;
 }
}
"@
[W]::EnumWindows([W+EnumDelegate]{ param($h,$l); [W]::Cb($h,$l) }, [IntPtr]::Zero) | Out-Null
[W]::outp

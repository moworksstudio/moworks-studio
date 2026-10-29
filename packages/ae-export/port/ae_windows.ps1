# Lists the visible windows of After Effects / After Effects (Beta) (a #32770 = a dialog that blocks scripts) and CPU use over 2 s.
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class AeWin { public delegate bool P(IntPtr h, IntPtr l);
[DllImport("user32.dll")] public static extern bool EnumWindows(P p, IntPtr l);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
[DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
public static List<string> L(uint p0){ var r=new List<string>(); EnumWindows((h,l)=>{ uint pid; GetWindowThreadProcessId(h,out pid); var c=new StringBuilder(64); GetClassName(h,c,64); var t=new StringBuilder(160); GetWindowText(h,t,160); if(pid==p0 && IsWindowVisible(h)) r.Add(h+" "+c+" '"+t+"'"); return true;},IntPtr.Zero); return r; } }
"@
$ae = Get-Process "AfterFX (Beta)", "AfterFX" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $ae) { "AE not running"; exit }
[AeWin]::L([uint32]$ae.Id)
$c1 = $ae.TotalProcessorTime.TotalSeconds; Start-Sleep 2; $ae.Refresh()
"cpu s/2s: $([math]::Round($ae.TotalProcessorTime.TotalSeconds - $c1, 2))  mem GB: $([math]::Round($ae.WorkingSet64 / 1GB, 1))  responding: $($ae.Responding)"

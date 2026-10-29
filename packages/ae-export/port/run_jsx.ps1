# Runs a .jsx inside the open After Effects (Beta) through File > Scripts > Run Script File... (menu command posted to the AE
# window, path typed into AE's own Open dialog). Used because "AfterFX.exe -r" is ignored by the running Beta 27.0. Works with AE and AE (Beta).
# v2: an alert that AE shows while the script runs (a script error) is pictured to <done>.alert.png and closed, exit 4.
# usage: powershell -File run_jsx.ps1 <script.jsx> [<done-marker file to wait for>] [timeout s]
param([string]$Jsx, [string]$Done = "", [int]$Timeout = 900)
# Output in UTF-8: the caller reads it as UTF-8, and Windows PowerShell's default (the console's OEM code page) turned Vietnamese into "?"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class AeRun { public delegate bool P(IntPtr h, IntPtr l);
[DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, string l);
[DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
[DllImport("user32.dll")] public static extern bool EnumWindows(P p, IntPtr l);
[DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr w, P p, IntPtr l);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
[DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
[DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
[DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
[StructLayout(LayoutKind.Sequential)] public struct RC { public int L, T, R, B; }
[DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RC r);
[DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
public static IntPtr Alert(uint p0){ IntPtr f=IntPtr.Zero; EnumWindows((h,l)=>{ uint pid; GetWindowThreadProcessId(h,out pid); var c=new StringBuilder(64); GetClassName(h,c,64); var t=new StringBuilder(64); GetWindowText(h,t,64); if(pid==p0 && IsWindowVisible(h) && c.ToString()=="#32770" && t.ToString()==""){ f=h; return false;} return true;},IntPtr.Zero); return f; }
public static IntPtr Dlg(uint p0){ IntPtr f=IntPtr.Zero; EnumWindows((h,l)=>{ uint pid; GetWindowThreadProcessId(h,out pid); var c=new StringBuilder(64); GetClassName(h,c,64); var t=new StringBuilder(64); GetWindowText(h,t,64); if(pid==p0 && IsWindowVisible(h) && c.ToString()=="#32770" && t.ToString()=="Open"){ f=h; return false;} return true;},IntPtr.Zero); return f; }
public static IntPtr Ctl(IntPtr d, int id, string cls){ IntPtr f=IntPtr.Zero; EnumChildWindows(d,(h,l)=>{ var c=new StringBuilder(64); GetClassName(h,c,64); if(GetDlgCtrlID(h)==id && c.ToString()==cls){ f=h; return false;} return true;},IntPtr.Zero); return f; } }
"@
$ae = Get-Process "AfterFX (Beta)", "AfterFX" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $ae) { Write-Output "ERROR: After Effects is not running (open it first, with no dialog open)"; exit 1 }
$jsxFull = (Resolve-Path $Jsx).Path
if ($Done -ne "" -and (Test-Path $Done)) { Remove-Item $Done }
[AeRun]::PostMessage($ae.MainWindowHandle, 0x0111, [IntPtr]917505, [IntPtr]::Zero) | Out-Null     # File > Scripts > Run Script File...
$d = [IntPtr]::Zero
for ($i = 0; $i -lt 40 -and $d -eq [IntPtr]::Zero; $i++) { Start-Sleep -Milliseconds 250; $d = [AeRun]::Dlg([uint32]$ae.Id) }
if ($d -eq [IntPtr]::Zero) { Write-Output "ERROR: AE did not open its Run Script File dialog (is a modal dialog open in AE?)"; exit 2 }
$edit = [AeRun]::Ctl($d, 1148, "Edit"); $ok = [AeRun]::Ctl($d, 1, "Button")
[AeRun]::SendMessage($edit, 0x000C, [IntPtr]::Zero, $jsxFull) | Out-Null
Start-Sleep -Milliseconds 200
[AeRun]::SendMessage($ok, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null    # BM_CLICK on Open
if ($Done -eq "") { Write-Output "started $jsxFull"; exit 0 }
$t0 = Get-Date
while (-not (Test-Path $Done)) {
  Start-Sleep -Milliseconds 500
  # a script error shows a modal alert in AE and the script never writes its done file: picture it, close it (WM_CLOSE = OK), report
  # an alert = an untitled dialog that stays (the "Executing Script ..." progress window has a title and must never be closed)
  $al = [AeRun]::Alert([uint32]$ae.Id)
  if ($al -ne [IntPtr]::Zero) { Start-Sleep -Seconds 2; if (-not [AeRun]::IsWindowVisible($al) -or (Test-Path $Done)) { $al = [IntPtr]::Zero } }
  if ($al -ne [IntPtr]::Zero) {
    Add-Type -AssemblyName System.Drawing
    $r = New-Object AeRun+RC; [AeRun]::GetWindowRect($al, [ref]$r) | Out-Null
    $bmp = New-Object System.Drawing.Bitmap ([Math]::Max(1, $r.R - $r.L)), ([Math]::Max(1, $r.B - $r.T)); $g = [System.Drawing.Graphics]::FromImage($bmp); $dc = $g.GetHdc()
    [AeRun]::PrintWindow($al, $dc, 2) | Out-Null; $g.ReleaseHdc($dc); $g.Dispose(); $png = "$Done.alert.png"; $bmp.Save($png); $bmp.Dispose()
    [AeRun]::PostMessage($al, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    Write-Output "ERROR: After Effects showed an alert (a script error); closed it. Picture: $png"; exit 4
  }
  if (((Get-Date) - $t0).TotalSeconds -gt $Timeout) { Write-Output "ERROR: timeout waiting for $Done"; exit 3 }
}
Start-Sleep -Milliseconds 300
Get-Content $Done -Encoding UTF8

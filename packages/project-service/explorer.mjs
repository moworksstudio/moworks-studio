// Open a folder, or show a file selected in its folder, in Windows Explorer, and bring that window to the front (it never opens
// behind another window). The app's server runs in the background, and Windows' foreground
// lock lets a background process raise a window only in some cases, so the work is done in one short PowerShell (no new dependency):
//   1. an Explorer window already showing that folder is reused (no second window; a file is selected in it), else Explorer opens one;
//   2. it waits up to 5 s for the window (Shell.Application lists Explorer's windows with their folder and handle);
//   3. it restores the window if minimised, sends a lone Alt key (Windows then lets the next SetForegroundWindow through: the
//      documented "last input" rule), and calls SetForegroundWindow and BringWindowToTop.
// When Windows still refuses, it flashes the window's taskbar button instead (its own behaviour for a refused foreground request).
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname } from "node:path";

const SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
$target = $env:MW_TARGET; $select = $env:MW_SELECT -eq '1'
$folder = if ($select) { Split-Path -Parent $target } else { $target }
$want = ([string]$folder).TrimEnd('\').ToLowerInvariant()
Add-Type -Namespace Mw -Name Win -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
'@
$shell = New-Object -ComObject Shell.Application
# the handles of Explorer's windows showing the folder (numbers: a COM window object does not survive PowerShell's pipeline)
function Get-Handles { $r = New-Object System.Collections.ArrayList; foreach ($w in @($shell.Windows())) { try { $p = [string]$w.Document.Folder.Self.Path; if ($p.TrimEnd('\').ToLowerInvariant() -eq $want) { [void]$r.Add([int64]$w.HWND) } } catch {} }; return ,$r }
$before = Get-Handles
$hw = [int64]0
if ($before.Count -gt 0) {
  $hw = $before[0]
  if ($select) {          # the folder is open already: the file is selected there, no second window
    $done = $false
    foreach ($w in @($shell.Windows())) { try { if ([int64]$w.HWND -eq $hw) { $it = $w.Document.Folder.ParseName((Split-Path -Leaf $target)); if ($it) { $w.Document.SelectItem($it, 29); $done = $true } } } catch {} }
    if (-not $done) { $hw = [int64]0 }
  }
}
if ($hw -eq 0) {
  if ($select) { Start-Process explorer.exe -ArgumentList ('/select,"' + $target + '"') } else { Start-Process explorer.exe -ArgumentList ('"' + $target + '"') }
  for ($i = 0; $i -lt 50 -and $hw -eq 0; $i++) {
    Start-Sleep -Milliseconds 100
    $all = Get-Handles
    foreach ($x in $all) { if ($before -notcontains $x) { $hw = $x; break } }
    if ($hw -eq 0 -and $i -ge 15 -and $all.Count -gt 0) { $hw = $all[0] }          # Explorer reused the window it had for this folder
  }
}
if ($hw -eq 0) { exit 2 }
$h = [IntPtr]$hw
if ([Mw.Win]::IsIconic($h)) { [void][Mw.Win]::ShowWindow($h, 9) }
[Mw.Win]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [Mw.Win]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[void][Mw.Win]::SetForegroundWindow($h); [void][Mw.Win]::BringWindowToTop($h)
if ([Mw.Win]::GetForegroundWindow() -eq $h) { exit 0 } else { exit 3 }
`;

/**
 * Show `path` in Explorer and bring the window to the front. select: show the file selected in its folder (a folder is opened as is).
 * Returns the child process (its exit code: 0 in front, 3 refused by Windows (taskbar flash), 2 no window found), or null off Windows.
 */
export function showInExplorer(path, { select = false } = {}) {
  const isDir = existsSync(path) && statSync(path).isDirectory();
  const sel = select && !isDir;
  if (process.platform !== "win32") {
    spawn(process.platform === "darwin" ? "open" : "xdg-open", [sel ? dirname(path) : path], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    return null;
  }
  const c = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(SCRIPT, "utf16le").toString("base64")],
    // not detached: Windows PowerShell started without a console (DETACHED_PROCESS) exits at once and runs nothing, so Show did nothing;
    // a hidden console is enough, and unref() still lets the server go on without it
    { stdio: "ignore", windowsHide: true, env: { ...process.env, MW_TARGET: path, MW_SELECT: sel ? "1" : "0" } });
  c.on("error", () => {});
  c.unref();
  return c;
}

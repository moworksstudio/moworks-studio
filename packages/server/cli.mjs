// npm start / Moworks Studio.bat: start the backend and open the app window. --port N for a fixed port, --no-open to only print the URL.
// --background (what the .bat uses, through tools/start-hidden.vbs): no console window. Output goes to runtime/logs/app.log. A second
// start opens a window on the running app instead of a second service. The service stops on Exit, or after a few idle minutes once no
// app window has called it and nothing is running (the window was closed with its X). A failure at start shows a message box.
// MW_PORT / MW_TOKEN fix the port and the session token (tests, the Vite dev server).
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { startServer } from "./index.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const background = argv.includes("--background");
const IDLE_MS = Number(process.env.MW_IDLE_MS ?? 3 * 60 * 1000);   // MW_IDLE_MS: tests
const stateFile = join(process.env.MW_STATE_DIR ?? join(APP_ROOT, "runtime", "state"), "app.json");
const logFile = join(APP_ROOT, "runtime", "logs", "app.log");
const profile = process.env.MW_APP_PROFILE ?? join(APP_ROOT, "runtime", "app-window");   // MW_APP_PROFILE, MW_APP_ARGS: tests

if (background) {             // no console: every line goes to the log
  mkdirSync(join(logFile, ".."), { recursive: true });
  const write = (level) => (...a) => { try { appendFileSync(logFile, `${new Date().toISOString()} ${level} ${a.map(String).join(" ")}\n`); } catch { /* disk full */ } };
  console.log = write("info"); console.error = write("error"); console.warn = write("warn");
  process.on("uncaughtException", (e) => { console.error(e?.stack ?? e); messageBox(`Moworks Studio stopped with an error:\n\n${e?.message ?? e}\n\nDetails: ${logFile}`); process.exit(1); });
}

// ---- one service at a time: a second start just opens a window on the running one
const running = await (async () => {
  try {
    const st = JSON.parse(readFileSync(stateFile, "utf8"));
    process.kill(st.pid, 0);
    const r = await fetch(`http://127.0.0.1:${st.port}/api/health`, { headers: { "X-MW-Token": st.token }, signal: AbortSignal.timeout(3000) });
    return r.ok ? st : null;
  } catch { return null; }
})();
if (running && !argv.includes("--port")) {
  // one app at a time. A second start runs no second service: it brings the open window to the front, or opens it again
  // when it was closed
  console.log(`Moworks Studio is already running (process ${running.pid}); bringing its window forward.`);
  if (!argv.includes("--no-open") && !focusAppWindow()) openWindow(running.url);
  process.exit(0);
}

let s;
try {
  s = await startServer({ port: Number(opt("--port", process.env.MW_PORT ?? 0)), token: process.env.MW_TOKEN || undefined, onExit: () => quit("exit"),
    onRestart: () => { spawn(process.execPath, [join(APP_ROOT, "tools", "restart-app.mjs"), String(process.pid)], { cwd: APP_ROOT, detached: true, stdio: "ignore", windowsHide: true }).unref(); quit("exit"); },
    onWindowGone: () => quit("window closed"), thumbnails: true });
} catch (e) {
  console.error(e?.stack ?? e);
  if (background) messageBox(`Moworks Studio could not start:\n\n${e?.message ?? e}\n\nDetails: ${logFile}`);
  process.exit(1);
}
mkdirSync(join(stateFile, ".."), { recursive: true });
writeFileSync(stateFile, JSON.stringify({ pid: process.pid, port: s.port, url: s.url, token: s.token, startedAt: new Date().toISOString() }, null, 2) + "\n");
console.log(background ? "Moworks Studio is running in the background." : "Moworks Studio is running. Keep this window open; closing it stops the app.");
console.log(`App address: ${s.url}`);
if (!argv.includes("--no-open")) openWindow(s.url);

// ---- stop when the app window is gone: no request from it for a few minutes and nothing running (background mode only)
if (background) setInterval(() => { if (!s.busy() && Date.now() - s.lastSeen() > IDLE_MS) quit("idle"); }, Math.min(30000, IDLE_MS / 2)).unref();

let quitting = false;
/** Stop running work, close the app's browser window(s), stop the service. */
async function quit(reason) {
  if (quitting) return;
  quitting = true;
  console.log(`Stopping (${reason}).`);
  // the app window closes while the service stops, not after it (PowerShell's process query alone took seconds)
  const windows = reason === "exit" ? closeAppWindows() : null;
  try { await s.shutdown(); } catch (e) { console.error(e?.stack ?? e); }
  await windows;
  try { if (JSON.parse(readFileSync(stateFile, "utf8")).pid === process.pid) rmSync(stateFile, { force: true }); } catch { /* gone */ }
  process.exit(0);
}
process.on("SIGINT", () => quit("interrupt"));

/** The browser that shows the app: Chrome or Edge as an app window, else the default browser. */
function findBrowser() {
  const pf = process.env.ProgramFiles ?? "C:\\Program Files", pf86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", la = process.env.LOCALAPPDATA ?? "";
  return [join(pf, "Google", "Chrome", "Application", "chrome.exe"), join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
    join(la, "Google", "Chrome", "Application", "chrome.exe"), join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"), join(pf, "Microsoft", "Edge", "Application", "msedge.exe")]
    .find((b) => b && existsSync(b)) ?? null;
}

function openWindow(url) {
  const exe = findBrowser();
  // Its own browser profile (runtime/app-window): a browser that is already running (Edge keeps one in the background) reuses its process
  // and ignores the window flags. Sign-in and sync are off, so the profile never copies the user's browser data or shows a sync prompt.
  // Opens maximized; "Restore down" goes to a centred window of 75% of the screen's work area. The browser opens at that centred size
  // (size flags cancel --start-maximized, and an --app window's saved bounds are not read back), then Windows maximizes it, so it keeps
  // the centred size as its restore size.
  let place = [];
  try {
    const [x, y, w, h] = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
      "Add-Type -AssemblyName System.Windows.Forms; $a=[System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea; \"$($a.X),$($a.Y),$($a.Width),$($a.Height)\""],
      { encoding: "utf8", windowsHide: true, timeout: 5000 }).trim().split(",").map(Number);
    const ww = Math.round(w * 0.75), wh = Math.round(h * 0.75);
    if (ww > 0 && wh > 0) place = [`--window-size=${ww},${wh}`, `--window-position=${x + Math.round((w - ww) / 2)},${y + Math.round((h - wh) / 2)}`];
  } catch { /* no size: --start-maximized alone */ }
  if (exe) {
    const b = spawn(exe, [`--app=${url}`, `--user-data-dir=${profile}`, ...(place.length ? place : ["--start-maximized"]), "--no-first-run",
      "--no-default-browser-check", "--disable-sync", "--disable-features=msImplicitSignin", ...(process.env.MW_APP_ARGS ?? "").split(" ").filter(Boolean)],
      // windowsHide stays off for this one: the browser is a GUI program (it has no console to hide), and windowsHide starts a GUI
      // program with SW_HIDE, which Windows applies to its first window: the app window itself
      { detached: true, stdio: "ignore", windowsHide: false });
    b.on("error", () => {}).unref();
    if (place.length) maximizeWhenShown(basename(exe));
    dressWindow(basename(exe));
  } else spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  console.log(`Opening the app window${exe ? ` (${exe.includes("msedge") ? "Edge" : "Chrome"})` : ""}. If no window appears, paste the address above into Chrome or Edge.`);
}

/** The app profile's main browser process (its command line names the profile; helpers carry --type=), in PowerShell: $b. The values
 *  a script uses (the browser, the profile, the icon, a message) arrive in its environment (MW_*), never quoted into the script: a quote in
 *  a folder name would run as code. Function declarations, not consts: the top-level code above calls them before this line runs. */
function appProcess() { return `$like = '*' + [WildcardPattern]::Escape($env:MW_PROFILE) + '*'
    $b = Get-CimInstance Win32_Process -Filter "name='$env:MW_EXE'" | Where-Object { $_.CommandLine -like $like -and $_.CommandLine -notlike '*--type=*' }`; }
function ps(script, opts = {}, vars = {}) {
  return ["powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
    { windowsHide: true, ...opts, env: { ...process.env, MW_PROFILE: profile, ...vars } }];
}

/** Maximize the app window once it appears (up to 20 s) through user32 ShowWindow(SW_MAXIMIZE). The process started here hands over to
 *  the browser process of the app profile, so the window is found through that profile's main process. */
function maximizeWhenShown(exeName) {
  // the browser sets its own first size just after the window shows, so it waits for a visible window and checks the result a few times
  const script = `Add-Type -Namespace MW -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int c);
      [DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h); [DllImport("user32.dll")] public static extern bool IsZoomed(System.IntPtr h);';
    $ok = 0
    for ($i = 0; $i -lt 80 -and $ok -lt 3; $i++) {
      Start-Sleep -Milliseconds 250
      ${appProcess()}
      $b = $b | Select-Object -First 1
      if (-not $b) { continue }
      $h = (Get-Process -Id $b.ProcessId -ErrorAction SilentlyContinue).MainWindowHandle
      if (-not $h -or $h -eq 0 -or -not [MW.U]::IsWindowVisible($h)) { continue }
      if ([MW.U]::IsZoomed($h)) { $ok++ } else { $ok = 0; [MW.U]::ShowWindow($h, 3) | Out-Null }
    }`;
  // -EncodedCommand (UTF-16LE base64): Windows PowerShell drops the double quotes of a -Command argument. Not detached: a detached
  // PowerShell has no console and stops at once; it ends with the app anyway.
  const [cmd, args, o] = ps(script, { stdio: "ignore" }, { MW_EXE: exeName });
  spawn(cmd, args, o).on("error", () => {}).unref();
}

/** the app window's taskbar button and title bar wear the app's own icon, sharp and with clear corners. A browser app
 *  window draws its taskbar icon from the page's small favicon scaled up (soft, with dark corners). So once the window shows, this gives
 *  it the app's AppUserModel ID, name and relaunch icon, and sets its big and small icons from ui/dist/brand/app.ico at the screen's own
 *  sizes. The icons belong to this PowerShell, so it stays while the window is open (checking every few seconds that the icon is still
 *  ours, after the browser changes it) and ends with it. */
function dressWindow(exeName) {
  const ico = [join(APP_ROOT, "ui", "dist", "brand", "app.ico"), join(APP_ROOT, "ui", "public", "brand", "app.ico")].find((f) => existsSync(f));
  if (!ico) return;
  const bat = join(APP_ROOT, "Moworks Studio.bat");
  const script = `Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential, Pack=4)] public struct PKEY { public Guid f; public uint p; }
[StructLayout(LayoutKind.Explicit)] public struct PVAR { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr p; [FieldOffset(16)] public long pad; }
[ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPS { int GetCount(out uint c); int GetAt(uint i, out PKEY k); int GetValue(ref PKEY k, out PVAR v); int SetValue(ref PKEY k, ref PVAR v); int Commit(); }
public static class MWD {
  [DllImport("shell32.dll")] static extern int SHGetPropertyStoreForWindow(IntPtr h, ref Guid riid, [MarshalAs(UnmanagedType.Interface)] out IPS ps);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr LoadImage(IntPtr h, string n, uint t, int cx, int cy, uint l);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  public static void Prop(IntPtr h, uint pid, string val) {
    Guid iid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"); IPS ps; if (SHGetPropertyStoreForWindow(h, ref iid, out ps) != 0) return;
    PKEY k = new PKEY(); k.f = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"); k.p = pid;
    PVAR v = new PVAR(); v.vt = 31; v.p = Marshal.StringToCoTaskMemUni(val); ps.SetValue(ref k, ref v); ps.Commit();
  }
}
'@
    [MWD]::SetProcessDPIAware() | Out-Null
    $ico = $env:MW_ICO
    $cx = [MWD]::GetSystemMetrics(11); $sx = [MWD]::GetSystemMetrics(49)
    $big = [MWD]::LoadImage([IntPtr]::Zero, $ico, 1, $cx, $cx, 0x10); $small = [MWD]::LoadImage([IntPtr]::Zero, $ico, 1, $sx, $sx, 0x10)
    $done = [IntPtr]::Zero; $gone = 0
    for ($i = 0; $i -lt 100000 -and $gone -lt 4; $i++) {
      Start-Sleep -Milliseconds ($(if ($done -eq [IntPtr]::Zero) { 250 } else { 3000 }))
      ${appProcess()}
      $b = $b | Select-Object -First 1
      if (-not $b) { if ($done -ne [IntPtr]::Zero -or $i -gt 80) { $gone++ }; continue }
      $h = (Get-Process -Id $b.ProcessId -ErrorAction SilentlyContinue).MainWindowHandle
      if (-not $h -or $h -eq 0 -or -not [MWD]::IsWindow($h)) { continue }
      $gone = 0
      if ($h -ne $done) {
        [MWD]::Prop($h, 3, "$ico,0"); [MWD]::Prop($h, 4, 'Moworks Studio'); [MWD]::Prop($h, 2, ('"' + $env:MW_BAT + '"')); [MWD]::Prop($h, 5, 'MoworksStudio.App')
        $done = $h
      }
      if ([MWD]::SendMessage($h, 0x7F, [IntPtr]1, [IntPtr]::Zero) -ne $big) {
        [MWD]::SendMessage($h, 0x80, [IntPtr]1, $big) | Out-Null; [MWD]::SendMessage($h, 0x80, [IntPtr]0, $small) | Out-Null
      }
    }`;
  const [cmd, args, o] = ps(script, { stdio: "ignore" }, { MW_EXE: exeName, MW_ICO: ico, MW_BAT: bat });
  spawn(cmd, args, o).on("error", () => {}).unref();
}

/** Bring the app's window to the front (restored if minimized). False when no app window is open. The Alt key tap lets this background
 *  process hand the foreground over (Windows refuses SetForegroundWindow otherwise). */
function focusAppWindow() {
  const exe = findBrowser();
  if (!exe) return false;
  const script = `Add-Type -Namespace MW -Name F -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int c);
      [DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h); [DllImport("user32.dll")] public static extern bool IsIconic(System.IntPtr h);
      [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, System.UIntPtr e);';
    ${appProcess()}
    $b = $b | Select-Object -First 1
    if (-not $b) { exit 3 }
    $h = (Get-Process -Id $b.ProcessId -ErrorAction SilentlyContinue).MainWindowHandle
    if (-not $h -or $h -eq 0) { exit 3 }
    if ([MW.F]::IsIconic($h)) { [MW.F]::ShowWindow($h, 9) | Out-Null }
    [MW.F]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero); [MW.F]::keybd_event(0x12, 0, 2, [System.UIntPtr]::Zero)
    [MW.F]::SetForegroundWindow($h) | Out-Null
    exit 0`;
  const [cmd, args, o] = ps(script, { timeout: 15000 }, { MW_EXE: basename(exe) });
  return spawnSync(cmd, args, o).status === 0;
}

/** Close the app's own browser window(s): the browser process of the app profile only (never the user's other browser windows); a
 *  normal close first, then a forced one if it is still there after 5 s. */
function closeAppWindows() {
  const exe = findBrowser();
  if (!exe) return;
  const script = `${appProcess()}
    $p = $b
    foreach ($x in $p) { taskkill /PID $x.ProcessId | Out-Null }
    for ($i = 0; $i -lt 20; $i++) { Start-Sleep -Milliseconds 250; if (-not ($p | Where-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue })) { break } }
    foreach ($x in $p) { if (Get-Process -Id $x.ProcessId -ErrorAction SilentlyContinue) { taskkill /PID $x.ProcessId /T /F | Out-Null } }`;
  const [cmd, args, o] = ps(script, { timeout: 15000 }, { MW_EXE: basename(exe) });
  return new Promise((done) => { const c = spawn(cmd, args, { ...o, stdio: "ignore" }); const t = setTimeout(() => { try { c.kill(); } catch { /* gone */ } done(); }, 15000); c.on("exit", () => { clearTimeout(t); done(); }); c.on("error", () => { clearTimeout(t); done(); }); });
}

/** A Windows message box (background mode has no console to show an error in). */
function messageBox(text) {
  const [cmd, args, o] = ps("Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show($env:MW_MESSAGE, 'Moworks Studio', 'OK', 'Error') | Out-Null",
    { timeout: 600000 }, { MW_MESSAGE: String(text) });
  spawnSync(cmd, args, o);
}

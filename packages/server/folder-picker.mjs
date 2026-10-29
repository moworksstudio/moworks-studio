// The Windows folder picker for "Choose…": a web page cannot pick a real folder path, so the local service opens the
// modern Windows dialog (IFileOpenDialog with FOS_PICKFOLDERS, the one Explorer uses) through PowerShell, in front of the app window,
// and answers with the chosen path or null. It never blocks the service: the dialog runs in its own process.
import { spawn } from "node:child_process";

const CS = `using System; using System.Runtime.InteropServices;
public static class MwPick {
  [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")] class FileOpenDialogRCW {}
  [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IFileDialog {
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes(uint c, IntPtr f); void SetFileTypeIndex(uint i); void GetFileTypeIndex(out uint i);
    void Advise(IntPtr p, out uint c); void Unadvise(uint c); void SetOptions(uint fos); void GetOptions(out uint fos);
    void SetDefaultFolder(IShellItem psi); void SetFolder(IShellItem psi); void GetFolder(out IShellItem ppsi); void GetCurrentSelection(out IShellItem ppsi);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string n); void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string n);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string t); void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string t);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string t); void GetResult(out IShellItem ppsi);
  }
  [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IShellItem { void BindToHandler(IntPtr a, ref Guid b, ref Guid c, out IntPtr d); void GetParent(out IShellItem p);
    void GetDisplayName(uint sigdn, [MarshalAs(UnmanagedType.LPWStr)] out string name); void GetAttributes(uint m, out uint a); void Compare(IShellItem o, uint h, out int r); }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHCreateItemFromParsingName(string path, IntPtr pbc, ref Guid riid, out IShellItem item);
  public static string Pick(IntPtr owner, string title, string initial) {
    var d = (IFileDialog)new FileOpenDialogRCW();
    d.SetOptions(0x20 | 0x40 | 0x800);           // pick folders, file system only, path must exist
    if (!string.IsNullOrEmpty(title)) d.SetTitle(title);
    if (!string.IsNullOrEmpty(initial)) { try { var g = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"); IShellItem f; SHCreateItemFromParsingName(initial, IntPtr.Zero, ref g, out f); d.SetFolder(f); } catch {} }
    int hr = d.Show(owner); if (hr != 0) return hr == unchecked((int)0x800704C7) ? null : "HR:" + hr.ToString("X");
    IShellItem r; d.GetResult(out r); string p; r.GetDisplayName(0x80058000, out p); return p;
  }
}`;

/** Open the picker; resolves the chosen folder or null (cancelled). MW_PICK_FOLDER (tests) answers without a dialog. */
export function pickFolder({ title = "", initial = "" } = {}) {
  if (process.env.MW_PICK_FOLDER !== undefined) return Promise.resolve(process.env.MW_PICK_FOLDER || null);
  // the title and the start folder arrive in the environment, never inside the script (a quote in a folder name ran as code)
  const script = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
${CS}
'@
Add-Type -Namespace MW -Name K -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, System.UIntPtr e);'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$f = New-Object System.Windows.Forms.Form; $f.TopMost = $true; $f.ShowInTaskbar = $false; $f.Opacity = 0; $f.StartPosition = 'CenterScreen'; $f.Size = '1,1'
$f.Show(); [MW.K]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero); [MW.K]::keybd_event(0x12, 0, 2, [System.UIntPtr]::Zero); $f.Activate()
$p = [MwPick]::Pick($f.Handle, [string]$env:MW_PICK_TITLE, [string]$env:MW_PICK_INITIAL)
$f.Close()
if ($p) { [Console]::Out.Write($p) }`;
  return new Promise((ok, no) => {
    const c = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
      { windowsHide: true, env: { ...process.env, MW_PICK_TITLE: String(title), MW_PICK_INITIAL: String(initial) } });
    let out = "", err = "";
    c.stdout.on("data", (d) => { out += d; }); c.stderr.on("data", (d) => { err += d; });
    const t = setTimeout(() => c.kill(), 15 * 60 * 1000);
    c.on("error", (e) => { clearTimeout(t); no(e); });
    c.on("close", (code) => { clearTimeout(t); if (code !== 0 && !out) return no(Object.assign(new Error(`The folder picker did not open: ${err.trim().split(/\r?\n/).slice(-2).join(" ")}`), { code: "PICKER" })); const v = out.trim(); if (v.startsWith("HR:")) return no(Object.assign(new Error(`The folder picker failed (${v})`), { code: "PICKER" })); ok(v || null); });
  });
}

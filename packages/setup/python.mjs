// The app's Python components: the libraries the app's own scripts use (tools/intake/intake.py for PSD,
// PowerPoint, PDF and music; tools/asr/align_lyrics.py for lyric timing; the After Effects export), pinned and installed with pip into the app's own folder
// (runtime/python-libs), never into the system Python. A library the system Python already has at any version counts as present (the
// scripts only need it to import); the pinned version is what the app installs when one is missing. Python itself is pins.python.exe
// (the user installs Python 3.12 once: the first-run screen shows the winget line); every package is credited in the app's source registry.
import { execFile, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";

/** module → pip pin, licence, link; mb: its download on a Python with none of them (Windows wheels for Python 3.12 with the
 *  dependencies it alone pulls in: librosa brings scipy, scikit-learn, numba and llvmlite; checked 29/10/2026, about 157 MB in all).
 *  faster-whisper is not here: it comes with the Whisper model (config/asr-models.json runtime.pip). */
export const COMPONENTS = [
  { module: "psd_tools", pip: "psd-tools==1.23.0", licence: "MIT", link: "https://github.com/psd-tools/psd-tools", for: "PSD / PSB files", mb: 1 },
  { module: "pptx", pip: "python-pptx==1.0.2", licence: "MIT", link: "https://github.com/scanny/python-pptx", for: "PowerPoint files", mb: 5 },
  { module: "pypdfium2", pip: "pypdfium2==5.14.0", licence: "Apache-2.0 / BSD-3-Clause", link: "https://github.com/pypdfium2-team/pypdfium2", for: "PDF and AI pages", mb: 4 },
  { module: "librosa", pip: "librosa==1.0.0", licence: "ISC", link: "https://github.com/librosa/librosa", for: "music tempo and beats (the app's scan and lyric timing)", mb: 90 },
  { module: "soundfile", pip: "soundfile==0.14.0", licence: "BSD-3-Clause", link: "https://github.com/bastibe/python-soundfile", for: "reading audio for librosa", mb: 1 },
  { module: "PIL", pip: "pillow==12.3.0", licence: "MIT-CMU", link: "https://github.com/python-pillow/Pillow", for: "pictures", mb: 7 },
  { module: "numpy", pip: "numpy==2.5.1", licence: "BSD-3-Clause", link: "https://github.com/numpy/numpy", for: "numbers", mb: 12 },
  // the After Effects export (packages/ae-export/port): Playwright drives the pinned Chromium through executable_path (no browser
  // download of its own), fontTools reads the film's fonts
  { module: "playwright", pip: "playwright==1.63.0", licence: "Apache-2.0", link: "https://github.com/microsoft/playwright-python", for: "the After Effects export (drives the pinned Chrome)", mb: 37 },
  { module: "fontTools", pip: "fonttools==4.66.1", licence: "MIT", link: "https://github.com/fonttools/fonttools", for: "the After Effects export (fonts)", mb: 3 },
];

export const pyLibs = (root = APP_ROOT) => process.env.MW_PYLIBS ?? join(root, "runtime", "python-libs");
export function pythonExe(root = APP_ROOT) { const e = expandEnv(loadPins(root).python?.exe ?? ""); return e && existsSync(e) ? e : null; }
const env = (root) => ({ ...process.env, MW_PYLIBS: pyLibs(root), PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" });
const probeCode = (mods) => `import sys, os, json, importlib
p = os.environ.get("MW_PYLIBS")
if p and os.path.isdir(p): sys.path.insert(0, p)
out = {}
for m in ${JSON.stringify(mods)}:
    try:
        x = importlib.import_module(m); out[m] = {"ok": True, "version": str(getattr(x, "__version__", getattr(x, "VERSION", "")) or ""), "where": "app" if p and (getattr(x, "__file__", "") or "").startswith(p) else "system"}
    except Exception as e:
        out[m] = {"ok": False, "error": type(e).__name__ + ": " + str(e)[:160]}
print(json.dumps(out))`;

const noPython = () => ({ python: null, ready: false, components: COMPONENTS.map((c) => ({ ...c, ok: false, error: "Python not found" })), missing: COMPONENTS.map((c) => c.pip) });
const PROBE = { encoding: "utf8", windowsHide: true, timeout: 120000 };
/** A check out of time says nothing of the libraries, only of a busy computer (asr.mjs importAnswer): they stand as present, so Set up never reopens for it. */
export function statusOf(exe, stdout, stderr, timedOut = false) {
  if (timedOut) return { python: exe, ready: true, unverified: true, components: COMPONENTS.map((c) => ({ ...c, ok: true, unverified: true })), missing: [] };
  let got = {};
  try { got = JSON.parse((stdout ?? "").trim().split(/\r?\n/).pop()); } catch { /* reported below */ }
  const components = COMPONENTS.map((c) => ({ ...c, ...(got[c.module] ?? { ok: false, error: (stderr ?? "").trim().split(/\r?\n/).pop() || "could not check" }) }));
  const missing = components.filter((c) => !c.ok).map((c) => c.pip);
  return { python: exe, ready: missing.length === 0, components, missing };
}
/** { python, ready, components: [{ module, pip, licence, link, for, ok, version, where, error }], missing: [pip] } (the checks' worker) */
export function status(root = APP_ROOT) {
  const exe = pythonExe(root);
  if (!exe) return noPython();
  const r = spawnSync(exe, ["-I", "-c", probeCode(COMPONENTS.map((c) => c.module))], { ...PROBE, env: env(root) });
  return statusOf(exe, r.stdout, r.stderr, r.error?.code === "ETIMEDOUT");
}
/** status() without holding the caller's event loop: importing the components takes seconds (librosa, playwright), and the server's
 *  setup jobs ask for it (T27-3). */
export async function statusAsync(root = APP_ROOT) {
  const exe = pythonExe(root);
  if (!exe) return noPython();
  const r = await new Promise((ok) => execFile(exe, ["-I", "-c", probeCode(COMPONENTS.map((c) => c.module))], { ...PROBE, env: env(root) }, (e, stdout, stderr) => ok({ stdout, stderr, timedOut: !!e?.killed })));
  return statusOf(exe, r.stdout, r.stderr, r.timedOut);
}

/** pip install the missing ones into runtime/python-libs (a download: the user starts it from Settings › System). { installed, log }. */
export async function install(root = APP_ROOT, { only = null, signal = null, onLine = () => {} } = {}) {
  const exe = pythonExe(root);
  if (!exe) return Promise.reject(Object.assign(new Error("Python is not on this computer"), { code: "NO_PYTHON" }));
  const want = only ?? (await statusAsync(root)).missing;
  if (!want.length) return Promise.resolve({ installed: [], log: "" });
  mkdirSync(pyLibs(root), { recursive: true });
  return new Promise((ok, bad) => {
    const c = spawn(exe, ["-m", "pip", "install", "--disable-pip-version-check", "--no-input", "--target", pyLibs(root), "--upgrade", ...want], { env: env(root), windowsHide: true });
    let log = "";
    const take = (d) => { const s = String(d); log = (log + s).slice(-20000); for (const l of s.split(/\r?\n/)) if (l.trim()) onLine(l.trim()); };
    c.stdout.on("data", take); c.stderr.on("data", take);
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => { signal?.removeEventListener("abort", kill); code === 0 ? ok({ installed: want, log }) : bad(Object.assign(new Error(`pip failed (exit ${code}): ${log.trim().split(/\r?\n/).slice(-2).join(" ")}`), { code: "PIP_FAILED" })); });
  });
}

/** Run one of the app's Python scripts (tools/…) with the components on its path; the last stdout line is its JSON answer. */
export function runPy(root, script, args, { timeoutMs = 10 * 60 * 1000, signal = null, more = null } = {}) {
  const exe = pythonExe(root);
  if (!exe) return Promise.resolve({ ok: false, error: "Python is not on this computer" });
  return new Promise((ok) => {
    const c = spawn(exe, ["-I", join(root, script), ...args], { env: more ? { ...env(root), ...more } : env(root), windowsHide: true });
    let out = "", err = "";
    c.stdout.on("data", (d) => { out = (out + d).slice(-200000); });
    c.stderr.on("data", (d) => { err = (err + d).slice(-8000); });
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    const t = setTimeout(kill, timeoutMs);
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", () => {
      clearTimeout(t); signal?.removeEventListener("abort", kill);
      try { ok(JSON.parse(out.trim().split(/\r?\n/).pop())); } catch { ok({ ok: false, error: err.trim().split(/\r?\n/).pop() || "no answer" }); }
    });
  });
}

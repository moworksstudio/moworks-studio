// Version manager: pinned HyperFrames installs side by side, pinned Chromium and FFmpeg, current / previous with rollback.
// HyperFrames is never a dependency of this repo: each version lives in runtime/hf/<version>/node_modules and is loaded by the
// hf-* adapters from there. This module installs files and records state; it does not import or run HyperFrames itself.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const APP_ROOT = join(import.meta.dirname, "..", "..");

export function expandEnv(p) {
  return p.replace(/%([A-Z0-9_]+)%/gi, (_, k) => process.env[k] ?? `%${k}%`);
}

// Portable pins: config/pins.json names folders with {app} (this app's folder) and {work} (the work folder) instead of a
// drive letter; this computer's own choices (the work folder picked at first start, clones it keeps, a backup folder) are in
// runtime/state/local-pins.json, never in git: { "<section>.<key>": "<path>" }, e.g. { "lemo.root": "D:/path/to/lemo-opuscar" }.
export const localPinsFile = (root = APP_ROOT) => process.env.MW_LOCAL_PINS ?? join(root, "runtime", "state", "local-pins.json");     // MW_LOCAL_PINS: tests
const readJsonSafe = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
/** Set (or with null, clear) this computer's own paths. */
export function setLocalPins(patch, root = APP_ROOT) {
  const f = localPinsFile(root), cur = readJsonSafe(f, {});
  for (const [k, v] of Object.entries(patch)) { if (v == null) delete cur[k]; else cur[k] = String(v); }
  mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(cur, null, 2) + "\n");
  return cur;
}
const PATH_KEYS = new Set(["root", "skillsRoot", "registryRoot", "dir", "exe", "path", "workRoot", "backupRoot"]);
/** FFmpeg on this computer: the pinned folder, else WinGet's Gyan.FFmpeg, else ffmpeg.exe on PATH. */
function findFfmpegDir(pinned) {
  if (pinned && existsSync(join(pinned, "ffmpeg.exe"))) return pinned;
  const pk = join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Packages");
  try {
    for (const d of readdirSync(pk).filter((n) => /^Gyan\.FFmpeg/i.test(n)).sort().reverse())
      for (const b of readdirSync(join(pk, d)).sort().reverse()) if (existsSync(join(pk, d, b, "bin", "ffmpeg.exe"))) return join(pk, d, b, "bin");
  } catch { /* no WinGet */ }
  for (const d of String(process.env.PATH ?? "").split(";")) if (d && existsSync(join(d, "ffmpeg.exe"))) return d;
  return pinned;
}
/** Python 3 on this computer: the pinned exe, else the newest python.exe under %LOCALAPPDATA%\Programs\Python, else one on PATH. */
function findPython(pinned) {
  if (pinned && existsSync(pinned)) return pinned;
  const base = join(process.env.LOCALAPPDATA ?? "", "Programs", "Python");
  try { for (const d of readdirSync(base).filter((n) => /^Python3\d+$/i.test(n)).sort((a, b) => Number(b.slice(7)) - Number(a.slice(7)))) if (existsSync(join(base, d, "python.exe"))) return join(base, d, "python.exe"); } catch { /* none */ }
  for (const d of String(process.env.PATH ?? "").split(";")) if (d && !/WindowsApps/i.test(d) && existsSync(join(d, "python.exe"))) return join(d, "python.exe");
  return pinned;
}

export function loadPins(root = APP_ROOT) {
  const p = JSON.parse(readFileSync(join(root, "config", "pins.json"), "utf8"));
  for (const [k, v] of Object.entries(readJsonSafe(localPinsFile(root), {}))) {          // this computer's own paths first
    const [sec, key] = k.split(".");
    if (p[sec] && key) p[sec][key] = v;
  }
  const work = p.storage?.workRoot && !p.storage.workRoot.includes("{work}") ? p.storage.workRoot.replace(/\{app\}/g, root) : join(root, "..");
  const fill = (s) => s.replace(/\{app\}/g, root).replace(/\{work\}/g, work);
  for (const sec of Object.values(p)) if (sec && typeof sec === "object" && !Array.isArray(sec))
    for (const [k, v] of Object.entries(sec)) if (PATH_KEYS.has(k) && typeof v === "string" && /\{(app|work)\}/.test(v)) sec[k] = fill(v);
  if (p.ffmpeg) p.ffmpeg.dir = findFfmpegDir(p.ffmpeg.dir ? expandEnv(p.ffmpeg.dir) : null) ?? p.ffmpeg.dir;
  if (p.python?.exe) p.python.exe = findPython(expandEnv(p.python.exe));
  // HF's skills and registry: the configured clone, else the copy bundled with the app (bundle/hf), else the app's own thin copy at the
  // pinned commit (runtime/hf-src)
  for (const [key, sub] of [["skillsRoot", "skills"], ["registryRoot", "registry"]]) {
    const cur = p.hyperframes?.[key] ? expandEnv(p.hyperframes[key]) : null;
    if (cur && existsSync(cur)) continue;
    const alt = [join(root, "bundle", "hf", sub), join(root, "runtime", "hf-src", sub)].find((d) => existsSync(d));
    if (alt) p.hyperframes[key] = alt;
  }
  return p;
}

/** The commit a source folder holds: its git HEAD (a clone), else the commit its PINNED file names (a copy bundled with the app, without
 *  .git: "<repo> <commit>" on the first line). null when neither. */
export function sourceHead(dir) {
  const read = (f) => { try { return readFileSync(f, "utf8").trim(); } catch { return ""; } };
  const head = read(join(dir, ".git", "HEAD"));
  if (head) {
    if (!head.startsWith("ref: ")) return head;
    const ref = head.slice(5), loose = read(join(dir, ".git", ...ref.split("/")));
    if (loose) return loose;
    const packed = read(join(dir, ".git", "packed-refs")).split(/\r?\n/).find((l) => l.endsWith(` ${ref}`));
    if (packed) return packed.split(" ")[0];
  }
  const pinned = read(join(dir, "PINNED")).split(/\r?\n/)[0]?.split(/\s+/).pop();
  return /^[0-9a-f]{40}$/.test(pinned ?? "") ? pinned : null;
}

export function paths(root = APP_ROOT) {
  const runtime = join(root, "runtime");
  return { runtime, hf: join(runtime, "hf"), chromium: join(runtime, "chromium"), state: join(runtime, "hf", "state.json") };
}

export function readState(root = APP_ROOT) {
  const p = paths(root).state;
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : { current: null, previous: null, history: [] };
}

function writeState(state, root) {
  const p = paths(root).state;
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(state, null, 2) + "\n");
}

/**
 * Environment every HF process gets: opt-outs plus pinned FFmpeg first on PATH, and no AI / cloud API keys
 * (`hyperframes snapshot` sends frames to Gemini by default when GEMINI_API_KEY is set; client material must stay local).
 */
export function runtimeEnv(root = APP_ROOT, base = process.env) {
  const pins = loadPins(root);
  const ffDir = expandEnv(pins.ffmpeg.dir);
  const env = { ...base };
  for (const k of Object.keys(env)) if (pins.stripEnv.some((p) => k.toUpperCase() === p)) delete env[k];
  return { ...env, ...pins.env, PATH: `${ffDir};${base.PATH ?? base.Path ?? ""}`,
    HYPERFRAMES_FFMPEG_PATH: join(ffDir, "ffmpeg.exe"), HYPERFRAMES_FFPROBE_PATH: join(ffDir, "ffprobe.exe"),
    PRODUCER_BROWSER_GPU_MODE: renderSettings(root).gpu === "cpu" ? "software" : "auto" };
}

// The user's render choice: "auto" lets HyperFrames use this computer's GPU for Chrome / WebGL when it has a
// usable one (its own probe), SwiftShader otherwise; "cpu" always SwiftShader. Renders, checks and stills all read it from the env above.
export const GPU_CHOICES = ["auto", "cpu"];
const renderFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "render.json");
export function renderSettings(root = APP_ROOT) {
  let s = {};
  try { if (existsSync(renderFile(root))) s = JSON.parse(readFileSync(renderFile(root), "utf8")); } catch { /* a broken file is the default */ }
  return { gpu: GPU_CHOICES.includes(s.gpu) ? s.gpu : "auto", lastCheck: s.lastCheck ?? null };
}
/** patch: { gpu } and / or { lastCheck } (what the last test frame found). */
export function saveRenderSettings(patch, root = APP_ROOT) {
  if (patch.gpu != null && !GPU_CHOICES.includes(patch.gpu)) throw Object.assign(new Error("Rendering is auto or cpu"), { code: "INVALID" });
  const next = { ...renderSettings(root), ...Object.fromEntries(Object.entries(patch).filter(([k]) => ["gpu", "lastCheck"].includes(k))) };
  mkdirSync(dirname(renderFile(root)), { recursive: true });
  writeFileSync(renderFile(root), JSON.stringify(next, null, 2) + "\n");
  return next;
}

export function hfDir(version, root = APP_ROOT) {
  return join(paths(root).hf, version);
}

export function installed(root = APP_ROOT) {
  const d = paths(root).hf;
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((v) => existsSync(join(d, v, "node_modules", "@hyperframes", "producer", "package.json"))).sort();
}

/** Installed version of each pinned package inside one HF folder (reads package.json files only). */
export function packageVersions(version, root = APP_ROOT) {
  const pins = loadPins(root);
  const out = {};
  for (const name of pins.hyperframes.packages) {
    const pj = join(hfDir(version, root), "node_modules", ...name.split("/"), "package.json");
    out[name] = existsSync(pj) ? JSON.parse(readFileSync(pj, "utf8")).version : null;
  }
  return out;
}

/** npm's own CLI script next to the running Node, run with node itself (no shell, no .cmd wrapper). */
function npmCli() {
  const cli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (!existsSync(cli)) throw new Error(`npm not found next to Node at ${cli}`);
  return cli;
}

/** Install every pinned HF package at exactly `version` into runtime/hf/<version>. Install scripts are not run. */
export function install(version, root = APP_ROOT, log = console.log) {
  const pins = loadPins(root);
  if (!pins.hyperframes.versions[version]) throw new Error(`HyperFrames ${version} is not in config/pins.json`);
  const dir = hfDir(version, root);
  mkdirSync(dir, { recursive: true });
  const deps = Object.fromEntries(pins.hyperframes.packages.map((n) => [n, version]));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: `mw-hf-${version}`, private: true, type: "module", dependencies: deps }, null, 2));
  log(`installing HyperFrames ${version} into ${dir}`);
  const r = spawnSync(process.execPath, [npmCli(), "install", "--no-audit", "--no-fund", "--ignore-scripts", "--save-exact"], {
    cwd: dir, env: runtimeEnv(root), encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`npm install failed for ${version}: ${(r.stderr || r.stdout || "").slice(-800)}`);
  const got = packageVersions(version, root);
  const wrong = Object.entries(got).filter(([, v]) => v !== version);
  if (wrong.length) throw new Error(`version mismatch after install: ${JSON.stringify(got)}`);
  return got;
}

/** Copy the pinned Chromium build into runtime/chromium/<ver> (from the configured source path) and verify its version. */
export function ensureChromium(chromiumVersion, root = APP_ROOT) {
  const pins = loadPins(root);
  const src = pins.chromium[chromiumVersion];
  if (!src) throw new Error(`Chromium ${chromiumVersion} is not in config/pins.json`);
  const dst = join(paths(root).chromium, chromiumVersion);
  const exe = join(dst, "chrome-headless-shell.exe");
  if (!existsSync(exe)) {
    const from = dirname(expandEnv(src.path));
    if (!existsSync(join(from, "chrome-headless-shell.exe"))) throw new Error(`pinned Chromium not found at ${from}`);
    cpSync(from, dst, { recursive: true });
  }
  const v = execFileSync(exe, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
  if (!v.includes(chromiumVersion)) throw new Error(`Chromium version mismatch: ${v}`);
  return exe;
}

export function checkFfmpeg(root = APP_ROOT) {
  const pins = loadPins(root);
  const dir = expandEnv(pins.ffmpeg.dir);
  const out = {};
  for (const tool of ["ffmpeg", "ffprobe"]) {
    const first = execFileSync(join(dir, `${tool}.exe`), ["-version"], { encoding: "utf8", windowsHide: true }).split(/\r?\n/)[0];
    if (!first.includes(`version ${pins.ffmpeg.version}`)) throw new Error(`${tool} version mismatch: ${first}`);
    out[tool] = first;
  }
  return out;
}

/** Everything a render needs for one HF version: folder, Chromium exe, env. */
export function resolveRuntime(version = null, root = APP_ROOT) {
  const pins = loadPins(root);
  const v = version ?? readState(root).current ?? pins.hyperframes.default;
  if (!installed(root).includes(v)) throw new Error(`HyperFrames ${v} is not installed (run: npm run hf -- install ${v})`);
  const chromium = ensureChromium(pins.hyperframes.versions[v].chromium, root);
  return { version: v, dir: hfDir(v, root), chromium, env: { ...runtimeEnv(root), PRODUCER_HEADLESS_SHELL_PATH: chromium } };
}

/** Make `version` current. The old current becomes previous. `smokeOk` must be true (the caller ran the smoke test). */
export function switchTo(version, { smokeOk }, root = APP_ROOT) {
  if (!installed(root).includes(version)) throw new Error(`HyperFrames ${version} is not installed`);
  if (smokeOk !== true) throw new Error(`refusing to switch to ${version}: smoke test has not passed`);
  const s = readState(root);
  if (s.current === version) return s;
  const next = { current: version, previous: s.current, history: [...s.history, { at: new Date().toISOString(), from: s.current, to: version }] };
  writeState(next, root);
  return next;
}

export function rollback(root = APP_ROOT) {
  const s = readState(root);
  if (!s.previous) throw new Error("no previous version to roll back to");
  if (!installed(root).includes(s.previous)) throw new Error(`previous version ${s.previous} is no longer installed`);
  const next = { current: s.previous, previous: s.current, history: [...s.history, { at: new Date().toISOString(), from: s.current, to: s.previous, rollback: true }] };
  writeState(next, root);
  return next;
}

export function remove(version, root = APP_ROOT) {
  const s = readState(root);
  if (version === s.current || version === s.previous) throw new Error(`${version} is current or previous; switch first`);
  rmSync(hfDir(version, root), { recursive: true, force: true });
}

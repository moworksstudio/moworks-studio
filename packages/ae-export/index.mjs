// AE export ("Port to AE" button): an editable After Effects project (.aep + footage + audio stems) from a HyperFrames project.
// The port is the Moworks Motion kit's: copied into ./port and adapted to HyperFrames-native
// projects (./PROVENANCE.md). The film is recorded on HF's own page (packages/hf-page: HF's bundle + render file server, HF seeks); the
// check frames are compared with HF's own stills (hyperframes snapshot). The kit and HF are not modified.
//
//   aeExport(projectDir, { fps, outDir, runAe, check, estimateOnly, version, onEvent, signal, logFile, film })
//     -> { status: "done" | "estimate" | "failed" | "cancelled", code?, message?, aep?, outDir, checks: [{ t, diff }], notes: [], estimate?, canvas? }
//   gpu: a size check only, its page drawn on the GPU (the styles' AE badges: packages/style-ae)
//   film: the rendered film (MP4), what a film drawn on a canvas only (or made as it plays) goes into AE as one video layer; without it NEEDS_FILM
//   events: { type: "stage", stage: "page" | "reference" | "record" | "pictures" | "keys" | "ae" | "check" | "copy", done?, total? }
//           { type: "log", line }
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { servePage } from "../hf-page/index.mjs";
import { snapshotAt } from "../hf-qa/cli.mjs";
import { normalizeFps } from "../hf-render-worker/client.mjs";
import { fontsDir } from "../offline-assets/index.mjs";
import { APP_ROOT, expandEnv, loadPins, runtimeEnv } from "../version-manager/index.mjs";
import { pyLibs } from "../setup/python.mjs";

const PORT_PY = join(import.meta.dirname, "port", "port.py");

/** Seconds of the film: the root composition's data-duration in index.html. */
export function filmDuration(projectDir) {
  const html = readFileSync(join(projectDir, "index.html"), "utf8");
  const root = /<[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(html)?.[0] ?? "";
  const d = parseFloat(/\bdata-duration="([\d.]+)"/.exec(root)?.[1] ?? "");
  if (!(d > 0)) throw new Error("index.html: the root composition has no data-duration");
  return d;
}

/** The check times the port renders in AE: 25 %, 50 %, 85 % of the film (the kit's "auto"), or the given list; each on a frame of the
 *  film's rate, so AE (which draws the frame that holds t) and HF's still show the same instant (a count-up at 8.5 s, 25 fps: AE drew
 *  frame 212 = 8.48 s, HF 8.50 s, and the numbers differed). */
export function checkTimes(duration, check = "auto", fps = { num: 30, den: 1 }) {
  if (!check) return [];
  const f = fps.num / fps.den, onFrame = (t) => Math.round(Math.round(t * f) / f * 10000) / 10000;
  const ts = check === "auto" ? [0.25, 0.5, 0.85].map((k) => duration * k) : (Array.isArray(check) ? check : String(check).split(",")).map(Number);
  return ts.filter((t) => t >= 0 && t <= duration).map(onFrame);
}

/** The rate the recorder samples at and HF's page is served at: the film's rate times the whole number that comes nearest 120 a
 *  second (the kit's sampling), so every film frame is a sample and HF's own frame snap never falls between two samples
 *  (25 -> 125, 30 -> 120, 24 -> 120, 60 -> 120, 29.97 -> 119.88). */
export function recordRate(fps) {
  const m = Math.max(1, Math.round(120 / (fps.num / fps.den)));
  return { num: fps.num * m, den: fps.den };
}

/** How many <canvas> the film's HTML holds (index.html and compositions/), read without opening the film, so the export can have the
 *  rendered film ready for a canvas film and the dialog can say what After Effects gets before Check size has run. */
export function canvasCount(projectDir) {
  const files = [join(projectDir, "index.html")];
  const walk = (d) => { let es; try { es = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) if (e.isDirectory()) walk(join(d, e.name)); else if (/\.html?$/i.test(e.name)) files.push(join(d, e.name)); };
  walk(join(projectDir, "compositions"));
  let n = 0;
  for (const f of files) { try { n += (readFileSync(f, "utf8").match(/<canvas\b/gi) ?? []).length; } catch { /* no such file */ } }
  return n;
}

/** A log line as the user reads it (no addresses in the UI): the film's local page is "the film's page", a file or folder path
 *  only its last name (<work>/projects/x/renders/ae/261027_x_1401 -> 261027_x_1401). */
export function plainLog(line) {
  return String(line ?? "")
    .replace(/\bhttps?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?[^\s;,)"']*/gi, "the film's page")
    .replace(/(?<![A-Za-z])[A-Za-z]:[\\/](?:[^\s;,()"'<>|]|\s(?=[^\s;,()"'<>|]*[\\/]))*/g, (m) => m.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "");
}

/** True when After Effects (or AE Beta) is running: the port drives the open AE through its own Run Script menu. */
// tasklist filtered to AfterFX* answers in about 0.2 s (the whole list took 0.9 s, on the server's thread)
const AE_TASKS = ["/FI", "IMAGENAME eq AfterFX*", "/FO", "CSV", "/NH"], isAe = (out) => /"AfterFX[^"]*\.exe"/i.test(out ?? "");
export function aeRunning() {
  return isAe(spawnSync("tasklist", AE_TASKS, { encoding: "utf8", windowsHide: true }).stdout);
}
/** aeRunning without holding the server's thread. */
export function aeRunningAsync() {
  return new Promise((ok) => {
    const c = spawn("tasklist", AE_TASKS, { windowsHide: true });
    let out = "";
    c.stdout.on("data", (d) => { out += d; });
    c.on("error", () => ok(false));
    c.on("close", () => ok(isAe(out)));
  });
}

export function pythonExe(root = APP_ROOT) {
  const exe = expandEnv(loadPins(root).python.exe);
  if (!existsSync(exe)) throw new Error(`Python for the AE export not found: ${exe} (config/pins.json python.exe)`);
  return exe;
}

/** The pinned Python has the port's modules (config/pins.json python.modules). { ok, message } */
export function checkPython(root = APP_ROOT) {
  let exe;
  try { exe = pythonExe(root); } catch (e) { return { ok: false, message: e.message }; }
  const mods = loadPins(root).python.modules;
  const r = spawnSync(exe, ["-I", "-c", `import ${mods.join(", ")}`], { encoding: "utf8", windowsHide: true });
  return r.status === 0 ? { ok: true, message: exe } : { ok: false, message: (r.stderr ?? "").trim().split(/\r?\n/).pop() };
}

const STAGES = [
  [/^\s*port size:/, "record"], [/^\s*sampled (\d+)\/(\d+)/, "record"], [/^\s*pictures(?: to make| (\d+)\/(\d+))/, "pictures"],
  [/^\s*keyframes:/, "keys"], [/^\s*AE build:/, "ae"], [/^\s*check [\d.]+ s:/, "check"], [/^\s*copied to /, "copy"],
];

export async function aeExport(projectDir, { fps = 30, outDir = null, runAe = true, check = "auto", estimateOnly = false, version = null,
  onEvent = () => {}, signal = null, logFile = null, root = APP_ROOT, film = null, gpu = false } = {}) {
  const dir = resolve(projectDir);
  const rate = normalizeFps(fps);
  const out = resolve(outDir ?? join(dirname(dir), `${basename(dir)}-AE`));
  const work = join(root, "runtime", "work", "ae");
  const log = logFile ? (mkdirSync(dirname(logFile), { recursive: true }), createWriteStream(logFile, { flags: "a" })) : null;
  const emit = (e) => { if (e.type === "log") log?.write(e.line + "\n"); onEvent(e); };
  const result = { status: "failed", outDir: out, checks: [], notes: [] };
  if (signal?.aborted) return { ...result, status: "cancelled", code: "CANCELLED" };
  if (runAe && !estimateOnly && !aeRunning()) return { ...result, code: "AE_NOT_RUNNING", message: "Open After Effects (no dialog showing), then export again" };

  const pins = loadPins(root);
  const rec = recordRate(rate);
  let page = null;
  try {
    emit({ type: "stage", stage: "page" });
    page = await servePage(dir, { version, fps: rec });
    const D = filmDuration(dir);
    const times = estimateOnly || !runAe ? [] : checkTimes(D, check, rate);
    const refDir = join(work, "_ref", basename(dir));
    if (times.length) {
      emit({ type: "stage", stage: "reference" });
      rmSync(refDir, { recursive: true, force: true });
      const s = snapshotAt(dir, times, refDir, { version });
      if (s.exitCode !== 0) emit({ type: "log", line: `reference stills failed (exit ${s.exitCode}): ${s.stderrTail.join(" | ")}` });
    }
    const args = [PORT_PY, dir, "--url", page.url, "--fps", `${rate.num}/${rate.den}`, "--rate", `${rec.num}/${rec.den}`, "--out", out];
    if (estimateOnly) args.push("--estimate");
    if (film && !estimateOnly) args.push("--film", film);
    if (runAe && !estimateOnly) args.push("--run");
    if (times.length) args.push("--check", times.join(","), "--ref-dir", refDir);
    const env = { ...runtimeEnv(root), PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", MW_CHROMIUM: page.chromium, MW_AE_WORK: work,
      MW_FFMPEG_DIR: expandEnv(pins.ffmpeg.dir), MW_FONTS_DIR: fontsDir(root), MW_PYLIBS: pyLibs(root), ...(gpu && estimateOnly ? { MW_AE_GPU: "1" } : {}) };
    emit({ type: "log", line: `HF ${page.version} page ${page.url}; ${rate.num}/${rate.den} fps; out ${out}` });

    const code = await new Promise((res) => {
      const child = spawn(pythonExe(root), ["-I", ...args], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      const onAbort = () => spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
      signal?.addEventListener("abort", onAbort, { once: true });
      let buf = "";
      const onData = (d) => {
        buf += d.toString("utf8");
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).replace(/\r$/, ""); buf = buf.slice(i + 1);
          emit({ type: "log", line });
          for (const [re, stage] of STAGES) { const m = re.exec(line); if (m) { emit({ type: "stage", stage, ...(m[2] ? { done: +m[1], total: +m[2] } : {}) }); break; } }
          const est = /^ESTIMATE (\{.*\})$/.exec(line); if (est) result.estimate = JSON.parse(est[1]);
          const ck = /^\s*check ([\d.]+) s: ([\d.]+)% of pixels/.exec(line); if (ck) result.checks.push({ t: +ck[1], diff: +ck[2] / 100 });
          const nt = /^\s*note: (.*)$/.exec(line); if (nt) result.notes.push(nt[1]);
          if (/^\s*AE: .*ERROR|^\s+ERROR /.test(line)) result.message = line.trim();
        }
      };
      child.stdout.on("data", onData); child.stderr.on("data", onData);
      child.on("close", (c) => { signal?.removeEventListener("abort", onAbort); if (buf) onData("\n"); res(c); });
    });
    if (signal?.aborted) return { ...result, status: "cancelled", code: "CANCELLED" };
    if (estimateOnly) return code === 0 ? { ...result, status: "estimate" } : { ...result, code: "PORT_FAILED" };
    if (code === 4) return { ...result, code: "NEEDS_FILM", canvas: true, message: "After Effects gets this film as its rendered video. Render the film, then export again." };
    const aep = join(out, `${basename(dir).replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "film"}.aep`);
    if (code !== 0 || (runAe && !existsSync(aep))) return { ...result, code: code === 3 ? "AE_SCRIPT_ERROR" : "PORT_FAILED", message: result.message ?? `port exit ${code}` };
    return { ...result, status: "done", aep: runAe ? aep : null, ...(result.notes.some((n) => /one video layer \(the rendered film\)/.test(n)) ? { canvas: true } : {}) };
  } catch (e) {
    return { ...result, code: "PORT_FAILED", message: String(e?.message ?? e) };
  } finally {
    page?.close();
    log?.end();
  }
}

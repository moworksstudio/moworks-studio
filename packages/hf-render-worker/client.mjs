// Parent-side API of the Render Worker: one child process per render job.
//   const result = await render(job, { onEvent, signal, version, logFile, background })
// job = { projectDir, outputPath, fps: { num, den }, format?, quality?, workers?, strictness?, playerReadyTimeoutMs?, browserGpuMode? }
// browserGpuMode: "auto" (HF's probe: the GPU when there is a usable one), "hardware" or "software" (SwiftShader); without it, Settings'
// choice: "auto", or "software" when the user picked Always CPU. An export decides it first with gpu.mjs (a test frame).
// result = the worker's final event: { type: "done" | "failed" | "cancelled", code?, ... } plus { exitCode, wallMs, logFile }
import { fork, execFile } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { constants, setPriority, tmpdir } from "node:os";
import { resolveRuntime, renderSettings, APP_ROOT } from "../version-manager/index.mjs";

/** A background process at below-normal priority, so the computer stays usable. On Windows the Chrome and FFmpeg
 *  it starts later inherit the class. */
export function lowPriority(pid) { try { setPriority(pid, constants.priority.PRIORITY_BELOW_NORMAL); return true; } catch { return false; } }

const WORKER = join(import.meta.dirname, "worker.mjs");
/** Cancel must settle under 5 s. HF's own teardown of a cancelled render takes about 1 s on a quiet machine (4 workers, the
 *  frames streamed into ffmpeg); with every core busy (the full test suite's parallel files) it took 10 s to report and up to 40 s to
 *  exit, closing 4 Chromes and their encoders. So it gets 2 s, then the worker's process tree is killed (taskkill: about 0.2 s quiet,
 *  0.7-3 s with every core busy) and what HF would have removed is removed here (sweepAfterKill). */
const KILL_GRACE_MS = Number(process.env.MW_KILL_GRACE_MS ?? 2000);          // MW_KILL_GRACE_MS: measurements only

/** taskkill /T /F of a process tree, without blocking the server's event loop, at high priority (with every core busy a normal-priority
 *  taskkill took 3-4 s for a worker's 4 Chromes; 0.7 s at high). Resolves with the PIDs it terminated. */
const killTree = (pid) => new Promise((ok) => {
  const t = execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, (e, out) => ok([...String(out ?? "").matchAll(/process with PID (\d+)/g)].map((m) => Number(m[1]))));          // "PID 1 (child process of PID 2)": the first
  try { setPriority(t.pid, constants.priority.PRIORITY_HIGH); } catch { /* it still runs, at normal priority */ }
});
/** HF's work and transaction folders of a killed worker (HF's own names, owner.json naming that worker's pid), in the temp folder and next
 *  to the output: a killed worker never removes them itself (HF would sweep them at the next render's start). */
const HF_TEMP = /^(work-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}|hf-render|\..+\.hf-transaction)-[A-Za-z0-9]{6}$/;
export function sweepAfterKill(pid, dirs) {
  const removed = [];
  for (const parent of new Set(dirs)) {
    let names = [];
    try { names = readdirSync(parent); } catch { continue; }
    for (const n of names.filter((x) => HF_TEMP.test(x))) {
      const dir = join(parent, n);
      try { if (JSON.parse(readFileSync(join(dir, "owner.json"), "utf8")).pid !== pid) continue; } catch { continue; }
      try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); removed.push(dir); } catch { /* the next render's sweep */ }
    }
  }
  return removed;
}

export function normalizeFps(fps) {
  if (typeof fps === "number") {
    if (Number.isInteger(fps)) return { num: fps, den: 1 };
    if (Math.abs(fps - 29.97) < 0.01) return { num: 30000, den: 1001 };
    if (Math.abs(fps - 23.976) < 0.01) return { num: 24000, den: 1001 };
    if (Math.abs(fps - 59.94) < 0.01) return { num: 60000, den: 1001 };
    throw new Error(`fps ${fps} is not an integer or a known NTSC rate; pass { num, den }`);
  }
  if (!Number.isInteger(fps?.num) || !Number.isInteger(fps?.den) || fps.num <= 0 || fps.den <= 0) throw new Error("fps must be { num, den } positive integers");
  return { num: fps.num, den: fps.den };
}

export function render(job, { onEvent = () => {}, signal, version = null, logFile = null, root = APP_ROOT, envOverride = null, onChild = null, background = false } = {}) {
  const rt = resolveRuntime(version, root);
  // the frames stream into the encoder while they are captured instead of going to disk first (HF's opt-in for multi-worker screenshot
  // capture: 80 -> 67 s on a 30 s film, the same file bit for bit); an explicit setting in the environment wins
  rt.env = { HF_CAPTURE_PARALLEL_STREAM: "true", ...rt.env };
  if (envOverride) rt.env = { ...rt.env, ...envOverride };   // tests only (e.g. a missing FFmpeg)
  const browserGpuMode = job.browserGpuMode ?? (renderSettings(root).gpu === "cpu" ? "software" : "auto");
  const full = { ...job, browserGpuMode, projectDir: resolve(job.projectDir), outputPath: resolve(job.outputPath), fps: normalizeFps(job.fps), hfVersion: rt.version };
  const log = logFile ?? join(root, "runtime", "logs", `render-${Date.now()}.log`);
  mkdirSync(dirname(log), { recursive: true });
  const logStream = createWriteStream(log);
  logStream.on("error", () => { /* the log is best effort: a write error must never reach the server's uncaught handler */ });
  let logOpen = true;                             // false once the stream is ended: a late child message or timer must not write to it
  const logLine = (text) => { if (logOpen && !logStream.destroyed && !logStream.writableEnded) { try { logStream.write(text); } catch { /* closed */ } } };
  const t0 = Date.now();
  return new Promise((resolvePromise) => {
    // execArgv: [] so the worker never inherits the parent's Node flags (e.g. --input-type), which made it exit at start
    const child = fork(WORKER, [], { env: rt.env, execArgv: [], stdio: ["ignore", "pipe", "pipe", "ipc"], windowsHide: true });
    if (background) lowPriority(child.pid);      // a render nobody waits for (the pre-render, the smooth preview): below-normal priority
    onChild?.(child);                            // tests only (crash simulation)
    child.stdout.pipe(logStream, { end: false });
    child.stderr.pipe(logStream, { end: false });
    let final = null;
    let killTimer = null, killed = null, killedPids = null;          // killed: the taskkill of the worker's tree, once the grace expired
    let finish = null;                            // set once the worker has exited; called again by a late final event or the disconnect
    child.on("message", (m) => {                   // IPC is read late: a message can arrive after the worker's 'exit'. Never throw from here
      logLine(`[event] ${JSON.stringify(m)}\n`);
      if (!logOpen) return;
      if (["done", "failed", "cancelled"].includes(m?.type)) final = m;
      try { onEvent(m); } catch { /* a listener's error must not take the server down */ }
      if (final && finish) finish();
    });
    child.on("disconnect", () => finish?.());
    const cancel = () => {
      if (child.exitCode !== null) return;
      try { child.send({ type: "cancel" }); } catch { /* channel closed */ }
      killTimer = setTimeout(() => { logLine("[client] cancel grace expired, killing process tree\n"); killed = killTree(child.pid); }, KILL_GRACE_MS);
    };
    if (signal) { if (signal.aborted) cancel(); else signal.addEventListener("abort", cancel, { once: true }); }
    child.on("exit", async (exitCode) => {
      clearTimeout(killTimer);
      signal?.removeEventListener?.("abort", cancel);
      if (killed) {          // the tree is gone once taskkill returns; then HF's folders of that worker
        killedPids = await killed;
        const swept = sweepAfterKill(child.pid, [tmpdir(), dirname(full.outputPath)]);
        if (swept.length) logLine(`[client] removed ${swept.length} folder(s) the killed worker left\n`);
      } else killTree(child.pid);          // a crashed worker must not leave Chrome / ffmpeg behind (not awaited: it never delays the result)
      // the final event can be read after 'exit'. Wait for it (or the channel's disconnect, at most 3 s); a worker that exited 0
      // finished its run (any error sets exit code 2), so with the output written it is done even if the event never came
      let ended = false;
      finish = () => {
        if (ended) return; ended = true; clearTimeout(grace);
        const out = full.outputPath, outputOk = exitCode === 0 && !signal?.aborted && existsSync(out) && (statSync(out).isDirectory() || statSync(out).size > 0);
        const fallback = outputOk ? { type: "done", outputPath: out, late: true }
          : { type: signal?.aborted ? "cancelled" : "failed", code: signal?.aborted ? "CANCELLED" : "WORKER_EXITED", message: `worker exited with ${exitCode} before reporting` };
        // killed: the processes ended by taskkill (a GPU process that taskkill ended can stay in the process list until the graphics driver
        // has released it: under 1 s quiet, up to about a minute with every core busy, measured)
        const result = { ...(final ?? fallback), exitCode, wallMs: Date.now() - t0, logFile: log, hfVersion: rt.version, browserGpuMode, ...(killedPids ? { killed: { pids: killedPids } } : {}) };
        logOpen = false;
        child.stdout.unpipe(logStream); child.stderr.unpipe(logStream);      // late output must not be piped into the ended stream either
        logStream.end(() => resolvePromise(result));
      };
      const grace = setTimeout(() => finish(), final || !child.connected ? 0 : 3000);
    });
    child.send({ type: "start", runtimeDir: rt.dir, job: full });
  });
}

/** Smoke test of one installed HF version: render a 1-second fixture and check the result. */
export async function smoke(version, fixtureDir, outDir, root = APP_ROOT) {
  const out = join(outDir, `smoke-${version}.mp4`);
  const r = await render({ projectDir: fixtureDir, outputPath: out, fps: { num: 30, den: 1 }, workers: 1 }, { version, root });
  return { ok: r.type === "done" && r.outcome === "completed", result: r };
}

const REMIX = join(import.meta.dirname, "remix.mjs");
/** The film's sound mixed again onto a picture already rendered (remix.mjs): { type: "done" | "failed" | "cancelled", ... }.
 *  job = { projectDir, picture, outputPath, fps (integer), duration, workDir }; ffmpeg is the runtime's (pins). */
export function remixAudio(job, { signal = null, root = APP_ROOT, version = null, ffmpeg, background = false } = {}) {
  const rt = resolveRuntime(version, root);
  return new Promise((done) => {
    const child = fork(REMIX, [], { env: rt.env, execArgv: [], stdio: ["ignore", "ignore", "pipe", "ipc"], windowsHide: true });
    if (background) lowPriority(child.pid);
    let final = null, err = "";
    child.stderr.on("data", (d) => { err = (err + d).slice(-2000); });
    child.on("message", (m) => { if (["done", "failed", "cancelled"].includes(m?.type)) final = m; });
    const cancel = () => { try { child.send({ type: "cancel" }); } catch { /* gone */ } setTimeout(() => killTree(child.pid), KILL_GRACE_MS); };
    signal?.addEventListener("abort", cancel, { once: true });
    child.on("exit", (code) => {
      signal?.removeEventListener?.("abort", cancel);
      done(final ?? { type: signal?.aborted ? "cancelled" : "failed", message: `remix exited with ${code} ${err.split(/\r?\n/).slice(-3).join(" ")}` });
    });
    child.send({ type: "start", runtimeDir: rt.dir, ffmpeg, projectDir: resolve(job.projectDir), picture: resolve(job.picture), out: resolve(job.outputPath),
      fps: job.fps, duration: job.duration, workDir: resolve(job.workDir) });
  });
}

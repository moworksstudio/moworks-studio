// Runs the pinned HyperFrames CLI's QA commands (check / inspect / validate) with --json and returns the parsed result.
// The CLI is called as `node <cli entry>` with the opt-out environment (no shell, no telemetry, no update check).
// The sync forms (runHfJson, snapshot, snapshotAt) are for the CLI tools and the gates' own child process: the app's server uses the
// *Async ones, since a sync call holds its event loop (T27-3: every request took 20-60 s while a film's character sheets were drawn).
import { execFile, spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { constants, setPriority } from "node:os";
import { resolveRuntime } from "../version-manager/index.mjs";

// the checks and stills run while the user works: their CLI (and the Chrome it starts, which inherits the class on Windows) runs at
// below-normal priority, so the computer stays usable
const low = (c) => { try { setPriority(c.pid, constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* gone already */ } return c; };

export function cliEntry(dir) {
  const pj = JSON.parse(readFileSync(join(dir, "node_modules", "hyperframes", "package.json"), "utf8"));
  const bin = typeof pj.bin === "string" ? pj.bin : pj.bin.hyperframes;
  const entry = join(dir, "node_modules", "hyperframes", bin);
  if (!existsSync(entry)) throw new Error(`hyperframes CLI entry not found: ${entry}`);
  return entry;
}

/** `hyperframes <args>` without holding the caller's event loop, answered as spawnSync answers: { status, stdout, stderr, hfVersion }
 *  (status null when it was stopped at `timeoutMs`; the CLI alone is stopped then, as spawnSync's timeout did). */
export function runHf(args, { version = null, timeoutMs = 300000, maxBuffer = 1024 * 1024 } = {}) {
  const rt = resolveRuntime(version);
  return new Promise((ok) => execFile(process.execPath, [cliEntry(rt.dir), ...args], { env: { ...rt.env, NO_COLOR: "1" }, encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer },
    (e, stdout, stderr) => ok({ status: e ? (Number.isInteger(e.code) ? e.code : null) : 0, stdout: stdout ?? "", stderr: stderr ?? "", hfVersion: rt.version })));
}

export function runHfJson(command, projectDir, extraArgs = [], { version = null, timeoutMs = 300000 } = {}) {
  const rt = resolveRuntime(version);
  const r = spawnSync(process.execPath, [cliEntry(rt.dir), command, resolve(projectDir), "--json", ...extraArgs], {
    env: { ...rt.env, NO_COLOR: "1" }, encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const text = r.stdout ?? "";
  const start = text.indexOf("{");
  let json = null;
  try { json = start >= 0 ? JSON.parse(text.slice(start)) : null; } catch { /* not JSON */ }
  return { command, exitCode: r.status, json, stderrTail: (r.stderr ?? "").split(/\r?\n/).slice(-5), hfVersion: rt.version };
}

/** `hyperframes snapshot` of one mounted composition; never with the Gemini describe pass (client material stays local). */
export function snapshot(projectDir, compositionId, outDir, { frames = 3, version = null } = {}) {
  const rt = resolveRuntime(version);
  const r = spawnSync(process.execPath, [cliEntry(rt.dir), "snapshot", resolve(projectDir), "--composition", compositionId, "--frames", String(frames),
    "--no-end", "--describe", "false", "--output", resolve(outDir)], { env: { ...rt.env, NO_COLOR: "1" }, encoding: "utf8", timeout: 180000, windowsHide: true });
  return { exitCode: r.status, stderrTail: (r.stderr ?? "").split(/\r?\n/).slice(-5) };
}

/** `hyperframes snapshot --at t1,t2,...` of the whole film: HF's own stills (outDir/frame-NN-at-<t>s.png), no Gemini describe pass. */
/** How long HF waits for a page to be render-ready before its stills (its own default is 5 s): a code film's first frame can take longer
 *  (a p5.brush page: about 5-10 s), and stills taken before it show one early frame for every time asked. HF only waits until the
 *  page is ready, so a fast page is not slowed. */
export const READY_TIMEOUT_MS = 30000;
export function snapshotAt(projectDir, times, outDir, { version = null, timeout = READY_TIMEOUT_MS } = {}) {
  const rt = resolveRuntime(version);
  const r = spawnSync(process.execPath, [cliEntry(rt.dir), "snapshot", resolve(projectDir), "--at", times.join(","), "--no-end", "--describe", "false",
    "--output", resolve(outDir), ...(timeout ? ["--timeout", String(timeout)] : [])], { env: { ...rt.env, NO_COLOR: "1" }, encoding: "utf8", timeout: 300000, windowsHide: true });
  return { exitCode: r.status, stderrTail: (r.stderr ?? "").split(/\r?\n/).slice(-5) };
}

export const check = (dir, opts) => runHfJson("check", dir, [], opts);
export const inspect = (dir, opts) => runHfJson("inspect", dir, [], opts);
export const validate = (dir, opts) => runHfJson("validate", dir, [], opts);

/** HyperFrames' own project history is held by another of its processes (studio-server history/ownerLock.ts, HistoryBusyError: "This
 *  project's history is open in another process (pid N)"). HF waits 5 s for it and goes on without recording; the app's QC round takes a
 *  part that gave nothing while it was held once more, after a short pause. */
export const historyBusy = (text) => /history is open in another process/i.test(String(text ?? ""));
/** How long a QC still run may go without a new still before it ends; a still normally comes every 2-3 s on a loaded machine. */
export const STILL_IDLE_MS = 120000;
/** Before the first still the film is loading, which is no sign of a hung run: a film whose script builds a map took about 100 s at 100 % CPU, then its stills came
 *  in seconds (Test 33, T33-9: stopped at 120 s with none, twice, "the computer is busy"). */
export const STILL_LOAD_MS = 300000;
/** How long a run may go with no new still, by how many it has made. */
export const stillWaitMs = (made, idleMs) => (made > 0 ? idleMs : Math.max(idleMs, STILL_LOAD_MS));
/** `run()` once more when it gave nothing (`empty(result)`) while HF's history was held, after `pauseMs`; only when it ended within
 *  `quickMs` (the lock or a run ended for no new still, never a long one), so a retry never doubles a long wait. At most once. */
export async function againIfBusy(run, empty, { pauseMs = 3000, quickMs = STILL_IDLE_MS + 30000, now = Date.now } = {}) {
  const t0 = now();
  const r = await run();
  if (!empty(r) || !historyBusy(r?.stderr ?? (r?.stderrTail ?? []).join("\n")) || now() - t0 > quickMs) return r;
  await new Promise((ok) => setTimeout(ok, pauseMs));
  return { ...(await run()), retried: true };
}

/** snapshotAt without blocking the caller's event loop (the app's server stays responsive while HF takes its stills). `env` adds to the
 *  runtime's (e.g. PRODUCER_BROWSER_GPU_MODE for the GPU test frame); the result's `stderr` is the last 20000 characters. `idleMs`: the
 *  run ends when no new still came into outDir for that long (stuck runs held a QC round 15 min, each to the 5 min limit); the
 *  stills taken so far stay, and the result says `idle`. `belowNormal: false`: at normal priority, as snapshotAt ran (stills someone waits
 *  for, such as a character's model sheets). */
export function snapshotAtAsync(projectDir, times, outDir, { version = null, signal = null, env = null, timeout = READY_TIMEOUT_MS, idleMs = null, belowNormal = true, timeoutMs = 300000 } = {}) {
  const rt = resolveRuntime(version);
  return new Promise((ok) => {
    const c = spawn(process.execPath, [cliEntry(rt.dir), "snapshot", resolve(projectDir), "--at", times.join(","), "--no-end", "--describe", "false",
      "--output", resolve(outDir), ...(timeout ? ["--timeout", String(timeout)] : [])], { env: { ...rt.env, ...env, NO_COLOR: "1" }, windowsHide: true });
    if (belowNormal) low(c);
    let err = "";
    c.stderr.on("data", (d) => { err = (err + d).slice(-20000); });
    c.stdout.resume();
    // the whole tree (the CLI and its headless Chrome) ends on a timeout or when the app stops (nothing is left running)
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    // the result says `timedOut` when the run was stopped at its limit (a killed tree exits 1 on Windows, not null)
    let timedOut = false;
    const t = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    let seen = -1, since = Date.now(), idle = false;
    const watch = idleMs ? setInterval(() => {
      let n = 0;
      try { n = readdirSync(outDir).filter((f) => /^frame-.*\.png$/i.test(f)).length; } catch { /* not made yet */ }
      if (n !== seen) { seen = n; since = Date.now(); } else if (Date.now() - since >= stillWaitMs(n, idleMs)) { idle = true; clearInterval(watch); kill(); }
    }, Math.min(5000, idleMs)) : null;
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => {
      clearTimeout(t); if (watch) clearInterval(watch); signal?.removeEventListener("abort", kill);
      ok({ exitCode: code, stderrTail: err.split(/\r?\n/).slice(-5), stderr: err, ...(idle ? { idle: true } : {}), ...(timedOut ? { timedOut: true } : {}) });
    });
  });
}

// ---- stills on a busy computer (T25: the Storyboard's board_stills hung about 11.5 min, twice, and came back empty; T26-5: the Review's
// first qc_sheets ran 11.5 min and gave no picture, and the round went on as if it had)
/** How long one still run may take before it is stopped: STILL_LOAD_MS for HF to start its browser and load the film, and 10 s for each
 *  still asked, at most 15 min (it was 5 min for any number of stills). */
export const stillsTimeoutMs = (count) => Math.min(15 * 60000, STILL_LOAD_MS + Math.max(1, Number(count) || 1) * 10000);
/** What the user and Claude read when the stills were stopped twice: the film is not at fault, the computer was too busy. */
export const STILLS_BUSY = "The pictures could not be taken (the computer is busy). Try again.";
/** A still run that was stopped before it finished: its time limit ran out (`timedOut`), no new still came for a while (`idle`), or
 *  HF's own wait for its browser or the page ran out. */
export const stillsStopped = (r) => !!r && (r.timedOut === true || r.idle === true
  || (r.exitCode !== 0 && /\btimed?[\s-]?out\b|TimeoutError/i.test(r.stderr ?? (r.stderrTail ?? []).join("\n"))));
const STILL_NAME = /^frame-(\d+)-at-([\d.]+)s\.png$/i;
/** The stills HF wrote into `dir` (frame-NN-at-<t>s.png): [{ file, t }]. */
const stillsIn = (dir) => { try { return readdirSync(dir).map((f) => STILL_NAME.exec(f)).filter(Boolean).map((m) => ({ file: m[0], t: Number(m[2]) })); } catch { return []; } };
const sameTime = (a, b) => Math.abs(a - b) < 0.006;
/** snap(projectDir, times, outDir, opts) with a time limit sized to the stills asked (stillsTimeoutMs). A run that was stopped
 *  (stillsStopped) takes the stills it did not take once more, by itself (onRetry() first), into outDir/.again (HF clears its output
 *  folder), each then named as the first run would have named it (its place in `times`). Stopped again with stills missing: the result says
 *  `busy`. Every still there: exit 0, whatever stopped the run. The app stopping (`signal`) is never retried. */
export async function snapOnceMore(snap, projectDir, times, outDir, { onRetry = () => {}, ...opts } = {}) {
  const missing = () => { const have = stillsIn(outDir); return times.filter((t) => !have.some((x) => sameTime(x.t, t))); };
  const first = await snap(projectDir, times, outDir, { ...opts, timeoutMs: stillsTimeoutMs(times.length) });
  if (!stillsStopped(first) || opts.signal?.aborted) return first;
  const left = missing();
  if (!left.length) return { ...first, exitCode: 0 };
  onRetry();
  const again = join(outDir, ".again");
  rmSync(again, { recursive: true, force: true });
  const r = await snap(projectDir, left, again, { ...opts, timeoutMs: stillsTimeoutMs(left.length) });
  for (const x of stillsIn(again)) {
    const i = times.findIndex((t) => sameTime(t, x.t));
    if (i >= 0) copyFileSync(join(again, x.file), join(outDir, x.file.replace(/^frame-\d+-/i, `frame-${String(i).padStart(2, "0")}-`)));
  }
  rmSync(again, { recursive: true, force: true });
  if (!missing().length) return { ...r, exitCode: 0, retried: true };
  return { ...r, retried: true, ...(stillsStopped(r) && !opts.signal?.aborted ? { busy: true } : {}) };
}
/** snapshotAt as the server calls it where it once passed the sync one (character sheets, a character's demo, AE's reference stills):
 *  the same priority and answer, without holding its event loop. */
export const snapshotAtForeground = (projectDir, times, outDir, opts = {}) => snapshotAtAsync(projectDir, times, outDir, { ...opts, belowNormal: false });

/** runHfJson without blocking the caller's event loop (a long `check` while the server keeps answering). The result says `timedOut`
 *  when it was stopped at `timeoutMs`; `belowNormal: false` runs it at normal priority (a check someone waits for: a render's). */
export function runHfJsonAsync(command, projectDir, extraArgs = [], { version = null, timeoutMs = 600000, signal = null, belowNormal = true } = {}) {
  const rt = resolveRuntime(version);
  return new Promise((ok) => {
    const c = spawn(process.execPath, [cliEntry(rt.dir), command, resolve(projectDir), "--json", ...extraArgs], { env: { ...rt.env, NO_COLOR: "1" }, windowsHide: true });
    if (belowNormal) low(c);
    let out = "", err = "", timedOut = false;
    c.stdout.on("data", (d) => { out += d; });
    c.stderr.on("data", (d) => { err = (err + d).slice(-4000); });
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    const t = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => {
      clearTimeout(t); signal?.removeEventListener("abort", kill);
      const start = out.indexOf("{");
      let json = null;
      try { json = start >= 0 ? JSON.parse(out.slice(start)) : null; } catch { /* not JSON */ }
      ok({ command, exitCode: code, json, stderrTail: err.split(/\r?\n/).slice(-5), stderr: err, hfVersion: rt.version, ...(timedOut ? { timedOut: true } : {}) });
    });
  });
}

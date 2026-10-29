// Runs the pinned HyperFrames CLI's QA commands (check / inspect / validate) with --json and returns the parsed result.
// The CLI is called as `node <cli entry>` with the opt-out environment (no shell, no telemetry, no update check).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
 *  stills taken so far stay, and the result says `idle`. */
export function snapshotAtAsync(projectDir, times, outDir, { version = null, signal = null, env = null, timeout = READY_TIMEOUT_MS, idleMs = null } = {}) {
  const rt = resolveRuntime(version);
  return new Promise((ok) => {
    const c = low(spawn(process.execPath, [cliEntry(rt.dir), "snapshot", resolve(projectDir), "--at", times.join(","), "--no-end", "--describe", "false",
      "--output", resolve(outDir), ...(timeout ? ["--timeout", String(timeout)] : [])], { env: { ...rt.env, ...env, NO_COLOR: "1" }, windowsHide: true }));
    let err = "";
    c.stderr.on("data", (d) => { err = (err + d).slice(-20000); });
    c.stdout.resume();
    // the whole tree (the CLI and its headless Chrome) ends on a timeout or when the app stops (nothing is left running)
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    const t = setTimeout(kill, 300000);
    let seen = -1, since = Date.now(), idle = false;
    const watch = idleMs ? setInterval(() => {
      let n = 0;
      try { n = readdirSync(outDir).filter((f) => /^frame-.*\.png$/i.test(f)).length; } catch { /* not made yet */ }
      if (n !== seen) { seen = n; since = Date.now(); } else if (Date.now() - since >= idleMs) { idle = true; clearInterval(watch); kill(); }
    }, Math.min(5000, idleMs)) : null;
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => {
      clearTimeout(t); if (watch) clearInterval(watch); signal?.removeEventListener("abort", kill);
      ok({ exitCode: code, stderrTail: err.split(/\r?\n/).slice(-5), stderr: err, ...(idle ? { idle: true } : {}) });
    });
  });
}

/** runHfJson without blocking the caller's event loop (a long `check` while the server keeps answering). */
export function runHfJsonAsync(command, projectDir, extraArgs = [], { version = null, timeoutMs = 600000, signal = null } = {}) {
  const rt = resolveRuntime(version);
  return new Promise((ok) => {
    const c = low(spawn(process.execPath, [cliEntry(rt.dir), command, resolve(projectDir), "--json", ...extraArgs], { env: { ...rt.env, NO_COLOR: "1" }, windowsHide: true }));
    let out = "", err = "";
    c.stdout.on("data", (d) => { out += d; });
    c.stderr.on("data", (d) => { err = (err + d).slice(-4000); });
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    const t = setTimeout(kill, timeoutMs);
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => {
      clearTimeout(t); signal?.removeEventListener("abort", kill);
      const start = out.indexOf("{");
      let json = null;
      try { json = start >= 0 ? JSON.parse(out.slice(start)) : null; } catch { /* not JSON */ }
      ok({ command, exitCode: code, json, stderrTail: err.split(/\r?\n/).slice(-5), stderr: err, hfVersion: rt.version });
    });
  });
}

// Render Worker child process (started by client.mjs with child_process.fork).
// Events go to the parent over Node IPC (process.send); stdout / stderr carry only engine noise and are logged by the parent.
// Logic taken from the POC (the proof-of-concept render script).
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { classify, warningCode } from "./errors.mjs";

const send = (m) => process.send?.({ t: Date.now(), ...m });
const ac = new AbortController();
let started = false;

process.on("message", async (msg) => {
  if (msg?.type === "cancel") { send({ type: "cancelling" }); ac.abort(); return; }
  if (msg?.type !== "start" || started) return;
  started = true;
  try { await run(msg); } catch (e) { send({ type: "failed", ...classify(e) }); process.exitCode = 2; }
  // disconnect only once the last event has been handed to the channel (a disconnect on the next tick could drop "done", and the
  // parent then read a finished render as "worker exited with 0 before reporting")
  if (process.send) process.send({ t: Date.now(), type: "bye" }, () => process.disconnect?.()); else process.disconnect?.();
});

async function loadProducer(runtimeDir) {
  const entry = join(runtimeDir, "node_modules", "@hyperframes", "producer", "dist", "index.js");
  return import(pathToFileURL(entry).href);
}

/** Remove render dirs left by dead processes (HF's own owner-file check) before starting. */
function sweepStale(producer) {
  const removed = [];
  for (const dir of producer.listAbandonedRenderDirs?.(tmpdir()) ?? []) {
    try { rmSync(dir, { recursive: true, force: true }); removed.push(dir); } catch { /* best effort */ }
  }
  return removed;
}

async function run({ runtimeDir, job }) {
  const producer = await loadProducer(runtimeDir);
  const stale = sweepStale(producer);
  if (stale.length) send({ type: "swept", dirs: stale });
  const engineOverrides = {};
  if (job.playerReadyTimeoutMs) engineOverrides.playerReadyTimeout = job.playerReadyTimeoutMs;
  if (job.browserPool !== undefined) engineOverrides.enableBrowserPool = job.browserPool;
  if (job.browserGpuMode) engineOverrides.browserGpuMode = job.browserGpuMode;          // "auto" | "hardware" | "software" (gpu.mjs)
  const request = producer.createRenderRequest({
    projectDir: job.projectDir,
    outputPath: job.outputPath,
    engineOverrides,
    options: {
      fps: job.fps,                       // rational { num, den }
      quality: job.quality ?? "standard",
      format: job.format ?? "mp4",
      workers: job.workers ?? 4,
      strictness: job.strictness ?? "strict",
      ...(job.entryFile ? { entryFile: job.entryFile } : {}),
    },
  });
  const logger = {
    error: (m, meta) => send({ type: "log", level: "error", message: String(m), meta }),
    warn: (m, meta) => send({ type: "log", level: "warn", message: String(m), meta }),
    info: () => {}, debug: () => {},
  };
  const hfJob = producer.createRenderJob(producer.renderConfigFromRequest(request, { logger }));
  send({ type: "started", jobId: hfJob.id, hfVersion: job.hfVersion });
  let last = "";
  const onProgress = (j) => {
    const code = j.stageProgress?.code ?? j.status;
    const pct = Math.round(j.progress);
    const key = `${code}:${pct}:${j.stageProgress?.done ?? ""}`;
    if (key === last) return;
    last = key;
    send({ type: "progress", stage: code, pct, done: j.stageProgress?.done, total: j.stageProgress?.total, status: j.status });
  };
  try {
    await producer.executeRenderJob(hfJob, job.projectDir, job.outputPath, onProgress, ac.signal);
    send({
      type: "done", outcome: hfJob.outcome, outputPath: hfJob.outputPath, totalFrames: hfJob.totalFrames, duration: hfJob.duration,
      warnings: hfJob.warnings.map((w) => ({ code: warningCode(w.code), hfCode: w.code, message: String(w.message).slice(0, 300) })),
      elapsedMs: hfJob.perfSummary?.totalElapsedMs,
    });
  } catch (e) {
    const c = classify(e, hfJob.warnings ?? []);
    send({ type: c.code === "CANCELLED" ? "cancelled" : "failed", ...c, message: c.message.slice(0, 600),
      consoleTail: hfJob.errorDetails?.browserConsoleTail?.slice(-5) });
    process.exitCode = c.code === "CANCELLED" ? 3 : 2;
  }
}

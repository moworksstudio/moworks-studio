// Integration tests of the Render Worker (real HyperFrames renders; slow). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render, normalizeFps } from "../packages/hf-render-worker/client.mjs";
import { APP_ROOT, expandEnv, loadPins } from "../packages/version-manager/index.mjs";

const FX = join(APP_ROOT, "test", "fixtures");
const OUT = join(APP_ROOT, "test-output", "worker");
const FAST = { playerReadyTimeoutMs: 5000 };     // editor-loop timeout instead of the 45 s default

function chromeCount() {
  const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq chrome-headless-shell.exe", "/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
  return out.split(/\r?\n/).filter((l) => l.includes("chrome-headless-shell")).length;
}
function ffmpegCount() {
  const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq ffmpeg.exe", "/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
  return out.split(/\r?\n/).filter((l) => l.includes("ffmpeg")).length;
}
/** The PIDs of every Chrome (HF's headless shell) and ffmpeg running now. */
function enginePids() {
  const out = execFileSync("tasklist", ["/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
  return out.split(/\r?\n/).filter((l) => /^"(chrome-headless-shell|ffmpeg)\.exe"/i.test(l)).map((l) => Number(l.split('","')[1]));
}
function staleDirs() { return readdirSync(tmpdir()).filter((n) => n.startsWith("hf-render-")); }
function probe(file) {
  const ff = join(expandEnv(loadPins().ffmpeg.dir), "ffprobe.exe");
  return JSON.parse(execFileSync(ff, ["-v", "error", "-count_frames", "-show_entries", "stream=r_frame_rate,nb_read_frames:format=duration", "-of", "json", file], { encoding: "utf8", windowsHide: true }));
}

test("normalizeFps keeps rationals and maps NTSC decimals", () => {
  assert.deepEqual(normalizeFps(25), { num: 25, den: 1 });
  assert.deepEqual(normalizeFps(29.97), { num: 30000, den: 1001 });
  assert.deepEqual(normalizeFps({ num: 30000, den: 1001 }), { num: 30000, den: 1001 });
  assert.throws(() => normalizeFps(12.5), /not an integer/);
  assert.throws(() => normalizeFps({ num: 0, den: 1 }), /positive/);
});

for (const [label, fps, rate, frames] of [
  ["24", { num: 24, den: 1 }, "24/1", 96], ["25", { num: 25, den: 1 }, "25/1", 100], ["29.97", { num: 30000, den: 1001 }, "30000/1001", 120],
  ["30", { num: 30, den: 1 }, "30/1", 120], ["60", { num: 60, den: 1 }, "60/1", 240],
]) {
  test(`renders the 4 s fixture at ${label} fps with ordered stage events`, { timeout: 120000 }, async () => {
    const out = join(OUT, `fps-${label}.mp4`);
    rmSync(out, { force: true });
    const stages = [];
    const r = await render({ projectDir: join(FX, "minimal"), outputPath: out, fps, workers: 4 }, { onEvent: (e) => { if (e.type === "progress" && stages.at(-1) !== e.stage) stages.push(e.stage); } });
    assert.equal(r.type, "done", JSON.stringify(r));
    assert.equal(r.outcome, "completed");
    const p = probe(out);
    assert.equal(p.streams[0].r_frame_rate, rate);
    assert.ok(Math.abs(Number(p.streams[0].nb_read_frames) - frames) <= 1, `frames ${p.streams[0].nb_read_frames} vs ${frames}`);
    assert.ok(Math.abs(Number(p.format.duration) - 4) < 0.05);
    for (const s of ["compile", "capture", "encode", "assemble"]) assert.ok(stages.includes(s), `missing stage ${s} in ${stages}`);
    assert.ok(stages.indexOf("compile") < stages.indexOf("capture") && stages.indexOf("capture") < stages.indexOf("encode"));
  });
}

test("cancel during capture settles in under 5 s and leaves nothing behind", { timeout: 120000 }, async () => {
  const out = join(OUT, "cancel.mp4");
  rmSync(out, { force: true });
  const ac = new AbortController();
  let abortedAt = 0;
  // this render's own Chrome and ffmpeg: the ones that were not there before it (an earlier test's killed GPU process can still be in the
  // list, waiting for the graphics driver)
  const before = new Set(enginePids()), ours = () => enginePids().filter((p) => !before.has(p));
  const r = await render({ projectDir: join(FX, "long"), outputPath: out, fps: { num: 30, den: 1 }, workers: 4 }, {
    signal: ac.signal,
    onEvent: (e) => { if (!abortedAt && e.type === "progress" && e.stage === "capture" && (e.done ?? 0) > 60) { abortedAt = Date.now(); ac.abort(); } },
  });
  const settleMs = Date.now() - abortedAt;
  assert.ok(abortedAt > 0, "never reached capture");
  assert.equal(r.code, "CANCELLED", JSON.stringify(r));
  // 5 s (14, S3): HF's own teardown (about 1 s quiet), or after KILL_GRACE_MS (2 s) the tree killed (taskkill 0.2-3 s with every core busy)
  assert.ok(settleMs < 5000, `settled in ${settleMs} ms`);
  // nothing of this render keeps running: HF closes its Chromes and encoders itself (gone at once), or, when the grace expired
  // (r.killed), taskkill ended them and Windows tears them down: a Chrome GPU process only once the graphics driver has released it
  // (under 1 s quiet; with every core busy up to about a minute, measured)
  for (let t = Date.now(); ours().length && Date.now() - t < (r.killed ? 60000 : 3000);) await new Promise((ok) => setTimeout(ok, 250));
  assert.deepEqual(ours(), [], `Chrome or ffmpeg of this render left running${r.killed ? " after it was killed" : ""}`);
  assert.equal(existsSync(out), false, "partial output left");
  assert.deepEqual(staleDirs(), [], "temp render dir left");
});

for (const [label, fixture, extra, code, outcome] of [
  ["script error", "err-script", { strictness: "best-effort" }, "SCRIPT_ERROR", null],
  ["missing asset (strict)", "err-asset", {}, "MEDIA_LOAD_FAILED", null],
  ["missing asset (best-effort) is a warning", "err-asset", { strictness: "best-effort" }, "MEDIA_LOAD_FAILED", "completed_with_warnings"],
  ["no timeline registered (strict)", "err-noduration", {}, "TIMELINE_NOT_REGISTERED", null],
]) {
  test(`classifies: ${label}`, { timeout: 120000 }, async () => {
    const r = await render({ projectDir: join(FX, fixture), outputPath: join(OUT, `${fixture}-${outcome ?? "strict"}.mp4`), fps: { num: 30, den: 1 }, workers: 2, ...FAST, ...extra });
    if (outcome) {
      assert.equal(r.type, "done", JSON.stringify(r));
      assert.equal(r.outcome, outcome);
      assert.ok(r.warnings.some((w) => w.code === code), JSON.stringify(r.warnings));
    } else {
      assert.equal(r.type, "failed", JSON.stringify(r));
      assert.equal(r.code, code, JSON.stringify(r));
    }
    assert.equal(chromeCount(), 0);
  });
}

test("classifies: FFmpeg missing", { timeout: 60000 }, async () => {
  const r = await render({ projectDir: join(FX, "minimal"), outputPath: join(OUT, "noffmpeg.mp4"), fps: { num: 30, den: 1 }, workers: 1 }, {
    envOverride: { HYPERFRAMES_FFMPEG_PATH: "C:\\nonexistent\\ffmpeg.exe", HYPERFRAMES_FFPROBE_PATH: "C:\\nonexistent\\ffprobe.exe", PATH: "C:\\Windows\\System32" },
  });
  assert.equal(r.type, "failed", JSON.stringify(r));
  assert.equal(r.code, "FFMPEG_MISSING", JSON.stringify(r));
});

test("a worker message or output that arrives after the log is closed cannot crash the server", { timeout: 60000 }, async () => {
  const crashes = [];
  const onCrash = (e) => crashes.push(e);
  process.on("uncaughtException", onCrash);
  try {
    let child = null;
    const r = await render({ projectDir: join(FX, "minimal"), outputPath: join(OUT, "late-message.mp4"), fps: { num: 30, den: 1 }, workers: 1 }, {
      envOverride: { HYPERFRAMES_FFMPEG_PATH: "C:\\nonexistent\\ffmpeg.exe", HYPERFRAMES_FFPROBE_PATH: "C:\\nonexistent\\ffprobe.exe", PATH: "C:\\Windows\\System32" },
      onChild: (c) => { child = c; },
      onEvent: () => { throw new Error("a listener that throws"); },
    });
    assert.equal(r.type, "failed");
    // IPC is read late in real life: these arrive after 'exit' closed the log stream (the old code threw ERR_STREAM_WRITE_AFTER_END)
    child.emit("message", { type: "progress", stage: "capture", done: 1 });
    child.emit("message", null);
    child.stdout.emit("data", Buffer.from("late output\n"));
    await new Promise((ok) => setTimeout(ok, 300));
    assert.deepEqual(crashes.map((e) => e.message), [], "an uncaught error would have taken the server down");
  } finally { process.off("uncaughtException", onCrash); }
});

test("classifies: invalid fps is refused before a worker starts", () => {
  assert.throws(() => render({ projectDir: join(FX, "minimal"), outputPath: join(OUT, "x.mp4"), fps: { num: 30, den: 0 } }), /positive/);
});

test("a worker killed mid-render leaves no Chrome; the next render sweeps its temp dir", { timeout: 180000 }, async () => {
  let child = null;
  let killed = false;
  const r = await render({ projectDir: join(FX, "long"), outputPath: join(OUT, "crash.mp4"), fps: { num: 30, den: 1 }, workers: 4 }, {
    onChild: (c) => { child = c; },
    onEvent: (e) => { if (!killed && e.type === "progress" && e.stage === "capture" && (e.done ?? 0) > 60) { killed = true; execFileSync("taskkill", ["/PID", String(child.pid), "/F"], { windowsHide: true }); } },
  });
  assert.ok(killed, "never reached capture");
  assert.equal(r.code, "WORKER_EXITED", JSON.stringify(r));
  await new Promise((ok) => setTimeout(ok, 3000));
  assert.equal(chromeCount(), 0, "Chrome left running after a crash");
  const next = await render({ projectDir: join(FX, "minimal"), outputPath: join(OUT, "after-crash.mp4"), fps: { num: 30, den: 1 }, workers: 1 });
  assert.equal(next.type, "done");
  assert.deepEqual(staleDirs(), [], "temp dir of the crashed render not swept");
});

test("a finished render whose 'done' event is lost or late still reports done (exit 0 and its output written)", { timeout: 180000 }, async () => {
  const out = join(OUT, "late-done.mp4");
  const r = await render({ projectDir: join(FX, "minimal"), outputPath: out, fps: { num: 30, den: 1 }, workers: 1 }, {
    onChild: (c) => { const emit = c.emit.bind(c); c.emit = (ev, m, ...a) => (ev === "message" && m?.type === "done" ? false : emit(ev, m, ...a)); },
  });
  assert.equal(r.type, "done", JSON.stringify(r));
  assert.equal(r.late, true);
  assert.equal(r.exitCode, 0);
});

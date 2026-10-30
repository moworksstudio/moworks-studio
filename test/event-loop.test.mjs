// T27-3: the server answered every request in 20-60 s while a film's Character step drew its sheets: the server passed the sync
// snapshotAt (spawnSync, up to 300 s) to characterSheets, which held Node's event loop for the whole app. The server's long child processes
// (HF's stills, transcribe and beats, FFmpeg's encodes, git fetches, Python's probe) now run asynchronously. These tests hold a timer
// against them: it must keep firing on time while a slow child runs.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-loop-"));
Object.assign(process.env, { MW_CHARACTERS_ROOT: join(T, "characters"), MW_WORK_ROOT: join(T, "work"), MW_STATE_DIR: join(T, "state"), MW_BACKUP_ROOT: join(T, "backup"),
  MW_NO_BACKUP: "1", MW_NO_LIBRARY_IMPORT: "1", MW_NO_ASSET_INSTALL: "1" });
after(() => rmSync(T, { recursive: true, force: true }));
const K = await import("../packages/character-kit/index.mjs");
const { installed, resolveRuntime } = await import("../packages/version-manager/index.mjs");

/** Run `work` while a 20 ms timer ticks: { value, longest } where longest is the longest the timer waited between two ticks (ms), the
 *  time the event loop was held. */
async function heldWhile(work) {
  let last = performance.now(), longest = 0;
  const tick = () => { const now = performance.now(); longest = Math.max(longest, now - last); last = now; };
  const iv = setInterval(tick, 20);
  try { const value = await work(); tick(); return { value, longest }; } finally { clearInterval(iv); }
}
// a fake HF still: a real child process that waits `ms`, then writes one frame into the output folder, as `hyperframes snapshot` does
const STILL = (ms) => [process.execPath, ["-e", `setTimeout(() => { const fs = require("fs"); fs.mkdirSync(process.argv[1], { recursive: true }); fs.writeFileSync(require("path").join(process.argv[1], "frame-00-at-1.2s.png"), "png"); }, ${ms})`]];
const slowStill = (ms) => (_dir, _times, outDir) => new Promise((ok) => {
  const [exe, args] = STILL(ms);
  const c = spawn(exe, [...args, outDir], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let err = ""; c.stderr.on("data", (d) => { err += d; });
  c.on("close", (code) => ok({ exitCode: code, stderrTail: err.split(/\r?\n/).slice(-5) }));
});
// the old way: the same child, run with spawnSync
const slowStillSync = (ms) => (_dir, _times, outDir) => { const [exe, args] = STILL(ms); const r = spawnSync(exe, [...args, outDir], { windowsHide: true, encoding: "utf8" }); return { exitCode: r.status, stderrTail: (r.stderr ?? "").split(/\r?\n/).slice(-5) }; };

const castProject = () => {
  const d = mkdtempSync(join(T, "film-"));
  writeFileSync(join(d, K.CAST_FILE), readFileSync(join(import.meta.dirname, "fixtures", "brush-mini", "CHARACTERS.json")));
  return d;
};
const noKit = !K.kitSource()?.intact && "the ClaudeAnimationBase clone is not at the pinned commit (config/pins.json characterKit)";

test("character sheets: a slow still leaves the event loop free (a timer fires on time); the sync still held it, as in T27-3", { skip: noKit, timeout: 60000 }, async (t) => {
  const finalize = async () => ({});
  const d = castProject();
  const fast = await heldWhile(() => K.characterSheets(d, { finalize, snapshotAt: slowStill(800) }));
  assert.deepEqual(fast.value.problems, []);
  assert.deepEqual(fast.value.characters.map((c) => [c.id, c.error, c.views, c.emotions]), [["bao", null, "characters/sheets/bao-views.png", "characters/sheets/bao-emotions.png"]],
    "both sheets drawn through the async still");
  assert.ok(fast.longest < 400, `the timer waited ${Math.round(fast.longest)} ms while two 800 ms stills ran (at most 400 ms)`);
  // the probe sees a held loop: the same stills through spawnSync hold it for each still's whole run
  const slow = await heldWhile(() => K.characterSheets(castProject(), { finalize, snapshotAt: slowStillSync(800) }));
  assert.equal(slow.value.characters[0].error, null);
  t.diagnostic(`longest wait of the timer: ${Math.round(fast.longest)} ms async, ${Math.round(slow.longest)} ms sync`);
  assert.ok(slow.longest >= 700, `the sync still held the loop ${Math.round(slow.longest)} ms`);
});

const hf = installed().length > 0;
test("the server's HF calls run HF's CLI as a child without holding the event loop: stills, transcribe, beats", { skip: !hf && "HyperFrames is not installed", timeout: 120000 }, async (t) => {
  const { snapshotAtForeground } = await import("../packages/hf-qa/cli.mjs");
  const { importTranscript } = await import("../packages/hf-audio/index.mjs");
  const { analyseBeats } = await import("../packages/hf-edit/tracks.mjs");
  resolveRuntime();          // the runtime resolved once, as a running server has it (its Chrome's version is asked once)
  const missing = join(T, "no-such-film");
  // HF's CLI starts (about 1 s of Node) and says the folder is not there: no browser is started
  const r = await heldWhile(() => Promise.all([
    snapshotAtForeground(missing, [1.2], join(T, "snap")),
    importTranscript(missing, join(T, "no-words.json")),
    analyseBeats(missing, "music.mp3"),
  ]));
  const [still, words, beats] = r.value;
  assert.notEqual(still.exitCode, 0, "no film there: HF said so");
  assert.equal(words.ok, false); assert.equal(beats.ok, false);
  t.diagnostic(`longest wait of the timer: ${Math.round(r.longest)} ms`);
  assert.ok(r.longest < 400, `the timer waited ${Math.round(r.longest)} ms while HF's CLI ran three times (at most 400 ms)`);
});

test("the server passes no sync HF call: what it imports from hf-qa/cli.mjs is the async forms only", () => {
  const SYNC = new Set(["snapshotAt", "snapshot", "runHfJson", "check", "inspect", "validate"]);
  const dir = join(import.meta.dirname, "..", "packages", "server"), bad = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".mjs"))) {
    const src = readFileSync(join(dir, f), "utf8");
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']\.\.\/hf-qa\/cli\.mjs["']/g))
      for (const name of m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if (SYNC.has(name)) bad.push(`${f}: ${name}`);
  }
  assert.deepEqual(bad, []);
});

test("a setup fetch, the Python probe and the library's encodes answer promises (their children run off the event loop)", async () => {
  const { fetchSkills } = await import("../packages/setup/hf-skills.mjs");
  const { fetchStyleSource } = await import("../packages/setup/first-run.mjs");
  const { statusAsync } = await import("../packages/setup/python.mjs");
  const { recodePreview, encodeVideoAsync, encodePosterAsync } = await import("../packages/library/preview-media.mjs");
  for (const fn of [fetchSkills, fetchStyleSource, recodePreview]) assert.equal(fn.constructor.name, "AsyncFunction", fn.name);
  await assert.rejects(fetchStyleSource("no-such-source"), { code: "NOT_FOUND" });
  const s = await statusAsync();
  assert.equal(typeof s.ready, "boolean");
  mkdirSync(join(T, "enc"), { recursive: true });
  await assert.rejects(encodeVideoAsync(join(T, "enc", "none.mp4"), join(T, "enc", "out.mp4")));
  await assert.rejects(encodePosterAsync(join(T, "enc", "none.png"), join(T, "enc", "out.webp")));
});

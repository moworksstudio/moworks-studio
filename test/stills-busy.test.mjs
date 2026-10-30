// Stills on a busy computer (T25: the Storyboard's board_stills hung about 11.5 min twice and every round came back empty; T26-5: the
// Review's first qc_sheets ran 11.5 min and gave no picture). A still run gets a time limit sized to its stills; one that is stopped
// takes the stills it lacks once more by itself; stopped twice, the app says "The pictures could not be taken (the computer is busy). Try
// again." and keeps no empty round. HyperFrames' snapshot is faked here: a slow one writes only the stills its time limit allows.
// Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const T = mkdtempSync(join(tmpdir(), "mw-stills-busy-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));
const { STILLS_BUSY, snapOnceMore, stillsStopped, stillsTimeoutMs } = await import("../packages/hf-qa/cli.mjs");
const { qcRound } = await import("../packages/hf-qa/qc.mjs");
const B = await import("../packages/hf-edit/boards.mjs");

// a small real PNG of two colours (no still reads as blank)
const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
function png(seed) {
  const w = 16, h = 9, ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < h; y++) { rows.push(0); for (let x = 0; x < w; x++) rows.push(...(x < w / 2 ? [seed * 20 % 256, 40, 90] : [230, seed * 30 % 256, 10])); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.from(rows))), chunk("IEND", Buffer.alloc(0))]);
}
/** HyperFrames' snapshot, faked and slow: each call takes `msPerStill` of the computer's time a still (plus `startMs`), writes the stills
 *  its time limit allows (as HF names them: their place in this call, then the time), and says `timedOut` when it could not take them
 *  all. HF clears its output folder first, as the real one does. Every call is recorded. */
function slowSnap({ startMs = 60000, msPerStill = [], calls = [] } = {}) {
  let seed = 1;
  const fn = async (dir, times, outDir, opts = {}) => {
    const k = calls.length, per = msPerStill[k] ?? msPerStill.at(-1) ?? 1000;
    calls.push({ times, timeoutMs: opts.timeoutMs, idleMs: opts.idleMs, outDir });
    rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true });
    await new Promise((r) => setTimeout(r, 5));
    const fit = Math.max(0, Math.floor(((opts.timeoutMs ?? Infinity) - startMs) / per));
    times.slice(0, fit).forEach((t, i) => writeFileSync(join(outDir, `frame-${String(i).padStart(2, "0")}-at-${t}s.png`), png(seed++)));
    return fit >= times.length ? { exitCode: 0, stderrTail: [], stderr: "" } : { exitCode: 1, timedOut: true, stderrTail: [], stderr: "" };
  };
  fn.calls = calls;
  return fn;
}
const names = (d) => readdirSync(d).filter((f) => /^frame-/.test(f)).sort();

test("a still run's time limit is sized to its stills (2 min to start, 10 s a still, at most 15 min)", () => {
  assert.equal(stillsTimeoutMs(1), 130000);
  assert.equal(stillsTimeoutMs(12), 240000);
  assert.equal(stillsTimeoutMs(88), 15 * 60000, "capped");
  assert.equal(stillsTimeoutMs(0), 130000);
  // what counts as stopped: its limit, no new still for a while, HF's own wait that ran out; never a plain failure
  assert.equal(stillsStopped({ exitCode: 1, timedOut: true }), true);
  assert.equal(stillsStopped({ exitCode: 1, idle: true }), true);
  assert.equal(stillsStopped({ exitCode: 1, stderr: "TimeoutError: Navigation timeout of 30000 ms exceeded" }), true);
  assert.equal(stillsStopped({ exitCode: 1, stderrTail: ["Error: page crashed"] }), false);
  assert.equal(stillsStopped({ exitCode: 0, stderr: "" }), false);
});

test("a slow run stopped at its limit takes only the stills it lacks once more, named as one run would have named them", async () => {
  const out = join(T, "once"); mkdirSync(out, { recursive: true });
  const times = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5];
  // the first run starts in 1 min and takes 20 s a still: 9 of the 12 fit in its 4 min; the second takes 5 s a still
  const snap = slowSnap({ msPerStill: [20000, 5000] });
  let retried = 0;
  const r = await snapOnceMore(snap, "board", times, out, { idleMs: 120000, onRetry: () => retried++ });
  assert.equal(r.exitCode, 0); assert.equal(r.retried, true); assert.equal(r.busy, undefined); assert.equal(retried, 1);
  assert.equal(snap.calls.length, 2);
  assert.equal(snap.calls[0].timeoutMs, stillsTimeoutMs(12), "the first run's limit: its 12 stills");
  assert.deepEqual(snap.calls[1].times, times.slice(9), "only the 3 it lacked");
  assert.equal(snap.calls[1].timeoutMs, stillsTimeoutMs(3));
  assert.equal(snap.calls[1].idleMs, 120000, "the stall watch on both runs");
  assert.match(snap.calls[1].outDir, /[\\/]\.again$/, "a folder of its own: HF clears its output folder");
  assert.deepEqual(names(out), times.map((t, i) => `frame-${String(i).padStart(2, "0")}-at-${t}s.png`));
  assert.ok(!existsSync(join(out, ".again")));
});

test("stopped twice: busy, and a run that is not stopped (or the app stopping) is never tried again", async () => {
  const out = join(T, "twice"); mkdirSync(out, { recursive: true });
  const snap = slowSnap({ msPerStill: [60000] });          // a still a minute: nothing fits either time
  const r = await snapOnceMore(snap, "film", [1, 2, 3], out);
  assert.equal(r.busy, true); assert.equal(snap.calls.length, 2);
  const plain = slowSnap(); let n = 0;
  const failing = async (...a) => { n++; await plain(...a); return { exitCode: 1, stderrTail: ["Error: page crashed"], stderr: "Error: page crashed" }; };
  assert.equal((await snapOnceMore(failing, "film", [1], join(T, "fail"))).busy, undefined); assert.equal(n, 1, "a real error is said, not tried again");
  const c = new AbortController(); c.abort(); n = 0;
  const stopped = async () => { n++; return { exitCode: 1, timedOut: true, stderrTail: [] }; };
  assert.equal((await snapOnceMore(stopped, "film", [1], join(T, "abort"), { signal: c.signal })).busy, undefined); assert.equal(n, 1, "the app stopping is not retried");
});

test("the Review's round: pictures stopped twice end the round at once as busy, with no sheet, no check and no round folder", async () => {
  for (const parallel of [false, true]) {
    const dir = join(T, `qc-${parallel}`); mkdirSync(join(dir, ".moworks"), { recursive: true });
    const snap = slowSnap({ msPerStill: [60000] });
    let checks = 0, retried = 0;
    // HF's check, faked: it runs until it is stopped (a busy round must not wait for its 10 min)
    const hf = (_cmd, _dir, _args, { signal } = {}) => { checks++; return new Promise((ok) => { const end = () => ok({ json: null, exitCode: null, stderrTail: [] }); if (signal?.aborted) end(); else signal?.addEventListener("abort", end, { once: true }); }); };
    const res = await qcRound(dir, { shots: [{ number: 1, start: 0, duration: 2 }, { number: 2, start: 2, duration: 2 }], total: 0, snap, hf, parallel, pauseMs: 10, onRetry: () => retried++ });
    assert.equal(res.busy, true, `parallel ${parallel}`);
    assert.deepEqual(res.sheets, {}, "no sheet");
    assert.equal(res.check, undefined, "no check result");
    assert.ok(res.failed.includes(STILLS_BUSY));
    assert.equal(retried, 1);
    assert.equal(snap.calls.length, 2);
    assert.equal(checks, parallel ? 1 : 0, parallel ? "the check ran beside the pictures and was ended" : "serial: the check never started");
    assert.ok(!existsSync(join(dir, ".moworks", "qc", res.round)), "no empty round is kept");
  }
});

test("the Review's round: a first run stopped at its limit and a second that works make a full round", async () => {
  const dir = join(T, "qc-ok"); mkdirSync(join(dir, ".moworks"), { recursive: true });
  const snap = slowSnap({ msPerStill: [20000, 1000] });
  const hf = async () => ({ json: { ok: true, lint: { findings: [] } }, exitCode: 0, stderrTail: [] });
  const shots = Array.from({ length: 6 }, (_, i) => ({ number: i + 1, start: i * 2, duration: 2 }));
  const res = await qcRound(dir, { shots, total: 0, snap, hf, pauseMs: 10 });
  assert.equal(res.busy, undefined);
  assert.deepEqual(res.failed, [], res.failed.join("; "));
  assert.ok(res.sheets.beats && res.sheets.cuts && res.sheets.phone, "the three sheets");
  assert.equal(snap.calls.length, 2);
});

function board(dir, o, frames) {
  mkdirSync(join(dir, "boards", o), { recursive: true });
  writeFileSync(join(dir, "boards", o, "STORYBOARD.md"), `# Option ${o}\n- idea: the bee\n\n${Array.from({ length: frames }, (_, i) => `## Frame ${i + 1} — panel ${i + 1}\n- duration: 2s\n`).join("\n")}`);
  writeFileSync(join(dir, "boards", o, "index.html"), `<div data-composition-id="main" data-width="16" data-height="9"></div><!-- ${o} -->`);
}

test("the Storyboard's stills: stopped twice, no round of empty pictures is kept and STILLS_BUSY is thrown; once more, a full round", async () => {
  const d = join(T, "sb"); board(d, "A", 12);
  const busy = slowSnap({ msPerStill: [60000] });
  await assert.rejects(B.takeStills(d, { by: "claude", snap: busy }), (e) => e.code === "STILLS_BUSY" && e.message === STILLS_BUSY);
  assert.deepEqual(B.listRounds(d), [], "no empty round for the dialog to show or to approve from");
  assert.equal(busy.calls[0].timeoutMs, stillsTimeoutMs(12));
  // the first run stopped at its limit (6 of 12), the second takes the 6 frames it lacked: one round, every frame in order
  const slow = slowSnap({ msPerStill: [30000, 1000] });
  const r = await B.takeStills(d, { by: "owner", snap: slow });
  assert.equal(slow.calls.length, 2);
  const a = r.round.options.find((o) => o.option === "A");
  assert.equal(a.stills.length, 12);
  assert.deepEqual(a.stills.map((s) => s.split("/").pop().replace(/-at-.*$/, "")), Array.from({ length: 12 }, (_, i) => `frame-${String(i).padStart(2, "0")}`));
  assert.deepEqual(r.failed, []);
  assert.ok(a.sheets.length, "its sheets");
});

test("the server says it: no Review round kept or scored from nothing, a Retry in the chat, the Storyboard dialog's Retry", () => {
  const src = (f) => readFileSync(join(import.meta.dirname, "..", ...f.split("/")), "utf8");
  const boards = src("packages/server/boards.mjs"), ap = src("packages/server/autopilot.mjs");
  assert.match(boards, /if \(res\.busy\) \{\s*task\.stillsBusy = true;\s*return `\$\{STILLS_BUSY\}/, "qc_sheets: no lastQc, Claude told to stop");
  assert.match(boards, /e\.code !== "STILLS_BUSY"\) throw e;\s*[^]*?busyStills\(project\);/, "board_stills: said once");
  assert.match(boards, /stillsBusy: takingOf\(p\.id\) \? null : stillsBusy\.get\(p\.id\) \?\? null/, "GET /boards says it until a take works");
  assert.match(ap, /step === "qcReview" && task\.stillsBusy && !task\.qcSheetsOk\) \{\s*try \{ projects\.addNote\(p\.path, \{ kind: "review", status: "warning", text: STILLS_BUSY, retry: "qcReview" \}\)/);
  const ui = src("ui/src/workflow/Boards.jsx"), chat = src("ui/src/editor/ClaudePanel.jsx");
  assert.match(ui, /busyLine && !stillsErr && <p className="state-line stop" role="status">\{t\(busyLine\)\} <button className="clink" onClick=\{retake\}>\{t\("Retry"\)\}/);
  assert.match(chat, /\{n\.retry && <RetryStep projectId=\{projectId\} step=\{n\.retry\}/);
});

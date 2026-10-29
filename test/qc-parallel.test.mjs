// The Review's checks round with its three parts at once: the stills and sheets, the still-stretch measure and
// HyperFrames' check give the same round as one after the other; a part that fails is reported in the serial order; the graphics card
// short of memory (under 8 GB free) runs them one at a time, like a background render's single worker. Uses HF's browser.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qcRound } from "../packages/hf-qa/qc.mjs";
import { BG_WORKERS, bgWorkers, gpuShort } from "../packages/server/proxy.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-qc-parallel-"));
after(() => rmSync(T, { recursive: true, force: true }));
const film = (name) => { const d = join(T, name); cpSync(join(import.meta.dirname, "fixtures", "minimal"), d, { recursive: true }); return d; };
const SHOTS = [{ number: 1, start: 0, duration: 2 }, { number: 2, start: 2, duration: 2 }];
// what a round says, without its own round id and folder
const said = (r) => ({ sheets: Object.fromEntries(Object.entries(r.sheets).map(([k, v]) => [k, v.replace(/R\d+/, "R")])), beats: r.beats, cuts: r.cuts,
  check: r.check, still: r.still, failed: r.failed });

test("the three parts at once give the same round as one after the other", { timeout: 300000 }, async () => {
  const d = film("same");
  const serial = await qcRound(d, { shots: SHOTS, total: 4 });
  const parallel = await qcRound(d, { shots: SHOTS, total: 4, parallel: true });
  assert.deepEqual(serial.failed, [], serial.failed.join("; "));
  assert.deepEqual(said(parallel), said(serial));
  assert.notEqual(parallel.round, serial.round, "a round of its own");
  for (const k of ["beats", "cuts", "phone"]) assert.ok(existsSync(join(d, parallel.sheets[k])), k);
  assert.ok(parallel.still && parallel.check, "the still stretches and the check are in the round");
});

test("a part that fails is reported in the serial order, the others still give theirs", { timeout: 300000 }, async () => {
  const d = film("broken");
  // a film whose check finds a script error and whose stills still come: both modes say the same, in the same order
  writeFileSync(join(d, "index.html"), String(await import("node:fs").then((fs) => fs.readFileSync(join(d, "index.html"), "utf8")))
    .replace("</body>", "<script>console.error('boom from the test');</script></body>"));
  const serial = await qcRound(d, { shots: SHOTS, total: 4 });
  const parallel = await qcRound(d, { shots: SHOTS, total: 4, parallel: true });
  assert.deepEqual(said(parallel), said(serial));
});

test("a stopped round stops in both modes", { timeout: 120000 }, async () => {
  const d = film("stopped");
  for (const parallel of [false, true]) {
    const c = new AbortController(); c.abort();
    await assert.rejects(qcRound(d, { shots: SHOTS, total: 4, signal: c.signal, parallel }), undefined, `parallel ${parallel}`);
  }
});

test("under 8 GB free on the graphics card, one Chrome at a time (the checks round serial, a background render one worker)", () => {
  assert.equal(gpuShort(4000), true);
  assert.equal(gpuShort(7999), true);
  assert.equal(gpuShort(8000), false);
  assert.equal(gpuShort(null), false, "no reading (no NVIDIA card): as before, not short");
  assert.equal(bgWorkers(4000), 1);
  assert.equal(bgWorkers(12000), BG_WORKERS);
});

// Claude fixed the film's code during the Review and in a chat fix, but the checks round's pictures came from the bundle the last
// task had left (finalize bundles at a task's end): every round, and the checks' G-BUILD, bundle the film's code again first
test("a checks round looks at the film's code as it is now; code that does not compile is said, never shown as the fix", { timeout: 300000 }, async () => {
  const { anidoodleSource } = await import("../packages/anidoodle-styles/index.mjs");
  if (!anidoodleSource()?.intact) return;          // anidoodle not pinned on this computer
  const { readFileSync } = await import("node:fs");
  const { finalize } = await import("../packages/hf-edit/finalize.mjs");
  const d = join(T, "ani448");
  cpSync(join(import.meta.dirname, "fixtures", "anidoodle-mini"), d, { recursive: true });
  await finalize(d, { googleFonts: false });
  const page = join(d, "anidoodle", "page.ts"), bundle = join(d, "compositions", "anidoodle", "film.js");
  assert.match(readFileSync(bundle, "utf8"), /c8442a/);
  await new Promise((r) => setTimeout(r, 30));
  writeFileSync(page, readFileSync(page, "utf8").replace('ctx.fillStyle = "#c8442a"', 'ctx.fillStyle = "#2a6cc8"'));          // Claude's fix, mid-task
  const shots = [{ number: 1, start: 0, duration: 1 }];
  const r = await qcRound(d, { shots, total: 1, parallel: true });
  assert.deepEqual(r.failed, [], r.failed.join("; "));
  assert.match(readFileSync(bundle, "utf8"), /2a6cc8/, "the round bundled the fix before its pictures");
  await new Promise((r) => setTimeout(r, 30));
  writeFileSync(page, readFileSync(page, "utf8") + "\nexport const broken = ;\n");
  const bad = await qcRound(d, { shots, total: 1, parallel: true });
  assert.match(bad.failed[0], /^the film's code does not compile, so these pictures show the film before your last change: .*page\.ts/);
});

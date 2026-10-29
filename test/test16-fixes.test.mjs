// The Motion Plan's lead no longer asks for compositions, no checks before the Build, a finished
// task's checks are dropped when the next task starts, a checks part that met HyperFrames' held history runs once more, the ETA past its plan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { optionLead, estimateNow } from "../packages/server/autopilot.mjs";
import { Agent, checksAfter, gatesAsync } from "../packages/agent/index.mjs";
import { againIfBusy, historyBusy } from "../packages/hf-qa/cli.mjs";
import { qcRound, stillsFailure } from "../packages/hf-qa/qc.mjs";

const BUSY = "   ⚠ Snapshots were not recorded: This project's history is open in another process (pid 51176).";

test("the Motion Plan's lead keeps the option's frames in its board; the Build starts from them", () => {
  const m = optionLead("motionSpec", "A");
  assert.doesNotMatch(m, /pose its frames in the project/);
  assert.match(m, /boards\/A\/index\.html/);
  assert.match(m, /do not copy them into the project/);
  assert.match(m, /no composition, no index\.html/);
  assert.match(m, /frame\.md/);
  const b = optionLead("build", "B2");
  assert.match(b, /boards\/B2\/index\.html/);
  assert.match(b, /starting layouts/);
  assert.equal(optionLead("qcReview", "A"), "");
  assert.equal(optionLead("motionSpec", "mix"), "");
  assert.equal(optionLead("build", undefined), "");
});

test("no checks after a step before the Build; a chat task and the Build's steps get them", () => {
  const steps = ["brief", "character", "storyboard", "motionSpec", "build", "qcReview", "sound", "checks"];
  for (const s of ["brief", "character", "storyboard", "motionSpec"]) assert.equal(checksAfter(steps, s), false, s);
  for (const s of ["build", "qcReview", "sound"]) assert.equal(checksAfter(steps, s), true, s);
  assert.equal(checksAfter(steps, null), true);
  assert.equal(checksAfter(steps, "notAStep"), true);
  assert.equal(checksAfter(["brief", "storyboard"], "storyboard"), true);          // a pipeline without a build step keeps them
});

test("the next task drops a finished task's checks (the gates' whole process tree ends)", async () => {
  const a = new Agent({ root: tmpdir(), getProject: () => null });
  a.persist = () => {};
  let seen = null;
  a.gates = (dir, { signal }) => new Promise((ok, no) => { seen = signal; signal.addEventListener("abort", () => no(new Error("killed"))); });
  const task = { id: "t1", projectId: "p1", qaPending: true };
  a.lateChecks.set("t1", "D:/nowhere");
  const run = a.runLateChecks(task);
  assert.ok(a.lateRuns.get("p1"), "the running checks are known by project");
  a.lateRuns.get("p1").abort();
  await run;
  assert.equal(seen.aborted, true);
  assert.equal(task.qa, null);
  assert.equal(task.qaDropped, true);
  assert.equal(task.qaPending, undefined);
  assert.equal(a.lateRuns.has("p1"), false);
  // a check that ends on its own keeps its result
  a.gates = async () => ({ pass: false, gates: [{ id: "G-HF-LINT", blocking: true, pass: false, findings: [{ code: "x" }] }] });
  const t2 = { id: "t2", projectId: "p1" };
  a.lateChecks.set("t2", "D:/nowhere");
  await a.runLateChecks(t2);
  assert.equal(t2.qa.blocking[0].id, "G-HF-LINT");
  assert.equal(t2.qaDropped, undefined);
});

test("gatesAsync's signal ends the child at once and rejects with DROPPED", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-t16-"));
  try {
    const script = join(dir, "slow.mjs");
    writeFileSync(script, "setTimeout(() => console.log('{\"pass\":true,\"gates\":[]}'), 60000);\n");
    const stop = new AbortController();
    const t0 = Date.now();
    const p = gatesAsync(dir, { signal: stop.signal, script });
    setTimeout(() => stop.abort(), 300);
    await assert.rejects(p, (e) => e.code === "DROPPED");
    assert.ok(Date.now() - t0 < 15000, `ended in ${Date.now() - t0} ms`);
    // without a signal it still answers as before
    writeFileSync(script, "console.log('{\"pass\":true,\"gates\":[]}');\n");
    assert.deepEqual(await gatesAsync(dir, { script }), { pass: true, gates: [] });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a part that gave nothing while HF's history was held runs once more after a short pause, only once", async () => {
  assert.equal(historyBusy(BUSY), true);
  assert.equal(historyBusy("Fonts: 2 loaded"), false);
  let n = 0;
  const r = await againIfBusy(async () => (++n === 1 ? { json: null, stderr: BUSY } : { json: { ok: true } }), (x) => !x.json, { pauseMs: 10 });
  assert.equal(n, 2); assert.equal(r.retried, true); assert.deepEqual(r.json, { ok: true });
  n = 0;          // held again: still once only
  await againIfBusy(async () => { n++; return { json: null, stderr: BUSY }; }, (x) => !x.json, { pauseMs: 10 });
  assert.equal(n, 2);
  n = 0;          // gave something: no retry
  await againIfBusy(async () => { n++; return { json: { ok: true }, stderr: BUSY }; }, (x) => !x.json, { pauseMs: 10 });
  assert.equal(n, 1);
  n = 0;          // nothing for another reason: no retry
  await againIfBusy(async () => { n++; return { json: null, stderrTail: ["Error: page crashed"] }; }, (x) => !x.json, { pauseMs: 10 });
  assert.equal(n, 1);
  n = 0;          // a long run: never doubled
  let clock = 0;
  await againIfBusy(async () => { n++; clock += 10 * 60000; return { json: null, stderr: BUSY }; }, (x) => !x.json, { pauseMs: 10, now: () => clock });
  assert.equal(n, 1);
});

test("the checks round's check is taken again when HF's history was held, and the stills' failure line drops HF's record warning", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-t16-"));
  try {
    mkdirSync(join(dir, ".moworks"), { recursive: true });
    let calls = 0;
    const hf = async () => (++calls === 1 ? { json: null, exitCode: 1, stderrTail: [BUSY], stderr: BUSY } : { json: { ok: true, lint: { findings: [] } }, exitCode: 0, stderrTail: [] });
    const res = await qcRound(dir, { shots: [], total: 0, hf, snap: async () => { throw new Error("no stills asked"); }, pauseMs: 10 });
    assert.equal(calls, 2);
    assert.equal(res.check.ok, true);
    assert.deepEqual(res.failed, []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const why = stillsFailure({ exitCode: 1, stderrTail: [BUSY, "", "Error: Target closed"] }, 0, 56);
  assert.doesNotMatch(why, /history|not recorded/i);
  assert.match(why, /Target closed; 0 of 56 stills/);
  assert.match(stillsFailure({ exitCode: null, idle: true, stderrTail: [BUSY] }, 12, 56), /no new still for 2 min.*12 of 56 stills/);
});

test("past the planned time the estimate is worked out again from the steps done", () => {
  const est = { minutes: 52, high: 70, covers: "build, review, music and checks", basis: "length" };
  const t0 = Date.parse("2026-10-26T17:15:36Z");
  const steps = (o) => ["build", "qcReview", "sound", "checks"].map((id) => ({ id, status: o[id] ?? "waiting" }));
  // within the plan: as planned
  assert.deepEqual(estimateNow(est, steps({ build: "running" }), { startedAt: new Date(t0).toISOString(), now: t0 + 20 * 60000 }), est);
  assert.equal(estimateNow(est, [], {}), est);
  // at 01:14 (59 min in, the Review running): no longer "about 1 min left"
  const at59 = estimateNow(est, steps({ build: "done", qcReview: "running" }), { startedAt: new Date(t0).toISOString(), now: t0 + 59 * 60000 });
  assert.equal(at59.recomputed, true); assert.equal(at59.planned, 52);
  assert.ok(at59.minutes - 59 >= 20, `left ${at59.minutes - 59}`);
  // an hour later the whole grows with it, never below 2 min left
  const at105 = estimateNow(est, steps({ build: "done", qcReview: "running" }), { startedAt: new Date(t0).toISOString(), now: t0 + 105 * 60000 });
  assert.ok(at105.minutes > at59.minutes);
  const late = estimateNow(est, steps({ build: "done", qcReview: "done", sound: "done", checks: "running" }), { startedAt: new Date(t0).toISOString(), now: t0 + 140 * 60000 });
  assert.ok(late.minutes - 140 >= 2);
});

test("a message only being sent (the sign-in check) does not hide a storyboard changed since its approval", async () => {
  const P = await import("../packages/pipeline/index.mjs");
  const approvals = { storyboard: { at: "2026-10-27T00:00:00Z", hash: "a", contentHash: "a" } };
  const f = { approvals, storyboard: { real: true, hash: "other", rawHash: "other" }, claudeBusy: true, runningStep: null };
  assert.equal(P.judge({ kind: "approval", name: "storyboard" }, f, "storyboard").changed, false, "a task at work: judged when it ends (#478)");
  assert.equal(P.judge({ kind: "approval", name: "storyboard" }, { ...f, claudeStarting: true }, "storyboard").changed, true, "only being sent: judged now");
  const facts = P.gatherFacts({ id: "x", path: tmpdir(), meta: {} }, { shots: [], head: null, jobs: [], runningTask: { id: "starting", step: null, status: "running", starting: true }, lastTasks: {} });
  assert.equal(facts.claudeBusy, true); assert.equal(facts.claudeStarting, true);
});

// Motion Plan (validation, per-shot writes, approval and "changed since approval"). The Moworks Motion kit's motion store this file
// once tested (items, search, spec, staging, media, the pruned HF copies) was removed: the Library is HyperFrames, the
// intake, Looks and the Vocabulary (test/library-looks, test/intake, test/vocab). What an old plan that still names a kit item does is tested here.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-lib-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const library = await import("../packages/library/index.mjs");
const plan = await import("../packages/motion-plan/index.mjs");
const { startServer } = await import("../packages/server/index.mjs");
const { scaffold } = await import("../packages/hf-edit/scaffold.mjs");
const { expandEnv, loadPins } = await import("../packages/version-manager/index.mjs");
const rev = await import("../packages/revisions/index.mjs");

let s, id, dir;
const api = async (method, path, body) => {
  const r = await fetch(`http://127.0.0.1:${s.port}${path}`, { method, headers: { "X-MW-Token": "k", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};

before(async () => {
  s = await startServer({ token: "k" });
  dir = join(T, "work", "projects", "demo");
  await scaffold(dir, readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8"), { registryRoot: expandEnv(loadPins().hyperframes.registryRoot) });
  id = (await api("POST", "/api/projects/open", { path: dir })).json.id;
});
after(async () => { await s.close(); rmSync(T, { recursive: true, force: true }); });

test("motion plan rows: target needed, numbers checked, unknown values made safe", () => {
  assert.throws(() => plan.cleanMotion({ target: " " }), { code: "INVALID" });
  assert.throws(() => plan.cleanMotion({ target: "Title", start: -1 }), { code: "INVALID" });
  assert.throws(() => plan.cleanMotion({ target: "Title", duration: 0 }), { code: "INVALID" });
  const m = plan.cleanMotion({ target: " Title ", type: "spin", start: "0.12345", duration: "0.6", source: { kind: "hack", id: "x" }, status: "done" });
  assert.equal(m.target, "Title");
  assert.equal(m.type, "other");
  assert.equal(m.start, 0.123);
  assert.equal(m.duration, 0.6);
  assert.deepEqual(m.source, { kind: "claude" }, "T14-8: a kind the app does not know is Claude's (New), never By you");
  assert.equal(m.status, "planned");
  assert.match(m.id, /^m[0-9a-f]{6}$/);
});

test("motion plan file: one shot replaced at a time, empty shots dropped, bad JSON reported", () => {
  const d = mkdtempSync(join(T, "plan-"));
  assert.equal(plan.read(d).exists, false);
  plan.setShot(d, 2, [{ target: "Number", type: "emphasis", duration: 1 }]);
  plan.setShot(d, 1, [{ target: "Title", source: { kind: "library", id: "data/conic-progress-ring", version: "kit 9.9.9" } }]);
  let r = plan.read(d);
  assert.deepEqual(r.plan.shots.map((x) => [x.shot, x.motions.length]), [[1, 1], [2, 1]]);
  assert.deepEqual(r.plan.shots[0].motions[0].source, { kind: "library", id: "data/conic-progress-ring", version: "kit 9.9.9" });
  r = plan.setShot(d, 2, []);
  assert.deepEqual(r.plan.shots.map((x) => x.shot), [1]);
  writeFileSync(join(d, plan.FILE), "{ not json");
  assert.match(plan.read(d).error, /not valid JSON/);
  assert.throws(() => plan.setShot(d, 1, []), { code: "INVALID" });
});

test("motion plan: the Moworks row 0 and BANNED / QA lines are kept, a move of HyperFrames' motion.md is a source", () => {
  const d = mkdtempSync(join(T, "plan-"));
  writeFileSync(join(d, plan.FILE), JSON.stringify({ version: 1, dynamic: "strong", groove: "none", banned: ["title on a gradient", ""], qa: ["2.5 s logo lands"],
    shots: [{ shot: 1, motions: [{ target: "Title", source: { kind: "hf", id: "motion.md#transitions-with-a-cause" } }] }] }));
  let r = plan.read(d);
  assert.equal(r.plan.dynamic, "strong");
  assert.deepEqual(r.plan.banned, ["title on a gradient"]);
  assert.deepEqual(r.plan.shots[0].motions[0].source, { kind: "hf", id: "motion.md#transitions-with-a-cause" });
  r = plan.setShot(d, 2, [{ target: "Number" }]);
  assert.equal(r.plan.groove, "none", "editing a shot keeps row 0");
  assert.deepEqual(r.plan.qa, ["2.5 s logo lands"]);
  // The shot's plain words and what the user approves, kept through an edit of the shot's rows
  const j = JSON.parse(readFileSync(join(d, plan.FILE), "utf8"));
  writeFileSync(join(d, plan.FILE), JSON.stringify({ ...j, approving: "Cách từng cảnh chuyển động, mạnh hay nhẹ", shots: j.shots.map((s) => s.shot === 1 ? { ...s, says: "kính xoay nhẹ quanh bà, trôi rõ" } : s) }));
  r = plan.setShot(d, 1, [{ target: "Title", type: "loop" }]);
  assert.equal(r.plan.approving, "Cách từng cảnh chuyển động, mạnh hay nhẹ");
  assert.equal(r.plan.shots[0].says, "kính xoay nhẹ quanh bà, trôi rõ");
  assert.equal(plan.setShot(d, 1, [{ target: "Title" }], "kính bay tới rồi trôi").plan.shots[0].says, "kính bay tới rồi trôi");
  assert.match(plan.PROMPT, /"says":/); assert.match(plan.PROMPT, /moworks-alive/);
  // Each row's element in words (the selector never shows) and its plain sentence, kept through the cleaning
  const row = plan.setShot(d, 3, [{ target: ".f1-head .ln:nth-child(2)", name: "Tiêu đề", plain: "Tiêu đề trồi lên nhẹ rồi đứng, êm", behavior: "y 40→0, 0.6 s" }]).plan.shots.find((s) => s.shot === 3).motions[0];
  assert.deepEqual([row.name, row.plain], ["Tiêu đề", "Tiêu đề trồi lên nhẹ rồi đứng, êm"]);
  assert.ok(!("plain" in plan.setShot(d, 3, [{ target: "x" }]).plan.shots.find((s) => s.shot === 3).motions[0]), "absent when Claude wrote none");
  assert.match(plan.PROMPT, /"name":/); assert.match(plan.PROMPT, /"plain":/, "QA run 07 (#354): each row in plain words too, the numbers behind Show timing");
});

test("motion plan API: save a shot, approve, then a change asks for approval again", async () => {
  assert.equal((await api("POST", `/api/projects/${id}/motion-plan/approve`)).status, 400, "nothing to approve yet");
  const put = await api("PUT", `/api/projects/${id}/motion-plan/shots/2`, { motions: [{ target: "Price", type: "entrance", start: 0.2, duration: 0.8, ease: "power3.out", behavior: "Counts up to 7,911" }] });
  assert.equal(put.status, 200, JSON.stringify(put.json));
  assert.equal(put.json.plan.shots[0].motions[0].target, "Price");
  assert.equal((await api("PUT", `/api/projects/${id}/motion-plan/shots/2`, { motions: [{ target: "" }] })).status, 400);
  let g = await api("GET", `/api/projects/${id}/motion-plan`);
  assert.equal(g.json.approval, null);
  assert.ok(g.json.types.includes("transition"));
  const a = await api("POST", `/api/projects/${id}/motion-plan/approve`);
  assert.equal(a.status, 200);
  assert.equal(a.json.meta.approvals.motionPlan.by, "owner");
  assert.equal(a.json.meta.stages.motionPlan.status, "done");
  g = await api("GET", `/api/projects/${id}/motion-plan`);
  assert.equal(g.json.changedSinceApproval, false);
  await api("PUT", `/api/projects/${id}/motion-plan/shots/1`, { motions: [{ target: "Title", type: "text" }] });
  g = await api("GET", `/api/projects/${id}/motion-plan`);
  assert.equal(g.json.changedSinceApproval, true);
  assert.deepEqual(g.json.plan.shots.map((x) => x.shot), [1, 2]);
});

test("an old plan that still cites an item of the removed kit: said as no longer in the library, never an error; the film keeps what it copied", async () => {
  assert.equal(library.isRetired("kit:text/land-in"), true);
  assert.equal(library.isRetired("hf:component/count-up"), false);
  assert.equal(library.isRetired("vocab:032"), false);
  assert.equal(library.stageItem(dir, "kit:text/land-in"), null, "nothing to copy");
  assert.equal(library.getItem("kit:text/land-in"), null);
  const put = await api("PUT", `/api/projects/${id}/motion-plan/shots/3`, { motions: [{ target: "Title", type: "text", source: { kind: "library", id: "kit:text/land-in" } }] });
  assert.equal(put.status, 200, "the plan keeps the id as written");
  const a = await api("POST", `/api/projects/${id}/motion-plan/approve`);
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.deepEqual(a.json.retired, ["kit:text/land-in"]);
  assert.deepEqual(a.json.missing, [], "not counted as a missing item");
});

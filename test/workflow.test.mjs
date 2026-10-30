// The workflow and its pipelines: the pipeline (steps, prerequisites, done, skip, redo, the way), the server refusing to jump ahead, Import
// assets (copied by kind, sources/ and files over 20 MB out of git), the chat notes, the Story / Script documents, the Render verdict
// (only render-breaking checks stop it) and the Claude sign-in block (an empty Claude Code config folder = signed out, so the user's own
// sign-in is never touched).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const T = mkdtempSync(join(tmpdir(), "mw-workflow-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_NO_ASSET_INSTALL = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");          // signed out, in this test only
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
const { startServer, pipelineSteps } = await import("../packages/server/index.mjs");
const pipe = await import("../packages/pipeline/index.mjs");
const { renderVerdict } = await import("../packages/server/production.mjs");
const { classifyAsset } = await import("../packages/project-service/index.mjs");
const { findClaude } = await import("../packages/system-status/index.mjs");

let s;
const api = (method, path, body, headers = {}) => fetch(`http://127.0.0.1:${s.port}${path}`, {
  method, headers: { "X-MW-Token": "t0k", ...(body ? { "Content-Type": "application/json" } : {}), ...headers }, body: body && JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
/** fn()'s first truthy answer within `ms`, else its last (what the server does beside its thread, waited for). */
const settle = async (fn, ms = 10000) => { const t0 = Date.now(); let v = fn(); while (!v && Date.now() - t0 < ms) { await new Promise((r) => setTimeout(r, 100)); v = fn(); } return v; };
const upload =(id, name, bytes, role) => fetch(`http://127.0.0.1:${s.port}/api/projects/${id}/assets/upload`, {
  method: "POST", headers: { "X-MW-Token": "t0k", "X-File-Name": encodeURIComponent(name), "Content-Type": "application/octet-stream", ...(role ? { "X-Asset-Role": role } : {}) }, body: bytes,
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

before(async () => { s = await startServer({ token: "t0k" }); });
after(async () => { await s.close(); rmSync(T, { recursive: true, force: true }); });

// ---- the pipeline engine, on facts made by hand
const facts = (over = {}) => ({
  brief: { text: "Một phim ngắn", mode: "idea", at: 1000 }, assets: { count: 0, sources: 0, audioAt: null, videoAt: null },
  file: (p) => over.files?.[p] ?? null, storyboard: { real: false, hash: null, rawHash: null }, motionPlan: { exists: false, hash: null }, approvals: {},
  voice: { file: null, transcript: null, transcribing: false }, marks: {}, skips: {}, ran: {}, built: { ok: false, at: null }, qa: null, head: "h1", qaRunning: false,
  flags: { characters: false }, runningStep: null, claudeBusy: false, ...over,
});
const st = (state, id) => state.find((x) => x.id === id);

// ---- the pipeline: one pipeline for every style, 5 stages, two gates, the app runs the rest by itself
const BRIEFED = { files: { "BRIEF.md": { at: 1000 } }, marks: { brief: { at: new Date(1000).toISOString() } } };
const withFiles = (extra, over = {}) => ({ ...BRIEFED, ...over, files: { ...BRIEFED.files, ...extra } });
const IDS = ["brief", "storyboard", "motionSpec", "build", "qcReview", "sound", "checks", "finalMix"];

test("one pipeline for every style: the same steps in 5 stages; General has a prompt per way of working", () => {
  const cat = JSON.parse(readFileSync(join(import.meta.dirname, "..", "config", "styles.json"), "utf8"));
  for (const style of cat.styles) {
    const pipeline = pipelineSteps(style.id);          // its own, or its shared file (config/hf-pipeline.json)
    assert.deepEqual(pipeline.map((x) => x.id), IDS, style.id);
    assert.deepEqual(pipeline.map((x) => x.stage), [1, 2, 3, 4, 4, 4, 4, 5], `${style.id}: the Final Mix before the Feedback (owner 20/10, QC #138)`);
    assert.deepEqual(pipeline.filter((x) => x.gate).map((x) => x.id), ["storyboard", "motionSpec"], `${style.id}: two gates`);
    assert.match(pipeline[1].action.prompt, /one (storyboard )?option/, style.id);
    // no files and a brief that is enough: no question (an Explainer stopped only to ask "any files?"); one only for material the brief names
    assert.match(pipeline[0].action.prompt, /When I gave no files at all and the brief is enough, go on without asking.*Ask me once, in one short line, only when the brief names material it needs/, `${style.id}: QC #108, QC4-4`);
    assert.doesNotMatch(pipeline[0].action.prompt, /ask me once, in one short line, whether I have files/, style.id);
  }
  const general = pipelineSteps("general");
  assert.ok(general[1].action.prompts.keep && general[1].action.prompts.reference, "keep and reference have their own storyboard prompt");
  assert.deepEqual(pipelineSteps("no-such-style"), [], "a style the catalog does not have: no steps (its project opens with no style)");
  assert.equal(pipe.normalWay("relayout"), "free"); assert.equal(pipe.normalWay("remake"), "reference"); assert.equal(pipe.normalWay("keep"), "keep");
});

test("the autopilot's road: Prepare asks in the chat, the two gates stop, the QC review only on the first build, the checks quiet, Stop", () => {
  const steps = pipelineSteps("hf-explainer");
  let s0 = pipe.computePipeline(steps, facts());
  assert.equal(pipe.nextAuto(s0).id, "brief");
  // Claude ran Prepare and wrote no BRIEF.md: it asked something; yellow "answer in the chat", nothing runs
  s0 = pipe.computePipeline(steps, facts({ ran: { brief: { at: new Date(900).toISOString() } } }));
  assert.equal(st(s0, "brief").status, "needs-you");
  assert.equal(st(s0, "brief").reason.key, "Claude is asking: answer in the chat");
  assert.equal(pipe.stagesOf(s0, facts())[0].status, "waiting");
  assert.equal(pipe.nextAuto(s0), null);
  // the user answered in the chat and Claude wrote BRIEF.md there: Prepare is done, the storyboard is next
  s0 = pipe.computePipeline(steps, facts({ ran: { brief: { at: new Date(900).toISOString() } }, files: { "BRIEF.md": { at: 1200 } } }));
  assert.equal(st(s0, "brief").status, "done");
  assert.equal(pipe.nextAuto(s0).id, "storyboard");
  // the storyboard gate: written, not approved → the user; approved → the motion
  const sb = withFiles({}, { storyboard: { real: true, hash: "a", rawHash: "a" } });
  s0 = pipe.computePipeline(steps, facts(sb));
  assert.equal(st(s0, "storyboard").status, "needs-you");
  assert.equal(pipe.nextAuto(s0), null, "the gate stops the autopilot");
  assert.equal(pipe.stagesOf(s0, facts(sb))[1].status, "waiting");
  const approved = { ...sb, approvals: { storyboard: { at: new Date(3000).toISOString(), contentHash: "a", option: "B" } }, storyboardAt: 3000, storyboardPick: "B" };
  s0 = pipe.computePipeline(steps, facts(approved));
  assert.equal(pipe.nextAuto(s0).id, "motionSpec");
  assert.equal(pipe.stagesOf(s0, facts(approved))[1].line, "Storyboard {name} approved");
  // the motion gate, then the build
  const mp = { ...approved, motionPlan: { exists: true, hash: "m" } };
  assert.equal(pipe.nextAuto(pipe.computePipeline(steps, facts(mp))), null);
  const go = { ...mp, approvals: { ...approved.approvals, motionPlan: { at: new Date(4000).toISOString(), hash: "m" } } };
  assert.equal(pipe.nextAuto(pipe.computePipeline(steps, facts(go))).id, "build");
  // built: the QC review runs (first build)
  const built = { ...go, built: { ok: true, at: 5000 } };
  assert.equal(pipe.nextAuto(pipe.computePipeline(steps, facts(built))).id, "qcReview");
  // reviewed (even under 8: the user reads the score): the music and sound effects next (before the checks)
  const reviewed = { ...built, reviewedAt: 6000, review: { score: 7, at: 6000 } };
  s0 = pipe.computePipeline(steps, facts(reviewed));
  assert.equal(st(s0, "qcReview").status, "done");
  assert.equal(pipe.nextAuto(s0).id, "sound");
  // music and sound effects placed: the checks, the last of stage 4, a job, not listed while they pass; the stage is not done yet
  const sounded = { ...reviewed, marks: { ...reviewed.marks, sound: { at: new Date(7000).toISOString() } } };
  s0 = pipe.computePipeline(steps, facts(sounded));
  assert.equal(pipe.nextAuto(s0).id, "checks");
  assert.equal(st(s0, "checks").hiddenInList, true);
  assert.deepEqual(pipe.stagesOf(s0, facts(sounded)).slice(3).map((x) => x.status), ["todo", "todo"], "not done while the checks have not run (QC #136)");
  s0 = pipe.computePipeline(steps, facts({ ...sounded, qa: { at: new Date(8000).toISOString(), pass: false, blocking: 2, revision: "h1" } }));
  assert.equal(st(s0, "checks").status, "failed");
  assert.equal(st(s0, "checks").hiddenInList, false, "a failure shows");
  // the background checks never fail the stage; the problem is the row's line
  assert.equal(pipe.stagesOf(s0, facts(sounded))[3].status, "done");
  assert.equal(pipe.stagesOf(s0, facts(sounded))[3].line, "{n} problem(s) to fix before the render");
  assert.equal(pipe.nextAuto(s0), null);
  // checks pass: stage 4 is done; nothing runs (the Final Mix is optional); five rows, no Feedback row (the chat stays open)
  const delivered = { ...sounded, qa: { at: new Date(8000).toISOString(), pass: true, revision: "h1" } };
  s0 = pipe.computePipeline(steps, facts(delivered));
  assert.equal(pipe.nextAuto(s0), null);
  const stages = pipe.stagesOf(s0, facts(delivered));
  assert.deepEqual(stages.map((x) => x.id), ["prepare", "storyboard", "motion", "build", "finalMix"]);
  assert.deepEqual(stages.map((x) => x.status), ["done", "done", "done", "done", "todo"]);
  assert.equal(stages[3].line, "Review {score}/10");
  // the feedback loop changes the film: the stage stays done, the Final Mix still opens; the music stays and, the film handed
  // over, the background checks stay done (stale: they run again before a render), never "redo"
  const edited = { ...delivered, built: { ok: true, at: 9000 }, head: "h2", finished: true };
  s0 = pipe.computePipeline(steps, facts(edited));
  assert.deepEqual([st(s0, "sound").status, st(s0, "sound").stale], ["done", true]);
  assert.deepEqual([st(s0, "checks").status, st(s0, "checks").stale], ["done", true]);
  // a new build (not handed over yet): the checks run again by themselves, the music still stays
  const rebuilt = pipe.computePipeline(steps, facts({ ...edited, finished: false }));
  assert.equal(st(rebuilt, "sound").status, "done"); assert.equal(st(rebuilt, "checks").status, "redo");
  // while the Character step runs or waits, its row says so and opens the Character dialog; the cast is part of Prepare
  // and a wait for the user reads "Waiting for you: …"
  const castRow = (status) => pipe.stagesOf([{ id: "brief", stage: 1, status: "done" }, { id: "character", stage: 1, status }, { id: "storyboard", stage: 2, status: "blocked" }], {}).find((r) => r.id === "prepare");
  assert.deepEqual([castRow("needs-you").line, castRow("needs-you").open, castRow("needs-you").status], ["Waiting for you: approve the new characters", "character", "waiting"]);
  assert.equal(castRow("running").line, "Making the characters");
  assert.deepEqual([castRow("done").open, castRow("done").status], ["brief", "done"]);
  const waits = pipe.stagesOf([{ id: "brief", stage: 1, status: "done" }, { id: "storyboard", stage: 2, status: "needs-you" }, { id: "motionSpec", stage: 3, status: "blocked" }], {});
  assert.equal(waits[1].line, "Waiting for you: approve the storyboard");
  assert.equal(waits[1].lineVars.what, "approve the storyboard");
  assert.equal(pipe.stagesOf([{ id: "storyboard", stage: 2, status: "done" }, { id: "motionSpec", stage: 3, status: "needs-you" }], {})[2].line, "Waiting for you: Approve and build in the Motion Plan");
  // the Final Mix is the hand-over: ready to render once stage 4 ran to the end, the music said, no score
  const handed = pipe.stagesOf(pipe.computePipeline(steps, facts({ ...delivered, finished: true })), facts({ ...delivered, finished: true }));
  assert.deepEqual([handed[4].status, handed[4].line], ["done", "Ready to render"]);
  assert.equal(stages[4].line, "After the build", "before stage 4 ran to the end the music is made in Build and review: no \"Optional\" line");
  // a redo an earlier step's change asks for (canKeep) says which step changed, not "approve again" for a file that did not change
  const movedRow = (sb, mo) => pipe.stagesOf([{ id: "character", stage: 2, status: "done" }, { id: "storyboard", stage: 2, ...sb }, { id: "motionSpec", stage: 3, ...mo }], {});
  const mr = movedRow({ status: "redo", canKeep: true, reason: { vars: { step: "Storyboard" } } }, { status: "redo", canKeep: true, reason: { vars: { step: "Storyboard" } } });
  assert.deepEqual([mr[1].line, mr[1].lineVars.step, mr[2].line], ["“{step}” changed after you approved this", "Storyboard", "“{step}” changed after you approved this"]);
  assert.equal(movedRow({ status: "redo" }, { status: "done" })[1].line, "Changed since approval: approve again", "its own file changed");
  // the cast is approved once: Claude's later work on CHARACTERS.json keeps the approval
  const ani = pipelineSteps("anidoodle-storybook");
  const castFacts = facts({ ...BRIEFED, flags: { characters: true, humanHand: true }, ran: { character: { at: new Date(2000).toISOString() } },
    approvals: { characters: { at: new Date(3000).toISOString(), hash: "approved" } }, approvalFile: (name) => (name === "characters" ? { at: 4000, hash: "edited-by-claude" } : null) });
  assert.equal(st(pipe.computePipeline(ani, castFacts), "character").status, "done");
  // while Claude works in the chat, the stage that waits for the user says Claude is at work, not "Waiting for you"
  const busyRows = pipe.stagesOf([{ id: "storyboard", stage: 2, status: "needs-you" }, { id: "motionSpec", stage: 3, status: "blocked" }], { claudeBusy: true });
  assert.deepEqual([busyRows[1].status, busyRows[1].line], ["running", "Claude is working on it"]);
  assert.equal(pipe.stagesOf([{ id: "storyboard", stage: 2, status: "needs-you" }], {})[1].status, "waiting");
  // the background checks never fail the stage; a real problem is the row's line
  const qRow = pipe.stagesOf([{ id: "build", stage: 4, status: "done" }, { id: "qcReview", stage: 4, status: "done" }, { id: "checks", stage: 4, status: "failed", quiet: true }], { qa: { blocking: 1 } }).find((r) => r.id === "build");
  assert.deepEqual([qRow.status, qRow.line, qRow.lineVars.n], ["done", "{n} problem(s) to fix before the render", 1]);
  // a film whose source does not compile is not built: the Build step fails, its row says so, nothing after it runs
  const brokenFacts = facts({ ...edited, buildError: "anidoodle/acting.ts:95 Unexpected \"export\"" }), broken = pipe.computePipeline(steps, brokenFacts);
  assert.equal(st(broken, "build").status, "failed");
  assert.equal(pipe.stagesOf(broken, brokenFacts).find((r) => r.id === "build").line, "The film's code does not compile");
  assert.equal(pipe.blockedReason(s0, "finalMix"), null, "Three other tracks works after the music is placed");
  assert.equal(pipe.stagesOf(s0, facts(edited))[3].status, "done");
  // a newer storyboard approval: the QC review runs again on the next build
  s0 = pipe.computePipeline(steps, facts({ ...delivered, storyboardAt: 9000 }));
  assert.notEqual(st(s0, "qcReview").status, "done");
  // the user pressed Stop during the build: stopped, nothing runs until "continue"
  s0 = pipe.computePipeline(steps, facts({ ...go, lastTasks: { build: { status: "cancelled", at: "2026-10-19T10:00:00.000Z" } } }));
  assert.ok(st(s0, "build").stopped);
  assert.equal(pipe.stagesOf(s0, facts(go))[3].status, "stopped");
  assert.equal(pipe.nextAuto(s0), null);
});

test("approvals follow a later step's tuning; a new motion spec rebuilds and checks again, the music stays", () => {
  const steps = pipelineSteps("general");
  // HF's bookkeeping lines (frame src / status, sfx) do not change what the user approved
  assert.equal(pipe.storyboardHash("## Frame 2\n- scene: lá\n"), pipe.storyboardHash("## Frame 2\n- scene: lá\n- src: compositions/f2.html\n- status: animated\n"));
  assert.equal(pipe.storyboardHash("## Frame 1\n- duration: 3s\n"), pipe.storyboardHash("## Frame 1\n- duration: 3s\n- sfx: whoosh\n"));
  const meta = { approvals: { storyboard: { at: "2026-10-17T10:00:00.000Z", contentHash: "old" }, motionPlan: { at: "2026-10-17T10:05:00.000Z", hash: "p1" } } };
  const moved = pipe.followApprovals(meta, { storyboardText: "## Frame 1\n- scene: x\n", motionPlanHash: "p2", stepId: "build", taskId: "t1", order: steps.map((x) => x.id) });
  assert.deepEqual(moved, ["storyboard", "motionPlan"]);
  // a chat turn before the build (a timing moved) keeps both approvals, with a note of the change, never a new gate
  const before = { approvals: { storyboard: { at: "2026-10-17T10:00:00.000Z", contentHash: "old" }, motionPlan: { at: "2026-10-17T10:05:00.000Z", hash: "p1" } } };
  assert.deepEqual(pipe.followApprovals(before, { storyboardText: "## Frame 1\n- duration: 4s\n", motionPlanHash: "p3", stepId: "feedback", taskId: "c1", order: [...steps.map((x) => x.id), "feedback"], what: "dời câu chốt sang 8 s" }), ["storyboard", "motionPlan"]);
  assert.deepEqual(before.approvals.motionPlan.changes.map((c) => [c.step, c.what]), [["feedback", "dời câu chốt sang 8 s"]]);
  assert.equal(before.approvals.storyboard.at, "2026-10-17T10:00:00.000Z", "the approval itself stays");
  assert.equal(meta.approvals.motionPlan.adjusted.step, "build");
  // built and delivered; then the motion spec changed and was approved again: build redo, the autopilot rebuilds
  const base = withFiles({}, { storyboard: { real: true, hash: "a", rawHash: "a" }, approvals: { storyboard: { at: new Date(3000).toISOString(), contentHash: "a" },
    motionPlan: { at: new Date(9000).toISOString(), hash: "p2" } }, motionPlan: { exists: true, hash: "p2" }, built: { ok: true, at: 5000 }, reviewedAt: 6000, review: { score: 9, at: 6000 },
    qa: { at: new Date(7000).toISOString(), pass: true, revision: "h1" }, marks: { ...BRIEFED.marks, sound: { at: new Date(8000).toISOString() } } });
  const s0 = pipe.computePipeline(steps, facts(base));
  assert.equal(st(s0, "build").status, "redo");
  assert.equal(pipe.nextAuto(s0).id, "build");
});

test("the self-check as a score card: QC-REVIEW.json's rounds and seven scores; an older review gives the final score alone", () => {
  const d = join(T, "qc-card"); mkdirSync(d, { recursive: true });
  assert.equal(pipe.reviewCard(d), null);
  writeFileSync(join(d, "QC-REVIEW.md"), "# QC\n...\nFinal score: 8/10\n");
  assert.deepEqual(pipe.reviewCard(d).rounds, []);
  assert.equal(pipe.reviewCard(d).final, 8);
  writeFileSync(join(d, "QC-REVIEW.json"), JSON.stringify({ final: 8, rounds: [
    { round: 1, scores: { hook: 7, phone: 8, motion: "6,5", variety: 8, composition: 8, brand: 9, sync: 7 }, worst: [{ at: 3.2, text: "chữ đè logo" }, "nhịp chậm"], changed: "đẩy chữ lên" },
    { round: 2, scores: { hook: 8, phone: 9, motion: 8, variety: 8, composition: 9, brand: 9, sync: 8 }, worst: [], changed: "" }] }));
  const c = pipe.reviewCard(d);
  assert.equal(c.final, 8); assert.equal(c.pass, true);
  assert.deepEqual(c.criteria, ["hook", "phone", "motion", "variety", "composition", "brand", "sync"]);
  assert.equal(c.rounds.length, 2);
  assert.equal(c.rounds[0].scores.motion, 6.5); assert.equal(c.rounds[0].low, 6.5);
  assert.deepEqual(c.rounds[0].worst, [{ at: 3.2, text: "chữ đè logo" }, { at: null, text: "nhịp chậm" }]);
  assert.equal(c.rounds[1].low, 8);
});

test("Mixkit, the music step's site, needs no web permission when the project asks first; other sites still ask", async () => {
  const { musicSiteRequest } = await import("../packages/agent/index.mjs");
  assert.equal(musicSiteRequest("WebFetch", { url: "https://mixkit.co/free-stock-music/tag/corporate/" }), true);
  assert.equal(musicSiteRequest("WebFetch", { url: "https://assets.mixkit.co/music/123/123.mp3" }), true);
  assert.equal(musicSiteRequest("WebSearch", { query: "site:mixkit.co calm piano" }), true);
  assert.equal(musicSiteRequest("WebSearch", { query: "piano", allowed_domains: ["mixkit.co"] }), true);
  assert.equal(musicSiteRequest("WebFetch", { url: "https://notmixkit.co/x" }), false);
  assert.equal(musicSiteRequest("WebFetch", { url: "https://example.com/?u=mixkit.co" }), false);
  assert.equal(musicSiteRequest("WebSearch", { query: "mixkit music" }), false, "an open search still asks");
  assert.equal(musicSiteRequest("WebSearch", { query: "x", allowed_domains: ["mixkit.co", "example.com"] }), false);
});

test("Studio's element-id revisions are not work: a check stays valid and a build keeps its time", { timeout: 60000 }, async () => {
  const rev = await import("../packages/revisions/index.mjs");
  const d = join(T, "git-ids"); mkdirSync(join(d, "compositions"), { recursive: true });
  writeFileSync(join(d, "index.html"), "<div data-composition-id=\"r\"></div>"); writeFileSync(join(d, "compositions", "f1.html"), "<div>a</div>");
  rev.ensureRepo(d);
  const checked = rev.head(d);
  const built = rev.lastWorkChange(d, "compositions");
  await new Promise((r) => setTimeout(r, 1100));
  writeFileSync(join(d, "compositions", "f1.html"), "<div data-hf-id=\"x1\">a</div>"); rev.commitAll(d, rev.STUDIO_IDS);
  assert.equal(rev.changedSince(d, checked), false);
  assert.equal(rev.lastWorkChange(d, "compositions"), built);
  writeFileSync(join(d, "compositions", "f1.html"), "<div data-hf-id=\"x1\">b</div>"); rev.commitAll(d, "Hand edits in HyperFrames Studio");
  assert.equal(rev.changedSince(d, checked), true);
});

test("every style has a pipeline whose prerequisites name earlier steps", () => {
  const cat = JSON.parse(readFileSync(join(import.meta.dirname, "..", "config", "styles.json"), "utf8"));
  for (const style of cat.styles) {
    const pipeline = pipelineSteps(style.id);          // its own, or its shared file (config/hf-pipeline.json)
    assert.ok(pipeline.length >= 4, style.id);
    const seen = new Set();
    for (const step of pipeline) {
      for (const n of [...(step.needs ?? []), ...(step.after ?? [])]) assert.ok(seen.has(n), `${style.id}: ${step.id} needs ${n} before it`);
      assert.ok(["claude", "dialog", "job"].includes(step.action.kind), `${style.id}: ${step.id}`);
      assert.ok(!pipeline.some((x) => x.id === "export"), "no Export step: Render is the top bar's (D39)");
      seen.add(step.id);
    }
  }
});

test("Render verdict: script errors, missing files, remote URLs and fonts stop it; other findings are warnings", async () => {
  const v = renderVerdict({ gates: [
    { id: "G-HF-LINT", blocking: true, pass: false, findings: [{ code: "missing_local_asset", file: "a.html" }, { code: "unused_clip_class" }] },
    { id: "G-GLYPH", blocking: true, pass: false, findings: [{ family: "Inter" }] },
    { id: "G-BLANK", blocking: false, pass: false, findings: [{ composition: "x" }] },
    { id: "G-REMOTE", blocking: true, pass: true, findings: [] },
  ] });
  assert.equal(v.pass, false);
  assert.deepEqual(v.blocking.map((g) => g.id), ["G-HF-LINT", "G-GLYPH"]);
  assert.equal(v.blocking[0].findings.length, 1);
  assert.deepEqual(v.warnings.map((g) => g.id), ["G-HF-LINT", "G-BLANK"]);
  assert.equal(renderVerdict({ gates: [{ id: "G-HF-LINT", pass: false, findings: [{ code: "unused_clip_class" }] }] }).pass, true);
  // A script check that ran out of time is a warning, never a block (a report saved before the fix too); a real error still blocks
  const late = { code: "check_runtime_failure", message: "Check did not finish within its deadline." };
  const lv = renderVerdict({ gates: [{ id: "G-HF-SCRIPT", blocking: true, pass: false, findings: [late] }] });
  assert.equal(lv.pass, true); assert.equal(lv.warnings[0].findings[0].code, "check_timed_out");
  assert.equal(renderVerdict({ gates: [{ id: "G-HF-SCRIPT", blocking: false, pass: false, timedOut: true, findings: [{ severity: "warning", code: "check_timed_out", message: "x" }] }] }).pass, true);
  const both = renderVerdict({ gates: [{ id: "G-HF-SCRIPT", blocking: true, pass: false, findings: [{ code: "page_error", message: "TypeError" }, late] }] });
  assert.deepEqual([both.pass, both.blocking[0].findings.map((f) => f.code), both.warnings.length], [false, ["page_error"], 1]);
  // and the pipeline reads a saved report the same way: Build and review is not "Needs a fix" for it
  const qd = join(T, "qa-late"); mkdirSync(join(qd, ".moworks", "cache", "qa"), { recursive: true });
  writeFileSync(join(qd, ".moworks", "cache", "qa", "last.json"), JSON.stringify({ revision: "r1", checks: [{ id: "G-HF-SCRIPT", blocking: true, pass: false, findings: [late] }, { id: "G-FONT", blocking: true, pass: true }] }));
  assert.deepEqual(pipe.qaFacts({ revision: "r1", pass: false, blocking: 1 }, qd), { revision: "r1", pass: true, blocking: 0 });
  assert.deepEqual(pipe.qaFacts({ revision: "r0", pass: false, blocking: 1 }, qd), { revision: "r0", pass: false, blocking: 1 }, "another revision: as saved");
  // a render's check results go to .moworks/renders; an older one in renders/ moves there, a newer one already there wins
  const { gatesFile, moveOldGates } = await import("../packages/server/production.mjs");
  const rd = join(T, "renders-gates"); mkdirSync(join(rd, "renders"), { recursive: true });
  writeFileSync(join(rd, "renders", "phim.mp4"), "film"); writeFileSync(join(rd, "renders", "phim.mp4.gates.json"), "{\"old\":1}");
  assert.equal(gatesFile(rd, join(rd, "renders", "phim.mp4")), join(rd, ".moworks", "renders", "phim.mp4.gates.json"));
  assert.equal(moveOldGates(rd), 1);
  assert.deepEqual(readdirSync(join(rd, "renders")), ["phim.mp4"], "only the film is left");
  assert.equal(readFileSync(gatesFile(rd, "phim.mp4"), "utf8"), "{\"old\":1}");
  assert.equal(moveOldGates(rd), 0);
  // <YYMMDD>_<film>_<HHMM>; the seconds, then -2, when taken; never "(2)"; a stamped (either format) or "(2)" name is not stamped twice
  const { stampedName } = await import("../packages/server/production.mjs");
  const at = new Date(2026, 9, 25, 0, 31, 7), rr = join(rd, "renders");
  assert.equal(stampedName(rr, "mira-va-co-may-bat-mua", ".mp4", at), "261025_mira-va-co-may-bat-mua_0031.mp4");
  assert.equal(stampedName(rr, "Mira và cô máy bắt mưa", ".mp4", at), "261025_Mira và cô máy bắt mưa_0031.mp4");
  writeFileSync(join(rr, "261025_Mira_0031.mp4"), "");
  assert.equal(stampedName(rr, "Mira", ".mp4", at), "261025_Mira_003107.mp4");
  writeFileSync(join(rr, "261025_Mira_003107.mp4"), "");
  assert.equal(stampedName(rr, "Mira", ".mp4", at), "261025_Mira_003107-2.mp4");
  assert.equal(stampedName(rr, "Mira (2)", ".mov", at), "261025_Mira_0031.mov");
  assert.equal(stampedName(rr, "261024_Mira_2210", ".mov", at), "261025_Mira_0031.mov");
  assert.equal(stampedName(rr, "Mira_2026-10-24_2210", ".mov", at), "261025_Mira_0031.mov", "957d09df's format too");
  assert.equal(stampedName(join(rr, "ae"), "mira-va-co-may-bat-mua", "", at), "261025_mira-va-co-may-bat-mua_0031", "an AE export's folder");
});

test("asset folders: 1_design with images/ and fonts/, 2_footage with a folder per sequence, 3_audio sorted by name", () => {
  assert.deepEqual(classifyAsset("Logo trắng.PNG"), { area: "assets", folder: "1_design/images", kind: "image" });
  assert.equal(classifyAsset("ảnh 1.jpg").folder, "1_design/images", "one digit is a name, not a sequence");
  assert.equal(classifyAsset("frame_0001.png").folder, "2_footage/frame");
  assert.equal(classifyAsset("Intro 012.jpg").folder, "2_footage/Intro");
  assert.equal(classifyAsset("clip.MOV").folder, "2_footage");
  assert.equal(classifyAsset("vo.mp3").folder, "3_audio/voiceover");
  assert.equal(classifyAsset("Giọng đọc chính.wav").folder, "3_audio/voiceover");
  assert.equal(classifyAsset("whoosh 2.wav").folder, "3_audio/sfx");
  assert.equal(classifyAsset("nhạc nền.wav").folder, "3_audio/music");
  assert.equal(classifyAsset("x.mp3", "voiceover").folder, "3_audio/voiceover", "an old client's role still counts");
  assert.equal(classifyAsset("font.otf").folder, "1_design/fonts");
  for (const n of ["key visual.psd", "deck.pptx", "guideline.pdf", "logo.ai", "brief.docx"]) assert.equal(classifyAsset(n).folder, "1_design", n);
});

test("an older project is moved into the new folders when opened: files moved never deleted, every path follows, once", { timeout: 120000 }, async () => {
  const { getProject } = await import("../packages/project-service/index.mjs");
  const { migrateLayout, newPathOf } = await import("../packages/project-service/layout.mjs");
  const d = join(T, "old-layout");
  const put = (rel, text = "x") => { mkdirSync(join(d, ...rel.split("/").slice(0, -1)), { recursive: true }); writeFileSync(join(d, ...rel.split("/")), text); };
  put("index.html", `<!doctype html><html><head><style data-mw="font-local-brand">@font-face { font-family: "Brand"; src: url("assets/fonts/local/brand/Brand.ttf"); }</style>
<script src="assets/vendor/gsap.min.js"></script></head><body><div data-composition-id="root" data-width="1920" data-height="1080" data-duration="4" data-fps="30">
<audio id="el-music" src="assets/audio/nhac nền.mp3" data-start="0" data-duration="4" data-timeline-role="music"></audio>
<audio id="el-sfx-0" src="assets/sfx/pop.mp3" data-start="1" data-duration="0.4"></audio>
<div data-composition-id="f1" data-composition-src="compositions/f1.html" data-start="0" data-duration="4"></div></div></body></html>`);
  put("compositions/f1.html", `<div data-composition-id="f1"><img src="../assets/images/logo.png"><img src="assets/1_images/logos/Logo%20tr%E1%BA%AFng.png">
<script>const frame = (i) => "assets/2_footage/sequences/intro/intro_" + String(i).padStart(4, "0") + ".png";</script>
<style>@font-face { font-family: "Kit"; src: url("assets/fonts/kit/Inter.woff2"); }</style></div>`);
  for (const f of ["assets/vendor/gsap.min.js", "assets/fonts/local/brand/Brand.ttf", "assets/fonts/kit/Inter.woff2", "assets/fonts/google/be-vietnam-pro/vi.woff2",
    "assets/audio/nhac nền.mp3", "assets/sfx/pop.mp3", "assets/images/logo.png", "assets/1_images/logos/Logo trắng.png", "assets/voiceover/vo.wav",
    "assets/2_footage/sequences/intro/intro_0001.png", "assets/2_footage/sequences/intro/intro_0002.png", "assets/video/clip.mp4", "assets/4_fonts/Client.otf",
    "assets/5_design/guide.pdf", "sources/deck.pptx", "assets/psd/key/layout.json", "assets/loose.svg", "assets/notes.txt"]) put(f, f);
  put("assets/1_design/images/logo.png", "already here");          // a name taken at the destination
  put("beats/assets/audio/nhac nền.mp3.json", "{}");
  put(".moworks/project.json", JSON.stringify({ title: "Cũ", music: { file: "assets/audio/nhac nền.mp3", beats: "beats/assets/audio/nhac nền.mp3.json" } }));
  put("ASSETS.md", "- sources/deck.pptx: the deck\n");
  const o = await api("POST", "/api/projects/open", { path: d });
  assert.equal(o.status, 200, JSON.stringify(o.json));
  const p = getProject(o.json.id);
  assert.equal(p.meta.layout, 3); assert.deepEqual(p.meta.layoutMove.failed, []);
  const has = (rel) => existsSync(join(d, ...rel.split("/")));
  for (const rel of ["assets/_app/vendor/gsap.min.js", "assets/_app/fonts/kit/Inter.woff2", "assets/_app/fonts/google/be-vietnam-pro/vi.woff2", "assets/_app/psd/key/layout.json",
    "assets/1_design/fonts/brand/Brand.ttf", "assets/1_design/fonts/Client.otf", "assets/1_design/guide.pdf", "assets/1_design/deck.pptx",
    "assets/1_design/images/logo (2).png", "assets/1_design/images/Logo trắng.png", "assets/1_design/images/loose.svg",
    "assets/2_footage/intro/intro_0001.png", "assets/2_footage/clip.mp4",
    "assets/3_audio/music/nhac nền.mp3", "assets/3_audio/sfx/pop.mp3", "assets/3_audio/voiceover/vo.wav", "beats/assets/3_audio/music/nhac nền.mp3.json"]) assert.ok(has(rel), rel);
  assert.equal(readFileSync(join(d, "assets", "1_design", "images", "logo.png"), "utf8"), "already here", "nothing overwritten");
  assert.ok(has("assets/notes.txt"), "a file of no known kind stays where it was");
  for (const old of ["assets/vendor", "assets/fonts", "assets/audio", "assets/sfx", "assets/images", "assets/1_images", "assets/4_fonts", "assets/5_design", "sources", "assets/2_footage/sequences"]) assert.ok(!has(old), `${old} emptied and gone`);
  const index = readFileSync(join(d, "index.html"), "utf8"), f1 = readFileSync(join(d, "compositions", "f1.html"), "utf8");
  assert.match(index, /src="assets\/_app\/vendor\/gsap\.min\.js"/);
  assert.match(index, /url\("assets\/1_design\/fonts\/brand\/Brand\.ttf"\)/);
  assert.match(index, /src="assets\/3_audio\/music\/nhac nền\.mp3"/); assert.match(index, /src="assets\/3_audio\/sfx\/pop\.mp3"/);
  assert.match(f1, /src="\.\.\/assets\/1_design\/images\/logo \(2\)\.png"/);
  assert.match(f1, /src="assets\/1_design\/images\/Logo%20tr%E1%BA%AFng\.png"/, "an encoded path follows too");
  assert.match(f1, /"assets\/2_footage\/intro\/intro_"/, "a sequence loaded by name: its folder's path follows");
  assert.match(f1, /url\("assets\/_app\/fonts\/kit\/Inter\.woff2"\)/);
  assert.equal(p.meta.music.file, "assets/3_audio/music/nhac nền.mp3"); assert.equal(p.meta.music.beats, "beats/assets/3_audio/music/nhac nền.mp3.json");
  // the app's documents into docs/ (layout 3), their paths followed first
  assert.ok(!has("ASSETS.md"));
  assert.match(readFileSync(join(d, "docs", "ASSETS.md"), "utf8"), /assets\/1_design\/deck\.pptx/);
  // committed once; the design files stay out of git, the pictures and fonts are in
  const tracked = execFileSync("git", ["-C", d, "ls-files"], { encoding: "utf8", windowsHide: true });
  assert.match(tracked, /assets\/1_design\/images\/loose\.svg/); assert.match(tracked, /assets\/1_design\/fonts\/Client\.otf/);
  assert.doesNotMatch(tracked, /deck\.pptx|guide\.pdf/);
  // again: nothing to do
  assert.deepEqual(migrateLayout(d, { classify: classifyAsset }).moved, []);
  // one loose file straight in assets/: its own path follows, never every path under assets/
  const d2 = join(T, "old-layout-loose");
  mkdirSync(join(d2, "assets", "_app", "vendor"), { recursive: true });
  writeFileSync(join(d2, "assets", "_app", "vendor", "gsap.min.js"), "g"); writeFileSync(join(d2, "assets", "nen.mp3"), "m");
  writeFileSync(join(d2, "index.html"), '<script src="assets/_app/vendor/gsap.min.js"></script><audio src="assets/nen.mp3"></audio>');
  migrateLayout(d2, { classify: classifyAsset });
  assert.equal(readFileSync(join(d2, "index.html"), "utf8"), '<script src="assets/_app/vendor/gsap.min.js"></script><audio src="assets/3_audio/music/nen.mp3"></audio>');
  assert.equal(newPathOf("assets/3_audio/sfx/pop.mp3", { classify: classifyAsset }), null);
  // the Assets tab's groups, in the user's order
  const g = (await api("GET", `/api/projects/${o.json.id}/assets`)).json;
  assert.deepEqual(g.groups.map((x) => x.id), ["images", "footage", "design", "fonts", "audio"]);
  assert.deepEqual(g.groups[4].children.map((x) => x.id), ["voiceover", "sfx", "music"]);
  const grp = (path) => g.items.find((x) => x.path === path)?.group;
  assert.equal(grp("assets/1_design/images/loose.svg"), "images"); assert.equal(grp("assets/2_footage/clip.mp4"), "footage");
  assert.equal(grp("assets/1_design/deck.pptx"), "design"); assert.equal(grp("assets/1_design/fonts/Client.otf"), "fonts");
  assert.equal(grp("assets/3_audio/voiceover/vo.wav"), "voiceover"); assert.equal(grp("assets/3_audio/sfx/pop.mp3"), "sfx"); assert.equal(grp("assets/3_audio/music/nhac nền.mp3"), "music");
  assert.ok(!g.items.some((x) => x.path.includes("_app/vendor")), "the app's own copies are not listed");
});

let proj;
test("a project: the New project answers, the pipeline and its stages from the server, a step refused until its prerequisites are done, skip, documents, the way", { timeout: 120000 }, async () => {
  const c = await api("POST", "/api/projects", { title: "Demo quy trình", brief: "Giới thiệu trà xanh, giọng nhẹ nhàng", aspect: "16:9", durationSec: 30, styleId: "general",
    answers: { junk: "x" }, design: { id: "frame/cartesian", title: "Cartesian" }, settings: { mode: "plan", web: "on" } });
  assert.equal(c.status, 200, JSON.stringify(c.json));
  proj = c.json;
  assert.equal(proj.meta.look.id, "frame/cartesian", "the design is kept under look");
  assert.deepEqual(proj.meta.brief.answers, {}, "an answer the app does not know is dropped");
  const g = await api("GET", `/api/projects/${proj.id}/pipeline`);
  assert.equal(g.status, 200);
  assert.equal(g.json.appBusy, null, "QC #225: nothing of the app's own at work between steps");
  // a task Exit stopped is offered again on the next start; a task stopped by the user's own Stop is not
  assert.equal(g.json.interrupted, null);
  const tf = join(proj.path, ".moworks", "tasks.json");
  const keepTasks = existsSync(tf) ? readFileSync(tf, "utf8") : null;
  const stopped = (by) => ({ id: "aaaaaaaaaaaa", projectId: proj.id, createdAt: "2099-01-01T00:00:00.000Z", status: "cancelled", text: "Make the shrug bigger", scope: { kind: "project" }, step: null, events: [], ...(by ? { interrupted: { by, at: "2099-01-01T00:01:00.000Z" } } : {}) });
  writeFileSync(tf, JSON.stringify({ tasks: [stopped("exit")] }));
  assert.deepEqual((await api("GET", `/api/projects/${proj.id}/pipeline`)).json.interrupted, { taskId: "aaaaaaaaaaaa", text: "Make the shrug bigger", step: null, scope: { kind: "project" }, at: "2099-01-01T00:01:00.000Z" });
  writeFileSync(tf, JSON.stringify({ tasks: [stopped(null)] }));
  assert.equal((await api("GET", `/api/projects/${proj.id}/pipeline`)).json.interrupted, null);
  assert.equal((await api("POST", `/api/projects/${proj.id}/tasks/aaaaaaaaaaaa/again`)).status, 400, "only an interrupted task runs again");
  if (keepTasks != null) writeFileSync(tf, keepTasks); else rmSync(tf, { force: true });
  assert.equal(g.json.firstStep, "brief");
  assert.deepEqual(g.json.stages.map((x) => x.id), ["prepare", "storyboard", "motion", "build", "finalMix"]);
  assert.equal(g.json.finished, null); assert.equal(g.json.qc, null);
  assert.equal(g.json.autopilot.next, "brief");
  assert.deepEqual(g.json.render, { running: null, queued: 0 });
  assert.equal(g.json.steps.find((x) => x.id === "storyboard").status, "blocked");
  assert.equal(g.json.vars.words, 75);
  // jumping ahead: refused by the server with STEP_BLOCKED (no Claude is started)
  const r = await api("POST", `/api/projects/${proj.id}/pipeline/build/run`, {});
  assert.equal(r.status, 409); assert.equal(r.json.error.code, "STEP_BLOCKED");
  const ap = await api("POST", `/api/projects/${proj.id}/storyboard/approve`);
  assert.equal(ap.status, 409, "the starter storyboard cannot be approved before its prerequisites");
  assert.equal((await api("POST", `/api/projects/${proj.id}/boards/more`)).status, 409, "no more options before the preparation");
  // skip and unskip (only skippable steps)
  assert.equal((await api("POST", `/api/projects/${proj.id}/pipeline/storyboard/skip`)).status, 400);
  assert.equal((await api("POST", `/api/projects/${proj.id}/pipeline/sound/skip`)).json.status, "skipped");
  assert.notEqual((await api("POST", `/api/projects/${proj.id}/pipeline/sound/unskip`)).json.status, "skipped");
  // BRIEF.md written by hand and confirmed: the storyboard opens, and is what the autopilot runs next
  assert.equal((await api("PUT", `/api/projects/${proj.id}/doc`, { path: "../x.md", text: "no" })).status, 400);
  assert.equal((await api("PUT", `/api/projects/${proj.id}/doc`, { path: "BRIEF.md", text: "# Brief\nThis film tells tea lovers that green tea is calm." })).status, 200);
  assert.match((await api("GET", `/api/projects/${proj.id}/doc?path=BRIEF.md`)).json.text, /green tea/);
  assert.equal((await api("POST", `/api/projects/${proj.id}/pipeline/brief/confirm`)).status, 200);
  const g2 = await api("GET", `/api/projects/${proj.id}/pipeline`);
  assert.equal(g2.json.steps.find((x) => x.id === "brief").status, "done");
  assert.equal(g2.json.steps.find((x) => x.id === "storyboard").status, "ready");
  assert.equal(g2.json.autopilot.next, "storyboard");
  assert.equal(g2.json.stages[0].status, "done");
  // a list of documents: the first that exists
  assert.equal((await api("PUT", `/api/projects/${proj.id}/doc`, { path: "design.md", text: "Concept: calm." })).status, 200);
  assert.equal((await api("GET", `/api/projects/${proj.id}/doc?path=frame.md,design.md,DESIGN.md`)).json.path, "frame.md", "the Look chosen (Cartesian) was written as frame.md (audit 57)");
  assert.equal((await api("GET", `/api/projects/${proj.id}/doc?path=design.md,DESIGN.md`)).json.path, "design.md");
  // the ways of working: free, keep, reference; Claude's proposal and the way settled in ASSETS.md
  assert.equal((await api("PATCH", `/api/projects/${proj.id}/way`, { way: "sideways" })).status, 400);
  assert.equal((await api("PATCH", `/api/projects/${proj.id}/way`, { way: "remake" })).status, 400, "remake 1:1 is gone");
  assert.equal((await api("PUT", `/api/projects/${proj.id}/doc`, { path: "ASSETS.md", text: "# Assets\nProposed way: `reference` — a video sets the pace.\nWay: reference" })).status, 200);
  const an = await api("GET", `/api/projects/${proj.id}/analysis`);
  assert.equal(an.json.proposed, "reference"); assert.deepEqual(an.json.ways, ["free", "keep", "reference"]);
  assert.equal(pipe.chosenWay(proj.path), "reference");
  assert.equal((await api("PATCH", `/api/projects/${proj.id}/way`, { way: "keep" })).json.way.id, "keep");
  // the brief's answers: only the ones the app knows (the film's kind)
  assert.deepEqual((await api("PATCH", `/api/projects/${proj.id}/brief`, { answers: { junk: "x" } })).json.answers, {});
});

test("every way of working: the storyboard step's own prompt, and the approval works", { timeout: 120000 }, async () => {
  const { stepPrompt } = await import("../packages/server/autopilot.mjs");
  const sbStep = pipelineSteps("general").find((x) => x.id === "storyboard");
  assert.match(stepPrompt(sbStep, { way: "keep" }, {}), /Rebuild my frames/);
  assert.match(stepPrompt(sbStep, { way: "reference" }, {}), /STYLE-GUIDE\.md/);
  assert.match(stepPrompt(sbStep, { way: "free" }, {}), /one storyboard option/);
  const sb = readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8");
  for (const way of ["keep", "reference"]) {
    assert.equal((await api("PATCH", `/api/projects/${proj.id}/way`, { way })).json.way.id, way);
    writeFileSync(join(proj.path, "STORYBOARD.md"), sb + `\n<!-- ${way} -->\n`);          // what the storyboard step's Claude task leaves
    const before = (await api("GET", `/api/projects/${proj.id}/pipeline`)).json;
    assert.equal(before.steps.find((x) => x.id === "storyboard").status, way === "keep" ? "needs-you" : "redo", "new frames wait for the owner (the second time: changed since approval)");
    assert.equal(before.autopilot.next, null, "the gate stops the autopilot");
    const ap = await api("POST", `/api/projects/${proj.id}/storyboard/approve`);
    assert.equal(ap.status, 200, JSON.stringify(ap.json));
    const after = (await api("GET", `/api/projects/${proj.id}/pipeline`)).json;
    assert.equal(after.steps.find((x) => x.id === "storyboard").status, "done");
    assert.equal(after.steps.find((x) => x.id === "motionSpec").status, "ready", "the motion spec opens after the approval");
  }
  // the approval wrote its line in the chat (the autopilot then tried the motion; Claude is signed out in this test, so nothing ran)
  await new Promise((r) => setTimeout(r, 300));
  const notes = (await api("GET", `/api/projects/${proj.id}/tasks`)).json.notes;
  assert.ok(notes.some((n) => n.kind === "pipeline" && /Storyboard .*approved/.test(n.text)), JSON.stringify(notes.slice(-3)));
});

test("every style that New project shows makes a project whose pipeline starts with the Brief", { timeout: 300000 }, async () => {
  const shown = (await api("GET", "/api/styles")).json.styles.filter((x) => !x.hidden && x.available);
  assert.ok(shown.length >= 8, shown.map((x) => x.id).join());
  for (const style of shown) {
    const c = await api("POST", "/api/projects", { title: `Style ${style.id}`, styleId: style.id, aspect: style.aspects[0], durationSec: 20, brief: "Thử" });
    assert.equal(c.status, 200, `${style.id}: ${JSON.stringify(c.json)}`);
    const g = await api("GET", `/api/projects/${c.json.id}/pipeline`);
    assert.equal(g.json.firstStep, "brief", style.id);
    const ids = g.json.steps.map((x) => x.id);
    for (const id of ["brief", "storyboard", "motionSpec", "build", "qcReview", "checks"]) assert.ok(ids.includes(id), `${style.id} has ${id}`);
    assert.ok(!ids.some((x) => ["story", "script", "characters", "review", "assets", "design", "frames", "audio"].includes(x)), `${style.id}: no old steps`);
  }
});

test("the film's frame rate: chosen in New project (24, 25, 30, 60; 30 by default), stored and written on the root composition", { timeout: 120000 }, async () => {
  const { rootFps, projectFps } = await import("../packages/project-service/index.mjs");
  const make = (title, fps) => api("POST", "/api/projects", { title, styleId: "general", aspect: "16:9", durationSec: 20, brief: "Thử", ...(fps != null ? { fps } : {}) });
  const p60 = await make("Fps sáu mươi", 60);
  assert.equal(p60.status, 200, JSON.stringify(p60.json));
  assert.equal(p60.json.meta.format.fps, 60);
  assert.equal(rootFps(p60.json.path), 60, "HF's player and render read data-fps on the root");
  assert.match(readFileSync(join(p60.json.path, "index.html"), "utf8"), /data-composition-id="[^"]*"[^>]*data-fps="60"/);
  const p30 = await make("Fps mặc định");
  assert.equal(p30.json.meta.format.fps, 30);
  assert.equal(rootFps(p30.json.path), 30);
  // 24 · 25 · 30 · 60 for every style
  assert.equal((await make("Fps hai lăm", 25)).json.meta.format.fps, 25);
  const bad = await make("Fps sai", 50);
  assert.equal(bad.status, 400); assert.equal(bad.json.error.message, "Frame rate: 24, 25, 30 or 60");
  // an imported film keeps its own rate
  const ext = join(T, "imported-24");
  cpSync(p60.json.path, ext, { recursive: true });
  rmSync(join(ext, ".moworks", "project.json"), { force: true });
  writeFileSync(join(ext, "index.html"), readFileSync(join(ext, "index.html"), "utf8").replace('data-fps="60"', 'data-fps="24"'));
  const opened = await api("POST", "/api/projects/open", { path: ext });
  assert.equal(opened.status, 200, JSON.stringify(opened.json));
  assert.equal(opened.json.meta.format.fps, 24);
  assert.equal(projectFps({ meta: {}, path: ext }), 24);
});


test("the user's tracks on the timeline: a voice and a music track in the root composition, Studio's changes kept when placed again", async () => {
  const { placeTrack } = await import("../packages/hf-edit/tracks.mjs");
  const d = join(T, "tracks"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), `<html><body><div id="root" data-composition-id="main" data-width="1920"><div class="scene"></div></div></body></html>`);
  placeTrack(d, { kind: "music", src: "assets/audio/nhac.mp3", duration: 61.23456 });
  placeTrack(d, { kind: "voice", src: "assets/voiceover/vo.mp3", duration: 30 });
  let html = readFileSync(join(d, "index.html"), "utf8");
  assert.match(html, /<audio id="el-music" src="assets\/audio\/nhac.mp3" data-start="0" data-duration="61.235" data-track-index="11" data-volume="0.6" data-timeline-role="music" data-fade-out="5" data-mw-track="61.235" data-mw-fit="61.235 5"><\/audio>/);          // the music fades out at its end (the ending's fade, hf-edit/ending.mjs)
  assert.match(html, /id="el-voice"[^>]*data-timeline-role="voiceover"/);
  assert.equal(html.match(/<!-- mw:tracks -->/g).length, 1, "one block");
  // Studio moved the music and set its volume: placing the same file again keeps that; a new file starts over
  writeFileSync(join(d, "index.html"), html.replace('data-start="0" data-duration="61.235" data-track-index="11" data-volume="0.6"', 'data-start="2" data-duration="61.235" data-track-index="11" data-volume="0.3" data-hf-id="m1"'));
  placeTrack(d, { kind: "music", src: "assets/audio/nhac.mp3", duration: 61.2 });
  html = readFileSync(join(d, "index.html"), "utf8");
  assert.match(html, /id="el-music"[^>]*data-start="2"[^>]*data-duration="61.2"[^>]*data-volume="0.3"/);
  placeTrack(d, { kind: "music", src: "assets/audio/other.mp3", duration: 10 });
  html = readFileSync(join(d, "index.html"), "utf8");
  assert.match(html, /id="el-music" src="assets\/audio\/other.mp3" data-start="0"[^>]*data-hf-id="m1"/);
  assert.equal(html.match(/id="el-music"/g).length, 1);
  assert.throws(() => placeTrack(d, { kind: "sfx", src: "x.mp3", duration: 1 }), /voice or a music/);
});

test("Import assets: copied by kind, names kept (a taken name gets a number), design files and files over 20 MB stay out of git, Claude is told", { timeout: 120000 }, async () => {
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a3ee0000000049454e44ae426082", "hex");
  const a = await upload(proj.id, "Logo trắng.png", png);
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.equal(a.json.file.path, "assets/1_design/images/Logo trắng.png");
  const b = await upload(proj.id, "Logo trắng.png", png);
  assert.equal(b.json.file.path, "assets/1_design/images/Logo trắng (2).png");
  const pdf = await upload(proj.id, "guideline.pdf", Buffer.from("%PDF-1.4\n%%EOF\n"));
  assert.equal(pdf.json.file.path, "assets/1_design/guideline.pdf");
  const big = await upload(proj.id, "footage.mp4", Buffer.alloc(21 * 1024 * 1024, 1));
  assert.equal(big.json.file.path, "assets/2_footage/footage.mp4");
  const tracked = execFileSync("git", ["ls-files"], { cwd: proj.path, encoding: "utf8", windowsHide: true });
  assert.match(tracked, /assets\/1_design\/images\/Logo/);
  assert.doesNotMatch(tracked, /guideline\.pdf|footage\.mp4/, "design files and files over 20 MB are not in the history");
  assert.ok(existsSync(join(proj.path, "assets", "1_design", "guideline.pdf")) && existsSync(join(proj.path, "assets", "2_footage", "footage.mp4")), "but they are in the folder");
  assert.match(readFileSync(join(proj.path, ".gitignore"), "utf8"), /over 20 MB[\s\S]*\/assets\/2_footage\/footage\.mp4/);
  const t = await api("GET", `/api/projects/${proj.id}/tasks`);
  const note = t.json.notes.at(-1);
  assert.equal(note.kind, "assets");
  assert.equal(note.files.length, 4, "one chat line for the batch");
  const inp = await api("GET", `/api/projects/${proj.id}/inputs`);
  assert.equal(inp.json.inventory.sources.length, 1, "1_design files are reference files, like sources/");
  assert.equal(inp.json.inventory.assets["1_design/images"].length, 2);
});

test("Import assets: a zip is unpacked and its files go in by kind; one that cannot be opened stays and says so (T25)", { timeout: 120000, skip: !existsSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")) && "no tar.exe" }, async () => {
  const { storedZip } = await import("./support/zip.mjs");
  // a project of its own: the archive's font would join the next test's list of fonts
  const own = await api("POST", "/api/projects", { title: "Lưu trữ", brief: "Thử", aspect: "16:9", durationSec: 20, styleId: "general" });
  assert.equal(own.status, 200, JSON.stringify(own.json));
  const proj = own.json;
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a3ee0000000049454e44ae426082", "hex");
  const z = storedZip([{ name: "Brand pack/logo dot.png", data: png }, { name: "Brand pack/fonts/Bebas Neue.ttf", data: "ttf" }, { name: "Brand pack/Minimal logo.psd", data: "8BPS" },
    { name: "Brand pack/setup.exe", data: "MZ" }, { name: "__MACOSX/Brand pack/._logo dot.png", data: "x" }]);
  const a = await upload(proj.id, "elements-minimal-logo.zip", z);
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.equal(a.json.archive.unpacked, true);
  assert.deepEqual(a.json.archive.files.map((f) => f.path).sort(), ["assets/1_design/Minimal logo.psd", "assets/1_design/fonts/Bebas Neue.ttf", "assets/1_design/images/logo dot.png"]);
  assert.deepEqual(a.json.archive.skipped, ["setup.exe"], "a program is left out, and said");
  assert.ok(!existsSync(join(proj.path, "assets", "1_design", "elements-minimal-logo.zip")), "the archive's own copy goes once its files are in");
  assert.equal(readFileSync(join(proj.path, "assets", "1_design", "images", "logo dot.png")).length, png.length);
  const tracked = execFileSync("git", ["ls-files"], { cwd: proj.path, encoding: "utf8", windowsHide: true });
  assert.match(tracked, /assets\/1_design\/images\/logo dot\.png/);
  assert.doesNotMatch(tracked, /Minimal logo\.psd/, "a design file from the archive stays out of git, as any import");
  const note = (await api("GET", `/api/projects/${proj.id}/tasks`)).json.notes.at(-1);
  assert.ok(["assets/1_design/images/logo dot.png", "assets/1_design/Minimal logo.psd"].every((f) => note.files.includes(f)), "Claude is told the archive's files");
  // the same name again: the same naming rules (a number)
  assert.ok((await upload(proj.id, "again.zip", storedZip([{ name: "logo dot.png", data: png }]))).json.archive.files[0].path.endsWith("logo dot (2).png"));
  // an archive tar cannot read stays as it came, and the result says so in plain words (no path)
  const bad = await upload(proj.id, "Font Bebas Nue.rar", Buffer.from("no archive here"));
  assert.equal(bad.status, 200);
  assert.deepEqual([bad.json.archive.unpacked, bad.json.archive.error], [false, "Could not open Font Bebas Nue.rar; unpack it and add the files."]);
  assert.equal(bad.json.file.path, "assets/1_design/Font Bebas Nue.rar");
  assert.ok(existsSync(join(proj.path, "assets", "1_design", "Font Bebas Nue.rar")));
  // zip-slip: refused, nothing outside the project
  const slip = await upload(proj.id, "slip.zip", storedZip([{ name: "../../evil.txt", data: "evil" }]));
  assert.match(slip.json.archive.error, /^Did not open slip\.zip: it has files that point outside it/);
  assert.ok(!existsSync(join(proj.path, "..", "evil.txt")) && !existsSync(join(proj.path, "evil.txt")));
});

/** A short silent WAV (16-bit mono, 8 kHz) that ffprobe reads. */
const silentWav = (sec) => {
  const n = Math.round(8000 * sec) * 2, b = Buffer.alloc(44 + n);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n, 40);
  return b;
};

test("sounds from the Assets tab: Move to by folder key, each on its lane at the drop time, taken off without losing the file", { timeout: 120000 }, async () => {
  const dir = proj.path;
  const { soundTakenOff } = await import("../packages/server/assets.mjs");
  const { getProject } = await import("../packages/project-service/index.mjs");
  const { mount, readState } = await import("../packages/sfx/index.mjs");
  for (const [f, s] of [["assets/3_audio/sfx/pop.wav", 0.4], ["assets/3_audio/music/whoosh.wav", 0.6], ["assets/3_audio/music/nen.wav", 2]]) {
    mkdirSync(join(dir, ...f.split("/").slice(0, -1)), { recursive: true }); writeFileSync(join(dir, ...f.split("/")), silentWav(s));
  }
  // "Move to: Sound effects" sends the folder's key: it lands in assets/3_audio/sfx
  const mv = await api("POST", `/api/projects/${proj.id}/assets/move`, { path: "assets/3_audio/music/whoosh.wav", folder: "sfx" });
  assert.equal(mv.status, 200, JSON.stringify(mv.json));
  assert.equal(mv.json.path, "assets/3_audio/sfx/whoosh.wav");
  // a sound effect goes on its own clip at the drop time, with HF's attributes; a second one gets its own id and track
  const a = await api("POST", `/api/projects/${proj.id}/assets/timeline`, { path: "assets/3_audio/sfx/pop.wav", start: 2.5 });
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.equal(a.json.lane, "sfx"); assert.equal(a.json.clip.id, "el-clip-1");
  const b = await api("POST", `/api/projects/${proj.id}/assets/timeline`, { path: "assets/3_audio/sfx/whoosh.wav" });
  assert.equal(b.json.clip.id, "el-clip-2"); assert.equal(b.json.clip["data-start"], "0");
  let html = readFileSync(join(dir, "index.html"), "utf8");
  assert.match(html, /<audio id="el-clip-1" src="assets\/3_audio\/sfx\/pop\.wav" data-start="2\.5" data-duration="0\.4" data-track-index="41" data-volume="0\.8" data-timeline-role="sfx"><\/audio>/);
  assert.match(html, /<audio id="el-clip-2" [^>]*data-track-index="42"/, "its own track");
  // music goes on the Music lane at the drop time, as the film's music
  const m = await api("POST", `/api/projects/${proj.id}/assets/timeline`, { path: "assets/3_audio/music/nen.wav", start: 1 });
  assert.equal(m.json.lane, "music", JSON.stringify(m.json));
  html = readFileSync(join(dir, "index.html"), "utf8");
  assert.match(html, /<audio id="el-music" src="assets\/3_audio\/music\/nen\.wav" data-start="1"[^>]*data-timeline-role="music"/);
  const items = (await api("GET", `/api/projects/${proj.id}/assets`)).json.items;
  assert.equal(items.find((x) => x.path === "assets/3_audio/sfx/pop.wav").onTimeline, true, "a placed sound effect is on the timeline");
  // taken off (the Editor removes the element with HF's own source mutation): the music stops being the film's, the file stays
  assert.equal(getProject(proj.id).meta.music.file, "assets/3_audio/music/nen.wav");
  const off = soundTakenOff(getProject(proj.id), { id: "el-music", src: "assets/3_audio/music/nen.wav" });
  assert.equal(off.music, true);
  assert.equal(getProject(proj.id).meta.music, undefined);
  assert.ok(existsSync(join(dir, "assets", "3_audio", "music", "nen.wav")));
  // one of the app's own sound effects taken off stays off when the cues are placed again
  writeFileSync(join(dir, ".moworks", "sfx.json"), JSON.stringify({ sounds: { pop: { file: "assets/3_audio/sfx/pop.wav", durationS: 0.4 } } }));
  const cues = [{ name: "pop", start: 3, offset: 0 }, { name: "pop", start: 6, offset: 0 }];
  assert.equal(mount(dir, cues).length, 2);
  assert.deepEqual(soundTakenOff(getProject(proj.id), { id: "el-sfx-0", src: "assets/3_audio/sfx/pop.wav" }).muted, { name: "pop", start: 3 });
  assert.deepEqual(mount(dir, cues).map((x) => x.start), [6]);
  assert.equal(readState(dir).muted.length, 1);
  mount(dir, []);
});

test("the Assets tab: list, missing and new files from Explorer, relink, move, delete to the trash, the copy tool for Claude", { timeout: 120000 }, async () => {
  const dir = proj.path;
  let g = await api("GET", `/api/projects/${proj.id}/assets`);
  assert.equal(g.status, 200);
  const logo = g.json.items.find((x) => x.path === "assets/1_design/images/Logo trắng.png");
  assert.equal(logo.kind, "image"); assert.equal(logo.status, "ok");
  assert.equal(g.json.items.find((x) => x.path === "assets/1_design/guideline.pdf").kind, "design");
  // a composition uses the logo; the user renames it in Explorer: missing, with what uses it; the renamed file shows as new
  mkdirSync(join(dir, "compositions"), { recursive: true });
  writeFileSync(join(dir, "compositions", "logo-test.html"), `<div data-composition-id="lt"><img src="../assets/1_design/images/Logo trắng.png"></div>`);
  writeFileSync(join(dir, "assets", "1_design", "images", "Logo mới.png"), readFileSync(join(dir, "assets", "1_design", "images", "Logo trắng (2).png")));
  renameSync(join(dir, "assets", "1_design", "images", "Logo trắng.png"), join(dir, "assets", "1_design", "images", "Logo đổi tên.png"));
  g = await api("GET", `/api/projects/${proj.id}/assets`);
  const missing = g.json.items.find((x) => x.status === "missing");
  assert.equal(missing?.path, "assets/1_design/images/Logo trắng.png", JSON.stringify(g.json.items.map((x) => [x.path, x.status])));
  assert.deepEqual(missing.usedIn, ["compositions/logo-test.html"], "not a shot of the storyboard: the file is named");
  assert.equal(g.json.items.find((x) => x.path.endsWith("Logo đổi tên.png")).status, "new");
  assert.equal((await api("GET", `/api/projects/${proj.id}/assets`)).json.items.find((x) => x.path.endsWith("Logo đổi tên.png")).status, "ok", "new only once");
  // relink: the film points to the renamed file
  const rl = await api("POST", `/api/projects/${proj.id}/assets/relink`, { from: "assets/1_design/images/Logo trắng.png", to: "assets/1_design/images/Logo đổi tên.png" });
  assert.equal(rl.status, 200, JSON.stringify(rl.json));
  assert.match(readFileSync(join(dir, "compositions", "logo-test.html"), "utf8"), /Logo đổi tên\.png/);
  assert.ok(!(await api("GET", `/api/projects/${proj.id}/assets`)).json.items.some((x) => x.status === "missing"));
  // move: the film's path follows
  const mv = await api("POST", `/api/projects/${proj.id}/assets/move`, { path: "assets/1_design/images/Logo đổi tên.png", folder: "assets/1_design" });
  assert.equal(mv.json.path, "assets/1_design/Logo đổi tên.png", JSON.stringify(mv.json));
  assert.match(readFileSync(join(dir, "compositions", "logo-test.html"), "utf8"), /1_design\/Logo đổi tên\.png/);
  // delete: refused while the film uses it; otherwise to the trash (never for good)
  const del = await api("POST", `/api/projects/${proj.id}/assets/delete`, { path: "assets/1_design/Logo đổi tên.png" });
  assert.equal(del.status, 409); assert.equal(del.json.error.code, "IN_USE");
  assert.equal((await api("POST", `/api/projects/${proj.id}/assets/delete`, { path: "assets/1_design/images/Logo mới.png" })).status, 200);
  assert.ok(!existsSync(join(dir, "assets", "1_design", "images", "Logo mới.png")));
  assert.ok(readdirSync(join(dir, ".moworks", "trash")).some((n) => n.endsWith("Logo mới.png")));
  assert.equal((await api("POST", `/api/projects/${proj.id}/assets/delete`, { path: "../x" })).status, 400);
  rmSync(join(dir, "compositions", "logo-test.html"));
  // the fonts the app embeds are one row per family, marked as the app's, not dozens of subset files
  mkdirSync(join(dir, "assets", "fonts", "google", "be-vietnam-pro"), { recursive: true });
  for (const n of ["latin-a.woff2", "latin-ext-b.woff2", "vietnamese-c.woff2"]) writeFileSync(join(dir, "assets", "fonts", "google", "be-vietnam-pro", n), "x");
  const fonts = (await api("GET", `/api/projects/${proj.id}/assets`)).json.items.filter((x) => x.kind === "font");
  assert.deepEqual(fonts.filter((x) => x.path.includes("/google/")).map((x) => [x.name, x.files, x.app]), [["Be Vietnam Pro", 3, true]]);
  assert.ok(fonts.every((x) => x.app && x.files >= 1), "the bundled kit fonts are grouped too");
  // the newest draft's stills show (it holds every option), as the user's rounds: Round 1 = the first set, Round 2 =
  // the two "Make two more options" added; Claude's other drafts stay on disk, counted, never numbered as rounds
  for (const [id, info, letters] of [["R1", { by: "claude", taskId: "t1" }, "AB"], ["R2", { by: "claude", taskId: "t1" }, "AB"], ["R3", { by: "claude", taskId: "t2" }, "ABCD"], ["R4", { by: "owner" }, "ABCD"]]) {
    for (const o of letters) mkdirSync(join(dir, "boards", "rounds", id, o, "stills"), { recursive: true });
    writeFileSync(join(dir, "boards", "rounds", id, "round.json"), JSON.stringify({ at: new Date().toISOString(), ...info, hashes: {}, ...(id === "R4" ? { picked: { option: "C" } } : {}) }));
  }
  const bd = (await api("GET", `/api/projects/${proj.id}/boards`)).json;
  assert.deepEqual(bd.rounds.map((x) => [x.id, x.no, x.options.map((o) => o.option).join("")]), [["R4", 1, "AB"], ["R4", 2, "CD"]]);
  assert.deepEqual(bd.rounds.map((x) => x.picked?.option ?? null), [null, "C"], "the pick shows on its own round");
  assert.equal(bd.drafts, 3);
  assert.ok(["free", "keep", "reference"].includes(bd.way)); assert.equal(bd.frames, bd.way === "keep", "keep: the owner's own frames, no options");
  // a newer draft without the pick (taken after the approval) still shows the user's pick, so the Motion dialog finds its stills
  mkdirSync(join(dir, "boards", "rounds", "R5", "C", "stills"), { recursive: true });
  for (const o of "ABD") mkdirSync(join(dir, "boards", "rounds", "R5", o, "stills"), { recursive: true });
  writeFileSync(join(dir, "boards", "rounds", "R5", "round.json"), JSON.stringify({ at: new Date().toISOString(), by: "owner", hashes: {} }));
  assert.deepEqual((await api("GET", `/api/projects/${proj.id}/boards`)).json.rounds.map((x) => x.picked?.option ?? null), [null, "C"]);
  // and once the storyboard is approved, opening the dialog takes no new stills while each option's STORYBOARD.md is the one of its stills
  for (const o of "ABCD") {
    mkdirSync(join(dir, "boards", o), { recursive: true });
    writeFileSync(join(dir, "boards", o, "STORYBOARD.md"), `# Option ${o}\n\n## Frame 1 — x\n`); writeFileSync(join(dir, "boards", o, "index.html"), `<div>${o} as the app left it</div>`);
    writeFileSync(join(dir, "boards", "rounds", "R5", o, "STORYBOARD.md"), `# Option ${o}\n\n## Frame 1 — x\n`); writeFileSync(join(dir, "boards", "rounds", "R5", o, "stills", "frame-00-at-0.5s.png"), "png");
  }
  const { updateMeta: um } = await import("../packages/project-service/index.mjs");
  um(proj.id, (m) => { (m.approvals ??= {}).storyboard ??= { at: new Date().toISOString(), option: "C" }; });
  const again = await api("POST", `/api/projects/${proj.id}/boards/stills`, {});
  assert.equal(again.json.unchanged, true, JSON.stringify(again.json).slice(0, 200));
  assert.ok(!existsSync(join(dir, "boards", "rounds", "R6")), "no new draft");
  // while Claude works on the film, opening the dialog takes nothing (Claude takes its own, the app takes them when it ends)
  writeFileSync(join(dir, "boards", "C", "STORYBOARD.md"), "# Option C\n\n## Frame 1 — changed by Claude\n");
  s.agent.running.set(proj.id, "aaaaaaaaaaaa");
  try {
    const busy = await api("POST", `/api/projects/${proj.id}/boards/stills`, {});
    assert.equal(busy.json.busy, true); assert.equal(busy.json.job, null);
    assert.ok(!existsSync(join(dir, "boards", "rounds", "R6")), "no draft while Claude works");
  } finally { s.agent.running.delete(proj.id); }
  // posters: a shot with no built poster shows its approved storyboard still (the shot list, the timeline, the Motion dialog)
  um(proj.id, (m) => { m.approvals.storyboard.option = "C"; });
  const ps = (await api("GET", `/api/projects/${proj.id}/posters`)).json;
  assert.equal(ps.from, "boards", JSON.stringify(ps).slice(0, 200)); assert.match(ps.posters[0].url, /\/boards\/rounds\/R5\/C\/stills\/frame-00-at-0\.5s\.png$/);
  for (const o of "ABCD") rmSync(join(dir, "boards", o), { recursive: true, force: true });
  // the placeholder title card of a new project is not a storyboard shot
  const fresh = await api("POST", "/api/projects", { title: "Mới tinh", brief: "Thử", aspect: "16:9", durationSec: 20, styleId: "general" });
  const sh = (await api("GET", `/api/projects/${fresh.json.id}/shots`)).json;
  assert.equal(sh.starter, true); assert.deepEqual(sh.shots, []); assert.equal(sh.placeholder.length, 1);
  // the chosen Look is written to frame.md by the app when the project is made (a copy of the preset's FRAME.md)
  const { lookFrame } = await import("../packages/looks-library/index.mjs");
  const lk = await api("POST", "/api/projects", { title: "Có Look", brief: "Thử", aspect: "16:9", durationSec: 20, styleId: "general", look: { id: "frame/coral" } });
  const lkp = (await api("GET", `/api/projects/${lk.json.id}`)).json;
  const want = lookFrame("frame/coral");
  assert.ok(want?.text, "the HF frame preset is readable");
  assert.equal(readFileSync(join(lkp.path, "frame.md"), "utf8"), want.text);
  assert.ok(lkp.meta.look.frame?.at);
  assert.equal(lkp.meta.look.title, want.title, "New project sends { id } alone: the title comes from the Look");
  assert.match(lkp.meta.look.hash, /^[0-9a-f]{16}$/);
  assert.equal((await api("POST", "/api/projects", { title: "Tự do", brief: "Thử", aspect: "16:9", durationSec: 20, styleId: "general", look: null })).status, 200, "look: null is Free");
  assert.ok(!existsSync(join((await api("GET", `/api/projects/${fresh.json.id}`)).json.path, "frame.md")), "no Look (free): no frame.md");
  // the server checks the combination: a style whose catalog turns design off takes none, whatever the dialog sent:
  // every style but General and the seven HF type styles follows its author's design
  const ss = await api("POST", "/api/projects", { title: "Trình chiếu", brief: "Thử", aspect: "16:9", durationSec: 20, styleId: "slideshow",
    look: { id: "frame/coral" } });
  const ssp = (await api("GET", `/api/projects/${ss.json.id}`)).json;
  assert.equal(ssp.meta.look ?? null, null);
  assert.equal(ssp.meta.designLocked, true); assert.ok(!existsSync(join(ssp.path, "frame.md")));
  // ... but the Brand Kit chosen there is kept, not dropped: Prepare asks how to use it (T25)
  assert.deepEqual([ssp.meta.brandKitAsk?.id, ssp.meta.brandKitAsk?.title, ssp.meta.brandKitAsk?.file], ["frame/coral", want.title, ".moworks/brand-kit/FRAME.md"]);
  assert.equal(readFileSync(join(ssp.path, ".moworks", "brand-kit", "FRAME.md"), "utf8"), want.text.replace(/\s*$/, "\n"));
  const { rootFps, setRootFps, keepRootFps, getProject, projectFps } = await import("../packages/project-service/index.mjs");
  // a style's own rates: a Brush cartoon film is 24, 25 or 30 fps (24 by default), never 50 / 60, here and whenever the root is written again
  const brushAt = async (fps) => (await api("GET", `/api/projects/${(await api("POST", "/api/projects", { title: `Brush ${fps}`, brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "brush-cartoon", ...(fps ? { fps } : {}) })).json.id}`)).json;
  const b60 = await brushAt(60);
  assert.equal(b60.meta.format.fps, 30, "60 → the nearest it allows"); assert.equal(rootFps(b60.path), 30);
  assert.equal((await brushAt(25)).meta.format.fps, 25); assert.equal((await brushAt(null)).meta.format.fps, 24, "none → its default");
  setRootFps(b60.path, 60);          // Claude rewrote the root at 60
  assert.equal(keepRootFps(getProject(b60.id)), 30); assert.equal(rootFps(b60.path), 30);
  assert.equal((await brushAt(null)).meta.format.fpsRule.default, 24);
  assert.equal(projectFps({ meta: { style: { id: "brush-cartoon" }, format: { fps: 60 } } }), 30, "a Brush film made before the rule: the style's rule still holds");
  assert.equal(projectFps({ meta: { style: { id: "general" }, format: { fps: 60 } } }), 60, "a style without a rule keeps its rate");
  // The header of a Brush film made before the rule read 60: every reader of the project now sees the style's rate
  const { updateMeta } = await import("../packages/project-service/index.mjs");
  updateMeta(b60.id, (m) => { m.format.fps = 60; delete m.format.fpsRule; });
  assert.equal(getProject(b60.id).meta.format.fps, 30);
  assert.equal((await api("GET", `/api/projects/${b60.id}`)).json.meta.format.fps, 30);
  // Length as an After Effects timecode H:MM:SS:FF (at the film's fps), or seconds as before
  const tc = await api("POST", "/api/projects", { title: "Timecode", brief: "Thử", aspect: "16:9", durationSec: "0:00:12:15", fps: 30, styleId: "slideshow" });
  assert.equal(tc.json.meta.targetDurationSec, 12.5);
  assert.equal((await api("POST", "/api/projects", { title: "Quá dài", brief: "Thử", aspect: "16:9", durationSec: "1:00:00:01", styleId: "slideshow" })).status, 400, "over 60:00");
  assert.equal((await api("POST", "/api/projects/folder", { title: "X", durationSec: "1:00:00:01" })).json.ok, false);
  assert.equal((await api("PATCH", `/api/projects/${tc.json.id}/brief`, { durationSec: "0:00:20:12", text: "Thử" })).status, 200);
  assert.equal((await api("GET", `/api/projects/${tc.json.id}`)).json.meta.targetDurationSec, 20.4);
  // the brief's output chosen over the New project fields (Claude's project_format, after the user chose): the project's format, rate
  // and length change, the root follows
  const { setOutputFormat } = await import("../packages/project-service/index.mjs");
  const fm = (await api("POST", "/api/projects", { title: "Khổ dọc", brief: "Phim 16:9, 60 fps", aspect: "9:16", durationSec: 20, fps: 30, styleId: "general" })).json;
  assert.deepEqual(setOutputFormat(fm.id, { aspect: "16:9", fps: 60, durationSec: "0:30", by: "claude" }).changed, ["aspect", "fps", "durationSec"]);
  const fmp = (await api("GET", `/api/projects/${fm.id}`)).json;
  assert.deepEqual([fmp.meta.format.aspect, fmp.meta.format.width, fmp.meta.format.height, fmp.meta.format.fps, fmp.meta.targetDurationSec], ["16:9", 1920, 1080, 60, 30]);
  assert.equal(rootFps(fmp.path), 60); assert.match(readFileSync(join(fmp.path, "index.html"), "utf8"), /data-width="1920"[^>]*data-height="1080"|data-height="1080"[^>]*data-width="1920"/);
  assert.equal(fmp.meta.formatChanges.at(-1).from.aspect, "9:16");
  assert.throws(() => setOutputFormat(fm.id, { fps: 50, by: "claude" }), { code: "INVALID" }, "a rate the style does not allow");
  assert.throws(() => setOutputFormat(b60.id, { fps: 60, by: "claude" }), { code: "INVALID" }, "Brush: never 60");
  assert.deepEqual(setOutputFormat(fm.id, { fps: 60, by: "claude" }).changed, [], "nothing to change");
  rmSync(join(dir, "boards", "rounds"), { recursive: true, force: true });
  // Claude's copy tool: a picture already in the project into assets/, sorted by the app or into the folder it names
  mkdirSync(join(dir, ".moworks", "scan", "deck"), { recursive: true });
  writeFileSync(join(dir, ".moworks", "scan", "deck", "image3.png"), readFileSync(join(dir, "assets", "1_design", "images", "Logo trắng (2).png")));
  const { assetRoutes } = await import("../packages/server/assets.mjs");
  const { tools } = assetRoutes({ root: dir, renders: { isRendering: () => false } }, { r: () => null, P: "", mustProject: () => null, HttpError: Error });
  const project = { path: dir, id: proj.id };
  assert.match(await tools.copy_to_assets({ project, args: { from: ".moworks/scan/deck/image3.png" } }), /Copied to assets\/1_design\/images\/image3\.png/);
  assert.match(await tools.copy_to_assets({ project, args: { from: ".moworks/scan/deck/image3.png", folder: "assets/1_design/images/pptx" } }), /assets\/1_design\/images\/pptx\/image3\.png/);
  assert.match(await tools.copy_to_assets({ project, args: { from: "../../etc/x" } }), /not a file of this project/);
});

test("named versions, opened again; the brief changed after the film was built asks what follows; a new storyboard rewrites the motion", { timeout: 120000 }, async () => {
  const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
  const { updateMeta } = await import("../packages/project-service/index.mjs");
  const ap = createAutopilot({ root: undefined, agent: { running: new Map() }, renders: createRenderQueue() });
  const dir = proj.path;
  writeFileSync(join(dir, "index.html"), "<div data-composition-id=\"root\">bản 1</div>");
  const v1 = await ap.saveVersion(proj.id, "build");          // git beside the server's thread (T22-5)
  assert.equal(v1.name, "Build 1"); assert.equal(v1.key, "Build {n}");
  assert.equal((await ap.saveVersion(proj.id, "build")).id, v1.id, "nothing changed: the same version");
  writeFileSync(join(dir, "index.html"), "<div data-composition-id=\"root\">bản 2</div>");
  writeFileSync(join(dir, "added-later.md"), "x");
  const v2 = await ap.saveVersion(proj.id, "edit");
  assert.equal(v2.name, "Edit 1");
  let list = (await api("GET", `/api/projects/${proj.id}/versions`)).json.versions;
  assert.deepEqual(list.slice(0, 2).map((x) => x.name), ["Edit 1", "Build 1"], "newest first");
  const open = await api("POST", `/api/projects/${proj.id}/versions/${encodeURIComponent(v1.id)}/restore`);
  assert.equal(open.status, 200, JSON.stringify(open.json));
  assert.match(readFileSync(join(dir, "index.html"), "utf8"), /bản 1/);
  assert.ok(!existsSync(join(dir, "added-later.md")), "a file added since is gone with the version");
  list = (await api("GET", `/api/projects/${proj.id}/versions`)).json.versions;
  assert.equal(list[0].kind, "before-redo", "the one in use was saved first: nothing is lost");
  assert.equal((await api("POST", `/api/projects/${proj.id}/versions/nope/restore`)).status, 404);
  // "DUYỆT STORYBOARD" with an option picked: its storyboard becomes the film's, no Claude turn needed
  const optionC = readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8") + "\n<!-- option C -->\n";
  mkdirSync(join(dir, "boards", "C"), { recursive: true });
  writeFileSync(join(dir, "boards", "C", "STORYBOARD.md"), optionC);
  assert.equal((await api("POST", `/api/projects/${proj.id}/storyboard/approve`, { option: "D" })).status, 404, "an option with no storyboard");
  const apC = await api("POST", `/api/projects/${proj.id}/storyboard/approve`, { option: "C" });
  assert.equal(apC.status, 200, JSON.stringify(apC.json));
  assert.equal(readFileSync(join(dir, "STORYBOARD.md"), "utf8"), optionC);
  assert.equal(apC.json.meta.approvals.storyboard.option, "C");
  // round + option: B of round R1 is R1's B, even after round R2 changed B; it goes back to boards/B for the motion step
  const sbB = (tag) => readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8") + `\n<!-- option B ${tag} -->\n`;
  for (const [rid, tag] of [["R1", "round 1"], ["R2", "round 2"]]) {
    mkdirSync(join(dir, "boards", "rounds", rid, "B"), { recursive: true });
    writeFileSync(join(dir, "boards", "rounds", rid, "B", "STORYBOARD.md"), sbB(tag)); writeFileSync(join(dir, "boards", "rounds", rid, "B", "index.html"), `<div>${tag}</div>`);
    writeFileSync(join(dir, "boards", "rounds", rid, "round.json"), JSON.stringify({ at: new Date().toISOString(), by: "owner", hashes: {} }));
  }
  mkdirSync(join(dir, "boards", "B"), { recursive: true }); writeFileSync(join(dir, "boards", "B", "STORYBOARD.md"), sbB("round 2"));
  assert.equal((await api("POST", `/api/projects/${proj.id}/storyboard/approve`, { round: "R9", option: "B" })).status, 404, "no such round");
  const apB = await api("POST", `/api/projects/${proj.id}/storyboard/approve`, { round: "R1", option: "B" });
  assert.equal(apB.status, 200, JSON.stringify(apB.json));
  assert.equal(apB.json.meta.approvals.storyboard.round, 1, "stored as the owner's round, not the draft (QC #187)");
  assert.equal(readFileSync(join(dir, "STORYBOARD.md"), "utf8"), sbB("round 1"));
  assert.equal(readFileSync(join(dir, "boards", "B", "index.html"), "utf8"), "<div>round 1</div>");
  rmSync(join(dir, "boards", "rounds"), { recursive: true, force: true });
  // the brief changed after the film was delivered: the pipeline asks, the user chooses
  updateMeta(proj.id, (m) => { (m.pipeline ??= {}).delivered = { at: new Date().toISOString() }; });
  await api("PATCH", `/api/projects/${proj.id}/brief`, { text: "Trà xanh, thêm câu về hương vị" });
  assert.equal((await api("GET", `/api/projects/${proj.id}/pipeline`)).json.question?.kind, "brief-changed");
  assert.equal((await api("POST", `/api/projects/${proj.id}/brief/after-change`, { choice: "sideways" })).status, 400);
  assert.equal((await api("POST", `/api/projects/${proj.id}/brief/after-change`, { choice: "keep" })).status, 200);
  assert.equal((await api("GET", `/api/projects/${proj.id}/pipeline`)).json.question, null);
  updateMeta(proj.id, (m) => { delete m.pipeline.delivered; });
  // a storyboard approved after the motion: Claude rewrites the motion of the shots that changed (once), then the user approves
  const steps = pipelineSteps("hf-explainer");
  const f = facts({ ...BRIEFED, storyboard: { real: true, hash: "b", rawHash: "b" }, motionPlan: { exists: true, hash: "m" },
    approvals: { storyboard: { at: new Date(9000).toISOString(), contentHash: "b" }, motionPlan: { at: new Date(4000).toISOString(), hash: "m" } } });
  const s0 = pipe.computePipeline(steps, f);
  assert.equal(st(s0, "motionSpec").status, "redo"); assert.ok(st(s0, "motionSpec").canKeep);
  assert.equal(pipe.nextAuto(s0).id, "motionSpec");
  // the motion file changed since its approval (Claude rewrote it): the user's turn, not Claude's again
  const s1 = pipe.computePipeline(steps, { ...f, motionPlan: { exists: true, hash: "m2" } });
  assert.equal(st(s1, "motionSpec").status, "redo"); assert.ok(!st(s1, "motionSpec").canKeep);
  assert.equal(pipe.nextAuto(s1), null);
  // The step after says where to act, and offers keeping only when the row has "Keep it as it is"
  assert.equal(st(s0, "build").reason.key, "“{step}” needs a look first: redo it, or press “Keep it as it is” on its row in the Pipeline");
  assert.equal(st(s1, "build").reason.key, "Redo “{step}” first: its row in the Pipeline says why and runs it again");
  assert.equal(st(s1, "build").reason.vars.step, st(s1, "motionSpec").title);
  // A storyboard changed since its approval waits for the user: no Build or Review runs on from Continue
  const s2 = pipe.computePipeline(steps, { ...f, storyboard: { real: true, hash: "c", rawHash: "c" } });
  assert.equal(st(s2, "storyboard").status, "redo");
  assert.equal(pipe.nextAuto(s2), null);
});


test("signed out: no Claude task, no New project that starts one; the chip says so", { timeout: 60000, skip: !findClaude() && "Claude Code is not on this computer" }, async () => {
  const st0 = await api("GET", "/api/claude/status?refresh=1");
  assert.equal(st0.json.installed, true);
  assert.equal(st0.json.loggedIn, false);
  const t = await api("POST", `/api/projects/${proj.id}/tasks`, { text: "Viết kịch bản", scope: { kind: "project" } });
  assert.equal(t.status, 412); assert.equal(t.json.error.code, "CLAUDE_SIGNED_OUT");
  const step = await api("POST", `/api/projects/${proj.id}/pipeline/motionSpec/run`, {});
  assert.equal(step.status, 412);
  const before = (await api("GET", "/api/projects")).json.projects.length;
  const c = await api("POST", "/api/projects", { title: "Không tạo", aspect: "16:9", durationSec: 30, styleId: "general", kickoff: true });
  assert.equal(c.status, 412);
  // a wrong request is answered for what it is, at once, before the sign-in check (no wait on Claude Code for an empty name)
  const t0 = Date.now();
  const noName = await api("POST", "/api/projects", { title: "  ", aspect: "16:9", durationSec: 30, styleId: "general", kickoff: true });
  assert.equal(noName.status, 400); assert.equal(noName.json.error.message, "Project name is required");
  assert.ok(Date.now() - t0 < 1500, `answered in ${Date.now() - t0} ms`);
  assert.equal((await api("POST", "/api/projects", { title: "X", aspect: "16:9", styleId: "nope", kickoff: true })).json.error.code, "INVALID");
  assert.equal((await api("GET", "/api/projects")).json.projects.length, before, "nothing was made");
  assert.equal((await api("GET", `/api/projects/${proj.id}/tasks`)).json.tasks.length, 0, "no task was recorded");
  const code = await api("POST", "/api/claude/login/code", { code: "abc" });
  assert.equal(code.status, 400, "a code only goes to a running sign-in");
});

test("the window's X is Exit: the service stops when the last window has been gone for the grace time, not on a reload", { timeout: 30000 }, async () => {
  let gone = 0;
  const t2 = await startServer({ token: "t1", onWindowGone: () => { gone++; }, windowGraceMs: 600 });
  const hold = () => { const c = new AbortController(); const r = fetch(`http://127.0.0.1:${t2.port}/api/app/presence`, { headers: { "X-MW-Token": "t1" }, signal: c.signal })
    .then(async (x) => { const rd = x.body.getReader(); for (;;) { const { done } = await rd.read(); if (done) break; } }).catch(() => {}); return c; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let w = hold(); await wait(300);
  w.abort(); await wait(200); w = hold(); await wait(900);          // a reload: gone for 200 ms, back within the grace
  assert.equal(gone, 0, "a reload does not stop the app");
  w.abort(); await wait(1200);
  assert.equal(gone, 1, "the last window gone for the grace time stops the app");
  const r = await fetch(`http://127.0.0.1:${t2.port}/api/app`, { headers: { "X-MW-Token": "t1" } }).then((x) => x.json());
  assert.ok(Array.isArray(r.running));
  await t2.close();
});

test("save location and Google Drive: any folder, Settings default, a Drive project keeps its history on this PC, import keeps the folder in place", { timeout: 120000 }, async () => {
  const drive = join(T, "GoogleDriveLike"); mkdirSync(drive, { recursive: true });
  process.env.MW_DRIVE_PATHS = drive; process.env.MW_DATA_DIR = join(T, "data"); process.env.MW_PICK_FOLDER = drive;
  try {
    const loc0 = await api("GET", "/api/storage/location");
    process.env.MW_NO_OPEN = "1";          // opens the folder; nothing opens on the test machine
    assert.deepEqual((await api("POST", "/api/storage/location/open")).json, { ok: true });
    assert.match(loc0.json.location, /projects$/);
    assert.equal((await api("PATCH", "/api/storage/location", { path: join(T, "nope") })).status, 404);
    assert.equal((await api("PATCH", "/api/storage/location", { path: drive })).json.drive, true);
    assert.equal((await api("POST", "/api/dialog/folder", { title: "x" })).json.path, drive);
    // created in the default location (now the Drive-like folder): a .git FILE points at the history under data/project-git
    const c = await api("POST", "/api/projects", { title: "demo drive", aspect: "16:9", durationSec: 15, styleId: "general" });
    assert.equal(c.status, 200, JSON.stringify(c.json));
    assert.ok(c.json.path.startsWith(drive));
    const g = readFileSync(join(c.json.path, ".git"), "utf8");
    assert.match(g, /^gitdir: .*project-git[\/]demo-drive-[0-9a-f]{8}\.git/m);
    assert.ok(execFileSync("git", ["log", "--oneline"], { cwd: c.json.path, encoding: "utf8", windowsHide: true }).includes("Project start"));
    // an explicit location wins over the default
    const other = join(T, "elsewhere-projects"); mkdirSync(other, { recursive: true });
    const c2 = await api("POST", "/api/projects", { title: "demo local", aspect: "16:9", durationSec: 15, styleId: "general", location: other });
    assert.ok(c2.json.path.startsWith(other)); assert.ok(statSync(join(c2.json.path, ".git")).isDirectory(), "off Drive: a normal .git folder");
    // import a Drive project that has its own .git folder: it stays in place; the history moves only when asked
    const imp = join(drive, "imported"); cpSync(join(import.meta.dirname, "golden", "hf-native-final"), imp, { recursive: true });
    execFileSync("git", ["init", "-q"], { cwd: imp, windowsHide: true }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "own"], { cwd: imp, windowsHide: true });
    const o = await api("POST", "/api/projects/open", { path: imp });
    assert.equal(o.json.path, imp); assert.equal(o.json.gitOnDrive, true);
    assert.ok(statSync(join(imp, ".git")).isDirectory(), "nothing moved without the owner's OK");
    const m = await api("POST", `/api/projects/${o.json.id}/move-git`);
    assert.equal(m.status, 200, JSON.stringify(m.json));
    assert.ok(statSync(join(imp, ".git")).isFile());
    assert.match(execFileSync("git", ["log", "--oneline"], { cwd: imp, encoding: "utf8", windowsHide: true }), /own/);
  } finally { delete process.env.MW_DRIVE_PATHS; delete process.env.MW_PICK_FOLDER; await api("PATCH", "/api/storage/location", { path: join(T, "work", "projects") }); }
});

test("still frames the storyboard mounted are not a Build: built only once the Build step ran, every frame is animated, or files changed after the motion spec was approved", () => {
  const d = join(T, "built-facts"); mkdirSync(join(d, "compositions"), { recursive: true });
  writeFileSync(join(d, "compositions", "f1.html"), "<div>a</div>");
  const frame = (status) => ({ index: 1, number: 1, title: "A", status, scene: "x", start: 0, duration: 3, src: "compositions/f1.html" });
  const facts = (status, meta = {}, opts = {}) => pipe.gatherFacts({ path: d, meta }, { shots: [frame(status), { ...frame(status), index: 2, number: 2, scene: "y" }].map((x) => ({ ...x })), ...opts });
  assert.equal(facts("built").built.ok, false, "stills only: not built");
  assert.equal(facts("outline", { pipeline: { ran: { build: { at: new Date().toISOString() } } } }).built.ok, true, "the Build step ran");
  assert.equal(facts("animated").built.ok, true, "HF's own status: animated");
  const approvedBefore = { approvals: { motionPlan: { at: new Date(Date.now() - 60000).toISOString() } } };
  assert.equal(facts("built", approvedBefore).built.ok, true, "files newer than the motion spec's approval: built in the chat");
  const approvedAfter = { approvals: { motionPlan: { at: new Date(Date.now() + 60000).toISOString() } } };
  assert.equal(facts("built", approvedAfter).built.ok, false, "stills older than the approval: not built yet");
});

test("the Projects card follows the pipeline and the render: the Pipeline's 5 stages, and Exported once a render file exists", { timeout: 60000 }, async () => {
  const { updateMeta } = await import("../packages/project-service/index.mjs");
  const made = await api("POST", "/api/projects", { title: "Card state", aspect: "16:9", durationSec: 30, styleId: "general" });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  const card = async () => (await api("GET", "/api/projects")).json.projects.find((x) => x.id === made.json.id);
  assert.equal((await card()).progress, null, "no count before the Editor read the pipeline");
  const pl = await api("GET", `/api/projects/${made.json.id}/pipeline`);
  const c1 = await card();
  assert.deepEqual([c1.progress.total, c1.progress.unit], [5, "stages"], "the card counts the Pipeline's 5 stages, as its column does (never 07/08)");
  assert.equal(c1.progress.done, pl.json.stages.filter((x) => x.status === "done").length);
  // a card saved with the old step count is counted again in stages on the next list
  updateMeta(made.json.id, (m) => { m.pipelineSummary = { done: 7, total: 8, needsYou: 0, at: new Date().toISOString() }; });
  assert.deepEqual([(await card()).progress.total, (await card()).progress.unit], [5, "stages"]);
  assert.notEqual(c1.status, "exported");
  // a render on disk: Exported, and the Exported filter has it
  mkdirSync(join(made.json.path, "renders"), { recursive: true }); writeFileSync(join(made.json.path, "renders", "Phim.mp4"), "x");
  updateMeta(made.json.id, (m) => { m.lastExport = { file: "renders/Phim.mp4", at: new Date().toISOString() }; });
  assert.equal((await card()).status, "exported");
  rmSync(join(made.json.path, "renders", "Phim.mp4"), { force: true });
  assert.notEqual((await card()).status, "exported", "the file is gone: not exported any more");
});

test("New project, server side: the real folder name is told, Windows device names and over-long films are refused clearly", { timeout: 60000 }, async () => {
  const body = (title, extra = {}) => ({ title, aspect: "16:9", durationSec: 30, styleId: "general", ...extra });
  // a taken name is told as the folder it will really get
  const free = (await api("POST", "/api/projects/folder", { title: "Tên Trùng" })).json;
  assert.deepEqual([free.ok, free.name, free.taken, free.maxDurationSec], [true, "ten-trung", false, 3600]);
  const first = await api("POST", "/api/projects", body("Tên Trùng"));
  assert.equal(first.status, 200);
  assert.ok(first.json.path.endsWith("ten-trung"));
  const again = (await api("POST", "/api/projects/folder", { title: "Tên Trùng" })).json;
  assert.deepEqual([again.ok, again.name, again.taken, again.wanted], [true, "ten-trung-2", true, "ten-trung"]);
  assert.ok(again.path.endsWith("ten-trung-2"));
  const second = await api("POST", "/api/projects", body("Tên Trùng"));
  assert.equal(second.json.path, again.path, "what the dialog was told is what the server makes");
  // device names Windows keeps (a folder called con / nul / com1 cannot be handled normally), also from a folder name
  for (const bad of ["CON", "nul", "Com1", "  lpt9 "]) {
    const f = (await api("POST", "/api/projects/folder", { title: bad })).json;
    assert.deepEqual([f.ok, f.code], [false, "INVALID"], bad);
    assert.match(f.message, /name Windows keeps for itself/);
    assert.equal((await api("POST", "/api/projects", body(bad))).status, 400, bad);
  }
  assert.equal((await api("POST", "/api/projects", body("A name", { folderName: "aux" }))).status, 400);
  assert.equal((await api("POST", "/api/projects/folder", { title: "Console" })).json.ok, true, "only the whole name is reserved");
  // 60:00 is the longest; more is refused, not clipped
  const long = await api("POST", "/api/projects", body("Too long", { durationSec: 3601 }));
  assert.equal(long.status, 400); assert.equal(long.json.error.message, "The longest film is 60:00");
  assert.equal((await api("POST", "/api/projects/folder", { title: "Too long", durationSec: 99999 })).json.ok, false);
  assert.equal((await api("POST", "/api/projects/folder", { title: "Just right", durationSec: 3600 })).json.ok, true);
});

test("POST /api/projects/folder answers the New project dialog: the folder the server will really use, or the reason it cannot be used", { timeout: 60000 }, async () => {
  const get = (b) => api("POST", "/api/projects/folder", b).then((r) => r.json);
  const free = await get({ title: "Một Tên Chưa Có" });
  assert.deepEqual([free.ok, free.name, free.taken, free.maxDurationSec], [true, "mot-ten-chua-co", false, 3600]);
  assert.equal((await api("POST", "/api/projects", { title: "Một Tên Chưa Có", aspect: "16:9", durationSec: 30, styleId: "general" })).status, 200);
  const taken = await get({ title: "Một Tên Chưa Có" });
  assert.deepEqual([taken.name, taken.taken], ["mot-ten-chua-co-2", true]);
  const reserved = await get({ title: "NUL." });
  assert.deepEqual([reserved.ok, reserved.code], [false, "INVALID"]);
  assert.match(reserved.message, /name Windows keeps for itself/);
  assert.equal((await get({ title: "Quá dài", durationSec: "4000" })).ok, false);
  assert.equal((await get({ title: "" })).ok, false);
});

test("the first time a film's pipeline is read after the app started, the autopilot goes on by itself, once", { timeout: 120000 }, async () => {
  const c = (await api("POST", "/api/projects", { title: "Mở lại sau khởi động", brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "general" })).json;
  const { updateMeta, getProject } = await import("../packages/project-service/index.mjs");
  updateMeta(c.id, (m) => { delete m.pipeline?.autoRun; });
  await api("GET", `/api/projects/${c.id}/pipeline`);
  // the autopilot reads the pipeline again beside the server's thread (its git reads no longer hold the timer: T22-5): waited for
  const run = await settle(() => getProject(c.id).meta.pipeline?.autoRun);
  assert.equal(run?.step, "brief", "the next step was started (Claude is signed out in this test, so it goes no further)");
  await api("GET", `/api/projects/${c.id}/pipeline`);
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(getProject(c.id).meta.pipeline.autoRun.n, run.n, "once per app start, not on every read");
});

test("on opening, a Claude step goes on only when the user set it going after the last task (no paid step nobody asked for)", { timeout: 120000 }, async () => {
  const { updateMeta, getProject } = await import("../packages/project-service/index.mjs");
  const later = (ms) => new Date(Date.now() + ms).toISOString();
  const film = async (title, go) => {
    const c = (await api("POST", "/api/projects", { title, brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "general" })).json;
    await new Promise((r) => setTimeout(r, 1000));          // the new film's own kickoff has come and gone
    // the film came to rest after a chat turn: Claude offered the next step and nobody answered
    writeFileSync(join(getProject(c.id).path, ".moworks", "tasks.json"), JSON.stringify({ tasks: [{ id: `t${title.length}`, projectId: c.id, createdAt: later(1000),
      updatedAt: later(1000), status: "done", text: "Review in the chat", resultText: "Next is the music, if you want it.", events: [], changed: [] }] }));
    updateMeta(c.id, (m) => { delete m.pipeline?.autoRun; if (go) m.pipeline.ownerGo = { at: later(2000), step: "brief" }; else delete m.pipeline?.ownerGo; });
    await api("GET", `/api/projects/${c.id}/pipeline`);
    // the autopilot's own reads run beside the server's thread (T22-5): a go is waited for, a wait is given the same time
    return (await settle(() => getProject(c.id).meta.pipeline?.autoRun, go ? 10000 : 2000)) ?? null;
  };
  assert.equal(await film("Không ai bấm", false), null, "nothing the owner did since the last task: the step waits");
  assert.equal((await film("Chủ phim đã bấm", true))?.step, "brief", "the owner's go after the last task: it goes on");
});

test("running a step that is already done does not redo it (the Character dialog's Go on redrew an approved storyboard)", { timeout: 120000 }, async () => {
  const c = (await api("POST", "/api/projects", { title: "Đi tiếp", brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "general" })).json;
  const { updateMeta, getProject } = await import("../packages/project-service/index.mjs");
  writeFileSync(join(getProject(c.id).path, "BRIEF.md"), "# Brief\nThis film tells people that tea is calm.\n");
  updateMeta(c.id, (m) => { const pl = (m.pipeline ??= {}); (pl.marks ??= {}).brief = { at: new Date().toISOString(), by: "owner" }; });
  assert.equal((await api("GET", `/api/projects/${c.id}/pipeline`)).json.steps.find((x) => x.id === "brief").status, "done");
  const r = await api("POST", `/api/projects/${c.id}/pipeline/brief/run`, {});
  assert.equal(r.status, 200); assert.equal(r.json.alreadyDone, true);
  const asked = await api("POST", `/api/projects/${c.id}/pipeline/brief/run`, { text: "Viết lại brief ngắn hơn" });
  assert.notEqual(asked.json?.alreadyDone, true, "the owner's own words still run it");
});

test("a step that ends with a question to the user holds the pipeline and its row says Waiting for you, until the user answers", () => {
  assert.equal(pipe.endsWithQuestion("Còn một đoạn đứng 2,25 s ở shot 5.\n\nBạn muốn tôi sửa theo cách nào?"), true);
  assert.equal(pipe.endsWithQuestion("Which do you prefer?\n\nSources:\n- [Mixkit](https://mixkit.co)"), true);
  assert.equal(pipe.endsWithQuestion("Tôi đã sửa xong. Bấm Render lúc nào cũng được."), false);
  assert.equal(pipe.endsWithQuestion(""), false);
  const steps = [
    { id: "build", stage: 4, title: "Build", action: { kind: "claude" }, done: { kind: "mark" } },
    { id: "qcReview", stage: 4, title: "Review", needs: ["build"], action: { kind: "claude" }, done: { kind: "mark" } },
    { id: "sound", stage: 4, title: "Music", needs: ["build", "qcReview"], action: { kind: "claude" }, done: { kind: "mark" } },
  ];
  const f = (asked) => pipe.gatherFacts({ path: process.cwd(), meta: { pipeline: { marks: { build: { at: "2026-10-25T00:00:00Z" }, qcReview: { at: "2026-10-25T00:01:00Z" } }, ran: {}, skips: {} } } },
    { lastTasks: { qcReview: { status: "done", id: "r", asked } } });
  const held = pipe.computePipeline(steps, f(true));
  assert.equal(held.find((s) => s.id === "qcReview").asking, true);
  assert.equal(pipe.nextAuto(held), null, "the music waits for the answer");
  const row = pipe.stagesOf(held, f(true)).find((r) => r.id === "build");
  assert.deepEqual([row.status, row.line], ["waiting", "Waiting for you: answer Claude in the chat"]);
  assert.equal(pipe.nextAuto(pipe.computePipeline(steps, f(false)))?.id, "sound", "answered: the stage goes on");
});

test("the user chose not to use the voice-over: voice_off takes it off the timeline (element and lane), the file stays", async () => {
  const c = (await api("POST", "/api/projects", { title: "Bỏ giọng", brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "general" })).json;
  const { updateMeta, getProject } = await import("../packages/project-service/index.mjs");
  const dir = getProject(c.id).path;
  mkdirSync(join(dir, "assets", "3_audio", "voiceover"), { recursive: true });
  writeFileSync(join(dir, "assets", "3_audio", "voiceover", "vo.mp3"), "x");
  updateMeta(c.id, (m) => { m.voice = { source: "upload", file: "assets/3_audio/voiceover/vo.mp3", transcript: { status: "saved" } }; });
  writeFileSync(join(dir, "index.html"), '<div id="root" data-composition-id="main" data-duration="10">\n    <audio id="el-voice" src="assets/3_audio/voiceover/vo.mp3" data-start="0" data-duration="10" data-volume="0" data-timeline-role="voiceover"></audio>\n</div>\n');
  const { assetRoutes } = await import("../packages/server/assets.mjs");
  const { tools } = assetRoutes({ renders: { isRendering: () => false } }, { r: () => null, P: "", mustProject: () => null, HttpError: Error });
  assert.match(await tools.voice_off({ project: { id: c.id, path: dir } }), /off the timeline \(the file stays in the assets\)/);
  assert.doesNotMatch(readFileSync(join(dir, "index.html"), "utf8"), /el-voice/);
  assert.equal(getProject(c.id).meta.voice.offTimeline, true);
  assert.ok(existsSync(join(dir, "assets", "3_audio", "voiceover", "vo.mp3")), "the file is kept");
  const A = await import("../packages/agent/index.mjs");
  const sp = A.systemPrompt({ meta: getProject(c.id).meta, rules: [], shots: [], dir, step: "build" });
  assert.match(sp, /is off the timeline \(the owner chose not to use it\)/);
});

test("problems that stop the render and an open question in the chat: Build and review waits for the user, the Final Mix is not ready", () => {
  const rows = (f) => pipe.stagesOf([{ id: "build", stage: 4, status: "done" }, { id: "checks", stage: 4, status: "failed", quiet: true }, { id: "finalMix", stage: 5, status: "ready", optional: true }], f);
  const asked = rows({ chatAsked: true, finished: true, qa: { pass: false, blocking: 2 } });
  assert.deepEqual([asked[3].status, asked[3].line], ["waiting", "Waiting for you: answer Claude in the chat"]);
  assert.notEqual(asked[4].status, "done"); assert.doesNotMatch(asked[4].line, /Ready to render/);
  const blocked = rows({ finished: true, qa: { pass: false, blocking: 2 } });
  assert.doesNotMatch(blocked[4].line, /Ready to render/, "2 blocking problems: not ready");
});

test("a cast Prepare wrote (the user chose that Claude makes them) gets the Character step before the Storyboard, in any anidoodle medium", async () => {
  const { stylePipeline } = await import("../packages/style-catalog/index.mjs");
  const steps = stylePipeline("anidoodle-balloon");
  if (!steps.length) return;
  assert.equal(steps.find((x) => x.id === "character").when, "cast");
  const d = mkdtempSync(join(tmpdir(), "mw-cast-"));
  writeFileSync(join(d, "index.html"), '<div data-composition-id="main"></div>');
  const facts = () => pipe.gatherFacts({ path: d, meta: { style: { id: "anidoodle-balloon" }, pipeline: { marks: { brief: { at: new Date().toISOString(), by: "owner" } }, ran: { brief: { at: new Date().toISOString() } }, skips: {} } } });
  assert.equal(pipe.computePipeline(steps, facts()).find((x) => x.id === "character").hidden, true, "no cast written: no Character step in a non-human medium");
  writeFileSync(join(d, "CHARACTERS.json"), JSON.stringify({ characters: [{ id: "fox", name: "Cáo", about: "a paper fox", kind: "animal" }] }));
  const st = pipe.computePipeline(steps, facts());
  assert.equal(st.find((x) => x.id === "character").hidden, undefined, "the cast Prepare wrote: the Character step shows");
  assert.equal(st.find((x) => x.id === "storyboard").status, "blocked", "the Storyboard waits for the cast's approval");
  const A = await import("../packages/agent/index.mjs");
  assert.match(A.actorsLine({ style: { id: "anidoodle-balloon" } }), /end Prepare by writing docs\/CHARACTERS\.json[^]*Never make a character in the Storyboard or the Build/);
  rmSync(d, { recursive: true, force: true });
});

test("a finished anidoodle film made before the Character step never gets it put in front: it counts as passed, nothing runs", async () => {
  const { stylePipeline } = await import("../packages/style-catalog/index.mjs");
  const steps = stylePipeline("anidoodle-fox");
  if (!steps.length) return;
  const past = facts({ ...BRIEFED, flags: { characters: false, cast: true, humanHand: false }, storyboard: { real: true, hash: "b", rawHash: "b" }, motionPlan: { exists: true, hash: "m" },
    approvals: { storyboard: { at: new Date(2000).toISOString(), contentHash: "b" }, motionPlan: { at: new Date(3000).toISOString(), hash: "m" } }, built: { ok: true, at: 4000 } });
  const s0 = pipe.computePipeline(steps, past);
  assert.deepEqual([st(s0, "storyboard").status, st(s0, "character").status, st(s0, "character").passed], ["done", "done", true]);
  assert.equal(st(s0, "character").reason.key, "Added to this style after this film was made: nothing to do");
  assert.notEqual(pipe.nextAuto(s0)?.id, "character");
  // a run that was stopped leaves no "Stopped" on Prepare
  const s2 = pipe.computePipeline(steps, { ...past, lastTasks: { character: { status: "cancelled", at: new Date().toISOString() } } });
  assert.deepEqual([st(s2, "character").status, st(s2, "character").stopped], ["done", undefined]);
  assert.ok(!pipe.stagesOf(s2, past).some((r) => r.status === "stopped"), "no stage reads Stopped");
  // a new film with its cast written still gets the step first
  const s1 = pipe.computePipeline(steps, facts({ ...BRIEFED, flags: { characters: false, cast: true, humanHand: false } }));
  assert.equal(st(s1, "character").status, "ready"); assert.equal(pipe.nextAuto(s1)?.id, "character");
});

// ---- the voice-over first, again (the Storyboard was drawn to the brief's 40 s while the voice, made 51 s later, was 45.6 s; a second
// pass timed it again and the length conflict showed only then): the Storyboard waits for the voice-over's words, then draws in one pass
test("a film with a voice-over to make waits for its words before the Storyboard; with none the Storyboard starts at once", () => {
  const steps = pipelineSteps("hf-explainer");
  // case 1: Prepare wrote the words to read and no voice is made yet: the user makes it (the Voice dialog), nothing runs
  let s0 = pipe.computePipeline(steps, facts({ ...BRIEFED, voiceWait: "make" }));
  assert.equal(st(s0, "storyboard").status, "needs-you"); assert.equal(st(s0, "storyboard").voiceWait, "make");
  assert.equal(pipe.nextAuto(s0), null, "the autopilot waits");
  let row = pipe.stagesOf(s0, facts(BRIEFED))[1];
  assert.deepEqual([row.status, row.line, row.open], ["waiting", "Waiting for you: make the voice-over", "voice"]);
  // the voice being made and its words timed: the app at work, the row says so
  s0 = pipe.computePipeline(steps, facts({ ...BRIEFED, voiceWait: "words" }));
  assert.equal(st(s0, "storyboard").status, "blocked"); assert.equal(pipe.nextAuto(s0), null);
  row = pipe.stagesOf(s0, facts(BRIEFED))[1];
  assert.deepEqual([row.status, row.line], ["running", "Timing the voice-over's words"]);
  // the words differ from the script: the user checks them; a lyric video waits for its lyrics timed the same way
  assert.equal(pipe.stagesOf(pipe.computePipeline(steps, facts({ ...BRIEFED, voiceWait: "check" })), facts(BRIEFED))[1].line, "Waiting for you: check and save the voice-over's words");
  row = pipe.stagesOf(pipe.computePipeline(steps, facts({ ...BRIEFED, voiceWait: "lyrics" })), facts(BRIEFED))[1];
  assert.deepEqual([row.line, row.open], ["Waiting for you: time the lyrics", "lyrics"]);
  // case 4: no voice-over (none planned, or the user chose No voice-over): the Storyboard starts at once, as before
  s0 = pipe.computePipeline(steps, facts({ ...BRIEFED, voiceWait: null }));
  assert.equal(st(s0, "storyboard").status, "ready"); assert.equal(pipe.nextAuto(s0).id, "storyboard");
  // case 5: a storyboard drawn before the voice came does not wait: it is timed again to the words (transcriptLanded)
  s0 = pipe.computePipeline(steps, facts({ ...BRIEFED, voiceWait: "make", boards: true }));
  assert.equal(st(s0, "storyboard").voiceWait, undefined);
  assert.equal(st(s0, "storyboard").reason.key, "Pick one of the options in the Storyboard dialog");
});

test("what the Storyboard waits for, read from the project (the words to read, the voice, its words, the lyrics)", async () => {
  const d = mkdtempSync(join(T, "d39-"));
  const none = () => false;
  assert.equal(pipe.voiceWaitOf(d, {}, none), null, "no narration planned: nothing to wait for");
  writeFileSync(join(d, "VOICEOVER.md"), "# Lời đọc\n1. Na thả diều.\n2. Gió đổi chiều.\n");
  assert.equal(pipe.voiceWaitOf(d, {}, none), "make");
  assert.equal(pipe.voiceWaitOf(d, { voice: { source: "none", noVoice: { at: "x" } } }, none), null, "the owner chose No voice-over");
  assert.equal(pipe.voiceWaitOf(d, { voice: { source: "none" } }, none), "make", "T17-1: a bare \"none\" (every project the dialog made since aa7e466f) is no choice");
  assert.equal(pipe.voiceWaitOf(d, { pipeline: { voiceSkip: { at: "x" } } }, none), null);
  assert.equal(pipe.voiceWaitOf(d, {}, (k) => k === "tts"), "words", "being made");
  const v = (transcript) => ({ voice: { file: "assets/3_audio/voice/v.mp3", source: "elevenlabs", transcript } });
  assert.equal(pipe.voiceWaitOf(d, v({ status: "transcribing" }), (k) => k === "transcribe"), "words");
  assert.equal(pipe.voiceWaitOf(d, v({ status: "review" }), none), "check");
  assert.equal(pipe.voiceWaitOf(d, v({ status: "failed" }), none), "failed");
  assert.equal(pipe.voiceWaitOf(d, v(null), none), "failed", "never timed (no Whisper model): the owner times it");
  assert.equal(pipe.voiceWaitOf(d, v({ status: "saved" }), none), null, "the words are in");
  assert.equal(pipe.voiceWaitOf(d, { voice: { ...v({ status: "review" }).voice, offTimeline: true } }, none), null);
  // the user's lyrics: timed by the app first
  writeFileSync(join(d, "lyrics.txt"), "Gió ơi gió\n");
  assert.equal(pipe.voiceWaitOf(d, v({ status: "saved" }), none), "lyrics");
  assert.equal(pipe.voiceWaitOf(d, v({ status: "saved" }), (k) => k === "lyrics"), "lyricsTiming");
  mkdirSync(join(d, ".moworks", "lyrics"), { recursive: true });
  writeFileSync(join(d, ".moworks", "lyrics", "words.json"), JSON.stringify({ at: new Date(Date.now() + 5000).toISOString(), words: [] }));
  assert.equal(pipe.voiceWaitOf(d, v({ status: "saved" }), none), null, "timed");
  // Prepare writes the words to read for any narrated film, and never asks to be told when the voice is made
  const { voiceLine } = await import("../packages/agent/index.mjs");
  assert.match(voiceLine({}), /gets its words to read in docs\/VOICEOVER\.md[^]*holds the Storyboard until the voice is made and its words are timed[^]*no narration gets no docs\/VOICEOVER\.md/);
});

test("the words landed: a Storyboard that waited starts in one pass (the length asked before any frame); one drawn before is timed again", { timeout: 60000 }, async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
  const d = mkdtempSync(join(T, "d39-film-"));
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-duration="40"></div>\n');
  writeFileSync(join(d, "BRIEF.md"), "# Brief\nChiếc diều của Na.\n");
  writeFileSync(join(d, "VOICEOVER.md"), "1. Na thả diều.\n");
  const id = projects.openProject(d, T).id;
  projects.updateMeta(id, (m) => { m.title = "D39"; m.style = { id: "hf-explainer", title: "Explainers, tutorials and \"how it works\"" }; m.targetDurationSec = 40;
    m.brief = { text: "Chiếc diều của Na", mode: "idea" }; (m.pipeline ??= {}).marks = { brief: { at: new Date(Date.now() - 60000).toISOString() } }; }, T);
  const steps = pipelineSteps("hf-explainer");
  let started = [];
  const ctx = { root: T, renders: createRenderQueue(), jobs: { list: () => [], start: () => { throw Object.assign(new Error("busy"), { code: "BUSY" }); } },
    agent: { running: new Map(), list: () => [], start: async (_id, o) => { started.push(o); return { id: `t${started.length}` }; }, interrupted: () => false },
    pipelineOf: async (pid) => { const p = projects.getProject(pid, T); const facts = pipe.gatherFacts(p); return { p, facts, state: pipe.computePipeline(steps, facts) }; } };
  const ap = createAutopilot(ctx);
  // waiting for the voice: nothing starts; one reminder card opens the Voice dialog
  assert.equal(await ap.advance(id), null);
  assert.equal(started.length, 0);
  const cards = projects.readNotes(d).filter((n) => n.kind === "waiting" && n.open === "voice");
  assert.equal(cards.length, 1); assert.match(cards[0].text, /make it on the Voice screen/);
  await ap.advance(id);
  assert.equal(projects.readNotes(d).filter((n) => n.kind === "waiting" && n.open === "voice").length, 1, "said once");
  // the voice made and its words saved (38 s on a 40 s film): the Storyboard starts now, one pass, nothing asked first
  const voice = (duration) => ({ file: "assets/3_audio/voice/v.mp3", source: "elevenlabs", info: { duration }, transcript: { status: "saved", savedAt: new Date().toISOString() } });
  projects.updateMeta(id, (m) => { m.voice = voice(38); }, T);
  await ap.transcriptLanded(id);
  assert.equal(started.length, 1); assert.equal(started[0].step, "storyboard");
  assert.doesNotMatch(started[0].text, /Before you draw anything|The voice-over came while you drew/);
  // a voice longer than the film (45.6 s on 40 s): asked before any frame is drawn
  projects.updateMeta(id, (m) => { m.voice = voice(45.6); }, T);
  await ap.transcriptLanded(id);
  assert.match(started[1].text, /^Before you draw anything: The voice-over is 45\.6 s, 5\.6 s longer than the film's 40 s/);
  assert.match(started[1].text, /stop without drawing a frame/);
  // case 5: a storyboard drawn before the voice came (or changed after): the re-timing pass, as before
  mkdirSync(join(d, "boards", "rounds"), { recursive: true });
  projects.updateMeta(id, (m) => { m.voice = voice(38); }, T);
  await ap.transcriptLanded(id);
  assert.match(started[2].text, /^The voice-over came while you drew the storyboard/);
});

test("a project made as the New project dialog makes it (no voice field) waits for the voice-over a narrated Prepare asked for", { timeout: 60000 }, async () => {
  const { updateMeta } = await import("../packages/project-service/index.mjs");
  const made = await api("POST", "/api/projects", { title: "demo-t17-voice", brief: "Lý trà đỏ mồ hôi, có lời đọc tiếng Việt", aspect: "9:16", durationSec: 32, styleId: "general" });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  const p = made.json;
  assert.equal(p.meta.voice.source, undefined, "no source until the owner chooses one");
  assert.equal(p.meta.voice.noVoice, undefined);
  // Prepare ran on a narrated brief: BRIEF.md, the words to read in VOICEOVER.md
  writeFileSync(join(p.path, "BRIEF.md"), "# Brief\nLý trà đỏ.\n");
  writeFileSync(join(p.path, "VOICEOVER.md"), "1. Ly trà đỏ.\n2. Mồ hôi rơi.\n");
  updateMeta(p.id, (m) => { m.pipeline = { ...(m.pipeline ?? {}), autopilot: false, marks: { brief: { at: new Date().toISOString() } }, ran: { brief: { at: new Date().toISOString() } } }; });
  let pl = (await api("GET", `/api/projects/${p.id}/pipeline`)).json;
  assert.equal(pl.voiceWait, "make", JSON.stringify(pl.steps.find((x) => x.id === "storyboard")));
  assert.equal(pl.stages[1].line, "Waiting for you: make the voice-over");
  // the user picks No voice-over on the Voice screen: the Storyboard goes on; a voice source chosen later asks for the voice again
  assert.equal((await api("PATCH", `/api/projects/${p.id}/voice`, { source: "none" })).json.noVoice != null, true);
  pl = (await api("GET", `/api/projects/${p.id}/pipeline`)).json;
  assert.equal(pl.voiceWait, null); assert.equal(pl.steps.find((x) => x.id === "storyboard").status, "ready");
  const back = (await api("PATCH", `/api/projects/${p.id}/voice`, { source: "elevenlabs" })).json;
  assert.equal(back.noVoice, undefined); assert.equal(back.source, "elevenlabs");
  assert.equal((await api("GET", `/api/projects/${p.id}/pipeline`)).json.voiceWait, "make");
});

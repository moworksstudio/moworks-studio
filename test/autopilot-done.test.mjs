// Stage 4 ends with the checks; only then is the film done, said once as a "film-done" note with
// the self-check's score card; after that the checks do not run again by themselves until a new build. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-done-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
const projects = await import("../packages/project-service/index.mjs");
const { createAutopilot, createRenderQueue, isFinished } = await import("../packages/server/autopilot.mjs");
after(() => rmSync(T, { recursive: true, force: true }));

test("the film is done once, when the checks passed; then the checks wait for a new build", async () => {
  const dir = join(T, "work", "projects", "demo-done");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  writeFileSync(join(dir, "QC-REVIEW.md"), "Round 1\nFinal score: 8/10\n");
  writeFileSync(join(dir, "QC-REVIEW.json"), JSON.stringify({ final: 8, rounds: [{ round: 1, scores: { hook: 8, phone: 9, motion: 8, variety: 8, composition: 9, brand: 9, sync: 8 }, worst: [], changed: "" }] }));
  const p = projects.openProject(dir);
  const id = p.id;
  let qaRuns = 0;
  // the checks are the next step ("redo": the film changed after the last check)
  const ctx = {
    root: T, renders: createRenderQueue(),
    agent: { running: new Map(), start: async () => ({ id: "t1" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [{ id: "checks", stage: 4, status: "redo", action: { kind: "job", job: "qa" } }] }),
    startQa: () => { qaRuns++; return { id: "job" }; },
    mix: { useOption: async () => null, placeSfx: async () => null },
  };
  const ap = createAutopilot(ctx);
  assert.equal(isFinished(projects.getProject(id).meta), false);
  await ap.advance(id);
  assert.equal(qaRuns, 1, "before the film is done, the checks run by themselves (the last of stage 4)");
  // the checks passed: the film is done, one note, the score card in it
  projects.updateMeta(id, (m) => { m.lastQa = { at: new Date().toISOString(), pass: true, revision: "x", blocking: 0 }; });
  await ap.afterQa(id);
  const done = projects.readNotes(dir).filter((n) => n.event === "film-done");
  assert.equal(done.length, 1);
  assert.equal(done[0].kind, "pipeline"); assert.equal(done[0].status, "done");
  assert.equal(done[0].vars.score, 8); assert.equal(done[0].vars.n, 1);
  assert.equal(done[0].qc.rounds[0].scores.phone, 9);
  assert.ok(isFinished(projects.getProject(id).meta));
  assert.ok(projects.getProject(id).meta.pipeline.delivered, "the first delivery is kept for the versions");
  // after done: a change in the Final Mix or the chat leaves the checks alone (no "Running checks" in the top bar)
  await ap.advance(id);
  assert.equal(qaRuns, 1);
  await ap.afterQa(id);
  assert.equal(projects.readNotes(dir).filter((n) => n.event === "film-done").length, 1, "said once per build");
  // a new build (after a new motion): stage 4 runs to the end again
  await ap.taskEnded(id, { id: "t2", status: "done", step: "build" });
  assert.equal(projects.getProject(id).meta.pipeline.finished, null);
  assert.equal(isFinished(projects.getProject(id).meta), false);
  assert.equal(qaRuns, 2, "the checks run again after the new build");
  // a film delivered before `finished` was recorded (no `finished`) counts as done
  assert.equal(isFinished({ pipeline: { delivered: { at: "2026-10-19T00:00:00Z" } } }), true);
  // The storyboard step ends, the app takes the stills of the options at once (the dialog opens with pictures)
  const took = [];
  ctx.boardStills = (pp) => { took.push(pp.id); return { id: "job" }; };
  await ap.taskEnded(id, { id: "t3", status: "done", step: "storyboard" });
  assert.deepEqual(took, [id]);
});

test("a code film (Brush cartoon, Lemo, mg, anidoodle) is built once its page exists and Build ran; the autopilot runs a step at most twice in a row", async () => {
  const pipe = await import("../packages/pipeline/index.mjs");
  const dir = join(T, "work", "projects", "demo-brush");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), "<div data-composition-id=\"root\"></div><script src=\"film.js\"></script>");
  const frames = [{ index: 1, number: 1, title: "a", start: null, src: null }, { index: 2, number: 2, title: "b", start: null, src: null }];
  const facts = (meta) => pipe.gatherFacts({ path: dir, meta }, { shots: frames });
  assert.equal(facts({ style: { id: "brush-cartoon" } }).built.ok, false, "not before the Build step ran");
  assert.equal(facts({ style: { id: "brush-cartoon" }, pipeline: { ran: { build: { at: new Date().toISOString() } } } }).built.ok, true, "one page, no frame mounted: built");
  assert.equal(facts({ style: { id: "lemo-art-deco" }, pipeline: { ran: { build: { at: new Date().toISOString() } } } }).built.ok, true);
  assert.equal(facts({ style: { id: "general" }, pipeline: { ran: { build: { at: new Date().toISOString() } } } }).built.ok, false, "an HF film still needs its frames mounted");
  // the repeat limit: Build started by the autopilot twice and still not done: no third run; one note; Continue counts afresh
  const p = projects.openProject(dir);
  const started = [];
  const build = { id: "build", title: "Build and self-check", stage: 4, status: "ready", action: { kind: "claude", prompt: "Build." }, reason: null };
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async (_id, t) => { started.push(t.step); return { id: `t${started.length}` }; } },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [{ ...build }] }), startQa: () => null, mix: {} };
  const ap = createAutopilot(ctx);
  await ap.advance(p.id); await ap.advance(p.id); await ap.advance(p.id); await ap.advance(p.id);
  assert.deepEqual(started, ["build", "build"], "twice, then the owner is asked");
  const told = projects.readNotes(dir).filter((n) => /ran twice and is still not done/.test(n.text));
  assert.equal(told.length, 1, "told once");
  await ap.startStep(p.id, build);          // the user runs it from the pipeline
  await ap.advance(p.id);
  assert.deepEqual(started, ["build", "build", "build", "build"], "a run by the owner counts afresh");
});

test("a built code film whose storyboard and motion a chat turn changed goes on with Continue from the QC review, never a new build", async () => {
  const pipe = await import("../packages/pipeline/index.mjs");
  const { readShots } = await import("../packages/hf-edit/shots.mjs");
  const { stylePipeline } = await import("../packages/style-catalog/index.mjs");
  const { createHash } = await import("node:crypto");
  const dir = join(T, "work", "projects", "demo-brush-stuck");
  mkdirSync(dir, { recursive: true });
  const sb = (await import("node:fs")).readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8");
  writeFileSync(join(dir, "STORYBOARD.md"), sb + "\n<!-- longer after the owner's note -->\n");
  writeFileSync(join(dir, "MOTION-PLAN.json"), JSON.stringify({ version: 1, shots: [{ shot: 1, motions: [{ target: "tofu", type: "entrance", start: 0.2, duration: 0.5, behavior: "hops in" }] }] }));
  writeFileSync(join(dir, "BRIEF.md"), "brief"); writeFileSync(join(dir, "CHARACTERS.json"), "{\"characters\":[]}");
  writeFileSync(join(dir, "index.html"), "<div id=\"root\" data-composition-id=\"main\" data-duration=\"13\"></div><script src=\"film.js\"></script>");
  const p = projects.openProject(dir);
  const at = (m) => new Date(Date.now() - m * 60000).toISOString();
  projects.updateMeta(p.id, (m) => {
    m.style = { id: "brush-cartoon", title: "Brush cartoon" };
    m.pipeline = { marks: { brief: { at: at(60) } }, skips: {}, ran: { build: { at: at(10) } } };
    m.approvals = { characters: { at: at(50), hash: createHash("sha256").update("{\"characters\":[]}").digest("hex") },
      storyboard: { at: at(40), contentHash: pipe.storyboardHash(sb) }, motionPlan: { at: at(30), hash: "old" } };          // approved before the chat changed them
  });
  const pipelineOf = async (id) => { const pp = projects.getProject(id); const { shots } = await readShots(pp.path); const facts = pipe.gatherFacts(pp, { shots });
    return { p: pp, facts, state: pipe.computePipeline(stylePipeline("brush-cartoon"), facts) }; };
  assert.equal((await pipelineOf(p.id)).state.find((x) => x.id === "build").status, "redo", "stuck as QC found it");
  const started = [];
  const ap = createAutopilot({ root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async (_id, t) => { started.push(t.step); return { id: "t" }; } },
    pipelineOf, startQa: () => null, scanAssets: async () => {}, mix: {} });
  await ap.resume(p.id);
  assert.deepEqual(started, ["qcReview"]);
  assert.equal((await pipelineOf(p.id)).state.find((x) => x.id === "build").status, "done");
});

test("a finished code film starts its preview once, in the background, and is handed over at once", async () => {
  const dir = join(T, "work", "projects", "demo-brush-proxy");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), "<div id=\"root\" data-composition-id=\"main\" data-duration=\"10\"></div>");
  const p = projects.openProject(dir);
  projects.updateMeta(p.id, (m) => { m.style = { id: "brush-cartoon" }; m.lastQa = { at: new Date().toISOString(), pass: true, revision: "x", blocking: 0 }; });
  const asked = [];
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [] }), startQa: () => null, mix: {},
    previewProxy: (id) => { asked.push(id); return { id: "proxy-1", status: "running" }; } };
  const ap = createAutopilot(ctx);
  await ap.afterQa(p.id);
  assert.deepEqual(asked, [p.id], "the preview starts as the film finishes");
  assert.equal(projects.readNotes(dir).filter((n) => n.event === "film-done").length, 1, "handed over at once, not after the preview");
  // the feedback loop: a chat turn that changed files makes it again, once; one that changed nothing does not
  await ap.taskEnded(p.id, { id: "c1", status: "done", step: null, changed: ["index.html"] });
  await ap.taskEnded(p.id, { id: "c2", status: "done", step: null, changed: [] });
  assert.deepEqual(asked, [p.id, p.id]);
  // It starts as soon as the film is built, before the Review and the checks
  await ap.taskEnded(p.id, { id: "b1", status: "done", step: "build", changed: ["index.html"] });
  assert.deepEqual(asked, [p.id, p.id, p.id]);
  // An HTML film is asked too; the preview service decides what it makes for each style
  projects.updateMeta(p.id, (m) => { m.style = { id: "general" }; });
  await ap.taskEnded(p.id, { id: "b2", status: "done", step: "build", changed: ["index.html"] });
  assert.equal(asked.length, 4);
});

test("the checks' last report with only a script check that ran out of time finishes the film (and starts its preview)", async () => {
  const dir = join(T, "work", "projects", "demo-anidoodle-late");
  mkdirSync(join(dir, ".moworks", "cache", "qa"), { recursive: true });
  writeFileSync(join(dir, "index.html"), "<div id=\"root\" data-composition-id=\"main\" data-duration=\"10\"></div>");
  const p = projects.openProject(dir);
  writeFileSync(join(dir, ".moworks", "cache", "qa", "last.json"), JSON.stringify({ revision: "r7", checks: [{ id: "G-HF-SCRIPT", blocking: true, pass: false, findings: [{ code: "check_runtime_failure", message: "Check did not finish within its deadline." }] }] }));
  projects.updateMeta(p.id, (m) => { m.style = { id: "anidoodle-storybook" }; m.lastQa = { at: new Date().toISOString(), pass: false, revision: "r7", blocking: 1 }; });
  const asked = [], started = [];
  const ap = createAutopilot({ root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async (_id, t) => { started.push(t.text); return { id: "t" }; } },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [] }), startQa: () => null, mix: {}, previewProxy: (id) => { asked.push(id); return { id: "proxy" }; } });
  await ap.afterQa(p.id);
  assert.deepEqual(asked, [p.id], "finished: the preview starts");
  assert.deepEqual(started, [], "no Claude task to fix a timeout");
  assert.equal(projects.readNotes(dir).filter((n) => n.event === "film-done").length, 1);
});

test("checks passed from their dialog finish the film only once the steps before them are done (not half-way after a new build)", async () => {
  const dir = join(T, "work", "projects", "demo-dialog-checks");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), "<div id=\"root\" data-composition-id=\"main\" data-duration=\"10\"></div>");
  const p = projects.openProject(dir);
  projects.updateMeta(p.id, (m) => { m.style = { id: "general" }; m.lastQa = { at: new Date().toISOString(), pass: true, revision: "x", blocking: 0 }; });
  let state = [{ id: "build", status: "done" }, { id: "qcReview", status: "ready" }, { id: "sound", status: "blocked" }, { id: "checks", status: "done" }];
  const ap = createAutopilot({ root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state }), startQa: () => null, mix: {}, previewProxy: () => null });
  await ap.afterQa(p.id);
  assert.equal(projects.readNotes(dir).filter((n) => n.event === "film-done").length, 0, "the Review comes first");
  state = [{ id: "build", status: "done" }, { id: "qcReview", status: "needs-you" }, { id: "sound", status: "done" }, { id: "checks", status: "done" }];
  await ap.afterQa(p.id);
  assert.equal(projects.readNotes(dir).filter((n) => n.event === "film-done").length, 1, "a step waiting for the owner does not hold it");
});

test("a film with anidoodle human characters builds only when every character's gate passes", async () => {
  const dir = join(T, "work", "projects", "demo-anidoodle-gate");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), "<div id=\"root\" data-composition-id=\"main\" data-duration=\"10\"></div>");
  writeFileSync(join(dir, "CHARACTERS.json"), JSON.stringify({ characters: [{ id: "mira", name: "Mira", engine: "anidoodle-human", import: "anidoodle/canvas-core/characters/mira" }] }));
  const p = projects.openProject(dir);
  const started = [];
  // maker.filmGate's shape: passed / failed are counts, lines the checks' words
  let gate = { pass: false, characters: [{ id: "mira", passed: 188, failed: 2, lines: ["PASS canon", "FAIL identity per view", "FAIL hand joints"] }] };
  const build = { id: "build", title: "Build", stage: 4, status: "ready", action: { kind: "claude", prompt: "Build." } };
  const fixes = [];
  const ap = createAutopilot({ root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async (_id, t) => { if (t.step) started.push(t.step); else fixes.push(t.text); return { id: "t" }; } },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [build] }), startQa: () => null, mix: {}, characterGate: async () => gate });
  const r = await ap.startStep(p.id, build);
  assert.equal(r.refused, true); assert.deepEqual(started, []);
  assert.match(projects.readNotes(dir).at(-1).vars.why, /mira/);
  // The note promised a fix nobody started: Claude is asked now, with the failing checks, once per failure
  assert.equal(fixes.length, 1); assert.match(fixes[0], /mira: FAIL identity per view; FAIL hand joints/);
  await ap.startStep(p.id, build);
  assert.equal(fixes.length, 1, "the same failure: no second fix");
  assert.match(projects.readNotes(dir).at(-1).text, /still fails after Claude's fix/);
  gate = { pass: true, characters: [] };
  await ap.startStep(p.id, build);
  assert.deepEqual(started, ["build"]);
  assert.equal(projects.getProject(p.id).meta.pipeline.gateFix, undefined, "passed: the fix record goes");
});

test("a film whose code does not compile goes to Claude once with the compiler's words, then to the user; nothing else runs on it", async () => {
  const dir = join(T, "work", "projects", "demo-build-error");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), "<div id=\"root\" data-composition-id=\"main\" data-duration=\"10\"></div>");
  const p = projects.openProject(dir);
  const err = "anidoodle/acting.ts:95 Unexpected \"export\"";
  projects.updateMeta(p.id, (m) => { m.style = { id: "anidoodle-storybook" }; (m.pipeline ??= {}).buildError = { at: new Date().toISOString(), error: err }; });
  const started = [];
  const ap = createAutopilot({ root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async (_id, t) => { started.push(t.text); return { id: "fix" }; } },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [] }), startQa: () => null, mix: {}, previewProxy: () => null });
  await ap.taskEnded(p.id, { id: "b1", status: "done", step: "build", changed: ["anidoodle/acting.ts"] });
  assert.equal(started.length, 1); assert.match(started[0], /does not compile[\s\S]*acting\.ts:95 Unexpected "export"/);
  await ap.taskEnded(p.id, { id: "fix", status: "done", step: null, changed: ["anidoodle/acting.ts"] });          // the same error after the fix
  assert.equal(started.length, 1, "one fix per error");
  assert.equal(projects.readNotes(dir).filter((n) => /still does not compile/.test(n.text)).length, 1, "the owner is told once");
  await ap.taskEnded(p.id, { id: "c2", status: "done", step: null, changed: [] });
  assert.equal(projects.readNotes(dir).filter((n) => /still does not compile/.test(n.text)).length, 1);
  // compiled again: the fix record goes, a later error gets its own fix
  projects.updateMeta(p.id, (m) => { delete m.pipeline.buildError; });
  await ap.taskEnded(p.id, { id: "c3", status: "done", step: null, changed: ["anidoodle/acting.ts"] });
  assert.equal(projects.getProject(p.id).meta.pipeline.buildFix, undefined);
});

// T22-2: the app once sent "I added 1 file(s)… Use them and go on" in the user's name while the Storyboard asked; the file was the app's own
// voice-over, and Claude took the message for the user's answer
test("files that come in while a step asks the user: the app says so in the chat and sends nothing in the user's name; its own files never count", async () => {
  const dir = join(T, "work", "projects", "demo-files-answer");
  mkdirSync(join(dir, "assets", "3_audio", "voiceover"), { recursive: true });
  writeFileSync(join(dir, "index.html"), "<div id=\"root\" data-composition-id=\"main\" data-duration=\"10\"></div>");
  const p = projects.openProject(dir);
  const texts = [];
  let state = [{ id: "brief", status: "needs-you", asking: true }];
  const running = new Map();
  const ap = createAutopilot({ root: T, renders: createRenderQueue(), agent: { running, start: async (_id, t) => { texts.push(t.text); return { id: "t" }; } },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state }), startQa: () => null, mix: {}, filesDelayMs: 20 });
  const said = () => projects.readNotes(dir).filter((n) => /while Claude waits for your answer/.test(n.text ?? ""));
  ap.filesAdded(p.id, ["assets/1_design/images/PNG Logo.png"]); ap.filesAdded(p.id, ["assets/1_design/fonts/Brand.ttf"]);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(texts.length, 0, "no message in the user's name");
  assert.equal(said().length, 1, "one line for the batch");
  assert.equal(said()[0].kind, "pipeline");
  assert.equal(said()[0].vars.names, '"PNG Logo.png", "Brand.ttf"');
  // the app's own voice-over (the Voice screen's ElevenLabs file) is never a file the user added
  const vo = "assets/3_audio/voiceover/elevenlabs-2026-10-29T16-38-02-118Z.mp3";
  writeFileSync(join(dir, ...vo.split("/")), "mp3");
  projects.updateMeta(p.id, (m) => { m.voice = { source: "elevenlabs", file: vo }; });
  ap.filesAdded(p.id, [vo]);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(said().length, 1, "nothing said for the app's own file");
  assert.equal(texts.length, 0);
  state = [{ id: "brief", status: "done" }];          // nothing asks: the files wait for the next task's news
  ap.filesAdded(p.id, ["assets/x.png"]);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(said().length, 1);
  state = [{ id: "brief", status: "needs-you", asking: true }]; running.set(p.id, "busy");          // Claude at work: not now
  ap.filesAdded(p.id, ["assets/y.png"]);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(said().length, 1);
  assert.equal(texts.length, 0);
});

test("every wait for the user gets a reminder card in the chat (new characters, the storyboard, Approve and build)", async () => {
  const dir = join(T, "work", "projects", "demo-waits");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  let state = [];
  const ctx = {
    root: T, renders: createRenderQueue(),
    agent: { running: new Map(), start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state }),
    startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  const ap = createAutopilot(ctx);
  const cards = () => projects.readNotes(dir).filter((n) => n.kind === "waiting").map((n) => n.open);
  state = [{ id: "character", stage: 1, status: "needs-you" }];
  await ap.taskEnded(id, { id: "c", status: "done", step: "character" });
  state = [{ id: "storyboard", stage: 2, status: "needs-you" }];
  await ap.taskEnded(id, { id: "s", status: "done", step: "storyboard" });
  state = [{ id: "motionSpec", stage: 3, status: "needs-you" }];
  await ap.taskEnded(id, { id: "m", status: "done", step: "motionSpec" });
  assert.deepEqual(cards(), ["character", "storyboard", "motion-plan"]);
  // Claude asked a question instead: no storyboard card, a card that points to its question in the chat
  state = [{ id: "storyboard", stage: 2, status: "needs-you", asking: true }];
  await ap.taskEnded(id, { id: "s2", status: "done", step: "storyboard" });
  assert.deepEqual(cards(), ["character", "storyboard", "motion-plan", "chat"]);
});

test("a cast that came from the library in its own style and passes its gate is used as it is, with nothing to approve", async () => {
  const dir = join(T, "work", "projects", "demo-own-cast");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  let gates = 0, pass = true, state = [{ id: "character", stage: 1, status: "needs-you" }];
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state }),
    characterGate: async () => { gates++; return { pass, characters: [] }; },
    startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  const ap = createAutopilot(ctx);
  const cast = (own) => writeFileSync(join(dir, "CHARACTERS.json"), JSON.stringify({ characters: [{ id: "pip", from: { library: "pip" }, ownStyle: own }] }));
  cast(true);
  await ap.taskEnded(id, { id: "c1", status: "done", step: "character" });
  assert.equal(gates, 1, "its gate ran");
  assert.equal(projects.getProject(id).meta.approvals?.characters?.by, "app");
  assert.equal(projects.readNotes(dir).filter((n) => n.kind === "waiting").length, 0, "nothing to approve");
  // a member drawn for this film (not its own style): the user approves, once its gate passes
  projects.updateMeta(id, (m) => { delete m.approvals; });
  cast(false);
  await ap.taskEnded(id, { id: "c2", status: "done", step: "character" });
  assert.equal(projects.getProject(id).meta.approvals?.characters, undefined);
  assert.deepEqual(projects.readNotes(dir).filter((n) => n.kind === "waiting").map((n) => n.open), ["character"]);
  pass = false;          // failing its gate: no card (Claude fixes it first)
  await ap.taskEnded(id, { id: "c3", status: "done", step: "character" });
  assert.equal(projects.readNotes(dir).filter((n) => n.kind === "waiting").length, 1);
});

test("a Motion Plan shot with no camera row is flagged and Claude adds it once, before the user is asked", async () => {
  const dir = join(T, "work", "projects", "demo-camera");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const row = (type) => ({ id: `m-${type}`, target: "#a", type, start: 0, duration: 1 });
  writeFileSync(join(dir, "MOTION-PLAN.json"), JSON.stringify({ version: 1, shots: [{ shot: 1, motions: [row("camera"), row("loop")] }, { shot: 2, motions: [row("loop")] }] }));
  const id = projects.openProject(dir).id;
  const started = [];
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async (_, o) => { started.push(o); return { id: `fix${started.length}` }; } },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [{ id: "motionSpec", stage: 3, status: "needs-you" }] }),
    startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  const ap = createAutopilot(ctx);
  const plan = await import("../packages/motion-plan/index.mjs");
  assert.deepEqual(plan.missingCamera(plan.read(dir).plan), [2]);
  await ap.taskEnded(id, { id: "m1", status: "done", step: "motionSpec" });
  assert.equal(started.length, 1); assert.equal(started[0].step, "motionSpec"); assert.match(started[0].text, /shot\(s\) 2 .*no camera row/);
  assert.equal(projects.readNotes(dir).filter((n) => n.kind === "waiting").length, 0, "the owner is asked after the fix");
  // the fix ended and a shot is still short: no second fix, the user is asked (the dialog flags the shot: GET motion-plan noCamera)
  await ap.taskEnded(id, { id: "fix1", status: "done", step: "motionSpec" });
  assert.equal(started.length, 1);
  assert.deepEqual(projects.readNotes(dir).filter((n) => n.kind === "waiting").map((n) => n.open), ["motion-plan"]);
});

test("the user's answer to a stage-4 step's question lets the stage go on (not the feedback loop's stop)", async () => {
  const dir = join(T, "work", "projects", "demo-answered");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  const started = [];
  const tasks = [{ id: "r", step: "qcReview", status: "done", resultText: "Bạn muốn tôi sửa đoạn đứng yên theo cách nào?" }, { id: "c", status: "done", resultText: "Đã sửa." }];
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => tasks, start: async (_, o) => { started.push(o); return { id: "s" }; } },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [{ id: "build", stage: 4, status: "done" }, { id: "sound", stage: 4, status: "ready", action: { kind: "claude", prompt: "Find music" } }] }),
    startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  await createAutopilot(ctx).taskEnded(id, { id: "c", status: "done" });
  assert.equal(started.at(-1)?.step, "sound");
  // a chat turn with no question before it: the feedback loop runs nothing by itself
  tasks[0].resultText = "Xong vòng Review.";
  started.length = 0;
  await createAutopilot(ctx).taskEnded(id, { id: "c", status: "done" });
  assert.equal(started.length, 0);
});

test("a step that stopped on a conflict or a missing thing gets a reminder card that points to the chat", async () => {
  const dir = join(T, "work", "projects", "demo-conflict");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [{ id: "brief", stage: 1, status: "needs-you", asking: true }] }),
    startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  await createAutopilot(ctx).taskEnded(id, { id: "b", status: "done", step: "brief" });
  assert.deepEqual(projects.readNotes(dir).filter((n) => n.kind === "waiting").map((n) => n.open), ["chat"]);
});

test("Prepare waits for the voice-over's words; when they land it starts; a Prepare that ran before them checks them once", async () => {
  const dir = join(T, "work", "projects", "demo-voice-wait");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  let transcribing = true, briefStatus = "ready";
  const started = [];
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], start: async (_, o) => { started.push(o); return { id: `t${started.length}` }; } },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: { voice: { transcribing } },
      state: [{ id: "brief", stage: 1, status: briefStatus, action: { kind: "claude", prompt: "Read the brief." } }] }),
    scanAssets: async () => null, startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  const ap = createAutopilot(ctx);
  assert.deepEqual(await ap.startStep(id, { id: "brief", action: { kind: "claude", prompt: "Read the brief." } }, { fromAuto: true }), { waiting: "transcript" });
  assert.equal(started.length, 0, "no Prepare while the words are being transcribed");
  assert.ok(projects.readNotes(dir).some((n) => /Prepare starts when the voice-over's words are ready/.test(n.text)));
  transcribing = false;
  await ap.transcriptLanded(id);
  assert.equal(started.at(-1)?.step, "brief", "the words are in: Prepare runs");
  // the user added a voice after Prepare ran: Claude checks the words against the brief once
  briefStatus = "done";
  await ap.transcriptLanded(id);
  assert.match(started.at(-1).text, /have just been transcribed[^]*is a conflict: stop and ask/);
});

test("a chat turn that changed a film whose last checks failed runs the checks again at once", async () => {
  const dir = join(T, "work", "projects", "demo-recheck");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  projects.updateMeta(id, (m) => { m.lastQa = { at: new Date().toISOString(), pass: false, blocking: 2, revision: "x" }; });
  let runs = 0;
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [] }),
    startQa: () => { runs++; return { id: "job" }; }, mix: { useOption: async () => null, placeSfx: async () => null },
  };
  const ap = createAutopilot(ctx);
  await ap.taskEnded(id, { id: "c1", status: "done", changed: ["compositions/s1.html"] });
  assert.equal(runs, 1, "the checks run again after the fix in the chat");
  await ap.taskEnded(id, { id: "c2", status: "done", changed: [] });
  assert.equal(runs, 1, "a turn that changed nothing does not");
});

test("the app reads the user's files before Prepare as a job the top bar names (\"Reading your files\")", async () => {
  const dir = join(T, "work", "projects", "demo-scan");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  const jobs = [];
  let scanned = 0;
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [] }),
    jobs: { start: (kind, meta, fn) => { const job = { kind, ...meta, update: () => {} }; jobs.push(job); Promise.resolve(fn(job)).finally(() => meta.onEnd?.(job)); return job; } },
    scanAssets: async () => { scanned++; }, startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  await createAutopilot(ctx).startStep(id, { id: "brief", action: { kind: "claude", prompt: "Read the brief." } }, { fromAuto: true });
  assert.deepEqual(jobs.map((j) => [j.kind, j.title, j.projectId]), [["scan", "Reading your files", id]]);
  assert.equal(scanned, 1);
});

test("a chat turn that changed a finished film runs its checks again in the background, so the Render reuses them", async () => {
  const dir = join(T, "work", "projects", "demo-finished-recheck");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  projects.updateMeta(id, (m) => { m.lastQa = { at: new Date().toISOString(), pass: true, blocking: 0, revision: "x" }; (m.pipeline ??= {}).finished = { at: new Date().toISOString() }; });
  const runs = [];
  let previews = 0;
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [] }), previewProxy: () => { previews++; },
    startQa: (_p, opts) => { runs.push(opts ?? null); return { id: "job" }; }, mix: { useOption: async () => null, placeSfx: async () => null },
  };
  const ap = createAutopilot(ctx);
  await ap.taskEnded(id, { id: "c1", status: "done", changed: ["film.js"] });
  assert.deepEqual([runs.length, previews], [1, 1], "the preview and the checks, once each");
  assert.deepEqual(runs[0], { background: true }, "in the background: no step follows them (#469: Exit lists them idle)");
  await ap.taskEnded(id, { id: "c2", status: "done", changed: [] });
  assert.equal(runs.length, 1, "a turn that changed nothing does not");
});

test("opening a finished film starts no step, not even one its pipeline lists as next", async () => {
  const dir = join(T, "work", "projects", "demo-open-finished");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  projects.updateMeta(id, (m) => { (m.pipeline ??= {}).finished = { at: new Date().toISOString() }; (m.approvals ??= {}).motionPlan = { at: new Date().toISOString() }; });
  let started = 0;
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], interrupted: () => null, start: async () => { started++; return { id: "t" }; } },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [{ id: "character", stage: 1, status: "ready", action: { kind: "claude", prompt: "x" } }] }),
    startQa: () => { started++; return { id: "job" }; }, mix: { useOption: async () => null, placeSfx: async () => null },
  };
  assert.equal(await createAutopilot(ctx).resumeOnOpen(id), null);
  assert.equal(started, 0);
});

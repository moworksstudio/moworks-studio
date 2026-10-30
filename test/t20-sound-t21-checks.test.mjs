// Test 20 and 21 fixes. T20-2: a frame's named sounds the search could not find are said (a close built-in sound stands in while the
// search does not answer), the cues Claude changes in the chat are placed again by themselves, and the Final Mix follows each placement.
// T21-5: a pose check that could not run is "Not checked", with its time limit by the film's length. T21-6: the pipeline says Claude is at
// work while the user's answer to its question runs. The network is stubbed: Openverse answers 504, as it did in Test 20.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t20-21-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
const sfx = await import("../packages/sfx/index.mjs");
const projects = await import("../packages/project-service/index.mjs");
const { createJobs } = await import("../packages/server/jobs.mjs");
const { boardRoutes } = await import("../packages/server/boards.mjs");
const { createAutopilot, createRenderQueue, storyboardChanged } = await import("../packages/server/autopilot.mjs");
const { readShots, updateFrame } = await import("../packages/hf-edit/shots.mjs");
const { gatePose, poseLimitMs } = await import("../packages/anidoodle-styles/posecheck.mjs");
const { lookAt } = await import("../packages/hf-qa/look.mjs");
const pipe = await import("../packages/pipeline/index.mjs");
const { APP_ROOT } = await import("../packages/version-manager/index.mjs");
after(() => rmSync(T, { recursive: true, force: true }));

const down = async (url) => (String(url).startsWith(sfx.OPENVERSE) ? new Response("", { status: 504 }) : new Response(readFileSync(sfx.bundled()[0].file)));
const hit = (id) => ({ id, title: `sound ${id}`, creator: "Someone", license: "cc0", license_version: "1.0", license_url: "https://creativecommons.org/",
  foreign_landing_url: `https://freesound.org/s/${id}`, url: `https://cdn.freesound.org/previews/${id}.mp3`, duration: 900, attribution: `"sound ${id}" by Someone`, provider: "freesound" });
const up = async (url) => (String(url).startsWith(sfx.OPENVERSE) ? Response.json({ results: [hit("b1")] }) : new Response(readFileSync(sfx.bundled()[0].file)));

test("T20-2: a close built-in sound stands in while the search does not answer; a name with none is said, apart from one nothing matched", async () => {
  const b = sfx.bundled();
  assert.equal(sfx.nearBundled("lamp ting", b)?.title, "chime", "a ting is the chime");
  assert.equal(sfx.nearBundled("boat bell", b)?.title, "chime");
  assert.equal(sfx.nearBundled("door click", b)?.title, "click");
  assert.equal(sfx.nearBundled("Whoosh", b)?.title, "whoosh", "its own name first");
  for (const n of ["river water", "wind", "blizzard", "oar paddle", "water bubbling", "the type block"]) assert.equal(sfx.nearBundled(n, b), null, n);

  const d = join(T, "resolve"); mkdirSync(d, { recursive: true });
  const cues = ["lamp ting", "river water", "whoosh"].map((name) => ({ name }));
  const r = await sfx.resolveCues(d, cues, { fetchImpl: down });
  assert.deepEqual([r.added.sort(), r.missing, r.failed, r.near], [["lamp ting", "whoosh"], ["river water"], ["river water"], [{ name: "lamp ting", as: "chime" }]]);
  const st = sfx.readState(d);
  assert.deepEqual([st.sounds["lamp ting"].near, st.sounds["lamp ting"].licence, st.sounds["lamp ting"].source], ["chime", "Pixabay Content License", "pixabay"], "credited as the sound it is");
  // the bundled-only pass never stands one in (it is no failed search)
  const d2 = join(T, "local"); mkdirSync(d2, { recursive: true });
  assert.deepEqual((await sfx.resolveCues(d2, cues, { fetchImpl: down, online: false })).near, []);
  // the search answers again: the stand-in is looked up and replaced by the sound itself
  const again = await sfx.resolveCues(d, cues, { fetchImpl: up });
  assert.deepEqual([again.added.sort(), again.near], [["lamp ting", "river water"], []]);
  assert.equal(sfx.readState(d).sounds["lamp ting"].near, undefined);
  assert.equal(sfx.readState(d).sounds["lamp ting"].source, "openverse");
});

test("T20-2: the placement's line names what was left out and what stands in, in plain words, as a warning the chat shows", () => {
  const plain = sfx.placedNote({ placed: 6, names: ["pop", "typing", "whoosh"], missing: [], near: [] });
  assert.deepEqual(plain, { text: "Sound effects placed by the app: {n} ({names})", vars: { n: 6, names: "pop, typing, whoosh" } });
  const n = sfx.placedNote({ placed: 7, names: ["lamp ting", "pop", "whoosh"], missing: ["river water", "zzz"], failed: ["river water"], near: [{ name: "lamp ting", as: "chime" }] });
  assert.equal(n.status, "warning");
  const said = n.text.replace(/\{(\w+)\}/g, (m, k) => n.vars[k]);
  assert.match(said, /A close built-in sound stands in for now: "lamp ting" \(chime\)/);
  assert.match(said, /Left out because the sound search did not answer: "river water"\. Press Place them again in the Final Mix later/);
  assert.match(said, /No sound found for "zzz": ask Claude for other names/);
  assert.doesNotMatch(said, /[\\/]|\.mp3|assets/, "no paths");
});

// a one-page film of three frames whose cues the chat changes
async function film(name) {
  const dir = join(T, "work", "projects", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<!doctype html><html><body><div id="root" data-composition-id="main" data-start="0" data-duration="6" data-width="1920" data-height="1080"></div></body></html>');
  writeFileSync(join(dir, "STORYBOARD.md"), "# Storyboard\n\n## Frame 1 — Lamp\n- duration: 2s\n- sfx: whoosh\n\n## Frame 2 — River\n- duration: 2s\n\n## Frame 3 — Night\n- duration: 2s\n");
  const p = projects.openProject(dir);
  const ctx = { root: APP_ROOT, jobs: createJobs(), stopping: new AbortController(), preview: { base: "" }, agent: null };
  class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
  boardRoutes(ctx, { r: (...a) => a, P: "([\\w-]+)", mustProject: (id) => projects.getProject(id), HttpError });
  return { dir, p: projects.getProject(p.id), ctx };
}

test("T20-2: the cues Claude changes in the chat are placed again by themselves, with the left-out names said; the Final Mix follows", { timeout: 120000 }, async () => {
  const was = globalThis.fetch;
  globalThis.fetch = down;          // Openverse answers 504 to every search, as in Test 20
  try {
    const { dir, p, ctx } = await film("demo-cues");
    assert.equal(await ctx.mix.cuesAgain(p), null, "nothing placed yet: the Final Mix places them first");
    await ctx.mix.placeSfx(p);
    const first = sfx.readState(dir);
    assert.deepEqual(first.mounted.map((m) => m.name), ["whoosh"]);
    assert.ok(first.placedAt && first.cueKey, "when, and from which cues");
    assert.equal(await ctx.mix.cuesAgain(p), null, "the cues did not change: nothing to do");
    // Claude writes the frame's `- sfx:` line in the chat ("lamp ting" is in the app's offline library; "heartbeat" nowhere while the
    // search is down)
    await updateFrame(dir, 2, { sfx: "lamp ting, heartbeat@0.5" });
    const res = await ctx.mix.cuesAgain(p);
    assert.ok(res, "placed again");
    assert.deepEqual(res.names.sort(), ["lamp ting", "whoosh"]);
    assert.ok(ctx.jobs.list({ kind: "mix-sfx" }).some((j) => j.projectId === p.id && j.status === "done"), "as a job the Editor shows (appBusy)");
    const html = readFileSync(join(dir, "index.html"), "utf8");
    assert.match(html, /src="assets\/3_audio\/sfx\/bell-[td]ing-\d\.ogg" data-start="2"/, "the library's ting at the frame's start, no search needed");
    const st = sfx.readState(dir);
    assert.notEqual(st.placedAt, first.placedAt, "the Final Mix and the timeline read it again");
    assert.deepEqual(st.left, { missing: ["heartbeat"], near: [] });
    const note = projects.readNotes(dir).filter((x) => x.kind === "sfx").at(-1);
    assert.equal(note.status, "warning", "the chat shows it");
    assert.match(note.vars.failed, /"heartbeat"/);
    assert.equal(await ctx.mix.cuesAgain(p), null, "placed once per change");
  } finally { globalThis.fetch = was; }
});

test("T20-2: a chat turn that changed STORYBOARD.md asks for the cues to be placed again, before anything else; other turns do not", async () => {
  assert.equal(storyboardChanged([{ status: "M", path: "STORYBOARD.md" }]), true);
  assert.equal(storyboardChanged([{ status: "M", path: "boards/A/STORYBOARD.md" }, { path: "index.html" }]), false);
  const dir = join(T, "work", "projects", "demo-turn");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  const asked = [];
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async () => ({ id: "t" }), list: () => [] },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [] }), startQa: () => null,
    mix: { cuesAgain: async (p) => { asked.push(p.id); return null; } } };
  const ap = createAutopilot(ctx);
  await ap.taskEnded(id, { id: "c1", status: "done", changed: [{ status: "M", path: "STORYBOARD.md" }] });
  assert.deepEqual(asked, [id]);
  await ap.taskEnded(id, { id: "c2", status: "done", changed: [{ status: "M", path: "index.html" }] });
  await ap.taskEnded(id, { id: "s1", status: "done", step: "storyboard", changed: [{ status: "M", path: "STORYBOARD.md" }] });
  assert.deepEqual(asked, [id], "only a chat turn that changed the storyboard");
});

test("T20-2: the Editor reads the Final Mix again when the sound effects are placed (GET /pipeline's sfx), and shows the app at work", () => {
  const src = readFileSync(join(import.meta.dirname, "..", "packages", "server", "index.mjs"), "utf8");
  assert.match(src, /kind: "mix-sfx"[^\n]*stage: "finalMix", key: "Placing the sound effects"/);
  assert.match(src, /sfx: \(\(\) => \{ const s = readSfxState\(p\.path\); return \{ placed: \(s\.mounted \?\? \[\]\)\.length, at: s\.placedAt \?\? null \}; \}\)\(\)/);
  const ed = readFileSync(join(import.meta.dirname, "..", "ui", "src", "screens", "Editor.jsx"), "utf8");
  assert.match(ed, /<MixSheet key=\{sfxAt \?\? "none"\}/, "a new placement reads the dialog's count again");
});

test("T21-5: the pose check's time grows with the film; one that could not run is Not checked with why, never a warning or a pass", async () => {
  assert.equal(poseLimitMs(10, 30), 180000, "never under 3 min");
  assert.equal(poseLimitMs(100, 24), 480000, "Test 21's 100 s film at 24 fps: 8 min, not 3");
  assert.equal(poseLimitMs(600, 60), 720000, "past 3600 frames every n-th is drawn");
  assert.ok(poseLimitMs(1e6, 60) <= 900000);
  const d = join(T, "pose");
  mkdirSync(join(d, "anidoodle"), { recursive: true }); mkdirSync(join(d, ".moworks", "library", "anidoodle", "engine", "src"), { recursive: true });
  writeFileSync(join(d, "anidoodle", "page.ts"), "export {};\n");
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="100" data-fps="24"></div>');
  const late = await gatePose(d, { timeoutMs: 1 });
  assert.deepEqual([late.id, late.blocking, late.pass, late.notChecked], ["G-POSE", false, false, true]);
  assert.match(late.why, /ran out of its time/);
  assert.match(late.findings[0].message, /could not run: the check ran out of time/);
  const none = await gatePose(d);          // the page mounts no film: the check did not see one pose
  assert.equal(none.notChecked, true);
  assert.equal(none.timeLimitS, 480, "the limit from the film's own length");
  assert.match(none.why, /stopped with an error/);
  const look = lookAt({ checks: [late, { id: "G-FONT", blocking: true, pass: true, findings: [] }] });
  assert.deepEqual([look.count, look.skipped.map((c) => c.id), look.blocking.length], [0, ["G-POSE"], 0], "no warning about the film: Not checked");
  // the Pipeline's row can say it: checks.notChecked
  mkdirSync(join(d, ".moworks", "cache", "qa"), { recursive: true });
  writeFileSync(join(d, ".moworks", "cache", "qa", "last.json"), JSON.stringify({ revision: "r1", checks: [late] }));
  assert.deepEqual([pipe.qaWarnings({ revision: "r1" }, d), pipe.qaNotChecked({ revision: "r1" }, d)], [0, 1]);
  const qa = readFileSync(join(import.meta.dirname, "..", "ui", "src", "screens", "Qa.jsx"), "utf8");
  assert.match(qa, /c\.why \? t\(c\.why\) : notCheckedWhy\(c, t\)/, "the Tech checks sheet says why");
});

test("T21-6: while the user's answer to Prepare's question runs, the API says Claude is working on Prepare, not that it asks", () => {
  const steps = [
    { id: "brief", stage: 1, title: "Prepare", action: { kind: "claude" }, done: { kind: "mark", file: "BRIEF.md", ask: true } },
    { id: "storyboard", stage: 2, title: "Storyboard", needs: ["brief"], gate: true, action: { kind: "claude" }, done: { kind: "approval", name: "storyboard" } },
  ];
  const facts = (over = {}) => ({ brief: { text: "x", mode: "idea", at: 1000 }, assets: { count: 0, sources: 0 }, file: () => null, storyboard: { real: false },
    motionPlan: { exists: false }, approvals: {}, voice: { file: null, transcript: null, transcribing: false }, marks: {}, skips: {}, ran: { brief: { at: new Date(900).toISOString() } },
    built: { ok: false }, qa: null, flags: {}, runningStep: null, claudeBusy: false, ...over });
  const asking = pipe.computePipeline(steps, facts());
  assert.deepEqual([asking[0].status, asking[0].asking, asking[0].reason.key], ["needs-you", true, "Claude is asking: answer in the chat"]);
  for (const f of [facts({ claudeBusy: true }), facts({ claudeBusy: true, claudeStarting: true })]) {          // the answer running, or being sent
    const s = pipe.computePipeline(steps, f);
    assert.deepEqual([s[0].status, s[0].asking, s[0].reason.key], ["running", undefined, "Claude is working on it"]);
    assert.equal(pipe.nextAuto(s), null, "nothing else starts");
    assert.equal(s[1].status, "blocked");
    const row = pipe.stagesOf(s, f)[0];
    assert.deepEqual([row.status, row.line], ["running", "Preparing the film"], "the row says the same");
  }
  // a step's own task (not the answer) leaves the question as it is: Claude works on another step
  const other = pipe.computePipeline(steps, facts({ claudeBusy: true, runningStep: "music" }));
  assert.equal(other[0].status, "needs-you");
});

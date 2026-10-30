// Test 25 and Test 27's bugs: the Final Mix's "Ask Claude for 3 new tracks" started nothing (T25-2); the smooth preview stayed out of
// date with no job behind it after the Final Mix's changes (T25-3); the chat stood at "Drawing…" after the task ended (T25-7); the
// Build's report came in English in a Vietnamese film (T27-8). Run: node --test test/t25-t27.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t25-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");          // signed out: a task that reaches Claude answers 412 (or 503 with no Claude)
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
after(() => rmSync(T, { recursive: true, force: true }));
const projects = await import("../packages/project-service/index.mjs");
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

// ---- T25-2
const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");

const FIND = "Find three other music tracks on mixkit.co for this film, different from the ones I heard (Owies Ukulele). Hand them to me with the app's music_options tool, then stop.";

test("T25-2: a dialog's step (the Final Mix) starts Claude with the user's own words; with none it starts nothing", async () => {
  const dir = join(T, "work", "projects", "demo-t25-mix");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const p = projects.openProject(dir);
  const started = [];
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], start: async (_id, t) => { started.push(t); return { id: `t${started.length}` }; } },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [] }), startQa: () => null, mix: {} };
  const ap = createAutopilot(ctx);
  const finalMix = { id: "finalMix", stage: 5, status: "done", action: { kind: "dialog", dialog: "mix" } };
  const out = await ap.startStep(p.id, finalMix, { text: FIND });
  assert.deepEqual(out, { task: { id: "t1" } }, "the answer names the task, never null");
  assert.equal(started.length, 1);
  assert.equal(started[0].text, FIND);
  assert.equal(started[0].step, "finalMix");
  assert.equal(await ap.startStep(p.id, finalMix, {}), null, "no words, nothing to ask Claude");
  assert.equal(started.length, 1);
});

test("T25-2: POST pipeline/finalMix/run reaches Claude, or says why not (the web off); never 200 with nothing started", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, path, b) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, json: await r.json() }; };
    const p = (await call("POST", "/projects", { title: "demo-t25-final-mix", aspect: "16:9", durationSec: 10, styleId: "general", brief: "Phim về chú mèo" })).json;
    projects.updateMeta(p.id, (m) => { m.pipeline = { ...(m.pipeline ?? {}), autopilot: false, skips: { sound: { at: new Date().toISOString() } }, marks: {}, ran: {} }; });
    const step = (await call("GET", `/projects/${p.id}/pipeline`)).json.steps?.find((x) => x.id === "finalMix");
    assert.ok(step && step.status !== "blocked", `the Final Mix is open: ${JSON.stringify(step)}`);
    await call("PATCH", `/projects/${p.id}/settings`, { web: "off" });
    const off = await call("POST", `/projects/${p.id}/pipeline/finalMix/run`, { text: FIND });
    assert.deepEqual([off.status, off.json.error?.code], [409, "WEB_OFF"]);
    assert.match(off.json.error.message, /The web is off for this project, so Claude cannot look for music on Mixkit/);
    await call("PATCH", `/projects/${p.id}/settings`, { web: "on" });
    const on = await call("POST", `/projects/${p.id}/pipeline/finalMix/run`, { text: FIND });
    // signed out here: the request got as far as Claude's sign-in, which says why (before the fix: 200 null, and the dialog said "looking")
    assert.notEqual(on.status, 200, JSON.stringify(on.json));
    assert.ok(["CLAUDE_SIGNED_OUT", "NO_CLAUDE"].includes(on.json.error?.code), JSON.stringify(on.json));
  } finally { await s.close(); }
});

// ---- T25-3
const { filmHash, filmParts, proxyRoutes } = await import("../packages/server/proxy.mjs");
const { createJobs } = await import("../packages/server/jobs.mjs");

const film =(name, styleId, html) => {
  const dir = join(T, "films", name);
  mkdirSync(join(dir, "compositions"), { recursive: true }); mkdirSync(join(dir, ".moworks", "cache", "proxy"), { recursive: true });
  writeFileSync(join(dir, "index.html"), html); writeFileSync(join(dir, "compositions", "a.js"), "draw()");
  return { id: name, path: dir, title: name, meta: { style: { id: styleId }, format: { fps: 24 }, pipeline: { delivered: { at: "2026-10-30T00:00:00Z" } } } };
};
/** The state a background render writes today for the film as it is now (picture, drawn, sound). */
const rendered = (p, extra = {}) => {
  const { picture, sound, drawn } = filmParts(p.path, 24), hash = filmHash(p.path, 24), file = `.moworks/cache/proxy/${hash}.mp4`;
  writeFileSync(join(p.path, file), "mp4");
  writeFileSync(join(p.path, ".moworks", "cache", "proxy", "proxy.json"), JSON.stringify({ hash, picture, drawn, sound, file, fps: 24, quality: "standard", ...extra }));
};
const PAGE = (sounds) => `<html>\n  <div data-composition-id="root" data-duration="10">one</div>\n${sounds.map((s) => `    <audio id="${s}" src="assets/3_audio/sfx/${s}.mp3" data-start="1"></audio>\n`).join("")}</html>\n`;

test("T25-3: a sound taken out by the Final Mix leaves the picture drawn the same: its sound is mixed again, no full render", () => {
  const p = film("drawn", "lemo-sample", PAGE(["pop", "whoosh", "bell"]));
  const a = filmParts(p.path, 24);
  writeFileSync(join(p.path, "index.html"), PAGE(["pop", "bell"]));          // × on one sound: its line is left empty
  const b = filmParts(p.path, 24);
  assert.notEqual(b.picture, a.picture, "the page's text is not the same (the empty line): the checks' hash moves as before");
  assert.equal(b.drawn, a.drawn, "but nothing drawn changed");
  assert.notEqual(b.sound, a.sound);
  writeFileSync(join(p.path, "index.html"), PAGE(["pop", "bell"]).replace(">one<", ">two<"));
  assert.notEqual(filmParts(p.path, 24).drawn, a.drawn, "a change to the picture still counts");
  // the route: stale, sound only (mixed again in seconds), for a render recorded with its drawn hash
  writeFileSync(join(p.path, "index.html"), PAGE(["pop", "whoosh", "bell"]));
  rendered(p);
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: { start: () => { throw new Error("no render in this test"); } } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z-]+)", mustProject: () => p });
  const get = routes.find(([m]) => m === "GET")[2];
  assert.equal(get(["drawn"]).status, "fresh");
  writeFileSync(join(p.path, "index.html"), PAGE(["pop", "bell"]));
  assert.deepEqual([get(["drawn"]).status, get(["drawn"]).soundOnly], ["stale", true]);
});

test("T25-3: asked again while its job ran (a Final Mix change during the render), the preview is made again once that job ends", async () => {
  const p = film("again", "brush-cartoon", PAGE(["pop"]));
  rendered(p, { quality: "high" });          // fresh, with no Smooth copy yet: the first job makes only that copy
  const other = { projectId: "x", title: "Other film" };
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: createJobs(), agent: { running: new Set() }, renders: { status: () => ({ running: other, queued: 0 }) } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z-]+)", mustProject: () => p });
  const first = ctx.previewProxy("again");
  assert.ok(first, "the Smooth copy is made");
  writeFileSync(join(p.path, "index.html"), PAGE(["pop"]).replace(">one<", ">two<"));          // the film changes while it runs
  assert.equal(ctx.previewProxy("again"), first, "one job at a time: the ask is kept for later");
  await wait(300);
  const jobs = ctx.jobs.list({ kind: "preview-proxy", projectId: "again" });
  assert.equal(jobs.length, 2, "made again after the first job ended, not left stale with no job");
  const second = jobs.find((j) => j.id !== first.id);
  assert.deepEqual([second.status, second.stage, second.waitingFor], ["running", "waiting", "Other film"]);
  const get = routes.find(([m]) => m === "GET")[2];
  assert.deepEqual([get(["again"]).status, get(["again"]).job?.id], ["rendering", second.id]);
  ctx.jobs.cancel(second.id);
  await wait(200);
  assert.equal(ctx.jobs.get(second.id).status, "cancelled");
  await wait(100);
  assert.equal(ctx.jobs.list({ kind: "preview-proxy", projectId: "again" }).length, 2, "a stopped job is not started again by itself");
  const v = get(["again"]);
  assert.deepEqual([v.status, v.job], ["stale", null], "out of date with nothing making it: the Editor offers its Update (never \"Updating…\")");
});

test("T25-3: the Editor's Update starts it while Claude works too: the job waits for Claude instead of starting nothing", async () => {
  const p = film("update", "lemo-sample", PAGE(["pop"]));
  rendered(p);
  writeFileSync(join(p.path, "index.html"), PAGE(["pop"]).replace(">one<", ">two<"));
  const running = new Set(["update"]);
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: createJobs(), agent: { running }, renders: { status: () => ({ running: null, queued: 0 }) } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z-]+)", mustProject: () => p });
  assert.equal(ctx.previewProxy("update"), null, "the pipeline's own ask waits for Claude's change, as before");
  const post = routes.find(([m]) => m === "POST")[2];
  const v = post(["update"]);
  assert.equal(v.status, "rendering");
  await wait(100);
  assert.deepEqual([ctx.jobs.get(v.job.id).stage, ctx.jobs.get(v.job.id).waitingFor], ["waiting", "Claude"]);
  ctx.jobs.cancel(v.job.id);
  await wait(200);
});

// ---- T25-7
const { watchTask } = await import("../ui/src/editor/taskWatch.js");

test("T25-7: the chat's watch ends when a read says the task ended, after reads that failed or were never answered", async () => {
  const signals = [];
  let n = 0;
  const answers = [
    () => { throw new Error("Request failed (500)"); },          // a read that fails
    (signal) => new Promise(() => { signals.push(signal); }),          // a read a busy server never answers
    () => ({ running: "t1" }),          // the task still runs
    () => ({ running: null }),          // it ended: the working state ends
  ];
  const stop = watchTask(async (signal) => answers[n++](signal), { fast: 5, slow: 10, limit: 40 });
  await wait(400);
  assert.equal(n, 4, "read until the task is seen ended, then no more");
  assert.equal(signals[0].aborted, true, "the read never answered is given up (its connection freed)");
  await wait(100);
  assert.equal(n, 4);
  stop();
});

test("T25-7: stop() ends the watch at once; a slow server gets a longer wait after each read that ran out of time", async () => {
  let n = 0;
  const stop = watchTask(async () => { n++; return { running: "t1" }; }, { fast: 5, slow: 10, limit: 40 });
  await wait(60);
  stop();
  const seen = n;
  assert.ok(seen >= 2);
  await wait(60);
  assert.equal(n, seen, "no read after stop()");
  // the server answers each read after 60 ms: the first read runs out of time (40 ms), the second is waited for (80 ms)
  const got = [];
  const stop2 = watchTask((signal) => new Promise((ok) => { const h = setTimeout(() => ok({ running: null }), 60); signal.addEventListener("abort", () => { clearTimeout(h); got.push("aborted"); }); }).then((r) => { got.push("answer"); return r; }),
    { fast: 5, slow: 10, limit: 40, most: 160 });
  await wait(300);
  assert.deepEqual(got, ["aborted", "answer"]);
  stop2();
});

// ---- T27-8
const A = await import("../packages/agent/index.mjs");

test("T27-8: every task's request ends with the owner's language, and the app's tools remind it after their English answers", async () => {
  const BUILD = "Build the film of the approved storyboard to the approved Motion Plan as your rules say. Write no sound effects or music.";
  const vi = A.taskRequest({ target: "Target: the whole project.", pipeline: "Pipeline: build running", msg: BUILD, lang: "vi" });
  assert.ok(vi.startsWith("Target: the whole project.\n\nPipeline: build running\n\nRequest:\nBuild the film"));
  assert.match(vi, /\n\nWrite to the owner in Vietnamese: every note between your tool calls and your report at the end, every sentence[^\n]*$/, "the last words Claude reads before it works");
  const en = A.taskRequest({ target: "Target: the whole project.", msg: BUILD, lang: "en" });
  assert.match(en, /\n\nWrite to the owner in English: every note between your tool calls and your report at the end\.$/);
  assert.doesNotMatch(en, /Vietnamese/);
  // the system prompt says it as before
  assert.match(A.systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: process.cwd(), step: "build", lang: "vi" }), /Reply to the owner in Vietnamese only/);
  // an app tool's answer (the pose check's English) ends with the reminder in a Vietnamese film
  const agent = new A.Agent({ root: T, getProject: (id) => ({ id, path: T, meta: {} }), appTools: { pose_check: async () => "All 2250 frames pass." } });
  agent.tasks.set("b1", { id: "b1", projectId: "p", status: "running", events: [], step: "build", lang: "vi" });
  assert.equal((await agent.callTool("b1", "pose_check")).text, "All 2250 frames pass.\n\n(Your words to the owner stay in Vietnamese, the report at the end too.)");
  agent.tasks.set("b2", { id: "b2", projectId: "p", status: "running", events: [], step: "build", lang: "en" });
  assert.equal((await agent.callTool("b2", "pose_check")).text, "All 2250 frames pass.", "an English film: the answer as it is");
});

test("T27-8: a step's language is the owner's: their chat, else their brief; never the app's own English tasks", () => {
  const brief = "Phim về Bơ và Hạt Tiêu, lời đọc tiếng Việt.";
  assert.equal(A.taskLanguage({ step: "build", text: "Build the film of the approved storyboard to the approved Motion Plan.", earlier: [], brief }), "vi", "a step's English prompt decides nothing");
  // the app's fix after the compiler (no step of its own) is not the owner's chat
  const fix = { id: "f", by: "app", text: "The film's code does not compile, so the film cannot be drawn or rendered. Fix only what it names." };
  assert.equal(A.taskLanguage({ step: "build", text: "Build the film.", earlier: [fix], brief }), "vi");
  assert.equal(A.taskLanguage({ step: "build", text: "Build the film.", earlier: [{ id: "c", text: "Please make the logo bigger" }], brief }), "en", "the owner writing English");
  // a chat message with notes pinned on the film: the owner's own words, not the app's wrapping
  assert.equal(A.taskLanguage({ text: "Notes on shot 1: make the title come in later and slower please", shown: "Chữ tên phim vào chậm hơn", earlier: [], brief }), "vi");
});

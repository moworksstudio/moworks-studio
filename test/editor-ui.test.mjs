// The Editor for pipeline v2: the six stages, the Assets tab and the Claude column render on the server through
// Vite with sample data; what the user must see is checked in the markup (stages 1-3 locked while the app runs, Continue after a stop,
// a missing file with Relink, the chat without the review tray). Effects do not run, so nothing is fetched.
import { join } from "node:path";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

const store = new Map();
globalThis.location ??= { hash: "", href: "http://127.0.0.1/", origin: "http://127.0.0.1", search: "" };
globalThis.localStorage ??= { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.innerWidth ??= 1600;
globalThis.document ??= { documentElement: { dataset: {}, style: {}, setAttribute() {} }, addEventListener() {}, removeEventListener() {}, getElementById: () => null, hidden: false };

const vite = await createServer({ configFile: join(import.meta.dirname, "..", "ui", "vite.config.js"), server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent",
  optimizeDeps: { noDiscovery: true } });
after(() => vite.close());
const load = (p) => vite.ssrLoadModule(p);
async function render(el) {
  const { LangProvider } = await load("/src/i18n.jsx");
  const { ToastProvider } = await load("/src/lib.jsx");
  return renderToString(h(LangProvider, null, h(ToastProvider, { render: () => null }, el)));
}
const noop = () => {};

const stage = (n, id, title, status, line = null, open = null) => ({ n, id, title, status, line, lineVars: {}, steps: [], gate: n === 2 || n === 3, open });
const STAGES = (build = "running") => [stage(1, "prepare", "Prepare", "done", "Brief ready · {n} file(s)", "brief"), stage(2, "storyboard", "Storyboard", "done", "Storyboard approved", "storyboard"),
  stage(3, "motion", "Motion", "done", "Motion approved for {n} shot(s)", "motion-plan"), stage(4, "build", "Build and self-check", build, build === "stopped" ? "Stopped: write “continue” in the chat" : "Building"),
  stage(5, "feedback", "Feedback", "todo"), stage(6, "finalMix", "Final Mix", "todo", "After the build", "mix")];

test("the Pipeline column shows five stages (no Feedback row) and locks stages 1-3 while the app runs", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const html = await render(h(Pipeline, { projectId: "p1", data: { stages: STAGES(), autopilot: { running: "build" }, estimate: { minutes: 12 } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.equal((html.match(/class="pl-stage /g) ?? []).length, 5);
  assert.doesNotMatch(html, />Feedback</);
  assert.match(html, /Press Stop in the chat to change this/);
  assert.match(html, /about 12 min/);
  // the Prepare links (Brief, Words) are off while the build runs; the dialogs open from the bar above the chat input
  const links = html.match(/<span class="pl-links">(.*?)<\/span>/)?.[1] ?? "";
  assert.match(links, /disabled=""[^>]*>Brief</);
  assert.doesNotMatch(html, /pl-open|Open Storyboard|Open Motion/);
  assert.doesNotMatch(html, />Continue</);
  assert.doesNotMatch(html, />Working</, "no word on the running stage (#193)");
});

test("the chat's suggestions follow the stage the film is at", async () => {
  const { currentStage } = await load("/src/workflow/Pipeline.jsx");
  const { default: ClaudePanel } = await load("/src/editor/ClaudePanel.jsx");
  assert.equal(currentStage(STAGES()), "build");
  const fresh = STAGES().map((s) => ({ ...s, status: s.n === 1 ? "done" : "todo" }));
  assert.equal(currentStage(fresh), "storyboard");
  const built = STAGES("done").map((s) => (s.id === "feedback" ? { ...s, status: "waiting" } : s));
  assert.equal(currentStage(built), "feedback", "Final Mix is optional: a built film is at Feedback");
  assert.equal(currentStage(built.map((s) => (s.id === "finalMix" ? { ...s, status: "running" } : s))), "finalMix");
  const sug = async (stage) => (await render(h(ClaudePanel, { projectId: "p1", onChanged: noop, steps: [], stage }))).match(/class="csuggest">(.*?)<\/div>/)?.[1] ?? "";
  assert.match(await sug("storyboard"), /idea behind the storyboard/);          // one option (not "each option")
  assert.match(await sug("finalMix"), /music/);
  assert.doesNotMatch(await sug("storyboard"), /Watch the film/);
});

test("a stopped stage offers Continue and the buttons are back", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const html = await render(h(Pipeline, { projectId: "p1", data: { stages: STAGES("stopped"), autopilot: { running: null, stopped: { step: "build" } } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(html, />Continue</);
  assert.doesNotMatch(html, /Press Stop in the chat/);
  assert.doesNotMatch(html.match(/<span class="pl-links">(.*?)<\/span>/)?.[1] ?? "", /disabled/);
});

test("the Assets tab groups the files and offers Relink for a missing one", async () => {
  const AssetsPanel = (await load("/src/editor/AssetsPanel.jsx")).default;
  const items = [
    { path: "assets/1_images/logo.png", name: "logo.png", folder: "assets/1_images", kind: "image", size: 2048, status: "ok", usedIn: [1, 4] },
    { path: "assets/1_images/bg.png", name: "bg.png", folder: "assets/1_images", kind: "image", size: 0, status: "missing", usedIn: [2] },
    { path: "assets/3_audio/voiceover/vo.mp3", name: "vo.mp3", folder: "assets/3_audio/voiceover", kind: "audio", size: 500000, duration: 28, status: "ok", usedIn: [], onTimeline: true, transcript: "saved" },
    { path: "assets/1_images/new.jpg", name: "new.jpg", folder: "assets/1_images", kind: "image", size: 1000, status: "new", usedIn: [] },
  ];
  const html = await render(h(AssetsPanel, { projectId: "p1", items, reload: noop, fileUrl: (p) => `/f/${p}`, locked: false, onImport: noop, onTranscript: noop, onShot: noop }));
  assert.match(html, /Missing files/);
  assert.match(html, />Relink</);
  // the user's folders: 1_Images … 5_Audio, Audio holding Voice / SFX / Music
  const at = (x) => html.indexOf(`<span>${x}</span>`);
  assert.ok(at("1_Images") >= 0 && at("1_Images") < at("5_Audio") && at("5_Audio") < at("Voice"), JSON.stringify([at("1_Images"), at("5_Audio"), at("Voice")]));
  assert.match(html, /class="as-grp audio-voiceover sub"/);
  assert.match(html, /class="as-thumb audio voiceover"/, "a voice-over file's icon in its lane colour (#156)");
  assert.doesNotMatch(html, /words checked|on the timeline|from the app/);          // no side notes
  assert.match(html, />New</);
  assert.ok(html.indexOf("Missing files") < html.indexOf("1_Images"), "missing files come first");
});

test("the Claude column has three blocks: the conversation, the dialogs to open, the input with suggestions", async () => {
  const { default: ClaudePanel } = await load("/src/editor/ClaudePanel.jsx");
  const actions = [{ key: "sb", label: "Open Storyboard", onClick: noop, att: true }, { key: "mo", label: "Open Motion", onClick: noop }];
  const html = await render(h(ClaudePanel, { projectId: "p1", onChanged: noop, steps: [], actions }));
  const order = ["cpanel chist", "cpanel cacts", "cpanel composer"].map((c) => html.indexOf(`class="${c}"`));
  assert.ok(order.every((i) => i >= 0) && order[0] < order[1] && order[1] < order[2], JSON.stringify(order));
  assert.match(html, /class="btn sm cact att"[^>]*>.*?Open Storyboard/);
  assert.match(html, /class="csuggest"/);
  assert.doesNotMatch(html, /To review/);
});

test("the film-done note is one green block that hands the film over, with no score", async () => {
  const { FilmDone } = await load("/src/editor/ClaudePanel.jsx");
  const n = { kind: "pipeline", event: "film-done", vars: { n: 1, score: 8 },
    qc: { final: 8, rounds: [{ round: 2, scores: { hook: 8, phone: 8, motion: 8, variety: 8, composition: 8, brand: 9, sync: 8 } }] } };
  const html = await render(h(FilmDone, { n }));
  assert.match(html, /class="cdone"/);
  assert.match(html, /The film is done \(version 1\)/);
  assert.doesNotMatch(html, /\/10</, "no score at the hand-over");
  assert.equal((html.match(/<li><span>/g) ?? []).length, 0);
  assert.match(html, /Final Mix/);
});

test("tool lines name a file by its name, a search by its last plain segment, the project's folder as project files", async () => {
  const { shortPath } = await load("/src/editor/ClaudePanel.jsx");
  assert.equal(shortPath(".moworks/rules/general-style/SKILL.md"), "SKILL.md");
  assert.equal(shortPath("D:/Moworks Studio/projects/human-test-01/BRIEF.md"), "BRIEF.md");
  assert.equal(shortPath("D:/Moworks Studio/projects/human-test-01"), "project files");
  assert.equal(shortPath(".moworks/rules/general-style/**/*"), "general-style");
  assert.equal(shortPath(".moworks"), "project files");
  assert.equal(shortPath(String.raw`D:\Moworks Studio\projects\human-test-01\NOTES.md`), "NOTES.md");
});

test("the chat keeps Claude's, the user's and the milestones, leaves out the app's side notices, the running task last", async () => {
  const { threadOf } = await load("/src/editor/ClaudePanel.jsx");
  const n = (id, at, kind, extra = {}) => ({ id, at, kind, text: kind, ...extra });
  const notes = [n("a", "01", "assets"), n("b", "02", "boards"), n("c", "03", "library"), n("d", "04", "pipeline"), n("e", "05", "sfx", { vars: { n: 4 } }),
    n("f", "06", "voice"), n("g", "07", "checks"), n("h", "08", "checks", { status: "error" }), n("i", "09", "render", { file: "renders/x.mp4" }), n("j", "10", "music")];
  const tasks = [{ id: "t1", createdAt: "01.5", status: "done", events: [] }, { id: "t2", createdAt: "05.5", status: "running", events: [] }];
  const out = threadOf(tasks, notes);
  assert.deepEqual(out.map((x) => (x.task ? x.task.id : x.note.id)), ["t1", "d", "h", "i", "t2"]);
});

test("a running task's card says Claude's whole message, without markdown marks", async () => {
  const { plainText } = await load("/src/editor/ClaudePanel.jsx");
  const msg = "Tôi đã chấm vòng 1 và sửa 3 lỗi nặng nhất (chuyển cảnh hơi nước, hình dạng hơi nước). **Bước tiếp theo** là `QC`.\n\n- shot 2\n- shot 4";
  assert.equal(plainText(msg), "Tôi đã chấm vòng 1 và sửa 3 lỗi nặng nhất (chuyển cảnh hơi nước, hình dạng hơi nước). Bước tiếp theo là QC.\n\n• shot 2\n• shot 4");
  assert.ok(!plainText("word ".repeat(80)).includes("…"));
});

test("the player's clock counts frames at the film's rate", async () => {
  const { fmtTime } = await load("/src/editor/Player.jsx");
  assert.equal(fmtTime(3.5333, 30), "00:03:16");
  assert.equal(fmtTime(3.5667, 30), "00:03:17");
  assert.equal(fmtTime(10, 30), "00:10:00");
  assert.equal(fmtTime(61.5, 24), "01:01:12");
});


test("the app's own work between two steps shows on its stage as running", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const stages = STAGES("done").map((s) => (s.id === "build" ? { ...s, status: "todo", line: null } : s));
  const html = await render(h(Pipeline, { projectId: "p1", data: { stages, appBusy: { stage: "build", key: "Placing the music and sound effects" } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(html, /class="pl-stage running now"[^]*?Placing the music and sound effects/);
});

test("the Build row says the time left, and nothing once the checks run", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const startedAt = new Date(Date.now() - 10 * 60000).toISOString();
  const html = await render(h(Pipeline, { projectId: "p1", data: { stages: STAGES(), estimate: { minutes: 30, startedAt } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(html, /about 20 min left/);
  const checking = await render(h(Pipeline, { projectId: "p1", data: { stages: STAGES(), estimate: { minutes: 30, startedAt }, steps: [{ id: "checks", status: "running" }] }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.doesNotMatch(checking, /min left|about \d+ min/);
});

test("a Brush film shown as its render says how its render is going until it exists", async () => {
  const { VideoStage } = await load("/src/editor/Player.jsx");
  const pv = (proxy) => ({ proxy, video: { current: null }, videoEvents: {} });
  const rendering = await render(h(VideoStage, { pv: pv({ mode: "prerendered", status: "rendering", url: null, etaMinutes: 6.4, job: { stage: "rendering", progress: 34 } }) }));
  assert.match(rendering, /Rendering the preview, about 6 min left · 34%/);
  assert.match(rendering, /transform:scaleX\(0\.34\)/);          // the bar grows by transform, not width
  const waiting = await render(h(VideoStage, { pv: pv({ mode: "prerendered", status: "rendering", url: null, job: { stage: "waiting", waitingFor: "Film A" } }) }));
  assert.match(waiting, /Waiting for Film A to finish rendering/);
  const old = await render(h(VideoStage, { pv: pv({ mode: "prerendered", status: "stale", url: "http://x/p.mp4", job: null }) }));
  assert.match(old, /<video[^>]*src="http:\/\/x\/p.mp4"/);
  assert.match(old, /Older version/);
});

test("no file paths on screen: a document's sheet is named for what it is, the tool lines and changed files by name", async () => {
  const { shortPath } = await load("/src/editor/ClaudePanel.jsx");
  assert.equal(shortPath("compositions/f1.html"), "f1.html");
  const AssetsPanel = (await load("/src/editor/AssetsPanel.jsx")).default;
  const html = await render(h(AssetsPanel, { projectId: "p1", items: [{ path: "assets/1_images/logo.png", name: "logo.png", folder: "assets/1_images", kind: "image", size: 10, status: "ok", usedIn: [] }],
    reload: noop, fileUrl: (p) => `/f/${p}`, locked: false, onImport: noop, onTranscript: noop, onShot: noop }));
  assert.doesNotMatch(html, /title="assets\//);
});

test("the render's video events never read the event inside a state updater (the Editor crashed on a Brush film)", async () => {
  const { videoHandlers } = await load("/src/editor/Player.jsx");
  const queued = [];
  const h_ = videoHandlers((u) => queued.push(u), () => 0, () => {});
  const ev = (el) => { const e = { currentTarget: el }; return e; };
  const el = { duration: 10.5, currentTime: 2.25, paused: true };
  const events = [["onLoadedMetadata", el], ["onPlay", el], ["onPause", el], ["onEnded", el], ["onError", el]].map(([k, x]) => { const e = ev(x); h_[k](e); e.currentTarget = null; return k; });
  let s = { duration: 0, time: 0, paused: true };
  for (const u of queued) s = u(s);          // React runs the updaters after the handlers returned and cleared currentTarget
  assert.equal(s.duration, 10.5, events.join());
  assert.equal(s.time, 2.25);
  assert.equal(s.paused, true);
});


test("an export that reused the finished render says so, not 0 s on the CPU", async () => {
  const { reusedLine } = await load("/src/workflow/RenderSheet.jsx");
  const t = (k, v = {}) => k.replace(/\{(\w+)\}/g, (_, x) => v[x]);
  assert.equal(reusedLine({ gpu: "hardware", ms: 4.2 * 60000 }, t), "Used the finished render (on the GPU · took 4 min)");
  assert.equal(reusedLine(null, t), "Used the finished render");
  // When it was made reads as a time ago, apart from how long it took
  const now = Date.parse("2026-10-25T16:01:09Z");
  assert.equal(reusedLine({ at: "2026-10-25T16:00:18Z", ms: 31561, gpu: "auto" }, t, now), "Used the finished render (just now · took 32 s)");
  assert.equal(reusedLine({ at: "2026-10-25T15:59:00Z", ms: 31561 }, t, now), "Used the finished render (2 min ago · took 32 s)");
});

test("a task the app's Exit stopped says so and offers to run it again (GET /pipeline's interrupted)", async () => {
  const { TaskBlock } = await load("/src/editor/ClaudePanel.jsx");
  const task = { id: "t9", text: "Make the ending stronger", status: "cancelled", createdAt: "2026-10-24T01:00:00Z", events: [], scope: { kind: "project" } };
  const html = await render(h(TaskBlock, { t: task, projectId: "p1", toast: noop, onChanged: noop, onRetry: noop, steps: [], interrupted: { taskId: "t9", text: task.text } }));
  assert.match(html, /The app closed while Claude was working on this/);
  assert.match(html, />Send again</);
  const other = await render(h(TaskBlock, { t: task, projectId: "p1", toast: noop, onChanged: noop, onRetry: noop, steps: [], interrupted: null }));
  assert.doesNotMatch(other, /The app closed/);
});

test("a card that reports something finished is a done card: a task, a render, an approval", async () => {
  const { TaskBlock } = await load("/src/editor/ClaudePanel.jsx");
  const task = { id: "t1", text: "Shorter title", status: "done", createdAt: "2026-10-24T01:00:00Z", events: [], changed: [{ path: "compositions/f1.html" }], durationMs: 5000 };
  const html = await render(h(TaskBlock, { t: task, projectId: "p1", toast: noop, onChanged: noop, onRetry: noop, steps: [] }));
  assert.match(html, /class="cstatus done"/);
  assert.match(html, /cs-ok/);
});

test("the Editor's header names the film's design in short: the Brand Kit", async () => {
  const { designParts } = await load("/src/screens/Editor.jsx");
  const t = (k, v = {}) => k.replace(/\{(\w+)\}/g, (_, x) => v[x]);
  assert.deepEqual(designParts({ look: { title: "Biennale Yellow" } }, t).filter(Boolean), ["Brand Kit Biennale Yellow"]);
  // a project made before with other design fields: only the Brand Kit is named
  assert.deepEqual(designParts({ visualStyle: { title: "Swiss Pulse", part: "motion" }, palette: { title: "Tea" } }, t).filter(Boolean), []);
});

test("the Render sheet says what it makes in one line and runs one bar with the time left", async () => {
  const { specLine, renderProgress } = await load("/src/workflow/RenderSheet.jsx");
  assert.equal(specLine({ width: 1080, height: 1920 }, { duration: 10 }, "mp4"), "1080×1920 · 9:16 · 10.0 s · H.264");
  assert.equal(specLine({ width: 1920, height: 1080 }, { aspect: "16:9", duration: 6.4 }, "mov"), "1920×1080 · 16:9 · 6.4 s · QuickTime");
  assert.deepEqual(renderProgress({ stage: "checks" }, null), { pct: 3, left: null });
  const r = renderProgress({ stage: "rendering", progress: 50 }, 1000, 31000);          // half the frames in 30 s
  assert.equal(r.pct, 54); assert.equal(r.left, 30);
});

test("a Motion Plan row names its element in words, not by its code selector", async () => {
  const { nameOf } = await load("/src/screens/MotionPlan.jsx");
  assert.equal(nameOf(".f1-bill"), "Bill");
  assert.equal(nameOf(".f1-head .ln:nth-child(2)"), "Head, line 2");
  assert.equal(nameOf(".f1-hl"), "Highlight");
  assert.equal(nameOf("Headline"), "Headline");
});

test("the Render sheet shows the name the file gets, with the date and time (stampedName)", async () => {
  const { stampedPreview } = await load("/src/workflow/RenderSheet.jsx");
  const at = new Date(2026, 9, 25, 9, 5);
  assert.equal(stampedPreview("demo-film", "mp4", at), "261025_demo-film_0905.mp4");
  assert.equal(stampedPreview("demo-film (2)", "mov", at), "261025_demo-film_0905.mov");
  assert.equal(stampedPreview("261024_demo-film_2210", "mp4", at), "261025_demo-film_0905.mp4");
  assert.equal(stampedPreview("demo-film_2026-10-24_2210", "mp4", at), "261025_demo-film_0905.mp4");
});

test("the tech checks are no step: only the newest real failure shows, as one card; a pass or an older failure shows nothing", async () => {
  const { threadOf } = await load("/src/editor/ClaudePanel.jsx");
  const n = (id, at, kind, extra = {}) => ({ id, at, kind, text: kind, ...extra });
  const ids = (notes) => threadOf([], notes).map((x) => x.note.id);
  assert.deepEqual(ids([n("a", "01", "checks", { status: "error", vars: { n: 1 } }), n("b", "02", "checks", { status: "error", vars: { n: 2 } })]), ["b"]);
  assert.deepEqual(ids([n("a", "01", "checks", { status: "error" }), n("b", "02", "checks")]), []);          // passed later: nothing
  assert.deepEqual(ids([n("a", "01", "pipeline", { text: "The Tech checks found {n} blocking issue(s) Claude could not fix: open Tech checks." })]), ["a"]);
});

test("a checks failure clears once the checks step finishes well after it (no pass note any more)", async () => {
  const { threadOf } = await load("/src/editor/ClaudePanel.jsx");
  const fail = { id: "f", at: "2026-10-25T01:00:00.000Z", kind: "checks", status: "error", text: "Something would stop the render: {what}", vars: { what: "Words off the frame" } };
  assert.equal(threadOf([], [fail], null).length, 1);
  assert.equal(threadOf([], [fail], Date.parse("2026-10-25T00:59:00.000Z")).length, 1);          // finished before the failure: still shown
  assert.equal(threadOf([], [fail], Date.parse("2026-10-25T01:05:00.000Z")).length, 0);
  const after = { id: "g", at: "2026-10-25T01:10:00.000Z", kind: "pipeline", text: "{n} problem(s) would still stop the render after Claude's fix: tell Claude in the chat what to do.", vars: { n: 1 } };
  assert.deepEqual(threadOf([], [fail, after], null).map((x) => x.note.id), ["g"]);
});

test("a stage waiting for the user shows its latest wait note as the chat's card; a wait that is over shows nothing", async () => {
  const { threadOf } = await load("/src/editor/ClaudePanel.jsx");
  const w = (id, at, open) => ({ id, at, kind: "waiting", open, text: "ready" });
  const notes = [w("s1", "2026-10-25T15:23:33Z", "storyboard"), w("s2", "2026-10-25T15:32:08Z", "storyboard"), w("m", "2026-10-25T15:37:32Z", "motion-plan")];
  assert.deepEqual(threadOf([], notes, null, true).map((x) => x.note.id), ["m"]);
  assert.deepEqual(threadOf([], notes, null, false), []);
});

test("the checks card clears on the server's later all-clear note, and says Claude is fixing it while the app's fix runs", async () => {
  const { threadOf, default: _ } = await load("/src/editor/ClaudePanel.jsx");
  const fail = { id: "f", at: "2026-10-25T01:00:00.000Z", kind: "checks", status: "error", text: "Something would stop the render: {what}", vars: { n: 1, what: "Words off the frame" } };
  const ok = { id: "o", at: "2026-10-25T01:20:00.000Z", kind: "checks", status: "done", text: "Nothing stops the render any more" };
  assert.equal(threadOf([], [fail, ok], null).length, 0);
});


// Storyboard feedback
const opt = (label, extra = {}) => ({ key: `d:${label}`, label, letter: label[0], rev: Number(label.slice(1)) || 1, draft: "d", at: "2026-10-26T01:00:00.000Z",
  frames: [{ n: 1, title: "Idea" }, { n: 2, title: "Grid" }, { n: 3, title: "Script" }], stills: ["a", "b", "c"], stillUrls: ["/a.png", "/b.png", "/c.png"], ...extra });

test("storyboard options: one board each, newest first, named Option A / B / B2 (no Round), next letter and next revision", async () => {
  const { optionsOf, nextLetter, nextRevision } = await load("/src/workflow/Boards.jsx");
  const old = { rounds: [{ id: "R1", no: 1, at: "2026-10-25T01:00:00.000Z", options: [{ option: "A", stillUrls: [], frames: [] }] },
    { id: "R4", no: 2, at: "2026-10-25T02:00:00.000Z", picked: { option: "B" }, options: [{ option: "B", stillUrls: [], frames: [] }] }] };
  const o = optionsOf(old);
  assert.deepEqual(o.map((x) => [x.label, x.key, x.draft, x.picked]), [["B", "B", "R4", true], ["A", "A", "R1", false]]);
  // The shape: { option, from, revised (panel numbers), round, draft }
  const s = (option, extra = {}) => ({ ...opt(option), option, round: "R5", label: `Option ${option}`, ...extra });
  const srv = optionsOf({ options: [s("B2", { from: "B", revised: [2], draft: { text: "@Panel_2: bigger" } }), s("B"), s("A")] });
  assert.deepEqual([srv[0].label, srv[0].key, srv[0].draft, srv[0].revisedFrom, srv[0].rev, srv[0].feedback], ["B2", "B2", "R5", "B", 2, "@Panel_2: bigger"]);
  // The chosen option keeps its key when the app takes the stills and its pictures move to a new draft
  const again = optionsOf({ options: [s("B2", { round: "R6", from: "B" }), s("B", { round: "R6" }), s("A", { round: "R6" })] });
  assert.equal(again[0].key, srv[0].key);
  assert.deepEqual(srv[0].frames.map((f) => !!f.revised), [false, true, false]);
  assert.equal(nextLetter(srv), "C");
  assert.equal(nextRevision(srv, "B"), "B3");
  assert.equal(nextRevision(srv, "A"), "A2");
});

test("the feedback box's @ picker: the @ at the caret, a panel inserted as @Panel_N, notes counted per panel", async () => {
  const { mentionAt, insertMention, noteCounts, appendNote } = await load("/src/workflow/Boards.jsx");
  assert.deepEqual(mentionAt("Make it calmer\n@", 16), { start: 15, query: "" });
  assert.deepEqual(mentionAt("x @Panel_1", 10), { start: 2, query: "1" });
  assert.equal(mentionAt("mail me@home", 12), null);          // an @ inside a word is no mention
  assert.deepEqual(insertMention("a\n@2", 2, 4, 2), { text: "a\n@Panel_2: ", caret: 12 });          // the caret right after the inserted "@Panel_2: "
  assert.deepEqual(noteCounts("@Panel_3: bigger\n@Panel_6: logo\n@Panel_3: and red"), { 3: 2, 6: 1 });
  assert.equal(appendNote("Slower overall  ", 4, "darker"), "Slower overall\n@Panel_4: darker");
  assert.equal(appendNote("", 1), "@Panel_1: ");
});

test("a feedback draft comes back after closing: the project's copy wins, this browser's fills the rest; the box shows it", async () => {
  const { restoreNotes, FeedbackBox } = await load("/src/workflow/Boards.jsx");
  const back = restoreNotes({ B2: { text: "@Panel_1: from the project" } }, { B2: { text: "older local" }, A: { text: "only here" }, C: { text: "" } });
  assert.deepEqual(back, { B2: { text: "@Panel_1: from the project" }, A: { text: "only here" } });
  const html = await render(h(FeedbackBox, { option: opt("B2"), text: back.B2.text, onText: noop, onSubmit: noop, onClose: noop }));
  assert.match(html, /Feedback on Option B2/);
  assert.match(html, /@Panel_1: from the project/);
  assert.match(html, /1 note on a panel/);
  assert.match(html, /Saved in the project/);
  assert.doesNotMatch(html, /Round/);
});

test("a step task the user started with their own words shows them as theirs (`shown`), not as \"What was sent to Claude\"", async () => {
  const { TaskBlock } = await load("/src/editor/ClaudePanel.jsx");
  const task = { id: "t1", status: "done", step: "storyboard", createdAt: "2026-10-26T02:00:00.000Z", events: [], text: "Revise Option B into B2 (the app's long prompt)", shown: "@Panel_3: the title bigger" };
  const html = await render(h("ol", null, h(TaskBlock, { t: task, projectId: "p1", toast: noop, onChanged: noop, onRetry: noop, steps: [{ id: "storyboard", title: "Storyboard" }] })));
  assert.match(html, /msg user/);
  assert.match(html, /@Panel_3: the title bigger/);
  assert.doesNotMatch(html, /the app&#x27;s long prompt|What was sent to Claude/);
});

test("Claude stopping to ask in the chat (a wait note with open \"chat\") is the card until a message goes to Claude after it", async () => {
  const { threadOf, chatWait } = await load("/src/editor/ClaudePanel.jsx");
  const ask = { id: "w", at: "2026-10-26T02:10:00.000Z", kind: "waiting", open: "chat", text: "Panel 6 has no logo; did you mean panel 7?" };
  const before = { id: "t1", status: "done", createdAt: "2026-10-26T02:00:00.000Z", events: [] };
  const after = { id: "t2", status: "done", createdAt: "2026-10-26T02:12:00.000Z", events: [] };
  assert.equal(chatWait([before], [ask])?.id, "w");
  assert.deepEqual(threadOf([before], [ask]).map((x) => x.note?.id ?? x.task.id), ["t1", "w"]);
  assert.equal(chatWait([before, after], [ask]), null);          // answered: no card
  assert.equal(threadOf([before], [ask], null, false, false).some((x) => x.note), false);          // Claude is working: no card
});

test("problems that stop the render: the Build row offers \"Run checks again\"; Final Mix does not say the film is ready", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const stages = STAGES().map((s) => (s.id === "build" ? { ...s, status: "done", line: "{n} problem(s) to fix before the render", lineVars: { n: 2 } } : s));
  const html = await render(h(Pipeline, { projectId: "p1", data: { stages, checks: { pass: false, blocking: 2, running: false } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(html, /Run checks again/);
  const clean = await render(h(Pipeline, { projectId: "p1", data: { stages, checks: { pass: true, blocking: 0 } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.doesNotMatch(clean, /Run checks again/);
});

test("a task with no step of its own is named by its label (a storyboard revision read \"Changed the film\")", async () => {
  const { TaskBlock } = await load("/src/editor/ClaudePanel.jsx");
  const task = { id: "t9", status: "done", createdAt: "2026-10-26T02:00:00.000Z", events: [], text: "long prompt", shown: "@Panel_6: logo bigger", label: "Storyboard · revision",
    changed: [{ path: "boards/A2/index.html" }] };
  const html = await render(h("ol", null, h(TaskBlock, { t: task, projectId: "p1", toast: noop, onChanged: noop, onRetry: noop, steps: [] })));
  assert.match(html, /Storyboard · revision/);
  assert.doesNotMatch(html, /Changed the film/);
});

test("a confirm says what the step takes from its estimate in one red line; no basis or closing lines", async () => {
  const { default: UsageHint, stepLine } = await load("/src/workflow/usage.jsx");
  const t = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
  const html = await render(h(UsageHint, { projectId: "p1", line: stepLine(t, "Claude makes Option B2 from your feedback", { minutes: 12, costUsd: 3.04, basis: "this film", runs: 2 }) }));
  assert.match(html, /<p class="dlg-warn">Claude makes Option B2 from your feedback: about 12 min, about \$3\.04\.<\/p>/);          // the cost in red
  assert.doesNotMatch(html, /As it did earlier|Usual for this film style|Used so far/);
});

test("an option without a name from the server reads it off its heading like optionName; no name, no title", async () => {
  const { nameOf } = await load("/src/workflow/Boards.jsx");
  assert.equal(nameOf('Option A · "Mảnh giấy vàng"'), "Mảnh giấy vàng");
  assert.equal(nameOf('Option B2 · "Đánh thức" · revised from Option B'), "Đánh thức");
  assert.equal(nameOf("Option B · Đánh thức · revised from Option A"), "Đánh thức");
  assert.equal(nameOf("Option B2 · revised from Option B"), "");
  assert.equal(nameOf("Option A"), "");
  assert.equal(nameOf(undefined), "");
});

test("a note on a panel the board does not have is said at once and holds Submit; only real panels are counted", async () => {
  const { unknownPanels, FeedbackBox } = await load("/src/workflow/Boards.jsx");
  assert.deepEqual(unknownPanels("@Panel_2: a @Panel_15: b @Panel_0: c", 8), [0, 15]);
  assert.deepEqual(unknownPanels("@Panel_8: fine", 8), []);
  const o = opt("A2"), n = o.stillUrls.length;
  const html = await render(h(FeedbackBox, { option: o, text: `@Panel_1: ok @Panel_${n + 7}: no such panel`, onText: noop, onSubmit: noop, onClose: noop }));
  assert.match(html, new RegExp(`This board has ${n} panels: there is no Panel ${n + 7}`));
  assert.match(html, /<button[^>]*disabled=""[^>]*>Submit/);
  assert.doesNotMatch(html, /notes on panels/);
});

test("an estimate with a high says a range", async () => {
  const { minutesOf } = await load("/src/workflow/usage.jsx");
  assert.equal(minutesOf({ minutes: 10, high: 15 }), "10–15");
  assert.equal(minutesOf({ minutes: 5, high: 5 }), "5");
  assert.equal(minutesOf({ minutes: 5 }), "5");
});

test("the Voice screen lists the voices that speak the project's language first, then the user's own", async () => {
  const { voiceOrder, projectLanguage } = await load("/src/screens/Voice.jsx");
  assert.equal(projectLanguage({ text: "Phim giới thiệu studio" }), "vi");
  assert.equal(projectLanguage({ text: "A film about the studio" }), "en");
  assert.equal(projectLanguage(null, "vi"), "vi");
  const voices = [{ id: "roger", name: "Roger", labels: "male, en, american" }, { id: "mine", name: "Giọng của tôi", own: true },
    { id: "lan", name: "Lan", labels: "female, vi, northern" }, { id: "anna", name: "Anna", labels: "female, en" }];
  assert.deepEqual(voiceOrder(voices, "vi").map((v) => v.id), ["lan", "mine", "roger", "anna"]);
  assert.deepEqual(voiceOrder(voices, "en").map((v) => v.id), ["roger", "anna", "mine", "lan"]);
});

test("a voice-over the app made shows its service and the time it was made, never its file name", async () => {
  const { audioLabel } = await load("/src/screens/Voice.jsx");
  const made = audioLabel("elevenlabs-2026-10-27T02-17-58-978Z.mp3");
  assert.match(made, /^ElevenLabs voice-over · /);
  assert.ok(!/\.mp3|2026-10-27T|Z$/.test(made), made);
  assert.match(audioLabel("fishaudio-2026-10-27T02-17-58-978Z.mp3"), /^Fish Audio voice-over · /);
  assert.equal(audioLabel("Na take 2.wav"), "Na take 2");
});

test("a style's category shows under its name only when the name does not already say it", async () => {
  const { catOf } = await load("/src/screens/StyleGallery.jsx");
  const t = (s) => s;
  assert.equal(catOf(t, { title: "Explainer", category: "Explainer" }), "");
  assert.equal(catOf(t, { title: "Music / Lyrics", category: "Music / Lyrics" }), "");
  assert.equal(catOf(t, { title: "Numbers, charts and data stories", category: "Explainer" }), "Explainer");
  assert.equal(catOf(t, { title: "Slideshow", category: "Presentation" }), "Presentation");
});

test("a font family's files are one row with the family's name, never the file names", async () => {
  const { fontFamily, fontRows } = await load("/src/editor/AssetsPanel.jsx");
  assert.equal(fontFamily("BeVietnamPro-BoldItalic.ttf"), "Be Vietnam Pro");
  assert.equal(fontFamily("Roboto-Mono-Regular.otf"), "Roboto Mono");
  assert.equal(fontFamily("Lato.ttf"), "Lato");
  const f = (name, extra = {}) => ({ kind: "font", name, path: `assets/4_fonts/${name}`, size: 100, status: "ok", usedIn: [], ...extra });
  const rows = fontRows([f("BeVietnamPro-Bold.ttf", { usedIn: [1, 4] }), f("BeVietnamPro-Light.ttf", { usedIn: [4, 5] }), f("Baloo2-Regular.ttf"), f("Inter", { app: true })]);
  assert.deepEqual(rows.map((r) => [r.name, r.files ?? 1]), [["Be Vietnam Pro", 2], ["Baloo2", 1], ["Inter", 1]]);
  assert.deepEqual(rows[0].usedIn, [1, 4, 5]);
  assert.equal(rows[0].size, 200);
});

test("a Brand Kit's description is a short plain line, with no file names", async () => {
  const { lookSummary } = await load("/src/screens/Looks.jsx");
  const hf = "Video-first companion to Biennale Yellow's design.md. The unit is the frame (1920×1080). Atoms are identical and sacred — warm parchment grounds, a single deep indigo ink, solar yellow deployed as bloom / panel / tile underprint. Restraint is the rule; motion out of scope.";
  assert.equal(lookSummary(hf), "Warm parchment grounds, a single deep indigo ink.");
  assert.equal(lookSummary("Our brand kit from guideline.pdf. Second sentence."), "Our brand kit.");
  assert.equal(lookSummary(""), "");
});

test("a tech check's dot says a plain sentence, else a short line, never the checker's own wording", async () => {
  const { qcSay } = await load("/src/editor/Timeline.jsx");
  const t = (s) => s;
  assert.equal(qcSay(t, { plain: "Shot 6: the kite drifts as it turns.", text: "check transformOrigin/svgOrigin" }), "Shot 6: the kite drifts as it turns.");
  assert.ok(!/transformOrigin/.test(qcSay(t, { text: "check transformOrigin/svgOrigin" })));
});

test("a Storyboard waiting for the voice-over or the lyrics opens their dialogs from its row and the chat's card", async () => {
  const { OPENS } = await load("/src/workflow/Pipeline.jsx");
  assert.deepEqual(OPENS.voice, ["voice", "Open Voice-over"]);
  assert.deepEqual(OPENS.lyrics, ["lyrics", "Open Lyrics"]);
});

test("the Voice screen shows No voice-over only when the user chose it; with no source, the service with a saved key, else nothing", async () => {
  const { shownSource } = await load("/src/screens/Voice.jsx");
  const keyed = { elevenlabs: { saved: true }, fishaudio: { saved: false } };
  assert.equal(shownSource({}, keyed), "elevenlabs");
  assert.equal(shownSource({ source: "none" }, keyed), "elevenlabs");          // an older project's default, not the user's choice
  assert.equal(shownSource({ source: "none", noVoice: { at: "2026-10-27T05:00:00Z" } }, keyed), "none");
  assert.equal(shownSource({}, { elevenlabs: { saved: false }, fishaudio: { saved: false } }), null);
  assert.equal(shownSource({ source: "fish" }, keyed), "fishaudio");
  assert.equal(shownSource({ source: "upload" }, keyed), "upload");
});

test("a voice-over draft whose every line is in the brief word for word is the user's own narration", async () => {
  const { draftInBrief } = await load("/src/screens/Voice.jsx");
  const brief = "Giọng đọc: đọc đúng nguyên văn.\n\nLời đọc:\nTrưa nóng, ông Tư rót một ly trà đá. Năm phút sau, quanh ly lấm tấm nước.\nNhưng ly không hề nứt.";
  assert.equal(draftInBrief("Trưa nóng, ông Tư rót một ly trà đá.\nNăm phút sau, quanh ly lấm tấm nước.\nNhưng ly không hề nứt.", brief), true);
  assert.equal(draftInBrief("Trưa nóng, ông Tư rót một ly trà đá.\nMột câu Claude viết thêm.", brief), false);
  assert.equal(draftInBrief("", brief), false);
  assert.equal(draftInBrief("Nhưng ly không hề nứt.", ""), false);
});

test("an approval says what Claude does, how long and what it costs in one sentence", async () => {
  const { stepLine } = await load("/src/workflow/usage.jsx");
  const t = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
  assert.equal(stepLine(t, "Claude writes the motion for 12 shots", { minutes: 5, high: 8, costUsd: 1.2 }), "Claude writes the motion for 12 shots: about 5–8 min, about $1.20.");
  assert.equal(stepLine(t, "Claude makes Option C", { minutes: 6 }), "Claude makes Option C: about 6 min.");
  assert.equal(stepLine(t, "Claude makes Option C", null), "Claude makes Option C: a few minutes.");
  const { noteWords } = await load("/src/editor/ClaudePanel.jsx");
  assert.equal(noteWords("The Motion Plan is ready for you: under each frame, the motion Claude proposes. Change what you like, then press Approve and build at the end of the Motion Plan dialog: the film is then built, reviewed, given music and checked without another click."),
    "Motion Plan ready: check it, then Approve and build.");
});

test("a sentence the voice-over's cut splits shows on the Narration lane in both clips, each with its own words", async () => {
  const { onFilm } = await import("../packages/voice/transcript.mjs");
  const w = (text, start, end) => ({ text, start, end });
  const seg = { start: 13.36, end: 17.6, text: "Ông quấn ba vòng băng keo. Nhưng ly không hề nứt.",
    words: [w("Ông", 13.36, 14), w("quấn", 14, 14.28), w("ba", 14.28, 14.6), w("vòng", 14.6, 14.86), w("băng", 14.86, 15.08), w("keo.", 15.08, 15.5),
      w("Nhưng", 15.86, 16.4), w("ly", 16.4, 16.76), w("không", 16.76, 17.06), w("hề", 17.06, 17.34), w("nứt.", 17.34, 17.6)] };
  const clips = [{ start: 0, mediaStart: null, duration: 15.68 }, { start: 16.68, mediaStart: 15.68, duration: 24.8 }];
  assert.deepEqual(onFilm([seg], clips), [{ start: 13.36, end: 15.5, text: "Ông quấn ba vòng băng keo." }, { start: 16.86, end: 18.6, text: "Nhưng ly không hề nứt." }]);
  assert.deepEqual(onFilm([seg], clips.slice(0, 1)), [{ start: 13.36, end: 15.5, text: "Ông quấn ba vòng băng keo." }], "a part no clip plays is left out");
  assert.deepEqual(onFilm([{ ...seg, start: 0, end: 2, words: [w("a", 0, 1), w("b", 1, 2)], text: "a b" }], clips), [{ start: 0, end: 2, text: "a b" }], "one clip: the sentence as written");
});

test("voice settings: only what the user changed from the voice's defaults is sent", async () => {
  const { settingsChanged } = await load("/src/screens/Voice.jsx");
  const fields = [{ id: "speed", type: "number" }, { id: "stability", type: "number" }, { id: "use_speaker_boost", type: "boolean" }];
  const d = { speed: 1, stability: 0.5, use_speaker_boost: true };
  assert.deepEqual(settingsChanged(fields, { ...d }, d), {});
  assert.deepEqual(settingsChanged(fields, { speed: 0.9, stability: 0.5, use_speaker_boost: false }, d), { speed: 0.9, use_speaker_boost: false });
  assert.deepEqual(settingsChanged(fields, { speed: undefined }, {}), {});
});

test("a note pinned on the film is a line of the chat's message and goes with it; a deleted line drops its pin", async () => {
  const { pinTag, notesOf } = await load("/src/editor/FilmNotes.jsx");
  const a = { id: "p1", t: 3.4, shot: 2, box: { x: 0.5, y: 0.2, w: 0.3, h: 0.3 } }, b = { id: "p2", t: 9.1, shot: 4, x: 0.5, y: 0.5 }, c = { id: "p3", t: 1.2, shot: 1, x: 0.1, y: 0.1 };
  assert.equal(pinTag(a), "[00:03:10 · Shot 2] ");          // The player's clock, minutes:seconds:frames (24 fps unless the pin says)
  assert.equal(pinTag({ ...a, fps: 30 }), "[00:03:12 · Shot 2] ");
  const msg = `Make it calmer overall\n${pinTag(a)}Logo lệch phải, đưa vào giữa\n${pinTag(b)}Chậm lại ở cảnh này`;
  assert.deepEqual(notesOf(msg, [a, b, c]), [{ id: "p1", t: 3.4, box: a.box, text: "Logo lệch phải, đưa vào giữa" }, { id: "p2", t: 9.1, x: 0.5, y: 0.5, text: "Chậm lại ở cảnh này" }]);
  assert.deepEqual(notesOf("no pins here", [a]), []);
});

test("a code film's word keeps the font and size fields its code allows; what it sets itself says why", async () => {
  const { CodeStyle } = await load("/src/editor/Player.jsx");
  const word = (style) => ({ id: "w1", text: "Nếu Trái Đất", shot: 1, style });
  const open = await render(h(CodeStyle, { projectId: "p", item: word({ size: { value: 64, editable: true }, font: { value: "Roboto Mono", editable: true } }), locked: false, onSaved: noop }));
  assert.match(open, /Text size/);
  assert.match(open, /value="64"/);
  assert.doesNotMatch(open, /disabled=""[^>]*type="number"|type="number"[^>]*disabled=""/);
  const own = await render(h(CodeStyle, { projectId: "p", item: word({ size: { value: 48, editable: false, why: "This piece sets its own size: pin a note for Claude" }, font: { value: "Inter", editable: false, why: "This piece sets its own font: pin a note for Claude" } }), locked: false, onSaved: noop }));
  assert.match(own, /This piece sets its own font/);
  assert.match(own, /value="Inter"/);
  const none = await render(h(CodeStyle, { projectId: "p", item: word(null), locked: false, onSaved: noop }));
  assert.match(none, /Font and size are set in the film(&#x27;|')s code: pin a note\./);
});

test("Settings in four sections: General, Director, System, Update; what waits on the server shows at once", async () => {
  const { default: Settings } = await load("/src/screens/Settings.jsx");
  const claude = { loggedIn: true, email: "a@b.c", subscriptionType: "max" };
  const general = await render(h(Settings, { section: "general", claude, onRecheckClaude: noop }));
  const nav = [...general.matchAll(/class="rail-item[^"]*"[^>]*>.*?<span>([^<]+)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(nav, ["General", "Director", "System", "Update"]);          // Appearance in General, Claude is Director
  for (const s of ["Account", "Signed in · Claude Max", "Projects folder", "Appearance", "Voice-over", "Spoken language", "Render &amp; export", "Sign out"]) assert.match(general, new RegExp(s));
  assert.doesNotMatch(general, /Default save location|Work folder|Film Styles<\/span>/);
  const system = await render(h(Settings, { section: "runtime", claude, onRecheckClaude: noop }));
  assert.match(system, /Checking this computer…/);
  const old = await render(h(Settings, { section: "voice", claude, onRecheckClaude: noop }));
  assert.match(old, /Projects folder/);          // an old address lands in General
});

test("the AE badge: green editable, yellow partly, red video only, with the AE Export button's Ae tile; no `ae`, no badge", async () => {
  const { default: AeBadge } = await load("/src/workflow/AeBadge.jsx");
  const { StyleTile, TechTags } = await load("/src/screens/StyleGallery.jsx");
  const ed = await render(h(AeBadge, { s: { ae: { level: "editable" } } }));
  assert.match(ed, /class="ae-badge editable" title="After Effects gets text and shapes as layers you can edit\."><span class="ae-tile" aria-hidden="true">Ae<\/span>AE editable<\/span>/);          // the AE Export button's own tile
  assert.match(await render(h(AeBadge, { s: { ae: { level: "partial" } } })), /ae-badge partial" title="Some parts come into After Effects as video\.".*AE partly editable/);
  assert.match(await render(h(AeBadge, { s: { ae: { level: "video" } } })), /ae-badge video" title="After Effects gets this film as one video layer\.".*AE video only/);
  for (const s of [{}, { ae: {} }, { ae: { level: "maybe" } }, null]) assert.equal(await render(h(AeBadge, { s })), "");
  const tile = await render(h(StyleTile, { s: { id: "x", title: "X", ae: { level: "video" } }, on: false, onPick: noop }));
  assert.match(tile, /class="ae-badge video compact"[^>]*role="img" aria-label="AE video only: After Effects gets this film as one video layer\."/);
  assert.doesNotMatch(tile, /AE video only<\/span>/);          // on the picture: the mark alone
  assert.match(await render(h(TechTags, { s: { ae: { level: "partial" } } })), /<p class="tech-tags">.*AE partly editable/);
  assert.equal(await render(h(TechTags, { s: {} })), "");
  // A level not measured yet says so in the tooltip
  const un = await render(h(StyleTile, { s: { id: "y", title: "Y", ae: { level: "video", unmeasured: true } }, on: false, onPick: noop }));
  assert.match(un, /title="After Effects gets this film as one video layer\. Not checked yet\." role="img" aria-label="AE video only: After Effects gets this film as one video layer\. Not checked yet\."/);
  // ae.textLayers: a canvas style whose titles and captions come as text layers says so; without it the partial tip stays
  assert.match(await render(h(AeBadge, { s: { ae: { level: "partial", textLayers: true } } })), /ae-badge partial" title="Titles and captions come as text layers; the drawing comes as video\."/);
  assert.match(await render(h(AeBadge, { s: { ae: { level: "editable", textLayers: true } } })), /title="After Effects gets text and shapes as layers you can edit\."/);
});

test("the voice box opens on the voice the film's voice-over was read with; the canvas notice takes the style's AE badge colour", async () => {
  const { pickVoice } = await load("/src/screens/Voice.jsx");
  const voices = [{ id: "a", usable: false }, { id: "b" }, { id: "c" }];
  assert.equal(pickVoice(voices, "elevenlabs", { source: "elevenlabs", voiceId: "c" }), "c");
  assert.equal(pickVoice(voices, "elevenlabs", { source: "fishaudio", voiceId: "c" }), "b");          // another service's voice: the default
  assert.equal(pickVoice(voices, "elevenlabs", { source: "elevenlabs", voiceId: "gone" }), "b");      // no longer listed: the default
  assert.equal(pickVoice(voices, "elevenlabs", null), "b");
  const { SizeSummary } = await load("/src/screens/PortAE.jsx");
  const e = { kind: "canvas", minutes: 1 };
  assert.match(await render(h(SizeSummary, { e, ae: "video" })), /class="ae-size state-line stop"/);
  assert.match(await render(h(SizeSummary, { e, ae: "partial" })), /class="ae-size state-line run"/);
  assert.match(await render(h(SizeSummary, { e, ae: "editable" })), /class="ae-size state-line ok"/);
  assert.match(await render(h(SizeSummary, { e })), /class="ae-size state-line run"/);          // a style without a badge: amber as before
});

test("the Review in short: final score, scores under 8 and what Claude left, in plain words with their time; no engine names", async () => {
  const { qcSummary, plainLine } = await load("/src/workflow/qcSummary.js");
  const md = [
    "# QC-REVIEW", "", "## Round 1", "", "Scores: Hook 7 · Phone 6 · Motion 8 · Variety 8 · Composition 7 · Brand 9 · Sync 8", "", "Worst three:", "1. 2.0 s: fixed later.", "",
    "## Round 2 (final look, no fix)", "", "Scores: Hook 8 · Phone 7 · Motion 8 · Variety 8 · Composition 8 · Brand 9 · Sync 8", "",
    "HyperFrames check: lint, layout clean.", "Worst left (taste, not rule breaks):",
    "1. 10–13 s (shot 4): the glass cut at the right edge (STYLE §4, frame.md ≥ 40 px); keeping it whole would half-cut the label.",
    "2. 0.25 s (shot 1): HyperFrames layout warning, canvas content at the left edge — the board is full-bleed art.",
    "3. Lint warnings about sub-compositions are structural.", "", "Final score: 8/10"].join("\n");
  const s = qcSummary(md);
  assert.equal(s.score, "8");
  assert.deepEqual(s.low, [["Reading on a phone", 7]]);          // the last round's scores only
  assert.deepEqual(s.left, ["10–13 s (shot 4): the glass cut at the right edge.", "0.25 s (shot 1): layout warning, canvas content at the left edge."]);
  assert.equal(qcSummary(""), null);
  assert.equal(plainLine("1. 14.25–16.5 s — the hand holds still"), "14.25–16.5 s: the hand holds still.");
  // a list the round then fixed is not left over
  assert.deepEqual(qcSummary("## Round 1\n\nScores: hook 8 · phone 8\n\nWorst three:\n1. 3 s: a cut title.\n\nChanged:\n- moved it.\n\nFinal score: 8/10").left, []);
});

test("one count for the Tech checks, plain words for an element HF names by its tag, the time left counting down, the film's voice named", async () => {
  const { lookAt } = await import("../packages/hf-qa/look.mjs");
  const { plainFinding } = await import("../packages/hf-qa/plain.mjs");
  const same = { code: "frame_out_of_frame", text: "svg", time: 36.4 };
  const report = { pass: true, checks: [
    { id: "G-HF-LINT", blocking: true, pass: true, warnings: 1, findings: [] },
    { id: "G-HF-LAYOUT", blocking: false, pass: true, warnings: 7, kind: "deterministic", findings: [...Array(6)].map(() => ({ ...same, plain: plainFinding(same) }))
      .concat([{ code: "text_occluded", text: "?", time: 55.5, plain: plainFinding({ code: "text_occluded", text: "?", time: 55.5 }) }]) },
    // a report written before: its line keeps the tag and the "is"; the sheet says them plainly
    { id: "G-HF-CONTRAST", blocking: false, pass: true, warnings: 1, kind: "deterministic", findings: [{ plain: "At 0:36.4: part of the words \"svg\" is outside the frame." }] },
    { id: "G-STILL", blocking: false, pass: true, kind: "heuristic", findings: [] }] };
  const l = lookAt(report);
  assert.equal(l.count, 3);
  assert.deepEqual(l.warnings.map((c) => c.id), ["G-HF-LAYOUT", "G-HF-CONTRAST"], "a check whose warnings list nothing is not shown");
  assert.equal(l.warnings[0].items[0].count, 6);
  assert.equal(l.warnings[0].items[0].plain, "At 0:36.4: part of a drawing is outside the frame and cannot be seen. Ask Claude to move it into the frame.");
  assert.match(l.warnings[0].items[1].plain, /the words "\?" are covered/);
  assert.equal(l.warnings[1].items[0].plain, "At 0:36.4: part of a drawing is outside the frame.");
  const { etaLeft } = await load("/src/workflow/Pipeline.jsx");
  const t = (k, v = {}) => k.replace(/\{(\w+)\}/g, (_, x) => v[x]);
  const at = Date.parse("2026-10-27T23:51:00Z"), est = { minutes: 10, high: 15, startedAt: "2026-10-27T23:51:00Z" };
  assert.equal(etaLeft(t, est, at + 2 * 60000), "about 8 min left");
  assert.equal(etaLeft(t, est, at + 11 * 60000), "about 4 min left");
  assert.equal(etaLeft(t, est, at + 16 * 60000), "taking longer than usual");
  const { audioLabel } = await load("/src/screens/Voice.jsx");
  assert.match(audioLabel("elevenlabs-2026-10-27T16-49-46-139Z.mp3", "Viên - Narrative, Warm and Clear"), /^ElevenLabs voice-over · Viên · /);
  assert.match(audioLabel("elevenlabs-2026-10-27T16-49-46-139Z.mp3"), /^ElevenLabs voice-over · \d/);
});

test("the voice labels in plain words; a chat turn answering the Storyboard's question is the Storyboard at work", async () => {
  const { plainLabels } = await load("/src/screens/Voice.jsx");
  assert.equal(plainLabels("male, southern, vi, narrative_story, middle_aged, informative_educational, en"),
    "male, southern, Vietnamese, narrative story, middle-aged, informative, educational, English");
  assert.equal(plainLabels(""), "");
  const { runningEstimate } = await import("../packages/server/boards.mjs");
  const at = new Date().toISOString();
  assert.equal(runningEstimate({ status: "running", continues: "storyboard", createdAt: at, text: "60 s" }, [])?.stage, "storyboard");
  assert.equal(runningEstimate({ status: "running", createdAt: at, text: "make it blue" }, []), null);
  const { placedShots } = await import("../packages/hf-edit/shots.mjs");
  const frames = [2.4, 3.6, 4.6].map((d, i) => ({ number: i + 1, index: i, plannedDuration: d, start: null }));
  assert.deepEqual(placedShots(frames, null).map((s) => s.start), [0, 2.4, 6], "T19-1: before the build, no 3 s starter to scale to");
  const editor = (await import("node:fs")).readFileSync(new URL("../packages/server/editor.mjs", import.meta.url), "utf8");
  assert.match(editor, /const total = s\.root\?\.starter \? null : s\.root\?\.duration;/);
});

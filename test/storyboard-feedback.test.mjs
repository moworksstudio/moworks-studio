// Storyboard feedback: options named A, B and a revision "B2 · revised from B" (no
// "Round"); Submit feedback makes the revision as a copy of the option and only the noted panels are drawn and shot again (the others'
// stills are the same bytes, no snapshot for them); Claude checks that each note fits its panel first and stops with choices when one
// does not; the feedback draft is kept per option. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const T = mkdtempSync(join(tmpdir(), "mw-sbfb-"));
// the app's own registry and state stay out of it (set before any app module loads)
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));
const B = await import("../packages/hf-edit/boards.mjs");

// a small real PNG (two colours, so no still reads as blank), its colour from the seed
const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
function png(seed) {
  const w = 16, h = 9, ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < h; y++) { rows.push(0); for (let x = 0; x < w; x++) rows.push(...(x < w / 2 ? [seed * 20 % 256, 40, 90] : [230, seed * 30 % 256, 10])); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.from(rows))), chunk("IEND", Buffer.alloc(0))]);
}
// HyperFrames' snapshot, faked: one still per time, as HF names them; every call counted
const shots = [];
let paint = 1;
const snap = async (boardDir, times, outDir) => {
  shots.push({ board: boardDir.split(/[\\/]/).pop(), times });
  mkdirSync(outDir, { recursive: true });
  times.forEach((t, i) => writeFileSync(join(outDir, `frame-${String(i).padStart(2, "0")}-at-${t}s.png`), png(paint++)));
  return { exitCode: 0, stderrTail: [] };
};
function board(dir, o, frames) {
  mkdirSync(join(dir, "boards", o), { recursive: true });
  writeFileSync(join(dir, "boards", o, "STORYBOARD.md"), `# Option ${o}\n- idea: the tea\n\n${Array.from({ length: frames }, (_, i) => `## Frame ${i + 1} — panel ${i + 1}\n- duration: 2s\n`).join("\n")}`);
  writeFileSync(join(dir, "boards", o, "index.html"), `<div data-composition-id="main" data-width="16" data-height="9"></div><!-- ${o} -->`);
}

test("names: options are letters and revisions (B, B2, B13), never B1; the next letter and the next revision; @Panel notes parsed", () => {
  assert.deepEqual(["A", "B2", "C13", "B1", "B02", "I", "AB"].map(B.isOption), [true, true, true, false, false, false, false]);
  assert.equal(B.optionLabel("B2", "B"), "Option B2 · revised from Option B");
  assert.equal(B.optionLabel("C"), "Option C");
  assert.deepEqual(B.parseFeedback("Make it warmer overall.\n@Panel_1: the word \"Ý tưởng\" bigger\n@Panel_6 logo bigger\n"),
    { panels: [{ n: 1, text: "the word \"Ý tưởng\" bigger" }, { n: 6, text: "logo bigger" }], general: "Make it warmer overall." });
  const d = join(T, "names"); board(d, "A", 3); board(d, "B", 3); board(d, "B2", 3);
  assert.deepEqual(B.optionIds(join(d, "boards")), ["A", "B", "B2"]);
  assert.equal(B.nextLetter(d), "C"); assert.equal(B.nextRevision(d, "B"), "B3"); assert.equal(B.nextRevision(d, "A"), "A2");
});

test("a revision reuses every panel without a note: the same still bytes, no snapshot for them; only the noted panels are shot again and marked revised", async () => {
  const d = join(T, "reuse"); board(d, "A", 4);
  const first = await B.takeStills(d, { by: "claude", snap });
  const aStills = first.round.options.find((o) => o.option === "A").stills;
  assert.equal(aStills.length, 4);
  const rv = B.makeRevision(d, "A", "@Panel_2: the cup bigger\n@Panel_4: end on the logo");
  assert.deepEqual([rv.option, rv.from, rv.panels], ["A2", "A", [2, 4]]);
  assert.equal(readFileSync(join(d, "boards", "A2", "STORYBOARD.md"), "utf8"), readFileSync(join(d, "boards", "A", "STORYBOARD.md"), "utf8"), "a whole copy");
  assert.ok(!B.currentOptions(d).some((o) => o.option === "A2"), "being revised: not the owner's to see yet");
  // Claude redraws panels 2 and 4 of A2 and asks for their stills
  writeFileSync(join(d, "boards", "A2", "index.html"), readFileSync(join(d, "boards", "A2", "index.html"), "utf8") + "<!-- 2 and 4 redrawn -->");
  shots.length = 0;
  const res = await B.takeStills(d, { by: "claude", snap, retake: { option: "A2", frames: [2, 4] } });
  assert.deepEqual(shots, [{ board: "A2", times: [1.5, 3.5] }], "only the two noted panels were taken; A unchanged and A2's other panels were copied");
  const a2 = res.round.options.find((o) => o.option === "A2");
  assert.equal(a2.label, "Option A2 · revised from Option A"); assert.deepEqual(a2.revised, [2, 4]);
  const bytes = (rel) => readFileSync(join(d, ...rel.split("/")));
  const name = (rel) => rel.split("/").pop().replace(/-at-.*$/, "");
  const byFrame = (list) => Object.fromEntries(list.map((s) => [name(s), s]));
  const a = byFrame(aStills), b = byFrame(a2.stills);
  assert.deepEqual(Object.keys(b).sort(), Object.keys(a).sort());
  for (const k of ["frame-00", "frame-02"]) assert.ok(bytes(a[k]).equals(bytes(b[k])), `${k}: the same bytes`);
  for (const k of ["frame-01", "frame-03"]) assert.ok(!bytes(a[k]).equals(bytes(b[k])), `${k}: drawn again`);
  assert.equal(B.revisionOf(d, "A2").pending, false, "Claude's board_stills hands it to the owner");
  // a revision of the revision: A3, from A2
  assert.equal(B.makeRevision(d, "A2", "@Panel_1: darker").option, "A3");
});

test("Submit feedback: the draft is kept per option, the revision is made, Claude checks each note against its panel before drawing", async () => {
  const d = join(T, "route"); board(d, "B", 9);
  await B.takeStills(d, { by: "claude", snap });
  const { boardRoutes } = await import("../packages/server/boards.mjs");
  class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
  let started = null;
  const project = { id: "abc123", path: d, meta: {} };
  const ctx = { root: T, preview: { base: "http://x" }, jobs: { list: () => [] }, stopping: { signal: null },
    agent: { running: new Map(), start: async (_id, o) => { started = o; return { id: "t1" }; } } };
  const { routes } = boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject: () => project, HttpError });
  const call = async (m, path, body) => { for (const [mm, re, fn] of routes) { const x = re.exec(`/api${path}`); if (x && mm === m) return fn(x.slice(1), body ?? {}); } throw new Error(`no route ${m} ${path}`); };
  // the draft: kept, shown with its option, removed by an empty text and on Submit
  await call("PUT", "/projects/abc123/boards/B/feedback-draft", { text: "@Panel_6: logo bigger" });
  assert.equal(JSON.parse(readFileSync(join(d, ".moworks", "boards", "feedback.json"), "utf8")).B.text, "@Panel_6: logo bigger");
  const out = await call("POST", "/projects/abc123/boards/B/feedback", { text: "@Panel_6: logo bigger\n@Panel_12: one more beat" });
  assert.deepEqual([out.option, out.from, out.label, out.panels, out.missing], ["B2", "B", "Option B2 · revised from Option B", [6, 12], [12]]);
  assert.equal(readFileSync(join(d, ".moworks", "boards", "feedback.json"), "utf8").includes("B"), false, "the draft goes once sent");
  assert.equal(started.step, "storyboard"); assert.equal(started.shown, "@Panel_6: logo bigger\n@Panel_12: one more beat", "the chat shows the owner's own words");
  assert.match(started.text, /First check each note against its panel/);
  assert.match(started.text, /notes on panels that do not exist: @Panel_12 \(Option B has 9\)/);
  assert.match(started.text, /is a conflict \(moworks-studio §2b\)[^]*change nothing in boards\/B2\/, and stop/);
  assert.match(started.text, /draw again only the noted panels \(6, 12\)/);
  assert.match(started.text, /board_stills with \{ option: "B2", frames: \[the panels you drew again\] \}/);
  assert.doesNotMatch(started.text, /\bRound\b|\bround \d/, "no Round words (the stills folder is the app's own path)");
  // the dialog's view: options newest on top, labelled, no "Round" words needed
  const v = await call("GET", "/projects/abc123/boards");
  assert.deepEqual(v.options.map((o) => o.label), ["Option B"], "B2 is being revised: not shown until Claude takes its stills");
});

test("a revision Claude stopped to ask about waits for the user (chat card, Waiting row); once drawn it gets its own card", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
  const pipe = await import("../packages/pipeline/index.mjs");
  const d = join(T, "card"); board(d, "A", 3);
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  await B.takeStills(d, { by: "claude", snap });
  const id = projects.openProject(d).id;
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], start: async () => ({ id: "t" }) },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [{ id: "storyboard", stage: 2, status: "needs-you" }] }),
    startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null }, boardStills: () => null };
  const ap = createAutopilot(ctx);
  const cards = () => projects.readNotes(d).filter((n) => n.kind === "waiting");
  B.makeRevision(d, "A", "@Panel_6: logo bigger");          // Claude stopped: panel 6 does not exist
  await ap.taskEnded(id, { id: "r1", status: "done", step: "storyboard" });
  assert.deepEqual(cards().map((n) => n.open), ["chat"], "the card points to Claude's question");
  // the Storyboard row: a needs-you storyboard with a revision being asked about reads "Waiting for you: answer Claude in the chat"
  const st = [{ id: "storyboard", stage: 2, status: "needs-you", asking: true }];
  assert.equal(pipe.stagesOf(st, {})[1].line, "Waiting for you: answer Claude in the chat");
  // the user answers in the chat; Claude draws the revision; the answer's turn ends: a fresh card for A2
  await B.takeStills(d, { by: "claude", snap, retake: { option: "A2", frames: [2] } });
  await ap.taskEnded(id, { id: "c1", status: "done", label: "Storyboard · revision", changed: [] });
  assert.deepEqual(cards().map((n) => [n.open, n.vars?.label]).at(-1), ["storyboard", "Option A2 · revised from Option A"]);
});

test("every option has its name: from its heading, a revision keeps the name of the option it comes from; the prompts ask for it", async () => {
  assert.deepEqual(['Option A · "Mảnh giấy vàng"', "Option B: Đánh thức", "Option B2 · revised from Option B", 'Option B2 · "Đánh thức" · revised from Option B', "Option C", ""].map(B.optionName),
    ["Mảnh giấy vàng", "Đánh thức", "", "Đánh thức", "", ""]);
  const d = join(T, "named"); board(d, "B", 3);
  writeFileSync(join(d, "boards", "B", "STORYBOARD.md"), readFileSync(join(d, "boards", "B", "STORYBOARD.md"), "utf8").replace("# Option B", '# Option B · "Đánh thức"'));
  await B.takeStills(d, { by: "claude", snap });
  const { boardRoutes } = await import("../packages/server/boards.mjs");
  class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
  let started = null;
  const project = { id: "abc124", path: d, meta: {} };
  const ctx = { root: T, preview: { base: "http://x" }, jobs: { list: () => [] }, stopping: { signal: null },
    agent: { running: new Map(), start: async (_id, o) => { started = o; return { id: "t2" }; } } };
  const { routes } = boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject: () => project, HttpError });
  const call = async (m, path, body) => { for (const [mm, re, fn] of routes) { const x = re.exec(`/api${path}`); if (x && mm === m) return fn(x.slice(1), body ?? {}); } throw new Error(`no route ${m} ${path}`); };
  assert.equal((await call("GET", "/projects/abc124/boards")).options[0].name, "Đánh thức");
  await call("POST", "/projects/abc124/boards/B/feedback", { text: "@Panel_2: warmer" });
  assert.match(started.text, /set its heading to "# Option B2 · "Đánh thức" · revised from Option B"/);
  // the revision drawn: its stills taken, its heading as Claude wrote it with no name: the dialog still names it
  writeFileSync(join(d, "boards", "B2", "STORYBOARD.md"), readFileSync(join(d, "boards", "B2", "STORYBOARD.md"), "utf8").replace(/^# .*$/m, "# Option B2 · revised from Option B"));
  await B.takeStills(d, { by: "claude", snap, retake: { option: "B2", frames: [2] } });
  const b2 = B.listRounds(d).at(-1).options.find((o) => o.option === "B2");
  assert.equal(b2.name, "Đánh thức");
  const src = readFileSync(new URL("../packages/server/index.mjs", import.meta.url), "utf8");
  assert.match(src, /Set its heading to "# Option \$\{letter\} · \\"<its name>\\"": a short name for its idea, in the language of the chat/);
  assert.match(readFileSync(new URL("../config/rules/general-style/references/storyboard.md", import.meta.url), "utf8"), /Its heading names it/);
});

test("Make another option and Feedback say what they take, from this film's own storyboard tasks, else the usual", async () => {
  const { boardEstimates } = await import("../packages/server/boards.mjs");
  const min = (m) => m * 60000;
  const tasks = [
    { step: "brief", status: "done", text: "Read the brief", durationMs: min(1) },
    { step: "storyboard", status: "done", text: "Make one storyboard option as your rules say", durationMs: min(13.4), usage: { costUsd: 3.51 } },
    { step: "storyboard", status: "done", text: "Make one more storyboard option, Option B (boards/B/)", durationMs: min(10.2), usage: { costUsd: 2.56 } },
    { step: "storyboard", status: "done", text: "The owner's feedback on storyboard Option B (their words, as they wrote them):", durationMs: min(0.4), usage: { costUsd: 0.26 } },
    { step: null, status: "done", label: "Storyboard · revision", text: "Đúng rồi: phóng to logo ở khung 11", durationMs: min(4), usage: { costUsd: 0.85 } },
    { step: "storyboard", status: "cancelled", text: "Make one more storyboard option, Option C", durationMs: min(1) },
  ];
  const e = boardEstimates(tasks, "anidoodle-fox");
  assert.deepEqual(e.option, { minutes: 12, high: 18, costUsd: 3.04, costHigh: 3.8, basis: "this film", runs: 2 });
  assert.deepEqual(e.feedback, { minutes: 4, high: 6, costUsd: 1.11, costHigh: 1.4, basis: "this film", runs: 1 });
  // the usual, from the films of Tests 17-24 (T23-11)
  assert.deepEqual(boardEstimates([], "anidoodle-fox").option, { minutes: 25, high: 38, costUsd: 6.5, costHigh: 8.1, basis: "usual", runs: 0 });
  assert.deepEqual(boardEstimates([], "general"), { option: { minutes: 22, high: 33, costUsd: 4.4, costHigh: 5.5, basis: "usual", runs: 0 }, feedback: { minutes: 5, high: 8, costUsd: 1, costHigh: 1.3, basis: "usual", runs: 0 },
    motion: { minutes: 5, high: 8, costUsd: 1.3, costHigh: 1.8, basis: "usual", runs: 0 } });
  // Approve storyboard says what the Motion Plan takes, from this film's own when it wrote one before
  assert.deepEqual(boardEstimates([{ step: "motionSpec", status: "done", text: "Write the Motion Plan", durationMs: 4.6 * 60000, usage: { costUsd: 1.25 } }]).motion,
    { minutes: 5, high: 8, costUsd: 1.25, costHigh: 1.6, basis: "this film", runs: 1 });
  // the dialog's view carries them
  const d = join(T, "estimates"); board(d, "A", 3);
  await B.takeStills(d, { by: "claude", snap });
  const { boardRoutes } = await import("../packages/server/boards.mjs");
  const project = { id: "abc125", path: d, meta: { style: { id: "anidoodle-fox" } } };
  const ctx = { root: T, preview: { base: "http://x" }, jobs: { list: () => [] }, stopping: { signal: null }, agent: { running: new Map(), list: () => tasks } };
  const { routes } = boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject: () => project, HttpError: Error });
  const [, , get] = routes.find(([m, re]) => m === "GET" && re.test("/api/projects/abc125/boards"));
  assert.equal((await get(["abc125"], {})).estimates.option.minutes, 12);
});

test("What If demo: its storyboard step's own words count as an option in the estimates, and its prompt names option A", async () => {
  const { boardEstimates } = await import("../packages/server/boards.mjs");
  const e = boardEstimates([{ step: "storyboard", status: "done", text: "Make the storyboard as the what-if-style pack says (the author's steps 3 to 5)", durationMs: 16 * 60000, usage: { costUsd: 4.12 } }], "what-if");
  assert.deepEqual(e.option, { minutes: 16, high: 24, costUsd: 4.12, costHigh: 5.2, basis: "this film", runs: 1 });
  const wi = JSON.parse(readFileSync(new URL("../config/what-if-pipeline.json", import.meta.url), "utf8")).pipeline.find((s) => s.id === "storyboard").action.prompt;
  assert.match(wi, /its heading `# Option A · "<a short name for its idea>"` in the language of the chat/);
  assert.match(wi, /every frame one shot with its own seconds/);
});

test("a board made before its heading carried the name gets it from its front matter or its first bold quote; its revisions too", async () => {
  const d = join(T, "older-names"); board(d, "B", 2); board(d, "C", 2);
  const set = (o, head) => writeFileSync(join(d, "boards", o, "STORYBOARD.md"), head + readFileSync(join(d, "boards", o, "STORYBOARD.md"), "utf8"));
  set("B", '---\nformat: 1080x1080\noption: B "Đánh thức"\n---\n\n');
  writeFileSync(join(d, "boards", "C", "STORYBOARD.md"), readFileSync(join(d, "boards", "C", "STORYBOARD.md"), "utf8").replace("- idea: the tea", '**"Ngủ quên".** Another telling.'));
  await B.takeStills(d, { by: "claude", snap });
  const names = Object.fromEntries(B.listRounds(d).at(-1).options.map((o) => [o.option, o.name]));
  assert.deepEqual([names.B, names.C], ["Đánh thức", "Ngủ quên"]);
});

test("a revision keeps its \"revised\" panels in every later round, even when a round in between did not record them", async () => {
  const d = join(T, "keep-revised"); board(d, "A", 4);
  await B.takeStills(d, { by: "claude", snap });
  B.makeRevision(d, "A", "@Panel_2: bigger\n@Panel_3: darker");
  writeFileSync(join(d, "boards", "A2", "index.html"), readFileSync(join(d, "boards", "A2", "index.html"), "utf8") + "<!-- redrawn -->");
  const r1 = await B.takeStills(d, { by: "claude", snap, retake: { option: "A2", frames: [2, 3] } });
  assert.deepEqual(r1.round.options.find((o) => o.option === "A2").revised, [2, 3]);
  // a round that lost them (the rounds after "Make another option" wrote A2's as [])
  const rj = join(d, "boards", "rounds", r1.round.id, "round.json");
  const info = JSON.parse(readFileSync(rj, "utf8")); info.revisions.A2.revised = []; writeFileSync(rj, JSON.stringify(info));
  board(d, "B", 3);
  const r2 = await B.takeStills(d, { by: "claude", snap });
  assert.deepEqual(r2.round.options.find((o) => o.option === "A2").revised, [2, 3], "Make another option: A2 keeps its marks");
});

test("board_stills hands Claude what the film style's own file forbids, to check every panel against (Brick Toy: no minifigure)", async (t) => {
  const { styleNevers } = await import("../packages/style-catalog/index.mjs");
  const brick = styleNevers("lemo-brick-toy");
  if (!brick.length) return t.skip("Lemo-Opuscar is not pinned here");
  assert.ok(brick.some((x) => /minifigure silhouette/.test(x)), brick.join(" | "));
  assert.deepEqual(styleNevers("general"), [], "a style with no author's file of its own: nothing added");
  assert.match(readFileSync(new URL("../packages/server/boards.mjs", import.meta.url), "utf8"), /The film style's own file forbids \(check every panel against it/);
});

test("each option's own time and task are those of the first round that shows it as it is now, not of a round that only carries it", async () => {
  const d = join(T, "option-times"); board(d, "A", 3);
  const r1 = await B.takeStills(d, { by: "claude", taskId: "tA", snap });
  B.makeRevision(d, "A", "@Panel_2: warmer");
  writeFileSync(join(d, "boards", "A2", "index.html"), readFileSync(join(d, "boards", "A2", "index.html"), "utf8") + "<!-- 2 -->");
  const r2 = await B.takeStills(d, { by: "claude", taskId: "tRev", snap, retake: { option: "A2", frames: [2] } });
  board(d, "B", 3);
  const r3 = await B.takeStills(d, { by: "claude", taskId: "tB", snap });
  const all = B.listRounds(d), now = all.at(-1);
  const first = (o) => B.firstRoundOf(all, o, now.options.find((x) => x.option === o).hash);
  assert.deepEqual([first("A").id, first("A2").id, first("B").id], [r1.round.id, r2.round.id, r3.round.id]);
  assert.equal(first("A2").taskId, "tRev", "the task that drew A2, not the one that made B (it carries A2 too)");
  assert.equal(first("B").taskId, "tB");
  const { boardRoutes } = await import("../packages/server/boards.mjs");
  const project = { id: "abc126", path: d, meta: {} };
  const ctx = { root: T, preview: { base: "http://x" }, jobs: { list: () => [] }, stopping: { signal: null }, agent: { running: new Map(), list: () => [] } };
  const { routes } = boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject: () => project, HttpError: Error });
  const [, , get] = routes.find(([m, re]) => m === "GET" && re.test("/api/projects/abc126/boards"));
  const v = await get(["abc126"], {});
  assert.equal(v.options.find((o) => o.option === "A").at, r1.round.at);
  assert.equal(v.options.find((o) => o.option === "B").at, r3.round.at);
});

test("a later take that recorded fewer revised panels keeps the earlier ones (R4 [5, 9, 10], R5 [5, 9] → [5, 9, 10])", async () => {
  const d = join(T, "revised-add-up"); board(d, "A", 4);
  await B.takeStills(d, { by: "claude", snap });
  B.makeRevision(d, "A", "@Panel_2: bigger\n@Panel_3: darker");
  writeFileSync(join(d, "boards", "A2", "index.html"), readFileSync(join(d, "boards", "A2", "index.html"), "utf8") + "<!-- 1 -->");
  const r1 = await B.takeStills(d, { by: "claude", snap, retake: { option: "A2", frames: [2, 3] } });
  writeFileSync(join(d, "boards", "A2", "index.html"), readFileSync(join(d, "boards", "A2", "index.html"), "utf8") + "<!-- 2 -->");
  const r2 = await B.takeStills(d, { by: "claude", snap, retake: { option: "A2", frames: [2] } });
  // the round as the old code wrote it: only the last retake's panels
  const rj = join(d, "boards", "rounds", r2.round.id, "round.json");
  const info = JSON.parse(readFileSync(rj, "utf8")); info.revisions.A2.revised = [2]; writeFileSync(rj, JSON.stringify(info));
  assert.deepEqual(B.listRounds(d).find((r) => r.id === r2.round.id).options.find((o) => o.option === "A2").revised, [2, 3]);
  assert.deepEqual(B.listRounds(d).find((r) => r.id === r1.round.id).options.find((o) => o.option === "A2").revised, [2, 3]);
});

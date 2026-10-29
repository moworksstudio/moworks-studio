// A question with its numbered choices is a question, the "ready, approve them" card only once the model sheets are
// drawn, a passed gate closes its older "found problems" cards; a message being sent already answers the question; an anidoodle
// sample brief at the medium's own frame rate. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t15-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
after(() => rmSync(T, { recursive: true, force: true }));

test("a question followed by its numbered or bulleted choices is a question; a list that asks nothing is not", async () => {
  const { endsWithQuestion: q } = await import("../packages/pipeline/index.mjs");
  assert.equal(q("Tôi chưa vẽ được bảng mẫu.\nBạn muốn làm tiếp thế nào?\n1. **Chờ app vẽ được bảng mẫu**, tôi xem xong rồi bạn mới duyệt.\n2. Duyệt luôn bây giờ."), true);
  assert.equal(q("Which way?\n- keep it\n- draw it again"), true);
  assert.equal(q("Done. I changed:\n1. Shot 1 is brighter.\n2. The title is bigger."), false);
  assert.equal(q("Which one?\n1. A\nThat is all from me."), false, "a sentence after the choices: the question is not the end");
  assert.equal(q("Bạn thấy sao?"), true);
});

test("a passed gate closes the older \"found problems\" cards", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const d = join(T, "notes"); mkdirSync(join(d, ".moworks"), { recursive: true });
  projects.addNote(d, { kind: "characters", status: "warning", text: "The character gate found problems: Claude fixes them" });
  projects.addNote(d, { kind: "checks", status: "warning", text: "other" });
  assert.equal(projects.updateNotes(d, (n) => n.kind === "characters" && n.status === "warning", { status: "done" }), 1);
  assert.deepEqual(projects.readNotes(d).map((n) => n.status), ["done", "warning"]);
});

test("while a message is being sent (the sign-in check before its task exists) the Pipeline no longer waits for an answer", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, p, b) => (await fetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined })).json();
    const p = await call("POST", "/projects", { title: "demo-t15-answer", aspect: "16:9", durationSec: 10, styleId: "general", brief: "Thử" });
    const agent = s.agent;
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(p.path, "BRIEF.md"), "# Brief\n\nThử.\n");          // Prepare's file: the step is done, its last task asked
    agent.tasks.set("asked1", { id: "asked1", projectId: p.id, step: "brief", status: "done", resultText: "Font nào?\n1. Lobster\n2. Patrick Hand", createdAt: new Date().toISOString() });
    const waits = (r) => r.steps.some((x) => x.asking) || r.stages.some((x) => x.line === "Waiting for you: answer Claude in the chat");
    const r0 = await call("GET", `/projects/${p.id}/pipeline`);
    const before = waits(r0);
    if (!before) console.log("brief:", JSON.stringify(r0.steps.find((x) => x.id === "brief")));
    agent.starting.add(p.id);
    const during = waits(await call("GET", `/projects/${p.id}/pipeline`));
    agent.starting.delete(p.id);
    assert.deepEqual([before, during], [true, false]);
  } finally { await s.close(); }
});

test("Agent.start marks the project as starting during the sign-in check, and clears it", async () => {
  const { Agent } = await import("../packages/agent/index.mjs");
  const { APP_ROOT } = await import("../packages/version-manager/index.mjs");
  let seen = null;
  const a = new Agent({ root: APP_ROOT, getProject: () => null });
  a.signIn = async () => { seen = a.starting.has("p1"); throw Object.assign(new Error("signed out"), { code: "CLAUDE_SIGNED_OUT" }); };
  a.getProject = () => ({ id: "p1", path: T, meta: {} });
  await a.start("p1", { text: "hi" }).catch(() => {});
  if (seen === null) return;          // no Claude on this computer: start stops before the sign-in
  assert.deepEqual([seen, a.starting.has("p1")], [true, false]);
});

test("every anidoodle sample brief is at its medium's own frame rate (New project's default)", async () => {
  const { ANIDOODLE_BRIEF_SAMPLES } = await import("../ui/src/workflow/briefSampleAnidoodle.js");
  const { formatOf } = await import("../packages/style-catalog/index.mjs");
  const off = Object.entries(ANIDOODLE_BRIEF_SAMPLES).filter(([id, x]) => formatOf(id) && x.fields.fps !== formatOf(id).fps.default).map(([id]) => id);
  assert.deepEqual(off, []);
});

test("choices for the user with no question mark are a question; a step whose turn asked waits for the answer, never runs again", async () => {
  const P = await import("../packages/pipeline/index.mjs");
  assert.equal(P.asksOwner("Tôi dừng trước khi viết Motion Plan vì giọng lệch storyboard.\n1. Bạn **chọn a, b hoặc c**: a) giữ giọng, dời điểm cắt; b) làm lại giọng; c) giữ cả hai."), true);
  assert.equal(P.asksOwner("Tôi dừng lại hỏi trước.\na. Tạo lại giọng.\nb. Giữ giọng này.\nc. Rút phim còn 45 s."), true);
  assert.equal(P.asksOwner("Done: shot a) is brighter and b) has the bigger title."), false, "no asking word: a report");
  assert.equal(P.asksOwner("Xong. Tôi đã sửa 3 cảnh."), false);
  const steps = [{ id: "motionSpec", stage: 3, title: "Motion Plan", action: { kind: "claude" }, done: { file: "MOTION-PLAN.json" } }];
  const facts = (asked) => ({ marks: {}, ran: { motionSpec: { at: new Date().toISOString() } }, file: () => null, lastTasks: { motionSpec: { status: "done", asked } } });
  const no = P.computePipeline(steps, facts(false)), yes = P.computePipeline(steps, facts(true));
  assert.equal(P.nextAuto(no)?.id, "motionSpec", "a turn that did not ask: the autopilot runs the step again (as before)");
  assert.deepEqual([yes[0].status, yes[0].asking, P.nextAuto(yes)], ["ready", true, null], "a turn that asked: it waits for the answer");
});

test("a voice-over transcribed while Claude draws the storyboard is checked after that turn: the drawn storyboard is timed to the real voice", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
  const p = await projects.createProject({ title: "demo-t14-voice", aspect: "16:9", durationSec: 50, brief: "Phim thử", style: { id: "general", title: "General" } }, {});
  projects.updateMeta(p.id, (m) => { m.voice = { file: "assets/3_audio/voiceover/v.mp3", info: { duration: 40.3 }, transcript: { status: "saved" } }; });
  const started = [], running = new Map([[p.id, "sb-task"]]);
  let sbStatus = "running";
  const ctx = { root: T, renders: createRenderQueue(), agent: { running, start: async (_id, t) => { started.push(t); return { id: "t" }; } },
    pipelineOf: async () => ({ state: [{ id: "brief", status: "done" }, { id: "storyboard", status: sbStatus }] }), startQa: () => null, scanAssets: async () => {}, mix: {} };
  const ap = createAutopilot(ctx);
  assert.equal(await ap.transcriptLanded(p.id), null, "Claude at work: nothing starts now");
  assert.ok(projects.getProject(p.id).meta.pipeline.voiceCheck, "kept for when the turn ends");
  assert.equal(await ap.voiceCheckDue(p.id), null, "still at work");
  running.clear(); sbStatus = "needs-you";
  await ap.voiceCheckDue(p.id);
  assert.equal(started.length, 1);
  assert.equal(started[0].step, "storyboard");
  assert.match(started[0].text, /40\.3 s[^]*Time every frame/);
  assert.equal(projects.getProject(p.id).meta.pipeline.voiceCheck, undefined, "checked once");
  sbStatus = "done";
  await ap.transcriptLanded(p.id);
  assert.match(started[1].text, /after the storyboard was approved[^]*stop and ask/);
  assert.equal(started[1].step, undefined, "an approved storyboard is not redrawn: Claude checks and asks");
});

test("lyrics the app has not timed are never placed by guess: Claude says what to press and stops; timed ones are placed at their times", async () => {
  const { writeFileSync, utimesSync } = await import("node:fs");
  const { lyricsLine } = await import("../packages/agent/index.mjs");
  const d = join(T, "lyrics"); mkdirSync(join(d, ".moworks", "lyrics"), { recursive: true });
  assert.equal(lyricsLine(d), "", "no lyrics: nothing");
  writeFileSync(join(d, "lyrics.txt"), "Sóng 88.8\nCó người vẫn đang nghe\n");
  assert.match(lyricsLine(d), /not timed them yet[^]*Never place lyrics by guess[^]*press Time the lyrics[^]*stop/);
  writeFileSync(join(d, ".moworks", "lyrics", "words.json"), JSON.stringify({ at: new Date(Date.now() + 5000).toISOString(), words: [] }));
  assert.match(lyricsLine(d), /timed by the app: LYRICS-TIMED\.md/);
  const later = new Date(Date.now() + 60000); utimesSync(join(d, "lyrics.txt"), later, later);
  assert.match(lyricsLine(d), /changed after the last timing/);
});

test("the part of the song the film plays (used), and the lyrics' line marks moved into that part", async () => {
  const { writeFileSync } = await import("node:fs");
  const { musicUsed } = await import("../packages/hf-edit/tracks.mjs");
  const { shiftMarks } = await import("../packages/voice/lyrics.mjs");
  const d = join(T, "used"); mkdirSync(d, { recursive: true });
  const root = (audio = "") => writeFileSync(join(d, "index.html"), `<div id="root" data-composition-id="main" data-start="0" data-duration="50" data-width="1080" data-height="1080">${audio}</div>`);
  root();
  assert.deepEqual(musicUsed(d, { trackDuration: 105.672 }), { start: 0, end: 50 }, "no music on the timeline yet: from 0 for the film's length");
  root('<audio id="el-music" src="a.mp3" data-start="0" data-duration="105.672" data-timeline-role="music"></audio>');
  assert.deepEqual(musicUsed(d, { trackDuration: 105.672 }), { start: 0, end: 50 }, "cut at the film's end");
  root('<audio id="el-music" src="a.mp3" data-start="5" data-media-start="20" data-duration="30" data-timeline-role="music"></audio>');
  assert.deepEqual(musicUsed(d), { start: 20, end: 50 }, "from its trim, for its own length");
  assert.equal(shiftMarks("[0:57.5] a\n[60.00] b\nc", 50), "[0:7.50] a\n[10.00] b\nc");
});

test("tracks found before the build put track 1 on the timeline, and Claude never sends the user to the Final Mix to listen first", async () => {
  const { optionsText } = await import("../packages/sfx/music.mjs");
  const round = { id: "R1", tracks: [{ title: "Sun in Your Eyes", file: "audio/music-options/R1/1-sun.mp3", duration: 105.7 }, { title: "B", file: "b.mp3" }], failed: [] };
  const t = optionsText(round, { placedNow: true });
  assert.match(t, /Track 1 \("Sun in Your Eyes"\) is on the timeline now[^]*Do not say the owner listens in the Final Mix before the build/);
  assert.ok(!/saved for the owner to listen to in the Final Mix dialog/.test(t));
});

test("the words Claude wrote to read fill the Voice screen's Script box: VOICEOVER.md, else the brief's numbered lines only", async () => {
  const { writeFileSync, rmSync: rm } = await import("node:fs");
  const { scriptDraft } = await import("../packages/voice/script.mjs");
  const d = join(T, "script"); mkdirSync(d, { recursive: true });
  assert.equal(scriptDraft(d), null);
  writeFileSync(join(d, "BRIEF.md"), "## Customizations\n\n- Vietnamese voice-over. Script to read, one line per scene:\n  1. Thành phố Neon.\n  2. Cô bấm PLAY.\n- On-screen text in Archivo.\n");
  assert.deepEqual(scriptDraft(d), { text: "Thành phố Neon.\nCô bấm PLAY.", from: "BRIEF.md" });
  writeFileSync(join(d, "VOICEOVER.md"), "# Lời đọc\n\n1. Một.\n2. Hai.\n");
  assert.deepEqual(scriptDraft(d), { text: "Một.\nHai.", from: "VOICEOVER.md" });
  rm(join(d, "VOICEOVER.md"));
});

test("a Vocabulary item Claude cites is a Library item, an unknown kind is Claude's (New); By you only for a row with no source", async () => {
  const { cleanMotion } = await import("../packages/motion-plan/index.mjs");
  const src = (s) => cleanMotion({ target: "#a", source: s }).source;
  assert.deepEqual(src({ kind: "vocab", id: "anticipation" }), { kind: "library", id: "vocab/anticipation" });
  assert.deepEqual(src({ kind: "something" }), { kind: "claude" });
  assert.deepEqual(src(undefined), { kind: "manual" });
});

test("the approved cast stays approved when an earlier step (Prepare, after the voice answer) runs again", async () => {
  const { writeFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const P = await import("../packages/pipeline/index.mjs");
  const { pipelineSteps } = await import("../packages/server/index.mjs");
  const dir = join(T, "cast"); mkdirSync(join(dir, ".moworks"), { recursive: true });
  const cast = JSON.stringify({ characters: [{ id: "muc", name: "Mực" }] });
  writeFileSync(join(dir, "CHARACTERS.json"), cast); writeFileSync(join(dir, "BRIEF.md"), "# Brief\n");
  const hash = createHash("sha256").update(cast).digest("hex");
  // the cast approved at 17:27, Prepare ran again for the voice answer at 18:02 (no "keep it as it is" yet)
  const meta = { style: { id: "anidoodle-rubberHose" }, approvals: { characters: { at: "2026-10-26T17:27:35.873Z", hash } },
    pipeline: { marks: { brief: { at: "2026-10-26T18:02:03.509Z", by: "claude" } }, ran: { brief: { at: "2026-10-26T18:02:03.509Z" }, character: { at: "2026-10-26T16:54:33.032Z" } } } };
  const steps = pipelineSteps("anidoodle-rubberHose").filter((s) => ["brief", "character"].includes(s.id));
  const st = P.computePipeline(steps, P.gatherFacts({ id: "t15", path: dir, meta }, { shots: [], head: null, jobs: [], runningTask: null, lastTasks: {} }));
  const ch = st.find((x) => x.id === "character");
  assert.equal(ch.status, "done", JSON.stringify(ch.reason));
});

test("the user's message closes Claude's \"Answer Claude\" cards; other waits stay", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const d = join(T, "waits"); mkdirSync(join(d, ".moworks"), { recursive: true });
  projects.addNote(d, { kind: "waiting", open: "chat", text: "Claude needs your choice before it goes on: read its message and answer in the chat." });
  projects.addNote(d, { kind: "waiting", open: "storyboard", text: "{label} is ready" });
  assert.equal(projects.closeChatWaits(d), 1);
  assert.deepEqual(projects.readNotes(d).map((n) => [n.kind, n.open]), [["answered", "chat"], ["waiting", "storyboard"]]);
});

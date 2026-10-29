// The voice's length asked before the Storyboard draws holds the pipeline whatever the reply's words:
// Claude asked with "·", "hoặc" and numbered points, the app read no question and ran the Storyboard 3 times, $0.74.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t17-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const P = await import("../packages/pipeline/index.mjs");
// The reply of that run, word for word
const T17 = "Giọng đọc dài **40,5 giây**, dài hơn phim 32 giây đã đặt, nên tôi cần bạn chọn trước khi vẽ storyboard:\n\n1. Kéo phim lên **43 giây** (đủ giọng đọc và giữ câu cuối thêm khoảng 2 giây) · làm lại giọng với lời ngắn hơn · cho giọng đọc nhanh hơn trên màn hình Voice. Tôi đề xuất kéo phim lên 43 giây. Các khoảng nghỉ giữa các câu cộng lại chưa tới 8,5 giây nên không rút bớt được.\n2. Khoảng lặng trước câu \"Nhưng ly không hề nứt\" chỉ có **0,36 giây**: giữ nguyên, nhạc tắt ở đó và hình đứng lại một nhịp · hoặc làm lại giọng với khoảng ngừng dài hơn. Tôi đề xuất giữ nguyên.";

test("Vietnamese choice lists are questions to the user; offers and reports are not", () => {
  assert.equal(P.asksOwner(T17), true);
  assert.equal(P.asksOwner("Cách thứ nhất: giữ 32 s. Cách thứ hai: kéo phim lên 43 s. Bạn chọn cách nào để tôi vẽ tiếp."), true);
  assert.equal(P.asksOwner("Bạn muốn kéo phim lên 43 s hoặc làm lại giọng ngắn hơn."), true);
  assert.equal(P.asksOwner("Let me know which: 1. a longer film 2. a shorter script"), true);
  assert.equal(P.asksOwner("Xong phim. Nếu bạn muốn đổi màu hoặc nhạc, cứ nói."), false, "an offer");
  assert.equal(P.asksOwner("Đã sửa:\n1. Màu nền.\n2. Phông chữ.\nRender lúc nào cũng được."), false, "a report");
  assert.equal(P.asksOwner("Done. If you want another take or a new colour, tell me."), false);
});

test("a task the app sent to ask holds the step whatever its words, unless it drew the storyboard", () => {
  assert.equal(P.appAsked({ asks: "voiceFit:40.5/32", changed: [{ path: "NOTES.md" }] }), true);
  assert.equal(P.appAsked({ asks: "voiceFit:40.5/32", changed: [{ path: "boards/A/STORYBOARD.md" }] }), false, "it drew anyway");
  assert.equal(P.appAsked({ changed: [] }), false);
  // the step waits: no autopilot run, its row says Waiting for you
  const steps = [{ id: "brief", stage: 1, title: "Prepare", done: { kind: "mark", file: "BRIEF.md" }, action: { kind: "claude" } },
    { id: "storyboard", stage: 2, title: "Storyboard", needs: ["brief"], gate: true, done: { kind: "approval", name: "storyboard" }, action: { kind: "claude" } }];
  const f = { brief: { text: "x", at: 1 }, assets: { count: 0, sources: 0 }, file: (p) => (p === "BRIEF.md" ? { at: 1 } : null), storyboard: { real: false }, motionPlan: {},
    approvals: {}, voice: {}, marks: { brief: { at: new Date(1).toISOString() } }, skips: {}, ran: {}, built: {}, flags: {},
    lastTasks: { storyboard: { status: "done", asked: true } } };
  const state = P.computePipeline(steps, f);
  assert.equal(state[1].asking, true); assert.equal(P.nextAuto(state), null);
});

test("the Storyboard's voice-length question is marked as the app's; once answered in the chat it is followed, not asked again", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
  const d = mkdtempSync(join(T, "film-"));
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-duration="32"></div>\n');
  const id = projects.openProject(d, T).id;
  projects.updateMeta(id, (m) => { m.title = "demo-t17"; m.targetDurationSec = 32;
    m.voice = { file: "assets/3_audio/voice/v.mp3", source: "elevenlabs", info: { duration: 40.5 }, transcript: { status: "saved" } }; }, T);
  const tasks = [], started = [];
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => tasks, start: async (_id, o) => { started.push(o); return { id: `t${started.length}` }; } },
    pipelineOf: async (pid) => ({ p: projects.getProject(pid, T), facts: {}, state: [] }) };
  const ap = createAutopilot(ctx);
  const sb = { id: "storyboard", action: { kind: "claude", prompt: "Make the storyboard." } };
  await ap.startStep(id, sb, { fromAuto: true });
  assert.equal(started[0].asks, "voiceFit:40.5/32");
  assert.match(started[0].text, /^Before you draw anything: The voice-over is 40\.5 s/);
  // its turn ended with the question, then the user answered in the chat: the next run follows the answer
  tasks.push({ id: "t1", step: "storyboard", status: "done", asks: "voiceFit:40.5/32" }, { id: "t2", step: null, status: "done" });
  await ap.startStep(id, sb, { fromAuto: true });
  assert.equal(started[1].asks, undefined);
  assert.match(started[1].text, /^The owner answered your question on the voice-over's length in the chat/);
  assert.doesNotMatch(started[1].text, /Before you draw anything/);
  // a new length or a new voice is a new question
  projects.updateMeta(id, (m) => { m.voice.info.duration = 44; }, T);
  await ap.startStep(id, sb, { fromAuto: true });
  assert.equal(started[2].asks, "voiceFit:44/32");
});

// One render at a time in the app, the build-time estimate, the user's "continue" after a Stop. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RESUME, createRenderQueue, estimateMinutes } from "../packages/server/autopilot.mjs";

test("renders: one at a time in the whole app; a project counts as rendering only while its render runs", async () => {
  const q = createRenderQueue();
  const order = [], waited = [];
  const a = await q.acquire("p1", "Phim A");
  assert.equal(q.isRendering("p1"), true);
  const bDone = q.acquire("p2", "Phim B", (other) => waited.push(other.title)).then((release) => { order.push("B"); return release; });
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(waited, ["Phim A"], "B is told it waits for A");
  assert.deepEqual(order, [], "B waits while A renders");
  assert.equal(q.isRendering("p2"), false, "a waiting render does not lock its project");
  assert.deepEqual(q.status(), { running: { projectId: "p1", title: "Phim A" }, queued: 1 });
  order.push("A"); a();
  const b = await bDone;
  assert.deepEqual(order, ["A", "B"]);
  assert.equal(q.isRendering("p1"), false); assert.equal(q.isRendering("p2"), true);
  b();
  assert.deepEqual(q.status(), { running: null, queued: 0 });
});

test("the build estimate: from the film's length and kind, never from builds run again and again", () => {
  const T = mkdtempSync(join(tmpdir(), "mw-autopilot-"));
  const was = process.env.MW_STATE_DIR;
  process.env.MW_STATE_DIR = join(T, "state");
  try {
    assert.deepEqual(estimateMinutes(5, T, { seconds: 10, styleId: "hf-launch" }), { minutes: 24, high: 36, covers: "build, review, music and checks", basis: "length" }, "a 10 s HF film: 24 (QA run 05), not 38");
    assert.equal(estimateMinutes(10, T, { seconds: 10, styleId: "brush-cartoon" }).minutes, 24, "a 10 s Brush film: 24 (23-25 measured), not 64");
    assert.equal(estimateMinutes(10, T, { seconds: 30, styleId: "lemo-brick-toy" }).minutes, 32, "#483: Test 12's 30 s Lemo film took 32, not about 14");
    assert.equal(estimateMinutes(10, T, { seconds: 30, styleId: "what-if" }).minutes, 28, "the What If demo: 27");
    assert.equal(estimateMinutes(30, T, { seconds: 30, styleId: "anidoodle-storybook" }).minutes, 43, "#357, Test 11: 30 s anidoodle films took 37 and 49, not 14");
    assert.equal(estimateMinutes(10, T, { seconds: 60, styleId: "general" }).minutes, 64);
    assert.equal(estimateMinutes(4, T).minutes, 29, "no length: 4 s a shot");
    // T20-7: "Approve and build" to the finished film in Tests 17-21 (one or two films on the computer), each inside its range and
    // near its middle; the popup said "120-168" for Tests 20 and 21 (64.7 and 82 min)
    for (const [style, seconds, real, run] of [["lemo-whiteboard", 43, 36.4, 17], ["mg-19-paperclip", 72.8, 53.7, 18], ["lemo-silent-film", 34, 44.3, 19],
      ["lemo-memphis-diorama", 105, 64.7, 20], ["anidoodle-midcentury-gouache", 100, 82, 21]]) {
      const e = estimateMinutes(10, T, { seconds, styleId: style });
      assert.ok(real >= e.minutes * 0.75 && real <= e.high, `Test ${run}: ${real} min against ${e.minutes}-${e.high}`);
      assert.ok(e.high <= e.minutes * 1.5 + 1, "a range, not twice the time");
    }
    const t20 = estimateMinutes(12, T, { seconds: 105, styleId: "lemo-memphis-diorama" });
    assert.deepEqual([t20.minutes, t20.high], [65, 98], "Test 20: about 65-98, not 120-168");
    assert.ok(estimateMinutes(12, T, { seconds: 600, styleId: "lemo-memphis-diorama" }).minutes > 120, "a long film is not held to 2 hours");
    mkdirSync(process.env.MW_STATE_DIR, { recursive: true });
    writeFileSync(join(process.env.MW_STATE_DIR, "build-times.json"), JSON.stringify({ builds: Array.from({ length: 6 }, () => ({ shots: 5, minutes: 60 })) }));
    assert.equal(estimateMinutes(5, T, { seconds: 10, styleId: "general" }).minutes, 24, "slow builds before do not push it up");
  } finally { if (was === undefined) delete process.env.MW_STATE_DIR; else process.env.MW_STATE_DIR = was; rmSync(T, { recursive: true, force: true }); }
});

test("Claude Code's sign-in refresh race is retried once, a real sign-out is not", async () => {
  const { OAUTH_RACE } = await import("../packages/agent/index.mjs");
  assert.match("Failed to refresh OAuth token: another Claude Code process is refreshing it or exited mid-refresh. This is usually transient", OAUTH_RACE);
  assert.doesNotMatch("Invalid API key · Please run /login", OAUTH_RACE);
});

test("the user's word to carry on a stopped step", () => {
  for (const s of ["chạy tiếp", "Chạy tiếp nhé", "tiếp tục", "làm tiếp đi", "continue", "go on"]) assert.match(s, RESUME, s);
  for (const s of ["chạy thử shot 2", "đổi màu tiếp theo", "hãy dừng"]) assert.doesNotMatch(s, RESUME, s);
});

test("a code film's smooth preview holds the render queue but is not a render: Claude, chat and Send stay open", async () => {
  const q = createRenderQueue();
  const release = await q.acquire("p1", "Film (preview)", () => {}, { preview: true });
  assert.equal(q.isRendering("p1"), false, "a preview locks nothing");
  assert.equal(q.isRendering("p1", { previews: true }), true);
  release();
  const r2 = await q.acquire("p1", "Film");
  assert.equal(q.isRendering("p1"), true, "a real render still does");
  r2();
});

test("a style's rate rule holds the moment the project service is loaded (a script or worker reading a project at once)", async () => {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync(process.execPath, ["--input-type=module", "-e",
    `const m = await import(${JSON.stringify(new URL("../packages/project-service/index.mjs", import.meta.url).href)}); console.log(m.projectFps({ meta: { style: { id: "brush-cartoon" }, format: { fps: 60 } } }));`], { encoding: "utf8", windowsHide: true }).trim();
  assert.equal(out, "30");
});

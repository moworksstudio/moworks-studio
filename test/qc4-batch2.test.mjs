// The music's stop lands in a pause of the voice-over, never on a word (31.5 s inside "Hôm",
// 31.44-32.22 s), and the Review never promises a check that no later step makes.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-qc4b-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const { snapStop } = await import("../packages/sfx/stop-snap.mjs");
// The words around the cut (Whisper's words touch: no gap between them)
const QC4 = [["nâng", 29.16, 29.92], ["bằng", 29.92, 30.68], ["không.", 30.68, 31.44], ["Hôm", 31.44, 32.22], ["nay,", 32.22, 32.52], ["Na", 32.52, 33.14],
  ["quay", 33.14, 33.48], ["lại.", 33.48, 33.8]].map(([text, start, end], i) => ({ id: `w${65 + i}`, text, start, end }));

test("a stop on a spoken word moves into the nearest pause: a gap, else just before the word after a sentence ends", () => {
  assert.deepEqual(snapStop(31.5, QC4), { at: 31.32, moved: true, word: "Hôm", after: "không." });
  // a real gap: the stop goes into it, onto a beat there when one is
  const ws = [{ text: "một", start: 10, end: 10.5 }, { text: "hai", start: 10.9, end: 11.3 }, { text: "ba", start: 11.3, end: 12 }];
  assert.equal(snapStop(11, ws).at, 10.86);
  assert.equal(snapStop(11, ws, [9.2, 10.7, 12]).at, 10.7);
  assert.equal(snapStop(10.7, ws).moved, false, "already in a pause");
  assert.equal(snapStop(45, QC4).moved, false, "after the last word");
  assert.equal(snapStop(31.5, []).moved, false, "no voice-over: as asked");
  // no pause within 2 s: left where it was, with the word it is on
  const long = [{ text: "a", start: 0, end: 10 }, { text: "b", start: 10, end: 20 }];
  assert.deepEqual(snapStop(15, long), { at: 15, moved: false, word: "b", after: null });
});

test("the Motion Plan's stop is applied in the pause, once the music is on the timeline", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { boardRoutes } = await import("../packages/server/boards.mjs");
  const d = join(T, "film"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-fps="30" data-duration="47.5">\n<audio id="el-music" data-timeline-role="music" src="assets/3_audio/music/1-a-happy-child.mp3" data-start="0" data-duration="47.5" data-volume="0.6"></audio>\n</div>\n');
  writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, musicStop: 31.5, musicStopAsked: "nhạc tắt khi Na quay lại", shots: [{ shot: 1, motions: [] }] }));
  writeFileSync(join(d, "transcript.json"), JSON.stringify(QC4));
  const id = projects.openProject(d, T).id;
  projects.updateMeta(id, (m) => { m.music = { file: "assets/3_audio/music/1-a-happy-child.mp3", duration: 47.5 };
    m.voice = { file: "assets/3_audio/voice/v.mp3", source: "elevenlabs", info: { duration: 45.6 }, transcript: { status: "saved" } }; }, T);
  const ctx = { root: T, preview: { base: "http://x" }, jobs: { list: () => [] }, stopping: { signal: null }, agent: { running: new Map(), list: () => [] } };
  boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject: () => projects.getProject(id, T), HttpError: Error });
  assert.equal(await ctx.mix.stopFromPlan(projects.getProject(id, T)), 31.32);
  assert.match(readFileSync(join(d, "index.html"), "utf8"), /data-mw-stop="31.32"/);
  assert.equal(projects.getProject(id, T).meta.music.stopAt, 31.32);
});

test("Claude's tool says where the stop went; the plan asks for a pause; the Review never promises a later check", () => {
  const boards = readFileSync(new URL("../packages/server/boards.mjs", import.meta.url), "utf8");
  assert.match(boards, /const r0 = await musicStop\(project, at, \{ snap: true \}\);/);
  assert.match(boards, /fell on the spoken/);
  assert.match(boards, /musicStop\(now0, at, \{ snap: true \}\)/, "the plan's stop");
  assert.doesNotMatch(boards, /return musicStop\(p, at, \{ snap/, "the owner's own second stays as given");
  const prompt = readFileSync(new URL("../packages/motion-plan/index.mjs", import.meta.url), "utf8");
  assert.match(prompt, /in a pause of the voice-over .* never on a spoken word/);
  const qc = readFileSync(new URL("../config/rules/moworks-qc/SKILL.md", import.meta.url), "utf8").replace(/\s+/g, " ");
  assert.match(qc, /\*\*Never promise a later check\*\*/);
  assert.match(qc, /fix it in this round .* or name it in the review as unchecked, with its seconds, for the owner/);
});

test("the Pipeline's Tech checks row counts the warnings of the last checks (non-blocking findings; checks that could not run are none)", async () => {
  const { qaWarnings } = await import("../packages/pipeline/index.mjs");
  const d = join(T, "qa"); mkdirSync(join(d, ".moworks", "cache", "qa"), { recursive: true });
  writeFileSync(join(d, ".moworks", "cache", "qa", "last.json"), JSON.stringify({ revision: "r1", checks: [
    { id: "G-HF-LINT", blocking: true, pass: false, findings: [{ code: "x" }] },
    { id: "G-HF-LAYOUT", blocking: false, pass: false, findings: [{ code: "a", plain: "Shot 6: …" }, { code: "b", plain: "At 0:12.0: …" }, { code: "c", plain: "At 0:14.0: …" }] },
    { id: "G-STILL", blocking: false, pass: false, findings: [{ shot: 2 }, { shot: 4 }] },
    { id: "G-HF-SCRIPT", blocking: false, pass: false, timedOut: true, findings: [{ code: "check_timed_out" }] },
    { id: "G-HF-MOTION", blocking: false, pass: false, notChecked: true, findings: [{ code: "not_checked" }] } ] }));
  assert.equal(qaWarnings({ revision: "r1" }, d), 5);
  assert.equal(qaWarnings({ revision: "r0" }, d), null, "a report of other checks than the film's last");
  assert.equal(qaWarnings(null, d), null);
  // The same line found at six places is one thing to look at; a check whose warnings list
  // nothing counts for nothing
  writeFileSync(join(d, ".moworks", "cache", "qa", "last.json"), JSON.stringify({ revision: "r2", checks: [
    { id: "G-HF-LINT", blocking: true, pass: true, warnings: 1, findings: [] },
    { id: "G-HF-LAYOUT", blocking: false, pass: true, warnings: 7, findings: [...Array(6)].map((_, i) => ({ code: "frame_out_of_frame", selector: `svg:nth-of-type(${i})`, plain: "At 0:36.4: part of a drawing is outside the frame." }))
      .concat([{ code: "text_occluded", plain: "At 0:55.5: the words \"?\" are covered." }]) } ] }));
  assert.equal(qaWarnings({ revision: "r2" }, d), 2);
  const src = readFileSync(new URL("../packages/server/index.mjs", import.meta.url), "utf8");
  assert.match(src, /warnings: pipe\.qaWarnings\(p\.meta\?\.lastQa, p\.path\)/);
});

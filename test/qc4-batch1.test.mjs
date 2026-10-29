// A voice longer than the film is the user's choice, no
// "any files?" stop when the brief is enough, the Storyboard says its time left, no approval from old pictures.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-qc4-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const { voiceFit, voiceFitText } = await import("../packages/agent/voice-fit.mjs");
const voice = (duration, extra = {}) => ({ title: "x", targetDurationSec: 40, voice: { file: "assets/3_audio/voice/v.mp3", source: "elevenlabs", info: { duration }, transcript: { status: "saved" }, ...extra } });

test("a voice longer than the film's set length is measured, and the choices are the user's", () => {
  assert.deepEqual(voiceFit(voice(45.6)), { voice: 45.6, target: 40, over: 5.6, faster: true });
  const t = voiceFitText(voice(45.6));
  assert.match(t, /45\.6 s, 5\.6 s longer than the film's 40 s set in New project/);
  assert.match(t, /1\. make the film longer.*2\. shorten the script.*3\. make the voice again faster/);
  assert.match(t, /Never lengthen the film, drop the end hold or cut the voice on your own/);
  assert.doesNotMatch(t, /\d+ %/, "the speed's number stays the owner's (#474)");
  assert.equal(voiceFit(voice(40.4)), null, "a breath past the end fits");
  assert.equal(voiceFit(voice(38)), null);
  assert.equal(voiceFit(voice(45.6, { offTimeline: true })), null, "a voice taken off the timeline weighs nothing");
  assert.equal(voiceFit(voice(55, { source: "elevenlabs" })).faster, false, "past ElevenLabs' top speed (1.2) a faster voice is no way on");
  assert.equal(voiceFit(voice(45.6, { source: "upload" })).faster, false, "a recording has no speed");
  assert.doesNotMatch(voiceFitText(voice(45.6, { source: "upload" })), /faster/);
  assert.equal(voiceFitText({ title: "x" }), "");
});

test("every step's instructions carry it, and the rules say a longer voice is a conflict", async () => {
  const A = await import("../packages/agent/index.mjs");
  const sp = (meta) => A.systemPrompt({ meta, rules: [], shots: [], dir: process.cwd(), step: "storyboard" });
  assert.match(sp(voice(45.6)), /45\.6 s, 5\.6 s longer than the film's 40 s/);
  assert.doesNotMatch(sp(voice(39)), /longer than the film's/);
  const rule = readFileSync(new URL("../config/rules/moworks-studio/SKILL.md", import.meta.url), "utf8").replace(/\s+/g, " ");
  assert.match(rule, /a voice-over longer than the film's length set in New project .* never lengthen the film, drop the end hold or cut the voice on your own/);
  const story = readFileSync(new URL("../config/rules/general-style/references/story.md", import.meta.url), "utf8").replace(/\s+/g, " ");
  assert.match(story, /a voice longer than that length is the owner's choice/);
});

test("a voice that lands while the storyboard is drawn: asked when longer, timed within the set length when it fits", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { createAutopilot } = await import("../packages/server/autopilot.mjs");
  const d = join(T, "film"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-duration="40"></div>\n');
  const id = projects.openProject(d, T).id;
  let sent = null;
  const ap = createAutopilot({ root: T, agent: { running: new Map(), start: async (_id, o) => { sent = o; return { id: "t" }; } },
    pipelineOf: async () => ({ state: [{ id: "brief", status: "done" }, { id: "storyboard", status: "needs-you" }] }) });
  projects.updateMeta(id, (m) => { Object.assign(m, voice(45.6)); }, T);
  await ap.transcriptLanded(id);
  assert.equal(sent.step, "storyboard");
  assert.match(sent.text, /5\.6 s longer than the film's 40 s/);
  assert.match(sent.text, /Ask now, in one message, and stop: change no frame time and not the film's length yet/);
  assert.doesNotMatch(sent.text, /the film's length the voice's/, "never told to stretch the film to the voice");
  projects.updateMeta(id, (m) => { m.voice.info.duration = 37.2; }, T);
  await ap.transcriptLanded(id);
  assert.match(sent.text, /the film's length staying 44\.8 s \(40 s of content, the ending's 4\.8 s fade after it\)/);
  assert.doesNotMatch(sent.text, /longer than the film's/);
});

test("Prepare goes on when no files were given and the brief is enough; it asks only for material the brief names", () => {
  const cat = JSON.parse(readFileSync(new URL("../config/styles.json", import.meta.url), "utf8"));
  const explainer = cat.styles.find((s) => /explainer/i.test(s.id));
  assert.ok(explainer, "HyperFrames' Explainer is in the catalog");
  for (const s of cat.styles) {
    // its own steps, or its shared file's (config/hf-pipeline.json: the style's own steps, else the shared ones)
    const shared = s.pipeline ? null : JSON.parse(readFileSync(new URL(`../config/${s.rules.pipeline}`, import.meta.url), "utf8"));
    const pr = (s.pipeline ?? shared.styles?.[s.id] ?? shared.pipeline)[0].action.prompt;
    assert.match(pr, /When I gave no files at all and the brief is enough, go on without asking/, s.id);
    assert.doesNotMatch(pr, /ask me once, in one short line, whether I have files/, s.id);
  }
  const src = readFileSync(new URL("../packages/agent/index.mjs", import.meta.url), "utf8");
  assert.match(src, /When the brief already says which way \(e\.g\. the voice made in the app\), take it without asking/);
});

test("the running Storyboard and Motion Plan say their time left, as the Build does", async () => {
  const { runningEstimate, etaWords, boardEstimates } = await import("../packages/server/boards.mjs");
  const at = "2026-10-27T02:00:00.000Z", t0 = Date.parse(at);
  const draw = { id: "a", step: "storyboard", status: "running", text: "Make the storyboard", createdAt: at };
  const e = runningEstimate(draw, [draw]);
  assert.deepEqual(e, { stage: "storyboard", minutes: 10, high: 15, startedAt: at }, "a first option: the usual 10 min");
  assert.equal(etaWords(e, t0 + 3 * 60000), "about 7 min left");
  assert.equal(etaWords(e, t0 + 12 * 60000), "about 3 min left", "past the middle: to the slowest");
  assert.equal(etaWords(e, t0 + 16 * 60000), "taking longer than usual");
  // the turn that times the storyboard to a voice that came meanwhile is a revision's time, and never counted as an option
  const fit = { id: "b", step: "storyboard", status: "running", text: "The voice-over came while you drew the storyboard: it is 45.6 s", createdAt: at };
  assert.equal(runningEstimate(fit, [fit]).minutes, 5);
  const est = boardEstimates([{ ...fit, status: "done", durationMs: 4 * 60000 }]);
  assert.equal(est.option.basis, "usual"); assert.equal(est.feedback.basis, "this film");
  assert.equal(runningEstimate({ id: "c", step: "motionSpec", status: "running", text: "x", createdAt: at }, []).stage, "motion");
  assert.equal(runningEstimate({ id: "d", step: "build", status: "running", text: "x", createdAt: at }, []), null, "the Build has its own");
  assert.equal(runningEstimate(null, []), null);
  const src = readFileSync(new URL("../packages/server/index.mjs", import.meta.url), "utf8");
  assert.match(src, /etaStage\.line = `\$\{etaStage\.line\} · \$\{etaWords\(stepEta\)\}`/);
});

test("an option is approved only from pictures of it as it is now; the app takes them again first", async () => {
  const { stillsBehind } = await import("../packages/server/boards.mjs");
  const { currentOptions } = await import("../packages/hf-edit/boards.mjs");
  const { boardsChanged } = await import("../packages/server/autopilot.mjs");
  const d = join(T, "boards-film"), p = { id: "p1", path: d };
  mkdirSync(join(d, "boards", "B"), { recursive: true });
  const md = "# Storyboard\n\n## Frame 1\n\nA kite.\n";
  writeFileSync(join(d, "boards", "B", "STORYBOARD.md"), md);
  writeFileSync(join(d, "boards", "B", "index.html"), "<div>wind arrow</div>");
  const round = (hash) => {
    mkdirSync(join(d, "boards", "rounds", "R1", "B", "stills"), { recursive: true });
    writeFileSync(join(d, "boards", "rounds", "R1", "B", "STORYBOARD.md"), md);
    writeFileSync(join(d, "boards", "rounds", "R1", "B", "stills", "frame-01.png"), "x");
    writeFileSync(join(d, "boards", "rounds", "R1", "round.json"), JSON.stringify({ at: new Date().toISOString(), hashes: { B: hash } }));
  };
  let taken = 0, jobs = [];
  const ctx = { jobs: { list: () => jobs }, boardStills: () => { taken++; } };
  round(currentOptions(d).find((x) => x.option === "B").hash);
  assert.equal(stillsBehind(ctx, p, "B"), null, "pictures of B as it is");
  // Claude changed the arrow's head after its pictures: the old pictures are no approval, and the app takes new ones
  writeFileSync(join(d, "boards", "B", "index.html"), "<div>wind arrow, new head</div>");
  const old = stillsBehind(ctx, p, "B");
  assert.equal(old.code, "STILLS_OLD"); assert.match(old.message, /Option B changed after its pictures were taken/);
  assert.equal(taken, 1);
  jobs = [{ kind: "board-stills", projectId: "p1", status: "running" }];
  assert.equal(stillsBehind(ctx, p, "B").code, "STILLS_TAKING");
  jobs = [];
  round(currentOptions(d).find((x) => x.option === "B").hash);
  assert.equal(stillsBehind(ctx, p, "B"), null, "the new pictures are in");
  assert.equal(stillsBehind(ctx, p, "C"), null, "an option with no board is the route's own 404");
  // a chat turn that changed a board takes its pictures again too
  assert.equal(boardsChanged([{ path: "boards/B/index.html" }]), true);
  assert.equal(boardsChanged([{ path: "boards/rounds/R1/B/index.html" }, { path: "index.html" }]), false);
  const src = readFileSync(new URL("../packages/server/index.mjs", import.meta.url), "utf8");
  assert.match(src, /const behind = b\?\.anyway === true \? null : stillsBehind\(ctx, p, picked\)/);
});

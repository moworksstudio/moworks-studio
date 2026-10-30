// Tests 20 and 21: the style's contributor credited in the gallery's list (T20-5), a cast Prepare wrote as a bare list still gets its
// Character step (T21-2), and a voice-over well short of the film's length is asked about before the Storyboard draws (T21-3).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t21-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

test("T20-5: the gallery's credit keeps the person a source credits for a style, and a project records them for its \"by\" line", async () => {
  const { listCredit, selection } = await import("../packages/style-catalog/index.mjs");
  const credit = { author: "EianLu, in Lemo-Opuscar by Lemomo (LemoLab)", contributor: { name: "EianLu", url: "https://x.com/EianLu" }, link: "https://github.com/x/y/blob/c/STYLE.md",
    commit: "c", licence: "MIT", made: "as shipped", notes: "long notes stay on the style's own read" };
  const c = listCredit(credit);
  assert.deepEqual(c.contributor, { name: "EianLu", url: "https://x.com/EianLu" });
  assert.deepEqual([c.author, c.link, c.url, c.commit, c.made], [credit.author, credit.link, credit.link, "c", "as shipped"]);
  assert.equal("notes" in c, false, "the list stays short");
  assert.equal("contributor" in listCredit({ author: "Lemomo (LemoLab)", link: "l" }), false, "no contributor: none added");
  assert.equal(listCredit(null), null);
  const sel = selection({ id: "lemo-memphis-diorama", title: "Memphis Diorama", ruleSource: "lemo", author: "lemomo", credit, rules: [] });
  assert.equal(sel.contributor, "EianLu");
  assert.equal("contributor" in selection({ id: "x", title: "X", ruleSource: "x", author: "lemomo", credit: { author: "Lemomo (LemoLab)" }, rules: [] }), false);
});

// ---- T21-2: the owner chose "make them with the Character creator"; Prepare wrote CHARACTERS.json as a bare list, the Character
// step never showed, and the Storyboard drew three people from words alone (a grandmother read as an old man)
const CAST = [{ id: "lua", name: "Lụa", about: "Cô bé tám tuổi", kind: "human" }, { id: "ba", name: "Bà", about: "Bà cụ nhỏ người", kind: "human" },
  { id: "ongbay", name: "Ông Bảy", about: "Người thợ xay già", kind: "human" }];

test("T21-2: a cast Prepare wrote as a bare list is the film's cast: the Character step shows and runs before the Storyboard", async () => {
  const pipe = await import("../packages/pipeline/index.mjs");
  const d = mkdtempSync(join(T, "cast-"));
  writeFileSync(join(d, "index.html"), '<div data-composition-id="main"></div>');
  assert.equal(pipe.castList(d), null, "no file: no cast");
  writeFileSync(join(d, "CHARACTERS.json"), JSON.stringify(CAST, null, 2));
  assert.equal(pipe.castList(d).length, 3);
  const meta = { style: { id: "anidoodle-midCentury" }, pipeline: { marks: { brief: { at: new Date().toISOString(), by: "owner" } }, ran: { brief: { at: new Date().toISOString() } }, skips: {} } };
  const f = pipe.gatherFacts({ path: d, meta });
  assert.equal(f.flags.cast, true); assert.equal(f.castEmpty, false);
  // the step as the anidoodle pipeline has it (when: cast, before the Storyboard)
  const steps = [{ id: "brief", stage: 1, title: "Prepare", done: { kind: "mark", auto: true, file: "BRIEF.md", ask: true }, action: { kind: "claude" } },
    { id: "character", stage: 1, title: "Character", when: "cast", needs: ["brief"], gate: true, done: { kind: "approval", name: "characters", file: "CHARACTERS.json" }, action: { kind: "claude" } },
    { id: "storyboard", stage: 2, title: "Storyboard", needs: ["character"], gate: true, done: { kind: "approval", name: "storyboard" }, action: { kind: "claude" } }];
  writeFileSync(join(d, "BRIEF.md"), "# Brief\n");
  const st = pipe.computePipeline(steps, pipe.gatherFacts({ path: d, meta }));
  const of = (id) => st.find((x) => x.id === id);
  assert.deepEqual([of("character").hidden, of("character").status, of("storyboard").status], [undefined, "ready", "blocked"]);
  assert.equal(pipe.nextAuto(st)?.id, "character", "the app runs the Character creator next");
  // an empty bare list is a film with no characters, as {"characters": []} is
  writeFileSync(join(d, "CHARACTERS.json"), "[]");
  assert.equal(pipe.gatherFacts({ path: d, meta }).castEmpty, true);
  // the character gate and the anidoodle cast read the bare list too
  writeFileSync(join(d, "CHARACTERS.json"), JSON.stringify(CAST));
  const { readHumans } = await import("../packages/character-kit/humans.mjs");
  assert.deepEqual(readHumans(d).map((c) => c.id), ["lua", "ba", "ongbay"]);
});

test("T21-2: Prepare is told the cast's exact shape, and never promised a Character step a style does not have", async () => {
  const A = await import("../packages/agent/index.mjs");
  const { getStyle, stylePipeline } = await import("../packages/style-catalog/index.mjs");
  if (stylePipeline("anidoodle-midCentury").some((x) => x.id === "character")) {
    const line = A.actorsLine({ style: { id: "anidoodle-midCentury" } });
    assert.match(line, /end Prepare by writing docs\/CHARACTERS\.json as \{"characters": \[ … \]\} \(that object, never a bare list/);
    assert.match(line, /the app's Character step then makes them and the owner approves them once, before the Storyboard/);
  }
  // What If draws its cast on its own rig and has no Character step: no promise of one
  if (getStyle("what-if") && !stylePipeline("what-if").some((x) => x.id === "character")) {
    const line = A.actorsLine({ style: { id: "what-if" } });
    assert.doesNotMatch(line, /Character step then makes them|Character creator/);
    assert.match(line, /has no Character step[^]*never promise a Character step or a separate approval/);
  }
});

// ---- T21-3: an 80 s voice on a 100 s film got a 24 s wordless shot the Storyboard planned by itself, said only after it was drawn
const film = (duration, target = 100, extra = {}) => ({ title: "x", targetDurationSec: target,
  voice: { file: "assets/3_audio/voice/v.mp3", source: "elevenlabs", info: { duration }, transcript: { status: "saved" }, ...extra } });

test("T21-3: a voice well short of the film's set length is measured, and the choices are the owner's", async () => {
  const { voiceFit, voiceFitText, shortSlack } = await import("../packages/agent/voice-fit.mjs");
  assert.deepEqual(voiceFit(film(80)), { voice: 80, target: 100, short: 20 });
  const t = voiceFitText(film(80));
  assert.match(t, /80 s, 20 s shorter than the film's 100 s set in New project/);
  assert.match(t, /1\. make the film shorter.*2\. write a longer script.*3\. keep the 100 s with wordless stretches planned now/);
  assert.match(t, /Never fill the gap with a wordless shot, a longer shot or a longer end hold on your own/);
  assert.match(t, /Write the answer in docs\/NOTES\.md/);
  // a small margin is the film's opening and end hold (5 s) and its breaths (a tenth of the film)
  assert.equal(shortSlack(30), 8); assert.equal(shortSlack(100), 15);
  assert.equal(voiceFit(film(86)), null, "14 s short of 100 s: inside the margin");
  assert.equal(voiceFit(film(38, 40)), null, "a voice a breath short of a short film fits");
  assert.equal(voiceFit(film(40.3, 50)), null, "40.3 s on 50 s is timed as it is (test15-fixes)");
  assert.equal(voiceFit(film(20, 30)).short, 10);
  assert.equal(voiceFit(film(80, 100, { offTimeline: true })), null, "a voice taken off the timeline weighs nothing");
  // the longer case is as before
  assert.deepEqual(voiceFit(film(45.6, 40)), { voice: 45.6, target: 40, over: 5.6, faster: true });
});

test("T21-3: every step's instructions carry it, and the house rules name a voice well short of the length as a conflict", async () => {
  const A = await import("../packages/agent/index.mjs");
  const d = mkdtempSync(join(T, "sp-"));
  const sp = A.systemPrompt({ meta: film(80), rules: [], shots: [], dir: d, step: "storyboard" });
  assert.match(sp, /The voice-over is 80 s, 20 s shorter than the film's 100 s/);
  const rules = readFileSync(join(import.meta.dirname, "..", "config", "rules", "moworks-studio", "SKILL.md"), "utf8");
  assert.match(rules, /a voice-over well short of that length[^]*wordless stretches planned with the owner[^]*never fill the gap/);
  assert.match(rules, /^version: \d+\.\d+\.\d+$/m);
});

test("T21-3: the Storyboard asks the voice's shortness before it draws, marked as the app's question", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
  const d = mkdtempSync(join(T, "film-"));
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-duration="100"></div>\n');
  const id = projects.openProject(d, T).id;
  projects.updateMeta(id, (m) => { m.title = "demo-t21"; m.targetDurationSec = 100;
    m.voice = { file: "assets/3_audio/voice/v.mp3", source: "elevenlabs", info: { duration: 80 }, transcript: { status: "saved" } }; }, T);
  const tasks = [], started = [];
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => tasks, start: async (_id, o) => { started.push(o); return { id: `t${started.length}` }; } },
    pipelineOf: async (pid) => ({ p: projects.getProject(pid, T), facts: {}, state: [] }) };
  const ap = createAutopilot(ctx);
  await ap.startStep(id, { id: "storyboard", action: { kind: "claude", prompt: "Make the storyboard." } }, { fromAuto: true });
  assert.equal(started[0].asks, "voiceFit:80/100");
  assert.match(started[0].text, /^Before you draw anything: The voice-over is 80 s, 20 s shorter/);
  assert.match(started[0].text, /stop without drawing a frame/);
});

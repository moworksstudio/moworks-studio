// What If animation as a Film Style: the catalog entry (hidden, "Coming soon"
// until step 4 is wired), its five-row pipeline with no Character step, the author's skill and references staged as the style's rule
// beside the app's pack, the reads of each step, and the narration facts the Prepare prompt decides with. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-whatif-style-"));
after(() => rmSync(T, { recursive: true, force: true }));
const cat = await import("../packages/style-catalog/index.mjs");
const A = await import("../packages/agent/index.mjs");
const { requiredReads } = await import("../packages/agent/reads.mjs");

test("the What If style: FreshStack's, open in New project, 16:9 at 30 fps, its own five-row pipeline", (t) => {
  const s = cat.styleList().styles.find((x) => x.id === "what-if");
  if (!s) return t.skip("What If is not pinned here");
  assert.deepEqual([s.author, s.hidden, s.comingSoon, s.characters], ["freshstack", false, undefined, true]);
  assert.equal(cat.styleList().authors.find((a) => a.id === "freshstack").comingSoon, false, "the gallery's author line drops Coming soon");
  assert.deepEqual(cat.styleList().comingSoon, []);
  assert.deepEqual([s.format.fps.default, s.format.sizes.custom, s.format.sizes.presets.map((p) => [p.w, p.h])], [30, false, [[1920, 1080]]]);
  assert.match(s.credit.url, /kelano86\/what-if-animation\/tree\/3725a22d/);
  assert.deepEqual(cat.styleList().authors.find((a) => a.id === "freshstack").tag, "FS");
  const p = cat.stylePipeline("what-if");
  assert.deepEqual(p.map((x) => [x.id, x.stage]), [["brief", 1], ["storyboard", 2], ["motionSpec", 3], ["build", 4], ["qcReview", 4], ["sound", 4], ["checks", 4], ["finalMix", 5]]);
  assert.equal(p.find((x) => x.id === "motionSpec").effort, "medium");
  const brief = p.find((x) => x.id === "brief").action.prompt;
  assert.match(brief, /whatif\/episode\.json/); assert.match(brief, /a voice-over I upload or a film with no narration/); assert.match(brief, /moworks-studio §2b/);
  assert.doesNotMatch(p.map((x) => x.action?.prompt ?? "").join(" "), /ElevenLabs|python|plan\.py <slug>/);
});

test("the author's skill and references are staged as the style's rule, under a header; each step reads what it needs", (t) => {
  if (!cat.getStyle("what-if")) return t.skip("What If is not pinned here");
  const dir = join(T, "film");
  mkdirSync(dir, { recursive: true });
  const r = A.prepareRules(dir, "what-if");
  assert.ok(r.files.includes(".moworks/rules/what-if-animation/SKILL.md") && r.files.includes(".moworks/rules/what-if-style/SKILL.md"));
  const skill = readFileSync(join(dir, ".moworks", "rules", "what-if-animation", "SKILL.md"), "utf8");
  assert.match(skill, /^<!-- What If animation by FreshStack \(kelano86\), MIT, https:\/\/github\.com\/kelano86\/what-if-animation\/tree\/3725a22d/);
  assert.match(skill, /no Remotion, no Python scripts, no ElevenLabs/); assert.match(skill, /# What If animation/);
  for (const ref of ["formula.md", "look.md", "kit.md", "traps.md", "sound.md"]) assert.ok(existsSync(join(dir, ".moworks", "rules", "what-if-animation", "references", ref)), ref);
  assert.ok(!existsSync(join(dir, ".moworks", "rules", "what-if-animation", "scripts")), "never the author's scripts");
  assert.ok(requiredReads(dir, { styleId: "what-if", step: "brief" }).includes(".moworks/rules/what-if-animation/references/formula.md"));
  assert.ok(requiredReads(dir, { styleId: "what-if", step: "build" }).includes(".moworks/rules/what-if-animation/references/traps.md"));
  mkdirSync(join(dir, "whatif"), { recursive: true }); writeFileSync(join(dir, "whatif", "episode.json"), "{}");
  assert.ok(requiredReads(dir, { styleId: "what-if", step: "storyboard" }).includes("whatif/episode.json"));
});

test("the Prepare step of a What If film is told whether it has a voice-over and a voice service key", () => {
  const root = join(T, "root");
  mkdirSync(join(root, "runtime", "state"), { recursive: true });
  const line = A.narrationLine({ voice: {} }, root);
  assert.match(line, /no voice-over in the project yet; no voice service key is set/);
  assert.match(A.narrationLine({ voice: { file: "assets/3_audio/voiceover/v.wav" } }, root), /a voice-over is in the project/);
  const sp = A.systemPrompt({ meta: { title: "x", style: { id: "what-if", title: "What If", source: "x" } }, rules: [], shots: [], dir: process.cwd(), step: "brief" });
  assert.match(sp, /Narration \(the app says\)/);
  assert.doesNotMatch(A.systemPrompt({ meta: { title: "x", style: { id: "general", title: "General", source: "x" } }, rules: [], shots: [], dir: process.cwd(), step: "brief" }), /Narration \(the app says\)/);
});

test("the author's plan.py in the app gives the same timeline as the author's own for both worked episodes; words from the transcript; a film with no narration", async (t) => {
  const { planEpisode, planText, wordsFromTranscript, pyRound } = await import("../packages/what-if-plan/index.mjs");
  const { cpSync } = await import("node:fs");
  const EP = join(import.meta.dirname, "..", "bundle", "styles", "what-if-animation", "studio", "src", "episodes");
  if (!existsSync(EP)) return t.skip("What If is not pinned here");
  assert.deepEqual([pyRound(2.5), pyRound(3.5), pyRound(2.6)], [2, 4, 3], "Python's rounding");
  for (const slug of ["rewind", "copy-paste"]) {
    const d = join(T, `plan-${slug}`); mkdirSync(join(d, "whatif"), { recursive: true });
    for (const f of ["episode.json", "words.json"]) cpSync(join(EP, slug, f), join(d, "whatif", f));
    const want = JSON.parse(readFileSync(join(EP, slug, "timeline.json"), "utf8"));
    const r = planEpisode(d);
    for (const k of ["fps", "total", "segments", "shots", "fx"]) assert.deepEqual(r.timeline[k], want[k], `${slug}: ${k}`);
    assert.ok(existsSync(join(d, "whatif", "timeline.json")) && existsSync(join(d, "whatif", "shotlist.md")));
    assert.match(planText(r), /cuts\/min overall/);
  }
  // the app's voice-over: HyperFrames' word timings become the engine's words
  const v = join(T, "plan-voice"); mkdirSync(join(v, "whatif"), { recursive: true });
  writeFileSync(join(v, "transcript.json"), JSON.stringify([{ id: "w0", text: "Rewind", start: 0.2, end: 0.6 }, { id: "w1", text: "now.", start: 0.7, end: 1.1 }]));
  assert.deepEqual(wordsFromTranscript(v), [{ w: "Rewind", s: 0.2, e: 0.6 }, { w: "now.", s: 0.7, e: 1.1 }]);
  // no narration: seconds and frames only, the end from "end" or the New project length; a word cue is refused in plain words
  const n = join(T, "plan-none"); mkdirSync(join(n, "whatif"), { recursive: true });
  const ep = { slug: "x", title: ["WHAT IF", "X?"], narration: "none", shots: [{ id: "S1" }, { id: "S2" }], edit: [{ shot: "S1", at: "s:0" }, { shot: "S2", at: "s:2" }] };
  writeFileSync(join(n, "whatif", "episode.json"), JSON.stringify(ep));
  assert.equal(planEpisode(n, { lengthSec: 5 }).timeline.total, 150);
  writeFileSync(join(n, "whatif", "episode.json"), JSON.stringify({ ...ep, edit: [{ shot: "S1", at: "s:0" }, { shot: "S2", at: "rewind" }] }));
  assert.throws(() => planEpisode(n, { lengthSec: 5 }), /no narration: cue every cut with s:, f: or \+N/);
});

test("What If is a code film: its Build counts as built once the step ran (demo-what-if-khong-loi: Build ran twice, never built)", async () => {
  const pipe = await import("../packages/pipeline/index.mjs");
  assert.equal(pipe.isCodeFilm("what-if"), true);
  const { mkdtempSync, writeFileSync: wf, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const d = mkdtempSync(join(tmpdir(), "mw-wi-built-"));
  wf(join(d, "index.html"), '<div id="main" data-composition-id="main"></div><script src="compositions/whatif/film.js"></script>');
  const f = pipe.gatherFacts({ path: d, meta: { style: { id: "what-if" }, pipeline: { ran: { build: { at: new Date().toISOString() } } } } });
  assert.equal(f.built.ok, true);
  rmSync(d, { recursive: true, force: true });
});

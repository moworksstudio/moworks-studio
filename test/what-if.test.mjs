// The What If film kind and the knowledge taken from What If animation (FreshStack, MIT):
// the kind's rule staged with every style and read only when the kind is chosen, its line for Claude, the answer kept for any style,
// the two samples, the pin, and the every-style checks and voice-over sound rules in the house rules.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareRules } from "../packages/agent/index.mjs";
import { filmKind, requiredReads } from "../packages/agent/reads.mjs";
import { cleanAnswers } from "../packages/project-service/index.mjs";
import { getStyle } from "../packages/style-catalog/index.mjs";
import { APP_ROOT, loadPins } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-whatif-"));
after(() => rmSync(T, { recursive: true, force: true }));
const RULE = ".moworks/rules/what-if/SKILL.md";
const project = (name, styleId, kind) => {
  const d = join(T, name);
  mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, ".moworks", "project.json"), JSON.stringify({ style: { id: styleId }, brief: { answers: kind ? { filmKind: kind } : {} } }));
  return { d, r: prepareRules(d, styleId) };
};

test("the What If rule rides with every style, outside its rule list, and is read in every step only when the kind is chosen", () => {
  for (const id of ["general", "anidoodle-sumiE", "brush-cartoon"]) assert.ok(getStyle(id).rules.some((r) => r.role === "kind" && r.name === "what-if"), id);
  const plain = project("plain", "general", null);
  assert.ok(existsSync(join(plain.d, ...RULE.split("/"))) && existsSync(join(plain.d, ".moworks", "rules", "what-if", "references", "look.md")), "staged");
  assert.ok(!plain.r.files.includes(RULE), "not one of the style's own rules");
  assert.equal(filmKind(plain.d), null);
  assert.ok(!requiredReads(plain.d, { styleId: "general", first: plain.r.first, step: "build" }).includes(RULE));
  for (const [name, id] of [["wi-general", "general"], ["wi-sumi", "anidoodle-sumiE"]]) {
    const p = project(name, id, "whatIf");
    assert.equal(filmKind(p.d).scope, "all");
    for (const step of ["brief", "storyboard", "build", "qcReview", "sound"]) assert.ok(requiredReads(p.d, { styleId: id, first: p.r.first, step }).includes(RULE), `${id} ${step}`);
  }
  assert.deepEqual(cleanAnswers({ filmKind: "whatIf" }, "general"), { filmKind: "whatIf" }, "any style keeps the answer");
  assert.deepEqual(cleanAnswers({ filmKind: "whatIf", junk: "x" }, "hf-explainer"), { filmKind: "whatIf" }, "only the film's kind is kept");
});

test("the rule: the seven beats, the script, a twist only on a sourced fact, the style's own pace; credited at the pinned commit; no code taken", () => {
  const md = readFileSync(join(APP_ROOT, "config", "rules", "what-if", "SKILL.md"), "utf8");
  for (const s of ["Cold open", "The premise", "Cliffhanger", "3 to 8 words", "Never invent a number", "The film style's own pace wins", "music_stop"]) assert.ok(md.includes(s), s);
  const pin = loadPins().whatIf;
  assert.equal(pin.commit, "3725a22d2d101320cae5b7d761af8d75120c4987");
  assert.ok(md.includes(`kelano86/what-if-animation/tree/${pin.commit}`));
  assert.doesNotMatch(md, /Ifverse|FunNotSoFun|IFinity|Could've Been Tales/i, "no channel names");
  const look = readFileSync(join(APP_ROOT, "config", "rules", "what-if", "references", "look.md"), "utf8");
  assert.match(look, /Never apply it to motion graphics, line art, ink, Sumi-e/);
  const studio = readFileSync(join(APP_ROOT, "config", "rules", "moworks-studio", "SKILL.md"), "utf8");
  assert.match(studio, /## 6\. The storyboard and the cut, checked in every style/);
  assert.match(studio, /## 7\. Sound under a voice-over/);
  assert.match(studio, /-16 LUFS/);
  assert.doesNotMatch(studio, /-14 LUFS/);
});

test("the two samples: one for a style that draws characters, one for the others; each in both languages, 20 s, credited", async () => {
  const { sampleOf, briefSampleFor, sampleFieldsFor, ALL_SAMPLES } = await import("../ui/src/workflow/briefSample.js");
  assert.notEqual(sampleOf("anidoodle-sumiE", "whatIf"), sampleOf("general", "whatIf"));
  assert.equal(sampleOf("brush-cartoon", "whatIf"), sampleOf("anidoodle-woodcut", "whatIf"));
  for (const id of ["general", "anidoodle-sumiE"]) {
    assert.match(briefSampleFor(id, "en", "whatIf"), /^Topic: What if /);
    assert.match(briefSampleFor(id, "vi", "whatIf"), /^Chủ đề: Nếu /);
    assert.equal(sampleFieldsFor(id, "whatIf").length, "0:20");
    assert.match(sampleOf(id, "whatIf").credit.link, /3725a22d2d101320cae5b7d761af8d75120c4987/);
  }
  assert.equal(briefSampleFor("general", "en"), sampleOf("general").en, "no kind: the style's own sample");
  assert.ok(ALL_SAMPLES.includes(sampleOf("general", "whatIf")));
});

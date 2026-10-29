// Review 49687a43 (HF 0.8.214): a style id the catalog does not have is a film with no style (no rules copied or read, no style
// line); the open-design set (General + HyperFrames' seven film types) and the house rule that names it agree; a Motion Plan row that
// cites HyperFrames' motion reference is HF's, never a Library item to look up.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-style-gone-"));
after(() => rmSync(T, { recursive: true, force: true }));
const A = await import("../packages/agent/index.mjs");
const { DESIGN_OPEN, styleDesign, listStyles } = await import("../packages/style-catalog/index.mjs");
const { HF_TYPES } = await import("../packages/agent/reads.mjs");
const plan = await import("../packages/motion-plan/index.mjs");
const { HF_SKILL } = await import("../packages/hf-edit/hf-scripts.mjs");

test("a style id not in the catalog: the copied rules are removed, nothing is named to read, the prompt prints no style", () => {
  const dir = join(T, "demo-old-style");
  const rules = join(dir, ".moworks", "rules");
  mkdirSync(join(rules, HF_SKILL), { recursive: true });
  writeFileSync(join(rules, HF_SKILL, "SKILL.md"), "---\ndescription: an older copy\n---\n");
  writeFileSync(join(rules, "index.json"), JSON.stringify({ styleId: "demo-style-not-in-catalog", rules: [{ name: HF_SKILL, hash: "x" }] }));
  const r = A.prepareRules(dir, "demo-style-not-in-catalog");
  assert.deepEqual(r, { style: null, files: [], first: [], qc: [] });
  assert.equal(existsSync(rules), false, "no stale rule copies are left to be required or read");
  assert.deepEqual(A.prepareRules(dir, null), { style: null, files: [], first: [], qc: [] }, "no style at all: the same");
  const meta = { title: "x", style: { id: "demo-style-not-in-catalog", title: "Demo gone style", source: "HyperFrames skill" }, designLocked: true };
  for (const sp of [A.systemPrompt({ meta, rules: [], shots: [], dir: null }), A.systemPrompt({ meta, style: null, rules: [], shots: [], dir: null })]) {
    assert.match(sp, /No style chosen\./);
    assert.doesNotMatch(sp, /Demo gone style/);
    assert.doesNotMatch(sp, /the style's author's own/, "no author's design for a style that is not there");
  }
  const known = A.systemPrompt({ meta: { title: "x", style: { id: "general", title: "General Style", source: "Moworks Motion rules" } }, rules: [], shots: [], dir: null });
  assert.match(known, /Style: General Style \(Moworks Motion rules\)\./);
});

test("the open-design set is General and HyperFrames' seven film types, each in the catalog; the house rule names exactly those", () => {
  assert.deepEqual([...DESIGN_OPEN].sort(), ["general", ...HF_TYPES.map((t) => `hf-${t}`)].sort());
  const styles = listStyles().styles;
  for (const id of DESIGN_OPEN) assert.ok(styles.some((s) => s.id === id), `${id} is in the catalog`);
  for (const s of styles) assert.equal(styleDesign(s), DESIGN_OPEN.includes(s.id) ? "open" : "author", s.id);
  // config/rules/moworks-studio/SKILL.md: "(every style but General Style and HyperFrames' seven film types, whose design the owner
  // picks in New project: <title>; <title>; …): the author's design …"
  const house = readFileSync(new URL("../config/rules/moworks-studio/SKILL.md", import.meta.url), "utf8").replace(/\s+/g, " ");
  const open = /\*\*A film style with its author's design\*\* \(([^]*?)\): the author's design/.exec(house)?.[1];
  assert.ok(open, "the house rule's open-design sentence");
  const [head, list = ""] = open.split(/ picks in New project: /);
  const title = (id) => styles.find((s) => s.id === id).title;
  assert.match(head, new RegExp(`^every style but ${title("general")} and HyperFrames' seven film types, whose design the owner$`));
  assert.deepEqual(list.split("; ").map((x) => x.trim()), HF_TYPES.map((t) => title(`hf-${t}`)), "the seven types by their catalog titles, and nothing else");
});

test("a Motion Plan row that cites HyperFrames' motion reference is HF's, whatever kind it was given", () => {
  const row = (source) => plan.cleanMotion({ target: ".title", type: "entrance", start: 0, duration: 1, source }).source;
  assert.deepEqual(row({ kind: "library", id: "motion.md#easing" }), { kind: "hf", id: "motion.md#easing" }, "never looked up in the Library (\"not found\")");
  assert.deepEqual(row({ kind: "claude", id: "references/motion.md#stagger" }), { kind: "hf", id: "references/motion.md#stagger" });
  assert.deepEqual(row({ kind: "hf", id: "motion.md#camera" }), { kind: "hf", id: "motion.md#camera" });
  assert.deepEqual(row({ kind: "library", id: "vocab/003" }), { kind: "library", id: "vocab/003" }, "a Library item stays one");
  assert.deepEqual(row({ kind: "vocab", id: "003" }), { kind: "library", id: "vocab/003" });
});

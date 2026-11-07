// What Claude reads for a film style, in one place (audit/112 2.3): the style's rules linked into .moworks/rules/ (prepareRules), the
// style's own sources staged into .moworks/library/ for the step (stageFor: the owner's styles' source skills, the anidoodle and What If
// engines, the Map Explainer's engine, the Brush layer's guide, a Lemo-Opuscar or mg-styles-15 demo from the build on), and the files each
// step must read (reads.mjs). A film's task, the Writers' Room's labs and the Thumbnails' lab all stage through here, so a lab reads what
// the film's own step would (a Writers' Room lab once missed anidoodle's seven laws: it staged the owner's styles and What If only).
import { writeJson } from "../util/json.mjs";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { getStyle } from "../style-catalog/index.mjs";
import { lemoSlug, ruleText as lemoRuleText, stageDemo as stageLemoDemo } from "../lemo-styles/index.mjs";
import { mgSlug, ruleText as mgRuleText, stageDemo as stageMgDemo } from "../mg-styles/index.mjs";
import { anidoodleId, ruleText as anidoodleRuleText, stageEngine as stageAnidoodle } from "../anidoodle-styles/index.mjs";
import { ruleText as brushRuleText, stageGuide as stageBrushGuide } from "../character-kit/index.mjs";
import { stageEngine as stageWhatIf, whatIfSource } from "../what-if-styles/index.mjs";
import { MAP_STYLE_ID, stageGuide as stageMapGuide } from "../map-explainer/index.mjs";
import { isMoworksStyle, stageGuide as stageStyleGuide } from "../moworks-styles/index.mjs";
import { ensureShared, linkOrCopy, sharedDir } from "../project-service/shared-stage.mjs";


/** The style's rules and its own sources, staged for one step: { style, files, first, qc, staged } (staged: what was put in .moworks/library/
 *  this time, in words for the task's status line). A Lemo-Opuscar or mg-styles-15 style's demo comes from the build on (its own rule: the
 *  treatment first); before that a Lemo style cut from real material has its demo's material tools. Each source that cannot be staged is
 *  skipped: the rules are enough, and missingReads names what a step then lacks. */
export function stageFor(dir, styleId, { step = null, root = APP_ROOT } = {}) {
  const rules = prepareRules(dir, styleId, root), staged = [];
  const tried = (what, fn) => { try { const r = fn(); if (r?.files?.length) staged.push(typeof what === "function" ? what(r) : what); } catch { /* the rules are enough */ } };
  const lemo = lemoSlug(styleId), mg = mgSlug(styleId), late = ["build", "qcReview"].includes(step);
  if (lemo && late && !existsSync(join(dir, ".moworks", "library", "lemo", lemo, "DEMO.md"))) tried((r) => `Lemo-Opuscar demo: ${r.item.en}`, () => stageLemoDemo(dir, lemo, root));
  else if (lemo && !existsSync(join(dir, ".moworks", "library", "lemo", lemo))) tried((r) => `Lemo-Opuscar material tools: ${r.item.en}`, () => stageLemoDemo(dir, lemo, root, { toolsOnly: true }));
  if (mg && late && !existsSync(join(dir, ".moworks", "library", "mg", mg, "CREDIT.md"))) tried((r) => `mg-styles-15 demo: ${r.item.en}`, () => stageMgDemo(dir, mg, root));
  if (anidoodleId(styleId)) tried("anidoodle engine staged", () => stageAnidoodle(dir, root));
  if (styleId === "what-if") tried("What If engine staged", () => stageWhatIf(dir, root));
  if (styleId === MAP_STYLE_ID) tried("map engine staged", () => stageMapGuide(dir));
  if (isMoworksStyle(styleId)) tried("the film style's source skill staged", () => stageStyleGuide(dir, styleId, root));
  if (styleId === "brush-cartoon") tried("character layer staged", () => stageBrushGuide(dir, root));
  return { ...rules, staged };
}

/** The project style's rule files in .moworks/rules/, where Claude reads them: a link to the style's rules made once in the shared stage
 *  (project-service/shared-stage.mjs: runtime/stage/rules/<style>-<key>, the key changing with any rule or the app's own text over one), a
 *  copy on a drive that takes no link. Returns the SKILL.md paths to read: files (the style's rules), first (of those, the ones read
 *  before anything else, when the style names them) and qc (the Moworks QC review every style carries, read only in the QC step). A film
 *  with no style, or a style id the catalog does not have, has no rules: an earlier link or copy is removed, so nothing stale is named or read. */
export function prepareRules(dir, styleId, root = APP_ROOT) {
  const style = styleId ? getStyle(styleId, root) : null;
  const base = join(dir, ".moworks", "rules");
  if (!style) { rmSync(base, { recursive: true, force: true }); return { style: null, files: [], first: [], qc: [] }; }
  const want = style.rules.map((r) => ({ name: r.name, from: dirname(r.path), hash: r.hash, kind: r.kind, role: r.role ?? null, slug: r.slug ?? null }));
  // a Lemo-Opuscar style: its STYLE.md only, as SKILL.md under a credit header (its folder also holds the demo, staged at the build)
  // (an mg-styles-15 style: its prompt the same way; an anidoodle medium: its reference)
  // (the Brush cartoon style: ClaudeAnimationBase's ANIMATION_GUIDE.md, under a header on its Clawd demo)
  // (the What If animation style: the author's SKILL.md under a credit header, its references/ beside it; never its studio or scripts)
  const ownText = (w) => {
    const own = { "lemo-style": lemoRuleText, "mg-style": mgRuleText, "anidoodle-style": anidoodleRuleText, "brush-style": (_slug, r) => brushRuleText(r),
      "what-if-style": () => whatIfRuleText(w.from, root) }[w.kind];
    return own ? own(w.slug, root) ?? "" : null;
  };
  const texts = want.map(ownText);
  const key = createHash("sha256").update(JSON.stringify([style.id, want.map(({ name, hash, kind, role, slug }) => [name, hash, kind, role, slug]), texts])).digest("hex").slice(0, 12);
  const shared = ensureShared(sharedDir(root, "rules", `${style.id}-${key}`), (to) => {
    want.forEach((w, i) => {
      if (texts[i] != null) {
        mkdirSync(join(to, w.name), { recursive: true });
        writeFileSync(join(to, w.name, "SKILL.md"), texts[i]);
        if (w.kind === "what-if-style" && existsSync(join(w.from, "references"))) cpSync(join(w.from, "references"), join(to, w.name, "references"), { recursive: true });
      }
      else cpSync(w.from, join(to, w.name), { recursive: true, filter: (s) => !/desktop\.ini$/i.test(s) });
    });
    writeJson(join(to, "index.json"), { key, styleId: style.id, rules: want.map(({ name, hash, kind, role }) => ({ name, hash, kind, ...(role ? { role } : {}) })), at: new Date().toISOString() });
  }, (d) => existsSync(join(d, "index.json")) && want.every((w) => existsSync(join(d, w.name, "SKILL.md"))));
  linkOrCopy(base, shared);          // the link, or on a drive with no links a copy (kept while it is of the same rules)
  const path = (w) => `.moworks/rules/${w.name}/SKILL.md`;  const main = want.filter((w) => w.role !== "qc" && w.role !== "kind" && w.role !== "vocab" && w.role !== "adaptation");          // a film kind's rule is read only when the kind is chosen (reads.mjs)
  return { style, files: main.map(path), first: main.filter((w) => style.readFirst?.includes(w.name)).map(path), qc: want.filter((w) => w.role === "qc").map(path) };
}

/** The What If animation skill as Claude reads it in a project: the author's SKILL.md as shipped, under a header that says how the app
 *  runs its steps (the what-if-style pack: no Remotion, no Python, no ElevenLabs). */
export function whatIfRuleText(dir, root = APP_ROOT) {
  const src = whatIfSource(root), text = (() => { try { return readFileSync(join(dir, "SKILL.md"), "utf8"); } catch { return ""; } })();
  return `<!-- What If animation by FreshStack (kelano86), MIT, ${src ? `https://github.com/${src.repo}/tree/${src.commit}` : "pinned copy"}, as shipped.
In Moworks Studio its steps run as .moworks/rules/what-if-style/SKILL.md says: no Remotion, no Python scripts, no ElevenLabs; its
references/ are beside this file; its engine is staged in .moworks/library/what-if/. -->

${text}`;
}


// The rule files a pipeline step must read, so Claude never loads too few skills in a working session. HyperFrames' entry skill holds
// the render contract and the work loop and names the reference each kind of work needs ("What to read": HF 0.8.214, commit 4719543,
// skills/hyperframes/SKILL.md); the rest is opened on demand. The app does the same per pipeline step: each step names its required files
// (its own style layer plus the HyperFrames references for what the step writes: story.md for the brief of a HyperFrames style and
// General's, never an author's style, whose story comes from the author's own way; spec.md / look.md /
// storyboard.md / storyboard-format.md for the storyboard, motion.md for the motion, format.md / runtimes.md for the build), Claude reads
// them in its first turn, and opens the rest by name and purpose when it needs them. A guard (read-guard.mjs) checks before the first
// edit that the required files were read.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { docRelIn } from "../project-service/docs.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { HF_SKILL } from "../hf-edit/hf-scripts.mjs";
import { isLyricVideo } from "../style-catalog/traits.mjs";
import { styleFamily } from "../style-catalog/family.mjs";
import { isMoworksStyle, skillReads } from "../moworks-styles/index.mjs";
import { readJson } from "../util/json.mjs";

const R = (...p) => `.moworks/rules/${p.join("/")}`;
// HyperFrames' knowledge (skills/hyperframes at the pinned commit): the entry with the contract, and the references each step writes from
const HF = {
  entry: R(HF_SKILL, "SKILL.md"), story: R(HF_SKILL, "references", "story.md"), spec: R(HF_SKILL, "references", "spec.md"),
  look: R(HF_SKILL, "references", "look.md"), storyboard: R(HF_SKILL, "references", "storyboard.md"),
  boardFormat: R(HF_SKILL, "references", "storyboard-format.md"), motion: R(HF_SKILL, "references", "motion.md"),
  format: R(HF_SKILL, "references", "format.md"), runtimes: R(HF_SKILL, "references", "runtimes.md"), review: R(HF_SKILL, "references", "review.md"),
};
// HyperFrames' own film types (references/types/<type>.md), each a style of the gallery ("hf-<type>")
export const HF_TYPES = ["explainer", "launch", "music", "data", "vertical", "3d", "character"];
// General style (the Moworks layer over HyperFrames): its own step table (config/rules/general-style/SKILL.md §2) and HyperFrames'
// references for the same work (the entry's "What to read" and work loop: story first, then the spec, the look and the board; motion;
// the format and the runtimes for the composition)
const GENERAL = {
  brief: [R("general-style", "SKILL.md"), R("general-style", "references", "story.md"), R("general-style", "references", "inputs.md"), HF.story],
  storyboard: [R("general-style", "SKILL.md"), R("general-style", "references", "storyboard.md"), HF.boardFormat, HF.storyboard, HF.entry, HF.spec, HF.look],
  motionSpec: [R("general-style", "SKILL.md"), R("general-style", "references", "motion-spec.md"), R("general-style", "references", "motion-craft.md"), HF.motion],
  build: [R("general-style", "SKILL.md"), HF.entry, HF.format, HF.runtimes, HF.motion, R("general-style", "references", "motion-craft.md")],
  qcReview: [R("moworks-qc", "SKILL.md")],
  checks: [R("general-style", "SKILL.md"), HF.entry],
  sound: [R("general-style", "references", "sound.md")],
  chat: [R("general-style", "SKILL.md")],
};
// The Map Explainer style: its own pack in every step, over General's table (its engine and worked example are in .moworks/library/map-explainer)
const MAP_PACK = R("map-explainer", "SKILL.md"), MAP_ENGINE = ".moworks/library/map-explainer/mapfilm.js";
const MAP = {
  brief: [MAP_PACK, ...GENERAL.brief], storyboard: [MAP_PACK, MAP_ENGINE, ".moworks/library/map-explainer/example/film.js", ...GENERAL.storyboard],
  motionSpec: [MAP_PACK, ...GENERAL.motionSpec], build: [MAP_PACK, MAP_ENGINE, ".moworks/library/map-explainer/example/f3.html", ...GENERAL.build],
  qcReview: GENERAL.qcReview, checks: [MAP_PACK, ...GENERAL.checks], sound: [MAP_PACK, ...GENERAL.sound], chat: [MAP_PACK, ...GENERAL.chat],
};
// The owner's film styles (Paper Collage, Stickman Explainer, Inner Voice Short, 3D Cartoon, 2D Explainer, Ricks Clip): the app's pack in every step, over General's
// table, and the style's source skill as shipped (.moworks/library/<style>/skill): its skill and look for the brief, its look, worked examples and the app's page for the
// board and the build, its sound rules for the music step
const SKILL = (styleId) => {
  const pack = R(styleId, "SKILL.md"), k = skillReads(styleId), uniq = (xs) => [...new Set(xs.filter(Boolean))];
  return {
    // each step the source skill's own files for it (skillReads steps, #1036), then the look and General's
    brief: uniq([pack, ...k.steps.brief, ...GENERAL.brief]), storyboard: uniq([pack, ...k.look, ...k.steps.storyboard, ...k.app, ...GENERAL.storyboard]),
    motionSpec: uniq([pack, ...k.steps.motionSpec, ...GENERAL.motionSpec]), build: uniq([pack, ...k.look, ...k.steps.build, ...k.examples, ...k.app, ...GENERAL.build]),
    // the Review: the house review, then this style's pack (its Review row) and the source skill's own checklists (#947); GENERAL's own list is unchanged
    qcReview: uniq([...GENERAL.qcReview, pack, ...k.steps.review, k.look[0]]), checks: uniq([pack, ...GENERAL.checks]), sound: [pack, ...k.sound, ...GENERAL.sound], chat: [pack, ...GENERAL.chat],
  };
};
// A Lemo-Opuscar style: its STYLE.md (.moworks/rules/lemo-<slug>) and the app's lemo-opuscar pack in every step, HF's
// mandatory reads for what the step writes, and from the build on the style's demo (staged in .moworks/library/lemo/<slug>/): never
// before, Lemo-Opuscar's own rule (the treatment first)
const LEMO = (slug) => {
  const own = R(`lemo-${slug}`, "SKILL.md"), pack = R("lemo-opuscar", "SKILL.md"), demo = `.moworks/library/lemo/${slug}/DEMO.md`;
  return {
    brief: [own, pack],
    storyboard: [own, pack, HF.boardFormat, HF.entry],
    motionSpec: [own, pack, HF.motion],
    build: [own, pack, demo, HF.entry, HF.runtimes],
    qcReview: [R("moworks-qc", "SKILL.md"), own, demo],
    checks: [own, pack, HF.entry],
    sound: [own, pack],          // the pack's Sound / Final Mix row: the app's music and sound effects only (audit/112a R4, owner Qa6)
    chat: [own, pack],
  };
};
// An mg-styles-15 style: its prompt (.moworks/rules/mg-<id>) and the app's mg-styles pack in every step, HF's mandatory reads,
// and from the build on the demo source and the author's rubric (staged in .moworks/library/mg/<id>/)
const MG = (id) => {
  const own = R(`mg-${id}`, "SKILL.md"), pack = R("mg-styles", "SKILL.md"), credit = `.moworks/library/mg/${id}/CREDIT.md`, rubric = `.moworks/library/mg/${id}/rubric.md`;
  return {
    brief: [own, pack],
    storyboard: [own, pack, HF.boardFormat, HF.entry],
    motionSpec: [own, pack, HF.motion],
    build: [own, pack, credit, HF.entry, HF.runtimes],
    qcReview: [R("moworks-qc", "SKILL.md"), own, rubric],
    checks: [own, pack, HF.entry],
    sound: [own, pack],          // the pack's Sound / Final Mix row: the app's music and sound effects only (audit/112a R4, owner Qa6)
    chat: [own, pack],
  };
};

/** The project's film kind: one every style offers (config/film-kinds.json, e.g. whatIf: { scope: "all" }),
 *  or an anidoodle medium's own (anidoodleKind, scope "anidoodle"); null for a film as the brief says. */
export function filmKind(dir, root = APP_ROOT) {
  const id = readJson(join(dir, ".moworks", "project.json"), {})?.brief?.answers?.filmKind;
  const k = id && readJson(join(root, "config", "film-kinds.json"), {})[id];
  if (k && typeof k === "object" && !id.startsWith("_")) return { id, scope: "all", ...k };
  const a = anidoodleKind(dir, root);
  return a ? { ...a, scope: "anidoodle" } : null;
}
/** The anidoodle film kind of a project: its New project answer, with its entry in config/anidoodle-pipeline.json. */
export function anidoodleKind(dir, root = APP_ROOT) {
  const id = readJson(join(dir, ".moworks", "project.json"), {})?.brief?.answers?.filmKind;
  const k = id && readJson(join(root, "config", "anidoodle-pipeline.json"), {}).filmKinds?.[id];
  return k && typeof k === "object" ? { id, ...k } : null;
}
// An anidoodle medium: its reference (.moworks/rules/anidoodle-<id>) and the app's anidoodle pack in every step, the author's
// SKILL.md (the seven laws) and the film contract (the engine is staged in .moworks/library/anidoodle/ from the first step); the author's
// story, realism, method and craft-bar guides, and the guides of the film's kind (config/anidoodle-pipeline.json authorReads, filmKinds)
const ANIDOODLE = (id) => {
  const own = R(`anidoodle-${id}`, "SKILL.md"), pack = R("anidoodle", "SKILL.md"), lib = ".moworks/library/anidoodle";
  const laws = `${lib}/SKILL.md`, contract = `${lib}/references/determinism-and-contract.md`;
  return {
    brief: [own, pack, laws],
    // a human hand's Character step: the author's recipe for a new character; the film's cast from the storyboard on
    character: [own, pack, laws, `${lib}/references/workflows/character-consistency.md`, `${lib}/references/anatomy.md`, `${lib}/references/craft-bar.md`, "docs/CHARACTERS.json"],
    storyboard: [own, pack, laws, contract, HF.boardFormat, "docs/CHARACTERS.json"],
    motionSpec: [own, pack, `${lib}/references/motion-grammar.md`, `${lib}/references/camera.md`, HF.motion, "docs/CHARACTERS.json"],
    build: [own, pack, laws, contract, HF.entry, HF.runtimes, "docs/CHARACTERS.json"],
    // the pack too: the Review once read the turtle as a second cheetah, and the pack names every character in every still
    qcReview: [R("moworks-qc", "SKILL.md"), own, pack, `${lib}/references/workflows/review.md`],
    // Claude's fix of what stops the render (G-POSE, G-CONTRACT, G-BUILD): the build's code rules without its design (audit/112b b3.1)
    checks: [own, pack, laws, contract, HF.entry],
    sound: [own, pack],          // the pack's Sound / Final Mix row: the app's music and sound effects only (audit/112a R4, owner Qa6)
    chat: [own, pack],
  };
};
const ANIDOODLE_MORE = (dir) => {
  const cfg = readJson(join(APP_ROOT, "config", "anidoodle-pipeline.json"), {}), kind = anidoodleKind(dir), more = {};
  for (const src of [cfg.authorReads ?? {}, kind?.reads ?? {}]) for (const [step, xs] of Object.entries(src)) if (Array.isArray(xs)) more[step] = [...(more[step] ?? []), ...xs.map((x) => `.moworks/library/anidoodle/${x}`)];
  return more;
};

// The Brush cartoon style: ClaudeAnimationBase's guide (.moworks/rules/brush-cartoon) and the app's pack in every step; the
// Character step the layer's code and an example definition; from the storyboard on the project's approved CHARACTERS.json
const BRUSH = () => {
  const own = R("brush-cartoon", "SKILL.md"), pack = R("brush-cartoon-app", "SKILL.md"), lib = ".moworks/library/character-kit", cast = "docs/CHARACTERS.json";
  return {
    brief: [own, pack],
    character: [pack, `${lib}/src/character.js`, `${lib}/examples/definition.json`],
    storyboard: [own, pack, cast, HF.boardFormat],
    motionSpec: [own, pack, cast, HF.motion],
    build: [own, pack, cast, `${lib}/src/character.js`, HF.entry, HF.runtimes],
    qcReview: [R("moworks-qc", "SKILL.md"), own],
    checks: [own, pack, HF.entry],
    sound: [own, pack],          // the pack's Sound / Final Mix row: the app's music and sound effects only (audit/112a R4, owner Qa6)
    chat: [own, pack],
  };
};

// The What If animation style: the author's skill (.moworks/rules/what-if-animation, its references beside it) and the app's
// pack in every step; the author's references the step needs (config/what-if-pipeline.json authorReads); the episode files once written
const WHATIF = () => {
  const own = R("what-if-animation", "SKILL.md"), pack = R("what-if-style", "SKILL.md");
  const cfg = readJson(join(APP_ROOT, "config", "what-if-pipeline.json"), {}).authorReads ?? {};
  const refs = (step) => (cfg[step] ?? []).map((x) => R("what-if-animation", x));
  return {
    brief: [own, pack, ...refs("brief")],
    storyboard: [own, pack, ...refs("storyboard"), "whatif/episode.json"],
    motionSpec: [own, pack, ...refs("motionSpec"), "whatif/episode.json", HF.motion],
    build: [own, pack, ...refs("build"), "whatif/episode.json", HF.entry],
    qcReview: [R("moworks-qc", "SKILL.md"), own, pack, ...refs("qcReview")],
    checks: [own, pack, ...refs("build"), HF.entry],          // G-BUILD's fix: the build's references (audit/112b b3.1)
    sound: [own, pack, ...refs("sound")],
    chat: [own, pack],
  };
};

/** The step table of a style that has one of its own (General, Map Explainer, the owner's styles, Lemo-Opuscar, mg-styles-15, anidoodle,
 *  Brush cartoon, What If), or null for a HyperFrames style (its reads are HyperFrames' own references, below). */
function tableFor(dir, styleId) {
  const id = String(styleId ?? "");
  const { family, slug } = styleFamily(id), lemo = family === "lemo" && slug, mg = family === "mg" && slug, ani = family === "anidoodle" && slug;
  if (id === "general") return GENERAL;
  if (id === "map-explainer") return MAP;
  if (isMoworksStyle(id)) return SKILL(id);
  if (lemo) return LEMO(lemo);
  if (mg) return MG(mg);
  if (ani) { const t = ANIDOODLE(ani), more = dir ? ANIDOODLE_MORE(dir) : {}; return Object.fromEntries(Object.entries(t).map(([k, xs]) => [k, [...xs, ...(more[k] ?? [])]])); }
  if (id === "brush-cartoon") return BRUSH();
  if (id === "what-if") return WHATIF();
  return null;
}
/** Is this step's reading list written here? (A style's Claude step that is not would read as the chat.) The style's own table, HyperFrames'
 *  own steps, and the steps every style shares (the chat, Adaptation, Thumbnails). */
export function stepHasReads(styleId, step) {
  if (["chat", "adaptation", "thumbnails"].includes(step)) return true;
  const t = tableFor(null, styleId);
  return t ? Object.hasOwn(t, step) : ["brief", "storyboard", "motionSpec", "build", "sound", "checks", "qcReview"].includes(step);
}
const exists = (dir) => (p) => existsSync(join(dir, ...p.split("/")));
// the app's own files (the style's rules, the staged source skills and engines): one missing is a fault of the app, never of the film
const appFile = (p) => p.startsWith(".moworks/rules/") || p.startsWith(".moworks/library/");

/**
 * Every file a task should read, whether it is there or not ([project-relative paths]). styleId "general" uses its table,
 * a Lemo-Opuscar style ("lemo-<slug>"), an mg-styles-15 style ("mg-<id>") an anidoodle medium ("anidoodle-<id>") or the Brush cartoon style its own; a HyperFrames style
 * (HyperFrames' entry SKILL.md, or Slideshow's, is `first`; a film type "hf-<type>" adds its references/types/<type>.md) reads them in every step,
 * plus HyperFrames' references for what the step writes.
 */
export function readsList(dir, { styleId, first = [], step = null } = {}) {
  const key = step ?? "chat";
  let list;
  // the Adaptation step (one film, another size): its rules, HyperFrames' vertical, captions and overlays references, the style's own pack
  // or source skill's look (its staging and format rules come first, #1198), the film's design and the alive rule
  if (key === "adaptation") {
    // an anidoodle medium: the author's formats.md too, which the Adaptation rule names first for it (audit/112b b3.2; staged with the engine)
    const own = isMoworksStyle(styleId) ? (() => { const k = skillReads(styleId); return [R(styleId, "SKILL.md"), ...k.look]; })() : styleId === "general" || styleId === "map-explainer" ? [R("general-style", "SKILL.md")]
      : styleFamily(styleId).family === "anidoodle" ? [...first, ".moworks/library/anidoodle/references/formats.md"] : first;
    list = [R("adaptation", "SKILL.md"), ...own, R(HF_SKILL, "references", "types", "vertical.md"), R(HF_SKILL, "references", "captions.md"), R(HF_SKILL, "references", "overlays.md"),
      "frame.md", "design.md", R("moworks-alive", "SKILL.md")];
    return [...new Set([R("moworks-studio", "SKILL.md"), ...list])];
  }
  // the Thumbnails page (two upload pictures of a finished film): the style's look only, its fonts, colours and titles (the owner's styles keep
  // theirs in the source skill: its look files), never the house rules of making a film; the thumbnails' own rule comes first in its lab
  if (key === "thumbnails") return [...new Set(isMoworksStyle(styleId) ? [R(styleId, "SKILL.md"), ...skillReads(styleId).look] : first)];
  const t = tableFor(dir, styleId);
  if (t) list = t[key] ?? t.chat;
  else {
    const type = styleFamily(styleId).family === "hf" ? styleFamily(styleId).slug : null;
    const typeFile = HF_TYPES.includes(type) ? [R(HF_SKILL, "references", "types", `${type}.md`)] : [];
    // the music step picks the tracks and writes a line of notes: the house rules (their music and sound rules) and the style's own file,
    // never HyperFrames' entry skill, which is the render contract and the work loop of the steps that write the film. Test 23's music
    // step read none of the three it was given, was stopped once before NOTES.md and left the film's notes without its music (T23-7)
    const own = key === "sound" ? (typeFile.length ? typeFile : first.filter((p) => p !== HF.entry)) : [...first, ...(typeFile.length ? [HF.entry, ...typeFile] : [])];
    const hf = { brief: [HF.story], storyboard: [HF.spec, HF.look, HF.storyboard, HF.boardFormat], motionSpec: [HF.motion],
      build: [HF.entry, HF.format, HF.runtimes, HF.motion], checks: [HF.entry], qcReview: [R("moworks-qc", "SKILL.md"), HF.review] }[key] ?? [];
    // the Review: the house's review rules and HF's, and the film type's own file as every other step reads it (its safe zones, its pace: b3.3)
    list = key === "qcReview" ? [...hf, ...typeFile] : [...own, ...hf];
  }
  // the film's design: frame.md (the Look the app wrote) or design.md (one Claude wrote), read in
  // every step that designs, moves, builds or checks the picture (HyperFrames' design spec; listed only when there is one)
  if (["storyboard", "motionSpec", "build", "qcReview"].includes(key)) list = [...list, "frame.md", "design.md"];
  // the studio's always-alive rule: every style's Storyboard (its beats and cuts are planned there, audit/101), Motion Plan, Build and Review
  if (["storyboard", "motionSpec", "build", "qcReview"].includes(key)) list = [...list, R("moworks-alive", "SKILL.md")];
  // the motion vocabulary: the names of the film packs, read in the Motion Plan only; library_search kind "vocab" answers with their numbers
  if (key === "motionSpec") list = [...list, R("motion-vocab", "SKILL.md")];
  // a lyrics video, whatever its film style: the energy and song rules, and the song's data once the app has it (the beat map, the timed words)
  if (isLyricVideo(readJson(join(dir, ".moworks", "project.json"), {}), { dir }) && ["storyboard", "motionSpec", "build", "qcReview"].includes(key)) {
    list = [...list, R("moworks-alive", "lyric-video.md")];
    if (key !== "qcReview") list = [...list, "docs/BEATMAP.md", "LYRICS-TIMED.md"];
  }
  // a film with an image sequence, in any style: the sequence's rules and what the scan read of it
  if (["storyboard", "motionSpec", "build", "qcReview"].includes(key)) {
    const seqs = readJson(join(dir, ".moworks", "scan", "index.json"), {})?.sequences ?? [];
    if (seqs.length) list = [...list, R("moworks-alive", "sequence.md"), ...seqs.map((s) => s.poses?.md).filter(Boolean)];
  }
  // the product's facts from the web, once the owner said yes and Claude wrote them
  if (["storyboard", "motionSpec", "build", "qcReview"].includes(key)) list = [...list, "docs/RESEARCH.md"];
  // a film kind every style offers (What If): its rule in the steps it names
  const kind = filmKind(dir);
  if (kind?.scope === "all") list = [...list, ...(kind.reads?.[key] ?? [])];
  // the studio's house rules: every step of every style, first, before the style's own
  list = [R("moworks-studio", "SKILL.md"), ...list];
  return [...new Set(list.map((p) => (p.startsWith("docs/") ? docRelIn(dir, p.slice(5)) : p)))];
}
/** The files a task must read that are there ([project-relative paths]): readsList without the film's files not written yet (frame.md before
 *  the Look, docs/RESEARCH.md before the web search…) and without an app file that is missing (missingReads names those). */
export const requiredReads = (dir, opts = {}) => readsList(dir, opts).filter(exists(dir));
/** The app's own files a task should read and cannot (a rules file renamed, a source skill or engine not staged): never dropped in silence. */
/** The task's status line for the app files a step could not read: how many, never their paths (the paths are in the server's log). */
export const missingLine = (n) => (n === 1 ? "App: 1 rules file of this step was not found; Claude goes on without it"
  : `App: ${n} rules files of this step were not found; Claude goes on without them`);
export const missingReads = (dir, opts = {}) => readsList(dir, opts).filter((p) => appFile(p) && !exists(dir)(p));

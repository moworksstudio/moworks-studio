// The rule files a pipeline step must read, so Claude never loads too few skills in a working session. HyperFrames' entry skill holds
// the render contract and the work loop and names the reference each kind of work needs ("What to read": HF 0.8.214, commit 4719543,
// skills/hyperframes/SKILL.md); the rest is opened on demand. The app does the same per pipeline step: each step names its required files
// (its own style layer plus the HyperFrames references for what the step writes: story.md for the brief of a HyperFrames style and
// General's, never an author's style, whose story comes from the author's own way; spec.md / look.md /
// storyboard.md / storyboard-format.md for the storyboard, motion.md for the motion, format.md / runtimes.md for the build), Claude reads
// them in its first turn, and opens the rest by name and purpose when it needs them. A guard (read-guard.mjs) checks before the first
// edit that the required files were read.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { docRelIn } from "../project-service/docs.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { HF_SKILL } from "../hf-edit/hf-scripts.mjs";
import { isLyricVideo } from "../style-catalog/traits.mjs";

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
  checks: [HF.entry],
  sound: [R("general-style", "references", "sound.md")],
  chat: [R("general-style", "SKILL.md")],
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
    checks: [HF.entry],
    sound: [own],
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
    checks: [HF.entry],
    sound: [own],
    chat: [own, pack],
  };
};
const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
/** The anidoodle film kind of a project: its New project answer, with its entry in config/anidoodle-pipeline.json. */
/** The project's film kind: one every style offers (config/film-kinds.json, e.g. whatIf: { scope: "all" }),
 *  or an anidoodle medium's own (anidoodleKind, scope "anidoodle"); null for a film as the brief says. */
export function filmKind(dir, root = APP_ROOT) {
  const id = readJson(join(dir, ".moworks", "project.json"), {})?.brief?.answers?.filmKind;
  const k = id && readJson(join(root, "config", "film-kinds.json"), {})[id];
  if (k && typeof k === "object" && !id.startsWith("_")) return { id, scope: "all", ...k };
  const a = anidoodleKind(dir, root);
  return a ? { ...a, scope: "anidoodle" } : null;
}
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
    checks: [HF.entry],
    sound: [own],
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
    checks: [HF.entry],
    sound: [own],
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
    checks: [HF.entry],
    sound: [own, pack, ...refs("sound")],
    chat: [own, pack],
  };
};

/**
 * The files a task must read: [project-relative paths] that exist in the project's copy of the rules. styleId "general" uses its table,
 * a Lemo-Opuscar style ("lemo-<slug>"), an mg-styles-15 style ("mg-<id>") an anidoodle medium ("anidoodle-<id>") or the Brush cartoon style its own; a HyperFrames style
 * (HyperFrames' entry SKILL.md, or Slideshow's, is `first`; a film type "hf-<type>" adds its references/types/<type>.md) reads them in every step,
 * plus HyperFrames' references for what the step writes.
 */
export function requiredReads(dir, { styleId, first = [], step = null } = {}) {
  const key = step ?? "chat";
  const lemo = /^lemo-([a-z0-9-]+)$/.exec(String(styleId ?? ""))?.[1], mg = /^mg-(\d\d-[a-z0-9-]+)$/.exec(String(styleId ?? ""))?.[1];
  const ani = /^anidoodle-([A-Za-z0-9]+)$/.exec(String(styleId ?? ""))?.[1];
  let list;
  if (styleId === "general") list = GENERAL[key] ?? GENERAL.chat;
  else if (lemo) { const t = LEMO(lemo); list = t[key] ?? t.chat; }
  else if (mg) { const t = MG(mg); list = t[key] ?? t.chat; }
  else if (ani) { const t = ANIDOODLE(ani); list = [...(t[key] ?? t.chat), ...(ANIDOODLE_MORE(dir)[key] ?? [])]; }
  else if (styleId === "brush-cartoon") { const t = BRUSH(); list = t[key] ?? t.chat; }
  else if (styleId === "what-if") { const t = WHATIF(); list = t[key] ?? t.chat; }
  else {
    const type = /^hf-([a-z0-9]+)$/.exec(String(styleId ?? ""))?.[1];
    const typeFile = HF_TYPES.includes(type) ? [R(HF_SKILL, "references", "types", `${type}.md`)] : [];
    // the music step picks the tracks and writes a line of notes: the house rules (their music and sound rules) and the style's own file,
    // never HyperFrames' entry skill, which is the render contract and the work loop of the steps that write the film. Test 23's music
    // step read none of the three it was given, was stopped once before NOTES.md and left the film's notes without its music (T23-7)
    const own = key === "sound" ? (typeFile.length ? typeFile : first.filter((p) => p !== HF.entry)) : [...first, ...(typeFile.length ? [HF.entry, ...typeFile] : [])];
    const hf = { brief: [HF.story], storyboard: [HF.spec, HF.look, HF.storyboard, HF.boardFormat], motionSpec: [HF.motion],
      build: [HF.entry, HF.format, HF.runtimes, HF.motion], checks: [HF.entry], qcReview: [R("moworks-qc", "SKILL.md"), HF.review] }[key] ?? [];
    list = key === "qcReview" ? hf : [...own, ...hf];
  }
  // the film's design: frame.md (the Look the app wrote) or design.md (one Claude wrote), read in
  // every step that designs, moves, builds or checks the picture (HyperFrames' design spec; listed only when there is one)
  if (["storyboard", "motionSpec", "build", "qcReview"].includes(key)) list = [...list, "frame.md", "design.md"];
  // the studio's always-alive rule: every style's Motion Plan, Build and Review
  if (["motionSpec", "build", "qcReview"].includes(key)) list = [...list, R("moworks-alive", "SKILL.md")];
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
  // the studio's house rules: every step of every style, first, before the style's own
  // a film kind every style offers (What If): its rule in the steps it names
  const kind = filmKind(dir);
  if (kind?.scope === "all") list = [...list, ...(kind.reads?.[key] ?? [])];
  list = [R("moworks-studio", "SKILL.md"), ...list];
  return [...new Set(list.map((p) => (p.startsWith("docs/") ? docRelIn(dir, p.slice(5)) : p)))].filter((p) => existsSync(join(dir, ...p.split("/"))));
}

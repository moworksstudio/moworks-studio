// Style Gallery data. Reads config/styles.json and resolves each style's rule source:
//   hf-skill: HyperFrames' skills from the pinned HF skills (pins hyperframes.skillsRoot), each with the hash from HF's own
//             skills-manifest.json: Slideshow, or one style per film type of skills/hyperframes/references/types (rules.type), on the
//             shared pipeline config/hf-pipeline.json; nothing is loaded from the network.
//   moworks:  General Style: the app's rule pack config/rules/general-style (the Moworks Motion kit's process and taste, rewritten for the
//             app; the kit's own skill drives kit.py / film.json, which this app does not use), with the SHA-256 of the whole pack and of the
//             kit files it came from, on top of HyperFrames' skills.
//   qc:       every style also carries the Moworks QC review (config/rules/moworks-qc, role "qc", read only in the QC step).
//   lemo-style: a Lemo-Opuscar style: its STYLE.md from the pinned clone (as shipped), the app's rule pack for building such a
//             film inside HyperFrames (config/rules/lemo-opuscar), HF's core skills and the QC review; the 66 styles come from the clone's
//             styles/*/style.json (packages/lemo-styles), their pipeline from config/lemo-pipeline.json.
// Every style names its author (the Style Gallery groups by it): Moworks Studio, HeyGen (HyperFrames), Lemomo (LemoLab).
// A style marked hidden stays resolvable for the projects made with it but is not offered for new ones.
// The same data feeds the Style Gallery screen and the New Project style step. Selecting a style stores `selection(style)` in the project.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { skillIntact } from "../setup/hf-skills.mjs";
import { AUTHOR as LEMO_AUTHOR, LICENCE as LEMO_LICENCE, lemoSlug, lemoSource, readStyles as lemoStyles, treeLink, viChecks, viStoreFile } from "../lemo-styles/index.mjs";
import { AUTHOR as MG_AUTHOR, mgSlug, mgSource, readStyles as mgStyles, treeLink as mgTreeLink } from "../mg-styles/index.mjs";
import { AUTHOR as ANI_AUTHOR, anidoodleId, anidoodleSource, previewOf as aniPreview, readStyles as anidoodleMedia, storeDir as aniStore, treeLink as aniTreeLink } from "../anidoodle-styles/index.mjs";
import { items as lookItems, storeRoot as looksRoot } from "../looks-library/index.mjs";
import { thumbUrl } from "./thumbs.mjs";
import { aeBadge, localFile as aeLocal, measurements as aeMeasured, shippedFile as aeShipped } from "../style-ae/badge.mjs";
import { styleFpsRule } from "./fps.mjs";
import { humanHandOf } from "./hands.mjs";
import { STYLE_ID as BRUSH_ID, kitSource } from "../character-kit/index.mjs";
import { AUTHOR as WI_AUTHOR, DEMO as WI_DEMO, mediaFile as wiMedia, whatIfSource, treeLink as wiTreeLink } from "../what-if-styles/index.mjs";

const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

function sources(root) {
  const pins = loadPins(root);
  const skillsRoot = expandEnv(pins.hyperframes.skillsRoot ?? "");
  const manifestFile = join(dirname(skillsRoot), "skills-manifest.json");
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")).skills : {};
  return { pins, skillsRoot, manifest, kitRoot: expandEnv(pins.kit.root ?? "") };
}

function skillRef(src, name) {
  const file = join(src.skillsRoot, name, "SKILL.md");
  const m = src.manifest[name];
  const intact = skillIntact(name);
  return { kind: "hf-skill", name, path: file, available: existsSync(file) && intact, ...(intact ? {} : { locked: "changed since the pinned commit" }), hash: m?.hash ?? null, files: m?.files ?? null,
    hfVersion: src.pins.hyperframes.default };
}

/** The SHA-256 of a rule folder: every file's relative path and bytes, so a change in a reference file changes the pack's hash too. */
function hashFolder(d) {
  const h = createHash("sha256");
  const walk = (x) => { for (const n of readdirSync(x).sort()) { if (/^desktop\.ini$/i.test(n)) continue; const p = join(x, n); if (statSync(p).isDirectory()) walk(p); else h.update(relative(d, p).split(sep).join("/")).update(readFileSync(p)); } };
  walk(d); return h.digest("hex");
}

/** A Moworks rule pack (a folder under config/rules holding SKILL.md and its references). */
function moworksRule(src, root, file, derived, role = null) {
  const path = join(root, file);
  const ok = existsSync(path);
  const derivedFrom = (derived ?? []).map((k) => { const kp = join(src.kitRoot, k); return { name: k, hash: existsSync(kp) ? sha256(kp) : null }; });
  return { kind: "moworks-rule", name: file.split("/").at(-2) ?? file, path, available: ok, hash: ok ? hashFolder(dirname(path)) : null,
    source: "Moworks Motion (adapted)", derivedFrom, ...(role ? { role } : {}) };
}

/** The studio's packs every style carries: the Moworks QC review (role "qc", read only in the Review), the film-is-always-
 *  alive rule (role "alive": the Motion Plan, the Build and the Review) and the house rules (role "studio": read first in every
 *  step). `qc` is styles.json's "qc" with its "alive" and "studio", and its "kinds": the film kinds every style offers (role "kind",
 *  staged with every style, read only when New project's film kind names it, config/film-kinds.json). */
function layerRules(src, root, qc) {
  return [...(qc?.studio?.file ? [{ ...moworksRule(src, root, qc.studio.file, qc.studio.derivedFrom, "studio"), source: "Moworks Studio, written from the Moworks Motion kit's rules (owner 24/10/2026)" }] : []),
    ...(qc?.file ? [moworksRule(src, root, qc.file, qc.derivedFrom, "qc")] : []),
    ...(qc?.alive?.file ? [{ ...moworksRule(src, root, qc.alive.file, qc.alive.derivedFrom, "alive"), source: "Moworks Studio, written from the Moworks Motion kit's rules (owner 24/10/2026)" }] : []),
    ...(qc?.vocab?.file ? [{ ...moworksRule(src, root, qc.vocab.file, [], "vocab"), source: qc.vocab.source ?? "Motion Prompt (Shohei Ohtaki, MIT)" }] : []),
    ...(qc?.kinds ?? []).filter((k) => k.file).map((k) => ({ ...moworksRule(src, root, k.file, [], "kind"), kindId: k.id, source: k.source ?? "Moworks Studio" }))];
}

function resolveRules(src, rules, root, qc) {
  const qcRule = layerRules(src, root, qc);
  if (rules.kind === "moworks") {     // General Style: the Moworks layer over HyperFrames' skills (HF builds, Moworks directs)
    return [...rules.files.map((f) => moworksRule(src, root, f, rules.derivedFrom)), ...(rules.uses ?? []).map((u) => skillRef(src, u)), ...qcRule];
  }
  return [skillRef(src, rules.skill), ...rules.uses.map((u) => skillRef(src, u)), ...qcRule];
}

const HF_AUTHOR = { id: "heygen", name: "HeyGen (HyperFrames)", source: "HyperFrames" }, MW_AUTHOR = { id: "moworks", name: "Moworks Studio", source: "Moworks Motion" };
const MG_CATEGORY = "Motion design (mg-styles-15)", ANI_CATEGORY = "Hand-made media (anidoodle)";   // only when a style has no category of its own
const AUTHOR_NAMES = { [MW_AUTHOR.id]: MW_AUTHOR.name, [HF_AUTHOR.id]: HF_AUTHOR.name, [LEMO_AUTHOR.id]: LEMO_AUTHOR.name, [MG_AUTHOR.id]: MG_AUTHOR.name, [ANI_AUTHOR.id]: ANI_AUTHOR.name, johnheibel: "John Heibel" };
const lookCount = (root) => { try { return lookItems(root).length; } catch { return 0; } };          // the store lists frame presets only
const lemoUses = (root) => { try { return JSON.parse(readFileSync(join(root, "config", "lemo-pipeline.json"), "utf8")).uses ?? []; } catch { return []; } }; // the HF skills a lemo film is built with
const LEMO_PACK = "config/rules/lemo-opuscar/SKILL.md";
const LEMO_ASPECTS = ["16:9", "9:16", "1:1", "4:5"];          // 1920×1080 by default; other sizes laid out from the frame (TECHNIQUE §2)
const readPipeline = (root, file, id) => { try { const j = JSON.parse(readFileSync(join(root, "config", file), "utf8")); return (id ? (Array.isArray(j.styles) ? j.styles.find((s) => s.id === id)?.pipeline : j.styles?.[id]) : j.pipeline) ?? []; } catch { return []; } };
/** A config/styles.json style's pipeline: its own, or its shared file's (config/hf-pipeline.json: the style's own steps, else the shared ones). */
const ownPipeline = (root, s) => s.pipeline ?? (s.rules?.pipeline ? (readPipeline(root, s.rules.pipeline, s.id).length ? readPipeline(root, s.rules.pipeline, s.id) : readPipeline(root, s.rules.pipeline)) : []);

/** A Lemo-Opuscar style's own frame rate: the author's "1920×1080 at 24 fps by default; an output frame
 *  rate set in the style wins" (DIRECTOR.md L14); the rate its demo film was made at, as its DEMO.md says the output ("1920×1080, 60 fps",
 *  "render (1,605 frames, 30 fps)", "mux … 30 fps", "at 30 fps"): 13 of 59 are 30 or 60. A source clip's or a stepping rate (25 fps
 *  footage, 12 fps on twos, 10 fps line boil) is not the output's. */
const LEMO_OUT_FPS = [/\d{3,4}\s*[×x]\s*\d{3,4}\s*(?:at|@|,)\s*(\d+)\s*fps/i, /--fps\s+(\d+)/i, /\brender[^\n]{0,80}?\b(\d+)\s*fps/i,
  /\bmux[^\n]{0,80}?\b(\d+)\s*fps/i, /\b(?:at|@)\s*(\d+)\s*fps\b/i];
function lemoFps(root, s) {
  const md = (() => { try { return readFileSync(join(root, ...s.paths.demoMd.split("/")), "utf8"); } catch { return ""; } })();
  for (const re of LEMO_OUT_FPS) { const n = Number(re.exec(md)?.[1]); if ([24, 25, 30, 60].includes(n)) return n; }
  // DEMO.md silent: the rate the demo's own build.sh renders at (FPS=30 in the styles added at ea34ff9)
  const sh = (() => { try { return readFileSync(join(root, ...s.paths.demo.split("/"), "build.sh"), "utf8"); } catch { return ""; } })();
  const n = Number(/^\s*(?:export\s+)?FPS=(\d+)\b/m.exec(sh)?.[1]);
  return [24, 25, 30, 60].includes(n) ? n : 24;
}

/** The Lemo-Opuscar styles as catalog entries (one shared rule pack and pipeline; each style its own STYLE.md). */
function lemoEntries(src, root, qc) {
  const lemo = lemoSource(root);
  if (!lemo) return [];
  const qcRule = layerRules(src, root, qc);
  const pack = { ...moworksRule(src, root, LEMO_PACK, []), source: "Moworks Studio, written from Lemo-Opuscar's AGENTS.md, DIRECTOR.md and TECHNIQUE.md (MIT)" };
  const hf = lemoUses(root).map((u) => skillRef(src, u));
  const pipeline = readPipeline(root, "lemo-pipeline.json");
  const vi = viChecks(root);
  return lemoStyles(root).map((s) => {
    const own = { kind: "lemo-style", name: `lemo-${s.slug}`, slug: s.slug, path: join(lemo.root, ...s.paths.style.split("/")), hash: s.hash,
      available: lemo.intact, ...(lemo.intact ? {} : { locked: "the Lemo-Opuscar clone is not at the pinned commit" }), source: "Lemo-Opuscar (as shipped)" };
    const rules = [own, pack, ...hf, ...qcRule];
    const v = vi[s.slug] ?? null, lacking = (v?.families ?? []).filter((f) => f.vi === false).map((f) => f.family);
    const warnings = [
      ...(s.voiceExcluded ? [{ kind: "voice", text: `The demo film's voice is not reusable: ${s.voiceExcluded}` }] : []),
      ...(s.fanFilm ? [{ kind: "fan-film", text: "The demo film is an unofficial fan film: its names, marks and characters never go into a film of ours" }] : []),
    ];
    return {
      id: `lemo-${s.slug}`, title: s.en, titleOriginal: s.cn, description: s.line, category: s.category, categoryOriginal: s.categoryCn, tags: s.uses, uses: s.uses,
      aspects: LEMO_ASPECTS, intendedUse: s.uses.join(", "), author: LEMO_AUTHOR.id, kind: "video-style", ruleSource: "Lemo-Opuscar style", rules,
      readFirst: [own.name, "lemo-opuscar"], available: rules.every((r) => r.available), look: false, hidden: false,
      dim: s.engine === "three" ? "3D" : "2D", renderer: s.engine === "2d" ? "canvas" : s.engine, needsFootage: s.needsSourceMedia,
      vnFont: !v || v.status == null || v.status === "unknown" ? null : v.status === "ok",
      vnFontNote: lacking.length ? `${lacking.join(", ")} ${lacking.length > 1 ? "have" : "has"} no Vietnamese letters: Claude asks in Prepare which face that has them to use` : null,
      preview: { image: s.styleframe ? `/media/lemo/${s.styleframe}` : null, poster: s.poster ? `/media/lemo/${s.poster}` : null, placeholder: false,
        credit: `LemoLab, CC BY 4.0: a still of the demo film "${s.film}"` },
      demo: { url: s.demoUrl, title: s.film, dur: s.dur },
      styleMd: `/api/styles/lemo-${s.slug}/style-md`,
      warnings,
      lemo: { slug: s.slug, num: s.num, lineOriginal: s.lineCn, engines: s.engines, voiceExcluded: s.voiceExcluded, fanFilm: s.fanFilm, sceneContent: s.sceneContent,
        subtitles: s.subtitles, fonts: s.fonts, vi: v, fps: lemoFps(lemo.root, s) },
      credit: { ...s.credit, url: s.credit.link }, pipeline,
    };
  });
}

const MG_PACK = "config/rules/mg-styles/SKILL.md";
/** The mg-styles-15 styles as catalog entries: the same shape as lemo's; each style its own prompt, one shared rule pack. */
function mgEntries(src, root, qc) {
  const mg = mgSource(root);
  if (!mg) return [];
  const qcRule = layerRules(src, root, qc);
  const pack = { ...moworksRule(src, root, MG_PACK, []), source: "Moworks Studio, written from mg-styles-15's README, prompts and harness (MIT)" };
  let uses = []; try { uses = JSON.parse(readFileSync(join(root, "config", "mg-pipeline.json"), "utf8")).uses ?? []; } catch { /* none */ }
  const hf = uses.map((u) => skillRef(src, u)), pipeline = readPipeline(root, "mg-pipeline.json");
  return mgStyles(root).map((s) => {
    const own = { kind: "mg-style", name: `mg-${s.slug}`, slug: s.slug, path: join(mg.root, ...s.paths.prompt.split("/")), hash: s.hash,
      available: mg.intact, ...(mg.intact ? {} : { locked: "the mg-styles-15 clone is not at the pinned commit" }), source: "mg-styles-15 (as shipped)" };
    const rules = [own, pack, ...hf, ...qcRule];
    const warnings = s.note ? [{ kind: s.slug === "19-paperclip" ? "real-creator" : "route", text: s.note }] : [];
    return {
      id: `mg-${s.slug}`, title: s.en, titleOriginal: s.cn, description: s.line || (s.film ? `Demo film: ${s.film}` : ""), category: s.category ?? MG_CATEGORY, tags: [], uses: [],
      aspects: s.aspect === "9:16" ? ["9:16", "16:9", "1:1", "4:5"] : ["16:9", "9:16", "1:1", "4:5"], intendedUse: "", author: MG_AUTHOR.id, kind: "video-style",
      // the Blender-made demo is hidden for now (a Blender connection may come later); its projects still open
      ruleSource: "mg-styles-15 style", rules, readFirst: [own.name, "mg-styles"], available: rules.every((r) => r.available), look: false, hidden: s.engine === "blender",
      dim: ["three", "blender"].includes(s.engine) ? "3D" : "2D", renderer: s.engine, needsFootage: false, vnFont: null, vnFontNote: null,
      preview: { image: s.card ? `/media/mg/${s.card}` : null, poster: s.card ? `/media/mg/${s.card}` : null, placeholder: false,
        credit: `Vincentwei1021, MIT: the demo film "${s.film}"` },
      demo: { url: s.credit.demo, title: s.film, dur: s.dur },
      styleMd: `/api/styles/mg-${s.slug}/style-md`,
      warnings,
      mg: { slug: s.slug, filmOriginal: s.filmOriginal, size: s.size, fps: s.fps, score: s.score, engines: s.engines },
      credit: { ...s.credit, url: s.credit.link }, pipeline,
    };
  });
}

const ANI_PACK = "config/rules/anidoodle/SKILL.md";
/** The medium's own frame rate, from its reference film's meta (every medium the author ships is 30 fps). */
function aniFps(skillDir, module) {
  try { const m = /\bfps:\s*(\d+)|\bFPS\s*=\s*(\d+)/.exec(readFileSync(join(skillDir, ...String(module).split("/")), "utf8")); return m ? Number(m[1] ?? m[2]) : null; } catch { return null; }
}
/** The anidoodle media as catalog entries: each medium its reference, one shared rule pack and pipeline. */
function anidoodleEntries(src, root, qc) {
  const ani = anidoodleSource(root);
  if (!ani) return [];
  const qcRule = layerRules(src, root, qc);
  const pack = { ...moworksRule(src, root, ANI_PACK, []), source: "Moworks Studio, written from anidoodle's SKILL.md, references and engine contract (Apache-2.0)" };
  let uses = []; try { uses = JSON.parse(readFileSync(join(root, "config", "anidoodle-pipeline.json"), "utf8")).uses ?? []; } catch { /* none */ }
  const hf = uses.map((u) => skillRef(src, u)), pipeline = readPipeline(root, "anidoodle-pipeline.json");
  return anidoodleMedia(root).map((s) => {
    // the card: the medium's tile of the author's style sheet, or (a house style) the last frame of its preview; the preview: the author's
    // drawing film of the medium, rendered here through HyperFrames
    const pv = aniPreview(s.id, root), card = s.card ? `/media/anidoodle/${s.card}` : pv?.poster ? `/media/anidoodle/previews/${pv.poster}` : null;
    const own = { kind: "anidoodle-style", name: `anidoodle-${s.id}`, slug: s.id, path: join(ani.skillDir, ...(s.doc ?? s.module).split("/")), hash: s.hash,
      available: ani.intact, ...(ani.intact ? {} : { locked: "the anidoodle clone is not at the pinned commit" }), source: "anidoodle (as shipped)" };
    const rules = [own, pack, ...hf, ...qcRule];
    return {
      id: `anidoodle-${s.id}`, title: s.name, titleOriginal: null, description: s.medium, category: s.category ?? ANI_CATEGORY, tags: [s.family].filter(Boolean), uses: [],
      aspects: ["16:9", "9:16", "1:1", "4:5"], intendedUse: s.hero ? `hero subject in the author's sheet: ${s.hero}` : "", author: ANI_AUTHOR.id, kind: "video-style",
      ruleSource: "anidoodle medium", rules, readFirst: [own.name, "anidoodle"], available: rules.every((r) => r.available), look: false, hidden: false,
      dim: ["lowPoly", "toyBrick", "isometric"].includes(s.id) ? "2.5D" : "2D", renderer: "canvas", needsFootage: false, vnFont: null, vnFontNote: null,
      // the 9 media whose hand draws anidoodle's people: their films take the human characters themselves
      ...(humanHandOf(`anidoodle-${s.id}`, root) ? { characters: true, characterEngine: "anidoodle-human", humanHand: humanHandOf(`anidoodle-${s.id}`, root) } : { characters: false }),
      preview: { image: card, poster: card, placeholder: !card, ...(pv?.video ? { video: `/media/anidoodle/previews/${pv.video}` } : {}),
        credit: `Alex Greenshpun (10x Company), Apache-2.0: ${s.card ? "the medium's tile of the author's style sheet" : "the last frame of the author's plate"}${pv?.video ? `; the film is the author's own drawing film (${s.drawFilm}), rendered here` : ""}` },
      demo: null, styleMd: `/api/styles/anidoodle-${s.id}/style-md`, warnings: [],
      anidoodle: { id: s.id, family: s.family, fps: aniFps(ani.skillDir, s.module), nearest: s.nearest ? `anidoodle-${s.nearest}` : null, module: s.module, drawFilm: s.drawFilm, ...(s.house ? { house: s.house } : {}) },
      credit: { ...s.credit, url: s.credit.link }, pipeline,
    };
  });
}

const BRUSH_AUTHOR = { id: "johnheibel", name: "John Heibel" }, BRUSH_PACK = "config/rules/brush-cartoon-app/SKILL.md";
/** The Brush cartoon style: ClaudeAnimationBase's ANIMATION_GUIDE.md as its rule (as shipped), the app's pack for the
 *  character layer, its own pipeline (a Character step before the storyboard). Its still is Clawd, the kit's sample character,
 *  labelled as a preview: never in a film. */
function brushEntries(src, root, qc) {
  const kit = kitSource(root);
  if (!kit) return [];
  const guide = join(kit.root, "ANIMATION_GUIDE.md"), ok = existsSync(guide) && kit.intact;
  const qcRule = layerRules(src, root, qc);
  const pack = { ...moworksRule(src, root, BRUSH_PACK, []), source: "Moworks Studio, written from ClaudeAnimationBase's guide, engine and character code (MIT)" };
  let uses = []; try { uses = JSON.parse(readFileSync(join(root, "config", "brush-pipeline.json"), "utf8")).uses ?? []; } catch { /* none */ }
  const fps = styleFpsRule(BRUSH_ID, root);          // the one reader of a style's frame rates, shared with the project service
  const own = { kind: "brush-style", name: BRUSH_ID, slug: BRUSH_ID, path: guide, hash: existsSync(guide) ? sha256(guide).slice(0, 16) : null, available: ok,
    ...(ok ? {} : { locked: "the ClaudeAnimationBase clone is not at the pinned commit" }), source: "ClaudeAnimationBase (as shipped)" };
  const rules = [own, pack, ...uses.map((u) => skillRef(src, u)), ...qcRule];
  const tree = `https://github.com/${kit.repo}/tree/${kit.commit}`;
  return [{
    id: BRUSH_ID, title: "Brush cartoon", titleOriginal: null, category: "Cartoon & Anime", tags: ["characters", "hand-painted"], uses: [],
    description: "Short hand-painted cartoons with your own characters: p5.brush watercolour and ink that boils, flat 2D key views, faces with 31 emotions that act on the beat, no text.",
    aspects: ["16:9"], intendedUse: "a short story or explainer acted by the project's own characters", author: BRUSH_AUTHOR.id, kind: "video-style",
    ruleSource: "ClaudeAnimationBase guide", rules, readFirst: [own.name, "brush-cartoon-app"], available: rules.every((r) => r.available), look: false, hidden: false,
    dim: "2D", renderer: "canvas", needsFootage: false, vnFont: null, vnFontNote: null, characters: true, characterEngine: "brush-kit", fps,          // { allowed, default }
    preview: { image: "/media/characters/clawd/poster.webp", poster: "/media/characters/clawd/poster.webp", video: "/media/characters/clawd/showreel.mp4", placeholder: false,
      // short: what the preview shows, and its credit in the standard form
      demo: true, label: "Preview: Clawd, the kit's sample character",
      credit: "Clawd · ClaudeAnimationBase (John Heibel) · MIT" },
    demo: null, styleMd: `/api/styles/${BRUSH_ID}/style-md`,
    // short; a "route" line is a note, not a warning
    warnings: [{ kind: "route", text: "16:9 only. Each film gets characters of its own." }],
    credit: { author: BRUSH_AUTHOR.name, link: tree, url: tree, commit: kit.commit, licence: "MIT (p5.js LGPL-2.1, p5.brush MIT)", made: "adapted",
      madeNote: "the kit's guide, engine, faces and emotions as shipped; the characters are each film's own, drawn by the app's character layer" },
    pipeline: readPipeline(root, "brush-pipeline.json"),
  }];
}

export const WHAT_IF_ID = "what-if";
const WI_PACK = "config/rules/what-if-style/SKILL.md";
/** The What If animation style: the author's skill as shipped (its SKILL.md and references, staged
 *  as .moworks/rules/what-if-animation/) and the app's pack, its own pipeline (config/what-if-pipeline.json: no Character step, the cast is
 *  the engine's). 1920 × 1080 only (the engine draws that world). `ready`: false until the steps are wired end to end (step 4):
 *  hidden from New project and shown as "Coming soon". */
export const WHAT_IF_READY = true;          // both demo films (no narration; ElevenLabs voice) ran end to end
function whatIfEntries(src, root, qc) {
  const wi = whatIfSource(root);
  if (!wi) return [];
  const skill = join(wi.root, "SKILL.md"), ok = existsSync(skill) && wi.intact;
  const own = { kind: "what-if-style", name: "what-if-animation", slug: WHAT_IF_ID, path: skill, hash: existsSync(skill) ? sha256(skill).slice(0, 16) : null, available: ok,
    ...(ok ? {} : { locked: "the What If animation copy is not at the pinned commit" }), source: "What If animation (as shipped)" };
  const pack = { ...moworksRule(src, root, WI_PACK, []), source: "Moworks Studio, written from What If animation's SKILL.md, references and engine (MIT)" };
  let uses = []; try { uses = JSON.parse(readFileSync(join(root, "config", "what-if-pipeline.json"), "utf8")).uses ?? []; } catch { /* none */ }
  const rules = [own, pack, ...uses.map((u) => skillRef(src, u)), ...layerRules(src, root, qc)];
  const tree = wiTreeLink(wi);
  return [{
    id: WHAT_IF_ID, title: "What If", titleOriginal: null, description: "A What If episode: one premise, seven beats, a dusk-lit stick-figure world drawn in code",
    category: "Cartoon & Anime", tags: ["episode", "stick figures"], uses: [], aspects: ["16:9"], intendedUse: "a 15-25 s What If episode on one premise",
    author: WI_AUTHOR.id, kind: "video-style", ruleSource: "What If animation skill", rules, readFirst: [own.name, "what-if-style"],
    available: rules.every((r) => r.available), look: false, hidden: !WHAT_IF_READY, ...(WHAT_IF_READY ? {} : { comingSoon: true }),
    dim: "2D", renderer: "svg", needsFootage: false, vnFont: null, vnFontNote: null, characters: true, characterEngine: "what-if",
    // the style's demo film, made by the app in this style: its title shot as the card, the film to play
    ...(wiMedia(WI_DEMO.poster, root) ? {
      preview: { image: `/media/what-if/${WI_DEMO.poster}`, poster: `/media/what-if/${WI_DEMO.poster}`, placeholder: false,
        ...(wiMedia(WI_DEMO.video, root) ? { video: `/media/what-if/${WI_DEMO.video}` } : {}), credit: WI_DEMO.credit },
      demo: wiMedia(WI_DEMO.video, root) ? { url: `/media/what-if/${WI_DEMO.video}`, title: WI_DEMO.title, dur: WI_DEMO.dur } : null,
    } : { preview: { image: null, poster: null, placeholder: true }, demo: null }), styleMd: null,
    warnings: [{ kind: "route", text: "16:9 only. The narration is your own voice-over." }],
    credit: { author: WI_AUTHOR.name, link: tree, url: tree, commit: wi.commit, licence: "MIT", made: "adapted",
      madeNote: "the engine, the cast, the rooms and the two worked episodes as shipped; the steps rewritten for the app (no Remotion, no Python, no ElevenLabs)" },
    pipeline: readPipeline(root, "what-if-pipeline.json"),
  }];
}

// The catalog in memory (the Style Gallery's first load): building it reads and hashes every rule file and asks git for each pinned
// clone's commit (about 1.5 s cold). It is kept until one of the files it was built from changes: the pins, the catalog and pipeline
// files, every rule file, HF's skills manifest, each pinned clone's .git/HEAD, the Lemo font check and the looks store (size and time
// of each, read with stat: a few ms). Callers get their own copy, so nothing they change leaks into the next answer.
let memo = null;
const stamp = (files) => files.map((f) => { try { const s = statSync(f); return `${s.size}:${s.mtimeMs}`; } catch { return "-"; } }).join("|");
function catalogFiles(root, value) {
  const pins = loadPins(root), cfg = (n) => join(root, "config", n), clone = (p) => p?.root ? join(expandEnv(p.root), ".git", "HEAD") : null;
  const skills = expandEnv(pins.hyperframes.skillsRoot ?? "");
  return [...new Set([cfg("pins.json"), cfg("styles.json"), cfg("hf-pipeline.json"), cfg("lemo-pipeline.json"), cfg("mg-pipeline.json"), cfg("anidoodle-pipeline.json"), cfg("what-if-pipeline.json"),
    join(dirname(skills), "skills-manifest.json"), join(looksRoot(root), "current.json"), viStoreFile(root), aeShipped(root), aeLocal(root),
    clone(pins.lemo), clone(pins.mgStyles), clone(pins.anidoodle), clone(pins.characterKit), (() => { const d = aniStore(root); return d ? join(d, "previews") : null; })(), ...value.styles.flatMap((s) => s.rules.map((r) => r.path))].filter(Boolean))];
}
function catalog(root) {
  if (memo?.root === root && stamp(memo.files) === memo.stamp) return memo.value;
  const value = buildCatalog(root), files = catalogFiles(root, value);
  memo = { root, files, stamp: stamp(files), value };
  return value;
}
/** Every style with its resolved rule sources, and the authors they come from (the gallery groups by author). */
export function listStyles(root = APP_ROOT) { return structuredClone(catalog(root)); }
/** The catalog built in a worker at start (worker.mjs), so the app window's first page is not held; the memo is primed with it
 *  unless a request built it meanwhile. Resolves true when primed. */
export async function warmCatalog(root = APP_ROOT) {
  const { Worker } = await import("node:worker_threads");
  const value = await new Promise((ok, no) => {
    const w = new Worker(new URL("./worker.mjs", import.meta.url), { workerData: { root }, env: process.env });
    w.once("message", (m) => (m.ok ? ok(m.value) : no(new Error(m.message))));
    w.once("error", no);
    w.once("exit", (code) => { if (code !== 0) no(new Error(`The style catalog stopped (${code})`)); });
  });
  if (memo?.root === root && stamp(memo.files) === memo.stamp) return false;
  const files = catalogFiles(root, value);
  memo = { root, files, stamp: stamp(files), value };
  return true;
}
/** The gallery's and New project's list: every style without what only a project reads (its pipeline, its rule files and their
 *  reading order: GET /api/styles/<id> has them), plus how many rule files it has. */
export function styleList(root = APP_ROOT) {
  const c = catalog(root);
  return { categories: c.categories, authors: c.authors,
    styles: c.styles.map(({ pipeline, rules, readFirst, credit, ...s }) => ({ ...structuredClone(s), ruleCount: rules?.length ?? 0,
      design: styleDesign(s), format: styleFormat(s),
      // the credit line the tiles show; the full credit (how it was made, notes) is on the style's own read
      credit: credit ? { author: credit.author, licence: credit.licence ?? null, link: credit.url ?? credit.link ?? null, url: credit.url ?? credit.link ?? null, commit: credit.commit ?? null } : null })),
    comingSoon: COMING_SOON.map((x) => structuredClone(x)) };
}

/** Styles shown but not chosen yet: What If opens when its engine is made; its character keeps the name Pip. */
export const COMING_SOON = WHAT_IF_READY ? [] : [{ id: "what-if", title: "What If", author: "FreshStack", tag: "FS", comingSoon: true,
  credit: { author: "FreshStack (kelano86)", licence: "MIT", url: "https://github.com/kelano86/what-if-animation/tree/3725a22d2d101320cae5b7d761af8d75120c4987", commit: "3725a22d2d101320cae5b7d761af8d75120c4987" } }];

/** Where a film's design comes from: "open" (the user picks a Brand Kit in
 *  New project) only for General and HyperFrames' film types; every other style follows its author's design ("author": the brief or the
 *  chat may ask for colours or fonts, Prepare lists what differs and the user confirms). */
export const DESIGN_OPEN = ["general", "hf-explainer", "hf-launch", "hf-music", "hf-data", "hf-vertical", "hf-3d", "hf-character"];
export const styleDesign = (s) => (DESIGN_OPEN.includes(s?.id) ? "open" : "author");

/** How the gallery names each author: line 1 the set ("Anidoodle", the UI adds the count), line 2 "by …", a tag. */
export const AUTHOR_DISPLAY = {
  moworks: { title: "Moworks", by: "Moworks Studio", tag: "MW" }, heygen: { title: "HyperFrames", by: "HeyGen", tag: "HF" },
  lemomo: { title: "Lemo-Opuscar", by: "Lemomo", tag: "LEMO" }, vincentwei: { title: "mg-styles-15", by: "Vincentwei1021", tag: "MG" },
  alexgreensh: { title: "Anidoodle", by: "Alex Greenshpun", tag: "ANI" }, johnheibel: { title: "Brush cartoon", by: "John Heibel", tag: "JH" },
  freshstack: { title: "What If", by: "FreshStack", tag: "FS" },
};

/** A style's output choices: { fps: { default, choices, slowAt?, slower? }, sizes: { presets, custom,
 *  locked?, aspects, author? } }. fps: the author's rate, else 30; 24 · 25 · 30 · 60 for every style but Brush (never 50 or 60);
 *  anidoodle at 60 renders about 2.5 times as long (measured: 2.0-2.5×, the checks 1.2×). sizes.presets: [{ w, h, label, own? }], the
 *  author's own size first (own: true; MG), then the style's aspects; a typed size (even numbers, the long side at most 3840) for every
 *  style but Brush, whose engine paints 1920 × 1080 only (locked; anidoodle opened after a test of 1440×1080, 1080×1350, 2160×1080). */
export const FPS = [24, 25, 30, 60];
export const MAX_SIDE = 3840;
const PRESET = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] };
export function styleFormat(s) {
  const id = String(s?.id ?? ""), rule = s?.fps?.allowed?.length ? s.fps : styleFpsRule(id);
  const ani = !!anidoodleId(id), brush = id === BRUSH_ID, wi = id === WHAT_IF_ID;
  const author = Number(s?.mg?.fps) || Number(s?.lemo?.fps) || Number(s?.anidoodle?.fps) || (rule?.default ?? null);          // anidoodle: the medium's own
  const choices = rule?.allowed?.length ? rule.allowed.map(Number) : FPS;
  const aspects = [...(s?.aspects ?? ["16:9", "9:16", "1:1", "4:5"])];
  const own = Array.isArray(s?.mg?.size) ? { w: s.mg.size[0], h: s.mg.size[1] } : null;
  const presets = aspects.filter((a) => PRESET[a]).map((a) => ({ w: PRESET[a][0], h: PRESET[a][1], label: a, ...(own && own.w === PRESET[a][0] && own.h === PRESET[a][1] ? { own: true } : {}) }));
  if (own && !presets.some((p) => p.own)) presets.unshift({ ...own, label: `${own.w}×${own.h}`, own: true });
  presets.sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0));
  return {
    fps: { default: author && choices.includes(author) ? author : choices.includes(30) ? 30 : choices[0], choices, ...(ani ? { slowAt: 60, slower: 2.5 } : {}) },
    sizes: { presets, custom: !brush && !wi, ...(brush ? { locked: true } : {}), aspects, ...(own ? { author: [own.w, own.h] } : {}) },
  };
}
export function formatOf(id, root = APP_ROOT) { const s = getStyle(id, root); return s ? styleFormat(s) : null;
}
function buildCatalog(root) {
  const cat = JSON.parse(readFileSync(join(root, "config", "styles.json"), "utf8"));
  if (cat.alive || cat.studio || cat.kinds || cat.vocab) cat.qc = { ...cat.qc, alive: cat.alive, studio: cat.studio, kinds: cat.kinds, vocab: cat.vocab };          // the studio packs travel together (layerRules)
  const src = sources(root);
  const hfRepo = src.pins.hyperframes.repo, hfCommit = src.pins.hyperframes.source?.commit ?? `v${src.pins.hyperframes.default}`;
  const own = cat.styles.map((s) => {
    const rules = resolveRules(src, s.rules, root, cat.qc);
    // a HyperFrames style's credit: the file it is built on (the film type's references/types/<type>.md, or the skill's SKILL.md) at the pinned commit
    const hfFile = s.rules.kind === "hf-skill" ? (s.rules.type ? `skills/hyperframes/references/types/${s.rules.type}.md` : `skills/${s.rules.skill}/SKILL.md`) : null;
    const credit = hfFile ? { author: HF_AUTHOR.name, link: `https://github.com/${hfRepo}/blob/${hfCommit}/${hfFile}`, commit: hfCommit, licence: "Apache-2.0", made: "as shipped",
      madeNote: "HyperFrames' skill as shipped; the app's eight steps run over its work loop (config/hf-pipeline.json)" } : null;
    return { ...s, author: s.rules.kind === "hf-skill" ? HF_AUTHOR.id : MW_AUTHOR.id, kind: "workflow", ruleSource: s.rules.kind === "hf-skill" ? "HyperFrames skill" : "Moworks Motion rules", rules,
      readFirst: s.rules.readFirst ?? null, available: rules.every((r) => r.available), preview: s.preview ?? null, pipeline: ownPipeline(root, s), ...(credit ? { credit: { ...credit, url: credit.link } } : {}) };
  });
  const lemo = lemoEntries(src, root, cat.qc), lemoPin = lemoSource(root), hfPin = src.pins.hyperframes;
  const mg = mgEntries(src, root, cat.qc), mgPin = mgSource(root);
  const ani = anidoodleEntries(src, root, cat.qc), aniPin = anidoodleSource(root);
  const brush = brushEntries(src, root, cat.qc), kitPin = kitSource(root);
  const wi = whatIfEntries(src, root, cat.qc), wiPin = whatIfSource(root);
  const styles = [...own, ...lemo, ...mg, ...ani, ...brush, ...wi];
  for (const s of styles) if (s.preview?.image) s.preview = { ...s.preview, thumb: thumbUrl(s.preview.image) };          // the gallery's tile
  // what After Effects gets of a film in the style, measured on its demo (packages/style-ae); no demo, no badge
  const ae = aeMeasured(root);
  for (const s of styles) s.ae = aeBadge(s.id, ae);
  const count = (id) => styles.filter((s) => s.author === id && !s.hidden).length;
  const hfSha = hfPin.source?.commit ?? null;
  const authors = [
    { id: MW_AUTHOR.id, name: MW_AUTHOR.name, org: "Moworks", source: "moworks-motion", repo: null, licence: "the app's own rules", kind: "workflow", engine: "HyperFrames",
      languages: ["vi", "en"], needsDownload: false, count: count("moworks") },
    { id: HF_AUTHOR.id, name: "HyperFrames", org: "HeyGen", source: HF_AUTHOR.source.toLowerCase(),
      repo: { url: `https://github.com/${hfPin.repo}/tree/${hfSha ?? `v${hfPin.default}`}`, sha: hfSha, commit: hfSha?.slice(0, 7) ?? null, version: hfPin.default },
      licence: "Apache-2.0", kind: "workflow", engine: "HyperFrames", languages: ["en"], needsDownload: false, count: count("heygen"),
      looks: { count: lookCount(root) } },
    ...(lemoPin ? [{ id: LEMO_AUTHOR.id, name: "Lemomo", org: "LemoLab", source: "lemo-opuscar",
      repo: { url: treeLink(lemoPin), sha: lemoPin.commit, commit: lemoPin.commit.slice(0, 7), date: lemoPin.date ?? null },
      licence: "MIT · demo films CC BY 4.0", licenceFull: LEMO_LICENCE, kind: "video-style", engine: "HyperFrames + lemo bridge", languages: ["en", "zh"],
      needsDownload: false, count: count("lemomo"), intact: lemoPin.intact }] : []),
    ...(mgPin ? [{ id: MG_AUTHOR.id, name: "Vincentwei1021", org: null, source: "mg-styles-15",
      repo: { url: mgTreeLink(mgPin), sha: mgPin.commit, commit: mgPin.commit.slice(0, 7), date: mgPin.date ?? null },
      licence: "MIT", kind: "video-style", engine: "HyperFrames + lemo bridge", languages: ["en", "zh"], needsDownload: false, count: count(MG_AUTHOR.id), intact: mgPin.intact }] : []),
    ...(aniPin ? [{ id: ANI_AUTHOR.id, name: "Alex Greenshpun", org: "10x Company", source: "anidoodle",
      repo: { url: aniTreeLink(aniPin), sha: aniPin.commit, commit: aniPin.commit.slice(0, 7), date: aniPin.date ?? null, version: aniPin.version ?? null },
      licence: "Apache-2.0 (NOTICE)", kind: "video-style", engine: "HyperFrames + anidoodle engine (bundled)", languages: ["en"], needsDownload: false,
      count: count(ANI_AUTHOR.id), intact: aniPin.intact }] : []),
    ...(kitPin && brush.length ? [{ id: BRUSH_AUTHOR.id, name: BRUSH_AUTHOR.name, org: null, source: "claude-animation-base",
      repo: { url: `https://github.com/${kitPin.repo}/tree/${kitPin.commit}`, sha: kitPin.commit, commit: kitPin.commit.slice(0, 7), date: kitPin.date ?? null },
      licence: "MIT · p5.js LGPL-2.1, p5.brush MIT", kind: "video-style", engine: "HyperFrames + character layer (p5.brush)", languages: ["en"], needsDownload: false,
      count: count(BRUSH_AUTHOR.id), intact: kitPin.intact }] : []),
    ...(wiPin && wi.length ? [{ id: WI_AUTHOR.id, name: WI_AUTHOR.name, org: "FreshStack", source: WI_AUTHOR.source,
      repo: { url: wiTreeLink(wiPin), sha: wiPin.commit, commit: wiPin.commit.slice(0, 7), date: wiPin.date ?? null },
      licence: "MIT · React 19 MIT (Meta)", kind: "video-style", engine: "HyperFrames + What If engine (React + SVG, bundled)", languages: ["en"], needsDownload: false,
      count: count(WI_AUTHOR.id), intact: wiPin.intact }] : []),
  ].map((a) => ({ ...a, ...(AUTHOR_DISPLAY[a.id] ?? {}), ...(a.id === "freshstack" ? { comingSoon: !WHAT_IF_READY } : {}) }));          // the gallery's own "Coming soon" goes with it
  return { categories: [...new Set([...cat.categories, ...lemo.map((s) => s.category).filter(Boolean), ...mg.map((s) => s.category), ...ani.map((s) => s.category), ...brush.map((s) => s.category), ...wi.map((s) => s.category)])], authors, styles };
}

/** A style's pipeline, cheap enough to read on every poll (no rule hashing): config/styles.json, or the Lemo-Opuscar template. */
export function stylePipeline(id, root = APP_ROOT) {
  const want = id;
  return lemoSlug(want) ? readPipeline(root, "lemo-pipeline.json") : mgSlug(want) ? readPipeline(root, "mg-pipeline.json")
    : anidoodleId(want) ? readPipeline(root, "anidoodle-pipeline.json") : want === BRUSH_ID ? readPipeline(root, "brush-pipeline.json")
    : want === WHAT_IF_ID ? readPipeline(root, "what-if-pipeline.json")
    : (() => { const s = readJsonCfg(root, "styles.json")?.styles?.find((x) => x.id === want); return s ? ownPipeline(root, s) : []; })();
}
const readJsonCfg = (root, f) => { try { return JSON.parse(readFileSync(join(root, "config", f), "utf8")); } catch { return null; } };

/** A style in full by id, or null (a style the catalog no longer has: its projects open with no style). */
export function getStyle(id, root = APP_ROOT) {
  const s = catalog(root).styles.find((x) => x.id === id);
  return s ? structuredClone(s) : null;
}

/** What a project records when a style is chosen: identity, rule source and the exact versions / hashes loaded. */
export function selection(style) {
  return { id: style.id, title: style.title, source: style.ruleSource, ...(style.author ? { author: AUTHOR_NAMES[style.author] ?? style.author } : {}),
    ...(style.credit?.commit ? { commit: style.credit.commit } : {}),
    rules: style.rules.map(({ kind, name, hash, hfVersion, role }) => ({ kind, name, hash, ...(hfVersion ? { hfVersion } : {}), ...(role ? { role } : {}) })) };
}

/** What a film style's own file forbids, as its author wrote it: each sentence with "never" in the style's first rule file (Lemo's STYLE.md,
 *  an MG prompt, What If's skill…), at most 6. Brick Toy's "Never use the LEGO name, logo or minifigure silhouette" was not
 *  checked on the storyboard's stills, and the chef got the classic yellow head. */
export function styleNevers(id, root = APP_ROOT) {
  const s = getStyle(id, root);
  const r = s?.rules?.find((x) => /-style$/.test(x.kind) && x.path);
  let t = ""; try { t = readFileSync(r.path, "utf8"); } catch { return []; }
  const out = [];
  for (const line of t.split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) continue;
    for (const sent of line.replace(/[*_`>#]/g, "").replace(/^\s*[-•\d.]+\s*/, "").split(/(?<=[.!?])\s+/)) {
      if (/\bnever\b/i.test(sent) && sent.length > 12 && !out.includes(sent.trim())) out.push(sent.trim().slice(0, 220));
    }
  }
  return out.slice(0, 6);
}

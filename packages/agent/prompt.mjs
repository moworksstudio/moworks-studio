// What Claude is told: the system prompt of a film's task and the lines it is built from, the request of each turn, and the
// languages of the replies (audit/112 2.9: these lived in agent/index.mjs beside the Agent that runs the task; moved as they were).
import { VI_MARKED_RE } from "../hf-qa/vi-letters.mjs";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { getStyle, stylePipeline } from "../style-catalog/index.mjs";
import { fontMap } from "../hf-edit/finalize.mjs";
import { filmLength } from "../hf-edit/ending.mjs";
import { frameFonts, vietnameseCheck } from "../looks-library/index.mjs";
import { viSuggest, viVerified } from "../hf-edit/googleFontsVi.mjs";
import { anidoodleId } from "../anidoodle-styles/index.mjs";
import { readCast } from "../character-kit/index.mjs";
import { status as secretsStatus } from "../secrets/index.mjs";
import { filmVietnamese } from "../voice/tts.mjs";
import { packStatus as kokoroStatus } from "../voice/kokoro.mjs";
import { PROMPT as MOTION_PLAN_PROMPT, SOUND_PROMPT as MOTION_PLAN_SOUND } from "../motion-plan/index.mjs";
import { MOWORKS_STYLE_IDS } from "../sfx/code-recipes.mjs";
import { BRIEF_MAX, inventory } from "../project-service/index.mjs";
import { limitLine } from "./output-limit.mjs";
import { kitFilesOf } from "../project-service/layout.mjs";
import { lockedPdfs } from "../project-service/scan.mjs";
import { listLocalFonts } from "../hf-edit/localFonts.mjs";
import { DOC_DIR, docPath } from "../project-service/docs.mjs";
import { briefRefusesLyrics, isLyricVideo, isSongFilm } from "../style-catalog/traits.mjs";
import { heardDraft } from "../voice/lyrics.mjs";
import { filmKind } from "./reads.mjs";
import { voiceFitText } from "./voice-fit.mjs";
import { canvasTextLine } from "./canvas-text.mjs";
import { APP_TOOLS } from "./tools.mjs";

/** Fonts are the app's job: Claude names them, the app embeds them (finalize, and before board stills). */
const FONTS_LINE = "Fonts: write the families you want in the CSS (any Google Fonts family, e.g. Be Vietnam Pro, or one the app bundles, e.g. Inter or Roboto Flex); the app downloads and embeds them (files under assets/_app/fonts, @font-face) after your task and before it takes board stills; the owner's own font files are in assets/1_design/fonts. Never ask the owner for the font files of a Google Fonts family; ask only for a commercial font the brand names. Before you name a font anywhere (BRIEF.md, docs/ASSETS.md, design.md, a board, the film), call the app's font_check with it (Test 10 #435). A font that fails (no Vietnamese letters, or the app cannot get it): when the owner's material asks for it (the brief, a guideline, their pictures or captions), that is a conflict: stop and ask (moworks-studio §2b) with 2-3 Vietnamese fonts the app can use, the nearest first; your own choice: choose one that passes.";
/** three.js is the app's job too: pinned in config/pins.json, copied and mapped by finalize R-THREE; the film may not go online. */
const THREE_LINE = "three.js (for a real 3D scene, when the brief or the design needs one; DOM / CSS / GSAP stays the default because it reaches After Effects as layers, a WebGL canvas only as a picture: say so to the owner at the storyboard). When the owner asks for 3D (a 3D scene, a temple, a product, a camera flying through), never say the app cannot do it: offer three.js as one of the choices, a 3D scene built by code (shapes, materials, lights, a moving camera), in the film style's colours, not photoreal like a 3D render or a photo, and in After Effects one picture, not layers (owner 04/11: \"cannot build real 3D\" was said to a user). r184 is on this computer and the app copies it into the film and writes the import map after your task and before board stills. Import `three` and its addons by bare name, `import * as THREE from \"three\"` and `\"three/addons/<folder>/<File>.js\"`, never a CDN URL, even when a HyperFrames skill or lint hint shows one (the film is offline). Addons there: postprocessing EffectComposer, RenderPass, ShaderPass, MaskPass, UnrealBloomPass, OutputPass, FilmPass, BokehPass; shaders RGBShiftShader, VignetteShader, FilmShader, CopyShader, LuminosityHighPassShader, OutputShader, BokehShader; geometries RoundedBoxGeometry, TextGeometry; loaders GLTFLoader, FontLoader; environments RoomEnvironment; utils BufferGeometryUtils, SkeletonUtils. Ask the owner before any other addon. Follow HyperFrames' references/runtimes.md (Three.js, WebGPU, p5, canvas): draw every frame from HyperFrames time (the hf-seek event / window.__hfThreeTime, or one paused GSAP timeline), never requestAnimationFrame, Date.now() or a clock; anything that falls or flies is computed from t, every random value seeded, film grain seeded from t; data-duration on the root; renderer.setPixelRatio(1) at the film's size; set window.THREE = THREE when a loader fetches files; register window.__hf.buildReady for fonts, canvas textures and shader warm-up.";
/** The project's folders (packages/project-service/layout.mjs). */
const FOLDERS_LINE = "assets/ folders: 1_design/ (the owner's design files: PSD, PPTX, PDF, guidelines; the film does not play them) with 1_design/images/ (every picture and logo) and 1_design/fonts/; 2_footage/ (video; a numbered picture sequence in 2_footage/<name>/); 3_audio/voiceover/, 3_audio/sfx/, 3_audio/music/; _app/ holds the app's own copies (GSAP, three.js, runtime, embedded fonts): link to them, never edit them. Put a new file in its folder; a file anywhere else is moved there after your task.";
// named in full: the steps and rules write the short name ("call library_search"), and Claude called it bare, "No such tool available",
// up to 8 times a Motion Plan (QC hf214 films)
const toolsLine = (names) => names.length ? `The app's tools (MCP server mw), use them instead of asking the owner for pictures. Call each by its full name, mcp__mw__<name>: the steps and rules write only the short name ("call library_search" means mcp__mw__library_search). ${names.map((n) => `mcp__mw__${n} (${APP_TOOLS[n].description.split(". ")[0].toLowerCase()})`).join("; ")}.` : "";
/** How Claude uses what the user imported (General style), in the words Claude reads. */
const INPUT_MODE = {
  auto: "Choose yourself how to use the imported files and say which way you took.",
  keep: "Keep the design the owner gave (their frames, PSD or slides): animate it as it is; do not change the layout.",
  relayout: "Re-lay out the design the owner gave to fit this format and brief; keep its look and content.",
  free: "Design freely; the imported files are material (logos, pictures, text), not a layout to follow.",
  reference: "Follow the reference video or pictures for look and pacing; make it this brief's own film.",
  remake: "Remake the reference 1:1, as close as the tools allow (the owner accepted that this costs more time).",
};
const kb = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
export function inputsBlock(dir) {
  const inv = inventory(dir);
  if (!inv.total) return "Imported files: none yet.";
  const parts = Object.entries(inv.assets).map(([k, xs]) => `assets/${k}/: ${xs.slice(0, 12).map((x) => x.path.split("/").pop()).join(", ")}${xs.length > 12 ? ` (+${xs.length - 12})` : ""}`);
  if (inv.sources.length) parts.push(`sources/ (reference files the film does not play; read images and text; PDF, PSD, PSB, AI and PPTX are read through the app's scan, never ask for an export): ${inv.sources.slice(0, 12).map((x) => `${x.path.split("/").pop()} (${kb(x.size)})`).join(", ")}`);
  const scan = existsSync(join(dir, ".moworks", "scan", "INDEX.md")) ? " The app scanned them for you (video contact sheets, lengths, sizes, every page of a PDF): .moworks/scan/INDEX.md." : "";
  const locked = lockedPdfs(dir).map((p) => p.split("/").pop());
  const lockedLine = locked.length ? ` With a password, so none of their pages reached you: ${locked.join(", ")}. Unless the chat or docs/NOTES.md already has the owner's answer, name them to the owner now and stop as moworks-studio §2b says.` : "";
  return `Imported files (copied into this project): ${parts.join("; ")}.${scan}${lockedLine}`;
}
/** One line of what a rule file is for: its frontmatter's description, cut at the first sentence (the names and purposes are
 *  given, the files are opened when a step needs them). */
export function rulePurpose(dir, rel) {
  try {
    const head = readFileSync(join(dir, ...rel.split("/")), "utf8").slice(0, 3000);
    const d = /^description:\s*(.+)$/m.exec(head)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
    const one = d.split(/(?<=[a-z0-9)])\.\s|\s-\s/i)[0].trim();
    return one.length > 160 ? `${one.slice(0, 157)}…` : one;
  } catch { return ""; }
}
/** Which rule files Claude reads when (after HF's own loading: an entry SKILL.md, mandatory reads per stage, the rest on demand):
 *  the files this step requires (reads.mjs; checked before the first edit), read in the first turn; every other rule file listed with its
 *  purpose and opened only when the work needs it, through each SKILL.md's own routing; the QC review only in its step. */
function rulesLine(rules, first = [], qc = [], dir = null, required = []) {
  const must = required.length ? required : first;
  const rest = rules.filter((r) => !must.includes(r));
  const named = (xs) => xs.map((r) => { const p = dir ? rulePurpose(dir, r) : ""; return p ? `${r} (${p})` : r; }).join("; ");
  return [
    must.length ? `Required for this task, read them all in your first turn, in one batch (the app checks them before your first edit; do not replace them with recollection): ${must.join(", ")}. Every other rule file, opened only when the work needs it (follow each SKILL.md's own "read X when Y" routing): ${named(rest)}.`
      : rules.length ? `The style's rule files, each with what it is for; open only what the current step needs, and the files they link only when you need them: ${named(rules)}.` : "",
    qc.length ? `The Moworks QC rules (${qc.join(", ")}) are read only in the pipeline's Review step or when the owner asks you to review the film; it never changes how this style designs or builds.` : "",
  ].filter(Boolean).join("\n");
}
/** The text files a step reads or writes (each step is a fresh conversation: these carry the work across): HyperFrames' at the root,
 *  the app's documents in docs/ (docs.mjs). */
const STEP_FILES = /^(BRIEF|STORY|SCRIPT|NOTES|ASSETS|STORYBOARD|STYLE-GUIDE|SHOTS|QC-REVIEW|CHARACTERS|DESIGN|VOICEOVER|SPEC|BEATMAP|RESEARCH)\.md$|^(frame|design)\.md$|^(MOTION-PLAN|QC-REVIEW|CHARACTERS)\.json$/;
function projectFiles(dir) {
  const list = (rel) => { try { return readdirSync(join(dir, rel)).filter((n) => STEP_FILES.test(n)).map((n) => (rel ? `${rel}/${n}` : n)).sort(); } catch { return []; } };
  return [...list(""), ...list(DOC_DIR)];
}
/** What Claude may do, in words, for the task's mode and the project's web setting. */
function powersLine(settings) {
  if (settings.mode === "bypassPermissions") return "What you can do: this project runs in the owner's Bypass experiment: you may run commands, but keep every change inside this project folder.";
  const web = settings.web === "off" ? "You cannot use the web in this project."
    : `You may use WebFetch and WebSearch when the work needs it (research for the content, the client's website, a pull request)${settings.web === "ask" ? "; the owner is asked first and may say no: then go on without it (mixkit.co for the music is allowed without asking: fetch its pages, or search with site:mixkit.co)" : ""}.`;
  // the web is for Claude's research; the film itself renders offline (G-REMOTE), which is a rule of the film, not of Claude
  const offline = "The film itself renders offline: everything a composition loads (scripts, libraries, fonts, pictures, sound) must be a file inside the project, never a CDN or web URL. When this matters, say it that way (\"phim phải mang thư viện của nó bên trong project\"), never that you cannot use the web.";
  return `What you can do: read and edit files in this folder only. You cannot run commands or install anything. ${web} ${offline}`;
}
/** The Brand Kit's fonts as the app can serve them: [{ family, available, vi }] from the project's frame.md;
 *  available: bundled, on Google Fonts or a font file in the project's assets; vi: true | false | null (not known). null without one. */
export async function brandKitFonts(dir, { google } = {}) {
  let text = ""; try { text = readFileSync(join(dir, "frame.md"), "utf8"); } catch { return null; }
  const fams = frameFonts(text);
  if (!fams.length) return null;
  return checkFonts(dir, fams, { google });
}
/** Any fonts as the app can serve them in this project (Prepare once chose a font the film could not draw in Vietnamese, and
 *  only the checks an hour later said so): { families: [{ family, available, vi }] }, as brandKitFonts. */
export async function checkFonts(dir, fams, { google } = {}) {
  const files = [];
  const walk = (x, depth) => { if (depth > 4) return; for (const n of (() => { try { return readdirSync(x); } catch { return []; } })()) {
    const p = join(x, n); if (/\.(ttf|otf|woff2?)$/i.test(n)) files.push(n.toLowerCase().replace(/[^a-z0-9]/g, "")); else if (!/\./.test(n)) walk(p, depth + 1); } };
  walk(join(dir, "assets"), 0);
  // the film's own font files (a Brand Kit's, the owner's) answer for themselves, by the family name inside the file
  let own = []; try { own = listLocalFonts({ dir: join(dir, "assets", "1_design", "fonts") }); } catch { /* no fontkit: by file name only */ }
  const vc = await vietnameseCheck(fams, { ...(google ? { google } : {}), own });
  return { families: vc.families.map((f) => {
    const own = files.some((n) => n.includes(f.family.toLowerCase().replace(/[^a-z0-9]/g, "")));
    // a family of the pinned list that was downloaded before: its letters were checked then (Google's "vietnamese" subset is not all of them)
    const v = viVerified(f.family), lacks = v?.missing ? v.missing : null;
    return { family: f.family, available: f.via !== "not on Google Fonts" || own, vi: lacks ? false : f.vi ?? null, ...(lacks ? { missing: lacks } : {}) };
  }) };
}
/** The film's design. New project's Brand Kit field is "From brief" unless the user chose one there. A chosen Brand Kit wins for its
 *  parts (colours, type, layout) and the brief's design words for them are left aside (a brief that asks otherwise is a conflict: Claude
 *  stops and asks); the rest follows what the brief describes, or is Claude's to design when the brief says nothing. The chosen Brand Kit
 *  is written by the app into frame.md. */
export function designLines(meta, dir, brandFonts = null) {
  const has = (f) => !!dir && existsSync(join(dir, f));
  if (meta.designLocked) {
    const kit = meta.brandKitAsk?.id ? meta.brandKitAsk : null;
    return [`Design: the style's author's own (its rules set the colours, type and layout); ${kit ? "no Brand Kit is applied to it" : "no Brand Kit is chosen for it"}. Brand colours, fonts or a look the brief or the chat asks for that differ from the author's are a conflict: stop, list each point with its choices and wait for the owner (moworks-studio §2b), then follow what they chose; apply a Brand Kit only when the owner asks, saying first what it changes.`,
      // T25: the Brand Kit picked in New project was dropped without a word; it is kept for Prepare to ask about
      ...(kit ? [`In New project the owner also chose the Brand Kit ${kit.title ? `"${kit.title}"` : kit.id}; this film style keeps its author's design, so the app did not apply it${kit.file && has(kit.file) ? ` (its design spec, a reference only: ${kit.file}; never copy it to frame.md)` : ""}. In Prepare, ask how to use it, as one numbered point with the step's other conflicts and gaps (moworks-studio §2b): name what in it differs from the author's design (colours, fonts, logo), then offer keep the author's design and leave the Brand Kit aside · its colours and fonts in the author's hand · only its logo (and end card), your suggestion first; wait, then follow what the owner chose and write it in docs/ASSETS.md.`] : []),
      ...(kit?.files ? [`That Brand Kit's own files wait beside its spec, already in this project: ${[kit.files.logos?.length ? `logos ${kit.files.logos.map((x) => x.split("/").pop()).join(", ")} in .moworks/brand-kit/logos/` : "", kit.files.fonts?.length ? `fonts ${kit.files.fonts.map((f) => f.family).join(", ")} in .moworks/brand-kit/fonts/` : "", kit.files.guideline ? `its guideline, listed in ${kit.files.guideline}` : ""].filter(Boolean).join("; ")}. If the owner chooses to use them, copy_to_assets brings a file into the film; never ask the owner to add them.`] : [])];
  }
  const look = meta.look?.id ? meta.look : null;
  const hint = "HyperFrames' frame presets are there as hints, as its references/look.md says (\"Presets\")";
  if (!look) return [`Design: from the brief (no Brand Kit chosen): follow the design the brief describes (colours, type, look and feel, motion); what it leaves open is yours to design (${hint}). A brand guideline in the assets is followed (suggest the owner save it as a Brand Kit in the app).`];
  const lines = [];
  lines.push(look.frame && has("frame.md")
    ? `Brand Kit chosen by the owner: ${look.title}: the film's colours, type and layout. The app wrote it to frame.md (HyperFrames' design spec): read it and design to it; never write or change frame.md. A brand guideline in the assets that differs from it is a conflict: stop and ask (moworks-studio §2b).`
    : `Brand Kit chosen by the owner: ${look.title} (HyperFrames look ${look.id}; its files are in .moworks/library/looks/): the film's colours, type and layout. A brand guideline in the assets that differs from it is a conflict: stop and ask (moworks-studio §2b).`);
  // what the app copied in from the Brand Kit: the film's own files, told apart from what the owner imports (never "files the owner just added")
  const kitFiles = dir ? kitFilesOf(dir) : null;
  if (kitFiles?.logos?.length || kitFiles?.fonts?.length) {
    const folder = kitFiles.logos?.[0]?.split("/").slice(0, -1).join("/");
    lines.push(`The Brand Kit's own files are already in this film, put there by the app when the film was made (not files the owner added, nothing to ask for): ${[
      kitFiles.logos?.length ? `logos and pictures in ${folder}/: ${kitFiles.logos.slice(0, 40).map((x) => x.split("/").pop()).join(", ")}${kitFiles.logos.length > 40 ? ` (+${kitFiles.logos.length - 40})` : ""}; use these files, as frame.md's logo rules say, never redraw a logo` : "",
      kitFiles.fonts?.length ? `fonts, declared in index.html and ready by their family names: ${kitFiles.fonts.map((f) => f.family).join(", ")}` : ""].filter(Boolean).join("; ")}.`);
  }
  if (kitFiles?.guideline) lines.push(`The guideline behind the Brand Kit is in this film too (${kitFiles.guideline} lists it; not files the owner added): where frame.md points to a page or does not answer, open that page; never guess a brand rule. frame.md's "Guideline checklist" is checked rule by rule (moworks-studio §2d).`);
  // a Brand Kit value is never changed silently: a font with no Vietnamese letters, a font the app lacks or a colour asked to change is a
  // stop, because a brand guideline matters and Claude asks before changing it
  lines.push(`A Brand Kit value (a font, a colour) is never changed by you: a Brand Kit font that cannot draw the Vietnamese letters the film writes or that the app does not have, and a Brand Kit colour the brief, a guideline or the chat asks to change, are conflicts: stop and ask (moworks-studio §2b). For a font, offer 2-3 fonts that draw Vietnamese and the app can use, the nearest first, each with a short reason (bundled with the app: ${Object.keys(fontMap()).join(", ")}; or a Google Fonts family with Vietnamese), plus "upload the font file" when the app does not have it, plus "keep it and accept the missing accents" only when the font exists.`);
  const bad = (brandFonts?.families ?? []).filter((f) => !f.available || f.vi === false);
  if (bad.length) lines.push(`The app checked the Brand Kit's fonts: ${bad.map((f) => `${f.family}: ${!f.available ? "the app does not have it (no file in the project, not on Google Fonts)" : "it has no Vietnamese letters"}`).join("; ")}. Stop in Prepare with those choices before the storyboard. Nearest that draw Vietnamese, from the app's list of Google Fonts (each downloads when the film uses it): ${bad.map((f) => `for ${f.family}: ${viSuggest(f.family).map((x) => x.line).join("; ")}`).join(" | ")}.`);
  // the motion, which the Brand Kit does not set, follows the brief
  lines.push(`What the owner chose wins for its parts: leave the brief's design words for those parts aside (a brief that asks otherwise for one of them is a conflict: stop and ask, moworks-studio §2b). The rest (motion) comes from the brief: follow what it describes; what it leaves open is yours to design (${hint}).`);
  return lines;
}
/** Pictures in the scene and actors: what Prepare checks in the brief, and what this style can do
 *  with an actor: its own character engine (Brush; anidoodle: people in its human-hand media, animals and things in all of them), a
 *  character drawn again in the film's design (with a word that it is redrawn), or, in Evidence Films and Edit & Documentary, none. */
export const NO_REDRAW = ["Evidence Films", "Edit & Documentary"];
export function actorsLine(meta) {
  const id = String(meta?.style?.id ?? "");
  if (!id) return "";
  let s = null; try { s = getStyle(id); } catch { /* the style's words only */ }
  const engine = id === "brush-cartoon" || !!anidoodleId(id) || !!s?.characters;
  // the step that makes a new cast: Brush and every anidoodle medium have it; What If draws its cast on its own rig and has none. The
  // reply never promises a step the film does not have (Test 21: "you will approve the three characters", and no step came)
  let castStep = false; try { castStep = stylePipeline(id).some((x) => x.id === "character"); } catch { /* none */ }
  const how = engine && castStep
    ? "this style has its own character engine. When the brief has actors and none of them is in this film yet (docs/CHARACTERS.json, the characters the owner picked in New project), ask one question with three choices and stop: 1) pick them from the owner's library (the Characters page), 2) you make them with the Character creator, 3) go on without them (they appear as pictures in the scene). A character from the library used in its own author's style is never redrawn and never asked about again (#406). A new character is shown for approval only once its checks pass, and is approved once. When the owner chose that you make them, end Prepare by writing docs/CHARACTERS.json as {\"characters\": [ … ]} (that object, never a bare list: the app finds the cast there), one entry per new actor ({ \"id\", \"name\", \"about\", \"kind\": \"human\" | \"animal\" | \"thing\" }) plus the owner's library picks already in it: the app's Character step then makes them and the owner approves them once, before the Storyboard. Never make a character in the Storyboard or the Build (Test 11 #447)."
      // the anidoodle-human value names anidoodle's engine for every actor; an animal's gate is its own rig
      + (anidoodleId(id) ? " The Character step completes each entry. A person: no rig, its check \"check-<id>.ts\". An animal or a thing on anidoodle's engine: { id, name, about, engine: \"anidoodle-human\" (the app's name for anidoodle's engine, people and animals alike), kind: \"animal\" or \"thing\", rig: \"<id>\", import: \"./characters/<id>\", check: \"characters/<id>/check.ts\", hand }; its gate checks its own rig (bone lengths, its own joint ranges, planted feet), never the human limits." : "")
    : engine
      ? "this style draws its cast on its own rig, as its rules say, and has no Character step: a new actor is made on that rig with the film and is first seen on the storyboard, which the owner approves. Say so in one line; never promise a Character step or a separate approval of the characters."
    : NO_REDRAW.includes(s?.category)
      ? `this style's category (${s.category}) never redraws a character: an actor appears only from a real picture or footage the owner gave, else as a picture in the scene; say so in one line.`
      : "this style has no character engine: an actor is drawn again in the film's own design (from the owner's saved character when there is one), and your reply says once that it is redrawn in this style, not the original.";
  return `Pictures and actors (Prepare): sort the brief's people, animals and things into two kinds. Pictures in the scene (an object, a crowd, a figure that does not act) never stop the film: draw them in the style. Actors (a character who acts, speaks or is followed through the film): ${how} Never drop a character silently: when one cannot be an actor, say in one line in docs/ASSETS.md and in your reply how it appears instead.`;
}
/** The voices that can read this film's script here: a service with its key saved, and the free voice when it is installed and the film is
 *  not in Vietnamese (Kokoro has no Vietnamese voice: never named for such a film). */
function voiceServices(meta, root) {
  const out = [];
  try { for (const [k, v] of Object.entries(secretsStatus(root))) if (v.saved) out.push(k === "elevenlabs" ? "ElevenLabs" : k); } catch { /* none */ }
  try { if (!filmVietnamese(meta) && kokoroStatus(root).installed) out.push("Kokoro"); } catch { /* not there */ }
  return out;
}
/** A What If film's narration as the app has it: a voice-over in the project, and whether a voice service can read the script. */
export function narrationLine(meta, root = APP_ROOT) {
  const keys = voiceServices(meta, root);
  return `Narration (the app says): ${meta.voice?.file ? "a voice-over is in the project" : "no voice-over in the project yet"}; ${keys.length ? `a voice service can read the script (${keys.join(", ")})` : "no voice service is set up"}.`;
}
/** The characters already in the film: the user's saved ones come with their sheets; Claude uses them and never asks. */
function castLine(dir) {
  // saved characters given to a film without a character layer, as a reference to draw in the film's own design
  const refDir = dir ? join(dir, "assets", "_app", "characters") : null;
  const refs = refDir && existsSync(refDir) ? readdirSync(refDir).filter((n) => existsSync(join(refDir, n, "CHARACTER.md"))) : [];
  const refLine = refs.length ? `The owner's saved characters for this film, as a reference: ${refs.map((n) => `assets/_app/characters/${n}/ (CHARACTER.md, poster and sheets)`).join("; ")}. Read each CHARACTER.md and look at its pictures, then draw the character in this film's own design (its Brand Kit, type, colours and motion), keeping its silhouette, distinguishing features and key colours. They are already here: never ask the owner to add them from the library.` : "";
  if (!dir || !existsSync(docPath(dir, "CHARACTERS.json"))) return refLine;
  let list = []; try { list = readCast(dir).characters ?? []; } catch { return ""; }
  if (!list.length) return "";
  const from = list.filter((c) => c.from?.library);
  return `Characters already in this film (docs/CHARACTERS.json): ${list.map((c) => `${c.name ?? c.id}${c.from?.library ? " (from the owner's library)" : ""}`).join(", ")}.`
    + (from.length ? " Use the ones from the owner's library as they are (their definitions and sheets stand): never ask whether to add, redraw or replace them; design only the characters the brief adds." : "")
    // the author's rigged characters (Bit, the cheetah) come with their own rig, not the human engine
    + (list.some((c) => c.rig && c.made === "as shipped") ? ` anidoodle's own rigged characters, as shipped: ${list.filter((c) => c.rig && c.made === "as shipped").map((c) => `${c.name ?? c.id} (rig ${c.rig}, import from ${c.import})`).join(", ")}. Pose them only through their own rig, never by hand; the cheetah's marks are this film's medium (her own painted look only when the owner asks), Bit keeps his own; a model sheet is anidoodle/films/sheet-<id>.ts with the rig's key poses (the anidoodle pack, §3e).` : "")
    // an animal or a thing made for the film is on a rig of its own and checked by its own gate, never as a person
    + (list.some((c) => c.rig && c.made !== "as shipped") ? ` Characters on a rig of their own, made for this film (not people): ${list.filter((c) => c.rig && c.made !== "as shipped").map((c) => `${c.name ?? c.id} (import from ${c.import ?? `./characters/${c.id}`}${c.check ? `, its gate anidoodle/${String(c.check).replace(/^anidoodle\//, "")}` : ", NO GATE YET"})`).join(", ")}. Pose them only through their rig; their gate checks that rig's own rules (bone lengths, its own joint ranges, planted feet), never the human limits (the anidoodle pack, §3e3).` : "")
    + (list.some((c) => c.engine === "anidoodle-human" && !c.rig) ? ` Human characters on anidoodle's human engine: ${list.filter((c) => c.engine === "anidoodle-human" && !c.rig).map((c) => `${c.name ?? c.id} (import from ${c.import ?? c.module ?? `./characters/${c.id}`}${c.check ? `, its gate anidoodle/${c.check}` : ""}${c.needsPalette ? `; it has no palette for this film's hand${c.filmHand ? ` (${c.filmHand})` : ""}: add one in the film's copy, from its palette roles` : ""})`).join(", ")}. Pose them as the author's recipe says (references/workflows/character-consistency.md): toScene(pose, camera) with poses from the character's own library kept inside its joint limits, walks from footsteps (planWalk / walkAt), its palette for this film's hand; never redraw them by hand. Run the app's character_gate tool after changing a character: Build starts only when every gate passes.` : "");
}
/** The user's language: their last chat message, else the ones before, else their brief; Vietnamese letters → "vi", a
 *  sentence of English (3 words or more) → "en"; a short word with no accent ("ok", "B", "yes", "1") decides nothing (a reply
 *  of that kind once turned a Vietnamese chat to English), so the earlier messages and the brief do; none → "vi". */
export function ownerLanguage(texts) {
  for (const x of texts) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    if (VI_MARKED_RE.test(t)) return "vi";
    if ((t.match(/[a-z]{2,}/gi) ?? []).length >= 3) return "en";
  }
  return "vi";
}
/** A task's reply language: the user's chat message, else their last chat message, else their brief. The words they typed (`shown`,
 *  not the notes the app wraps them in), never a step's prompt or a task the app itself sent in English (`by` "app": a fix after the
 *  characters' gate or the compiler, the brief changed, the voice's words corrected), which once turned the next steps English. */
// the app's own prefilled requests, in English (Tech checks' "Fix with Claude", the Render's "Ask Claude to fix"): sent as they are, they are not
// the owner's language (T40-16, T38b-19: Claude answered a Vietnamese film's owner in English)
const APP_PREFILL = /^\s*(Fix this check finding|The render is blocked\. Fix only these issues)/;
export function taskLanguage({ step = null, by = null, text = "", shown = null, earlier = [], brief = null }) {
  const own = (s) => (s != null && APP_PREFILL.test(String(s)) ? null : s);
  return ownerLanguage([(step || by === "app") ? null : own(shown ?? text), ...earlier.filter((x) => !x.step && x.by !== "app").map((x) => own(x.shown ?? x.text)).reverse(), brief]);
}
/** The language of Claude's words to the owner, said again where Claude writes them: at the end of every request and after each of the
 *  app's tools. The system prompt says it too, but after a long run of English (the rules, the code, the app's tools' answers) a step's
 *  notes and report came in English: the Build of Test 27 wrote "I've built the full 75 s film…" in a Vietnamese film whose every earlier
 *  step had answered in Vietnamese, its notes English from the first pose check on (T27-8). */
export function replyLanguage(lang) {
  return lang === "en"
    ? "Write to the owner in English: every note between your tool calls and your report at the end."
    : "Write to the owner in Vietnamese: every note between your tool calls and your report at the end, every sentence (the app's words, the rules and the tools' answers are in English; yours to the owner are not).";
}
/** The reminder after an app tool's answer (Vietnamese only: an English answer pulls the words that follow it into English). */
export const toolReminder = (lang) => (lang === "en" ? "" : "(Your words to the owner stay in Vietnamese, the report at the end too.)");
/** A task's request: the target, the Motion Library item, the pipeline, what is new, what came just before, the request itself, and
 *  the language of the replies last. */
/** The line about characters the owner picked from the library with a message or a storyboard note (owner #1319 2b): the app has put them
 *  in the film's cast; Claude puts them in as the owner's words say, and asks only what those words leave open. "" with none. */
export function pickedCastLine(chars) {
  const list = (Array.isArray(chars) ? chars : []).filter((c) => c && c.id);
  if (!list.length) return "";
  return `\nCharacters the owner picked from the library for this: ${list.map((c) => `"${String(c.name ?? c.id).slice(0, 60)}" (${c.id}${c.file ? `, ${c.file}` : ", a reference to draw in this film's style"})`).join(", ")}; the app has put them in the film's cast (CHARACTERS.json). `
    + "Put them in as the owner's words say, drawn the way this film style's rules say for characters from the library. If the words leave open something you need (where they appear, which shot or panel, what they do), ask that one thing in one short question and build nothing until the owner answers; never ask what the words already say.";
}
export function taskRequest({ target = "", motion = "", pipeline = "", news = "", before = "", msg, lang = "vi" }) {
  return `${target}${motion}${pipeline ? `\n\n${pipeline}` : ""}${news ? `\n${news}` : ""}${before ? `\n\n${before}` : ""}\n\nRequest:\n${msg}\n\n${replyLanguage(lang)}`;
}
/** The film's length as Claude is told it (house rules §9): the content New project set, and the ending's fade after it or inside it. */
export function lengthLine(meta, dir = null) {
  const L = filmLength(meta, { dir });
  if (!L.content) return "? s";
  if (L.own) return `${L.content} s, the style author's own ending inside it (house rules §9: docs/MOTION-PLAN.json names it in ending.author and the last shot plays it, its row marked "ending": true; nothing added after it; the root's data-duration is ${L.total} s)`;
  if (L.inside) return `${L.content} s exactly, the ending's ${L.fade} s fade inside it (the brief asks for no more: docs/MOTION-PLAN.json's ending.inside; the root's data-duration is ${L.total} s)`;
  // an author's ending the plan only claims (T24-12: the picture stayed lit to its last frame and cut) is the house fade
  const why = { style: "the film's style has no ending of its own", unnamed: "it names no ending of the author's (ending.author)", lastShot: "no row of its last shot plays it (\"ending\": true)" }[L.why];
  const claimed = L.asked === "author" ? `docs/MOTION-PLAN.json's ending says "author" but ${why}, so the film ends with the house fade: the picture fades out with the music. ` : "";
  return `${claimed}${L.content} s of content, then the ending's ${L.fade} s fade after it (house rules §9): the whole film, the root's data-duration, the storyboard's frames and the plan's shots add up to ${L.total} s. Only a brief that asks for exactly or at most ${L.content} s puts the fade inside it (docs/MOTION-PLAN.json's ending.inside: true)`;
}
export function systemPrompt({ meta, style, rules, first = [], qc = [], shots, dir, step = null, lang = "vi", motionSpec = true, settings = { mode: "auto", web: "off" }, tools = [], required = [], brandFonts = null }) {
  const f = meta.format ?? {};
  // the film's style as the catalog has it (prepareRules' style; looked up when not given): a style id the catalog does not have is
  // a film with no style, so its name is not printed and no author's design is claimed for it
  const known = style !== undefined ? style : (() => { try { return meta.style?.id ? getStyle(meta.style.id) : null; } catch { return null; } })();
  const styleTitle = known ? meta.style?.title : null;
  return [
    "You are the production brain of Moworks Studio, a local motion graphics studio app. The working folder is one HyperFrames project:",
    "index.html (root composition), compositions/*.html (one sub-composition per shot), STORYBOARD.md (HyperFrames storyboard format), assets/.",
    `Project: "${meta.title ?? ""}". Format ${f.width ?? "?"}x${f.height ?? "?"} (${f.aspect ?? "?"}), ${f.fps ?? 30} fps (the root composition's data-fps="${f.fps ?? 30}" says so: keep it; frame-based timings are counted at this rate), target length ${lengthLine(meta, dir)}.`,
    // the New project fields win over the brief, and Claude clarifies with the user when a field contradicts it
    "The New project fields win over the brief: this format, rate and length, and the Brand Kit below. When the brief says otherwise for one of them (e.g. 16:9 or 60 fps against 9:16 and 30 fps here, another length, another brand's colours against the chosen Brand Kit), that is a conflict (moworks-studio §2b, owner 26/10): in one message, one numbered point per conflict with its choices as a bullet list under it (keep the New project field, follow the brief, a mix where it fits; your suggestion first), with every other conflict and missing thing of the step, then stop without writing BRIEF.md. When the owner picks the brief for the format, rate or length, call the app's project_format tool with the new values, then go on; for a design part, follow what they chose and write it in docs/ASSETS.md. No conflict: the fields, with no question.",
    // the frame first (Style, then the design chosen), then the brief that goes into it
    known ? `Style: ${meta.style.title} (${meta.style.source}).` : "No style chosen.",
    ...designLines(known || !meta.style ? meta : { ...meta, designLocked: undefined }, dir, brandFonts),
    castLine(dir),
    !step || ["brief", "character"].includes(step) ? actorsLine(meta) : "",
    meta.style?.id === "what-if" && (!step || step === "brief") ? narrationLine(meta) : "",
    !step || step === "brief" ? voiceLine(meta) : "",          // making the voice here comes first when a key is saved
    VOICE_SETTINGS_RULE,
    (!step || step === "brief") ? linksLine(meta) : "",
    step === "sound" ? musicLine(meta) : "",          // the style's own music palette and the story's arc
    !step || ["brief", "storyboard", "motionSpec"].includes(step) ? lyricsLine(dir) : "",          // lyrics are timed by the app, never placed by guess
    lyricVideoLine(meta, dir, step),          // a lyrics video: what it is held to, and the song's data
    dir && isSongFilm(meta, { dir }) ? "This film is made for its song, and the song is what is heard: write `- sfx: none` and `- ambience: none` on every frame and `\"sound\": \"none\"` on every motion. The app places no sound effects and no ambience here. If the owner asks for some, call sfx_prefs with `on` first (house rules §7b)." : "",
    researchLine(meta, dir, step),          // a product's features from the web: only after the owner's yes
    // the owner put another voice in after Version 1 (owner #920): the Review says where the picture is off it, and re-times nothing by itself
    step === "qcReview" && meta.voice?.replaced?.afterVersion1 ? `The owner replaced the voice-over after Version 1 (${String(meta.voice.replaced.from ?? "").split("/").pop()} became ${String(meta.voice.file ?? "").split("/").pop()}): the picture was timed to the old voice. In this Review, look for shots, words on screen and moves that are now off the new voice (Tech checks' G-SYNC measures the moves against its words) and say each one in docs/QC-REVIEW.md in one line, with its shot and time. Do not re-time the film for it unless the owner asks.` : "",
    // a chat fix on a built film was once never looked at, and the user was told to render again though the app had
    // already bundled the change and made the film's render again
    !step && (meta.pipeline?.finished || meta.pipeline?.ran?.build) ? "A change you make to the built film in the chat: look at it before you reply. Call qc_sheets once (the app bundles the film as you left it first, in every film style: you can always see your change in this turn, so never say you cannot) and read the shots you changed; say what you saw, and fix what does not hold. After your turn the app makes the film ready to render again by itself (its preview and its checks): never tell the owner to render again or that the render is old; say the change is in the film and Render takes it." : "",
    canvasTextLine(meta, dir, step),          // a canvas film's plain text in HTML over it, its performed text as the author ships it
    meta.brief?.text ? `${meta.brief.mode === "script" ? "Brief (narration script)" : "Brief from the owner (one box: topic, idea, narration if any, notes, links, direction)"}: ${briefText(meta.brief.text)}` : "No brief yet.",
    meta.brief?.direction ? `Direction from the owner: ${briefText(meta.brief.direction, 4000)}` : "",
    // the film's kind (the brief's only kept answer): an anidoodle medium's own (config/anidoodle-pipeline.json) or one every style offers
    // (What If, config/film-kinds.json)
    (dir && ((k) => (k?.scope === "anidoodle" && !anidoodleId(meta.style?.id) ? "" : k?.says))(filmKind(dir))) || "",
    meta.way?.id ? `Way of working the owner chose at the Assets analysis: ${meta.way.id}. ${INPUT_MODE[meta.way.id] ?? ""}`
      : meta.inputMode ? `How to use the imported files: ${INPUT_MODE[meta.inputMode] ?? INPUT_MODE.auto}` : "",
    meta.music?.file ? `Music: ${meta.music.file} is on the timeline (<audio id="el-music" data-timeline-role="music">, from 0 s)${meta.music.beats ? `; its beats, measured by HyperFrames, are in ${meta.music.beats}` : ""}. Time the film to it; never add another music element.` : "",
    dir ? inputsBlock(dir) : "",
    // the user chose not to use the voice-over; it stays a file, off the timeline (the voice_off tool), never only muted
    meta.voice?.file && meta.voice.offTimeline ? `Voice-over: ${meta.voice.file} is off the timeline (the owner chose not to use it): the film has no narration; do not time the film to its words.`
    : meta.voice?.file ? `Voice-over: ${meta.voice.file} (${meta.voice.info?.duration ?? "?"} s, ${meta.voice.source === "upload" ? "uploaded" : `read by ${meta.voice.source}`}). When the owner chooses not to use it, call the app's voice_off tool (it takes it off the timeline and keeps the file); never only mute it. ${meta.voice.transcript?.status === "saved"
      ? "Its reviewed transcript is transcript.json (HyperFrames word timings: [{id, text, start, end}], seconds of the voice's file; they are film seconds only while the voice plays whole from 0. Cut or moved, its el-voice clips say where each part sits in the film: film time = the clip's data-start + word time - its data-media-start): time shots, captions and kinetic text to it; never edit it." + (meta.voice.from ? "" : " It is on the timeline already (<audio id=\"el-voice\">, from 0 s): never add another voice element.")
      : "Its transcript is not reviewed yet: do not time the film to it until the owner saves it."}${meta.voice.transcript?.status === "saved" ? " With no SCRIPT.md, the transcript is the script." : ""}` : "",
    voiceFitText(meta),          // a voice longer than the set length, or well short of it, is the user's choice: never a film stretched or a gap filled
    rulesLine(rules, first, qc, dir, required),
    // fewer turns: each turn re-reads the whole conversation
    "Work in few turns: each turn re-reads the whole conversation. Put independent reads in one turn (several Read calls at once) and independent edits in one turn; never read a file again that you already read in this task unless it changed; never Glob or Grep for a rule file whose path you were given.",
    limitLine(step),          // a reply that reaches its limit is lost whole (T23-2)
    "Each pipeline step runs in its own conversation, so what an earlier step decided lives only in the project's files: read docs/NOTES.md and the",
    "files of the earlier steps before you start, and write every decision a later step needs into docs/NOTES.md (one short dated line each) as you make it.",
    `Project files now: ${projectFiles(dir).join(", ") || "none yet"}. The pipeline, what is new and the request come in the message.`,
    `Shots now: ${shots.length ? shots.map((s) => `${s.number}. ${s.title} [${s.start ?? "?"}-${s.start != null && s.duration != null ? +(s.start + s.duration).toFixed(2) : "?"} s, ${s.src ?? "no file"}]`).join("; ") : "none"}.`,
    powersLine(settings),
    toolsLine(tools),
    FONTS_LINE,
    THREE_LINE,
    FOLDERS_LINE,
    // the tops of the letters showed at 0 s because the mask had padding and the rise was only yPercent 100
    "Text that rises out of a clipping mask: give the mask no padding, or start the rise beyond 100% plus that padding, so no part of a letter shows before its entrance.",
    "The app previews, renders, checks (HyperFrames lint, fonts, glyphs, remote URLs) and exports the film after your edits, and applies the studio's finalize rules.",
    // a logo written as PNG%20Logo.png read as a missing file
    "Write a file's path as its real name, letters and spaces as they are on disk (assets/1_design/images/PNG Logo.png), never URL-encoded (%20, %C3%A1).",
    // Build once read the Motion step's five compositions again (106K, two of them twice); a file read twice is paid twice
    "Read each file once in a task. To change part of a file you have read, Grep for that part and Edit it; never read the whole file again. A file you are about to rewrite whole needs no reading first.",
    "Never mention or run hyperframes CLI, npx, kit.py or film.json. Keep every edit inside the requested scope; do not change other shots.",
    "Files under .moworks/ are the app's: read .moworks/rules/ and .moworks/library/ but never edit anything under .moworks/ or .git/.",
    // Claude Code's Glob does not follow a link from a pattern at the film's root (T28-14: "No files found" with the files there); Read, Grep and a Glob with `path` do
    "Those two folders are links: to list or search in them, give the folder itself as Glob's or Grep's path (Glob with path .moworks/rules/hyperframes/references and pattern *.md). A Glob pattern from the film's root that goes through them answers \"No files found\" even when the files are there.",
    "When the request is a question or needs the user's choice (an approval gate, missing information), answer or ask in text and change no file.",
    motionSpec ? MOTION_PLAN_PROMPT : "",          // only styles whose pipeline has a motion spec
    motionSpec ? MOTION_PLAN_SOUND : "",          // each motion row's own sound (house rules, "A sound on every action")
    // a sound on every action (owner 30/10): the storyboard names them, the app places one for every action the names leave out
    "Sound effects (the house rules, \"A sound on every action\"): every visible action of the film gets a sound and every scene that has a place a quiet ambience bed. Name them on each frame of STORYBOARD.md:",
    "an `- sfx:` line with a short English name per action, comma-separated, at its moment (e.g. `- sfx: pop, door open@1.2, footstep wood@2`; `name@0.8` = 0.8 s into the shot; `none` = silent), and an `- ambience:` line with the place (`- ambience: rain`, `city street`, `room tone`, `forest night`; `none` for a shot with no place). Name what is heard, the thing and its sound (`thread rustle`, `wooden box lid`), never a motion verb alone (`pull`, `park`); the right sound first, however often it plays (#1113): a repeated action keeps its name, a different name only for a different sound.",
    "Do not write <audio> elements for sound effects and do not edit assets/3_audio/sfx/ or docs/CREDITS.md: at Final Mix the app finds each sound (its offline library of CC0 sounds first, then free Freesound sounds, CC0 / CC BY), adds its own for every action the names leave out, places each at its moment at its family's level under the music and the voice, and credits it.",
    "When the owner asks for no whoosh, fewer or more sounds, no ambience or silence, call the app's sfx_prefs tool (the app keeps the choice on every placement); editing `- sfx:` lines alone never stops the app's own sounds.",
    "On a film whose sounds are already placed, the app places a `- sfx:` line you add or change in the chat by itself, a few seconds after your turn ends (finding the sound, its level, its credit). So tell the owner it will be in the mix in a moment; never say it is not in the mix, and never ask them to press Place them again. A sound the owner moved or took off on the timeline stays as they left it.",
    // Answer in the language the user writes in, never from the UI's language or the app's own step messages (English).
    // The app decides the language (Claude once chose per step and mixed them): one language in every reply
    `Reply to the owner in ${lang === "en" ? "English" : "Vietnamese"} only (the language the owner writes in), every sentence of every reply; never mix languages in one reply. The app's own step messages are in English and do not change it.`,
    "This is for your chat replies only: file names, code and comments stay in English, and the film's on-screen text and voice follow the film's language (below).",
    // the film's language from the brief, or asked in Prepare when the brief does not say it; never a guess
    filmLanguageLine(meta, step),
    // frame titles once mixed the two languages ("Cáo asleep under the moon", "The workshop: 16 bước · 1 đội")
    `The words the owner reads in the app's dialogs follow the same rule: the storyboard's frame titles and scene lines, each option's name, the Motion Plan's shot names and notes, a character's name and about line: in ${lang === "en" ? "English" : "Vietnamese"} only, never two languages in one title (a name the brief gives, a brand or a word on screen stays as it is).`,
    // a note between tool calls showed live as "Now the engine code I need: the film contract, the page
    // host, Mira's module…": every text you write is a reply the user reads at once, in any step and any film style
    `Every line of text you write outside files, the short notes between your tool calls too, shows to the owner at once as your progress: write each in ${lang === "en" ? "English" : "Vietnamese"}, in plain words, saying who does what and why for the film (e.g. "${lang === "en" ? "I'm reading how the Storybook style draws and the author's Mira examples, so Mira comes out in the right hand." : "Tôi đang đọc cách vẽ kiểu Storybook và các mẫu Mira của tác giả để vẽ Mira đúng nét."}"). Never a file name, a path, code or the app's and engines' own words (contract, host, module, engine code, rig, gate, pipeline step ids) in them. Notes to yourself go in your thinking, not in text.`,
    // short replies; never list the files read or written; "video style", never "skill"
    "Keep replies short: at most about 60 words, 1-3 plain lines saying what you did; ask only what the pipeline needs from the owner.",
    `No tables, no headings, no file names, never say which files you read or wrote, never say "skill" (say "film style${styleTitle ? ` ${styleTitle}` : ""}").`,
    // one name per thing, the same as the app's menus, kept in English in a Vietnamese reply too
    "Call the app's things by the names its screens use, in English as they are, in every language: Film style (the style the film is made in), Brand Kit (colours, type and layout of a brand), Motion Library, Characters, Storyboard, Motion Plan (never \"motion spec\"), Review (Claude's director's review of the film, never \"QC review\" or \"self-check\"), Tech checks, Final Mix, Render. The pipeline goes on by itself: never end a step asking the owner to tell you when to start the next one (the Storyboard starts by itself after Prepare), and write every sentence whole (Test 10 #442). The app runs the Tech checks again by itself after a change to a film that has failed them (and before a render): never ask the owner to run them, and never tell the owner to press a button or open a menu you have not seen on a screen (Test 10 #436).",
    // questions the owner reads at a glance, in every style: each one short line, its choices a list under it (owner 30/10: choices run into one line were hard to read)
    `When you ask the owner something: one line saying why you ask, then each question as one short line ending in a question mark, numbered 1., 2., 3. when there are several, and under it its choices as a bullet list, "- " at the start of each line, one choice a line, your suggestion first. Never write the choices inside the question's sentence, however a rule lists them (with "·" or numbers), and write nothing after the last choice. For example:\n1. ${lang === "en" ? "Which font for the title?" : "Tiêu đề dùng font nào?"}\n- **Oswald** (${lang === "en" ? "my suggestion: it has every Vietnamese letter" : "tôi gợi ý: đủ dấu tiếng Việt"})\n- Anton\n- ${lang === "en" ? "Upload the font file" : "Bạn tải file font lên"}`,
    "Speak as \"tôi\" and call the owner \"bạn\". Every progress line says who does what and where the work stands: what you have finished, what you are doing now, what the owner gets and when to wait, e.g. \"Tôi đã đọc xong quy tắc và brief của bạn, giờ đang dựng 2 phương án storyboard A và B cho bạn duyệt, vui lòng chờ trong giây lát.\"",
    "Write details and decisions into the project's files, not the chat. When you begin a long piece of work, say first in one such line what it is (e.g. \"Tôi đang dựng 4 shot theo motion bạn đã duyệt, xong tôi sẽ tự chấm và báo bạn.\").",
    "In each message, bold 1-3 key words with Markdown **…**: an option's name (**A \"Đường sáng\"**), a number (**10 s**), the action the owner must take (**chọn A hoặc B**). Never bold a whole sentence; no other formatting.",
  ].filter(Boolean).join("\n");
}
/** The Google Slides links the app could not read : a missing thing for Prepare, with the two ways on. */
export function linksLine(meta) {
  const bad = Object.entries(meta?.links ?? {}).filter(([, v]) => v && !v.ok);
  if (!bad.length) return "";
  const why = (r) => (r === "not-shared" ? "not shared by link (Google answered with its sign-in page)" : r === "not-found" ? "no deck at this link" : r === "too-large" ? "over 300 MB" : "Google could not be reached");
  return `Google Slides links in the brief the app could not read: ${bad.map(([url, v]) => `${url} (${why(v.reason)})`).join("; ")}. Each is a missing thing (moworks-studio §2b): offer the ways on (in Google Slides, Share › Anyone with the link, then say "done"; or upload the deck as a PPTX with the Assets button; or go on without it) with the other points in one message, and stop.`;
}
// the voice settings stay the user's choice (Claude once told the user to set speed 0.85)
// T40-4: Prepare offered "a second voice for Em", which the Voice screen cannot make
const ONE_VOICE_RULE = "The Voice screen makes one voice for the whole voice-over: never offer or plan a second voice made in the app. A character's line is read by the narrator (a delivery tag may colour it), or the owner records it and uploads it with the Assets button; offer only those.";
const VOICE_SETTINGS_RULE = "The voice's settings (speed, stability and the rest) are the owner's to set on the Voice screen and start at the voice service's own defaults: never set, suggest or name a number for them unless the owner asks.";
/** The brief as Claude reads it, whole (BRIEF_MAX, the longest the app keeps): Test 24's 4,369-character brief was cut at 4,000, inside
 *  its voice-over script, and Prepare wrote the script's first 9 of 12 lines as "the brief's script verbatim". A longer one says where
 *  the app cut it, so nothing past it is taken for the end. */
export function briefText(text, max = BRIEF_MAX) {
  const s = String(text ?? "");
  return s.length <= max ? s : `${s.slice(0, max)}\n[The app cut the brief here: ${(s.length - max).toLocaleString("en")} more characters are not shown. Tell the owner the brief is too long to read whole and ask for the rest in the chat.]`;
}
// Test 24: the brief carried a 12-line voice-over script ("dùng đúng nguyên văn"); Prepare put 9 lines in VOICEOVER.md, left the rest
// "to the screen text", wrote "the brief's script verbatim" and "No conflict", and asked nothing
const OWN_SCRIPT_RULE = "A script the owner wrote (the brief's voice-over script, \"lời đọc\" or \"kịch bản\", or a brief that is the script) is read word for word: docs/VOICEOVER.md holds every line of it as the owner wrote it, in its order, nothing left out, merged, reworded or moved to the words on screen (ElevenLabs delivery tags added in square brackets change no word: moworks-studio §6d). Shortening it, splitting it, dropping a line or moving lines to the screen is a conflict (moworks-studio §2b): say what you would change and why, offer the choices as a bullet list (the whole script as written, your shorter version with its changed lines named, the lines you would put on screen instead), and stop until the owner chooses. Never call a script you changed \"verbatim\" or \"as written\", in BRIEF.md, docs/NOTES.md or your reply.";
/** The ways to a voice-over the app offers, in every style (with the ElevenLabs key saved, Prepare once offered only "record and
 *  upload" or "no narration"; Claude once asked for a speed the Voice screen did not have). Empty when the film already has one. */
export function voiceLine(meta, root = APP_ROOT) {
  if (meta?.voice?.file) return "";
  const keys = voiceServices(meta, root);
  return `${keys.length
    ? `Voice-over (the app says): none in the project yet, and ${keys.join(" and ")} ${keys.length > 1 ? "are" : "is"} set up. When the brief already says which way (e.g. the voice made in the app), take it without asking (QC4-4). A film with a narration (made here or recorded by the owner) gets its words to read in docs/VOICEOVER.md, the words with their delivery tags when ElevenLabs makes the voice (moworks-studio §6d), one line per scene: the app then holds the Storyboard until the voice is made and its words are timed, so the Storyboard is timed to them in one pass (D39); never ask the owner to tell you when it is made. A film with no narration gets no docs/VOICEOVER.md. When the brief wants a narration and does not say how, offer the ways on in this order: 1) make it here: the owner opens the Voice screen, picks a voice (a Vietnamese one for Vietnamese) and the app reads the script with ${keys.join(" or ")}${!keys.includes("Kokoro") && !filmVietnamese(meta) ? " (the Voice screen also offers the free voice Kokoro, which it installs there: no account, no Vietnamese)" : ""}; you write the words to read into docs/VOICEOVER.md (the words only, one line per scene: the Voice screen's Script box is filled with them); 2) upload a recording with the Assets button; 3) no narration.`
    : `Voice-over (the app says): none in the project yet, and no voice service is set up. When the brief wants a narration, offer the ways on: upload a recording with the Assets button, add an ElevenLabs key in Studio Settings › System › Voice-over${filmVietnamese(meta) ? "" : " or install the free voice Kokoro on the Voice screen (no account; it has no Vietnamese)"} to make it here, or no narration. A film with a narration (made here or recorded by the owner) gets its words to read in docs/VOICEOVER.md, the words only, one line per scene: the app then holds the Storyboard until the voice is made and its words are timed, so the Storyboard is timed to them in one pass (D39); never ask the owner to tell you when it is made. A film with no narration gets no docs/VOICEOVER.md.`} ${OWN_SCRIPT_RULE} ${ONE_VOICE_RULE}`;
}
/** A product's features from the web: Prepare asks, the yes opens the search, the facts and their sources are docs/RESEARCH.md for every later step (moworks-studio §2c). */
export function researchLine(meta, dir, step = null) {
  const r = meta?.research?.answer ?? null, wrote = !!dir && existsSync(docPath(dir, "RESEARCH.md"));
  if (r === "not-product" || (r === "no" && step !== "brief")) return r === "no" ? "The owner said no to searching the web for the product: work from what they gave you." : "";
  if (r === "no") return "The owner said no to searching the web for the product: work from what they gave you, and write no feature or figure they did not give.";
  if (r === "yes" && wrote) return ["storyboard", "motionSpec", "build", "qcReview", null].includes(step) ? "The product's facts from the web, each with its source, are in docs/RESEARCH.md: a product film's Storyboard carries supers of its strongest features from them without being asked (moworks-studio §2c); every figure on screen is one of its rows, and a Brand Kit's or a guideline's rules on claims win over it." : "";
  if (r === "yes") return "The owner said yes to searching the web for the product: moworks-studio §2c. Do it now, before anything that depends on it: write docs/RESEARCH.md, then go on.";
  return !step || step === "brief" ? "If this film shows a product the owner brought (a product showcase or launch; a brief or files that name a product): moworks-studio §2c: unless the chat or docs/NOTES.md already has their answer, ask in this step's message whether the app may search the web for its features, and record the answer with the product_research tool. Never search for it before their yes." : "";
}
/** A lyrics video, said where the step works (style-catalog/traits.mjs): the rules it is held to, and the song's data. Empty for every other film. */
export function lyricVideoLine(meta, dir, step = null) {
  if (!dir || !isLyricVideo(meta, { dir })) return "";
  const map = existsSync(docPath(dir, "BEATMAP.md"));
  const data = ["storyboard", "motionSpec", "build"].includes(step)
    ? (map ? " The song's beat map is docs/BEATMAP.md: beats, bars, hits, kicks and sections, in seconds; every shot, move and word of this step sits on it, and your rows name the beat, bar or hit they land on." : " The app has no beat map yet: the film has no song on it, or several songs and nobody said which. Ask, as moworks-studio §2b says.") : "";
  // no lyrics yet: Prepare stops and asks, with what Whisper heard as a draft (moworks-studio §2b); a brief that says no lyrics needs no answer
  let hasLyrics = false; try { hasLyrics = !!readFileSync(join(dir, "lyrics.txt"), "utf8").trim(); } catch { /* none */ }
  const heard = heardDraft(dir, null);
  const ask = hasLyrics || briefRefusesLyrics(meta.brief?.text) || !["brief", null].includes(step) ? ""
    : ` The owner has given no lyrics${heard ? (heard.unheard ? `, and Whisper could hardly hear the song (${heard.words} words)` : `; Whisper heard ${heard.words} words, a rough draft that is in the Lyrics dialog for them to correct`) : ""}. Unless the chat or docs/NOTES.md already has their answer, this is a missing thing (moworks-studio §2b): in this message, ask them to give or correct the lyrics in the Lyrics dialog, or to choose a film with no sung words, and stop. Never fit words to the beats by guess.`;
  return `This film is a lyrics video (a song and its words, cut to the beat): .moworks/rules/moworks-alive/lyric-video.md holds, in any film style, and its rules are stricter than moworks-alive §2.${data}${ask}`;
}
/** The user's lyrics (lyrics.txt) are placed only by the app's timing (LYRICS-TIMED.md, .moworks/lyrics/words.json), never by guess (Claude once
 *  planned to place each line on the beat for a song with no singing). Untimed or timed
 *  before the lyrics changed: say what the user presses and stop. Empty when the film has no lyrics. */
export function lyricsLine(dir) {
  let text = "", timedAt = null, textAt = 0;
  try { text = readFileSync(join(dir, "lyrics.txt"), "utf8").trim(); textAt = statSync(join(dir, "lyrics.txt")).mtimeMs; } catch { return ""; }
  if (!text) return "";
  try { timedAt = Date.parse(JSON.parse(readFileSync(join(dir, ".moworks", "lyrics", "words.json"), "utf8")).at); } catch { /* not timed */ }
  if (timedAt && textAt <= timedAt + 1000) return "The owner's lyrics are timed by the app: LYRICS-TIMED.md (each line's start) and .moworks/lyrics/words.json (each word). Place every line exactly at its time there; never move a line by guess.";
  return "The owner gave lyrics (lyrics.txt) and the app has not timed them yet" + (timedAt ? " (they changed after the last timing)" : "") + ". Never place lyrics by guess, on the beat or anywhere, even for a track with no singing: the app times them to the track. Tell the owner in one line to open Lyrics and press Time the lyrics (it needs the music track in the film first), and stop; the storyboard places the lines once LYRICS-TIMED.md is there.";
}
/** The sound section of the film style's own file (its author's sound palette: music, foley, mix), "" when it has none, null when the
 *  style cannot be read. The music step and the sound effects follow it. */
export function styleSound(meta, root = APP_ROOT) {
  // the owner's film styles have no style file of their own: their pack (config/rules/<style>) holds their sound rules (owner #909)
  let text = ""; try { const s = getStyle(meta?.style?.id, root); const r = s?.rules?.find((x) => /-style$/.test(x.kind) && x.path) ?? (MOWORKS_STYLE_IDS.includes(s?.id) ? s.rules?.find((x) => x.kind === "moworks-rule" && x.name === s.id && x.path) : null); text = r ? readFileSync(r.path, "utf8") : ""; } catch { return null; }
  return /^#{2,3}[^\n]*(sound|music|audio)[^\n]*\n([\s\S]*?)(?=^#{1,3}\s|(?![\s\S]))/im.exec(text)?.[2] ?? "";
}
/** The style author's own music line (its sound palette), for the music step (once three wedding harps were chosen for an HD-2D adventure whose
 *  palette is strings, horns, low choir and timpani with an arc). Empty when the style's file has no sound section. */
export function musicLine(meta, root = APP_ROOT) {
  const sec = styleSound(meta, root);
  if (sec == null) return "";
  const music = sec.split(/\r?\n/).map((l) => l.replace(/[*_`]/g, "").replace(/^\s*[-•]\s*/, "").trim()).filter((l) => /^music\b|music:/i.test(l)).join(" ").slice(0, 600);
  const palette = music ? `The style's author on the music: "${music}" ` : "";
  return `${palette}Choose the three tracks for the story's arc (its opening, its rise, its climax and the quiet before the hit), searching mixkit.co by the palette's instruments and that arc (e.g. "cinematic", "adventure", "epic", "fantasy"), not by one instrument alone; three different moods for the owner to choose from, never a piece made for another occasion (a wedding, a baby, a corporate presentation) (Test 13 #479).`;
}
/** The film's language: the voice-over and the words on screen, set from the brief or by the user's answer. When nobody said
 *  it, Prepare (and a chat turn before it is set) asks it with its other questions and records it with film_language. */
export function filmLanguageLine(meta, step = null) {
  const id = meta?.language?.id;
  // Test 24: a CRT film's inverted status strips showed "NHAT KY · TRAM HON GIO", and neither the Build nor the Review saw it
  if (id) return `The film's language (the voice-over and every word on screen): ${id === "en" ? "English" : "Vietnamese"}.${id === "en" ? ""
    : " Every Vietnamese word on screen keeps every mark, in every film style: an ASCII, CRT, monospace, pixel or all-caps look is never a reason to drop them, and a band, strip, highlight or inverted cell behind the text leaves room for the marks above and below (moworks-studio §4). The app's checks name on-screen text written without its marks."}`;
  if (step && step !== "brief") return "The film's language is not set yet: write the words on screen in the brief's language and ask the owner in your reply which language the film speaks.";
  return "The brief does not say the film's language. Ask it with your other questions in one message (moworks-studio §2b): \"Lời đọc và chữ trên phim: tiếng Việt hay tiếng Anh?\" (Vietnamese first when the owner writes Vietnamese), and stop; when the owner answers, call film_language with vi or en before you go on.";
}

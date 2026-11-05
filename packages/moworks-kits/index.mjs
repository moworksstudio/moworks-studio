// The owner's own kits as Moworks Studio film styles (owner 04/11/2026 #880-#886): Paper Collage, Stickman Explainer, Inner Voice Short (the
// Story kit's two styles), 3D Cartoon, 2D Explainer. Each kit is pinned as shipped in bundle/styles/moworks-kits/<kit> (config/pins.json
// moworksKits, tools/intake-moworks-kit.mjs); its taste, method and code are used as they are, on HyperFrames:
//   2D Explainer   a HyperFrames page as shipped: the kit's canvas engine (engine/*.js: window.EX, window.HOUSE) beside the page, GSAP's
//                  timeline (EX.run), the film's story/ scripts; the voice's words as story/words.js wants them
//   the others     Remotion kits: the project's composition on the kit's own code, bundled by build.mjs with the app's stand-in for Remotion
//                  (the What If bridge, R-LEMO: window.render(t), READY)
//   Ricks Clip     (owner 05/11/2026 #1065-#1073) the owner's skill cartoon-audio-short and its code kit: ES modules drawing frame f, the film's
//                  film/ files with the kit's engine, toon.js and three.js bundled by ricks.mjs (R-LEMO: window.render(t), READY)
// Faces without Vietnamese letters are drawn by their twins (fonts.mjs). The kits' own commands (doctor, render, qc, npm, uv) are not used: the
// app runs every step; the kits' code-made sounds are in the offline library (tools/make-code-sfx.mjs). Credit: Moworks Studio, the owner's own.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ROOT, loadPins } from "../version-manager/index.mjs";
import { gsapFile } from "../offline-assets/index.mjs";
import { ensureShared, linkOrCopy, sharedDir } from "../project-service/shared-stage.mjs";
import { buildKitFilm, transcriptWords } from "./build.mjs";
import { declareTwins, twinnedIn } from "./fonts.mjs";
import { CAST_LAYER, FILM_DIR, buildRicksFilm } from "./ricks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The five styles: their kit, how the film runs, the kit's faces that need a Vietnamese twin (fonts.mjs), the kit's skill folders Claude reads,
 *  and the worked examples. */
export const KIT_STYLES = Object.freeze({
  "paper-collage": { id: "paper-collage", kit: "paper-collage", engine: "react", faces: ["Special Elite"], skills: ["motion-graphic", "style-note"], examples: ["src/demo/Demo.tsx", "templates/Graphic.template.tsx"] },
  "stickman-explainer": { id: "stickman-explainer", kit: "story", engine: "react", faces: [], skills: ["stickman-explainer", "style-note"], examples: ["src/examples/fly.js", "src/examples/ExampleFly.tsx", "templates/stickman/video.template.js", "templates/stickman/Video.template.tsx"] },
  "inner-voice-short": { id: "inner-voice-short", kit: "story", engine: "react", faces: ["Comic Sans MS", "Comic Neue", "Chalkboard SE"], skills: ["inner-voice-short", "style-note"], examples: ["src/examples/firstchord.js", "src/examples/ExampleFirstChord.tsx", "templates/inner-voice/video.template.js", "templates/inner-voice/Video.template.tsx"] },
  "cartoon-3d": { id: "cartoon-3d", kit: "cartoon-3d", engine: "react", three: true, faces: ["Outfit", "Caveat Brush"], skills: ["cartoon-video", "cartoon-shorts", "cartoon-whatif", "character-builder", "idea-lab", "render-review", "style-note"], examples: ["src/examples/what-if-no-pain/shots.ts", "src/examples/cheese-bank-vault/shots.ts", "templates/video/Video.tsx", "templates/video/world.ts"] },
  "explainer-2d": { id: "explainer-2d", kit: "explainer-2d", engine: "page", faces: ["Figtree"], skills: ["explainer-video", "explainer-shorts", "explainer-longform", "script-writer", "art-modules", "sound-design", "voice-over", "render-review", "style-note"], examples: ["examples/where-the-needle-stops/STORYBOARD.md", "examples/where-the-needle-stops/story/story.js", "templates/video/story/story.js", "engine/CONTRACT.md"] },
  // a skill folder (owner 05/11/2026 #1065-#1073): SKILL.md and its code kit at kit/; the engine is ES modules drawing frame f (ricks.mjs)
  "ricks-clip": { id: "ricks-clip", kit: "ricks-clip", engine: "module", faces: ["DejaVu Serif", "Arial Black"], skills: [], examples: ["kit/example/soldier/story.js", "kit/example/soldier/stills.jpg", "kit/example/soldier/audio.py"] },
});
export const isKitStyle = (id) => Object.hasOwn(KIT_STYLES, String(id ?? ""));
export const kitStyle = (id) => KIT_STYLES[String(id ?? "")] ?? null;

/** The pinned copy of a kit: { title, version, sha256, file, dir (absolute), intact (its PINNED names the pinned SHA-256) } or null. */
export function kitSource(kit, root = APP_ROOT) {
  const p = loadPins(root).moworksKits, k = p?.kits?.[kit];
  if (!k) return null;
  const dir = join(p.root, k.dir);
  let pinned = ""; try { pinned = readFileSync(join(dir, "PINNED"), "utf8"); } catch { /* not there */ }
  return { ...k, dir, intact: pinned.includes(`sha256:${k.sha256}`) };
}

// ---- for Claude, from the first step: the kit as shipped (its skills, references, code, examples, templates) and the app's starting page
/** .moworks/library/<style>/: kit/ (a link to the shared stage of the pinned kit) and app/ (this style's page to start from and its notes). */
export function stageGuide(projectDir, styleId, root = APP_ROOT) {
  const s = kitStyle(styleId), src = s && kitSource(s.kit, root);
  if (!src) throw Object.assign(new Error(`${styleId}: not one of the owner's kit styles, or its kit is not pinned`), { code: "NOT_FOUND" });
  const dest = join(projectDir, ".moworks", "library", styleId), files = [];
  const whole = (d) => existsSync(join(d, "PINNED")) && readFileSync(join(d, "PINNED"), "utf8").includes(src.sha256);
  const shared = ensureShared(sharedDir(root, "library", `kit-${s.kit}@${src.sha256.slice(0, 12)}`), (to) => cpSync(src.dir, to, { recursive: true }), whole);
  mkdirSync(dest, { recursive: true });
  const was = existsSync(join(dest, "kit", "PINNED"));
  linkOrCopy(join(dest, "kit"), shared);
  if (!was) files.push(`.moworks/library/${styleId}/kit/PINNED`);
  // the app's part: the page this style's film starts from (index.html), its board page, and what the app does instead of the kit's commands
  const app = join(HERE, "scaffold", styleId), to = join(dest, "app");
  for (const n of existsSync(app) ? readdirSync(app) : []) {
    const a = join(app, n), b = join(to, n);
    if (existsSync(b) && statSync(b).mtimeMs >= statSync(a).mtimeMs) continue;
    mkdirSync(to, { recursive: true }); copyFileSync(a, b); files.push(`.moworks/library/${styleId}/app/${n}`);
  }
  // Ricks Clip: the app's cast layer (the three views and the pose layer) beside its page, for Claude to read (the film's bundle takes it from the app)
  if (s.engine === "module") {
    const b = join(to, "ricks-cast.js");
    if (!(existsSync(b) && statSync(b).mtimeMs >= statSync(CAST_LAYER).mtimeMs)) { mkdirSync(to, { recursive: true }); copyFileSync(CAST_LAYER, b); files.push(`.moworks/library/${styleId}/app/ricks-cast.js`); }
  }
  return { files };
}
/** What each step reads of the kit (project-relative), for agent/reads.mjs. */
export function kitReads(styleId) {
  const s = kitStyle(styleId);
  if (!s) return { look: [], method: [], examples: [], app: [], sound: [], review: [] };
  const lib = `.moworks/library/${styleId}`, k = `${lib}/kit`;
  if (s.engine === "module") return ricksReads(s, lib, k);
  const skill = (n) => `${k}/.claude/skills/${n}/SKILL.md`;
  const LOOK = { "paper-collage": [`${k}/.claude/skills/motion-graphic/references/STYLE.md`, `${k}/.claude/skills/motion-graphic/references/RECIPES.md`],
    "stickman-explainer": [`${k}/.claude/skills/stickman-explainer/references/STYLE.md`, `${k}/.claude/skills/stickman-explainer/references/SCRIPT.md`],
    "inner-voice-short": [`${k}/.claude/skills/inner-voice-short/references/STYLE.md`, `${k}/.claude/skills/inner-voice-short/references/STORY.md`],
    "cartoon-3d": [`${k}/.claude/skills/cartoon-video/references/STYLE.md`, `${k}/.claude/skills/cartoon-video/references/STAGING.md`, `${k}/.claude/skills/cartoon-video/references/KIT.md`],
    "explainer-2d": [`${k}/STYLE.md`, `${k}/SCRIPTING.md`, `${k}/engine/CONTRACT.md`] }[styleId];
  const SOUND = { "paper-collage": "motion-graphic/references/SOUND.md", "stickman-explainer": "stickman-explainer/references/SOUND.md", "inner-voice-short": "inner-voice-short/references/SOUND.md",
    "cartoon-3d": "cartoon-video/references/SOUND.md", "explainer-2d": "sound-design/SKILL.md" }[styleId];
  // the Review's checklists: the kit's own (its still-round CHECKLIST.md, the fresh-eyes REVIEW.md), else the style's loop with what the
  // author learned (the Story kit's two styles keep theirs in SKILL.md)
  const REVIEW = { "paper-collage": ["motion-graphic/references/CHECKLIST.md"], "stickman-explainer": ["stickman-explainer/SKILL.md"],
    "inner-voice-short": ["inner-voice-short/SKILL.md"], "cartoon-3d": ["cartoon-video/references/CHECKLIST.md", "render-review/references/REVIEW.md"],
    "explainer-2d": ["explainer-video/references/CHECKLIST.md", "render-review/references/REVIEW.md"] }[styleId];
  const out = { look: LOOK, method: [skill(s.skills[0])], examples: s.examples.map((e) => `${k}/${e}`), app: [`${lib}/app/README.md`], sound: [`${k}/.claude/skills/${SOUND}`],
    review: REVIEW.map((r) => `${k}/.claude/skills/${r}`) };
  // each step's own files of the kit (owner 05/11 #1036: the script step read one skill and the Motion Plan only STYLE.md, so Test 38 wrote
  // long sentences and planned moves the hero cannot make). Every file of the kit's skills is read by a step, but KIT_UNREAD (test: moworks-kits)
  const sk = (p) => `${k}/.claude/skills/${p}`, at = (p) => `${k}/${p}`, ex = out.examples;
  const STEPS = {
    "explainer-2d": {
      brief: [sk("explainer-video/SKILL.md"), sk("script-writer/SKILL.md"), at("SCRIPTING.md"), sk("voice-over/SKILL.md"), sk("explainer-longform/SKILL.md"), sk("explainer-shorts/SKILL.md"), at("STYLE.md")],
      storyboard: [at("STYLE.md"), at("SCRIPTING.md"), at("engine/CONTRACT.md"), sk("explainer-video/references/BUILD.md"), sk("art-modules/SKILL.md"), ...ex.slice(0, 2)],
      motionSpec: [at("STYLE.md"), at("engine/CONTRACT.md"), sk("explainer-video/references/BUILD.md"), ex[0]],
      build: [at("STYLE.md"), at("SCRIPTING.md"), at("engine/CONTRACT.md"), sk("explainer-video/references/BUILD.md"), sk("art-modules/SKILL.md"), sk("art-modules/references/BRIEF.md"), ...ex],
      review: [...out.review, sk("render-review/SKILL.md")] },
    "cartoon-3d": {
      brief: [sk("cartoon-video/SKILL.md"), sk("cartoon-shorts/SKILL.md"), sk("cartoon-shorts/references/SCRIPT.md"), sk("cartoon-shorts/references/FORMATS.md"), sk("cartoon-whatif/SKILL.md"),
        sk("cartoon-whatif/references/SCRIPT.md"), sk("cartoon-whatif/references/FORMATS.md"), sk("cartoon-whatif/references/EPISODES.md"), sk("idea-lab/SKILL.md"), sk("cartoon-video/references/VOICE.md"), ...LOOK.slice(0, 1)],
      storyboard: [...LOOK, sk("cartoon-video/references/PIPELINE.md"), sk("character-builder/SKILL.md"), ...ex.slice(0, 2)],
      motionSpec: [...LOOK],
      build: [...LOOK, sk("cartoon-video/references/PIPELINE.md"), sk("character-builder/SKILL.md"), ...ex],
      review: [...out.review, sk("render-review/SKILL.md")] },
    "paper-collage": {
      brief: [sk("motion-graphic/SKILL.md"), sk("motion-graphic/references/VOICE.md"), LOOK[0]],
      storyboard: [...LOOK, sk("motion-graphic/references/IMAGES.md"), sk("motion-graphic/references/OUTPUT.md"), ...ex.slice(0, 2)],
      motionSpec: [...LOOK],
      build: [...LOOK, sk("motion-graphic/references/IMAGES.md"), sk("motion-graphic/references/OUTPUT.md"), ...ex],
      review: out.review },
    "stickman-explainer": {
      brief: [sk("stickman-explainer/SKILL.md"), ...LOOK, sk("stickman-explainer/references/VOICE.md")],
      storyboard: [...LOOK, ...ex.slice(0, 2)], motionSpec: [...LOOK], build: [...LOOK, ...ex], review: out.review },
    "inner-voice-short": {
      brief: [sk("inner-voice-short/SKILL.md"), ...LOOK],
      storyboard: [...LOOK, ...ex.slice(0, 2)], motionSpec: [...LOOK], build: [...LOOK, ...ex], review: out.review },
  }[styleId];
  out.steps = { ...STEPS, sound: out.sound };
  return out;
}
/** Ricks Clip: one SKILL.md (its stages are the steps: Stage 1-3 the brief, 4.2-4.4 the board, 4.5 the plan, 4.3-4.6 the build, 4.7 the sound,
 *  4.6 and 4.8 the review) and its kit's code, every file of the pinned copy read by a step but the kit's own tools (RICKS_UNREAD). */
function ricksReads(s, lib, k) {
  const skill = `${k}/SKILL.md`, at = (p) => `${k}/kit/${p}`, ex = s.examples.map((e) => `${k}/${e}`);
  const engine = ["engine/main.js", "engine/paint.js", "engine/roman.js", "engine/motion.js", "engine/index.html"].map(at), toon = at("vendor/toon.ts");
  const layer = `${lib}/app/ricks-cast.js`;          // the app's cast layer: the three views, the pose layer, castDraw (#1076)
  const out = { look: [skill, at("README.md")], method: [skill], examples: ex, app: [`${lib}/app/README.md`, layer], sound: [skill, at("example/soldier/audio.py")], review: [skill] };
  out.steps = {
    brief: [skill, at("README.md")],
    storyboard: [skill, ex[0], ex[1], at("engine/roman.js"), at("engine/paint.js"), toon, layer],
    motionSpec: [skill, at("engine/motion.js"), ex[0], layer],
    build: [skill, ...engine, toon, layer, ...ex],
    review: [skill, ex[1]],
    sound: out.sound,
  };
  return out;
}
/** Ricks Clip's files no step reads, and why: the kit's own commands, which the app runs its own way. */
export const RICKS_UNREAD = Object.freeze({
  "kit/tools/setup.sh": "the kit's project setup; the app stages the engine and bundles the film",
  "kit/tools/timing.py": "word timings; the app's transcript gives them",
  "kit/tools/render.mjs": "the kit's frame renderer; HyperFrames renders",
  "kit/tools/sheet.py": "contact sheets; the app's storyboard stills",
  "kit/tools/finish.sh": "encode, loudness and QA; the app's render, Final Mix and Tech checks",
});
/** The kit's skill files no step reads, and why (test: every other one is read by a step). */
export const KIT_UNREAD = Object.freeze({
  "kit-setup/SKILL.md": "the kit's own install; the app sets up everything",
  "style-note/SKILL.md": "the kit's note to itself about writing a new style",
  "original-music/SKILL.md": "the kit's own music; the app's music comes from Final Mix",
  // the other kit's skills in the Story kit (two styles share it)
  "story:inner-voice-short": "the Story kit's other style", "story:stickman-explainer": "the Story kit's other style",
});

// ---- in a film: the engine, the faces and the words beside the page that runs them (the film's index.html, or a board, its own web root)
/** Which kit style a page runs: the data-kit on its root (#main), or null. */
export const pageKit = (html) => { const m = /<[^>]+\bdata-kit=["']([a-z0-9-]+)["']/.exec(String(html ?? "")); return m && isKitStyle(m[1]) ? m[1] : null; };
const same = (from, to) => { try { const a = statSync(from), b = statSync(to); return a.size === b.size && b.mtimeMs >= a.mtimeMs; } catch { return false; } };
const put = (from, to, rel, out) => { if (!existsSync(from) || same(from, to)) return; mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to); out.push(rel); };

/** R-KIT: the style's engine, own files, twinned faces and the voice's words in the project's assets/_app/ (a board's stills see them through the
 *  board's assets junction, hf-edit/boards.mjs), the page (pageRel: index.html or boards/<X>/index.html) loading them by "assets/…", and its film
 *  bundled (a Remotion kit's: compositions/film/film.js, a board's beside its page). Returns { style, files, build, fonts } or null when the page
 *  runs no kit style. */
export async function placeKit(projectDir, pageRel = "index.html", { root = APP_ROOT, force = false } = {}) {
  const page = join(projectDir, ...pageRel.split("/"));
  let html = ""; try { html = readFileSync(page, "utf8"); } catch { return null; }
  const id = pageKit(html), s = kitStyle(id), src = s && kitSource(s.kit, root);
  if (!s || !src) return null;
  const pageDir = projectDir, base = pageRel.split("/").slice(0, -1).join("/"), files = [], own = `assets/_app/${id}`;
  const rel = (r) => r;
  // the kit's own faces without Vietnamese letters, always (its code names them, whether or not the film's own file does), and any the page names
  let build = null, faces = [...new Set([...s.faces, ...twinnedIn(html)])];
  if (s.engine === "page") {
    // 2D Explainer: the engine as shipped (ex/), GSAP, and story words as the engine reads them (window.STORY_WORDS, from transcript.json)
    for (const n of readdirSync(join(src.dir, "engine")).filter((n) => /\.js$/.test(n))) put(join(src.dir, "engine", n), join(pageDir, own, "ex", n), rel(`${own}/ex/${n}`), files);
    put(gsapFile(root), join(pageDir, own, "ex", "gsap.min.js"), rel(`${own}/ex/gsap.min.js`), files);
    const text = `window.STORY_WORDS = ${JSON.stringify(transcriptWords(projectDir))};\n`, w = join(pageDir, own, "words.js");
    let was = null; try { was = readFileSync(w, "utf8"); } catch { /* first time */ }
    if (was !== text) { mkdirSync(dirname(w), { recursive: true }); writeFileSync(w, text); files.push(rel(`${own}/words.js`)); }
  } else if (s.engine === "module") {
    // Ricks Clip: the film's own files (film/, or a board's boards/<X>/film/ when it has its story.js) with the kit's engine, toon.js and
    // three.js, bundled beside the page (ricks.mjs)
    const board = base.startsWith("boards/") && existsSync(join(dirname(page), "film", "story.js"));
    build = await buildRicksFilm(projectDir, { root, force, filmDir: board ? `${base}/film` : FILM_DIR, out: base.startsWith("boards/") ? `${base}/film.js` : "compositions/film/film.js" });
  } else {
    // a Remotion kit: its own public files (Paper Collage's textures), then the film (or the board) bundled beside the page
    const tex = join(HERE, "assets", id, "textures");
    if (existsSync(tex)) for (const n of readdirSync(tex)) put(join(tex, n), join(pageDir, own, "textures", n), rel(`${own}/textures/${n}`), files);
    const board = base.startsWith("boards/");
    const entry = board && existsSync(join(dirname(page), "src", "videos", "film", "Video.tsx")) ? `${base}/src/videos/film/Video.tsx` : "src/videos/film/Video.tsx";
    build = await buildKitFilm(projectDir, s, { root, force, entry, out: board ? `${base}/film.js` : "compositions/film/film.js" });
    if (build) { faces = [...new Set([...faces, ...build.twinned])]; facesFor(page, build.families); }
  }
  const fonts = await declareTwins(projectDir, pageRel, faces, { root });
  return { style: id, files, build, fonts };
}
/** The faces a bundled film asked for (Google families R-FONTS installs), named in the page so R-FONTS sees them (as R-WHATIF does). */
function facesFor(page, families) {
  const was = readFileSync(page, "utf8"), html = was.replace(/\n?<style data-mw="kit-faces">[\s\S]*?<\/style>/, "");
  const css = (families ?? []).map((f, i) => `.mw-kit-face-${i} { font-family: "${f}"; }`).join(" ");
  const next = css ? html.replace(/<\/head>/i, `<style data-mw="kit-faces">${css}</style>\n</head>`) : html;
  if (next !== was) writeFileSync(page, next);
}

// What If animation: the sixth author of the Style Gallery. FreshStack's stick-figure engine, React + SVG
// drawn in code (one rig, rooms in perspective, light from lamps and windows), read from the pinned copy (config/pins.json whatIf,
// bundle/styles/what-if-animation: the engine, its two worked episodes, the skill and references; no sound: the author's voices and
// effects are ElevenLabs-made and stay out). A film is the project's episode module (whatif/episode.tsx) on the engine,
// bundled with the author's React (19.0.0, codeLibs) and the app's Remotion stand-in (shims/) by esbuild (hf-edit/whatIfBuild.mjs) into
// one page script; HyperFrames drives it through the app's bridge (R-LEMO: window.render(t), READY).
// Credit: FreshStack (kelano86), https://github.com/kelano86/what-if-animation at the pinned commit, MIT.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { codeLibDir } from "../offline-assets/index.mjs";
import { ensureShared, linkOrCopy, sharedDir } from "../project-service/shared-stage.mjs";

export const AUTHOR = { id: "freshstack", name: "FreshStack (kelano86)", source: "what-if-animation" };
export const SHIMS = join(import.meta.dirname, "shims");
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };

/** The pinned copy: { repo, commit, root, studio (its studio/src), head, intact, react }. */
export function whatIfSource(root = APP_ROOT) {
  const pin = loadPins(root).whatIf;
  if (!pin) return null;
  const dir = resolve(expandEnv(pin.root));
  return { ...pin, root: dir, studio: join(dir, "studio", "src"), head: sourceHead(dir), get intact() { return this.head === pin.commit; } };
}
export const treeLink = (src, rel = "") => `https://github.com/${src.repo}/tree/${src.commit}${rel ? `/${rel}` : ""}`;

/** The author's React at its pinned version (codeLibs: react, react-dom, scheduler): { react, "react-dom", scheduler } folders for the
 *  bundle's aliases, or null when one is missing (offline assets not installed). */
export function reactDirs(root = APP_ROOT) {
  const libs = loadPins(root).codeLibs?.packages ?? {}, dir = codeLibDir(root), out = {};
  for (const name of ["react", "react-dom", "scheduler"]) {
    const p = libs[name];
    const d = p && join(dir, name, p.version);
    if (!d || !existsSync(join(d, "package.json"))) return null;
    out[name] = d;
  }
  return out;
}

// what a project gets: the engine, the studio's settings it imports, the two worked episodes (code and timing data; their sound is not
// shipped), the cast sheet (the rig at a glance)
const STAGED = ["engine", "studio.config.ts", "episodes", "CastSheet.tsx"];
/** The pinned engine in the project (.moworks/library/what-if/): a link to the pin's copy made once in the shared stage
 *  (project-service/shared-stage.mjs: runtime/stage/library/what-if@<commit>), a copy of it on a drive that takes no link. Episodes import
 *  it as "what-if" (the build's alias); the worked examples keep their own relative imports ('../../engine'). Returns { files } (what is
 *  new to the film). */
export function stageEngine(projectDir, root = APP_ROOT) {
  const src = whatIfSource(root);
  if (!src) throw Object.assign(new Error("What If is not pinned"), { code: "NOT_FOUND" });
  const dest = join(projectDir, ".moworks", "library", "what-if");
  const whole = (d) => readText(join(d, "PINNED")).trim() === src.commit && STAGED.every((rel) => existsSync(join(d, rel)) || !existsSync(join(src.studio, rel)));
  const shared = ensureShared(sharedDir(root, "library", `what-if@${src.commit}`), (to) => fillEngine(to, src), whole);
  const was = existsSync(join(dest, "PINNED"));
  if (linkOrCopy(dest, shared) === "same") return { files: [] };
  return { files: was ? [] : [".moworks/library/what-if/CREDIT.md", ".moworks/library/what-if/engine/index.ts"] };          // a copy of the same engine made a link: nothing new
}
function fillEngine(dest, src) {
  for (const rel of STAGED) if (existsSync(join(src.studio, rel))) cpSync(join(src.studio, rel), join(dest, rel), { recursive: true });
  if (existsSync(join(src.root, "LICENSE"))) cpSync(join(src.root, "LICENSE"), join(dest, "LICENSE"));
  writeFileSync(join(dest, "CREDIT.md"), `# What If animation, staged for this project\n\nBy ${AUTHOR.name}. ${treeLink(src, "studio/src")} (commit ${src.commit}), MIT.\n`
    + "The engine (engine/: anim, rig, props, kit, light, room, furnish, ui, sets, episode), the studio's settings it reads, the two worked\n"
    + "episodes (episodes/: study them, never copy them; their sound is not here) and the cast sheet. Import the engine as `what-if`\n"
    + "(the app bundles it with the author's React and its own stand-in for Remotion); never edit these files.\n");
  writeFileSync(join(dest, "PINNED"), `${src.commit}\n`);
}

// ---- the style's demo film: "Nếu Trái Đất bỗng đứng yên?", made by the app in this style (demo-what-if-giong-doc,
// rendered: the app's Voice-over by ElevenLabs, Mixkit music, the app's sound effects), kept with the app as a 1280 px MP4 and its
// poster (the title shot) in bundle/library/what-if/
export const DEMO = { id: "earth-stops", title: "Nếu Trái Đất bỗng đứng yên?", dur: 30, poster: "earth-stops.webp", video: "earth-stops.mp4",
  credit: "Made by Moworks Studio in the What If style (FreshStack's engine, MIT; Pip is the author's): the app's ElevenLabs voice-over, Mixkit music" };
/** A file of the demo (its poster or its film), or null. */
export function mediaFile(rel, root = APP_ROOT) {
  if (![DEMO.poster, DEMO.video].includes(rel)) return null;
  const f = join(root, "bundle", "library", "what-if", rel);
  return existsSync(f) ? f : null;
}

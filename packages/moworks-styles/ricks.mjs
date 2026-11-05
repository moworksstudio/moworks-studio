// R-SKILL for Ricks Clip (the owner's skill cartoon-audio-short and its source skill, owner 05/11/2026 #1065-#1073): the source skill's engine is a page that
// draws frame f (window.renderFrame(f), window.ready) from ES modules beside it: main.js (renderer, toon materials, ink, cards, post), paint.js,
// motion.js, toon.js (toon.ts, the Pen library its setup.sh fetches, then roman.js, its cast, in the same module scope: setup.sh's
// `cat web/toonbase.js web/roman.js > web/toon.js`), story.js (the film) and three.js. The app bundles them as the source skill's setup lays out a project
// (web/), into compositions/film/film.js, with esbuild:
//   film/<name>.js   the film's own files: story.js always (the shot plan, cameras, lights, actors, effects); main.js when the film rewrites the
//                    world between the source skill's markers (SKILL.md §4.3); roman.js when it adds outfits (§4.4); paint.js, motion.js when it adds to them.
//                    A file the film does not have is the source skill's, exactly as pinned (bundle/styles/moworks-styles/ricks-clip/kit/engine/)
//   ./lib/three.module.js   three.js 0.187.0, the app's default (owner #1071: the source skill's r160 code runs on the latest; the one change r160 → r187
//                    makes in the engine is below)
//   hosts/ricks.ts   the R-LEMO contract: window.render(t) draws frame round(t × fps) (a board: its seconds, one a second), window.READY once the
//                    faces are loaded (the source skill draws its carved words into canvases when the world is built) and the engine has built its world
// The port r160 → r187 (three.js release notes and the r187 build's own messages; only what touches main.js, paint.js, motion.js):
//   PCFSoftShadowMap was deprecated in r180 and removed in r186: three falls back to PCFShadowMap with a warning, so main.js asks for it
//   (its shadow.radius keeps the soft edge). Unchanged in r187 and used as shipped: outputColorSpace / SRGBColorSpace / texture.colorSpace
//   (r152), physically based lights (r155 default, useLegacyLights removed r165: the source skill already sets intensities for it), MeshToonMaterial
//   with a gradientMap, MeshDepthMaterial RGBADepthPacking, HalfFloat render targets with samples, the fog shader chunks, UniformsLib.fog,
//   linearToOutputTexel in a ShaderMaterial, ExtrudeGeometry's two material groups, CanvasTexture, DataTexture. paint.js and motion.js need
//   nothing (paint.js only makes CanvasTextures; motion.js has no three.js).
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { APP_ROOT, loadPins } from "../version-manager/index.mjs";
import { threeDir } from "../offline-assets/index.mjs";
import { transcriptWords } from "./build.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), HOST = join(HERE, "hosts", "ricks.ts");
export const FILM_DIR = "film", OUT = "compositions/film/film.js";
export const THREE = () => loadPins().three.default;
/** The r160 → r187 port, applied to main.js wherever it comes from (the source skill's, or a film's copy of it). */
export const PORT = [[/\bTHREE\.PCFSoftShadowMap\b/g, "THREE.PCFShadowMap"]];
export const port = (text) => PORT.reduce((s, [re, to]) => s.replace(re, to), String(text));
const ENGINE = ["main.js", "paint.js", "motion.js", "roman.js"];

/** The pinned source skill's folder (bundle/styles/moworks-styles/ricks-clip): { dir, engine, toon } or null. */
export function ricksSkill(root = APP_ROOT) {
  const pin = loadPins(root).moworksStyles, k = pin?.sources?.["ricks-clip"];
  if (!k) return null;
  const dir = join(String(pin.root).replace("{app}", root), k.dir);
  return { dir, engine: join(dir, "kit", "engine"), toon: join(dir, "kit", "vendor", "toon.ts"), pin: k };
}

/** The app's cast layer (ricks-cast.js): the three views and the pose layer, in toon.js's module scope. */
export const CAST_LAYER = join(HERE, "ricks-cast.js");
/** A film's characters from the library: film/cast/<id>.js, in id order. */
export const castFiles = (film) => (existsSync(join(film, "cast")) ? readdirSync(join(film, "cast")).filter((n) => /^[a-z][a-z0-9-]*\.js$/.test(n)).sort().map((n) => join(film, "cast", n)) : []);
/** toon.js as one module's text: toon.ts (as pinned), roman.js (the source skill's, or the film's own copy), the app's cast layer, then each character
 *  file, each part marked with where it comes from. */
export function toonText({ root = APP_ROOT, roman = null, cast = [] } = {}) {
  const src = ricksSkill(root);
  if (!src) throw Object.assign(new Error("The Ricks Clip source skill is not pinned"), { code: "NOT_FOUND" });
  const part = (label, file) => `\n// ---- ${label}\n${readFileSync(file, "utf8")}\n`;
  return readFileSync(src.toon, "utf8") + part("roman.js", roman ?? join(src.engine, "roman.js")) + part("the app's cast layer (ricks-cast.js)", CAST_LAYER)
    + cast.map((f) => part(`character ${f.split(/[\\/]/).pop()}`, f)).join("");
}

const newest = (paths, skip) => {
  let m = 0;
  const walk = (x) => { let s; try { s = statSync(x); } catch { return; } if (s.isDirectory()) { for (const n of readdirSync(x)) walk(join(x, n)); } else if (x !== skip) m = Math.max(m, s.mtimeMs); };
  for (const p of paths) walk(p);
  return m;
};

/** Bundle a Ricks Clip film (or a board: filmDir and out inside boards/<X>/) when its story.js exists and the bundle is older than its sources.
 *  Returns null (no film yet) or { built, out, three, own: [the film's own files], error? }. */
export async function buildRicksFilm(projectDir, { root = APP_ROOT, force = false, filmDir = FILM_DIR, out: outRel = OUT } = {}) {
  const film = join(projectDir, ...filmDir.split("/"));
  if (!existsSync(join(film, "story.js"))) return null;
  const src = ricksSkill(root);
  if (!src || !existsSync(join(src.engine, "main.js")) || !existsSync(src.toon)) return { built: false, out: outRel, three: null, own: [], error: "The Ricks Clip source skill is not pinned (config/pins.json moworksStyles ricks-clip)" };
  const version = loadPins(root).three.default, three = join(threeDir(root), version, "build", "three.module.min.js");
  if (!existsSync(three)) return { built: false, out: outRel, three: version, own: [], error: `three.js ${version} is not installed (offline assets)` };
  const out = join(projectDir, ...outRel.split("/"));
  const own = readdirSync(film).filter((n) => /\.js$/.test(n)).sort();
  const latest = newest([film, src.engine, src.toon, HOST, CAST_LAYER, fileURLToPath(import.meta.url), join(projectDir, "transcript.json")], out);
  if (!force && existsSync(out) && statSync(out).mtimeMs >= latest) return { built: false, out: outRel, three: version, own };
  const pick = (name) => (existsSync(join(film, name)) ? join(film, name) : join(src.engine, name));
  const fromFilm = (p) => p.startsWith(src.engine) || p.startsWith(film);
  const plugin = { name: "moworks-ricks", setup(b) {
    b.onResolve({ filter: /^mw-film-main$/ }, () => ({ path: pick("main.js") }));
    b.onResolve({ filter: /^\.\/lib\/three\.module\.js$/ }, (a) => (fromFilm(a.importer) ? { path: three } : undefined));
    b.onResolve({ filter: /^\.\/toon\.js$/ }, (a) => (fromFilm(a.importer) ? { path: "toon.js", namespace: "rc-toon" } : undefined));
    // the voice's words, from the project's transcript: [{ word, start, end }] seconds, in the order spoken
    b.onResolve({ filter: /^\.\/words\.js$/ }, (a) => (fromFilm(a.importer) && !existsSync(join(film, "words.js")) ? { path: "words.js", namespace: "rc-words" } : undefined));
    b.onLoad({ filter: /.*/, namespace: "rc-words" }, () => { const w = JSON.stringify(transcriptWords(projectDir)); return { loader: "js", contents: `export const WORDS = ${w};\nexport default WORDS;\n` }; });
    b.onResolve({ filter: /^\.\/[\w.-]+\.js$/ }, (a) => {
      if (!fromFilm(a.importer)) return undefined;
      const name = a.path.slice(2);
      if (name === "story.js") return { path: join(film, "story.js") };
      const p = pick(name);
      return existsSync(p) ? { path: p } : { errors: [{ text: `${name} is neither the film's (${filmDir}/${name}) nor the source skill's engine` }] };
    });
    // toon.js: the Pen library (types stripped) and the cast in one module scope, as setup.sh builds it, then the app's cast layer (three views,
    // one pose layer) and the film's characters from the library (film/cast/<id>.js, packages/character-kit/ricks.mjs)
    b.onLoad({ filter: /.*/, namespace: "rc-toon" }, () => ({ loader: "ts", resolveDir: src.engine, contents: toonText({ root, roman: pick("roman.js"), cast: castFiles(film) }) }));
    b.onLoad({ filter: /[\\/]main\.js$/ }, (a) => (fromFilm(a.path) ? { loader: "js", contents: port(readFileSync(a.path, "utf8")) } : undefined));
  } };
  mkdirSync(dirname(out), { recursive: true });
  try {
    await build({ absWorkingDir: projectDir, entryPoints: [HOST], outfile: out, bundle: true, format: "iife", platform: "browser", target: "es2022",
      minifyWhitespace: true, minifyIdentifiers: true, legalComments: "none", logLevel: "silent", plugins: [plugin] });
    const k = src.pin, v = k.vendor?.["kit/vendor/toon.ts"] ?? {};
    const banner = `/* Ricks Clip by Moworks Studio (the owner's own skill ${k.skill}, sha256 ${String(k.sha256).slice(0, 12)}; its code ${String(k.zipSha256).slice(0, 12)}); toon.ts by Mr omi, `
      + `MIT, https://github.com/${v.repo}/blob/${v.commit}/${v.path}; three.js ${version} (MIT); bundled by Moworks Studio; the film's own: ${own.join(", ")} */\n`;
    writeFileSync(out, banner + readFileSync(out, "utf8"));
    return { built: true, out: outRel, three: version, own };
  } catch (e) {
    return { built: false, out: outRel, three: version, own, error: (e.errors ?? []).map((x) => `${x.location?.file ? relative(projectDir, x.location.file).replaceAll("\\", "/") : ""}:${x.location?.line ?? ""} ${x.text}`).join("; ").slice(0, 600) || String(e.message).slice(0, 600) };
  }
}
/** The source skill's engine files a film starts from (to copy into film/ when it changes one): the pinned copy, main.js with the r187 port. */
export function engineFile(name, root = APP_ROOT) {
  if (!ENGINE.includes(name)) throw Object.assign(new Error(`${name}: not one of the engine's files (${ENGINE.join(", ")})`), { code: "NOT_FOUND" });
  const text = readFileSync(join(ricksSkill(root).engine, name), "utf8");
  return name === "main.js" ? port(text) : text;
}
export const ENGINE_FILES = ENGINE;

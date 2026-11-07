// R-SKILL for the owner's Remotion styles (Paper Collage, Stickman Explainer, Inner Voice Short, 3D Cartoon): the project's composition
// (src/videos/film/Video.tsx, laid out as the source skill lays out a video: src/videos/<slug>/, so the source skill's own relative imports work as shipped) is
// bundled with the source skill's code exactly as pinned (bundle/styles/moworks-styles/<source>/src: a file the project does not have is the source skill's), the
// author's React (codeLibs, the What If pin), three.js 0.187.0 (the default, #1071) for the 3D Cartoon, and the app's stand-in for Remotion (the What If bridge:
// what-if-styles/shims; staticFile and @remotion/paths from hosts/) into one page script, compositions/film/film.js. The film's index.html
// loads it beside <div id="stage">; R-LEMO drives it (window.render(t), READY). No Remotion package anywhere, no new bridge.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { APP_ROOT, loadPins } from "../version-manager/index.mjs";
import { threeDir } from "../offline-assets/index.mjs";
import { SHIMS, reactDirs } from "../what-if-styles/index.mjs";
import { familyOf, googleFontModule } from "../hf-edit/whatIfBuild.mjs";
import { TWINS } from "./fonts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), HOSTS = join(HERE, "hosts");
/** The app's camera timed to words (owner #1267, audit/111 H1): `import { camOnWords } from "mw:camtime"` in a 3D Cartoon film's shots.ts. */
export const CAMTIME = join(HERE, "camtime.js");
/** The 3D Cartoon's collision module as a film imports it: the source skill's, with the app's held-prop check beside it (owner #1267, hosts/held.ts). */
export const HELD_STYLE = "cartoon-3d", HELD_HOST = join(HOSTS, "collision.tsx");
/** The app's cast layer for the 3D Cartoon (MW Character Sheet v1, owner #1287-#1293): `import { setFace, POINT, WAVE } from "mw:c3d-cast"`. */
export const C3D_CAST = join(HERE, "c3d-cast.ts");
export const ENTRY = "src/videos/film/Video.tsx", OUT = "compositions/film/film.js";
export const THREE = "0.187.0";
const EXT = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.js"];
const resolveFile = (p) => { for (const s of EXT) if (existsSync(p + s) && statSync(p + s).isFile()) return p + s; return null; };
const inside = (dir, p) => { const r = relative(dir, p); return !!r && !r.startsWith("..") && !/^[a-zA-Z]:/.test(r); };

/** The newest change among files (folders walked), skipping `skip`. */
function newest(paths, skip) {
  let m = 0;
  const walk = (x) => { let s; try { s = statSync(x); } catch { return; } if (s.isDirectory()) { for (const n of readdirSync(x)) if (n !== "node_modules") walk(join(x, n)); } else if (x !== skip) m = Math.max(m, s.mtimeMs); };
  for (const p of paths) walk(p);
  return m;
}

/** Bundle a film (or a board: entry and out inside boards/<X>/) of an owner's style when its entry exists and the bundle is older than its sources.
 *  style: { id, source, three }. Returns null (no film) or { built, out, families (the faces the film's code asked for that R-FONTS installs),
 *  twinned (the source skill's faces drawn by a Vietnamese twin), error? }. */
export async function buildStyleFilm(projectDir, style, { root = APP_ROOT, force = false, entry: entryRel = ENTRY, out: outRel = OUT } = {}) {
  const entry = join(projectDir, ...entryRel.split("/"));
  if (!existsSync(entry)) return null;
  const pin = loadPins(root).moworksStyles, skillSrc = join(pin?.root ?? join(root, "bundle", "styles", "moworks-styles"), pin?.sources?.[style.source]?.dir ?? style.source, "src");
  if (!existsSync(skillSrc)) return { built: false, out: outRel, families: [], twinned: [], error: `The ${style.source} source skill is not pinned (config/pins.json moworksStyles)` };
  const react = reactDirs(root);
  if (!react) return { built: false, out: outRel, families: [], twinned: [], error: "The author's React is not installed (offline assets: react, react-dom, scheduler)" };
  const out = join(projectDir, ...outRel.split("/"));
  // the film's own src/ (the project's, or a board's own copy beside it): a relative import that leaves it for a file it does not have is the source skill's
  const srcRoot = (() => { let d = dirname(entry); while (inside(projectDir, d) && d.split(sep).pop() !== "src") d = dirname(d); return d.split(sep).pop() === "src" ? d : join(projectDir, "src"); })();
  const words = join(projectDir, "transcript.json");
  const latest = newest([srcRoot, skillSrc, HOSTS, SHIMS, CAMTIME, C3D_CAST, words], out);
  if (!force && existsSync(out) && statSync(out).mtimeMs >= latest) return { built: false, out: outRel, ...readBanner(out) };
  const families = new Set(), twinned = new Set();
  const three = style.three ? join(threeDir(root), THREE) : null;
  const plugin = { name: "moworks-style", setup(b) {
    b.onResolve({ filter: /^mw-film$/ }, () => ({ path: entry }));
    b.onResolve({ filter: /^remotion$/ }, () => ({ path: join(HOSTS, "remotion.ts") }));
    b.onResolve({ filter: /^mw-remotion-shim$/ }, () => ({ path: join(SHIMS, "remotion.tsx") }));
    b.onResolve({ filter: /^@remotion\/paths$/ }, () => ({ path: join(HOSTS, "paths.ts") }));
    b.onResolve({ filter: /^@remotion\/fonts$/ }, () => ({ path: join(SHIMS, "fonts.ts") }));
    b.onResolve({ filter: /^@remotion\/google-fonts\// }, (a) => { const f = familyOf(a.path); (TWINS[f] ? twinned : families).add(f); return { path: f, namespace: "style-google-font" }; });
    b.onLoad({ filter: /.*/, namespace: "style-google-font" }, (a) => ({ loader: "js", contents: googleFontModule(a.path) }));
    b.onResolve({ filter: /^@remotion\// }, (a) => ({ errors: [{ text: `${a.path} is not available in a Moworks film (no Remotion package): use the source skill's own code` }] }));
    // the voice's words, from the project's transcript: [{ word, start, end }] in the order spoken
    b.onResolve({ filter: /^mw:words$/ }, () => ({ path: "words", namespace: "style-words" }));
    b.onResolve({ filter: /^mw:camtime$/ }, () => ({ path: CAMTIME }));
    b.onLoad({ filter: /.*/, namespace: "style-words" }, () => ({ loader: "js", contents: `export default ${JSON.stringify(transcriptWords(projectDir))};\nexport const WORDS = ${JSON.stringify(transcriptWords(projectDir))};\n` }));
    if (three) {
      b.onResolve({ filter: /^three$/ }, () => ({ path: join(three, "build", "three.module.min.js") }));
      b.onResolve({ filter: /^three\/addons\// }, (a) => { const p = join(three, "examples", "jsm", ...a.path.slice("three/addons/".length).split("/")); return existsSync(p) ? { path: p } : { errors: [{ text: `${a.path} is not in three.js ${THREE} (config/pins.json three)` }] }; });
    }
    // the 3D Cartoon's collision module: the source skill's, as shipped, behind the app's held-prop check (hosts/collision.tsx, #1267)
    const skillCollision = join(skillSrc, "kit", "collision.tsx"), held = style.id === HELD_STYLE && existsSync(skillCollision);
    if (held) b.onResolve({ filter: /^mw-skill-collision$/ }, () => ({ path: skillCollision }));
    const own = (p) => (held && p === skillCollision ? HELD_HOST : p);
    // a 3D Cartoon character from the library (src/videos/film/cast/<id>.ts, owner #1267) imports the source skill's kit by name: "cartoon-3d/kit/…"
    // (the film's own copy of a kit file first, as a relative import finds it)
    if (style.id === HELD_STYLE) b.onResolve({ filter: /^cartoon-3d\/kit\// }, (a) => {
      const rest = a.path.slice("cartoon-3d/".length), k = resolveFile(join(srcRoot, rest)) ?? resolveFile(join(skillSrc, rest));
      return k ? { path: own(k) } : { errors: [{ text: `${a.path} is not in the 3D Cartoon source skill's kit (src/kit/)` }] };
    });
    if (style.id === HELD_STYLE) b.onResolve({ filter: /^mw:c3d-cast$/ }, () => ({ path: C3D_CAST }));
    b.onResolve({ filter: /^\.\.?\// }, (a) => {
      if (a.namespace !== "file" || !a.importer) return undefined;
      const want = resolve(a.resolveDir, a.path);
      if (resolveFile(want)) return { path: own(resolveFile(want)) };
      if (inside(srcRoot, want) || want === srcRoot) { const k = resolveFile(join(skillSrc, relative(srcRoot, want))); if (k) return { path: own(k) }; }
      return undefined;
    });
  } };
  mkdirSync(dirname(out), { recursive: true });
  try {
    await build({
      absWorkingDir: projectDir, entryPoints: [join(HOSTS, "host.tsx")], outfile: out, bundle: true, format: "iife", platform: "browser", target: "es2022",
      minifyWhitespace: true, minifyIdentifiers: true, legalComments: "none", jsx: "automatic", logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"', __MW_STYLE__: JSON.stringify(style.id) }, alias: react, plugins: [plugin],
    });
    const reactVersion = JSON.parse(readFileSync(join(react.react, "package.json"), "utf8")).version;
    const k = pin?.sources?.[style.source] ?? {};
    const banner = `/* ${k.title ?? style.source} ${k.version ?? ""} by Moworks Studio (the owner's own source skill, sha256 ${String(k.sha256 ?? "").slice(0, 12)}); React ${reactVersion} (MIT, Meta)${three ? `; three.js ${THREE} (MIT)` : ""}; bundled by Moworks Studio; fonts: ${[...families].sort().join(", ")}; twinned: ${[...twinned].sort().join(", ")} */\n`;
    // React's production error text names a docs page: words, never loaded, but the offline gate (G-REMOTE) reads a quoted URL as a load
    writeFileSync(out, banner + readFileSync(out, "utf8").replace(/https:\/\/react\.dev\/errors\//g, "react.dev/errors/").replace(/https:\/\/reactjs\.org\/docs\/error-decoder\.html/g, "reactjs.org/docs/error-decoder.html"));
    return { built: true, out: outRel, families: [...families].sort(), twinned: [...twinned].sort() };
  } catch (e) {
    return { built: false, out: outRel, families: [...families].sort(), twinned: [...twinned].sort(), error: (e.errors ?? []).map((x) => `${x.location?.file ? relative(projectDir, x.location.file) : ""}:${x.location?.line ?? ""} ${x.text}`).join("; ").slice(0, 600) || String(e.message).slice(0, 600) };
  }
}

/** The voice's words from the project's transcript.json: [{ word, start, end }]. */
export function transcriptWords(projectDir) {
  let t = null; try { t = JSON.parse(readFileSync(join(projectDir, "transcript.json"), "utf8")); } catch { return []; }
  const list = Array.isArray(t) ? t : Array.isArray(t?.words) && t.words.length ? t.words : (t?.segments ?? []).flatMap((s) => s.words ?? []);
  return list.map((w) => ({ word: String(w.word ?? w.text ?? "").trim(), start: Number(w.start), end: Number(w.end) })).filter((w) => w.word && Number.isFinite(w.start) && Number.isFinite(w.end));
}
function readBanner(out) {
  const head = readFileSync(out, "utf8").slice(0, 900), list = (re) => (re.exec(head)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return { families: list(/fonts: ([^;*]*)/), twinned: list(/twinned: ([^*]*) \*\//) };
}

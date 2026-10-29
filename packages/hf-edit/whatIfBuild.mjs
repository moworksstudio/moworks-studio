// R-WHATIF: a What If film in a project is the author's way, an episode module (whatif/episode.tsx: export default
// defineEpisode(...), its shots and timeline beside it) on the pinned engine (staged in .moworks/library/what-if, imported as "what-if").
// finalize bundles the app's host page (what-if-styles/shims/host.tsx) with that module, the author's React (19.0.0) and the app's
// stand-in for Remotion into one page script, compositions/whatif/film.js; the film's index.html loads it beside a <div id="stage">, and
// the app's bridge (lemoPage.mjs, R-LEMO) calls window.render(t) by HyperFrames' time. No Remotion package anywhere.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { build } from "esbuild";
import { APP_ROOT } from "../version-manager/index.mjs";
import { SHIMS, reactDirs, stageEngine, whatIfSource } from "../what-if-styles/index.mjs";

export const ENTRY = "whatif/episode.tsx", OUT = "compositions/whatif/film.js";

/** "@remotion/google-fonts/BricolageGrotesque" → "Bricolage Grotesque" (the package names each family by its name without spaces). */
export const familyOf = (spec) => String(spec.split("/").pop()).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
const resolveTs = (p) => { for (const s of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) if (existsSync(p + s) && statSync(p + s).isFile()) return p + s; return null; };

/** Bundle the project's What If film (or a board: data-whatif="board" on the same bundle) when it has one and the bundle is older than its
 *  sources. Returns null (no film) or { built, out, families (Google faces the film asked for), error? }. */
export async function buildWhatIf(projectDir, { root = APP_ROOT, force = false, entry: entryRel = ENTRY, out: outRel = OUT } = {}) {
  const entry = join(projectDir, ...entryRel.split("/"));
  if (!existsSync(entry)) return null;
  const src = whatIfSource(root);
  if (!src) return { built: false, out: outRel, families: [], error: "What If is not pinned (config/pins.json whatIf)" };
  const react = reactDirs(root);
  if (!react) return { built: false, out: outRel, families: [], error: "The author's React is not installed (offline assets: react, react-dom, scheduler)" };
  stageEngine(projectDir, root);
  const out = join(projectDir, ...outRel.split("/")), lib = join(projectDir, ".moworks", "library", "what-if");
  const newest = (d) => { let m = 0; const walk = (x) => { for (const n of readdirSafe(x)) { const p = join(x, n), s = statSync(p); if (s.isDirectory()) walk(p); else if (p !== out) m = Math.max(m, s.mtimeMs); } }; walk(d); return m; };
  const sources = [dirname(entry), join(lib, "PINNED"), SHIMS];
  const latest = Math.max(...sources.map((p) => { try { return statSync(p).isDirectory() ? newest(p) : statSync(p).mtimeMs; } catch { return 0; } }));
  if (!force && existsSync(out) && statSync(out).mtimeMs >= latest) return { built: false, out: outRel, families: readFamilies(out) };
  const families = new Set();
  const plugin = { name: "what-if", setup(b) {
    b.onResolve({ filter: /^wi-film$/ }, () => ({ path: entry }));
    b.onResolve({ filter: /^remotion$/ }, () => ({ path: join(SHIMS, "remotion.tsx") }));
    b.onResolve({ filter: /^@remotion\/fonts$/ }, () => ({ path: join(SHIMS, "fonts.ts") }));
    b.onResolve({ filter: /^@remotion\/google-fonts\// }, (a) => { const f = familyOf(a.path); families.add(f); return { path: f, namespace: "wi-google-font" }; });
    b.onLoad({ filter: /.*/, namespace: "wi-google-font" }, (a) => ({ loader: "js", contents: googleFontModule(a.path) }));
    b.onResolve({ filter: /^@remotion\// }, (a) => ({ errors: [{ text: `${a.path} is not available in a Moworks film (no Remotion package): use the engine's own calls` }] }));
    b.onResolve({ filter: /^what-if(\/.*)?$/ }, (a) => {
      const p = resolveTs(join(lib, "engine", ...a.path.slice("what-if".length).split("/").filter(Boolean)));
      return p ? { path: p } : { errors: [{ text: `${a.path}: no such file in the engine` }] };
    });
  } };
  mkdirSync(dirname(out), { recursive: true });
  try {
    await build({
      absWorkingDir: projectDir, entryPoints: [join(SHIMS, "host.tsx")], outfile: out, bundle: true, format: "iife", platform: "browser", target: "es2020",
      // whitespace and names only: full minification renames what finalize looks for (R-LEMO: window.render = ..., window.READY = true)
      minifyWhitespace: true, minifyIdentifiers: true, legalComments: "none", jsx: "automatic", logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' }, alias: react, plugins: [plugin],
    });
    // the credit (and the faces the film asked for, read again when the bundle is reused); React's production error text names a docs
    // page: words, never loaded, but the offline gate (G-REMOTE) reads a quoted URL in a film's script as a load: the scheme goes
    const reactVersion = JSON.parse(readFileSync(join(react.react, "package.json"), "utf8")).version;
    const banner = `/* What If animation engine by FreshStack (kelano86), MIT: https://github.com/${src.repo}/tree/${src.commit}; React ${reactVersion} (MIT, Meta); bundled by Moworks Studio; fonts: ${[...families].sort().join(", ")} */\n`;
    writeFileSync(out, banner + readFileSync(out, "utf8").replace(/https:\/\/react\.dev\/errors\//g, "react.dev/errors/").replace(/https:\/\/reactjs\.org\/docs\/error-decoder\.html/g, "reactjs.org/docs/error-decoder.html"));
    return { built: true, out: outRel, families: [...families].sort() };
  } catch (e) {
    return { built: false, out: outRel, families: [...families].sort(), error: (e.errors ?? []).map((x) => `${x.location?.file ?? ""}:${x.location?.line ?? ""} ${x.text}`).join("; ").slice(0, 600) || String(e.message).slice(0, 600) };
  }
}
/** One @remotion/google-fonts/<Family> module: loadFont answers the family's name (the app installs its files). */
export const googleFontModule = (family) => `export const loadFont = () => ({ fontFamily: ${JSON.stringify(family)}, loaded: Promise.resolve(), waitUntilDone: () => Promise.resolve() });
export const getInfo = () => ({ fontFamily: ${JSON.stringify(family)} });\n`;
/** The Google families a built bundle asked for (its banner). */
function readFamilies(out) { const m = /fonts: ([^*]*) \*\//.exec(readFileSync(out, "utf8").slice(0, 600)); return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : []; }
function readdirSafe(d) { try { return existsSync(d) ? readdirSync(d) : []; } catch { return []; } }

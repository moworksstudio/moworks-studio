// R-ANIDOODLE: an anidoodle film in a project is TypeScript the author's way: a film module (export const <name>: Film) and
// a host entry, anidoodle/page.ts, that calls the engine's mountFilm(film). finalize bundles that entry with the pinned engine (staged in
// .moworks/library/anidoodle/engine/src, imported as "anidoodle/...") into one page script, compositions/anidoodle/film.js, which sets
// window.FILM (ready, mount, seek(frame), meta); the film's index.html loads it beside a <canvas id="film">, and the app's bridge
// (lemoPage.mjs) seeks FILM by HyperFrames' time. Same bundle settings as the author's own page builder (engine/tools/build-page.mjs:
// iife, es2020, minified).
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { build } from "esbuild";
import { APP_ROOT } from "../version-manager/index.mjs";
import { anidoodleSource, stageEngine } from "../anidoodle-styles/index.mjs";

export const ENTRY = "anidoodle/page.ts", OUT = "compositions/anidoodle/film.js";

/** Bundle the project's anidoodle film (or a storyboard board's: entry boards/<X>/page.ts, out boards/<X>/film.js) when it has one and
 *  the bundle is older than its sources. Returns null (no film) or { built, out, error? }. */
export async function buildAnidoodle(projectDir, { root = APP_ROOT, force = false, entry: entryRel = ENTRY, out: outRel = OUT } = {}) {
  const entry = join(projectDir, ...entryRel.split("/"));
  if (!existsSync(entry)) return null;
  const src = anidoodleSource(root);
  if (!src) return { built: false, out: outRel, error: "anidoodle is not pinned (config/pins.json)" };
  stageEngine(projectDir, root);
  const out = join(projectDir, ...outRel.split("/"));
  const newest = (d) => { let m = 0; const walk = (x) => { for (const n of readdirSafe(x)) { const p = join(x, n), s = statSync(p); if (s.isDirectory()) walk(p); else if (p !== out) m = Math.max(m, s.mtimeMs); } }; walk(d); return m; };
  // what the bundle is made of: the entry's folder, the film's own modules a board imports (a fix in anidoodle/*.ts once never reached
  // boards/X/film.js), and the staged engine's pin
  const sources = [dirname(entry), join(projectDir, "anidoodle"), join(projectDir, ".moworks", "library", "anidoodle", "PINNED")];
  const latest = Math.max(...sources.map((p) => { try { return statSync(p).isDirectory() ? newest(p) : statSync(p).mtimeMs; } catch { return 0; } }));
  if (!force && existsSync(out) && statSync(out).mtimeMs >= latest) return { built: false, out: outRel };
  mkdirSync(dirname(out), { recursive: true });
  try {
    await build({
      absWorkingDir: projectDir, entryPoints: [entry], outfile: out, bundle: true, format: "iife", target: "es2020", minify: true, legalComments: "none",
      alias: { anidoodle: "./.moworks/library/anidoodle/engine/src" }, logLevel: "silent",
      banner: { js: `/* anidoodle engine by Alex Greenshpun (10x Company), Apache-2.0 with NOTICE: https://github.com/${src.repo}/tree/${src.commit}; bundled by Moworks Studio */` },
    });
    return { built: true, out: outRel };
  } catch (e) {
    return { built: false, out: outRel, error: (e.errors ?? []).map((x) => `${x.location?.file ?? ""}:${x.location?.line ?? ""} ${x.text}`).join("; ").slice(0, 600) || String(e.message).slice(0, 600) };
  }
}
function readdirSafe(d) { try { return existsSync(d) ? readdirSync(d) : []; } catch { return []; } }

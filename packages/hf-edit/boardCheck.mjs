// Board stills that come out black. HF's snapshot serves a board's own folder (boards/A) as its web root and says nothing when a
// file fails to load: an import that climbs out of the folder ("../engine.js") is read as boards/A/engine.js, is not there, the module
// never runs and every still is one colour (seen in a first draft). The app reads the board's local references (the page, the
// import map and the scripts it imports) and the stills it took, and says what it found: a reference that lands on no file, and the
// stills that are one colour, whatever the cause (a black still is caught even when every file is there).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { stillStd } from "../hf-qa/gates.mjs";

const FLAT = 2;          // the G-BLANK threshold: grey-level standard deviation of a 320 px wide still
const SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;          // data:, blob:, http(s):, "//" and "#": not a local file
const JS_REFS = [/\bimport\s*(?:[\w*{}\s,$]+?\s*from\s*)?(["'])([^"'\n]+)\1/g, /\bexport\s*[\w*{}\s,$]+?\s*from\s*(["'])([^"'\n]+)\1/g, /\bimport\s*\(\s*(["'])([^"'\n]+)\1\s*\)/g];
const PAGE_REFS = [/\b(?:src|href)\s*=\s*(["'])([^"']+)\1/g, /url\(\s*(["']?)([^"')]+)\1\s*\)/g];

const isFile = (f) => { try { return statSync(f).isFile(); } catch { return false; } };
const importMap = (html) => {
  try { return JSON.parse(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1] ?? "{}").imports ?? {}; } catch { return {}; }
};
/** A bare specifier through the page's import map ("three" → its file, "three/addons/x.js" → by the longest "…/" key), or null. */
function mapped(spec, map) {
  if (map[spec]) return map[spec];
  const key = Object.keys(map).filter((k) => k.endsWith("/") && spec.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return key ? map[key] + spec.slice(key.length) : null;
}

/** The board's local references that land on no file when its folder is the web root (as HF's snapshot serves it; "assets/…" is the
 *  project's assets, which the app links there for the snapshot). Returns [{ file, ref, servedAs, outside }], paths relative to the
 *  project; outside = the reference climbs out of the board's folder. */
export function missingRefs(projectDir, boardRel) {
  const boardDir = join(projectDir, ...boardRel.split("/"));
  const page = join(boardDir, "index.html");
  if (!isFile(page)) return [];
  const html = readFileSync(page, "utf8"), map = importMap(html);
  const found = [], seen = new Set();
  const served = (rel) => isFile(join(boardDir, ...rel.split("/"))) || (rel.startsWith("assets/") && !existsSync(join(boardDir, "assets")) && isFile(join(projectDir, ...rel.split("/"))));
  const visit = (file, text, patterns, { js }) => {
    const fileRel = relative(boardDir, file).split(sep).join("/");
    for (const re of patterns) for (const m of text.matchAll(re)) {
      let ref = m[2].trim(), base = fileRel;
      if (!ref || SCHEME.test(ref)) continue;
      // a bare import is a name in the import map, whose paths are the page's; a bare src/href/url is a path
      if (js && !/^\.{0,2}\//.test(ref)) { ref = mapped(ref, map); base = "index.html"; if (!ref || SCHEME.test(ref)) continue; }
      const path = ref.split(/[?#]/)[0];
      const rel = decodeURIComponent(new URL(path, `http://board/${base}`).pathname.slice(1));          // the browser stops "../" at the root
      const linked = rel.startsWith("assets/");          // the project's assets, linked into the board for the snapshot
      const outside = !linked && relative(boardDir, resolve(boardDir, base, "..", path)).startsWith("..");
      if (!served(rel)) found.push({ file: `${boardRel}/${fileRel}`, ref: m[2].trim(), servedAs: linked ? rel : `${boardRel}/${rel}`, outside });
      else if (/\.m?js$/i.test(rel) && !rel.startsWith("assets/") && !seen.has(rel)) {          // the board's own scripts: what they import
        seen.add(rel);
        const f = join(boardDir, ...rel.split("/"));
        visit(f, readFileSync(f, "utf8"), JS_REFS, { js: true });
      }
    }
  };
  visit(page, html, JS_REFS, { js: true });
  visit(page, html, PAGE_REFS, { js: false });
  const key = (x) => `${x.file}\u0000${x.ref}`;
  return found.filter((x, i) => found.findIndex((y) => key(y) === key(x)) === i);
}

/** The stills that are one colour: [{ still, std }] (std rounded to 0.1). */
export function flatStills(files) {
  return files.map((f) => ({ still: f, std: Math.round(stillStd(f) * 10) / 10 })).filter((x) => x.std < FLAT);
}

/** One line for Claude about an option's stills, or null when they hold: every still one colour (a problem: the stills failed), or
 *  some (said, not a failure: a fade from black is one colour too), and the references that land on no file. */
export function stillsProblem(projectDir, boardRel, stills) {
  const missing = missingRefs(projectDir, boardRel), flat = flatStills(stills);
  if (!missing.length && !flat.length) return null;
  const all = stills.length > 0 && flat.length === stills.length;
  const frames = flat.map((x) => Number(/frame-(\d+)-/.exec(x.still)?.[1]) + 1).filter(Number.isFinite);
  const parts = [];
  if (all) parts.push(`every still is one colour (${flat.length} of ${stills.length}): nothing drew`);
  else if (flat.length) parts.push(`frame(s) ${frames.join(", ")} one colour (fine if the frame is meant to be blank, e.g. a fade from black)`);
  for (const x of missing.slice(0, 6)) parts.push(`${x.file} loads "${x.ref}", which the stills read as ${x.servedAs}: there is no such file${x.outside ? ` (a board sees only its own folder: keep the file inside ${boardRel})` : ""}`);
  if (missing.length > 6) parts.push(`and ${missing.length - 6} more missing file(s)`);
  return { failed: all || missing.length > 0, message: parts.join("; "), missing, flat };
}

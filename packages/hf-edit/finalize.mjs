// finalize(projectDir): the Moworks rules applied to a HyperFrames project before preview / render. Idempotent.
//  R-CSP     root document gets a Content-Security-Policy meta: only same-origin, data: and blob:
//  R-RUNTIME root document loads the pinned HF runtime from assets/_app/vendor (offline preview; render unchanged)
//  R-FONTS   every composition file declares @font-face for each bundled family it uses (config/fonts.json, downloaded from google/fonts,
//            packages/offline-assets; the project folder: assets/_app/fonts/kit) (HF lint wants the declaration
//            in the file that uses the family)
//  R-BG      opaque backgrounds of full-frame containers move to their own composited layer, so text never paints into an opaque
//            layer (no LCD fringes, no blur)
//  R-MOTIONPATH root document loads GSAP's MotionPathPlugin from assets/_app/vendor: HyperFrames Studio fetches it from jsDelivr unless the
//            film has it, which R-CSP blocks
//  R-VENDOR  a CDN URL of a pinned library (GSAP, three.js, clipper-lib, the Draco decoder, a fontsource face of a bundled family) in a
//            composition or one of the film's own scripts becomes the app's local copy; Google Fonts stylesheet links go, R-FONTS declares
//            the families instead (packages/hf-edit/vendorLibs.mjs)
//  R-ANIDOODLE an anidoodle film or board (anidoodle/page.ts, boards/X/page.ts) is bundled with the pinned engine (anidoodleBuild.mjs)
//  R-WHATIF  a What If film (whatif/episode.tsx) is bundled with the pinned engine, the author's React and the app's stand-in for Remotion
//            (whatIfBuild.mjs); the Google faces it asks for are named in index.html so R-FONTS installs them
//  R-LEMO    a code-film page (lemo, mg-styles-15, anidoodle: render(t) / renderAt(t) / window.FILM) gets the bridge to HyperFrames' timeline,
//            each source's three.js version and library files made local (packages/hf-edit/lemoPage.mjs); the character kit's pages
//            (renderAt(t), __ready) the same way
//  R-CAST    a Brush cartoon film or board gets the character kit (never clawd.js) and cast.js, the project's CHARACTERS.json (character-kit)
//  R-CLAWD   a film that draws Clawd (Anthropic's mascot, the character layer's demo only) is refused (packages/character-kit)
//  R-THREE   a film that uses three.js gets the pinned versions in assets/_app/vendor/three and, in its root document, the import map
//            'three' / 'three/addons/' (the default version) and three@<version>
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { fetchGoogleFamily, installGoogleFamily, slug } from "./googleFonts.mjs";
import { installViFamily, placeViFamily } from "./googleFontsVi.mjs";
import { fontsDir, motionPathFile } from "../offline-assets/index.mjs";
import { rewriteRemoteLibs, rewriteScripts, scriptFiles, threeIn, vendorInto, withThreeMap } from "./vendorLibs.mjs";
import { lemoBoard, lemoFilm } from "./lemoPage.mjs";
import { buildAnidoodle } from "./anidoodleBuild.mjs";
import { buildWhatIf } from "./whatIfBuild.mjs";
import { clawdIn, refreshFilmKit } from "../character-kit/index.mjs";

/** A What If film draws its text in SVG from script, where R-FONTS cannot see the faces: name each one in the page (one rule per family,
 *  so every family is served, not only a stack's first) in a style block the app owns and rewrites. */
export function whatIfFaces(projectDir, families, page = "index.html") {
  const file = join(projectDir, ...page.split("/"));
  if (!existsSync(file)) return false;
  const was = readFileSync(file, "utf8"), html = was.replace(/\n?<style data-mw="whatif-fonts">[\s\S]*?<\/style>/, "");
  const css = (families ?? []).map((f, i) => `.mw-wi-face-${i} { font-family: "${f}"; }`).join(" ");
  const next = css ? html.replace(/<\/head>/i, `<style data-mw="whatif-fonts">${css}</style>\n</head>`) : html;
  if (next !== was) writeFileSync(file, next);
  return !!css;
}

const GSAP_TAG = /(<script[^>]*src=["'][^"']*gsap(?:\.min)?\.js["'][^>]*><\/script>)/i;

/** R-MOTIONPATH on the root document's text (needs the pinned plugin downloaded; without it the film is left as it is). */
export function withMotionPath(projectDir, html, report = {}) {
  const src = motionPathFile();
  if (/MotionPathPlugin/.test(html) || !src || !existsSync(src) || !GSAP_TAG.test(html)) return html;
  mkdirSync(join(projectDir, "assets", "_app", "vendor"), { recursive: true });
  copyFileSync(src, join(projectDir, "assets", "_app", "vendor", "MotionPathPlugin.min.js"));
  report.motionPath = true;
  return html.replace(GSAP_TAG, `$1\n<script src="assets/_app/vendor/MotionPathPlugin.min.js"></script>`);
}

/** R-MOTIONPATH alone, for a film opened in HyperFrames Studio before this rule existed. Returns true when index.html changed. */
export function ensureMotionPath(projectDir) {
  const f = join(projectDir, "index.html");
  if (!existsSync(f)) return false;
  const html = readFileSync(f, "utf8");
  const next = withMotionPath(projectDir, html);
  if (next === html) return false;
  writeFileSync(f, next);
  return true;
}

/** A family of the pinned Vietnamese list (googleFontsVi.mjs): its pinned files from the machine cache, downloaded once when
 *  `download` allows it. null when the family is not in the list, is large (the Google CSS route serves it) or cannot be had now. */
async function viFamily(family, { download, report }) {
  try { return await installViFamily(family, { download }); }
  catch (err) { (report.googleViFailed ??= []).push({ family, error: String(err?.message ?? err) }); return null; }
}

/** Google lookup with a negative cache, so a family Google does not have (e.g. Helvetica Neue) is asked for only once. */
async function googleFamily(family) {
  const miss = join(APP_ROOT, "runtime", "fonts", "google", `${slug(family)}.missing`);
  if (existsSync(miss)) return null;
  try {
    const got = await fetchGoogleFamily(family);
    if (!got) { mkdirSync(dirname(miss), { recursive: true }); writeFileSync(miss, new Date().toISOString()); }
    return got;
  } catch {
    return null;          // offline or blocked: the family stays unresolved and the font gate reports it
  }
}
import { loadHf } from "./load.mjs";
import { isStarterPage } from "./shots.mjs";

export const CSP = "default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'";
const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "inherit", "initial", "unset", "emoji", "math", "ui-sans-serif", "ui-serif", "ui-monospace"]);

export function fontMap() {
  return JSON.parse(readFileSync(join(APP_ROOT, "config", "fonts.json"), "utf8")).families;
}

/** The project's composition files in HF layout: index.html + compositions/**.html (other folders, e.g. backups, are not touched). */
export function htmlFiles(projectDir) {
  const out = existsSync(join(projectDir, "index.html")) ? ["index.html"] : [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n.endsWith(".html")) out.push(relative(projectDir, p).split(sep).join("/"));
    }
  };
  if (existsSync(join(projectDir, "compositions"))) walk(join(projectDir, "compositions"));
  return out;
}

/** font-family stacks (style blocks and inline styles), each a list of family names as written, generics removed. */
export function familyStacks(html) {
  const stacks = [];
  // CSS is read from <style> blocks and from each style attribute separately, so a declaration never runs into the markup after it
  const css = [
    ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]),
    ...[...html.matchAll(/\sstyle="([^"]*)"/gi)].map((m) => m[1]),
    ...[...html.matchAll(/\sstyle='([^']*)'/gi)].map((m) => m[1]),
  ].join(";\n");          // an inline style often has no trailing ';'
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const fams = m[1].split(",").map((raw) => raw.replace(/&quot;|&#39;/g, "").trim().replace(/^['"]|['"]$/g, "").replace(/[\s)'"]+$/g, "").trim())
      .filter((f) => f && !GENERIC.has(f.toLowerCase()) && !f.startsWith("var(") && !f.startsWith("-") && !/^BlinkMacSystemFont$/i.test(f));
    if (fams.length) stacks.push(fams);
  }
  return stacks;
}

/** Back-compat: every family named in any stack. */
export function usedFamilies(html) {
  const found = new Map();
  for (const st of familyStacks(html)) for (const f of st) found.set(f.toLowerCase(), f);
  return found;
}

export function declaredFamilies(html) {
  const out = new Set();
  for (const m of html.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*['"]?([^;'"}]+)/gi)) out.add(m[1].trim().toLowerCase());
  return out;
}

function fontFaceCss(fam, files) {
  return files.map((f) => `@font-face { font-family: "${fam}"; src: url("assets/_app/fonts/kit/${f.file.split("/").pop()}"); font-weight: ${f.weight[0]} ${f.weight[1]}; font-style: ${f.style}; font-display: block; }`).join("\n");
}

async function applyFonts(projectDir, file, html, report, hfAliases, { googleFonts }) {
  const map = fontMap();
  const byKey = new Map(Object.keys(map).map((k) => [k.toLowerCase(), k]));
  const declared = declaredFamilies(html);
  const add = new Map();
  const google = new Map();
  const googleVi = new Map();          // families of the pinned Vietnamese list
  for (const stack of familyStacks(html)) {
    // the first family of the stack that something serves wins: a declaration in this file, a kit font (added here),
    // a family of the pinned Vietnamese Google Fonts list, a one-time Google Fonts download, or HF's alias map
    let served = null;
    for (const fam of stack) {
      const key = fam.toLowerCase();
      if (declared.has(key) || add.has(key) || google.has(key) || googleVi.has(key)) { served = { fam, by: "declared" }; break; }
      const kitName = byKey.get(key);
      if (kitName) { add.set(key, { written: fam, kitName }); served = { fam, by: "kit" }; break; }
      // a name HF aliases to a font the kit has keeps the kit's font (below); any other family of the list is served with its pinned files
      // (before, an aliased name such as Montserrat was left to HF's latin-only embedded font and the Vietnamese gate stopped the film)
      if (!(hfAliases[key] && byKey.has(String(hfAliases[key]).replace(/-/g, " ").toLowerCase()))) {
        const vi = await viFamily(fam, { download: googleFonts, report });
        if (vi) { googleVi.set(key, vi); served = { fam, by: "google-vi" }; break; }
      }
      if (googleFonts && !hfAliases[key]) {
        const got = await googleFamily(fam);
        if (got) { google.set(key, got); served = { fam, by: "google" }; break; }
      }
      if (hfAliases[key]) {
        // HF would substitute this family (e.g. Arial -> inter) and fetch the target from Google Fonts with the film's text.
        // When the kit has the target family, declare the written name with the kit's files instead.
        const kitTarget = byKey.get(String(hfAliases[key]).replace(/-/g, " ").toLowerCase());
        if (kitTarget) { add.set(key, { written: fam, kitName: kitTarget }); served = { fam, by: "kit-for-hf-alias", to: kitTarget }; break; }
        served = { fam, by: "hf-alias", to: hfAliases[key] }; break;
      }
    }
    if (!served) report.unresolvedFonts.push({ file, stack });
    else if (served.by === "hf-alias") report.hfAliased.push({ file, family: served.fam, to: served.to });
    // HF's compiler requests every family of a stack, not only the first served one: declare every later family it would
    // substitute too, or it still fetches the substitute from Google Fonts (seen with Arial -> inter)
    for (const fam of stack) {
      const key = fam.toLowerCase();
      if (declared.has(key) || add.has(key) || googleVi.has(key) || !hfAliases[key]) continue;
      const kitTarget = byKey.get(String(hfAliases[key]).replace(/-/g, " ").toLowerCase());
      if (kitTarget) add.set(key, { written: fam, kitName: kitTarget });
    }
  }
  if (!add.size && !google.size && !googleVi.size) return html;
  const kitDir = fontsDir();      // the bundled fonts, downloaded from google/fonts; "kit" names stay for existing projects
  const css = [];
  for (const got of googleVi.values()) {
    const faceCss = placeViFamily(projectDir, got);
    css.push(faceCss);
    report.fontsAdded.push({ file, family: got.family, google: true, css: faceCss, credit: got.credit });
    (report.googleFontsVi ??= []).push({ family: got.family, cached: got.cached, credit: got.credit, ...(got.missing ? { missing: got.missing } : {}) });          // missing: letters the first download found it lacks (the gate stops a film that writes them)
  }
  for (const got of google.values()) {
    const faceCss = installGoogleFamily(projectDir, got);
    css.push(faceCss);
    report.fontsAdded.push({ file, family: got.family, google: true, css: faceCss });
    report.googleFonts.push({ family: got.family, cached: got.cached });
  }
  for (const { written, kitName } of add.values()) {
    for (const f of map[kitName]) {
      const dst = join(projectDir, "assets", "_app", "fonts", "kit", f.file.split("/").pop());
      if (!existsSync(dst)) {
        if (!existsSync(join(kitDir, f.file))) throw Object.assign(new Error(`The bundled font ${f.file} is not downloaded yet (Settings > Health > Download)`), { code: "FONTS_MISSING" });
        mkdirSync(dirname(dst), { recursive: true }); copyFileSync(join(kitDir, f.file), dst);
      }
    }
    css.push(fontFaceCss(written, map[kitName]));
    report.fontsAdded.push({ file, family: written, kit: kitName });
  }
  const block = `<style data-mw="fonts">\n${css.join("\n")}\n</style>`;
  if (/<template[^>]*>/i.test(html)) {
    // inside the template's composition root, so the declaration travels with the mounted composition
    return html.replace(/(<template[^>]*>\s*<[^>]*data-composition-id[^>]*>)/i, `$1\n${block}`);
  }
  return html.includes("</head>") ? html.replace("</head>", `${block}\n</head>`) : `${block}\n${html}`;
}

function applyBackgroundLayers(document, report, file) {
  let n = 0;
  for (const el of document.querySelectorAll("[style]")) {
    if (el.getAttribute("data-mw-bg") === "1") continue;
    const style = el.getAttribute("style");
    // split into declarations (a value may contain ';' only inside quotes or url(), which background colours here do not use)
    const decls = style.split(";").map((d) => d.trim()).filter(Boolean);
    const bgIndex = decls.findIndex((d) => /^background(?:-color)?\s*:/i.test(d));
    if (bgIndex < 0) continue;
    const cls = el.getAttribute("class") ?? "";
    const fullFrame = /\b(inner|clip|scene)\b/.test(cls) || /inset\s*:\s*0/.test(style) || el.hasAttribute("data-composition-id");
    if (!fullFrame || !el.textContent.trim()) continue;          // only containers that hold text
    const bg = decls[bgIndex].replace(/^background(?:-color)?\s*:\s*/i, "");
    el.setAttribute("style", decls.filter((_, i) => i !== bgIndex).join("; ") + ";");
    const layer = document.createElement("div");
    layer.setAttribute("class", "mw-bg");
    layer.setAttribute("style", `position:absolute;inset:0;background:${bg};will-change:transform;pointer-events:none`);
    el.insertBefore(layer, el.firstChild);
    el.setAttribute("data-mw-bg", "1");
    n++;
  }
  if (n) report.backgroundsMoved.push({ file, count: n });
}

/** `googleFonts: false` keeps finalize fully offline (no download; such families stay unresolved and the font gate blocks).
 *  `characterDemo`: the Character page's own demo pages (packages/character-kit), the one place Clawd may be drawn. */
export async function finalize(projectDir, { version = null, googleFonts = true, characterDemo = false } = {}) {
  // R-CLAWD: Clawd is Anthropic's mascot, a demo of the character layer only: a film that draws it is refused
  if (!characterDemo) {
    const read = (rel) => { try { return readFileSync(join(projectDir, ...rel.split("/")), "utf8"); } catch { return ""; } };
    if (clawdIn(["index.html", ...scriptFiles(projectDir)].map((rel) => ({ rel, text: read(rel) }))))
      throw Object.assign(new Error("This film draws Clawd, Anthropic's mascot: Clawd is a demo of the character layer only, never in a film. Use the project's own character."), { code: "CLAWD" });
  }
  const hf = await loadHf(version);
  const report = { hfVersion: hf.version, files: [], fontsAdded: [], googleFonts: [], hfAliased: [], unresolvedFonts: [], backgroundsMoved: [], csp: false, runtime: false, three: [], lemo: null };
  // R-ANIDOODLE, then R-LEMO first: an anidoodle film is bundled into its page script, then the bridge and the three.js version of any
  // code-film page are seen by the passes below like any film's
  const ani = await buildAnidoodle(projectDir);
  if (ani) report.anidoodle = ani;
  // R-WHATIF: the same for a What If film, and its faces named in the page for R-FONTS below
  const wi = await buildWhatIf(projectDir);
  if (wi) { report.whatIf = wi; whatIfFaces(projectDir, wi.families); }
  // R-CAST: a Brush cartoon film (or board) gets the character kit and cast.js (from CHARACTERS.json) where its page loads them
  const cast = refreshFilmKit(projectDir);
  if (cast) report.cast = { pages: cast.pages, files: cast.files.length };
  const lemo = lemoFilm(projectDir, scriptFiles(projectDir));
  if (lemo) report.lemo = { source: lemo.source, files: lemo.files, copied: lemo.copied.length, missing: lemo.missing };
  // R-VENDOR + R-THREE first, over the film's own scripts and every composition: the root's import map needs every version the film uses
  const scripts = rewriteScripts(projectDir);
  const three = new Set(lemo?.three ?? []);
  if (three.size) vendorInto(projectDir, { three });
  for (const n of scripts.needs) { vendorInto(projectDir, n); for (const v of n.three ?? []) three.add(v); }
  report.files.push(...scripts.changed);
  const files = htmlFiles(projectDir), texts = new Map();
  for (const file of files) {
    const before = readFileSync(join(projectDir, file), "utf8");
    const r = rewriteRemoteLibs(before);
    vendorInto(projectDir, r.needs);
    for (const v of [...r.needs.three, ...threeIn(r.text)]) three.add(v);
    texts.set(file, { before, html: r.text });
  }
  report.three = [...three].sort();
  for (const file of files) {
    const path = join(projectDir, file);
    let { before, html } = texts.get(file);
    const isRoot = file === "index.html";
    if (isRoot) html = withThreeMap(html, three);
    html = await applyFonts(projectDir, file, html, report, hf.fontAliases, { googleFonts });
    // background layers: DOM edit with linkedom. A <template> file is edited through its inner markup parsed as its own document
    const tm = /(<template[^>]*>)([\s\S]*)(<\/template>)/i.exec(html);
    const before2 = report.backgroundsMoved.length;
    if (tm) {
      const { document } = hf.linkedom.parseHTML(`<!doctype html><html><body>${tm[2]}</body></html>`);
      applyBackgroundLayers(document, report, file);
      if (report.backgroundsMoved.length > before2) html = html.slice(0, tm.index) + tm[1] + document.body.innerHTML + tm[3] + html.slice(tm.index + tm[0].length);
    } else {
      const { document } = hf.linkedom.parseHTML(html);
      applyBackgroundLayers(document, report, file);
      if (report.backgroundsMoved.length > before2) html = document.toString();
    }
    if (isRoot) {
      if (!/http-equiv=["']Content-Security-Policy/i.test(html)) {
        html = html.replace(/<meta charset=[^>]*>/i, (m0) => `${m0}\n<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
        report.csp = true;
      }
      if (!html.includes("hyperframe.runtime.iife.js")) {
        mkdirSync(join(projectDir, "assets", "_app", "vendor"), { recursive: true });
        copyFileSync(hf.runtimeFile, join(projectDir, "assets", "_app", "vendor", "hyperframe.runtime.iife.js"));
        html = html.replace(/(<script[^>]*gsap[^>]*><\/script>)/i, `$1\n<script src="assets/_app/vendor/hyperframe.runtime.iife.js"></script>`);
        report.runtime = html.includes("hyperframe.runtime.iife.js");
      }
      html = withMotionPath(projectDir, html, report);
      html = withoutStarterFlag(html, report);
    }
    if (html !== before) { writeFileSync(path, html); report.files.push(file); }
  }
  declareInRoot(projectDir, report);
  return report;
}

/** The scaffold's data-no-timeline stays on the root of the film the Build writes. HF wants it on a root that registers
 *  no timeline of its own (docs/guides/frame-sources.md: without it lint reports missing_timeline_registry and each render waits 45 s),
 *  so it is dropped only from a built film whose root registers window.__timelines.main; the starter check is isStarterPage. */
export function withoutStarterFlag(html, report = {}) {
  if (isStarterPage(html) || !/__timelines\s*(\[\s*["']main["']\s*\]|\.main\b)/.test(html)) return html;
  const out = html.replace(/<[^>]*\bdata-composition-id="[^"]*"[^>]*>/, (tag) => tag.replace(/\s+data-no-timeline\b(="[^"]*")?/, ""));
  if (out !== html) report.starterFlagDropped = true;
  return out;
}

/**
 * Kit families used inside sub-compositions are also declared in the root document's <head>. HF's compiler did not see the declaration
 * inside a <template> and fetched the same family from Google Fonts (seen with "Inter"); a root declaration is what it reads.
 */
function declareInRoot(projectDir, report) {
  const rootPath = join(projectDir, "index.html");
  if (!existsSync(rootPath)) return;
  let html = readFileSync(rootPath, "utf8");
  const map = fontMap();
  const declared = declaredFamilies(html);
  const css = [];
  for (const { family, kit, css: googleCss } of report.fontsAdded) {
    const key = family.toLowerCase();
    if (declared.has(key)) continue;
    declared.add(key);
    css.push(googleCss ?? fontFaceCss(family, map[kit]));
  }
  if (!css.length) return;
  html = html.replace("</head>", `<style data-mw="fonts-root">\n${css.join("\n")}\n</style>\n</head>`);
  writeFileSync(rootPath, html);
  if (!report.files.includes("index.html")) report.files.push("index.html");
}

/** The fonts of one storyboard board (boards/X/index.html), before the app takes its stills mid-task: the same choice as
 *  finalize (a declared face, a bundled font, a Google Fonts family), with the files copied into the project's assets/fonts and the
 *  @font-face paths written relative to the board's folder. */
export async function boardFonts(projectDir, file, { version = null, googleFonts = true } = {}) {
  const hf = await loadHf(version);
  const report = { fontsAdded: [], googleFonts: [], hfAliased: [], unresolvedFonts: [] };
  const path = join(projectDir, ...file.split("/"));
  // R-WHATIF for a What If board (data-whatif="board" on its root): the film's own episode bundled into the board's folder (HF's snapshot
  // serves that folder as its web root, so the page loads "film.js" beside it), its faces named in the page before R-FONTS reads it
  if (/data-whatif=["']board["']/.test(readFileSync(path, "utf8"))) {
    const wi = await buildWhatIf(projectDir, { out: `${file.split("/").slice(0, -1).join("/")}/film.js` });
    if (wi) { report.whatIf = wi; whatIfFaces(projectDir, wi.families, file); }
  }
  const html = readFileSync(path, "utf8");
  const up = "../".repeat(file.split("/").length - 1);
  // R-LEMO for a lemo style's board (its scripts inside its own folder), then R-VENDOR + R-THREE: a board is its own document, so its
  // paths and its import map lead back to the project root
  const boardDir = file.split("/").slice(0, -1).join("/");
  const ani = await buildAnidoodle(projectDir, { entry: `${boardDir}/page.ts`, out: `${boardDir}/film.js` });          // an anidoodle board
  if (ani) report.anidoodle = ani;
  refreshFilmKit(projectDir);          // a Brush cartoon board: the kit and cast.js inside its own folder (R-CAST)
  const lemo = lemoBoard(projectDir, file);
  const lib = rewriteRemoteLibs(lemo ? readFileSync(path, "utf8") : html, { prefix: up });
  vendorInto(projectDir, { ...lib.needs, three: new Set([...lib.needs.three, ...(lemo?.three ?? [])]) });
  const three = new Set([...lib.needs.three, ...threeIn(lib.text), ...(lemo?.three ?? [])]);
  if (lemo) report.lemo = { source: lemo.source, files: lemo.files, copied: lemo.copied.length, missing: lemo.missing };
  report.three = [...three].sort();
  let out = withThreeMap(lib.text, three, up || "./");
  const vendored = out;
  out = await applyFonts(projectDir, file, out, report, hf.fontAliases, { googleFonts });
  if (out !== vendored) out = out.replace(/<style data-mw="fonts">[\s\S]*?<\/style>/, (b) => b.replace(/url\((["']?)assets\//g, `url($1${up}assets/`));
  if (out !== html) writeFileSync(path, out);
  return report;
}

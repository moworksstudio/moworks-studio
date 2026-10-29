// Libraries a film loads from a CDN, made local. The film's CSP and the G-REMOTE gate refuse the network, while HyperFrames'
// registry blocks and skills load GSAP, three.js, clipper-lib, the Draco decoder and fontsource faces from jsDelivr / gstatic. A URL of
// a pinned file (config/pins.json gsap, three, clipperLib; config/fonts.json) is rewritten to the app's copy; anything else stays, and
// the gate reports it.
//   classic scripts and files       assets/_app/vendor/... (from the project root, like gsap.min.js; boards pass their own prefix)
//   three.js ES modules             the bare specifier three@<version>[/examples/jsm/...], resolved by the film's import map
//                                   (R-THREE: 'three' and 'three/addons/' are the default version, each version scoped to its own folder)
// Credit (shipped as is, each version with its LICENSE): three.js, the three.js authors, MIT, https://github.com/mrdoob/three.js (default
// r184 at e78e81725013343d38ceb7b13070c9ff5b8dafbb; r147, r170 and 0.181.2 only for registry blocks pinned to them); clipper-lib 6.4.2,
// Angus Johnson (JS translation by Timo), Boost Software License 1.0, https://github.com/junmer/clipper-lib. Sizes and SHA-256 in
// config/pins.json.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { clipperFile, fontsDir, gsapFile, motionPathFile, threeDir, threeVersions } from "../offline-assets/index.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";

const VENDOR = "assets/_app/vendor";
const CDN_THREE = /https:\/\/cdn\.jsdelivr\.net\/npm\/three@(\d+\.\d+\.\d+)\/([^"'`\s)]*)/g;
const CDN_GSAP = /https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[0-9.]+\/dist\/(gsap|MotionPathPlugin)\.min\.js/g;
const CDN_CLIPPER = /https:\/\/cdn\.jsdelivr\.net\/npm\/clipper-lib@6\.4\.2\/clipper\.js/g;
const GSTATIC_DRACO = /https:\/\/www\.gstatic\.com\/draco\/versioned\/decoders\/[0-9.]+\//g;
const DRACO_147 = "examples/js/libs/draco/gltf/";
// fontsource: url(<face>) [format("woff2")], in CSS or in a FontFace source string
const FONTSOURCE = /url\((["']?)https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/([a-z0-9-]+)@[^/]+\/[a-z0-9-]+-(\d{3})-(normal|italic)\.woff2\1\)(\s*format\((["'])woff2\6\))?/g;
const GOOGLE_LINK = /<link\b[^>]*href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^"']*["'][^>]*>\s*/gi;
const GOOGLE_IMPORT = /@import\s+url\((["']?)https:\/\/fonts\.googleapis\.com\/[^"')]*\1\)\s*;\s*/gi;
const IMPORT_MAP = /<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>\s*/gi;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function bundledFont(familySlug, style) {
  const fams = JSON.parse(readFileSync(join(APP_ROOT, "config", "fonts.json"), "utf8")).families;
  const name = Object.keys(fams).find((f) => slug(f) === familySlug);
  if (!name) return null;
  const files = fams[name];
  return (files.find((f) => (style === "italic") === /italic/i.test(f.file)) ?? files[0]).file;
}

/**
 * Rewrite the CDN URLs of pinned files in one file's text. `prefix` goes in front of assets/_app/... (the file's way back to the project
 * root: "" for compositions, which resolve from the root, "../../" for a board). Returns { text, needs } where needs lists what
 * vendorInto() must copy: { three: Set<version>, gsap, motionPath, clipper, fonts: Set<file under the bundled fonts> }.
 */
export function rewriteRemoteLibs(text, { prefix = "" } = {}) {
  const { default: def, versions } = threeVersions();
  const needs = { three: new Set(), gsap: false, motionPath: false, clipper: false, fonts: new Set() };
  const pinned = (v, p) => versions[v]?.includes(p);
  // a block's own import map for three (wireframe-portal-title): drop its three entries, and point its bare imports at that version
  let own = null;
  text = text.replace(IMPORT_MAP, (whole, json) => {
    let map;
    try { map = JSON.parse(json); } catch { return whole; }
    const imports = { ...(map.imports ?? {}) };
    const v = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@(\d+\.\d+\.\d+)\//.exec(imports.three ?? "")?.[1];
    if (!v || !pinned(v, "build/three.module.min.js")) return whole;
    own = v;
    delete imports.three; delete imports["three/addons/"];
    return Object.keys(imports).length || map.scopes ? `<script type="importmap">${JSON.stringify({ ...map, imports })}</script>\n` : "";
  });
  if (own) {
    text = text.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(["'])three\2/g, `$1$2three@${own}$2`)
      .replace(/(["'])three\/addons\//g, `$1three@${own}/examples/jsm/`);
    needs.three.add(own);
  }
  text = text.replace(CDN_THREE, (url, v, p) => {
    p = p.replace(/\/\+esm$/, "").replace(/^\+esm$/, "");
    if (!versions[v]) return url;
    if (p === "" || p === "build/three.module.js" || p === "build/three.module.min.js") {
      if (!pinned(v, "build/three.module.min.js")) return url;
      needs.three.add(v); return `three@${v}`;
    }
    if (p.startsWith("examples/jsm/") && pinned(v, p)) { needs.three.add(v); return `three@${v}/${p}`; }
    if ((p === "build/three.min.js" || p.startsWith("examples/js/")) && pinned(v, p)) { needs.three.add(v); return `${prefix}${VENDOR}/three/${v}/${p}`; }
    return url;
  });
  text = text.replace(GSTATIC_DRACO, (url) => {
    if (!versions["0.147.0"]?.some((p) => p.startsWith(DRACO_147))) return url;
    needs.three.add("0.147.0"); return `${prefix}${VENDOR}/three/0.147.0/${DRACO_147}`;
  });
  text = text.replace(CDN_GSAP, (url, name) => {
    if (name === "gsap") { needs.gsap = true; return `${prefix}${VENDOR}/gsap.min.js`; }
    if (!motionPathFile()) return url;
    needs.motionPath = true; return `${prefix}${VENDOR}/MotionPathPlugin.min.js`;
  });
  text = text.replace(CDN_CLIPPER, () => { needs.clipper = true; return `${prefix}${VENDOR}/clipper-lib/6.4.2/clipper.js`; });
  text = text.replace(FONTSOURCE, (whole, q, fam, _w, style, fmt) => {
    const file = bundledFont(fam, style);
    if (!file) return whole;
    needs.fonts.add(file);
    return `url(${q}${prefix}assets/_app/fonts/kit/${file.split("/").pop()}${q})${fmt ? ` format(${fmt.includes("'") ? "'truetype'" : '"truetype"'})` : ""}`;
  });
  // a Google Fonts stylesheet: the app declares the families the CSS uses itself (finalize R-FONTS: bundled, or downloaded once)
  text = text.replace(GOOGLE_LINK, "").replace(GOOGLE_IMPORT, "");
  if (usesDefaultThree(text)) needs.three.add(def);
  return { text, needs };
}

/** The three.js versions a text uses: the default for bare 'three' / 'three/addons/', <v> for three@<v> or a copied classic file. */
export function threeIn(text) {
  const out = new Set();
  if (usesDefaultThree(text)) out.add(threeVersions().default);
  for (const m of text.matchAll(/["']three@(\d+\.\d+\.\d+)(?:\/[^"']*)?["']/g)) out.add(m[1]);
  for (const m of text.matchAll(/assets\/_app\/vendor\/three\/(\d+\.\d+\.\d+)\//g)) out.add(m[1]);
  return out;
}
// A file whose own import map serves 'three' from its folder (registry blocks orbit-card, cuboid-carousel: r185 shipped with the block)
// brings its own copy; its bare imports are not the film's default version.
const ownsThree = (text) => [...text.matchAll(IMPORT_MAP)].some((m) => { try { const t = JSON.parse(m[1]).imports?.three; return t && !/^https?:/.test(t); } catch { return false; } });
const usesDefaultThree = (text) => !ownsThree(text) && /(?:\bfrom\s*|\bimport\s*\(?\s*)["']three(?:\/addons\/[^"']*)?["']/.test(text);

/** Copy what rewriteRemoteLibs() said a film needs into its assets/_app (once; existing copies are kept). */
export function vendorInto(projectDir, needs) {
  const vendor = join(projectDir, ...VENDOR.split("/"));
  const copy = (src, dst) => { if (!src || !existsSync(src) || existsSync(dst)) return; mkdirSync(dirname(dst), { recursive: true }); copyFileSync(src, dst); };
  for (const v of needs.three ?? []) {
    const src = join(threeDir(), v), dst = join(vendor, "three", v);
    if (!existsSync(src)) throw Object.assign(new Error(`three.js ${v} is not downloaded yet (Settings › System › Download all)`), { code: "THREE_MISSING" });
    cpSync(src, dst, { recursive: true, force: false, errorOnExist: false });          // files a newer pin added are copied, the rest kept
  }
  if (needs.gsap) copy(gsapFile(), join(vendor, "gsap.min.js"));
  if (needs.motionPath) copy(motionPathFile(), join(vendor, "MotionPathPlugin.min.js"));
  if (needs.clipper) copy(clipperFile(), join(vendor, "clipper-lib", "6.4.2", "clipper.js"));
  for (const f of needs.fonts ?? []) copy(join(fontsDir(), f), join(projectDir, "assets", "_app", "fonts", "kit", f.split("/").pop()));
}

/** The film's import map for three.js: 'three' + 'three/addons/' = the default version, three@<v> for each version, each version's own
 *  files scoped to its folder (an addon's `import "three"` stays in its version). Versions without an ES module build (0.147) need none. */
export function threeImportMap(versionsUsed, prefix = "./") {
  const { default: def, versions } = threeVersions();
  const base = `${prefix}${VENDOR}/three`;
  const imports = {}, scopes = {};
  const mods = [...new Set([def, ...versionsUsed])].filter((v) => versions[v]?.includes("build/three.module.min.js")).sort();
  for (const v of mods) {
    const core = `${base}/${v}/build/three.module.min.js`;
    if (v === def) { imports.three = core; imports["three/addons/"] = `${base}/${v}/examples/jsm/`; }
    imports[`three@${v}`] = core;
    imports[`three@${v}/`] = `${base}/${v}/`;
    scopes[`${base}/${v}/`] = { three: core, "three/addons/": `${base}/${v}/examples/jsm/` };
  }
  return { imports, scopes };
}

const MAP_TAG = /<script type="importmap" data-mw="three">[\s\S]*?<\/script>\n?/;
/** R-THREE on a document's text: its import map for the versions given, before its first script (an import map must come before any
 *  module). No versions: the map is removed. */
export function withThreeMap(html, versionsUsed, prefix = "./") {
  const tag = versionsUsed.size ? `<script type="importmap" data-mw="three">${JSON.stringify(threeImportMap(versionsUsed, prefix))}</script>\n` : "";
  if (MAP_TAG.test(html)) return html.replace(MAP_TAG, tag);
  if (!tag) return html;
  const at = html.search(/<script\b/i);
  if (at >= 0) return html.slice(0, at) + tag + html.slice(at);
  return html.includes("</head>") ? html.replace("</head>", `${tag}</head>`) : tag + html;
}

/** The film's own scripts (not the app's copies, not minified or vendored libraries): where Claude may write a scene module. */
export function scriptFiles(projectDir) {
  const out = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n), rel = relative(projectDir, p).split(sep).join("/");
      if (statSync(p).isDirectory()) { if (!n.startsWith(".") && n !== "node_modules" && rel !== "assets/_app" && !/^(vendor|libs?)$/.test(n)) walk(p); }
      else if (/\.m?js$/.test(n) && !/\.min\.js$/.test(n)) out.push(rel);
    }
  };
  for (const d of ["compositions", "assets"]) if (existsSync(join(projectDir, d))) walk(join(projectDir, d));
  return out;
}

/** The same rewrite on the film's own script files; returns the needs and the files changed. */
export function rewriteScripts(projectDir) {
  const changed = [], needs = [];
  for (const f of scriptFiles(projectDir)) {
    const p = join(projectDir, ...f.split("/"));
    const before = readFileSync(p, "utf8");
    const r = rewriteRemoteLibs(before);
    needs.push(r.needs, { three: threeIn(r.text) });
    if (r.text !== before) { writeFileSync(p, r.text); changed.push(f); }
  }
  return { changed, needs };
}

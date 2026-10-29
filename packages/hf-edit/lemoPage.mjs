// R-LEMO: a code-film page made to run inside HyperFrames, offline. Lemo-Opuscar and mg-styles-15 draw a
// film as one page that paints the frame at second t (window.render(t), or the async window.renderAt(t)) once it says it is ready
// (window.READY, or window.__ready), and load their library from their own server's root. In such a page (a film's index.html, or a
// storyboard board):
//   the bridge   <script data-mw="lemo">: one paused timeline on the root composition whose time is t; on every HyperFrames seek the page
//                draws t, and an async draw is awaited through hf-seek's waitUntil (HF's own hook for work a seek must finish); HyperFrames
//                is held until the page is ready (window.__hf.buildReady). Proven on lemo's watercolor demo, unchanged
//   three.js     the source's own version (lemo r170, mg-styles-15 0.186.1, pins.lemo.three / pins.mgStyles.three): "three",
//                "three/addons/…" and /node_modules/three/… become three@<v>[/examples/jsm/…], resolved by the film's import map (R-THREE)
//   library      lemo: /core/… from its clone to assets/_app/vendor/lemo/core/ (MIT notice added to the scripts); mg-styles-15: its shared
//                /assets/{textures,hdri,images}/… from its clone to assets/_app/vendor/mg/assets/, and /node_modules/<lib>/… of a pinned
//                library (pins.codeLibs) to assets/_app/vendor/lib/<lib>/<version>/; a module import is rewritten relative to its own file,
//                anything else relative to the document; its fonts.css goes (R-FONTS declares the families the film uses)
// Credit: Lemo-Opuscar, Lemomo (LemoLab), MIT; mg-styles-15, Vincentwei1021, MIT; at the commits pinned in config/pins.json.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { codeLibDir } from "../offline-assets/index.mjs";
import { vendorInto } from "./vendorLibs.mjs";

const BRIDGE_TAG = /<script\b[^>]*data-mw=["']lemo["'][^>]*>[\s\S]*?<\/script>\s*/i;
const IMPORT_MAP = /<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>\s*/gi;
const NODE_THREE = /\/node_modules\/three\/(build\/three\.module(?:\.min)?\.js|examples\/jsm\/)/g;
const BARE_THREE = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])three(\/addons\/[^"']*)?\2/g;
const IMPORT_BEFORE = /(?:\bfrom|\bimport\s*\(?)\s*$/;
const read = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };

/** The code-film sources: where their library lives in the page and in the pinned clone. */
const SOURCES = {
  lemo: { pinKey: "lemo", three: "0.170.0", vendor: "assets/_app/vendor/lemo", base: "core", paths: /(["'`(])\/core\/([A-Za-z0-9_\-./]+)/g, sub: (p) => `core/${p}`,
    notice: (p, f) => `// From Lemo-Opuscar by Lemomo (LemoLab), MIT: https://github.com/${p.repo}/blob/${p.commit}/core/${f}` },
  mg: { pinKey: "mgStyles", three: "0.186.1", vendor: "assets/_app/vendor/mg", base: "assets", paths: /(["'`(])\/assets\/((?:textures|hdri|images)\/[A-Za-z0-9_\-./]+)/g, sub: (p) => `assets/${p}`,
    notice: (p, f) => `// From mg-styles-15 by Vincentwei1021, MIT: https://github.com/${p.repo}/blob/${p.commit}/assets/${f}` },
  // anidoodle: its page script is bundled by the app (anidoodleBuild.mjs) and loads nothing by path; only the bridge
  anidoodle: { pinKey: "anidoodle", three: null, vendor: "assets/_app/vendor/anidoodle", base: "engine", paths: /(?!)/g, sub: (p) => p, notice: () => "" },
};
function pin(source, root) { const s = SOURCES[source], p = loadPins(root)[s.pinKey]; return p ? { ...p, root: resolve(expandEnv(p.root)), three: p.three ?? s.three } : null; }

/** Does this page (its HTML and the scripts it loads) draw by time and say when it is ready? (lemo's or mg-styles-15's contract) */
export function isLemoPage(texts) {
  const all = texts.join("\n");
  return (/\bwindow\.render(?:At)?\s*=/.test(all) && /\bwindow\.(?:READY|__ready)\s*=\s*true/.test(all)) || /\bwindow\.FILM\s*=/.test(all);
}
/** Which source a page follows when its project does not say: anidoodle's window.FILM, lemo's /core/ library, or mg-styles-15's
 *  renderAt / shared assets. */
export function guessSource(texts) {
  const all = texts.join("\n");
  if (/\bwindow\.FILM\s*=/.test(all)) return "anidoodle";
  if (/["'`(]\/core\//.test(all)) return "lemo";
  return /\bwindow\.renderAt\s*=|\bwindow\.__ready\s*=|["'`(]\/assets\/(?:textures|hdri|images|fonts)\//.test(all) ? "mg" : "lemo";
}

/** The bridge: the root composition (its id and data-duration) is read in the page at run time. */
export function bridgeScript() {
  return `<script data-mw="lemo">
  // Moworks Studio R-LEMO: a code-film page (render(t) or async renderAt(t), READY or __ready) driven by HyperFrames: one paused
  // timeline whose time is t; every seek draws t (an async draw is awaited through hf-seek's waitUntil)
  (function () {
    var root = document.querySelector("[data-composition-id]");
    var id = (root && root.getAttribute("data-composition-id")) || "main";
    var film = function () { return window.FILM && typeof window.FILM.seek === "function" ? window.FILM : null; };
    var fm = film() && window.FILM.meta;
    var dur = Number(root && root.getAttribute("data-duration")) || Number(window.DUR) || Number(window.DEMO && window.DEMO.duration) || (fm ? fm.durationFrames / fm.fps : 0) || 1;
    var clock = { t: 0 }, ready, seen = false, filmReady = false, filmStarted = false;
    var isReady = function () { return window.READY === true || window.__ready === true || filmReady; };
    // the Editor's preview quality (#254, 2R's Full / Half / Quarter / Auto): host.js sets window.__mwPreviewQuality and sends
    // "mw:preview-quality" on this window (or ?mwScale= on the page); a render has neither, so it always draws at full size. Only anidoodle can
    // draw smaller (FILM.mount(scale) sizes its canvas again); the other code films draw at their own size.
    // QC2 #402: HyperFrames' check (only the check: its deadline marks the page with __hfScriptState before any script runs) samples the
    // HTML layers' overlaps at 8 fps over the whole film, one seek each (OVERLAP_SAMPLE_FPS, 161 seeks for 20 s), within 120 s; an
    // anidoodle film that takes 0.75 s a frame never finished, so its script, layout and contrast checks never ran. The check reads the
    // layers' geometry and the picture's colours, never the canvas' resolution: it is drawn at half size there (2.4 times faster). A
    // render, a still and the preview are untouched.
    var checking = typeof window.__hfScriptState === "function";
    var previewScale = function () {
      var q = /[?&]mwScale=([0-9.]+)/.exec(location.search), v = q ? Number(q[1]) : Number(window.__mwPreviewQuality);
      return v >= 0.25 && v <= 1 ? v : checking ? 0.5 : 1;
    };
    var lastT = 0, mounted = 1;
    // anidoodle's host reads one pixel of its #film canvas after every frame, only to time the draw (hosts/page.ts seek): after about 100
    // reads Chrome takes that canvas off the GPU and every later frame draws 8-10 times slower, in a render, the live preview and the
    // check (audit 72 §2; owner 25/10, R1). That one read returns a blank pixel here; the author's code is unchanged, the picture the same
    // (the capture flushes the canvas itself) and any other read untouched (SOURCES.md, anidoodle).
    if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.__mwOnePixel) {
      var readPixels = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h, o) {
        if (w === 1 && h === 1 && this.canvas && this.canvas.id === "film" && film()) return new ImageData(1, 1);
        return readPixels.apply(this, arguments);
      };
      CanvasRenderingContext2D.prototype.__mwOnePixel = true;
    }
    window.addEventListener("mw:preview-quality", function (e) {
      var F = film(), s = previewScale();
      if (e.detail && e.detail.scale != null) { var d = Number(e.detail.scale); s = d >= 0.25 && d <= 1 ? d : 1; }
      if (!F || !filmReady || s === mounted) return;
      mounted = s; F.mount(s); draw(lastT);
    });
    // anidoodle: FILM.seek(frame) at the film's own rate, inside its frames
    var draw = function (t) {
      lastT = t;
      var F = film();
      if (F) { var m = F.meta; return F.seek(Math.max(0, Math.min(m.durationFrames - 1, Math.round(t * m.fps)))); }
      return typeof window.renderAt === "function" ? window.renderAt(t) : typeof window.render === "function" ? window.render(t) : null;
    };
    window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
    window.__hf.buildReady.lemo = new Promise(function (r) { ready = r; });
    (function wait() {
      var F = film();
      if (F && !filmStarted) { filmStarted = true; Promise.resolve(F.ready).then(function () { mounted = previewScale(); F.mount(mounted); filmReady = true; }); }
      if (isReady() && (F || typeof window.render === "function" || typeof window.renderAt === "function")) Promise.resolve(draw(clock.t)).then(function () { ready(); }, function () { ready(); });
      else setTimeout(wait, 20);
    })();
    window.addEventListener("hf-seek", function (e) {
      seen = true;
      if (!isReady()) return;
      var p = draw(e.detail && e.detail.time != null ? e.detail.time : clock.t);
      if (p && typeof p.then === "function" && e.detail && typeof e.detail.waitUntil === "function") e.detail.waitUntil(p);
    });
    window.__timelines = window.__timelines || {};
    if (!window.gsap) return;          // a board page loads no GSAP: its stills are taken by seeks; the film's root gets GSAP from R-LEMO
    var tl = window.__timelines[id] || gsap.timeline({ paused: true });
    window.__timelines[id] = tl;
    tl.to(clock, { t: dur, duration: dur, ease: "none", onUpdate: function () { if (!seen && isReady()) draw(clock.t); } }, 0);
    window.__lemo = { tl: tl, clock: clock };
  })();
</script>
`;
}

/**
 * One text of a code-film page made local. docPrefix: the document's way back to the project root; filePrefix: this file's way back
 * (a module's imports resolve from the module itself). Returns { text, lib: Set<path under the source's base>, libs: Set<"name@v/path">,
 * three: boolean }.
 */
export function rewriteLemoText(text, { version, docPrefix = "", filePrefix = docPrefix, source = "lemo", codeLibs = null } = {}) {
  const S = SOURCES[source], lib = new Set(), libs = new Set();
  let three = false;
  const at = (all, i) => IMPORT_BEFORE.test(all.slice(Math.max(0, i - 24), i));
  // the page's own import map for /node_modules/three: its three entries go (the app's R-THREE map resolves three@<version>)
  text = text.replace(IMPORT_MAP, (whole, json) => {
    let map; try { map = JSON.parse(json); } catch { return whole; }
    const imports = { ...(map.imports ?? {}) };
    if (!/^\/node_modules\/three\//.test(imports.three ?? "")) return whole;
    delete imports.three; delete imports["three/addons/"];
    three = true;
    return Object.keys(imports).length || map.scopes ? `<script type="importmap">${JSON.stringify({ ...map, imports })}</script>\n` : "";
  });
  if (version) {
    text = text.replace(NODE_THREE, (m0, p) => { three = true; return p.startsWith("build/") ? `three@${version}` : `three@${version}/examples/jsm/`; });
    text = text.replace(BARE_THREE, (m0, lead, q, addon) => { three = true; return `${lead}${q}three@${version}${addon ? `/examples/jsm/${addon.slice("/addons/".length)}` : ""}${q}`; });
  }
  text = text.replace(S.paths, (m0, q, p, i, all) => { lib.add(p); return `${q}${at(all, i) ? filePrefix : docPrefix}${S.vendor}/${S.sub(p)}`; });
  if (source === "mg") {
    // a pinned npm library from its own /node_modules (pins.codeLibs)
    text = text.replace(/(["'`])\/node_modules\/((?:@[^/"'`]+\/)?[^/"'`]+)\/([^"'`]+)\1/g, (m0, q, name, p, i, all) => {
      const v = codeLibs?.[name]?.version;
      if (!v || name === "three") return m0;
      libs.add(`${name}@${v}/${p}`);
      return `${q}${at(all, i) ? filePrefix : docPrefix}assets/_app/vendor/lib/${name}/${v}/${p}${q}`;
    });
    text = text.replace(/<link\b[^>]*href=["']\/assets\/fonts\/fonts\.css["'][^>]*>\s*/gi, "");          // R-FONTS declares the families
  }
  if (/three@\d+\.\d+\.\d+/.test(text)) three = true;
  return { text, lib, libs, three, core: lib };
}

/** Copy the library files a page names from the source's clone (a .gltf with its folder, lemo's fonts.css with its faces); scripts get
 *  the same rewrite and the source's MIT notice. Returns { copied, missing }. */
function copyLib(projectDir, paths, { root, version, source }) {
  const S = SOURCES[source], p = pin(source, root), copied = [], missing = [];
  if (!p) return { copied, missing: [...paths] };
  const dest = join(projectDir, ...S.vendor.split("/")), base = join(p.root, S.base);
  const todo = [...paths], done = new Set();
  while (todo.length) {
    let rel = todo.shift().replace(/\/+$/, "");
    if (/\.gltf$/i.test(rel) || /fonts\/fonts\.css$/.test(rel)) rel = dirname(rel).split(sep).join("/");
    if (done.has(rel)) continue;
    done.add(rel);
    const src = join(base, ...rel.split("/"));
    if (!src.startsWith(base + sep) || !existsSync(src)) { missing.push(rel); continue; }
    const files = statSync(src).isDirectory() ? walk(src).map((f) => relative(base, f).split(sep).join("/")) : [rel];
    for (const f of files) {
      const from = join(base, ...f.split("/")), to = join(dest, S.base, ...f.split("/"));
      mkdirSync(dirname(to), { recursive: true });
      if (/\.m?js$/.test(f)) {
        const up = "../".repeat(`${S.vendor}/${S.base}/${f}`.split("/").length - 1);
        const r = rewriteLemoText(read(from), { version, docPrefix: "", filePrefix: up, source });
        for (const c of r.lib) if (!done.has(c)) todo.push(c);
        writeFileSync(to, `${S.notice(p, f)}\n${r.text}`);
      } else cpSync(from, to);
      copied.push(`${S.vendor}/${S.base}/${f}`);
    }
  }
  if (copied.length && existsSync(join(p.root, "LICENSE"))) cpSync(join(p.root, "LICENSE"), join(dest, "LICENSE"));
  return { copied, missing };
}
/** Copy pinned npm library files ("name@v/path") from the app's runtime, with their LICENSE. */
function copyCodeLibs(projectDir, libs, root) {
  const dir = codeLibDir(root), copied = [], missing = [];
  for (const k of libs) {
    const [, name, v, p] = /^((?:@[^/]+\/)?[^@]+)@([^/]+)\/(.+)$/.exec(k) ?? [];
    if (!name) continue;
    for (const f of [p, "LICENSE"]) {
      const from = join(dir, name, v, ...f.split("/")), to = join(projectDir, "assets", "_app", "vendor", "lib", name, v, ...f.split("/"));
      if (!existsSync(from)) { if (f === p) missing.push(k); continue; }
      if (!existsSync(to)) { mkdirSync(dirname(to), { recursive: true }); cpSync(from, to); }
      if (f === p) copied.push(`assets/_app/vendor/lib/${name}/${v}/${p}`);
    }
  }
  return { copied, missing };
}
function walk(d) { const out = []; for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? out.push(...walk(f)) : out.push(f); } return out; }

/** The bridge into a document's text, once (an older bridge is replaced): before </body>, after the page's own scripts. */
export function withBridge(html) {
  const tag = bridgeScript();
  if (BRIDGE_TAG.test(html)) return html.replace(BRIDGE_TAG, tag);
  return html.includes("</body>") ? html.replace("</body>", `${tag}</body>`) : html + tag;
}

/** A built code film's root page with today's bridge: an older bridge in index.html is replaced (a film built before a bridge change,
 *  e.g. the one-pixel read, gets it before it is rendered, checked or previewed). Returns true when the page changed. */
export function refreshBridge(projectDir) {
  const f = join(projectDir, "index.html"), html = read(f);
  if (!BRIDGE_TAG.test(html)) return false;
  const next = withBridge(html);
  if (next === html) return false;
  writeFileSync(f, next);
  return true;
}

/** The source a project's style names (lemo-<slug> / mg-<id> / anidoodle-<id>), or null. */
export function projectSource(projectDir) {
  try { const id = JSON.parse(readFileSync(join(projectDir, ".moworks", "project.json"), "utf8")).style?.id ?? ""; return id.startsWith("lemo-") ? "lemo" : id.startsWith("mg-") ? "mg" : id.startsWith("anidoodle-") ? "anidoodle" : null; }
  catch { return null; }
}

/**
 * R-LEMO on one document and its scripts (project-relative paths). Writes the files it changes. Returns null when the page is not a
 * code-film page, else { source, files, copied, missing, three: Set<version> }.
 */
export function lemoPage(projectDir, docRel, scriptRels, { root = APP_ROOT, source = null } = {}) {
  const doc = join(projectDir, ...docRel.split("/"));
  const html = read(doc), scripts = scriptRels.map((f) => ({ f, text: read(join(projectDir, ...f.split("/"))) }));
  if (!html || !isLemoPage([html, ...scripts.map((s) => s.text)])) return null;
  source = source ?? projectSource(projectDir) ?? guessSource([html, ...scripts.map((s) => s.text)]);
  const version = pin(source, root)?.three ?? SOURCES[source].three, codeLibs = loadPins(root).codeLibs?.packages ?? {};
  const docPrefix = "../".repeat(docRel.split("/").length - 1);
  const files = [], lib = new Set(), libs = new Set();
  let three = false;
  for (const s of scripts) {
    const r = rewriteLemoText(s.text, { version, docPrefix, filePrefix: "../".repeat(s.f.split("/").length - 1), source, codeLibs });
    for (const c of r.lib) lib.add(c);
    for (const c of r.libs) libs.add(c);
    three ||= r.three;
    if (r.text !== s.text) { writeFileSync(join(projectDir, ...s.f.split("/")), r.text); files.push(s.f); }
  }
  const r = rewriteLemoText(html, { version, docPrefix, filePrefix: docPrefix, source, codeLibs });
  for (const c of r.lib) lib.add(c);
  for (const c of r.libs) libs.add(c);
  three ||= r.three || [...lib].some((c) => c.startsWith("three/"));
  let out = withBridge(r.text);
  // the film's root drives HyperFrames through a GSAP timeline: a page written without HF's starter (a What If or anidoodle page by its
  // pack's shape) gets the app's GSAP before the bridge (otherwise HF's check fails with "reading 'timeline'", G-HF-SCRIPT)
  if (docRel === "index.html" && !/gsap(?:\.min)?\.js/i.test(out)) {
    out = out.replace(BRIDGE_TAG, (tag) => `<script src="assets/_app/vendor/gsap.min.js"></script>\n${tag}`);
    vendorInto(projectDir, { gsap: true });
  }
  if (out !== html) { writeFileSync(doc, out); files.push(docRel); }
  const a = copyLib(projectDir, lib, { root, version, source }), b = copyCodeLibs(projectDir, libs, root);
  return { source, files, copied: [...a.copied, ...b.copied], missing: [...a.missing, ...b.missing], three: new Set(three ? [version] : []) };
}

/** The film: index.html and the film's own scripts (compositions/, assets/ but not assets/_app). */
export function lemoFilm(projectDir, scriptRels, opts) { return lemoPage(projectDir, "index.html", scriptRels, opts); }

/** A storyboard board: boards/<X>/index.html and every script inside its folder (a board sees only its own folder). */
export function lemoBoard(projectDir, boardHtmlRel, opts) {
  const dir = dirname(join(projectDir, ...boardHtmlRel.split("/")));
  const scripts = existsSync(dir) ? walk(dir).filter((f) => /\.m?js$/.test(f) && !/[\\/]assets[\\/]/.test(relative(dir, f))).map((f) => relative(projectDir, f).split(sep).join("/")) : [];
  return lemoPage(projectDir, boardHtmlRel, scripts, opts);
}

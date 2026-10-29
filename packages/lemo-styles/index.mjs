// Lemo-Opuscar styles: the second author of the Style Gallery. 66 video styles by Lemomo (LemoLab), each a
// STYLE.md (the style prompt: look, motion, camera, sound, native moves) and a demo film made in code (DEMO.md + demo/), read from the
// read-only clone at the pinned commit (config/pins.json lemo). Nothing is downloaded: the gallery shows the poster and the styleframe in
// the clone, the demo film is a link to the author's 720p cut (release "web"), opened in the user's browser.
//   needsSourceMedia  the 16 Edit & Documentary / Evidence Films styles cut from real material (information only): built in full, as
//                     Lemo-Opuscar does: the material is found and logged with the demo's own tools and sources
//                     (CREDITS, FACTS.md, a licence per item), fetched into the project's assets during the work; the render stays offline
//   voiceExcluded     the 3 demos whose narration the author excludes from CC BY (the gallery warns; never reused)
//   vi                the Vietnamese check of the fonts STYLE.md names (Google Fonts asked once, by importLemo(), kept in a small store)
// Credit: Lemomo (LemoLab), https://github.com/lemomo-ai/lemo-opuscar at the pinned commit; style prompts, code and docs MIT, demo films
// and stills CC BY 4.0 (credit LemoLab); used as shipped.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { googleHasVietnamese } from "../blocks-library/index.mjs";
import { vietnameseCheck } from "../looks-library/index.mjs";
import { fontMap } from "../hf-edit/finalize.mjs";

export const AUTHOR = { id: "lemomo", name: "Lemomo (LemoLab)", source: "Lemo-Opuscar" };
export const LICENCE = "MIT (style prompt, code); demo film and stills CC BY 4.0, credit LemoLab";
const SOURCE_MEDIA = new Set(["Edit & Documentary", "Evidence Films"]);
const VOICE_EXCLUDED = {          // README › Licence: excluded from CC BY 4.0, "Don't reuse them"
  "game-show": "the shouts are macOS system voices (say), which Apple licenses for personal, non-commercial use",
  "paper-lantern": "the narration is Microsoft Edge TTS",
  "news-package": "the narration is Doubao TTS (Volcengine's terms)",
};
const CJK_ONLY = /\b(SC|TC|HK|JP|KR)$|^ZCOOL\b/;          // fonts the styles use for Chinese or Japanese lines only
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** The clone and its pin: { repo, commit, root, three, demoUrl, head, intact }. head is the clone's own commit. */
export function lemoSource(root = APP_ROOT) {
  const pin = loadPins(root).lemo;
  if (!pin) return null;
  const dir = resolve(expandEnv(pin.root));
  return { ...pin, root: dir, head: sourceHead(dir), get intact() { return this.head === pin.commit; } };
}
export const fileLink = (src, rel) => `https://github.com/${src.repo}/blob/${src.commit}/${rel}`;
export const treeLink = (src, rel = "") => `https://github.com/${src.repo}/tree/${src.commit}${rel ? `/${rel}` : ""}`;

/** What the demo draws with: "three" (three.js), "webgl" (shaders of its own), else "2d" (canvas 2D / SVG). */
function engineOf(demoDir) {
  const kinds = new Set();
  const walk = (d) => { for (const n of existsSync(d) ? readdirSync(d) : []) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (!/^(node_modules|vendor|tools)$/.test(n)) walk(p); continue; }
    if (!/\.(m?js|html)$/.test(n)) continue;
    const s = readText(p);
    if (/from\s*["'](?:three|\/node_modules\/three)/.test(s)) kinds.add("three");
    if (/getContext\(\s*["'`](?:webgl2?|experimental-webgl)["'`]/.test(s)) kinds.add("webgl");
    if (/getContext\(\s*["'`]2d["'`]/.test(s)) kinds.add("2d");
    if (/<svg|createElementNS/.test(s)) kinds.add("svg");
  } };
  walk(demoDir);
  return { engine: kinds.has("three") ? "three" : kinds.has("webgl") ? "webgl" : "2d", engines: [...kinds].sort() };
}

/** The font families STYLE.md names: the families its demo declares or loads and the families the app bundles, when STYLE.md writes
 *  their name; Chinese / Japanese-only faces left out (they carry the Chinese lines, not Vietnamese text). */
function fontsNamed(styleMd, demoDir) {
  const cand = new Set(Object.keys(fontMap()));
  for (const n of existsSync(demoDir) ? readdirSync(demoDir) : []) {
    const s = /\.(css|m?js|html|sh)$/.test(n) ? readText(join(demoDir, n)) : "";
    for (const m of s.matchAll(/font-family:\s*['"]([^'"]+)['"]/g)) cand.add(m[1]);
    for (const m of s.matchAll(/family=([A-Za-z0-9+]+)/g)) cand.add(m[1].replace(/\+/g, " "));
  }
  const fontsCss = readText(join(demoDir, "fonts", "fonts.css"));
  for (const m of fontsCss.matchAll(/font-family:\s*['"]([^'"]+)['"]/g)) cand.add(m[1]);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...cand].filter((f) => f.length > 2 && !CJK_ONLY.test(f) && new RegExp(`(^|[^A-Za-z])${esc(f)}([^A-Za-z]|$)`).test(styleMd)).sort();
}

let cache = null;
/** Every style in the clone: [{ slug, num, en, cn, category, categoryCn, film, line, lineCn, uses, dur, frameSec, engine, engines,
 *  by, needsSourceMedia, voiceExcluded, fanFilm, sceneContent, subtitles, fonts, poster, styleframe, demoUrl, paths, credit }]; by: the
 *  contributor style.json names (a style the author merged from someone else), credited first. */
export function readStyles(root = APP_ROOT) {
  const src = lemoSource(root);
  if (!src || !existsSync(join(src.root, "styles"))) return [];
  const key = `${src.root}@${src.head}`;
  if (cache?.key === key) return cache.list;
  const list = [];
  for (const slug of readdirSync(join(src.root, "styles")).sort()) {
    const d = join(src.root, "styles", slug), j = readJson(join(d, "style.json"), null);
    if (!j || slug.startsWith("_") || !existsSync(join(d, "STYLE.md"))) continue;
    const styleMd = readText(join(d, "STYLE.md")), demoMd = readText(join(d, "DEMO.md")), demo = join(d, "demo");
    const has = (rel) => existsSync(join(d, ...rel.split("/")));
    list.push({
      slug, num: j.num ?? null, en: j.en ?? slug, cn: j.cn ?? null, category: j.category_en ?? null, categoryCn: j.category_cn ?? null,
      film: j.film ?? null, by: j.by?.name ? { name: j.by.name, url: j.by.url ?? null } : null, line: j.line ?? "", lineCn: j.line_cn ?? null, uses: j.uses ?? [], dur: j.dur ?? null, frameSec: j.frame_sec ?? null,
      ...engineOf(demo),
      needsSourceMedia: SOURCE_MEDIA.has(j.category_en),
      voiceExcluded: VOICE_EXCLUDED[slug] ?? null,
      fanFilm: /fan film/i.test(demoMd),
      sceneContent: has("demo/content.json"),
      subtitles: has(`${slug}.srt`),
      fonts: fontsNamed(styleMd, demo),
      poster: picture(join(d, "poster")) ? `${slug}/poster.jpg` : null,
      styleframe: picture(join(d, "demo", "stills", "styleframe")) ? `${slug}/styleframe.jpg` : null,
      demoUrl: src.demoUrl.replace("{slug}", slug),
      paths: { style: `styles/${slug}/STYLE.md`, demoMd: `styles/${slug}/DEMO.md`, demo: `styles/${slug}/demo` },
      hash: sha256(styleMd).slice(0, 16),
      credit: { author: j.by?.name ? `${j.by.name}, in Lemo-Opuscar by ${AUTHOR.name}` : AUTHOR.name, ...(j.by?.name ? { contributor: { name: j.by.name, url: j.by.url ?? null } } : {}), link: fileLink(src, `styles/${slug}/STYLE.md`), demo: src.demoUrl.replace("{slug}", slug), commit: src.commit,
        licence: LICENCE, made: "as shipped", madeNote: "Lemo-Opuscar's style prompt and demo source, unchanged; the film is built with HyperFrames through the app's bridge" },
    });
  }
  cache = { key, list };
  return list;
}
export const getLemo = (slug, root = APP_ROOT) => readStyles(root).find((s) => s.slug === slug) ?? null;
/** "lemo-<slug>" (a style id in the catalog and in projects) → the slug, or null. */
export const lemoSlug = (styleId) => (/^lemo-([a-z0-9-]+)$/.exec(String(styleId ?? ""))?.[1] ?? null);

// ---- the Vietnamese check, kept in <work>/library/lemo/lemo-<commit7>/catalog.json (the only step that asks the network)
export const storeRoot = (root = APP_ROOT) => process.env.MW_LEMO_ROOT ?? join(workRoot(root), "library", "lemo");
function storeFile(root) { const src = lemoSource(root); return src ? join(storeRoot(root), `lemo-${src.commit.slice(0, 7)}`, "catalog.json") : null; }
/** The file the fonts' Vietnamese check is kept in (the style catalog watches it). */
export const viStoreFile = storeFile;
/** { slug: { status, families } } from the store, or {} before importLemo() ran. */
export function viChecks(root = APP_ROOT) { const f = storeFile(root); return f ? readJson(f, { vi: {} }).vi ?? {} : {}; }
/** Check the fonts of every style once (bundled and Windows fonts locally, the rest asking Google Fonts) and keep the result. */
export async function importLemo({ root = APP_ROOT, google = googleHasVietnamese, onProgress = () => {} } = {}) {
  const styles = readStyles(root), f = storeFile(root);
  if (!f) throw Object.assign(new Error("Lemo-Opuscar is not pinned"), { code: "NOT_FOUND" });
  const fontCache = new Map(), vi = {};
  let done = 0;
  for (const s of styles) { vi[s.slug] = await vietnameseCheck(s.fonts, { google, cache: fontCache }); onProgress({ done: ++done, total: styles.length }); }
  const tmp = `${f}.tmp`;
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(tmp, JSON.stringify({ commit: lemoSource(root).commit, checkedAt: new Date().toISOString(), vi }, null, 1));
  rmSync(f, { force: true }); renameSync(tmp, f);
  return { styles: styles.length, missing: Object.values(vi).filter((v) => v.status === "missing").length };
}

/** A picture as shipped (<base>.jpg) or, in the copy bundled with the app, re-made at 960 px (<base>.webp): its file or null. */
const picture = (base) => [`${base}.jpg`, `${base}.webp`].find((f) => existsSync(f)) ?? null;
/** A gallery picture from the clone: "<slug>/poster.jpg", "<slug>/styleframe.jpg" or an OPUSCAR 98 still "opuscar98/<NN>.jpg" → its
 *  file (the .jpg, or the bundled .webp), or null. */
export function mediaFile(rel, root = APP_ROOT) {
  const src = lemoSource(root), o = /^opuscar98\/(\d{2})\.jpg$/.exec(rel);
  if (o && src) return picture(join(src.root, "styleboard", "img", "opuscar98", o[1]));
  const m = /^([a-z0-9-]+)\/(poster|styleframe)\.jpg$/.exec(rel);
  if (!m || !src) return null;
  const f = picture(m[2] === "poster" ? join(src.root, "styles", m[1], "poster") : join(src.root, "styles", m[1], "demo", "stills", "styleframe"));
  return f && f.startsWith(join(src.root, "styles") + sep) ? f : null;
}

/** The style's own rule file for a project: STYLE.md as shipped under a short header (what it is, its credit, what the app adds).
 *  Written to .moworks/rules/lemo-<slug>/SKILL.md by prepareRules. */
export function ruleText(slug, root = APP_ROOT) {
  const s = getLemo(slug, root), src = lemoSource(root);
  if (!s) return null;
  const md = readText(join(src.root, ...s.paths.style.split("/")));
  const header = ["---", `name: lemo-${slug}`, `description: "${s.en}: the Lemo-Opuscar style prompt (look, motion, camera grammar, sound, native moves) every step of this film keeps."`, "---", "",
    `> Lemo-Opuscar style **${s.en}**${s.cn ? ` (${s.cn})` : ""} · ${s.category} · by ${AUTHOR.name} · ${s.credit.link} · MIT · used as shipped.`,
    `> Read with .moworks/rules/lemo-opuscar/SKILL.md (how this app builds a Lemo-Opuscar film inside HyperFrames).`,
    s.needsSourceMedia ? `> This style cuts from real material: find it, fetch it and log it as this STYLE.md and Lemo-Opuscar's workflow say (its material tools are staged in .moworks/library/lemo/${slug}/demo/ from the first step), into the project's assets/, every item in CREDITS (source, licence) and every fact in FACTS.md; the owner's own material comes first. The render stays offline.` : "",
    s.fonts.length ? `> Fonts this prompt names: ${s.fonts.join(", ")}. Vietnamese text needs a font with Vietnamese letters: check before you use one.` : "",
    `> The demo film is one example among many (${s.film ?? "demo"}, ${s.demoUrl}); its source is staged into .moworks/library/lemo/${slug}/ for the build only.`, "", ""].filter((l) => l !== "").join("\n");
  return `${header}\n\n${md}`;
}

/** Copy the demo's DEMO.md and source (code, CREDITS; no films) into .moworks/library/lemo/<slug>/ for Claude to read at the build
 *  (Lemo-Opuscar's own rule: the treatment first, the demo later). toolsOnly: just the demo's material tools (demo/**\/tools/), which a
 *  style cut from real material uses from the first step (AGENTS.md, "Treatment first"). Returns { item, files }. */
export function stageDemo(projectDir, slug, root = APP_ROOT, { toolsOnly = false } = {}) {
  const s = getLemo(slug, root), src = lemoSource(root);
  if (!s) throw Object.assign(new Error("Lemo-Opuscar style not found"), { code: "NOT_FOUND" });
  const dest = join(projectDir, ".moworks", "library", "lemo", slug);
  const from = join(src.root, "styles", slug);
  const media = (p) => /\.(mp4|mov|wav|mp3|m4a|flac)$/i.test(p) || /[\\/](out|stills)([\\/]|$)/.test(p);
  if (toolsOnly) {
    if (!s.needsSourceMedia) return { item: s, files: [] };          // the other styles: the demo only at the build
    const tools = [];
    const walk = (d) => { for (const n of existsSync(d) ? readdirSync(d) : []) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n === "tools") tools.push(p); else walk(p); } } };
    walk(join(from, "demo"));
    for (const t of tools) cpSync(t, join(dest, t.slice(from.length + 1)), { recursive: true, filter: (p) => !media(p) });
    return { item: s, files: tools.map((t) => `.moworks/library/lemo/${slug}/${t.slice(from.length + 1).split(sep).join("/")}/`) };
  }
  rmSync(dest, { recursive: true, force: true }); mkdirSync(dest, { recursive: true });
  cpSync(join(from, "DEMO.md"), join(dest, "DEMO.md"));
  cpSync(join(from, "demo"), join(dest, "demo"), { recursive: true, filter: (p) => !media(p) });
  writeFileSync(join(dest, "CREDIT.md"), `# ${s.en}: the Lemo-Opuscar demo source\n\nBy ${AUTHOR.name}. ${fileLink(src, `styles/${slug}/DEMO.md`)} (commit ${src.commit}).\n`
    + `Code MIT; the demo film and its stills CC BY 4.0 (credit LemoLab); third-party assets as demo/CREDITS says. Read it for techniques only:\n`
    + `never its story, arc, shots, props or timings. Library paths in it (/core/…, /node_modules/three/…) are rewritten by the app when the film uses them.\n`);
  const rel = (f) => `.moworks/library/lemo/${slug}/${f}`;
  const files = [rel("CREDIT.md"), rel("DEMO.md"), ...["index.html", "main.js", "CREDITS"].filter((f) => existsSync(join(dest, "demo", f))).map((f) => rel(`demo/${f}`))];
  return { item: s, files };
}

/** OPUSCAR 98's style prompts: sample prompts for New project's "Sample prompt" button, showing how a style prompt
 *  is written; not styles. The text from styleboard/opuscar98_styles.json and the author's frame of each (styleboard/img/opuscar98) at the pinned commit; each keeps the film it was written
 *  for as the reference it is. { title, chapters: [{ id, en, years }], credit, prompts: [{ no, title, year, chapter, style_en, blend_en, render, dim, desc_en, prompt_en, image }] }. */
export function samplePrompts(root = APP_ROOT) {
  const src = lemoSource(root);
  const j = src ? readJson(join(src.root, "styleboard", "opuscar98_styles.json"), null) : null;
  if (!j?.films) return { title: null, credit: null, prompts: [] };
  const prompts = Object.values(j.films).map(({ no, title, year, chapter, style_en, blend_en, render, dim, desc_en, prompt_en }) => {
    const nn = String(no).padStart(2, "0");          // the author's frame of that film (shown, with credit)
    const image = picture(join(src.root, "styleboard", "img", "opuscar98", nn)) ? `/media/lemo/opuscar98/${nn}.jpg` : null;
    return { no, title, year, chapter, style_en, blend_en, render, dim, desc_en, prompt_en, image };
  }).sort((a, b) => a.no - b.no);
  const chapters = Object.values(j.chapters ?? {}).map(({ id, en, years }) => ({ id, en, years }));
  return { title: j.title ?? "OPUSCAR 98", film: j.film ?? null, chapters,
    credit: { author: AUTHOR.name, link: fileLink(src, "styleboard/opuscar98_styles.json"), commit: src.commit, licence: "MIT", made: "as shipped",
      images: { link: treeLink(src, "styleboard/img/opuscar98"), licence: "as shipped in the repo; README's CC BY 4.0 covers demo stills, OPUSCAR frames not stated" },
      note: "Each prompt was written for one Best Picture film, named as its reference; the film's title, characters and designs are not ours to use." },
    prompts };
}

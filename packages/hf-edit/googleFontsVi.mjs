// The Google Fonts families that draw Vietnamese: config/google-fonts-vi.json, pinned from google/fonts
// (tools/fonts/pin-google-fonts-vi.mjs). The list is data only; a family's files are downloaded the first time a film uses it, as the
// pinned files of google/fonts (each checked against its git blob SHA-1), kept in a machine cache and copied into the film with their
// licence. A family over bigBytes in all (the CJK families, Lato, Merriweather) is not fetched here: the one-time Google CSS download
// (googleFonts.mjs) serves it. Nothing is bundled: the 26 families of config/fonts.json stay the only ones that come with the app.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

const cacheDir = () => process.env.MW_FONTS_VI_DIR ?? join(APP_ROOT, "runtime", "fonts", "google-vi");
const listFile = () => process.env.MW_FONTS_VI_LIST ?? join(APP_ROOT, "config", "google-fonts-vi.json");
export const slug = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MB = 1024 * 1024;

let loaded = null;
/** The list: { source, bigBytes, families, noVietnamese } plus lower-case lookups. Read once per file path. */
export function viList() {
  const f = listFile();
  if (loaded?.file === f) return loaded.doc;
  const doc = JSON.parse(readFileSync(f, "utf8"));
  doc.byKey = new Map(Object.keys(doc.families).map((k) => [k.toLowerCase(), k]));
  doc.noVi = new Set(doc.noVietnamese.map((k) => k.toLowerCase()));
  loaded = { file: f, doc };
  return doc;
}

/** One family of the list (case does not matter): { family, ...row, big, mb } or null. */
export function viEntry(family) {
  const doc = viList(), name = doc.byKey.get(String(family ?? "").trim().toLowerCase());
  if (!name) return null;
  const row = doc.families[name];
  return { family: name, ...row, big: row.bytes > doc.bigBytes, mb: Math.round(row.bytes / MB * 10) / 10 };
}

/** Does Google Fonts draw Vietnamese in this family, from the list alone (no network)? true: it does; false: the family is on Google Fonts
 *  and does not; null: not known here (a name the repo does not have, e.g. a commercial font). */
export function viStatus(family) {
  const doc = viList(), k = String(family ?? "").trim().toLowerCase();
  if (doc.byKey.has(k)) return true;
  return doc.noVi.has(k) ? false : null;
}

/** Credit of a family, as the app's credit rule asks (author, link at the commit, licence, how it comes): null when it is not in the list. */
export function viCredit(family) {
  const e = viEntry(family);
  if (!e) return null;
  const { source } = viList();
  return { family: e.family, designer: e.designer, licence: e.licence, link: `https://github.com/${source.repo}/tree/${source.commit}/${e.folder}`, commit: source.commit,
    ...(e.upstream ? { upstream: e.upstream } : {}), how: "as shipped by google/fonts" };
}

/** A line for a font check: "Designer · OFL-1.1 · 0.4 MB". */
export function viLine(family) {
  const e = viEntry(family);
  return e ? `${e.designer || "Google Fonts"} · ${e.licence} · ${e.mb < 0.1 ? "< 0.1" : e.mb} MB${e.big ? " (large: fetched through Google Fonts)" : ""}` : "";
}

const GUESS = [["mono", /\b(mono|code|courier|typewriter|consolas)\b/i], ["handwriting", /\b(script|hand|brush|marker|pen|scribble|cursive|signature)\b/i],
  ["serif", /\b(serif|times|georgia|garamond|playfair|merriweather|lora|baskerville|didot|bodoni|cambria|minion|palatino|caslon)\b/i],          // a name with "sans" is answered before this
  ["display", /\b(display|poster|stencil|black|impact|bebas|anton|headline)\b/i]];
/** The kind a family name suggests when it is not in the list: mono, handwriting, serif, display or sans. */
export function guessCategory(family) {
  const name = String(family ?? "");
  if (/\bsans\b/i.test(name)) return /\bmono\b/i.test(name) ? "mono" : "sans";
  for (const [c, re] of GUESS) if (re.test(name)) return c;
  return "sans";
}

/** The nearest Vietnamese families from the list for a family that fails: the same kind (its own when it is in the list, else guessed from
 *  its name, or `category`), the ones that are not large first, the most used first. [{ family, category, designer, licence, mb, line }] */
export function viSuggest(family, { n = 3, category = null, exclude = [] } = {}) {
  const doc = viList(), own = viEntry(family), cat = category ?? own?.category ?? guessCategory(family);
  const skip = new Set([String(family ?? "").toLowerCase(), ...exclude.map((x) => String(x).toLowerCase())]);
  const rank = (e) => (e.category === cat ? 0 : 1000) + (e.bytes > doc.bigBytes ? 500 : 0) + (e.pop ?? 400);
  return Object.entries(doc.families).filter(([k]) => !skip.has(k.toLowerCase()))
    .map(([k, e]) => ({ k, e })).sort((a, b) => rank(a.e) - rank(b.e) || a.k.localeCompare(b.k)).slice(0, n)
    .map(({ k }) => { const e = viEntry(k); return { family: k, category: e.category, designer: e.designer, licence: e.licence, mb: e.mb, line: `${k} (${e.category}, ${viLine(k)})` }; });
}

/** The whole list for a picker: { source, count, families: [{ family, category, weights, italic, variable, licence, designer, link, mb, big, pop, installed }] }
 *  (most used first). `installed`: its files are already on this PC; the others download when a film uses them. */
export function viCatalog() {
  const doc = viList(), families = Object.keys(doc.families).map((k) => {
    const e = viEntry(k), ws = e.files.flatMap((f) => [f[2], f[3]]);
    return { family: k, category: e.category, weights: [Math.min(...ws), Math.max(...ws)], italic: e.files.some((f) => f[1] === "italic"), variable: e.files.some((f) => f[0].includes("[")),
      licence: e.licence, designer: e.designer, link: viCredit(k).link, mb: e.mb, big: e.big, pop: e.pop ?? null, installed: !e.big && existsSync(join(cacheDir(), slug(k), "source.json")) };
  }).sort((a, b) => (a.pop ?? 1e6) - (b.pop ?? 1e6) || a.family.localeCompare(b.family));
  return { source: doc.source, count: families.length, bigBytes: doc.bigBytes, families };
}

/** For a font check: the most used Vietnamese Google Fonts of each kind, one line per kind. */
export function viOptionsText(perKind = 10) {
  const doc = viList(), out = [];
  for (const cat of ["sans", "serif", "display", "handwriting", "mono"]) {
    const names = Object.entries(doc.families).filter(([, e]) => e.category === cat && e.bytes <= doc.bigBytes && e.pop).sort((a, b) => a[1].pop - b[1].pop).slice(0, perKind).map(([k]) => k);
    if (names.length) out.push(`${cat}: ${names.join(", ")}`);
  }
  return `Google Fonts with Vietnamese letters that the app downloads when a film uses them (${Object.keys(doc.families).length} families; most used first):\n${out.join("\n")}`;
}

/** A pinned file's git blob SHA-1: what the tree of google/fonts records for it. */
export const gitBlobSha1 = (buf) => createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const rawUrl = (commit, folder, file) => `https://raw.githubusercontent.com/google/fonts/${commit}/${folder}/${encodeURIComponent(file)}`;

/** The marked Vietnamese letters (the export gate's set, hf-qa/gates.mjs) that none of these font files draws: { checked, missing } with `missing`
 *  the letters missing from at least one file; null when the font reader of the pinned runtime is not there. */
async function vietnameseLetters(paths) {
  try {
    const { VI } = await import("../hf-qa/gates.mjs"), { resolveRuntime } = await import("../version-manager/index.mjs");          // gates.mjs imports finalize, which imports this file: loaded late
    const fk = createRequire(join(resolveRuntime().dir, "node_modules", "fontkit", "package.json"))("fontkit");
    const marked = [...VI].filter((c) => !/^[a-zA-Z]$/.test(c)), lacking = new Set();
    for (const p of paths) { const f = fk.openSync(p); for (const c of marked) if (!f.hasGlyphForCodePoint(c.codePointAt(0))) lacking.add(c); }
    return { checked: marked.length, missing: [...lacking].join("") };
  } catch { return null; }
}

/** What the first download found: { checked, missing: "" | the letters it lacks } for a family on this PC, null when it is not downloaded (or the
 *  reader was not there). The font check says "no Vietnamese letters" for a family whose `missing` is not empty. */
export function viVerified(family) {
  try {
    const e = viEntry(family);
    const v = e && JSON.parse(readFileSync(join(cacheDir(), slug(e.family), "source.json"), "utf8")).vietnamese;
    return v ?? null;
  } catch { return null; }
}

/**
 * The family's pinned files in the machine cache (downloaded once, each checked against the SHA-1 of the list; nothing half-written stays).
 * Returns { family, dir, files: [{ file, style, weight: [from, to] }], licenceFile, credit, cached } or null when the family is not in the
 * list or is large (the Google CSS route serves it). `download: false` only looks in the cache. Throws when a download fails or a file does
 * not match its hash.
 */
export async function installViFamily(family, { download = true, fetchImpl = fetch } = {}) {
  const e = viEntry(family);
  if (!e || e.big) return null;
  const { source } = viList(), dir = join(cacheDir(), slug(e.family)), done = join(dir, "source.json");
  const faces = e.files.map(([file, style, from, to]) => ({ file, style, weight: [from, to] }));
  const result = (cached) => ({ family: e.family, dir, files: faces, licenceFile: e.licenceFile?.[0] ?? null, credit: viCredit(e.family), cached, missing: viVerified(e.family)?.missing ?? null });
  if (existsSync(done)) return result(true);
  if (!download) return null;
  const tmp = `${dir}.tmp-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const sums = {};
  try {
    const wanted = [...e.files.map((f) => ({ name: f[0], sha1: f[5], size: f[4] })), ...(e.licenceFile ? [{ name: e.licenceFile[0], sha1: e.licenceFile[2], size: e.licenceFile[1] }] : [])];
    for (const w of wanted) {
      const r = await fetchImpl(rawUrl(source.commit, e.folder, w.name), { headers: { "User-Agent": "moworks-studio" } });
      if (!r.ok) throw Object.assign(new Error(`font download failed (${r.status}) for ${e.family}: ${w.name}`), { code: "FONT_DOWNLOAD" });
      const buf = Buffer.from(await r.arrayBuffer());
      if (gitBlobSha1(buf) !== w.sha1) throw Object.assign(new Error(`${e.family}: ${w.name} is not the pinned file of google/fonts (hash differs)`), { code: "FONT_HASH" });
      writeFileSync(join(tmp, w.name), buf);
      sums[w.name] = { bytes: buf.length, sha256: sha256(buf), gitBlobSha1: w.sha1 };
    }
    // METADATA's "vietnamese" subset is Google's own range, not all of the letters a film writes (Bungee Color lacks 92 of the 134 marked ones):
    // the letters are checked once, here, and kept with the family
    const vietnamese = await vietnameseLetters(e.files.map((f) => join(tmp, f[0])));
    writeFileSync(join(tmp, "source.json"), JSON.stringify({ ...viCredit(e.family), fetchedAt: new Date().toISOString(), from: "raw.githubusercontent.com", files: sums, vietnamese }, null, 2));
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, ".."), { recursive: true });
    renameSync(tmp, dir);
  } catch (err) {
    rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
  return result(false);
}

const FORMAT = { ttf: "truetype", otf: "opentype", woff: "woff", woff2: "woff2" };
/** Copy an installed family into the film (assets/_app/fonts/google-vi/<family>/, with its licence text and a CREDIT.json) and return its
 *  @font-face CSS with project-root paths, like the other app fonts. */
export function placeViFamily(projectDir, got) {
  const rel = `assets/_app/fonts/google-vi/${slug(got.family)}`, dst = join(projectDir, ...rel.split("/"));
  mkdirSync(dst, { recursive: true });
  const names = [...got.files.map((f) => f.file), ...(got.licenceFile ? [got.licenceFile] : [])];
  for (const n of names) if (!existsSync(join(dst, n))) copyFileSync(join(got.dir, n), join(dst, n));
  if (!existsSync(join(dst, "CREDIT.json"))) writeFileSync(join(dst, "CREDIT.json"), JSON.stringify(got.credit, null, 2));
  return got.files.map((f) => `@font-face { font-family: "${got.family}"; src: url("${rel}/${f.file}") format("${FORMAT[f.file.split(".").pop().toLowerCase()] ?? "truetype"}"); font-weight: ${f.weight[0] === f.weight[1] ? f.weight[0] : `${f.weight[0]} ${f.weight[1]}`}; font-style: ${f.style}; font-display: block; }`).join("\n");
}

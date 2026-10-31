// The user's own Looks: a brand guideline (PDF, PPTX, pictures, fonts, AI, PSD, an archive, a folder of them) scanned into a
// Look the HyperFrames way: a FRAME.md in HF's frame-preset format (YAML tokens + prose; HyperFrames' references/look.md, "The project's design spec"),
// preview stills drawn from its tokens, the Vietnamese check of its fonts, kept with versions. Stored in <work>/library/looks/custom/<slug>/:
//   look.json  { id, slug, title, status, version, versions, files, swatches, fonts, vi, description, stills, error, createdAt, updatedAt,
//                unread: [{ name, reason }] (what the last scan could not read), leftOut: [{ name, reason }] (what was picked and not taken),
//                guideline: [{ name, pages, sub, text, sheets }] (the PDFs as read), gaps: [what the current FRAME.md lacks for a film] }
//   files/     what the user uploaded, as uploaded (an archive unpacked)
//   derived/   a logo that came only as AI or PSD, as a picture a film can show
//   work/      what the scan made readable, kept for films to open (each PDF's whole text, contact sheets and pages through tools/intake/intake.py; a PPTX's theme,
//              text and pictures; the colour and font hints; READING.md, the list Claude reads) and the copy of HF's format
//   v<N>/      FRAME.md and stills/ of version N (a version is never changed: an edit or a restore makes the next one)
// The FRAME.md is written by a short Claude run that reads what the app made readable, beside one HF frame preset as the example of the
// format; the app reads its tokens back for the swatches, fonts and stills. The Look is the film's design: the project's frame.md is a
// plain copy of the current version (lookFrame in ./index.mjs), and the film gets its own copy of the kit's logos, fonts and guideline (placeKit).
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, linkSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, sep } from "node:path";
import { inflateRawSync } from "node:zlib";
import { APP_ROOT, resolveRuntime } from "../version-manager/index.mjs";
import { claudeEnv, findClaude } from "../system-status/index.mjs";
import { safeFileName } from "../project-service/index.mjs";
import { ARCHIVE, MAX_UNPACK_BYTES, MAX_UNPACK_FILES, PROGRAM, unpackArchive } from "../project-service/archive.mjs";
import { KIT_FILES } from "../project-service/layout.mjs";
import { checklistOf } from "../project-service/design.mjs";
import { familyKey, fontSlug, listLocalFonts, readFaces, useLocalFont } from "../hf-edit/localFonts.mjs";
import { runPy } from "../setup/python.mjs";
import { encodePoster } from "../library/preview-media.mjs";
import { currentStore, ffmpegExe, hfLookDir, items as hfItems, LOOK_GUIDE, puppeteerOf, storeRoot, vietnameseCheck } from "./index.mjs";

// the same list as OK_FILES in ui/src/screens/Looks.jsx
export const ACCEPT = /\.(pdf|pptx|png|jpe?g|webp|gif|svg|ttf|otf|woff2?|zip|rar|7z|ai|psd|psb)$/i;
// MAX_FILES (ui/src/screens/Looks.jsx too): a brand folder holds logos in each colour and format and each font in several formats: the one
// that set this came with 97 files, 81 without Windows' own, 73 kept once its .eot twins and an archive that repeated them were gone. 300
// leaves room for four of those and still stops a folder picked by mistake. More files do not mean more tokens: Claude never reads a font
// file, an artwork is read in one format, and pictures past READ_PICTURES go on sheets.
export const MAX_FILE = 500 * 1024 * 1024, MAX_FILES = 300;
const READ_PICTURES = 30;
// Windows' and a Mac's own files: ignored without a word (the dialog does the same, SYSTEM_FILE in Looks.jsx)
export const SYSTEM_FILE = /^(desktop\.ini|thumbs\.db|ehthumbs\.db|\.ds_store|\._.*|~\$.*)$/i;
export const PASSWORD_REASON = "has a password: use a copy without one";
const DAMAGED_REASON = "could not be opened: it may be damaged, try another copy";
export const FREE = { id: null, title: "Free (Claude designs)" };
const OWNER = { author: "The owner (uploaded guideline)", link: null, licence: "the owner's own brand material", made: "written from the idea", madeNote: "scanned by the app from the owner's guideline files into HyperFrames' frame-preset format" };

const now = () => new Date().toISOString();
const err = (code, message) => Object.assign(new Error(message), { code });
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const uniq = (a) => [...new Set(a)];
const customRoot = (root) => join(storeRoot(root), "custom");
const dirOf = (slug, root) => join(customRoot(root), slug);
export const customSlug = (id) => /^custom\/([a-z0-9][a-z0-9-]{0,47})$/.exec(String(id ?? ""))?.[1] ?? null;
const kindOf = (n) => /\.pdf$/i.test(n) ? "pdf" : /\.pptx$/i.test(n) ? "pptx" : /\.svg$/i.test(n) ? "svg" : /\.(ttf|otf|woff2?)$/i.test(n) ? "font" : /\.ai$/i.test(n) ? "ai" : /\.ps[db]$/i.test(n) ? "psd" : "image";
const baseOf = (n) => String(n).replace(/\.[^.]+$/, "").toLowerCase();

/** Why a picked file is not taken, in the owner's words: shown on the kit's panel and told to Claude. */
export function leftOutReason(name) {
  const e = extname(String(name)).toLowerCase();
  if (ARCHIVE.test(name)) return "an archive inside an archive: unpack it and add the files";
  if (ACCEPT.test(name)) return `over the limit of ${MAX_FILES} files in a Brand Kit`;
  if (e === ".eot") return "an old web font format: add the font as TTF, OTF or WOFF";
  if (e === ".ppt") return "an old PowerPoint file: save it as PPTX";
  if ([".doc", ".docx", ".xls", ".xlsx", ".key", ".indd", ".eps", ".fig", ".sketch", ".xd"].includes(e)) return "cannot be read here: add a PDF export of it";
  if (/^\.(mp4|mov|webm|m4v|mkv|avi|mp3|wav|m4a|flac|ogg|aac|opus)$/.test(e)) return "a video or a sound: add it to the film's assets instead";
  if (PROGRAM.test(name)) return "a program, not brand material";
  return "a kind of file a Brand Kit does not read";
}
/** The names as left-out rows: a kit's name once, without Windows' own files. */
const leftOutRows = (names) => uniq((names ?? []).map((n) => safeFileName(n, ""))).filter((n) => n && !SYSTEM_FILE.test(n)).map((name) => ({ name, reason: leftOutReason(name) }));
const mergeRows = (a, b) => [...new Map([...(a ?? []), ...b].map((x) => [x.name, x])).values()];

/** A Look's name as a folder name: ASCII, Vietnamese letters without their marks. */
export function slugify(title) {
  return String(title ?? "").replace(/[đĐ]/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "look";
}

// ---- the store
function saveMeta(m, root) { m.updatedAt = now(); writeFileSync(join(dirOf(m.slug, root), "look.json"), JSON.stringify(m, null, 2) + "\n"); return m; }
export function customLooks(root = APP_ROOT) {
  const d = customRoot(root);
  if (!existsSync(d)) return [];
  return readdirSync(d).map((n) => readJson(join(d, n, "look.json"), null)).filter((m) => m?.id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export function getCustom(id, root = APP_ROOT) { const s = customSlug(id); return s ? readJson(join(dirOf(s, root), "look.json"), null) : null; }
function must(id, root) { const m = getCustom(id, root); if (!m) throw err("NOT_FOUND", "Brand Kit not found"); return m; }

export function createLook({ title, leftOut } = {}, root = APP_ROOT) {
  const t = String(title ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!t) throw err("INVALID", "Name the Brand Kit");
  const base = slugify(t);
  let slug = base, i = 2;
  while (existsSync(dirOf(slug, root))) slug = `${base.slice(0, 36)}-${i++}`;
  mkdirSync(join(dirOf(slug, root), "files"), { recursive: true });
  return saveMeta({ id: `custom/${slug}`, slug, title: t, status: "draft", version: 0, versions: [], files: [], swatches: [], fonts: [], vi: null, description: "",
    stills: [], error: null, unread: [], leftOut: leftOutRows(leftOut), createdAt: now() }, root);
}

/** Where an uploaded file goes (the server streams the body there, then calls fileAdded, or addArchive for an archive). */
export function fileTarget(id, name, root = APP_ROOT) {
  const m = must(id, root);
  if (m.status === "scanning") throw err("BUSY", "The Brand Kit is being scanned");
  const n = safeFileName(name, "file");
  if (!ACCEPT.test(n)) throw err("INVALID", "A guideline is PDF, PPTX, pictures, fonts, AI, PSD or a ZIP of them");
  if (m.files.length >= MAX_FILES && !m.files.some((f) => f.name === n)) throw err("INVALID", `At most ${MAX_FILES} files per Brand Kit`);
  return join(dirOf(m.slug, root), "files", n);
}
export function fileAdded(id, path, root = APP_ROOT) {
  const m = must(id, root), name = basename(path);
  m.files = [...m.files.filter((f) => f.name !== name), { name, size: statSync(path).size, kind: kindOf(name), at: now() }];
  m.leftOut = (m.leftOut ?? []).filter((x) => x.name !== name);
  return saveMeta(m, root);
}
/** The name a file takes among the kit's: its own; null when the kit has it already (the same name and size); "name (2)" when the name holds other bytes. */
function nameAmong(files, name, size) {
  const e = extname(name), b = name.slice(0, name.length - e.length);
  for (let i = 1, n = name; ; n = `${b} (${++i})${e}`) {
    const x = files.find((y) => y.name === n);
    if (!x) return n;
    if (x.size === size) return null;
  }
}
/** An uploaded archive, unpacked the way the Assets tab does it (project-service/archive.mjs: Windows' tar, guarded against a zip bomb and
 *  paths that lead outside): its files join the kit by name, a file the kit already has (same name, same size) once, one of the same
 *  name and other bytes as "name (2)"; what is not taken is listed. The archive's own copy goes. */
export async function addArchive(id, path, root = APP_ROOT) {
  const name = basename(path), u = await unpackArchive(path);
  rmSync(path, { force: true });
  const m = must(id, root), files = join(dirOf(m.slug, root), "files");
  if (!u.ok) {
    const why = { unsafe: "has files that point outside it: unpack it and add the files", "too-many": `has over ${MAX_UNPACK_FILES} files: unpack it and add the ones you need`,
      "too-large": `is over ${Math.round(MAX_UNPACK_BYTES / 1024 ** 3)} GB unpacked: unpack it and add the ones you need`, empty: "has no files to add" }[u.reason] ?? "could not be opened: unpack it and add the files";
    m.leftOut = mergeRows(m.leftOut, [{ name, reason: why }]);
    return saveMeta(m, root);
  }
  try {
    const names = u.files.map((f) => safeFileName(f.name, "file")), bases = new Set(names.filter((n) => ACCEPT.test(n) && !ARCHIVE.test(n)).map(baseOf));
    const skipped = [...u.skipped];
    for (const f of u.files) {
      let n = safeFileName(f.name, "file");
      if (SYSTEM_FILE.test(n)) continue;
      // an .eot beside the same font in a format the kit takes says nothing more
      if (/\.eot$/i.test(n) && bases.has(baseOf(n))) continue;
      if (!ACCEPT.test(n) || ARCHIVE.test(n)) { skipped.push(n); continue; }
      n = nameAmong(m.files, n, f.size);
      if (!n) continue;
      if (m.files.length >= MAX_FILES) { skipped.push(n); continue; }
      copyFileSync(f.abs, join(files, n));
      m.files.push({ name: n, size: f.size, kind: kindOf(n), at: now() });
    }
    m.leftOut = mergeRows(m.leftOut, leftOutRows(skipped));
  } finally { u.cleanup(); }
  return saveMeta(m, root);
}
export function removeFile(id, name, root = APP_ROOT) {
  const m = must(id, root), n = safeFileName(name, "");
  if (m.status === "scanning") throw err("BUSY", "The Brand Kit is being scanned");
  rmSync(join(dirOf(m.slug, root), "files", n), { force: true });
  m.files = m.files.filter((f) => f.name !== n);
  m.unread = (m.unread ?? []).filter((x) => x.name !== n);
  m.leftOut = (m.leftOut ?? []).filter((x) => x.name !== n);
  return saveMeta(m, root);
}
export function deleteLook(id, root = APP_ROOT) {
  const m = must(id, root);
  if (m.status === "scanning") throw err("BUSY", "The Brand Kit is being scanned");
  rmSync(dirOf(m.slug, root), { recursive: true, force: true });
  return { deleted: m.id };
}

// ---- reading a guideline
/** The entries of a ZIP file (a PPTX is one): Map name → () => Buffer (stored or deflated entries). */
export function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw err("INVALID", "Not a ZIP file");
  const count = buf.readUInt16LE(e + 10), out = new Map();
  let p = buf.readUInt32LE(e + 16);
  for (let i = 0; i < count && buf.readUInt32LE(p) === 0x02014b50; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    p += 46 + nlen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    out.set(name, () => {
      const at = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), d = buf.subarray(at, at + size);
      return method === 0 ? Buffer.from(d) : method === 8 ? inflateRawSync(d) : null;
    });
  }
  return out;
}
const unxml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const count = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k); };

/** A PPTX: its theme (colour scheme, heading and body fonts), the colours and fonts its slides use most, each slide's text (slides.md) and
 *  its biggest pictures (media/), written into outDir. */
export function readPptx(file, outDir) {
  const z = unzip(readFileSync(file)), text = (n) => z.get(n)?.()?.toString("utf8") ?? "";
  const names = [...z.keys()], num = (n) => Number(/(\d+)\.xml$/.exec(n)?.[1] ?? 0);
  const theme = { colors: {}, heading: null, body: null };
  for (const n of names.filter((x) => /^ppt\/theme\/theme\d+\.xml$/.test(x)).sort((a, b) => num(a) - num(b))) {
    const x = text(n), scheme = /<a:clrScheme[^>]*>([\s\S]*?)<\/a:clrScheme>/.exec(x)?.[1];
    if (!scheme) continue;
    for (const m of scheme.matchAll(/<a:(dk1|lt1|dk2|lt2|accent[1-6]|hlink|folHlink)>([\s\S]*?)<\/a:\1>/g)) {
      const v = /(?:srgbClr val|lastClr)="([0-9A-Fa-f]{6})"/.exec(m[2])?.[1];
      if (v) theme.colors[m[1]] = `#${v.toUpperCase()}`;
    }
    theme.heading = /<a:majorFont>[\s\S]*?<a:latin typeface="([^"]+)"/.exec(x)?.[1] ?? null;
    theme.body = /<a:minorFont>[\s\S]*?<a:latin typeface="([^"]+)"/.exec(x)?.[1] ?? null;
    break;
  }
  const slides = names.filter((x) => /^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a, b) => num(a) - num(b));
  const used = { colors: [], fonts: [] }, md = ["# Slides: their text, in order", ""];
  slides.forEach((n, i) => {
    const x = text(n);
    used.colors.push(...[...x.matchAll(/srgbClr val="([0-9A-Fa-f]{6})"/g)].map((m) => `#${m[1].toUpperCase()}`));
    used.fonts.push(...[...x.matchAll(/<a:(?:latin|ea|cs) typeface="([^"+][^"]*)"/g)].map((m) => m[1]));
    const paras = x.split("</a:p>").map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => unxml(m[1])).join("").trim()).filter(Boolean);
    md.push(`## Slide ${i + 1}`, "", ...paras, "");
  });
  mkdirSync(join(outDir, "media"), { recursive: true });
  writeFileSync(join(outDir, "slides.md"), md.join("\n").slice(0, 60000) + "\n");
  const media = names.filter((x) => /^ppt\/media\/[^/]+\.(png|jpe?g|gif|svg)$/i.test(x)).map((n) => ({ n, b: z.get(n)() })).filter((x) => x.b)
    .sort((a, b) => b.b.length - a.b.length).slice(0, 24);
  for (const { n, b } of media) writeFileSync(join(outDir, "media", basename(n)), b);
  return { slides: slides.length, theme, colors: count(used.colors).slice(0, 12), fonts: count(used.fonts).slice(0, 8), media: media.map(({ n }) => `media/${basename(n)}`) };
}

/** The main colours of a picture: its pixels scaled down by ffmpeg, bucketed, close colours merged; most covered first. */
export function quantize(rgb, n = 6) {
  const bins = new Map();
  for (let i = 0; i + 2 < rgb.length; i += 3) {
    const k = ((rgb[i] >> 3) << 10) | ((rgb[i + 1] >> 3) << 5) | (rgb[i + 2] >> 3), b = bins.get(k) ?? [0, 0, 0, 0];
    b[0] += rgb[i]; b[1] += rgb[i + 1]; b[2] += rgb[i + 2]; b[3]++; bins.set(k, b);
  }
  const out = [], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (const b of [...bins.values()].sort((x, y) => y[3] - x[3]).map(([r, g, bl, c]) => [r / c, g / c, bl / c])) {
    if (out.every((o) => d(o, b) > 40)) out.push(b);
    if (out.length >= n) break;
  }
  return out.map((c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`);
}
function pictureColours(file, root) {
  try {
    const rgb = execFileSync(ffmpegExe(root), ["-v", "error", "-i", file, "-frames:v", "1", "-vf", "scale=48:48:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
      { windowsHide: true, maxBuffer: 1 << 20, stdio: ["ignore", "pipe", "ignore"] });
    return quantize(rgb);
  } catch { return []; }
}

/** The tokens of a FRAME.md read back: name, description, colors [{ name, hex }], fonts (families named in typography), the display and
 *  body families. */
export function parseFrame(md) {
  const text = String(md ?? "").replace(/\r\n/g, "\n"), front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  const block = (k) => new RegExp(`^${k}:\\s*\\n((?:[ \\t]+.*\\n?|\\s*\\n)+)`, "m").exec(front)?.[1] ?? "";
  const colors = [...block("colors").matchAll(/^[ \t]+([\w-]+):\s*"?(#[0-9a-fA-F]{6})\b/gm)].map((m) => ({ name: m[1], hex: m[2].toUpperCase() }));
  const typo = [...block("typography").matchAll(/^[ \t]+([\w-]+):\s*\{[^}\n]*fontFamily:\s*"?([^",}\n]+?)"?\s*[,}]/gm)].map((m) => ({ role: m[1], family: m[2].trim() }));
  const fonts = uniq(typo.map((t) => t.family));
  const pick = (re) => typo.find((t) => re.test(t.role))?.family ?? null;
  return { name: (/^name:\s*(.+)$/m.exec(front)?.[1] ?? "").trim(), description: (/^description:\s*>?\s*\n((?:[ \t]+.+\n?)+)/m.exec(front)?.[1] ?? /^description:\s*(.+)$/m.exec(front)?.[1] ?? "").replace(/\s+/g, " ").trim(),
    colors, fonts, display: pick(/display|headline|title|hero|h1/i) ?? fonts[0] ?? null, body: pick(/^body|text|paragraph|copy/i) ?? fonts[1] ?? fonts[0] ?? null };
}

// ---- the kit's fonts and logos
/** The kit's fonts as their files say: [{ family, vi, files: [{ file, weight, italic }] }], one file a face (a font in several formats is one). */
export function kitFonts(m, root = APP_ROOT) {
  if (!(m?.files ?? []).some((f) => f.kind === "font")) return [];
  try { return listLocalFonts({ dir: join(dirOf(m.slug, root), "files") }); } catch { return []; }
}
// what a film takes for an artwork that came in several formats: the one that scales, then the ones with no ground
const LOGO_ORDER = [".svg", ".png", ".webp", ".gif", ".jpg", ".jpeg"];
const logoRank = (n) => { const i = LOGO_ORDER.indexOf(extname(n).toLowerCase()); return i < 0 ? LOGO_ORDER.length : i; };
const MAX_LOGOS = 100, MAX_LOGO_BYTES = 30 * 1024 * 1024;
/** The kit's logos and pictures for a film: each artwork once, and an AI or PSD that came with no picture as the one the scan made. */
export function kitLogos(m, root = APP_ROOT) {
  const dir = dirOf(m.slug, root), unread = new Set((m.unread ?? []).map((x) => x.name)), best = new Map();
  const take = (file, name) => { const k = baseOf(name), was = best.get(k); if (!was || logoRank(name) < logoRank(was.name)) best.set(k, { file, name }); };
  for (const f of m.files ?? []) {
    if (!["image", "svg"].includes(f.kind) || unread.has(f.name)) continue;
    const p = join(dir, "files", f.name);
    if (existsSync(p) && statSync(p).size <= MAX_LOGO_BYTES) take(p, f.name);
  }
  const made = join(dir, "derived");
  if (existsSync(made)) for (const n of readdirSync(made)) if (!best.has(baseOf(n))) take(join(made, n), n);
  return [...best.values()].slice(0, MAX_LOGOS);
}
/** Where a film's copy of the kit's logos goes; the fonts go in assets/1_design/fonts/<family>/, as a font the user adds. */
export const KIT_LOGOS = "assets/1_design/images/brand-kit";
const ASKED_DIR = ".moworks/brand-kit";
/** Where a film's copy of the guideline goes (never served by the preview, not in the film's history), and its list of what is there. */
export const KIT_GUIDELINE = ".moworks/library/guideline";
const GUIDELINE_FILE = "GUIDELINE.md";
const MIN_CHECKS = 10;          // a guideline's rules on fewer lines than this were not gone through

/** What a Brand Kit's FRAME.md lacks for a film to be checked against its guideline (owner 31/10: the kit holds enough to check every film):
 *  the kit's scan asks Claude once more for these, and the kit's panel names what is still missing. guideline: the PDFs read. */
export function kitGaps(md, guideline = []) {
  const t = String(md ?? "").replace(/\r\n/g, "\n"), has = (h) => new RegExp(`^## ${h}[ \\t]*$`, "m").test(t), out = [];
  if (!has("Crop limits")) out.push("Crop limits");
  if (!has("Guideline motion")) out.push("Guideline motion");
  if (guideline.length && !has("Guideline map")) out.push("Guideline map");
  else if (guideline.length) {
    const map = (/^## Guideline map[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(t)?.[1] ?? "").toLowerCase();
    const left = guideline.filter((g) => !map.includes(baseOf(g.name)));
    if (left.length) out.push(`Guideline map: ${left.map((g) => g.name).join(", ")}`);
  }
  if (checklistOf(t).length < MIN_CHECKS) out.push("Guideline checklist");
  return out;
}

/** The kit's guideline into a film: its text, its sheets and its pages, each file hard-linked where it can be (a kit's hundreds of pages cost a film nothing
 *  on the same drive, and a later scan of the kit leaves the film's own as they were), with the list Claude starts from. */
function placeGuideline(m, filmDir, root) {
  const dir = dirOf(m.slug, root), base = join(filmDir, ...KIT_GUIDELINE.split("/")), lines = [];
  const put = (from, to) => { mkdirSync(join(to, ".."), { recursive: true }); try { linkSync(from, to); } catch { copyFileSync(from, to); } };
  for (const g of m.guideline ?? []) {
    const from = join(dir, ...g.sub.split("/")), name = basename(g.sub);
    if (!existsSync(from)) continue;
    const tree = (d, rel = "") => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) tree(join(d, e.name), `${rel}${e.name}/`); else put(join(d, e.name), join(base, name, ...`${rel}${e.name}`.split("/"))); } };
    tree(from);
    const at = (x) => `${KIT_GUIDELINE}/${name}/${basename(x)}`, paged = existsSync(join(from, "pages"));
    lines.push(`- ${g.name}, ${g.pages} page(s): ${g.text.length ? `its whole text: ${g.text.map(at).join(", ")}` : "no text in it, its words are only in its pictures"}; every page small and numbered on sheets: ${g.sheets.map(at).join(", ")}${paged ? `; one page closer: ${KIT_GUIDELINE}/${name}/pages/page-NNN.jpg (NNN: its number in three digits)` : ""}.`);
  }
  if (!lines.length) return null;
  writeFileSync(join(base, GUIDELINE_FILE), ["# The guideline behind this film's Brand Kit", "", "The owner's guideline as the kit read it. frame.md's page numbers lead here.", "", ...lines, ""].join("\n"));
  return `${KIT_GUIDELINE}/${GUIDELINE_FILE}`;
}

/** Copy the kit's logos and fonts into a new film, once, when the film is made: the film keeps these copies, so a kit changed or deleted
 *  later never changes it. The fonts FRAME.md names (all of them when it names none it has), declared in index.html; recorded in KIT_FILES,
 *  so they never count as files the user added, and Claude is told of them apart (agent designLines). asked: a kit that is only a
 *  reference for Prepare (the style keeps its author's design): beside its spec in .moworks/brand-kit/, declared nowhere. Returns what was
 *  copied (paths in the project), or null when the id is no kit of the user's. */
export function placeKit(id, filmDir, { root = APP_ROOT, now: at = now(), asked = false } = {}) {
  const m = getCustom(id, root);
  if (!m) return null;
  const want = new Set(parseFrame(frameText(m, root) ?? "").fonts.map(familyKey));
  const all = kitFonts(m, root), named = all.filter((f) => want.has(familyKey(f.family)));
  const out = { id: m.id, title: m.title, version: m.version, at, logos: [], fonts: [], guideline: null };
  const logoDir = asked ? `${ASKED_DIR}/logos` : KIT_LOGOS;
  for (const l of kitLogos(m, root)) {
    mkdirSync(join(filmDir, ...logoDir.split("/")), { recursive: true });
    copyFileSync(l.file, join(filmDir, ...logoDir.split("/"), l.name));
    out.logos.push(`${logoDir}/${l.name}`);
  }
  for (const f of named.length ? named : all) {
    const rel = `${asked ? `${ASKED_DIR}/fonts` : "assets/1_design/fonts"}/${fontSlug(f.family)}`;
    let names;
    if (asked) {
      mkdirSync(join(filmDir, ...rel.split("/")), { recursive: true });
      names = f.files.map((x) => { copyFileSync(x.file, join(filmDir, ...rel.split("/"), basename(x.file))); return basename(x.file); });
    } else names = useLocalFont(filmDir, f.family, { dir: join(dirOf(m.slug, root), "files") })?.files ?? [];
    out.fonts.push({ family: f.family, vi: f.vi, files: names.map((n) => `${rel}/${n}`) });
  }
  try { out.guideline = placeGuideline(m, filmDir, root); } catch (e) { console.error(`[brand kit] guideline not copied: ${e.message}`); }
  if (!asked && (out.logos.length || out.fonts.length || out.guideline)) {
    mkdirSync(join(filmDir, ".moworks"), { recursive: true });
    writeFileSync(join(filmDir, ...KIT_FILES.split("/")), JSON.stringify(out, null, 1) + "\n");
  }
  return out;
}

// ---- the scan
/** What each file is for Claude, read once: { hints, inputs, reading, unread, guideline }. inputs: the paths Claude reads; reading: the same as
 *  lines of READING.md, said per file; unread: [{ name, reason }]. A PDF goes through tools/intake/intake.py (Read stops at 20 MB and a
 *  long PDF is many reads): its whole text, a contact sheet of every page, each page ready for a closer look. A password is found here,
 *  before Claude is asked for anything. An artwork in several formats is read in one of them (AI and PSD need not be opened when the same name
 *  came as a picture); the same bytes under two names are read once. */
async function readFiles(m, dir, root, { signal = null, onProgress = () => {} } = {}) {
  const hints = { colours: [], fonts: [], pptx: [] }, inputs = [], reading = [], unread = [], guideline = [];
  const files = m.files.filter((f) => existsSync(join(dir, "files", f.name)));
  const INTAKE = "tools/intake/intake.py";
  const fail = (f, reason, more = {}) => unread.push({ name: f.name, reason, ...more });
  const why = (r, f) => r.password ? PASSWORD_REASON
    : /not installed|Python is not/i.test(r.error ?? "") ? "the app's Python components are missing: Install them in Settings › System"
      : f.kind === "ai" ? "saved without PDF content: add a PDF or PNG export of it" : DAMAGED_REASON;
  const pictures = new Map();
  for (const f of files) if (["image", "svg"].includes(f.kind)) { const k = baseOf(f.name); pictures.set(k, [...(pictures.get(k) ?? []), f]); }
  const seen = new Map();          // size → the files of that size: the same bytes under two names are read once
  const hashOf = (p) => createHash("sha1").update(readFileSync(p)).digest("hex");
  const sameAs = (f, p) => {
    const list = seen.get(f.size) ?? [];
    if (!list.length) { seen.set(f.size, [{ name: f.name, p }]); return null; }
    const h = hashOf(p), hit = list.find((x) => (x.h ??= hashOf(x.p)) === h);
    if (!hit) list.push({ name: f.name, p, h });
    return hit?.name ?? null;
  };
  const made = (from, f) => { mkdirSync(join(dir, "derived"), { recursive: true }); cpSync(from, join(dir, "derived", `${f.name.replace(/\.[^.]+$/, "")}.png`)); };
  const others = files.filter((f) => !["image", "svg"].includes(f.kind));
  for (const [i, f] of others.entries()) {
    const p = join(dir, "files", f.name);
    onProgress({ stage: "Reading the files", progress: 5 + Math.round((14 * i) / others.length) });
    if (f.kind === "font") {
      try { if (!readFaces(p).length) fail(f, "has no family name: it cannot be used"); } catch { fail(f, "could not be read as a font"); }
    } else if (f.kind === "pptx") {
      const twin = sameAs(f, p);
      if (twin) { reading.push(`- ${f.name}: the same file as ${twin}.`); continue; }
      const sub = `work/pptx-${i + 1}`;
      try {
        const r = readPptx(p, join(dir, ...sub.split("/")));
        hints.pptx.push({ file: f.name, slides: r.slides, theme: r.theme, colours: r.colors, fonts: r.fonts });
        hints.colours.push(...Object.values(r.theme.colors), ...r.colors);
        hints.fonts.push(...[r.theme.heading, r.theme.body].filter(Boolean), ...r.fonts);
        const media = r.media.map((x) => `${sub}/${x}`);
        inputs.push(`${sub}/slides.md`, ...media);
        reading.push(`- ${f.name}, PowerPoint, ${r.slides} slide(s): its text: ${sub}/slides.md${media.length ? `; its pictures: ${media.join(", ")}` : ""}.`);
      } catch { fail(f, DAMAGED_REASON); }
    } else if (f.kind === "pdf" || f.kind === "ai") {
      if (f.kind === "ai" && pictures.has(baseOf(f.name))) { reading.push(`- ${f.name}: the same artwork as the picture of that name.`); continue; }
      const twin = sameAs(f, p);
      if (twin) { reading.push(`- ${f.name}: the same file as ${twin}.`); continue; }
      const sub = `work/${f.kind}-${i + 1}`, abs = join(dir, ...sub.split("/"));
      const r = await runPy(root, INTAKE, ["pdf", p, abs, ...(f.kind === "ai" ? ["--logo"] : [])], { timeoutMs: 10 * 60 * 1000, signal });
      if (!r.ok) { fail(f, why(r, f), r.password ? { password: true } : {}); continue; }
      const texts = r.chars ? r.text.map((x) => `${sub}/${x}`) : [], sheets = r.sheets.map((x) => `${sub}/${x}`);
      inputs.push(...texts, ...sheets);
      if (f.kind === "pdf") guideline.push({ name: f.name, pages: r.pages, sub, text: texts, sheets });
      reading.push(`- ${f.name}, ${f.kind === "ai" ? "Illustrator file" : "PDF"}, ${r.pages} page(s): ${texts.length ? `its whole text: ${texts.join(", ")}` : "no text in it, its words are only in its pictures: open the pages that matter"}; every page small and numbered on sheets: ${sheets.join(", ")}; one page closer: ${sub}/pages/page-NNN.jpg (NNN: its number in three digits).`);
      if (r.logo) made(join(abs, r.logo), f);
    } else if (f.kind === "psd") {
      if (pictures.has(baseOf(f.name))) { reading.push(`- ${f.name}: the same artwork as the picture of that name.`); continue; }
      const sub = `work/psd-${i + 1}`, abs = join(dir, ...sub.split("/"));
      const r = await runPy(root, INTAKE, ["psd", p, abs], { timeoutMs: (f.size > 1e9 ? 30 : 8) * 60 * 1000, signal });
      if (!r.ok) { fail(f, why(r, f)); continue; }
      hints.fonts.push(...(r.fonts ?? []));
      inputs.push(`${sub}/PSD.md`, ...(r.composite ? [`${sub}/${r.composite}`] : []));
      reading.push(`- ${f.name}, Photoshop file: layers and texts: ${sub}/PSD.md${r.composite ? `; the whole file: ${sub}/${r.composite}` : ""}.`);
      if (r.composite) made(join(abs, r.composite), f);
    }
  }
  // the pictures: an artwork once (a picture Claude can see before the XML of an SVG); the first READ_PICTURES each, the rest on sheets
  onProgress({ stage: "Reading the files", progress: 19 });
  const PIC_ORDER = [".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg"], rank = (n) => PIC_ORDER.indexOf(extname(n).toLowerCase());
  const onSheets = [];
  let shown = 0;
  for (const group of pictures.values()) {
    const good = group.filter((f) => {
      if (f.kind === "svg") return true;
      if (isPicture(join(dir, "files", f.name))) return true;
      fail(f, DAMAGED_REASON);
      return false;
    }).sort((a, b) => rank(a.name) - rank(b.name));
    if (!good.length) continue;
    const f = good[0], p = join(dir, "files", f.name), rel = `files/${f.name}`, also = good.slice(1).map((x) => x.name);
    const alsoLine = also.length ? ` (also came as ${also.join(", ")})` : "";
    if (f.kind === "svg") {
      const s = readFileSync(p, "utf8");
      hints.colours.push(...[...s.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((x) => x[0].toUpperCase()));
      hints.fonts.push(...[...s.matchAll(/font-family[=:]\s*["']?([^"';,]+)/g)].map((x) => x[1].trim()));
      // a heavy SVG is too long to read as text: its colours and fonts are in the hints
      if (f.size <= 200 * 1024 && shown++ < READ_PICTURES) { inputs.push(rel); reading.push(`- ${rel}: picture (SVG)${alsoLine}.`); }
      continue;
    }
    if (shown++ < READ_PICTURES) {
      hints.colours.push(...pictureColours(p, root));
      inputs.push(rel);
      reading.push(`- ${rel}: picture${alsoLine}.`);
    } else onSheets.push(p);
  }
  if (onSheets.length) {
    const list = join(dir, "work", "pictures.txt"), abs = join(dir, "work", "pictures");
    writeFileSync(list, onSheets.join("\n") + "\n");
    const r = await runPy(root, INTAKE, ["sheet", list, abs], { timeoutMs: 5 * 60 * 1000, signal });
    if (r.ok) {
      const sheets = r.sheets.map((x) => `work/pictures/${x}`);
      inputs.push(...sheets);
      reading.push(`- ${onSheets.length} more pictures, each with its name, on sheets: ${sheets.join(", ")}.`);
    } else for (const p of onSheets) unread.push({ name: basename(p), reason: why(r, { kind: "image" }) });
  }
  return { hints, inputs, reading, unread, guideline };
}
/** The first bytes say it is a PNG, JPEG, GIF or WebP (a damaged or empty file would stop nothing until Claude tries to open it). */
function isPicture(p) {
  try {
    const b = readFileSync(p).subarray(0, 12);
    return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) || (b[0] === 0xff && b[1] === 0xd8) || b.toString("latin1", 0, 3) === "GIF"
      || (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP");
  } catch { return false; }
}
/** READING.md: what Claude reads, the kit's fonts by their real names, the logos a film gets, and what could not be read. */
function readingMd({ reading, unread, fonts, logos }) {
  const weights = (f) => uniq(f.files.map((x) => `${x.weight}${x.italic ? " italic" : ""}`)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).join(", ");
  return ["# The guideline, as the app made it readable", "", ...reading, "",
    ...(fonts.length ? ["# Font files in this Brand Kit", "", "Family names as the files themselves give them; every film made with this kit gets these files:", "",
      ...fonts.map((f) => `- ${f.family}: weights ${weights(f)}; ${f.vi ? "draws every Vietnamese letter" : "does NOT draw every Vietnamese letter"}`), ""] : []),
    ...(logos.length ? ["# Logos and pictures every film made with this kit gets", "", `In the film's assets, at ${KIT_LOGOS}/<file name>:`, "", ...logos.map((n) => `- ${n}`), ""] : []),
    ...(unread.length ? ["# Not read", "", "The owner gave these and the app could not read or did not take them:", "", ...unread.map((x) => `- ${x.name}: ${x.reason}`), ""] : [])].join("\n");
}

/** What a film made with the kit is checked against: said whole in the scan's prompt and in its second go. Sections beyond HF's format (a film reads frame.md as
 *  prose; kitGaps looks for these headings). */
const KIT_NEEDS = [
  "Every film made with this kit is checked against this file, so it holds all that a film can break. Give each rule its source at the end of its line: the file's short name and the page, \"(Foldables p. 66)\". Add these sections after the example's, with exactly these headings:",
  "## Crop limits: how far the guideline lets each thing leave the frame or be cut, product, person, logo, type and background apart, from its words and from its figures (open those pages). Say what stays whole, what may go and down to which line; where the guideline's figures draw a line without a number, say which page to measure on. If it never says, write that it does not and that a crop of the product is then a question for the owner.",
  "## Guideline motion: every motion, timing or sound rule the guideline itself gives: animated versions of its visuals with their frames in order, type moves, logo moves and holds, transitions it allows or forbids. A film's other motion is free. If it gives none, write that it gives none.",
  "## Guideline map: one line per topic the guideline covers, leading to its pages: \"- Logo on film: <file name without its extension> pp. 20-24\". Every PDF in READING.md appears by that exact name, also when it adds nothing for films (say so).",
  "## Guideline checklist: every rule a film can break, one per line, numbered in one run from G1, each a yes-or-no question's worth that can be seen in a frame, a shot, the sound or the script: \"- G12 [product] The device stays whole inside the Red Zone. (Foldables p. 66)\". The tag is one of text, colour, type, logo, product, layout, motion, sound, legal, end. Every don't is a line; every required line of legal text, every logo rule and every crop limit is a line. Keep it short and whole: nothing the guideline forbids is left out, nothing it does not say is added.",
];

/** The Claude run that writes work/FRAME.md from what the app made readable (cwd: the Look's folder; Read and Write only, nothing outside
 *  it). Returns the text, or throws with Claude's own answer. What the run took (time, turns, tokens, cost) stays in work/claude-run.json. */
export async function claudeWriter({ dir, look, root = APP_ROOT, model = "claude-opus-5-5", effort = "medium", signal = null, timeoutMs = 20 * 60 * 1000, fix = null }) {
  const exe = findClaude(root);
  if (!exe) throw err("NO_CLAUDE", "Claude Code is not installed or not signed in");
  const env = claudeEnv();
  for (const k of Object.keys(env)) if (/^ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL)$/i.test(k)) delete env[k];
  const prompt = fix ? [
    `work/FRAME.md is the Brand Kit "${look.title}", written from a brand guideline, and it lacks what a film needs: ${fix.join("; ")}.`,
    "Read work/FRAME.md and work/READING.md, then the guideline's parts you need, and add only that. Keep all the rest word for word.",
    ...KIT_NEEDS,
    "Write only work/FRAME.md. Reply with one line: what you added.",
  ].join("\n") : [
    `You turn a brand guideline into a Brand Kit (a HyperFrames look) named "${look.title}".`,
    "1. Read work/look.md (how HyperFrames uses a design spec: \"The project's design spec\") and work/example-FRAME.md (one of HyperFrames' frame presets: the format to follow).",
    "2. Read work/READING.md: the guideline as the app made it readable, file by file. Then read all it lists, every text part and every sheet, several in one go. The original PDFs are too big to open: use these.",
    "   A PDF's text parts hold all its words. Its sheets show every page small and numbered: look at them for colours, gradients, type and layout. Open a page closer where a page sets a rule its text does not fully give (a gradient, a lockup, a logo position, an end card, how far a product may be cropped, the frames of an animated visual): up to 40 pages in all.",
    "   work/hints.json lists the colours and fonts the app found in the files (a PPTX's theme, the main colours of the pictures): a hint only; the guideline itself wins.",
    `3. Write work/FRAME.md in exactly the example's format: the YAML front matter (version, name "${look.title} — Frame (video / frame layer)", description, unit, principle,`,
    "   colors as named hex tokens, typography with the exact font family names, then spacing, rounded and the other token groups the example has, where the",
    "   guideline gives them), then the prose sections in the example's order (the atoms, composition, logo use, do and don't).",
    "Rules: take every colour, font, size ratio, logo rule and layout rule from the guideline and keep its names for them: a gradient with its exact colour stops, a glow, a special display type are tokens or rules too. Where the guideline is silent, choose what fits it and",
    "mark that token or line with \"# inferred\". Never copy the example's colours, fonts or wording. Films may be in Vietnamese.",
    "Fonts: when READING.md lists font files, typography uses exactly those family names (the guideline's own name for a font may be written differently: write the name in that list); choose among them as the guideline says, for screens where it tells screen and print apart. A font READING.md does not list: name it as the guideline does, never swap it.",
    "Logos: in the logo section, name the file to use for each case by its file name from READING.md's list; say when one file holds several versions.",
    "Never write that a font, a logo or a file was not in the folder, was not supplied or is missing: READING.md says what the owner gave. Its \"Not read\" list is what the app could not read: where a rule may be in one of those files, say so by name and mark what you chose \"# inferred\"; it was given, it was not read.",
    "The description says what the brand looks like and names no file: the owner reads it on the kit's panel.",
    ...KIT_NEEDS,
    "Write only work/FRAME.md. Reply with one line: what you took from which file.",
  ].join("\n");
  const args = ["-p", "--output-format", "json", "--restricted", "--tools", "Read,Write", "--permission-mode", "acceptEdits", "--permission-prompts", "none", "--strict-mcp-config",
    "--disable-slash-commands", "--model", model, "--effort", effort, "--no-session-persistence"];
  const out = join(dir, "work", "FRAME.md");
  if (!fix) rmSync(out, { force: true });
  const run = () => new Promise((ok, no) => {
    const c = spawn(exe, args, { cwd: dir, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let o = "";
    const t = setTimeout(() => c.kill(), timeoutMs);
    signal?.addEventListener("abort", () => c.kill(), { once: true });
    c.stdout.on("data", (d) => { o += d; });
    c.stderr.resume();
    c.stdin.end(prompt, "utf8");
    c.on("close", () => {
      clearTimeout(t);
      try {
        const j = JSON.parse(o);
        try { writeFileSync(join(dir, "work", fix ? "claude-run-more.json" : "claude-run.json"), JSON.stringify({ model, effort, ms: j.duration_ms, turns: j.num_turns, costUsd: j.total_cost_usd, usage: j.usage }, null, 1) + "\n"); } catch { /* only a record */ }
        ok(String(j.result ?? "").trim());
      } catch { ok(o.slice(-300)); }
    });
    c.on("error", (e) => no(e));
  });
  let answer = await run();
  // two Claude Code processes refreshing the sign-in at once is passing (as the agent does): once more, a few seconds later
  if (!existsSync(out) && /another Claude Code process is refreshing|Failed to refresh OAuth token/i.test(answer) && !signal?.aborted) {
    await new Promise((r) => setTimeout(r, 5000));
    answer = await run();
  }
  if (!existsSync(out)) throw err("ERROR", `Claude wrote no Brand Kit${answer ? `: ${answer.slice(0, 300)}` : ""}`);
  return readFileSync(out, "utf8");
}

/** Scan the Look's files into a new version: make them readable (what cannot be read is named on the kit), hints, Claude writes FRAME.md,
 *  stills, the Vietnamese check. */
export async function scanLook(id, { root = APP_ROOT, onProgress = () => {}, writer = claudeWriter, stills = true, google = undefined, signal = null, withoutLocked = false } = {}) {
  let m = must(id, root);
  if (m.status === "scanning") throw err("BUSY", "The Brand Kit is being scanned");
  if (!m.files.length) throw err("INVALID", "Add the guideline's files first");
  const had = m.version > 0;
  m.status = "scanning"; m.error = null; m.stopped = null; saveMeta(m, root);
  const dir = dirOf(m.slug, root), work = join(dir, "work");
  try {
    onProgress({ stage: "Reading the files", progress: 5 });
    rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
    rmSync(join(dir, "derived"), { recursive: true, force: true });
    const read = await readFiles(m, dir, root, { signal, onProgress });
    m.unread = read.unread;
    // a password is the client's to lift (owner 31/10): the scan stops here, before Claude is paid for, and the popup asks for a copy without
    // one or going on without the file; the kit stays as it was
    if (!withoutLocked && read.unread.some((x) => x.password)) { m.status = had ? "ready" : "draft"; m.stopped = "locked"; return saveMeta(m, root); }
    saveMeta(m, root);
    // nothing to read: Claude is not asked, and the panel says why
    if (!read.inputs.length) throw err("INVALID", read.unread.length ? "None of the guideline's files could be read." : "Add the guideline too: a PDF, a PowerPoint or pictures.");
    const { hints, inputs } = read, unread = [...read.unread, ...(m.leftOut ?? [])];
    onProgress({ stage: "Colours and fonts", progress: 20 });
    hints.colours = count(hints.colours).slice(0, 16); hints.fonts = count(hints.fonts).slice(0, 8);
    writeFileSync(join(work, "hints.json"), JSON.stringify(hints, null, 2) + "\n");
    const fonts = kitFonts(m, root), logos = kitLogos(m, root).map((x) => x.name);
    writeFileSync(join(work, "READING.md"), readingMd({ reading: read.reading, unread, fonts, logos }));
    const hf = hfLookDir(root), example = hfItems(root)[0];
    if (example) cpSync(join(hf, example.file), join(work, "example-FRAME.md"));
    if (existsSync(join(hf, ...LOOK_GUIDE.split("/")))) cpSync(join(hf, ...LOOK_GUIDE.split("/")), join(work, "look.md"));
    onProgress({ stage: "Writing the Brand Kit", progress: 30 });
    m.guideline = read.guideline; saveMeta(m, root);
    const asked = { dir, work, look: m, hints, inputs, unread, fonts, logos, root, signal };
    let text = await writer(asked);
    // what a film needs is looked for here, not left to the first go (a kit once came without its crop limits): asked for once more
    const gaps = kitGaps(text, read.guideline);
    if (gaps.length) { onProgress({ stage: "Writing the Brand Kit", progress: 60 }); text = await writer({ ...asked, fix: gaps }); }
    m = await saveVersion(id, text, { root, note: `scanned from ${m.files.length} file(s)`, by: "scan", stills, google, onProgress, scanning: true });
    m.status = "ready";
    return saveMeta(m, root);
  } catch (e) {
    m = must(id, root);
    m.status = m.version ? "ready" : "failed"; m.error = String(e?.message ?? e).slice(0, 300);
    saveMeta(m, root);
    throw e;
  }
}

/** A new version from a FRAME.md text (a scan, an edit or a restore): its stills and the check; the Look's swatches and fonts follow it. */
export async function saveVersion(id, text, { root = APP_ROOT, note = "", by = "edit", stills = true, google = undefined, onProgress = () => {}, scanning = false } = {}) {
  const m = must(id, root);
  if (m.status === "scanning" && !scanning) throw err("BUSY", "The Brand Kit is being scanned");
  const t = String(text ?? "").replace(/\r\n/g, "\n"), p = parseFrame(t);
  if (!p.colors.length) throw err("INVALID", "The design spec has no colours: its front matter needs a colors block of named hex tokens");
  const v = Math.max(0, ...m.versions.map((x) => x.v)) + 1, vd = join(dirOf(m.slug, root), `v${v}`);
  mkdirSync(vd, { recursive: true });
  writeFileSync(join(vd, "FRAME.md"), t.endsWith("\n") ? t : t + "\n");
  onProgress({ stage: "Preview stills", progress: 70 });
  const own = kitFonts(m, root);
  let shots = [], stillsError = null;
  if (stills) { try { shots = await drawStills(p, m.title, join(vd, "stills"), root, own); } catch (e) { stillsError = String(e?.message ?? e).slice(0, 200); } }
  onProgress({ stage: "Vietnamese check", progress: 90 });
  const vi = await vietnameseCheck(p.fonts, { ...(google ? { google } : {}), own });
  m.gaps = kitGaps(t, m.guideline ?? []);
  Object.assign(m, { version: v, swatches: uniq(p.colors.map((c) => c.hex)).slice(0, 5), fonts: p.fonts, vi, description: p.description.slice(0, 300),
    stills: shots.map((n) => `v${v}/stills/${n}`), status: scanning ? m.status : "ready", error: stillsError && `Stills: ${stillsError}` });
  m.versions.push({ v, at: now(), by, note: String(note).slice(0, 200) });
  return saveMeta(m, root);
}

export async function patchLook(id, b = {}, opts = {}) {
  const root = opts.root ?? APP_ROOT;
  let m = must(id, root);
  if (typeof b.frame === "string") m = await saveVersion(id, b.frame, { ...opts, root, note: b.note ?? "edited", by: "edit" });
  if (b.title !== undefined) { const t = String(b.title).trim().replace(/\s+/g, " ").slice(0, 80); if (!t) throw err("INVALID", "Name the Brand Kit"); m.title = t; }
  if (b.swatches !== undefined) {
    const s = Array.isArray(b.swatches) ? b.swatches.map((x) => String(x).toUpperCase()) : [];
    if (!s.length || s.length > 8 || !s.every((x) => /^#[0-9A-F]{6}$/.test(x))) throw err("INVALID", "Swatches are 1 to 8 colours like #1B2566");
    m.swatches = s;
  }
  if (b.leftOut !== undefined) m.leftOut = mergeRows(m.leftOut, leftOutRows(Array.isArray(b.leftOut) ? b.leftOut : []));
  return saveMeta(m, root);
}
export async function restoreVersion(id, v, opts = {}) {
  const root = opts.root ?? APP_ROOT, m = must(id, root), f = join(dirOf(m.slug, root), `v${Number(v)}`, "FRAME.md");
  if (!m.versions.some((x) => x.v === Number(v)) || !existsSync(f)) throw err("NOT_FOUND", "No such version");
  return saveVersion(id, readFileSync(f, "utf8"), { ...opts, root, note: `restored v${Number(v)}`, by: "restore" });
}
export function frameText(m, root = APP_ROOT, v = m?.version) {
  if (!m || !v) return null;
  try { return readFileSync(join(dirOf(m.slug, root), `v${v}`, "FRAME.md"), "utf8"); } catch { return null; }
}

// ---- stills: three 16:9 frames drawn from the tokens (title, colours, type with Vietnamese), captured with the pinned Chromium
const lum = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const sat = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255]; return (Math.max(...c) - Math.min(...c)) / 255; };
/** Which token is the ground, the ink and the accent (by name first, then by lightness and saturation). */
export function roles(colors) {
  const by = (re) => colors.find((c) => re.test(c.name))?.hex;
  const sorted = [...colors].sort((a, b) => lum(b.hex) - lum(a.hex));
  const bg = by(/^(paper|background|bg|ground|canvas|base|surface|white|light)/i) ?? sorted[0]?.hex ?? "#FFFFFF";
  const ink = by(/^(ink|text|fg|foreground|black|dark|primary-text)/i) ?? sorted.at(-1)?.hex ?? "#111111";
  const rest = colors.filter((c) => c.hex !== bg && c.hex !== ink).sort((a, b) => sat(b.hex) - sat(a.hex));
  return { bg, ink, accent: by(/^(accent|brand|primary|highlight)/i) ?? rest[0]?.hex ?? ink };
}
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FACE_FORMAT = { ".ttf": ["font/ttf", "truetype"], ".otf": ["font/otf", "opentype"], ".woff": ["font/woff", "woff"], ".woff2": ["font/woff2", "woff2"] };
/** @font-face rules with the font inside the page (the stills are drawn from a page with no folder of its own), for a family the kit has. */
const embeddedFaces = (written, fam) => fam.files.filter((x) => !x.italic).map((x) => {
  const [type, format] = FACE_FORMAT[extname(x.file).toLowerCase()] ?? FACE_FORMAT[".ttf"];
  return `@font-face{font-family:'${String(written).replace(/'/g, "")}';src:url(data:${type};base64,${readFileSync(x.file).toString("base64")}) format('${format}');font-weight:${x.weight};font-style:normal;font-display:block}`;
}).join("\n");
/** own: the kit's fonts (kitFonts): a family it has is drawn from its files; only another family comes from Google Fonts. */
export function stillsHtml(p, title, own = []) {
  const { bg, ink, accent } = roles(p.colors), disp = p.display ?? "sans-serif", body = p.body ?? disp;
  const fam = uniq([disp, body]).filter((f) => f && !/^(sans-serif|serif|monospace)$/.test(f));
  const ownOf = (f) => own.find((x) => familyKey(x.family) === familyKey(f)), web = fam.filter((f) => !ownOf(f));
  const gf = web.length ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${web.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`).join("&")}&display=swap">` : "";
  const faces = fam.filter(ownOf).map((f) => embeddedFaces(f, ownOf(f))).join("\n");
  const ff = (f) => `'${String(f).replace(/'/g, "")}', ${ownOf(f) ? "" : "system-ui, "}sans-serif`;
  const frame = (inner, b = bg) => `<section class="frame" style="background:${b}">${inner}</section>`;
  const sw = p.colors.slice(0, 8).map((c) => `<div class="sw"><i style="background:${c.hex}"></i><b>${esc(c.name)}</b><span>${c.hex}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8">${gf}<style>${faces}
*{margin:0;box-sizing:border-box}body{background:#000}
.frame{width:1920px;height:1080px;position:relative;overflow:hidden;color:${ink};font-family:${ff(body)};padding:120px 140px}
h1{font-family:${ff(disp)};font-size:150px;line-height:1.02;font-weight:700;max-width:1500px}
.bar{width:220px;height:18px;background:${accent};margin:56px 0 40px}.lab{font-size:30px;letter-spacing:.2em;text-transform:uppercase;opacity:.7}
.sws{display:grid;grid-template-columns:repeat(4,1fr);gap:40px;margin-top:70px}.sw i{display:block;height:300px;border-radius:8px;border:1px solid ${ink}22}
.sw b{display:block;font-size:34px;margin-top:18px}.sw span{font-size:28px;opacity:.7}
h2{font-family:${ff(disp)};font-size:96px;line-height:1.08;font-weight:700;max-width:1500px}p{font-size:40px;line-height:1.5;max-width:1400px;margin-top:40px}
.card{position:absolute;right:140px;bottom:120px;background:${accent};color:${bg};padding:44px 56px;font-size:40px;font-weight:700;border-radius:6px}
</style></head><body>
${frame(`<div class="lab">Brand Kit</div><h1>${esc(title)}</h1><div class="bar"></div><div class="lab">${esc(disp)} · ${esc(body)}</div>`)}
${frame(`<div class="lab">Colours</div><div class="sws">${sw}</div>`)}
${frame(`<div class="lab">Typography · Tiếng Việt</div><h2>Chất lượng là danh dự: Đổi mới mỗi ngày</h2><p>Văn bản mẫu có đủ dấu tiếng Việt: ă â đ ê ô ơ ư, ả ã ạ ỳ ỹ ỵ. The quick brown fox jumps over the lazy dog, 0123456789.</p><div class="card">${esc(title)}</div>`)}
</body></html>`;
}
async function drawStills(p, title, outDir, root, own = []) {
  const puppeteer = puppeteerOf(root);
  rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: resolveRuntime(null, root).chromium, headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
  const names = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(stillsHtml(p, title, own), { waitUntil: "networkidle0", timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready);
    const frames = await page.$$(".frame");
    for (let i = 0; i < frames.length; i++) {
      const png = join(outDir, `${i + 1}.png`);
      await frames[i].scrollIntoView(); await frames[i].screenshot({ path: png });
      encodePoster(png, join(outDir, `${i + 1}.webp`), { root }); rmSync(png, { force: true });
      names.push(`${i + 1}.webp`);
    }
  } finally { await browser.close().catch(() => {}); }
  return names;
}

// ---- the API's shape: HF frame presets and the user's Looks in one list
const media = (slug, rel) => `/media/looks/custom/${slug}/${rel}`;
const fontRows = (vi, fonts) => vi?.families?.length ? vi.families.map(({ family, vi: ok, via }) => ({ family, vi: ok, via })) : (fonts ?? []).map((family) => ({ family, vi: null, via: null }));
/** A Brand Kit's description whole (the panel once showed "…a single deep" cut at 160 characters); one over `max` is cut at its
 *  last sentence before it (else a word) and ends with "…". */
export function wholeText(text, max = 600) {
  const t = String(text ?? "").trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max), end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  return end > max / 3 ? `${head.slice(0, end + 1)} …` : `${head.slice(0, head.lastIndexOf(" ") > 0 ? head.lastIndexOf(" ") : max).trimEnd()}…`;
}
export function publicLook(m, root = APP_ROOT) {
  return { id: m.id, title: m.title, group: "yours", description: wholeText(m.description), swatches: m.swatches ?? [],
    preview: { image: m.stills?.[0] ? media(m.slug, m.stills[0]) : null, video: null }, fonts: fontRows(m.vi, m.fonts), vi: m.vi?.status ?? null,
    version: m.version, updatedAt: m.updatedAt, editable: true, status: m.status, error: m.error ?? null,
    // what the kit holds without having read it: named on its panel, a kit made before this list has none
    unread: [...(m.unread ?? []), ...(m.leftOut ?? [])], stopped: m.stopped ?? null,
    // a kit made before these sections has no list: what it lacks is read from its text
    gaps: m.gaps ?? (m.version ? kitGaps(frameText(m, root), m.guideline ?? []) : []), checks: m.version ? checklistOf(frameText(m, root)).length : 0,
    source: { kind: "guideline", files: (m.files ?? []).map((f) => f.name), credit: OWNER } };
}
export function hfLook(l, root = APP_ROOT) {
  const st = currentStore(root);
  return { id: l.id, title: l.title, group: "hf", description: wholeText(l.description), swatches: (l.colors ?? []).slice(0, 5),
    preview: { image: l.preview?.poster ? `/media/looks/${l.preview.poster}` : null, video: l.preview?.video ? `/media/looks/${l.preview.video}` : null },
    fonts: fontRows(l.vi, l.fonts), vi: l.vi?.status ?? null, version: st ? basename(st.dir) : null, updatedAt: st?.manifest?.importedAt ?? null, editable: false,
    status: "ready", error: null, source: { kind: "hf-preset", files: [l.file], credit: l.credit } };
}
export function apiLooks(root = APP_ROOT) {
  return { free: FREE, looks: [...customLooks(root).map((m) => publicLook(m, root)), ...hfItems(root).map((l) => hfLook(l, root))] };
}
export function apiLook(id, root = APP_ROOT) {
  const m = getCustom(id, root);
  if (m) return { ...publicLook(m, root), frame: frameText(m, root), stills: (m.stills ?? []).map((r) => media(m.slug, r)), versions: m.versions,
    files: m.files };
  const l = hfItems(root).find((x) => x.id === id);
  if (!l) throw err("NOT_FOUND", "Brand Kit not found");
  let frame = null; try { frame = readFileSync(join(hfLookDir(root), l.file), "utf8"); } catch { /* the clone is missing */ }
  return { ...hfLook(l, root), frame, stills: l.preview?.poster ? [`/media/looks/${l.preview.poster}`] : [], versions: [], files: [] };
}

/** A still of a custom Look, contained in the store. */
export function customMedia(rel, root = APP_ROOT) {
  if (!/^custom\/[a-z0-9-]+\/v\d+\/stills\/\d+\.webp$/.test(rel)) return null;
  const base = resolve(customRoot(root)), f = resolve(storeRoot(root), rel);
  return f.startsWith(base + sep) && existsSync(f) ? f : null;
}

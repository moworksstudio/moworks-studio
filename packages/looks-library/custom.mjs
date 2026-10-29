// The user's own Looks: a brand guideline (PDF, PPTX, pictures, a folder of them) scanned into a
// Look the HyperFrames way: a FRAME.md in HF's frame-preset format (YAML tokens + prose; HyperFrames' references/look.md, "The project's design spec"),
// preview stills drawn from its tokens, the Vietnamese check of its fonts, kept with versions. Stored in <work>/library/looks/custom/<slug>/:
//   look.json  { id, slug, title, status, version, versions, files, swatches, fonts, vi, description, stills, error, createdAt, updatedAt }
//   files/     what the user uploaded, as uploaded
//   work/      what the scan unpacked (a PPTX's theme, text and pictures; the colour and font hints) and the copy of HF's format
//   v<N>/      FRAME.md and stills/ of version N (a version is never changed: an edit or a restore makes the next one)
// The FRAME.md is written by a short Claude run that reads the guideline itself (PDFs and pictures through Read) beside one HF frame preset
// as the example of the format; the app reads its tokens back for the swatches, fonts and stills. The Look is the film's design: the
// project's frame.md is a plain copy of the current version (lookFrame in ./index.mjs).
import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { inflateRawSync } from "node:zlib";
import { APP_ROOT, resolveRuntime } from "../version-manager/index.mjs";
import { claudeEnv, findClaude } from "../system-status/index.mjs";
import { safeFileName } from "../project-service/index.mjs";
import { encodePoster } from "../library/preview-media.mjs";
import { currentStore, ffmpegExe, hfLookDir, items as hfItems, LOOK_GUIDE, puppeteerOf, storeRoot, vietnameseCheck } from "./index.mjs";

export const ACCEPT = /\.(pdf|pptx|png|jpe?g|webp|gif|svg)$/i;
export const MAX_FILE = 500 * 1024 * 1024, MAX_FILES = 60;
export const FREE = { id: null, title: "Free (Claude designs)" };
const OWNER = { author: "The owner (uploaded guideline)", link: null, licence: "the owner's own brand material", made: "written from the idea", madeNote: "scanned by the app from the owner's guideline files into HyperFrames' frame-preset format" };

const now = () => new Date().toISOString();
const err = (code, message) => Object.assign(new Error(message), { code });
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const uniq = (a) => [...new Set(a)];
const customRoot = (root) => join(storeRoot(root), "custom");
const dirOf = (slug, root) => join(customRoot(root), slug);
export const customSlug = (id) => /^custom\/([a-z0-9][a-z0-9-]{0,47})$/.exec(String(id ?? ""))?.[1] ?? null;
const kindOf = (n) => /\.pdf$/i.test(n) ? "pdf" : /\.pptx$/i.test(n) ? "pptx" : /\.svg$/i.test(n) ? "svg" : "image";

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

export function createLook({ title } = {}, root = APP_ROOT) {
  const t = String(title ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!t) throw err("INVALID", "Name the Brand Kit");
  const base = slugify(t);
  let slug = base, i = 2;
  while (existsSync(dirOf(slug, root))) slug = `${base.slice(0, 36)}-${i++}`;
  mkdirSync(join(dirOf(slug, root), "files"), { recursive: true });
  return saveMeta({ id: `custom/${slug}`, slug, title: t, status: "draft", version: 0, versions: [], files: [], swatches: [], fonts: [], vi: null, description: "",
    stills: [], error: null, createdAt: now() }, root);
}

/** Where an uploaded file goes (the server streams the body there, then calls fileAdded). */
export function fileTarget(id, name, root = APP_ROOT) {
  const m = must(id, root);
  if (m.status === "scanning") throw err("BUSY", "The Brand Kit is being scanned");
  const n = safeFileName(name, "file");
  if (!ACCEPT.test(n)) throw err("INVALID", "A guideline is PDF, PPTX or pictures (PNG, JPG, WebP, GIF, SVG)");
  if (m.files.length >= MAX_FILES && !m.files.some((f) => f.name === n)) throw err("INVALID", `At most ${MAX_FILES} files per Brand Kit`);
  return join(dirOf(m.slug, root), "files", n);
}
export function fileAdded(id, path, root = APP_ROOT) {
  const m = must(id, root), name = basename(path);
  m.files = [...m.files.filter((f) => f.name !== name), { name, size: statSync(path).size, kind: kindOf(name), at: now() }];
  return saveMeta(m, root);
}
export function removeFile(id, name, root = APP_ROOT) {
  const m = must(id, root), n = safeFileName(name, "");
  if (m.status === "scanning") throw err("BUSY", "The Brand Kit is being scanned");
  rmSync(join(dirOf(m.slug, root), "files", n), { force: true });
  m.files = m.files.filter((f) => f.name !== n);
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

// ---- the scan
/** The Claude run that writes work/FRAME.md from the guideline (cwd: the Look's folder; Read and Write only, nothing outside it). Returns
 *  the text, or throws with Claude's own answer. */
export async function claudeWriter({ dir, look, inputs, root = APP_ROOT, model = "claude-opus-5-5", effort = "medium", signal = null, timeoutMs = 20 * 60 * 1000 }) {
  const exe = findClaude(root);
  if (!exe) throw err("NO_CLAUDE", "Claude Code is not installed or not signed in");
  const env = claudeEnv();
  for (const k of Object.keys(env)) if (/^ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL)$/i.test(k)) delete env[k];
  const prompt = [
    `You turn a brand guideline into a Brand Kit (a HyperFrames look) named "${look.title}".`,
    "1. Read work/look.md (how HyperFrames uses a design spec: \"The project's design spec\") and work/example-FRAME.md (one of HyperFrames' frame presets: the format to follow).",
    `2. Read the guideline, all of it: ${inputs.join(", ")}. PDFs and pictures you read with Read; a PPTX was unpacked for you into its slides' text (slides.md) and its pictures (media/).`,
    "   work/hints.json lists the colours and fonts the app found in the files (a PPTX's theme, the main colours of the pictures): a hint only; the guideline itself wins.",
    `3. Write work/FRAME.md in exactly the example's format: the YAML front matter (version, name "${look.title} — Frame (video / frame layer)", description, unit, principle,`,
    "   colors as named hex tokens, typography with the exact font family names the guideline uses, then spacing, rounded and the other token groups the example has, where the",
    "   guideline gives them), then the prose sections in the example's order (the atoms, composition, logo use, do and don't).",
    "Rules: take every colour, font, size ratio, logo rule and layout rule from the guideline and keep its names for them. Where the guideline is silent, choose what fits it and",
    "mark that token or line with \"# inferred\". Motion is out of scope, as in the example. Never copy the example's colours, fonts or wording. Films may be in Vietnamese: name the",
    "fonts as the guideline does, never swap them. Write only work/FRAME.md. Reply with one line: what you took from which file.",
  ].join("\n");
  const args = ["-p", "--output-format", "json", "--restricted", "--tools", "Read,Write", "--permission-mode", "acceptEdits", "--permission-prompts", "none", "--strict-mcp-config",
    "--disable-slash-commands", "--model", model, "--effort", effort, "--no-session-persistence"];
  const out = join(dir, "work", "FRAME.md");
  rmSync(out, { force: true });
  const run = () => new Promise((ok, no) => {
    const c = spawn(exe, args, { cwd: dir, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let o = "";
    const t = setTimeout(() => c.kill(), timeoutMs);
    signal?.addEventListener("abort", () => c.kill(), { once: true });
    c.stdout.on("data", (d) => { o += d; });
    c.stderr.resume();
    c.stdin.end(prompt, "utf8");
    c.on("close", () => { clearTimeout(t); try { const j = JSON.parse(o); ok(String(j.result ?? "").trim()); } catch { ok(o.slice(-300)); } });
    c.on("error", (e) => no(e));
  });
  let answer = await run();
  // two Claude Code processes refreshing the sign-in at once is passing (as the agent does): once more, a few seconds later
  if (!existsSync(out) && /another Claude Code process is refreshing|Failed to refresh OAuth token/i.test(answer) && !signal?.aborted) {
    await new Promise((r) => setTimeout(r, 5000));
    answer = await run();
  }
  if (!existsSync(out)) throw err("ERROR", `Claude wrote no frame.md${answer ? `: ${answer.slice(0, 300)}` : ""}`);
  return readFileSync(out, "utf8");
}

/** Scan the Look's files into a new version: unpack, hints, Claude writes FRAME.md, stills, the Vietnamese check. */
export async function scanLook(id, { root = APP_ROOT, onProgress = () => {}, writer = claudeWriter, stills = true, google = undefined, signal = null } = {}) {
  let m = must(id, root);
  if (m.status === "scanning") throw err("BUSY", "The Brand Kit is being scanned");
  if (!m.files.length) throw err("INVALID", "Add the guideline's files first");
  m.status = "scanning"; m.error = null; saveMeta(m, root);
  const dir = dirOf(m.slug, root), work = join(dir, "work");
  try {
    onProgress({ stage: "Reading the files", progress: 5 });
    rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
    const hints = { colours: [], fonts: [], pptx: [] }, inputs = [];
    m.files.forEach((f, i) => {
      const p = join(dir, "files", f.name), rel = `files/${f.name}`;
      if (!existsSync(p)) return;
      if (f.kind === "pptx") {
        const sub = `work/pptx-${i + 1}`, r = readPptx(p, join(dir, ...sub.split("/")));
        hints.pptx.push({ file: f.name, slides: r.slides, theme: r.theme, colours: r.colors, fonts: r.fonts });
        hints.colours.push(...Object.values(r.theme.colors), ...r.colors);
        hints.fonts.push(...[r.theme.heading, r.theme.body].filter(Boolean), ...r.fonts);
        inputs.push(`${sub}/slides.md`, ...r.media.map((x) => `${sub}/${x}`));
      } else if (f.kind === "svg") {
        const s = readFileSync(p, "utf8");
        hints.colours.push(...[...s.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((x) => x[0].toUpperCase()));
        hints.fonts.push(...[...s.matchAll(/font-family[=:]\s*["']?([^"';,]+)/g)].map((x) => x[1].trim()));
        inputs.push(rel);
      } else {
        if (f.kind === "image") hints.colours.push(...pictureColours(p, root));
        inputs.push(rel);
      }
    });
    onProgress({ stage: "Colours and fonts", progress: 20 });
    hints.colours = count(hints.colours).slice(0, 16); hints.fonts = count(hints.fonts).slice(0, 8);
    writeFileSync(join(work, "hints.json"), JSON.stringify(hints, null, 2) + "\n");
    const hf = hfLookDir(root), example = hfItems(root)[0];
    if (example) cpSync(join(hf, example.file), join(work, "example-FRAME.md"));
    if (existsSync(join(hf, ...LOOK_GUIDE.split("/")))) cpSync(join(hf, ...LOOK_GUIDE.split("/")), join(work, "look.md"));
    onProgress({ stage: "Writing frame.md", progress: 30 });
    const text = await writer({ dir, work, look: m, hints, inputs, root, signal });
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
  if (!p.colors.length) throw err("INVALID", "frame.md has no colours: its front matter needs a colors block of named hex tokens");
  const v = Math.max(0, ...m.versions.map((x) => x.v)) + 1, vd = join(dirOf(m.slug, root), `v${v}`);
  mkdirSync(vd, { recursive: true });
  writeFileSync(join(vd, "FRAME.md"), t.endsWith("\n") ? t : t + "\n");
  onProgress({ stage: "Preview stills", progress: 70 });
  let shots = [], stillsError = null;
  if (stills) { try { shots = await drawStills(p, m.title, join(vd, "stills"), root); } catch (e) { stillsError = String(e?.message ?? e).slice(0, 200); } }
  onProgress({ stage: "Vietnamese check", progress: 90 });
  const vi = await vietnameseCheck(p.fonts, google ? { google } : undefined);
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
export function stillsHtml(p, title) {
  const { bg, ink, accent } = roles(p.colors), disp = p.display ?? "sans-serif", body = p.body ?? disp;
  const fam = uniq([disp, body]).filter((f) => f && !/^(sans-serif|serif|monospace)$/.test(f));
  const gf = fam.length ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`).join("&")}&display=swap">` : "";
  const ff = (f) => `'${String(f).replace(/'/g, "")}', system-ui, sans-serif`;
  const frame = (inner, b = bg) => `<section class="frame" style="background:${b}">${inner}</section>`;
  const sw = p.colors.slice(0, 8).map((c) => `<div class="sw"><i style="background:${c.hex}"></i><b>${esc(c.name)}</b><span>${c.hex}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8">${gf}<style>
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
async function drawStills(p, title, outDir, root) {
  const puppeteer = puppeteerOf(root);
  rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: resolveRuntime(null, root).chromium, headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
  const names = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(stillsHtml(p, title), { waitUntil: "networkidle0", timeout: 30000 }).catch(() => {});
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
export function publicLook(m) {
  return { id: m.id, title: m.title, group: "yours", description: wholeText(m.description), swatches: m.swatches ?? [],
    preview: { image: m.stills?.[0] ? media(m.slug, m.stills[0]) : null, video: null }, fonts: fontRows(m.vi, m.fonts), vi: m.vi?.status ?? null,
    version: m.version, updatedAt: m.updatedAt, editable: true, status: m.status, error: m.error ?? null,
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
  return { free: FREE, looks: [...customLooks(root).map(publicLook), ...hfItems(root).map((l) => hfLook(l, root))] };
}
export function apiLook(id, root = APP_ROOT) {
  const m = getCustom(id, root);
  if (m) return { ...publicLook(m), frame: frameText(m, root), stills: (m.stills ?? []).map((r) => media(m.slug, r)), versions: m.versions,
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

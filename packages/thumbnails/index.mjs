// Thumbnails (owner #1312, #1313, #1315, #1318): upload thumbnails of a built film at 16:9 (1280 x 720, under 2 MB) and 9:16 (1080 x 1920).
//   1. Frames   the app takes 3 frames of the film (sharp, the subject in view, never mid-transition, spread across it, none from its end):
//               the middle of three well-placed shots, read from the film's shot table; a film with a 9:16 size gives that size's frame too.
//   2. Make     the owner picks one: one Claude task lays it out as two HTML pages (Editable first #1134: the title is live text,
//               #thumb-title), in the film style's look (Automatic) or by the film's Brand Kit's rules read from its guideline (Brand Kit).
//   3. Render   the app renders both pages to stills with HyperFrames and writes JPGs next to the film's render:
//               renders/<render name>-thumb-16x9.jpg and -thumb-9x16.jpg. Edit title changes the words and renders again (no Claude).
// The text checks (a Vietnamese title's marks, letters its face lacks) are warnings, never a block (#1109).
// State: <film>/.moworks/thumbnails.json; the frames are served from .moworks/cache/posters/thumbnails/; the lab is .moworks/cache/thumbnails/.
import { copyFileSync, cpSync, existsSync, linkSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { APP_ROOT } from "../version-manager/index.mjs";
import { fontkitFor } from "../hf-qa/vietnamese.mjs";
import { docPath } from "../project-service/docs.mjs";
import { entryOf, extraSizes, sizeStage } from "../project-service/sizes.mjs";
import { stampBase } from "../render-names/index.mjs";
import { SIZES, TITLE_WORDS, checkThumbs, countWords, titleOf } from "./lab-tools/check-thumbs.mjs";
import { readJson } from "../util/json.mjs";

export { SIZES, TITLE_WORDS, checkThumbs, countWords, titleOf };
const HERE = dirname(fileURLToPath(import.meta.url));
export const MAX_16x9_BYTES = 2 * 1024 * 1024;
export const WAYS = ["auto", "brand"];
export const FRAME_COUNT = 3;

// ---- where things are
export const stateFile = (dir) => join(dir, ".moworks", "thumbnails.json");
/** The frames, where the preview server serves a film's posters (never in the film's history). */
export const framesDir = (dir) => join(dir, ".moworks", "cache", "posters", "thumbnails");
export const FRAMES_REL = ".moworks/cache/posters/thumbnails";
export const labDir = (dir) => join(dir, ".moworks", "cache", "thumbnails");

const read = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
export const readState = (dir) => readJson(stateFile(dir), null) ?? {};
export function writeState(dir, s) {
  mkdirSync(dirname(stateFile(dir)), { recursive: true });
  writeFileSync(stateFile(dir) + ".part", JSON.stringify(s, null, 1) + "\n");
  renameSync(stateFile(dir) + ".part", stateFile(dir));
  return s;
}
const patchState = (dir, fn) => writeState(dir, { ...readState(dir), ...fn(readState(dir)) });

/** A film the page can pick: its Build has run (the pipeline recorded it). */
export const isBuilt = (meta) => !!(meta?.pipeline?.ran?.build ?? meta?.pipeline?.build?.recorded);
/** The film's Brand Kit of the user's own (custom/<slug>) when one is applied: { id, title } or null. */
export const filmKit = (meta) => (/^custom\//.test(String(meta?.look?.id ?? "")) ? { id: meta.look.id, title: meta.look.title ?? null } : null);
/** The film's own 9:16 size, made by Adaptation and ready. */
export function nineSixteen(dir, meta) {
  const s = extraSizes(meta).find((x) => x.aspect === "9:16");
  return s && (s.status ?? "ready") !== "none" && existsSync(join(dir, entryOf("9:16"))) ? s : null;
}

const VIDEO = /\.(mp4|mov|webm|mkv)$/i;
/** The render the thumbnails are named after: the film's last export, else its newest film in renders/, else the film's folder name. */
export function renderName(dir, meta) {
  const last = meta?.lastExport?.file ? basename(String(meta.lastExport.file)) : null;
  if (last && VIDEO.test(last) && existsSync(join(dir, "renders", last))) return last.replace(VIDEO, "");
  let newest = null;
  try {
    for (const f of readdirSync(join(dir, "renders"))) {
      if (!VIDEO.test(f)) continue;
      const t = statSync(join(dir, "renders", f)).mtimeMs;
      if (!newest || t > newest.t) newest = { f, t };
    }
  } catch { /* no renders yet */ }
  return newest ? newest.f.replace(VIDEO, "") : stampBase(basename(dir));
}
export const outName = (base, tag) => `${base}-thumb-${tag}.jpg`;

// ---- 1. the three frames
const r2 = (x) => Math.round(x * 100) / 100;
/** The cast's names (CHARACTERS.json), for the shots a character is in. */
function castNames(dir) {
  const j = readJson(docPath(dir, "CHARACTERS.json"), null);
  const list = Array.isArray(j) ? j : Array.isArray(j?.characters) ? j.characters : [];
  return list.map((c) => String(c?.name ?? c?.id ?? "").trim()).filter((n) => n.length > 1);
}
const SUBJECT = /\b(close[- ]?up|portrait|face|faces|hero|character|product|holds?|looks? at|smiles?|eyes|mặt|nhân vật|cận)\b/i;
/** Three seconds of the film (owner #1313): spread across it (three equal parts of its first 85 %), none from the very end (the last shot
 *  of a film of 4+ shots is its ending), never mid-transition (55 % into a shot of 1.2 s or more, 0.6 s clear of both cuts), a shot with a
 *  character or the subject preferred. `shots`: readShots' shots ({ start, duration, title, scene, narrative }); `total`: the film's length. */
export function pickTimes(shots, total, { names = [] } = {}) {
  const placed = (shots ?? []).map((s) => ({ start: Number(s.start ?? s.plannedStart), dur: Number(s.duration ?? s.plannedDuration), text: `${s.title ?? ""} ${s.scene ?? ""} ${s.narrative ?? ""}` }))
    .filter((s) => Number.isFinite(s.start) && s.dur > 0).sort((a, b) => a.start - b.start);
  const T = Number(total) > 0 ? Number(total) : placed.length ? Math.max(...placed.map((s) => s.start + s.dur)) : 0;
  if (!(T > 0)) return [];
  const end = T * 0.85, lower = names.map((n) => n.toLowerCase());
  const cands = [];
  placed.forEach((s, i) => {
    if (placed.length >= 4 && i === placed.length - 1) return;
    if (s.dur < 1.2) return;
    const t = Math.min(Math.max(s.start + s.dur * 0.55, s.start + 0.6), s.start + s.dur - 0.6);
    if (t < 0.8 || t > end) return;
    const txt = s.text.toLowerCase();
    const score = (lower.some((n) => txt.includes(n)) ? 2 : 0) + (SUBJECT.test(s.text) ? 1 : 0) + Math.min(1, s.dur / 4);
    cands.push({ t: r2(t), score });
  });
  const picked = [];
  const far = (t) => picked.every((p) => Math.abs(p - t) >= Math.max(1.5, T * 0.08));
  for (let b = 0; b < FRAME_COUNT; b++) {
    const lo = (end * b) / FRAME_COUNT, hi = (end * (b + 1)) / FRAME_COUNT, mid = (lo + hi) / 2;
    const best = cands.filter((c) => c.t >= lo && c.t < hi && far(c.t)).sort((a, b2) => b2.score - a.score || Math.abs(a.t - mid) - Math.abs(b2.t - mid))[0];
    if (best) picked.push(best.t);
  }
  for (const c of [...cands].sort((a, b) => b.score - a.score)) { if (picked.length >= FRAME_COUNT) break; if (far(c.t)) picked.push(c.t); }
  for (const f of [0.2, 0.45, 0.7, 0.3, 0.6]) { if (picked.length >= FRAME_COUNT) break; const t = r2(T * f); if (far(t)) picked.push(t); }
  return picked.slice(0, FRAME_COUNT).sort((a, b) => a - b);
}

/** The film as HyperFrames sees it, without its captions layer (a thumbnail never carries the film's subtitles): .moworks/cache/thumb-stage/<tag>/,
 *  whose index.html is the film's root page (`page`) with the captions hidden, the film's other entries as in sizeStage (folders as
 *  junctions, files copied, its metadata for the checks). Captions drawn inside a film's own code cannot be hidden this way (Claude crops them). */
export const NO_CAPTIONS = `<style data-mw="thumb-no-captions">[data-track-kind="captions"], #captions, [data-composition-id="captions"] { opacity: 0 !important; }</style>`;          // opacity, not visibility: the runtime sets each clip's own visibility
export function thumbStage(dir, page, tag) {
  const src = join(dir, page);
  if (!existsSync(src)) return null;
  const stage = join(dir, ".moworks", "cache", "thumb-stage", tag);
  mkdirSync(stage, { recursive: true });
  const skip = (n) => n === ".git" || n === ".moworks" || n === ".claude" || /^index(\.[^.]+)?\.html$/i.test(n) || /^desktop\.ini$/i.test(n);
  const own = new Set(readdirSync(dir).filter((n) => !skip(n)));
  for (const n of readdirSync(stage)) {
    if (n === "index.html" || n === ".moworks" || own.has(n)) continue;
    const p = join(stage, n);
    try { if (lstatSync(p).isSymbolicLink() || lstatSync(p).isFile()) unlinkSync(p); } catch { /* left for the next stage */ }
  }
  for (const n of own) {
    const from = join(dir, n), to = join(stage, n), st = lstatSync(from);
    if (st.isDirectory()) { let have = null; try { have = lstatSync(to); } catch { /* not linked yet */ } if (!have) symlinkSync(from, to, "junction"); }
    else if (st.isFile()) copyFileSync(from, to);
  }
  const html = readFileSync(src, "utf8");
  writeFileSync(join(stage, "index.html"), /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${NO_CAPTIONS}\n</head>`) : `${NO_CAPTIONS}\n${html}`);
  const meta = join(dir, ".moworks", "project.json");
  if (existsSync(meta)) { mkdirSync(join(stage, ".moworks"), { recursive: true }); copyFileSync(meta, join(stage, ".moworks", "project.json")); }
  return stage;
}

/** Take the three frames (the 16:9 film, and its 9:16 size at the same seconds when it has one) into framesDir. deps.frames(dir, times,
 *  { total, signal }) is hf-qa's filmFrames ({ frames: [{ t, file }] }, files relative to dir); deps.place(dir, page) refreshes a code film's
 *  bundle. Returns the state's frames: [{ n, t, file, file9 }]. */
export async function captureFrames(project, { root = APP_ROOT, signal = null, deps = {}, onStep = () => {} } = {}) {
  const dir = project.path, meta = project.meta ?? {};
  const frames = deps.frames ?? (await import("../hf-qa/qc.mjs")).filmFrames;
  const readShots = deps.readShots ?? (await import("../hf-edit/shots.mjs")).readShots;
  const place = deps.place ?? (async (d, page) => { try { (await import("../moworks-styles/index.mjs")).placeStyle(d, page, { root }); } catch { /* not a code film */ } });
  const { root: comp, shots } = await readShots(dir);
  const total = Number(comp?.duration) || Number(meta.targetDurationSec) || null;
  const times = pickTimes(shots, total, { names: castNames(dir) });
  if (!times.length) throw Object.assign(new Error("The film has no length yet: build it first"), { code: "INVALID" });
  const out = framesDir(dir);
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  onStep("Taking 3 frames of the film", 10);
  await place(dir, "index.html");
  const at16 = thumbStage(dir, "index.html", "16x9") ?? dir;
  const got = await frames(at16, times, { total, signal });
  if (signal?.aborted) throw Object.assign(new Error("Stopped"), { code: "CANCELLED" });
  if (got.busy) throw Object.assign(new Error("The pictures could not be taken (the computer is busy). Try again."), { code: "BUSY" });
  const list = [];
  times.forEach((t, i) => {
    const f = got.frames.find((x) => Math.abs(x.t - t) < 0.02);
    if (!f) return;
    const name = `f${i + 1}-16x9.png`;
    copyFileSync(join(at16, ...f.file.split("/")), join(out, name));
    list.push({ n: i + 1, t, file: name, file9: null });
  });
  if (!list.length) throw Object.assign(new Error(got.failed ? `No frame could be taken: ${got.failed}` : "No frame could be taken"), { code: "STILLS" });
  if (nineSixteen(dir, meta)) {
    onStep("Taking the 9:16 size's frames", 60);
    await place(dir, entryOf("9:16"));
    const stage = thumbStage(dir, entryOf("9:16"), "9x16") ?? sizeStage(dir, "9:16");
    const got9 = await frames(stage, list.map((x) => x.t), { total, signal });
    for (const x of list) {
      const f = got9.frames?.find((y) => Math.abs(y.t - x.t) < 0.02);
      if (f) { x.file9 = `f${x.n}-9x16.png`; copyFileSync(join(stage, ...f.file.split("/")), join(out, x.file9)); }
    }
  }
  const at = new Date().toISOString();
  patchState(dir, () => ({ frames: list, framesAt: at, total }));
  return list;
}

// ---- 2. the Claude task
const FONT_FACE = /@font-face\s*{[^}]*}/gi;
const linkOrCopy = (from, to) => { mkdirSync(dirname(to), { recursive: true }); try { linkSync(from, to); } catch { copyFileSync(from, to); } };
/** The film's own faces (its index.html's @font-face rules) and, for the Brand Kit way, the kit's: copied into lab/fonts/ with fonts/fonts.css
 *  declaring them. Returns the families: [{ family, files: [lab-relative] }]. */
export function stageFonts(dir, lab, kitFaces = []) {
  const html = read(join(dir, "index.html")), rules = [], fams = new Map(), seen = new Set();
  const add = (family, file, weight = null, style = null) => {
    const name = basename(file).replace(/[^\w.-]/g, "_");
    if (!existsSync(file)) return;
    const to = join(lab, "fonts", name);
    if (!seen.has(name)) { linkOrCopy(file, to); seen.add(name); }
    const fmt = { ".woff2": "woff2", ".woff": "woff", ".otf": "opentype", ".ttf": "truetype" }[extname(name).toLowerCase()] ?? "truetype";
    rules.push(`@font-face { font-family: "${family}"; src: url("${name}") format("${fmt}");${weight ? ` font-weight: ${weight};` : ""}${style ? ` font-style: ${style};` : ""} font-display: block; }`);
    fams.set(family, [...new Set([...(fams.get(family) ?? []), `fonts/${name}`])]);
  };
  for (const m of html.matchAll(FONT_FACE)) {
    const body = m[0];
    const family = /font-family\s*:\s*['"]?([^;'"]+)/i.exec(body)?.[1]?.trim();
    const src = /url\(\s*['"]?([^'")]+)['"]?\s*\)/i.exec(body)?.[1];
    if (!family || !src || src.startsWith("data:")) continue;
    add(family, resolve(dir, src), /font-weight\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim(), /font-style\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim());
  }
  for (const f of kitFaces) for (const x of f.files ?? []) add(f.family, x.file, x.weight ? String(x.weight) : null, x.italic ? "italic" : "normal");
  mkdirSync(join(lab, "fonts"), { recursive: true });
  writeFileSync(join(lab, "fonts", "fonts.css"), rules.join("\n") + "\n");
  return [...fams].map(([family, files]) => ({ family, files }));
}

/** The film's opening line: its voice-over's first sentence (transcript.json), else VOICEOVER.md's first line. */
export function openingLine(dir) {
  const words = readJson(join(dir, "transcript.json"), null);
  if (Array.isArray(words) && words.length) {
    const out = [];
    for (const w of words) { out.push(String(w.text ?? "").trim()); if (/[.!?…]["”’)]?$/.test(out.at(-1)) || out.length >= 18) break; }
    return out.filter(Boolean).join(" ");
  }
  const vo = read(docPath(dir, "VOICEOVER.md")).split(/\r?\n/).map((l) => l.replace(/^[#>*\-\s]+/, "").trim()).find((l) => l.length > 8);
  return vo ?? "";
}

/** The Brand Kit's guideline into the lab (kit/): FRAME.md, every guideline's text and its page sheets and pages (hard links), and
 *  kit/GUIDELINE.md listing them; its logos into media/logos/. Returns { faces, logos, frame } (frame: false when the kit has no FRAME.md). */
async function stageKit(kitId, lab, root) {
  const lib = await import("../looks-library/custom.mjs");
  const looks = await import("../looks-library/index.mjs");
  const m = lib.getCustom(kitId, root);
  if (!m) return null;
  const base = join(lab, "kit");
  mkdirSync(base, { recursive: true });
  const fr = (() => { try { return looks.lookFrame(kitId, root); } catch { return null; } })();
  if (fr?.text) writeFileSync(join(base, "FRAME.md"), fr.text);
  const kitDir = join(looks.storeRoot(root), "custom", m.slug);
  const lines = [];
  for (const g of m.guideline ?? []) {
    const sub = join(kitDir, ...String(g.sub ?? "").split("/")), name = basename(String(g.sub ?? g.name));
    if (!g.sub || !existsSync(sub)) continue;
    const take = (rel) => { const f = join(kitDir, ...rel.split("/")); if (existsSync(f)) linkOrCopy(f, join(base, "guideline", name, basename(f))); return `kit/guideline/${name}/${basename(f)}`; };
    const text = (g.text ?? []).map(take), sheets = (g.sheets ?? []).map(take);
    const pages = join(sub, "pages");
    if (existsSync(pages)) for (const p of readdirSync(pages)) linkOrCopy(join(pages, p), join(base, "guideline", name, "pages", p));
    lines.push(`- ${g.name}, ${g.pages ?? "?"} page(s): ${text.length ? `its text: ${text.join(", ")}` : "no text, only pictures"}; its pages small on sheets: ${sheets.join(", ") || "none"}${existsSync(pages) ? `; one page closer: kit/guideline/${name}/pages/page-NNN.jpg` : ""}.`);
  }
  writeFileSync(join(base, "GUIDELINE.md"), ["# The Brand Kit's guideline", "", `Kit: ${m.title}.`, "", ...(lines.length ? lines : ["(The kit has no guideline document: only kit/FRAME.md.)"]), ""].join("\n"));
  const logos = [];
  for (const l of lib.kitLogos(m, root)) { linkOrCopy(l.file, join(lab, "media", "logos", l.name)); logos.push(`media/logos/${l.name}`); }
  return { title: m.title, faces: lib.kitFonts(m, root), logos, frame: !!fr?.text, guideline: lines.length };
}

const LANG_NAME = { vi: "Vietnamese", en: "English" };
/** Stage the lab for one generation; returns { lab, reads, kit }. */
export async function stageLab(project, { frame, way, root = APP_ROOT, styleRules = null } = {}) {
  const dir = project.path, meta = project.meta ?? {}, lab = labDir(dir);
  rmSync(lab, { recursive: true, force: true });
  mkdirSync(join(lab, "media"), { recursive: true }); mkdirSync(join(lab, "tools"), { recursive: true });
  copyFileSync(join(framesDir(dir), frame.file), join(lab, "media", "frame-16x9.png"));
  if (frame.file9 && existsSync(join(framesDir(dir), frame.file9))) copyFileSync(join(framesDir(dir), frame.file9), join(lab, "media", "frame-9x16.png"));
  cpSync(join(HERE, "lab-tools", "check-thumbs.mjs"), join(lab, "tools", "check-thumbs.mjs"));
  mkdirSync(join(lab, ".moworks", "thumbnails"), { recursive: true });
  cpSync(join(root, "config", "rules", "thumbnails", "SKILL.md"), join(lab, ".moworks", "thumbnails", "SKILL.md"));
  for (const f of ["frame.md", "design.md"]) if (existsSync(join(dir, f))) copyFileSync(join(dir, f), join(lab, f));
  const kitRef = way === "brand" ? filmKit(meta) : null;
  const kit = kitRef ? await stageKit(kitRef.id, lab, root) : null;
  const fonts = stageFonts(dir, lab, kit?.faces ?? []);
  // the film style's look (its fonts, colours and titles), as reads.mjs names it for the Thumbnails step
  let reads = [], missing = [];
  try {
    const rules = styleRules ?? (async (d, sid) => {
      // the style's look for the two pictures, as reads.mjs names it for the Thumbnails step (the owner's styles: their source skill's look)
      const { stageFor } = await import("../agent/rules.mjs"), { missingReads, requiredReads } = await import("../agent/reads.mjs");
      const { first } = stageFor(d, sid, { step: "thumbnails", root });
      return { reads: requiredReads(d, { styleId: sid, first, step: "thumbnails" }), missing: missingReads(d, { styleId: sid, first, step: "thumbnails" }) };
    });
    // the reads, and a rules file the step cannot find (said in the run's log: audit/112 3.3); a test's rules may give the list alone
    const got = (await rules(lab, meta.style?.id ?? null)) ?? [];
    reads = Array.isArray(got) ? got : got.reads ?? [];
    missing = Array.isArray(got) ? [] : got.missing ?? [];
  } catch { /* the film's own design files are enough */ }
  const lang = meta.language?.id ?? "en";
  writeFileSync(join(lab, "film.md"), [
    `# ${meta.title ?? basename(dir)}`, "",
    `- Title: ${meta.title ?? basename(dir)}`,
    `- Opening line: ${openingLine(dir) || "(none)"}`,
    `- Film style: ${meta.style?.title ?? meta.style?.id ?? "(none)"}`,
    `- Language: ${LANG_NAME[lang] ?? lang}`,
    `- Frame: ${frame.t} s into the film${frame.file9 ? " (the 9:16 size's frame at the same second: media/frame-9x16.png)" : " (no 9:16 size: crop media/frame-16x9.png)"}`,
    `- Fonts in fonts/: ${fonts.map((f) => f.family).join(", ") || "(none: use the frame's look with a system face that has the language's letters)"}`,
    ...(kit ? [`- Brand Kit: ${kit.title}${kit.logos.length ? `; its logos: ${kit.logos.join(", ")}` : "; no logo"}`] : []),
    "", "## The brief (first lines)", "", String(meta.brief?.text ?? read(join(dir, "BRIEF.md"))).split(/\r?\n/).slice(0, 12).join("\n"), "",
  ].join("\n"));
  const list = [".moworks/thumbnails/SKILL.md", "film.md", ...["frame.md", "design.md"].filter((f) => existsSync(join(lab, f))),
    ...reads.filter((p) => existsSync(join(lab, ...p.split("/")))).slice(0, 6), ...(kit ? ["kit/FRAME.md", "kit/GUIDELINE.md"].filter((p) => existsSync(join(lab, ...p.split("/")))) : [])];
  return { lab, reads: list, kit, fonts, missing };
}

function request({ way, reads, kit, frame }) {
  return `Make this film's two upload thumbnails (16:9 and 9:16) from the frame the owner picked, as .moworks/thumbnails/SKILL.md says (read it first).

Read these files:
${reads.map((p) => `- ${p}`).join("\n")}

The frame: media/frame-16x9.png${frame.file9 ? " and media/frame-9x16.png (the film's own 9:16 size)" : ""}: look at it before you lay it out.
The way: ${way === "brand" ? `the Brand Kit (${kit?.title ?? "the film's kit"}): its thumbnail rules from its guideline; if it has none, say so in thumb.json (kitRules "none")` : "Automatic: the film style's own look"}.
Write thumb-16x9.html, thumb-9x16.html and thumb.json, run node tools/check-thumbs.mjs until it says OK, then reply with one short line.`;
}

/** The task's steps for the page (plain words; never a command, a file or a path). */
const SAY = { read: "Reading the film style", look: "Looking at the frame", kit: "Reading the Brand Kit", write: "Laying out the thumbnails", check: "Checking the thumbnails" };
function toolStep(e) {
  const f = String(e.file ?? "").replace(/\\/g, "/");
  if (e.name === "Bash" && /check-thumbs/.test(String(e.command ?? ""))) return "check";
  if (["Write", "Edit"].includes(e.name) && /thumb-|thumb\.json/.test(f)) return "write";
  if (e.name === "Read" && /\/media\/|frame-/.test(f)) return "look";
  if (/\/kit\//.test(f) || (e.name === "Grep" && /kit/.test(f))) return "kit";
  return e.name === "Read" ? "read" : null;
}
const STEP_PCT = { read: 15, kit: 25, look: 35, write: 55, check: 75 };

/** Make the thumbnails from frame n (1-3) the Automatic or the Brand Kit way: one Claude task, the app's check, the render.
 *  deps: claude (runClaude's shape), snap (snapshotAtAsync's shape), encode (png, jpg, { quality, w, h }), settings. Returns the state. */
export async function makeThumbs(project, { n, way = "auto", root = APP_ROOT, signal = null, deps = {}, onStep = () => {}, log = () => {} } = {}) {
  const dir = project.path, meta = project.meta ?? {};
  if (!WAYS.includes(way)) throw Object.assign(new Error("The way is Automatic or Brand Kit"), { code: "INVALID" });
  const frame = (readState(dir).frames ?? []).find((f) => f.n === Number(n));
  if (!frame || !existsSync(join(framesDir(dir), frame.file))) throw Object.assign(new Error("Take the frames first"), { code: "INVALID" });
  if (way === "brand" && !filmKit(meta)) throw Object.assign(new Error("This film has no Brand Kit"), { code: "INVALID" });
  onStep("Getting the frame ready", 5);
  const st = await stageLab(project, { frame, way, root, styleRules: deps.styleRules });
  if (st.missing.length) {
    const { missingLine } = await import("../agent/reads.mjs");
    log(missingLine(st.missing.length)); console.error(`[rules] ${meta.style?.id ?? "no style"} thumbnails: not found ${st.missing.join(", ")}`);
  }
  const claude = deps.claude ?? (await import("../character-maker/index.mjs")).runClaude;
  const s = deps.settings ?? (await import("../agent/index.mjs")).agentSettings(root);
  const { OAUTH_RACE } = await import("../system-status/claude-run.mjs");
  let cost = 0, ms = 0;
  const ask = async (brief) => {
    const once = () => claude({ lab: st.lab, brief, allowed: ["Bash(node tools/check-thumbs.mjs:*)"], root, model: s.model, effort: "high", tools: "Read,Write,Edit,Glob,Grep,Bash", signal,
      onEvent: (e) => { if (e.kind !== "tool") return; const k = toolStep(e); if (k) { log(SAY[k]); onStep(SAY[k], STEP_PCT[k]); } } });
    let r = await once();
    if (!r.ok && !signal?.aborted && OAUTH_RACE.test(String(r.error ?? ""))) { log("Claude Code was busy refreshing its sign-in: trying again"); await new Promise((ok) => setTimeout(ok, 5000)); if (!signal?.aborted) r = await once(); }
    if (signal?.aborted) throw Object.assign(new Error("Stopped"), { code: "CANCELLED" });
    if (!r.ok) throw Object.assign(new Error(r.error ?? "Claude could not finish"), { code: "CLAUDE" });
    cost += r.costUsd ?? 0; ms += r.ms ?? 0;
    return r;
  };
  await ask(request({ way, reads: st.reads, kit: st.kit, frame }));
  let got = checkThumbs(st.lab);
  if (!got.ok) {
    log(`Asking Claude to fix: ${got.problems.slice(0, 3).join("; ")}`);
    await ask(`The app's check found:\n${got.problems.map((p) => `- ${p}`).join("\n")}\nFix the pages and thumb.json (keep what is right), run node tools/check-thumbs.mjs until it says OK, then reply with one line.`);
    got = checkThumbs(st.lab);
    if (!got.ok) throw Object.assign(new Error(`The thumbnails did not pass the check: ${got.problems.slice(0, 2).join("; ")}`), { code: "CHECK", detail: got.problems });
  }
  const tj = readJson(join(st.lab, "thumb.json"), {}) ?? {};
  // the pages are kept beside the state, so Edit title and a later render work from them (the lab is cleared by the next Make)
  keepPages(dir, st.lab);
  patchState(dir, () => ({ pick: frame.n, way, title: got.title, by: "claude", kit: way === "brand" ? { ...(filmKit(meta) ?? {}), rules: tj.kitRules === "none" ? "none" : "found", pages: String(tj.kitPages ?? "").slice(0, 300) } : null,
    notes: String(tj.notes ?? "").slice(0, 300), madeAt: new Date().toISOString(), run: { ms, costUsd: cost } }));
  onStep("Rendering the pictures", 85);
  return renderThumbs(project, { root, signal, deps });
}

/** Where the made pages and their media live between generations (the lab is rebuilt by each Make). */
export const pagesDir = (dir) => join(dir, ".moworks", "cache", "thumbnails-made");
function keepPages(dir, lab) {
  const to = pagesDir(dir);
  rmSync(to, { recursive: true, force: true });
  cpSync(lab, to, { recursive: true, filter: (src) => { const r = relative(lab, src); return !r || !/^(tools|\.moworks|kit)([\\/]|$)/.test(r); } });
}

// ---- 3. the render: each page to a still with HyperFrames, then a JPG next to the film's render
/** The app's own script in each page: a title marked data-fit shrinks until it fits its box (the owner's longer title still holds). */
export const FIT_SCRIPT = `<script data-mw="thumb-fit">(function(){function fit(){var els=document.querySelectorAll("[data-fit]");for(var i=0;i<els.length;i++){var el=els[i];el.style.fontSize="";var s=parseFloat(getComputedStyle(el).fontSize)||100,min=s*0.35,n=0;while((el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)&&s>min&&n<80){s*=0.96;n++;el.style.fontSize=s+"px";}}}fit();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);})();</script>`;
export const withFit = (html) => (/data-mw="thumb-fit"/.test(html) ? html : /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${FIT_SCRIPT}\n</body>`) : `${html}\n${FIT_SCRIPT}\n`);

const execFileP = promisify(execFile);
async function encodeJpg(png, jpg, { w, h, maxBytes = null, root }) {
  const { ffmpegExe } = await import("../library/preview-media.mjs");
  for (const q of maxBytes ? [2, 3, 4, 5, 7, 9, 12] : [2]) {
    await execFileP(ffmpegExe(root), ["-v", "error", "-y", "-i", png, "-vf", `scale=${w}:${h}:flags=lanczos`, "-frames:v", "1", "-q:v", String(q), "-pix_fmt", "yuvj420p", jpg], { windowsHide: true });
    if (!maxBytes || statSync(jpg).size <= maxBytes) return { q, bytes: statSync(jpg).size };
  }
  return { q: 12, bytes: statSync(jpg).size };
}

/** Render the made pages (pagesDir) to the two JPGs in renders/; runs the text checks. Returns the state. */
export async function renderThumbs(project, { root = APP_ROOT, signal = null, deps = {} } = {}) {
  const dir = project.path, meta = project.meta ?? {}, src = pagesDir(dir);
  const snap = deps.snap ?? (await import("../hf-qa/cli.mjs")).snapshotAtAsync;
  const encode = deps.encode ?? encodeJpg;
  if (!existsSync(join(src, "thumb-16x9.html"))) throw Object.assign(new Error("Make the thumbnails first"), { code: "INVALID" });
  const base = renderName(dir, meta), outDir = join(dir, "renders");
  mkdirSync(outDir, { recursive: true });
  const files = {}, made = [];
  for (const [tag, [w, h]] of Object.entries(SIZES)) {
    if (signal?.aborted) throw Object.assign(new Error("Stopped"), { code: "CANCELLED" });
    const html = read(join(src, `thumb-${tag}.html`));
    writeFileSync(join(src, "index.html"), withFit(html));
    const shots = join(src, ".stills", tag);
    rmSync(shots, { recursive: true, force: true }); mkdirSync(shots, { recursive: true });
    const r = await snap(src, [0], shots, { signal, timeoutMs: 240000 });
    const png = (() => { try { return readdirSync(shots).find((f) => /\.png$/i.test(f)); } catch { return null; } })();
    if (!png) throw Object.assign(new Error(`The ${tag === "16x9" ? "16:9" : "9:16"} picture could not be rendered${r?.stderrTail?.length ? `: ${String(r.stderrTail.filter(Boolean).at(-1) ?? "").slice(0, 160)}` : ""}`), { code: "RENDER" });
    const name = outName(base, tag), out = join(outDir, name);
    const enc = await encode(join(shots, png), out + ".part.jpg", { w, h, maxBytes: tag === "16x9" ? MAX_16x9_BYTES : null, root });
    renameSync(out + ".part.jpg", out);
    files[tag] = { name, bytes: statSync(out).size, w, h };
    made.push(enc);
  }
  rmSync(join(src, "index.html"), { force: true });
  rmSync(join(src, ".stills"), { recursive: true, force: true });
  const s = readState(dir), title = s.title ?? titleOf(read(join(src, "thumb-16x9.html"))) ?? "";
  const vi = await viWarning(dir, title).catch(() => null);
  return patchState(dir, () => ({ files, renderName: base, renderedAt: new Date().toISOString(), warnings: [...(vi ? [vi] : []), ...warnings(dir, meta, title, s)] }));
}

// ---- Edit title (no Claude): the words of #thumb-title in both pages, then the render again
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function setTitle(dir, text) {
  const words = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
  if (!words) throw Object.assign(new Error("Write the title first"), { code: "INVALID" });
  const src = pagesDir(dir);
  for (const tag of Object.keys(SIZES)) {
    const f = join(src, `thumb-${tag}.html`), html = read(f);
    if (!html) throw Object.assign(new Error("Make the thumbnails first"), { code: "INVALID" });
    const next = html.replace(/(<([a-z][a-z0-9]*)\b[^>]*\bid\s*=\s*["']thumb-title["'][^>]*>)([\s\S]*?)(<\/\2\s*>)/i, (_m, open, _t, _in, close) => `${open}${esc(words)}${close}`);
    if (next === html && titleOf(html) !== words) throw Object.assign(new Error("The title is not live text in this thumbnail: make it again"), { code: "INVALID" });
    writeFileSync(f, next);
  }
  const tj = join(src, "thumb.json"), j = readJson(tj, {}) ?? {};
  writeFileSync(tj, JSON.stringify({ ...j, title: words }, null, 1) + "\n");
  patchState(dir, () => ({ title: words, by: "owner", editedAt: new Date().toISOString() }));
  return words;
}

// ---- the text checks: warnings only (#1109)
const loadFontkit = () => fontkitFor() ?? false;          // hf-qa/vietnamese.mjs
/** The face the title is set in (the first family of #thumb-title's CSS rule, or of h1/body), and its files in the page's fonts.css. */
export function titleFace(pageDir, html) {
  const css = [...String(html).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const inline = /\bid\s*=\s*["']thumb-title["'][^>]*\bstyle\s*=\s*["']([^"']*)["']/i.exec(html)?.[1] ?? /\bstyle\s*=\s*["']([^"']*)["'][^>]*\bid\s*=\s*["']thumb-title["']/i.exec(html)?.[1] ?? "";
  const rule = (sel) => new RegExp(`${sel}[^{]*{([^}]*)}`, "i").exec(css)?.[1] ?? "";
  const famOf = (body) => /font-family\s*:\s*([^;]+)/i.exec(body)?.[1];
  const tag = /<([a-z][a-z0-9]*)\b[^>]*\bid\s*=\s*["']thumb-title["']/i.exec(html)?.[1] ?? "h1";
  const fam = famOf(inline) ?? famOf(rule("#thumb-title")) ?? famOf(rule(`(?:^|[\\s,}])${tag}\\b`)) ?? famOf(rule("body")) ?? null;
  const first = fam ? fam.split(",")[0].trim().replace(/^['"]|['"]$/g, "") : null;
  if (!first) return { family: null, files: [] };
  const fcss = read(join(pageDir, "fonts", "fonts.css")), files = [];
  for (const m of fcss.matchAll(FONT_FACE)) {
    const f = /font-family\s*:\s*['"]?([^;'"]+)/i.exec(m[0])?.[1]?.trim(), u = /url\(\s*['"]?([^'")]+)['"]?\s*\)/i.exec(m[0])?.[1];
    if (f && u && f.toLowerCase() === first.toLowerCase()) files.push(join(pageDir, "fonts", u));
  }
  return { family: first, files };
}
/** Letters of `text` none of the face's files has (null when the face cannot be read). */
export function missingLetters(text, files, fk = loadFontkit()) {
  if (!fk || !files.length) return null;
  const chars = [...new Set([...String(text).normalize("NFC")].filter((c) => /\p{L}|\p{N}/u.test(c)))];
  let left = chars;
  for (const f of files) {
    let font = null; try { font = fk.openSync(f); } catch { continue; }
    left = left.filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)));
    if (!left.length) break;
  }
  return left;
}
/** The page's warnings: [{ code, text, vars }] (said in the UI, never a block). */
export function warnings(dir, meta, title, s = {}) {
  const out = [];
  const n = countWords(title);
  if (title && (n < TITLE_WORDS[0] || n > TITLE_WORDS[1])) out.push({ code: "words", text: "The title has {n} words: 3 to 6 read best on a phone.", vars: { n } });
  const html = read(join(pagesDir(dir), "thumb-16x9.html"));
  const face = titleFace(pagesDir(dir), html);
  const miss = face.family ? missingLetters(title, face.files) : null;
  if (miss?.length) out.push({ code: "glyphs", text: "The title's face {face} has no {letters}: those letters show in another face.", vars: { face: face.family, letters: miss.join(" ") } });
  if (s.way === "brand" && s.kit?.rules === "none") out.push({ code: "kit", text: "The Brand Kit says nothing about thumbnails: made in the automatic layout with the kit's fonts and colours.", vars: {} });
  return out;
}
/** A Vietnamese film's title written without its marks (hf-qa viMarks' words): added to the state's warnings. */
export async function viWarning(dir, title) {
  const vm = await import("../hf-qa/viMarks.mjs");
  if (!vm.filmIsVietnamese(dir)) return null;
  let transcript = ""; try { transcript = JSON.parse(read(join(dir, "transcript.json"))).map((w) => w.text).join(" "); } catch { /* none */ }
  const vocab = vm.vocabulary([read(join(dir, "STORYBOARD.md")), read(join(dir, "BRIEF.md")), read(docPath(dir, "VOICEOVER.md")), transcript, readJson(join(dir, ".moworks", "project.json"), {})?.brief?.text ?? ""]);
  const words = vm.unmarkedWords(title, vocab);
  return words.length ? { code: "marks", text: "The title has Vietnamese written without its marks: {words}.", vars: { words: words.join(", ") } } : null;
}

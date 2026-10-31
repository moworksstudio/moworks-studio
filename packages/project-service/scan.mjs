// The app's scan of the user's files before the Assets analysis: what Claude cannot open itself, made readable.
//   video: a contact sheet (6 frames, 3 x 2), the times it cuts, length / size / fps, and its speech written out (the app's Whisper);
//   audio: length; music (not a voice-over) also tempo, bar starts and loudest passages (librosa) and its words when it is sung;
//   PSD / PSB: the layer tree, a picture of the whole file and of each artboard / top-level group, every text layer with font, size, colour;
//   PowerPoint: each slide's texts, notes and pictures, and the slides as pictures when PowerPoint is on this computer;
//   PDF / AI: the whole document, every page's text and every page on numbered sheets (intake.py pdf, as a Brand Kit reads it), each page
//   ready for a closer look;  pictures: size; numbered pictures in one folder: one image sequence with a sheet.
// Everything lands in .moworks/scan/ (INDEX.md for Claude, index.json for the app), redone only for files that changed.
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { expandEnv, loadPins, APP_ROOT } from "../version-manager/index.mjs";
import { styleTraits } from "../style-catalog/traits.mjs";
import { inventory } from "./index.mjs";
import { runPy } from "../setup/python.mjs";

const run = promisify(execFile);
const SUNG_MIN = 12, SUNG_PER_MIN = 20;   // sung words kept only above both (a demo megamix: Turbo heard 0)
const SCAN_V = 3;          // a file scanned by an older scan is read again (3: song mode for sung words)
const bin = (name, root) => join(expandEnv(loadPins(root).ffmpeg.dir), `${name}.exe`);
const VIDEO = new Set([".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi"]);
const AUDIO = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"]);
const IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);
const READS = new Set([".txt", ".md", ".csv", ".json", ".html"]);
const PSD = new Set([".psd", ".psb"]), PPT = new Set([".pptx", ".ppt"]), PDF = new Set([".pdf", ".ai"]);
const NEEDS_EXPORT = new Set([".key", ".docx", ".doc", ".xlsx", ".fig", ".sketch", ".indd", ".aep", ".prproj"]);
const WORDS_MAX_S = 15 * 60;          // speech / lyrics written out for clips up to 15 minutes
const r2 = (n) => Math.round(n * 100) / 100;
const slug = (p) => p.replace(/[^\w.-]+/g, "_");
// a long PDF's folder holds pages/page-NNN.jpg: a long file name in a deep project must not pass Windows' 260 characters
const shortSlug = (p) => { const s = slug(p); return s.length <= 80 ? s : `${s.slice(0, 64)}-${createHash("sha1").update(p).digest("hex").slice(0, 10)}`; };
const POWERPOINT = "C:/Program Files/Microsoft Office/root/Office16/POWERPNT.EXE";

async function probe(file, root) {
  const { stdout } = await run(bin("ffprobe", root), ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate", "-of", "json", file],
    { windowsHide: true, maxBuffer: 1 << 20, timeout: 30000 });
  const j = JSON.parse(stdout);
  const v = j.streams?.find((s) => s.codec_type === "video"), a = j.streams?.find((s) => s.codec_type === "audio");
  const [fn, fd] = String(v?.r_frame_rate ?? "0/1").split("/").map(Number);
  return { duration: r2(Number(j.format?.duration ?? 0)), width: v?.width ?? null, height: v?.height ?? null, fps: fd ? r2(fn / fd) : null, audio: !!a };
}

/** One 3 x 2 sheet of 6 frames spread over the clip, each 480 px wide. */
async function contactSheet(file, out, duration, root) {
  const every = Math.max(0.2, duration / 6);
  await run(bin("ffmpeg", root), ["-v", "error", "-y", "-i", file, "-vf", `fps=1/${every.toFixed(3)},scale=480:-2,tile=3x2:padding=4:color=black`, "-frames:v", "1", "-q:v", "4", out],
    { windowsHide: true, maxBuffer: 1 << 20, timeout: 120000 });
}
/** A sheet of up to 12 pictures (pages, slides, a sequence), 4 a row, each 400 px wide. */
async function pictureSheet(files, out, root) {
  const xs = files.slice(0, 12);
  if (!xs.length) return null;
  const args = ["-v", "error", "-y"];
  for (const f of xs) args.push("-i", f);
  const rows = Math.ceil(xs.length / 4);
  const scaled = xs.map((_, i) => `[${i}:v]scale=400:225:force_original_aspect_ratio=decrease,pad=400:225:(ow-iw)/2:(oh-ih)/2:color=0x202020[s${i}]`).join(";");
  const pads = Array.from({ length: rows * 4 - xs.length }, (_, k) => `color=c=0x202020:s=400x225:d=1[e${k}]`).join(";");
  const all = [...xs.map((_, i) => `[s${i}]`), ...Array.from({ length: rows * 4 - xs.length }, (_, k) => `[e${k}]`)].join("");
  const graph = `${scaled}${pads ? `;${pads}` : ""};${all}xstack=inputs=${rows * 4}:layout=${Array.from({ length: rows * 4 }, (_, i) => `${(i % 4) * 400}_${Math.floor(i / 4) * 225}`).join("|")}[out]`;
  await run(bin("ffmpeg", root), [...args, "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", "-q:v", "4", out], { windowsHide: true, maxBuffer: 1 << 20, timeout: 120000 });
  return out;
}

/** The times the picture cuts (ffmpeg scene score over 0.12; a flash within 0.3 s counts once), in seconds: a reference video's pacing. */
async function cutTimes(file, root) {
  const { stderr } = await run(bin("ffmpeg", root), ["-hide_banner", "-i", file, "-an", "-vf", "select='gt(scene,0.12)',showinfo", "-f", "null", "-"],
    { windowsHide: true, maxBuffer: 16 << 20, timeout: 180000 });
  return [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => r2(Number(m[1]))).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.3).slice(0, 200);
}

/** Speech or sung words, with times, from the app's Whisper (only when a model is installed and can run). */
async function wordsOf(file, outDir, root, { song = false } = {}) {
  const asr = await import("../voice/asr.mjs");
  const settings = asr.voiceSettings(root);
  const ok = (m) => m.installed && m.runtime.ok, all = asr.models(root);
  const card = all.find((m) => m.id === settings.defaultModel && ok(m)) || all.find(ok);
  if (!card) return { skipped: "no speech model installed (Settings > System)" };
  const r = await asr.transcribe(file, { model: card.id, language: settings.language ?? "vi", song, workDir: join(outDir, "asr"), root });
  rmSync(join(outDir, "asr"), { recursive: true, force: true });
  const segs = (r.segments ?? []).filter((s) => String(s.text ?? "").trim());
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const words = segs.reduce((n, s) => n + String(s.text).trim().split(/\s+/).length, 0);
  const md = [song ? `Sung words as ${card.short} heard them over the music (${r.language ?? settings.language}): partial and rough, lines it could not hear are missing; ask the owner for the lyrics when the exact words matter.`
    : `Written out by ${card.short} (${r.language ?? settings.language}); rough: check names and lyrics by ear.`, "",
    ...segs.map((s) => `[${mmss(s.start)}-${mmss(s.end)}] ${String(s.text).trim()}`)].join("\n");
  writeFileSync(join(outDir, "words.md"), md + "\n");
  return { words, model: card.short };
}

// The deck and the folder come in through the environment, never inside the script text (a name with a quote cannot run as code).
const SLIDES_PS = String.raw`$ErrorActionPreference = 'Stop'
$app = New-Object -ComObject PowerPoint.Application
$p = $app.Presentations.Open($env:MW_PPTX, $true, $false, $false)
$w = 1600; $h = [int](1600 * $p.PageSetup.SlideHeight / $p.PageSetup.SlideWidth)
foreach ($s in $p.Slides) { $s.Export((Join-Path $env:MW_SLIDES ('slide-{0:D2}.png' -f $s.SlideIndex)), 'PNG', $w, $h) }
$p.Close()
if ($app.Presentations.Count -eq 0) { $app.Quit() }`;

/** PowerPoint's own slide pictures (only when PowerPoint is installed; it is opened read-only, without a window, and closed again). */
async function powerpointSlides(file, outDir) {
  if (!existsSync(POWERPOINT)) return null;
  const dir = join(outDir, "slides");
  mkdirSync(dir, { recursive: true });
  const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(SLIDES_PS, "utf16le").toString("base64")];
  await new Promise((ok) => { const c = spawn("powershell.exe", args, { windowsHide: true, env: { ...process.env, MW_PPTX: file, MW_SLIDES: dir } }); const t = setTimeout(() => c.kill(), 180000); c.on("close", () => { clearTimeout(t); ok(); }); c.on("error", () => ok()); });
  const files = existsSync(dir) ? readdirSync(dir).filter((n) => /^slide-\d+\.png$/.test(n)).sort() : [];
  return files.length ? files.map((n) => join(dir, n)) : null;
}

/** Numbered pictures in one folder (frame_001.png …, or 12 and more of 1.png …): an image sequence, shown as one entry with a sheet.
 *  Five loose pictures 1.png … 5.png are pictures, not a sequence. */
export function sequences(items) {
  const groups = new Map();
  for (const x of items) {
    if (x.kind !== "image") continue;
    const m = /^(.*\/)?([^/]*?)(\d+)\.(png|jpe?g|webp)$/i.exec(x.path);
    if (!m) continue;
    const key = `${m[1] ?? ""}${m[2]}|${m[4].toLowerCase()}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push({ ...x, n: Number(m[3]), digits: m[3].length });
  }
  return [...groups.values()].filter((g) => g.length >= 12 || (g.length >= 5 && g.every((x) => x.digits >= 3))).map((g) => g.sort((a, b) => a.n - b.n));
}

/** Scan the project's files; returns { items, changed }. Never throws for one bad file: its entry says what failed. */
export async function scanAssets(dir, { root = APP_ROOT, words = true } = {}) {
  const out = join(dir, ".moworks", "scan");
  mkdirSync(out, { recursive: true });
  const indexFile = join(out, "index.json");
  let old = {};
  try { old = Object.fromEntries(JSON.parse(readFileSync(indexFile, "utf8")).items.map((x) => [x.path, x])); } catch { /* first scan */ }
  const inv = inventory(dir);
  const files = [...Object.values(inv.assets).flat(), ...inv.sources];
  // a film made to a song's lyrics (a Music / Lyrics style, or a brief that asks for its lyrics on screen): its songs are read for words
  let pj = {}; try { pj = JSON.parse(readFileSync(join(dir, ".moworks", "project.json"), "utf8")); } catch { /* an imported folder */ }
  const lyricFilm = styleTraits(pj.style?.id, root).music || /lyric|karaoke|lời bài hát|lời ca|phụ đề bài hát/i.test(String(pj.brief?.text ?? ""));
  const items = [];
  let changed = 0;
  for (const f of files) {
    const abs = join(dir, ...f.path.split("/"));
    const mtime = statSync(abs).mtimeMs;
    const prev = old[f.path];
    // a PDF read by the older scan (its first 40 pages) is read again, whole; the film's other files keep what they have (a video's speech took minutes)
    if (prev && prev.v === SCAN_V && prev.size === f.size && prev.mtime === mtime && (prev.kind !== "pdf" || prev.whole) && (!prev.sheet || existsSync(join(dir, ...prev.sheet.split("/"))))) { items.push(prev); continue; }
    changed++;
    const ext = extname(f.path).toLowerCase();
    const kind = VIDEO.has(ext) ? "video" : AUDIO.has(ext) ? "audio" : IMAGE.has(ext) ? "image" : PSD.has(ext) ? "psd" : PPT.has(ext) ? "pptx" : PDF.has(ext) ? "pdf"
      : READS.has(ext) ? "document" : [".zip", ".rar", ".7z"].includes(ext) ? "archive" : NEEDS_EXPORT.has(ext) ? "needs-export" : /\.(ttf|otf|woff2?|eot)$/.test(ext) ? "font" : "other";
    const it = { v: SCAN_V, path: f.path, size: f.size, mtime, kind };
    const sub = `.moworks/scan/${slug(f.path)}`, subAbs = join(dir, ...sub.split("/"));
    const rel = (name) => `${sub}/${name}`;
    try {
      if (kind === "video") {
        Object.assign(it, await probe(abs, root));
        const sheet = `.moworks/scan/${slug(f.path)}.sheet.jpg`;
        if (it.duration > 0) { await contactSheet(abs, join(dir, ...sheet.split("/")), it.duration, root); it.sheet = sheet; }
        if (it.duration > 0) it.cuts = await cutTimes(abs, root).catch(() => null);
        if (words && it.audio && it.duration > 0 && it.duration <= WORDS_MAX_S) {
          mkdirSync(subAbs, { recursive: true });
          const w = await wordsOf(abs, subAbs, root).catch((e) => ({ skipped: e.message }));
          if (w.words != null) Object.assign(it, { words: w.words, wordsFile: rel("words.md") }); else it.wordsNote = w.skipped;
        }
      } else if (kind === "audio") {
        const p = await probe(abs, root); it.duration = p.duration;
        if (!/^assets\/(3_audio\/)?voiceover\//.test(f.path)) {          // a voice-over has its own transcript step; music gets tempo and words
          mkdirSync(subAbs, { recursive: true });
          const m = await runPy(root, "tools/intake/intake.py", ["music", abs, subAbs], { timeoutMs: 5 * 60 * 1000 });
          if (m.ok) Object.assign(it, { bpm: m.bpm, barStarts: m.bar_starts?.slice(0, 12), loudest: m.loudest, md: rel("MUSIC.md") }); else it.error = m.error;
          // a song is not read for words unless the film is set to its lyrics (the app reads speech, not singing: Whisper ran
          // ~10 min on the CPU over a 50 s song and heard nothing)
          if (words && it.duration <= WORDS_MAX_S && !lyricFilm) it.wordsNote = "music: its words are not read (the app reads speech, not singing); for a lyric video the owner gives the lyrics in the Lyrics step";
          else if (words && it.duration <= WORDS_MAX_S) {
            // the app transcribes speech, not singing: Turbo tries the song (song mode drops its stock "subscribe…" lines); under
            // SUNG_MIN words, or under SUNG_PER_MIN a minute (sung lyrics run 60-150 a minute), it heard fragments: the user gives the lyrics
            const w = await wordsOf(abs, subAbs, root, { song: true }).catch((e) => ({ skipped: e.message }));
            const perMin = w.words != null && it.duration ? w.words / (it.duration / 60) : 0;
            if (w.words != null && w.words >= SUNG_MIN && perMin >= SUNG_PER_MIN) Object.assign(it, { words: w.words, wordsFile: rel("words.md") });
            else {
              if (w.words != null) rmSync(join(subAbs, "words.md"), { force: true });
              it.wordsNote = w.words != null ? `sung words not heard (Whisper heard ${w.words}); the app transcribes speech, not singing: for a lyric video ask the owner to paste the lyrics in the Lyrics step` : w.skipped;
            }
          }
        }
      } else if (kind === "archive") {
        const m = ext === ".zip" ? await runPy(root, "tools/intake/intake.py", ["zip", abs, subAbs], { timeoutMs: 60000 }) : { ok: false };
        if (m.ok) Object.assign(it, { entries: m.entries, sample: m.sample });
      } else if (kind === "image" && ext !== ".svg") { const p = await probe(abs, root); it.width = p.width; it.height = p.height; }
      else if (kind === "psd") {
        // a very large PSB takes minutes: its own time limit, and the user can still give PNG exports of the frames
        const m = await runPy(root, "tools/intake/intake.py", ["psd", abs, subAbs], { timeoutMs: (f.size > 1e9 ? 30 : 8) * 60 * 1000 });
        if (m.ok) Object.assign(it, { width: m.width, height: m.height, artboards: m.artboards, frames: m.frames, texts: m.texts, fonts: m.fonts,
          composite: m.composite ? rel(m.composite) : null, md: rel("PSD.md") });
        else it.error = m.error ?? "the file could not be read";
      } else if (kind === "pptx") {
        const m = ext === ".pptx" ? await runPy(root, "tools/intake/intake.py", ["pptx", abs, subAbs], { timeoutMs: 5 * 60 * 1000 }) : { ok: false };
        if (m.ok) Object.assign(it, { slides: m.slides, width: m.width, height: m.height, md: rel("PPTX.md") });
        const pics = await powerpointSlides(abs, subAbs).catch(() => null);
        if (pics) { it.slidePictures = pics.length; it.sheet = rel("slides.jpg"); await pictureSheet(pics, join(subAbs, "slides.jpg"), root).catch(() => { it.sheet = null; }); it.slidesDir = rel("slides"); }
        if (!m.ok && !pics) it.error = m.error ?? "PowerPoint is not on this computer to read an old .ppt";
      } else if (kind === "pdf") {
        // the whole document, as a Brand Kit reads it: every page's text, every page on numbered sheets, each page ready for a closer look
        // (a page limit of 40 kept pages 41-130 of a guideline from Claude, and the film broke rules it could not read: T30-7)
        const pdfSub = `.moworks/scan/${shortSlug(f.path)}`, pdfAbs = join(dir, ...pdfSub.split("/"));
        rmSync(subAbs, { recursive: true, force: true }); rmSync(pdfAbs, { recursive: true, force: true });          // an older scan's pictures of it
        const m = await runPy(root, "tools/intake/intake.py", ["pdf", abs, pdfAbs], { timeoutMs: 10 * 60 * 1000 });
        it.whole = true;
        if (m.ok) {
          const of = (x) => `${pdfSub}/${x}`;
          Object.assign(it, { pages: m.pages, chars: m.chars, text: m.text.map(of), sheets: m.sheets.map(of), pagesDir: of("pages") });
          if (it.sheets.length) it.sheet = it.sheets[0];
        } else if (m.password) Object.assign(it, { password: true, error: m.error });
        else it.error = ext === ".ai" ? "this Illustrator file was saved without PDF content: ask for a PDF or PNG export" : m.error;
      }
    } catch (e) { it.error = String(e.message ?? e).split("\n")[0].slice(0, 200); }
    items.push(it);
  }
  // numbered pictures: one sequence each, with a sheet of up to 12 of its frames
  const seqs = [];
  for (const g of sequences(items)) {
    const folder = g[0].path.slice(0, g[0].path.lastIndexOf("/") + 1);
    const sheet = `.moworks/scan/${slug(folder + g[0].path.split("/").pop())}.sequence.jpg`;
    const pick = g.length <= 12 ? g : Array.from({ length: 12 }, (_, i) => g[Math.round(i * (g.length - 1) / 11)]);
    await pictureSheet(pick.map((x) => join(dir, ...x.path.split("/"))), join(dir, ...sheet.split("/")), root).catch(() => {});
    seqs.push({ v: SCAN_V, kind: "sequence", path: folder, count: g.length, first: g[0].path, last: g.at(-1).path, width: g[0].width, height: g[0].height,
      sheet: existsSync(join(dir, ...sheet.split("/"))) ? sheet : null, members: g.map((x) => x.path) });
  }
  const inSeq = new Set(seqs.flatMap((s) => s.members));
  const shown = [...items.filter((x) => !inSeq.has(x.path)), ...seqs];
  writeFileSync(indexFile, JSON.stringify({ at: new Date().toISOString(), items, sequences: seqs }, null, 2));
  writeFileSync(join(out, "INDEX.md"), indexMd(shown));
  return { items, sequences: seqs, changed };
}

const line = (x) => {
  const dims = x.width ? `${x.width}x${x.height}` : "";
  switch (x.kind) {
    case "video": return `- ${x.path}: video, ${x.duration ?? "?"} s, ${dims}${x.fps ? ` @ ${x.fps} fps` : ""}${x.audio ? ", with sound" : ", no sound"}${x.cuts ? `. Cuts at (s): ${x.cuts.length ? x.cuts.join(", ") : "none found (one shot, or soft transitions)"}` : ""}${x.sheet ? `. Contact sheet (6 frames over the clip): ${x.sheet}` : ""}${x.wordsFile ? `. Its speech written out (${x.words} words): ${x.wordsFile}` : x.wordsNote ? `. Speech not written out: ${x.wordsNote}` : ""}`;
    case "audio": return `- ${x.path}: audio, ${x.duration ?? "?"} s${x.bpm ? `, about ${x.bpm} BPM; tempo, bar starts, loudest passages: ${x.md}` : ""}${x.wordsFile ? `; words heard (${x.words}, rough: sung words): ${x.wordsFile}` : x.wordsNote ? `; ${x.wordsNote}` : ""}`;
    case "image": return `- ${x.path}: picture${dims ? `, ${dims}` : ""} (open it)`;
    case "sequence": return `- ${x.path}: ${x.count} numbered pictures (${x.first.split("/").pop()} … ${x.last.split("/").pop()}${dims ? `, ${dims}` : ""}), an image sequence or a set of frames${x.sheet ? `; sheet of up to 12 of them: ${x.sheet}` : ""}`;
    case "psd": return `- ${x.path}: Photoshop file ${dims}, ${x.artboards ? `${x.artboards} artboard(s)` : `${x.frames ?? 0} top-level group frame(s)`}, ${x.texts ?? 0} text layer(s), fonts: ${(x.fonts ?? []).join(", ") || "none"}. Read ${x.md} (layer tree, texts with font / size / colour, frame pictures)${x.composite ? `; the whole file: ${x.composite}` : ""}. For a keep-design rebuild, the app's psd_layers tool exports a frame's layers`;
    case "pptx": return `- ${x.path}: PowerPoint, ${x.slides ?? "?"} slide(s)${x.md ? `: texts, notes, pictures in ${x.md}` : ""}${x.sheet ? `; slide pictures (PowerPoint): ${x.sheet}, each in ${x.slidesDir}/` : ""}`;
    case "pdf": {
      const what = x.path.toLowerCase().endsWith(".ai") ? "Illustrator file" : "PDF";
      if (x.password) return `- ${x.path}: ${what} with a password: not read, none of its pages reached you. Tell the owner, and ask for a copy without one`;
      if (!x.text) return `- ${x.path}: ${what}, not read`;
      return `- ${x.path}: ${what}, ${x.pages} page(s). ${x.chars ? `All its words, every page: ${x.text.join(", ")}` : "No text in it: its words are only in its pictures, open the pages that matter"}. Every page small and numbered on sheets: ${x.sheets.join(", ")}. One page closer: ${x.pagesDir}/page-NNN.jpg (NNN: its number in three digits), only where a page sets a rule its text does not fully give (a gradient, a lockup, a logo's place)`;
    }
    case "document": return `- ${x.path}: document (open it)`;
    case "archive": return `- ${x.path}: archive${x.entries != null ? ` of ${x.entries} file(s), e.g. ${(x.sample ?? []).join(", ")}` : ""}; its files are not in the project until the owner unpacks it and imports them`;
    case "needs-export": return `- ${x.path}: cannot be opened here; ask the owner for a PNG or PDF export of it`;
    case "font": return `- ${x.path}: font`;
    default: return `- ${x.path}: ${extname(x.path) || "file"}`;
  }
};
const indexMd = (items) => ["# The app's scan of your files", "",
  "Written by Moworks Studio before the Assets analysis. Pictures: open them. Videos, PSD, PowerPoint, PDF: read the sheets and the .md files named here (you cannot play a video or open a PSD); a PDF's words are all in its text parts: read every part, never the PDF itself (a large one fails). Words written out by Whisper are rough.", "",
  ...items.map((x) => line(x) + (x.error && !x.password ? ` (scan failed: ${x.error})` : "")), ""].join("\n");

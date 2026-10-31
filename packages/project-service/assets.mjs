// The project's assets as the Editor's Assets tab shows them (like After Effects' Project panel): every
// file under assets/ (and the old sources/), its kind, size, length from the scan, the shots that use it, and two states the user makes
// outside the app: "missing" (a path the film uses is not on disk: deleted or renamed in Explorer) and "new" (a file the app has not seen:
// copied in Explorer). The app's own copies (GSAP, bundled fonts) are left out; the sounds it placed (assets/sfx) are listed as the app's.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";
import { audioFolder, isDesignPath, sequenceOf } from "./index.mjs";
import { appSounds, kitFiles } from "./layout.mjs";
import { placedShots } from "../hf-edit/shots.mjs";
import { filmLength } from "../hf-edit/ending.mjs";

const posix = (p) => p.split(sep).join("/");
const IMAGE = /\.(png|jpe?g|webp|gif|avif|bmp|tiff?|heic|svg|exr)$/i, VIDEO = /\.(mp4|mov|webm|m4v|mkv|avi)$/i, AUDIO = /\.(mp3|wav|m4a|flac|ogg|aac|opus)$/i, FONT = /\.(ttf|otf|woff2?|eot)$/i;
const HIDDEN = /^assets\/(_app\/(vendor|psd)|vendor|psd)\//;          // the app's own copies (GSAP) and the layers it exports for Claude
// the fonts the app embeds (Google Fonts subsets, the bundled set): one row per family, not dozens of subset files
const APP_FONT = /^assets\/(?:_app\/)?fonts\/(google|kit|bundled)\/(?:([^/]+)\/)?/;

/** The Assets tab's groups, in their display order: Images, Footage, Design, Fonts, Audio (Voice, SFX, Music). */
export const ASSET_GROUPS = [
  { id: "images", title: "Images", folder: "assets/1_design/images" },
  { id: "footage", title: "Footage", folder: "assets/2_footage" },
  { id: "design", title: "Design", folder: "assets/1_design" },
  { id: "fonts", title: "Fonts", folder: "assets/1_design/fonts" },
  { id: "audio", title: "Audio", folder: "assets/3_audio", children: [
    { id: "voiceover", title: "Voice", folder: "assets/3_audio/voiceover" },
    { id: "sfx", title: "SFX", folder: "assets/3_audio/sfx" },
    { id: "music", title: "Music", folder: "assets/3_audio/music" }] },
];
/** The group an item shows under: an audio file's group is its folder (voiceover / sfx / music), else its name sorts it. */
export function groupOf(item) {
  const p = item.path ?? "";
  if (item.kind === "font") return "fonts";
  if (item.kind === "design") return "design";
  if (item.kind === "footage" || item.kind === "sequence") return "footage";
  if (item.kind === "image") return "images";
  if (item.kind === "audio") { const m = /3_audio\/(voiceover|sfx|music)\//.exec(p); return m ? m[1] : /(^|\/)sfx\//.test(p) ? "sfx" : /(^|\/)voiceover\//.test(p) ? "voiceover" : audioFolder(p.split("/").pop()); }
  return "other";
}
const seenFile = (dir) => join(dir, ".moworks", "assets-seen.json");
const readJson = (f, fb) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return fb; } };

/** Every file the tab lists, project-relative. */
export function assetFiles(dir) {
  const out = [];
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { if (/^(desktop\.ini|Thumbs\.db)$/i.test(n) || n.endsWith(".part")) continue; const f = join(d, n), s = statSync(f);
    if (s.isDirectory()) walk(f); else { const rel = posix(relative(dir, f)); if (!HIDDEN.test(rel)) out.push({ path: rel, size: s.size, mtime: s.mtimeMs }); } } };
  walk(join(dir, "assets")); walk(join(dir, "sources"));
  return out;
}

/** The files the film refers to: { "assets/x.png": ["compositions/f1.html", "index.html"] } (src, href, url(), data-src; data: and web URLs left out). */
export function referencedFiles(dir) {
  const refs = new Map();
  const htmls = [];
  if (existsSync(join(dir, "index.html"))) htmls.push("index.html");
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else if (/\.(html|css)$/i.test(n)) htmls.push(posix(relative(dir, f))); } };
  walk(join(dir, "compositions"));
  for (const h of htmls) {
    const text = readFileSync(join(dir, ...h.split("/")), "utf8");
    for (const m of text.matchAll(/(?:\b(?:src|href|data-src|poster)\s*=\s*["']([^"'#?]+)["']|url\(\s*["']?([^"')#?]+)["']?\s*\))/gi)) {
      const written = (m[1] ?? m[2] ?? "").trim();
      if (!written || /^(data:|https?:|\/\/|#|mailto:)/i.test(written)) continue;
      // a URL in the page: "PNG%20Logo.png" is the file "PNG Logo.png" (it was once reported missing though the film showed it)
      let raw = written; try { raw = decodeURI(written); } catch { /* a stray % stays as written */ }
      // a path written from the project root, or from the file's own folder
      const fromRoot = posix(normalize(raw.replace(/^\.?\//, "")));
      const fromFile = posix(normalize(join(dirname(h), raw)));
      const rel = [fromFile, fromRoot].find((x) => existsSync(join(dir, ...x.split("/")))) ?? (fromRoot.startsWith("assets/") ? fromRoot : fromFile);
      if (!rel.startsWith("assets/") || rel.startsWith("..")) continue;
      if (/^assets\/(_app\/)?(vendor|fonts\/(kit|bundled))\//.test(rel)) continue;
      (refs.get(rel) ?? refs.set(rel, []).get(rel)).push(h);
    }
  }
  return refs;
}

const kindOf = (p) => (isDesignPath(p) ? "design" : AUDIO.test(p) ? "audio" : VIDEO.test(p) ? "footage"
  : FONT.test(p) ? "font" : IMAGE.test(p) ? "image" : "other");

/** The Assets tab: { items: [{ path, name, folder, kind, size, duration?, width?, height?, frames?, status, usedIn, onTimeline, transcript, app? }] }.
 *  shots, layers: readShots' shots and layers (to name the shots that use a file); meta: the project's metadata (voice, music). Files seen for the first time
 *  are marked "new" once and remembered (.moworks/assets-seen.json); a project without that file starts with everything seen. */
export function listAssets(dir, { shots = [], layers = [], meta = {}, remember = true } = {}) {
  const files = assetFiles(dir);
  const refs = referencedFiles(dir);
  const scan = Object.fromEntries((readJson(join(dir, ".moworks", "scan", "index.json"), { items: [] }).items ?? []).map((x) => [x.path, x]));
  const seenPath = seenFile(dir);
  const firstLook = !existsSync(seenPath);
  const seen = new Set(firstLook ? files.map((f) => f.path) : readJson(seenPath, { paths: [] }).paths);
  // a layer over the film that is no storyboard frame (a code film's words and logo, words.html at 16.5 s) was counted as one
  // more shot ("In shot 7" in a film of 6): it is in the shots it lies over, as the timeline places them
  const frames = placedShots(shots, filmLength(meta, { dir }).total).filter((x) => x.index != null);
  // readShots' layers (the captions, a closing card over the last shots) are no shots either: the same, or the timeline when they lie over none
  const shotOf = (html) => {
    const s = shots.find((x) => x.src && posix(x.src) === html) ?? layers.find((x) => x.src && posix(x.src) === html);
    if (!s?.notInStoryboard || s.start == null) return s ? (s.number != null ? [s.number] : ["timeline"]) : null;
    const over = frames.filter((x) => x.start < s.start + (Number(s.duration) || 0) - 0.01 && x.start + x.duration > s.start + 0.01).map((x) => x.number);
    return over.length ? over : s.number != null ? [s.number] : ["timeline"];
  };
  const users = (list) => [...new Set(list.flatMap((h) => (h === "index.html" ? ["timeline"] : shotOf(h) ?? [h])))];
  const usedIn = (p) => users(refs.get(p) ?? []);
  const items = [];
  const sequences = new Map(), appFonts = new Map();
  const placed = appSounds(dir), made = appMade(dir, meta);
  for (const f of files) {
    const name = f.path.split("/").pop();
    const af = APP_FONT.exec(f.path);
    if (af) {
      const family = af[1] === "google" && af[2] ? af[2] : name.replace(/[-_[].*$/, "").replace(/\.[^.]+$/, "");
      const key = `${af[1]}/${family}`;
      const g = appFonts.get(key) ?? { path: af[1] === "google" && af[2] ? af[0] : f.path, name: family.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        folder: af[0].replace(/\/(google|kit|bundled)\/.*$/, ""), kind: "font", size: 0, files: 0, status: "ok", usedIn: [], app: true };
      g.size += f.size; g.files++;
      for (const u of usedIn(f.path)) if (!g.usedIn.includes(u)) g.usedIn.push(u);
      appFonts.set(key, g);
      continue;
    }
    const folder = f.path.split("/").slice(0, -1).join("/");
    if (IMAGE.test(name) && sequenceOf(name)) {          // a numbered sequence: one row per folder and name, with its frame count
      const key = `${folder}/${sequenceOf(name).base}`;
      const g = sequences.get(key) ?? { path: `${folder}/`, name: sequenceOf(name).base, folder, kind: "sequence", size: 0, frames: 0, status: "ok", usedIn: [], first: f.path };
      g.size += f.size; g.frames++;
      for (const u of usedIn(f.path)) if (!g.usedIn.includes(u)) g.usedIn.push(u);
      if (!seen.has(f.path)) g.status = "new";
      sequences.set(key, g);
      continue;
    }
    const sc = scan[f.path] ?? {};
    items.push({ path: f.path, name, folder, kind: kindOf(f.path), size: f.size, ...(sc.duration ? { duration: sc.duration } : {}), ...(sc.width ? { width: sc.width, height: sc.height } : {}),
      // named on its row, as a Brand Kit names it on its panel
      ...(sc.password ? { unread: "has a password: give Claude the password in the chat, or add a copy without one" } : sc.wordsUnheard ? { unread: "its sung words could not be heard: paste them in the Lyrics dialog" } : {}),
      // on the timeline: the voice, the music, or any sound placed in the root composition
      status: seen.has(f.path) || made.has(f.path) ? "ok" : "new", usedIn: usedIn(f.path), onTimeline: meta.voice?.file === f.path || meta.music?.file === f.path || (kindOf(f.path) === "audio" && (refs.get(f.path) ?? []).includes("index.html")),
      ...(kindOf(f.path) === "audio" ? { transcript: meta.voice?.file === f.path ? (meta.voice.transcript?.status === "saved" ? "saved" : meta.voice.transcript?.status ?? "none") : "none" } : {}),
      ...(f.path.startsWith("assets/sfx/") || placed.has(f.path) ? { app: true } : {}) });          // the sounds the app placed
  }
  for (const g of sequences.values()) items.push(g);
  for (const g of appFonts.values()) items.push(g);
  for (const [p, by] of refs) {          // the film uses it, the disk does not have it
    if (!existsSync(join(dir, ...p.split("/")))) items.push({ path: p, name: p.split("/").pop(), folder: p.split("/").slice(0, -1).join("/"), kind: kindOf(p), size: 0, status: "missing",
      usedIn: users(by), onTimeline: false });
  }
  const fresh = items.filter((x) => x.status === "new");
  if (remember && (firstLook || fresh.length)) {
    mkdirSync(join(dir, ".moworks"), { recursive: true });
    writeFileSync(seenPath, JSON.stringify({ paths: [...new Set([...seen, ...files.map((f) => f.path)])] }, null, 1));
  }
  for (const x of items) x.group = groupOf(x);          // the Assets tab's group (ASSET_GROUPS)
  items.sort((a, b) => (a.status === "missing" ? -1 : 0) - (b.status === "missing" ? -1 : 0) || a.path.localeCompare(b.path));
  return { items, fresh: fresh.map((x) => x.path), groups: ASSET_GROUPS };
}

/** Files in assets/ the app made itself, never "added by the user" (Test 22: the voice-over the Voice screen made with ElevenLabs was
 *  taken for a file the user added, and the app told Claude in the user's name "I added 1 file(s)… Use them and go on" while the
 *  Storyboard waited for the user's answer): a voice-over read by a voice service (named <service>-<time>.mp3), the voice and the music
 *  track the app placed from its own choices, the sound effects it placed, and the logos and fonts it copied in from the film's Brand Kit. */
export function appMade(dir, meta = {}) {
  const out = new Set([...appSounds(dir), ...kitFiles(dir)]);
  if (meta?.voice?.file && meta.voice.source && meta.voice.source !== "upload") out.add(meta.voice.file);
  if (meta?.music?.file && meta.music.option) out.add(meta.music.file);          // one of Claude's three tracks, copied in by the app
  const vo = join(dir, "assets", "3_audio", "voiceover");
  if (existsSync(vo)) for (const n of readdirSync(vo)) if (/^(elevenlabs|kokoro|fishaudio)-\d{4}-\d{2}-\d{2}T[\d-]+Z?\.mp3$/i.test(n)) out.add(`assets/3_audio/voiceover/${n}`);
  return out;
}

/** Remember files the app put there itself (an upload, a copy), so they are not "new". */
export function rememberAssets(dir, paths) {
  const f = seenFile(dir);
  const cur = readJson(f, null);
  if (!cur) return;          // no list yet: the first look records everything
  mkdirSync(join(dir, ".moworks"), { recursive: true });
  writeFileSync(f, JSON.stringify({ paths: [...new Set([...cur.paths, ...paths])] }, null, 1));
}

/** Point the film from one file to another: every reference in index.html and compositions/ (written from the root or relative). Returns
 *  the files changed. */
export function rewriteRefs(dir, from, to) {
  const changed = [];
  const htmls = [];
  if (existsSync(join(dir, "index.html"))) htmls.push("index.html");
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else if (/\.(html|css)$/i.test(n)) htmls.push(posix(relative(dir, f))); } };
  walk(join(dir, "compositions"));
  for (const h of htmls) {
    const file = join(dir, ...h.split("/"));
    const text = readFileSync(file, "utf8");
    const relFrom = posix(relative(dirname(file), join(dir, ...from.split("/")))), relTo = posix(relative(dirname(file), join(dir, ...to.split("/"))));
    let next = text.split(from).join(to);
    if (relFrom !== from) next = next.split(relFrom).join(relTo);
    if (next !== text) { writeFileSync(file + ".tmp", next); renameSync(file + ".tmp", file); changed.push(h); }
  }
  return changed;
}

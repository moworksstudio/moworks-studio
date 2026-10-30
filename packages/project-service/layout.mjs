// The folders of a project's assets/, kept together rather than fragmented:
//   1_design/          design files (PSD, PSB, PPTX, PDF, AI, guidelines), with images/ (every picture and logo) and fonts/
//   2_footage/         video; a numbered picture sequence in its own folder named after it (2_footage/<name>/)
//   3_audio/           voiceover/, sfx/, music/
//   _app/              the app's own copies, hidden in Explorer: vendor/ (GSAP, HF's runtime), fonts/ (the bundled and Google fonts it
//                      embeds), psd/ (the layers it exports for Claude)
// Projects made before keep older folders (audio/, sfx/, fonts/, images/, logos/, video/, voiceover/, 1_images/, 4_fonts/, 5_design/,
// sources/, vendor/…); migrateLayout() moves their files into this layout when the project is opened and points the film, its documents
// and the app's records to the new paths. It never deletes a file: one it cannot move stays where it is and is reported. Idempotent.
// Version 3: the app's documents (NOTES.md, ASSETS.md, CREDITS.md, QC-REVIEW.*, VOICEOVER.md, CHARACTERS.json, MOTION-PLAN.json) in docs/
// (docs.mjs), HyperFrames' files staying at the root; the music options to listen to in .moworks/cache/; .moworks and .hyperframes hidden.
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, sep } from "node:path";
import { moveDocs } from "./docs.mjs";

export const LAYOUT_VERSION = 3;
export const A = {
  design: "assets/1_design", images: "assets/1_design/images", fonts: "assets/1_design/fonts",
  footage: "assets/2_footage", voiceover: "assets/3_audio/voiceover", sfx: "assets/3_audio/sfx", music: "assets/3_audio/music",
  app: "assets/_app", vendor: "assets/_app/vendor", appFonts: "assets/_app/fonts", psd: "assets/_app/psd",
};
/** The app's own copies (never listed as the user's files, never counted as sources): the hidden folder, and the older places. */
export const APP_OWN = /^assets\/(_app|vendor|psd|fonts\/(kit|bundled|google))\//;

const posix = (p) => p.split(sep).join("/");

/** The sounds the app placed itself (Freesound, HF's bundled set: .moworks/sfx.json), as project paths; the user's own sounds are not. */
export function appSounds(dir) {
  try {
    const st = JSON.parse(readFileSync(join(dir, ".moworks", "sfx.json"), "utf8"));
    // a library sound's variants and the ambience loops are the app's copies too
    return new Set(Object.values(st.sounds ?? {}).filter((s) => s?.file && s.source !== "owner").flatMap((s) => [s.file, ...(s.variants ?? []).map((v) => v.file)]));
  } catch { return new Set(); }
}
const MEDIA = /\.(png|jpe?g|webp|gif|avif|bmp|tiff?|heic|svg|exr|mp4|mov|webm|m4v|mkv|avi|mp3|wav|m4a|flac|ogg|aac|opus|ttf|otf|woff2?|psd|psb|pptx?|key|pdf|ai|eps|sketch|fig|xd|indd|docx?)$/i;
const IN_PLACE = /^assets\/(_app\/|1_design\/|2_footage\/|3_audio\/(voiceover|sfx|music)\/)/;
// older folder → new folder, the rest of the path kept (most specific first)
const RULES = [
  [/^assets\/vendor\//, "assets/_app/vendor/"],
  [/^assets\/psd\//, "assets/_app/psd/"],
  [/^assets\/fonts\/(kit|bundled|google)\//, "assets/_app/fonts/$1/"],
  [/^assets\/fonts\/local\//, "assets/1_design/fonts/"],
  [/^assets\/(4_fonts|fonts)\//, "assets/1_design/fonts/"],
  [/^assets\/(5_design|design)\//, "assets/1_design/"],
  [/^sources\//, "assets/1_design/"],
  [/^assets\/(1_images\/logos|1_images|images|logos)\//, "assets/1_design/images/"],
  [/^assets\/2_footage\/sequences\//, "assets/2_footage/"],
  [/^assets\/(video|footage)\//, "assets/2_footage/"],
  [/^assets\/voiceover\//, "assets/3_audio/voiceover/"],
  [/^assets\/sfx\//, "assets/3_audio/sfx/"],
];

/**
 * Where a file of an older layout goes now, or null when it stays. `classify(name)` is the project service's classifyAsset (the folder a
 * new file of that name takes); it sorts the loose files and the old audio/ folder. A numbered picture sequence goes to 2_footage/<name>/.
 */
export function newPathOf(rel, { classify, sequenceOf = () => null } = {}) {
  const p = posix(String(rel ?? ""));
  if (!/^(assets|sources)\//.test(p)) return null;
  const name = basename(p);
  let to = null;
  for (const [rx, dst] of RULES) if (rx.test(p)) { to = p.replace(rx, dst); break; }
  if (!to && IN_PLACE.test(p)) return null;
  if (!to) {          // a loose file, the old audio/ or another folder: by its kind, as a new file of that name would go
    if (!MEDIA.test(name) || !classify) return null;
    const c = classify(name);
    to = `assets/${c.folder}/${name}`;
  }
  // a picture of a numbered sequence goes with its footage
  const seq = /^assets\/1_design\/images\//.test(to) && /\.(png|jpe?g|webp|tiff?|exr)$/i.test(name) ? sequenceOf(name) : null;
  if (seq && classify) to = `assets/${classify(name).folder}/${name}`;
  return to === p ? null : to;
}

const textFiles = (dir) => {
  const out = [];
  const add = (rel) => { if (existsSync(join(dir, ...rel.split("/")))) out.push(rel); };
  add("index.html");
  const walk = (rel, rx) => {
    const d = join(dir, ...rel.split("/"));
    if (!existsSync(d)) return;
    for (const n of readdirSync(d)) {
      const r = `${rel}/${n}`, f = join(d, n);
      // lstat: a link (.moworks/rules, an engine) is the shared stage of every film, never rewritten from one
      let s; try { s = lstatSync(f); } catch { continue; }
      if (s.isSymbolicLink()) continue;
      if (s.isDirectory()) { if (!/^(cache|\.git|node_modules)$/.test(n)) walk(r, rx); } else if (rx.test(n)) out.push(r);
    }
  };
  walk("compositions", /\.(html|css|js|json|md)$/i);
  walk("boards", /\.(html|css|js|json|md)$/i);
  walk(".moworks", /\.(json|md)$/i);
  walk("docs", /\.(json|md)$/i);
  for (const n of readdirSync(dir)) if (/\.(md|json)$/i.test(n) && statSync(join(dir, n)).isFile()) out.push(n);
  return [...new Set(out)];
};
const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Point every text file of the project (the film, the boards, the documents, the app's records) from the old paths to the new ones. */
export function rewritePaths(dir, pairs) {
  const map = new Map();
  for (const [from, to] of pairs) { map.set(from, to); if (encodeURI(from) !== from) map.set(encodeURI(from), encodeURI(to)); }          // a path written URL-encoded (Logo%20tr%E1%BA%AFng.png) follows too
  for (const k of [...map.keys()]) if (map.get(k) === k) map.delete(k);
  if (!map.size) return [];
  const rx = new RegExp([...map.keys()].sort((a, b) => b.length - a.length).map(escRx).join("|"), "g");
  const changed = [];
  for (const rel of textFiles(dir)) {
    const f = join(dir, ...rel.split("/"));
    const text = readFileSync(f, "utf8");
    const next = text.replace(rx, (m) => map.get(m) ?? m);
    if (next !== text) { writeFileSync(f + ".tmp", next); renameSync(f + ".tmp", f); changed.push(rel); }
  }
  return changed;
}

/** Hide the app's own folders in Explorer (Windows' hidden attribute; HyperFrames still reads them): assets/_app, the app's .moworks and
 *  HyperFrames' own .hyperframes at the root (git hides .git itself). Folders only: a hidden file cannot be rewritten in place on Windows
 *  (EPERM), and .gitignore is rewritten. */
export function hideAppFolder(dir) {
  if (process.platform !== "win32") return;
  for (const rel of [A.app, ".moworks", ".hyperframes"]) {
    const d = join(dir, ...rel.split("/"));
    if (existsSync(d)) spawnSync("attrib", ["+h", d], { windowsHide: true });
  }
}

/** The raw stills of the QC rounds (.moworks/qc/R<n>/raw: HyperFrames' frames the three sheets are tiled from, about 60 MB a round)
 *  of every round but the newest `keep`: nobody reads them once the sheets are made (Claude and the Review dialog read the sheets; the
 *  newest round keeps its stills for a close look). The sheets stay. Returns the rounds pruned. */
export function pruneQcRaw(dir, { keep = 1 } = {}) {
  const base = join(dir, ".moworks", "qc");
  let rounds = [];
  try { rounds = readdirSync(base).filter((x) => /^R\d+$/.test(x)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))); } catch { return []; }
  const old = rounds.slice(0, Math.max(0, rounds.length - keep)).filter((r) => existsSync(join(base, r, "raw")));
  for (const r of old) { try { rmSync(join(base, r, "raw"), { recursive: true, force: true }); } catch { /* in use: the next time */ } }
  return old;
}

/** The music options to listen to (made again on demand, out of git) from audio/music-options/ into .moworks/cache/music-options/, with
 *  the records that name them: [[from, to]] of the folders moved. */
export function moveMusicOptions(dir) {
  const from = join(dir, "audio", "music-options");
  if (!existsSync(from)) return { moved: [], failed: [], changed: [] };
  const to = join(dir, ".moworks", "cache", "music-options");
  const moved = [], failed = [];
  mkdirSync(to, { recursive: true });
  for (const n of readdirSync(from)) {
    const t = join(to, n);
    if (existsSync(t)) { failed.push({ path: `audio/music-options/${n}`, error: "EEXIST" }); continue; }
    try { renameSync(join(from, n), t); moved.push([`audio/music-options/${n}/`, `.moworks/cache/music-options/${n}/`]); }
    catch (e) { failed.push({ path: `audio/music-options/${n}`, error: e.code ?? e.message }); }
  }
  const changed = moved.length ? rewritePaths(dir, moved) : [];
  for (const d of [from, join(dir, "audio")]) { try { if (!readdirSync(d).length) rmdirSync(d); } catch { /* in use or not empty */ } }
  return { moved, failed, changed };
}

const filesUnder = (dir, top) => {
  const out = [];
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { if (/^(desktop\.ini|Thumbs\.db)$/i.test(n)) continue; const f = join(d, n); let s; try { s = statSync(f); } catch { continue; }
    if (s.isDirectory()) walk(f); else out.push(posix(relative(dir, f))); } };
  walk(join(dir, top));
  return out;
};

/**
 * Move a project's files into the layout above: { moved: [[from, to]], failed: [{ path, error }], changed: [text files rewritten],
 * docs: [[from, to]] (the app's documents moved into docs/, docs.mjs) }.
 * Files are renamed (never copied and deleted); a name already taken at the destination gets " (2)". Then the paths are rewritten
 * (index.html, compositions/, boards/, the documents and the app's records, file by file and folder by folder, for a sequence loaded
 * by name), HyperFrames' beat files follow their music, the emptied old folders go, and _app/ is hidden.
 */
export function migrateLayout(dir, { classify, sequenceOf } = {}) {
  const moved = [], failed = [];
  const files = [...filesUnder(dir, "assets"), ...filesUnder(dir, "sources")];
  for (const rel of files) {
    if (/\.(tmp|part)$/i.test(rel)) continue;
    let to = newPathOf(rel, { classify, sequenceOf });
    if (!to) continue;
    const ext = extname(to), base = to.slice(0, to.length - ext.length);
    for (let i = 2; existsSync(join(dir, ...to.split("/"))); i++) to = `${base} (${i})${ext}`;
    try {
      mkdirSync(join(dir, ...dirname(to).split("/")), { recursive: true });
      renameSync(join(dir, ...rel.split("/")), join(dir, ...to.split("/")));
      moved.push([rel, to]);
    } catch (e) { failed.push({ path: rel, error: e.code ?? e.message }); }
  }
  // a folder whose files all moved, under their names, to one new folder (and nothing is left in it): its path moves too, for a sequence a
  // script loads by name. Never assets/ or sources/ themselves, never a folder whose files went to different places.
  const dirs = new Map();
  for (const [from, to] of moved) {
    const k = dirname(from), v = dirname(to);
    const e = dirs.get(k) ?? { to: v, ok: true };
    if (e.to !== v || basename(from) !== basename(to)) e.ok = false;
    dirs.set(k, e);
  }
  const left = (k) => existsSync(join(dir, ...k.split("/"))) && filesUnder(dir, k).length > 0;
  const folderPairs = [...dirs].filter(([k, e]) => e.ok && !["assets", "sources", "."].includes(k)
    && moved.every(([f, t]) => !f.startsWith(`${k}/`) || t === `${e.to}/${f.slice(k.length + 1)}`)
    && !failed.some((f) => f.path.startsWith(`${k}/`)) && !left(k)).map(([k, e]) => [`${k}/`, `${e.to}/`]);
  const changed = moved.length ? rewritePaths(dir, [...moved, ...folderPairs]) : [];
  // HyperFrames writes a track's beats to beats/<its path>.json
  for (const [from, to] of moved) {
    const b = join(dir, "beats", ...`${from}.json`.split("/"));
    if (!existsSync(b)) continue;
    const nb = join(dir, "beats", ...`${to}.json`.split("/"));
    try { mkdirSync(dirname(nb), { recursive: true }); renameSync(b, nb); } catch (e) { failed.push({ path: posix(relative(dir, b)), error: e.code ?? e.message }); }
  }
  const keep = (d) => [A.design, A.images, A.fonts, A.footage, "assets/3_audio", A.voiceover, A.sfx, A.music, A.app, "assets"].some((x) => join(dir, ...x.split("/")) === d);
  for (const top of ["assets", "sources", "beats"]) pruneEmpty(join(dir, top), keep);
  const music = moveMusicOptions(dir);
  pruneQcRaw(dir);
  hideAppFolder(dir);
  const d = moveDocs(dir);
  return { moved, failed: [...failed, ...music.failed, ...d.failed], changed: [...changed, ...music.changed], docs: d.moved };
}
function pruneEmpty(d, keep) {
  if (!existsSync(d) || !statSync(d).isDirectory()) return;
  for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) pruneEmpty(f, keep); }
  if (!keep(d) && readdirSync(d).length === 0) { try { rmdirSync(d); } catch { /* in use */ } }
}

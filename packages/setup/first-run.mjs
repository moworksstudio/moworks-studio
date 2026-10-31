// First run on a new computer: everything the app needs beyond the repository, in one list with sizes, and
// one Install ("Download all" before 30/10). What came with the app in bundle/ is copied, not downloaded: the offline fonts and libraries
// (offline-assets), HyperFrames' skills and registry (read from bundle/hf in place), the style sources (read from bundle/styles in
// place), the app's characters (read from bundle/library/characters in place) and the built library stores (copied into the work folder's library, one folder per pin, checked at every start). The rest is downloaded at the pinned versions:
// HyperFrames' runtime and its Chrome, the Python components, the speech-to-text model, and any style source that is not bundled (a thin
// git checkout at the pinned commit: no history, no demo films, no audio).
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { APP_ROOT, checkFfmpeg, expandEnv, loadPins, paths, setLocalPins, sourceHead } from "../version-manager/index.mjs";
import { defaultLocation, workRoot } from "../project-service/index.mjs";
import * as assets from "../offline-assets/index.mjs";
import { fetchSkills, hfSources, verifySkills } from "./hf-skills.mjs";
import * as py from "./python.mjs";
import * as winget from "./winget.mjs";
import { installRuntime, runtimeReady } from "../hf-setup/index.mjs";
import { migrateShippedCopies } from "../character-kit/index.mjs";
import * as cuda from "../voice/cuda.mjs";
import * as asr from "../voice/asr.mjs";
import * as blocks from "../blocks-library/index.mjs";
import * as looks from "../looks-library/index.mjs";
import * as vocab from "../vocab-library/index.mjs";
import * as intake from "../intake-library/index.mjs";

const MB = 1048576;
const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
const bundleDir = (root) => join(root, "bundle");
// a pinned path is "{app}/bundle/..." with forward slashes after the fill: compared resolved
const inBundle = (p, root) => resolve(String(p ?? "")).toLowerCase().startsWith(resolve(bundleDir(root)).toLowerCase() + sep);

// ---- the style sources: one per author, pinned in config/pins.json (root, repo, commit); sparse patterns = what the app reads at run time
export const STYLE_SOURCES = {
  lemo: { title: "Lemo-Opuscar (Lemomo)", folder: "lemo-opuscar", mb: 100, patterns: ["/styles/", "/core/", "/styleboard/", "/*.md", "/LICENSE"] },
  mgStyles: { title: "mg-styles-15 (Vincentwei1021)", folder: "mg-styles-15", mb: 55,
    patterns: ["/prompts/", "/lib/", "/demos/", "/assets/", "/docs/readme/films/", "/LICENSE", "/README.md", "/rubric.md", "/template.md", "!/lib/audio/samples/", "!*.wav", "!*.flac", "!*.mp3", "!*.mp4", "!*.mov", "!*.ply", "!*.hdr"] },
  anidoodle: { title: "anidoodle (Alex Greenshpun)", folder: "anidoodle", mb: 8, patterns: ["/skills/anidoodle/", "/LICENSE", "/NOTICE", "/README.md"] },
  characterKit: { title: "ClaudeAnimationBase (John Heibel)", folder: "ClaudeAnimationBase", mb: 0.2,
    patterns: ["/src/core.js", "/src/timeline.js", "/src/clawd.js", "/ANIMATION_GUIDE.md", "/LICENSE", "/README.md", "/package.json", "/package-lock.json"] },
  // What If: the engine and the two worked episodes, the skill, references and scripts; never the author's sound
  whatIf: { title: "What If animation (FreshStack)", folder: "what-if-animation", mb: 0.5,
    patterns: ["/studio/src/", "/studio/package.json", "/studio/tsconfig.json", "/references/", "/scripts/", "/SKILL.md", "/README.md", "/LICENSE"] },
};
const pinOf = (key, root) => loadPins(root)[key];
/** Where a style source is and whether it is at its pinned commit: { key, title, root, from: clone | bundle | missing, intact }. */
export function styleSource(key, root = APP_ROOT) {
  const p = pinOf(key, root), s = STYLE_SOURCES[key];
  if (!p) return { key, title: s.title, root: null, from: "missing", intact: false };
  const bundled = join(bundleDir(root), "styles", s.folder);
  const at = (d) => d && existsSync(d) && sourceHead(d) === p.commit;
  const r = String(p.root ?? "");
  const from = at(r) ? (inBundle(r, root) ? "bundle" : "clone") : at(bundled) ? "bundle" : "missing";
  return { key, title: s.title, root: from === "missing" ? null : from === "clone" ? r : bundled, from, intact: from !== "missing", commit: p.commit, repo: p.repo };
}
/** Point a missing source at the copy bundled with the app (this computer's local pins). */
function useBundled(key, root) {
  const s = styleSource(key, root);
  if (s.from === "bundle" && resolve(String(pinOf(key, root).root ?? "")) !== resolve(s.root)) setLocalPins({ [`${key}.root`]: s.root }, root);
}
/** Fetch one style source at its pinned commit into <work>/vendor/<folder> (thin: blobs on demand, sparse, no history), then point the
 *  local pins at it. Asynchronous: the clone takes minutes in the server's own process (a job), which keeps answering meanwhile (T27-3). */
export async function fetchStyleSource(key, { root = APP_ROOT, onLine = () => {} } = {}) {
  const p = pinOf(key, root), s = STYLE_SOURCES[key];
  if (!p || !s) throw Object.assign(new Error(`No style source "${key}"`), { code: "NOT_FOUND" });
  const dir = join(workRoot(root), "vendor", s.folder), git = (args, cwd = dir) => new Promise((ok, no) =>
    execFile("git", ["-c", "core.autocrlf=false", "-c", "core.longpaths=true", ...args], { cwd, encoding: "utf8", windowsHide: true, timeout: 30 * 60 * 1000, maxBuffer: 64 << 20 },
      (e, stdout, stderr) => (e ? no(new Error(`git ${args[0]}: ${(stderr || stdout || "").trim().slice(-300)}`)) : ok(stdout))));
  if (!existsSync(join(dir, ".git"))) {
    mkdirSync(join(dir, ".."), { recursive: true });
    onLine(`Fetching ${s.title} at ${p.commit.slice(0, 7)}`);
    await git(["clone", "--filter=blob:none", "--no-checkout", `https://github.com/${p.repo}.git`, dir], join(dir, ".."));
  } else await git(["fetch", "--filter=blob:none", "origin", p.commit]);
  await git(["sparse-checkout", "set", "--no-cone", ...s.patterns]);
  await git(["checkout", "--detach", p.commit]);
  if (sourceHead(dir) !== p.commit) throw new Error(`${s.title}: the checkout is not at ${p.commit}`);
  setLocalPins({ [`${key}.root`]: dir }, root);
  return styleSource(key, root);
}

// ---- the library: the built stores that came with the app, copied into the work folder's library
// Each store's folder is named for the pins it was built at (blocks, looks: hf-<version>-<commit>; vocab: mp-<commit>-hf-<commit>), and the
// app reads only the folder for this computer's pins, so a new pin is a new folder. Per kind: the store for the current pins that this
// computer built (or changed) stays; else the bundle's copy of it is taken (again when a newer app brings a changed copy under the same
// name while this computer's copy is still the one it took); current.json points at the store in use. A store at another
// pin is left where it is and never read. A kind without a pinned name (intake) takes the name the bundle ships; a new name replaces the
// copy the app took under the old one (dropReplacedIntake).
const STORES = { blocks: blocks.storeName, intake: () => null, looks: looks.storeName, vocab: vocab.storeName };          // the Moworks Motion kit's "motion" store was removed
const wantStore = (s, root, shipped) => { try { return STORES[s](root) ?? shipped; } catch { return shipped; } };
/** A short hash of a store's catalog and manifest: which copy of a store a folder holds. */
const stampOf = (dir) => { const h = createHash("sha256"); for (const f of ["catalog.json", "manifest.json"]) { try { h.update(readFileSync(join(dir, f))); } catch { /* none */ } h.update("\0"); } return h.digest("hex").slice(0, 16); };
export function libraryState(root = APP_ROOT) {
  const lib = join(workRoot(root), "library"), b = join(bundleDir(root), "library");
  const have = (s) => { const d = wantStore(s, root, readJson(join(lib, s, "current.json"), null)?.dir ?? readJson(join(b, s, "current.json"), null)?.dir); return !!d && existsSync(join(lib, s, d, "catalog.json")); };
  const names = Object.keys(STORES);
  return { stores: Object.fromEntries(names.map((s) => [s, have(s)])), ready: names.every(have), bundled: existsSync(b) };
}
/** A file of the folder written after the time (a change or an addition since the app took it). */
const writtenSince = (dir, t) => readdirSync(dir, { recursive: true }).some((n) => { const st = statSync(join(dir, n)); return st.isFile() && st.mtimeMs > t; });
/** The intake store came under a new name: the copy the app took under an older one goes while it is still exactly that copy (its stamp,
 *  and no file written since it was taken). One this computer built or changed stays where it is, never read. Returns the names removed. */
function dropReplacedIntake(lib, takenAt) {
  const base = join(lib, "intake"), file = join(base, "from-bundle.json"), taken = readJson(file, {}), cur = readJson(join(base, "current.json"), null)?.dir;
  const old = Object.keys(taken).filter((n) => n !== cur && /^intake-\d+$/.test(n));
  if (!old.length || !cur || !existsSync(join(base, cur, "catalog.json"))) return [];
  const removed = [];
  for (const n of old) {
    const dir = join(base, n);
    if (existsSync(join(dir, "catalog.json")) && !lstatSync(dir).isSymbolicLink() && stampOf(dir) === taken[n] && !writtenSince(dir, takenAt)) {
      rmSync(dir, { recursive: true, force: true });
      removed.push(n);
    }
    delete taken[n];
  }
  writeFileSync(file, JSON.stringify(taken) + "\n");
  return removed;
}
export function libraryFromBundle(root = APP_ROOT) {
  const b = join(bundleDir(root), "library"), lib = join(workRoot(root), "library"), copied = [];
  if (!existsSync(b)) return { copied };
  let intakeTakenAt = 0;          // when the intake store was last taken, before this start takes one
  try { intakeTakenAt = statSync(join(lib, "intake", "from-bundle.json")).mtimeMs; } catch { /* never taken here */ }
  for (const s of Object.keys(STORES)) {
    const shipped = readJson(join(b, s, "current.json"), null)?.dir, want = wantStore(s, root, shipped);
    if (!want) continue;
    const mine = join(lib, s, want), from = join(b, s, want), takenFile = join(lib, s, "from-bundle.json"), taken = readJson(takenFile, {});
    const inBundle = existsSync(join(from, "catalog.json"));
    if (existsSync(join(mine, "catalog.json"))) {
      // this computer's own (built here, or changed since it was taken) stays; a copy taken from an older bundle is taken again
      const stale = inBundle && taken[want] && stampOf(mine) === taken[want] && stampOf(from) !== taken[want];
      if (!stale) { if (readJson(join(lib, s, "current.json"), null)?.dir !== want) writeFileSync(join(lib, s, "current.json"), JSON.stringify({ dir: want }) + "\n"); continue; }
    } else if (!inBundle) continue;          // the bundle has it at another pin: the library's own import builds it
    cpSync(from, mine, { recursive: true, force: true });
    writeFileSync(takenFile, JSON.stringify({ ...taken, [want]: stampOf(mine) }) + "\n");
    if (s === "intake") { try { intake.dropDeleted(mine, root); } catch { /* the user can delete it again */ } }          // what the user deleted stays deleted in the new copy
    writeFileSync(join(lib, s, "current.json"), JSON.stringify({ dir: want }) + "\n");
    copied.push(s);
  }
  try { dropReplacedIntake(lib, intakeTakenAt); } catch { /* tried again at the next start */ }
  // the vocabulary's previews sit beside its store, by item: the bundle's are taken for items that have none here as they are now
  try { if (existsSync(join(b, "vocab", "previews")) && vocab.adoptPreviews(join(b, "vocab", "previews"), root)) copied.push("vocab previews"); } catch { /* no store yet */ }
  // what is there stays: the gallery's tiles (made again here when a still is newer), anidoodle's cards and previews and the Lemo fonts'
  // Vietnamese check (a folder per pinned commit: a new pin is a new folder). Never the characters: the app's are read from bundle/ in place,
  // and library/characters holds only the user's
  for (const d of ["thumbs", "anidoodle", "lemo"]) if (existsSync(join(b, d))) {
    cpSync(join(b, d), join(lib, d), { recursive: true, force: false, errorOnExist: false });
    copied.push(d);
  }
  // the copies of the app's characters that earlier versions took, gone when they are only the app's files; never a reason to stop
  let characters = null;
  try { characters = migrateShippedCopies(root); } catch { /* tried again at the next start */ }
  return { copied, characters };
}

// ---- what each installed item takes on the disk (Settings › System): measured once per folder
// in the first-run worker and kept in the state folder for a day (a folder of node_modules takes a second or two to walk)
const sizesFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "disk-sizes.json");
function walkBytes(dir) {
  let n = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries = []; try { entries = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const f = join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) stack.push(f); else { try { n += lstatSync(f).size; } catch { /* gone meanwhile */ } }
    }
  }
  return n;
}
/** MB on the disk of the given folders (those that exist), from the day's measure when there is one; null when none exists. */
export function diskMb(dirs, root = APP_ROOT, { maxAgeMs = 24 * 3600 * 1000 } = {}) {
  const have = [...new Set(dirs.filter(Boolean))].filter((d) => existsSync(d));
  if (!have.length) return null;
  const memo = readJson(sizesFile(root), {}), now = Date.now();
  let bytes = 0, changed = false;
  for (const d of have) {
    const m = memo[d];
    if (m && now - m.at < maxAgeMs) { bytes += m.bytes; continue; }
    const b = walkBytes(d); bytes += b; memo[d] = { bytes: b, at: now }; changed = true;
  }
  if (changed) { try { mkdirSync(dirname(sizesFile(root)), { recursive: true }); writeFileSync(sizesFile(root), JSON.stringify(memo)); } catch { /* measured again next time */ } }
  return Math.round(bytes / MB);
}
/** The folders an item lives in (none for the work folder: it holds the projects). */
function itemDirs(id, root) {
  const pins = loadPins(root), v = pins.hyperframes.default, chrome = pins.hyperframes.versions?.[v]?.chromium;
  if (id === "hf-runtime") return [join(paths(root).hf, v), chrome ? join(paths(root).chromium, chrome) : null];
  if (id === "hf-skills") { const h = hfSources(root); return [h.skillsRoot, h.registryRoot]; }
  if (id === "assets") return [join(root, "runtime", "fonts"), join(root, "runtime", "vendor")];
  if (id === "library") return [join(workRoot(root), "library")];
  if (id.startsWith("style-")) return [styleSource(id.slice(6), root).root];
  if (id === "python") return [py.pyLibs(root)];
  if (id === "speech") { const m = speechModel(root); return m ? [m.path] : []; }
  if (id === cuda.PACK.id) return [cuda.packDir(root)];
  if (id === "ffmpeg") return [dirname(expandEnv(pins.ffmpeg.dir))];
  return [];
}

// ---- the list and "Download all"
/** The speech-to-text model the app transcribes voice-overs with (the default one): its card, null when the catalog has none. */
function speechModel(root) {
  try { const all = asr.models(root); return all.find((m) => m.isDefault) ?? all[0] ?? null; } catch { return null; }
}
const ENGINE_MB = 70;          // faster-whisper with CTranslate2 (config/asr-models.json runtime.size)

/** Every item of the first-run screen: { id, title, what, mb, from: bundle | download | yours, ready, optional, action }. `sizes`: each
 *  ready item's diskMb too (the worker measures it; null for the work folder or a folder not found). */
export function firstRunItems(root = APP_ROOT, { sizes = false } = {}) {
  const items = [];
  // the one folder the user picks: where films go (Settings › General's own setting), the app's projects folder until they pick another; the
  // library, the models and the app's data stay beside the app (owner 30/10), so it always has an answer and never holds Set up open
  items.push({ id: "work", title: "Projects folder", what: "Choose the folder that stores your projects.", mb: 0, from: "yours", ready: true, path: defaultLocation(root) });
  const rt = runtimeReady(root);
  items.push({ id: "hf-runtime", title: "HyperFrames and its Chrome", version: rt.version, what: "The engine that builds and renders the films", mb: rt.installed ? (rt.chromium ? 0 : 270) : 546, from: "download", ready: rt.installed && !!rt.chromium });
  const sk = verifySkills(root, { fresh: true }), skFrom = inBundle(hfSources(root).skillsRoot, root) ? "bundle" : "download";
  items.push({ id: "hf-skills", title: "HyperFrames skills and registry", what: "Claude's rules for every film style, the Blocks and Brand Kits", mb: sk.ok ? 0 : 120, from: skFrom, ready: sk.ok });
  const a = assets.status(root);
  items.push({ id: "assets", title: "Fonts with Vietnamese letters, GSAP, three.js and the code libraries", what: "Films render offline", mb: a.ready ? 0 : Math.round(a.bytesMissing / MB),
    from: existsSync(join(bundleDir(root), "runtime")) ? "bundle" : "download", ready: a.ready });
  const lib = libraryState(root);
  items.push({ id: "library", title: "The library (Blocks, Motion, Brand Kits, the gallery's tiles)", what: "Everything the Motion Library, Brand Kits and Film Styles show", mb: 0, from: lib.bundled ? "bundle" : "download", ready: lib.ready });
  for (const key of Object.keys(STYLE_SOURCES)) {
    const s = styleSource(key, root);
    items.push({ id: `style-${key}`, title: s.title, what: "A style author's prompts, rules and demo code at the pinned commit", mb: s.intact ? 0 : STYLE_SOURCES[key].mb, from: s.from === "missing" ? "download" : s.from, ready: s.intact });
  }
  // the libraries go into the app's own folder with pip, so Python itself must be there first: Install gets it with winget (for this
  // user); without winget the item is the user's step, with the line to copy
  const p = py.status(root), pyMb = p.components.filter((c) => !c.ok).reduce((s, c) => s + (c.mb ?? 0), 0);
  items.push(p.python ? { id: "python", title: "Python components", what: "Export to After Effects, PSD and PPTX reading", mb: pyMb, from: "download", ready: p.ready }
    : winget.hasWinget() ? { id: "python", title: "Python components", what: "Python 3.12 and the libraries the app's scripts use", mb: winget.MB.python + pyMb, from: "download", ready: false }
    : { id: "python", title: "Python 3.12", what: "Install it once, then restart the app",
      command: "winget install -e --id Python.Python.3.12 --scope user", mb: 0, from: "yours", ready: false });
  // the speech-to-text model: every voice-over is turned into timed words with it, so it is part of the install, not a choice
  const sm = speechModel(root);
  if (sm) items.push({ id: "speech", title: "Speech-to-text model", what: "Turns the voice-over into timed words", from: "download",
    mb: (sm.installed ? 0 : Math.round(sm.size / MB)) + (sm.runtime.ok ? 0 : ENGINE_MB), ready: sm.installed && sm.runtime.ok,
    author: sm.author, licence: sm.licence, source: sm.source, label: sm.label });
  let ff = false; try { checkFfmpeg(root); ff = true; } catch { /* not found */ }
  // Whisper on the graphics card, offered only on a computer with an NVIDIA card strong enough; optional: never in "Download all"
  // (the user says yes to it on its own), and the app runs without it (Whisper on the CPU)
  const g = cuda.gpuState(root);
  if (g.offer) items.push({ id: cuda.PACK.id, title: cuda.PACK.title, what: `Transcribes the voice-over on ${g.gpu.name} instead of the CPU`, version: cuda.PACK.version, mb: g.pack.installed ? 0 : cuda.PACK.mb,
    from: "download", ready: g.pack.installed, optional: true, source: cuda.PACK.source, licence: cuda.PACK.licence, author: cuda.PACK.author });
  // FFmpeg: Install gets it with winget when it is missing; without winget it is the user's step, with the line to copy
  const ffv = loadPins(root).ffmpeg.version;
  items.push(ff ? { id: "ffmpeg", title: "FFmpeg", what: "Found on this computer", version: ffv, mb: 0, from: "yours", ready: true }
    : winget.hasWinget() ? { id: "ffmpeg", title: "FFmpeg", what: "Sound, previews and the final video", version: ffv, mb: winget.MB.ffmpeg, from: "download", ready: false }
    : { id: "ffmpeg", title: "FFmpeg", what: "Install it yourself once, then restart the app", command: `winget install Gyan.FFmpeg --version ${ffv}`, version: ffv, mb: 0, from: "yours", ready: false });
  if (sizes) for (const i of items) i.diskMb = i.ready ? diskMb(itemDirs(i.id, root), root) : null;
  return { items, mb: items.filter((i) => !i.ready && i.from !== "yours" && !i.optional).reduce((s, i) => s + i.mb, 0), ready: items.every((i) => i.ready || i.optional) };
}
/** firstRunItems off the server's thread (worker.mjs); with each ready item's diskMb unless `sizes: false`. */
export async function firstRunItemsAsync(root = APP_ROOT, { sizes = true } = {}) {
  const { Worker } = await import("node:worker_threads");
  return new Promise((ok, no) => {
    // no inherited flags: `--input-type` (a `node --input-type=module -e` script) is refused for its file, and a test runner's own
    // process flags (--use-largepages, --node-snapshot…) are refused for any worker (ERR_WORKER_INVALID_EXEC_ARGV)
    const w = new Worker(new URL("./worker.mjs", import.meta.url), { workerData: { root, sizes }, env: process.env, execArgv: [] });
    w.once("message", (m) => (m.ok ? ok(m.value) : no(new Error(m.message))));
    w.once("error", no);
    w.once("exit", (code) => { if (code !== 0) no(new Error(`The first-run checks stopped (${code})`)); });
  });
}
/** Get every missing item (or only `ids`), in order. onProgress({ id, stage }). Returns the list again. */
export async function firstRunAll({ root = APP_ROOT, ids = null, onProgress = () => {}, signal = null } = {}) {
  const want = (id) => !ids || ids.includes(id), done = [];          // an optional item only when asked by its id
  // one progress for the whole run (0-100): each missing item weighs its download (a copy from the bundle weighs a little)
  const before = await firstRunItemsAsync(root, { sizes: false }).catch(() => ({ items: [] }));
  const weight = Object.fromEntries(before.items.filter((i) => !i.ready && i.from !== "yours" && want(i.id) && (!i.optional || ids?.includes(i.id))).map((i) => [i.id, Math.max(i.mb, 5)]));
  const total = Object.values(weight).reduce((a, b) => a + b, 0) || 1;
  let passed = 0;
  const pct = (id, part = 0) => Math.min(99, Math.floor((100 * (passed + (weight[id] ?? 0) * part)) / total));
  // the progress lines show no folder of this computer ("into D:\…\runtime\hf\0.8.214" reads "into 0.8.214"): the rule of Settings' checks
  const noPaths = (s) => String(s ?? "").replace(/[A-Za-z]:[\\/][^,;()\n]*?(?=\s*(?:$|[,;()]|\.(?:\s|$)))/g, (m) => m.replace(/[\\/]+$/, "").split(/[\\/]/).pop());
  const report = onProgress; onProgress = (x) => report({ progress: pct(x.id, x.part ?? 0), ...x, stage: noPaths(x.stage) });
  const step = async (id, fn) => { if (!want(id)) return; if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" }); onProgress({ id, stage: "starting" }); await fn(); passed += weight[id] ?? 0; done.push(id); };
  await step("library", async () => libraryFromBundle(root));
  for (const key of Object.keys(STYLE_SOURCES)) await step(`style-${key}`, async () => {
    useBundled(key, root);
    if (!styleSource(key, root).intact) await fetchStyleSource(key, { root, onLine: (l) => onProgress({ id: `style-${key}`, stage: l }) });
  });
  await step("assets", async () => { if (!assets.status(root).ready) await assets.install({ root, signal, onProgress: (x) => onProgress({ id: "assets", stage: `${x.done} of ${x.total}` }) }); });
  await step("hf-skills", async () => { if (!verifySkills(root, { fresh: true }).ok) await fetchSkills(root, { onLine: (l) => onProgress({ id: "hf-skills", stage: l }) }); });
  await step("hf-runtime", async () => installRuntime({ root, signal, onLine: (l) => onProgress({ id: "hf-runtime", stage: l }) }));
  // FFmpeg and Python 3.12 with winget when missing (for this user, no administrator); without winget both stay the user's steps (the
  // screen shows their lines) and the rest of the run still counts as done
  const ffOk = () => { try { checkFfmpeg(root); return true; } catch { return false; } };
  await step("ffmpeg", async () => {
    if (ffOk() || !winget.hasWinget()) return;
    const v = loadPins(root).ffmpeg.version;
    await winget.install(winget.PACKAGES.ffmpeg(v), { signal, onLine: (l) => onProgress({ id: "ffmpeg", stage: l }) });
    if (!ffOk()) throw Object.assign(new Error(`FFmpeg did not install with winget. Install it yourself (winget install Gyan.FFmpeg --version ${v}), then restart the app`), { code: "FFMPEG" });
  });
  await step("python", async () => {
    if (!py.pythonExe(root) && winget.hasWinget()) {
      await winget.install(winget.PACKAGES.python(), { signal, onLine: (l) => onProgress({ id: "python", stage: l }) });
      if (!py.pythonExe(root)) throw Object.assign(new Error("Python 3.12 did not install with winget. Install it yourself (winget install -e --id Python.Python.3.12 --scope user), then restart the app"), { code: "NO_PYTHON" });
    }
    const s = await py.statusAsync(root);
    if (s.python && !s.ready) await py.install(root, { signal, onLine: (l) => onProgress({ id: "python", stage: l.slice(0, 120) }) });
  });
  // the speech-to-text model's files, then its engine into the Python components (without Python only the files: Python is the user's step)
  await step("speech", async () => {
    const m = speechModel(root);
    if (!m || (m.installed && m.runtime.ok)) return;
    try { await asr.install(m.id, { root, signal, onProgress: ({ done: got, total: all }) => onProgress({ id: "speech", stage: "downloading", part: all ? got / all : 0 }) }); }
    catch (e) { if (e.code !== "NO_PYTHON") throw e; }
  });
  if (ids?.includes(cuda.PACK.id) && cuda.eligible(cuda.detectGpu()))
    await step(cuda.PACK.id, async () => { if (!cuda.packStatus(root).installed) await cuda.install(root, { signal, onLine: (l) => onProgress({ id: cuda.PACK.id, stage: l }) }); });
  // the list again off the server's thread (its checks, Python's imports among them, took seconds there)
  return { done, ...(await firstRunItemsAsync(root, { sizes: false })) };
}
export const bundleManifest = (root = APP_ROOT) => readJson(join(bundleDir(root), "MANIFEST.json"), null);

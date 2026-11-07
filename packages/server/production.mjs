// Production routes: the voice-over's files (upload, its sample and its audio; its other routes: voice.mjs), service keys, speech-to-text
// models, the film's music placed, Export Video, Tech checks and the jobs (Export to AE: ae.mjs). Long work runs as background jobs (jobs.mjs); nothing here
// blocks the server's event loop on HyperFrames, FFmpeg or After Effects (child processes or the render worker).
import { killTree } from "../system-status/kill-tree.mjs";
import { stampedName } from "./renders.mjs";
import { recordMusic } from "../sfx/film-music.mjs";
import { err, readJson, writeJson } from "./files.mjs";
import { voiceRoutes } from "./voice.mjs";
import { aeRoutes } from "./ae.mjs";
import { prepareFilm } from "./prepare.mjs";
import { renderWarningNote } from "../hf-render-worker/errors.mjs";
import { safeName, typedName } from "../render-names/index.mjs";
import { aeInstalls } from "../system-status/index.mjs";
import { CHECKS, checkWords, renderVerdict } from "../hf-qa/checks.mjs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, createWriteStream, existsSync, linkSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import * as projects from "../project-service/index.mjs";
import { docPath } from "../project-service/docs.mjs";
import { musicSrc, readBeats } from "../hf-edit/beats.mjs";
import { beatMapTrack, writeBeatMap } from "../hf-edit/beatMap.mjs";
import { isLyricVideo } from "../style-catalog/traits.mjs";
import { showInExplorer } from "../project-service/explorer.mjs";
import { rememberAssets } from "../project-service/assets.mjs";
import { ARCHIVE, archiveMessage, unpackArchive } from "../project-service/archive.mjs";
import * as rev from "../revisions/index.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { filmSubtitles, toSrt, toVtt } from "../hf-edit/subtitles.mjs";
import { qaFacts } from "../pipeline/index.mjs";
import { snapshotAtAsync } from "../hf-qa/cli.mjs";
import { dynamicOf, stillLimit } from "../hf-qa/qc.mjs";
import { findingShot, measuringSlip, plainFinding } from "../hf-qa/plain.mjs";
import { keptFor, keptOnPurpose } from "../hf-qa/look.mjs";
import { measureStills, stillGate } from "../hf-qa/stillness.mjs";
import { endingGate, measureEnding } from "../hf-qa/ending.mjs";
import { filmEnding } from "../hf-edit/ending.mjs";
import { remixAudio, render, renderOutcome } from "../hf-render-worker/client.mjs";
import { deliverFile } from "./deliver.mjs";
import { extraSizes, masterAspect, sizeStage, tagOf, updateSize } from "../project-service/sizes.mjs";
import { sizesOf } from "./sizes.mjs";
import { chooseGpu } from "../hf-render-worker/gpu.mjs";
import * as secrets from "../secrets/index.mjs";
import { PROVIDERS, clearVoiceLists, voiceList } from "../voice/tts.mjs";
import { AUDIO_TYPES, MAX_BYTES, extractAudio, probe } from "../voice/audio.mjs";
import * as asr from "../voice/asr.mjs";
import * as lyrics from "../voice/lyrics.mjs";
import { MASTER, masterName } from "../hf-qa/loudness.mjs";
import { analyseBeats, fitMusicToFilm, musicRepeats, musicUsed, placeTrack } from "../hf-edit/tracks.mjs";
import { levelTracks } from "../sfx/mix/index.mjs";
import { resolveRuntime, ffmpegExe } from "../version-manager/index.mjs";
import { soundOnRoot } from "./proxy.mjs";
import { filmHash, filmParts } from "../project-service/film-hash.mjs";
import { withSoundChecks } from "../hf-qa/gates.mjs";
import { gateCuts } from "../moworks-styles/cuts.mjs";
import { freshFilm } from "../hf-edit/codeFilm.mjs";
import { fetchSlides, saveSlides, slidesLinks } from "./slides.mjs";

const APP_ROOT_DIR = resolve(import.meta.dirname, "..", "..");

/** What the checks read, as one hash: the film's picture (filmHash: index.html, compositions/, CHARACTERS.json,
 *  the assets) and its sound (assets/ and audio/: names, sizes, dates), the bundled fonts and libraries (assets/_app), the HyperFrames
 *  version and the checks' own code. The same hash means the same answers, so a Render after Tech checks on an unchanged film does not
 *  run them again; any change to the picture, the sound or the checks runs them again. */
export const gateHash = (projectDir, fps = null, root = APP_ROOT_DIR) => checksKey(projectDir, fps, root, { sound: true });
/** The one key of what the checks read (audit/112b b2.6: gateHash and pictureKey were two copies of it): the film (its picture, and with
 *  sound its sound too: filmHash), the bundled fonts and libraries (assets/_app), with sound the audio folder, the boards (the film's checks
 *  read them: G-CONTRACT on an anidoodle board, so a board fixed is checked again, T41-6), the HyperFrames version and the checks' own code.
 *  The same parts in the same order as the two had, so no film's saved checks are lost to it. */
function checksKey(projectDir, fps, root, { sound }) {
  const h = createHash("sha256");
  h.update(sound ? filmHash(projectDir, fps) : filmParts(projectDir, fps).picture);
  hashTree(h, projectDir, join(projectDir, "assets", "_app"));
  if (sound) hashTree(h, projectDir, join(projectDir, "audio"));
  hashTree(h, projectDir, join(projectDir, "boards"));
  try { h.update(resolveRuntime(null, root).version ?? ""); } catch { /* no runtime: the key still changes with the film */ }
  h.update(checksCode(root));
  return h.digest("hex").slice(0, 16);
}
/** A folder of the film into a hash by its files' names, sizes and dates. */
function hashTree(h, projectDir, d) {
  if (!existsSync(d)) return;
  for (const n of readdirSync(d).sort()) {
    const p = join(d, n), st = statSync(p);
    if (st.isDirectory()) { if (!n.startsWith(".")) hashTree(h, projectDir, p); continue; }
    h.update(`${p.slice(projectDir.length)}:${st.size}:${Math.floor(st.mtimeMs)}`);
  }
}
/** What the picture's checks read, the sound left out: Tech checks' "only the sound changed" shortcut keys on it (audit/112b b1.8: it keyed on
 *  the picture alone, so a board fixed, the bundled fonts and libraries or a HyperFrames update kept the old answers, T41-6). */
export const pictureKey = (projectDir, fps = null, root = APP_ROOT_DIR) => checksKey(projectDir, fps, root, { sound: false });
/** The checks' own code as this app run has it, read once (read from disk at every call, an edit of the checks' files by
 *  another process between the automatic checks and Render made the Render run them again; an update restarts the app, so it still counts). */
const codeHashes = new Map();
function checksCode(root) {
  if (!codeHashes.has(root)) {
    const h = createHash("sha256");
    for (const f of checksFiles(root)) { try { h.update(f.slice(root.length)); h.update(readFileSync(f)); } catch { /* fine */ } }
    codeHashes.set(root, h.digest("hex"));
  }
  return codeHashes.get(root);
}
/** The app's own modules the checks run: every module of hf-qa and everything they import, followed through the app's packages (audit/112b
 *  b1.7: three files were hashed, so an update of a check's own module, anatomy or the stills, reused the old answers). */
export function checksFiles(root = APP_ROOT_DIR) {
  const pkgs = join(root, "packages"), seen = new Set(), todo = readdirSync(join(pkgs, "hf-qa")).filter((m) => /\.mjs$/.test(m)).map((m) => join(pkgs, "hf-qa", m));          // every check module (G-END, G-STILL run from here)
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f) || !existsSync(f)) continue;
    seen.add(f);
    let s = ""; try { s = readFileSync(f, "utf8"); } catch { continue; }
    for (const m of s.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;'"]*?from\s+["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/g)) {
      const p = resolve(dirname(f), m[1] ?? m[2]);
      if (/\.m?js$/.test(p) && p.startsWith(pkgs)) todo.push(p);
    }
  }
  return [...seen].sort();
}
/** The last checks of a film, kept by its gate hash: .moworks/cache/gates/checked.json { key, blank, at, gates }. */
const checkedFile = (projectDir) => join(projectDir, ".moworks", "cache", "gates", "checked.json");
/** Tech checks may run the sound's checks alone and keep the rest of their last report (T32-7: 10 minutes for a chair louder) only when
 *  that report is of the very checks saved in checked.json (its checkedAt: a Render's own checks since are newer than the report, and the
 *  report would show the picture as it was checked before them), the picture and the checks' code are as they were then, and a code film's
 *  source builds (one that does not keeps its older film.js, so the picture's key stays: G-BUILD must run). audit/112b b7.1. */
export function soundOnlyStands(was, lastReport, { picture, code, bundled = null }) {
  if (bundled?.error || buildFailed(was?.gates)) return false;
  return was?.picture === picture && was?.code === code && !!was?.gates?.gates && !!lastReport?.checks?.length
    && lastReport.checkedAt != null && lastReport.checkedAt === was.at;
}

/** Checks that can stand for a new run: the same hash, with the blank-scene stills when they are asked for, and a script check that
 *  finished (one that ran out of time checked only part of the film: it runs again). bundled: freshFilm's answer for a code film; its
 *  source that does not build leaves the older film.js in place, so the hash stays and the old checks would let the old film render:
 *  they run again, and G-BUILD says why (audit/112b b6.1). */
export function reusableChecks(projectDir, key, { blank = false, bundled = null } = {}) {
  if (bundled?.error) return null;
  const c = readJson(checkedFile(projectDir), null);
  if (!c || c.key !== key || (blank && !c.blank) || !c.gates) return null;
  if ((c.gates.gates ?? []).some((g) => g.timedOut)) return null;
  if (buildFailed(c.gates)) return null;
  return c;
}
/** Saved checks whose G-BUILD was red: of a source that did not build, which no key reads (the key hashes the film.js it left). The source
 *  fixed builds that very film.js again, so the key is the same: those checks must never stand for it (audit/112b b7.1, found trying it). */
const buildFailed = (gates) => (gates?.gates ?? []).some((g) => g.id === "G-BUILD" && g.pass === false);

/** The Review's own files as look.mjs's keptOnPurpose reads them: { json: QC-REVIEW.json, md: QC-REVIEW.md } (each null / "" when absent). */
export function reviewFiles(projectDir) {
  let md = ""; try { md = readFileSync(docPath(projectDir, "QC-REVIEW.md"), "utf8"); } catch { /* no review */ }
  return { json: readJson(docPath(projectDir, "QC-REVIEW.json"), null), md };
}

/** Whether Tech checks run from their dialog carry the pipeline on (qaEnded): they passed (warnings only, a timed-out script check
 *  included) and the pipeline has reached its checks (the sound placed, or the checks step run), so checks run while the film is
 *  still being made never finish it early; a failure stays with the user, in the dialog. */
export function checksCarryOn(p) {
  if (!qaFacts(p?.meta?.lastQa, p?.path)?.pass) return false;
  const pl = p.meta?.pipeline ?? {};
  return !!(pl.ran?.checks || pl.ran?.sound || pl.marks?.sound || pl.finished || pl.delivered);
}

/** A render's check results live in the project's own folder, so renders/ holds only the films;
 *  .moworks/renders/<film file>.gates.json. */
export const gatesFile = (projectDir, film) => join(projectDir, ".moworks", "renders", basename(film) + ".gates.json");
const FORMATS = { mp4: ".mp4", webm: ".webm", mov: ".mov" };
/** What Play / Open may hand to Windows: films, sounds, pictures, documents and text, each opened by its own program. Never a script or a
 *  program (.bat, .exe, .vbs…) a project folder might hold. */
const OPENABLE = new Set([".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi", ".gif", ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus",
  ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".svg", ".psd", ".ai", ".pdf", ".pptx", ".ppt", ".docx", ".doc", ".xlsx", ".xls",
  ".txt", ".md", ".srt", ".vtt", ".csv", ".json"]);
// the file's own program through the shell's "open" (no cmd: the path arrives in the environment, never in a command line)
const OPEN_SCRIPT = Buffer.from("Invoke-Item -LiteralPath $env:MW_TARGET", "utf16le").toString("base64");
const AUDIO_EXT = /\.(mp3|wav|m4a|flac|ogg|aac)$/i;
const QUALITIES = ["draft", "standard", "high"];
/** HF's capture workers for a Render the user waits for (4 is where a 30 s anidoodle film stops getting faster; a
 *  background render takes BG_WORKERS, 2). */
export const FG_WORKERS = 4;

// After Effects installs on this PC: system-status (kept importable from here)
export { aeInstalls };

// the film checks' words and what stops a render: packages/hf-qa/checks.mjs (kept importable from here)
export { CHECKS, renderVerdict };


/** Start the next size of a render (fn throws { code: "BUSY" } while it cannot): while Claude changes the film it waits for it, as the
 *  background render does (up to 30 minutes); the last size's job closing, a few seconds; else giveUp(why) at once, in words (audit/112b b1.3). */
export function nextSize(fn, { claudeBusy = () => false, giveUp = () => {}, now = Date.now, wait = setTimeout, t0 = now() } = {}) {
  try { fn(); }
  catch (e) {
    const claude = claudeBusy();
    if (e.code === "BUSY" && now() - t0 < (claude ? 30 * 60000 : 10000)) { wait(() => nextSize(fn, { claudeBusy, giveUp, now, wait, t0 }), claude ? 2000 : 500); return; }
    giveUp(e.code === "BUSY" ? "the app was busy with another render" : String(e?.message ?? e).slice(0, 200));
  }
}

export function productionRoutes(ctx, { r, P, mustProject, HttpError }) {
  const { root, jobs } = ctx;
  const J = "([a-z-]+-[0-9a-z]+)";
  const meta = (id, fn) => projects.updateMeta(id, fn, root);
  // recorded beside the server's thread, in the project's git queue (T22-5); never rejects. Awaited where what follows reads the revision
  const save = async (p, msg) => { try { await rev.saveAsync(p.path, msg); } catch { /* revisions optional */ } ctx.backupProject(p.id); };
  const commit = async (p, msg) => { takeBatch(p.id); await save(p, msg); };          // it takes what an import left waiting
  // An import comes one request a file: one commit for all of them, once no file is coming and none came for a moment (Test 30: 695 "Asset
  // added" commits, about 0.85 s a file, 10 min for 723 files). Whatever needs the film committed meanwhile (a Claude task, a render, the checks,
  // opening a version, the Editor opening) commits what it finds first, as it always did, and this commit then finds nothing to do.
  const importing = new Map();          // project id: { p, open: files coming now, count: files waiting, message, timer }
  const quiet = () => Number(process.env.MW_ASSET_QUIET_MS) || 3000;
  /** The commit message of what waits, or null; nothing waits after this. */
  const takeBatch = (id) => {
    const b = importing.get(id);
    if (!b) return null;
    clearTimeout(b.timer); b.timer = null;
    const message = b.count ? b.message : null;
    b.count = 0; b.message = null;
    if (!b.open) importing.delete(id);
    return message;
  };
  const flushAssets = async (id) => { const p = importing.get(id)?.p, message = takeBatch(id); if (message) await save(p, message); };
  ctx.flushAssetCommits = () => Promise.all([...importing.keys()].map(flushAssets));
  /** A file starts coming: no commit until it has landed. */
  const fileComing = (p) => {
    const b = importing.get(p.id) ?? { p, open: 0, count: 0, message: null, timer: null };
    importing.set(p.id, b);
    clearTimeout(b.timer); b.timer = null; b.open++;
    return b;
  };
  /** A file has landed (or failed): the commit waits for the quiet moment after the last one. */
  const fileLanded = (b) => {
    b.open = Math.max(0, b.open - 1);
    if (b.open) return;
    if (!b.count) { importing.delete(b.p.id); return; }
    b.timer = setTimeout(() => { flushAssets(b.p.id).catch(() => {}); }, quiet());
    b.timer.unref?.();
  };
  /** What the batch's commit says: one file by its name, more by their number. */
  const addToBatch = (b, n, message) => { b.message = b.count ? `Assets added (${b.count + n} files)` : message; b.count += n; };
  const workDir = (p, ...xs) => join(p.path, ".moworks", "cache", ...xs);
  /** The film's music track (project-relative): the one placed as music, else the first audio file in assets/3_audio/music/ (or the old assets/audio/). */
  const musicTrack = (p) => {
    const f = projects.getProject(p.id, root)?.meta?.music?.file;
    if (f && existsSync(join(p.path, ...f.split("/")))) return f;
    for (const rel of ["assets/3_audio/music", "assets/audio"]) {
      const d = join(p.path, ...rel.split("/"));
      const n = existsSync(d) ? readdirSync(d).find((x) => AUDIO_EXT.test(x)) : null;
      if (n) return `${rel}/${n}`;
    }
    return null;
  };

  /** The music track's own length, s: the one recorded when it was placed (meta.music.duration), else measured; null when unknown. */
  const trackLength = async (p, src) => {
    const m = projects.getProject(p.id, root)?.meta?.music;
    if (m?.file === src && Number(m.duration) > 0) return Number(m.duration);
    const f = src ? join(p.path, ...String(src).split("/")) : null;
    try { return f && existsSync(f) ? (await probe(f, root)).duration || null : null; } catch { return null; }
  };
  /** The music track (HF's: the one placed, else the <audio> HF takes as music) with its title, length and HF's beat file; or null. */
  const musicTrackBeats = async (p) => {
    const m = projects.getProject(p.id, root)?.meta?.music ?? null;
    const src = await musicSrc(p.path, m);
    if (!src) return null;
    return { title: (m?.file === src && m.title) || basename(src).replace(/\.[^.]+$/, ""), duration: await trackLength(p, src), beats: await readBeats(p.path, src) };
  };

  /** All the gates (the blank-scene stills included) in a child process; Stop kills it. */
  const checkTimeFile = (p) => join(p.path, ".moworks", "cache", "qa", "check-time.json");
  // span: the job's progress from..to across the parts (the Tech checks job: its own bar moves with them)
  const gatesChild = (p, job, { blank = true, span = null, soundOnly = false } = {}) => new Promise((ok, no) => {
    const c = spawn(process.execPath, [join(root, "packages", "hf-qa", "gates-cli.mjs"), p.path, ...(soundOnly ? ["--sound-only"] : blank ? ["--blank", workDir(p, "gates")] : [])], { windowsHide: true });
    // each part of the checks as it starts ("STEP done total what" on stderr), so the render's quick check moves. A part can take
    // minutes with nothing to count (HF's check of the film: 2 % for 4 min), so the job also says since when the checks and this part run
    // and how long this film's checks took the last time (`checkExpectSec`, null the first time): the bar can follow the clock
    const t0 = Date.now();
    const last = (() => { try { return JSON.parse(readFileSync(checkTimeFile(p), "utf8")); } catch { return null; } })();
    job.update({ checksSince: new Date(t0).toISOString(), checkExpectSec: Number(last?.sec) > 0 ? last.sec : null });
    let o = "", e = "";
    c.stdout.on("data", (d) => { o += d; });
    c.stderr.on("data", (d) => {
      e = (e + d).slice(-2000);
      for (const m of String(d).matchAll(/^STEP (\d+) (\d+) ?(.*)$/gm)) {
        const done = Number(m[1]), total = Number(m[2]);
        job.update({ checkDone: done, checkTotal: total, checkWhat: m[3].trim() || null, checkSince: new Date().toISOString(),
          ...(span && total > 0 ? { progress: Math.round(span[0] + (span[1] - span[0]) * Math.min(1, done / total)) } : {}) });
      }
    });
    const kill = () => killTree(c);
    job.signal.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => {
      job.signal.removeEventListener("abort", kill);
      let out;
      try { out = JSON.parse(o); } catch { return no(err(job.signal.aborted ? "CANCELLED" : "CHECKS", `Tech checks could not run (exit ${code}) ${e.split(/\r?\n/).slice(-2).join(" ")}`)); }
      // HF's check was stopped twice (the computer is busy, T22): said in plain words, a wait for the user with a Retry; never kept as the
      // film's checks, never their time
      if (out.busy) return no(Object.assign(err("CHECK_BUSY", out.message), { detail: { waitsOnUser: true, retry: true } }));
      try { mkdirSync(join(p.path, ".moworks", "cache", "qa"), { recursive: true }); writeFileSync(checkTimeFile(p), JSON.stringify({ sec: Math.round((Date.now() - t0) / 1000), at: new Date().toISOString(), blank })); } catch { /* the next bar guesses less */ }
      ok(out);
    });
  });

  /** The checks for this film as it is now: the last ones when nothing they read changed since (gateHash), else a new run that is
   *  kept for the next time. The result says reused: { at } when it is the earlier run. */
  const gatesFor = async (p, job, { blank = true } = {}) => {
    // a code film bundled from its source first, as Tech checks do: a source changed by hand (or a task stopped before it was bundled) is the film the hash reads (b1.9)
    const bundled = await freshFilm(p.path).catch((e) => { job.log?.(`bundle: ${e.message}`); return { error: e.message }; });
    const fps = projects.projectFps(projects.getProject(p.id, root) ?? p), key = gateHash(p.path, fps, root);
    const prev = reusableChecks(p.path, key, { blank, bundled });          // a source that does not build: checked again (b6.1)
    if (prev) { job.log?.(`checks: the film is unchanged since ${prev.at}: their results are reused`); return { ...prev.gates, reused: { at: prev.at } }; }
    // why a Render runs the checks itself: "changed" (the film changed since its last checks, e.g. a chat fix) or "never"
    job.update?.({ checksWhy: readJson(checkedFile(p.path), null) ? "changed" : "never" });
    const gates = await gatesChild(p, job, { blank });
    // what Tech checks' sound-only shortcut reads too (the picture's key, the checks' code): a Render's own checks no longer cost the next
    // Tech checks a whole run for a sound change (audit/112b b6.4)
    try { writeJson(checkedFile(p.path), { key, blank, at: new Date().toISOString(), gates, picture: pictureKey(p.path, fps, root), code: checksCode(root) }); } catch { /* the cache is best effort */ }
    return gates;
  };

  const note = (p, n) => { try { projects.addNote(p.path, n); } catch { /* notes are best effort */ } };
  /** G-CUTS from the film's render, in the last Tech checks report (a style with a cut table only; nothing when there is none to read). */
  async function cutsIntoChecks(p) {
    const g = await gateCuts(p.path);
    if (!g) return null;
    const f = workDir(p, "qa", "last.json"), last = readJson(f, null);
    if (!last?.checks?.length) return null;
    const c = { ...g, ...checkWords(g.id) };
    writeJson(f, { ...last, checks: [...last.checks.filter((x) => x.id !== g.id), c] });
    return g;
  }
  /** The user's music track on the timeline, its beats measured by HyperFrames (off the server's thread), recorded as the film's music. */
  const placeMusic = async (p, rel, info, { start = null } = {}) => {
    placeTrack(p.path, { kind: "music", src: rel, duration: Number(info?.duration) || 1, start });
    const beats = await analyseBeats(p.path, rel);
    if (beats.ok) { try { fitMusicToFilm(p.path); } catch { /* fitted again before the checks */ } }          // a song shorter than the film repeats on its beats
    await levelTracks(p.path, { root }).catch(() => null);          // under the voice, ducked under its words (sfx/actions.mjs trackGains)
    recordMusic(p.id, { placed: { file: rel, duration: info?.duration ?? null, beats: beats.ok ? beats.file : null } }, root);          // sfx/film-music.mjs
    meta(p.id, (m) => { (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "music", text: `Music on the timeline: ${basename(rel)}` }); });
    note(p, { kind: "voice", text: beats.ok ? "Music on the timeline, beats measured: {file}" : "Music on the timeline: {file}", vars: { file: basename(rel) } });
    repeatNote(p);
    if (isLyricVideo(projects.getProject(p.id, root)?.meta, { dir: p.path, root })) await writeBeatMap(p.path, rel, { root, fps: projects.projectFps(p) }).catch(() => false);
    return { file: rel, beats: beats.ok ? beats.file : null, beatsError: beats.ok ? null : beats.message };
  };
  /** A lyrics video's song, however it came in (a folder of assets has no role): on the timeline with its beats measured (HyperFrames reads the beats of the track in the film),
   *  and its beat map written, before the steps that plan the film. One song in the music folder only: with more, the owner says which (Prepare). Nothing to do when the map is there. */
  ctx.songArrived = async (p0) => {
    const p = projects.getProject(p0.id, root) ?? p0;
    if (!isLyricVideo(p.meta, { dir: p.path, root })) return;
    const placed = p.meta?.music?.file && existsSync(join(p.path, ...p.meta.music.file.split("/"))) ? p.meta.music.file : null;
    const songs = placed ? [placed] : ["assets/3_audio/music", "assets/audio"].flatMap((rel) => { const d = join(p.path, ...rel.split("/")); return existsSync(d) ? readdirSync(d).filter((x) => AUDIO_EXT.test(x)).map((x) => `${rel}/${x}`) : []; });
    if (songs.length !== 1) return;
    const inFilm = await musicSrc(p.path).catch(() => null);
    if (!placed && !inFilm) await placeMusic(p, songs[0], await probe(join(p.path, ...songs[0].split("/")), root));
    if (beatMapTrack(p.path) !== (inFilm ?? songs[0])) await writeBeatMap(p.path, inFilm ?? songs[0], { root, fps: projects.projectFps(p) }).catch(() => false);
  };
  /** A song far shorter than the film plays again after itself to the film's end (tracks.mjs musicLoop, T22-9): said once in the chat, its
   *  Final Mix button there to pick a longer one (Final Mix says it too). */
  const repeatNote = (p) => {
    const r = musicRepeats(p.path);
    const cur = projects.getProject(p.id, root)?.meta?.music;
    if (!r?.short || !cur || cur.repeatNoted === r.from) return;
    recordMusic(p.id, { repeatNoted: r.from }, root);
    note(p, { kind: "music", status: "warning", open: "mix", text: "The song is shorter than the film; it repeats from {at}. Pick a longer track in Final Mix if you hear the repeat.", vars: { at: r.at } });
  };

  // ---- Render (top bar): a quick check first (render-breaking issues only), then the HF render worker
  /** Render the film in each size the Render dialog ticked (one film, several sizes: owner #1232-#1236). One job per size, one after the
   *  other (a film has one export at a time: the next starts when one ends, none after a Stop), each file named with its size (<film>_16x9,
   *  <film>_9x16); the master renders as before, another size from its own root page with the master's mix put onto its picture (remix.mjs:
   *  no second mix). No size given, or a film of one size: the render as before. */
  function startExports(p, b) {
    const own = masterAspect(p.meta) ?? p.meta?.format?.aspect ?? null;
    const made = new Set(sizesOf(ctx, p).filter((r) => r.status === "ready" || r.status === "stale").map((r) => r.aspect));
    const want = Array.isArray(b?.sizes) ? [...new Set(b.sizes.map(String))].filter((a) => a === own || made.has(a)) : [];
    if (!made.size || !want.length) return startExport(p, b);
    // the master first, then the others in the order they were made
    const order = [own, ...extraSizes(p.meta).map((x) => x.aspect)].filter((a) => want.includes(a));
    // the next size when one ends; one that cannot start says so in the chat (audit/112b b1.3: it was dropped without a word)
    const said = (size) => (why) => { try { projects.addNote(p.path, { kind: "render", status: "warning", text: "The {size} size was not rendered: {why}. Press Render again to make it.", vars: { size, why } }); } catch { /* notes are best effort */ } };
    const run = (i) => startExport(projects.getProject(p.id, root) ?? p, b, { size: order[i], sized: true,
      then: i + 1 < order.length ? () => nextSize(() => run(i + 1), { claudeBusy: () => !!ctx.agent?.running?.has(p.id), giveUp: said(order[i + 1]) }) : null });
    return { ...run(0), queue: order.map((size) => ({ size })) };
  }
  function startExport(p, b, { size = null, sized = false, then = null } = {}) {
    const format = FORMATS[b.format] ? b.format : "mp4";
    const quality = QUALITIES.includes(b.quality) ? b.quality : "standard";
    // the sound master: Standard -14 LUFS by default, Quieter -16, or the mix as it is (#1073); "loud" and "kit", older names of -14, are Standard
    const master = masterName(b.master);
    // always the film's own rate: HyperFrames renders the timeline at any rate it is given, but the player,
    // frame-stepped motion and the film's data-fps follow the project's; a separate choice only disagreed with the timeline. b.fps is ignored.
    const fps = projects.projectFps(projects.getProject(p.id, root) ?? p);
    // a name typed with the format's ending ("film.mp4") loses it: the date and the ending are the app's ("…_film.mp4_0529.mp4", T38-10)
    const ext = FORMATS[format], name0 = typedName(b.filename, ext, basename(p.path));          // render-names: as the Render dialog shows it
    // a film of several sizes: each file says its size (<film>_16x9, <film>_9x16); `other`: one of the sizes made from the master
    const other = !!size && size !== (masterAspect(p.meta) ?? p.meta?.format?.aspect);
    const name = sized && size ? `${name0}_${tagOf(size)}` : name0;
    const dir = join(p.path, "renders");
    mkdirSync(dir, { recursive: true });
    const out = join(dir, stampedName(dir, name, FORMATS[format]));          // the date and time in the name, never ""
    // not while Claude changes the film (the render would catch it half-done); one render at a time in the app
    if (ctx.agent?.running?.has(p.id)) throw err("BUSY", "Claude is changing the film: render when it finishes");
    // the subtitles beside the film, only when the Render dialog's box is ticked (owner 06/11 #1244): <film>.srt and <film>.vtt for YouTube and Facebook
    const subtitles = b.subtitles === true;
    let verdict = null;          // the checks' verdict of this render (the master's or one size's): set before the return below, or the render functions under it read it uninitialised (#1281)
    return jobs.start("export", { projectId: p.id, title: `Export ${basename(out)}`, output: out, settings: { format, quality, fps, filename: name, master, subtitles, ...(size ? { size } : {}) } }, async (job) => {
      const release = ctx.renders ? await ctx.renders.acquire(p.id, p.title ?? basename(p.path), (o) => job.update({ stage: "waiting", waitingFor: o.title })) : () => {};
      let go = !!then;
      try { return await (other ? renderSizeNow(job) : renderNow(job)); }
      catch (e) { if (e.code === "CANCELLED" || job.signal?.aborted) go = false; throw e; }          // a Stop stops the sizes after it too
      finally { release(); if (go) setTimeout(then, 300); }
    });
    /** The film made ready (server/prepare.mjs) and committed; a sound whose file is gone is left out of the render, said in the chat
     *  (owner #1109; T38b-9: HF failed after a minute on it). The master's render and each size's (audit/112b b2.4: two copies). */
    async function readied(job) {
      const ready = await prepareFilm(p, { root, dropLost: true, log: job.log });
      repeatNote(p);
      if (ready.lost.length) note(p, { kind: "render", status: "warning", open: "mix", text: ready.lost.map((f) => f.message).join(" ") });
      await commit(p, "Changes before render");
    }
    /** The checks of the root page in `dir` (Tech checks' results when the film is unchanged); throws RENDER_BLOCKED when they stop it. */
    async function checked(job, dir, { size: sz = null } = {}) {
      job.update({ stage: "checks", revision: await rev.headAsync(p.path) });
      const gates = await gatesFor(dir === p.path ? p : { ...p, path: dir }, job, { blank: false }).catch((e) => {
        // the quick check did not finish on a busy machine: said in the chat too (a render left blocked went unseen for 70 min, T22)
        if (e.code === "CHECK_BUSY") note(p, { kind: "render", status: "warning", text: e.message, open: "render" });
        throw e;
      });
      verdict = renderVerdict(gates);
      writeJson(gatesFile(p.path, out), { ...gates, verdict, ...(sz ? { size: sz } : {}) });          // never in renders/
      job.update({ gates: { pass: verdict.pass, blockingFailures: verdict.blocking.map((g) => g.id), ...(gates.reused ? { reused: gates.reused } : {}) }, warnings: verdict.warnings });
      if (!verdict.pass) throw Object.assign(err("RENDER_BLOCKED", `Render${sz ? ` of ${sz}` : ""} stopped: ${verdict.blocking.map((g) => checkWords(g.id).title).join(", ")}`), { detail: { verdict } });
    }
    /** HyperFrames renders the root page in `dir` to `to`: its progress on the job, its errors as the app's (CANCELLED, RENDER_FAILED…). */
    async function hfRender(job, dir, to, gpu) {
      const res = await render({ projectDir: dir, outputPath: to, fps, format, quality, workers: FG_WORKERS, browserGpuMode: gpu.mode }, { signal: job.signal, root,
        logFile: join(root, "runtime", "logs", `export-${Date.now()}.log`),
        onEvent: (e) => {
          if (e.type === "progress") job.update({ stage: e.stage ? `rendering: ${e.stage}` : "rendering", progress: typeof e.pct === "number" ? Math.round(e.pct) : job.progress });
          if (e.type === "log" && e.level === "error") job.log(e.message);
        } });
      job.update({ logFile: res.logFile });
      return renderOutcome(res, { what: "Export" });          // HF's answer read one way for every render (audit/112b b2.4)
    }
    /** One of the film's other sizes: its root page through its own folder (sizeStage), checked there (Tech checks per root page), rendered,
     *  then the master's own mix put onto its picture; delivered as the master's render is (web size, subtitles, loudness). */
    async function renderSizeNow(job) {
      await readied(job);
      const stageDir = sizeStage(p.path, size);
      if (!stageDir) throw err("NOT_FOUND", `The ${size} size is not made yet: adapt it first`);
      await checked(job, stageDir, { size });
      job.update({ stage: "gpu check" });
      const gpu = await chooseGpu(stageDir, { root, signal: job.signal });
      job.update({ gpu: { mode: gpu.mode, reason: gpu.reason, renderer: gpu.renderer }, stage: "rendering", progress: 0 });
      // the master's mix onto the picture where it can be (every sound on the master's root page, an MP4 or MOV); else the page's own copy of it
      const remix = format !== "webm" && soundOnRoot(p.path);
      const pic = remix ? out.replace(/(\.[^.\\/]+)$/, ".picture$1") : out;
      const res = await hfRender(job, stageDir, pic, gpu);
      if (remix) {
        job.update({ stage: "the master's sound" });
        const mixed = await remixAudio({ projectDir: p.path, picture: pic, outputPath: out, fps, duration: res.duration ?? null, workDir: join(p.path, ".moworks", "cache", "sizes", `remix-${tagOf(size)}`) },
          { signal: job.signal, root, ffmpeg: ffmpegExe(root) });
        rmSync(pic, { force: true });
        if (mixed.type === "cancelled") throw err("CANCELLED", "Export stopped");
        if (mixed.type !== "done") throw err("REMIX_FAILED", mixed.message ?? "The master's sound could not be put onto this size");
        // what the mix said is kept on the job, as the master's render keeps it (they were dropped: audit/112b, sent to S5)
        if (mixed.warning) job.log(`the sound of this size: ${mixed.warning}`);
        if (mixed.loweredDb) job.update({ loweredDb: mixed.loweredDb });
      }
      return delivered(job, res, gpu);
    }
    async function renderNow(job) {
      await readied(job);
      await checked(job, p.path);
      // a Brush cartoon film was rendered once when it was finished: when nothing changed since, that file is the export
      const pre = await ctx.preRendered?.(p, { format, fps, quality, signal: job.signal }, (stage) => job.update({ stage })).catch((e) => { job.log?.(`reuse: ${e.message}`); return null; });
      if (pre) {
        job.update({ stage: "copying the film", progress: 100, reused: true });
        // the same file twice takes the room once: a hard link on one disk (either name can go, the other stays; the pre-render is replaced, never written over), a copy where links do not work (Google Drive, another disk)
        try { rmSync(out, { force: true }); linkSync(pre, out); } catch { copyFileSync(pre, out); }
        return delivered(job, { type: "done", reused: true, reusedFrom: ctx.preRenderInfo?.(p) ?? null, logFile: null, totalFrames: null, duration: null, wallMs: 0, hfVersion: null }, { mode: "reused", reason: "pre-rendered", renderer: null, ms: 0 });
      }
      // GPU or CPU: one test frame on the GPU first; a failed or blank one sends this render to the CPU, said in one line
      job.update({ stage: "gpu check" });
      const gpu = await chooseGpu(p.path, { root, signal: job.signal });
      job.update({ gpu: { mode: gpu.mode, reason: gpu.reason, renderer: gpu.renderer } });
      if (gpu.fellBack) note(p, { kind: "render", status: "warning", text: "The GPU test frame came out {why}, so this render runs on the CPU (slower)",
        vars: { why: gpu.reason === "test-blank" ? "blank" : "wrong" } });
      job.update({ stage: "rendering", progress: 0 });
      const res = await hfRender(job, p.path, out, gpu);
      return delivered(job, res, gpu);
    }
    // the rendered (or reused) file: its sound mastered and measured, the export recorded, a version kept. The master's render and a size's
    // (it sat inside renderNow, so a size's render ended in "delivered is not defined")
    async function delivered(job, res, gpu) {
      // the delivery every render of the film goes through (server/deliver.mjs, audit/112b b2.4): Standard held to the web ceiling (High
      // stays as HF made it), the sound mastered to the studio rule (-14 LUFS, true peak at most -1 dBTP; -16 when Quieter is chosen), measured
      const { web, loud } = await deliverFile(out, { format, quality, master, measure: true, root, signal: job.signal, onStage: (stage) => job.update({ stage }), log: (l) => job.log?.(l) });
      const fileSize = existsSync(out) ? statSync(out).size : 0;
      let subs = null;
      if (subtitles && existsSync(out)) {
        job.update({ stage: "subtitles" });
        try {
          const lines = await filmSubtitles(p.path);
          if (lines.length) {
            const base = out.replace(/\.[^./\\]+$/, "");
            writeFileSync(`${base}.srt`, toSrt(lines)); writeFileSync(`${base}.vtt`, toVtt(lines));
            subs = { lines: lines.length, files: [`${base}.srt`, `${base}.vtt`] };
          } else subs = { lines: 0, files: [], why: "The film has no words to subtitle." };
        } catch (e) { job.log?.(`subtitles: ${e.message}`); subs = { lines: 0, files: [], why: "The subtitles could not be made." }; }
      }
      // the film's hash beside it: a check that reads a render (G-CUTS) reads this one while the film is as it was rendered (T38-7)
      let filmAt = null, pictureAt = null;          // pictureAt: what AE takes of the file, its picture (renders.mjs lastRender, audit/112d d4)
      try { if (!other) { filmAt = filmHash(p.path, Number(fps) || null); pictureAt = filmParts(p.path, Number(fps) || null).picture; } } catch { /* no hash: never read as the film's */ }
      // a render of the film as it is now goes on with the new version waiting for a press (Version 2 after a Review), as a chat message does:
      // the Editor stopped showing Version 1 and the chat saying Version 2 was not rendered (T38b-3)
      if (!other) meta(p.id, (m) => { const x = m.pipeline?.version1; if (x?.holding && x.next) { delete x.holding; x.next.opened = new Date().toISOString(); x.next.render = "done"; } });
      // one of the other sizes: its own last export, beside the master's
      if (other) meta(p.id, (m) => { updateSize(m, size, (x) => { x.lastExport = { file: relativeTo(p.path, out), at: new Date().toISOString(), size: fileSize, format, fps, quality, loudness: loud }; }); });
      else meta(p.id, (m) => { (m.stages ??= {}).export = { status: "done" }; m.lastExport = { file: relativeTo(p.path, out), at: new Date().toISOString(), size: fileSize, format, fps, quality, loudness: loud, ...(web?.capped ? { web } : {}), ...(filmAt ? { hash: filmAt, picture: pictureAt } : {}) };
        (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "export", text: `Exported ${basename(out)}` }); });
      note(p, { kind: "render", text: "Render finished: {file}", vars: { file: basename(out) }, file: relativeTo(p.path, out), warnings: verdict.warnings.length });
      const hfSaid = renderWarningNote(res.warnings);          // what HyperFrames warned of while rendering: a short yellow line (b1.2)
      if (hfSaid) note(p, hfSaid);
      try { await ctx.autopilot?.saveVersion(p.id, "render"); } catch { /* a version is best effort */ }          // each render is a version
      // the cuts read from this render into the last Tech checks at once (T38b-2), in the background: the render is done whatever they find
      if (!other) cutsIntoChecks(p).catch(() => null);
      if (loud?.notes?.length) note(p, { kind: "render", status: "warning", text: "Sound: {lufs} LUFS, peak {peak} dBTP ({notes}); the target is {target} LUFS, peak at most -1", vars: { lufs: loud.lufs, peak: loud.truePeak, notes: loud.notes.join(", "), target: (MASTER[master] ?? MASTER.standard).lufs } });
      // "Took" is the whole wait from pressing Render (the checks, the GPU test, the frames, the sound), not the frames alone
      const whole = job.startedAt ? Date.now() - Date.parse(job.startedAt) : res.wallMs;
      return { loudness: loud, file: out, size: fileSize, ...(size ? { filmSize: size } : {}), ...(subs ? { subtitles: subs } : {}), frames: res.totalFrames ?? null, duration: res.duration ?? null, wallMs: whole, renderMs: res.wallMs, hfVersion: res.hfVersion, logFile: res.logFile,
        gpu: { mode: gpu.mode, reason: gpu.reason, renderer: gpu.renderer, checkMs: gpu.ms }, ...(web?.capped ? { web } : {}), ...(res.reused ? { reused: true, reusedFrom: res.reusedFrom ?? null } : {}) };
    }
  }
  const relativeTo = (base, f) => f.slice(resolve(base).length + 1).split(sep).join("/");

  /** Tech checks run from their dialog ended (the film passed with only a timed-out script warning, yet was never finished and
   *  its pre-render never started, because only the autopilot's own run went on to afterQa): when they pass, the pipeline goes on as
   *  after its own run (the film done, the next step), and the film's background render is asked for (a no-op when it is fresh). */
  function qaEnded(id) {
    const p = projects.getProject(id, root);
    if (!p || p.missing) return;
    if (!checksCarryOn(p)) return;
    try { ctx.autopilot?.afterQa?.(id)?.catch?.(() => {}); } catch { /* the pipeline asks again */ }
    try { ctx.previewProxy?.(id); } catch { /* the next change asks again */ }
  }

  // ---- QA: the same gates + a contact sheet of HF stills (Visual Review, heuristic), report in .moworks/cache/qa/last.json
  function startQa(p, { onEnd = null, background = false } = {}) {
    return jobs.start("qa", { projectId: p.id, title: "Running checks", onEnd, ...(background ? { background: true } : {}) }, async (job) => {
      // the film made ready as a render makes it (server/prepare.mjs), a lost sound kept for G-AUDIO-FILES to name; before the commit (G-BUILD would bundle it after)
      const ready = await prepareFilm(p, { root, log: job.log });
      repeatNote(p);
      await commit(p, "Changes before checks");
      const revision = (await rev.headAsync(p.path)) ?? "none";
      job.update({ stage: "checks", progress: 10 });
      // Tech checks run every time they are asked for, and keep their results for a Render of the same film
      const fps0 = projects.projectFps(projects.getProject(p.id, root) ?? p), key = gateHash(p.path, fps0, root), picture = pictureKey(p.path, fps0, root), code = checksCode(root);
      // only the sound changed: the picture's checks stand, the sound's run (T32-7: 10 minutes for a chair louder, the picture's hash the same)
      const was = readJson(checkedFile(p.path), null), lastReport = readJson(workDir(p, "qa", "last.json"), null);
      if (soundOnlyStands(was, lastReport, { picture, code, bundled: ready.bundled })) {
        const fresh = await gatesChild(p, job, { soundOnly: true, span: [10, 90] });
        const at = new Date().toISOString();
        const report = { ...lastReport, at, checkedAt: at, revision, soundOnly: true, checks: withSoundChecks(lastReport.checks, fresh.gates.map((g) => ({ ...g, ...checkWords(g.id) }))) };
        try { writeJson(checkedFile(p.path), { ...was, key, at: report.checkedAt, gates: { ...was.gates, gates: withSoundChecks(was.gates.gates, fresh.gates) } }); } catch { /* best effort */ }
        writeJson(workDir(p, "qa", "last.json"), report);
        meta(p.id, (m) => { m.lastQa = { at: report.at, pass: report.pass, revision, blocking: report.blockingFailures.length }; });
        return { pass: report.pass, blocking: report.blockingFailures.length, soundOnly: true };
      }
      const gates = await gatesChild(p, job, { span: [10, 60] });          // the top bar's "Running checks 10%" stood ~10 min
      // the report names the checks it is made from (their time in checked.json): a Render's own checks since are newer than it (b7.1)
      const checkedAt = new Date().toISOString();
      try { writeJson(checkedFile(p.path), { key, blank: true, at: checkedAt, gates, picture, code }); } catch { /* best effort */ }
      job.update({ stage: "contact sheet", progress: 60 });
      const { shots, root: comp } = await readShots(p.path);
      const placed = shots.filter((s) => s.start != null && s.duration);
      const times = placed.flatMap((s) => [0.25, 0.75].map((f) => +(s.start + s.duration * f).toFixed(3)));
      const rel = `.moworks/cache/posters/qa/${revision.slice(0, 12)}`;
      const out = join(p.path, ...rel.split("/"));
      let stills = [];
      if (times.length) {
        mkdirSync(out, { recursive: true });
        const x = await snapshotAtAsync(p.path, times, out, { signal: job.signal });
        const files = existsSync(out) ? readdirSync(out).filter((f) => /^frame-\d+-at-[\d.]+s\.png$/.test(f)).sort() : [];
        stills = files.map((f, i) => ({ t: times[i], shot: placed[Math.floor(i / 2)]?.number ?? null, path: `${rel}/${f}` }));
        if (x.exitCode !== 0) job.log(`stills: ${x.stderrTail.join(" ")}`);
      }
      // the still stretches: a hint in Visual review, never a blocking issue
      job.update({ stage: "still stretches", progress: 80 });
      let still = null, stillErr = null;
      if (comp?.duration > 0) {
        try { still = await measureStills(p.path, { shots: placedShots(shots, comp.duration), total: comp.duration, dynamic: dynamicOf(p.path), ...stillLimit(p.path), signal: job.signal, workDir: workDir(p, "still") }); }
        catch (e) { if (job.signal.aborted) throw e; stillErr = String(e.message).split(/\r?\n/)[0]; }
      } else stillErr = "the film has no length yet";
      gates.gates.push(stillGate(still, stillErr));
      // the ending: a hard cut on the last half second (house rules §9), in every style (T24-12); where the plan's author's ending
      // stands (named, played in the last shot), a held end card ends the film too
      job.update({ stage: "the ending", progress: 90 });
      const ending = filmEnding(projects.getProject(p.id, root)?.meta, { dir: p.path, root });
      let end = null, endErr = null;
      if (comp?.duration > 0) {
        try { end = await measureEnding(p.path, { total: comp.duration, signal: job.signal, workDir: workDir(p, "end") }); }
        catch (e) { if (job.signal.aborted) throw e; endErr = String(e.message).split(/\r?\n/)[0]; }
      } else endErr = "the film has no length yet";
      gates.gates.push(endingGate(end, { own: ending.own, author: ending.author ?? null, error: endErr, shot: placed.at(-1)?.number ?? null }));
      const shotOf = (file) => placed.find((s) => s.src && file && file.replace(/\\/g, "/").endsWith(s.src))?.number ?? null;
      // HF's findings found in their shot by the element's id (HF names index.html for the elements it tracks: the kite of shot 6
      // read as "shot: null"), each with one plain line for the user (`plain`). What the Review kept on purpose (QC-REVIEW.json's `kept`,
      // else its QC-REVIEW.md lines) is `intended`, a turning point measured far outside the frame an `artefact`: neither is a warning (T23-3)
      const frame = projects.getProject(p.id, root)?.meta?.format ?? null;
      const kept = keptOnPurpose(reviewFiles(p.path));
      const hfFinding = (f, title) => {
        const at = findingShot(f, placed, p.path), shot = at.shot?.number ?? null, k = keptFor({ ...f, shot }, kept);
        return { ...f, file: at.file ?? f.file, shot, plain: plainFinding(f, { shot: at.shot, check: title, frame }),
          ...(measuringSlip(f, frame) ? { artefact: true } : {}), ...(k ? { intended: true, ...(k.why ? { why: k.why } : {}) } : {}) };
      };
      const report = { at: new Date().toISOString(), checkedAt, revision, pass: gates.pass, blockingFailures: gates.blockingFailures,
        checks: gates.gates.map((g) => { const c = checkWords(g.id);
          return { ...g, ...c, findings: (g.findings ?? []).map((f) => g.id.startsWith("G-HF-") ? hfFinding(f, c.title)
            : ({ ...f, shot: shotOf(f.file) ?? (f.composition ? placed.find((s) => s.src?.includes(f.composition))?.number ?? null : f.shot ?? null) })) }; }),
        stills };
      writeJson(workDir(p, "qa", "last.json"), report);
      const wasFailing = (projects.getProject(p.id, root)?.meta?.lastQa?.blocking ?? 0) > 0;
      meta(p.id, (m) => { m.lastQa = { at: report.at, pass: report.pass, revision, blocking: report.blockingFailures.length }; });
      // the checks run in the background and say nothing when the film is fine; a real problem is
      // said once, in plain words: what would stop the render (a check that ran out of time is not one). A pass after a failure
      // writes a quiet "checks" note the Editor clears its card with.
      if (!report.pass) note(p, { kind: "checks", status: "error", text: "Something would stop the render: {what}",
        vars: { n: report.blockingFailures.length, what: report.blockingFailures.map((id) => checkWords(id).title).join(", ") } });
      else if (wasFailing) note(p, { kind: "checks", status: "done", text: "Nothing stops the render any more" });
      return { pass: report.pass, blocking: report.blockingFailures.length };
    });
  }


  /** Copy one file into the project by kind, as an upload is (a short sound goes to sfx once it is measured): its import entry. */
  async function placeFile(p, from, name, size) {
    let d = projects.assetDestination(p.path, name);
    const entry = (x, rel, same = false) => ({ name: basename(rel), path: rel, area: x.area, folder: x.folder, kind: x.kind, size, ...(same ? { same: true } : {}) });
    const twin = await projects.sameFileThere(p.path, d, from);          // already there, byte for byte: not copied again
    if (twin) return entry(d, twin, true);
    copyFileSync(from, d.path + ".part"); renameSync(d.path + ".part", d.path);
    if (d.kind === "audio" && d.folder !== "3_audio/sfx") {
      let info = null; try { info = await probe(d.path, root); } catch { /* not readable as audio: stays where it is */ }
      if (info?.duration > 0 && info.duration < 3) {
        const to = projects.assetDestination(p.path, basename(d.path), "sfx");
        const inSfx = await projects.sameFileThere(p.path, to, d.path);
        if (inSfx) { rmSync(d.path, { force: true }); return entry(to, inSfx, true); }
        renameSync(d.path, to.path); d = to;
      }
    }
    return entry(d, d.rel);
  }

  /** An imported archive (already copied to d): unpacked with Windows' tar, its files copied in by kind with the same naming rules, the
   *  archive's own copy removed (the user's original stays where it was). One that cannot be unpacked stays as it came, and the
   *  result says so in plain words. Its files wait in the Assets tab for the user's choice of voice-over or music, as later uploads do.
   *  Returns the upload's answer with archive: { name, unpacked, files?, skipped?, error? }. */
  async function importArchive(p, d, size, batch) {
    const name = basename(d.path);
    const u = await unpackArchive(d.path);
    const placed = [];
    if (u.ok && u.files.length) {
      try { for (const f of u.files) placed.push(await placeFile(p, f.abs, f.name, f.size)); }
      finally { u.cleanup(); }
      rmSync(d.path, { force: true });
    } else if (u.ok) u.cleanup();
    const ok = placed.length > 0, fresh = placed.filter((x) => !x.same);
    const rels = ok ? fresh.map((x) => x.path) : [d.rel];
    if (rels.length) {
      rememberAssets(p.path, rels);
      note(p, { kind: "assets", text: "Added {n} file(s)", files: rels });
      try { ctx.autopilot?.filesAdded?.(p.id, rels); } catch { /* the note stands */ }
      addToBatch(batch, rels.length, ok ? `Assets added from ${name} (${rels.length} file(s))` : `Asset added: ${d.rel}`);
    }
    return ok ? { file: null, voice: null, archive: { name, unpacked: true, files: placed, skipped: u.skipped ?? [], same: placed.length - fresh.length } }
      : { file: { name, path: d.rel, area: d.area, folder: d.folder, kind: d.kind, size }, voice: null,
        archive: { name, unpacked: false, skipped: u.skipped ?? [], error: archiveMessage(name, u.ok ? "empty" : u.reason) } };
  }

  /** One imported file, as the request's body (X-File-Name, X-Asset-Role): copied into the project by kind. Its commit joins the batch's. */
  async function takeFile(p, req, batch) {
    const name = projects.safeFileName(decodeURIComponent(req.headers["x-file-name"] ?? ""), "file");
    // no role needed: the app sorts audio by name and length; an old client's role still counts
    const asked = projects.AUDIO_ROLES.includes(req.headers["x-asset-role"]) ? req.headers["x-asset-role"] : null;
    if (Number(req.headers["content-length"] ?? 0) > projects.MAX_ASSET_BYTES) throw new HttpError(413, "TOO_LARGE", "The file is over 4 GB");
    let d = projects.assetDestination(p.path, name, asked);
    let n = 0;
    const limit = async function* (src) { for await (const c of src) { n += c.length; if (n > projects.MAX_ASSET_BYTES) throw new HttpError(413, "TOO_LARGE", "The file is over 4 GB"); yield c; } };
    try { await pipeline(req, limit, createWriteStream(d.path + ".part")); } catch (e) { rmSync(d.path + ".part", { force: true }); throw e; }
    // the same file again (a zip and its unpacked folder together: T30-14): the one already there stands, nothing new
    const already = (x, rel) => ({ file: { name: basename(rel), path: rel, area: x.area, folder: x.folder, kind: x.kind, size: n }, voice: null, same: true });
    const twin = await projects.sameFileThere(p.path, d, d.path + ".part");
    if (twin) { rmSync(d.path + ".part", { force: true }); return already(d, twin); }
    renameSync(d.path + ".part", d.path);
    // an archive (.zip, .rar, .7z) is unpacked and its files go in as any import (T25: they stayed archives)
    if (ARCHIVE.test(d.path)) return await importArchive(p, d, n, batch);
    let info = null;
    if (d.kind === "audio") {
      try { info = await probe(d.path, root); } catch { /* not readable as audio: stays where it is */ }
      if (!asked && info?.duration > 0 && info.duration < 3 && d.folder !== "3_audio/sfx") {          // a short sound is a sound effect
        const to = projects.assetDestination(p.path, basename(d.path), "sfx");
        const inSfx = await projects.sameFileThere(p.path, to, d.path);
        if (inSfx) { rmSync(d.path, { force: true }); return already(to, inSfx); }
        renameSync(d.path, to.path); d = to;
      }
    }
    rememberAssets(p.path, [d.rel]);
    const role = asked ?? (d.kind === "audio" ? d.folder.split("/")[1] : null);
    const file = { name: basename(d.path), path: d.rel, area: d.area, folder: d.folder, kind: d.kind, size: n };
    note(p, { kind: "assets", text: "Added {n} file(s)", files: [d.rel] });
    try { ctx.autopilot?.filesAdded?.(p.id, [d.rel]); } catch { /* the note stands */ }          // Claude goes on when it was waiting for files
    let voice = null;
    const m0 = projects.getProject(p.id, root)?.meta ?? {};
    // the first voice-over is transcribed at once and the first music goes on the timeline; later ones wait for the user's choice in the Assets tab
    if (role === "voiceover" && (d.kind === "audio" || d.kind === "video") && (asked || !m0.voice?.file)) {
      try {
        let audio = d.path;
        if (d.kind === "video") {            // the clip's sound, for the transcript (the video itself stays in assets/video/)
          audio = projects.assetDestination(p.path, basename(d.path, extname(d.path)) + ".m4a", "voiceover").path;
          await extractAudio(d.path, audio, root);
        }
        voice = await useVoice(p, audio, await probe(audio, root), { source: "upload", size: statSync(audio).size, from: d.kind === "video" ? d.rel : null });
      } catch (e) { voice = { error: e.code === "INVALID" ? e.message : "This file could not be read as audio" }; }
    } else if (role === "music" && d.kind === "audio" && (asked || !m0.music?.file)) {         // the user's track: on the timeline at once, its beats measured
      let music = null;
      try { music = await placeMusic(p, d.rel, info ?? await probe(d.path, root)); } catch (e) { music = { error: e.message }; }
      await commit(p, `Music added: ${d.rel}`);
      return { file, voice, music };
    } else addToBatch(batch, 1, `Asset added: ${d.rel}`);
    return { file, voice };
  }

  // the voice-over and Export to AE, their own files (audit/112 §2.9); the film's helpers they share with the rest of this file
  const film = { jobs, meta, workDir, commit, note, relativeTo };
  const voice = voiceRoutes(ctx, { r, P, mustProject, HttpError, film });
  const { voiceOf, audioPath, sampleFile, useVoice, startTranscribe } = voice;
  const ae = aeRoutes(ctx, { r, P, mustProject, HttpError, film });

  const raw = [
    // Import assets: the body is the file; it is copied into the project by kind (assets/<kind>/ or sources/). An audio file
    // with the role "voiceover" (or a talking-head video) becomes the voice-over and is transcribed at once; Claude is told in the chat.
    ["POST", new RegExp(`^/api/projects/${P}/assets/upload$`), async ([id], req) => {
      const p = mustProject(id, root);
      if (ctx.renders?.isRendering(id)) throw new HttpError(409, "RENDERING", "The film is being rendered: wait until the render finishes");
      const batch = fileComing(p);          // no commit while this file is coming
      try { return await takeFile(p, req, batch); } finally { fileLanded(batch); }
    }],
    // upload: the body is the file itself (X-File-Name header); always followed by transcription when a model is ready
    ["POST", new RegExp(`^/api/projects/${P}/voice/upload$`), async ([id], req) => {
      const p = mustProject(id, root);
      const name = safeName(decodeURIComponent(req.headers["x-file-name"] ?? ""), "voiceover");
      const ext = extname(name).toLowerCase();
      if (!AUDIO_TYPES[ext]) throw new HttpError(400, "INVALID", `Use an audio file (${Object.keys(AUDIO_TYPES).join(", ")})`);
      if (Number(req.headers["content-length"] ?? 0) > MAX_BYTES) throw new HttpError(413, "TOO_LARGE", "The file is over 1 GB");
      const dir = join(p.path, "assets", "3_audio", "voiceover");
      mkdirSync(dir, { recursive: true });
      const base = basename(name, ext).slice(0, 60) || "voiceover";
      let dest = join(dir, base + ext);
      for (let i = 2; existsSync(dest); i++) dest = join(dir, `${base} (${i})${ext}`);
      let n = 0;
      const limit = async function* (src) { for await (const c of src) { n += c.length; if (n > MAX_BYTES) throw new HttpError(413, "TOO_LARGE", "The file is over 1 GB"); yield c; } };
      await pipeline(req, limit, createWriteStream(dest + ".part"));
      let info;
      try { info = await probe(dest + ".part", root); } catch (e) { rmSync(dest + ".part", { force: true }); throw new HttpError(400, "INVALID", e.code === "INVALID" ? e.message : "This file could not be read as audio"); }
      // the file that is the voice already: nothing to replace, its script, words and cut stay (T37-6)
      const cur = voiceOf(p);
      if (cur?.file && await projects.sameBytes(join(p.path, ...cur.file.split("/")), dest + ".part")) { rmSync(dest + ".part", { force: true }); return { voice: cur, same: true }; }
      renameSync(dest + ".part", dest);
      return useVoice(p, dest, info, { source: "upload", size: n });
    }],
    // a sample of a voice on the script's first lines (Voice screen), out of the film's files
    ["GET", new RegExp(`^/api/projects/${P}/voice/sample/([a-f0-9]{24})$`), async ([id, hash], req, q, res) => {
      const f = sampleFile(mustProject(id, root), hash);
      if (!existsSync(f)) throw new HttpError(404, "NOT_FOUND", "No such sample");
      res.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": statSync(f).size, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      await pipeline(createReadStream(f), res);
      return null;
    }],
    // the audio itself, for the player and the waveform (fetched with the token, played from a blob)
    ["GET", new RegExp(`^/api/projects/${P}/voice/audio$`), async ([id], req, q, res) => {
      const p = mustProject(id, root);
      const f = audioPath(p);
      if (!f || !existsSync(f)) throw new HttpError(404, "NOT_FOUND", "No voice-over audio");
      res.writeHead(200, { "Content-Type": AUDIO_TYPES[extname(f).toLowerCase()] ?? "application/octet-stream", "Content-Length": statSync(f).size, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      await pipeline(createReadStream(f), res);
      return null;
    }],
  ];

  const routes = [
    // ---- service keys and speech-to-text settings (Settings › System › Voice-over; the speech models in Settings › System)
    r("GET", "/voice/settings", () => ({ settings: asr.voiceSettings(root), models: asr.models(root), modelsRoot: asr.modelsRoot(root), keys: secrets.status(root),
      providers: Object.entries(PROVIDERS).filter(([, x]) => !x.local).map(([id, x]) => ({ id, title: x.title })), jobs: jobs.list({ kind: "model-install" }).slice(0, 5) })),
    r("PATCH", "/voice/settings", (_p, b) => ({ settings: asr.saveVoiceSettings(b, root) })),
    r("PUT", "/voice/keys/(elevenlabs)", ([name], b) => { clearVoiceLists(name); return secrets.setSecret(name, b.value, root); }),
    r("POST", "/voice/keys/(elevenlabs)/clear", ([name]) => { clearVoiceLists(name); return secrets.clearSecret(name, root); }),
    r("POST", "/voice/keys/(elevenlabs)/test", async ([name]) => {
      const key = secrets.getSecret(name, root);
      if (!key) throw err("INVALID", "Save the key first");
      return PROVIDERS[name].test(key);
    }),
    r("GET", "/voice/providers/(elevenlabs|kokoro)/voices", async ([name], _b, q) => {
      const key = PROVIDERS[name].local ? null : secrets.getSecret(name, root);
      if (!key && !PROVIDERS[name].local) throw err("INVALID", `Add the ${PROVIDERS[name].title} key in Studio Settings first`);
      // read at once with 45 s a call and kept 10 min per service and language (T25: a busy computer's 25 s failure); ?lang= the film's
      // language, ?fresh=1 reads it again
      return voiceList(name, key, { lang: q.get("lang") === "en" ? "en" : "vi", fresh: q.get("fresh") === "1" });
    }),

    ...voice.routes,          // the voice-over (server/voice.mjs)
    // ---- the music map for the user to read, with the timed lyrics: the beat file `hyperframes beats` writes for the music track, read
    // the way HF reads it (hf-edit/beats.mjs); its length is the track's own, never the last beat
    r("GET", `/projects/${P}/beats`, async ([id]) => {
      const p = mustProject(id, root);
      const tr = await musicTrackBeats(p), b = tr?.beats ?? null;
      const map = b ? { source: "hyperframes beats", audio: { title: tr.title, duration_sec: tr.duration }, tempo: { bpm: b.bpm, n_beats: b.times.length },
        beats: b.times.map((time, i) => ({ time, strength: b.strengths[i] })) } : null;
      const lines = [];
      for (const w of lyrics.read(p.path).words.filter((x) => x.layer !== "backing")) {
        const l = (lines[w.line - 1] ??= { line: w.line, text: "", start: w.start, end: w.end, heard: 0, words: 0 });
        Object.assign(l, { text: `${l.text} ${w.text}`.trim(), end: w.end, heard: l.heard + (w.sure === "heard" ? 1 : 0), words: l.words + 1 });
      }
      // used, the part of the song the film plays (song seconds), for the Music map to mark (Studio B reads used.start / used.end)
      return { at: b?.at ?? null, map, lyrics: lines.filter(Boolean), used: musicUsed(p.path, { trackDuration: tr?.duration ?? null }) };
    }),
    // ---- lyrics: the app transcribes speech, not singing; the user gives a song's lyrics and the app times them (Whisper Turbo)
    r("GET", `/projects/${P}/lyrics`, ([id]) => {
      const p = mustProject(id, root);
      const job = jobs.running().find((j) => j.kind === "lyrics" && j.projectId === id) ?? null;
      // gpu: Whisper runs on the graphics card here (the CUDA pack is in), so the sheet says the right wait
      const track = musicTrack(p);
      const read = lyrics.read(p.path);
      // the song fixed after the timing: the table speaks of a part the film no longer plays (T31-1)
      if (read.timed && lyrics.windowChanged(read.timed, musicUsed(p.path))) read.timed.windowOld = true;
      return { ...read, track, heard: lyrics.heardDraft(p.path, track), job: job?.id ?? null, gpu: asr.whisperDevice(root).gpu };
    }),
    r("PUT", `/projects/${P}/lyrics`, async ([id], b) => {
      const p = mustProject(id, root);
      const out = lyrics.save(p.path, b.text);
      await commit(p, "Lyrics saved");
      return { ...out, track: musicTrack(p) };
    }),
    r("POST", `/projects/${P}/lyrics/time`, ([id]) => {
      const p = mustProject(id, root);
      if (jobs.running().some((j) => j.kind === "lyrics" && j.projectId === id)) throw err("BUSY", "The lyrics are being timed already");
      const track = musicTrack(p);
      if (!track) throw err("INVALID", "Add the music track first");
      if (!lyrics.read(p.path).text.trim()) throw err("INVALID", "Paste the lyrics first");
      asr.readyModel(asr.voiceSettings(root).defaultModel, root);
      const onEnd = (job) => { if (job.status === "done") { try { ctx.autopilot?.advance?.(id)?.catch?.(() => {}); } catch { /* the user can go on */ } } };
      return jobs.start("lyrics", { projectId: id, title: "Timing the lyrics (Whisper turbo)", onEnd }, async (job) => {
        job.update({ stage: "listening" });
        // only the part of the song the film plays
        const window = musicUsed(p.path, { trackDuration: await trackLength(p, track) });
        const r = await lyrics.align(p.path, { track, window, workDir: workDir(p, "lyrics"), signal: job.signal, root, onEvent: (e) => { if (e.type === "info") job.update({ stage: "matching" }); } });
        meta(id, (m) => { (m.activity ??= []).unshift({ at: r.at, kind: "music", text: `Lyrics timed: ${r.heard} of ${r.heard + r.placed} words heard` }); });
        await commit(p, "Lyrics timed");
        note(p, { kind: "voice", text: "Lyrics timed: {h} of {n} words heard, the rest placed on the beats", vars: { h: r.heard, n: r.heard + r.placed } });
        return r;
      });
    }),

    // ---- export
    r("GET", `/projects/${P}/exports`, ([id]) => {
      const p = mustProject(id, root);
      const dir = join(p.path, "renders");
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => Object.values(FORMATS).includes(extname(f).toLowerCase()))
        .map((f) => { const s = statSync(join(dir, f)); return { name: f, path: join(dir, f), size: s.size, at: s.mtime.toISOString(), gates: existsSync(gatesFile(p.path, f)) }; })
        .sort((a, b) => (a.at < b.at ? 1 : -1)) : [];
      // the film's sizes for the dialog's boxes: the master, and each other size made (ready or out of date) with its state
      const sizes = extraSizes(p.meta).length ? { master: masterAspect(p.meta) ?? p.meta?.format?.aspect ?? null, rows: sizesOf(ctx, p).map(({ aspect, tag, width, height, status }) => ({ aspect, tag, width, height, status })) } : null;
      return { files, folder: dir, jobs: jobs.list({ kind: "export", projectId: id }).slice(0, 5), lastQa: p.meta?.lastQa ?? null, sizes,
        defaults: { width: p.width ?? p.meta?.format?.width, height: p.height ?? p.meta?.format?.height, fps: projects.projectFps(p), filename: basename(p.path) } };          // the rate the render uses
    }),
    // b.sizes: the sizes to render (the master and the other sizes made); none, or a film of one size: the render as before
    r("POST", `/projects/${P}/exports`, ([id], b) => startExports(mustProject(id, root), b)),
    r("POST", `/projects/${P}/files/(reveal|open)`, ([id, how], b) => {
      const p = mustProject(id, root);
      const f = resolve(p.path, String(b.path ?? ""));
      if (!f.startsWith(resolve(p.path) + sep) || !existsSync(f)) throw err("NOT_FOUND", "File not found in this project");
      // the file selected in its folder (a folder opened as is), the Explorer window brought to the front
      if (how === "reveal") { showInExplorer(f, { select: true }); return { ok: true }; }
      if (!statSync(f).isFile() || !OPENABLE.has(extname(f).toLowerCase())) throw err("INVALID", "Only films, sounds, pictures, documents and text files open from here");
      // not detached: a detached Windows PowerShell has no console and runs nothing; MW_NO_OPEN: tests
      if (process.env.MW_NO_OPEN !== "1") spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", OPEN_SCRIPT],
        { stdio: "ignore", windowsHide: true, env: { ...process.env, MW_TARGET: f } }).on("error", () => {}).unref();
      return { ok: true };
    }),

    // ---- QA
    r("GET", `/projects/${P}/qa`, async ([id]) => {
      const p = mustProject(id, root);
      const last = readJson(workDir(p, "qa", "last.json"), null);
      const head = existsSync(join(p.path, ".git")) ? await rev.headAsync(p.path) : null;
      return { report: last ? { ...last, stills: (last.stills ?? []).map((s) => ({ ...s, url: `${ctx.preview.base}/p/${id}/${s.path}` })) } : null,
        // the film changed, not the app's own records (a version, the pre-render, the Editor's opening write .moworks/ only)
        changedSince: !!last && !!head && last.revision !== head && await rev.changedSinceAsync(p.path, last.revision), job: jobs.list({ kind: "qa", projectId: id })[0] ?? null };
    }),
    r("POST", `/projects/${P}/qa`, ([id]) => startQa(mustProject(id, root), { onEnd: () => qaEnded(id) })),

    // ---- After Effects
    ...ae.routes,          // Export to AE (server/ae.mjs)

    // ---- jobs
    r("GET", `/jobs/${J}`, ([jid]) => { const j = jobs.get(jid); if (!j) throw err("NOT_FOUND", "Job not found"); return j; }),
    r("POST", `/jobs/${J}/cancel`, ([jid]) => jobs.cancel(jid)),
  ];
  /** A Google Slides link read as its PPTX into the project's design files, as an upload is: { ok, file } or { ok: false, reason }. */
  async function importSlides(p, link, { fetchFn = ctx.fetchSlides ?? fetch } = {}) {
    const got = await fetchSlides(link.id, { fetchFn });
    meta(p.id, (m) => { (m.links ??= {})[link.url] = { id: link.id, at: new Date().toISOString(), ok: got.ok, ...(got.ok ? {} : { reason: got.reason }) }; });
    if (!got.ok) return got;
    const d = saveSlides(projects.assetDestination(p.path, projects.safeFileName(got.name, "Google Slides.pptx")), got.bytes);
    meta(p.id, (m) => { m.links[link.url].file = d.rel; });
    rememberAssets(p.path, [d.rel]);
    note(p, { kind: "assets", text: "Added {n} file(s)", files: [d.rel] });
    await commit(p, `Asset added: ${d.rel} (Google Slides)`);
    try { ctx.autopilot?.filesAdded?.(p.id, [d.rel]); } catch { /* the note stands */ }
    return { ok: true, file: { name: d.rel.split("/").pop(), path: d.rel, area: d.area, folder: d.folder, kind: d.kind, size: got.bytes.length } };
  }
  /** The Google Slides links of the brief, read once each before Prepare; those that could not be read are kept for Prepare to ask about. */
  async function slidesFromBrief(p) {
    const done = p.meta?.links ?? {};
    for (const link of slidesLinks(p.meta?.brief?.text)) if (!done[link.url]?.ok) await importSlides(projects.getProject(p.id, root) ?? p, link).catch(() => null);
  }
  return { routes, raw, startQa, placeMusic, useVoice, startTranscribe, importSlides, slidesFromBrief };
}

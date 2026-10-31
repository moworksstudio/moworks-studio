// A film rendered in the background (every style gets one). A film painted by code draws each frame slowly (p5.brush:
// 0.5-2.5 s), so it cannot play smoothly live.
// - Brush cartoon: pre-rendered only. When the film is finished the app renders it once at full quality; the Editor shows only that MP4
//   and an export reuses it when nothing changed (no second render).
// - lemo, mg-styles-15, anidoodle: a draft MP4 the Editor plays while playing, the page drawn live when paused or scrubbing.
// Both at the film's own fps (HF renders at the film's size, never smaller), keyed by a hash of the film's own files (index.html,
// compositions/, CHARACTERS.json, the assets' names, sizes and dates) and its fps, so an edit makes it stale. Made once when the pipeline
// asks (the film built; the film finished; a change to a finished film), never on opening the project; light (BG_WORKERS, below-normal priority) and
// out of the app's render slot, so Render and the chat stay free. Kept in .moworks/cache/proxy/<hash>.mp4 (served by the preview origin).
// every film is rendered once it is built, at the export's quality (Brush: high), and Render reuses that file when
// neither the picture nor the sound changed; when only the sound changed (the picture and sound hashes kept apart), HyperFrames' own
// audio mix is put onto the rendered picture (remix.mjs) in seconds. An HTML film still plays live in the Editor.
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, sep } from "node:path";
import { promisify } from "node:util";
import { remixAudio, render } from "../hf-render-worker/client.mjs";
import { isCodeFilm } from "../pipeline/index.mjs";
import { expandEnv, loadPins, renderSettings } from "../version-manager/index.mjs";
import * as projects from "../project-service/index.mjs";
import { docPath } from "../project-service/docs.mjs";
import { refreshBridge } from "../hf-edit/lemoPage.mjs";
import { fitMusicToFilm } from "../hf-edit/tracks.mjs";
import { capWebBitrate, smoothCopy } from "../hf-qa/webBitrate.mjs";

const { projectFps } = projects;

const DIR = [".moworks", "cache", "proxy"];
/** Where a sound is mixed again: the computer's temp folder, not the film's. HF makes long-named folders inside it, and a film deep in the user's
 *  folders went past Windows' 248 characters for a folder (ENOENT from mkdtemp: the new sound never mixed). */
export const remixWorkDir = (hash) => join(tmpdir(), `mw-remix-${hash}`);
const AUDIO_TAG = /<audio\b[^>]*>(?:[\s\S]*?<\/audio>)?/gi;
const AUDIO_FILE = /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i;
// HF's element ids, written into the film's HTML when the Editor opens it (not a film change; older films also carry the ones HF Studio
// wrote). Opening the Editor stamped them on every element and <audio>, and the film's render and pre-render went stale with nothing drawn or heard changed.
const STUDIO_ID = /\s+data-hf-id="[^"]*"/g;
/** A page's text with its blank lines and the spaces at the ends of its lines left out: what an <audio> tag taken out leaves behind. */
const drawnText = (s) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).join("\n");
/** The film's files, hashed in two parts: the picture (index.html and the compositions without their <audio> tags,
 *  CHARACTERS.json, every asset but sound files: names, sizes and dates) at its fps, and the sound (every <audio> tag and the sound files
 *  under assets/ and audio/). HF's element ids count in neither. `drawn`: the picture once more with the pages' blank lines left out. The
 *  Final Mix taking a sound out leaves its tag's line empty, so the picture read as changed: a full render (3 min) for a sound alone,
 *  never the sound mixed again onto the picture (T25-3). `picture` stays as it was: the checks' hash and an export's reuse read it. */
export function filmParts(dir, fps, { stamps = false } = {}) {
  const pic = createHash("sha256"), snd = createHash("sha256"), drw = createHash("sha256");
  const both = (x) => { pic.update(x); drw.update(x); };
  const page = (s) => { pic.update(s); drw.update(drawnText(s)); };
  both(`fps:${fps}`);
  const text = (p) => { const s0 = readFileSync(p, "utf8"), s = stamps ? s0 : s0.replace(STUDIO_ID, ""); snd.update((s.match(AUDIO_TAG) ?? []).join("\n")); return s.replace(AUDIO_TAG, ""); };
  const walk = (d, deep, only = null) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n), s = statSync(p), rel = relative(dir, p).split(sep).join("/");
      if (s.isDirectory()) { if (!n.startsWith(".") && n !== "_app" && n !== "rounds") walk(p, deep, only); continue; }
      const sound = AUDIO_FILE.test(n);
      if (only === "sound" && !sound) continue;
      const add = sound ? (x) => snd.update(x) : both;
      add(rel);
      if (deep && /\.html?$/i.test(n)) page(text(p));
      else if (deep && /\.(js|mjs|json|css|ts)$/i.test(n)) add(readFileSync(p)); else add(`${s.size}:${Math.floor(s.mtimeMs)}`);
    }
  };
  if (existsSync(join(dir, "index.html"))) { both("index.html"); page(text(join(dir, "index.html"))); }
  if (existsSync(docPath(dir, "CHARACTERS.json"))) { both("CHARACTERS.json"); both(readFileSync(docPath(dir, "CHARACTERS.json"))); }
  walk(join(dir, "compositions"), true);
  walk(join(dir, "assets"), false);
  walk(join(dir, "audio"), false, "sound");
  return { picture: pic.digest("hex").slice(0, 16), sound: snd.digest("hex").slice(0, 16), drawn: drw.digest("hex").slice(0, 16) };
}
/** Whether every sound of the film sits on its root page (where the Final Mix places music, voice and effects): only then can the sound
 *  be mixed again onto a rendered picture (remix.mjs); a sound inside a sub-composition sends the film to a full render. */
export function soundOnRoot(dir) {
  const walk = (d) => existsSync(d) && readdirSync(d).some((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.html?$/i.test(n) && /<(audio|video)\b/i.test(readFileSync(p, "utf8")); });
  return !walk(join(dir, "compositions"));
}
/** The hash of what the film is drawn and heard from, at which fps. */
export function filmHash(dir, fps = null) {
  const { picture, sound } = filmParts(dir, fps);
  return createHash("sha256").update(`${picture}:${sound}`).digest("hex").slice(0, 16);
}
/** The proxy's length and whether it has sound (the film's own audio, mixed by HF like an export): the player mutes itself while it plays. */
async function probe(file, root) {
  const exe = join(expandEnv(loadPins(root).ffmpeg.dir), "ffprobe.exe");
  const { stdout } = await promisify(execFile)(exe, ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", file], { windowsHide: true });
  const j = JSON.parse(stdout);
  return { duration: Number(j.format?.duration) || null, audio: (j.streams ?? []).some((s) => s.codec_type === "audio") };
}
const stateFile = (dir) => join(dir, ...DIR, "proxy.json");
const readState = (dir) => { try { return JSON.parse(readFileSync(stateFile(dir), "utf8")); } catch { return null; } };

/** Brush cartoon films are rendered once, at full quality, and only that file is shown and exported; the other code
 *  films keep a draft preview next to their live page. */
export const prerendered = (styleId) => styleId === "brush-cartoon";
/** HF's capture workers for a background render: few, so the computer stays usable (MW_BG_WORKERS: measurements). */
export const BG_WORKERS = Number(process.env.MW_BG_WORKERS ?? 2);
/** The graphics card's free memory in MB (nvidia-smi), or null when it cannot be read. Each capture worker is a Chrome that keeps a few GB
 *  of it while a p5.brush page renders (12-14 GB of 16 in use with two). */
export function freeGpuMb() {
  try { return Number(execFileSync("nvidia-smi", ["--query-gpu=memory.free", "--format=csv,noheader,nounits"], { encoding: "utf8", windowsHide: true, timeout: 5000 }).trim().split("\n")[0]) || null; }
  catch { return null; }
}
/** How many capture workers a background render takes now: BG_WORKERS, but one when the card has under 8 GB free (the user's other
 *  programs keep theirs; the PC stays usable). */
export const bgWorkers = (free = freeGpuMb()) => (gpuShort(free) ? 1 : BG_WORKERS);
/** Under 8 GB free on the graphics card: one Chrome at a time (background renders, the Review's round). */
export const gpuShort = (free = freeGpuMb()) => free != null && free < 8000;
// the time a frame takes in a background render before this film has one of its own measured (ms; measured)
const MS_PER_FRAME = { prerendered: 700, preview: 250 };
const finished = (m) => { const pl = m?.pipeline ?? {}; return !!(pl.finished !== undefined ? pl.finished : pl.delivered); };
/** The film's length in seconds, from its root's data-duration. */
const filmSeconds = (dir) => {
  try {
    const tag = /<[^>]*data-composition-id="[^"]*"[^>]*>/.exec(readFileSync(join(dir, "index.html"), "utf8"))?.[0] ?? "";
    return Number(/data-duration="([0-9.]+)"/.exec(tag)?.[1]) || null;
  } catch { return null; }
};

export function proxyRoutes(ctx, { r, P, mustProject }) {
  const root = ctx.root, running = new Map(), smoothing = new Set();          // smoothing: jobs that only make the Smooth copy
  const again = new Set();          // films asked for again while their job ran
  const url = (id, rel) => `${ctx.preview.base}/p/${id}/${rel}`;
  // the job as the app shows it (its record, not a handle): id, stage, progress, what it waits for
  const pub = (j) => { const r = j && (ctx.jobs.get?.(j.id) ?? j); return r ? { id: r.id, kind: r.kind, status: r.status, stage: r.stage, progress: r.progress ?? null, waitingFor: r.waitingFor ?? null } : null; };
  const QUALITY_RANK = { draft: 0, standard: 1, high: 2 };
  /** The quality a background render is made at: a Brush film's video-only render "high", every other film the export's "standard"
   *  (the file an export reuses is the export it would have made). */
  const qualityOf = (styleId) => (prerendered(styleId) ? "high" : "standard");
  // self: asked by the running job itself, which wants the film's state as if it were not there (it is what makes the status "rendering")
  const view = (p, { self = false } = {}) => {
    const hasFilm = existsSync(join(p.path, "index.html")), codeFilm = isCodeFilm(p.meta?.style?.id) && hasFilm;
    if (!hasFilm) return { codeFilm: false, mode: null, status: "none", url: null, at: null, fps: null, job: null };
    let st = readState(p.path);
    const file = st?.file && existsSync(join(p.path, ...st.file.split("/"))) ? st.file : null, pre = prerendered(p.meta?.style?.id);
    const fps = projectFps(p), parts = filmParts(p.path, fps);
    // a render recorded before Studio's ids left the hash (its hash read them): the same film, recorded again in today's terms, once
    if (file && st.picture !== parts.picture) {
      const old = filmParts(p.path, fps, { stamps: true });
      if (st.picture === old.picture) { st = { ...st, picture: parts.picture, sound: st.sound === old.sound ? parts.sound : st.sound }; writeState(p.path, st); }
    }
    // the Editor plays the Smooth copy of this very file (a keyframe every second) when it is there; Render reuses the file itself
    const smooth = file && st.smooth?.of === st.hash && existsSync(join(p.path, ...st.smooth.file.split("/"))) ? st.smooth.file : null;
    // a file counts when its picture is the film's now, at the quality this style renders at (an older draft preview does not); a page
    // whose only change is the empty line a sound taken out left is the same picture (drawn)
    const samePicture = st?.picture === parts.picture || (!!st?.drawn && st.drawn === parts.drawn);
    const picture = !!file && samePicture && (QUALITY_RANK[st.quality] ?? -1) >= QUALITY_RANK[qualityOf(p.meta?.style?.id)];
    const status = running.has(p.id) && !smoothing.has(p.id) && !self ? "rendering" : !file ? "none" : picture && st.sound === parts.sound ? "fresh" : "stale";
    const job = smoothing.has(p.id) ? null : pub(running.get(p.id));          // the Smooth copy alone is quiet: nothing to wait for
    // the time left (or the whole render before it starts), from this film's last render or the style's usual cost per frame
    const perFrame = st?.msPerFrame ?? MS_PER_FRAME[pre ? "prerendered" : "preview"], frames = Math.round((filmSeconds(p.path) ?? st?.duration ?? 0) * fps);
    const left = frames ? frames * perFrame * (job?.stage === "rendering" && job.progress != null ? 1 - job.progress / 100 : 1) : null;
    // codeFilm: the Editor plays this file only for a code film; an HTML film plays live and its file waits for the export
    return { codeFilm, mode: pre ? "prerendered" : codeFilm ? "preview" : "film", videoOnly: pre, quality: st?.quality ?? qualityOf(p.meta?.style?.id), status,
      soundOnly: status === "stale" && picture, url: file ? url(p.id, smooth ?? file) : null, at: st?.at ?? null,
      fps: st?.fps ?? fps, duration: st?.duration ?? null, audio: st?.audio ?? false, job, hash: st?.hash ?? null,
      etaMinutes: status === "fresh" || left == null ? null : Math.max(1, Math.round(left / 60000)),
      // before the film is finished there is nothing to render yet: the Editor says the video comes once the film is built
      waitsFor: status === "none" && !job && !finished(p.meta) ? "film" : null,
      needsSmooth: !!file && !smooth && (pre || codeFilm) };
  };
  // what a background render gives way to: another film's export (the app's one render at a time) and Claude changing this film. An
  // export of this film waits for this render instead and takes its file (preRendered below), so the two never wait on each other.
  const blocker = (p) => { if (ctx.agent?.running?.has(p.id)) return "Claude"; const x = ctx.renders?.status?.().running; return x && x.projectId !== p.id ? x.title : null; };
  const pause = (ms, signal) => new Promise((ok) => { const t = setTimeout(ok, ms); signal?.addEventListener("abort", () => { clearTimeout(t); ok(); }, { once: true }); });
  const writeState = (dir, st) => writeFileSync(stateFile(dir), JSON.stringify(st, null, 2) + "\n");
  const keepOnly = (dir, ...names) => { for (const f of readdirSync(dir)) if (f.endsWith(".mp4") && !names.includes(f)) rmSync(join(dir, f), { force: true }); };
  /** The Editor's Smooth copy of the film's render, a keyframe every second, for a film the Editor plays from
   *  its render (a code film, a Brush film); kept beside the render as <hash>.smooth.mp4. The state with it, or as it was when it fails. */
  const withSmooth = async (p, st, { signal = null } = {}) => {
    const pre = prerendered(p.meta?.style?.id), codeFilm = isCodeFilm(p.meta?.style?.id);
    if (!pre && !codeFilm) return st;
    const rel = `${DIR.join("/")}/${st.hash}.smooth.mp4`;
    try {
      const r = await smoothCopy(join(p.path, ...st.file.split("/")), join(p.path, ...rel.split("/")), { root, signal });
      const next = { ...st, smooth: { of: st.hash, file: rel, size: r.size, mbps: r.mbps, gop: r.gop } };
      writeState(p.path, next);
      keepOnly(join(p.path, ...DIR), basename(st.file), basename(rel));
      return next;
    } catch { return st; }
  };
  /** The film's sound mixed again onto the rendered picture: the film's new file, its state written. Seconds, not a render. */
  const remixOnto = async (p, st, fps, { signal = null, background = false } = {}) => {
    const parts = filmParts(p.path, fps), hash = createHash("sha256").update(`${parts.picture}:${parts.sound}`).digest("hex").slice(0, 16);
    const dir = join(p.path, ...DIR), rel = `${DIR.join("/")}/${hash}.mp4`, out = join(p.path, ...rel.split("/")), src = join(p.path, ...st.file.split("/"));
    const tmp = out === src ? out.replace(/\.mp4$/, ".remix.mp4") : out, t0 = Date.now();
    const res = await remixAudio({ projectDir: p.path, picture: src, outputPath: tmp, fps, duration: st.duration ?? filmSeconds(p.path), workDir: remixWorkDir(hash) },
      { signal, root, background, ffmpeg: join(expandEnv(loadPins(root).ffmpeg.dir), "ffmpeg.exe") });
    if (res.type !== "done") throw Object.assign(new Error(res.message ?? "The new sound could not be mixed onto the film"), { code: res.type === "cancelled" ? "CANCELLED" : "REMIX_FAILED" });
    if (tmp !== out) renameSync(tmp, out);
    keepOnly(dir, basename(out));
    const facts = await probe(out, root).catch(() => ({ duration: st.duration ?? null, audio: res.tracks > 0 }));
    // the picture as it reads now (only a blank line may differ: soundOnly), so the file is the film's now
    const next = { ...st, hash, file: rel, picture: parts.picture, drawn: parts.drawn, sound: parts.sound, at: new Date().toISOString(), remixed: { at: new Date().toISOString(), ms: Date.now() - t0, tracks: res.tracks }, ...facts };
    writeState(p.path, next);
    return next;
  };
  /** Start the render when there is no fresh one: the job, or null (fresh, or Claude is changing the film). Every film is rendered once it
   *  is built: a code film to play in the Editor, every film so that Render reuses it when neither its picture nor its
   *  sound changed; when only the sound changed, the sound is mixed again onto the picture (remixOnto) instead. It never takes the app's
   *  render slot, so Render and the chat stay free: it waits while an export runs or Claude changes the film, and stops (to start again
   *  later) when either begins. Light: BG_WORKERS capture workers at below-normal priority. `asked`: the user's Update, which waits
   *  for Claude instead of starting nothing. */
  const make = (p, { asked = false } = {}) => {
    const v = view(p);
    // asked again while one runs (the Final Mix changed the sound during it): that file is of the film as it was when it began, so the
    // film is looked at again once it ends (T25-3: the render ended stale, with no job, and the Editor said "Updating…" for good)
    if (running.has(p.id)) { again.add(p.id); return running.get(p.id); }
    if (v.status === "fresh" && v.needsSmooth) {          // a render made before the Smooth copy existed: only the copy
      const job = ctx.jobs.start("preview-proxy", { projectId: p.id, title: "Smooth preview" }, async (j) => {
        let ok = false;
        try { j.update({ stage: "smooth preview", progress: 50 }); const st = await withSmooth(p, readState(p.path), { signal: j.signal }); ok = true; return { hash: st.hash, file: st.file, smooth: st.smooth?.file ?? null }; }
        finally { running.delete(p.id); smoothing.delete(p.id); lookAgain(p.id, ok); }
      });
      running.set(p.id, job); smoothing.add(p.id);          // the render stays fresh and plays meanwhile
      return job;
    }
    if (!existsSync(join(p.path, "index.html")) || v.status === "fresh") return null;
    if (!asked && ctx.agent?.running?.has(p.id)) return null;
    const pre = prerendered(p.meta?.style?.id), quality = qualityOf(p.meta?.style?.id);
    const job = ctx.jobs.start("preview-proxy", { projectId: p.id, title: pre || !v.codeFilm ? "Rendering the film" : "Smooth preview" }, async (j) => {
      let ok = false;
      try {
        for (let attempt = 0; ; attempt++) {
          for (let b = blocker(p); b && !j.signal.aborted; b = blocker(p)) { j.update({ stage: "waiting", waitingFor: b }); await pause(2000, j.signal); }
          if (j.signal.aborted) throw Object.assign(new Error("Stopped"), { code: "CANCELLED" });
          const fresh = projects.getProject(p.id, root) ?? p;
          projects.keepRootFps(fresh);          // the film's data-fps on its root, as an export does (so the export finds this file fresh)
          fitMusicToFilm(p.path);          // the music fitted to the film's end, as an export does
          refreshBridge(p.path);          // today's bridge, as an export does
          const fps = projectFps(fresh), parts = filmParts(p.path, fps), hash = filmHash(p.path, fps), dir = join(p.path, ...DIR), rel = `${DIR.join("/")}/${hash}.mp4`;
          mkdirSync(dir, { recursive: true });
          // (asked without `self` it read "rendering", never sound-only: every sound changed on a finished film rendered the whole film again)
          const st0 = readState(p.path), now = view(fresh, { self: true });
          if (now.soundOnly && soundOnRoot(p.path)) {          // the picture is rendered: only its sound again
            j.update({ stage: "mixing the sound", waitingFor: null, progress: 50 });
            const next = await remixOnto(p, st0, fps, { signal: j.signal, background: true });
            await withSmooth(fresh, next, { signal: j.signal });          // the new sound in the Smooth copy too
            ok = true;
            return { hash: next.hash, file: next.file, remixed: true };
          }
          j.update({ stage: "rendering", waitingFor: null, progress: 0 });
          const ac = new AbortController(), stop = () => ac.abort();
          j.signal.addEventListener("abort", stop, { once: true });
          let yielded = null;
          const watch = setInterval(() => { const b = blocker(p); if (b) { yielded = b; ac.abort(); } }, 1000);
          const t0 = Date.now(), workers = bgWorkers(), gpu = renderSettings(root).gpu === "cpu" ? "software" : "auto";          // Settings' GPU choice, as an export
          j.update({ workers });
          const res = await render({ projectDir: p.path, outputPath: join(p.path, ...rel.split("/")), fps, format: "mp4", quality, workers, browserGpuMode: gpu }, {
            signal: ac.signal, root, background: true, onEvent: (e) => { if (e.type === "progress" && typeof e.pct === "number") j.update({ progress: Math.round(e.pct) }); } });
          clearInterval(watch); j.signal.removeEventListener("abort", stop);
          if (res.type === "cancelled" && yielded && !j.signal.aborted && attempt < 5) continue;          // gave way: start again once it is quiet
          if (res.type !== "done") throw Object.assign(new Error(res.message ?? "The film could not be rendered"), { code: res.type === "cancelled" ? "CANCELLED" : res.code ?? "RENDER_FAILED" });
          // a Standard pre-render is what Render hands over and what Smooth plays: held to the web ceiling as the export is (a grainy
          // 1920s film was 26 Mbps; Smooth stalled a second at a cut)
          if (quality === "standard") await capWebBitrate(join(p.path, ...rel.split("/")), { root, signal: j.signal }).catch(() => null);
          const facts = await probe(join(p.path, ...rel.split("/")), root).catch(() => ({ duration: null, audio: false }));
          keepOnly(dir, `${hash}.mp4`);          // only the newest file
          const frames = res.totalFrames ?? Math.round((facts.duration ?? 0) * fps), msPerFrame = frames ? Math.round((Date.now() - t0) / frames) : null;
          const st1 = { hash, picture: parts.picture, drawn: parts.drawn, sound: parts.sound, file: rel, at: new Date().toISOString(), fps, quality, msPerFrame, ms: Date.now() - t0, gpu, workers, ...facts };
          writeState(p.path, st1);
          j.update({ stage: "smooth preview", progress: 100 });
          await withSmooth(fresh, st1, { signal: j.signal });
          ok = true;
          return { hash, file: rel, ...facts };
        }
      } finally { running.delete(p.id); lookAgain(p.id, ok); }
    });
    running.set(p.id, job);
    return job;
  };
  /** A job that ended well while the film was changed again: made again now when it is not fresh (the sound mixed again in seconds when
   *  only the sound changed). Not after a stop or a failure: the next change, or the Editor's Update, asks again. */
  const lookAgain = (id, ok) => {
    if (!again.delete(id) || !ok) return;
    setTimeout(() => { try { make(mustProject(id, root)); } catch { /* the next change asks again */ } }, 0);
  };
  // the pipeline calls this when a film is built and when it is finished, and again after a change to a finished film (the autopilot); nothing else starts
  // it: not opening the project, not the Editor's polls
  ctx.previewProxy = (projectId) => { try { const p = mustProject(projectId, root); return make(p); } catch { return null; } };
  /** What an export that reused the film's render says about it: when it was made, how long it took, on the GPU or the CPU, and
   *  whether its sound was mixed again. */
  ctx.preRenderInfo = (p) => { const st = readState(p.path); return st ? { at: st.at ?? null, ms: st.ms ?? null, gpu: st.gpu ?? null, workers: st.workers ?? null, remixed: st.remixed ?? null } : null; };
  /** An export reuses the film's background render: when neither its picture nor its sound changed, the file as it
   *  is; when only the sound changed (every sound on the root page), the sound mixed again onto it first. A render of the film as it is
   *  now that is still running is waited for. The file, or null (a webm or mov, another fps, a lower quality than asked, a changed picture). */
  ctx.preRendered = async (p, { format, fps, quality = "standard", signal = null }, onWait = () => {}) => {
    if (format !== "mp4" || !existsSync(join(p.path, "index.html"))) return null;
    for (let v = view(p); v.status === "rendering"; v = view(p)) { onWait(`waiting for the film's render (${pub(running.get(p.id))?.progress ?? 0}%)`); await pause(2000, signal); if (signal?.aborted) return null; }
    const v = view(p), st = readState(p.path);
    if (!st || st.fps !== fps || (QUALITY_RANK[st.quality] ?? -1) < (QUALITY_RANK[quality] ?? 1)) return null;
    if (v.status === "fresh") return join(p.path, ...st.file.split("/"));
    if (!v.soundOnly || !soundOnRoot(p.path)) return null;
    onWait("mixing the new sound onto the rendered film");
    const next = await remixOnto(p, st, fps, { signal });
    return join(p.path, ...next.file.split("/"));
  };
  const routes = [
    r("GET", `/projects/${P}/preview-proxy`, ([id]) => view(mustProject(id, root))),
    // the Editor's Update on a preview that is out of date: made now, after Claude's change when Claude is at work (the job waits for it)
    r("POST", `/projects/${P}/preview-proxy`, ([id]) => { const p = mustProject(id, root); const job = make(p, { asked: true }); return { ...view(p), job: pub(job) }; }),
  ];
  return { routes };
}

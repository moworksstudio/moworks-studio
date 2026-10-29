// Production routes: voice-over (upload, transcription first, transcript review, ElevenLabs / Fish
// Audio), service keys, speech-to-text models, Export Video, QA and Export to AE. Long work runs as background jobs (jobs.mjs); nothing here
// blocks the server's event loop on HyperFrames, FFmpeg or After Effects (child processes or the render worker).
import { stampBase, stampParts } from "../render-names/index.mjs";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import * as projects from "../project-service/index.mjs";
import { musicSrc, readBeats } from "../hf-edit/beats.mjs";
import { showInExplorer } from "../project-service/explorer.mjs";
import { rememberAssets } from "../project-service/assets.mjs";
import * as rev from "../revisions/index.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { qaFacts } from "../pipeline/index.mjs";
import { snapshotAtAsync } from "../hf-qa/cli.mjs";
import { dynamicOf } from "../hf-qa/qc.mjs";
import { findingShot, plainFinding } from "../hf-qa/plain.mjs";
import { measureStills, stillGate } from "../hf-qa/stillness.mjs";
import { endingGate, measureEnding } from "../hf-qa/ending.mjs";
import { styleTraits } from "../style-catalog/traits.mjs";
import { render } from "../hf-render-worker/client.mjs";
import { chooseGpu } from "../hf-render-worker/gpu.mjs";
import { aeRunning, aeRunningAsync, canvasCount, plainLog } from "../ae-export/index.mjs";
import * as secrets from "../secrets/index.mjs";
import { PROVIDERS, SETTINGS, pickModel, voiceSettings } from "../voice/tts.mjs";
import { AUDIO_TYPES, MAX_BYTES, extractAudio, peaks, probe } from "../voice/audio.mjs";
import * as asr from "../voice/asr.mjs";
import * as transcript from "../voice/transcript.mjs";
import * as lyrics from "../voice/lyrics.mjs";
import { scriptDraft } from "../voice/script.mjs";
import { MASTER, loudness, masterLoudness } from "../hf-qa/loudness.mjs";
import { capWebBitrate } from "../hf-qa/webBitrate.mjs";
import { analyseBeats, fitMusicToFilm, musicUsed, placeTrack } from "../hf-edit/tracks.mjs";
import { refreshBridge } from "../hf-edit/lemoPage.mjs";
import { resolveRuntime } from "../version-manager/index.mjs";
import { filmHash } from "./proxy.mjs";
import { freshFilm } from "../hf-edit/codeFilm.mjs";
import { fetchSlides, saveSlides, slidesLinks } from "./slides.mjs";

const APP_ROOT_DIR = resolve(import.meta.dirname, "..", "..");
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const writeJson = (p, v) => { mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + "\n"); };

/** What the checks read, as one hash: the film's picture (filmHash: index.html, compositions/, CHARACTERS.json,
 *  the assets) and its sound (assets/ and audio/: names, sizes, dates), the bundled fonts and libraries (assets/_app), the HyperFrames
 *  version and the checks' own code. The same hash means the same answers, so a Render after Tech checks on an unchanged film does not
 *  run them again; any change to the picture, the sound or the checks runs them again. */
export function gateHash(projectDir, fps = null, root = APP_ROOT_DIR) {
  const h = createHash("sha256");
  h.update(filmHash(projectDir, fps));
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n), st = statSync(p);
      if (st.isDirectory()) { if (!n.startsWith(".")) walk(p); continue; }
      h.update(`${p.slice(projectDir.length)}:${st.size}:${Math.floor(st.mtimeMs)}`);
    }
  };
  walk(join(projectDir, "assets", "_app")); walk(join(projectDir, "audio"));
  try { h.update(resolveRuntime(null, root).version ?? ""); } catch { /* no runtime: the hash still changes with the film */ }
  h.update(checksCode(root));
  return h.digest("hex").slice(0, 16);
}
/** The checks' own code as this app run has it, read once (read from disk at every call, an edit of the checks' files by
 *  another process between the automatic checks and Render made the Render run them again; an update restarts the app, so it still counts). */
const codeHashes = new Map();
function checksCode(root) {
  if (!codeHashes.has(root)) {
    const h = createHash("sha256");
    for (const m of ["gates.mjs", "qc.mjs", "gates-cli.mjs"]) { try { h.update(readFileSync(join(root, "packages", "hf-qa", m))); } catch { /* fine */ } }
    codeHashes.set(root, h.digest("hex"));
  }
  return codeHashes.get(root);
}
/** The last checks of a film, kept by its gate hash: .moworks/cache/gates/checked.json { key, blank, at, gates }. */
const checkedFile = (projectDir) => join(projectDir, ".moworks", "cache", "gates", "checked.json");
/** Checks that can stand for a new run: the same hash, with the blank-scene stills when they are asked for, and a script check that
 *  finished (one that ran out of time checked only part of the film: it runs again). */
export function reusableChecks(projectDir, key, { blank = false } = {}) {
  const c = readJson(checkedFile(projectDir), null);
  if (!c || c.key !== key || (blank && !c.blank) || !c.gates) return null;
  if ((c.gates.gates ?? []).some((g) => g.timedOut)) return null;
  return c;
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
/** The results of an older render, next to its film in renders/, move into the project's own folder (the next time the app touches it). */
export function moveOldGates(projectDir) {
  const dir = join(projectDir, "renders");
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".gates.json"))) {
    const to = gatesFile(projectDir, f.slice(0, -".gates.json".length));
    try {
      mkdirSync(join(to, ".."), { recursive: true });
      if (existsSync(to) && statSync(to).mtimeMs >= statSync(join(dir, f)).mtimeMs) rmSync(join(dir, f), { force: true });          // a newer one is there
      else renameSync(join(dir, f), to);
      n++;
    } catch { /* in use: next time */ }
  }
  return n;
}
const err = (code, message) => Object.assign(new Error(message), { code });
const safeName = (s, fallback) => (String(s ?? "").normalize("NFC").replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || fallback);
/** A render's name (sorted by date first, then the film's name, then the time of the render):
 *  <YYMMDD>_<name>_<HHMM><ext> at local time; the seconds join when that name is taken, then -2, -3…; never
 *  a "", never an existing file. `ext` "" names a folder (Export to AE). */
export function stampedName(dir, name, ext = "", now = new Date()) {
  const { day, hm, sec } = stampParts(now), base = stampBase(name);          // the rule itself is shared with the Render dialog (packages/render-names)
  const stem = (tail) => `${day}_${base}_${tail}`;
  for (const s of [stem(hm), stem(hm + sec)]) if (!existsSync(join(dir, s + ext))) return s + ext;
  for (let i = 2; ; i++) { const s = stem(`${hm}${sec}-${i}`); if (!existsSync(join(dir, s + ext))) return s + ext; }
}
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

/** After Effects installs on this PC (Program Files\Adobe\Adobe After Effects*). */
export function aeInstalls() {
  const base = join(process.env.ProgramFiles ?? "C:\\Program Files", "Adobe");
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((n) => /^Adobe After Effects/i.test(n)).map((n) => {
    const sf = join(base, n, "Support Files");
    const exe = existsSync(sf) ? readdirSync(sf).find((f) => /^AfterFX.*\.exe$/i.test(f)) : null;   // AfterFX.exe, or "AfterFX (Beta).exe"
    return { name: n, exe: exe ? join(sf, exe) : null, version: /\(Beta\)/i.test(n) ? "Beta" : (/(\d{4})/.exec(n) ?? [])[1] ?? null };
  }).filter((x) => x.exe);
}

/** Render any time: only what would break the render stops it (script errors, missing files, remote URLs, fonts that are not here or
 *  lack Vietnamese letters); every other finding is a warning shown next to the result. */
const RENDER_LINT = new Set(["missing_local_asset", "placeholder_media_url"]);
export function renderVerdict(gates) {
  const blocking = [], warnings = [];
  for (const g of gates.gates ?? []) {
    if (g.pass) continue;
    if (g.id === "G-HF-LINT") {
      const hard = (g.findings ?? []).filter((f) => !f.code || RENDER_LINT.has(f.code));          // no code: HF's check gave no answer at all
      const soft = (g.findings ?? []).filter((f) => !hard.includes(f));
      if (hard.length) blocking.push({ ...g, findings: hard });
      if (soft.length) warnings.push({ ...g, blocking: false, findings: soft });
    } else if (g.id === "G-HF-SCRIPT") {          // a check that ran out of time is a warning (results saved before the fix too)
      const late = (f) => f.code === "check_timed_out" || (f.code === "check_runtime_failure" && /deadline|timed? ?out/i.test(String(f.message ?? "")));
      const hard = g.blocking === false ? [] : (g.findings ?? []).filter((f) => !late(f));
      const soft = (g.findings ?? []).filter(late);
      if (hard.length || (!soft.length && g.blocking !== false)) blocking.push({ ...g, findings: hard.length ? hard : g.findings });
      if (soft.length) warnings.push({ ...g, blocking: false, findings: soft.map((f) => ({ ...f, severity: "warning", code: "check_timed_out", message: "Could not finish checking the scripts in time: no script error was found before the check stopped." })) });
    } else if (["G-BUILD", "G-REMOTE", "G-FONT", "G-GLYPH", "G-CONTRACT"].includes(g.id) || (g.id === "G-POSE" && g.blocking !== false)) blocking.push(g);
    else warnings.push({ ...g, blocking: false });
  }
  return { pass: blocking.length === 0, blocking, warnings };
}

/** Plain words for each check (deterministic checks apart from heuristic visual review). */
export const CHECKS = {
  "G-HF-LINT": { title: "Composition files", explain: "The film's files are well formed: their structure, timing and settings.", kind: "deterministic" },
  "G-HF-SCRIPT": { title: "Scripts in the preview", explain: "Plays the film in the background and looks for errors in its code.", kind: "deterministic" },
  "G-REMOTE": { title: "Works offline", explain: "Nothing is loaded from the internet while rendering (fonts, pictures, scripts must be local).", kind: "deterministic" },
  "G-FONT": { title: "Fonts available", explain: "Every font the film uses is on this computer.", kind: "deterministic" },
  "G-GLYPH": { title: "Vietnamese characters", explain: "Each font has every character the film writes, Vietnamese tone marks included.", kind: "deterministic" },
  "G-GLYPH-CODE": { title: "Vietnamese characters in the film's code", explain: "Words a film drawn by code writes (What If, anidoodle) in a face that lacks some Vietnamese letters: they would show in another face, or as a dash in anidoodle's drawn capitals. Read from the code: a warning, never a block.", kind: "heuristic" },
  "G-BUILD": { title: "The film's code compiles", explain: "A film drawn by code is built from its source first; a source that does not build would leave an older film to render.", kind: "deterministic" },
  "G-VOICE": { title: "The voice stays clear", explain: "Under a voice-over, the effects and the music stay at least 3 dB under the voice on every spoken word. A warning, never a block.", kind: "deterministic" },
  "G-POSE": { title: "Poses inside their limits", explain: "Draws every frame of an anidoodle film and checks each character's pose against its joint limits, and that nothing throws or logs an error.", kind: "deterministic" },
  "G-CONTRACT": { title: "Same film every time", explain: "An anidoodle film draws each frame the same way every time, so the render matches what you saw.", kind: "deterministic" },
  "G-HF-LAYOUT": { title: "Layout", explain: "At every cut: text that overlaps, hides, is cut off or runs out of the frame or its box.", kind: "deterministic" },
  "G-HF-CONTRAST": { title: "Contrast", explain: "Every text stands out enough from what is behind it to read easily.", kind: "deterministic" },
  "G-HF-MOTION": { title: "Motion", explain: "The moves the Motion Plan asks for are in the film.", kind: "deterministic" },
  "G-BLANK": { title: "Empty-looking scenes", explain: "Takes a few stills of each scene and flags a scene whose stills are all flat. A heuristic: it can miss or misjudge.", kind: "heuristic" },
  "G-END": { title: "The ending", explain: "Compares a still half a second before the end with the last frame: a film whose picture is still full on its last frame stops dead. The picture should fade out with the music (or after the end card). Not measured in a style with its author's own ending.", kind: "deterministic" },
  "G-STILL": { title: "Still stretches", explain: "Takes a still every 0.25 s and flags where the film's objects hold still for more than 2 s (the final hold excepted): the film should never look like a slideshow. A drift of a few pixels or a slight tilt counts as still. A heuristic: it can misjudge.", kind: "heuristic" },
};

export function productionRoutes(ctx, { r, P, mustProject, HttpError }) {
  const { root, jobs } = ctx;
  const J = "([a-z-]+-[0-9a-z]+)";
  const meta = (id, fn) => projects.updateMeta(id, fn, root);
  const commit = (p, msg) => { try { rev.ensureRepo(p.path); rev.commitAll(p.path, msg); } catch { /* revisions optional */ } ctx.backupProject(p.id); };
  const workDir = (p, ...xs) => join(p.path, ".moworks", "cache", ...xs);
  const voiceOf = (p) => projects.getProject(p.id, root)?.meta?.voice ?? null;
  const audioPath = (p) => { const v = voiceOf(p); return v?.file ? join(p.path, ...v.file.split("/")) : null; };
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

  // ---- transcription: always the first step after new audio
  /** Words to expect, for Whisper's spelling: what the user typed for this project, else the brand and the start of the script. */
  const hintsFor = (p) => {
    const m = projects.getProject(p.id, root)?.meta ?? {};
    if (typeof m.voice?.hints === "string") return m.voice.hints;
    return [m.brand, m.brief?.mode === "script" ? m.brief.text : ""].filter(Boolean).join(". ").replace(/\s+/g, " ").slice(0, 600);
  };

  function startTranscribe(p, { model, language, hints } = {}) {
    const s = asr.voiceSettings(root);
    const all = asr.models(root);
    const ready = (m) => m && m.installed && m.runtime.ok;
    // no model asked for: the default when it is ready, else any ready one (Turbo is the only model)
    const id = model ?? (ready(all.find((m) => m.id === s.defaultModel)) ? s.defaultModel : all.find(ready)?.id ?? s.defaultModel), lang = language ?? p.meta?.language?.id ?? s.language;          // Whisper's "Spoken in" follows the film's language
    const file = audioPath(p);
    if (!file || !existsSync(file)) throw err("INVALID", "Add the voice-over audio first");
    const card = all.find((m) => m.id === id);
    if (!card) throw err("INVALID", "Unknown speech-to-text model");
    if (typeof hints === "string") meta(p.id, (m) => { m.voice = { ...(m.voice ?? {}), hints: hints.slice(0, 600) }; });
    const prompt = typeof hints === "string" ? hints : hintsFor(p);
    if (!card.installed || !card.runtime.ok) throw err("MODEL_MISSING", !card.installed ? `${card.short} is not installed yet` : `${card.short} cannot run yet: ${card.runtime.message}`);
    meta(p.id, (m) => { m.voice = { ...(m.voice ?? {}), transcript: { status: "transcribing", model: id, language: lang, at: new Date().toISOString() } }; });
    // when the words are in, a Prepare waiting for them starts (or one that ran before them checks them)
    const onEnd = (job) => { if (job.status === "done") { try { ctx.autopilot?.transcriptLanded?.(p.id)?.catch?.(() => {}); } catch { /* the user can go on */ } } };
    return jobs.start("transcribe", { projectId: p.id, title: `Transcribing (${card.short})`, model: id, onEnd }, async (job) => {
      job.update({ stage: "loading model" });
      const result = await asr.transcribe(file, { model: id, language: lang, prompt, workDir: workDir(p, "asr"), signal: job.signal, root,
        onEvent: (e) => {
          if (e.type === "info") job.update({ stage: "transcribing", detected: { language: e.language, probability: e.probability, device: e.device } });
          if (e.type === "progress") job.update({ progress: e.pct, segments: e.segments });
          if (e.type === "log") job.log(e.line);
        } }).catch((e) => { meta(p.id, (m) => { if (m.voice?.transcript) m.voice.transcript.status = e.code === "CANCELLED" ? "cancelled" : "failed"; }); throw e; });
      const t = transcript.fromEngine(p.path, { audio: voiceOf(p).file, result });
      meta(p.id, (m) => { m.voice.transcript = { status: "review", model: id, language: result.language, at: t.createdAt, segments: t.segments.length };
        (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Transcript ready (${card.short}, ${result.segments.length} segments)` }); });
      commit(p, "Voice-over transcribed");
      // a voice-over the app read from a script (ElevenLabs, Fish Audio) says that script word for word: its words are the
      // script's, at Whisper's times; when what was heard is far from the script (another take, an edited file) the user checks them
      const v0 = voiceOf(p), read = ["elevenlabs", "fishaudio"].includes(v0?.source) && v0?.script && v0.file === t.audio ? transcript.fromScript(t.segments, v0.script) : null;
      if (read && read.match < 0.6) {
        note(p, { kind: "voice", status: "warning", text: "The words heard differ from the script the voice was read from ({pct}% the same): check them in Transcript before the film is timed to them",
          vars: { pct: Math.round(read.match * 100) } });
        return { segments: result.segments.length, language: result.language, device: result.device, words: 0, script: { match: read.match } };
      }
      // the app uses Whisper's words at once: saved and on the timeline; the user corrects them in the
      // transcript dialog and sends them again when needed
      const words = saveTranscript(projects.getProject(p.id, root), read ? read.segments : t.segments);
      note(p, { kind: "voice", text: read && read.changed + read.missed ? "Transcript ready: {n} words, the film is timed to them; {k} word(s) taken from the script the voice was read from"
        : "Transcript ready: {n} words, the film is timed to them; open Transcript to correct them", vars: { n: words, k: read ? read.changed + read.missed : 0 } });
      return { segments: result.segments.length, language: result.language, device: result.device, words, ...(read ? { script: { match: read.match, changed: read.changed, missed: read.missed } } : {}) };
    });
  }

  /** All the gates (the blank-scene stills included) in a child process; Stop kills it. */
  const checkTimeFile = (p) => join(p.path, ".moworks", "cache", "qa", "check-time.json");
  // span: the job's progress from..to across the parts (the Tech checks job: its own bar moves with them)
  const gatesChild = (p, job, { blank = true, span = null } = {}) => new Promise((ok, no) => {
    const c = spawn(process.execPath, [join(root, "packages", "hf-qa", "gates-cli.mjs"), p.path, ...(blank ? ["--blank", workDir(p, "gates")] : [])], { windowsHide: true });
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
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    job.signal.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => {
      job.signal.removeEventListener("abort", kill);
      let out;
      try { out = JSON.parse(o); } catch { return no(err(job.signal.aborted ? "CANCELLED" : "CHECKS", `Tech checks could not run (exit ${code}) ${e.split(/\r?\n/).slice(-2).join(" ")}`)); }
      try { mkdirSync(join(p.path, ".moworks", "cache", "qa"), { recursive: true }); writeFileSync(checkTimeFile(p), JSON.stringify({ sec: Math.round((Date.now() - t0) / 1000), at: new Date().toISOString(), blank })); } catch { /* the next bar guesses less */ }
      ok(out);
    });
  });

  /** The checks for this film as it is now: the last ones when nothing they read changed since (gateHash), else a new run that is
   *  kept for the next time. The result says reused: { at } when it is the earlier run. */
  const gatesFor = async (p, job, { blank = true } = {}) => {
    const key = gateHash(p.path, projects.projectFps(projects.getProject(p.id, root) ?? p), root);
    const prev = reusableChecks(p.path, key, { blank });
    if (prev) { job.log?.(`checks: the film is unchanged since ${prev.at}: their results are reused`); return { ...prev.gates, reused: { at: prev.at } }; }
    // why a Render runs the checks itself: "changed" (the film changed since its last checks, e.g. a chat fix) or "never"
    job.update?.({ checksWhy: readJson(checkedFile(p.path), null) ? "changed" : "never" });
    const gates = await gatesChild(p, job, { blank });
    try { writeJson(checkedFile(p.path), { key, blank, at: new Date().toISOString(), gates }); } catch { /* the cache is best effort */ }
    return gates;
  };

  const note = (p, n) => { try { projects.addNote(p.path, n); } catch { /* notes are best effort */ } };
  /** The user's music track on the timeline, its beats measured by HyperFrames, recorded as the film's music. */
  const placeMusic = (p, rel, info, { start = null } = {}) => {
    placeTrack(p.path, { kind: "music", src: rel, duration: Number(info?.duration) || 1, start });
    const beats = analyseBeats(p.path, rel);
    meta(p.id, (m) => { m.music = { file: rel, duration: info?.duration ?? null, beats: beats.ok ? beats.file : null, at: new Date().toISOString() };
      (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "music", text: `Music on the timeline: ${basename(rel)}` }); });
    note(p, { kind: "voice", text: beats.ok ? "Music on the timeline, beats measured: {file}" : "Music on the timeline: {file}", vars: { file: basename(rel) } });
    return { file: rel, beats: beats.ok ? beats.file : null, beatsError: beats.ok ? null : beats.message };
  };

  // ---- Render (top bar): a quick check first (render-breaking issues only), then the HF render worker
  function startExport(p, b) {
    const format = FORMATS[b.format] ? b.format : "mp4";
    const quality = QUALITIES.includes(b.quality) ? b.quality : "standard";
    const master = ["kit", "loud", "off"].includes(b.master) ? b.master : "kit";          // the sound master: the kit's -16 LUFS by default
    // always the film's own rate: HyperFrames renders the timeline at any rate it is given, but the player,
    // frame-stepped motion and the film's data-fps follow the project's; a separate choice only disagreed with the timeline. b.fps is ignored.
    const fps = projects.projectFps(projects.getProject(p.id, root) ?? p);
    const name = safeName(b.filename, basename(p.path));
    const dir = join(p.path, "renders");
    mkdirSync(dir, { recursive: true });
    moveOldGates(p.path);
    const out = join(dir, stampedName(dir, name, FORMATS[format]));          // the date and time in the name, never ""
    // not while Claude changes the film (the render would catch it half-done); one render at a time in the app
    if (ctx.agent?.running?.has(p.id)) throw err("BUSY", "Claude is changing the film: render when it finishes");
    return jobs.start("export", { projectId: p.id, title: `Export ${basename(out)}`, output: out, settings: { format, quality, fps, filename: name, master } }, async (job) => {
      const release = ctx.renders ? await ctx.renders.acquire(p.id, p.title ?? basename(p.path), (other) => job.update({ stage: "waiting", waitingFor: other.title })) : () => {};
      try { return await renderNow(job); } finally { release(); }
    });
    async function renderNow(job) {
      projects.keepRootFps(projects.getProject(p.id, root) ?? p);          // the film's data-fps back on the root before HF reads it
      fitMusicToFilm(p.path);          // the music ends with the film, fading down with the picture (ending.mjs)
      refreshBridge(p.path);          // a code film built before a bridge change gets today's bridge
      commit(p, "Changes before render");
      job.update({ stage: "checks", revision: rev.head(p.path) });
      const gates = await gatesFor(p, job, { blank: false });          // Tech checks' results when the film is unchanged
      const verdict = renderVerdict(gates);
      writeJson(gatesFile(p.path, out), { ...gates, verdict });          // never in renders/
      job.update({ gates: { pass: verdict.pass, blockingFailures: verdict.blocking.map((g) => g.id), ...(gates.reused ? { reused: gates.reused } : {}) }, warnings: verdict.warnings });
      if (!verdict.pass) throw Object.assign(err("RENDER_BLOCKED", `Render stopped: ${verdict.blocking.map((g) => CHECKS[g.id]?.title ?? g.id).join(", ")}`), { detail: { verdict } });
      // a Brush cartoon film was rendered once when it was finished: when nothing changed since, that file is the export
      const pre = await ctx.preRendered?.(p, { format, fps, quality, signal: job.signal }, (stage) => job.update({ stage })).catch((e) => { job.log?.(`reuse: ${e.message}`); return null; });
      if (pre) {
        job.update({ stage: "copying the film", progress: 100, reused: true });
        copyFileSync(pre, out);
        return delivered({ type: "done", reused: true, reusedFrom: ctx.preRenderInfo?.(p) ?? null, logFile: null, totalFrames: null, duration: null, wallMs: 0, hfVersion: null }, { mode: "reused", reason: "pre-rendered", renderer: null, ms: 0 });
      }
      // GPU or CPU: one test frame on the GPU first; a failed or blank one sends this render to the CPU, said in one line
      job.update({ stage: "gpu check" });
      const gpu = await chooseGpu(p.path, { root, signal: job.signal });
      job.update({ gpu: { mode: gpu.mode, reason: gpu.reason, renderer: gpu.renderer } });
      if (gpu.fellBack) note(p, { kind: "render", status: "warning", text: "The GPU test frame came out {why}, so this render runs on the CPU (slower)",
        vars: { why: gpu.reason === "test-blank" ? "blank" : "wrong" } });
      job.update({ stage: "rendering", progress: 0 });
      const res = await render({ projectDir: p.path, outputPath: out, fps, format, quality, workers: FG_WORKERS, browserGpuMode: gpu.mode }, { signal: job.signal, root,
        logFile: join(root, "runtime", "logs", `export-${Date.now()}.log`),
        onEvent: (e) => {
          if (e.type === "progress") job.update({ stage: e.stage ? `rendering: ${e.stage}` : "rendering", progress: typeof e.pct === "number" ? Math.round(e.pct) : job.progress });
          if (e.type === "log" && e.level === "error") job.log(e.message);
        } });
      job.update({ logFile: res.logFile });
      if (res.type === "cancelled") throw err("CANCELLED", "Export stopped");
      if (res.type !== "done") throw Object.assign(err(res.code ?? "RENDER_FAILED", res.message ?? "The render failed"), { detail: { retryable: res.retryable ?? null, logFile: res.logFile, hf: res.hf ?? null } });
      return delivered(res, gpu);
    // the rendered (or reused) file: its sound mastered and measured, the export recorded, a version kept
    async function delivered(res, gpu) {
      // Standard is for the web: an MP4 over the web ceiling (grain, flicker) is encoded once more with a maxrate; High stays as HF made it
      let web = null;
      if (format === "mp4" && quality === "standard" && existsSync(out)) {
        job.update({ stage: "web size" });
        web = await capWebBitrate(out, { root, signal: job.signal }).catch((e) => { job.log?.(`web size: ${e.message}`); return null; });
      }
      const size = existsSync(out) ? statSync(out).size : 0;
      job.update({ stage: "loudness" });
      // the master to the studio rule (-16 LUFS, true peak at most -1 dBTP; -14 when the client asks), HyperFrames' two-pass loudnorm; then measured
      let loud = null;
      if (format === "mp4" || format === "mov") {
        const target = MASTER[master] ?? null;
        if (target) { job.update({ stage: "master loudness" }); await masterLoudness(out, { target, root }).catch((e) => job.log(`master loudness: ${e.message}`)); }
        loud = await loudness(out, { root, target: { lufs: (target ?? MASTER.kit).lufs, peak: (target ?? MASTER.kit).tp, tolerance: 1 } }).catch((e) => ({ error: e.message }));
        if (loud && !loud.error) loud.master = target ? master : "off";
      }
      meta(p.id, (m) => { (m.stages ??= {}).export = { status: "done" }; m.lastExport = { file: relativeTo(p.path, out), at: new Date().toISOString(), size, format, fps, quality, loudness: loud, ...(web?.capped ? { web } : {}) };
        (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "export", text: `Exported ${basename(out)}` }); });
      note(p, { kind: "render", text: "Render finished: {file}", vars: { file: basename(out) }, file: relativeTo(p.path, out), warnings: verdict.warnings.length });
      try { ctx.autopilot?.saveVersion(p.id, "render"); } catch { /* a version is best effort */ }          // each render is a version
      if (loud?.notes?.length) note(p, { kind: "render", status: "warning", text: "Sound: {lufs} LUFS, peak {peak} dBTP ({notes}); the mix target is -16 LUFS, peak at most -1", vars: { lufs: loud.lufs, peak: loud.truePeak, notes: loud.notes.join(", ") } });
      // "Took" is the whole wait from pressing Render (the checks, the GPU test, the frames, the sound), not the frames alone
      const whole = job.startedAt ? Date.now() - Date.parse(job.startedAt) : res.wallMs;
      return { loudness: loud, file: out, size, frames: res.totalFrames ?? null, duration: res.duration ?? null, wallMs: whole, renderMs: res.wallMs, hfVersion: res.hfVersion, logFile: res.logFile,
        gpu: { mode: gpu.mode, reason: gpu.reason, renderer: gpu.renderer, checkMs: gpu.ms }, ...(web?.capped ? { web } : {}), ...(res.reused ? { reused: true, reusedFrom: res.reusedFrom ?? null } : {}) };
    }
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
      projects.keepRootFps(projects.getProject(p.id, root) ?? p);          // `hyperframes check` and the stills read the root's data-fps
      fitMusicToFilm(p.path);
      refreshBridge(p.path);
      await freshFilm(p.path);          // the film as it is now, before the commit (G-BUILD would bundle it after)
      commit(p, "Changes before checks");
      const revision = rev.head(p.path) ?? "none";
      job.update({ stage: "checks", progress: 10 });
      // Tech checks run every time they are asked for, and keep their results for a Render of the same film
      const key = gateHash(p.path, projects.projectFps(projects.getProject(p.id, root) ?? p), root);
      const gates = await gatesChild(p, job, { span: [10, 60] });          // the top bar's "Running checks 10%" stood ~10 min
      try { writeJson(checkedFile(p.path), { key, blank: true, at: new Date().toISOString(), gates }); } catch { /* best effort */ }
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
        try { still = await measureStills(p.path, { shots: placedShots(shots, comp.duration), total: comp.duration, dynamic: dynamicOf(p.path), signal: job.signal, workDir: workDir(p, "still") }); }
        catch (e) { if (job.signal.aborted) throw e; stillErr = String(e.message).split(/\r?\n/)[0]; }
      } else stillErr = "the film has no length yet";
      gates.gates.push(stillGate(still, stillErr));
      // the ending: a hard cut on the last half second (house rules §9); a style with its author's own ending keeps it
      job.update({ stage: "the ending", progress: 90 });
      const own = styleTraits(projects.getProject(p.id, root)?.meta?.style?.id, root).ownEnding;
      let end = null, endErr = null;
      if (!own && comp?.duration > 0) {
        try { end = await measureEnding(p.path, { total: comp.duration, signal: job.signal, workDir: workDir(p, "end") }); }
        catch (e) { if (job.signal.aborted) throw e; endErr = String(e.message).split(/\r?\n/)[0]; }
      } else if (!own) endErr = "the film has no length yet";
      gates.gates.push(endingGate(end, { own, error: endErr, shot: placed.at(-1)?.number ?? null }));
      const shotOf = (file) => placed.find((s) => s.src && file && file.replace(/\\/g, "/").endsWith(s.src))?.number ?? null;
      // HF's findings found in their shot by the element's id (HF names index.html for the elements it tracks: the kite of shot 6
      // read as "shot: null"), each with one plain line for the user (`plain`)
      const hfFinding = (f, title) => { const at = findingShot(f, placed, p.path); return { ...f, file: at.file ?? f.file, shot: at.shot?.number ?? null, plain: plainFinding(f, { shot: at.shot, check: title }) }; };
      const report = { at: new Date().toISOString(), revision, pass: gates.pass, blockingFailures: gates.blockingFailures,
        checks: gates.gates.map((g) => { const c = CHECKS[g.id] ?? { title: g.id, explain: "", kind: "deterministic" };
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
        vars: { n: report.blockingFailures.length, what: report.blockingFailures.map((id) => CHECKS[id]?.title ?? id).join(", ") } });
      else if (wasFailing) note(p, { kind: "checks", status: "done", text: "Nothing stops the render any more" });
      return { pass: report.pass, blocking: report.blockingFailures.length };
    });
  }

  // ---- Export to AE: the existing aeExport() in a child process (packages/ae-export/cli.mjs --events)
  function startAe(p, b) {
    // always the film's own rate, like the render: b.fps is ignored; PortAE shows the rate from GET /ae
    const fps = String(projects.projectFps(projects.getProject(p.id, root) ?? p));
    const estimate = b.estimate === true;
    if (!estimate && !aeRunning()) throw err("AE_NOT_RUNNING", "Open After Effects first (with no dialog showing), then try again");
    // each export in its own folder named like a render (<YYMMDD>_<film>_<HHMM>), never over the one before; a size check writes nothing
    const aeRoot = join(p.path, "renders", "ae");
    const outDir = estimate ? join(p.path, ".moworks", "cache", "ae-estimate") : join(aeRoot, stampedName(aeRoot, basename(p.path)));
    return jobs.start(estimate ? "ae-estimate" : "ae", { projectId: p.id, title: estimate ? "Checking the AE export size" : "Export to After Effects", outDir }, async (job) => {
      projects.keepRootFps(projects.getProject(p.id, root) ?? p);
      fitMusicToFilm(p.path);
      commit(p, "Changes before Export to AE");
      // the Log the user reads has no addresses (plainLog); the whole log as written stays in the film's cache (port.log)
      const raw = [], log = (line) => { raw.push(line); job.log(plainLog(line)); };
      // Stop is the user's, not a failure: no exit code, said plainly
      const STOPPED = { status: "cancelled", code: "CANCELLED", message: "You stopped the export." };
      const port = (film) => job.signal.aborted ? Promise.resolve(STOPPED) : new Promise((ok) => {
        const args = [join(root, "packages", "ae-export", "cli.mjs"), p.path, "--fps", fps, "--out", outDir, "--events", ...(estimate ? ["--estimate"] : []), ...(film ? ["--film", film] : [])];
        const c = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
        job.signal.addEventListener("abort", kill, { once: true });
        let buf = "", final = null;
        const onLine = (line) => {
          if (line.startsWith("EVENT ")) {
            let e; try { e = JSON.parse(line.slice(6)); } catch { return; }
            if (e.type === "stage") job.update({ stage: e.stage, progress: e.total ? Math.round((e.done / e.total) * 100) : job.progress });
            if (e.type === "log") log(e.line);
          } else if (line.startsWith("RESULT ")) { try { final = JSON.parse(line.slice(7)); } catch { /* bad line */ } } else if (line.trim()) log(line);
        };
        c.stdout.on("data", (d) => { buf += d.toString("utf8"); let i; while ((i = buf.indexOf("\n")) >= 0) { onLine(buf.slice(0, i).replace(/\r$/, "")); buf = buf.slice(i + 1); } });
        c.stderr.on("data", (d) => log(d.toString("utf8").trim()));
        c.on("close", (code) => { job.signal.removeEventListener("abort", kill); if (buf) onLine(buf); ok(job.signal.aborted ? STOPPED : final ?? { status: "failed", code: "PORT_FAILED", message: `port exit ${code}` }); });
      });
      // a film drawn on a canvas only goes into AE as its rendered film: the film's background render when it is of the film
      // as it is now (a running one is waited for); a canvas film the port finds with none renders it here, then ports again
      const rendered = async (start) => {
        if (start) ctx.previewProxy?.(p.id);
        const f = await ctx.preRendered?.(p, { format: "mp4", fps: Number(fps), quality: "draft", signal: job.signal }, () => job.update({ stage: "film" })).catch(() => null);
        return f ?? null;
      };
      const film = estimate || !canvasCount(p.path) ? null : await rendered(false);
      let result = await port(film);
      if (result.code === "NEEDS_FILM" && !film && !job.signal.aborted) { const f = await rendered(true); if (f) result = await port(f); }
      if (job.signal.aborted) result = { ...STOPPED, outDir: result.outDir };
      if (result.message) result = { ...result, message: plainLog(result.message) };
      try { writeFileSync(workDir(p, "ae", estimate ? "estimate.log" : "port.log"), raw.join("\n") + "\n"); } catch { /* the cache folder is made by the export */ }
      // the size check is kept with the film it measured: the dialog says what AE gets (a canvas film) without checking again
      if (estimate && result.estimate) writeJson(workDir(p, "ae", "estimate.json"), { ...result.estimate, at: new Date().toISOString(), hash: filmHash(p.path, Number(fps)) });
      if (!estimate) writeJson(workDir(p, "ae", "last.json"), { ...result, at: new Date().toISOString(), fps, log: job.lines().slice(-80) });
      if (result.status === "cancelled") throw Object.assign(err("CANCELLED", STOPPED.message), { detail: result });
      if (result.status !== "done" && result.status !== "estimate") throw Object.assign(err(result.code ?? "PORT_FAILED", result.message ?? "The port failed"), { detail: result });
      if (!estimate) meta(p.id, (m) => { (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "ae", text: `Ported to After Effects (${basename(result.aep ?? "")})` }); });
      if (!estimate) note(p, { kind: "ae", text: "Export to AE finished: {file}", vars: { file: basename(result.aep ?? "") } });
      if (!estimate) { try { ctx.styleAe?.filmPorted(projects.getProject(p.id, root) ?? p); } catch { /* the badge waits for the next start */ } }          // its style's AE badge, when not measured yet
      return result;
    });
  }

  /** The transcript saved as HyperFrames' transcript.json and the voice-over put on the timeline (a talking-head clip's own sound stays in
   *  its video); byOwner: the user's corrected words (the transcript dialog's resend). Returns the number of words. */
  function saveTranscript(p, segments, { byOwner = false } = {}) {
    const out = transcript.save(p.path, segments, { workDir: workDir(p, "asr") });
    meta(p.id, (m) => { m.voice = { ...(m.voice ?? {}), transcript: { ...(m.voice?.transcript ?? {}), status: "saved", savedAt: out.transcript.savedAt, segments: out.transcript.segments.length, by: byOwner ? "owner" : "app" } };
      (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Transcript saved (${out.hf.words} words in transcript.json${byOwner ? ", corrected by the owner" : ""})` }); });
    const v = projects.getProject(p.id, root)?.meta?.voice;
    if (v?.file && !v.from && !v.offTimeline) { try { placeTrack(p.path, { kind: "voice", src: v.file, duration: Number(v.info?.duration) || 1 }); } catch { /* an index.html Studio cannot read stays as it is */ } }
    commit(p, "Transcript saved");
    return out.hf.words;
  }

  /** The project's voice-over is now this file: recorded in the project, committed, and transcribed at once. */
  function useVoice(p, dest, info, { source = "upload", size = 0, from = null } = {}) {
    const rel = relativeTo(p.path, dest);
    meta(p.id, (m) => { m.voice = { source, file: rel, name: basename(dest), size, info, addedAt: new Date().toISOString(), transcript: { status: "pending" }, ...(from ? { from } : {}) };
      (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Voice-over added: ${basename(dest)}` }); });
    commit(p, `Voice-over added: ${basename(dest)}`);
    let job = null, needsModel = null;
    try { job = startTranscribe(projects.getProject(p.id, root)); } catch (e) { needsModel = e.message; }
    return { voice: voiceOf(p), job, needsModel };
  }

  const raw = [
    // Import assets: the body is the file; it is copied into the project by kind (assets/<kind>/ or sources/). An audio file
    // with the role "voiceover" (or a talking-head video) becomes the voice-over and is transcribed at once; Claude is told in the chat.
    ["POST", new RegExp(`^/api/projects/${P}/assets/upload$`), async ([id], req) => {
      const p = mustProject(id, root);
      if (ctx.renders?.isRendering(id)) throw new HttpError(409, "RENDERING", "The film is being rendered: wait until the render finishes");
      const name = projects.safeFileName(decodeURIComponent(req.headers["x-file-name"] ?? ""), "file");
      // no role needed: the app sorts audio by name and length; an old client's role still counts
      const asked = projects.AUDIO_ROLES.includes(req.headers["x-asset-role"]) ? req.headers["x-asset-role"] : null;
      if (Number(req.headers["content-length"] ?? 0) > projects.MAX_ASSET_BYTES) throw new HttpError(413, "TOO_LARGE", "The file is over 4 GB");
      let d = projects.assetDestination(p.path, name, asked);
      let n = 0;
      const limit = async function* (src) { for await (const c of src) { n += c.length; if (n > projects.MAX_ASSET_BYTES) throw new HttpError(413, "TOO_LARGE", "The file is over 4 GB"); yield c; } };
      try { await pipeline(req, limit, createWriteStream(d.path + ".part")); } catch (e) { rmSync(d.path + ".part", { force: true }); throw e; }
      renameSync(d.path + ".part", d.path);
      let info = null;
      if (d.kind === "audio") {
        try { info = await probe(d.path, root); } catch { /* not readable as audio: stays where it is */ }
        if (!asked && info?.duration > 0 && info.duration < 3 && d.folder !== "3_audio/sfx") {          // a short sound is a sound effect
          const to = projects.assetDestination(p.path, basename(d.path), "sfx");
          renameSync(d.path, to.path); d = to;
        }
      }
      rememberAssets(p.path, [d.rel]);
      const role = asked ?? (d.kind === "audio" ? d.folder.split("/")[1] : null);
      const file = { name: basename(d.path), path: d.rel, area: d.area, folder: d.folder, kind: d.kind, size: n };
      note(p, { kind: "assets", text: "Added {n} file(s)", files: [d.rel] });
      try { ctx.autopilot?.filesAdded?.(id, [d.rel]); } catch { /* the note stands */ }          // Claude goes on when it was waiting for files
      let voice = null;
      const m0 = projects.getProject(id, root)?.meta ?? {};
      // the first voice-over is transcribed at once and the first music goes on the timeline; later ones wait for the user's choice in the Assets tab
      if (role === "voiceover" && (d.kind === "audio" || d.kind === "video") && (asked || !m0.voice?.file)) {
        try {
          let audio = d.path;
          if (d.kind === "video") {            // the clip's sound, for the transcript (the video itself stays in assets/video/)
            audio = projects.assetDestination(p.path, basename(d.path, extname(d.path)) + ".m4a", "voiceover").path;
            await extractAudio(d.path, audio, root);
          }
          voice = useVoice(p, audio, await probe(audio, root), { source: "upload", size: statSync(audio).size, from: d.kind === "video" ? d.rel : null });
        } catch (e) { voice = { error: e.code === "INVALID" ? e.message : "This file could not be read as audio" }; }
      } else if (role === "music" && d.kind === "audio" && (asked || !m0.music?.file)) {         // the user's track: on the timeline at once, its beats measured
        let music = null;
        try { music = placeMusic(p, d.rel, info ?? await probe(d.path, root)); } catch (e) { music = { error: e.message }; }
        commit(p, `Music added: ${d.rel}`);
        return { file, voice, music };
      } else commit(p, `Asset added: ${d.rel}`);
      return { file, voice };
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
      renameSync(dest + ".part", dest);
      return useVoice(p, dest, info, { source: "upload", size: n });
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
    // ---- service keys and speech-to-text settings (Settings › General › Voice-over; the speech models in Settings › System)
    r("GET", "/voice/settings", () => ({ settings: asr.voiceSettings(root), models: asr.models(root), modelsRoot: asr.modelsRoot(root), keys: secrets.status(root),
      providers: Object.entries(PROVIDERS).map(([id, x]) => ({ id, title: x.title })), jobs: jobs.list({ kind: "model-install" }).slice(0, 5) })),
    r("PATCH", "/voice/settings", (_p, b) => ({ settings: asr.saveVoiceSettings(b, root) })),
    r("PUT", "/voice/keys/(elevenlabs|fishaudio)", ([name], b) => secrets.setSecret(name, b.value, root)),
    r("POST", "/voice/keys/(elevenlabs|fishaudio)/clear", ([name]) => secrets.clearSecret(name, root)),
    r("POST", "/voice/keys/(elevenlabs|fishaudio)/test", async ([name]) => {
      const key = secrets.getSecret(name, root);
      if (!key) throw err("INVALID", "Save the key first");
      return PROVIDERS[name].test(key);
    }),
    r("GET", "/voice/providers/(elevenlabs|fishaudio)/voices", async ([name], _b, q) => {
      const key = secrets.getSecret(name, root);
      if (!key) throw err("INVALID", `Add the ${PROVIDERS[name].title} key in Settings first`);
      const models = await PROVIDERS[name].models(key);
      // the picker's first choice reads Vietnamese (the app's films are Vietnamese unless the brief says otherwise)
      // the settings the screen shows and the service's own defaults for each voice (its saved ones, else the service's)
      let defaults = {}; try { defaults = await PROVIDERS[name].defaultSettings(key); } catch { /* shown empty: the service still uses its own */ }
      const voices = (await PROVIDERS[name].voices(key, { q: q.get("q") ?? "" })).map(({ settings, ...v }) => ({ ...v, defaultSettings: { ...defaults, ...(settings ?? {}) } }));
      return { voices, models, settings: SETTINGS[name].map(({ default: _d, ...f }) => f), defaultSettings: defaults,
        defaultModel: name === "elevenlabs" ? pickModel(models, { lang: q.get("lang") === "en" ? "en" : "vi" }) : models[0]?.id ?? null };          // ?lang= the film's language
    }),
    r("POST", "/voice/models/([a-z0-9-]+)/install", ([mid]) => {
      const card = asr.models(root).find((m) => m.id === mid);
      if (!card) throw err("NOT_FOUND", "Unknown model");
      return jobs.start("model-install", { key: mid, title: `Downloading ${card.short}`, model: mid }, async (job) => {
        job.update({ stage: "downloading from Hugging Face", progress: 0 });
        const res = await asr.install(mid, { signal: job.signal, root, onProgress: ({ done, total, file }) => job.update({ progress: Math.floor((done / total) * 100), file, bytes: { done, total } }) });
        return { installed: res.installed, path: res.path };
      });
    }),
    r("POST", "/voice/models/([a-z0-9-]+)/remove", ([mid]) => {
      if (jobs.running().some((j) => j.kind === "transcribe" && j.model === mid)) throw err("BUSY", "A transcription is using this model; stop it first");
      return asr.remove(mid, root);
    }),

    // ---- the project's voice-over
    r("GET", `/projects/${P}/voice`, ([id]) => {
      const p = mustProject(id, root);
      const t = transcript.read(p.path);
      return { voice: p.meta?.voice ?? null, hints: hintsFor(p), transcript: t, hfTranscript: existsSync(join(p.path, "transcript.json")), settings: asr.voiceSettings(root),
        models: asr.models(root).map(({ id: mid, short, installed, runtime, isDefault, languages }) => ({ id: mid, short, installed, ready: installed && runtime.ok, isDefault, languages })),
        keys: secrets.status(root), jobs: jobs.list({ projectId: id }).filter((j) => ["transcribe", "tts"].includes(j.kind)).slice(0, 3),
        scriptDraft: scriptDraft(p.path) };          // the words Claude wrote to read, for the Script box ({ text, from } or null)
    }),
    r("PATCH", `/projects/${P}/voice`, ([id], b) => {
      mustProject(id, root);
      const source = ["upload", "elevenlabs", "fishaudio", "none"].includes(b.source) ? b.source : null;
      if (!source) throw err("INVALID", "Unknown voice-over source");
      // the user's own "No voice-over" (noVoice, never a source a new project starts with) lets the Storyboard go on without one
      const out = meta(id, (m) => { const { noVoice, ...v } = m.voice ?? {}; m.voice = { ...v, source, ...(source === "none" ? { file: null, noVoice: { at: new Date().toISOString() } } : {}) }; }).meta.voice;
      if (source === "none") { try { ctx.autopilot?.advance?.(id)?.catch?.(() => {}); } catch { /* the user can go on */ } }          // the Storyboard stops waiting
      return out;
    }),
    r("GET", `/projects/${P}/voice/peaks`, async ([id]) => {
      const p = mustProject(id, root);
      const f = audioPath(p);
      if (!f || !existsSync(f)) return { peaks: [] };
      const cache = workDir(p, "voice-peaks.json");
      const c = readJson(cache, null);
      const st = statSync(f);
      if (c && c.file === f && c.mtime === st.mtimeMs) return { peaks: c.peaks };
      const pk = await peaks(f, 600, root);
      writeJson(cache, { file: f, mtime: st.mtimeMs, peaks: pk });
      return { peaks: pk };
    }),
    r("POST", `/projects/${P}/voice/transcribe`, ([id], b) => startTranscribe(mustProject(id, root), { model: b.model, language: b.language, hints: b.hints })),
    r("PUT", `/projects/${P}/voice/transcript`, async ([id], b) => {
      const p = mustProject(id, root);
      if (ctx.renders?.isRendering(id)) throw err("RENDERING", "The film is being rendered: wait until the render finishes");
      const words = saveTranscript(p, b.segments, { byOwner: true });
      note(p, { kind: "voice", text: "Transcript saved: {n} words, the film can be timed to it", vars: { n: words } });
      // the film is built already: Claude reads the corrected words and moves what was timed to them
      let retime = null;
      if (p.meta?.pipeline?.ran?.build && !ctx.agent?.running?.has(id)) {
        retime = await ctx.agent.start(id, { scope: { kind: "project" }, text: "The owner corrected the voice-over's words (transcript.json). Read them and move what is timed to them (shot starts, captions, kinetic text) to the new times; change nothing else. Say in one line what moved." })
          .then((t) => t.id).catch(() => null);
      } else if (!p.meta?.pipeline?.ran?.build) { try { ctx.autopilot?.transcriptLanded?.(id)?.catch?.(() => {}); } catch { /* the user can go on */ } }
      return { transcript: transcript.read(p.path), words, retime };
    }),
    // ---- the music map for the user to read, with the timed lyrics: the beat file `hyperframes beats` writes for the music track, read
    // the way HF reads it (hf-edit/beats.mjs); its length is the track's own, never the last beat
    r("GET", `/projects/${P}/beats`, async ([id]) => {
      const p = mustProject(id, root);
      const tr = await musicTrackBeats(p), b = tr?.beats ?? null;
      const map = b ? { source: "hyperframes beats", audio: { title: tr.title, duration_sec: tr.duration }, tempo: { bpm: b.bpm, n_beats: b.times.length },
        beats: b.times.map((time, i) => ({ time, strength: b.strengths[i] })) } : null;
      const lines = [];
      for (const w of lyrics.read(p.path).words) {
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
      return { ...lyrics.read(p.path), track: musicTrack(p), job: job?.id ?? null, gpu: asr.whisperDevice(root).gpu };
    }),
    r("PUT", `/projects/${P}/lyrics`, ([id], b) => {
      const p = mustProject(id, root);
      const out = lyrics.save(p.path, b.text);
      commit(p, "Lyrics saved");
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
        commit(p, "Lyrics timed");
        note(p, { kind: "voice", text: "Lyrics timed: {h} of {n} words heard, the rest placed on the beats", vars: { h: r.heard, n: r.heard + r.placed } });
        return r;
      });
    }),
    r("POST", `/projects/${P}/voice/tts`, ([id], b) => {
      const p = mustProject(id, root);
      const provider = PROVIDERS[b.provider] ? b.provider : null;
      if (!provider) throw err("INVALID", "Choose ElevenLabs or Fish Audio");
      const text = String(b.text ?? "").normalize("NFC").trim();
      if (!text) throw err("INVALID", "Write the script to be read");
      if (text.length > 20000) throw err("INVALID", "The script is too long for one request (20,000 characters)");
      const key = secrets.getSecret(provider, root);
      if (!key) throw err("INVALID", `Add the ${PROVIDERS[provider].title} key in Settings first`);
      // only what the user set on the Voice screen (none: the service's defaults); `speed` alone is the older shape
      const settings = voiceSettings(provider, b.settings ?? (b.speed != null ? { speed: b.speed } : null));
      return jobs.start("tts", { projectId: id, title: `Voice-over from ${PROVIDERS[provider].title}` }, async (job) => {
        job.update({ stage: "generating" });
        const out = join(p.path, "assets", "3_audio", "voiceover", `${provider}-${new Date().toISOString().replace(/[:.]/g, "-")}.mp3`);
        // Vietnamese text is read by a model that reads Vietnamese, never eleven_multilingual_v2 by default
        let model = b.model ?? null;
        if (provider === "elevenlabs") {
          model = pickModel(await PROVIDERS.elevenlabs.models(key), { text, asked: model, lang: p.meta?.language?.id ?? null });
          if (!model) throw err("INVALID", "This ElevenLabs account has no model that reads Vietnamese");
          job.update({ model });
        }
        await PROVIDERS[provider].generate(key, { voiceId: b.voiceId, model: model ?? undefined, text, out, signal: job.signal, settings, lang: p.meta?.language?.id ?? null });
        const info = await probe(out, root);
        const rel = relativeTo(p.path, out);
        meta(id, (m) => { m.voice = { source: provider, file: rel, name: basename(out), size: statSync(out).size, info, voiceId: b.voiceId ?? null, voiceName: b.voiceName ?? null,
          model: model ?? null, settings, script: text, addedAt: new Date().toISOString(), transcript: { status: "pending" } };
          (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Voice-over generated with ${PROVIDERS[provider].title}` }); });
        commit(p, `Voice-over generated (${PROVIDERS[provider].title})`);
        let next = null; try { next = startTranscribe(projects.getProject(id, root)).id; } catch (e) { job.log(`transcription not started: ${e.message}`); }
        return { file: rel, duration: info.duration, transcribeJob: next };
      });
    }),

    // ---- export
    r("GET", `/projects/${P}/exports`, ([id]) => {
      const p = mustProject(id, root);
      const dir = join(p.path, "renders");
      moveOldGates(p.path);          // an older render's results leave renders/
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => Object.values(FORMATS).includes(extname(f).toLowerCase()))
        .map((f) => { const s = statSync(join(dir, f)); return { name: f, path: join(dir, f), size: s.size, at: s.mtime.toISOString(), gates: existsSync(gatesFile(p.path, f)) || existsSync(join(dir, f + ".gates.json")) }; })
        .sort((a, b) => (a.at < b.at ? 1 : -1)) : [];
      return { files, folder: dir, jobs: jobs.list({ kind: "export", projectId: id }).slice(0, 5), lastQa: p.meta?.lastQa ?? null,
        defaults: { width: p.width ?? p.meta?.format?.width, height: p.height ?? p.meta?.format?.height, fps: projects.projectFps(p), filename: basename(p.path) } };          // the rate the render uses
    }),
    r("POST", `/projects/${P}/exports`, ([id], b) => startExport(mustProject(id, root), b)),
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
    r("GET", `/projects/${P}/qa`, ([id]) => {
      const p = mustProject(id, root);
      const last = readJson(workDir(p, "qa", "last.json"), null);
      const head = existsSync(join(p.path, ".git")) ? rev.head(p.path) : null;
      return { report: last ? { ...last, stills: last.stills.map((s) => ({ ...s, url: `${ctx.preview.base}/p/${id}/${s.path}` })) } : null,
        // the film changed, not the app's own records (a version, the pre-render, the Editor's opening write .moworks/ only)
        changedSince: !!last && !!head && last.revision !== head && rev.changedSince(p.path, last.revision), job: jobs.list({ kind: "qa", projectId: id })[0] ?? null };
    }),
    r("POST", `/projects/${P}/qa`, ([id]) => startQa(mustProject(id, root), { onEnd: () => qaEnded(id) })),

    // ---- After Effects
    r("GET", "/ae/status", async () => ({ installs: aeInstalls(), running: await aeRunningAsync() })),          // off the server's thread
    r("GET", `/projects/${P}/ae`, async ([id]) => {
      const p = mustProject(id, root);
      // a one-page code film (What If, anidoodle…) has no scene files (scenes 0) and is built all the same: built is the root's own word
      // (not the starter film, whose one title card is a scene too), its count the film's shots
      const { shots, root: comp } = await readShots(p.path).catch(() => ({ shots: [], root: null }));
      const count = placedShots(shots, comp?.duration).filter((s) => s.duration).length;
      const fps = projects.projectFps(p), last = readJson(workDir(p, "ae", "last.json"), null);
      // the last size check while the film is unchanged (what AE gets: a canvas film is one video layer), and the film's canvases
      const est = readJson(workDir(p, "ae", "estimate.json"), null);
      return { fps, built: p.built === true || (p.built !== false && (p.scenes ?? 0) > 0), scenes: p.scenes ?? 0, shots: count,
        canvas: canvasCount(p.path), estimate: est && est.hash === filmHash(p.path, Number(fps)) ? est : null,
        // an export made before the Log lost its addresses reads the same; lastExport is the Render's (the dialog shows the AE export's time)
        last: last && { ...last, message: last.message && plainLog(last.message), log: (last.log ?? []).map(plainLog) },
        running: await aeRunningAsync(), installs: aeInstalls(), lastExport: p.meta?.lastExport ?? null,
        jobs: jobs.list({ projectId: id }).filter((j) => j.kind === "ae" || j.kind === "ae-estimate").slice(0, 3) };
    }),
    r("POST", `/projects/${P}/ae`, ([id], b) => startAe(mustProject(id, root), b)),

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
    commit(p, `Asset added: ${d.rel} (Google Slides)`);
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

// Speech-to-text engines: model cards, install after the user confirms (a download from Hugging Face pinned to
// one commit; every file checked by size and SHA-256; the Moworks Motion kit is not used), remove, and transcription jobs. Engines are
// pluggable: config/asr-models.json lists them; a script in tools/asr/ runs each. Models live in <work folder>/models, outside projects.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import * as cuda from "./cuda.mjs";
import { install as installPython, pyLibs } from "../setup/python.mjs";

const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export const catalog = (root = APP_ROOT) => readJson(join(root, "config", "asr-models.json"), { models: [] }).models;
export const modelsRoot = (root = APP_ROOT) => process.env.MW_MODELS_ROOT ?? join(workRoot(root), "models");
const settingsFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "voice-settings.json");
export const voiceSettings = (root = APP_ROOT) => {
  const s = { defaultModel: "whisper-turbo", language: "vi", ...readJson(settingsFile(root), {}) };
  if (!catalog(root).some((m) => m.id === s.defaultModel)) s.defaultModel = "whisper-turbo";     // a saved choice of a dropped model
  return s;
};
export function saveVoiceSettings(patch, root = APP_ROOT) {
  const ids = catalog(root).map((m) => m.id);
  const next = { ...voiceSettings(root) };
  if (patch.defaultModel !== undefined) { if (!ids.includes(patch.defaultModel)) throw Object.assign(new Error("Unknown model"), { code: "INVALID" }); next.defaultModel = patch.defaultModel; }
  if (patch.language !== undefined) next.language = /^(auto|[a-z]{2,3})$/.test(patch.language) ? patch.language : "vi";
  mkdirSync(join(settingsFile(root), ".."), { recursive: true });
  writeFileSync(settingsFile(root), JSON.stringify(next, null, 2) + "\n");
  return next;
}
export const python = (root = APP_ROOT) => expandEnv(loadPins(root).python.exe);

const runtimeCache = new Map();
/** Whether the engine's Python modules import (a yes for the app's run, a no for a minute). */
function runtimeOk(m, root) {
  const c = runtimeCache.get(m.id);
  if (c && (c.value.ok || Date.now() - c.at < 60000)) return c.value;          // a module that imports keeps importing for the app's run
  // the app's own component folder first, as the transcription script has it (whisper_transcribe.py)
  const code = ["import os, sys", "p = os.environ.get('MW_PYLIBS')", "if p and os.path.isdir(p): sys.path.insert(0, p)", ...m.runtime.python.map((x) => `import ${x}`)].join("\n");
  const r = existsSync(python(root)) ? spawnSync(python(root), ["-I", "-c", code], { encoding: "utf8", env: { ...process.env, MW_PYLIBS: pyLibs(root) }, windowsHide: true, timeout: 60000 }) : null;
  const value = r?.status === 0 ? { ok: true } : { ok: false, message: r ? (r.stderr ?? "").trim().split(/\r?\n/).pop() : "Python not found" };
  runtimeCache.set(m.id, { at: Date.now(), value });
  return value;
}

/** Model cards: { id, label, short, engine, languages, licence, author, source, note, size, installed, path, runtime, isDefault }. */
export function models(root = APP_ROOT) {
  const def = voiceSettings(root).defaultModel;
  return catalog(root).map((m) => {
    const dir = join(modelsRoot(root), m.dir);
    const size = m.files.reduce((n, f) => n + f.size, 0);
    const installed = m.files.every((f) => { try { return statSync(join(dir, f.to)).size === f.size; } catch { return false; } });
    return { id: m.id, label: m.label, short: m.short, engine: m.engine, languages: m.languages, licence: m.licence, author: m.author, source: m.source,
      note: m.note ?? null, size, installed, path: dir, runtime: { ...runtimeOk(m, root), size: m.runtime.size, install: m.runtime.install, withModel: !!m.runtime.pip?.length }, isDefault: m.id === def };
  });
}

async function sha256(file) {
  const h = createHash("sha256");
  await pipeline(createReadStream(file), h);
  return h.digest("hex");
}

/** Install one model: download its files from their pinned URLs, then its engine when missing; progress { done, total } in bytes. Files
 *  already there and correct are kept, so Install on an installed model only adds the engine. */
export async function install(id, { onProgress = () => {}, signal, root = APP_ROOT } = {}) {
  const m = catalog(root).find((x) => x.id === id);
  if (!m) throw Object.assign(new Error("Unknown model"), { code: "INVALID" });
  const dir = join(modelsRoot(root), m.dir);
  mkdirSync(dir, { recursive: true });
  const total = m.files.reduce((n, f) => n + f.size, 0);
  let done = 0;
  for (const f of m.files) {
    const dest = join(dir, f.to);
    if (existsSync(dest) && statSync(dest).size === f.size && (await sha256(dest)) === f.sha256) { done += f.size; onProgress({ done, total, file: f.to }); continue; }
    const part = dest + ".partial";
    rmSync(part, { force: true });
    let counted = 0;
    const count = async function* (src) { for await (const chunk of src) { if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" }); counted += chunk.length; onProgress({ done: done + counted, total, file: f.to }); yield chunk; } };
    let r;
    try { r = await fetch(f.url, { signal }); } catch (e) { throw Object.assign(new Error(signal?.aborted ? "Cancelled" : `Could not reach ${new URL(f.url).host}: ${e.message}`), { code: signal?.aborted ? "CANCELLED" : "DOWNLOAD" }); }
    if (!r.ok) throw Object.assign(new Error(`Download failed (${r.status}) for ${f.to}`), { code: "DOWNLOAD" });
    await pipeline(Readable.fromWeb(r.body), count, createWriteStream(part));
    const got = await sha256(part);
    if (statSync(part).size !== f.size || got !== f.sha256) { rmSync(part, { force: true }); throw Object.assign(new Error(`${f.to} does not match its checksum; nothing was kept`), { code: "CHECKSUM" }); }
    renameSync(part, dest);
    done += f.size;
  }
  // the engine (faster-whisper, pinned) with pip into the app's Python components, when it does not import yet; without Python: NO_PYTHON
  if (m.runtime?.pip?.length && !runtimeOk(m, root).ok) {
    onProgress({ done, total, file: m.runtime.pip.join(", ") });
    await installPython(root, { only: m.runtime.pip, signal });
    runtimeCache.delete(m.id);
  }
  writeFileSync(join(dir, "MODEL.json"), JSON.stringify({ id: m.id, label: m.label, source: m.source, licence: m.licence, installedFrom: "download", installedAt: new Date().toISOString(),
    files: m.files.map(({ to, size, sha256: s }) => ({ to, size, sha256: s })) }, null, 2) + "\n");
  return models(root).find((x) => x.id === id);
}

/** Remove a model's folder (after the user confirms in the UI). */
export function remove(id, root = APP_ROOT) {
  const m = catalog(root).find((x) => x.id === id);
  if (!m) throw Object.assign(new Error("Unknown model"), { code: "INVALID" });
  rmSync(join(modelsRoot(root), m.dir), { recursive: true, force: true });
  return models(root).find((x) => x.id === id);
}

/** Split long segments at sentence ends, pauses or a word limit, using the word timings (a context prompt can make Whisper return one long
 *  segment; captions and the review screen need short ones). Segments are rebuilt from their words, so timing stays exact. */
export function resegment(segments, { maxSeconds = 8, maxWords = 16, pause = 0.5 } = {}) {
  const out = [];
  for (const s of segments) {
    const w = s.words ?? [];
    if (w.length < 2 || (s.end - s.start <= maxSeconds && w.length <= maxWords)) { out.push(s); continue; }
    let cur = [];
    const flush = () => { if (cur.length) out.push({ start: cur[0].start, end: cur.at(-1).end, text: cur.map((x) => x.text).join(" "), words: cur }); cur = []; };
    w.forEach((x, i) => {
      cur.push(x);
      const next = w[i + 1];
      const sentence = /[.!?…]$/.test(x.text), gap = next ? next.start - x.end : 0, span = x.end - cur[0].start;
      if (!next || sentence || gap >= pause || cur.length >= maxWords || (span >= maxSeconds && /[,;:]$/.test(x.text))) flush();
    });
    flush();
  }
  return out.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

/** An installed model that can run, or an error the UI can show. */
export function readyModel(id, root = APP_ROOT) {
  const card = models(root).find((x) => x.id === id);
  if (!card) throw Object.assign(new Error("Unknown model"), { code: "INVALID" });
  if (!card.installed) throw Object.assign(new Error(`${card.short} is not installed. Install it in Settings › System.`), { code: "MODEL_MISSING" });
  if (!card.runtime.ok) throw Object.assign(new Error(`${card.short} cannot run yet: its engine is missing (${card.runtime.message}). Install the engine in Settings › System.`), { code: "RUNTIME_MISSING" });
  return card;
}

/** 16 kHz mono 16-bit WAV from the pinned FFmpeg (what the engines work on; no decoder of their own is involved). `song`: a band filter
 *  keeps the voice's range (200 Hz to 4.5 kHz) over the music. */
export function toWav(audioFile, out, { song = false, from = null, to = null, root = APP_ROOT } = {}) {          // from/to: only that part
  const ff = join(expandEnv(loadPins(root).ffmpeg.dir), "ffmpeg.exe");
  const part = [...(from > 0 ? ["-ss", String(from)] : []), ...(to > 0 ? ["-to", String(to)] : [])];
  const conv = spawnSync(ff, ["-y", "-v", "error", ...part, "-i", audioFile, ...(song ? ["-af", "highpass=f=200,lowpass=f=4500,dynaudnorm"] : []), "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", out], { windowsHide: true });
  if (conv.status !== 0) throw Object.assign(new Error("Could not read this audio file"), { code: "AUDIO" });
  return out;
}

/** Transcribe one audio file. Events: { type: "progress", pct, at } and { type: "log", line }. `prompt`: names and words to expect (brand,
 *  script), which helps Whisper spell them. Returns { model, engine, language, probability, duration, device, prompt, segments: [{ id, start,
 *  end, text, words }] }. `song`: sung words over music (a band filter keeps the voice's range, then the script's song mode: no voice
 *  filter, overlapping windows, Whisper's stock "subscribe…" lines dropped). */
/** Where Whisper runs: the graphics card when NVIDIA's CUDA libraries are installed and the card is fit (the script falls
 *  back to the CPU), else the CPU straight away. { gpu, device: "auto" | "cpu", env } for the scripts' `--device` and their DLL folders;
 *  the voice-over's transcription and the lyrics' timing both (the lyrics once ran on the CPU beside an installed pack). */
export function whisperDevice(root = APP_ROOT) {
  const gpu = cuda.packStatus(root).installed && cuda.eligible(cuda.detectGpu()), dlls = gpu ? cuda.dllDirs(root) : [];
  return { gpu, device: gpu ? "auto" : "cpu", env: dlls.length ? { MW_CUDA_DLLS: dlls.join(";"), PATH: [...dlls, process.env.PATH ?? ""].join(";") } : {} };
}
export const recordWhisperRun = (gpu, device, stderrLines, root = APP_ROOT) => {
  try { cuda.recordRun({ device, reason: gpu && device !== "cuda" ? (stderrLines.find((l) => /cuda unavailable/.test(l)) ?? "the card could not be used") : null }, root); } catch { /* shown as unknown */ }
};

export async function transcribe(audioFile, { model: id, language = "vi", prompt = "", song = false, onEvent = () => {}, signal, workDir, root = APP_ROOT } = {}) {
  const card = readyModel(id, root);
  const m = catalog(root).find((x) => x.id === id);
  mkdirSync(workDir, { recursive: true });
  const input = toWav(audioFile, join(workDir, "asr-input.wav"), { song, root });
  if (m.engine !== "faster-whisper") throw Object.assign(new Error(`No runner for the ${m.engine} engine`), { code: "INVALID" });
  const script = join(root, "tools", "asr", "whisper_transcribe.py"), target = card.path;
  const hint = String(prompt ?? "").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 600);
  const promptFile = join(workDir, "asr-prompt.txt");
  if (hint) writeFileSync(promptFile, hint, "utf8"); else rmSync(promptFile, { force: true });
  const out = { model: id, engine: m.engine, language: null, probability: null, duration: null, device: null, prompt: hint || null, segments: [] };
  const { gpu, device, env: cudaEnv } = whisperDevice(root);
  const code = await new Promise((resolve) => {
    const child = spawn(python(root), ["-I", script, target, input, "--language", language, "--device", device, ...(hint ? ["--prompt-file", promptFile] : []), ...(song ? ["--song"] : [])], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", HF_HUB_OFFLINE: "1", ELEVENLABS_API_KEY: "", FISH_API_KEY: "", MW_PYLIBS: pyLibs(root), ...cudaEnv }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const kill = () => spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    let buf = "", err = "";
    child.stdout.on("data", (d) => {
      buf += d.toString("utf8"); let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        let e; try { e = JSON.parse(line); } catch { onEvent({ type: "log", line }); continue; }
        if (e.type === "info") { Object.assign(out, { language: e.language, probability: e.probability, duration: e.duration, device: e.device }); onEvent({ type: "info", ...e }); }
        if (e.type === "segment") {
          out.segments.push({ id: `s${out.segments.length + 1}`, start: e.start, end: e.end, text: e.text.normalize("NFC"), words: e.words.map((w) => ({ ...w, text: w.text.normalize("NFC") })) });
          onEvent({ type: "progress", pct: out.duration ? Math.min(99, Math.round((e.end / out.duration) * 100)) : null, at: e.end, segments: out.segments.length });
        }
      }
    });
    child.stderr.on("data", (d) => { err += d.toString("utf8"); if (err.length > 20000) err = err.slice(-20000); });
    child.on("close", (c) => { signal?.removeEventListener("abort", kill); out.stderr = err.split(/\r?\n/).filter(Boolean).slice(-6); resolve(c); });
  });
  if (signal?.aborted) throw Object.assign(new Error("Transcription stopped"), { code: "CANCELLED" });
  if (code !== 0) throw Object.assign(new Error(`The ${card.short} engine stopped with an error: ${out.stderr.slice(-1)[0] ?? `exit ${code}`}`), { code: "ASR_FAILED", detail: out.stderr });
  // Settings › System: the device of the last run, and why the card was not used when it was meant to be
  recordWhisperRun(gpu, out.device, out.stderr, root);
  out.segments = resegment(out.segments);
  return out;
}

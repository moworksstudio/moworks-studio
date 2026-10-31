// The free voice: Kokoro-82M, read on this computer with no account and no graphics card, through HyperFrames' own `hyperframes tts` as the
// pinned CLI ships it (its Python script, its call to kokoro-onnx). An optional component: never in Set up's count of what the app needs, so
// a computer without it stays ready (an update never reopens Set up for it); the first-run screen offers it, on by default, and Settings ›
// System and the Voice screen install or remove it. Everything sits in <models>/kokoro and goes with one Remove: `home` is the home folder the
// CLI runs under, so its own cache paths (~/.cache/hyperframes/tts) hold the pinned model files, checked by size and SHA-256 (the CLI would
// download them unchecked into the user's real home otherwise); `python` holds the pinned wheels, hash-checked, no dependency resolved
// (pip --no-deps --require-hashes), apart from the app's other Python parts, so no library of theirs moves.
// Which model: the full kokoro-v1.0.onnx, the one HF's CLI knows; on this app's i9-9900K, loaded, it read faster than the int8 file (audit/88).
import { execFile, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { APP_ROOT, expandEnv, loadPins, resolveRuntime } from "../version-manager/index.mjs";
import { cliEntry } from "../hf-qa/cli.mjs";
import { downloadChecked, modelsRoot } from "./asr.mjs";

const MB = 1048576;
const RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0";
const TTS_CACHE = ".cache/hyperframes/tts";          // HF's src/tts/manager.ts, under the home folder the CLI runs with

/** The model files at the fixed release (model-files-v1.0, tag at 6843c53), sizes from its assets, hashes read on the download of 31/10/2026. */
export const FILES = [
  { name: "kokoro-v1.0.onnx", url: `${RELEASE}/kokoro-v1.0.onnx`, folder: "models", size: 325532387, sha256: "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5" },
  { name: "voices-v1.0.bin", url: `${RELEASE}/voices-v1.0.bin`, folder: "voices", size: 28214398, sha256: "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d" },
];
/** kokoro-onnx and everything it needs for the app's Python 3.12 on Windows (the closure pip resolved on 31/10/2026): name, version, SHA-256 of
 *  the wheel, its size. */
export const WHEELS = [
  { name: "kokoro-onnx", version: "0.6.1", sha256: "50c8de4950d601df41428ee5462a48c8a78bef441bf671f2492e070ef44d8a32", bytes: 26084 },
  { name: "phonemizer", version: "3.4.0", sha256: "5ff1215d0efa3606dd1b92449f6d71b5c1741efcc84c6d40c17bfaf64f6ded5f", bytes: 108529 },
  { name: "espeakng-loader", version: "0.2.4", sha256: "41f1e08ac9deda2efd1ea9de0b81dab9f5ae3c4b24284f76533d0a7b1dd7abd7", bytes: 9437292 },
  { name: "onnxruntime", version: "1.31.1", sha256: "ae8a9a351efda685cc59a66226cdefaa37a126c1d66872ca23a2de9425326130", bytes: 14888466 },
  { name: "numpy", version: "2.5.4", sha256: "a7b1b6353e36a7e50de2973a38d705c88ee93adcf120673cee7f45a4a3fa223a", bytes: 12573091 },
  { name: "soundfile", version: "0.14.0", sha256: "299491d3499460fb1b74bb4bd78b57ffc2d243a5fafa7b6ec1b264875c78453e", bytes: 1021480 },
  { name: "cffi", version: "2.1.1", sha256: "f53e442b08449d42821fa4a4fba000095af9f62742a500f978a9f557ec44339a", bytes: 185919 },
  { name: "pycparser", version: "3.12", sha256: "a076f3f489b39b43ed13563a1dafe42447445bec2e294154ec5c57fcdda4c85e", bytes: 62600 },
  { name: "attrs", version: "26.1.0", sha256: "c647aa4a12dfbad9333ca4e71fe62ddc36f4e63b2d260a37a8b83d2f043ac309", bytes: 67548 },
  { name: "joblib", version: "1.6.0", sha256: "3dbbf9f6e4b592a2357b854608e980fe6390d131d7a82f011a377ef2ebef7aba", bytes: 306115 },
  { name: "cloudpickle", version: "3.1.2", sha256: "9acb47f6afd73f60dc1df93bb801b472f05ff42fa6c84167d25cb206be1fbf4a", bytes: 22228 },
  { name: "dlinfo", version: "2.0.0", sha256: "b32cc18e3ea67c0ca9ca409e5b41eed863bd1363dbc9dd3de90fedf11b61e7bc", bytes: 3654 },
  { name: "flatbuffers", version: "25.12.19", sha256: "7634f50c427838bb021c2d66a3d1168e9d199b0607e6329399f04846d42e20b4", bytes: 26661 },
  { name: "packaging", version: "26.3", sha256: "d7193f7c8e4e93f444fde0262bf90af30e16fa0ad0ad44cb553c87339b23cd1c", bytes: 129956 },
  { name: "protobuf", version: "7.36.2", sha256: "a300819d441e078a5608c0d3c709796bb548136058fda017ae51d425b44fd353", bytes: 456514 },
  { name: "typing-extensions", version: "4.16.0", sha256: "481caa481374e813c1b176ada14e97f1f67a4539ce9cfeb3f350d78d6370c2e8", bytes: 45571 },
];
const fileBytes = FILES.reduce((n, f) => n + f.size, 0), wheelBytes = WHEELS.reduce((n, w) => n + w.bytes, 0);
export const PACK = {
  id: "kokoro", title: "Free voice (Kokoro)", label: "Kokoro-82M", version: "kokoro-v1.0 · kokoro-onnx 0.6.1", mb: Math.round((fileBytes + wheelBytes) / MB),
  what: "Reads your script on this computer, free, with no account. No Vietnamese.",
  author: "hexgrad; kokoro-onnx by thewh1teagle",
  licence: "Apache-2.0 (the model and voices), MIT (kokoro-onnx), GPL-3.0 (phonemizer and eSpeak NG, downloaded with it)",
  source: "https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987 · https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 · https://pypi.org/project/phonemizer/3.4.0/",
};

/** Every voice of hexgrad's VOICES.md (54, read 31/10/2026, commit f3ff357) with its language and its grade there; the app's order: each
 *  language's best first, HF's pick (af_heart) at the top. There is no Vietnamese voice. */
const row = (lang, gender, list) => list.map(([id, grade = null]) => ({ id, name: id.slice(3).replace(/^./, (c) => c.toUpperCase()), lang, gender, grade }));
export const VOICES = [
  ...row("en-us", "female", [["af_heart", "A"], ["af_bella", "A-"], ["af_nicole", "B-"], ["af_aoede", "C+"], ["af_kore", "C+"], ["af_sarah", "C+"], ["af_alloy", "C"], ["af_nova", "C"], ["af_sky", "C-"], ["af_jessica", "D"], ["af_river", "D"]]),
  ...row("en-us", "male", [["am_michael", "C+"], ["am_fenrir", "C+"], ["am_puck", "C+"], ["am_echo", "D"], ["am_eric", "D"], ["am_liam", "D"], ["am_onyx", "D"], ["am_santa", "D-"], ["am_adam", "F+"]]),
  ...row("en-gb", "female", [["bf_emma", "B-"], ["bf_isabella", "C"], ["bf_alice", "D"], ["bf_lily", "D"]]),
  ...row("en-gb", "male", [["bm_fable", "C"], ["bm_george", "C"], ["bm_lewis", "D+"], ["bm_daniel", "D"]]),
  ...row("fr-fr", "female", [["ff_siwis", "B-"]]),
  ...row("es", "female", [["ef_dora"]]),
  ...row("es", "male", [["em_alex"], ["em_santa"]]),
  ...row("it", "female", [["if_sara", "C"]]),
  ...row("it", "male", [["im_nicola", "C"]]),
  ...row("pt-br", "female", [["pf_dora"]]),
  ...row("pt-br", "male", [["pm_alex"], ["pm_santa"]]),
  ...row("hi", "female", [["hf_alpha", "C"], ["hf_beta", "C"]]),
  ...row("hi", "male", [["hm_omega", "C"], ["hm_psi", "C"]]),
  ...row("ja", "female", [["jf_alpha", "C+"], ["jf_gongitsune", "C"], ["jf_tebukuro", "C"], ["jf_nezumi", "C-"]]),
  ...row("ja", "male", [["jm_kumo", "C-"]]),
  ...row("zh", "female", [["zf_xiaobei", "D"], ["zf_xiaoni", "D"], ["zf_xiaoxiao", "D"], ["zf_xiaoyi", "D"]]),
  ...row("zh", "male", [["zm_yunjian", "D"], ["zm_yunxi", "D"], ["zm_yunxia", "D"], ["zm_yunyang", "D"]]),
];

/** Whisper's code for the language a voice reads, null for an unknown voice. */
export function whisperLanguage(voiceId) {
  const v = VOICES.find((x) => x.id === voiceId);
  return v ? ({ "en-us": "en", "en-gb": "en", "fr-fr": "fr", "pt-br": "pt" })[v.lang] ?? v.lang : null;
}

const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
export const packDir = (root = APP_ROOT) => join(modelsRoot(root), "kokoro");
const homeDir = (root) => join(packDir(root), "home");
const pyDir = (root) => join(packDir(root), "python");
const pathOf = (f, root) => join(homeDir(root), TTS_CACHE, f.folder, f.name);
const pythonExe = (root) => { const e = expandEnv(loadPins(root).python?.exe ?? ""); return e && existsSync(e) ? e : null; };
const sized = (f, size) => { try { return statSync(f).size === size; } catch { return false; } };

/** { installed, version }: installed when PACK.json is there at this pin, each model file at its size and the engine's modules on disk. */
export function packStatus(root = APP_ROOT) {
  const meta = readJson(join(packDir(root), "PACK.json"), null);
  const installed = meta?.version === PACK.version && FILES.every((f) => sized(pathOf(f, root), f.size)) && existsSync(join(pyDir(root), "kokoro_onnx", "__init__.py"));
  return { installed, version: installed ? meta.version : null };
}

/** The model files, checked, then the wheels with pip: hash-checked, no other package. progress({ part: 0..1, stage }). `pip`: tests fake it. */
export async function install(root = APP_ROOT, { signal = null, onProgress = () => {}, pip = null, download = downloadChecked } = {}) {
  const exe = pythonExe(root);
  if (!pip && !exe) throw Object.assign(new Error("Python is not on this computer"), { code: "NO_PYTHON" });
  const total = fileBytes + wheelBytes;
  let done = 0;
  for (const f of FILES) {
    mkdirSync(dirname(pathOf(f, root)), { recursive: true });
    await download(f, pathOf(f, root), { signal, onBytes: (n) => onProgress({ part: (done + n) / total, stage: "downloading" }) });
    done += f.size;
  }
  onProgress({ part: done / total, stage: "installing" });
  const dir = pyDir(root), req = join(packDir(root), "requirements.txt");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(req, WHEELS.map((w) => `${w.name}==${w.version} --hash=sha256:${w.sha256}`).join("\n") + "\n");
  const args = ["-m", "pip", "install", "--disable-pip-version-check", "--no-input", "--no-deps", "--only-binary=:all:", "--require-hashes", "--retries", "5", "--timeout", "60", "--target", dir, "--upgrade", "-r", req];          // a busy computer once lost pip's first try
  await (pip ? pip(args, { dir }) : new Promise((ok, bad) => {
    const c = spawn(exe, args, { env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }, windowsHide: true });
    let log = "";
    const take = (d) => { log = (log + d).slice(-20000); };
    c.stdout.on("data", take); c.stderr.on("data", take);
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => { signal?.removeEventListener("abort", kill);
      if (signal?.aborted) bad(Object.assign(new Error("Cancelled"), { code: "CANCELLED" }));
      else if (code === 0) ok();
      else bad(Object.assign(new Error(`pip failed (exit ${code}): ${log.trim().split(/\r?\n/).slice(-2).join(" ")}`), { code: "PIP_FAILED" })); });
  }));
  writeFileSync(join(packDir(root), "PACK.json"), JSON.stringify({ version: PACK.version, files: FILES.map(({ name, url, size, sha256 }) => ({ name, url, size, sha256 })),
    wheels: WHEELS.map(({ name, version, sha256 }) => ({ name, version, sha256 })), licence: PACK.licence, installedAt: new Date().toISOString() }, null, 2) + "\n");
  return packStatus(root);
}
/** Remove it (Settings › System): the model, its voices and its Python parts. Voice-overs already made stay in their films. */
export function remove(root = APP_ROOT) { rmSync(packDir(root), { recursive: true, force: true }); return packStatus(root); }

/** The script in parts of at most `max` characters, at a line's end, else a sentence's, else a word's: HF's tts stops a run after 5 minutes, and
 *  a part at a time gives the job its progress and a Stop that answers. */
export function splitScript(text, max = 1500) {
  const parts = [];
  let cur = "";
  const add = (piece, glue) => {
    if (cur && cur.length + glue.length + piece.length > max) { parts.push(cur); cur = ""; }
    cur = cur ? cur + glue + piece : piece;
  };
  const addWords = (sentence) => {
    for (const w of sentence.split(/\s+/)) {
      if (w.length <= max) add(w, " ");
      else for (let i = 0; i < w.length; i += max) add(w.slice(i, i + max), " ");
    }
  };
  for (const line of String(text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    if (line.length <= max) { add(line, "\n"); continue; }
    for (const s of line.split(/(?<=[.!?…])\s+/)) { if (s.length <= max) add(s, " "); else addWords(s); }
  }
  if (cur) parts.push(cur);
  return parts;
}

const GAP = 0.3;          // between two parts, about the pause Kokoro leaves between sentences (kokoro-onnx: sentence_pause 0.25 s)
/** The environment `hyperframes tts` runs with: its cache in the pack, the app's Python with the pack's own libraries first. */
export function ttsEnv(root, base) {
  return { ...base, NO_COLOR: "1", USERPROFILE: homeDir(root), HOME: homeDir(root), HYPERFRAMES_PYTHON: pythonExe(root) ?? "", PYTHONPATH: pyDir(root), PYTHONNOUSERSITE: "1",
    PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", ORT_DISABLE_TELEMETRY: "1" };
}
// With the pack installed, HF saying Python or its library is missing means its checks ran out of time (5 s and 10 s), never that they are missing
const BUSY = /Python 3 is required|package is not installed/;
/** One `hyperframes tts` run: resolves when `wav` is written; a failure carries the CLI's own words in `detail`, never on the screen. */
function runTts(root, rt, file, wav, voice, speed, signal) {
  return new Promise((ok, bad) => {
    const c = spawn(process.execPath, [cliEntry(rt.dir), "tts", file, "--voice", voice, "--speed", String(speed), "--output", wav, "--json"], { env: ttsEnv(root, rt.env), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    c.stdout.on("data", (d) => { out = (out + d).slice(-8000); });
    c.stderr.on("data", (d) => { err = (err + d).slice(-8000); });
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    const late = setTimeout(kill, 330000);          // HF stops its Python at 300 s
    c.on("close", (code) => {
      clearTimeout(late); signal?.removeEventListener("abort", kill);
      if (code === 0 && existsSync(wav)) ok();
      else bad(Object.assign(new Error(BUSY.test(out) ? "The computer is too busy for Kokoro to start. Try again in a moment" : "Kokoro stopped with an error"), { code: "KOKORO_FAILED", detail: `${out} ${err}`.trim().slice(-600) }));
    });
  });
}
/** The libraries read once before HF's own check (the first import after a start took a minute on a loaded computer, its check allows 10 s). */
function warmImport(root, rt, signal) {
  return new Promise((ok) => {
    const c = execFile(pythonExe(root), ["-c", "import kokoro_onnx, soundfile"], { env: ttsEnv(root, rt.env), windowsHide: true, timeout: 180000 }, () => ok());
    signal?.addEventListener("abort", () => { try { c.kill(); } catch { /* gone */ } }, { once: true });
  });
}
/** The script read aloud into `out` (MP3, 44.1 kHz, 128 kbit/s, mono, as a voice-over from a service). progress({ part: 0..1 }). `tts`: tests fake the run. */
export async function speak(root = APP_ROOT, { voice = "af_heart", text, out, speed = 1, signal = null, onProgress = () => {}, tts = null } = {}) {
  if (!packStatus(root).installed && !tts) throw Object.assign(new Error("The free voice is not installed yet"), { code: "MODEL_MISSING" });
  if (!VOICES.some((v) => v.id === voice)) throw Object.assign(new Error("Unknown Kokoro voice"), { code: "INVALID" });
  const parts = splitScript(text);
  if (!parts.length) throw Object.assign(new Error("Write the script to be read"), { code: "INVALID" });
  const rt = tts ? null : resolveRuntime(null, root), work = mkdtempSync(join(tmpdir(), "mw-kokoro-")), run = tts ?? ((...a) => runTts(root, rt, ...a));
  try {
    if (!tts) await warmImport(root, rt, signal);
    const wavs = [];
    for (let i = 0; i < parts.length; i++) {
      if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
      onProgress({ part: i / parts.length });
      const file = join(work, `part-${i + 1}.txt`), wav = join(work, `part-${i + 1}.wav`);
      writeFileSync(file, parts[i], "utf8");
      // HF checks Python (5 s) and that the library imports (10 s) before it reads: a busy computer can miss that, so the import was warmed above and a miss is tried again
      for (let tries = 3; ; tries--) {
        try { await run(file, wav, voice, speed, signal); break; }
        catch (e) { if (signal?.aborted || tries <= 1) throw e; await new Promise((ok) => setTimeout(ok, tts ? 0 : 5000)); }
      }
      wavs.push(wav);
    }
    mkdirSync(dirname(out), { recursive: true });
    const input = wavs.flatMap((w) => ["-i", w]);
    const filter = wavs.length > 1 ? ["-filter_complex", `${wavs.map((_, i) => (i < wavs.length - 1 ? `[${i}:a]apad=pad_dur=${GAP}[a${i}];` : `[${i}:a]anull[a${i}];`)).join("")}${wavs.map((_, i) => `[a${i}]`).join("")}concat=n=${wavs.length}:v=0:a=1[out]`, "-map", "[out]"] : [];
    const ff = join(expandEnv(loadPins(root).ffmpeg.dir), "ffmpeg.exe");
    await new Promise((ok, bad) => execFile(ff, ["-y", "-v", "error", ...input, ...filter, "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", out], { windowsHide: true, timeout: 300000 },
      (e, _o, stderr) => (e ? bad(Object.assign(new Error("Kokoro's sound could not be saved"), { code: "KOKORO_FAILED", detail: String(stderr ?? e.message).slice(-400) })) : ok())));
    onProgress({ part: 1 });
    return { file: out, format: "mp3" };
  } finally { rmSync(work, { recursive: true, force: true }); }
}

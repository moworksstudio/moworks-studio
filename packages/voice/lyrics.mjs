// A song's lyrics (the app transcribes speech, not singing; for a lyric video the user gives the lyrics and the app times
// them). The text is lyrics.txt in the project; tools/asr/align_lyrics.py (the Moworks Motion kit's align method, with Whisper Turbo) gives
// every word a time: .moworks/lyrics/words.json, LYRICS-TIMED.md for the user and Claude, and HyperFrames' transcript.json (its lyric and
// caption skills read it) through HF's own import, unless the project already has a saved voice-over transcript there.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { importTranscript } from "../hf-audio/index.mjs";
import * as asr from "./asr.mjs";
import * as transcript from "./transcript.mjs";
import { pyLibs } from "../setup/python.mjs";

export const TEXT = "lyrics.txt";
export const TIMED = "LYRICS-TIMED.md";
export const WORDS = ".moworks/lyrics/words.json";
const MAX = 20000;
const at = (dir, f) => join(dir, ...f.split("/"));
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const err = (code, message) => Object.assign(new Error(message), { code });

/** The lyrics as the user wrote them, and the last timing (null when not timed, stale when the text changed after it). */
export function read(dir) {
  const f = at(dir, TEXT);
  const text = existsSync(f) ? readFileSync(f, "utf8").replace(/^\uFEFF/, "") : "";
  const timed = readJson(at(dir, WORDS), null);
  const stale = !!(timed && existsSync(f) && statSync(f).mtimeMs > Date.parse(timed.at) + 1000);
  return { text, timed: timed ? { ...timed, words: undefined, stale } : null, words: timed?.words ?? [] };
}

/** Save the user's lyrics (pasted, or read from a .txt / .lrc / .srt file in the browser). Time codes of .lrc / .srt become line marks. */
export function save(dir, text) {
  const clean = fromSubtitles(String(text ?? "").normalize("NFC").replace(/\r\n?/g, "\n")).trim();
  if (clean.length > MAX) throw err("INVALID", "The lyrics are too long");
  writeFileSync(at(dir, TEXT), clean ? clean + "\n" : "");
  return read(dir);
}

/** .lrc "[01:02.50] line" stays (the aligner reads [m:ss] marks); .srt blocks become "[s] line" for each cue's first line. */
export function fromSubtitles(text) {
  text = text.replace(/^\[[a-z]+:[^\]\n]*\]\s*$/gim, "");                 // .lrc tags: [ar: …], [ti: …], [length: …]
  if (!/^\d+\n\d\d:\d\d:\d\d[,.]\d+ --> /m.test(text)) return text;
  return text.split(/\n{2,}/).map((b) => {
    const m = /(\d\d):(\d\d):(\d\d)[,.](\d+) -->[^\n]*\n([\s\S]+)/.exec(b);
    if (!m) return "";
    const s = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(`0.${m[4]}`);
    return m[5].split("\n").map((l, i) => (i === 0 ? `[${s.toFixed(2)}] ` : "") + l.replace(/<[^>]+>/g, "").trim()).filter((l) => l.trim()).join("\n");
  }).filter(Boolean).join("\n");
}

const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;

/** The table the user checks by ear and Claude reads for the music map. */
export function timedMarkdown(track, r) {
  const lines = [];
  for (const w of r.words) (lines[w.line - 1] ??= []).push(w);
  return [`# Lyrics with times (${track})`, "",
    `Timed by the app (Whisper turbo heard ${r.heard} of ${r.words.length} words; the others are placed on the song's attacks). ` +
    "A draft: listen and fix a line that is off (or mark a line's start as \"[0:17.5] line\" in the lyrics and time them again).", "",
    "| Line | Starts | Lyrics | Heard |", "|---|---|---|---|",
    ...lines.filter(Boolean).map((ws, i) => `| ${i + 1} | ${mmss(ws[0].start)} | ${ws.map((w) => w.text).join(" ").replace(/\|/g, "/")} | ${ws.filter((w) => w.sure === "heard").length}/${ws.length} |`)].join("\n") + "\n";
}

/** Time the lyrics to the track with Whisper Turbo (a background job: on the graphics card when the CUDA pack is in, else about 8 minutes
 *  for a 50 s song on this PC's CPU). */
/** Line marks ("[0:17.5] line", "[17.50] line") moved back by `by` seconds (the part of the song that is timed starts after 0). */
export function shiftMarks(text, by) {
  if (!by) return text;
  return text.replace(/^\[(?:(\d+):)?(\d+(?:\.\d+)?)\]/gm, (m0, mm, ss) => {
    const t = Math.max(0, (Number(mm) || 0) * 60 + Number(ss) - by);
    return mm != null ? `[${Math.floor(t / 60)}:${(t % 60).toFixed(2)}]` : `[${t.toFixed(2)}]`;
  });
}

export async function align(dir, { track, workDir, signal, onEvent = () => {}, root = APP_ROOT, window = null } = {}) {          // window: { start, end }
  const { text } = read(dir);
  if (!text.trim()) throw err("INVALID", "Paste the lyrics first");
  if (!track || !existsSync(at(dir, track))) throw err("INVALID", "Add the music track first");
  const id = asr.voiceSettings(root).defaultModel;
  const card = asr.readyModel(id, root);
  mkdirSync(workDir, { recursive: true });
  // only the part of the song the film plays is heard (a 50 s film of a 105.7 s song); the times come back in the song's seconds
  const from = window?.start > 0 ? window.start : 0, to = window?.end > from ? window.end : null;
  const wav = asr.toWav(at(dir, track), join(workDir, "song-voice.wav"), { song: true, from, to, root });     // what Whisper hears
  const plain = asr.toWav(at(dir, track), join(workDir, "song.wav"), { from, to, root });                     // beats and attacks, kick included
  const lyr = join(workDir, "lyrics.txt");
  writeFileSync(lyr, shiftMarks(text, from));
  const script = join(root, "tools", "asr", "align_lyrics.py");
  const out = {};
  let errText = "";
  // the graphics card when NVIDIA's CUDA libraries are installed, as the voice-over's transcription (28 min on the CPU)
  const { gpu, device, env: cudaEnv } = asr.whisperDevice(root);
  const code = await new Promise((resolve) => {
    const child = spawn(asr.python(root), ["-I", script, card.path, wav, lyr, "--rhythm-audio", plain, "--language", asr.voiceSettings(root).language ?? "vi", "--device", device], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", HF_HUB_OFFLINE: "1", MW_PYLIBS: pyLibs(root), ...cudaEnv }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const kill = () => spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    let buf = "";
    child.stdout.on("data", (d) => {
      buf += d.toString("utf8"); let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (e.type === "info") { out.info = e; onEvent(e); }
        if (e.type === "words") Object.assign(out, e);
      }
    });
    child.stderr.on("data", (d) => { errText = (errText + d.toString("utf8")).slice(-4000); });
    child.on("close", (c) => { signal?.removeEventListener("abort", kill); resolve(c); });
  });
  if (signal?.aborted) throw err("CANCELLED", "Timing stopped");
  asr.recordWhisperRun(gpu, out.info?.device ?? null, errText.split(/\r?\n/), root);
  if (code !== 0 || !out.words) throw err("ASR_FAILED", `The lyrics could not be timed: ${errText.split(/\r?\n/).filter(Boolean).slice(-1)[0] ?? `exit ${code}`}`);
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const words = out.words.map((w) => ({ text: String(w.text).normalize("NFC"), start: r3(w.start + from), end: r3(w.end + from), line: w.line, sure: w.sure }));
  const result = { at: new Date().toISOString(), track, model: id, lines: out.lines, heard: out.heard, placed: out.placed, dropped: out.dropped, words,
    ...(to ? { window: { start: from, end: to } } : {}) };
  const wf = at(dir, WORDS);
  mkdirSync(join(wf, ".."), { recursive: true });
  writeFileSync(wf + ".tmp", JSON.stringify(result, null, 1) + "\n"); renameSync(wf + ".tmp", wf);
  writeFileSync(at(dir, TIMED), timedMarkdown(track.split("/").pop(), result));
  let hf = null;
  if (transcript.read(dir)?.status !== "saved") {             // a saved voice-over transcript keeps HyperFrames' transcript.json
    const hw = join(workDir, "lyrics-words.json");
    writeFileSync(hw, JSON.stringify(words.map(({ text: t, start, end }) => ({ text: t, start, end }))));
    const r = importTranscript(dir, hw);
    hf = { ok: r.ok, words: r.words };
  }
  return { ...result, words: undefined, hf };
}

// The voice check (the idea from What If animation's scripts/mixcheck.py, FreshStack, MIT, rewritten here):
// while a word is spoken, the effects or the music must stay at least 3 dB under the voice. The film's own <audio> elements (each at its
// start, length and volume on the timeline) are mixed by the app's FFmpeg into three stems, the voice, the music and the effects, and
// each spoken word of the reviewed transcript is measured in each. A warning to fix (move the effect into the pause after the word, or
// lower it), never a block.
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { APP_ROOT } from "../version-manager/index.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";
import { readMounts } from "../hf-edit/shots.mjs";
import { spokenWords } from "./auto.mjs";

const run = promisify(execFile);
const SR = 16000, MARGIN_DB = 3;
const r2 = (n) => Math.round(n * 100) / 100;

/** One stem: these clips mixed at their places on the timeline, mono 16 kHz, as Float32 samples (or null with no clip). */
async function stem(dir, clips, total, root) {
  const ok = clips.filter((c) => c.src && existsSync(join(dir, ...c.src.split("/"))));
  if (!ok.length) return null;
  const tmp = mkdtempSync(join(tmpdir(), "mw-voice-")), out = join(tmp, "stem.f32");
  try {
    const inputs = ok.flatMap((c) => ["-i", join(dir, ...c.src.split("/"))]);
    const parts = ok.map((c, i) => `[${i}:a:0]aformat=channel_layouts=mono,aresample=${SR},atrim=0:${Math.max(0.01, c.duration ?? total)},volume=${Number.isFinite(c.volume) ? c.volume : 1},adelay=${Math.round((c.start ?? 0) * 1000)}:all=1[s${i}]`);
    const graph = `${parts.join(";")};${ok.map((_, i) => `[s${i}]`).join("")}amix=inputs=${ok.length}:normalize=0:duration=longest,atrim=0:${total}[m]`;
    await run(ffmpegExe(root), ["-v", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[m]", "-f", "f32le", "-ac", "1", "-ar", String(SR), out], { windowsHide: true, timeout: 180000, maxBuffer: 16 << 20 });
    const buf = readFileSync(out);
    return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
const dbOf = (x, a, b) => {
  if (!x) return -120;
  const i0 = Math.max(0, Math.floor(a * SR)), i1 = Math.min(x.length, Math.ceil(b * SR));
  let s = 0; for (let i = i0; i < i1; i++) s += x[i] * x[i];
  return i1 > i0 ? 10 * Math.log10(Math.max(1e-12, s / (i1 - i0))) : -120;
};

/**
 * Measure the film's mix against its voice: { ran, words, masked: [{ word, at, end, voiceDb, musicDb, effectsDb, by }] }; ran false when the
 * film has no voice-over with a reviewed transcript.
 */
export async function voiceCheck(dir, { root = APP_ROOT } = {}) {
  const words = spokenWords(dir);
  if (!words?.length) return { ran: false, words: 0, masked: [] };
  const { root: comp, audio } = readMounts(dir);
  const total = Number(comp?.duration) || Math.max(...words.map((w) => w.end)) + 1;
  const voice = audio.filter((a) => a.id === "el-voice"), music = audio.filter((a) => a.id === "el-music"), effects = audio.filter((a) => a.id !== "el-voice" && a.id !== "el-music");
  const [v, m, e] = await Promise.all([stem(dir, voice, total, root), stem(dir, music, total, root), stem(dir, effects, total, root)]);
  const masked = [];
  for (const w of words) {
    if (w.end - w.start < 0.04) continue;
    const vd = dbOf(v, w.start, w.end), md = dbOf(m, w.start, w.end), ed = dbOf(e, w.start, w.end);
    if (vd < -60) continue;          // a word the voice file holds almost nothing of: not a masking question
    const worst = Math.max(md, ed);
    if (worst > vd - MARGIN_DB) masked.push({ word: w.text, at: w.start, end: w.end, voiceDb: r2(vd), musicDb: r2(md), effectsDb: r2(ed), by: ed >= md ? "effects" : "music" });
  }
  return { ran: true, words: words.length, masked };
}

/** The check in words, for Claude (the voice_check tool). */
export function voiceText(r) {
  if (!r.ran) return "The film has no voice-over with a reviewed transcript: there is nothing to check against.";
  if (!r.masked.length) return `Voice check: every one of ${r.words} spoken words stays at least ${MARGIN_DB} dB over the effects and the music.`;
  return [`Voice check: ${r.masked.length} of ${r.words} spoken words have the effects or the music within ${MARGIN_DB} dB of the voice (a warning, never a block). Fix each: move an effect into the pause just after its word, or lower it; lower or stop the music under a key line:`,
    ...r.masked.slice(0, 30).map((x) => `- "${x.word}" at ${x.at} s: the ${x.by} (${x.by === "effects" ? x.effectsDb : x.musicDb} dB) against the voice (${x.voiceDb} dB)`)].join("\n");
}

/** G-VOICE for the gates: a warning, never a block; null when there is no voice-over to check. */
export async function gateVoice(projectDir) {
  const r = await voiceCheck(projectDir).catch((err) => ({ ran: true, error: String(err.message ?? err).split("\n")[0], masked: [] }));
  if (!r.ran) return null;
  if (r.error) return { id: "G-VOICE", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The voice check could not run: ${r.error}` }] };
  return { id: "G-VOICE", blocking: false, pass: r.masked.length === 0, warnings: r.masked.length,
    findings: r.masked.map((x) => ({ severity: "warning", code: "voice_masked", time: x.at, message: `"${x.word}" at ${x.at} s: the ${x.by} come within ${MARGIN_DB} dB of the voice` })) };
}

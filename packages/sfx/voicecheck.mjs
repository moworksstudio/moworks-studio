// The voice check (the idea from What If animation's scripts/mixcheck.py, FreshStack, MIT, rewritten here):
// while a word is spoken, the effects must stay at least 3 dB under the voice and the music at least 10 dB (HyperFrames' levels: music
// about -31 LUFS under a -16 voice, sfx/actions.mjs; the old 3 dB let Tests 22 and 25 pass a song louder than the voice, warned on but
// never fixed). The music's duck lane (data-automation) counts at each word. The film's own <audio> elements (each at its
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
import { audioKind } from "../hf-edit/tracks.mjs";
import { spokenWords } from "./auto.mjs";

const run = promisify(execFile);
const SR = 16000;
export const EFFECTS_MARGIN_DB = 3, MUSIC_MARGIN_DB = 10;
const r2 = (n) => Math.round(n * 100) / 100;
// a volume lane's value at a clip's own second ([{ t, v }], linear between its points, held before the first and after the last)
const laneAt = (pts, t) => {
  if (!pts?.length) return 1;
  if (t <= pts[0].t) return pts[0].v;
  for (let i = 1; i < pts.length; i++) if (t <= pts[i].t) { const a = pts[i - 1], b = pts[i]; return b.t > a.t ? a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t) : b.v; }
  return pts.at(-1).v;
};
/** The music's lane gain at a second of the film: the clips that play then (a song's repeat crossfades), the loudest. */
const duckAt = (clips, t) => {
  const on = clips.filter((c) => t >= c.start && (c.duration == null || t < c.start + c.duration));
  return on.length ? Math.max(...on.map((c) => laneAt(c.lane, t - c.start))) : 1;
};

/** One stem: these clips mixed at their places on the timeline, mono 16 kHz, as Float32 samples (or null with no clip). Each clip plays its
 *  part of the file (from its data-media-start: a voice cut into one clip a line, a song played again), with its edge fades. */
async function stem(dir, clips, total, root) {
  const ok = clips.filter((c) => c.src && existsSync(join(dir, ...c.src.split("/"))));
  if (!ok.length) return null;
  const tmp = mkdtempSync(join(tmpdir(), "mw-voice-")), out = join(tmp, "stem.f32");
  try {
    const inputs = ok.flatMap((c) => ["-i", join(dir, ...c.src.split("/"))]);
    const parts = ok.map((c, i) => {
      const from = Math.max(0, Number(c.mediaStart) || 0), d = Math.max(0.01, c.duration ?? total);
      const fi = Math.min(d, Number(c.fadeIn) || 0), fo = Math.min(d, Number(c.fadeOut) || 0);
      const fades = `${fi > 0 ? `,afade=t=in:st=0:d=${fi}` : ""}${fo > 0 ? `,afade=t=out:st=${Math.max(0, d - fo)}:d=${fo}` : ""}`;
      return `[${i}:a:0]aformat=channel_layouts=mono,aresample=${SR},atrim=${from}:${from + d},asetpts=PTS-STARTPTS${fades},volume=${Number.isFinite(c.volume) ? c.volume : 1},adelay=${Math.round((c.start ?? 0) * 1000)}:all=1[s${i}]`;
    });
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
  // the voice-over and the music on every clip they are on (a voice cut into one clip a line, Test 22: el-voice-01…13; a song played again)
  const voice = audio.filter((a) => audioKind(a) === "voice"), music = audio.filter((a) => audioKind(a) === "music"), effects = audio.filter((a) => !audioKind(a));
  const [v, m, e] = await Promise.all([stem(dir, voice, total, root), stem(dir, music, total, root), stem(dir, effects, total, root)]);
  const masked = [];
  for (const w of words) {
    if (w.end - w.start < 0.04) continue;
    const vd = dbOf(v, w.start, w.end), ed = dbOf(e, w.start, w.end);
    const md = dbOf(m, w.start, w.end) + 20 * Math.log10(Math.max(1e-6, duckAt(music, (w.start + w.end) / 2)));
    if (vd < -60) continue;          // a word the voice file holds almost nothing of: not a masking question
    const fxOver = ed - (vd - EFFECTS_MARGIN_DB), muOver = md - (vd - MUSIC_MARGIN_DB);          // dB past each one's margin
    if (fxOver > 0 || muOver > 0) masked.push({ word: w.text, at: w.start, end: w.end, voiceDb: r2(vd), musicDb: r2(md), effectsDb: r2(ed), by: fxOver >= muOver ? "effects" : "music" });
  }
  return { ran: true, words: words.length, masked };
}

/** The check in words, for Claude (the voice_check tool). */
export function voiceText(r) {
  if (!r.ran) return "The film has no voice-over with a reviewed transcript: there is nothing to check against.";
  if (!r.masked.length) return `Voice check: every one of ${r.words} spoken words stays at least ${EFFECTS_MARGIN_DB} dB over the effects and ${MUSIC_MARGIN_DB} dB over the music.`;
  return [`Voice check: ${r.masked.length} of ${r.words} spoken words have the effects within ${EFFECTS_MARGIN_DB} dB of the voice or the music within ${MUSIC_MARGIN_DB} dB (a warning, never a block). Fix each: move an effect into the pause just after its word, or lower it; lower the music or duck it under the words:`,
    ...r.masked.slice(0, 30).map((x) => `- "${x.word}" at ${x.at} s: the ${x.by} (${x.by === "effects" ? x.effectsDb : x.musicDb} dB) against the voice (${x.voiceDb} dB)`)].join("\n");
}

/** G-VOICE for the gates: a warning, never a block; null when there is no voice-over to check. */
export async function gateVoice(projectDir) {
  const r = await voiceCheck(projectDir).catch((err) => ({ ran: true, error: String(err.message ?? err).split("\n")[0], masked: [] }));
  if (!r.ran) return null;
  if (r.error) return { id: "G-VOICE", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The voice check could not run: ${r.error}` }] };
  return { id: "G-VOICE", blocking: false, pass: r.masked.length === 0, warnings: r.masked.length,
    findings: r.masked.map((x) => ({ severity: "warning", code: "voice_masked", time: x.at, message: `"${x.word}" at ${x.at} s: the ${x.by} come within ${x.by === "effects" ? EFFECTS_MARGIN_DB : MUSIC_MARGIN_DB} dB of the voice` })) };
}

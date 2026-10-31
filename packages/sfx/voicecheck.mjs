// The voice check (the idea from What If animation's scripts/mixcheck.py, FreshStack, MIT, rewritten here):
// while a word is spoken, the effects must stay at least 3 dB under the voice and the music at least 10 dB (HyperFrames' levels: music
// about -31 LUFS under a -16 voice, sfx/actions.mjs; the old 3 dB let Tests 22 and 25 pass a song louder than the voice, warned on but
// never fixed). The film's own <audio> elements are heard as its render mixes them (voicefit.mjs: each at its start, part of its file,
// volume, lane and edge fades, 48 kHz stereo) into three stems, the voice, the music and the effects, and each spoken word of the reviewed
// transcript is measured in each. The app's own placing meets the rule (voicefit.mjs). A warning to fix (move the effect into the pause
// after the word, or lower it), never a block.
import { APP_ROOT } from "../version-manager/index.mjs";
import { readMounts } from "../hf-edit/shots.mjs";
import { audioKind } from "../hf-edit/tracks.mjs";
import { EFFECTS_MARGIN_DB, MUSIC_MARGIN_DB } from "./actions.mjs";
import { spokenWords } from "./auto.mjs";
import { decodeClips, powerOf, renderStem } from "./voicefit.mjs";

export { EFFECTS_MARGIN_DB, MUSIC_MARGIN_DB };
const r2 = (n) => Math.round(n * 100) / 100;
const dbOf = (x, a, b) => (x ? 10 * Math.log10(Math.max(1e-12, powerOf(x, a, b))) : -120);

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
  const pcms = await decodeClips(dir, audio, root);
  const v = renderStem(voice, total, pcms), m = renderStem(music, total, pcms), e = renderStem(effects, total, pcms);
  const masked = [];
  for (const w of words) {
    if (w.end - w.start < 0.04) continue;
    const vd = dbOf(v, w.start, w.end), ed = dbOf(e, w.start, w.end), md = dbOf(m, w.start, w.end);
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

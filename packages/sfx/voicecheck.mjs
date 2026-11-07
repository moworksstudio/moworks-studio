// The voice check (the idea from What If animation's scripts/mixcheck.py, FreshStack, MIT, rewritten here): while a word is spoken the
// effects stay at least 8 dB under the voice, and over each spoken passage the music stays at least 10 dB under it (mix/levels.mjs
// EFFECTS_MARGIN_DB, MUSIC_MARGIN_DB: the music about -26 LUFS under a -16 voice; the old 3 dB let Tests 22 and 25 pass a song louder than
// the voice, warned on but never fixed). The film's own <audio> elements are heard as its render mixes them (voicefit.mjs: each at its start,
// part of its file, volume, lane and edge fades, 48 kHz stereo) into three stems, the voice, the music and the effects. The effects are
// measured on each spoken word of the reviewed transcript (the fit moves each into the pause after its word); the music on each spoken
// passage, a sentence of the voice cut short at a pause of SPEECH_GAP (where the app's duck lets the music up), at the voice's level over its words (owner Qb1 of audit/112a, 07/11: a
// voice is never even, a word read softly is no fault; word by word, 46 of Test 41's 129 words warned right after Balance again). A warning
// to fix, never a block.
import { APP_ROOT } from "../version-manager/index.mjs";
import { readMounts } from "../hf-edit/shots.mjs";
import { audioKind, filmWords, levelIsOwners } from "../hf-edit/tracks.mjs";
import { EFFECTS_MARGIN_DB, MUSIC_MARGIN_DB } from "./mix/levels.mjs";
import { decodeClips, powerOf, renderStem } from "./voicefit.mjs";
import { SPEECH_GAP } from "./envelopes.mjs";
import { offThread } from "./offThread.mjs";
import { isMainThread } from "node:worker_threads";

const r2 = (n) => Math.round(n * 100) / 100;
const dbOf = (x, a, b) => (x ? 10 * Math.log10(Math.max(1e-12, powerOf(x, a, b))) : -120);

const SENTENCE_END = /[.!?…。]["'”’)\]]*$/;
/** The spoken passages the music is measured over: a sentence of the voice (the owner's "cả câu", Qb1), cut short where the voice pauses
 *  SPEECH_GAP or more (there the app's duck lets the music up: envelopes.mjs speechSpans). [{ start, end, words }], by time. */
export function passagesOf(words) {
  const out = [];
  let ended = false;
  for (const w of [...(words ?? [])].sort((a, b) => a.start - b.start)) {
    const p = out.at(-1);
    if (p && !ended && w.start - p.end < SPEECH_GAP) { p.end = Math.max(p.end, w.end); p.words.push(w); } else out.push({ start: w.start, end: w.end, words: [w] });
    ended = SENTENCE_END.test(String(w.text ?? "").trim());
  }
  return out;
}

/** What the sound covers of the voice, from a stem's level over a time (at(stem, from, to): dB): the words an effect comes within
 *  EFFECTS_MARGIN_DB of ({ by: "effects", word, at, end, voiceDb, effectsDb }), and the spoken passages (passagesOf) whose music comes within
 *  MUSIC_MARGIN_DB of the voice over the passage's words, their power averaged by their length ({ by: "music", word: its first words, words:
 *  how many, at, end, voiceDb, musicDb }). By time. */
export function maskedOf(words, at) {
  const said = (words ?? []).filter((w) => w.end - w.start >= 0.04);
  const out = [];
  for (const w of said) {
    const vd = at("voice", w.start, w.end);
    if (vd < -60) continue;          // a word the voice file holds almost nothing of: not a masking question
    const ed = at("effects", w.start, w.end);
    if (ed > vd - EFFECTS_MARGIN_DB) out.push({ by: "effects", word: w.text, at: w.start, end: w.end, voiceDb: r2(vd), effectsDb: r2(ed) });
  }
  const mean = (stem, ws) => { let p = 0, t = 0; for (const w of ws) { const d = w.end - w.start; p += 10 ** (at(stem, w.start, w.end) / 10) * d; t += d; } return 10 * Math.log10(Math.max(1e-12, p / t)); };
  for (const s of passagesOf(said)) {
    const ws = s.words;
    const vd = mean("voice", ws);
    if (vd < -60) continue;
    const md = mean("music", ws);
    if (md > vd - MUSIC_MARGIN_DB) out.push({ by: "music", word: ws.slice(0, 5).map((w) => w.text).join(" ") + (ws.length > 5 ? "…" : ""), words: ws.length, at: s.start, end: s.end, voiceDb: r2(vd), musicDb: r2(md) });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Measure the film's mix against its voice: { ran, words, passages, masked: maskedOf's }; ran false when the film has no voice-over with a
 * reviewed transcript.
 */
export const voiceCheck = (dir, opts = {}) => (isMainThread ? offThread(import.meta.url, "voiceCheckHere", [dir, opts]) : voiceCheckHere(dir, opts));          // off the server's thread (112a A9)
/** voiceCheck on this thread (a worker's). */
export async function voiceCheckHere(dir, { root = APP_ROOT } = {}) {
  const words = filmWords(dir);
  if (!words?.length) return { ran: false, words: 0, masked: [] };
  const { root: comp, audio } = readMounts(dir);
  const total = Number(comp?.duration) || Math.max(...words.map((w) => w.end)) + 1;
  // the voice-over and the music on every clip they are on (a voice cut into one clip a line, Test 22: el-voice-01…13; a song played again)
  const voice = audio.filter((a) => audioKind(a) === "voice"), music = audio.filter((a) => audioKind(a) === "music"), effects = audio.filter((a) => !audioKind(a));
  const pcms = await decodeClips(dir, audio, root);
  const v = renderStem(voice, total, pcms), m = renderStem(music, total, pcms), e = renderStem(effects, total, pcms);
  const stems = { voice: v, music: m, effects: e };
  return { ran: true, words: words.length, passages: passagesOf(words).length, masked: maskedOf(words, (stem, a, b) => dbOf(stems[stem], a, b)) };
}

/** The check in words, for Claude (the voice_check tool). */
export function voiceText(r) {
  if (!r.ran) return "The film has no voice-over with a reviewed transcript: there is nothing to check against.";
  if (!r.masked.length) return `Voice check: every one of ${r.words} spoken words stays at least ${EFFECTS_MARGIN_DB} dB over the effects, and the voice of every spoken passage at least ${MUSIC_MARGIN_DB} dB over the music.`;
  const fx = r.masked.filter((x) => x.by === "effects"), mu = r.masked.filter((x) => x.by === "music");
  return [`Voice check (a warning, never a block): ${fx.length} of ${r.words} spoken words have the effects within ${EFFECTS_MARGIN_DB} dB of the voice; ${mu.length}${r.passages ? ` of ${r.passages}` : ""} spoken passages have the music within ${MUSIC_MARGIN_DB} dB of the voice over their words (a passage: a sentence of the voice, cut short at a pause of 2 s, measured at the voice's level over its words, as the app ducks the music; a word read softly inside one is no fault). Fix an effect: move it into the pause just after its word, or lower it. The music of a passage: the song itself gets louder there (Balance again sets one level for the whole film): dip the music over that passage only, never its level for the film:`,
    ...r.masked.slice(0, 30).map((x) => (x.by === "music" ? `- the passage "${x.word}" (${x.at}–${x.end} s, ${x.words} word${x.words === 1 ? "" : "s"}): the music (${x.musicDb} dB) against the voice (${x.voiceDb} dB)`
      : `- "${x.word}" at ${x.at} s: the effects (${x.effectsDb} dB) against the voice (${x.voiceDb} dB)`))].join("\n");
}

/** The Review's block (moworks-qc §2b): the mix as measured, so the score never stands on "I cannot hear it". */
export function voiceLines(r) {
  if (r.error) return [`The voice against the music and the effects: not measured (${r.error}). Name it as unchecked in the review; Sync stays at 7 at most.`];
  return [`The voice against the music and the effects (the app's measure of the mix; a spoken passage the music covers, or words the effects cover, keep Sync at 6 at most): ${voiceText(r)}`];
}

/** G-VOICE for the gates: a warning, never a block; null when there is no voice-over to check. */
export async function gateVoice(projectDir) {
  const r = await voiceCheck(projectDir).catch((err) => ({ ran: true, error: String(err.message ?? err).split("\n")[0], masked: [] }));
  if (!r.ran) return null;
  if (r.error) return { id: "G-VOICE", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The voice check could not run: ${r.error}` }] };
  // one warning a kind, the music and the effects, with how many words and where (owner #1098: 30 warnings for one music level read as 30
  // faults); a level the owner set in Final Mix is said as theirs. The Review reads every word from voiceText (above)
  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const findings = [];
  for (const by of ["music", "effects"]) {
    const xs = r.masked.filter((x) => x.by === by);
    if (!xs.length) continue;
    const first = Math.min(...xs.map((x) => x.at)), last = Math.max(...xs.map((x) => x.at));
    const where = xs.length === 1 ? `at ${clock(first)}` : `between ${clock(first)} and ${clock(last)}`;
    const words = xs.slice(0, 3).map((x) => `"${x.word}"`).join(", ");
    const owner = by === "music" && levelIsOwners(projectDir, "music");
    // the music a sentence at a time (Qb1). Measured right after Balance again on Tests 41-43, what is left is the song itself getting
    // louder over a sentence: Balance again (one level for the whole film) does not change that, a dip over the sentence does
    const n = xs.length, what = by === "music" ? `The music is within ${MUSIC_MARGIN_DB} dB of the voice over ${n} sentence${n === 1 ? "" : "s"}` : `The sound effects are within ${EFFECTS_MARGIN_DB} dB of the voice on ${n} word${n === 1 ? "" : "s"}`;
    const fix = owner ? "You set the music's level in Final Mix: lower it there if those sentences are hard to hear, or keep it"
      : by === "music" ? `The song itself gets louder there: ask Claude to dip the music over ${n === 1 ? "that sentence" : "those sentences"}. Balance again in Final Mix sets the music's level for the whole film, never a song's own swells` : "Ask Claude to move those effects into the pauses, or lower them";
    const line = `${what} ${where} (${words}${xs.length > 3 ? "…" : ""}). ${fix}.`;
    findings.push({ severity: "warning", code: `voice_masked_${by}`, time: first, count: xs.length, ownerLevel: owner || undefined, message: line, plain: line });
  }
  return { id: "G-VOICE", blocking: false, pass: r.masked.length === 0, warnings: findings.length, findings };
}

// The levels in numbers' use: each effect's volume against the voice and the music, the voice-over's and the music's gains, the shift with the film's mix (the numbers: mix/levels.mjs).
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)
import { ALONE_LUFS, BED_UNDER, HIT_OVER, HIT_PEAK, HIT_UNDER_VOICE, LEVEL, MAX_GAIN, MUSIC_DUCK, REF_BED, REF_LUFS, REF_VOICE, VOICE_LUFS, levelOf } from "./mix/levels.mjs";
import { clamp } from "./rule-numbers.mjs";

/** dB the levels move with the film's mix: the music bed's loudness against REF_BED, else the voice's against REF_VOICE (±6 dB). */
export function mixShift({ bed = null, voice = null } = {}) {
  if (Number.isFinite(bed)) return clamp(bed - REF_BED, -6, 6);
  if (Number.isFinite(voice)) return clamp(voice - REF_VOICE, -6, 6);
  return 0;
}

/** A sound's volume (0-1): its family's level, moved with the mix (shift, dB) and kept so a sound at REF_LUFS sits 4 dB under the voice,
 *  the sound itself brought from its own loudness (LUFS; null: at REF_LUFS) down to REF_LUFS, and up only as far as maxBoost dB: a short
 *  hit's integrated loudness reads low (the library's one-shots stop at their true-peak ceiling well under -16 LUFS: boosting them by it
 *  would put every pop at full scale), a loop's (-28 LUFS) is its real level. */
export function volumeFor(family, lufs = null, { shift = 0, voice = null, maxBoost = 0 } = {}) {
  const norm = Number.isFinite(lufs) ? clamp(REF_LUFS - lufs, -12, maxBoost) : 0;
  let gain = 20 * Math.log10(levelOf(family)) + shift;
  if (Number.isFinite(voice)) gain = Math.min(gain, voice - 4 - REF_LUFS);
  return Math.round(clamp(10 ** ((gain + norm) / 20), 0.02, 1) * 100) / 100;
}

/** A sound effect's volume (0.02 to MAX_GAIN): its loudest 400 ms (`peak`, momentary LUFS; null: at REF_LUFS) brought HIT_OVER dB over
 *  the music between the words (`bed`, LUFS; with no music, where it would be), its family up to 4 dB louder or softer (LEVELS against
 *  LEVEL), HIT_UNDER_VOICE dB under the voice's own level at most (`voice`, LUFS: the effects sit in the pauses, afterWords; under a word its own
 *  lane holds it, voicefit.mjs), and never past the room its file has (`filePeak`, the file's loudest sample, dBFS: HIT_PEAK). */
export function hitVolume(family, peak = null, { bed = REF_BED, voice = null, filePeak = null } = {}) {
  let target = bed + HIT_OVER + clamp(20 * Math.log10(levelOf(family) / LEVEL), -4, 4);
  if (Number.isFinite(voice)) target = Math.min(target, voice - HIT_UNDER_VOICE);
  let gain = target - (Number.isFinite(peak) ? peak : REF_LUFS);
  if (Number.isFinite(filePeak)) gain = Math.min(gain, HIT_PEAK - filePeak);
  return Math.round(clamp(10 ** (gain / 20), 0.02, MAX_GAIN) * 100) / 100;
}

/** The levels of the voice-over and the music ({ voice, music }: each file's integrated LUFS, null when the film has none; words: whether
 *  the spoken words are known, so the music can duck under them): { voiceGain, musicGain, voice: the voice's level after its gain, bed: the
 *  music's between the words after its gain }. Music under a voice whose words are not known yet sits where the duck would put it. */
export function trackGains({ voice = null, music = null, words = false } = {}) {
  const gain = (db) => Math.round(clamp(10 ** (db / 20), 0.02, MAX_GAIN) * 1000) / 1000;
  const voiceGain = Number.isFinite(voice) ? gain(VOICE_LUFS - voice) : null;
  const V = Number.isFinite(voice) ? voice + 20 * Math.log10(voiceGain) : null;
  const want = V == null ? ALONE_LUFS : V - BED_UNDER + (words ? 0 : 20 * Math.log10(MUSIC_DUCK));
  const musicGain = Number.isFinite(music) ? gain(want - music) : null;
  return { voiceGain, musicGain, voice: V, bed: musicGain == null ? null : music + 20 * Math.log10(musicGain) };
}

/** How far a sound may be brought up to REF_LUFS: a loop all the way, a sound measured by its loudest moment a little, a library one-shot not. */
export const boostOf = (s) => (s?.loop ? 18 : s?.source === "library" ? 0 : 6);

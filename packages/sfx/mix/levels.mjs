// The film's mix in numbers, one table (audit/112a B1: they were in actions.mjs, voicefit.mjs and hf-edit/tracks.mjs): the voice-over's and
// the music's levels, each effect's, how far under a spoken word the music and the effects stay, the mix's peak and the voice's ceiling.
// The rules Claude reads say the same numbers (config/rules/general-style/references/sound.md; test/sound-s2.test.mjs keeps them together).

// ---- Levels, the HyperFrames way (its skills at the pinned commit, Apache-2.0: hyperframes/references/sound.md §4-5, media-use's
// bgm.md, tts.md and scripts/lib/duck.mjs). The voice-over is brought to about -16 LUFS (a mix of -16 to -14 LUFS for social); the music
// sits 1.5 dB under it between the words and is ducked to 10 dB under the voice (about -26 LUFS under a -16 voice) while they are spoken; a
// film with no voice has its music at -16 LUFS. Each effect is set by its loudest 400 ms (momentary LUFS: an effect is mostly silence round
// one hit, so its integrated loudness reads low) to HIT_OVER dB over the music between the words ("each hit sits 3-6 dB over the bed"),
// its family a little louder or softer (LEVELS around LEVEL). Owner 30/10, after Tests 21-26: the music at a fixed 0.6 and never ducked
// covered the voice, and the effects, set under the bed, could not be heard. Gains go up to HyperFrames' own ceiling, +12 dB (core
// audioGain.ts MAX_AUDIO_GAIN_DB at 0.8.214: Studio's fader, the preview and the render all carry gain over unity). An effect goes that high
// only when its file has the room for it (HIT_PEAK): an effect's loudest 400 ms reads low (a 70 ms tick, a low wind K-weighting discounts) while
// the library's files peak at about -4.5 dBFS, so without it +12 dB put single ticks at +7.5 dBFS and the stems at +8.5 dBFS (Test 28): the
// render lowered the whole film 10 dB to keep them from clipping, and the master's limiter pulled the mix down around each one.
export const VOICE_LUFS = -16, ALONE_LUFS = -16;          // the voice-over; the music of a film with no voice
export const BED_UNDER = 1.5;           // the music between the words, dB under the voice (owner 03/11 by ear on Test 37: the music 2-3 dB louder against the voice and the effects)
// the music while words are spoken: 10 dB under the voice itself (the owner's rule, 31/10), so 8.5 dB under its own level between the words
// (BED_UNDER). It was -10 dB under that level, -11.5 under the voice, and Test 38's music was hard to hear (owner 05/11 #1027)
export const MUSIC_DUCK = Math.round(10 ** (-(10 - BED_UNDER) / 20) * 1000) / 1000;
export const HIT_OVER = 1.5;            // an effect's loudest moment, dB over the music between the words (with BED_UNDER: the effects stay where they were, the music comes up)
export const MAX_GAIN = Math.round(10 ** (12 / 20) * 100) / 100;          // +12 dB
export const HIT_PEAK = -3;             // the loudest sample an effect's own gain may reach, dBFS (the film's whole mix: voicefit.mjs MIX_PEAK)
// under a spoken word, how far under the voice (voicecheck.mjs, voicefit.mjs); the effects 8 dB (they were 3 and covered the voice, owner 05/11 #1027);
// the music 10 dB, the owner's own rule (31/10), checked as it is set (it was 3: 23 of Test 41's 122 words had music within 10 dB and no
// warning; owner Qa1 of audit/112a: a warning, never a block)
export const EFFECTS_MARGIN_DB = 8, MUSIC_MARGIN_DB = 10;
/** An effect's loudest moment, dB under the voice's level at most: HIT_OVER dB over the music between the words, never over the voice (they were up to 2 dB over, Test 38) */
export const HIT_UNDER_VOICE = 6;
// LEVELS: each family's place against the others (impact louder, click softer) and, for the ambience beds, their volume at the library's
// loudness (loops -28 LUFS, brought up to it), moved with the film's mix (mixShift)
export const LEVELS = Object.freeze({ click: 0.2, switch: 0.22, pop: 0.25, footstep: 0.25, cloth: 0.25, typing: 0.25, electronic: 0.25, whoosh: 0.3,
  magic: 0.3, paper: 0.3, bell: 0.3, water: 0.3, mechanical: 0.28, fire: 0.3, wind: 0.3, rain: 0.3, animal: 0.3, crowd: 0.3, door: 0.35, impact: 0.45,
  ambience: 0.12 });
export const LEVEL = 0.3;               // a family the table does not name
export const REF_LUFS = -16;            // the loudness LEVELS are for
export const REF_BED = -20, REF_VOICE = -18;          // the music bed (a Mixkit track at 0.6) and a voice-over the table is tuned against
export const SMALL_GAIN = 0.6;          // a small motion (a nudge, a blink, a soft fade in): about 4.5 dB quieter
export const DUCK = 0.5;                // the ambience while words are spoken: about 6 dB down
export const levelOf = (family) => LEVELS[family] ?? LEVEL;

/** The mix's loudest sample, dBFS: under HF's -1 dBFS true-peak step with what oversampling and the AAC encode add (voicefit.mjs). */
export const MIX_PEAK = -2.5;
// The voice-over's true-peak ceiling, dBTP (owner Qa3: hf-edit/tracks.mjs limitVoice); the limiter is set VOICE_CEILING_MARGIN under it, as
// the film's AAC encode lifts the peaks a little (Test 41 copy, the limiter at -1: the voice's stem read -0.9 dBTP)
export const VOICE_CEILING_DB = -1, VOICE_CEILING_MARGIN = 0.3;

// __COMP__ — voice-over timing. Fill WORDS from `node tools/vo-words.mjs public/videos/__SLUG__/voice.wav --script projects/__SLUG__/script.txt`
// (it transcribes, fixes phrase starts with the measured silences, and catches stray words at the end).
export const FPS = 30;

/** The voice-over under public/ (e.g. "videos/__SLUG__/voice.wav"; null = picture + effects only). */
export const VOICE: string | null = null;

/** Word-by-word captions on screen (kit.config.json → defaults.captions sets the habit; per video here). */
export const CAPTIONS = true;

/** Caption word starts in seconds (one word on screen at a time). Placeholder until the voice exists. */
export const WORDS: [number, string][] = [
  [0.3, "Replace"],
  [0.8, "these"],
  [1.2, "words"],
  [2.2, "with"],
  [2.6, "the"],
  [2.9, "voice's"],
  [3.6, "word"],
  [4.0, "times."],
];

/** [authored timeline frame, seconds in the voiced cut]: shot starts land ~2 frames before their phrase. */
export const ANCHORS: [number, number][] = [
  [0, 0],
  [60, 2.0],
  [105, 3.5],
  [149, 4.97],
];

/** Output length in frames: last word end + a ≥ 0.5 s still hold. */
export const FRAMES = 150;

/** Sound cues from the code-made kit public/sfx/kit, key moments only (≈ 1 per 3–4 s); rules: cartoon-video/references/SOUND.md. { n, t (s), g (dB) } */
export const SFX: { n: string; t: number; g: number }[] = [];

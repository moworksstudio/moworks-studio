// A 45.6 s ElevenLabs voice-over on a film set to 40 s in New project once made Claude stretch the film to 47.5 s by itself, saying so
// only after. The app measures the voice against the set length; a voice longer than it is the user's choice, asked with its ways on, and nothing is timed past the set length before the answer.
import { SETTINGS } from "../voice/tts.mjs";

/** How far a voice may run past the set length before it is a question (a breath at the end, a word's tail). */
export const VOICE_SLACK_S = 0.5;

/** The voice-over against the film's set length: null when there is nothing to weigh (no voice on the timeline, no length, or it fits),
 *  else { voice, target, over, faster }: faster when the voice was made in the app and its service's top speed can bring it to the length
 *  (an uploaded recording has no speed; the number itself stays the user's). */
export function voiceFit(meta) {
  const v = meta?.voice, voice = Number(v?.info?.duration), target = Number(meta?.targetDurationSec);
  if (!v?.file || v.offTimeline || !(voice > 0) || !(target > 0) || voice <= target + VOICE_SLACK_S) return null;
  const r = (x) => Math.round(x * 10) / 10, top = SETTINGS[v.source]?.find((s) => s.id === "speed")?.max ?? 0;
  return { voice: r(voice), target: r(target), over: r(voice - target), faster: voice / target <= top };
}

/** What Claude is told while the voice is longer than the set length (every step that times the film), "" when it fits. */
export function voiceFitText(meta) {
  const f = voiceFit(meta);
  if (!f) return "";
  return `The voice-over is ${f.voice} s, ${f.over} s longer than the film's ${f.target} s set in New project. That is the owner's choice (moworks-studio §2b), asked once in the step's one message before anything is timed past ${f.target} s: `
    + `1. make the film longer, the voice's ${f.voice} s plus the hold the brief asks for (the app's project_format tool sets it once the owner chooses it) · `
    + `2. shorten the script and make the voice again on the Voice screen · `
    + (f.faster ? `3. make the voice again faster on the Voice screen (its Speed setting, the owner sets the number) · ` : "")
    + `and, only when the pauses between its sentences (transcript.json) add up to ${f.over} s or more, tighten them to fit. Your suggestion first. `
    + `Never lengthen the film, drop the end hold or cut the voice on your own, and never only say afterwards that you did; until the owner answers, every time stays within ${f.target} s. Write the answer in NOTES.md; once it is there, follow it and do not ask again.`;
}

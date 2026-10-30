// A 45.6 s ElevenLabs voice-over on a film set to 40 s in New project once made Claude stretch the film to 47.5 s by itself, saying so
// only after. The app measures the voice against the set length; a voice longer than it is the user's choice, asked with its ways on, and nothing is timed past the set length before the answer.
// The other way too: an 80 s voice on a film set to 100 s was met with a 24 s wordless shot the Storyboard planned by itself, said only
// after it was drawn (Test 21). A voice well short of the set length is the user's choice the same way.
import { SETTINGS } from "../voice/tts.mjs";

/** How far a voice may run past the set length before it is a question (a breath at the end, a word's tail). */
export const VOICE_SLACK_S = 0.5;
/** How far a voice may stop short of the set length before it is a question: the film's opening and end hold (5 s) and the breaths
 *  between its scenes (a tenth of the film). A 40.3 s voice on a 50 s film is timed as it is; 80 s on 100 s is asked. */
export const shortSlack = (target) => 5 + target * 0.1;

/** The voice-over against the film's set length: null when there is nothing to weigh (no voice on the timeline, no length, or it fits),
 *  else { voice, target, over, faster } for a voice longer than the length (faster when the voice was made in the app and its service's
 *  top speed can bring it to the length; an uploaded recording has no speed; the number itself stays the user's), or
 *  { voice, target, short } for one that stops well short of it. */
export function voiceFit(meta) {
  const v = meta?.voice, voice = Number(v?.info?.duration), target = Number(meta?.targetDurationSec);
  if (!v?.file || v.offTimeline || !(voice > 0) || !(target > 0)) return null;
  const r = (x) => Math.round(x * 10) / 10;
  if (voice < target - shortSlack(target)) return { voice: r(voice), target: r(target), short: r(target - voice) };
  if (voice <= target + VOICE_SLACK_S) return null;
  const top = SETTINGS[v.source]?.find((s) => s.id === "speed")?.max ?? 0;
  return { voice: r(voice), target: r(target), over: r(voice - target), faster: voice / target <= top };
}

/** What Claude is told while the voice is longer than the set length, or well short of it (every step that times the film), "" when it fits. */
export function voiceFitText(meta) {
  const f = voiceFit(meta);
  if (!f) return "";
  if (f.short != null) {
    return `The voice-over is ${f.voice} s, ${f.short} s shorter than the film's ${f.target} s set in New project. That is the owner's choice (moworks-studio §2b), asked once in the step's one message before anything is timed: `
      + `1. make the film shorter, the voice's ${f.voice} s plus the hold the brief asks for (the app's project_format tool sets it once the owner chooses it) · `
      + `2. write a longer script and make the voice again on the Voice screen · `
      + `3. keep the ${f.target} s with wordless stretches planned now: say where each one falls (an opening, a turn in the story, the end) and how long, adding up to ${f.short} s. `
      + `Your suggestion first. Never fill the gap with a wordless shot, a longer shot or a longer end hold on your own, and never only say afterwards that you did; until the owner answers, time no frame. `
      + `Write the answer in docs/NOTES.md; once it is there, follow it and do not ask again.`;
  }
  return `The voice-over is ${f.voice} s, ${f.over} s longer than the film's ${f.target} s set in New project. That is the owner's choice (moworks-studio §2b), asked once in the step's one message before anything is timed past ${f.target} s: `
    + `1. make the film longer, the voice's ${f.voice} s plus the hold the brief asks for (the app's project_format tool sets it once the owner chooses it) · `
    + `2. shorten the script and make the voice again on the Voice screen · `
    + (f.faster ? `3. make the voice again faster on the Voice screen (its Speed setting, the owner sets the number) · ` : "")
    + `and, only when the pauses between its sentences (transcript.json) add up to ${f.over} s or more, tighten them to fit. Your suggestion first. `
    + `Never lengthen the film, drop the end hold or cut the voice on your own, and never only say afterwards that you did; until the owner answers, every time stays within ${f.target} s. Write the answer in docs/NOTES.md; once it is there, follow it and do not ask again.`;
}

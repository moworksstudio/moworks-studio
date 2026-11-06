// The Storyboard's pace warning (owner #1267, audit/111 A7): when a board's shots are much longer than its film style's own pace, Claude is told
// so with the stills (board_stills): a warning, never a block (#1109). The pace is the style's own, local (the owner's two layers, #1213): each
// style that states one has it in config/styles.json `pace`, its numbers read from its source skill, never a house number. Test 39 ran 4.3 s a
// shot against Ricks Clip's 2.5 s.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

/** How much longer than the style's pace a board's average shot may be before it is said: 1.5 times. */
export const PACE_FACTOR = 1.5;

/** The style's own pace for a film of that size: { seconds, from } (from: where its source skill says it), or null when the style states none. */
export function stylePace(styleId, aspect = null, root = APP_ROOT) {
  let styles = [];
  try { styles = JSON.parse(readFileSync(join(root, "config", "styles.json"), "utf8")).styles ?? []; } catch { return null; }
  const p = styles.find((s) => s.id === styleId)?.pace;
  if (!p?.shotSeconds) return null;
  const by = p.shotSeconds, key = aspect && by[aspect] != null ? aspect : Object.keys(by)[0];
  const seconds = Number(by[key]);
  return seconds > 0 ? { seconds, aspect: key, from: p.from?.[key] ?? p.from?.all ?? "" } : null;
}

/** A board's shots against the pace: { shots, total, average, pace, slow } (slow: average over PACE_FACTOR × the pace), or null when the board has
 *  no timed shot or the style has no pace. seconds: each frame's length (HyperFrames' storyboard parser's durationSeconds). */
export function boardPace(seconds, pace) {
  const s = (seconds ?? []).map(Number).filter((x) => x > 0);
  if (!s.length || !pace) return null;
  const total = s.reduce((a, b) => a + b, 0), average = total / s.length;
  return { shots: s.length, total: Math.round(total * 10) / 10, average: Math.round(average * 10) / 10, pace, slow: average > pace.seconds * PACE_FACTOR };
}

/** The warning's words for Claude, or "" when the board keeps the pace. */
export function paceText(option, r) {
  if (!r?.slow) return "";
  const want = Math.max(r.shots + 1, Math.round(r.total / r.pace.seconds));
  return `- Option ${option}: a pace warning (not a block): ${r.shots} shots in ${r.total} s is ${r.average} s a shot; this film style's own pace is about ${r.pace.seconds} s a shot`
    + `${r.pace.from ? ` (${r.pace.from})` : ""}. About ${want} shots would keep it: split long frames at a new phrase, a change of size or a reaction. If the slower pace is meant (the owner asked for it, or the story needs it), keep it and say why in one line of STORYBOARD.md.`;
}

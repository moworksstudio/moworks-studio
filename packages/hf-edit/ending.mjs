// How a film ends (owner 29/10/2026: films never stop dead). With no end card the last shot holds and keeps moving gently, and the picture
// fades out while the music fades down, together, over the ending's fade; after an end card or a logo the fade is shorter; an author style
// with its own ending keeps it as shipped and the app only fades the music. One length for the plan, the picture and the music.
// The fade comes AFTER the length the owner set (the content: 60 s → a 65 s file, 10 s → 11.5 s; owner 29/10: "the film would be squeezed"),
// and inside it only when the brief asks for exactly or at most that length (MOTION-PLAN.json's ending.inside) or the style's author gives
// its own ending (inside that ending, nothing added). An author's ending stands only when the plan names it and its last shot plays it
// (resolveEnding); one the plan only claims is the house fade (T24-12: the picture stayed lit to its last frame and cut, the music faded).
import { checklistOf } from "../project-service/design.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { docPath } from "../project-service/docs.mjs";
import { styleTraits } from "../style-catalog/traits.mjs";

/** The ending kinds of a Motion Plan's `ending`: a fade of the last shot, an end card (logo) then a short fade, the style author's own ending. */
export const ENDINGS = ["fade", "endCard", "author"];
const r3 = (n) => Math.round(n * 1000) / 1000;

/** The ending's fade in seconds for `seconds` of content: 30 s and longer, 3-5 s (12 % of it, at most 5 s); shorter, 12 % of it and
 *  at least 1.5 s (10 s → 1.5 s, 20 s → 2.4 s), never more than a third of it. After an end card: half of that, at least 1 s. */
export function endFade(seconds, { endCard = false } = {}) {
  const t = Number(seconds);
  if (!(t > 0)) return 0;
  const f = Math.min(5, Math.max(t >= 30 ? 3 : 1.5, t * 0.12));
  return Math.round(Math.min(endCard ? Math.max(1, f / 2) : f, t / 3) * 10) / 10;
}

/** The fade of a film `total` seconds long: endFade of its content, the content being the total less the fade added after it (none
 *  added when the fade is inside). */
export function fadeOfTotal(total, { inside = false, endCard = false } = {}) {
  const T = Number(total);
  if (!(T > 0)) return 0;
  if (inside) return endFade(T, { endCard });
  let lo = 0, hi = T;          // content + endFade(content) grows with the content: the content whose film is `total` long
  for (let i = 0; i < 50; i++) { const c = (lo + hi) / 2; if (c + endFade(c, { endCard }) < T) lo = c; else hi = c; }
  return endFade(hi, { endCard });
}

// what is no ending of the author's: nothing, a placeholder ("none", "n/a", "<the author's ending…>"), or words that deny one ("no fade",
// "không mờ dần": the T24-12 plan kept the picture lit and alive to the end)
const NO_ENDING = /^(?:none|no|nothing|n\/?a|null|undefined|tbd|todo|-+|—|…|\.{3}|không(?: có)?|<[^>]*>)$/i;
const DENIES = /\b(?:no|not|without|never)\s+(?:a\s+|any\s+)?(?:fade|fading|ending)\b|(?:^|\s)không\s+(?:có\s+)?(?:mờ|fade|tắt|kết)/i;

/** The author's ending the plan names (ending.author: the screen powering down to a dot, the cursor stopping, the end card landing and
 *  holding), or null when it names none. */
export function authorEnding(text) {
  const s = typeof text === "string" ? text.trim() : "";
  return s.length >= 3 && !NO_ENDING.test(s) && !DENIES.test(s) ? s.slice(0, 300) : null;
}

/** Does the plan's last shot play the ending: one of its rows marked "ending": true. */
export function lastShotEnds(shots) {
  const last = (Array.isArray(shots) ? shots : []).filter((s) => Number.isFinite(Number(s?.shot))).sort((a, b) => Number(a.shot) - Number(b.shot)).at(-1);
  return (last?.motions ?? []).some((m) => m?.ending === true);
}

/** The ending the film gets, from its plan (MOTION-PLAN.json as written) and whether the style's author has an ending of its own
 *  (style-catalog traits: ownEnding): the plan's `ending`, {} with none. "author" stands only when the style has its own ending, the plan
 *  names it (ending.author) and the last shot plays it (a row with "ending": true); otherwise it is the house "fade" (the picture and the
 *  music fade together after the set length, over endFade), with `asked: "author"` and `why` ("style" | "unnamed" | "lastShot"). */
export function resolveEnding(plan, { ownEnding = false } = {}) {
  const e = plan?.ending;
  if (!e || !ENDINGS.includes(e.kind)) return {};
  if (e.kind !== "author") return e;
  const author = authorEnding(e.author);
  if (ownEnding && author && lastShotEnds(plan.shots)) return { ...e, author };
  return { kind: "fade", inside: false, asked: "author", why: !ownEnding ? "style" : !author ? "unnamed" : "lastShot" };
}

/** The plan's ending as the app applies it (resolveEnding), {} when there is none. */
export function planEnding(dir, { ownEnding = false } = {}) {
  let plan = null;
  try { plan = JSON.parse(readFileSync(docPath(dir, "MOTION-PLAN.json"), "utf8")); } catch { return {}; }
  return resolveEnding(plan, { ownEnding });
}

/** A Brand Kit whose guideline sets how a film ends (a line tagged [end] in its checklist) ends the film as an author's ending does: nothing is
 *  added after it and the picture does not fade over it (owner 31/10: Test 31 faded a client's end tag for 1 s). */
export function kitEnding(dir) {
  if (!dir) return false;
  try { return checklistOf(readFileSync(join(dir, "frame.md"), "utf8")).some((x) => /^\[end\]/i.test(x.rule)); } catch { return false; }
}

/** How the film ends: the plan's ending as the app applies it, with { own, inside }: own when the author's ending stands (before the plan
 *  says how the film ends, when the style's author has one), inside when nothing is added after the set length. */
export function filmEnding(meta, { dir = null, root } = {}) {
  const ownEnding = styleTraits(meta?.style?.id, root).ownEnding || kitEnding(dir);
  const e = dir ? planEnding(dir, { ownEnding }) : {};
  const own = e.kind ? e.kind === "author" : ownEnding;
  return { ...e, own, inside: own || e.inside === true };
}

/** The film's lengths from New project's length (meta.targetDurationSec, the content) and how it ends (filmEnding): { content, fade, total,
 *  inside, own } (and `asked`, `why` when the plan's author's ending did not stand). total = content + fade, or the content itself when the
 *  fade is inside it (ending.inside) or the style's author ends the film (own). Every step that times or shows the film's whole length (the
 *  plan, the storyboard, the music, the render, Tech checks) uses total. */
export function filmLength(meta, { dir = null, root } = {}) {
  const content = Number(meta?.targetDurationSec) || null;
  const e = filmEnding(meta, { dir, root });
  const fade = content ? endFade(content, { endCard: e.kind === "endCard" }) : 0;
  return { content, fade, total: content ? r3(e.inside ? content : content + fade) : null, inside: e.inside, own: e.own, ...(e.asked ? { asked: e.asked, why: e.why } : {}) };
}

/** The length a film not built yet shows (the Editor's head, "Not built yet", the Projects card): the one the user set, as they typed it. A
 *  storyboard timed to that length plus the ending's fade (the app asks Claude for that whole: every step's total above) is still that
 *  film (0:56 for a 0:51 film, 1:05 for one the brief wants at exactly 1:00: T30-10, T29-17); a storyboard of another length is its own (Claude
 *  timed it to the voice: 40 → 47.5 s). frames: the storyboard frames' seconds in all, 0 when it has none. */
export function plannedLength(meta, { dir = null, root, frames = 0 } = {}) {
  const L = filmLength(meta, { dir, root });
  const sum = Number(frames) || 0;
  if (!L.content) return sum || L.total;
  if (!sum) return L.content;
  const near = (x) => Math.abs(sum - x) < 0.5;
  return [L.content, L.content + endFade(L.content), L.content + endFade(L.content, { endCard: true })].some(near) ? L.content : sum;
}

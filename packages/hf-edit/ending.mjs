// How a film ends (owner 29/10/2026: films never stop dead). With no end card the last shot holds and keeps moving gently, and the picture
// fades out while the music fades down, together, over the ending's fade; after an end card or a logo the fade is shorter; an author style
// with its own ending keeps it as shipped and the app only fades the music. One length for the plan, the picture and the music.
// The fade comes AFTER the length the owner set (the content: 60 s → a 65 s file, 10 s → 11.5 s; owner 29/10: "the film would be squeezed"),
// and inside it only when the brief asks for exactly or at most that length (MOTION-PLAN.json's ending.inside) or the style's author gives
// its own ending (inside that ending, nothing added).
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/** The plan's ending (MOTION-PLAN.json), {} when there is none. */
export function planEnding(dir) {
  try { return JSON.parse(readFileSync(join(dir, "MOTION-PLAN.json"), "utf8"))?.ending ?? {}; } catch { return {}; }
}

/** The film's lengths from New project's length (meta.targetDurationSec, the content) and the plan's ending: { content, fade, total, inside,
 *  own }. total = content + fade, or the content itself when the fade is inside it (ending.inside) or the style's author ends the film
 *  (own). Every step that times or shows the film's whole length (the plan, the storyboard, the music, the render, Tech checks) uses total. */
export function filmLength(meta, { dir = null, root } = {}) {
  const content = Number(meta?.targetDurationSec) || null;
  const e = dir ? planEnding(dir) : {};
  const own = styleTraits(meta?.style?.id, root).ownEnding || e.kind === "author", inside = own || e.inside === true;
  const fade = content ? endFade(content, { endCard: e.kind === "endCard" }) : 0;
  return { content, fade, total: content ? r3(inside ? content : content + fade) : null, inside, own };
}

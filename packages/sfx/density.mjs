// Density: about how many sounds a second a film carries (lively by default), two of one kind at one moment as one sound, the bigger action leading; a film style's key moments only.
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)
import { levelOf } from "./mix/levels.mjs";

// ---- Density: lively by default; never two of one family closer than sameFamily, about perSecond sounds in any second, a lower
// priority sound within `same` of a higher one is the same action (one sound), a small move's sound never within smallGap of another
// sound (Test 25: 59 effects in 68 s felt a bit busy; the bigger actions lead). The storyboard's own sounds are kept as named, but two of
// one kind at one moment are one sound (Test 25: two pops moved into the same pause after a word played on top of each other).
export const DENSITY = Object.freeze({
  lively: Object.freeze({ perSecond: 3, sameFamily: 0.2, same: 0.25, small: true, smallGap: 0.3, step: 0.45 }),
  normal: Object.freeze({ perSecond: 2, sameFamily: 0.35, same: 0.4, small: true, smallGap: 0.45, step: 0.6 }),
  low: Object.freeze({ perSecond: 1, sameFamily: 0.6, same: 0.6, small: false, smallGap: 0.6, step: 0.9 }),
  // key moments only: a style whose source skill says so (Paper Collage's SOUND.md: "at most about one cue every 2-3 s… one per 3-4 s";
  // 3D Cartoon's: "about one cue per 3-4 s at most"). The owner 06/11 (#1198): where the source skill has a rule, it is followed. At most
  // one sound in any `gap` seconds, the storyboard's named ones too (Test 43: 51 of its 78 sounds were named), the strongest kept first
  // gap 2.5 s: Paper Collage's "one cue every 2-3 s" in a short (T43-16: at 3 s nine of its twelve sheet tears went)
  key: Object.freeze({ perSecond: 1, gap: 2.5, sameFamily: 2.5, same: 2.5, small: false, smallGap: 2.5, step: 1.5 }),
});

/** The density names a placement takes: the owner's three (prefs.mjs DENSITIES) and a source skill's "key". */
export const KEY_DENSITY = "key";

/** Two cues closer than this are at one moment. */
export const SAME_MOMENT_S = 0.03;

/** Lively (every film's default): a sound for every visible action (owner 04/11/2026 #910: "đặt sound đầy đủ cho mọi visual trên phim").
 *  Only two sounds of one kind (the same family or the same name) closer than this are one sound; a small action's sound plays quieter
 *  (SMALL_GAIN), never left out. Normal and low (the owner's choice in Final Mix, or a style or a brief that asks for fewer) thin as before. */
export const MERGE_S = 0.1;

export const PRIO = { named: 0, plan: 1, auto: 2 };

/** Thin the cues: { kept (by time), thinned (each with its why) }. Priority: the storyboard's named sounds (kept, but one of a kind at one
 *  moment), then the Motion Plan's `sound`, then the automatic ones; in each, the bigger actions before the small ones. */
export function thin(cues, density = "lively") {
  const D = DENSITY[density] ?? DENSITY.lively, kept = [], thinned = [];
  const p = (c) => c.prio ?? PRIO.auto;
  if ((DENSITY[density] ? density : "lively") === "lively") return merge(cues, p, D);
  if (density === KEY_DENSITY) return keyOnly(cues, p, D);
  // busy: some second of the film that holds this sound would hold more than perSecond (the windows that start at a kept sound or at it)
  const busy = (c) => [c.start, ...kept.map((k) => k.start).filter((t) => t <= c.start && t > c.start - 1)]
    .some((w) => 1 + kept.filter((k) => k.start >= w - 1e-6 && k.start < w + 1 - 1e-6).length > D.perSecond);
  const twin = (c) => kept.some((k) => Math.abs(k.start - c.start) < SAME_MOMENT_S && (k.name === c.name || (!!k.family && k.family === c.family)));
  // a cue the user moved by hand comes first and stays (auto.mjs planCues); where it was (`left`) holds its moment against what was the same action there: a motion's own
  // sound under a named bell must not ring where the user took the bell from
  const left = cues.filter((c) => c.left);
  for (const c of cues.filter((x) => !x.left).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || p(a) - p(b) || Number(!!a.small) - Number(!!b.small) || a.start - b.start)) {
    const why = c.pinned ? null : twin(c) ? "same moment"
      : p(c) === PRIO.named ? null
      // the storyboard names this shot's footsteps: they are its walk (Test 28: 19 automatic steps between "old man footstep wood")
      : c.auto && c.family === "footstep" && kept.some((k) => p(k) === PRIO.named && k.family === "footstep" && k.shot === c.shot) ? "named"
      : c.small && !D.small ? "small"
      : c.small && kept.some((k) => Math.abs(k.start - c.start) < D.smallGap - 1e-6) ? "small"
      : [...kept, ...left].some((k) => p(k) < p(c) && Math.abs(k.start - c.start) < D.same) ? "same moment"
      : kept.some((k) => k.family && k.family === c.family && Math.abs(k.start - c.start) < D.sameFamily - 1e-6) ? "same family"
      : busy(c) ? "busy" : null;
    if (why) thinned.push({ ...c, why }); else kept.push(c);
  }
  return { kept: kept.sort((a, b) => a.start - b.start), thinned: thinned.sort((a, b) => a.start - b.start) };
}

/** Lively: every cue kept but those that are one sound with another (MERGE_S): the same family or name at one moment, a motion row's stand-by
 *  sound once its own is kept, the automatic steps of a shot whose storyboard names its footsteps, and what plays within D.same of a sound the
 *  storyboard names (that moment's action has its sound: the name is it); a cue the user moved stays, and where it was holds its moment
 *  against what was the same sound there. */
// the Motion Plan's row and the storyboard's frame naming one action: the same sound named in one shot this close is that one action, and
// the storyboard's (named) is kept (T41-14: two thumb pops 0.45 s apart, two gasps 0.3 s apart, one from each)
export const NAMED_TWIN_S = 1;

/** An automatic sound this close to the storyboard's own in its shot is that action (T42-11). */
export const NAMED_NEAR_S = 0.5;

/** Key moments only (DENSITY.key): the user's moved and pinned cues stay; of the rest, the strongest (impact over click: LEVELS), then the
 *  storyboard's, the plan's, the automatic, then the earliest, each kept only with no kept sound within D.gap seconds; no small move. */
// the key moments the source skills name, first to last (Paper Collage's SOUND.md: the power word's stamp and impact, each scene sheet's tear,
// landings, bursts, strikes and circles, counters, a button press; 3D Cartoon's: impact, lock, chip, tick…): T43-16, the VERDICT stamp lost to a wood block
const KEY_RANK = [/\b(stamp|slam|verdict)\b/i, /\b(tear|torn|rip|sheet)\b/i, /\b(land|landing|impact|thud|burst|strike|circle|count|counter|lock|press|click|chip|tick|win|resolve)\b/i];

const keyRank = (c) => { const i = KEY_RANK.findIndex((re) => re.test(String(c.name ?? ""))); return i < 0 ? KEY_RANK.length : i; };

function keyOnly(cues, p, D) {
  const kept = [], thinned = [], left = cues.filter((c) => c.left);
  const order = (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || keyRank(a) - keyRank(b) || p(a) - p(b) || levelOf(b.family) - levelOf(a.family) || a.start - b.start;
  for (const c of cues.filter((x) => !x.left).sort(order)) {
    const why = c.pinned ? null
      : c.alt ? "same moment"
      : c.small ? "small"
      : [...kept, ...left].some((k) => Math.abs(k.start - c.start) < D.gap - 1e-6) ? "key moments only"
      : null;
    if (why) thinned.push({ ...c, why }); else kept.push(c);
  }
  return { kept: kept.sort((a, b) => a.start - b.start), thinned: thinned.sort((a, b) => a.start - b.start) };
}

function merge(cues, p, D) {
  const kept = [], thinned = [], left = cues.filter((c) => c.left);
  const twin = (k, c) => p(k) === PRIO.named && p(c) > PRIO.named && !!c.name && k.name === c.name && (k.shot == null || k.shot === c.shot) && Math.abs(k.start - c.start) < NAMED_TWIN_S;
  // an automatic sound of a motion row just after the storyboard's own sound in that shot is the same action, whatever its name (T42-11: "wet
  // clay slap" named at 11.55 s and the row's "body thud" 0.38 s later; a crumb's crackle and a heavy "impact thud" 0.33 s after it)
  const near = (k, c) => p(k) === PRIO.named && c.auto && !c.pinned && k.shot != null && k.shot === c.shot && Math.abs(k.start - c.start) < NAMED_NEAR_S;
  const one = (k, c) => Math.abs(k.start - c.start) < MERGE_S - 1e-6 && ((!!k.name && k.name === c.name) || (!!k.family && k.family === c.family));
  for (const c of cues.filter((x) => !x.left).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || p(a) - p(b) || Number(!!a.alt) - Number(!!b.alt) || Number(!!a.small) - Number(!!b.small) || a.start - b.start)) {
    const why = c.pinned ? null
      : c.alt && kept.some((k) => k.id === c.id && !k.alt) ? "same moment"
      : p(c) > PRIO.named && [...kept, ...left].some((k) => p(k) === PRIO.named && Math.abs(k.start - c.start) < D.same) ? "same moment"
      : [...kept, ...left].some((k) => one(k, c)) ? "same moment"
      : [...kept, ...left].some((k) => twin(k, c)) ? "same moment"
      : [...kept, ...left].some((k) => near(k, c)) ? "same moment"
      : c.auto && c.family === "footstep" && kept.some((k) => p(k) === PRIO.named && k.family === "footstep" && k.shot === c.shot) ? "named"
      : null;
    if (why) thinned.push({ ...c, why }); else kept.push(c);
  }
  return { kept: kept.sort((a, b) => a.start - b.start), thinned: thinned.sort((a, b) => a.start - b.start) };
}

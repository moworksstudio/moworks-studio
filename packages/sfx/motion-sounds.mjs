// Actions: what a motion row of the Motion Plan sounds like (its kind, its words, its material), and the cues of every row.
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)
import { familyOf, sustainedCue, words } from "./library.mjs";
import { SMALL_GAIN } from "./mix/levels.mjs";
import { any, norm, r3 } from "./rule-numbers.mjs";
import { SURFACES } from "./places.mjs";
import { DENSITY, PRIO } from "./density.mjs";

/** Text being typed: typing, types / typed out (or in), type-on, a typewriter, a keyboard, a caret, gõ chữ. Not the noun "type" (a
 *  film's type block, a typeface): Test 20 got 13 typing sounds from "the type block slides in". */
export const TYPING = /\btyping\b|\btyp(?:es|ed)\s+(?:out|in)\b|\btype-on\b|\btypewriter|\bkeyboard|\bcaret\b|g[õo] ch[ữu]/i;

// ---- Actions: what a motion row sounds like
const SMALL = /\b(subtle|subtly|slight(ly)?|gentl[ey]|soft(ly)?|tiny|small|little|faint(ly)?|nudges?|twitch(es)?|blinks?|flickers?|wiggles?|nods?|breath(es|ing)?|sways?|hover(s|ing)?|bob(s|bing)?|drifts?)\b|nhẹ|khẽ/i;

const FADE_ONLY = /\bfades?\s+(in|up|out|away)\b|\bopacity\s+[01]\s*(→|->|to)\s*[01]\b/i;

const LIVING = /\b(character|person|man|woman|girl|boy|kid|child|children|people|figure|hero|feet|foot|legs?|cat|dog|animal|he|she|they|robot)\b/;

const STEPS = /\b(walk(s|ing|ed)?|tiptoe(s|ing|d)?|strid(e|es|ing)|march(es|ing)?|jog(s|ging)?|footsteps?|paces?|steps? (forward|back|in|out|onto|into|off|aside|closer|up|down|toward|towards|away))\b|bước|đi bộ/i;

const LANDS = /\b(drop(s|ped|ping)?|lands?|landing|landed|falls?|falling|fell|crash(es|ed|ing)?|slam(s|med|ming)?|bounc(e|es|ing)|plops?|plonks?|thuds?|stomps?|smash(es|ed)?|settles? with a (bump|thud))\b|rơi|đập xuống|\broi xuong\b|\bdap xuong\b/i;

const NOT_LANDS = /\bdrop[- ]?(shadow|down)s?\b|\bdropdown\b|\bfall-?off\b/gi;

const MATERIALS = [[/\b(wood|wooden|table|desk|crate|plank|log|shelf|chair|door)\b/, "wood"], [/\b(metal|steel|iron|tin|can|pan|pot|pipe|anvil|coin|key|keys|sword|helmet)\b/, "metal"],
  [/\b(glass|bottle|jar|window|cup|mug|vase)\b/, "glass"], [/\b(stone|rock|brick|boulder|concrete|pebble)\b/, "stone"], [/\b(plate|dish|ceramic|bowl)\b/, "plate"],
  [/\b(pillow|cushion|cloth|bag|sack|soft|feather|paper|book|card)\b/, "soft"], [/\b(body|person|character|man|woman|girl|boy|kid|child|hero|he|she|figure|punch|fist|kick)\b/, "body"]];

const materialOf = (t) => MATERIALS.find(([re]) => re.test(t))?.[1] ?? null;

const IMPACT_NAME = { wood: "impact wood", metal: "impact metal", glass: "impact glass", stone: "impact stone", plate: "plate clink", soft: "soft thud", body: "body thud" };

const LONG_ROLL_S = 0.8, LONG_SLIDE_S = 1.5;

// how long a row must last for its roll or its slide to be heard as one
const WHOOSHY = /\b(fl(y|ies|ying|ew)|swoop(s|ing)?|zoom(s|ing)?|whip(s|ped|ping)?|sweep(s|ing)?|spin(s|ning)?|swipe(s|d)?|dash(es|ing)?|zip(s|ping)?|rush(es|ing)?|shoots? (across|past|by|up|in|out)|slid(e|es|ing)|glid(e|es|ing)|soar(s|ing)?|swing(s|ing)?|throw(s|n)?|toss(es|ed)?|hurl(s|ed)?|launch(es|ed)?|fling(s)?|streak(s|ing)?|whirl(s|ing)?|twirl(s|ing)?|flick(s|ed)?)\b|bay vào|lướt/i;

/** One motion row's sound: { name, family, at: "start" | "end", small, hold, steps } or null (a loop, the camera, a row nothing says
 *  sounds); { none: true } when the row's own `sound` is none. ctx: { allow(family) (a family the style or the owner keeps out answers
 *  false), surface (footsteps' ground), style (the library hint), auto (true: the row's own `sound` is not read) }. */
export function motionSound(m, ctx = {}) {
  const allow = ctx.allow ?? (() => true);
  const own = String(m?.sound ?? "").trim();
  if (!ctx.auto && own) {
    if (/^(none|no|silent|silence|-)$/i.test(own)) return { none: true };
    const family = familyOf(own);
    const lasts = sustainedCue(own);          // a roll, a pour: as long as its row, from its start
    return { name: own.toLowerCase(), family, at: family === "impact" && !lasts && LANDS.test(textOf(m)) ? "end" : "start", small: SMALL.test(textOf(m)) || m.type === "emphasis", plan: true, ...(lasts ? { hold: true } : {}) };
  }
  const type = m?.type ?? "other", raw = textOf(m).toLowerCase(), plain = norm(raw).replace(NOT_LANDS, " "), ws = new Set(words(raw));
  if (type === "loop") return null;
  if (type === "camera") return /\b(whip|swish pan|crash zoom|snap zoom)\b/.test(plain) && allow("whoosh") ? { name: "whoosh", family: "whoosh", at: "start", small: false } : null;
  const small = SMALL.test(raw) || type === "emphasis" || ((type === "entrance" || type === "exit") && FADE_ONLY.test(raw) && !WHOOSHY.test(raw));
  const hit = verbSound({ raw, plain, ws, type, ctx, dur: Number(m?.duration) || 0 });
  if (hit && allow(hit.family)) return { at: "start", small, ...hit };
  // what the row's type says when no word names its sound (or the style or the owner keeps that family out)
  const fall = type === "entrance" ? { name: "pop", family: "pop" } : type === "text" ? { name: "soft pop", family: "pop" }
    : type === "exit" ? (allow("whoosh") ? { name: "whoosh out", family: "whoosh" } : { name: "soft pop", family: "pop" })
    : type === "transition" ? (allow("whoosh") ? { name: "whoosh", family: "whoosh" } : null)
    : type === "emphasis" ? { name: "soft pop", family: "pop" } : null;
  if (!fall || !allow(fall.family)) return type === "exit" && allow("pop") ? { name: "soft pop", family: "pop", at: "start", small } : null;
  return { at: "start", small, ...fall };
}

const textOf = (m) => `${m?.behavior ?? ""} ${m?.name ?? ""} ${m?.plain ?? ""} ${String(m?.target ?? "").replace(/[#.[\]=_-]+/g, " ")}`;

/** The family and name a row's own words give, or null. */
function verbSound({ raw, plain, ws, type, ctx, dur = 0 }) {
  if (TYPING.test(raw)) return { family: "typing", name: "typing", hold: true };
  if (any(ws, "pour splash drip spill dive plunge dunk bubble ripple") || (ws.has("fill") && /\b(water|tea|coffee|milk|juice|liquid|cup|glass|mug)\b/.test(plain)) || /\bwater (drop|drops|falls)\b/.test(plain))
    return { family: "water", name: any(ws, "pour fill") ? "water pour" : ws.has("drip") || /water drop/.test(plain) ? "water drip" : any(ws, "dive plunge dunk") ? "water splash"
      : ws.has("bubble") ? "bubbles" : ws.has("ripple") ? "small splash" : "water splash", hold: any(ws, "pour fill bubble") };
  if ((any(ws, "fire flame ignite blaze torch burn candle campfire ember fireplace") || (ws.has("flare") && !/lens flare/.test(plain))) || /\bmatch(es)? (strikes?|lit|lights?|flares?)\b|strikes? a match/.test(plain))
    return /\b(ignit|flare|burst|fireball|whoosh)/.test(plain) ? { family: "fire", name: "fire whoosh" } : /\b(match|candle)/.test(plain) ? { family: "fire", name: "match strike" }
      : { family: "fire", name: "fire crackle", hold: true };
  if (/\b(bells?|chimes?|ding(s|ing)?|toll(s|ing)?|jingles?|gong)\b/.test(plain) || (/\b(rings?|ringing)\b/.test(plain) && /\b(bell|phone|alarm|doorbell|timer|bicycle)\b/.test(plain)))
    return { family: "bell", name: /church|toll/.test(plain) ? "church bell" : /bicycle|bike/.test(plain) ? "bicycle bell" : /jingle/.test(plain) ? "small bell" : /\bgong\b/.test(plain) ? "gong" : "bell ding" };
  if (/\b(light|lamp|lantern|bulb)s?\b[^.]*\b(turns?|switch(es)?|flicks?|clicks?) (on|off)\b|\b(turns?|switch(es)?|flicks?) (on|off) the (light|lamp)|\blight switch\b|bat den|tat den/.test(plain))
    return { family: "switch", name: "light switch" };
  if (/\bglitch/.test(plain)) return { family: "electronic", name: "glitch" };
  if (/\b(static|crt|tv static)\b/.test(plain)) return { family: "electronic", name: "static" };
  if (/\b(powers? (on|up)|boots? up|starts? up|switch(es)? on|turns? on)\b/.test(plain)) return { family: "electronic", name: "power on" };
  if (/\b(powers? (off|down)|shuts? down|switch(es)? off|turns? off)\b/.test(plain)) return { family: "mechanical", name: "power down" };
  if (/\b(laser|zaps?|electric|shock|sparks? fly)\b/.test(plain)) return { family: "electronic", name: "zap" };
  if (/\b(beeps?|bleeps?|alarm|alert|notification|notifies)\b/.test(plain)) return { family: "electronic", name: "beep" };
  if (/\b(scan(s|ning)?|scanline|radar)\b/.test(plain)) return { family: "electronic", name: "blip up" };
  if (/\b(gears?|cogs?|clockwork|cranks?|winds? up|ratchet)\b/.test(plain)) return { family: "mechanical", name: /ratchet/.test(plain) ? "ratchet" : "gears" };
  if (/\b(print(s|er|ing|ed)?)\b/.test(plain) && !/\bfootprint/.test(plain)) return { family: "mechanical", name: "printer", hold: true };
  if (/\bhammer/.test(plain)) return { family: "mechanical", name: "hammer" };
  if (/\b(machines?|motors?|engines?|conveyor|pistons?)\b/.test(plain)) return { family: "mechanical", name: "machine", hold: true };
  if (/\bclock\b[^.]*\btick|\bticks?\b[^.]*\bclock\b/.test(plain)) return { family: "click", name: "clock tick" };
  if (/\b(glow(s|ing)?|sparkl\w*|shimmer\w*|twinkl\w*|glitter\w*|magic\w*|shin(e|es|ing)|glint\w*|gleam\w*|spell|enchant\w*|fairy|aura|halo|radiat\w*|wand|lights? up|lens flare)\b|phat sang|toa sang|lap lanh/.test(plain))
    return { family: "magic", name: /\b(sparkl|twinkl|glitter|glint|gleam|shin|flare)/.test(plain) ? "sparkle" : "magic shimmer" };
  if (/\b(press(es|ed)?|taps?|tapped|click(s|ed)?|buttons?|toggl\w*|selects?|checks? (off|the box)|checkmark|tick(s|ed)? off)\b/.test(plain))
    return /\btoggl|\bswitch/.test(plain) ? { family: "switch", name: "switch" } : /\btick|checkmark|check/.test(plain) ? { family: "click", name: "tick" } : { family: "click", name: "click" };
  const doorish = /\b(doors?|drawers?|gates?|lids?|hatch(es)?|cabinets?|cupboards?|lockers?|shutters?|safe|chest|trunk|fridge|oven|portal)\b/.test(plain) || ws.has("door");
  const bookish = /\b(book|notebook|diary|journal|album)s?\b/.test(plain);
  if (bookish && /\b(opens?|opening|closes?|closing|shuts?)\b/.test(plain)) return { family: "paper", name: /\b(closes?|closing|shuts?)\b/.test(plain) ? "book close" : "book open" };
  if (doorish && /\b(opens?|opening|opened|closes?|closing|closed|shuts?|slams?|unlocks?|locks?|creaks?|swings?)\b|door open|door close/.test(plain) || (doorish && type === "transition")) {
    if (/\bdrawer/.test(plain)) return { family: "door", name: /\b(closes?|shuts?)\b/.test(plain) ? "drawer close" : "drawer open" };
    if (/\b(unlocks?|locks?|key turns?)\b/.test(plain)) return { family: "door", name: "door lock" };
    if (/\bcreak/.test(plain)) return { family: "door", name: "door creak" };
    if (/\bslam/.test(plain)) return { family: "door", name: "door slam" };
    return { family: "door", name: /\b(closes?|closing|closed|shuts?)\b|door close/.test(plain) ? "door close" : "door open" };
  }
  if (/\bpages?\b|page turn/.test(plain) && /\b(turns?|flips?|flipping|riffl\w*)\b|page turn/.test(plain)) return { family: "paper", name: "page turn" };
  if (/\b(fold(s|ed|ing)?|unfold(s|ed|ing)?|origami)\b/.test(plain)) return { family: "paper", name: "paper fold" };
  if (/\b(crumpl\w*|crinkl\w*|scrunch\w*)\b/.test(plain)) return { family: "paper", name: "paper crumple" };
  if (/\bflip(s|ped|ping)?\b/.test(plain)) return { family: "paper", name: "paper flip" };
  if (/\b(paper|papers|card|cards|letter|letters|envelope|map|notes?|sticky|newspaper|ticket|receipt|postcard|photo|photos|polaroid)\b/.test(plain)
    && /\b(slid(e|es|ing)|slip(s|s)?|plac(e|es|ed)|puts?|deals?|drops?|lands?|toss(es)?|throws?|stacks?|shuffl\w*|fl(y|ies)|falls?|floats?|flutters?)\b/.test(plain))
    return { family: "paper", name: /\b(drops?|lands?|plac|puts?|deals?|stacks?)/.test(plain) ? "card place" : /shuffl/.test(plain) ? "card shuffle" : "paper slide" };
  if (STEPS.test(raw) || (/\b(run(s|ning)?|ran|chạy)\b/i.test(raw) && LIVING.test(plain)))
    return { family: "footstep", name: `footstep ${SURFACES.find(([re]) => re.test(plain))?.[1] ?? ctx.surface ?? "wood"}`, steps: true };
  // a thing that rolls, a long slide: a sound that lasts, never one tick (Test 28); a short one stays the swish or the thud below
  if (dur >= LONG_ROLL_S && /\b(roll(s|ing)|rumbl(e|es|ing))\b/.test(plain)) return { family: "impact", name: `${materialOf(plain) ? `${materialOf(plain)} ` : ""}rolling`, hold: true };
  if (dur >= LONG_SLIDE_S && type !== "text" && /\b(slid(e|es|ing)|glid(e|es|ing))\b/.test(plain)) return { family: "whoosh", name: "sliding", hold: true };
  if (LANDS.test(plain) || /\b(hit(s|ting)?|bump(s|ed)?|knock(s|ed|ing)?|punch(es|ed)?|collid\w*|shatter\w*|stamp(s|ed)?|impact|strikes?|thump(s|ed)?|clunk|clang|bang(s)?|thunk|smack(s|ed)?)\b/.test(plain)) {
    const mat = materialOf(plain);
    if (mat) return { family: "impact", name: IMPACT_NAME[mat], end: LANDS.test(plain) };
    if (/\bbounc/.test(plain) && ctx.style === "cartoon") return { family: "pop", name: "boing", end: true };
    if (/\b(slam|crash|smash|bang)/.test(plain)) return { family: "impact", name: "impact slam", end: LANDS.test(plain) };
    if (/\b(knock|tap)/.test(plain)) return { family: "impact", name: "wood knock" };
    if (/\b(punch|kick)/.test(plain)) return { family: "impact", name: "body hit" };
    return { family: "impact", name: /\b(drop|falls?|fell|heavy|big)\b/.test(plain) ? "impact thud" : "soft thud", end: LANDS.test(plain) };
  }
  if (/\b(cloth|scarf|cape|flags?|curtains?|fabric|ribbons?|banners?|blanket|coat|jacket|dress|sleeves?|towel|rustl\w*|flutter\w*|leaf|bush(es)?|foliage)\b|\b(the|dry|autumn|fallen|falling|green|red) leaves\b|\bleaves (rustle|fall|blow|swirl|flutter)/.test(plain)
    || /\bwav(e|es|ing) (her |his |their |a |the )?(hand|arm|goodbye|hello|hi)\b/.test(plain))
    return { family: "cloth", name: /\b(leaves|leaf|bush|foliage)/.test(plain) ? "rustle leaves" : /\b(flag|banner|cape|curtain|ribbon|flutter)/.test(plain) ? "fabric rustle" : "cloth rustle" };
  if (WHOOSHY.test(raw) && type !== "text")
    return { family: "whoosh", name: /\b(whip|swing|throw|toss|fling|hurl|swipe|flick|dash|zip|streak)/.test(plain) ? "swish" : /\b(slid|glid)/.test(plain) ? "light swish" : "whoosh" };
  if ((type === "entrance" || type === "text") && /\b(screens?|monitors?|phones?|laptops?|computers?|displays?|holograms?|dashboards?|app|interface)\b/.test(plain)) return { family: "electronic", name: "blip up" };
  return null;
}

/** The cues of one shot's motion rows: [{ id, shot, index, name, family, start, offset: 0, prio, small, gain, hold, plan|auto, alt? }].
 *  A row with its own `sound` gets that sound (the Motion Plan's), and its automatic sound as a stand-by (alt) for when the plan's name
 *  finds nothing; a walk gets a footstep every `step` s; a landing sounds when it lands (the row's end). opts: { allow, surface, style,
 *  step, skipCut (the shot's opening transition is the cut's own whoosh) }. */
export function motionCues(shot, motions, opts = {}) {
  const out = [], end = shot.start + (shot.duration ?? Infinity);
  for (const m of [...(motions ?? [])].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))) {
    if (opts.skipCut && m.type === "transition" && (Number(m.start) || 0) <= 0.5 && !m.sound) continue;
    // a source skill whose plain words on screen stay silent (Paper Collage, 3D Cartoon): a row of words gets a sound only when the plan names one (#1198)
    if (opts.textSilent && m.type === "text" && !String(m.sound ?? "").trim()) continue;
    const id = `m:${shot.number}:${String(m.id ?? `${m.type}@${m.start}`).toLowerCase()}`;
    const own = motionSound(m, opts);
    if (own?.none) continue;
    const alt = own?.plan ? motionSound(m, { ...opts, auto: true }) : null;
    for (const [s, prio, extra] of [[own, own?.plan ? PRIO.plan : PRIO.auto, {}], [alt, PRIO.auto, { alt: true }]]) {
      if (!s || s.none) continue;
      const t0 = Number(m.start) || 0, dur = Number(m.duration) || 0;
      const at = (s.at === "end" || s.end) && dur > 0 && dur <= 2.5 ? t0 + dur : t0;
      const base = { shot: shot.number, index: shot.index, name: s.name, family: s.family ?? familyOf(s.name), offset: 0, prio, small: !!s.small,
        gain: s.small ? SMALL_GAIN : 1, ...(prio === PRIO.plan ? { plan: true } : { auto: true }), ...extra };
      if (s.steps && dur > 0) {          // a walk: a footstep every step s while it lasts (at most 16)
        const step = opts.step ?? DENSITY.lively.step, n = Math.min(16, Math.max(1, Math.floor(dur / step) + 1));
        for (let k = 0; k < n; k++) { const t = r3(shot.start + t0 + k * step); if (t < end) out.push({ ...base, id: `${id}:${k}`, start: t }); }
        continue;
      }
      const t = r3(shot.start + at);
      if (t >= end) continue;
      out.push({ ...base, id, start: t, ...(s.hold && dur > 0 ? { hold: r3(dur) } : {}) });
    }
  }
  return out;
}

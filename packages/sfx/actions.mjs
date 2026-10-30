// A sound on every action (the owner, 30/10: "every film in every style must have full sound effects on every action in the film, for a
// lively mood"). What sound each action of the Motion Plan gets and when, how loud each family plays, how many sounds a second a film
// carries, the place of a scene for its ambience bed, and the material a film style's sounds are made of. Pure: the placement
// (auto.mjs) and Tech checks (G-SFX, hf-qa/sfxCover.mjs) read the same rules.
import { familyOf, words } from "./library.mjs";

const r3 = (n) => Math.round(n * 1000) / 1000;
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const any = (ws, list) => list.split(" ").some((w) => ws.has(w));

/** Text being typed: typing, types / typed out (or in), type-on, a typewriter, a keyboard, a caret, gõ chữ. Not the noun "type" (a
 *  film's type block, a typeface): Test 20 got 13 typing sounds from "the type block slides in". */
export const TYPING = /\btyping\b|\btyp(?:es|ed)\s+(?:out|in)\b|\btype-on\b|\btypewriter|\bkeyboard|\bcaret\b|g[õo] ch[ữu]/i;

// ---- Levels, the HyperFrames way (its skills at the pinned commit, Apache-2.0: hyperframes/references/sound.md §4-5, media-use's
// bgm.md, tts.md and scripts/lib/duck.mjs). The voice-over is brought to about -16 LUFS (a mix of -16 to -14 LUFS for social); the music
// sits 4 dB under it between the words and is ducked to a quarter (-12 dB: about -31 LUFS under a -16 voice) while they are spoken; a
// film with no voice has its music at -16 LUFS. Each effect is set by its loudest 400 ms (momentary LUFS: an effect is mostly silence round
// one hit, so its integrated loudness reads low) to HIT_OVER dB over the music between the words ("each hit sits 3-6 dB over the bed"),
// its family a little louder or softer (LEVELS around LEVEL). Owner 30/10, after Tests 21-26: the music at a fixed 0.6 and never ducked
// covered the voice, and the effects, set under the bed, could not be heard. Gains go up to HyperFrames' own ceiling, +12 dB (core
// audioGain.ts MAX_AUDIO_GAIN_DB at 0.8.214: Studio's fader, the preview and the render all carry gain over unity).
export const VOICE_LUFS = -16, ALONE_LUFS = -16;          // the voice-over; the music of a film with no voice
export const BED_UNDER = 4;             // the music between the words, dB under the voice
export const MUSIC_DUCK = 0.25;         // the music while words are spoken (media-use audio-duck's default)
export const HIT_OVER = 4;              // an effect's loudest moment, dB over the music between the words
export const MAX_GAIN = Math.round(10 ** (12 / 20) * 100) / 100;          // +12 dB
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
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
 *  LEVEL), and never more than 2 dB over the voice's own level (`voice`, LUFS): the effects sit in the pauses (afterWords). */
export function hitVolume(family, peak = null, { bed = REF_BED, voice = null } = {}) {
  let target = bed + HIT_OVER + clamp(20 * Math.log10(levelOf(family) / LEVEL), -4, 4);
  if (Number.isFinite(voice)) target = Math.min(target, voice + 2);
  return Math.round(clamp(10 ** ((target - (Number.isFinite(peak) ? peak : REF_LUFS)) / 20), 0.02, MAX_GAIN) * 100) / 100;
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

// ---- Density: lively by default; never two of one family closer than sameFamily, about perSecond sounds in any second, a lower
// priority sound within `same` of a higher one is the same action (one sound), a small move's sound never within smallGap of another
// sound (Test 25: 59 effects in 68 s felt a bit busy; the bigger actions lead). The storyboard's own sounds are kept as named, but two of
// one kind at one moment are one sound (Test 25: two pops moved into the same pause after a word played on top of each other).
export const DENSITY = Object.freeze({
  lively: Object.freeze({ perSecond: 3, sameFamily: 0.2, same: 0.25, small: true, smallGap: 0.3, step: 0.45 }),
  normal: Object.freeze({ perSecond: 2, sameFamily: 0.35, same: 0.4, small: true, smallGap: 0.45, step: 0.6 }),
  low: Object.freeze({ perSecond: 1, sameFamily: 0.6, same: 0.6, small: false, smallGap: 0.6, step: 0.9 }),
});
/** Two cues closer than this are at one moment. */
export const SAME_MOMENT_S = 0.03;
const PRIO = { named: 0, plan: 1, auto: 2 };
/** Thin the cues: { kept (by time), thinned (each with its why) }. Priority: the storyboard's named sounds (kept, but one of a kind at one
 *  moment), then the Motion Plan's `sound`, then the automatic ones; in each, the bigger actions before the small ones. */
export function thin(cues, density = "lively") {
  const D = DENSITY[density] ?? DENSITY.lively, kept = [], thinned = [];
  const p = (c) => c.prio ?? PRIO.auto;
  // busy: some second of the film that holds this sound would hold more than perSecond (the windows that start at a kept sound or at it)
  const busy = (c) => [c.start, ...kept.map((k) => k.start).filter((t) => t <= c.start && t > c.start - 1)]
    .some((w) => 1 + kept.filter((k) => k.start >= w - 1e-6 && k.start < w + 1 - 1e-6).length > D.perSecond);
  const twin = (c) => kept.some((k) => Math.abs(k.start - c.start) < SAME_MOMENT_S && (k.name === c.name || (!!k.family && k.family === c.family)));
  for (const c of [...cues].sort((a, b) => p(a) - p(b) || Number(!!a.small) - Number(!!b.small) || a.start - b.start)) {
    const why = twin(c) ? "same moment"
      : p(c) === PRIO.named ? null
      : c.small && !D.small ? "small"
      : c.small && kept.some((k) => Math.abs(k.start - c.start) < D.smallGap - 1e-6) ? "small"
      : kept.some((k) => p(k) < p(c) && Math.abs(k.start - c.start) < D.same) ? "same moment"
      : kept.some((k) => k.family && k.family === c.family && Math.abs(k.start - c.start) < D.sameFamily - 1e-6) ? "same family"
      : busy(c) ? "busy" : null;
    if (why) thinned.push({ ...c, why }); else kept.push(c);
  }
  return { kept: kept.sort((a, b) => a.start - b.start), thinned: thinned.sort((a, b) => a.start - b.start) };
}

// ---- The style's material: the library's style hint from the style's sound section, else its name (paper and wood for crafted
// styles, synth for CRT and tech, soft and organic for gouache and watercolour, cartoon for rubber-hose)
const STYLE_WORDS = [
  ["cartoon", /\b(rubber[- ]?hose|cartoon|toon|slapstick|boing|zany|looney|fleischer)\b/i],
  ["electronic", /\b(crt|terminal|ascii|teletype|synth\w*|electronic|digital|8-bit|chiptune|glitch\w*|sci-?fi|neon|cyber\w*|tech|hologra\w*|pixel|vhs|relays?)\b/i],
  ["paper", /\b(paper|cardboard|craft\w*|cut[- ]?outs?|collage|origami|stop[- ]?motion|scrapbook|wood(en)?|stationery|pencil|clay)\b/i],
  ["organic", /\b(gouache|watercolou?r|ink|organic|acoustic|natural|nature|hand[- ]?drawn|brush|pastel|storybook|felt|folk|foley)\b/i],
  ["cinematic", /\b(cinematic|epic|trailer|orchestral|blockbuster|hd-2d|dramatic)\b/i],
];
/** One of the library's style hints (organic, electronic, cartoon, paper, cinematic) or null. */
export function styleHint({ palette = "", id = "", title = "" } = {}) {
  for (const text of [palette, `${id ?? ""} ${title ?? ""}`.replace(/[-_/]/g, " ")]) {
    const hit = STYLE_WORDS.find(([, re]) => re.test(String(text ?? "")));
    if (hit) return hit[0];
  }
  return null;
}

// ---- Places: a scene's ambience bed and the ground its footsteps fall on, from `- ambience:`, else the place or time words of its
// `- location:`, its `- sound:` line, its title or its scene
const L = (w) => `(?<!\\p{L})(?:${w})(?!\\p{L})`;
const PLACES = [
  [new RegExp(L("storm|thunderstorm|downpour|heavy rain|mưa (?:to|lớn|bão)|bão"), "iu"), "heavy rain", "wet"],
  [new RegExp(L("rain|rainy|raining|drizzle|mưa"), "iu"), "steady rain", "wet"],
  [new RegExp(L("blizzard|snowstorm|howling wind|bão tuyết"), "iu"), "howling wind", "snow"],
  [new RegExp(L("cafe|café|coffee shop|restaurant|diner|bar|pub|quán|nhà hàng"), "iu"), "restaurant", "wood"],
  [new RegExp(L("classroom|school|lecture hall|lớp học|trường"), "iu"), "classroom", "wood"],
  [new RegExp(L("mall|shopping|supermarket|bazaar|chợ|siêu thị"), "iu"), "mall", "concrete"],
  [new RegExp(L("crowd|audience|party|festival|stadium|đám đông|lễ hội"), "iu"), "crowd murmur", "concrete"],
  [new RegExp(L("traffic|highway|freeway|motorway|giao thông|xa lộ"), "iu"), "traffic", "concrete"],
  [new RegExp(L("street|streets|city|town|downtown|urban|alley|sidewalk|road|phố|đường phố|thành phố"), "iu"), "city street", "concrete"],
  [new RegExp(L("sea|ocean|beach|shore|coast|harbou?r|island|seaside|waves|biển|bãi biển|bến cảng|đảo"), "iu"), "sea waves", "gravel"],
  [new RegExp(L("river|stream|creek|brook|waterfall|sông|suối|thác"), "iu"), "river", "grass"],
  [new RegExp(L("cave|cavern|basement|dungeon|tunnel|hang|hầm"), "iu"), "cave drip", "concrete"],
  [new RegExp(L("pond|marsh|swamp|lake|ao|đầm|hồ"), "iu"), "night frogs", "grass"],
  [new RegExp(L("forest|woods|jungle|rừng"), "iu"), "forest", "grass"],
  [new RegExp(L("campfire|fireplace|hearth|bonfire|lửa trại|lò sưởi"), "iu"), "fireplace", "wood"],
  [new RegExp(L("park|garden|meadow|countryside|farm|village|lawn|morning|dawn|sunrise|vườn|công viên|làng|bình minh|buổi sáng"), "iu"), "morning birds", "grass"],
  [new RegExp(L("summer|tropical|cicadas?|mùa hè|ve sầu"), "iu"), "cicadas", "grass"],
  [new RegExp(L("night|nighttime|midnight|evening|dusk|đêm|ban đêm|buổi tối"), "iu"), "night crickets", "grass"],
  [new RegExp(L("desert|mountain|cliff|hilltop|prairie|windy|wind|sa mạc|núi|gió"), "iu"), "mild wind", "gravel"],
  [new RegExp(L("snow|snowy|winter|tuyết|mùa đông"), "iu"), "mild wind", "snow"],
  [new RegExp(L("room|kitchen|office|bedroom|living room|house|apartment|indoors?|interior|hallway|corridor|workshop|phòng|căn bếp|nhà bếp|văn phòng|căn nhà"), "iu"), "room tone", "wood"],
];
const SURFACES = [[/\b(wood|wooden|floorboards?|plank)\b/, "wood"], [/\b(street|road|pavement|concrete|stone|sidewalk|asphalt|tiles?)\b/, "concrete"],
  [/\b(grass|lawn|meadow|field)\b/, "grass"], [/\b(gravel|path|sand|dirt)\b/, "gravel"], [/\b(snow|snowy)\b/, "snow"], [/\b(carpet|rug)\b/, "carpet soft"],
  [/\b(wet|puddles?|rain)\b/, "wet"]];
/** A shot's place: { query, surface, from } (query: the ambience loop to look up), { none: true } when its `- ambience:` says none, or
 *  null when nothing in it names a place (a motion-graphics shot keeps no bed). */
export function placeOf(shot) {
  const own = String(shot?.ambience ?? "").trim();
  if (/^(none|no|off|silence|-)$/i.test(own)) return { none: true };
  if (own) { const p = PLACES.find(([re]) => re.test(own)); return { query: own.toLowerCase(), surface: p?.[2] ?? null, from: "ambience" }; }
  for (const from of ["location", "sound", "title", "scene"]) {
    const text = String(shot?.[from] ?? "");
    const p = text && PLACES.find(([re]) => re.test(text));
    if (p) return { query: p[1], surface: p[2], from };
  }
  return null;
}

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
    return { name: own.toLowerCase(), family, at: family === "impact" && LANDS.test(textOf(m)) ? "end" : "start", small: SMALL.test(textOf(m)) || m.type === "emphasis", plan: true };
  }
  const type = m?.type ?? "other", raw = textOf(m).toLowerCase(), plain = norm(raw).replace(NOT_LANDS, " "), ws = new Set(words(raw));
  if (type === "loop") return null;
  if (type === "camera") return /\b(whip|swish pan|crash zoom|snap zoom)\b/.test(plain) && allow("whoosh") ? { name: "whoosh", family: "whoosh", at: "start", small: false } : null;
  const small = SMALL.test(raw) || type === "emphasis" || ((type === "entrance" || type === "exit") && FADE_ONLY.test(raw) && !WHOOSHY.test(raw));
  const hit = verbSound({ raw, plain, ws, type, ctx });
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
function verbSound({ raw, plain, ws, type, ctx }) {
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

// ---- Ambience beds: one loop per run of shots in the same place, crossfaded between places, faded in at the start and out with the
// film's ending fade; ducked about 6 dB while words are spoken (HyperFrames' own volume lane, data-automation, the way its media-use
// skill's duck.mjs writes one; Apache-2.0)
export const XFADE = 1, FIRST_FADE = 1;
/** The beds: [{ key, query, entry, start, end, fadeIn, fadeOut, shots }]. find(query): the library's loop for a place (findAmbience). */
export function ambienceBeds(shots, { find, filmEnd = null, endFade = null, xf = XFADE } = {}) {
  const placed = [...(shots ?? [])].filter((s) => s.start != null && s.duration).sort((a, b) => a.start - b.start);
  const runs = [];
  for (const s of placed) {
    const p = placeOf(s), entry = p && !p.none ? find(p.query) : null;
    const prev = runs.at(-1), sEnd = r3(s.start + s.duration);
    if (entry && prev && prev.entry.id === entry.id && Math.abs(prev.end - s.start) < 0.05) { prev.end = sEnd; prev.shots.push(s.number); continue; }
    if (entry) runs.push({ key: `amb:${s.number}`, query: p.query, entry, start: s.start, end: sEnd, shots: [s.number], surface: p.surface });
  }
  const last = filmEnd ?? (placed.length ? Math.max(...placed.map((s) => s.start + s.duration)) : 0);
  return runs.map((b, i) => {
    const before = runs[i - 1], after = runs[i + 1];
    const start = r3(Math.max(0, b.start - (before && Math.abs(before.end - b.start) < 0.05 ? xf / 2 : 0)));
    const atEnd = b.end >= last - 0.05;
    const end = r3(atEnd ? last : Math.min(last, b.end + (after && Math.abs(after.start - b.end) < 0.05 ? xf / 2 : 0)));
    return { ...b, start, end, fadeIn: start <= 0.001 ? Math.min(FIRST_FADE, (end - start) / 3) : xf,
      fadeOut: r3(atEnd ? Math.max(xf, Number(endFade) || 0) : xf) };
  });
}
/** A bed as clips of its loop: one clip, or for a bed longer than the loop the loop again in equal clips crossfaded by xf (no stub at the
 *  end): [{ start, duration, fadeIn, fadeOut }]. */
export function tiles(bed, loopS, xf = XFADE) {
  const len = bed.end - bed.start;
  if (!(loopS > xf * 2) || len <= loopS + 0.01) return [{ start: bed.start, duration: r3(len), fadeIn: bed.fadeIn, fadeOut: bed.fadeOut }];
  const n = Math.ceil((len - xf) / (loopS - xf)), step = (len - xf) / n;
  return Array.from({ length: n }, (_, k) => ({ start: r3(bed.start + k * step), duration: r3(k === n - 1 ? len - k * step : step + xf),
    fadeIn: k ? xf : bed.fadeIn, fadeOut: k === n - 1 ? bed.fadeOut : xf }));
}
/** The spoken spans (words closer than 0.6 s merged), film seconds. */
export function speechSpans(words, gap = 0.6) {
  const out = [];
  for (const w of [...(words ?? [])].sort((a, b) => a.start - b.start)) {
    const prev = out.at(-1);
    if (prev && w.start - prev.end < gap) prev.end = Math.max(prev.end, w.end); else out.push({ start: w.start, end: w.end });
  }
  return out;
}
/** The volume lane of a clip that ducks under the spans (clip-local seconds, HF's data-automation: full level before each span, `duck`
 *  from its first word to its last, back up after), or null when no word falls in it. The spans are 0.6 s apart at least (speechSpans),
 *  more than an attack and a release, so the envelope never folds back. */
export function duckLane(clip, spans, { duck = DUCK, attack = 0.15, release = 0.4 } = {}) {
  const a = clip.start, b = clip.start + clip.duration;
  const inside = (spans ?? []).filter((s) => s.end > a && s.start < b);
  if (!inside.length) return null;
  const env = inside.flatMap((s) => [[s.start - attack, 1], [s.start, duck], [s.end, duck], [s.end + release, 1]]);
  const at = (t) => {
    if (t <= env[0][0]) return env[0][1];
    for (let i = 1; i < env.length; i++) if (t <= env[i][0]) { const [t0, v0] = env[i - 1], [t1, v1] = env[i]; return t1 > t0 ? v0 + ((v1 - v0) * (t - t0)) / (t1 - t0) : v1; }
    return env.at(-1)[1];
  };
  const pts = [{ t: 0, v: r3(at(a)) }];
  for (const [t, v] of env) if (t > a && t < b && r3(t - a) > pts.at(-1).t) pts.push({ t: r3(t - a), v });
  if (r3(clip.duration) > pts.at(-1).t) pts.push({ t: r3(clip.duration), v: r3(at(b)) });
  return { version: 1, lanes: [{ target: "volume", points: pts.slice(0, 512) }] };
}

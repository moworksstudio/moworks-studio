// The offline sound-effect library that ships with the app (bundle/sfx): about 230 short CC0 / public-domain sounds in 21 families, made
// by tools/make-sfx-library.mjs from Kenney's audio packs, OpenGameArt CC0 sets and Wikimedia Commons (every sound's author, page,
// licence and original file in bundle/sfx/catalog.json and CREDITS.md). Films get a sound for every action without the online search.
// findLocal(name) answers a cue name ("keyboard typing", "lamp ting", "boat bell", "crt power on") with the best entry, or null.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

/** The library's families: every catalog entry has one. */
export const FAMILIES = Object.freeze(["pop", "whoosh", "impact", "footstep", "cloth", "paper", "door", "switch", "water", "wind", "rain", "fire",
  "bell", "click", "typing", "mechanical", "electronic", "magic", "animal", "crowd", "ambience"]);
/** Style hints a cue may carry ("organic", "paper"…): entries tagged with the style score a little higher. */
export const STYLES = Object.freeze(["organic", "electronic", "cartoon", "cinematic", "paper"]);

export const libraryDir = (root = APP_ROOT) => join(root, "bundle", "sfx");

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
// irregular forms first, then a light stemmer (plural, -ing, -ed; "dripping" -> "drip", "typing" -> "type")
const ALIAS = { typing: "type", typed: "type", types: "type", typewriting: "typewriter", keys: "key", woosh: "whoosh", swoosh: "whoosh", whooshes: "whoosh",
  footsteps: "footstep", steps: "step", leaves: "leaf", bees: "bee", geese: "goose", mice: "mouse", children: "kid", kids: "kid", people: "people",
  clothes: "cloth", clothing: "cloth", glasses: "glass", boxes: "box", ambient: "ambience", ambiance: "ambience", atmos: "ambience", chimes: "chime",
  bells: "bell", gulls: "gull", seagulls: "seagull", crickets: "cricket", cicadas: "cicada", frogs: "frog", birds: "bird", dogs: "dog", cats: "cat",
  pages: "page", papers: "paper", cards: "card", waves: "wave", drops: "drop", droplets: "drop", droplet: "drop", raindrops: "rain", pouring: "pour",
  sparkles: "sparkle", sparkling: "sparkle", sparkly: "sparkle", glittering: "glitter", shimmering: "shimmer", twinkling: "twinkle", birdsong: "bird",
  tv: "television", telly: "television", monitor: "screen", bike: "bicycle", ship: "boat", ships: "boat", oars: "oar", rowing: "row", paddling: "paddle",
  "e-mail": "email", ok: "okay", pc: "computer", wooden: "wood", sewing: "sew", sewn: "sew", sews: "sew", embroidery: "embroider", embroidered: "embroider",
  rattling: "rattle", rattles: "rattle", clattering: "clatter" };
function stem(w) {
  if (ALIAS[w]) return ALIAS[w];
  let s = w;
  if (s.length > 4 && s.endsWith("ies")) s = `${s.slice(0, -3)}y`;
  else if (s.length > 5 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 4 && /(sh|ch|ss|x|z)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith("ed")) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  if (s !== w && /([bdgmnprt])\1$/.test(s)) s = s.slice(0, -1);      // dripp -> drip, tapp -> tap (not buzz, roll, hiss)
  return s;
}
const STOP = new Set(["a", "an", "the", "of", "on", "in", "at", "to", "and", "with", "from", "into", "onto", "for", "as", "by", "sfx", "sound", "sounds", "effect", "effects", "fx",
  "through", "across", "over", "under", "around", "behind", "toward", "towards", "against", "inside", "along", "past", "beside", "between", "upon", "via",
  "tieng", "am", "thanh", "keu", "con", "cai", "chiec", "nhe", "khi"]);
// Vietnamese cue words (accents already stripped), as English words the tags use
const VI = [[/\bgo phim\b/g, "typing"], [/\bban phim\b/g, "keyboard"], [/\bmay danh chu\b/g, "typewriter"], [/\bbuoc chan\b/g, "footstep"], [/\bvo tay\b/g, "applause"],
  [/\bdong ho\b/g, "clock"], [/\bmay in\b/g, "printer"], [/\bdam dong\b/g, "crowd"], [/\bmo cua\b/g, "door open"], [/\bdong cua\b/g, "door close"],
  [/\bbat den\b/g, "light switch on"], [/\btat den\b/g, "light switch off"], [/\bgiot nuoc\b|\bnho giot\b/g, "water drip"], [/\brot nuoc\b/g, "water pour"],
  [/\blat trang\b/g, "page turn"], [/\bvo giay\b|\bvo vien giay\b/g, "paper crumple"], [/\bcho sua\b/g, "dog bark"], [/\bga gay\b/g, "rooster crow"], [/\bchim hot\b/g, "bird chirp"],
  [/\bmeo keu\b/g, "cat meow"], [/\bsam set\b|\bsam\b/g, "thunder"], [/\bmai cheo\b|\bbo cheo\b|\bcheo thuyen\b|\bcheo\b/g, "oar paddle"], [/\bchuong thuyen\b/g, "boat bell"],
  [/\bchuong\b/g, "bell"], [/\bmua\b/g, "rain"], [/\bgio\b/g, "wind"], [/\bnuoc\b/g, "water"], [/\blua\b/g, "fire"], [/\bchim\b/g, "bird"], [/\bsong\b/g, "wave"],
  [/\bbien\b/g, "sea"], [/\bsong suoi\b|\bsuoi\b/g, "stream"], [/\bgiay\b/g, "paper"], [/\bcua\b/g, "door"], [/\brung\b/g, "forest"], [/\bdem\b/g, "night"], [/\bpho\b/g, "street"],
  [/\bphep thuat\b|\bphep\b/g, "magic"], [/\blap lanh\b|\blong lanh\b/g, "sparkle"], [/\bvut\b|\bvun vut\b/g, "whoosh"], [/\bbup\b|\bbop\b/g, "pop"], [/\bbinh\b/g, "pop"]];
/** The words of a cue name or tag, normalised and stemmed. "on"/"off" stay when they follow "power"/"switch"/"turn" (power on). */
export function words(s) {
  let t = norm(s);
  if (/[a-z]/.test(t)) for (const [re, en] of VI) t = t.replace(re, en);
  const raw = t.split(/[^a-z0-9]+/).filter(Boolean);
  return raw.filter((w, i) => !STOP.has(w) || ((w === "on" || w === "off") && /^(power|switch|turn|light|lamp|plug)/.test(raw[i - 1] ?? ""))).map(stem);
}

// Words that name the same kind of sound: a cue word that is not a tag still finds the sounds of its group (weaker than a direct tag).
const GROUPS = [
  ["bell", "ding", "dong", "ting", "tink", "ring", "chime", "jingle", "tinkle", "gong", "toll"],
  ["whoosh", "swish", "swipe", "whip", "sweep", "rush", "zip", "fly", "pass"],
  ["impact", "thud", "thump", "bump", "bonk", "knock", "hit", "smack", "slam", "bang", "clunk", "land", "drop", "fall", "punch", "catch"],
  ["rattle", "shake", "shaker", "clatter", "jiggle"],
  ["footstep", "step", "walk", "stomp", "tread", "pace", "run", "foot"],
  ["cloth", "rustle", "fabric", "garment", "jacket", "shirt", "dress", "coat", "leather", "thread", "needle", "stitch", "sew", "yarn", "floss", "linen", "flutter", "flap"],
  ["paper", "page", "sheet", "book", "card", "crumple", "crinkle", "letter", "map", "envelope", "flip"],
  ["door", "drawer", "hinge", "latch", "gate", "creak", "lock", "unlock", "cupboard", "cabinet"],
  ["switch", "toggle", "lever", "plug", "button", "lamp", "light"],
  ["water", "drip", "splash", "pour", "river", "stream", "wave", "oar", "paddle", "row", "bubble", "liquid", "puddle", "tap", "faucet", "boat"],
  ["wind", "gust", "breeze", "blizzard", "gale", "howl", "draft", "storm"],
  ["rain", "drizzle", "downpour", "shower", "thunder", "storm", "rainfall"],
  ["fire", "flame", "crackle", "ember", "campfire", "fireplace", "burn", "match", "torch", "ignite"],
  ["click", "tap", "button", "tick", "select", "press", "ui", "notification", "tock"],
  ["type", "keyboard", "keystroke", "keypress", "typewriter", "key", "keys"],
  ["mechanical", "machine", "gear", "printer", "motor", "engine", "cog", "ratchet", "clockwork", "crank", "factory", "print"],
  ["electronic", "beep", "bleep", "blip", "glitch", "static", "crt", "power", "zap", "laser", "computer", "digital", "electric", "synth", "boot", "television", "screen", "robot"],
  ["magic", "sparkle", "shimmer", "twinkle", "glitter", "spell", "fairy", "glint", "glow", "enchant", "wand", "heal"],
  ["animal", "dog", "cat", "bird", "chirp", "tweet", "rooster", "cow", "sheep", "horse", "gull", "seagull", "frog", "bark", "meow", "moo", "baa", "neigh", "insect", "bug"],
  ["crowd", "people", "murmur", "chatter", "applause", "cheer", "walla", "audience", "clap", "talk", "party"],
  ["ambience", "room", "tone", "atmosphere", "background", "street", "city", "forest", "night", "loop", "bed", "hum", "traffic"],
].map((g) => g.map(stem));
const GROUP_OF = new Map();
for (const g of GROUPS) for (const w of g) GROUP_OF.set(w, [...(GROUP_OF.get(w) ?? []), ...g.filter((x) => x !== w)]);
// The family a word points at (the cue's head word wins: "lamp ting" is a ting, "oar paddle" a paddle, "heavy enter key" a key).
const FAMILY_WORDS = {
  pop: "pop plop bloop blop boing pluck appear spawn bounce", whoosh: "whoosh swish swipe whip sweep transition",
  impact: "impact thud thump bump bonk smack punch slam bang hit crash clunk rattle clatter catch",          // a hand's catch, not a door's (Test 27: "soft catch" got a latch)
  footstep: "footstep step walk stomp tread", cloth: "cloth rustle fabric velcro leather flutter flap", paper: "paper page book card crumple crinkle map envelope slide",
  door: "door drawer hinge latch gate creak lock unlock", switch: "switch toggle lever plug", water: "water drip splash pour river stream wave oar paddle bubble puddle faucet",
  wind: "wind gust breeze blizzard gale", rain: "rain drizzle downpour thunder", fire: "fire flame crackle ember campfire fireplace match torch",
  bell: "bell ding dong ting tink chime gong toll", click: "click tick tock select notification error confirm hover", typing: "type keyboard keystroke keypress typewriter key",
  mechanical: "mechanical machine gear printer motor engine cog ratchet clockwork crank cassette", electronic: "electronic beep bleep blip glitch static crt zap laser computer digital electric synth television power",
  magic: "magic sparkle shimmer twinkle glitter spell fairy glint wand heal", animal: "animal dog cat bird chirp tweet rooster cow sheep horse gull seagull frog bark meow moo baa insect bug wolf",
  crowd: "crowd murmur chatter applause cheer walla audience clap", ambience: "ambience room tone atmosphere background street city forest night traffic",
};
const FAMILY_OF = new Map();
for (const [f, ws] of Object.entries(FAMILY_WORDS)) for (const w of ws.split(" ")) FAMILY_OF.set(stem(w), f);
// The thing a cue is about when none of its words names a sound ("thread pull", "needle park", "small wooden box close"): its sound is that
// thing's (cloth for a thread or a needle, paper and cardboard for a box), never another thing's that shares the verb (Test 26: a plug's
// "pull", a park's birds, a door's "close"). A material alone ("wood spool roll") says impact.
const OBJECT_WORDS = {
  cloth: "thread needle stitch sew embroider floss yarn wool string rope linen silk cotton lace ribbon seam quilt hem knot wing feather sail scarf cape curtain flag banner blanket towel sleeve",
  paper: "box lid cardboard carton parcel package pencil pen chalk crayon marker scribble sketch notebook newspaper ticket receipt postcard origami",
  impact: "spool bobbin dice marble pebble brick pepper salt shaker spice",          // a shaker shakes in rattles (Test 27: "pepper shake" got a cloth)
  animal: "bee wasp hornet mosquito beetle", mechanical: "chain",
  water: "stomach tummy fish koi carp goldfish",          // a hungry stomach growls in gurgles (Test 25's "stomach growl"); a fish turns in water
  footstep: "boot shoe sneaker heel slipper sandal",          // a rubber boot's hop is a step (Test 27: "boot" took the computer's power-on, ten times)
};
const OBJECT_OF = new Map();
for (const [f, ws] of Object.entries(OBJECT_WORDS)) for (const w of ws.split(" ")) OBJECT_OF.set(stem(w), f);
const MATERIALS = new Set(["wood", "metal", "glass", "stone", "plastic", "ceramic"]);
/** The kind of sound a cue's words ask for: { want: its family, obj: the thing that decided it (null when a sound word did) }. The last word
 *  that names a sound wins ("soft wood thud": a thud); else the last thing ("thread pull": a thread), else a material. */
function kindOf(q) {
  const head = [...q].reverse().find((w) => FAMILY_OF.has(w));
  if (head) return { want: FAMILY_OF.get(head), obj: null };
  const obj = [...q].reverse().find((w) => OBJECT_OF.has(w)) ?? [...q].reverse().find((w) => MATERIALS.has(w));
  return obj ? { want: OBJECT_OF.get(obj) ?? "impact", obj } : { want: null, obj: null };
}
// A family's plain, soft sound: what a cue of that kind gets when no sound of the library matches its words (better than a wrong specific
// one). Wind, rain, animals, crowds and places have none: nothing rather than a guess.
// Also what a cue gets whose only word the library knows is its family's name ("water swirl", "whoosh up"): never an arbitrary member of the
// family (Test 27: a boiling kettle and a drink for "water swirl", a sword's swish for "whoosh up").
const GENERIC = { pop: "soft pop", whoosh: "soft whoosh", impact: "soft thud", footstep: "footstep wood soft", cloth: "cloth rustle", paper: "paper rustle",
  door: "latch", switch: "switch", water: "small splash", fire: "fire crackle", bell: "bell ding", click: "soft tick", typing: "key tap", mechanical: "ratchet",
  electronic: "blip", magic: "sparkle" };
// how big or soft a sound is: its variants differ by these, not by what they are of
const SIZES = new Set(["heavy", "light", "soft", "small", "big", "short", "long", "quick", "fast", "slow", "deep"]);
// the words that name a family itself ("water", "whoosh", "type" for typing)
const FAMILY_NAMES = new Set(["pop", "whoosh", "impact", "footstep", "cloth", "paper", "door", "switch", "water", "wind", "rain", "fire", "bell", "click", "typing",
  "mechanical", "electronic", "magic", "animal", "crowd", "ambience"].map(stem));
const AMBIENT = new Set(["ambience", "loop", "background", "bed", "atmosphere", "tone", "constant", "steady", "continuous"].map(stem));
// A place or weather that sounds for a whole shot: the loop is as good an answer as a one-shot ("rain", "river", "night", "cave drip")
const ENV = new Set(["rain", "sea", "ocean", "river", "lake", "forest", "street", "traffic", "city", "night", "cricket", "cicada", "insect", "crowd", "murmur", "chatter", "room",
  "wind", "blizzard", "fireplace", "campfire", "cafe", "restaurant", "mall", "classroom", "cave", "beach", "shore", "park", "garden", "jungle", "highway", "rapids"].map(stem));

let cache = null;
/** The bundled catalog (cached; read again when catalog.json changes): { dir, about, made, sounds }. Each sound keeps the catalog's fields
 *  and gets `path`, its absolute file. An empty library when the bundle has none. */
export function loadLibrary(root = APP_ROOT) {
  const dir = libraryDir(root), file = join(dir, "catalog.json");
  const mtime = existsSync(file) ? statSync(file).mtimeMs : 0;
  if (cache?.file === file && cache.mtime === mtime) return cache.lib;
  let cat = { sounds: [] };
  try { cat = JSON.parse(readFileSync(file, "utf8")); } catch { /* no library: findLocal answers null */ }
  const lib = fromCatalog(cat, dir);
  cache = { file, mtime, lib };
  return lib;
}
/** A library object from a catalog already read (tests, tools): { dir, about, made, sounds }. */
export function fromCatalog(cat, dir = "") {
  const sounds = (cat.sounds ?? []).map((s) => ({ ...s, path: dir ? join(dir, ...String(s.file).split("/")) : null }));
  const index = sounds.map((s) => {
    const tags = s.tags ?? [];
    // heads: a tag's own word or the last word of a phrase tag ("fish tank" is a tank: "fish" in it counts less); idWords: what its id names
    // besides its family and its number (a "click" cue is a camera's shutter only when it says camera)
    return { s, words: new Set(tags.flatMap(words)), heads: new Set(tags.map((t) => words(t).at(-1)).filter(Boolean)), phrases: new Set(tags.map((t) => words(t).join(" ")).filter((p) => p.includes(" "))),
      idWords: new Set(words(s.id)), idOwn: words(s.id).filter((w) => !/^\d+$/.test(w) && !FAMILY_NAMES.has(w) && !SIZES.has(w)), first: words(tags[0] ?? "").join(" ") };
  });
  const lib = { dir, about: cat.about ?? "", made: cat.made ?? null, sounds };
  INDEX.set(lib, index);
  return lib;
}
const INDEX = new WeakMap();

/** The longest sound a cue may get (index.mjs MAX_AUTO_S: a clip plays at most that long). */
const ONE_SHOT_MAX_S = 6;
/** Every entry scored for a cue name, best first: [{ entry, score }] (only those that match). Options as findLocal; oneShot: true leaves out
 *  the ambience loops and the recordings longer than a cue may play (a cue is one sound at its moment: only the ambience beds use a loop;
 *  Test 26's "needle park" got 4.3 s of birds, and "rain" would get a 10 s thunder roll). */
export function rankLocal(name, { family = null, style = null, exclude = [], library = null, root = APP_ROOT, oneShot = false } = {}) {
  const lib = library ?? loadLibrary(root), index = INDEX.get(lib) ?? INDEX.get(fromCatalog({ sounds: lib.sounds }, lib.dir)) ?? [];
  const q = words(name);
  if (!q.length) return [];
  const skip = new Set(exclude instanceof Set ? exclude : [].concat(exclude ?? []));
  const { want, obj } = kindOf(q);
  // "rain", "night forest": a place for the whole shot; "wind gust", "cave drip": an event in it (the head word decides)
  const ambient = q.some((w) => AMBIENT.has(w)) || family === "ambience", env = ENV.has(q[q.length - 1]), name1 = q.join(" ");
  const grams = [];
  for (let n = 2; n <= Math.min(3, q.length); n++) for (let i = 0; i + n <= q.length; i++) grams.push(q.slice(i, i + n).join(" "));
  const styleWords = new Set(words(style ?? ""));
  const out = [];
  for (const { s, words: ws, heads, phrases, idWords, idOwn, first } of index) {
    if (skip.has(s.id) || (oneShot && (s.loop || s.duration > ONE_SHOT_MAX_S))) continue;
    // a cue about a thing: another kind's sound only when that thing is one of its own tags (a thread's pull is no plug's, a box no door)
    if (obj && s.family !== want && !ws.has(obj)) continue;
    let score = 0, direct = 0;
    const hits = [];
    q.forEach((w, i) => {
      const wt = i === q.length - 1 ? 1.5 : 1;
      if (ws.has(w)) { score += (heads.has(w) ? 3 : 2) * wt; direct++; hits.push(w); }
      else if ((GROUP_OF.get(w) ?? []).some((x) => ws.has(x))) score += 1.2 * wt;
      if (idWords.has(w)) score += 0.5;
    });
    // the cue's head word names its kind, and a sound of another kind shares only that word: another meaning of it ("ball catch" is no
    // door's catch, Test 27); "door catch" names the door too
    if (want && !obj && s.family !== want && s.family !== family && hits.length === 1 && hits[0] === q[q.length - 1] && FAMILY_OF.get(hits[0]) === want) continue;
    const own = idOwn.filter((w) => !q.includes(w)).length;          // what the sound is of that the cue does not name (a camera's click)
    score -= 0.05 * own;          // breaks a tie for the plainer sound
    for (const g of grams) if (phrases.has(g)) score += 3;
    if (!direct && score < 2) continue;                                // no word of the cue and nothing of its kind
    if (first === name1) score += 0.3;                                 // the cue is the sound's first tag, its plain name ("bell": a bell, before a bicycle bell)
    if (want && s.family === want) score += 2.5;
    if (family && s.family === family) score += 4;
    for (const st of styleWords) if (ws.has(st)) score += 1.5;
    score += s.loop ? (ambient ? 4 : env ? 3.5 : -2) : (ambient ? -1 : 0);       // actions get one-shots; "rain", "rain ambience" the loop
    // direct: how many of the cue's words are the sound's own tags; last: its last word is (the head of "lamp ting", "oar paddle")
    if (score >= 3) out.push({ entry: s, score: Math.round(score * 100) / 100, direct, hits, own, last: ws.has(q[q.length - 1]) });
  }
  return out.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
}

/** A cue name looked up: { entry, score, choices, good, right, generic? } or null. choices: the best entry and its close variants (what
 *  findLocal's seed picks from), best first; good: the name is matched by the sound's own tags (its last word, or most of its words), not
 *  only by words of its kind, so the online search need not be asked (the placement looks the library up first); right: the sound is of the
 *  cue's own kind (opts.family, else the family its words name), good enough not to wait on the search either. A loose match of another
 *  kind is no answer for a cue whose kind is known: that kind's soft, plain sound instead (generic: true), or null for a kind with none. */
export function matchLocal(name, opts = {}) {
  const fam = opts.family ?? familyOf(name), q = words(name);
  if (opts.oneShot && fam === "ambience") return null;          // a place's sound is its ambience bed, never a cue's one-shot ("room tone": no beep)
  const ranked = rankLocal(name, opts), n = q.length;
  // a cue named for a place or a weather ("rain", "crowd murmur") takes a one-shot only when it is that very sound, never a thunder crack
  // or an applause of its kind (the ambience bed is its sound)
  const env = opts.oneShot && ENV.has(q.at(-1)) && !kindOf(q).obj;
  const top = env && (!ranked[0]?.last || (fam && ranked[0].entry.family !== fam)) ? undefined : ranked[0];
  const good = !!top && (top.last || top.direct >= Math.ceil(n / 2));
  // only the family's own name matched ("water swirl": every water sound says "water"): an arbitrary member of it is a guess
  const plainOnly = !!top && n > 1 && top.hits.length > 0 && top.hits.every((w) => FAMILY_NAMES.has(w)) && !!GENERIC[fam];
  // weak and wrong: matched by none of its words (only words of its kind), or a loose match of another kind
  if (fam && (!top || plainOnly || (!good && (!top.direct || top.entry.family !== fam)))) {
    const plain = GENERIC[fam] ? rankLocal(GENERIC[fam], { ...opts, family: fam }).filter((r) => r.entry.family === fam) : [];
    return plain.length ? { ...picked(plain), good: false, right: true, generic: true } : null;
  }
  if (!top) return null;
  return { ...picked(ranked), good, right: !!fam && top.entry.family === fam };
}
/** The best of a ranking and its close variants: its ties, its own numbered variants, and a sound of its family about as close that answers
 *  the name's last word too (a film's repeats need more than one file). At most four: a generic name ("whoosh" ties 14 ways) keeps one
 *  character through the film. */
function picked(ranked) {
  const top = ranked[0], base = baseId(top.entry.id);
  const close = (r) => r.score >= top.score - 0.01 || (baseId(r.entry.id) === base && r.score >= top.score - 1.5)
    || (top.last && r.last && r.entry.family === top.entry.family && r.own <= top.own && r.score >= top.score - 0.6);
  const choices = ranked.filter(close).slice(0, 4).map((r) => r.entry);
  return { entry: top.entry, score: top.score, choices };
}

/** The best library entry for a cue name, or null. family: prefer that family; style: "organic" | "paper" | "electronic" | "cartoon" |
 *  "cinematic" (a light hint through the tags); exclude: ids not to use; seed: when several variants tie (footstep-wood-1, -2…), the
 *  seed picks one of them (pickVariant), so the same cue twice in a film need not get the same file. */
export function findLocal(name, opts = {}) {
  const m = matchLocal(name, opts);
  if (!m) return null;
  return opts.seed == null ? m.entry : pickVariant(m.choices, opts.seed);
}

/** The family a cue name points at by its head word ("lamp ting": bell, "wood knock": impact), else by the thing it is about ("thread
 *  pull": cloth, "small wooden box close": paper, "bee buzz": animal), or null. */
export function familyOf(name) {
  return kindOf(words(name)).want;
}

/** A library sound in plain words for the owner ("cloth rustle"), never its id or file. */
export const plainName = (entry) => baseId(entry?.id ?? "").replace(/-/g, " ");

/** The ambience loop for a place ("steady rain", "city street", "night crickets"): the best loop whose own tags name one of the place's
 *  words (never a loop matched only by "ambience"), or null. */
export function findAmbience(place, opts = {}) {
  const own = new Set(words(place));
  if (!own.size) return null;
  const hit = rankLocal(`${place} ambience`, opts).find((r) => r.entry.loop && (r.entry.tags ?? []).some((t) => words(t).some((w) => own.has(w))));
  return hit?.entry ?? null;
}

/** "footstep-wood-soft-2" -> "footstep-wood-soft": the id without its variant number. */
export const baseId = (id) => String(id).replace(/-\d+$/, "");
/** The entries that are variants of one another (same id but the number). */
export function variantsOf(entry, { library = null, root = APP_ROOT } = {}) {
  const lib = library ?? loadLibrary(root), b = baseId(entry.id);
  return lib.sounds.filter((s) => baseId(s.id) === b);
}
/** Deterministic variety: one of `entries` for `seed` (a number or a string such as "shot-3:pop"); the same seed always gives the same
 *  entry, different seeds spread over all of them. null for no entries. */
export function pickVariant(entries, seed = 0) {
  const list = [...(entries ?? [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (!list.length) return null;
  let h = 0x811c9dc5;
  for (const ch of String(seed)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return list[h % list.length];
}

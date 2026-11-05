// The recipes the app makes sound effects from by code (owner 04/11/2026, #888, #889, #899, #909, #910: "a sound-effect library built by
// code for the films; only a sound the code cannot make is searched online"). Each entry is one sound the code can make: what it is called
// (tags, matched against a cue's words the way the offline library is, library.mjs rankLocal), its family, its length, and the recipe and
// parameters that make it (tools/sfx-code/recipes.py: the app's own recipes, written with the owner's sfxlib; or the owner's own kits'
// recipes, run as they ship). Pure data; packages/sfx/code.mjs matches, makes and records them.
//
// The owner's kits' prebuilt sounds (bundle/sfx, source.kind "code", ids pc-, sm-, iv-, c3-, x2-, rc-) are recipes too: each is made again by
// its kit's own recipe with a new seed when a film needs more takes of it. A kit style's signature sounds (SIGNATURE) stay in that style's
// films; every other one is neutral and any film may take it (owner #909).

/** The film styles made from the owner's kits: they take code-made sounds only, the kits' own sound rules forbid downloaded ones (owner #909). */
export const KIT_STYLES = Object.freeze(["paper-collage", "stickman-explainer", "inner-voice-short", "cartoon-3d", "explainer-2d", "ricks-clip"]);
/** The kit recipe of a prebuilt kit sound: its id's prefix names the kit's builder, the rest the sound in its SOUNDS (or GENERATORS); Ricks Clip's
 *  (rc-, owner #1073): a synth of its worked example's audio.py, called as its cue table calls it (tools/sfx-code/make.py RC_CALLS). */
const KIT_BUILDERS = { pc: "paper-collage/build_kit", sm: "story/build_stickman", iv: "story/build_inner_voice", c3: "cartoon-3d/build_sounds", x2: "explainer-2d/sfx", rc: "ricks-clip/audio" };
export const kitRecipe = (id) => {
  const m = /^(pc|sm|iv|c3|x2|rc)-(.+)$/.exec(String(id));
  return m ? `kit:${KIT_BUILDERS[m[1]]}:${m[1] === "x2" ? m[2].replace(/-/g, "_") : m[2]}` : null;
};
/** A kit style's own sounds that stay in its films (paper tear, stamp and slam of Paper Collage, Stickman's marimba tags, Inner Voice's guitar
 *  and dread, 3D Cartoon's stingers, the 2D Explainer's title and reveal tuned to its own music, Ricks Clip's twist sting). */
export const SIGNATURE = Object.freeze(new Set(["pc-tear", "pc-stamp", "pc-slam", "pc-shot", "sm-tag-d", "sm-tag-fs", "sm-tag-a", "iv-harmonics",
  "iv-strum-sour", "iv-string-mute", "iv-dread", "c3-win", "c3-resolve", "x2-reveal", "x2-title", "rc-sting"]));

// ---- the app's own recipes (tools/sfx-code/recipes.py)
const out = [];
const add = (id, recipe, params, family, tags, duration, extra = {}) => out.push({ id: `code-${id}`, recipe, params, family, tags, duration, ...extra });
const lasting = { sustained: true };

// what each material is called, and the things made of it a cue may name
const MATS = {
  wood: ["wood", "wooden", "table", "desk", "crate", "plank", "shelf", "chair", "sign", "board", "oak", "floor", "log", "stick", "bench", "box"],
  metal: ["metal", "steel", "iron", "tin", "pan", "pot", "pipe", "can", "anvil", "pole", "rail", "shutter", "frame", "sword", "helmet"],
  brass: ["brass", "bronze", "copper", "trumpet", "medal", "coin"],
  glass: ["glass", "bottle", "jar", "window", "vase", "lens", "marble"],
  ceramic: ["ceramic", "porcelain", "cup", "mug", "plate", "dish", "bowl", "teacup", "pottery", "tile"],
  stone: ["stone", "rock", "brick", "boulder", "concrete", "pebble", "clay", "roof tiles"],
  plastic: ["plastic", "toy", "phone", "case", "remote", "button"],
  soft: ["soft", "pillow", "cushion", "bag", "sack", "mat", "bed", "sofa", "felt", "fig", "fruit"],
  paper: ["paper", "book", "card", "letter", "notebook", "folder"],
  cardboard: ["cardboard", "carton", "parcel", "package"],
  body: ["body", "person", "man", "woman", "fall", "punch", "fist", "kick", "hand", "wrist", "elbow"],
  rubber: ["rubber", "ball", "boot", "tyre", "eraser"],
};
for (const [m, things] of Object.entries(MATS)) {
  const w = m === "wood" ? "wood" : m;
  add(`impact-${m}`, "impact", { material: m, weight: 0.5 }, "impact", [`impact ${w}`, `${w} thud`, `${w} hit`, `${w} bump`, `${w} drop`, `${w} land`, `${w} impact`, ...things], 0.6);
  add(`impact-${m}-heavy`, "impact", { material: m, weight: 0.95 }, "impact", [`heavy ${w} slam`, `${w} slam`, `${w} crash`, `${w} bang`, `heavy ${w} thud`, `${w} boom`, "heavy", ...things.slice(0, 6)], 1.0);
  add(`impact-${m}-light`, "impact", { material: m, weight: 0.15 }, "impact", [`light ${w} thud`, `small ${w} impact`, `${w} set down`, `${w} settle`, "light", "small", ...things.slice(0, 6)], 0.4);
}
add("impact-plain", "impact", { material: "soft", weight: 0.5 }, "impact", ["soft thud", "thud", "impact thud", "soft impact", "bump", "thump", "landing", "plonk"], 0.5);
add("impact-deep", "impact", { material: "body", weight: 1 }, "impact", ["deep low hit", "deep hit", "low boom", "boom", "big hit", "impact slam", "slam", "heavy impact"], 1.1);
for (const m of ["wood", "metal", "glass", "ceramic", "plastic", "stone"]) add(`tap-${m}`, "tap", { material: m }, "impact", [`${m} tap`, `tap on ${m}`, `${m} touch`, `light ${m} tap`, "tap", "touch", ...MATS[m].slice(0, 5)], 0.3);
add("knock-wood", "knock", { material: "wood", n: 3 }, "impact", ["door knock wood", "door knock", "knock on door", "wood knock", "knocking", "knock", "knuckles", "rap", "door"], 0.9);
add("knock-wood-two", "knock", { material: "wood", n: 2 }, "impact", ["two knocks", "knock knock", "door knock wood second", "door knock wood third", "table knock"], 0.6);
add("knock-metal", "knock", { material: "metal", n: 3 }, "impact", ["steel door knock", "metal knock", "knock on metal", "iron knock"], 0.9);
add("clink-glass", "clink", { material: "glass", n: 2 }, "impact", ["glasses clink", "glass clink", "cheers", "toast", "glass ping", "glass tap", "glass touch", "glass"], 0.9);
add("clink-ceramic", "clink", { material: "ceramic", n: 2 }, "impact", ["cup clink", "porcelain cup clink", "plate clink", "plate knock", "ceramic clink", "dish clink", "saucer"], 0.8);
add("clink-metal", "clink", { material: "metal", n: 2 }, "impact", ["spoon clink", "cutlery clink", "fork", "knife", "spoon", "metal clink", "light metal tap", "small brass tap"], 0.8);
add("rattle-metal", "rattle", { material: "metal", dur: 0.8 }, "impact", ["metal rattle", "chain rattle", "loose watch rattle", "rattle", "shake", "clatter", "door rattle", "chain"], 1.0);
add("rattle-glass", "rattle", { material: "glass", dur: 0.7 }, "impact", ["glass rattle", "glass rattle on table", "bottles rattle", "jar rattle"], 0.9);
add("rattle-wood", "rattle", { material: "wood", dur: 0.7 }, "impact", ["wood rattle", "box rattle", "dice", "pencils rattle", "beads", "wooden blocks"], 0.9);
add("rattle-plastic", "rattle", { material: "plastic", dur: 0.6 }, "impact", ["plastic rattle", "pills rattle", "toy rattle", "phone drop clatter", "clatter"], 0.8);
add("jingle-keys", "jingle", { dur: 0.7 }, "impact", ["keys jingle", "key jingle", "keys", "coin jingle", "coins", "coin shower", "jingle", "change"], 1.0);
add("shatter-glass", "shatter", { material: "glass" }, "impact", ["glass break", "glass shatter", "glass smash", "window break", "shatter", "smash", "break"], 1.5);
add("shatter-ceramic", "shatter", { material: "ceramic" }, "impact", ["plate smash", "plate break", "cup break", "pottery break", "vase break"], 1.5);
for (const [m, ws] of [["wood", ["wood", "oak", "table", "floor", "wooden stair", "stairs"]], ["brass", ["brass", "brass rail", "rail", "trumpet", "curved brass"]], ["metal", ["metal", "steel", "iron pipe", "pipe", "tube", "spoon"]],
  ["stone", ["stone", "roof tiles", "clay roof", "pavement", "concrete"]], ["glass", ["glass", "bottle"]]])
  add(`roll-${m}`, "roll", { material: m, dur: 2 }, "impact", [`marble rolling on ${ws[0]}`, `ball rolling on ${ws[0]}`, `rolling ${m}`, `${m} rolling`, "rolling", "roll", "marble", "ball", "rolls away", ...ws], 2.0, lasting);
add("creak-wood", "creak", { material: "wood", dur: 0.9 }, "door", ["door creak", "door creak soft", "old door creak", "floorboard creak", "wooden rafter creak", "bamboo ladder creak", "shell settle creak", "creak", "creaking", "hinge", "wood creak", "chair creak"], 0.9, lasting);
add("creak-wood-long", "creak", { material: "wood", dur: 1.8 }, "door", ["long creak", "slow creak", "heavy door groan", "groan", "old hinge", "ship creak"], 1.8, lasting);
add("creak-metal", "creak", { material: "metal", dur: 1.0 }, "door", ["rusty hinge creak", "metal creak", "iron creak", "gate creak", "squeak", "squeaky hinge", "heavy door hinge"], 1.0, lasting);
for (const [m, ws] of [["wood", ["chair scrape", "wooden chair scrape", "box drag", "drag", "furniture", "table drag"]], ["metal", ["metal scrape", "steel scrape", "metal plate push", "metal drag", "grind"]],
  ["stone", ["stone drag", "stone scrape", "brick scrape", "rock drag"]], ["cardboard", ["box slide", "cardboard drag", "carton push"]]])
  add(`scrape-${m}`, "scrape", { material: m, dur: 0.8 }, "door", [`${m} scrape`, "scrape", "scraping", ...ws], 0.9, lasting);
for (const [m, ws] of [["wood", ["panel slide", "wood slide", "wooden panel slide", "four panels slide", "heavy book slide", "block slide"]], ["metal", ["metal slide", "steel panel slide", "metal shutter run", "steel panels", "metal slide lock"]],
  ["glass", ["glass slide", "glass swish", "glass panel"]], ["stone", ["stone slide", "tile slide"]]])
  add(`slide-${m}`, "slide", { material: m, dur: 0.7 }, "whoosh", [`${m} slide`, "slide", "sliding", "glide", "smooth slide", ...ws], 0.8, lasting);
add("slime", "slime", { dur: 1.8 }, "water", ["snail slide", "soft snail slide", "snail", "slug", "slime", "slimy", "wet slide", "squelch", "ooze", "goo", "sticky", "shell slide", "snail crawl"], 1.8, lasting);

// paper by its action
const PAPER = [
  ["slide", { action: "slide", dur: 0.5 }, ["paper slide", "paper sheet slide", "paper card slide", "paper slide short", "card slide", "letter slide", "paper sheet", "sheet", "slide"], 0.5, true],
  ["land", { action: "land" }, ["card place", "paper land", "paper drop", "card set down", "paper letter settle", "paper thud", "paper thud soft", "soft paper thud", "card lift", "paper lift", "paper lift soft", "book stack thump", "place", "set down", "paper on shell tap", "card"], 0.4],
  ["slap", { action: "slap" }, ["paper slap", "card paper slap", "paper card slap", "sticker slap", "paper smack", "card slap", "slap", "smack", "sticker", "paper pop", "paper card tap", "paper flick"], 0.3],
  ["flip", { action: "flip" }, ["page turn", "page turn paper", "page flip", "page flip quick", "page flip quiet", "calendar page turn", "paper flip", "paper flip dark", "flip", "turn page", "book page", "giant panel flip", "card flip", "notebook"], 0.6],
  ["fold", { action: "fold" }, ["paper fold", "fold", "folding", "origami", "crease", "envelope close", "paper ballot"], 0.5],
  ["unfold", { action: "unfold" }, ["letter paper unfold", "letter unfold", "paper unfold", "unfold", "unfolding", "open letter", "map unfold", "envelope open", "letter open", "paper calendar"], 1.1],
  ["crumple", { action: "crumple", dur: 0.9 }, ["paper crumple", "crumple", "crumpling", "scrunch", "paper ball", "crinkle", "wrapper"], 0.9, true],
  ["rustle", { action: "rustle", dur: 0.8 }, ["paper rustle", "paper rustle dry", "paper rustle light", "paper shuffle", "papers", "rustle", "old notebook rustle", "paper rustling leaves", "paper"], 0.8, true],
  ["tear", { action: "tear", dur: 0.7 }, ["paper rip", "paper tear", "tape rip", "sticky tape rip", "tape tear", "calendar page tear", "rip", "tear", "paper peel", "peel"], 0.7, true],
  ["flutter", { action: "flutter", dur: 1.0 }, ["paper flutter", "letter flutter", "card flutter", "paper flap", "paper letter flap", "paper fan flap", "paper flag flutter", "flutter", "paper swoosh", "soft paper swish", "soft paper swish in"], 1.0, true],
];
for (const [a, params, tags, d, sus] of PAPER) add(`paper-${a}`, "paper", params, "paper", tags, d, sus ? lasting : {});
add("cardboard-box", "door", { action: "lid", material: "cardboard" }, "paper", ["cardboard box open", "box open", "box lid", "lid", "box close", "carton open", "wooden hatch open"], 0.5);

// a tool on paper, by stroke
const TOOL_WORDS = { pencil: ["pencil", "graphite", "sketch", "drawing"], crayon: ["crayon", "wax crayon", "colouring", "coloring", "crayon colouring"],
  marker: ["marker", "felt pen", "highlighter", "sharpie", "marker pen", "felt tip"], chalk: ["chalk", "chalkboard", "blackboard", "chalk on board"],
  pen: ["pen", "ballpoint", "ink pen", "fountain pen", "quill", "signature", "sign"], brush: ["brush", "paint brush", "ink brush", "wet brush", "wash", "ink wash", "paint"] };
const STROKES = [
  ["write", 1.2, (t) => [`${t} writing`, `${t} write`, `${t} writing short`, `${t} reply writing`, `${t} title writing`, `${t} whisper writing`, `${t} note`, `${t} jot`, `${t} write number`, `${t} digits`, "writing", "write", "handwriting", "words"]],
  ["line", 1.4, (t) => [`${t} writing line`, `${t} line`, `${t} long line`, `${t} long stroke`, `${t} stroke long`, `${t} stroke`, `${t} underline`, `${t} cross strike`, `${t} strike`, `${t} outline`, `${t} quick outline`, `${t} circle`, `${t} ring`, `${t} ring quick`, "line", "stroke", "underline", "outline"]],
  ["scribble", 0.9, (t) => [`${t} scribble`, `${t} scribble short`, `${t} scribble out`, `${t} scrawl`, `${t} squiggle`, `${t} doodle`, `${t} crown doodle`, `${t} cloud scribble`, `${t} night scribble`, `${t} scratch`, "scribble", "scrawl", "doodle"]],
  ["hatch", 1.0, (t) => [`${t} hatching`, `${t} hatching scratch`, `${t} shading`, `${t} colouring`, `${t} rain tapping`, `${t} rain patter`, "hatching", "shading"]],
  ["dot", 0.25, (t) => [`${t} dot`, `${t} dot tap`, `${t} dot soft`, `${t} dot tick`, `${t} last dot tap`, `${t} dots tapping`, `${t} tick`, `${t} dash tick`, `${t} tap`, `${t} set down`, `${t} flick`, "dot"]],
];
for (const [tool, words] of Object.entries(TOOL_WORDS)) for (const [stroke, d, tags] of STROKES)
  // the tool's other names on its plainest stroke only (a "wet brush wash" is a brush's line, never its dot)
  add(`writing-${tool}-${stroke}`, "writing", { tool, stroke, ...(stroke === "dot" ? {} : { dur: d }) }, "paper", [...tags(tool), ...(stroke === "line" ? [...words.slice(1), `${tool} on paper`] : []), tool], d, stroke === "dot" ? {} : lasting);

// cloth
add("cloth-rustle", "cloth", { action: "rustle", dur: 0.7 }, "cloth", ["cloth rustle", "fabric rustle", "cloth shrug rustle", "leather strap rustle", "hands clasp cloth", "skin rustle", "sleeve", "coat", "jacket", "shirt", "dress", "clothes", "rustle", "fabric sleeve slip", "fabric sleeve drag"], 0.7, lasting);
add("cloth-swish", "cloth", { action: "swish" }, "cloth", ["cloth swish", "fabric swish", "fabric sleeve swish", "fabric sleeve whip", "sleeve swish", "cape swish", "coat swish", "arm swing", "wave", "wave hand", "shrug"], 0.4);
add("cloth-flap", "cloth", { action: "flap", dur: 1.0 }, "cloth", ["flag flap", "cape flap", "scarf flap", "gust scarf flap", "hair flap", "banner flap", "curtain flutter", "fabric flutter", "wing flap", "flap", "sail", "towel", "blanket", "cartoon jaw drop"], 1.0, lasting);

// air
for (const [size, tags, d] of [["soft", ["soft whoosh", "whoosh", "soft air whoosh", "soft air swish", "air swish", "gentle air sweep", "gentle air drift", "soft air swell", "light air rush", "short air rush", "short air push", "air", "move"], 0.6],
  ["big", ["big whoosh", "heavy whoosh", "large whoosh", "steel panels whoosh", "gust whoosh", "swirl whoosh", "roof edge air swish"], 1.1],
  ["quick", ["swish", "light swish", "quick whoosh", "whip", "camera whip", "fan blade swish", "highlighter swipe", "swipe", "zip", "snap"], 0.3],
  ["up", ["whoosh up", "rise", "rising whoosh", "shoot up", "launch", "fly up", "jump"], 0.5], ["down", ["whoosh down", "dive whoosh", "whoosh dive in", "dive", "drop down", "fall whoosh", "swoop"], 0.7],
  ["past", ["fly past", "fly by", "zip past", "pass by", "whoosh past", "passing"], 0.9], ["long", ["long whoosh", "whoosh out", "whoosh pull back", "pull back", "sweep", "ink wash sweep", "transition"], 1.6]])
  add(`whoosh-${size}`, "whoosh", { size }, "whoosh", tags, d);
add("puff", "puff", {}, "wind", ["puff", "air puff", "smoke puff", "candle blown out", "candle snuff out", "blow out", "soft felt puff", "soft felt puff out", "soft sigh air", "felt cap lift", "felt cap tip", "breath out"], 0.35);

// appear
for (const [kind, tags, d] of [["soft", ["soft pop", "pop", "soft thought pop", "board column pop", "appear", "pop in", "pop up", "blip pop", "spawn", "label", "icon", "bubble appear"], 0.25],
  ["bubble", ["bubble pop", "water bubble pop", "bubble", "pop bubble", "blob"], 0.2], ["plop", ["plop", "plonk", "drop in", "fig drop splat", "blop"], 0.2],
  ["cork", ["cork pop", "lid pop", "metal watch case back pop", "steel door pop", "pop off", "cap pop", "uncork"], 0.25], ["boing", ["boing", "soft boing", "spring", "cartoon bounce", "bounce", "boing boing", "marble bounce wood stair"], 0.55]])
  add(`pop-${kind}`, "pop", { kind }, "pop", tags, d);

// press, tick
for (const [kind, fam, tags] of [["button", "click", ["click", "button click", "mouse click", "button press", "press", "button", "fan button click", "phone closing click", "key press", "steel click", "lens click", "remote"]],
  ["switch", "switch", ["switch", "light switch", "wall switch clack", "toggle", "switch click", "fan switch click", "spotlight switch off", "lamp switch", "switch on", "switch off", "flip switch"]],
  ["shutter", "click", ["camera shutter", "shutter", "photo snap", "take photo", "camera click", "snapshot", "polaroid"]], ["pen", "click", ["pen click", "click pen", "marker cap", "cap click", "ballpoint click"]],
  ["latch", "door", ["latch", "latch click", "cold latch click", "precise latch", "latch release", "heavy latch flip", "window latch wood", "suitcase latch", "steel latch", "door handle click", "metal hinge click", "hinge clack", "hinge snap", "catch", "clasp"]],
  ["lock", "door", ["lock", "key turn", "unlock", "padlock", "door lock", "steel lock click", "steel lock clunk", "metal frame lock", "autofocus lock", "lock in", "bolt"]]])
  add(`click-${kind}`, "click", { kind }, fam, tags, 0.3);
for (const [kind, tags] of [["clock", ["clock tick", "tick", "wall clock tick", "attic clock tick", "grandfather clock tick", "distant clock tick", "clock tick lonely", "hinge tick", "hinge counter tick", "rail joint click", "gear wheel click", "brass tick"]],
  ["tock", ["tock", "clock tock", "wall clock tock", "soft woodblock tock", "woodblock", "wood block"]], ["watch", ["watch tick", "wristwatch tick", "watch tock", "wristwatch tock", "slow heavy watch tick", "two watches tick", "two watches tock", "tiny tick", "lens focus click", "autofocus tick", "autofocus focus tick", "lens motor tick"]],
  ["ui", ["soft tick", "ui tick", "tick soft", "glass tick", "select", "check", "checkmark", "tick off", "heart notification", "counter clicks", "marker tick", "typewriter tick", "crab shell clicks"]]])
  add(`tick-${kind}`, "tick", { kind }, "click", tags, 0.25);
add("ticking-clock", "ticking", { kind: "clock", rate: 2, dur: 2 }, "click", ["clock ticking", "ticking", "wall clocks ticking", "time passing", "clock"], 2.0, lasting);
add("ticking-watch", "ticking", { kind: "watch", rate: 4, dur: 1.5 }, "click", ["watch ticking", "stopwatch", "timer ticking"], 1.5, lasting);
add("ticking-counter", "ticking", { kind: "ui", rate: 8, accel: 2.5, dur: 1.0 }, "click", ["counter roll", "count up", "numbers counting", "timer racing", "counter", "score count", "crayon number ticks"], 1.0, lasting);

// bells, glass
for (const [kind, tags, d] of [["ding", ["bell ding", "ding", "desk bell", "done", "success", "correct", "leaderboard ding", "cash register ding", "sparkle ding", "tiny medal ting", "bell", "service bell"], 1.5],
  ["ting", ["ting", "tiny bell", "spoon ting", "glass bell", "triangle", "ballast tink", "ballast tink out", "tink", "glockenspiel note", "glockenspiel high note", "glockenspiel soft note", "brass ping", "thin metal ring", "glass ring soft", "plate ring", "soft plate ring", "typewriter ding soft"], 1.2],
  ["chime", ["chime", "doorbell", "bing bong", "notification chime", "glass chime", "soft sun chime", "firefly chime", "cabin chime"], 1.8], ["shop", ["shop bell", "jingle bells", "small bells", "sleigh bells", "bells", "door bell jingle", "wind chime"], 1.6],
  ["gong", ["gong", "big gong hit", "gong hit", "plate clang"], 4.0], ["toll", ["church bell", "bell toll", "big bell", "brass bell ring", "bell ring", "temple bell", "toll"], 4.0],
  // "clock bell" first: a bell named for its thing rings for a cue that names that thing (library.mjs matchLocal: a chime is no clock's)
  ["clock", ["clock bell", "clock chime", "hour chime bell", "far clock chime", "pendulum clock chime soft", "grandfather clock chime", "clock strikes"], 3.2]])
  add(`bell-${kind}`, "bell", { kind }, "bell", tags, d);
add("glass-ring", "glass_ring", { dur: 2 }, "bell", ["glass ring", "glass rim", "singing glass", "wine glass hum", "glass hum", "glass rise", "glass shimmer"], 2.0, lasting);

// water, fire, weather
for (const [a, tags, d, sus] of [["drop", ["water drop", "water drop plink", "drop", "plink", "droplet", "sweat drip", "drip", "water drip"], 0.35], ["drip", ["dripping", "drips", "leak", "tap dripping", "cave drip", "dripping water"], 1.5, true],
  ["splash", ["splash", "water splash", "small splash", "dive splash", "plunge", "dunk", "puddle splash"], 0.9], ["pour", ["pour", "water pour", "tea pour", "pour tea", "fill cup", "pouring", "coffee pour", "milk pour"], 2.0, true],
  ["trickle", ["trickle", "stream", "faucet", "tap running", "running water", "brook"], 2.0, true], ["bubbles", ["bubbles", "bubbling", "water bubble", "boil", "boiling", "underwater", "fizz"], 1.2, true]])
  add(`water-${a}`, "water", { action: a }, "water", tags, d, sus ? lasting : {});
for (const [k, tags, d, sus] of [["crackle", ["fire crackle", "crackle", "campfire", "fireplace", "candle crackle", "candle flame", "fire", "flames", "burning", "embers"], 2.0, true],
  ["strike", ["match strike", "match strike incense", "strike match", "light match", "ignite", "lighter", "flare"], 1.3], ["snuff", ["candle snuff", "candle snuff soft", "snuff out", "extinguish", "candle flame extinguished", "match extinguished", "candle out", "put out"], 0.8],
  ["sizzle", ["sizzle", "wick sizzle", "fry", "frying", "hiss", "steam hiss", "bus door air hiss"], 1.2, true]])
  add(`fire-${k}`, "fire", { kind: k }, "fire", tags, d, sus ? lasting : {});
for (const [k, tags, d, sus] of [["gust", ["gust", "wind gust", "wind gust high", "leaf gust", "swirl gust", "cardboard box gust", "door slam gust", "rain gust", "gust of wind"], 1.6], ["steady", ["wind", "breeze", "draft", "wind over roof", "steady wind", "mild wind", "air"], 4.0, true],
  ["howl", ["howling wind", "howl", "storm wind", "whistling wind", "blizzard", "gale"], 4.0, true]])
  add(`wind-${k}`, "wind", { kind: k }, "wind", tags, d, sus ? lasting : {});
for (const [k, tags, d] of [["patter", ["rain patter", "light rain", "drizzle", "raindrops", "crayon rain patter", "rain on roof", "rain on window"], 3], ["steady", ["rain", "steady rain", "rainfall", "shower"], 4], ["heavy", ["heavy rain", "downpour", "storm", "rainstorm"], 4],
  ["thunder", ["thunder", "thunder rumble", "rumble", "far thunder", "thunderclap"], 3]])
  add(`rain-${k}`, "rain", { kind: k, dur: d }, "rain", tags, d, lasting);

// steps: one, a walk, a run
const SURFACE_WORDS = { wood: ["wood", "wooden", "floorboard", "floorboards", "porch", "wooden stairs", "stairs", "deck"], concrete: ["concrete", "pavement", "street", "sidewalk", "road", "asphalt", "tile", "tiles", "heel"],
  stone: ["stone", "marble floor", "cobble", "cobblestone", "castle"], grass: ["grass", "lawn", "meadow", "field", "leaves"], gravel: ["gravel", "path", "dirt", "pebbles", "trail"],
  sand: ["sand", "beach", "dune"], snow: ["snow", "snowy", "ice"], carpet: ["carpet", "rug", "slipper", "sock", "carpet steps backing"], metal: ["metal", "metal stairs", "grate", "steel"], wet: ["wet", "puddle", "puddles", "mud", "rain"] };
for (const [s, ws] of Object.entries(SURFACE_WORDS)) {
  add(`step-${s}`, "steps", { surface: s, n: 1 }, "footstep", [`footstep ${s}`, `step ${s}`, `${s} step`, `footstep ${ws[1] ?? s}`, "footstep", "step", ...ws], 0.4, { run: false });
  // a walk or a run that names no ground walks on wood (the app's own footsteps default, actions.mjs)
  const plain = s === "wood";
  add(`steps-walk-${s}`, "steps", { surface: s, n: 4, pace: 0.5 }, "footstep", [`footsteps ${s}`, `walking ${s}`, `footsteps on ${s}`, `slow footstep ${ws[1] ?? s}`, `soft footsteps ${s}`, ...(plain ? ["footsteps", "walking", "walk", "soft footsteps", "footsteps slowing stop", "soft footsteps stop", "footsteps down wooden stairs"] : []), ...ws], 2.2, { run: true });
  add(`steps-run-${s}`, "steps", { surface: s, n: 6, pace: 0.28, weight: 0.6 }, "footstep", [`running footsteps ${s}`, `running ${s}`, `hurried footsteps ${s}`, `quick ${s} footsteps`, ...(plain ? ["running footsteps", "hurried footsteps", "footsteps running away", "running away", "run", "running", "quick footsteps"] : []), ...ws], 2.0, { run: true });
}

// doors
for (const [a, mat, tags, d] of [["open", "wood", ["door open", "open door", "door opens", "wooden door open", "door handle", "gate open"], 1.0], ["close", "wood", ["door close", "door shut", "close door", "latch", "door closes", "gate close"], 0.6],
  ["slam", "wood", ["door slam", "slam door", "door slam back", "heavy door boom", "big door impact", "wooden door burst", "heavy hinge slam", "iron hinge bang"], 1.0], ["drawer", "wood", ["drawer open", "drawer close", "drawer", "drawer slide", "cabinet drawer"], 0.8],
  ["lid", "wood", ["chest open", "lid close", "trunk open", "box lid wood", "wooden box", "lid open"], 0.5], ["metal", "metal", ["metal door", "steel door", "steel door swing", "steel door crash", "steel door burst", "vault door open", "heavy steel slam", "heavier iron slam", "steel shutter close", "iron door", "hatch"], 1.2]])
  add(`door-${a}`, "door", { action: a, material: mat }, "door", tags, d);

// machines
for (const [k, fam, tags, d] of [["hum", "mechanical", ["fan hum", "electric fan hum", "desk fan hum", "big electric fan hum", "fan low hum", "motor hum", "big fan motor hum", "fan", "hum", "air conditioner", "fridge hum"], 2.0],
  ["whirr", "mechanical", ["whirr", "servo", "zoom servo", "zoom servo slow", "zoom servo crawl", "zoom servo whirr", "lens motor", "camera lens zoom motor", "camera autofocus motor", "autofocus", "autofocus slip", "watch gear whir", "drone", "small motor", "zoom"], 1.2],
  ["engine", "mechanical", ["engine", "small engine putter", "little engine rev", "car engine start", "motorbike", "putter", "engine idle", "tractor", "boat engine"], 2.5], ["spin_up", "mechanical", ["spin up", "giant fan spin up", "power up fan", "starts spinning", "rev up"], 2.0],
  ["spin_down", "mechanical", ["spin down", "fan slowing hum", "fan winding down hum", "fan blades stop", "fan motor sputter", "winding down", "slows down", "stops spinning"], 2.0]])
  add(`motor-${k.replace("_", "-")}`, "motor", { kind: k, dur: d }, fam, tags, d, lasting);
for (const [k, tags, d] of [["gears", ["gears", "gear", "cogs", "clockwork", "mechanism", "clock gears ratchet", "broken gear clack", "machine", "machinery"], 1.4], ["ratchet", ["ratchet", "crank", "winch", "typewriter ratchet", "zip tie"], 1.0],
  ["wind", ["wind up", "winding", "clockwork spring", "wind-up toy", "music box wind"], 1.4]])
  add(`gears-${k}`, "gears", { kind: k, dur: d }, "mechanical", tags, d, lasting);
add("keys-keyboard", "keys", { kind: "keyboard", dur: 1.5 }, "typing", ["typing", "keyboard", "keyboard typing", "keys typing", "keystrokes", "key tap", "computer typing", "laptop typing", "type"], 1.5, lasting);
add("keys-typewriter", "keys", { kind: "typewriter", dur: 1.5 }, "typing", ["typewriter", "typewriter keys", "typewriter clack", "typewriter clatter", "steel number clack", "crab claw clack", "tripod clack", "clack"], 2.6, lasting);
add("keys-typewriter-short", "keys", { kind: "typewriter", dur: 0.5, bell: false }, "typing", ["typewriter key", "single key", "key strike", "clack"], 0.6);
add("keys-printer", "keys", { kind: "printer", dur: 1.8 }, "mechanical", ["printer", "printing", "dot matrix printer", "receipt printer", "print", "fax"], 2.0, lasting);
add("tape", "gears", { kind: "ratchet", dur: 0.5 }, "mechanical", ["tape", "cassette", "mechanical tape open", "mechanical tape close", "tape roll-in", "camcorder motor", "camcorder on wood table"], 0.5);

// electronic
for (const [k, tags, d] of [["blip_up", ["blip up", "blip", "curious blip", "eye slide blip", "wink blip", "screen on", "ui appear", "chirp up"], 0.12], ["blip_down", ["blip down", "error", "wrong", "fail", "bloop down"], 0.12],
  ["beep", ["beep", "bleep", "single beep", "phone ping"], 0.3], ["static", ["static", "electronic static", "vhs static burst", "tape tracking noise", "tape dropout", "radio static", "noise burst", "crt"], 0.6],
  ["glitch", ["glitch", "digital glitch", "stutter", "malfunction", "error glitch"], 0.5], ["power_on", ["power on", "power up", "boot", "turn on", "start up", "switch on screen"], 0.9],
  ["power_down", ["power down", "power off", "shut down", "turn off", "telephone hang up", "fluorescent tube dying"], 0.9], ["zap", ["zap", "laser", "electric", "shock", "spark", "electric zap"], 0.4],
  ["hum", ["electrical buzz hum", "electrical transformer hum", "low power hum", "neon tube flicker buzz", "fluorescent tube buzz off", "fluorescent light flicker", "buzz", "electric hum", "neon hum", "transformer"], 2.0],
  ["scan", ["scan", "scanner", "radar", "sweep tone", "scanning"], 0.8], ["notify", ["notification", "message ping", "ping", "new message", "notify", "phone notification"], 0.6]])
  add(`electronic-${k.replace("_", "-")}`, "electronic", { kind: k, ...(["static", "hum", "scan"].includes(k) ? { dur: d } : {}) }, "electronic", tags, d, ["static", "hum"].includes(k) ? lasting : {});
add("electronic-alert", "electronic", { kind: "beep", n: 2 }, "electronic", ["alert", "alarm beep", "double beep", "warning beep", "alarm", "beep beep"], 0.6);

// magic
for (const [k, tags, d, sus] of [["sparkle", ["sparkle", "glass sparkle", "tiny sparkle", "glitter", "shine", "glint", "gleam", "twinkle sparkle"], 0.9], ["shimmer", ["shimmer", "magic shimmer", "magic", "enchant", "aura", "glow shimmer", "fairy dust"], 1.6, true],
  ["swell", ["glow", "light up", "glow swell", "magic rise", "warm glow", "reveal", "heal", "lights up"], 1.4], ["twinkle", ["twinkle", "star", "firefly", "star twinkle", "tiny star"], 0.9]])
  add(`magic-${k}`, "magic", { kind: k }, "magic", tags, d, sus ? lasting : {});

// living things
for (const [k, tags, d, sus] of [["chirp", ["bird chirp", "chirp", "tweet", "small bird", "sparrow"], 0.4], ["birds", ["birds", "birds singing", "birdsong", "morning birds", "songbirds"], 3.0, true], ["frog", ["frog croak", "frog croak soft", "frog", "croak", "toad"], 0.45],
  ["crickets", ["crickets", "cricket", "night insects", "insects", "cicada"], 4.0, true], ["bee", ["bee buzz", "bee", "fly buzz", "insect buzz", "mosquito", "buzzing", "wasp"], 1.5, true]])
  add(`animal-${k}`, "animal", { kind: k, ...(sus ? { dur: d } : {}) }, "animal", tags, d, sus ? lasting : {});
for (const [k, fam, tags, d] of [["heartbeat", "impact", ["heartbeat", "soft heartbeat", "heart beat", "heart", "pulse", "lub dub"], 1.7], ["breath", "wind", ["breath", "breathing", "calm breathing through nose", "soft nose breath", "inhale", "exhale", "sniff", "held breath", "shaky breath", "uneven breath", "fast breathing"], 1.2],
  ["sigh", "wind", ["sigh", "relief sigh", "tired sigh"], 1.6], ["clap", "crowd", ["clap", "hand clap", "single clap", "hands clap"], 0.25], ["snap", "click", ["finger snap", "snap fingers", "snap", "ruler snap"], 0.2], ["gulp", "water", ["gulp", "swallow", "drink"], 0.15]])
  add(`body-${k}`, "body", { kind: k }, fam, tags, d);
for (const [k, tags, d] of [["murmur", ["crowd murmur", "murmur", "chatter", "people talking", "walla", "room of people"], 3.0], ["cheer", ["cheer", "crowd cheer", "crowd cheer short", "audience cheer", "hooray"], 2.5], ["applause", ["applause", "clapping", "audience clap"], 3.0]])
  add(`crowd-${k}`, "crowd", { kind: k, dur: d }, "crowd", tags, d, lasting);

/** The app's own recipes: [{ id, recipe, params, family, tags, duration, sustained?, run? }]. */
export const RECIPES = Object.freeze(out.map((e) => Object.freeze(e)));

// One-off reclassification of the intake (judged as an experienced motion designer would; Motion / Block need not be strict, new categories allowed). Reads the built catalog, the specs'
// categories (moworks/specs.json) and the item files, applies the rules below and writes classification.json: { uid: { kind, category } }.
// The app reads that file when it builds the store (index.mjs loadItems), so the user can edit one line to move one item.
//   node packages/intake-library/tools/classify-intake.mjs [catalog.json]   (default: the intake store in use in the work folder's library)
//
// How an After Effects person files motion: by what you reach for it to DO (text reveal, transition, UI state, texture, camera …), not by
// the specs' own grouping. Kind: a Block is a piece that stands alone (a mockup, a chart, a HUD widget, a title card, a lesson); a Motion
// is something you put on an element. The specs' own labels stay unless the item clearly is the other thing.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { currentStore } from "../index.mjs";

const HERE = fileURLToPath(new URL("..", import.meta.url));
const catalogFile = process.argv[2] ?? (currentStore() ? join(currentStore().dir, "catalog.json") : null);
if (!catalogFile) { console.log("usage: node packages/intake-library/tools/classify-intake.mjs [catalog.json] (no intake store is built in the work folder)"); process.exit(1); }
const storeDir = catalogFile.replace(/catalog\.json$/, "");
const items = JSON.parse(readFileSync(catalogFile, "utf8")).items;
const SPEC = new Map(JSON.parse(readFileSync(join(HERE, "moworks", "specs.json"), "utf8")).items.map((s) => [`in:moworks/${s.name.replace("/", "-")}`, s]));

const C = {
  TREVEAL: "Text · Reveal & entrance", TEXIT: "Text · Exit & swap", TKINETIC: "Text · Kinetic & glyph effects", TEMPH: "Text · Emphasis, colour & loops",
  TJP: "Text · Japanese typesetting", CAPTIONS: "Captions & subtitles", TITLES: "Titles, lower thirds & credits",
  TRANS: "Transitions", ENTER: "Entrance & exit", MOVE: "Movement & travel", ATTN: "Attention & loops",
  UIBTN: "UI · Buttons & controls", UILOAD: "UI · Loading & feedback", UILAYOUT: "UI · Layout, lists & navigation", CURSOR: "Cursor & pointer", MOCK: "Mockups, devices & code",
  EASE: "Easing curves", SPRING: "Springs & physics", PRINC: "Principles & timing", SOUND: "Sound sync",
  GIMPACT: "Game · Impact & combat", GHUD: "Game · HUD & progression", GLOOT: "Game · Rewards & loot",
  DATA: "Data & charts", NUM: "Numbers & counters", D3: "3D, camera & maps", LINES: "Lines, shapes & paths", BG: "Backgrounds",
  LIGHT: "Light, glow & colour", TEXTURE: "Texture, glitch & film look", PART: "Particles & debris", MASKS: "Masks, blur & reveals",
  SOCIAL: "Social, ads & showcase",
};

const MAGIC = {
  android: C.MOCK, iphone: C.MOCK, safari: C.MOCK, "code-comparison": C.MOCK, "file-tree": C.MOCK, terminal: C.MOCK,
  "animated-beam": C.LINES, "scroll-progress": C.LINES, "shine-border": C.LIGHT, "border-beam": C.LIGHT, "neon-gradient-card": C.LIGHT, "magic-card": C.LIGHT, "glare-hover": C.LIGHT, backlight: C.LIGHT,
  "animated-circular-progress-bar": C.DATA, "number-ticker": C.NUM,
  "animated-gradient-text": C.TEMPH, "aurora-text": C.TEMPH, "animated-shiny-text": C.TEMPH, "line-shadow-text": C.TEMPH, "sparkles-text": C.TEMPH, highlighter: C.TEMPH,
  "blur-fade": C.TREVEAL, "text-animate": C.TREVEAL, "text-reveal": C.TREVEAL, "dia-text-reveal": C.TREVEAL, "typing-animation": C.TREVEAL, "hyper-text": C.TREVEAL,
  "morphing-text": C.TEXIT, "word-rotate": C.TEXIT,
  "comic-text": C.TKINETIC, "kinetic-text": C.TKINETIC, "text-3d-flip": C.TKINETIC, "spinning-text": C.TKINETIC, "video-text": C.TKINETIC, "scroll-based-velocity": C.TKINETIC,
  "animated-grid-pattern": C.BG, "dot-pattern": C.BG, "flickering-grid": C.BG, "floating-3d-particles": C.BG, "glyph-matrix": C.BG, "grid-pattern": C.BG, "hexagon-pattern": C.BG,
  "interactive-grid-pattern": C.BG, "light-rays": C.BG, meteors: C.BG, particles: C.BG, "retro-grid": C.BG, "striped-pattern": C.BG, "warp-background": C.BG,
  "animated-list": C.UILAYOUT, "bento-grid": C.UILAYOUT, dock: C.UILAYOUT, "hero-video-dialog": C.UILAYOUT,
  "animated-subscribe-button": C.UIBTN, "interactive-hover-button": C.UIBTN, "pulsating-button": C.UIBTN, "rainbow-button": C.UIBTN, "ripple-button": C.UIBTN, "shimmer-button": C.UIBTN, "shiny-button": C.UIBTN,
  "animated-theme-toggler": C.TRANS, "avatar-circles": C.SOCIAL, "client-tweet-card": C.SOCIAL, "tweet-card": C.SOCIAL, "icon-cloud": C.SOCIAL, "dotted-map": C.D3, globe: C.D3,
  confetti: C.PART, "cool-mode": C.PART, ripple: C.ATTN, lens: C.MASKS, "progressive-blur": C.MASKS, "pixel-image": C.MASKS, "noise-texture": C.TEXTURE,
  marquee: C.MOVE, "orbiting-circles": C.MOVE, pointer: C.CURSOR, "smooth-cursor": C.CURSOR,
};

const GAME = new Set(["Game Impact FX", "Combat & Hit FX", "Game Cinematics", "Game HUD", "Progression & Quests", "Rewards & Loot"]);
const gameCat = (sc) => sc === "Game HUD" || sc === "Progression & Quests" ? C.GHUD : sc === "Rewards & Loot" ? C.GLOOT : C.GIMPACT;

function ownCategory(s) {
  const g = s.name.split("/")[0], sc = s.category;
  if (s.lesson) return C.PRINC;
  if (g === "transition") return C.TRANS;
  if (g === "background") return C.BG;
  if (g === "map") return C.D3;
  if (g === "social" || g === "compare") return C.SOCIAL;
  if (g === "cursor") return C.CURSOR;
  if (g === "flow") return C.UIBTN;
  if (g === "lower" || g === "title") return GAME.has(sc) && g === "lower" && sc !== "Game Cinematics" ? gameCat(sc) : C.TITLES;
  if (sc === "Sound Sync") return C.SOUND;
  if (g === "data") return ["Loading & Data", "Loading & Progress", "Feedback & Reactions"].includes(sc) ? C.UILOAD : sc === "Numbers & Data" ? C.NUM : GAME.has(sc) ? gameCat(sc) : C.DATA;
  if (g === "line") return C.LINES;
  if (g === "shape") return sc === "Particles" ? C.PART : sc === "Selection & Controls" ? C.UIBTN : sc === "Rotation" ? C.MOVE : C.LINES;
  if (g === "hand") return ["Broadcast & Telop", "Japanese", "Titles & Film"].includes(sc) ? C.TITLES : sc === "Loops & Ambient" ? C.ATTN : C.TEXTURE;
  if (g === "card") return sc === "Web Interaction" ? C.UILAYOUT : C.D3;
  if (g === "text") {
    if (GAME.has(sc)) return sc === "Game Cinematics" ? C.TITLES : gameCat(sc);
    if (sc === "Captions & Subtitles") return C.CAPTIONS;
    if (["Broadcast & Telop", "Titles & Film"].includes(sc)) return C.TITLES;
    if (sc === "Japanese") return C.TJP;
    if (["Reveal", "Mask & Clip", "Blur & Focus", "Typing & Decoding"].includes(sc)) return C.TREVEAL;
    if (["Exit", "Swap"].includes(sc)) return C.TEXIT;
    if (sc === "Pointer") return C.CURSOR;
    if (["Emphasis", "Colour & Light", "Loops & Decoration"].includes(sc)) return C.TEMPH;
    return C.TKINETIC;                   // glyph physics, path, 3D, glitch, reflow, variable fonts, scroll
  }
  if (g === "ui") {
    if (GAME.has(sc)) return sc === "Game Cinematics" ? C.TITLES : gameCat(sc);
    if (["UI Buttons", "Selection & Controls", "Forms & State", "Gesture & Mobile", "Japanese"].includes(sc)) return C.UIBTN;
    if (["Loading & Progress", "Loading & Data", "Feedback & Reactions"].includes(sc)) return C.UILOAD;
    if (sc === "Spatial UI & Depth") return C.D3;
    return C.UILAYOUT;
  }
  if (g === "effect") {
    if (GAME.has(sc)) return sc === "Game Cinematics" ? C.GIMPACT : gameCat(sc);
    const m = { "Light & Glow": C.LIGHT, "Texture & Look": C.TEXTURE, "Material & Surface Motion": C.TEXTURE, Particles: C.PART, "Distortion & Glitch": C.TEXTURE, "Effects & Transitions": C.MASKS,
      "Attention & Emphasis": C.ATTN, "Feedback & Reactions": C.ATTN, "Data Storytelling": C.DATA, "SVG & Path": C.LINES, "Spatial UI & Depth": C.D3, "Titles & Film": C.TITLES,
      "UI Buttons": C.UIBTN, Pointer: C.CURSOR, Scale: C.MOVE };
    return m[sc] ?? C.MASKS;
  }
  // g === "motion"
  if (GAME.has(sc)) return gameCat(sc);
  const m = { Easing: C.EASE, Springs: C.SPRING, Principles: C.PRINC, "Timing & Rhythm": C.PRINC, Camera: C.D3, "3D": C.D3, "Spatial UI & Depth": C.D3, "Entrance & Exit": C.ENTER,
    Movement: C.MOVE, Rotation: C.MOVE, Scale: C.MOVE, Character: C.MOVE, "Bounce & Reaction": C.ATTN, "Attention & Emphasis": C.ATTN, "Loops & Ambient": C.ATTN,
    "List & Grid": C.UILAYOUT, "Layout & Navigation": C.UILAYOUT, "Navigation & Overlays": C.UILAYOUT, "Web Interaction": C.UILAYOUT, "Web Scroll": C.UILAYOUT, Scroll: C.UILAYOUT,
    "Material & Surface Motion": C.UILAYOUT, "UI Buttons": C.UIBTN, "Gesture & Mobile": C.UIBTN, "Captions & Subtitles": C.CAPTIONS, "Data Storytelling": C.DATA,
    "Effects & Transitions": C.MASKS, "Light & Glow": C.LIGHT, "SVG & Path": C.LINES, Transitions: C.TRANS };
  return m[sc] ?? C.MOVE;
}

// kind: the spec's label stays unless the item clearly is the other thing
const EFFECT_CATS = new Set([C.TREVEAL, C.TEXIT, C.TKINETIC, C.TEMPH, C.TJP, C.LIGHT, C.TEXTURE, C.PART, C.TEXTURE, C.MASKS, C.ATTN, C.MOVE, C.ENTER, C.TRANS, C.LINES, C.CURSOR, C.D3]);
const WIDGET_CATS = new Set([C.GHUD, C.UILOAD, C.UIBTN, C.DATA, C.NUM, C.MOCK, C.MOCK, C.GLOOT]);
const isScene = (it) => { try { return /stage320|MW\.canvas|getContext\("2d"\)/.test(readFileSync(join(storeDir, it.folder, it.file), "utf8")); } catch { return false; } };

const out = {};
for (const it of items) {
  let category;
  if (it.collection === "Codrops") category = it.id.includes("image-expand") ? C.TKINETIC : C.TREVEAL;
  else if (it.collection === "Magic UI") category = MAGIC[it.id.split("/").pop()];
  else category = ownCategory(SPEC.get(it.uid));
  if (!category) throw new Error(`no category for ${it.uid}`);
  let kind = it.kind;
  const scene = isScene(it);
  if (kind === "block" && !scene && EFFECT_CATS.has(category)) kind = "motion";
  if (kind === "motion" && scene && WIDGET_CATS.has(category)) kind = "block";
  out[it.uid] = { kind, category };
}
writeFileSync(join(HERE, "classification.json"), JSON.stringify(out, null, 1) + "\n");
const by = {};
for (const [uid, v] of Object.entries(out)) { const a = items.find((x) => x.uid === uid).collection; const k = `${v.category}`; by[k] ??= { motion: 0, block: 0 }; by[k][v.kind]++; }
const moved = items.filter((it) => out[it.uid].kind !== it.kind).length;
console.log(Object.keys(out).length, "items;", moved, "change kind;", Object.keys(by).length, "categories");
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].motion + b[1].block - a[1].motion - a[1].block)) console.log(String(v.motion + v.block).padStart(4), k, `(motion ${v.motion}, block ${v.block})`);

// The studio's own items. Each item file under items/moworks/ writes the motion here, from its spec in specs.json; T(name, def) adds what
// the spec already says: titles, the Vietnamese description, tags, the category and, when a motion follows a known project's idea, that note.
import { readFileSync } from "node:fs";

export const SPECS = JSON.parse(readFileSync(new URL("./specs.json", import.meta.url), "utf8")).items;
const BY = new Map(SPECS.map((x) => [x.name, x]));

// some motions follow a project's idea; the motion is still written here (react-bits, typed.js and aceternity code was never opened for it)
const UPSTREAM = {
  codrops: "after Codrops (MIT); a faithful port of Codrops' effects is in the Codrops collection",
  magicui: "after Magic UI (MIT); a faithful port is in the Magic UI collection",
  "react-bits": "after react-bits (MIT + Commons Clause): written from the idea only, no react-bits code",
  "typed.js": "after typed.js (GPL-3.0): written from the idea only",
  aceternity: "after Aceternity UI: written from the idea only",
  "anime.js": "after anime.js (MIT)",
  "number-flow": "after barvian/number-flow (MIT): its numbers, not its runtime",
  budoux: "after BudouX (Apache-2.0) for phrase-aware line breaks",
  "other:remotion": "after Remotion", "other:gsap": "after GSAP", "other:jquery-flapper": "after jQuery Flapper",
  "other:troika-three-text": "after troika-three-text",
};

const GAME = new Set(["Game Impact FX", "Combat & Hit FX", "Game Cinematics", "Game HUD", "Rewards & Loot", "Progression & Quests"]);
const BY_GROUP = { transition: "Transitions", text: "Text & titles", title: "Text & titles", lower: "Text & titles", data: "Data & charts", line: "Lines & beams",
  background: "Backgrounds", map: "3D, camera & maps", social: "Social & ads", compare: "Showcase & media", ui: "UI & mockups", card: "UI & mockups",
  cursor: "UI & mockups", flow: "UI & mockups", effect: "Effects & overlays", shape: "Effects & overlays", hand: "Effects & overlays" };
const BY_CATEGORY = { Camera: "3D, camera & maps", "3D & Depth": "3D, camera & maps", "3D": "3D, camera & maps", "Spatial UI & Depth": "3D, camera & maps",
  Easing: "Easing & principles", Principles: "Easing & principles", "Timing & Rhythm": "Easing & principles", Springs: "Easing & principles", "Sound Sync": "Easing & principles",
  "Mask & Clip": "Effects & overlays", Reveal: "Effects & overlays", "Blur & Focus": "Effects & overlays", "Light & Glow": "Effects & overlays", "Colour & Light": "Effects & overlays",
  Particles: "Effects & overlays", "Distortion & Glitch": "Effects & overlays", "Texture & Look": "Effects & overlays", "Effects & Transitions": "Effects & overlays",
  "SVG & Path": "Lines & beams", "Path & Shape": "Lines & beams", "Numbers & Data": "Data & charts", "Data Storytelling": "Data & charts" };

/** The Motion Library category of a spec: purpose group first, game looks together, then the spec's own category. */
export function categoryOf(s) {
  const g = s.name.split("/")[0];
  if (s.lesson) return "Easing & principles";
  if (["text", "title", "lower", "transition"].includes(g)) return BY_GROUP[g];
  if (GAME.has(s.category)) return "Game UI & FX";
  if (g === "motion" && BY_CATEGORY[s.category]) return BY_CATEGORY[s.category];
  return BY_GROUP[g] ?? BY_CATEGORY[s.category] ?? "Movement & loops";
}

const slug = (s) => s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** One item from its spec name and the code written here: def = { fn, defaults, options, demo, uses, css, markup, kind?, category?, notes? }. */
export function T(name, def) {
  const s = BY.get(name);
  if (!s) throw new Error(`Moworks Studio: no spec named ${name}`);
  const id = name.replace("/", "-");
  return {
    id, kind: def.kind ?? (s.lib === "layouts" || s.kind === "block" ? "block" : "motion"), title: s.title, sub: s.titleVi,
    desc: s.descVi, category: def.category ?? categoryOf(s), tags: [...new Set([...s.tags, slug(s.category)])],
    upstream: s.upstream ? UPSTREAM[s.upstream] ?? `after ${s.upstream.replace(/^other:/, "")}` : null,
    notes: [s.spec, s.paramsVi ? `Params: ${s.paramsVi}.` : "", def.notes ?? ""].filter(Boolean).join(" "),
    ...Object.fromEntries(Object.entries(def).filter(([k]) => !["kind", "category", "notes"].includes(k))),
  };
}


// anidoodle's human characters in films. A film in one of the 9 anidoodle media that can draw people takes
// the character itself: its module (the author's contract: rig, palettes, poses, toScene) copied into the film's own modules
// (anidoodle/characters/<id>/), its gate beside it (anidoodle/check-<id>.ts), its sheet and poster for the Character dialog, and a line in
// CHARACTERS.json; Claude poses and animates it with the human engine the author's way and never redraws it. Mira and Theo are anidoodle's own:
// already in the staged engine (anidoodle/canvas-core/characters/<id>), with the author's own gate. Any other film takes a saved human as
// a reference to draw in its own design (reference.mjs).
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { docPath, writeDoc } from "../project-service/docs.mjs";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { HUMAN_ENGINE, humanCharacters, humanFolder, ownRig } from "./index.mjs";
import { humanHandOf } from "../style-catalog/hands.mjs";

/** The hand of a film's style when it draws anidoodle's people (config/anidoodle-pipeline.json humanHands), else null. */
export const handOfStyle = (styleId, root = APP_ROOT) => humanHandOf(styleId, root);
export const HUMANS_FILE = "CHARACTERS.json";          // an anidoodle film's cast, as a Brush film's (the Brush pipeline reads it); entries carry engine "anidoodle-human"
const readJson = (f, d = null) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
/** The film's humans: [{ id, name, about, hand, import, check, made, credit, from }]; a bare list in the file is read as the cast too. */
export const readHumans = (projectDir) => { const j = readJson(docPath(projectDir, HUMANS_FILE), { characters: [] }); return Array.isArray(j) ? j : j?.characters ?? []; };

/** Put saved humans into an anidoodle film (one that draws people). Returns the ids added. */
export function useHumans(projectDir, ids, { styleId = null, root = APP_ROOT } = {}) {
  const hand = handOfStyle(styleId, root), lib = humanCharacters(root), have = readHumans(projectDir), out = [...have], added = [];
  for (const id of ids ?? []) {
    const c = lib.find((x) => x.id === String(id));
    if (!c) throw Object.assign(new Error(`No anidoodle character "${id}"`), { code: "NOT_FOUND" });
    if (out.some((x) => x.id === c.id)) continue;
    const shipped = c.credit?.made === "as shipped", store = humanFolder(c.id, root);          // the user's, or the app's in bundle/ (only read)
    let entry;
    if (shipped && c.rig) {
      // the author's rigged characters (Bit, the cheetah): their own rig and hand in the staged engine, no human gate
      entry = { import: c.import, check: null, rig: c.rig };
    } else if (shipped) {
      // the author's own: in the staged engine; the author's gate (Mira and Theo) staged once with its imports pointed at the engine
      const gate = join(projectDir, "anidoodle", "check-anidoodle-cast.ts");
      const pin = loadPins(root).anidoodle, src = pin ? join(expandEnv(pin.root), ...(pin.skill ?? "skills/anidoodle").split("/"), "engine", "tools", "character-check.entry.ts") : null;
      if (src && !existsSync(src)) throw Object.assign(new Error("anidoodle's own character gate is missing from the pinned copy"), { code: "NOT_FOUND" });
      if (src && !existsSync(gate)) { mkdirSync(join(gate, ".."), { recursive: true }); writeFileSync(gate, readFileSync(src, "utf8").split('"../src/canvas-core/').join('"anidoodle/canvas-core/')); }
      entry = { import: `anidoodle/canvas-core/characters/${c.id}`, check: src ? "check-anidoodle-cast.ts" : null };
    } else {
      cpSync(join(store, "module", c.id), join(projectDir, "anidoodle", "characters", c.id), { recursive: true });
      if (existsSync(join(store, "module", "check.ts"))) cpSync(join(store, "module", "check.ts"), join(projectDir, "anidoodle", `check-${c.id}.ts`));
      // the user's: its module and its own gate; an animal or a thing keeps its kind, so its gate is never read as a person's
      entry = { import: `./characters/${c.id}`, check: existsSync(join(store, "module", "check.ts")) ? `check-${c.id}.ts` : null, ...(ownRig(c.kind) ? { kind: c.kind } : {}) };
    }
    // its pictures for the Character dialog (the sheet in its own hand, the poster)
    mkdirSync(join(projectDir, "characters", "sheets"), { recursive: true });
    for (const [f, to] of [["sheet.webp", "sheet"], ["sheet-marker.webp", "sheet"], ["sheet-storybook.webp", "sheet-storybook"], ["poster.webp", "poster"]])
      if (existsSync(join(store, f)) && !existsSync(join(projectDir, "characters", "sheets", `${c.id}-${to}.webp`))) cpSync(join(store, f), join(projectDir, "characters", "sheets", `${c.id}-${to}.webp`));
    const own = c.hand ?? c.hands?.[0] ?? null;
    out.push({ id: c.id, name: c.name, about: c.about ?? "", engine: HUMAN_ENGINE, hand: own, filmHand: hand, needsPalette: !c.rig && !!(hand && own !== hand && !(c.hands ?? []).includes(hand)),
      // in a hand it already has (or the author's rig as shipped) it needs no redraw, only its gate
      ownStyle: !!c.rig || !(hand && own !== hand && !(c.hands ?? []).includes(hand)),
      ...entry, made: shipped ? "as shipped" : c.credit?.made === "adapted" ? "adapted" : "written from the idea", credit: c.credit ?? null, from: { library: "anidoodle", at: new Date().toISOString() } });
    added.push(c.id);
  }
  writeDoc(projectDir, HUMANS_FILE, JSON.stringify({ characters: out }, null, 2) + "\n");
  return added;
}

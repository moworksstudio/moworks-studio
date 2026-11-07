// MW Character Sheet v1 for anidoodle's people (owner #1287-#1293): the sheet and the life clip of v1/v1.ts, drawn for one person in a scratch
// project with the engine staged as pinned (stageEngine) and rendered the way the Character creator's lab renders (character-maker/lab-tools/mw.mjs:
// HyperFrames, light). The person comes from the staged engine (the author's: Mira, Theo) or from a module folder of the user's.
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { APP_ROOT } from "../version-manager/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/** What a person's drawing really drives in a film (MW Character Sheet v1), kept in its character.json as `can`. */
export const CAN = Object.freeze({
  views: ["front", "three-quarter", "profile", "back"], viewNotes: "any yaw: a 3D skeleton drawn by the hand's renderer (toScene(pose, camera))",
  faces: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"], faceNotes: "the engine's named expressions (neutral, happy, laughing, surprised, worried, determined, curious) as blendable weights; angry, talk and blink are its own weights (browFurrow, mouthOpen, lidUpper)",
  poses: ["stand", "walk", "point", "wave", "reach", "sit"], poseNotes: "pose(p) on the skeleton inside its joint limits: reach and stand (balance.ts), the walk from footsteps; sit on a stool prop",
  hands: ["relaxed", "open", "point", "fist", "grip", "pinch"], walk: "planWalk / walkAt: feet planted from footsteps", talk: "mouthOpen by turns; no lip sync (word times too coarse)",
});
/** The cast module of one person: `{ import, name, palette: { from, name } }` → anidoodle/films/v1/cast.ts. */
const castModule = (c) => `import { ${c.export} as character, ${c.spec} as spec } from "${c.from}";
import { ${c.palette} as palette } from "${c.paletteFrom ?? c.from}";
export const CAST = { name: ${JSON.stringify(c.name)}, character, spec, palette: palette as Record<string, { base: string; shade: string }> & { stool?: { base: string; shade: string } } };
`;
/** The authors' people as the staged engine has them. */
export const AUTHOR_CAST = Object.freeze({
  mira: { name: "Mira", export: "mira", spec: "MIRA_SPEC", from: "anidoodle/canvas-core/characters/mira", palette: "MIRA_STORYBOOK", paletteFrom: "anidoodle/canvas-core/characters/mira/palettes" },
  theo: { name: "Theo", export: "theo", spec: "THEO_SPEC", from: "anidoodle/canvas-core/characters/theo", palette: "THEO_PALETTE" },
});

/** Draw a person's v1 sheet (a PNG) and life clip (an MP4, 6 s at 30 fps) into out: { sheet, life }. cast: an AUTHOR_CAST entry, or one for a
 *  module folder of the user's (`module`: the folder holding <id>/, imported as ../characters/<id>). */
export async function drawV1(cast, out, { root = APP_ROOT, life = true } = {}) {
  const lab = mkdtempSync(join(tmpdir(), "mw-v1-"));
  process.env.MW_APP_ROOT ??= root;
  try {
    const films = join(lab, "anidoodle", "films", "v1");
    mkdirSync(films, { recursive: true });
    if (cast.module) cpSync(cast.module, join(lab, "anidoodle", "characters"), { recursive: true });
    cpSync(join(HERE, "v1", "v1.ts"), join(films, "v1.ts"));
    writeFileSync(join(films, "cast.ts"), castModule(cast));
    writeFileSync(join(films, "sheet.ts"), `export { sheetFilm as default } from "./v1";\n`);
    writeFileSync(join(films, "life.ts"), `export { lifeFilm as default } from "./v1";\n`);
    const { renderFilm } = await import(pathToFileURL(join(root, "packages", "character-maker", "lab-tools", "mw.mjs")).href);
    mkdirSync(out, { recursive: true });
    const sheet = join(out, "sheet.png");
    await renderFilm(lab, "films/v1/sheet.ts", sheet, { still: true });
    let clip = null;
    if (life) { clip = join(out, "life.mp4"); await renderFilm(lab, "films/v1/life.ts", clip); }
    return { sheet, life: clip };
  } finally { rmSync(lab, { recursive: true, force: true }); }
}
/** The reduced sheet (a PNG) of one of the author's two characters on a rig of their own (v1/rigs.ts): "bit" or "cheetah". */
export async function drawRigSheet(id, png, { root = APP_ROOT } = {}) {
  const film = { bit: "bitSheet", cheetah: "cheetahSheet" }[id];
  if (!film) throw Object.assign(new Error(`${id}: no reduced sheet (bit, cheetah)`), { code: "INVALID" });
  const lab = mkdtempSync(join(tmpdir(), "mw-v1-"));
  process.env.MW_APP_ROOT ??= root;
  try {
    const films = join(lab, "anidoodle", "films", "v1");
    mkdirSync(films, { recursive: true });
    cpSync(join(HERE, "v1", "rigs.ts"), join(films, "rigs.ts"));
    cpSync(join(HERE, "..", "character-kit", "sheet-frame.js"), join(films, "sheet-frame.js"));          // the one sheet frame every engine keeps
    writeFileSync(join(films, "sheet.ts"), `export { ${film} as default } from "./rigs";\n`);
    const { renderFilm } = await import(pathToFileURL(join(root, "packages", "character-maker", "lab-tools", "mw.mjs")).href);
    mkdirSync(dirname(png), { recursive: true });
    await renderFilm(lab, "films/v1/sheet.ts", png, { still: true });
    return png;
  } finally { rmSync(lab, { recursive: true, force: true }); }
}
/** What the two rigs really drive in a film (their reduced sheet), kept in character.json as `can`. */
export const RIG_CAN = Object.freeze({
  bit: { views: ["front"], viewNotes: "front only: sprites the storybook plate drew once", faces: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"], faceNotes: "his own eyes (open, happy, shut, blink, squint), brows (neutral, up, worried, none) and mouths (smile, grin, o, wobble, flat); angry is his squint and a flat mouth",
    poses: ["stand", "lean", "arm up", "both arms up", "cheer", "squash"], poseNotes: "BitPose: off, bob, squash, lean, head, look, arms (lift 0-0.8), the cheer's jump; no walk, point or sit", hands: "n/a: mitten hands on lifted arms", walk: "n/a (a bob and a jump)", talk: "his o and smile by turns; no lip sync" },
  cheetah: { views: ["profile"], viewNotes: "side only, facing either way (flipped); her head can turn toward the camera (cheetahTurn.ts) in her own film", faces: [], faceNotes: "n/a: the rig has no faces",
    poses: ["stand", "bow", "crouch", "skid"], poseNotes: "the rig's held poses (cheetahRig.ts), angles on bones that never stretch", hands: "n/a", walk: "the rotary gallop (gallopRig, gallopY)", talk: "n/a" },
});
/** The palette a record shows: the base colour of each of the person's storybook roles but the eyes' and the mouth's. */
export const paletteOf = (pal) => Object.fromEntries(Object.entries(pal ?? {}).filter(([k]) => !/^(white|pupil|mouth|lip|nail|blush|hairLine|cup|coffee|crate|toolRed|metal|stool)$/.test(k)).map(([k, v]) => [k, v.base]).slice(0, 8));

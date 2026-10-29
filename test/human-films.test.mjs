// anidoodle's human characters in films: a saved human goes into an anidoodle film whose hand draws people as its module
// (copied into the film's own modules, its gate beside it, its sheet for the dialog, a CHARACTERS.json entry that the Brush schema leaves
// alone); the cast's gates run the author's way; a film page posing the copy bundles and draws (one frame). Uses the characters saved on
// this computer (Grandma, Mira; the work folder's library, or MW_REAL_CHARACTERS): skipped where they are not.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REAL = process.env.MW_REAL_CHARACTERS ?? join((await import("../packages/project-service/index.mjs")).workRoot(), "library", "characters");
const T = mkdtempSync(join(tmpdir(), "mw-human-films-"));
after(() => rmSync(T, { recursive: true, force: true }));
const have = ["grandma", "mira"].every((id) => existsSync(join(REAL, "anidoodle-human", id, "character.json")));
const skip = have ? false : "Grandma and Mira are not saved on this computer";
if (have) for (const id of ["grandma", "mira"]) cpSync(join(REAL, "anidoodle-human", id), join(T, "store", "anidoodle-human", id), { recursive: true });
process.env.MW_CHARACTERS_ROOT = join(T, "store");
const kit = await import("../packages/character-kit/index.mjs");
const humans = await import("../packages/character-kit/humans.mjs");
const maker = await import("../packages/character-maker/index.mjs");
const { stageEngine } = await import("../packages/anidoodle-styles/index.mjs");
const { APP_ROOT } = await import("../packages/version-manager/index.mjs");

test("the 9 media whose hand draws people, from the config", () => {
  assert.equal(humans.handOfStyle("anidoodle-koi"), "marker");
  assert.equal(humans.handOfStyle("anidoodle-toyBrick"), "brick");
  assert.equal(humans.handOfStyle("anidoodle-fox"), null);
  assert.equal(humans.handOfStyle("brush-cartoon"), null);
});

test("a saved human into a marker-comic film: its module, its gate, its sheet, the cast entry; Mira from the engine; the gates pass", { skip, timeout: 300000 }, async () => {
  const film = join(T, "film");
  mkdirSync(join(film, "anidoodle"), { recursive: true });
  stageEngine(film);
  const added = humans.useHumans(film, ["grandma", "mira"], { styleId: "anidoodle-koi" });
  assert.deepEqual(added, ["grandma", "mira"]);
  assert.ok(existsSync(join(film, "anidoodle", "characters", "grandma", "index.ts")));
  assert.ok(existsSync(join(film, "anidoodle", "check-grandma.ts")));
  assert.ok(existsSync(join(film, "anidoodle", "check-anidoodle-cast.ts")));
  assert.doesNotMatch(readFileSync(join(film, "anidoodle", "check-anidoodle-cast.ts"), "utf8"), /"\.\.\/src\/canvas-core\//);
  const cast = humans.readHumans(film), g = cast.find((c) => c.id === "grandma"), m = cast.find((c) => c.id === "mira");
  assert.deepEqual([g.engine, g.import, g.check, g.filmHand], ["anidoodle-human", "./characters/grandma", "check-grandma.ts", "marker"]);
  assert.deepEqual([m.import, m.check, m.made], ["anidoodle/canvas-core/characters/mira", "check-anidoodle-cast.ts", "as shipped"]);
  assert.deepEqual(kit.readCast(film).problems, [], "the Brush schema leaves anidoodle cast members alone");
  assert.ok(existsSync(join(film, "characters", "sheets", "grandma-sheet.webp")));
  assert.deepEqual(humans.useHumans(film, ["grandma"], { styleId: "anidoodle-koi" }), [], "already in the film");
  const gate = await maker.filmGate(film);
  assert.equal(gate.pass, true, JSON.stringify(gate.characters));
  assert.ok(gate.characters.find((c) => c.id === "grandma").passed > 50);
  // a broken copy fails its gate
  const idx = join(film, "anidoodle", "characters", "grandma", "index.ts");
  const before = readFileSync(idx, "utf8");
  writeFileSync(idx, before + "\nthrow new Error(\"broken on purpose\");\n");
  assert.equal((await maker.filmGate(film)).pass, false);
  writeFileSync(idx, before);
});

// A turtle made for the film failed its gate again and again with no reason: the gate doubled "anidoodle/" in its path, read
// only the author's sectioned results and dropped what the runner printed. Each member is checked by its own gate; every failure says why.
test("an animal on its own rig: checked by its own gate (any path form, flat results), never as a person; every failure says why", { timeout: 300000 }, async () => {
  const film = join(T, "rigfilm");
  mkdirSync(join(film, "anidoodle", "characters", "pebble"), { recursive: true });
  stageEngine(film);
  const checkTs = (ok) => `import type { Result } from "anidoodle/canvas-core/character/check";
export const run = (): Result[] => [{ id: "legs keep their length", ok: true, detail: "4 legs x 3 poses, 0.0 % change" }, { id: "shell pitch in range", ok: ${ok}, detail: "pitch ${ok ? "12" : "48"} deg, range -15..30" }];
`;
  writeFileSync(join(film, "anidoodle", "characters", "pebble", "check.ts"), checkTs(true));
  const cast = (extra) => writeFileSync(join(film, "CHARACTERS.json"), JSON.stringify({ characters: [
    { id: "pebble", name: "Pebble", engine: "anidoodle-human", rig: "pebble", kind: "animal", import: "./characters/pebble", made: "for this film", ...extra },
    { id: "cheetah", name: "Cheetah", engine: "anidoodle-human", rig: "cheetah", import: "anidoodle/canvas-core/cheetahBody", check: null, made: "as shipped" }] }));
  for (const check of ["characters/pebble/check.ts", "anidoodle/characters/pebble/check.ts", null]) {          // null: found where the recipe puts it
    cast({ check });
    const g = await maker.filmGate(film), p = g.characters.find((c) => c.id === "pebble");
    assert.equal(g.pass, true, `${check}: ${JSON.stringify(g.characters)}`);
    assert.deepEqual([p.kind, p.passed, p.failed], ["rig", 2, 0], String(check));
    assert.equal(g.characters.find((c) => c.id === "cheetah").kind, "shipped-rig");
  }
  // its own check fails: the line says what was measured
  writeFileSync(join(film, "anidoodle", "characters", "pebble", "check.ts"), checkTs(false));
  cast({ check: "characters/pebble/check.ts" });
  let p = (await maker.filmGate(film)).characters.find((c) => c.id === "pebble");
  assert.equal(p.failed, 1);
  assert.ok(p.lines.some((l) => /FAIL\s+shell pitch in range\s+pitch 48 deg, range -15..30/.test(l)), p.lines.join("\n"));
  // a gate that cannot build, or exports nothing it can read, says so
  writeFileSync(join(film, "anidoodle", "characters", "pebble", "check.ts"), "export const run = () => [ {");
  p = (await maker.filmGate(film)).characters.find((c) => c.id === "pebble");
  assert.ok(p.failed && p.lines.some((l) => /could not build anidoodle\/characters\/pebble\/check\.ts/.test(l)), p.lines.join("\n"));
  writeFileSync(join(film, "anidoodle", "characters", "pebble", "check.ts"), "export const shell = 1;\n");
  p = (await maker.filmGate(film)).characters.find((c) => c.id === "pebble");
  assert.ok(p.lines.some((l) => /exports no run\(\) \(it exports: shell\)/.test(l)), p.lines.join("\n"));
  // no gate anywhere: a rig made for the film is never let through as the author's
  rmSync(join(film, "anidoodle", "characters", "pebble", "check.ts"));
  cast({ check: null });
  p = (await maker.filmGate(film)).characters.find((c) => c.id === "pebble");
  assert.equal(p.failed, 1);
  assert.match(p.lines[0], /no gate: write anidoodle\/characters\/pebble\/check\.ts .*own rig rules/);
  assert.doesNotMatch(p.lines[0], /human/);
});

test("a film page posing the film's copy of a character bundles and draws one frame (the app's render, light)", { skip, timeout: 300000 }, async () => {
  const film = join(T, "film");
  mkdirSync(join(film, "anidoodle", "films"), { recursive: true });
  writeFileSync(join(film, "anidoodle", "films", "pose.ts"), `import { mountFilm } from "anidoodle/hosts/page";
import type { Film } from "anidoodle/canvas-core/film";
import { Gfx, PENCIL } from "anidoodle/canvas-core/core";
import { camera } from "anidoodle/canvas-core/character/math3";
import { renderMarker } from "anidoodle/canvas-core/character/render/marker";
import { grandma } from "../characters/grandma";
import { GRANDMA_MARKER } from "../characters/grandma/palettes";
import * as GP from "../characters/grandma/poses";
const W = 640, H = 640;
const film: Film = { meta: { title: "Grandma in a film", W, H, fps: 24, bpm: 120, durationFrames: 1 }, assets: { images: {} }, shots: [{ id: "a", start: 0, end: 1, draw: (ctx, f, env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#8fd6e6"; ctx.fillRect(0, 0, W, H);
  const cam = camera([0, 0.8, 5.2], [0, 0.7, 0], 900, W / 2, H * 0.5);
  renderMarker(new Gfx(ctx, env, f, PENCIL), grandma.toScene(GP.relaxed(-20), cam), GRANDMA_MARKER, { weight: 1.1 });
} }] };
mountFilm(film);
export const __meta = film.meta;
`);
  const out = join(film, "out", "pose.png");
  execFileSync(process.execPath, [join(APP_ROOT, "packages", "character-maker", "lab-tools", "still.mjs"), "films/pose.ts", out], { cwd: film, env: { ...process.env, MW_APP_ROOT: APP_ROOT, MW_BG_WORKERS: "1" }, windowsHide: true, timeout: 280000 });
  assert.ok(statSync(out).size > 5000, "a drawn frame");
});

test("a sheet module that only exports its film is drawn, in a scratch copy: the film's own index.html and page.ts stay as they are", { skip, timeout: 300000 }, async () => {
  const film = join(T, "film");
  mkdirSync(join(film, "anidoodle", "films"), { recursive: true });
  writeFileSync(join(film, "anidoodle", "films", "sheet-grandma.ts"), `import type { Film } from "anidoodle/canvas-core/film";
import { Gfx, PENCIL } from "anidoodle/canvas-core/core";
import { camera } from "anidoodle/canvas-core/character/math3";
import { renderMarker } from "anidoodle/canvas-core/character/render/marker";
import { grandma } from "../characters/grandma";
import { GRANDMA_MARKER } from "../characters/grandma/palettes";
import * as GP from "../characters/grandma/poses";
const W = 480, H = 640;
export const sheetGrandma: Film = { meta: { title: "Grandma sheet", W, H, fps: 24, bpm: 120, durationFrames: 1 }, assets: { images: {} }, shots: [{ id: "s", start: 0, end: 1, draw: (ctx, f, env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#f7f1e3"; ctx.fillRect(0, 0, W, H);
  renderMarker(new Gfx(ctx, env, f, PENCIL), grandma.toScene(GP.relaxed(0), camera([0, 0.8, 5.2], [0, 0.7, 0], 700, W / 2, H * 0.55)), GRANDMA_MARKER, { weight: 1.1 });
} }] };
export const __meta = sheetGrandma.meta;
export default sheetGrandma;
`);
  writeFileSync(join(film, "index.html"), "<html>the film's own page</html>"); writeFileSync(join(film, "anidoodle", "page.ts"), "// the film's own page module\n");
  const out = join(T, "sheet.png");
  const r = await maker.filmStill(film, "films/sheet-grandma.ts", out, { root: APP_ROOT, env: { MW_BG_WORKERS: "1" } });
  assert.equal(r.ok, true, r.error);
  assert.ok(statSync(out).size > 5000, "a drawn sheet");
  assert.equal(readFileSync(join(film, "index.html"), "utf8"), "<html>the film's own page</html>");
  assert.equal(readFileSync(join(film, "anidoodle", "page.ts"), "utf8"), "// the film's own page module\n");
});

test("a sheet's failure in one plain line", () => {
  assert.match(maker.sheetError("render failed: Render blocked by 1 correctness warning:\n- sub_timeline_readiness_timeout: Sub-composition timelines did not become ready within 180000ms"), /never got ready to draw/);
  assert.equal(maker.sheetError("Error: films/x.ts must export __meta (its film's meta)\n    at metaOf (mw.mjs:28)"), "Error: films/x.ts must export __meta (its film's meta)");
  assert.equal(maker.sheetError(""), "the sheet could not be drawn");
});

test("the catalog says which styles take characters, and with which engine (one source for the UI)", async () => {
  const { getStyle, styleList } = await import("../packages/style-catalog/index.mjs");
  for (const [id, hand] of [["anidoodle-storybook", "storybook"], ["anidoodle-koi", "marker"], ["anidoodle-colouredPencil", "pencil"], ["anidoodle-sumiE", "sumi"],
    ["anidoodle-woodcut", "woodcut"], ["anidoodle-scratchboard", "scratch"], ["anidoodle-lighthouse", "riso"], ["anidoodle-pixelArt", "pixel"], ["anidoodle-toyBrick", "brick"]]) {
    const s = getStyle(id);
    assert.deepEqual([s.characters, s.characterEngine, s.humanHand], [true, "anidoodle-human", hand], id);
  }
  assert.equal(getStyle("anidoodle-fox").characters, false);
  assert.deepEqual([getStyle("brush-cartoon").characters, getStyle("brush-cartoon").characterEngine], [true, "brush-kit"]);
  const listed = styleList().styles.find((s) => s.id === "anidoodle-koi");
  assert.equal(listed.characters, true);
});

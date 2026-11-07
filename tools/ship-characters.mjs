// node tools/ship-characters.mjs <engine> [id …]: make the app's own library characters (owner #1287-#1293: every built-in cast a film style's source
// skill ships goes into the Character library, each with an MW Character Sheet v1). The wrappers the app wrote for them are in
// packages/character-kit/shipped/<engine>/<id>.* (one per character, nothing of the source skill changed); each is checked by its engine's gate in
// its shipped mode, drawn by its engine (its sheet, its life clip, its poster) and written to bundle/library/characters/<engine>/<id>/ with its
// character.json (name, about, height, palette, the `can` list, its credit and source). Engines so far: cartoon-3d, ricks-clip, what-if, the house heroes (stickman-explainer, inner-voice-short, explainer-2d), and anidoodle-human (its four as shipped, brought to v1 in place). Run it again after a wrapper
// or an engine's sheet changes; it writes only those folders. Not run by the app: a tool for the repository.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPins } from "../packages/version-manager/index.mjs";
import { ffmpegExe } from "../packages/looks-library/index.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ff = (...args) => execFileSync(ffmpegExe(ROOT), ["-v", "error", "-y", ...args], { windowsHide: true });

/** What each shipped character is, beside its wrapper: the source it is from and how it was made (credited in its record, never on its sheet). */
export const SHIPPED = Object.freeze({
  "cartoon-3d": {
    "moworks-mika": { source: "src/kit/character.ts CAST.mika", made: "as shipped" },
    "moworks-ravi": { source: "src/kit/character.ts CAST.ravi", made: "as shipped" },
    "moworks-june": { source: "src/kit/character.ts CAST.june", made: "as shipped" },
    "moworks-otto": { source: "src/kit/character.ts CAST.otto", made: "as shipped" },
    "moworks-bea": { source: "src/examples/cheese-bank-vault/world.ts BEA, coatTex", made: "adapted", madeNote: "the example's CharDef and coat, copied into the app's wrapper (the example keeps them in its world.ts); her torch, a light of its scene, left out" },
    "moworks-leo": { source: "src/examples/cheese-bank-vault/world.ts LEO, coatTex", made: "adapted", madeNote: "the example's CharDef and coat, copied into the app's wrapper (the example keeps them in its world.ts); his torch, a light of its scene, left out" },
    "moworks-noor": { source: "src/examples/what-if-no-pain/world.ts noor, coatTex, the stethoscope", made: "adapted", madeNote: "the example's CharDef, coat and stethoscope, copied into the app's wrapper (the example keeps them in its world.ts)" },
  },
  // FreshStack's What If cast (studio/src/engine/rig.tsx LOOKS, MIT): Pip as the hero's look (pipHood), Mo, Sis, Mum, The Suit
  "what-if": Object.fromEntries([["pip", "pipHood"], ["mo", "mo"], ["sis", "sis"], ["mum", "mom"], ["suit", "suit"]]
    .map(([id, key]) => [`moworks-${id}`, { source: `studio/src/engine/rig.tsx LOOKS.${key}`, made: "as shipped" }])),
  // the house heroes: the Story source skill's own heroes, named by the app (the source names none)
  "stickman-explainer": { "moworks-hoodie-hero": { source: "src/stickman/kit.js figure() (the hero's defaults)", made: "as shipped" } },
  "explainer-2d": { "moworks-red-hoodie-kid": { source: "engine/house-hero.js HOUSE.hero (the house character)", made: "as shipped", heightNote: "the source skill gives no height: a young teenager's" } },
  "inner-voice-short": { "moworks-inner-voice-hero": { source: "src/inner-voice/kit.js hero()", made: "as shipped" }, "moworks-inner-voice-shadow": { source: "src/inner-voice/kit.js shadowFigure()", made: "as shipped" } },
  // the source skill's eight outfits (kit/engine/roman.js OUTFITS), named by the app: the source names them by role only
  "ricks-clip": Object.fromEntries([["legionary", "legion"], ["veteran", "old"], ["senator", "toga"], ["townsman", "civA"], ["townswoman", "civB"], ["stout-townsman", "civC"], ["craftsman", "workA"], ["workman", "workB"]]
    .map(([id, key]) => [`moworks-${id}`, { source: `kit/engine/roman.js OUTFITS.${key}`, made: "as shipped", madeNote: "the source skill's outfit as shipped; its name is the app's (the source names its outfits by role only)" }])),
});

async function shipC3d(ids) {
  const { CAN, LIFE_FPS, checkCharacter, drawLife, drawSheet, paletteOf } = await import("../packages/moworks-styles/c3d-page.mjs");
  const src = join(ROOT, "packages", "character-kit", "shipped", "cartoon-3d"), out = join(ROOT, "bundle", "library", "characters", "cartoon-3d");
  const pin = loadPins(ROOT).moworksStyles?.sources?.["cartoon-3d"] ?? {};
  for (const id of ids.length ? ids : Object.keys(SHIPPED["cartoon-3d"])) {
    const meta = SHIPPED["cartoon-3d"][id], file = join(src, `${id}.ts`);
    if (!meta || !existsSync(file)) throw new Error(`${id}: no wrapper in packages/character-kit/shipped/cartoon-3d/`);
    const t0 = Date.now();
    const gate = await checkCharacter(file, { root: ROOT });
    if (gate.failed) throw new Error(`${id}: the gate did not pass: ${gate.lines.filter((l) => l.startsWith("FAIL")).join(" | ")}`);
    const work = mkdtempSync(join(tmpdir(), "mw-ship-"));
    try {
      await drawSheet(file, join(work, "sheet.png"), { root: ROOT });
      await drawLife(file, join(work, "life"), { root: ROOT });
      const dir = join(out, id);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(join(dir, "module"), { recursive: true });
      cpSync(file, join(dir, "module", `${id}.ts`));
      ff("-i", join(work, "sheet.png"), "-vf", "scale='min(2400,iw)':-1", "-c:v", "libwebp", "-quality", "82", join(dir, "sheet.webp"));
      ff("-framerate", String(LIFE_FPS), "-i", join(work, "life", "frame-%04d.png"), "-vf", "scale=960:-2", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", join(dir, "life.mp4"));
      ff("-ss", "0", "-i", join(dir, "life.mp4"), "-frames:v", "1", "-vf", "crop=ih*0.8:ih,scale=480:-1", "-c:v", "libwebp", "-quality", "82", join(dir, "poster.webp"));
      writeFileSync(join(dir, "check.json"), JSON.stringify({ passed: gate.passed, failed: gate.failed, lines: gate.lines }, null, 2) + "\n");
      const r = gate.record;
      const record = { id, name: r.name, about: r.about, engine: "cartoon-3d", kind: "human", heightM: r.heightM, heightBy: "inferred", heightNote: "the source skill gives no height: an everyday adult's",
        hand: "cartoon", hands: ["cartoon"], def: r.def, palette: paletteOf(r.def), can: CAN, sheet: "MW Character Sheet v1",
        credit: { author: "Moworks Studio (the owner's 3D Cartoon source skill)", link: null, licence: "the owner's own", made: meta.made, ...(meta.madeNote ? { madeNote: meta.madeNote } : {}),
          source: { skill: pin.title ?? "3D Cartoon Animation", version: pin.version ?? null, sha256: pin.sha256 ?? null, file: meta.source }, gate: { passed: gate.passed, failed: gate.failed } },
        version: 1, module: [`${id}.ts`], savedAt: new Date().toISOString() };
      writeFileSync(join(dir, "character.json"), JSON.stringify(record, null, 2) + "\n");
      console.log(`${id}: ${gate.passed} passed; sheet, life clip, poster in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } finally { rmSync(work, { recursive: true, force: true }); }
  }
}

async function shipRicks(ids) {
  const { CAN, checkCharacter, drawLife, drawSheet, paletteOf } = await import("../packages/moworks-styles/ricks-page.mjs");
  const src = join(ROOT, "packages", "character-kit", "shipped", "ricks-clip"), out = join(ROOT, "bundle", "library", "characters", "ricks-clip");
  const pin = loadPins(ROOT).moworksStyles?.sources?.["ricks-clip"] ?? {}, toon = pin.vendor?.["kit/vendor/toon.ts"];
  for (const id of ids.length ? ids : Object.keys(SHIPPED["ricks-clip"])) {
    const meta = SHIPPED["ricks-clip"][id], file = join(src, `${id}.js`);
    if (!meta || !existsSync(file)) throw new Error(`${id}: no wrapper in packages/character-kit/shipped/ricks-clip/`);
    const t0 = Date.now();
    const gate = await checkCharacter(file, { root: ROOT });
    if (gate.failed) throw new Error(`${id}: the gate did not pass: ${gate.lines.filter((l) => l.startsWith("FAIL")).join(" | ")}`);
    const work = mkdtempSync(join(tmpdir(), "mw-ship-"));
    try {
      await drawSheet(file, join(work, "sheet.png"), { root: ROOT });
      mkdirSync(join(work, "life"), { recursive: true });
      await drawLife(file, join(work, "life"), { root: ROOT });
      const dir = join(out, id);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(join(dir, "module"), { recursive: true });
      cpSync(file, join(dir, "module", `${id}.js`));
      ff("-i", join(work, "sheet.png"), "-vf", "scale='min(2400,iw)':-1", "-c:v", "libwebp", "-quality", "82", join(dir, "sheet.webp"));
      ff("-framerate", "30", "-i", join(work, "life", "frame-%04d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", join(dir, "life.mp4"));
      ff("-ss", "0", "-i", join(dir, "life.mp4"), "-frames:v", "1", "-vf", "scale=480:-1", "-c:v", "libwebp", "-quality", "82", join(dir, "poster.webp"));
      writeFileSync(join(dir, "check.json"), JSON.stringify({ passed: gate.passed, failed: gate.failed, lines: gate.lines }, null, 2) + "\n");
      const r = gate.record;
      const record = { id, name: r.name, about: r.about, engine: "ricks-clip", kind: "human", heightM: r.heightM, heightBy: "inferred", heightNote: "the source skill gives no height: an everyday adult's",
        hand: "ricks", hands: ["ricks"], palette: paletteOf(r.outfit), can: CAN, sheet: "MW Character Sheet v1",
        credit: { author: "Moworks Studio (the owner's Ricks Clip source skill)", link: null, licence: "the owner's own; drawn on toon.ts (Mr omi, MIT)", made: meta.made, madeNote: meta.madeNote,
          source: { skill: pin.skill ?? "cartoon-audio-short", sha256: pin.sha256 ?? null, file: meta.source, toon: toon ? `https://github.com/${toon.repo}/blob/${toon.commit}/${toon.path}` : null }, gate: { passed: gate.passed, failed: gate.failed } },
        version: 1, module: [`${id}.js`], savedAt: new Date().toISOString() };
      writeFileSync(join(dir, "character.json"), JSON.stringify(record, null, 2) + "\n");
      console.log(`${id}: ${gate.passed} passed; sheet, life clip, poster in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } finally { rmSync(work, { recursive: true, force: true }); }
  }
}

async function shipWhatIf(ids) {
  const { CAN, LIFE_FPS, checkCharacter, drawLife, drawSheet, paletteOf } = await import("../packages/what-if-styles/wi-page.mjs");
  const { whatIfSource } = await import("../packages/what-if-styles/index.mjs");
  const src = join(ROOT, "packages", "character-kit", "shipped", "what-if"), out = join(ROOT, "bundle", "library", "characters", "what-if"), wi = whatIfSource(ROOT);
  for (const id of ids.length ? ids : Object.keys(SHIPPED["what-if"])) {
    const meta = SHIPPED["what-if"][id], file = join(src, `${id}.ts`);
    if (!meta || !existsSync(file)) throw new Error(`${id}: no wrapper in packages/character-kit/shipped/what-if/`);
    const t0 = Date.now();
    const gate = await checkCharacter(file, { root: ROOT });
    if (gate.failed) throw new Error(`${id}: the gate did not pass: ${gate.lines.filter((l) => l.startsWith("FAIL")).join(" | ")}`);
    const work = mkdtempSync(join(tmpdir(), "mw-ship-"));
    try {
      await drawSheet(file, join(work, "sheet.png"), { root: ROOT });
      await drawLife(file, join(work, "life"), { root: ROOT });
      const dir = join(out, id);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(join(dir, "module"), { recursive: true });
      cpSync(file, join(dir, "module", `${id}.ts`));
      ff("-i", join(work, "sheet.png"), "-vf", "scale='min(2400,iw)':-1", "-c:v", "libwebp", "-quality", "82", join(dir, "sheet.webp"));
      ff("-framerate", String(LIFE_FPS), "-i", join(work, "life", "frame-%04d.png"), "-vf", "scale=960:-2", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", join(dir, "life.mp4"));
      ff("-ss", "0", "-i", join(dir, "life.mp4"), "-frames:v", "1", "-vf", "crop=ih*0.8:ih,scale=480:-1", "-c:v", "libwebp", "-quality", "82", join(dir, "poster.webp"));
      writeFileSync(join(dir, "check.json"), JSON.stringify({ passed: gate.passed, failed: gate.failed, lines: gate.lines }, null, 2) + "\n");
      const r = gate.record;
      const record = { id, name: r.name, about: r.about, engine: "what-if", kind: "human", heightM: r.heightM, heightBy: "inferred", heightNote: "the engine gives no height: the cast's sizes on the rig, as people",
        hand: "whatif", hands: ["whatif"], scale: r.scale, look: r.look, palette: paletteOf(r.look), can: CAN, sheet: "MW Character Sheet v1",
        credit: { author: "FreshStack (kelano86)", link: wi ? `https://github.com/${wi.repo}/blob/${wi.commit}/studio/src/engine/rig.tsx` : null, commit: wi?.commit ?? null, licence: "MIT", made: meta.made,
          madeNote: "the engine's own costume as shipped; the back view and the laugh, angry and talk faces are the app's layer (wi-cast.tsx)", source: { file: meta.source }, gate: { passed: gate.passed, failed: gate.failed } },
        version: 1, module: [`${id}.ts`], savedAt: new Date().toISOString() };
      writeFileSync(join(dir, "character.json"), JSON.stringify(record, null, 2) + "\n");
      console.log(`${id}: ${gate.passed} passed; sheet, life clip, poster in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } finally { rmSync(work, { recursive: true, force: true }); }
  }
}

async function shipHouse(engine, ids) {
  const { canOf, checkCharacter, drawLife, drawSheet } = await import("../packages/moworks-styles/house-page.mjs");
  const src = join(ROOT, "packages", "character-kit", "shipped", engine), out = join(ROOT, "bundle", "library", "characters", engine), srcKey = engine === "explainer-2d" ? "explainer-2d" : "story", pin = loadPins(ROOT).moworksStyles?.sources?.[srcKey] ?? {};
  const CAN = await canOf(engine), skill = srcKey === "story" ? "Story" : "2D Explainer";
  for (const id of ids.length ? ids : Object.keys(SHIPPED[engine])) {
    const meta = SHIPPED[engine][id], file = join(src, `${id}.js`);
    if (!meta || !existsSync(file)) throw new Error(`${id}: no wrapper in packages/character-kit/shipped/${engine}/`);
    const t0 = Date.now();
    const gate = await checkCharacter(file, { root: ROOT });
    if (gate.failed) throw new Error(`${id}: the gate did not pass: ${gate.lines.filter((l) => l.startsWith("FAIL")).join(" | ")}`);
    const work = mkdtempSync(join(tmpdir(), "mw-ship-"));
    try {
      await drawSheet(file, join(work, "sheet.png"), { root: ROOT });
      mkdirSync(join(work, "life"), { recursive: true });
      await drawLife(file, join(work, "life"), { root: ROOT });
      const dir = join(out, id);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(join(dir, "module"), { recursive: true });
      cpSync(file, join(dir, "module", `${id}.js`));
      ff("-i", join(work, "sheet.png"), "-vf", "scale='min(2400,iw)':-1", "-c:v", "libwebp", "-quality", "82", join(dir, "sheet.webp"));
      ff("-framerate", "30", "-i", join(work, "life", "frame-%04d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", join(dir, "life.mp4"));
      ff("-ss", "0", "-i", join(dir, "life.mp4"), "-frames:v", "1", "-vf", "scale=480:-1", "-c:v", "libwebp", "-quality", "82", join(dir, "poster.webp"));
      writeFileSync(join(dir, "check.json"), JSON.stringify({ passed: gate.passed, failed: gate.failed, lines: gate.lines }, null, 2) + "\n");
      const r = gate.record;
      const record = { id, name: r.name, about: r.about, engine, kind: "human", heightM: r.heightM, heightBy: "inferred", heightNote: meta.heightNote ?? "the source skill gives no height: an everyday adult's",
        hand: engine, hands: [engine], palette: r.palette, can: CAN, sheet: "MW Character Sheet v1",
        credit: { author: `Moworks Studio (the owner's ${skill} source skill)`, link: null, licence: "the owner's own", made: meta.made, madeNote: "the source skill's own hero as shipped; its name is the app's (the source gives none); what its drawing lacks is drawn by the app (house/" + engine + ".js" + (engine === "explainer-2d" ? ", posing the kit's own pieces through house/explainer-2d-hooks.mjs" : "") + ")",
          source: { skill: pin.title ?? skill, version: pin.version ?? null, sha256: pin.sha256 ?? null, file: meta.source }, gate: { passed: gate.passed, failed: gate.failed } },
        version: 1, module: [`${id}.js`], savedAt: new Date().toISOString() };
      writeFileSync(join(dir, "character.json"), JSON.stringify(record, null, 2) + "\n");
      console.log(`${id}: ${gate.passed} passed; sheet, life clip, poster in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } finally { rmSync(work, { recursive: true, force: true }); }
  }
}

/** anidoodle's four as shipped (bundle/library/characters/anidoodle-human/<id>/, kept in place): their sheet brought to MW Character Sheet v1 by the
 *  app's own sheet film on the author's engine (packages/anidoodle-styles/v1): Mira and Theo the whole sheet and a life clip; Bit and the cheetah, on
 *  rigs of their own, the reduced sheet (their own views and moves; their film stays their clip). The author's module, credit and other files stay. */
/** The people made in the app and shipped as its own (owner #1481: Bơ, the firefighter, the grandma; moved in under moworks- ids), each drawn
 *  from its own module (its folder's module/<id>/, imported as ../characters/<id>) on the same v1 sheet film: its sheet, a life clip, a poster. */
const MADE_CAST = Object.freeze({
  "moworks-bo": { name: "Bơ", export: "bo", spec: "BO_SPEC", palette: "BO_MARKER" },
  "moworks-firefighter": { name: "The firefighter", export: "firefighter", spec: "FF_SPEC", palette: "FF_STORYBOOK" },
  "moworks-grandma": { name: "Grandma", export: "grandma", spec: "GRANDMA_SPEC", palette: "GRANDMA_STORYBOOK" },
});
async function shipAnidoodle(ids) {
  const { AUTHOR_CAST, CAN, RIG_CAN, drawRigSheet, drawV1, paletteOf } = await import("../packages/anidoodle-styles/v1.mjs");
  const { build } = await import("esbuild");
  const { anidoodleSource } = await import("../packages/anidoodle-styles/index.mjs");
  const out = join(ROOT, "bundle", "library", "characters", "anidoodle-human"), src = anidoodleSource(ROOT);
  // a person's storybook palette, read from the author's module by bundling it for node
  const paletteFrom = async (c) => {
    const entry = `export { ${c.palette} as P } from "${(c.paletteFrom ?? c.from).replace("anidoodle/", "./")}";\n`;
    const r = await build({ stdin: { contents: entry, resolveDir: join(src.skillDir, "engine", "src"), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
    return (await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"))).P;
  };
  for (const id of ids.length ? ids : ["mira", "theo", "bit", "cheetah"]) {
    const dir = join(out, id), file = join(dir, "character.json"), rec = JSON.parse(readFileSync(file, "utf8")), t0 = Date.now();
    const work = mkdtempSync(join(tmpdir(), "mw-ship-"));
    try {
      if (MADE_CAST[id]) {
        const r = await drawV1({ ...MADE_CAST[id], from: `../../characters/${id}`, paletteFrom: `../../characters/${id}/palettes`, module: join(dir, "module") }, work, { root: ROOT });
        ff("-i", r.sheet, "-vf", "scale='min(2400,iw)':-1", "-c:v", "libwebp", "-quality", "82", join(dir, "sheet.webp"));
        ff("-i", r.life, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", join(dir, "life.mp4"));
        ff("-ss", "0", "-i", join(dir, "life.mp4"), "-frames:v", "1", "-vf", "scale=480:-1", "-c:v", "libwebp", "-quality", "82", join(dir, "poster.webp"));
        rec.can = CAN;
      } else if (AUTHOR_CAST[id]) {
        const r = await drawV1(AUTHOR_CAST[id], work, { root: ROOT });
        ff("-i", r.sheet, "-vf", "scale='min(2400,iw)':-1", "-c:v", "libwebp", "-quality", "82", join(dir, "sheet.webp"));
        ff("-i", r.life, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", join(dir, "life.mp4"));
        ff("-ss", "0", "-i", join(dir, "life.mp4"), "-frames:v", "1", "-vf", "scale=480:-1", "-c:v", "libwebp", "-quality", "82", join(dir, "poster.webp"));
        rec.palette = paletteOf(await paletteFrom(AUTHOR_CAST[id])); rec.can = CAN;
      } else if (RIG_CAN[id]) {
        await drawRigSheet(id, join(work, "sheet.png"), { root: ROOT });
        ff("-i", join(work, "sheet.png"), "-vf", "scale='min(2400,iw)':-1", "-c:v", "libwebp", "-quality", "82", join(dir, "sheet.webp"));
        rec.can = RIG_CAN[id];
      } else throw new Error(`${id}: not one of anidoodle's shipped four nor one made in the app`);
      rec.sheet = AUTHOR_CAST[id] || MADE_CAST[id] ? "MW Character Sheet v1" : "MW Character Sheet v1 (reduced)";
      rec.sheetBy = "Moworks Studio: packages/anidoodle-styles/v1 (the app's sheet film; every figure drawn by the author's engine as pinned)";
      writeFileSync(file, JSON.stringify(rec, null, 2) + "\n");
      console.log(`${id}: ${rec.sheet} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } finally { rmSync(work, { recursive: true, force: true }); }
  }
}

const [engine, ...ids] = process.argv.slice(2);
if (engine === "cartoon-3d") await shipC3d(ids);
else if (engine === "ricks-clip") await shipRicks(ids);
else if (engine === "what-if") await shipWhatIf(ids);
else if (engine === "stickman-explainer" || engine === "inner-voice-short" || engine === "explainer-2d") await shipHouse(engine, ids);
else if (engine === "anidoodle-human") await shipAnidoodle(ids);
else { console.error(`usage: node tools/ship-characters.mjs <engine> [id …]  (engines: ${Object.keys(SHIPPED).join(", ")})`); process.exit(2); }

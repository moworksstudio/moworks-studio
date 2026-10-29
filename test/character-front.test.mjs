// The Front figure on a model sheet (The Studio's height chart): found on the sheet itself, kept with the character
// (front.json, measured again when the sheet changes), and given by GET /api/characters as media.frontBox in that sheet's pixels.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-front-"));
process.env.MW_CHARACTERS_ROOT = T;
after(() => rmSync(T, { recursive: true, force: true }));
const kit = await import("../packages/character-kit/index.mjs");
const { frontBoxOf, fillFrontBoxes } = await import("../packages/character-kit/frontBox.mjs");
const { resolveRuntime } = await import("../packages/version-manager/index.mjs");
let sharp = null;
try { sharp = createRequire(join(resolveRuntime().dir, "node_modules", "sharp", "package.json"))("sharp"); } catch { /* HF's runtime not installed */ }
const skip = sharp ? false : "sharp (HyperFrames' runtime) is not installed";

/** A sheet as the character's film draws it: paper, a title line, the scale's numbers at the left, four turnaround figures each with its
 *  label under the feet, and a second row below. `at` moves the Front figure. */
async function sheet(file, { w = 1600, h = 1333, at = [120, 130], fig = [170, 490] } = {}) {
  const rect = (left, top, width, height, color) => ({ input: { create: { width, height, channels: 3, background: color } }, left, top });
  const [fx, fy] = at, [fw, fh] = fig;
  const parts = [
    rect(30, 20, 600, 22, "#2a2a2a"), rect(30, 50, 400, 10, "#555555"),                          // the title and its line
    ...[0, 1, 2, 3, 4, 5].map((i) => rect(36, fy + i * 70, 10, 12, "#777777")),                     // the scale's numbers
    rect(fx + fw * 0.3, fy, fw * 0.4, fh * 0.2, "#7a4a2a"), rect(fx, fy + fh * 0.2, fw, fh * 0.45, "#c0304a"),          // head, coat, arms
    rect(fx + fw * 0.25, fy + fh * 0.65, fw * 0.5, fh * 0.35, "#38507a"),                           // legs
    rect(fx + fw * 0.3, fy + fh + 14, fw * 0.4, 14, "#666666"),                                     // its label, "FRONT"
    ...[1, 2, 3].map((i) => rect(fx + i * 340, fy, fw, fh, "#a03040")),                             // three-quarter, profile, back
    rect(60, fy + fh + 120, 1200, 200, "#d0a080"),                                                   // the next row
  ].map((p) => ({ ...p, left: Math.round(p.left), top: Math.round(p.top), input: { create: { ...p.input.create, width: Math.round(p.input.create.width), height: Math.round(p.input.create.height) } } }));
  await sharp({ create: { width: w, height: h, channels: 3, background: "#efe8d8" } }).composite(parts).webp({ quality: 95 }).toFile(file);
}
// the box is the figure with a few pixels of paper round it
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (!fn()) { if (Date.now() > end) throw new Error("timed out"); await new Promise((r) => setTimeout(r, 50)); } };
const near = (box, want, tol = 9) => box && box.every((v, i) => Math.abs(v - want[i]) <= tol);

test("the Front figure is the turnaround's leftmost figure, head to feet, never the title, the scale's numbers or its label", { skip }, async () => {
  const f = join(T, "a.webp");
  await sheet(f);
  const box = await frontBoxOf(f, { sharp });
  assert.ok(near(box, [120, 130, 170, 490]), JSON.stringify(box));
  const g = join(T, "b.webp");
  await sheet(g, { w: 1400, h: 1750, at: [95, 112], fig: [176, 420] });          // another size, another place
  assert.ok(near(await frontBoxOf(g, { sharp }), [95, 112, 176, 420]));
});

test("GET /api/characters: media.frontBox in the sheet of the character's own hand, kept with it and measured again when the sheet changes", { skip }, async () => {
  const d = join(kit.humanDir(), "gran");
  mkdirSync(join(d, "module"), { recursive: true });
  writeFileSync(join(d, "character.json"), JSON.stringify({ id: "gran", name: "Gran", about: "a person", credit: {}, hands: ["storybook", "marker"] }));
  await sheet(join(d, "sheet-marker.webp"), { at: [200, 140] });
  await sheet(join(d, "sheet-storybook.webp"));
  const sheets = [["sheetMarker", "sheet-marker.webp"], ["sheetStorybook", "sheet-storybook.webp"]];
  assert.deepEqual(kit.apiCharacters().characters.find((c) => c.id === "gran").media.frontBox, null, "not measured yet: the read asks for it");
  await until(() => kit.apiCharacters().characters.find((c) => c.id === "gran").media.frontBoxes.sheetStorybook);          // measured in the background
  assert.ok(existsSync(join(d, "front.json")));
  const m = kit.apiCharacters().characters.find((c) => c.id === "gran").media;
  assert.equal(m.frontBox.sheet, "sheetStorybook", "its own hand's sheet first");
  assert.ok(near(m.frontBox.box, [120, 130, 170, 490]));
  assert.ok(near(m.frontBoxes.sheetMarker, [200, 140, 170, 490]));
  // the marker sheet drawn again elsewhere: its old box is not given, and the next fill measures it
  await sheet(join(d, "sheet-marker.webp"), { at: [300, 150] });
  assert.equal(kit.apiCharacters().characters.find((c) => c.id === "gran").media.frontBoxes.sheetMarker, undefined, "a box of the old drawing is never given");
  await until(() => kit.apiCharacters().characters.find((c) => c.id === "gran").media.frontBoxes.sheetMarker);
  assert.deepEqual(await fillFrontBoxes(d, sheets, { sharp }), [], "nothing left to measure");
  assert.ok(near(JSON.parse(readFileSync(join(d, "front.json"), "utf8")).sheetMarker.box, [300, 150, 170, 490]));
  // a character without a sheet (the author's Bit and cheetah) has none
  const b = join(kit.humanDir(), "bot");
  mkdirSync(b, { recursive: true });
  writeFileSync(join(b, "character.json"), JSON.stringify({ id: "bot", name: "Bot", rig: "bot", kind: "robot", credit: {} }));
  assert.deepEqual(kit.apiCharacters().characters.find((c) => c.id === "bot").media.frontBox, null);
});

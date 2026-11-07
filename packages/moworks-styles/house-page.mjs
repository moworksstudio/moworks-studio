// The house heroes outside a film (owner #1287-#1293: MW Character Sheet v1): the hero a film style's source skill draws itself (Stickman Explainer's
// hoodie hero, Inner Voice Short's hero and its shadow, the 2D Explainer's kid), shipped in the Character library as the app's, with no Characters-page
// way of their own (the owner named none). A hero is one small file, CHARACTER = { id, name, about, heightM, engine, opts } (opts: the source
// skill's own drawing options, e.g. an outfit); house/harness.js draws its sheet, its life clip and its gate's checks with house/<engine>.js on the
// source skill's own code as pinned, in the app's own headless browser (ricks-page.mjs launch: hidden, port 0, only its own process stopped).
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { APP_ROOT, loadPins } from "../version-manager/index.mjs";
import { launch } from "./ricks-page.mjs";
import { hookHero } from "./house/explainer-2d-hooks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The house engines and the source skill's code each draws with. */
export const HOUSE_ENGINES = Object.freeze({
  "stickman-explainer": { source: "story", kit: "src/stickman/kit.js" },
  "inner-voice-short": { source: "story", kit: "src/inner-voice/kit.js" },
  // the kid's house-hero.js runs with the app's hooks spliced into the copy in memory (house/explainer-2d-hooks.mjs); the file stays as pinned
  "explainer-2d": { source: "explainer-2d", scripts: ["engine/ex-core.js", "engine/house-pal.js", "engine/house-hero.js"], hook: { "engine/house-hero.js": hookHero } },
});
export const LIFE_FRAMES = 180;
/** What a house hero's drawing really drives in a film (MW Character Sheet v1), kept in its character.json as `can`. */
export const HOUSE_CAN = Object.freeze({
  "stickman-explainer": Object.freeze({
  views: ["front", "three-quarter", "profile", "back"], viewNotes: "figure()'s face.look (0, 0.5, 1) and flip; back: face eyes and mouth \"none\"",
  faces: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"], faceNotes: "the kit's own eyes (dot, wide, smug, happy, closed), brows and mouths (smile, smirk, grin, flat, o, chatter)",
  poses: ["stand", "walk", "point", "wave", "reach", "sit"], poseNotes: "figure()'s pose: STAND, walk(phase), arm and leg angles, armIK; sit is the legs bent over a stool",
  hands: "n/a: round ends (robotHand for close-ups)", walk: "walk(phi, stride)", talk: "the mouth o and flat by turns (the kit's chatter for nerves); no lip sync",
}),
  "inner-voice-short": Object.freeze({
  views: ["front", "three-quarter", "profile", "back"], viewNotes: "the hero: its face's turn slides the features; back: no face. The shadow: a silhouette, its eyes look the way it turns",
  faces: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"], faceNotes: "the hero: the kit's eyes, brows and mouths. The shadow: the kit's slits and smile; the other faces are the app's, in its red line",
  poses: ["stand", "walk", "point", "wave", "reach", "sit"], poseNotes: "hands and feet as targets of the kit's two-bone limbs (arms, legs / feet); the walk is the app's cycle of those targets",
  hands: "n/a: round hands", walk: "the app's foot and hand cycle (the kit has no walk of its own)", talk: "the mouth o and line by turns; no lip sync",
}),
  "explainer-2d": Object.freeze({
  views: ["front", "three-quarter", "profile", "back"], viewNotes: "the kit's front, back and profile (faces left); three-quarter is the front with its own head turn (headTurn), the body narrowed by the app",
  faces: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"], faceNotes: "the kit's mouth (-1..1), worry and blink; laugh, surprised, angry and talk add the app's hooks to its own brows and mouth (brow lift, inner brow press, mouth opening)",
  poses: ["stand", "walk", "point", "wave", "reach", "sit"], poseNotes: "the kit's own sleeves and legs cut at the elbow and knee and turned by the app about the shoulder, elbow, hip and knee: point, wave, reach in front; walk and sit in profile (sit on a plain stool the app paints)",
  hands: "n/a: the kit's one relaxed hand", walk: "the app's cycle of the kit's profile legs (thigh and shin turned; the kit has no walk of its own)", talk: "the mouth opens and closes by turns; no lip sync",
}),
});
export const canOf = async (engine) => HOUSE_CAN[engine] ?? null;

const skillDir = (source, root) => { const p = loadPins(root).moworksStyles; return join(String(p.root).replace("{app}", root), p.sources[source].dir); };

/** The page script: the harness, the engine's drawer, the source skill's kit and the hero's file. */
export async function houseBundle(file, { root = APP_ROOT } = {}) {
  const text = readFileSync(file, "utf8"), engine = /\bengine\s*:\s*["']([a-z0-9-]+)["']/.exec(text)?.[1];
  const e = HOUSE_ENGINES[engine];
  if (!e) throw Object.assign(new Error(`${basename(file)}: its engine is none of ${Object.keys(HOUSE_ENGINES).join(", ")}`), { code: "INVALID" });
  const dir = skillDir(e.source, root);
  const plugin = { name: "mw-house", setup(b) {
    b.onResolve({ filter: /^mw-house-drawer$/ }, () => ({ path: join(HERE, "house", `${engine}.js`) }));
    b.onResolve({ filter: /^mw-house-character$/ }, () => ({ path: file }));
    if (e.kit) b.onResolve({ filter: /^mw-house-kit$/ }, () => ({ path: join(dir, ...e.kit.split("/")) }));
  } };
  const r = await build({ entryPoints: [join(HERE, "house", "harness.js")], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent", plugins: [plugin] });
  // a classic-script engine (the 2D Explainer's) runs first, as its page loads it
  const scripts = (e.scripts ?? []).map((s) => { const t = readFileSync(join(dir, ...s.split("/")), "utf8"); return e.hook?.[s] ? e.hook[s](t) : t; }).join("\n;\n");
  return { engine, js: `${scripts}\n;\n${r.outputFiles[0].text}` };
}
async function withHousePage(file, fn, { root = APP_ROOT } = {}) {
  const { js } = await houseBundle(file, { root }), b = await launch(root);
  try {
    await b.navigate("data:text/html,<!doctype html><html><body style=\"margin:0\"></body></html>");
    await b.evaluate(`${js}\n//# sourceURL=house-page.js`);
    if (await b.evaluate("typeof window.HOUSE?.hero?.init === 'function'")) await b.evaluate("window.HOUSE.hero.init()");
    return await fn(b);
  } finally { b.close(); }
}

/** The checks of one hero's file (the gate): { id, passed, failed, lines, record }. */
export async function checkCharacter(file, { root = APP_ROOT } = {}) {
  const src = readFileSync(file, "utf8"), want = basename(file).replace(/\.js$/, ""), lines = [];
  const ok = (c, t, why) => lines.push(c ? `PASS  ${t}` : `FAIL  ${t}${why ? `: ${why}` : ""}`);
  ok(/\bexport\s+const\s+CHARACTER\b/.test(src) && !/\bimport\b/.test(src), "one export, CHARACTER, and no import (options for the source skill's own drawing)");
  ok(!/\b(Math\.random|Date\.now|performance\.now|new Date)\b/.test(src), "deterministic: no random numbers, no clock");
  ok(!/\b(fillText|strokeText|fetch)\b/.test(src), "no words, nothing loaded");
  let record = null;
  try {
    await withHousePage(file, async (b) => {
      record = await b.evaluate("HH.record()");
      ok(record.id === want, `the character's id is its file's name (${want})`, `id ${record.id}`);
      lines.push(...(await b.evaluate("HH.check()")));
    }, { root });
  } catch (e) { lines.push(`FAIL  the checks ran: ${String(e?.message ?? e).split("\n")[0]}`); }
  const failed = lines.filter((l) => l.startsWith("FAIL")).length;
  return { id: want, passed: lines.length - failed, failed, lines, record };
}
/** The model sheet as a PNG file. */
export async function drawSheet(file, out, { root = APP_ROOT } = {}) {
  await withHousePage(file, async (b) => { const url = await b.evaluate("HH.sheet()"); writeFileSync(out, Buffer.from(url.split(",")[1], "base64")); }, { root });
  return out;
}
/** The life clip's frames (frame-0000.jpg …, 6 s at 30 fps) in dir. */
export async function drawLife(file, dir, { root = APP_ROOT, frames = LIFE_FRAMES } = {}) {
  await withHousePage(file, async (b) => {
    for (let f = 0; f < frames; f++) { const url = await b.evaluate(`HH.lifeFrame(${f})`); writeFileSync(join(dir, `frame-${String(f).padStart(4, "0")}.jpg`), Buffer.from(url.split(",")[1], "base64")); }
  }, { root });
  return dir;
}

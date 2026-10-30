// Test 26's small fixes: the Tech checks rows say what the Render panel says for the app's own checks (T26-8: "Something here may look
// wrong" three times), a square style preview is shown whole like a vertical one (T26-1: the hoop lost its top and bottom), and New
// project takes a style's own size when it is picked (T26-2: Hand embroidery, drawn at 1080 × 1080, stayed 1920 × 1080). Run: npm test
import { join } from "node:path";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const T = mkdtempSync(join(tmpdir(), "mw-t26-"));
after(() => rmSync(T, { recursive: true, force: true }));
const store = new Map();
globalThis.location ??= { hash: "", href: "http://127.0.0.1/", origin: "http://127.0.0.1", search: "" };
globalThis.localStorage ??= { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.innerWidth ??= 1600;
globalThis.document ??= { documentElement: { dataset: {}, style: {}, setAttribute() {} }, addEventListener() {}, removeEventListener() {}, getElementById: () => null, hidden: false };
const vite = await createServer({ configFile: join(import.meta.dirname, "..", "ui", "vite.config.js"), server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent",
  optimizeDeps: { noDiscovery: true } });
after(() => vite.close());
const load = (p) => vite.ssrLoadModule(p);

test("T26-8: a Tech checks row of the app's own check says what Render says, its shot once; HyperFrames' own wording and file paths stay out", async () => {
  const { say } = await load("/src/screens/Qa.jsx");
  const sfx = { severity: "warning", code: "action_without_sound", shot: 4, time: 11.45,
    message: "Shot 4 at 11.45 s: \"Chỉ giật lại\" (a motion) has no sound (the app's would be \"thread tug\"); place the sound effects again in the Final Mix, or name its sound" };
  assert.equal(say(sfx, { id: "G-SFX" }), "At 11.45 s: \"Chỉ giật lại\" (a motion) has no sound (the app's would be \"thread tug\"); place the sound effects again in the Final Mix, or name its sound");
  const vague = "Something here may look wrong. Fix with Claude, or look at the shot.";
  assert.equal(say({ code: "x", message: "overflow at #s2-title .line" }, { id: "G-HF-LAYOUT" }), vague, "HyperFrames' own wording stays for Claude");
  assert.equal(say({ message: "compositions/s2.html: a sound is missing" }, { id: "G-VOICE" }), vague, "never a file path on screen");
  assert.equal(say({ plain: "At 0:36.4: words are cut.", message: "raw" }, { id: "G-SFX" }), "At 0:36.4: words are cut.", "the server's plain sentence first");
  // the Render panel says the same finding with the same words (its findingText reads message first)
  assert.match(readFileSync(join(import.meta.dirname, "..", "ui", "src", "workflow", "RenderSheet.jsx"), "utf8"), /const findingText = \(f\) => f\.message \?\? f\.reason/);
});

test("T26-1: a square preview is marked square and shown whole, like a vertical one; a wide one is left as it is", async () => {
  const { isSquare, isTall, markTall } = await load("/src/screens/StyleGallery.jsx");
  assert.equal(isSquare(640, 640), true, "Hand embroidery's 640 × 640");
  assert.equal(isSquare(1440, 1080), true, "4:3 is too narrow for a 16:9 frame");
  assert.equal(isSquare(1920, 1080), false);
  assert.equal(isSquare(960, 1706), false, "tall, not square");
  assert.equal(isTall(1000, 1050), false, "near square stays out of tall (T23-9)");
  const el = (w, h) => { const on = new Set(["tall", "square"]); return { naturalWidth: w, naturalHeight: h, on, classList: { toggle: (k, v) => (v ? on.add(k) : on.delete(k)) } }; };
  const sq = el(640, 640); markTall(sq); assert.deepEqual([...sq.on], ["square"]);
  const wide = el(1920, 1080); markTall(wide); assert.deepEqual([...wide.on], [], "toggled off for a wide one");
  const css = (f) => readFileSync(join(import.meta.dirname, "..", "ui", "src", f), "utf8");
  assert.match(css("app.css"), /\.sgb-card \.shot img:is\(\.tall, \.square\), \.sgb-big :is\(img, video\):is\(\.tall, \.square\) \{ object-fit: contain; \}/);
  assert.match(css("studio-shell.css"), /\.st-sleeve img:is\(\.tall, \.square\) \{ object-fit: contain; \}/);
  assert.match(css("workflow.css"), /\.np-style img\.sf:is\(\.tall, \.square\) \{ object-fit: contain; \}/);
});

test("T26-2: an anidoodle medium's own frame is its size; New project sets Size to it unless Size was set by hand", async () => {
  const { aniSize, styleFormat } = await import("../packages/style-catalog/index.mjs");
  const dir = join(T, "ani"); mkdirSync(join(dir, "engine", "src"), { recursive: true });
  const mod = (name, text) => { writeFileSync(join(dir, "engine", "src", `${name}.ts`), text); return `engine/src/${name}.ts`; };
  assert.deepEqual(aniSize(dir, mod("hoop", "const W = 1080, H = 1080, N = 540, HOLD = 30;\n")), [1080, 1080]);
  assert.equal(aniSize(dir, mod("none", "export const draw = () => {};\n")), null);
  assert.equal(aniSize(dir, mod("huge", "const W = 3200, H = 4420;\n")), null, "a sheet bigger than the app makes");
  assert.equal(aniSize(dir, "engine/src/missing.ts"), null);
  const { anidoodleSource } = await import("../packages/anidoodle-styles/index.mjs");
  const src = anidoodleSource();
  if (src?.intact) assert.deepEqual(aniSize(src.skillDir, "engine/src/canvas-core/embroidery.ts"), [1080, 1080], "the pinned clone's Hand embroidery");
  const emb = { id: "anidoodle-embroidery", anidoodle: { id: "embroidery", size: [1080, 1080] } };
  const f = styleFormat(emb);
  assert.deepEqual(f.sizes.author, [1080, 1080]);
  assert.deepEqual(f.sizes.presets[0], { w: 1080, h: 1080, label: "1:1", own: true }, "the author's size first");
  assert.equal(styleFormat({ id: "general" }).sizes.author, undefined);
  const { formatRule, sizeForStyle } = await load("/src/workflow/NewProjectDialog.jsx");
  const rule = formatRule({ id: "anidoodle-embroidery", author: "alexgreensh", format: f });
  assert.deepEqual(rule.ownSize, [1080, 1080]);
  const blank = { width: 1920, height: 1080 };
  assert.deepEqual(sizeForStyle(blank, rule, true), { width: 1080, height: 1080, sizeByStyle: true }, "picked: its own size");
  assert.deepEqual(sizeForStyle({ ...blank, sizeByHand: true }, rule, true), {}, "Size set by hand stays");
  assert.deepEqual(sizeForStyle(blank, rule, false), {}, "the same style again (a draft): nothing moves");
  const general = formatRule({ id: "general", author: "heygen", format: styleFormat({ id: "general" }) });
  assert.deepEqual(sizeForStyle({ width: 1080, height: 1080, sizeByStyle: true }, general, true), { width: 1920, height: 1080, sizeByStyle: false }, "a size a style gave goes with it");
  assert.deepEqual(sizeForStyle({ width: 1080, height: 1080, sizeByHand: true }, general, true), {}, "a size set by hand stays");
});

// Test 24's screen bugs, rendered through Vite as ui-render.test.mjs does (effects do not run, so nothing is fetched). Run:
// node --test test/t24-ui.test.mjs
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

const store = new Map();
globalThis.location ??= { hash: "", href: "http://127.0.0.1/", origin: "http://127.0.0.1", search: "" };
globalThis.localStorage ??= { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.innerWidth ??= 1600;
globalThis.document ??= { documentElement: { dataset: {}, style: {}, setAttribute() {} }, addEventListener() {}, removeEventListener() {}, getElementById: () => null, hidden: false };

const UI = join(import.meta.dirname, "..", "ui");
const vite = await createServer({ configFile: join(UI, "vite.config.js"), server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent",
  optimizeDeps: { noDiscovery: true } });
after(() => vite.close());
const load = (p) => vite.ssrLoadModule(p).then((m) => m.default ?? m);
async function wrap(el) {
  const { LangProvider } = await vite.ssrLoadModule("/src/i18n.jsx");
  const { ToastProvider } = await vite.ssrLoadModule("/src/lib.jsx");
  return h(LangProvider, null, h(ToastProvider, { render: () => null }, el));
}

test("T24-6: the Motion Plan dialog says it is loading, never \"Not approved · 0 planned motions\" before the plan is read", async () => {
  const MotionPlan = await load("/src/screens/MotionPlan.jsx");
  const html = renderToString(await wrap(h(MotionPlan, { id: "abc123" })));
  assert.match(html, /Loading the Motion Plan…/);
  assert.doesNotMatch(html, /0 planned motions|Not approved/);
  // it reads the plan again when the Motion Plan step changes, not only when Claude was seen stopping; a read that fails is said and
  // asked again
  const src = readFileSync(join(UI, "src", "screens", "MotionPlan.jsx"), "utf8");
  assert.match(src, /useClaudeDone\(id, reloadAll, \(p\) => \{ const s = p\.steps\?\.find\(\(x\) => x\.id === "motionSpec"\)/);
  assert.match(src, /The Motion Plan could not be loaded: \{why\}/);
  const stage = readFileSync(join(UI, "src", "workflow", "stage.jsx"), "utf8");
  assert.match(stage, /key != null && prevKey != null && key !== prevKey/);
});

test("T22-3: the Voice screen keeps the voice the user chose when the source card switches and comes back", async () => {
  const { pickVoice, chosenOf } = await vite.ssrLoadModule("/src/screens/Voice.jsx");
  const el = [{ id: "minh", name: "Minh Trung" }, { id: "ngoc", name: "Thanh Ngọc" }, { id: "anh", name: "Anh" }];
  // first open: the first usable voice ("Minh Trung"), or the film's own voice from this service
  assert.equal(pickVoice(el, "elevenlabs", null, chosenOf("p1")), "minh");
  assert.equal(pickVoice(el, "elevenlabs", { source: "elevenlabs", voiceId: "anh" }, chosenOf("p1")), "anh");
  // the user picks Thanh Ngọc, switches to another card and back: Thanh Ngọc, not Minh Trung, over the film's older voice too
  const kept = chosenOf("p2");
  kept.last = "ngoc"; kept.elevenlabs = { voiceId: "ngoc", model: "eleven_v4" };
  assert.equal(pickVoice(el, "elevenlabs", { source: "elevenlabs", voiceId: "anh" }, kept), "ngoc");
  // another service does not list that voice: its own last choice, else its default
  const fish = [{ id: "f1" }, { id: "f2" }];
  assert.equal(pickVoice(fish, "fishaudio", null, kept), "f1");
  kept.fishaudio = { voiceId: "f2" };
  assert.equal(pickVoice(fish, "fishaudio", null, kept), "f2");
  assert.equal(pickVoice(el, "elevenlabs", null, kept), "ngoc", "and back on ElevenLabs, the voice chosen there");
  assert.notEqual(chosenOf("p1"), chosenOf("p2"), "kept per film");
});

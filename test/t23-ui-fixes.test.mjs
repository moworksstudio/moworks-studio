// Test 23's UI fixes: the Shots list holds only shots (the captions and a closing card over the last shots are layers), the gallery's
// Social and Story cards say their type and keep a vertical demo whole, the user's own chat words are not read as markdown, and
// New project's Length, typed as in After Effects, goes back to the last length when what was typed is not digits and separators.
import { join } from "node:path";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { placedShots, readShots } from "../packages/hf-edit/shots.mjs";
import { listAssets } from "../packages/project-service/assets.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-t23-"));
after(() => rmSync(T, { recursive: true, force: true }));
const put = (d, rel, text) => { const f = join(d, ...rel.split("/")); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };

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
async function render(el) {
  const { LangProvider } = await load("/src/i18n.jsx");
  const { ToastProvider } = await load("/src/lib.jsx");
  return renderToString(h(LangProvider, null, h(ToastProvider, { render: () => null }, el)));
}
const noop = () => {};

test("T23-4: the film's captions and a closing card over the last shots are layers, not shots (25 shots of 23)", async () => {
  const d = join(T, "vertical");
  const shot = (n, start, dur) => `<div id="f${n}" class="shot" data-composition-id="f${n}" data-composition-src="compositions/f${n}.html" data-start="${start}" data-duration="${dur}" data-track-index="1" data-track-kind="graphics"></div>`;
  put(d, "index.html", ['<div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1080" data-height="1920">',
    // the captions first in the page: by place they were frame 1's scene
    '<div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="9" data-track-index="2" data-track-kind="captions"></div>',
    shot(1, 0, 4), shot(2, 4, 4), shot(3, 8, 4),
    '<div id="closing" data-composition-id="closing" data-composition-src="compositions/closing.html" data-start="7" data-duration="5" data-track-index="3" data-track-kind="graphics"></div>',
    "</div>"].join("\n"));
  put(d, "STORYBOARD.md", [1, 2, 3].map((n) => `## Frame ${n} — Shot ${n}\n- duration: 4s\n`).join("\n"));
  const { shots, layers, root } = await readShots(d);
  assert.deepEqual(shots.map((s) => [s.number, s.title, s.start, s.mountId]), [[1, "Shot 1", 0, "f1"], [2, "Shot 2", 4, "f2"], [3, "Shot 3", 8, "f3"]]);
  assert.deepEqual(layers.map((l) => [l.mountId, l.kind, l.layer]), [["captions", "captions", true], ["closing", "graphics", true]]);
  assert.deepEqual(placedShots(shots, root.duration).map((s) => s.number), [1, 2, 3], "the timeline's SHOTS lane");
  // a legacy captions host (no data-track-kind, composition id "captions") is HyperFrames' captions track too
  put(d, "index.html", ['<div id="root" data-composition-id="main" data-start="0" data-duration="8" data-width="1080" data-height="1920">', shot(1, 0, 4), shot(2, 4, 4),
    '<div id="subs" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="8" data-track-index="2"></div>', "</div>"].join("\n"));
  put(d, "STORYBOARD.md", [1, 2].map((n) => `## Frame ${n} — Shot ${n}\n- duration: 4s\n`).join("\n"));
  assert.deepEqual((await readShots(d)).shots.map((s) => s.mountId), ["f1", "f2"]);
  // a scene the storyboard does not name on the shots' own track stays a shot ("Built, not in the storyboard")
  put(d, "index.html", ['<div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1080" data-height="1920">', shot(1, 0, 4), shot(2, 4, 4),
    '<div id="end" data-composition-id="end" data-composition-src="compositions/end.html" data-start="8" data-duration="4" data-track-index="1"></div>', "</div>"].join("\n"));
  const r = await readShots(d);
  assert.deepEqual(r.shots.map((s) => [s.mountId, s.notInStoryboard ?? false]), [["f1", false], ["f2", false], ["end", true]]);
  assert.deepEqual(r.layers, []);
});

test("T23-4: a layer's files are in the shots it lies over in the Assets tab (never a file path)", async () => {
  const d = join(T, "assets");
  put(d, "index.html", "<div></div>");
  put(d, "compositions/closing.html", '<img src="../assets/1_design/images/logo.png">');
  put(d, "assets/1_design/images/logo.png", "x");
  const shots = [1, 2, 3].map((n) => ({ index: n, number: n, start: (n - 1) * 4, duration: 4, src: `compositions/f${n}.html` }));
  const closing = { index: null, number: null, layer: true, notInStoryboard: true, start: 7, duration: 5, src: "compositions/closing.html" };
  const logo = listAssets(d, { shots, layers: [closing], meta: { targetDurationSec: 12 }, remember: false }).items.find((x) => x.name === "logo.png");
  assert.deepEqual(logo.usedIn, [2, 3]);
});

test("T23-9: the Social and Story cards say their type; a vertical demo is marked tall and shown whole", async () => {
  const { catOf, isTall, StyleTile } = await load("/src/screens/StyleGallery.jsx");
  const t = (x) => x;
  assert.equal(catOf(t, { title: "Vertical and social clips (9:16)", category: "Social" }), "Social");
  assert.equal(catOf(t, { title: "Characters, mascots and story shorts", category: "Story" }), "Story");
  assert.equal(catOf(t, { title: "Explainers, tutorials and \"how it works\"", category: "Explainer" }), "Explainer");
  assert.equal(catOf(t, { title: "Motion Graphics", category: "Motion graphics" }), "", "a name that is its category says it once");
  const html = await render(h(StyleTile, { s: { id: "hf-vertical", title: "Vertical and social clips (9:16)", category: "Social", author: "heygen", preview: { image: "/styles/hf-vertical.jpg" } },
    author: { id: "heygen", name: "HyperFrames" }, on: false, onPick: noop }));
  assert.match(html, /class="cat"[^>]*>Social</);
  assert.equal(isTall(960, 1706), true, "the 9:16 style's demo");
  assert.equal(isTall(960, 540), false);
  assert.equal(isTall(1000, 1050), false, "near square stays as it is");
});

test("T23-10: the user's own chat message is plain text with its line breaks, never a renumbered list", async () => {
  const { TaskBlock, UserWords } = await load("/src/editor/ClaudePanel.jsx");
  const text = "1. Giọng ấm, chậm\n\nĐoạn giữa.\n2. Phụ đề ở đáy";
  const task = { id: "t1", status: "done", createdAt: "2026-10-30T02:00:00.000Z", events: [], text };
  const html = await render(h("ol", null, h(TaskBlock, { t: task, projectId: "p1", toast: noop, onChanged: noop, onRetry: noop, steps: [] })));
  const msg = html.match(/<div class="msg user">(.*?)<\/div><\/div>/s)?.[1] ?? "";
  assert.match(msg, /class="msg-plain">1\. Giọng ấm, chậm\n\nĐoạn giữa\.\n2\. Phụ đề ở đáy</);
  assert.doesNotMatch(msg, /<ol|<li/);
  assert.match(await render(h(UserWords, { text: "**not bold**" })), />\*\*not bold\*\*</);
});

test("T23-12: Length is typed as in After Effects; what is not digits and separators, or nothing, goes back to the last length on leaving the field", async () => {
  const { fromTimecode, leaveLength, toTimecode } = await load("/src/workflow/NewProjectDialog.jsx");
  // digits alone fill the timecode from the right, three parts are m:ss:ff, one separator is m:ss, values over their range carry;
  // the parts split by ":", "." or ";" (drop-frame), as After Effects takes them
  const ok = { "1500": 15, "90": 3, "130000": 780, "0:00:15:00": 15, "0:01:30:15": 90.5, "0:15:00": 15, "1:30:15": 90.5, "1:30": 90, "0:15": 15,
    "0:00:15:30": 16, "1:75": 135, "0:00:00:45": 1.5, "0;00;15;00": 15, "0.00.15.00": 15, "1;30": 90, "1.30": 90, "0:01;30.15": 90.5 };
  for (const [x, s] of Object.entries(ok)) assert.equal(fromTimecode(x, 30), s, x);
  for (const x of ["0:00:15:00a12000", "", "  ", "1:2:3:4:5", "abc", ":30", "1:", "1:.30", "-5", "90 s", "1,30", "0:00:15:00 a"]) assert.equal(fromTimecode(x, 30), null, x);
  assert.equal(fromTimecode("0:00:15:24", 25), 15.96);
  assert.equal(toTimecode(fromTimecode("1500", 30), 30), "0:00:15:00");
  assert.equal(toTimecode(fromTimecode("1:20", 30), 30), "0:01:20:00");
  assert.deepEqual(leaveLength("0:00:15:00a12000", "0:00:15:00", 30), { value: "0:00:15:00", reverted: true });
  assert.deepEqual(leaveLength("1:20", "0:00:15:00", 30), { value: "0:01:20:00", reverted: false });
  assert.deepEqual(leaveLength("", "0:01:00:00", 30), { value: "0:01:00:00", reverted: true });
});

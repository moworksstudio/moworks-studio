// AE export. The recording tests need the pinned Python + Chromium, not After Effects. The full export (AE builds the
// .aep, check frames against HF's own stills) runs only with MW_TEST_AE=1 and After Effects open with no dialog.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { aeExport, aeRunning, canvasCount, checkPython, checkTimes, plainLog, pythonExe, recordRate } from "../packages/ae-export/index.mjs";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

const G = join(import.meta.dirname, "golden");
const OUT = join(import.meta.dirname, "..", "test-output", "ae-test");

test("record rate: a multiple of the film rate, near 120 a second", () => {
  assert.deepEqual(recordRate({ num: 25, den: 1 }), { num: 125, den: 1 });
  assert.deepEqual(recordRate({ num: 30, den: 1 }), { num: 120, den: 1 });
  assert.deepEqual(recordRate({ num: 24, den: 1 }), { num: 120, den: 1 });
  assert.deepEqual(recordRate({ num: 60, den: 1 }), { num: 120, den: 1 });
  assert.deepEqual(recordRate({ num: 30000, den: 1001 }), { num: 120000, den: 1001 });
});

test("check times sit on a frame of the film rate", () => {
  assert.deepEqual(checkTimes(17, "auto", { num: 25, den: 1 }), [4.24, 8.52, 14.44]);
  assert.deepEqual(checkTimes(17, "auto", { num: 60, den: 1 }), [4.25, 8.5, 14.45]);
  for (const t of checkTimes(17, "auto", { num: 30000, den: 1001 })) assert.ok(Math.abs(t * 30000 / 1001 - Math.round(t * 30000 / 1001)) < 0.01);
  assert.deepEqual(checkTimes(17, ""), []);
});

test("pinned Python has the port's modules", () => {
  const r = checkPython();
  assert.ok(r.ok, r.message);
});

test("HF-native film: one AE comp per HF sub-composition (was 1 comp, blocks blank)", async () => {
  const r = await aeExport(join(G, "hf-native-final"), { fps: 25, estimateOnly: true });
  assert.equal(r.status, "estimate", r.message);
  assert.equal(r.estimate.comps, 4);                        // main + scene1 (code-slice-hero) + scene2 (apple-money-count) + scene3 (vi-end)
  assert.ok(r.estimate.layers >= 100, `layers ${r.estimate.layers}`);
  assert.ok(r.estimate.most.some(([who]) => who === "moneyBurst"), "the registry block's layers are recorded");
});

test("kit-structured film still ports as before (5 comps, 25 layers)", async () => {
  const r = await aeExport(join(G, "bench"), { fps: 60, estimateOnly: true });
  assert.equal(r.status, "estimate", r.message);
  assert.equal(r.estimate.comps, 5);
  assert.equal(r.estimate.layers, 25);
});

test("full export into After Effects at 25 fps matches HF's stills", { skip: process.env.MW_TEST_AE !== "1" || !aeRunning() ? "needs MW_TEST_AE=1 and After Effects open" : false }, async () => {
  const out = join(OUT, "hf-native-final-25");
  rmSync(out, { recursive: true, force: true });
  const r = await aeExport(join(G, "hf-native-final"), { fps: 25, outDir: out });
  assert.equal(r.status, "done", `${r.code}: ${r.message}`);
  assert.ok(existsSync(r.aep));
  assert.equal(r.checks.length, 3);
  for (const c of r.checks) assert.ok(c.diff < 0.03, `check ${c.t} s: ${c.diff}`);
});

// A film drawn on one <canvas class="clip" data-start> was an empty scene comp ("0 layers" in green),
// recorded for 63 minutes and gave AE no picture. Small films written here: one canvas only, and a canvas under a title and a box.
const film = (name, extra = "", script = "") => {
  const d = join(OUT, "..", "ae-canvas", name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(join(d, "assets", "vendor"), { recursive: true });
  for (const f of ["gsap.min.js", "hyperframe.runtime.iife.js"]) copyFileSync(join(G, "hf-native-final", "assets", "vendor", f), join(d, "assets", "vendor", f));
  writeFileSync(join(d, "index.html"), `<!doctype html><html><head><meta charset="UTF-8" />
<script src="assets/vendor/gsap.min.js"></script><script src="assets/vendor/hyperframe.runtime.iife.js"></script>
<style>body { margin: 0; } #root { position: relative; width: 320px; height: 180px; overflow: hidden; } #board { position: absolute; inset: 0; }</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="2" data-width="320" data-height="180" data-fps="25">
  <canvas id="board" class="clip" data-start="0" data-duration="2" data-track-index="1" width="320" height="180"></canvas>${extra}
</div>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true }), clock = { t: 0 }, g = document.getElementById("board").getContext("2d");
  tl.to(clock, { t: 2, duration: 2, ease: "none", onUpdate: () => { g.fillStyle = "#fff"; g.fillRect(0, 0, 320, 180); g.fillStyle = "#c00"; g.fillRect(0, 0, 160 * clock.t, 90); } }, 0);
  if (document.getElementById("box")) tl.to("#box", { x: 100, duration: 2, ease: "none" }, 0);${script}
  window.__timelines.main = tl;
</script></body></html>`);
  return d;
};
const MIXED = `
  <div id="title" style="position: absolute; left: 12px; top: 120px; font: 24px sans-serif; color: #111">Rain</div>
  <div id="box" style="position: absolute; left: 12px; top: 150px; width: 40px; height: 20px; background: #06c"></div>`;

test("the Log has no addresses: the film's page is named, a path keeps only its last name", () => {
  const B = String.fromCharCode(92), win = ["C:", "Work", "proj", "renders", "ae", "261027_t_1401"].join(B);
  assert.equal(plainLog(`HF 0.6.1 page http://localhost:57748/index.html; 25/1 fps; out ${win}`), "HF 0.6.1 page the film's page; 25/1 fps; out 261027_t_1401");
  assert.equal(plainLog(`  copied to ${win} (12 MB)`), "  copied to 261027_t_1401 (12 MB)");
  assert.equal(plainLog("  data: 1 comps -> C:/Work/proj/runtime/work/ae/x/build.jsx"), "  data: 1 comps -> build.jsx");
  assert.equal(plainLog("AE: ERROR at https://github.com/a/b"), "AE: ERROR at https://github.com/a/b", "a web link and 'AE:' stay");
});

test("a film drawn on one canvas: Check size says so (one video layer, about a minute), never '0 layers'", async () => {
  const d = film("ae-canvas-only");
  assert.equal(canvasCount(d), 1);
  const r = await aeExport(d, { fps: 25, estimateOnly: true });
  assert.equal(r.status, "estimate", r.message);
  assert.equal(r.estimate.kind, "canvas");
  assert.equal(r.estimate.minutes, 1);
  assert.deepEqual([r.estimate.canvas.count, r.estimate.canvas.area], [1, 1]);
  assert.equal(r.estimate.layers, 1, "the canvas is a layer of the main comp now, not an empty scene");
});

test("a canvas beside other layers is 'mostly-canvas': the canvas is recorded as a layer, the minutes count HF's seeks", async () => {
  const r = await aeExport(film("ae-canvas-mixed", MIXED), { fps: 25, estimateOnly: true });
  assert.equal(r.status, "estimate", r.message);
  assert.equal(r.estimate.kind, "mostly-canvas");
  assert.ok(r.estimate.layers >= 3, `layers ${r.estimate.layers}`);
  assert.equal(r.estimate.comps, 1, "no empty scene comp for the canvas");
  assert.ok(Number.isFinite(r.estimate.seekMs) && r.estimate.seekMs >= 0, JSON.stringify(r.estimate));
});

// In a real AE (Halftone Dossier, 10-39 % of pixels off) a film drawn as one SVG whose script moves its groups by their transform
// attribute was pictured with every group at the SVG's corner (the picture's "transform: none" reached inside the SVG)
// (a gradient fill, so the SVG is a picture and not a plain vector shape layer)
const MOVED_SVG = `
  <svg id="scene" viewBox="0 0 320 180" style="position: absolute; left: 0; top: 0; width: 320px; height: 180px"><defs><linearGradient id="gr"><stop offset="0" stop-color="#00c000" /><stop offset="1" stop-color="#00d000" /></linearGradient></defs><g id="mover" transform="translate(200 100)"><rect width="40" height="30" fill="url(#gr)" /></g></svg>`;
test("a film drawn as one SVG keeps its groups' transforms in its picture: the moved group is pictured where HF draws it (a gradient: not a plain vector)", async () => {
  const d = film("ae-canvas-svg", MOVED_SVG, `
  tl.to(clock, { duration: 2, onUpdate: () => document.getElementById("mover").setAttribute("transform", \`translate(\${200 + 20 * clock.t} 100)\`) }, 0);`);
  const r = await aeExport(d, { fps: 25, runAe: false, check: "" });
  assert.equal(r.status, "done", r.message);
  const work = join(APP_ROOT, "runtime", "work", "ae", "ae-canvas-svg"), data = JSON.parse(readFileSync(join(work, "port.json"), "utf8"));
  const L = data.comps.flatMap((c) => c.layers).find((x) => /^scene/.test(x.name));
  assert.ok(L?.src, `the SVG is a picture: ${JSON.stringify(data.comps[0].layers.map((x) => x.name))}`);
  const png = L.seq ? join(work, L.src, "f_00000.png") : join(work, L.src);
  // the green box's left edge in the picture (PIL in the pinned Python; a sequence pictures the frame inside a margin): 200 to 240 px, not 0
  const py = spawnSync(pythonExe(), ["-I", "-c", "import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert('RGBA');w,h=im.size;px=im.load();xs=[x for x in range(w) for y in range(0,h,4) if px[x,y][1]>150 and px[x,y][0]<80 and px[x,y][3]>200];print(min(xs) if xs else -1, w)", png], { encoding: "utf8", windowsHide: true });
  const [x0, w] = py.stdout.trim().split(" ").map(Number);
  const x = x0 - (w - 320) / 2;
  assert.ok(x >= 195 && x <= 245, `green box at ${x} px of the frame (${x0} of ${w}) ${py.stderr}`);
});

test("a canvas film is not recorded: its rendered film is one video layer (sound off) beside the audio layers; without it NEEDS_FILM", async () => {
  const d = film("ae-canvas-port");
  const none = await aeExport(d, { fps: 25, runAe: false, check: "" });
  assert.deepEqual([none.status, none.code, none.canvas], ["failed", "NEEDS_FILM", true], none.message);
  const mp4 = join(d, "film-render.mp4");
  writeFileSync(mp4, "not a real video: AE is not run here");
  const lines = [];
  const r = await aeExport(d, { fps: 25, runAe: false, check: "", film: mp4, onEvent: (e) => { if (e.type === "log") lines.push(e.line); } });
  assert.equal(r.status, "done", r.message);
  assert.equal(r.canvas, true);
  assert.ok(lines.some((l) => /canvas film: no recording/.test(l)), lines.join("\n"));
  assert.ok(!lines.some((l) => /sampled|recorded \d+ layers|keyframes:/.test(l)), "nothing recorded");
  const data = JSON.parse(readFileSync(join(APP_ROOT, "runtime", "work", "ae", "ae-canvas-port", "port.json"), "utf8"));
  assert.equal(data.comps.length, 1);
  assert.deepEqual(data.comps[0].layers.map((L) => [L.type, L.src, L.audioOff]), [["footage", "footage/film.mp4", true]]);
  assert.deepEqual([data.comps[0].w, data.comps[0].h, data.comps[0].dur], [320, 180, 2]);
  assert.ok(existsSync(join(APP_ROOT, "runtime", "work", "ae", "ae-canvas-port", "footage", "film.mp4")));
});

test("a film that makes its picture as it plays is 'dynamic': AE would get only what shows at 0 s, so it gets the rendered film", async () => {
  // no canvas here: boxes a script adds as the film plays (a What If film: React draws each scene), none of them in the page at 0 s
  const grow = `
  document.getElementById("board").remove();          // this film has no canvas
  const stage = document.getElementById("stage");
  tl.to(clock, { t: 2, duration: 2, ease: "none", onUpdate: () => { stage.innerHTML = "";
    for (let i = 0; i < Math.floor(clock.t * 6); i++) { const b = document.createElement("div"); b.style.cssText = "position: absolute; top: 20px; width: 16px; height: 16px; background: #c00; left: " + i * 20 + "px"; stage.appendChild(b); } } }, 0);`;
  const d = film("ae-dynamic", `
  <div id="stage" class="clip" data-start="0" data-duration="2" data-track-index="2" style="position: absolute; inset: 0"></div>`, grow);
  const r = await aeExport(d, { fps: 25, estimateOnly: true });
  assert.equal(r.status, "estimate", r.message);
  assert.equal(r.estimate.kind, "dynamic", JSON.stringify(r.estimate));
  assert.ok(r.estimate.later >= 6, `later ${r.estimate.later}`);
  assert.equal(r.estimate.minutes, 1, "not recorded");
});

// The mostly-canvas path in a real After Effects. The app's canvas films keep plain text in HTML over the
// canvas (the Build rule), so AE gets the title as a text layer, the box as a shape and the drawing as a picture sequence beside them
test("a canvas under a title and a box in After Effects: text and shape layers beside the drawing, frames match HF", { skip: process.env.MW_TEST_AE !== "1" || !aeRunning() ? "needs MW_TEST_AE=1 and After Effects open" : false }, async () => {
  const d = film("ae-canvas-mixed-ae", MIXED), out = join(OUT, "ae-canvas-mixed-ae");
  rmSync(out, { recursive: true, force: true });
  const r = await aeExport(d, { fps: 25, outDir: out });
  assert.equal(r.status, "done", `${r.code}: ${r.message}`);
  assert.ok(existsSync(r.aep));
  assert.ok(!r.canvas, "not a canvas film: its layers are recorded");
  const data = JSON.parse(readFileSync(join(APP_ROOT, "runtime", "work", "ae", "ae-canvas-mixed-ae", "port.json"), "utf8"));
  const layers = data.comps.flatMap((c) => c.layers);
  assert.ok(layers.some((L) => L.type === "text" && /Rain/.test(L.text?.s ?? "")), "the title is a text layer");
  assert.ok(layers.some((L) => L.type === "shape"), "the box is a shape layer");
  assert.ok(layers.some((L) => L.type === "footage" && L.seq), "the drawing is a picture sequence");
  for (const c of r.checks) assert.ok(c.diff < 0.06, `check ${c.t} s: ${c.diff}`);
});

// Text over a canvas film (moworks-studio §8): in a film drawn on a canvas, plain text goes in HTML over the canvas (After
// Effects gets editable text layers) and the style's performed text stays on the canvas as its author ships it.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-canvas-text-"));
const AE = join(T, "style-ae.json"), env = process.env.MW_STYLE_AE_FILE;
process.env.MW_STYLE_AE_FILE = AE;
writeFileSync(AE, JSON.stringify({ styles: { "test-canvas": { level: "video", kind: "canvas", measured: "2026-10-27", demo: "d", source: "x" },
  "test-layers": { level: "editable", kind: "layers", measured: "2026-10-27", demo: "d", source: "x" } } }));
after(() => { if (env === undefined) delete process.env.MW_STYLE_AE_FILE; else process.env.MW_STYLE_AE_FILE = env; rmSync(T, { recursive: true, force: true }); });

const { canvasFilm, canvasTextLine } = await import("../packages/agent/canvas-text.mjs");
const { systemPrompt } = await import("../packages/agent/index.mjs");

test("a canvas film is told to split its text in the Build, the Review and a chat change to the built film; no other step or film", () => {
  const canvas = { title: "demo-canvas", style: { id: "test-canvas", title: "Test canvas", source: "test" } };
  assert.equal(canvasFilm(canvas), "style", "its film style's AE badge is video");
  for (const step of ["build", "qcReview"]) assert.match(canvasTextLine(canvas, null, step), /Plain text \(titles, subtitles and captions.*HTML elements over the canvas.*Performed text.*stays on the canvas exactly as the author ships it/s);
  assert.match(canvasTextLine({ ...canvas, pipeline: { ran: { build: true } } }, null, null), /moworks-studio §8/, "a chat change to the built film");
  for (const step of ["brief", "storyboard", "motionSpec", "sound"]) assert.equal(canvasTextLine(canvas, null, step), "", step);
  assert.equal(canvasTextLine(canvas, null, null), "", "a chat before the Build");
  const layers = { title: "demo-layers", style: { id: "test-layers", title: "Test layers", source: "test" } };
  assert.equal(canvasTextLine(layers, null, "build"), "", "a film of layers");
  // a style not measured yet says "video, not checked" (e344905f): its films are read by their code, never taken as canvas films
  const unmeasured = { title: "demo-new", style: { id: "test-not-measured", title: "New", source: "test" } };
  assert.equal(canvasFilm(unmeasured), null);
  assert.equal(canvasTextLine(unmeasured, null, "build"), "");
  // a film whose own code draws on a canvas, in a style with no badge or a layers badge
  const dir = join(T, "film");
  mkdirSync(join(dir, "compositions"), { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-duration="4"></div>');
  writeFileSync(join(dir, "compositions", "s1.html"), '<div data-composition-id="s1"><p class="title">Hello</p></div>');
  assert.equal(canvasFilm(layers, dir), null);
  writeFileSync(join(dir, "compositions", "s2.html"), '<div data-composition-id="s2"><canvas id="c" width="1920" height="1080"></canvas><script>const g = c.getContext("2d");</script></div>');
  assert.equal(canvasFilm(layers, dir), "film");
  assert.match(canvasTextLine(layers, dir, "build"), /its code draws its picture on a canvas/);
  // the step's system prompt carries it
  const sys = (meta, step) => systemPrompt({ meta, rules: [], shots: [], dir: null, step });
  assert.match(sys(canvas, "build"), /This film draws on a canvas/);
  assert.doesNotMatch(sys(canvas, "storyboard"), /This film draws on a canvas/);
  assert.doesNotMatch(sys(layers, "build"), /This film draws on a canvas/);
});

test("the house rules and the Review carry the rule; the Review hunts plain text left on the canvas and performed text moved off it", () => {
  const house = readFileSync(new URL("../config/rules/moworks-studio/SKILL.md", import.meta.url), "utf8");
  assert.match(house, /## 8\. Text over a canvas film \(owner 27\/10\)/);
  assert.match(house, /\*\*Plain text goes in HTML over the canvas\*\*/);
  assert.match(house, /CSS overlay on top of it/);
  assert.match(house, /\*\*Performed text stays on the canvas exactly as the author ships it\*\*.*Whiteboard pen.*Brush's painted letters.*ASCII or CRT/s);
  const qc = readFileSync(new URL("../config/rules/moworks-qc/SKILL.md", import.meta.url), "utf8");
  assert.match(qc, /In a film drawn on a canvas \(moworks-studio §8\)/);
});

test("a canvas-style test film: its caption as HTML over the canvas reaches After Effects as a layer, its performed title stays on the canvas", async () => {
  const { codeDemoProject, aeLevel } = await import("../packages/style-ae/index.mjs");
  const { aeExport } = await import("../packages/ae-export/index.mjs");
  // the style's film: a board the pen writes the title on, stroke by stroke (performed: the style's own drawing), on the whole frame
  const main = `const g = document.getElementById("board").getContext("2d");
window.DUR = 2;
window.render = (t) => {
  g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, 320, 180);
  g.save(); g.beginPath(); g.rect(0, 0, 40 + 240 * Math.min(1, t), 180); g.clip();
  g.font = "bold 36px sans-serif"; g.fillStyle = "#1b1b1b"; g.fillText("Rain", 40, 80); g.restore();
};
window.READY = true;
`;
  const page = (over) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#000;overflow:hidden}canvas{position:absolute;left:0;top:0;display:block}
#caption{position:absolute;left:24px;top:132px;font:600 16px sans-serif;color:#1b1b1b}
#grain{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.04) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}</style></head>
<body><canvas id="board" width="320" height="180"></canvas>${over}<script type="module" src="main.js"></script></body></html>`;
  const film = async (name, over) => {
    const src = join(T, `${name}-src`), dir = join(T, name);
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "index.html"), page(over));
    writeFileSync(join(src, "main.js"), main);
    await codeDemoProject(src, dir, { styleId: "test-canvas", dur: 2 });
    const r = await aeExport(dir, { fps: 25, estimateOnly: true });
    assert.equal(r.status, "estimate", r.message);
    return { dir, est: r.estimate };
  };
  // as the rule asks: the caption in HTML over the canvas, the style's grain over it as a CSS overlay
  const split = await film("split", '<div id="caption">The rain came early</div><div id="grain"></div>');
  const html = readFileSync(join(split.dir, "index.html"), "utf8");
  assert.match(html, /<div id="caption">The rain came early<\/div>/, "the caption is DOM text");
  assert.match(readFileSync(join(split.dir, "main.js"), "utf8"), /fillText\("Rain"/, "the performed title is still drawn on the canvas");
  assert.doesNotMatch(readFileSync(join(split.dir, "main.js"), "utf8"), /The rain came early/, "the canvas does not draw the caption too");
  assert.equal(split.est.canvas.count, 1, "the board is still a canvas");
  assert.equal(split.est.kind, "mostly-canvas", "the caption is a layer beside the canvas, no longer one rendered picture");
  assert.equal(aeLevel(split.est), "partial");
  // the same film with no HTML text (all of it on the canvas): After Effects gets one picture
  const flat = await film("flat", "");
  assert.equal(flat.est.kind, "canvas");
  assert.equal(aeLevel(flat.est), "video");
  assert.ok(split.est.layers > flat.est.layers, `${split.est.layers} layers against ${flat.est.layers}`);
});

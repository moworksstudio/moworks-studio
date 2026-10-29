// The film styles' After Effects badges: each style's demo measured by the AE export's own size check;
// no demo, no badge; a style measured again at a new source (a new style, a pin update); the catalog carries `ae`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aeBadge, aeLevel, codeDemoProject, measureStyles } from "../packages/style-ae/index.mjs";
import { aeExport } from "../packages/ae-export/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-style-ae-"));

test("the badge of a size check: layers editable, canvas parts partial, a canvas film or nothing video", () => {
  assert.equal(aeLevel({ kind: "layers", canvas: { count: 0 } }), "editable");
  assert.equal(aeLevel({ kind: "layers", canvas: { count: 2, area: 0.1 } }), "partial");
  assert.equal(aeLevel({ kind: "mostly-canvas", canvas: { count: 1, area: 0.8 } }), "partial");
  assert.equal(aeLevel({ kind: "canvas" }), "video");
  assert.equal(aeLevel({ kind: "empty" }), "video");
  assert.equal(aeLevel({ kind: "dynamic", later: 40 }), "video", "a picture made as it plays: AE would get only what shows at 0 s");
  assert.equal(aeLevel({ kind: "layers", canvas: { count: 0 }, later: 2 }), "partial");
  assert.equal(aeLevel({ kind: "layers", layers: 1, pictures: 1, canvas: { count: 0 } }), "partial", "a whole film in one <svg>: shapes where AE can, else pictures");
  assert.equal(aeLevel({ kind: "layers", layers: 80, pictures: 3, canvas: { count: 0 } }), "editable");
  assert.equal(aeLevel({ layers: 3 }), null, "an old size check without a kind says nothing");
  // A film the app makes in a canvas style gets its plain text as layers; a style whose text is the drawing stays video
  const cv = { level: "video", measured: "2026-10-27", demo: "d", kind: "canvas", source: "x" };
  assert.deepEqual(aeBadge("a", { a: cv }), { level: "partial", textLayers: true, measured: "2026-10-27", demo: "d" });
  for (const id of ["lemo-whiteboard", "lemo-ascii-crt", "brush-cartoon"]) assert.deepEqual(aeBadge(id, { [id]: cv }), { level: "video", measured: "2026-10-27", demo: "d" }, id);
  assert.deepEqual(aeBadge("w", { w: { ...cv, kind: "dynamic" } }), { level: "video", measured: "2026-10-27", demo: "d" }, "What If: the recorder reads 0 s (owner: stays MP4)");
  assert.deepEqual(aeBadge("b", { a: {} }), { level: "video", unmeasured: true }, "not measured yet: video, not checked (owner 27/10)");
});

test("measured once per source: again at a new commit; a failed demo is not tried again at the same commit; a film made in the style is tried next", async () => {
  const file = join(T, "measure.json"), calls = [];
  const env = process.env.MW_STYLE_AE_FILE;
  process.env.MW_STYLE_AE_FILE = file;
  try {
    const probe = async (dir) => { calls.push(dir); return dir === "bad" ? { status: "failed", code: "PORT_FAILED", message: "film not ready" }
      : { status: "estimate", estimate: { kind: dir === "a" ? "canvas" : "layers", layers: 4, canvas: { count: 0, area: 0 } } }; };
    const list = (src) => [{ styleId: "style-a", demo: "demo-a", source: src, project: () => "a" }, { styleId: "style-b", demo: "demo-b", source: "b1", project: () => "b" },
      { styleId: "style-bad", demo: "demo-bad", source: "c1", project: () => "bad" }];
    const r1 = await measureStyles({ list: list("a1"), probe, file });
    assert.deepEqual([r1.measured, r1.failed.map((f) => f.id)], [["style-a", "style-b"], ["style-bad"]]);
    const j = JSON.parse(readFileSync(file, "utf8"));
    assert.deepEqual([j.styles["style-a"].level, j.styles["style-b"].level, j.styles["style-bad"]], ["video", "editable", undefined]);
    assert.equal(j.failed["style-bad"].source, "c1");
    calls.length = 0;
    const r2 = await measureStyles({ list: list("a1"), probe, file });
    assert.deepEqual([calls.length, r2.skipped], [0, 3], "nothing new: nothing measured (the failed one waits for a new source)");
    const r3 = await measureStyles({ list: list("a2"), probe, file });
    assert.deepEqual([calls, r3.measured], [["a"], ["style-a"]], "the pin moved: only that source's style again");
    calls.length = 0;
    const film = { styleId: "style-bad", demo: "test-99 (a film made in the app)", source: "film:1", project: () => "film" };
    const r4 = await measureStyles({ list: [...list("a2"), film], probe, file });
    assert.deepEqual([calls, r4.measured], [["film"], ["style-bad"]], "a film made in the style: measured although the author's demo failed");
    const j4 = JSON.parse(readFileSync(file, "utf8"));
    assert.deepEqual([j4.styles["style-bad"].demo, j4.failed["style-bad"]], ["test-99 (a film made in the app)", undefined]);
  } finally { if (env === undefined) delete process.env.MW_STYLE_AE_FILE; else process.env.MW_STYLE_AE_FILE = env; }
});

test("the style catalog carries each style's badge (this computer's over the shipped one); one not measured yet says video, not checked", async () => {
  const file = join(T, "catalog.json");
  writeFileSync(file, JSON.stringify({ styles: { "lemo-art-deco": { level: "partial", kind: "mostly-canvas", measured: "2026-10-27", demo: "test demo", source: "x" } } }));
  const env = process.env.MW_STYLE_AE_FILE;
  process.env.MW_STYLE_AE_FILE = file;
  try {
    const { styleList } = await import("../packages/style-catalog/index.mjs");
    const styles = styleList().styles, by = (id) => styles.find((s) => s.id === id);
    assert.deepEqual(by("lemo-art-deco")?.ae, { level: "partial", measured: "2026-10-27", demo: "test demo" });
    assert.ok(styles.every((s) => ["editable", "partial", "video"].includes(s.ae?.level)), "every style has a badge: none is null");
    assert.ok(styles.some((s) => s.ae.unmeasured === true && s.ae.level === "video"), "a style not measured yet says video, not checked");
  } finally { if (env === undefined) delete process.env.MW_STYLE_AE_FILE; else process.env.MW_STYLE_AE_FILE = env; }
});

test("a code film's demo becomes a HyperFrames page the size check reads: one canvas is a 'video' badge, a missing font does not stop it", async () => {
  const src = join(T, "demo-src"), dir = join(T, "demo-project");
  mkdirSync(join(src, "fonts"), { recursive: true });
  writeFileSync(join(src, "fonts", "fonts.css"), "@font-face{font-family:'Gone';src:url('Gone-Regular.ttf')}");
  writeFileSync(join(src, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="fonts/fonts.css">
<style>html,body{margin:0;background:#000;overflow:hidden}canvas{position:absolute;left:0;top:0;display:block}</style></head>
<body><canvas id="c" width="320" height="180"></canvas><script type="module" src="main.js"></script></body></html>`);
  writeFileSync(join(src, "main.js"), `const g = document.getElementById("c").getContext("2d");
await document.fonts.load("40px Gone");
window.DUR = 2;
window.render = (t) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 320, 180); g.fillStyle = "#c00"; g.fillRect(0, 0, 160 * t, 90); };
window.READY = true;
`);
  await codeDemoProject(src, dir, { styleId: "lemo-test", dur: 2 });
  assert.doesNotMatch(readFileSync(join(dir, "fonts", "fonts.css"), "utf8"), /Gone/, "the face with no file is out");
  const r = await aeExport(dir, { fps: 25, estimateOnly: true });
  assert.equal(r.status, "estimate", r.message);
  assert.deepEqual([r.estimate.kind, aeLevel(r.estimate)], ["canvas", "video"]);
  rmSync(T, { recursive: true, force: true });
});

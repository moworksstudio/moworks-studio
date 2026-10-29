// Board stills that come out black: a board that loads a file from outside its own folder
// ("../engine.js") is told so with the file it missed, and a board whose stills are one colour is caught whatever the cause.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { flatStills, missingRefs, stillsProblem } from "../packages/hf-edit/boardCheck.mjs";
import { takeStills } from "../packages/hf-edit/boards.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-board-check-"));
after(() => rmSync(T, { recursive: true, force: true }));
const put = (f, text) => { mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };

// a WebGL board (no three.js: the same failure, offline): a module paints a gradient on the canvas, or black
const PAINT = `export function paint(canvas, black) {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, "attribute vec2 a; varying vec2 v; void main() { v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }"));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, "precision mediump float; varying vec2 v; uniform float k; void main() { gl_FragColor = vec4(v.x * k, v.y * k, (1.0 - v.x) * k, 1.0); }"));
  gl.linkProgram(p); gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1f(gl.getUniformLocation(p, "k"), black ? 0 : 1);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}`;
const board = (o, from, black = false) => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000">
<div id="root" data-composition-id="board-${o}" data-start="0" data-duration="2" data-width="640" data-height="360" style="position:relative;width:640px;height:360px;overflow:hidden">
<canvas id="gl" width="640" height="360" style="position:absolute;inset:0"></canvas>
<script>window.__timelines = window.__timelines || {}; window.__timelines["board-${o}"] = { duration: () => 2, time: () => 0, seek() {}, pause() {}, play() {}, totalDuration: () => 2 };</script>
<script type="module">import { paint } from "${from}"; paint(document.getElementById("gl"), ${black});</script>
</div></body></html>`;
const md = (o) => `# Option ${o}: test ${o}\n\n- idea: option ${o}\n\n## Frame 1 — One\n- duration: 1s\n\n## Frame 2 — Two\n- duration: 1s\n`;

test("missing references: a file outside the board's folder, a missing import of its own script; the project's assets, import-map names and remote or data URLs are not flagged", () => {
  const d = join(T, "refs");
  put(join(d, "assets", "_app", "vendor", "three", "three.module.js"), "export const x = 1;");
  put(join(d, "assets", "_app", "fonts", "a.ttf"), "");
  put(join(d, "boards", "engine.js"), PAINT);
  put(join(d, "boards", "A", "index.html"), `<script type="importmap">{"imports":{"three":"../../assets/_app/vendor/three/three.module.js","three/addons/":"../../assets/_app/vendor/three/jsm/"}}</script>
<style>@font-face { font-family: X; src: url("../../assets/_app/fonts/a.ttf"); } .b { background: url(data:image/png;base64,AAAA); }</style>
<img src="https://example.com/x.png"><a href="#top"></a>
<script type="module">import * as THREE from "three"; import { boot } from "../engine.js"; import { go } from "./scene.js";</script>`);
  put(join(d, "boards", "A", "scene.js"), `import { a } from "./parts/a.js";\nimport { Pass } from "three/addons/Pass.js";\nexport const go = 1;`);
  const m = missingRefs(d, "boards/A");
  assert.deepEqual(m.map((x) => [x.file, x.ref, x.servedAs, x.outside]), [
    ["boards/A/index.html", "../engine.js", "boards/A/engine.js", true],
    ["boards/A/scene.js", "./parts/a.js", "boards/A/parts/a.js", false],
    ["boards/A/scene.js", "three/addons/Pass.js", "assets/_app/vendor/three/jsm/Pass.js", false],
  ]);
  put(join(d, "boards", "A", "engine.js"), PAINT);
  put(join(d, "boards", "A", "parts", "a.js"), "export const a = 1;");
  put(join(d, "assets", "_app", "vendor", "three", "jsm", "Pass.js"), "export class Pass {}");
  assert.deepEqual(missingRefs(d, "boards/A"), [], "every file is where the stills look for it");
});

test("one-colour stills: all of them fail the option, some are only named (a fade from black is one colour too)", () => {
  const d = join(T, "flat");
  mkdirSync(d, { recursive: true });
  const ff = ffmpegExe();
  const png = (name, src) => { const f = join(d, name); execFileSync(ff, ["-v", "error", "-y", "-f", "lavfi", "-i", src, "-frames:v", "1", f], { windowsHide: true }); return f; };
  const black = png("frame-00-at-0.5s.png", "color=c=black:s=640x360"), grey = png("frame-01-at-1.5s.png", "color=c=0x404040:s=640x360");
  const busy = png("frame-02-at-2.5s.png", "testsrc=s=640x360");
  assert.deepEqual(flatStills([black, grey, busy]).map((x) => x.still), [black, grey]);
  put(join(d, "boards", "A", "index.html"), "<p>ok</p>");
  const all = stillsProblem(d, "boards/A", [black, grey]);
  assert.equal(all.failed, true); assert.match(all.message, /every still is one colour \(2 of 2\)/);
  const some = stillsProblem(d, "boards/A", [black, busy]);
  assert.equal(some.failed, false); assert.match(some.message, /frame\(s\) 1 one colour/);
  assert.equal(stillsProblem(d, "boards/A", [busy]), null);
});

test("board stills: a board that imports ../paint.js is black and told which file it missed; the same board with ./paint.js draws; a board painted black on purpose is still caught", { timeout: 300000 }, async () => {
  const d = join(T, "film");
  put(join(d, "boards", "paint.js"), PAINT);
  put(join(d, "boards", "B", "paint.js"), PAINT);
  put(join(d, "boards", "C", "paint.js"), PAINT);
  for (const [o, from, black] of [["A", "../paint.js", false], ["B", "./paint.js", false], ["C", "./paint.js", true]]) {
    put(join(d, "boards", o, "STORYBOARD.md"), md(o));
    put(join(d, "boards", o, "index.html"), board(o, from, black));
  }
  const r = await takeStills(d);
  const by = Object.fromEntries(r.failed.map((f) => [f.option, f.message]));
  assert.match(by.A ?? "", /every still is one colour \(2 of 2\)/, JSON.stringify(r.failed));
  assert.match(by.A, /boards\/A\/index\.html loads "\.\.\/paint\.js", which the stills read as boards\/A\/paint\.js: there is no such file \(a board sees only its own folder/);
  assert.equal(by.B, undefined, "the same WebGL board with its file inside its folder draws");
  assert.match(by.C ?? "", /every still is one colour/, "a genuinely black board is caught too");
  assert.doesNotMatch(by.C, /no such file/);
});

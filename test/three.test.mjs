// three.js offline: the pinned copies reach a film through its import map (R-THREE), CDN URLs of pinned libraries in
// HyperFrames registry blocks and in Claude's own files become local (R-VENDOR), and G-REMOTE also reads the film's own scripts.
// GSAP's MotionPathPlugin comes from the app's copy too (R-MOTIONPATH), never from the CDN the film's CSP blocks.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureMotionPath, finalize } from "../packages/hf-edit/finalize.mjs";
import { installBlock } from "../packages/hf-edit/registry.mjs";
import { rewriteRemoteLibs, threeImportMap, withThreeMap } from "../packages/hf-edit/vendorLibs.mjs";
import { gateRemote } from "../packages/hf-qa/gates.mjs";
import { check } from "../packages/hf-qa/cli.mjs";
import { render } from "../packages/hf-render-worker/client.mjs";
import { gsapFile, motionPathFile, status, threeDir } from "../packages/offline-assets/index.mjs";
import { APP_ROOT, loadPins } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-three-"));
after(() => rmSync(T, { recursive: true, force: true }));
const REG = loadPins().hyperframes.registryRoot;
const block = (name) => readFileSync(join(REG, "blocks", name, `${name}.html`), "utf8");
const REMOTE = /https?:\/\/(?!www\.w3\.org)[^\s"'()<>`]+/g;
const skip = (!status().three || !existsSync(join(REG, "blocks"))) && "three.js not downloaded (Settings > Health) or no HF registry";

test("the import map: 'three' + 'three/addons/' are the default version; every version maps its own addons to its own core", () => {
  const m = threeImportMap(new Set(["0.170.0", "0.147.0"]));
  assert.equal(m.imports.three, "./assets/_app/vendor/three/0.184.0/build/three.module.min.js");
  assert.equal(m.imports["three/addons/"], "./assets/_app/vendor/three/0.184.0/examples/jsm/");
  assert.equal(m.imports["three@0.170.0"], "./assets/_app/vendor/three/0.170.0/build/three.module.min.js");
  assert.equal(m.scopes["./assets/_app/vendor/three/0.170.0/"].three, "./assets/_app/vendor/three/0.170.0/build/three.module.min.js");
  assert.equal(m.imports["three@0.147.0"], undefined, "0.147 is classic scripts only");
  const html = withThreeMap('<head><meta charset="UTF-8">\n<script src="a.js"></script></head>', new Set(["0.184.0"]));
  assert.ok(html.indexOf('type="importmap"') < html.indexOf('src="a.js"'), "before the first script");
  assert.equal(withThreeMap(html, new Set(["0.184.0"])), html, "idempotent");
  assert.ok(!withThreeMap(html, new Set()).includes("importmap"), "gone when the film no longer uses three.js");
});

test("R-VENDOR on HF's three.js blocks: every pinned CDN file becomes local; what has no local copy stays for the gate", { skip }, () => {
  const glass = rewriteRemoteLibs(block("glass-hero"));
  assert.deepEqual([...glass.needs.three], ["0.184.0"]);
  assert.match(glass.text, /import \* as THREE from "three@0\.184\.0"/);
  assert.match(glass.text, /assets\/_app\/fonts\/kit\/Inter\[opsz,wght\]\.ttf\) format\("truetype"\)/, "fontsource Inter is the bundled Inter");
  assert.deepEqual(glass.text.match(REMOTE) ?? [], []);

  const wire = rewriteRemoteLibs(block("wireframe-portal-title"));
  assert.deepEqual([...wire.needs.three], ["0.181.2"]);
  assert.ok(wire.needs.clipper);
  assert.match(wire.text, /from "three@0\.181\.2\/examples\/jsm\/loaders\/FontLoader\.js"/, "its own import map's bare names keep its version");
  assert.ok(!/"three\/addons\//.test(wire.text) && !/from "three"/.test(wire.text));
  assert.deepEqual(wire.text.match(REMOTE) ?? [], []);

  const iphone = rewriteRemoteLibs(block("vfx-iphone-device"));
  assert.deepEqual([...iphone.needs.three], ["0.147.0"]);
  assert.match(iphone.text, /src="assets\/_app\/vendor\/three\/0\.147\.0\/build\/three\.min\.js"/);
  assert.match(iphone.text, /setDecoderPath\("assets\/_app\/vendor\/three\/0\.147\.0\/examples\/js\/libs\/draco\/gltf\/"\)/);
  assert.deepEqual(iphone.text.match(REMOTE) ?? [], []);

  const cuboid = rewriteRemoteLibs(block("cuboid-carousel"));
  assert.equal(cuboid.needs.three.size, 0, "a block with its own three.js keeps it");

  const canopy = rewriteRemoteLibs(block("canopy-part-title"));
  assert.deepEqual(canopy.text.match(REMOTE), ["https://fonts.googleapis.com/css2?family="], "a font fetched at run time cannot be made local");
});

test("installBlock: a three.js block installs offline, its files copied", { skip }, () => {
  const dir = join(T, "block-film");
  mkdirSync(dir, { recursive: true });
  const b = installBlock(REG, "exploded-stack", dir, gsapFile());
  const html = readFileSync(join(dir, b.target), "utf8");
  assert.deepEqual(html.match(REMOTE) ?? [], []);
  assert.ok(existsSync(join(dir, "assets", "_app", "vendor", "three", "0.184.0", "examples", "jsm", "geometries", "RoundedBoxGeometry.js")));
  assert.deepEqual(readFileSync(join(dir, "assets", "_app", "vendor", "three", "0.184.0", "build", "three.core.min.js")),
    readFileSync(join(threeDir(), "0.184.0", "build", "three.core.min.js")));
});

test("finalize: Claude's bare imports and a CDN URL in its own module get the local copy and the import map; G-REMOTE passes", { skip }, async () => {
  const dir = join(T, "claude-film");
  mkdirSync(join(dir, "compositions"), { recursive: true });
  writeFileSync(join(dir, "index.html"), `<!doctype html><html><head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="3" data-width="1920" data-height="1080">
<div id="s" data-composition-id="stage" data-composition-src="compositions/stage.html" data-start="0" data-duration="3" data-track-index="1"></div></div></body></html>`);
  writeFileSync(join(dir, "compositions", "stage.html"), `<template id="stage-template"><div data-composition-id="stage" data-width="1920" data-height="1080">
<canvas id="c"></canvas><script type="module">
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { scene } from "./stage.js";
</script></div></template>`);
  writeFileSync(join(dir, "compositions", "stage.js"), `// glass panels, see https://threejs.org/docs (a comment)\nimport { RoundedBoxGeometry } from "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm";\nexport const scene = 1;\n`);
  const rep = await finalize(dir, { googleFonts: false });
  assert.deepEqual(rep.three, ["0.184.0"]);
  const root = readFileSync(join(dir, "index.html"), "utf8");
  const map = JSON.parse(/<script type="importmap" data-mw="three">([^<]*)<\/script>/.exec(root)[1]);
  assert.equal(map.imports.three, "./assets/_app/vendor/three/0.184.0/build/three.module.min.js");
  assert.ok(root.indexOf("importmap") < root.indexOf("gsap.min.js"), "the map comes before every script");
  assert.match(root, /src="assets\/_app\/vendor\/gsap\.min\.js"/, "the CDN GSAP is the app's copy");
  assert.match(readFileSync(join(dir, "compositions", "stage.js"), "utf8"), /from "three@0\.184\.0\/examples\/jsm\/geometries\/RoundedBoxGeometry\.js"/);
  assert.ok(existsSync(join(dir, "assets", "_app", "vendor", "three", "0.184.0", "build", "three.module.min.js")));
  assert.equal(gateRemote(dir).pass, true, JSON.stringify(gateRemote(dir).findings));
  const again = await finalize(dir, { googleFonts: false });
  assert.deepEqual(again.files, [], "idempotent");

  writeFileSync(join(dir, "compositions", "data.js"), `export const API = "https://example.com/data.json";\n`);
  const g = gateRemote(dir);
  assert.equal(g.pass, false);
  assert.deepEqual(g.findings.map((f) => [f.file, f.url]), [["compositions/data.js", "https://example.com/data.json"]], "a quoted URL in a script; the comment does not count");
});

test("a three.js film end to end: finalize, HyperFrames check, G-REMOTE, and an offline render whose frames move", { skip, timeout: 300000 }, async () => {
  const dir = join(APP_ROOT, "test-output", "three-mini");
  rmSync(dir, { recursive: true, force: true }); rmSync(`${dir}-out`, { recursive: true, force: true });
  cpSync(join(APP_ROOT, "test", "fixtures", "three-mini"), dir, { recursive: true });
  const rep = await finalize(dir, { googleFonts: false });
  assert.deepEqual(rep.three, ["0.184.0"]);
  assert.equal(gateRemote(dir).pass, true);
  const c = check(dir);
  assert.equal(c.json?.lint?.errorCount, 0, JSON.stringify(c.json?.lint?.findings));
  assert.equal(c.json?.runtime?.errorCount, 0, JSON.stringify(c.json?.runtime?.findings));
  const r = await render({ projectDir: dir, outputPath: `${dir}-out`, fps: { num: 10, den: 1 }, format: "png-sequence", workers: 2 });
  assert.equal(r.type, "done", JSON.stringify(r));
  const frames = readdirSync(`${dir}-out`).filter((f) => f.endsWith(".png")).sort();
  assert.equal(frames.length, 10);
  assert.notDeepEqual(readFileSync(join(`${dir}-out`, frames[0])), readFileSync(join(`${dir}-out`, frames[9])), "the box turns with HyperFrames time");
});

test("R-MOTIONPATH: the film loads MotionPathPlugin from assets/_app/vendor right after GSAP, once", { skip: !existsSync(motionPathFile() ?? "") && "MotionPathPlugin not downloaded (Settings > Health)" }, () => {
  const dir = join(T, "mp-film");
  cpSync(join(import.meta.dirname, "fixtures", "minimal"), dir, { recursive: true });
  assert.equal(ensureMotionPath(dir), true);
  const html = readFileSync(join(dir, "index.html"), "utf8");
  assert.match(html, /<script src="assets\/vendor\/gsap\.min\.js"><\/script>\n<script src="assets\/_app\/vendor\/MotionPathPlugin\.min\.js"><\/script>/);
  assert.deepEqual(readFileSync(join(dir, "assets", "_app", "vendor", "MotionPathPlugin.min.js")), readFileSync(motionPathFile()));
  assert.equal(ensureMotionPath(dir), false, "idempotent");
  assert.equal(readFileSync(join(dir, "index.html"), "utf8").match(/MotionPathPlugin/g).length, 1);
});

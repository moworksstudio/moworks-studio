// What If as a Film Style: the pinned copy and the author's React; the app's stand-in for
// Remotion, call by call, against what Remotion's documentation says each call does; a film bundled with the pinned engine, drawn by
// HyperFrames' Chrome through the bridge (a few stills). The shim's calls are checked with the app's own React server renderer: they
// use nothing that differs between React 18 and the film's React 19.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { APP_ROOT, loadPins, sourceHead } from "../packages/version-manager/index.mjs";
import { reactDirs, stageEngine, whatIfSource } from "../packages/what-if-styles/index.mjs";
import { buildWhatIf, familyOf } from "../packages/hf-edit/whatIfBuild.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-what-if-"));
const shimOut = join(APP_ROOT, "test-output", `what-if-shim-${process.pid}.mjs`);
after(() => { rmSync(T, { recursive: true, force: true }); rmSync(shimOut, { force: true }); });
const src = whatIfSource();
const ready = src?.intact && reactDirs();
const skip = ready ? false : "the What If copy or the author's React is not installed";

let R, React, server;
before(async () => {
  // the shim as a module of its own, on the app's React (renderToStaticMarkup): written under the app (test-output/) so "react" resolves
  mkdirSync(join(APP_ROOT, "test-output"), { recursive: true });
  const out = shimOut;
  await build({ entryPoints: [join(APP_ROOT, "packages", "what-if-styles", "shims", "remotion.tsx")], outfile: out, bundle: true, format: "esm", platform: "node",
    jsx: "automatic", external: ["react", "react/jsx-runtime"], logLevel: "error", absWorkingDir: APP_ROOT, nodePaths: [join(APP_ROOT, "node_modules")] });
  R = await import(pathToFileURL(out).href);
  React = (await import("react")).default;
  server = await import("react-dom/server");
});
const h = (...a) => React.createElement(...a);
/** The markup of `el` drawn at frame f. */
const at = (f, el) => server.renderToStaticMarkup(h(R.FrameContext.Provider, { value: f }, el));
const Frame = () => h("i", null, R.useCurrentFrame());

test("pinned: the copy at the commit, MIT, no sound; the author's React 19.0.0 by SHA-256 from codeLibs", { skip }, () => {
  const pin = loadPins().whatIf;
  assert.equal(pin.commit, "3725a22d2d101320cae5b7d761af8d75120c4987");
  assert.equal(sourceHead(src.root), pin.commit);
  assert.match(readFileSync(join(src.root, "LICENSE"), "utf8"), /MIT License[\s\S]*FreshStack/);
  assert.ok(existsSync(join(src.studio, "engine", "index.ts")) && existsSync(join(src.studio, "episodes", "rewind", "shots.tsx")));
  const all = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? all(join(d, e.name)) : [join(d, e.name)]));
  assert.deepEqual(all(src.root).filter((f) => /\.(mp3|wav|m4a|ogg|flac)$/i.test(f)), [], "no sound from the author (ElevenLabs-made, owner Q6)");
  assert.ok(!existsSync(join(src.root, "studio", "public")) && !existsSync(join(src.root, "studio", "library")));
  const libs = loadPins().codeLibs.packages;
  assert.equal(libs.react.version, "19.0.0"); assert.equal(libs["react-dom"].version, "19.0.0"); assert.equal(libs.scheduler.version, "0.25.0");
  assert.equal(JSON.parse(readFileSync(join(reactDirs().react, "package.json"), "utf8")).version, "19.0.0");
});

test("staged once per pin: the engine, its settings, the worked episodes, the credit; never the sound", { skip }, () => {
  const d = join(T, "stage");
  mkdirSync(d);
  const first = stageEngine(d);
  assert.ok(first.files.length);
  const lib = join(d, ".moworks", "library", "what-if");
  for (const f of ["engine/index.ts", "engine/rig.tsx", "studio.config.ts", "episodes/rewind/index.tsx", "LICENSE", "PINNED"]) assert.ok(existsSync(join(lib, f)), f);
  assert.match(readFileSync(join(lib, "CREDIT.md"), "utf8"), /FreshStack[\s\S]*3725a22d2d101320cae5b7d761af8d75120c4987[\s\S]*MIT/);
  assert.deepEqual(stageEngine(d).files, [], "the second time: nothing to do");
});

test("useCurrentFrame and Sequence: children only from `from` for `durationInFrames`, counted from `from`; nested Sequences add up", () => {
  const seq = h(R.Sequence, { from: 10, durationInFrames: 5, layout: "none" }, h(Frame));
  assert.equal(at(9, seq), "");
  assert.equal(at(10, seq), "<i>0</i>");
  assert.equal(at(14, seq), "<i>4</i>");
  assert.equal(at(15, seq), "");
  assert.equal(at(25, h(R.Sequence, { from: 10, layout: "none" }, h(R.Sequence, { from: 5, layout: "none" }, h(Frame)))), "<i>10</i>");
  assert.equal(at(3, h(R.Sequence, { from: -2, layout: "none" }, h(Frame))), "<i>5</i>", "a negative from starts the clock early");
  assert.match(at(0, h(R.Sequence, {}, h(Frame))), /^<div style="position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;display:flex;flex-direction:column"><i>0<\/i><\/div>$/, "absolute-fill by default");
  assert.throws(() => at(0, h(R.Sequence, { durationInFrames: 0 }, null)), /durationInFrames/);
});

test("Series: one Series.Sequence after another, offsets moving the next one", () => {
  const s = h(R.Series, null,
    h(R.Series.Sequence, { durationInFrames: 3, layout: "none" }, h("a", null, h(Frame))),
    h(R.Series.Sequence, { durationInFrames: 4, offset: -1, layout: "none" }, h("b", null, h(Frame))));
  assert.equal(at(0, s), "<a><i>0</i></a>");
  assert.equal(at(2, s), "<a><i>2</i></a><b><i>0</i></b>", "the second starts one frame early (offset -1)");
  assert.equal(at(5, s), "<b><i>3</i></b>");
  assert.equal(at(6, s), "");
});

test("Loop and Freeze: the frame again and again, the frame held", () => {
  const loop = h(R.Loop, { durationInFrames: 4, times: 2, layout: "none" }, h(Frame));
  assert.deepEqual([0, 3, 4, 7, 8].map((f) => at(f, loop)), ["<i>0</i>", "<i>3</i>", "<i>0</i>", "<i>3</i>", ""]);
  assert.equal(at(40, h(R.Loop, { durationInFrames: 6, layout: "none" }, h(Frame))), "<i>4</i>", "for ever by default");
  assert.equal(at(30, h(R.Freeze, { frame: 7 }, h(Frame))), "<i>7</i>");
  assert.equal(at(30, h(R.Freeze, { frame: 7, active: (f) => f < 20 }, h(Frame))), "<i>30</i>");
});

test("useVideoConfig: the film's size, rate and length, the same inside a Sequence", () => {
  const C = () => { const c = R.useVideoConfig(); return h("i", null, `${c.width}x${c.height}@${c.fps}/${c.durationInFrames}`); };
  const cfg = { id: "main", width: 1080, height: 1920, fps: 30, durationInFrames: 600, defaultProps: {}, props: {} };
  assert.equal(server.renderToStaticMarkup(h(R.VideoConfigContext.Provider, { value: cfg }, h(R.FrameContext.Provider, { value: 50 }, h(R.Sequence, { from: 40, layout: "none" }, h(C))))), "<i>1080x1920@30/600</i>");
});

test("interpolate: pieces, easing, the four ends, and the errors Remotion gives", () => {
  assert.equal(R.interpolate(5, [0, 10], [0, 100]), 50);
  assert.equal(R.interpolate(15, [0, 10, 20], [0, 100, 0]), 50);
  assert.equal(R.interpolate(-5, [0, 10], [0, 100]), -50, "extend by default");
  assert.equal(R.interpolate(-5, [0, 10], [0, 100], { extrapolateLeft: "clamp" }), 0);
  assert.equal(R.interpolate(15, [0, 10], [0, 100], { extrapolateRight: "clamp" }), 100);
  assert.equal(R.interpolate(15, [0, 10], [0, 100], { extrapolateRight: "identity" }), 15);
  assert.equal(R.interpolate(12, [0, 10], [0, 100], { extrapolateRight: "wrap" }), 20);
  assert.equal(R.interpolate(5, [0, 10], [0, 100], { easing: R.Easing.quad }), 25);
  assert.equal(R.interpolate(5, [0, 10], [100, 0]), 50, "a falling output");
  assert.throws(() => R.interpolate(1, [0, 0], [0, 1]), /strictly increasing/);
  assert.throws(() => R.interpolate(1, [0, 1, 2], [0, 1]), /same length/);
  assert.throws(() => R.interpolate(1, [0], [0]), /at least 2/);
  assert.throws(() => R.interpolate(NaN, [0, 1], [0, 1]), /input must be a number/);
});

test("interpolateColors: channels in between, clamped at the ends, any CSS form in, rgba out", () => {
  assert.equal(R.interpolateColors(5, [0, 10], ["#000000", "#ffffff"]), "rgba(128, 128, 128, 1)");
  assert.equal(R.interpolateColors(-3, [0, 10], ["red", "blue"]), "rgba(255, 0, 0, 1)");
  assert.equal(R.interpolateColors(13, [0, 10], ["red", "blue"]), "rgba(0, 0, 255, 1)");
  assert.equal(R.interpolateColors(0.5, [0, 1], ["rgba(0, 0, 0, 0)", "hsl(0, 100%, 50%)"]), "rgba(128, 0, 0, 0.5)");
  assert.equal(R.interpolateColors(1, [0, 1, 2], ["#f00", "#0f08", "#00f"]), "rgba(0, 255, 0, 0.533)");
  assert.throws(() => R.interpolateColors(0, [0, 1], ["nope", "#fff"]), /cannot read the colour/);
});

test("spring: from `from` at rest to `to`, overshoot with little damping, clamped when asked, delay, reverse, stretched to a length", () => {
  const s = (frame, o = {}) => R.spring({ frame, fps: 30, ...o });
  assert.equal(s(0), 0);
  assert.ok(Math.abs(s(120) - 1) < 1e-3, "settled at 1");
  const peak = Math.max(...Array.from({ length: 60 }, (_, f) => s(f)));
  // damping 10, mass 1, stiffness 100: a damping ratio of 0.5, a first overshoot of exp(-0.5π/√0.75) = 16.3 %
  assert.ok(Math.abs(peak - 1.163) < 0.005, `Remotion's default (damping 10) overshoots about 16 %: peak ${peak.toFixed(3)}`);
  const stiff = Math.max(...Array.from({ length: 60 }, (_, f) => s(f, { config: { damping: 200 } })));
  assert.ok(stiff <= 1 + 1e-9, "damping 200 does not overshoot");
  assert.ok(Math.max(...Array.from({ length: 60 }, (_, f) => s(f, { config: { overshootClamping: true } }))) <= 1);
  assert.equal(s(10, { delay: 10 }), 0);
  assert.equal(s(10, { from: 50, to: 150, delay: 10 }), 50);
  assert.ok(Math.abs(s(300, { from: 50, to: 150 }) - 150) < 0.1);
  assert.ok(Math.abs(s(20, { durationInFrames: 20 }) - 1) <= 0.005 + 1e-9, "settles on its length");
  assert.ok(Math.abs(s(0, { durationInFrames: 20, reverse: true }) - 1) <= 0.005 + 1e-9, "reverse starts at the end");
  const n = R.measureSpring({ fps: 30 });
  assert.ok(n > 20 && n < 60, `the default spring settles in ${n} frames at 30 fps`);
  assert.throws(() => s(0, { fps: 0 }), /fps/);
});

test("Easing: the named curves start at 0 and end at 1; in / out / inOut mirror; bezier follows its control points", () => {
  const E = R.Easing;
  for (const [n, e] of Object.entries({ linear: E.linear, ease: E.ease, quad: E.quad, cubic: E.cubic, sin: E.sin, circle: E.circle, bounce: E.bounce, poly4: E.poly(4), back: E.back(), elastic: E.elastic(), bez: E.bezier(0.25, 0.1, 0.25, 1) })) {
    assert.ok(Math.abs(e(0)) < 1e-3, `${n}(0)`); assert.ok(Math.abs(e(1) - 1) < 1e-3, `${n}(1)`);
  }
  assert.equal(E.out(E.quad)(0.5), 0.75);
  assert.equal(E.inOut(E.quad)(0.25), 0.125);
  assert.ok(E.back(1.70158)(0.2) < 0, "back pulls back first");
  assert.ok(Math.abs(E.bezier(0, 0, 1, 1)(0.3) - 0.3) < 1e-4, "a straight bezier is linear");
  assert.ok(E.bezier(0.42, 0, 0.58, 1)(0.5) > 0.49 && E.bezier(0.42, 0, 0.58, 1)(0.5) < 0.51);
});

test("random: the same seed gives the same number in [0, 1); other seeds differ; no seed is an error", () => {
  assert.equal(R.random("star-1"), R.random("star-1"));
  assert.notEqual(R.random("star-1"), R.random("star-2"));
  assert.equal(R.random(7), R.random("7"));
  const xs = Array.from({ length: 2000 }, (_, i) => R.random(`s${i}`));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(mean > 0.45 && mean < 0.55, `spread evenly: mean ${mean.toFixed(3)}`);
  assert.throws(() => R.random(null), /seed/);
});

test("layers and files: AbsoluteFill's style, Img an <img>, sound and video nothing in the picture, staticFile a file of assets/", () => {
  assert.equal(server.renderToStaticMarkup(h(R.AbsoluteFill, { style: { background: "red" }, id: "x" }, "a")),
    '<div id="x" style="position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;display:flex;flex-direction:column;background:red">a</div>');
  assert.equal(server.renderToStaticMarkup(h(R.Img, { src: "assets/a.png", alt: "" })), '<img src="assets/a.png" alt=""/>');
  for (const C of [R.Audio, R.Html5Audio, R.Video, R.OffthreadVideo]) assert.equal(server.renderToStaticMarkup(h(C, { src: "x.mp3" })), "");
  assert.equal(R.staticFile("/voice/take1.mp3"), "assets/voice/take1.mp3");
  assert.equal(server.renderToStaticMarkup(h(R.Composition, { id: "x" })), "");
  assert.doesNotThrow(() => R.registerRoot(() => null));
});

test("delayRender: READY waits for every handle; cancelRender stops with the error", async () => {
  const a = R.delayRender("data"), b = R.delayRender("image");
  let done = false;
  const p = R.whenRendered().then(() => { done = true; });
  R.continueRender(a);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(done, false, "one handle left");
  assert.deepEqual(R.pendingRenders(), ["image"]);
  R.continueRender(b);
  await p;
  assert.equal(done, true);
  assert.throws(() => R.cancelRender(new Error("no data")), /no data/);
  await assert.rejects(R.whenRendered(), /no data/);
});

test("a film's Google faces: the family named by its package, a module that answers it; an unknown @remotion package is refused", { skip }, async () => {
  assert.equal(familyOf("@remotion/google-fonts/BricolageGrotesque"), "Bricolage Grotesque");
  assert.equal(familyOf("@remotion/google-fonts/FragmentMono"), "Fragment Mono");
  assert.equal(familyOf("@remotion/google-fonts/Kalam"), "Kalam");
  assert.equal(familyOf("@remotion/google-fonts/IBMPlexSans"), "IBM Plex Sans");
  const d = join(T, "refused");
  mkdirSync(join(d, "whatif"), { recursive: true });
  writeFileSync(join(d, "whatif", "episode.tsx"), 'import { renderMedia } from "@remotion/renderer";\nexport default { Main: () => { void renderMedia; return null; }, total: 1 };\n');
  const r = await buildWhatIf(d);
  assert.equal(r.built, false);
  assert.match(r.error, /@remotion\/renderer is not available in a Moworks film/);
  // the checks' G-BUILD bundles a What If film too, and its error blocks
  const { gateBuild } = await import("../packages/hf-qa/gates.mjs");
  const g = await gateBuild(d);
  assert.deepEqual([g.id, g.blocking, g.pass], ["G-BUILD", true, false]);
  assert.match(g.findings[0].message, /@remotion\/renderer/);
});

test("the author's worked episode, bundled with the pinned engine and React 19, drawn by HyperFrames through the bridge", { skip, timeout: 240000 }, async () => {
  const d = join(T, "rewind");
  mkdirSync(join(d, "whatif"), { recursive: true });
  // the project's episode: the author's sample, as a film of this project would be (its own module on the staged engine)
  writeFileSync(join(d, "whatif", "episode.tsx"), 'export { rewind as default } from "../.moworks/library/what-if/episodes/rewind";\n');
  const r = await buildWhatIf(d);
  assert.equal(r.error, undefined);
  assert.ok(r.built);
  assert.deepEqual(r.families, ["Bricolage Grotesque", "Fragment Mono", "Kalam"]);
  const js = readFileSync(join(d, "compositions", "whatif", "film.js"), "utf8");
  assert.match(js, /^\/\* What If animation engine by FreshStack \(kelano86\), MIT: https:\/\/github.com\/kelano86\/what-if-animation\/tree\/3725a22d2d101320cae5b7d761af8d75120c4987; React 19\.0\.0/);
  assert.match(js, /window\.render\s*=/);
  assert.doesNotMatch(js, /["'`]https?:\/\/react/, "no quoted React docs URL (G-REMOTE)");
  assert.equal((await buildWhatIf(d)).built, false, "an unchanged film is not bundled again");
  // the page: HF's root at the episode's rate, a #stage, the bundle; the app's finalize does the rest (R-WHATIF names the faces, R-FONTS
  // installs them from the app's Google Fonts cache, R-LEMO adds the bridge)
  const tl = JSON.parse(readFileSync(join(d, ".moworks", "library", "what-if", "episodes", "rewind", "timeline.json"), "utf8"));
  const dur = +(tl.total / tl.fps).toFixed(6);
  writeFileSync(join(d, "index.html"), `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><style>
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0E0C1E; } #main, #stage { position: absolute; inset: 0; width: 1920px; height: 1080px; }</style></head>
<body><div id="main" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1920" data-height="1080" data-fps="${tl.fps}">
<div id="stage" class="clip" data-start="0" data-duration="${dur}" data-track-index="1"></div></div>
<script src="compositions/whatif/film.js"></script></body></html>`);
  writeFileSync(join(d, "hyperframes.json"), '{ "name": "what-if-test" }\n');
  const { finalize } = await import("../packages/hf-edit/finalize.mjs");
  const rep = await finalize(d);
  assert.ok(rep.lemo, "the bridge is in (R-LEMO)");
  assert.deepEqual(rep.whatIf.families, ["Bricolage Grotesque", "Fragment Mono", "Kalam"]);
  assert.deepEqual(rep.unresolvedFonts, []);
  // by either Google route: the one-time download, or the pinned Vietnamese list
  const offline = [...rep.googleFonts, ...(rep.googleFontsVi ?? [])].map((g) => g.family).sort();
  assert.deepEqual(offline, ["Bricolage Grotesque", "Fragment Mono", "Kalam"], "every face installed offline");
  assert.match(readFileSync(join(d, "index.html"), "utf8"), /<script src="assets\/_app\/vendor\/gsap\.min\.js"><\/script>[\s\S]*<script data-mw="lemo">/, "the root gets GSAP for the bridge's timeline (dry run 26/10)");
  assert.ok(existsSync(join(d, "assets", "_app", "vendor", "gsap.min.js")));
  const page = readFileSync(join(d, "index.html"), "utf8");
  assert.equal(page.match(/data-mw="whatif-fonts"/g).length, 1);
  await finalize(d);
  assert.equal(readFileSync(join(d, "index.html"), "utf8").match(/data-mw="whatif-fonts"/g).length, 1, "finalize again: one block, rewritten");
  // the storyboard: the same episode's Board (one frame per shot) on a board page, taken by the app's takeStills like any board
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "STORYBOARD.md"), `# Option A: rewind\n\n- idea: the author's sample\n\n${[1, 2, 3, 4].map((n) => `## Frame ${n} — Shot ${n}\n- duration: 1s\n`).join("\n")}`);
  writeFileSync(join(d, "boards", "A", "index.html"), `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><style>
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0E0C1E; } #main, #stage { position: absolute; inset: 0; width: 1920px; height: 1080px; }</style></head>
<body><div id="main" data-composition-id="board-A" data-start="0" data-duration="12" data-width="1920" data-height="1080" data-fps="${tl.fps}" data-whatif="board">
<div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="1"></div></div>
<script src="film.js"></script></body></html>`);
  const { takeStills } = await import("../packages/hf-edit/boards.mjs");
  const b = await takeStills(d, { force: true });
  assert.deepEqual(b.failed, [], JSON.stringify(b.failed));
  assert.ok(existsSync(join(d, "boards", "A", "film.js")), "the board's own bundle, beside its page");
  assert.match(readFileSync(join(d, "boards", "A", "index.html"), "utf8"), /data-mw="whatif-fonts"/);
  assert.ok(!existsSync(join(d, "boards", "A", "assets")), "the snapshot's assets junction is gone");
  const bs = b.round.options[0].stills.filter((s) => /frame-.*\.png$/.test(s)).map((s) => readFileSync(join(d, s)));
  assert.equal(bs.length, 4);
  assert.ok(bs.every((x) => x.length > 30000), "every shot's frame is drawn");
  assert.equal(new Set(bs.map((x) => x.toString("base64"))).size, 4, "four different shots");
  const { snapshotAtAsync } = await import("../packages/hf-qa/cli.mjs");
  const out = join(d, "stills");
  const s = await snapshotAtAsync(d, [0.5, 6, 12], out);
  assert.equal(s.exitCode, 0, s.stderrTail.join(" "));
  const files = readdirSync(out).filter((f) => f.endsWith(".png")).sort();
  assert.equal(files.length, 3);
  const bytes = files.map((f) => readFileSync(join(out, f)));
  assert.ok(bytes.every((b) => b.length > 30000), "drawn, not blank");
  assert.notDeepEqual(bytes[0], bytes[1]); assert.notDeepEqual(bytes[1], bytes[2]);
});

test("a What If film's shots are placed where the timeline first cuts them in, not by the frames' planned seconds", async () => {
  const d = join(T, "shots");
  mkdirSync(join(d, "whatif"), { recursive: true });
  writeFileSync(join(d, "index.html"), `<!doctype html><html><body><div id="main" data-composition-id="main" data-start="0" data-duration="3" data-width="1920" data-height="1080" data-fps="30">
<div id="stage" class="clip" data-start="0" data-duration="3" data-track-index="1"></div></div><script src="compositions/whatif/film.js"></script></body></html>`);
  writeFileSync(join(d, "STORYBOARD.md"), `# Option A · "test"\n\n## Frame 1 — Sh1\n- duration: 2s\n\n## Frame 2 — Sh2\n- duration: 2s\n`);
  // Sh1 0-22, Sh2 22-44, then Sh1 again (a replay is no new shot)
  writeFileSync(join(d, "whatif", "timeline.json"), JSON.stringify({ fps: 30, total: 90, segments: [], shots: [{ id: "Sh1", first: 0, len: 22 }, { id: "Sh2", first: 22, len: 22 }] }));
  const { readShots, placedShots } = await import("../packages/hf-edit/shots.mjs");
  const { shots, root } = await readShots(d);
  assert.deepEqual(placedShots(shots, root.duration).map((s) => [s.number, s.start, s.duration]), [[1, 0, 0.733], [2, 0.733, 0.733]]);
});

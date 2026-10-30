// The Studio's Editor: the five stations on the rail keep every action of The Desk's Pipeline column (Waiting
// for you, Continue, Keep it as it is / Approve again, Run checks again, the Prepare links, "Press Stop in the chat"), and a sheet lies on
// the light table instead of over the Editor. Rendered on the server through Vite with sample data, the theme set on <html>.
import { join } from "node:path";
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

const vite = await createServer({ configFile: join(import.meta.dirname, "..", "ui", "vite.config.js"), server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent",
  optimizeDeps: { noDiscovery: true } });
after(() => { delete document.documentElement.dataset.theme; return vite.close(); });
const load = (p) => vite.ssrLoadModule(p);
async function render(el, theme = "studio") {
  const { LangProvider } = await load("/src/i18n.jsx");
  const { ToastProvider } = await load("/src/lib.jsx");
  if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
  try { return renderToString(h(LangProvider, null, h(ToastProvider, { render: () => null }, el))); } finally { delete document.documentElement.dataset.theme; }
}
const noop = () => {};
const stage = (n, id, title, status, line = null, open = null, steps = []) => ({ n, id, title, status, line, lineVars: {}, steps, gate: n === 2 || n === 3, open });
const FIVE = (over = {}) => [stage(1, "prepare", "Prepare", "done", "Brief ready · {n} file(s)", "brief"), stage(2, "storyboard", "Storyboard", "done", "Storyboard approved", "storyboard"),
  stage(3, "motion", "Motion Plan", "done", "Motion Plan approved for {n} shot(s)", "motion-plan"), stage(4, "build", "Build and review", "done", "Built", null, ["build", "qcReview", "sound", "checks"]),
  stage(5, "finalMix", "Final Mix", "todo", "After the build", "mix")].map((s) => ({ ...s, ...(over[s.id] ?? {}) }));

test("The Studio: five stations on one rail, the lit one is the sheet on the table, Build and review shows its four steps", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const html = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE(), qc: { final: 8 } }, onOpen: noop, onAssets: noop, onChanged: noop, here: "storyboard", actions: [] }));
  assert.match(html, /class="sp-line"/);
  assert.doesNotMatch(html, /class="pl2"/);
  assert.equal((html.match(/class="sp-st /g) ?? []).length, 5);
  assert.match(html, /sp-st done done here/);
  for (const w of ["Build", "Review", "Music and sound effects", "Tech checks"]) assert.ok(html.includes(`>${w}`), w);
  assert.match(html, /8\/10/);
  // the Prepare links of the column: Brief · Assets · Voice-over
  for (const w of ["Brief", "Assets", "Voice-over"]) assert.ok(html.includes(`>${w}</button>`), w);
});

test("The Studio keeps the column's actions: Waiting for you, Continue, Run checks again, Keep it as it is / Approve again, Press Stop", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const waiting = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE({ storyboard: { status: "waiting", line: "approve the storyboard" } }) }, onOpen: noop, onAssets: noop, onChanged: noop, actions: [] }));
  assert.match(waiting, /Waiting for you: approve the storyboard/);
  const stopped = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE({ build: { status: "stopped", line: "Stopped: write “continue” in the chat" } }), autopilot: { running: null } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(stopped, />Continue</);
  const blocked = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE(), checks: { pass: false, blocking: 2, running: false } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(blocked, /Run checks again/);
  const redo = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE({ motion: { status: "redo", steps: ["motionSpec"] } }), steps: [{ id: "motionSpec", status: "redo", canKeep: true }] }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(redo, /Keep it as it is/);
  assert.match(redo, /Approve again/);
  const running = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE({ build: { status: "running", line: "Building" } }), autopilot: { running: "build" } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(running, /Press Stop in the chat to change this/);
  const brief = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE(), question: { kind: "brief-changed" } }, onOpen: noop, onAssets: noop, onChanged: noop }));
  assert.match(brief, /Choose what to do/);
});

test("The Desk's column is unchanged when the theme is The Desk", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const html = await render(h(Pipeline, { projectId: "p1", data: { stages: FIVE() }, onOpen: noop, onAssets: noop, onChanged: noop, here: "storyboard", actions: [] }), null);
  assert.match(html, /class="pl2"/);
  assert.doesNotMatch(html, /sp-line/);
});

test("The Studio lays a sheet on the light table: no overlay, its title once, × to close", async () => {
  const { Sheet } = await load("/src/workflow/stage.jsx");
  const html = await render(h(Sheet, { title: "Storyboard", onClose: noop }, h("p", null, "frames")));
  assert.match(html, /class="lt-sheet"/);
  assert.doesNotMatch(html, /overlay/);
  assert.equal((html.match(/Storyboard/g) ?? []).length, 1);
  const desk = await render(h(Sheet, { title: "Storyboard", onClose: noop }, h("p", null, "frames")), null);
  assert.match(desk, /overlay sheet-overlay/);
});

test("This film: the style with its author, the design that follows the film style, the format and the characters", async () => {
  const FilmCard = (await load("/src/editor/FilmCard.jsx")).default;
  const { authorOfStyle } = await load("/src/editor/FilmCard.jsx");
  assert.equal(authorOfStyle({ id: "anidoodle-fox", author: "Alex Greenshpun (10x Company)" }), "alexgreensh");
  assert.equal(authorOfStyle({ id: "general" }), "moworks");
  const p = { meta: { style: { id: "anidoodle-fox", title: "Cut-paper collage", author: "Alex Greenshpun (10x Company)" }, designLocked: true,
    format: { aspect: "1:1", width: 1080, height: 1080, fps: 24 }, targetDurationSec: 30 } };
  const html = await render(h(FilmCard, { id: "p1", project: p, locked: false, onRestored: noop }));
  assert.match(html, /Cut-paper collage/);
  assert.match(html, /by Alex Greenshpun/);
  assert.equal((html.match(/Follows film style/g) ?? []).length, 1);
  assert.match(html, /1080 × 1080 · 1:1 · 24 fps/);
  assert.match(html, /Change the film style/);
  assert.doesNotMatch(html, /anidoodle-fox|p1/);          // no ids on screen
  // a Brand Kit chosen in New project for an author's style is named, and the line says Claude asks how to use it (T25)
  const asked = await render(h(FilmCard, { id: "p1", project: { meta: { ...p.meta, brandKitAsk: { id: "custom/dot-crumb", title: "Dot & Crumb" } } }, locked: false, onRestored: noop }));
  assert.match(asked, /Dot &amp; Crumb/);
  assert.match(asked, /This style keeps its author&#x27;s design\. Claude asks how to use your Brand Kit\./);
  assert.doesNotMatch(asked, /custom\/dot-crumb|You can describe the Brand Kit/);
});

test("New project's Brand Kit box: an author's style locks it, and a Brand Kit chosen stays chosen with one line that says so (T25), in both themes", async () => {
  const DesignSteps = (await load("/src/workflow/DesignSteps.jsx")).default;
  const author = { id: "mg-01-flat-vector", design: "author" }, open = { id: "general", design: "open", look: true };
  for (const theme of ["studio", null]) {
    const kept = await render(h(DesignSteps, { style: author, value: { look: "custom/dot-crumb" }, onChange: noop }), theme);
    assert.match(kept, /This style keeps its author&#x27;s design\. Claude will ask how to use your Brand Kit\./);
    assert.match(kept, />Remove</);
    assert.doesNotMatch(kept, /You can describe the Brand Kit|custom\/dot-crumb/);
    const none = await render(h(DesignSteps, { style: author, value: { look: "" }, onChange: noop }), theme);
    assert.match(none, /Follows film style/); assert.match(none, /You can describe the Brand Kit in the Brief/);
    assert.doesNotMatch(none, /Claude will ask how to use/);
    assert.doesNotMatch(await render(h(DesignSteps, { style: open, value: { look: "custom/dot-crumb" }, onChange: noop }), theme), /Claude will ask how to use|Follows film style/);
  }
});

test("the edit card's font list names a family once, even when one group's own list repeats it (Oswald twice in In this project)", async () => {
  const { freshNames } = await load("/src/editor/Player.jsx");
  const seen = new Set();
  assert.deepEqual(freshNames(["Oswald", "Oswald", "oswald", "", null, "Inter"], seen), ["Oswald", "Inter"]);
  assert.deepEqual(freshNames(["Inter", "Be Vietnam Pro"], seen), ["Be Vietnam Pro"]);
});

test("a Music / Lyrics film opens its Lyrics and Music map from Build and review, in both themes; other films show neither", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const props = { projectId: "p1", data: { stages: FIVE() }, onOpen: noop, onAssets: noop, onChanged: noop };
  for (const theme of ["studio", null]) {
    const on = await render(h(Pipeline, { ...props, music: true }), theme);
    assert.match(on, />Lyrics</, String(theme));
    assert.match(on, />Music map</, String(theme));
    const off = await render(h(Pipeline, props), theme);
    assert.doesNotMatch(off, />Lyrics<|>Music map</, String(theme));
  }
});

test("the Motion Plan station says Press Stop only once it is reached; Draw all again that drew nothing says so", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const PREP = FIVE({ prepare: { status: "running", line: "Preparing the film" }, storyboard: { status: "todo" }, motion: { status: "todo" }, build: { status: "todo" } });
  const early = await render(h(Pipeline, { projectId: "p1", data: { stages: PREP, autopilot: { running: "prepare" } }, onOpen: noop, onAssets: noop, onChanged: noop, here: "prepare" }));
  assert.doesNotMatch(early, /Press Stop in the chat to change this<\/span>/);
  assert.match(early, /sp-st wip running here/);
  const { drawFailure } = await load("/src/workflow/CharacterSheet.jsx");
  const cast = [{ id: "muc", name: "Mực" }, { id: "nhap", name: "Bé Nháp" }];
  assert.equal(drawFailure({ status: "done", result: { problems: [], characters: [{ id: "muc", name: "Mực", views: "a" }, { id: "nhap", name: "Bé Nháp", views: "b" }] } }, cast), null);
  assert.deepEqual(drawFailure({ status: "done", result: { problems: [], characters: [{ id: "muc", name: "Mực", error: "views: reading 'top'" }, { id: "nhap", name: "Bé Nháp" }] } }, cast).names, ["Mực"]);
  assert.deepEqual(drawFailure({ status: "done", result: { problems: [], characters: [] } }, cast, ["nhap"]).names, ["Bé Nháp"]);
  assert.equal(drawFailure({ status: "failed", error: { message: "no page" } }, cast).why, "no page");
});

test("the music map knows the part of the song the film plays; the whole song or no part said is no part", async () => {
  const { usedPart } = await load("/src/workflow/MusicMapSheet.jsx");
  assert.deepEqual(usedPart({ used: { start: 0, end: 50 } }, 105.7), { start: 0, end: 50 });
  assert.equal(usedPart({ used: { start: 0, end: 105.7 } }, 105.7), null);
  assert.equal(usedPart({}, 105.7), null);
  assert.equal(usedPart({ used: { start: 60, end: 40 } }, 105.7), null);
});

test("the Narration lane's words sit where the film plays them, each line at its own clip of the one voice file", async () => {
  const { onFilm } = await import("../packages/voice/transcript.mjs");
  const segs = [{ start: 0, end: 3.56, text: "a" }, { start: 4.26, end: 7.52, text: "b" }, { start: 8.32, end: 11.84, text: "c" }];
  const clips = [{ start: 3.5, mediaStart: 0, duration: 3.9 }, { start: 21, mediaStart: 3.9, duration: 4 }, { start: 32, mediaStart: 7.9, duration: 4.02 }];
  assert.deepEqual(onFilm(segs, clips), [{ start: 3.5, end: 7.06, text: "a" }, { start: 21.36, end: 24.62, text: "b" }, { start: 32.42, end: 35.94, text: "c" }]);
  assert.deepEqual(onFilm(segs.slice(0, 1), [{ start: 2, mediaStart: null, duration: null }]), [{ start: 2, end: 5.56, text: "a" }], "one whole clip: its start");
  assert.deepEqual(onFilm(segs, clips.slice(0, 1)), [{ start: 3.5, end: 7.06, text: "a" }], "a line no clip plays is left out");
  assert.deepEqual(onFilm(segs.slice(0, 1), []), [{ start: 0, end: 3.56, text: "a" }], "no voice clip: the file's own times");
});

test("a Storyboard waiting for the voice-over or the lyrics opens that dialog from its station, says each wait once, and stays open while Claude works", async () => {
  const Pipeline = (await load("/src/workflow/Pipeline.jsx")).default;
  const sb = [{ key: "sb", onClick: noop, off: false, title: "Open Storyboard" }];
  const LINES = [["waiting", "Waiting for you: make the voice-over", "voice"], ["waiting", "Waiting for you: check and save the voice-over's words", "voice"],
    ["waiting", "Waiting for you: time the voice-over's words", "voice"], ["waiting", "Waiting for you: time the lyrics", "lyrics"],
    ["running", "Timing the voice-over's words", "voice"], ["running", "Timing the lyrics", "lyrics"]];
  for (const [status, line, open] of LINES) {
    const data = { stages: FIVE({ prepare: { status: "done" }, storyboard: { status, line, open }, motion: { status: "todo" }, build: { status: "todo" } }), autopilot: { running: status === "running" ? "storyboard" : null } };
    const html = await render(h(Pipeline, { projectId: "p1", data, onOpen: noop, onAssets: noop, onChanged: noop, actions: sb, here: "storyboard" }));
    assert.ok(html.includes(line.replace(/'/g, "&#x27;")), line);
    assert.doesNotMatch(html, /Waiting for you: Waiting for you/);
    const head = html.split('class="sp-st ')[2].match(/<button[^>]*class="sp-head"[^>]*>/)[0];          // station 02's head
    assert.match(head, new RegExp(`title="${open === "voice" ? "Open Voice-over" : "Open Lyrics"}"`), `${line}: the station opens ${open}`);
    assert.doesNotMatch(head, /disabled=""/);
  }
});

test("a tall or square film keeps its own shape in The Studio (the table, the Shots, the Storyboard wall); a wide film keeps the table as it is", async () => {
  const { filmShape } = await load("/src/screens/Editor.jsx");
  assert.deepEqual([9 / 16, 4 / 5, 1, 4 / 3, 16 / 9, 21 / 9].map(filmShape), ["tall", "square", "square", "square", undefined, undefined]);
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(join(import.meta.dirname, "..", "ui", "src", "studio-editor.css"), "utf8");
  for (const rule of [/\.st-ed\[data-shape\] \.lt-film \.pv-stage \{[^}]*aspect-ratio: var\(--film-ar\)/, /\.st-ed\[data-shape\] \.st-side \.sl-thumb \{[^}]*aspect-ratio: var\(--film-ar\)/,
    /\.st-ed\[data-shape="tall"\] \.lt-sheet \.bd-col\[style\] \.bd-stills \{[^}]*repeat\(9,/, /\.st-ed\[data-shape="square"\] \.lt-sheet \.bd-col\[style\] \.bd-stills \{[^}]*repeat\(5,/])
    assert.match(css, rule);
});

test("Import assets: an archive that could not be unpacked says so in plain words, an unpacked one its count and the programs left out (T25), in both themes", async () => {
  const { AssetPicker } = await load("/src/workflow/assets.jsx");
  const items = [{ id: 1, file: { name: "Font Bebas Nue.rar", size: 151009 }, status: "warn", error: "Could not open Font Bebas Nue.rar; unpack it and add the files." },
    { id: 2, file: { name: "Brand pack.zip", size: 1326499 }, status: "done", unpacked: 3, skipped: ["setup.exe"] }, { id: 3, file: { name: "logo.png", size: 900 }, status: "done" }];
  for (const theme of ["studio", null]) {
    const html = await render(h(AssetPicker, { items, onAdd: noop, onRemove: noop }), theme);
    assert.match(html, /Not unpacked/);
    assert.match(html, /Could not open Font Bebas Nue\.rar; unpack it and add the files\./);
    assert.match(html, /Unpacked: 3 file\(s\)/);
    assert.match(html, /Left out 1 program file\(s\) from Brand pack\.zip\./);
    assert.equal((html.match(/>Copied</g) ?? []).length, 1, "a loose file is copied as before");
  }
});

test("T26-4: the Build's time left counts down to the estimate its confirm gave and, past it, says how long so far, in both themes", async () => {
  const { default: Pipeline } = await load("/src/workflow/Pipeline.jsx");
  const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
  const props = (minutes, planned, gone) => ({ projectId: "p1", onOpen: noop, onAssets: noop, onChanged: noop, actions: [], data: { stages: FIVE({ build: { status: "running", line: "Review" } }),
    autopilot: { running: "qcReview" }, steps: [{ id: "build", status: "done" }, { id: "qcReview", status: "running" }],
    // the server worked the whole out again past the plan (103 min against the confirm's 51-77): the line keeps the confirm's 51
    estimate: { minutes, high: Math.round(minutes * 1.5), ...(planned ? { planned, recomputed: true } : {}), startedAt: ago(gone) } } });
  for (const theme of ["studio", null]) {
    const early = await render(h(Pipeline, props(51, null, 10)), theme);
    assert.match(early, /Review · about 41 min left/, `${theme ?? "desk"}: counting down`);
    const grown = await render(h(Pipeline, props(103, 51, 40)), theme);
    assert.match(grown, /Review · about 11 min left/, `${theme ?? "desk"}: never the server's grown 63`);
    const over = await render(h(Pipeline, props(103, 51, 60)), theme);
    assert.match(over, /Review · taking longer than usual · 60 min so far/, `${theme ?? "desk"}: past the estimate`);
    assert.doesNotMatch(over, /min left/);
  }
});
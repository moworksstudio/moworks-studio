// The Editor without HF Studio. Hand edits go through HyperFrames' own source mutation (words, colour, size, font; a shot's
// length and speed), Reset puts back what Claude wrote, words a script makes are refused, edits wait while Claude works, the timeline
// data, and the preview page that picks with HF's runtime picker.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-editor-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const hand = await import("../packages/hf-edit/handEdit.mjs");
const { readMounts } = await import("../packages/hf-edit/shots.mjs");
const rev = await import("../packages/revisions/index.mjs");
const { startServer } = await import("../packages/server/index.mjs");

const SCENE = (id, title, line2) => `<template id="${id}-template">
  <div data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="3">
    <style>.hl { position: absolute; left: 120px; top: 400px; font-size: 96px; }</style>
    <h1 id="${id}-title" class="hl"><span class="line">${title}</span><span class="line">${line2}</span></h1>
    <p id="${id}-note" style="left:120px; top:700px">Ghi chú nhỏ</p>
    <div id="${id}-words"></div>
    <script>document.getElementById("${id}-words").textContent = "Chữ do script tạo";</script>
  </div>
</template>`;

/** A small film: two scenes, two sound effects (one inside each scene), a music bed. */
function film(name) {
  const d = join(T, name);
  mkdirSync(join(d, "compositions"), { recursive: true });
  writeFileSync(join(d, "index.html"), `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="6" data-width="1920" data-height="1080">
  <div id="s1" data-composition-id="s1" data-composition-src="compositions/s1.html" data-start="0" data-duration="3" data-track-index="1"></div>
  <div id="s2" data-composition-id="s2" data-composition-src="compositions/s2.html" data-start="3" data-duration="3" data-track-index="1"></div>
  <audio id="el-sfx-0" src="assets/sfx/pop.mp3" data-start="1" data-duration="0.5" data-track-index="20" data-volume="1"></audio>
  <audio id="el-sfx-1" src="assets/sfx/whoosh.mp3" data-start="3.2" data-duration="0.5" data-track-index="21" data-volume="1"></audio>
  <audio id="el-music" src="assets/audio/bed.mp3" data-start="0" data-duration="6" data-track-index="11" data-volume="0.6" data-timeline-role="music"></audio>
</div></body></html>`);
  writeFileSync(join(d, "compositions", "s1.html"), SCENE("s1", "Một tách", "trà."));
  writeFileSync(join(d, "compositions", "s2.html"), SCENE("s2", "Sương", "sớm."));
  writeFileSync(join(d, "hyperframes.json"), "{}\n");
  return d;
}
const hfIdOf = (dir, file, elementId) => new RegExp(`data-hf-id="([^"]+)"[^>]*id="${elementId}"|id="${elementId}"[^>]*data-hf-id="([^"]+)"`).exec(readFileSync(join(dir, file), "utf8"))?.slice(1).find(Boolean);
const spansOf = (dir, file) => [...readFileSync(join(dir, file), "utf8").matchAll(/<span[^>]*data-hf-id="([^"]+)"[^>]*>([^<]*)<\/span>/g)].map((m) => ({ hfId: m[1], text: m[2] }));

let s;
const api = (method, path, body) => fetch(`http://127.0.0.1:${s.port}${path}`, {
  method, headers: { "X-MW-Token": "t0k", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
before(async () => { s = await startServer({ token: "t0k" }); });
after(async () => { await s.close(); rmSync(T, { recursive: true, force: true }); });

test("HF's ids are pinned into every composition; the words of a title are its text-only parts", async () => {
  const dir = film("ids");
  await hand.stampIds(dir);
  const src = readFileSync(join(dir, "compositions", "s1.html"), "utf8");
  assert.ok((src.match(/data-hf-id=/g) ?? []).length >= 5, "elements carry data-hf-id");
  const h1 = hfIdOf(dir, "compositions/s1.html", "s1-title");
  const p = await hand.partsOf(dir, "compositions/s1.html", h1);
  assert.equal(p.found, true);
  assert.deepEqual(p.parts.map((x) => x.text), ["Một tách", "trà."]);
  const all = await hand.textsOf(dir, "compositions/s1.html");
  assert.deepEqual(all.texts.map((x) => x.text), ["Một tách", "trà.", "Ghi chú nhỏ"], "the words a script writes are not in the file, so not listed");
});

test("a hand edit changes only those words, keeps the markup, and Reset puts back what Claude wrote", async () => {
  const dir = film("words");
  await hand.stampIds(dir);
  const [first] = spansOf(dir, "compositions/s1.html");
  const out = await hand.setText(dir, "compositions/s1.html", first.hfId, "  Hai  tách ");
  assert.equal(out.changed, true);
  const after1 = spansOf(dir, "compositions/s1.html");
  assert.deepEqual(after1.map((x) => x.text), ["Hai tách", "trà."], "spaces tidied, the second line untouched");
  const h1 = hfIdOf(dir, "compositions/s1.html", "s1-title");
  await assert.rejects(hand.setText(dir, "compositions/s1.html", h1, "x"), { code: "NOT_EDITABLE" }, "a title made of lines is edited line by line");
  await hand.setStyle(dir, "compositions/s1.html", h1, { color: "#ff0000", "font-size": "120px" });
  let p = await hand.partsOf(dir, "compositions/s1.html", h1);
  assert.equal(p.style.color, "#ff0000");
  assert.equal(p.style["font-size"], "120px");
  await assert.rejects(hand.setStyle(dir, "compositions/s1.html", h1, { color: "red; background: url(x)" }), { code: "INVALID" });
  await hand.reset(dir, "compositions/s1.html", first.hfId);
  await hand.reset(dir, "compositions/s1.html", h1);
  assert.deepEqual(spansOf(dir, "compositions/s1.html").map((x) => x.text), ["Một tách", "trà."]);
  p = await hand.partsOf(dir, "compositions/s1.html", h1);
  assert.equal(p.style.color, "");
  assert.equal(p.edited, false);
  assert.throws(() => hand.safeFile(dir, "../outside.html"), { code: "INVALID" });
  assert.throws(() => hand.safeFile(dir, ".moworks/x.html"), { code: "INVALID" });
});

test("a shot's new length moves the later shots and their sound effects, not the music; speed is HF's data-playback-rate", async () => {
  const dir = film("timing");
  await hand.stampIds(dir);
  const m0 = readMounts(dir);
  const s1 = m0.mounts[0];
  const r = await hand.setShotTiming(dir, s1.id, { duration: 4, rate: 2 });
  assert.equal(r.delta, 1);
  const m1 = readMounts(dir);
  assert.deepEqual(m1.mounts.map((x) => [x.start, x.duration]), [[0, 4], [4, 3]]);
  assert.equal(m1.root.duration, 7);
  const audio = Object.fromEntries(m1.audio.map((a) => [a.src, a.start]));
  assert.equal(audio["assets/sfx/pop.mp3"], 1, "inside the changed shot: stays");
  assert.equal(audio["assets/sfx/whoosh.mp3"], 4.2, "on the later shot: moves with it");
  assert.equal(audio["assets/audio/bed.mp3"], 0, "the music stays");
  assert.match(readFileSync(join(dir, "index.html"), "utf8"), /data-playback-rate="2"/);
  await hand.setShotTiming(dir, s1.id, { rate: 1 });
  assert.doesNotMatch(readFileSync(join(dir, "index.html"), "utf8"), /data-playback-rate/);
  await assert.rejects(hand.setShotTiming(dir, s1.id, { duration: 0 }), { code: "INVALID" });
  // The next shot starts inside this one's transition (3.5 s, the shot ends at 4): shortening moves it too, no black gap
  const s2 = readMounts(dir).mounts[1];
  writeFileSync(join(dir, "index.html"), readFileSync(join(dir, "index.html"), "utf8").replace(new RegExp(`(id="${s2.id}"[^>]*?)data-start="4"`), "$1data-start=\"3.5\""));
  assert.equal(readMounts(dir).mounts[1].start, 3.5, "the fixture now overlaps");
  await hand.setShotTiming(dir, s1.id, { duration: 3 });
  const m2 = readMounts(dir);
  assert.deepEqual(m2.mounts.map((x) => [x.start, x.duration]), [[0, 3], [2.5, 3]], "shortening moves the overlapping shot by the same second");
  assert.equal(Object.fromEntries(m2.audio.map((a) => [a.src, a.start]))["assets/sfx/whoosh.mp3"], 3.2, "its sound effect moves with it");
});

test("a sound on the timeline moves along it, onto another lane, and comes off it (HF's source mutation)", async () => {
  const dir = film("sounds");
  await hand.setAudio(dir, { id: "el-sfx-0" }, { start: 2.5 });
  let audio = Object.fromEntries(readMounts(dir).audio.map((a) => [a.src, a.start]));
  assert.equal(audio["assets/sfx/pop.mp3"], 2.5, "moved along its lane");
  await hand.setAudio(dir, { id: "el-sfx-1" }, { lane: "music" });
  assert.match(readFileSync(join(dir, "index.html"), "utf8").match(/<audio[^>]*el-sfx-1[^>]*>/)[0], /data-timeline-role="music"/, "onto the Music lane");
  await hand.setAudio(dir, { src: "assets/audio/bed.mp3", start: 0 }, { start: 1 });          // named by its file and present start
  audio = Object.fromEntries(readMounts(dir).audio.map((a) => [a.src, a.start]));
  assert.equal(audio["assets/audio/bed.mp3"], 1);
  await hand.removeAudio(dir, { id: "el-sfx-0" });
  assert.doesNotMatch(readFileSync(join(dir, "index.html"), "utf8"), /el-sfx-0/, "off the timeline");
  await assert.rejects(hand.removeAudio(dir, { id: "el-sfx-0" }), { code: "NOT_FOUND" });
  await assert.rejects(hand.setAudio(dir, { id: "el-sfx-1" }, { lane: "drums" }), { code: "INVALID" });
});

test("Editor routes: prepare, parts, a hand edit as one revision, the timeline; edits wait while Claude works", async () => {
  const dir = film("routes");
  const p = (await api("POST", "/api/projects/open", { path: dir })).json;
  assert.ok(p?.id);
  rev.ensureRepo(dir);
  assert.equal((await api("POST", `/api/projects/${p.id}/edit/prepare`)).json.ok, true);
  assert.equal(rev.log(dir, 1)[0].message, rev.STUDIO_IDS, "the ids go under the message the pipeline does not count as a change of the film");
  const [first] = spansOf(dir, "compositions/s2.html");
  const parts = (await api("GET", `/api/projects/${p.id}/edit/parts?file=compositions/s2.html&hf=${first.hfId}`)).json;
  assert.equal(parts.parts[0].text, "Sương");
  const e = await api("POST", `/api/projects/${p.id}/edit/text`, { file: "compositions/s2.html", hfId: first.hfId, text: "Mưa" });
  assert.equal(e.status, 200);
  assert.match(rev.log(dir, 1)[0].message, /^Hand edit: text "Mưa" \(compositions\/s2\.html\)$/);
  const tl = (await api("GET", `/api/projects/${p.id}/timeline`)).json;
  assert.equal(tl.duration, 6);
  assert.deepEqual(tl.shots.map((x) => x.src), ["compositions/s1.html", "compositions/s2.html"]);
  assert.deepEqual(tl.sfx.map((x) => x.name), ["pop", "whoosh"]);
  assert.equal(tl.music.name, "bed.mp3");
  s.agent.running.set(p.id, "busy-task");
  try {
    const busy = await api("POST", `/api/projects/${p.id}/edit/text`, { file: "compositions/s2.html", hfId: first.hfId, text: "Gió" });
    assert.equal(busy.status, 409);
    assert.equal(busy.json.code ?? busy.json.error?.code, "CLAUDE_BUSY");
  } finally { s.agent.running.delete(p.id); }
  const bad = await api("POST", `/api/projects/${p.id}/edit/text`, { file: "../x.html", hfId: first.hfId, text: "Gió" });
  assert.equal(bad.status, 400);
});

test("the preview page picks with HF's runtime picker and draws the app's marks; its script is served on the preview origin", async () => {
  const dir = film("preview");
  const p = (await api("POST", "/api/projects/open", { path: dir })).json;
  const { url } = (await api("GET", `/api/projects/${p.id}/preview`)).json;
  const page = await (await fetch(url)).text();
  assert.match(page, /<hyperframes-player id="p"[^>]*disable-click-to-play/);
  assert.match(page, /<div id="ov"/);
  const js = await (await fetch(url.replace(/\/p\/[^/]+\/__preview$/, "/host.js"))).text();
  assert.match(js, /__HF_PICKER_API/);
  assert.match(js, /getCandidatesAtPoint/);
  assert.ok(existsSync(join(import.meta.dirname, "..", "packages", "hf-preview", "host.js")));
});

test("fonts the user installed: read with their Vietnamese check, copied into the project and declared once when used", async () => {
  const { listLocalFonts, useLocalFont } = await import("../packages/hf-edit/localFonts.mjs");
  const { APP_ROOT } = await import("../packages/version-manager/index.mjs");
  const { copyFileSync } = await import("node:fs");
  const fontsDir = join(T, "user-fonts");
  mkdirSync(fontsDir, { recursive: true });
  const src = join(APP_ROOT, "runtime", "fonts", "bundled", "PlayfairDisplay-Regular.ttf");
  if (!existsSync(src)) return;          // the bundled fonts are downloaded at the first start
  copyFileSync(src, join(fontsDir, "PlayfairDisplay-Regular.ttf"));
  const list = listLocalFonts({ dir: fontsDir });
  assert.equal(list.length, 1);
  assert.equal(list[0].family, "Playfair Display");
  assert.equal(list[0].vi, true);
  const dir = film("local-font");
  const r = useLocalFont(dir, "playfair display", { dir: fontsDir });
  assert.equal(r.family, "Playfair Display");
  assert.ok(existsSync(join(dir, "assets", "1_design", "fonts", "playfair-display", "PlayfairDisplay-Regular.ttf")));
  useLocalFont(dir, "Playfair Display", { dir: fontsDir });
  const html = readFileSync(join(dir, "index.html"), "utf8");
  assert.equal((html.match(/data-mw="font-local-playfair-display"/g) ?? []).length, 1);
  assert.match(html, /@font-face \{ font-family: "Playfair Display"; src: url\("assets\/1_design\/fonts\/playfair-display\/PlayfairDisplay-Regular\.ttf"\)/);
  assert.equal(useLocalFont(dir, "No Such Family", { dir: fontsDir }), null);
});

test("before the build (or in a one-page code film) the storyboard's frames are the timeline's shots, one after another by planned length", async () => {
  const dir = film("planned");
  writeFileSync(join(dir, "STORYBOARD.md"), readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8"));
  writeFileSync(join(dir, "index.html"), '<!doctype html><html><body><div id="root" data-composition-id="root" data-start="0" data-duration="13" data-width="1920" data-height="1080"></div></body></html>');
  const p = (await api("POST", "/api/projects/open", { path: dir })).json;
  const tl = (await api("GET", `/api/projects/${p.id}/timeline`)).json;
  assert.equal(tl.shots.length, 3, JSON.stringify(tl.shots));
  assert.ok(tl.shots.every((x) => x.planned), "marked as planned, not built");
  assert.equal(tl.shots[0].start, 0); assert.equal(tl.shots[1].start, tl.shots[0].duration);
});

test("the planned shots of a one-page film cover its whole length (the self-check's stills and the sound effects read them)", async () => {
  const { placedShots } = await import("../packages/hf-edit/shots.mjs");
  const { qcTimes } = await import("../packages/hf-qa/qc.mjs");
  const frames = [1, 2, 3, 4].map((n) => ({ index: n, number: n, start: null, duration: 2, plannedDuration: 2 }));
  const p = placedShots(frames, 10);
  assert.deepEqual(p.map((x) => [x.start, x.duration]), [[0, 2.5], [2.5, 2.5], [5, 2.5], [7.5, 2.5]], "scaled to the film's 10 s");
  const { beats } = qcTimes(p, 10);
  assert.ok(beats.at(-1).t > 8, `the last still is near the end, not at 1.1 s (${beats.map((b) => b.t)})`);
  assert.deepEqual(placedShots([{ index: 1, number: 1, start: 0, duration: 3 }], 10).map((x) => x.planned ?? false), [false], "mounted shots as they are");
  // A code film whose only mount is a layer over it (words.html at 16.5 s) is placed by its frames, not as one shot
  const overlay = { index: null, number: 3, title: "words", start: 16.5, duration: 3.5, notInStoryboard: true };
  const six = [1, 2].map((n) => ({ index: n, number: n, start: null, plannedDuration: 10 }));
  assert.deepEqual(placedShots([overlay, ...six], 20).map((x) => [x.number, x.start, x.duration]), [[1, 0, 10], [2, 10, 10]]);
  assert.deepEqual(placedShots([overlay], 20).map((x) => x.number), [3], "a film with no storyboard: its mounts as they are");
});

test("a file the film names as a URL (PNG%20Logo.png) is the file on disk, not a missing one", async () => {
  const { listAssets, referencedFiles } = await import("../packages/project-service/assets.mjs");
  const d = mkdtempSync(join(tmpdir(), "mw-refs-"));
  mkdirSync(join(d, "assets", "1_design", "images"), { recursive: true }); mkdirSync(join(d, "compositions"), { recursive: true });
  writeFileSync(join(d, "assets", "1_design", "images", "PNG Logo.png"), "x");
  writeFileSync(join(d, "index.html"), "<div></div>");
  writeFileSync(join(d, "compositions", "f5.html"), '<img src="../assets/1_design/images/PNG%20Logo.png">');
  assert.deepEqual([...referencedFiles(d).keys()], ["assets/1_design/images/PNG Logo.png"]);
  assert.equal(listAssets(d, { remember: false }).items.filter((x) => x.status === "missing").length, 0);
  // That layer over a code film (words.html at 16.5 s) is no seventh shot: the logo is in the shots it lies over
  // a 20 s film's frames add up to 22.4 s: the last one carries the ending's 2.4 s fade after the content (house rules §9)
  const six = [4, 2.5, 2.5, 5, 4, 4.4].map((sec, i) => ({ index: i + 1, number: i + 1, start: null, plannedDuration: sec }));
  const words = { index: null, number: 7, start: 16.5, duration: 3.5, src: "compositions/f5.html", notInStoryboard: true };
  const logo = listAssets(d, { shots: [words, ...six], meta: { targetDurationSec: 20 }, remember: false }).items.find((x) => x.name === "PNG Logo.png");
  assert.deepEqual(logo.usedIn, [5, 6]);
  rmSync(d, { recursive: true, force: true });
});

test("the new project's 3 s starter card is no shot once the storyboard is written (the Motion Plan showed 7 shots of 6)", async () => {
  const { readShots } = await import("../packages/hf-edit/shots.mjs");
  const d = mkdtempSync(join(tmpdir(), "mw-starter-"));
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="3" data-width="1920" data-height="1080" data-no-timeline>\n  <div id="f1" data-composition-id="f1" data-composition-src="compositions/f1.html" data-start="0" data-duration="3" data-track-index="1"></div>\n</div>');
  writeFileSync(join(d, "STORYBOARD.md"), "## Frame 1 — Hook\n- duration: 4s\n\n## Frame 2 — End\n- duration: 3s\n");
  assert.deepEqual((await readShots(d)).shots.map((s) => s.title), ["Hook", "End"]);
  // a built film keeps a scene the storyboard does not name (no data-no-timeline on its root)
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="7" data-width="1920" data-height="1080">\n  <div id="x" data-composition-id="x" data-composition-src="compositions/x.html" data-start="0" data-duration="7" data-track-index="1"></div>\n</div>');
  assert.equal((await readShots(d)).shots.length, 3);
  rmSync(d, { recursive: true, force: true });
});

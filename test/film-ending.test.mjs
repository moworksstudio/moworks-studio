// No film stops dead (owner 29/10/2026, house rules §9): one fade length for the plan, the picture and the music (hf-edit/ending.mjs),
// added AFTER the length the owner set (60 s → a 65 s file) unless the brief asks for exactly or at most it (MOTION-PLAN.json's
// ending.inside) or the style's author ends the film; the music fitted to the whole length so HyperFrames' clip-edge fade lands on the
// film's end; Tech checks' ending check (G-END) tells a hard cut from a fade on HyperFrames' own stills. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endFade, fadeOfTotal, filmLength } from "../packages/hf-edit/ending.mjs";
import { fitMusicToFilm, placeTrack, stopMusic } from "../packages/hf-edit/tracks.mjs";
import { endVerdict, endingGate, measureEnding } from "../packages/hf-qa/ending.mjs";
import { styleTraits } from "../packages/style-catalog/traits.mjs";
import { lengthLine } from "../packages/agent/index.mjs";
import * as plan from "../packages/motion-plan/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-ending-"));
after(() => rmSync(T, { recursive: true, force: true }));
const rule = (p) => readFileSync(new URL(`../config/rules/${p}`, import.meta.url), "utf8").replace(/\s+/g, " ");

test("the ending's fade: 3-5 s from 30 s on, 12 % and at least 1.5 s below; shorter after an end card", () => {
  assert.deepEqual([10, 20, 30, 60, 120].map((s) => endFade(s)), [1.5, 2.4, 3.6, 5, 5]);
  assert.deepEqual([10, 20, 60].map((s) => endFade(s, { endCard: true })), [1, 1.2, 2.5]);
  for (let s = 30; s <= 600; s += 7) { const f = endFade(s); assert.ok(f >= 3 && f <= 5, `${s} s: ${f}`); }
  for (let s = 5; s < 30; s += 1) { const f = endFade(s); assert.ok(f >= 1.5 && f <= Math.max(1.5, s * 0.15) + 1e-9, `${s} s: ${f}`); }
  assert.equal(endFade(3), 1, "never more than a third of a tiny film");
  assert.equal(endFade(0), 0);
});

test("the fade comes after the set length: 60 s → 65 s, 1:45 → 1:50, 10 s → 11.5 s; inside only when asked, or in an author's own ending", () => {
  const len = (s, o = {}) => filmLength({ targetDurationSec: s, ...o });
  assert.deepEqual([60, 105, 10, 20, 120].map((s) => len(s).total), [65, 110, 11.5, 22.4, 125]);
  assert.deepEqual(len(60), { content: 60, fade: 5, total: 65, inside: false, own: false });
  // the plan says the brief asks for exactly / at most the length: the fade inside it
  const d = join(T, "inside"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, ending: { kind: "fade", fade: 5, inside: true }, shots: [] }));
  assert.deepEqual(filmLength({ targetDurationSec: 60 }, { dir: d }), { content: 60, fade: 5, total: 60, inside: true, own: false });
  // an end card is content; its shorter fade after it
  writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, ending: { kind: "endCard" }, shots: [] }));
  assert.equal(filmLength({ targetDurationSec: 60 }, { dir: d }).total, 62.5);
  // a style whose author ends the film: nothing added
  assert.deepEqual(len(60, { style: { id: "what-if" } }), { content: 60, fade: 5, total: 60, inside: true, own: true });
  // the fade read back from a film's whole length is the content's
  assert.deepEqual([11.5, 22.4, 65, 110].map((t) => fadeOfTotal(t)), [1.5, 2.4, 5, 5]);
  assert.equal(fadeOfTotal(60, { inside: true }), 5);
  // Claude is told the three numbers in every step
  assert.match(lengthLine({ targetDurationSec: 60 }), /60 s of content, then the ending's 5 s fade after it .*add up to 65 s/);
  assert.match(lengthLine({ targetDurationSec: 60 }, d), /62\.5 s/);
  assert.match(lengthLine({ targetDurationSec: 60, style: { id: "what-if" } }), /author's own ending inside it/);
});

const film = (name, seconds, { ending = null, style = null } = {}) => {
  const d = join(T, name); mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, "index.html"), `<div data-composition-id="root" data-duration="${seconds}"></div>\n`);
  if (ending) writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, ending, shots: [] }));
  if (style) writeFileSync(join(d, ".moworks", "project.json"), JSON.stringify({ style: { id: style } }));
  return d;
};
const music = (d) => Object.fromEntries([.../<audio [^>]*id="el-music"[^>]*>/.exec(readFileSync(join(d, "index.html"), "utf8"))[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

test("the music covers the whole film and its data-fade-out is the ending's fade, for 10 / 20 / 60 / 120 s films", () => {
  for (const [s, whole, fade] of [[10, "11.5", "1.5"], [20, "22.4", "2.4"], [60, "65", "5"], [120, "125", "5"]]) {
    const d = film(`f${s}`, whole);
    placeTrack(d, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
    const a = music(d);
    assert.equal(a["data-fade-out"], fade, `${s} s film`);
    assert.equal(a["data-duration"], whole, `${s} s: the song ends with the film (content and fade), where HF's fade is anchored`);
    assert.equal(a["data-mw-track"], "180");
  }
  // the brief asks for exactly 60 s: the fade inside; an author's own ending: the music fades within it
  const exact = film("exact", 60, { ending: { kind: "fade", inside: true } });
  placeTrack(exact, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.deepEqual([music(exact)["data-duration"], music(exact)["data-fade-out"]], ["60", "5"]);
  const own = film("own", 10, { style: "what-if" });
  placeTrack(own, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.deepEqual([music(own)["data-duration"], music(own)["data-fade-out"]], ["10", "1.5"]);
  // an end card: a shorter fade; a song that ends before the film: a quarter of it
  const card = film("card", 62.5, { ending: { kind: "endCard" } });
  placeTrack(card, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.equal(music(card)["data-fade-out"], "2.5");
  const short = film("short", 65);
  placeTrack(short, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 8 });
  assert.deepEqual([music(short)["data-duration"], music(short)["data-fade-out"]], ["8", "2"]);
  // placed before the Build (the 3 s starter page): fitted to the length New project set with its fade
  const starter = film("starter", 3);
  writeFileSync(join(starter, "index.html"), '<div data-composition-id="root" data-duration="3" data-no-timeline><div data-composition-src="compositions/f1.html"></div></div>\n');
  writeFileSync(join(starter, ".moworks", "project.json"), JSON.stringify({ targetDurationSec: 60 }));
  placeTrack(starter, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.deepEqual([music(starter)["data-duration"], music(starter)["data-fade-out"]], ["65", "5"], "not the starter's 3 s");
  // the film grows after the music was placed: fitted again before a render, the checks, after Claude's edits
  const grow = film("grow", 22.4);
  placeTrack(grow, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  writeFileSync(join(grow, "index.html"), readFileSync(join(grow, "index.html"), "utf8").replace('data-duration="22.4"', 'data-duration="65"'));
  fitMusicToFilm(grow);
  assert.deepEqual([music(grow)["data-duration"], music(grow)["data-fade-out"]], ["65", "5"]);
  assert.equal(fitMusicToFilm(grow), null, "nothing to change the second time");
  // a stop is a cut; playing to the end again brings the ending's fade back
  stopMusic(grow, 30);
  assert.equal(music(grow)["data-fade-out"], undefined);
  assert.equal(fitMusicToFilm(grow), null, "a stopped music is left as it is");
  stopMusic(grow, null);
  assert.deepEqual([music(grow)["data-duration"], music(grow)["data-fade-out"]], ["65", "5"]);
  // a fade the user set in Studio stays theirs
  writeFileSync(join(grow, "index.html"), readFileSync(join(grow, "index.html"), "utf8").replace('data-fade-out="5"', 'data-fade-out="0.7"'));
  assert.equal(fitMusicToFilm(grow), null);
  assert.equal(music(grow)["data-fade-out"], "0.7");
});

test("the plan keeps its ending; the rules and the plan prompt say how a film ends, with the numbers", () => {
  const d = join(T, "plan"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, plan.FILE), JSON.stringify({ version: 1, ending: { kind: "fade", fade: 2.4 }, shots: [{ shot: 1, motions: [] }] }));
  assert.deepEqual(plan.read(d).plan.ending, { kind: "fade", fade: 2.4, inside: false }, "after the set length by default");
  writeFileSync(join(d, plan.FILE), JSON.stringify({ version: 1, ending: { kind: "fade", fade: 5, inside: true }, shots: [{ shot: 1, motions: [] }] }));
  assert.equal(plan.read(d).plan.ending.inside, true);
  writeFileSync(join(d, plan.FILE), JSON.stringify({ version: 1, ending: { kind: "cut" }, shots: [{ shot: 1, motions: [] }] }));
  assert.equal(plan.read(d).plan.ending, undefined, "an unknown kind is left out");
  assert.match(plan.PROMPT, /"ending":\{"kind":"fade\|endCard\|author","fade":<seconds>,"inside":false\}/);
  assert.match(plan.PROMPT, /a 60 s film is a 65 s file, 10 s is 11\.5 s; the shots add up to the content plus the fade/);
  assert.match(plan.PROMPT, /"inside": true only when the brief or the owner asks for exactly or at most that length/);
  assert.match(plan.PROMPT, /10 s: 1\.5, 20 s: 2\.4, 30 s: 3\.6, 60 s and longer: 5/);
  const house = rule("moworks-studio/SKILL.md");
  assert.match(house, /version: 1\.3\.0/);
  assert.match(house, /## 9\. The ending: no film stops dead/);
  assert.match(house, /the picture fades out while the music fades down, together/);
  assert.match(house, /The fade comes after the length the owner set, never out of it/);
  assert.match(house, /60 s is a 65 s file, 1:45 is 1:50, 10 s is 11\.5 s/);
  assert.match(house, /`ending\.inside` is `true` \(`false` otherwise, the default\)/);
  assert.match(house, /keep that ending as shipped and add nothing after it; the app fades the music within that ending/);
  assert.doesNotMatch(house, /data-fade-out.{0,20}2 s/);
  assert.match(rule("general-style/SKILL.md"), /\*\*The ending:\*\* no film stops dead.*60 s is a 65 s file/);
  assert.match(rule("general-style/references/storyboard.md"), /add up to the film's whole length \(the length set in New project and the ending's fade after it/);
  assert.match(readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8").replace(/\s+/g, " "), /Films end with a picture and music fade:.*added after the length you set \(a 60 s film is a 65 s file\)/);
  // the picture's own ending is the author's in every style but General and HyperFrames' own
  for (const id of ["general", "hf-launch"]) assert.equal(styleTraits(id).ownEnding, false, id);
  for (const id of ["lemo-opuscar-brick-toy", "what-if"]) assert.equal(styleTraits(id).ownEnding, true, id);
  assert.equal(styleTraits(null).ownEnding, false, "a film with no style follows the house ending");
});

test("the ending check: a hard cut on the last half second is flagged, a fade is not, an author's ending is not measured", async () => {
  assert.equal(endVerdict(40, 38).faded, false);
  assert.equal(endVerdict(40, 1).faded, true, "faded to a plain picture");
  assert.equal(endVerdict(40, 10).faded, true, "a quarter of the contrast left");
  assert.equal(endVerdict(2, 2).faded, true, "already plain before the end");
  assert.equal(endingGate(null, { own: true }).pass, true);
  // two films of HyperFrames' own: the picture to the end, and the same picture fading (dimmed, then gone)
  const make = (name, tail) => {
    const d = join(T, name); mkdirSync(d, { recursive: true });
    const card = (a, b, extra = "") => `<div class="clip" data-start="${a}" data-duration="${b - a}" data-track-index="1" style="position:absolute;inset:0;background:linear-gradient(90deg,#c33,#33c);color:#fff;font:700 64px sans-serif;display:flex;align-items:center;justify-content:center;${extra}">THE END</div>`;
    writeFileSync(join(d, "index.html"), `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="root" data-composition-id="root" data-start="0" data-duration="2" data-width="640" data-height="360" style="position:relative;width:640px;height:360px;overflow:hidden;background:#000">
${tail(card)}
<script>window.__timelines = window.__timelines || {}; window.__timelines["root"] = { duration: () => 2, time: () => 0, seek() {}, pause() {}, play() {}, totalDuration: () => 2 };</script>
</div></body></html>`);
    return d;
  };
  const cut = make("cut", (c) => c(0, 2));
  const fade = make("fade", (c) => `${c(0, 1.7)}\n${c(1.7, 1.9, "opacity:0.15")}`);
  const r1 = await measureEnding(cut, { total: 2, workDir: join(T, "w1") });
  const r2 = await measureEnding(fade, { total: 2, workDir: join(T, "w2") });
  assert.deepEqual(r1.at, [1.5, 1.98]);
  assert.equal(r1.faded, false, `a hard cut: ${r1.before} → ${r1.last}`);
  assert.equal(r2.faded, true, `a fade: ${r2.before} → ${r2.last}`);
  const g = endingGate(r1, { shot: 4 });
  assert.equal(g.pass, false);
  assert.equal(g.findings[0].shot, 4);
  assert.match(g.findings[0].message, /stops dead/);
  assert.deepEqual(endingGate(r2).findings, [], "a fade says nothing");
});

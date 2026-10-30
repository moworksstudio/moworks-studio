// No film stops dead (owner 29/10/2026, house rules §9): one fade length for the plan, the picture and the music (hf-edit/ending.mjs),
// added AFTER the length the owner set (60 s → a 65 s file) unless the brief asks for exactly or at most it (MOTION-PLAN.json's
// ending.inside) or the style's author ends the film; the music fitted to the whole length so HyperFrames' clip-edge fade lands on the
// film's end; Tech checks' ending check (G-END) tells a hard cut from a fade on HyperFrames' own stills. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { authorEnding, endFade, fadeOfTotal, filmEnding, filmLength, resolveEnding } from "../packages/hf-edit/ending.mjs";
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

const film = (name, seconds, { ending = null, style = null, shots = [] } = {}) => {
  const d = join(T, name); mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, "index.html"), `<div data-composition-id="root" data-duration="${seconds}"></div>\n`);
  if (ending) writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, ending, shots }));
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
  // the plan's own fade, any kind: picture and music end together (Test 20: an author's 2.5 s ending, the music faded over 5 s)
  const ends = [{ shot: 1, motions: [] }, { shot: 2, motions: [{ target: "#card", type: "entrance", ending: true }] }];
  const author = film("author", 105, { ending: { kind: "author", fade: 2.5, inside: false, author: "the end card lands and holds" }, style: "lemo-opuscar-brick-toy", shots: ends });
  placeTrack(author, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.deepEqual([music(author)["data-duration"], music(author)["data-fade-out"]], ["105", "2.5"]);
  // an author's ending the plan only claims (T24-12: none named) is the house fade: the music over the usual fade, not the plan's 2.5 s
  const claimed = film("claimed", 105, { ending: { kind: "author", fade: 2.5, inside: true }, style: "lemo-opuscar-brick-toy", shots: ends });
  placeTrack(claimed, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.deepEqual([music(claimed)["data-duration"], music(claimed)["data-fade-out"]], ["105", "5"]);
  const planned = film("planned", 65, { ending: { kind: "fade", fade: 4 } });
  placeTrack(planned, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.deepEqual([music(planned)["data-duration"], music(planned)["data-fade-out"]], ["65", "4"]);
  const own = film("own", 10, { style: "what-if" });
  placeTrack(own, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.deepEqual([music(own)["data-duration"], music(own)["data-fade-out"]], ["10", "1.5"]);
  // an end card: a shorter fade; a song that ends before the film plays again after itself to the film's end (T22-9), the ending's
  // fade on its last repeat; one too short to play again keeps a quarter of it
  const card = film("card", 62.5, { ending: { kind: "endCard" } });
  placeTrack(card, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 180 });
  assert.equal(music(card)["data-fade-out"], "2.5");
  const short = film("short", 65);
  placeTrack(short, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 8 });
  const reps = [...readFileSync(join(short, "index.html"), "utf8").matchAll(/<audio [^>]*id="el-music-loop-\d+"[^>]*>/g)].map((m) => m[0]);
  assert.ok(reps.length > 1, "an 8 s song in a 65 s film repeats");
  const lastRep = Object.fromEntries([...reps.at(-1).matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  assert.ok(Math.abs(Number(lastRep["data-start"]) + Number(lastRep["data-duration"]) - 65) < 1e-6, "to the film's end");
  assert.equal(lastRep["data-fade-out"], "5");
  const tiny = film("tiny", 65);
  placeTrack(tiny, { kind: "music", src: "assets/3_audio/music/song.mp3", duration: 2 });
  assert.deepEqual([music(tiny)["data-duration"], music(tiny)["data-fade-out"]], ["2", "0.5"]);
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
  assert.match(plan.PROMPT, /"ending":\{"kind":"fade\|endCard\|author","fade":<seconds>,"inside":false,"author":"<only with the kind author: the style author's ending in plain words>"\}/);
  assert.match(plan.PROMPT, /a 60 s film is a 65 s file, 10 s is 11\.5 s; the shots add up to the content plus the fade/);
  assert.match(plan.PROMPT, /"inside": true only when the brief or the owner asks for exactly or at most that length/);
  assert.match(plan.PROMPT, /10 s: 1\.5, 20 s: 2\.4, 30 s: 3\.6, 60 s and longer: 5/);
  const house = rule("moworks-studio/SKILL.md");
  assert.match(house, /version: 1\.3\.\d+/);          // the ending came in 1.3.0; later patches keep it
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

test("an author's ending stands only when the plan names it and the last shot plays it; otherwise the house fade after the set length (T24-12)", () => {
  const LEMO = { targetDurationSec: 60, style: { id: "lemo-opuscar-brick-toy" } };
  const ends = (n = 2) => [{ shot: 1, motions: [{ target: "#a", type: "camera" }] }, { shot: n, motions: [{ target: "#screen", type: "exit", ending: true }] }];
  const at = (name, ending, shots = ends()) => { const d = join(T, name); mkdirSync(d, { recursive: true }); writeFileSync(join(d, plan.FILE), JSON.stringify({ version: 1, ending, shots })); return d; };
  // T24-12: an ASCII/CRT plan said "author" with no ending named (fade 0, inside): the house fade, after the set length
  const t24 = at("t24-12", { kind: "author", fade: 0, inside: true });
  assert.deepEqual(filmLength(LEMO, { dir: t24 }), { content: 60, fade: 5, total: 65, inside: false, own: false, asked: "author", why: "unnamed" });
  assert.deepEqual(filmEnding(LEMO, { dir: t24 }), { kind: "fade", inside: false, asked: "author", why: "unnamed", own: false });
  assert.match(lengthLine(LEMO, t24), /ending says "author" but it names no ending of the author's .*the picture fades out with the music\. 60 s of content, then the ending's 5 s fade after it .*65 s/);
  // named and played in the last shot: the author's ending stands, nothing added, the music only
  const named = at("named", { kind: "author", author: "the CRT powers down to a dot", inside: false });
  assert.deepEqual(filmLength(LEMO, { dir: named }), { content: 60, fade: 5, total: 60, inside: true, own: true });
  assert.equal(filmEnding(LEMO, { dir: named }).author, "the CRT powers down to a dot");
  assert.match(lengthLine(LEMO, named), /author's own ending inside it .*ending\.author and the last shot plays it/);
  // named but played in an earlier shot only, or named with words that are no ending, or a placeholder: the house fade
  const early = at("early", { kind: "author", author: "the CRT powers down to a dot" }, [...ends(1).slice(1), { shot: 2, motions: [{ target: "#a", type: "camera" }] }]);
  assert.deepEqual([filmLength(LEMO, { dir: early }).own, filmLength(LEMO, { dir: early }).why], [false, "lastShot"]);
  for (const words of ["none", "n/a", "", "<the style author's ending in plain words>", "stays lit and alive to the end, no fade", "vẫn sống tới giây 110, không mờ dần"]) {
    assert.equal(authorEnding(words), null, JSON.stringify(words));
    assert.equal(filmLength(LEMO, { dir: at("w", { kind: "author", author: words }) }).total, 65, JSON.stringify(words));
  }
  for (const words of ["the CRT powers down to a dot", "the cursor stops and the screen holds", "the end card lands and holds 2 s"]) assert.equal(authorEnding(words), words);
  // a style whose author has no ending of its own (General, HyperFrames'): the house fade whatever the plan says
  assert.deepEqual(resolveEnding({ ending: { kind: "author", author: "the logo holds" }, shots: ends() }, { ownEnding: false }), { kind: "fade", inside: false, asked: "author", why: "style" });
  assert.equal(filmLength({ targetDurationSec: 60, style: { id: "general" } }, { dir: named }).total, 65);
  // the plan decides once it says how the film ends: a fade in an author's style is the house fade, after the set length
  assert.deepEqual(filmLength(LEMO, { dir: at("fade", { kind: "fade" }) }), { content: 60, fade: 5, total: 65, inside: false, own: false });
  assert.equal(filmLength(LEMO).own, true, "before the plan: the style's author's ending");
  // the plan keeps the ending's words and the row that plays it, through an edit of the shot
  const kept = plan.read(named).plan;
  assert.deepEqual(kept.ending, { kind: "author", inside: false, author: "the CRT powers down to a dot" });
  assert.equal(kept.shots.at(-1).motions[0].ending, true);
  assert.equal(kept.shots[0].motions[0].ending, undefined);
  plan.setShot(named, 2, kept.shots.at(-1).motions);
  assert.equal(filmLength(LEMO, { dir: named }).own, true, "still played after an edit of the last shot");
  assert.equal(plan.read(at("fadeWords", { kind: "fade", author: "x" })).plan.ending.author, undefined, "words only for an author's ending");
  // Claude is told: name it, play it, or it is the house fade; a lit, moving last frame is no ending
  assert.match(plan.PROMPT, /play it in the last shot: its row there carries "ending": true/);
  assert.match(plan.PROMPT, /"author" with no ending named, with no row of the last shot marked "ending": true, or in a style whose author has no ending of its own .* is the house fade/);
  assert.match(plan.PROMPT, /"ease":"power1\.in","behavior":"[^"]*","ending":true\}/);
  const house = rule("moworks-studio/SKILL.md");
  assert.match(house, /\*\*Name it and play it:\*\* the Motion Plan's `ending\.author` says what the author's ending is/);
  assert.match(house, /gets the house fade: the picture and the music fade together, after the set length/);
  assert.match(house, /Tech checks flag a film whose last half second is a hard cut .* in every style, naming the time/);
  assert.match(readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8").replace(/\s+/g, " "), /a style author's own ending counts only when the Motion Plan names it and plays it in the last shot/);
});

test("the ending check: a hard cut on the last half second is flagged in every style, a fade is not; an author's ending may end dark, on a dot or held", async () => {
  assert.equal(endVerdict(40, 38).faded, false);
  assert.equal(endVerdict(40, 1).faded, true, "faded to a plain picture");
  assert.equal(endVerdict(40, 10).faded, true, "a quarter of the contrast left");
  assert.equal(endVerdict(2, 2).faded, true, "already plain before the end");
  assert.equal(endingGate(null, { own: true }).pass, true);
  // the light and the change: a lit last frame as bright as before and moving is a hard cut; dark or a dot ends; held ends an author's
  const lit = endVerdict(40, 38, { light: [36, 35], change: 30 });
  assert.deepEqual([lit.faded, lit.held], [false, false]);
  assert.equal(endVerdict(40, 30, { light: [36, 1.5], change: 30 }).faded, true, "powered down to a dot on black");
  assert.equal(endVerdict(40, 30, { light: [36, 10], change: 30 }).faded, true, "gone dark: under a third of the light");
  assert.equal(endVerdict(40, 38, { light: [36, 35], change: 1 }).held, true, "a held end card");
  const own = endingGate({ at: [109.5, 109.98], ...lit }, { own: true, author: "the CRT powers down to a dot", shot: 9 });
  assert.equal(own.pass, false, "an author's style: measured, a lit moving last frame flagged");
  assert.equal(own.warnings, 1);
  assert.equal(own.blocking, false);
  assert.equal(own.skipped, undefined);
  assert.match(own.findings[0].message, /stops dead at 109\.98 s: the author's ending \(the CRT powers down to a dot\) does not show/);
  assert.equal(own.findings[0].shot, 9);
  const held = { at: [109.5, 109.98], ...endVerdict(40, 38, { light: [36, 35], change: 1 }) };
  assert.equal(endingGate(held, { own: true }).pass, true, "an author's held end card ends the film");
  assert.equal(endingGate(held).pass, false, "the house ending fades: a held lit frame is a hard cut");
  assert.match(endingGate(held).findings[0].message, /its last frame \(109\.98 s\)/);
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
  // an author's style, on HyperFrames' own stills: lit and moving to the last frame (T24-12) is flagged; held, or down to a dot, is not
  const alive = make("alive", (c) => `${c(0, 1.7)}\n${c(1.7, 2, "transform:translateX(120px)")}`);
  const dot = make("dot", (c) => `${c(0, 1.7)}\n<div class="clip" data-start="1.7" data-duration="0.3" data-track-index="1" style="position:absolute;inset:0;background:#000"><div style="position:absolute;left:316px;top:176px;width:8px;height:8px;border-radius:50%;background:#fff"></div></div>`);
  const r3 = await measureEnding(alive, { total: 2, workDir: join(T, "w3") });
  const r4 = await measureEnding(dot, { total: 2, workDir: join(T, "w4") });
  assert.deepEqual([r3.faded, r3.held], [false, false], `lit and moving to the end: ${JSON.stringify(r3)}`);
  assert.equal(r1.held, true, `the same card to the end is held: ${r1.change}`);
  assert.equal(r4.faded, true, `down to a dot: ${JSON.stringify(r4)}`);
  const ga = endingGate(r3, { own: true, author: "the CRT powers down to a dot", shot: 9 });
  assert.equal(ga.pass, false);
  assert.match(ga.findings[0].message, /stops dead at 1\.98 s: the author's ending \(the CRT powers down to a dot\) does not show/);
  assert.equal(endingGate(r1, { own: true }).pass, true, "an author's held end card");
  assert.equal(endingGate(r1).pass, false, "a held lit frame in the house ending");
  assert.equal(endingGate(r4, { own: true }).pass, true, "an author's dot");
});

// Test 26 (30/10, "Cánh ong thêu dở", Hand embroidery): what the film's sounds taught the engine. T26-6: "thread pull" got a plug pulled
// out twelve times, "needle park" 4.3 s of a birds loop, a small wooden box a door, a wooden spool a footstep; one bee buzz played twelve
// times. T26-7: five cues ("thread tug", "thread knot", "wing flutter", "spool rattle", "thread unspool") were left out while the sound
// search did not answer, and "Place them again" left them out again. The network is never asked: stubs answer every search.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t26-sfx-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR ??= join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const sfx = await import("../packages/sfx/index.mjs");
const { autoSfx, capRepeats, withVariants, MAX_REPEATS } = await import("../packages/sfx/auto.mjs");
const { familyOf, findLocal, matchLocal, rankLocal, loadLibrary } = await import("../packages/sfx/library.mjs");
const { sfxCover } = await import("../packages/hf-qa/sfxCover.mjs");

const ROOT = '<div data-composition-id="root" data-width="1080" data-height="1080" data-duration="20">\n</div>';
let n = 0;
const project = (html = ROOT) => { const d = join(T, `p${++n}`); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "index.html"), html); return d; };
const searches = [];
const down = async (url) => { searches.push(String(url)); throw new Error("the search did not answer"); };
const hit = (id) => ({ id, title: `sound ${id}`, creator: "Someone", creator_url: null, license: "cc0", license_version: "1.0", license_url: "https://creativecommons.org/",
  foreign_landing_url: `https://freesound.org/s/${id}`, url: `https://cdn.freesound.org/previews/${id}.mp3`, duration: 800, attribution: `"sound ${id}" by Someone`, provider: "freesound" });
const up = async (url) => {
  searches.push(String(url));
  if (String(url).startsWith(sfx.OPENVERSE)) return Response.json({ results: [hit("0a1b2c3d-0000-4000-8000-000000000001")] });
  return new Response(readFileSync(sfx.bundled()[0].file));          // any real mp3 stands in for the download
};
const audio = (html, re) => [...html.matchAll(/<audio\b[^>]*>/g)].map((m) => m[0]).filter((t) => re.test(t));
const attr = (tag, k) => new RegExp(`\\b${k}="([^"]*)"`).exec(tag)?.[1];
const one = (name, opts = {}) => matchLocal(name, { oneShot: true, ...opts });

test("T26-6: a cue's sound is its thing's (the object noun weighs, not only the verb); loops and long recordings never serve a cue", () => {
  // the thing a cue is about decides its kind when no word of it names a sound
  assert.deepEqual(["thread pull", "needle park", "needle through cloth", "thread tug", "thread knot", "thread unspool", "wing flutter"].map(familyOf),
    ["cloth", "cloth", "cloth", "cloth", "cloth", "cloth", "cloth"]);
  assert.deepEqual(["small wooden box close", "wood spool roll", "spool rattle", "bee buzz", "soft wood thud"].map(familyOf), ["paper", "impact", "impact", "animal", "impact"]);
  // Test 26's names, as the placement looks them up
  const want = { "thread pull": /^cloth-(rustle|leather)-/, "thread tug": /^cloth-(rustle|leather)-/, "thread knot": /^cloth-(rustle|leather)-/, "thread unspool": /^cloth-rustle-/,
    "needle through cloth": /^cloth-(rustle|leather)-/, "needle park": /^cloth-/, "wing flutter": /^cloth-fabric-/, "small wooden box close": /^paper-book-close-/,
    "wood spool roll": /^impact-wood/, "spool rattle": /^impact-wood/, "wood spool slide": /^paper-slide-/, "bee buzz": /^animal-bug-/, "soft chime": /^bell-/ };
  for (const [name, re] of Object.entries(want)) {
    const m = one(name);
    assert.ok(m, `${name}: no sound`);
    for (const e of m.choices) assert.match(e.id, re, `${name} -> ${e.id}`);
    assert.ok(m.good || m.right, `${name}: the library's answer is enough, no search`);
  }
  // never a plug, a door, a footstep or a loop for them
  for (const name of Object.keys(want)) for (const e of one(name).choices) assert.ok(!/^(switch-plug|door-|footstep-|ambience-)/.test(e.id) && !e.loop, `${name} -> ${e.id}`);
  // a sewing film's repeats have more than one file to vary over
  assert.ok(one("thread pull").choices.length >= 3 && one("needle through cloth").choices.length >= 3);
  // a one-shot never gets a loop or a recording longer than a cue plays; a place's or a weather's sound is its ambience bed
  assert.ok(rankLocal("needle park", { oneShot: true }).every((r) => !r.entry.loop));
  assert.ok(rankLocal("rain", { oneShot: true }).every((r) => !r.entry.loop && r.entry.duration <= sfx.MAX_AUTO_S));
  assert.equal(one("rain"), null, "no thunder roll for a cue named rain");
  assert.equal(one("room tone"), null, "no beep for a room tone");
  assert.equal(findLocal("rain").loop, true, "the ambience bed still finds the loop");
  // a weak match of another kind falls back to its own kind's soft sound (or nothing): never a wrong specific one
  const g = one("silk swirl");
  assert.deepEqual([g.entry.family, g.generic, g.right, g.good], ["cloth", true, true, false]);
  assert.equal(one("kazoo solo"), null);
  // the tags the names need are in the catalog
  const tags = (id) => loadLibrary().sounds.find((s) => s.id === id).tags;
  for (const t of ["thread", "needle", "stitch", "tug", "knot", "unspool"]) assert.ok(tags("cloth-rustle-1").includes(t), t);
  assert.ok(tags("paper-book-close-1").includes("box close") && tags("cloth-fabric-1").includes("wing flutter") && tags("impact-wood-light-1").includes("spool"));
});

test("T26-7: every cue asks the library first; a search that does not answer never leaves a cue of a known kind out; Place them again looks again", async () => {
  const d = project();
  searches.length = 0;
  const names = ["thread tug", "thread knot", "wing flutter", "spool rattle", "thread unspool"];
  const r = await sfx.resolveCues(d, [...names, "camera flash tune", "kazoo solo"].map((name) => ({ name })), { fetchImpl: down, timeoutMs: 50, library: true });
  assert.deepEqual(r.added.filter((x) => names.includes(x)).sort(), [...names].sort(), "Test 26's five: all from the library");
  const asked = searches.map((u) => decodeURIComponent(new URL(u).searchParams.get("q") ?? ""));
  for (const x of names) assert.ok(!asked.includes(x), `${x} waited on the search`);
  // a name of no known kind went to the search; when it did not answer the library's best match stands in, said so; nothing at all: left out
  assert.ok(asked.includes("camera flash tune"));
  assert.ok(r.near.some((x) => x.name === "camera flash tune" && x.as && !/[-_/\\.]|\d/.test(x.as)), JSON.stringify(r.near));
  assert.equal(sfx.readState(d).sounds["camera flash tune"].weak, true);
  assert.deepEqual([r.missing, r.failed], [["kazoo solo"], ["kazoo solo"]]);
  assert.match(sfx.placedNote({ ...r, placed: 6, names: [...names, "camera flash tune"] }).text, /A close built-in sound stands in for now/);
  // Place them again, the search answering now: the stand-in and the cue left out are looked up again and found
  searches.length = 0;
  const again = await sfx.resolveCues(d, [...names, "camera flash tune", "kazoo solo"].map((name) => ({ name })), { fetchImpl: up, timeoutMs: 50, library: true });
  assert.deepEqual(again.added.filter((x) => !names.includes(x)).sort(), ["camera flash tune", "kazoo solo"]);
  assert.deepEqual([again.missing, again.near], [[], []]);
  const st = sfx.readState(d);
  assert.equal(st.sounds["kazoo solo"].source, "openverse");
  assert.equal(st.sounds["camera flash tune"].source, "openverse");
  assert.equal(st.sounds["thread tug"].source, "library", "the library's answers stay");
  // a search answering only with long recordings (a bed, not a cue): none of them, the library's match instead
  const d2 = project();
  const long = async (url) => (String(url).startsWith(sfx.OPENVERSE) ? Response.json({ results: [{ ...hit("0a1b2c3d-0000-4000-8000-000000000002"), duration: 95000 }] }) : new Response("x"));
  await sfx.resolveCues(d2, [{ name: "camera flash tune" }], { fetchImpl: long, timeoutMs: 50, library: true });
  assert.equal(sfx.readState(d2).sounds["camera flash tune"].source, "library");
});

test("an old pick the library would no longer give is replaced on the next placement (Test 26's plug and birds loop)", async () => {
  const d = project();
  // the state Test 26's placement left: the library's old answers
  const lib = loadLibrary(), old = (id) => lib.sounds.find((s) => s.id === id);
  sfx.useLibrarySound(d, "thread pull", [old("switch-plug-out-1")]);
  sfx.useLibrarySound(d, "needle park", [old("ambience-morning-birds-1")]);
  sfx.useLibrarySound(d, "small wooden box close", [old("door-close-1")]);
  searches.length = 0;
  await sfx.resolveCues(d, ["thread pull", "needle park", "small wooden box close"].map((name) => ({ name })), { fetchImpl: down, timeoutMs: 50, library: true });
  const st = sfx.readState(d);
  assert.match(st.sounds["thread pull"].id, /^library:cloth-/);
  assert.match(st.sounds["needle park"].id, /^library:cloth-/);
  assert.equal(st.sounds["needle park"].loop, false);
  assert.equal(st.sounds["small wooden box close"].id, "library:paper-book-close-1");
  assert.equal(searches.length, 0);
});

test("one file at most three times a film: repeats vary over every name's files, then the extra ones are left out (named kept first)", async () => {
  assert.equal(MAX_REPEATS, 3);
  const sounds = { buzz: { file: "a/bug.ogg" }, mine: { file: "a/mine.wav", source: "owner" }, step: { file: "a/step.ogg" } };
  const cues = [...Array.from({ length: 12 }, (_, i) => ({ id: `b${i}`, name: "buzz", start: i * 3, prio: i % 4 === 0 ? 0 : 2 })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `o${i}`, name: "mine", start: i })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `m:1:walk:${i}`, name: "step", family: "footstep", start: 1 + i * 0.45 }))];
  const { kept, thinned } = capRepeats(cues, sounds);
  const buzz = kept.filter((c) => c.name === "buzz");
  assert.deepEqual(buzz.map((c) => c.id), ["b0", "b4", "b8"], "the storyboard's three named ones");
  assert.ok(thinned.filter((c) => c.name === "buzz").every((c) => c.why === "repeat") && thinned.filter((c) => c.name === "buzz").length === 9);
  assert.equal(kept.filter((c) => c.name === "mine").length, 6, "the owner's own sound is never left out");
  assert.equal(kept.filter((c) => c.name === "step").length, 8, "a walk's steps are one use");
  // automatic ones only: three kept, spread over the film
  const spread = capRepeats(Array.from({ length: 10 }, (_, i) => ({ id: `x${i}`, name: "buzz", start: i, prio: 2 })), sounds).kept.map((c) => c.start);
  assert.deepEqual(spread, [0, 5, 9]);
  // variants: the least used file first, over every name that shares the library's files
  const shared = { a: { file: "r1", variants: [{ id: "r1", file: "r1" }, { id: "r2", file: "r2" }, { id: "l1", file: "l1" }] },
    b: { file: "r1", variants: [{ id: "r1", file: "r1" }, { id: "r2", file: "r2" }, { id: "l1", file: "l1" }] } };
  const v = withVariants(Array.from({ length: 9 }, (_, i) => ({ name: i % 2 ? "a" : "b", start: i })), shared).map((c) => c.variant);
  assert.deepEqual(["r1", "r2", "l1"].map((f) => v.filter((x) => x === f).length), [3, 3, 3]);
});

test("a film placed: no file more than three times, the cues of Test 26 all sound, the ending's fade takes the sounds in it", async () => {
  // twelve shots of 1.5 s: the storyboard's thread pulls and bee buzzes in every one, a box and a needle at the end, the music fading 2.5 s
  const shots = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, index: i, start: i * 1.5, duration: 1.5, transitionIn: "cut",
    sfx: i === 11 ? "needle park@0.3, small wooden box close@1.2" : `thread pull@0.1, bee buzz@0.8${i % 3 === 0 ? ", thread tug@1.2" : ""}` }));
  const html = ROOT.replace('data-duration="20"', 'data-duration="18"').replace("\n", '\n<audio id="el-music" src="m.mp3" data-start="0" data-duration="18" data-fade-out="2.5"></audio>\n');
  const d = project(html);
  writeFileSync(join(d, "m.mp3"), readFileSync(sfx.bundled()[0].file));
  searches.length = 0;
  const plan = { shots: shots.map((s) => ({ shot: s.number, motions: [{ id: "buzz", type: "other", start: 0.8, duration: 0.3, behavior: "the bee buzzes", sound: "bee buzz" }] })) };
  const r = await autoSfx(d, shots, plan, { fetchImpl: down, timeoutMs: 50 });
  assert.deepEqual([r.missing, searches.length], [[], 0]);
  const st = sfx.readState(d), uses = new Map();
  for (const m of st.mounted) uses.set(m.file, (uses.get(m.file) ?? 0) + 1);
  assert.ok(Math.max(...uses.values()) <= MAX_REPEATS, JSON.stringify([...uses]));
  assert.ok(st.mounted.some((m) => m.name === "thread pull") && st.mounted.some((m) => m.name === "bee buzz"));
  assert.ok(st.thinned.some((t) => t.why === "repeat"), "the repeats past three are listed as thinned");
  assert.ok(!st.mounted.some((m) => /ambience|switch-plug|door-close/.test(m.file)));
  // the needle at 16.8 s and the box at 17.7 s sit in the ending's 2.5 s fade (from 15.5 s): quieter, and faded out
  const tags = audio(readFileSync(join(d, "index.html"), "utf8"), /el-sfx-/);
  const at = (s) => tags.find((t) => Math.abs(Number(attr(t, "data-start")) - s) < 0.06);
  const box = at(17.7), needle = at(16.8);
  assert.ok(box && needle, tags.join("\n"));
  assert.ok(Number(attr(box, "data-fade-out")) > 0 && Number(attr(needle, "data-fade-out")) > 0);
  const full = (name) => st.sounds[name].volume;
  assert.ok(Number(attr(box, "data-volume")) < full("small wooden box close") / 2, `${attr(box, "data-volume")} vs ${full("small wooden box close")}`);
  assert.ok(Number(attr(box, "data-start")) + Number(attr(box, "data-duration")) <= 18 + 1e-6);
  // G-SFX: a repeat left out counts as placed
  assert.deepEqual(sfxCover(d, shots, plan).findings, []);
  assert.ok(existsSync(join(d, "CREDITS.md")));
});

test("Claude is told to name a sound by its thing, and that one sound plays at most three times", async () => {
  const rule = readFileSync(join(import.meta.dirname, "..", "config", "rules", "moworks-studio", "SKILL.md"), "utf8");
  assert.match(rule, /name what is heard: the thing and its sound/i);
  assert.match(rule, /at most three times/);
  const plan = await import("../packages/motion-plan/index.mjs");
  assert.match(plan.SOUND_PROMPT, /the thing and its sound/);
});

test("T26-8 (and Test 25): Tech checks names the motion that has no sound, each in its own line, as Render does", async () => {
  const { gateSfx } = await import("../packages/hf-qa/sfxCover.mjs");
  const { groupFindings } = await import("../packages/hf-qa/look.mjs");
  const g = project(ROOT.replace('data-duration="20"', 'data-duration="8"'));
  writeFileSync(join(g, "STORYBOARD.md"), "# Storyboard\n\n## Frame 1 — Hoop\n- duration: 4s\n\n## Frame 2 — Wreath\n- duration: 4s\n");
  writeFileSync(join(g, "MOTION-PLAN.json"), JSON.stringify({ version: 1, shots: [
    { shot: 1, motions: [{ id: "a", name: "Chỉ giật lại", target: "#t", type: "other", start: 0.5, duration: 0.3, behavior: "the thread tugs back", sound: "thread tug" }] },
    { shot: 2, motions: [{ id: "b", name: "Cuộn chỉ lăn", target: "#s", type: "other", start: 1, duration: 0.5, behavior: "the spool rolls", sound: "wood spool roll" }] }] }));
  sfx.mount(g, []);
  const gate = await gateSfx(g);
  assert.equal(gate.findings.length, 2);
  assert.match(gate.findings[0].plain, /^Shot 1 at 0\.5 s: "Chỉ giật lại" \(a motion\) has no sound \(the app's would be "thread tug"\)/);
  assert.match(gate.findings[1].plain, /"Cuộn chỉ lăn" .* "wood spool roll"/);
  // never merged under one motion's words
  assert.equal(groupFindings(gate.findings).length, 2);
});

// Test 25 (30/10, "Một chấm cho ngày mai", mg Flat Vector, 75 s): 59 effects in 68 s felt a bit busy; two pops sat at one moment (1.56 s,
// 62.74 s: two named pops inside one spoken word, both moved to the pause after it); "stomach growl" was left out while the search was down.
test("Test 25: two cues of one kind at one moment are one sound; a small move never within 0.3 s of another sound, the bigger action leads", async () => {
  const A = await import("../packages/sfx/actions.mjs");
  const { afterWords, planCues } = await import("../packages/sfx/auto.mjs");
  // the storyboard's two pops inside one word: moved to the same pause, then merged (a whoosh at that moment stays: another kind)
  const named = [{ id: "sb:11:pop@3.35", name: "pop", family: "pop", start: 62.25, prio: 0 }, { id: "sb:11:pop@3.5", name: "pop", family: "pop", start: 62.4, prio: 0 },
    { id: "sb:11:whoosh@3.5", name: "whoosh", family: "whoosh", start: 62.4, prio: 0 }];
  const moved = afterWords(named, [{ text: "bánh", start: 62.2, end: 62.7 }]);
  assert.deepEqual(moved.map((c) => c.start), [62.74, 62.74, 62.74]);
  const t = A.thin(moved);
  assert.deepEqual(t.kept.map((c) => c.id), ["sb:11:pop@3.35", "sb:11:whoosh@3.5"]);
  assert.deepEqual(t.thinned.map((c) => [c.id, c.why]), [["sb:11:pop@3.5", "same moment"]]);
  // through the whole mix: no two cues of one kind closer than a frame
  const shots = [{ number: 1, index: 0, start: 0, duration: 4, sfx: "pop@1.35, pop@1.5, soft pop@1.5" }];
  const { kept } = planCues(shots, null, { words: [{ text: "chấm", start: 1.3, end: 1.52 }] });
  for (const c of kept) assert.ok(!kept.some((k) => k !== c && Math.abs(k.start - c.start) < A.SAME_MOMENT_S && (k.name === c.name || k.family === c.family)), JSON.stringify(kept));
  // small moves: one within 0.3 s, and never on top of a bigger action of their tier (it is processed first, whatever the order given)
  const small = (id, start, prio = 2) => ({ id, name: "soft pop", family: "pop", start, prio, small: true });
  const busy = A.thin([small("s1", 1.0), small("s2", 1.15), small("s3", 1.25), { id: "big", name: "impact wood", family: "impact", start: 2.1, prio: 2 }, small("s4", 2.0), small("s5", 2.6)]);
  assert.deepEqual(busy.kept.map((c) => c.id), ["s1", "big", "s5"]);
  assert.deepEqual(Object.fromEntries(busy.thinned.map((c) => [c.id, c.why])), { s2: "small", s3: "small", s4: "small" });
  // lively stays the default and keeps every bigger action of a busy second
  assert.equal((await import("../packages/sfx/prefs.mjs")).DEFAULT_DENSITY, "lively");
});

test("Test 25: a cue the search could not look up takes the library's best match of its kind instead of being left out (\"stomach growl\")", async () => {
  assert.equal(familyOf("stomach growl"), "water");
  assert.equal(one("stomach growl").entry.id, "water-bubbles-1");
  assert.equal(one("belly laugh"), null, "a laugh is no gurgle");
  const d = project();
  searches.length = 0;
  const r = await sfx.resolveCues(d, ["stomach growl", "chain slip", "pencil scribble"].map((name) => ({ name })), { fetchImpl: down, timeoutMs: 50, library: true });
  assert.deepEqual([r.added.sort(), r.missing, searches.length], [["chain slip", "pencil scribble", "stomach growl"], [], 0]);
  const st = sfx.readState(d);
  assert.deepEqual(["stomach growl", "chain slip", "pencil scribble"].map((n) => st.sounds[n].id), ["library:water-bubbles-1", "library:mechanical-keys-1", st.sounds["pencil scribble"].id]);
  assert.match(st.sounds["pencil scribble"].id, /^library:paper-handle-/);
});

// Test 27 (30/10, koi pond, 75 s): names matched by a shared word, not by their meaning: "rubber boot hop" took a computer's power-on ten
// times, "fish turn" a page turn, "water swirl" a boiling kettle and a drink, "whoosh up" a sword, "hair clip click" a camera's shutter.
test("Test 27: a word of another meaning never decides the sound; a name only its family's word matches gets the family's plain sound", () => {
  for (const name of ["rubber boot hop", "rubber boot squeak", "rubber boot step"]) {
    const m = one(name);
    assert.equal(m.entry.family, "footstep", `${name} -> ${m.entry.id}`);
    assert.ok(m.good || m.right);
  }
  assert.match(one("computer boots up").entry.id, /^electronic-power-on-/, "a computer still boots up");
  assert.ok(one("fish turn").choices.every((e) => /^water-splash-small-/.test(e.id)), "a fish turns in water, never a page");
  for (const name of ["water swirl", "water glide", "water dip"]) assert.ok(one(name).choices.every((e) => /^water-splash-small-/.test(e.id)), name);
  for (const name of ["whoosh up", "small whoosh"]) assert.ok(one(name).choices.every((e) => /^whoosh-air-(soft|short)-/.test(e.id)), name);
  assert.ok(!one("hair clip click").choices.some((e) => /camera|clock/.test(e.id)));
  assert.ok(!one("click").choices.some((e) => /camera/.test(e.id)), "a plain click is no camera shutter");
  assert.equal(one("night insects"), null, "a place's insects are its ambience bed");
  // variants that differ only by size stay variants of each other
  assert.ok(one("impact wood").choices.length >= 3 && one("soft whoosh").choices.length >= 2);
});

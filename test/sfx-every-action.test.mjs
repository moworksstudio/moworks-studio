// A sound on every action (owner 30/10: "every film in every style must have full sound effects on every action in the film, for a lively
// mood"): the action -> sound mapping, the density limits instead of two a shot, the levels by family, the ambience beds and their fades,
// the owner's choices that hold on every placement (Test 24: "no whoosh" came back), the offline library before the search, the credits,
// and the G-SFX check. The network is never asked: a stub records every search.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-sfx-every-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR ??= join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const A = await import("../packages/sfx/actions.mjs");
const sfx = await import("../packages/sfx/index.mjs");
const { autoSfx, autoCues, mixCues, planCues, withVariants } = await import("../packages/sfx/auto.mjs");
const P = await import("../packages/sfx/prefs.mjs");
const { findAmbience, matchLocal, familyOf } = await import("../packages/sfx/library.mjs");
const { sfxCover, gateSfx } = await import("../packages/hf-qa/sfxCover.mjs");

const ROOT = '<div data-composition-id="root" data-width="1920" data-height="1080" data-duration="30">\n</div>';
let n = 0;
const project = (html = ROOT) => { const d = join(T, `p${++n}`); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "index.html"), html); return d; };
const searches = [];
const offline = async (url) => { searches.push(String(url)); throw new Error("offline"); };
const audio = (html, re) => [...html.matchAll(/<audio\b[^>]*>/g)].map((m) => m[0]).filter((t) => re.test(t));
const attr = (tag, k) => new RegExp(`\\b${k}="([^"]*)"`).exec(tag)?.[1];

// a film of three shots: a kitchen (two shots), then a rainy street; every kind of action
const SHOTS = [{ number: 1, index: 0, start: 0, duration: 8, location: "Kitchen", sfx: "lamp ting@2" }, { number: 2, index: 1, start: 8, duration: 8, location: "Kitchen" },
  { number: 3, index: 2, start: 16, duration: 14, location: "rainy street", transitionIn: "hard cut" }];
const PLAN = { shots: [
  { shot: 1, motions: [{ id: "a", type: "entrance", start: 0.4, duration: 0.6, target: "#title", behavior: "the title rises in" },
    { id: "b", type: "text", start: 1.2, duration: 1.5, behavior: "the caption types out" },
    { id: "c", type: "other", start: 3, duration: 0.5, behavior: "the cup drops onto the wooden table" },
    { id: "d", type: "exit", start: 7, duration: 0.5, behavior: "the card flies off" }] },
  { shot: 2, motions: [{ id: "e", type: "other", start: 0.5, duration: 2, behavior: "Mira walks to the door" },
    { id: "f", type: "other", start: 3, duration: 1, behavior: "the door opens", sound: "door creak" },
    { id: "g", type: "emphasis", start: 5, duration: 0.5, behavior: "the logo pulses gently" }] },
  { shot: 3, motions: [{ id: "h", type: "entrance", start: 1, duration: 0.5, behavior: "stars sparkle" }, { id: "i", type: "loop", start: 0, duration: 14, behavior: "sways" },
    { id: "j", type: "exit", start: 6, duration: 0.6, behavior: "the umbrella slides out" }] }] };

test("mapping: every visible action gets a sound of its kind, at its moment, in its material", () => {
  const s = (type, behavior, extra = {}) => A.motionSound({ type, behavior, start: 0, duration: 1, ...extra });
  const want = [
    ["entrance", "the title rises in", "pop", "pop"], ["text", "the headline appears", "soft pop", "pop"], ["exit", "the badge leaves", "whoosh out", "whoosh"],
    ["entrance", "the panel slides in from the left", "light swish", "whoosh"], ["other", "the cup drops onto the wooden table", "impact wood", "impact"],
    ["other", "the sword hits the metal pipe", "impact metal", "impact"], ["entrance", "the glass shatters", "impact glass", "impact"],
    ["other", "the hero falls to the ground", "body thud", "impact"], ["other", "Mira walks across the room", "footstep wood", "footstep"],
    ["other", "the door opens", "door open", "door"], ["other", "the drawer closes", "drawer close", "door"], ["other", "the book opens", "book open", "paper"],
    ["other", "the page turns", "page turn", "paper"], ["other", "the map unfolds", "paper fold", "paper"], ["other", "she pours tea into the cup", "water pour", "water"],
    ["text", "the caption types out letter by letter", "typing", "typing"], ["other", "the button is pressed", "click", "click"],
    ["entrance", "stars sparkle around the logo", "sparkle", "magic"], ["emphasis", "the orb glows", "magic shimmer", "magic"], ["other", "the bell rings", "bell ding", "bell"],
    ["other", "the gears turn", "gears", "mechanical"], ["other", "the screen beeps", "beep", "electronic"], ["other", "the candle flame flickers", "match strike", "fire"],
    ["other", "the scarf waves in the wind", "cloth rustle", "cloth"], ["other", "the lamp turns on", "light switch", "switch"],
    ["other", "Bảo bước tới cửa sổ", "footstep wood", "footstep"], ["transition", "wipe to the next panel", "whoosh", "whoosh"],
  ];
  for (const [type, behavior, name, family] of want) {
    const r = s(type, behavior);
    assert.deepEqual([r?.name, r?.family], [name, family], `${type}: ${behavior}`);
  }
  // a landing sounds when it lands (the row's end), a walk steps, a typing lasts as long as its motion, a small move is quieter
  assert.equal(s("other", "the box drops in with a bounce").end, true);
  assert.equal(s("other", "Mira walks to the door").steps, true);
  assert.equal(s("text", "types out").hold, true);
  assert.equal(s("emphasis", "the logo pulses gently").small, true);
  assert.equal(s("entrance", "fades in").small, true);
  // what makes no sound: a loop, a plain camera move, a drop shadow is no drop, "step 2" is no footstep, the noun "type" no typing
  assert.equal(s("loop", "the background sways"), null);
  assert.equal(s("camera", "slow push in"), null);
  assert.equal(s("camera", "whip pan to the right").name, "whoosh");
  assert.equal(s("entrance", "drop shadow appears under the card").family, "pop");
  assert.equal(s("entrance", "step 2 appears").family, "pop");
  assert.notEqual(s("entrance", "the type block slides in").family, "typing");
  // the style's material: a cartoon bounce boings; a family the style or the owner keeps out falls back to the row's kind
  assert.equal(A.motionSound({ type: "other", behavior: "the ball bounces", start: 0, duration: 1 }, { style: "cartoon" }).name, "boing");
  assert.deepEqual(A.motionSound({ type: "exit", behavior: "the card flies off" }, { allow: (f) => f !== "whoosh" && f !== "paper" }), { at: "start", small: false, name: "soft pop", family: "pop" });
  // the Motion Plan's own sound wins; "none" is silent; the automatic one stands by
  assert.deepEqual([s("other", "the door opens", { sound: "Door Creak" }).name, s("other", "the door opens", { sound: "none" }).none], ["door creak", true]);
  const cues = A.motionCues({ number: 2, index: 1, start: 8, duration: 8 }, PLAN.shots[1].motions);
  assert.deepEqual(cues.filter((c) => c.id === "m:2:f").map((c) => [c.name, c.prio, !!c.alt]), [["door creak", 1, false], ["door open", 2, true]]);
  const steps = cues.filter((c) => c.id.startsWith("m:2:e:"));
  assert.equal(steps.length, 5, "a 2 s walk: a step every 0.45 s");
  assert.deepEqual(steps.map((c) => c.start), [8.5, 8.95, 9.4, 9.85, 10.3]);
  // the style hint from the style's own sound section, else its name
  assert.equal(A.styleHint({ palette: "- Foley: relays, keys, teletype ticks, BEL, a dot matrix printer" }), "electronic");
  assert.equal(A.styleHint({ id: "brush-cartoon" }), "cartoon");
  assert.equal(A.styleHint({ palette: "Gouache washes, soft brushes" }), "organic");
  assert.equal(A.styleHint({ palette: "paper cut-outs on a wooden desk" }), "paper");
  assert.equal(A.styleHint({ id: "hf-explainer" }), null);
});

test("density: no cap of two a shot; about three sounds a second, never two of one family closer than 0.2 s; named, then plan, then auto", () => {
  // eight entrances in 2 s: lively keeps about three a second
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `a${i}`, name: "pop", family: i % 2 ? "pop" : "whoosh", start: i * 0.25, prio: 2 }));
  const lively = A.thin(many, "lively");
  assert.ok(lively.kept.length >= 5 && lively.kept.length <= 7, `${lively.kept.length} kept`);
  for (const c of lively.kept) assert.ok(lively.kept.filter((k) => Math.abs(k.start - c.start) < 0.5).length <= 3, "at most three in a second around each");
  assert.ok(A.thin(many, "low").kept.length < A.thin(many, "normal").kept.length && A.thin(many, "normal").kept.length < lively.kept.length);
  // the same family closer than 0.2 s is one sound; two families at one moment are two
  assert.deepEqual(A.thin([{ id: 1, family: "pop", start: 1, prio: 2 }, { id: 2, family: "pop", start: 1.1, prio: 2 }, { id: 3, family: "impact", start: 1.1, prio: 2 }]).kept.map((c) => c.id), [1, 3]);
  // a planned sound wins over an automatic one at the same moment; the storyboard's own are never thinned; low drops small moves
  const mix = A.thin([{ id: "auto", family: "pop", start: 2, prio: 2 }, { id: "plan", family: "door", start: 2.1, prio: 1 }, { id: "named", family: "bell", start: 2, prio: 0 },
    { id: "named2", family: "bell", start: 2.05, prio: 0 }, { id: "small", family: "pop", start: 5, prio: 2, small: true }], "low");
  assert.deepEqual(mix.kept.map((c) => c.id).sort(), ["named", "named2"]);
  assert.deepEqual(Object.fromEntries(mix.thinned.map((c) => [c.id, c.why])), { plan: "same moment", auto: "same moment", small: "small" });
  // the film above: every action of a shot is placed (Test 20's two a shot is gone)
  const kept = mixCues(SHOTS, PLAN);
  assert.ok(kept.filter((c) => c.shot === 1).length >= 5, kept.filter((c) => c.shot === 1).map((c) => c.name).join());
  assert.equal(kept.filter((c) => c.name === "lamp ting").length, 1, "the storyboard's named cue");
});

test("levels by family: under the music and the voice, small moves quieter; repeats of one sound vary", async () => {
  assert.deepEqual([A.levelOf("click"), A.levelOf("pop"), A.levelOf("footstep"), A.levelOf("whoosh"), A.levelOf("impact"), A.levelOf("magic"), A.levelOf("ambience")],
    [0.2, 0.25, 0.25, 0.3, 0.45, 0.3, 0.12]);
  assert.equal(A.levelOf("no such family"), A.LEVEL);
  assert.equal(A.mixShift({ bed: -16 }), 4);
  assert.equal(A.mixShift({ bed: -40 }), -6, "at most 6 dB either way");
  assert.equal(A.mixShift({ voice: -20 }), -2);
  assert.equal(A.mixShift({}), 0);
  // mount: a sound's family level with no measured one, a small move's cue at 0.6 of it
  const d = project();
  mkdirSync(join(d, "assets"), { recursive: true });
  writeFileSync(join(d, "assets", "x.wav"), "x");
  mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, ".moworks", "sfx.json"), JSON.stringify({ sounds: { pop: { file: "assets/x.wav", durationS: 0.3, family: "pop" }, hit: { file: "assets/x.wav", durationS: 0.3, family: "impact" } } }));
  sfx.mount(d, [{ name: "pop", start: 1, offset: 0 }, { name: "pop", start: 2, offset: 0, gain: A.SMALL_GAIN }, { name: "hit", start: 3, offset: 0 }]);
  const tags = audio(readFileSync(join(d, "index.html"), "utf8"), /el-sfx-/);
  assert.deepEqual(tags.map((t) => attr(t, "data-volume")), ["0.25", "0.15", "0.45"]);
  // lanes: one lane while the sounds do not overlap (a sound on every action keeps a few lanes, never one a cue)
  assert.deepEqual(tags.map((t) => attr(t, "data-track-index")), ["20", "20", "20"]);
  // variants: never the same file twice in a row
  const sounds = { pop: { variants: [{ id: "a" }, { id: "b" }, { id: "c" }] } };
  const v = withVariants(Array.from({ length: 9 }, (_, i) => ({ name: "pop", start: i })), sounds).map((c) => c.variant);
  assert.ok(v.every((x, i) => i === 0 || x !== v[i - 1]), v.join());
  assert.ok(new Set(v).size >= 2);
});

test("the offline library first: a good match never goes to the search, a loose one only when the search finds nothing, an older pick replaced", async () => {
  const d = project();
  searches.length = 0;
  const r = await sfx.resolveCues(d, ["door open", "footstep wood", "lamp ting", "crt power on"].map((name) => ({ name })), { fetchImpl: offline, library: true });
  assert.deepEqual(r.added.sort(), ["crt power on", "door open", "footstep wood", "lamp ting"]);
  assert.equal(searches.length, 0, "no search for a name the library matches well");
  const st = sfx.readState(d);
  assert.equal(st.sounds["door open"].source, "library");
  assert.match(st.sounds["door open"].file, /^assets\/3_audio\/sfx\/door-open-\d\.ogg$/);
  assert.ok(existsSync(join(d, ...st.sounds["door open"].file.split("/"))));
  assert.ok(st.sounds["footstep wood"].variants.length >= 2, "its variants, for repeats");
  // a name the library has only words of its kind for goes to the search; with no answer the loose match stands in, looked up again later
  assert.equal(matchLocal("wobbly jelly boing")?.good ?? false, true);
  const loose = matchLocal("gong of doom");
  assert.ok(loose && loose.entry.family === "bell");
  // an older pick of HF's set (the search's or the bundled one) gives way to the library's
  const d2 = project();
  await sfx.useSound(d2, "whoosh", sfx.bundled().find((b) => b.title === "whoosh"));
  assert.equal(sfx.readState(d2).sounds.whoosh.source, "pixabay");
  await sfx.resolveCues(d2, [{ name: "whoosh" }], { fetchImpl: offline, library: true });
  assert.equal(sfx.readState(d2).sounds.whoosh.source, "library");
  // without library (the storyboard-only pass) nothing changes
  const d3 = project();
  await sfx.resolveCues(d3, [{ name: "whoosh" }], { fetchImpl: offline, online: false });
  assert.equal(sfx.readState(d3).sounds.whoosh.source, "pixabay");
  // the families the library knows
  assert.deepEqual([familyOf("lamp ting"), familyOf("whoosh out"), familyOf("footstep wood")], ["bell", "whoosh", "footstep"]);
});

test("ambience: a loop per place, crossfaded at a change of place, faded in at the start and out with the ending's fade, ducked under words", async () => {
  const find = (q) => findAmbience(q);
  assert.equal(find("room tone").id, "ambience-room-tone-1");
  assert.equal(find("steady rain").id, "rain-loop-1");
  assert.equal(find("sky"), null, "never a loop matched only by \"ambience\"");
  assert.deepEqual(A.placeOf({ ambience: "none" }), { none: true });
  assert.equal(A.placeOf({ ambience: "forest at night" }).query, "forest at night");
  assert.equal(A.placeOf({ location: "Kitchen" }).query, "room tone");
  assert.equal(A.placeOf({ title: "Rain on the window" }).query, "steady rain");
  assert.equal(A.placeOf({ sound: "tiếng mưa rơi trên mái" }).query, "steady rain");
  assert.equal(A.placeOf({ title: "Data grows" }), null, "a motion-graphics shot keeps no bed");
  const beds = A.ambienceBeds(SHOTS, { find, filmEnd: 30, endFade: 3.2 });
  assert.equal(beds.length, 2, "two kitchen shots are one bed");
  assert.deepEqual(beds.map((b) => [b.entry.id, b.start, b.end, b.fadeIn, b.fadeOut]), [["ambience-room-tone-1", 0, 16.5, 1, 1], ["rain-loop-1", 15.5, 30, 1, 3.2]]);
  // a bed longer than its loop: equal clips crossfaded, the last ending with the bed's fade
  const t = A.tiles(beds[0], 8.536);
  assert.equal(t.length, 3);
  assert.ok(t.every((x, i) => i === 0 || Math.abs(t[i - 1].start + t[i - 1].duration - x.start - 1) < 0.01), "each overlaps the next by the crossfade");
  assert.equal(t.at(-1).start + t.at(-1).duration, 16.5);
  // the duck: 6 dB down while words are spoken, back after
  const lane = A.duckLane({ start: 2, duration: 10 }, A.speechSpans([{ start: 1, end: 1.5 }, { start: 1.6, end: 3 }, { start: 6, end: 7 }]));
  assert.deepEqual(lane.lanes[0].points.map((p) => [p.t, p.v]), [[0, 0.5], [1, 0.5], [1.4, 1], [3.85, 1], [4, 0.5], [5, 0.5], [5.4, 1], [10, 1]]);
  assert.equal(A.duckLane({ start: 20, duration: 5 }, [{ start: 1, end: 2 }]), null);
  // placed by the app: own lanes (12-14), the last bed's fade from the plan's ending, HF's data-automation under the voice
  const d = project();
  writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, ending: { kind: "fade", fade: 3.6, inside: false }, shots: [] }));
  const r = await autoSfx(d, SHOTS, PLAN, { fetchImpl: offline, timeoutMs: 50 });
  assert.equal(r.ambience, 2);
  const html = readFileSync(join(d, "index.html"), "utf8"), amb = audio(html, /el-amb-/);
  assert.ok(amb.length >= 3);
  assert.ok(amb.every((x) => Number(attr(x, "data-track-index")) >= 12 && Number(attr(x, "data-track-index")) <= 14));
  assert.equal(attr(amb[0], "data-start"), "0");
  assert.equal(attr(amb.at(-1), "data-fade-out"), "3.6", "the ending's fade, from the plan");
  assert.equal(Number(attr(amb.at(-1), "data-start")) + Number(attr(amb.at(-1), "data-duration")), 30, "it ends with the film");
  assert.equal(attr(amb.at(-1), "data-volume"), "0.48", "a quiet bed: a -28 LUFS loop at the ambience level");
  assert.match(readFileSync(join(d, "CREDITS.md"), "utf8"), /\*\*ambience: steady rain\*\* \(`assets\/3_audio\/sfx\/rain-loop-1\.ogg`\): "rain-loop-1", from /);
  // under a voice-over: the bed ducks (HF's volume lane, written with &quot;)
  const dv = project(ROOT.replace("\n", '\n<audio id="el-voice" src="vo.wav" data-start="0"></audio>\n'));
  writeFileSync(join(dv, "transcript.json"), JSON.stringify([{ text: "hello", start: 2, end: 2.5 }, { text: "rain", start: 18, end: 18.6 }]));
  await autoSfx(dv, SHOTS, PLAN, { fetchImpl: offline, timeoutMs: 50 });
  const ducked = audio(readFileSync(join(dv, "index.html"), "utf8"), /el-amb-/).filter((x) => /data-automation=/.test(x));
  assert.ok(ducked.length >= 1);
  assert.match(ducked[0], /data-automation="\{&quot;version&quot;:1,&quot;lanes&quot;:\[\{&quot;target&quot;:&quot;volume&quot;/);
});

test("the owner's choices hold on every placement: no whoosh stays off (named ones too), one sound taken out, no ambience, the density; silence", async () => {
  const shots = [{ number: 1, index: 0, start: 0, duration: 4, sfx: "whoosh@1", location: "kitchen" }, { number: 2, index: 1, start: 4, duration: 4, transitionIn: "whip pan", location: "street" }];
  const plan = { shots: [{ shot: 1, motions: [{ id: "x", type: "exit", start: 2, duration: 0.5, behavior: "the card flies off" }, { id: "y", type: "entrance", start: 0.3, behavior: "the title" }] }] };
  const d = project();
  const first = await autoSfx(d, shots, plan, { fetchImpl: offline, timeoutMs: 50 });
  assert.ok(first.names.includes("whoosh"));
  // the owner: "no whoosh" (Claude's sfx_prefs tool writes it)
  assert.deepEqual(P.updatePrefs(d, { off: ["whooshes"] }).off, ["whooshes"]);
  for (let k = 0; k < 2; k++) {          // placed again, and again: it stays off
    const r = await autoSfx(d, shots, plan, { fetchImpl: offline, timeoutMs: 50 });
    const st = sfx.readState(d);
    assert.ok(!st.mounted.some((m) => m.family === "whoosh" || /whoosh|swish/.test(m.name)), st.mounted.map((m) => m.name).join());
    assert.ok(r.names.includes("soft pop") || r.names.includes("paper slide"), "the exit still sounds, as something else");
  }
  // one sound taken out in the Final Mix (by its id), kept out; brought back
  const st = sfx.readState(d), pop = st.mounted.find((m) => m.name === "pop");
  P.updatePrefs(d, { skip: [pop.id] });
  await autoSfx(d, shots, plan, { fetchImpl: offline, timeoutMs: 50 });
  assert.ok(!sfx.readState(d).mounted.some((m) => m.id === pop.id));
  P.updatePrefs(d, { unskip: true, on: ["whoosh"] });
  assert.deepEqual(P.readPrefs(d), {});
  // no ambience
  P.updatePrefs(d, { ambience: false });
  const r2 = await autoSfx(d, shots, plan, { fetchImpl: offline, timeoutMs: 50 });
  assert.equal(r2.ambience, 0);
  assert.equal(audio(readFileSync(join(d, "index.html"), "utf8"), /el-amb-/).length, 0);
  // silence: the owner's "all", the brief, the style's sound section
  P.updatePrefs(d, { off: ["all"] });
  const r3 = await autoSfx(d, shots, plan, { fetchImpl: offline, timeoutMs: 50 });
  assert.deepEqual([r3.placed, r3.silent], [0, "owner"]);
  assert.equal(audio(readFileSync(join(d, "index.html"), "utf8"), /el-sfx-/).length, 0);
  assert.match(sfx.placedNote(r3).text, /No sound effects placed/);
  assert.equal(P.soundPolicy({ brief: "A calm piece. No sound effects, only the music." }).silent, "brief");
  assert.equal(P.soundPolicy({ palette: "Silence only: no sound effects." }).silent, "style");
  assert.equal(P.soundPolicy({ brief: "Không có hiệu ứng âm thanh." }).silent, "brief");
  assert.equal(P.soundPolicy({ brief: "minimal sound effects please" }).density, "low");
  assert.equal(P.soundPolicy({ palette: "- Foley: subtle paper rustles" }).density, "lively", "a quiet palette is not a sparse one");
  assert.deepEqual(P.soundPolicy({}), { silent: null, density: "lively", ambience: true });
  // isOff: a family by any of its words, a name by its words
  assert.equal(P.isOff({ off: ["swoosh"] }, { name: "whoosh out", family: "whoosh" }), true);
  assert.equal(P.isOff({ off: ["footsteps"] }, { name: "footstep wood", family: "footstep" }), true);
  assert.equal(P.isOff({ off: ["door creak"] }, { name: "old door creak", family: "door" }), true);
  assert.equal(P.isOff({ off: ["door creak"] }, { name: "door open", family: "door" }), false);
  assert.match(P.prefsText({ off: ["whoosh"], ambience: false, density: "low" }), /off: whoosh; no ambience; density low/);
});

test("credits: the library's sounds from its catalog source, one line a file (its variants each)", async () => {
  const d = project();
  searches.length = 0;
  await autoSfx(d, SHOTS, PLAN, { fetchImpl: offline, timeoutMs: 50 });
  const credits = readFileSync(join(d, "CREDITS.md"), "utf8"), st = sfx.readState(d);
  const files = new Set([...st.mounted.map((m) => m.file), ...st.ambience.placed.map((a) => a.file)]);
  for (const f of files) assert.ok(credits.includes(`\`${f}\``), `${f} credited`);
  assert.match(credits, /CC0 1\.0 \(https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/\)\. Source: https:\/\/(kenney\.nl|opengameart\.org)/);
  assert.match(credits, /original file: [^;]+; adapted: /);
  assert.equal(credits.match(/<!-- mw:sfx-credits -->/g).length, 1);
  assert.equal(searches.filter((u) => u.startsWith(sfx.OPENVERSE)).length, 0, "a film of common actions never asks the search");
});

test("G-SFX: a visible motion with no sound is listed, unless the owner, the brief or the style asks for silence or keeps that kind out", async () => {
  const d = project();
  assert.deepEqual(sfxCover(d, SHOTS, PLAN), { ran: false, findings: [] }, "nothing before the sounds are placed");
  assert.equal(await gateSfx(d), null);
  await autoSfx(d, SHOTS, PLAN, { fetchImpl: offline, timeoutMs: 50 });
  assert.deepEqual(sfxCover(d, SHOTS, PLAN).findings, [], "every action placed: nothing to say");
  // the plan gains a motion after the placement (a chat change): its landing has no sound
  const later = structuredClone(PLAN);
  later.shots[2].motions.push({ id: "k", name: "Chiếc ô", type: "other", start: 9, duration: 0.4, behavior: "the umbrella drops onto the stone steps" });
  const r = sfxCover(d, SHOTS, later);
  assert.deepEqual(r.findings.map((x) => [x.shot, x.time, x.motion, x.want]), [[3, 25.4, "Chiếc ô", "impact stone"]]);
  // a family the owner keeps out is no gap; small moves and loops never are
  P.updatePrefs(d, { off: ["impact"] });
  assert.deepEqual(sfxCover(d, SHOTS, later).findings, []);
  P.updatePrefs(d, { on: ["impact"], off: ["all"] });
  assert.deepEqual(sfxCover(d, SHOTS, later), { ran: false, why: "owner", findings: [] });
  // the gate itself, on a film with a plan and a storyboard
  const g = project(ROOT.replace('data-duration="30"', 'data-duration="8"'));
  writeFileSync(join(g, "STORYBOARD.md"), "# Storyboard\n\n## Frame 1 — Kitchen\n- duration: 4s\n- ambience: room tone\n\n## Frame 2 — Street\n- duration: 4s\n- location: street\n");
  writeFileSync(join(g, "MOTION-PLAN.json"), JSON.stringify({ version: 1, shots: [{ shot: 1, motions: [{ id: "a", target: "#t", type: "entrance", start: 0.5, duration: 0.5, behavior: "the title rises" }] },
    { shot: 2, motions: [{ id: "b", target: "#c", type: "other", start: 1, duration: 0.5, behavior: "the cup drops onto the table" }] }] }));
  sfx.mount(g, []);
  const gate = await gateSfx(g);
  assert.deepEqual([gate.id, gate.blocking, gate.pass, gate.warnings], ["G-SFX", false, false, 2], JSON.stringify(gate.findings));
  assert.match(gate.findings[0].message, /^Shot 1 at 0\.5 s: an entrance has no sound \(the app's would be "pop"\)/);
  assert.doesNotMatch(gate.findings.map((x) => x.message).join(" "), /[\\/]|assets|el-sfx|m:\d/, "no paths or ids");
});

test("the storyboard's `- ambience:` line reaches the shots; it is the sound's bookkeeping, not what the owner approved", async () => {
  const { readShots } = await import("../packages/hf-edit/shots.mjs");
  const pipe = await import("../packages/pipeline/index.mjs");
  const d = project();
  writeFileSync(join(d, "STORYBOARD.md"), "# Storyboard\n\n## Frame 1 — Rain\n- duration: 3s\n- sfx: pop, door open@1.2\n- ambience: rain\n");
  const { shots } = await readShots(d);
  assert.deepEqual([shots[0].sfx, shots[0].ambience], ["pop, door open@1.2", "rain"]);
  // a chat change of the place counts as a change of the cues: the sounds are placed again by themselves
  assert.equal(sfx.cueKey(shots), "1:ambience=rain|1:door open@1.2|1:pop@0");
  assert.equal(sfx.cueKey([{ number: 1, sfx: "pop" }]), "1:pop@0", "a film with no ambience line keeps its key");
  assert.equal(pipe.storyboardHash("## Frame 1\n- duration: 3s\n"), pipe.storyboardHash("## Frame 1\n- duration: 3s\n- ambience: rain\n"));
  assert.match(pipe.keepApprovedStoryboard("## Frame 1\n- duration: 3s\n", "## Frame 1\n- duration: 2s\n- ambience: rain\n"), /- duration: 3s\n- ambience: rain/);
});

test("Claude is told: the house rule, the step prompts, the Motion Plan's sound field and the sfx_prefs tool", async () => {
  const rule = readFileSync(join(import.meta.dirname, "..", "config", "rules", "moworks-studio", "SKILL.md"), "utf8");
  assert.match(rule, /^version: 1\.3\.\d+$/m);          // §7b came in 1.3.5; later patches keep it
  assert.match(rule, /### 7b\. A sound on every action \(owner 30\/10\)/);
  assert.match(rule, /`- ambience:`/);
  assert.match(rule, /sfx_prefs/);
  const agent = await import("../packages/agent/index.mjs");
  assert.ok(agent.APP_TOOLS.sfx_prefs);
  assert.deepEqual(agent.APP_TOOLS.sfx_prefs.inputSchema.properties.density.enum, ["low", "normal", "lively"]);
  const plan = await import("../packages/motion-plan/index.mjs");
  assert.match(plan.SOUND_PROMPT, /"sound"/);
  assert.equal(plan.cleanMotion({ target: "#a", type: "entrance", sound: " Paper Slide " }).sound, "paper slide");
  assert.equal(plan.cleanMotion({ target: "#a", type: "entrance" }).sound, undefined);
  const sp = agent.systemPrompt({ meta: { format: {}, title: "t" }, rules: [], shots: [], dir: null, step: "storyboard" });
  assert.match(sp, /`- ambience:` line/);
  assert.match(sp, /call the app's sfx_prefs tool/);
  assert.match(sp, /"sound": a short English name/);
  assert.doesNotMatch(sp, /volume 0\.35/);
  const boards = readFileSync(join(import.meta.dirname, "..", "packages", "server", "boards.mjs"), "utf8");
  assert.match(boards, /sfx_prefs: async \(\{ project, args = \{\} \}\) =>/);
  assert.match(boards, /r\("POST", `\/projects\/\$\{P\}\/mix\/sfx\/prefs`/);
  const gates = readFileSync(join(import.meta.dirname, "..", "packages", "hf-qa", "gates.mjs"), "utf8");
  assert.match(gates, /\["A sound on every action", async \(\) => \[await gateSfx\(projectDir\)\]\]/);
  const { CHECKS } = await import("../packages/server/production.mjs");
  assert.equal(CHECKS["G-SFX"].title, "A sound on every action");
});

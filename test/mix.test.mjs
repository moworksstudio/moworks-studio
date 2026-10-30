// Claude's library search over the whole Motion Library, HyperFrames' scripts run by the app
// (allow-listed, inside the project), the Final Mix: Mixkit options (only Mixkit's hosts), automatic sound effects from the cuts and the
// motion plan, the music credit.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { librarySearch, scoreCard, searchText, words } from "../packages/library/search-tool.mjs";
import { HF_SKILL, SCRIPTS, listScripts, needsWeb, runScript } from "../packages/hf-edit/hf-scripts.mjs";
import { creditMusic, optionsText, readOptions, saveOptions } from "../packages/sfx/music.mjs";
import { TYPING, autoCues, mixCues } from "../packages/sfx/auto.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-mix-"));
after(() => rmSync(T, { recursive: true, force: true }));

test("library search: plain words, best first, across every author; the answer names the id to cite", { timeout: 120000 }, async () => {
  assert.deepEqual(words("The headline letters slam IN, one by one"), ["headline", "letters", "slam"]);
  const card = { title: "Count Up", id: "component/count-up", tags: ["number", "counter"], category: "Data", kind: "motion", desc: "Counts a number up" };
  assert.ok(scoreCard(card, words("number counter counting up")) > scoreCard(card, words("logo reveal")));
  const r = await librarySearch("number counter counting up", { limit: 6, hfRank: false });
  assert.ok(r.length >= 3 && r.length <= 6);
  assert.ok(r.some((x) => /count/i.test(x.title)), r.map((x) => x.title).join());
  assert.ok(new Set(r.map((x) => x.author)).size >= 2, "more than one author");
  const text = searchText("number counter", r);
  assert.match(text, /"source": \{"kind": "library", "id": "<id>"\}/);
  assert.match(text, new RegExp(r[0].uid.replace(/[/:]/g, "\\$&")));
  // No author, licence or "made"; what it is in about 100 characters
  assert.doesNotMatch(text, / by |licen|as shipped|written from/i);
  for (const line of text.split("\n").slice(1)) assert.ok(line.split("): ").slice(1).join("): ").length <= 101, line);
  assert.match(searchText("zzzz", []), /Nothing in the Motion Library/);
});

test("HyperFrames' scripts: only the allow-listed ones run, in the project as shipped; voice and music makers, paths outside and other commands refused", { timeout: 120000 }, async () => {
  const names = listScripts([HF_SKILL, "media-use"]).map((x) => x.name);
  // a skill's own scripts/ and a part's (media-use/audio/scripts holds carve); every allow-listed script is there at the pinned commit
  for (const n of [...Object.keys(SCRIPTS), "audio", "heygen-tts", "transcript-cut"]) assert.ok(names.includes(n), n);
  assert.ok(!names.some((n) => n.endsWith(".test")), "no tests");
  assert.deepEqual(Object.keys(SCRIPTS).sort(), ["carve", "locate"]);
  // carve on a tiny film: run with the project as its folder, it writes HF's carve onto the music bed in the project's own index.html
  const d = join(T, "film"); mkdirSync(join(d, "assets"), { recursive: true });
  const ff = (args) => execFileSync(ffmpegExe(), ["-v", "error", "-y", ...args], { windowsHide: true });
  ff(["-f", "lavfi", "-i", "anoisesrc=d=4:c=pink:a=0.3", "-ac", "1", join(d, "assets", "music.wav")]);
  ff(["-f", "lavfi", "-i", "sine=frequency=300:duration=4", "-af", "volume=0.8,tremolo=f=4:d=0.9", "-ac", "1", join(d, "assets", "voice.wav")]);
  const html = `<!doctype html><html><body><div id="root" data-composition-id="main" data-start="0" data-duration="4" data-width="1920" data-height="1080">
<audio id="el-music" data-timeline-role="music" src="assets/music.wav" data-start="0" data-duration="4" data-track-index="11"></audio>
<audio id="el-voice" data-timeline-role="voiceover" src="assets/voice.wav" data-start="0" data-duration="4" data-track-index="10"></audio>
</div></body></html>`;
  writeFileSync(join(d, "index.html"), html);
  const before = readdirSync(d).sort();
  const dry = await runScript(d, { name: "carve", args: ["--comp", "index.html", "--bed", "el-music", "--voice", "el-voice", "--dry-run"], skills: ["media-use"] });
  assert.equal(dry.ok, true, dry.stderr);
  assert.match(dry.stdout, /dry run: nothing written/);
  assert.equal(readFileSync(join(d, "index.html"), "utf8"), html, "a dry run touches nothing");
  const r = await runScript(d, { name: "scripts/carve.mjs", args: ["--comp", "index.html", "--bed", "el-music", "--voice", "el-voice"], skills: ["media-use"] });
  assert.equal(r.ok, true, r.stderr);
  assert.equal(r.command, "media-use/scripts/carve");
  assert.match(r.stdout, /wrote index\.html \(id="el-music"\)/);
  const out = readFileSync(join(d, "index.html"), "utf8");
  assert.match(/<audio id="el-music"[^>]*>/.exec(out)[0], /data-fx-carve="[^"]+"[^>]*data-fx-chain="[^"]+"/, "HF's carve on the bed");
  assert.doesNotMatch(/<audio id="el-voice"[^>]*>/.exec(out)[0], /data-fx-/, "the voice untouched");
  assert.deepEqual(readdirSync(d).sort(), before, "nothing else written in the project");
  // the rest of media-use is the app's own work (voice-over, music, sound mix): refused with the reason, never run (a bare "audio" is the
  // CLI's analysis, `hyperframes audio`; HF's music maker is audio.mjs)
  for (const n of ["audio.mjs", "heygen-tts", "heygen-voice", "lyria-recipe", "wait-bgm", "extract-audio-data", "audio-duck", "transcript-cut", "transcribe", "bake-basemap", "media-use/audio/scripts/audio.mjs"])
    await assert.rejects(runScript(d, { name: n, args: ["--help"], skills: [HF_SKILL, "media-use"] }), /does not run "[\w-]+" for Claude: the voice-over, the music/, n);
  // an allowed script only from its own skill, when the project loaded it
  await assert.rejects(runScript(d, { name: "carve", args: ["--help"], skills: ["slideshow"] }), /No script "carve"/);
  await assert.rejects(runScript(d, { name: "carve", args: ["--comp", "../../index.html"], skills: ["media-use"] }), /leaves the project/);
  await assert.rejects(runScript(d, { name: "carve", args: ["--comp", "C:\\Windows\\x"], skills: ["media-use"] }), /outside the project/);
  await assert.rejects(runScript(d, { name: "hyperframes render", args: [] }), /does not run/);
  const info = await runScript(d, { name: "hyperframes compositions", args: ["."] });
  assert.equal(typeof info.ok, "boolean");
  // what goes online asks the project's web setting first: the CLI's capture / add / catalog, locate's Gemini path
  for (const [n, a, web] of [["hyperframes capture", ["https://example.com"], true], ["npx hyperframes add", ["x"], true], ["catalog", [], true], ["hyperframes beats", ["."], false],
    ["locate", ["auto", "a.png"], true], ["locate", ["overlay", "a.png"], false], ["carve", ["--comp", "index.html"], false], ["audio", ["song.mp3"], false]])
    assert.equal(needsWeb(n, a), web, `${n} ${a.join(" ")}`);
});

test("Final Mix music: only Mixkit audio links are downloaded, each round kept, durations measured; the credit", { timeout: 60000 }, async () => {
  const d = join(T, "mix"); mkdirSync(d, { recursive: true });
  const mp3 = join(T, "t.mp3");
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=330:duration=3", "-c:a", "libmp3lame", mp3], { windowsHide: true });
  const bytes = readFileSync(mp3);
  const seen = [];
  const fetchImpl = async (url) => { seen.push(url); return { ok: true, status: 200, arrayBuffer: async () => bytes }; };
  const r1 = await saveOptions(d, [
    { title: "Morning Tea", artist: "A", page: "https://mixkit.co/free-stock-music/tag/calm/", url: "https://assets.mixkit.co/music/preview/mixkit-morning-tea-1.mp3" },
    { title: "Elsewhere", url: "https://example.com/x.mp3" },
    { title: "Not audio", url: "https://mixkit.co/free-stock-music/" },
  ], { fetchImpl });
  assert.equal(r1.id, "R1");
  assert.deepEqual(seen, ["https://assets.mixkit.co/music/preview/mixkit-morning-tea-1.mp3"], "nothing else is downloaded");
  assert.equal(r1.tracks.length, 1); assert.equal(r1.failed.length, 2);
  assert.match(r1.tracks[0].file, /^audio\/music-options\/R1\/1-morning-tea\.mp3$/);
  assert.ok(Math.abs(r1.tracks[0].duration - 3) < 0.2);
  const r2 = await saveOptions(d, [{ title: "Rain", url: "https://assets.mixkit.co/music/preview/mixkit-rain-2.mp3" }], { fetchImpl });
  assert.equal(r2.id, "R2"); assert.equal(readOptions(d).rounds.length, 2, "R1 kept");
  creditMusic(d, r1.tracks[0]);
  creditMusic(d, r2.tracks[0]);
  const credits = readFileSync(join(d, "CREDITS.md"), "utf8");
  assert.equal(credits.match(/## Music/g).length, 1, "one music section, replaced");
  assert.match(credits, /Rain.*Mixkit Stock Music Free License.*not for TV or radio broadcast/);
});

test("Final Mix sound effects: a whoosh into a cut that changes the picture, a pop when something enters, typing for typed text, a sound on every action (no cap of 2 a shot); the storyboard's own cues first", () => {
  const shots = [{ number: 1, index: 0, start: 0, duration: 3 }, { number: 2, index: 1, start: 3, duration: 3, sfx: "chime@0.5", transitionIn: "whip pan" },
    { number: 3, index: 2, start: 6, duration: 4 }];
  const plan = { shots: [
    { shot: 1, motions: [{ type: "entrance", start: 0.3, target: "Title" }, { type: "entrance", start: 0.5, target: "Sub" }, { type: "entrance", start: 1, target: "Third" }] },
    { shot: 3, motions: [{ type: "transition", start: 0, target: "#wipe" }, { type: "text", start: 1.2, target: "Caption", behavior: "typed out letter by letter, typewriter caret" }] }] };
  const auto = autoCues(shots, plan);
  // the third entrance gets its pop too (owner 30/10: every action); the plan's transition at shot 3's start is the cut's own whoosh
  assert.deepEqual(auto.map((c) => [c.name, c.start]), [["pop", 0.3], ["pop", 0.5], ["pop", 1], ["whoosh", 2.8], ["whoosh", 5.8], ["typing", 7.2]]);
  const all = mixCues(shots, plan);
  assert.deepEqual(all.map((c) => [c.name, c.start]), [["pop", 0.3], ["pop", 0.5], ["pop", 1], ["whoosh", 2.8], ["chime", 3.5], ["whoosh", 5.8], ["typing", 7.2]],
    "two pops 0.2 s apart are two actions; the named cue kept");
  // the same moment is one action: an automatic sound within 0.25 s of the storyboard's own gives way to it
  const named = [{ number: 1, index: 0, start: 0, duration: 3, sfx: "chime@0.4" }];
  assert.deepEqual(mixCues(named, { shots: [{ shot: 1, motions: [{ type: "entrance", start: 0.5, target: "Title" }] }] }).map((c) => c.name), ["chime"]);
});

test("typing only for text being typed: the noun \"type\" (a type block, a typeface) is no keyboard (Test 20: 13 typing sounds)", () => {
  for (const t of ["the type block slides in", "Type: bold display typeface", "set the type tighter", "types of lamps", "kinetic type rises"]) assert.doesNotMatch(t, TYPING, t);
  for (const t of ["typing the headline", "the caption types out", "the name is typed out letter by letter", "type-on reveal", "a typewriter", "keyboard clicks", "the caret blinks", "gõ chữ từng chữ"]) assert.match(t, TYPING, t);
  const shots = [{ number: 1, index: 0, start: 0, duration: 4 }];
  const plan = { shots: [{ shot: 1, motions: [{ type: "entrance", start: 0.5, target: ".type-block", behavior: "the type block slides in from the left" }] }] };
  assert.deepEqual(autoCues(shots, plan).map((c) => c.name), ["light swish"], "a slide in, never typing");
});

test("a whoosh only where the picture really changes: one continuous scene, a dissolve or a cut nothing describes gets none (Test 20: 10 whooshes)", () => {
  const at = (extra) => [{ number: 1, index: 0, start: 0, duration: 3, ...extra[0] }, { number: 2, index: 1, start: 3, duration: 3, ...extra[1] }];
  // the cut's own whoosh (a transition row later in a shot is an action of its own, with its own sound)
  const whooshes = (shots, plan = null) => autoCues(shots, plan).filter((c) => c.cut).length;
  assert.equal(whooshes(at([{}, {}])), 0, "nothing tells: no whoosh");
  assert.equal(whooshes(at([{}, { transitionIn: "cùng một cảnh, máy bay lên và trượt dọc phố" }])), 0, "the same scene, a camera move");
  assert.equal(whooshes(at([{}, { transitionIn: "match cut on the lamp" }])), 0);
  assert.equal(whooshes(at([{}, { transitionIn: "crossfade" }])), 0, "a dissolve is no whoosh");
  assert.equal(whooshes(at([{}, { transitionIn: "hard cut to the street" }])), 1);
  assert.equal(whooshes(at([{}, { transitionIn: "whip pan" }])), 1);
  assert.equal(whooshes(at([{ location: "Kitchen" }, { location: "kitchen" }])), 0, "the same place");
  assert.equal(whooshes(at([{ location: "Kitchen" }, { location: "Harbour" }])), 1, "a new place");
  const plan = (start) => ({ shots: [{ shot: 2, motions: [{ type: "transition", start, target: "#gl wave" }] }] });
  assert.equal(whooshes(at([{}, {}]), plan(0)), 1, "the plan's transition at the shot's start");
  assert.equal(whooshes(at([{}, {}]), plan(2)), 0, "a transition later in the shot is no cut");
  assert.equal(whooshes(at([{}, { transitionIn: "one continuous take" }]), plan(0)), 0, "the frame's own words win");
});

test("a Final Mix revision is sound only: the picture's check stays valid; a picture change after it still counts", { timeout: 60000 }, async () => {
  const rev = await import("../packages/revisions/index.mjs");
  const d = join(T, "git-mix"); mkdirSync(join(d, "compositions"), { recursive: true });
  writeFileSync(join(d, "index.html"), "<div data-composition-id=\"r\"></div>"); writeFileSync(join(d, "compositions", "f1.html"), "<div>a</div>");
  rev.ensureRepo(d);
  const checked = rev.head(d);
  writeFileSync(join(d, "index.html"), "<div data-composition-id=\"r\"><audio id=\"el-music\" src=\"assets/audio/m.mp3\"></audio></div>");
  rev.commitAll(d, `${rev.SOUND_MIX}: music "M"`);
  assert.equal(rev.changedSince(d, checked), false);
  writeFileSync(join(d, "compositions", "f1.html"), "<div>b</div>"); rev.commitAll(d, "Claude: change shot 1");
  assert.equal(rev.changedSince(d, checked), true);
});

test("Final Mix levels: each effect by its loudest moment, HIT_OVER dB over the music between the words, never far over the voice; the master to -16 LUFS", { timeout: 120000 }, async () => {
  const { levels } = await import("../packages/sfx/auto.mjs");
  const { loudnessOf } = await import("../packages/sfx/mixlevels.mjs");
  const { HIT_OVER, LEVEL, LEVELS, MAX_GAIN, REF_BED, hitVolume, volumeFor } = await import("../packages/sfx/actions.mjs");
  const { masterLoudness, loudness } = await import("../packages/hf-qa/loudness.mjs");
  const d = join(T, "levels"); mkdirSync(join(d, "assets", "audio"), { recursive: true }); mkdirSync(join(d, "assets", "sfx"), { recursive: true }); mkdirSync(join(d, ".moworks"), { recursive: true });
  const gen = (args, out) => execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", ...args, out], { windowsHide: true });
  gen(["-i", "sine=frequency=220:duration=6"], join(d, "assets", "audio", "bed.wav"));
  gen(["-i", "sine=frequency=880:duration=0.5", "-af", "volume=-12dB"], join(d, "assets", "sfx", "pop.wav"));
  gen(["-i", "sine=frequency=440:duration=6", "-af", "volume=-2dB"], join(d, "assets", "audio", "vo.wav"));
  // a library one-shot (its catalog loudness) and a sound from the search (measured)
  writeFileSync(join(d, ".moworks", "sfx.json"), JSON.stringify({ sounds: { pop: { file: "assets/sfx/pop.wav", durationS: 0.5, family: "pop" },
    thud: { file: "assets/sfx/pop.wav", durationS: 0.5, family: "impact", source: "library", lufs: -24 } } }));
  const html = (voice) => `<div data-composition-id="r"><audio id="el-music" src="assets/audio/bed.wav" data-volume="0.6"></audio>${voice ? '<audio id="el-voice" src="assets/audio/vo.wav" data-volume="1"></audio>' : ""}</div>`;
  writeFileSync(join(d, "index.html"), html(false));
  const a = await levels(d, ["pop", "thud"]);
  assert.ok(Math.abs(a.shift - Math.max(-6, Math.min(6, a.bed - REF_BED))) < 0.01, "the ambience follows the measured bed");
  // each effect by its own loudest 400 ms (a library sound's catalog loudness is its integrated one, which reads low for a hit: not used)
  const peak = await loudnessOf(d, "assets/sfx/pop.wav", { short: true });
  assert.ok(Number.isFinite(peak) && peak > -45 && peak < -15, `peak ${peak}`);
  assert.equal(a.volumes.thud, hitVolume("impact", peak, { bed: a.bed }));
  assert.equal(a.volumes.pop, hitVolume("pop", peak, { bed: a.bed }));
  // HIT_OVER dB over the bed, its family a little louder or softer (an impact over a pop)
  const at = (v) => peak + 20 * Math.log10(v);
  assert.ok(Math.abs(at(a.volumes.pop) - (a.bed + HIT_OVER + 20 * Math.log10(LEVELS.pop / LEVEL))) < 0.1 || a.volumes.pop === MAX_GAIN, `pop at ${at(a.volumes.pop)} over a ${a.bed} bed`);
  assert.ok(a.volumes.thud >= a.volumes.pop);
  writeFileSync(join(d, "index.html"), html(true));
  const b = await levels(d, ["pop", "thud"]);
  assert.ok(Number.isFinite(b.voice));
  // with a voice-over: never more than 2 dB over the voice's own level
  assert.equal(b.volumes.thud, hitVolume("impact", peak, { bed: b.bed, voice: b.voice }));
  assert.ok(at(b.volumes.thud) <= b.voice + 2 + 0.1, "not far over the voice");
  // the family table: clicks quietest, impacts loudest of the one-shots, ambience a quiet bed; the ambience beds keep their rule
  assert.ok(LEVELS.click < LEVELS.pop && LEVELS.pop < LEVELS.whoosh && LEVELS.whoosh < LEVELS.impact && LEVELS.ambience < LEVELS.click);
  assert.equal(volumeFor("ambience", -28, { maxBoost: 18 }), 0.48, "a -28 LUFS loop brought up to the bed's level");
  // a hit too quiet even at full scale goes up to HyperFrames' ceiling (+12 dB), a loud one comes down
  assert.equal(hitVolume("impact", -60, { bed: -20 }), MAX_GAIN);
  assert.ok(hitVolume("impact", -6, { bed: -20 }) < 0.5);
  // the master: a quiet render brought to the rule
  const mp4 = join(T, "quiet.mp4");
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x36:d=5", "-f", "lavfi", "-i", "sine=frequency=330:duration=5", "-af", "volume=-12dB", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", mp4], { windowsHide: true });
  assert.ok((await loudness(mp4)).lufs < -25);
  assert.equal((await masterLoudness(mp4)).applied, true);
  const after = await loudness(mp4);
  assert.ok(Math.abs(after.lufs + 16) <= 1, String(after.lufs));
  assert.ok(after.truePeak <= -3.9, String(after.truePeak));
});

test("Final Mix uses the user's own sound when the brief names it as the tick; the rest from the app's library, credited from its catalog", { timeout: 120000 }, async () => {
  const { autoSfx } = await import("../packages/sfx/auto.mjs");
  const d = join(T, "own-sfx"); mkdirSync(join(d, "assets", "audio"), { recursive: true });
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=880:duration=0.4", join(d, "assets", "audio", "qc-tone.wav")], { windowsHide: true });
  writeFileSync(join(d, "BRIEF.md"), "# Brief\n- assets/audio/qc-tone.wav — the small test sound; plays softly as a tick on each word change.\n- Calm, no other sounds named.\n");
  writeFileSync(join(d, "index.html"), "<div data-composition-id=\"root\" data-width=\"1920\" data-height=\"1080\" data-duration=\"6\">\n</div>");
  // a hard cut into shot 2: its whoosh (a cut nothing describes gets none since Test 20)
  const shots = [{ number: 1, index: 0, start: 0, duration: 3 }, { number: 2, index: 1, start: 3, duration: 3, transitionIn: "hard cut" }];
  const plan = { shots: [{ shot: 1, motions: [{ type: "entrance", start: 0.5, target: "Title" }] }] };
  const r = await autoSfx(d, shots, plan, { fetchImpl: async () => { throw new Error("offline"); } });
  assert.deepEqual(r.owned.sort(), ["pop", "tick"], "the brief's tick: the owner's file stands for the entrance cue (and a 'tick' cue)");
  const st = JSON.parse(readFileSync(join(d, ".moworks", "sfx.json"), "utf8"));
  assert.equal(st.sounds.pop.source, "owner");
  assert.ok(existsSync(join(d, st.sounds.pop.file)), "copied into assets/sfx");
  assert.ok(st.sounds.pop.durationS > 0.3 && st.sounds.pop.durationS < 0.5, String(st.sounds.pop.durationS));
  assert.equal(st.sounds.whoosh.source, "library", "a cue the brief does not name gets the app's offline library sound, before the search");
  const credits = readFileSync(join(d, "CREDITS.md"), "utf8");
  assert.match(credits, /"qc-tone.wav" provided by the owner \(assets\/audio\/qc-tone.wav\)/);
  // a library sound credited from its catalog: its pack, author, licence and page, the original file (CC0 needs none; listed all the same)
  assert.match(credits, /\*\*whoosh\*\* \(`assets\/3_audio\/sfx\/whoosh-[a-z0-9-]+\.ogg`\): "whoosh-[a-z0-9-]+", from .+ by .+, (CC0 1\.0|Public domain).* Source: https:\/\/(kenney\.nl|opengameart\.org|commons\.wikimedia\.org)\//);
  assert.match(credits, /original file: /);
});

test("the master meets -16 LUFS with true peaks at most -1 dBTP on a mix with hits over a bed, not -17 (loudnorm's 192 kHz re-encoded to AAC raised the peak; the old -4 ceiling left a peaky mix at -17.2)", { timeout: 180000 }, async () => {
  const { masterLoudness, loudness } = await import("../packages/hf-qa/loudness.mjs");
  const mp4 = join(T, "spiky.mp4");
  // a bed with hits (loud 150 ms bursts every half second), as a film with music and effects: first quiet, then it has to be raised ~3 dB
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x36:d=10:r=25", "-f", "lavfi", "-i", "sine=f=300:d=10", "-f", "lavfi",
    "-i", "aevalsrc='if(lt(mod(t,0.5),0.15),0.3*sin(2*PI*800*t),0)':d=10:s=48000", "-filter_complex", "[1:a]volume=0.3[a];[a][2:a]amix=inputs=2:normalize=0[m]",
    "-map", "0:v", "-map", "[m]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", mp4], { windowsHide: true });
  const before = await loudness(mp4);
  assert.ok(before.lufs < -17, String(before.lufs));
  const r = await masterLoudness(mp4);
  assert.equal(r.applied, true);
  const after = await loudness(mp4);
  assert.ok(Math.abs(after.lufs + 16) <= 0.5, `loudness ${after.lufs}`);
  assert.ok(after.truePeak <= -1, `true peak ${after.truePeak}`);
  assert.equal(r.met, true);
  // A peakier mix (hits near full scale over a quiet bed) also reaches -16 under the -1 ceiling (the film that landed at -17.2 is not kept
  // unmastered, so this is a regression check, not a copy of it)
  const peaky = join(T, "peaky.mp4");
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x36:d=10:r=25", "-f", "lavfi", "-i", "sine=f=300:d=10", "-f", "lavfi",
    "-i", "aevalsrc='if(lt(mod(t,1),0.05),0.9*sin(2*PI*1200*t),0)':d=10:s=48000", "-filter_complex", "[1:a]volume=0.08[a];[a][2:a]amix=inputs=2:normalize=0[m]",
    "-map", "0:v", "-map", "[m]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", peaky], { windowsHide: true });
  const r2 = await masterLoudness(peaky), after2 = await loudness(peaky);
  assert.ok(Math.abs(after2.lufs + 16) <= 0.5 && after2.truePeak <= -1, JSON.stringify({ after2, attempts: r2.attempts }));
});

test("Claude is told what the film's music will be, so its words match the film (the music step places track 1 and the sound effects)", () => {
  const round = { id: "R1", tracks: [{ title: "Sun and His Daughter", artist: "Eugenio Mininni", file: "audio/music-options/R1/1.mp3", duration: 120 }], failed: [] };
  const step = optionsText(round, { placeMusic: true, placeSfx: true });
  assert.match(step, /puts track 1 \("Sun and His Daughter"\) on the timeline/);
  assert.match(step, /places the sound effects/);
  assert.match(step, /Do not ask the owner to choose first/);
  assert.doesNotMatch(step, /the owner picks one/);
  const kept = optionsText(round, { placeSfx: true });
  assert.match(kept, /keeps the music it has/);
  const chat = optionsText(round);
  assert.match(chat, /picks one there/); assert.doesNotMatch(chat, /sound effects/);
});

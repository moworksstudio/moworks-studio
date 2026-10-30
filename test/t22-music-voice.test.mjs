// Test 22's sound: the music ended at 106.5 s while the picture faded out to 110 s (T22-9: a 107 s song in a 110 s film); a song shorter
// than the film now plays again after itself, crossfaded on its beats, to the film's end with the ending's fade, and a song far shorter is
// said in the Final Mix and the chat. The voice-over cut into one clip a line (el-voice-01…13) was taken for no voice (T22-11): the voice
// check did not run, no effect moved off a spoken word, the levels measured no voice. Every clip of the voice counts now. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t22-sound-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const { MUSIC_XF, audioKind, clockOf, filmWords, fitMusicToFilm, musicLoop, musicRepeats, musicUsed, placeTrack, stopMusic, trackClips, wordsOnFilm } = await import("../packages/hf-edit/tracks.mjs");
const { afterWords, levels, spokenWords } = await import("../packages/sfx/auto.mjs");
const { voiceCheck } = await import("../packages/sfx/voicecheck.mjs");
const { stopContext } = await import("../packages/sfx/stop-snap.mjs");
const { ffmpegExe } = await import("../packages/library/preview-media.mjs");
const ff = (args) => execFileSync(ffmpegExe(), ["-v", "error", "-y", ...args], { windowsHide: true });

// the beats of Test 22's song (88 bpm: a beat every 0.68 s), as HyperFrames' beats file has them
const BEAT = 0.68, beatsTo = (s) => Array.from({ length: Math.floor((s - 0.455) / BEAT) + 1 }, (_, i) => Math.round((0.455 + i * BEAT) * 1000) / 1000);
const film = (name, seconds) => {
  const d = join(T, name); mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, "index.html"), `<div id="root" data-composition-id="main" data-start="0" data-duration="${seconds}" data-width="1920" data-height="1080"></div>\n`);
  return d;
};
const beatsFile = (d, src, song) => { const f = join(d, "beats", ...`${src}.json`.split("/")); mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, JSON.stringify({ version: 1, audio: src, beats: beatsTo(song).map((time) => ({ time, strength: 0.8 })) })); };
const tags = (d) => [...readFileSync(join(d, "index.html"), "utf8").matchAll(/<audio\b[^>]*>/g)].map((m) => Object.fromEntries([...m[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]])));
const music = (d) => tags(d).filter((a) => audioKind(a) === "music");
const end = (c) => Number(c["data-start"]) + Number(c["data-duration"]);
const SONG = "assets/3_audio/music/1-kidding-around.mp3";

test("musicLoop: a song a little shorter than the film plays again once, on its beats, its ending into the film's end", () => {
  const beats = beatsTo(106.995);
  const l = musicLoop({ song: 106.995, end: 110, beats });
  assert.equal(l.times, 1);
  const [a, b] = l.clips;
  assert.deepEqual([a.start, a.mediaStart], [0, 0]);
  assert.ok(beats.some((t) => Math.abs(t - a.duration) < 1e-6), "the song hands over on a beat");
  assert.ok(Math.abs(b.start - (a.duration - MUSIC_XF)) < 1e-6, "the repeat starts a crossfade before the song's clip ends");
  assert.ok(Math.abs(b.start + b.duration - 110) < 1e-6, "the repeat plays to the film's end");
  assert.ok(b.mediaStart + b.duration <= 106.995, "never past the song's end");
  const groups = l.length / (4 * BEAT);
  assert.ok(Math.abs(groups - Math.round(groups)) < 0.01 && groups >= 1, `the part played again is whole 4-beat groups: ${l.length} s`);
  assert.ok(a.duration < 106.995 - 4, "the song's own ending is the last clip's, not the first's");
  // with no beats: the tail played again, just long enough, plainly crossfaded
  const p = musicLoop({ song: 106.995, end: 110 });
  assert.equal(p.times, 1);
  assert.ok(p.length >= 3 && p.length < 3.2, `${p.length}`);
  assert.ok(Math.abs(p.clips[1].mediaStart + p.clips[1].duration - 106.995) < 0.06, "its own ending lands on the film's end");
  // a song that reaches the end, or too short to play again: nothing to add
  assert.equal(musicLoop({ song: 120, end: 110 }), null);
  assert.equal(musicLoop({ song: 110, end: 110 }), null);
  assert.equal(musicLoop({ song: 2, end: 60 }), null);
});

test("musicLoop: a song far shorter than the film plays again as often as it takes, every clip inside the song", () => {
  const l = musicLoop({ song: 40, end: 110, beats: beatsTo(40) });
  assert.ok(l.times >= 2, `${l.times} repeats`);
  const last = l.clips.at(-1);
  assert.ok(Math.abs(last.start + last.duration - 110) < 1e-6);
  for (const [i, c] of l.clips.entries()) {
    assert.ok(c.mediaStart + c.duration <= 40 + 1e-6, `clip ${i} inside the song`);
    if (i > 0) assert.ok(Math.abs(c.start - (l.clips[i - 1].start + l.clips[i - 1].duration - MUSIC_XF)) < 1e-6, `clip ${i} crossfades from the one before`);
    if (i > 0 && i < l.clips.length - 1) assert.ok(Math.abs(c.duration - (l.length + MUSIC_XF)) < 1e-6, `clip ${i} plays the part again once`);
  }
  assert.equal(l.clips.slice(1).every((c) => c.mediaStart === l.from), true, "each repeat starts at the same point of the song");
  assert.equal(clockOf(l.from), `0:${String(Math.round(l.from)).padStart(2, "0")}`);
  assert.equal(clockOf(102.4), "1:42");
});

test("Test 22: the 107 s song in the 110 s film reaches the film's end, its fade on the ending's; nothing changes the second time", () => {
  const d = film("t22", 110);
  beatsFile(d, SONG, 106.995);
  placeTrack(d, { kind: "music", src: SONG, duration: 106.995 });
  const [a, b, ...more] = music(d);
  assert.equal(more.length, 0);
  assert.equal(a.id, "el-music");
  assert.equal(a["data-fade-out"], String(MUSIC_XF), "the song crossfades into its repeat");
  assert.equal(a["data-mw-track"], "106.995", "the song's own length kept");
  assert.equal(b.id, "el-music-loop-1");
  assert.equal(b.src, SONG);
  assert.equal(b["data-timeline-role"], "music");
  assert.equal(b["data-fade-in"], String(MUSIC_XF));
  assert.equal(b["data-fade-out"], "5", "the ending's fade (110 s: 105 s of content and its 5 s fade)");
  assert.ok(Math.abs(end(b) - 110) < 1e-6, "the music ends with the picture");
  assert.notEqual(b["data-track-index"], a["data-track-index"], "the crossfade on two lanes (HF's lint: no two sounds overlap on one track)");
  assert.equal(b["data-volume"], a["data-volume"]);
  assert.equal(fitMusicToFilm(d), null, "nothing to change the second time");
  assert.deepEqual({ ...musicRepeats(d), from: undefined, at: undefined }, { from: undefined, at: undefined, times: 1, song: 106.995, film: 110, short: false }, "a little shorter: not said");
  // the part of the song the film plays reaches into the repeat
  assert.ok(musicUsed(d).end > Number(a["data-duration"]));
  // Studio stamps an id on the repeat: kept when the music is fitted again
  writeFileSync(join(d, "index.html"), readFileSync(join(d, "index.html"), "utf8").replace('id="el-music-loop-1"', 'data-hf-id="hf-rep1" id="el-music-loop-1"'));
  writeFileSync(join(d, "index.html"), readFileSync(join(d, "index.html"), "utf8").replace('data-duration="110"', 'data-duration="112"'));
  fitMusicToFilm(d);
  const again = music(d);
  assert.equal(again[1]["data-hf-id"], "hf-rep1");
  assert.ok(Math.abs(end(again.at(-1)) - 112) < 1e-6, "fitted again to the longer film");
  assert.equal(readFileSync(join(d, "index.html"), "utf8").match(/el-music-loop-1/g).length, 1, "one repeat, rewritten");
  // a longer song placed: the repeat goes
  placeTrack(d, { kind: "music", src: "assets/3_audio/music/long.mp3", duration: 180 });
  assert.equal(music(d).length, 1);
  assert.ok(Math.abs(end(music(d)[0]) - 112) < 1e-6);
  assert.equal(musicRepeats(d), null);
});

test("a song far shorter than the film repeats to its end and is said; a stop cuts it, play to the end brings the repeats back", () => {
  const d = film("short", 110);
  placeTrack(d, { kind: "music", src: "assets/3_audio/music/jingle.mp3", duration: 40 });
  const clips = music(d);
  assert.ok(clips.length >= 3, `${clips.length} clips`);
  assert.ok(Math.abs(end(clips.at(-1)) - 110) < 1e-6);
  const r = musicRepeats(d);
  assert.equal(r.short, true, "40 s of 110 s: said to the owner");
  assert.equal(r.times, clips.length - 1);
  assert.match(r.at, /^0:\d\d$/);
  // a stop inside the song: the song cut there, no repeat, no fade
  stopMusic(d, 30);
  assert.equal(music(d).length, 1);
  assert.equal(music(d)[0]["data-duration"], "30");
  assert.equal(music(d)[0]["data-fade-out"], undefined, "a stop is a cut");
  assert.equal(musicRepeats(d), null);
  // a stop after the song's end: played again up to it, the last clip cut with no fade
  stopMusic(d, 70);
  const cut = music(d);
  assert.ok(cut.length >= 2);
  assert.ok(Math.abs(end(cut.at(-1)) - 70) < 1e-6);
  assert.equal(cut.at(-1)["data-fade-out"], undefined);
  // placed again while stopped: still stopped there
  placeTrack(d, { kind: "music", src: "assets/3_audio/music/jingle.mp3", duration: 40 });
  assert.ok(Math.abs(end(music(d).at(-1)) - 70) < 1e-6);
  // play to the end: the repeats back to the film's end with the ending's fade
  stopMusic(d, null);
  const back = music(d);
  assert.ok(Math.abs(end(back.at(-1)) - 110) < 1e-6);
  assert.equal(back.at(-1)["data-fade-out"], "5");
  assert.equal(back[0]["data-mw-stop"], undefined);
});

test("the Final Mix and the chat say a far shorter song repeats; the chat's note opens the Final Mix", () => {
  const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.match(src("packages/server/boards.mjs"), /repeat: musicRepeats\(p\.path\)/);
  assert.match(src("ui/src/workflow/MixSheet.jsx"), /d\.music\?\.repeat\?\.short[\s\S]{0,200}The song is shorter than the film; it repeats from \{at\}/);
  const prod = src("packages/server/production.mjs");
  assert.match(prod, /kind: "music", status: "warning", open: "mix", text: "The song is shorter than the film; it repeats from \{at\}/);
  assert.match(prod, /fitMusicToFilm\(p\.path\);\s+repeatNote\(p\);/, "said when the film is checked or rendered");
});

// ---- T22-11: a voice in one clip a line
const VOICE = "assets/3_audio/voiceover/vo.wav";
// three lines of one file (file seconds 0-1, 1-2, 2-3) placed at 0.5, 2.5 and 5 s, as the Build cuts them; Studio's id first, as in Test 22
const cutVoice = (extra = "") => `<div id="root" data-composition-id="main" data-start="0" data-duration="7" data-width="640" data-height="360">
    <audio data-hf-id="hf-a" id="el-voice-01" src="${VOICE}" data-start="0.5" data-media-start="0" data-duration="1" data-track-index="10" data-volume="1" data-timeline-role="voiceover"></audio>
    <audio data-hf-id="hf-b" id="el-voice-02" src="${VOICE}" data-start="2.5" data-media-start="1" data-duration="1" data-track-index="10" data-volume="1" data-timeline-role="voiceover"></audio>
    <audio data-hf-id="hf-c" id="el-voice-03" src="${VOICE}" data-start="5" data-media-start="2" data-duration="1" data-track-index="10" data-volume="1" data-timeline-role="voiceover"></audio>
    ${extra}
</div>\n`;
const WORDS = [{ id: "w0", text: "one", start: 0.2, end: 0.6 }, { id: "w1", text: "two", start: 1.3, end: 1.7 }, { id: "w2", text: "three", start: 2.2, end: 2.6 }];
const voiced = (name, extra = "") => {
  const d = join(T, name); mkdirSync(join(d, "assets", "3_audio", "voiceover"), { recursive: true }); mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, "index.html"), cutVoice(extra));
  writeFileSync(join(d, "transcript.json"), JSON.stringify(WORDS));
  writeFileSync(join(d, ".moworks", "project.json"), JSON.stringify({ voice: { file: VOICE } }));
  return d;
};

test("the voice cut into three clips is one voice: its clips, and its words where the film speaks them", () => {
  const html = cutVoice('<audio data-hf-id="hf-m" id="el-music" src="m.mp3" data-start="0" data-duration="7" data-timeline-role="music"></audio>\n    <audio id="el-sfx-0" src="pop.mp3" data-start="1" data-duration="0.4"></audio>\n    <audio id="el-amb-0" src="amb.mp3" data-start="0" data-duration="7" data-timeline-role="sfx"></audio>');
  assert.deepEqual(trackClips(html, "voice").map((c) => [c.id, c.start, c.mediaStart, c.duration]), [["el-voice-01", 0.5, 0, 1], ["el-voice-02", 2.5, 1, 1], ["el-voice-03", 5, 2, 1]]);
  assert.deepEqual(trackClips(html, "music").map((c) => c.id), ["el-music"]);
  assert.deepEqual(["el-voice", "el-voice-07", "el-music", "el-music-loop-2", "el-sfx-0", "el-amb-0"].map((id) => audioKind({ id })), ["voice", "voice", "music", "music", null, null]);
  assert.equal(audioKind({ id: "el-voice-01", "data-timeline-role": "sfx" }), null, "a clip moved to another lane is that lane's");
  assert.equal(audioKind({ id: "clip-9", role: "voiceover" }), "voice");
  // the words: each at its clip's place; a word no clip plays is left out
  assert.deepEqual(wordsOnFilm(WORDS, trackClips(html, "voice")).map((w) => [w.text, w.start, w.end]), [["one", 0.7, 1.1], ["two", 2.8, 3.2], ["three", 5.2, 5.6]]);
  const two = trackClips(html, "voice").filter((c) => c.id !== "el-voice-02");
  assert.deepEqual(wordsOnFilm(WORDS, two).map((w) => w.text), ["one", "three"]);
  // the app's one clip from 0 s, as before
  assert.deepEqual(wordsOnFilm(WORDS, [{ start: 1, mediaStart: 0, duration: 3 }]).map((w) => w.start), [1.2, 2.3, 3.2]);
  const d = voiced("words");
  assert.deepEqual(spokenWords(d).map((w) => w.start), [0.7, 2.8, 5.2]);
  assert.deepEqual(filmWords(d), spokenWords(d));
  // a music stop snaps into the voice's pauses where the film has them
  assert.deepEqual(stopContext(d, { voice: { file: VOICE } }).words.map((w) => w.start), [0.7, 2.8, 5.2]);
});

test("afterWords moves an effect off a word of the second and the third clip", () => {
  const d = voiced("after");
  const out = afterWords([{ name: "pop", start: 2.9, offset: 0 }, { name: "ding", start: 5.3, offset: 0 }, { name: "tick", start: 4, offset: 0 }], spokenWords(d));
  assert.deepEqual(out.map((c) => [c.name, c.start, c.afterWord ?? null]), [["pop", 3.24, "two"], ["tick", 4, null], ["ding", 5.64, "three"]]);
});

test("the voice check runs on a voice in three clips, each from its own part of the file; the levels hear the voice", async () => {
  const d = voiced("check");
  // the voice file: silence, then a tone only in its last second (file 2-3 s), which the third clip plays at 5-6 s of the film
  ff(["-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-f", "lavfi", "-i", "sine=frequency=300:duration=1:sample_rate=16000", "-filter_complex", "[0]atrim=0:2[s];[s][1]concat=n=2:v=0:a=1,volume=0.3", join(d, ...VOICE.split("/"))]);
  ff(["-f", "lavfi", "-i", "anoisesrc=d=0.4:c=white:a=0.9", join(d, "assets", "loud.wav")]);
  writeFileSync(join(d, "index.html"), cutVoice('<audio id="el-sfx-0" src="assets/loud.wav" data-start="5.2" data-duration="0.4" data-volume="1"></audio>'));
  const r = await voiceCheck(d);
  assert.equal(r.ran, true, "the check runs (T22-11: ran false)");
  assert.equal(r.words, 3);
  // "one" and "two" fall on silence in the file (nothing to mask); "three" is heard at 5.2 s only if the clip plays from its media start
  assert.deepEqual(r.masked.map((x) => [x.word, x.by, x.at]), [["three", "effects", 5.2]]);
  const lv = await levels(d, []);
  assert.ok(Number.isFinite(lv.voice), `the voice's level is measured: ${lv.voice}`);
});

test("the voice cut into clips stays cut when the app places its file again; one clip taken off leaves the voice on", async () => {
  const d = voiced("again");
  placeTrack(d, { kind: "voice", src: VOICE, duration: 3 });
  const html = readFileSync(join(d, "index.html"), "utf8");
  assert.doesNotMatch(html, /id="el-voice"/, "no whole file laid over its clips");
  assert.equal(trackClips(html, "voice").length, 3);
  // the user drops the file somewhere: that is theirs
  placeTrack(d, { kind: "voice", src: VOICE, duration: 3, start: 1 });
  assert.match(readFileSync(join(d, "index.html"), "utf8"), /id="el-voice"/);
  // taken off one clip at a time (the Editor's Remove): the voice stays on until its last clip goes
  const projects = await import("../packages/project-service/index.mjs");
  const { soundTakenOff } = await import("../packages/server/assets.mjs");
  const e = voiced("off");
  const id = projects.openProject(e, T).id;
  projects.updateMeta(id, (m) => { m.voice = { file: VOICE }; }, T);
  const off = (clip) => {
    writeFileSync(join(e, "index.html"), readFileSync(join(e, "index.html"), "utf8").replace(new RegExp(`\\s*<audio [^>]*id="${clip}"[^>]*></audio>`), ""));
    soundTakenOff(projects.getProject(id, T), { id: clip, src: VOICE }, T);
    return projects.getProject(id, T).meta.voice.offTimeline ?? false;
  };
  assert.equal(off("el-voice-02"), false);
  assert.equal(off("el-voice-01"), false);
  assert.equal(off("el-voice-03"), true, "the last clip taken off: the voice is off the timeline");
});

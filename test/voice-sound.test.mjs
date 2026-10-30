// Sound under a voice-over (ideas from What If animation's references/sound.md, FreshStack, MIT): an effect
// that would land inside a spoken word goes just after it, effects line up by their attack, the music stops at a second (and stays
// stopped when its track is placed again), and the voice check lists the words the effects or the music come within 3 dB of.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterWords, onsetOf, spokenWords } from "../packages/sfx/auto.mjs";
import { mount, readState } from "../packages/sfx/index.mjs";
import { voiceCheck, voiceText } from "../packages/sfx/voicecheck.mjs";
import { placeTrack, stopMusic } from "../packages/hf-edit/tracks.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-voice-sound-"));
after(() => rmSync(T, { recursive: true, force: true }));
const ff = (args) => execFileSync(ffmpegExe(), ["-v", "error", "-y", ...args], { windowsHide: true });
const ROOT = (inner = "") => `<!doctype html><html><body><div id="root" data-composition-id="main" data-start="0" data-duration="3" data-width="640" data-height="360">${inner}</div></body></html>`;
const project = (name) => { const d = join(T, name); mkdirSync(join(d, "assets"), { recursive: true }); writeFileSync(join(d, "index.html"), ROOT()); return d; };

test("an effect that would cover a spoken word goes into the pause just after it; the others stay", () => {
  const words = [{ text: "Paste", start: 1, end: 1.4 }, { text: "Free", start: 1.6, end: 1.9 }];
  const out = afterWords([{ name: "pop", start: 1.1, offset: 0 }, { name: "whoosh", start: 3, offset: 0 }], words);
  assert.deepEqual(out.map((c) => [c.name, c.start]), [["pop", 1.44], ["whoosh", 3]]);
  assert.equal(out[0].afterWord, "Paste");
  assert.deepEqual(afterWords([{ name: "pop", start: 1.1 }], null), [{ name: "pop", start: 1.1 }], "no voice-over: nothing moves");
});

test("an effect lines up by its attack: its onset is measured and the clip starts that much earlier; the cue keeps its moment", async () => {
  const d = project("onset");
  ff(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-f", "lavfi", "-i", "sine=frequency=800:duration=0.3", "-filter_complex", "[0]atrim=0:0.25[s];[s][1]concat=n=2:v=0:a=1", join(d, "assets", "hit.wav")]);
  const onset = await onsetOf(join(d, "assets", "hit.wav"));
  assert.ok(onset > 0.2 && onset < 0.3, `onset ${onset}`);
  mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, ".moworks", "sfx.json"), JSON.stringify({ sounds: { pop: { file: "assets/hit.wav", durationS: 0.55 } } }));
  const placed = mount(d, [{ name: "pop", start: 1, offset: 0, onset }]);
  assert.equal(placed[0].start, 1, "the cue's moment");
  const tag = /<audio [^>]*id="el-sfx-0"[^>]*>/.exec(readFileSync(join(d, "index.html"), "utf8"))[0];
  assert.equal(Number(/data-start="([^"]+)"/.exec(tag)[1]), Math.round((1 - onset) * 1000) / 1000, "the clip starts its onset earlier");
  assert.equal(readState(d).mounted[0].start, 1);
});

test("the music stops at a second and stays stopped when its track is placed again; null plays it to its end", () => {
  const d = project("stop");
  writeFileSync(join(d, "index.html"), ROOT().replace('data-duration="3"', 'data-duration="60"'));          // a film longer than the song: the song plays again after itself to the end (T22-9)
  placeTrack(d, { kind: "music", src: "assets/music.mp3", duration: 30 });
  const page = () => readFileSync(join(d, "index.html"), "utf8");
  const tag = () => /<audio [^>]*id="el-music"[^>]*>/.exec(page())[0];
  const played = Number(/data-duration="([\d.]+)"/.exec(tag())[1]);
  assert.match(page(), /id="el-music-loop-1"/);
  const r = stopMusic(d, 12.5);
  assert.deepEqual([r.at, r.duration], [12.5, 12.5]);
  assert.match(tag(), /data-duration="12\.5"/);
  assert.doesNotMatch(page(), /el-music-loop/, "a stop before the song ends: no repeat");
  placeTrack(d, { kind: "music", src: "assets/music.mp3", duration: 30 });          // the same track again (the picture changed)
  assert.match(tag(), /data-duration="12\.5"/, "still stopped");
  assert.equal(stopMusic(d, null).duration, played, "to the end again: the song and its repeat");
  assert.match(page(), /id="el-music-loop-1"/);
  assert.doesNotMatch(tag(), /data-mw-stop/);
  assert.throws(() => stopMusic(project("nomusic"), 3), /no music track/);
});

test("the voice check: a loud effect on a spoken word is named, a quiet one is not; without a transcript it does not run", async () => {
  const d = project("voice");
  ff(["-f", "lavfi", "-i", "sine=frequency=300:duration=3", "-af", "volume=0.3", join(d, "assets", "voice.wav")]);
  ff(["-f", "lavfi", "-i", "anoisesrc=d=0.4:c=white:a=0.9", join(d, "assets", "loud.wav")]);
  ff(["-f", "lavfi", "-i", "anoisesrc=d=0.4:c=white:a=0.9", "-af", "volume=0.01", join(d, "assets", "soft.wav")]);
  writeFileSync(join(d, "index.html"), ROOT(`<audio id="el-voice" src="assets/voice.wav" data-start="0" data-duration="3" data-volume="1"></audio>
<audio id="el-sfx-0" src="assets/loud.wav" data-start="0.5" data-duration="0.4" data-volume="1"></audio>
<audio id="el-sfx-1" src="assets/soft.wav" data-start="1.6" data-duration="0.4" data-volume="1"></audio>`));
  assert.equal((await voiceCheck(d)).ran, false, "no transcript yet");
  writeFileSync(join(d, "transcript.json"), JSON.stringify([{ id: "w1", text: "one", start: 0.55, end: 0.85 }, { id: "w2", text: "two", start: 1.65, end: 1.95 }, { id: "w3", text: "three", start: 2.3, end: 2.6 }]));
  assert.equal(spokenWords(d).length, 3);
  const r = await voiceCheck(d);
  assert.equal(r.ran, true);
  assert.deepEqual(r.masked.map((x) => [x.word, x.by]), [["one", "effects"]]);
  assert.match(voiceText(r), /"one" at 0\.55 s: the effects/);
});

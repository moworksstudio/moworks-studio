// The voice-over, the music and the effects at HyperFrames' levels (owner 30/10, after Tests 21-26: the music at a fixed 0.6 and never
// ducked covered the voice; the effects, set under the bed, could not be heard): the voice to -16 LUFS, the music 4 dB under it between the
// words and ducked to a quarter under them (media-use audio-duck), a level or a lane the user set in Studio kept, the voice check asking the
// music for 10 dB with its duck counted. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ALONE_LUFS, BED_UNDER, MAX_GAIN, MUSIC_DUCK, VOICE_LUFS, trackGains } from "../packages/sfx/actions.mjs";
import { levelTracks } from "../packages/sfx/mixlevels.mjs";
import { duckMusic, setTrackGain } from "../packages/hf-edit/tracks.mjs";
import { voiceCheck } from "../packages/sfx/voicecheck.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-levels-hf-"));
after(() => rmSync(T, { recursive: true, force: true }));
const ff = (args) => execFileSync(ffmpegExe(), ["-v", "error", "-y", ...args], { windowsHide: true });
const db = (g) => 20 * Math.log10(g);
const tag = (html, id) => new RegExp(`<audio [^>]*id="${id}"[^>]*>`).exec(html)?.[0] ?? "";
const attr = (t, a) => new RegExp(`${a}="([^"]*)"`).exec(t)?.[1];

test("trackGains: the voice to -16 LUFS, the music 4 dB under it (a quarter more under unknown words), alone at -16; up to +12 dB", () => {
  const g = trackGains({ voice: -23, music: -12.6, words: true });
  assert.ok(Math.abs(g.voice - VOICE_LUFS) < 0.05 && Math.abs(g.bed - (VOICE_LUFS - BED_UNDER)) < 0.05, JSON.stringify(g));
  assert.ok(g.voiceGain > 2 && g.musicGain < 0.5, "a quiet voice up, a loud song down");
  const unknown = trackGains({ voice: -23, music: -12.6, words: false });
  assert.ok(Math.abs(unknown.bed - (VOICE_LUFS - BED_UNDER + db(MUSIC_DUCK))) < 0.05, "no words to duck under: the music sits where the duck would put it");
  const alone = trackGains({ music: -22 });
  assert.equal(alone.voiceGain, null);
  assert.ok(Math.abs(alone.bed - ALONE_LUFS) < 0.05);
  assert.equal(trackGains({ voice: -60 }).voiceGain, MAX_GAIN, "never past HyperFrames' ceiling");
});

test("levelTracks sets the app's levels and ducks the music under the words; a level or a lane the user set stays", { timeout: 120000 }, async () => {
  const d = join(T, "film"); mkdirSync(join(d, "assets"), { recursive: true });
  ff(["-f", "lavfi", "-i", "sine=frequency=300:duration=8", "-af", "volume=-14dB", join(d, "assets", "voice.wav")]);
  ff(["-f", "lavfi", "-i", "anoisesrc=d=8:c=pink:a=0.5", join(d, "assets", "song.wav")]);
  const page = (music = 'data-volume="0.6"') => `<!doctype html><html><body><div id="root" data-composition-id="main" data-start="0" data-duration="8">
    <audio id="el-voice" src="assets/voice.wav" data-start="0" data-duration="8" data-volume="1" data-timeline-role="voiceover"></audio>
    <audio id="el-music" src="assets/song.wav" data-start="0" data-duration="8" ${music} data-timeline-role="music"></audio></div></body></html>`;
  writeFileSync(join(d, "index.html"), page());
  writeFileSync(join(d, "transcript.json"), JSON.stringify([{ text: "one", start: 1, end: 1.4 }, { text: "two", start: 1.6, end: 2.2 }, { text: "three", start: 5, end: 5.5 }]));
  const g = await levelTracks(d);
  let html = readFileSync(join(d, "index.html"), "utf8");
  const v = tag(html, "el-voice"), m = tag(html, "el-music");
  assert.equal(attr(v, "data-volume"), attr(v, "data-mw-gain"));
  assert.ok(Number(attr(v, "data-volume")) > 1, "the quiet voice brought up");
  assert.ok(Math.abs(g.bed - (g.voice - BED_UNDER)) < 0.1, JSON.stringify(g));
  const lane = JSON.parse(attr(m, "data-automation").replace(/&quot;/g, '"')).lanes[0].points;
  assert.equal(lane[0].v, 1, "full level before the first word");
  assert.ok(lane.some((p) => p.t === 1 && p.v === MUSIC_DUCK) && lane.some((p) => p.t === 2.2 && p.v === MUSIC_DUCK), "one span for words 0.2 s apart");
  assert.ok(lane.some((p) => p.t === 5.5 && p.v === MUSIC_DUCK) && lane.at(-1).v === 1);
  assert.ok(attr(m, "data-mw-duck"));
  // the user's own level and lane (Studio) stay; the app's level follows a new measure only on its own clips
  html = html.replace(/(id="el-music"[^>]*?)data-volume="[^"]*"/, '$1data-volume="0.3"').replace(/(id="el-music"[^>]*?data-automation=")[^"]*"/, '$1{&quot;version&quot;:1,&quot;lanes&quot;:[{&quot;target&quot;:&quot;volume&quot;,&quot;points&quot;:[{&quot;t&quot;:0,&quot;v&quot;:0.5}]}]}"');
  writeFileSync(join(d, "index.html"), html);
  assert.equal(setTrackGain(d, "music", 0.42), 0);
  assert.equal(duckMusic(d), 0);
  const kept = tag(readFileSync(join(d, "index.html"), "utf8"), "el-music");
  assert.equal(attr(kept, "data-volume"), "0.3");
  assert.match(attr(kept, "data-automation"), /&quot;v&quot;:0\.5/);
});

test("the voice check asks the music for 10 dB under the words, its duck lane counted", { timeout: 120000 }, async () => {
  const d = join(T, "check"); mkdirSync(join(d, "assets"), { recursive: true });
  ff(["-f", "lavfi", "-i", "sine=frequency=300:duration=3", "-af", "volume=0.3", join(d, "assets", "voice.wav")]);
  ff(["-f", "lavfi", "-i", "sine=frequency=500:duration=3", "-af", "volume=0.12", join(d, "assets", "song.wav")]);          // about 8 dB under the voice
  const words = [{ text: "one", start: 0.5, end: 0.9 }, { text: "two", start: 1.5, end: 1.9 }];
  writeFileSync(join(d, "transcript.json"), JSON.stringify(words));
  const page = (lane) => `<!doctype html><html><body><div id="root" data-composition-id="main" data-start="0" data-duration="3">
    <audio id="el-voice" src="assets/voice.wav" data-start="0" data-duration="3" data-volume="1" data-timeline-role="voiceover"></audio>
    <audio id="el-music" src="assets/song.wav" data-start="0" data-duration="3" data-volume="1" data-timeline-role="music"${lane ? ` data-automation="${lane}"` : ""}></audio></div></body></html>`;
  writeFileSync(join(d, "index.html"), page(null));
  const loud = await voiceCheck(d);
  assert.deepEqual(loud.masked.map((x) => [x.word, x.by]), [["one", "music"], ["two", "music"]], "8 dB under is not enough");
  duckMusic(d);
  const ducked = await voiceCheck(d);
  assert.equal(ducked.masked.length, 0, JSON.stringify(ducked.masked));
});

// "Put on the timeline" and a drop from the Assets tab onto a lane share one route: POST /assets/timeline with { path, start, lane }.
// The route is run on its own here (no app server): a lane given wins over the file's folder, `start` is where the sound goes, and a
// voice-over or music dropped on their lanes follow the route's own rules (the voice through useVoice, the music through placeMusic).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-assets-timeline-"));
process.env.MW_STATE_DIR ??= join(T, "state");
process.env.MW_WORK_ROOT ??= join(T, "work");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const { assetRoutes } = await import("../packages/server/assets.mjs");

/** A short silent WAV (16-bit mono, 8 kHz) that ffprobe reads. */
const silentWav = (sec) => {
  const n = Math.round(8000 * sec) * 2, b = Buffer.alloc(44 + n);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n, 40);
  return b;
};

class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }

test("the timeline route places a sound at `start` on the lane it is given; without a lane the file's folder picks it", { timeout: 60000 }, async () => {
  const dir = join(T, "demo-drop");
  for (const [f, s] of [["assets/3_audio/music/bell.wav", 0.4], ["assets/3_audio/sfx/pad.wav", 0.6], ["assets/3_audio/sfx/line.wav", 0.5], ["assets/3_audio/sfx/pop.wav", 0.3]]) {
    mkdirSync(join(dir, ...f.split("/").slice(0, -1)), { recursive: true }); writeFileSync(join(dir, ...f.split("/")), silentWav(s));
  }
  writeFileSync(join(dir, "index.html"), `<!doctype html>\n<div id="root" data-composition-id="main" data-duration="120"></div>\n`);
  const p = { id: "p1", path: dir, meta: {} };
  const calls = [];
  const ctx = {
    root: join(import.meta.dirname, ".."),
    placeMusic: async (proj, rel, info, opts) => { calls.push(["music", rel, opts]); return { file: rel }; },
    useVoice: (proj, abs, info) => { calls.push(["voice", abs.replaceAll("\\", "/").split("/").slice(-1)[0]]); return { voice: { file: "x" }, job: null }; },
  };
  const { routes } = assetRoutes(ctx, { r: (m, path, fn) => ({ m, path, fn }), P: "p", mustProject: () => p, HttpError });
  const timeline = routes.find((x) => x.m === "POST" && x.path.endsWith("/assets/timeline")).fn;

  // a file from the music folder dropped on the SFX lane at 1:05: a clip of the user's own, at 65 s
  const sfx = await timeline(["p1"], { path: "assets/3_audio/music/bell.wav", start: 65, lane: "sfx" });
  assert.equal(sfx.lane, "sfx");
  assert.equal(sfx.clip["data-start"], "65");
  assert.match(readFileSync(join(dir, "index.html"), "utf8"), /<audio id="el-clip-1" src="assets\/3_audio\/music\/bell\.wav" data-start="65" [^>]*data-timeline-role="sfx">/);
  // a sound effect dropped on the Music lane: the music, through placeMusic, at the drop's time
  const music = await timeline(["p1"], { path: "assets/3_audio/sfx/pad.wav", start: 4, lane: "music" });
  assert.equal(music.lane, "music");
  assert.deepEqual(calls.shift(), ["music", "assets/3_audio/sfx/pad.wav", { start: 4 }]);
  // dropped on Narration: a voice-over whose words are not checked yet is transcribed first, as the route always did
  const voice = await timeline(["p1"], { path: "assets/3_audio/sfx/line.wav", start: 3, lane: "voiceover" });
  assert.equal(voice.lane, "voiceover");
  assert.deepEqual(calls.shift(), ["voice", "line.wav"]);
  // the menu item sends no lane (and a lane that is not a sound lane is not one): the folder picks it, the start is kept
  const menu = await timeline(["p1"], { path: "assets/3_audio/sfx/pop.wav", start: 1.5 });
  assert.equal(menu.lane, "sfx"); assert.equal(menu.clip["data-start"], "1.5");
  const odd = await timeline(["p1"], { path: "assets/3_audio/sfx/pop.wav", start: 2, lane: "shots" });
  assert.equal(odd.lane, "sfx"); assert.equal(odd.clip.id, "el-clip-3");
  assert.equal(calls.length, 0);
});

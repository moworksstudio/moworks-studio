// sound effects, the app's own cues (sfx cues on storyboard frames, files in assets/sfx/, root <audio> at the shot's start,
// track 20+, volume 0.35) from Openverse / Freesound (CC0 and CC BY only), Pixabay's set (shipped in HF's media-use skill) when offline.
// The network is stubbed; one real render checks that the film carries the sound.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docPath } from "../packages/project-service/docs.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-sfx-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_NO_ASSET_INSTALL = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const sfx = await import("../packages/sfx/index.mjs");
const { scaffold } = await import("../packages/hf-edit/scaffold.mjs");
const { readShots, updateFrame } = await import("../packages/hf-edit/shots.mjs");
const { render } = await import("../packages/hf-render-worker/client.mjs");
const { runGates } = await import("../packages/hf-qa/gates.mjs");
const { expandEnv, loadPins } = await import("../packages/version-manager/index.mjs");

const SB = readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8");
const hit = (id, license, extra = {}) => ({ id, title: `sound ${id}`, creator: "Someone", creator_url: null, license, license_version: license === "cc0" ? "1.0" : "4.0",
  license_url: "https://creativecommons.org/", foreign_landing_url: `https://freesound.org/s/${id}`, url: `https://cdn.freesound.org/previews/${id}.mp3`,
  duration: 900, attribution: `"sound ${id}" by Someone is licensed under ${license}.`, provider: "freesound", ...extra });
const asked = [];
const online = async (url) => {
  asked.push(url);
  if (url.startsWith(sfx.OPENVERSE)) return Response.json({ results: [hit("a1", "by-nc"), hit("a2", "by", { duration: 9000 }), hit("a3", "cc0"), hit("a4", "by")] });
  return new Response(readFileSync(sfx.bundled()[0].file));       // any real mp3 stands in for the download
};
const offline = async () => { throw new Error("offline"); };
let dir;

before(async () => {
  dir = join(T, "work", "projects", "sfx");
  await scaffold(dir, SB, { registryRoot: expandEnv(loadPins().hyperframes.registryRoot) });
});
after(() => rmSync(T, { recursive: true, force: true }));

test("cues: a comma list per frame, an offset with @, none means silent", () => {
  const c = sfx.cuesOf([{ number: 1, index: 1, start: 0, sfx: "Whoosh, pop@0.8" }, { number: 2, index: 2, start: 3, sfx: "none" }, { number: 3, index: 3, start: 6 }]);
  assert.deepEqual(c.map((x) => [x.shot, x.name, x.offset]), [[1, "whoosh", 0], [1, "pop", 0.8]]);
});

test("cues: a frame's `- sound:` list is read like `- sfx:`; a sentence about the sound is not, and an sfx line wins", async () => {
  const c = sfx.cuesOf([{ number: 1, index: 1, start: 0, sound: "water drip, Bell, ting@0.4" }, { number: 2, index: 2, start: 3, sound: "none" },
    { number: 3, index: 3, start: 6, sound: "nhạc vào nhẹ cùng khung mở; tiếng nước; \"ting\" khi đèn sáng" },
    { number: 4, index: 4, start: 9, sfx: "lamp ting@2.1", sound: "a soft ting, the river" }]);
  assert.deepEqual(c.map((x) => [x.shot, x.name, x.offset]), [[1, "water drip", 0], [1, "bell", 0], [1, "ting", 0.4], [4, "lamp ting", 2.1]]);
  // the line reaches the shots from STORYBOARD.md (HF keeps an unknown `- key:` in the frame's extra)
  const d = join(T, "sound-line"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), "<div data-composition-id=\"root\" data-width=\"1920\" data-height=\"1080\"></div>");
  writeFileSync(join(d, "STORYBOARD.md"), "# Storyboard\n\n## Frame 1 — Drip\n- duration: 3s\n- sound: water drip, bell, ting\n\n## Frame 2 — Harbour\n- duration: 2s\n- transition_in: hard cut\n- location: harbour\n");
  const { shots } = await readShots(d);
  assert.deepEqual(shots.map((x) => [x.sound, x.transitionIn, x.location]), [["water drip, bell, ting", null, null], [null, "hard cut", "harbour"]]);
});

test("search: Freesound through Openverse, CC0 and CC BY only, with the credit line", async () => {
  asked.length = 0;
  const r = await sfx.search("whoosh", { fetchImpl: online });
  const u = new URL(asked[0]);
  assert.deepEqual([u.searchParams.get("source"), u.searchParams.get("license")], ["freesound", "cc0,by"]);
  assert.equal((await sfx.search("x", { limit: 50, fetchImpl: online }), new URL(asked.at(-1)).searchParams.get("page_size")), "20", "Openverse answers 401 above 20 without a key");
  assert.deepEqual(r.map((x) => [x.id, x.licence]), [["a2", "CC BY 4.0"], ["a3", "CC0 1.0"], ["a4", "CC BY 4.0"]], "no NC licence");
  assert.equal(r[0].durationS, 9);
  assert.match(r[0].attribution, /by Someone/);
});

test("offline set: Pixabay's sounds (credited to Pixabay, with the copy HF ships), matched by key, file name or slug", () => {
  const b = sfx.bundled();
  assert.ok(b.length >= 19);
  assert.deepEqual([b[0].source, b[0].creator, b[0].licence], ["pixabay", "Pixabay", "Pixabay Content License"]);
  assert.match(b[0].via, /^the copy HyperFrames ships in its media-use skill: https:\/\/github\.com\/heygen-com\/hyperframes\/blob\/[0-9a-f]{40}\/skills\/media-use\/audio\/assets\/sfx\//);
  assert.ok(b.every((x) => x.id.startsWith("pixabay:") && !/hyperframes/i.test(x.creator)));
  assert.equal(sfx.matchBundled("Whoosh", b)?.title, "whoosh");
  assert.equal(sfx.matchBundled("whoosh.mp3", b)?.title, "whoosh");
  assert.equal(sfx.matchBundled("laser zap", b), null);
});

test("apply: sounds found (short ones first), placed at the shot's start under the voice, credited; again = same result", async () => {
  await updateFrame(dir, 1, { sfx: "whoosh, pop@0.5" });
  await updateFrame(dir, 3, { sfx: "chime" });
  const { shots } = await readShots(dir);
  const r = await sfx.apply(dir, shots, { fetchImpl: online });
  assert.deepEqual([r.cues, r.placed, r.added.length, r.missing], [3, 3, 3, []]);
  const st = sfx.readState(dir);
  assert.equal(st.sounds.whoosh.id, "a3", "the first CC0 / CC BY result of at most 6 s");
  assert.equal(st.sounds.whoosh.file, "assets/3_audio/sfx/whoosh.mp3");
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const shot3 = shots.find((x) => x.number === 3);
  assert.match(html, /<audio id="el-sfx-1" src="assets\/3_audio\/sfx\/pop\.mp3" data-start="0\.5" data-duration="0\.9" data-track-index="21" data-volume="0\.35"><\/audio>/);
  assert.match(html, new RegExp(`id="el-sfx-2" src="assets/3_audio/sfx/chime.mp3" data-start="${shot3.start}"`));
  assert.match(readFileSync(docPath(dir, "CREDITS.md"), "utf8"), /## Sound effects[\s\S]*\*\*whoosh\*\* \(`assets\/3_audio\/sfx\/whoosh\.mp3`\): "sound a3" by Someone/);
  await sfx.apply(dir, shots, { fetchImpl: offline });
  const again = readFileSync(join(dir, "index.html"), "utf8");
  assert.equal(again.match(/mw:sfx \(/g).length, 1, "one block, rewritten");
  assert.equal(again.match(/<audio id="el-sfx-/g).length, 3);
  const audio = (await readShots(dir)).audio.filter((a) => a.id?.startsWith("el-sfx-"));
  assert.equal(audio.length, 3, "the timeline's Audio track shows them");
});

test("a rewrite keeps what HyperFrames Studio wrote: its element id, a hand-set volume, and the timing until the storyboard moves the cue", async () => {
  const f = join(dir, "index.html");
  const tag = (html) => /<audio\b[^>]*id="el-sfx-1"[^>]*>/.exec(html)[0];
  // Studio stamps its id and the user drags the clip and turns it up (HF writes attributes in place)
  writeFileSync(f, readFileSync(f, "utf8").replace(/<audio id="el-sfx-1"([^>]*)data-start="0\.5"([^>]*)data-volume="0\.35"/,
    '<audio data-hf-id="hf-x1" id="el-sfx-1"$1data-start="0.7"$2data-volume="0.8"'));
  await sfx.apply(dir, (await readShots(dir)).shots, { fetchImpl: offline });
  let t = tag(readFileSync(f, "utf8"));
  assert.match(t, /data-hf-id="hf-x1"/); assert.match(t, /data-start="0\.7"/); assert.match(t, /data-volume="0\.8"/);
  await updateFrame(dir, 1, { sfx: "whoosh, pop@0.2" });           // the storyboard moves that cue: its timing wins, Studio's id and volume stay
  await sfx.apply(dir, (await readShots(dir)).shots, { fetchImpl: offline });
  t = tag(readFileSync(f, "utf8"));
  assert.match(t, /data-hf-id="hf-x1"/); assert.match(t, /data-start="0\.2"/); assert.match(t, /data-volume="0\.8"/);
  await updateFrame(dir, 1, { sfx: "whoosh, pop@0.5" });
  await sfx.apply(dir, (await readShots(dir)).shots, { fetchImpl: offline });
});

test("offline: Pixabay's sound of that name; a name it does not have is skipped, not an error", async () => {
  const d = join(T, "work", "projects", "sfx-offline");
  await scaffold(d, SB, { registryRoot: expandEnv(loadPins().hyperframes.registryRoot) });
  await updateFrame(d, 1, { sfx: "riser, laser zap" });
  const r = await sfx.apply(d, (await readShots(d)).shots, { fetchImpl: offline });
  assert.deepEqual([r.placed, r.missing, r.offline], [1, ["laser zap"], true]);
  const st = sfx.readState(d);
  assert.deepEqual([st.sounds.riser.source, st.sounds.riser.licence], ["pixabay", "Pixabay Content License"]);
  assert.match(readFileSync(docPath(d, "CREDITS.md"), "utf8"), /\*\*riser\*\*.*Pixabay Content License/);
});

test("the film with its sounds passes the checks (HF lint included) and renders with an audio track", { timeout: 300000 }, async () => {
  const g = await runGates(dir);
  assert.deepEqual(g.gates.filter((x) => x.blocking && !x.pass).map((x) => [x.id, JSON.stringify(x.findings?.[0] ?? "").slice(0, 200)]), []);
  const out = join(T, "sfx.mp4");
  const r = await render({ projectDir: dir, outputPath: out, fps: 25 }, { logFile: join(T, "render.log") });
  assert.equal(r.type, "done", r.message);
  const probe = execFileSync(join(expandEnv(loadPins().ffmpeg.dir), "ffprobe.exe"), ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", out], { encoding: "utf8", windowsHide: true }).trim();
  assert.equal(probe, "audio");
});

test("a sound picked for a shot: its id read again (CC0 / CC BY, or Pixabay's set), the cue on the shot with its credit; taken off, the file stays", async () => {
  assert.equal(await sfx.details("../../etc"), null, "only an Openverse id or one of Pixabay's set");
  const item = await sfx.details("pixabay:click");
  assert.equal(item.licence, "Pixabay Content License");
  const shot2 = (await readShots(dir)).shots.find((x) => x.number === 2);
  await sfx.useSound(dir, "click", item);
  await updateFrame(dir, shot2.index, { sfx: "click" });
  await sfx.apply(dir, (await readShots(dir)).shots, { fetchImpl: offline });
  assert.ok(sfx.cuesOf((await readShots(dir)).shots).some((c) => c.shot === 2 && c.name === "click"));
  assert.equal(sfx.readState(dir).sounds.click.licence, "Pixabay Content License");
  assert.ok(readFileSync(join(dir, "index.html"), "utf8").includes('src="assets/3_audio/sfx/click.mp3"'));
  await updateFrame(dir, shot2.index, { sfx: "" });
  await sfx.apply(dir, (await readShots(dir)).shots, { fetchImpl: offline });
  assert.equal((await readShots(dir)).shots.find((x) => x.number === 2).sfx, "none");
  assert.ok(!readFileSync(join(dir, "index.html"), "utf8").includes('src="assets/3_audio/sfx/click.mp3"'));
  assert.ok(existsSync(join(dir, "assets", "3_audio", "sfx", "click.mp3")), "the file stays (undo, other shots)");
});

test("one failed search does not send every other sound offline; each name is tried twice", async () => {
  const d = join(T, "flaky"); mkdirSync(d, { recursive: true });
  let n = 0;
  const flaky = async (url) => { if (url.startsWith(sfx.OPENVERSE) && n++ === 0) throw new Error("ECONNRESET"); return online(url); };
  const r = await sfx.resolveCues(d, ["laser zap", "door creak", "crowd cheer"].map((name) => ({ name })), { fetchImpl: flaky });
  assert.deepEqual([r.added.sort(), r.missing, r.offline], [["crowd cheer", "door creak", "laser zap"], [], false]);
  const d2 = join(T, "down"); mkdirSync(d2, { recursive: true });
  const r2 = await sfx.resolveCues(d2, ["laser zap", "whoosh"].map((name) => ({ name })), { fetchImpl: offline });
  assert.deepEqual([r2.added, r2.missing], [["whoosh"], ["laser zap"]], "really offline: the bundled sounds still come");
});

// The music plays to the film's end with a fade out (a cut at the twist is What If's own rule): the house rules
// no longer stop it at a twist, the What If kind keeps its own stop at the turn, and the app applies a Motion Plan's musicStop only in a
// What If film or when the plan quotes the brief's or the user's ask. The Final Mix's "Stop the music at" is unchanged; old films too.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-music-end-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const { placeTrack, stopMusic } = await import("../packages/hf-edit/tracks.mjs");
const plan = await import("../packages/motion-plan/index.mjs");
const rule = (id) => readFileSync(new URL(`../config/rules/${id}/SKILL.md`, import.meta.url), "utf8").replace(/\s+/g, " ");

test("the music track fades out at its end (HyperFrames' data-fade-out); a stop is a cut, and play to the end brings the fade back", () => {
  const d = join(T, "fade"); mkdirSync(d, { recursive: true });
  const page = (inner = "") => `<div data-composition-id="root" data-duration="30">${inner}</div>\n`;
  writeFileSync(join(d, "index.html"), page());
  const tag = (id = "el-music") => new RegExp(`<audio [^>]*id="${id}"[^>]*>`).exec(readFileSync(join(d, "index.html"), "utf8"))[0];
  placeTrack(d, { kind: "music", src: "assets/music.mp3", duration: 30 });
  assert.match(tag(), /data-fade-out="3.2"/, "a 30 s film: its content's fade, added after it (hf-edit/ending.mjs)");
  placeTrack(d, { kind: "voice", src: "assets/voice.mp3", duration: 28 });
  assert.doesNotMatch(tag("el-voice"), /data-fade-out/, "the voice is not faded");
  stopMusic(d, 12.5);
  assert.doesNotMatch(tag(), /data-fade-out=/, "a stop cuts");
  assert.match(tag(), /data-mw-fade-out="3.2"/);
  placeTrack(d, { kind: "music", src: "assets/music.mp3", duration: 30 });
  assert.doesNotMatch(tag(), / data-fade-out=/, "still a cut when placed again");
  stopMusic(d, null);
  assert.match(tag(), / data-fade-out="3.2"/);
  assert.doesNotMatch(tag(), /data-mw-fade-out/);
  placeTrack(d, { kind: "music", src: "assets/other.mp3", duration: 4 });
  assert.match(tag(), /data-fade-out="1"/, "a quarter of a short track");
  // a film placed before the fade keeps its music as it was
  writeFileSync(join(d, "index.html"), page('<audio id="el-music" src="assets/old.mp3" data-start="0" data-duration="30" data-volume="0.6" data-timeline-role="music"></audio>'));
  placeTrack(d, { kind: "music", src: "assets/old.mp3", duration: 30 });
  assert.doesNotMatch(tag(), /data-fade-out/);
});

test("the Motion Plan's musicStop is applied only in a What If film, or when it quotes the brief's or the user's ask", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { boardRoutes } = await import("../packages/server/boards.mjs");
  const film = (name, { stop = 20, asked = null, meta = null } = {}) => {
    const d = join(T, name); mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-fps="30" data-duration="40">\n<audio id="el-music" data-timeline-role="music" src="assets/3_audio/music/m.mp3" data-start="0" data-duration="40" data-volume="0.6" data-fade-out="2"></audio>\n</div>\n');
    writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, musicStop: stop, ...(asked ? { musicStopAsked: asked } : {}), shots: [{ shot: 1, motions: [] }] }));
    const id = projects.openProject(d, T).id;
    projects.updateMeta(id, (m) => { m.music = { file: "assets/3_audio/music/m.mp3", duration: 40 }; meta?.(m); }, T);
    const ctx = { root: T, preview: { base: "http://x" }, jobs: { list: () => [] }, stopping: { signal: null }, agent: { running: new Map(), list: () => [] } };
    boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject: () => projects.getProject(id, T), HttpError: Error });
    return { d, apply: () => ctx.mix.stopFromPlan(projects.getProject(id, T)), meta: () => projects.getProject(id, T).meta };
  };
  // A film with a twist and no ask plays its music to the end, with its fade
  const plain = film("plain");
  assert.equal(await plain.apply(), null);
  assert.doesNotMatch(readFileSync(join(plain.d, "index.html"), "utf8"), /data-mw-stop/);
  assert.match(readFileSync(join(plain.d, "index.html"), "utf8"), / data-fade-out="2"/);
  assert.equal(plain.meta().music.stopAt, undefined);
  // the What If film kind, the What If animation style, and a quoted ask: the stop is applied (a cut)
  for (const [name, o] of [["kind", { meta: (m) => { m.brief = { ...m.brief, answers: { ...m.brief?.answers, filmKind: "whatIf" } }; } }],
    ["style", { meta: (m) => { m.style = { id: "what-if", title: "What If", source: "test" }; } }],
    ["asked", { asked: "the music stops when the door shuts" }]]) {
    const f = film(name, o);
    assert.equal(await f.apply(), 20, name);
    const html = readFileSync(join(f.d, "index.html"), "utf8");
    assert.match(html, /data-mw-stop="20"/, name);
    assert.doesNotMatch(html, / data-fade-out=/, `${name}: a cut`);
  }
  // the plan keeps the ask; an empty one is left out
  assert.equal(plan.read(join(T, "asked")).plan.musicStopAsked, "the music stops when the door shuts");
  assert.equal(plan.read(join(T, "plain")).plan.musicStopAsked, undefined);
});

test("the house rules play the music to the end; only What If stops it at the turn; the Motion Plan and the tool say so", () => {
  const house = rule("moworks-studio");
  assert.match(house, /\*\*The music plays to the film's end and fades out there\*\*/);
  assert.match(house, /only when the owner or the brief asks for it/);
  assert.match(house, /never stop the music at a twist on your own/);
  assert.doesNotMatch(house, /The music stops at the twist/);
  for (const keep of ["never on it", "Effects line up by their attack", "The voice stays on top", "-16 LUFS"]) assert.ok(house.includes(keep), keep);
  assert.match(rule("what-if"), /\*\*In this kind only, the music stops at the turn\*\*/);
  // the stop at the turn lives in the What If rule alone
  const dir = new URL("../config/rules/", import.meta.url);
  const stops = readdirSync(dir).filter((id) => { try { return /music (stops|cut) (at|on) the (turn|twist)/i.test(rule(id)); } catch { return false; } });
  assert.deepEqual(stops, ["what-if"]);
  assert.match(plan.PROMPT, /"musicStopAsked":/);
  assert.match(plan.PROMPT, /The music plays to the film's end and fades out there .*leave musicStop null/);
  assert.doesNotMatch(plan.PROMPT, /cuts out at the twist/);
  const agent = readFileSync(new URL("../packages/agent/index.mjs", import.meta.url), "utf8");
  assert.match(agent, /stop it only in a What If film \(at the turn\) or when the owner or the brief asks for it/);
});

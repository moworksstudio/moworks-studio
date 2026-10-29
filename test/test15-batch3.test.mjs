// The Motion Plan's music stop is applied when the music is on the timeline; the author's marks stay in
// the Build unless the user chose.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t15c-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
after(() => rmSync(T, { recursive: true, force: true }));

const plan = await import("../packages/motion-plan/index.mjs");
const { optionsText } = await import("../packages/sfx/music.mjs");

test("MOTION-PLAN.json carries musicStop, and Claude is told to write it", () => {
  const d = join(T, "plan"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, musicStop: 26.5, shots: [{ shot: 1, motions: [] }] }));
  assert.equal(plan.read(d).plan.musicStop, 26.5);
  writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, musicStop: null, shots: [] }));
  assert.equal(plan.read(d).plan.musicStop, undefined);
  assert.match(plan.PROMPT, /"musicStop":/);
  assert.match(plan.PROMPT, /the app stops the music there/);
});

test("the music step's words say the app stops the music where the plan says, never the user", () => {
  const round = { id: "R1", tracks: [{ title: "Keep Smiling", file: "audio/music-options/R1/1-keep-smiling.mp3", duration: 40 }], failed: [] };
  const t = optionsText(round, { placeMusic: true, placeSfx: true, stopAt: 26.5 });
  assert.match(t, /stops the music at 26\.5 s, as the Motion Plan says/);
  assert.match(t, /never ask the owner to set it/);
  assert.doesNotMatch(optionsText(round, { placeMusic: true, placeSfx: true }), /Motion Plan/);
});

test("the plan's stop is applied once the music is on the timeline, and not over a choice already made", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { boardRoutes } = await import("../packages/server/boards.mjs");
  const d = join(T, "film"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-fps="24" data-duration="40">\n<audio id="el-music" data-timeline-role="music" src="assets/3_audio/music/1-keep-smiling.mp3" data-start="0" data-duration="40" data-volume="0.6"></audio>\n</div>\n');
  writeFileSync(join(d, "MOTION-PLAN.json"), JSON.stringify({ version: 1, musicStop: 26.5, musicStopAsked: "the music stops on the nod", shots: [{ shot: 1, motions: [] }] }));
  const id = projects.openProject(d, T).id;
  projects.updateMeta(id, (m) => { m.music = { file: "assets/3_audio/music/1-keep-smiling.mp3", duration: 40 }; }, T);
  const ctx = { root: T, preview: { base: "http://x" }, jobs: { list: () => [] }, stopping: { signal: null }, agent: { running: new Map(), list: () => [] } };
  boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject: () => projects.getProject(id, T), HttpError: Error });
  assert.equal(await ctx.mix.stopFromPlan(projects.getProject(id, T)), 26.5);
  assert.match(readFileSync(join(d, "index.html"), "utf8"), /data-mw-stop="26.5"/);
  assert.equal(projects.getProject(id, T).meta.music.stopAt, 26.5);
  // a stop already set (here the plan's own) is left alone
  assert.equal(await ctx.mix.stopFromPlan(projects.getProject(id, T)), null);
  // someone chose "play to the end": the plan does not put the stop back
  projects.updateMeta(id, (m) => { delete m.music.stopAt; m.music.toEnd = true; }, T);
  assert.equal(await ctx.mix.stopFromPlan(projects.getProject(id, T)), null);
  // no music yet: nothing
  projects.updateMeta(id, (m) => { delete m.music; }, T);
  assert.equal(await ctx.mix.stopFromPlan(projects.getProject(id, T)), null);
});

test("the music step's end applies the plan's stop after placing the music", () => {
  const src = readFileSync(new URL("../packages/server/autopilot.mjs", import.meta.url), "utf8");
  const after = src.slice(src.indexOf("async function afterSound"), src.indexOf("async function afterSound") + 1200);
  assert.ok(after.indexOf("useOption") < after.indexOf("stopFromPlan") && after.indexOf("stopFromPlan") < after.indexOf("placeSfx"));
});

test("the Build keeps the author's marks unless the user chose otherwise", () => {
  const rule = readFileSync(new URL("../config/rules/moworks-studio/SKILL.md", import.meta.url), "utf8").replace(/\s+/g, " ");
  assert.match(rule, /The Build and the Review keep every such mark in every frame unless the owner chose otherwise/);
  assert.match(rule, /without the owner's choice .* is not a choice: ask with these choices before you build, and keep the mark until the owner answers/);
});

test("an effect plays at most 6 s and never past the film's end; the user's own sound keeps its length", async () => {
  const { mount, MAX_AUTO_S } = await import("../packages/sfx/index.mjs");
  const d = join(T, "sfx"); mkdirSync(join(d, ".moworks"), { recursive: true }); mkdirSync(join(d, "assets", "3_audio", "sfx"), { recursive: true });
  for (const n of ["film-projector", "pop", "rain"]) writeFileSync(join(d, "assets", "3_audio", "sfx", `${n}.mp3`), "x");
  writeFileSync(join(d, ".moworks", "sfx.json"), JSON.stringify({ sounds: {
    "film-projector": { file: "assets/3_audio/sfx/film-projector.mp3", durationS: 181.539 },
    pop: { file: "assets/3_audio/sfx/pop.mp3", durationS: 0.4 },
    rain: { file: "assets/3_audio/sfx/rain.mp3", durationS: 60, source: "owner" } } }));
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="40"></div>\n');
  const cues = [{ name: "film-projector", start: 0, offset: 0 }, { name: "pop", start: 39.8, offset: 0 }, { name: "rain", start: 10, offset: 0 }, { name: "pop", start: 41, offset: 0 }];
  const placed = mount(d, cues, { filmEnd: 40 });
  assert.deepEqual(placed.map((p) => [p.name, p.duration]), [["film-projector", MAX_AUTO_S], ["pop", 0.2], ["rain", 30]], "none past 40 s; the one after the end is left out");
  const html = readFileSync(join(d, "index.html"), "utf8");
  assert.match(html, /film-projector\.mp3" data-start="0" data-duration="6"/);
  assert.doesNotMatch(html, /181/);
  // a timing kept from before (the cue did not move) is capped too
  writeFileSync(join(d, ".moworks", "sfx.json"), JSON.stringify({ ...JSON.parse(readFileSync(join(d, ".moworks", "sfx.json"), "utf8")),
    mounted: [{ name: "film-projector", start: 0, volume: 0.35 }] }));
  writeFileSync(join(d, "index.html"), html.replace('data-duration="6"', 'data-duration="181.539"'));
  mount(d, cues.slice(0, 1), { filmEnd: 40 });
  assert.match(readFileSync(join(d, "index.html"), "utf8"), /film-projector\.mp3" data-start="0" data-duration="6"/);
});

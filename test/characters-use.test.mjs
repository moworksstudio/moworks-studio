// The Characters page's "Use in a project" lists only the films whose style has characters (Brush cartoon), and a film whose
// style has none never gets a CHARACTERS.json. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docPath } from "../packages/project-service/docs.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-chars-use-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");          // signed out: no Claude task starts from a test
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
// a character of the user's library (the app ships none of its own since the sample Pip was removed): the test film's Bao
process.env.MW_CHARACTERS_ROOT = join(T, "characters");
mkdirSync(join(T, "characters", "user"), { recursive: true });
writeFileSync(join(T, "characters", "user", "bao.json"), JSON.stringify(JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "brush-mini", "CHARACTERS.json"), "utf8")).characters[0]));
after(() => rmSync(T, { recursive: true, force: true }));

test("Use in a project: only films with characters; another film is refused and gets no CHARACTERS.json", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, p, b) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const brush = (await call("POST", "/projects", { title: "demo-brush-use", aspect: "16:9", durationSec: 10, styleId: "brush-cartoon" })).json;
    const launch = (await call("POST", "/projects", { title: "demo-launch-use", aspect: "16:9", durationSec: 10, styleId: "hf-launch" })).json;
    // Every film is listed; a film without a character layer takes the character as a reference, never a CHARACTERS.json
    const list = (await call("GET", "/characters/projects")).json.projects;
    assert.deepEqual(list.map((x) => [x.id, x.characters]).sort(), [[brush.id, true], [launch.id, false]].sort());
    const ref = await call("POST", `/projects/${launch.id}/characters/use`, { ids: ["bao"] });
    assert.equal(ref.status, 200, JSON.stringify(ref.json)); assert.deepEqual(ref.json.reference, ["bao"]);
    const lp = projects.getProject(launch.id).path;
    assert.ok(!existsSync(docPath(lp, "CHARACTERS.json")));
    assert.ok(existsSync(join(lp, "assets", "_app", "characters", "bao", "CHARACTER.md")));
    assert.match(readFileSync(join(lp, "assets", "_app", "characters", "bao", "CHARACTER.md"), "utf8"), /Never ask the owner to add it from the library/);
    assert.equal(projects.getProject(launch.id).meta.characters.as, "reference");
    assert.equal((await call("POST", `/projects/${brush.id}/characters/use`, { ids: ["bao"] })).status, 200);
    assert.ok(existsSync(docPath(projects.getProject(brush.id).path, "CHARACTERS.json")));
  } finally { await s.close(); }
});

test("characters picked in New project are in the film from the start; with them there, the Character step is still Claude's to run", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const pipe = await import("../packages/pipeline/index.mjs");
  const { readShots } = await import("../packages/hf-edit/shots.mjs");
  const { stylePipeline } = await import("../packages/style-catalog/index.mjs");
  const brush = await projects.createProject({ title: "demo-brush-cast", aspect: "16:9", durationSec: 10, brief: "Bao and a new robot", characters: ["bao", "clawd", "nobody"],
    style: { id: "brush-cartoon", title: "Brush cartoon" } }, {});
  assert.deepEqual(brush.meta.characters?.ids, ["bao"], "only a selectable library character (never the Clawd demo)");
  assert.ok(existsSync(join(brush.path, "docs", "CHARACTERS.json")), "in docs/");
  const other = await projects.createProject({ title: "demo-launch-cast", aspect: "16:9", durationSec: 10, brief: "x", characters: ["bao"], style: { id: "general", title: "General" } }, {});
  assert.ok(!existsSync(docPath(other.path, "CHARACTERS.json")), "a style without characters takes no cast file");
  assert.ok(existsSync(join(other.path, "assets", "_app", "characters", "bao", "CHARACTER.md")), "QC #286: it takes the character as a reference");
  assert.equal(other.meta.characters.as, "reference");
  // the brief answered, BRIEF.md written: the Character step is next for Claude, not "waiting for your approval"
  writeFileSync(join(brush.path, "BRIEF.md"), "brief");
  projects.updateMeta(brush.id, (m) => { (m.pipeline ??= {}).ran = { brief: { at: new Date().toISOString() } }; });
  const p = projects.getProject(brush.id);
  const { shots } = await readShots(p.path);
  const state = pipe.computePipeline(stylePipeline("brush-cartoon"), pipe.gatherFacts(p, { shots }));
  assert.equal(state.find((x) => x.id === "character").status, "ready");
  assert.equal(pipe.nextAuto(state)?.id, "character");
});

test("anidoodle human characters: a human hand's films show a Character step, a film with no people passes it without a click; a human in another style is a reference", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const pipe = await import("../packages/pipeline/index.mjs");
  const { humanHandOf } = await import("../packages/style-catalog/hands.mjs");
  const { readShots } = await import("../packages/hf-edit/shots.mjs");
  const { stylePipeline } = await import("../packages/style-catalog/index.mjs");
  assert.equal(humanHandOf("anidoodle-storybook"), "storybook"); assert.equal(humanHandOf("anidoodle-balloon"), null); assert.equal(humanHandOf("general"), null);
  const p0 = await projects.createProject({ title: "demo-anidoodle-cast", aspect: "16:9", durationSec: 10, brief: "a lighthouse at dusk", style: { id: "anidoodle-storybook", title: "Storybook" } }, {});
  const f = (p) => pipe.gatherFacts(p, { shots: [] });
  assert.equal(f(projects.getProject(p0.id)).flags.humanHand, true);
  const steps = stylePipeline("anidoodle-storybook");
  if (steps.some((s) => s.id === "character")) {          // The pipeline's Character step in config/anidoodle-pipeline.json
    writeFileSync(join(p0.path, "BRIEF.md"), "brief"); writeFileSync(join(p0.path, "CHARACTERS.json"), JSON.stringify({ characters: [] }));
    projects.updateMeta(p0.id, (m) => { m.pipeline = { marks: { brief: { at: new Date().toISOString() } }, skips: {}, ran: { brief: { at: new Date().toISOString() }, character: { at: new Date().toISOString() } } }; });
    const state = pipe.computePipeline(steps, f(projects.getProject(p0.id)));
    assert.equal(state.find((x) => x.id === "character").status, "done", "no people in the film: nothing to approve");
  }
  const { humanCharacters } = await import("../packages/character-kit/index.mjs");
  const human = humanCharacters()[0];
  if (human) {
    const g = await projects.createProject({ title: "demo-general-human", aspect: "16:9", durationSec: 10, brief: "x", characters: [human.id], style: { id: "general", title: "General" } }, {});
    assert.ok(existsSync(join(g.path, "assets", "_app", "characters", human.id, "CHARACTER.md")), "a saved anidoodle human as a reference in a General film");
  }
});

test("a saved character joins a film only when the brief writes its name as a name, never the Vietnamese word \"theo\"", async () => {
  const { namedIn } = await import("../packages/project-service/index.mjs");
  assert.equal(namedIn("Nhạc vui, nhỏ nhẹ, có tiếng gạch cạch theo nhịp.", "Theo"), false, "theo: along with");
  assert.equal(namedIn("Theo số liệu của chiến dịch, doanh thu tăng.", "Theo"), false, "a capital at a sentence's start");
  assert.equal(namedIn("Phim có Theo làm bánh ở tiệm.", "Theo"), true);
  assert.equal(namedIn("Use Bao again, with a new robot", "Bao"), true);
  assert.equal(namedIn("Bao", ""), false);
  const projects = await import("../packages/project-service/index.mjs");
  const p = await projects.createProject({ title: "demo-no-cast", aspect: "16:9", durationSec: 10, brief: "Nhạc có tiếng gạch cạch bao quanh, gạch rơi theo nhịp.", style: { id: "general", title: "General" } }, {});
  assert.equal(p.meta.characters, undefined, "nothing picked, no name in the brief: no character");
});

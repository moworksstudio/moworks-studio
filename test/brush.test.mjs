// The Brush cartoon style: ClaudeAnimationBase's method on the app's character layer. The catalog entry
// (author, 16:9, a Character gate before the storyboard), the project's characters (CHARACTERS.json: checked, from the library, saved to
// the user's own, never Clawd), R-CAST (the kit and cast.js in the film and its boards), the reads, the routes, and (with the offline
// assets) the model sheets and a film rendered through HyperFrames.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docPath, docRelIn } from "../packages/project-service/docs.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-brush-"));
Object.assign(process.env, { MW_CHARACTERS_ROOT: join(T, "characters"), MW_WORK_ROOT: join(T, "work"), MW_STATE_DIR: join(T, "state"), MW_BACKUP_ROOT: join(T, "backup"),
  MW_NO_BACKUP: "1", MW_NO_LIBRARY_IMPORT: "1", MW_NO_ASSET_INSTALL: "1" });
after(() => rmSync(T, { recursive: true, force: true }));
const K = await import("../packages/character-kit/index.mjs");
const { getStyle, stylePipeline, styleList } = await import("../packages/style-catalog/index.mjs");
const { requiredReads } = await import("../packages/agent/reads.mjs");
const { boardFonts, finalize } = await import("../packages/hf-edit/finalize.mjs");
const { check, snapshotAt } = await import("../packages/hf-qa/cli.mjs");
const { stillStd } = await import("../packages/hf-qa/gates.mjs");
const { render } = await import("../packages/hf-render-worker/client.mjs");
const { status } = await import("../packages/offline-assets/index.mjs");
const { APP_ROOT } = await import("../packages/version-manager/index.mjs");
const SHA = "0ac8bf2b31942376cb6b8c4074715595d512acd2";
const skip = !K.kitSource()?.intact && "the ClaudeAnimationBase clone is not at the pinned commit";
const fixture = (name) => { const d = join(T, name); cpSync(join(APP_ROOT, "test", "fixtures", "brush-mini"), d, { recursive: true }); return d; };
/** A project whose cast is Bao renamed (a second character for the library). */
const another = (name, id) => {
  const d = fixture(name), bao = K.readCast(d).characters[0];
  writeFileSync(join(d, "CHARACTERS.json"), JSON.stringify({ characters: [{ ...bao, id, name: id[0].toUpperCase() + id.slice(1) }] }));
  return d;
};

test("the style: Brush cartoon by John Heibel, 16:9, the guide as its rule, a Character gate before the storyboard, its sample brief", { skip }, async () => {
  const s = getStyle("brush-cartoon");
  assert.deepEqual([s.author, s.aspects, s.available, s.characters], ["johnheibel", ["16:9"], true, true]);
  assert.ok(s.credit.link.includes(`ClaudeAnimationBase/tree/${SHA}`));
  assert.deepEqual(s.readFirst, ["brush-cartoon", "brush-cartoon-app"]);
  const steps = stylePipeline("brush-cartoon"), ids = steps.map((x) => x.id);
  assert.ok(ids.indexOf("character") === ids.indexOf("brief") + 1 && ids.indexOf("storyboard") === ids.indexOf("character") + 1, ids.join(","));
  const ch = steps.find((x) => x.id === "character");
  assert.deepEqual([ch.gate, ch.done], [true, { kind: "approval", name: "characters", file: "CHARACTERS.json" }]);
  assert.match(ch.action.prompt, /character_sheet/); assert.match(ch.action.prompt, /never Clawd/);
  assert.ok(styleList().authors.some((a) => a.id === "johnheibel" && a.count === 1));
  const text = K.ruleText();
  assert.match(text, /^---\nname: brush-cartoon\n/); assert.match(text, /Clawd is Anthropic's mascot and is never in this film/);
  assert.ok(text.endsWith(readFileSync(join(K.kitSource().root, "ANIMATION_GUIDE.md"), "utf8")), "the guide as shipped");
  const { BRIEF_SAMPLES } = await import("../ui/src/workflow/briefSample.js");
  assert.match(BRIEF_SAMPLES["brush-cartoon"].en, /Character \(new, our own\)/);
});

test("a project's characters: checked, taken from the library (never the demo), saved to the user's own and used again, deleted", () => {
  const d = fixture("cast"), bao = K.readCast(d).characters[0];
  assert.deepEqual(K.checkCharacter(bao), []);
  assert.deepEqual(K.checkCharacter(K.exampleDefinition()), [], "the rules' schema example is a whole definition");
  assert.ok(K.checkCharacter({ ...bao, id: "clawd" }).some((p) => /Anthropic's mascot/.test(p)));
  assert.ok(K.checkCharacter({ id: "x" }).length > 5);
  assert.deepEqual(K.readCast(d).problems, []);
  // The sample Pip is gone; the app ships no character of its own, only the Clawd demo (never selectable)
  assert.deepEqual(K.characters().filter((c) => c.group !== "yours").map((c) => [c.id, c.group, c.selectable]), [["clawd", "demo", false]]);
  assert.throws(() => K.useCharacters(d, ["clawd"]), { code: "INVALID" });
  const saved = K.saveCharacter(d, "bao");
  assert.deepEqual([saved.group, saved.selectable, saved.demo], ["yours", true, false]);
  const k = another("kimi", "kimi");
  const c = K.useCharacters(k, ["bao"]);
  assert.deepEqual(c.characters.map((x) => x.id), ["kimi", "bao"], "the ones already there are kept");
  assert.equal(c.characters[1].from.library, "yours");
  const e = fixture("again");
  rmSync(join(e, "CHARACTERS.json"));
  assert.deepEqual(K.useCharacters(e, ["bao"]).characters.map((x) => x.id), ["bao"]);
  writeFileSync(docPath(e, "CHARACTERS.json"), "{ nope");
  assert.match(K.readCast(e).problems[0], /not JSON/);
  K.deleteUserCharacter("bao");
  assert.equal(K.getCharacter("bao"), null);
  assert.throws(() => K.deleteUserCharacter("clawd"), { code: "INVALID" });
});

test("a user's characters stay out of git: the store is outside the app's repository, saving refuses a store inside it, git tracks no user character", async () => {
  const { execFileSync } = await import("node:child_process");
  const prev = process.env.MW_CHARACTERS_ROOT;
  try {
    delete process.env.MW_CHARACTERS_ROOT;
    assert.equal(K.userStoreInRepo(APP_ROOT), false, `the real store ${K.userDir(APP_ROOT)} is outside ${APP_ROOT}`);
    process.env.MW_CHARACTERS_ROOT = join(APP_ROOT, "library-characters-test");
    assert.equal(K.userStoreInRepo(APP_ROOT), true);
    assert.throws(() => K.saveCharacter(fixture("inrepo"), "bao"), { code: "INVALID" });
    assert.ok(!existsSync(join(APP_ROOT, "library-characters-test")), "nothing written inside the repository");
  } finally { process.env.MW_CHARACTERS_ROOT = prev; }
  // every tracked path, read once: the repository ships its bundle (about 14,000 files, over spawnSync's 1 MB default buffer)
  const all = execFileSync("git", ["-C", APP_ROOT, "ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true }).split(/\r?\n/);
  const tracked = all.filter((f) => /characters/i.test(f) && f.endsWith(".json"));
  // the Clawd demo (its definition, and the demo media's record in the bundle) and the test film's Bao: nothing else (the sample Pip was
  // removed)
  const reference = /^(packages\/character-kit\/demo\/clawd\.json|bundle\/library\/characters\/clawd\/demo\.json|test\/fixtures\/brush-mini\/CHARACTERS\.json)$/;
  // and anidoodle's own characters as shipped with its engine (Mira, Theo, Bit, the cheetah; Apache-2.0), known by their source:
  // the ids the pinned engine ships (its characters/ folder and the author's rigs), credited to the author, made "as shipped"
  const { AUTHOR: ANI, anidoodleSource } = await import("../packages/anidoodle-styles/index.mjs");
  const ani = anidoodleSource(APP_ROOT), shipped = new Set([...K.AUTHOR_RIGS.map((a) => a.id),
    ...(ani ? readdirSync(join(ani.skillDir, "engine", "src", "canvas-core", "characters")) : [])]);
  const authors = (f) => {
    const id = /^bundle\/library\/characters\/anidoodle-human\/([a-z0-9-]+)\/character\.json$/.exec(f)?.[1];
    if (!id || !shipped.has(id)) return false;
    const c = JSON.parse(readFileSync(join(APP_ROOT, ...f.split("/")), "utf8"));
    return c.id === id && c.credit?.made === "as shipped" && c.credit?.author === ANI.name;
  };
  assert.deepEqual(tracked.filter((f) => !reference.test(f) && !authors(f)), [], "only the Clawd demo, the test film's Bao and anidoodle's own characters are in the repo");
  assert.deepEqual(all.filter((f) => /(^|\/)pip(\/|\.json$)/.test(f)), [], "Pip is in no tracked path");
  // the user's own characters never are, whatever made them
  for (const id of ["grandma", "firefighter", "lantern", "tofu"]) assert.deepEqual(all.filter((f) => new RegExp(`(^|/)${id}(/|\\.)`, "i").test(f) && /characters/i.test(f)), [], `${id} is the owner's`);
});

test("R-CAST: finalize copies the kit (never clawd.js) and cast.js into the film and into a board's own folder, bridges both; a cast with Clawd is refused", { skip, timeout: 120000 }, async () => {
  const d = fixture("film");
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "index.html"), readFileSync(join(d, "index.html"), "utf8").replace(/assets\/_app/g, "../../assets/_app").replace(/compositions\/kit\//g, "kit/").replace("compositions/film.js", "board.js"));
  cpSync(join(d, "compositions", "film.js"), join(d, "boards", "A", "board.js"));
  const rep = await finalize(d, { googleFonts: false });
  assert.deepEqual(rep.cast.pages.sort(), ["boards/A/index.html", "index.html"]);
  for (const k of ["compositions/kit", "boards/A/kit"]) {
    for (const f of ["core.js", "clawd-parts.js", "timeline.js", "character.js", "cast.js", "LICENSE"]) assert.ok(existsSync(join(d, ...k.split("/"), f)), `${k}/${f}`);
    assert.ok(!existsSync(join(d, ...k.split("/"), "clawd.js")));
  }
  assert.match(readFileSync(join(d, "compositions", "kit", "cast.js"), "utf8"), /window\.CAST = [\s\S]*"bao"/);
  assert.equal(rep.lemo?.source, "mg");
  assert.equal(readFileSync(join(d, "index.html"), "utf8").match(/data-mw="lemo"/g).length, 1);
  const br = await boardFonts(d, "boards/A/index.html", { googleFonts: false });
  assert.ok(br.lemo, "the board is bridged from its own folder");
  const bad = fixture("bad");
  const cast = JSON.parse(readFileSync(join(bad, "CHARACTERS.json"), "utf8")); cast.characters[0].id = "clawd";
  writeFileSync(join(bad, "CHARACTERS.json"), JSON.stringify(cast));
  await finalize(bad, { googleFonts: false }).catch(() => {});          // the first run writes cast.js from it
  await assert.rejects(finalize(bad, { googleFonts: false }), { code: "CLAWD" });
});

test("the reads of each step: the guide and the app's pack, the layer's code at the Character step, the approved cast from the storyboard on", () => {
  const d = fixture("reads");
  for (const [rel, text] of [[".moworks/rules/brush-cartoon/SKILL.md", "g"], [".moworks/rules/brush-cartoon-app/SKILL.md", "p"], [".moworks/library/character-kit/src/character.js", "c"], [".moworks/library/character-kit/examples/definition.json", "{}"]]) {
    mkdirSync(join(d, ...rel.split("/").slice(0, -1)), { recursive: true }); writeFileSync(join(d, ...rel.split("/")), text);
  }
  const reads = (step) => requiredReads(d, { styleId: "brush-cartoon", step });
  assert.deepEqual(reads("character"), [".moworks/rules/brush-cartoon-app/SKILL.md", ".moworks/library/character-kit/src/character.js", ".moworks/library/character-kit/examples/definition.json"]);
  // the cast where the film has it (docs/, or the root of a film not moved yet, as this fixture)
  assert.ok(reads("storyboard").includes(docRelIn(d, "CHARACTERS.json")) && reads("build").includes(docRelIn(d, "CHARACTERS.json")));
  rmSync(join(d, ".moworks", "library", "character-kit"), { recursive: true, force: true });
  K.stageGuide(d);
  assert.ok(existsSync(join(d, ".moworks", "library", "character-kit", "ANIMATION_GUIDE.md")) && !existsSync(join(d, ".moworks", "library", "character-kit", "src", "clawd.js")));
  const ex = JSON.parse(readFileSync(join(d, ".moworks", "library", "character-kit", "examples", "definition.json"), "utf8"));
  assert.deepEqual([ex.id, ex.name, ex.credit, ex.label, Object.keys(ex.views)], ["example", "Example", undefined, undefined, ["front", "q", "side", "qback", "back"]], "a schema example, not Clawd by name or colour");
  assert.notEqual(ex.colors.col, K.getCharacter("clawd").colors.col);
  assert.deepEqual(readdirSync(join(d, ".moworks", "library", "character-kit", "examples")), ["definition.json"]);
});

test("the routes: the Character dialog's view, approving CHARACTERS.json, a character used from the library and saved to the user's", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { startServer } = await import("../packages/server/index.mjs");
  // signed out here: approving the characters moves the autopilot on, and no real Claude task may start from a test
  process.env.MW_CLAUDE_CONFIG_DIR = join(mkdtempSync(join(tmpdir(), "mw-brush-claude-")), "empty"); mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
  // a character of the user's library (the app ships none of its own), with its sheets (the Brush gate wants them drawn)
  const lib = another("lib", "lumo"), { execFileSync } = await import("node:child_process"), { ffmpegExe } = await import("../packages/library/preview-media.mjs");
  mkdirSync(join(lib, "characters", "sheets"), { recursive: true });
  for (const s of ["views", "emotions"]) execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=320x180", "-frames:v", "1", join(lib, "characters", "sheets", `lumo-${s}.png`)], { windowsHide: true });
  K.saveCharacter(lib, "lumo");
  const s = await startServer({ token: "t0k" });
  try {
    const call = (m, p, b) => fetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t0k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
    const res = await call("POST", "/projects", { title: "demo-brush-routes", aspect: "16:9", durationSec: 15, styleId: "brush-cartoon" });
    const made = await res.json();
    assert.equal(res.status, 200, JSON.stringify(made).slice(0, 300));
    const id = made.id;
    assert.equal((await call("POST", `/projects/${id}/approve/characters`)).status, 400, "nothing to approve yet");
    const v = await (await call("POST", `/projects/${id}/characters/use`, { ids: ["lumo"] })).json();
    assert.deepEqual(v.characters.map((c) => c.id), ["lumo"]);
    assert.equal((await call("POST", `/projects/${id}/characters/use`, { ids: ["clawd"] })).status, 400);
    // approved only after the Brush gate passes (a member without its sheets fails it); lumo brought its sheets
    assert.equal((await call("POST", `/projects/${id}/approve/characters`)).status, 200);
    assert.ok((await (await call("GET", `/projects/${id}/characters`)).json()).approval?.hash);
    const p = projects.getProject(id);
    writeFileSync(docPath(p.path, "CHARACTERS.json"), readFileSync(join(APP_ROOT, "test", "fixtures", "brush-mini", "CHARACTERS.json")));
    assert.equal((await call("POST", `/projects/${id}/characters/bao/save`)).status, 200);
    const list = await (await call("GET", "/characters")).json();
    assert.equal(list.characters.find((c) => c.id === "bao").group, "yours");
    assert.equal((await call("DELETE", "/characters/bao")).status, 200);
    assert.equal((await call("DELETE", "/characters/clawd")).status, 400);
    assert.equal((await call("DELETE", "/characters/lumo")).status, 200);
  } finally { await s.close(); }
});

test("model sheets and a film through HyperFrames: Bao's views and emotions drawn; the film checked, rendered offline, its frames moving", { skip: skip || (!status().ready && "the offline assets are not all downloaded"), timeout: 600000 }, async () => {
  const d = fixture("sheets");
  const res = await K.characterSheets(d, { finalize, snapshotAt });
  assert.deepEqual(res.problems, []);
  const bao = res.characters[0];
  assert.equal(bao.error, null);
  for (const k of ["views", "emotions"]) assert.ok(stillStd(join(d, ...bao[k].split("/"))) >= 2, k);
  const dir = join(APP_ROOT, "test-output", "brush-mini");
  rmSync(dir, { recursive: true, force: true }); rmSync(`${dir}-out`, { recursive: true, force: true });
  cpSync(join(APP_ROOT, "test", "fixtures", "brush-mini"), dir, { recursive: true });
  await finalize(dir, { googleFonts: false });
  const c = check(dir);
  assert.equal(c.json?.lint?.errorCount, 0, JSON.stringify(c.json?.lint?.findings));
  assert.equal(c.json?.runtime?.errorCount, 0, JSON.stringify(c.json?.runtime?.findings));
  const r = await render({ projectDir: dir, outputPath: `${dir}-out`, fps: { num: 6, den: 1 }, format: "png-sequence", workers: 2 });
  assert.equal(r.type, "done", JSON.stringify(r));
  const frames = readdirSync(`${dir}-out`).filter((f) => f.endsWith(".png")).sort();
  assert.equal(frames.length, 12);
  assert.ok(stillStd(join(`${dir}-out`, frames[6])) >= 2);
  assert.notDeepEqual(readFileSync(join(`${dir}-out`, frames[0])), readFileSync(join(`${dir}-out`, frames[11])));
});

test("a saved character keeps its model sheets (the Characters page shows them) and brings them to the project that uses it", async () => {
  const { execFileSync } = await import("node:child_process");
  const { ffmpegExe } = await import("../packages/library/preview-media.mjs");
  const d = fixture("sheets-save");
  mkdirSync(join(d, "characters", "sheets"), { recursive: true });
  for (const scene of ["views", "emotions"]) execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0xF3E3C3:s=1920x1080", "-frames:v", "1", join(d, "characters", "sheets", `bao-${scene}.png`)], { windowsHide: true });
  K.saveCharacter(d, "bao");
  const media = K.demoMedia("bao");
  assert.ok(media.views && media.emotions && media.poster, JSON.stringify(media));
  const e = fixture("sheets-reuse");
  rmSync(join(e, "CHARACTERS.json"));
  K.useCharacters(e, ["bao"]);
  for (const scene of ["views", "emotions"]) assert.ok(existsSync(join(e, "characters", "sheets", `bao-${scene}.png`)), scene);
  // A character saved before the full sheets were kept has only its WebPs: those come instead of "Not drawn yet"
  for (const scene of ["views", "emotions"]) rmSync(join(K.mediaRoot(), "bao", "sheets", `${scene}.png`));
  const g = fixture("sheets-reuse-old");
  rmSync(join(g, "CHARACTERS.json"));
  K.useCharacters(g, ["bao"]);
  for (const scene of ["views", "emotions"]) assert.ok(existsSync(join(g, "characters", "sheets", `bao-${scene}.webp`)), `${scene} (webp)`);
  K.deleteUserCharacter("bao");
  assert.equal(K.demoMedia("bao").views, null, "its media go with it");
});

test("the self-check's stills of a Brush cartoon film follow each shot's time (HF waits for the p5.brush page to be ready)", { skip: skip || (!status().ready && "the offline assets are not all downloaded"), timeout: 300000 }, async () => {
  const { qcRound } = await import("../packages/hf-qa/qc.mjs");
  const d = fixture("qc");
  await finalize(d, { googleFonts: false });
  const r = await qcRound(d, { shots: [{ number: 1, start: 0, duration: 1 }, { number: 2, start: 1, duration: 1 }], total: 2 });
  assert.deepEqual(r.failed, [], r.failed.join("; "));
  const raw = join(d, r.dir, "raw"), at = (t) => join(raw, readdirSync(raw).find((f) => f.includes(`-at-${t}s.png`)));
  assert.notDeepEqual(readFileSync(at(0.6)), readFileSync(at(1.6)), "shot 2's still is not shot 1's");
});

// The Character creator, without Claude or a render: the styles it offers (9 anidoodle hands and Brush cartoon) with
// their measured estimates, a free id from a description, a lab staged for each engine (the pinned engine or the kit's guide and rules,
// the tools Claude may run, the reference picture, the brief filled in), a run that wrote nothing failing plainly, and Delete keeping
// anidoodle's own characters.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-maker-"));
process.env.MW_CHARACTERS_ROOT = T;
after(() => rmSync(T, { recursive: true, force: true }));
const maker = await import("../packages/character-maker/index.mjs");
const kit = await import("../packages/character-kit/index.mjs");
const kitHumans = await import("../packages/character-kit/humans.mjs");
const { anidoodleSource } = await import("../packages/anidoodle-styles/index.mjs");
const skip = !anidoodleSource() ? "anidoodle is not pinned" : false;
const BAO = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "brush-mini", "CHARACTERS.json"), "utf8")).characters[0];

test("the styles: the 9 hands of anidoodle's human engine and Brush cartoon, each with its measured estimate", () => {
  const s = maker.styles();
  assert.deepEqual(s.filter((x) => x.engine === "anidoodle-human").map((x) => x.hand), ["storybook", "marker", "pencil", "sumi", "woodcut", "scratch", "riso", "pixel", "brick"]);
  assert.equal(s.filter((x) => x.engine === "brush-kit").length, 1);
  assert.deepEqual(s.find((x) => x.hand === "marker").estimate.usd, [7, 11]);
  assert.ok(s.every((x) => x.thumb), "every style has its tile");
  assert.match(maker.newId("A firefighter wearing a round white astronaut helmet"), /^firefighter-round-white$/);
  assert.equal(maker.newId("Bà cụ tóc búi"), "ba-cu-toc");
  assert.notEqual(maker.newId("Clawd"), "clawd");          // the kit's demo's id is taken
});

test("an anidoodle lab: the engine staged as shipped, the author's gate as a reference, the tools, the picture, the brief for the hand", { skip }, () => {
  const png = "data:image/png;base64," + Buffer.from("not really a png").toString("base64");
  const { lab, brief, allowed } = maker.prepareLab({ jobId: "t1", engine: "anidoodle-human", hand: "pencil", id: "nurse", name: "Nurse", description: "a nurse with a red cap", image: png }, undefined);
  assert.ok(existsSync(join(lab, ".moworks", "library", "anidoodle", "PINNED")));
  assert.ok(existsSync(join(lab, "reference", "character-check.entry.ts")));
  for (const t of ["mw.mjs", "still.mjs", "render.mjs", "gate.mjs", "app-root.txt"]) assert.ok(existsSync(join(lab, "tools", t)), t);
  assert.ok(existsSync(join(lab, "reference", "picture.png")));
  assert.match(brief, /a nurse with a red cap/); assert.match(brief, /`pencil`/); assert.match(brief, /character\/render\/pencil\.ts/); assert.match(brief, /reference\/picture\.png/);
  assert.doesNotMatch(brief, /\{\{/);
  assert.deepEqual(allowed, ["Bash(node tools/still.mjs:*)", "Bash(node tools/gate.mjs:*)", "Bash(node tools/render.mjs:*)"]);
});

test("a Brush lab: the kit's guide, ClaudeAnimationBase's rules and the app's, the sheet tool; a run that wrote nothing fails plainly", async () => {
  const { lab, brief, allowed } = maker.prepareLab({ jobId: "t2", engine: "brush-kit", hand: "brush", id: "biscuit", description: "a round biscuit mascot" });
  assert.ok(existsSync(join(lab, ".moworks", "library", "character-kit", "examples", "definition.json")));
  assert.ok(readFileSync(join(lab, ".moworks", "rules", "brush-cartoon", "SKILL.md"), "utf8").length > 100);
  assert.ok(existsSync(join(lab, ".moworks", "rules", "brush-cartoon-app", "SKILL.md")));
  assert.deepEqual(allowed, ["Bash(node tools/brush-sheets.mjs:*)"]);
  assert.match(brief, /a round biscuit mascot/);
  const claude = async () => ({ ok: true, result: "done", turns: 3, costUsd: 0.1, usage: {}, ms: 1000 });
  await assert.rejects(maker.makeCharacter({ engine: "brush-kit", description: "a round biscuit mascot" }, { jobId: "t3", claude }), (e) => /CHARACTERS\.json|did not write/.test(e.message));
  await assert.rejects(maker.makeCharacter({ engine: "anidoodle-human", hand: "nope", description: "x" }, { jobId: "t4", claude }), { code: "INVALID" });
  await assert.rejects(maker.makeCharacter({ engine: "brush-kit", from: "clawd", text: "bigger" }, { jobId: "t5", claude }), { code: "INVALID" });          // the kit's demo: never changed
});

test("Delete: the user's anidoodle character goes (with the version before), anidoodle's own stay", () => {
  for (const [id, made] of [["mira", "as shipped"], ["grandma", "written from the idea"]]) {
    mkdirSync(join(kit.humanDir(), id), { recursive: true });
    writeFileSync(join(kit.humanDir(), id, "character.json"), JSON.stringify({ id, name: id, credit: { made } }));
  }
  mkdirSync(join(kit.humanDir(), ".previous-grandma"), { recursive: true });
  assert.throws(() => maker.deleteHuman("mira"), { code: "INVALID" });
  assert.deepEqual(maker.deleteHuman("grandma"), { deleted: "grandma" });
  assert.equal(existsSync(join(kit.humanDir(), "grandma")), false); assert.equal(existsSync(join(kit.humanDir(), ".previous-grandma")), false);
  assert.deepEqual(kit.humanCharacters().map((c) => c.id), ["mira"]);
});

test("labs left behind are swept after a day", () => {
  const old = join(maker.labRoot(), "old"), fresh = join(maker.labRoot(), "fresh");
  mkdirSync(old, { recursive: true }); mkdirSync(fresh, { recursive: true });
  utimesSync(old, new Date(Date.now() - 2 * 86400000), new Date(Date.now() - 2 * 86400000));
  assert.deepEqual(maker.sweepLabs(), ["old"]);
  assert.ok(existsSync(fresh));
});

test("Change with Claude: nothing changed is said and nothing saved; a change keeps the version before (Undo), says what changed and what could not, and the history keeps each run", async () => {
  const { execFileSync } = await import("node:child_process");
  const { ffmpegExe } = await import("../packages/library/preview-media.mjs");
  const pip = BAO;          // a whole definition (the test film's Bao)
  const def = { ...pip, id: "lumen", name: "Lumen", description: "a paper lantern", credit: { made: "written from the idea", run: { minutes: 2 } }, version: 1 };
  mkdirSync(kit.userDir(), { recursive: true }); writeFileSync(join(kit.userDir(), "lumen.json"), JSON.stringify(def));
  const write = (lab, d) => {
    writeFileSync(join(lab, "CHARACTERS.json"), JSON.stringify({ characters: [d] }));
    mkdirSync(join(lab, "characters", "sheets"), { recursive: true });
    for (const s of ["views", "emotions"]) execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=320x180", "-frames:v", "1", join(lab, "characters", "sheets", `lumen-${s}.png`)], { windowsHide: true });
  };
  const same = async ({ lab }) => { const { credit, version, description, ...d } = def; write(lab, d); return { ok: true, result: "Could not: a red tassel tail, the character layer has no tail", turns: 4, costUsd: 0.1, usage: {}, ms: 60000 }; };
  const r1 = await maker.makeCharacter({ engine: "brush-kit", from: "lumen", text: "a bigger red tassel tail" }, { jobId: "c1", claude: same });
  assert.equal(r1.outcome, "unchanged"); assert.deepEqual(r1.changes, []); assert.match(r1.says.couldNot, /no tail/);
  assert.equal(kit.getCharacter("lumen").version, 1); assert.equal(kit.characterVersions("lumen").length, 0);
  const other = async ({ lab }) => { const { credit, version, description, ...d } = def; write(lab, { ...d, colors: { ...d.colors, col: "#F0D49A" } }); return { ok: true, result: "Changed: a darker yellow body\nCould not: the tassel", turns: 6, costUsd: 0.2, usage: {}, ms: 90000 }; };
  const r2 = await maker.makeCharacter({ engine: "brush-kit", from: "lumen", text: "a darker yellow band, a bigger tassel" }, { jobId: "c2", claude: other });
  assert.equal(r2.outcome, "partly"); assert.deepEqual(r2.changes, ["colors.col"]); assert.equal(r2.says.changed, "a darker yellow body");
  const now = kit.getCharacter("lumen");
  assert.deepEqual([now.colors.col, now.version, now.description, now.credit.run.minutes], ["#F0D49A", 2, "a paper lantern", 2]);          // its making stays credited
  assert.equal(kit.characterVersions("lumen").length, 1);
  maker.undo("lumen");
  assert.deepEqual([kit.getCharacter("lumen").colors.col, kit.getCharacter("lumen").version], [pip.colors.col, 1]);
  assert.deepEqual(kit.characterHistory("lumen").map((h) => [h.kind, h.outcome ?? null]), [["change", "unchanged"], ["change", "partly"], ["undo", null]]);
  assert.throws(() => maker.undo("lumen"), { code: "NOT_FOUND" });
  kit.deleteUserCharacter("lumen");
  assert.deepEqual(kit.characterHistory("lumen"), []);
});

test("the change report is read in either language (the prompt asks for English labels, the reply may be the user's)", async () => {
  const { saysOf } = await import("../packages/character-maker/index.mjs");
  assert.deepEqual(saysOf("Đã đổi: thân vàng đậm hơn\nKhông làm được: tua đỏ, lớp nhân vật không có đuôi"), { changed: "thân vàng đậm hơn", couldNot: "tua đỏ, lớp nhân vật không có đuôi" });
  assert.deepEqual(saysOf("Changed: a darker yellow body\nCould not: the tassel"), { changed: "a darker yellow body", couldNot: "the tassel" });
});

test("the saved name everywhere: the user's name wins over Claude's, and the about opens with it", async () => {
  assert.equal(maker.alignAbout("Kimchi, a small round paper-lantern spirit", "Lantern"), "Lantern, a small round paper-lantern spirit");
  assert.equal(maker.alignAbout("Kimchi is shy", "Lantern"), "Lantern is shy");
  assert.equal(maker.alignAbout("a small lantern spirit", "Lantern"), "a small lantern spirit");
  const { execFileSync } = await import("node:child_process");
  const { ffmpegExe } = await import("../packages/library/preview-media.mjs");
  const pip = BAO;          // a whole definition (the test film's Bao)
  const claude = async ({ lab }) => {
    const id = "lantern";          // newId("Lantern")
    writeFileSync(join(lab, "CHARACTERS.json"), JSON.stringify({ characters: [{ ...pip, id, name: "Kimchi", about: "Kimchi, a small round paper-lantern spirit" }] }));
    mkdirSync(join(lab, "characters", "sheets"), { recursive: true });
    for (const s of ["views", "emotions"]) execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=320x180", "-frames:v", "1", join(lab, "characters", "sheets", `${id}-${s}.png`)], { windowsHide: true });
    return { ok: true, result: "done", turns: 3, costUsd: 0.1, usage: {}, ms: 1000 };
  };
  const r = await maker.makeCharacter({ engine: "brush-kit", name: "Lantern", description: "a small round paper-lantern spirit" }, { jobId: "n1", claude });
  const c = kit.getCharacter(r.id);
  assert.deepEqual([c.name, c.about], ["Lantern", "Lantern, a small round paper-lantern spirit"]);
  kit.deleteUserCharacter(r.id);
});

// What the character is comes before its hand. A person is on anidoodle's human engine with the author's human gate;
// an animal or a thing gets a rig and a gate of its own (as a turtle, never the human limits); Brush cartoon draws mascots.
test("the kind of character: Human, Animal, Thing per engine; each kind its own recipe and gate; the kind kept in the library and the film", { skip }, () => {
  const s = maker.styles();
  assert.deepEqual(s.find((x) => x.hand === "pencil").rigs.map((r) => r.id), ["human", "animal", "thing", "robot"]);
  assert.deepEqual(s.find((x) => x.engine === "brush-kit").rigs.map((r) => [r.id, r.label]), [["thing", "Thing"], ["animal", "Animal"], ["robot", "Robot"]], "no person on the mascot layer");
  // a robot is built as a thing is: a rig and a gate of its own
  assert.equal(maker.kindOf({ id: "bolt", kind: "robot" }), "rig");
  assert.match(maker.prepareLab({ jobId: "r-robot", engine: "anidoodle-human", hand: "pencil", rig: "robot", id: "bolt", description: "a robot" }).brief, /a rig of its own[\s\S]*"heightM": <its real height in metres/);
  assert.match(maker.prepareLab({ jobId: "r-brush-h", engine: "brush-kit", hand: "brush", rig: "thing", id: "cup", description: "a cup" }).brief, /`heightM`: its real height in metres/);
  assert.equal(maker.rigOf("anidoodle-human", undefined, null), "human");
  assert.equal(maker.rigOf("brush-kit", "", null), "thing");
  assert.throws(() => maker.rigOf("brush-kit", "human", null), { code: "INVALID" });
  assert.equal(maker.rigOf("anidoodle-human", "thing", "animal"), "animal", "a change keeps the saved kind");
  const lab = (rig, engine = "anidoodle-human", hand = "pencil") => maker.prepareLab({ jobId: `r-${rig}-${engine}`, engine, hand, rig, id: "tortoise", description: "a tortoise" });
  const person = lab("human").brief, animal = lab("animal").brief;
  assert.match(person, /Mira/); assert.match(person, /joint limits/);
  assert.match(animal, /an animal, on a rig of its own/); assert.match(animal, /never the human engine's canon/); assert.match(animal, /cheetahRig\.ts/);
  assert.match(animal, /the character's OWN gate/); assert.match(animal, /NEGATIVE TWINS/); assert.doesNotMatch(animal, /\{\{|do not copy Mira/);
  assert.match(lab("thing", "brush-kit", "brush").brief, /What it is: a thing/);
  // the user's animal in a film: its own module and gate, its kind kept, so the film's gate reads it as a rig, never as a person
  const d = join(kit.humanDir(), "tortoise");
  mkdirSync(join(d, "module", "tortoise"), { recursive: true });
  writeFileSync(join(d, "module", "tortoise", "index.ts"), "export const tortoise = {};\n"); writeFileSync(join(d, "module", "check.ts"), "export function run() { return []; }\n");
  writeFileSync(join(d, "character.json"), JSON.stringify({ id: "tortoise", name: "Tortoise", kind: "animal", hand: "pencil", hands: ["pencil"], credit: { made: "written from the idea" } }));
  const film = join(T, "film-tortoise"); mkdirSync(film, { recursive: true });
  const { useHumans } = kitHumans;
  useHumans(film, ["tortoise"]);
  const member = JSON.parse(readFileSync(join(film, "CHARACTERS.json"), "utf8")).characters.find((c) => c.id === "tortoise");
  assert.deepEqual([member.kind, member.check, maker.kindOf(member)], ["animal", "check-tortoise.ts", "rig"]);
  assert.ok(existsSync(join(film, "anidoodle", "check-tortoise.ts")));
  // in a style of its own hand it needs only its gate; in another hand it needs work (its palette for that hand)
  assert.equal(member.ownStyle, true);
  const pencil = join(T, "film-pencil"), koi = join(T, "film-koi"); mkdirSync(pencil, { recursive: true }); mkdirSync(koi, { recursive: true });
  useHumans(pencil, ["tortoise"], { styleId: "anidoodle-colouredPencil" }); useHumans(koi, ["tortoise"], { styleId: "anidoodle-koi" });
  const of = (f) => JSON.parse(readFileSync(join(f, "CHARACTERS.json"), "utf8")).characters[0];
  assert.deepEqual([of(pencil).ownStyle, kit.characterNeedsWork(of(pencil)), of(koi).ownStyle, of(koi).needsPalette, kit.characterNeedsWork(of(koi))], [true, "gate", false, true, "sheet"]);
});

test("a new Brush character is saved only when the Brush gate passes; its failure says why", async () => {
  const { execFileSync } = await import("node:child_process");
  const { ffmpegExe } = await import("../packages/library/preview-media.mjs");
  const claude = async ({ lab }) => {
    writeFileSync(join(lab, "CHARACTERS.json"), JSON.stringify({ characters: [{ ...BAO, id: "floaty", name: "Floaty", legs: { ...BAO.legs, h: 0.3 } }] }));
    mkdirSync(join(lab, "characters", "sheets"), { recursive: true });
    for (const s of ["views", "emotions"]) execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=320x180", "-frames:v", "1", join(lab, "characters", "sheets", `floaty-${s}.png`)], { windowsHide: true });
    return { ok: true, result: "done", turns: 3, costUsd: 0.1, usage: {}, ms: 1000 };
  };
  await assert.rejects(maker.makeCharacter({ engine: "brush-kit", name: "Floaty", description: "a floating bun" }, { jobId: "g1", claude }),
    (e) => e.code === "GATE_FAILED" && /legs stand under the body and reach the ground: .*float/.test(e.message));
  assert.equal(kit.getCharacter("floaty"), null, "not saved");
});

test("the lab tools Claude runs in a lab parse (copied into the lab, never imported by a test: brush-sheets.mjs once did not)", () => {
  const dir = join(import.meta.dirname, "..", "packages", "character-maker", "lab-tools");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".mjs"))) {
    const r = spawnSync(process.execPath, ["--check", join(dir, f)], { encoding: "utf8", windowsHide: true });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

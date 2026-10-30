// anidoodle media: the 32 media of the pinned clone in the style catalog (the fifth author, credit, a card
// cut from the author's style sheet), their rules and the staged engine in a project, their sample briefs, and a TypeScript film bundled
// with the pinned engine and driven through finalize's bridge (window.FILM), HyperFrames' check and an offline render.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getStyle, listStyles, stylePipeline } from "../packages/style-catalog/index.mjs";
import { anidoodleSource, mediaFile, ruleText, stageEngine } from "../packages/anidoodle-styles/index.mjs";
import { gateContract } from "../packages/anidoodle-styles/contract.mjs";
import { previewPlan } from "../packages/anidoodle-styles/previews.mjs";
import { poseCheck, poseText, spans } from "../packages/anidoodle-styles/posecheck.mjs";
import { anidoodleKind } from "../packages/agent/reads.mjs";
import { cleanAnswers } from "../packages/project-service/index.mjs";
import { AUTHOR_RIGS, humanCharacters, seedAuthorCharacters } from "../packages/character-kit/index.mjs";
import { useHumans } from "../packages/character-kit/humans.mjs";
import { writeFileSync } from "node:fs";
import { buildAnidoodle } from "../packages/hf-edit/anidoodleBuild.mjs";
import { guessSource, isLemoPage } from "../packages/hf-edit/lemoPage.mjs";
import { docPath } from "../packages/project-service/docs.mjs";
import { prepareRules } from "../packages/agent/index.mjs";
import { requiredReads } from "../packages/agent/reads.mjs";
import { finalize } from "../packages/hf-edit/finalize.mjs";
import { gateRemote, stillStd } from "../packages/hf-qa/gates.mjs";
import { check } from "../packages/hf-qa/cli.mjs";
import { render } from "../packages/hf-render-worker/client.mjs";
import { status } from "../packages/offline-assets/index.mjs";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-ani-"));
after(() => rmSync(T, { recursive: true, force: true }));
const src = anidoodleSource();
const skip = !src?.intact && "the anidoodle clone is not at the pinned commit (config/pins.json anidoodle)";
const SHA = "f746cbd8a7032463bd0bc88ee8ff852599193b8c";

const HOUSE = ["adaptAlmond", "adaptAquarelle", "adaptScrapbook"];
test("the catalog: 32 anidoodle media and the author's 3 house styles by Alex Greenshpun, the fifth author, each credited at the pinned commit, its card cut from the author's style sheet (a house style: its preview's last frame)", { skip }, () => {
  const c = listStyles();
  const ani = c.styles.filter((s) => s.author === "alexgreensh");
  assert.equal(ani.length, 35);
  const a = c.authors.find((x) => x.id === "alexgreensh");
  assert.deepEqual([a.count, a.kind], [35, "video-style"]);
  assert.match(a.licence, /^Apache-2\.0/);
  for (const s of ani) {
    assert.ok(s.available && !s.hidden, s.id);
    assert.ok(c.categories.includes(s.category) && !/anidoodle/.test(s.category), `${s.id}: a category of the catalog's own`);
    assert.ok(s.credit.link.includes(`/alexgreensh/anidoodle/`) && s.credit.link.includes(SHA), s.id);
    const house = HOUSE.includes(s.anidoodle.id);
    assert.equal(!!s.anidoodle.house, house, s.id);
    if (!house || s.preview.image) { const f = mediaFile(s.preview.image.replace("/media/anidoodle/", "")); assert.ok(f && existsSync(f), `${s.id} card`); }
    else assert.equal(s.preview.placeholder, true, `${s.id}: no card before its preview is rendered`);
    if (s.preview.video) assert.match(s.preview.video, new RegExp(`^/media/anidoodle/previews/${s.anidoodle.id}\\.mp4$`));
    // one pipeline for every medium; its Character step shows only where the hand draws people (when: humanHand)
    assert.deepEqual(stylePipeline(s.id).map((x) => x.id + (x.when ? `[${x.when}]` : "")), ["brief", "character[cast]", "storyboard", "motionSpec", "build", "qcReview", "sound", "checks", "finalMix"]);
    assert.equal(s.characters, !!s.humanHand, s.id);
  }
  assert.equal(getStyle("anidoodle-woodcut").title, "Ukiyo-e colour woodblock");
  assert.equal(mediaFile("../README.md"), null);
  assert.equal(mediaFile("previews/../x.mp4"), null);
  const almond = getStyle("anidoodle-adaptAlmond");
  assert.equal(almond.title, "Almond-blossom hand");
  assert.ok(almond.credit.link.endsWith(`/blob/${SHA}/skills/anidoodle/styles/house/almond-blossom.json`));
});

test("a house style's rule: its recipe as shipped, its plate and its nearest medium", { skip }, () => {
  const t = ruleText("adaptAquarelle");
  assert.match(t, /^---\nname: anidoodle-adaptAquarelle\n/);
  assert.ok(t.includes(readFileSync(join(src.skillDir, "styles", "house", "pastel-blotch.json"), "utf8").trim()), "the recipe as shipped");
  assert.match(t, /anidoodle\/canvas-core\/adaptAquarelle\.ts/);
  assert.match(t, /references\/styles\/ranunculusDraw\.md|Pencil & watercolour/);
});

test("the previews: every medium and house style is made from the author's own drawing film (its host page), with its size, rate and length", { skip }, async () => {
  const plan = await previewPlan();
  assert.equal(plan.length, 35);
  for (const m of plan) assert.ok(existsSync(join(src.skillDir, "engine", "src", "hosts", `${m.page}.ts`)) && m.meta.W > 0 && m.meta.fps > 0, m.id);
  assert.equal(plan.find((m) => m.id === "storybook").page, "page-storybookDraw");
  assert.equal(plan.find((m) => m.id === "adaptAquarelle").meta.durationFrames, 1, "a still plate");
});

test("a project in an anidoodle medium: the reference as its rule file, the app's pack, the engine staged from the first step; a sample brief per medium", { skip }, async () => {
  const d = join(T, "project");
  mkdirSync(d, { recursive: true });
  const r = prepareRules(d, "anidoodle-sumiE");
  assert.deepEqual(r.first, [".moworks/rules/anidoodle-sumiE/SKILL.md", ".moworks/rules/anidoodle/SKILL.md"]);
  const own = readFileSync(join(d, ".moworks", "rules", "anidoodle-sumiE", "SKILL.md"), "utf8");
  assert.match(own, /^---\nname: anidoodle-sumiE\ndescription: /);
  assert.ok(own.endsWith(readFileSync(join(src.skillDir, "references", "styles", "sumiE.md"), "utf8")), "the reference as shipped");
  assert.match(readFileSync((prepareRules(join(T, "p2"), "anidoodle-mellan"), join(T, "p2", ".moworks", "rules", "anidoodle-mellan", "SKILL.md")), "utf8"), /canvas-core\/mellan\.ts/, "a medium without a reference: its registry line and code");
  const st = stageEngine(d);
  assert.ok(st.files.includes(".moworks/library/anidoodle/SKILL.md"));
  assert.equal(stageEngine(d).files.length, 0, "staged once per pin");
  for (const f of ["engine/src/hosts/page.ts", "engine/src/canvas-core/film.ts", "references/determinism-and-contract.md", "LICENSE", "PINNED",
    "example/butterfly-film-spec.md", "styles/house/almond-blossom.json", "engine/facts/launchExample.json"])
    assert.ok(existsSync(join(d, ".moworks", "library", "anidoodle", ...f.split("/"))), f);
  assert.ok(!existsSync(join(d, ".moworks", "library", "anidoodle", "engine", "tools")), "never the author's tools");
  // a project staged before the shared stage (its own copy of the engine, without the example) gets the link: the whole engine, nothing
  // new to read; a file deleted through a link is the stage's own, and the stage is made whole again on its next use
  const lib = join(d, ".moworks", "library", "anidoodle"), shared = realpathSync(lib);
  rmSync(lib, { recursive: true, force: true });
  cpSync(shared, lib, { recursive: true, filter: (s) => !/[\\/]example([\\/]|$)/.test(s) });
  assert.deepEqual(stageEngine(d).files, []);
  assert.ok(lstatSync(lib).isSymbolicLink() && existsSync(join(lib, "example", "butterfly-film-spec.md")));
  rmSync(join(lib, "example"), { recursive: true, force: true });
  stageEngine(d);
  assert.ok(existsSync(join(shared, "example", "butterfly-film-spec.md")), "the stage made whole again");
  assert.ok(existsSync(join(d, ".moworks", "library", "anidoodle", "engine", "src", "canvas-core", "film.ts")), "nothing else removed");
  const reads = (step) => requiredReads(d, { styleId: "anidoodle-sumiE", first: r.first, step });
  assert.ok(reads("storyboard").includes(".moworks/library/anidoodle/SKILL.md"), "the seven laws from the storyboard");
  assert.ok(reads("build").includes(".moworks/library/anidoodle/references/determinism-and-contract.md"));
  assert.ok(reads("qcReview").includes(".moworks/library/anidoodle/references/workflows/review.md"));
  // the author's story, realism, method and craft-bar guides
  assert.ok(reads("storyboard").includes(".moworks/library/anidoodle/references/storytelling.md") && reads("storyboard").includes(".moworks/library/anidoodle/references/working-method.md"));
  assert.ok(reads("build").includes(".moworks/library/anidoodle/references/realism-and-craft.md"));
  assert.ok(reads("qcReview").includes(".moworks/library/anidoodle/references/craft-bar.md"));
  // The Review reads the pack (§3e4: a gait travels, every character reads at the film's size and is named in every still)
  assert.ok(reads("qcReview").includes(".moworks/rules/anidoodle/SKILL.md"));
  assert.match(readFileSync(join(APP_ROOT, "config", "rules", "anidoodle", "SKILL.md"), "utf8"), /## 3e4\. A gait travels, and every character reads at the film's size/);
  assert.ok(!reads("build").includes(".moworks/library/anidoodle/references/workflows/launch-video-kit.md"), "a story film reads no launch kit");
  // the film's kind: a New project answer, its guides at each step
  mkdirSync(join(d, ".moworks"), { recursive: true });
  writeFileSync(join(d, ".moworks", "project.json"), JSON.stringify({ style: { id: "anidoodle-sumiE" }, brief: { answers: { filmKind: "launch" } } }));
  assert.equal(anidoodleKind(d).metaKind, "launch");
  assert.ok(reads("build").includes(".moworks/library/anidoodle/references/workflows/launch-video-kit.md"));
  assert.ok(reads("brief").includes(".moworks/library/anidoodle/references/workflows/facts.md"));
  writeFileSync(join(d, ".moworks", "project.json"), JSON.stringify({ style: { id: "anidoodle-sumiE" }, brief: { answers: { filmKind: "drawing" } } }));
  assert.ok(reads("storyboard").includes(".moworks/library/anidoodle/references/workflows/drawing-process.md"));
  rmSync(join(d, ".moworks", "project.json"));
  assert.deepEqual(cleanAnswers({ filmKind: "drawing", angle: "x" }, "anidoodle-woodcut"), { filmKind: "drawing" });
  assert.deepEqual(cleanAnswers({ filmKind: "drawing" }, "lemo-01-x"), {});
  // the studio's always-alive rule: staged with the style's rules, read in the Motion Plan, the Build and the Review
  for (const s of ["motionSpec", "build", "qcReview"]) assert.ok(reads(s).includes(".moworks/rules/moworks-alive/SKILL.md"), s);
  assert.ok(!reads("storyboard").includes(".moworks/rules/moworks-alive/SKILL.md"));
  // the house rules: first in every step, before the style's own
  for (const s of ["brief", "character", "storyboard", "motionSpec", "build", "qcReview", "sound", null]) assert.equal(reads(s)[0], ".moworks/rules/moworks-studio/SKILL.md", String(s));
  const { BRIEF_SAMPLES } = await import("../ui/src/workflow/briefSample.js");
  const ids = listStyles().styles.filter((s) => s.author === "alexgreensh").map((s) => s.id).sort();
  assert.deepEqual(Object.keys(BRIEF_SAMPLES).filter((k) => k.startsWith("anidoodle-")).sort(), ids);
  for (const id of ids) {
    const b = BRIEF_SAMPLES[id];
    assert.match(b.en, /^Topic: /); assert.match(b.vi, /^Chủ đề: /);
    assert.match(b.credit.link, new RegExp(`/blob/${SHA}/skills/anidoodle/`));
  }
});

test("G-CONTRACT: the film's own modules are held to the author's list of forbidden calls; the engine is never scanned", { skip }, async () => {
  const d = join(T, "contract");
  cpSync(join(APP_ROOT, "test", "fixtures", "anidoodle-mini"), d, { recursive: true });
  assert.equal(gateContract(join(T, "nothing")), null, "no anidoodle film: no gate");
  assert.equal(gateContract(d).pass, true);
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "page.ts"), "// Math.random in a comment is fine\n/* Date.now()\n too */\nconst x = Math.random();\nctx.filter = 'blur(2px)';\n");
  const g = gateContract(d);
  assert.equal(g.pass, false);
  assert.equal(g.blocking, true);
  assert.deepEqual(g.findings.map((f) => [f.file, f.line, f.call]), [["boards/A/page.ts", 4, "Math.random"], ["boards/A/page.ts", 5, "ctx.filter"], ["boards/A/page.ts", 5, "assignment to .filter"]]);
  assert.match(g.findings[0].message, /rng\(seed\)/);
  const { renderVerdict } = await import("../packages/server/production.mjs");
  assert.deepEqual(renderVerdict({ gates: [g] }).blocking.map((x) => x.id), ["G-CONTRACT"], "it stops the render");
});

test("Bit and the cheetah: the author's rigged characters, as shipped, in the Characters library and taken into a film through their own rig", { skip }, () => {
  const lib = join(T, "characters"), was = process.env.MW_CHARACTERS_ROOT;
  process.env.MW_CHARACTERS_ROOT = lib;
  try {
    assert.deepEqual(seedAuthorCharacters(), AUTHOR_RIGS.map((a) => a.id));
    assert.deepEqual(seedAuthorCharacters(), [], "seeded once");
    const hs = humanCharacters();
    for (const a of AUTHOR_RIGS) {
      const c = hs.find((x) => x.id === a.id);
      assert.equal(c.credit.made, "as shipped");
      assert.ok(c.credit.link.includes(SHA) && c.selectable && c.rig === a.rig, a.id);
      for (const m of a.module) assert.ok(existsSync(join(src.skillDir, ...m.split("/"))), m);
    }
    const d = join(T, "rigfilm");
    mkdirSync(d, { recursive: true });
    assert.deepEqual(useHumans(d, ["bit"], { styleId: "anidoodle-storybook" }), ["bit"]);
    const cast = JSON.parse(readFileSync(docPath(d, "CHARACTERS.json"), "utf8")).characters;
    assert.deepEqual([cast[0].import, cast[0].rig, cast[0].check, cast[0].needsPalette], ["anidoodle/canvas-core/bitRig", "bit", null, false]);
    assert.ok(!existsSync(join(d, "anidoodle", "check-anidoodle-cast.ts")), "no human gate for a rig");
  } finally { if (was === undefined) delete process.env.MW_CHARACTERS_ROOT; else process.env.MW_CHARACTERS_ROOT = was; }
});

test("the cheetah in another medium (Sumi-e, 1:1, 24 fps): her rig posed in a film drawn with the Sumi-e brush bundles with the pinned engine and holds the contract", { skip }, async () => {
  const d = join(T, "cheetah-sumi");
  cpSync(join(APP_ROOT, "test", "fixtures", "anidoodle-cheetah-sumi"), d, { recursive: true });
  assert.deepEqual(await buildAnidoodle(d), { built: true, out: "compositions/anidoodle/film.js" });
  assert.equal(gateContract(d).pass, true);
  const rule = readFileSync(join(APP_ROOT, "config", "rules", "anidoodle", "SKILL.md"), "utf8");
  assert.match(rule, /the rig is the character, the marks are the medium's/);
});

test("the whole-film pose check: every frame drawn without a browser; a pose error thrown or logged is named with its times; the cheetah's gallop is clean", { skip, timeout: 300000 }, async () => {
  const d = join(T, "posecheck");
  cpSync(join(APP_ROOT, "test", "fixtures", "anidoodle-cheetah-sumi"), d, { recursive: true });
  stageEngine(d);
  const ok = await poseCheck(d);
  assert.deepEqual([ok.ran, ok.pass, ok.films[0].checked], [true, true, 48], JSON.stringify(ok));
  assert.match(poseText(ok), /every one of 48 frames/);
  writeFileSync(join(d, "anidoodle", "page.ts"), `import type { Film } from "anidoodle/canvas-core/film";
import { mountFilm } from "anidoodle/hosts/page";
const f: Film = { meta: { title: "bad", W: 64, H: 64, fps: 10, bpm: 120, durationFrames: 20 }, assets: { images: {} },
  shots: [{ id: "a", start: 0, end: 20, draw: (ctx, t) => { if (t === 5 || t === 6) console.error("Mira pose 'run' is outside her joint limits:\\n  hipFlexL = -24.8 outside -20..125"); if (t === 12) throw new Error("pose: outside the range of motion"); ctx.fillRect(0, 0, 64, t === 15 ? NaN : 64); } }] };
mountFilm(f);
`);
  const bad = await poseCheck(d);
  assert.equal(bad.pass, false);
  const by = Object.fromEntries(bad.films[0].findings.map((x) => [x.kind, x]));
  assert.deepEqual(by["console.error"].frames, [5, 6]);
  assert.match(by["console.error"].message, /hipFlexL = -24\.8 outside -20\.\.125/);
  assert.deepEqual(by.throws.frames, [12]);
  assert.deepEqual(by.nan.frames, [15]);
  assert.match(poseText(bad), /at 0\.5 s-0\.6 s/);
  assert.equal(spans([150, 151, 152, 172], 30), "5 s-5.07 s, 5.73 s");
  assert.equal((await poseCheck(join(T, "nothing-here"))).ran, false);
});

// Claude fixed a board's sun, hills and grass in the film's own modules (anidoodle/*.ts); the board's hash (STORYBOARD.md +
// index.html) and its bundle's freshness (its own folder) did not see it, so board_stills handed back the old stills
test("an anidoodle board: a change in the film's own modules it imports changes the board's hash and rebuilds its bundle", { skip }, async () => {
  const { currentOptions } = await import("../packages/hf-edit/boards.mjs");
  const d = join(T, "board389");
  cpSync(join(APP_ROOT, "test", "fixtures", "anidoodle-mini"), d, { recursive: true });
  writeFileSync(join(d, "anidoodle", "sky.ts"), "export const SUN = \"#c8442a\";\n");
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "STORYBOARD.md"), "# Option A\n\n## Frame 1 - Dawn\n\n- duration: 1s\n");
  writeFileSync(join(d, "boards", "A", "index.html"), readFileSync(join(d, "index.html"), "utf8").replace("compositions/anidoodle/film.js", "film.js"));
  writeFileSync(join(d, "boards", "A", "page.ts"), readFileSync(join(d, "anidoodle", "page.ts"), "utf8").replace('ctx.fillStyle = "#c8442a"', "ctx.fillStyle = SUN").replace('import { mountFilm } from "anidoodle/hosts/page";', 'import { mountFilm } from "anidoodle/hosts/page";\nimport { SUN } from "../../anidoodle/sky";'));
  const opt = { entry: "boards/A/page.ts", out: "boards/A/film.js" };
  assert.equal((await buildAnidoodle(d, opt)).built, true);
  assert.match(readFileSync(join(d, "boards", "A", "film.js"), "utf8"), /c8442a/);
  const h1 = currentOptions(d).find((o) => o.option === "A").hash;
  assert.equal((await buildAnidoodle(d, opt)).built, false, "up to date");
  await new Promise((r) => setTimeout(r, 30));
  writeFileSync(join(d, "anidoodle", "sky.ts"), "export const SUN = \"#f2a03d\";\n");          // the fix lands in the film's own module
  assert.notEqual(currentOptions(d).find((o) => o.option === "A").hash, h1, "the board's hash sees the module");
  assert.equal((await buildAnidoodle(d, opt)).built, true, "the board's bundle is made again");
  assert.match(readFileSync(join(d, "boards", "A", "film.js"), "utf8"), /f2a03d/);
  const h2 = currentOptions(d).find((o) => o.option === "A").hash;
  assert.equal(currentOptions(d).find((o) => o.option === "A").hash, h2, "the app's own bundle (film.js) is not part of the hash");
});

test("R-ANIDOODLE: the film bundled with the pinned engine into one page script that sets window.FILM, rebuilt only when a source changes", { skip }, async () => {
  const d = join(T, "film");
  cpSync(join(APP_ROOT, "test", "fixtures", "anidoodle-mini"), d, { recursive: true });
  const a = await buildAnidoodle(d);
  assert.deepEqual(a, { built: true, out: "compositions/anidoodle/film.js" });
  const js = readFileSync(join(d, "compositions", "anidoodle", "film.js"), "utf8");
  assert.match(js, /^\/\* anidoodle engine by Alex Greenshpun/);
  assert.ok(js.includes(SHA), "the banner names the pinned commit");
  assert.ok(isLemoPage([js]) && guessSource([js]) === "anidoodle");
  assert.deepEqual(await buildAnidoodle(d), { built: false, out: "compositions/anidoodle/film.js" }, "up to date");
  assert.equal(await buildAnidoodle(join(T, "none")), null, "no film, nothing to do");
  const bad = join(T, "bad");
  cpSync(d, bad, { recursive: true });
  cpSync(join(APP_ROOT, "test", "fixtures", "anidoodle-mini", "index.html"), join(bad, "anidoodle", "page.ts"));
  assert.ok((await buildAnidoodle(bad, { force: true })).error, "a broken film reports its error");
  // A source that does not compile blocks the render (G-BUILD) instead of leaving the older film.js to render; fixed, it passes
  const { gateBuild } = await import("../packages/hf-qa/gates.mjs");
  const late = join(T, "late");
  cpSync(d, late, { recursive: true });
  const page = join(late, "anidoodle", "page.ts"), good = readFileSync(page, "utf8");
  writeFileSync(page, good + "\nexport const broken = ;\n");
  const g = await gateBuild(late);
  assert.deepEqual([g.id, g.blocking, g.pass], ["G-BUILD", true, false]);
  assert.match(g.findings[0].message, /^The film's code does not compile: .*page\.ts/);
  writeFileSync(page, good + "\n// fixed\n");
  assert.equal((await gateBuild(late)).pass, true, "fixed: bundled again");
  assert.equal(await gateBuild(join(T, "none")), null, "not a bundled film");
});

test("an anidoodle film end to end: finalize (bundle, bridge), HyperFrames check, G-REMOTE, an offline render whose frames move", { skip: skip || (!status().ready && "the offline assets are not all downloaded (Settings > Health)"), timeout: 300000 }, async () => {
  const dir = join(APP_ROOT, "test-output", "anidoodle-mini");
  rmSync(dir, { recursive: true, force: true }); rmSync(`${dir}-out`, { recursive: true, force: true });
  cpSync(join(APP_ROOT, "test", "fixtures", "anidoodle-mini"), dir, { recursive: true });
  const rep = await finalize(dir, { googleFonts: false });
  assert.equal(rep.anidoodle?.built, true, JSON.stringify(rep.anidoodle));
  assert.equal(rep.lemo?.source, "anidoodle");
  const root = readFileSync(join(dir, "index.html"), "utf8");
  assert.equal(root.match(/data-mw="lemo"/g).length, 1);
  assert.equal(gateRemote(dir).pass, true, JSON.stringify(gateRemote(dir).findings));
  const c = check(dir);
  assert.equal(c.json?.lint?.errorCount, 0, JSON.stringify(c.json?.lint?.findings));
  assert.equal(c.json?.runtime?.errorCount, 0, JSON.stringify(c.json?.runtime?.findings));
  const r = await render({ projectDir: dir, outputPath: `${dir}-out`, fps: { num: 10, den: 1 }, format: "png-sequence", workers: 2 });
  assert.equal(r.type, "done", JSON.stringify(r));
  const frames = readdirSync(`${dir}-out`).filter((f) => f.endsWith(".png")).sort();
  assert.equal(frames.length, 10);
  assert.ok(stillStd(join(`${dir}-out`, frames[5])) >= 2, "the film draws");
  assert.notDeepEqual(readFileSync(join(`${dir}-out`, frames[0])), readFileSync(join(`${dir}-out`, frames[9])), "FILM.seek follows HyperFrames' time");
});

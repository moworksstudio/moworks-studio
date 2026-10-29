// Lemo-Opuscar styles: the 66 styles of the pinned clone in the style catalog (author, credit, the gallery's
// pictures and demo link, which are cut from real material, which demo voices are excluded), their rules in a project per step, OPUSCAR
// 98's sample prompts, and a render(t) page through finalize's bridge (R-LEMO), HyperFrames' check and an offline render.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getStyle, listStyles, stylePipeline } from "../packages/style-catalog/index.mjs";
import { lemoSource, mediaFile, samplePrompts, stageDemo } from "../packages/lemo-styles/index.mjs";
import { rewriteLemoText, withBridge } from "../packages/hf-edit/lemoPage.mjs";
import { prepareRules } from "../packages/agent/index.mjs";
import { requiredReads } from "../packages/agent/reads.mjs";
import { finalize } from "../packages/hf-edit/finalize.mjs";
import { takeStills } from "../packages/hf-edit/boards.mjs";
import { gateRemote, stillStd } from "../packages/hf-qa/gates.mjs";
import { check } from "../packages/hf-qa/cli.mjs";
import { render } from "../packages/hf-render-worker/client.mjs";
import { status } from "../packages/offline-assets/index.mjs";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-lemo-"));
after(() => rmSync(T, { recursive: true, force: true }));
const src = lemoSource();
const skip = (!src?.intact && "the Lemo-Opuscar clone is not at the pinned commit (config/pins.json lemo)") || (!status().three && "three.js not downloaded (Settings > Health)");
const SOURCE_MEDIA = ["archive-lighttable", "briefing-board", "caption-news", "city-symphony", "countdown", "data-physical", "kino-montage", "lidar-survey",
  "microscope", "news-package", "newsreel", "satellite-briefing", "teardown", "telestrator", "visual-investigation", "white-model"];

test("the catalog: 66 Lemo-Opuscar styles by Lemomo (LemoLab) beside HyperFrames' and Moworks', each credited at the pinned commit, its pictures from the clone, its demo film a link", { skip }, () => {
  const c = listStyles();
  const lemo = c.styles.filter((s) => s.author === "lemomo");
  assert.equal(lemo.length, 66);
  assert.deepEqual(c.authors.slice(0, 3).map((a) => [a.id, a.count, a.kind]), [["moworks", 1, "workflow"], ["heygen", 8, "workflow"], ["lemomo", 66, "video-style"]]);
  assert.equal(c.authors[2].repo.sha, "ea34ff9546f675f9fd65a3c84e869a1da7471ad7");
  assert.equal(c.authors[2].repo.url, "https://github.com/lemomo-ai/lemo-opuscar/tree/ea34ff9546f675f9fd65a3c84e869a1da7471ad7");
  assert.ok(c.authors[1].looks.count > 0, "HyperFrames' Looks, linked from its author");
  for (const s of lemo) {
    assert.ok(s.available && !s.hidden, s.id);
    assert.equal(s.kind, "video-style");
    assert.equal(s.styleMd, `/api/styles/${s.id}/style-md`);
    assert.match(s.credit.link, /^https:\/\/github\.com\/lemomo-ai\/lemo-opuscar\/blob\/ea34ff9546f675f9fd65a3c84e869a1da7471ad7\/styles\/[a-z0-9-]+\/STYLE\.md$/);
    assert.equal(s.credit.made, "as shipped");
    assert.match(s.credit.licence, /MIT.*CC BY 4\.0/);
    assert.equal(s.demo.url, `https://github.com/lemomo-ai/lemo-opuscar/releases/download/web/${s.lemo.slug}.mp4`);
    assert.ok(s.demo.title && s.demo.dur > 0, s.id);
    assert.ok(mediaFile(s.preview.image.replace("/media/lemo/", "")), `${s.id} styleframe`);
    assert.ok(mediaFile(s.preview.poster.replace("/media/lemo/", "")), `${s.id} poster`);
    assert.ok(["canvas", "webgl", "three"].includes(s.renderer) && ["2D", "3D"].includes(s.dim), s.id);
    assert.deepEqual(stylePipeline(s.id).map((x) => x.id), ["brief", "storyboard", "motionSpec", "build", "qcReview", "sound", "checks", "finalMix"]);
  }
  assert.deepEqual(lemo.filter((s) => s.needsFootage).map((s) => s.lemo.slug).sort(), SOURCE_MEDIA, "information only: every one offered");
  assert.deepEqual(lemo.filter((s) => s.warnings.some((w) => w.kind === "voice")).map((s) => s.lemo.slug).sort(), ["game-show", "news-package", "paper-lantern"]);
  assert.ok(lemo.find((s) => s.id === "lemo-living-screencast").warnings.some((w) => w.kind === "fan-film"));
  assert.equal(lemo.filter((s) => s.dim === "3D").length, 15);
  // a style the author merged from someone else names that contributor first (style.json by)
  const md = lemo.find((s) => s.id === "lemo-memphis-diorama");
  assert.deepEqual([md.credit.author, md.credit.contributor], ["EianLu, in Lemo-Opuscar by Lemomo (LemoLab)", { name: "EianLu", url: "https://x.com/EianLu" }]);
  assert.equal(mediaFile("../poster.jpg"), null); assert.equal(mediaFile("watercolor/../../LICENSE"), null);
  assert.equal(getStyle("lemo-watercolor").rules[0].kind, "lemo-style");
  const seen = new Set();
  for (const step of stylePipeline("lemo-watercolor")) {          // the same checks as every style's pipeline (workflow.test)
    for (const n of [...(step.needs ?? []), ...(step.after ?? [])]) assert.ok(seen.has(n), `${step.id} needs ${n} before it`);
    assert.ok(["claude", "dialog", "job"].includes(step.action.kind), step.id);
    seen.add(step.id);
  }
});

test("a project in a Lemo-Opuscar style: STYLE.md as its rule file, the app's lemo pack, the demo only from the build on", { skip }, () => {
  const d = join(T, "project");
  mkdirSync(d, { recursive: true });
  const r = prepareRules(d, "lemo-watercolor");
  assert.deepEqual(r.first, [".moworks/rules/lemo-watercolor/SKILL.md", ".moworks/rules/lemo-opuscar/SKILL.md"]);
  const own = readFileSync(join(d, ".moworks", "rules", "lemo-watercolor", "SKILL.md"), "utf8");
  const shipped = readFileSync(join(src.root, "styles", "watercolor", "STYLE.md"), "utf8");
  assert.ok(own.endsWith(shipped), "STYLE.md as shipped");
  assert.match(own, /^---\nname: lemo-watercolor\n/);
  assert.match(own, /Lemomo \(LemoLab\).*blob\/ea34ff9546f675f9fd65a3c84e869a1da7471ad7\/styles\/watercolor\/STYLE\.md/);
  assert.equal(existsSync(join(d, ".moworks", "rules", "lemo-watercolor", "demo")), false, "the demo is not a rule");
  const reads = (step) => requiredReads(d, { styleId: "lemo-watercolor", first: r.first, step });
  assert.ok(reads("storyboard").includes(".moworks/rules/lemo-watercolor/SKILL.md"));
  assert.ok(!reads("storyboard").some((p) => p.includes("library/lemo")), "no demo before the build");
  stageDemo(d, "watercolor");
  assert.ok(reads("build").includes(".moworks/library/lemo/watercolor/DEMO.md"));
  assert.ok(existsSync(join(d, ".moworks", "library", "lemo", "watercolor", "demo", "main.js")));
  assert.match(readFileSync(join(d, ".moworks", "library", "lemo", "watercolor", "CREDIT.md"), "utf8"), /CC BY 4\.0/);
  prepareRules(d, "lemo-newsreel");
  assert.match(readFileSync(join(d, ".moworks", "rules", "lemo-newsreel", "SKILL.md"), "utf8"), /cuts from real material: find it, fetch it and log it.*CREDITS.*FACTS\.md/s);
  // a style cut from real material: its material tools from the first step (AGENTS.md "Treatment first"), the rest of the demo later
  const e = join(T, "evidence"); mkdirSync(e, { recursive: true });
  const tools = stageDemo(e, "satellite-briefing", undefined, { toolsOnly: true });
  assert.ok(tools.files.length && existsSync(join(e, ".moworks", "library", "lemo", "satellite-briefing", "demo", "tools")), JSON.stringify(tools.files));
  assert.equal(existsSync(join(e, ".moworks", "library", "lemo", "satellite-briefing", "DEMO.md")), false);
  assert.deepEqual(stageDemo(e, "watercolor", undefined, { toolsOnly: true }).files, [], "a style drawn in code: nothing before the build");
});

test("each Lemo-Opuscar style has its own sample brief: VI and EN, the dialog's fields, credited to its DEMO.md at the pinned commit", { skip }, async () => {
  const { BRIEF_SAMPLES, briefSampleFor, sampleFieldsFor } = await import("../ui/src/workflow/briefSample.js");
  const ids = listStyles().styles.filter((s) => s.author === "lemomo").map((s) => s.id).sort();
  assert.deepEqual(Object.keys(BRIEF_SAMPLES).filter((k) => k.startsWith("lemo-")).sort(), ids, "one per style, none extra");
  for (const id of ids) {
    const b = BRIEF_SAMPLES[id], slug = id.slice(5);
    assert.ok(b.en.length > 300 && b.vi.length > 300, id);
    assert.match(b.en, /^Topic: /); assert.match(b.vi, /^Chủ đề: /);
    assert.match(b.en, /About \d+ seconds/); assert.match(b.vi, /Khoảng \d+ giây/);
    assert.equal(b.credit.text, "Adapted from Lemomo (LemoLab) DEMO.md, MIT");
    assert.equal(b.credit.link, `https://github.com/lemomo-ai/lemo-opuscar/blob/ea34ff9546f675f9fd65a3c84e869a1da7471ad7/styles/${slug}/DEMO.md`);
    assert.ok(/^\d:\d\d$/.test(sampleFieldsFor(id).length) && [24, 30, 60].includes(sampleFieldsFor(id).fps), id);
    assert.ok(!/Claude|Clawd|Fenerba|Aichi|Nagoya|LemoLab|Opus/.test(b.en + b.vi), `${id}: no real marks of the demo, no LemoLab sign-off`);
  }
  assert.equal(briefSampleFor("lemo-ukiyoe", "vi"), BRIEF_SAMPLES["lemo-ukiyoe"].vi);
  assert.ok(BRIEF_SAMPLES.general && BRIEF_SAMPLES["hf-launch"], "the app's own samples are kept");
});

test("OPUSCAR 98: 98 sample style prompts, each with the author's frame, credited at the pinned commit; not styles", { skip }, () => {
  const p = samplePrompts();
  assert.equal(p.prompts.length, 98);
  assert.deepEqual(Object.keys(p.prompts[0]).sort(), ["blend_en", "chapter", "desc_en", "dim", "image", "no", "prompt_en", "render", "style_en", "title", "year"]);
  assert.equal(p.prompts[0].image, "/media/lemo/opuscar98/01.jpg");
  assert.ok(p.prompts.every((x) => x.image && mediaFile(x.image.replace("/media/lemo/", ""))), "every frame served from the clone");
  assert.equal(mediaFile("opuscar98/../01.jpg"), null);
  assert.match(p.credit.images.licence, /OPUSCAR frames not stated/);
  assert.equal(p.prompts[0].no, 1);
  assert.equal(p.chapters.length, 10);
  assert.ok(p.prompts.every((x) => p.chapters.some((c) => c.id === x.chapter)), "every prompt in a chapter");
  assert.ok(p.prompts.every((x) => x.prompt_en?.length > 40));
  assert.match(p.credit.link, /blob\/ea34ff9546f675f9fd65a3c84e869a1da7471ad7\/styleboard\/opuscar98_styles\.json$/);
  assert.equal(p.credit.licence, "MIT");
  assert.ok(!listStyles().styles.some((s) => /opuscar/i.test(s.id)));
});

test("R-LEMO text rewrite: the page's /node_modules map goes, three is r170, /core/ is local (a module import from its own file, the rest from the document); twice changes nothing", () => {
  const html = `<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<link rel="stylesheet" href="/core/fonts/fonts.css"><script type="module">import * as THREE from "three"; import { ss } from '/core/lib.js';</script>`;
  const a = rewriteLemoText(html, { version: "0.170.0", docPrefix: "../../", filePrefix: "../../" });
  assert.ok(!/importmap/.test(a.text));
  assert.match(a.text, /from "three@0\.170\.0"/);
  assert.match(a.text, /href="\.\.\/\.\.\/assets\/_app\/vendor\/lemo\/core\/fonts\/fonts\.css"/);
  assert.deepEqual([...a.core].sort(), ["fonts/fonts.css", "lib.js"]);
  assert.equal(a.three, true);
  const js = `import { X } from 'three/addons/postprocessing/Pass.js';\nimport { R } from '/node_modules/three/examples/jsm/environments/RoomEnvironment.js';\nimport { ss } from '/core/lib.js';\nconst hdr = '/core/assets/polyhaven/walnut_diff.jpg';`;
  const b = rewriteLemoText(js, { version: "0.170.0", docPrefix: "", filePrefix: "../../" });
  assert.match(b.text, /'three@0\.170\.0\/examples\/jsm\/postprocessing\/Pass\.js'/);
  assert.match(b.text, /'three@0\.170\.0\/examples\/jsm\/environments\/RoomEnvironment\.js'/);
  assert.match(b.text, /from '\.\.\/\.\.\/assets\/_app\/vendor\/lemo\/core\/lib\.js'/, "a module import: from the module's own folder");
  assert.match(b.text, /= 'assets\/_app\/vendor\/lemo\/core\/assets\/polyhaven\/walnut_diff\.jpg'/, "a texture URL: from the document");
  assert.equal(rewriteLemoText(b.text, { version: "0.170.0", docPrefix: "", filePrefix: "../../" }).text, b.text);
  const once = withBridge("<body><p>x</p></body>");
  assert.equal(withBridge(once), once);
  assert.equal(once.match(/data-mw="lemo"/g).length, 1);
});

test("a Lemo-Opuscar page end to end: finalize (bridge, r170, /core/ copied with its MIT notice), HyperFrames check, G-REMOTE, an offline render whose frames move", { skip, timeout: 300000 }, async () => {
  const dir = join(APP_ROOT, "test-output", "lemo-mini");
  rmSync(dir, { recursive: true, force: true }); rmSync(`${dir}-out`, { recursive: true, force: true });
  cpSync(join(APP_ROOT, "test", "fixtures", "lemo-mini"), dir, { recursive: true });
  const rep = await finalize(dir, { googleFonts: false });
  assert.ok(rep.lemo, "seen as a Lemo-Opuscar page");
  assert.deepEqual(rep.lemo.missing, []);
  assert.ok(rep.three.includes("0.170.0"), JSON.stringify(rep.three));
  const root = readFileSync(join(dir, "index.html"), "utf8");
  assert.equal(root.match(/data-mw="lemo"/g).length, 1);
  const maps = [...root.matchAll(/<script type="importmap"([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.deepEqual(maps.map((m) => m[1].trim()), ['data-mw="three"'], "the app's import map, not the page's");
  assert.ok(JSON.parse(maps[0][2]).imports["three@0.170.0"]);
  const post = readFileSync(join(dir, "assets", "_app", "vendor", "lemo", "core", "three", "post.js"), "utf8");
  assert.match(post, /^\/\/ From Lemo-Opuscar by Lemomo \(LemoLab\), MIT/);
  assert.match(post, /from 'three@0\.170\.0\/examples\/jsm\/postprocessing\/GTAOPass\.js'/);
  assert.ok(existsSync(join(dir, "assets", "_app", "vendor", "three", "0.170.0", "examples", "jsm", "postprocessing", "GTAOPass.js")));
  await finalize(dir, { googleFonts: false });
  assert.equal(readFileSync(join(dir, "index.html"), "utf8").match(/data-mw="lemo"/g).length, 1, "idempotent");
  assert.equal(gateRemote(dir).pass, true, JSON.stringify(gateRemote(dir).findings));
  const c = check(dir);
  assert.equal(c.json?.lint?.errorCount, 0, JSON.stringify(c.json?.lint?.findings));
  assert.equal(c.json?.runtime?.errorCount, 0, JSON.stringify(c.json?.runtime?.findings));
  const r = await render({ projectDir: dir, outputPath: `${dir}-out`, fps: { num: 10, den: 1 }, format: "png-sequence", workers: 2 });
  assert.equal(r.type, "done", JSON.stringify(r));
  const frames = readdirSync(`${dir}-out`).filter((f) => f.endsWith(".png")).sort();
  assert.equal(frames.length, 10);
  assert.ok(stillStd(join(`${dir}-out`, frames[5])) >= 2, "the page draws");
  assert.notDeepEqual(readFileSync(join(`${dir}-out`, frames[0])), readFileSync(join(`${dir}-out`, frames[9])), "render(t) follows HyperFrames' time");
});

test("a storyboard board in a Lemo-Opuscar style: its scripts inside its folder, the bridge and /core/ from the board, stills that draw", { skip, timeout: 300000 }, async () => {
  const d = join(T, "boards-film");
  const fx = join(APP_ROOT, "test", "fixtures", "lemo-mini");
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "index.html"), readFileSync(join(fx, "index.html"), "utf8").replace("compositions/lemo/main.js", "main.js").replace(/data-duration="1"/g, 'data-duration="2"'));
  cpSync(join(fx, "compositions", "lemo", "main.js"), join(d, "boards", "A", "main.js"));
  writeFileSync(join(d, "boards", "A", "STORYBOARD.md"), "# Option A: lemo\n\n- idea: a box\n\n## Frame 1 — One\n\n## Frame 2 — Two\n");
  mkdirSync(join(d, "assets"), { recursive: true });
  const res = await takeStills(d);
  assert.deepEqual(res.failed, [], JSON.stringify(res.failed));
  const html = readFileSync(join(d, "boards", "A", "index.html"), "utf8");
  assert.match(html, /data-mw="lemo"/);
  assert.match(readFileSync(join(d, "boards", "A", "main.js"), "utf8"), /from '\.\.\/\.\.\/assets\/_app\/vendor\/lemo\/core\/lib\.js'/);
  for (const s of res.round.options[0].stills) assert.ok(stillStd(join(d, ...s.split("/"))) >= 2, s);
});

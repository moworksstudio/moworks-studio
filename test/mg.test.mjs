// mg-styles-15 styles: the 15 styles of the pinned clone in the style catalog (the fourth author, credit,
// the author's film cards, the demo link), their rules in a project per step, their sample briefs, and a renderAt(t) page through
// finalize's bridge (R-LEMO) with the author's libraries and textures made local, HyperFrames' check and an offline render.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getStyle, listStyles, stylePipeline } from "../packages/style-catalog/index.mjs";
import { mediaFile, mgSource, stageDemo } from "../packages/mg-styles/index.mjs";
import { guessSource, rewriteLemoText } from "../packages/hf-edit/lemoPage.mjs";
import { prepareRules } from "../packages/agent/index.mjs";
import { requiredReads } from "../packages/agent/reads.mjs";
import { finalize } from "../packages/hf-edit/finalize.mjs";
import { gateRemote, stillStd } from "../packages/hf-qa/gates.mjs";
import { check } from "../packages/hf-qa/cli.mjs";
import { render } from "../packages/hf-render-worker/client.mjs";
import { status } from "../packages/offline-assets/index.mjs";
import { APP_ROOT, loadPins } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-mg-"));
after(() => rmSync(T, { recursive: true, force: true }));
const src = mgSource();
const skip = (!src?.intact && "the mg-styles-15 clone is not at the pinned commit (config/pins.json mgStyles)") || (!status().ready && "the offline assets are not all downloaded (Settings > Health)");
const SHA = "49052d80bfaf9fa8412cc9710530e5e95a3b8d8c";

test("the catalog: 15 mg-styles-15 styles by Vincentwei1021, the fourth author, each credited at the pinned commit, its film card from the clone, its demo film a link", { skip }, () => {
  const c = listStyles();
  const mg = c.styles.filter((s) => s.author === "vincentwei");
  assert.equal(mg.length, 15);
  const a = c.authors.find((x) => x.id === "vincentwei");
  assert.deepEqual([a.count, a.kind, a.licence, a.repo.sha], [14, "video-style", "MIT", SHA], "the Blender-made demo is hidden (owner 23/10)");
  assert.deepEqual(mg.filter((s) => s.hidden).map((s) => s.id), ["mg-04-3d-render"]);
  for (const s of mg) {
    assert.ok(s.available && (s.hidden === (s.renderer === "blender")), s.id);
    assert.match(s.credit.link, new RegExp(`^https://github\\.com/Vincentwei1021/mg-styles-15/blob/${SHA}/prompts/\\d\\d-[a-z0-9-]+\\.md$`));
    assert.equal(s.demo.url, `https://vincentwei1021.github.io/mg-styles-15/#${s.mg.slug}`);
    assert.ok(mediaFile(s.preview.image.replace("/media/mg/", "")), `${s.id} card`);
    assert.ok(s.title && s.demo.title, s.id);
    assert.ok(s.description.length > 40 && !s.description.startsWith("Demo film"), `${s.id}: a line of what the look is`);
    assert.ok(c.categories.includes(s.category) && !/mg-styles-15/.test(s.category), `${s.id}: a category of the catalog's own`);
    assert.deepEqual(stylePipeline(s.id).map((x) => x.id), ["brief", "storyboard", "motionSpec", "build", "qcReview", "sound", "checks", "finalMix"]);
  }
  assert.equal(getStyle("mg-18-hanazi").aspects[0], "9:16", "the vertical style opens vertical");
  assert.ok(getStyle("mg-19-paperclip").warnings.some((w) => w.kind === "real-creator"));
  assert.equal(getStyle("mg-04-3d-render").renderer, "blender");
  assert.equal(mediaFile("../README.md"), null);
});

test("a project in an mg-styles-15 style: the prompt as its rule file, the app's mg pack, the demo (no audio) and the rubric from the build on; a sample brief per style", { skip }, async () => {
  const d = join(T, "project");
  mkdirSync(d, { recursive: true });
  const r = prepareRules(d, "mg-09-bauhaus");
  assert.deepEqual(r.first, [".moworks/rules/mg-09-bauhaus/SKILL.md", ".moworks/rules/mg-styles/SKILL.md"]);
  const own = readFileSync(join(d, ".moworks", "rules", "mg-09-bauhaus", "SKILL.md"), "utf8");
  assert.ok(own.endsWith(readFileSync(join(src.root, "prompts", "09-bauhaus.md"), "utf8")), "the prompt as shipped");
  assert.match(own, /^---\nname: mg-09-bauhaus\ndescription: /);
  const reads = (step) => requiredReads(d, { styleId: "mg-09-bauhaus", first: r.first, step });
  assert.ok(!reads("storyboard").some((p) => p.includes("library/mg")), "no demo before the build");
  stageDemo(d, "06-collage");
  stageDemo(d, "09-bauhaus");
  assert.ok(reads("build").includes(".moworks/library/mg/09-bauhaus/CREDIT.md"));
  assert.ok(reads("qcReview").includes(".moworks/library/mg/09-bauhaus/rubric.md"));
  const walk = (x) => readdirSync(x, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(x, e.name)) : [e.name]);
  assert.ok(!walk(join(d, ".moworks", "library", "mg", "06-collage")).some((n) => /\.(wav|flac|mp3)$/i.test(n)), "no audio staged");
  const { BRIEF_SAMPLES } = await import("../ui/src/workflow/briefSample.js");
  const ids = listStyles().styles.filter((s) => s.author === "vincentwei").map((s) => s.id).sort();
  assert.deepEqual(Object.keys(BRIEF_SAMPLES).filter((k) => k.startsWith("mg-")).sort(), ids);
  for (const id of ids) {
    const b = BRIEF_SAMPLES[id];
    assert.match(b.en, /^Topic: /); assert.match(b.vi, /^Chủ đề: /);
    assert.equal(b.fields.length, "0:10");
    assert.match(b.credit.link, new RegExp(`/blob/${SHA}/prompts/${id.slice(3)}\\.md$`));
    assert.ok(!/PaperClip|回形针|林超/.test(b.en + b.vi), `${id}: never the real creator's name`);
  }
  assert.equal(BRIEF_SAMPLES["mg-18-hanazi"].fields.aspect, "9:16");
});

test("R-LEMO for an mg page: renderAt and __ready seen, three.js 0.186.1, the pinned libraries and the shared textures made local, fonts.css dropped", () => {
  const libs = loadPins().codeLibs.packages;
  const html = `<link rel="stylesheet" href="/assets/fonts/fonts.css"><script src="/node_modules/d3/dist/d3.min.js"></script><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>`;
  const a = rewriteLemoText(html, { version: "0.186.1", source: "mg", codeLibs: libs });
  assert.ok(!/fonts\.css/.test(a.text) && !/importmap/.test(a.text));
  assert.match(a.text, /src="assets\/_app\/vendor\/lib\/d3\/7\.9\.0\/dist\/d3\.min\.js"/);
  assert.deepEqual([...a.libs], ["d3@7.9.0/dist/d3.min.js"]);
  const js = `import { createNoise2D } from '/node_modules/simplex-noise/dist/esm/simplex-noise.js';\nimport * as THREE from 'three';\nconst g = '/assets/textures/grain/grain_fine_2048.png';`;
  const b = rewriteLemoText(js, { version: "0.186.1", docPrefix: "", filePrefix: "../../", source: "mg", codeLibs: libs });
  assert.match(b.text, /from '\.\.\/\.\.\/assets\/_app\/vendor\/lib\/simplex-noise\/4\.0\.3\/dist\/esm\/simplex-noise\.js'/, "a module import, from its own file");
  assert.match(b.text, /from 'three@0\.186\.1'/);
  assert.match(b.text, /= 'assets\/_app\/vendor\/mg\/assets\/textures\/grain\/grain_fine_2048\.png'/, "a texture, from the document");
  assert.equal(guessSource([js]), "mg");
  assert.equal(guessSource(["import { ss } from '/core/lib.js'; window.render = () => {};"]), "lemo");
});

test("an mg-styles-15 page end to end: finalize (bridge, d3 / simplex-noise / grain local), HyperFrames check, G-REMOTE, an offline render whose frames move", { skip, timeout: 300000 }, async () => {
  const dir = join(APP_ROOT, "test-output", "mg-mini");
  rmSync(dir, { recursive: true, force: true }); rmSync(`${dir}-out`, { recursive: true, force: true });
  cpSync(join(APP_ROOT, "test", "fixtures", "mg-mini"), dir, { recursive: true });
  const rep = await finalize(dir, { googleFonts: false });
  assert.equal(rep.lemo?.source ?? "mg", "mg");
  assert.deepEqual(rep.lemo.missing, []);
  for (const f of ["lib/d3/7.9.0/dist/d3.min.js", "lib/d3/7.9.0/LICENSE", "lib/simplex-noise/4.0.3/dist/esm/simplex-noise.js", "mg/assets/textures/grain/grain_fine_2048.png", "mg/LICENSE"])
    assert.ok(existsSync(join(dir, "assets", "_app", "vendor", ...f.split("/"))), f);
  const root = readFileSync(join(dir, "index.html"), "utf8");
  assert.equal(root.match(/data-mw="lemo"/g).length, 1);
  assert.ok(!/fonts\.css|\/node_modules\//.test(root.replace(/<!--[\s\S]*?-->/g, "")), "nothing left on the author's server");
  assert.equal(gateRemote(dir).pass, true, JSON.stringify(gateRemote(dir).findings));
  const c = check(dir);
  assert.equal(c.json?.lint?.errorCount, 0, JSON.stringify(c.json?.lint?.findings));
  assert.equal(c.json?.runtime?.errorCount, 0, JSON.stringify(c.json?.runtime?.findings));
  const r = await render({ projectDir: dir, outputPath: `${dir}-out`, fps: { num: 10, den: 1 }, format: "png-sequence", workers: 2 });
  assert.equal(r.type, "done", JSON.stringify(r));
  const frames = readdirSync(`${dir}-out`).filter((f) => f.endsWith(".png")).sort();
  assert.equal(frames.length, 10);
  assert.ok(stillStd(join(`${dir}-out`, frames[5])) >= 2, "the page draws");
  assert.notDeepEqual(readFileSync(join(`${dir}-out`, frames[0])), readFileSync(join(`${dir}-out`, frames[9])), "renderAt(t) follows HyperFrames' time");
});

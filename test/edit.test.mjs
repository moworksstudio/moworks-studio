// Finalize, scaffold and the golden render (real SDK + renders; slow). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { finalize } from "../packages/hf-edit/finalize.mjs";
import { scaffold } from "../packages/hf-edit/scaffold.mjs";
import { workRoot } from "../packages/project-service/index.mjs";
import { check } from "../packages/hf-qa/cli.mjs";
import { render } from "../packages/hf-render-worker/client.mjs";
import { APP_ROOT, expandEnv, loadPins } from "../packages/version-manager/index.mjs";
import { compareFrames, fringeCount } from "../tools/golden/media.mjs";

const T = join(APP_ROOT, "test-output", "edit");
const G = join(APP_ROOT, "test", "golden");
const REGISTRY = expandEnv(loadPins().hyperframes.registryRoot);   // HF's registry at the pinned commit (bundle/hf)
const NONET = { NODE_OPTIONS: `--import ${pathToFileURL(join(APP_ROOT, "test", "support", "nonet.mjs")).href}` };
const fresh = (name, from) => { const d = join(T, name); rmSync(d, { recursive: true, force: true }); cpSync(from, d, { recursive: true }); return d; };
const png = (dir, fps) => ({ projectDir: dir, outputPath: `${dir}-out`, fps: { num: fps, den: 1 }, format: "png-sequence", workers: 4 });

test("the golden film renders identical to the golden run", { timeout: 300000 }, async () => {
  const dir = fresh("roundtrip", join(G, "hf-native"));
  rmSync(`${dir}-out`, { recursive: true, force: true });
  const r = await render({ ...png(dir, 30), browserGpuMode: "software" });          // the CPU path, byte for byte (the GPU one is in gpu.test)
  assert.equal(r.type, "done");
  // the CPU golden set of HF 0.8.214: node tools/golden/run.mjs --label G214 --only hf-native-30 (software by default)
  const gold = join(APP_ROOT, "test-output", "golden", "G214", "hf-native-30");
  const c = await compareFrames(gold, `${dir}-out`);
  assert.equal(c.counts.identical, c.frames, JSON.stringify(c.counts));
});

// the test bed's kit film, on the maintainer's computer only (dev/poc in the work folder, or MW_KIT_FILM): skipped where it is not
const KIT_FILM = process.env.MW_KIT_FILM ?? join(workRoot(), "dev", "poc", "films", "01_Bench", "03_HTML");
test("finalize on the unfixed kit film: backgrounds moved, CSP + runtime added, LCD fringes 0, idempotent", { timeout: 300000, skip: existsSync(KIT_FILM) ? false : "the kit's test film is not on this computer" }, async () => {
  const dir = fresh("finalize", KIT_FILM);
  const r1 = await finalize(dir);
  assert.deepEqual(r1.backgroundsMoved, [{ file: "index.html", count: 4 }]);
  assert.equal(r1.csp, true);
  assert.equal(r1.runtime, true);
  const r2 = await finalize(dir);
  assert.deepEqual(r2.files, [], "second finalize changed files");
  rmSync(`${dir}-out`, { recursive: true, force: true });
  const r = await render(png(dir, 60));
  assert.equal(r.type, "done");
  assert.equal(fringeCount(join(`${dir}-out`, "frame_000151.png"), [150, 540, 1000, 630]), 0);
});

test("scaffold from STORYBOARD.md: HF lint clean, fonts from the kit, renders at 25 fps with zero network calls", { timeout: 400000 }, async () => {
  const dir = join(T, "scaffold");
  rmSync(dir, { recursive: true, force: true });
  const r = await scaffold(dir, readFileSync(join(APP_ROOT, "test", "fixtures", "storyboard", "STORYBOARD.md"), "utf8"), { registryRoot: REGISTRY });
  assert.equal(r.frames, 3);
  assert.deepEqual(r.installed, ["apple-money-count"]);
  assert.deepEqual(r.finalize.unresolvedFonts, []);
  assert.ok(readFileSync(join(dir, "STORYBOARD.md"), "utf8").includes("src: compositions/f1.html"));
  const q = check(dir);
  assert.equal(q.json.lint.errorCount, 0, JSON.stringify(q.json.lint.findings));
  const out = join(T, "scaffold.mp4");
  rmSync(out, { force: true });
  const rr = await render({ projectDir: dir, outputPath: out, fps: { num: 25, den: 1 }, workers: 4 }, { envOverride: NONET });
  assert.equal(rr.type, "done", JSON.stringify(rr));
  assert.equal(rr.totalFrames, 275);
  const log = readFileSync(rr.logFile, "utf8");
  assert.equal((log.match(/\[NONET\]/g) ?? []).length, 0, "the render tried to reach the network");
});

test("Google font: finalize downloads it once into the project; gates pass; render is offline; a second project reuses the cache", { timeout: 300000 }, async () => {
  const mk = (name) => {
    const d = fresh(name, join(APP_ROOT, "test", "fixtures", "gates", "remote"));
    const p = join(d, "index.html");
    writeFileSync(p, readFileSync(p, "utf8").replace(/<img id="remote"[^>]*>/, ""));    // keep only the undeclared family
    return d;
  };
  // the pinned Vietnamese list would serve Be Vietnam Pro first: an empty one leaves the Google Fonts route to this test
  const none = join(T, "no-vi-list.json");
  writeFileSync(none, JSON.stringify({ source: { repo: "google/fonts", commit: "0".repeat(40) }, bigBytes: 5e6, families: {}, noVietnamese: [] }));
  process.env.MW_FONTS_VI_LIST = none;
  const dir = mk("gfont");
  const r = await finalize(dir);
  assert.deepEqual(r.googleFonts.map((g) => g.family), ["Be Vietnam Pro"]);
  assert.deepEqual(r.unresolvedFonts, []);
  const { runGates } = await import("../packages/hf-qa/gates.mjs");
  const g = await runGates(dir, { blank: false });
  assert.equal(g.pass, true, JSON.stringify(g.blockingFailures));
  const out = join(T, "gfont.mp4");
  rmSync(out, { force: true });
  const rr = await render({ projectDir: dir, outputPath: out, fps: { num: 30, den: 1 }, workers: 2 }, { envOverride: NONET });
  assert.equal(rr.type, "done");
  assert.equal((readFileSync(rr.logFile, "utf8").match(/\[NONET\]/g) ?? []).length, 0);
  const again = await finalize(mk("gfont2"));
  delete process.env.MW_FONTS_VI_LIST;
  assert.equal(again.googleFonts[0].cached, true);
});

test("a family of the pinned Vietnamese list: finalize downloads its pinned files once; gates pass; render is offline", { timeout: 300000 }, async () => {
  const cache = join(T, "vi-cache");
  rmSync(cache, { recursive: true, force: true });
  process.env.MW_FONTS_VI_DIR = cache;
  try {
    const d = fresh("gfont-vi", join(APP_ROOT, "test", "fixtures", "gates", "remote"));
    const p = join(d, "index.html");
    writeFileSync(p, readFileSync(p, "utf8").replace(/<img id="remote"[^>]*>/, "").replace("'Be Vietnam Pro'", "'Manrope'"));          // a small family: one variable file
    const r = await finalize(d);
    assert.deepEqual(r.googleFontsVi.map((g) => [g.family, g.cached, g.credit.licence]), [["Manrope", false, "OFL-1.1"]]);
    assert.deepEqual([r.googleFonts, r.unresolvedFonts, r.googleViFailed ?? []], [[], [], []]);
    assert.ok(existsSync(join(d, "assets", "_app", "fonts", "google-vi", "manrope", "OFL.txt")));
    const { runGates } = await import("../packages/hf-qa/gates.mjs");
    const g = await runGates(d, { blank: false });
    assert.equal(g.pass, true, JSON.stringify(g.blockingFailures));
    const out = join(T, "gfont-vi.mp4");
    rmSync(out, { force: true });
    const rr = await render({ projectDir: d, outputPath: out, fps: { num: 30, den: 1 }, workers: 2 }, { envOverride: NONET });
    assert.equal(rr.type, "done");
    assert.equal((readFileSync(rr.logFile, "utf8").match(/\[NONET\]/g) ?? []).length, 0);
  } finally { delete process.env.MW_FONTS_VI_DIR; }
});

// GPU or CPU for renders: Settings' choice reaches every HyperFrames process, an export takes one test frame on the
// GPU and falls back to the CPU when it is black or fails (a film with no WebGL skips it), and a GPU render matches the
// CPU golden by eye (no "bug" frames).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chooseGpu, usesWebgl } from "../packages/hf-render-worker/gpu.mjs";
import { finalize } from "../packages/hf-edit/finalize.mjs";
import { render } from "../packages/hf-render-worker/client.mjs";
import { APP_ROOT, expandEnv, loadPins, renderSettings, runtimeEnv, saveRenderSettings } from "../packages/version-manager/index.mjs";

const S = mkdtempSync(join(tmpdir(), "mw-gpu-state-"));
process.env.MW_STATE_DIR = S;                          // this test's own settings, never the app's
after(() => { delete process.env.MW_STATE_DIR; rmSync(S, { recursive: true, force: true }); });
const T = join(APP_ROOT, "test-output", "gpu");
const film = (name) => { const d = join(T, name); rmSync(d, { recursive: true, force: true }); cpSync(join(APP_ROOT, "test", "fixtures", name), d, { recursive: true }); return d; };

test("Settings: Automatic by default, Always CPU reaches every HyperFrames process as SwiftShader; anything else is refused", () => {
  assert.equal(renderSettings().gpu, "auto");
  assert.equal(runtimeEnv().PRODUCER_BROWSER_GPU_MODE, "auto");
  saveRenderSettings({ gpu: "cpu" });
  assert.equal(runtimeEnv().PRODUCER_BROWSER_GPU_MODE, "software");
  assert.throws(() => saveRenderSettings({ gpu: "fast" }), /auto or cpu/);
  saveRenderSettings({ gpu: "auto" });
});

test("Always CPU: no test frame, the CPU", async () => {
  saveRenderSettings({ gpu: "cpu" });
  try {
    const g = await chooseGpu(film("three-mini"));
    assert.deepEqual([g.mode, g.reason, g.fellBack], ["software", "setting", false]);
  } finally { saveRenderSettings({ gpu: "auto" }); }
});

test("a film with no WebGL skips the test frame (Automatic: HF's probe decides) and Always CPU still wins; three.js, a webgl canvas or a vendored WebGL library is WebGL, the app's own HF runtime is not", async () => {
  const d = film("minimal");
  assert.equal(usesWebgl(d), false);
  const g = await chooseGpu(d, { workDir: join(T, "check-2d") });
  assert.deepEqual([g.mode, g.reason, g.fellBack], ["auto", "no-webgl", false], JSON.stringify(g));
  assert.equal(existsSync(join(T, "check-2d")), false, "no test frame was taken");
  assert.equal(renderSettings().lastCheck.reason, "no-webgl", "Settings shows why");
  saveRenderSettings({ gpu: "cpu" });
  try { assert.deepEqual(Object.values(await chooseGpu(d)).slice(0, 2), ["software", "setting"]); } finally { saveRenderSettings({ gpu: "auto" }); }
  assert.equal(usesWebgl(film("three-mini")), true, "three.js");
  assert.equal(usesWebgl(film("gpu-blank")), true, "a webgl canvas in the page");
  mkdirSync(join(d, "assets", "_app", "vendor"), { recursive: true });
  writeFileSync(join(d, "assets", "_app", "vendor", "hyperframe.runtime.iife.js"), 'c.getContext("webgl")');
  assert.equal(usesWebgl(d), false, "HF's runtime probes WebGL itself: not the film's");
  writeFileSync(join(d, "assets", "_app", "vendor", "globe.js"), 'const gl = canvas.getContext("webgl2");');
  assert.equal(usesWebgl(d), true, "a vendored library that draws with WebGL");
});

test("the test frame: a film that renders on the GPU uses it; one that comes out black there falls back to the CPU", { timeout: 300000 }, async (t) => {
  // finalized first, as every film is before its render (R-THREE: the import map and the vendored three.js): HF 0.8.214 holds render-ready
  // until the film's buildReady promise settles, and a bare "three" import never loads in the raw fixture
  const mini = film("three-mini"); await finalize(mini, { googleFonts: false });
  const ok = await chooseGpu(mini, { workDir: join(T, "check-ok") });
  if (ok.reason === "no-gpu") { t.skip("no usable GPU on this computer: the CPU path is the golden test in edit.test"); return; }
  assert.deepEqual([ok.mode, ok.reason, ok.fellBack], ["hardware", "gpu", false], JSON.stringify(ok));
  assert.ok(ok.renderer, "the GPU HF found");
  assert.equal(renderSettings().lastCheck.mode, "hardware", "Settings shows what the last check found");
  const blank = await chooseGpu(film("gpu-blank"), { workDir: join(T, "check-blank") });
  assert.deepEqual([blank.mode, blank.reason, blank.fellBack], ["software", "test-blank", true], JSON.stringify(blank));
});

// PSNR of every frame of two PNG sequences (ffmpeg's psnr filter): { frames, avg, min } in dB. Byte-for-byte is the CPU golden's test;
// the GPU rasterises CSS 3D edges and shading a little differently (measured: average 51.5 dB, worst frame 43.7 dB).
function psnr(a, b) {
  const ff = join(expandEnv(loadPins().ffmpeg.dir), "ffmpeg.exe"), log = join(T, "psnr.log");
  spawnSync(ff, ["-hide_banner", "-framerate", "30", "-i", join(a, "frame_%06d.png"), "-framerate", "30", "-i", join(b, "frame_%06d.png"),
    "-lavfi", `psnr=stats_file='${log.replace(/\\/g, "/").replace(":", "\\:")}'`, "-f", "null", "-"], { windowsHide: true });
  const v = readFileSync(log, "utf8").trim().split(/\r?\n/).map((l) => /psnr_avg:(\S+)/.exec(l)?.[1]).map((x) => (x === "inf" ? 99 : Number(x)));
  return { frames: v.length, avg: v.reduce((s, x) => s + x, 0) / v.length, min: Math.min(...v) };
}

test("a 2D film rendered on the GPU matches the CPU golden by eye: every frame above 40 dB PSNR", { timeout: 300000 }, async (t) => {
  const dir = join(T, "hf-native");
  rmSync(dir, { recursive: true, force: true }); rmSync(`${dir}-out`, { recursive: true, force: true });
  cpSync(join(APP_ROOT, "test", "golden", "hf-native"), dir, { recursive: true });
  const r = await render({ projectDir: dir, outputPath: `${dir}-out`, fps: { num: 30, den: 1 }, format: "png-sequence", workers: 4, browserGpuMode: "auto" });
  assert.equal(r.type, "done", JSON.stringify(r));
  const gold = join(APP_ROOT, "test-output", "golden", "G214", "hf-native-30");
  const p = psnr(gold, `${dir}-out`);
  t.diagnostic(`GPU vs CPU golden: ${p.frames} frames, average ${p.avg.toFixed(1)} dB, worst ${p.min.toFixed(1)} dB`);
  assert.equal(p.frames, readdirSync(gold).filter((f) => f.endsWith(".png")).length);
  assert.ok(p.min >= 40, `worst frame ${p.min} dB`);
});

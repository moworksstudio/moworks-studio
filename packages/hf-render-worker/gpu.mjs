// GPU or CPU for one export. With Settings' "auto", HyperFrames' own probe picks the GPU when Chrome finds a usable
// one; before the film is rendered on it, one test frame from the middle of the film is taken on the GPU. A failed or flat (black /
// blank) frame sends this render to the CPU (SwiftShader), unless the same frame is flat on the CPU too (the film is flat there).
// A film with no WebGL (no three.js, no webgl canvas) skips the test frame (about 8 s, more than the GPU saves on a short 2D film): HF's own probe still picks the GPU or the CPU for it.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { htmlFiles } from "../hf-edit/finalize.mjs";
import { scriptFiles, threeIn } from "../hf-edit/vendorLibs.mjs";
import { snapshotAtAsync } from "../hf-qa/cli.mjs";
import { stillStd } from "../hf-qa/gates.mjs";
import { APP_ROOT, renderSettings, saveRenderSettings } from "../version-manager/index.mjs";

const FLAT = 2;          // the G-BLANK threshold: grey-level standard deviation of a 320 px wide still
const WEBGL = /getContext\(\s*["'`](?:webgl2?|experimental-webgl)["'`]/;
const LOCAL_THREE = /<script[^>]*type=["']importmap["'][^>]*>[\s\S]*?["']three["']\s*:/i;          // a block that brings its own three (R-THREE)
const APP_VENDOR = new Set(["gsap.min.js", "MotionPathPlugin.min.js", "hyperframe.runtime.iife.js"]);          // the app's own: no WebGL of the film's

/** Whether the film draws with WebGL: three.js as finalize finds it (R-THREE), or a webgl canvas in its pages or its scripts, the
 *  libraries vendored into assets/ included (three.js itself is found by its import, the app's GSAP and HF runtime are not the film's). */
export function usesWebgl(projectDir) {
  const read = (rel) => { try { return readFileSync(join(projectDir, ...rel.split("/")), "utf8"); } catch { return ""; } };
  for (const f of htmlFiles(projectDir)) { const s = read(f); if (threeIn(s).size || LOCAL_THREE.test(s) || WEBGL.test(s)) return true; }
  for (const f of scriptFiles(projectDir)) { const s = read(f); if (threeIn(s).size || WEBGL.test(s)) return true; }
  const vendor = join(projectDir, "assets", "_app", "vendor");
  const walk = (d) => { for (const n of existsSync(d) ? readdirSync(d, { withFileTypes: true }) : []) {
    const p = join(d, n.name);
    if (n.isDirectory()) { if (n.name !== "three" && walk(p)) return true; }
    else if (/\.m?js$/.test(n.name) && !APP_VENDOR.has(basename(p)) && WEBGL.test(readFileSync(p, "utf8"))) return true;
  } return false; };
  return walk(vendor);
}

/** The time of the test frame: the middle of the root composition. */
function middle(projectDir) {
  const html = existsSync(join(projectDir, "index.html")) ? readFileSync(join(projectDir, "index.html"), "utf8") : "";
  const d = parseFloat(/data-composition-id="[^"]*"[^>]*data-duration="([0-9.]+)"/.exec(html)?.[1] ?? /data-duration="([0-9.]+)"/.exec(html)?.[1] ?? "2");
  return +Math.max(0, (Number.isFinite(d) ? d : 2) / 2).toFixed(3);
}

async function testFrame(projectDir, at, dir, mode, { version, signal }) {
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const r = await snapshotAtAsync(projectDir, [at], dir, { version, signal, env: { PRODUCER_BROWSER_GPU_MODE: mode } });
  const png = existsSync(dir) ? readdirSync(dir).find((n) => n.endsWith(".png") && n.startsWith("frame-")) : null;
  // HF's line: [hyperframes] browserGpuMode probe → hardware (WebGL renderer vendor="Google Inc. (NVIDIA)" renderer="ANGLE (NVIDIA, …)")
  const probe = /browserGpuMode probe → (hardware|software)([^\n]*)/.exec(r.stderr ?? "");
  return { ok: r.exitCode === 0 && !!png, std: png ? Math.round(stillStd(join(dir, png)) * 10) / 10 : null, chose: probe?.[1] ?? null,
    renderer: /renderer="([^"]+)"/.exec(probe?.[2] ?? "")?.[1] ?? null, error: r.exitCode === 0 ? null : (r.stderrTail ?? []).join(" ").slice(-300) };
}

/**
 * Decide this render's browser GPU mode. Returns { mode: "hardware" | "software" | "auto", reason, fellBack, renderer, ms }:
 *   reason "setting" (Settings says CPU), "no-webgl" (a 2D film: no test frame, mode "auto", HF's probe decides), "no-gpu" (HF's probe
 *   found none), "gpu" (the test frame is fine),
 *   "test-failed" / "test-blank" (fell back to the CPU for this render: fellBack true, the caller tells the user).
 */
export async function chooseGpu(projectDir, { root = APP_ROOT, version = null, signal = null, workDir = null } = {}) {
  const t0 = Date.now();
  const done = (x) => { const out = { ...x, ms: Date.now() - t0 }; try { saveRenderSettings({ lastCheck: { at: new Date().toISOString(), ...out } }, root); } catch { /* best effort */ } return out; };
  if (renderSettings(root).gpu === "cpu") return { mode: "software", reason: "setting", fellBack: false, renderer: null, ms: 0 };
  if (!usesWebgl(projectDir)) return done({ mode: "auto", reason: "no-webgl", fellBack: false, renderer: null });
  const at = middle(projectDir), base = workDir ?? join(projectDir, ".moworks", "cache", "gpu-check");
  const gpu = await testFrame(projectDir, at, join(base, "gpu"), "auto", { version, signal });
  if (gpu.chose === "software") return done({ mode: "software", reason: "no-gpu", fellBack: false, renderer: gpu.renderer, at });
  if (!gpu.ok) return done({ mode: "software", reason: "test-failed", fellBack: true, renderer: gpu.renderer, at, error: gpu.error });
  if (gpu.std >= FLAT) return done({ mode: "hardware", reason: "gpu", fellBack: false, renderer: gpu.renderer, at, std: gpu.std });
  const cpu = await testFrame(projectDir, at, join(base, "cpu"), "software", { version, signal });
  if (cpu.ok && cpu.std < FLAT) return done({ mode: "hardware", reason: "gpu", fellBack: false, renderer: gpu.renderer, at, std: gpu.std, flatOnCpuToo: true });
  return done({ mode: "software", reason: "test-blank", fellBack: true, renderer: gpu.renderer, at, std: gpu.std, cpuStd: cpu.std });
}

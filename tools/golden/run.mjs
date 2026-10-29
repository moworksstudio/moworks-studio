// Golden run: render every case of test/golden/golden.json with one HF version.
// node tools/golden/run.mjs --label <name> [--version <hf>] [--long] [--only id,id] [--gpu software|auto|hardware]
// The CPU path (software, SwiftShader) by default, as test/edit.test.mjs renders and compares byte for byte, so a golden set made on any
// computer matches it whatever Settings' GPU choice is; --gpu auto makes a GPU set (test/gpu.test.mjs compares by PSNR, not by bytes).
// Output: test-output/golden/<label>/<case>/ (render) + run.json (versions, facts per case)
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "../../packages/hf-render-worker/client.mjs";
import { APP_ROOT, checkFfmpeg, loadPins, packageVersions, resolveRuntime } from "../../packages/version-manager/index.mjs";
import { countFrames, loudness, probe } from "./media.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []));
const label = args.label ?? `run-${Date.now()}`;
const rt = resolveRuntime(args.version === true ? null : args.version ?? null);
const golden = JSON.parse(readFileSync(join(APP_ROOT, "test", "golden", "golden.json"), "utf8"));
const only = typeof args.only === "string" ? new Set(args.only.split(",")) : null;
const gpu = typeof args.gpu === "string" ? args.gpu : "software";
if (!["software", "auto", "hardware"].includes(gpu)) throw new Error(`--gpu must be software, auto or hardware, not ${gpu}`);
const outRoot = join(APP_ROOT, "test-output", "golden", label);
mkdirSync(outRoot, { recursive: true });

const run = { label, startedAt: new Date().toISOString(), browserGpuMode: gpu, hf: { version: rt.version, packages: packageVersions(rt.version) },
  chromium: loadPins().hyperframes.versions[rt.version].chromium, ffmpeg: checkFfmpeg().ffmpeg, node: process.version, cases: {} };
for (const c of golden.cases) {
  if (c.optional && !args.long) continue;
  if (only && !only.has(c.id)) continue;
  const ext = { "png-sequence": "", mp4: ".mp4", mov: ".mov", webm: ".webm" }[c.format];
  const out = join(outRoot, `${c.id}${ext}`);
  rmSync(out, { recursive: true, force: true });
  const r = await render({ projectDir: join(APP_ROOT, "test", "golden", c.film), outputPath: out, fps: c.fps, format: c.format, workers: 4, browserGpuMode: gpu }, { version: rt.version });
  const facts = r.type === "done" ? { probe: probe(out), frames: countFrames(out), loudness: c.format === "mp4" || c.format === "mov" ? loudness(out) : null } : null;
  run.cases[c.id] = { output: out, result: { type: r.type, code: r.code, outcome: r.outcome, totalFrames: r.totalFrames, warnings: r.warnings, wallMs: r.wallMs }, facts };
  console.log(`${c.id}: ${r.type}${r.code ? " " + r.code : ""} ${facts ? `${facts.frames} frames, ${facts.probe.duration ?? "-"} s` : ""} (${r.wallMs} ms)`);
}
run.endedAt = new Date().toISOString();
writeFileSync(join(outRoot, "run.json"), JSON.stringify(run, null, 2));
console.log(`run written: ${join(outRoot, "run.json")}`);

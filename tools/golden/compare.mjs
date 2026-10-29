// Compare two golden runs. node tools/golden/compare.mjs <labelA> <labelB> [--allow-edge]
// Writes test-output/golden/compare-<A>-vs-<B>.json and .md; exit 1 when a case fails.
// Pass rule per case: same result type, same frame count and stream facts, duration within one frame, loudness within 0.5 LU,
// zero "bug" frames; "edge" frames pass only with --allow-edge and are always listed (the plan: edge differences must be documented).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { APP_ROOT } from "../../packages/version-manager/index.mjs";
import { compareFrames } from "./media.mjs";

const [la, lb, flag] = process.argv.slice(2);
const allowEdge = flag === "--allow-edge";
const dir = join(APP_ROOT, "test-output", "golden");
const A = JSON.parse(readFileSync(join(dir, la, "run.json"), "utf8"));
const B = JSON.parse(readFileSync(join(dir, lb, "run.json"), "utf8"));
// a run keeps the absolute path it wrote; a set made before the work folder moved is found by name in its own label folder
const outOf = (label, c) => (existsSync(c.output) ? c.output : join(dir, label, basename(c.output.split("\\").join("/"))));
const rows = [];
const report = { a: { label: la, hf: A.hf.version }, b: { label: lb, hf: B.hf.version }, allowEdge, cases: {} };
for (const id of Object.keys(A.cases)) {
  const ca = A.cases[id], cb = B.cases[id];
  if (!cb) { report.cases[id] = { pass: false, reason: "missing in B" }; continue; }
  const problems = [];
  if (ca.result.type !== cb.result.type) problems.push(`result ${ca.result.type} vs ${cb.result.type}`);
  let frames = null;
  if (ca.facts && cb.facts) {
    const fa = ca.facts, fb = cb.facts;
    if (fa.frames !== fb.frames) problems.push(`frames ${fa.frames} vs ${fb.frames}`);
    for (const k of ["codec", "pixFmt", "width", "height", "rate"]) if (fa.probe.video?.[k] !== fb.probe.video?.[k]) problems.push(`video.${k} ${fa.probe.video?.[k]} vs ${fb.probe.video?.[k]}`);
    if (JSON.stringify(fa.probe.audio ?? null) !== JSON.stringify(fb.probe.audio ?? null)) problems.push("audio stream differs");
    const [num, den] = (fa.probe.video?.rate ?? "30/1").split("/").map(Number);
    if (fa.probe.duration != null && Math.abs(fa.probe.duration - fb.probe.duration) > den / num + 1e-6) problems.push(`duration ${fa.probe.duration} vs ${fb.probe.duration}`);
    if (fa.loudness != null && (fb.loudness == null || Math.abs(fa.loudness - fb.loudness) > 0.5)) problems.push(`loudness ${fa.loudness} vs ${fb.loudness} LUFS`);
    frames = await compareFrames(outOf(la, ca), outOf(lb, cb));
    if (frames.counts.bug) problems.push(`${frames.counts.bug} bug frames`);
    if (frames.counts.edge && !allowEdge) problems.push(`${frames.counts.edge} edge frames (not allowed)`);
  }
  report.cases[id] = { pass: problems.length === 0, problems, frames };
  rows.push(`| ${id} | ${problems.length ? "FAIL" : "PASS"} | ${frames ? `${frames.frames} / ${frames.counts.identical} / ${frames.counts.minor} / ${frames.counts.edge} / ${frames.counts.bug}` : "-"} | ${frames?.notable?.length ? frames.notable.slice(0, 6).map((x) => `${x.frame}:${x.cls}`).join(" ") : ""} | ${problems.join("; ")} |`);
  console.log(`${id}: ${problems.length ? "FAIL " + problems.join("; ") : "PASS"}${frames ? ` (${JSON.stringify(frames.counts)})` : ""}`);
}
const name = `compare-${la}-vs-${lb}`;
writeFileSync(join(dir, `${name}.json`), JSON.stringify(report, null, 2));
writeFileSync(join(dir, `${name}.md`), `# Golden compare: ${la} (HF ${A.hf.version}) vs ${lb} (HF ${B.hf.version})\n\n${new Date().toISOString()}${allowEdge ? ", edge frames allowed" : ""}\n\n| Case | Result | Frames / identical / minor / edge / bug | Notable frames | Problems |\n|---|---|---|---|---|\n${rows.join("\n")}\n`);
process.exitCode = Object.values(report.cases).every((c) => c.pass) ? 0 : 1;

// The whole-film pose check (Mira's run pose left her joint limits at 5.1 s and
// 5.75 s, the film logged it with console.error, HyperFrames counted a script error and Render stopped). HyperFrames' check samples the film;
// this draws EVERY frame of an anidoodle film (or every n-th past 3600 frames) in Node, in its own process (posecheck-run.mjs), and names
// each pose outside its limits, each logged error and each rig point that is not a number, with the frames and times where it happens.
// Used by the Review (qc_sheets adds it to every round), by Claude's pose_check tool, and before the render (G-POSE in hf-qa/gates.mjs).
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RUN = join(import.meta.dirname, "posecheck-run.mjs");
const sec = (f, fps) => `${(f / (fps || 30)).toFixed(2).replace(/\.?0+$/, "")} s`;
/** "5.1-5.3 s, 5.75 s": a finding's frames as time spans. */
export function spans(frames, fps, step = 1) {
  const fs = [...new Set(frames)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < fs.length; i++) { let j = i; while (j + 1 < fs.length && fs[j + 1] - fs[j] <= step) j++; out.push(i === j ? sec(fs[i], fps) : `${sec(fs[i], fps)}-${sec(fs[j], fps)}`); i = j; }
  return out.slice(0, 8).join(", ") + (out.length > 8 ? ` (+${out.length - 8} more)` : "");
}

/**
 * Check an anidoodle film (anidoodle/page.ts) or a board (boards/X/page.ts) over its whole length. Returns { ran, pass, films, error? }:
 * ran false when there is no such film or the staged engine is missing.
 */
export function poseCheck(projectDir, { entry = "anidoodle/page.ts", step = 0, timeoutMs = 180000 } = {}) {
  if (!existsSync(join(projectDir, ...entry.split("/"))) || !existsSync(join(projectDir, ".moworks", "library", "anidoodle", "engine", "src"))) return Promise.resolve({ ran: false, pass: true, films: [] });
  const tmp = mkdtempSync(join(tmpdir(), "mw-posecheck-"));          // the bundle lives outside the project
  return new Promise((resolve) => {
    execFile(process.execPath, [RUN, projectDir, entry, tmp, String(step)], { timeout: timeoutMs, maxBuffer: 32 << 20, windowsHide: true, env: { ...process.env, NODE_OPTIONS: "" } }, (err, stdout, stderr) => {
      rmSync(tmp, { recursive: true, force: true });
      let r = null; try { r = JSON.parse(String(stdout).trim().split("\n").pop()); } catch { /* below */ }
      if (!r) return resolve({ ran: true, pass: false, films: [], error: err?.killed ? `the check ran out of time (${Math.round(timeoutMs / 1000)} s)` : String(stderr || err?.message || "no answer").trim().split("\n").slice(-3).join(" ").slice(0, 600) });
      resolve({ ran: true, pass: r.films.length > 0 && r.films.every((f) => !f.findings.length), films: r.films, ...(r.films.length ? {} : { error: "the page mounted no film" }) });
    });
  });
}

/** The check in words, for Claude (qc_sheets, pose_check). */
export function poseText(r) {
  if (!r.ran) return "";
  if (r.error) return `Whole-film pose check: could not run (${r.error}).`;
  const lines = r.films.flatMap((f) => f.findings.map((x) => `- ${x.kind === "throws" ? "throws" : x.kind === "nan" ? "not a number" : x.kind}: ${x.message.slice(0, 400)} at ${spans(x.frames, f.fps, f.step)}`));
  const n = r.films.reduce((a, f) => a + f.checked, 0);
  return r.pass ? `Whole-film pose check: every one of ${n} frames drew with every joint inside its limits, no logged error.`
    : [`Whole-film pose check (${n} frames, every frame drawn): FIX before the render (a logged or thrown error is a script error for HyperFrames and stops it). Keep every joint inside its limits on every frame (clamp the joint values, or retime the move), never catch and log the error:`, ...lines].join("\n");
}

/** G-POSE for the pre-render gates: blocking, one finding per problem with its times. */
export async function gatePose(projectDir) {
  const r = await poseCheck(projectDir);
  if (!r.ran) return null;
  const findings = r.error ? [{ message: `The whole-film pose check could not run: ${r.error}` }]
    : r.films.flatMap((f) => f.findings.map((x) => ({ kind: x.kind, frames: x.frames.slice(0, 50), message: `${x.message.slice(0, 300)} at ${spans(x.frames, f.fps, f.step)}` })));
  return { id: "G-POSE", blocking: !r.error, pass: r.pass, findings };          // a check that could not run is a warning
}

// The whole-film pose check (Mira's run pose left her joint limits at 5.1 s and
// 5.75 s, the film logged it with console.error, HyperFrames counted a script error and Render stopped). HyperFrames' check samples the film;
// this draws EVERY frame of an anidoodle film (or every n-th past 3600 frames) in Node, in its own process (posecheck-run.mjs), and names
// each pose outside its limits, each logged error and each rig point that is not a number, with the frames and times where it happens.
// Used by the Review (qc_sheets adds it to every round), by Claude's pose_check tool, and before the render (G-POSE in hf-qa/gates.mjs).
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
export function poseCheck(projectDir, { entry = "anidoodle/page.ts", step = 0, timeoutMs = null } = {}) {
  if (!existsSync(join(projectDir, ...entry.split("/"))) || !existsSync(join(projectDir, ".moworks", "library", "anidoodle", "engine", "src"))) return Promise.resolve({ ran: false, pass: true, films: [] });
  const limit = timeoutMs ?? filmLimitMs(projectDir);          // by the film's length (a board is shorter than its film)
  const tmp = mkdtempSync(join(tmpdir(), "mw-posecheck-"));          // the bundle lives outside the project
  return new Promise((resolve) => {
    execFile(process.execPath, [RUN, projectDir, entry, tmp, String(step)], { timeout: limit, maxBuffer: 32 << 20, windowsHide: true, env: { ...process.env, NODE_OPTIONS: "" } }, (err, stdout, stderr) => {
      rmSync(tmp, { recursive: true, force: true });
      let r = null; try { r = JSON.parse(String(stdout).trim().split("\n").pop()); } catch { /* below */ }
      if (!r) return resolve({ ran: true, pass: false, films: [], timedOut: !!err?.killed, error: err?.killed ? `the check ran out of time (${Math.round(limit / 1000)} s)` : String(stderr || err?.message || "no answer").trim().split("\n").slice(-3).join(" ").slice(0, 600) });
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

/** The check's time limit for a film of `seconds` at `fps`: about 0.2 s a frame it draws (every frame up to 3600, then every n-th), never
 *  under 3 min nor over 15. A 100 s film at 24 fps ran out of the fixed 3 min while another film's checks ran beside it (Test 21). */
export function poseLimitMs(seconds, fps = 30) {
  const frames = Math.min(3600, Math.ceil((Number(seconds) || 0) * (Number(fps) || 30)));
  return Math.min(900000, Math.max(180000, Math.round(frames * 200)));
}
/** The limit for the project's film: its length and frame rate from the root composition (index.html). */
export function filmLimitMs(projectDir) {
  try {
    const tag = /<[a-z][\w-]*\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(readFileSync(join(projectDir, "index.html"), "utf8"))?.[0] ?? "";
    return poseLimitMs(Number(/\bdata-duration="([\d.]+)"/.exec(tag)?.[1]) || 0, Number(/\bdata-fps="([\d.]+)"/.exec(tag)?.[1]) || 30);
  } catch { return poseLimitMs(0); }
}

/** G-POSE for the pre-render gates: blocking, one finding per problem with its times. A check that could not run (out of time, an error
 *  of its own) is no pass: "Not checked", with why in plain words (`why`), and the error for Claude in its finding (T21-5: it counted as
 *  "1 warning" about the film). */
export async function gatePose(projectDir, { timeoutMs = null } = {}) {
  const limit = timeoutMs ?? filmLimitMs(projectDir);
  const r = await poseCheck(projectDir, { timeoutMs: limit });
  if (!r.ran) return null;
  if (r.error) {
    return { id: "G-POSE", blocking: false, pass: false, notChecked: true, skippedReason: "failed", timeLimitS: Math.round(limit / 1000),
      why: r.timedOut ? `It ran out of its time (${Math.round(limit / 60000)} min) before every frame was drawn.` : "It stopped with an error of its own before it could check the poses.",
      findings: [{ severity: "warning", code: "not_checked", message: `The whole-film pose check could not run: ${r.error}` }] };
  }
  const findings = r.films.flatMap((f) => f.findings.map((x) => ({ kind: x.kind, frames: x.frames.slice(0, 50), message: `${x.message.slice(0, 300)} at ${spans(x.frames, f.fps, f.step)}` })));
  return { id: "G-POSE", blocking: true, pass: r.pass, findings };
}

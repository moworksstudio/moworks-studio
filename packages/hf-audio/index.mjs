// HyperFrames audio adapter: the transcript belongs to HyperFrames. A word list made by the app's engines is imported with
// `hyperframes transcribe <words.json> --dir <project>`, so HyperFrames normalizes it and writes the project's transcript.json (the file its
// caption and lyric skills read).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";
import { cliEntry } from "../hf-qa/cli.mjs";

/** Import a normalized word array ([{ text, start, end }]) as the project's transcript. Returns { ok, file, words, stderrTail }. */
export function importTranscript(projectDir, wordsFile, { version = null, timeoutMs = 120000 } = {}) {
  const rt = resolveRuntime(version);
  const dir = resolve(projectDir);
  const r = spawnSync(process.execPath, [cliEntry(rt.dir), "transcribe", resolve(wordsFile), "--dir", dir, "--json"], {
    env: { ...rt.env, NO_COLOR: "1" }, encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const file = join(dir, "transcript.json");
  let words = null;
  try { words = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null; } catch { /* unreadable */ }
  return { ok: r.status === 0 && Array.isArray(words), exitCode: r.status, file, words: Array.isArray(words) ? words.length : 0,
    stderrTail: (r.stderr ?? "").split(/\r?\n/).filter(Boolean).slice(-5), hfVersion: rt.version };
}

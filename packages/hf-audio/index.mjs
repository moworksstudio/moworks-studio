// HyperFrames audio adapter: the transcript belongs to HyperFrames. A word list made by the app's engines is imported with
// `hyperframes transcribe <words.json> --dir <project>`, so HyperFrames normalizes it and writes the project's transcript.json (the file its
// caption and lyric skills read).
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runHf } from "../hf-qa/cli.mjs";

/** Import a normalized word array ([{ text, start, end }]) as the project's transcript. Resolves { ok, file, words, stderrTail }. The CLI
 *  runs without holding the caller's event loop: the server saves a transcript inside a request and a job (T27-3). */
export async function importTranscript(projectDir, wordsFile, { version = null, timeoutMs = 120000 } = {}) {
  const dir = resolve(projectDir);
  const r = await runHf(["transcribe", resolve(wordsFile), "--dir", dir, "--json"], { version, timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  const file = join(dir, "transcript.json");
  let words = null;
  try { words = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null; } catch { /* unreadable */ }
  return { ok: r.status === 0 && Array.isArray(words), exitCode: r.status, file, words: Array.isArray(words) ? words.length : 0,
    stderrTail: (r.stderr ?? "").split(/\r?\n/).filter(Boolean).slice(-5), hfVersion: r.hfVersion };
}

// Claude Code PreToolUse hook: before Claude writes or edits a file, the rule files this pipeline step requires (reads.mjs) must
// have been read in this conversation. Claude Code passes the hook { transcript_path, tool_name, tool_input, ... } on stdin; the transcript
// (JSONL) holds every Read call so far. A missing read blocks the edit ONCE with a message Claude sees (exit code 2), and is recorded in
// .moworks/cache/read-guard.json; the next edit goes through, so a file that cannot be read never stops the work.
// Env: MW_REQUIRED_READS (JSON array of project-relative paths), MW_TASK (the app's task id), MW_PROJECT (the project folder).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const norm = (p) => String(p ?? "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();

/** The files read in a transcript: project-relative, lower case. */
export function readsIn(transcriptText, projectDir) {
  const out = new Set();
  for (const line of String(transcriptText ?? "").split(/\r?\n/)) {
    if (!line.includes("\"tool_use\"")) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    for (const c of e?.message?.content ?? []) {
      if (c?.type !== "tool_use" || c.name !== "Read") continue;
      const f = String(c.input?.file_path ?? "");
      if (!f) continue;
      const rel = isAbsolute(f) ? relative(resolve(projectDir), resolve(f)) : f;
      out.add(norm(rel));
    }
  }
  return out;
}

/** The decision for one edit: { block: false } or { block: true, missing, message }. warned: this task was already told once.
 *  The message says that it stops an edit once and what to do next: Test 23's music step read it as a lock ("the app blocks writing
 *  before I have read enough of this step's rules"), never tried again and left NOTES.md without the film's music (T23-7). */
export function decide({ required, read, warned }) {
  const missing = required.filter((r) => !read.has(norm(r)));
  if (!missing.length || warned) return { block: false, missing };
  return { block: true, missing,
    message: `Not written yet: this step's rule files come first, read before the first edit (the app checks it once per task): ${missing.join(", ")}. Read them all in one turn, then make this same edit again: it goes through, and so does every edit after it (docs/NOTES.md and this step's own files included). Never leave a file unwritten because of this check.` };
}

async function main() {
  let input = "";
  for await (const ch of process.stdin) input += ch;
  let ev = {}; try { ev = JSON.parse(input); } catch { process.exit(0); }
  const project = process.env.MW_PROJECT || ev.cwd || process.cwd();
  let required = []; try { required = JSON.parse(process.env.MW_REQUIRED_READS || "[]"); } catch { /* none */ }
  if (!required.length || !ev.transcript_path || !existsSync(ev.transcript_path)) process.exit(0);
  const read = readsIn(readFileSync(ev.transcript_path, "utf8"), project);
  const logFile = join(project, ".moworks", "cache", "read-guard.json");
  let log = { tasks: {} }; try { log = JSON.parse(readFileSync(logFile, "utf8")); } catch { /* first */ }
  const task = process.env.MW_TASK || ev.session_id || "task";
  const was = log.tasks?.[task] ?? null;
  const d = decide({ required, read, warned: !!was?.warned });
  if (!d.missing.length && !was) process.exit(0);
  log.tasks ??= {};
  log.tasks[task] = d.block ? { warned: true, at: new Date().toISOString(), tool: ev.tool_name, missing: d.missing }
    : { ...(was ?? {}), ...(was?.warned ? { after: { at: new Date().toISOString(), stillMissing: d.missing } } : {}) };
  try { mkdirSync(dirname(logFile), { recursive: true }); writeFileSync(logFile, JSON.stringify(log, null, 2)); } catch { /* best effort */ }
  if (d.block) { process.stderr.write(d.message); process.exit(2); }
  process.exit(0);
}
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main();

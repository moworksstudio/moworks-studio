// Claude Code's command line on Windows. CreateProcess takes at most 32,767 characters, and the app once passed the whole system prompt
// as --append-system-prompt: a film past its Final Mix carried 33,139 characters of it and every chat message failed in 3 s with
// "spawn ENAMETOOLONG" (T27-14). Long text now reaches Claude Code in a file (--append-system-prompt-file, read by Claude Code 2.1.309:
// checked against a local stand-in for the API, the whole file arrived as the system prompt) or on stdin (the request); the command line
// keeps only the app's own flags, and checkArgv measures it before every start against a budget far under the limit, so a part that
// grows is refused in plain words and named in the log, never left to Windows.
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const WINDOWS_MAX = 32767;
/** The most a Claude Code command line may hold here (the app's flags take about 1,500 characters). */
export const ARGV_BUDGET = 8000;
const DAY = 24 * 60 * 60 * 1000;

/** One argument as libuv writes it into a Windows command line (quote_cmd_arg): bare without a space, tab or quote; else in quotes,
 *  each quote escaped and the backslashes before a quote or the closing quote doubled. */
export function quoteArg(arg) {
  const s = String(arg);
  if (!s) return "\"\"";
  if (!/[ \t"]/.test(s)) return s;
  if (!/["\\]/.test(s)) return `"${s}"`;
  const out = [];
  let hit = true;
  for (let i = s.length - 1; i >= 0; i--) {
    out.push(s[i]);
    if (hit && s[i] === "\\") out.push("\\");
    else if (s[i] === "\"") { hit = true; out.push("\\"); }
    else hit = false;
  }
  return `"${out.reverse().join("")}"`;
}

/** The length of the command line Windows gets for spawn(exe, args), in characters (UTF-16 units, as Windows counts them). */
export function commandLineLength(exe, args) {
  return [exe, ...args].reduce((n, a) => n + quoteArg(a).length + 1, -1);
}

/** The command line's parts, biggest first: the program, then each flag with its values ("--settings" and its JSON). */
export function argvParts(exe, args) {
  const flag = (s) => /^--?[a-z]/i.test(s);
  const parts = [{ name: "the program's path", length: quoteArg(exe).length }];
  for (const a of args.map(String)) {
    if (flag(a) || parts.length === 1) parts.push({ name: flag(a) ? a : "(argument)", length: quoteArg(a).length + 1 });
    else parts.at(-1).length += quoteArg(a).length + 1;
  }
  return parts.sort((a, b) => b.length - a.length);
}

/** Before a start: refuses a command line longer than `budget` with a plain error (code ARGV_TOO_LONG; the biggest part on the error and
 *  in the log), never Windows' ENAMETOOLONG. Returns the length. */
export function checkArgv(exe, args, { budget = ARGV_BUDGET, log = console.warn } = {}) {
  const length = commandLineLength(exe, args);
  if (length <= budget) return length;
  const part = argvParts(exe, args)[0];
  const n = (x) => x.toLocaleString("en");
  try { log?.(`Claude Code not started: its command line is ${n(length)} characters (budget ${n(budget)}, Windows' limit ${n(WINDOWS_MAX)}); the largest part is ${part.name}, ${n(part.length)} characters`); } catch { /* the log is best effort */ }
  throw Object.assign(new Error(`Claude could not be started: this request is too large to hand to Claude Code (${n(length)} characters, the most is ${n(budget)}). Nothing was changed.`),
    { code: "ARGV_TOO_LONG", length, budget, part });
}

/** A long text for Claude Code as a file (the system prompt for --append-system-prompt-file): `<folder>/<id>.md`, UTF-8, in the app's
 *  state, outside the project and its revisions; files a crash left behind (a day old) are removed on the way. drop() removes it once
 *  the run has ended. */
export function promptFile(folder, id, text, { now = Date.now() } = {}) {
  mkdirSync(folder, { recursive: true });
  for (const n of readdirSync(folder)) { try { const p = join(folder, n); if (now - statSync(p).mtimeMs > DAY) rmSync(p, { force: true }); } catch { /* in use or gone */ } }
  const path = join(folder, `${id}.md`);
  writeFileSync(path, text, "utf8");
  return { path, drop: () => { try { rmSync(path, { force: true }); } catch { /* gone */ } } };
}

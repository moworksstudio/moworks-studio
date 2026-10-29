// Guard: every child process the app or its tests start sets `windowsHide` in its options. On Windows 11 with Windows
// Terminal as the default terminal, a console program started from a process with no console opens a visible terminal
// window unless the spawn hides it. This test scans packages/, tools/ and test/ (not vendor or generated code) for calls
// to node:child_process (spawn, spawnSync, execFile, execFileSync, exec, execSync, fork, and promisified forms) and fails
// naming file:line for any call whose options do not mention `windowsHide`, directly or through an options helper
// (a variable or function defined in the same file whose definition sets it).
// acorn is not in the app's node_modules, so the scan masks comments, strings and regex literals and matches parens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIRS = ["packages", "tools", "test"];
const SKIP_DIRS = new Set(["node_modules", "bundle", "runtime", "vendor", "dist", ".git", "test-output"]);
const FNS = new Set(["spawn", "spawnSync", "execFile", "execFileSync", "exec", "execSync", "fork"]);
const MOD = String.raw`["'](?:node:)?child_process["']`;
const KEYWORDS = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);

// Blank out comments (and, unless keepStrings, string / template / regex contents) with spaces, keeping offsets and
// newlines, so the result can be searched as code with the same line numbers.
export function maskSource(src, { keepStrings = false } = {}) {
  const out = src.split("");
  const n = src.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (src[k] !== "\n" && src[k] !== "\r") out[k] = " "; };
  const blankStr = (a, b) => { if (!keepStrings) blank(a, b); };
  const braces = []; // one depth counter per open `${`
  let i = 0, last = "", word = "";
  if (src.startsWith("#!")) { const e = src.indexOf("\n"); i = e < 0 ? n : e; blank(0, i); }
  const template = () => { // i is just past a backtick, or past the `}` closing a `${`
    const start = i;
    while (i < n) {
      const c = src[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { blankStr(start, i); i++; last = "`"; return; }
      if (c === "$" && src[i + 1] === "{") { blankStr(start, i); i += 2; braces.push(0); last = "{"; return; }
      i++;
    }
    blankStr(start, n);
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { const e = src.indexOf("\n", i); const end = e < 0 ? n : e; blank(i, end); i = end; continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; blank(i, end); i = end; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      blankStr(i + 1, j); i = j + 1; last = c; word = ""; continue;
    }
    if (c === "`") { i++; template(); word = ""; continue; }
    if (c === "/" && (last === "" || "(,=:[!&|?{};+-*%<>~^".includes(last) || KEYWORDS.has(word))) { // regex literal
      let j = i + 1, cls = false;
      while (j < n && src[j] !== "\n") {
        const x = src[j];
        if (x === "\\") { j += 2; continue; }
        if (x === "[") cls = true; else if (x === "]") cls = false; else if (x === "/" && !cls) break;
        j++;
      }
      blankStr(i + 1, j); i = j + 1;
      while (i < n && /[a-z]/i.test(src[i])) i++;
      last = "/"; word = ""; continue;
    }
    if (c === "{" && braces.length) braces[braces.length - 1]++;
    if (c === "}" && braces.length) {
      if (braces[braces.length - 1] === 0) { braces.pop(); i++; template(); word = ""; continue; }
      braces[braces.length - 1]--;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (/[\w$]/.test(c)) { let j = i; while (j < n && /[\w$]/.test(src[j])) j++; word = src.slice(i, j); last = "a"; i = j; continue; }
    last = c; word = ""; i++;
  }
  return out.join("");
}

// Index of the bracket closing the one at `open` (code must be masked), or -1.
function closing(code, open) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  for (let k = open; k < code.length; k++) {
    const c = code[k];
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ")" || c === "]" || c === "}") { if (stack.pop() !== c) return -1; if (!stack.length) return k; }
  }
  return -1;
}

// Local names bound to child_process functions in this file: { calls: Set<local name>, spaces: Set<namespace name> }.
function bindings(code) { // code: comments masked, strings kept
  const calls = new Set(), spaces = new Set();
  const named = (list, sep) => {
    for (const part of list.split(",")) {
      const [orig, alias] = part.split(sep).map((s) => s.trim());
      if (FNS.has(orig)) calls.add(alias || orig);
    }
  };
  for (const m of code.matchAll(new RegExp(String.raw`import\s*\{([^}]*)\}\s*from\s*${MOD}`, "g"))) named(m[1], /\s+as\s+/);
  for (const m of code.matchAll(new RegExp(String.raw`import\s+([\w$]+)\s*(?:,\s*\{([^}]*)\})?\s*from\s*${MOD}`, "g"))) { spaces.add(m[1]); if (m[2]) named(m[2], /\s+as\s+/); }
  for (const m of code.matchAll(new RegExp(String.raw`import\s*\*\s*as\s+([\w$]+)\s+from\s*${MOD}`, "g"))) spaces.add(m[1]);
  for (const m of code.matchAll(new RegExp(String.raw`\{([^{}]*)\}\s*=\s*(?:await\s+import|require)\s*\(\s*${MOD}\s*\)`, "g"))) named(m[1], ":");
  for (const m of code.matchAll(new RegExp(String.raw`(?:const|let|var)\s+([\w$]+)\s*=\s*(?:await\s+import|require)\s*\(\s*${MOD}\s*\)`, "g"))) spaces.add(m[1]);
  const fn = [...FNS].join("|");
  for (const m of code.matchAll(new RegExp(String.raw`([\w$]+)\s*=\s*(?:[\w$]+\.)?promisify\s*\(\s*((?:[\w$]+\s*\.\s*)?[\w$]+)\s*\)`, "g"))) {
    const target = m[2].replace(/\s/g, "");
    const [ns, f] = target.includes(".") ? target.split(".") : [null, target];
    if (ns ? spaces.has(ns) && FNS.has(f) : calls.has(f)) calls.add(m[1]);
  }
  return { calls, spaces, fn };
}

// Extent of the definition of `name` nearest before offset `at` (else a function declared after: it is hoisted): a function
// declaration with its body, or a const/let/var (also `const [cmd, args, o] = ps(...)`) with its initialiser; or null.
function definitionOf(code, name, at) {
  const esc = name.replace(/\$/g, "\\$");
  const defs = [...code.matchAll(new RegExp(String.raw`\bfunction\s*\*?\s*${esc}\s*\(|(?:\b(?:const|let|var)\s+|,\s*)${esc}\s*=(?![=>])|\b(?:const|let|var)\s*\[[^\]=]*(?<![\w$])${esc}(?![\w$])[^\]=]*\]\s*=(?![=>])`, "g"))];
  const v = defs.filter((d) => d.index < at).pop() ?? defs.find((d) => /^function/.test(d[0]));
  if (!v) return null;
  if (/^function/.test(v[0])) {
    const params = closing(code, v.index + v[0].length - 1);
    const body = params < 0 ? -1 : code.indexOf("{", params);
    const end = body < 0 ? -1 : closing(code, body);
    return end > 0 ? code.slice(v.index, end + 1) : null;
  }
  {
    const pairs = { "(": ")", "[": "]", "{": "}" };
    let k = v.index + v[0].length, depth = 0;
    for (; k < code.length; k++) {
      const c = code[k];
      if (pairs[c]) depth++;
      else if (c === ")" || c === "]" || c === "}") { if (--depth < 0) break; }
      else if (depth === 0 && (c === ";" || c === ",")) break;
      else if (depth === 0 && c === "\n" && !/^\s*[.?:+\-*/&|=]/.test(code.slice(k + 1, k + 200)) && !/[=>(,?:+\-*/&|]\s*$/.test(code.slice(v.index, k))) break;
    }
    return code.slice(v.index, k);
  }
}

// Split a call's argument text (masked) at its top-level commas.
function topArgs(args) {
  const out = [];
  let depth = 0, from = 0;
  for (let k = 0; k < args.length; k++) {
    const c = args[k];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) { out.push(args.slice(from, k)); from = k + 1; }
  }
  out.push(args.slice(from));
  return out.map((a) => a.trim());
}

// Does this options argument set windowsHide: as an object literal key, or through a same-file variable or function
// (`opts`, `ps()`, `{ ...base, cwd }`)? Arrays (the argv) and callbacks are not options.
function optionHides(code, a, seen, at) {
  if (!a || a.startsWith("[") || /^(?:async\s+)?(?:function\b|(?:\([^)]*\)|[\w$]+)\s*=>)/.test(a)) return false;
  if (a.startsWith("{")) return /\bwindowsHide\b/.test(a) || [...a.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)].some(([, id]) => idHides(code, id, seen, at));
  const m = /^([A-Za-z_$][\w$]*)/.exec(a);
  return m ? idHides(code, m[1], seen, at) : false;
}

function idHides(code, id, seen, at) {
  if (seen.has(id) || KEYWORDS.has(id)) return false;
  seen.add(id);
  const def = definitionOf(code, id, at);
  if (!def) return false;
  if (/^function\b/.test(def)) return /\bwindowsHide\b/.test(def);
  const init = def.slice(def.indexOf("=") + 1).trim();
  if (/^(?:async\s+)?(?:\([^)]*\)|[\w$]+)\s*=>/.test(init)) return /\bwindowsHide\b/.test(init); // an arrow helper
  return optionHides(code, init, seen, at);
}

// Do the call's options (any argument after the command) set windowsHide?
function hides(code, args, at) {
  return topArgs(args).slice(1).some((a) => optionHides(code, a, new Set(), at));
}

// Every child_process call in one file's source whose options do not set windowsHide: [{ line, call }].
export function unhidden(src) {
  const withStrings = maskSource(src, { keepStrings: true });
  if (!/child_process/.test(withStrings)) return [];
  const code = maskSource(src);
  const { calls, spaces, fn } = bindings(withStrings);
  const lineOf = (k) => code.slice(0, k).split("\n").length;
  const found = [];
  if (!calls.size && !spaces.size) return [{ line: lineOf(withStrings.search(/child_process/)), call: "unrecognised child_process import" }];
  const names = [...calls].map((s) => s.replace(/\$/g, "\\$"));
  const alts = [];
  if (names.length) alts.push(String.raw`(?<![\w$.])(?:${names.join("|")})\s*\(`, String.raw`(?<![\w$.])(?:[\w$]+\.)?promisify\s*\(\s*(?:${names.join("|")})\s*\)\s*\(`);
  if (spaces.size) alts.push(String.raw`(?<![\w$.])(?:${[...spaces].join("|")})\s*\.\s*(?:${fn})\s*\(`);
  for (const m of code.matchAll(new RegExp(alts.join("|"), "g"))) {
    if (/function\s*\*?\s*$/.test(code.slice(Math.max(0, m.index - 20), m.index))) continue; // a declaration, not a call
    const open = m.index + m[0].length - 1;
    const close = closing(code, open);
    const args = close < 0 ? code.slice(open + 1) : code.slice(open + 1, close);
    if (!hides(code, args, m.index)) found.push({ line: lineOf(m.index), call: m[0].replace(/\s+/g, "").replace(/\($/, "") });
  }
  return found;
}

function* sources(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* sources(join(dir, e.name)); }
    else if (/\.(mjs|js|cjs)$/.test(e.name) && !/\.min\.js$/.test(e.name)) yield join(dir, e.name);
  }
}

export function scanRepo(root = ROOT) {
  const out = [];
  for (const d of DIRS) for (const file of sources(join(root, d))) {
    for (const v of unhidden(readFileSync(file, "utf8"))) out.push(`${relative(root, file).replace(/\\/g, "/")}:${v.line} ${v.call}`);
  }
  return out;
}

test("the scanner finds unhidden calls and accepts hidden ones", () => {
  const src = [
    'import { spawn, execFileSync as efs } from "node:child_process";',
    'import * as cp from "child_process";',
    'import { promisify } from "node:util";',
    "const run = promisify(cp.execFile);",
    'const opts = { stdio: "pipe", windowsHide: true };',
    "function ps(extra) { return { ...extra, windowsHide: true }; }",
    'spawn("a", ["b"]);',                                     // 7: bad
    'spawn("a", ["b"], { windowsHide: true });',
    'efs("a", [")", `${x}(`], {',                             // 9: bad, multi-line
    '  stdio: "ignore",',
    "});",
    'efs("a", [], opts);',
    'efs("a", [], ps({ cwd: "." }));',
    'cp.spawnSync("a");',                                     // 14: bad
    'await run("a", []);',                                    // 15: bad
    'await run("a", [], { windowsHide: true });',
    '// spawn("commented out");',
    'const s = "spawn(\'in a string\')";',
    "/spawn(x)/.exec(s);",
    "obj.spawn(1);",
    'spawn("a", [], (e) => { spawn("b", [], { windowsHide: true }); });', // 21: outer bad, inner fine
    "function go(o) { return spawn(\"a\", [], { ...o }); }",              // 22: bad, o is a parameter
    "const base = { ...opts, cwd: \".\" };",
    'spawn("a", ["windowsHide"], base);',
    'function a() { const [cmd, args, o] = ps({}); return spawn(cmd, args, o); }',
    'function b() { const o = { cwd: "." }; return spawn("a", [], o); }',      // 26: bad, this o does not hide
    'spawn("gui.exe", [], { windowsHide: false });',                           // a deliberate choice (a GUI program)
  ].join("\n");
  assert.deepEqual(unhidden(src).map((v) => v.line), [7, 9, 14, 15, 21, 22, 26]);
  const dynamic = 'test("x", async () => {\n  const { execFileSync } = await import("node:child_process");\n  execFileSync("git", ["status"]);\n});';
  assert.deepEqual(unhidden(dynamic).map((v) => `${v.line} ${v.call}`), ["3 execFileSync"]);
  assert.deepEqual(unhidden('const cp = require("child_process");\ncp.exec("dir");').map((v) => v.line), [2]);
});

test("every child_process call in packages/, tools/ and test/ sets windowsHide", () => {
  const bad = scanRepo();
  assert.deepEqual(bad, [], `child_process calls without windowsHide (add windowsHide: true to the options):\n${bad.join("\n")}`);
});

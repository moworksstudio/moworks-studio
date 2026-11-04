#!/usr/bin/env node
// check.mjs: a fast syntax check of the kit and the videos (one broken file breaks a render). Never runs anything.
//   node tools/check.mjs                 every .js/.mjs, .json and .py in this folder
//   node tools/check.mjs <dir|file> …    just those (e.g. videos/<slug>)
// .js files are parsed as browser scripts (and as modules when they use import/export), .mjs with `node --check`,
// .json with JSON.parse (placeholders in templates/ read as 0), .py with Python 3.12's compiler through uv. Skipped: node_modules, ex/ (synced copies),
// renders, snaps, .hyperframes, audio/takes. This is a SYNTAX check; the snapshots are the real test.
import fs from "fs";
import path from "path";
import vm from "vm";
import { spawnSync } from "child_process";
import { ROOT, which } from "./lib.mjs";

const SKIP = new Set(["node_modules", ".git", "ex", ".hyperframes", "renders", "snaps", "takes", "__pycache__"]);
const walk = (p) => {
  const st = fs.statSync(p);
  if (st.isFile()) return [p];
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => (SKIP.has(e.name) || (e.isDirectory() && e.name.startsWith(".") && e.name !== ".claude") ? [] : walk(path.join(p, e.name))));
};
const targets = process.argv.length > 2 ? process.argv.slice(2).map((a) => (fs.existsSync(path.resolve(a)) ? path.resolve(a) : path.resolve(ROOT, a))) : [ROOT];
for (const t of targets) if (!fs.existsSync(t)) (console.error(`✗ ${t} doesn't exist`), process.exit(1));
const files = [...new Set(targets.flatMap(walk))];
const rel = (f) => {
  const r = path.relative(ROOT, f);
  return r && !r.startsWith("..") && !path.isAbsolute(r) ? r : f;
};
// templates hold placeholders (__TITLE__, __W__, __DUR__ …) that new-video.mjs fills in: read them as a number
const TPL = path.join(ROOT, "templates") + path.sep;
const read = (f) => {
  const src = fs.readFileSync(f, "utf8");
  return f.startsWith(TPL) ? src.replace(/__[A-Z][A-Z0-9_]*__/g, "0") : src;
};
const errors = [];
const nodeCheck = (f) => {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) errors.push(`✗ ${rel(f)}\n${(r.stderr || "").trim()}\n`);
};

const js = files.filter((f) => /\.(m|c)?js$/.test(f));
for (const f of js) {
  if (!f.endsWith(".js")) {
    nodeCheck(f);
    continue;
  }
  try {
    new vm.Script(read(f), { filename: f }); // compiles only, as a browser <script> would
  } catch (e) {
    if (/import|export|module/i.test(e.message)) nodeCheck(f); // an ES module (e.g. a Node test script)
    else errors.push(`✗ ${rel(f)}\n${(e.stack || e.message).split("\n").slice(0, 5).join("\n")}\n`);
  }
}

const json = files.filter((f) => f.endsWith(".json"));
for (const f of json) {
  try {
    JSON.parse(read(f));
  } catch (e) {
    errors.push(`✗ ${rel(f)}\n${e.message}\n`);
  }
}

const py = files.filter((f) => f.endsWith(".py"));
if (py.length) {
  const uv = which("uv");
  if (!uv) errors.push(`✗ ${py.length} Python file(s) not checked: uv not found (run node tools/doctor.mjs)\n`);
  else {
    // compile() checks the syntax without writing __pycache__ folders into the kit
    const code = [
      "import json, sys",
      "for f in sys.argv[1:]:",
      "    try:",
      "        compile(open(f, encoding='utf-8').read(), f, 'exec')",
      "    except SyntaxError as e:",
      "        print(json.dumps({'f': f, 'line': e.lineno, 'msg': e.msg}))",
    ].join("\n");
    const r = spawnSync(uv, ["run", "--quiet", "--no-project", "--python", "3.12", "python", "-c", code, ...py], { encoding: "utf8", cwd: ROOT });
    if (r.status !== 0) errors.push(`✗ Python files not checked: uv failed\n${(r.stderr || "").trim()}\n`);
    for (const line of (r.stdout || "").split("\n").filter((l) => l.startsWith("{"))) {
      const e = JSON.parse(line);
      errors.push(`✗ ${rel(e.f)}:${e.line}\n${e.msg}\n`);
    }
  }
}

for (const e of errors) console.error(e);
const n = js.length + json.length + py.length;
console.log(
  errors.length
    ? `✗ ${errors.length} problem(s) in ${n} file(s) (${js.length} JS, ${json.length} JSON, ${py.length} Python)`
    : `✓ ${n} file(s) OK (${js.length} JS, ${json.length} JSON, ${py.length} Python)`
);
process.exit(errors.length ? 1 : 0);

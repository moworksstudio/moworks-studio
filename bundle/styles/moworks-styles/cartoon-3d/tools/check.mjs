#!/usr/bin/env node
// check.mjs — syntax-check the source with esbuild (fast; catches the typos that break every render).
//   node tools/check.mjs                 every .ts/.tsx/.js under src/
//   node tools/check.mjs <file> [file…]  just those
// This is a SYNTAX check, not a type check — the stills (tools/stills.mjs) are the real test.
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { ROOT } from "./lib.mjs";

const require = createRequire(path.join(ROOT, "package.json"));
const { transformSync } = require("esbuild");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(tsx?|jsx?|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));
const files = process.argv.length > 2 ? process.argv.slice(2) : walk(path.join(ROOT, "src"));
let bad = 0;
for (const f of files) {
  try {
    transformSync(fs.readFileSync(f, "utf8"), { loader: f.endsWith(".tsx") ? "tsx" : f.endsWith(".ts") ? "ts" : f.endsWith(".jsx") ? "jsx" : "js", sourcefile: f });
  } catch (e) {
    bad++;
    console.error(`✗ ${path.relative(ROOT, f)}\n${e.message}\n`);
  }
}
console.log(bad ? `✗ ${bad} of ${files.length} file(s) have syntax errors` : `✓ ${files.length} file(s) OK`);
process.exit(bad ? 1 : 0);

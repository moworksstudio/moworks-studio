// Module boundary rule: only packages/hf-* may import @hyperframes/* or call the hyperframes CLI.
// Usage: node tools/check-boundary.mjs [root]   exit 1 and one line per violation when the rule is broken.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.argv[2] ?? join(import.meta.dirname, "..");
const SKIP_DIRS = new Set(["node_modules", "runtime", ".git", "test-output", "dist", "bundle"]);          // bundle/: third-party sources shipped as they are
const SELF = new Set(["tools/check-boundary.mjs", "test/boundary.test.mjs"]);
const CODE = /\.(mjs|cjs|js|ts|tsx|jsx)$/;
const RULES = [
  { id: "hf-import", re: /(['"`])@hyperframes\/[^'"`]*\1/g, what: "imports @hyperframes/*" },
  { id: "hf-cli", re: /(['"`])(?:[^'"`]*[\\/])?hyperframes(?:\.cmd)?\1/g, what: "calls the hyperframes CLI" },
];

/** True when the file sits inside an hf-* adapter module (packages/hf-<name>/...). */
export function isAdapterPath(rel) {
  const parts = rel.split(/[\\/]/);
  return parts[0] === "packages" && /^hf-[a-z0-9-]+$/.test(parts[1] ?? "");
}

export function findViolations(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (SKIP_DIRS.has(name)) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!CODE.test(name)) continue;
      const rel = relative(dir, p);
      if (isAdapterPath(rel) || SELF.has(rel.split(sep).join("/"))) continue; // the rule and its own test name the patterns on purpose
      const lines = readFileSync(p, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const rule of RULES) {
          rule.re.lastIndex = 0;
          if (rule.re.test(line)) out.push({ file: rel.split(sep).join("/"), line: i + 1, rule: rule.id, what: rule.what });
        }
      });
    }
  };
  walk(dir);
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("check-boundary.mjs")) {
  const v = findViolations(root);
  for (const x of v) console.log(`${x.file}:${x.line}  ${x.what} outside packages/hf-* (${x.rule})`);
  console.log(v.length ? `boundary: ${v.length} violation(s)` : "boundary: ok");
  process.exitCode = v.length ? 1 : 0;
}

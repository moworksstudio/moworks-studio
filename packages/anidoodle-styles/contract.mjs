// G-CONTRACT: an anidoodle film's own modules hold the author's contract, read statically before the render.
// The list of forbidden calls and the comment stripping are the author's, copied from engine/tools/gate.mjs L37-45 at the pinned commit
// (https://github.com/alexgreensh/anidoodle/blob/f746cbd8a7032463bd0bc88ee8ff852599193b8c/skills/anidoodle/engine/tools/gate.mjs#L37-L45,
// Alex Greenshpun, Apache-2.0); the app scans only the project's own TypeScript (anidoodle/, boards/), never the pinned engine.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const FORBIDDEN = [
  [/Math\.random/, "Math.random"], [/\bnew Date\b/, "new Date"], [/\bDate\.now\b/, "Date.now"],
  [/performance\.now/, "performance.now"], [/\bctx\.filter\b/, "ctx.filter"], [/\.filter\s*=[^=]/, "assignment to .filter"],
  [/\bnew Image\b/, "new Image"], [/\bnew OffscreenCanvas\b/, "new OffscreenCanvas"],
  [/\bfetch\s*\(/, "fetch()"], [/XMLHttpRequest/, "XMLHttpRequest"], [/\bimportScripts\b/, "importScripts"],
  [/\blocalStorage\b/, "localStorage"], [/\bcrypto\./, "crypto.*"],
  [/from\s+["']react["']/, "react import"], [/from\s+["']remotion["']/, "remotion import"], [/pencil\.tsx/, "pencil.tsx import"],
];
// the author's stripComments, with a comment's line breaks kept so a finding names its real line
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, "")).replace(/(^|[^:])\/\/.*$/gm, "$1");

/** The project's own anidoodle modules: anidoodle/**.ts and boards/<X>/**.ts. */
function ownModules(projectDir) {
  const out = [];
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (!n.startsWith(".") && n !== "node_modules") walk(p); } else if (/\.tsx?$/.test(n)) out.push(p); } };
  walk(join(projectDir, "anidoodle")); walk(join(projectDir, "boards"));
  return out;
}

/** { id: "G-CONTRACT", blocking, pass, findings: [{ file, line, call }] }, or null when the project has no anidoodle film or board. */
export function gateContract(projectDir) {
  const files = ownModules(projectDir);
  if (!files.length) return null;
  const findings = [];
  for (const f of files) {
    const text = stripComments(readFileSync(f, "utf8"));
    for (const [re, label] of FORBIDDEN) for (const m of text.matchAll(new RegExp(re.source, "g"))) {
      const file = relative(projectDir, f).split(sep).join("/"), line = text.slice(0, m.index).split("\n").length;
      findings.push({ file, line, call: label, message: `${label} in ${file}:${line} (use rng(seed), the frame number and Film.assets)` });
    }
  }
  return { id: "G-CONTRACT", blocking: true, pass: findings.length === 0, findings };
}

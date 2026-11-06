// The characters' anatomy (owner 06/11/2026 #1254: one check, more body parts to come). First: elbows hang down (#1244, #1218; the idea of anidoodle's tools/character-check.mjs joint limits, written here for the
// Inner Voice Short skill's hero): in the film's code, each arm of `hero(x, { arms: [back, front] })` that reaches at or above its shoulder
// bends so its elbow sits under the line from shoulder to hand (the rule, config/rules/inner-voice-short §3: bend -1 when the hand is right
// of its shoulder, 1 when left). Test 42 drew most shots with `hand: [74, -190], bend: 1`: the elbow up beside the face. Read from the code
// (a hand written as lerp(a, b, t) is checked at both ends); an arm whose hand is worked out by code is not judged. A warning.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const SHOULDER = { x: [-34, 34], y: -148 }, RAISED = 30;          // hip-local; "raised": the hand at most RAISED px under the shoulder
const STYLES = new Set(["inner-voice-short"]);

/** The numbers an expression can be: lerp(a, b, t) is a and b; anything else must be plain arithmetic, or it is not judged. */
export function ends(expr) {
  const s = String(expr).trim();
  const m = /^lerp\(/.exec(s);
  if (m) {
    let depth = 0, args = [], cur = "";
    for (const ch of s.slice(5)) {
      if (ch === "(") depth++;
      if (ch === ")") { if (depth === 0) { args.push(cur); break; } depth--; }
      if (ch === "," && depth === 0) { args.push(cur); cur = ""; continue; }
      cur += ch;
    }
    if (args.length < 2) return [];
    return [...ends(args[0]), ...ends(args[1])];
  }
  if (!/^[-+*/().\d\s]+$/.test(s)) return [];
  try { const v = Function(`"use strict"; return (${s});`)(); return Number.isFinite(v) ? [v] : []; } catch { return []; }
}

/** Split "a, b" at its top-level comma. */
const pair = (s) => { let d = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === "(" || c === "[") d++; else if (c === ")" || c === "]") d--; else if (c === "," && d === 0) return [s.slice(0, i), s.slice(i + 1)]; } return null; };

/** Wrong bends in one file's text: [{ line, arm, hand: [x, y], bend, want }]. */
export function wrongElbows(text) {
  const out = [], lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/\barms\s*:\s*\[/.test(lines[i])) continue;
    let arm = 0;
    for (let j = i + 1; j < Math.min(lines.length, i + 8) && arm < 2; j++) {
      const m = /\{\s*hand:\s*\[(.*)\]\s*,\s*bend:\s*(-?1)\b/.exec(lines[j]);
      if (!m) { if (/^\s*\]/.test(lines[j])) break; continue; }
      const xy = pair(m[1]), bend = Number(m[2]);
      if (xy) {
        const xs = ends(xy[0]), ys = ends(xy[1]), sx = SHOULDER.x[arm];
        for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
          const x = xs[k], y = ys[k];
          if (y > SHOULDER.y + RAISED) continue;          // a hand hanging by the side: its elbow out is the kit's own way
          const want = x > sx ? -1 : 1;
          if (bend !== want) { out.push({ line: j + 1, arm: arm ? "front" : "back", hand: [Math.round(x), Math.round(y)], bend, want }); break; }
        }
      }
      arm++;
    }
  }
  return out;
}

const walk = (d, acc = []) => { if (!existsSync(d)) return acc; for (const n of readdirSync(d)) { const f = join(d, n); let s; try { s = statSync(f); } catch { continue; }
  if (s.isDirectory()) { if (!/^(node_modules|\.git|cache)$/.test(n)) walk(f, acc); } else if (/\.(jsx?|tsx?|mjs)$/i.test(n) && s.size < 4 << 20) acc.push(f); } return acc; };

/** Tech checks' G-ANATOMY: the characters' bodies, from the film's code. Today an Inner Voice Short film's raised arms (its elbows); nothing
 *  for any other film style yet. */
export function gateAnatomy(projectDir) {
  let style = null; try { style = JSON.parse(readFileSync(join(projectDir, ".moworks", "project.json"), "utf8")).style?.id ?? null; } catch { /* no project file */ }
  if (!STYLES.has(style)) return null;
  const found = [];
  for (const f of walk(join(projectDir, "src"))) for (const w of wrongElbows(readFileSync(f, "utf8"))) found.push({ ...w, file: relative(projectDir, f).replace(/\\/g, "/") });
  if (!found.length) return { id: "G-ANATOMY", blocking: false, pass: true, findings: [] };
  const msg = (w) => `The ${w.arm} arm reaching to [${w.hand.join(", ")}] bends its elbow up (bend ${w.bend}): with the hand ${w.want === -1 ? "right" : "left"} of its shoulder, bend ${w.want} keeps the elbow hanging under the forearm (the style's rule, §3).`;
  return { id: "G-ANATOMY", blocking: false, pass: false, warnings: found.length,
    findings: found.slice(0, 20).map((w) => ({ severity: "warning", code: "elbow", line: w.line, message: msg(w), plain: msg(w) })) };
}

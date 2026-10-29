// Make config/pins.json portable, once: every folder named with a drive letter becomes a default that works on any
// computer ({app}: this app's folder, {work}: the work folder), and this computer's own folders are kept in its local pins
// (runtime/state/local-pins.json, not in git), so nothing changes here. Env-var paths (%LOCALAPPDATA%…) stay: FFmpeg and Python are also
// found by themselves (version-manager). Usage: node tools/portable-pins.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT, setLocalPins } from "../packages/version-manager/index.mjs";

const DEFAULTS = {
  "hyperframes.registryRoot": "{app}/bundle/hf/registry",
  "hyperframes.skillsRoot": "{app}/bundle/hf/skills",
  "lemo.root": "{app}/bundle/styles/lemo-opuscar",
  "mgStyles.root": "{app}/bundle/styles/mg-styles-15",
  "anidoodle.root": "{app}/bundle/styles/anidoodle",
  "motionPrompt.root": "{app}/bundle/styles/motion-prompt",
  "characterKit.root": "{app}/bundle/styles/ClaudeAnimationBase",
  "storage.workRoot": "{app}/..",
};
const file = join(APP_ROOT, "config", "pins.json"), text = readFileSync(file, "utf8"), pins = JSON.parse(text);
let out = text;
const local = {};
for (const [k, portable] of Object.entries(DEFAULTS)) {
  const [sec, key] = k.split("."), cur = pins[sec]?.[key];
  if (typeof cur !== "string" || cur === portable) continue;
  if (/^[A-Za-z]:[\\/]/.test(cur)) local[k] = cur;          // this computer's folder: kept for it
  // replace the value in place (the file's own layout stays): the first `"key": "<cur>"` after the section's name
  const at = out.indexOf(`"${sec}": {`), q = `"${key}": ${JSON.stringify(cur)}`, i = out.indexOf(q, at);
  if (at < 0 || i < 0) { console.log(`skipped ${k}: not found as written`); continue; }
  out = out.slice(0, i) + `"${key}": ${JSON.stringify(portable)}` + out.slice(i + q.length);
  console.log(`${k}: ${cur} -> ${portable}`);
}
JSON.parse(out);
if (process.argv.includes("--dry")) { console.log("dry run: nothing written", local); process.exit(0); }
setLocalPins(local);
writeFileSync(file, out);
console.log(`local pins kept for this computer: ${Object.keys(local).length}`);

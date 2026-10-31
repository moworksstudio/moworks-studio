// A style's own frame rates, read straight from its config file with no other import, so the project service can hold a film to them
// at once (the catalog itself imports the looks library, which imports the project service: loading it lazily left a script that read a
// project right away at 60 fps for an old Brush film). Brush cartoon: config/brush-pipeline.json "fps"; What If, Lemo, mg, anidoodle: their
// own pipeline file's "fps"; an HF style: its styles.json entry's "fps". { allowed, default } or null.
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

const cache = new Map();          // file -> { stamp, json }
function readConfig(root, name) {
  const f = join(root, "config", name);
  let stamp; try { const s = statSync(f); stamp = `${s.size}:${s.mtimeMs}`; } catch { return null; }
  const hit = cache.get(f);
  if (hit?.stamp === stamp) return hit.json;
  let json = null; try { json = JSON.parse(readFileSync(f, "utf8")); } catch { /* unreadable: no rule */ }
  cache.set(f, { stamp, json });
  return json;
}
const rule = (x) => (Array.isArray(x?.allowed) && x.allowed.length ? { allowed: x.allowed.map(Number), default: Number(x.default) || Number(x.allowed[0]) } : null);

/** The style's frame-rate rule, or null when it has none. */
export function styleFpsRule(styleId, root = APP_ROOT) {
  const id = String(styleId ?? "");
  if (!id) return null;
  const file = id === "brush-cartoon" ? "brush-pipeline.json" : id === "what-if" ? "what-if-pipeline.json" : /^lemo-/.test(id) ? "lemo-pipeline.json" : /^mg-/.test(id) ? "mg-pipeline.json"
    : /^anidoodle-/.test(id) ? "anidoodle-pipeline.json" : null;
  if (file) return rule(readConfig(root, file)?.fps);
  return rule(readConfig(root, "styles.json")?.styles?.find((s) => s.id === id)?.fps);
}

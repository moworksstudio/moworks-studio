// The anidoodle media whose hand draws the author's human characters (anidoodle human characters in films). It keeps the map in
// config/anidoodle-pipeline.json "humanHands": { "<style id>": "<hand>" }; read at once (no other import), like the frame-rate rule (fps.mjs).
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

let cache = null;          // { stamp, map }
function handsMap(root) {
  const f = join(root, "config", "anidoodle-pipeline.json");
  let stamp; try { const s = statSync(f); stamp = `${s.size}:${s.mtimeMs}`; } catch { return {}; }
  if (cache?.stamp === stamp) return cache.map;
  let map = {}; try { map = JSON.parse(readFileSync(f, "utf8")).humanHands ?? {}; } catch { /* no map: no human hand */ }
  cache = { stamp, map };
  return map;
}

/** The human hand of an anidoodle style ("storybook", "marker"…), or null when its films draw no human characters. */
export function humanHandOf(styleId, root = APP_ROOT) {
  const h = handsMap(root)[String(styleId ?? "")];
  return typeof h === "string" && h ? h : null;
}

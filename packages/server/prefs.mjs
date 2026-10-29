// The UI's own settings, kept on this computer. The app serves its UI on a new port
// at every start and the browser keeps storage per address, so the UI's localStorage started empty each time: the theme, the first-start
// question, panel sizes and filters were lost. The UI mirrors its mw-* keys here (GET/POST /api/prefs) and loads them before its first
// paint; only a clean install (no file) starts empty.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const prefsFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "ui-prefs.json");
const KEY = /^mw-[\w:.\-]{1,200}$/;          // mw-pref:editor:tl-h, mw-pref:editor:quality:<project>, mw-sbnotes:<project>… (never mw-token, the session's)
const MAX = 200000;                          // one value (a project's feedback drafts at most)

export function readPrefs(root) {
  try { const j = JSON.parse(readFileSync(prefsFile(root), "utf8")); return j && typeof j.prefs === "object" && j.prefs ? j.prefs : {}; } catch { return {}; }
}

/** Set and remove keys ({ set: { key: string }, remove: [key] }); keys that are not the UI's, or values too long, are left out. */
export function updatePrefs(root, { set = {}, remove = [] } = {}) {
  const prefs = readPrefs(root);
  for (const [k, v] of Object.entries(set && typeof set === "object" ? set : {})) if (KEY.test(k) && k !== "mw-token" && typeof v === "string" && v.length <= MAX) prefs[k] = v;
  for (const k of Array.isArray(remove) ? remove : []) if (typeof k === "string") delete prefs[k];
  const f = prefsFile(root);
  if (!existsSync(dirname(f))) mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f + ".tmp", JSON.stringify({ version: 1, prefs }, null, 1) + "\n");
  renameSync(f + ".tmp", f);
  return prefs;
}

export function prefsRoutes(ctx, { r }) {
  return { routes: [
    r("GET", "/prefs", () => ({ prefs: readPrefs(ctx.root) })),
    r("POST", "/prefs", (_p, b) => ({ ok: true, keys: Object.keys(updatePrefs(ctx.root, b ?? {})).length })),
  ] };
}

// The app's own leftovers on this PC, cleaned when the launcher starts the service (the window's browser profile when it stops) (never in tests, never while anything runs: nothing
// runs yet). Only what the app made itself and makes again when needed: old render and export logs, the logs grown too long, After
// Effects work folders of exports long done, and the HyperFrames versions that are neither the current one nor the one to roll back to.
// The user's films, renders, library and models are never touched here.
import { existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { hfDir, installed, readState } from "../version-manager/index.mjs";

export const KEEP_LOGS = 200;          // render-*.log and export-*.log: the newest kept (about 300 a day were written, none ever removed)
export const LOG_MAX = 5 * 1024 * 1024;          // app.log, backup.log: past this, the older half is kept once as <name>.1
export const WORK_DAYS = 7;          // runtime/work/ae/<film>, _ref/<film>, style-ae/: a week after the export

const mtime = (f) => { try { return statSync(f).mtimeMs; } catch { return 0; } };

/** Old run logs: the newest KEEP_LOGS render/export logs stay; app.log and backup.log rotate once past LOG_MAX. Returns the files removed. */
export function pruneLogs(dir, { keep = KEEP_LOGS } = {}) {
  let names = [];
  try { names = readdirSync(dir); } catch { return 0; }
  const runs = names.filter((n) => /^(render|export)-\d+\.log$/.test(n)).sort((a, b) => Number(b.replace(/\D/g, "")) - Number(a.replace(/\D/g, "")));
  let n = 0;
  for (const f of runs.slice(keep)) { try { rmSync(join(dir, f), { force: true }); n++; } catch { /* open: the next start */ } }
  for (const f of ["app.log", "backup.log"]) {
    const p = join(dir, f);
    try { if (statSync(p).size > LOG_MAX) renameSync(p, `${p}.1`); } catch { /* none, or written to right now */ }
  }
  return n;
}

/** After Effects work folders not touched for WORK_DAYS (the export's .aep and footage are in its own output folder). */
export function pruneWork(workDir, { days = WORK_DAYS, now = Date.now() } = {}) {
  const out = [];
  const old = (p) => now - mtime(p) > days * 864e5;
  for (const base of [join(workDir, "ae"), join(workDir, "ae", "_ref"), join(workDir, "style-ae")]) {
    let names = [];
    try { names = readdirSync(base); } catch { continue; }
    for (const n of names) {
      const p = join(base, n);
      if (n === "_ref" || !statSync(p).isDirectory() || !old(p)) continue;
      try { rmSync(p, { recursive: true, force: true }); out.push(p); } catch { /* AE still holds a file */ }
    }
  }
  return out;
}

/** HyperFrames versions installed beside the current and the previous one (rollback): removed. Returns the versions removed. */
export async function pruneHf(root) {
  const s = readState(root);
  if (!s.current) return [];
  const extra = installed(root).filter((v) => v !== s.current && v !== s.previous);
  const done = [];
  for (const v of extra) {
    // off the server's thread (a version is some 8,000 files); version-manager's remove() is the same, in one go
    try { await rm(hfDir(v, root), { recursive: true, force: true }); done.push(v); } catch { /* in use: the next start */ }
  }
  return done;
}

// What Edge or Chrome keep in the app window's own profile that a window on this computer's own pages never uses: the components it
// downloads for the open web (shopping, wallet, provenance, entity and language models, the component caches), 600 MB and thousands
// of files. The window starts with component updates off (cli.mjs), so they do not come back.
const COMPONENTS = ["component_crx_cache", "extensions_crx_cache", "ProvenanceData", "ProvenanceDataAllowList", "ProvenanceDataTensors", "Edge Wallet",
  "Edge Shopping", "Edge Entity Extraction", "EdgeLanguageDetectionModel", "OnDeviceHeadSuggestModel", "Edge Signal Triggers", "Edge Sidebar",
  "EdgeOptimizationGuideModelsManifest", "Edge3pSerp", "Nurturing", "Typosquatting", join("Default", "EdgeCoupons")];
/** When the app stops (cli.mjs quit): the components above go, when no browser holds the profile any more (its lockfile cannot be
 *  removed while one runs). */
export async function trimWindowProfile(profile) {
  if (!existsSync(profile)) return [];
  try { rmSync(join(profile, "lockfile"), { force: true }); } catch { return []; }          // a window is open on it: next time
  const out = [];
  for (const rel of COMPONENTS) {
    const p = join(profile, rel);
    if (!existsSync(p)) continue;
    try { await rm(p, { recursive: true, force: true }); out.push(rel); } catch { /* in use */ }
  }
  return out;
}

/** Everything above, once, off the server's way. */
export async function housekeep(root, { log = () => {} } = {}) {
  const runtime = join(root, "runtime");
  const logs = pruneLogs(join(runtime, "logs"));
  const work = pruneWork(join(runtime, "work"));
  const hf = await pruneHf(root);
  if (logs || work.length || hf.length) log(`[housekeeping] ${logs} old log(s), ${work.length} work folder(s), HyperFrames ${hf.join(", ") || "none"} removed`);
  return { logs, work: work.length, hf };
}

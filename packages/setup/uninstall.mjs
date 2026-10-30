// Uninstall Moworks Studio (owner 30/10, after the Moworks Motion kit's uninstall.bat: one question, everything the install put on this
// PC to the Recycle Bin, never a permanent delete, the app's folder last, a table of what went). What the app put on the PC lives in
// two places: its own folder (the code, node_modules, runtime/: HyperFrames, Chromium, the app window's browser profile, the work files,
// the settings and keys of this PC) and, beside it in the work folder, the models it downloaded, the films and the user's library.
// Git, Node.js, Python, FFmpeg and Claude Code are the computer's own (other programs use them): kept.
// The app folder goes first only when nothing in it is the user's own work: a clone with changed files or commits that are not on
// GitHub (the maintainer's copy) is kept, with the reason. The models and the films with the user's library go only when asked for.
// The work folder itself is never removed (it may be the user's own Documents), nor a film the user opened from another folder.
// The removal runs from a copy of tools/uninstall-run.mjs in the temp folder, in its own window, once the app has stopped.
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { projectsRoot, workRoot } from "../project-service/index.mjs";
import { dataRoot } from "../revisions/drive.mjs";
import { modelsRoot } from "../voice/asr.mjs";

/** Bytes under a folder (links not followed), counted without holding the server's thread. */
async function sizeOf(dir) {
  let total = 0;
  const walk = async (d) => {
    let ents; try { ents = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) await walk(p); else { try { total += (await lstat(p)).size; } catch { /* gone */ } }
    }
  };
  await walk(dir);
  return total;
}

/** Why the app's folder must stay (the user's own work in it), or null when it can go. */
export function appKeepReason(root = APP_ROOT) {
  if (!existsSync(join(root, ".git"))) return null;
  const git = (...a) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    const changed = git("status", "--porcelain").split(/\r?\n/).filter(Boolean).length;
    if (changed) return `${changed} changed file(s) here are not on GitHub`;
    let ahead;
    try { ahead = Number(git("rev-list", "--count", "@{u}..HEAD")); } catch { return "this copy is not a plain clone of the app's GitHub repo (no upstream)"; }
    if (ahead > 0) return `${ahead} commit(s) here are not on GitHub`;
  } catch { return "git could not read this folder"; }
  return null;
}

/** What an uninstall removes and keeps, with sizes: { app: { path, size, keep }, models: { path, size }, films: [{ path, size }],
 *  kept: [words] }. Folders that are not there are left out. */
export async function uninstallPlan(root = APP_ROOT) {
  const work = workRoot(root), app = resolve(root);
  const filmDirs = [...new Set([projectsRoot(root), join(work, "library"), dataRoot(root)].map((p) => resolve(p)))]
    .filter((p) => existsSync(p) && !app.startsWith(p) && p !== resolve(work));
  const models = resolve(modelsRoot(root));
  return {
    app: { path: app, size: await sizeOf(app), keep: appKeepReason(root) },
    models: existsSync(models) ? { path: models, size: await sizeOf(models) } : null,
    films: await Promise.all(filmDirs.map(async (p) => ({ path: p, size: await sizeOf(p) }))),
    kept: ["Git, Node.js, Python, FFmpeg and Claude Code (other programs use them)", `the work folder itself (${work})`, "films opened from other folders",
      "the backups on Google Drive"],
  };
}

/** Start the removal in its own window and return; the caller stops the app (the window waits for `waitPid` to end).
 *  choice: { models, films } (booleans). */
export async function startUninstall(root = APP_ROOT, { models = false, films = false, waitPid = null } = {}) {
  const plan = await uninstallPlan(root);
  const items = [
    ...(films ? plan.films.map((f) => ({ label: f.path.endsWith("library") ? "Your library (characters, motions)" : f.path.endsWith("data") ? "The app's records of films on Drive" : "Your films", path: f.path })) : []),
    ...(models && plan.models ? [{ label: "The downloaded models", path: plan.models.path }] : []),
    { label: "Moworks Studio (the app, HyperFrames, Chromium, its settings and keys)", path: plan.app.path, keep: plan.app.keep },
  ];
  const kept = [...plan.kept, ...(films ? [] : ["your films and your library"]), ...(models ? [] : ["the downloaded models"])];
  const tmp = tmpdir(), stamp = Date.now();
  const script = join(tmp, `moworks-uninstall-${stamp}.mjs`), planFile = join(tmp, `moworks-uninstall-${stamp}.json`);
  copyFileSync(join(root, "tools", "uninstall-run.mjs"), script);
  writeFileSync(planFile, JSON.stringify({ items, kept, waitPid }, null, 2));
  // its own console window (the user asked for it and reads the table at the end), started from the temp folder so the app's
  // folder is free to go: the cmd that runs `start` is hidden, the window `start` opens is not
  spawn("cmd.exe", ["/c", "start", "\"Moworks Studio - Uninstall\"", "/d", tmp, "cmd.exe", "/c", `node "${script}" "${planFile}" & pause`],
    { cwd: tmp, detached: true, stdio: "ignore", windowsVerbatimArguments: true, windowsHide: true }).unref();
  return { started: true, items: items.map(({ label, path, keep }) => ({ label, path, keep: keep ?? null })), kept };
}

// Backups of the app to `storage.backupRoot` when this computer sets one (its local pins); off otherwise. Always a clean backup: no
// project, no model. Only the app is backed up: its git history is written as ONE file (`git bundle`, the whole history) into the backup
// folder, so a dead disk loses nothing that was committed. Projects (and the user's assets in them) and models are never backed up; a
// project folder is self-contained, so copying it is how a film moves. A bundle is written only when the app has changed since the last
// backup. One file is safe on a synced drive such as Google Drive (no thousands of small files, nothing its locking can corrupt).
// Restore: backup/README.md.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import * as rev from "../revisions/index.mjs";

const git = (dir, args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };

export function backupRoot(root = APP_ROOT) {
  if (process.env.MW_BACKUP_ROOT) return process.env.MW_BACKUP_ROOT;    // tests
  const r = loadPins(root).storage?.backupRoot;
  return r ? expandEnv(r) : null;
}

/** The restore note, with this computer's app folder. */
const README = (app) => `# Moworks Studio backups

Written by the app (its whole git history in one file). Nothing here is used while the app runs. Only the app is backed up: projects
(with the user's assets) and models never are. A project folder carries everything it needs: copy it to move a film.

| File | What |
|---|---|
| app.bundle | the app's source code (${app}) |
| index.json | when it was written, and its revision |

Restore after a disk failure (Git for Windows installed):

    git clone "app.bundle" "${app}"

Then in ${app}: \`npm install\`, \`npm run hf -- install <version>\` (HyperFrames, Chromium), and start Moworks Studio.bat.
Not in the backups (re-installed or downloaded again): node_modules, app\\runtime (HyperFrames, Chromium, work files), models, and every
project.
`;

function writeBundle(dir, dest) {
  const tmp = mkdtempSync(join(tmpdir(), "mw-bundle-"));
  try {
    const f = join(tmp, "repo.bundle");
    git(dir, ["bundle", "create", f, "--all"]);
    git(dir, ["bundle", "verify", f]);
    mkdirSync(join(dest, ".."), { recursive: true });
    copyFileSync(f, dest + ".tmp");
    renameSync(dest + ".tmp", dest);
    return statSync(dest).size;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

export function status(root = APP_ROOT) {
  const base = backupRoot(root);
  if (!base) return { configured: false };
  return { configured: true, root: base, reachable: existsSync(join(base, "..")), app: readJson(join(base, "index.json"), {}).app ?? null };
}

/** Back up the app if it changed since the last backup. Returns { written, rev, size?, skipped? }. */
export function backupApp(root = APP_ROOT) {
  const base = backupRoot(root);
  if (!base) return { written: false, skipped: "no backup folder configured" };
  if (!existsSync(join(base, ".."))) return { written: false, skipped: `backup drive not reachable: ${base}` };
  mkdirSync(base, { recursive: true });
  const head = rev.head(root);
  if (!head) return { written: false, skipped: "nothing committed yet" };
  const f = join(base, "index.json"), dest = join(base, "app.bundle");
  const prev = readJson(f, {}).app;
  if (prev?.rev === head && existsSync(dest)) return { written: false, rev: head, skipped: "unchanged" };
  const entry = { rev: head, at: new Date().toISOString(), size: writeBundle(root, dest), path: root };
  writeFileSync(f, JSON.stringify({ app: entry }, null, 2) + "\n");
  const readme = join(base, "README.md");
  const text = README(root);
  if (!existsSync(readme) || readFileSync(readme, "utf8") !== text) writeFileSync(readme, text);
  return { written: true, ...entry };
}

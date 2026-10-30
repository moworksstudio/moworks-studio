// Backups of the app to `storage.backupRoot` when this computer sets one (its local pins); off otherwise. Always a clean backup: no
// project, no model. The app's git history is written as ONE file (`git bundle`, the whole history) into the backup folder, so a dead
// disk loses nothing that was committed; the user's characters (library/characters: the ones made in the app, their sheets and walks,
// owner 30/10) as ONE archive too (Windows' own tar.exe). Projects (and the user's assets in them) and models are never backed up; a
// project folder is self-contained, so copying it is how a film moves, and a model downloads again. Each is written only when it has
// changed since the last backup. One file each is safe on a synced drive such as Google Drive (no thousands of small files, nothing its
// locking can corrupt). Restore: backup/README.md.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import * as rev from "../revisions/index.mjs";
import { mediaRoot as charactersRoot } from "../character-kit/index.mjs";
import { tarPath } from "../project-service/archive.mjs";

const git = (dir, args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };

export function backupRoot(root = APP_ROOT) {
  if (process.env.MW_BACKUP_ROOT) return process.env.MW_BACKUP_ROOT;    // tests
  const r = loadPins(root).storage?.backupRoot;
  return r ? expandEnv(r) : null;
}

/** The restore note, with this computer's app and characters folders. */
const README = (app, chars) => `# Moworks Studio backups

Written by the app: its whole git history in one file, and your characters in one archive. Nothing here is used while the app runs.
Projects (with the user's assets) and models are never backed up. A project folder carries everything it needs: copy it to move a film.

| File | What |
|---|---|
| app.bundle | the app's source code (${app}) |
| characters.tar | your characters: the ones made in the app, with their sheets and walks (${chars}) |
| index.json | when each was written, and the app's revision |

Restore after a disk failure (Git for Windows installed):

    git clone "app.bundle" "${app}"
    mkdir "${chars}"
    tar -xf "characters.tar" -C "${chars}"

Then in ${app}: \`npm install\`, \`npm run hf -- install <version>\` (HyperFrames, Chromium), and start Moworks Studio.bat.
Not in the backups (re-installed or downloaded again): node_modules, app\\runtime (HyperFrames, Chromium, work files), models, and every
project.
`;
const writeReadme = (base, root) => {
  const readme = join(base, "README.md"), text = README(root, charactersRoot(root));
  if (!existsSync(readme) || readFileSync(readme, "utf8") !== text) writeFileSync(readme, text);
};

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
  const i = readJson(join(base, "index.json"), {});
  return { configured: true, root: base, reachable: existsSync(join(base, "..")), app: i.app ?? null, characters: i.characters ?? null };
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
  writeFileSync(f, JSON.stringify({ ...readJson(f, {}), app: entry }, null, 2) + "\n");
  writeReadme(base, root);
  return { written: true, ...entry };
}

/** Every file under a folder with its size and time, as one signature: what changed since the last backup. */
function signature(dir) {
  const h = createHash("sha1");
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.isFile()) { const s = statSync(p); h.update(`${relative(dir, p)}\0${s.size}\0${Math.round(s.mtimeMs)}\n`); }
  } };
  walk(dir);
  return h.digest("hex");
}
/** Back up the user's characters (library/characters) as one archive if they changed since the last backup. Returns { written, size?,
 *  files?, skipped? }. */
export function backupCharacters(root = APP_ROOT) {
  const base = backupRoot(root);
  if (!base) return { written: false, skipped: "no backup folder configured" };
  if (!existsSync(join(base, ".."))) return { written: false, skipped: `backup drive not reachable: ${base}` };
  const src = charactersRoot(root);
  if (!existsSync(src) || !readdirSync(src).length) return { written: false, skipped: "no characters yet" };
  mkdirSync(base, { recursive: true });
  const f = join(base, "index.json"), dest = join(base, "characters.tar"), sig = signature(src);
  const prev = readJson(f, {}).characters;
  if (prev?.signature === sig && existsSync(dest)) return { written: false, skipped: "unchanged" };
  const tmp = mkdtempSync(join(tmpdir(), "mw-chars-"));
  try {
    const t = join(tmp, "characters.tar");
    execFileSync(tarPath(), ["-cf", t, "-C", src, "."], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const files = execFileSync(tarPath(), ["-tf", t], { windowsHide: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split(/\r?\n/).filter((l) => l && !l.endsWith("/")).length;
    copyFileSync(t, dest + ".tmp");
    renameSync(dest + ".tmp", dest);
    const entry = { at: new Date().toISOString(), size: statSync(dest).size, files, signature: sig, path: src };
    writeFileSync(f, JSON.stringify({ ...readJson(f, {}), characters: entry }, null, 2) + "\n");
    writeReadme(base, root);
    return { written: true, ...entry };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// Projects on Google Drive. Allowed, with the kit's own
// safeguard: the project's git history lives on this PC (<data>\project-git\<name>-<hash>.git) and the project holds a
// `.git` file that points there (`gitdir: …`), as the kit's Drive folders pointed at a local git folder. The film files sync with Drive;
// the history (many small files that change at every commit) does not. Drive for desktop has no ignore list and its drive takes no
// junctions, so Studio's caches and .moworks/cache stay in the folder.
import { createHash } from "node:crypto";
import { execFile, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { workRoot } from "../project-service/index.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";

const labels = new Map();
/** The volume label of a drive letter (Drive for desktop names its drive "… - Google Drive"); cached. */
function label(letter) {
  if (!labels.has(letter)) {
    let l = "";
    try { l = spawnSync("cmd", ["/c", `vol ${letter}:`], { encoding: "utf8", windowsHide: true, timeout: 5000 }).stdout ?? ""; } catch { /* no such drive */ }
    labels.set(letter, l);
  }
  return labels.get(letter);
}

/** Is this folder synced by Google Drive? (its drive is Drive for desktop's, or a Drive folder name is in the path; MW_DRIVE_PATHS: tests) */
export function isDrivePath(dir) {
  const p = resolve(String(dir ?? ""));
  for (const pre of (process.env.MW_DRIVE_PATHS ?? "").split(";").filter(Boolean)) if (p.toLowerCase().startsWith(resolve(pre).toLowerCase())) return true;
  if (/[\\/](My Drive|Shared drives|Other computers|Drive của tôi|Bộ nhớ dùng chung|Máy tính khác)([\\/]|$)/i.test(p)) return true;
  const m = /^([a-z]):/i.exec(p);
  return !!m && /google drive/i.test(label(m[1].toUpperCase()));
}

export const dataRoot = (root = APP_ROOT) => (process.env.MW_DATA_DIR ? resolve(process.env.MW_DATA_DIR) : join(workRoot(root), "data"));
/** Where a Drive project's history lives on this PC: one repository per project folder. */
export function gitStoreFor(dir, root = APP_ROOT) {
  const p = resolve(dir);
  const name = basename(p).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
  return join(dataRoot(root), "project-git", `${name}-${createHash("sha1").update(p.toLowerCase()).digest("hex").slice(0, 8)}.git`);
}

/** The repository a project uses: { kind: "none" | "folder" | "file", gitdir } (a `.git` file points elsewhere). */
export function gitKind(dir) {
  const g = join(dir, ".git");
  if (!existsSync(g)) return { kind: "none", gitdir: null };
  if (statSync(g).isDirectory()) return { kind: "folder", gitdir: g };
  const m = /^gitdir:\s*(.+)$/m.exec(readFileSync(g, "utf8"));
  return { kind: "file", gitdir: m ? resolve(dir, m[1].trim()) : null };
}

/** A Drive project's real .git folder moved to this PC (only with the user's OK): copied, checked, then the folder on Drive is replaced
 *  by a `.git` file. Returns the new place. */
export function moveGitOut(dir, root = APP_ROOT) {
  const k = gitKind(dir);
  if (k.kind !== "folder") throw Object.assign(new Error("This project has no .git folder to move"), { code: "INVALID" });
  const dest = gitStoreFor(dir, root);
  if (existsSync(dest)) throw Object.assign(new Error(`A history is already kept at ${dest}`), { code: "CONFLICT" });
  const head = (gd) => spawnSync("git", [`--git-dir=${gd}`, "rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).stdout.trim();
  const before = head(k.gitdir);
  mkdirSync(join(dest, ".."), { recursive: true });
  cpSync(k.gitdir, dest, { recursive: true });
  if (head(dest) !== before) { rmSync(dest, { recursive: true, force: true }); throw Object.assign(new Error("The copied history does not match; nothing was moved"), { code: "CONFLICT" }); }
  rmSync(k.gitdir, { recursive: true, force: true });
  writeFileSync(join(dir, ".git"), `gitdir: ${dest.replace(/\\/g, "/")}\n`);
  return dest;
}
/** moveGitOut beside the server's thread (the history's copy and git's checks; T22-5). The server runs it in the project's git queue. */
export async function moveGitOutAsync(dir, root = APP_ROOT) {
  const k = gitKind(dir);
  if (k.kind !== "folder") throw Object.assign(new Error("This project has no .git folder to move"), { code: "INVALID" });
  const dest = gitStoreFor(dir, root);
  if (existsSync(dest)) throw Object.assign(new Error(`A history is already kept at ${dest}`), { code: "CONFLICT" });
  const head = (gd) => new Promise((ok) => execFile("git", [`--git-dir=${gd}`, "rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }, (_e, out) => ok(String(out ?? "").trim())));
  const before = await head(k.gitdir);
  mkdirSync(join(dest, ".."), { recursive: true });
  await cp(k.gitdir, dest, { recursive: true });
  if ((await head(dest)) !== before) { await rm(dest, { recursive: true, force: true }); throw Object.assign(new Error("The copied history does not match; nothing was moved"), { code: "CONFLICT" }); }
  await rm(k.gitdir, { recursive: true, force: true });
  writeFileSync(join(dir, ".git"), `gitdir: ${dest.replace(/\\/g, "/")}\n`);
  return dest;
}

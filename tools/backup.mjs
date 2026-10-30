// node tools/backup.mjs [--app]: back up the app (its git history, one file on Drive) and the user's characters (one archive); --app:
// the app only. Projects and models are never backed up.
// Run by the git post-commit hook (tools/git-hooks: --app), by the app's server (at start and from Settings), and by hand.
import { backupApp, backupCharacters } from "../packages/backup/index.mjs";

const say = (what, r) => console.log(`${new Date().toISOString()} ${what}: ${r.written ? `backed up (${(r.size / 1e6).toFixed(1)} MB${r.rev ? `, ${r.rev.slice(0, 7)}` : `, ${r.files} files`})` : r.skipped}`);
const jobs = [["app", backupApp], ...(process.argv.includes("--app") ? [] : [["characters", backupCharacters]])];
for (const [what, fn] of jobs) {
  try { say(what, fn()); } catch (e) { console.error(`${new Date().toISOString()} ${what} backup failed: ${e.message}`); process.exitCode = 1; }
}

// node tools/backup.mjs: back up the app (its git history, one file on Drive). Projects and models are never backed up.
// Run by the git post-commit hook (tools/git-hooks), by the app's server (at start and from Settings), and by hand.
import { backupApp } from "../packages/backup/index.mjs";

const say = (what, r) => console.log(`${new Date().toISOString()} ${what}: ${r.written ? `backed up (${(r.size / 1e6).toFixed(1)} MB, ${r.rev.slice(0, 7)})` : r.skipped}`);
try {
  say("app", backupApp());
} catch (e) { console.error(`${new Date().toISOString()} backup failed: ${e.message}`); process.exitCode = 1; }

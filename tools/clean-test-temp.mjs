// npm test's first step (pretest): the temporary folders earlier runs of the suite left in the system's temp folder (mw-agent-…,
// mw-brush-claude-…: a test makes one with mkdtemp and never removes it; 465 folders, 1.7 GB and 64,804 files after two weeks).
// Folders older than 12 hours go, so a suite running right now in another checkout keeps its own. The app's own temporary folders
// (mw-hf-page-, mw-bundle-…) are removed by the app when it is done with them; a stale one goes too. And HyperFrames' own records in the
// test fixtures (test/fixtures/**/.hyperframes: a check's artifacts each run, out of git, 1,270 files after two weeks).
import { readdirSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const AGE_MS = 12 * 3600 * 1000;
const base = tmpdir(), now = Date.now();
const old = readdirSync(base).filter((n) => /^mw-/.test(n)).map((n) => join(base, n)).filter((p) => {
  try { const s = statSync(p); return s.isDirectory() && now - s.mtimeMs > AGE_MS; } catch { return false; }
});
const done = await Promise.all(old.map((p) => rm(p, { recursive: true, force: true }).then(() => 1, () => 0)));
const n = done.reduce((a, b) => a + b, 0);
if (n) console.log(`Removed ${n} temporary folder(s) of earlier test runs.`);

const fixtures = fileURLToPath(new URL("../test/fixtures/", import.meta.url));
const hfDirs = [];
const walk = (d, depth) => { if (depth > 3) return; let names = []; try { names = readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of names) if (e.isDirectory()) { if (e.name === ".hyperframes") hfDirs.push(join(d, e.name)); else walk(join(d, e.name), depth + 1); } };
walk(fixtures, 0);
await Promise.all(hfDirs.map((p) => rm(p, { recursive: true, force: true }).catch(() => {})));

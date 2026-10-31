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
import { TEST_STAGE } from "../packages/project-service/shared-stage.mjs";

const AGE_MS = 12 * 3600 * 1000;
const base = tmpdir(), now = Date.now();
const stale = (p) => { try { const s = statSync(p); return s.isDirectory() && now - s.mtimeMs > AGE_MS; } catch { return false; } };
const list = (d) => { try { return readdirSync(d).map((n) => join(d, n)); } catch { return []; } };
// the tests' shared stage stays, a suite in another checkout may be reading it: only the sets no test touched for that long go (each is touched when used)
const old = [...list(base).filter((p) => /^mw-/.test(p.slice(base.length + 1)) && p.slice(base.length + 1) !== TEST_STAGE).filter(stale),
  ...list(join(base, TEST_STAGE)).flatMap(list).filter(stale)];
const done = await Promise.all(old.map((p) => rm(p, { recursive: true, force: true }).then(() => 1, () => 0)));
const n = done.reduce((a, b) => a + b, 0);
if (n) console.log(`Removed ${n} temporary folder(s) of earlier test runs.`);

const fixtures = fileURLToPath(new URL("../test/fixtures/", import.meta.url));
const hfDirs = [];
const walk = (d, depth) => { if (depth > 3) return; let names = []; try { names = readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of names) if (e.isDirectory()) { if (e.name === ".hyperframes") hfDirs.push(join(d, e.name)); else walk(join(d, e.name), depth + 1); } };
walk(fixtures, 0);
await Promise.all(hfDirs.map((p) => rm(p, { recursive: true, force: true }).catch(() => {})));

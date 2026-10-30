// npm test's last step (posttest, only after a run that passed): what the suite wrote into test-output/ goes (renders, films, logs of
// each test: 7,000 files and half a gigabyte after a few runs, owner 30/10), except golden/, the reference renders the suite compares
// against (never removed). A run that failed keeps its output to look at; the next passing run clears it.
import { readdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../test-output/", import.meta.url));
let names = []; try { names = readdirSync(out); } catch { /* no output yet */ }
const gone = await Promise.all(names.filter((n) => n !== "golden").map((n) => rm(join(out, n), { recursive: true, force: true }).then(() => 1, () => 0)));
const n = gone.reduce((a, b) => a + b, 0);
if (n) console.log(`Cleared ${n} item(s) of test output (golden/ kept).`);

// node tools/uninstall.mjs [--models] [--films] [--yes]: uninstall Moworks Studio when the app cannot open its Settings (Settings ›
// Update › Uninstall does the same). Says what goes and what stays, asks once, stops the app if it runs, then the removal runs in its
// own window from the temp folder (packages/setup/uninstall.mjs). --models, --films: those go too; --yes: no question.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join } from "node:path";
import { APP_ROOT } from "../packages/version-manager/index.mjs";
import { startUninstall, uninstallPlan } from "../packages/setup/uninstall.mjs";

const has = (f) => process.argv.includes(f);
const gb = (b) => `${(b / 1e9).toFixed(1)} GB`;
const plan = await uninstallPlan(APP_ROOT);
console.log("Uninstall Moworks Studio: everything below goes to the Recycle Bin (nothing is deleted for good).\n");
console.log(`  The app, HyperFrames, Chromium, its settings and keys: ${plan.app.path} (${gb(plan.app.size)})${plan.app.keep ? `\n    kept: ${plan.app.keep}` : ""}`);
if (plan.models) console.log(`  The downloaded models: ${has("--models") ? "go" : "stay (add --models)"} (${gb(plan.models.size)})`);
if (plan.films.length) console.log(`  Your films and library: ${has("--films") ? "GO" : "stay (add --films)"} (${gb(plan.films.reduce((a, f) => a + f.size, 0))})`);
console.log(`  Kept: ${plan.kept.join("; ")}\n`);
if (!has("--yes")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("Uninstall Moworks Studio now? (y/N) ")).trim().toLowerCase();
  rl.close();
  if (a !== "y" && a !== "yes") { console.log("Nothing was removed."); process.exit(0); }
}
// a running app stops first (its own Exit), and the removal waits for it
let waitPid = null;
try {
  const st = JSON.parse(readFileSync(join(APP_ROOT, "runtime", "state", "app.json"), "utf8"));
  process.kill(st.pid, 0);
  await fetch(`http://127.0.0.1:${st.port}/api/app/exit`, { method: "POST", headers: { "X-MW-Token": st.token }, signal: AbortSignal.timeout(5000) }).catch(() => {});
  waitPid = st.pid;
} catch { /* not running */ }
await startUninstall(APP_ROOT, { models: has("--models"), films: has("--films"), waitPid });
console.log("The removal runs in its own window now.");

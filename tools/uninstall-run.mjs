// Moworks Studio's uninstall, run from a copy in the temp folder (packages/setup/uninstall.mjs starts it in its own window): waits for
// the app to stop, moves each item to the Recycle Bin in turn, the app's folder last (Windows' own dialog asks before it deletes for good
// anything too big for the bin: nothing goes without asking), then says what went and what stayed. Node's standard library only: the
// app's folder is one of the things that go. MW_UNINSTALL_DRY=1: say what would go, move nothing (tests).
// node uninstall-run.mjs <plan.json>   plan: { items: [{ label, path, keep? }], kept: [words], waitPid? }
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const dry = process.env.MW_UNINSTALL_DRY === "1";
const planFile = process.argv[2];
const plan = JSON.parse(readFileSync(planFile, "utf8"));

function recycle(path) {
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($env:MW_GONE, 'AllDialogs', 'SendToRecycleBin')"],
  { env: { ...process.env, MW_GONE: path }, stdio: ["ignore", "inherit", "pipe"], windowsHide: false });
}

console.log("Moworks Studio - Uninstall\n");
if (plan.waitPid && !dry) {
  process.stdout.write("Waiting for the app to close");
  const t0 = Date.now();
  while (alive(plan.waitPid) && Date.now() - t0 < 60000) { process.stdout.write("."); await sleep(500); }
  console.log("");
  await sleep(2000);          // the app window lets go of its files
}
const rows = [];
let ok = true;
for (const it of plan.items) {
  if (it.keep) { rows.push([it.label, `kept: ${it.keep}`]); continue; }
  if (!existsSync(it.path)) { rows.push([it.label, "not on this computer"]); continue; }
  if (dry) { rows.push([it.label, `would go to the Recycle Bin (${it.path})`]); continue; }
  console.log(`Moving to the Recycle Bin: ${it.path}`);
  let done = false;
  for (let i = 0; i < 3 && !done; i++) {
    try { recycle(it.path); done = !existsSync(it.path); } catch (e) {
      if (/cancel/i.test(String(e.stderr ?? e.message))) { rows.push([it.label, "kept: you cancelled"]); done = null; break; }
      await sleep(2000);
    }
  }
  if (done === true) rows.push([it.label, "moved to the Recycle Bin"]);
  else if (done === false) { ok = false; rows.push([it.label, `could not be moved: close the programs that use it, then run tools\\uninstall.bat (${it.path})`]); }
}
const w = Math.max(...rows.map(([a]) => a.length));
console.log("");
for (const [a, b] of rows) console.log(`  ${a.padEnd(w)}  ${b}`);
console.log(`  ${"Kept".padEnd(w)}  ${plan.kept.join("; ")}`);
console.log(`\n${ok ? "Done. To delete these files for good, empty the Recycle Bin." : "Some items were not removed (see above)."}`
  + (dry ? " (a dry run: nothing was moved)" : "") + "\nTo install again: clone the app's repository and start Moworks Studio.bat.\n");
try { rmSync(planFile, { force: true }); if (!dry) rmSync(process.argv[1], { force: true }); } catch { /* the temp folder keeps them */ }
process.exitCode = ok ? 0 : 1;

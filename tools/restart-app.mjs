// After an update (Settings › Update): waits for the old service to end, then starts the app again the way the launcher does
// (tools/start-hidden.vbs, which opens a new app window). Started detached by the service just before it stops.
// node tools/restart-app.mjs <pid of the old service>
import { spawn } from "node:child_process";
import { join } from "node:path";

const pid = Number(process.argv[2]);
const app = join(import.meta.dirname, "..");
const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
const until = Date.now() + 60000;
while (pid && alive() && Date.now() < until) await new Promise((r) => setTimeout(r, 250));
spawn("wscript.exe", ["//nologo", join(app, "tools", "start-hidden.vbs")], { cwd: app, detached: true, stdio: "ignore", windowsHide: true }).unref();

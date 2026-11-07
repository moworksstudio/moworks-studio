// Stopping a child process and every process it started, one way for the whole app (audit/112 2.11, its second look r2.1): Claude Code's
// Bash, HyperFrames, a browser, FFmpeg, Python, winget, After Effects' scripts. Imports nothing of the app, so any module can use it.
import { spawnSync } from "node:child_process";

/** Stop a run and every process it started: the tree, never the run alone. child: anything with a pid (a ChildProcess). */
export function killTree(child) {
  if (!child?.pid) return;
  try { spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); } catch { try { child.kill?.(); } catch { /* gone */ } }
}

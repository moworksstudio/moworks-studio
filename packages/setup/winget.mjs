// winget, Windows' own package manager, installs the two programs the app needs that are not its own: FFmpeg 9.0 and Python 3.12,
// for this user only (no administrator), with the same lines the install guide gives. Set up's one Install runs them (owner 30/10: no
// line to copy when the app can do it); the app finds both where winget puts them (pins.ffmpeg.dir, pins.python.exe). Without winget
// (an older Windows 10) the first-run screen shows each line to copy instead. MW_NO_WINGET: never run it (tests).
import { spawn, spawnSync } from "node:child_process";

export const PACKAGES = {
  ffmpeg: (version) => ["install", "-e", "--id", "Gyan.FFmpeg", "--version", version],
  python: () => ["install", "-e", "--id", "Python.Python.3.12", "--scope", "user"],
};
// what each download weighs on the first-run line (MB): FFmpeg's full build, Python's installer
export const MB = { ffmpeg: 210, python: 30 };
const QUIET = ["--silent", "--disable-interactivity", "--accept-package-agreements", "--accept-source-agreements"];

let have = null;
/** winget answers on this computer (asked once a process). */
export function hasWinget() {
  if (process.env.MW_NO_WINGET) return false;
  if (have === null) { const r = spawnSync("winget", ["--version"], { windowsHide: true, timeout: 20000, encoding: "utf8" }); have = r.status === 0; }
  return have;
}

/** Run one winget install, its lines to onLine; resolves with its exit code (winget also exits non-zero when the package is already
 *  there, so the caller checks the program itself afterwards). */
export function install(args, { signal = null, onLine = () => {} } = {}) {
  return new Promise((ok, no) => {
    const c = spawn("winget", [...args, ...QUIET], { windowsHide: true });
    const take = (d) => { for (const l of String(d).split(/\r?\n/)) { const s = l.replace(/[▀-▟█▒░\\|/-]+\s*$/u, "").trim(); if (s) onLine(s.slice(0, 120)); } };
    c.stdout.on("data", take); c.stderr.on("data", take);
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    c.on("error", (e) => no(Object.assign(new Error(`winget could not start: ${e.message}`), { code: "NO_WINGET" })));
    c.on("close", (code) => { signal?.removeEventListener("abort", kill); signal?.aborted ? no(Object.assign(new Error("Cancelled"), { code: "CANCELLED" })) : ok(code); });
  });
}

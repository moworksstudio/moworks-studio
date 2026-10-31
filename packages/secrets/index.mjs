// Secret store for service keys (ElevenLabs): values are encrypted with Windows DPAPI for the signed-in user
// (only this Windows account on this PC can read them) and kept in <state>/secrets.json. Values never go to the browser, logs, project
// files or render processes; the API reports only whether a key is saved and when. PowerShell does the DPAPI call; the value travels on
// stdin, never on a command line.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

// a key saved for a service the app no longer has stays in the file, unread
export const NAMES = ["elevenlabs"];
const file = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "secrets.json");
const read = (root) => { try { return JSON.parse(readFileSync(file(root), "utf8")); } catch { return {}; } };
function write(root, data) {
  const f = file(root);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f + ".tmp", JSON.stringify(data, null, 2) + "\n");
  renameSync(f + ".tmp", f);
}

function dpapi(mode, input) {
  const ps = `Add-Type -AssemblyName System.Security; $in = [Console]::In.ReadToEnd().Trim();
    ${mode === "protect"
      ? "$b = [Text.Encoding]::UTF8.GetBytes($in); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b, $null, 'CurrentUser'))"
      : "$b = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($in), $null, 'CurrentUser'); [Text.Encoding]::UTF8.GetString($b)"}`;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(ps, "utf16le").toString("base64")],
    { input, encoding: "utf8", windowsHide: true, timeout: 20000 });
  if (r.status !== 0) throw Object.assign(new Error("Windows could not " + (mode === "protect" ? "encrypt" : "decrypt") + " the key"), { code: "SECRET_STORE" });
  return r.stdout.replace(/\r?\n$/, "");
}

const check = (name) => { if (!NAMES.includes(name)) throw Object.assign(new Error(`Unknown key "${name}"`), { code: "INVALID" }); };

/** Save (replace) a key. */
export function setSecret(name, value, root = APP_ROOT) {
  check(name);
  const v = String(value ?? "").trim();
  if (!v) throw Object.assign(new Error("The key is empty"), { code: "INVALID" });
  const data = read(root);
  data[name] = { blob: dpapi("protect", v), savedAt: new Date().toISOString() };
  write(root, data);
  return status(root)[name];
}

/** The key itself: backend use only (a request to the provider). null when none is saved. */
export function getSecret(name, root = APP_ROOT) {
  check(name);
  const e = read(root)[name];
  return e?.blob ? dpapi("unprotect", e.blob) : null;
}

export function clearSecret(name, root = APP_ROOT) {
  check(name);
  const data = read(root);
  delete data[name];
  write(root, data);
  return status(root)[name];
}

/** { name: { saved, savedAt } } with no key material. */
export function status(root = APP_ROOT) {
  const data = existsSync(file(root)) ? read(root) : {};
  return Object.fromEntries(NAMES.map((n) => [n, { saved: !!data[n]?.blob, savedAt: data[n]?.savedAt ?? null }]));
}

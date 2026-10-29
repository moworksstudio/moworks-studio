// Errors as the UI reads them: never an address of this computer (the owner's rule for the whole app). A Node system error (ENOENT,
// EACCES…) becomes a plain sentence, and any absolute Windows or POSIX path in a message is cut to its last name, by the rule of
// Settings' noPaths (ui/src/screens/Settings.jsx): "C:\…\python.exe" reads "python.exe", "D:\Moworks Studio" reads "Moworks Studio".

const lastName = (p) => p.replace(/[\\/]+$/, "").split(/[\\/]/).pop();
// a drive or network path runs to the next , ; ( ) or a sentence's full stop (folder names hold spaces); a POSIX one to the next space.
// A drive letter is a word of its own ("https://" is no drive)
const WIN_PATH = /(?:(?<!\w)[A-Za-z]:[\\/]|\\\\[^\\/\s]+[\\/])[^,;()\n]*?(?=\s*(?:$|[,;()]|\.(?:\s|$)))/g;
const POSIX_PATH = /(?<![\w.:/\\~-])\/(?:[^\s/,;()'"]+\/)+[^\s/,;()'"]*/g;

/** A text with every absolute path cut to its last name (a URL and a project's own relative paths stay). */
export const noPaths = (s) => String(s ?? "").replace(WIN_PATH, lastName).replace(POSIX_PATH, lastName);

const SYSTEM = {
  ENOENT: (n, spawned) => (spawned ? `A program the app needs${n ? ` (${n})` : ""} was not found on this computer` : n ? `${n} was not found` : "A file or folder was not found"),
  EACCES: (n) => `Windows refused access${n ? ` to ${n}` : ""}`,
  EPERM: (n) => `Windows refused access${n ? ` to ${n}` : ""}: it may be open in another program or read-only`,
  EBUSY: (n) => `${n ?? "A file"} is in use by another program`,
  EEXIST: (n) => `${n ?? "That name"} already exists`,
  ENOTEMPTY: (n) => `The folder${n ? ` ${n}` : ""} is not empty`,
  EISDIR: (n) => `${n ?? "That"} is a folder, not a file`,
  ENOTDIR: (n) => `${n ?? "That"} is not a folder`,
  ENOSPC: () => "The disk is full",
  EROFS: () => "The drive is read-only",
  EMFILE: () => "Too many files are open at once; try again",
  ENAMETOOLONG: () => "A file name or folder path is too long for Windows",
  ECONNREFUSED: () => "A service the app needs is not answering",
  ECONNRESET: () => "The connection was cut; try again",
  ETIMEDOUT: () => "The connection timed out; try again",
  ENOTFOUND: () => "The address could not be reached; check the internet connection",
  EAI_AGAIN: () => "The address could not be reached; check the internet connection",
};
/** A Node system error's code (ENOENT, EACCES, EAI_AGAIN…), not the app's own codes ("ERROR") nor Node's ERR_* programming errors. */
export const isSystemCode = (c) => typeof c === "string" && /^E[A-Z0-9_]+$/.test(c) && c !== "ERROR" && !c.startsWith("ERR_");

/** The message of an error as the UI shows it. */
export function plainMessage(e) {
  if (isSystemCode(e?.code)) {
    const n = e.path ? lastName(String(e.path)) : null;
    return (SYSTEM[e.code] ?? ((x) => `The computer could not finish this${x ? ` (${x})` : ""}`))(n, /^spawn/.test(e.syscall ?? ""));
  }
  return noPaths(e?.message ?? e);
}

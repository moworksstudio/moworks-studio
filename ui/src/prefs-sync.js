// The UI's settings kept on this computer, not only in this window. The app serves
// its UI on a new port at every start and the browser keeps localStorage per address, so it started empty each time: the theme and its
// first-start question, the text size, panel sizes, filters, drafts. Every mw-* key written to localStorage is mirrored to the service
// (POST /api/prefs, packages/server/prefs.mjs) and loaded back before the first paint; localStorage stays the fast copy every screen reads.
import { api } from "./api.js";

const ours = (k) => typeof k === "string" && k.startsWith("mw-") && k !== "mw-token";          // the session token is never kept
const local = () => { try { return window.localStorage; } catch { return null; } };
const pending = new Map();          // key -> new value, or null for removed
let timer = null;

/** Send the changes not sent yet; `keepalive` when the window is closing or reloading. */
export function flushPrefs(keepalive = false) {
  clearTimeout(timer); timer = null;
  if (!pending.size) return Promise.resolve();
  const set = {}, remove = [];
  for (const [k, v] of pending) if (v == null) remove.push(k); else set[k] = v;
  pending.clear();
  return api("POST", "/api/prefs", { set, remove }, { keepalive }).catch(() => {});
}
const queue = (k, v) => { pending.set(k, v); clearTimeout(timer); timer = setTimeout(flushPrefs, 400); };

/** Before the first render: the settings kept on this computer into this window's localStorage (they win: this window's address is new);
 *  keys only this window has (set before the file existed) go up. Waits at most `ms`; without the service the app opens with what it has. */
export async function loadPrefs(ms = 1500) {
  const ls = local();
  if (!ls) return false;
  let prefs;
  try { prefs = (await Promise.race([api("GET", "/api/prefs"), new Promise((_, no) => setTimeout(() => no(new Error("slow")), ms))])).prefs ?? {}; }
  catch { return false; }
  try {
    for (const [k, v] of Object.entries(prefs)) if (ours(k) && typeof v === "string") Storage.prototype.setItem.call(ls, k, v);
    const up = {};
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (ours(k) && !(k in prefs)) up[k] = ls.getItem(k); }
    if (Object.keys(up).length) api("POST", "/api/prefs", { set: up }).catch(() => {});
  } catch { /* storage locked: this window only */ }
  return true;
}

/** From now on, every write to an mw-* key of localStorage is also sent to the service (batched; sent at once when the window hides). */
export function mirrorPrefs() {
  const P = Storage.prototype, setItem = P.setItem, removeItem = P.removeItem, clear = P.clear;
  P.setItem = function (k, v) { setItem.call(this, k, v); if (this === local() && ours(k)) queue(k, String(v)); };
  P.removeItem = function (k) { removeItem.call(this, k); if (this === local() && ours(k)) queue(k, null); };
  P.clear = function () {
    const gone = this === local() ? Array.from({ length: this.length }, (_, i) => this.key(i)).filter(ours) : [];
    clear.call(this); for (const k of gone) queue(k, null);
  };
  addEventListener("pagehide", () => flushPrefs(true));
  addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushPrefs(true); });
}

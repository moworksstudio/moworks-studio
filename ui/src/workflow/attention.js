// The app waits for the user (audit/96, owner #911-#913): Claude asks, a Storyboard or a Motion Plan to approve, characters or the
// voice-over to check, Version 1 ready, the Review done, a render finished, a step stopped. The server keeps each moment once
// (packages/server/attention.mjs) and the top bar's status read brings them (GET /tasks/running: no read of its own). While this window
// is the one in use, the chat's card is enough. While it is not (minimized, covered, another app in front):
//   - a Windows notification (Settings › General › Notifications, on by default); a click brings the window back and opens the right
//     dialog. Silent: the app's own ding is the sound, and it is off by default;
//   - the window's title says "● Waiting for you · Moworks Studio", the tab's icon wears a red dot, and the launcher flashes the
//     taskbar button and puts the dot on its icon (POST /window/attention);
// all of it until the user is back. A blocked permission leaves the title, the taskbar and the chat card.
import { post } from "../api.js";
import { go } from "../lib.jsx";
import { tr } from "../i18n.jsx";

export const NOTIFY_KEY = "mw-pref:notify-windows", SOUND_KEY = "mw-pref:notify-sound";
export const WAIT_TITLE = "● Waiting for you · Moworks Studio";
const pref = (k, d) => { try { const s = localStorage.getItem(k); return s == null ? d : JSON.parse(s) !== false; } catch { return d; } };
export const notifyPrefs = () => ({ windows: pref(NOTIFY_KEY, true), sound: pref(SOUND_KEY, false) });

/** This window is the one in use: shown and in front. */
const inUse = () => document.visibilityState === "visible" && document.hasFocus();

let seen = null;          // the moments this window has taken; the ones there when it opened are never said
let away = null;          // while a wait is said: { title, icons, shown, flash }
/** The dialog a moment opens: the Editor of its film, with its sheet. The same address again opens the sheet again. */
export function openMoment(x) {
  const to = `/projects/${x.projectId}${x.open ? `/${x.open}` : ""}`;
  if (location.hash.replace(/^#/, "").split("?")[0] === to && x.open) { go(`/projects/${x.projectId}`); setTimeout(() => go(to), 60); }
  else go(to);
}

/** The top bar's read: `list` the server's moments, oldest first. */
export function takeAttention(list = []) {
  if (!Array.isArray(list)) return;
  if (!seen) { seen = new Set(list.map((x) => x.id)); return; }
  const fresh = list.filter((x) => x?.id && !seen.has(x.id));
  for (const x of fresh) seen.add(x.id);
  if (!fresh.length || inUse()) return;
  raise(fresh.slice(-3));
}

function raise(items) {
  const p = notifyPrefs();
  if (!away) away = { title: document.title, icons: null, shown: [], flash: false };
  document.title = WAIT_TITLE;
  dotIcon();
  if (p.windows) {
    for (const x of items) notify(x);
    if (!away.flash) { away.flash = true; post("/api/window/attention", { on: true }).catch(() => {}); }
  }
  if (p.sound) ding();
}

function notify(x) {
  if (typeof Notification === "undefined") return;
  const show = () => {
    if (!away) return;          // the user came back meanwhile
    try {
      const n = new Notification(tr(x.text), { body: x.title || "Moworks Studio", tag: x.id, icon: "/brand/icon-192.png", silent: true });
      n.onclick = () => { try { window.focus(); } catch { /* the launcher brings it */ } post("/api/window/focus").catch(() => {}); openMoment(x); n.close(); };
      away.shown.push(n);
    } catch { /* the title and the taskbar say it */ }
  };
  if (Notification.permission === "granted") show();
  // the first time the app needs to tell: the browser asks "Allow notifications?" once (the answer is kept for the next starts, cli.mjs)
  else if (Notification.permission === "default") Notification.requestPermission().then((r) => { if (r === "granted") show(); }).catch(() => {});
}

/** The user is back: the title, the icon, the taskbar and the notices still in the corner go back as they were. */
function back() {
  if (!away || !inUse()) return;
  const a = away; away = null;
  document.title = a.title || "Moworks Studio";
  if (a.icons) { document.getElementById("mw-dot-icon")?.remove(); for (const l of a.icons) document.head.appendChild(l); }
  for (const n of a.shown) { try { n.close(); } catch { /* gone */ } }
  if (a.flash) post("/api/window/attention", { on: false }).catch(() => {});
}
if (typeof window !== "undefined") {
  window.addEventListener("focus", back);
  document.addEventListener("visibilitychange", back);
  window.addEventListener("pointerdown", back, true);
}

/** The tab's icon with a red dot (a browser tab; the app window's taskbar icon is the launcher's). */
function dotIcon() {
  if (away.icons || typeof document === "undefined") return;
  const img = new Image();
  img.onload = () => {
    if (!away || away.icons) return;
    try {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0, 64, 64);
      g.beginPath(); g.arc(48, 16, 15, 0, Math.PI * 2); g.fillStyle = "#18181b"; g.fill();
      g.beginPath(); g.arc(48, 16, 12, 0, Math.PI * 2); g.fillStyle = "#e5484d"; g.fill();
      const icons = [...document.querySelectorAll("link[rel~='icon']")];
      for (const l of icons) l.remove();
      const l = document.createElement("link"); l.id = "mw-dot-icon"; l.rel = "icon"; l.type = "image/png"; l.href = c.toDataURL("image/png");
      document.head.appendChild(l); away.icons = icons;
    } catch { /* the title says it */ }
  };
  img.src = "/brand/icon-64.png";
}

let ac = null;
/** A short soft ding, made here (no file): two sine notes, quiet. Settings plays it once when Sound is turned on. */
export function ding() {
  try {
    const C = window.AudioContext ?? window.webkitAudioContext;
    if (!C) return;
    ac ??= new C();
    ac.resume?.().catch?.(() => {});
    const t0 = ac.currentTime + 0.02;
    for (const [f, d] of [[880, 0], [1318.5, 0.11]]) {
      const o = ac.createOscillator(), v = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      v.gain.setValueAtTime(0.0001, t0 + d);
      v.gain.exponentialRampToValueAtTime(0.16, t0 + d + 0.012);
      v.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.55);
      o.connect(v).connect(ac.destination);
      o.start(t0 + d); o.stop(t0 + d + 0.6);
    }
  } catch { /* no sound on this computer */ }
}

/** For the tests: forget what was taken. */
export function resetAttention() { seen = null; away = null; }

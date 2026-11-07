// Small shared pieces: hash router, persisted UI prefs, data hook, toasts, formatting.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tr } from "./i18n.jsx";
import { watchJob } from "./api.js";

/* ---------- router: #/path ---------- */
export function useRoute() {
  const read = () => (location.hash.replace(/^#/, "") || "/projects");
  const [path, setPath] = useState(read);
  useEffect(() => { const f = () => setPath(read()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return path;
}
export const go = (path) => { location.hash = path; };
/** The same, in place of the address now (no new step in the history): a sheet closed takes its name off the address. */
export const goReplace = (path) => { history.replaceState(null, "", "#" + path); dispatchEvent(new HashChangeEvent("hashchange")); };

/* ---------- per-user UI prefs (panel widths, view mode, filters): browser storage, never project data ---------- */
export function usePref(key, initial) {
  const k = "mw-pref:" + key;
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(k); return s == null ? initial : JSON.parse(s); } catch { return initial; } });
  const set = useCallback((x) => setV((old) => { const n = typeof x === "function" ? x(old) : x; try { localStorage.setItem(k, JSON.stringify(n)); } catch {} return n; }), [k]);
  return [v, set];
}

/* ---------- data hook ---------- */
export function useData(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const seq = useRef(0);
  const load = useCallback(async () => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const data = await loader(); if (n === seq.current) setState({ loading: false, data, error: null }); }
    catch (error) { if (n === seq.current) setState((s) => ({ loading: false, data: s.data, error })); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** Read `read` every `every` ms while `on`, the next read only once the last one is answered (setInterval stacked reads on a busy
 *  computer whose service went quiet for 12-30 s: audit/112c c2.1); stops when `on` goes false or the component goes. */
export function usePoll(read, every, on = true) {
  const latest = useRef(read);
  latest.current = read;
  useEffect(() => {
    if (!on) return undefined;
    let alive = true, h = null;
    const loop = async () => { try { await latest.current(); } catch { /* the next read tries again */ } if (alive) h = setTimeout(loop, every); };
    h = setTimeout(loop, every);
    return () => { alive = false; clearTimeout(h); };
  }, [on, every]);
}

/* ---------- toasts ---------- */
/** How long a toast stays: an error is read with care and has no other place to be read again, so it stays longer, and while the pointer
 *  is on it (audit/112c c1.4); a done line passes quickly. */
export const toastMs = (kind) => (kind === "error" ? 8000 : 3200);
const ToastCtx = createContext(() => {});
export function ToastProvider({ children, render }) {
  const [items, setItems] = useState([]);
  const held = useRef(new Set());          // toasts under the pointer: they wait until it leaves
  const push = useCallback((text, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, text, kind }]);
    const leave = () => {
      if (held.current.has(id)) { setTimeout(leave, 1000); return; }
      setItems((x) => x.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 200);
    };
    setTimeout(leave, toastMs(kind));
  }, []);
  const hold = useCallback((id, on) => { if (on) held.current.add(id); else held.current.delete(id); }, []);
  return <ToastCtx.Provider value={push}>{children}{render(items, hold)}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

/** True the first time a screen is opened in this app session (so an entrance plays once, not on every visit). */
export function useFirstVisit(key) {
  const [first] = useState(() => { try { if (sessionStorage.getItem("mw-seen:" + key)) return false; sessionStorage.setItem("mw-seen:" + key, "1"); return true; } catch { return false; } });
  return first;
}

/* ---------- formatting (the interface is English: i18n.jsx) ---------- */
export const locale = () => "en-GB";
/** The day a kit was made, as a person writes it. */
export const madeOn = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
/** How the user's kits of one name read apart (they may share one: each new version of a brand's kit does): id → the day it was made, with the time when two share that too. */
export function sameNameLabels(looks) {
  const groups = new Map(), out = new Map();
  for (const l of looks ?? []) if (l.group === "yours") { const k = String(l.title).trim().toLowerCase(); groups.set(k, [...(groups.get(k) ?? []), l]); }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    for (const l of g) out.set(l.id, g.filter((x) => madeOn(x.createdAt) === madeOn(l.createdAt)).length > 1 ? `${madeOn(l.createdAt)}, ${new Date(l.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : madeOn(l.createdAt));
  }
  return out;
}

export function ago(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return tr("just now");
  if (s < 3600) return tr("{n} min ago", { n: Math.floor(s / 60) });
  if (s < 86400) return tr("{n} h ago", { n: Math.floor(s / 3600) });
  if (s < 86400 * 7) return tr("{n} d ago", { n: Math.floor(s / 86400) });
  return new Date(iso).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
}
/** Date and time in the interface language. */
export const when = (iso) => (iso ? new Date(iso).toLocaleString(locale()) : "–");
export function clock(sec) {
  if (sec == null || Number.isNaN(sec)) return "–";
  const s = Math.round(sec), m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
/** "1:30", "90", "1m30s" -> seconds; null when unreadable. */
export function parseLength(text) {
  const t = String(text ?? "").trim().toLowerCase();
  if (!t) return null;
  let m = /^(\d+):(\d{1,2})$/.exec(t); if (m) return +m[1] * 60 + +m[2];
  m = /^(\d+)\s*m(?:in)?\s*(?:(\d+)\s*s?)?$/.exec(t); if (m) return +m[1] * 60 + (+m[2] || 0);
  m = /^(\d+)\s*s?$/.exec(t); if (m) return +m[1];
  return null;
}
export const words = (t) => (String(t ?? "").trim().match(/\S+/g) ?? []).length;
// English keys for t(): STAGE_NAMES[k] is shown as t(STAGE_NAMES[k])
export const STAGE_NAMES = { brief: "Brief", storyboard: "Storyboard", motionPlan: "Motion plan", build: "Build", review: "Review", export: "Export" };

/** One job a component follows (audit/112 2.6: each page wrote this loop its own way): [job, follow, setJob]. follow(j) shows j (as the
 *  server answered its start) and every state after it; onEnd(x) runs once when it ends (done, failed, cancelled, or lost). Its watch
 *  stops with the component. */
export function useJob(onEnd, every = 1000) {
  const watch = useJobWatch();
  const [job, setJob] = useState(null);
  const end = useRef(onEnd); end.current = onEnd;
  const follow = useCallback((j) => { setJob(j); watch(j.id, (x) => { if (!x) return; setJob(x); if (x.status !== "running") end.current?.(x); }, every); }, [watch, every]);
  return [job, follow, setJob];
}

/** watchJob for a component: every watch it starts stops when the component goes (a sheet closed, a page left), and when its job ends
 *  (audit/112c c5.1: no caller kept the stop, so a closed sheet's loop ran until its job ended). */
export function useJobWatch() {
  const stops = useRef(new Set());
  useEffect(() => () => { for (const s of stops.current) s(); stops.current.clear(); }, []);
  return useCallback((id, cb, every, opts) => {
    let stop = null;
    stop = watchJob(id, (x, e) => { if (x?.status !== "running" && stop) stops.current.delete(stop); cb(x, e); }, every, opts);
    stops.current.add(stop);
    return stop;
  }, []);
}

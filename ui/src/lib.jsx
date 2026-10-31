// Small shared pieces: hash router, persisted UI prefs, data hook, toasts, formatting.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tr } from "./i18n.jsx";

/* ---------- router: #/path ---------- */
export function useRoute() {
  const read = () => (location.hash.replace(/^#/, "") || "/projects");
  const [path, setPath] = useState(read);
  useEffect(() => { const f = () => setPath(read()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return path;
}
export const go = (path) => { location.hash = path; };

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

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children, render }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.map((i) => (i.id === id ? { ...i, leaving: true } : i))), 3200);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200 + 200);
  }, []);
  return <ToastCtx.Provider value={push}>{children}{render(items)}</ToastCtx.Provider>;
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

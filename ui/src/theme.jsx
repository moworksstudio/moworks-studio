// Themes and text size: two themes, The Desk (the default) and The Studio (Light Table: an animation studio at night, paper on a
// light table); the first start asks which one (workflow/FirstRun.jsx), once; Settings › General › Appearance changes it. Small /
// Medium / Large on top of the window-scaled root size. Stored in this browser like the other UI prefs; applied to <html> before the
// first paint (main.jsx).
import { useCallback, useState, useSyncExternalStore } from "react";

export const THEMES = [
  { id: "pelagra", name: "The Desk", desc: "Deep water, teal, thin titles" },
  { id: "studio", name: "The Studio", desc: "An animation studio at night: paper, pencil, a light table" },
];
/** The themes the Settings picker offers (it shows only when there are two or more). */
export const THEMES_SHOWN = THEMES;
export const SIZES = [["sm", 0.92, "Small"], ["md", 1, "Medium"], ["lg", 1.1, "Large"]];
const KEY_THEME = "mw-pref:theme", KEY_SIZE = "mw-pref:text-size", KEY_ASKED = "mw-pref:theme-asked";
export const KEEP_ON_RESET = [KEY_THEME, KEY_SIZE, KEY_ASKED];

const read = (k, ok, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return ok(v) ? v : d; } catch { return d; } };
const readTheme = () => read(KEY_THEME, (v) => THEMES_SHOWN.some((x) => x.id === v), "pelagra");          // a stored theme that is neither The Desk nor The Studio reads as The Desk
const readSize = () => read(KEY_SIZE, (v) => SIZES.some((x) => x[0] === v), "md");

const seen = new Set();          // the useThemeId hooks listening
function apply(theme, size) {
  const el = document.documentElement;
  if (theme === "pelagra") delete el.dataset.theme; else el.dataset.theme = theme;
  el.style.setProperty("--ui-scale", String(SIZES.find((x) => x[0] === size)?.[1] ?? 1));
  for (const f of seen) f();
}
const themeNow = () => document.documentElement.dataset.theme ?? "pelagra";
const watch = (f) => { seen.add(f); return () => seen.delete(f); };
/** The theme on screen now ("pelagra" | "studio"), for a screen whose layout differs by theme; it re-renders when the theme changes. */
export const useThemeId = () => useSyncExternalStore(watch, themeNow, themeNow);          // the third: a server render (ui-render.test) reads the same
/** Whether the first start has asked which theme: a theme chosen before, in Settings or by the question, counts as asked. Without
 *  storage (a server render, a locked-down window) it counts as asked, so the question never blocks the app. */
export const themeAsked = () => { try { return localStorage.getItem(KEY_ASKED) === "1" || localStorage.getItem(KEY_THEME) != null; } catch { return true; } };
export const markThemeAsked = () => { try { localStorage.setItem(KEY_ASKED, "1"); } catch { /* private window: asked again next time */ } };
/** Called once before React renders, so the first paint is already in the chosen theme. */
export const applyStored = () => apply(readTheme(), readSize());

const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window: this session only */ } };
/** A theme change crossfades the whole app once (View Transitions); without support, with reduced motion or in a hidden window, it just switches. */
const withFade = (f) => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (document.startViewTransition && !still && !document.hidden) document.startViewTransition(f); else f();
};

export function useAppearance() {
  const [theme, setT] = useState(readTheme);
  const [size, setS] = useState(readSize);
  // the transition's callback can run a frame later: it applies whatever was chosen last, so two quick clicks never end on the first one
  const setTheme = useCallback((t) => { save(KEY_THEME, t); setT(t); withFade(() => apply(readTheme(), readSize())); }, []);
  const setSize = useCallback((s) => { save(KEY_SIZE, s); apply(readTheme(), s); setS(s); }, []);
  return { theme, setTheme, size, setSize };
}

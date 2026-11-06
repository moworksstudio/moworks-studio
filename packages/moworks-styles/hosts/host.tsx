// The host page of a film in one of the owner's Remotion styles (Paper Collage, Stickman Explainer, Inner Voice Short, 3D Cartoon): React draws the
// project's composition (src/videos/film/Video.tsx, written from the source skill's own template and examples, on the source skill's own code as shipped) at the
// frame HyperFrames asks for, through the app's stand-in for Remotion (the What If bridge: no Remotion package). R-LEMO drives it from HF's
// timeline: window.render(t), then window.READY once every face and every delayRender handle is in. The page's root (#main, HF's composition)
// gives the size and rate when the module does not; data-skill-board="t1,t2,…" on it draws the film at those seconds, one per second of HF's time
// (the storyboard's stills).
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as film from "mw-film";
import { FrameContext, VideoConfigContext, whenRendered, type VideoConfig } from "remotion";

const mod = film as Record<string, unknown>;
// the composition: the one the root names (data-skill-comp), else the module's default export, else its first capitalised component that is not the
// collision-QA twin (…Check). ?skill-check=1 in the page's address draws that twin instead: the 3D Cartoon's collision check (collision.mjs)
const asked = document.getElementById("main")?.dataset.skillComp ?? document.getElementById("main")?.dataset.kitComp;          // an older film: data-kit-comp
const check = new URLSearchParams(location.search).get("skill-check") === "1";
const name = check ? Object.keys(mod).find((k) => typeof mod[k] === "function" && /^[A-Z]\w*Check$/.test(k))
  : asked && typeof mod[asked] === "function" ? asked : typeof mod.default === "function" ? "default"
  : Object.keys(mod).find((k) => typeof mod[k] === "function" && /^[A-Z]/.test(k) && !/Check$/.test(k) && !/^[A-Z0-9_]+$/.test(k));
if (!name) throw new Error(check ? "src/videos/film/Video.tsx exports no collision check: export FilmCheck as the source skill's template does (CollisionCheck from ../../skill/collision)"
  : "src/videos/film/Video.tsx exports no composition: export the video's component, as the source skill's template does");
const Comp = mod[name] as React.FC<Record<string, unknown>>;

const main = document.getElementById("main")!, stage = document.getElementById("stage")!;
const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const fps = num(mod.FPS) ?? num(main.dataset.fps) ?? 30;
const board = String(main.dataset.skillBoard ?? main.dataset.kitBoard ?? "").split(",").map((x) => x.trim()).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
const config: VideoConfig = { id: name, width: num(mod.WIDTH) ?? num(main.dataset.width) ?? 1920, height: num(mod.HEIGHT) ?? num(main.dataset.height) ?? 1080, fps,
  durationInFrames: Math.max(1, Math.round(num(mod.FRAMES) ?? (num(main.dataset.duration) ?? 1) * fps)), defaultProps: {}, props: {} };

const root = createRoot(stage);
let drawn = -1;
/** Draw frame f synchronously: the bridge's draw leaves the picture finished when it returns. */
const draw = (f: number) => {
  flushSync(() => root.render(<VideoConfigContext.Provider value={config}><FrameContext.Provider value={f}><Comp /></FrameContext.Provider></VideoConfigContext.Provider>));
  drawn = f;
};
const frameAt = (t: number) => {
  const s = board.length ? board[Math.max(0, Math.min(board.length - 1, Math.floor(t + 1e-6)))] : t;
  return Math.max(0, Math.min(config.durationInFrames - 1, Math.round(s * fps)));
};

declare global { interface Window { render?: (t: number) => void; renderAt?: (t: number) => Promise<void>; READY?: boolean; __skillFrame?: () => number; __skillConfig?: VideoConfig; __skillError?: string } }
// the R-LEMO contract, written out as finalize looks for it: window.render = ..., window.READY = true
window.render = (t: number) => { const f = frameAt(t); if (f !== drawn) draw(f); };
window.__skillFrame = () => drawn;
window.__skillConfig = config;
// the frame drawn and every picture in it loaded and decoded before HyperFrames takes it (the bridge awaits renderAt through hf-seek's
// waitUntil). A photo whose scene starts mid-film mounts its <img> on that frame: drawn at once, it was a white sheet for one or two frames
// in every render, at a different place each time (T43-11, Paper Collage's PhotoPrint). Each picture is waited for once.
const decoded = new WeakSet<HTMLImageElement>(), PICTURE_WAIT_MS = 15000;
window.renderAt = async (t: number) => {
  window.render!(t);
  try { await whenRendered(); } catch { /* cancelRender: said in __skillError; the frame is taken as drawn */ }
  const fresh = [...document.images].filter((i) => !decoded.has(i) && i.getAttribute("src"));
  if (!fresh.length) return;
  // a picture done loading (or failed: complete with no width, a 404) goes on at once; none waits more than PICTURE_WAIT_MS (T43-13: a picture
  // whose file had moved failed before the wait began, and the film never got ready)
  const one = (i: HTMLImageElement) => (i.complete ? Promise.resolve() : new Promise<void>((ok) => { i.addEventListener("load", () => ok(), { once: true }); i.addEventListener("error", () => ok(), { once: true }); }))
    .then(() => (i.naturalWidth && typeof i.decode === "function" ? i.decode().catch(() => undefined) : undefined))
    .then(() => { if (i.complete) decoded.add(i); });
  await Promise.race([Promise.all(fresh.map(one)), new Promise<void>((ok) => setTimeout(ok, PICTURE_WAIT_MS))]);
};

// every face the page declares (the source skill's own and their Vietnamese twins), then every delayRender handle (the source skills' own waits: the canvas
// stage's fonts, the 3D world's build), before the first frame is called ready
const faces = [...document.fonts].map((f) => `${f.style} ${f.weight.split(" ")[0]} 40px "${f.family.replace(/"/g, "")}"`);
Promise.all(faces.map((f) => document.fonts.load(f))).then(() => document.fonts.ready)
  .then(() => { draw(0); return whenRendered(); })
  .then(() => { draw(0); return whenRendered(); })
  .then(() => { window.READY = true; })
  // a cancelRender (a source skill's own failure) said to whoever reads the page, and thrown on as before
  .catch((e) => { window.__skillError = String((e as Error)?.message ?? e); throw e; });

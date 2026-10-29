// The host page of a What If film: React draws the project's episode (whatif/episode.tsx, built on the pinned engine) at the
// frame HyperFrames asks for. The app's R-LEMO bridge drives it from HF's timeline: window.render(t), then window.READY once every face
// and every delayRender handle is in. The page's root (#main, HF's composition) gives the size and rate; data-whatif="board" on it draws
// the episode's Board instead (one frame per shot, at its key frame: the storyboard's stills).
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as film from "wi-film";
import { FrameContext, VideoConfigContext, whenRendered, type VideoConfig } from "remotion";

type Def = { id?: string; total?: number; shotCount?: number; Main: React.FC; Board?: React.FC };
const isDef = (x: unknown): x is Def => !!x && typeof x === "object" && typeof (x as Def).Main === "function";
// the module's default export, else its first export that is an episode (defineEpisode's result)
const EPISODE = (isDef((film as Record<string, unknown>).default) ? (film as Record<string, unknown>).default : Object.values(film).find(isDef)) as Def | undefined;
if (!EPISODE) throw new Error("whatif/episode.tsx exports no episode: export default defineEpisode(...)");

const main = document.getElementById("main")!, stage = document.getElementById("stage")!;
const board = main.dataset.whatif === "board" && !!EPISODE.Board;
const fps = Number(main.dataset.fps) || 30;
const config: VideoConfig = { id: EPISODE.id ?? "main", width: Number(main.dataset.width) || 1920, height: Number(main.dataset.height) || 1080, fps,
  durationInFrames: Math.max(1, (board ? EPISODE.shotCount : EPISODE.total) ?? Math.round((Number(main.dataset.duration) || 1) * fps)), defaultProps: {}, props: {} };
const Draw = board ? EPISODE.Board! : EPISODE.Main;

const root = createRoot(stage);
let drawn = -1;
/** Draw frame f synchronously: the bridge's draw leaves the picture finished when it returns. */
const draw = (f: number) => {
  flushSync(() => root.render(<VideoConfigContext.Provider value={config}><FrameContext.Provider value={f}><Draw /></FrameContext.Provider></VideoConfigContext.Provider>));
  drawn = f;
};
// a board holds each shot's frame for one second of HF's time (as anidoodle's boards do); a film plays at its rate
const frameAt = (t: number) => Math.max(0, Math.min(config.durationInFrames - 1, Math.floor((board ? t : t * fps) + 1e-6)));

declare global { interface Window { render?: (t: number) => void; READY?: boolean; __wiFrame?: () => number } }
// the R-LEMO contract, written out as finalize looks for it: window.render = ..., window.READY = true
window.render = (t: number) => { const f = frameAt(t); if (f !== drawn) draw(f); };
window.__wiFrame = () => drawn;

// every face the page declares, then every delayRender handle, before the first frame is called ready
const faces = [...document.fonts].map((f) => `${f.style} ${f.weight.split(" ")[0]} 40px "${f.family.replace(/"/g, "")}"`);
Promise.all(faces.map((f) => document.fonts.load(f))).then(() => document.fonts.ready)
  .then(() => { draw(0); return whenRendered(); })
  .then(() => { window.READY = true; });

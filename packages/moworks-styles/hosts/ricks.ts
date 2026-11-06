// Ricks Clip on HyperFrames (R-SKILL, then R-LEMO's bridge drives it): the source skill's engine (main.js, imported once the faces are in) draws frame f
// with window.renderFrame(f). HyperFrames' time t is frame round(t × fps) of the film (the root's data-fps, the source skill's 30), held to the film's
// last frame (window.TOTAL, from story.js); data-skill-board="t1,t2,…" on the root draws the film at those seconds, one per second of HF's time
// (the storyboard's stills). The source skill draws its carved and painted words into canvases while it builds the world, so the page's faces (the
// Vietnamese twins of DejaVu Serif and Arial Black, declared by the app) are loaded before the engine runs.
// ?skill-check=1 in the page's address (the app's collision check for the cards, owner #1267, ricks-cards.ts): the engine is built and posed as
// shipped, but its GPU drawing is skipped (its renderer, made while __mwSkipDraw is set, draws nothing: ricks.mjs), so every frame's world and
// actors can be stepped through quickly; window.__mwCardCheck() returns the check's lines.
import { cardCollisions } from "./ricks-cards";

declare global { interface Window { render?: (t: number) => void; READY?: boolean; renderFrame?: (f: number) => boolean; TOTAL?: number; ready?: boolean; err?: string; __skillError?: string;
  __mwActors?: unknown[]; __mwCardCheck?: () => string[]; __mwSkipDraw?: boolean; __mwScene?: any } }

const main = document.querySelector<HTMLElement>("[data-composition-id]");
const fps = Number(main?.dataset.fps) || 30;
const board = String(main?.dataset.skillBoard ?? main?.dataset.kitBoard ?? "").split(",").map((x) => x.trim()).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
const check = new URLSearchParams(location.search).get("skill-check") === "1";
// the engine's scene is the one its colour pass draws through a perspective camera; nothing is drawn
if (check) window.__mwSkipDraw = true;
let built = false, drawn = -1;
const frameAt = (t: number) => {
  const s = board.length ? board[Math.max(0, Math.min(board.length - 1, Math.floor(t + 1e-6)))] : t;
  return Math.max(0, Math.min((window.TOTAL || 1) - 1, Math.round(s * fps)));
};
// the R-LEMO contract, written out as finalize looks for it: window.render = ..., window.READY = true
window.render = (t: number) => { if (!built || !window.renderFrame) return; const f = frameAt(t); if (f !== drawn) { window.renderFrame(f); drawn = f; } };
const faces = [...document.fonts].map((f) => `${f.style} ${f.weight.split(" ")[0]} 40px "${f.family.replace(/"/g, "")}"`);
Promise.all(faces.map((f) => document.fonts.load(f))).then(() => document.fonts.ready)
  .then(() => import("mw-film-main"))
  .then(() => {
    if (window.err) throw new Error(window.err);
    if (!window.ready || typeof window.renderFrame !== "function") throw new Error("the engine did not build its world (window.ready)");
    built = true; window.renderFrame(frameAt(0)); drawn = frameAt(0);
    if (check) window.__mwCardCheck = () => cardCollisions({ frames: window.TOTAL || 1, renderFrame: (f) => window.renderFrame!(f), actors: () => (window.__mwActors ?? []) as any[], scene: () => window.__mwScene ?? null });
    window.READY = true;
  })
  .catch((e) => { window.__skillError = String((e as Error)?.message ?? e); console.error("Ricks Clip:", window.__skillError); });
export {};

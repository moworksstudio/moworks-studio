// anidoodle-mini's film, written the author's way: a Film (meta, assets, shots that tile the frames) drawn as a pure function of the
// frame, mounted by the engine's own host. The app bundles it with the pinned engine (R-ANIDOODLE).
import type { Film } from "anidoodle/canvas-core/film";
import { mountFilm } from "anidoodle/hosts/page";

const W = 640, H = 360, N = 10;
const draw = (ctx: CanvasRenderingContext2D, f: number) => {
  const k = f / (N - 1);
  ctx.fillStyle = "#efe6d2"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#c8442a"; ctx.beginPath(); ctx.arc(120 + 400 * k, 180, 60, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1f1b18"; ctx.lineWidth = 6; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 75, 300); ctx.lineTo(70 + i * 75, 300 - 40 * k); ctx.stroke(); }
};

export const mini: Film = {
  meta: { title: "anidoodle-mini", W, H, fps: 10, bpm: 120, durationFrames: N },
  assets: { images: {} },
  shots: [{ id: "mini", start: 0, end: N, draw: (ctx, local) => draw(ctx as unknown as CanvasRenderingContext2D, local) }],
};

mountFilm(mini);

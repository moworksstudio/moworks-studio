// BƠ WALKS TO SCHOOL. 3 s at 30 fps, 1920 x 1080, marker comic. She walks side-on along a pavement,
// screen left to right, her lunch bag swinging a beat behind her hips; the camera creeps after her.
// The walk is footsteps (characters/bo/walk.ts -> planWalk / walkAt): a planted foot never slides.
// A step every 12 frames: the film's beat (150 bpm) is her cadence.
import { mountFilm } from "anidoodle/hosts/page";
import { Gfx, PENCIL, type Ctx, type Env, type P, halftone, oval } from "anidoodle/canvas-core/core";
import type { Film } from "anidoodle/canvas-core/film";
import { type Camera, type V3, add, camera, lensPx, project } from "anidoodle/canvas-core/character/math3";
import { COMIC_INK, renderMarker } from "anidoodle/canvas-core/character/render/marker";
import { ink } from "anidoodle/canvas-core/gallery";
import { bo } from "../characters/moworks-bo";
import { BO_MARKER } from "../characters/moworks-bo/palettes";
import { WALK_FRAMES, boWalkAt } from "../characters/moworks-bo/walk";

const W = 1920, H = 1080, FPS = 30;
const LIGHT: P = [-0.62, -0.78];
const camAt = (f: number): Camera => { const u = f / (WALK_FRAMES - 1), x = -0.45 + 0.95 * u; return camera([x, 0.66, 4.3], [x + 0.04, 0.55, 0], lensPx(40, W), W * 0.5, H * 0.54); };

const fillInk = (g: Gfx, pts: P[], color: string, w = 3, seed = 1) => {
  const c = g.cur; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  g.touch(x0 - 4, y0 - 4, x1 + 4, y1 + 4); c.fillStyle = color; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
  if (w > 0) ink(g, [...pts, pts[0]], COMIC_INK, { w, light: LIGHT, shadow: 0.6, taper: [0.03, 0.03], seed, rough: 0.2 });
};

const drawWorld = (g: Gfx, cam: Camera) => {
  const Pp = (v: V3): P => { const q = project(cam, v); return [q.x, q.y]; };
  const hz = Pp([0, 0, -14])[1];
  g.group("plain", () => {
    const c = g.cur;
    // a flat comic sky with a dot screen thickening toward the horizon
    g.touch(0, 0, W, H); c.fillStyle = "#9fdcec"; c.fillRect(0, 0, W, hz + 2);
    c.fillStyle = "#86cfe2"; c.beginPath(); halftone({ x0: 0, y0: 0, x1: W, y1: hz }, 18, 45, (_x, y) => 0.08 + 0.4 * (y / hz)).forEach(([x, y, r]) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); }); c.fill();
    // two clouds, far away, drifting with the parallax of a distant thing
    [[-2.5, 3.2], [2.8, 3.6]].forEach(([x, y], i) => { const q = Pp([x, y, -14]); fillInk(g, [...oval(q[0], q[1], 120, 46, 28)], "#ffffff", 3, 40 + i); fillInk(g, [...oval(q[0] + 70, q[1] - 26, 70, 40, 24)], "#ffffff", 3, 50 + i); });
    // a row of low hedges and a wall across the back
    const wall = [Pp([-12, 0, -3]), Pp([12, 0, -3]), Pp([12, 0.75, -3]), Pp([-12, 0.75, -3])];
    fillInk(g, [[0, hz], [W, hz], [W, wall[0][1]], [0, wall[0][1]]], "#a6d873", 0);
    fillInk(g, wall, "#f2c46d", 3.5, 7);
    for (let x = -6; x <= 6; x += 0.9) { const a = Pp([x, 0.75, -3]), b = Pp([x, 0, -3]); ink(g, [a, b], COMIC_INK, { w: 2, light: LIGHT, shadow: 0.5, taper: [0.1, 0.1], seed: 60 + Math.round(x * 10), rough: 0.2 }); }
    for (let x = -6; x <= 6; x += 1.3) { const q = Pp([x, 0.75, -3.05]); fillInk(g, oval(q[0], q[1] - 22, 70, 34, 24), "#5fae45", 3, 80 + Math.round(x * 10)); }
    // the grass verge, the pavement she walks on, its kerb and its slab joints
    const g0 = Pp([0, 0, -3])[1]; fillInk(g, [[0, g0], [W, g0], [W, H], [0, H]], "#8fcf5f", 0);
    const pave = [Pp([-12, 0, -0.55]), Pp([12, 0, -0.55]), Pp([12, 0, 0.6]), Pp([-12, 0, 0.6])];
    fillInk(g, pave, "#efdcb6", 3.5, 9);
    const kerb = [Pp([-12, 0, 0.6]), Pp([12, 0, 0.6]), Pp([12, -0.12, 0.66]), Pp([-12, -0.12, 0.66])];
    fillInk(g, kerb, "#cdb88f", 3, 11);
    for (let x = -6; x <= 6; x += 0.6) ink(g, [Pp([x, 0, -0.55]), Pp([x + 0.03, 0, 0.6])], COMIC_INK, { w: 1.8, light: LIGHT, shadow: 0.4, taper: [0.15, 0.15], seed: 100 + Math.round(x * 10), rough: 0.2 }, 0.7);
    // tufts in the verge
    [[-2.2, -1.6], [-0.7, -2.2], [0.9, -1.4], [2.4, -2.4], [-3.4, -1.1], [3.6, -1.7]].forEach(([x, z], i) => { const q = Pp([x, 0, z]); ink(g, [[q[0], q[1]], [q[0] + 5, q[1] - 22]], "#3f8a2e", { w: 3, light: LIGHT, shadow: 0.3, taper: [0.1, 0.8], seed: 130 + i }); ink(g, [[q[0] + 12, q[1]], [q[0] + 20, q[1] - 16]], "#3f8a2e", { w: 3, light: LIGHT, shadow: 0.3, taper: [0.1, 0.8], seed: 140 + i }); });
  });
};

export const drawBoWalk = (ctx: Ctx, f: number, env: Env) => {
  const g = new Gfx(ctx, env, f, PENCIL);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#9fdcec"; ctx.fillRect(0, 0, W, H);
  const cam = camAt(f);
  drawWorld(g, cam);
  renderMarker(g, bo.toScene(boWalkAt(f), cam), BO_MARKER, { weight: 1.15 });
};

export const boWalk: Film = { meta: { title: "Bơ walks", W, H, fps: FPS, bpm: 150, durationFrames: WALK_FRAMES }, assets: { images: {} }, shots: [{ id: "walk", start: 0, end: WALK_FRAMES, draw: drawBoWalk }] };
mountFilm(boWalk);
export const __meta = boWalk.meta;
void add;

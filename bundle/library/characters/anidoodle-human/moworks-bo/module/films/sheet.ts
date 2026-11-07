// BƠ'S MODEL SHEET, v1.0.0, in the MARKER COMIC hand: the one approval artifact. Turnaround
// (front, three-quarter, profile, back) on a head grid, six expressions, the pose library, the
// identity card. Every figure on it is bo.toScene(pose): nothing here is drawn by hand for the sheet.
import { mountFilm } from "anidoodle/hosts/page";
import { Gfx, PENCIL, type Ctx, type Env, type P } from "anidoodle/canvas-core/core";
import type { Film } from "anidoodle/canvas-core/film";
import { type Camera, add, camera, project } from "anidoodle/canvas-core/character/math3";
import { COMIC_INK, renderMarker } from "anidoodle/canvas-core/character/render/marker";
import { rigFor } from "anidoodle/canvas-core/character/human/figure";
import { bo, BO_FEATURES, BO_VERSION } from "../characters/moworks-bo";
import { BO_EXPRESSIONS, BO_SPEC } from "../characters/moworks-bo/spec";
import { BO_DIMS, base, handsOnHips, relaxed, tiptoeReach, walkContact, wave } from "../characters/moworks-bo/poses";
import { BO_MARKER } from "../characters/moworks-bo/palettes";

const W = 3600, H = 3120, PAPER = "#fbf4e6", MUTED = "#7d7184", GRID = "#a9b2c8", HT = BO_SPEC.height;
const txt = (g: Gfx, s: string, x: number, y: number, size = 26, color = COMIC_INK, align: CanvasTextAlign = "left", weight = 800) => g.group("plain", () => {
  const c = g.cur; c.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", Arial, sans-serif`; c.fillStyle = color; c.textAlign = align; c.textBaseline = "alphabetic";
  const w = c.measureText(s).width, x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x; g.touch(x0 - 4, y - size, x0 + w + 4, y + size * 0.35); c.fillText(s, x, y);
});
const rule = (g: Gfx, pts: P[], color = GRID, w = 1.4, alpha = 0.7) => g.group("plain", () => { const c = g.cur; g.touch(Math.min(pts[0][0], pts[1][0]) - 2, Math.min(pts[0][1], pts[1][1]) - 2, Math.max(pts[0][0], pts[1][0]) + 2, Math.max(pts[0][1], pts[1][1]) + 2); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = w; c.beginPath(); c.moveTo(...pts[0]); c.lineTo(...pts[1]); c.stroke(); c.globalAlpha = 1; });
const panel = (g: Gfx, x: number, y: number, w: number, h: number, fill: string) => g.group("plain", () => { const c = g.cur; g.touch(x - 4, y - 4, x + w + 4, y + h + 4); c.fillStyle = fill; c.fillRect(x, y, w, h); c.strokeStyle = COMIC_INK; c.lineWidth = 3.2; c.strokeRect(x, y, w, h); });
// a long lens far away: near-orthographic, right for a turnaround
const fullCam = (cx: number, floorY: number, figPx: number, elev = 0): Camera => { const d = 12, f = (figPx * d) / HT; return camera([0, HT * 0.52 + elev, d], [0, HT * 0.52, 0], f, cx, floorY - figPx * 0.52); };
const clipped = (ctx: Ctx, env: Env, x: number, y: number, w: number, h: number, fn: () => void) => { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(); ctx.restore(); };

export const drawBoSheet = (ctx: Ctx, frame: number, env: Env) => {
  const g = new Gfx(ctx, env, frame, PENCIL);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  txt(g, `Bơ  /  MODEL SHEET  /  v${BO_VERSION}`, 90, 100, 64);
  txt(g, "SEVEN, SMALL FOR HER AGE, QUICK. STYLISED CANON 5.0 HEADS (A DECLARED ENLARGEMENT OF A REAL 5.9-HEAD SEVEN-YEAR-OLD), 1.15 M. MARKER COMIC HAND.", 92, 150, 22, MUTED, "left", 700);
  txt(g, "STUBBORN, A COPYCAT, NEVER GIVES UP.  EVERY FIGURE HERE IS BO.TOSCENE(POSE) FROM ONE MODULE.", 92, 184, 22, MUTED, "left", 700);

  // ---- 1 turnaround, on a head grid
  txt(g, "1  TURNAROUND", 90, 270, 34);
  const floorY = 1300, figPx = 960, cams = [0, 1, 2, 3].map((i) => fullCam(430 + i * 680, floorY, figPx));
  for (let i = 0; i <= 5; i++) { const y = project(cams[0], [0, i * BO_DIMS.hh, 0]).y; rule(g, [[150, y], [2760, y]], GRID, i === 5 ? 2 : 1.3); txt(g, String(i), 112, y + 8, 20, GRID, "left", 700); }
  [0, 40, 90, 180].forEach((yaw, i) => { renderMarker(g, bo.toScene(relaxed(yaw), cams[i]), BO_MARKER, { weight: 1.15 }); txt(g, ["FRONT", "THREE-QUARTER", "PROFILE (HER RIGHT)", "BACK"][i], 430 + i * 680, floorY + 56, 24, MUTED, "center"); });

  // the identity card: what must be present in every shot
  panel(g, 2840, 250, 690, 1120, "#fffaf0");
  txt(g, "IDENTITY", 2880, 312, 32);
  BO_FEATURES.forEach((f, i) => {
    txt(g, f.id.toUpperCase(), 2880, 372 + i * 108, 21);
    const words = f.note.toUpperCase().split(" "), lines: string[] = [""];
    words.forEach((w) => { if ((lines[lines.length - 1] + " " + w).length > 44) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w).trim(); });
    lines.slice(0, 3).forEach((ln, k) => txt(g, ln, 2880, 398 + i * 108 + k * 22, 15, MUTED, "left", 700));
  });
  // swatches: the roles as the marker hand lays them
  const sw: [string, string][] = [["skin", "SKIN"], ["hair", "HAIR"], ["shirt", "TEE"], ["shorts", "SHORTS"], ["boots", "WELLIES"], ["bag", "BAG"], ["clip", "CLIP"], ["lunchbox", "LUNCHBOX"]];
  sw.forEach(([r, n], i) => { const x = 2880 + (i % 4) * 160, y = 1352 + Math.floor(i / 4) * 0 - 0; void y; });
  g.group("plain", () => { const c = g.cur; sw.forEach(([r], i) => { const x = 2870 + i * 80, y = 1390; g.touch(x - 2, y - 2, x + 70, y + 50); c.fillStyle = BO_MARKER[r].shade; c.fillRect(x, y, 66, 46); c.fillStyle = BO_MARKER[r].base; c.fillRect(x, y, 66, 30); c.strokeStyle = COMIC_INK; c.lineWidth = 2.4; c.strokeRect(x, y, 66, 46); }); });
  sw.forEach(([, n], i) => txt(g, n, 2903 + i * 80, 1462, 11, MUTED, "center", 700));

  // ---- 2 expressions
  txt(g, "2  EXPRESSIONS", 90, 1540, 34);
  ["neutral", "happy", "laughing", "surprised", "worried", "determined"].forEach((ex, i) => {
    const x = 90 + i * 580, y = 1580, cw = 540, ch = 560;
    panel(g, x, y, cw, ch, "#fff7ea");
    clipped(ctx, env, x + 2, y + 2, cw - 4, ch - 4, () => {
      const p = base(i % 2 ? 24 : -20, { headTilt: [0, 5, -6, 0, 6, -3][i] }, BO_EXPRESSIONS[ex]), r = rigFor(BO_SPEC, p), t = add(r.joints.head, [0, 0.07, 0]);
      const cam = camera(add(t, [0, 0.03, 1.6]), t, 2500, x + cw / 2, y + ch * 0.5);
      renderMarker(g, bo.toScene(p, cam), BO_MARKER, { weight: 1.1 });
    });
    txt(g, ex.toUpperCase(), x + cw / 2, y + ch + 44, 24, MUTED, "center");
  });

  // ---- 3 poses
  txt(g, "3  POSES", 90, 2260, 34);
  const poses: [string, ReturnType<typeof relaxed>][] = [["RELAXED, THE GRIN", relaxed(-25)], ["WAVING", wave(-15, 0.8)], ["THE COPYCAT: HANDS ON HIPS", handsOnHips(-20)], ["NOT GIVING UP: TIPTOE REACH", tiptoeReach(25)], ["WALKING, CONTACT", walkContact(70)]];
  poses.forEach(([name, p], i) => {
    const x = 380 + i * 710, cam = fullCam(x, 3010, 640);
    rule(g, [[x - 300, 3012], [x + 300, 3012]], COMIC_INK, 2.5, 0.85);
    renderMarker(g, bo.toScene(p, cam), BO_MARKER, { weight: 1.1 });
    txt(g, name, x, 3070, 22, MUTED, "center");
  });
  g.paper("paper", 0.08);
};

export const boSheet: Film = { meta: { title: "Bơ model sheet (marker comic)", W, H, fps: 30, bpm: 120, durationFrames: 1 }, assets: { images: {} }, shots: [{ id: "sheet", start: 0, end: 1, draw: drawBoSheet }] };
mountFilm(boSheet);
export const __meta = boSheet.meta;

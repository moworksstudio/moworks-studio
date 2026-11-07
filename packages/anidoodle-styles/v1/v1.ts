// MW Character Sheet v1 for anidoodle's people (owner #1287-#1293): the app's own sheet and life clip for any person on the author's human
// engine (Mira, Theo, the user's own), drawn by the engine as pinned: every figure is <character>.toScene(pose) in the storybook hand, every
// pose is built with the engine's own tools (its skeleton's dims, `reach` and `stand` from balance.ts, the walk from footsteps, the named
// expressions and hands). The author's own sheets (miraSheet.ts, a character's films/sheet.ts) stay as they are; this one only lays the
// engine's figures out in the order every engine's sheet keeps:
//   Views  front, three-quarter, profile, back      Faces  neutral, happy, laugh, surprised, worried, angry, talk, blink (close on the head)
//   Poses  stand, walk, point, wave, reach, sit     Walk   four frames of one stride, in profile      Hands  the six shapes, right hand
// What the engine has no named setting for is its own weights: angry and talk are expression weights, sit puts the person on a plain stool
// (a prop of the engine's blobs, like Theo's). The cast module (./cast, written per character by the app) exports
// CAST = { name, character, spec, palette }.
import { Gfx, PENCIL, type Ctx, type Env } from "anidoodle/canvas-core/core";
import type { Film } from "anidoodle/canvas-core/film";
import { DEG, I3, add, apply, camera, mul, mv, project, type Blob, type Camera, type V3 } from "anidoodle/canvas-core/character/math3";
import type { Pose, Scene } from "anidoodle/canvas-core/character/types";
import { order, toPart, type BlobPart } from "anidoodle/canvas-core/character/build";
import { renderStorybook } from "anidoodle/canvas-core/character/render/storybook";
import { EXPRESSIONS } from "anidoodle/canvas-core/character/human/head";
import { rigFor } from "anidoodle/canvas-core/character/human/figure";
import { dimsFromCanon } from "anidoodle/canvas-core/character/human/skeleton";
import { reach, stand } from "anidoodle/canvas-core/character/human/balance";
import { planWalk, walkAt } from "anidoodle/canvas-core/character/human/walk";
import { CAST } from "./cast";

const SPEC = CAST.spec, D = dimsFromCanon(SPEC.canon, SPEC.height), HGT: number = SPEC.height, K = HGT / 1.78, AH = D.ankleH;
const PAL = { ...CAST.palette, stool: CAST.palette.stool ?? { base: "#c9955e", shade: "#94683d" } };
export const PAPER = "#f7f1e3", CELL = "#ede3cd", INK = "#3a2f28", MUTED = "#7d7164";
const ry = (yaw: number) => (v: V3): V3 => mv([Math.cos(yaw * DEG), 0, Math.sin(yaw * DEG), 0, 1, 0, -Math.sin(yaw * DEG), 0, Math.cos(yaw * DEG)], v);

// ---- the poses, from the engine's own tools
// the arms hang close to the body (owner 06/11: the first sheet held them 10 degrees out and 18 forward, off the coat): a few degrees out so
// the hand clears the hip, and a soft bend at the elbow
export const base = (yaw = 0, j: Record<string, number> = {}, ex: Record<string, number> = {}): Pose => ({ root: [0, D.root, 0], yaw, joints: { shoulderRaiseL: 4, shoulderRaiseR: 4, shoulderSwingL: 8, shoulderSwingR: 8, elbowL: 12, elbowR: 12, ...j }, expression: ex, hands: { L: "relaxed", R: "relaxed" }, plant: true });
export const FACES: Record<string, Record<string, number>> = {
  neutral: EXPRESSIONS.neutral, happy: EXPRESSIONS.happy, laugh: EXPRESSIONS.laughing, surprised: EXPRESSIONS.surprised, worried: EXPRESSIONS.worried,
  // the engine names no angry or talking face: its own weights (a hard furrow and a set mouth; the mouth open)
  angry: { browFurrow: 1, lidUpper: 0.3, smile: -0.7, mouthWide: 0.25, mouthOpen: 0.12 },
  talk: { mouthOpen: 0.5, mouthWide: -0.25, smile: 0.15 },
  blink: { lidUpper: 1 },
};
export const PLAN = planWalk({ t0: 0, s0: 0, step: 0.31 * HGT, cycle: 30, n: 40, first: "L", lateral: 0.05 * HGT });
export const walkPose = (yaw: number, f: number, ex: Record<string, number> = {}): Pose => {
  const dir: V3 = [Math.sin(yaw * DEG), 0, Math.cos(yaw * DEG)];
  return walkAt(D, PLAN, f, base(yaw, {}, ex), { origin: mul(dir, -PLAN.rootS(f)), dir }).pose;
};
// a raised arm keeps its shoulder on the coat (owner 06/11: in point, wave and reach the arm stood off the body; "pull the arm in to touch the
// body, add no detail"): the engine's coat does not follow the clavicle, so a lifted clavicle carries the sleeve's root up and out past the coat's
// shoulder. The raised side's clavicle is held a little down instead, the joint stays in the coat's shoulder.
const ARM_IN = -6;
export const wave = (yaw: number, t = 0, ex: Record<string, number> = EXPRESSIONS.happy): Pose => {
  const rock = Math.sin(t);
  return { ...base(yaw, { shoulderRaiseR: 142, shoulderSwingR: 48, shoulderTwistR: 30, elbowR: 58 + 14 * rock, pronationR: 25, wristDevR: -8 * rock, headTilt: -6, spineSide: -3, clavLiftR: ARM_IN }, ex), hands: { L: "relaxed", R: "wave" } };
};
export const point = (yaw: number): Pose => {
  const T = ry(yaw), p = base(yaw, { neckTwist: -10, headTurn: -6, clavLiftR: ARM_IN }, { browRaise: 0.3, smile: 0.35, lookX: -0.4 });
  return { ...reach(D, { ...p, joints: { ...p.joints, shoulderRaiseR: 84, shoulderSwingR: 40, elbowR: 6 } }, "R", T([-0.62 * K, 0.8 * HGT, 0.32 * K]), { elbowR: 6 }), hands: { L: "relaxed", R: "point" } };
};
export const reachUp = (yaw: number): Pose => {
  const T = ry(yaw), p = base(yaw, { spineSide: 6, neckBend: -12, headNod: -14, clavLiftR: ARM_IN, shoulderRaiseL: 4, elbowL: 14 }, { browRaise: 0.4, lookY: 0.9, mouthOpen: 0.15 });
  return { ...reach(D, { ...p, joints: { ...p.joints, shoulderRaiseR: 160, shoulderSwingR: 60, elbowR: 14 } }, "R", T([-0.08 * K, 1.16 * HGT, 0.16 * K])), hands: { L: "relaxed", R: "open" } };
};
export const STOOL_H = 0.28 * HGT;
export const sit = (yaw: number): Pose => {
  const T = ry(yaw);
  let p: Pose = { ...base(yaw, { pelvisTilt: -8, spineBend: 14, neckBend: 4, headNod: -6 }, { smile: 0.35 }), root: T([0, STOOL_H + 0.06 * HGT, -0.02 * K]), plant: false };
  p = stand(D, p, { L: T([0.16 * K, AH, 0.44 * K]), R: T([-0.15 * K, AH, 0.48 * K]) }, null, {}, 1);
  const r = rigFor(SPEC, p);
  p = reach(D, p, "L", add(r.joints.kneeL, T([-0.02 * K, 0.08 * K, -0.08 * K])));
  p = reach(D, p, "R", add(r.joints.kneeR, T([0.03 * K, 0.09 * K, -0.1 * K])));
  return { ...p, hands: { L: "relaxed", R: "relaxed" } };
};
export const stool = (yaw: number): BlobPart[] => {
  const T = ry(yaw), s = STOOL_H, w = 0.19 * K;
  const seat: Blob = { c: T([0, s - 0.03, -0.03 * K]), R: I3, r: [w, 0.03, w] };
  const legs: BlobPart[] = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2 + 0.5, top = T([Math.cos(a) * w * 0.62, s - 0.05, -0.03 * K + Math.sin(a) * w * 0.62]), foot = T([Math.cos(a) * w * 1.05, 0.012, -0.03 * K + Math.sin(a) * w * 1.05]); return { id: `mwStoolLeg${i}`, role: "stool", groups: [{ blobs: [{ c: top, R: I3, r: [0.018, 0.018, 0.018] }, { c: foot, R: I3, r: [0.015, 0.015, 0.015] }], mode: "chain" }] }; });
  return [{ id: "mwStoolSeat", role: "stool", groups: [{ blobs: [seat], mode: "each" }], depthBias: 0.02 }, ...legs];
};

// ---- drawing
const withProps = (s: Scene, cam: Camera, props: BlobPart[]): Scene => ({ ...s, parts: order([...s.parts, ...props.map((b) => toPart(cam, b))]) });
/** A camera on the whole figure: its feet on floorY, figPx tall, centred on cx. */
export const fullCam = (cx: number, floorY: number, figPx: number): Camera => { const d = 12, f = (figPx * d) / HGT; return camera([0, HGT * 0.52, d], [0, HGT * 0.52, 0], f, cx, floorY - figPx * 0.52); };
const headCam = (p: Pose, cx: number, cy: number, px: number): Camera => { const r = rigFor(SPEC, p), t = add(r.joints.head, [0, 0.45 * D.hh, 0]), d = 1.6; return camera(add(t, [0, 0.02, d]), t, (px * d) / D.hh, cx, cy); };
/** A raised arm pulled in onto the coat (owner 06/11: Mira's raised arm still stood a little off her coat; "let it lie over it a bit"): the
 *  author's coat keeps its resting shoulder while her sleeve turns about the joint, so once the arm is up the sleeve's root sits on the coat's
 *  outer corner. The arm's own parts (sleeve, upper arm, forearm, palm, fingers) are slid toward the neck on screen by a fraction of the
 *  shoulder's width, so the root lies over the coat's shoulder. Nothing is added or redrawn; a figure without the author's coat (Theo,
 *  approved as he is) is untouched. */
const ARM_PART = /^(sleeve|upperArm|foreArm|palm|thumb|index|middle|ring|little)(L|R)$/, PULL = 0.32;
function armOnCoat(p: Pose, s: Scene, cam: Camera): Scene {
  if (!s.parts.some((q) => q.id === "coat")) return s;
  const r = rigFor(SPEC, p), at = (v: V3) => { const q = project(cam, v); return [q.x, q.y] as [number, number]; };
  const shift: Record<string, [number, number]> = {};
  for (const side of ["L", "R"]) {
    if ((p.joints["shoulderRaise" + side] ?? 0) < 60) continue;
    const a = at(r.joints["shoulder" + side]), b = at(r.joints.neck ?? r.joints.chest);
    shift[side] = [(b[0] - a[0]) * PULL, Math.max(0, (b[1] - a[1]) * PULL)];
  }
  if (!Object.keys(shift).length) return s;
  const mv2 = (d: [number, number]) => (q: [number, number]): [number, number] => [q[0] + d[0], q[1] + d[1]];
  const parts = s.parts.map((q) => {
    const m = ARM_PART.exec(q.id), d = m && shift[m[2]];
    if (!d) return q;
    const f = mv2(d);
    return { ...q, polys: q.polys.map((poly) => poly.map(f)), seams: q.seams?.map((x) => ({ ...x, at: f(x.at) })),
      marks: q.marks.map((k) => (k.kind === "dot" ? { ...k, at: f(k.at) } : { ...k, pts: k.pts.map(f) })) };
  });
  return { ...s, parts };
}
export const figure = (g: Gfx, p: Pose, cam: Camera, props: BlobPart[] = []) => {
  const s = armOnCoat(p, CAST.character.toScene(p, cam), cam);
  renderStorybook(g, props.length ? withProps(s, cam, props) : s, PAL);
};

type Item = { label: string; kind: "full" | "head" | "hand"; pose: Pose; props?: BlobPart[] };
export const ROWS: { title: string; items: Item[] }[] = [
  { title: "Views", items: [["front", 0], ["three-quarter", 40], ["profile", 90], ["back", 180]].map(([l, y]) => ({ label: l as string, kind: "full" as const, pose: base(y as number) })) },
  { title: "Faces", items: Object.keys(FACES).map((f) => ({ label: f, kind: "head" as const, pose: base(15, {}, FACES[f]) })) },
  { title: "Poses", items: [
    { label: "stand", kind: "full", pose: base(20) }, { label: "walk", kind: "full", pose: walkPose(70, 60) }, { label: "point", kind: "full", pose: point(20) },
    { label: "wave", kind: "full", pose: wave(15, 0.8) }, { label: "reach", kind: "full", pose: reachUp(25) }, { label: "sit", kind: "full", pose: sit(50), props: stool(50) },
  ] },
  { title: "Walk", items: [["contact", 60], ["down", 64], ["pass", 68], ["up", 72]].map(([l, f]) => ({ label: l as string, kind: "full" as const, pose: walkPose(90, f as number) })) },
  { title: "Hands", items: ["relaxed", "open", "point", "fist", "grip", "pinch"].map((h) => ({ label: h, kind: "hand" as const, pose: { ...base(0, { shoulderRaiseR: 70, shoulderSwingR: 80, elbowR: 70, pronationR: 30, shoulderTwistR: -10 }), hands: { L: "relaxed", R: h } } })) },
];
export const CW = 300, CH = 500, PAD = 18, COLS = Math.max(...ROWS.map((r) => r.items.length));
export const ROW = CH + 84, SW = PAD * 2 + COLS * CW, SH = 80 + ROWS.length * ROW;

const drawItem = (ctx: Ctx, env: Env, g: Gfx, it: Item, x: number, y: number, w: number, h: number) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (it.kind === "full") figure(g, it.pose, fullCam(x + w / 2, y + h - 40, h * 0.66), it.props ?? []);
  else if (it.kind === "head") figure(g, it.pose, headCam(it.pose, x + w / 2, y + h * 0.44, w * 0.5));
  else {
    const r = rigFor(SPEC, it.pose), hc = apply(r.hand.R, [0, -0.4 * D.hand, 0]), d = 0.28, cam = camera(add(hc, [-0.07, 0.1, 0.24]), hc, (w * 1.15 * d) / (1.6 * D.hand), x + w / 2, y + h * 0.45);
    const s = CAST.character.toScene(it.pose, cam);
    renderStorybook(g, { ...s, parts: s.parts.filter((q) => /^(palm|thumb|index|middle|ring|little)R$/.test(q.id)), ground: null }, PAL);
  }
  ctx.restore();
};
const text = (ctx: Ctx, env: Env, t: string, x: number, y: number, font: string, color = INK) => { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = color; ctx.font = font; ctx.fillText(t, x, y); ctx.restore(); };

export const drawSheet = (ctx: Ctx, frame: number, env: Env) => {
  const g = new Gfx(ctx, env, frame, PENCIL);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, SW, SH);
  let y = 80;
  for (const r of ROWS) {
    r.items.forEach((_, i) => { ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = CELL; ctx.fillRect(PAD + i * CW + 4, y + 34, CW - 8, CH - 8); });
    y += ROW;
  }
  y = 80;
  for (const r of ROWS) { r.items.forEach((it, i) => drawItem(ctx, env, g, it, PAD + i * CW + 4, y + 34, CW - 8, CH - 8)); y += ROW; }
  g.paper("paper", 0.1);
  text(ctx, env, CAST.name, PAD, 52, "bold 34px sans-serif");
  y = 80;
  for (const r of ROWS) {
    text(ctx, env, r.title, PAD, y + 22, "bold 22px sans-serif");
    r.items.forEach((it, i) => text(ctx, env, it.label, PAD + i * CW + 8, y + 34 + CH + 18, "18px sans-serif", MUTED));
    y += ROW;
  }
};
export const sheetFilm: Film = { meta: { title: `${CAST.name}: MW Character Sheet v1`, W: SW, H: SH, fps: 30, bpm: 120, durationFrames: 1 }, assets: { images: {} }, shots: [{ id: "sheet", start: 0, end: 1, draw: drawSheet }] };

// ---- the life clip, 6 s at 30 fps: idle with a blink (0-1.5 s), a turn all the way round (1.5-3.5), a walk in profile (3.5-5), a talk with a wave (5-6)
export const LW = 720, LH = 1200, LIFE_FRAMES = 180;
const ease = (u: number) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };
export const lifePose = (f: number): Pose => {
  const t = f / 30, breath = Math.sin(t * Math.PI * 2 * 0.4);
  if (t < 1.5) { const p = base(10, { spineBend: 1.2 * breath, headTilt: 2 * breath }, { smile: 0.2, lidUpper: t > 0.8 && t < 0.95 ? Math.sin(((t - 0.8) / 0.15) * Math.PI) : 0 }); return p; }
  if (t < 3.5) return base(10 + 360 * ease((t - 1.5) / 2), { spineBend: 1.2 * breath }, { smile: 0.2 + 0.5 * Math.sin(((t - 1.5) / 2) * Math.PI) });
  if (t < 5) return walkPose(90, 30 + (t - 3.5) * 30, { smile: 0.25 });
  const talk = 0.5 * Math.max(0, Math.sin(t * Math.PI * 2 * 4));
  return wave(15, (t - 5) * 9, { smile: 0.55, cheek: 0.4, mouthOpen: talk, mouthWide: -0.2 });
};
export const drawLife = (ctx: Ctx, f: number, env: Env) => {
  const g = new Gfx(ctx, env, f, PENCIL);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, LW, LH);
  figure(g, lifePose(f), fullCam(LW / 2, LH - 90, LH * 0.7));
  g.paper("paper", 0.1);
};
export const lifeFilm: Film = { meta: { title: `${CAST.name}: life clip`, W: LW, H: LH, fps: 30, bpm: 120, durationFrames: LIFE_FRAMES }, assets: { images: {} }, shots: [{ id: "life", start: 0, end: LIFE_FRAMES, draw: drawLife }] };

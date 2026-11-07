// Inner Voice Short's hero and its shadow on the house sheet (owner #1287-#1293): drawn by the Story source skill's own hero() and shadowFigure() as
// shipped (src/inner-voice/kit.js: the cream bean, its face, its two-bone limbs; the black silhouette with its red glow). What the kit does not draw,
// the app adds in its hand, as little as it takes:
//   the hero    views: front, three-quarter and profile are its own face turn (face.turn 0, 0.5, 1); back is its body with no face. Faces: its own
//               eyes, brows and mouths. Poses: its own limbs placed by their targets (hands and feet): point, wave, reach, sit (on a stool, the
//               only drawing added), and a walk (feet and hands swinging on a cycle: the kit has no walk of its own)
//   the shadow  views as the hero's (its eyes slide with look; from behind, none). Its only face is the kit's two slits and a smile (neutral);
//               the seven others are the app's, in the same glowing red line. Poses as the hero's, by its hands and feet
import { P, hero, shadowFigure } from "mw-house-kit";

export const ENGINE = "inner-voice-short";
export const GROUND = "#efe6d6", CELL = "#e2d6c2", INK = "#241726";
// the kit slides the face by its turn (22 units a turn): three-quarter and profile slide it further, so the turn reads
const TURN = { front: 0, "three-quarter": 0.8, profile: 1.6, back: 0 };
const HANG = [{ hand: [-52, 64], bend: -1 }, { hand: [52, 64], bend: 1, front: true }];
const FACES = {
  neutral: { eyes: "dot", mouth: "line" }, happy: { eyes: "dot", mouth: "smile" }, laugh: { eyes: "squeeze", mouth: "smile", browUp: 6 },
  surprised: { eyes: "wide", brows: "flat", browUp: 8, mouth: "o" }, worried: { eyes: "dot", brows: "worried", mouth: "wavy" }, angry: { eyes: "dot", brows: "angry", mouth: "frown" },
  talk: { eyes: "dot", mouth: "o" }, blink: { eyes: "dot", mouth: "line", blink: 1 },
};
/** The hero's colours a record shows (the kit's own palette). */
export const palette = (o) => (o.figure === "shadow" ? { body: "#030202", glow: P.redGlow, eyes: P.redEye } : { skin: P.skin, shade: P.skinShade, ink: P.ink });

/** Limb targets for a pose, in hip-local space (y down; the feet at y = 178 standing). */
function limbs(pose, phase, wave) {
  const ph = (phase ?? 0) * Math.PI * 2, s = Math.sin(ph);
  if (pose === "walk") return { legs: [{ foot: [-52 * s - 4, 178 - Math.max(0, 22 * Math.sin(ph + Math.PI / 2))], toe: -1 }, { foot: [52 * s + 4, 178 - Math.max(0, -22 * Math.sin(ph + Math.PI / 2))], toe: 1 }],
    arms: [{ hand: [-52 + 30 * s, 60], bend: -1 }, { hand: [52 - 30 * s, 60], bend: 1, front: true }] };
  if (pose === "point") return { arms: [HANG[0], { hand: [170, -150], bend: 1, front: true }] };
  if (pose === "wave") return { arms: [HANG[0], { hand: [96 + (wave != null ? 14 * Math.sin(wave * 9) : 0), -300], bend: 1, front: true }] };
  if (pose === "reach") return { arms: [HANG[0], { hand: [150, -250], bend: 1, front: true }] };
  if (pose === "sit") return { drop: 86, legs: [{ foot: [-22, 92], knee: [-30, 6], toe: -1 }, { foot: [24, 92], knee: [32, 6], toe: 1 }], arms: [{ hand: [-40, -10], bend: -1 }, { hand: [40, -10], bend: 1, front: true }] };
  return { arms: HANG };
}

/** The shadow's face in the kit's glowing red line: the kit's own for neutral, the app's for the others. */
function shadowFace(g, hx, hy, s, face, look) {
  const k = s, eye = (dx) => hx + dx * k + look * 14 * k;
  g.save();
  g.strokeStyle = P.redEye; g.fillStyle = P.redEye; g.lineWidth = 5.5 * k; g.lineCap = "round";
  g.shadowColor = P.redHot; g.shadowBlur = 12 * k;
  const ln = (pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); };
  const arc = (cx, cy, r, a0, a1) => { g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); };
  const ey = hy - 6 * k, my = hy + 28 * k, mx = hx + look * 14 * k;
  for (const side of [-1, 1]) {
    const ex = eye(side * 24);
    if (face === "happy" || face === "laugh") arc(ex, ey + 6 * k, 11 * k, Math.PI * 1.15, Math.PI * 1.85);
    else if (face === "surprised") { g.beginPath(); g.arc(ex, ey, 8 * k, 0, Math.PI * 2); g.stroke(); }
    else if (face === "blink") ln([[ex - 11 * k, ey + 2 * k], [ex + 11 * k, ey + 2 * k]]);
    else if (face === "worried") ln([[ex - 12 * k * side, ey - 4 * k], [ex + 12 * k * side, ey + 4 * k]].map(([x, y]) => [x, y]).reverse());
    else if (face === "angry") ln([[ex - 12 * k * side, ey + 5 * k], [ex + 12 * k * side, ey - 5 * k]]);
    else ln([[ex - 12 * k, ey], [ex + 12 * k, ey]]);
  }
  if (face === "laugh") { g.beginPath(); g.moveTo(mx - 16 * k, my - 4 * k); g.quadraticCurveTo(mx, my + 22 * k, mx + 16 * k, my - 4 * k); g.closePath(); g.fill(); }
  else if (face === "surprised" || face === "talk") { g.beginPath(); g.ellipse(mx, my + 2 * k, 7 * k, 9 * k, 0, 0, Math.PI * 2); g.stroke(); }
  else if (face === "worried") { g.beginPath(); g.moveTo(mx - 14 * k, my + 4 * k); g.quadraticCurveTo(mx - 7 * k, my - 4 * k, mx, my + 4 * k); g.quadraticCurveTo(mx + 7 * k, my + 12 * k, mx + 14 * k, my + 4 * k); g.stroke(); }
  else if (face === "angry") arc(mx, my + 14 * k, 14 * k, Math.PI * 1.2, Math.PI * 1.8);
  else arc(mx, my - 8 * k, 14 * k, Math.PI * 0.2, Math.PI * 0.8);
  g.restore();
}

/** Draw the figure in the 600 x 1000 design box, its feet at (300, 975). spec: { view, face, pose, phase, t, wave }. */
export function draw(g, opts, spec) {
  const view = spec.view ?? "front", back = view === "back", L = limbs(spec.pose, spec.phase, spec.wave), drop = L.drop ?? 0, stool = spec.pose === "sit";
  if (opts.figure === "shadow") {
    const s = 1.2, x = 300, y = 975 + drop * s, look = TURN[view];
    if (stool) { g.fillStyle = "#3a2c22"; g.fillRect(x - 60, 975 - 112, 120, 18); g.fillRect(x - 52, 975 - 94, 12, 94); g.fillRect(x + 40, 975 - 94, 12, 94); }
    const feet = L.legs ? L.legs.map((l) => [l.foot[0] * 1.15, (l.foot[1] - 178) * 1.15]) : undefined;
    // the silhouette's own frame (its shoulders at y = -386 over the floor): its hands for each pose
    const SH = { point: [210, -392], wave: [96 + (spec.wave != null ? 14 * Math.sin(spec.wave * 9) : 0), -610], reach: [180, -560] }[spec.pose];
    const arms = spec.pose === "walk" ? L.arms.map((a) => ({ hand: [a.hand[0] * 1.2, -200], bend: a.bend })) : spec.pose === "sit" ? [{ hand: [-60, -120], bend: -1 }, { hand: [60, -120], bend: 1 }]
      : SH ? [{ hand: [-70, -200], bend: -1 }, { hand: SH, bend: 1 }] : undefined;
    const kitFace = !back && (spec.face ?? "neutral") === "neutral";
    shadowFigure(g, { x, y, s, t: spec.t ?? 0, look, headX: look * 10, eyes: kitFace ? 1 : 0, feet, arms });
    if (!back && !kitFace) shadowFace(g, x + look * 10 * s, y - 478 * s, s, spec.face, look);
    return;
  }
  const s = 1.55, x = 300, y = 975 - 178 * s + drop * s;
  if (stool) { g.fillStyle = "#8c6945"; g.fillRect(x - 64, y + 8 * s, 128, 16); g.fillStyle = "#5a432d"; g.fillRect(x - 56, y + 24 * s, 12, 975 - y - 24 * s); g.fillRect(x + 44, y + 24 * s, 12, 975 - y - 24 * s); }
  const face = back ? { eyes: "none", mouth: "none", brows: "none" } : { ...(FACES[spec.face ?? "neutral"] ?? FACES.neutral), turn: TURN[view] };
  hero(g, { ...opts, x, y, s, breathe: spec.t ?? 0, face, legs: L.legs, arms: L.arms });
}


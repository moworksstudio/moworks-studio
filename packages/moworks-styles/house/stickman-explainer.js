// The Stickman Explainer's hoodie hero on the house sheet (owner #1287-#1293): drawn by the Story source skill's own figure() as shipped
// (src/stickman/kit.js: its body, hoodie, hood, faces, walk), the sheet's views, faces and poses chosen from its own options; the app adds no drawing.
//   views  front (face.look 0), three-quarter (0.5), profile (1: the kit's turned face), back (no face, the hood seen from behind)
//   faces  the kit's eyes, brows and mouths: happy = happy + smile, laugh = happy + grin, surprised = wide + o, worried = its "confident"
//          brows (they read as the inner end lifted) + o, angry = its "worried" brows (the inner end pressed down) + a flat mouth, talk = an
//          open "o" by turns, blink = its lid
//   poses  the kit's own STAND, walk(phase), and arm and leg angles on it (point, wave, reach; sit: the thighs level, the shins down)
import { C, STAND, armIK, figure, walk } from "mw-house-kit";

export const ENGINE = "stickman-explainer";
export const GROUND = "#f3ead8", CELL = "#e6dcc6", INK = "#241726";
const FACES = {
  neutral: { eyes: "dot", mouth: "flat" }, happy: { eyes: "happy", mouth: "smile" }, laugh: { eyes: "happy", mouth: "grin" },
  surprised: { eyes: "wide", mouth: "o" }, worried: { eyes: "dot", brows: "confident", mouth: "o" }, angry: { eyes: "dot", brows: "worried", mouth: "flat" },
  talk: { eyes: "dot", mouth: "o" }, blink: { eyes: "dot", mouth: "flat", blink: 1 },
};
const LOOK = { front: 0, "three-quarter": 0.5, profile: 1, back: 0 };
// the kit's own body numbers (src/stickman/kit.js: shoulders 208 over the hips, a hoodie's shoulders 30 wide, thighs 150) for the sitting hands
const SH_UP = 208, SH_W = 30, THIGH = 150;
/** Sitting: the thighs level, the hands resting on them; each arm solved by the kit's armIK with the elbow bent down and back, under the line
 *  from shoulder to hand (the anatomy gate's rule, G-anatomy #1254; with the other bend the elbow points forward, an arm bent the wrong way). */
function sitPose(look) {
  const sx = SH_W * (1 - 0.55 * Math.abs(look)), legL = [88, 88], legR = [84, 84];
  const kneeL = [-9 + THIGH * Math.sin(legL[0] * Math.PI / 180), 0], kneeR = [9 + THIGH * Math.sin(legR[0] * Math.PI / 180), 0];
  // the hands on the thighs, a little short of the knees; the shoulder is SH_UP over the hip, the thigh at the hip's height
  return { legL, legR, bob: 150, armL: armIK(kneeL[0] * 0.66 + sx, SH_UP - 6, -1), armR: armIK(kneeR[0] * 0.88 - sx, SH_UP - 10, -1) };
}
const POSES = {
  // reach: the forearm folds a little forward (it was bent 6 degrees back, the elbow above the line from shoulder to hand)
  stand: {}, point: { armR: [86, -2] }, wave: { armR: [150, 30] }, reach: { armR: [116, 4] },
};
/** The hero's colours a record shows. */
export const palette = (o) => ({ body: "#0a080c", hoodie: o.outfit?.hoodie ?? "#2f6fe0", strings: o.outfit?.strings ?? "#dfe7f5", ...(o.shoes ? { shoes: o.shoes } : {}) });

// A new Stickman character (owner #1302: the source skill makes "a new look per video" from outfit / build / hair / shoes on the same rig) is
// only these options of figure(), as its SKILL.md lists them: outfit { hoodie, dark, shade, strings } (colours), build "muscular", hair "quiff" or
// "bun", shoes (a colour). The gate holds a character file to them.
const HEX = /^#[0-9a-f]{6}$/i, OPT_KEYS = ["outfit", "build", "hair", "shoes"], OUTFIT_KEYS = ["hoodie", "dark", "shade", "strings"];
/** The gate's lines on a character's opts (PASS / FAIL …); an original (an id without moworks-) must differ from the shipped hero's look. */
export function optsLines(o = {}, id = "") {
  const out = [], ok = (p, w, why = "") => out.push(`${p ? "PASS" : "FAIL"}  ${w}${!p && why ? `: ${why}` : ""}`);
  const odd = Object.keys(o).filter((k) => !OPT_KEYS.includes(k));
  ok(!odd.length, `opts: only the source skill's look options (${OPT_KEYS.join(", ")})`, odd.join(", "));
  const fit = o.outfit ?? {}, badFit = Object.keys(fit).filter((k) => !OUTFIT_KEYS.includes(k) || !HEX.test(String(fit[k])));
  ok(!badFit.length, `opts.outfit: the hoodie's colours as #rrggbb (${OUTFIT_KEYS.join(", ")})`, badFit.map((k) => `${k} ${fit[k]}`).join(", "));
  ok(o.build == null || o.build === "muscular", 'opts.build: "muscular" or none', `build ${o.build}`);
  ok(o.hair == null || o.hair === "quiff" || o.hair === "bun", 'opts.hair: "quiff", "bun" or none', `hair ${o.hair}`);
  ok(o.shoes == null || HEX.test(String(o.shoes)), "opts.shoes: a colour as #rrggbb, or none", `shoes ${o.shoes}`);
  if (!String(id).startsWith("moworks-")) ok(!!(fit.hoodie || o.build || o.hair || o.shoes), "an original: not the shipped Hoodie Hero's look (a hoodie colour, a build, hair or shoes of its own)");
  return out;
}

/** The kit's pose for a cell: STAND with the cell's pose over it. */
function poseOf(spec) {
  const view = spec.view ?? "front";
  let pose = { ...STAND, ...(spec.pose === "sit" ? sitPose(LOOK[view] ?? 0) : POSES[spec.pose] ?? {}) };
  if (spec.pose === "walk") pose = { ...pose, ...walk((spec.phase ?? 0) * Math.PI * 2) };
  if (spec.pose === "wave" && spec.wave != null) pose = { ...pose, armR: [150, 30 + 18 * Math.sin(spec.wave * 9)] };
  return pose;
}
/** Where the arms are, for the anatomy gate (the kit's own geometry, src/stickman/kit.js: a limb's angle 0 points down, 90 toward +x, the upper
 *  arm 124 long, the forearm 118, the shoulders 208 over the hips): in profile the hero faces +x, so a forearm folds forward when its angle
 *  grows; in front, the shoulder, elbow and hand in the design box. */
export function limbs(spec) {
  const view = spec.view ?? "front", P = poseOf(spec), out = [];
  if (view === "profile") { for (const k of ["armL", "armR"]) out.push({ name: k === "armL" ? "the left arm" : "the right arm", view: "side", flex: P[k][1] }); return out; }
  const D = (a) => [Math.sin(a * Math.PI / 180), Math.cos(a * Math.PI / 180)], turn = 1 - 0.55 * Math.abs(LOOK[view] ?? 0);
  const hipY = 975 - 290 + (P.bob ?? 0), shY = hipY - SH_UP + 4;
  for (const [k, sx] of [["armL", -SH_W * turn], ["armR", SH_W * turn]]) {
    const [a, b] = P[k], sh = [300 + sx, shY], u = D(a), f = D(a + b), el = [sh[0] + u[0] * 124, sh[1] + u[1] * 124];
    out.push({ name: k === "armL" ? "the left arm" : "the right arm", view: "front", sh, el, hand: [el[0] + f[0] * 118, el[1] + f[1] * 118] });
  }
  return out;
}

/** Draw the hero in the 600 x 1000 design box, its feet at (300, 975). spec: { view, face, pose, phase, t, wave }. */
export function draw(g, opts, spec) {
  const view = spec.view ?? "front", back = view === "back";
  const pose = poseOf(spec);
  const face = back ? { eyes: "none", mouth: "none" } : { ...(FACES[spec.face ?? "neutral"] ?? FACES.neutral), look: LOOK[view] ?? 0 };
  // from behind the drawstrings (on the hoodie's front) do not show: drawn in the hoodie's own colour
  const outfit = back ? { ...(opts.outfit ?? {}), strings: opts.outfit?.hoodie ?? "#2f6fe0" } : opts.outfit;
  // sitting: a plain stool of the kit's own wood under the hips (the only drawing the app adds)
  const S = 1.0;
  if (spec.pose === "sit") { const top = 975 - (290 - 150) * S; g.fillStyle = C.woodDark; g.fillRect(300 - 44 * S, top + 10 * S, 10 * S, 975 - top - 10 * S); g.fillRect(300 + 30 * S, top + 10 * S, 10 * S, 975 - top - 10 * S); g.fillStyle = C.wood; g.fillRect(300 - 56 * S, top, 112 * S, 16 * S); }
  figure(g, { tone: "hero", ...opts, outfit, x: 300, y: 975, s: S, pose, face });
}


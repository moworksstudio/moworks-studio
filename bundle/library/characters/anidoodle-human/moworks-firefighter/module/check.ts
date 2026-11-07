// THE FIREFIGHTER'S GATE, bundled and run by tools/gate.mjs. Holds the character to its
// invariants (the author's checks in character/check.ts, plus the ones this character adds: the
// value of its white / charcoal / black roles, and the face never showing outside the visor),
// then runs the NEGATIVE twins: a gate that has never been seen to fail proves nothing.
import type { P } from "anidoodle/canvas-core/core";
import { apply, camera } from "anidoodle/canvas-core/character/math3";
import type { Pose, Scene } from "anidoodle/canvas-core/character/types";
import { CANON } from "anidoodle/canvas-core/character/human/canon";
import { SIDES, limitViolations } from "anidoodle/canvas-core/character/human/skeleton";
import { checkPose, rigFor } from "anidoodle/canvas-core/character/human/figure";
import { edgeDist, insidePoly } from "anidoodle/canvas-core/character/shape2d";
import { canonChecks, featureChecks, handChecks, paletteChecks, poseChecks, type Result } from "anidoodle/canvas-core/character/check";
import { FF_FEATURES, FF_ROLES, FF_SPEC, FF_VALUES, firefighter, firefighterScene } from "./characters/moworks-firefighter";
import { FF_MARKER, FF_STORYBOOK } from "./characters/moworks-firefighter/palettes";
import * as FP from "./characters/moworks-firefighter/poses";

const R = (id: string, ok: boolean, detail: string): Result => ({ id, ok, detail });
const lightness = (hex: string) => { const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255); return (Math.max(...c) + Math.min(...c)) / 2; };
// value-defined roles: the white helmet, the silver stripe, the charcoal gloves, the black boots
const valueChecks = (name: string, values: Record<string, [number, number]>, hands: Record<string, Record<string, string>>): Result[] =>
  Object.entries(values).map(([role, [lo, hi]]) => {
    const got = Object.entries(hands).map(([hand, m]) => { const c = m[role]; if (!c) return `${hand}: UNMAPPED`; const L = lightness(c); return `${hand} ${c} L${L.toFixed(2)}${L >= lo && L <= hi ? "" : " OUT"}`; });
    return R(`${name}.value.${role}`, got.every((s) => !s.includes("OUT") && !s.includes("UNMAPPED")), `lightness [${lo}-${hi}]: ${got.join(" | ")}`);
  });
// the face is seen only through the glass: every point of the skin, hair and features inside the visor window
const FACE_PARTS = ["head", "nose", "hair", "fringe", "neck"];
const faceInVisor = (name: string, views: [number, Scene][]): Result[] => views.map(([yaw, s]) => {
  const win = s.parts.find((q) => q.id === "visorIn")?.polys[0], pts: P[] = s.parts.filter((q) => FACE_PARTS.includes(q.id)).flatMap((q) => [...q.polys.flat(), ...q.marks.flatMap((m) => (m.kind === "dot" ? [m.at] : m.pts))]);
  const out = pts.filter((p) => !win || (!insidePoly(win, p[0], p[1]) && edgeDist(win, p) > 1.5)).length;
  return R(`${name}.faceInVisor.yaw${yaw}`, out === 0, `${pts.length} face points, ${out} outside the visor window${win ? "" : " (visor turned away)"}`);
});
// a film's planted feet: heel and ball samples on the floor must not slide between frames
const plantedFeet = (name: string, poseAt: (f: number) => Pose, n: number): Result[] => {
  let bad = 0, maxSlide = 0, at = -1, below = 0, prev: Record<string, [number, number, number]> | null = null;
  for (let f = 0; f < n; f++) {
    const p = poseAt(f); bad += limitViolations(p.joints).length ? 1 : 0;
    const r = rigFor(FF_SPEC, p), d = r.dims, pts: Record<string, [number, number, number]> = {};
    SIDES.forEach((s) => { pts[s + "h"] = apply(r.foot[s], [0, -d.ankleH, -d.heel * 0.9]); pts[s + "b"] = apply(r.toes[s], [0, -d.ankleH * 0.15, 0]); });
    Object.values(pts).forEach((q) => { if (q[1] < -0.004) below++; });
    if (prev) for (const k of Object.keys(pts)) { const a = prev[k], b = pts[k]; if (a[1] < 0.004 && b[1] < 0.004) { const sl = Math.hypot(a[0] - b[0], a[2] - b[2]); if (sl > maxSlide) { maxSlide = sl; at = f; } } }
    prev = pts;
  }
  return [
    R(`${name}.limits`, bad === 0, `${bad} of ${n} frames outside the range of motion`),
    R(`${name}.plantedFeetStay`, maxSlide < 0.004, `a planted heel or ball moves at most ${(maxSlide * 1000).toFixed(1)} mm in a frame (frame ${at}); < 4 mm passes`),
    R(`${name}.noFootThroughFloor`, below === 0, `${below} foot-point samples more than 4 mm under the floor`),
  ];
};

export const run = () => {
  const out: { section: string; results: Result[] }[] = [], sec = (section: string, results: Result[]) => out.push({ section, results });
  // ---- proportions
  sec("FIREFIGHTER canon (adult, realistic 7.5 heads, 1.80 m)", canonChecks(CANON.adult, FF_SPEC.height));
  // ---- the pose library: limits, bones, balance, floor
  const plant = (p: Pose) => rigFor(FF_SPEC, p);
  sec("FIREFIGHTER poses", poseChecks("ff", CANON.adult, FF_SPEC.height, [
    ["relaxed", FP.relaxed(0)], ["relaxed3q", FP.relaxed(-40)], ["wave", FP.wave(-15, 0.8)], ["thumbsUp", FP.thumbsUp(-30)], ["hoseBrace", FP.hoseBrace(35)], ["walkContact", FP.walkContact(70), { dynamic: true }],
  ], plant));
  // ---- hands (in gloves: the same skeleton, thicker)
  sec("HANDS", handChecks("ff", plant(FP.relaxed(0)), FP.FF_DIMS.hand));
  // ---- identity across views (ten views, both sides)
  const cam = camera([0, 1.0, 8], [0, 0.95, 0], 3000, 500, 500), views: [number, Scene][] = [0, 20, 40, 60, 90, 120, 150, 180, -40, -90].map((y) => [y, firefighter.toScene(FP.relaxed(y), cam)]);
  sec("FIREFIGHTER identity per view", featureChecks("ff", FF_FEATURES, views));
  sec("FIREFIGHTER face only through the visor", faceInVisor("ff", views));
  const s1 = JSON.stringify(firefighter.toScene(FP.wave(-15, 0.8), cam).parts.map((p) => [p.id, p.polys])), s2 = JSON.stringify(firefighter.toScene(FP.wave(-15, 0.8), cam).parts.map((p) => [p.id, p.polys]));
  sec("FIREFIGHTER determinism", [R("ff.scene.deterministic", s1 === s2, `scene geometry for one pose, built twice: ${s1 === s2 ? "identical" : "DIFFERENT"} (${s1.length} chars)`)]);
  // ---- palette roles, per hand
  const base = (p: Record<string, { base: string }>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.base]));
  const hands = { marker: base(FF_MARKER), storybook: base(FF_STORYBOOK) };
  sec("FIREFIGHTER palette roles in two hands (hue families)", paletteChecks("ff", FF_ROLES, hands));
  sec("FIREFIGHTER palette roles in two hands (values)", valueChecks("ff", FF_VALUES, hands));
  // ---- the walk film, every frame
  sec("FIREFIGHTER film: the walk, all 90 frames", plantedFeet("walk", FP.walkPose, 90));

  // ---- NEGATIVE twins: each must throw or fail
  const neg: Result[] = [];
  const expectThrow = (id: string, fn: () => void) => { try { fn(); neg.push(R(id, false, "did NOT throw: the gate is blind here")); } catch (e) { neg.push(R(id, true, `threw as it must: ${String((e as Error).message).split("\n")[1]?.trim() ?? (e as Error).message}`)); } };
  expectThrow("neg.elbow170", () => firefighter.pose({ ...FP.relaxed(0), joints: { elbowR: 170 } }));
  expectThrow("neg.kneeBackwards", () => firefighter.pose({ ...FP.relaxed(0), joints: { kneeL: -15 } }));
  expectThrow("neg.wristCone", () => checkPose({ ...FP.relaxed(0), joints: { wristFlexL: 70, wristDevL: 30 } }));
  expectThrow("neg.thumbBentBack", () => checkPose({ ...FP.relaxed(0), hands: { R: { angles: { ...FP.THUMBS_UP, thumb: [38, 6, -30, -6] } } } }));
  const toppling: Pose = { ...FP.relaxed(0), pitch: 20, plant: true };
  const bb = poseChecks("neg", CANON.adult, FF_SPEC.height, [["toppling", toppling]], plant).find((r) => r.id.endsWith("balance"))!;
  neg.push(R("neg.fallingOver", !bb.ok, `a stiff figure tipped 20 deg forward must fail balance: ${bb.ok ? "PASSED (gate blind)" : "failed as it must: " + bb.detail}`));
  const blue = paletteChecks("neg", { coat: FF_ROLES.coat }, { wrong: { coat: "#2f5fd0" } })[0];
  neg.push(R("neg.coatTurnedBlue", !blue.ok, `a blue coat must fail the red role: ${blue.ok ? "PASSED (gate blind)" : "failed as it must"}`));
  const orange = paletteChecks("neg", { coat: FF_ROLES.coat }, { wrong: { coat: "#f07a1a" } })[0];
  neg.push(R("neg.coatTurnedOrange", !orange.ok, `an orange coat must fail the red role: ${orange.ok ? "PASSED (gate blind)" : "failed as it must"}`));
  const greyHelmet = valueChecks("neg", { helmet: FF_VALUES.helmet }, { wrong: { helmet: "#8c939b" } })[0];
  neg.push(R("neg.helmetTurnedGrey", !greyHelmet.ok, `a grey helmet must fail the white value: ${greyHelmet.ok ? "PASSED (gate blind)" : "failed as it must"}`));
  const brownBoots = valueChecks("neg", { boots: FF_VALUES.boots }, { wrong: { boots: "#7e4c2b" } })[0];
  neg.push(R("neg.bootsTurnedBrown", !brownBoots.ok, `brown boots must fail the black value: ${brownBoots.ok ? "PASSED (gate blind)" : "failed as it must"}`));
  const front = views[0][1], drop = (ids: string[]) => ({ ...front, parts: front.parts.filter((p) => !ids.includes(p.id)) });
  const noVisor = featureChecks("neg", FF_FEATURES, [[0, drop(["visor"])]])[0];
  neg.push(R("neg.visorMissing", !noVisor.ok, `a front view without the visor must fail identity: ${noVisor.ok ? "PASSED (gate blind)" : noVisor.detail}`));
  const noBands = featureChecks("neg", FF_FEATURES, [[0, drop(["bandHem", "bandChest", "bandSleeveL", "bandSleeveR", "bandLegL", "bandLegR"])]])[0];
  neg.push(R("neg.bandsMissing", !noBands.ok, `a front view without the reflective bands must fail identity: ${noBands.ok ? "PASSED (gate blind)" : noBands.detail}`));
  const unclipped = faceInVisor("neg", [[0, firefighterScene(FP.relaxed(0), cam, { clip: false })], [180, firefighterScene(FP.relaxed(180), cam, { clip: false })]]);
  neg.push(R("neg.faceOutsideVisor", unclipped.some((r) => !r.ok), `the head drawn without the visor clip must fail: ${unclipped.map((r) => r.detail).join(" / ")}`));
  const sliding = plantedFeet("neg", (f) => { const p = FP.walkPose(f); return { ...p, root: [p.root[0] + f * 0.006, p.root[1], p.root[2]] }; }, 90).find((r) => r.id.endsWith("plantedFeetStay"))!;
  neg.push(R("neg.footSkate", !sliding.ok, `the walk dragged 6 mm a frame must fail the planted-feet check: ${sliding.ok ? "PASSED (gate blind)" : sliding.detail}`));
  sec("NEGATIVE TWINS (each must be caught)", neg);
  return out;
};

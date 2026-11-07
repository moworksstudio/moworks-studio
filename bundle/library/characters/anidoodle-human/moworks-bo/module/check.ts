// BƠ'S GATE. Holds her to her invariants (canon, joint limits, balance, hands, identity per view,
// palette roles in the marker hand, the walk's planted feet), then runs the NEGATIVE twins: a gate
// that has never been seen to fail proves nothing.
import { apply, camera } from "anidoodle/canvas-core/character/math3";
import type { Pose, Scene } from "anidoodle/canvas-core/character/types";
import { SIDES, limitViolations } from "anidoodle/canvas-core/character/human/skeleton";
import { checkPose, rigFor } from "anidoodle/canvas-core/character/human/figure";
import { canonChecks, featureChecks, handChecks, poseChecks, type Result } from "anidoodle/canvas-core/character/check";
import { bo, BO_FEATURES, BO_ROLES, type BoRole } from "./characters/moworks-bo";
import { BO_CANON, BO_REAL_HEADS, BO_SPEC } from "./characters/moworks-bo/spec";
import * as BP from "./characters/moworks-bo/poses";
import { BO_MARKER } from "./characters/moworks-bo/palettes";
import { WALK_FRAMES, boWalkAt } from "./characters/moworks-bo/walk";

// ---- colour: hue (degrees), saturation and lightness (HSL), for the role checks
const hsl = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let h = 0; if (d > 1e-6) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return { h, s: d < 1e-6 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};
const inHue = (h: number, [a, b]: [number, number]) => (a <= b ? h >= a && h <= b : h >= a || h <= b);
// a role holds in a hand when its colour is in the hue family AND, where the role says so, in its lightness band
export const roleChecks = (name: string, roles: Record<string, BoRole>, hands: Record<string, Record<string, string>>): Result[] => Object.entries(roles).map(([role, spec]) => {
  const got = Object.entries(hands).map(([hand, m]) => {
    const c = m[role]; if (!c) return { ok: false, s: `${hand}: UNMAPPED` };
    const { h, l } = hsl(c), hueOk = inHue(h, spec.hue), lOk = !spec.light || (l >= spec.light[0] && l <= spec.light[1]);
    return { ok: hueOk && lOk, s: `${hand} ${c} ${Math.round(h)}deg L${l.toFixed(2)}${hueOk ? "" : " HUE OUT"}${lOk ? "" : " LIGHTNESS OUT"}` };
  });
  return { id: `${name}.palette.${role}`, ok: got.every((x) => x.ok), detail: `${spec.family} [${spec.hue.join("-")}${spec.light ? `, L ${spec.light.join("-")}` : ""}]: ${got.map((x) => x.s).join(" | ")}` };
});

// ---- the walk: every frame inside the limits, planted heels and balls do not slide, nothing under the floor
export const walkChecks = (name: string, at: (f: number) => Pose, frames: number): Result[] => {
  let bad = 0, maxSlide = 0, where = -1, below = 0, planted = 0; let prev: Record<string, number[]> | null = null;
  for (let f = 0; f < frames; f++) {
    const p = at(f); bad += limitViolations(p.joints).length ? 1 : 0;
    const r = rigFor(BO_SPEC, p), d = r.dims, pts: Record<string, number[]> = {};
    SIDES.forEach((s) => { pts[s + "heel"] = apply(r.foot[s], [0, -d.ankleH, -d.heel * 0.9]); pts[s + "ball"] = apply(r.toes[s], [0, -d.ankleH * 0.15, 0]); });
    Object.values(pts).forEach((q) => { if (q[1] < -0.004) below++; });
    if (prev) for (const k of Object.keys(pts)) { const a = prev[k], b = pts[k]; if (a[1] < 0.004 && b[1] < 0.004) { planted++; const sl = Math.hypot(a[0] - b[0], a[2] - b[2]); if (sl > maxSlide) { maxSlide = sl; where = f; } } }
    prev = pts;
  }
  return [
    { id: `${name}.limits`, ok: bad === 0, detail: `${bad} of ${frames} frames outside the range of motion` },
    { id: `${name}.plantedFeetStay`, ok: planted >= frames / 2 && maxSlide < 0.004, detail: `${planted} planted foot-point frame pairs; one moves at most ${(maxSlide * 1000).toFixed(1)} mm in a frame (frame ${where}); < 4 mm passes` },
    { id: `${name}.noFootThroughFloor`, ok: below === 0, detail: `${below} foot-point samples more than 4 mm under the floor` },
  ];
};

export const run = () => {
  const out: { section: string; results: Result[] }[] = [], sec = (section: string, results: Result[]) => out.push({ section, results });
  // ---- proportions: the declared 5.0-head row, its body measured against a real 5.9-head seven-year-old
  sec(`BƠ canon (${BO_CANON.label})`, canonChecks(BO_CANON, BO_SPEC.height, BO_REAL_HEADS));
  // ---- the pose library: limits, bone lengths, balance, floor
  const plant = (p: Pose) => rigFor(BO_SPEC, p);
  const library: [string, Pose, { dynamic?: boolean }?][] = [
    ["relaxed", BP.relaxed(0)], ["relaxed3q", BP.relaxed(40)], ["wave", BP.wave(-15, 0.8)], ["handsOnHips", BP.handsOnHips(-20)], ["tiptoeReach", BP.tiptoeReach(25)], ["walkContact", BP.walkContact(70), { dynamic: true }],
  ];
  sec("BƠ poses (library)", poseChecks("bo", BO_CANON, BO_SPEC.height, library, plant));
  // ---- hands
  sec("BƠ hands", handChecks("bo", plant(BP.relaxed(0)), BP.BO_DIMS.hand));
  // ---- identity across ten views, both sides
  const cam = camera([0, 0.7, 8], [0, 0.58, 0], 3000, 500, 500), views: [number, Scene][] = [0, 20, 40, 60, 90, 120, 150, 180, -40, -90].map((y) => [y, bo.toScene(BP.relaxed(y), cam)]);
  sec("BƠ identity per view", featureChecks("bo", BO_FEATURES, views));
  const s1 = JSON.stringify(bo.toScene(BP.wave(-15, 0.8), cam).parts.map((p) => [p.id, p.polys])), s2 = JSON.stringify(bo.toScene(BP.wave(-15, 0.8), cam).parts.map((p) => [p.id, p.polys]));
  sec("BƠ determinism", [{ id: "bo.scene.deterministic", ok: s1 === s2, detail: `scene geometry for one pose, built twice: ${s1 === s2 ? "identical" : "DIFFERENT"} (${s1.length} chars)` }]);
  // ---- palette roles in the marker hand (hue family, and lightness where hue cannot hold)
  const marker = Object.fromEntries(Object.entries(BO_MARKER).map(([k, v]) => [k, v.base]));
  sec("BƠ palette roles, marker comic hand", roleChecks("bo", BO_ROLES, { marker }));
  // ---- the walk film's poses
  sec(`BƠ film: the walk, all ${WALK_FRAMES} frames`, walkChecks("walk", boWalkAt, WALK_FRAMES));

  // ---- NEGATIVE twins: each must throw or fail
  const neg: Result[] = [];
  const expectThrow = (id: string, fn: () => void) => { try { fn(); neg.push({ id, ok: false, detail: "did NOT throw: the gate is blind here" }); } catch (e) { neg.push({ id, ok: true, detail: `threw as it must: ${String((e as Error).message).split("\n")[1]?.trim() ?? (e as Error).message}` }); } };
  expectThrow("neg.elbow170", () => bo.pose({ ...BP.relaxed(0), joints: { elbowR: 170 } }));
  expectThrow("neg.kneeBackwards", () => bo.pose({ ...BP.relaxed(0), joints: { kneeL: -15 } }));
  expectThrow("neg.wristCone", () => checkPose({ ...BP.relaxed(0), joints: { wristFlexL: 70, wristDevL: 30 } }));
  expectThrow("neg.straightLegKick", () => checkPose({ ...BP.relaxed(0), joints: { hipFlexR: 110, kneeR: 0 } }));
  expectThrow("neg.fingerBentBack", () => checkPose({ ...BP.relaxed(0), hands: { R: { angles: { thumb: [10, 10, 10, 10], index: [0, -45, 0, 0], middle: [0, 0, 0, 0], ring: [0, 0, 0, 0], little: [0, 0, 0, 0] } } } }));
  // (declaring more heads cannot be a twin: the engine measures the crown FROM the declared row) a
  // thigh stretched to an adult's share of the body must fail Winter's segment table
  const stretched = canonChecks({ ...BO_CANON, knee: 1.0 }, BO_SPEC.height, BO_REAL_HEADS).find((r) => r.id === "canon.segment.thigh")!;
  neg.push({ id: "neg.canonStretchedThigh", ok: !stretched.ok, detail: `a thigh of 1.44 heads on a 1.15 m child must fail the canon: ${stretched.ok ? "PASSED (gate blind)" : "failed as it must: " + stretched.detail}` });
  const toppling: Pose = { ...BP.relaxed(0), pitch: 20, plant: true };
  const bb = poseChecks("neg", BO_CANON, BO_SPEC.height, [["toppling", toppling]], plant).find((r) => r.id.endsWith("balance"))!;
  neg.push({ id: "neg.fallingOver", ok: !bb.ok, detail: `a stiff Bơ tipped 20 deg forward must fail balance: ${bb.ok ? "PASSED (gate blind)" : "failed as it must: " + bb.detail}` });
  const blue = roleChecks("neg", { shirt: BO_ROLES.shirt }, { wrong: { shirt: "#3a7bd5" } })[0];
  neg.push({ id: "neg.shirtTurnedBlue", ok: !blue.ok, detail: `a blue T-shirt must fail the coral role: ${blue.ok ? "PASSED (gate blind)" : "failed as it must"}` });
  // grey hair sits INSIDE the black role's hue range: only the lightness band can catch it
  const grey = roleChecks("neg", { hair: BO_ROLES.hair }, { wrong: { hair: "#9a98a6" } })[0];
  neg.push({ id: "neg.hairTurnedGrey", ok: !grey.ok && !grey.detail.includes("HUE OUT"), detail: `grey hair (hue inside black's range) must fail on lightness alone: ${grey.ok ? "PASSED (gate blind)" : grey.detail}` });
  const dull = roleChecks("neg", { bag: BO_ROLES.bag }, { wrong: { bag: "#9c8a62" } })[0];
  neg.push({ id: "neg.bagTurnedKhaki", ok: !dull.ok, detail: `a dark khaki bag must fail the cream role: ${dull.ok ? "PASSED (gate blind)" : dull.detail}` });
  const front = views[0][1];
  const noClip = featureChecks("neg", BO_FEATURES, [[0, { ...front, parts: front.parts.filter((p) => p.id !== "fishClip") }]])[0];
  neg.push({ id: "neg.fishClipMissing", ok: !noClip.ok, detail: `a front view without the fish clip must fail identity: ${noClip.ok ? "PASSED (gate blind)" : noClip.detail}` });
  const noGap = featureChecks("neg", BO_FEATURES, [[0, bo.toScene(BP.relaxed(0, {}), cam)]])[0];
  neg.push({ id: "neg.closedMouthNoGapTooth", ok: !noGap.ok, detail: `a front view with the mouth shut cannot show the gap tooth and must fail: ${noGap.ok ? "PASSED (gate blind)" : noGap.detail}` });
  // a walk whose body drifts 1 cm a frame on top of the footsteps: the planted feet slide
  const slid = walkChecks("neg", (f) => { const p = boWalkAt(f); return { ...p, root: [p.root[0] + 0.01 * f, p.root[1], p.root[2]] }; }, WALK_FRAMES).find((r) => r.id.endsWith("plantedFeetStay"))!;
  neg.push({ id: "neg.walkFeetSlide", ok: !slid.ok, detail: `a walk sliding 1 cm/frame must fail the planted-feet check: ${slid.ok ? "PASSED (gate blind)" : slid.detail}` });
  sec("NEGATIVE TWINS (each must be caught)", neg);
  return out;
};

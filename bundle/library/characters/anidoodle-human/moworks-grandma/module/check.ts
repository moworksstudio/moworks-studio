// GRANDMA'S GATE, run by tools/gate.mjs. Holds her to her invariants (canon, the pose library
// inside the joint limits and balanced, hands, the cane in her fist and on the floor, identity
// per view, palette roles per hand, the walk's planted feet and planted cane), then runs the
// NEGATIVE twins: a gate that has never been seen to fail proves nothing.
import { type V3, apply, camera } from "anidoodle/canvas-core/character/math3";
import type { Pose, Scene } from "anidoodle/canvas-core/character/types";
import { SIDES, limitViolations } from "anidoodle/canvas-core/character/human/skeleton";
import { rigFor, checkPose } from "anidoodle/canvas-core/character/human/figure";
import { HAND_POSES } from "anidoodle/canvas-core/character/human/hands";
import { canonChecks, featureChecks, handChecks, paletteChecks, poseChecks, type Result } from "anidoodle/canvas-core/character/check";
import { grandma, GRANDMA_FEATURES, GRANDMA_ROLES, GRANDMA_SPEC, CANON_ELDER, REAL_HEADS } from "./characters/moworks-grandma";
import { GRANDMA_MARKER, GRANDMA_STORYBOOK, baseColours } from "./characters/moworks-grandma/palettes";
import * as GP from "./characters/moworks-grandma/poses";
import { caneAxis, caneGrip, caneLength, caneTip, gripContact } from "./characters/moworks-grandma/cane";
import { WALK_DIR, WALK_N, grandmaWalkAt } from "./characters/moworks-grandma/walk";

const R = (id: string, ok: boolean, detail: string): Result => ({ id, ok, detail });
const H = GRANDMA_SPEC.height, D = GP.GRANDMA_POSE_DIMS;
const plant = (p: Pose) => rigFor(GRANDMA_SPEC, p);

// ---- her own measures, each with a twin below
// grey hair: a hue range alone passes a blue rinse; grey is LOW saturation and HIGH value (HSV)
const hsv = (hex: string) => { const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255), mx = Math.max(...c), mn = Math.min(...c); return { s: mx ? (mx - mn) / mx : 0, v: mx }; };
const greyCheck = (id: string, hex: string) => { const { s, v } = hsv(hex); return R(id, s < 0.12 && v > 0.62, `${hex}: saturation ${s.toFixed(3)} (< 0.12), value ${v.toFixed(2)} (> 0.62)`); };
// the cane: tip on the floor, shaft near plumb
const caneChecks = (name: string, p: Pose): Result[] => {
  const r = plant(p), t = caneTip(r), ax = caneAxis(r), tilt = (Math.acos(Math.max(-1, Math.min(1, -ax[1]))) * 180) / Math.PI;
  return [R(`${name}.cane.onFloor`, Math.abs(t[1]) < 0.004, `cane tip ${(t[1] * 1000).toFixed(1)} mm from the floor (within 4 mm)`), R(`${name}.cane.upright`, tilt < 22, `shaft ${tilt.toFixed(1)} deg from plumb (< 22)`)];
};
// the stoop: her head carried forward of her shoulders (an upright figure fails it)
const stoopOf = (p: Pose) => { const r = plant(p), J = r.joints, f: V3 = [Math.sin((p.yaw * Math.PI) / 180), 0, Math.cos((p.yaw * Math.PI) / 180)], sh = [0, 1, 2].map((i) => (J.shoulderL[i] + J.shoulderR[i]) / 2); return ((J.head[0] - sh[0]) * f[0] + (J.head[2] - sh[2]) * f[2]) * 1000; };
// the walk's planted feet and planted cane
const walkMetrics = (frames: { pose: Pose; tipPlanned: boolean }[]) => {
  let bad = 0, maxSlide = 0, at = -1, below = 0, caneSlide = 0, caneAt = -1, caneOff = 0; let prev: Record<string, V3> | null = null, prevTip: V3 | null = null, prevPlanted = false;
  frames.forEach(({ pose: p, tipPlanned }, f) => {
    bad += limitViolations(p.joints).length ? 1 : 0;
    const r = plant(p), d = r.dims, pts: Record<string, V3> = {};
    SIDES.forEach((s) => { pts[s + "h"] = apply(r.foot[s], [0, -d.ankleH, -d.heel * 0.9]); pts[s + "b"] = apply(r.toes[s], [0, -d.ankleH * 0.15, 0]); });
    Object.values(pts).forEach((q) => { if (q[1] < -0.004) below++; });
    if (prev) for (const k of Object.keys(pts)) { const a = prev[k], b = pts[k]; if (a[1] < 0.004 && b[1] < 0.004) { const sl = Math.hypot(a[0] - b[0], a[2] - b[2]); if (sl > maxSlide) { maxSlide = sl; at = f; } } }
    const tip = caneTip(r);
    if (tipPlanned) { caneOff = Math.max(caneOff, Math.abs(tip[1])); if (prevTip && prevPlanted) { const sl = Math.hypot(tip[0] - prevTip[0], tip[2] - prevTip[2]); if (sl > caneSlide) { caneSlide = sl; caneAt = f; } } }
    prev = pts; prevTip = tip; prevPlanted = tipPlanned;
  });
  return { bad, maxSlide, at, below, caneSlide, caneAt, caneOff };
};

export const run = () => {
  const out: { section: string; results: Result[] }[] = [], sec = (section: string, results: Result[]) => out.push({ section, results });
  // ---- proportions
  sec("GRANDMA canon (storybook elder 6.0 heads, declared stylisation of a real 7.0-head 78-year-old, 1.52 m)", canonChecks(CANON_ELDER, H, REAL_HEADS));

  // ---- the pose library
  const relaxed = GP.relaxed(0), wave = GP.wave(-15, 0.8), rest = GP.restOnCane(-25), ache = GP.achingBack(30), walkMid = grandmaWalkAt(14).pose;   // a frame with the cane planted (in swing its tip is meant to be off the floor)
  const lib: [string, Pose, { seated?: V3[]; dynamic?: boolean }?][] = [
    ["relaxed", relaxed], ["relaxedThreeQuarter", GP.relaxed(40)], ["wave", wave],
    ["restOnCane", rest, { seated: [GP.tipOf(rest)] }], ["achingBack", ache, { seated: [GP.tipOf(ache)] }], ["walkFrame14", walkMid, { dynamic: true }],
  ];
  sec("GRANDMA poses (standing poses balanced on their feet; the two leaning poses with the cane tip in the support, as a seat for a sitter)", poseChecks("grandma", CANON_ELDER, H, lib, plant));
  sec("GRANDMA cane per pose (a rigid prop in the right fist)", [
    ...lib.flatMap(([n, p]) => caneChecks(n, p)),
    (() => { const ls = lib.map(([, p]) => caneLength(plant(p))), spread = (Math.max(...ls) - Math.min(...ls)) * 1000; return R("cane.rigid", spread < 0.01, `crook-to-tip length ${(ls[0] * 1000).toFixed(1)} mm in every pose (spread ${spread.toFixed(4)} mm)`); })(),
  ]);
  const stoop = stoopOf(GP.relaxed(90));
  sec("GRANDMA carriage", [R("grandma.stoop", stoop > 30, `head carried ${stoop.toFixed(0)} mm ahead of the shoulders (> 30 mm: the stoop)`)]);

  // ---- hands
  const g = gripContact(plant(relaxed), caneGrip());
  sec("HANDS", [...handChecks("grandma", plant({ ...relaxed, hands: { L: "relaxed", R: "relaxed" } }), D.hand),
    R("grandma.hand.gripsCane", g.gapMm < 6 && g.sinkMm < 3, `fingertip pads ${g.gapMm.toFixed(1)} mm off the handle at most (< 6), deepest finger ${g.sinkMm.toFixed(1)} mm into it (< 3)`)]);

  // ---- identity across views
  const cam = camera([0, 0.8, 8], [0, 0.7, 0], 3000, 500, 500);
  const views: [number, Scene][] = [0, 20, 40, 60, 90, 120, 150, 180, -40, -90].map((y) => [y, grandma.toScene(GP.relaxed(y), cam)]);
  sec("GRANDMA identity per view", featureChecks("grandma", GRANDMA_FEATURES, views));
  const s1 = JSON.stringify(grandma.toScene(wave, cam).parts.map((p) => [p.id, p.polys])), s2 = JSON.stringify(grandma.toScene(GP.wave(-15, 0.8), cam).parts.map((p) => [p.id, p.polys]));
  sec("GRANDMA determinism", [R("grandma.scene.deterministic", s1 === s2, `scene geometry for one pose, built twice: ${s1 === s2 ? "identical" : "DIFFERENT"} (${s1.length} chars)`)]);

  // ---- palette roles, per hand
  const sb = baseColours(GRANDMA_STORYBOOK), mk = baseColours(GRANDMA_MARKER);
  sec("GRANDMA palette roles in two hands", [...paletteChecks("grandma", GRANDMA_ROLES, { storybook: sb, marker: mk }), greyCheck("grandma.palette.hairIsGrey.storybook", sb.hair), greyCheck("grandma.palette.hairIsGrey.marker", mk.hair)]);

  // ---- the walk
  const frames = Array.from({ length: WALK_N }, (_, f) => { const w = grandmaWalkAt(f); return { pose: w.pose, tipPlanned: w.planted }; });
  const m = walkMetrics(frames);
  sec(`GRANDMA film: the walk, all ${WALK_N} frames`, [
    R("walk.limits", m.bad === 0, `${m.bad} of ${WALK_N} frames outside the range of motion`),
    R("walk.plantedFeetStay", m.maxSlide < 0.004, `a planted heel or ball moves at most ${(m.maxSlide * 1000).toFixed(1)} mm in a frame (frame ${m.at}); < 4 mm passes`),
    R("walk.noFootThroughFloor", m.below === 0, `${m.below} foot-point samples more than 4 mm under the floor`),
    R("walk.caneTipStays", m.caneSlide < 0.004, `a planted cane tip moves at most ${(m.caneSlide * 1000).toFixed(1)} mm in a frame (frame ${m.caneAt}); < 4 mm passes`),
    R("walk.caneTipOnFloor", m.caneOff < 0.005, `planted cane tip at most ${(m.caneOff * 1000).toFixed(1)} mm off the floor (< 5 mm)`),
  ]);

  // ---- NEGATIVE twins: each must throw or fail
  const neg: Result[] = [];
  const expectThrow = (id: string, fn: () => void) => { try { fn(); neg.push(R(id, false, "did NOT throw: the gate is blind here")); } catch (e) { neg.push(R(id, true, `threw as it must: ${String((e as Error).message).split("\n")[1]?.trim() ?? (e as Error).message}`)); } };
  const mustFail = (id: string, r: Result, what: string) => neg.push(R(id, !r.ok, `${what}: ${r.ok ? "PASSED (gate blind)" : "failed as it must: " + r.detail}`));
  expectThrow("neg.elbow170", () => grandma.pose({ ...relaxed, joints: { ...relaxed.joints, elbowL: 170 } }));
  expectThrow("neg.kneeBackwards", () => grandma.pose({ ...relaxed, joints: { ...relaxed.joints, kneeL: -15 } }));
  expectThrow("neg.neckOwl", () => checkPose({ ...relaxed, joints: { ...relaxed.joints, neckTwist: 60, headTurn: 30 } }));
  expectThrow("neg.fingerBentBack", () => checkPose({ ...relaxed, hands: { L: { angles: { ...HAND_POSES.relaxed, index: [0, -45, 0, 0] } } } }));
  // a stiff figure tipped 25 degrees forward from the ankles, no cane under her
  const topple = poseChecks("neg", CANON_ELDER, H, [["toppling", { ...GP.base(0), pitch: 25, plant: true }]], plant).find((r) => r.id.endsWith("balance"))!;
  mustFail("neg.fallingOver", topple, "a stiff figure tipped 25 deg forward must fail balance");
  // the cane lifted off the floor: the arm raised 25 degrees past the solved pose
  mustFail("neg.caneInTheAir", caneChecks("neg", { ...relaxed, joints: { ...relaxed.joints, shoulderRaiseR: (relaxed.joints.shoulderRaiseR ?? 0) + 25 } })[0], "a cane lifted by the arm must fail the floor check");
  // an open hand on the handle is not a grip
  const og = gripContact(plant(relaxed), HAND_POSES.open);
  neg.push(R("neg.openHandOnCane", !(og.gapMm < 6 && og.sinkMm < 3), `an open hand must not count as gripping: ${og.gapMm < 6 && og.sinkMm < 3 ? "PASSED (gate blind)" : `failed as it must (gap ${og.gapMm.toFixed(0)} mm)`}`));
  // the stoop gone: the same pose with an upright spine and neck
  const upright = stoopOf({ ...GP.relaxed(90), joints: { ...GP.relaxed(90).joints, spineBend: 0, pelvisTilt: 0, neckBend: 0, headNod: 0 } });
  neg.push(R("neg.standingUpStraight", !(upright > 30), `an upright twin must fail the stoop: ${upright > 30 ? "PASSED (gate blind)" : `failed as it must (${upright.toFixed(0)} mm)`}`));
  mustFail("neg.cardiganTurnedBlue", paletteChecks("neg", { cardigan: GRANDMA_ROLES.cardigan }, { wrong: { cardigan: "#3a7bd5" } })[0], "a blue cardigan must fail the rose role");
  mustFail("neg.hairTurnedBrown", greyCheck("neg", "#7a5a3a"), "brown hair must fail grey");
  const rinse = paletteChecks("neg", { hair: GRANDMA_ROLES.hair }, { rinse: { hair: "#6f8fe0" } })[0];
  neg.push(R("neg.blueRinse", rinse.ok && !greyCheck("neg", "#6f8fe0").ok, `a blue rinse sits INSIDE the hair hue family (hue check ${rinse.ok ? "passes it" : "fails it"}), so the grey check must catch it: ${greyCheck("neg", "#6f8fe0").ok ? "PASSED (gate blind)" : "caught"}`));
  mustFail("neg.glassesMissing", featureChecks("neg", GRANDMA_FEATURES, [[0, { ...views[0][1], parts: views[0][1].parts.filter((p) => p.id !== "glasses") }]])[0], "a front view without the glasses must fail identity");
  mustFail("neg.bunMissing", featureChecks("neg", GRANDMA_FEATURES, [[180, { ...views[7][1], parts: views[7][1].parts.filter((p) => p.id !== "bun") }]])[0], "a back view without the bun must fail identity");
  mustFail("neg.caneMissing", featureChecks("neg", GRANDMA_FEATURES, [[90, { ...views[4][1], parts: views[4][1].parts.filter((p) => p.id !== "cane") }]])[0], "a profile without the cane must fail identity");
  // a skating walk: the same frames, the whole body pushed 6 mm further along the path every frame
  const skate = walkMetrics(frames.map(({ pose: p, tipPlanned }, f) => ({ pose: { ...p, root: [p.root[0] + WALK_DIR[0] * 0.006 * f, p.root[1], p.root[2] + WALK_DIR[2] * 0.006 * f] as V3 }, tipPlanned })));
  neg.push(R("neg.skatingWalk", !(skate.maxSlide < 0.004) && !(skate.caneSlide < 0.004), `feet and cane sliding 6 mm a frame must fail: feet ${(skate.maxSlide * 1000).toFixed(1)} mm, cane ${(skate.caneSlide * 1000).toFixed(1)} mm`));
  sec("NEGATIVE TWINS (each must be caught)", neg);
  return out;
};

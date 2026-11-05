// WhatIfNoPain (worked example) — the 13-shot list of the approved 45 s script (script.txt), authored directly in VOICE SECONDS
// (vo.ts word times). Each shot: camera A→B (or a tracking cam), aim/focus point, a look, which set the key light
// follows, and an act() that poses the cast and props for absolute time T (s) / shot-local time t (s).
// From the render reviews: hand props live in world space and the hands are put ON their grip points with IK
// (poseReach), so nothing is ever held from inside; feet on the stairs are planted with legIK.
import * as THREE from "three";
import { Character, legIK, Pose, poseReach, SIT, STAND } from "../../kit/character";
import { backOut, clamp01, easeIn, easeInOut, easeOut, lerp, ramp01 } from "../../kit/lib";
import { Look, LOOKS } from "../../kit/looks";
import type { ShotState } from "../../kit/ToonVideo";
import { FA, ST, STEP, World } from "./world";
import { FPS } from "./vo";

type V = [number, number, number];
type Cam = { pos: THREE.Vector3; look: THREE.Vector3 };
type Shot = {
  from: number;
  to: number;
  a: V;
  b: V;
  look: V;
  fov: number;
  style: Look;
  set: "office" | "fa" | "st";
  hold?: number;
  cam?: (T: number, t: number) => Cam; // tracking camera (overrides a/b/look)
  act: (w: World, T: number, t: number) => THREE.Vector3 | void;
};

// the whiteboard close-up: dimmer than objectClose so a white board keeps its marker
const BOARD: Look = { ...LOOKS.objectClose, light: { ...LOOKS.objectClose.light, hemi: 1.55, key: 0.9, practical: 0.5 }, style: { ...LOOKS.objectClose.style, bloom: { strength: 0.15, radius: 0.4, threshold: 2.0 }, grade: { ...LOOKS.objectClose.style.grade, contrast: 1.05, lift: 0 } } };
const cool = (l: Look): Look => ({ ...l, style: { ...l.style, grade: { ...l.style.grade, warm: -0.7, saturation: 1.1 } } });
const ramp = (T: number, a: number, b: number) => ramp01(T * FPS, a * FPS, b * FPS);
const pose = (c: Character, p: Partial<Pose>, base: Pose = STAND) => c.setPose({ ...base, ...p });
const show = (c: Character, x: number, z: number, rotY: number, y = 0) => {
  c.root.visible = true;
  c.root.position.set(x, y, z);
  c.root.rotation.y = rotY;
  c.root.updateMatrixWorld(true);
};
const billboard = (m: THREE.Mesh, cam: THREE.Camera) => m.quaternion.copy(cam.quaternion);
let CAM: THREE.PerspectiveCamera;

// ---------- world-space prop helpers ----------
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Put a prop at `pos`: first tilt about its own z, then its own x, then yaw about world y (Euler YXZ). */
const place = (o: THREE.Object3D, pos: THREE.Vector3, yaw = 0, tiltX = 0, tiltZ = 0) => {
  o.visible = true;
  o.position.copy(pos);
  o.rotation.order = "YXZ";
  o.rotation.set(tiltX, yaw, tiltZ);
  o.updateMatrixWorld(true);
};
const at = (o: THREE.Object3D, local: THREE.Vector3) => {
  o.updateWorldMatrix(true, false);
  return local.clone().applyMatrix4(o.matrixWorld);
};
const grip = (o: THREE.Object3D) => at(o, o.userData.grip as THREE.Vector3);
/** yaw that turns a prop's local +x towards a horizontal world direction */
const yawTo = (d: THREE.Vector3) => Math.atan2(-d.z, d.x);
const inTorso = (c: Character, x: number, y: number, z: number) => c.parts.torso.localToWorld(v3(x, y, z));
const inHead = (c: Character, x: number, y: number, z: number) => c.parts.head.localToWorld(v3(x, y, z));
const shoulder = (c: Character, side: "l" | "r") => inTorso(c, side === "l" ? 0.235 : -0.235, 0.56, 0);
/** elbow pole for poseReach: out to that side and down, so an arm never cuts across the chest */
const out = (c: Character, side: "l" | "r", down = 0.8) => {
  const a = c.root.rotation.y;
  const s = side === "l" ? 1 : -1;
  return v3(s * Math.cos(a), -down, -s * Math.sin(a)).normalize();
};
/** A mug in the RIGHT hand, handle to her right; k: 0 at the chest → 1 at the mouth (tipped to sip). */
const holdMug = (c: Character, base: Pose, mug: THREE.Object3D, k: number) => {
  c.setPose(base);
  c.root.updateMatrixWorld(true);
  const pos = inTorso(c, -0.07, 0.38, 0.3).lerp(inHead(c, -0.02, -0.2, 0.36), k);
  place(mug, pos, c.root.rotation.y + Math.PI, 0.75 * k);
  return poseReach(c, base, { r: grip(mug) }, { r: out(c, "r") });
};
/** Rising, fading steam wisps above a world point. */
const steamAt = (ws: THREE.Mesh[], origin: THREE.Vector3, T: number, rise = 0.22, size = 1) =>
  ws.forEach((s, i) => {
    const c = (T * 0.75 + i / ws.length) % 1;
    s.visible = true;
    s.position.set(origin.x + 0.02 * Math.sin(c * 6 + i * 2), origin.y + 0.03 + c * rise, origin.z);
    const k = size * (0.6 + 0.5 * c);
    s.scale.set(i % 2 ? -k : k, k, 1);
    (s.material as THREE.MeshBasicMaterial).opacity = Math.pow(Math.sin(Math.PI * c), 0.7);
    billboard(s, CAM);
  });

export const SHOTS: Shot[] = [
  // 1 · "On Monday you kick the desk leg" — low insert at shin height, the shoe hits the desk's side panel
  {
    from: 0, to: 1.85, a: [-3.92, 0.34, 0.5], b: [-3.95, 0.33, 0.35], look: [-3.86, 0.24, -0.9], fov: 34, style: LOOKS.objectClose, set: "office",
    act: (w, T) => {
      const m = w.cast.mika;
      show(m, -4.22, -0.95, Math.PI / 2);
      const back = ramp(T, 0, 0.55),
        fwd = ramp(T, 0.55, 1.05);
      // the swing stops with the toe ON the panel face (x ≈ −3.69), not in it
      const hip = lerp(lerp(0.15, 0.45, back), -0.68, easeOut(fwd));
      pose(m, { rHip: hip, rKnee: lerp(lerp(0.2, 0.7, back), 0.12, fwd), lShX: 0.25, rShX: -0.25, lean: -0.05 });
      m.setExpr("neutral");
      const k = ramp(T, 1.05, 1.6);
      const s = w.sprites.impact;
      s.visible = T >= 1.05 && k < 1;
      s.position.set(-3.75, 0.22, -0.82);
      s.scale.setScalar(Math.max(0.01, backOut(clamp01(k * 3)) * (1 - 0.3 * k)));
      (s.material as THREE.MeshBasicMaterial).opacity = 1 - Math.max(0, k - 0.6) / 0.4;
      billboard(s, CAM);
    },
  },
  // 2 · "so hard the whole office winces, but you don't feel a thing." — three wince behind the desks, Mika deadpan
  {
    from: 1.85, to: 6.16, a: [-2.6, 1.5, 4.6], b: [-1.8, 1.5, 4.6], look: [-2.15, 1.35, -1.0], fov: 30, style: LOOKS.wideBright, set: "office",
    act: (w, T) => {
      const { ravi, june, otto, mika } = w.cast;
      const wince = T >= 3.35 && T < 5.0;
      const up = ramp(T, 3.3, 3.55) * (1 - ramp(T, 4.8, 5.1));
      ([[ravi, -3.4], [june, -2.3], [otto, -1.2]] as const).forEach(([c, x], i) => {
        show(c, x, -2.3, 0);
        pose(c, { lShZ: 0.12 + 0.25 * up, rShZ: -0.12 - 0.25 * up, lean: -0.08 * up, headTilt: 0.06 * Math.sin(T * 3 + i) - 0.12 * up, headTurn: 0.1 * Math.sin(T * 1.3 + i) });
        c.setExpr(wince ? "wince" : "neutral");
      });
      show(mika, -0.85, 1.15, -0.25);
      // the sip on "thing": the mug's rim comes to her mouth, hand through the handle
      const sip = ramp(T, 5.1, 5.45) * (1 - ramp(T, 5.8, 6.1));
      holdMug(mika, { ...STAND, headTilt: 0.04 - 0.12 * sip }, w.props.heldMug, sip);
      mika.setExpr(T > 3.9 && T < 4.05 ? "blink" : "calm");
    },
  },
  // 3 · "So, what if you stopped feeling pain?" — line 1, then line 2 are written on the whiteboard, then the toe doodle
  {
    from: 6.16, to: 9.63, a: [6.5, 1.55, -3.3], b: [6.72, 1.55, -3.3], look: [7.95, 1.6, -3.3], fov: 42, style: BOARD, set: "office",
    act: (w, T) => {
      w.board.draw(clamp01((T - 7.2) / 2.3)); // line 1 on "what if you stopped", line 2 on "feeling pain"
    },
  },
  // 4 · "Some people are born this way, … congenital insensitivity to pain." — Dr. Noor at the lightbox, Mika on the bench
  {
    from: 9.63, to: 16.47, a: [30.0, 1.45, 2.6], b: [30.15, 1.42, 2.3], look: [30.1, 1.2, -1.7], fov: 38, style: LOOKS.propGlow, set: "fa",
    act: (w, T) => {
      const { noor, mika } = w.cast;
      show(noor, 28.75, -1.95, 0.55);
      pose(noor, { lShX: -1.15, lShZ: 0.55, lEl: -0.25, rShX: -0.1 - 0.15 * Math.max(0, Math.sin(T * 1.1)), headTurn: Math.sin(T * 0.9) * 0.25 - 0.1 });
      noor.setExpr(T > 13.3 && T < 13.45 ? "blink" : "neutral");
      seatOnBench(mika, T);
      mika.setExpr("neutral");
      w.films.draw("nerve", clamp01((T - 10.2) / 5.2));
    },
  },
  // 5 · "They can tell hot from cold. It just never hurts." — steaming mug (right), frosty can (left), both held up in
  //     frame; she looks at each; a sharp red pain bolt by her temple crackles, turns grey and drops on "never hurts"
  {
    from: 16.47, to: 20.58, a: [-5.0, 1.56, 3.5], b: [-5.0, 1.54, 3.28], look: [-5.0, 1.42, 1.5], fov: 32, style: { ...LOOKS.characterClose, light: { ...LOOKS.characterClose.light, practical: 0.3 } }, set: "office",
    act: (w, T) => {
      const m = w.cast.mika;
      show(m, -5.0, 1.5, 0);
      const look = T < 17.0 ? 0 : T < 17.5 ? -0.45 * ramp(T, 17.0, 17.2) : T < 18.8 ? lerp(-0.45, 0.45, ramp(T, 17.5, 17.75)) : lerp(0.45, 0, ramp(T, 18.8, 19.1));
      const base: Pose = { ...STAND, headTurn: look, headTilt: 0.1 };
      m.setPose(base);
      m.root.updateMatrixWorld(true);
      const mug = w.props.heldMug,
        can = w.props.can;
      place(mug, inTorso(m, -0.22, 0.5, 0.3), Math.PI);
      place(can, inTorso(m, 0.22, 0.5, 0.3), 0);
      poseReach(m, base, { r: grip(mug), l: grip(can) }, { r: out(m, "r"), l: out(m, "l") });
      m.setExpr(T > 19.5 ? "calm" : "neutral");
      // steam leans outwards, away from her face
      steamAt(w.props.mugSteam, at(mug, v3(0, 0.07, 0)).add(v3(-0.05, 0, 0.03)), T, 0.2, 1.4);
      const canBase = at(can, v3(0, -0.07, 0.03));
      w.props.canPuffs.forEach((p, i) => {
        const c = (T * 0.5 + i / 5) % 1;
        p.visible = true;
        p.position.set(canBase.x + 0.06 * Math.sin(c * 4 + i * 1.7), canBase.y - c * 0.2, canBase.z + 0.03);
        p.scale.setScalar(1.2 + 1.4 * c);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.95 * Math.sin(Math.PI * c);
        billboard(p, CAM);
      });
      const head = new THREE.Vector3();
      m.parts.head.getWorldPosition(head);
      const right = v3(1, 0, 0).applyQuaternion(CAM.quaternion);
      const crackle = ramp(T, 19.35, 19.75);
      const grey = T >= 19.75;
      const fall = easeIn(ramp(T, 19.95, 20.45));
      const b = w.sprites.bolt,
        g = w.sprites.boltGrey;
      b.visible = T >= 16.7 && !grey;
      g.visible = grey && fall < 1;
      for (const s of [b, g]) {
        s.position.copy(head).addScaledVector(right, 0.42).add(v3(0, 0.06 - 0.35 * fall, 0.08));
        const jitter = crackle > 0 && !grey ? 1 + 0.18 * Math.sin(T * 70) : 1;
        s.scale.setScalar(Math.max(0.01, 1.35 * backOut(ramp(T, 16.7, 17.0)) * jitter * (grey ? 0.85 : 1)));
        const z = grey ? 0.6 * fall : 0.12 * crackle * Math.sin(T * 55);
        (s.material as THREE.MeshBasicMaterial).opacity = 1 - fall;
        billboard(s, CAM);
        s.rotateZ(z);
      }
    },
  },
  // 6 · "At first that's a superpower, because flu shots are nothing" — wide: June (queue) · Dr. Noor (three-quarter,
  //     syringe arm on the camera side) · Mika reading her phone; the needle touches Mika's upper arm on "shots"; June
  //     turns her face away with a hand up
  {
    from: 20.58, to: 24.33, a: [5.35, 1.56, -3.55], b: [5.45, 1.53, -3.3], look: [5.7, 1.5, -1.1], fov: 42, style: LOOKS.wideBright, set: "office",
    act: (w, T) => {
      const { mika, noor, june } = w.cast;
      w.props.fluSign.visible = true;
      w.frontPosts.forEach((p) => (p.visible = false)); // no post may skewer a head
      show(mika, 4.85, -1.25, Math.PI + 0.15);
      const mBase: Pose = { ...STAND, rShZ: -0.55, rEl: -0.12, headTilt: 0.42, headTurn: 0.05 * Math.sin(T * 2) };
      mika.setPose(mBase);
      mika.root.updateMatrixWorld(true);
      const ph = w.props.phone;
      place(ph, inTorso(mika, 0.04, 0.5, 0.3), Math.PI + 0.15, -0.9);
      poseReach(mika, mBase, { l: grip(ph) }, { l: out(mika, "l") });
      mika.setExpr("calm");
      const hand = new THREE.Vector3();
      mika.parts.rHand.getWorldPosition(hand);
      const target = shoulder(mika, "r").lerp(hand, 0.32); // her right upper arm
      // Dr. Noor: three-quarter to camera, facing Mika; holds the syringe by the plunger, needle angled down, then reaches in
      show(noor, 5.88, -1.0, -2.55);
      const nBase: Pose = { ...STAND, lShX: -0.12, lShZ: 0.14, headTilt: 0.14, headTurn: 0.35 };
      noor.setPose(nBase);
      noor.root.updateMatrixWorld(true);
      const dirIn = target.clone().sub(shoulder(noor, "r")).normalize();
      const syr = w.props.syringe;
      const L = (0.235 + 0.06) * syr.scale.x; // tip → plunger grip
      const k = easeInOut(ramp(T, 22.75, 23.5));
      const back = easeInOut(ramp(T, 23.95, 24.3));
      const n = dirIn.clone().add(v3(0, -0.75, 0)).normalize().lerp(dirIn, k).normalize();
      const restGrip = inTorso(noor, -0.17, 0.45, 0.3);
      const contactGrip = target.clone().addScaledVector(dirIn, -L);
      const g = restGrip.lerp(contactGrip, k * (1 - 0.55 * back));
      syr.visible = true;
      syr.quaternion.setFromUnitVectors(v3(0, -1, 0), n);
      syr.position.copy(g).sub((syr.userData.grip as THREE.Vector3).clone().multiplyScalar(syr.scale.x).applyQuaternion(syr.quaternion));
      syr.updateMatrixWorld(true);
      poseReach(noor, nBase, { r: g }, { r: out(noor, "r") });
      noor.setExpr("neutral");
      // June waits her turn; on "flu shots" she turns her face away, eyes squeezed, one hand up between her and the needle
      show(june, 6.6, -0.95, Math.PI + 0.35);
      const away = easeInOut(ramp(T, 22.85, 23.25));
      const jBase: Pose = { ...STAND, headTurn: -0.65 * away, headTilt: -0.05 * away };
      june.setPose(jBase);
      june.root.updateMatrixWorld(true);
      const lRest = new THREE.Vector3();
      june.parts.lHand.getWorldPosition(lRest);
      poseReach(june, jBase, { l: lRest.lerp(inTorso(june, 0.2, 0.76, 0.27), away) }, { l: out(june, "l") });
      june.setExpr(away > 0.5 ? "wince" : "neutral");
    },
  },
  // 7 · "and you pour the team's coffee from the scorching pot, barehanded." — front, counter height: three mugs on the
  //     island; Mika (behind it, facing us) pours each in turn from a stovetop pot whose base and METAL handle glow
  //     red-hot — gripped correctly by the handle, sizzling; June waits on the left; Otto holds out an oven mitt she
  //     ignores, and stares at her hand on "barehanded"
  {
    from: 24.33, to: 28.37, a: [-5.5, 1.74, -1.95], b: [-5.54, 1.68, -2.25], look: [-5.54, 1.2, -3.95], fov: 43, style: { ...LOOKS.propGlow, light: { ...LOOKS.propGlow.light, practical: 0.35 } }, set: "office",
    act: (w, T) => {
      const { mika, otto, june } = w.cast;
      w.props.pourTable.visible = true;
      const MUG_Z = -3.92;
      const mugX = [-5.7, -5.42, -5.14];
      const slots = [24.95, 25.95, 26.95];
      const pourEnd = slots.map((s) => s + 0.75);
      w.props.teamMugs.forEach((m, j) => {
        place(m, v3(mugX[j], 0.97, MUG_Z), Math.PI * 0.75);
        const coffee = m.getObjectByName("coffee")!;
        const fillK = clamp01((T - slots[j] - 0.1) / 0.6);
        coffee.position.y = lerp(-0.03, 0.055, fillK);
        coffee.visible = fillK > 0;
      });
      // which mug: glide to the next one between pours
      const i = T < slots[1] - 0.25 ? 0 : T < slots[2] - 0.25 ? 1 : 2;
      const move = i === 0 ? 1 : easeInOut(ramp(T, slots[i] - 0.25, slots[i] - 0.02));
      const mx = lerp(mugX[Math.max(0, i - 1)], mugX[i], move);
      const pourK = easeInOut(ramp(T, slots[i], slots[i] + 0.15)) * (1 - easeInOut(ramp(T, slots[i] + 0.62, slots[i] + 0.78)));
      const lift = 1 - easeOut(ramp(T, 24.33, 24.8)); // lifts the pot in at the start
      const tip = v3(mx, 1.04 + 0.2 + 0.18 * (1 - pourK) - 0.12 * lift, MUG_Z); // a long stream; lifted well clear of the mug rims between pours
      // done: she sets it down on the island's free left end (base on the top, spout towards the mugs), fist still on the red-hot handle
      tip.lerp(v3(-5.92 + 0.169 * 1.35, 0.93 + 0.1 * 1.35 + 0.111 * 1.35 + 0.004, MUG_Z), easeInOut(ramp(T, pourEnd[2] + 0.02, pourEnd[2] + 0.4)));
      const pot = w.props.pot;
      place(pot, v3(0, 0, 0), 0, 0, lerp(-0.08, -0.75, pourK));
      const spoutOff = at(pot, pot.userData.spout as THREE.Vector3); // read while the pot still sits at the origin
      pot.position.copy(tip).sub(spoutOff);
      pot.updateMatrixWorld(true);
      const hand = grip(pot);
      // Mika keeps the handle at a comfortable spot in front of her right shoulder: she side-steps along the island
      show(mika, hand.x + 0.185, MUG_Z - 0.44, 0);
      const mBase: Pose = { ...STAND, lean: 0.12, headTilt: 0.22, headTurn: -0.12 };
      poseReach(mika, { ...mBase, lShZ: 0.1, lEl: -0.25 }, { r: hand }, { r: out(mika, "r") });
      mika.setExpr("calm");
      // the heat: wavy lines off the pot's hot base and handle, a little sizzle AT the fist, short steam from the lid
      const potC = at(pot, v3(0, -0.02, 0));
      w.props.heat.forEach((h, j) => {
        h.visible = true;
        h.position.copy(at(pot, j === 0 ? v3(0, -0.03, 0.1) : v3(-0.15, 0.07, 0.03))); // anchored ON the pot: the hot base, and right on the red-hot handle
        h.position.y += 0.03 * Math.sin(T * 6 + j * 2);
        (h.material as THREE.MeshBasicMaterial).opacity = 0.75 + 0.25 * Math.sin(T * 9 + j);
        billboard(h, CAM);
      });
      steamAt(w.props.potSteam, hand, T * 1.6, 0.13, 0.75); // outlined sizzle wisps off the fist
      w.props.sizzle.forEach((s, j) => {
        const c = (T * 1.8 + j / 4) % 1;
        s.visible = true;
        s.position.copy(hand).add(v3(0.04 * Math.sin(j * 2.3), 0.03 + c * 0.1, 0.06));
        s.scale.setScalar(0.5 + 0.6 * c); // a clear sizzle at the fist
        (s.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.sin(Math.PI * c);
        billboard(s, CAM);
      });
      // coffee stream: spout tip → the mug's coffee surface
      const st = w.props.stream;
      st.visible = pourK > 0.35;
      if (st.visible) {
        const from = at(pot, pot.userData.spout as THREE.Vector3);
        const to = v3(mugX[i], 0.97 + 0.03, MUG_Z);
        st.position.copy(from).add(to).multiplyScalar(0.5);
        st.scale.set(1.7, Math.max(0.01, from.distanceTo(to)), 1.7);
        st.lookAt(to);
        st.rotateX(Math.PI / 2);
      }
      // June, left end: waits, smiles when hers is poured
      show(june, -6.82, -4.25, 0.75);
      june.setPose({ ...STAND, headTilt: 0.15, headTurn: 0.1 * Math.sin(T * 1.5) });
      june.setExpr(T > pourEnd[0] ? "smile" : "eager");
      // Otto, right end: holds out an oven mitt from "scorching", then stares at her fist on "barehanded"
      show(otto, -4.42, -4.15, -0.8);
      const offer = easeInOut(ramp(T, 26.3, 26.75));
      const alarmed = T > 27.6;
      const toHand = hand.clone().sub(otto.root.position).setY(0);
      const fwdO = v3(Math.sin(-0.8), 0, Math.cos(-0.8));
      const turn = THREE.MathUtils.clamp(Math.atan2(fwdO.clone().cross(toHand).y, fwdO.dot(toHand)), -0.9, 0.9);
      const oBase: Pose = { ...STAND, headTilt: alarmed ? 0.3 : 0.12, headTurn: alarmed ? turn : 0.15 };
      otto.setPose(oBase);
      otto.root.updateMatrixWorld(true);
      const mitt = w.props.mitt;
      const shR = shoulder(otto, "r");
      const toMika = hand.clone().sub(shR).setY(0).normalize();
      const restM = inTorso(otto, -0.22, 0.12, 0.12);
      const offerM = shR.clone().addScaledVector(toMika, 0.3).add(v3(0, -0.12, 0));
      const gM = restM.lerp(offerM, offer);
      const up = v3(0, 1, 0).lerp(toMika.clone().add(v3(0, 0.6, 0)).normalize(), offer).normalize();
      mitt.visible = true;
      mitt.quaternion.setFromUnitVectors(v3(0, 1, 0), up);
      mitt.position.copy(gM).sub((mitt.userData.grip as THREE.Vector3).clone().applyQuaternion(mitt.quaternion));
      mitt.updateMatrixWorld(true);
      poseReach(otto, oBase, { r: gM }, { r: out(otto, "r") });
      otto.setExpr(alarmed ? "alarmed" : "eager");
      return hand.clone().lerp(potC, 0.5);
    },
  },
  // 8 · "Then you notice the blisters," — her own RIGHT palm (the pot hand) held up by her face, in focus; the blisters
  //     pop; she stays calm (soft, behind); the grade turns cool from here
  {
    from: 28.37, to: 30.53, a: [-5.62, 1.6, -3.28], b: [-5.6, 1.6, -3.38], look: [-5.62, 1.56, -4.25], fov: 30, style: { ...cool(LOOKS.objectClose), light: { ...LOOKS.objectClose.light, hemi: 1.9, key: 1.1, practical: 0.12 } }, set: "office",
    act: (w, T) => {
      const m = w.cast.mika;
      show(m, -5.42, -4.32, -0.12);
      const base: Pose = { ...STAND, headTilt: 0.05, headTurn: -0.22 };
      m.setPose(base);
      m.root.updateMatrixWorld(true);
      poseReach(m, base, { r: inTorso(m, -0.22, 0.58, 0.34) }, { r: out(m, "r") });
      m.setExpr("calm");
      (m.parts.rHand.children[0] as THREE.Mesh).visible = false; // the hero hand replaces the sphere hand
      const wrist = new THREE.Vector3();
      m.parts.rHand.getWorldPosition(wrist);
      const h = w.props.hand;
      const s = 0.9;
      const toCam = CAM.position.clone().sub(wrist).normalize(); // palm (+y) faces the lens
      const up = v3(0, 1, 0).addScaledVector(toCam, -toCam.y).normalize(); // fingers (−z) point up
      const zAx = up.clone().negate();
      const xAx = toCam.clone().cross(zAx).normalize();
      h.visible = true;
      h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, toCam, zAx));
      h.scale.setScalar(s); // a RIGHT hand: thumb towards her face
      h.position.copy(wrist).sub((h.userData.wrist as THREE.Vector3).clone().multiplyScalar(s).applyQuaternion(h.quaternion));
      w.props.blisters.forEach((b, i) => {
        const k = ramp(T, 30.05 + i * 0.07, 30.3 + i * 0.07);
        b.visible = k > 0;
        b.scale.set(backOut(k), 0.7 * backOut(k), backOut(k));
      });
      return at(h, v3(0, 0, 0));
    },
  },
  // 9 · "and you bite your tongue at lunch, and keep chewing," — the meeting table, both turned three-quarter to camera:
  //     Mika bites, a red drop falls on her white napkin, she keeps chewing, content; June freezes mid-bite and points
  {
    from: 30.53, to: 34.03, a: [6.95, 1.45, -3.32], b: [6.84, 1.43, -3.32], look: [4.9, 1.2, -3.3], fov: 38, style: { ...cool(LOOKS.wideBright), light: { ...LOOKS.wideBright.light, practical: 0.25 }, style: { ...cool(LOOKS.wideBright).style, bloom: { strength: 0.12, radius: 0.4, threshold: 1.6 } } }, set: "office",
    act: (w, T) => {
      const { mika, june } = w.cast;
      const [mc, , jc] = w.office.meetChairs;
      const mRot = Math.PI - 0.75,
        jRot = 0.75;
      mc.rotation.y = mRot;
      jc.rotation.y = jRot;
      show(mika, 4.8, -2.45, mRot);
      const bite1 = ramp(T, 31.2, 31.48) * (1 - ramp(T, 31.7, 32.0));
      const bite2 = ramp(T, 33.0, 33.3) * (1 - ramp(T, 33.55, 33.85));
      const chewing = T > 31.5;
      const chew = chewing ? Math.sin(T * 14) : 0;
      const mBase: Pose = { ...SIT, headTilt: 0.04 + 0.04 * chew, headTurn: 0.1, lean: 0.08, lShX: 0.05, lEl: -0.2 };
      mika.setPose(mBase);
      mika.root.updateMatrixWorld(true);
      const sw = w.props.sandwichM;
      sw.scale.x = T < 31.48 ? 1 : T < 33.3 ? 0.84 : 0.7; // a bite missing each time
      place(sw, inTorso(mika, -0.08, 0.4, 0.32).lerp(inHead(mika, 0.0, -0.08, 0.38 + 0.08 * sw.scale.x), Math.max(bite1, bite2)), mRot + Math.PI / 2);
      poseReach(mika, mBase, { r: grip(sw) }, { r: out(mika, "r", 0.25) }); // elbow out to the side: no seat-belt arm
      mika.setExpr(chewing ? (chew > 0 ? "smile" : "calm") : "neutral");
      // the tongue bite: one red drop falls to the napkin on "tongue"; the dot stays
      const nap = w.props.napkin;
      nap.visible = true;
      nap.position.set(5.12, 0.752, -2.86);
      const dot = nap.getObjectByName("dot")!;
      dot.visible = T > 32.22;
      const fall = ramp(T, 31.94, 32.22);
      w.props.drop.visible = fall > 0 && fall < 1;
      if (w.props.drop.visible) w.props.drop.position.copy(inHead(mika, 0.0, -0.16, 0.3)).lerp(at(dot, v3(0, 0.02, 0)), easeIn(fall));
      // June: chewing, freezes on "tongue" with the sandwich in front of her mouth, points at Mika on "lunch"
      show(june, 4.8, -4.15, jRot);
      const freeze = T > 31.94;
      const point = easeOut(ramp(T, 32.15, 32.45));
      const jChew = freeze ? 0 : Math.sin(T * 13);
      const jBase: Pose = { ...SIT, headTilt: 0.05 + 0.04 * jChew - 0.06 * point, lean: 0.06 - 0.04 * point };
      june.setPose(jBase);
      june.root.updateMatrixWorld(true);
      const sj = w.props.sandwichJ;
      // held to the camera side of her mouth, clear of the chin, so the arm stays on the silhouette's edge
      // frozen: the sandwich comes down to the table edge on her camera side, so no arm crosses her chest
      place(sj, freeze ? inTorso(june, 0.24, 0.27, 0.4) : inTorso(june, 0.14, 0.42, 0.34).lerp(inHead(june, 0.13, -0.09, 0.5), 0.25 + 0.75 * Math.max(0, jChew)), jRot - Math.PI / 2);
      const toMika = inHead(mika, 0, -0.1, 0).sub(shoulder(june, "r")).normalize();
      const rRest = inTorso(june, -0.2, 0.34, 0.3);
      poseReach(june, jBase, { l: grip(sj), r: rRest.lerp(shoulder(june, "r").addScaledVector(toMika, 0.47), point) }, { l: out(june, "l", 0.2), r: out(june, "r") });
      june.setExpr(freeze ? "alarmed" : jChew > 0.3 ? "talk" : "neutral");
    },
  },
  // 10 · "and you sprain an ankle and keep running, because nothing tells you to stop." — stairwell, a wide side view
  //      that tracks her from the first frame (feet in the upper part of the frame, clear of the captions); her head
  //      turned to us; a running step every 0.36 s, feet planted; the right ankle rolls on "sprain"
  {
    from: 34.03, to: 38.85, a: [0, 0, 0], b: [0, 0, 0], look: [0, 0, 0], fov: 38, style: cool(LOOKS.wideBright), set: "st",
    cam: (T, t) => {
      const g = gait(t);
      const f = clamp01((g.x - STEP.x0) / (STEP.count * STEP.run)) * STEP.count * STEP.rise;
      return { pos: v3(g.x - 0.35, f + 1.15 + 0.04 * t, STEP.z + 5.0), look: v3(g.x + 0.25, f + 0.72, STEP.z) };
    },
    act: (w, T, t) => {
      const m = w.cast.mika;
      const g = gait(t);
      const roll = ramp(T, 34.64, 34.72) * (1 - ramp(T, 34.8, 35.05));
      show(m, g.x, STEP.z, Math.PI / 2, g.rootY);
      const hipY = g.hipY - 0.07 * roll;
      const L = legIK(hipY, g.feet.l),
        R = legIK(hipY, g.feet.r);
      const base: Pose = { ...STAND, hipY, lean: 0.22, lHip: L.hip, lKnee: L.knee, rHip: R.hip, rKnee: R.knee, headTilt: -0.05 - 0.1 * roll, headTurn: -0.62 };
      m.setPose(base);
      m.root.updateMatrixWorld(true);
      w.props.folders.visible = true;
      poseReach(m, base, { l: inTorso(m, 0.17, 0.46, 0.3), r: inTorso(m, -0.17, 0.46, 0.3) }, { l: out(m, "l"), r: out(m, "r") });
      m.parts.rShin.rotation.z = 0.55 * roll;
      m.setExpr(roll > 0.2 ? "blink" : "calm");
      const swell = ramp(T, 34.8, 35.6);
      const an = w.props.ankle;
      an.visible = swell > 0;
      an.scale.set(1.3, 1.5, 1.3).multiplyScalar(0.4 + 0.6 * swell);
      m.root.updateMatrixWorld(true);
      const ankle = new THREE.Vector3();
      an.getWorldPosition(ankle);
      const th = w.sprites.throb;
      th.visible = swell > 0.3;
      th.position.copy(ankle).add(v3(0, 0, 0.06));
      th.scale.setScalar(0.9 + 0.12 * Math.sin(T * 9));
      billboard(th, CAM);
      const wn = w.sprites.warn;
      wn.visible = T > 35.2;
      wn.position.copy(ankle).add(v3(0.16, 0.3, 0.2)); // above and in front of the foot, clear of the leg
      wn.scale.setScalar(Math.max(0.01, backOut(ramp(T, 35.2, 35.5)) * (1 + 0.06 * Math.sin(T * 9))));
      billboard(wn, CAM);
      return ankle.clone().lerp(inTorso(m, 0, 0.4, 0), 0.5);
    },
  },
  // 11 · "Your appendix could burst and you'd just feel off," — torso film, the appendix glows; Dr. Noor alarmed
  {
    from: 38.85, to: 41.72, a: [30.25, 1.45, 1.95], b: [30.2, 1.43, 1.75], look: [30.15, 1.3, -1.8], fov: 34, style: cool(LOOKS.propGlow), set: "fa",
    act: (w, T) => {
      const { noor, mika } = w.cast;
      show(noor, 28.75, -1.95, 0.75);
      pose(noor, { lShX: -1.2, lShZ: 0.5, lEl: -0.2, headTurn: T > 39.8 ? -0.35 : 0.2 });
      noor.setExpr(T > 39.8 ? "alarmed" : "neutral");
      seatOnBench(mika, T);
      pose(mika, { ...benchPose(T), rShX: -1.0, rEl: -0.7, rShZ: -0.1 + 0.28 * Math.sin(T * 15) }, SIT);
      mika.setExpr("calm");
      w.films.draw("torso", clamp01((T - 39.6) / 1.9));
    },
  },
  // 12 · "because pain was never the damage, it's the alarm." — the alarm bell on a plain wall: its clapper is gone
  //      (an empty striker arm, a dashed outline where the clapper should touch the rim); silence
  {
    from: 41.72, to: 45.03, a: [-6.45, 1.92, 1.75], b: [-6.68, 1.91, 1.9], look: [-7.95, 1.85, 2.55], fov: 34, style: cool(LOOKS.objectClose), set: "office",
    act: (w, T, t) => {
      const gh = w.sprites.ghost;
      gh.visible = true;
      gh.position.copy(at(w.props.bell, w.props.bell.userData.clapper as THREE.Vector3));
      (gh.material as THREE.MeshBasicMaterial).opacity = 0.75 + 0.25 * Math.sin(t * 4);
      billboard(gh, CAM);
    },
  },
  // 13 · "And that desk leg on Monday? Your toe's been broken all week." — the foot X-ray owns the frame: the crack
  //      draws on "broken" and the toe glows red; the glow settles before the final still
  {
    from: 45.03, to: 49.6, a: [29.95, 1.62, -0.85], b: [29.85, 1.6, -1.05], look: [29.4, 1.58, -2.535], fov: 36, style: cool(LOOKS.objectClose), set: "fa", hold: 49.0,
    act: (w, T) => {
      const Tp = Math.min(T, 49.0);
      const pulse = Tp < 48.43 ? 0 : 0.65 + 0.35 * Math.sin((Tp - 48.43) * 7);
      w.films.draw("foot", clamp01((T - 47.98) / 0.45), pulse);
    },
  },
];

/** Mika sitting on the exam bench edge, legs swinging. */
const BENCH = { x: FA.x + 1.0, z: -1.5, hipY: 0.74 };
const benchPose = (T: number): Partial<Pose> => ({ lKnee: 1.35 + 0.25 * Math.sin(T * 5), rKnee: 1.35 + 0.25 * Math.sin(T * 5 + 2.2), hipY: BENCH.hipY });
const seatOnBench = (m: Character, T: number) => {
  show(m, BENCH.x, BENCH.z, 0);
  pose(m, { ...benchPose(T), headTurn: 0.15 * Math.sin(T * 0.8) }, SIT);
};

/** Stair run (shot 10): footfall k lands at GAIT.t0 + k·τ on tread GAIT.s0 + k (right foot on even treads), so
 *  footfall 1 — the right foot, tread 2 — lands on "sprain" (t = 0.64). Body x is linear in time; the stance foot stays on its
 *  tread, the swing foot arcs two treads up; the hips ride between the treads. Everything in root space for legIK. */
const GAIT = { tau: 0.36, t0: 0.28, s0: 1, H: 0.6 };
const tread = (j: number) => (j < 0 ? 0 : Math.min(j + 1, STEP.count) * STEP.rise);
const treadX = (j: number) => STEP.x0 + (j + 0.5) * STEP.run;
const gait = (t: number) => {
  const q = (t - GAIT.t0) / GAIT.tau;
  const s = Math.floor(q),
    u = q - s;
  const j = GAIT.s0 + s;
  const x = STEP.x0 + (GAIT.s0 + q) * STEP.run; // over the stance tread's centre at u = 0.5
  const rootY = tread(j);
  const hipW = lerp((tread(j - 1) + tread(j)) / 2, (tread(j) + tread(j + 1)) / 2, u) + GAIT.H + 0.012 * Math.sin(Math.PI * 2 * u);
  const sole = 0.035;
  const stance = { y: tread(j) + sole - rootY, z: treadX(j) - x };
  const su = easeInOut(u);
  const swing = {
    y: lerp(tread(j - 1), tread(j + 1), su) + sole + 0.13 * Math.sin(Math.PI * u) - rootY,
    z: lerp(treadX(j - 1), treadX(j + 1), su) - x,
  };
  const rightStance = ((j % 2) + 2) % 2 === 0;
  return { x, rootY, hipY: hipW - rootY, feet: rightStance ? { r: stance, l: swing } : { l: stance, r: swing } };
};

const OFF = (i: number) => new THREE.Vector3(200 + i * 5, 0, 200);
const SET_CENTER = { office: new THREE.Vector3(0, 0, 0), fa: FA, st: ST };
const MEET_ROT = [Math.PI, Math.PI, 0, 0];

const reset = (w: World) => {
  Object.values(w.cast).forEach((c, i) => {
    c.root.visible = false;
    c.root.position.copy(OFF(i));
    c.setPose(STAND);
    c.setExpr("neutral");
    c.parts.rShin.rotation.z = 0;
    (c.parts.lHand.children[0] as THREE.Mesh).visible = true;
    (c.parts.rHand.children[0] as THREE.Mesh).visible = true;
  });
  const p = w.props;
  [p.heldMug, p.can, p.phone, p.syringe, p.pot, p.mitt, p.pourTable, ...p.heat, p.stream, p.sandwichM, p.sandwichJ, p.napkin, p.drop, p.folders, p.ankle, p.hand, p.fluSign, ...p.teamMugs, ...p.blisters, ...p.smoke, ...p.sizzle, ...p.potSteam, ...p.mugSteam, ...p.canPuffs].forEach((o) => (o.visible = false));
  p.sandwichM.scale.set(1, 1, 1);
  Object.values(w.sprites).forEach((s) => {
    s.visible = false;
    s.rotation.set(0, 0, 0);
    (s.material as THREE.MeshBasicMaterial).opacity = 1;
  });
  const o = w.office;
  o.machine.setState("ready");
  o.machine.steam.forEach((s) => (s.visible = false));
  o.machine.smoke.forEach((s) => (s.visible = false));
  o.tableMachine.group.visible = false;
  o.wisp.forEach((s) => (s.visible = false));
  Object.values(o.chairs).forEach((c) => (c.visible = true));
  o.meetChairs.forEach((c, i) => (c.rotation.y = MEET_ROT[i]));
  w.frontPosts.forEach((m) => (m.visible = true));
};

/** Pose everything for OUTPUT frame `out`; place the camera; return the look + focus point. */
export const applyShot = (w: World, cam: THREE.PerspectiveCamera, out: number): ShotState => {
  CAM = cam;
  const T = out / FPS;
  const shot = [...SHOTS].reverse().find((s) => T >= s.from) ?? SHOTS[0];
  const end = shot.hold ?? shot.to;
  const k = easeInOut(clamp01((Math.min(T, end) - shot.from) / (end - shot.from)));
  let look: THREE.Vector3;
  if (shot.cam) {
    const c = shot.cam(T, T - shot.from);
    cam.position.copy(c.pos);
    look = c.look;
  } else {
    cam.position.set(lerp(shot.a[0], shot.b[0], k), lerp(shot.a[1], shot.b[1], k), lerp(shot.a[2], shot.b[2], k));
    look = new THREE.Vector3(...shot.look);
  }
  cam.lookAt(look);
  cam.fov = shot.fov;
  cam.updateMatrixWorld();
  w.lights.key.target.position.copy(SET_CENTER[shot.set]);
  w.lights.key.target.updateMatrixWorld();
  reset(w);
  w.screenMat.color.setScalar(shot.set !== "fa" ? 1.45 : T >= 45.03 ? 1.0 : T >= 38.85 ? 1.15 : 1.45);
  const focus = shot.act(w, T, T - shot.from) ?? look;
  // one time of day in the office (review 2): the runtime applies look.sky after this, so override it in the look
  const style: Look = shot.set === "office" ? { ...shot.style, sky: "day" } : shot.style;
  w.setSky(style.sky ?? "day");
  return { look: style, focus };
};

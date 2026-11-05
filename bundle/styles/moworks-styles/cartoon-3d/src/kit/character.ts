// The four original office characters (Mika, Ravi, June, Otto): big round head with a painted face cap,
// capsule torso, 2-segment capsule limbs. Built facing +z; root.rotation.y turns them.
import * as THREE from "three";
import { fill, flatChars, INK, limb, toon, sphere } from "./lib";
import { Expr, faceTex, FACE_PHI, FACE_THETA, torsoDetailTex } from "./textures";

export type CharDef = {
  name: string;
  top: string;
  skin: string;
  hair: string;
  style: "tuft" | "glasses" | "bun" | "beanie";
};

export const CAST: Record<"mika" | "ravi" | "june" | "otto", CharDef> = {
  mika: { name: "Mika", top: "#2bb3a3", skin: "#f2cfb5", hair: "#3b2a24", style: "tuft" },
  ravi: { name: "Ravi", top: "#f2b632", skin: "#c98e6a", hair: "#1d1d24", style: "glasses" },
  june: { name: "June", top: "#ff7a6b", skin: "#f6dcc8", hair: "#2b2b38", style: "bun" },
  otto: { name: "Otto", top: "#9b8cf2", skin: "#e2b08a", hair: "#3fae6a", style: "beanie" },
};

/** Joint angles (radians). x = forward swing (negative = forward), z = sideways. */
export type Pose = {
  hipY: number;
  lean: number; // torso forward lean
  headTilt: number; // + = look down
  headTurn: number;
  lShX: number;
  lShZ: number;
  lEl: number;
  rShX: number;
  rShZ: number;
  rEl: number;
  /** shoulder twist (set by armIK when an elbow pole is given; 0 otherwise) */
  lShY?: number;
  rShY?: number;
  lHip: number;
  lKnee: number;
  rHip: number;
  rKnee: number;
  bob: number;
};

export const STAND: Pose = {
  hipY: 0.72,
  lean: 0,
  headTilt: 0,
  headTurn: 0,
  lShX: 0.05,
  lShZ: 0.12,
  lEl: -0.15,
  rShX: 0.05,
  rShZ: -0.12,
  rEl: -0.15,
  lHip: 0,
  lKnee: 0,
  rHip: 0,
  rKnee: 0,
  bob: 0,
};

export const SIT: Pose = {
  ...STAND,
  hipY: 0.48,
  lean: 0.05,
  lShX: -0.35,
  lEl: -0.9,
  rShX: -0.35,
  rEl: -0.9,
  lHip: -1.35,
  lKnee: 1.35,
  rHip: -1.35,
  rKnee: 1.35,
};

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const o: any = {};
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * t;
  return o;
};

/** Walk cycle layered on a standing pose; phase in cycles. */
export const walkPose = (phase: number, amount = 1): Pose => {
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  return {
    ...STAND,
    hipY: 0.72 - 0.02 * amount + 0.025 * amount * Math.abs(c),
    lean: 0.06 * amount,
    lHip: -0.42 * s * amount,
    rHip: 0.42 * s * amount,
    lKnee: Math.max(0, 0.7 * Math.sin(phase * Math.PI * 2 + 1.2)) * amount,
    rKnee: Math.max(0, -0.7 * Math.sin(phase * Math.PI * 2 + 1.2)) * amount,
    lShX: 0.35 * s * amount + 0.05,
    rShX: -0.35 * s * amount + 0.05,
    lEl: -0.35,
    rEl: -0.35,
    bob: 0,
  };
};

export type Character = {
  root: THREE.Group;
  rHand: THREE.Group;
  /** attachment points for props/effects: hands, feet (the knee groups; the shoe sits ~0.37 below), head, torso */
  parts: { lHand: THREE.Group; rHand: THREE.Group; lShin: THREE.Group; rShin: THREE.Group; head: THREE.Group; torso: THREE.Group };
  setPose: (p: Pose) => void;
  setExpr: (e: Expr) => void;
};

export const buildCharacter = (def: CharDef): Character => {
  const root = new THREE.Group();
  root.name = def.name;
  // flat-drawn variant: unlit fills, ink stroke limbs, drawn hairline/clothing lines, no shadows, AO masked by the engine
  const F = flatChars();
  const mat = (c: string) => (F ? fill(c) : toon(c));
  const hips = new THREE.Group();
  root.add(hips);

  // torso (capsule 0 … 0.72 above the hips)
  const torso = new THREE.Group();
  hips.add(torso);
  const torsoStyle = ({ tuft: "hoodie", glasses: "vneck", bun: "cardigan", beanie: "crew" } as const)[def.style];
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.21, 0.3, 10, 28),
    F ? new THREE.MeshBasicMaterial({ map: torsoDetailTex(def.top, torsoStyle) }) : toon(def.top),
  );
  body.position.y = 0.36;
  body.scale.set(1.05, 1, 0.86);
  body.castShadow = body.receiveShadow = true;
  torso.add(body);
  // hoodie pocket / collar detail so the torso isn't a plain pill
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 10, 28), toon(def.top));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.66;
  if (!F) torso.add(collar);

  // head
  const neck = new THREE.Group();
  neck.position.y = 0.7;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.24;
  neck.add(head);
  head.add(sphere(0.3, mat(def.skin), 0, 0, 0, 48));
  const faces: Partial<Record<Expr, THREE.Texture>> = {};
  const faceOpts = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 };
  const faceMat: THREE.MeshToonMaterial | THREE.MeshBasicMaterial = F ? new THREE.MeshBasicMaterial(faceOpts) : new THREE.MeshToonMaterial(faceOpts);
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.3015, 48, 40, Math.PI / 2 - FACE_PHI, 2 * FACE_PHI, Math.PI / 2 - FACE_THETA, 2 * FACE_THETA),
    faceMat,
  );
  // phiStart = π/2 − FACE_PHI puts u = 0 on the viewer's left (−x), so the canvas reads left→right from the front
  face.renderOrder = 2;
  head.add(face);
  const setExpr = (e: Expr) => {
    if (!faces[e]) faces[e] = faceTex(def.skin, e);
    if (faceMat.map !== faces[e]) {
      faceMat.map = faces[e]!;
      faceMat.needsUpdate = true;
    }
  };
  setExpr("neutral");

  // hair / headwear
  const cap = (r: number, thetaLen: number, tiltBack: number, color: string, hairline = true) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, thetaLen), mat(color));
    m.rotation.x = -tiltBack;
    m.castShadow = true;
    head.add(m);
    if (F && hairline) {
      // drawn hairline: an ink ring along the cap's edge
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * Math.sin(thetaLen), 0.009, 8, 64), fill(INK));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = r * Math.cos(thetaLen);
      m.add(ring);
    }
    return m;
  };
  if (def.style === "tuft") {
    cap(0.312, 1.2, 0.42, def.hair);
    // side-swept fringe: a flattened swoop over the right of the forehead
    const fringe = sphere(0.17, mat(def.hair), 0.07, 0.19, 0.17, 32);
    fringe.scale.set(1.25, 0.42, 0.75);
    fringe.rotation.set(0.5, 0, -0.35);
    head.add(fringe);
  } else if (def.style === "glasses") {
    cap(0.312, 1.1, 0.32, def.hair);
    const rim = F ? fill(INK) : toon("#1b1e2b");
    for (const s of [-1, 1]) {
      const dir = new THREE.Vector3(Math.sin(s * 0.27) * Math.cos(0.05), Math.sin(0.05), Math.cos(0.27) * Math.cos(0.05));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.013, 10, 36), rim);
      ring.position.copy(dir.clone().multiplyScalar(0.306)); // close to the face: no rim sticking out in 3/4 views
      ring.userData.noGbuffer = F; // ink already: the outline pass made thin tori scribbly
      ring.lookAt(dir.clone().multiplyScalar(2));
      head.add(ring);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8), rim);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, Math.sin(0.05) * 0.306 + 0.012, 0.3);
    bridge.userData.noGbuffer = F;
    head.add(bridge);
  } else if (def.style === "bun") {
    cap(0.313, 1.3, 0.36, def.hair);
    head.add(sphere(0.11, mat(def.hair), 0, 0.3, -0.1, 28));
  } else {
    const hat = cap(0.322, 1.18, 0.18, def.hair, false);
    hat.scale.set(1, 1.04, 1);
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.296, 0.042, 14, 48), mat("#2f8f55"));
    rimT.rotation.x = Math.PI / 2 - 0.18;
    rimT.position.set(0, 0.11, -0.02);
    head.add(rimT);
    head.add(sphere(0.06, mat("#f7f3e8"), 0, 0.33, -0.06, 20));
  }

  // arms
  const arm = (side: number) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.235, 0.56, 0);
    torso.add(sh);
    const upper = F ? limb(0.017, 0.22, fill(INK)) : limb(0.058, 0.17, def.top);
    sh.add(upper);
    const el = new THREE.Group();
    el.position.y = -0.24;
    upper.add(el);
    const fore = F ? limb(0.017, 0.21, fill(INK)) : limb(0.052, 0.15, def.top);
    el.add(fore);
    const hand = new THREE.Group();
    hand.position.y = -0.24;
    el.add(hand);
    hand.add(sphere(F ? 0.05 : 0.068, mat(def.skin), 0, 0, 0, 20));
    return { sh, el, hand };
  };
  const L = arm(1),
    R = arm(-1);

  // legs
  const leg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.02, 0);
    hips.add(hip);
    const thigh = F ? limb(0.019, 0.28, fill(INK)) : limb(0.07, 0.24, "#2d3352");
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.3;
    thigh.add(knee);
    knee.add(F ? limb(0.019, 0.31, fill(INK)) : limb(0.064, 0.27, "#2d3352"));
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.12, 6, 16), F ? fill(INK) : toon("#1f2230"));
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -0.37, 0.05);
    shoe.scale.set(F ? 0.8 : 1.15, 1, F ? 0.55 : 0.8);
    shoe.castShadow = true;
    knee.add(shoe);
    return { hip, knee };
  };
  const LL = leg(1),
    RL = leg(-1);

  const setPose = (p: Pose) => {
    hips.position.y = p.hipY + p.bob;
    torso.rotation.x = p.lean;
    neck.rotation.x = p.headTilt;
    neck.rotation.y = p.headTurn;
    L.sh.rotation.set(p.lShX, p.lShY ?? 0, p.lShZ);
    L.el.rotation.x = p.lEl;
    R.sh.rotation.set(p.rShX, p.rShY ?? 0, p.rShZ);
    R.el.rotation.x = p.rEl;
    LL.hip.rotation.x = p.lHip;
    LL.knee.rotation.x = p.lKnee;
    RL.hip.rotation.x = p.rHip;
    RL.knee.rotation.x = p.rKnee;
  };
  setPose(STAND);
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    o.castShadow = !F;
    if (F) {
      o.receiveShadow = false;
      o.userData.char = true;
    }
  });
  if (F) {
    // soft blob shadow on the floor instead of a cast shadow
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 40),
      new THREE.MeshBasicMaterial({ color: 0x0b1240, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.004;
    blob.scale.set(1, 0.75, 1);
    blob.userData.noGbuffer = true;
    root.add(blob);
  }
  return { root, rHand: R.hand, parts: { lHand: L.hand, rHand: R.hand, lShin: LL.knee, rShin: RL.knee, head, torso }, setPose, setExpr };
};

// ---------- IK (render review 2026-10-26: hands grip props from the OUTSIDE, feet plant on treads) ----------
const SHOULDER = { x: 0.235, y: 0.56 }; // shoulder pivot in torso space (see arm())
const ARM = 0.24; // upper arm = forearm = 0.24 (shoulder → elbow → hand-sphere centre)
const THIGH = 0.3; // hip pivot → knee
const SHOE = { y: -0.37, z: 0.05 }; // shoe centre below the knee; its sole is ~0.035 lower (flat cast)

/** Arm IK: shoulder + elbow angles that put the hand-sphere CENTRE on a world point (clamped to reach; the elbow
 *  bends forward). Needs the torso's world matrix to be current: use poseReach() unless you manage that yourself. */
export const armIK = (c: Character, side: "l" | "r", target: THREE.Vector3, pole?: THREE.Vector3): Partial<Pose> => {
  const p = c.parts.torso.worldToLocal(target.clone()).sub(new THREE.Vector3((side === "l" ? 1 : -1) * SHOULDER.x, SHOULDER.y, 0));
  const d = Math.min(Math.max(p.length(), 1e-4), 2 * ARM - 1e-4);
  const E = -2 * Math.acos(d / (2 * ARM));
  if (pole) {
    // elbow pole (a WORLD direction the elbow points to, e.g. out and down): place the elbow, then find the shoulder
    // rotation that maps the rest arm (upper −y, forearm folded to +z by E) onto it; decompose as Euler XYZ (with twist)
    const tq = new THREE.Quaternion();
    c.parts.torso.getWorldQuaternion(tq);
    const pl = pole.clone().applyQuaternion(tq.invert());
    const n = p.clone().normalize();
    const perp = pl.sub(n.clone().multiplyScalar(pl.dot(n)));
    if (perp.lengthSq() < 1e-8) perp.set(0, -1, 0).sub(n.clone().multiplyScalar(-n.y));
    perp.normalize();
    const elbow = n.clone().multiplyScalar(d / 2).add(perp.multiplyScalar(Math.sqrt(Math.max(0, ARM * ARM - (d * d) / 4))));
    const u = elbow.clone().normalize(),
      f = p.clone().sub(elbow).normalize();
    const a0 = new THREE.Vector3(0, -1, 0),
      b0 = new THREE.Vector3(0, -Math.cos(E), -Math.sin(E));
    const basis = (x: THREE.Vector3, y: THREE.Vector3) => {
      const ax = x.clone().cross(y).normalize();
      return new THREE.Matrix4().makeBasis(x, ax, x.clone().cross(ax));
    };
    const m = basis(u, f).multiply(basis(a0, b0).transpose());
    const e = new THREE.Euler().setFromRotationMatrix(m, "XYZ");
    return side === "l" ? { lShX: e.x, lShY: e.y, lShZ: e.z, lEl: E } : { rShX: e.x, rShY: e.y, rShZ: e.z, rEl: E };
  }
  const vy = -ARM * (1 + Math.cos(E)),
    vz = -ARM * Math.sin(E);
  const Z = Math.asin(THREE.MathUtils.clamp(-p.x / vy, -1, 1));
  const X = Math.atan2(p.z, p.y) - Math.atan2(vz, vy * Math.cos(Z));
  return side === "l" ? { lShX: X, lShZ: Z, lEl: E } : { rShX: X, rShZ: Z, rEl: E };
};

/** Pose a character, then put its hand-sphere centres on world points (either hand optional). `poles` = world
 *  directions the elbows point to (e.g. out to that side and down) so an arm never cuts across the chest. */
export const poseReach = (c: Character, base: Pose, hands: { l?: THREE.Vector3; r?: THREE.Vector3 }, poles: { l?: THREE.Vector3; r?: THREE.Vector3 } = {}): Pose => {
  c.setPose(base);
  c.root.updateMatrixWorld(true);
  const p: Pose = { ...base, ...(hands.l ? armIK(c, "l", hands.l, poles.l) : {}), ...(hands.r ? armIK(c, "r", hands.r, poles.r) : {}) };
  c.setPose(p);
  c.root.updateMatrixWorld(true);
  return p;
};

/** Leg IK in the character's own side plane (root space: y up, z forward): hip + knee angles that put the SHOE CENTRE
 *  on `target` for a pose with this hipY (+ bob). Out of reach → the leg straightens towards it (heel lift). */
export const legIK = (hipY: number, target: { y: number; z: number }): { hip: number; knee: number } => {
  const dy = target.y - (hipY + 0.02),
    dz = target.z;
  const b = Math.hypot(SHOE.y, SHOE.z),
    th0 = Math.atan2(-SHOE.z, -SHOE.y);
  const L = Math.min(Math.max(Math.hypot(dy, dz), 0.05), THIGH + b - 1e-4);
  const thD = Math.atan2(-dz, -dy); // direction angle: 0 = straight down, + = backwards (matches rotation.x)
  const beta = Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + L * L - b * b) / (2 * THIGH * L), -1, 1));
  const hip = thD - beta; // knee forward
  const ky = -THIGH * Math.cos(hip),
    kz = -THIGH * Math.sin(hip);
  const ey = -L * Math.cos(thD),
    ez = -L * Math.sin(thD);
  const knee = Math.atan2(-(ez - kz), -(ey - ky)) - th0 - hip;
  return { hip, knee };
};

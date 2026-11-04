// CheeseBankVault — the shot list (30 shots, 63 s). Authored on the voice clock: every shot starts ~0.07 s before its
// phrase and key actions land on their stressed word (vo.ts ANCHORS = identity). One look (LOOKS) per shot.
// Each shot has a staging function that poses everything it shows; everyone else is parked far away (QA-safe).
import * as THREE from "three";
import { legIK, mixPose, Pose, poseReach, STAND, walkPose } from "../../kit/character";
import type { Character } from "../../kit/character";
import { backOut, clamp01, easeIn, easeInOut, easeOut, lerp, ramp01, v3 } from "../../kit/lib";
import { LOOKS, LookName, makeRemap } from "../../kit/looks";
import type { Expr } from "../../kit/textures";
import type { ShotState } from "../../kit/ToonVideo";
import { DAIRY_X as X, LAB_X as LX, SLOT, SetName, setFaceMap, WHEEL_H, WHEEL_R, Wheel, World } from "./world";
import { ANCHORS, FPS, FRAMES } from "./vo";

type V = [number, number, number];
type Shot = {
  id: string;
  t0: number; // seconds on the voice clock
  set: SetName;
  style: LookName;
  a: V; // camera start
  b: V; // camera end
  la: V; // aim (and focus) start
  lb?: V; // aim end
  fov: number;
  hold?: number; // camera stops here (s)
  focus?: V; // focus point if not the aim point
};

// prettier-ignore
export const SHOTS: Shot[] = [
  // ---- HOOK ----
  { id: "hookRoll", t0: 0, set: "hall", style: "wideBright", a: [-0.55, 1.1, 1.85], b: [-0.52, 1.12, 1.6], la: [-0.45, 1.6, -3.0], fov: 62, focus: [-0.7, 0.8, -1.6] },
  { id: "hookLend", t0: 0.92, set: "hall", style: "characterClose", a: [2.15, 1.5, -1.15], b: [2.1, 1.48, -1.3], la: [2.0, 1.05, -3.2], fov: 50, focus: [2.0, 1.3, -3.0] },
  { id: "hookSlam", t0: 2.31, set: "hall", style: "objectClose", a: [0.35, 0.8, 0.1], b: [0.45, 0.75, -0.05], la: [1.3, 0.25, -2.0], fov: 60, focus: [1.35, 0.3, -1.75] },
  // ---- DROP-IN (dairy) ----
  { id: "dairyVat", t0: 5.11, set: "dairy", style: "wideBright", a: [X - 1.75, 2.05, 0.0], b: [X - 2.0, 1.95, -0.5], la: [X - 2.6, 1.35, -2.6], fov: 50, focus: [X - 2.6, 1.4, -2.9] },
  { id: "dairyShelf", t0: 7.24, set: "dairy", style: "wideBright", a: [X + 4.3, 1.62, -2.75], b: [X + 4.25, 1.6, -2.75], la: [X + 1.95, 1.3, -2.6], fov: 66, focus: [X + 2.0, 1.4, -2.3] },
  { id: "dairyCalendar", t0: 9.51, set: "dairy", style: "objectClose", a: [X + 0.62, 1.58, -1.45], b: [X + 0.66, 1.57, -1.65], la: [X + 0.6, 1.62, -3.3], fov: 56 },
  { id: "dairyBills", t0: 11.96, set: "dairy", style: "characterClose", a: [X + 0.25, 1.48, 1.85], b: [X + 0.2, 1.46, 1.65], la: [X, 1.1, -0.2], fov: 54, focus: [X, 1.3, -0.3] },
  // ---- LADDER (hall) ----
  { id: "hallEnter", t0: 13.93, set: "hall", style: "wideBright", a: [0.95, 1.0, 1.3], b: [0.9, 0.98, 1.05], la: [0.25, 1.15, 7.0], fov: 52, focus: [0.3, 1.0, 5.0] },
  { id: "hallHigh", t0: 16.21, set: "hall", style: "roomHigh", a: [-2.4, 4.3, -4.5], b: [-2.2, 4.2, -4.3], la: [0.5, 0.3, 2.3], fov: 56 },
  { id: "raviSuit", t0: 17.79, set: "hall", style: "characterClose", a: [0.95, 1.7, 0.1], b: [0.9, 1.68, -0.05], la: [0.55, 1.6, -1.78], fov: 42 },
  { id: "tap", t0: 18.71, set: "hall", style: "objectClose", a: [-1.75, 1.05, 0.55], b: [-1.62, 1.03, 0.42], la: [0.5, 0.74, -1.45], fov: 50, focus: [0.5, 0.8, -1.3] },
  { id: "listen", t0: 20.97, set: "hall", style: "characterClose", a: [-0.6, 1.02, 0.05], b: [-0.54, 0.97, -0.05], la: [0.5, 1.32, -1.25], lb: [0.5, 0.86, -1.1], fov: 54, focus: [0.5, 0.95, -1.15] },
  { id: "nod", t0: 23.85, set: "hall", style: "characterClose", a: [1.75, 1.62, 0.15], b: [1.7, 1.62, 0.0], la: [0.55, 1.55, -1.78], fov: 50 },
  { id: "doorOpen", t0: 24.95, set: "hall", style: "wideBright", a: [2.7, 1.3, 2.1], b: [2.45, 1.28, 1.75], la: [-0.55, 1.75, -4.6], fov: 58, hold: 27.6, focus: [-0.2, 1.6, -4.6] },
  // ---- LADDER (vault) ----
  { id: "vaultPush", t0: 27.79, set: "vault", style: "wideBright", a: [0, 1.5, -2.7], b: [0, 1.55, -7.0], la: [0, 1.6, -14], lb: [0, 1.9, -16], fov: 54, focus: [0.9, 1.5, -9.5] },
  { id: "vaultUp", t0: 29.37, set: "vault", style: "roomHigh", a: [-0.38, 0.42, -9.2], b: [-0.32, 0.55, -9.45], la: [0.85, 1.1, -11.4], lb: [0.85, 8.6, -11.0], fov: 64 },
  { id: "vaultHigh", t0: 31.67, set: "vault", style: "roomHigh", a: [1.59, 10.5, -5.6], b: [1.59, 10.42, -6.1], la: [1.59, 3.2, -17.0], fov: 34, focus: [1.59, 8.4, -11.0] },
  { id: "inspectWalk", t0: 34.3, set: "vault", style: "wideBright", a: [0, 1.45, -11.5], b: [0, 1.45, -11.9], la: [0, 1.35, -16.5], fov: 40, focus: [0, 1.3, -15.8] },
  { id: "inspectCrack", t0: 37.26, set: "vault", style: "objectClose", a: [0.05, 1.27, -14.72], b: [-0.05, 1.25, -14.78], la: [-0.86, 1.14, -14.98], fov: 46, focus: [-0.72, 1.15, -14.97] },
  // ---- DOUBT (dairy) ----
  { id: "friendsLaugh", t0: 38.94, set: "dairy", style: "wideBright", a: [X + 0.1, 1.72, 5.45], b: [X + 0.05, 1.66, 5.1], la: [X, 1.2, 0.3], fov: 60, focus: [X, 1.3, 0.8] },
  { id: "juneJoke", t0: 41.27, set: "dairy", style: "characterClose", a: [X + 0.3, 1.7, 2.95], b: [X + 0.36, 1.68, 2.75], la: [X + 0.85, 1.62, 0.95], fov: 48 },
  // ---- TURN (lab + vault + hall) ----
  { id: "labCut", t0: 43.27, set: "lab", style: "propGlow", a: [LX + 0.2, 1.8, 4.3], b: [LX + 0.1, 1.7, 3.9], la: [LX, 0.95, -0.15], fov: 46 },
  { id: "labClose", t0: 46.71, set: "lab", style: "objectClose", a: [LX + 0.45, 1.42, 1.9], b: [LX + 0.38, 1.35, 1.65], la: [LX + 0.05, 0.8, 0.3], fov: 48 },
  { id: "vaultStore", t0: 48.29, set: "vault", style: "wideBright", a: [-0.42, 1.55, -6.4], b: [-0.36, 1.53, -6.6], la: [0.55, 1.35, -8.4], fov: 54 },
  { id: "vaultAge", t0: 50.19, set: "vault", style: "objectClose", a: [-0.45, 1.45, -7.45], b: [-0.38, 1.44, -7.55], la: [0.98, 1.36, -8.25], fov: 60, focus: [1.0, 1.3, -8.2] },
  { id: "cantPay", t0: 52.68, set: "hall", style: "characterClose", a: [2.7, 1.62, -2.95], b: [2.65, 1.61, -3.05], la: [1.8, 1.45, -1.55], fov: 52 },
  { id: "sold", t0: 54.35, set: "hall", style: "objectClose", a: [1.45, 1.55, -0.8], b: [1.52, 1.5, -0.95], la: [1.8, 1.12, -2.7], lb: [1.9, 1.15, -2.75], fov: 54, focus: [1.6, 1.05, -2.5] },
  // ---- KICKER (vault) ----
  { id: "finallyWide", t0: 57.68, set: "vault", style: "propGlow", a: [0.05, 1.35, -12.7], b: [0.05, 1.38, -12.3], la: [0.0, 1.75, -8.4], fov: 50 },
  { id: "finalPat", t0: 59.69, set: "vault", style: "characterClose", a: [-0.78, 1.62, -6.4], b: [-0.7, 1.6, -6.56], la: [0.6, 1.42, -8.25], fov: 58, hold: 62.35 },
];

export const remap = makeRemap(ANCHORS, FPS);
const END = FRAMES / FPS;
/** Ravi's far lens disappears once it is seen edge-on (head turned > ~72° from the camera), so it never hangs off
 *  the head's silhouette. Used on the shots where his head turns far from the camera. */
const FAR_LENS_SHOTS = new Set(["listen", "vaultStore", "doorOpen"]);
const lensFix = (ch: Character, cam: THREE.PerspectiveCamera) => {
  const head = ch.parts.head;
  ch.root.updateMatrixWorld(true);
  const c = head.getWorldPosition(new THREE.Vector3());
  const rings: THREE.Object3D[] = [];
  head.children.forEach((o: any) => {
    const p = o.geometry?.parameters;
    if (o.geometry?.type === "TorusGeometry" && p && Math.abs(p.radius - 0.068) < 1e-3) rings.push(o);
  });
  rings.forEach((r) => {
    const at = r.getWorldPosition(new THREE.Vector3());
    const n = at.clone().sub(c).normalize();
    const v = cam.position.clone().sub(at).normalize();
    r.visible = n.dot(v) > 0.45;
  });
};
const lensReset = (ch: Character) =>
  ch.parts.head.children.forEach((o: any) => {
    if (o.geometry?.type === "TorusGeometry") o.visible = true;
  });
const shotIndexAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k].t0) i = k;
  return i;
};

// ---------------- helpers ----------------
type Name = keyof World["cast"];
const NAMES: Name[] = ["otto", "ravi", "mika", "june", "bea", "leo"];
const neckOf = (ch: Character) => ((ch.root.children[0] as THREE.Group).children[0] as THREE.Group).children[1] as THREE.Group;
const place = (ch: Character, x: number, z: number, rotY: number) => {
  ch.root.position.set(x, 0, z);
  ch.root.rotation.y = rotY;
};
const heading = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);
/** Shoulder pitch that points an arm at a target in the character's frame (fwd m in front of the root, up m high). */
const aimArm = (p: Pose, fwd: number, up: number) => {
  const shY = p.hipY + 0.56 * Math.cos(p.lean);
  const shF = 0.56 * Math.sin(p.lean);
  return Math.atan2(-(fwd - shF), -(up - shY)) - p.lean;
};
/** Two-bone arm IK in the character's sagittal plane: shoulder pitch + elbow bend that put the hand at (fwd, up). */
const ik = (p: Pose, fwd: number, up: number) => {
  const sy = p.hipY + 0.56 * Math.cos(p.lean);
  const sf = 0.56 * Math.sin(p.lean);
  const dx = fwd - sf,
    dy = up - sy;
  const L = Math.min(Math.hypot(dx, dy), 0.475);
  const chord = Math.atan2(-dx, -dy);
  const a = Math.acos(Math.min(1, L / 0.48));
  const upper = chord + a,
    fore = chord - a;
  return { sh: upper - p.lean, el: fore - upper, fore };
};
const blinkExpr = (t: number, base: Expr, seed: number): Expr => {
  const c = (t * 0.55 + seed * 0.37) % 1;
  return c < 0.035 ? "blink" : base;
};
const idle = (t: number, seed: number): Pose => ({ ...STAND, headTurn: 0.08 * Math.sin(t * 0.9 + seed), headTilt: 0.03 * Math.sin(t * 0.7 + seed * 2) });
/** Push pose: walking with both arms forward on the wheel. */
const PUSH_GAP = 0.72; // root → wheel centre while pushing (hands land on the wheel's upper back)
const pushPose = (phase: number, amount: number): Pose => {
  const w = walkPose(phase, amount);
  const p: Pose = { ...w, lean: 0.66, headTilt: -0.55, lShZ: 0.14, rShZ: -0.14, lEl: -0.05, rEl: -0.05 };
  p.lShX = p.rShX = aimArm(p, 0.5, 0.66);
  return p;
};
/** An upright wheel rolling along a heading; d = distance travelled. */
const rollWheel = (w: Wheel, x: number, z: number, yaw: number, d: number) => {
  w.g.visible = true;
  w.g.position.set(x, WHEEL_R, z);
  w.g.rotation.set(0, yaw, 0);
  w.tilt.rotation.set(0, 0, Math.PI / 2);
  w.spin.rotation.set(0, -d / WHEEL_R, 0);
};
/** Otto's wheel standing on its edge in front of Ravi (hall), stamped face towards +x, text upright. */
const SPIN0 = 0;
const parkWheel = (w: World) => rollWheel(w.heroWheel, 0.55, -1.05, 0, SPIN0 * WHEEL_R);
const flatWheel = (w: Wheel, x: number, y: number, z: number, yaw = 0) => {
  w.g.visible = true;
  w.g.position.set(x, y + WHEEL_H / 2, z);
  w.g.rotation.set(0, yaw, 0);
  w.tilt.rotation.set(0, 0, 0);
  w.spin.rotation.set(0, 0, 0);
};
const v = new THREE.Vector3();
const handPos = (ch: Character) => {
  ch.root.updateMatrixWorld(true);
  return ch.rHand.getWorldPosition(v.clone());
};

// ---------------- reset ----------------
const reset = (w: World, t: number) => {
  NAMES.forEach((n, i) => {
    const ch = w.cast[n];
    place(ch, 200 + i * 4, 200, 0);
    ch.setPose(STAND);
    ch.setExpr("neutral");
    neckOf(ch).rotation.z = 0;
  });
  const { hall, dairy, lab, vault, props } = w;
  w.heroWheel.g.visible = false;
  w.heroWheel.g.position.set(150, 1, 150);
  w.heroWheel.setAge(0.3);
  hall.door.rotation.y = 0;
  hall.handle.rotation.z = 0;
  hall.glowLight.intensity = 0;
  hall.glowLight.userData.base = 0;
  hall.bag.visible = false;
  hall.tag.visible = false;
  hall.rings.forEach((r) => (r.visible = false));
  dairy.newWheel.g.visible = false;
  dairy.bills.forEach((b) => (b.visible = false));
  dairy.wedge.visible = false;
  dairy.shelfWheels.forEach((s) => s.setAge(0.08));
  dairy.calendar.draw(9);
  dairy.calPage.rotation.x = 0;
  dairy.calPage.visible = false;
  vault.calendar.draw(9);
  vault.calPage.rotation.x = 0;
  vault.calPage.visible = false;
  props.hammer.visible = false;
  props.magnifier.visible = false;
  w.posts.visible = true;
  w.sideRacks.forEach((o) => (o.visible = true));
  NAMES.forEach((n) => (w.cast[n].root.rotation.z = 0));
  w.torch.intensity = 0;
  props.flashL.visible = false;
  props.flashB.visible = false;
  w.dairy.paddle.visible = false;
  // steam: soft wisps rising off the warm milk, drifting and fading
  dairy.steam.forEach((s, i) => {
    const c = (t * 0.32 + i / dairy.steam.length) % 1;
    // they rise between the milk and Otto, so they read as soft veils over his apron and hat
    s.position.set(X - 2.6 + 0.3 * Math.sin(i * 2.4) + 0.06 * Math.sin(c * 5 + i), 1.15 + c * 0.75, -2.2 + 0.18 * Math.cos(i * 1.9));
    s.scale.setScalar(0.22 + c * 0.38);
    (s.material as THREE.SpriteMaterial).opacity = 0.7 * Math.sin(Math.PI * c);
  });
  lab.setCutAge(0);
  lab.coins.forEach((c) => (c.visible = false));
};

// ---------------- staging per shot ----------------
type Stage = (w: World, t: number, lt: number) => void;
const STAGES: Record<string, Stage> = {
  hookRoll: (w, t) => {
    // Otto rolls the giant wheel across the marble, past the vault door
    const { otto, ravi } = w.cast;
    const k = t / 0.92;
    const x = lerp(-0.65, 0.4, k);
    rollWheel(w.heroWheel, x, -1.6, Math.PI / 2, x + 0.65);
    place(otto, x - PUSH_GAP, -1.6, Math.PI / 2);
    otto.setPose({ ...pushPose(t * 1.7, 1), headTurn: -0.55 });
    otto.setExpr("eager");
    place(ravi, 2.0, -3.3, -0.5);
    ravi.setPose(idle(t, 1));
  },
  hookLend: (w, t, lt) => {
    // Ravi slides a money bag across his desk (in the screen plane), his fist against its flank: "lend you money"
    const { ravi } = w.cast;
    place(ravi, 2.0, -3.3, 0);
    const push = ramp01(t, 1.2, 1.95, easeOut);
    const bagX = lerp(2.2, 1.85, push);
    const bag = w.hall.bag;
    bag.visible = true;
    bag.position.set(bagX, 0.78, -2.85);
    bag.rotation.set(0, 0.3, 0);
    poseReach(ravi, { ...STAND, lean: 0.3, headTilt: 0.05 }, { l: v3(bagX + 0.2, 0.93, -2.85) });
    ravi.setExpr(lt > 0.2 ? "smile" : "neutral");
  },
  hookSlam: (w, t) => {
    // the wheel rolls in, wobbles and slams down flat on "cheese" (4.18)
    const { otto, ravi } = w.cast;
    const wh = w.heroWheel;
    const roll = ramp01(t, 2.31, 3.75, easeOut);
    const x = lerp(-0.9, 1.3, roll);
    if (t < 3.75) {
      rollWheel(wh, x, -1.75, Math.PI / 2, x + 0.9);
      wh.g.rotation.x = 0.06 * Math.sin(t * 9) * roll; // a little wobble as it slows
    } else {
      const fall = easeIn(clamp01((t - 3.75) / (4.18 - 3.75)));
      const after = Math.max(0, t - 4.18);
      const bounce = 0.11 * Math.exp(-after * 9) * Math.sin(after * 38);
      const phi = (Math.PI / 2) * (1 - fall) + (t >= 4.18 ? Math.abs(bounce) : 0);
      wh.g.visible = true;
      wh.g.position.set(1.3 + 0.12 * fall, WHEEL_R * Math.sin(phi) + (WHEEL_H / 2) * Math.cos(phi), -1.75);
      wh.g.rotation.set(0, Math.PI / 2, 0);
      wh.tilt.rotation.set(0, 0, phi);
      wh.spin.rotation.set(0, -2.2 / WHEEL_R, 0);
    }
    place(otto, lerp(-1.62, -1.15, roll), -1.6, Math.PI / 2);
    otto.setPose(mixPose(pushPose(t * 1.6, 0.6), STAND, ramp01(t, 2.6, 3.3)));
    otto.setExpr("eager");
    place(ravi, 2.15, -3.3, -0.35);
    const look = ramp01(t, 3.6, 4.1);
    ravi.setPose({ ...STAND, headTilt: 0.15 + 0.2 * look, lean: 0.05 * look });
    ravi.setExpr(t > 4.2 ? "alarmed" : "neutral");
  },
  dairyVat: (w, t) => {
    // Otto stirs the milk in the open copper vat, both fists on the paddle's shaft; soft steam rises
    const { otto } = w.cast;
    place(otto, X - 2.6, -3.12, 0);
    const a = t * 2.6;
    // a near-vertical paddle just inside the far rim: both fists on its upper shaft, the knob below his chin
    const top = v3(X - 2.6 - 0.1 + 0.04 * Math.sin(a), 1.38, -2.6 + 0.02 * Math.cos(a));
    const bot = v3(X - 2.6 + 0.16 * Math.sin(a), 0.62, -2.2 + 0.12 * Math.cos(a));
    const pd = w.dairy.paddle;
    pd.visible = true;
    pd.position.copy(top);
    pd.quaternion.setFromUnitVectors(v3(0, -1, 0), bot.clone().sub(top).normalize());
    pd.updateMatrixWorld(true);
    const [g1, g2] = pd.userData.grips as THREE.Vector3[];
    const up = g1.clone().applyMatrix4(pd.matrixWorld),
      low = g2.clone().applyMatrix4(pd.matrixWorld);
    poseReach(otto, { ...STAND, lean: 0.18, headTilt: 0.15 }, { r: up, l: low });
    otto.setExpr(blinkExpr(t, "smile", 1));
  },
  dairyShelf: (w, t) => {
    // Otto slides a fresh, pale wheel into the empty slot on the aging shelf (lands on "shelf" 8.78)
    const { otto } = w.cast;
    const k = ramp01(t, 7.45, 8.75, easeInOut);
    const z = lerp(-2.42, -3.2, k);
    place(otto, X + 2.0, lerp(-2.0, -2.35, k), Math.PI);
    const p: Pose = { ...STAND, lean: 0.12 + 0.1 * k, headTilt: 0.05 };
    const fwd = -(z - otto.root.position.z) - WHEEL_R + 0.03;
    p.rShX = p.lShX = aimArm(p, fwd, 1.2);
    p.rShZ = -0.28;
    p.lShZ = 0.28;
    p.rEl = p.lEl = -0.15;
    p.headTurn = -0.6 * ramp01(t, 7.6, 8.2);
    otto.setPose(p);
    otto.setExpr(t > 8.1 ? "smile" : "calm");
    const nw = w.dairy.newWheel;
    flatWheel(nw, X + 2.0, 1.12, z);
    nw.setAge(0.05);
  },
  dairyCalendar: (w, t) => {
    // a year of calendar pages flips by while the shelf of wheels turns golden
    const k = ramp01(t, 9.62, 11.7, (x) => x);
    flipCalendar(w.dairy.calendar, w.dairy.calPrev, w.dairy.calPage, k, (a) => (w.dairy.calPage.rotation.x = -a));
    const age = 0.08 + 0.92 * easeInOut(k);
    w.dairy.shelfWheels.forEach((s) => s.setAge(age));
    const nw = w.dairy.newWheel;
    flatWheel(nw, X + 2.0, 1.12, -3.2);
    nw.setAge(age);
  },
  dairyBills: (w, t) => {
    // bills drop onto the table one after another; Otto's face falls ("due now")
    const { otto } = w.cast;
    place(otto, X, -0.38, 0);
    const shock = ramp01(t, 12.55, 12.85, easeOut);
    otto.setPose({ ...STAND, headTilt: 0.22 - 0.1 * shock, lean: -0.06 * shock, lShX: -0.35 * shock, rShX: -0.35 * shock, lEl: -1.2 * shock, rEl: -1.2 * shock, lShZ: 0.35, rShZ: -0.35 });
    otto.setExpr(t > 12.6 ? "alarmed" : blinkExpr(t, "neutral", 2));
    const drops = [12.05, 12.32, 12.68, 12.92];
    const spots: [number, number, number][] = [
      [-0.18, 0.5, 0.25],
      [0.16, 0.42, -0.35],
      [-0.02, 0.6, 0.6],
      [0.22, 0.58, -0.1],
    ];
    w.dairy.bills.forEach((b, i) => {
      const k = clamp01((t - drops[i]) / 0.2);
      b.visible = t >= drops[i];
      const [dx, dz, rot] = spots[i];
      b.position.set(X + dx, 0.805 + 0.007 * i + 1.6 * (1 - easeIn(k)), dz);
      b.rotation.set(0.25 * (1 - k), rot + 0.6 * (1 - k), 0);
    });
  },
  hallEnter: (w, t) => {
    // Otto rolls his best wheel in through the bank's front doors, towards camera
    const { otto } = w.cast;
    const k = ramp01(t, 13.93, 16.21, (x) => x);
    const z = lerp(8.6, 3.9, k);
    rollWheel(w.heroWheel, 0.25, z, 0, 8.6 - z);
    place(otto, 0.25, z + PUSH_GAP, Math.PI);
    otto.setPose(pushPose(t * 1.7, 1));
    otto.setExpr("eager");
  },
  hallHigh: (w, t) => {
    const { otto, ravi } = w.cast;
    const k = ramp01(t, 16.21, 17.79, (x) => x);
    const z = lerp(3.3, 2.0, k);
    rollWheel(w.heroWheel, 0.4, z, 0, 3.3 - z);
    place(otto, 0.4, z + PUSH_GAP, Math.PI);
    otto.setPose(pushPose(t * 1.7, 1));
    place(ravi, 2.0, -3.3, 0); // at his desk, out of this frame
    ravi.setPose(idle(t, 3));
  },
  raviSuit: (w, t) => {
    // "a man in a suit": Ravi straightens his lapels, hands on his chest, pleased with himself
    const { ravi } = w.cast;
    place(ravi, 0.55, -1.7, 0);
    const tug = Math.sin(clamp01((t - 17.85) / 0.7) * Math.PI);
    const base: Pose = { ...STAND, headTilt: -0.06 + 0.04 * tug, lean: -0.03 };
    ravi.setPose(base);
    ravi.root.updateMatrixWorld(true);
    const lap = (x: number) => ravi.parts.torso.localToWorld(v3(x, 0.5 + 0.03 * tug, 0.25));
    poseReach(ravi, base, { l: lap(0.1), r: lap(-0.1) });
    ravi.setExpr(blinkExpr(t, "smile", 4));
    w.heroWheel.g.visible = true;
    parkWheel(w);
  },
  tap: (w, t) => {
    // three taps of the little steel hammer: 18.78 ("taps"), 19.62, 20.52 ("hammer"); Ravi turned 3/4 to camera
    const { ravi } = w.cast;
    parkWheel(w);
    place(ravi, 0.55, -1.8, -0.2);
    const taps = [18.78, 19.62, 20.52];
    let lift = 1;
    for (const tt of taps) {
      const d = t - tt;
      if (d > -0.18 && d < 0.3) lift = Math.min(lift, d < 0 ? -d / 0.18 : Math.min(1, d / 0.3));
    }
    const p: Pose = { ...STAND, lean: 0.45, headTilt: 0.35, headTurn: -0.15 };
    const a = ik(p, 0.36, 0.86 + 0.1 * lift);
    p.rShX = a.sh;
    p.rEl = a.el;
    p.rShZ = -0.06;
    p.lShX = 0.1;
    p.lEl = -0.3;
    ravi.setPose(p);
    ravi.setExpr("calm");
    w.props.hammer.visible = true;
    w.props.hammer.rotation.set(-1.2 - 0.9 * lift - a.fore, 0, 0);
    // a small ring of sound per tap, hugging the stamped face (never reaching Ravi)
    w.hall.rings.forEach((r, i) => {
      const d = t - taps[i];
      r.visible = d > 0 && d < 0.4;
      const s = Math.min(WHEEL_R * 1.3, WHEEL_R + d * 0.35);
      r.position.set(0.39, WHEEL_R, -1.05);
      r.rotation.set(0, Math.PI / 2, 0);
      r.scale.set(s, s, 1);
      (r.material as THREE.MeshBasicMaterial).transparent = true;
      (r.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - d / 0.4);
    });
  },
  listen: (w, t) => {
    // Ravi crouches and lays his ear on the top of the rind, eyes closed: listening for air bubbles
    const { ravi } = w.cast;
    parkWheel(w);
    place(ravi, 0.32, -1.86, 0);
    const k = ramp01(t, 20.6, 21.35);
    const hipY = lerp(0.72, 0.5, k);
    const leg = legIK(hipY, { y: 0.05, z: 0.3 * k }); // shoes planted every frame; shins end vertical
    const p: Pose = {
      ...STAND,
      hipY,
      lHip: leg.hip,
      rHip: leg.hip,
      lKnee: leg.knee,
      rKnee: leg.knee,
      lean: lerp(0.15, 0.95, k),
      headTilt: -0.85 * k, // face forward (towards us), not into the floor
    };
    p.rShX = 0.25 - p.lean * 0.6;
    p.rShZ = -0.25;
    p.rEl = -0.2;
    p.lShX = -0.55;
    p.lShZ = 0.35;
    p.lEl = -1.1;
    ravi.setPose(p);
    neckOf(ravi).rotation.z = -0.45 * k; // a gentle tilt keeps his face within ~45° of the camera
    ravi.setExpr(t > 21.35 ? "blink" : "calm");
    w.props.hammer.visible = true;
    w.props.hammer.rotation.set(0.1, 0, 0);
  },
  nod: (w, t) => {
    // Ravi straightens up and nods (24.5)
    const { ravi } = w.cast;
    parkWheel(w);
    place(ravi, 0.55, -1.8, 0);
    const up = ramp01(t, 23.85, 24.25);
    const nod = Math.sin(clamp01((t - 24.35) / 0.42) * Math.PI);
    ravi.setPose({ ...mixPose({ ...STAND, lean: 0.35, hipY: 0.66, lKnee: 0.4, rKnee: 0.4, lHip: -0.25, rHip: -0.25 }, STAND, up), headTilt: 0.3 * nod });
    ravi.setExpr(t > 24.3 ? "smile" : "calm");
    w.props.hammer.visible = true; // still in his hand
    w.props.hammer.rotation.set(0.1, 0, 0);
  },
  doorOpen: (w, t) => {
    // Ravi turns the handle wheel a quarter turn on "vault" (26.08), steps back, and the door swings open (26.75–27.7)
    const { ravi } = w.cast;
    parkWheel(w);
    const spin = ramp01(t, 25.75, 26.45, easeInOut);
    w.hall.handle.rotation.z = -1.1 * spin;
    const open = ramp01(t, 26.75, 27.7, easeInOut);
    w.hall.door.rotation.y = -1.75 * open;
    w.hall.glowLight.userData.base = 6 * open;
    w.hall.glowLight.intensity = 6 * open;
    const away = ramp01(t, 26.5, 27.15, easeInOut);
    place(ravi, lerp(-0.62, 1.45, away), lerp(-4.12, -3.3, away), lerp(Math.PI - 0.6, 0.94, away));
    const moving = Math.sin(Math.PI * away);
    const base: Pose = { ...mixPose(STAND, walkPose(t * 1.8, 1), moving), lean: 0.1 * (1 - away) };
    if (away < 0.12) {
      w.hall.handle.updateMatrixWorld(true);
      const grip = (a: number) => w.hall.handle.localToWorld(v3(0.42 * Math.cos(a), 0.42 * Math.sin(a), 0.17));
      // facing the door his left fist is on the −x side of the wheel
      poseReach(ravi, base, { l: grip(Math.PI - 0.2), r: grip(Math.PI / 2 + 0.25) });
    } else {
      const g = ramp01(t, 27.0, 27.4, easeOut);
      ravi.setPose({ ...base, rShX: lerp(base.rShX, -0.4, g), rShZ: lerp(base.rShZ, -1.1, g), rEl: lerp(base.rEl, -0.2, g) });
    }
    ravi.setExpr("smile");
  },
  vaultPush: (w) => {
    w.hall.door.rotation.y = -1.75;
    w.hall.glowLight.userData.base = 6;
  },
  vaultUp: () => {},
  vaultHigh: (w) => {
    w.posts.visible = false; // from above, posts and side racks read as a chain-link cage: only the centre rows show
    w.sideRacks.forEach((o) => (o.visible = false));
  },
  inspectWalk: (w, t) => {
    // two inspectors in white coats walk the aisle towards camera, torches on
    const { bea, leo } = w.cast;
    const k = ramp01(t, 34.3, 37.26, (x) => x);
    const z0 = lerp(-19.6, -15.2, k);
    [
      [bea, -0.4, 0],
      [leo, 0.4, 0.45],
    ].forEach(([ch, x, ph]) => {
      const c = ch as Character;
      place(c, x as number, z0 - (ph as number) * 0.4, 0);
      const wp = walkPose(t * 1.5 + (ph as number), 0.85);
      // torches up, aimed at the wheels on their side of the aisle
      c.setPose({ ...wp, rShX: -1.15, rShZ: (x as number) < 0 ? -0.45 : 0.2, rEl: -0.25, headTurn: (x as number) < 0 ? 0.3 + 0.2 * Math.sin(t * 1.1) : -0.3 + 0.2 * Math.sin(t * 0.9 + 1) });
      c.setExpr(blinkExpr(t, "neutral", (ph as number) * 3 + 1));
    });
    w.props.flashB.visible = true;
    w.props.flashL.visible = true;
  },
  inspectCrack: (w, t) => {
    // insert: Leo's magnifier held right over a hairline crack in the lit rind; his torch beside it
    const { leo } = w.cast;
    place(leo, -0.25, -15.32, -Math.PI / 2 + 0.3);
    const mg = w.props.magnifier;
    mg.visible = true;
    mg.position.set(-0.74, 1.15 + 0.008 * Math.sin(t * 2.4), -14.98 + 0.01 * Math.sin(t * 1.7));
    mg.rotation.set(0, Math.PI / 2, 0); // lens faces the rind and us
    mg.updateMatrixWorld(true);
    const grip = (mg.userData.grip as THREE.Vector3).clone().applyMatrix4(mg.matrixWorld);
    const torchHand = v3(-0.42, 1.18, -15.42);
    poseReach(leo, { ...STAND, lean: 0.15, headTilt: 0.2, headTurn: 0.2 }, { l: grip, r: torchHand });
    leo.setExpr(blinkExpr(t, "neutral", 7));
    w.props.flashL.visible = false; // the torch is just out of frame; only its light shows
    w.torch.position.set(-0.55, 1.24, -15.18 + 0.03 * Math.sin(t * 2.2));
    w.torch.intensity = 0.3;
  },
  friendsLaugh: (w, t) => {
    // Mika and June crack up at Otto's wheel (3/4 to camera, turned to him); Otto, behind the table, is not amused
    const { otto, mika, june } = w.cast;
    place(otto, X, -0.42, 0);
    flatWheel(w.heroWheel, X, 0.8, 0.28);
    w.heroWheel.setAge(0.35);
    const rimBack = WHEEL_R - 0.02;
    poseReach(otto, { ...STAND, headTilt: 0.05 }, { l: v3(X + 0.18, 0.86 + WHEEL_H, 0.28 - rimBack * 0.6), r: v3(X - 0.18, 0.86 + WHEEL_H, 0.28 - rimBack * 0.6) });
    otto.setExpr(blinkExpr(t, "calm", 3));
    const laugh = (ch: Character, x: number, z: number, rot: number, ph: number, point: boolean, tex: THREE.Texture) => {
      place(ch, x, z, rot);
      const shake = Math.sin(t * 21 + ph);
      ch.root.rotation.z = 0.06 * shake; // shoulders shake side to side (in the picture plane)
      const back = 0.5 + 0.5 * Math.sin(t * 3.1 + ph);
      const base: Pose = { ...STAND, lean: -0.1 - 0.06 * back, headTilt: -0.3 - 0.18 * back, headTurn: 0.1 * Math.sin(t * 2 + ph) };
      ch.setPose(base);
      ch.root.updateMatrixWorld(true);
      const belly = ch.parts.torso.localToWorld(v3(0.06, 0.28, 0.24));
      if (point) {
        const wheel = v3(X, 1.2, 0.28);
        const from = v3(x, 1.25, z);
        const aim = from.clone().add(wheel.sub(from).normalize().multiplyScalar(0.62));
        poseReach(ch, base, { l: aim, r: belly });
      } else poseReach(ch, base, { r: belly, l: ch.parts.torso.localToWorld(v3(0.12, 0.2, 0.24)) });
      setFaceMap(ch, tex);
    };
    laugh(mika, X - 0.85, 1.1, 1.0, 0, true, w.laugh.mika);
    laugh(june, X + 0.85, 1.12, -1.0, 1.7, false, w.laugh.june);
  },
  juneJoke: (w, t) => {
    // June holds up a wedge by its rind like a gold coin: "a bank full of cheese?"
    const { june } = w.cast;
    place(june, X + 1.0, 0.95, -0.25);
    const b = Math.abs(Math.sin(t * 6.5));
    const base: Pose = { ...STAND, lean: -0.08 - 0.05 * b, headTilt: -0.12 - 0.08 * b, lShX: -0.4, lEl: -1.4, lShZ: 0.2 };
    june.setPose(base);
    const wd = w.dairy.wedge;
    wd.visible = true;
    const hand = v3(X + 0.62, 1.38 + 0.02 * b, 1.25);
    wd.rotation.set(0, -0.18, 1.0 + 0.05 * Math.sin(t * 4)); // triangle face to camera, tip out to her right and up
    wd.position.set(0, 0, 0);
    wd.updateMatrixWorld(true);
    const g = (wd.userData.grip as THREE.Vector3).clone().applyMatrix4(wd.matrixWorld); // read BEFORE moving it
    wd.position.copy(hand).sub(g);
    wd.updateMatrixWorld(true);
    poseReach(june, base, { r: hand });
    june.setExpr("eager");
    setFaceMap(june, w.laugh.june);
  },
  labCut: (w, t) => {
    // the cutaway: as the hourglass runs, the paste turns golden and the stack of coins grows ("valuable" 45.6)
    const age = ramp01(t, 44.0, 46.71, (x) => x) * 0.62;
    w.lab.setCutAge(age);
    w.lab.cut.rotation.y = -0.3 + 0.25 * ramp01(t, 43.27, 48.29);
    const n = Math.floor(2 + 13 * ramp01(t, 45.2, 46.71, easeOut));
    w.lab.coins.forEach((c, i) => (c.visible = i < n));
    hourglass(w, t);
  },
  labClose: (w, t) => {
    const age = 0.62 + 0.38 * ramp01(t, 46.71, 47.6, easeOut);
    w.lab.setCutAge(age);
    w.lab.cut.rotation.y = -0.3 + 0.25 * ramp01(t, 43.27, 48.29);
    const n = Math.floor(15 + 5 * ramp01(t, 46.71, 47.6, easeOut));
    w.lab.coins.forEach((c, i) => (c.visible = i < n));
    hourglass(w, t);
  },
  vaultStore: (w, t) => {
    // Ravi slides Otto's (still young) wheel into its slot ("keeps" 48.72 → in by "wheels" 49.4)
    const { ravi } = w.cast;
    const k = ramp01(t, 48.55, 49.45, easeInOut);
    const x = lerp(0.98, SLOT.x, k);
    flatWheel(w.heroWheel, x, SLOT.y - WHEEL_H / 2, SLOT.z, 0.4);
    w.heroWheel.setAge(0.3);
    const rx = lerp(0.22, 0.36, k),
      rz = SLOT.z - 0.42,
      rot = 0.75;
    place(ravi, rx, rz, rot);
    // the rim point nearest Ravi, in his frame (fwd, left)
    const dx = x - rx,
      dz = SLOT.z - rz;
    const dist = Math.hypot(dx, dz);
    const ex = dx * (1 - (WHEEL_R - 0.02) / dist),
      ez = dz * (1 - (WHEEL_R - 0.02) / dist);
    const fwd = ex * Math.sin(rot) + ez * Math.cos(rot);
    const left = ex * Math.cos(rot) - ez * Math.sin(rot);
    const p: Pose = { ...STAND, lean: 0.12, headTilt: 0.05, headTurn: -0.35 };
    const a = ik(p, fwd, SLOT.y + 0.06);
    const back = ramp01(t, 49.6, 50.0);
    p.lShX = lerp(a.sh, 0.05, back);
    p.lEl = lerp(a.el, -0.15, back);
    p.lShZ = lerp(Math.atan2(left - 0.235, 0.4), 0.12, back);
    p.rShX = lerp(a.sh + 0.15, 0.05, back);
    p.rEl = lerp(a.el, -0.15, back);
    p.rShZ = lerp(0.35, -0.12, back);
    ravi.setPose(p);
    ravi.setExpr(blinkExpr(t, "smile", 5));
  },
  vaultAge: (w, t) => {
    // time-lapse: calendar pages flip on the rack post while Otto's wheel ages from pale to amber
    flatWheel(w.heroWheel, SLOT.x, SLOT.y - WHEEL_H / 2, SLOT.z, 0.4);
    const k = ramp01(t, 50.3, 52.45, (x) => x);
    w.heroWheel.setAge(0.3 + 0.7 * easeInOut(k));
    flipCalendar(w.vault.calendar, w.vault.calPrev, w.vault.calPage, k, (a) => (w.vault.calPage.rotation.z = -a));
  },
  cantPay: (w, t) => {
    // "and if you can't pay the loan back": Otto shrugs, empty-handed, at Ravi's desk
    const { otto, ravi } = w.cast;
    place(otto, 1.75, -1.55, Math.PI - 0.12);
    const s = ramp01(t, 52.8, 53.3, easeOut);
    otto.setPose({ ...STAND, lShX: -0.6 * s, rShX: -0.6 * s, lShZ: 0.12 + 0.75 * s, rShZ: -0.12 - 0.75 * s, lEl: -1.1 * s, rEl: -1.1 * s, headTilt: 0.12 - 0.05 * s, headTurn: 0.12 * Math.sin(t * 2) * s, bob: 0.015 * s });
    otto.setExpr(t > 53.0 ? "wince" : "neutral");
    place(ravi, 2.15, -3.3, -0.2);
    ravi.setPose(idle(t, 8));
    w.hall.bag.visible = true;
    w.hall.bag.position.set(1.55, 0.78, -2.6);
  },
  sold: (w, t) => {
    // the aged wheel on the desk gets a SOLD tag ("sells" 55.06); the money comes back ("money back" 56.7)
    const { ravi } = w.cast;
    flatWheel(w.heroWheel, 1.5, 0.78, -2.55, 0.5);
    w.heroWheel.setAge(1);
    const tagK = ramp01(t, 54.92, 55.2, easeOut);
    const tg = w.hall.tag;
    tg.visible = t > 54.9;
    tg.position.set(1.62, 0.78 + WHEEL_H + 0.22 + 0.25 * (1 - tagK), -2.45);
    tg.rotation.set(0, 0.15, 0.12 * Math.sin((t - 55.2) * 7) * Math.exp(-Math.max(0, t - 55.2) * 3));
    tg.scale.setScalar(Math.max(0.001, backOut(tagK)));
    const bagK = ramp01(t, 56.25, 56.8, easeOut);
    const bg = w.hall.bag;
    bg.visible = t > 56.0;
    bg.position.set(lerp(3.3, 2.12, bagK), 0.78, lerp(-2.5, -2.85, bagK));
    bg.rotation.set(0, lerp(0, -0.6, bagK), lerp(-0.4, 0, bagK));
    place(ravi, 2.1, -3.3, -0.25);
    const catchK = ramp01(t, 56.55, 56.9);
    const p: Pose = { ...STAND, lean: 0.2 * catchK, headTilt: 0.15 };
    if (catchK > 0) {
      // his left hand lands on the back of the sack's neck as it arrives
      const onBag = v3(bg.position.x, 1.06, bg.position.z - 0.15);
      const rest = v3(2.5, 0.85, -3.05);
      poseReach(ravi, p, { l: rest.clone().lerp(onBag, catchK) });
    } else ravi.setPose(p);
    ravi.setExpr(t > 56.7 ? "smile" : blinkExpr(t, "neutral", 9));
  },
  finallyWide: (w, t) => {
    // Otto and Ravi in the aisle, looking up at the towering shelves
    const { otto, ravi } = w.cast;
    flatWheel(w.heroWheel, SLOT.x, SLOT.y - WHEEL_H / 2, SLOT.z, 0.4);
    w.heroWheel.setAge(1);
    place(otto, -0.45, -8.7, 0.15);
    place(ravi, 0.45, -9.0, -0.25);
    const look = ramp01(t, 57.7, 58.6);
    otto.setPose({ ...STAND, headTilt: -0.4 * look, headTurn: 0.2 * look });
    ravi.setPose({ ...STAND, headTilt: -0.18 * look, headTurn: -0.1 * look, lShX: -0.2, rShX: -0.2 });
    otto.setExpr("smile");
    ravi.setExpr(blinkExpr(t, "smile", 2));
    // they face the camera (the bright doorway behind them), looking up at the racks
    otto.root.rotation.y = Math.PI + 0.15;
    ravi.root.rotation.y = Math.PI - 0.25;
  },
  finalPat: (w, t) => {
    // Otto pats the side of his golden wheel (palm on the rind, from outside); held still at the end
    const { otto, ravi } = w.cast;
    flatWheel(w.heroWheel, SLOT.x, SLOT.y - WHEEL_H / 2, SLOT.z, 0.4);
    w.heroWheel.setAge(1);
    place(otto, 0.36, -8.28, 0.25);
    const pat = t < 62.3 ? Math.max(0, Math.sin((t - 59.9) * 7)) * ramp01(t, 59.8, 60.2) * (1 - ramp01(t, 61.6, 62.2)) : 0;
    const c = v3(SLOT.x, SLOT.y, SLOT.z);
    const d = v3(otto.root.position.x - c.x, 0, otto.root.position.z - c.z).normalize();
    const palm = c.clone().add(d.multiplyScalar(WHEEL_R + 0.058 + 0.06 * pat));
    poseReach(otto, { ...STAND, headTilt: 0.05, headTurn: -0.25 }, { l: palm });
    otto.setExpr("smile");
    place(ravi, 200, 200, 0); // Ravi is not in this frame
  },
};

/** A year of pages: the board shows the next month while the page on top (this month) flips up and away. */
type Cal = { draw: (m: number) => void };
const flipCalendar = (board: Cal, prev: Cal, page: THREE.Group, k: number, setAngle: (a: number) => void) => {
  if (k <= 0 || k >= 1) {
    board.draw(9 + (k >= 1 ? 12 : 0));
    page.visible = false;
    return;
  }
  const months = k * 12;
  const i = Math.min(11, Math.floor(months));
  const a = Math.PI * 0.95 * easeOut(clamp01((months - i) * 1.8));
  board.draw(9 + i + 1);
  prev.draw(9 + i);
  page.visible = a < 1.45;
  setAngle(a);
};

const hourglass = (w: World, t: number) => {
  const k = ramp01(t, 43.3, 48.29, (x) => x);
  w.lab.sandTop.scale.set(Math.max(0.05, 1 - 0.85 * k), Math.max(0.05, 1 - 0.85 * k), Math.max(0.05, 1 - 0.85 * k));
  w.lab.sandBot.scale.set(0.3 + 0.7 * k, 0.3 + 0.7 * k, 0.3 + 0.7 * k);
  w.lab.stream.visible = k < 0.98;
};

/** Pose the whole world for OUTPUT frame `out`; place the camera; return the look + focus point. */
export const applyShot = (w: World, cam: THREE.PerspectiveCamera, out: number): ShotState => {
  const t = remap(out) / FPS;
  const i = shotIndexAt(t);
  const shot = SHOTS[i];
  const t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : END;
  const end = shot.hold ?? t1;
  const k = easeInOut(clamp01((Math.min(t, end) - shot.t0) / (end - shot.t0)));
  cam.position.set(lerp(shot.a[0], shot.b[0], k), lerp(shot.a[1], shot.b[1], k), lerp(shot.a[2], shot.b[2], k));
  const lb = shot.lb ?? shot.la;
  const look = new THREE.Vector3(lerp(shot.la[0], lb[0], k), lerp(shot.la[1], lb[1], k), lerp(shot.la[2], lb[2], k));
  cam.lookAt(look);
  cam.fov = shot.fov;
  w.setSet(shot.set);
  reset(w, t);
  if (shot.set === "vault") {
    w.hall.door.rotation.y = -1.75;
    w.hall.glowLight.userData.base = 6;
  }
  lensReset(w.cast.ravi);
  STAGES[shot.id](w, t, t - shot.t0);
  if (FAR_LENS_SHOTS.has(shot.id)) lensFix(w.cast.ravi, cam);
  const focus = shot.focus ? new THREE.Vector3(...shot.focus) : look;
  return { look: LOOKS[shot.style], focus };
};

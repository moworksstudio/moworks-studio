// Staging helpers for shots (lifted from the worked examples, where they passed the render reviews): place a cast
// member, place a world-space prop, read world points on a prop or a body, and aim elbows so arms never cut across the
// chest. Held props live in WORLD space with userData.grip = the local point the hand-sphere centre goes to (a mug's
// handle loop, a pot's handle end); poseReach() then puts the hand exactly there, so a hand never sits inside a prop.
import * as THREE from "three";
import { poseReach, type Character, type Pose } from "./character";

export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Show a cast member at (x, y, z) facing rotY (0 = towards +z, the front of the set). */
export const show = (c: Character, x: number, z: number, rotY: number, y = 0) => {
  c.root.visible = true;
  c.root.position.set(x, y, z);
  c.root.rotation.y = rotY;
  c.root.updateMatrixWorld(true);
};

/** Put a prop at `pos`: first tilt about its own z, then its own x, then yaw about world y (Euler YXZ). */
export const place = (o: THREE.Object3D, pos: THREE.Vector3, yaw = 0, tiltX = 0, tiltZ = 0) => {
  o.visible = true;
  o.position.copy(pos);
  o.rotation.order = "YXZ";
  o.rotation.set(tiltX, yaw, tiltZ);
  o.updateMatrixWorld(true);
};

/** A local point of an object, in world space (refreshes its matrix first). */
export const at = (o: THREE.Object3D, local: THREE.Vector3) => {
  o.updateWorldMatrix(true, false);
  return local.clone().applyMatrix4(o.matrixWorld);
};

/** The world point a hand grips on a prop (its userData.grip). */
export const grip = (o: THREE.Object3D) => at(o, o.userData.grip as THREE.Vector3);

/** The yaw that turns a prop's local +x towards a horizontal world direction. */
export const yawTo = (d: THREE.Vector3) => Math.atan2(-d.z, d.x);

/** Points in a character's torso / head space, in world space (torso origin = the hips' top; head = its centre). */
export const inTorso = (c: Character, x: number, y: number, z: number) => c.parts.torso.localToWorld(V3(x, y, z));
export const inHead = (c: Character, x: number, y: number, z: number) => c.parts.head.localToWorld(V3(x, y, z));

/** Elbow pole for poseReach: out to that side and down, so an arm never cuts across the chest. */
export const elbowOut = (c: Character, side: "l" | "r", down = 0.8) => {
  const a = c.root.rotation.y;
  const s = side === "l" ? 1 : -1;
  return V3(s * Math.cos(a), -down, -s * Math.sin(a)).normalize();
};

/** Turn a sprite (a plane) to face the camera. */
export const billboard = (m: THREE.Object3D, cam: THREE.Camera) => m.quaternion.copy(cam.quaternion);

/** Example: a mug in the RIGHT hand, handle to the right; k: 0 at the chest → 1 at the mouth (tipped to sip).
 *  The mug needs userData.grip at its handle loop (e.g. V3(0.09, 0.015, 0)). */
export const holdMug = (c: Character, base: Pose, mug: THREE.Object3D, k: number) => {
  c.setPose(base);
  c.root.updateMatrixWorld(true);
  const pos = inTorso(c, -0.07, 0.38, 0.3).lerp(inHead(c, -0.02, -0.2, 0.36), k);
  place(mug, pos, c.root.rotation.y + Math.PI, 0.75 * k);
  return poseReach(c, base, { r: grip(mug) }, { r: elbowOut(c, "r") });
};

/** Walk a character along a route of waypoints (around the furniture), k: 0 → 1 along the whole route's length;
 *  returns the heading (rotY) to face along the path. Pair it with walkPose(phase) for the legs. */
export const along = (route: THREE.Vector3[], k: number) => {
  const seg = route.slice(1).map((p, i) => p.distanceTo(route[i]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = Math.min(Math.max(k, 0), 1) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(d / seg[i], 1) : 0;
      const p = route[i].clone().lerp(route[i + 1], t);
      const dir = route[i + 1].clone().sub(route[i]);
      return { pos: p, rotY: Math.atan2(dir.x, dir.z) };
    }
    d -= seg[i];
  }
  return { pos: route[route.length - 1].clone(), rotY: 0 };
};

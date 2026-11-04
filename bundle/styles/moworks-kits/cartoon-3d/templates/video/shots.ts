// __COMP__ — the shot list. The AUTHORED timeline is in frames at 30 fps; vo.ts ANCHORS remap it onto the voice, so
// animations keep their shape and only their pace follows the narration. One look (LOOKS) per shot.
import * as THREE from "three";
import { mixPose, STAND, walkPose } from "../../kit/character";
import { clamp01, easeInOut, lerp, ramp01 } from "../../kit/lib";
import { LOOKS, LookName, makeRemap } from "../../kit/looks";
import type { ShotState } from "../../kit/ToonVideo";
import type { World } from "./world";
import { ANCHORS, FPS } from "./vo";

type V = [number, number, number];
type Shot = { from: number; to: number; a: V; b: V; look: V; fov: number; style: LookName; holdFrom?: number };

// one shot per spoken beat; `look` is the aim point AND the focus point
export const SHOTS: Shot[] = [
  { from: 0, to: 59, a: [-1.6, 1.7, 3.2], b: [-1.2, 1.65, 3.0], look: [-0.2, 1.0, -2.0], fov: 52, style: "wideBright" },
  { from: 60, to: 104, a: [1.05, 1.58, 0.35], b: [1.0, 1.55, 0.15], look: [0.4, 1.5, -1.72], fov: 36, style: "characterClose" },
  { from: 105, to: 149, a: [1.15, 1.25, -1.75], b: [1.12, 1.22, -1.9], look: [1.0, 1.04, -2.65], fov: 40, style: "screenClose", holdFrom: 135 },
];

const shotAt = (f: number) => [...SHOTS].reverse().find((s) => f >= s.from) ?? SHOTS[0];
export const remap = makeRemap(ANCHORS, FPS);

/** Pose the whole world for OUTPUT frame `out`; place the camera; return the look + focus point. */
export const applyShot = (w: World, cam: THREE.PerspectiveCamera, out: number): ShotState => {
  const f = remap(out);
  const shot = shotAt(f);
  const end = shot.holdFrom ?? shot.to;
  const t = easeInOut(clamp01((Math.min(f, end) - shot.from) / (end - shot.from)));
  cam.position.set(lerp(shot.a[0], shot.b[0], t), lerp(shot.a[1], shot.b[1], t), lerp(shot.a[2], shot.b[2], t));
  const look = new THREE.Vector3(...shot.look);
  cam.lookAt(look);
  cam.fov = shot.fov;

  // Mika walks in from the left to beside the desk (frames 0–55), then turns to camera
  const { mika, ravi } = w.cast;
  const walk = ramp01(f, 0, 55, (x) => x);
  mika.root.position.set(lerp(-1.9, -0.55, easeInOut(walk)), 0, lerp(-1.0, -1.7, easeInOut(walk)));
  mika.root.rotation.y = lerp(Math.PI / 2, 0.3, ramp01(f, 45, 60));
  const moving = Math.sin(Math.PI * clamp01(f / 55));
  mika.setPose(mixPose(STAND, walkPose(f / 20), moving));
  mika.setExpr(f > 60 && f < 64 ? "blink" : "neutral");

  // Ravi stands at the desk, glances over at Mika in shot 2
  ravi.root.position.set(0.4, 0, -1.72);
  ravi.root.rotation.y = lerp(0, 0.45, ramp01(f, 66, 80)); // turns towards the camera
  ravi.setPose({ ...STAND, headTilt: 0.05 * Math.sin(f / 17) });
  ravi.setExpr(f > 80 ? "smile" : "neutral");

  w.setSky(LOOKS[shot.style].sky ?? "day");
  return { look: LOOKS[shot.style], focus: look };
};

// Collision QA for any Toon Story video: steps through every output frame, poses the world exactly as the render
// does, and tests every character's body points against solid furniture (box + cylinder meshes) and each other.
// Use it as a 1-frame debug composition; results print to the console via stills.mjs:
//   node tools/typography/stills.mjs <CompId>-Check /tmp/qa 0        → lines starting "COLLISION"
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { setFlatChars, setLook } from "./lib";

const DEPTH_MIN = 0.02; // grazes under 2 cm are ignored

export type CollisionScene = {
  scene: THREE.Scene;
  characters: Record<string, THREE.Object3D>; // character roots
  seats?: THREE.Object3D[]; // chairs/stools a seated character may sit inside
};

export const collisionReport = (w: CollisionScene, poseFrame: (out: number) => void, frames: number) => {
  const names = Object.keys(w.characters);
  const roots = names.map((n) => w.characters[n]);
  const charMeshes = new Set<any>();
  roots.forEach((r) => r.traverse((o: any) => o.isMesh && o.userData.char && charMeshes.add(o)));
  const seatOf = new Map<any, any>();
  (w.seats ?? []).forEach((c: any) => c.traverse((o: any) => o.isMesh && seatOf.set(o, c)));
  const solids: any[] = [];
  w.scene.traverse((o: any) => {
    if (!o.isMesh || charMeshes.has(o) || o.userData.noCollide) return;
    const t = o.geometry?.type;
    if (t !== "BoxGeometry" && t !== "CylinderGeometry") return;
    for (let p = o.parent; p; p = p.parent) if (roots.includes(p)) return; // held props
    solids.push(o);
  });
  const hits = new Map<string, { frames: number[]; depth: number }>();
  const add = (key: string, out: number, depth: number) => {
    const h = hits.get(key) ?? { frames: [], depth: 0 };
    h.frames.push(out);
    h.depth = Math.max(h.depth, depth);
    hits.set(key, h);
  };
  const v = new THREE.Vector3();
  const label = (o: any) => {
    const b = new THREE.Box3().setFromObject(o);
    const c = b.getCenter(new THREE.Vector3());
    const s = b.getSize(new THREE.Vector3());
    const kind = o.name || (seatOf.has(o) ? "seat" : s.y > 2.5 ? "wall" : "furniture");
    return `${kind} @(${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)}) size(${s.x.toFixed(2)},${s.y.toFixed(2)},${s.z.toFixed(2)})`;
  };
  for (let out = 0; out < frames; out++) {
    poseFrame(out);
    w.scene.updateMatrixWorld(true);
    const shown = (o: any) => {
      for (let q = o; q; q = q.parent) if (!q.visible) return false;
      return true;
    };
    // hidden set pieces (a prop table that only exists in one shot) don't collide
    const solidBoxes = solids.filter(shown).map((o) => ({ o, b: new THREE.Box3().setFromObject(o).expandByScalar(-0.005) }));
    const pts: Record<string, THREE.Vector3[]> = {};
    names.forEach((n, i) => {
      const root = roots[i];
      const hips = root.children[0] as any;
      const seated = hips && hips.position.y < 0.62;
      const p: THREE.Vector3[] = [];
      const cb = new THREE.Box3();
      root.traverse((o: any) => {
        if (!o.isMesh || !o.userData.char) return;
        const pos = o.geometry.attributes.position;
        for (let k = 0; k < pos.count; k += 3) {
          v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
          p.push(v.clone());
          cb.expandByPoint(v);
        }
      });
      pts[n] = p;
      for (const { o, b } of solidBoxes) {
        if (!cb.intersectsBox(b)) continue;
        if (seated && seatOf.has(o) && seatOf.get(o).position.distanceTo(root.position) < 0.6) continue;
        let depth = 0;
        for (const q of p) {
          if (!b.containsPoint(q)) continue;
          depth = Math.max(depth, Math.min(q.x - b.min.x, b.max.x - q.x, q.y - b.min.y, b.max.y - q.y, q.z - b.min.z, b.max.z - q.z));
        }
        if (depth >= DEPTH_MIN) add(`${n} ↔ ${label(o)}`, out, depth);
      }
      const minY = Math.min(...p.map((q) => q.y));
      if (minY < -0.03) add(`${n} ↔ floor (feet below floor)`, out, -minY);
    });
    for (let a = 0; a < names.length; a++)
      for (let b = a + 1; b < names.length; b++) {
        const bb = new THREE.Box3().setFromPoints(pts[names[b]]).expandByScalar(-0.03);
        const inside = pts[names[a]].filter((q) => bb.containsPoint(q)).length;
        if (inside > 40) add(`${names[a]} ↔ ${names[b]} (characters overlap)`, out, inside);
      }
  }
  const ranges = (fs: number[]) => {
    const r: string[] = [];
    let s = fs[0],
      prev = fs[0];
    for (const f of fs.slice(1).concat([Infinity])) {
      if (f !== prev + 1) {
        r.push(s === prev ? `${s}` : `${s}-${prev}`);
        s = f;
      }
      prev = f;
    }
    return r.join(",");
  };
  const lines = [...hits.entries()].map(([k, h]) => `COLLISION ${k} | frames ${ranges(h.frames)} | max ${h.depth.toFixed(3)}`);
  return lines.length ? lines : ["COLLISION none"];
};

/** 1-frame debug composition body: builds the world, runs the report, prints and shows it. */
export function CollisionCheck<W>({ build, scene, poseFrame, frames }: { build: () => W; scene: (w: W) => CollisionScene; poseFrame: (w: W, out: number) => void; frames: number }) {
  const [handle] = useState(() => delayRender("collision check"));
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    try {
      setLook("v2");
      setFlatChars(true);
      const w = build();
      const out = collisionReport(scene(w), (f) => poseFrame(w, f), frames);
      out.forEach((l) => console.log(l));
      setLines(out);
      continueRender(handle);
    } catch (e) {
      cancelRender(e as Error);
    }
  }, [handle, build, scene, poseFrame, frames]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", padding: 40, fontSize: 22, fontFamily: "monospace" }}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </AbsoluteFill>
  );
}

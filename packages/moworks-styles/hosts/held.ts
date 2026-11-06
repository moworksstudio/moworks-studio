// The held-prop check of a 3D Cartoon film (owner #1267, audit/111 P2 of audit/108): the app's own, beside the source skill's collision QA, which
// skips held props (its collision.tsx: a userData.noCollide mesh, or one under a character, is no furniture; the style's pack §4 says so). The source
// skill's own rule (STAGING.md §4): a held prop lives in world space with userData.grip, the local point the hand-sphere centre goes to, and
// poseReach puts the hand exactly there; a prop never goes inside a hand, a table or a body. On every frame, as the source skill's report poses it:
//   off its grip   a hand near a prop's grip (within HOLD_NEAR: it is holding it) whose sphere centre is more than GRIP_TOL from the grip point
//   in furniture   a held prop's points inside a solid (the same solids the source skill's report tests: named boxes and cylinders)
//   through a body a character's points inside a held prop (the holding arm itself left out)
// Lines as the source skill prints its own: "HELD <who> ↔ <what> | frames 12-40,90 | max 0.034", or "HELD none". A warning, never a block (#1109).
// Credit: Moworks Studio (the app's own code), on the owner's 3D Cartoon source skill's rules.
import * as THREE from "three";

/** A hand this close to a grip is holding that prop (metres). */
export const HOLD_NEAR = 0.12;
/** The hand-sphere centre may be this far off the grip point (metres): about 2 cm. */
export const GRIP_TOL = 0.02;
/** A held prop in a solid, or a body in a held prop, deeper than this is said (the source skill's own DEPTH_MIN). */
export const DEPTH_MIN = 0.02;

type Hand = { who: string; side: "left" | "right"; hand: THREE.Object3D; arm: THREE.Object3D | null; root: THREE.Object3D };
type Cast = Record<string, { root: THREE.Object3D; parts?: { lHand?: THREE.Object3D; rHand?: THREE.Object3D; torso?: THREE.Object3D } }>;

const shown = (o: THREE.Object3D | null) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
const isGrip = (g: unknown): g is THREE.Vector3 => !!g && typeof (g as any).x === "number" && typeof (g as any).y === "number" && typeof (g as any).z === "number";
const meshes = (o: THREE.Object3D) => { const out: THREE.Mesh[] = []; o.traverse((m: any) => m.isMesh && out.push(m)); return out; };
const fmt = (v: THREE.Vector3) => `(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`;

/** The tracker for one built world: frame(out) after each pose, lines() at the end. `scene` and `characters` as the source skill's
 *  CollisionScene; `cast` the world's own (w.cast: each character's parts.lHand / rHand, the hand-sphere centres). */
export function heldTracker(scene: THREE.Scene, characters: Record<string, THREE.Object3D>, cast: Cast | undefined) {
  const roots = Object.values(characters);
  const underChar = (o: THREE.Object3D) => { for (let p = o.parent; p; p = p.parent) if (roots.includes(p)) return true; return false; };
  // the props with a grip and the solids, found again on each frame (a film may add a prop while it poses a shot): the solids are the source
  // skill's own choice (box and cylinder meshes, not a character's, not noCollide, not held), and never a held prop's own parts
  let props: THREE.Object3D[] = [], solids: THREE.Mesh[] = [];
  const scan = () => {
    props = []; solids = [];
    scene.traverse((o) => { if (isGrip(o.userData?.grip)) props.push(o); });
    const inProp = new Set<THREE.Object3D>();
    props.forEach((p) => p.traverse((o) => inProp.add(o)));
    scene.traverse((o: any) => {
      if (!o.isMesh || o.userData.char || o.userData.noCollide || inProp.has(o) || underChar(o)) return;
      const t = o.geometry?.type;
      if (t === "BoxGeometry" || t === "CylinderGeometry") solids.push(o);
    });
  };
  const hands: Hand[] = [];
  for (const [who, c] of Object.entries(cast ?? {})) {
    const torso = c.parts?.torso ?? null;
    const armOf = (h: THREE.Object3D) => { let a: THREE.Object3D | null = h; while (a && a.parent && a.parent !== torso) a = a.parent; return a && a.parent === torso ? a : h.parent; };
    if (c.parts?.lHand) hands.push({ who, side: "left", hand: c.parts.lHand, arm: armOf(c.parts.lHand), root: c.root });
    if (c.parts?.rHand) hands.push({ who, side: "right", hand: c.parts.rHand, arm: armOf(c.parts.rHand), root: c.root });
  }
  const label = (o: THREE.Object3D) => {
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    return `${o.name || (s.y > 2.5 ? "wall" : "furniture")} @${fmt(c)} size${fmt(s)}`;
  };
  const names = new Map<THREE.Object3D, string>();          // a prop's name, from where it first is
  const propName = (p: THREE.Object3D) => { if (!names.has(p)) names.set(p, p.name || `held prop @${fmt(new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3()))}`); return names.get(p)!; };
  const hits = new Map<string, { frames: number[]; depth: number }>();
  const add = (key: string, out: number, depth: number) => { const h = hits.get(key) ?? { frames: [], depth: 0 }; if (h.frames[h.frames.length - 1] !== out) h.frames.push(out); h.depth = Math.max(h.depth, depth); hits.set(key, h); };
  const v = new THREE.Vector3(), w = new THREE.Vector3(), g = new THREE.Vector3();
  const pointsOf = (list: THREE.Mesh[], step = 3) => {
    const pts: THREE.Vector3[] = [];
    for (const m of list) { const pos = (m.geometry as any)?.attributes?.position; if (!pos) continue; for (let k = 0; k < pos.count; k += step) pts.push(v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld).clone()); }
    return pts;
  };
  const inBox = (q: THREE.Vector3, b: THREE.Box3) => (b.containsPoint(q) ? Math.min(q.x - b.min.x, b.max.x - q.x, q.y - b.min.y, b.max.y - q.y, q.z - b.min.z, b.max.z - q.z) : 0);

  const frame = (out: number) => {
    scene.updateMatrixWorld(true);
    scan();
    const solidBoxes = solids.filter(shown).map((o) => ({ o, b: new THREE.Box3().setFromObject(o).expandByScalar(-0.005) }));
    for (const p of props) {
      if (!shown(p)) continue;
      g.copy(p.userData.grip as THREE.Vector3);
      p.localToWorld(g);
      let best: Hand | null = null, d = Infinity;
      for (const h of hands) { if (!shown(h.root)) continue; const x = h.hand.getWorldPosition(w).distanceTo(g); if (x < d) { d = x; best = h; } }
      if (!best || d > HOLD_NEAR) continue;          // no hand on it: a prop set down, not held
      const name = propName(p);
      if (d > GRIP_TOL) add(`${best.who}'s ${best.side} hand ↔ ${name} (off its grip)`, out, d);
      // the held prop in a solid: each of its parts' boxes against each solid's box (a prop is a few boxes and cylinders, so its corners alone
      // miss a table top it is pushed through); the depth is the overlap's thinnest side
      const own = meshes(p), parts = own.map((m) => new THREE.Box3().setFromObject(m));
      const pb = new THREE.Box3();
      parts.forEach((x) => pb.union(x));
      for (const { o, b } of solidBoxes) {
        if (!pb.intersectsBox(b)) continue;
        let depth = 0;
        for (const x of parts) {
          const i = x.clone().intersect(b);
          if (i.isEmpty()) continue;
          const s = i.getSize(new THREE.Vector3());
          depth = Math.max(depth, Math.min(s.x, s.y, s.z));
        }
        if (depth >= DEPTH_MIN) add(`${name} ↔ ${label(o)} (held prop in furniture)`, out, depth);
      }
      // a body in the held prop: each character's points (the holding arm left out) inside one of the prop's own meshes, in that mesh's space
      for (const [who, root] of Object.entries(characters)) {
        if (!shown(root)) continue;
        const skip = best.root === root ? best.arm : null;
        const body = meshes(root).filter((m) => m.userData.char && !(skip && (() => { for (let q: THREE.Object3D | null = m; q; q = q.parent) if (q === skip) return true; return false; })()));
        const cb = new THREE.Box3();
        for (const m of body) cb.expandByObject(m);
        if (!cb.intersectsBox(pb)) continue;
        const bpts = pointsOf(body);
        let depth = 0;
        for (const m of own) {
          const geo: any = m.geometry;
          if (!geo) continue;
          if (!geo.boundingBox) geo.computeBoundingBox();
          const lb = geo.boundingBox.clone().expandByScalar(-0.005), inv = m.matrixWorld.clone().invert(), scale = m.matrixWorld.getMaxScaleOnAxis() || 1;
          for (const q of bpts) depth = Math.max(depth, inBox(w.copy(q).applyMatrix4(inv), lb) * scale);
        }
        if (depth >= DEPTH_MIN) add(`${name} ↔ ${who} (held prop through a body)`, out, depth);
      }
    }
  };
  const ranges = (fs: number[]) => {
    const r: string[] = [];
    let s = fs[0], prev = fs[0];
    for (const f of fs.slice(1).concat([Infinity])) { if (f !== prev + 1) { r.push(s === prev ? `${s}` : `${s}-${prev}`); s = f; } prev = f; }
    return r.join(",");
  };
  const lines = () => (hits.size ? [...hits.entries()].map(([k, h]) => `HELD ${k} | frames ${ranges(h.frames)} | max ${h.depth.toFixed(3)}`) : ["HELD none"]);
  return { frame, lines, hands: hands.length };
}

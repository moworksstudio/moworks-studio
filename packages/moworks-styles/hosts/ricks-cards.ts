// Collision for Ricks Clip's cards (owner #1267, audit/111 A8): a card has no volume, so each actor of the film's actorsAt(f) gets a stand-in
// cylinder, about its card's drawn body width and 2.25 m (the engine's card height) × its scale tall, checked on every frame against the world's
// solids (the box and cylinder meshes the film's main.js builds, posed by its worldState) and against the other actors' cylinders, as the 3D Cartoon
// source skill's collision QA checks its bodies. The app's own code; the source skill's engine runs as shipped (?skill-check=1 only skips its GPU
// drawing, hosts/ricks.ts). Lines in the 3D Cartoon's own shape: "COLLISION <who> ↔ <what> | frames 12-40,90 | max 0.123", or "COLLISION none".
// A warning, never a block (#1109).
import * as THREE from "mw-three";

/** The engine's card: 1200 × 2000 px, 2.25 m tall, 0.6 of that wide (main.js `CW`, `CH`, `CM`). */
export const CARD = { w: 1200, h: 2000, m: 2.25 };
/** The stand-in's diameter as a share of the card's drawn width: the body, not the arms held out (a person is narrower than their reach). */
export const BODY_SHARE = 0.6;
/** The feet may sink this much into the ground they stand on (a sole drawn below the card's base) before it counts. */
export const FEET = 0.1;
/** Overlaps under this depth are left out (metres): a card is flat, its stand-in only a guess at its body. */
export const DEPTH_MIN = 0.05;

type Actor = { key?: string; name?: string; x: number; y: number; z: number; s?: number; alpha?: number; collide?: boolean };

const shown = (o: THREE.Object3D | null) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
const isCard = (o: any) => { const im = o?.material?.map?.image; return !!im && im.width === CARD.w && im.height === CARD.h; };
const fmt = (v: THREE.Vector3) => `(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`;
/** Who an actor is: its name, else the first word of its card key ("legion{…}", "mira|{…}"). */
export const actorName = (a: Actor, i: number) => a.name || String(a.key ?? "").split(/[|{]/)[0].trim() || `actor ${i + 1}`;

/** A card at least this tall where it is drawn is a person (metres); a smaller drawing (a helmet, a sign, a prop on its own card) is checked against
 *  the world only, never as a second character. */
export const PERSON_M = 1.0;

/** The drawn part of a card's canvas, as shares of its width and height (from the top): { x0, x1, y0, y1 }, or null when nothing is drawn. Sampled small. */
const sample = document.createElement("canvas");
sample.width = 120; sample.height = 200;
export function drawnSpan(canvas: CanvasImageSource): { x0: number; x1: number; y0: number; y1: number } | null {
  const g = sample.getContext("2d", { willReadFrequently: true })!;
  g.clearRect(0, 0, sample.width, sample.height);
  g.drawImage(canvas, 0, 0, sample.width, sample.height);
  const d = g.getImageData(0, 0, sample.width, sample.height).data;
  let x0 = sample.width, x1 = -1, y0 = sample.height, y1 = -1;
  for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) if (d[(y * sample.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0: x0 / sample.width, x1: (x1 + 1) / sample.width, y0: y0 / sample.height, y1: (y1 + 1) / sample.height };
}

/** The check over every frame: renderFrame(f) poses the world and the cards (the GPU drawing skipped), actors() gives what actorsAt returned for
 *  it, scene() the engine's scene. Returns the lines. */
export function cardCollisions({ frames, renderFrame, actors, scene }: { frames: number; renderFrame: (f: number) => unknown; actors: () => Actor[]; scene: () => THREE.Scene | null }) {
  const hits = new Map<string, { frames: number[]; depth: number }>();
  const add = (key: string, out: number, depth: number) => { const h = hits.get(key) ?? { frames: [], depth: 0 }; if (h.frames[h.frames.length - 1] !== out) h.frames.push(out); h.depth = Math.max(h.depth, depth); hits.set(key, h); };
  const spans = new Map<string, ReturnType<typeof drawnSpan>>();          // the drawn part by card key (a key draws the same picture every time)
  const label = (o: THREE.Object3D, b: THREE.Box3) => { const s = b.getSize(new THREE.Vector3()); return `${o.name || (s.y > 2.5 ? "wall" : "set piece")} @${fmt(b.getCenter(new THREE.Vector3()))} size${fmt(s)}`; };
  for (let f = 0; f < frames; f++) {
    renderFrame(f);
    const sc = scene(), list = actors() ?? [];
    if (!sc) throw new Error("the engine's scene was not found");
    sc.updateMatrixWorld(true);
    const cards: THREE.Mesh[] = [], solids: THREE.Mesh[] = [];
    sc.traverse((o: any) => {
      if (!o.isMesh) return;
      if (isCard(o)) { if (o.parent === sc) cards.push(o); return; }
      if (o.userData?.sky || o.userData?.ndSkip || o.userData?.noCollide) return;
      const t = o.geometry?.type;
      if ((t === "BoxGeometry" || t === "CylinderGeometry") && shown(o)) solids.push(o);
    });
    // each actor's stand-in (drawActors puts actor i on card i)
    const stand = list.map((a, i) => {
      if (a.collide === false || (a.alpha ?? 1) < 0.5) return null;
      const card = cards[i], s = a.s || 1, k = String(a.key);
      if (!spans.has(k) && card) spans.set(k, drawnSpan((card.material as any).map.image));
      const sp = spans.get(k);
      if (!sp) return null;
      // the card's plane: CARD.m tall, its foot 2.5 % below the actor's y (main.js cardGeo), the canvas's top row at its top
      const top = a.y + s * CARD.m * (0.975 - sp.y0), bottom = a.y + s * CARD.m * (0.975 - sp.y1), width = (sp.x1 - sp.x0) * CARD.m * 0.6 * s;
      return { who: actorName(a, i), x: a.x, z: a.z, y0: bottom + FEET, y1: top, r: (width * BODY_SHARE) / 2, person: top - bottom >= PERSON_M };
    });
    const boxes = solids.map((o) => ({ o, b: new THREE.Box3().setFromObject(o) }));
    for (const p of stand) {
      if (!p) continue;
      for (const { o, b } of boxes) {
        const up = Math.min(p.y1, b.max.y) - Math.max(p.y0, b.min.y);
        if (up <= 0) continue;
        // the circle against the box's floor plan: how far the stand-in goes in
        const cx = Math.max(b.min.x, Math.min(p.x, b.max.x)), cz = Math.max(b.min.z, Math.min(p.z, b.max.z));
        const inside = p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z;
        const deep = inside ? p.r + Math.min(p.x - b.min.x, b.max.x - p.x, p.z - b.min.z, b.max.z - p.z) : p.r - Math.hypot(p.x - cx, p.z - cz);
        const depth = Math.min(up, deep);
        if (depth >= DEPTH_MIN) add(`${p.who} ↔ ${label(o, b)}`, f, depth);
      }
    }
    for (let i = 0; i < stand.length; i++) for (let j = i + 1; j < stand.length; j++) {
      const a = stand[i], b = stand[j];
      if (!a || !b || !a.person || !b.person) continue;
      const up = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0), deep = a.r + b.r - Math.hypot(a.x - b.x, a.z - b.z);
      const depth = Math.min(up, deep);
      if (depth >= DEPTH_MIN) add(`${a.who} ↔ ${b.who} (characters overlap)`, f, depth);
    }
  }
  const ranges = (fs: number[]) => {
    const r: string[] = [];
    let s = fs[0], prev = fs[0];
    for (const f of fs.slice(1).concat([Infinity])) { if (f !== prev + 1) { r.push(s === prev ? `${s}` : `${s}-${prev}`); s = f; } prev = f; }
    return r.join(",");
  };
  return hits.size ? [...hits.entries()].map(([k, h]) => `COLLISION ${k} | frames ${ranges(h.frames)} | max ${h.depth.toFixed(3)}`) : ["COLLISION none"];
}

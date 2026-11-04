// CheeseBankVault — the world: four sets far apart, one key-light rig that follows the active set (shadows stay sharp).
//   HALL  (origin)          marble bank hall: checker floor, columns, teller counter, Ravi's desk, BANCA sign, round vault door
//   VAULT (behind the hall) tall wooden racks of aged wheels (instanced), aisles, pendant lamps, warm fog
//   DAIRY (x = +30)         Otto's cheese room: copper vat, aging shelf, calendar, table with bills, countryside window
//   LAB   (x = −30)         cutaway stage: a wheel with a wedge cut out (paste ages), coin stack, hourglass
// Metres, y up, +z towards the front of each set. Furniture = box()/cyl() so the collision QA sees it; handled props
// (rolling wheels, coins, bags) are userData.noCollide.
import * as THREE from "three";
import { box, cyl, fill, flat, INK, plane, rng, shadowed, sphere, toon } from "../../kit/lib";
import { buildCharacter, CAST, CharDef, Character } from "../../kit/character";
import { makeCanvas, toTex, woodTex } from "../../kit/textures";
import type { KitLights } from "../../kit/looks";
import {
  bagTex,
  bankSignTex,
  billTex,
  brickTex,
  hillsTex,
  laughFaceTex,
  makeCalendarTex,
  makePasteTex,
  marbleFloorTex,
  piazzaTex,
  plasterTex,
  rindSideTex,
  rindTopTex,
  soldTagTex,
  stoneFloorTex,
  tickClockTex,
} from "./tex";

export const DAIRY_X = 30;
export const LAB_X = -30;
export const WHEEL_R = 0.36;
export const WHEEL_H = 0.27;
export const YOUNG = "#fffaf0";
export const AGED = "#d4a245";

// ---------------- cast ----------------
// New extras in the same design language (round head, drawn face, flat fill, stick limbs): two vault inspectors.
const BEA: CharDef = { name: "Bea", top: "#f4f2ec", skin: "#e9c3a0", hair: "#8e93a3", style: "bun" };
const LEO: CharDef = { name: "Leo", top: "#eef1f4", skin: "#d6a27c", hair: "#b8572b", style: "tuft" };

/** Flat-drawn torso texture in the kit's layout (front centre x = 512, chin hides y < 100). */
const torsoCanvas = (draw: (g: CanvasRenderingContext2D) => void) => {
  const { c, g } = makeCanvas(1024, 512);
  g.lineCap = "round";
  g.lineJoin = "round";
  draw(g);
  const t = toTex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.offset.x = 0.25;
  return t;
};
const suitTex = () =>
  torsoCanvas((g) => {
    const cx = 512;
    g.fillStyle = "#2c3a68";
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "#ffffff"; // shirt
    g.beginPath();
    g.moveTo(cx - 92, 96);
    g.lineTo(cx, 272);
    g.lineTo(cx + 92, 96);
    g.fill();
    g.fillStyle = "#d63a2f"; // tie
    g.beginPath();
    g.moveTo(cx - 20, 128);
    g.lineTo(cx + 20, 128);
    g.lineTo(cx + 14, 150);
    g.lineTo(cx + 28, 252);
    g.lineTo(cx, 280);
    g.lineTo(cx - 28, 252);
    g.lineTo(cx - 14, 150);
    g.closePath();
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 9;
    g.stroke();
    g.lineWidth = 12; // lapels
    g.beginPath();
    g.moveTo(cx - 130, 96);
    g.lineTo(cx - 6, 300);
    g.moveTo(cx + 130, 96);
    g.lineTo(cx + 6, 300);
    g.stroke();
    g.fillStyle = INK;
    for (const y of [338, 392]) {
      g.beginPath();
      g.arc(cx, y, 10, 0, Math.PI * 2);
      g.fill();
    }
  });
const apronTex = () =>
  torsoCanvas((g) => {
    const cx = 512;
    g.fillStyle = "#9b8cf2";
    g.fillRect(0, 0, 1024, 512);
    g.strokeStyle = INK;
    g.lineWidth = 12;
    g.beginPath(); // crew neck
    g.ellipse(cx, 112, 110, 46, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    g.fillStyle = "#fbf6ea"; // apron bib + skirt
    g.beginPath();
    g.moveTo(cx - 105, 190);
    g.lineTo(cx + 105, 190);
    g.lineTo(cx + 150, 280);
    g.lineTo(cx + 170, 512);
    g.lineTo(cx - 170, 512);
    g.lineTo(cx - 150, 280);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath(); // neck straps
    g.moveTo(cx - 95, 192);
    g.lineTo(cx - 60, 120);
    g.moveTo(cx + 95, 192);
    g.lineTo(cx + 60, 120);
    g.stroke();
    g.lineWidth = 9; // pocket
    g.strokeRect(cx - 60, 300, 120, 70);
  });
const coatTex = (pen: string) =>
  torsoCanvas((g) => {
    const cx = 512;
    g.fillStyle = "#f4f2ec";
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "#8fb8e6"; // shirt in the V
    g.beginPath();
    g.moveTo(cx - 80, 100);
    g.lineTo(cx, 230);
    g.lineTo(cx + 80, 100);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(cx - 120, 100);
    g.lineTo(cx, 250);
    g.lineTo(cx + 120, 100);
    g.moveTo(cx, 250);
    g.lineTo(cx, 512);
    g.stroke();
    g.lineWidth = 8;
    g.strokeRect(cx + 70, 240, 90, 70); // breast pocket
    g.fillStyle = pen;
    g.fillRect(cx + 92, 214, 14, 50);
    g.fillStyle = INK;
    for (const y of [300, 360, 420]) {
      g.beginPath();
      g.arc(cx - 22, y, 9, 0, Math.PI * 2);
      g.fill();
    }
  });
/** Swap a flat character's torso texture (costume) without touching the kit. */
const dress = (ch: Character, tex: THREE.Texture) => {
  const hips = ch.root.children[0] as THREE.Group;
  const torso = hips.children[0] as THREE.Group;
  const body = torso.children[0] as THREE.Mesh;
  body.material = new THREE.MeshBasicMaterial({ map: tex });
};

// ---------------- cheese wheels ----------------
let SIDE: THREE.Texture | null = null;
const SIDES = new Map<string, THREE.Texture>();
const namedSide = (label: string) => {
  if (!SIDES.has(label)) SIDES.set(label, rindSideTex(label));
  return SIDES.get(label)!;
};
const TOPS = new Map<string, THREE.Texture>();
const topTex = (label: string) => {
  if (!TOPS.has(label)) TOPS.set(label, rindTopTex(label));
  return TOPS.get(label)!;
};
const sideTex = () => (SIDE ??= rindSideTex());

export type Wheel = {
  g: THREE.Group; // position + yaw
  tilt: THREE.Group; // rotation.z: π/2 upright on its edge (rolling), 0 lying flat
  spin: THREE.Group; // rotation.y = roll angle about the wheel's own axis
  setAge: (a: number) => void; // 0 young (pale) → 1 aged (amber)
};
/** A hero wheel (own materials so it can age). Group origin = the wheel's centre. */
export const makeWheel = (label: string, scale = 1): Wheel => {
  const side = toon("#ffffff", { map: namedSide(label) });
  const top = toon("#ffffff", { map: topTex(label) });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_H, 48), [side, top, top]);
  m.castShadow = m.receiveShadow = true;
  m.userData.noCollide = true;
  const spin = new THREE.Group();
  spin.add(m);
  const tilt = new THREE.Group();
  tilt.add(spin);
  const g = new THREE.Group();
  g.add(tilt);
  g.scale.setScalar(scale);
  const young = new THREE.Color(YOUNG),
    old = new THREE.Color(AGED);
  const setAge = (a: number) => {
    const c = young.clone().lerp(old, Math.min(1, Math.max(0, a)));
    side.color.copy(c);
    top.color.copy(c);
  };
  setAge(1);
  return { g, tilt, spin, setAge };
};

// ---------------- helpers ----------------
const noShadowShell = <T extends THREE.Object3D>(o: T) => {
  o.traverse((c: any) => {
    if (c.isMesh) {
      c.castShadow = false;
      c.receiveShadow = true;
    }
  });
  return o;
};
const glow = (color: string, k: number) => {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  m.color.multiplyScalar(k);
  return m;
};
const plant = (x: number, y: number, z: number, s = 1) => {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.12, 0.34, "#c8693f", 24, 0, 0, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = sphere(0.12, i % 2 ? "#3fae6a" : "#2f9a5c", Math.sin(a) * 0.12, 0.5 + (i % 3) * 0.1, Math.cos(a) * 0.12, 16);
    leaf.scale.set(0.8, 1.4, 0.8);
    g.add(leaf);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  return shadowed(g);
};
/** Money bag (sack + neck + tie). */
const makeBag = () => {
  const g = new THREE.Group();
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), toon("#ffffff", { map: bagTex() }));
  sack.scale.set(1, 0.92, 0.85);
  sack.position.y = 0.18;
  sack.castShadow = true;
  g.add(sack);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.12, 20), toon("#d8b98a"));
  neck.position.y = 0.4;
  g.add(neck);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 24), toon("#2f7d4f"));
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.37;
  g.add(tie);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), toon("#d8b98a"));
  tuft.scale.set(1.3, 0.7, 1.3);
  tuft.position.y = 0.47;
  g.add(tuft);
  g.traverse((o: any) => o.isMesh && (o.userData.noCollide = true));
  return g;
};

// ---------------- the world ----------------
export type World = {
  scene: THREE.Scene;
  lights: KitLights;
  setSky: (sky: "day" | "dawn") => void;
  setSet: (s: SetName) => void;
  cast: { otto: Character; ravi: Character; mika: Character; june: Character; bea: Character; leo: Character };
  seats: THREE.Object3D[];
  rig: THREE.Group;
  hall: {
    door: THREE.Group; // pivot at the hinge; rotation.y < 0 swings it open towards the hall
    handle: THREE.Group;
    glowLight: THREE.PointLight;
    doorsL: THREE.Group;
    doorsR: THREE.Group;
    bag: THREE.Group;
    tag: THREE.Group;
    rings: THREE.Mesh[]; // tap sound rings
  };
  heroWheel: Wheel; // Otto's wheel (OTTO stamp) — hall, vault, sold
  dairy: {
    shelfWheels: Wheel[];
    newWheel: Wheel;
    calendar: { tex: THREE.Texture; draw: (m: number) => void };
    calPage: THREE.Group;
    calPrev: { tex: THREE.Texture; draw: (m: number) => void };
    bills: THREE.Mesh[];
    steam: THREE.Sprite[];
    paddle: THREE.Group;
    wedge: THREE.Group;
  };
  vault: {
    calendar: { tex: THREE.Texture; draw: (m: number) => void };
    calPage: THREE.Group;
    calPrev: { tex: THREE.Texture; draw: (m: number) => void };
    lamps: THREE.Mesh[];
  };
  lab: {
    cut: THREE.Group;
    setCutAge: (a: number) => void;
    coins: THREE.Mesh[];
    sandTop: THREE.Mesh;
    sandBot: THREE.Mesh;
    stream: THREE.Mesh;
    hourglass: THREE.Group;
  };
  laugh: { mika: THREE.Texture; june: THREE.Texture };
  props: { hammer: THREE.Group; flashL: THREE.Group; flashB: THREE.Group; clipboard: THREE.Group; magnifier: THREE.Group };
  torch: THREE.PointLight;
  posts: THREE.Group;
  sideRacks: THREE.Object3D[];
};
export type SetName = "hall" | "vault" | "dairy" | "lab";
export const SET_CENTER: Record<SetName, [number, number, number]> = {
  hall: [0, 0, 0],
  vault: [0, 0, -14],
  dairy: [DAIRY_X, 0, 0],
  lab: [LAB_X, 0, 0],
};
// vault rack rows (x centres), aisles at x = 0, ±3.02, ±6.04; each row is one wheel deep
export const RACK_ROWS = [-7.58, -5.14, -4.4, -1.96, -1.22, 1.22, 1.96, 4.4, 5.14, 7.58];
export const RACK_D = 0.74; // row depth (one wheel)
export const AISLES = [0, -3.18, 3.18, -6.36, 6.36];
export const RACK_Z0 = -6.2;
export const RACK_Z1 = -24.2;
export const LEVEL_Y = (i: number) => 0.12 + i * 0.42; // board bottom
export const LEVELS = 20;
export const PITCH = 0.76; // wheel spacing along a rack; posts every 3 wheels fall in the gaps
export const wheelZ = (k: number) => RACK_Z0 - 0.04 - PITCH / 2 - k * PITCH;
export const SLOT_K = 2;
/** The empty slot Otto's wheel goes into (right rack of the centre aisle, level 2). */
export const SLOT = { x: 1.22, y: LEVEL_Y(2) + 0.04 + WHEEL_H / 2, z: wheelZ(SLOT_K) };

const HOLE_R = 1.3;
/** A 2.9 × 2.9 m wall panel (centre y 1.6) with a round hole of HOLE_R, extruded `depth` from z0 towards +z. */
const holePanel = (mat: THREE.Material, depth: number, z0: number) => {
  const sh = new THREE.Shape();
  sh.moveTo(-1.45, -1.45);
  sh.lineTo(1.45, -1.45);
  sh.lineTo(1.45, 1.45);
  sh.lineTo(-1.45, 1.45);
  sh.lineTo(-1.45, -1.45);
  const hole = new THREE.Path();
  hole.absarc(0, 0, HOLE_R, 0, Math.PI * 2, true);
  sh.holes.push(hole);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 48 }), mat);
  m.position.set(0, 1.6, z0);
  m.userData.noCollide = true;
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
};
/** Soft round puff for steam (radial alpha gradient). */
let PUFF: THREE.Texture | null = null;
const puffTex = () => {
  if (PUFF) return PUFF;
  const { c, g } = makeCanvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.85)");
  gr.addColorStop(0.5, "rgba(255,255,255,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  PUFF = toTex(c);
  return PUFF;
};
/** A solid cheese wedge: pie slice (tip at the origin, rind arc at radius r round −y) extruded `t` along z, with a
 *  rind band on the arc. grip = a point just outside the middle of the rind (where a fist holds it). */
const makeWedge = (r: number, ang: number, t: number) => {
  const g = new THREE.Group();
  const a0 = -Math.PI / 2 - ang / 2,
    a1 = -Math.PI / 2 + ang / 2;
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
  sh.absarc(0, 0, r, a0, a1, false);
  sh.lineTo(0, 0);
  const paste = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 16 }), toon("#f3e3b0"));
  const band = new THREE.Shape();
  band.absarc(0, 0, r + 0.014, a0, a1, false);
  band.absarc(0, 0, r - 0.002, a1, a0, true);
  const rind = new THREE.Mesh(new THREE.ExtrudeGeometry(band, { depth: t + 0.004, bevelEnabled: false, curveSegments: 16 }), toon("#b87a2c"));
  rind.position.z = -0.002;
  g.add(paste, rind);
  g.traverse((o: any) => o.isMesh && (o.userData.noCollide = true));
  g.userData.grip = new THREE.Vector3(0, -(r + 0.014 + 0.05), t / 2);
  return g;
};
/** Ravi's glasses sit ON the head surface (kit rings are tangent at 0.318 and poke past the silhouette in 3/4 views). */
const seatGlasses = (ch: Character) => {
  const head = ch.parts.head;
  head.children.forEach((o: any) => {
    const p = o.geometry?.parameters;
    if (o.geometry?.type === "TorusGeometry" && p && Math.abs(p.radius - 0.068) < 1e-3) o.position.setLength(0.296);
    if (o.geometry?.type === "CylinderGeometry" && p && Math.abs(p.height - 0.05) < 1e-3) o.position.z = 0.294;
  });
};

/** Put a custom face texture on a kit character's face cap (after any setExpr this frame). */
export const setFaceMap = (ch: Character, tex: THREE.Texture) => {
  const m = (ch.parts.head.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  if (m.map !== tex) {
    m.map = tex;
    m.needsUpdate = true;
  }
};

export const buildWorld = (): World => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#2a2030");

  const hemi = new THREE.HemisphereLight("#ffffff", "#8a98d6", 2.6);
  const key = new THREE.DirectionalLight("#fff3df", 2.0);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -9;
  sc.right = sc.top = 9;
  sc.near = 1;
  sc.far = 40;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  const rig = new THREE.Group();
  rig.add(key, key.target);
  scene.add(hemi, rig);
  const practicals: THREE.PointLight[] = [];
  const pl = (color: string, i: number, d: number, x: number, y: number, z: number) => {
    const p = new THREE.PointLight(color, i, d, 1.6);
    p.position.set(x, y, z);
    scene.add(p);
    practicals.push(p);
    return p;
  };

  const sets: Record<SetName, THREE.Group> = { hall: new THREE.Group(), vault: new THREE.Group(), dairy: new THREE.Group(), lab: new THREE.Group() };
  Object.values(sets).forEach((g) => scene.add(g));

  // ======================= HALL =======================
  const H = sets.hall;
  const hallFloor = plane(14, 12.4, toon("#ffffff", { map: marbleFloorTex([7, 6.2]), key: "marble" }));
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(0, 0, 0.8);
  H.add(hallFloor);
  const WALL = "#f1e4cc";
  const HW = 4.8;
  // back wall with a ROUND vault opening (r = HOLE_R, centre y 1.6) that the door frame ring surrounds
  const back = new THREE.Group();
  const bl = box(5.55, HW, 0.4, WALL, -4.225, 0, -5.2);
  bl.name = "hall back wall";
  back.add(bl, box(5.55, HW, 0.4, WALL, 4.225, 0, -5.2), box(2.9, 0.15, 0.4, WALL, 0, 0, -5.2), box(2.9, HW - 3.05, 0.4, WALL, 0, 3.05, -5.2));
  back.add(holePanel(toon(WALL), 0.4, -5.4));
  back.add(box(5.4, 0.18, 0.06, "#c99a4a", -4.3, 1.0, -4.98), box(5.4, 0.18, 0.06, "#c99a4a", 4.3, 1.0, -4.98)); // gold chair rail
  back.add(box(14, 0.3, 0.08, "#8a5a3a", 0, 0, -4.97)); // skirting
  H.add(noShadowShell(back));
  // side walls + front wall with the entrance x ∈ [−1.2, 1.2], y < 3.0
  const sides = new THREE.Group();
  sides.add(box(0.4, HW, 13, WALL, -7.2, 0, 0.5), box(0.4, HW, 13, WALL, 7.2, 0, 0.5));
  sides.add(box(5.8, HW, 0.4, WALL, -4.1, 0, 7.2), box(5.8, HW, 0.4, WALL, 4.1, 0, 7.2), box(2.4, HW - 3.0, 0.4, WALL, 0, 3.0, 7.2));
  sides.add(box(0.08, 0.18, 13, "#c99a4a", -6.98, 1.0, 0.5), box(0.08, 0.18, 13, "#c99a4a", 6.98, 1.0, 0.5));
  H.add(noShadowShell(sides));
  const ceil = plane(14.4, 13.4, toon("#f6efe2"));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, HW, 0.5);
  ceil.castShadow = false;
  H.add(ceil);
  // piazza outside the entrance
  const piazza = plane(9, 9, flat("#ffffff", piazzaTex()));
  piazza.position.set(0, 2.6, 10.5);
  piazza.rotation.y = Math.PI;
  H.add(piazza);
  const street = plane(10, 4, toon("#e9d6b4"));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.001, 9.2);
  H.add(street);
  // entrance doors (open, hinged at the jambs)
  const doorLeaf = (side: number) => {
    const piv = new THREE.Group();
    piv.position.set(side * 1.2, 0, 7.0);
    const leaf = box(1.18, 2.95, 0.08, "#7a4a2c", -side * 0.59, 0, 0);
    leaf.name = "entrance door";
    piv.add(leaf, box(0.8, 1.6, 0.1, "#8d5a38", -side * 0.59, 0.9, 0));
    H.add(piv);
    return piv;
  };
  const doorsL = doorLeaf(-1),
    doorsR = doorLeaf(1);
  doorsL.rotation.y = -1.45;
  doorsR.rotation.y = 1.45;
  // columns
  for (const x of [-4.4, 4.4])
    for (const z of [-2.8, 2.2]) {
      const col = new THREE.Group();
      const shaft = cyl(0.32, 0.34, HW - 0.6, "#efe6d6", 40, x, 0.3, z);
      shaft.name = "column";
      col.add(shaft, box(0.9, 0.3, 0.9, "#e2d5bd", x, 0, z), box(0.9, 0.3, 0.9, "#e2d5bd", x, HW - 0.3, z));
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const fl = box(0.04, HW - 0.7, 0.04, "#d8cab0", x + Math.sin(a) * 0.325, 0.35, z + Math.cos(a) * 0.325);
        fl.userData.noCollide = true;
        col.add(fl);
      }
      H.add(shadowed(col));
    }
  // teller counter along the left wall
  const counter = new THREE.Group();
  const ct = box(1.0, 1.05, 6.2, "#8a5a3a", -6.0, 0, 0);
  ct.name = "teller counter";
  counter.add(ct, box(1.1, 0.08, 6.3, "#efe6d6", -6.0, 1.05, 0));
  for (let k = 0; k < 9; k++) counter.add(cyl(0.02, 0.02, 0.9, "#d4a640", 10, -5.55, 1.13, -2.8 + k * 0.7));
  counter.add(box(0.06, 0.06, 6.2, "#d4a640", -5.55, 2.03, 0));
  H.add(shadowed(counter));
  H.add(plant(-6.5, 0, -4.4, 1.4), plant(6.5, 0, -4.4, 1.4), plant(6.5, 0, 6.4, 1.3));
  // BANCA sign over the vault door
  const sign = plane(3.4, 0.85, flat("#ffffff", bankSignTex()));
  (sign.material as THREE.MeshBasicMaterial).color.setScalar(1.05);
  sign.position.set(0, 3.75, -4.985);
  H.add(sign);
  // round vault door: steel frame ring + door on a hinge
  const frame = new THREE.Mesh(new THREE.TorusGeometry(1.43, 0.13, 20, 72), toon("#9aa4b2"));
  frame.position.set(0, 1.6, -4.98);
  frame.userData.noCollide = true;
  H.add(shadowed(frame));
  // round steel tunnel through the wall
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R, HOLE_R, 0.75, 64, 1, true), new THREE.MeshToonMaterial({ color: "#5d6676", side: THREE.DoubleSide }));
  tunnel.rotation.x = Math.PI / 2;
  tunnel.position.set(0, 1.6, -5.35);
  tunnel.userData.noCollide = true;
  H.add(noShadowShell(tunnel));
  const door = new THREE.Group();
  door.position.set(-1.36, 1.6, -4.82);
  const disc = cyl(1.35, 1.35, 0.32, "#c3cad4", 64, 0, 0, 0);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(1.36, 0, 0);
  disc.name = "vault door";
  door.add(disc);
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 12, 64), toon("#9aa4b2"));
  ringA.position.set(1.36, 0, 0.17);
  door.add(ringA);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    door.add(sphere(0.045, "#8c96a6", 1.36 + Math.cos(a) * 1.18, Math.sin(a) * 1.18, 0.17, 12));
  }
  const handle = new THREE.Group();
  handle.position.set(1.36, 0, 0.2);
  handle.add(cyl(0.12, 0.12, 0.16, "#8c96a6", 24, 0, -0.08, 0));
  (handle.children[0] as THREE.Mesh).rotation.x = Math.PI / 2;
  (handle.children[0] as THREE.Mesh).position.set(0, 0, 0.04);
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 10, 48), toon("#d4a640"));
  wheelRing.position.z = 0.12;
  handle.add(wheelRing);
  for (let k = 0; k < 3; k++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.05), toon("#d4a640"));
    sp.rotation.z = (k / 3) * Math.PI;
    sp.position.z = 0.12;
    handle.add(sp);
  }
  door.add(handle);
  // the back of the door: locking bolts round the rim + a back plate (seen when it swings open)
  const backPlate = cyl(1.0, 1.0, 0.06, "#9aa4b2", 48, 0, 0, 0);
  backPlate.rotation.x = Math.PI / 2;
  backPlate.position.set(1.36, 0, -0.19);
  door.add(backPlate);
  const gearRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 10, 48), toon("#7d8798"));
  gearRing.position.set(1.36, 0, -0.23);
  door.add(gearRing);
  const hub = cyl(0.2, 0.2, 0.12, "#c3cad4", 24, 0, 0, 0);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(1.36, 0, -0.25);
  door.add(hub);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 16), toon("#dfe5ec"));
    bolt.position.set(1.36 + Math.cos(a) * 1.33, Math.sin(a) * 1.33, -0.12);
    bolt.rotation.z = a - Math.PI / 2;
    door.add(bolt);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.04), toon("#7d8798"));
    arm.position.set(1.36 + Math.cos(a) * 0.95, Math.sin(a) * 0.95, -0.24);
    arm.rotation.z = a - Math.PI / 2;
    door.add(arm);
  }
  door.traverse((o: any) => o.isMesh && o !== disc && (o.userData.noCollide = true));
  H.add(shadowed(door));
  // warm light spilling out of the vault (on while the door is open)
  const glowLight = pl("#ffc06a", 0, 6, 0, 2.4, -7.2);
  // Ravi's desk (right of the door) with a green banker's lamp
  const desk = new THREE.Group();
  const dtop = box(1.8, 0.06, 0.85, "#6e3f24", 2.0, 0.72, -2.6);
  dtop.name = "desk top";
  desk.add(dtop, box(0.08, 0.72, 0.8, "#5a321c", 1.14, 0, -2.6), box(0.08, 0.72, 0.8, "#5a321c", 2.86, 0, -2.6), box(1.7, 0.6, 0.05, "#5a321c", 2.0, 0.12, -2.22));
  desk.add(box(1.5, 0.012, 0.55, "#2f6b4c", 2.0, 0.78, -2.62)); // leather blotter
  const lampBase = cyl(0.08, 0.1, 0.03, "#d4a640", 20, 2.6, 0.78, -2.85);
  const lampPost = cyl(0.015, 0.015, 0.32, "#d4a640", 10, 2.6, 0.81, -2.85);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 24, 1, false, 0, Math.PI), glow("#3fbf7a", 1.6));
  shade.rotation.z = Math.PI / 2;
  shade.position.set(2.6, 1.14, -2.8);
  shade.userData.noCollide = true;
  [lampBase, lampPost].forEach((m) => (m.userData.noCollide = true));
  desk.add(lampBase, lampPost, shade);
  H.add(shadowed(desk));
  pl("#ffe2a8", 1.0, 1.4, 2.6, 1.05, -2.8);
  // pendant globe lamps
  for (const [x, z] of [
    [-2.4, -1.0],
    [2.4, 1.4],
  ] as [number, number][]) {
    H.add(cyl(0.01, 0.01, 1.3, INK, 6, x, HW - 1.3, z));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), glow("#ffe7b8", 2.2));
    bulb.position.set(x, HW - 1.45, z);
    bulb.userData.noCollide = true;
    H.add(bulb);
    pl("#ffd9a0", 3.5, 6, x, HW - 1.7, z);
  }
  // money bag, SOLD tag, tap rings
  const bag = makeBag();
  bag.scale.setScalar(0.75);
  H.add(bag);
  const tag = new THREE.Group();
  const tagPlane = plane(0.36, 0.18, new THREE.MeshBasicMaterial({ map: soldTagTex(), side: THREE.DoubleSide }));
  tagPlane.position.y = 0.09;
  tag.add(tagPlane);
  tag.add(cyl(0.006, 0.006, 0.2, "#c98a52", 6, -0.17, -0.12, 0)); // pick from the cheese up to the tag's corner
  H.add(tag);
  const rings: THREE.Mesh[] = [];
  for (let k = 0; k < 3; k++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 64), glow("#fff1c4", 2.4));
    r.rotation.x = Math.PI / 2;
    r.userData.noGbuffer = true;
    r.castShadow = false;
    H.add(r);
    rings.push(r);
  }

  // ======================= VAULT =======================
  const V = sets.vault;
  const VW = 11.0; // ceiling height (rack tops at ~8.4 m)
  const vFloor = plane(16.6, 20.7, toon("#ffffff", { map: stoneFloorTex([8, 10]), key: "stone" }));
  vFloor.rotation.x = -Math.PI / 2;
  vFloor.position.set(0, 0, -15.75);
  V.add(vFloor);
  const vshell = new THREE.Group();
  const bk = (w: number, h: number, rep: [number, number]) => toon("#ffffff", { map: brickTex(rep) });
  vshell.add(box(16.6, VW, 0.3, bk(16.6, VW, [6, 4]), 0, 0, -26.2), box(0.3, VW, 21, bk(21, VW, [8, 4]), -8.25, 0, -15.6), box(0.3, VW, 21, bk(21, VW, [8, 4]), 8.25, 0, -15.6));
  // front wall of the vault (inside face) around the door opening
  vshell.add(box(6.95, VW, 0.3, bk(6.95, VW, [3, 4]), -4.925, 0, -5.55), box(6.95, VW, 0.3, bk(6.95, VW, [3, 4]), 4.925, 0, -5.55), box(2.9, VW - 3.05, 0.3, bk(2.9, 4, [1, 3]), 0, 3.05, -5.55));
  vshell.add(box(2.9, 0.15, 0.3, "#6f4a36", 0, 0, -5.55), holePanel(toon("#7a5038"), 0.3, -5.7));
  V.add(noShadowShell(vshell));
  const vCeil = plane(16.6, 21, toon("#3b2a20"));
  vCeil.rotation.x = Math.PI / 2;
  vCeil.position.set(0, VW, -15.6);
  vCeil.castShadow = false;
  V.add(vCeil);
  for (let z = -7; z > -26; z -= 2.5) V.add(noShadowShell(box(16.6, 0.22, 0.24, "#5a3a26", 0, VW - 0.22, z)));
  // racks: boards per level + posts; wheels instanced
  const racks = new THREE.Group();
  const posts = new THREE.Group();
  const rackLen = RACK_Z0 - RACK_Z1;
  const rackZ = (RACK_Z0 + RACK_Z1) / 2;
  const PER = Math.floor((rackLen - 0.04) / PITCH);
  const boardMat = toon("#a8743f");
  const postMat = toon("#7d5230");
  for (const x of RACK_ROWS) {
    for (let i = 0; i < LEVELS; i++) {
      const b = box(RACK_D, 0.04, rackLen, boardMat, x, LEVEL_Y(i), rackZ);
      b.name = "rack board";
      b.userData.row = x;
      racks.add(b);
    }
    for (let j = 0; j * 3 <= PER; j++)
      for (const dx of [-0.35, 0.35]) {
        const p = box(0.05, LEVEL_Y(LEVELS - 1) + 0.1, 0.05, postMat, x + dx, 0, RACK_Z0 - 0.02 - j * 3 * PITCH);
        p.name = "rack post";
        posts.add(p);
      }
  }
  V.add(racks, posts);
  const slots: [number, number, number][] = [];
  for (const x of RACK_ROWS)
    for (let i = 0; i < LEVELS; i++)
      for (let k = 0; k < PER; k++) {
        const z = wheelZ(k);
        // keep Otto's slot empty
        if (x === SLOT.x && i === 2 && k === SLOT_K) continue;
        slots.push([x, LEVEL_Y(i) + 0.04 + WHEEL_H / 2, z]);
      }
  const instGeo = new THREE.CylinderGeometry(WHEEL_R - 0.015, WHEEL_R - 0.015, WHEEL_H, 32);
  const instSide = toon("#ffffff", { map: sideTex(), key: "inst-side" });
  const instTop = toon("#ffffff", { map: topTex("FORMA"), key: "inst-top" });
  const CENTRE = (x: number) => x === 1.22 || x === 1.96;
  const cSlots = slots.filter(([x]) => CENTRE(x)),
    sSlots = slots.filter(([x]) => !CENTRE(x));
  const instC = new THREE.InstancedMesh(instGeo, [instSide, instTop, instTop], cSlots.length);
  const inst = new THREE.InstancedMesh(instGeo, [instSide, instTop, instTop], sSlots.length);
  const rr0 = rng(99);
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  let ic = 0,
    is = 0;
  slots.forEach(([x, y, z]) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr0() * Math.PI * 2);
    mtx.compose(new THREE.Vector3(x + (rr0() - 0.5) * 0.04, y, z), q, new THREE.Vector3(1, 1, 1));
    col.set(YOUNG).lerp(new THREE.Color(AGED), 0.55 + rr0() * 0.45);
    const m = CENTRE(x) ? instC : inst;
    const i = CENTRE(x) ? ic++ : is++;
    m.setMatrixAt(i, mtx);
    m.setColorAt(i, col);
  });
  for (const m of [instC, inst]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.noCollide = true;
    m.computeBoundingSphere();
    V.add(m);
  }
  // the side racks (everything but the centre double rack): hidden in the top-down shot
  const sideRacks: THREE.Object3D[] = [inst, ...racks.children.filter((o: any) => !CENTRE(o.userData.row))];
  // pendant lamps over the aisles
  const lamps: THREE.Mesh[] = [];
  const LAMP_Y = 6.4;
  for (const x of AISLES)
    for (const z of [-7.5, -12.5, -17.5, -22.5]) {
      const cord = cyl(0.008, 0.008, VW - LAMP_Y, INK, 6, x, LAMP_Y, z);
      cord.userData.noCollide = true;
      V.add(cord);
      const shadeV = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 24, 1, true), toon("#2f3a33"));
      shadeV.position.set(x, LAMP_Y - 0.06, z);
      shadeV.userData.noCollide = true;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), glow("#ffd48a", 3));
      bulb.position.set(x, LAMP_Y - 0.18, z);
      V.add(shadeV, bulb);
      lamps.push(bulb);
    }
  pl("#ffc878", 7, 10, 0, 5.6, -8.0);
  pl("#ffc878", 6, 10, 0, 5.6, -14.0);
  pl("#ffc878", 6, 10, 0, 5.6, -20.0);
  pl("#ffc878", 5, 10, -3.18, 5.6, -11.0);
  pl("#ffc878", 5, 10, 3.18, 5.6, -11.0);
  // calendar on the rack post next to Otto's slot (time-lapse)
  const vcal = makeCalendarTex();
  const vcalBoard = plane(0.36, 0.45, flat("#ffffff", vcal.tex));
  vcalBoard.position.set(0.83, 1.95, RACK_Z0 - 0.02 - 3 * PITCH);
  vcalBoard.rotation.y = -Math.PI / 2;
  V.add(vcalBoard);
  const vcalPage = new THREE.Group();
  vcalPage.position.set(0.825, 2.175, RACK_Z0 - 0.02 - 3 * PITCH);
  const vcalPrev = makeCalendarTex();
  const vpg = plane(0.36, 0.45, new THREE.MeshBasicMaterial({ color: "#ffffff", map: vcalPrev.tex, side: THREE.DoubleSide }));
  vpg.position.y = -0.225;
  vpg.rotation.y = -Math.PI / 2;
  vcalPage.add(vpg);
  V.add(vcalPage);

  // ======================= DAIRY =======================
  const D = sets.dairy;
  const X = DAIRY_X;
  const dFloor = plane(9, 8, toon("#ffffff", { map: woodTex("#b98352", 5, [4, 4]), key: "dairy-floor" }));
  dFloor.rotation.x = -Math.PI / 2;
  dFloor.position.set(X, 0, 0);
  D.add(dFloor);
  const plaster = toon("#ffffff", { map: plasterTex("#f3e6cf", [6, 3]), key: "plaster" });
  const dshell = new THREE.Group();
  // back wall z = −3.6 with a window x ∈ [X−1.6, X−0.2], y ∈ [1.0, 2.2]
  dshell.add(box(2.9, 3.4, 0.3, plaster, X - 3.05, 0, -3.75), box(4.7, 3.4, 0.3, plaster, X + 2.15, 0, -3.75));
  dshell.add(box(1.4, 1.0, 0.3, plaster, X - 0.9, 0, -3.75), box(1.4, 1.2, 0.3, plaster, X - 0.9, 2.2, -3.75));
  dshell.add(box(0.3, 3.4, 8, plaster, X - 4.5, 0, 0), box(0.3, 3.4, 8, plaster, X + 4.5, 0, 0));
  for (const z of [-2.5, -0.5, 1.5]) dshell.add(box(9, 0.2, 0.22, "#6b4428", X, 3.2, z)); // ceiling beams
  dshell.add(box(9, 0.22, 0.1, "#6b4428", X, 0, -3.58)); // skirting
  D.add(noShadowShell(dshell));
  const dCeil = plane(9, 8, toon("#ffffff", { map: woodTex("#8a5a36", 9, [3, 3]), key: "dairy-ceil" }));
  dCeil.rotation.x = Math.PI / 2;
  dCeil.position.set(X, 3.4, 0);
  dCeil.castShadow = false;
  D.add(dCeil);
  const winMat = flat("#ffffff", hillsTex(false));
  const hillsDay = winMat.map!,
    hillsDawn = hillsTex(true);
  const win = plane(1.4, 1.2, winMat);
  win.position.set(X - 0.9, 1.6, -3.7);
  D.add(win);
  D.add(noShadowShell(box(1.5, 0.08, 0.3, "#6b4428", X - 0.9, 0.96, -3.6)), box(0.06, 1.2, 0.05, "#6b4428", X - 0.9, 1.0, -3.6), box(1.4, 0.06, 0.05, "#6b4428", X - 0.9, 1.57, -3.6));
  pl("#ffd9a0", 2.0, 5, X + 0.2, 2.6, -0.4);
  // copper vat on a stand
  const vat = new THREE.Group();
  const vbody = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.6, 0.95, 48, 1, true), new THREE.MeshToonMaterial({ color: "#d27a45", side: THREE.DoubleSide }));
  vbody.position.set(X - 2.6, 0.2 + 0.475, -1.9);
  vbody.name = "copper vat";
  const vbottom = cyl(0.6, 0.6, 0.04, "#b9653a", 48, X - 2.6, 0.2, -1.9);
  vbottom.userData.noCollide = true;
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.045, 12, 72), toon("#e8975e"));
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.set(X - 2.6, 1.15, -1.9);
  rimRing.userData.noCollide = true;
  vat.add(vbody, vbottom, rimRing);
  const milk = new THREE.Mesh(new THREE.CircleGeometry(0.765, 64), toon("#efe4c8"));
  milk.rotation.x = -Math.PI / 2;
  milk.position.set(X - 2.6, 1.02, -1.9);
  vat.add(milk);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.6;
    vat.add(box(0.07, 0.3, 0.07, "#4a4f5c", X - 2.6 + Math.cos(a) * 0.5, 0, -1.9 + Math.sin(a) * 0.5));
  }
  D.add(shadowed(vat));
  const steam: THREE.Sprite[] = [];
  for (let k = 0; k < 9; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: "#ffffff", transparent: true, depthWrite: false, opacity: 0.75 }));
    s.userData.noGbuffer = true;
    s.userData.noCollide = true;
    D.add(s);
    steam.push(s);
  }
  // stirring paddle (held by Otto)
  const paddle = new THREE.Group();
  paddle.add(cyl(0.022, 0.022, 1.3, "#8a5a32", 10, 0, -1.25, 0));
  paddle.add(box(0.16, 0.26, 0.035, "#8a5a32", 0, -1.3, 0));
  paddle.userData.grips = [new THREE.Vector3(0, -0.03, 0), new THREE.Vector3(0, -0.24, 0)]; // upper fist, lower fist (on the shaft)
  paddle.traverse((o: any) => o.isMesh && (o.userData.noCollide = true));
  D.add(paddle);
  // aging shelf against the back wall, right of the window
  const shelf = new THREE.Group();
  const SX0 = X + 0.6,
    SX1 = X + 3.4,
    SZ = -3.2;
  for (let i = 0; i < 4; i++) {
    const b = box(SX1 - SX0, 0.04, 0.66, "#a8743f", (SX0 + SX1) / 2, 0.2 + i * 0.44, SZ);
    b.name = "dairy shelf";
    shelf.add(b);
  }
  for (const x of [SX0 + 0.03, SX1 - 0.03]) for (const dz of [-0.3, 0.3]) shelf.add(box(0.06, 1.62, 0.06, "#7d5230", x, 0, SZ + dz));
  D.add(shadowed(shelf));
  const shelfWheels: Wheel[] = [];
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 3; k++) {
      if (i === 2 && k === 1) continue; // the slot Otto fills
      const w = makeWheel("OTTO");
      w.tilt.rotation.z = 0;
      w.spin.rotation.y = k * 1.3 + i;
      w.g.position.set(SX0 + 0.5 + k * 0.9, 0.2 + i * 0.44 + 0.04 + WHEEL_H / 2, SZ);
      D.add(w.g);
      shelfWheels.push(w);
    }
  const newWheel = makeWheel("OTTO");
  D.add(newWheel.g);
  // calendar on the back wall between window and shelf
  const cal = makeCalendarTex();
  const calBoard = plane(0.5, 0.62, flat("#ffffff", cal.tex));
  calBoard.position.set(X + 0.22, 1.95, -3.585);
  D.add(calBoard);
  const calPage = new THREE.Group();
  calPage.position.set(X + 0.22, 2.26, -3.58);
  const calPrev = makeCalendarTex();
  const cpg = plane(0.5, 0.62, new THREE.MeshBasicMaterial({ color: "#ffffff", map: calPrev.tex, side: THREE.DoubleSide }));
  cpg.position.y = -0.31;
  calPage.add(cpg);
  D.add(calPage);
  // table with bills
  const table = new THREE.Group();
  const ttop = box(1.5, 0.06, 0.85, "#9c6a3e", X, 0.74, 0.4);
  ttop.name = "dairy table";
  table.add(ttop);
  for (const dx of [-0.66, 0.66]) for (const dz of [-0.34, 0.34]) table.add(box(0.07, 0.74, 0.07, "#7d5230", X + dx, 0, 0.4 + dz));
  D.add(shadowed(table));
  const bills: THREE.Mesh[] = [];
  for (let k = 0; k < 4; k++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.006, 0.22), [
      toon("#f7f2e6"),
      toon("#f7f2e6"),
      new THREE.MeshToonMaterial({ map: billTex(100 + k) }),
      toon("#f7f2e6"),
      toon("#f7f2e6"),
      toon("#f7f2e6"),
    ]);
    b.userData.noCollide = true;
    b.castShadow = true;
    D.add(b);
    bills.push(b);
  }
  // a wedge of cheese June holds up
  const wedge = new THREE.Group();
  const wg = makeWedge(0.22, 0.8, 0.16);
  wedge.add(wg);
  wedge.userData.grip = wg.userData.grip;
  D.add(wedge);

  // ======================= LAB (cutaway stage) =======================
  const L = sets.lab;
  const LX = LAB_X;
  const lFloor = plane(14, 12, toon("#93c3cf"));
  lFloor.rotation.x = -Math.PI / 2;
  lFloor.position.set(LX, 0, 0);
  L.add(lFloor);
  const cyc = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 9, 64, 1, true, Math.PI * 0.5, Math.PI), toon("#b6dce4"));
  (cyc.material as THREE.Material).side = THREE.BackSide;
  cyc.position.set(LX, 4.5, 1.5);
  cyc.castShadow = false;
  cyc.receiveShadow = true;
  cyc.userData.noCollide = true;
  L.add(cyc);
  // pedestal + the cut wheel (wedge of 90° removed towards +z)
  L.add(shadowed(cyl(0.85, 0.9, 0.42, "#fff2dc", 64, LX, 0, 0.2)));
  L.add(shadowed(cyl(0.95, 0.95, 0.05, "#c98a52", 64, LX, 0.42, 0.2)));
  const cut = new THREE.Group();
  cut.position.set(LX, 0.47, 0.2);
  const CR = 0.72,
    CH = 0.56;
  const cutSide = toon("#ffffff", { map: sideTex() });
  // the stamp turned so OTTO reads left→right from the front camera (the cap's UVs run u ↔ z)
  const cutStamp = topTex("OTTO").clone();
  cutStamp.center.set(0.5, 0.5);
  cutStamp.rotation = Math.PI / 2;
  cutStamp.needsUpdate = true;
  const cutTop = toon("#ffffff", { map: cutStamp });
  const cutMesh = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 64, 1, false, Math.PI / 4, Math.PI * 1.5), [cutSide, cutTop, cutTop]);
  cutMesh.position.y = CH / 2;
  cutMesh.castShadow = true;
  cutMesh.userData.noCollide = true;
  cut.add(cutMesh);
  const paste = makePasteTex();
  const pasteMat = new THREE.MeshToonMaterial({ map: paste.tex, side: THREE.DoubleSide });
  for (const th of [Math.PI / 4, -Math.PI / 4]) {
    const geo = new THREE.PlaneGeometry(CR, CH);
    if (th < 0) {
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    }
    const face = new THREE.Mesh(geo, pasteMat);
    face.position.set(Math.sin(th) * CR * 0.5, CH / 2, Math.cos(th) * CR * 0.5);
    const n = th > 0 ? [-Math.cos(th), Math.sin(th)] : [Math.cos(th), -Math.sin(th)];
    face.rotation.y = Math.atan2(n[0], n[1]);
    cut.add(face);
  }
  L.add(cut);
  const youngC = new THREE.Color(YOUNG),
    oldC = new THREE.Color(AGED);
  const setCutAge = (a: number) => {
    const c = youngC.clone().lerp(oldC, a);
    cutSide.color.copy(c);
    cutTop.color.copy(c);
    paste.draw(Math.round(a * 20) / 20);
  };
  // coin stack (right, behind)
  L.add(shadowed(cyl(0.3, 0.32, 0.9, "#fff2dc", 40, LX + 0.6, 0, -0.85)));
  const coins: THREE.Mesh[] = [];
  const rc = rng(5);
  for (let k = 0; k < 26; k++) {
    void rc;
    const cm = cyl(0.2, 0.2, 0.062, toon("#f5c242", { emissive: "#2a1c00" }), 48, LX + 0.6, 0.9 + k * 0.064, -0.85);
    cm.userData.noCollide = true;
    L.add(cm);
    coins.push(cm);
  }
  // hourglass (left, behind)
  L.add(shadowed(cyl(0.3, 0.32, 0.9, "#fff2dc", 40, LX - 0.6, 0, -0.85)));
  const hourglass = new THREE.Group();
  hourglass.position.set(LX - 0.6, 0.9, -0.85);
  hourglass.add(cyl(0.24, 0.24, 0.06, "#8a5a32", 32, 0, 0, 0), cyl(0.24, 0.24, 0.06, "#8a5a32", 32, 0, 0.86, 0));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    hourglass.add(cyl(0.022, 0.022, 0.8, "#8a5a32", 10, Math.cos(a) * 0.2, 0.06, Math.sin(a) * 0.2));
  }
  const glass = new THREE.MeshToonMaterial({ color: "#f4fbff", transparent: true, opacity: 0.55 });
  for (const [y, flip] of [
    [0.27, 1],
    [0.65, -1],
  ] as [number, number][]) {
    const bulbG = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), glass);
    bulbG.position.y = y;
    bulbG.scale.set(1, 1.15, 1);
    bulbG.castShadow = false;
    hourglass.add(bulbG);
    void flip;
  }
  const sandMat = toon("#c9802a");
  const sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.17, 24), sandMat);
  sandTop.rotation.x = Math.PI; // point down
  sandTop.position.y = 0.6;
  const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.15, 24), sandMat);
  sandBot.position.y = 0.16;
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), sandMat);
  stream.position.y = 0.33;
  hourglass.add(sandTop, sandBot, stream);
  hourglass.traverse((o: any) => o.isMesh && (o.userData.noCollide = true));
  L.add(hourglass);

  // ======================= the hero wheel + held props =======================
  const heroWheel = makeWheel("OTTO");
  scene.add(heroWheel.g);
  const hammer = new THREE.Group();
  hammer.add(cyl(0.016, 0.016, 0.34, "#8a5a32", 10, 0, -0.27, 0)); // fist at the top of the handle
  const head = cyl(0.03, 0.03, 0.11, "#b9c1cc", 16, 0, 0, 0);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, -0.27, 0);
  hammer.add(head);
  const flash = (beam: string) => {
    const f = new THREE.Group();
    f.add(cyl(0.025, 0.025, 0.2, "#2b2f3a", 12, 0, -0.16, 0));
    f.add(cyl(0.04, 0.03, 0.05, "#2b2f3a", 16, 0, -0.21, 0));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 20), glow(beam, 1.25));
    lens.rotation.x = Math.PI / 2;
    lens.position.y = -0.215;
    f.add(lens);
    return f;
  };
  const flashL = flash("#fff3c4"),
    flashB = flash("#fff3c4");
  const clipboard = new THREE.Group();
  clipboard.add(box(0.22, 0.3, 0.015, "#8a5a32", 0, -0.32, 0));
  clipboard.add(box(0.18, 0.22, 0.004, "#fdfbf5", 0, -0.3, 0.01));
  [hammer, flashL, flashB, clipboard].forEach((p) => p.traverse((o: any) => o.isMesh && (o.userData.noCollide = true)));

  // ======================= cast =======================
  const cast = {
    otto: buildCharacter(CAST.otto),
    ravi: buildCharacter({ ...CAST.ravi, top: "#2c3a68" }),
    mika: buildCharacter(CAST.mika),
    june: buildCharacter(CAST.june),
    bea: buildCharacter(BEA),
    leo: buildCharacter(LEO),
  };
  dress(cast.ravi, suitTex());
  dress(cast.otto, apronTex());
  dress(cast.bea, coatTex("#3d6be0"));
  dress(cast.leo, coatTex("#e0413a"));
  Object.values(cast).forEach((c) => scene.add(c.root));
  cast.ravi.rHand.add(hammer);
  cast.leo.rHand.add(flashL);
  cast.bea.rHand.add(flashB);
  seatGlasses(cast.ravi);

  const torch = new THREE.PointLight("#fff1c4", 0, 0.8, 2);
  scene.add(torch);
  // magnifying glass (Leo): a world-space prop gripped at the end of its handle
  const magnifier = new THREE.Group();
  const mRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 10, 36), toon("#2b2f3a"));
  const mGlass = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), new THREE.MeshBasicMaterial({ color: "#dff3ff", transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  mGlass.userData.noGbuffer = true;
  const mHandle = cyl(0.014, 0.014, 0.14, "#8a5a32", 10, 0, -0.21, 0);
  magnifier.add(mRing, mGlass, mHandle);
  magnifier.traverse((o: any) => o.isMesh && (o.userData.noCollide = true));
  magnifier.userData.grip = new THREE.Vector3(0, -0.2, 0);
  scene.add(magnifier);
  // a hairline crack on the rind of the wheel Leo checks (left rack, level 2, k = 11)
  const crackC = makeCanvas(256, 128);
  crackC.g.strokeStyle = "#2a1606";
  crackC.g.lineWidth = 9;
  crackC.g.lineCap = "round";
  crackC.g.beginPath();
  crackC.g.moveTo(40, 30);
  [[70, 52], [96, 44], [124, 70], [150, 62], [176, 88], [204, 84], [228, 98]].forEach(([x, y]) => crackC.g.lineTo(x, y));
  crackC.g.moveTo(124, 70);
  crackC.g.lineTo(132, 104);
  crackC.g.stroke();
  const crack = plane(0.2, 0.1, new THREE.MeshBasicMaterial({ map: toTex(crackC.c), transparent: true, depthWrite: false }));
  crack.position.set(-1.22 + WHEEL_R - 0.015 + 0.003, LEVEL_Y(2) + 0.04 + WHEEL_H / 2, wheelZ(11));
  crack.rotation.y = Math.PI / 2;
  crack.userData.noGbuffer = true;
  V.add(crack);
  const fog = new THREE.Fog("#3a2a1e", 9, 30);
  return {
    scene,
    lights: { hemi, key, practicals },
    // the dairy window is locked to day whatever the look (the only window in the film)
    setSky: () => {
      winMat.map = hillsDay;
      void hillsDawn;
    },
    setSet: (s) => {
      const [x, y, z] = SET_CENTER[s];
      rig.position.set(x, y, z);
      scene.fog = s === "vault" ? fog : null;
      scene.background = new THREE.Color(s === "lab" ? "#a9d3dc" : "#2a2030");
    },
    cast,
    seats: [],
    rig,
    hall: { door, handle, glowLight, doorsL, doorsR, bag, tag, rings },
    heroWheel,
    dairy: { shelfWheels, newWheel, calendar: cal, calPage, calPrev, bills, steam, paddle, wedge },
    vault: { calendar: vcal, calPage: vcalPage, calPrev: vcalPrev, lamps },
    laugh: { mika: laughFaceTex(CAST.mika.skin), june: laughFaceTex(CAST.june.skin) },
    lab: { cut, setCutAge, coins, sandTop, sandBot, stream, hourglass },
    props: { hammer, flashL, flashB, clipboard, magnifier },
    torch,
    posts,
    sideRacks,
  };
};

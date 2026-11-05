// Reusable OFFICE set: open-plan desks for Mika/Ravi/June/Otto, a coffee corner with
// an original coffee machine, a glass meeting room with table, whiteboard and wall clock; lights hemi/key + practicals.
// Three.js convention: metres, y up, +z = the office front. Import buildWorld() as a whole set, or copy pieces.
import * as THREE from "three";
import { PAL, box, cyl, flat, look, plane, rng, shadowed, sphere, toon } from "../lib";
import { buildCharacter, CAST, Character } from "../character";
import {
  carpetTex,
  ceilingTex,
  cityTex,
  clockFaceTex,
  corkTex,
  dawnCityTex,
  machineLabelTex,
  woodTex,
  machineScreenTex,
  makeCalendar,
  signTex,
  stickyTex,
  tileWallTex,
  whiteboardTex,
  workScreenTex,
} from "../textures";

export type Machine = {
  group: THREE.Group;
  setState: (s: "ready" | "error") => void;
  steam: THREE.Mesh[];
  smoke: THREE.Mesh[];
};

/** Original coffee machine: charcoal body, grey control panel, screen, status light, brew head, drip tray. */
const buildMachine = (withMug: boolean): Machine => {
  const g = new THREE.Group();
  const body = PAL.charcoal;
  g.add(box(0.42, 0.06, 0.38, body, 0, 0, 0)); // base / tray housing
  g.add(box(0.42, 0.52, 0.2, body, 0, 0, -0.09)); // back column
  g.add(box(0.44, 0.15, 0.4, body, 0, 0.38, 0)); // top head
  g.add(box(0.36, 0.035, 0.36, "#4a5060", 0, 0.53, -0.01)); // lid
  g.add(box(0.4, 0.12, 0.02, PAL.steel, 0, 0.395, 0.205)); // control panel
  g.add(box(0.3, 0.018, 0.2, "#aab3c2", 0, 0.06, 0.07)); // drip tray
  for (let i = 0; i < 5; i++) g.add(box(0.26, 0.004, 0.012, "#7d8698", 0, 0.078, -0.01 + i * 0.04));
  g.add(cyl(0.045, 0.05, 0.05, "#5a6070", 32, 0, 0.33, 0.07)); // brew head
  g.add(cyl(0.008, 0.008, 0.03, "#2a2e38", 12, -0.015, 0.305, 0.07));
  g.add(cyl(0.008, 0.008, 0.03, "#2a2e38", 12, 0.015, 0.305, 0.07));
  for (const x of [0.11, 0.155]) {
    const b = cyl(0.016, 0.016, 0.012, "#f2f4f8", 20, x, 0.0, 0);
    b.rotation.x = Math.PI / 2;
    b.position.set(x, 0.405, 0.218);
    g.add(b);
  }
  const screens = { ready: machineScreenTex("ready"), error: machineScreenTex("error") };
  const screenMat = flat("#ffffff", screens.ready);
  const scr = plane(0.15, 0.075, screenMat);
  scr.position.set(-0.07, 0.4, 0.2165);
  g.add(scr);
  const lightMat = new THREE.MeshBasicMaterial({ color: "#3ff08a", toneMapped: false });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.017, 20, 14), lightMat);
  lamp.position.set(0.17, 0.45, 0.215);
  g.add(lamp);
  const steam: THREE.Mesh[] = [];
  if (withMug) {
    const mug = cyl(0.045, 0.042, 0.095, "#ff7a59", 32, 0, 0.078, 0.08);
    g.add(mug);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.01, 10, 24, Math.PI), toon("#ff7a59"));
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.045, 0.125, 0.08);
    g.add(handle);
    for (let i = 0; i < 5; i++) {
      const s = sphere(0.03, "#ffffff", 0, 0.2, 0.08, 20);
      s.castShadow = false;
      steam.push(s);
      g.add(s);
    }
  }
  const smoke: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const s = sphere(0.06, "#5c6170", 0, 0.6, 0, 24);
    s.visible = false;
    s.castShadow = false;
    smoke.push(s);
    g.add(s);
  }
  if (look() === "v2") {
    const label = plane(0.3, 0.075, toon("#ffffff", { map: machineLabelTex(), key: "mlabel" }));
    label.rotation.y = Math.PI / 2;
    label.position.set(0.2115, 0.27, -0.03);
    g.add(label);
    const note = plane(0.08, 0.08, toon("#ffffff", { map: stickyTex(["do not", "kick"], "#ffb3c7"), key: "kick" }));
    note.rotation.set(0, Math.PI / 2, 0.08);
    note.position.set(0.2115, 0.14, 0.06);
    g.add(note);
  }
  shadowed(g);
  return {
    group: g,
    steam,
    smoke,
    setState: (s) => {
      screenMat.map = screens[s];
      lightMat.color.set(s === "ready" ? "#3ff08a" : "#ff3b30");
      if (look() === "v2") {
        // HDR values above 1 so the bloom pass makes them glow
        lightMat.color.multiplyScalar(5);
        screenMat.color.setScalar(s === "ready" ? 1.6 : 2.4);
      }
    },
  };
};

const officeChair = () => {
  const g = new THREE.Group();
  const seat = PAL.chair,
    dark = PAL.chairDark;
  for (let i = 0; i < 5; i++) {
    const leg = box(0.05, 0.035, 0.3, dark, 0, 0.04, 0);
    leg.geometry.translate(0, 0, 0.15);
    leg.position.set(0, 0.0575, 0);
    leg.rotation.y = (i / 5) * Math.PI * 2;
    g.add(leg);
    const a = (i / 5) * Math.PI * 2;
    g.add(sphere(0.03, "#22283a", Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29, 12));
  }
  g.add(cyl(0.03, 0.03, 0.28, dark, 16, 0, 0.07, 0));
  g.add(box(0.5, 0.07, 0.48, seat, 0, 0.35, 0));
  const back = box(0.46, 0.48, 0.07, seat, 0, 0.5, -0.24);
  back.rotation.x = -0.08;
  g.add(back);
  g.add(box(0.06, 0.2, 0.05, dark, 0, 0.36, -0.25));
  return shadowed(g);
};

const desk = (cx: number, cz: number, drawerSide: number) => {
  const g = new THREE.Group();
  g.add(box(1.4, 0.05, 0.76, PAL.deskTop, 0, 0.7, 0));
  g.add(box(0.04, 0.7, 0.7, PAL.deskSide, -0.66, 0, 0));
  g.add(box(0.04, 0.7, 0.7, PAL.deskSide, 0.66, 0, 0));
  g.add(box(1.28, 0.4, 0.03, PAL.deskSide, 0, 0.28, 0));
  // drawer unit flush with the outer side panel, so a seated or standing person's arms clear it
  const dx = drawerSide * 0.47;
  g.add(box(0.34, 0.62, 0.6, "#c9d3e6", dx, 0.04, -0.05 * drawerSide));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.3, 0.17, 0.02, "#d9e1ef", dx, 0.08 + i * 0.195, 0.255));
    g.add(box(0.1, 0.02, 0.025, "#3d4a6e", dx, 0.2 + i * 0.195, 0.27));
  }
  g.position.set(cx, 0, cz);
  return shadowed(g);
};

const monitor = (screen: THREE.Texture) => {
  const g = new THREE.Group();
  g.add(box(0.22, 0.015, 0.16, PAL.screenBezel, 0, 0, 0));
  g.add(box(0.05, 0.1, 0.035, PAL.screenBezel, 0, 0.01, -0.02));
  g.add(box(0.62, 0.4, 0.035, PAL.screenBezel, 0, 0.095, 0));
  const sm = flat("#ffffff", screen);
  if (look() === "v2") sm.color.setScalar(1.15);
  const s = plane(0.58, 0.36, sm);
  s.position.set(0, 0.295, 0.0185);
  g.add(s);
  return shadowed(g);
};

const plant = (x: number, y: number, z: number, scale = 1) => {
  const g = new THREE.Group();
  g.add(cyl(0.13, 0.1, 0.26, "#f2efe8", 24, 0, 0, 0));
  g.add(cyl(0.12, 0.12, 0.02, "#6b4a32", 24, 0, 0.24, 0));
  const r = rng(Math.round(x * 100 + z * 10));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r();
    const leaf = sphere(0.09 + r() * 0.04, i % 2 ? "#3fae6a" : "#2f9a5c", Math.sin(a) * 0.1, 0.36 + r() * 0.25, Math.cos(a) * 0.1, 16);
    leaf.scale.set(0.8, 1.35, 0.8);
    g.add(leaf);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  return shadowed(g);
};

export type World = {
  scene: THREE.Scene;
  machine: Machine;
  tableMachine: Machine;
  chars: Record<"mika" | "ravi" | "june" | "otto", Character>;
  chairs: Record<"mika" | "ravi" | "june" | "otto", THREE.Group>;
  meetChairs: THREE.Group[];
  heldMug: THREE.Group;
  calendar: ReturnType<typeof makeCalendar>;
  clock: { hour: THREE.Object3D; minute: THREE.Object3D; second: THREE.Object3D };
  wisp: THREE.Mesh[];
  lights: { hemi: THREE.HemisphereLight; key: THREE.DirectionalLight; warm: THREE.PointLight; meet: THREE.PointLight };
  windowMat: THREE.MeshBasicMaterial;
  windowTex: { day: THREE.Texture; dawn: THREE.Texture | null };
};

export const buildWorld = (): World => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dfe9f7");

  // ---- lights ----
  const hemi = new THREE.HemisphereLight("#ffffff", "#8a98d6", 2.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#fff3df", 2.4);
  key.position.set(-3, 9, -11);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = -11;
  sc.right = 11;
  sc.top = 11;
  sc.bottom = -11;
  sc.near = 1;
  sc.far = 30;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const warm = new THREE.PointLight("#ffd29a", 6, 5, 1.6);
  warm.position.set(-6.0, 2.1, -4.6);
  scene.add(warm);
  const meet = new THREE.PointLight("#f4fbff", 7, 7, 1.4);
  meet.position.set(5.5, 2.6, -2.8);
  scene.add(meet);

  // ---- shell ----
  const floor = plane(16, 12, toon("#ffffff", { map: carpetTex(), key: "carpet" }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ceil = plane(16, 12, toon("#ffffff", { map: ceilingTex(), key: "ceiling" }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 3.0;
  scene.add(ceil);
  for (const [x, z] of [
    [-5, -3],
    [-1.5, -3],
    [-5, 1.2],
    [-1.5, 1.2],
    [-3.2, 4],
    [5.5, -3.2],
    [1.5, 3],
  ]) {
    const p = plane(1.2, 0.6, flat("#ffffff"));
    if (look() === "v2") (p.material as THREE.MeshBasicMaterial).color.setScalar(2.2);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, 2.985, z);
    scene.add(p);
  }
  const wall = PAL.wall;
  // back wall z = −6 with a long window x −7.6 … 2.6, y 1.2 … 2.6
  scene.add(box(10.2, 1.2, 0.2, wall, -2.5, 0, -6.1));
  scene.add(box(10.2, 0.4, 0.2, wall, -2.5, 2.6, -6.1));
  scene.add(box(0.4, 3, 0.2, wall, -7.8, 0, -6.1));
  scene.add(box(5.4, 3, 0.2, PAL.meetWall, 5.3, 0, -6.1));
  const dayTex = cityTex();
  const windowMat = flat("#ffffff", dayTex);
  const city = plane(10.2, 1.4, windowMat);
  city.position.set(-2.5, 1.9, -6.35);
  scene.add(city);
  for (let x = -7.6; x <= 2.61; x += 2.04) scene.add(box(0.08, 1.4, 0.12, "#f7f9fc", x, 1.2, -6.0));
  scene.add(box(10.2, 0.06, 0.16, "#f7f9fc", -2.5, 1.17, -5.98));
  scene.add(box(10.2, 0.05, 0.12, "#f7f9fc", -2.5, 2.58, -6.0));
  // side walls
  scene.add(box(0.2, 3, 12, wall, -8.1, 0, 0));
  scene.add(box(0.2, 3, 6.5, wall, 8.1, 0, 2.75));
  const mint = toon("#ffffff", { map: tileWallTex(5.5, 3), key: "mintR" });
  const rightMeet = box(0.2, 3, 5.5, mint, 8.1, 0, -3.25);
  scene.add(rightMeet);
  const backMeet = plane(5.0, 3, toon("#ffffff", { map: tileWallTex(5, 3), key: "mintB" }));
  backMeet.position.set(5.5, 1.5, -5.995);
  scene.add(backMeet);
  // teal stripe
  scene.add(box(0.03, 0.08, 12, PAL.wallStripe, -7.99, 0.96, 0));
  scene.add(box(10.2, 0.08, 0.03, PAL.wallStripe, -2.5, 0.96, -5.99));
  scene.add(box(0.03, 0.08, 6.5, PAL.wallStripe, 7.99, 0.96, 2.75));
  // skirting
  scene.add(box(0.03, 0.1, 12, "#c9d2e3", -7.985, 0, 0));
  scene.add(box(10.2, 0.1, 0.03, "#c9d2e3", -2.5, 0, -5.985));

  // ---- coffee corner ----
  scene.add(box(3.2, 0.9, 0.7, "#f4f6fa", -6.2, 0, -5.65));
  for (let i = 0; i < 4; i++) {
    scene.add(box(0.76, 0.78, 0.02, "#e8ecf3", -7.4 + i * 0.8, 0.05, -5.29));
    scene.add(box(0.02, 0.16, 0.025, "#3d4a6e", -7.1 + i * 0.8, 0.6, -5.27));
  }
  const v2 = look() === "v2";
  scene.add(box(3.24, 0.05, 0.74, v2 ? toon("#ffffff", { map: woodTex(PAL.wood, 31, [2, 1]), key: "woodCounter" }) : PAL.wood, -6.2, 0.9, -5.65));
  if (v2) scene.add(box(0.62, 0.012, 0.5, "#1f6a6a", -6.2, 0.95, -5.58));
  const machine = buildMachine(true);
  machine.group.position.set(-6.2, v2 ? 0.962 : 0.95, -5.62);
  scene.add(machine.group);
  // counter dressing
  scene.add(cyl(0.12, 0.12, 0.3, "#e9eef6", 28, -7.2, 0.95, -5.6)); // canister
  scene.add(cyl(0.1, 0.1, 0.03, "#3d4a6e", 28, -7.2, 1.25, -5.6));
  for (const [x, col] of [
    [-5.35, "#2bb3a3"],
    [-5.2, "#f2b632"],
    [-5.05, "#9b8cf2"],
  ] as const)
    scene.add(cyl(0.04, 0.037, 0.085, col, 24, x, 0.95, -5.45));
  scene.add(plant(-4.85, 0.95, -5.7, 0.7));
  const sticky = plane(0.12, 0.12, toon("#ffffff", { map: stickyTex(["no", "decaf"], "#fff27a"), key: "stk1" }));
  sticky.position.set(-6.75, 1.3, -5.98);
  scene.add(sticky);

  // ---- desks ----
  scene.add(desk(-3.0, -0.95, 1), desk(-1.5, -0.95, -1), desk(-3.0, -0.19, -1), desk(-1.5, -0.19, 1));
  const calendar = makeCalendar();
  const mon = (tex: THREE.Texture, x: number, z: number, rotY: number) => {
    const m = monitor(tex);
    m.position.set(x, 0.75, z);
    m.rotation.y = rotY;
    scene.add(m);
    return m;
  };
  mon(calendar.tex, -2.72, -0.72, Math.PI); // Mika's, facing −z towards her
  mon(workScreenTex(2), -1.3, -0.72, Math.PI);
  mon(workScreenTex(3), -3.2, -0.42, 0);
  mon(workScreenTex(5), -1.7, -0.42, 0);
  for (const [x, z, r] of [
    [-2.85, -1.15, 0],
    [-1.4, -1.15, 0],
    [-3.1, 0.02, Math.PI],
    [-1.6, 0.02, Math.PI],
  ]) {
    const k = box(0.42, 0.02, 0.14, "#e9edf5", x, 0.75, z);
    k.rotation.y = r;
    scene.add(k);
  }
  scene.add(cyl(0.04, 0.037, 0.085, "#f2b632", 24, -3.55, 0.75, 0.05));
  scene.add(plant(-1.0, 0.75, -0.6, 0.55));
  scene.add(plant(-3.55, 0.75, -0.55, 0.5));
  const n2 = plane(0.09, 0.09, toon("#ffffff", { map: stickyTex(["call", "IT"], "#9fe6c5"), key: "stk2" }));
  n2.position.set(-1.6, 1.2, -0.39);
  scene.add(n2);

  // ---- characters + office chairs ----
  const chars = {
    mika: buildCharacter(CAST.mika),
    ravi: buildCharacter(CAST.ravi),
    june: buildCharacter(CAST.june),
    otto: buildCharacter(CAST.otto),
  };
  const chairs = { mika: officeChair(), ravi: officeChair(), june: officeChair(), otto: officeChair() };
  for (const k of Object.keys(chars) as (keyof typeof chars)[]) scene.add(chars[k].root, chairs[k]);
  // Mika's mug lives in her right hand
  const heldMug = new THREE.Group();
  heldMug.add(cyl(0.05, 0.046, 0.11, "#ff7a59", 32, 0, -0.04, 0));
  const hh = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.011, 10, 24, Math.PI), toon("#ff7a59"));
  hh.rotation.z = -Math.PI / 2;
  hh.position.set(0.05, 0.015, 0);
  heldMug.add(hh);
  heldMug.add(cyl(0.042, 0.042, 0.004, "#5a3826", 24, 0, 0.062, 0));
  shadowed(heldMug);
  chars.mika.rHand.add(heldMug);

  // ---- left wall dressing ----
  const cab = (z: number) => {
    scene.add(box(0.5, 1.0, 0.9, PAL.cabinet, -7.75, 0, z));
    for (let i = 0; i < 3; i++) {
      scene.add(box(0.02, 0.28, 0.82, "#f59060", -7.49, 0.06 + i * 0.32, z));
      scene.add(box(0.025, 0.03, 0.2, "#3d4a6e", -7.47, 0.26 + i * 0.32, z));
    }
  };
  cab(1.2);
  cab(2.15);
  // bookshelf with binders
  scene.add(box(0.4, 2.0, 1.4, "#f4f6fa", -7.8, 0, -3.0));
  const bc = ["#e0413a", "#2346d6", "#f2b632", "#2bb3a3", "#9b8cf2", "#ff7a6b", "#3fae6a"];
  const br = rng(21);
  for (let s = 0; s < 4; s++) {
    scene.add(box(0.36, 0.03, 1.3, "#dfe5ef", -7.78, 0.05 + s * 0.48, -3.0));
    let z = -3.6;
    while (z < -2.4) {
      const w = 0.07 + br() * 0.04;
      const h = 0.3 + br() * 0.1;
      scene.add(box(0.28, h, w, bc[Math.floor(br() * bc.length)], -7.75, 0.08 + s * 0.48, z + w / 2));
      z += w + 0.012;
    }
  }
  const cork = plane(1.6, 1.0, toon("#ffffff", { map: corkTex(), key: "cork" }));
  cork.rotation.y = Math.PI / 2;
  cork.position.set(-7.98, 1.75, -0.6);
  scene.add(cork);
  scene.add(box(0.04, 1.06, 1.66, "#9c6236", -8.0, 1.22, -0.6));
  scene.add(plant(-7.5, 0, -4.6, 1.3));
  scene.add(plant(-7.45, 0, 3.4, 1.4));
  scene.add(plant(2.4, 0, -5.4, 1.3));

  // ---- meeting room ----
  const frameCol = "#f3f6fb";
  const glassMat = new THREE.MeshBasicMaterial({ color: PAL.glass, transparent: true, opacity: 0.16, depthWrite: false });
  const glassPane = (w: number, x: number, z: number, rotY: number) => {
    const p = plane(w, 2.7, glassMat);
    p.position.set(x, 1.38, z);
    p.rotation.y = rotY;
    p.userData.noGbuffer = true;
    p.castShadow = false;
    scene.add(p);
  };
  // front partition z = −0.5, x 3 … 8
  scene.add(box(5.0, 0.08, 0.08, frameCol, 5.5, 0, -0.5), box(5.0, 0.08, 0.08, frameCol, 5.5, 2.72, -0.5));
  for (const x of [3.04, 4.3, 5.55, 6.8, 7.96]) scene.add(box(0.07, 2.8, 0.08, frameCol, x, 0, -0.5));
  glassPane(5, 5.5, -0.5, 0);
  // side partition x = 3, z −6 … −1.6, door gap −1.6 … −0.5
  scene.add(box(0.08, 0.08, 4.4, frameCol, 3.0, 0, -3.8), box(0.08, 0.08, 5.5, frameCol, 3.0, 2.72, -3.25));
  for (const z of [-5.96, -4.5, -3.05, -1.62]) scene.add(box(0.08, 2.8, 0.07, frameCol, 3.0, 0, z));
  glassPane(4.4, 3.0, -3.8, Math.PI / 2);
  const sign = plane(0.9, 0.225, toon("#ffffff", { map: signTex("MEETING ROOM"), key: "sign" }));
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(2.95, 2.3, -2.3);
  scene.add(sign);
  // table
  scene.add(box(2.6, 0.06, 1.2, v2 ? toon("#ffffff", { map: woodTex(PAL.wood, 57, [1.5, 1]), key: "woodTable" }) : PAL.wood, 5.5, 0.69, -3.3));
  scene.add(box(0.08, 0.69, 0.9, PAL.woodDark, 4.6, 0, -3.3), box(0.08, 0.69, 0.9, PAL.woodDark, 6.4, 0, -3.3));
  const meetChairs: THREE.Group[] = [];
  for (const [x, z, r] of [
    [4.8, -2.45, Math.PI],
    [6.2, -2.45, Math.PI],
    [4.8, -4.15, 0],
    [6.2, -4.15, 0],
  ]) {
    const c = officeChair();
    c.position.set(x, 0, z);
    c.rotation.y = r;
    scene.add(c);
    meetChairs.push(c);
  }
  const tableMachine = buildMachine(false);
  tableMachine.group.position.set(5.5, 0.75, -3.6);
  tableMachine.group.rotation.y = -0.64;
  tableMachine.setState("error");
  scene.add(tableMachine.group);
  const wisp: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const s = sphere(0.035, "#7a7f8c", 5.5, 1.35, -3.3, 18);
    s.castShadow = false;
    wisp.push(s);
    scene.add(s);
  }
  // notebooks + mugs on the table
  for (const [x, z, col] of [
    [4.75, -2.85, "#2346d6"],
    [6.25, -2.85, "#f2b632"],
    [4.75, -3.75, "#ff7a6b"],
    [6.25, -3.75, "#3fae6a"],
  ] as const) {
    const nb = box(0.24, 0.02, 0.3, col, x, 0.75, z);
    nb.rotation.y = 0.15;
    scene.add(nb);
  }
  // whiteboard on x = 7.95
  scene.add(box(0.04, 1.16, 1.86, "#c6ccd8", 7.97, 0.97, -3.3));
  const wb = plane(1.8, 1.1, toon("#ffffff", { map: whiteboardTex(), key: "wb" }));
  wb.rotation.y = -Math.PI / 2;
  wb.position.set(7.945, 1.55, -3.3);
  scene.add(wb);
  scene.add(box(0.08, 0.03, 1.2, "#aab3c2", 7.9, 0.98, -3.3));
  scene.add(plant(7.5, 0, -5.5, 1.2));

  // clock on the back wall
  const clockG = new THREE.Group();
  clockG.position.set(5.5, 2.2, -5.95);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 16, 64), toon("#22306b"));
  rim.position.z = 0.03;
  clockG.add(rim);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 64), toon("#22306b"));
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.015;
  clockG.add(body);
  const faceM = new THREE.Mesh(new THREE.CircleGeometry(0.315, 64), toon("#ffffff", { map: clockFaceTex(), key: "clock" }));
  faceM.position.z = 0.0415;
  clockG.add(faceM);
  const hand = (len: number, w: number, col: string, z: number) => {
    const pivot = new THREE.Group();
    pivot.position.z = z;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.008), toon(col));
    m.position.y = len / 2 - 0.03;
    pivot.add(m);
    clockG.add(pivot);
    return pivot;
  };
  const hour = hand(0.19, 0.032, "#141827", 0.05);
  const minute = hand(0.27, 0.022, "#141827", 0.058);
  const second = hand(0.29, 0.009, "#e0413a", 0.066);
  const capS = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 24), toon("#e0413a"));
  capS.rotation.x = Math.PI / 2;
  capS.position.z = 0.07;
  clockG.add(capS);
  shadowed(clockG);
  scene.add(clockG);

  return {
    scene,
    machine,
    tableMachine,
    chars,
    chairs,
    meetChairs,
    heldMug,
    calendar,
    clock: { hour, minute, second },
    wisp,
    lights: { hemi, key, warm, meet },
    windowMat,
    windowTex: { day: dayTex, dawn: v2 ? dawnCityTex() : null },
  };
};

// WhatIfNoPain — the world: the kit OFFICE set (desks, coffee counter, meeting room) + a FIRST-AID ROOM at x = 30 and
// a STAIRWELL at x = −30, Dr. Noor (original), and every prop/sprite of the approved 13-shot list
// (script.txt). Metres, y up, +z towards the front.
import * as THREE from "three";
import { box, cyl, fill, flat, INK, PAL, plane, shadowed, sphere, toon } from "../../kit/lib";
import { buildCharacter, CAST, Character } from "../../kit/character";
import { HAND_FONT, makeCanvas, MARKER_FONT, rr, toTex, UI_FONT } from "../../kit/textures";
import { buildWorld as buildOffice } from "../../kit/sets/office";
import { OVERLAY_LAYER } from "../../kit/engine";
import type { KitLights } from "../../kit/looks";

export const FA = new THREE.Vector3(30, 0, 0); // first-aid room origin
export const ST = new THREE.Vector3(-30, 0, 0); // stairwell origin
export const STEP = { run: 0.32, rise: 0.18, count: 11, x0: -32.6, z: -0.75 };
/** Height of the stair tread under world x (0 before the stairs, the landing after). */
export const stairY = (x: number) => {
  const i = Math.floor((x - STEP.x0) / STEP.run);
  return Math.max(0, Math.min(STEP.count, i + 1)) * STEP.rise * (x < STEP.x0 ? 0 : 1);
};

// ---------- canvas textures ----------
const tileTex = () => {
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = "#eef4f2";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(60,120,110,0.22)";
  g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 256);
  const t = toTex(c, [12, 12]);
  return t;
};

const coatTex = () => {
  // capsule UVs (three r186): front at u = 0.25 → offset 0.25; top cap ≈ y 0–176 of 512
  const { c, g } = makeCanvas(1024, 512);
  g.fillStyle = "#f4f6fb";
  g.fillRect(0, 0, 1024, 512);
  const cx = 512;
  g.fillStyle = "#2f8f83"; // teal scrubs in the V
  g.beginPath();
  g.moveTo(cx - 110, 95);
  g.lineTo(cx, 240);
  g.lineTo(cx + 110, 95);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 11;
  g.lineCap = "round";
  g.beginPath(); // lapels + front opening
  g.moveTo(cx - 140, 95);
  g.lineTo(cx - 20, 250);
  g.lineTo(cx - 20, 500);
  g.moveTo(cx + 140, 95);
  g.lineTo(cx + 20, 250);
  g.stroke();
  g.strokeRect(cx - 230, 300, 120, 90); // pockets
  g.strokeRect(cx + 110, 300, 120, 90);
  g.fillStyle = "#3d6be0"; // pen in the chest pocket
  g.fillRect(cx + 150, 190, 12, 70);
  g.strokeRect(cx + 120, 230, 90, 60);
  const t = toTex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.offset.x = 0.25;
  return t;
};

/** A billboard sprite drawn in 2D with its own ink outline (kept out of the outline/DOF buffers). */
const spriteTex = (draw: (g: CanvasRenderingContext2D) => void) => {
  const { c, g } = makeCanvas(512, 512);
  g.clearRect(0, 0, 512, 512);
  g.lineJoin = "round";
  g.lineCap = "round";
  draw(g);
  return toTex(c);
};
const starPath = (g: CanvasRenderingContext2D, n: number, r1: number, r2: number) => {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    g.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r);
  }
  g.closePath();
};
const impactTex = () =>
  spriteTex((g) => {
    starPath(g, 9, 235, 120);
    g.fillStyle = "#ffd23f";
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 22;
    g.stroke();
    starPath(g, 9, 140, 75);
    g.fillStyle = "#fff6c9";
    g.fill();
  });
const boltTex = (col: string) =>
  spriteTex((g) => {
    g.beginPath();
    g.moveTo(300, 20);
    g.lineTo(140, 280);
    g.lineTo(250, 280);
    g.lineTo(190, 490);
    g.lineTo(380, 200);
    g.lineTo(265, 200);
    g.lineTo(330, 20);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 20;
    g.stroke();
  });
const warnTex = () =>
  spriteTex((g) => {
    g.beginPath();
    g.moveTo(256, 40);
    g.lineTo(480, 450);
    g.lineTo(32, 450);
    g.closePath();
    g.fillStyle = "#ffcc2e";
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 24;
    g.stroke();
    g.fillStyle = INK;
    g.font = `800 300px ${UI_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("!", 256, 300);
  });
/** White curly steam wisp with a soft blue-grey edge (a billboard that rises and fades). */
const wispTex = () =>
  spriteTex((g) => {
    const path = () => {
      g.beginPath();
      g.moveTo(250, 495);
      g.bezierCurveTo(140, 400, 370, 330, 256, 250);
      g.bezierCurveTo(150, 170, 340, 100, 268, 22);
    };
    path();
    g.strokeStyle = "#8f9bb8";
    g.lineWidth = 64;
    g.stroke();
    path();
    g.strokeStyle = "#ffffff";
    g.lineWidth = 40;
    g.stroke();
  });
/** Soft round puff, no outline (smoke, frost vapour, the sizzle at a hot palm). Tint it with the material colour. */
const puffTex = () =>
  spriteTex((g) => {
    const r = g.createRadialGradient(256, 256, 10, 256, 256, 245);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.55, "rgba(255,255,255,0.8)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.beginPath();
    g.arc(256, 256, 250, 0, Math.PI * 2);
    g.fill();
  });
/** Dashed red outline where the bell's clapper should be. */
const ghostTex = () =>
  spriteTex((g) => {
    g.setLineDash([52, 34]);
    for (const [col, w] of [
      ["#1d2a44", 44],
      ["#ffffff", 26],
    ] as const) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.arc(256, 256, 200, 0, Math.PI * 2);
      g.stroke();
    }
  });
/** Red throb arcs "(( ))" around a swollen ankle. */
const throbTex = () =>
  spriteTex((g) => {
    g.strokeStyle = "#e0413a";
    g.lineWidth = 26;
    for (const a0 of [0, Math.PI])
      for (const r of [150, 215]) {
        g.beginPath();
        g.arc(256, 256, r, a0 - 0.55, a0 + 0.55);
        g.stroke();
      }
  });
/** Three wavy heat lines rising (cartoon "this is hot"). */
const heatTex = () =>
  spriteTex((g) => {
    g.strokeStyle = "#ff5a2a";
    g.lineWidth = 26;
    for (const x of [150, 256, 362]) {
      g.beginPath();
      for (let y = 470; y >= 60; y -= 10) {
        const k = (470 - y) / 410;
        g.lineTo(x + 34 * Math.sin(k * Math.PI * 3 + x), y);
      }
      g.stroke();
    }
  });
const makeSprite = (tex: THREE.Texture, size: number, onTop = true) => {
  // onTop: on the engine's OVERLAY layer — drawn last, over everything and sharp (no outline/DOF/bloom), so a panel,
  // a shin or hair never cuts an impact star, bolt or warning sign
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: !onTop, toneMapped: false }));
  if (onTop) m.layers.set(OVERLAY_LAYER);
  m.userData.noGbuffer = true;
  m.userData.noCollide = true;
  m.renderOrder = 5;
  m.visible = false;
  return m;
};

const signTexture = (lines: string[], w: number, h: number, col = "#e0413a") => {
  const { c, g } = makeCanvas(w, h);
  g.fillStyle = "#ffffff";
  rr(g, 8, 8, w - 16, h - 16, 26);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 14;
  g.stroke();
  g.fillStyle = col;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const size = Math.min(130, (h * 0.62) / lines.length);
  g.font = `800 ${size}px ${UI_FONT}`;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.08));
  return toTex(c);
};

const posterTex = () => {
  const { c, g } = makeCanvas(600, 850);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 600, 850);
  g.fillStyle = "#2f8f83";
  g.fillRect(0, 0, 600, 120);
  g.strokeStyle = INK;
  g.lineWidth = 14;
  g.strokeRect(7, 7, 586, 836);
  g.fillStyle = "#ffffff";
  g.font = `800 64px ${UI_FONT}`;
  g.textAlign = "center";
  g.fillText("HEALTH", 300, 84);
  g.fillStyle = "#1d2a44";
  g.font = `800 62px ${UI_FONT}`;
  ["Congenital", "insensitivity", "to pain"].forEach((l, i) => g.fillText(l, 300, 230 + i * 74));
  // nerve icon: hand → line → brain
  g.strokeStyle = "#3d6be0";
  g.lineWidth = 12;
  g.beginPath();
  g.arc(150, 620, 50, 0, Math.PI * 2);
  g.moveTo(200, 620);
  g.bezierCurveTo(300, 560, 340, 700, 420, 620);
  g.stroke();
  g.fillStyle = "#ff8fa3";
  g.beginPath();
  g.ellipse(470, 610, 60, 48, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 8;
  g.stroke();
  return toTex(c);
};

/** Meeting-room whiteboard: line 1 is written, then line 2 (p 0→0.69), then a bandaged big toe is drawn (0.71→0.97),
 *  kept in the upper two-thirds so the captions never cover it. */
const makeBoard = () => {
  const { c, g } = makeCanvas(1800, 1100);
  const tex = toTex(c);
  const k = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const draw = (p: number) => {
    g.fillStyle = "#fbfcfe";
    g.fillRect(0, 0, 1800, 1100);
    g.fillStyle = "#1d2a6b";
    g.font = `150px ${MARKER_FONT}`;
    const line = (txt: string, y: number, q: number) => {
      if (q <= 0) return;
      g.save();
      g.beginPath();
      g.rect(0, y - 170, 120 + (g.measureText(txt).width + 30) * q, 230);
      g.clip();
      g.fillText(txt, 120, y);
      g.restore();
    };
    line("What if you stopped", 290, k(p, 0, 0.39));
    line("feeling pain?", 460, k(p, 0.4, 0.69));
    const q = k(p, 0.71, 0.97);
    if (q > 0) {
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "#1d2a6b";
      g.lineWidth = 14;
      // a bare foot seen from above: sole outline, then five toes (big toe on the left), then a plaster on the big toe
      g.beginPath();
      g.moveTo(1235, 600);
      g.bezierCurveTo(1200, 760, 1290, 900, 1420, 905);
      g.bezierCurveTo(1560, 905, 1640, 780, 1615, 610);
      g.stroke();
      const toes: [number, number, number][] = [
        [1270, 540, 62],
        [1385, 520, 42],
        [1470, 528, 37],
        [1543, 548, 33],
        [1603, 580, 28],
      ];
      toes.forEach(([x, y, r], i) => {
        if (q < 0.25 + i * 0.07) return;
        g.beginPath();
        g.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
        g.stroke();
      });
      if (q > 0.75) {
        g.save(); // plaster across the big toe, with a red cross
        g.translate(1270, 548);
        g.rotate(-0.2);
        g.fillStyle = "#ffffff";
        rr(g, -88, -30, 176, 60, 24);
        g.fill();
        g.stroke();
        g.strokeStyle = "#e0413a";
        g.lineWidth = 14;
        g.beginPath();
        g.moveTo(-18, 0);
        g.lineTo(18, 0);
        g.moveTo(0, -18);
        g.lineTo(0, 18);
        g.stroke();
        g.restore();
      }
    }
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
};

/** Lightbox films: "nerve" (dot travels hand → brain, fades halfway), "torso" (appendix glows), "foot" (crack draws). */
export type Film = "nerve" | "torso" | "foot";
const makeFilms = () => {
  const { c, g } = makeCanvas(1200, 820);
  const tex = toTex(c);
  const bg = () => {
    const grd = g.createLinearGradient(0, 0, 0, 820);
    grd.addColorStop(0, "#2b4c9a");
    grd.addColorStop(1, "#1d3577");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1200, 820);
  };
  const bone = "#eef4ff";
  const draw = (film: Film, p: number, pulse = 0) => {
    bg();
    g.lineCap = "round";
    g.lineJoin = "round";
    if (film === "nerve") {
      // outline figure: head, spine, arm to hand
      g.strokeStyle = "rgba(238,244,255,0.85)";
      g.lineWidth = 14;
      g.beginPath();
      g.arc(820, 190, 95, 0, Math.PI * 2); // head
      g.moveTo(820, 285);
      g.lineTo(820, 700); // spine
      g.moveTo(820, 360);
      g.quadraticCurveTo(560, 420, 300, 560); // arm
      g.stroke();
      g.fillStyle = "rgba(238,244,255,0.85)";
      g.beginPath();
      g.arc(270, 580, 52, 0, Math.PI * 2); // hand
      g.fill();
      // nerve path in glowing cyan
      const path = (t: number): [number, number] => {
        // hand → shoulder → up the neck → brain
        if (t < 0.55) {
          const k = t / 0.55;
          const x = 270 + (820 - 270) * k;
          const y = 580 + (360 - 580) * k - Math.sin(k * Math.PI) * 60;
          return [x, y];
        }
        const k = (t - 0.55) / 0.45;
        return [820, 360 - 170 * k];
      };
      g.strokeStyle = "#5fe6ff";
      g.lineWidth = 6;
      g.setLineDash([16, 14]);
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const [x, y] = path(i / 40);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.setLineDash([]);
      // the signal: a bright dot that fades out halfway
      const t = Math.min(1, p);
      const alpha = t < 0.35 ? 1 : Math.max(0, 1 - (t - 0.35) / 0.2);
      if (alpha > 0) {
        const [x, y] = path(t);
        g.fillStyle = `rgba(255,220,90,${alpha})`;
        g.beginPath();
        g.arc(x, y, 30, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(255,255,255,${alpha})`;
        g.beginPath();
        g.arc(x, y, 13, 0, Math.PI * 2);
        g.fill();
      }
      if (t > 0.55) {
        // brain stays dark: a grey "?" where the signal should arrive
        g.fillStyle = "rgba(238,244,255,0.9)";
        g.font = `800 130px ${UI_FONT}`;
        g.textAlign = "center";
        g.fillText("?", 820, 235);
      }
    } else if (film === "torso") {
      g.strokeStyle = bone;
      g.lineWidth = 14;
      g.beginPath(); // torso outline
      g.moveTo(420, 90);
      g.quadraticCurveTo(330, 420, 400, 760);
      g.moveTo(780, 90);
      g.quadraticCurveTo(870, 420, 800, 760);
      g.stroke();
      g.lineWidth = 9; // ribs
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.ellipse(600, 170 + i * 50, 170 - i * 6, 40, 0, Math.PI * 0.05, Math.PI * 0.95);
        g.stroke();
      }
      g.lineWidth = 16; // gut loops
      g.strokeStyle = "rgba(238,244,255,0.55)";
      g.beginPath();
      g.ellipse(600, 560, 150, 110, 0, 0, Math.PI * 2);
      g.stroke();
      // appendix (lower right of the body = viewer's left): a big red worm that glows and pulses with p
      const glow = 0.55 + 0.45 * Math.min(1, p) * (0.75 + 0.25 * Math.sin(p * 24));
      g.fillStyle = `rgba(255,40,40,${glow})`;
      g.beginPath();
      g.ellipse(455, 650, 48, 100, 0.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#ffffff";
      g.lineWidth = 8;
      g.stroke();
      if (p > 0.1) {
        g.strokeStyle = `rgba(255,90,80,${0.7 * glow})`;
        g.lineWidth = 22;
        g.beginPath();
        g.arc(455, 650, 140 + 30 * Math.sin(p * 12), 0, Math.PI * 2);
        g.stroke();
      }
    } else {
      // foot X-ray, toes up; crack draws across the big toe's first bone as p → 1
      g.fillStyle = bone;
      g.strokeStyle = "rgba(255,255,255,0.9)";
      const bonePill = (x: number, y: number, w: number, h: number, a = 0) => {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        rr(g, -w / 2, -h / 2, w, h, Math.min(w, h) / 2);
        g.fill();
        g.restore();
      };
      bonePill(600, 650, 260, 170); // heel/midfoot mass
      const toes = [
        [470, 0.32, 70],
        [550, 0.12, 54],
        [620, -0.02, 50],
        [690, -0.15, 46],
        [755, -0.28, 42],
      ] as const;
      toes.forEach(([x, a, w], i) => {
        bonePill(x, 470, w, 170, a); // metatarsal
        bonePill(x - Math.sin(a) * 140, 305, w * 0.9, 95, a); // proximal phalanx
        bonePill(x - Math.sin(a) * 210, 230, w * 0.85, i === 0 ? 70 : 55, a); // tip
      });
      // crack across the big toe's proximal phalanx: thick, bright, glowing; then the toe pulses red (pulse 0→1)
      const k = Math.min(1, Math.max(0, p));
      if (k > 0) {
        if (k >= 1 && pulse > 0) {
          const halo = g.createRadialGradient(428, 300, 20, 428, 300, 150);
          halo.addColorStop(0, `rgba(255,70,60,${0.55 * pulse})`);
          halo.addColorStop(1, "rgba(255,70,60,0)");
          g.fillStyle = halo;
          g.fillRect(250, 120, 360, 360);
        }
        const pts: [number, number][] = [
          [384, 268],
          [418, 300],
          [400, 318],
          [446, 340],
          [432, 356],
          [476, 372],
        ];
        const n = Math.max(1, Math.round(k * (pts.length - 1) * 10));
        const crack = (w: number, col: string, blur: number) => {
          g.save();
          g.shadowColor = "#ff2a1f";
          g.shadowBlur = blur;
          g.strokeStyle = col;
          g.lineWidth = w;
          g.beginPath();
          for (let s = 0; s <= n; s++) {
            const u = (s / ((pts.length - 1) * 10)) * (pts.length - 1);
            const i = Math.min(pts.length - 2, Math.floor(u));
            const f = u - i;
            const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
            const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
            s ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.stroke();
          g.restore();
        };
        crack(22, "#ff3b30", 40);
        crack(7, "#ffe0d6", 0);
      }
    }
    tex.needsUpdate = true;
  };
  draw("nerve", 0);
  return { tex, draw };
};

// ---------- props ----------
const mug = (col: string) => {
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.046, 0.11, col, 32, 0, -0.04, 0));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.011, 10, 24, Math.PI), toon(col));
  h.rotation.z = -Math.PI / 2;
  h.position.set(0.05, 0.015, 0);
  g.add(h);
  const coffee = cyl(0.043, 0.043, 0.004, "#5a3826", 24, 0, 0.0, 0);
  coffee.name = "coffee";
  g.add(coffee);
  return shadowed(g);
};

export type World = {
  scene: THREE.Scene;
  lights: KitLights;
  setSky: (sky: "day" | "dawn") => void;
  cast: { mika: Character; ravi: Character; june: Character; otto: Character; noor: Character };
  seats: THREE.Object3D[];
  office: ReturnType<typeof buildOffice>;
  board: ReturnType<typeof makeBoard>;
  films: ReturnType<typeof makeFilms>;
  screenMat: THREE.MeshBasicMaterial;
  /** the meeting room's front-partition posts (z −0.5): hidden in the flu-shot shot so no post skewers a head */
  frontPosts: THREE.Mesh[];
  /** Hand props live in WORLD space (render review 2026-10-26): shots place them, then put the hands on their
   *  userData.grip points with poseReach(), so a hand always grips from the outside. */
  props: {
    heldMug: THREE.Group;
    can: THREE.Group;
    phone: THREE.Group;
    syringe: THREE.Group;
    pot: THREE.Group;
    potSteam: THREE.Mesh[];
    sizzle: THREE.Mesh[];
    heat: THREE.Mesh[];
    mitt: THREE.Group;
    pourTable: THREE.Group;
    teamMugs: THREE.Group[];
    stream: THREE.Mesh;
    sandwichM: THREE.Group;
    sandwichJ: THREE.Group;
    napkin: THREE.Group;
    drop: THREE.Mesh;
    folders: THREE.Group;
    ankle: THREE.Mesh;
    hand: THREE.Group;
    blisters: THREE.Mesh[];
    bell: THREE.Group;
    smoke: THREE.Mesh[];
    fluSign: THREE.Mesh;
    canPuffs: THREE.Mesh[];
    mugSteam: THREE.Mesh[];
  };
  sprites: { impact: THREE.Mesh; bolt: THREE.Mesh; boltGrey: THREE.Mesh; warn: THREE.Mesh; throb: THREE.Mesh; ghost: THREE.Mesh };
};

export const buildWorld = (): World => {
  const office = buildOffice();
  const scene = office.scene;
  const { hemi, key, warm, meet } = office.lights;

  // ===== first-aid room (origin FA) =====
  const fa = new THREE.Group();
  fa.position.copy(FA);
  scene.add(fa);
  const floor = plane(6, 6, toon("#ffffff", { map: tileTex(), key: "fa-floor" }));
  floor.rotation.x = -Math.PI / 2;
  fa.add(floor);
  const ceil = plane(6, 6, toon("#f7f8fb"));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 3;
  fa.add(ceil);
  const wallCol = "#eef6f3";
  const faWalls = [box(6.2, 3, 0.2, wallCol, 0, 0, -2.7), box(0.2, 3, 6, wallCol, -3.1, 0, 0), box(0.2, 3, 6, wallCol, 3.1, 0, 0)];
  faWalls.forEach((w) => (w.castShadow = false)); // the side wall's shadow made a hard dark wedge (review N6)
  fa.add(...faWalls);
  fa.add(box(6, 0.08, 0.03, "#7fd1b9", 0, 0.96, -2.59), box(0.03, 0.08, 6, "#7fd1b9", -2.99, 0.96, 0), box(0.03, 0.08, 6, "#7fd1b9", 2.99, 0.96, 0));
  const panel = plane(1.2, 0.6, flat("#ffffff"));
  (panel.material as THREE.MeshBasicMaterial).color.setScalar(2.0);
  panel.rotation.x = Math.PI / 2;
  panel.position.set(0, 2.985, -0.6);
  fa.add(panel);
  // exam bench along the back wall, right side
  const bench = new THREE.Group();
  bench.add(box(1.8, 0.56, 0.62, "#d9e1ef", 0, 0, 0), box(1.9, 0.1, 0.7, "#5fc4b8", 0, 0.56, 0));
  const paper = plane(1.7, 0.56, flat("#fbfbf7"));
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(-0.05, 0.662, 0);
  paper.userData.noGbuffer = true;
  bench.add(paper);
  const roll = cyl(0.07, 0.07, 0.6, "#fbfbf7", 24, 0, 0, 0);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(0.92, 0.72, 0);
  bench.add(roll);
  bench.position.set(1.3, 0, -1.75);
  bench.name = "exam bench";
  fa.add(shadowed(bench));
  // lightbox on the back wall
  const films = makeFilms();
  fa.add(box(1.3, 0.92, 0.06, "#c9d0db", -0.6, 1.12, -2.57));
  const screenMat = flat("#ffffff", films.tex);
  const screen = plane(1.2, 0.82, screenMat);
  (screen.material as THREE.MeshBasicMaterial).color.setScalar(1.45);
  screen.position.set(-0.6, 1.58, -2.535);
  fa.add(screen);
  const faLamp = new THREE.PointLight("#dff3ff", 2.2, 4, 1.6);
  faLamp.position.set(-0.6, 1.7, -1.9);
  fa.add(faLamp);
  const poster = plane(0.6, 0.85, toon("#ffffff", { map: posterTex(), key: "fa-poster" }));
  poster.position.set(0.55, 1.75, -2.585);
  fa.add(poster);
  // sink + red-cross cabinet on the left
  fa.add(box(0.6, 0.85, 0.5, "#d9e1ef", -2.55, 0, -2.25), box(0.46, 0.06, 0.36, "#aab3c2", -2.55, 0.85, -2.25));
  fa.add(cyl(0.02, 0.02, 0.22, "#aab3c2", 12, -2.55, 0.88, -2.42));
  const cab = box(0.5, 0.6, 0.25, "#ffffff", -2.86, 1.25, -0.9);
  fa.add(cab);
  const cross = plane(0.24, 0.24, toon("#ffffff", { map: signTexture(["+"], 256, 256), key: "fa-cross" }));
  cross.rotation.y = Math.PI / 2;
  cross.position.set(-2.605, 1.55, -0.9);
  fa.add(cross);
  const faPlant = new THREE.Group();
  faPlant.add(cyl(0.14, 0.1, 0.28, "#f2efe8", 24, 0, 0, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = sphere(0.11, i % 2 ? "#3fae6a" : "#2f9a5c", Math.sin(a) * 0.1, 0.42 + (i % 3) * 0.08, Math.cos(a) * 0.1, 16);
    leaf.scale.set(0.8, 1.35, 0.8);
    faPlant.add(leaf);
  }
  faPlant.position.set(2.6, 0, -2.2);
  fa.add(shadowed(faPlant));

  // ===== stairwell (origin ST) =====
  const st = new THREE.Group();
  scene.add(st); // built in world coordinates (STEP is absolute)
  const stFloor = plane(9, 8, toon("#ffffff", { map: tileTex(), key: "st-floor" }));
  stFloor.rotation.x = -Math.PI / 2;
  stFloor.position.set(ST.x, 0, 1.5); // deep enough for the wide tracking shot
  st.add(stFloor);
  st.add(box(9, 5, 0.2, "#f2f4f8", ST.x, 0, -1.5), box(0.2, 5, 4, "#f2f4f8", ST.x - 4.5, 0, 0), box(0.2, 5, 4, "#f2f4f8", ST.x + 4.5, 0, 0));
  st.add(box(9, 0.08, 0.03, PAL.wallStripe, ST.x, 1.0, -1.39));
  for (let i = 0; i < STEP.count; i++) {
    const h = (i + 1) * STEP.rise;
    const s = box(STEP.run, h, 1.2, i % 2 ? "#cfd6e4" : "#d9dfeb", STEP.x0 + i * STEP.run + STEP.run / 2, 0, STEP.z);
    s.userData.noCollide = true; // feet on treads are expected; checked by eye
    st.add(s);
    // dark nosing strip ON TOP of the tread's front edge (a separate raised box: no coplanar faces → no z-fighting)
    const nose = box(0.07, 0.014, 1.2, "#3d4a6e", STEP.x0 + i * STEP.run + 0.035, h, STEP.z);
    nose.userData.noCollide = true;
    st.add(nose);
  }
  const landX0 = STEP.x0 + STEP.count * STEP.run;
  const landing = box(1.6, STEP.count * STEP.rise, 1.2, "#cfd6e4", landX0 + 0.8, 0, STEP.z);
  landing.userData.noCollide = true;
  st.add(landing);
  // no handrail: in a side-on shot any sloped rail behind her reads as going through her body (review 2, M3)
  const { c: ec, g: eg } = makeCanvas(600, 240);
  eg.fillStyle = "#1f9a52";
  eg.fillRect(0, 0, 600, 240);
  eg.fillStyle = "#ffffff";
  eg.font = `800 150px ${UI_FONT}`;
  eg.textAlign = "center";
  eg.textBaseline = "middle";
  eg.fillText("EXIT", 300, 128);
  const exitSign = plane(0.6, 0.24, flat("#ffffff", toTex(ec)));
  exitSign.position.set(landX0 + 0.8, 4.05, -1.36); // 2 cm in front of its green back plate (was coplanar: z-fight)
  const exitBack = box(0.66, 0.3, 0.04, "#2fbf6a", landX0 + 0.8, 3.9, -1.41);
  st.add(exitBack);
  (exitSign.material as THREE.MeshBasicMaterial).color.setScalar(1.25); // lit sign: a soft glow
  st.add(exitSign);
  const stLamp = new THREE.PointLight("#fff1dc", 3, 6, 1.5);
  stLamp.position.set(ST.x, 3.2, 0.2);
  st.add(stLamp);

  const frontPosts: THREE.Mesh[] = [];
  scene.traverse((o: any) => {
    const g = o.geometry?.parameters;
    if (o.isMesh && g && g.width === 0.07 && g.height === 2.8 && g.depth === 0.08 && Math.abs(o.position.z + 0.5) < 0.01) frontPosts.push(o);
  });

  // ===== cast =====
  const { mika, ravi, june, otto } = office.chars;
  const noor = buildCharacter({ ...CAST.otto, name: "Noor", top: "#f4f6fb", skin: "#b07a55", hair: "#b9bfcc", style: "tuft" });
  const body = noor.parts.torso.children[0] as THREE.Mesh;
  body.material = new THREE.MeshBasicMaterial({ map: coatTex() });
  const steth = new THREE.Group();
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.013, 8, 40, Math.PI * 1.3), fill(INK));
  loop.rotation.set(Math.PI / 2 - 0.25, 0, Math.PI * 0.85);
  loop.position.set(0, 0.62, 0.02);
  steth.add(loop);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.22, 8), fill(INK));
  tube.position.set(0.09, 0.5, 0.17);
  steth.add(tube);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 20), fill("#aab3c2"));
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0.09, 0.38, 0.19);
  steth.add(disc);
  steth.traverse((o: any) => {
    if (o.isMesh) {
      o.userData.char = true;
      o.userData.noGbuffer = true; // thin ink parts: no scribbly outline
    }
  });
  noor.parts.torso.add(steth);
  scene.add(noor.root);

  // ===== hand props (WORLD space; userData.grip = where the hand-sphere centre goes, always outside the mesh) =====
  const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const asChar = <T extends THREE.Object3D>(o: T): T => {
    // flat-drawn like the cast: no ambient occlusion, no cast shadow
    o.traverse((m: any) => {
      if (m.isMesh) {
        m.userData.char = true;
        m.castShadow = false;
      }
    });
    return o;
  };
  const heldMug = office.heldMug; // the kit parks it in Mika's right hand: take it out into the world
  scene.add(heldMug);
  heldMug.userData.grip = V3(0.09, 0.015, 0); // through the handle loop
  heldMug.visible = false;
  // frosty soda can: blue, white frost speckles, a snowflake band
  const can = new THREE.Group();
  const { c: fc, g: fg } = makeCanvas(256, 256);
  fg.fillStyle = "#3b8fe0";
  fg.fillRect(0, 0, 256, 256);
  fg.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 220; i++) fg.fillRect((i * 97) % 256, (i * 57) % 256, 4 + (i % 3), 4 + (i % 3));
  fg.fillStyle = "#ffffff";
  fg.fillRect(0, 100, 256, 56);
  fg.strokeStyle = "#3b8fe0";
  fg.lineWidth = 6;
  for (const cx of [40, 128, 216]) {
    for (let a = 0; a < 3; a++) {
      fg.beginPath();
      fg.moveTo(cx + Math.cos((a * Math.PI) / 3) * 20, 128 + Math.sin((a * Math.PI) / 3) * 20);
      fg.lineTo(cx - Math.cos((a * Math.PI) / 3) * 20, 128 - Math.sin((a * Math.PI) / 3) * 20);
      fg.stroke();
    }
  }
  can.add(cyl(0.04, 0.04, 0.14, toon("#ffffff", { map: toTex(fc), key: "can2" }), 28, 0, -0.07, 0), cyl(0.034, 0.038, 0.012, "#c9d0db", 20, 0, 0.07, 0));
  can.userData.grip = V3(0.075, 0, 0);
  can.visible = false;
  scene.add(shadowed(can));
  const puffTx = puffTex();
  const puffs = (n: number, size: number, col: string, opacity: number) =>
    Array.from({ length: n }, () => {
      const p = makeSprite(puffTx, size, false);
      const m = p.material as THREE.MeshBasicMaterial;
      m.color.set(col);
      m.opacity = opacity;
      p.userData.baseOpacity = opacity;
      scene.add(p);
      return p;
    });
  const canPuffs = puffs(5, 0.07, "#eaf6ff", 0.8);
  const wispTx = wispTex();
  const wisps = (n: number, size: number) =>
    Array.from({ length: n }, () => {
      const p = makeSprite(wispTx, size, false);
      scene.add(p);
      return p;
    });
  const mugSteam = wisps(3, 0.13);
  const phone = new THREE.Group();
  phone.add(box(0.075, 0.012, 0.15, "#262a35", 0, 0, 0));
  const ps = plane(0.065, 0.135, flat("#9fc3ff"));
  (ps.material as THREE.MeshBasicMaterial).color.setScalar(1.4);
  ps.rotation.x = -Math.PI / 2;
  ps.position.y = 0.0125;
  phone.add(ps);
  phone.visible = false;
  phone.userData.grip = V3(0, -0.035, 0.04); // the palm under the phone's lower half
  scene.add(phone);
  // syringe, cartoon-sized: barrel 0…0.13 (needle below, −y), plunger + thumb flange on top; held by the flange end
  const syringe = new THREE.Group();
  syringe.add(cyl(0.02, 0.02, 0.13, fill("#bcd6ec"), 16, 0, 0, 0), cyl(0.014, 0.014, 0.07, fill("#f5b82e"), 16, 0, 0.012, 0));
  syringe.add(cyl(0.008, 0.008, 0.06, fill("#7d889e"), 8, 0, 0.13, 0), cyl(0.026, 0.026, 0.012, fill("#7d889e"), 16, 0, 0.19, 0));
  syringe.add(cyl(0.0035, 0.0035, 0.06, fill("#9aa6bb"), 6, 0, -0.06, 0));
  syringe.scale.setScalar(1.45);
  syringe.userData.tip = V3(0, -0.06, 0);
  syringe.userData.grip = V3(0, 0.235, 0); // thumb on the plunger
  syringe.visible = false;
  scene.add(shadowed(syringe));
  // the scorching coffee pot (review 2): a stovetop steel pot whose base glows red-hot and whose METAL handle glows
  // orange. She grips it correctly, by the handle; the heat makes "barehanded" the gag (and Otto offers an oven mitt).
  const pot = new THREE.Group();
  pot.add(cyl(0.085, 0.08, 0.2, "#b9c0cc", 40, 0, -0.1, 0), cyl(0.06, 0.088, 0.035, "#aab3c2", 40, 0, 0.1, 0));
  pot.add(sphere(0.02, "#3d4a6e", 0, 0.15, 0, 16));
  const hotMat = (col: string, k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), toneMapped: false });
  const band = (rBot: number, rTop: number, h: number, y: number, col: string, k: number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 40), hotMat(col, k));
    m.position.y = y;
    pot.add(m);
  };
  band(0.0806, 0.0828, 0.055, -0.0725, "#ff2d14", 3.2); // red-hot base
  band(0.0828, 0.0848, 0.05, -0.02, "#ff7a2e", 1.9); // glowing orange above it
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.026, 0.11, 20), toon("#b9c0cc"));
  spout.rotation.z = -0.87;
  spout.position.set(0.127, 0.075, 0);
  pot.add(spout);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 16), hotMat("#ff3b1f", 2.4)); // red-hot metal
  handle.rotation.z = 1.22; // out of the back (−x) and a little up
  handle.position.set(-0.15, 0.045, 0);
  pot.add(handle);
  pot.userData.spout = V3(0.169, 0.111, 0);
  pot.userData.grip = V3(-0.19, 0.06, 0); // the fist round the handle's end
  pot.scale.setScalar(1.35); // the hero prop of its shot: big enough to read the glow and the grip
  pot.visible = false;
  scene.add(shadowed(pot));
  const heat = [makeSprite(heatTex(), 0.16, false), makeSprite(heatTex(), 0.12, false)];
  heat.forEach((h) => scene.add(h));
  // oven mitt Otto offers (and she ignores): red quilted mitt, thumb, white cuff; held by the cuff
  const mitt = new THREE.Group();
  const mBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.12, 6, 20), toon("#e0413a"));
  mBody.scale.set(1, 1, 0.55);
  mitt.add(mBody);
  const mThumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.05, 6, 14), toon("#e0413a"));
  mThumb.rotation.z = -0.7;
  mThumb.position.set(0.075, -0.01, 0);
  mThumb.scale.set(1, 1, 0.7);
  mitt.add(mThumb);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.045, 24), toon("#f4f6fb"));
  cuff.position.y = -0.115;
  cuff.scale.set(1, 1, 0.6);
  mitt.add(cuff);
  mitt.userData.grip = V3(0, -0.16, 0);
  mitt.visible = false;
  scene.add(shadowed(mitt));
  // the counter-height island the team's mugs stand on in the pour shot (shown only there)
  const pourTable = new THREE.Group();
  pourTable.add(box(1.25, 0.88, 0.55, "#e8ecf3", 0, 0, 0), box(1.35, 0.05, 0.65, PAL.wood, 0, 0.88, 0));
  pourTable.position.set(-5.42, 0, -3.8);
  pourTable.name = "pour table";
  pourTable.visible = false;
  scene.add(shadowed(pourTable));
  const potSteam = wisps(3, 0.16);
  const sizzle = puffs(4, 0.09, "#ffffff", 0.9);
  const teamMugs = [mug("#2bb3a3"), mug("#f2b632"), mug("#9b8cf2")];
  teamMugs.forEach((m) => {
    m.visible = false;
    m.userData.grip = V3(0.09, 0.015, 0);
    scene.add(m);
  });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.008, 1, 12), flat("#b0703a")); // light coffee brown: reads as liquid, not a stick
  stream.visible = false;
  stream.userData.noCollide = true;
  stream.userData.noGbuffer = true;
  scene.add(stream);
  const sandwich = () => {
    const g = new THREE.Group();
    g.add(box(0.16, 0.025, 0.1, "#e8c48a", 0, -0.04, 0), box(0.17, 0.012, 0.11, "#5cbf5c", 0, -0.016, 0), box(0.15, 0.02, 0.09, "#ff9aa2", 0, -0.004, 0), box(0.16, 0.025, 0.1, "#e8c48a", 0, 0.016, 0));
    g.userData.grip = V3(-0.1, 0, 0); // fingers on the crust end
    g.visible = false;
    scene.add(g);
    return shadowed(g);
  };
  const sandwichM = sandwich();
  const sandwichJ = sandwich();
  const napkin = new THREE.Group();
  const nap = plane(0.24, 0.24, fill("#ffffff"));
  nap.rotation.x = -Math.PI / 2;
  napkin.add(nap);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.045, 28), fill("#e0413a"));
  dot.name = "dot";
  dot.rotation.x = -Math.PI / 2;
  dot.position.set(0.02, 0.002, 0.01);
  napkin.add(dot);
  napkin.position.set(4.95, 0.752, -2.95);
  napkin.visible = false;
  scene.add(napkin);
  const drop = sphere(0.03, fill("#e0413a"), 0, 0, 0, 16);
  drop.visible = false;
  drop.userData.noCollide = true;
  scene.add(drop);
  const folders = new THREE.Group();
  ["#3d6be0", "#f2b632", "#ff7a6b", "#2bb3a3"].forEach((col, i) => folders.add(box(0.3, 0.035, 0.24, col, 0, i * 0.036, 0)));
  folders.position.set(0, 0.42, 0.3);
  folders.visible = false;
  mika.parts.torso.add(shadowed(folders));
  // swollen ankle: a puffy red bulge AT the ankle joint (between shin and shoe), not a ball on the shoe
  const ankle = sphere(0.05, fill("#ff7d70"), 0, -0.31, 0.015, 24);
  ankle.scale.set(1.3, 1.5, 1.3);
  ankle.userData.char = true;
  ankle.castShadow = false;
  ankle.visible = false;
  mika.parts.rShin.add(ankle);

  // hero hand for the blister insert: Mika's flat skin, replaces her left hand sphere in that shot (wrist at +z)
  const hand = new THREE.Group();
  const skin = fill(CAST.mika.skin);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 20), skin);
  palm.scale.set(1, 0.42, 1.15);
  hand.add(palm);
  const finger = (x: number, len: number, a: number) => {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, len, 6, 14), skin);
    f.rotation.x = Math.PI / 2;
    f.rotation.y = a;
    f.position.set(x, 0.0, -0.13 - len / 2);
    hand.add(f);
  };
  finger(-0.065, 0.1, 0.12);
  finger(-0.022, 0.12, 0.03);
  finger(0.022, 0.115, -0.03);
  finger(0.062, 0.09, -0.12);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 6, 14), skin);
  thumb.rotation.set(Math.PI / 2, 0, 0.9);
  thumb.position.set(0.12, 0, -0.02);
  hand.add(thumb);
  const blisters: THREE.Mesh[] = [];
  for (const [x, z, r] of [
    [-0.03, -0.02, 0.022],
    [0.035, 0.03, 0.018],
    [0.0, 0.06, 0.016],
    [-0.022, -0.17, 0.014],
    [0.05, -0.08, 0.015],
  ] as const) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), fill("#ff9fb0"));
    b.position.set(x, 0.045, z);
    b.scale.set(1, 0.7, 1);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 10, 8), fill("#ffffff"));
    hl.position.set(-r * 0.35, r * 0.55, -r * 0.3);
    b.add(hl);
    b.visible = false;
    blisters.push(b);
    hand.add(b);
  }
  hand.userData.wrist = V3(0, 0, 0.12);
  hand.visible = false;
  hand.traverse((o: any) => {
    if (o.isMesh) o.userData.noCollide = true;
  });
  scene.add(asChar(hand));

  // the fire-alarm bell with no clapper, on a PLAIN stretch of the office's left wall above the filing cabinets
  // (faces +x): back plate, red gong with a rim, dark centre bolt, the striker housing below with an EMPTY arm and
  // a dashed outline where the clapper should be
  const bell = new THREE.Group();
  bell.add(box(0.03, 0.5, 0.36, "#3d4a6e", 0, -0.32, 0));
  const gong = new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), toon("#e0413a"));
  gong.rotation.z = -Math.PI / 2;
  gong.position.x = 0.03;
  bell.add(gong);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.016, 10, 48), toon("#b92f2a"));
  rim.rotation.y = Math.PI / 2;
  rim.position.x = 0.09;
  bell.add(rim);
  const boltHead = cyl(0.02, 0.02, 0.025, "#3d4a6e", 16, 0, 0, 0);
  boltHead.rotation.z = Math.PI / 2;
  boltHead.position.set(0.19, 0, 0);
  bell.add(boltHead);
  bell.add(box(0.1, 0.12, 0.16, "#e0413a", 0.06, -0.28, 0));
  // the empty striker arm: from the housing out to where the clapper ball should be (bell.userData.clapper)
  const armFrom = new THREE.Vector3(0.07, -0.25, -0.085),
    armTo = new THREE.Vector3(0.09, -0.17, -0.128);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, armFrom.distanceTo(armTo), 10), toon("#3d4a6e"));
  arm.position.copy(armFrom).add(armTo).multiplyScalar(0.5);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armTo.clone().sub(armFrom).normalize());
  bell.add(arm);
  bell.userData.clapper = new THREE.Vector3(0.09, -0.145, -0.146); // touching the rim's lower edge
  bell.position.set(-7.97, 1.95, 2.55);
  scene.add(shadowed(bell));
  const smoke = puffs(7, 0.26, "#9aa0ad", 0.55);
  // FLU SHOT DAY sign high on the meeting-room glass (inside face), above the heads
  const fluSign = plane(0.8, 0.4, flat("#f2f2f2", signTexture(["FLU SHOT", "DAY"], 900, 450))); // unlit: never blooms out
  fluSign.position.set(5.5, 2.2, -0.56);
  fluSign.rotation.y = Math.PI;
  fluSign.visible = false;
  scene.add(fluSign);
  // whiteboard title overlay in front of the office whiteboard (x = 7.945, facing −x)
  const board = makeBoard();
  const bp = plane(1.8, 1.1, toon("#ffffff", { map: board.tex, key: "pain-board" }));
  bp.rotation.y = -Math.PI / 2;
  bp.position.set(7.935, 1.55, -3.3);
  scene.add(bp);

  // sprites
  const impact = makeSprite(impactTex(), 0.32);
  const bolt = makeSprite(boltTex("#ff3b30"), 0.3);
  const boltGrey = makeSprite(boltTex("#9aa3b2"), 0.3);
  const warn = makeSprite(warnTex(), 0.28);
  const throb = makeSprite(throbTex(), 0.32);
  const ghost = makeSprite(ghostTex(), 0.08);
  scene.add(impact, bolt, boltGrey, warn, throb, ghost);
  // held props: the hands grip them, so the collision QA must not count them as furniture
  [heldMug, can, phone, syringe, pot, mitt, ...teamMugs, sandwichM, sandwichJ].forEach((o) => o.traverse((m: any) => m.isMesh && (m.userData.noCollide = true)));

  return {
    scene,
    lights: { hemi, key, practicals: [warm, meet, faLamp, stLamp] },
    setSky: (sky) => {
      office.windowMat.map = sky === "dawn" && office.windowTex.dawn ? office.windowTex.dawn : office.windowTex.day;
    },
    cast: { mika, ravi, june, otto, noor },
    seats: [...Object.values(office.chairs), ...office.meetChairs, bench],
    office,
    board,
    films,
    screenMat,
    frontPosts,
    props: { heldMug, can, phone, syringe, pot, potSteam, sizzle, heat, mitt, pourTable, teamMugs, stream, sandwichM, sandwichJ, napkin, drop, folders, ankle, hand, blisters, bell, smoke, fluSign, canPuffs, mugSteam },
    sprites: { impact, bolt, boltGrey, warn, throb, ghost },
  };
};

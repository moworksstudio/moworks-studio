// CheeseBankVault — canvas textures (all original, deterministic): marble, stone, cheese rind + stamp, cheese paste,
// bank sign, calendar, bills, SOLD tag, countryside window, money bag. No numbers anywhere (only spoken figures may appear).
import * as THREE from "three";
import { rng } from "../../kit/lib";
import { makeCanvas, rr, toTex, UI_FONT, HAND_FONT, MARKER_FONT } from "../../kit/textures";

const INK = "#141827";

/** Marble checkerboard floor: cream and sage tiles with soft veins. One repeat = 2 × 2 tiles. */
export const marbleFloorTex = (repeat: [number, number]) => {
  const { c, g } = makeCanvas(1024, 1024);
  const r = rng(21);
  const tiles = [
    ["#f4ead8", "#8fb8a3"],
    ["#8fb8a3", "#f4ead8"],
  ];
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const base = tiles[i][j];
      g.fillStyle = base;
      g.fillRect(i * 512, j * 512, 512, 512);
      const vein = base === "#f4ead8" ? "rgba(170,150,120,0.35)" : "rgba(40,90,70,0.35)";
      g.strokeStyle = vein;
      for (let k = 0; k < 5; k++) {
        g.lineWidth = 2 + r() * 4;
        g.beginPath();
        let x = i * 512 + r() * 512,
          y = j * 512;
        g.moveTo(x, y);
        for (let s = 0; s < 8; s++) {
          x += (r() - 0.35) * 90;
          y += 64;
          g.lineTo(Math.min(Math.max(x, i * 512 + 4), i * 512 + 508), y);
        }
        g.stroke();
      }
    }
  g.strokeStyle = "rgba(90,70,40,0.45)";
  g.lineWidth = 6;
  g.strokeRect(0, 0, 1024, 1024);
  g.beginPath();
  g.moveTo(512, 0);
  g.lineTo(512, 1024);
  g.moveTo(0, 512);
  g.lineTo(1024, 512);
  g.stroke();
  return toTex(c, repeat);
};

/** Warm stone floor tiles for the vault. */
export const stoneFloorTex = (repeat: [number, number]) => {
  const { c, g } = makeCanvas(512, 512);
  const r = rng(33);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const k = 0.92 + r() * 0.12;
      const col = new THREE.Color("#b79f84").multiplyScalar(k);
      g.fillStyle = `#${col.getHexString()}`;
      g.fillRect(i * 128, j * 128, 128, 128);
    }
  g.strokeStyle = "rgba(60,40,25,0.45)";
  g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    g.beginPath();
    g.moveTo(i * 128, 0);
    g.lineTo(i * 128, 512);
    g.moveTo(0, i * 128);
    g.lineTo(512, i * 128);
    g.stroke();
  }
  return toTex(c, repeat);
};

/** Brick wall (vault). */
export const brickTex = (repeat: [number, number]) => {
  const { c, g } = makeCanvas(512, 512);
  const r = rng(41);
  g.fillStyle = "#6f4a36";
  g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? 64 : 0;
    for (let col = -1; col < 5; col++) {
      const k = 0.85 + r() * 0.25;
      g.fillStyle = `#${new THREE.Color("#b5714d").multiplyScalar(k).getHexString()}`;
      g.fillRect(col * 128 + off + 4, row * 64 + 4, 120, 56);
    }
  }
  return toTex(c, repeat);
};

/** Plaster wall with a faint wash (dairy). */
export const plasterTex = (base: string, repeat: [number, number]) => {
  const { c, g } = makeCanvas(256, 256);
  const r = rng(51);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(120,90,50,0.06)";
    const x = r() * 256,
      y = r() * 256,
      rad = 4 + r() * 14;
    for (const dx of [-256, 0, 256])
      for (const dy of [-256, 0, 256]) {
        g.beginPath();
        g.arc(x + dx, y + dy, rad, 0, Math.PI * 2);
        g.fill();
      }
  }
  return toTex(c, repeat);
};

/** Cheese rind SIDE band: light cream (tinted per wheel by material colour) with pin-dot lettering all round. */
export const rindSideTex = (label = "FORMAGGIO") => {
  const { c, g } = makeCanvas(2048, 256);
  g.fillStyle = "#fff6dc";
  g.fillRect(0, 0, 2048, 256);
  const r = rng(61);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(200,150,60,0.12)" : "rgba(255,255,255,0.2)";
    g.fillRect(r() * 2048, r() * 256, 3 + r() * 8, 2);
  }
  // rim bands (where the side meets the faces)
  g.fillStyle = "rgba(170,110,30,0.35)";
  g.fillRect(0, 0, 2048, 14);
  g.fillRect(0, 242, 2048, 14);
  // pin-dot lettering: draw the word on a scratch canvas, then sample it into dots
  const { c: s, g: sg } = makeCanvas(1024, 128);
  sg.fillStyle = "#000";
  sg.font = `800 96px ${UI_FONT}`;
  sg.textBaseline = "middle";
  sg.textAlign = "center";
  sg.fillText(label.length < 6 ? `${label} · ${label}` : label, 512, 66);
  const px = sg.getImageData(0, 0, 1024, 128).data;
  g.fillStyle = "rgba(120,70,15,0.75)";
  for (let rep = 0; rep < 2; rep++)
    for (let y = 4; y < 128; y += 9)
      for (let x = 4; x < 1024; x += 9) {
        if (px[(y * 1024 + x) * 4 + 3] < 128) continue;
        g.beginPath();
        g.arc(rep * 1024 + x, 64 + y, 3.2, 0, Math.PI * 2);
        g.fill();
      }
  return toTex(c);
};

/** Cheese rind TOP face: cream disc with a branded oval stamp (label text) and a ring of dots. */
export const rindTopTex = (label: string) => {
  const { c, g } = makeCanvas(512, 512);
  g.fillStyle = "#fff4d6";
  g.fillRect(0, 0, 512, 512);
  const grad = g.createRadialGradient(256, 256, 120, 256, 256, 256);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(190,130,40,0.35)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(130,80,20,0.55)";
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.beginPath();
    g.arc(256 + Math.cos(a) * 214, 256 + Math.sin(a) * 214, 5, 0, Math.PI * 2);
    g.fill();
  }
  // branded oval (fire-brand style, our own design)
  g.strokeStyle = "rgba(110,60,15,0.85)";
  g.lineWidth = 10;
  g.beginPath();
  g.ellipse(256, 256, 150, 92, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(256, 256, 132, 76, 0, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(110,60,15,0.9)";
  g.font = `800 ${label.length > 5 ? 56 : 74}px ${UI_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, 256, 262);
  // a little drawn crown of three dots above the word
  for (const dx of [-30, 0, 30]) {
    g.beginPath();
    g.arc(256 + dx, 208 - (dx === 0 ? 6 : 0), 7, 0, Math.PI * 2);
    g.fill();
  }
  return toTex(c);
};

/** Cut face of a cheese wheel: grainy paste, rind border along the outer edge (u = 1) and top/bottom, crystals.
 *  Drawn once per age value into the same canvas (age 0 → young, 1 → old). */
export const makePasteTex = () => {
  const { c, g } = makeCanvas(1024, 512);
  const tex = toTex(c);
  const draw = (age: number) => {
    const young = new THREE.Color("#fbefc4");
    const old = new THREE.Color("#f2c662");
    g.fillStyle = `#${young.clone().lerp(old, age).getHexString()}`;
    g.fillRect(0, 0, 1024, 512);
    const r = rng(71);
    // grain
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(180,120,40,0.10)";
      g.fillRect(r() * 1024, r() * 512, 2 + r() * 4, 2 + r() * 3);
    }
    // crystals appear with age
    const n = Math.floor(160 * Math.max(0, age - 0.15));
    for (let i = 0; i < 160; i++) {
      const x = 40 + r() * 900,
        y = 50 + r() * 412,
        s = 3 + r() * 6;
      if (i >= n) continue;
      g.fillStyle = "rgba(255,255,245,0.95)";
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(170,110,30,0.6)";
      g.lineWidth = 2;
      g.stroke();
    }
    // rind border: outer edge (right) + top + bottom
    const rind = `#${new THREE.Color("#f0c56a").lerp(new THREE.Color("#b8741e"), age).getHexString()}`;
    g.fillStyle = rind;
    g.fillRect(990, 0, 34, 512);
    g.fillRect(0, 0, 1024, 26);
    g.fillRect(0, 486, 1024, 26);
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
};

/** Gold-on-green bank sign. */
export const bankSignTex = () => {
  const { c, g } = makeCanvas(1024, 256);
  g.fillStyle = "#1f4d3d";
  rr(g, 8, 8, 1008, 240, 26);
  g.fill();
  g.strokeStyle = "#e8c15a";
  g.lineWidth = 10;
  rr(g, 22, 22, 980, 212, 18);
  g.stroke();
  g.fillStyle = "#f3d27a";
  g.font = `800 150px ${UI_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  // letter-spaced by hand
  const word = "BANCA";
  const sp = 168;
  [...word].forEach((ch, i) => g.fillText(ch, 512 + (i - (word.length - 1) / 2) * sp, 136));
  return toTex(c);
};

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

/** Wall calendar: month name + a drawn picture (a cheese wheel), day boxes without numbers. Redrawn per month. */
export const makeCalendarTex = () => {
  const { c, g } = makeCanvas(512, 640);
  const tex = toTex(c);
  let last = -1;
  const draw = (month: number) => {
    const m = ((Math.floor(month) % 12) + 12) % 12;
    if (m === last) return;
    last = m;
    g.fillStyle = "#fdfbf5";
    g.fillRect(0, 0, 512, 640);
    g.fillStyle = "#d9472f";
    g.fillRect(0, 0, 512, 120);
    g.fillStyle = "#ffffff";
    g.font = `800 ${MONTHS[m].length > 7 ? 62 : 78}px ${UI_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(MONTHS[m], 256, 64);
    // picture: a wheel with a wedge out
    g.fillStyle = "#f2c662";
    g.beginPath();
    g.ellipse(256, 262, 104, 46, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e0a845";
    g.fillRect(152, 214, 208, 48);
    g.beginPath();
    g.ellipse(256, 214, 104, 46, 0, 0, Math.PI * 2);
    g.fillStyle = "#f7d27a";
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 6;
    g.stroke();
    g.beginPath();
    g.moveTo(152, 214);
    g.lineTo(152, 262);
    g.moveTo(360, 214);
    g.lineTo(360, 262);
    g.stroke();
    g.beginPath();
    g.ellipse(256, 262, 104, 46, 0, 0, Math.PI);
    g.stroke();
    g.strokeStyle = "rgba(110,60,15,0.8)";
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(256, 214, 54, 22, 0, 0, Math.PI * 2);
    g.stroke();
    // day boxes
    g.strokeStyle = "#c9cfdb";
    g.lineWidth = 3;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 7; col++) {
        g.strokeRect(36 + col * 63, 380 + row * 60, 54, 50);
      }
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
};

/** An envelope with a red DUE stamp (a bill). */
export const billTex = (seed: number) => {
  const { c, g } = makeCanvas(512, 320);
  const r = rng(seed);
  g.fillStyle = "#f7f2e6";
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "rgba(0,0,0,0.12)";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(256, 170);
  g.lineTo(512, 0);
  g.stroke();
  g.fillStyle = "#b8bfcc";
  for (let i = 0; i < 3; i++) g.fillRect(40, 210 + i * 26, 160 + r() * 80, 12);
  g.save();
  g.translate(360, 220);
  g.rotate(-0.22 + r() * 0.1);
  g.strokeStyle = "#e0342a";
  g.lineWidth = 12;
  rr(g, -110, -52, 220, 104, 14);
  g.stroke();
  g.fillStyle = "#e0342a";
  g.font = `800 82px ${UI_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("DUE", 0, 6);
  g.restore();
  return toTex(c);
};

/** Hang tag: SOLD. */
export const soldTagTex = () => {
  const { c, g } = makeCanvas(512, 256);
  g.fillStyle = "#e0342a";
  rr(g, 6, 6, 500, 244, 30);
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 10;
  rr(g, 22, 22, 468, 212, 20);
  g.stroke();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(70, 128, 18, 0, Math.PI * 2);
  g.fill();
  g.font = `800 140px ${UI_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("SOLD", 290, 136);
  return toTex(c);
};

/** Money bag print: a gold coin roundel with a euro sign. */
export const bagTex = () => {
  const { c, g } = makeCanvas(512, 256);
  g.fillStyle = "#d8b98a";
  g.fillRect(0, 0, 512, 256);
  const r = rng(81);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(120,80,40,0.12)" : "rgba(255,240,210,0.15)";
    g.fillRect(r() * 512, r() * 256, 6, 2);
  }
  for (const x of [128, 384]) {
    g.fillStyle = "#2f7d4f";
    g.beginPath();
    g.arc(x, 128, 70, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `800 100px ${UI_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("€", x, 134);
  }
  return toTex(c);
};

/** Countryside window view (dairy): day and dawn. */
export const hillsTex = (dawn: boolean) => {
  const { c, g } = makeCanvas(1024, 512);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  if (dawn) {
    sky.addColorStop(0, "#6a78d8");
    sky.addColorStop(0.55, "#f0a2a8");
    sky.addColorStop(1, "#ffd99a");
  } else {
    sky.addColorStop(0, "#8ec5ff");
    sky.addColorStop(1, "#e4f3ff");
  }
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);
  const hill = (y: number, amp: number, col: string, ph: number) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x / 160 + ph) * amp + Math.sin(x / 61 + ph * 2) * amp * 0.25);
    g.lineTo(1024, 512);
    g.fill();
  };
  hill(300, 40, dawn ? "#6f8fb0" : "#8cc49a", 0.5);
  hill(360, 34, dawn ? "#4f7a6a" : "#5aa86d", 2.1);
  hill(430, 22, dawn ? "#3d6450" : "#3f9356", 4.0);
  // cypress trees
  g.fillStyle = dawn ? "#2c4a3a" : "#2c7a45";
  for (const x of [180, 214, 700, 880]) {
    g.beginPath();
    g.ellipse(x, 330, 14, 52, 0, 0, Math.PI * 2);
    g.fill();
  }
  return toTex(c);
};

/** Sunny piazza seen through the bank's open front doors. */
export const piazzaTex = () => {
  const { c, g } = makeCanvas(1024, 1024);
  const sky = g.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, "#86c2ff");
  sky.addColorStop(1, "#e8f4ff");
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 1024);
  const r = rng(91);
  const cols = ["#f2b46b", "#e88f5a", "#f4d38a", "#d9775b", "#efc27f"];
  let x = -30;
  while (x < 1024) {
    const w = 160 + r() * 140,
      h = 380 + r() * 240;
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.fillRect(x, 760 - h, w, h);
    g.fillStyle = "rgba(60,80,120,0.55)";
    for (let wy = 760 - h + 40; wy < 700; wy += 90) for (let wx = x + 24; wx < x + w - 40; wx += 60) g.fillRect(wx, wy, 30, 50);
    x += w + 10;
  }
  g.fillStyle = "#e9d6b4";
  g.fillRect(0, 760, 1024, 264);
  return toTex(c);
};

/** Clock face WITHOUT numerals (ticks only). */
export const tickClockTex = () => {
  const { c, g } = makeCanvas(512, 512);
  g.fillStyle = "#fffaf0";
  g.beginPath();
  g.arc(256, 256, 256, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = INK;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineWidth = i % 3 === 0 ? 16 : 8;
    g.beginPath();
    g.moveTo(256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190);
    g.lineTo(256 + Math.sin(a) * 236, 256 - Math.cos(a) * 236);
    g.stroke();
  }
  return toTex(c);
};

export { HAND_FONT, MARKER_FONT };

/** A laughing face for the kit's face cap (same layout as the kit's faceTex): squeezed happy eyes, raised brows,
 *  a wide open laughing mouth with a tongue. */
export const laughFaceTex = (skin: string) => {
  void skin;
  const { c, g } = makeCanvas(1024, 1024);
  g.clearRect(0, 0, 1024, 1024);
  const fx = (phi: number) => 512 + (phi / (2 * 0.95)) * 1024;
  const fy = (theta: number) => 512 + (theta / (2 * 0.9)) * 1024;
  const eyeY = fy(-0.05);
  g.fillStyle = "rgba(255,110,110,0.38)";
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(fx(s * 0.43), fy(0.12), 58, 34, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = INK;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const ex of [fx(-0.27), fx(0.27)]) {
    const s = ex < 512 ? 1 : -1;
    g.lineWidth = 16; // squeezed shut: > <
    g.beginPath();
    g.moveTo(ex - 30 * s, eyeY - 28);
    g.lineTo(ex + 22 * s, eyeY - 2);
    g.lineTo(ex - 30 * s, eyeY + 24);
    g.stroke();
    g.lineWidth = 12; // brows up
    g.beginPath();
    g.moveTo(ex - 40, eyeY - 112);
    g.quadraticCurveTo(ex, eyeY - 134, ex + 40, eyeY - 112);
    g.stroke();
  }
  const my = fy(0.22);
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(512 - 92, my - 22);
  g.quadraticCurveTo(512, my - 34, 512 + 92, my - 22);
  g.quadraticCurveTo(512 + 70, my + 110, 512, my + 116);
  g.quadraticCurveTo(512 - 70, my + 110, 512 - 92, my - 22);
  g.fill();
  g.fillStyle = "#ff8a8a";
  g.beginPath();
  g.ellipse(512, my + 78, 44, 26, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffffff";
  g.fillRect(512 - 62, my - 22, 124, 18);
  return toTex(c);
};

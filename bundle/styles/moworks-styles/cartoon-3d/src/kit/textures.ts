// Canvas-drawn textures for the toon office: floor, ceiling, window view, screens, signs, whiteboard, clock, faces.
// All deterministic (seeded). Fonts must be loaded before any of these run (ToonVideo awaits loadToonFonts()).
import * as THREE from "three";
import { PAL, rng } from "./lib";

export const UI_FONT = "Outfit";
export const HAND_FONT = "Patrick Hand";
export const MARKER_FONT = "Caveat Brush";

/** A 2D canvas + context (for per-video canvas textures; wrap with toTex). */
export const makeCanvas = (w: number, h: number) => canvas(w, h);
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! }
};

export const toTex = (c: HTMLCanvasElement, repeat?: [number, number]) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
};

export const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
};

/** Carpet: 2 × 2 one-metre tiles per repeat, faint seams and a little tile-to-tile tone shift. */
export const carpetTex = () => {
  const { c, g } = canvas(512, 512);
  const r = rng(7);
  const base = new THREE.Color(PAL.carpet);
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const k = 0.94 + r() * 0.1;
      g.fillStyle = `#${base.clone().multiplyScalar(k).getHexString()}`;
      g.fillRect(i * 256, j * 256, 256, 256);
    }
  g.strokeStyle = "rgba(10,20,80,0.35)";
  g.lineWidth = 3;
  for (let i = 0; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * 256, 0);
    g.lineTo(i * 256, 512);
    g.moveTo(0, i * 256);
    g.lineTo(512, i * 256);
    g.stroke();
  }
  return toTex(c, [8, 6]);
};

/** Ceiling: 0.6 m grid tiles. */
export const ceilingTex = () => {
  const { c, g } = canvas(256, 256);
  g.fillStyle = PAL.ceiling;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#c9cfdb";
  g.lineWidth = 5;
  g.strokeRect(0, 0, 256, 256);
  return toTex(c, [16 / 0.6, 12 / 0.6]);
};

/** Mint meeting-room wall with faint tile lines (0.3 m tiles). */
export const tileWallTex = (w: number, h: number) => {
  const { c, g } = canvas(256, 256);
  g.fillStyle = PAL.meetWall;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(40,110,60,0.28)";
  g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 256);
  return toTex(c, [w / 0.3, h / 0.3]);
};

/** Window view: bright sky gradient + flat city blocks with window grids. */
export const cityTex = () => {
  const { c, g } = canvas(2048, 512);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#8ec5ff");
  sky.addColorStop(1, "#e4f3ff");
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 512);
  const r = rng(11);
  const tones = ["#7fa6d9", "#6d93c9", "#9db9e2", "#86acd8", "#5f86bd"];
  let x = -20;
  while (x < 2048) {
    const w = 90 + r() * 160;
    const h = 160 + r() * 300;
    g.fillStyle = tones[Math.floor(r() * tones.length)];
    g.fillRect(x, 512 - h, w, h);
    g.fillStyle = "rgba(235,246,255,0.55)";
    for (let wy = 512 - h + 18; wy < 500; wy += 30) for (let wx = x + 12; wx < x + w - 18; wx += 26) g.fillRect(wx, wy, 12, 16);
    x += w + 6 + r() * 30;
  }
  return toTex(c);
};

/** Coffee-machine screen. */
export const machineScreenTex = (state: "ready" | "error" | "off") => {
  const { c, g } = canvas(256, 128);
  g.fillStyle = state === "off" ? "#20242c" : "#141a22";
  g.fillRect(0, 0, 256, 128);
  if (state !== "off") {
    g.fillStyle = state === "ready" ? "#45e08a" : "#ff4a3d";
    g.font = `800 58px ${UI_FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(state === "ready" ? "READY" : "ERROR", 128, 68);
  }
  return toTex(c);
};

/** A generic busy work screen (spreadsheet + bars), seeded. */
export const workScreenTex = (seed: number) => {
  const { c, g } = canvas(640, 400);
  const r = rng(seed);
  g.fillStyle = "#f4f7fc";
  g.fillRect(0, 0, 640, 400);
  g.fillStyle = "#3d6be0";
  g.fillRect(0, 0, 640, 36);
  g.fillStyle = "#dfe6f2";
  g.fillRect(0, 36, 120, 364);
  for (let i = 0; i < 7; i++) {
    g.fillStyle = "#c3cde0";
    rr(g, 16, 56 + i * 44, 88, 18, 6);
    g.fill();
  }
  if (seed % 2) {
    for (let i = 0; i < 6; i++) {
      const h = 60 + r() * 220;
      g.fillStyle = ["#3d6be0", "#2bb3a3", "#f2b632", "#ff7a6b"][i % 4];
      g.fillRect(170 + i * 74, 370 - h, 44, h);
    }
  } else {
    g.strokeStyle = "#c9d2e3";
    g.lineWidth = 2;
    for (let y = 60; y < 400; y += 30) {
      g.beginPath();
      g.moveTo(130, y);
      g.lineTo(640, y);
      g.stroke();
    }
    for (let x = 130; x < 640; x += 102) {
      g.beginPath();
      g.moveTo(x, 36);
      g.lineTo(x, 400);
      g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = "#8f9bb3";
      g.fillRect(140 + Math.floor(r() * 5) * 102, 68 + Math.floor(r() * 11) * 30, 50 + r() * 30, 10);
    }
  }
  return toTex(c);
};

/** Calendar app on Mika's monitor. grow 0→1 = new event block drawn down; cursor 0→1 = cursor travels to Send;
 *  clicked = Send pressed. Redrawn into the same canvas each frame of S5. */
export const makeCalendar = () => {
  const { c, g } = canvas(1280, 820);
  const tex = toTex(c);
  const draw = (grow: number, cursor: number, clicked: boolean) => {
    g.fillStyle = "#f6f8fc";
    g.fillRect(0, 0, 1280, 820);
    // title bar
    g.fillStyle = "#e3e8f2";
    g.fillRect(0, 0, 1280, 60);
    ["#ff6159", "#ffbd2e", "#28c941"].forEach((col, i) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(34 + i * 30, 30, 10, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = "#2a3244";
    g.font = `800 34px ${UI_FONT}`;
    g.textBaseline = "middle";
    g.fillText("Calendar", 140, 32);
    // day headers
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const gx = 110,
      gy = 120,
      cw = 230,
      rh = 78;
    g.font = `800 30px ${UI_FONT}`;
    g.textAlign = "center";
    days.forEach((d, i) => {
      g.fillStyle = i === 0 ? "#3d6be0" : "#55607a";
      g.fillText(d, gx + cw * i + cw / 2, 95);
    });
    g.textAlign = "left";
    // grid
    g.strokeStyle = "#d5dcea";
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      g.beginPath();
      g.moveTo(gx, gy + i * rh);
      g.lineTo(gx + cw * 5, gy + i * rh);
      g.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      g.beginPath();
      g.moveTo(gx + i * cw, gy);
      g.lineTo(gx + i * cw, gy + 8 * rh);
      g.stroke();
    }
    // existing events (no text needed beyond short labels)
    const ev = (day: number, r0: number, rows: number, col: string, label: string) => {
      g.fillStyle = col;
      rr(g, gx + day * cw + 8, gy + r0 * rh + 6, cw - 16, rows * rh - 12, 12);
      g.fill();
      g.fillStyle = "#ffffff";
      g.font = `800 26px ${UI_FONT}`;
      g.fillText(label, gx + day * cw + 24, gy + r0 * rh + 36);
    };
    ev(1, 0, 1, "#2bb3a3", "Standup");
    ev(2, 2, 2, "#9b8cf2", "Review");
    ev(3, 1, 1, "#f2b632", "1:1");
    ev(4, 4, 2, "#ff7a6b", "Planning");
    ev(1, 5, 1, "#2bb3a3", "Standup");
    // the new block on Monday
    if (grow > 0) {
      const h = (4 * rh - 12) * grow;
      g.fillStyle = "#3d6be0";
      rr(g, gx + 8, gy + 1 * rh + 6, cw - 16, Math.max(24, h), 14);
      g.fill();
      g.strokeStyle = "#1d3a99";
      g.lineWidth = 4;
      g.stroke();
      if (grow > 0.35) {
        g.fillStyle = "#ffffff";
        g.font = `800 30px ${UI_FONT}`;
        g.fillText("Coffee", gx + 26, gy + rh + 46);
        g.fillText("machine", gx + 26, gy + rh + 82);
        g.fillText("sync", gx + 26, gy + rh + 118);
      }
    }
    // Send button
    const bx = 1040,
      by = 760;
    g.fillStyle = clicked ? "#1d3a99" : "#3d6be0";
    rr(g, bx, by - 34, 200, 62, 16);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `800 32px ${UI_FONT}`;
    g.textAlign = "center";
    g.fillText("Send", bx + 100, by - 2);
    g.textAlign = "left";
    // cursor arrow
    if (cursor >= 0) {
      const x0 = gx + cw / 2,
        y0 = gy + 4 * rh;
      const x = x0 + (bx + 110 - x0) * cursor,
        y = y0 + (by - y0) * cursor;
      g.save();
      g.translate(x, y);
      g.scale(clicked ? 0.88 : 1, clicked ? 0.88 : 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 54);
      g.lineTo(14, 41);
      g.lineTo(25, 64);
      g.lineTo(35, 59);
      g.lineTo(24, 37);
      g.lineTo(42, 37);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      g.strokeStyle = "#141827";
      g.lineWidth = 4;
      g.stroke();
      g.restore();
    }
    tex.needsUpdate = true;
  };
  draw(0, -1, false);
  return { tex, draw };
};

/** Door sign. */
export const signTex = (text: string) => {
  const { c, g } = canvas(1024, 256);
  g.fillStyle = "#ffffff";
  rr(g, 8, 8, 1008, 240, 28);
  g.fill();
  g.strokeStyle = "#141827";
  g.lineWidth = 12;
  g.stroke();
  g.fillStyle = "#2346d6";
  g.font = `800 120px ${UI_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 512, 136);
  return toTex(c);
};

/** Sticky note. */
export const stickyTex = (lines: string[], color: string) => {
  const { c, g } = canvas(256, 256);
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(0,0,0,0.08)";
  g.fillRect(0, 0, 256, 36);
  g.fillStyle = "#2a2f45";
  g.font = `58px ${HAND_FONT}`;
  lines.forEach((l, i) => g.fillText(l, 22, 104 + i * 64));
  return toTex(c);
};

/** Whiteboard: marker sketch of the dead machine + the "plan". */
export const whiteboardTex = () => {
  const { c, g } = canvas(1800, 1100);
  g.fillStyle = "#fbfcfe";
  g.fillRect(0, 0, 1800, 1100);
  g.lineCap = "round";
  g.lineJoin = "round";
  // machine sketch
  g.strokeStyle = "#2b3a8f";
  g.lineWidth = 12;
  g.strokeRect(180, 260, 360, 440);
  g.strokeRect(240, 330, 240, 120);
  g.beginPath();
  g.moveTo(300, 700);
  g.lineTo(300, 760);
  g.moveTo(420, 700);
  g.lineTo(420, 760);
  g.stroke();
  // X eyes + frown
  g.strokeStyle = "#e0413a";
  g.lineWidth = 14;
  const X = (x: number, y: number) => {
    g.beginPath();
    g.moveTo(x - 28, y - 28);
    g.lineTo(x + 28, y + 28);
    g.moveTo(x + 28, y - 28);
    g.lineTo(x - 28, y + 28);
    g.stroke();
  };
  X(300, 520);
  X(420, 520);
  g.beginPath();
  g.arc(360, 650, 60, Math.PI * 1.15, Math.PI * 1.85);
  g.stroke();
  // arrows
  g.strokeStyle = "#141827";
  g.lineWidth = 10;
  const arrow = (x1: number, y1: number, x2: number, y2: number) => {
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 120, x2, y2);
    g.stroke();
    const a = Math.atan2(y2 - (Math.min(y1, y2) - 120), x2 - (x1 + x2) / 2);
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - 40 * Math.cos(a - 0.5), y2 - 40 * Math.sin(a - 0.5));
    g.moveTo(x2, y2);
    g.lineTo(x2 - 40 * Math.cos(a + 0.5), y2 - 40 * Math.sin(a + 0.5));
    g.stroke();
  };
  arrow(560, 420, 820, 330);
  arrow(560, 600, 820, 700);
  g.fillStyle = "#e0413a";
  g.font = `150px ${MARKER_FONT}`;
  g.fillText("WHY?", 860, 330);
  g.fillStyle = "#141827";
  g.font = `92px ${MARKER_FONT}`;
  g.fillText("PLAN:", 860, 610);
  g.fillStyle = "#2b3a8f";
  g.font = `76px ${MARKER_FONT}`;
  g.fillText("fix it?", 900, 710);
  g.fillText("new one?", 900, 800);
  g.fillText("another meeting?", 900, 890);
  return toTex(c);
};

/** Clock face (numerals 1–12, ticks). */
export const clockFaceTex = () => {
  const { c, g } = canvas(1024, 1024);
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(512, 512, 512, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#141827";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    g.lineWidth = big ? 14 : 5;
    const r0 = big ? 420 : 445;
    g.beginPath();
    g.moveTo(512 + Math.sin(a) * r0, 512 - Math.cos(a) * r0);
    g.lineTo(512 + Math.sin(a) * 478, 512 - Math.cos(a) * 478);
    g.stroke();
  }
  g.fillStyle = "#141827";
  g.font = `800 104px ${UI_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let n = 1; n <= 12; n++) {
    const a = (n / 12) * Math.PI * 2;
    g.fillText(String(n), 512 + Math.sin(a) * 338, 520 - Math.cos(a) * 338);
  }
  return toTex(c);
};

/** Cork board with pinned notes. */
export const corkTex = () => {
  const { c, g } = canvas(1024, 640);
  g.fillStyle = "#d9a066";
  g.fillRect(0, 0, 1024, 640);
  const r = rng(5);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(120,70,30,0.18)" : "rgba(255,230,190,0.18)";
    g.fillRect(r() * 1024, r() * 640, 4, 4);
  }
  const note = (x: number, y: number, col: string, rot: number, lines: string[]) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = col;
    g.fillRect(-110, -100, 220, 200);
    g.fillStyle = "#2a2f45";
    g.font = `46px ${HAND_FONT}`;
    lines.forEach((l, k) => g.fillText(l, -90, -30 + k * 52));
    g.fillStyle = "#e0413a";
    g.beginPath();
    g.arc(0, -84, 13, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  note(190, 200, "#fff27a", -0.06, ["team", "lunch!"]);
  note(470, 330, "#9fe6c5", 0.05, ["water", "plants"]);
  note(760, 210, "#ffb3c7", -0.03, ["be nice", "to the", "printer"]);
  return toTex(c);
};

// ---------------- faces ----------------
// The face is a sphere-segment "cap" over the front of the head: phi ±FACE_PHI around +z, theta ±FACE_THETA around
// the equator. Canvas (1024²) maps linearly to that patch, so an angle offset converts straight to pixels.
export const FACE_PHI = 0.95;
export const FACE_THETA = 0.9;
const fx = (phi: number) => 512 + (phi / (2 * FACE_PHI)) * 1024;
const fy = (theta: number) => 512 + (theta / (2 * FACE_THETA)) * 1024; // theta > 0 = below the equator

export type Expr = "neutral" | "calm" | "blink" | "smile" | "eager" | "wince" | "alarmed" | "talk";

export const faceTex = (skin: string, expr: Expr) => {
  const { c, g } = canvas(1024, 1024);
  g.clearRect(0, 0, 1024, 1024);
  const ink = "#141827";
  const eyeY = fy(-0.05);
  const eyes = [fx(-0.27), fx(0.27)];
  const ew = 34,
    eh = 58;
  // blush
  g.fillStyle = "rgba(255,120,120,0.30)";
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(fx(s * 0.43), fy(0.13), 52, 30, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const ex of eyes) {
    if (expr === "wince") {
      // squeezed shut: chevrons pointing inwards
      const s = ex < 512 ? 1 : -1;
      g.strokeStyle = ink;
      g.lineWidth = 15;
      g.beginPath();
      g.moveTo(ex - 30 * s, eyeY - 26);
      g.lineTo(ex + 26 * s, eyeY);
      g.lineTo(ex - 30 * s, eyeY + 26);
      g.stroke();
      continue;
    }
    if (expr === "blink" || expr === "smile") {
      g.strokeStyle = ink;
      g.lineWidth = 16;
      g.beginPath();
      if (expr === "blink") g.arc(ex, eyeY - 8, 34, Math.PI * 0.15, Math.PI * 0.85);
      else g.arc(ex, eyeY + 18, 34, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
      continue;
    }
    const big = expr === "eager" ? 1.15 : expr === "alarmed" ? 1.3 : 1;
    if (expr === "alarmed") {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(ex, eyeY, ew * big + 12, eh * big + 12, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = ink;
      g.lineWidth = 8;
      g.stroke();
    }
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(ex, eyeY, ew * big, eh * big, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(ex + 10, eyeY - 20, 11 * big, 13 * big, 0, 0, Math.PI * 2);
    g.fill();
    if (expr === "calm") {
      // heavy lids: ERASE the eye's top half (the head's own skin shows through: no painted square that could show
      // its edges in a close-up — review 2026-10-26) + a lid line
      g.save();
      g.globalCompositeOperation = "destination-out";
      g.fillRect(ex - 60, eyeY - 80, 120, 80);
      g.restore();
      g.strokeStyle = ink;
      g.lineWidth = 14;
      g.beginPath();
      g.moveTo(ex - 44, eyeY - 2);
      g.lineTo(ex + 44, eyeY - 2);
      g.stroke();
    }
  }
  // brows
  g.strokeStyle = ink;
  g.lineWidth = 12;
  for (const ex of eyes) {
    const lift = expr === "eager" || expr === "alarmed" ? -26 : expr === "calm" ? 6 : expr === "wince" ? 14 : 0;
    g.beginPath();
    g.moveTo(ex - 40, eyeY - 92 + lift);
    g.quadraticCurveTo(ex, eyeY - 108 + lift, ex + 40, eyeY - 92 + lift);
    g.stroke();
  }
  // mouth
  const my = fy(0.24);
  g.lineWidth = 13;
  g.beginPath();
  if (expr === "wince") {
    // gritted teeth: a white bar with tooth lines
    g.fillStyle = "#ffffff";
    rr(g, 512 - 60, my - 22, 120, 44, 10);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 9;
    g.stroke();
    for (const x of [-30, 0, 30]) {
      g.beginPath();
      g.moveTo(512 + x, my - 22);
      g.lineTo(512 + x, my + 22);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(452, my);
    g.lineTo(572, my);
    g.stroke();
  } else if (expr === "alarmed" || expr === "talk") {
    // open "o" mouth (alarmed) / open talking mouth
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(512, my + 6, expr === "talk" ? 34 : 24, expr === "talk" ? 22 : 30, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ff8a8a";
    g.beginPath();
    g.ellipse(512, my + 16, expr === "talk" ? 18 : 12, 8, 0, 0, Math.PI * 2);
    g.fill();
  } else if (expr === "eager") {
    g.fillStyle = ink;
    g.moveTo(512 - 52, my - 14);
    g.quadraticCurveTo(512, my + 70, 512 + 52, my - 14);
    g.closePath();
    g.fill();
    g.fillStyle = "#ff8a8a";
    g.beginPath();
    g.ellipse(512, my + 22, 24, 12, 0, 0, Math.PI * 2);
    g.fill();
  } else if (expr === "smile") {
    g.moveTo(512 - 50, my - 6);
    g.quadraticCurveTo(512, my + 46, 512 + 50, my - 6);
    g.stroke();
  } else if (expr === "calm") {
    g.moveTo(512 - 30, my + 4);
    g.quadraticCurveTo(512, my + 16, 512 + 30, my + 4);
    g.stroke();
  } else {
    g.moveTo(512 - 34, my);
    g.quadraticCurveTo(512, my + 22, 512 + 34, my);
    g.stroke();
  }
  return toTex(c);
};

// ---------------- v2 (style-match) painted textures ----------------

/** Painted wood: base tone, long grain strokes, a couple of knots, darker edge band. */
export const woodTex = (base: string, seed: number, repeat: [number, number] = [1, 1]) => {
  const { c, g } = canvas(1024, 512);
  g.fillStyle = base;
  g.fillRect(0, 0, 1024, 512);
  const r = rng(seed);
  const dark = new THREE.Color(base).multiplyScalar(0.78).getStyle();
  const light = new THREE.Color(base).lerp(new THREE.Color("#ffffff"), 0.18).getStyle();
  for (let i = 0; i < 46; i++) {
    const y = r() * 512;
    g.strokeStyle = r() > 0.4 ? dark : light;
    g.globalAlpha = 0.22 + r() * 0.25;
    g.lineWidth = 2 + r() * 5;
    g.beginPath();
    g.moveTo(-10, y);
    for (let x = 0; x <= 1040; x += 64) g.lineTo(x, y + Math.sin(x / (90 + r() * 60) + i) * (3 + r() * 6));
    g.stroke();
  }
  g.globalAlpha = 0.35;
  for (let k = 0; k < 2; k++) {
    const kx = 200 + r() * 620,
      ky = 120 + r() * 280;
    g.strokeStyle = dark;
    g.lineWidth = 4;
    for (let j = 1; j < 5; j++) {
      g.beginPath();
      g.ellipse(kx, ky, 10 * j + 6, 4 * j + 3, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  return toTex(c, repeat);
};

/** Early-morning window view: warm sunrise sky, cool silhouetted towers, lit windows. */
export const dawnCityTex = () => {
  const { c, g } = canvas(2048, 512);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#5b6fd6");
  sky.addColorStop(0.45, "#c98bd0");
  sky.addColorStop(0.75, "#ffb27a");
  sky.addColorStop(1, "#ffd99a");
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 512);
  const r = rng(11);
  const tones = ["#3d4fa8", "#34449a", "#4a5cb6", "#2f3d8c"];
  let x = -20;
  while (x < 2048) {
    const w = 90 + r() * 160;
    const h = 160 + r() * 300;
    g.fillStyle = tones[Math.floor(r() * tones.length)];
    g.fillRect(x, 512 - h, w, h);
    for (let wy = 512 - h + 18; wy < 500; wy += 30)
      for (let wx = x + 12; wx < x + w - 18; wx += 26) {
        g.fillStyle = r() > 0.55 ? "rgba(255,214,140,0.85)" : "rgba(120,140,220,0.5)";
        g.fillRect(wx, wy, 12, 16);
      }
    x += w + 6 + r() * 30;
  }
  return toTex(c);
};

/** Label plate for the coffee machine (painted, slightly worn). */
export const machineLabelTex = () => {
  const { c, g } = canvas(1024, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#ffcf4d");
  grad.addColorStop(1, "#f0a72c");
  g.fillStyle = grad;
  rr(g, 6, 6, 1012, 244, 30);
  g.fill();
  g.strokeStyle = "#141827";
  g.lineWidth = 12;
  g.stroke();
  g.fillStyle = "#c2271f";
  g.font = `800 132px ${UI_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("COFFEE", 512, 118);
  g.fillStyle = "#3b2a10";
  g.font = `800 40px ${UI_FONT}`;
  g.fillText("OFFICE  ESPRESSO", 512, 206);
  // scuffs
  const r = rng(3);
  g.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 40; i++) g.fillRect(30 + r() * 960, 20 + r() * 210, 2 + r() * 10, 2);
  return toTex(c);
};

/** Flat-drawn torso: the top's colour plus ink detail lines. three r186 CapsuleGeometry puts the front (+z) at
 *  u = 0.25 and spaces v by arc length (top cap ≈ canvas y 0–176, straight part 176–336, bottom cap 336–512),
 *  so map.offset.x = 0.25 brings the canvas centre to the front; the chin hides roughly y < 100. */
export const torsoDetailTex = (color: string, style: "hoodie" | "vneck" | "cardigan" | "crew") => {
  const { c, g } = canvas(1024, 512);
  g.fillStyle = color;
  g.fillRect(0, 0, 1024, 512);
  const ink = "#0e1120";
  g.strokeStyle = ink;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.lineWidth = 12;
  const cx = 512;
  if (style === "hoodie") {
    g.beginPath(); // hood edge
    g.moveTo(cx - 120, 118);
    g.quadraticCurveTo(cx, 190, cx + 120, 118);
    g.stroke();
    g.beginPath(); // drawstrings
    g.moveTo(cx - 34, 170);
    g.lineTo(cx - 40, 238);
    g.moveTo(cx + 34, 170);
    g.lineTo(cx + 40, 238);
    g.stroke();
    g.beginPath(); // kangaroo pocket
    g.moveTo(cx - 120, 350);
    g.lineTo(cx - 80, 272);
    g.lineTo(cx + 80, 272);
    g.lineTo(cx + 120, 350);
    g.stroke();
  } else if (style === "vneck") {
    g.beginPath();
    g.moveTo(cx - 90, 110);
    g.lineTo(cx, 215);
    g.lineTo(cx + 90, 110);
    g.stroke();
    g.lineWidth = 6;
    for (const y of [392, 414]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(1024, y);
      g.stroke();
    }
  } else if (style === "cardigan") {
    g.beginPath();
    g.moveTo(cx - 80, 110);
    g.lineTo(cx, 200);
    g.lineTo(cx + 80, 110);
    g.moveTo(cx, 200);
    g.lineTo(cx, 470);
    g.stroke();
    g.fillStyle = ink;
    for (const y of [245, 295, 345]) {
      g.beginPath();
      g.arc(cx + 22, y, 9, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    g.beginPath();
    g.ellipse(cx, 112, 110, 46, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(0, 300);
    g.lineTo(1024, 300);
    g.stroke();
  }
  const t = toTex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.offset.x = 0.25;
  return t;
};

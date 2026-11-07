// The app's cast layer for the 3D Cartoon film style (owner #1287, #1288, #1290: MW Character Sheet v1, method A), as ricks-cast.js is Ricks Clip's:
// what the sheet standard asks for that the source skill's rig does not draw, written by the app in the source skill's own hand, beside its code
// (never in it, #1198). A film imports it as "mw:c3d-cast"; a library character's file does not need it.
//   setFace(c, face)   the standard's 8 faces: the source skill's own where it has one (neutral, smile = happy, alarmed = surprised, wince =
//                      worried, talk, blink; and its calm and eager by their own names), and two the app draws: laugh and angry, on the face
//                      cap exactly as faceTex draws (the same 1024² canvas mapped to FACE_PHI × FACE_THETA, the same ink, eyes, blush)
//   POINT, WAVE        two arm poses as joint angles on the source skill's STAND (no drawing): the right arm pointing ahead, the right hand up
//   talkFace(t)        a simple talking flap (no lip sync, as the source skill: "there is no lip-sync"): talk and neutral by turns
// Credit: Moworks Studio (the app's own code), on the owner's 3D Cartoon source skill.
import * as THREE from "three";
import { STAND, type Character, type Pose } from "cartoon-3d/kit/character";
import { FACE_PHI, FACE_THETA, type Expr } from "cartoon-3d/kit/textures";

/** The sheet standard's faces, in its order. */
export const FACES = ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"] as const;
export type Face = (typeof FACES)[number] | Expr;
/** The standard's names for the source skill's own faces. */
export const SOURCE_FACE: Record<string, Expr> = { neutral: "neutral", happy: "smile", surprised: "alarmed", worried: "wince", talk: "talk", blink: "blink" };
/** The faces the app draws itself. */
export const APP_FACES = ["laugh", "angry"] as const;

const fx = (phi: number) => 512 + (phi / (2 * FACE_PHI)) * 1024;
const fy = (theta: number) => 512 + (theta / (2 * FACE_THETA)) * 1024;
const INK = "#141827";

/** One of the app's faces, drawn as the source skill's faceTex draws: a transparent 1024² canvas over the face cap. */
export function appFaceTex(face: (typeof APP_FACES)[number]): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  g.lineCap = "round";
  g.lineJoin = "round";
  const eyeY = fy(-0.05), eyes = [fx(-0.27), fx(0.27)], my = fy(0.24);
  // blush, as faceTex (a stronger one for the laugh)
  g.fillStyle = face === "laugh" ? "rgba(255,110,110,0.42)" : "rgba(255,120,120,0.22)";
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx(s * 0.43), fy(0.13), 52, 30, 0, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = INK; g.fillStyle = INK;
  if (face === "laugh") {
    // eyes squeezed into happy arcs (faceTex's smile eyes, pressed higher), brows up
    g.lineWidth = 16;
    for (const ex of eyes) { g.beginPath(); g.arc(ex, eyeY + 10, 36, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.lineWidth = 12;
    for (const ex of eyes) { g.beginPath(); g.moveTo(ex - 40, eyeY - 112); g.quadraticCurveTo(ex, eyeY - 130, ex + 40, eyeY - 112); g.stroke(); }
    // a wide open mouth: a D, flat on top, with the tongue (faceTex's eager mouth, bigger)
    g.beginPath(); g.moveTo(512 - 78, my - 22); g.lineTo(512 + 78, my - 22); g.quadraticCurveTo(512, my + 110, 512 - 78, my - 22); g.closePath(); g.fill();
    g.fillStyle = "#ffffff"; g.fillRect(512 - 56, my - 22, 112, 16);
    g.fillStyle = "#ff8a8a"; g.beginPath(); g.ellipse(512, my + 36, 34, 16, 0, 0, Math.PI * 2); g.fill();
  } else {
    // angry: eyes a little narrowed under brows slanted down to the middle, a frown
    for (const ex of eyes) {
      g.beginPath(); g.ellipse(ex, eyeY + 4, 32, 46, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(ex + 9, eyeY - 12, 10, 11, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = INK;
    }
    g.save(); g.globalCompositeOperation = "destination-out";
    for (const ex of eyes) { const s = ex < 512 ? 1 : -1; g.beginPath(); g.moveTo(ex - 60, eyeY - 60); g.lineTo(ex + 60, eyeY - 60); g.lineTo(ex + 60, eyeY - 30 + 22 * s); g.lineTo(ex - 60, eyeY - 30 - 22 * s); g.closePath(); g.fill(); }
    g.restore();
    g.lineWidth = 15;
    for (const ex of eyes) { const s = ex < 512 ? 1 : -1; g.beginPath(); g.moveTo(ex - 44 * s, eyeY - 96); g.lineTo(ex + 40 * s, eyeY - 62); g.stroke(); }
    g.lineWidth = 13;
    g.beginPath(); g.moveTo(512 - 46, my + 18); g.quadraticCurveTo(512, my - 26, 512 + 46, my + 18); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const appTex = new Map<string, THREE.Texture>();
/** The face cap of a character the source skill built (the transparent sphere patch just over the head). */
const faceCap = (c: Character) => {
  let cap: THREE.Mesh | null = null;
  c.parts.head.traverse((o: any) => { if (!cap && o.isMesh && o.material?.transparent && o.geometry?.type === "SphereGeometry" && o.geometry.parameters?.phiLength < Math.PI) cap = o; });
  return cap as THREE.Mesh | null;
};
/** Give a character one of the standard's faces (or any of the source skill's own by its name). */
export function setFace(c: Character, face: Face) {
  if ((APP_FACES as readonly string[]).includes(face)) {
    c.setExpr("neutral");          // the source skill's own state first, so its next setExpr puts its face back
    const cap = faceCap(c);
    if (!cap) return;
    if (!appTex.has(face)) appTex.set(face, appFaceTex(face as (typeof APP_FACES)[number]));
    const m = cap.material as THREE.MeshBasicMaterial;
    m.map = appTex.get(face)!; m.needsUpdate = true;
    return;
  }
  c.setExpr((SOURCE_FACE[face] ?? face) as Expr);
}
/** A simple talking flap: the open mouth and the closed one by turns, about four a second (t in seconds). */
export const talkFace = (t: number): Face => (Math.floor(t * 8) % 2 ? "neutral" : "talk");

/** The right arm pointing out to the side, a little ahead (it reads from the front and in profile), the left at rest. */
export const POINT: Pose = { ...STAND, rShX: -0.35, rShZ: -1.45, rEl: -0.05, headTurn: -0.25 };
/** The right hand up beside the head, the forearm up, as in a wave (sway it with WAVE_AT). */
export const WAVE: Pose = { ...STAND, rShX: -0.15, rShZ: -2.35, rEl: -1.2 };
/** The wave in motion: the forearm swinging (t in seconds). */
export const WAVE_AT = (t: number): Pose => ({ ...WAVE, rEl: -1.2 + 0.35 * Math.sin(t * 9) });

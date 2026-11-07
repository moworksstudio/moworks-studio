// Leo, a vault inspector of the owner's 3D Cartoon source skill's worked example "cheese-bank-vault", adapted for the Character library (owner
// #1287-#1293): his CharDef (src/examples/cheese-bank-vault/world.ts LEO) built by the source skill's buildCharacter, and his white coat with a red pen
// in the pocket, drawn by a copy of that example's coatTex / torsoCanvas / dress (the example keeps them inside its world.ts, not exported). His torch
// is a light of the example's scene, not of him: left out. Nothing of the source skill is changed.
import * as THREE from "three";
import { buildCharacter, type CharDef, type Character } from "cartoon-3d/kit/character";
import { INK } from "cartoon-3d/kit/lib";
import { makeCanvas, toTex } from "cartoon-3d/kit/textures";

const DEF: CharDef = { name: "Leo", top: "#eef1f4", skin: "#d6a27c", hair: "#b8572b", style: "tuft" };
const PEN = "#e0413a";

/** The example's flat-drawn torso texture in the kit's layout (front centre x = 512, chin hides y < 100). */
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

export const CHARACTER = {
  id: "moworks-leo",
  name: "Leo",
  about: "A vault inspector from the 3D Cartoon worked example: a white lab coat with a red pen, a tuft of ginger hair.",
  heightM: 1.76,
  def: DEF,
  build: (): Character => {
    const c = buildCharacter(DEF);
    const body = c.parts.torso.children[0] as THREE.Mesh;          // the example's dress(): the torso's capsule, its first child
    body.material = new THREE.MeshBasicMaterial({ map: coatTex(PEN) });
    return c;
  },
};

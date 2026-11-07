// Noor, the doctor of the owner's 3D Cartoon source skill's worked example "what-if-no-pain", adapted for the Character library (owner #1287-#1293):
// her CharDef (src/examples/what-if-no-pain/world.ts: Otto's with her own name, colours and hair) built by the source skill's buildCharacter, her white
// coat over teal scrubs and her stethoscope, by a copy of that example's coatTex and stethoscope code (the example keeps them inside its world.ts, not
// exported). Nothing of the source skill is changed.
import * as THREE from "three";
import { buildCharacter, CAST, type CharDef, type Character } from "cartoon-3d/kit/character";
import { fill, INK } from "cartoon-3d/kit/lib";
import { makeCanvas, toTex } from "cartoon-3d/kit/textures";

const DEF: CharDef = { ...CAST.otto, name: "Noor", top: "#f4f6fb", skin: "#b07a55", hair: "#b9bfcc", style: "tuft" };

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

export const CHARACTER = {
  id: "moworks-noor",
  name: "Noor",
  about: "The doctor from the 3D Cartoon What-If example: a white coat over teal scrubs, a stethoscope, silver hair.",
  heightM: 1.66,
  def: DEF,
  build: (): Character => {
    const noor = buildCharacter(DEF);
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
    return noor;
  },
};

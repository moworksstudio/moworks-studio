// __COMP__ — the world (sets, props, cast, lights). Metres, y up, +z towards the front of the set.
// Start from this small room and replace/extend it per script. Rules (.claude/skills/cartoon-video/references/STAGING.md):
//  · furniture = box()/cyl() so the collision QA sees it; name important pieces (mesh.name) for readable QA output
//  · every light that is a lamp/screen glow goes into `practicals` (looks scale them)
//  · give the window both day and dawn views so looks can switch the mood
import * as THREE from "three";
import { PAL, box, cyl, flat, plane, shadowed, sphere, toon } from "../../kit/lib";
import { buildCharacter, CAST, Character } from "../../kit/character";
import { carpetTex, cityTex, dawnCityTex, workScreenTex } from "../../kit/textures";
import type { KitLights } from "../../kit/looks";

export type World = {
  scene: THREE.Scene;
  lights: KitLights;
  setSky: (sky: "day" | "dawn") => void;
  cast: { mika: Character; ravi: Character };
  seats: THREE.Object3D[];
};

const plant = (x: number, y: number, z: number, s = 1) => {
  const g = new THREE.Group();
  g.add(cyl(0.13, 0.1, 0.26, "#f2efe8", 24, 0, 0, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = sphere(0.1, i % 2 ? "#3fae6a" : "#2f9a5c", Math.sin(a) * 0.1, 0.38 + (i % 3) * 0.08, Math.cos(a) * 0.1, 16);
    leaf.scale.set(0.8, 1.35, 0.8);
    g.add(leaf);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  return shadowed(g);
};

export const buildWorld = (): World => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dfe9f7");

  // lights: looks drive hemi/key/practicals per shot
  const hemi = new THREE.HemisphereLight("#ffffff", "#8a98d6", 2.6);
  const key = new THREE.DirectionalLight("#fff3df", 2.0);
  key.position.set(-3, 9, -11);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -8;
  sc.right = sc.top = 8;
  sc.near = 1;
  sc.far = 30;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  const lamp = new THREE.PointLight("#ffd29a", 4, 5, 1.6);
  lamp.position.set(1.4, 2.2, -1.6);
  scene.add(hemi, key, key.target, lamp);

  // room 8 × 8 m, back wall at z = −4 with a window
  const floor = plane(8, 8, toon("#ffffff", { map: carpetTex(), key: "carpet" }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const wall = box(8, 3, 0.2, PAL.wall, 0, 0, -4.1);
  wall.name = "back wall";
  scene.add(wall, box(0.2, 3, 8, PAL.wall, -4.1, 0, 0));
  scene.add(box(8, 0.08, 0.03, PAL.wallStripe, 0, 0.96, -3.99), box(0.03, 0.08, 8, PAL.wallStripe, -3.99, 0.96, 0));
  const day = cityTex();
  const dawn = dawnCityTex();
  const windowMat = flat("#ffffff", day);
  const view = plane(3, 1.3, windowMat);
  view.position.set(0.5, 1.85, -3.98);
  scene.add(view);
  scene.add(box(3.1, 0.06, 0.12, "#f7f9fc", 0.5, 1.17, -3.95), box(3.1, 0.05, 0.12, "#f7f9fc", 0.5, 2.5, -3.95));

  // a desk with a monitor (the hero prop of the example)
  const desk = box(1.4, 0.05, 0.76, PAL.deskTop, 1.0, 0.7, -2.4);
  desk.name = "desk top";
  scene.add(desk, box(0.04, 0.7, 0.7, PAL.deskSide, 0.34, 0, -2.4), box(0.04, 0.7, 0.7, PAL.deskSide, 1.66, 0, -2.4));
  const mon = new THREE.Group();
  mon.add(box(0.22, 0.015, 0.16, PAL.screenBezel, 0, 0, 0), box(0.05, 0.1, 0.035, PAL.screenBezel, 0, 0.01, -0.02));
  mon.add(box(0.62, 0.4, 0.035, PAL.screenBezel, 0, 0.095, 0));
  const screen = plane(0.58, 0.36, flat("#ffffff", workScreenTex(3)));
  (screen.material as THREE.MeshBasicMaterial).color.setScalar(1.3);
  screen.position.set(0, 0.295, 0.0185);
  mon.add(screen);
  mon.position.set(1.0, 0.75, -2.65);
  scene.add(shadowed(mon), plant(-3.4, 0, -3.4, 1.3), plant(1.55, 0.75, -2.6, 0.5));

  const cast = { mika: buildCharacter(CAST.mika), ravi: buildCharacter(CAST.ravi) };
  scene.add(cast.mika.root, cast.ravi.root);

  return {
    scene,
    lights: { hemi, key, practicals: [lamp] },
    setSky: (sky) => {
      windowMat.map = sky === "dawn" ? dawn : day;
    },
    cast,
    seats: [],
  };
};

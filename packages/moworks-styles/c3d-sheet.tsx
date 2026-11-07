// The model sheet and the checks of a 3D Cartoon character (owner #1267, audit/111 B6; MW Character Sheet v1, owner #1287-#1293): the app's own
// composition, drawn by the owner's 3D Cartoon source skill as shipped (its ToonVideo, its rig, its looks) with the app's cast layer (c3d-cast.ts:
// the laugh and angry faces, the point and wave poses), in a small staged project (c3d-page.mjs copies this file to src/videos/film/Video.tsx with
// __ID__ and __SHIPPED__ filled in, and the character's file to src/videos/film/cast/__ID__.ts). Seconds 0-22: the sheet's 22 cells, one a second, in
// the standard's order (views, faces, poses, the walk's phases; c3d-page.mjs lays them on the one sheet frame); 22-28: the life clip (idle with a blink, a turn through the views, a walk, a talk).
// No credit or other text on the sheet but the name and the row and column labels (#1290). SheetCheck (?skill-check=1) runs the gate on the
// character's module and prints "PASS …" / "FAIL …" lines.
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { ToonVideo } from "../../kit/ToonVideo";
import { CAST, SIT, STAND, buildCharacter, mixPose, poseReach, walkPose, type Character, type Pose } from "../../kit/character";
import { box, plane, setFlatChars, setLook, toon } from "../../kit/lib";
import { LOOKS } from "../../kit/looks";
import { FACES, POINT, WAVE, WAVE_AT, setFace, talkFace } from "mw:c3d-cast";
import { CHARACTER } from "./cast/__ID__";

export const FPS = 30, ROWS_S = 22, LIFE_S = 6, FRAMES = (ROWS_S + LIFE_S) * FPS, WIDTH = 1920, HEIGHT = 1080;
const ID = "__ID__";
/** A character the app ships from a source skill's own cast or its examples (moworks-…): checked as shipped, not as a new original. */
const SHIPPED: boolean = __SHIPPED__;
export const EXPRS = ["neutral", "calm", "blink", "smile", "eager", "wince", "alarmed", "talk"] as const;
const STYLES = ["tuft", "glasses", "bun", "beanie"];
const ROWS = [
  { title: "Views", cols: ["front", "three-quarter", "profile", "back"] },
  { title: "Faces", cols: [...FACES] as string[] },
  { title: "Poses", cols: ["stand", "walk", "point", "wave", "reach", "sit"] },
  { title: "Walk", cols: ["contact", "pass", "contact", "pass"] },
];
const FOV = 30;
/** The sheet's cells one a second (the one sheet frame of every engine, packages/character-kit/sheet-frame.js): the character alone in the
 *  middle, the same camera for every cell so the sizes keep to one another; c3d-page.mjs cuts each still's middle into its cell. */
export const CELLS = ROWS.flatMap((r) => r.cols.map((col, i) => ({ row: r.title, col, i })));
const CAM_Z = 4.4;

type W = { scene: THREE.Scene; lights: any; setSky: (s: "day" | "dawn") => void; copies: Character[] };

const buildWorld = (): W => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f3ead8");
  const hemi = new THREE.HemisphereLight("#ffffff", "#8a98d6", 2.6);
  const key = new THREE.DirectionalLight("#fff3df", 2.0);
  key.position.set(-3, 9, 8);
  scene.add(hemi, key, key.target);
  const floor = plane(40, 30, toon("#efe3cc"));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor, box(40, 7, 0.2, "#f3ead8", 0, 0, -3));
  const copies = Array.from({ length: 8 }, () => { const c = CHARACTER.build(); scene.add(c.root); return c; });
  return { scene, lights: { hemi, key, practicals: [] }, setSky: () => {}, copies };
};


const apply = (w: W, cam: THREE.PerspectiveCamera, out: number) => {
  const T = out / FPS;
  w.copies.forEach((c) => { c.root.visible = false; c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.setPose(STAND); setFace(c, "neutral"); });
  cam.fov = FOV;
  if (T < ROWS_S) {
    // one cell a second: the character alone in the middle (its row and column), the same camera for all
    const { row: title, col, i } = CELLS[Math.floor(T)], c = w.copies[0];
    c.root.visible = true;
    if (title === "Views") c.root.rotation.y = [0, -Math.PI / 4, -Math.PI / 2, Math.PI][i];
    if (title === "Faces") setFace(c, col as any);
    if (title === "Poses") {
      if (col === "walk") c.setPose(walkPose(0.25));
      // the pointing arm reaches out to the left: the figure stands a little right of the middle, so the hand stays in its cell
      if (col === "point") { c.setPose(POINT); c.root.position.x = 0.28; }
      if (col === "wave") { c.setPose(WAVE); setFace(c, "happy"); }
      if (col === "sit") c.setPose(SIT);
      if (col === "reach") { c.root.updateMatrixWorld(true); poseReach(c, STAND, { r: c.parts.torso.localToWorld(new THREE.Vector3(-0.42, 0.75, 0.25)) }); }
    }
    if (title === "Walk") { c.root.rotation.y = -Math.PI / 2; c.setPose(walkPose(i * 0.25)); }
    cam.position.set(0, 1.05, CAM_Z);
    cam.lookAt(0, 0.95, 0);
  } else {
    // the life clip: idle with a blink (1.5 s), a turn through the views (2 s), a walk on the spot (1.5 s), a talk (1 s)
    const t = T - ROWS_S, c = w.copies[0];
    c.root.visible = true;
    if (t < 1.5) { c.setPose({ ...STAND, bob: 0.012 * Math.sin(t * 5), headTilt: 0.03 * Math.sin(t * 2.3) }); setFace(c, t > 0.8 && t < 0.95 ? "blink" : "neutral"); }
    else if (t < 3.5) { c.root.rotation.y = -Math.PI * 2 * ((t - 1.5) / 2); c.setPose({ ...STAND, bob: 0.01 * Math.sin(t * 5) }); setFace(c, t > 2.4 && t < 3 ? "happy" : "neutral"); }
    else if (t < 5) { c.root.rotation.y = -Math.PI / 2; c.setPose(walkPose((t - 3.5) * 1.4)); setFace(c, "neutral"); }
    else { c.setPose({ ...WAVE_AT(t), headTilt: 0.02 * Math.sin(t * 7) }); setFace(c, talkFace(t)); }
    cam.position.set(0, 1.1, 5.2);
    cam.lookAt(0, 1.0, 0);
    cam.fov = 32;          // the whole figure, the hair included, with a margin
  }
  return { look: LOOKS.wideBright, focus: new THREE.Vector3(0, 0.9, 0) };
};

export const Sheet: React.FC = () => <AbsoluteFill><ToonVideo build={buildWorld} apply={apply} words={[]} /></AbsoluteFill>;
export default Sheet;

// ---- the gate
const HEX = /^#[0-9a-f]{6}$/i;
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
const LIT = ["MeshStandardMaterial", "MeshPhysicalMaterial", "MeshPhongMaterial", "MeshLambertMaterial"];
const sizeOf = (o: THREE.Object3D) => { o.updateMatrixWorld(true); const b = new THREE.Box3(); o.traverse((m: any) => { if (m.isMesh && m.userData.char) b.expandByObject(m); }); return b; };
const sig = (c: Character) => { const b = sizeOf(c.root), parts: string[] = []; c.root.traverse((m: any) => { if (m.isMesh) parts.push(`${m.geometry?.type}:${m.material?.color?.getHexString?.() ?? ""}`); }); return `${parts.join(",")}|${b.min.toArray().map((x) => x.toFixed(3))}|${b.max.toArray().map((x) => x.toFixed(3))}`; };

export function checkLines(): string[] {
  const out: string[] = [], ok = (pass: boolean, what: string, why = "") => out.push(`${pass ? "PASS" : "FAIL"}  ${what}${!pass && why ? `: ${why}` : ""}`);
  setLook("v2"); setFlatChars(true);
  const C: any = CHARACTER;
  ok(!!C && typeof C === "object", "the file exports CHARACTER");
  if (!C) return out;
  ok(C.id === ID, "the character's id is its file's name", `id "${C.id}", file "${ID}"`);
  ok(typeof C.name === "string" && C.name.trim().length > 0 && C.name.length <= 40, "a name of 1-40 letters");
  ok(typeof C.about === "string" && C.about.trim().length >= 10 && C.about.length <= 300, "about: one line on who it is (10-300 letters)");
  ok(Number(C.heightM) >= 0.5 && Number(C.heightM) <= 2.3, "its real height in metres (heightM, 0.5-2.3)", `heightM ${C.heightM}`);
  const d = C.def ?? {};
  ok(typeof d.name === "string" && d.name.length > 0, "def: the source skill's CharDef, with its name");
  ok(["top", "skin", "hair"].every((k) => HEX.test(String(d[k] ?? ""))), "def: top, skin and hair as #rrggbb", ["top", "skin", "hair"].map((k) => `${k} ${d[k]}`).join(", "));
  ok(STYLES.includes(d.style), `def: a hair style the source skill draws (${STYLES.join(", ")})`, `style ${d.style}`);
  const cast = Object.values(CAST);
  const same = cast.find((x) => ["top", "skin", "hair", "style"].every((k) => String((x as any)[k]).toLowerCase() === String(d[k]).toLowerCase()));
  if (SHIPPED) {
    // the source skill's own cast or an example's extra, shipped by the app (moworks-…): as shipped, so the two originality lines do not apply
    ok(ID.startsWith("moworks-"), "a shipped character's id takes the prefix moworks-");
  } else {
    ok(!same, "an original: not one of the source skill's own four", same ? `it is ${same.name}` : "");
    const near = HEX.test(String(d.top ?? "")) ? cast.find((x) => dist(x.top, d.top) < 40) : null;
    ok(!near, "a top colour none of the cast wears (STYLE.md: contrast)", near ? `too close to ${near.name}'s ${near.top}` : "");
  }
  let a: Character | null = null, b: Character | null = null;
  try { a = C.build(); b = C.build(); } catch (e) { ok(false, "build() makes it", String((e as Error)?.message ?? e).split("\n")[0]); return out; }
  const parts = a?.parts ?? ({} as any);
  ok(!!a?.root?.isObject3D && ["lHand", "rHand", "lShin", "rShin", "head", "torso"].every((k) => parts[k]?.isObject3D) && typeof a.setPose === "function" && typeof a.setExpr === "function",
    "build() returns the source skill's Character (root, parts, setPose, setExpr): made on buildCharacter");
  if (!a?.root?.isObject3D) return out;
  ok(sig(a) === sig(b!), "the same every time (no random number in it)");
  const meshes: any[] = [];
  a.root.traverse((m: any) => { if (m.isMesh) meshes.push(m); });
  const loose = meshes.filter((m) => !m.userData.char && !(m.userData.noGbuffer && m.geometry?.type === "CircleGeometry"));
  ok(!loose.length, "every part is the character's (userData.char = true), so the collision check sees it", `${loose.length} part(s) without it`);
  const lit = meshes.filter((m) => LIT.includes(m.material?.type));
  ok(!lit.length, "flat-drawn: no lit or shaded material on the character (STYLE.md)", lit.map((m) => m.material.type).join(", "));
  ok(["lHand", "rHand"].every((k) => parts[k].children.some((m: any) => m.isMesh && m.geometry?.type === "SphereGeometry")), "both hand spheres in place (held props are gripped by them)");
  const s = sizeOf(a.root), h = s.max.y - s.min.y;
  const castBox = cast.map((x) => sizeOf(buildCharacter(x).root)), castH = castBox.map((z) => z.max.y - z.min.y), lo = Math.min(...castH), hi = Math.max(...castH);
  const sole = castBox.reduce((m, z) => m + z.min.y, 0) / castBox.length;          // the cast's own feet (the soles sit a little above y = 0)
  ok(Math.abs(s.min.y - sole) <= 0.03, "stands on the floor as the cast does", `lowest point ${s.min.y.toFixed(3)} m, the cast's ${sole.toFixed(3)} m`);
  ok(h >= lo * 0.75 && h <= hi * 1.3, `about the cast's size (${(lo * 0.75).toFixed(2)}-${(hi * 1.3).toFixed(2)} m tall in the world)`, `${h.toFixed(2)} m`);
  ok(s.max.x - s.min.x <= 1.6 && s.max.z - s.min.z <= 1.6, "nothing sticks out far (within 1.6 m across)", `${(s.max.x - s.min.x).toFixed(2)} × ${(s.max.z - s.min.z).toFixed(2)} m`);
  const bad: string[] = [];
  for (const e of EXPRS) { try { a.setExpr(e as any); } catch (x) { bad.push(`${e}: ${String((x as Error)?.message ?? x).split("\n")[0]}`); } }
  ok(!bad.length, `every face of the source skill draws (${EXPRS.join(", ")})`, bad.join("; "));
  const badStd: string[] = [];
  for (const f of FACES) { try { setFace(a, f as any); } catch (x) { badStd.push(`${f}: ${String((x as Error)?.message ?? x).split("\n")[0]}`); } }
  setFace(a, "neutral");
  ok(!badStd.length, `every face of the sheet standard draws (${FACES.join(", ")})`, badStd.join("; "));
  const poses: [string, Pose][] = [["stand", STAND], ["sit", SIT], ["walk", walkPose(0.25)], ["walk", walkPose(0.75)], ["half walk", mixPose(STAND, walkPose(0.5), 0.5)], ["point", POINT], ["wave", WAVE]];
  const broken: string[] = [];
  for (const [n, p] of poses) { try { a.setPose(p); const z = sizeOf(a.root); if (![z.min.x, z.min.y, z.max.x, z.max.y].every(Number.isFinite)) broken.push(n); } catch (x) { broken.push(`${n}: ${String((x as Error)?.message ?? x).split("\n")[0]}`); } }
  try { a.setPose(STAND); a.root.updateMatrixWorld(true); poseReach(a, STAND, { r: a.parts.torso.localToWorld(new THREE.Vector3(-0.42, 0.75, 0.25)) }); } catch (x) { broken.push(`reach: ${String((x as Error)?.message ?? x).split("\n")[0]}`); }
  ok(!broken.length, "every pose holds together (stand, sit, walk, point, wave, a reach with poseReach)", broken.join("; "));
  return out;
}

export const SheetCheck: React.FC = () => {
  const [handle] = useState(() => delayRender("character check"));
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    let l: string[];
    try { l = checkLines(); } catch (e) { l = [`FAIL  the checks ran: ${String((e as Error)?.message ?? e).split("\n")[0]}`]; }
    l.forEach((x) => console.log(x));
    (window as any).__c3Lines = l;
    try { const C: any = CHARACTER; (window as any).__c3Record = { id: C?.id ?? null, name: C?.name ?? null, about: C?.about ?? null, heightM: Number(C?.heightM) || null, def: C?.def ? { name: C.def.name, top: C.def.top, skin: C.def.skin, hair: C.def.hair, style: C.def.style } : null }; } catch { /* the lines say what is wrong */ }
    setLines(l);
    continueRender(handle);
  }, [handle]);
  return <AbsoluteFill style={{ background: "#fff", padding: 40, fontSize: 22, fontFamily: "monospace" }}>{lines.map((l, i) => <div key={i}>{l}</div>)}</AbsoluteFill>;
};

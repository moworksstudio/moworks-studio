// The model sheet and the checks of a 3D Cartoon character made on the Characters page (owner #1267, audit/111 B6): the app's own composition,
// drawn by the owner's 3D Cartoon source skill as shipped (its ToonVideo, its rig, its looks), in a small staged project (c3d-page.mjs copies this
// file to src/videos/film/Video.tsx with __ID__ filled in, and the character's file to src/videos/film/cast/__ID__.ts). Seconds 0-3: three rows of
// the sheet, one a second (views, faces, poses); 3-7: the life clip (a turn through the views, then a walk). SheetCheck (?skill-check=1) runs
// the gate on the character's module and prints "PASS …" / "FAIL …" lines.
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { ToonVideo } from "../../kit/ToonVideo";
import { CAST, SIT, STAND, buildCharacter, mixPose, poseReach, walkPose, type Character, type Pose } from "../../kit/character";
import { box, plane, setFlatChars, setLook, toon } from "../../kit/lib";
import { LOOKS } from "../../kit/looks";
import { CHARACTER } from "./cast/__ID__";

export const FPS = 30, FRAMES = 7 * FPS, WIDTH = 1920, HEIGHT = 1080;
const ID = "__ID__";
export const EXPRS = ["neutral", "calm", "blink", "smile", "eager", "wince", "alarmed", "talk"] as const;
const STYLES = ["tuft", "glasses", "bun", "beanie"];
const ROWS = [
  { title: "Views", cols: ["front", "three-quarter", "profile", "back"] },
  { title: "Faces", cols: ["neutral", "smile", "eager", "wince", "alarmed", "talk"] },
  { title: "Poses", cols: ["stand", "walk", "walk", "reach", "sit"] },
];
const GAP = 1.15, CAM_Z = 6.2, FOV = 30;

type W = { scene: THREE.Scene; lights: any; setSky: (s: "day" | "dawn") => void; copies: Character[] };

const buildWorld = (): W => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f3ead8");
  const hemi = new THREE.HemisphereLight("#ffffff", "#8a98d6", 2.6);
  const key = new THREE.DirectionalLight("#fff3df", 2.0);
  key.position.set(-3, 9, 8);
  scene.add(hemi, key, key.target);
  const floor = plane(30, 30, toon("#efe3cc"));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor, box(30, 6, 0.2, "#f3ead8", 0, 0, -3));
  const copies = Array.from({ length: 6 }, () => { const c = CHARACTER.build(); scene.add(c.root); return c; });
  return { scene, lights: { hemi, key, practicals: [] }, setSky: () => {}, copies };
};

const xOf = (i: number, n: number) => (i - (n - 1) / 2) * (n > 4 ? 0.92 : GAP);          // six columns fit the frame closer together
const pose = (c: Character, p: Partial<Pose>, base: Pose = STAND) => c.setPose({ ...base, ...p });

const apply = (w: W, cam: THREE.PerspectiveCamera, out: number) => {
  const T = out / FPS;
  w.copies.forEach((c) => { c.root.visible = false; c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.setPose(STAND); c.setExpr("neutral"); });
  cam.fov = FOV;
  if (T < 3) {
    const row = ROWS[Math.floor(T)], n = row.cols.length;
    row.cols.forEach((col, i) => {
      const c = w.copies[i];
      c.root.visible = true;
      c.root.position.set(xOf(i, n), 0, 0);
      if (row.title === "Views") c.root.rotation.y = [0, -Math.PI / 4, -Math.PI / 2, Math.PI][i];
      if (row.title === "Faces") c.setExpr(col as any);
      if (row.title === "Poses") {
        if (col === "walk") c.setPose(walkPose(i === 1 ? 0.25 : 0.75));
        if (col === "sit") c.setPose(SIT);
        if (col === "reach") { c.root.updateMatrixWorld(true); poseReach(c, STAND, { r: c.parts.torso.localToWorld(new THREE.Vector3(-0.42, 0.75, 0.25)) }); }
      }
    });
    cam.position.set(0, 1.05, CAM_Z);
    cam.lookAt(0, 0.85, 0);
  } else {
    // the life clip: a turn through the views (2 s), then a walk on the spot (2 s), breathing and blinking
    const t = T - 3, c = w.copies[0];
    c.root.visible = true;
    c.root.rotation.y = t < 2 ? -Math.PI * 2 * Math.min(1, t / 2) : -Math.PI / 2;
    const base = t < 2 ? { ...STAND, bob: 0.01 * Math.sin(t * 5) } : walkPose(t * 1.4);
    c.setPose(base);
    c.setExpr(Math.floor(T * FPS) % 50 < 3 ? "blink" : t > 1 && t < 2 ? "smile" : "neutral");
    cam.position.set(0, 1.1, 5.2);
    cam.lookAt(0, 1.0, 0);
    cam.fov = 32;          // the whole figure, the bun included, with a margin
  }
  return { look: LOOKS.wideBright, focus: new THREE.Vector3(0, 0.9, 0) };
};

/** The labels under each column of a sheet row (the life clip has none). */
function Labels() {
  const f = useCurrentFrame(), T = f / FPS;
  if (T >= 3) return null;
  const row = ROWS[Math.floor(T)], n = row.cols.length, half = Math.tan(((FOV / 2) * Math.PI) / 180) * CAM_Z * (WIDTH / HEIGHT);
  return <AbsoluteFill style={{ fontFamily: "Outfit", fontWeight: 800, color: "#241726" }}>
    <div style={{ position: "absolute", left: 48, top: 36, fontSize: 44 }}>{`${CHARACTER?.name ?? ID} · ${row.title}`}</div>
    {row.cols.map((col, i) => <div key={i} style={{ position: "absolute", top: HEIGHT - 110, left: WIDTH / 2 + (xOf(i, n) / half) * (WIDTH / 2) - 160, width: 320, textAlign: "center", fontSize: 30 }}>{col}</div>)}
  </AbsoluteFill>;
}

export const Sheet: React.FC = () => <AbsoluteFill><ToonVideo build={buildWorld} apply={apply} words={[]} /><Labels /></AbsoluteFill>;
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
  ok(!same, "an original: not one of the source skill's own four", same ? `it is ${same.name}` : "");
  const near = HEX.test(String(d.top ?? "")) ? cast.find((x) => dist(x.top, d.top) < 40) : null;
  ok(!near, "a top colour none of the cast wears (STYLE.md: contrast)", near ? `too close to ${near.name}'s ${near.top}` : "");
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
  const poses: [string, Pose][] = [["stand", STAND], ["sit", SIT], ["walk", walkPose(0.25)], ["walk", walkPose(0.75)], ["half walk", mixPose(STAND, walkPose(0.5), 0.5)]];
  const broken: string[] = [];
  for (const [n, p] of poses) { try { a.setPose(p); const z = sizeOf(a.root); if (![z.min.x, z.min.y, z.max.x, z.max.y].every(Number.isFinite)) broken.push(n); } catch (x) { broken.push(`${n}: ${String((x as Error)?.message ?? x).split("\n")[0]}`); } }
  try { a.setPose(STAND); a.root.updateMatrixWorld(true); poseReach(a, STAND, { r: a.parts.torso.localToWorld(new THREE.Vector3(-0.42, 0.75, 0.25)) }); } catch (x) { broken.push(`reach: ${String((x as Error)?.message ?? x).split("\n")[0]}`); }
  ok(!broken.length, "every pose holds together (stand, sit, walk, a reach with poseReach)", broken.join("; "));
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
    setLines(l);
    continueRender(handle);
  }, [handle]);
  return <AbsoluteFill style={{ background: "#fff", padding: 40, fontSize: 22, fontFamily: "monospace" }}>{lines.map((l, i) => <div key={i}>{l}</div>)}</AbsoluteFill>;
};

// Shared bits for the toon office: palette, toon materials, primitive builders, easing.
import * as THREE from "three";

export const PAL = {
  ink: "#141827",
  carpet: "#2346d6",
  wall: "#f6f8fb",
  wallStripe: "#5fc4b8",
  ceiling: "#fbfcfe",
  deskTop: "#dfe6f2",
  deskSide: "#aebbd3",
  chair: "#5d6f9a",
  chairDark: "#3d4a6e",
  cabinet: "#f07a3c",
  wood: "#c98a52",
  woodDark: "#9c6236",
  meetWall: "#93d29d",
  meetWallDark: "#7fbf8a",
  steel: "#c9d0db",
  charcoal: "#373c48",
  screenBezel: "#262a35",
  glass: "#bfe3ff",
};

// Soft 5-step light ramp: lit faces keep their colour, turned-away faces fall to ~55 % in gentle bands.
let RAMP: THREE.DataTexture | null = null;
const ramp = () => {
  if (RAMP) return RAMP;
  const steps = [178, 196, 216, 238, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  RAMP = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  RAMP.minFilter = THREE.LinearFilter;
  RAMP.magFilter = THREE.LinearFilter;
  RAMP.needsUpdate = true;
  return RAMP;
};

// "v1" = the first engine test; "v2" = the style-match look (rim light on every toon material, glowing emissives).
let LOOK: "v1" | "v2" = "v1";
export const setLook = (l: "v1" | "v2") => {
  LOOK = l;
};
export const look = () => LOOK;
// Flat-drawn characters (v2 option): unlit fills, ink stroke limbs, no AO (engine masks userData.char).
let FLAT_CHARS = false;
export const setFlatChars = (on: boolean) => {
  FLAT_CHARS = on;
};
export const flatChars = () => FLAT_CHARS;
export const INK = "#0e1120";
const basicCache = new Map<string, THREE.MeshBasicMaterial>();
/** Unlit flat fill for drawn characters (cached per colour). */
export const fill = (color: string) => {
  if (!basicCache.has(color)) basicCache.set(color, new THREE.MeshBasicMaterial({ color }));
  return basicCache.get(color)!;
};
/** Shared rim-light uniforms for v2 toon materials (fresnel edge glow), changed per shot. */
export const RIM = { color: { value: new THREE.Color("#ffd9a8") }, strength: { value: 0 } };

const matCache = new Map<string, THREE.Material>();
/** Toon material in a flat colour (cached per colour and look). */
export const toon = (color: string, opts: { map?: THREE.Texture; emissive?: string; key?: string } = {}) => {
  const k0 = opts.key ?? (opts.map ? "" : `${color}|${opts.emissive ?? ""}`);
  const k = k0 ? `${k0}|${LOOK}` : "";
  if (k && matCache.has(k)) return matCache.get(k)!;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp(), map: opts.map ?? null });
  if (opts.emissive) m.emissive = new THREE.Color(opts.emissive);
  if (LOOK === "v2") {
    m.onBeforeCompile = (sh: any) => {
      sh.uniforms.rimColor = RIM.color;
      sh.uniforms.rimStrength = RIM.strength;
      sh.fragmentShader =
        "uniform vec3 rimColor;\nuniform float rimStrength;\n" +
        sh.fragmentShader.replace(
          "#include <opaque_fragment>",
          "float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);\n" +
            "outgoingLight += rimColor * rimF * rimStrength;\n#include <opaque_fragment>",
        );
    };
    m.customProgramCacheKey = () => "toon-rim";
  }
  if (k) matCache.set(k, m);
  return m;
};

/** Unlit material (screens, windows, light panels). */
export const flat = (color: string, map?: THREE.Texture) => new THREE.MeshBasicMaterial({ color, map: map ?? null, toneMapped: false });

export const shadowed = <T extends THREE.Object3D>(o: T, cast = true, receive = true): T => {
  o.traverse((c: any) => {
    if (c.isMesh) {
      c.castShadow = cast;
      c.receiveShadow = receive;
    }
  });
  return o;
};

/** Box placed by its bottom-centre (x, y, z) — the way furniture is measured. */
export const box = (w: number, h: number, d: number, color: string | THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === "string" ? toon(color) : color);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export const cyl = (rTop: number, rBot: number, h: number, color: string | THREE.Material, seg = 32, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), typeof color === "string" ? toon(color) : color);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export const sphere = (r: number, color: string | THREE.Material, x = 0, y = 0, z = 0, seg = 32) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), typeof color === "string" ? toon(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/** A capsule hanging DOWN from its pivot (limbs): the group origin is the joint. */
export const limb = (r: number, len: number, color: string | THREE.Material) => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), typeof color === "string" ? toon(color) : color);
  m.position.y = -len / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return g;
};

export const plane = (w: number, h: number, mat: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  return m;
};

// ---- easing / timing ----
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
/** 0→1 over [a, b] frames, eased. */
export const ramp01 = (f: number, a: number, b: number, ease = easeInOut) => ease(clamp01((f - a) / (b - a)));
export const backOut = (t: number, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const lerpV = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);

/** Deterministic PRNG (mulberry32). */
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Look library: lighting + post settings per SHOT TYPE (the tuned "v2" look).
// Pick one per shot; never mix two looks inside one shot.
import * as THREE from "three";
import type { Engine, StyleV2 } from "./engine";
import { RIM } from "./lib";

export type Look = {
  light: {
    hemi: number;
    sky: string;
    ground: string;
    key: number;
    keyColor: string;
    keyPos?: [number, number, number]; // direction the key comes FROM (target is the origin); default = back window
    practical?: number; // multiplier on every practical point light's base intensity (default 1)
  };
  rim: { color: string; strength: number };
  sky?: "day" | "dawn"; // window view, if the set has one
  style: Omit<StyleV2, "dof"> & { blur: { cocScale: number; maxCoc: number } };
};

const BRIGHT = { hemi: 2.45, sky: "#ffffff", ground: "#9aa6dc", key: 1.8, keyColor: "#fff6e8" };

export const LOOKS = {
  /** A prop that glows (screen, lamp, button) in a moody, warm-vs-cool close-up. */
  propGlow: {
    light: { hemi: 1.0, sky: "#b8c4ff", ground: "#3a4580", key: 1.7, keyColor: "#ffc890", keyPos: [3, 7, 5], practical: 0.6 },
    rim: { color: "#ffb070", strength: 0.35 },
    sky: "dawn",
    style: {
      outline: 7,
      bloom: { strength: 0.85, radius: 0.5, threshold: 1.2 },
      blur: { cocScale: 18, maxCoc: 26 },
      grade: { vignette: 0.45, saturation: 1.3, contrast: 1.12, warm: 0.8, lift: 0 },
    },
  },
  /** A face close-up / medium close-up: front key, warm rim, background melted. */
  characterClose: {
    light: { hemi: 1.0, sky: "#dfe5ff", ground: "#4a5492", key: 1.3, keyColor: "#ffd2a0", keyPos: [3, 7, 6] },
    rim: { color: "#ffb26a", strength: 0.45 },
    sky: "dawn",
    style: {
      outline: 7,
      bloom: { strength: 0.6, radius: 0.55, threshold: 1.2 },
      blur: { cocScale: 22, maxCoc: 28 },
      grade: { vignette: 0.42, saturation: 1.25, contrast: 1.1, warm: 0.8, lift: 0 },
    },
  },
  /** Bright, clean wide or walking shot: white walls, saturated floor, little blur. */
  wideBright: {
    light: { ...BRIGHT, hemi: 2.8, key: 1.9 },
    rim: { color: "#e8f0ff", strength: 0.12 },
    sky: "day",
    style: {
      outline: 5.5,
      bloom: { strength: 0.22, radius: 0.4, threshold: 1.3 },
      blur: { cocScale: 6, maxCoc: 10 },
      grade: { vignette: 0.16, saturation: 0.9, contrast: 1.0, warm: 0.3, lift: 0.05 },
    },
  },
  /** A room seen from a high corner: soft, low contrast. */
  roomHigh: {
    light: { ...BRIGHT, hemi: 2.9, key: 1.7, practical: 0.7 },
    rim: { color: "#e8f0ff", strength: 0.1 },
    sky: "day",
    style: {
      outline: 5.5,
      bloom: { strength: 0.22, radius: 0.4, threshold: 1.6 },
      blur: { cocScale: 7, maxCoc: 12 },
      grade: { vignette: 0.2, saturation: 0.95, contrast: 0.88, warm: 0.25, lift: 0.04 },
    },
  },
  /** One object filling the frame (clock, sign, tool): crisp subject, soft wall. */
  objectClose: {
    light: { ...BRIGHT, hemi: 2.5, key: 1.4 },
    rim: { color: "#ffffff", strength: 0.1 },
    sky: "day",
    style: {
      outline: 4.5,
      bloom: { strength: 0.25, radius: 0.5, threshold: 1.3 },
      blur: { cocScale: 22, maxCoc: 26 },
      grade: { vignette: 0.28, saturation: 1.3, contrast: 0.78, warm: 0.3, lift: 0.05 },
    },
  },
  /** A screen / UI close-up in a bright room, the screen glowing softly. */
  screenClose: {
    light: { hemi: 2.2, sky: "#ffffff", ground: "#8a98d6", key: 1.6, keyColor: "#fff3df" },
    rim: { color: "#e8f0ff", strength: 0.1 },
    sky: "day",
    style: {
      outline: 5,
      bloom: { strength: 0.3, radius: 0.5, threshold: 1.3 },
      blur: { cocScale: 16, maxCoc: 22 },
      grade: { vignette: 0.25, saturation: 1.1, contrast: 1.0, warm: 0.3, lift: 0.02 },
    },
  },
} satisfies Record<string, Look>;
export type LookName = keyof typeof LOOKS;

/** What a world must expose for looks to drive it. Practical lights keep their authored intensity in userData.base. */
export type KitLights = { hemi: THREE.HemisphereLight; key: THREE.DirectionalLight; practicals: THREE.PointLight[] };

export const applyLook = (
  lights: KitLights,
  engine: Engine,
  look: Look,
  focusDistance: number,
  setSky?: (sky: "day" | "dawn") => void,
) => {
  lights.hemi.intensity = look.light.hemi;
  lights.hemi.color.set(look.light.sky);
  lights.hemi.groundColor.set(look.light.ground);
  lights.key.intensity = look.light.key;
  lights.key.color.set(look.light.keyColor);
  // keyPos is relative to the key's target, so a set built away from the origin moves the target and keeps its shadows
  lights.key.position.set(...(look.light.keyPos ?? [-3, 9, -11])).add(lights.key.target.position);
  for (const p of lights.practicals) p.intensity = (p.userData.base ?? p.intensity) * (look.light.practical ?? 1);
  RIM.color.value.set(look.rim.color);
  RIM.strength.value = look.rim.strength;
  if (setSky && look.sky) setSky(look.sky);
  const { blur, ...rest } = look.style;
  engine.setStyle({ ...rest, dof: { focus: focusDistance, ...blur } });
};

/** Voice-over time remap: anchors = [frame of the authored timeline, seconds in the voiced cut]. */
export const makeRemap = (anchors: [number, number][], fps: number) => (outFrame: number) => {
  const t = outFrame / fps;
  for (let i = 1; i < anchors.length; i++) {
    const [f0, t0] = anchors[i - 1];
    const [f1, t1] = anchors[i];
    if (t <= t1) return f0 + ((f1 - f0) * (t - t0)) / (t1 - t0);
  }
  return anchors[anchors.length - 1][0];
};

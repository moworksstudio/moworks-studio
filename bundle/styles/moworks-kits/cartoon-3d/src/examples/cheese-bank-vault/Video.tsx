// CheeseBankVault — worked example (9:16 short, "The Bank Vault Full of Cheese"): the video, its collision-QA twin (CheeseBankVault-Check) and its sound for the final mix.
import React from "react";
import * as THREE from "three";
import { ToonVideo } from "../../kit/ToonVideo";
import { CollisionCheck, CollisionScene } from "../../kit/collision";
import type { Soundtrack } from "../../kit/sound";
import { buildWorld, World } from "./world";
import { applyShot } from "./shots";
import { FPS, FRAMES, SFX, VOICE, WORDS } from "./vo";

export { FPS, FRAMES };
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const CheeseBankVault: React.FC<{ dbg?: string }> = ({ dbg }) => {
  // render-review triage: --props '{"dbg":"noDof,noOutline"}' switches post passes off (see src/kit/engine.ts)
  (globalThis as any).__TOON_DBG = Object.fromEntries((dbg ?? "").split(",").filter(Boolean).map((k) => [k, true]));
  return <ToonVideo build={buildWorld} apply={applyShot} words={WORDS} voice={VOICE} sfx={SFX} />;
};

/** What tools/render.mjs mixes: the voice + the cues, mastered to −14 LUFS (picture + effects only when VOICE is null). */
export const SOUND: Soundtrack = { voice: VOICE, seconds: FRAMES / FPS, cues: SFX, sfxDir: "sfx/kit", master: true };

const qaCam = new THREE.PerspectiveCamera();
const qaScene = (w: World): CollisionScene => ({
  scene: w.scene,
  characters: Object.fromEntries(Object.entries(w.cast).map(([k, c]) => [k, c.root])),
  seats: w.seats,
});
const qaPose = (w: World, out: number) => {
  applyShot(w, qaCam, out);
};
export const CheeseBankVaultCheck: React.FC = () => <CollisionCheck build={buildWorld} scene={qaScene} poseFrame={qaPose} frames={FRAMES} />;

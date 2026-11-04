// __COMP__ — composition entry: the video, its collision-QA twin (__COMP__-Check) and its sound for the final mix.
// Registered in src/Root.tsx and src/soundtracks.ts by tools/new-video.mjs.
import React from "react";
import * as THREE from "three";
import { ToonVideo } from "../../kit/ToonVideo";
import { CollisionCheck, CollisionScene } from "../../kit/collision";
import type { Soundtrack } from "../../kit/sound";
import { buildWorld, World } from "./world";
import { applyShot } from "./shots";
import { CAPTIONS, FPS, FRAMES, SFX, VOICE, WORDS } from "./vo";

export { FPS, FRAMES };
export const WIDTH = __W__;
export const HEIGHT = __H__;

export const __COMP__: React.FC<{ dbg?: string }> = ({ dbg }) => {
  // render-review triage: --props '{"dbg":"noDof,noOutline"}' switches post passes off (see src/kit/engine.ts)
  (globalThis as any).__TOON_DBG = Object.fromEntries((dbg ?? "").split(",").filter(Boolean).map((k) => [k, true]));
  return <ToonVideo build={buildWorld} apply={applyShot} words={CAPTIONS ? WORDS : []} voice={VOICE} sfx={SFX} />;
};

/** What tools/render.mjs mixes: the voice + the cues, mastered to −14 LUFS. With no voice the effects stay at their
 *  designed level (to sit under a voice in an editor); set master: true for a standalone picture + effects video. */
export const SOUND: Soundtrack = { voice: VOICE, seconds: FRAMES / FPS, cues: SFX, sfxDir: "sfx/kit", master: false };

const qaCam = new THREE.PerspectiveCamera();
const qaScene = (w: World): CollisionScene => ({
  scene: w.scene,
  characters: Object.fromEntries(Object.entries(w.cast).map(([k, c]) => [k, c.root])),
  seats: w.seats,
});
const qaPose = (w: World, out: number) => {
  applyShot(w, qaCam, out);
};
export const __COMP__Check: React.FC = () => <CollisionCheck build={buildWorld} scene={qaScene} poseFrame={qaPose} frames={FRAMES} />;

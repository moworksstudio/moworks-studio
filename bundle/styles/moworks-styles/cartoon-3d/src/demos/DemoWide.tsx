// DemoWide — the 5-second setup demo in 16:9: a window into the What-If example (src/examples/what-if-no-pain, 0–5 s):
// Mika kicks the desk leg in the office (impact cue), the team winces, she feels nothing; word-by-word captions.
// Rendered at the end of the setup to prove the engine, the fonts, the look and the sound.
import React from "react";
import * as THREE from "three";
import { ToonVideo } from "../kit/ToonVideo";
import { CollisionCheck, CollisionScene } from "../kit/collision";
import type { Soundtrack } from "../kit/sound";
import { buildWorld, World } from "../examples/what-if-no-pain/world";
import { applyShot } from "../examples/what-if-no-pain/shots";
import { FPS, SFX, WORDS } from "../examples/what-if-no-pain/vo";
import { windowOf } from "./window";

const D = windowOf(applyShot, WORDS, SFX, 0, 5, FPS);
export { FPS };
export const FRAMES = D.frames;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const DemoWide: React.FC = () => <ToonVideo build={buildWorld} apply={D.apply} words={D.words} sfx={D.cues} />;
export const SOUND: Soundtrack = { voice: null, seconds: FRAMES / FPS, cues: D.cues, sfxDir: "sfx/kit", master: true, fade: [0, 0.3] };

const qaCam = new THREE.PerspectiveCamera();
const qaScene = (w: World): CollisionScene => ({ scene: w.scene, characters: Object.fromEntries(Object.entries(w.cast).map(([k, c]) => [k, c.root])), seats: w.seats });
export const DemoWideCheck: React.FC = () => <CollisionCheck build={buildWorld} scene={qaScene} poseFrame={(w: World, out: number) => void D.apply(w, qaCam, out)} frames={FRAMES} />;

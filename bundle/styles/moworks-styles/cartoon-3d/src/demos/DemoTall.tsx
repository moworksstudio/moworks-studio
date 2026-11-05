// DemoTall — the 5-second setup demo in 9:16: a window into the shorts example (src/examples/cheese-bank-vault, 0–5 s):
// a giant cheese wheel rolls into a marble bank hall, Ravi lends at his desk, the wheel slams down flat (impact cue),
// with word-by-word captions. Rendered at the end of the setup to prove the engine, the fonts, the look and the sound.
import React from "react";
import * as THREE from "three";
import { ToonVideo } from "../kit/ToonVideo";
import { CollisionCheck, CollisionScene } from "../kit/collision";
import type { Soundtrack } from "../kit/sound";
import { buildWorld, World } from "../examples/cheese-bank-vault/world";
import { applyShot } from "../examples/cheese-bank-vault/shots";
import { FPS, SFX, WORDS } from "../examples/cheese-bank-vault/vo";
import { windowOf } from "./window";

const D = windowOf(applyShot, WORDS, SFX, 0, 5, FPS);
export { FPS };
export const FRAMES = D.frames;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const DemoTall: React.FC = () => <ToonVideo build={buildWorld} apply={D.apply} words={D.words} sfx={D.cues} />;
export const SOUND: Soundtrack = { voice: null, seconds: FRAMES / FPS, cues: D.cues, sfxDir: "sfx/kit", master: true, fade: [0, 0.3] };

const qaCam = new THREE.PerspectiveCamera();
const qaScene = (w: World): CollisionScene => ({ scene: w.scene, characters: Object.fromEntries(Object.entries(w.cast).map(([k, c]) => [k, c.root])), seats: w.seats });
export const DemoTallCheck: React.FC = () => <CollisionCheck build={buildWorld} scene={qaScene} poseFrame={(w: World, out: number) => void D.apply(w, qaCam, out)} frames={FRAMES} />;

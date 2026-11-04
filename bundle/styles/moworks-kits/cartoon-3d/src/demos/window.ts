// window.ts — a demo is a 5-second window into a worked example: the same world and shots, offset in time, with the
// captions and the sound cues that fall inside the window (shifted to start at 0).
import type * as THREE from "three";
import type { Cue } from "../kit/sound";
import { windowCues } from "../kit/sound";
import type { ShotState, ToonWorld } from "../kit/ToonVideo";

export const windowOf = <W extends ToonWorld>(
  apply: (w: W, cam: THREE.PerspectiveCamera, out: number) => ShotState,
  words: [number, string][],
  sfx: Cue<string>[],
  t0: number,
  seconds: number,
  fps: number,
) => ({
  apply: (w: W, cam: THREE.PerspectiveCamera, out: number) => apply(w, cam, out + Math.round(t0 * fps)),
  words: words.filter(([t]) => t >= t0 - 0.01 && t < t0 + seconds).map(([t, w]) => [+(t - t0).toFixed(2), w] as [number, string]),
  cues: windowCues(sfx, t0, seconds),
  frames: Math.round(seconds * fps),
});

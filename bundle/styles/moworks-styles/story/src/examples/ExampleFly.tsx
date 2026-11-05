// ExampleFly — the Stickman Explainer worked example, "What If You Could Fly?" (37.5 s, 1920×1080, 24 fps).
// The picture is fly.js (drawn with src/stickman/kit.js); the sound is effects only, from public/sfx/stickman/.
// In production this video was narrated (a voice-over generated from the script, word times from tools/transcribe.mjs)
// and every cue below sat on its spoken beat. The kit ships no voice and no music: render it to study the picture.
import React from "react";
import { loadFont } from "@remotion/google-fonts/OpenSans";
// @ts-expect-error plain JS module (canvas kit)
import { drawFly, FPS as F, SECONDS as SEC } from "./fly.js";
import { Cue, SfxTrack, Soundtrack } from "../kit/sound";
import { CanvasStage } from "../kit/stage";

loadFont("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });
loadFont("italic", { weights: ["800"], subsets: ["latin"] });
export const FONTS = ['600 20px "Open Sans"', '700 20px "Open Sans"', '800 20px "Open Sans"', 'italic 800 20px "Open Sans"'];

export const FPS: number = F;
export const SECONDS: number = SEC;
export const FRAMES = Math.round(SECONDS * FPS);
export const WIDTH = 1920;
export const HEIGHT = 1080;

// every cue sits on its visual beat (the shot table S in fly.js); gains are relative to each sound's designed level
export const CUES: Cue<string>[] = [
  // gridlock
  { n: "traffic", t: 0.0, g: -7 },
  { n: "tag-d", t: 0.35, g: -8 },
  { n: "honk", t: 0.98, g: -4 },
  { n: "tag-fs", t: 1.3, g: -8 },
  { n: "tag-a", t: 2.55, g: -8 },
  // office
  { n: "office", t: 3.42, g: 0 },
  { n: "tag-d", t: 4.02, g: -9 },
  // the window, the launch
  { n: "dawn", t: 5.25, g: -2 },
  { n: "swish", t: 6.15, g: -6 },
  { n: "takeoff", t: 6.5, g: -8 },
  { n: "papers", t: 6.52, g: -7 },
  // rooftops, the pigeon
  { n: "wind", t: 7.0, g: -6 },
  { n: "pigeon", t: 9.0, g: -14 },
  { n: "tag-fs", t: 9.85, g: -8 },
  // map
  { n: "tag-d", t: 10.42, g: -9 },
  { n: "ui", t: 10.44, g: -8 },
  { n: "ui", t: 10.56, g: -8 },
  { n: "timer", t: 10.6, g: -6 },
  { n: "ding", t: 11.42, g: -8 },
  { n: "tag-a", t: 11.8, g: -8 },
  // coworker
  { n: "office", t: 12.92, g: -7 },
  { n: "papers", t: 12.92, g: -10 },
  { n: "tag-a", t: 13.3, g: -9 },
  { n: "swish", t: 14.95, g: -4 },
  // title
  { n: "swell", t: 15.2, g: -12 },
  { n: "boom", t: 15.93, g: -3 },
  { n: "wind", t: 16.0, g: -12 },
  // the climb
  { n: "crowd", t: 18.58, g: -7 },
  { n: "steps", t: 18.62, g: -7 },
  { n: "swish", t: 19.22, g: -7 },
  { n: "thud", t: 20.02, g: -5 },
  { n: "tag-d", t: 20.27, g: -8 },
  { n: "cheer", t: 21.6, g: -6 },
  { n: "prop", t: 22.3, g: -7 },
  { n: "tag-fs", t: 23.6, g: -8 },
  { n: "jet", t: 24.8, g: -7 },
  { n: "tag-a", t: 26.22, g: -8 },
  { n: "cloud", t: 26.7, g: -5 },
  { n: "shimmer", t: 27.95, g: -16 },
  { n: "bite", t: 28.86, g: -6 },
  // frost
  { n: "frost", t: 29.3, g: -5 },
  { n: "breath", t: 29.45, g: -4 },
  { n: "thermo", t: 29.6, g: -2 },
  { n: "breath", t: 30.05, g: -4 },
  { n: "chatter", t: 30.1, g: -9 },
  { n: "tag-d", t: 30.32, g: -8 },
  { n: "breath", t: 30.65, g: -4 },
  // the problem
  { n: "wind", t: 31.75, g: -12 },
  { n: "chime", t: 33.95, g: -10 },
  { n: "flock", t: 34.62, g: -10 },
  { n: "ping", t: 35.4, g: -2 },
  { n: "alert", t: 35.75, g: -6 },
  { n: "ping", t: 36.5, g: -6 },
];
export const SOUND: Soundtrack = { voice: null, master: true, seconds: SECONDS, cues: CUES, sfxDir: "sfx/stickman" };

export const ExampleFly: React.FC = () => (
  <>
    <CanvasStage draw={drawFly} fonts={FONTS} />
    <SfxTrack cues={CUES} dir="sfx/stickman" />
  </>
);

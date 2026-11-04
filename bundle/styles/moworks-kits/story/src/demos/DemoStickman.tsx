// DemoStickman — the 5-second setup demo of the Stickman Explainer style: a window into the worked example
// (src/examples/fly.js, 5.25 → 10.25 s): the bedroom window at dawn, one step off the sill, the launch, flying over the
// rooftops, a pigeon's double take. Sound effects only (no voice, no music). Rendered at the end of the setup.
import React from "react";
// @ts-expect-error plain JS module (canvas kit)
import { drawFly } from "../examples/fly.js";
import { CUES, FONTS, FPS as F } from "../examples/ExampleFly";
import { SfxTrack, Soundtrack, windowCues } from "../kit/sound";
import { CanvasStage } from "../kit/stage";

const T0 = 5.25;
export const FPS: number = F;
export const SECONDS = 5;
export const FRAMES = Math.round(SECONDS * FPS);
export const WIDTH = 1920;
export const HEIGHT = 1080;
const FADE: [number, number] = [0.25, 0.5];
const CUES_HERE = windowCues(CUES, T0, SECONDS);
export const SOUND: Soundtrack = { voice: null, master: true, seconds: SECONDS, cues: CUES_HERE, sfxDir: "sfx/stickman", fade: FADE };

export const DemoStickman: React.FC = () => (
  <>
    <CanvasStage draw={drawFly} fonts={FONTS} offset={T0} fade={FADE} />
    <SfxTrack cues={CUES_HERE} dir="sfx/stickman" />
  </>
);

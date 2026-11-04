// DemoInnerVoice — the 5-second setup demo of the Inner Voice Short style: a window into the worked example
// (src/examples/firstchord.js, 14.3 → 19.3 s): DAY 1, a sour first chord and a wince, the red-glowing shadow fading in,
// "you sound awful." / "put it down." Sound effects only (no music). Rendered at the end of the setup.
import React from "react";
// @ts-expect-error plain JS module (canvas kit)
import { drawFirstChord } from "../examples/firstchord.js";
import { CUES, FONTS, FPS as F } from "../examples/ExampleFirstChord";
import { Cue, SfxTrack, Soundtrack, windowCues } from "../kit/sound";
import { CanvasStage } from "../kit/stage";

const T0 = 14.3;
export const FPS: number = F;
export const SECONDS = 5;
export const FRAMES = Math.round(SECONDS * FPS);
export const WIDTH = 1920;
export const HEIGHT = 1080;
const FADE: [number, number] = [0.3, 0.45];
const CUES_HERE: Cue<string>[] = [{ n: "room", t: 0, g: 0 }, ...windowCues(CUES, T0, SECONDS)];
export const SOUND: Soundtrack = { voice: null, master: true, seconds: SECONDS, cues: CUES_HERE, sfxDir: "sfx/inner-voice", fade: FADE };

export const DemoInnerVoice: React.FC = () => (
  <>
    <CanvasStage draw={drawFirstChord} fonts={FONTS} offset={T0} fade={FADE} />
    <SfxTrack cues={CUES_HERE} dir="sfx/inner-voice" />
  </>
);

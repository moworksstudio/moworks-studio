// ExampleFirstChord — the Inner Voice Short worked example, "First Chord" (the opening 20 s of an original short;
// 1920×1080, 30 fps). The picture is firstchord.js (drawn with src/inner-voice/kit.js); the sound is effects only,
// from public/sfx/inner-voice/. No voice: the story is told in captions. No music ships with the kit.
import React from "react";
import { loadFont } from "@remotion/google-fonts/ComicNeue";
// @ts-expect-error plain JS module (canvas kit)
import { drawFirstChord, FPS as F, SECONDS as SEC } from "./firstchord.js";
import { Cue, SfxTrack, Soundtrack } from "../kit/sound";
import { CanvasStage } from "../kit/stage";

// Comic Sans MS is the style's face (a macOS / Windows system font); Comic Neue is the fallback elsewhere
loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });
export const FONTS = ['400 58px "Comic Sans MS"', '700 42px "Comic Sans MS"', '400 58px "Comic Neue"', '700 42px "Comic Neue"'];

export const FPS: number = F;
export const SECONDS: number = SEC;
export const FRAMES = Math.round(SECONDS * FPS);
export const WIDTH = 1920;
export const HEIGHT = 1080;

// every cue sits on its picture beat (the T table in firstchord.js); gains are relative to each sound's designed level
export const CUES: Cue<string>[] = [
  // A · every night
  { n: "room", t: 3.0, g: 0 },
  ...[3.95, 4.7, 5.6, 6.35, 7.15, 9.15, 9.9, 10.5].map((t) => ({ n: "tap", t, g: -6 })),
  { n: "harmonics", t: 7.72, g: -4 },
  { n: "whisper", t: 8.55, g: -8 },
  { n: "clock-spin", t: 10.45, g: -4 },
  { n: "whisper", t: 11.85, g: -8 },
  // B · DAY 1
  { n: "strum-sour", t: 15.24, g: 0 },
  { n: "string-mute", t: 15.95, g: -3 },
  { n: "dread", t: 16.2, g: -2 },
  { n: "whisper", t: 16.95, g: -6 },
  { n: "whisper", t: 18.3, g: -6 },
];
export const SOUND: Soundtrack = { voice: null, master: true, seconds: SECONDS, cues: CUES, sfxDir: "sfx/inner-voice", fade: [0, 0.6] };

export const ExampleFirstChord: React.FC = () => (
  <>
    <CanvasStage draw={drawFirstChord} fonts={FONTS} />
    <SfxTrack cues={CUES} dir="sfx/inner-voice" />
  </>
);

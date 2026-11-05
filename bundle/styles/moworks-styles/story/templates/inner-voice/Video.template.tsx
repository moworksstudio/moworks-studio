// __NAME__ — "__TITLE__", an Inner Voice Short (1920×1080, 30 fps). Scaffolded by tools/new-video.mjs.
// The picture is __SLUG__.js (drawn with src/inner-voice/kit.js). No voice: the story is told in captions. Sound effects
// come from public/sfx/inner-voice/ (INDEX.md); music only if the user asks (.claude/skills/original-music).
import React from "react";
import { loadFont } from "@remotion/google-fonts/ComicNeue";
// @ts-expect-error plain JS module (canvas kit)
import { draw, FPS as F, SECONDS as SEC } from "./__SLUG__.js";
import { Cue, SfxTrack, Soundtrack } from "../../kit/sound";
import { CanvasStage } from "../../kit/stage";

// Comic Sans MS is the style's face (a macOS / Windows system font); Comic Neue is the fallback elsewhere
loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });
const FONTS = ['400 58px "Comic Sans MS"', '700 42px "Comic Sans MS"', '400 58px "Comic Neue"', '700 42px "Comic Neue"'];

export const FPS: number = F;
export const SECONDS: number = SEC;
export const FRAMES = Math.round(SECONDS * FPS);
export const WIDTH = 1920;
export const HEIGHT = 1080;

// every cue sits on its picture beat (the T table in __SLUG__.js); gains are relative to each sound's designed level
const CUES: Cue<string>[] = [
  { n: "room", t: 3.0, g: 0 },
  // { n: "tap", t: 3.95, g: -6 },
];

export const SOUND: Soundtrack = {
  voice: null,
  master: true, // no voice: the effects (and any music) are mastered to −14 LUFS
  seconds: SECONDS,
  cues: CUES,
  sfxDir: "sfx/inner-voice",
  // music: { src: "public/music/__SLUG__/score.wav", keys: [[0, 0], [SEC, 0]] },   ← only when the user asked for music
};

export const __NAME__: React.FC = () => (
  <>
    <CanvasStage draw={draw} fonts={FONTS} />
    <SfxTrack cues={CUES} dir="sfx/inner-voice" />
  </>
);

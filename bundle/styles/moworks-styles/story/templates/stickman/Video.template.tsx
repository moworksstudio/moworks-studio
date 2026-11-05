// __NAME__ — "__TITLE__", a Stickman Explainer (1920×1080, 24 fps, 2:1 letterbox). Scaffolded by tools/new-video.mjs.
// The picture is __SLUG__.js (drawn with src/stickman/kit.js). Narrated: set `voice` once the voice-over is placed
// (public/videos/__SLUG__/voice.wav, references/VOICE.md). Effects from public/sfx/stickman/ (INDEX.md); music only if
// the user asks (.claude/skills/original-music).
import React from "react";
import { Audio, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/OpenSans";
// @ts-expect-error plain JS module (canvas kit)
import { draw, FPS as F, SECONDS as SEC, S } from "./__SLUG__.js";
import { Cue, SfxTrack, Soundtrack } from "../../kit/sound";
import { CanvasStage } from "../../kit/stage";

loadFont("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });
loadFont("italic", { weights: ["800"], subsets: ["latin"] });
const FONTS = ['600 20px "Open Sans"', '700 20px "Open Sans"', '800 20px "Open Sans"', 'italic 800 20px "Open Sans"'];

export const FPS: number = F;
export const SECONDS: number = SEC;
export const FRAMES = Math.round(SECONDS * FPS);
export const WIDTH = 1920;
export const HEIGHT = 1080;

// every cue sits on its visual beat (the shot table S); gains are relative to each sound's designed level
const CUES: Cue<string>[] = [
  { n: "tag-d", t: S.open + 0.6, g: -8 },
  { n: "swell", t: S.title - 0.3, g: -12 },
  { n: "boom", t: S.title + 0.43, g: -3 },
];

export const SOUND: Soundtrack = {
  voice: null, // ← "videos/__SLUG__/voice.wav" once the voice-over is placed (the mix then masters around the voice)
  master: true, // without a voice, the effects are mastered to −14 LUFS on their own
  seconds: SECONDS,
  cues: CUES,
  sfxDir: "sfx/stickman",
  // music: { src: "public/music/__SLUG__/score.wav", keys: [[0, -8], [SEC, -8]] },   ← only when the user asked for music
};

export const __NAME__: React.FC = () => (
  <>
    <CanvasStage draw={draw} fonts={FONTS} />
    {SOUND.voice ? <Audio src={staticFile(SOUND.voice)} /> : null}
    <SfxTrack cues={CUES} dir="sfx/stickman" />
  </>
);

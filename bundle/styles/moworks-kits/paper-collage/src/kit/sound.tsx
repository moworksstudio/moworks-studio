// sound.tsx — sound cues. A cue is { n: sound name, t: start in seconds (on the hit it belongs to), g: gain in dB }.
// <SfxTrack> plays the cues in the Studio preview. For the final audio, tools/render.mjs reads the same cues out of
// src/soundtracks.ts and mixes them (tools/sfx/mix.py) — so the preview and the final mix never drift apart.
// Every sound is generated in code: tools/sfx/build_kit.py → public/sfx/kit/ (INDEX.md lists lengths and levels).
import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";

/** the kit — what each sound is for: .claude/skills/motion-graphic/references/SOUND.md */
export const KIT = [
  // paper & ink — the core of the look
  "paper-land", "tear", "stamp", "scribble", "strike", "circle", "marker-long", "slam", "cash", "scatter", "flip", "ticker", "pluck", "shot", "launch",
  // screen graphics
  "impact", "count", "lock", "chip", "tick",
  // foley / UI
  "click", "pop", "ding", "typing",
  // OPT-IN only (when the user asks for whooshes)
  "whoosh", "whoosh-up", "whoosh-deep", "zoom",
] as const;
export type KitSound = (typeof KIT)[number];

/** One sound cue: n = sound name, t = start (s, composition time), g = gain (dB). */
export type Cue<N extends string = KitSound> = { n: N; t: number; g: number };

/** What the mix needs for one composition: an optional voice-over (path under public/), the length, the cues. */
export type Soundtrack = { voice: string | null; seconds: number; cues: Cue<string>[]; sfxDir?: string };

export const dbToGain = (g: number) => Math.pow(10, g / 20);

export const SfxTrack: React.FC<{ cues: Cue<string>[]; dir?: string }> = ({ cues, dir = "sfx/kit" }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(c.t * fps))} layout="none">
          <Audio src={staticFile(`${dir}/${c.n}.wav`)} volume={dbToGain(c.g)} />
        </Sequence>
      ))}
    </>
  );
};

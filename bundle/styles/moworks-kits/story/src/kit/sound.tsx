// sound.tsx — sound cues. A cue is { n: sound name, t: start in seconds (on the beat it belongs to), g: gain in dB }.
// <SfxTrack> plays the cues in the Studio preview. For the final audio, tools/render.mjs reads the same cues out of
// src/soundtracks.ts and mixes them (tools/sfx/mix.py), so the preview and the final mix never drift apart.
// Every sound is generated in code: tools/sfx/build_stickman.py → public/sfx/stickman/, tools/sfx/build_inner_voice.py →
// public/sfx/inner-voice/ (each folder has an INDEX.md), plus any tools/sfx/build_<slug>.py of one video.
import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";

/** One sound cue: n = sound name (a .wav in the soundtrack's sfxDir), t = start (s, composition time), g = gain (dB). */
export type Cue<N extends string = string> = { n: N; t: number; g: number };

/**
 * What the mix needs for one composition. voice: a voice-over path under public/ (null for a captions-only short);
 * master: true masters music + effects to −14 LUFS when there is no voice; music: a bed with volume keys [[t, dB], …].
 */
export type Soundtrack = {
  voice: string | null;
  seconds: number;
  cues: Cue<string>[];
  sfxDir?: string;
  master?: boolean;
  /** music bed (only when the user asked for music): a WAV under public/ with volume keys [[t, dB], …] */
  music?: { src: string; keys: [number, number][] };
  /** [fade-in, fade-out] seconds applied to the whole mix (demos, endings) */
  fade?: [number, number];
};

export const dbToGain = (g: number) => Math.pow(10, g / 20);

export const SfxTrack: React.FC<{ cues: Cue<string>[]; dir: string }> = ({ cues, dir }) => {
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

/** the cues that start inside [t0, t0 + seconds), shifted to start at 0 — for a demo that is a window into a video */
export const windowCues = (cues: Cue<string>[], t0: number, seconds: number): Cue<string>[] =>
  cues.filter((c) => c.t >= t0 - 0.01 && c.t < t0 + seconds).map((c) => ({ ...c, t: Math.max(0, +(c.t - t0).toFixed(3)) }));

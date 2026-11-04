// __COMP__ — "__TITLE__" (made by tools/new-graphic.mjs on __DATE__) · __WIDTH__×__HEIGHT__ · __FPS__ fps · __SECONDS__ s
// Plan: projects/__SLUG__/PLAN.md__VOICE_NOTE__
//
// BEAT MAP — write it BEFORE building (STYLE.md §2):
// 0.0–x.x   SCENE 1: …   (frame 0 is never empty)
// x.x–x.x   SCENE 2 (sheet up): …
// …
// SOUND: one cue per key moment (scene sheets, landings, the power word, bursts) — SOUND.md
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Cue, SfxTrack, Soundtrack } from "../../kit/sound";
import { Lockup, Page, SceneStack, TypeOn, V } from "../../kit/scenes";

export const FPS = __FPS__;
export const WIDTH = __WIDTH__;
export const HEIGHT = __HEIGHT__;
export const SECONDS = __SECONDS__;
export const FRAMES = Math.round(SECONDS * FPS);

// beats (s): __BEATS_NOTE__
const B = {
  title: 0.3,
};

const SFX: Cue[] = [
  // { n: "tear", t: 2.58, g: -6 },
];
export const SOUND: Soundtrack = { voice: __VOICE__, seconds: SECONDS, cues: SFX, sfxDir: "sfx/kit" };

export const __COMP__: React.FC<{ transparent?: boolean }> = ({ transparent = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill>
      <SceneStack
        t={t}
        scenes={[
          {
            at: 0,
            render: () => (
              <Page t={t} transparent={transparent}>
                <TypeOn text="EYEBROW…" t={t} at={B.title - 0.25} cps={20} size={44} style={{ left: Math.round(WIDTH * 0.085), top: Math.round(HEIGHT * 0.1), letterSpacing: "0.14em" }} />
                <Lockup t={t} fps={fps} y={Math.round(HEIGHT * 0.38)} lines={[{ text: "TITLE", at: B.title, color: V.red }]} />
              </Page>
            ),
          },
          // { at: 2.6, enter: "up", render: () => <Page t={t} transparent={transparent}>…</Page> },
        ]}
      />
      <SfxTrack cues={SFX} />
    </AbsoluteFill>
  );
};

// Demo — a 9.6-s square motion graphic made ONLY from code (no images), used to prove a fresh install works and as a
// compact reference for the look. Four scenes tear in over each other:
// 0.0–2.6  THIS IS… PAPER / COLLAGE (red / ink on the highlighter) — already arriving at frame 0; MADE IN CODE stamp
// 2.6–5.0  list: IT NEEDS… HOOKS ? · FACTS § · PAYOFF ! (panels land on their beats)                (sheet up)
// 5.0–7.0  power moment: WAIT… REALLY? (dark page, slam, burst, shake, flash)                         (sheet from the right)
// 7.0–9.6  focus: a row of people, the others slide aside, a circle hugs one, ideas burst out of their head;
//          CURIOUS / MINDS                                                                            (sheet up)
// SOUND (9 cues): stamp · tear ×3 on the sheets · paper-land on the first panel · stamp + impact on REALLY? · circle · pop
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Cue, SfxTrack, Soundtrack } from "../kit/sound";
import { FocusRow, IdeaBurst, Lockup, Page, PanelStack, PowerWordScene, SceneStack, Stamp, TypeOn, V } from "../kit/scenes";

export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1080;
export const SECONDS = 9.6;
export const FRAMES = Math.round(SECONDS * FPS);

// beats (s) — with a voice-over these come from its word times; without one, they are the rhythm you design
const B = { this: -0.35, paper: 0.12, collage: 0.6, stamp: 1.6, s1: 2.6, needs: 2.8, hooks: 3.1, facts: 3.55, payoff: 4.0, s2: 5.0, wait: 5.12, really: 6.0, s3: 7.0, row: 7.15, focus: 7.9, curious: 8.35, minds: 8.7 };

const SFX: Cue[] = [
  { n: "stamp", t: B.stamp - 0.04, g: -8 },
  { n: "tear", t: B.s1 - 0.02, g: -6 },
  { n: "paper-land", t: B.hooks - 0.1, g: -6 },
  { n: "tear", t: B.s2 - 0.02, g: -6 },
  { n: "stamp", t: B.really - 0.06, g: -4 },
  { n: "impact", t: B.really - 0.06, g: -11 },
  { n: "tear", t: B.s3 - 0.02, g: -6 },
  { n: "circle", t: B.focus + 0.35, g: -8 },
  { n: "pop", t: B.curious - 0.04, g: -8 },
];
export const SOUND: Soundtrack = { voice: null, seconds: SECONDS, cues: SFX, sfxDir: "sfx/kit" };

export const Demo: React.FC<{ transparent?: boolean }> = ({ transparent = false }) => {
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
                <TypeOn text="THIS IS…" t={t} at={B.this} cps={18} size={44} style={{ left: 92, top: 300, letterSpacing: "0.14em" }} />
                <Lockup t={t} fps={fps} y={380} lines={[{ text: "PAPER", at: B.paper }, { text: "COLLAGE", at: B.collage, highlight: true }]} />
                <Stamp t={t} fps={fps} at={B.stamp} text="MADE IN CODE" x={540} y={820} size={58} rot={-6} />
              </Page>
            ),
          },
          {
            at: B.s1,
            enter: "up",
            render: () => (
              <Page t={t} transparent={transparent}>
                <PanelStack
                  t={t}
                  fps={fps}
                  eyebrow="IT NEEDS…"
                  eyebrowAt={B.needs}
                  from={B.s1}
                  to={B.s2}
                  items={[
                    { at: B.hooks, label: "HOOKS", glyph: "?" },
                    { at: B.facts, label: "FACTS", glyph: "§" },
                    { at: B.payoff, label: "PAYOFF", glyph: "!", color: V.red },
                  ]}
                />
              </Page>
            ),
          },
          {
            at: B.s2,
            enter: "left",
            edge: "#d9d4c8",
            render: () => <PowerWordScene t={t} fps={fps} lead="WAIT…" leadAt={B.wait} word="REALLY?" wordAt={B.really} />,
          },
          {
            at: B.s3,
            enter: "up",
            render: () => (
              <Page t={t} transparent={transparent}>
                <FocusRow t={t} fps={fps} inAt={B.row} at={B.focus} count={5} chosen={2} y={470} size={120} />
                <IdeaBurst t={t} fps={fps} at={B.curious - 0.04} x={540} y={400} scale={0.55} />
                <Lockup t={t} fps={fps} y={690} lines={[{ text: "CURIOUS", at: B.curious, size: 150 }, { text: "MINDS", at: B.minds, highlight: true, size: 150 }]} />
              </Page>
            ),
          },
        ]}
      />
      <SfxTrack cues={SFX} />
    </AbsoluteFill>
  );
};

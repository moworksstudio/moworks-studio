// The cartoon runtime: a Three.js world rendered per frame inside Remotion with the v2 look (flat drawn cast,
// bloom, gather DOF, grade), voice-timed captions, the voice-over and the kit's sound cues. Each video supplies:
//   build()                 → its world (scene + KitLights [+ setSky])
//   apply(world, cam, out)  → poses everything for output frame `out`, places the camera, returns { look, focus }
// Width/height come from the composition (1080×1920 shorts, 1920×1080 long-form).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadPatrickHand } from "@remotion/google-fonts/PatrickHand";
import { loadFont as loadCaveatBrush } from "@remotion/google-fonts/CaveatBrush";
import * as THREE from "three";
import { SfxTrack, type Cue } from "./sound";
import { createEngine, Engine } from "./engine";
import { setFlatChars, setLook } from "./lib";
import { applyLook, KitLights, Look } from "./looks";

export type ToonWorld = { scene: THREE.Scene; lights: KitLights; setSky?: (sky: "day" | "dawn") => void };
export type ShotState = { look: Look; focus: THREE.Vector3 };

/** The three fonts (all OFL, from Google Fonts; loaded when rendering, so rendering needs internet): Outfit 800 for
 *  captions and UI text, Patrick Hand for handwriting, Caveat Brush for whiteboard marker. Textures are drawn on
 *  canvases with these families, so every world is built only after this resolves. */
export const loadToonFonts = async () => {
  await Promise.all([
    loadOutfit("normal", { weights: ["800"], subsets: ["latin"] }).waitUntilDone(),
    loadPatrickHand("normal", { weights: ["400"], subsets: ["latin"] }).waitUntilDone(),
    loadCaveatBrush("normal", { weights: ["400"], subsets: ["latin"] }).waitUntilDone(),
  ]);
};

const SS = 2; // supersampling

function Picture<W extends ToonWorld>({ build, apply, flatCast }: { build: () => W; apply: (w: W, cam: THREE.PerspectiveCamera, out: number) => ShotState; flatCast: boolean }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<{ world: W; engine: Engine } | null>(null);
  const [ready, setReady] = useState(false);
  const [initHandle] = useState(() => delayRender("toon video init"));
  const released = useRef(false);

  useEffect(() => {
    let alive = true;
    loadToonFonts()
      .then(() => {
        if (!alive || !canvas.current) return;
        setLook("v2");
        setFlatChars(flatCast);
        const world = build();
        world.lights.practicals.forEach((p) => (p.userData.base = p.intensity));
        const engine = createEngine(canvas.current, world.scene, width, height, SS, "v2");
        live.current = { world, engine };
        setReady(true);
      })
      .catch((err) => cancelRender(err));
    return () => {
      alive = false;
      live.current?.engine.dispose();
      live.current = null;
      setLook("v1");
      setFlatChars(false);
    };
  }, [build, flatCast, width, height]);

  useLayoutEffect(() => {
    if (!ready || !live.current) return;
    const { world, engine } = live.current;
    engine.camera.aspect = width / height;
    const st = apply(world, engine.camera, frame);
    engine.camera.updateProjectionMatrix();
    applyLook(world.lights, engine, st.look, engine.camera.position.distanceTo(st.focus), world.setSky);
    engine.render();
    if (!released.current) {
      released.current = true;
      continueRender(initHandle);
    }
  }, [frame, ready, initHandle, apply, width, height]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1b2140" }}>
      <canvas ref={canvas} style={{ width, height }} />
    </AbsoluteFill>
  );
}

/** One word at a time, white heavy type with an ink stroke (the caption of this style). */
export const ToonCaptions: React.FC<{ words: [number, string][]; top?: number; size?: number }> = ({ words, top, size }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  let cur = -1;
  for (let i = 0; i < words.length; i++) if (words[i][0] <= t) cur = i;
  if (cur < 0) return null;
  const [start, word] = words[cur];
  const k = Math.min(1, (t - start) / (4 / fps));
  const scale = 0.86 + 0.14 * (1 - Math.pow(1 - k, 3));
  const portrait = height > width;
  const fontSize = size ?? (portrait ? 92 : 84);
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: top ?? (portrait ? 1300 : 820),
          fontFamily: "Outfit",
          fontWeight: 800,
          fontSize,
          letterSpacing: -1,
          color: "#ffffff",
          WebkitTextStroke: `${Math.round(fontSize / 5.75)}px #0d0f17`,
          paintOrder: "stroke fill",
          textShadow: "0 6px 0 rgba(0,0,0,0.35)",
          transform: `scale(${scale})`,
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

export type ToonVideoProps<W extends ToonWorld> = {
  build: () => W;
  apply: (w: W, cam: THREE.PerspectiveCamera, out: number) => ShotState;
  words?: [number, string][];
  voice?: string | null; // staticFile path of the trimmed voice-over
  sfx?: Cue<string>[];
  sfxDir?: string; // default "sfx/kit" (the code-made sound kit; see .claude/skills/cartoon-video/references/SOUND.md)
  captionTop?: number;
  captionSize?: number;
  flatCast?: boolean;
};

export function ToonVideo<W extends ToonWorld>({ build, apply, words = [], voice = null, sfx = [], sfxDir = "sfx/kit", captionTop, captionSize, flatCast = true }: ToonVideoProps<W>) {
  return (
    <AbsoluteFill>
      <Picture build={build} apply={apply} flatCast={flatCast} />
      {words.length ? <ToonCaptions words={words} top={captionTop} size={captionSize} /> : null}
      {voice ? <Audio src={staticFile(voice)} /> : null}
      {sfx.length ? <SfxTrack dir={sfxDir} cues={sfx} /> : null}
    </AbsoluteFill>
  );
}

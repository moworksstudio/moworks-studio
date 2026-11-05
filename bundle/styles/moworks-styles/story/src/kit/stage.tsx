// stage.tsx — the one Remotion component every video in this kit uses: a 1920×1080 <canvas> that a plain-JS scene
// function draws on, frame by frame. It waits for the fonts before the first draw (canvas text needs loaded fonts),
// can start the scene at an offset (a demo is a window into a longer video), and can fade the picture in/out.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

export type Draw = (x: CanvasRenderingContext2D, t: number, frame: number) => void;

export const CanvasStage: React.FC<{
  draw: Draw;
  /** fonts the scene's canvas text uses, as CSS font shorthands, e.g. ['800 20px "Open Sans"'] */
  fonts: string[];
  /** seconds into the scene's own timeline where this composition starts (default 0) */
  offset?: number;
  /** [fade-in, fade-out] seconds through black, on top of the scene's own fades */
  fade?: [number, number];
}> = ({ draw, fonts, offset = 0, fade = [0, 0] }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("fonts for canvas text"));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    Promise.all(fonts.map((f) => document.fonts.load(f))).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle, fonts]);
  useLayoutEffect(() => {
    if (ready && ref.current) draw(ref.current.getContext("2d")!, offset + frame / fps, Math.round(offset * fps) + frame);
  }, [frame, ready, draw, offset, fps]);
  const t = frame / fps;
  const end = durationInFrames / fps;
  const black = Math.max(fade[0] > 0 ? 1 - Math.min(1, t / fade[0]) : 0, fade[1] > 0 ? 1 - Math.min(1, (end - t) / fade[1]) : 0);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={width} height={height} style={{ width, height }} />
      {black > 0 ? <AbsoluteFill style={{ background: "#000", opacity: black }} /> : null}
    </AbsoluteFill>
  );
};

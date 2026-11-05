// Root.tsx — every composition of this kit. tools/new-graphic.mjs adds each new graphic between the @graphics markers
// (keep the markers). One broken file breaks EVERY render — run `node tools/check.mjs` after each change.
import React from "react";
import { Composition, Folder } from "remotion";
import * as Demo from "./demo/Demo";
// @graphics-imports

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Demo">
      <Composition id="Demo" component={Demo.Demo} durationInFrames={Demo.FRAMES} fps={Demo.FPS} width={Demo.WIDTH} height={Demo.HEIGHT} defaultProps={{ transparent: false }} />
    </Folder>
    <Folder name="Graphics">
      {/* @graphics-compositions */}
    </Folder>
  </>
);

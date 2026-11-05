// Root.tsx — every composition of this kit. tools/new-video.mjs adds each new video between the @videos markers
// (keep the markers). One broken file breaks EVERY render — run `node tools/check.mjs` after each change.
import React from "react";
import { Composition, Folder } from "remotion";
import * as DS from "./demos/DemoStickman";
import * as DI from "./demos/DemoInnerVoice";
import * as XF from "./examples/ExampleFly";
import * as XC from "./examples/ExampleFirstChord";
// @videos-imports

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Demos">
      <Composition id="DemoStickman" component={DS.DemoStickman} durationInFrames={DS.FRAMES} fps={DS.FPS} width={DS.WIDTH} height={DS.HEIGHT} />
      <Composition id="DemoInnerVoice" component={DI.DemoInnerVoice} durationInFrames={DI.FRAMES} fps={DI.FPS} width={DI.WIDTH} height={DI.HEIGHT} />
    </Folder>
    <Folder name="Examples">
      <Composition id="ExampleFly" component={XF.ExampleFly} durationInFrames={XF.FRAMES} fps={XF.FPS} width={XF.WIDTH} height={XF.HEIGHT} />
      <Composition id="ExampleFirstChord" component={XC.ExampleFirstChord} durationInFrames={XC.FRAMES} fps={XC.FPS} width={XC.WIDTH} height={XC.HEIGHT} />
    </Folder>
    <Folder name="Videos">
      {/* @videos-compositions */}
    </Folder>
  </>
);

// Root.tsx — every composition of this kit. tools/new-video.mjs adds each new video (and its -Check twin) between the
// @videos markers (keep the markers). One broken file breaks EVERY render: run `node tools/check.mjs` after each change.
import React from "react";
import { Composition, Folder } from "remotion";
import * as DT from "./demos/DemoTall";
import * as DW from "./demos/DemoWide";
import * as XP from "./examples/what-if-no-pain/Video";
import * as XC from "./examples/cheese-bank-vault/Video";
// @videos-imports

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Demos">
      <Composition id="DemoTall" component={DT.DemoTall} durationInFrames={DT.FRAMES} fps={DT.FPS} width={DT.WIDTH} height={DT.HEIGHT} />
      <Composition id="DemoTall-Check" component={DT.DemoTallCheck} durationInFrames={1} fps={DT.FPS} width={DT.WIDTH} height={DT.HEIGHT} />
      <Composition id="DemoWide" component={DW.DemoWide} durationInFrames={DW.FRAMES} fps={DW.FPS} width={DW.WIDTH} height={DW.HEIGHT} />
      <Composition id="DemoWide-Check" component={DW.DemoWideCheck} durationInFrames={1} fps={DW.FPS} width={DW.WIDTH} height={DW.HEIGHT} />
    </Folder>
    <Folder name="Examples">
      <Composition id="WhatIfNoPain" component={XP.WhatIfNoPain} durationInFrames={XP.FRAMES} fps={XP.FPS} width={XP.WIDTH} height={XP.HEIGHT} />
      <Composition id="WhatIfNoPain-Check" component={XP.WhatIfNoPainCheck} durationInFrames={1} fps={XP.FPS} width={XP.WIDTH} height={XP.HEIGHT} />
      <Composition id="CheeseBankVault" component={XC.CheeseBankVault} durationInFrames={XC.FRAMES} fps={XC.FPS} width={XC.WIDTH} height={XC.HEIGHT} />
      <Composition id="CheeseBankVault-Check" component={XC.CheeseBankVaultCheck} durationInFrames={1} fps={XC.FPS} width={XC.WIDTH} height={XC.HEIGHT} />
    </Folder>
    <Folder name="Videos">
      {/* @videos-compositions */}
    </Folder>
  </>
);

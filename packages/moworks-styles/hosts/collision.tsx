// The 3D Cartoon source skill's collision module, as a film imports it (../../kit/collision), with the app's held-prop check beside it (owner
// #1267, held.ts). Everything is the source skill's, exported as shipped; CollisionCheck is the source skill's own component, given the same build,
// scene and frames, its poseFrame wrapped so that after the source skill poses each frame the app's tracker looks at the held props too, and
// prints its "HELD …" lines once the last frame is posed. The source skill's "COLLISION …" lines and its report are unchanged.
import React, { useState } from "react";
import * as Skill from "mw-skill-collision";
import { heldTracker } from "./held";

export * from "mw-skill-collision";

type Props<W> = { build: () => W; scene: (w: W) => any; poseFrame: (w: W, out: number) => void; frames: number };

export function CollisionCheck<W>({ build, scene, poseFrame, frames }: Props<W>) {
  const [wrapped] = useState(() => {
    let held: ReturnType<typeof heldTracker> | null = null;
    return {
      build: () => {
        const w = build();
        try { const s = scene(w); held = heldTracker(s.scene, s.characters, (w as any)?.cast); } catch (e) { console.log(`HELD not checked: ${String((e as Error)?.message ?? e).split("\n")[0]}`); held = null; }
        return w;
      },
      poseFrame: (w: W, out: number) => {
        poseFrame(w, out);
        if (!held) return;
        try { held.frame(out); } catch (e) { console.log(`HELD not checked: ${String((e as Error)?.message ?? e).split("\n")[0]}`); held = null; return; }
        if (out === frames - 1) held.lines().forEach((l) => console.log(l));
      },
    };
  });
  return <Skill.CollisionCheck build={wrapped.build} scene={scene} poseFrame={wrapped.poseFrame} frames={frames} />;
}

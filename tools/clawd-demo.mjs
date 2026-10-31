// The Clawd demo's media in the app's bundle (bundle/library/characters/clawd/: the views and emotions sheets, the poster, the showreel at the
// cards' size), remade when the kit's pin moves. A maintainer's step: the running app only reads that folder, and refuses to draw its own
// characters. Credit: Clawd is Anthropic's mascot, drawn by the app's character layer on ClaudeAnimationBase's kit (John Heibel, MIT).
// Usage: node tools/clawd-demo.mjs, then node tools/make-bundle.mjs --only library-characters (counts them)
import { renameSync } from "node:fs";
import { join } from "node:path";
import { renderDemo, shippedRoot } from "../packages/character-kit/index.mjs";
import { finalize } from "../packages/hf-edit/finalize.mjs";
import { snapshotAt } from "../packages/hf-qa/cli.mjs";
import { render } from "../packages/hf-render-worker/client.mjs";
import { encodePoster, encodeVideo } from "../packages/library/preview-media.mjs";

const out = join(shippedRoot(), "clawd");
await renderDemo("clawd", { out, finalize, snapshotAt, render, encodePoster, onProgress: ({ stage }) => console.log(stage) });
encodeVideo(join(out, "showreel.mp4"), join(out, "showreel.part.mp4"));
renameSync(join(out, "showreel.part.mp4"), join(out, "showreel.mp4"));
console.log(`clawd: its media in ${out}`);

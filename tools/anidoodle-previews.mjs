// The Style Gallery's anidoodle previews: the author's drawing film of each medium rendered through
// HyperFrames into <work>/library/anidoodle/anidoodle-<commit7>/previews/, then the poster and film of the author's rigged characters (Bit,
// the cheetah) in the Characters library, straight into bundle/library/characters/. Into the app's bundle afterwards (the characters only counted):
//   node tools/make-bundle.mjs --only library-anidoodle,library-characters
// Usage: node tools/anidoodle-previews.mjs [--only id,id] [--force] [--workers 2] [--plan]
import { makeCharacterMedia, makePreviews, previewPlan } from "../packages/anidoodle-styles/previews.mjs";

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const only = arg("--only")?.split(",").filter(Boolean) ?? null;
if (process.argv.includes("--plan")) {
  for (const m of await previewPlan(undefined, { only })) console.log(`${m.id}\t${m.page}\t${m.meta.W}x${m.meta.H}\t${m.meta.fps} fps\t${(m.meta.durationFrames / m.meta.fps).toFixed(1)} s`);
} else {
  const r = await makePreviews({ only, force: process.argv.includes("--force"), workers: Number(arg("--workers") ?? 2),
    onProgress: (p) => console.log(`${p.done}/${p.total} ${p.id}${p.failed.some((f) => f.id === p.id) ? ` FAILED ${p.failed.find((f) => f.id === p.id).error}` : ""}`) });
  console.log(`previews: ${r.ok} made, ${r.failed.length} failed of ${r.total}`);
  console.log(`characters: ${(await makeCharacterMedia({ force: process.argv.includes("--force"), workers: Number(arg("--workers") ?? 2) })).join(", ") || "nothing new"}`);
}

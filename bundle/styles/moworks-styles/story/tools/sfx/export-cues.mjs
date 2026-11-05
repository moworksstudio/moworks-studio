#!/usr/bin/env node
// export-cues.mjs — write each composition's sound cues to a soundtrack.json for tools/sfx/mix.py.
//   node tools/sfx/export-cues.mjs src/soundtracks.ts out/_sound
// The registry module exports  <CompositionId>: Soundtrack  ({ voice, seconds, cues } from src/kit/sound.tsx).
// The cue times stay defined in the composition code (from the word timings) — this just reads them out, so the
// Studio preview and the final mix can never drift apart. npm packages load for real (node), local code is bundled.
import { build } from "esbuild";
import fs from "fs";
import { createRequire } from "module";
import path from "path";

const [registry, outDir] = process.argv.slice(2);
if (!registry || !outDir) {
  console.error("usage: node tools/sfx/export-cues.mjs <registry.ts> <outDir>");
  process.exit(1);
}
const root = process.cwd();
const res = await build({
  entryPoints: [registry],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  loader: { ".json": "json", ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty" },
  logLevel: "error",
});
// module-level browser work (e.g. @remotion/fonts loadFont → FontFace) rejects in node — irrelevant to the cues
process.on("unhandledRejection", (e) => {
  if (!/FontFace|document|window/.test(String(e))) throw e;
});
const mod = { exports: {} };
new Function("require", "module", "exports", res.outputFiles[0].text)(createRequire(path.join(root, "package.json")), mod, mod.exports);

fs.mkdirSync(outDir, { recursive: true });
for (const [id, st] of Object.entries(mod.exports)) {
  if (!st || !Array.isArray(st.cues)) continue;
  const cues = st.cues
    .map((c) => ({ n: c.n, t: Math.round(c.t * 1000) / 1000, g: Math.round(c.g * 10) / 10 }))
    .sort((a, b) => a.t - b.t);
  const dir = st.sfxDir;
  if (!dir) throw new Error(`${id}: SOUND.sfxDir is missing (sfx/stickman or sfx/inner-voice)`);
  for (const c of cues) {
    if (!fs.existsSync(path.join(root, "public", dir, `${c.n}.wav`))) throw new Error(`${id}: no public/${dir}/${c.n}.wav`);
    if (!Number.isFinite(c.t) || !Number.isFinite(c.g)) throw new Error(`${id}: bad cue ${JSON.stringify(c)}`);
  }
  const out = {
    composition: id,
    voice: st.voice ? `public/${st.voice}` : null,
    seconds: Math.round(st.seconds * 1000) / 1000,
    sfxDir: `public/${dir}`,
    cues,
    music: st.music ?? null,
    master: !!st.master, // no voice, but master the music + effects to −14 LUFS (a captions-only film)
    fade: st.fade ?? null, // [in, out] seconds over the whole mix
  };
  const file = path.join(outDir, `${id}.soundtrack.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2).replace(/\{\n\s+"n": ("[^"]+"),\n\s+"t": ([\d.-]+),\n\s+"g": ([\d.-]+)\n\s+\}/g, '{ "n": $1, "t": $2, "g": $3 }') + "\n");
  console.log(`${file}  ${cues.length} cues  ${out.seconds}s`);
}

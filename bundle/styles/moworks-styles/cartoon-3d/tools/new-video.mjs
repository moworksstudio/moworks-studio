#!/usr/bin/env node
// new-video.mjs — start a new cartoon video in one command:
//   node tools/new-video.mjs <slug> --format short|long [--title "What If You Stopped Feeling Pain?"]
//     short = 1080×1920 (9:16: Shorts, Reels, TikTok) · long = 1920×1080 (16:9: YouTube) · always 30 fps
// Creates (never overwrites):
//   src/videos/<slug>/world.ts      the sets, props, cast and lights (starts as a small room with Mika + Ravi)
//   src/videos/<slug>/shots.ts      the shot list: camera A→B, look, and what everyone does, per shot
//   src/videos/<slug>/vo.ts         the voice-over: VOICE, word times (captions), ANCHORS, FRAMES, sound cues
//   src/videos/<slug>/Video.tsx     the composition, its collision-QA twin and its SOUND
//   public/videos/<slug>/           the voice file goes here (voice.wav)
//   projects/<slug>/PLAN.md         the plan: script, facts, voice, shots, sound, checks, versions
// and registers <CompId> and <CompId>-Check in src/Root.tsx and the sound in src/soundtracks.ts (between the @videos
// markers), then runs the syntax check. <CompId> is the slug in PascalCase (what-if-no-sleep → WhatIfNoSleep).
import fs from "fs";
import path from "path";
import { ROOT, args, pascal, run } from "./lib.mjs";

const o = args(process.argv.slice(2));
const [raw] = o._;
const format = o.format || "short";
if (!raw || !["short", "long"].includes(format)) {
  console.error('usage: node tools/new-video.mjs <slug> --format short|long [--title "…"]');
  process.exit(1);
}
const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
if (!/^[a-z]/.test(slug)) {
  console.error("✗ the slug must start with a letter (e.g. cheese-bank)");
  process.exit(1);
}
const comp = pascal(slug);
const [W, H] = format === "long" ? [1920, 1080] : [1080, 1920];
const title = o.title || comp.replace(/([a-z])([A-Z])/g, "$1 $2");
const fill = (s) => s.replaceAll("__COMP__", comp).replaceAll("__SLUG__", slug).replaceAll("__W__", String(W)).replaceAll("__H__", String(H));
const write = (rel, text) => {
  const dst = path.join(ROOT, rel);
  if (fs.existsSync(dst)) {
    console.log(`  kept   ${rel} (exists)`);
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, text);
  console.log(`  wrote  ${rel}`);
};

for (const f of fs.readdirSync(path.join(ROOT, "templates/video"))) write(`src/videos/${slug}/${f}`, fill(fs.readFileSync(path.join(ROOT, "templates/video", f), "utf8")));
fs.mkdirSync(path.join(ROOT, "public/videos", slug), { recursive: true });
write(
  `projects/${slug}/PLAN.md`,
  `# ${slug}: "${title}" (${format === "long" ? "16:9, 1920×1080" : "9:16, 1080×1920"}, 30 fps)\n\n` +
    `Composition \`${comp}\` (+ \`${comp}-Check\`) · code src/videos/${slug}/ · voice public/videos/${slug}/voice.wav · script projects/${slug}/script.txt\n\n` +
    `## Script (one continuous paragraph; also saved word for word in script.txt)\n…\n\n` +
    `## Facts (every real-world claim; details in FACTS.md: claim · as spoken · source · checked)\n…\n\n` +
    `## Voice (own recording, or the voice MCP: tool, model, voice, cost, takes)\n…\n\n` +
    `## Shots (one spoken beat = one shot; one look per shot)\n| # | Seconds | Words | Picture | Look |\n|---|---|---|---|---|\n| 1 | 0.0–… | … | … | wideBright |\n\n` +
    `## Sound cues (key moments only)\n| t (s) | Sound | Gain | Moment |\n|---|---|---|---|\n\n` +
    `## Checks\n- collision QA: …\n- stills: …\n- render + qc: …\n- render review: …\n\n` +
    `## Versions\n| v | Date | What changed |\n|---|---|---|\n`,
);

// register (idempotent)
const rootF = path.join(ROOT, "src/Root.tsx");
let root = fs.readFileSync(rootF, "utf8");
const id = `V_${slug.replace(/-/g, "_")}`;
if (!root.includes(`"./videos/${slug}/Video"`)) {
  root = root.replace("// @videos-imports", `import * as ${id} from "./videos/${slug}/Video";\n// @videos-imports`);
  root = root.replace(
    "{/* @videos-compositions */}",
    `<Composition id="${comp}" component={${id}.${comp}} durationInFrames={${id}.FRAMES} fps={${id}.FPS} width={${id}.WIDTH} height={${id}.HEIGHT} />\n      <Composition id="${comp}-Check" component={${id}.${comp}Check} durationInFrames={1} fps={${id}.FPS} width={${id}.WIDTH} height={${id}.HEIGHT} />\n      {/* @videos-compositions */}`,
  );
  fs.writeFileSync(rootF, root);
  console.log(`  registered ${comp} and ${comp}-Check in src/Root.tsx`);
}
const stF = path.join(ROOT, "src/soundtracks.ts");
let st = fs.readFileSync(stF, "utf8");
if (!st.includes(`"./videos/${slug}/Video"`)) {
  st = st.replace("// @videos-soundtracks", `export { SOUND as ${comp} } from "./videos/${slug}/Video";\n// @videos-soundtracks`);
  fs.writeFileSync(stF, st);
  console.log(`  registered ${comp} in src/soundtracks.ts`);
}
run(process.execPath, [path.join(ROOT, "tools/check.mjs")]);
console.log(`\n✓ ${comp} (${format === "long" ? "16:9" : "9:16"}) is ready to build.
  next: script → projects/${slug}/script.txt · voice → public/videos/${slug}/voice.wav
        node tools/vo-words.mjs public/videos/${slug}/voice.wav --script projects/${slug}/script.txt
        then build world.ts / shots.ts / vo.ts, and check: node tools/stills.mjs ${comp} out/${slug}/stills-1 auto --sheet`);

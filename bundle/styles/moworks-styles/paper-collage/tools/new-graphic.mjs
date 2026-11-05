#!/usr/bin/env node
// new-graphic.mjs — start a new motion graphic: a composition file from the template, registered and checked.
//
//   node tools/new-graphic.mjs <slug> [--title "What it is"] [--format square|vertical|horizontal] [--seconds 8]
//        [--fps 60] [--comp Name] [--voice <audio file>] [--force]
//
//   format      square 1080×1080 · vertical 1080×1920 · horizontal 1920×1080 (default: kit.config.json, else square)
//   --voice     a voice-over to sync to: copied to public/graphics/<slug>/voice.wav, transcribed (word times →
//               projects/<slug>/transcript.md), and the length becomes the voice + 0.6 s
//   writes      src/graphics/<slug>/<Comp>.tsx (+ registration in src/Root.tsx and src/soundtracks.ts),
//               projects/<slug>/PLAN.md, public/graphics/<slug>/ (put this graphic's images here)
import fs from "fs";
import path from "path";
import { FFMPEG, ROOT, args, config, pascal, probe, run } from "./lib.mjs";

const o = args(process.argv.slice(2), ["force"]);
const [slug] = o._;
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('usage: node tools/new-graphic.mjs <slug> [--title "…"] [--format square|vertical|horizontal] [--seconds 8] [--voice file] [--force]\n       slug = lower-case words with dashes, e.g. rise-of-coffee');
  process.exit(1);
}
const cfg = config();
const SIZES = { square: [1080, 1080], vertical: [1080, 1920], horizontal: [1920, 1080] };
const format = o.format || cfg.defaults?.format || "square";
if (!SIZES[format]) {
  console.error(`✗ --format must be square, vertical or horizontal (got "${format}")`);
  process.exit(1);
}
const [W, H] = SIZES[format];
const fps = Number(o.fps || cfg.defaults?.fps || 60);
const comp = o.comp || pascal(slug);
if (!/^[A-Z][A-Za-z0-9]*$/.test(comp)) {
  console.error(`✗ --comp must be PascalCase letters/digits (got "${comp}")`);
  process.exit(1);
}
const P = (...p) => path.join(ROOT, ...p);
const srcDir = P("src/graphics", slug);
if (fs.existsSync(srcDir) && !o.force) {
  console.error(`✗ src/graphics/${slug} already exists — pick another slug, or --force (overwrites the composition!)`);
  process.exit(1);
}
fs.mkdirSync(srcDir, { recursive: true });
fs.mkdirSync(P("public/graphics", slug), { recursive: true });
fs.mkdirSync(P("projects", slug), { recursive: true });

let seconds = Number(o.seconds || 8);
let voice = "null";
let voiceNote = "";
let beatsNote = "the rhythm you design (no voice-over) — a visible change every 0.5–1.2 s";
if (o.voice) {
  if (!fs.existsSync(o.voice)) {
    console.error(`✗ no such file: ${o.voice}`);
    process.exit(1);
  }
  const dst = P("public/graphics", slug, "voice.wav");
  run(FFMPEG(), ["-v", "error", "-y", "-i", o.voice, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", dst]);
  seconds = Math.round((probe(dst).duration + 0.6) * 100) / 100;
  console.log(`voice → public/graphics/${slug}/voice.wav (${seconds.toFixed(2)} s with the 0.6-s hold)`);
  const tArgs = [P("tools/transcribe.mjs"), dst, slug];
  for (const k of ["engine", "model", "language"]) if (o[k]) tArgs.push(`--${k}`, o[k]);
  run(process.execPath, tArgs);
  const words = JSON.parse(fs.readFileSync(P("projects", slug, "words.json"), "utf8")).words;
  fs.writeFileSync(
    P("projects", slug, "transcript.md"),
    [`# ${slug} — voice-over word times (seconds)`, "", "Hit every beat on its word, 0.04–0.10 s early.", "", "| t | word |", "|---|---|", ...words.map((w) => `| ${w.t.toFixed(2)} | ${w.w} |`), ""].join("\n"),
  );
  voice = `"graphics/${slug}/voice.wav"`;
  voiceNote = `\n// Voice-over: public/graphics/${slug}/voice.wav · word times: projects/${slug}/transcript.md`;
  beatsNote = `the voice-over's word times (projects/${slug}/transcript.md)`;
}

const today = new Date().toISOString().slice(0, 10);
const title = o.title || slug.replace(/-/g, " ");
const tpl = fs.readFileSync(P("templates/Graphic.template.tsx"), "utf8");
const file = path.join(srcDir, `${comp}.tsx`);
fs.writeFileSync(
  file,
  tpl
    .replaceAll("__COMP__", comp)
    .replaceAll("__SLUG__", slug)
    .replaceAll("__TITLE__", title)
    .replaceAll("__DATE__", today)
    .replaceAll("__FPS__", String(fps))
    .replaceAll("__WIDTH__", String(W))
    .replaceAll("__HEIGHT__", String(H))
    .replaceAll("__SECONDS__", String(seconds))
    .replaceAll("__VOICE__", voice)
    .replaceAll("__VOICE_NOTE__", voiceNote)
    .replaceAll("__BEATS_NOTE__", beatsNote),
);

const id = `G_${slug.replace(/-/g, "_")}`;
const rootFile = P("src/Root.tsx");
let root = fs.readFileSync(rootFile, "utf8");
if (!root.includes(`./graphics/${slug}/${comp}"`)) {
  root = root.replace("// @graphics-imports", `import * as ${id} from "./graphics/${slug}/${comp}";\n// @graphics-imports`);
  root = root.replace(
    "{/* @graphics-compositions */}",
    `<Composition id="${comp}" component={${id}.${comp}} durationInFrames={${id}.FRAMES} fps={${id}.FPS} width={${id}.WIDTH} height={${id}.HEIGHT} defaultProps={{ transparent: false }} />\n      {/* @graphics-compositions */}`,
  );
  fs.writeFileSync(rootFile, root);
}
const stFile = P("src/soundtracks.ts");
let st = fs.readFileSync(stFile, "utf8");
if (!st.includes(`./graphics/${slug}/${comp}"`)) {
  st = st.replace("// @graphics-soundtracks", `export { SOUND as ${comp} } from "./graphics/${slug}/${comp}";\n// @graphics-soundtracks`);
  fs.writeFileSync(stFile, st);
}
const plan = P("projects", slug, "PLAN.md");
if (!fs.existsSync(plan)) {
  fs.writeFileSync(
    plan,
    `# ${title} — plan (${today})

Composition \`${comp}\` · ${W}×${H} · ${fps} fps · ${seconds} s${o.voice ? " · synced to a voice-over" : ""}

## Brief
- What it says (one sentence):
- Where it will be used / output (MP4; a transparent overlay or GIF only if asked):
- Images available (inbox / chat / to generate):

## Beat map (STYLE.md §2) — one row per scene
| Time (s) | Scene | What happens on which beat | Sound |
|---|---|---|---|
| 0.0– | | (frame 0 is never empty) | |

## Images (IMAGES.md)
| File | What | Source (user / generated / code) | Status |
|---|---|---|---|

## Versions
| Version | Date | What changed | User's notes |
|---|---|---|---|
| v1 | ${today} | first build | |
`,
  );
}
run(process.execPath, [P("tools/check.mjs"), file, rootFile, stFile]);
console.log(`
✓ ${comp} ready to build (${W}×${H}, ${fps} fps, ${seconds} s)
  composition  src/graphics/${slug}/${comp}.tsx
  plan         projects/${slug}/PLAN.md
  images       public/graphics/${slug}/   (reference them as "graphics/${slug}/<file>")
  next         beat map → build → node tools/stills.mjs ${comp} out/${slug}/stills-1 auto --sheet`);

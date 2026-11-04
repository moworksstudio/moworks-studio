// new-video.mjs: start a new explainer video in one command.
//   node tools/new-video.mjs <slug> --format wide|tall --title "Where the Needle Stops" [--seconds 40]
//     wide = 1920×1080 (16:9, YouTube) · tall = 1080×1920 (9:16, Shorts / Reels / TikTok) · always 60 fps
// Creates videos/<slug>/ from templates/video (never overwrites a video that exists):
//   index.html                the page: size, length and fps live on its root (the single source)
//   SCRIPT.md STORYBOARD.md ART.md   the plan, the shot + event-cue tables, the art contract
//   story/story.js            the film skeleton · story/film-pal.js this film's colours
//   story/script.txt          the approved script, word for word (empty until then)
//   story/words.json + words.js   word times (empty until tools/time-voice.mjs runs)
//   story/sound.json          the sound cues · audio/takes/ where the voice take goes
// then copies the engine, fonts and GSAP into its ex/ folder (tools/sync-engine.mjs).
// --format defaults to kit.config.json → defaults.format; --seconds (the film length) to 40. Change the
// length later with: node tools/set-duration.mjs videos/<slug> <seconds>
import fs from "node:fs";
import path from "node:path";
import { ROOT, args, config, fail, run } from "./lib.mjs";

const o = args(process.argv.slice(2));
const [raw] = o._;
const format = o.format || config().defaults?.format || "wide";
if (!raw || !["wide", "tall"].includes(format)) fail('usage: node tools/new-video.mjs <slug> --format wide|tall --title "<Title>" [--seconds 40]');
const slug = String(raw).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
if (!/^[a-z]/.test(slug)) fail("the slug must start with a letter (e.g. where-the-needle-stops)");
const seconds = o.seconds === undefined ? 40 : Number(o.seconds);
if (!(seconds >= 2 && seconds <= 3600)) fail("--seconds must be a number from 2 to 3600 (the film length)");
const dur = String(Math.round(seconds * 1000) / 1000);
const [W, H] = format === "wide" ? [1920, 1080] : [1080, 1920];
const title = String(o.title || slug.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase())).trim();
const titleT = Math.round(Math.max(0.5, seconds - 4.8) * 100) / 100; // placeholder until the voice is timed

const dst = path.join(ROOT, "videos", slug);
if (fs.existsSync(dst) && fs.readdirSync(dst).length) fail(`videos/${slug} already exists. Pick another slug, or work in that folder.`);
const html = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (text, file) =>
  text
    .replaceAll("__TITLE__", file.endsWith(".html") ? html(title) : title)
    .replaceAll("__W__", String(W))
    .replaceAll("__H__", String(H))
    .replaceAll("__RES__", W >= H ? "landscape" : "portrait")
    .replaceAll("__DUR__", dur)
    .replaceAll("__SLUG__", slug)
    .replaceAll("__FORMAT__", format === "wide" ? "16:9, 1920×1080" : "9:16, 1080×1920")
    .replaceAll("__DATE__", new Date().toISOString());

// copy the template, filling the placeholders
const TEXT = /\.(html|json|js|md|txt)$/;
const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else if (TEXT.test(e.name)) fs.writeFileSync(b, fill(fs.readFileSync(a, "utf8"), e.name));
    else fs.copyFileSync(a, b);
  }
};
copyDir(path.join(ROOT, "templates/video"), dst);

// sound.json carries the film length and a placeholder title time (tools/sound.mjs keeps them in step)
const soundF = path.join(dst, "story/sound.json");
const sound = JSON.parse(fs.readFileSync(soundF, "utf8"));
sound.duration = seconds;
sound.title = { t: titleT };
fs.writeFileSync(soundF, JSON.stringify(sound, null, 2) + "\n");

// no voice yet: an empty word list, so the page loads and story.js uses its fallback times
fs.writeFileSync(path.join(dst, "story/words.json"), "[]\n");
fs.mkdirSync(path.join(dst, "audio/takes"), { recursive: true });
run(process.execPath, [path.join(ROOT, "tools/words-js.mjs"), dst]);
run(process.execPath, [path.join(ROOT, "tools/sync-engine.mjs"), dst]);

console.log(`
✓ videos/${slug}: "${title}" (${format === "wide" ? "16:9, 1920×1080" : "9:16, 1080×1920"}, 60 fps, ${dur} s)
  next: the script → videos/${slug}/story/script.txt (word for word) and SCRIPT.md
        the voice take → videos/${slug}/audio/takes/take.wav, then: node tools/time-voice.mjs videos/${slug}
        the plan → STORYBOARD.md and ART.md, then the modules and story/story.js
        look: node tools/snapshot.mjs videos/${slug} --every 1.5   (sandbox disabled)`);

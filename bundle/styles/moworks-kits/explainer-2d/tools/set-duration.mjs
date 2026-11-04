// set-duration.mjs: set a video's length. index.html's root is the single source of a film's size and length;
// this rewrites its data-duration and the audio clip's (<audio id="mix">), which must match.
//   node tools/set-duration.mjs videos/<slug> 38.5
// story.js reads the length from the root, so nothing else in the picture changes. Then rebuild the sound
// (node tools/sound.mjs videos/<slug>), which writes the new length into sound.json and cues.json.
import fs from "node:fs";
import path from "node:path";
import { ROOT, fail, videoDirOf } from "./lib.mjs";

const USAGE = "usage: node tools/set-duration.mjs videos/<slug> <seconds>";
const [dirArg, secArg] = process.argv.slice(2);
const video = videoDirOf(dirArg, USAGE);
if (secArg === undefined) fail(USAGE);
const dir = path.relative(ROOT, video) || ".";
const seconds = Number(secArg);
if (!(seconds > 0 && seconds <= 3600)) fail(`"${secArg}" is not a length in seconds (from 0 to 3600)`);
const dur = String(Math.round(seconds * 1000) / 1000);
const file = path.join(video, "index.html");

let html = fs.readFileSync(file, "utf8");
const changed = [];
const setIn = (tagRe, label) => {
  let hit = false;
  html = html.replace(tagRe, (tag) => {
    hit = true;
    const old = (tag.match(/data-duration="([^"]*)"/) || [])[1];
    changed.push(`${label} ${old ?? "(none)"} → ${dur}`);
    return /data-duration="/.test(tag) ? tag.replace(/data-duration="[^"]*"/, `data-duration="${dur}"`) : tag.replace(/>$/, ` data-duration="${dur}">`);
  });
  return hit;
};
if (!setIn(/<div\b[^>]*\bid="root"[^>]*>/, "root")) fail(`${dir}/index.html has no <div id="root" …>`);
if (!setIn(/<audio\b[^>]*\bid="mix"[^>]*>/, "audio clip")) setIn(/<audio\b[^>]*>/g, "audio clip");
fs.writeFileSync(file, html);
console.log(`✓ ${path.relative(ROOT, file)}: ${changed.join(", ")}`);
console.log(`  next: node tools/sound.mjs ${dir}   (the mix and cues must be ${dur} s long too)`);

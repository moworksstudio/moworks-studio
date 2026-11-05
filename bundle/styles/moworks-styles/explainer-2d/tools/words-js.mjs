// words-js.mjs: turn story/words.json into story/words.js, inlined so a render never fetches anything at run time.
//   node tools/words-js.mjs videos/<slug>
import fs from "node:fs";
import path from "node:path";
import { ROOT, fail } from "./lib.mjs";

const dir = process.argv[2];
if (!dir) fail("usage: node tools/words-js.mjs videos/<slug>");
const src = path.resolve(ROOT, dir, "story/words.json");
if (!fs.existsSync(src)) fail(`${path.relative(ROOT, src)} is missing (time the voice first: node tools/time-voice.mjs ${dir})`);
const words = JSON.parse(fs.readFileSync(src, "utf8"));
const dst = path.resolve(ROOT, dir, "story/words.js");
fs.writeFileSync(dst, `/* generated from words.json by tools/words-js.mjs: word timings of audio/vo.wav */\nwindow.STORY_WORDS = ${JSON.stringify(words)};\n`);
console.log(`wrote ${path.relative(ROOT, dst)} (${words.length} words)`);

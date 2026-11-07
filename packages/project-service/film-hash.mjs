// The film's files as hashes (audit/112b b2.6/b2.7: they lived in server/proxy.mjs, and the style AE export, the cuts check and the sizes
// imported the server for them): the picture, the sound, the picture as drawn and the sound each lane's own file holds. What the background
// render, the sizes' "Out of date", the checks' reuse and an export's hash read.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { docPath } from "./docs.mjs";
import { SIZE_FILE } from "./sizes.mjs";

const AUDIO_TAG = /<(audio|hf-audio-group)\b[^>]*>(?:[\s\S]*?<\/\1>)?/gi;
const AUDIO_FILE = /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i;
// a lane's fader on the page: part of the sound, but no part of what each lane's own file holds (`heard`)
const LANE_TAGS = /<hf-audio-group\b[^>]*\bid="mw-lane-[^>]*>\s*<\/hf-audio-group>|\s+data-audio-group="mw-lane-[^"]*"/g;
// HF's element ids, written into the film's HTML when the Editor opens it (not a film change; older films also carry the ones HF Studio
// wrote). Opening the Editor stamped them on every element and <audio>, and the film's render and pre-render went stale with nothing drawn or heard changed.
const STUDIO_ID = /\s+data-hf-id="[^"]*"/g;
/** A page's text with its blank lines and the spaces at the ends of its lines left out: what an <audio> tag taken out leaves behind. */
const drawnText = (s) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).join("\n");
/** The film's files, hashed in two parts: the picture (index.html and the compositions without their <audio> tags,
 *  CHARACTERS.json, every asset but sound files: names, sizes and dates) at its fps, and the sound (every <audio> tag and the sound files
 *  under assets/ and audio/). HF's element ids count in neither. `drawn`: the picture once more with the pages' blank lines left out. The
 *  Final Mix taking a sound out leaves its tag's line empty, so the picture read as changed: a full render (3 min) for a sound alone,
 *  never the sound mixed again onto the picture (T25-3). `picture` stays as it was: the checks' hash and an export's reuse read it. */
export function filmParts(dir, fps) {
  const pic = createHash("sha256"), snd = createHash("sha256"), drw = createHash("sha256"), hrd = createHash("sha256");
  const both = (x) => { pic.update(x); drw.update(x); };
  const page = (s) => { pic.update(s); drw.update(drawnText(s)); };
  both(`fps:${fps}`);
  const text = (p) => { const s = readFileSync(p, "utf8").replace(STUDIO_ID, ""); const tags = s.match(AUDIO_TAG) ?? []; snd.update(tags.join("\n")); hrd.update(tags.map((x) => x.replace(LANE_TAGS, "")).filter(Boolean).join("\n")); return s.replace(AUDIO_TAG, ""); };
  const walk = (d, deep, only = null) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n), s = statSync(p), rel = relative(dir, p).split(sep).join("/");
      if (s.isDirectory()) { if (!n.startsWith(".") && n !== "_app" && n !== "rounds") walk(p, deep, only); continue; }
      // a file of one other size only (compositions/shot-03.9x16.html): no part of the master's picture (project-service/sizes.mjs)
      if (SIZE_FILE.test(n)) continue;
      const sound = AUDIO_FILE.test(n);
      if (only === "sound" && !sound) continue;
      const add = sound ? (x) => { snd.update(x); hrd.update(x); } : both;
      add(rel);
      if (deep && /\.html?$/i.test(n)) page(text(p));
      else if (deep && /\.(js|mjs|json|css|ts)$/i.test(n)) add(readFileSync(p)); else add(`${s.size}:${Math.floor(s.mtimeMs)}`);
    }
  };
  if (existsSync(join(dir, "index.html"))) { both("index.html"); page(text(join(dir, "index.html"))); }
  if (existsSync(docPath(dir, "CHARACTERS.json"))) { both("CHARACTERS.json"); both(readFileSync(docPath(dir, "CHARACTERS.json"))); }
  walk(join(dir, "compositions"), true);
  // a 2D Explainer film (one of the owner's film styles) keeps its code in story/, the page's own scripts, timed to the voice's words (STORY_WORDS, from
  // transcript.json): both are its picture. Test 38's final render was Version 1's picture with none of the Review's fixes in it (T38-8)
  if (existsSync(join(dir, "story"))) {
    walk(join(dir, "story"), true);
    if (existsSync(join(dir, "transcript.json"))) { both("transcript.json"); both(readFileSync(join(dir, "transcript.json"))); }
  }
  // the 3D Cartoon's film code (src/videos/…) and Ricks Clip's (film/): their picture too (T41-6: a Review fix in them was checked with old answers)
  walk(join(dir, "src"), true);
  walk(join(dir, "film"), true);
  walk(join(dir, "assets"), false);
  walk(join(dir, "audio"), false, "sound");
  return { picture: pic.digest("hex").slice(0, 16), sound: snd.digest("hex").slice(0, 16), drawn: drw.digest("hex").slice(0, 16), heard: hrd.digest("hex").slice(0, 16) };
}
/** The hash of what the film is drawn and heard from, at which fps. */
export function filmHash(dir, fps = null) {
  const { picture, sound } = filmParts(dir, fps);
  return createHash("sha256").update(`${picture}:${sound}`).digest("hex").slice(0, 16);
}

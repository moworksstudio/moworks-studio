// What a project's style id says without building the catalog (read from config/styles.json alone, so the scan and the project
// read can ask): a film cut to a song (its category is Music / Lyrics: the Lyrics step and the Music map); a board posed at the film's own
// seconds (HyperFrames' styles and General, whose storyboard rules follow HF's storyboard.md; the other authors' boards pose one frame a
// second); a style whose author gives its own ending (every style but General and HyperFrames' own: house rules §9, the app fades only
// the music).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

const MUSIC = "Music / Lyrics";

const MUSIC_BRIEF = /\bmusic[\s-]*video\b|video (?:ca nhạc|âm nhạc)|phim (?:ca nhạc|âm nhạc)/i;
/** A film made for its song: a lyrics video, or a brief that asks for a music video. What is heard is the song, so the app adds no sound effects
 *  (owner 31/10, Test 31: 70 effects drowned the song). `dir` reads the project's own meta. */
export function isSongFilm(meta, { dir = null, root = APP_ROOT } = {}) {
  const m = meta ?? (dir ? (() => { try { return JSON.parse(readFileSync(join(dir, ".moworks", "project.json"), "utf8")); } catch { return null; } })() : null);
  if (!m) return false;
  const brief = String(m.brief?.text ?? "");
  return isLyricVideo(m, { dir, root }) || MUSIC_BRIEF.test(brief) || /\bMV\b/.test(brief);
}

/** { music, filmBoards, ownEnding } for a style id (a style styles.json does not have: false, but ownEnding: an author's style). */
export function styleTraits(id, root = APP_ROOT) {
  let styles = [];
  try { styles = JSON.parse(readFileSync(join(root, "config", "styles.json"), "utf8")).styles ?? []; } catch { /* no catalog: nothing special */ }
  const s = id ? styles.find((x) => x.id === id) : null;
  const hf = s?.id === "general" || s?.rules?.kind === "hf-skill";
  return { music: s?.category === MUSIC, filmBoards: hf, ownEnding: !!id && !hf };          // the authors' styles live in the library, not in styles.json
}

const LYRIC_BRIEF = /lyric|karaoke|lời bài hát|lời ca|phụ đề bài hát/i;
const NO_LYRICS = /(?:\bno\b|\bwithout\b|\bnot?\b[^.\n]{0,16}|không(?: có| chạy| dùng| cần)?|bỏ)\s+(?:the\s+|any\s+|song'?s?\s+|chữ\s+|phần\s+)*(?:lyric|karaoke|lời)/i;
/** The brief says in so many words that the film shows no lyrics ("không chạy lời", "no lyrics"). */
export const briefRefusesLyrics = (text) => NO_LYRICS.test(String(text ?? ""));
/** A lyrics video: a Music / Lyrics style, a brief that asks for the song's lyrics, or lyrics the owner gave (lyrics.txt). This one test decides the
 *  scan's song pass and beat map, the energy rules, the song's reads and 60 fps; every other film stays as it was. `meta`: the project's
 *  meta (style, brief). A brief that refuses lyrics in a style of any other category is no lyrics video. */
export function isLyricVideo(meta, { dir = null, root = APP_ROOT } = {}) {
  if (styleTraits(meta?.style?.id, root).music) return true;
  if (dir) { try { if (existsSync(join(dir, "lyrics.txt")) && readFileSync(join(dir, "lyrics.txt"), "utf8").trim()) return true; } catch { /* no lyrics */ } }
  const brief = String(meta?.brief?.text ?? "");
  return LYRIC_BRIEF.test(brief) && !NO_LYRICS.test(brief);
}

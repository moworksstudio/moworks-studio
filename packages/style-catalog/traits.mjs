// What a project's style id says without building the catalog (read from config/styles.json alone, so the scan and the project
// read can ask): a film cut to a song (its category is Music / Lyrics: the Lyrics step and the Music map); a board posed at the film's own
// seconds (HyperFrames' styles and General, whose storyboard rules follow HF's storyboard.md; the other authors' boards pose one frame a
// second); a style whose author gives its own ending (every style but General and HyperFrames' own: house rules §9, the app fades only
// the music).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

const MUSIC = "Music / Lyrics";

/** { music, filmBoards, ownEnding } for a style id (a style styles.json does not have: false, but ownEnding: an author's style). */
export function styleTraits(id, root = APP_ROOT) {
  let styles = [];
  try { styles = JSON.parse(readFileSync(join(root, "config", "styles.json"), "utf8")).styles ?? []; } catch { /* no catalog: nothing special */ }
  const s = id ? styles.find((x) => x.id === id) : null;
  const hf = s?.id === "general" || s?.rules?.kind === "hf-skill";
  return { music: s?.category === MUSIC, filmBoards: hf, ownEnding: !!id && !hf };          // the authors' styles live in the library, not in styles.json
}

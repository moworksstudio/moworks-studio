// The film made ready before anything renders or checks it, one way (audit/112b b2.3: five copies, each missing a step: a size's render had
// no bridge refresh and kept sounds whose files were gone, Tech checks no lanes, Export to AE no bridge, no lanes, no bundle). In order: the
// film's data-fps back on its root, the music fitted to the film's end, the voice and the music at their levels (the music ducked under the
// words), today's bridge for a code film, a clip placed since a lane's fader moved joined to its lane, a code film bundled from its source,
// and (for a render) a sound whose file is gone left out. The caller commits and says what it needs to.
import * as projects from "../project-service/index.mjs";
import { dropMissingAudio, fitMusicToFilm, gateAudioFiles } from "../hf-edit/tracks.mjs";
import { refreshBridge } from "../hf-edit/lemoPage.mjs";
import { freshFilm } from "../hf-edit/codeFilm.mjs";
import { applyLanes } from "../sfx/lanes.mjs";
import { levelTracks } from "../sfx/mix/index.mjs";

/** p: the project ({ id, path, meta }). level: false keeps the levels as they are (a background render of a film not yet a version); dropLost:
 *  a sound whose file is gone comes off the page (renders: owner #1109, T38b-9; never Tech checks, whose G-AUDIO-FILES names them).
 *  Resolves { lost: the missing files' findings (dropped), bundled: freshFilm's answer }. */
export async function prepareFilm(p, { root, level = true, dropLost = false, log = () => {} } = {}) {
  projects.keepRootFps(projects.getProject(p.id, root) ?? p);
  fitMusicToFilm(p.path);
  if (level) await levelTracks(p.path, { root }).catch(() => null);
  refreshBridge(p.path);
  applyLanes(p.path);
  const bundled = await freshFilm(p.path).catch((e) => { log(`bundle: ${e.message}`); return { error: e.message }; });          // never "no code film" (b7.1)
  let lost = [];
  if (dropLost) {
    const g = gateAudioFiles(p.path);
    if (!g.pass) { dropMissingAudio(p.path); lost = g.findings; }
  }
  return { lost, bundled };
}

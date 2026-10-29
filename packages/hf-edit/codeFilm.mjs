// A code film's page script is bundled from its source (anidoodle: anidoodle/page.ts → compositions/anidoodle/film.js; What If:
// whatif/episode.tsx → compositions/whatif/film.js). finalize bundles it when a Claude task ends, but anything that looks at the film
// while the task still runs (the Review's QC rounds, a chat fix's check stills) or before a render must see the source as it is now
// (the Review's second round and a chat fix's stills once showed the old film). freshFilm bundles again only what is older
// than its source (each builder's own test), so it costs nothing when the film did not change.
import { buildAnidoodle } from "./anidoodleBuild.mjs";
import { buildWhatIf } from "./whatIfBuild.mjs";

/** Bundle the film's code again where its source is newer. null when the film has no bundled source; else { kind, built, out, error? }. */
export async function freshFilm(projectDir) {
  const ani = await buildAnidoodle(projectDir);
  if (ani) return { kind: "anidoodle", ...ani };
  const wi = await buildWhatIf(projectDir);
  return wi ? { kind: "whatIf", ...wi } : null;
}

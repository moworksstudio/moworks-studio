// The ways of working with the user's files, General Style only: three. "Re-lay out" reads as Redesign and
// "Remake 1:1" as Follow a reference (projects made before keep their old ids; the server maps them the same way). Names are English keys for t.
export const WAYS = [
  { id: "free", name: "Redesign", sub: "From your content (text, slides, PSD, links, a site): Claude lays the film out again, following the brief" },
  { id: "keep", name: "Keep the design", sub: "Your frames, PSD or slides stay as they are: Claude only animates them" },
  { id: "reference", name: "Follow a reference", sub: "A video or pictures you give set the look and pacing; Claude follows your brief" },
];
const ALIAS = { relayout: "free", remake: "reference" };
/** The id as the three ways know it (old ids included), or null. */
export const canonicalWay = (id) => (WAYS.some((w) => w.id === id) ? id : ALIAS[id] ?? null);

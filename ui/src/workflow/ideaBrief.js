// The brief New project hands to the server still comes from the Writers Room idea it was opened with: the idea is linked to the film
// ("In a project") and a script keeps its mode. The user may add a line or fix a word first (T43-12: two lines added and the link was
// lost); a brief that no longer holds most of the idea's own lines is the user's own, and links nothing.
const lines = (s) => String(s ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** true when the brief still holds at least half of the idea's lines, as written. */
export function stillFromIdea(brief, ideaText) {
  const own = lines(ideaText);
  if (!own.length) return false;
  const have = new Set(lines(brief));
  return own.filter((l) => have.has(l)).length * 2 >= own.length;
}

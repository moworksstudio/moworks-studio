// What the Tech checks give the user to look at, counted once for every place that says it: the Pipeline's "Tech checks ·
// N warnings", the sheet's banner and its group headers (they read 13, 3, 3 and 1 + 10 + 3 for one report). The same line found at several
// places (six parts of one drawing out of the frame at 0:36.4) is one thing; a check whose warnings list nothing (HF's lint counts its
// warnings without naming them) has nothing to show and counts for nothing. Pure: the UI and the server both import it.

/** A check HF never ran (its browser stages skipped), or the script check that ran out of its time: neither a pass nor a problem in the film. */
export const unchecked = (g) => g.notChecked === true || (g.id === "G-HF-SCRIPT" && (g.skippedReason === "lint" || g.skippedReason === "failed"));
export const outOfTime = (g) => g.id === "G-HF-SCRIPT" && (g.skippedReason === "deadline" || g.timedOut === true
  || ((g.findings ?? []).length > 0 && g.findings.every((f) => f.code === "check_timed_out")));

// an element HF names by its tag (an <svg> has no words of its own) is said for what it is; "the words … is" reads "are" (reports written
// before plain.mjs said so keep their line)
const TAGS = { svg: "a drawing", path: "a drawing", g: "a drawing", canvas: "a drawing", img: "a picture", image: "a picture", picture: "a picture", video: "a video", div: "an element", span: "an element" };
export const plainWords = (s) => String(s ?? "")
  .replace(/\bthe words "(svg|path|g|canvas|img|image|picture|video|div|span)"/gi, (_, tag) => TAGS[tag.toLowerCase()])
  .replace(/(\bthe words "[^"]*") is\b/g, "$1 are");

/** The findings as lines to read: the same line (same words, same shot) once, with how many places it was found at. */
export function groupFindings(findings) {
  const out = new Map();
  for (const f of findings ?? []) {
    const line = plainWords(f.plain ?? f.message ?? f.reason ?? "");
    const key = `${f.shot ?? ""}|${line || JSON.stringify(f)}`;
    const had = out.get(key);
    if (had) had.count += 1; else out.set(key, { ...f, plain: f.plain != null ? line : f.plain, count: 1 });
  }
  return [...out.values()];
}

/** { blocking, warnings, visual, skipped, count } from a Tech checks report: each check with `items` (its grouped findings); `count` is the
 *  number of lines under Warnings and Visual review, the one number every place shows. */
export function lookAt(report) {
  const checks = report?.checks ?? report?.gates ?? [];
  const blocking = checks.filter((c) => c.blocking && !c.pass && !unchecked(c)).map((c) => ({ ...c, items: groupFindings(c.findings) }));
  const skipped = checks.filter((c) => !c.pass && (unchecked(c) || outOfTime(c)));
  const flagged = checks.filter((c) => !(c.blocking && !c.pass) && !unchecked(c) && !outOfTime(c))
    .map((c) => ({ ...c, items: groupFindings(c.findings) })).filter((c) => c.items.length > 0);
  const warnings = flagged.filter((c) => c.kind !== "heuristic"), visual = flagged.filter((c) => c.kind === "heuristic");
  const count = flagged.reduce((n, c) => n + c.items.length, 0);
  return { blocking, warnings, visual, skipped, count };
}

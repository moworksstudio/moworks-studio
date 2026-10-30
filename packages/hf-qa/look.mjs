// What the Tech checks give the user to look at, counted once for every place that says it: the Pipeline's "Tech checks ·
// N warnings", the sheet's banner and its group headers (they read 13, 3, 3 and 1 + 10 + 3 for one report). The same line found at several
// places (six parts of one drawing out of the frame at 0:36.4) is one thing; a check whose warnings list nothing (HF's lint counts its
// warnings without naming them) has nothing to show and counts for nothing. Pure: the UI and the server both import it.
// Test 23 read "26 warnings" in red for a film its Review scored 8/10: one kind of warning in every shot (a painting wider than the frame,
// which the Review kept on purpose for the camera's pan) and a turning point measured 35,200 px away. One kind in many shots is one line
// with its shots and its count; what the Review kept on purpose, and a measuring slip, are "meant this way", never a warning.

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

/** "Shot 4", "Shots 1–11, 13–21 and 23". */
export function shotsWords(shots) {
  const xs = [...new Set(shots.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!xs.length) return "In the film";
  const runs = [];
  for (const n of xs) { const r = runs.at(-1); if (r && n === r[1] + 1) r[1] = n; else runs.push([n, n]); }
  const parts = runs.flatMap(([a, b]) => (a === b ? [`${a}`] : b === a + 1 ? [`${a}`, `${b}`] : [`${a}–${b}`]));
  return `${xs.length === 1 ? "Shot" : "Shots"} ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]}`;
}
// the line of one kind found in several shots, said for all of them (the lines of its places differ in their element's name)
const KIND_LINES = {
  container_overflow: "parts of the picture run outside the boxes that crop them, so some of each is cut off. Ask Claude to fit them inside, or ignore this if the cut is meant.",
  rotation_pivot_drift: "things spin around a point away from their own centre, so they slide across the frame as they turn. If one should turn in place, ask Claude to make it turn around its centre; if it swings from one end on purpose (a kite on its string, a basket on its rope), ignore this.",
  off_pivot_rotation: "HyperFrames says things turn around the wrong point of a dial. Ignore this unless one looks wrong when you play the shot.",
  frame_out_of_frame: "parts of the picture are outside the frame and cannot be seen. Ask Claude to move them into the frame.",
  canvas_overflow: "parts of the picture are outside the frame and cannot be seen. Ask Claude to move them into the frame.",
  text_box_overflow: "words run out of their boxes. Ask Claude to make the boxes bigger or the words smaller.",
  clipped_text: "words are cut off. Ask Claude to give them room.",
  text_occluded: "words or things are covered by something else. Ask Claude to move one of them.",
  content_overlap: "words or things are covered by something else. Ask Claude to move one of them.",
  caption_zone_collision: "things sit where the subtitles go. Ask Claude to move them up.",
  contrast_aa_failure: "words are hard to read against their background. Ask Claude to make them stand out more.",
  motion_frozen: "nothing moves. Ask Claude to add movement.",
};
const WHERE = /^(?:Shots? [\d–, and]+(?: \([^)]*\))?|At \d+:\d{2}\.\d|In the film): /;
const tailOf = (line) => String(line ?? "").replace(WHERE, "");
const firstSentence = (s) => String(s ?? "").split(/(?<=[a-z0-9)"])\.\s/i)[0].replace(/\.$/, "");

/** The findings as lines to read: the same line (same words, same shot) once, with how many places it was found at; then one kind
 *  (HF's code) found in several shots one line, with its shots ("Shots 1–11 and 13: …") and its count. A finding the Review kept on purpose
 *  (`intended`, its `why`) says so. */
export function groupFindings(findings) {
  const out = new Map();
  for (const f of findings ?? []) {
    const line = plainWords(f.plain ?? f.message ?? f.reason ?? "");
    const key = `${f.shot ?? ""}|${line || JSON.stringify(f)}`;
    const had = out.get(key);
    if (had) had.count += 1; else out.set(key, { ...f, plain: f.plain != null ? line : f.plain, count: 1 });
  }
  const lines = [...out.values()], byKind = new Map();
  for (const g of lines) if (g.code && g.plain != null) byKind.set(g.code, [...(byKind.get(g.code) ?? []), g]);
  const items = [];
  for (const g of lines) {
    const kind = g.code && g.plain != null ? byKind.get(g.code) : null;
    if (!kind || kind.length < 2) { items.push(g); continue; }
    if (kind[0] !== g) continue;          // the kind's line stands where its first place was
    const shots = kind.map((x) => x.shot).filter((x) => x != null);
    const tails = kind.map((x) => tailOf(x.plain));
    const common = tails.every((t) => t === tails[0]) ? tails[0] : KIND_LINES[g.code]
      ?? Object.entries(tails.reduce((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0];
    const one = new Set(shots).size === 1 && shots.length === kind.length;
    items.push({ ...g, shot: one ? shots[0] : null, shots: [...new Set(shots)].sort((a, b) => a - b), count: kind.reduce((n, x) => n + x.count, 0),
      plain: `${shots.length ? shotsWords(shots) : "In the film"}: ${common}`, intended: kind.every((x) => x.intended), artefact: kind.every((x) => x.artefact) });
  }
  // what the Review kept on purpose: its first sentence, then why (never the advice to ask Claude)
  return items.map((x) => (x.intended && !x.artefact ? { ...x, plain: `${(WHERE.exec(x.plain ?? "")?.[0] ?? "")}${firstSentence(tailOf(x.plain))}. The Review kept this on purpose${x.why ? `: ${String(x.why).replace(/\.$/, "")}` : ""}.` } : x));
}

/** What the Review kept on purpose among the checks' findings, from its files: QC-REVIEW.json's `kept` ([{ code, at?, shots?, why? }] or
 *  codes), else the lines of QC-REVIEW.md that say so ("Kept on purpose (HyperFrames check warnings): container_overflow on every shot's
 *  art group (the drawing is wider than the frame so the camera can pan); rotation_pivot_drift / off_pivot_rotation at 17.35, 33.89 s
 *  (…)", Test 23), each clause with HF's codes, its seconds ("at … s") or shots, and its reason in brackets. [{ code, at, shots, why }] */
export function keptOnPurpose({ json = null, md = "" } = {}) {
  const out = [];
  const list = Array.isArray(json?.kept) ? json.kept : Array.isArray(json?.intended) ? json.intended : null;
  const nums = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map(Number).filter(Number.isFinite);
  if (list) {
    for (const k of list) {
      const code = typeof k === "string" ? k : k?.code;
      if (!/^[a-z]+(?:_[a-z]+)+$/.test(String(code ?? ""))) continue;
      const at = nums(k?.at), shots = nums(k?.shots ?? k?.shot);
      out.push({ code, at: at.length ? at : null, shots: shots.length ? shots : null, why: typeof k?.why === "string" ? k.why.slice(0, 200) : null });
    }
    return out;
  }
  for (const line of String(md ?? "").split(/\r?\n/)) {
    if (!/on purpose|intended|intentional|deliberate|by design|cố ý/i.test(line)) continue;
    for (const clause of line.split(/;\s*/)) {
      const codes = [...new Set(clause.match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [])];
      if (!codes.length) continue;
      const atm = /\bat\s+((?:\d+(?:\.\d+)?\s*s?\s*(?:,|\/|and)?\s*)+?)\s*s\b/i.exec(clause);
      const at = atm ? (atm[1].match(/\d+(?:\.\d+)?/g) ?? []).map(Number) : [];
      const sm = /\bshots?\s+((?:\d+\s*(?:[–-]\s*\d+)?\s*(?:,|and)?\s*)+)/i.exec(clause);
      const shots = [];
      for (const [, a, b] of (sm?.[1] ?? "").matchAll(/(\d+)(?:\s*[–-]\s*(\d+))?/g)) for (let n = Number(a); n <= Number(b ?? a) && n - Number(a) < 200; n++) shots.push(n);
      const afterCode = clause.slice(clause.indexOf(codes[0]));
      const why = /\(([^)]{3,200})\)/.exec(afterCode)?.[1] ?? null;
      for (const code of codes) out.push({ code, at: at.length ? at : null, shots: shots.length ? shots : null, why });
    }
  }
  return out;
}
/** The entry of `kept` a finding is (its code, and its second within 0.6 s or its shot when the entry names them), or null. */
export function keptFor(f, kept) {
  for (const k of kept ?? []) {
    if (k.code !== f?.code) continue;
    if (k.at) { const t = Number(f.time); if (Number.isFinite(t) && k.at.some((a) => Math.abs(a - t) <= 0.6)) return k; continue; }
    if (k.shots) { if (k.shots.includes(Number(f.shot))) return k; continue; }
    return k;
  }
  return null;
}

/** { blocking, warnings, visual, skipped, intended, count } from a Tech checks report: each check with `items` (its grouped findings);
 *  `count` is the number of lines under Warnings and Visual review, the one number every place shows. A warning the Review kept on purpose
 *  (`intended`) or a measuring slip (`artefact`) is no warning: `intended` holds them as one check, "Meant this way", which is also the
 *  last of `visual` (shown, not counted). A blocking check stays blocking whatever the Review kept. */
export function lookAt(report) {
  const checks = report?.checks ?? report?.gates ?? [];
  const blocking = checks.filter((c) => c.blocking && !c.pass && !unchecked(c)).map((c) => ({ ...c, items: groupFindings(c.findings) }));
  const skipped = checks.filter((c) => !c.pass && (unchecked(c) || outOfTime(c)));
  const meant = [];
  const flagged = checks.filter((c) => !(c.blocking && !c.pass) && !unchecked(c) && !outOfTime(c))
    .map((c) => {
      const fs = c.findings ?? [];
      meant.push(...fs.filter((f) => f.intended || f.artefact));
      return { ...c, items: groupFindings(fs.filter((f) => !f.intended && !f.artefact)) };
    }).filter((c) => c.items.length > 0);
  const warnings = flagged.filter((c) => c.kind !== "heuristic"), visual = flagged.filter((c) => c.kind === "heuristic");
  const count = flagged.reduce((n, c) => n + c.items.length, 0);
  const intended = meant.length ? [{ id: "intended", title: "Meant this way", kind: "heuristic", blocking: false, pass: true, intended: true,
    explain: "The Review kept these on purpose, or the check mis-measured them: they are not problems in the film.", findings: meant, items: groupFindings(meant) }] : [];
  return { blocking, warnings, visual: [...visual, ...intended], skipped, intended, count };
}

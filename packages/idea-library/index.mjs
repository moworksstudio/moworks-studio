// The Idea Library (audit/97): one place for briefs to start a film from.
// - The app's library, shipped with the app and read-only: every film style's sample brief (samples.json, the same data the Sample brief
//   button in New project reads) and OPUSCAR 98's 98 style prompts (Lemomo, MIT; read from the pinned Lemo-Opuscar clone by
//   lemo-styles samplePrompts). Each idea records its film style: a sample brief the style it was written for; an OPUSCAR prompt the Lemo
//   style with the same look (samples.json opuscarStyles), else none.
// - My ideas, the user's own: a name, a brief and a suggested film style (optional), nothing else (#939). Kept on this computer in the
//   app's state folder (ideas.json), outside every project, so deleting a project keeps them (#856); never in git.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { samplePrompts } from "../lemo-styles/index.mjs";

const DATA = JSON.parse(readFileSync(new URL("./samples.json", import.meta.url), "utf8"));
export const SAMPLES = DATA;

export const ideasFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "ideas.json");
const MAX_NAME = 120, MAX_BRIEF = 100000, STYLE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,80}$/;
const toneOf = (dim) => (/B&W/i.test(dim ?? "") ? "Black and white" : /sepia/i.test(dim ?? "") ? "Sepia" : "Colour");

/** The app's own ideas: [{ id, source: "sample" | "opuscar98", styleId, label?, brief, credit, ...OPUSCAR's film, year, era, render, tone,
 *  image }] plus OPUSCAR 98's credit and eras. A sample's name and picture come from its film style (the UI has the catalog). */
export function appIdeas(root) {
  const ideas = Object.entries(DATA.styles).map(([styleId, s]) => ({ id: `sample:${styleId}`, source: "sample", styleId, brief: s.en, credit: s.credit ?? null }));
  for (const [kind, s] of Object.entries(DATA.anidoodleKinds)) ideas.push({ id: `sample:anidoodle:${kind}`, source: "sample", styleId: null, kind, group: "anidoodle", label: s.label, brief: s.en, credit: s.credit ?? null });
  let op = { prompts: [], chapters: [], credit: null };
  try { op = samplePrompts(root); } catch { /* no Lemo-Opuscar clone: the samples alone */ }
  for (const p of op.prompts ?? []) ideas.push({ id: `opuscar98:${p.no}`, source: "opuscar98", no: p.no, styleId: DATA.opuscarStyles[p.no] ?? null, label: p.style_en, brief: p.prompt_en,
    film: p.title, year: p.year, era: p.chapter, render: p.render, tone: toneOf(p.dim), image: p.image ?? null });
  return { ideas, opuscar: { name: "OPUSCAR 98", credit: op.credit ?? null, eras: op.chapters ?? [] } };
}

export function readIdeas(root) {
  try {
    const j = JSON.parse(readFileSync(ideasFile(root), "utf8"));
    return Array.isArray(j?.ideas) ? j.ideas.filter((x) => x && typeof x.id === "string") : [];
  } catch { return []; }
}
function writeIdeas(root, ideas) {
  const f = ideasFile(root);
  if (!existsSync(dirname(f))) mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f + ".tmp", JSON.stringify({ version: 1, ideas }, null, 1) + "\n");
  renameSync(f + ".tmp", f);
}
const invalid = (message) => Object.assign(new Error(message), { code: "INVALID" });
/** A user's idea from what the dialog sent: { name, brief, styleId? }; anything else is left out. */
function clean(b) {
  const name = String(b?.name ?? "").trim(), brief = String(b?.brief ?? "").replace(/\r\n/g, "\n").trim();
  const styleId = b?.styleId == null || b.styleId === "" ? null : String(b.styleId);
  if (!name) throw invalid("Give the idea a name.");
  if (name.length > MAX_NAME) throw invalid("Keep the name under 120 characters.");
  if (!brief) throw invalid("Write the brief first.");
  if (brief.length > MAX_BRIEF) throw invalid("That brief is too long to keep as an idea.");
  if (styleId && !STYLE_ID.test(styleId)) throw invalid("That film style is not known.");
  return { name, brief, styleId };
}
export function createIdea(root, b) {
  const idea = { id: randomBytes(6).toString("hex"), ...clean(b), created: new Date().toISOString() };
  idea.updated = idea.created;
  writeIdeas(root, [idea, ...readIdeas(root)]);
  return idea;
}
export function updateIdea(root, id, b) {
  const list = readIdeas(root), i = list.findIndex((x) => x.id === id);
  if (i < 0) throw Object.assign(new Error("That idea is not here any more."), { code: "NOT_FOUND" });
  list[i] = { ...list[i], ...clean(b), updated: new Date().toISOString() };
  writeIdeas(root, list);
  return list[i];
}
export function deleteIdea(root, id) {
  const list = readIdeas(root);
  if (!list.some((x) => x.id === id)) throw Object.assign(new Error("That idea is not here any more."), { code: "NOT_FOUND" });
  writeIdeas(root, list.filter((x) => x.id !== id));
  return { ok: true };
}

export function ideaRoutes(ctx, { r }) {
  const root = ctx.root, ID = "([0-9a-f]{12})";
  return { routes: [
    r("GET", "/ideas", () => ({ ...appIdeas(root), mine: readIdeas(root) })),
    r("POST", "/ideas", (_p, b) => ({ idea: createIdea(root, b) })),
    r("PUT", `/ideas/${ID}`, ([id], b) => ({ idea: updateIdea(root, id, b) })),
    r("DELETE", `/ideas/${ID}`, ([id]) => deleteIdea(root, id)),
  ] };
}

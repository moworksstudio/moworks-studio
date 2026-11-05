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
import { claudeStandIn, clearPitch, countWords, pitchIdeas, readPitch, savePitched, scenesOf, scriptIdea, spoken } from "./pitch.mjs";

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
/** A new idea in My ideas; `extra`: what the app records beside it (a pitched card's style, sources and truth: pitch.mjs). */
export function createIdea(root, b, extra = {}) {
  const idea = { id: randomBytes(6).toString("hex"), ...clean(b), ...extra, created: new Date().toISOString() };
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
const MAX_VERSIONS = 10;          // a script's earlier versions kept on its idea (Write again, Edit), newest first
const gone = () => Object.assign(new Error("That idea is not here any more."), { code: "NOT_FOUND" });
const withIdea = (root, id, fn) => {
  const list = readIdeas(root), i = list.findIndex((x) => x.id === id);
  if (i < 0) throw gone();
  list[i] = { ...fn(list[i]), updated: new Date().toISOString() };
  writeIdeas(root, list);
  return list[i];
};
/** A new script for an idea (pitch.mjs scriptIdea, or the owner's edit): { scenes, text, words, seconds, lang, lengthSec, styleId, style,
 *  author, at, by }. The one before goes to its versions (at most ten), so Undo can bring it back. */
export function setScript(root, id, script) {
  return withIdea(root, id, (x) => {
    const was = x.script ? [{ ...x.script, versions: undefined }, ...(x.script.versions ?? [])].slice(0, MAX_VERSIONS) : [];
    return { ...x, script: { ...script, versions: was } };
  });
}
/** The owner's own edit of a script's scenes: the narration and the picture of each, the times as they are. */
export function editScript(root, id, scenes) {
  const x = readIdeas(root).find((y) => y.id === id);
  if (!x) throw gone();
  if (!x.script) throw Object.assign(new Error("This idea has no script yet."), { code: "INVALID" });
  const was = scenesOf(x.script);
  if (!Array.isArray(scenes) || scenes.length !== was.length) throw Object.assign(new Error("The script changed meanwhile: open it again."), { code: "CONFLICT" });
  const next = was.map((sc, k) => ({ ...sc, narration: String(scenes[k]?.narration ?? "").replace(/\r\n/g, "\n").trim().slice(0, 4000), picture: String(scenes[k]?.picture ?? "").trim().slice(0, 2000) }));
  const text = next.map((sc) => sc.narration).filter(Boolean).join("\n");
  const { versions, ...rest } = x.script;
  return setScript(root, id, { ...rest, scenes: next, text, words: countWords(spoken(text)), at: new Date().toISOString(), by: "owner" });
}
/** Undo: the script before the last change back; the last one is dropped. */
export function undoScript(root, id) {
  return withIdea(root, id, (x) => {
    const [prev, ...older] = x.script?.versions ?? [];
    if (!prev) throw Object.assign(new Error("There is nothing to undo."), { code: "INVALID" });
    return { ...x, script: { ...prev, versions: older } };
  });
}
/** A film started from an idea (New project's Start a project, #1111): kept on the idea, so it reads "In a project". */
export function linkProject(root, id, project) {
  return withIdea(root, id, (x) => ({ ...x, projects: [{ id: String(project.id), title: String(project.title ?? ""), at: new Date().toISOString() },
    ...(x.projects ?? []).filter((y) => y.id !== String(project.id))].slice(0, 20) }));
}
/** A pitched idea as its card (title, hook, the style's items, truth, sources, length); one saved before the card was kept is read back
 *  from its brief (pitch.mjs ideaBrief's lines). Null for an idea the owner wrote. */
export function cardOf(x) {
  if (!x?.pitch) return null;
  if (x.pitch.card) return x.pitch.card;
  const lines = String(x.brief ?? "").split("\n"), paras = String(x.brief ?? "").split(/\n\s*\n/);
  const fields = [];
  for (const l of lines.slice(2)) {
    const m = /^([^:\n]{1,60}):\s(.+)$/.exec(l);
    if (!m || /^(True or legend|Thật hay truyền thuyết|Length|Độ dài|Sources|Nguồn)$/.test(m[1]) || /^-\s/.test(l)) continue;
    fields.push({ label: m[1], text: m[2] });
  }
  return { title: x.name, hook: (paras[1] ?? "").trim(), fields, truth: x.pitch.truth ?? "unchecked", sources: x.pitch.sources ?? [], lengthSec: x.pitch.lengthSec ?? null };
}
export function deleteIdea(root, id) {
  const list = readIdeas(root);
  if (!list.some((x) => x.id === id)) throw Object.assign(new Error("That idea is not here any more."), { code: "NOT_FOUND" });
  writeIdeas(root, list.filter((x) => x.id !== id));
  return { ok: true };
}

// Pitch 10 ideas (#1101): one pitch and one script at a time, as background jobs; the round in hand is the server's (GET /ideas/pitch)
const PITCH_ESTIMATE = { minutes: [5, 10] }, SCRIPT_ESTIMATE = { minutes: [2, 5] };          // Test 40: a first pitch took 9 minutes
const IDEA_JOBS = new Set(["idea-pitch", "idea-script"]), RECENT_MS = 15 * 60000;
export function ideaRoutes(ctx, { r }) {
  const root = ctx.root, ID = "([0-9a-f]{12})";
  const claude = async (opts) => (claudeStandIn() ?? (await import("../character-maker/index.mjs")).runClaude)(opts);
  const jobArgs = (j, prefix) => ({ root, jobId: `${prefix}-${Date.now().toString(36)}`, claude, signal: j.signal, onStep: (stage, progress) => j.update({ stage, progress }),
    onSteps: (steps) => j.update({ steps }), log: (l) => j.log(l) });
  const busy = (kind) => ctx.jobs.running().some((j) => j.kind === kind);
  // the end of a run, said on whatever screen the owner is on (App's notices, #1115): the run goes on when they leave the page
  const said = (n) => { try { ctx.notices?.add?.({ title: "Writers' Room", ...n }); } catch { /* the page shows it too */ } };
  const ended = (ok, fail) => (job) => { if (job.status === "done") said(ok(job)); else if (job.status === "failed") said(fail(job)); };
  // the films an idea went into that are still in the projects list
  const known = async () => { try { const { listProjects } = await import("../project-service/index.mjs"); return new Set(listProjects(root).map((p) => p.id)); } catch { return null; } };
  return { routes: [
    // the runs of the Writers' Room: running, and those that ended in the last minutes (the page picks up a run it was away from)
    r("GET", "/ideas/jobs", () => ({ jobs: ctx.jobs.list().filter((j) => IDEA_JOBS.has(j.kind) && (j.status === "running" || Date.now() - Date.parse(j.endedAt ?? 0) < RECENT_MS)) })),
    r("GET", "/ideas/pitch", () => ({ pitch: readPitch(root), job: ctx.jobs.running().find((j) => j.kind === "idea-pitch") ?? null })),
    r("POST", "/ideas/pitch", (_p, b) => {
      if (busy("idea-pitch")) throw Object.assign(new Error("Claude is pitching already: wait for it"), { code: "BUSY" });
      const more = b?.more === true;
      if (!more && !b?.styleId) throw Object.assign(new Error("Choose a film style"), { code: "INVALID" });
      const job = ctx.jobs.start("idea-pitch", { title: more ? "Pitching 10 more ideas" : "Pitching 10 ideas", estimate: PITCH_ESTIMATE, more,
        onEnd: ended(() => ({ href: "#/ideas/research", text: more ? "Ten more ideas are ready" : "Ten ideas are ready" }),
          (job) => ({ href: "#/ideas/research", text: "The pitch stopped: {why}", vars: { why: job.error?.message ?? "" } })) },
        async (j) => { const p = await pitchIdeas(b ?? {}, jobArgs(j, "pitch")); return { rounds: p.rounds, ideas: p.ideas.length }; });
      return { job, estimate: PITCH_ESTIMATE };
    }),
    r("POST", "/ideas/pitch/save", async (_p, b) => savePitched(root, { ids: Array.isArray(b?.ids) ? b.ids.map(String) : [], all: b?.all === true })),
    r("DELETE", "/ideas/pitch", () => clearPitch(root)),
    r("POST", `/ideas/${ID}/script`, ([id], b) => {
      const idea = readIdeas(root).find((x) => x.id === id);
      if (!idea) throw gone();
      if (busy("idea-script")) throw Object.assign(new Error("Claude is writing a script already: wait for it"), { code: "BUSY" });
      const href = `#/ideas/scripts?id=${id}`, vars = { name: idea.name };
      const job = ctx.jobs.start("idea-script", { title: "Writing the script", estimate: SCRIPT_ESTIMATE, ideaId: id, ideaName: idea.name,
        onEnd: ended(() => ({ href, text: "The script of “{name}” is written", vars }), (job) => ({ href, text: "The script of “{name}” stopped: {why}", vars: { ...vars, why: job.error?.message ?? "" } })) },
        async (j) => { const x = await scriptIdea(id, b ?? {}, jobArgs(j, "script")); return { ideaId: x.id, words: x.script.words }; });
      return { job, estimate: SCRIPT_ESTIMATE };
    }),
    r("PUT", `/ideas/${ID}/script`, ([id], b) => ({ idea: editScript(root, id, b?.scenes) })),
    r("POST", `/ideas/${ID}/script/undo`, ([id]) => ({ idea: undoScript(root, id) })),
    // My ideas with each one's card and the films made from it that are still there (its status: Idea, Script ready, In a project)
    r("GET", "/ideas", async () => {
      const ids = await known();
      const mine = readIdeas(root).map((x) => ({ ...x, card: cardOf(x), ...(x.script ? { script: { ...x.script, scenes: scenesOf(x.script) } } : {}),
        projects: (x.projects ?? []).filter((p) => !ids || ids.has(p.id)) }));
      return { ...appIdeas(root), mine };
    }),
    r("POST", "/ideas", (_p, b) => ({ idea: createIdea(root, b) })),
    r("PUT", `/ideas/${ID}`, ([id], b) => ({ idea: updateIdea(root, id, b) })),
    r("DELETE", `/ideas/${ID}`, ([id]) => deleteIdea(root, id)),
  ] };
}

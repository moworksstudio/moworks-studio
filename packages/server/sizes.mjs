// The Adaptation step's routes (one film, several sizes: owner 06/11/2026, #1232-#1236, audit/105 §8.4). The film's sizes, "Add a size",
// taking one off, and Adapt / Update: a Claude task with the Adaptation rules (config/rules/adaptation) on the master's final files, one
// size at a time. When its task ends with the size's root page written, the size is Ready, made from the master's picture as it is then;
// the master's picture changing later makes it Out of date (sizeRows), said in the Adaptation step and the Film Editor, never a block.
//   GET    /projects/:id/sizes                 { master, sizes: [row], choices, running }
//   POST   /projects/:id/sizes                 { aspect }: add a size (not made yet)
//   DELETE /projects/:id/sizes/:tag            take it off the list (its root page stays in the folder and the film's history)
//   POST   /projects/:id/sizes/:tag/adapt      Adapt (the first time) or Update (made before): Claude lays the film out for that size
import { existsSync } from "node:fs";
import { join } from "node:path";
import * as projects from "../project-service/index.mjs";
import { addSize, aspectOfTag, entryOf, extraSizes, filmSizes, masterAspect, removeSize, sizeChoices, sizeRows, updateSize } from "../project-service/sizes.mjs";
import * as pipe from "../pipeline/index.mjs";
import { filmParts } from "./proxy.mjs";

/** The master's picture hash now (its sound, the other sizes' own files and root pages not counted): what a size is made from. */
export function masterPicture(p) {
  try { return filmParts(p.path, Number(p.meta?.format?.fps) || null).picture; } catch { return null; }
}
/** The size whose Adaptation task runs now for this film, or null. */
export function runningSize(ctx, id, meta = null) {
  const tid = ctx.agent?.running?.get(id), t = tid ? ctx.agent.get?.(tid) : null;
  if (t?.step !== "adaptation") return null;
  return t.size ?? (meta ?? projects.getProject(id, ctx.root)?.meta)?.sizes?.find((s) => s.task === tid)?.aspect ?? null;
}
/** The film's extra sizes as the pipeline and the Editor read them (none: []). The master's picture is hashed only when there is a size. */
export function sizesOf(ctx, p) {
  if (!extraSizes(p.meta).length) return [];
  return sizeRows(p.meta, { masterPicture: masterPicture(p), running: runningSize(ctx, p.id, p.meta), dir: p.path });
}

/** What Claude is told for one size: the rules, the size, its root page, and what stays the master's. */
export function adaptPrompt(meta, aspect, { update = false } = {}) {
  const [w, h] = projects.ASPECTS[aspect], master = masterAspect(meta) ?? meta?.format?.aspect ?? "16:9", entry = entryOf(aspect);
  return [
    update
      ? `The master film (${master}) changed after its ${aspect} size was made. Update the ${aspect} size so it is the master as it is now: carry the master's changes into ${entry} and the ${aspect} files, shot by shot, and change nothing else.`
      : `Adapt this film to ${aspect} (${w} × ${h} px): lay the master film (${master}, index.html) out again for the new frame, as the Adaptation rules say (.moworks/rules/adaptation/SKILL.md).`,
    `Write its root page ${entry} at the film's root, with data-width="${w}" data-height="${h}" on its root element, sharing compositions/, assets/ and src/ with the master; a file of this size alone carries ".${aspect.replace(":", "x")}." before its extension.`,
    "Keep the master's sound and timing exactly: never edit an <audio> tag or a sound, never move a shot. Never change the master (index.html, its shots, its look).",
    `Then call qc_sheets with size "${aspect}", look once as the rules say, fix what you find, and end with one short line.`,
  ].join("\n");
}

/** A finished Adaptation task: its size is Ready when its root page is there (made from the master's picture now), else as it was before. */
export function adaptEnded(ctx, p, task) {
  const aspect = task?.step === "adaptation" ? task.size ?? p.meta?.sizes?.find((s) => s.task === task.id)?.aspect ?? null : null;
  if (!aspect) return null;
  const ok = task.status === "done" && existsSync(join(p.path, entryOf(aspect)));
  const now = new Date().toISOString(), made = ok ? masterPicture(p) : null;
  projects.updateMeta(p.id, (m) => updateSize(m, aspect, (s) => {
    delete s.task;
    if (ok) Object.assign(s, { status: "ready", madeFrom: made, at: now, taskId: task.id });
    else if (s.status !== "ready") s.status = task.status === "cancelled" || task.status === "failed" ? "stopped" : "none";
  }), ctx.root);
  return ok;
}

export function sizeRoutes(ctx, { r, P, mustProject, HttpError }) {
  const root = ctx.root;
  const T = "(16x9|9x16|1x1|4x5)";
  const view = (id) => {
    const p = mustProject(id, root);
    return { master: masterAspect(p.meta) ?? p.meta?.format?.aspect ?? null, sizes: sizesOf(ctx, p), all: filmSizes(p.meta), choices: sizeChoices(p.meta), running: runningSize(ctx, id) };
  };
  const bad = (e) => { if (e?.code === "INVALID") throw new HttpError(400, "INVALID", e.message); throw e; };
  return [
    r("GET", `/projects/${P}/sizes`, ([id]) => view(id)),
    r("POST", `/projects/${P}/sizes`, ([id], b = {}) => {
      mustProject(id, root);
      try { projects.updateMeta(id, (m) => { addSize(m, String(b.aspect ?? "")); }, root); } catch (e) { bad(e); }
      return view(id);
    }),
    r("DELETE", `/projects/${P}/sizes/${T}`, ([id, tag]) => {
      const aspect = aspectOfTag(tag);
      if (runningSize(ctx, id) === aspect) throw new HttpError(409, "BUSY", "Claude is making this size: stop it first");
      projects.updateMeta(id, (m) => { removeSize(m, aspect); }, root);
      return view(id);
    }),
    r("POST", `/projects/${P}/sizes/${T}/adapt`, async ([id, tag]) => {
      const p = mustProject(id, root), aspect = aspectOfTag(tag);
      const s = extraSizes(p.meta).find((x) => x.aspect === aspect);
      if (!s) throw new HttpError(404, "NOT_FOUND", `The film has no ${aspect} size: add it first`);
      if (ctx.agent.running.has(id)) throw new HttpError(409, "BUSY", "Claude is working on this film: wait until it finishes");
      const { state } = await ctx.pipelineOf(id);
      const why = pipe.blockedReason(state, "adaptation");
      if (why) throw Object.assign(new HttpError(409, "STEP_BLOCKED", pipe.fill(why.key, why.vars ?? {})), { detail: { step: "adaptation", reason: why } });
      const update = s.status === "ready";
      // the task knows its size: the pipeline shows it running, its end marks it Ready (adaptEnded)
      const task = await ctx.agent.start(id, { scope: { kind: "project" }, step: "adaptation", size: aspect, label: `${update ? "Update" : "Adapt"} ${aspect}`,
        shown: `${update ? "Update" : "Adapt"} ${aspect}`, text: adaptPrompt(p.meta, aspect, { update }) });
      projects.updateMeta(id, (m) => updateSize(m, aspect, (x) => { x.status = x.status === "ready" ? "ready" : "none"; x.task = task.id; x.startedAt = new Date().toISOString(); }), root);
      return { task, ...view(id) };
    }),
  ];
}

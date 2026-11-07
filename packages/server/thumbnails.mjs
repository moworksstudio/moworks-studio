// The Thumbnails page's routes (owner #1312, #1313, #1318): the built films, one film's thumbnails, and its three background jobs (the
// frames, the Claude task that makes the two pictures, the render after Edit title). Each job's end is said on whatever screen the owner is on
// (the app's notices), so leaving the page loses nothing.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import * as projects from "../project-service/index.mjs";
import { showInExplorer } from "../project-service/explorer.mjs";
import { FRAMES_REL, WAYS, captureFrames, filmKit, framesDir, isBuilt, makeThumbs, readState, renderThumbs, setTitle } from "../thumbnails/index.mjs";

export const THUMB_JOBS = new Set(["thumb-frames", "thumb-make", "thumb-render"]);
// how long each takes (the estimate the page shows while one runs)
const ESTIMATE = { "thumb-frames": { minutes: [1, 3] }, "thumb-make": { minutes: [3, 8] }, "thumb-render": { minutes: [1, 2] } };
// test seams: the Claude task, HyperFrames' stills and the JPG encoder (test/thumbnails.test.mjs)
let DEPS = null;
export const setThumbDeps = (d) => { DEPS = d ?? null; };

export function thumbnailRoutes(ctx, { r, mustProject }) {
  const root = ctx.root;
  const base = () => ctx.preview?.base ?? "";
  const url = (p, rel, at) => `${base()}/p/${p.id}/${rel}${at ? `?v=${encodeURIComponent(at)}` : ""}`;
  const said = (n) => { try { ctx.notices?.add?.({ title: "Thumbnails", ...n }); } catch { /* the page shows it too */ } };
  const running = (id) => ctx.jobs.running().find((j) => THUMB_JOBS.has(j.kind) && j.filmId === id) ?? null;
  const recent = (id) => ctx.jobs.recent({ minutes: 15, kinds: [...THUMB_JOBS], where: (j) => j.filmId === id });
  const film = (id) => {
    const p = mustProject(id, root);
    if (!isBuilt(p.meta) && p.built !== true) throw Object.assign(new Error("Build the film first"), { code: "INVALID" });
    return p;
  };
  /** One film's page: the frames (URLs), the made pictures (URLs, sizes), the title, the way, the warnings, and the job in hand. */
  const view = (p) => {
    const s = readState(p.path), kit = filmKit(p.meta);
    const frames = (s.frames ?? []).filter((f) => existsSync(join(framesDir(p.path), f.file))).map((f) => ({ n: f.n, t: f.t,
      url: url(p, `${FRAMES_REL}/${f.file}`, s.framesAt), url9: f.file9 ? url(p, `${FRAMES_REL}/${f.file9}`, s.framesAt) : null }));
    const files = Object.fromEntries(Object.entries(s.files ?? {}).filter(([, f]) => existsSync(join(p.path, "renders", f.name)))
      .map(([tag, f]) => [tag, { ...f, url: url(p, `renders/${encodeURIComponent(f.name)}`, `${s.renderedAt}-${statSync(join(p.path, "renders", f.name)).size}`) }]));
    return { id: p.id, title: p.title, style: p.style?.title ?? null, kit: kit ? { title: kit.title } : null, frames, pick: s.pick ?? null, way: s.way ?? null,
      thumbTitle: s.title ?? null, files, warnings: s.warnings ?? [], made: !!Object.keys(files).length, job: running(p.id), jobs: recent(p.id) };
  };
  const start = (kind, p, title, fn, { done, failed }, extra = {}) => {
    if (running(p.id)) throw Object.assign(new Error("The thumbnails of this film are being made: wait for it"), { code: "BUSY" });
    const href = `#/thumbnails?id=${p.id}`, vars = { name: p.title };
    return ctx.jobs.start(kind, { title, filmId: p.id, key: p.id, filmTitle: p.title, estimate: ESTIMATE[kind], ...extra,
      onEnd: (job) => { if (job.status === "done") said({ href, text: done, vars }); else if (job.status === "failed") said({ href, text: failed, vars: { ...vars, why: job.error?.message ?? "" } }); } },
    async (j) => {
      const step = (stage, progress) => j.update({ stage, progress });
      return fn(j, step);
    });
  };
  const deps = () => DEPS ?? {};
  return { routes: [
    // the films that can be picked: built ones, newest first, with their poster
    r("GET", "/thumbnails", () => {
      const list = projects.listProjects(root).filter((x) => !x.missing).map((x) => projects.getProject(x.id, root)).filter((p) => p && (isBuilt(p.meta) || p.built === true))
        .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
      return { films: list.map((p) => { const s = readState(p.path); return { id: p.id, title: p.title, style: p.style?.title ?? null, kit: filmKit(p.meta)?.title ?? null,
        poster: ctx.thumbs?.url?.(p, base()) ?? null, made: !!Object.keys(s.files ?? {}).length, running: !!running(p.id) }; }) };
    }),
    r("GET", "/thumbnails/([0-9a-f]+)", ([id]) => view(film(id))),
    // 1. the three frames (a background job; the page shows them as soon as they are there)
    r("POST", "/thumbnails/([0-9a-f]+)/frames", ([id]) => {
      const p = film(id);
      const job = start("thumb-frames", p, "Taking 3 frames", (j, step) => captureFrames(projects.getProject(id, root), { root, signal: j.signal, deps: deps(), onStep: step }).then((f) => ({ frames: f.length })),
        { done: "The frames of “{name}” are ready: pick one", failed: "The frames of “{name}” were not taken: {why}" });
      return { job, view: view(p) };
    }),
    // 2. make the two pictures from frame n, the Automatic or the Brand Kit way (one Claude task, then the render)
    r("POST", "/thumbnails/([0-9a-f]+)/make", ([id], b) => {
      const p = film(id), n = Number(b?.frame), way = WAYS.includes(b?.way) ? b.way : "auto";
      if (!(readState(p.path).frames ?? []).some((f) => f.n === n)) throw Object.assign(new Error("Pick one of the three frames"), { code: "INVALID" });
      if (way === "brand" && !filmKit(p.meta)) throw Object.assign(new Error("This film has no Brand Kit"), { code: "INVALID" });
      const job = start("thumb-make", p, "Making the thumbnails", (j, step) => makeThumbs(projects.getProject(id, root), { n, way, root, signal: j.signal, deps: deps(), onStep: step, log: (l) => j.log(l) })
        .then((s) => ({ files: Object.keys(s.files ?? {}).length })),
        { done: "The thumbnails of “{name}” are ready", failed: "The thumbnails of “{name}” were not made: {why}" }, { frame: n, way });
      return { job, view: view(p) };
    }),
    // Edit title: the words change in both pages, then both render again (no Claude)
    r("PUT", "/thumbnails/([0-9a-f]+)/title", ([id], b) => {
      const p = film(id);
      if (running(p.id)) throw Object.assign(new Error("The thumbnails of this film are being made: wait for it"), { code: "BUSY" });
      setTitle(p.path, b?.title);
      const job = start("thumb-render", p, "Rendering the thumbnails", (j, step) => { step("Rendering the pictures", 20); return renderThumbs(projects.getProject(id, root), { root, signal: j.signal, deps: deps() }).then(() => ({ ok: true })); },
        { done: "The thumbnails of “{name}” have the new title", failed: "The thumbnails of “{name}” were not rendered: {why}" });
      return { job, view: view(p) };
    }),
    // Open folder: the film's render folder, where the two JPGs are
    r("POST", "/thumbnails/([0-9a-f]+)/open", ([id]) => {
      const p = film(id), dir = join(p.path, "renders");
      if (!existsSync(dir)) throw Object.assign(new Error("The film has no render folder yet"), { code: "NOT_FOUND" });
      const s = readState(p.path), first = Object.values(s.files ?? {})[0]?.name;
      if (process.env.MW_NO_OPEN !== "1") showInExplorer(first && existsSync(join(dir, first)) ? join(dir, first) : dir, { select: !!first });
      return { ok: true };
    }),
  ] };
}

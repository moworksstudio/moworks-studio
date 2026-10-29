// The film styles' After Effects badges measured in the background, one demo at a time, by the AE
// export's own size check (packages/style-ae). Run when the app starts (new styles, a pinned source at another commit: only those), after
// a library import, and when asked (POST /api/styles/ae/measure { only?: [style ids], force?: true }). The catalog picks the results up.
import { basename } from "node:path";
import { filmCandidate, measureStyles, measurements } from "../style-ae/index.mjs";

export function styleAeRoutes(ctx, { r }) {
  const measure = ({ only = null, force = false } = {}) => {
    const running = ctx.jobs.list({ kind: "style-ae" }).find((j) => j.status === "running");
    if (running) return running;
    return ctx.jobs.start("style-ae", { title: "Measuring what After Effects gets of each film style" }, async (job) => measureStyles({ root: ctx.root, only, force, signal: job.signal,
      onProgress: ({ measured, failed, total, id }) => job.update({ stage: id, progress: total ? Math.round(((measured.length + failed.length) / total) * 100) : 100 }) }));
  };
  // a film exported to AE whose style has no measurement yet ("video, not checked yet"): that film is measured, its style badge replaced
  const filmPorted = (p) => {
    const id = p.meta?.style?.id;
    if (!id || measurements(ctx.root)[id]) return null;
    return ctx.jobs.start("style-ae", { title: "Measuring what After Effects gets of this film style" }, async (job) =>
      measureStyles({ root: ctx.root, signal: job.signal, list: [filmCandidate(id, p.path, basename(p.path), "exported to After Effects")] }));
  };
  ctx.styleAe = { measure, filmPorted };
  return { routes: [r("POST", "/styles/ae/measure", (_p, b) => measure({ only: Array.isArray(b?.only) ? b.only.map(String) : null, force: b?.force === true }))] };
}

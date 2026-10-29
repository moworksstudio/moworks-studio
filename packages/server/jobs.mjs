// Background jobs of the app (model install, transcription, text-to-speech, export, QA, Port to AE): one record per job with stage,
// progress, a short log, result or error, and a Stop. Kept in memory (the last 100); results that matter are also written to disk by the
// job itself (renders, transcript, QA report, AE result).
export function createJobs({ ended = null } = {}) {          // ended(job): every job's end (the setup checks run again)
  const jobs = new Map();
  let seq = 0;
  const now = () => new Date().toISOString();

  function start(kind, metaIn, fn) {
    const { onEnd = null, ...meta } = metaIn;          // onEnd(job): called once the job has ended (the pipeline's autopilot)
    const busy = [...jobs.values()].find(({ job }) => job.status === "running" && job.kind === kind && job.projectId === (meta.projectId ?? null) && (meta.key ?? null) === (job.key ?? null));
    if (busy) throw Object.assign(new Error(`${meta.title ?? kind} is already running`), { code: "BUSY" });
    const id = `${kind}-${Date.now().toString(36)}${(++seq).toString(36)}`;
    const ctl = new AbortController();
    const job = { id, kind, projectId: null, key: null, title: kind, ...meta, status: "running", stage: "starting", progress: null, startedAt: now(), endedAt: null,
      result: null, error: null, log: [] };
    jobs.set(id, { job, ctl });
    const api = {
      signal: ctl.signal,
      update(patch) { Object.assign(job, patch); },
      log(line) { job.log.push(String(line).slice(0, 500)); if (job.log.length > 300) job.log.shift(); },
      lines: () => job.log.slice(),
      get progress() { return job.progress; },
      get startedAt() { return job.startedAt; },          // the whole wait, e.g. a render's "Took"
    };
    Promise.resolve().then(() => fn(api)).then((result) => {
      job.result = result ?? null;
      job.status = ctl.signal.aborted ? "cancelled" : "done";
    }).catch((e) => {
      job.status = ctl.signal.aborted || e?.code === "CANCELLED" ? "cancelled" : "failed";
      job.error = { code: e?.code ?? "ERROR", message: String(e?.message ?? e), detail: e?.detail ?? null };
    }).finally(() => {
      job.endedAt = now(); job.stage = job.status;
      const done = [...jobs.values()].filter(({ job: j }) => j.status !== "running");
      for (const { job: j } of done.slice(0, Math.max(0, done.length - 100))) jobs.delete(j.id);
      if (onEnd) { try { onEnd(job); } catch { /* the job's result stands */ } }
      if (ended) { try { ended(job); } catch { /* the job's result stands */ } }
    });
    return job;
  }

  return {
    start,
    get: (id) => jobs.get(id)?.job ?? null,
    list: ({ kind = null, projectId = null } = {}) => [...jobs.values()].map(({ job }) => job)
      .filter((j) => (!kind || j.kind === kind) && (!projectId || j.projectId === projectId)).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)),
    running: () => [...jobs.values()].map(({ job }) => job).filter((j) => j.status === "running"),
    cancel(id) {
      const e = jobs.get(id);
      if (!e) throw Object.assign(new Error("Job not found"), { code: "NOT_FOUND" });
      if (e.job.status === "running") { e.job.stage = "stopping"; e.ctl.abort(); }
      return e.job;
    },
  };
}

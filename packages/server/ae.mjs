// Export to After Effects (audit/112 §2.9: it lived in production.mjs): the app's AE port in a child process (packages/ae-export/cli.mjs
// --events), its size check, a canvas film as its rendered film, the dialog's facts. Moved as it was. film: the film's helpers production.mjs
// shares (jobs, meta, workDir, commit, note).
import { killTree } from "../system-status/kill-tree.mjs";
import { err, readJson, writeJson } from "./files.mjs";
import { lastRender, stampedName } from "./renders.mjs";          // a render's name rule and the film's last render
import { prepareFilm } from "./prepare.mjs";
import { aeInstalls } from "../system-status/index.mjs";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import * as projects from "../project-service/index.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { aeRunningAsync, canvasCount, plainLog } from "../ae-export/index.mjs";
import { filmHash, filmParts } from "../project-service/film-hash.mjs";

/** What a Stop says (audit/112d d3): one in After Effects' own build stops the app's side only; AE goes on with the script it was given. */
export const stoppedMessage = (stage) => (stage === "ae" ? "You stopped the export. After Effects finishes building on its own: wait until it is free before the next export." : "You stopped the export.");

/** Whether the export fetches the film's rendered film before it starts (audit/112d d5): a film with canvases whose size check, of this picture,
 *  says AE gets it as a video (canvas, dynamic, empty). One the port writes as layers (text beside its canvases, Editable first) does not wait on
 *  a background render it never uses; a film never checked lets the port ask for it (NEEDS_FILM). A check from before the picture key: its hash. */
export function filmFirst({ canvas, est, hash, picture }) {
  if (!canvas || !est) return false;
  const same = est.picture ? est.picture === picture : est.hash === hash;
  return same && ["canvas", "dynamic", "empty"].includes(est.kind);
}

export function aeRoutes(ctx, { r, P, mustProject, HttpError, film }) {
  const { root } = ctx;
  const { jobs, meta, workDir, commit, note } = film;
  // ---- Export to AE: the existing aeExport() in a child process (packages/ae-export/cli.mjs --events)
  async function startAe(p, b) {
    // always the film's own rate, like the render: b.fps is ignored; PortAE shows the rate from GET /ae
    const fps = String(projects.projectFps(projects.getProject(p.id, root) ?? p));
    const estimate = b.estimate === true;
    // one at a time (audit/112d d2): After Effects runs one script at a time, whichever film sent it; a film's size check and its export share its
    // work folder (the export clears it as it starts). And not while Claude changes the film (d8, owner): the project would be half old, half new
    const running = (kind, pid = null) => jobs.list({ kind }).some((j) => j.status === "running" && (pid == null || j.projectId === pid));
    if (ctx.agent?.running?.has(p.id)) throw err("BUSY", estimate ? "Claude is changing the film: check the size when it finishes" : "Claude is changing the film: export when it finishes");
    if (estimate && running("ae", p.id)) throw err("BUSY", "This film is being exported to After Effects: check the size when it finishes");
    if (!estimate && running("ae-estimate", p.id)) throw err("BUSY", "Check size is running for this film: export when it finishes");
    if (!estimate && running("ae")) throw err("BUSY", "Another film is being exported to After Effects: export this one when it finishes");
    // tasklist off the server's thread (about 1 s while the computer renders)
    if (!estimate && !(await aeRunningAsync())) throw err("AE_NOT_RUNNING", "Open After Effects first (with no dialog showing), then try again");
    // each export in its own folder named like a render (<YYMMDD>_<film>_<HHMM>), never over the one before; a size check writes no export folder (its own in the cache)
    const aeRoot = join(p.path, "renders", "ae");
    const outDir = estimate ? join(p.path, ".moworks", "cache", "ae-estimate") : join(aeRoot, stampedName(aeRoot, basename(p.path)));
    return jobs.start(estimate ? "ae-estimate" : "ae", { projectId: p.id, title: estimate ? "Checking the AE export size" : "Export to After Effects", outDir }, async (job) => {
      // as a render makes it (server/prepare.mjs); the size check only measures: a sound whose file is gone stays on the page and nothing is
      // said in the chat (audit/112b b6.2: pressing the size check took sounds off the film); the export itself leaves it out, said so (#1109)
      const ready = await prepareFilm(p, { root, level: !estimate, dropLost: !estimate, log: job.log });          // the size check sets no level (audit/112d d10)
      if (ready.lost.length) note(p, { kind: "ae", status: "warning", open: "mix", text: ready.lost.map((f) => f.message).join(" ") });
      await commit(p, estimate ? "Changes before the AE size check" : "Changes before Export to AE");
      // the Log the user reads has no addresses (plainLog); the whole log as written stays in the film's cache (port.log)
      // a Python traceback is one plain line in it (T40-17: the dialog showed the traceback's code lines); the whole of it stays in port.log
      let inTrace = false;
      const raw = [], log = (line) => {
        raw.push(line);
        if (/^Traceback \(most recent call last\)/.test(line)) { inTrace = true; job.log("The export's code stopped with an error."); return; }
        // its frames are left out; its last line, the error itself, stays (T43-10: the Log kept the frames' place and lost what went wrong)
        if (inTrace) { if (/^\s/.test(line) || !line.trim()) return; inTrace = false; job.log(plainLog(line.replace(/^[\w.]+(?:Error|Exception):\s*/, ""))); return; }
        job.log(plainLog(line));
      };
      // Stop is the user's, not a failure: no exit code, said plainly
      // the port's last stage, as it said it: a Stop sets the job's own stage to "stopping" before the export ends (audit/112d second look, d3)
      let lastStage = null;
      const STOPPED = { status: "cancelled", code: "CANCELLED", get message() { return stoppedMessage(lastStage); } };
      const port = (film) => job.signal.aborted ? Promise.resolve(STOPPED) : new Promise((ok) => {
        // ctx.aeCli: a stand-in for the port's CLI (tests)
        const args = [ctx.aeCli ?? join(root, "packages", "ae-export", "cli.mjs"), p.path, "--fps", fps, "--out", outDir, "--events", ...(estimate ? ["--estimate"] : []), ...(film ? ["--film", film] : [])];
        const c = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        const kill = () => killTree(c);
        job.signal.addEventListener("abort", kill, { once: true });
        let buf = "", final = null;
        const onLine = (line) => {
          if (line.startsWith("EVENT ")) {
            let e; try { e = JSON.parse(line.slice(6)); } catch { return; }
            if (e.type === "stage") lastStage = e.stage;
            if (e.type === "stage") job.update({ stage: e.stage, progress: e.total ? Math.round((e.done / e.total) * 100) : job.progress });
            if (e.type === "log") log(e.line);
          } else if (line.startsWith("RESULT ")) { try { final = JSON.parse(line.slice(7)); } catch { /* bad line */ } } else if (line.trim()) log(line);
        };
        c.stdout.on("data", (d) => { buf += d.toString("utf8"); let i; while ((i = buf.indexOf("\n")) >= 0) { onLine(buf.slice(0, i).replace(/\r$/, "")); buf = buf.slice(i + 1); } });
        c.stderr.on("data", (d) => log(d.toString("utf8").trim()));
        c.on("close", (code) => { job.signal.removeEventListener("abort", kill); if (buf) onLine(buf); ok(job.signal.aborted ? STOPPED : final ?? { status: "failed", code: "PORT_FAILED", message: `port exit ${code}` }); });
      });
      // a film drawn on a canvas only goes into AE as its rendered film: the film's background render when it is of the film
      // as it is now (a running one is waited for); a canvas film the port finds with none renders it here, then ports again
      const rendered = async (start) => {
        if (start) ctx.previewProxy?.(p.id);
        // the picture only: AE's video layer has its sound off (d4)
        const f = await ctx.preRendered?.(p, { format: "mp4", fps: Number(fps), quality: "draft", signal: job.signal, picture: true }, () => job.update({ stage: "film" })).catch(() => null);
        return f ?? lastRender(projects.getProject(p.id, root) ?? p, Number(fps), { picture: true });
      };
      const now = () => { try { return { hash: filmHash(p.path, Number(fps)), picture: filmParts(p.path, Number(fps)).picture }; } catch { return {}; } };
      const film = estimate || !filmFirst({ canvas: canvasCount(p.path), est: readJson(workDir(p, "ae", "estimate.json"), null), ...now() }) ? null : await rendered(false);
      let result = await port(film);
      if (result.code === "NEEDS_FILM" && !film && !job.signal.aborted) { const f = await rendered(true); if (f) result = await port(f); }
      if (job.signal.aborted) result = { ...STOPPED, outDir: result.outDir };
      // an exit code is no answer for the user (T40-17): said plainly; the notes carry no addresses either (T40-19: a font file's full path)
      if (/^port exit \d+$/.test(result.message ?? "")) result = { ...result, message: "The export stopped with an error. Export again; if it happens again, tell Claude in the chat." };
      if (result.message) result = { ...result, message: plainLog(result.message) };
      if (result.notes?.length) result = { ...result, notes: result.notes.map(plainLog) };
      try { writeFileSync(workDir(p, "ae", estimate ? "estimate.log" : "port.log"), raw.join("\n") + "\n"); } catch { /* the cache folder is made by the export */ }
      // the size check is kept with the film it measured: the dialog says what AE gets (a canvas film) without checking again
      if (estimate && result.estimate) writeJson(workDir(p, "ae", "estimate.json"), { ...result.estimate, at: new Date().toISOString(), hash: filmHash(p.path, Number(fps)), picture: filmParts(p.path, Number(fps)).picture });
      if (!estimate) writeJson(workDir(p, "ae", "last.json"), { ...result, at: new Date().toISOString(), fps, log: job.lines().slice(-80) });
      if (result.status === "cancelled") throw Object.assign(err("CANCELLED", STOPPED.message), { detail: result });
      if (result.status !== "done" && result.status !== "estimate") throw Object.assign(err(result.code ?? "PORT_FAILED", result.message ?? "The port failed"), { detail: result });
      if (!estimate) meta(p.id, (m) => { (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "ae", text: `Ported to After Effects (${basename(result.aep ?? "")})` }); });
      const lost = result.layers?.lost?.length ?? 0;
      if (!estimate) note(p, { kind: "ae", ...(lost ? { status: "warning" } : {}),          // the project is there: a warning, as on the page (audit/112d d7)
         text: lost ? "Export to AE finished, {n} layers are not in the project: {file}" : "Export to AE finished: {file}", vars: { file: basename(result.aep ?? ""), n: lost } });
      if (!estimate) { try { ctx.styleAe?.filmPorted(projects.getProject(p.id, root) ?? p, result.estimate); } catch { /* the badge waits for the next start */ } }          // its style's AE badge, when not measured yet
      return result;
    });
  }
  const routes = [
    r("GET", "/ae/status", async () => ({ installs: aeInstalls(), running: await aeRunningAsync() })),          // off the server's thread
    r("GET", `/projects/${P}/ae`, async ([id]) => {
      const p = mustProject(id, root);
      // a one-page code film (What If, anidoodle…) has no scene files (scenes 0) and is built all the same: built is the root's own word
      // (not the starter film, whose one title card is a scene too), its count the film's shots
      const { shots, root: comp } = await readShots(p.path).catch(() => ({ shots: [], root: null }));
      const count = placedShots(shots, comp?.duration).filter((s) => s.duration).length;
      const fps = projects.projectFps(p), last = readJson(workDir(p, "ae", "last.json"), null);
      // the last size check while the film is unchanged (what AE gets: a canvas film is one video layer), and the film's canvases
      // (a check from before it measured the film counted HF's seeks only and no picture, T28-24: "about 4 min" for 78 and more; it is made again)
      const est = readJson(workDir(p, "ae", "estimate.json"), null);
      const measured = est && (est.frames != null || ["canvas", "dynamic", "empty"].includes(est.kind));
      return { fps, built: p.built === true || (p.built !== false && (p.scenes ?? 0) > 0), scenes: p.scenes ?? 0, shots: count,
        canvas: canvasCount(p.path), estimate: measured && est.hash === filmHash(p.path, Number(fps)) ? est : null,
        // an export made before the Log lost its addresses reads the same; lastExport is the Render's (the dialog shows the AE export's time)
        last: last && { ...last, message: last.message && plainLog(last.message), log: (last.log ?? []).map(plainLog) },
        running: await aeRunningAsync(), installs: aeInstalls(), lastExport: p.meta?.lastExport ?? null,
        jobs: jobs.list({ projectId: id }).filter((j) => j.kind === "ae" || j.kind === "ae-estimate").slice(0, 3) };
    }),
    r("POST", `/projects/${P}/ae`, ([id], b) => startAe(mustProject(id, root), b)),
  ];
  return { routes };
}

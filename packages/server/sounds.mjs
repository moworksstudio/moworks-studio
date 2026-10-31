// The Editor's Sounds drawer: the sounds that ship with the app answer at once, the online services (Openverse, then SFXMint) on their own
// route so a dead service never holds the list up, and Add puts one on the film at the playhead as one step in its history. No path of this
// computer goes to the page. (The older panel's search route, gone in c6c59f3b, gave a shot's cue; this one places a clip at a time.)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isStarterPage } from "../hf-edit/shots.mjs";
import { details, localSounds, onlineSources } from "../sfx/index.mjs";
import { addSound } from "../sfx/added.mjs";

/** A service that did not answer is left alone this long, so typing the next word does not wait on it; Try again asks it at once. */
const REST_MS = 5 * 60 * 1000;
/** Longer than this is a recording, not a sound to pick. */
const LONGEST_S = 120;
/** One at a time per film: inTurn(film id, fn). Add, a move and a take-off each read and write the film's page and its sound record. */
export function turnsPerFilm() {
  const queues = new Map();
  return (id, fn) => { const run = (queues.get(id) ?? Promise.resolve()).catch(() => {}).then(fn); queues.set(id, run); return run; };
}

export function soundRoutes(ctx, { r, P, mustProject, HttpError }) {
  const { root } = ctx;
  const online = onlineSources({ fetchImpl: (...a) => globalThis.fetch(...a), closest: true, restMs: REST_MS });
  const row = (x) => ({ id: x.id, title: x.title || "Untitled sound", durationS: x.durationS, source: x.source, licence: x.licence, url: x.url });
  const inTurn = (ctx.soundTurn ??= turnsPerFilm());
  const free = (id) => {
    if (ctx.agent?.running?.has(id)) throw new HttpError(409, "BUSY", "Claude is changing the film: add the sound when it finishes");
    if (ctx.renders?.isRendering(id)) throw new HttpError(409, "RENDERING", "The film is being rendered: add the sound when it finishes");
    if (ctx.jobs?.list?.({ kind: "mix-sfx" }).some((j) => j.projectId === id && j.status === "running")) throw new HttpError(409, "BUSY", "The sound effects are being placed: add the sound when that finishes");
  };
  return { routes: [
    r("GET", "/sfx/search", (_p, _b, q) => ({ results: localSounds(q.get("q"), { group: q.get("group"), root }) })),
    // status: "ok" (results may be empty), or "down": no online service answered
    r("GET", "/sfx/search/online", async (_p, _b, q) => {
      const words = (q.get("q") ?? "").trim();
      if (!words) return { results: [], status: "ok" };
      if (q.get("again") === "1") online.wake();
      const hits = await online.find(words, { limit: 20 });
      return hits ? { results: hits.filter((x) => x.durationS == null || x.durationS <= LONGEST_S).map(row), status: "ok" } : { results: [], status: "down" };
    }),
    // { id: a result's id (read again here), at: seconds } -> { id: the clip, at: where it went, duration, volume }
    r("POST", `/projects/${P}/sfx/add`, ([id], b) => inTurn(id, async () => {
      const p = mustProject(id, root);
      free(id);
      let html = ""; try { html = readFileSync(join(p.path, "index.html"), "utf8"); } catch { /* no film page yet */ }
      if (!html || isStarterPage(html)) throw new HttpError(409, "NOT_BUILT", "Sounds go on the film once it is built");
      const item = await details(String(b.id ?? ""), { root }).catch(() => { throw new HttpError(502, "PROVIDER", "The online sound service is not answering. Try again, or pick one of the app's own sounds."); });
      if (!item) throw new HttpError(400, "INVALID", "That sound is not available any more");
      try { return await ctx.mix.change(p, `sound "${item.title}" added`, () => addSound(p.path, item, { at: b.at, root }).then(({ tag: _tag, ...x }) => x)); }
      catch (e) {
        if (e.code === "SFX_LIMIT") throw new HttpError(429, e.code, "That service's downloads for today are used up. Try tomorrow, or pick one of the app's own sounds.");
        if (e.code === "SFX_DOWNLOAD" || e.name === "TimeoutError") throw new HttpError(502, "PROVIDER", "The sound could not be downloaded. Try again, or pick another one.");
        throw e;
      }
    })),
  ] };
}

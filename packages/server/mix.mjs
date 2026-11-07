// Final Mix in the app (audit/112a B3: it lived in boards.mjs, the Storyboard's file): the dialog's routes (/mix: the music options from
// Mixkit, the stop at the twist, the sound effects placed by the app and the owner's choices for them, the lanes' faders and mutes, Balance
// again), every sound change as a sound-only revision with its Undo on the timeline, and ctx.mix for the rest of the app (the autopilot's
// music and effects, the Editor's and the Sounds drawer's changes, the boards' tools). Moved as it was.
import { planStopAt, recordMusic, snappedStop } from "../sfx/film-music.mjs";
import { LANES, applyLanes, readLanes, setLane, setMute } from "../sfx/lanes.mjs";
import { balanceAgain } from "../sfx/mix/index.mjs";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as projects from "../project-service/index.mjs";
import { rememberAssets } from "../project-service/assets.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { styleSound } from "../agent/index.mjs";
import { creditMusic, readOptions } from "../sfx/music.mjs";
import { autoSfx, whooshAllowed } from "../sfx/auto.mjs";
import { addedNow, cuesChanged, mount, mountAmbience, mountedNow, placedNote, readState, timesChanged, unmuteAll, writeCredits } from "../sfx/index.mjs";
import { DEFAULT_DENSITY, DENSITIES, readPrefs, soundPolicy, updatePrefs } from "../sfx/prefs.mjs";
import * as plan from "../motion-plan/index.mjs";
import * as pipe from "../pipeline/index.mjs";
import * as rev from "../revisions/index.mjs";
import { musicRepeats, stopMusic } from "../hf-edit/tracks.mjs";


export function mixRoutes(ctx, { r, P, mustProject, HttpError }) {
  const { root } = ctx;
  const url = (id, rel) => `${ctx.preview.base}/p/${id}/${rel}`;
  /** The one rule every change of a film's sound asks first (Final Mix, the Editor's timeline, the Sounds drawer: audit/112a B4): while the
   *  app places the sound effects (a job of minutes) a change now would be undone when it writes the page ("Remove them" came back). doing:
   *  what the user wanted, for the words ("add the sound"). */
  const soundBusy = (id, doing) => {
    if (ctx.jobs.list({ kind: "mix-sfx" }).some((j) => j.projectId === id && j.status === "running")) throw new HttpError(409, "BUSY", `The sound effects are being placed: ${doing} when that finishes`);
  };
  /** The sound stays as it is while Claude checks the film, or the app would place it under Claude's changes (owner 31/10, #694-#698). */
  const mixOpen = (id) => {
    soundBusy(id, "change the sound");
    if (pipe.reviewPending(projects.getProject(id, root)?.meta?.pipeline?.version1) && (ctx.agent.running.has(id) || ctx.jobs.list({ projectId: id }).some((j) => j.status === "running" && j.kind === "qa")))
      throw new HttpError(409, "MIX_SHUT", "Claude is checking your film. Final Mix opens again when it finishes.");
  };
  // a Final Mix change: the work before it is committed on its own, the change as a sound-only revision (the picture's checks hold)
  // undo: what Ctrl+Z on the timeline says for this change ({ kind, name, n }): a sound moved or taken off goes on the film's list of what can be undone
  const mixChange = async (p, what, fn, { preview = true, undo = null } = {}) => {
    let before = null, after = null;
    try { before = await rev.saveAsync(p.path, "Changes before Final Mix"); } catch { /* revisions optional */ }
    const out = await fn();
    applyLanes(p.path);          // sounds placed by this change join the lane whose fader moved
    try { after = await rev.commitAllAsync(p.path, `${rev.SOUND_MIX}: ${what}`); } catch { /* revisions optional */ }
    if (undo && after && after !== before) undoList(p, [...undoList(p), { ...undo, rev: after }].slice(-UNDO_KEPT));
    previewAgain(p, preview);
    return out;
  };
  // a finished film whose sound changed: the preview service is asked once (it decides by the film's
  // picture and sound whether anything is made); while stage 4 places the sound, not yet
  const previewAgain = (p, preview = true) => {
    const now0 = projects.getProject(p.id, root);
    if (preview && (now0?.meta?.pipeline?.finished || now0?.meta?.pipeline?.delivered)) { try { ctx.previewProxy?.(p.id); } catch { /* next change */ } }
  };
  // ---- Ctrl+Z on the timeline (T29-8): the last sound moved or taken off comes back, with all it changed (the film's page, its records), as a new revision. Only over sound changes: once
  // Claude or anything else changed the film after it, it is no longer the last thing done and the list is dropped. The list is the app's own (in the cache, not the film's history) ----
  const UNDO_KEPT = 30;
  function undoList(p, list) {
    const f = join(p.path, ".moworks", "cache", "sound-undo.json");
    if (list === undefined) { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return []; } }
    mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(list));
    return list;
  }
  const soundOnly = (message) => message.includes(rev.SOUND_MIX) || message === rev.STUDIO_IDS || message === "Changes before Final Mix";
  const undoSound = async (p) => {
    try { await rev.saveAsync(p.path, "Changes before Final Mix"); } catch { /* revisions optional */ }
    const list = undoList(p), last = list.at(-1);
    if (!last) return { undone: false };
    const log = await rev.logAsync(p.path, 200), at = log.findIndex((c) => c.rev === last.rev);
    if (at < 0 || log.slice(0, at).some((c) => !soundOnly(c.message))) { undoList(p, []); return { undone: false }; }
    // a sound change the list does not hold (a fader, a sound added) touched the same lines since: the film stays as it is
    try { await rev.revertAsync(p.path, last.rev); } catch (e) { if (e.code !== "CONFLICT") throw e; undoList(p, []); return { undone: false }; }
    undoList(p, list.slice(0, -1));
    previewAgain(p);
    return { undone: true, kind: last.kind, name: last.name ?? null, n: last.n ?? 1 };
  };
  /** The music stopped at `at` s, or played to its end again (null): a sound-only change, kept in the project's meta. snap: moved into a pause. */
  const musicStop = (p, at0, { snap = false } = {}) => { const s = snap && at0 != null ? snappedStop(p, at0) : null, at = s ? s.at : at0;          // sfx/film-music.mjs
    return mixChange(p, at == null ? "music plays to its end" : `music stops at ${at} s`, () => {
    try {
      const r0 = { ...stopMusic(p.path, at), ...(s?.moved ? { asked: Number(at0), word: s.word, after: s.after } : {}) };
      recordMusic(p.id, { stopAt: at == null ? null : r0.at }, root);
      return r0;
    }
    catch (e) { throw new HttpError(400, e.code ?? "INVALID", e.message); }
  }); };
  /** A music option onto the timeline (Final Mix's "Use this", and the autopilot's pick of the first track). */
  const useOption = (p, track) => mixChange(p, `music "${track.title}"`, async () => {
    // the chosen track is copied to assets/3_audio/music/ (kept in the history like the user's files; the options are not)
    const rel = `assets/3_audio/music/${basename(track.file)}`;
    mkdirSync(join(p.path, "assets", "3_audio", "music"), { recursive: true });
    rememberAssets(p.path, [rel]);          // the app's own copy: never a file "the user added" (T22-2)
    copyFileSync(join(p.path, ...track.file.split("/")), join(p.path, ...rel.split("/")));
    const { root: comp } = await readShots(p.path);          // a track longer than the film plays to the film's end
    const placed = await ctx.placeMusic(p, rel, { duration: comp?.duration && track.duration ? Math.min(track.duration, comp.duration) : track.duration });
    creditMusic(p.path, { ...track, file: rel });
    recordMusic(p.id, { chosen: track }, root);
    return placed;
  });
  /** Sound effects placed by the app from the storyboard's cues and the motion plan (Final Mix's "Place", and the autopilot). The
   *  chat's line names the sounds left out or on a stand-in (placedNote: a warning, which the chat shows). */
  const placeSfx = (p, signal = null) => mixChange(p, "sound effects", async () => {
    const { shots, root: comp } = await readShots(p.path);          // a one-page code film: the storyboard's planned times
    const mp = plan.read(p.path);
    // no whoosh of the app's own in a style whose author's sound palette has none (Test 24's CRT film got four)
    const whoosh = whooshAllowed(styleSound(p.meta, root) ?? "");
    // the style's sound section also says when it wants silence or fewer sounds, and its material (paper, synth, organic, cartoon)
    const palette = styleSound(p.meta, root) ?? "";
    const res = await autoSfx(p.path, placedShots(shots, comp?.duration), mp.exists && !mp.error ? mp.plan : null,
      { signal, root, whoosh, palette, styleId: p.meta?.style?.id ?? null, styleTitle: p.meta?.style?.title ?? null });
    projects.addNote(p.path, { kind: "sfx", ...placedNote(res) });
    return res;
  });
  /** After a chat turn that changed STORYBOARD.md: when its named cues (`- sfx:`) changed since the sounds were placed, they are placed
   *  again now, as a job the Editor shows (Test 20: Claude said "the app is finding the sounds", and nothing happened until "Place them
   *  again"). Resolves once they are placed; null when nothing changed, none were placed yet, or a placement is running already. */
  const cuesAgain = (p) => placeAgainIf(p, cuesChanged);
  /** A Review or its fix moved a shot: the sound effects placed again for the film as it is now, the user's own moves kept (autoSfx: handMoves). Resolves once
   *  they are placed; null when no shot moved. */
  const timesAgain = (p) => placeAgainIf(p, timesChanged);
  /** The sound effects placed again when `changed` says the film moved under them (the two cases above, once: audit/112a B7). */
  const placeAgainIf = async (p, changed) => {
    const { shots, root: comp } = await readShots(p.path).catch(() => ({ shots: [] }));
    if (!changed(p.path, placedShots(shots, comp?.duration))) return null;
    let end;
    const ended = new Promise((r) => { end = r; });
    try { ctx.jobs.start("mix-sfx", { projectId: p.id, title: "Sound effects", onEnd: (j) => end(j) }, async (job) => { job.update({ stage: "placing sound effects" }); return placeSfx(p, job.signal); }); }
    catch (e) { if (e.code === "BUSY") return null; throw e; }
    const job = await ended;
    return job.status === "done" ? job.result : null;
  };
  /** The plan's musicStop, once the music is on the timeline (the app once put the music on after Claude's music step and it played
   *  all 40 s past the plan's stop at 26.5 s, so Claude told the user to set it in Final Mix), unless a stop
   *  is set already or someone chose "play to the end". Its second, or null. */
  // whether the plan's stop counts for a film: sfx/film-music.mjs planStopAllowed / planStopAt
  const stopFromPlan = async (p) => {
    const now0 = projects.getProject(p.id, root);
    const m = now0?.meta?.music;
    if (!m?.file || m.stopAt != null || m.toEnd) return null;
    const at = planStopAt(now0);
    if (!(at > 0)) return null;
    try { return (await musicStop(now0, at, { snap: true })).at; } catch { return null; }
  };
  /** The plan's musicStop as the music step will apply it (for Claude's words before the app places the music). */
  const planStop = (p) => { const at = planStopAt(p); return at != null && p.meta?.music?.stopAt == null && !p.meta?.music?.toEnd ? snappedStop(p, at).at : null; };
  ctx.mix = { useOption, placeSfx, stopFromPlan, planStop, musicStop, cuesAgain, timesAgain, change: mixChange, undo: undoSound, soundBusy };

  const routes = [
    // Final Mix dialog
    r("GET", `/projects/${P}/mix`, ([id]) => {
      const p = mustProject(id, root), m = p.meta ?? {};
      const rounds = readOptions(p.path).rounds;
      const sfx = readState(p.path), prefs = readPrefs(p.path);
      // repeat: a song shorter than the film plays again after itself (tracks.mjs musicLoop); `short` when far shorter, said to the owner
      return { music: m.music ? { ...m.music, url: url(id, m.music.file), repeat: musicRepeats(p.path) } : null, voice: m.voice?.file ? { file: m.voice.file, saved: m.voice.transcript?.status === "saved", used: !m.voice.offTimeline } : null,          // used: false once the user chose not to use it
        options: rounds.map((r0) => ({ ...r0, tracks: r0.tracks.map((t) => ({ ...t, url: url(id, t.file), current: m.music?.option === t.file || m.music?.file === t.file })) })),
        // where each sound is now: moved by hand, it is there; taken off, it is not listed (T29-7)
        sfx: mountedNow(p.path).map((x) => ({ name: x.name, start: x.start, file: x.file, auto: !!x.auto, id: x.id ?? null, fromPage: !!x.fromPage })),          // fromPage: the × takes it off the page (F1)
        loudness: m.lastExport?.loudness ?? null,
        // the sounds the user added from the Sounds drawer: placing again never touches them, each comes off with its ×
        added: addedNow(p.path).map((x) => ({ id: x.id, name: x.title, start: x.start, file: x.file })),
        // the scenes' ambience beds (one row a bed, however many clips its loop takes), and the owner's sound choices
        ambience: [...new Map((sfx.ambience?.placed ?? []).map((x) => [x.key, x])).values()].map((x) => ({ id: x.key, name: String(x.name ?? "").replace(/^ambience:\s*/, ""),
          start: Math.min(...sfx.ambience.placed.filter((y) => y.key === x.key).map((y) => y.start)) })),
        // styleDensity: the film style's own (its source skill's "key moments only": key), for the choice that goes back to it (T43-15)
        sfxPrefs: { density: prefs.density ?? sfx.policy?.density ?? DEFAULT_DENSITY, styleDensity: soundPolicy({ palette: styleSound(p.meta, root) ?? "" }).density, own: !!prefs.density,
          ambience: prefs.ambience !== false, off: prefs.off ?? [], skipped: (prefs.skip ?? []).length },
        // the last placement: when (the dialog follows it), the named sounds it left out and those on a stand-in ({ name, as })
        sfxAt: sfx.placedAt ?? null, sfxMissing: sfx.left?.missing ?? [], sfxNear: sfx.left?.near ?? [],
        sfxPlacing: ctx.jobs.list({ kind: "mix-sfx" }).some((j) => j.projectId === id && j.status === "running") };
    }),
    r("POST", `/projects/${P}/mix/music`, async ([id], b) => {
      mixOpen(id);
      const p = mustProject(id, root);
      const track = readOptions(p.path).rounds.flatMap((r0) => r0.tracks).find((t) => t.file === b.file);
      if (!track) throw new HttpError(404, "NOT_FOUND", "Not one of the music options");
      return useOption(p, track);
    }),
    // stop the music at a second (the twist), or { at: null } to play it to its end again
    r("POST", `/projects/${P}/mix/music/stop`, ([id], b) => {
      mixOpen(id);
      const p = mustProject(id, root);
      if (!p.meta?.music?.file) throw new HttpError(400, "INVALID", "No music on the timeline yet");
      const at = b.at == null || b.at === "" ? null : Number(b.at);
      return musicStop(p, at);
    }),
    r("POST", `/projects/${P}/mix/sfx`, ([id]) => {
      mixOpen(id);
      const p = mustProject(id, root);
      return { job: ctx.jobs.start("mix-sfx", { projectId: id, title: "Sound effects" }, async (job) => {
        job.update({ stage: "placing sound effects" });
        unmuteAll(p.path);          // "Place" again brings back the sounds the user took off the timeline
        return placeSfx(p, job.signal);
      }) };
    }),
    // the owner's sound choices from Final Mix: one sound taken out (skip: its id), all of them back (unskip: true), the density, the
    // ambience on or off; kept in .moworks/sfx-prefs.json, and the sounds placed again at once with them
    r("POST", `/projects/${P}/mix/sfx/prefs`, ([id], b) => {
      mixOpen(id);
      const p = mustProject(id, root);
      const patch = {};
      if (typeof b.skip === "string" && b.skip.trim()) patch.skip = [b.skip.trim()];
      if (b.unskip === true) patch.unskip = true;
      if (b.density != null) { if (!DENSITIES.includes(b.density) && b.density !== "style") throw new HttpError(400, "INVALID", "The density is low, normal, lively or the film style's own"); patch.density = b.density; }
      if (typeof b.ambience === "boolean") patch.ambience = b.ambience;
      if (!Object.keys(patch).length) throw new HttpError(400, "INVALID", "Nothing to change");
      const prefs = updatePrefs(p.path, patch);
      return { prefs, job: ctx.jobs.start("mix-sfx", { projectId: id, title: "Sound effects" }, async (job) => {
        job.update({ stage: "placing sound effects" });
        return placeSfx(p, job.signal);
      }) };
    }),
    r("POST", `/projects/${P}/mix/sfx/clear`, ([id]) => { mixOpen(id); const p = mustProject(id, root); return mixChange(p, "sound effects removed", () => { mount(p.path, [], { left: { missing: [], near: [] } }); mountAmbience(p.path, []); writeCredits(p.path); return { placed: 0 }; }); }),
    // a lane's fader on the timeline (owner 01/11): every clip of it at once, a sound-only change like the rest of the mix
    r("POST", `/projects/${P}/mix/lanes`, async ([id], b) => {
      mixOpen(id);
      const p = mustProject(id, root);
      if (!LANES.includes(b.lane)) throw new HttpError(400, "INVALID", "A lane is the voice, the effects or the music");
      // Mute (3b): HF's own mute of the lane's bus, heard neither in the Editor nor in the render; its fader is kept
      if (typeof b.muted === "boolean") return mixChange(p, `${b.lane} ${b.muted ? "muted" : "unmuted"}`, () => ({ muted: setMute(p.path, b.lane, b.muted), levels: readLanes(p.path) }), { preview: !ctx.stemsReady?.(id) });
      // with the lanes as files of their own the Editor already plays the new level: only the export mixes again
      return mixChange(p, `${b.lane} level ${b.db} dB`, () => ({ levels: setLane(p.path, b.lane, b.db) }), { preview: !ctx.stemsReady?.(id) });
    }),
    // every level back to what the app sets, for the sound on the timeline now (owner 01/11)
    r("POST", `/projects/${P}/mix/balance`, async ([id]) => {
      mixOpen(id);
      const p = mustProject(id, root);
      return mixChange(p, "sound balanced again", async () => ({ levels: await balanceAgain(p.path, { root }) }));
    }),
  ];
  return { routes };
}

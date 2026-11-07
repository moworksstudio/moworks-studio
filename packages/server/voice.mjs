// The film's voice-over (audit/112 §2.9: it lived in production.mjs beside the render, the checks and the imports): its facts and its
// waveform, the transcription that comes first after new audio, the transcript the user corrects and saves, the voice made by ElevenLabs
// or Kokoro (a sample first), and putting a voice on the timeline. Moved as it was. film: the film's helpers production.mjs shares
// (jobs, meta, workDir, commit, note, relativeTo); back to it: the routes and what its uploads use (voiceOf, audioPath, sampleFile, useVoice, startTranscribe).
import { err, readJson, writeJson } from "./files.mjs";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as projects from "../project-service/index.mjs";
import { rememberAssets } from "../project-service/assets.mjs";
import * as secrets from "../secrets/index.mjs";
import { PROVIDERS, filmVietnamese, isVietnamese, pickModel, retryOnce, ttsFailedText, voiceSettings } from "../voice/tts.mjs";
import * as kokoro from "../voice/kokoro.mjs";
import { plainMessage } from "./plainError.mjs";
import { peaks, probe, quietParts } from "../voice/audio.mjs";
import * as asr from "../voice/asr.mjs";
import * as transcript from "../voice/transcript.mjs";
import { briefScript, firstLines, scriptDraft, scriptGap } from "../voice/script.mjs";
import { placeTrack } from "../hf-edit/tracks.mjs";
import { levelTracks } from "../sfx/mix/index.mjs";

export function voiceRoutes(ctx, { r, P, mustProject, HttpError, film }) {
  const { root } = ctx;
  const { jobs, meta, workDir, commit, note, relativeTo } = film;
  const voiceOf = (p) => projects.getProject(p.id, root)?.meta?.voice ?? null;
  const audioPath = (p) => { const v = voiceOf(p); return v?.file ? join(p.path, ...v.file.split("/")) : null; };
  // ---- transcription: always the first step after new audio
  /** Words to expect, for Whisper's spelling: what the user typed for this project, else the brand and the start of the script. */
  const hintsFor = (p) => {
    const m = projects.getProject(p.id, root)?.meta ?? {};
    if (typeof m.voice?.hints === "string") return m.voice.hints;
    return [m.brand, m.brief?.mode === "script" ? m.brief.text : ""].filter(Boolean).join(". ").replace(/\s+/g, " ").slice(0, 600);
  };

  function startTranscribe(p, { model, language, hints } = {}) {
    const s = asr.voiceSettings(root);
    const all = asr.models(root);
    const ready = (m) => m && m.installed && m.runtime.ok;
    // no model asked for: the default when it is ready, else any ready one (Turbo is the only model)
    const id = model ?? (ready(all.find((m) => m.id === s.defaultModel)) ? s.defaultModel : all.find(ready)?.id ?? s.defaultModel), lang = language ?? (p.meta?.voice?.source === "kokoro" ? kokoro.whisperLanguage(p.meta.voice.voiceId) : null) ?? p.meta?.language?.id ?? s.language;          // Whisper's "Spoken in" follows the film's language; a Kokoro voice-over is in its voice's own (a film with no language set yet read an English voice as Vietnamese and heard nothing)
    const file = audioPath(p);
    if (!file || !existsSync(file)) throw err("INVALID", "Add the voice-over audio first");
    const card = all.find((m) => m.id === id);
    if (!card) throw err("INVALID", "Unknown speech-to-text model");
    if (typeof hints === "string") meta(p.id, (m) => { m.voice = { ...(m.voice ?? {}), hints: hints.slice(0, 600) }; });
    const prompt = typeof hints === "string" ? hints : hintsFor(p);
    if (!card.installed || !card.runtime.ok) throw err("MODEL_MISSING", !card.installed ? `${card.short} is not installed yet` : `${card.short} cannot run yet: ${card.runtime.message}`);
    meta(p.id, (m) => { m.voice = { ...(m.voice ?? {}), transcript: { status: "transcribing", model: id, language: lang, at: new Date().toISOString() } }; });
    // when the words are in, a Prepare waiting for them starts (or one that ran before them checks them)
    const onEnd = (job) => { if (job.status === "done") { try { ctx.autopilot?.transcriptLanded?.(p.id)?.catch?.(() => {}); } catch { /* the user can go on */ } } };
    return jobs.start("transcribe", { projectId: p.id, title: `Transcribing (${card.short})`, model: id, onEnd }, async (job) => {
      job.update({ stage: "loading model" });
      const result = await asr.transcribe(file, { model: id, language: lang, prompt, workDir: workDir(p, "asr"), signal: job.signal, root,
        onEvent: (e) => {
          if (e.type === "info") job.update({ stage: "transcribing", detected: { language: e.language, probability: e.probability, device: e.device } });
          if (e.type === "progress") job.update({ progress: e.pct, segments: e.segments });
          if (e.type === "log") job.log(e.line);
        } }).catch((e) => { meta(p.id, (m) => { if (m.voice?.transcript) m.voice.transcript.status = e.code === "CANCELLED" ? "cancelled" : "failed"; }); throw e; });
      const t = transcript.fromEngine(p.path, { audio: voiceOf(p).file, result });
      meta(p.id, (m) => { m.voice.transcript = { status: "review", model: id, language: result.language, at: t.createdAt, segments: t.segments.length };
        (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Transcript ready (${card.short}, ${result.segments.length} segments)` }); });
      await commit(p, "Voice-over transcribed");
      // a voice-over the app read from a script (ElevenLabs, Kokoro; a film made earlier with Fish Audio too) says that script word for word: its
      // words are the script's, at Whisper's times; when what was heard is far from the script (another take, an edited file) the user checks them
      const v0 = voiceOf(p), read = ["elevenlabs", "kokoro", "fishaudio"].includes(v0?.source) && v0?.script && v0.file === t.audio ? transcript.fromScript(t.segments, v0.script) : null;
      if (read && read.match < 0.6) {
        note(p, { kind: "voice", status: "warning", text: "The words heard differ from the script the voice was read from ({pct}% the same): check them in Transcript before the film is timed to them",
          vars: { pct: Math.round(read.match * 100) } });
        return { segments: result.segments.length, language: result.language, device: result.device, words: 0, script: { match: read.match } };
      }
      // words with nothing heard for them: the voice left out a line, so the film is not timed to it until the user has listened (Whisper's words alone say "9 of 10 the same")
      if (read?.skipped.length) {
        note(p, { kind: "voice", status: "warning", text: "The voice-over seems to leave out: {words}. Listen to it: make it again if the words are missing, or send the words from Transcript if they are there",
          vars: { words: read.skipped.map((x) => `“${x.text}”`).join(", ").slice(0, 300) } });
        return { segments: result.segments.length, language: result.language, device: result.device, words: 0, script: { match: read.match, skipped: read.skipped } };
      }
      // the words' times from the service that read them, when it gave them; else Whisper's
      const aligned = read ? transcript.readAlignment(p.path, t.audio) : null;
      const exact = aligned ? transcript.exactTimes(read.segments, aligned, await quietParts(file, root).catch(() => [])) : null;
      if (aligned && !exact) job.log("The service's times are not for these words: Whisper's times are used");
      // the app uses Whisper's words at once: saved and on the timeline; the user corrects them in the
      // transcript dialog and sends them again when needed
      const words = await saveTranscript(projects.getProject(p.id, root), exact ?? (read ? read.segments : t.segments));
      note(p, { kind: "voice", text: read && read.changed + read.missed ? "Transcript ready: {n} words, the film is timed to them; {k} word(s) taken from the script the voice was read from"
        : "Transcript ready: {n} words, the film is timed to them; open Transcript to correct them", vars: { n: words, k: read ? read.changed + read.missed : 0 } });
      return { segments: result.segments.length, language: result.language, device: result.device, words, ...(read ? { script: { match: read.match, changed: read.changed, missed: read.missed } } : {}) };
    });
  }

  /** The checks before a voice service reads anything: { provider, key, local }. */
  function readingAsked(p, b) {
    const provider = PROVIDERS[b.provider] ? b.provider : null;
    if (!provider) throw err("INVALID", "Choose ElevenLabs or Kokoro");
    const local = !!PROVIDERS[provider].local;
    const key = local ? null : secrets.getSecret(provider, root);
    if (!key && !local) throw err("INVALID", `Add the ${PROVIDERS[provider].title} key in Studio Settings first`);
    if (local) {
      if (!kokoro.packStatus(root).installed) throw err("MODEL_MISSING", "The free voice is not installed yet: install it on the Voice screen");
      // a film in Vietnamese, or Vietnamese words in a film whose language is not set yet (an English film may quote a Vietnamese name)
      if (filmVietnamese(p.meta) || (!p.meta?.language?.id && isVietnamese(String(b.text ?? "")))) throw err("INVALID", "Kokoro has no Vietnamese voice: choose ElevenLabs or upload a recording");
    }
    return { provider, key, local };
  }
  const sampleFile = (p, hash) => join(p.path, ".moworks", "cache", "voice-samples", `${hash}.mp3`);

  /** The transcript saved as HyperFrames' transcript.json and the voice-over put on the timeline (a talking-head clip's own sound stays in
   *  its video); byOwner: the user's corrected words (the transcript dialog's resend). Resolves the number of words. */
  async function saveTranscript(p, segments, { byOwner = false } = {}) {
    const out = await transcript.save(p.path, segments, { workDir: workDir(p, "asr") });
    meta(p.id, (m) => { m.voice = { ...(m.voice ?? {}), transcript: { ...(m.voice?.transcript ?? {}), status: "saved", savedAt: out.transcript.savedAt, segments: out.transcript.segments.length, by: byOwner ? "owner" : "app" } };
      (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Transcript saved (${out.hf.words} words in transcript.json${byOwner ? ", corrected by the owner" : ""})` }); });
    const v = projects.getProject(p.id, root)?.meta?.voice;
    if (v?.file && !v.from && !v.offTimeline) { try { placeTrack(p.path, { kind: "voice", src: v.file, duration: Number(v.info?.duration) || 1 }); } catch { /* an index.html Studio cannot read stays as it is */ } }
    await levelTracks(p.path, { root }).catch(() => null);          // the words known: the voice at its level, the music ducked under them
    await commit(p, "Transcript saved");
    return out.hf.words;
  }

  /** Another voice than the one Version 1 was timed to, put in by the owner (the Voice screen's Create voice-over or an upload there, as Assets'
   *  Use as the film's voice-over): recorded, so Claude is not started to re-time the film and the Review looks for the picture off it (owner #920;
   *  T38-5: a voice made on the Voice screen after Version 1 started a Claude turn). { replaced } to keep in m.voice, or {}. */
  const swapOf = (m, rel) => (m.pipeline?.version1?.at && m.voice?.file && m.voice.file !== rel ? { replaced: { at: new Date().toISOString(), from: m.voice.file, afterVersion1: true } }
    : m.voice?.replaced ? { replaced: m.voice.replaced } : {});          // still not the voice Version 1 was timed to
  /** The project's voice-over is now this file: recorded in the project, committed, and transcribed at once. Resolves once committed
   *  (the transcription's files go in a later revision of their own). */
  async function useVoice(p, dest, info, { source = "upload", size = 0, from = null } = {}) {
    const rel = relativeTo(p.path, dest);
    meta(p.id, (m) => { const was = swapOf(m, rel); m.voice = { source, file: rel, name: basename(dest), size, info, addedAt: new Date().toISOString(), transcript: { status: "pending" }, ...(from ? { from } : {}), ...was };
      (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Voice-over added: ${basename(dest)}` }); });
    await commit(p, `Voice-over added: ${basename(dest)}`);
    let job = null, needsModel = null;
    try { job = startTranscribe(projects.getProject(p.id, root)); } catch (e) { needsModel = e.message; }
    return { voice: voiceOf(p), job, needsModel };
  }

  const routes = [
    // ---- the project's voice-over
    r("GET", `/projects/${P}/voice`, ([id]) => {
      const p = mustProject(id, root);
      const t = transcript.read(p.path);
      return { voice: p.meta?.voice ?? null, hints: hintsFor(p), transcript: t, hfTranscript: existsSync(join(p.path, "transcript.json")), settings: asr.voiceSettings(root),
        models: asr.models(root).map(({ id: mid, short, installed, runtime, isDefault, languages }) => ({ id: mid, short, installed, ready: installed && runtime.ok, isDefault, languages })),
        keys: secrets.status(root), jobs: jobs.list({ projectId: id }).filter((j) => ["transcribe", "tts"].includes(j.kind)).slice(0, 3),
        // the free voice: on this computer or not, its download, and whether this film can use it (it has no Vietnamese)
        kokoro: { installed: kokoro.packStatus(root).installed, mb: kokoro.PACK.mb, blocked: filmVietnamese(p.meta) },
        scriptDraft: scriptDraft(p.path),          // the words Claude wrote to read, for the Script box ({ text, from } or null)
        // the owner's own script in the brief and the lines of it the words to read leave out (Test 24: 9 of 12 went in)
        ownScript: (() => { const lines = briefScript(p.meta?.brief?.text); return lines.length >= 2 ? { text: lines.join("\n"), leftOut: scriptGap(p.path, p.meta?.brief?.text)?.left.length ?? 0 } : null; })() };
    }),
    r("PATCH", `/projects/${P}/voice`, ([id], b) => {
      mustProject(id, root);
      const source = ["upload", "elevenlabs", "kokoro", "none"].includes(b.source) ? b.source : null;
      if (!source) throw err("INVALID", "Unknown voice-over source");
      // the user's own "No voice-over" (noVoice, never a source a new project starts with) lets the Storyboard go on without one
      const out = meta(id, (m) => { const { noVoice, ...v } = m.voice ?? {}; m.voice = { ...v, source, ...(source === "none" ? { file: null, noVoice: { at: new Date().toISOString() } } : {}) }; }).meta.voice;
      if (source === "none") { try { ctx.autopilot?.advance?.(id)?.catch?.(() => {}); } catch { /* the user can go on */ } }          // the Storyboard stops waiting
      return out;
    }),
    r("GET", `/projects/${P}/voice/peaks`, async ([id]) => {
      const p = mustProject(id, root);
      const f = audioPath(p);
      if (!f || !existsSync(f)) return { peaks: [] };
      const cache = workDir(p, "voice-peaks.json");
      const c = readJson(cache, null);
      const st = statSync(f);
      if (c && c.file === f && c.mtime === st.mtimeMs) return { peaks: c.peaks };
      const pk = await peaks(f, 600, root);
      writeJson(cache, { file: f, mtime: st.mtimeMs, peaks: pk });
      return { peaks: pk };
    }),
    r("POST", `/projects/${P}/voice/transcribe`, ([id], b) => startTranscribe(mustProject(id, root), { model: b.model, language: b.language, hints: b.hints })),
    r("PUT", `/projects/${P}/voice/transcript`, async ([id], b) => {
      const p = mustProject(id, root);
      if (ctx.renders?.isRendering(id)) throw err("RENDERING", "The film is being rendered: wait until the render finishes");
      const words = await saveTranscript(p, b.segments, { byOwner: true });
      note(p, { kind: "voice", text: "Transcript saved: {n} words, the film can be timed to it", vars: { n: words } });
      // the film is built already: Claude reads the corrected words and moves what was timed to them
      let retime = null;
      if (p.meta?.pipeline?.ran?.build && !ctx.agent?.running?.has(id)) {
        retime = await ctx.agent.start(id, { scope: { kind: "project" }, by: "app", text: "The owner corrected the voice-over's words (transcript.json). Read them and move what is timed to them (shot starts, captions, kinetic text) to the new times; change nothing else. Say in one line what moved." })
          .then((t) => t.id).catch(() => null);
      } else if (!p.meta?.pipeline?.ran?.build) { try { ctx.autopilot?.transcriptLanded?.(id)?.catch?.(() => {}); } catch { /* the user can go on */ } }
      return { transcript: transcript.read(p.path), words, retime };
    }),
    // a voice on the script's first lines, to hear it before paying for the whole take (only on the user's click; the same words, voice and settings are never paid for twice)
    r("POST", `/projects/${P}/voice/tts/sample`, async ([id], b) => {
      const p = mustProject(id, root);
      const { provider, key } = readingAsked(p, b);
      const text = firstLines(b.text);
      if (!text) throw err("INVALID", "Write the script to be read");
      const settings = voiceSettings(provider, b.settings ?? null);
      const model = provider === "elevenlabs" ? pickModel(await retryOnce(() => PROVIDERS.elevenlabs.models(key)), { text, asked: b.model ?? null, lang: p.meta?.language?.id ?? null }) : b.model ?? null;
      if (provider === "elevenlabs" && !model) throw err("INVALID", "This ElevenLabs account has no model that reads Vietnamese");
      const sample = createHash("sha256").update(JSON.stringify([provider, b.voiceId, model, settings, text])).digest("hex").slice(0, 24), out = sampleFile(p, sample);
      if (existsSync(out)) return { sample, chars: text.length, again: true };
      mkdirSync(dirname(out), { recursive: true });
      try { await PROVIDERS[provider].generate(key, { voiceId: b.voiceId, model: model ?? undefined, text, out, settings, lang: p.meta?.language?.id ?? null, root }); }
      catch (e) { rmSync(out, { force: true }); throw e; }
      return { sample, chars: text.length };
    }),
    r("POST", `/projects/${P}/voice/tts`, ([id], b) => {
      const p = mustProject(id, root);
      const { provider, key, local } = readingAsked(p, b);
      const text = String(b.text ?? "").normalize("NFC").trim();
      if (!text) throw err("INVALID", "Write the script to be read");
      if (text.length > 20000) throw err("INVALID", "The script is too long for one request (20,000 characters)");
      // only what the user set on the Voice screen (none: the service's defaults); `speed` alone is the older shape
      const settings = voiceSettings(provider, b.settings ?? (b.speed != null ? { speed: b.speed } : null));
      // Test 24: the first voice-over failed while the computer was loaded (the server did not answer for about 30 s) and the step went
      // quietly back to "make the voice-over", with nothing in the Voice box or the chat. A failure that may pass is tried once more; one
      // that stays is said in both, kept on the voice (ttsFailed: the Voice box and the Pipeline say it), and the step says so too
      const title = PROVIDERS[provider].title;
      meta(id, (m) => { if (m.voice?.ttsFailed) delete m.voice.ttsFailed; });
      return jobs.start("tts", { projectId: id, title: `Voice-over from ${title}` }, async (job) => {
        job.update({ stage: "generating" });
        const out = join(p.path, "assets", "3_audio", "voiceover", `${provider}-${new Date().toISOString().replace(/[:.]/g, "-")}.mp3`);
        rememberAssets(p.path, [relativeTo(p.path, out)]);          // the app's own file, before it is written: never one "the user added" (T22-2)
        const again =(what) => (e) => job.log(`${what} failed, trying once more: ${plainMessage(e)}`);
        let model = b.model ?? null, made = null;
        try {
          // Vietnamese text is read by a model that reads Vietnamese, never eleven_multilingual_v2 by default
          if (provider === "elevenlabs") {
            model = pickModel(await retryOnce(() => PROVIDERS.elevenlabs.models(key), { signal: job.signal, onRetry: again("the model list") }), { text, asked: model, lang: p.meta?.language?.id ?? null });
            if (!model) throw err("INVALID", "This ElevenLabs account has no model that reads Vietnamese");
            job.update({ model });
          }
          made = await retryOnce(() => PROVIDERS[provider].generate(key, { voiceId: b.voiceId, model: model ?? undefined, text, out, signal: job.signal, settings, lang: p.meta?.language?.id ?? null, root,
            onProgress: ({ part }) => job.update({ progress: Math.floor(part * 100) }) }),
            { signal: job.signal, onRetry: again("reading the script") });
        } catch (e) {
          rmSync(out, { force: true });          // no half-written file left behind
          if (e.detail) job.log(String(e.detail));
          if (!job.signal.aborted) {
            const said = ttsFailedText({ message: plainMessage(e) }, title);
            meta(id, (m) => { m.voice = { ...(m.voice ?? {}), ttsFailed: { at: new Date().toISOString(), message: said } }; });
            note(p, { kind: "voice", status: "error", text: said });
            try { ctx.autopilot?.advance?.(id)?.catch?.(() => {}); } catch { /* the Pipeline says it on its next read */ }
          }
          throw e;
        }
        const info = await probe(out, root);
        const rel = relativeTo(p.path, out);
        transcript.saveAlignment(p.path, rel, made?.alignment ?? null);
        meta(id, (m) => { const was = swapOf(m, rel); m.voice = { source: provider, file: rel, name: basename(out), size: statSync(out).size, info, voiceId: b.voiceId ?? null, voiceName: b.voiceName ?? null,
          model: model ?? null, settings, script: text, addedAt: new Date().toISOString(), transcript: { status: "pending" }, ...was };
          (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "voice", text: `Voice-over generated with ${PROVIDERS[provider].title}` }); });
        await commit(p, `Voice-over generated (${PROVIDERS[provider].title})`);
        let next = null; try { next = startTranscribe(projects.getProject(id, root)).id; } catch (e) { job.log(`transcription not started: ${e.message}`); }
        return { file: rel, duration: info.duration, transcribeJob: next };
      });
    }),
  ];
  return { routes, voiceOf, audioPath, sampleFile, useVoice, startTranscribe };
}

// The film's sound mixed again onto a picture already rendered, so an audio-only change re-mixes onto the
// existing picture. Child process (client.mjs remixAudio): HyperFrames' own pieces, as its render runs them: collectRenderMedia on the
// root page (where the Final Mix places every track; the caller sends a film with sound inside a sub-composition to a full render),
// processCompositionAudio with the page's master chain and the engine's config, the mix padded or trimmed to the picture's length as HF's
// assemble does (its AAC, 192k), and muxVideoWithAudio onto the picture's own video stream (copied, never re-encoded). The app's loudness
// master runs after, as for every export.
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const send = (m) => process.send?.({ t: Date.now(), ...m });
const ac = new AbortController();

process.on("message", async (msg) => {
  if (msg?.type === "cancel") { ac.abort(); return; }
  if (msg?.type !== "start") return;
  try { send({ type: "done", ...(await remix(msg)) }); } catch (e) { send({ type: ac.signal.aborted ? "cancelled" : "failed", message: String(e?.message ?? e).slice(0, 600) }); process.exitCode = 2; }
  if (process.send) process.send({ type: "bye" }, () => process.disconnect?.()); else process.disconnect?.();
});

const ff = (ffmpeg, args) => run(ffmpeg, ["-v", "error", "-y", ...args], { windowsHide: true, timeout: 300000, maxBuffer: 1 << 26 });
/** The picture's length as HF measures it for its sound: its frame count over its rate. */
async function pictureSeconds(ffmpeg, video, fps, fallback) {
  const probe = join(dirname(ffmpeg), "ffprobe.exe");
  try {
    const { stdout } = await run(probe, ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", video], { windowsHide: true, timeout: 120000 });
    const n = Number(String(stdout).trim());
    return n > 0 ? n / fps : fallback;
  } catch { return fallback; }
}
const secondsOf = async (ffmpeg, file) => {
  const { stdout } = await run(join(dirname(ffmpeg), "ffprobe.exe"), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { windowsHide: true, timeout: 60000 });
  return Number(String(stdout).trim());
};
const truePeak = async (ffmpeg, file) => {
  const r = await run(ffmpeg, ["-hide_banner", "-i", file, "-map", "0:a:0", "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { windowsHide: true, timeout: 300000, maxBuffer: 1 << 26 });
  const m = [...String(r.stderr).matchAll(/^\s*Peak:\s*([+-]?(?:[\d.]+|inf)) dBFS$/gim)].at(-1)?.[1]?.toLowerCase();
  return m === "-inf" ? -Infinity : Number(m);
};
/** HF's assemble for the sound (producer, padOrTrimAudioToVideoFrameCount at the pinned version): the mix copied, padded or trimmed to the picture's
 *  length (AAC 192k), then its true peak brought under -1 dBFS with 0.5 dB to spare, at most 3 passes. Returns the dB it was lowered by. */
async function padTrimAndPeak(ffmpeg, mixed, out, target, workDir) {
  const src = await secondsOf(ffmpeg, mixed), t = target.toFixed(6);
  if (Math.abs(target - src) < 1e-3) await ff(ffmpeg, ["-i", mixed, "-c:a", "copy", out]);
  else if (target > src) await ff(ffmpeg, ["-i", mixed, "-af", `apad,atrim=0:${t}`, "-t", t, "-c:a", "aac", "-b:a", "192k", out]);
  else await ff(ffmpeg, ["-i", mixed, "-af", `atrim=duration=${t},asetpts=PTS-STARTPTS`, "-t", t, "-c:a", "aac", "-b:a", "192k", out]);
  const CEILING = -1, HEADROOM = 0.5, PASSES = 3, fixed = join(workDir, "audio.true-peak.m4a");
  let attenuation = 0, measured = out;
  for (let pass = 0; pass <= PASSES; pass++) {
    const peak = await truePeak(ffmpeg, measured);
    if (Number.isNaN(peak) || peak === Infinity) throw new Error("FFmpeg reported an invalid true peak");
    if (peak <= CEILING) { if (measured !== out) renameSync(fixed, out); return Number((-attenuation).toFixed(2)); }
    if (pass === PASSES) break;
    attenuation += CEILING - HEADROOM - peak;
    await ff(ffmpeg, ["-i", out, "-map", "0:a:0", "-vn", "-af", `volume=${attenuation.toFixed(3)}dB`, "-t", t, "-c:a", "aac", "-b:a", "192k", fixed]);
    measured = fixed;
  }
  throw new Error("the sound's true peak could not be brought under -1 dBFS");
}

async function remix({ runtimeDir, ffmpeg, projectDir, picture, out, fps, duration, workDir }) {
  const mod = (p) => import(pathToFileURL(join(runtimeDir, "node_modules", "@hyperframes", p, "dist", "index.js")).href);
  const [producer, engine] = await Promise.all([mod("producer"), mod("engine")]);
  rmSync(workDir, { recursive: true, force: true }); mkdirSync(workDir, { recursive: true });
  try {
    const html = readFileSync(join(projectDir, "index.html"), "utf8");
    const { audios } = producer.collectRenderMedia(html);
    const cfg = engine.resolveConfig();
    const videoOnly = join(workDir, "picture.mp4");
    await run(ffmpeg, ["-v", "error", "-y", "-i", picture, "-map", "0:v:0", "-c:v", "copy", "-an", videoOnly], { windowsHide: true, timeout: 300000 });
    if (!audios.length) {          // a silent film: the picture alone, as HF writes it
      const r = await engine.applyFaststart(videoOnly, out, ac.signal, { ffmpegProcessTimeout: cfg.ffmpegProcessTimeout }, { num: fps, den: 1 });
      if (!r.success) throw new Error(r.error ?? "faststart failed");
      return { tracks: 0 };
    }
    const mixed = join(workDir, engine.MIXED_AUDIO_FILENAME);
    const mix = await engine.processCompositionAudio(audios, projectDir, join(workDir, "audio-work"), mixed, duration, ac.signal,
      { ffmpegProcessTimeout: cfg.ffmpegProcessTimeout, audioGain: cfg.audioGain, masterFxChain: engine.parseMasterFxChain(html) }, projectDir);
    if (!mix.success) throw new Error(mix.error ?? "the sound could not be mixed");
    const sized = join(workDir, "audio.duration-normalized.m4a");
    const loweredDb = await padTrimAndPeak(ffmpeg, mixed, sized, await pictureSeconds(ffmpeg, videoOnly, fps, duration), workDir);
    const m = await engine.muxVideoWithAudio(videoOnly, sized, out, ac.signal, { audioCodec: "aac", ffmpegProcessTimeout: cfg.ffmpegProcessTimeout }, { num: fps, den: 1 });
    if (!m.success) throw new Error(m.error ?? "the sound could not be put on the picture");
    return { tracks: audios.length, loweredDb, warning: mix.error ?? null };
  } finally { rmSync(workDir, { recursive: true, force: true }); }
}


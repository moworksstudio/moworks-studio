// Stable error and warning codes for Moworks Studio, derived from HyperFrames error classes and warning codes
// (never from job.failedStage, which is free text).

const WARNING_CODES = {
  sub_timeline_script_failure: "SCRIPT_ERROR",
  sub_timeline_readiness_timeout: "TIMELINE_NOT_REGISTERED",
  media_load_failed: "MEDIA_LOAD_FAILED",
  audio_processing_failed: "AUDIO_FAILED",
  vfx_failure: "VFX_FAILED",
};

/** What each of HyperFrames' render warnings means, in a few plain words for the chat (never its code or a file's path). */
const WARNING_WORDS = {
  MEDIA_LOAD_FAILED: "a video or picture did not load",
  AUDIO_FAILED: "part of the sound could not be made",
  SCRIPT_ERROR: "a scene's code had an error",
  TIMELINE_NOT_REGISTERED: "a scene was not ready in time",
  VFX_FAILED: "an effect could not be drawn",
};
/** The chat's yellow line for a render HyperFrames finished with warnings (audit/112b b1.2, owner Q-b1: "có hiện cảnh báo, nội dung thông
 *  báo ngắn gọn"): the render stands, the line says what to watch. null when there were none. */
export function renderWarningNote(warnings) {
  const what = [...new Set((warnings ?? []).map((w) => WARNING_WORDS[w?.code] ?? "HyperFrames reported a problem"))];
  if (!what.length) return null;
  return { kind: "render", status: "warning", text: "The render finished with a problem: {what}. Watch those parts before you send the film.", vars: { what: what.join("; ") } };
}

export function warningCode(hfCode) {
  return WARNING_CODES[hfCode] ?? `HF_WARNING:${hfCode}`;
}

/** Map a thrown error (+ the job's warnings) to { code, retryable, message, hf }. */
export function classify(err, warnings = []) {
  const name = err?.name ?? "";
  const msg = String(err?.message ?? err ?? "");
  const hf = { name, warnings: warnings.map((w) => w.code ?? w) };
  if (name === "RenderCancelledError" || /render_cancelled|request_aborted/.test(msg)) return { code: "CANCELLED", retryable: true, message: msg, hf };
  if (name === "RenderQualityError") {
    const first = hf.warnings[0];
    return { code: first ? warningCode(first) : "QUALITY_BLOCKED", retryable: false, message: msg, hf };
  }
  if (/spawn ffmpeg ENOENT|spawn ffprobe ENOENT|FFmpeg not found|(FFmpeg|ffprobe) binary not found/i.test(msg)) return { code: "FFMPEG_MISSING", retryable: false, message: msg, hf };
  if (/Render request .* must|Invalid render request|positive rational/i.test(msg)) return { code: "INVALID_REQUEST", retryable: false, message: msg, hf };
  if (/Failed to launch the browser|Browser was not found|Could not find Chrome/i.test(msg)) return { code: "BROWSER_MISSING", retryable: false, message: msg, hf };
  if (/Target closed|Page crashed|Protocol error|Navigation timeout/i.test(msg)) return { code: "BROWSER_FAILED", retryable: true, message: msg, hf };
  if (/ENOENT|no such file/i.test(msg)) return { code: "FILE_MISSING", retryable: false, message: msg, hf };
  return { code: "UNKNOWN", retryable: false, message: msg, hf };
}

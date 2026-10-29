// Stable error and warning codes for Moworks Studio, derived from HyperFrames error classes and warning codes
// (never from job.failedStage, which is free text).

const WARNING_CODES = {
  sub_timeline_script_failure: "SCRIPT_ERROR",
  sub_timeline_readiness_timeout: "TIMELINE_NOT_REGISTERED",
  media_load_failed: "MEDIA_LOAD_FAILED",
  audio_processing_failed: "AUDIO_FAILED",
  vfx_failure: "VFX_FAILED",
};

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

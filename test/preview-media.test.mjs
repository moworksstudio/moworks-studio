// every library preview at the cards' size (640 px, 24 fps, H.264 CRF 30, no sound, WebP poster), originals kept aside.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegExe, PREVIEW, recodePreview, tidyStore } from "../packages/library/preview-media.mjs";

const probe = (f) => execFileSync(ffmpegExe().replace(/ffmpeg\.exe$/, "ffprobe.exe"), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "csv=p=0", f], { encoding: "utf8", windowsHide: true }).trim();
const audio = (f) => execFileSync(ffmpegExe().replace(/ffmpeg\.exe$/, "ffprobe.exe"), ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", f], { encoding: "utf8", windowsHide: true }).trim();

test("recodePreview: a 1280 px 30 fps clip with sound and a PNG poster become 640 px 24 fps silent H.264 and a WebP; the originals stay aside", { timeout: 60000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-d40-"));
  try {
    mkdirSync(join(dir, "previews"));
    const v = join(dir, "previews", "x.mp4"), p = join(dir, "previews", "x.png");
    execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=2", "-f", "lavfi", "-i", "sine=duration=2", "-c:v", "libx264", "-c:a", "aac", "-shortest", v], { windowsHide: true });
    execFileSync(ffmpegExe(), ["-v", "error", "-y", "-i", v, "-frames:v", "1", p], { windowsHide: true });
    const r = await recodePreview(dir, { source: "rendered", video: "previews/x.mp4", poster: "previews/x.png" }, { seconds: 2 });
    assert.equal(r.preview.poster, "previews/x.webp");
    assert.equal(r.preview.encode, PREVIEW.label);
    assert.equal(probe(v), "640,360,24/1");
    assert.equal(audio(v), "", "no sound");
    assert.equal(readFileSync(join(dir, "previews", "x.webp")).subarray(8, 12).toString(), "WEBP");
    assert.ok(existsSync(join(dir, "previews-original", "x.mp4")) && existsSync(join(dir, "previews-original", "x.png")), "originals kept");
    assert.ok(existsSync(p), "the old poster stays until tidyStore, so a running app keeps its paths");
    const size = statSync(v).size, again = await recodePreview(dir, r.preview, { seconds: 2 });
    assert.equal(probe(v), "640,360,24/1");
    assert.ok(Math.abs(statSync(v).size - size) < 64, "a second run encodes from the kept original, not from the copy");
    assert.equal(again.preview.poster, "previews/x.webp");
    assert.deepEqual(tidyStore(dir, [again.preview.video, again.preview.poster]).removed, 1);
    assert.ok(!existsSync(p) && existsSync(join(dir, "previews", "x.webp")));
    assert.equal(await recodePreview(dir, { ...again.preview, video: null }), null, "a D40 poster with no kept video is left alone");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("recodePreview: a failed encode leaves the preview as it was", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-d40-"));
  try {
    mkdirSync(join(dir, "previews"));
    const v = join(dir, "previews", "bad.mp4");
    execFileSync(process.execPath, ["-e", `require("fs").writeFileSync(${JSON.stringify(v)}, "not a video")`], { windowsHide: true });
    await assert.rejects(recodePreview(dir, { video: "previews/bad.mp4", poster: null }));
    assert.equal(readFileSync(v, "utf8"), "not a video");
    assert.ok(!existsSync(v + ".part.mp4"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

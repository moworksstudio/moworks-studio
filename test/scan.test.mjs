// the app's scan of the user's files: numbered pictures become one sequence with a sheet, an archive lists its
// files, music gets its tempo (librosa), a Photoshop file its frames and texts; the index Claude reads names every file. Tiny inputs are made
// here; demo material kept outside the repository is for manual runs.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanAssets, sequences } from "../packages/project-service/scan.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";
import { pythonExe, status } from "../packages/setup/python.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-scan-"));
after(() => rmSync(T, { recursive: true, force: true }));
const py = pythonExe();
const ready = py && status().ready;

test("the scan: a numbered sequence, an archive, music tempo, a Photoshop file; INDEX.md names them all", { timeout: 240000, skip: !ready && "the app's Python components are not installed" }, async () => {
  const d = join(T, "p");
  for (const sub of ["assets/images/frames", "assets/audio", "sources"]) mkdirSync(join(d, ...sub.split("/")), { recursive: true });
  for (let i = 1; i <= 6; i++) execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=0x${(i * 30).toString(16).padStart(2, "0")}4060:s=160x90`, "-frames:v", "1", join(d, "assets", "images", "frames", `${String(i).padStart(3, "0")}.png`)], { windowsHide: true });
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=220:duration=8:beep_factor=4", join(d, "assets", "audio", "beat.wav")], { windowsHide: true });
  spawnSync(py, ["-c", `import zipfile; z = zipfile.ZipFile(r"${join(d, "sources", "pack.zip")}", "w"); z.writestr("logo.ai", "x"); z.writestr("Readme.txt", "y"); z.close()`], { windowsHide: true });
  // a two-group PSD with psd-tools (pixel layers only)
  spawnSync(py, ["-c", `from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer, Group
from PIL import Image
psd = PSDImage.new("RGB", (320, 180), color=(240, 240, 240))
for n, c in (("F1", (200, 60, 40, 255)), ("F2", (40, 80, 200, 255))):
    g = Group.new(psd, n, False); g.append(PixelLayer.frompil(Image.new("RGBA", (100, 60), c), psd, n + " box", 40, 40))
psd.save(r"${join(d, "sources", "key.psd")}")`], { windowsHide: true });
  const r = await scanAssets(d, { words: false });
  assert.equal(r.sequences.length, 1);
  assert.equal(r.sequences[0].count, 6);
  assert.ok(existsSync(join(d, ...r.sequences[0].sheet.split("/"))));
  const zip = r.items.find((x) => x.path === "sources/pack.zip");
  assert.equal(zip.entries, 2);
  const music = r.items.find((x) => x.path === "assets/audio/beat.wav");
  assert.ok(music.bpm > 0, JSON.stringify(music));
  const psd = r.items.find((x) => x.path === "sources/key.psd");
  assert.equal(psd.frames, 2, JSON.stringify(psd));
  assert.ok(existsSync(join(d, ...psd.md.split("/"))));
  const index = readFileSync(join(d, ".moworks", "scan", "INDEX.md"), "utf8");
  assert.match(index, /assets\/images\/frames\/: 6 numbered pictures/);
  assert.match(index, /sources\/pack\.zip: archive of 2 file\(s\)/);
  assert.match(index, /beat\.wav: audio, 8 s, about [\d.]+ BPM/);
  assert.match(index, /sources\/key\.psd: Photoshop file 320x180, 2 top-level group frame\(s\)/);
  assert.ok(!/frames\/001\.png: picture/.test(index), "the sequence's members are not listed one by one");
  assert.equal((await scanAssets(d, { words: false })).changed, 0, "nothing changed: nothing read again");
});

test("five loose pictures 1.png … 5.png are pictures; a sequence is numbered with padding (frame_001) or 12 and more", () => {
  const pics = (names) => names.map((n) => ({ kind: "image", path: `assets/1_design/images/${n}` }));
  assert.equal(sequences(pics(["1.png", "2.png", "3.png", "4.png", "5.png"])).length, 0);
  assert.equal(sequences(pics(["frame_001.png", "frame_002.png", "frame_003.png", "frame_004.png", "frame_005.png"])).length, 1);
  assert.equal(sequences(pics(Array.from({ length: 12 }, (_, i) => `${i + 1}.png`))).length, 1);
});

test("a song is not read for words unless the film is set to its lyrics (Whisper is not run on it)", { timeout: 240000, skip: !ready && "the app's Python components are not installed" }, async () => {
  const d = join(T, "song");
  mkdirSync(join(d, "assets", "3_audio", "music"), { recursive: true });
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=330:duration=6:beep_factor=4", join(d, "assets", "3_audio", "music", "song.wav")], { windowsHide: true });
  const r = await scanAssets(d, { words: true });
  const song = r.items.find((x) => x.path.endsWith("song.wav"));
  assert.ok(String(song.wordsNote).includes("its words are not read (the app reads speech, not singing)"), JSON.stringify(song));
  assert.equal(song.words, undefined);
});

test("song mode: Whisper's stock lines dropped, overlapping windows merged, lines split on pauses (a stand-in model, no download)", { skip: !py && "no Python" }, () => {
  // the stand-in hears a stock "subscribe…" line in the filtered pass and the same sung words in two overlapping windows
  const code = String.raw`
import sys, json, types
sys.path.insert(0, sys.argv[1])
import numpy as np
import whisper_transcribe as w
W = lambda t, s, e, p=0.9: types.SimpleNamespace(word=" " + t, start=s, end=e, probability=p)
S = lambda text, words: types.SimpleNamespace(text=text, words=words)
class M:
    calls = 0
    def transcribe(self, audio, language=None, vad_filter=True, **k):
        M.calls += 1
        if vad_filter:
            return [S("Hãy subscribe cho kênh", [W("Hãy", 0, .2), W("subscribe", .2, .6)])], types.SimpleNamespace(language="vi", language_probability=.9, duration=12.0)
        if M.calls == 2:
            return [S("gặp mở", [W("gặp", 1.0, 1.3), W("mở", 1.3, 1.6, .2)])], None
        if M.calls == 3:
            return [S("gặp mở nào", [W("gặp", -2.95, -2.7), W("mở", -2.7, -2.4), W("nào", 1.0, 1.3)])], None
        return [], None
out = []
w.emit = lambda o: out.append(o)
w.sung(M(), "cpu", np.zeros(16000 * 12, dtype=np.float32), "vi")
print(json.dumps(out, ensure_ascii=False))`;
  const r = spawnSync(py, ["-I", "-c", code, join(import.meta.dirname, "..", "tools", "asr")], { encoding: "utf8", windowsHide: true, env: { ...process.env, PYTHONUTF8: "1" } });
  assert.equal(r.status, 0, r.stderr);
  const ev = JSON.parse(r.stdout.trim().split("\n").at(-1));
  const segs = ev.filter((e) => e.type === "segment");
  assert.equal(ev[0].type, "info");
  assert.ok(!segs.some((s) => /subscribe/i.test(s.text)), "the stock line is gone");
  assert.deepEqual(segs.map((s) => s.text), ["gặp mở", "nào"], "the word heard twice is kept once; an unsure word is dropped; a pause over 1 s starts a line");
  assert.equal(ev.at(-1).type, "done");
});

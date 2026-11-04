// time-voice.mjs: turn a voice take into the film's narration (audio/vo.wav) and the word times every cut, label and
// sound is keyed to (story/words.json + story/words.js).
//   node tools/time-voice.mjs <video dir> [--take <file>]
// The take is one continuous, dry read of story/script.txt, word for word (any format ffmpeg reads; default
// <video>/audio/takes/take.wav). Steps:
//   1. clean (ffmpeg): rumble cut at 60 Hz, a gentle presence lift around 3 kHz, light compression, 48 kHz mono
//      24-bit, peak at -3 dBFS → audio/takes/<take>_clean.wav
//   2. transcribe the clean take (HyperFrames, medium.en) and compare it with the script word for word;
//      any dropped, added or changed word stops here with the list
//   3. reset the pauses inside measured silences only (tools/voice/build_vo_silence.py) → audio/vo.wav
//   4. transcribe vo.wav and give every script word its time (tools/voice/align_whisper_islands.py)
//      → story/words.json + story/words.js
//   5. check the word count, then print the speech length and a suggested film length
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, FFMPEG, UV, args, fail, filmOf, hfCapture, probe, videoDirOf, wordDiff, diffLines } from "./lib.mjs";

const USAGE = "usage: node tools/time-voice.mjs <video dir> [--take <file>]";
const a = args(process.argv.slice(2));
const dir = videoDirOf(a._[0], USAGE);
const rel = (p) => {
  const r = path.relative(ROOT, p);
  return r.startsWith("..") || path.isAbsolute(r) ? p : r || ".";
};
const ffmpeg = FFMPEG();
const env = { ...process.env, FFMPEG: ffmpeg };

/** a kit Python tool through uv, with the pinned packages (the same call as tools/py.mjs) */
const py = (script, pyArgs, capture = false) => {
  const r = spawnSync(
    UV(),
    ["run", "--quiet", "--no-project", "--python", "3.12", "--with-requirements", path.join(ROOT, "tools/audio/requirements.txt"), "python", path.join(ROOT, script), ...pyArgs],
    { cwd: ROOT, env, encoding: "utf8", stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit" },
  );
  if (r.status !== 0) fail(`${path.basename(script)} failed (exit ${r.status}); see the lines above`);
  return r.stdout || "";
};

const ff = (ffArgs) => {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-nostats", ...ffArgs], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) fail(`ffmpeg failed: ${(r.stderr || "").trim().split("\n").slice(-3).join(" | ")}`);
  return r.stderr || "";
};

/** HyperFrames transcribe → path of transcript.json ([{ text, start, end }]) */
const transcribe = (wav, label) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "time-voice-"));
  console.log(`· transcribing ${label} (the first run downloads the speech model; this can take a few minutes)`);
  const r = hfCapture(dir, ["transcribe", wav, "-d", out, "--json", "-m", "medium.en"]);
  const last = (r.stdout || "").trim().split("\n").filter((l) => l.startsWith("{")).pop();
  let res = {};
  try {
    res = JSON.parse(last || "{}");
  } catch {}
  const tx = path.join(out, "transcript.json");
  if (r.status !== 0 || !res.ok || !fs.existsSync(tx)) {
    const why = res.reason || (r.stderr || "").trim().split("\n").slice(-2).join(" | ") || `exit ${r.status}`;
    if (/whisper_unavailable/.test(why))
      fail(`transcription is unavailable (${why}). Install the speech model once (ask the user first), then retry:\n    npm run speech`);
    fail(`transcription failed: ${why}`);
  }
  console.log(`  ${res.engine || "asr"} ${res.model || ""}: ${res.wordCount ?? "?"} words`);
  return tx;
};
const heardText = (tx) => JSON.parse(fs.readFileSync(tx, "utf8")).map((w) => w.text ?? w.word ?? "").join(" ");

// ---------- inputs
const script = path.join(dir, "story/script.txt");
if (!fs.existsSync(script)) fail(`${rel(script)} is missing: write the approved script there first, word for word`);
const takes = path.join(dir, "audio/takes");
let take = a.take ? [path.resolve(a.take), path.resolve(ROOT, a.take), path.resolve(dir, a.take)].find((p) => fs.existsSync(p)) : path.join(takes, "take.wav");
if (a.take && !take) fail(`no such take: ${a.take}`);
if (!a.take && !fs.existsSync(take)) {
  const found = fs.existsSync(takes) ? fs.readdirSync(takes).filter((f) => /\.(wav|mp3|m4a|aiff?|flac|ogg|aac)$/i.test(f) && !/_clean\.wav$/i.test(f)) : [];
  if (found.length === 1) take = path.join(takes, found[0]);
  else
    fail(
      found.length
        ? `${rel(takes)} holds several takes (${found.join(", ")}): name one with --take <file>`
        : `no take found. Save the read of story/script.txt as ${rel(path.join(takes, "take.wav"))}, or pass --take <file>`,
    );
}
fs.mkdirSync(takes, { recursive: true });
const film = filmOf(dir);
console.log(`time-voice: ${rel(dir)}  take ${take}`);

// ---------- 1. clean
const base = path.basename(take).replace(/\.[^.]+$/, "");
const clean = path.join(takes, `${base}_clean.wav`);
const raw = path.join(os.tmpdir(), `time-voice-${process.pid}-c.wav`);
ff(["-v", "error", "-y", "-i", take, "-af", "highpass=f=60:p=2,highshelf=f=3000:g=2.5:t=s:w=0.5,acompressor=threshold=0.05:ratio=2.5:attack=5:release=80:knee=4", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", raw]);
const peak = Number(ff(["-v", "info", "-i", raw, "-af", "volumedetect", "-f", "null", "-"]).match(/max_volume:\s*(-?[\d.]+|-inf) dB/)?.[1]);
if (!Number.isFinite(peak)) fail(`the take is silent: ${take}`);
const gain = Math.round((-3 - peak) * 100) / 100;
ff(["-v", "error", "-y", "-i", raw, "-af", `volume=${gain}dB`, "-c:a", "pcm_s24le", clean]);
fs.rmSync(raw, { force: true });
console.log(`✓ cleaned → ${rel(clean)} (peak ${peak} dB → -3 dBFS)`);

// ---------- 2. the take against the script
const scriptText = fs.readFileSync(script, "utf8");
const txTake = transcribe(clean, "the take");
fs.copyFileSync(txTake, path.join(takes, `${base}.transcript.json`));
const d1 = wordDiff(scriptText, heardText(txTake));
if (d1.length) {
  console.error(`✗ the take does not match story/script.txt (${d1.length} difference${d1.length > 1 ? "s" : ""}):`);
  console.error(diffLines(d1).join("\n"));
  console.error(
    "  Re-record those lines (a whole new take, or the sentence spliced inside a silence), then run this again.\n" +
      "  If the script itself changed and was approved again, update story/script.txt first.",
  );
  process.exit(1);
}
console.log("✓ the take matches the script word for word");

// ---------- 3. pauses, edited inside silences only
const vo = path.join(dir, "audio/vo.wav");
py("tools/voice/build_vo_silence.py", [clean, txTake, vo]);

// ---------- 4. word times from the final narration
const txVo = transcribe(vo, "audio/vo.wav");
fs.copyFileSync(txVo, path.join(takes, "vo.transcript.json"));
const d2 = wordDiff(scriptText, heardText(txVo));
if (d2.length) console.log(`! the transcript of vo.wav differs from the script in ${d2.length} place(s) (word times there are estimated):\n${diffLines(d2).join("\n")}`);
const wordsJson = path.join(dir, "story/words.json");
py("tools/voice/align_whisper_islands.py", [vo, script, txVo, wordsJson]);
const wj = spawnSync(process.execPath, [path.join(ROOT, "tools/words-js.mjs"), dir], { cwd: ROOT, stdio: "inherit" });
if (wj.status !== 0) fail("words-js.mjs failed");

// ---------- 5. checks and lengths
const words = JSON.parse(fs.readFileSync(wordsJson, "utf8"));
const want = Number(py("tools/voice/align_whisper_islands.py", ["--count", script], true).trim());
if (words.length !== want) fail(`story/words.json has ${words.length} words but the script has ${want}`);
const voLen = probe(vo).duration;
const first = words[0].start, last = words[words.length - 1].end;
const suggest = Math.ceil((last + 0.6 + 4.0) * 10) / 10;
console.log(`✓ ${words.length} words timed (= the script)`);
console.log(`  speech ${first.toFixed(2)}–${last.toFixed(2)} s (${(last - first).toFixed(1)} s, ${(words.length / (last - first)).toFixed(2)} words/s); vo.wav ${voLen ? voLen.toFixed(2) : "?"} s`);
console.log(`  suggested film length ${suggest} s (last word + 0.6 s beat + about 4 s for the title); index.html says ${film.duration} s`);
if (Math.abs(suggest - film.duration) > 0.05) console.log(`  next: node tools/set-duration.mjs ${rel(dir)} ${suggest}`);
if (voLen && voLen > film.duration) console.log(`! vo.wav (${voLen.toFixed(2)} s) is longer than the film (${film.duration} s): the narration would be cut off`);
console.log(`  then: node tools/sound.mjs ${rel(dir)}`);

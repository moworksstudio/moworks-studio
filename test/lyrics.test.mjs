// The app transcribes speech, not singing; the user gives a song's lyrics and tools/asr/align_lyrics.py times them (the
// Moworks Motion kit's align method). A stand-in model hears part of a line; the matching, the placing on attacks and the table are checked
// without a model download. The lyrics text helpers (.srt / .lrc) are checked here too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fromSubtitles, timedMarkdown } from "../packages/voice/lyrics.mjs";
import { pythonExe, status } from "../packages/setup/python.mjs";

const py = pythonExe();

test("lyrics text: .srt cues become [s] line marks, .lrc tags are dropped, plain text stays", () => {
  assert.equal(fromSubtitles("1\n00:01:02,500 --> 00:01:04,000\nMưa mưa rơi\nđèn lên\n"), "[62.50] Mưa mưa rơi\nđèn lên");
  assert.equal(fromSubtitles("[ar: Moworks]\n[00:17.50] Here comes the rain").trim(), "[00:17.50] Here comes the rain");
  assert.equal(fromSubtitles("Đèn lên phố cũ\nHere comes the rain"), "Đèn lên phố cũ\nHere comes the rain");
});

test("the timed table: each line's start, its words and how many were heard", () => {
  const md = timedMarkdown("song.wav", { heard: 2, words: [
    { text: "Đèn", start: 1.2, end: 1.4, line: 1, sure: "heard" }, { text: "lên", start: 1.4, end: 1.6, line: 1, sure: "heard" },
    { text: "Here", start: 62.25, end: 62.5, line: 2, sure: "placed" }] });
  assert.match(md, /Whisper turbo heard 2 of 3 words/);
  assert.match(md, /\| 1 \| 0:01\.20 \| Đèn lên \| 2\/2 \|/);
  assert.match(md, /\| 2 \| 1:02\.25 \| Here \| 0\/1 \|/);
});

test("align_lyrics.py: heard words anchor their line, stock lines are dropped, the rest is placed in order (a stand-in model)", { skip: !(py && status().ready) && "the app's Python components are not installed", timeout: 120000 }, () => {
  const code = String.raw`
import sys, json, types
sys.path.insert(0, sys.argv[1])
import numpy as np
import align_lyrics as al
W = lambda t, s, e: types.SimpleNamespace(word=" " + t, start=s, end=e, probability=0.9)
S = lambda text, words: types.SimpleNamespace(text=text, words=words)
INFO = types.SimpleNamespace(language="vi", language_probability=0.9)
class M:
    def transcribe(self, audio, vad_filter=True, **k):
        if vad_filter:
            return [S("Hãy subscribe cho kênh", [W("Hãy", 0.1, 0.3), W("subscribe", 0.3, 0.8)])], INFO
        n = len(audio) / 16000
        # the window that starts at 4 s hears "đèn lên phố" of line 2 at 6.0-6.9 s (2.0-2.9 s inside the window)
        if abs(n - 8) < 0.01 and k.get("initial_prompt") and M.win == 1:
            M.win += 1
            return [S("đèn lên phố", [W("đèn", 2.0, 2.3), W("lên", 2.3, 2.6), W("phố", 2.6, 2.9)])], INFO
        M.win += 1
        return [], INFO
M.win = 0
y = np.zeros(16000 * 12, dtype=np.float32)
for t in np.arange(0.5, 12, 0.25):            # clicks every quarter second: attacks to place the unheard words on
    i = int(t * 16000); y[i:i + 80] = 0.8
words, info, nlines, dropped = al.align(M(), y, "Mưa mưa mưa rơi\nĐèn lên phố cũ\n", "vi")
print(json.dumps({"words": words, "lines": nlines}, ensure_ascii=False))`;
  const r = spawnSync(py, ["-I", "-c", code, join(import.meta.dirname, "..", "tools", "asr")], { encoding: "utf8", windowsHide: true, env: { ...process.env, PYTHONUTF8: "1" } });
  assert.equal(r.status, 0, r.stderr.slice(-2000));
  const { words, lines } = JSON.parse(r.stdout.trim().split("\n").at(-1));
  assert.equal(lines, 2);
  assert.equal(words.length, 8);
  assert.deepEqual(words.filter((w) => w.sure === "heard").map((w) => w.text), ["Đèn", "lên", "phố"], "the stock line matched nothing; line 2 anchored");
  assert.ok(Math.abs(words[4].start - (6.0 - 0.08)) < 0.01, "a heard word keeps Whisper's time, 80 ms earlier (its lag)");
  assert.ok(words.every((w) => w.start != null && w.end > w.start), "every word has a time");
  assert.ok(words.every((w, i) => i === 0 || w.start > words[i - 1].start), "in order");
  assert.ok(words.slice(0, 4).every((w) => w.start < words[4].start), "line 1 is placed before the heard line 2");
});

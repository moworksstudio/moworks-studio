---
name: voice-over
description: Get the narration for a 2D explainer and time every word — the user's own recording (one dry, continuous take of the approved script, word for word, in a quiet room with no music), a voice made by a connected text-to-speech tool (one whole-script take, WAV 48 kHz, cost shown and approved first), or no narrator — then clean it, tidy pauses only inside measured silences, check it word for word against the script and write the word times with tools/time-voice.mjs. Use when the user drops an MP3/WAV/M4A, says "here's my recording", "voice it", "use my voice tool", "generate the voice-over", "no narrator", "the voice says a word wrong", "re-record", or when a script was just approved.
---

# The voice-over

Every cut, label and sound lands on a spoken word, so the voice comes before the storyboard. The approved script in
`<dir>/story/script.txt` is the yardstick: the voice must say exactly those words.

## Which route
| The user… | Route |
|---|---|
| drops a recording, or says they'll record | **A · their take** |
| has a text-to-speech tool connected (`kit.config.json → voiceGeneration.provider` isn't `"none"`, or you find one among your tools) and wants it used | **B · the voice tool** |
| says "no narrator" | **C · none**: explainer-video → "Without a narrator" |
| asked for a narrated film, but has neither | offer A or B in one line: "Record it yourself (I'll give you the rules), or connect a text-to-speech tool and I'll voice it." |

## A · Their own take
Give these rules when they're about to record (plain words, copy as is):
- Read the approved script **word for word**, in **one continuous take**, start to finish.
- Record **dry**: a quiet room, no music, no background noise, no effects or processing.
- Read **calmly and clearly**, with natural pauses between sentences. Don't rush: the pauses are where the timing is
  tidied.
- WAV is best (48 kHz if the app offers it); MP3 or M4A work too.
- Stumbled? Record the take again from the start.

When the file arrives: copy it untouched to `<dir>/audio/takes/` (keep their name), then run
`node tools/time-voice.mjs <dir> --take <dir>/audio/takes/<file>`. Never rewrite, re-voice, speed up or "fix" their
recording beyond what time-voice does.

## B · A text-to-speech tool (ask before spending)
1. **Find it once.** Look through your tools for text-to-speech: names or descriptions with *speech, tts,
   text_to_speech, generate_audio, voice, narration*. Read the candidate's description and input schema in full.
2. **Let the user pick the voice.** If the tool lists voices, show 2–3 that suit the house voice: **calm, warm,
   unhurried, clear**. Pass on any preview links; you can't listen. Never hard-code a voice ID from anywhere but the
   tool's own list in this session.
3. **Show the cost and wait for a yes.** Preflight the cost if the tool can, and tell the user before generating.
4. **One whole-script take.** Send the approved script exactly, in one request, asking for WAV at 48 kHz if the tool
   offers it. If the tool has a length limit, voice it paragraph by paragraph and join the parts with a short silence
   between them (`ffmpeg -f concat`), then treat the result as one take.
5. Download it to `<dir>/audio/takes/` and run `node tools/time-voice.mjs <dir> --take <that file>`.
6. **Record what worked** in `kit.config.json → voiceGeneration`: `provider`, `tool`, and in `notes` the voice the user
   chose, the format and any settings, so later sessions don't research again.

Only clone a voice the user owns or has permission to use. Never imitate a real, recognisable person.

## Timing the words: `node tools/time-voice.mjs <dir> [--take <file>]`
It runs, in order:
1. A neutral clean: a rumble cut at 60 Hz, a gentle presence lift around 3 kHz, light compression, 48 kHz mono
   24-bit, peak at −3 dBFS (`audio/takes/<take>_clean.wav`).
2. A transcription of the take, then a **word diff against `story/script.txt`**. On any dropped, added or changed word
   it stops and reports them. Don't build on a take that fails.
3. **Pause tidying inside measured silences only** (`build_vo_silence.py`): it edits only runs below −50 dB that last at
   least 0.10 s, so every piece of speech is copied once, in order. Pauses become 0.45–0.85 s after a sentence,
   0.20–0.45 s after a comma, at most 0.25 s elsewhere, with a 0.9 s lead-in and a 0.6 s tail.
4. A second transcription of the tidied `audio/vo.wav`, then word alignment (`align_whisper_islands.py`) into
   `story/words.json` and `story/words.js`. Numbers transcribed as digits are mapped to the script's words.
5. Checks: the number of timed words equals the script's word count. It prints the speech span, the words per second
   and a suggested film length.

Then set the film's length: `node tools/set-duration.mjs <dir> <suggested seconds>`.

**Why it works this way:** cutting a voice on speech-recognition word times (which are off by 0.1–0.4 s) once replayed
audio at the joins, and the delivered film said a phrase twice. Speech recognition also hides repeats, so a clean
transcript of the take proves nothing. Edits happen only inside silences, and `qc.mjs` transcribes the **final MP4**
and diffs it against the script before delivery.

## When it fails
| What time-voice reports | Cause | Fix |
|---|---|---|
| Dropped, added or changed words | the reader (or the voice tool) didn't say the script exactly; generated voices sometimes drop a small word | Route A: record again. Route B: regenerate (ask first; it costs credits). Or splice in a re-read of that one sentence, cutting only inside the silences around it, then run time-voice again |
| A homophone, a split word or a name spelled differently | speech recognition, not the voice | read the report: if the audio is right, say so and continue; never change `script.txt` to match a mishearing |
| "Transcription is unavailable" | the speech model isn't installed yet | run the install command time-voice (or the doctor) prints, after the user's yes; it downloads once |
| No silences found, or pauses not tidied | room noise, music or hum under the voice keeps it above −50 dB | record again in a quieter room with no music |
| Pauses too short to cut | a very fast read | record again more slowly; never speed up or slow down audio |
| Word count mismatch | a skipped or merged word | treat it as a dropped word |
| The film would run past the format's length | more words than the budget | cut words from the script (with the user's OK) and record again; never speed the voice up |

## After the render
`qc.mjs` measures the loudness and transcribes the delivered MP4 against `story/script.txt`: 0 differences, or don't
deliver. Say that you measured it and can't listen.

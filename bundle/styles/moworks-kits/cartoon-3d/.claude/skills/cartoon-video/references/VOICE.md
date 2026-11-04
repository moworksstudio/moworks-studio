# The voice-over: three ways a video gets its voice

Every cut and every caption lands on a spoken word, so the voice comes before the build. Find out which case applies
from what the user gave you; ask only if it's unclear.

| Case | The user gives you… | You do |
|---|---|---|
| **A · their recording** | an MP3/WAV/M4A (or a video whose sound is the voice) | copy it **untouched** to `projects/<slug>/audio/`, convert it to `public/videos/<slug>/voice.wav` (`ffmpeg -i <file> -ar 48000 -ac 1 public/videos/<slug>/voice.wav`), then §3. Never rewrite, re-voice, speed up or "fix" it; tighten long pauses only if they ask (§4) |
| **B · a script → generated voice** | a script (or an idea to write one from), and the **AI voice** module is on with a voice MCP connected (`kit.config.json → voiceGeneration`) | get the script approved, generate (§2), then §3 |
| **C · no voice** | "just the animation" | design the rhythm yourself (a beat every 1.5–3 s), keep captions off or write them as on-screen words, and the MP4 gets the effects only |

Asked for a narrated video but there's no file and no voice MCP? Offer two ways: they record it (or make it in any
text-to-speech app) and drop the file in, or they connect a text-to-speech MCP (kit-setup → "Connect a voice MCP").
Never fake a voice any other way.

## 1 · Script rules that matter for the voice
- The approved script is generated **word for word**. Spell numbers the way they should be spoken ("about four
  kilometres"), and keep the written figure for the screen.
- Generated voices read slower than you'd think: a 60 s target often comes back at 73–77 s (about 2.6–2.7 words/s).
  Write to the low end of the format's word budget; if a take runs long, **cut words and re-voice**. Never speed it up.

## 2 · Generating it with a voice MCP (ask before spending credits)
### Find out what's connected (once; record it in `kit.config.json → voiceGeneration`)
1. Look through your tools for text-to-speech: names or descriptions with *speech, tts, text_to_speech,
   generate_audio, voice, narration*. Read each candidate's description and input schema in full.
2. If it has a **voice list**, list the voices; if it has a model explorer, read the speech model's parameters.
3. Let the user choose: offer 2–3 voices that suit a friendly narrator (warm, clear, slightly amused). Pass on any
   preview links; **you can't listen yourself**.
4. Preflight the **cost** if the tool can, tell the user, and **wait for a yes**.
5. Generate **one short test line**, download it, measure it with ffprobe, and let the user listen. Save the provider,
   tool, model, voice and parameters in `kit.config.json`, so later sessions don't research again.

### Higgsfield MCP (known-good settings)
- Tool `generate_audio`: `{ "model": "seed_audio", "prompt": "<the script>", "voice_type": "preset", "voice_id":
  "<from list_voices>" }`. A warm, measured narrator preset suits the look; the kit's examples were voiced with the
  preset "Arthur" (`30fc8796-ceb6-4a66-b3a7-4a145ef7f346`). Confirm the id in `list_voices`; ids can change.
- `"get_cost": true` quotes the credits without generating: about 1.1 credits per ~10 s, 4.9 for a 49 s script
  (≈ 0.1 credit per second). Budget ~1.5× for retakes.
- The result is a job: wait for it (`jobs_wait`), then download the audio to `projects/<slug>/audio/` and convert it
  to `public/videos/<slug>/voice.wav`.
- It makes speech only. The effects come from code (SOUND.md).

### Any other voice MCP (ElevenLabs, OpenAI, MiniMax, …)
The same procedure: read the schema, list voices, preflight the cost, test one line, record it. Prefer WAV at
44.1/48 kHz. With a length limit, generate paragraph by paragraph and join them (§5).

### Rules
- Show the script and get the OK **before** generating; a retake costs credits.
- Only clone a voice the user owns or has permission to use. Never imitate a real, recognisable person.
- Side characters with lines: one fixed voice per character for the whole series, logged in `PLAN.md`.

## 3 · Word times (every case with a voice)
```bash
node tools/vo-words.mjs public/videos/<slug>/voice.wav --script projects/<slug>/script.txt
```
- It transcribes the voice (mlx-whisper on Apple-silicon Macs, faster-whisper elsewhere; the first run downloads the
  model, ≈ 1.6 GB, so tell the user), moves phrase starts out of measured silences, compares the words with the
  script, and checks the tail for a **stray extra word** (generated takes sometimes add one).
- `ISSUES none` → paste the printed `WORDS` into `vo.ts`.
- `ISSUE STRAY …` → run the printed `ffmpeg … _trim.wav` command, point `VOICE` at the trimmed file, run it again.
- `ISSUE word N …` → read it: a split word ("co-pilot"), a homophone or a name is fine (fix the caption spelling in
  `WORDS`); a wrong or missing word means a retake.
- Set `FRAMES` = the last word's end + ≥ 0.5 s, in frames (× 30).

## 4 · Tightening pauses (only when asked, or for generated takes that run long)
```bash
uv run --with numpy --with scipy python tools/tighten-voice.py <in.wav> <out.wav> --pause 0.35
```
It shortens silences only (never words), with 10 ms crossfades. Keep a dramatic beat longer with
`--keep "14.4-15.4:0.6"`. Tighten **before** `vo-words.mjs`: the word times must come from the final file.

## 5 · Several takes on one timeline (dialogue, chapters, a long script in parts)
```bash
node tools/place-voice.mjs public/videos/<slug>/voice.wav projects/<slug>/audio/narration-1.wav@0.2 projects/<slug>/audio/ravi-1.wav@13.2 projects/<slug>/audio/narration-2.wav@14.6
```
Each take starts at the given second; nothing is sped up or trimmed. Then run `vo-words.mjs` on the result (without
`--script` if the lines come from several speakers, and check the words by hand).

## 6 · After the render
`node tools/qc.mjs <CompId>` measures the loudness and the **voice clarity** (the voice over the effects, median
≥ 12 dB). Below that, move cues into the pauses, lower them 3–6 dB, or shorten their tails. Say that you measured it
and can't listen.

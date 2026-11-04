# Voice-over: the three ways a graphic gets its voice

A graphic's timing comes from its voice-over: every hit lands on a spoken word. There are three cases. Find out which
one applies from what the user gave you, and ask only if it's unclear.

| Case | The user gives you… | You do |
|---|---|---|
| **A · their audio** | an MP3/WAV/M4A voice-over (or a video whose sound is the voice) | use it **exactly as it is**: never re-voice it, never rewrite it. Tighten long pauses only if they ask (§4) |
| **B · a script → generated voice** | a script (or a topic to write one from) and an **audio-capable MCP** is connected (`kit.config.json → voiceGeneration`) | write or polish the script (§3), get the user's OK, generate the voice with the MCP (§2), then continue as in case A |
| **C · no voice** | nothing to say ("just the animation") | design the rhythm yourself (beats every 0.5–1.2 s); the MP4 gets the sound effects only |

Asked for a voiced graphic, but there's no audio file and no audio MCP? Offer two options: (1) they record or
generate the voice themselves and drop the file in, or (2) they connect an MCP that can do text-to-speech (§2).
Don't fake a voice any other way.

---

## 1 · After the voice exists (cases A and B)
```bash
uv run --with numpy --with scipy python tools/tighten-voice.py "<voice file>" projects/<slug>/voice-tight.wav   # optional (§4)
node tools/new-graphic.mjs <slug> --voice "<final voice file>" --format square --title "…"
```
`new-graphic.mjs --voice` does the following:
- copies the voice to `public/graphics/<slug>/voice.wav`
- transcribes it (word times → `projects/<slug>/transcript.md`; mlx-whisper on Apple Silicon, faster-whisper
  elsewhere; the model downloads once, ~1.6 GB)
- sets the length to the voice + 0.6 s
- wires the voice into the composition's sound (`SOUND.voice`), so `tools/render.mjs` mixes it with the effects at −14 LUFS

Then:
- Check the words the transcript flags as low-confidence (names, numbers).
- Build the beat map from the word times.
- The transcriber can misplace a word right after a long pause. If a hit feels off, check the audio level around it
  (for example `ffmpeg -i voice.wav -af astats …`) instead of trusting the transcript alone.

## 2 · Generating the voice with an MCP (case B)

### Find out what's connected (once, at setup; record it in `kit.config.json → voiceGeneration`)
1. Look through your available tools for **text-to-speech**: names or descriptions with *speech, tts,
   text_to_speech, generate_audio, voice, narration*. Read each candidate's description and input schema in full.
2. If the MCP has a **voice list** tool, list the voices. If it has a **model explorer**, read the speech model's
   parameters (speed, format, sample rate).
3. Ask the user to choose a voice: offer 2–3 that suit the look (a warm, measured narrator, documentary pace). If the
   tool gives preview URLs, pass them on so the user can listen; **you can't listen yourself**.
4. If there's a **cost preflight**, use it, and tell the user the cost. **Ask before spending credits.**
5. Generate **one short test line**, download it, check its duration and loudness with ffprobe, and let the user
   listen. Then save the provider, tool, model, voice and parameters in `kit.config.json`, so later sessions don't
   have to research again.

### Higgsfield MCP (known-good settings)
- Tool `generate_audio`, `model: "seed_audio"` (its default speech model). Voice: `voice_type: "preset"` + `voice_id`
  from **`list_voices`**. For other engines, `model: "text2speech_v2"` with `variant` (elevenlabs, minimax,
  seed_speech, vibe_voice or cozy_voice) plus a voice.
- Parameters that worked for this look: `speech_rate: 25` (a brisk documentary pace; 0 = default speed),
  `format: "wav"`, `sample_rate: 48000`. A warm, older storyteller voice (e.g. a British narrator preset) suits the
  paper look well. Let the user pick.
- `get_cost: true` preflights the credits without generating. The result is a job: wait for it, then download the
  audio URL into `projects/<slug>/audio/`.
- `voice_change` swaps the voice of an existing recording while keeping its timing (useful when the user records a
  guide take themselves). `list_voices` also shows the user's own cloned voices.
- It only makes **speech**. Sound effects come from code (SOUND.md), never from a speech model.

### Any other audio MCP (ElevenLabs, OpenAI, MiniMax, …)
Same procedure: read the schema, list the voices, preflight the cost, test one line, record it. Prefer WAV at
44.1/48 kHz. If a tool has a length limit, generate paragraph by paragraph and join the parts with ~0.3 s between them:
```bash
ffmpeg -i p1.wav -i p2.wav -filter_complex "[0:a]apad=pad_dur=0.3[a0];[a0][1:a]concat=n=2:v=0:a=1" -ar 48000 voice.wav
```

### Rules
- Show the script and get the user's OK **before** generating. A re-take costs credits.
- Spell numbers the way they should be spoken ("twenty forty-eight", "a hundred and seventeen thousand dollars"), and
  keep the written figure for the screen.
- Only clone a voice the user owns or has permission to use. Never imitate a real, recognisable person.

## 3 · Writing the script (when you write or polish it)
1. **One continuous paragraph.** Every sentence runs into the next with connectors (and, so, because, but). Never one
   sentence per line, never a list of stat cards. Present it to the user as one paragraph too.
2. **Hook on the viewer**: their time, their money, their curiosity ("Before this video ends…").
3. Short sentences, one idea each, sayable in one breath. Each sentence answers the question the last one raised.
4. **A kicker people repeat**: a reversal on the last line, set up by a pause.
5. **Real facts only**, from primary sources. Note projections. Correct the user's numbers when they're off, and say so.
6. **Length**: a measured narrator reads ~2.4–2.9 words/s, so 20 s ≈ 50–58 words and 30 s ≈ 75–85 words. Measure
   the generated file and don't guess.
7. Give the user the pacing up front: a scene list with seconds next to the script.

## 4 · Tightening a voice
Generated voices often leave 0.5–1 s gaps. `tools/tighten-voice.py` shortens silence only (never words) to `--pause`
(default 0.25 s), with a short lead-in and tail. Keep a dramatic beat longer with `--keep "14.4-15.4:0.45"` (the
pause inside "Wait… really?"). Tighten **before** `new-graphic.mjs --voice`, because the word times must come from the
final file. A user's own recording: only tighten it if they ask.

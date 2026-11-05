# The voice of a Stickman Explainer

The narration drives the edit: every shot starts on its line's first word. There are two ways to get a voice-over.

## 1 · The user's own voice-over
- Copy the file into `projects/<slug>/audio/` **untouched**. Never rewrite, re-voice, speed up or "fix" the user's
  voice. If it has long dead air, ask before tightening it.
- Convert it to `public/videos/<slug>/voice.wav`:
  `ffmpeg -i <file> -ar 48000 -ac 1 public/videos/<slug>/voice.wav`.
- Then do §3.

## 2 · Generating it with a text-to-speech MCP (ask before spending credits)
1. **Discover the tool.** Look through your tools for text-to-speech (*generate_audio, text_to_speech, tts…*) and
   read its schema. For example, Higgsfield's `generate_audio` has `model: "text2speech_v2"`, `variant: "elevenlabs"`,
   `voice_type: "preset"` and a `voice_id` from its voice list. If none is connected, tell the user they can connect
   one in Claude's connector settings (then start a new session), or give you an MP3 or WAV.
2. **Pick the voices with the user.** List the voices and show any preview links; you can't listen yourself. The
   style wants:
   - **Narrator:** a warm, clear, slightly amused voice; a male narrator around 110–120 Hz median pitch suits it. The
     worked example used **Callum** (ElevenLabs) for the narrator and **Naomi** for the coworker.
   - **Side characters:** a contrasting voice, one line each.

   Nobody has listened to these choices inside the kit, so the user's ear decides.
3. **Preflight the cost** (the tool's cost/estimate option). Tell the user the total, and **wait for a yes**.
4. **Generate:**
   - **Narration:** one take per act, from the approved paragraph, word for word.
   - **Each side character's line:** one take each.
   - **Waiting:** wait for the jobs, download each result into `projects/<slug>/audio/`, and measure them with
     ffprobe.
5. Record what worked (tool, model, voice ids, settings, cost) in `kit.config.json → voiceGeneration`.

## 3 · Place the takes and get the word times
1. **Lay the takes on the timeline.** Leave a silent gap where the title card plays:
   ```bash
   node tools/place-voice.mjs public/videos/<slug>/voice.wav projects/<slug>/audio/act1.mp3@0.2 projects/<slug>/audio/coworker.mp3@13.2 projects/<slug>/audio/act2.mp3@18.7
   ```
   Each take starts at the given second. The output is 48 kHz mono, as long as the last take's end.
2. **Word timings:**
   ```bash
   node tools/transcribe.mjs public/videos/<slug>/voice.wav <slug>
   ```
   This writes `projects/<slug>/words.json`: words with start/end times, pauses and beats. It uses mlx-whisper on
   Apple silicon and faster-whisper elsewhere, through uv. The first run downloads the model, about 1.6 GB, so tell
   the user. The text is kept verbatim: fix spellings in the picture, never by re-recording.
3. Build the shot table `S` from the first word of each line, and set the video's length to the voice plus about
   0.5 s.

## 4 · Clarity (after the render)
`node tools/qc.mjs <Name>` measures the voice against the effects and music, in 400 ms windows, in the
150–6000 Hz speech band.
- **Targets:** a median of 12 dB or more, and a 10th percentile of 6 dB or more.
- **When it's low:** move hits into the pauses, lower or shorten effects that sit on words, and duck the music under
  speech (`music.keys`).

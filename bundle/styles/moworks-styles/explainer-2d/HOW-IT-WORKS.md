# How these videos are made: the setup and the process

**The picture and the sound are both written as code**, rendered on your computer, and checked by measurement before
you see them. There's no animation app, no stock footage, no image files and no downloaded sounds. The AI (Claude)
writes the script, draws every scene with code on one canvas, keys every cut and label to a word of your narration,
and composes the music and sound effects in Python. It can't watch or hear video, so it checks everything as still
frames and numbers, and (if you keep the review on) a second AI checks the finished frames. You watch and listen to
the result.

## The setup (what each piece does)
```
 script + fact sheet ──► your voice-over (your recording, or a text-to-speech tool) ──► clean + word times ──┐
        │                                                                                                    ▼
        └──► storyboard (shots + event cues) ──► scene modules + story.js (canvas, 60 fps) ──► HyperFrames renders
             every frame in headless Chrome ──► snapshots ──► MP4 ──► QC (frames, loudness, freezes, cuts, words)
 sound cues on the same words ──► effects + music synthesized in Python ──► mix + master to −14 LUFS ──┘
```

| Piece | What it is | Why |
|---|---|---|
| **Node.js 22+** | runs HyperFrames and the kit's tools (`tools/*.mjs`) | HyperFrames needs version 22 or newer |
| **HyperFrames** (0.9.1, in this folder) | turns a web page into an MP4: it opens the page in a hidden Chrome, jumps to every frame, takes a picture of each and encodes them | a video is just code, so the AI can write it, check it and render it |
| **HyperFrames' headless Chrome** | the browser that draws the frames, downloaded once by HyperFrames | renders without opening any window |
| **The canvas engine** (`engine/`) | time, easing, springs, seeded noise, word cues (`ex-core.js`), effects (`ex-fx.js`), the house palette, labels and title (`house-pal.js`, `house-ui.js`), the red-hoodie hero (`house-hero.js`) | the look, the same in every video |
| **GSAP** (3.15.0) | the timeline HyperFrames seeks frame by frame | every frame is computed from the time alone, so renders are repeatable |
| **Figtree** (the font) | the type of every label and title | one clean, friendly typeface |
| **A video** = `videos/<name>/` | `index.html` (size and length), `story/story.js` (the shots), the film's scene modules, `story/sound.json` (sound cues), `SCRIPT.md`, `STORYBOARD.md`, `ART.md` | one folder holds everything one film needs |
| **Speech recognition** (HyperFrames `transcribe`, with a speech model it downloads once) | times every word of the voice-over and checks it says exactly the script | every cut and label lands on its word; no word is dropped or repeated |
| **uv + Python** (numpy, scipy, soundfile, pyloudnorm) | cleans the voice, synthesizes every sound effect and the music, mixes and masters | no licences to worry about, designed for this look, rebuilt in seconds |
| **ffmpeg / ffprobe** | encodes the final MP4 and measures it (loudness, frozen frames, cuts) | the checks are measurements, not opinions |
| **`tools/doctor.mjs`** | checks everything above at the start of every project and prints the install command for anything missing | nothing starts on a broken machine |

## What gets installed, and where
| What | Where | Who installs it |
|---|---|---|
| Node.js 22 or newer | your system | you (the AI gives you the command) |
| ffmpeg (includes ffprobe) | your system | you |
| uv (it fetches Python 3.12 and the audio packages by itself the first time) | your system; the packages go into uv's own cache | you install uv; the rest happens on first use |
| HyperFrames, GSAP and the Figtree font (`npm install`, about 125 MB) | this folder (`node_modules/`) | the AI, after your yes |
| HyperFrames' headless Chrome (about 200 MB) | your user cache folder (`.cache/hyperframes` in your home folder), shared by every HyperFrames project | the AI, after your yes |
| A speech-recognition model (about 670 MB; only needed for narrated videos) | the same cache folder | the AI, after your yes (the doctor prints the command) |

Nothing is loaded from the internet while a video renders: the engine, GSAP and the font are copied into each video's
`ex/` folder (`node tools/sync-engine.mjs`).

## The process (idea → MP4)
| # | Step | You give | You get | Time |
|---|---|---|---|---|
| 1 | **Tool check** | a yes for any folder install | "ready", or the exact install command | seconds |
| 2 | **Brief** | a topic or a script, the format (16:9 or 9:16), the length, how the voice is made | the brief restated in a few lines; you say **approve** | one message |
| 3 | **Script** | your OK (or your own script, used word for word) | a script in flowing sentences, a beat table and a fact sheet with a source for every number; you say **approve** | minutes |
| 4 | **Voice** | your recording, or your OK to spend credits on a text-to-speech tool | the voice cleaned, pauses tidied only inside silences, every word timed and checked against the script | a few minutes |
| 5 | **Storyboard** | nothing | a shot table and an event-cue table: every cut, label and sound keyed to a word | minutes |
| 6 | **Scenes** | nothing | the film's scenes drawn in code. Big films use several helper AIs at once, one per scene module, each testing its module on its own page | the longest step; helper AIs working in parallel shorten it |
| 7 | **Story and snapshots** | nothing | the shots, camera drift, labels and title wired to the words; still frames at every beat, checked and fixed in one or two rounds | tens of minutes |
| 8 | **Sound** | nothing (or "no music" / "no sound") | effects on the events and a soft score, mixed under the voice and mastered to −14 LUFS | about a second per 15 s of audio |
| 9 | **Render + QC** | nothing | the MP4, then measured: frame count, loudness, true peak, frozen frames, cut count, and the voice in the final file compared word for word with the script | minutes for a short; run chapter by chapter for long films |
| 10 | **Review** (if on) | nothing | a second AI reads the frames with fresh eyes; problems are fixed and re-rendered | tens of minutes |
| 11 | **Delivery** | your eyes and ears | the MP4 and a contact sheet, absolute paths, the measured loudness, what was checked and what wasn't, any claim still unverified | — |

The AI says it hasn't listened to the result. You should.

## Voice-overs
**Your own recording (the default).**
- Read the approved script **word for word**, in **one continuous take**, from start to finish.
- Record **dry**: a quiet room, no music, no background noise, no effects. Soft furnishings help; a closet full of
  clothes is a good booth.
- Read **calmly**, with natural pauses between sentences. A rushed read leaves no pauses to tidy.
- Save it as WAV if you can (48 kHz is ideal); MP3 or M4A also work. Drag the file into the chat.
- If you stumble, record the take again from the start. (The AI can also splice in one re-read sentence, cutting
  only inside the pauses around it.)

**A text-to-speech tool.** If you connect one to Claude (an MCP connector), the AI can voice the approved script for
you. It lists the voices so you can pick one, shows the cost, and spends nothing until you say yes. It records what
worked in `kit.config.json`, so later sessions don't ask again.

**No narrator.** Say "no narrator" and the AI times the film by itself; "no sound" gives a silent MP4.

## Common problems
| Problem | What it means | What to do |
|---|---|---|
| The doctor shows ✗ | something isn't installed | follow the command it prints, then say "done" |
| A snapshot or render hangs on "Waiting for root component to load" | Claude Code's sandbox blocks the hidden Chrome | the AI reruns it outside the sandbox, or asks you to paste the command into a normal terminal |
| "The take doesn't match the script" | a word was dropped, added or changed in the recording | re-record that sentence (or the whole take) word for word |
| The voice timing fails on pauses | background noise or music under the voice, or a very fast read | record again in a quieter room, calmly, with no music |
| Text in a different font | the font files didn't reach the video folder | the AI re-copies them (`node tools/sync-engine.mjs`) |
| `check` warns about canvas content at the frame edge | expected: the scenes paint the whole frame on purpose | nothing |
| Renders are slow | 60 fps means 60 pictures per second of film | the AI renders in the background and long films chapter by chapter |

## Licences
- **HyperFrames**: open source under the Apache License 2.0 (as stated in its `package.json`). Free to use for your
  videos.
- **GSAP 3.15.0**: GreenSock's standard "no charge" licence (gsap.com/standard-license). It's installed from npm into
  this folder, not shipped inside the kit.
- **Figtree**: SIL Open Font License 1.1 (the licence text comes with the `@fontsource/figtree` package).
- **Python packages**: numpy, scipy and soundfile (BSD licences), pyloudnorm (MIT).
- **ffmpeg**: installed by you as system software, under its own LGPL/GPL licence.
- **What you make**: every scene is drawn by code in your folder and every sound is synthesized, so there are no
  third-party images, footage, music or sound files in your videos.

## Where things live
```
CLAUDE.md                the AI's instructions: the look, the tool check, the skills, the rules
STYLE.md                 the house look, with your own notes at the top (they win)
SCRIPTING.md             how scripts are written
HOW-IT-WORKS.md          this file
kit.config.json          your settings: modules on/off, sound defaults, the voice tool that works, the default format
.claude/skills/          explainer-video (core) · explainer-shorts · explainer-longform · script-writer · voice-over ·
                         sound-design · art-modules · render-review · style-note · kit-setup
engine/                  the canvas engine and the house look
demos/ · examples/       the two 5-second setup demos · the worked example "Where the Needle Stops"
videos/<name>/           your videos: the script, the storyboard, the scenes, the audio, snapshots, renders
tools/                   doctor · new-video · time-voice · sound · snapshot · render · qc · …
```

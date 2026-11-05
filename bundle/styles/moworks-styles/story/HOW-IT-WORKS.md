# How these videos are made: the setup and the process

**The picture and the sound are both written as code**, rendered on your computer, and checked by measurement before
anyone sees them. There's no video editor, no stock footage and no downloaded sound effects. The AI (Claude) writes
the script or story, the drawing code and the sound code. It can't watch or hear video, so it checks everything as
still images and numbers. You watch and listen to the result.

## The two styles
| | **Stickman Explainer** | **Inner Voice Short** |
|---|---|---|
| Story | a narrated "what if…" premise, second person, fast | a quiet story told in captions, white (narrator) and red (inner voice) |
| Look | flat vector figures, a hoodie hero, rim light, a 2:1 letterbox | a cream capsule character, a red-glowing shadow, moonlit near-black rooms |
| Edit | a cut on every sentence; one big camera move per act | a static camera, fades through black, a `DAY N` counter |
| Sound | a voice-over + crisp UI and foley effects | room tone + close foley; silence is part of the design |
| Frame | 24 fps | 30 fps |
| Drawing kit | `src/stickman/kit.js` | `src/inner-voice/kit.js` |
| Worked example | `src/examples/fly.js` ("What If You Could Fly?") | `src/examples/firstchord.js` ("First Chord") |

## The setup (what each tool does)
```
 script / story (time table) ──► drawing code (Canvas 2D kit) ──► Remotion renders every frame in headless Chrome ──┐
        │                                                                                                         ├─► ffmpeg ─► MP4
        ├──► voice-over (TTS MCP, or your file) ──► word times (whisper) ─┐                                       │
        └──► sound cues (code-made effects; music only if asked) ─────────┴─► mix + master to −14 LUFS ──────────┘
```

| Piece | What it is | Why |
|---|---|---|
| **Node.js** | runs Remotion and the kit's tools (`tools/*.mjs`) | |
| **Remotion 4** (React) | the frame engine: one composition per video, renders every frame in its own headless Chrome and encodes H.264 | deterministic (frame N always looks the same), scriptable, previewable (`npm run studio`) |
| **The drawing kits** (plain JS, Canvas 2D) | functions like `figure()`, `layer()`, `hero()`, `shadowFigure()`, `caption()`, each drawing onto a canvas for a time `t` | fast to render, and every shot is a plain function of time: easy to read and change |
| **A video** = `src/videos/<slug>/` | `<Name>.tsx` (fonts, the canvas, voice, cues) plus `<slug>.js` (the shots and the time table) | one table holds every time, and the picture and the sound both read it |
| **uv + Python** (numpy, scipy) | synthesises every sound effect (`tools/sfx/build_*.py`), and original music when you ask (`tools/music/`) | no licences, designed to the frame, rebuilt in seconds |
| **A text-to-speech MCP** (narrated videos) | generates the voice-over from the approved script; the cost is shown and you approve it first | the Stickman Explainer is narrated; your own voice-over works too |
| **whisper** (mlx-whisper / faster-whisper, via uv) | word-by-word timings of the voice-over (`tools/transcribe.mjs`) | every cut lands on its spoken line |
| **`tools/sfx/mix.py`** | lays the voice, the effects and any music, then masters to −14 LUFS integrated with a true peak of −1.5 dBTP or lower | YouTube's loudness target; no clipping |
| **ffmpeg / ffprobe** | encodes, muxes audio and video, and measures (loudness, black and freeze detection, cuts, contact sheets) | the QC is measurement, not opinion |
| **`tools/doctor.mjs`** | checks all of the above at the start of every project and prints the install command for anything missing | nothing starts on a broken machine |

## The process (idea → MP4)
1. **Tool check.** `node tools/doctor.mjs`. If anything is missing, the AI asks you to install it, with the exact
   command, and waits until the doctor says ready.
2. **Writing.**
   - **Stickman Explainer:** a script in the "what if" formula, with every number researched and sourced.
   - **Inner Voice Short:** a beat sheet (time · picture · words · sound).

   You OK it.
3. **Voice** (Stickman Explainer). Either the AI generates it with your connected text-to-speech tool (you pick the
   voice; it shows the cost and asks first), or you give your own file, which is never altered. The takes are placed
   on a timeline (`tools/place-voice.mjs`), and whisper gives each word's time.
4. **Scaffold.** `node tools/new-video.mjs <slug> --style stickman|inner-voice` creates the files and registers the
   video.
5. **Animate in code.** Each shot is a function of time `t`. Motion comes from small helpers:
   - `ramp` (eased 0→1 between two times)
   - `track` (keyframes)
   - `life` (fade in, hold, fade out)
   - `typed` (letters appear one by one)
   - inverse kinematics for arms and legs
   - a camera with depth of field
6. **Check with stills.** `node tools/stills.mjs` renders chosen frames, about 20–40 s a round. The AI looks at
   them, crops faces and labels, fixes and repeats. You see a stills sheet before the export.
7. **Sound.** Effects from the style's library, each placed on its visual beat. New effects are designed in code.
   Music is added only if you ask, composed in Python.
8. **Render.** `node tools/render.mjs <Name>` runs the steps below. 20–40 s of video takes about 15–20 s on an
   Apple-silicon Mac.
   1. a syntax check
   2. exporting the cues
   3. the mix and master
   4. rendering every frame (H.264, CRF 18)
   5. muxing the audio
   6. measuring the loudness
   7. writing a contact sheet
9. **QC.** `node tools/qc.mjs <Name>` checks:
   - **Format:** codecs, size, fps, frame count, audio and video durations.
   - **Black and frozen stretches.**
   - **Hard cuts.**
   - **Sound:** loudness and true peak, per-channel peaks.
   - **Voice clarity:** narrated videos only.
   - **Sheet:** a dense contact sheet to read beat by beat.
10. **Deliver.** Absolute paths, a beat summary and the measured loudness. The AI says it hasn't listened; you
    should. On a test against a reference video, there's also a side-by-side (`tools/compare.mjs`).

## Where things live
```
CLAUDE.md                 the AI's instructions: the two styles, the tool check, the guidelines, the rules
HOW-IT-WORKS.md           this file
.claude/skills/           stickman-explainer · inner-voice-short (each: SKILL.md + references/) · original-music · kit-setup · style-note
src/stickman/kit.js       the Stickman Explainer drawing kit
src/inner-voice/kit.js    the Inner Voice Short drawing kit
src/examples/ · src/demos/  the worked examples · the two 5-second setup demos
src/videos/<slug>/        your videos
public/sfx/<style>/       the code-made sound libraries (each with INDEX.md) · public/videos/<slug>/voice.wav · public/music/<slug>/
tools/                    doctor · new-video · stills · render · qc · compare · transcribe · place-voice · check · sheet · unpack
tools/sfx/                sfxlib.py (ingredients, instruments) · build_stickman.py · build_inner_voice.py · mix · voice_clarity
projects/<slug>/          each video's PLAN.md (script/story, shots, facts, QC), voice takes, words.json
out/<Name>/               the MP4, contact sheets, the mix, qc.json
```

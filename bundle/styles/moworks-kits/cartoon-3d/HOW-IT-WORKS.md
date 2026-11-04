# How these videos are made: the setup and the process

**The picture and the sound are both written as code**, rendered on your computer, and checked by measurement before
anyone sees them. There's no 3D modelling app, no stock footage, no image files and no downloaded sound effects. The
AI (Claude) writes the script, builds the sets and the characters out of simple shapes, stages every shot like a
director, and designs the sound. It can't watch or hear video, so it checks everything as still images and numbers,
and a second AI checks the finished frames. You watch and listen to the result.

## The setup (what each piece does)
```
 script (+ facts) ──► voice (your file, or a TTS MCP) ──► word times (whisper) ──┐
        │                                                                         ▼
        └──► world.ts + shots.ts (Three.js: sets, cast, camera, looks) ──► Remotion renders every frame in headless
             Chrome with WebGL ──► stills + collision QA ──► MP4 ──► QC + fresh-eyes review
 sound cues (code-made kit; music only if asked) ──► mix + master to −14 LUFS ──┘
```

| Piece | What it is | Why |
|---|---|---|
| **Node.js** | runs Remotion and the kit's tools (`tools/*.mjs`) | |
| **Remotion 4** (React) | the frame engine: one composition per video, every frame rendered in its own headless Chrome, encoded to H.264 | deterministic (frame N always looks the same), scriptable, previewable (`npm run studio`) |
| **Three.js** (WebGL) | the 3D engine inside each frame: the sets, the cast, the lights, the camera | real 3D staging, drawn as a cartoon |
| **The cartoon engine** (`src/kit/`) | flat-drawn characters with painted faces, toon materials, then a post chain: ink outlines from depth and normals, bloom, depth of field, a colour grade | the look, the same in every video |
| **A video** = `src/videos/<slug>/` | `world.ts` (sets, props, cast), `shots.ts` (camera + acting per shot), `vo.ts` (word times, sound cues), `Video.tsx` | one shot list holds every time; the picture and the sound both read it |
| **A text-to-speech MCP** (optional) | voices the approved script; the cost is shown and you approve it first | narrated videos without recording; your own recording works too |
| **whisper** (mlx-whisper on Apple-silicon Macs, faster-whisper elsewhere, via uv) | word-by-word timings of the voice, plus a check that it says exactly the script | every cut and caption lands on its word |
| **uv + Python** (numpy, scipy) | synthesises every sound effect (`tools/sfx/build_sounds.py`), and original music when you ask | no licences, designed for this look, rebuilt in seconds |
| **`tools/sfx/mix.py`** | lays the voice, the effects and any music, then masters to −14 LUFS with a true peak of −1.5 dBTP or lower | YouTube's loudness target; no clipping |
| **ffmpeg / ffprobe** | encodes, muxes and measures (loudness, freezes, cuts, contact sheets) | the QC is measurement, not opinion |
| **`tools/doctor.mjs`** | checks everything above at the start of every project and prints the install command for anything missing | nothing starts on a broken machine |

## The process (idea → MP4)
1. **Tool check.** `node tools/doctor.mjs`. If anything is missing, the AI asks you to install it, with the exact
   command, and waits.
2. **Idea and script.** A format (a 9:16 story short, or a 16:9 What-If), a script written as one flowing paragraph,
   and every real-world fact researched with a source. You OK it.
3. **Voice.** Your recording (never changed), or generated from the approved script by your text-to-speech MCP (you
   pick the voice; it shows the cost first). Whisper times every word and checks it matches the script.
4. **Scaffold.** `node tools/new-video.mjs <slug> --format short|long` creates the files and registers the video.
5. **Build.** One shot per spoken beat. Each shot has a camera move, a "look" (lighting + outline + glow + blur), and
   the cast's acting: poses, walks along routes, hands that grip props by their handles (inverse kinematics), faces
   that change on the word.
6. **Check.** A collision check steps through every frame for bodies passing through furniture or each other; stills
   of every shot are inspected full size.
7. **Sound.** A few effects on the key moments, designed in code. Music only if you ask.
8. **Render.** `node tools/render.mjs <Name>`: a syntax check, the mix and master, every frame rendered, the sound
   muxed, the loudness measured, a contact sheet. A 60-second short takes about two minutes on an Apple-silicon Mac.
9. **QC and review.** `node tools/qc.mjs <Name>` measures the file; a second AI reviews the frames with fresh eyes
   (props held wrong, clipping, faces, framing, artefacts); fixes re-render only the changed shots.
10. **Deliver.** Absolute paths, a beat summary and the measured loudness. The AI says it hasn't listened; you should.

## What's original
Everything you render is made in this folder: the characters are code (spheres, capsules, drawn faces), the textures
are drawn on canvases at render time, the sounds are synthesised, the fonts are open-licence Google Fonts (Outfit,
Patrick Hand, Caveat Brush). Three.js is MIT-licensed. Remotion is free for individuals and companies of up to three
people; larger companies need a Remotion company licence (see remotion.dev/license).

## Where things live
```
CLAUDE.md                the AI's instructions: the look, the tool check, the skills, the rules
HOW-IT-WORKS.md          this file
kit.config.json          your settings: modules on/off, defaults, the voice MCP that works, render settings
.claude/skills/          cartoon-video (core) · cartoon-shorts · cartoon-whatif · idea-lab · character-builder ·
                         render-review · original-music · style-note · kit-setup
src/kit/                 the cartoon engine (Three.js inside Remotion)
src/examples/ · src/demos/   the worked examples · the two 5-second setup demos
src/videos/<slug>/       your videos
projects/<slug>/         each video's plan, script, facts and voice takes
public/                  voices, the sound kit, music
tools/                   doctor · new-video · vo-words · stills · qa · render · qc · review-frames · patch-render · …
out/<Name>/              the MP4s, contact sheets, the mix, QC reports, review material
```

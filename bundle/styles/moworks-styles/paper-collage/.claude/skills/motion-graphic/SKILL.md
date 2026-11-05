---
name: motion-graphic
description: Make a paper-collage motion graphic — off-white grid paper, black-and-white halftone cut-outs with white paper edges, red accent + yellow highlighter, condensed caps + serif italic + typewriter type, torn-paper transitions, springy hand-made motion and sound effects generated in code — as an MP4 (a transparent overlay or a GIF only when asked), optionally synced to a voice-over (the user's MP3, or one generated from a script with a connected voice MCP). Use whenever the user asks for a motion graphic, animation, explainer clip, GIF, animated title, chart animation, "make a graphic about…", gives a script or an MP3 to animate, or gives notes on a graphic made with this kit.
---

# Make a motion graphic

You are the motion designer and sound designer. The user describes a graphic, or gives a script or a voice-over, and
you deliver it in the paper-collage look, to the standard in `references/STYLE.md`.

## Read first (every time)
1. `references/STYLE.md`: **the taste**. It wins over everything, and the user's own notes in its §1 outrank the rest.
2. `references/RECIPES.md`: the building blocks (`src/kit/scenes.tsx`) with code. Look at `src/demo/Demo.tsx` once
   per session.
3. As needed: `references/VOICE.md` (voice-over: MP3, MCP-generated or none), `references/IMAGES.md` (inbox, chat,
   MCP generation, cleaning), `references/SOUND.md` (code-made effects), `references/OUTPUT.md` (MP4; transparent
   or GIF only when asked), `references/CHECKLIST.md`.
4. `kit.config.json`: the user's defaults (format, outputs), image inbox, and the image and voice MCPs that work.

## The loop
1. **Brief.** Find out, from the request and `kit.config.json`, and only asking what's missing (in ONE message):
   - what it says, and how long it is
   - the format (square / vertical / horizontal)
   - the output is an **MP4** unless they asked for a transparent overlay or a GIF (don't offer a GIF)
   - the **voice**: (A) the user's audio file, (B) a script to voice with the connected voice MCP, or (C) none
   - the images (the inbox, the chat, generate, or code-drawn)
2. **Voice** (VOICE.md). For case B: write or polish the script as ONE continuous paragraph, show it with the pacing,
   and once the user OKs it, generate the voice (check the cost first) and tighten the pauses.
3. **Start the graphic**:
   `node tools/new-graphic.mjs <slug> --format <f> --title "…" [--voice <file>] [--seconds N]`.
   This writes `src/graphics/<slug>/<Comp>.tsx`, `projects/<slug>/PLAN.md`, and with a voice, `transcript.md` (word
   times).
4. **Plan**: the beat map in `PLAN.md` and in the composition header (scenes with seconds, every hit on a beat,
   sound cues). For a longer piece, show the user the scene list before building.
5. **Images** (IMAGES.md): code first, then the library, the user's images (inbox or chat), and generation with the
   connected image MCP. Clean every cut-out.
6. **Build** on the kit (RECIPES.md), and run `node tools/check.mjs` after every edit.
7. **Verify**: `node tools/stills.mjs <Comp> out/<slug>/stills-N <frames or 1.5s …> hold --sheet`, in a **new
   folder** each round. Look at the sheet, walk through CHECKLIST.md, and fix before showing.
8. **Show**: the stills sheet, a beat-by-beat summary, the sound cues, and things to double-check.
   `node tools/render.mjs <Comp> --preview --mp4` gives a quick moving look.
9. **Export** when the user says go (or straight away if they asked for the file): `node tools/render.mjs <Comp>
[--transparent] [--gif]` (an MP4 by default; the extras only on request). Report the absolute paths, sizes and loudness, plus "measured, I can't listen".
10. **Notes**: change exactly what was asked, re-verify, and log the round in `PLAN.md`. A note that should hold for
    future graphics goes through the **style-note** skill.

## Hard rules
- **Never play audio or video.** You can't hear it, and the user would. Verify with stills and contact sheets.
- **No invented numbers, quotes, comments, usernames or logos, and no generated real faces.** Research facts and show
  the sources. A spoken figure appears exactly as said.
- **Never rewrite or re-voice the user's own voice-over.** Ask before spending MCP credits.
- **Sound comes from code** (`tools/sfx/build_kit.py`). No downloaded effects; whooshes only when asked.
- **Camera stays subtle** unless the user asks (the chart data dive is the approved exception).
- Don't change `src/kit/*` for one graphic: make a local component. Change the kit for a real bug, or when the user
  wants a new default.
- One broken file breaks every render. There's no type checker; never claim one passed.

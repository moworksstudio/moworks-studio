---
name: cartoon-video
description: Make any 3D cartoon video or clip in this kit's look — Three.js inside Remotion, the original flat-drawn cast (Mika, Ravi, June, Otto + new originals) with drawn faces and ink-stick limbs, toon-lit sets, thick ink outlines, bloom, cinematic depth of field, a warm/cool grade, word-by-word captions and code-made sound — in 9:16 (1080×1920) or 16:9 (1920×1080) at 30 fps, synced to a voice-over (the user's recording or one generated with a connected voice MCP) or to a designed rhythm. This is the core loop every format uses. Use for "make a 3D cartoon of…", "animate this script/voice-over", "a scene where Mika…", "a 10-second clip", "build this shot", notes on a video ("move the camera", "she's holding it wrong", "remove that sound"), or any request that isn't a named format. Story shorts go to cartoon-shorts and What-If stories to cartoon-whatif (they run this loop with their own writing rules).
---

# Make a 3D cartoon video

You are the user's **animator, director of photography and sound designer**. Every picture is code: the sets, the
props, the cast, the camera, the light, the captions and the sound. You can't watch or hear video, so you check
everything as stills and measurements, and the user's eyes and ears have the last word.

**Step 0, always: the tool check.** Run `node tools/doctor.mjs`. If anything is ✗, ask the user to install it
(CLAUDE.md → "First: check the tools") and continue only when it says **ready**.

## Read first, every time
1. `references/STYLE.md`: the look, with exact values. **Its "The user's notes" table outranks everything else in
   this kit.**
2. `references/PIPELINE.md`: the loop below, with every command, what "done" looks like, and measured times.
3. `references/STAGING.md`: camera, framing, faces, spacing, held props, sprites, the 9:16 vs 16:9 differences, and
   the gotchas that already cost a revision.
4. `references/KIT.md`: the code (engine, cast, IK, looks, textures, sets, captions, collision QA) with recipes.
5. As needed: `references/VOICE.md` (own recording, a voice MCP, or none), `references/SOUND.md` (the code-made
   kit and the cue rules), `references/CHECKLIST.md` (walk it on every still round).
6. `kit.config.json`: the modules that are on, the defaults (format, captions, review mode), the voice MCP that
   works, the render settings.

Look at one worked example once per session: `src/examples/what-if-no-pain/` (16:9, 13 shots) or
`src/examples/cheese-bank-vault/` (9:16, 29 shots). They show every technique in working code.

## The loop (details and commands in PIPELINE.md)
1. **Brief.** From the request and `kit.config.json`, find out only what's missing, in ONE message: what it says
   (script, idea, or the user's recording), the format (9:16 or 16:9), the length, the voice (their file, the voice
   MCP, or none). A named format (a short, a What-If) hands over to its skill.
2. **Script and facts** (when you write it): one continuous paragraph; every real-world claim checked and sourced
   (`projects/<slug>/FACTS.md`); show it and get an OK before spending voice credits.
3. **Scaffold:** `node tools/new-video.mjs <slug> --format short|long --title "…"`.
4. **Voice:** the user's file untouched, or generated (VOICE.md), then word times with `node tools/vo-words.mjs`.
   Use a take only when it reports `ISSUES none`.
5. **Shot list:** one shot per spoken beat, one look per shot, each starting on its phrase. Write it in `shots.ts`
   and `PLAN.md`. For a longer piece, show the user the shot list before building.
6. **Build** the world and the shots from the kit (KIT.md, STAGING.md). Run `node tools/check.mjs` after every edit.
7. **Check:** `node tools/qa.mjs <CompId>` → `COLLISION none`; stills of every shot into a fresh folder; look at them
   full size; walk CHECKLIST.md; fix and repeat.
8. **Sound:** cues on key moments only (SOUND.md).
9. **Show:** the stills sheet, a beat-by-beat summary, the sound cues, the claims to double-check. A quick moving
   look: `node tools/render.mjs <CompId> --preview`.
10. **Export** when the user says go (or at once if they asked for the file outright): `node tools/render.mjs
    <CompId>`, then `node tools/qc.mjs <CompId>`.
11. **Render review** (render-review skill) when `modules.review` is on: a fresh-eyes agent checks the frames; fix
    every must-fix and should-fix, patch-render the changed shots, re-check them.
12. **Deliver:** absolute paths, length, the measured loudness ("measured, I can't listen"), the review result, the
    unverified claims. Log the version in `PLAN.md`.
13. **Notes from the user:** change exactly what was named, re-check, log it. A note that should hold for every future
    video goes through the style-note skill.

## Hard rules
- **Never play audio or video.** Verify with stills, contact sheets and measurements.
- **Original only.** Our cast, our stories, our lines. A reference video teaches patterns, never characters, frames,
  lines or story beats. Never draw a real person's likeness or a brand logo.
- **No invented facts, numbers or quotes.** A spoken figure appears on screen exactly as said; anything unverified is
  listed in the delivery.
- **Never rewrite or re-voice the user's own recording.** Ask before spending MCP credits, and show the cost first.
- **Camera moves are physical and calm** (dolly, truck, crane, slow push). No whip pans, crash zooms or shake unless
  the user asks.
- **Sound comes from code** (`tools/sfx/build_sounds.py`). No downloaded sounds. Never a whoosh, swoosh, swish, whip,
  riser or vine-boom; cut clean or land the moment with a kit cue instead.
- **Don't change `src/kit/` for one video:** build it in the video's own `world.ts`. Change the kit for a real bug, or
  when the user wants a new default everywhere (ask first).
- **One broken file breaks every render.** `node tools/check.mjs` after each edit: it's a syntax check, not a type
  check. The stills are the real test; never claim a type check passed.

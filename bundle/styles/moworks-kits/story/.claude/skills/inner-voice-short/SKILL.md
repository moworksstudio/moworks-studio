---
name: inner-voice-short
description: Make a dark, quiet animated short told in captions, in the inner-voice look — near-black rooms drawn in thin grey hand-drawn lines, one cream capsule character, a black shadow figure with a red glow that whispers in red Comic Sans, white narrator captions, a "DAY N" counter, slow fades, close code-made foley (music only on request). Built with the canvas kit (src/inner-voice/kit.js) inside Remotion. Use for any short, opening, scene or sound in this style ("the inner-voice style", "the shadow short", "a dark motivational short", "a caption-told animated short", "DAY 1 … DAY 90"), notes on one, or a style test against a reference video.
---

# Make an inner-voice short

**Step 0, always: the tool check.** Run `node tools/doctor.mjs`. If anything is ✗, ask the user to install it (see
"First: check the tools" in CLAUDE.md) and continue only when it says ready.

Read first, every time:
- `references/STYLE.md`: the look, with an exact palette (a hex value for every role). **Its "The user's notes"
  table outranks everything.**
- `references/STORY.md`: how these shorts are written (structure, white vs red lines, DAY counters, the beat sheet)
- `references/SOUND.md`: the effects library, the recipes, the levels, the master
- the worked example: `src/examples/firstchord.js` (scenes and the beat table `T`) and
  `src/examples/ExampleFirstChord.tsx` (cues). It renders as `ExampleFirstChord`.

`HOW-IT-WORKS.md` (in the kit folder) explains the whole setup in plain words. Hand it to anyone who asks how these
videos are made.

## The loop
1. **Story.** Write it with the formula in STORY.md: an original premise, original lines, and the beats with their
   times.
   - Show it as a beat sheet (time · picture · words · sound) and get an OK, unless the user asked for the file
     outright.
   - A reference video is a structure to follow, never a source of lines, characters or shot-for-shot copies.
2. **Scaffold.** Run `node tools/new-video.mjs <slug> --style inner-voice --seconds <N> --title "<Title>"`. It writes
   `src/videos/<slug>/<Name>.tsx` (cues, `SOUND` with `master: true`), `src/videos/<slug>/<slug>.js` (the scenes and
   the `T` table) and `projects/<slug>/PLAN.md`, and registers the video in `src/Root.tsx` and
   `src/soundtracks.ts`. Put the beat sheet in PLAN.md and the times in `T`.
3. **Build** the scenes with `src/inner-voice/kit.js`. Draw order per frame:
   1. `room`
   2. `moonShaft`
   3. set pieces: `moonWindow`, `wallClock`, `armchair` / `couch` / `bed` / `nightstand` / `desk`
   4. glows (`softLight` + `radial`)
   5. `hero`
   6. `shadowFigure`
   7. words: `caption`, `dayLabel`
   8. `finish(x, frame, { black })`

   Fades are the `black` value in `finish`: fade through black between scenes, never a hard cut, a wipe or a whoosh.
   Copy devices from the worked example: a glance, a phone glow, a time-skip clock, typed red words, a strum, the shadow's
   press.
4. **Verify.**
   - Render stills into a fresh folder each round: `node tools/stills.mjs <Name> out/<slug>/stills-N <times…>`, or
     `auto --sheet`.
   - **Crop the faces** to check expressions; at sheet size they are too small to judge.
   - Check that captions don't touch set pieces (window, headstocks, clock) and that red lines sit near the voice
     that says them.
5. **Sound.** Put cues `{ n, t, g }` from `public/sfx/inner-voice/INDEX.md` on their picture beats (SOUND.md).
   - **New designs:** add them to `tools/sfx/build_inner_voice.py`. A sound timed to this one edit goes in its own
     `tools/sfx/build_<slug>.py`.
   - **Music only if the user asks**, using the `original-music` skill.
   - You can't listen, so measure instead: RMS per 0.5 s (gaps where silence is meant), FFT peaks for pitched
     sounds.
6. **Export** with `node tools/render.mjs <Name>`. It masters the effects (and any music) to −14 LUFS with a true
   peak of −1.5 dBTP or lower.
7. **QC** with `node tools/qc.mjs <Name>`. It reports:
   - **Format:** streams and frames.
   - **Black stretches:** expect the cold open on black and the fades.
   - **Freezes.**
   - **Cuts:** expect none.
   - **Sound:** loudness and peaks.
   - **Sheet:** `dense.jpg`, read beat by beat.

   Write the results into PLAN.md.
8. **Deliver.**
   - Give absolute paths, the beat summary, and the measured loudness. Say that nobody has listened to the mix.
   - On a reference test, also run
     `node tools/compare.mjs <reference> out/<Name>/<Name>.mp4 out/<Name>/<Name>-vs-reference.mp4 --seconds N`.

## Kit cheat sheet (`src/inner-voice/kit.js`)
| Group | API |
|---|---|
| Constants | `W` `H` `BAR=96` `FLOOR=742` `HAND` (Comic Sans MS → Comic Neue) `P` (palette) |
| Time | `ramp(t,a,b,ease)` `life(t,t0,t1,fin,fout)` `typed(t,t0,str,cps)` `track(t,keys)` `E` (eases) `wob` `rnd` `lerp` `clamp` |
| Lines | `shape(x, pts, {fill, stroke, width, seed, amp})` with point builders `rr()` `ell()`; `lineH()` |
| Light | `softLight(x, fn, {blur, op, mode})` (quarter-res blur, cheap) · `radial()` · `moonShaft(x, win, {k})` · `moonWindow(x, win, {moon:[u,v]})` |
| Sets | `room` `wallClock(x,cx,cy,r,minutes)` `digits(x,"5:00",…)` `nightstand(x,X,{time,ring})` `alarmMarks` `bed` `blanket` `armchair` `couch` `desk(x,X,w,on)` |
| Props | `guitar(x,gx,gy,rot,s,{vibrate,phase})` `guitarStand` `phone` `zzz` `sweat` |
| Hero | `hero(x, {x, y, s, lean, breathe, legs:[{knee,foot,toe}…], arms:[{hand,bend,front}…], face, glow, behind, prop, front})` |
| Face | `eyes: dot\|wide\|half\|sleep\|squeeze`, `lid`, `bags`, `brows: flat\|worried\|angry\|sad\|none`, `mouth: line\|smile\|frown\|o\|wavy\|grit`, `look:[dx,dy]`, `turn`, `sweat`, `blink` |
| Shadow | `shadowFigure(x, {x, y, s, op, t, lean, look, eyes, smug, slant, smile, arms, feet})` |
| Words | `caption(x, str, X, Y, {size, color, reveal, op, align, weight})` · `dayLabel(x, "DAY 1", op)` |
| Finish | `finish(x, frame, {black, vignette, grain})` |

New set pieces or props go into `kit.js` in the same manner:
- point lists through `shape()`
- a fill with a slightly lighter outline of the same hue
- a fixed `seed`, so the wobble is the same every frame

## What we learned building the worked example (don't relearn it)
- **The face sits high on the capsule** (centre at `-B.h + 64`). Lower, and the shoulders land at mouth height, so
  an arm seems to come out of the mouth.
- **Shadow eyes:** use `smug` ≈ 0.25 and `slant` ≈ 1.3. With the arcs bowed up (`smug` 1) they read as happy, not
  sly.
- **Red text placement:** keep it near the voice but off the window frame. Place typed text by the full line's
  width; `caption` already does this, so letters never slide while they type on.
- **Glow over the whole figure:** the shadow's glow comes from one silhouette buffer and canvas `shadowBlur`, so it
  wraps the whole figure. Never give each limb its own glow.
- **A held guitar** sits at belly height (origin about `[-10, -50]` hip-local, scale 0.85). Keep the fretting hand
  within arm's reach (≤ 144 px from the shoulder), or the IK clamps it short of the neck.
- **`qc.mjs` flags the cold open as black:** the caption on black reads as "black" because the text covers under
  2 % of the frame. That's expected.
- **Speed:** a 20 s short renders in about 15 s on an Apple-silicon Mac, sound included. Sounds build in about 2 s.

---
name: stickman-explainer
description: Make a narrated "What if…" explainer in the Stickman Explainer style — flat vector figures with round heads and thick limbs, a hoodie hero with rim light, a 2:1 letterbox, a cut on every sentence, data scenes (rulers, bell curves, maps, counters), a gold two-line title card, crisp code-made UI sounds — with the canvas kit src/stickman/kit.js inside Remotion. Use for any Stickman Explainer request: write a "what if" script, voice it (a connected text-to-speech MCP) or animate the user's own voice-over, build a scene, notes on one, or a style test against a reference video.
---

# Make a Stickman Explainer

**Step 0, always: the tool check.** Run `node tools/doctor.mjs`. If anything is ✗, ask the user to install it (see
"First: check the tools" in CLAUDE.md) and continue only when it says ready.

Read first, every time:
- `references/STYLE.md`: frame, palette, type, characters, camera, data scenes. **Its "The user's notes" table
  outranks everything.**
- `references/SCRIPT.md`: the "what if" formula (structure, pace, line rules, facts)
- `references/VOICE.md`: generating the narration with an MCP (or using the user's file), placing it, word timings
- `references/SOUND.md`: the effects library, cue rules, voice clarity, the master
- the worked example: `src/examples/fly.js`, "What If You Could Fly?". It's 37.5 s with 12 shots and has every
  device: a top-down gridlock, an office, a launch from a window, flying over rooftops, a map with a timer, a
  coworker beat, the title card, a vertical altitude climb with whip-ups, frost, and a radar insert. It renders as
  `ExampleFly`.

## The loop
1. **Script.** Write it with the formula in SCRIPT.md: one continuous paragraph per act, second person, present
   tense, in fragments.
   - **Facts:** research every number and give the sources.
   - **Shot plan:** a line → picture table.
   - **Approval:** show it and get an OK before spending credits. If the user brings their own voice-over, skip to 2b.
2. **Voice.**
   - **(a) Generated:** follow VOICE.md §2. Discover the TTS MCP, let the user pick a voice, show the cost and ask
     first, then generate. Save takes in `projects/<slug>/audio/`.
   - **(b) The user's file:** copy it there untouched. Never rewrite or re-voice it.
   - **Place the takes** with `node tools/place-voice.mjs public/videos/<slug>/voice.wav <take>@<seconds> …`.
     Leave a silent gap for the title card.
   - **Word timings:** `node tools/transcribe.mjs public/videos/<slug>/voice.wav <slug>` writes
     `projects/<slug>/words.json`.
3. **Scaffold.** `node tools/new-video.mjs <slug> --style stickman --seconds <N> --title "<Title>"`. It creates
   `src/videos/<slug>/<Name>.tsx` (voice, cues) and `<slug>.js` (the shot table `S` and starter shots), and
   registers both. Set `voice: "videos/<slug>/voice.wav"` in the `.tsx`.
4. **Shot table from the words.** One spoken line is one picture: each shot starts on its line's first word (from
   words.json). Put the table in `S` and in `projects/<slug>/PLAN.md`.
5. **Build** each shot as a function `(x, t)` with `src/stickman/kit.js`:
   - **Layers:** `layer(x, { cam, blur, opacity }, fn)`, with background layers blurred 7–10 px.
   - **Figures:** `figure(x, { … })`, plus props and sets.
   - **Labels:** pills, text (`text()`).
   - **Finish:** `finish(x, frame)` on top.

   Copy devices from fly.js: `pill()`, `speedLines()`, `skyline()`, `rooftops()`, `cloud()`, the title card, the
   altitude climb (a camera keyed with `track()`).
6. **Verify.**
   - Render stills into a fresh folder each round: `node tools/stills.mjs <Name> out/<slug>/stills-N <times…>`, or
     `auto --sheet`.
   - Check every shot at its start and middle. Crop faces and labels. Check that each on-screen number reads
     exactly as spoken.
7. **Sound.** Add cues `{ n, t, g }` from `public/sfx/stickman/INDEX.md` on their visual beats (SOUND.md).
   - New effect designs go into `tools/sfx/build_stickman.py`.
   - **Music only if the user asks**, using the `original-music` skill.
8. **Export** with `node tools/render.mjs <Name>`. It mixes the voice, effects (and music) to −14 LUFS with a true
   peak of −1.5 dBTP or lower.
9. **QC** with `node tools/qc.mjs <Name>`. It reports:
   - **Format:** streams and frames.
   - **Black stretches.**
   - **Freezes:** a held shot of 0.6 s or more needs a little life (sway, drift).
   - **Cuts:** compare them to the planned shot times.
   - **Loudness.**
   - **Voice clarity:** the voice over the effects and music, median ≥ 12 dB. Move effects into the gaps if it's
     lower.

   Write the results into PLAN.md.
10. **Deliver** absolute paths, the beat summary and the measured loudness. Say that nobody has listened to it yet.

## Kit cheat sheet (`src/stickman/kit.js`)
| Group | API |
|---|---|
| Constants | `W` `H` `BAR=62` (2:1 letterbox) `SANS` (Open Sans) `C` (palette: `ink crowd hoodie rimWarm rimCool eye navy navyDeep cream robot wood…`) |
| Time | `ramp(t,a,b,ease)` `track(t,[[t,v,ease]…])` `E` (eases) `wob(t,seed)` `rnd(i,seed)` `lerp` `clamp` |
| Draw | `rect` `circle` `ellipse` `poly` `line` `path(x,svgPath,fill,stroke,w)` `at(x,tx,ty,rot,sx,sy,fn)` `alpha(x,a,fn)` `text(x,str,X,Y,{size,weight,italic,align,track,fill,glow:[color,r1,r2,k],stroke,strokeWidth})` `glow` `linGrad` `radGrad` |
| Camera | `layer(x,{cam:{cx,cy,s,rot},blur,opacity},fn)` · `CAM0` · `finish(x,frame,vignette,grain)` |
| Figures | `figure(x,{x,y,s,pose,tone:"hero"\|…,face:{eyes:dot\|wide\|smug\|happy\|closed,mouth:smile\|smirk\|grin\|flat\|o\|chatter,look,brows,blink},rim:{color,width,dx,dy,glow},holdR,holdL,flip,outfit:{hoodie,dark,shade,strings},build:"muscular",hair:"quiff"\|"bun",shoes,rot,flutter})` · `STAND` `walk(phase,stride)` `armIK(dx,dy,bend)` `joints` |
| Hands | `robotHand` `handAt` `holdHand` `watch` |
| Props | `phone` `bars` `battery` `steam` `mug` `plateToast` `tweezers` `chip` `screwTray` `car` |
| Sets | `desk` `elevatorHall` `garage` `kitchen` `tileCounter` `steelWall` `voidBg(x,tint)` |
| Data | `peopleBell` `bellCurve` `ruler` `valueLabel` `farAxis` (a normal curve on an axis: `iqX`/`curveY` map a value to x/y) |

New props and sets go into `kit.js` as flat shapes with one light idea each.

## What we learned (don't relearn it)
- **A held shot needs life:** a held shot of 0.6 s or more freezes. Add a sway, drifting clouds or streaks.
- **Arcs:** a high-jump arc reads only with a hip-pivot path (the body rotates about the hips), landing on the back,
  not upside-down.
- **Effects under the voice:** effects on top of words drop the voice clarity. Put hits in the pauses (words.json),
  and duck the music under speech.
- **Speed:** a 37.5 s video renders in about 20 s on an Apple-silicon Mac, sound included.

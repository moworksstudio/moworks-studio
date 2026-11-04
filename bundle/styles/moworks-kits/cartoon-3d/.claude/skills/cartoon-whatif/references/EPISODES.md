# 16:9 production and episodes

cartoon-video's `PIPELINE.md` is the shared loop for every video (scaffold, voice, word times, stills, collision QA,
the approval gate, export, QC, render review). This file adds only what is different for 16:9 and for long, chaptered
episodes. If the two disagree on a shared step, `PIPELINE.md` wins; on staging, `STAGING.md` wins.

§1 applies to every 16:9 piece. §2–§9 are for episodes.

## 1. What changes from 9:16

| Topic | 9:16 short | 16:9 |
|---|---|---|
| **Field of view** | Three.js `fov` is **vertical**. At vfov 40 the frame is 23° wide | At the same vfov 40 it is 66° wide: 3.16× the width (vfov 30 → 17° vs 51°; vfov 52 → 31° vs 82°) |
| **Porting a shot** | — | Keep vfov and distance for the same subject size, then **fill the new width**: a second character, a reaction, set dressing. Never leave bare floor at the sides |
| **Starting vfov** (confirm on stills) | 36–58 in the first tests | `objectClose` 24–34 · a single `characterClose` (chest-up, ~2–2.6 m) 22–30 · two-shot 32–40 · `wideBright` group 42–55 · `roomHigh` 48–58 |
| **Staging** | one subject, stacked vertically | **Side by side.** "You" (Mika by default) on one third, the reaction on the other. Rows of 3–4 for group reactions. Over-the-shoulder pairs for dialogue. Look-room toward the open side |
| **Shot mix** | close-ups dominate | More wides and two-shots. Every new set opens on an establishing wide, then two-shot → close-up → insert. Reaction shots carry the jokes |
| **Camera moves** (inside a shot, slow, eased) | push, slight orbit | Add the **truck** (a lateral dolly along a row of characters or a counter), the 16:9 signature move; also a push, a slight orbit, or a 0.1–0.3 m crane. No whip pans, crash zooms or shake unless the user asks |
| **Axis** | — | Keep the camera on one side of the line between two talking characters (the 180° rule) for the whole exchange |
| **Shot length** | 1.5–2.5 s | pieces 3–3.5 s · episodes 3–6 s; nothing static over 4 s (pieces) or 8 s (episodes) |
| **Set coverage** | edges hidden | Wides show far more of the set: dress the side walls, ceiling and far background. Check the frame edges on full-res stills |
| **Ink outline** (`outline`, output px) | tuned at 1080 wide | Keep the looks' values for close-ups. In wides the characters are smaller on screen: stay ≥ 4 px and check that faces don't clog |
| **Depth of field** (`blur.cocScale` / `blur.maxCoc`, output px) | tuned for 9:16 | Blur should scale with the subject's size in pixels. A shot ported at the same vfov has subjects ≈ 0.56× as tall in px, so start at ≈ 0.56× the look's values. A shot re-framed tighter starts at ≈ 1.0×. Judge on full-res stills |
| **Captions** | top at y ≈ 1300 | The kit's landscape default: one word at a time, top at y ≈ 820, 84 px, centred. Keep faces and key props out of y > 760 while captions run |
| **Text** | in the world | Still in the world (whiteboards, signs, screens, posters) as the main text carrier. The title question is written in the set |

**Captions by format**
- **30–50 s pieces:** the kit's word-by-word captions, on.
- **Episodes:** the word-by-word captions work today. The alternative is punch words only (the title question,
  numbered signposts, any spoken figure, the kicker) plus full subtitles on YouTube (upload the script as a transcript
  in YouTube Studio and let it sync the timing). Punch-only needs a small kit change, a caption that disappears at its
  word's end (today a caption stays until the next word), so ask before changing `src/kit/`.
- **Numbers on screen** are exactly as spoken.

## 2. Splitting an episode: chapters → scenes → shots

| Level | Rule |
|---|---|
| **Episode** | One base slug (e.g. `what-if-stronger`) and one project folder `projects/<ep>/` holding the script, the chapter table, the cast/voice table, the set list, the `verify` list and the continuity table (in PLAN.md) |
| **Chapter** (FORMATS.md B) | **One composition + one voice file + one `-Check` composition + one cue list** (`SFX` in its `vo.ts`). 25–130 s each. Scaffold each as `node tools/new-video.mjs <ep>-c00 --format long --title "<Title> · Cold open"` → `<Ep>C00`, then `-c01` → `<Ep>C01`, … |
| **Scene** | One set, inside a chapter. A chapter may cross 1–3 sets with hard cuts |
| **Shot** | One spoken beat, with one look |

- **Per chapter**, run the PIPELINE from the voice to the export (voice → word times → shots → build → stills → QA →
  show → export → QC → render review). Chapters can be approved and exported one by one.
- **Assembly** happens in the user's video editor: the chapter MP4s in order. Once a chapter MP4 is on their editing
  timeline, don't move or rename it (editors link to the file path); a fix re-renders to the same path after you ask.
- **Parallel building** (optional): chapters that share no files can be built at the same time by subagents, if you
  can run them. Freeze the shared set modules first, give each agent only its own chapter folders, and run every
  chapter's collision QA yourself afterwards.

## 3. Voices

- **Narrator:** one voice for the whole series, with the same settings for every chapter (the known-good settings
  live in `VOICE.md` and `kit.config.json`). Generate a chapter's text in one or a few takes.
- **Dialogue:** each side character gets one fixed voice, logged in the cast table in `projects/<ep>/PLAN.md`
  (character · voice name or id · settings). Each line is its own short file; save takes in `projects/<ep>/audio/`.
- **Cost:** preflight it and ask before spending, as `VOICE.md` says. Budget about 1.5× one clean pass for retakes.
- **The kit plays one voice file per composition** (`ToonVideo` takes one `voice`). So for a chapter with dialogue,
  lay the narration pieces and the lines, in spoken order, on one timeline first, each starting where the last one
  ends plus a short pause (~0.3 s; measure each take's length with ffprobe):

  ```bash
  node tools/place-voice.mjs public/videos/<ep>-c03/voice.wav projects/<ep>/audio/n01.wav@0.2 projects/<ep>/audio/ravi01.wav@6.9 projects/<ep>/audio/n02.wav@8.4
  ```

  Then `script.txt` holds every spoken word in the same order (narration and lines), and `vo-words.mjs` times the
  joined file as usual. Timed separate voice clips would need a kit change: ask before changing `src/kit/`.
- **Talking faces:** the cast has a `talk` expression (an open mouth; there is no lip-sync). Switch it on for the
  speaker during their line's words (from the word times) and back to `calm` or `neutral` after.
- **Every take** goes through `vo-words.mjs` before you build on it; it catches stray words at the tail.

## 4. Continuity table (episodes)

One row per state that must carry across shots and chapters, kept in `projects/<ep>/PLAN.md`:

| What | Example |
|---|---|
| Who holds what | Mika has the bent mug from C03 on |
| Bandages and injuries | a burn in C04 stays bandaged in C07 |
| Time of day and sky | `day` until C06, `dawn` from C07 |
| Prop states | a broken door stays broken |
| Seating | where each character sits in the office |

Check it against the stills of every chapter.

## 5. Reusing sets across chapters

- **One module per set**, built once and imported by every chapter that uses it. The office ships in the kit
  (`src/kit/sets/office.ts`): reuse it first. New sets are made with the character-builder skill and live as
  `src/sets/<name>.ts`.
  - Each module exports its build function and its anchors: seats, walk-lane waypoints, door positions, named camera
    marks.
- **Place each set at its own world origin**, ≥ 30 m apart, so wides never catch another set. Build only the sets a
  chapter uses.
- **New look, same set:** dressing by texture (signs, posters, whiteboard text, a notice on the glass), the sky
  (`day` / `dawn`) and the look (`wideBright` vs `propGlow`) make the same room read as a new scene.
- **Recurring sets** worth building once and keeping: the office floor and desk cluster, the coffee counter, the
  meeting room, a first-aid room, a stairwell, a street corner, a rooftop. Write their coordinates and anchors into
  the project's PLAN.md the first time.
- **Collision QA runs per chapter**, after every blocking change (`node tools/qa.mjs <Ep>Cnn` → `COLLISION none`). A
  shared set changed for one chapter means re-running the QA of every chapter that uses it.

## 6. Sound

- **Rules:** `SOUND.md` (the source of truth; its levels win over the gains below). The code-made kit is
  `public/sfx/kit/`.
  - Key moments only: ≈ 1 cue per 3–4 s at most, ≤ 3–4 per scene, ≥ 0.5 s apart.
  - **Never** a whoosh, swoosh, swish, whip, riser or vine-boom. A cut or a camera move is silent; a moment that needs
    weight gets one of the cues below.
- **Long chapters:** aim lower, about 1 cue per 6–10 s. Story chapters breathe.
- **Silent:** the title question, captions, in-world text, cuts, camera moves, dialogue lines, and every item after
  the first in a row.
- **Music:** none by default. Only if the user asks, with the original-music skill.

| Moment | Cue | Gain (dB) |
|---|---|---|
| A physical hit that IS the beat (a kick, a door landing, a fall) | `impact` | −9…−8 |
| Something goes wrong (a burn shows, an ankle rolls, a machine dies) | `blip-down` or `glitch` | −8…−6 |
| A win that helps someone (pouring for the team, a rescue lands) | `win` | −8…−7 |
| A verdict object (an X-ray crack, a diagnosis card, a scoreboard) | `chip` | −5…−4 |
| One small key action (a jab, a switch, a button) | `tick` | −5…−3 |
| Many things land, or a counter runs | `count` | −7…−6 |
| The power switches on, or an object transforms | `lock` or `blip-up` | −8…−6 |
| A cursor press on an in-world screen | `click` | −16…−15 |

Cues are `{ n, t, g }` in the chapter's `vo.ts` `SFX` list. Put them in the voice's pauses where you can.

## 7. Loudness and delivery

- **Every piece and every chapter: −14 LUFS integrated.** `node tools/render.mjs <CompId>` masters it; `qc.mjs`
  measures it. Use the same settings for every chapter of an episode.
- **After assembly**, measure the whole episode the user exported from their editor:
  `ffmpeg -nostats -i <episode>.mp4 -map 0:a -af ebur128=peak=true -f null -` (read the integrated loudness and true
  peak from the summary). Chapters at −14 each land close, but report the measured figure, say "measured, I can't
  listen", and let the user's ears decide.
- **Delivery per chapter:** the chapter id, stills, length, measured loudness, the render-review result, the
  unverified claims and absolute paths.
- **Never play audio or video.**

## 8. Render and QA time

Measured on an Apple-silicon Mac; yours may differ. A render costs about 0.06 s per frame (1920×1080 has the same
pixel count as 1080×1920); collision QA about 0.023 s per frame; bundling about 6 s per run. Full renders measured:
a 49.7 s 16:9 piece in 77–79 s, a 60 s 9:16 short in 87–113 s. Rendering several videos at once makes each about 3×
slower, so render one at a time.

| Piece | Frames | Render | With ×1.5 margin (heavier 16:9 wides) | Collision QA |
|---|---|---|---|---|
| 30 s | 900 | ≈ 54 s | ≈ 1.5 min | ≈ 21 s |
| 40 s | 1,200 | ≈ 72 s | ≈ 2 min | ≈ 28 s |
| 45 s | 1,350 | ≈ 81 s | ≈ 2 min | ≈ 31 s |
| 50 s | 1,500 | ≈ 90 s | ≈ 2.3 min | ≈ 35 s |
| one 70 s chapter | 2,100 | ≈ 2.1 min | ≈ 3.2 min | ≈ 48 s |
| 8 min episode | 14,400 | ≈ 14 min | ≈ 22 min | ≈ 5.5 min |
| 10 min episode | 18,000 | ≈ 18 min | ≈ 27 min | ≈ 7 min |
| 12 min episode | 21,600 | ≈ 22 min | ≈ 32 min | ≈ 8.3 min |

- **Build time is the real cost, not render.** The first 10 s from scratch (7 shots, sets and cast built new) took
  about 30 min; a finished video took about an hour of building. A 45 s piece adds about 13–16 shots, 1–2 new sets,
  ~10 new props and new poses.
- **Log the build time** of each piece and chapter in its PLAN.md, so the user's own numbers replace these.

## 9. QA checklist per chapter (on top of the PIPELINE's checks)
- [ ] A still of every shot (first, key beat, last) at full res, plus the contact sheet
- [ ] Frame 0 is not empty; the last ≥ 0.5 s is a still
- [ ] Faces read in wides; "you" sits on a third; nobody is cut by the frame edge by accident
- [ ] The caption zone (y > 760) is clear while captions run
- [ ] The camera is not inside geometry; no bare set edge at the frame sides
- [ ] `COLLISION none` from `node tools/qa.mjs <Ep>Cnn`
- [ ] The continuity table matches the stills
- [ ] Every `verify` line is checked, or listed in the delivery as unverified
- [ ] The voice matches the script (`vo-words.mjs` reported no issues on the file in use)
- [ ] `qc.mjs` passes; the render-review skill reports no must-fix

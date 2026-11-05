# Checklist: walk it on every still round, before showing anything

Each item once cost a revision. Look at the stills at full size; don't assume.

**Checks that run**
- [ ] `node tools/check.mjs` passes.
- [ ] `node tools/qa.mjs <CompId>` prints `COLLISION none`.
- [ ] `vo-words.mjs` said `ISSUES none` on the voice file `VOICE` points at.

**Story match**
- [ ] Every spoken sentence has its picture, and each shot starts on its phrase (≈ 0.07 s before).
- [ ] Each key action lands on its stressed word; the subject of a line is on screen when it's named.
- [ ] Continuity holds across cuts: who holds what, in which hand, injuries and bandages, time of day.

**Characters**
- [ ] Faces read: three-quarter to the lens (≤ 50° off) when the line is about them; no face cut by the edge or hidden
      behind someone by accident; characters ≥ 0.7 m apart.
- [ ] The expression fits the line, on the word.
- [ ] No broken poses: no elbow bending backwards, no arm through the torso, feet on the floor (not in it, not above it).

**Props**
- [ ] Every held prop is gripped from the outside at its grip point; the right part is held (handles, not hot parts).
- [ ] Every tool touches what it acts on.

**Frame**
- [ ] Frame 0 already shows the scene; the last ≥ 0.5 s is a still.
- [ ] Nothing static longer than the format allows (shorts 3 s, 30–50 s pieces 4 s, episodes 8 s).
- [ ] The caption band is clear of faces and key props (9:16 ≈ y 1300; 16:9 y > 760).
- [ ] No set edge or bare floor at the frame sides; the camera is never inside geometry.
- [ ] One look per shot; the window sky is the one you meant.

**Render**
- [ ] No blown-out white signs, no bloom halo over a face or text, no z-fighting flicker, no sprite cut by geometry,
      no scribbly outline on thin rings, no depth-of-field halo around edges.
- [ ] In-world text is legible, spelled right, not mirrored, and matches the voice; numbers exactly as spoken.

**Honesty**
- [ ] Every real-world claim is in `FACTS.md` with a source; anything unverified is listed for the user.
- [ ] No real person's likeness, no brand logo, no other creator's character, line or frame.

**Sound** (after `render.mjs`)
- [ ] Cues on key moments only (≈ 1 per 3–4 s at most), on the visual hit, none on plain text; no whoosh family.
- [ ] With a voice: −14 LUFS (±0.5), true peak ≤ −1.5 dBTP, voice clarity median ≥ 12 dB, reported as measured.

**Delivery**
- [ ] The stills sheet, a beat-by-beat summary, the cue list, the review result, the unverified claims and absolute
      paths.
- [ ] A row in `projects/<slug>/PLAN.md → Versions`.

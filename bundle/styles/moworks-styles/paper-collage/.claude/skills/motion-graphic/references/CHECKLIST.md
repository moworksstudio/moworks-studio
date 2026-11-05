# Checklist: walk through it on every still round, before showing anything

Each item once cost a revision. Look at the stills; don't assume.

**Rhythm**
- [ ] Frame 0 already shows something designed. The last ~0.5 s is a finished still (or a designed loop for a requested GIF).
- [ ] Something changes every 0.5–1.2 s, on its beat (check `B` against the transcript / the plan). No still stretch
      over ~1.5 s, no gap over ~0.3 s between scenes.
- [ ] Transitions alternate (up / from the right / dark / blur), never the same twice in a row. Each scene has its own seed.
- [ ] Max 2 power moments.

**Type & colour**
- [ ] Display words use `RiseWord` with no tilt. Every highlight is exactly its word's width. Headlines are big enough
      (STYLE §5).
- [ ] One red word group and one highlighted word per line. Money is green and the alarm number is red.
- [ ] Strikes and underlines are clean bars, not dashes.
- [ ] Every label is fully inside its paper. Nothing is clipped at the frame edge or under the headline band.
- [ ] (Vertical for Reels/TikTok) nothing important sits in the bottom ~250 px or under the right-edge buttons.

**Marks & images**
- [ ] No arrow without a reason. Circles hug only their item.
- [ ] Cut-outs are clean (no glow halo), black-and-white halftone with a white edge, no real faces, no logos the user
      didn't supply. Screenshots are untouched.
- [ ] Nothing flies across the hero object.

**Honesty**
- [ ] Every number on screen is real, and exactly as spoken if there's a voice. Sources are shown, projections are
      marked, and unverifiable figures are flagged to the user.
- [ ] No invented quotes, comments, usernames, reviews or genuine-looking documents.

**Sound** (after `render.mjs`)
- [ ] Cues only on key moments, none on plain text. No whoosh unless the user asked.
- [ ] With a voice: −14 LUFS, true peak ≤ −1.5 dBTP, reported with "measured, I can't listen".

**Delivery**
- [ ] Stills sheet sent, plus a beat-by-beat summary, the sound count, things to double-check, and absolute paths.
- [ ] `projects/<slug>/PLAN.md` "Versions" has a row for this version.

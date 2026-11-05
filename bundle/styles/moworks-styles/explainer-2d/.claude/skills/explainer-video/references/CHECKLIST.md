# Checklist: every snapshot round, then delivery

Walk it frame by frame. Every "no" is a fix before the next round.

## Story
- [ ] Each frame shows what the voice says at that moment (check against `STORYBOARD.md` times).
- [ ] Every event lands on its word: arrivals, pops, labels.
- [ ] Every sentence of the script has its shot. Nothing important happens off-screen.
- [ ] Continuity across cuts: the same object keeps its colour, side and state.

## Look (`STYLE.md`)
- [ ] Flat cel shapes, one hard shadow per form, a thin rim. **No outlines.**
- [ ] Deep indigo or violet grounds with light pools; nothing black, grey or flat.
- [ ] Glow only on emitters. One cool hero accent per film, and it's the thing the film is about.
- [ ] Detail at three scales, and the detail never competes with the subject.
- [ ] Ambient life in every shot: two snapshots 0.5 s apart inside one shot differ.
- [ ] No text drawn by a module; every label comes from `HOUSE.ui`.

## Labels and type
- [ ] Figtree everywhere (a rounder or system-looking font means the font files are missing).
- [ ] Spelled right, matching the spoken words; numbers exactly as spoken and in the fact sheet.
- [ ] No label starts in the last 0.3 s of a shot; callouts are gone 0.21 s before the cut.
- [ ] Labels sit where things are, never on a path something is about to cross.
- [ ] No full stops on screen.
- [ ] 9:16: every label and the title inside x 60–960, y 250–1450; the title at y ≈ 500–700.

## Composition and motion
- [ ] The subject on a third, generous negative space; one idea per beat.
- [ ] A new element every 1.5–3 s; no shot sits still.
- [ ] Hard cuts only, 0.05 s before their word.
- [ ] No canvas edge showing during the drift.
- [ ] Fast things read as streaks, not as jumping dots.
- [ ] The title pops word by word after the last word; the last 0.6 s fades to black.

## Delivery (after `render.mjs` and, if on, the review)
Send one message with:
1. The title, the absolute path of the MP4 (`<dir>/renders/<slug>.mp4`) and of a contact sheet
   (`<dir>/snaps/<last round>/sheet.jpg`). Offer to open the MP4 in their player; never play it yourself.
2. The length, the format, and the QC numbers: frames, loudness (LUFS), true peak (dBTP), frozen frames (none), cuts
   (n of n planned), transcript differences (0). Say **"measured, I can't listen"**.
3. **What was checked and what wasn't**: which moments you looked at, and that nobody has watched it in real time.
4. The **weakest moment** (time range and why), and what you'd change with more time.
5. Any fact-sheet line still unverified.
6. The review result, if the review ran (defects found / fixed / left).

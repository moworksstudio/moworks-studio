# What did the owner give? The way of working (the Assets step)

From the Moworks Motion kit 2.0.4 (`SKILL.md` step 4, `workflow/keep-design.md`, `workflow/free-design.md` "Style reference",
`workflow/remake.md`, `workflow/reframe.md`), rewritten for Moworks Studio. The app copies every file into the project (`assets/<kind>/`
for what the film uses, `sources/` for PSD, PPTX, PDF, AI and documents) and prepares what you cannot open; `.moworks/scan/INDEX.md`
lists it all: PSD / PSB layer trees, text layers (words, font, size, colour) and a picture of each artboard or top-level group; PowerPoint
slides as pictures with their texts and notes; PDF and AI pages as pictures with their text; video contact sheets, cut times and speech;
music tempo, bar starts and loudest passages (sung words only when Whisper heard enough of them: the app transcribes speech, not
singing; a song's lyrics come from the owner, timed by the app into `LYRICS-TIMED.md`); numbered pictures as one sequence; archive contents. Read all of it, write `docs/ASSETS.md`,
propose ONE way of working with a one-line reason, and stop for the owner's choice.

## 1. Choosing

| The owner gave | Way of working |
|---|---|
| Only text, copy, an idea or a song (no design) | **Free design**: you design layout, graphics and motion; the story first (`story.md`, not for a song film), then the storyboard options (two, `SKILL.md` §1) |
| A finished design (PSD / PSB, a deck whose slides are the final frames, PDF or images of the final frames) | **Keep design** |
| A finished design for another format or brief | **Re-layout** |
| A deck or PSD the brief does not say to keep (e.g. a credentials film from a company deck) | **Free design** with its content |
| A video or images as a reference for its look | **Style reference** (drawn or acted content: always; built content: when the owner wants its style) |
| A video to copy shot by shot ("copy y chang", "1:1", "giống hệt"), or a film to rebuild when only its video exists | **Remake** (built content: a close copy is fine, never 100 %; drawn or acted content: a heavy job, say its cost first) |
| Unclear (a collage of screenshots, design for only some shots, rough sketches) | ask ONE question: keep this design exactly, or design it anew? |

A mixed film is decided shot by shot. The owner confirms or changes the way of working in the Assets dialog; it can change later (the
steps after it then need a redo).

## 2. Keep design

The design is approved. Your job is animation only. Positions, sizes, crops, colours, fonts and weights, every word, the order of shots,
which elements exist and their layering stay exactly. Never "improve" the layout. If something in the design blocks the motion (two
elements that would collide when animated), stop and ask with a one-line proposal. **Tolerance: up to 2 px off the design passes.**
- **No storyboard step.** The design is the storyboard: rebuild each frame as a still composition (full-resolution assets win over preview
  pictures; for a PSD / PSB call the app's **psd_layers** tool per frame: its layers as PNGs at the film's width with `layout.json`
  positions, and every text layer's words, font, size and colour to set as live text); the app compares your stills with the owner's frames; fix real differences (a font, a missing element); the owner approves.
- Fonts: the design's own font files. A missing font file or element: list it and ask; a stand-in is temporary, say so.
- Motion Plan, then build. The motion is yours and free (any entrance, path, overshoot, mask, camera move, drifts while it holds); the only
  fixed point is the REST state: when a shot fully settles, every element sits on its designed place, size and colour.
- Strong dynamic level here means large drifts and slides while a frame holds (a first cut that holds the layout too tightly reads "tame").
- A guideline that the artwork breaks: keep the artwork and tell the owner what differs.

## 3. Re-layout

Every element and all its content stay exactly (text, pictures, logos, and when a film exists, its motion, timing and sound); only positions
and sizes change, sensibly for the new frame. Never crop, never drop or add an element. Design FOR the new frame: 9:16 for Reels / TikTok /
Shorts keeps key text and logos out of the top ~14 % and the bottom ~20 %; type sized on the short side. Standard frames: 16:9 1920×1080 ·
9:16 1080×1920 · 1:1 1080×1080 · 4:5 1080×1350.

## 4. Style reference

Take its look and its grammar (rhythm, framing, type behaviour, transitions), never its content, logos, characters or compositions.
1. From the app's contact sheets of the reference, write `STYLE-GUIDE.md`: palette (hex), type (families, weights, sizes, case), the art
   style (flat or textured, line or no line, shape language, proportions, how sets are drawn), shot length, how shots change, camera moves,
   texture, how text enters and leaves, density, what makes it feel like itself; and a list of the reference's shots, one line each (what
   it does, not a plan to copy it).
2. **Stop** for the owner's OK, then the three storyboard options in that style.

## 5. Remake

The reference video is the storyboard: layout, sizes, timing, easing, camera, cuts, blur and rhythm are copied; only the content is swapped.
1. From the app's contact sheets (every 0.25 s, cuts marked) and beat map of the reference, write `SHOTS.md`: one row per shot (start, end,
   frames, length), split where the picture changes state: **REF shows** (layout, sizes, what moves and how) · **Swap** (what the client's
   version shows instead) · **Notes** (camera, easing, blur, cursor, typing cadence).
2. **The swap rules**, written under the table and approved with it (this is the job's gate, instead of a storyboard):
   - Brand: the old brand's logo, colours, fonts and copy become the client's; the client's logo follows rule 5. Where the reference animates
     its logo, the motion moves to a shape around the client's logo. An open-outline logo gets its own backing; a move that warps the frame
     fades the logo out before the warp.
   - No reference people (photos, faces, voices), no reference sound (music, voice, effects), true copy (illustrative numbers labelled
     "Example"), no implied partnership.
3. Shots = scenes at the reference's exact times. Text measured on the sheets and fitted to the client's words; a longer word changes the
   width, and that is the only allowed difference: report each one.
4. Review against the reference: positions and sizes within about 1-2 % of the frame, cuts on the same frame, the same easing feel,
   differences only where the swap forces them; the round report is a table: shot · times · MATCH / CLOSE / ROUGH · what still differs.

## 6. Characters

Character films (cartoon acting, people or hands moving frame by frame, vector artwork to rig) are not part of the pipeline yet: the app
will get a character library (make, rig, add to project). Until then, say so when a brief needs it, and offer what works without it
(built content, pictogram people, the client's photos or footage).

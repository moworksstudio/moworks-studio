# Motion Plan: the second approval gate (numbers, not adjectives)

From the Moworks Motion kit 2.0.4 (`workflow/free-design.md` gate 2, `workflow/film.md` "The numbers"). The Motion Plan is a **file**,
`docs/MOTION-PLAN.json` in the project root, that the owner reads as a table in the app's Motion plan dialog and approves there. Never paste it
as a chat table instead; in your reply give only a short summary and the questions.

## 1. The file

```json
{ "version": 1,
  "dynamic": "strong",            // row 0: "light" | "strong" (recommend strong: Moworks is a motion studio)
  "groove": "none",               // row 0: "none" (default) | where it pulses ("backgrounds on downbeats, product on the drops")
  "banned": ["title on a gradient", "fade-and-slide-up on every element"],   // the defaults this film never shows
  "qa": ["2.5 s logo lands at centre", "6.0 s no text overlaps the product"], // what you will check on the built film
  "shots": [ { "shot": 1, "motions": [
    { "target": "headline", "type": "entrance", "start": 0.2, "duration": 0.7, "ease": "expo.out",
      "behavior": "SALE stamps from 1.6x to 1x on the word 'sale' (0.2 s), holds with a 2 % push, exits up 120 px in 0.35 s (expo.in)",
      "source": { "kind": "library", "id": "<id from the library search>" }, "status": "planned" } ] } ] }
```

- `type`: entrance · emphasis · exit · transition · loop · camera · text · other. One row per move; the hold and the exit are rows too.
- `start` / `duration`: seconds within the shot. A voiced film: each piece enters on the word that names it (its time from
  `transcript.json`), mostly in the back half of its beat, never all in the first quarter.
- `behavior`: concrete moves, never adjectives: "the word SALE stamps from 1.6x to 1x, back.out, 0.25 s, on beat 9", not "the text comes in
  lively". Turn every adjective of the brief into numbers (section 3).
- `source` of each row:
  - `{ "kind": "library", "id": … }`: an item of the Motion Library (HyperFrames registry blocks and components, Magic UI, Codrops,
    TakayuStudio, the studio's own motions). Find it with the app's **library_search** tool (the id it answers), or take the item the
    owner named; never invent an id. When the owner approves the plan, the app copies every cited item into `.moworks/library/` for the build.
  - `{ "kind": "hf", "id": "motion.md#<section>" }`: a move HyperFrames' `hyperframes/references/motion.md` describes (its sections:
    motion craft, transitions with a cause, the right mechanism…), read in full before you build it.
  - `{ "kind": "claude" }`: written new for this film. Every shot carries at least one move written for this film.
- An element that crosses a cut has its position, scale, opacity and direction / speed at the cut on both shots' rows.

- `says` on each shot: one plain line in the owner's language that a non-animator can judge, what moves and how strongly
  ("kính bung ra rồi xoay chậm quanh bà, trôi rõ; bà thở và nghiêng đầu; máy quay lượn 15°"); `approving` once for the plan: one line
  saying what the owner approves (the moves of every shot and how lively they are, not the final look). On every row, `name`: the
  element in 1-3 words ("Tiêu đề", "Tấm kính"; the `target` selector is never shown to the owner), and `plain`: a few words in the
  owner's language with no numbers or code words ("trồi lên nhẹ rồi đứng yên", "trôi chậm, xoay nhẹ"); the numbers stay in `behavior`,
  which the dialog shows behind "Show timing".
- The Motion Plan step writes only `docs/MOTION-PLAN.json` (and `STORYBOARD.md` when the step asks): no composition, no `index.html`. The
  Build writes the film once, from the approved board's layouts.

Check it before you hand it over: logos as rule 5 (whole, never distorted, never in the groove); rule 2 (text readable while read); an out
move only after its in move on the same property has ended. Then **stop** until the owner approves (their edits in the dialog come first).

## 2. Library first, then your own

Design the film first (the look, every shot's composition, the motion language). Then, for each shot, call **library_search once** before
you write any new move for it, and take an item only where it saves real work: chart / counter / map engines, device and app chrome, code windows, 3D, captions, springs, a transition you would write the same
way, a block that already is the shot. A library item is restyled to the film, never a whole scene as it ships, and one library block is
never the main beat of two shots. What the owner named or picked from the library is used exactly.

## 3. The numbers

From the "Motion Lab" study the kit used: every adjective left in a spec is a decision handed to the default look.
- **Easing by role:** entrances ease out (`expo.out` 0.16,1,0.3,1 for text and logo reveals; `power4.out` / quint 0.22,1,0.36,1 for a premium
  entrance); moves across the frame and camera ease in-out (quart 0.76,0,0.24,1; camera the softest: sine / quart); exits ease in
  (`expo.in` 0.7,0,0.84,0) and run 40 to 50 % shorter than their entrance; a playful pop `back.out` (0.34,1.56,0.64,1). Linear only for a
  rotation, a progress bar or a loop's phase: linear on a move is what makes a render look like a render.
- **Springs by damping ratio:** 1.0 never bounces, 0.7 to 0.85 premium, 0.4 to 0.6 playful, under 0.3 a cartoon. Position and size may
  bounce; opacity and colour never.
- **Hierarchy:** one hero move per shot. Secondary moves travel 50 to 70 % as far and start 100 to 200 ms later (or when the hero is 30 to
  50 % done); ambient motion is smaller than the hero's, on a slow sine, never stops, and never goes under the minimums of
  `.moworks/rules/moworks-alive/SKILL.md` (nothing still for more than 2 s, objects always drifting, characters always
  moving). Everything else waits or dims to 40 %, still drifting.
- **Durations and stagger:** UI feedback 100-200 ms, UI moves 200-500 ms, hero reveals 600-900 ms; letters 30-45 ms apart, words 60-120 ms,
  list items 40-80 ms; the next one starts when the previous is 30 to 50 % done (all sequential reads robotic, all at once cheap).
- **Beats:** every beat from time (n × 60 / BPM, the beat map the app made), never a rounded frame count added again and again; cut on the
  beat, change the layout on the bar (every 4 beats). The impact lands ON the beat or word, so the move starts before it.
- **Camera and depth:** parallax speeds 1.0 foreground, 0.5 middle, 0.2 background; at phone size push key poses 10 to 30 % further than
  feels right. Zoom in log space (equal ratios take equal time); never zoom in and straight back out.
- **Readability:** text 4.5:1 contrast on every frame (3:1 for large text), never more than 3 flashes a second, every text held its reading
  time (0.5 s + 0.3 s per word).
- **Loops:** frames 0 to N-1 (frame N is frame 0 again); every cyclic move in whole cycles of phase = frame / N; frame 0 is a finished
  composition.

## 4. Dynamic level and groove (row 0)

- **light:** elements settle, then keep a small float (never still for more than 2 s). **strong** (recommend): nothing on screen is ever still: multi-line supers enter alternately from left
  and right (±900 px, expo.out), their lines drift in opposite directions while held and leave both ways; backgrounds drift or zoom, people
  breathe, stickers float; always-on layers big enough to cover the frame (a drifting pattern, 30-60 particles, a new world every 1.5-3.5 s).
  In keep design, strong means large drifts while a frame holds; the designed place (2 px) binds only when the shot has fully settled.
- The numbers each level needs at the least (drift, rotation, push, camera, characters' idle, something new every 1.5-3.5 s) are in
  `moworks-alive` §2; the brief's motion words ("xoay quanh", orbit, spin) become that real motion (§1 rule 5).
- **groove** (only when the owner wants it; never a default; slow or soft music: none): elements nudge on the song's grid: stickers hop,
  bubbles pulse, rings bloom on the downbeats, the hero punches on its montage words. Text while read at most about 3 %. Never a logo. The
  groove never decides when text appears: sung words still enter on their sung times.

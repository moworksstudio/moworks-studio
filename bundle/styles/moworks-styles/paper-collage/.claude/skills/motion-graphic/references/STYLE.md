# The style: what a good graphic looks like

These are the taste rules, and they win over anything else in this kit. Every rule comes from a real review of
finished graphics (§1). The **Demo** composition (`src/demo/Demo.tsx`) is a compact live reference.

---

## 0 · The look in one paragraph

An **editorial paper-collage explainer**. The page is **off-white grid paper** with print grain. The objects are
**black-and-white halftone engravings cut out with a thin white paper edge**, as if clipped from an old newspaper and
held over the page (they cast a soft shadow, and they jitter a hair at 12 fps like stop-motion). There's **one loud
accent, red**, for the point, plus a **yellow highlighter** behind one key word. The type mixes **condensed bold
caps** (the big words), a **serif italic** (spoken lines) and a **typewriter face** (labels, eyebrows, sources).
Hand-drawn **red marker marks** (a circle, a strike, a dotted path) point things out. Scenes change with a **torn sheet
of paper** sliding over the last one. The motion is smooth and physical (springs with a little overshoot), and every
move lands on a beat of the voice-over. The sound is physical too: paper, ink, stamps.

---

## 1 · Why these rules exist (review notes → rule)

### The user's notes (newest first; these outrank the author's)
| Date | What the user said | Rule it became |
|---|---|---|
| | *(none yet; the `style-note` skill adds rows here)* | |

### The author's notes from real reviews
| What the reviewer said | Rule it became |
|---|---|
| Wanted motion that feels "very nice and **not robotic**" | Springs plus the 12-fps texture boil (§7) |
| "These kinds of texts suck" (a list of stat lines); wanted **one flowing narrative** | Scripts are one continuous paragraph (VOICE.md §3) |
| "**Why is the script not continuous?** I always like my script continuously flowing" (said twice) | the same, with no exceptions |
| The first frame was good, but the headline should be **bigger** and the typography "a lot better" | The sizes in §5 |
| Money was "**greyed out**" | Money is **dollar green** (§4) |
| A label ran **outside its paper** | Containment (§6) |
| A beat was "mediocre — imagine it and make it better" | Build → transform → reveal, and focus moves (§7) |
| "Put a lot of effort into **every single animation**", **name the years**, then a really nice zoom into the key range with the **start and end year** | Charts are real data with named years, and the camera dive is allowed for charts (§7) |
| The ending's typography "really does not look good": **tilted ransom letters**, a **broken strike**, a **highlight that didn't fit** | `RiseWord` only, highlight as a child of its word, strikes as bars (§5) |
| The focus circle was **too big** | Circles **hug** the item (§9) |
| The others should **move aside** so the eye goes to the chosen one | The focus move (§7) |
| The per-person number should be **red** (it's the alarm, not "money") | Colour roles (§4) |
| "Why are there so many **pointless red arrows**?" (three removed) | **No arrows** by default (§9) |
| Wanted the full-screen graphics to take more of the time, plus **power animations** on the hook line and the identity line "so it's engaging" | Power moments (§8) |
| Liked: the hook frame, a live counter that ran through the whole piece, a receipt plus bars, the payoff lockup, real data in the chart | the habits in §2 and §7 |

---

## 2 · Structure and pacing

- **Beat map first.** Before building, list every scene with its seconds and every hit with its beat: a word time
  from the voice-over (VOICE.md) or, with no voice, the rhythm you design. Write it in `projects/<slug>/PLAN.md` and
  in the composition's header.
- **Frame 0 is never empty.** The first element is already arriving at frame 0 (start it at a negative time).
- **Something visibly changes every 0.5–1.2 s**, landing on the stressed word (±0.1 s, usually 0.04–0.10 s early).
  Nothing sits still for more than ~1.5 s inside a scene.
- **Scene lengths**: 4–6 s in an explainer with a voice-over; 2–3 s in a short standalone clip.
- **No gap longer than ~0.3 s** between scenes: the next scene's first object enters with that scene's first word.
- **One hero through the piece** when the piece is about one thing (a counter, a character, an object). It opens the
  piece, comes back, and closes it.
- **The last ~0.5 s is a finished still** (or, for a requested GIF, a designed loop back to frame 0).

## 3 · Script and voice
See `VOICE.md`. The short version: ONE continuous paragraph, the hook is about the viewer, one idea per sentence,
a kicker people repeat, real facts only. Never rewrite a voice-over the user gives you.

## 4 · Colour roles (one accent per job, never decoration)

| Colour | Token | Job |
|---|---|---|
| ink `#171615` | `V.ink` | text, people, axes, neutral objects |
| red `#D3271F` | `V.red` | **the point / the alarm**: the key word, the alarm number, the line on a chart, strikes, the focus circle, dotted paths, stamps |
| yellow `#F3D21C` | `V.yellow` | the highlighter behind ONE word, bursts, stamp labels |
| money green `#2F7A4D` | `V.money` | **money objects only** (cash cut-outs get `filter: GREEN_CUT`). Never grey money |
| paper `#F7F4EC` | `V.white` | torn paper, tags, receipts, panels |
| page `#ECE8DF` / dark `#191816` | | the grid paper / the power-moment and ending page |

At most one red word group and one highlighted word per line of text. Cut-outs stay black-and-white halftone; the
colour lives in the type and the marks.

## 5 · Typography

Fonts (kit `VF`): **Anton** for display caps (key words, numbers), **Playfair Display italic** 500/800 for spoken lines,
**Special Elite** typewriter for eyebrows, labels and sources.

| Role | 16:9 (1920×1080) | 9:16 (1080×1920) | 1:1 (1080×1080) |
|---|---|---|---|
| Eyebrow (typewriter, tracking 0.12–0.14em) | 36–40 | 44–46 | 40–44 |
| Spoken headline (serif italic) | 78–100 (hook 100) | 70–90 | 64–84 |
| Display word / number (Anton) | 160–220 | 150–250 | 130–220 |
| Labels on paper / bars | 28–34 | 32–40 | 30–36 |
| Sources / footnotes | 22 | 22 | 22 |

Rules:
1. **Display words use `RiseWord`**: letters rise out of a baseline mask on springs. **No ransom tilt, no random
   baselines, no letter-by-letter drops.**
2. Spoken lines use `SerifWords`, each word on its spoken time (−0.05 s), with one bold or coloured group.
3. **A highlight is a child of its word** (`RiseWord highlight`, or `Highlight` inside the word's span), so it's always
   exactly the word's width.
4. **Strikes and underlines are drawn bars** (`Strike`, `Underline`): one confident stroke, slightly angled. The
   struck word dims to ~35% instead of vanishing.
5. **Final statements** use a lockup: a small line, then a big word, with one hard left edge (or centred for vertical
   and square).
6. **A payoff word slams**: the highlighter wipes first (0.12–0.14 s), then the word lands (scale 1.22–1.35 → 1 with
   a spring).
7. **Numbers appear exactly as spoken.** Unspoken figures stay off screen, except clearly sourced chart scales and dates.

## 6 · Layout

```
16:9   y 40–124 headline band (eyebrow + spoken line; nothing else) · y 96–330 display word / number
       y 260–1000 content · y 1000 source line (x 120) · margins ≥ 110 · lockups on x 150
9:16   eyebrow x 92, y 190 · hero object y 330–1300 · the phrase y 1330–1750 · margins ≥ 90
       (for Reels/TikTok, keep words out of the bottom ~250 px and the right-edge buttons)
1:1    eyebrow x 92, y 108 · content y 180–780 · the phrase y 700–1000 · margins ≥ 80
```
- **Containment**: every label sits fully inside its paper, bar or tag, with ≥ 28 px of padding. Size the paper to the
  longest line.
- A zoomed layer must not slide under the headline band; mask it.
- **Nothing crosses the hero object in flight.** If something would, cut or fade it to its new place instead.

## 7 · Motion

1. **Springs, not linear tweens**, for anything that lands (`springAt`, damping 10–15; overshoot is welcome).
2. The hand-made feel comes from the **12-fps texture** (grain, ±1 px cut-out boil: `PrintFinish`, `Cutout`), not from
   choppy motion. Moves run at full frame rate.
3. **Build → transform → reveal** inside a scene. For example, a cash wall builds in three waves, condenses into one
   pile, then bursts into one bill per person.
4. **Focus moves**: when one item is singled out, the rest **slide aside sideways** (~130 px, staggered by distance)
   and dim to ~55%. The chosen one lifts, and a circle hugs it (`FocusRow`). A push-in on the chosen item is allowed (≤ 1.8×).
5. **Charts are real data, animated like a story** (`LineChart`): a pen carries a **year bubble**, the axis names the
   years, events pop as the pen passes, brackets show **start and end years**, and dots mark the key crossings. The one
   strong camera move the author approved is the **data dive**: re-map the chart's domain into the range that matters
   over ~0.8 s.
6. **Camera**: subtle otherwise. A scene drift of 1.00 → 1.03 is fine; no punch-ins or pans unless asked.
7. **Counters**: digits in fixed-width cells (`MoneyCounter`). Use a split-flap for a jump in time (fast, then slowing,
   with a heavy last flap).
8. **Stamps for verdicts** (`Stamp`): rotated, slamming from 1.6× to 1×, never covering the number they qualify.
9. **Re-ranking bars**: the climbing bar lifts (scale 1.04 + shadow) while it passes the others, then a #1 badge pops.
10. **Exits**: fade plus blur over 0.25–0.27 s (`gone(outK(…))`). Things that burst out are staggered (0.04–0.17 s),
    then float.

**Transitions between scenes** (`SceneStack`): a torn sheet rising from the bottom (`up`), a torn sheet from the
right (`left`), the **dark page** for a power moment or an ending, or a blur. **Alternate them, never the same one
twice in a row.** The `tear` sound goes on each sheet.

## 8 · Power moments (max 2 per piece; if everything is loud, nothing is)

**The hook / the twist** (`PowerWordScene`):
- contrast: the dark grid page
- anticipation: the lead is typed slowly in white
- the slam: the word on a highlighter springs from 1.35× to 1×, rotated −3°
- impact: a red-and-yellow burst, a 9-Hz decaying shake, a 0.18-s red flash
- sound: `stamp` plus `impact` together

**The identity / emotion line** ("if you've got a curious mind"):
- an object **acts the line out** (ideas burst out of a head: `IdeaBurst`)
- then the phrase rises huge in two lines, red then ink on the highlighter (`Lockup`)
- sound: `pop` on the burst

## 9 · Marks (pointing things out)
1. **No pointless arrows.** An arrow (`MarkerArrow`) is allowed only when the eye would otherwise miss the target AND
   nothing else (position, colour, a circle, motion) already points at it. Never an arrow between two bars, beside a
   ranked list, or at a hero that's already alone on screen.
2. **Circles hug the item** (4–5 px, drawn in ~0.35 s after it settles): the object and what belongs to it, none of
   its neighbours.
3. **Prefer motion that points**: the crowd parting, a highlight sweep, a bar lifting, a dot on a crossing.

## 10 · Honesty (non-negotiable)
- **No invented numbers, stats, prices or percentages.** Research facts from primary sources; mark projections as
  projections; add a tiny source line (`SourceLine`). If the user's number is wrong, say so plainly.
- **No fabricated records**: no invented quotes, comments, tweets, usernames, reviews or documents that look genuine.
  Receipts and posts get skeleton lines except for the spoken figure.
- **Never generate or draw a real person's face**, no banknote portraits (edges only), no brand logos (official files
  from the user only), no national insignia.
- Screenshots the user gives are shown **untouched**, framed.

## 11 · Never
- an empty frame 0, or a still frame longer than ~1.5 s inside a scene
- the same transition twice in a row
- a tilted ransom-letter word, a highlight that doesn't fit its word, a dashed strike
- an arrow without a reason, a circle that includes the neighbours
- grey money, a label outside its paper, text under the headline band
- a whoosh the user didn't ask for, a sound on plain text
- an invented figure, quote or logo, or a generated real face

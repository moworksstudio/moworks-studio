# "What If…?" formats (16:9, 1920×1080, 30 fps)

Two formats. Both follow the ladder from `SCRIPT.md`: cold open → title question → rules / "this is real" → cool →
useful → inconvenient → dangerous → (existential) → twist or kicker.

**Timing works the same way in both.**
- Times are targets for the script. The final length follows the voice.
- If the take runs long, cut words and re-voice. Never speed the voice up.
- Word budgets assume ≈ 2.8–3.0 words/s with short pauses, which leaves room for gags. A generated voice often reads
  slower (the worked example: 131 words → 49.7 s on the 45 s table), so write to the low end of each budget.

---

## A. The 30–50 s piece

One composition, one voice file, 2–4 sets. Reference: `src/examples/what-if-no-pain/` (A2, 49.7 s, 13 shots).

**Shot density**
- The average shot is 3–3.5 s. 16:9 wides carry more than 9:16 shots, so this is slower than the shorts' 1.5–2.5 s.
- Never hold a static shot over 4 s. A slow push or a truck counts as motion, not as a new shot.
- Shot counts: 30 s ≈ 9–12 shots, 40 s ≈ 12–14, 45 s ≈ 13–16, 50 s ≈ 15–17.
- Frame 0 is never empty; the last 0.5 s is a still.

### A1. 30 s (≈ 80–85 words)

| # | Beat | Time | Words | Job | Shots → look |
|---|---|---|---|---|---|
| 1 | Cold open | 0–3.5 s | 10–12 | An ordinary moment and the power's first visible effect; a bystander reacts (a face, or ≤ 3 words) | 2: the action `objectClose` / `characterClose`, then the reaction row `wideBright` |
| 2 | Title question | 3.5–5.5 s | 6–8 | "So, what if you …?" | 1: the title **in the world** (whiteboard, screen, sign) `objectClose` |
| 3 | Rule / this is real | 5.5–10 s | 12–14 | How it works and what stays normal, **or** the real-world anchor (`verify`) | 1–2: a diagram or prop in the set |
| 4 | Cool → useful | 10–16 s | 16–18 | Two quick wins; the second one helps somebody else | 2: a side-by-side two-shot, then a lateral truck along a row |
| 5 | Inconvenient → dangerous | 16–25 s | 24–26 | Two problems, each with its reason; the second is serious. The grade turns cooler | 2–3 |
| 6 | Kicker | 25–30 s | 10–12 | A reframe and a **callback to the cold open**. The last 0.5 s is a still | 1–2, held |

### A2. 45 s (≈ 120–135 words)

| # | Beat | Time | Words | Job | Shots → look |
|---|---|---|---|---|---|
| 1 | Cold open | 0–4.5 s | 12–14 | An ordinary moment, the power, a bystander's reaction | 2 |
| 2 | Title question | 4.5–7 s | 6–8 | "So, what if you …?" | 1, the title in the world |
| 3 | Rule + this is real | 7–15 s | 22–26 | The premise vs the real thing ("Some people are …" / "This part is real"); what stays normal; **one planted detail** | 2: a diagram prop, then a character close-up |
| 4 | Cool | 15–19 s | 8–10 | A personal win, fast | 1–2 |
| 5 | Useful | 19–24 s | 12–14 | A win for other people (the team, a stranger) | 1–2, row or group staging |
| 6 | Inconvenient | 24–30 s | 16–18 | The first cost shows; one or two images | 2, cooler grade |
| 7 | Dangerous | 30–38 s | 22–26 | The serious cost, with its real mechanism (`verify`) | 2 |
| 8 | Reframe | 38–41.5 s | 8–10 | One line that turns the idea over ("⟨X⟩ was never the problem…") | 1, `objectClose` on a metaphor prop |
| 9 | Kicker | 41.5–45 s | 10–12 | The **planted detail pays off** (a callback to the cold open); the last 0.5 s is a still | 1, held |

- **40 s:** cut one inconvenient image and trim beat 3 to ≈ 14–16 words, for ≈ 105–115 words.
- **50 s:** add one more useful image or one more dangerous image, for ≈ 135–145 words.
- **End question (optional):** a 30–50 s piece may end with a ≤ 8-word question to the viewer *after* the kicker.
  Only do it if the kicker still lands first. Otherwise the question goes in the description.

### Fill-in examples (both ours)
| Beat | 45 s: "What if you stopped feeling pain?" (the worked example; full script in `src/examples/what-if-no-pain/script.txt`) | 30 s: "What if you were 100× stronger?" |
|---|---|---|
| Cold open | Mika kicks a desk leg; the team winces, she doesn't | a gentle push sends the office door across the car park |
| Title | the whiteboard in the meeting room | written on the bent door |
| Rule / real | the real, rare congenital condition; temperature is still felt | strength ×100; weight and grip ×1 (the planted rule) |
| Cool / useful | the flu shot; pouring from the scorching pot for the team | lifting the vending machine; carrying the meeting table with everyone at it |
| Inconvenient / dangerous | blisters, a bitten tongue, running on a sprain, a silent appendix | keyboards and mugs explode; you push a parked truck with its brake on and *you* slide backwards (`verify`: shoe grip scales with your weight, which didn't change) |
| Reframe + kicker | "pain is the alarm"; the Monday toe was broken all week | the hardest skill is holding back; you catch the falling mug without a crack |

---

## B. The 8–12 min episode (chaptered)

**Each chapter is its own composition and its own voice file** (`EPISODES.md` §2).
- A chapter runs 25–130 s, so a retake or a re-render stays small.
- Use the percentages to scale. The timings are for a 10:00 episode at ≈ 165 words/min (≈ 1,650 words).

| Ch | Name | % | 10:00 timing | Words | Job | Attention device |
|---|---|---|---|---|---|---|
| C00 | Cold open | 0–4 | 0:00–0:25 | 65 | An ordinary moment broken by the power, a bystander's line, the title question, "here's how it works" | a bystander gag |
| C01 | How it works | 4–11 | 0:25–1:05 | 110 | Rules 1–3, numbered, each proved by a gag; what stays normal; **plant one rule** | an open loop ("remember that") |
| C02 | Is it real? | 11–18 | 1:05–1:50 | 125 | 2–4 real anchors: an experiment, a record, an animal (`verify`); scale comparisons, said with "about" | a "this part is real" flag |
| C03 | The good life | 18–28 | 1:50–2:50 | 165 | Cool → useful montage: 4–6 vignettes, one of which fails in a funny way | a gag every ~12 s |
| C04 | Problems | 28–42 | 2:50–4:10 | 220 | 2–3 **numbered** problems: reason, funny picture, workaround | numbered signposts |
| C05 | The real problem | 42–53 | 4:10–5:20 | 190 | The planted rule bites: a near miss, then a crash gag | closes the C01 loop |
| C06 | Learning it | 53–63 | 5:20–6:20 | 165 | A real-world analogue that already solved it (an animal, a machine) → a technique or gear → "the one rule" | plants the climax tool |
| C07 | The test | 63–77 | 6:20–7:40 | 220 | The climax: someone else's safety. It is won with the rules and tools, not raw power (or the moral slide) | a ticking clock |
| C08 | Bigger world | 77–97 | 7:40–9:40 | 330 | The aftermath and a consequence. The series' own recurring device shows up (invented with the user; `projects/IDEAS.md` → "Series"). A new threat appears in the last 30 s, unresolved | a new open loop |
| C09 | Sign-off | 97–100 | 9:40–10:00 | 50 | Two questions: what would you do first, plus one story question; then ask for comments. No recap | — |

**Scaling**
- **8 min (≈ 1,350 words):** merge C02 into C01 and C05 into C04.
- **12 min (≈ 2,000 words):** add C06b "Temptation" (the moral slide, 60–90 s) before C07, or give C08 a second
  confrontation.

**Inside every chapter**
- **Pictures:** a new picture every 3–6 s, so ≈ 10–20 shots per minute and 120–180 shots per 10-minute episode.
  Reuse sets from new angles.
- **Signposts:** one spoken signpost every 30–45 s ("But then…", "Problem two…", "And then, one Friday…").
- **Side characters:** one short line about every 25 s (2–8 words; Ravi, June, Otto, new originals), each in its own
  fixed voice.
- **Chapter openings:** open on an establishing wide of the set; the first new set in a chapter always gets one.
- **Chapter endings:** end on a hook line or an unanswered question, never a summary.

### Packaging (idea-lab writes it; these are the episode's rules)
**Title:** the question, 4–9 words, normal title case, a multiplier if there is one ("What If You Were 100× Stronger?").

**Description**

| Line | Content |
|---|---|
| 1 | One hook line about the cost of the power |
| 2 | The story question, for the comments |
| 3 | "Watch next:" one other episode of the user's, with its link |
| 4 | The user's own tagline (`kit.config.json → channel.tagline`; ask once if it's empty) |
| 5 | 3 hashtags |

**Tags:** 15–20, in this order:
1. the exact title in 2–3 spellings ("100x stronger", "100 times stronger", "a hundred times stronger");
2. synonyms for the power;
3. the broad genre ("what if", "what if animation", "animated story", "3d cartoon");
4. 4–6 of the user's other titles.

**YouTube chapters:** one line per chapter, using the chapter names above, timed from the assembled episode. YouTube
needs the first at 0:00, at least three chapters, and each at least 10 s long.

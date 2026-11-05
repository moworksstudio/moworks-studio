# Scripting guide: how an explainer script is written

Read this before writing or checking any script (the `script-writer` skill sends you here). The **Author notes** in
`STYLE.md` outrank it. The worked example's script, "Where the Needle Stops", is below: copy its shape.

## The 9 rules
| # | Rule | Why |
|---|---|---|
| 1 | **Open in the second person, present tense, with something about to happen to you.** "A needle is about to go into your arm." Then one concrete consequence | The viewer is inside the story from the first word, and the first shot has a subject |
| 2 | **Continuous sentences** of about 12–18 words (22 at most), joined with "and", "so", "because", "then". **No fragment chains** like "Half a millilitre. About ten drops." | A choppy draft was rejected; the flowing one was approved. Fragments read as a list, not a story |
| 3 | **One mechanism through one everyday image**, for example "the same way it digests lunch" | One image the viewer already knows carries the idea; two compete |
| 4 | **Order the facts along one dial**, for example fat → muscle → vein = hours → minutes → seconds | A dial gives the middle of the film a direction, and each stop is one shot |
| 5 | **Numbers with a yardstick**, as spoken ("ten drops", not "0.5 mL"). Every number gets a source line in the fact sheet | A yardstick is something the viewer can picture; the source keeps it honest |
| 6 | **Plain words**, about grade 6. Calm, never hyped | The voice is calm, warm and unhurried; hype fights it |
| 7 | **End on a gentle button that calls back to the hook**, for example "all from one small sting" | The film closes the loop it opened. No recap, no "subscribe" |
| 8 | **Pace:** speech runs at about 2.6–3 words per second. A 40 s film is about 100 words, with a 0.6 s beat before the title | The picture needs room: a new element every 1.5–3 s |
| 9 | **Every sentence must be drawable as one shot** | If you can't picture the shot, the viewer can't either. Rewrite the sentence before the storyboard |

## The worked example (approved, 103 words, 7 sentences)
> A needle is about to go into your arm. In a second, it will push ten drops of medicine through your skin. You can't
> just swallow it, because your stomach would digest many medicines, like insulin, the same way it digests lunch. So
> we take a shortcut, and where the needle stops decides how fast it works. In the fat under your skin, it seeps into
> your blood over hours. In muscle, packed with tiny blood vessels, it takes minutes, and in a vein, just seconds. Then
> your heart pumps it around your body in about a minute, all from one small sting.

| Beat | Words | Sentence | Rule it shows |
|---|---|---|---|
| Hook | 9 | "A needle is about to go into your arm." | 1: second person, present, about to happen |
| Consequence | 13 | "In a second, it will push ten drops of medicine through your skin." | 5: a number with a yardstick |
| Why (the mechanism) | 20 | "You can't just swallow it, because … the same way it digests lunch." | 3: one everyday image |
| Turn | 15 | "So we take a shortcut, and where the needle stops decides how fast it works." | 4: it names the dial |
| The dial (3 stops) | 29 | "In the fat … over hours. In muscle … minutes, and in a vein, just seconds." | 4: one dial, one shot per stop |
| Payoff + button | 17 | "Then your heart pumps it around your body in about a minute, all from one small sting." | 7: calls back to the needle |

On the take it was voiced from, speech ran from 0.91 s to 34.56 s (about 3 words per second). The title started at
35.15 s and the film ends at 40.0 s. Its storyboard (`examples/where-the-needle-stops/STORYBOARD.md`) shows how each
sentence became one or two shots.

## Structure: a short (9:16, 30–60 s)
Use the example's beats, scaled to the length. Proportions by words (from the example): hook ~9 %, consequence ~13 %,
why ~19 %, turn ~15 %, dial ~28 %, payoff and button ~16 %.

| Beat | What it does | Shot |
|---|---|---|
| Hook | something is about to happen to *you*; frame 0 already shows it | the hero, or the object, close |
| Consequence | one concrete thing that follows, with a yardstick number | a close-up |
| Why | the mechanism through one everyday image | a diagram or a cutaway |
| Turn | names the dial ("where the needle stops decides how fast it works") | the whole system at once |
| Dial | three stops, one sentence or clause each, in order | one shot per stop; a label row builds |
| Payoff | where it all ends up | the big picture |
| Button | a gentle callback to the hook | back to the first scene |
| Title | after the last word: a 0.6 s beat, then the title, then the fade | the hero or the subject, wide |

## Structure: a long-form explainer (16:9, 2–12 min)
The same voice and rules, stretched over chapters.
- **Cold open.** The hook, one consequence and the film's question, in under a minute. It ends on the film's title.
- **Chapters on a clock or a dial.** The chapters themselves are the stops of one big dial, in order: a clock (the
  first second, the first minute, the first hour…), a depth (skin → muscle → vein → heart), a size (cell → organ →
  body), a distance. The viewer always knows where they are on it. Each chapter opens with a short chapter title (2–4
  words) that names its stop. Plan about one chapter per 1–2 minutes.
- **One dial per section.** Inside each chapter, its own small dial of three stops, each one shot or a few.
- **One flip.** Once in the film, in the second half, the obvious answer turns out to be wrong, and the film says why.
  One flip only: two make the film feel like a trick.
- **Link lines.** The last sentence of each chapter points at the next stop ("And that's only the first minute.").
- **A gentle button.** The last sentence calls back to the cold open. No recap list, no "subscribe", no outro.
- Each chapter is still written as continuous sentences (rule 2), and still drawable shot by shot (rule 9).

## The fact sheet (every script has one)
It lives in the video's `SCRIPT.md`, under the narration and the beat table. **One line per number and per claim that
isn't common knowledge.**

| # | Claim | As spoken | Source (title, publisher, link) | Checked |
|---|---|---|---|---|
| 1 | A typical arm injection is 0.5 mL; a medical drop is about 0.05 mL | "ten drops" | ⟨source⟩ | ⟨date⟩ |

- Research each claim before the script is shown (web search if you have it), and give one good source: an official
  body, a medical or science textbook, a paper, a reputable news report.
- A number appears on screen exactly as spoken. If you can't source it, cut it or replace it with a comparison picture
  ("faster than you can blink"). Never invent a figure to make a beat land.
- Anything still unverified is marked `unverified` in the sheet and listed in the delivery.
- The fact sheet never goes into `story/script.txt`: that file holds the spoken words only.

## Words-per-second maths
- **Speech pace:** about 2.6–3.0 words per second for a calm read. A generated voice often reads slower; the real
  length comes from `node tools/time-voice.mjs`, which prints the speech length and a suggested film length.
- **A short with an end title:** film length ≈ 0.9 s lead-in + speech + 0.6 s beat + about 4.8 s of title and fade (the
  example's numbers). So speech ≈ film length − 6.3 s, and words ≈ speech seconds × 2.6–3.0:

  | Film | Speech | Words |
  |---|---|---|
  | 30 s | ~24 s | ~62–71 |
  | 40 s | ~34 s | ~88–101 (the example: 103) |
  | 50 s | ~44 s | ~114–131 |
  | 60 s | ~54 s | ~140–161 |

- **Long-form:** plan with 2.6 words per second of film, which leaves room for chapter titles and beats: 2 min ≈ 310
  words, 5 min ≈ 780, 10 min ≈ 1,560, 12 min ≈ 1,870. Time the first chapter's voice and adjust the rest.
- These are planning numbers. **The voice decides the length.** If a take runs long, cut words and record again; never
  speed the voice up.

## Checklist (run it before showing any script)
- [ ] The first sentence is second person, present tense, something about to happen to you.
- [ ] No fragment chains; sentences of about 12–18 words, none over 22.
- [ ] One mechanism, one everyday image.
- [ ] One dial, in order (and for long-form, chapters on one clock or dial, one flip).
- [ ] Every number has a yardstick and a line in the fact sheet.
- [ ] Plain words, calm tone, no hype words ("insane", "mind-blowing", "you won't believe").
- [ ] The last sentence calls back to the hook.
- [ ] The word count fits the length (the table above).
- [ ] Every sentence is drawable as one shot.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Write a fragment chain ("Half a millilitre. About ten drops.") | Join it into one sentence with "and", "so", "because" or "then" |
| Paraphrase a script the user gave or approved | Use it word for word. Point out what breaks a rule and ask whether to change it |
| Use a number without a source | Source it, or replace it with a comparison picture |
| Open with a question to the audience ("Have you ever wondered…?") | Open with something about to happen to "you" |
| End with a recap or a call to action | End on a gentle button that calls back to the hook |
| Stack two mechanisms in one beat | One mechanism per beat; move the second to its own beat or cut it |
| Write a sentence no one could draw | Rewrite it as something with a subject and an action |

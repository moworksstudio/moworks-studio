# Storyboard: __TITLE__ (__DUR__ s, __FORMAT__)

Narration (`audio/vo.wav`, speech from … to … s), word for word from `story/script.txt`:
> (the approved script)

Every cut and event is keyed to a word in `story/words.json`: `EX.cue(word, n)` in `story.js`, where `n` counts
the word's occurrences (case and punctuation are ignored). Seconds below are from the current voice track; a new
take re-times everything by itself. Hard cuts land **0.05 s before** their word, with no dissolves. A new element
every 1.5–3 s. The title starts about **0.6 s after the last word**; the film ends with a **0.6 s fade to black**.
A label never starts in the last 0.3 s of a shot, and its exit (0.21 s) is fired before the cut.

## Shots

| # | Cut (cue) | Time | Shot | Module |
| --- | --- | --- | --- | --- |
| 1 | 0 | 0.00 | **(Place, framing.)** What the viewer sees and what moves, arriving on which word. Slow push 1.00 → 1.04. | (module.function, house-hero) |
| 2 | (word)(n) −0.05 | … | … | … |
| … | title | … | **Title.** (Last scene, the hero relaxed.) **THE TITLE** pops word by word (0.2 s apart). Fade to black over the last 0.6 s. | (module), house-hero, ui.title |

9:16 notes (tall videos): one subject per frame, cameras tighter, label rows become columns, all text inside
x 60–960 and y 250–1450, title at y ≈ 600.

## Event cues (shared by picture and sound)

`+x` = seconds after the word starts. Times in brackets are from the current voice track. `story.js` builds its cue
table `C` from this table and `story/sound.json` its sound cues, so picture and sound always agree.

| Event | Cue | Picture | Sound |
| --- | --- | --- | --- |
| Open | 0.0 | (first shot) | music fades in over 1 s |
| (event) | (word)(n) +0 [s] | (what happens) | (kind, e.g. pop, swish, tick, sparkle, impact) |
| Cut: (shot) | (word)(n) −0.05 [s] | shot 2 | — |
| Title words | title + 0.15 + 0.2 s × i | words pop | title swell, music resolves |
| End | (film length) | fade to black over the last 0.6 s | music fades over the last 1.2 s |

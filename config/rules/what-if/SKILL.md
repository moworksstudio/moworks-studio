---
name: what-if
description: Moworks Studio's "What If" film kind, for every film style - a short episode built on one premise ("What if you could…?"): the seven-beat story, the short-script rules, the twist built on one true, sourced fact, the opening pace, all in the chosen style's own look and pace. Read in every step when the owner picks the What If film kind in New project.
version: 1.1.0
derived-from: What If animation by FreshStack (MIT, Copyright (c) 2026 FreshStack), https://github.com/kelano86/what-if-animation/tree/3725a22d2d101320cae5b7d761af8d75120c4987 - references/formula.md (the seven beats, the 15-25 s shape, the writing rules, choosing a topic), references/look.md (pace), references/sound.md. Ideas and rules only, rewritten for Moworks Studio; no code, no sounds, no channel names.
---

# The What If film kind

The owner picked **What If** in New project: the film is one short episode on one premise, "What if you could …?". The film style still
decides the whole look, the drawing, the motion and its pace; this file decides the story and the script. Original only: our own
characters (or the owner's), our own story; never a channel's name, its hero or one of its episodes, never a famous character, and never
a claim that any channel is made with Claude or any other tool.

## 1. The seven beats

| # | Beat | What it does |
|---|---|---|
| 1 | Cold open | In the middle of the action: three or four quick demos of the power (a small everyday problem, the power, the win), or a flash-forward to the climax. The power's word is said every time |
| 2 | The premise | The title card asks it: "WHAT IF YOU COULD" small, then the power in four words or fewer, with a question mark; plus one rule of the power |
| 3 | The fun part | Escalating wins in everyday life |
| 4 | The not-so-fun part | The cost: one real, checked fact with a number (§3), then "That's real." |
| 5 | Someone powerful notices | A person in a suit, a company, a government |
| 6 | A moral choice | Someone close is at stake |
| 7 | Cliffhanger | A question for the viewer, or "Part 1 of 2"; never a resolution |

**Length.** The default is 15-30 s: beats 1 to 4 in full (about 11 s of cold open, the title card, one line of fun, the turn), with 5 to
7 folded into the last line ("It's about to ruin your life.", "So where are yours coming from?"). A longer film stretches the beats in
order: about 40-60 s adds beat 4 properly (the fact, then its consequence on screen), beat 5 and beat 6, and ends on "Part 1"; a film of
several minutes plays all seven in full. The New project length wins.

## 2. The script

- Second person, present tense, short sentences: **3 to 8 words a line**. "Copy a cookie. Paste." beats "Imagine if you were able to
  duplicate a cookie."
- **Every line is one picture:** each demo reads in one shot with no text on screen. A line that needs a caption is rewritten.
- **The power has a word, a sound and a look** (its signature effect every time it is used; a visual mark of the power), so the viewer
  learns the rule by the third demo.
- **The demos escalate:** small and selfish, then useful, then a little uncanny; the third should make the viewer slightly uneasy.
- About 2.7 words a second when voiced: 45 to 65 words for 15 to 25 s. Count before the voice is made.
- The best topics: an everyday power with clear rules and a hidden cost from real science (time, copies, senses, the body, money, luck).
- Before writing, check the premise is not a channel's existing episode (search the web when it is on): change the power or the rule if
  it is.

## 3. The twist: one true fact, with a number and its source

Beat 4 rests on one real fact with a number ("One cookie made from pure energy needs every power plant on Earth running for over ten
minutes."). Search the web for it (when the project's web setting allows it), work the arithmetic, and write it into NOTES.md before it
goes into the script: the claim, the working, the source (title and link). The source is named to the owner in your reply.
**No real source, or the web is off: write the twist without a number** (the cost as a story, not a statistic). Never invent a number,
never round one into a different claim (moworks-studio §1, rule 4).

## 4. The pace

- In this kind only, the cold open cuts fast: about 27 cuts a minute or more (a shot of about 0.7 to 3 s), cut on the word, nothing
  static for long; the rest runs about half as fast.
- **The film style's own pace wins.** A slow style (ink, Sumi-e, watercolour, a drawing that draws itself, a calm storybook) keeps its
  own rhythm: keep the seven beats and the script, give each demo one shot at the style's pace, and never force the fast cut on it.
- Every cut changes the shot's size or angle (moworks-studio §6).

## 5. Sound

With a voice-over, moworks-studio §7 holds: an effect goes in the pause after the word it illustrates, and the power's sound is the
same every time. **In this kind only, the music stops at the turn** (beat 4; the author's references/sound.md: the music cut on the
turn's first frame, so its hit lands in silence): write that second in the Motion Plan's `musicStop`, in a pause of the voice, or call
the app's `music_stop` tool with it. This replaces the house rule's music to the end with a fade out.

## 6. A lit-room, stick-figure look

`references/look.md` (beside this file) keeps what the original measured for one particular look (rooms lit by visible lamps, rim light,
blurred foreground, furnished sets). Read it only when the film style or the brief asks for that look; never apply it to motion graphics,
line art, ink, Sumi-e or paper styles.

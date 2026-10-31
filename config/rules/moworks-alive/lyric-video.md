---
name: lyric-video
description: The energy and song rules of a lyrics video (a song, its lyrics on screen, cut to the beat, with the owner's pictures such as a 3D product sequence) - a new world every 3 s, nothing still over 0.5 s, every montage word its own, one product through the film, every sung word on its sung time. Read in the Storyboard, the Motion Plan, the Build and the Review of a lyrics video, in every film style.
version: 1.1.0
derived-from: Moworks Motion kit (Moworks, commit 0a4a0a3) - engine/skill/moworks-motion/workflow/recipes.md sections 1 "Energy" and 4 "Song film", workflow/film.md L142-161 and L207-241; written from the idea for Moworks Studio. A tame first cut was the slowest part of an earlier film (six rounds), and Test 30 proved it again (one layout formula in 28 shots, the words not on the song).
---

# A lyrics video: energy and the song

The app calls a film a lyrics video when its style is a Music / Lyrics style, the brief asks for the song's lyrics, or the owner gave lyrics. Only these
films follow this file; every other film stays as it was. In these films these are rules, not ideas: they are stricter than moworks-alive §2 and win
over it. The style's own hand still draws them. Be bold in the first cut: propose many fun ideas in the Storyboard (a sticker family, a new world
for every section, a graphic transition nobody expects), all inside what section 3 keeps.

## 1. Energy, in numbers

1. **A new world at least every 3 s:** a new ground, place or staging, not only a new shot of the same one.
2. **Nothing on screen still for more than 0.5 s** but a word while it is read (moworks-studio rule 2), and it pulses or rides the camera; the final
   logo hold apart.
3. **Every montage word its own:** the hook words, the chant, the one-word punches each get their own entrance (stomp, spin, drop, zoom, flip, rise,
   slide), their own size, their own weight and their own colour, then a kinetic exit. Never one shared move. A word sung seven times is seven different moments.
4. **A ground is never flat for long:** at most 2 s of one flat colour; patterns drifting, rings blooming, soft blobs, 30-60 particles fading near text.
5. **Always-on layers are written once for the whole film,** in the root composition, never per shot, so they never stop at a cut.
6. **Graphic transitions run UNDER the hero** (stripes, a block wipe, a circle from the hero): the hero carries every cut. A hard cut of the whole frame
   is the exception, on a downbeat, and never more than a few in a film.
7. **One product through the film:** one element lives across the shots, passed from staging to staging, never placed anew for each shot.
8. **No two shots alike:** no layout formula twice in a row and none more than twice in the film (a product beside a giant word on a dark ground, seven
   times, was the fault of Test 30). Each shot has at least one move written for this film alone.
9. **Beat punctuation:** a ring or a burst from the word or the hero on the hits, never over text; one sticker or icon per feature, drawn for the film in one
   style, bouncing on the beat.

## 2. The song is the one grid

The app measures the song when it comes in and writes `docs/BEATMAP.md`: beats, bars, hits, kicks, sections, in seconds. The sung words with their times
are in `LYRICS-TIMED.md` and `.moworks/lyrics/words.json`. They are data you must use, not a guide.

1. **Shots follow the sections and cut on bars or downbeats;** every move, cut, word and pulse sits on the map. Write the `beat`, `bar` or `hit` it lands on in the
   Motion Plan row's `says`, or in the storyboard frame.
2. **Land ON the note:** the impact (a stomp reaching size, a fold closing) falls on the hit or the sung onset, so the move STARTS before it, by about 30 % of
   its length (about 0.07 s for a 0.25 s stomp). A move that only starts on the note is felt late.
3. **An entrance is never longer than the note it lands on:** on eighth notes (the map gives the length in frames) a word's entrance lasts one eighth at most.
4. **The lyric is the copy:** the words on screen are the sung words, each on its sung time; montage words on beats. No other text carries the song; a claim in
   a gap between lines keeps its reading time.
5. **Mark each sung word on screen:** give its element `data-lyric="<n>"`, or `data-lyric="<n>-<m>"` for a line shown whole, n being the word's `n` in
   `.moworks/lyrics/words.json`. The app compares each with its sung time and counts them (Tech checks, the Review).
6. **Repeated words keep their count:** "GẬP GẬP GẬP GẬP GẬP GẬP GẬP MỞ" is seven elements then one, each at its own time, or a line that adds one word at a
   time. Never one word that pulses seven times, never fewer to fit the bar. When LYRICS-TIMED.md says the count sung differs from the text, say so to the owner.
7. **A held note can be drawn:** letters added one by one until the note ends.
8. **Backing vocals** (words in parentheses in the lyrics, marked `"layer": "backing"` in words.json) are a separate, quieter layer: smaller, off to a side, never
   in the main line's place, and the film may leave them out. Say which you chose.
9. **The times are a draft.** Heard words are close; the others are placed on the song's attacks. Never call them exact; the owner's ear wins.

## 3. What stays fixed

The Brand Kit binds all of this (moworks-studio §2): sizes, weights and colours come from its fonts and palette, so "many colours" means more of the kit's colours,
and a kit with one weight varies size and entrance instead. A guideline's rules on case, gradients, logos and claims hold. An idea the kit forbids is not drawn; one the
owner wants anyway is a conflict (moworks-studio §2b). The motion itself is free.

## 4. The sound: the song alone

What the viewer came to hear is the song (owner 31/10: 70 effects in Test 31 sat over it and it sounded lowered). Add no sound effects and no ambience: `- sfx: none` and
`- ambience: none` on every frame, `"sound": "none"` on every motion. The song plays at its own level and is never lowered for an effect. This holds for a music video without
lyrics too. Only the owner's own word brings a sound in (the `sfx_prefs` tool, `on`), and then few, under the song.

## 5. In each step

- **Storyboard:** the frames follow the sections of the beat map, with a new world at least every 3 s, each frame's sung words at their times.
- **Motion Plan:** the numbers of section 1 in the rows; `dynamic` is `strong`.
- **Build:** as the plan says, always-on layers in the root; frame rate as the project has it (a lyrics video defaults to 60 fps).
- **Review:** moworks-qc §2b scores this.

---
name: style-note
description: Teach the kit the user's taste — record a preference about the 3D cartoon videos (liked or disliked) as a dated rule in cartoon-video's STYLE.md (or the right guide: STAGING, SOUND, VOICE, a format's SCRIPT/FORMATS) so every future video follows it. Use when the user gives feedback that should hold beyond this one video — "I don't like…", "always…", "never…", "make the captions bigger from now on", "I loved that impact", "remember this", "save that", "add it to the style".
---

# Save a style note

`.claude/skills/cartoon-video/references/STYLE.md` is the source of truth for taste, and its **"The user's notes"**
table outranks everything else in the kit, including the format skills and the kit's default values.

## What kind of note is it?
| The note | What to do |
|---|---|
| A fix for **this** video ("move the camera left", "remove that sound") | Just do it, and log it in `projects/<slug>/PLAN.md`. Don't save it here |
| A **one-off** request ("a whoosh on this cut", "zoom in hard here") | Apply it to this video only, log it in PLAN.md, and leave the defaults alone |
| **Taste** for future videos ("bigger captions", "no glitch sound", "Mika should always wear the hoodie", "shorter shots") | Save it (steps below) |
| Praise for a specific choice ("the kick with the impact was perfect") | Save it too, as "keep doing X" |

If you're unsure whether a note is one-off or taste, ask in one line: "Should I make that the default for future videos
too?"

## Steps
1. Add a row at the top of STYLE.md → "The user's notes":
   `| <YYYY-MM-DD> | "<the user's words, short>" | <the rule it became> (where) |`
2. **Change the rule itself** where it lives, so the files never contradict themselves: STYLE (look, palette, type,
   camera), STAGING (framing, props), SOUND (cues, gains), VOICE, or a format skill's SCRIPT / FORMATS (writing,
   pacing). If it overrides a default value, rewrite that value and add "(user, <date>)".
3. If it changes a kit default (caption size, a look's values, a sound design), change `src/kit/` or
   `tools/sfx/build_sounds.py` only if the user wants it everywhere; then run `node tools/check.mjs` (or rebuild the
   sounds) and re-check one example still.
4. Tell the user in one line what you saved: "Saved: captions one size bigger by default (STYLE §6)."

## Rules
- Do exactly what was named. Never loosen a rule without a dated row.
- Removing a saved preference: delete the rule, and add a dated row saying it was removed and why.

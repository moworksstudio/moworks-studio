---
name: style-note
description: Teach the kit the user's taste — record a preference about the videos (liked or disliked) as a dated rule in the right style's STYLE.md (or its SCRIPT/STORY/SOUND guide) so every future video in that style follows it. Use when the user gives feedback that should hold beyond this one video — "I don't like…", "always…", "never…", "make the labels bigger from now on", "I loved that boom", "remember this", "save that", "add it to the style".
---

# Save a style note

Each style keeps its taste in its own `STYLE.md`:
- `stickman-explainer/references/STYLE.md`
- `inner-voice-short/references/STYLE.md`

The **"The user's notes"** table at the top of each outranks everything else in that style, including the kit's
default values. A note about sound, the voice or the writing can apply to both styles: then save it in both.

## What kind of note is it?
| The note | What to do |
|---|---|
| A fix for **this** video ("move the shadow left", "cut that tick") | Just do it, and log it in `projects/<slug>/PLAN.md`. Don't save it here |
| A **one-off** request ("a whoosh on this cut", "zoom in here") | Apply it to this video only, log it in PLAN.md, and leave the defaults alone |
| **Taste** for future videos ("bigger labels", "warmer moonlight", "no pop sounds", "the shadow should never smile") | Save it (steps below) |
| Praise for a specific choice ("the piano stopping dead was great") | Save it too, as "keep doing X" |

If you're unsure whether a note is one-off or taste, ask in one line: "Should I make that the default for future
videos too?" If it's unclear which style it's for, ask that too.

## Steps
1. Add a row at the top of that style's "The user's notes" table:
   `| <YYYY-MM-DD> | "<the user's words, short>" | <the rule it became> (section) |`
2. **Change the rule itself** where it lives (STYLE, SCRIPT / STORY, SOUND, VOICE), so the files never contradict
   themselves. If the note overrides a default value, rewrite it and add "(user, <date>)".
3. If it changes a kit default (a palette entry, a caption size, a face default, a sound design), change the style's
   `kit.js` or sound library only if the user wants it everywhere. Then run `node tools/check.mjs` or rebuild the
   sound.
4. Tell the user in one line what you saved, for example: "Saved: labels one size bigger by default (Stickman STYLE →
   Type)."

## Rules
- Do exactly what was named. Never loosen a rule without a dated row.
- Removing a saved preference: delete the rule, and add a dated row saying it was removed and why.

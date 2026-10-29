# Storyboard: one option as an image board (the first approval gate)

The board format is HyperFrames' (`hyperframes/references/storyboard.md` and `storyboard-format.md`: read them before the first board); the options
are the Moworks kit's gate 1 (`workflow/free-design.md`): one at first, another only when the owner asks (the kit made three). A storyboard is a set of **stills the owner approves**: the layout,
type, colour and copy of every shot at its key moment, with no motion yet.

## 1. One real option, another on request

- The best direction for the brief: its composition, type and motion language, decided. A Brand Kit the owner chose in New project
  (in `frame.md`), the design the brief describes, or with no Brand Kit a guideline binds it for its part.
- Another option (the Storyboard dialog's Make another): a real other direction, different composition, type and motion language,
  never a colourway of an earlier layout; follow what the owner asked to change.
- An option follows a HyperFrames frame preset, as it ships, only when the owner names one (name it).
- Every option has the same beats (from `BRIEF.md`); a short film (under 20 s) may show 3-5 frames, a long one one frame per shot, at most 12 (group short shots into one beat).

## 2. Files

For the option A (the owner may ask for more: B, C…, one at a time; feedback on an option makes its revision, B2 · revised from B, see below; keep every option, delete nothing):
- `boards/X/STORYBOARD.md`: HyperFrames' storyboard format, one `## Frame N` block per shot (duration, scene, voice-over line when
  narrated, the Motion Library item or HyperFrames move it will cite, `status: outline`), plus the option's one-line idea and motion language at the top.
  Its heading names it: `# Option A · "a short name for its idea"`, in the language of the chat; a revision keeps the name of the
  option it comes from (`# Option B2 · "that name" · revised from Option B`).
  Every frame is one shot with its own length in seconds (`duration: 1.8s`, never words such as "the same shot goes on"); the frames
  add up to the film's whole length (the length set in New project and the ending's fade after it, house rules §9: the app gives the
  numbers), and the Motion Plan makes one shot per frame. A beat inside a shot goes in that frame's scene, or
  becomes its own shot with its own seconds.
  The last frame shows how the film ends (house rules §9): its scene says the ending (the last shot's gentle hold and the fade out of
  the picture and the music, or the end card, its hold and its shorter fade) and the fade's seconds, which its duration includes.
- `boards/X/index.html`: one HyperFrames composition holding every frame of the option **posed at its key moment** (real words, real
  fonts, real colours, the focal point big enough to read on a phone), each at its own seconds in the film, in film order (HyperFrames'
  storyboard.md: the app snapshots each still at the frame's `poster`, or the middle of its span). Plain blocks only for media that
  does not exist yet. No motion.

When the board is written, call the app's **board_stills** tool: it takes one still per frame of each option at the film's own size
(1920×1080 for 16:9, or the size the owner typed), runs HyperFrames' check on each board, keeps them as a draft of its own (never named to the owner) and answers with the check results and each
option's sheets (3 × 3 frames each, one picture per sheet). Read the sheets once (a single still only to read small text). Fix only a real
problem (a check issue, text cut or unreadable at phone size, overlapping, not the brief), then call it again with only the frames you
changed; no further look. The owner sees
each option as its own board in the Storyboard dialog ("Option A", "Option B2 · revised from Option B"; never "round") and can download it (PNG, PDF). If the tool fails, say so in your reply.

## 3. The message

The owner reads the option in the Storyboard dialog (its STORYBOARD.md and its stills), so the chat message is short: one line for the
option (its idea and motion language), then ask the owner to approve it or to ask for another option there (or, with several, to pick one
or to mix, e.g. "A's layouts with B's palette").
**Stop.** Change nothing else until they answer.

- **None works:** ask what they like and dislike (2-4 concrete choices), make one variant at a time around the closest one (its layout with
  other colours, or its colours with other layouts). At most two such tries, then ask about the brief again.
- **Feedback on an option** (the Storyboard dialog's Feedback): the app makes its revision (B → B2) as a copy and hands you
  the notes (`@Panel_N: …` for one panel, the rest for the whole board). Check first that each note fits its panel; a note that does not
  (the panel does not show what it names, a panel that does not exist, two notes that contradict, a general note naming no panel) is a
  conflict: stop and ask (moworks-studio §2b). Then draw again only the noted panels of the revision, never the others, and take their
  stills with `board_stills` and those frames: the app keeps every other panel's still as it was.
- **The pick:** write the chosen (or mixed) option to the project's `STORYBOARD.md` (HyperFrames' format; keep the frames `outline`).
  The owner approves it in the Storyboard dialog. Its board (`boards/<option>/`) holds the layouts: the Build poses and dresses them
  (the film is written once, never posed early in the Motion Plan step).

## 4. After approval

The approved frames are settled: building means dressing those layouts (full design treatment, real assets, motion), never redrawing them
(HyperFrames `storyboard.md` § 1, step 6). A change of layout after approval goes back to the owner.

## 5. Other ways of working

- **Keep design:** no options. The owner's frames are the storyboard: rebuild each frame as a still composition, the app compares the
  stills with the owner's frames (2 px tolerance), the owner approves the rebuild.
- **Re-layout:** one board of the owner's design re-laid out for the new format; every element and all content kept.
- **Style reference:** a style guide first (`inputs.md`), then the option in that style.
- **Remake:** no options. The reference is the storyboard: the shot list (`inputs.md`) is approved instead.

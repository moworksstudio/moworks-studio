---
name: moworks-studio
description: Moworks Studio's house rules for every film style, read first in every step - the five rules of every film (collisions, readable text, determinism, truth, logos), the guideline or Brand Kit on every piece of text, the client's logo used as given, Vietnamese text, hand-drawn styles under a Brand Kit, character acting, a sound on every action, text over a canvas film, and how every film ends. Adds only what HyperFrames and the style leave open.
version: 1.3.25
derived-from: Moworks Motion kit 2.0.4 (Moworks; commit 30b7dcb65808b2a5299ad6a3357280a12773395f) - engine/skill/moworks-motion/SKILL.md step 3 ("Brand") and "Rules in every film" 1-5, workflow/characters.md sections 2, 3 ("Faces", "Hands") and 6 ("Collisions and physics"), brands/other.md; written from the idea for Moworks Studio. HyperFrames (Apache-2.0, 0.8.214 at 4719543) read as shipped where cited. Owner rules 24/10/2026 (#345, #346); the ending, owner 29/10/2026; the docs/ folder, owner 30/10/2026.
---

# Moworks Studio: the house rules of every film

Read this first, in every step, in every film style. **What wins:** where HyperFrames already has a rule (how a composition is built,
timing, determinism, captions, design files, its checks), HyperFrames' rule holds as it ships; the film style's own rules decide its look,
its drawing and its motion. This file adds only what they leave open, and the owner's own words in the chat win over it for their film.

**Two layers (owner 05/11/2026, audit/101):**

| Layer | What it decides | Where |
|---|---|---|
| **Local**: the film style's author | The look, the drawing, the colours, the pace and the cut rate, the camera, how long a move takes and its easing, the mood, how characters act, the voice's tone and pace, the sound's character | The author's source as pinned (STYLE.md, a prompt, a source skill, HyperFrames' film types) and the style's own pack in `.moworks/rules/<style>` |
| **Global**: this file, moworks-alive, moworks-qc | Only what holds in every style without changing how any author works: the story and its content, how a long film is built (§6c), truth, logos, Vietnamese text, readable text, the floor of moworks-alive (nothing still over 2 s), the mix levels (§7), how to ask the owner (§2b) | Here |

A global rule never sets a number for the pace, the camera, a move's length or the mood: where a rule here or in moworks-alive gives such a
number, it is the default for a style whose author gives none, and the author's own number wins. Where the author gives none, HyperFrames' own
number for the film's type holds as it ships.

**Where the files go:** HyperFrames' files stay where it reads them, at the project root (`index.html`, `compositions/`, `assets/`,
`frame.md`, `BRIEF.md`, `STORYBOARD.md`, `SPEC.md`, `SCRIPT.md`, `transcript.json`). The app's documents are in `docs/`: `docs/NOTES.md`,
`docs/ASSETS.md`, `docs/CREDITS.md`, `docs/QC-REVIEW.md` and `.json`, `docs/VOICEOVER.md`, `docs/CHARACTERS.json`,
`docs/MOTION-PLAN.json`. A source file that names one of these bare (an author's "record it in CREDITS.md") means the one in `docs/`;
never write a second copy at the root.

## 1. Rules in every film

1. **No collisions:** readable elements (text, UI, photos, the logo) never run into each other on any frame. Exempt: a transition
   carrier, layering the design itself makes, and big type under or over a product picture while every letter still reads. HyperFrames'
   check reports overlap, occlusion, clipping and contrast: fix each before the film is done.
2. **Text stays readable while it is meant to be read:** its entrance and exit are free; while it is read it holds (a groove may pulse it
   by about 3 %), never drifts, slides or spins away; everything around it may keep moving (the moworks-alive rule). Held longer than
   2 s, it rides the camera (moworks-alive rule 4): a slow push of the whole frame with the text in it, or a slow float of the text block;
   that is not drifting away, and "it holds" never excuses a still stretch. It holds at least
   0.5 s + 0.3 s per word; contrast 4.5:1, 3:1 for large text.
3. **Deterministic:** every frame is a function of film time only (HyperFrames' determinism rules): no timers, clock, unseeded random or
   network loads.
4. **Truth:** real content only; anything illustrative is labelled "Example"; no invented numbers, quotes, features or taglines.
5. **Logos:** section 3.
6. **Maps follow the world's standard map** (owner 06/11/2026 #1229, absolute, every film style, every map, globe, chart and satellite view):
   coastlines, countries and seas as the world's common reference maps draw them (Natural Earth's default view, OpenStreetMap). **Never** the
   dashed line, the "U-shaped" / "nine-dash" / "ten-dash" line (đường lưỡi bò, đường 9 đoạn) or any claim line in the East Sea / South China Sea, in
   the picture, a label, a legend, the voice-over or the subtitles, whatever a style's own rules, a source or a brief say (Lemo-Opuscar's
   DIRECTOR.md §13 asks for China's standard map: never followed here). A film about a territorial question draws only what the brief's
   sourced facts say, with no claim line of any country drawn as a border.

## 2. The design of every piece of text

- The film's design, as the owner chose it in New project or as it comes, governs the design of **every** piece of text in the film (fonts,
  sizes, weights, colours, case, logo use, grid and margins), not only the main layout: a label, a caption, a number, an end card.
  Precedence: the **Brand Kit** (`frame.md`); with no Brand Kit, a guideline in the owner's files takes that
  place; then the design the brief describes; what is still open is yours.
- In motion the design binds its logo and end-card rules and what its `## Guideline motion` says; all other motion is free, text included, while it stays readable. Only what is forbidden is off limits, and every film looks for its livelier moves (moworks-alive rules 8 to 10).
- **Every film in every style is bold and fun (owner 31/10), read in every step.** The Storyboard plans each frame with a lively move and living details made for this film (stickers, an icon per feature, bubbles, bursts on the hits, playful words), in the style's own hand. The Motion Plan, in every style, calls `library_search` twice for each shot before writing its moves: for what it needs, and for what would make it more fun and alive. A style with its own moves uses them first and goes past them with the library, cited as source kind `library`. Only what a guideline, the style or the owner forbids is off limits; the owner tones it down at the Motion Plan. The numbers are in moworks-alive rules 8 to 10.
- **A film style with its author's design** (every style but General Style and HyperFrames' seven film types, whose design the owner
  picks in New project: Explainers, tutorials and "how it works"; Launch, promo and feature films; Music videos and films cut to a
  track; Numbers, charts and data stories; Vertical and social clips (9:16); 3D, simulations and generative pieces; Characters,
  mascots and story shorts): the author's design (colours, fonts, layout and
  drawing technique) is the film's design, and no Brand Kit is applied by itself. Brand colours, fonts or a look other than the author's
  are a conflict (below); once the owner chose, follow it: their colours and fonts in the author's hand (marks, edges, texture and how a
  shape is made stay the author's; never redraw the author's marks as flat vector to fit a brand). In the Editor, apply a Brand Kit to
  such a film only when the owner asks, and say first what it will change. The logo (section 3), Vietnamese text and the one approval
  hold for every style.

### 2d. A Brand Kit's guideline, checked rule by rule

When `frame.md` has a `## Guideline checklist` (G1, G2...), every film is held to every line, in every step, and its `## Crop limits` and `## Guideline motion` bind:

- **Storyboard:** name in the shot the rules it leans on (a product shot: its crop line). A shot idea that breaks a line is changed before the owner sees it, or asked about (§2b), never left for later.
- **Motion Plan and Build:** a move is checked at its worst frame, not at its rest, against what `## Crop limits` says of a moving product: a guideline's own animated visual may let a product cross the frame edge while it travels, and a crop it does not show is a question for the owner, even for a moment.
- **A rule that points to a page, or a case `frame.md` does not settle:** open that page (`.moworks/library/guideline/GUIDELINE.md` lists them) and go by what it shows. Still unsettled: ask.
- **Review:** `moworks-qc` §2 item 6 goes through the list.

### 2b. A conflict or a missing thing: stop, say it, offer the choices, wait

This is the one rule for every conflict and every gap, in every step and every style; nothing else decides one by itself and goes on.
- **What counts:** the brief against the film style's own design (colours, fonts, look: an author's style) or its limits (what the style
  cannot draw, a size or rate it does not make); the brief against a New project field (format, rate, length, the Brand Kit chosen
  there); a brand guideline in the files against the chosen Brand Kit; the brief or the chat against the
  guideline; a file, link, logo, voice or text the film needs and nobody gave; a PDF with a password, whether the app's scan names it or you
  find it when you open it, in any step and in the chat: name the file, say none of its pages reached you, and offer its password in the chat (pass the
  owner's words to the app's unlock_pdf tool, then read what it names; write the password nowhere), a copy without a password, or going on without
  it; a wrong password: say so and ask again; never guess one, never go on as if you had read it; a script the owner wrote for the voice-over (the brief's
  "lời đọc" or "kịch bản", or a brief that is the script) that you would shorten, split, reword, cut lines from or move lines of to the
  words on screen: it is read word for word unless the owner chooses otherwise, so ask with the whole script as one choice and your
  version (its changed lines named) as another; never call a changed script "verbatim" (a 12-line script went to the voice as its first
  9 lines, "the rest told by typing", written down as "the brief's script verbatim"); a voice-over longer than the film's length set in New
  project (a 45.6 s voice made a 40 s film 47.5 s, said only after): offer a longer film (the voice plus the end hold), a shorter
  script with the voice made again, a faster voice (the Voice screen's speed), and tighter pauses only when they add up to the difference;
  never lengthen the film, drop the end hold or cut the voice on your own; a voice-over well short of that length (an 80 s voice on a
  100 s film got a 24 s wordless shot, said only after it was drawn): offer first the usual answer, the voice kept as it is, cut by sentence
  and spread across the film with the gaps left to picture and music, then a shorter film (the voice plus the end hold), a longer script
  with the voice made again, or wordless stretches planned with the owner (where each falls and how long); never fill the gap with a
  wordless or longer shot on your own; and any change to a Brand Kit value: a colour, or a font that cannot draw Vietnamese or
  that the app does not have (offer 2-3 Vietnamese fonts the app can use, nearest first with a short reason, "upload the font file" when
  it is missing, "keep it, accept the missing accents" only when the font exists); the same for the film style's own font (the author's
  face) when it cannot draw the Vietnamese letters the film writes: never swap it for a near one on your own; and a note
  (in the chat or the Storyboard dialog) that asks to take out or change a mark the style's author made part of the medium, the marks its
  reference names (film grain, a print's sprocket scratches, line boil, halftone dots, the paper's tooth, the author's palette): say it is
  the author's mark and what it gives the film, and offer keep it · keep it lighter · take it out only in the frames the note names · take it
  out everywhere; never take it out on your own, and never in frames the note did not name (a rubber-hose film's sprocket
  scratches, named rightly, were taken out of every scene for a note on four frames). The Build and the Review keep every such mark in
  every frame unless the owner chose otherwise among these choices; a removal written in frame.md, docs/NOTES.md or the code without the owner's
  choice (an earlier step's own reading of a note) is not a choice: ask with these choices before you build, and keep the mark until the
  owner answers.
- **Also what counts:** a lyrics video with no lyrics yet, or a song the app could not hear, when the brief does not say to go without them: ask for them in the Lyrics dialog, and offer
  what Whisper heard as a draft, or a film with no sung words (never fit words to the beats by guess; timing is the app's); a word whose marks you know only from a file name (a
  file name has no marks: "GAP MO" can be "Gập Mở" or "Gấp Mở"): ask how it is written, never guess the marks (a film wrote "GẤP" for the song's "Gập").
- **What to do:** write nothing that depends on it. In one message, list every point (what each side says, in plain words), and for each
  ask one short question on its own line with its two or three choices as a bullet list under it, one choice a line, your suggestion
  first, never inside the question's sentence, however the rules above list them:

      1. Màu chủ đạo nào?
      - giữ màu đỏ của tác giả (tôi gợi ý)
      - dùng xanh ngọc #00A6A6 của brand
      - đỏ cho nền, xanh ngọc cho chữ

  For something missing, say what it is and the ways on (add it with the Assets button, a stand-in, go on without it), as the same list.
  Group every question of the step in that one message, then stop: the app shows "Waiting for you" and a card. Never pick for the
  owner, never "follow X and say so in one line".
- **After the answer:** follow what the owner chose for each point (write it in docs/ASSETS.md or docs/NOTES.md so later steps keep it), then go
  on. No answer yet: nothing moves; New project's fields stand only until they choose.

### 2c. A product's features from the web: only after the owner's yes (owner 31/10)

When the owner brings a product for a product showcase or launch (a named product in the brief, its pictures or a render in the files), this is yours to raise: the owner need not ask for it.

- **Prepare asks, once,** in the step's one message, as §2b writes a question: may the app search the web for this product's features, to use as text and supers in the Storyboard and the Motion Plan? Yes (your suggestion) ·
  No, only what I gave. Skip it when the brief already answers, or the owner gave a full sheet of the features and says it is all. Pass their answer to the app's `product_research` tool. A film that shows no product says `not-product`, once, when you need to search for anything else.
- **Never search for the product before the yes,** whatever the project's web setting says; the app stops the search. No: the film works from what was given, and you write no feature or figure they did not give.
- **Yes: search,** the maker's own website first (the product's own page, its specs page, then its press releases; a brand's site for the film's market when it has one), then well-known reviews for what the maker does not say; never rumours or leaks. Nothing official found (a product not out yet): say so in one line and work from what was given. Write `docs/RESEARCH.md`, one row a fact: `| Fact, as the film could say it | Figure | Source (full link) | Read on (date) | Use it? |`. A fact with no source you can name is no fact: leave it out. Two sources that disagree: both rows, and ask.
- **Use, without being asked:** a product film's Storyboard carries supers of the product's strongest features from those rows (a brief that sets its own text keeps it), written short, for the film, in the Brand Kit's type, each at the shot that shows that feature. The text and the supers of the Storyboard and the Motion Plan come from those rows or from the owner's files, and every figure on screen is traceable to one (moworks-studio rule 4). The Storyboard's message names which facts it uses, so the owner sees them when approving.
- **A Brand Kit's rules:** its rules on claims, names, trademarks and disclaimers win over a source: what they forbid is not shown, and a claim they require (a disclaimer, "Image simulated") goes with it. A kit's "never invent a figure" forbids made-up ones: a row with its source is not invented, and it needs no placeholder once the owner has approved the Storyboard that shows it.

## 3. The client's logo

- **The given file only**, as it is: never redrawn, retraced, recoloured, stretched, cropped, outlined, shadowed or given an effect (glitch,
  blur, split, glow). A light or dark version only when the owner's files hold it.
- **Never put inside a card, badge, pill, frame or box, and no text added around it.** A tagline or a name line only when the brief asks
  for it in so many words, and then as its own text line, apart from the logo, in the design's type.
- It enters and leaves **as a whole** (fade, slide, uniform scale), unless the guideline gives its own logo animation.
- **It may breathe** (HyperFrames 0.8.163, Apache-2.0: the `cta-morph-press` blueprint of hyperframes-animation, "faint rotation-only
  resting breath (logo scope only)",
  https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/skills/hyperframes-animation/blueprints/cta-morph-press.md;
  hyperframes-creative's `motion-principles.md`, logo breathing on the scene's timeline,
  https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/skills/hyperframes-creative/references/motion-principles.md;
  HF retired both in 0.8.185, so the studio keeps this as its own rule): a faint uniform scale (at most 2-3 %) or rotation (at most
  about 1°), slow, on the shot's timeline. Never a distortion (no skew, no squash, no scale on one axis), never so much it reads less
  well, never in a groove.
- The Review checks it on every film: the logo is the given file, whole, undistorted, clear, with nothing added around it.

## 4. Vietnamese text

- Every diacritic visible on every frame: leave room above and below in masks, clips and line-heights; a font that draws every
  Vietnamese letter (the app checks the glyphs).
- Vietnamese is always written with its marks, in every style: an ASCII, CRT, monospace, pixel, all-caps or "machine" look is never a
  reason to drop them (a CRT film's status strips read "NHAT KY · TRAM HON GIO" for "NHẬT KÝ · TRẠM HÒN GIÓ"). A band, strip, highlight,
  pill or inverted cell behind Vietnamese text is tall enough for the marks above and below the letters (about 1.4 × the font size for
  capitals with stacked marks): the marks of dark text on a light band that fall outside it are drawn in the ground's own colour and
  vanish. When the style's face or grid cannot hold them, that is a conflict (§2b), never a reason to strip them.
- On-screen text and voice in the brief's language; the chat in the owner's.

## 5. Characters: acting (any character engine: anidoodle's human engine, the Brush cartoon engine, drawn HTML people)

- **List the gestures before animating:** from the storyboard, for each character, every pose AND every gesture (two palms rising one
  after the other, a knee bending on a landing, a head turning to the speaker), with its time. The character's sheet shows those
  gestures, not only rest poses; a gesture the engine cannot make is named to the owner before the build.
- **Faces are never frozen:** every character on screen longer than a second has an expression that fits the beat, blinks (a lid for
  about 0.1 s, every 2-5 s) and a talking mouth while it speaks.
- **The face carries the story's mood** (the film kind's, then the brief's, then the style's), in the engine's own way and within what its rig
  can do: a face never stays blank through a beat that has a feeling. A pose or an expression the rig cannot make is named to the owner.
- **Hands act:** open, relaxed, pointing, gripping, as the gesture needs; a hand that holds something grips it.
- **Weight and contact:** feet on the ground (no sliding, no floating; a step plants the foot), weight shifts before a move, anticipation
  before a big action. Anything that lands squashes and settles, and what it hits reacts. Nothing floats unless the story makes it float.
- **Always alive** between the gestures (the moworks-alive rule): breathing, sway, blinks.
- Each engine's own tools do it: anidoodle's poses inside its joint limits, `toScene`, `planWalk` / `walkAt`; the Brush engine's
  `character()`, emotions, takes and turns. Never the retired Moworks Motion kit's runtime (`AIMK_RIG`, `AIMK_ART`): it does not exist here.

## 6. The storyboard and the cut, checked in every style

Written from the storyboard self-check and the motion check of What If animation (FreshStack, MIT,
https://github.com/kelano86/what-if-animation/tree/8092fb5e825e55456d1d47fec0ebf595cb93cc0d, `references/look.md`), keeping only what
holds in every style; what holds only for a lit-room, stick-figure look stays in `.moworks/rules/what-if/references/look.md` and is never
applied to motion graphics, line art, ink or paper styles. With the board stills (Storyboard) and the QC sheets (Review), check each shot:

1. **One read in a second:** at phone size the subject and the action are clear without the voice; if it needs the voice, reframe it.
2. **The size or the angle changes at every cut:** no two neighbouring shots share both (wide, medium, close, an insert, over the
   shoulder, high, low); in a one-shot film, the camera's distance or angle changes between beats instead.
3. **The face reads:** a character's face is the clearest, sharpest thing in its area, and its expression and pose say the line
   without the voice (§5).
4. **Continuity:** the same costume, the same layout and the same props in the same places across the shots of one place.
5. **On the word:** an action that illustrates a word lands within about 3 frames of it; a realisation holds about 2 frames before the
   reaction; a landing overshoots and settles (§5); nothing jumps between two frames unless it is meant to (a cut, a flash, a "paste").
6. **Sounds named:** HyperFrames' `- sound:` line describes a frame's sound in words; the app places effects only from short names. A
   frame whose sound has effects (a bell, water, a click) also gets `- sfx:` with short English names (`- sfx: bell, water drip`), and
   a frame with a place gets `- ambience:` (§7b: a sound on every action).
7. **It makes sense, in a film that shows how something real works** (an explainer, a product, a process, a story in the real world; from Showhow's "it must make sense three ways", Sirio Berati, MIT,
   https://github.com/sirioberati/showhow/tree/c5ce0e63eb5a08807627a2e30a45f0e03abb86e0/skill/SKILL.md):
   - **Physical:** what loses its support falls the full distance, starting slowly; nothing appears or vanishes with no cause the film shows; sizes and weights stay believable.
   - **Story:** one chain of cause and effect on things already seen, that a stranger could retell from the pictures alone.
   - **The eye:** one main thing to follow at a time, where the eye already is; what the voice names is whole and readable in the frame; no label over a number.

   This is about what the film claims, not how lively it is. A style's own world (a cartoon, floating graphics, a surreal film) keeps its logic, the always-on drift of moworks-alive stays, and
   no move is made tamer for it (moworks-alive rule 8).

The Review scores these under its own criteria (moworks-qc: Composition, Motion, Sync); moworks-alive keeps the still-stretch numbers.

The approved storyboard is the owner's: once STORYBOARD.md is approved, the Motion Plan, the Build, the Review and the sound
never edit its frames (their times, words or scenes). A timing the voice or the build needs goes in docs/MOTION-PLAN.json or the film's own
code; a change of what a frame says or shows is the owner's to approve (§2b). The app puts the frames back as approved after such a
step; only the owner's own requests in the chat change them.

## 6c. A long film is never a short one stretched (owner 05/11/2026, every film style)

The house rules were first made on films of 15-30 s. A film of a minute or more needs its own care (Test 38, 190 s, read slow and sad):
- **Length comes from content, never from stretching.** A film longer than its style's demo keeps the demo's pace (measured: its cuts a
  minute, its moves, its camera), and gets its length from more beats and more shots, never from longer shots, slower moves or a slower
  reading. A style made of one continuous take keeps its take and changes what it shows along it.
- **A long film has a shape:** chapters (each one idea), each changing its treatment, its framing and its rhythm from the one before; one
  rise to a peak; a quiet beat that stays short and turns; no layout or move repeated as the film's habit. HyperFrames: any single treatment
  goes stale after about 6 s. All of it in the style's own hand.
- **The voice fits the film without dragging.** The film kind's and the style's own script rules come first (What If, Map Explainer, a
  source skill's SCRIPTING.md, HyperFrames' film.md). A script Claude writes is sized to the film at the style's reading pace; a script the owner
  wrote is read word for word (§2b). When the content is too thin for the length, do not write filler and do not read slower: offer the
  owner, as §2b says, more content (an example, a fact with its source, a small scene), a shorter film, or the film as it is.
- **Before the Storyboard,** for a film longer than its style's demo, say in one line how the length is filled (how many chapters, about
  how many shots), so the owner sees it before frames are drawn.

### 6d. Delivery tags for a voice ElevenLabs makes (owner 05/11/2026 #1063)

When the app's ElevenLabs makes the voice (Eleven v4 by default, v3 too), the words to read in `docs/VOICEOVER.md` carry delivery tags:
short directions in square brackets, in English, just before the words they colour (`[curious]`, `[excited]`, `[whispers]`, `[laughs softly]`,
`[building energy]`, `[warm, smiling]`). Read what each beat says and how it should feel (the film kind, the brief, then the style's voice
tone, which is the author's) and put a tag where the delivery should change: a question, a surprise, a secret, a joke, the twist, the build to
the peak; never on every line. Only tags about the voice, never one for a sound (`[applause]`, `[explosion]`: the effects are the app's).
CAPITALS on one stressed word and an ellipsis for a pause work too. On a script the owner wrote, add tags the same way and change no word:
say in one line how many tags you added and where; the owner sees them in the Voice screen's Script box and may take them out. A voice the
owner records has none. The app never speaks or shows a tag: what is written on screen is the words without them.

## 6b. Feedback

- **Feedback against the film style** (darker and older on a style whose author says "clean", "not a ruin"): say so in one line before you change the picture, and ask; the style's author decided it. A note that does not touch what the style fixes: just do it.
- **Feedback that changes what a shot is:** change the shot's title and its lines in the Storyboard too, not only the Motion Plan and the film, so its name says what it now shows.
- **Occlusion:** `data-layout-allow-occlusion` is for one element with its reason in docs/NOTES.md, never to quiet the check; the product or a text the viewer must read never gets it.

## 7. Sound under a voice-over

**A level the owner asks for:** change only the track's `data-volume`. Leave `data-mw-gain`, `data-mw-gain-mark`, `data-mw-fit` and `data-mw-duck` as they are: they are the app's mark of what it set, and a level that differs from the mark stays as the owner's. Name a voice `data-timeline-role="voiceover"`, and when you move a sound from one lane to another use the app's tools, not the file.

Only when the film has a voice-over with its reviewed transcript (transcript.json, word timings). Written from What If animation's
`references/sound.md` (FreshStack, MIT):

- **The transcript gives the times; the brief's script gives the words.** A voice's words are heard by a machine and some come out wrong (Test 36: at least 12 in a poem). When the brief holds what the voice says, anything written on screen follows the brief, and `docs/NOTES.md` names the words that differ in one line.
- **An effect that illustrates a word goes in the pause just after it, never on it** (the word stays clear and the sound answers it);
  write its `- sfx:` cue at the word's end (`name@<seconds into the shot>`). The app also moves an effect that would fall inside a spoken
  word to just after it.
- **Effects line up by their attack:** the app places each one so the moment it starts sounding, not the file's start, lands on its cue.
- **The music plays to the film's end and fades out there** (the app sets the fade on the music track: the ending's fade, §9). Stop it early
  only when the owner or the brief asks for it: call the app's `music_stop` tool with that second (in a pause of the voice), or the
  owner sets it in Final Mix ("Stop the music at"). A film kind or a style may have its own rule for this (What If: its own
  `SKILL.md`); never stop the music at a twist on your own.
- **The mix levels (owner 05/11/2026 #1027, every film style, over any style's own numbers):** the voice-over at -16 LUFS; the music
  1.5 dB under the voice between the words and 10 dB under it while words are spoken; the sound effects at their loudest 6 dB under the
  voice, and 8 dB under it on a spoken word; the render masters the whole film to -14 LUFS, true peak -1 dBTP (Render's Standard, the web's level;
  Quieter -16 LUFS when chosen, owner #1073). The app sets them (Final Mix, Balance again); a source skill's own mix
  numbers (a music bed far under the voice, a louder master) give way to these. A level the owner sets stays theirs.
- **The voice stays on top:** the app's voice check lists every spoken word where the effects come within 8 dB of the voice or the music
  within 3 dB (a warning, never a block); fix each by moving the effect into the pause after the word or lowering it.

### 7b. A sound on every action (owner 30/10)

In every style, every film (the owner: "every film in every style must have full sound effects on every action in the film, for a lively
mood"):

- **Every visible action gets a sound:** an entrance, an exit, a landing or an impact, a step, an open or a close, a pour, a page, a press,
  a glow or an appearance, a transition. **Every scene that has a place gets a quiet ambience bed:** a room, a street, rain, the sea, a
  forest, the night.
- **A film made for its song** (a lyrics or music video): no sound effects and no ambience, the song is what is heard (owner 31/10). Write `none` on every line below; only the
  owner's own word brings a sound in, through `sfx_prefs`, and then few, under the song.
- **The other exceptions:** the brief or the owner asks for silence or for fewer sounds; the film style's own sound section says otherwise
  (it wins: an ASCII / CRT style's relays, keys and printer, never a whoosh); or the action is too small to hear (a blink, a breath, a sway).
- **In the style's material:** paper and wood for crafted styles (paper, cut-out, clay, stop-motion), synth and electronic for CRT, terminal
  and tech, soft and organic for gouache and watercolour, cartoon for rubber-hose. Name the sounds that way ("paper slide", "wood thud",
  "synth blip", "soft pop", "boing").
- **Name what is heard: the thing, its material and its action** ("crayon stroke on paper", "snail shell sliding on wet stone", "door knock
  wood", "letter paper unfold", "thread rustle", "wooden box lid"), never a bare "pop", "sfx" or a motion verb alone ("pull", "park", "roll",
  "close"): the app matches the thing and its material first, and a bare verb can match another thing's sound (Test 26: "thread pull" was a
  plug pulled out). A cue is one sound at its moment; a place's sound is its `- ambience:` line, never a cue. Every row of the Motion Plan
  that moves something names its sound that way (entrances, exits, landings, text writing on, camera moves and cuts, a character's
  actions, two things touching), so the app can make or find the right one; never a stand-in name for a sound the app could make better.
- **The right sound first, however often it plays (owner 05/11/2026 #1113, in place of "at most three times" of 30/10):** an action
  that happens again takes its own sound again; the app plays each repeat a little higher or lower. Name a repeated action by what is
  heard each time; a different name only when the sound is different.
- **Storyboard:** each frame names the sound of each of its actions in `- sfx:` (short English names, comma-separated, each at its moment:
  `- sfx: pop, door open@1.2, footstep wood@2`) and its place in `- ambience:` (`- ambience: rain`, `city street`, `room tone`, `forest
  night`; `none` for a shot with no place). Under a voice-over §7 holds: an effect goes just after the word, never on it.
- **Motion Plan:** every motion row carries `"sound"`: a short name for what the row does on screen, or `"none"`.
- **The app does the rest at Final Mix:** it gives every action the names leave out a sound of its own, varies the repeats, keeps a sound
  on every action (only two of one kind within 0.1 s are one sound; a small action's sound plays quieter, never left out), sets each kind
  of sound under the music and the voice, crossfades the ambience between places and fades it out with the film's ending (§9). Tech checks'
  G-SFX ("Actions with no sound") is to be zero once the sounds are placed.
- **Where the sounds come from (owner 05/11/2026 #1034, #1096):** the app's offline library when it has the very sound; else the app shows Claude
  the cue's moment and the library's closest sounds and Claude picks the one a sound designer would use there, or describes the sound and the app
  makes it with ElevenLabs Sound Effects (the owner's key and credits; kept in the film and the studio's cache, credited); then the online search;
  then sounds made by code for a cue none of them has (the order of 04/11, code first, made Test 38's sounds dull and off the picture). A sound heard
  again is a little higher or lower each time; it may play as often as the film needs (#1113). The code: the owner's
  film styles' own sounds (a style's signature sounds stay in its own style), new ones made by their recipes and by the app's (impacts by material,
  steps by ground, paper by action, a crayon, a marker, a pencil or chalk by stroke, doors, water, fire, wind, rain, bells, machines,
  electronics, magic, birds, frogs, crickets, a heartbeat…), each film with its own takes. It decides the source itself; you name the sound by the thing on
  screen and its action (`- sfx: rock grain crackle, earth whoosh past`), so the library finds the one that matches the picture. Nothing about it is on screen.
- **A sound the code cannot make yet:** when a cue needs one (Final Mix's note says it was left out, or it is on a stand-in, or its name
  finds only a wrong kind), you may write a recipe for it: `.moworks/sfx-recipes/<sound-name>.py` (lower-case words and dashes), with a
  one-line docstring of what is heard, `FAMILY = "<one of the library's families>"`, `TAGS = ["<the cue's name>", "<other names for it>"]`,
  `DURATION = <seconds>` and `def make(rng, p):` returning a mono numpy array (or stereo `(n, 2)`) at `SR` (48 kHz). It gets `np`, `signal`
  (scipy.signal) and the owner's sfxlib ingredients by name (`tt`, `bp`, `lp`, `hp`, `norm`, `modes`, `transient`, `grain`, `moving_band`,
  `sub_kick`, `fm_bell`, `space`, `pan`…): no import, no file, no name that starts with `_`. `p` holds `dur` for a sound that lasts as
  long as its motion. Write it the source skills' way (noise grains, damped modes, filters, envelopes; never a sample), then ask the owner to press
  Place them again. The app runs it in its restricted runner, levels it, checks it (no silence, clipping or DC), and keeps one that passes
  for later films. Effects only: music stays licensed.
- **The owner's word holds:** when the owner asks for no whoosh, fewer or more sounds, no ambience or silence, call the app's `sfx_prefs`
  tool; the app keeps the choice on every placement. Never only edit the `- sfx:` lines for that: the app would put its own sounds back.
  A frame whose `- sfx:` says `none` stays silent: the app adds nothing of its own there, no whoosh into it either.
- **A cue changed in the chat:** on a film whose sounds are already placed, the app places a `- sfx:` line you add or change by itself, a few
  seconds after your turn ends. Tell the owner it will be in the mix in a moment; never say it is not in the mix or ask them to press Place
  them again. A sound the owner moved or took off on the timeline stays as they left it.

## 8a. Editable first, in every film style (owner 05/11/2026 #1134)

The owner changes films after they are built, in HyperFrames Studio and in After Effects. Every film is made as editable as its style allows,
in this order, and goes down a step only when its style cannot do the one above:

| Step | What it means | When |
|---|---|---|
| 1. **Fully editable** | Every thing on screen is its own element on the page (HTML, SVG, CSS): text, shapes, icons, characters' parts. Studio selects and changes each one; After Effects gets each as a layer | the default for every style |
| 2. **The text editable** | The picture is drawn on a canvas (the style's own engine draws it, or three.js) because the style cannot be made of elements, but every plain text is an element over it (below) | a style whose look needs a canvas |
| 3. **Nothing editable** | All of it is one drawn picture | only text the style performs (below), and what the style's own rules name as such |

A film that goes down a step says why in `docs/NOTES.md` (one dated line). The app checks it: Tech checks' G-CANVAS-TEXT names the text
drawn into the picture (a warning). A film style's own rules may name its performed text; where they name none, all of its text is plain text.

## 8. Text over a canvas film (owner 27/10)

**3D (owner 04/11):** when the owner asks for 3D, never answer that the app cannot do it. three.js is on this computer: offer it as one of the choices, a 3D scene built by code (shapes, materials, lights, a moving camera) in the film style's colours. Say plainly that it is not photoreal like a 3D render or a photo, and that it reaches After Effects as one picture. HTML / CSS / GSAP stays the default when the owner did not ask for 3D.

### 8b. 3D that reads as 3D (owner 05/11/2026)

When the owner asks for 3D, Prepare names the shots it would build in 3D (every shot whose subject is a thing in space is a candidate, not
one by default) and the owner chooses. A style with its own 3D engine (3D Cartoon) builds it its own way; otherwise HyperFrames' `3d.md`
holds as it ships (fly or push into the subject rather than orbit it; one hero object). In every 3D scene, in the style's colours and bans:
something to measure the depth by (things near and far that move against each other as the camera moves, something passing in front),
a camera that travels rather than turning in place, and form that reads (a silhouette that changes as it turns, a cast shadow, a lit rim).
The 2D shots around it take their depth the style's own way.

- **No surface fights another (owner 05/11/2026, T39-8):** two surfaces never share a plane: water on a stone's top, a decal on a wall, a floor
  under a rug sit at least a few centimetres apart (or the upper one takes polygonOffset), or the picture flickers frame by frame as they trade
  places. Tech checks' G-FLICKER reads the render for a frame that jumps to another picture and back.

Only when the film draws on a canvas: its film style's After Effects badge is "video" (measured on the style's demo), or the film's own
code draws its picture on a canvas (a 2D or WebGL canvas, three.js, an engine's page). The app says so in the step's message. Such a film
reaches After Effects as one rendered picture, so its text splits in two kinds:

1. **Plain text goes in HTML over the canvas**, so After Effects gets it as editable text layers: titles, subtitles and captions, data
   labels and numbers, lower thirds, end cards.
   - The style's own font, size, colour, place, timing and motion: the frame looks the same as before. The element sits over the canvas
     in the same composition, placed in the frame's pixels (the canvas's own size mapped to the frame), moved by the same film time
     (the composition's timeline, never requestAnimationFrame or a clock), and the canvas no longer draws that text (never both).
   - A grain, paper, light or any texture the style lays over the whole frame goes over that text too: a CSS overlay on top of it
     (the same texture, blend and strength), so the text does not sit clean on a textured picture.
   - Text that cannot be made to look the same in HTML stays on the canvas; write why in `docs/NOTES.md` (one dated line).
2. **Performed text stays on the canvas exactly as the author ships it**: text whose look or reveal is the style's own drawing (the
   Whiteboard pen writing each stroke on the board, Brush's painted letters, ASCII or CRT characters). That is the author's touch
   (sources as shipped): never move it to HTML, redraw it or change it.

Never edit HyperFrames' skills or a style author's sources for this: the film's own files only.

## 9. The ending: no film stops dead (owner 29/10)

In every style, every film. HyperFrames' own rules on the end hold as they ship (`hyperframes/references/story.md`: the end card is built,
not a still, its mark and call to action land and hold 2-3 s; `motion.md`: the film's last line holds at least 2 s; `sound.md`: the music
ends with a short fade under the end card); this adds the fade:

- **No end card or logo:** the last shot holds and keeps moving gently (nothing still for more than 2 s, moworks-alive), and **the picture
  fades out while the music fades down, together**, over the ending's fade: the picture's opacity to the film's background over the last
  seconds, on the root or the stage that holds every layer, in the film's own timeline (deterministic).
- **An end card or a logo:** it is part of the content; it lands and holds as HyperFrames says, then a **shorter** fade of the picture
  and the music after it.
- **The fade comes after the length the owner set, never out of it** (owner 29/10: a fade inside would squeeze the film). The length set
  in New project is the content; the fade is added after it: 60 s is a 65 s file, 1:45 is 1:50, 10 s is 11.5 s. The whole film (the
  root's `data-duration`, the storyboard's frames, the Motion Plan's shots, the music and its beats, the render, Tech checks) is the
  content plus the fade; the last shot carries the fade at its end. The app tells each step the three numbers.
- **Only when the brief or the owner asks for exactly or at most that length** ("exactly 60 s", "no longer than 60 s", a platform's
  limit) is the fade inside the set length: the Motion Plan's `ending.inside` is `true` (`false` otherwise, the default), and the whole
  film is the set length.
- **A Brand Kit whose guideline sets the ending** (a `[end]` line in `frame.md`'s checklist, as an end tag): play it exactly as the guideline says, with no fade of the picture on it or after it, and write the Motion Plan's `ending` as an author's ending below, naming the guideline's end tag (owner 31/10). The music may fade within it.
- **A style whose author gives its own ending** (Lemo's end cards, What If's last beat, a drawing that holds as its own end card): keep
  that ending as shipped and add nothing after it; the app fades the music within that ending. **Name it and play it:** the Motion Plan's
  `ending.author` says what the author's ending is, concrete (the screen powers down to a dot, the cursor stops and the screen holds, the
  end card lands and holds 2-3 s), and the last shot plays it (its row marked `"ending": true`). A plan that says `author` but names no
  ending or does not play it in the last shot, or a style whose author has no ending of its own (General, HyperFrames' own styles), gets
  the house fade: the picture and the music fade together, after the set length. A picture kept lit and moving to its last frame, then
  cut, is no author's ending (T24-12). **"The page holds" is an ending only if nothing changes in the last half second:** in a style whose
  lines boil or whose camera drifts, stop them there, or fade the picture out (T37-9: a crayon page still boiling, lit to 89.98 s, read as a stop).
- **The fade's length** (the app's one rule, `hf-edit/ending.mjs`), from the content: 12 % of it, at least 1.5 s, and 3-5 s for 30 s or
  more (10 s: 1.5 s, 20 s: 2.4 s, 30 s: 3.6 s, 60 s and longer: 5 s); after an end card half of that, at least 1 s.
- The Motion Plan says it: its `ending` (`fade`, `endCard` or `author`, the fade's seconds, `inside`, and for `author` the ending's
  words in `author`) and the last shot's ending row (`"ending": true`: the fade, or the author's ending). The app fits the music to the
  whole length, sets its fade to the same seconds, and Tech checks flag a film whose last half second is a hard cut (the picture still
  full and lit on its last frame), in every style, naming the time; with the author's own ending named and played, a dark screen, a dot
  or a held end card ends the film too.

## 10. Subtitles: plain, like YouTube's, and the owner can change them (owner 31/10)

**Two different things, never mixed up (owner 31/10):**

| | Subtitle | Super (big text) |
|---|---|---|
| What it is | The words being spoken, as spoken, timed to the voice | The film's own words: a title, a headline, a keyword, a number, a lower third, an end line, a lyric in a lyric video |
| The owner calls it | subtitle, phụ đề, sub, "caption the voice" | super, text, chữ, chữ lớn, chữ to, title, tiêu đề, headline |
| Look | This section, the same in every film | The film's design (§2): big, styled, placed and moved freely |
| Where it lives | The captions composition, listed in the Editor's Captions row | The shot it belongs to, never the captions composition |

A request about one changes that one only: "more text" or "a bigger title" adds no subtitle, "add subtitles" adds no super and does not restyle the supers, and a super is never turned
into a subtitle or shrunk to one to make room. A film may have both. The word "caption" alone, or a
request that fits both: decide from what it points at (spoken words: a subtitle; words of the film's own: a super); if that does not settle it, ask in one line before changing anything.

**Two kinds of subtitle; the owner chooses (owner 05/11/2026 #1174).** When the owner asks for subtitles and does not say which kind, ask in one
line with the two as choices, then make the one chosen:

| Kind | What it is |
|---|---|
| **Plain** | The rules below: one line, white, thin, still, like YouTube's |
| **Word pop** | The words pop on one at a time as they are spoken, the way faceless channels caption (Test 41's 3D Cartoon film, its source skill's ToonCaptions) |

**Word pop**, when chosen: groups of 1-3 words, each word appearing on its own spoken time (the transcript's words) with a quick pop (scale 0.8 to 1
in about 0.12 s, no bounce past 1.05); the word being spoken stands out (white with a colour accent of the film's palette, or bold), the others of
the group white; a bold sans that draws Vietnamese (Be Vietnam Pro or Roboto Flex at 800), 6-7 % of the frame's shorter side; a dark outline or soft
shadow so it reads on any ground; centred, in the lower third (16:9) or a little under the middle (9:16), kept off faces and the film's own words.
It lives in the captions composition like the plain kind, each group its own timed element, so it stays editable. The rules below do not apply to it,
except one group at a time and never covering what matters.

Subtitles or captions of the voice are not part of the film's design: they look the same in every film and every style, whatever §2 or the
style's own rules say of other text. Only the owner's own words can ask for a styled caption (karaoke, popping words, or the Word pop kind above); a lyric video's lyrics and
the film's own words on screen are the film's design, not subtitles. HyperFrames' `references/captions.md` holds for words, timings and structure;
its sizes, places, blends and motion give way to this:

- **One line, always:** one group on screen at a time, on one line that fits inside the safe width, at most about 42 characters. Too long: split it
  at the phrase, with the next group taking the words at their own time. Sentence case, as spoken; never all capitals.
- **White, thin, plain:** `#FFFFFF`, weight 400, **Roboto Flex** (the app bundles it; it draws Vietnamese). A film with a Brand Kit uses the Brand Kit's body
  font at its regular weight instead. No shadow, outline, gradient, colour per word or highlight.
- **Size:** 3.7 % of the frame's shorter side (40 px on a 1080 side), in every format.
- **Place:** centred, the bottom of the line resting on the frame's bottom safe margin (5 % of its height, or the bottom margin `frame.md` gives). Every
  group in the same place: no group moves for a shot. Where one covers something that matters in the picture or the film's own words, it stays,
  and your reply names the time.
- **No motion:** a group appears and goes on a cut, with no fade, slide, pop or word-by-word reveal.
- **A dim layer only if needed:** where white is hard to read over the film (a light or busy ground), the same black layer behind the words in every
  group, tight to the line, opacity between 0.3 and 0.5, the lowest that reads; a dark film has none. Look at frames from the film to choose once.

```html
<style>
  .cap { position: absolute; left: 5%; right: 5%; bottom: 5%; margin: 0; text-align: center; white-space: nowrap; }
  .cap span { font: 400 40px/1.3 "Roboto Flex", sans-serif; color: #FFFFFF; padding: 0 .35em; background: rgba(0, 0, 0, .4); /* background only if needed */ }
</style>
<p id="cap-01" class="clip cap" data-start="1.56" data-duration="2.04" data-track-index="0"><span>Một phút mỗi ngày</span></p>
```

The Editor's Captions row lists the groups written in the captions composition, and the owner changes their words there by hand. So each group is a
real element in that file, with its own `data-start` and `data-duration` and its words inside it, never built by a script at run time; a ready-made
caption style that builds its groups by script is not used.

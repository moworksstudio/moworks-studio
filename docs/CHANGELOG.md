# Changelog

One entry per version, newest first. The version is the HyperFrames version the app runs (0.8.214 runs HyperFrames 0.8.214); fixes to the
app alone on the same engine are 0.8.214.1, 0.8.214.2…

## 0.8.214.1 (2026-10-30)

The first update after the release, still on HyperFrames 0.8.214: a sound on every action from an offline library, and the fixes
that two nights of test films found.

### Sound on every action
- **Every action sounds, in every style:** an entrance pops, an exit whooshes out, a landing thuds in its material, a walk steps, a
  door opens, a page turns, a pour pours, a glow sparkles. The storyboard names the sounds (`- sfx:`) and each scene's place
  (`- ambience:`), the Motion Plan gives each motion its `sound`, and the app gives every action they leave out a sound of its own.
- **From the app's own library first:** 250 CC0 and public-domain sounds that ship with the app, in the film style's material (paper
  and wood, synth, soft and organic, cartoon); Freesound only for a name the library cannot match. Repeats of one sound vary.
- **Lively, never cluttered:** about three sounds a second at most, never two of one kind closer than 0.2 s, and each kind of sound
  at its own level under the music and the voice; a small move is quieter.
- **Ambience:** a quiet bed under every scene with a place (a room, a street, rain, the sea, a forest, the night), crossfaded between
  places, ducked under the voice-over's words, and faded out with the film's ending.
- **Your word holds:** "no whoosh", fewer sounds or no ambience said to Claude is kept on every placement, and the Final Mix takes
  out a single sound (×), sets how many (every action, most, only the big ones) and turns the ambience on or off.
- **Tech checks:** a new warning lists the actions of the Motion Plan that have no sound.

### Fixes after the release review
A review of the whole app before the release found these; all are fixed in 0.8.214.1.
- **Update:** the in-app update reaches GitHub again, and its dialog shows the new version's date and subject instead of a commit code.
- **Set up:** the lead line names the step that is still open, "Included with the app" lists What If, and HyperFrames' parts show the
  commit they are pinned to.
- **Storyboard:** frames stay visible after the app restarts.
- **No file paths on screen:** messages, Settings and the Projects page show names, not paths.
- **Files:** opening a file from a project opens only media and documents, and the name of an imported PowerPoint file cannot run
  commands.
- **Claude's access:** Claude's own token reaches only its permission prompts, and HyperFrames telemetry is off for Claude's commands
  too.
- **Film styles:** HyperFrames' new "Social" and "Story" styles sort with their categories.
- **Sound effects:** typing sounds only where text is typed (a "type block" is not typing), a whoosh only where the picture changes,
  and a frame's named sounds are placed; the music fades with the style's own ending, so picture and music end together.
- **Sound effects in the chat:** sounds Claude changes on a frame are placed again by themselves, without "Place them again".
- **Sound effects not found:** the chat names each sound that could not be found; while the sound search does not answer, a close
  built-in sound stands in. The Final Mix's count follows what is placed.
- **Tech checks:** a check that could not run shows as "Not checked" with the reason, not as a warning; the pose check gets more time
  on a longer film.
- **Pipeline:** while Claude works on your answer to its question, the step says Claude is working, not that it is still asking.
- **Build time:** "Approve and build" and the "about N min left" countdown estimate from the real times of recent films: a 110 s Lemo
  film says about 46-69 min (it took 36), not 120-168.
- **Library:** old posters are tidied away, and the Vietnamese-letters check on the Lemo-Opuscar fonts now runs.
- **Less code:** code left from removed features is gone: the HyperFrames Studio host, the old sound-effect routes and a route that
  hid a library item.
- **Confirm dialogs:** the time and price line of an approval or feedback confirm is normal text, no longer red like a warning.
- **Film styles:** a style its author took from someone else names them too: Memphis Diorama reads "by EianLu · Lemomo" in the gallery,
  New project and the film's card.
- **Storyboard:** a voice-over well short of the film's length is asked about before anything is drawn (a shorter film, a longer script,
  or wordless stretches you plan), as a longer one already was; Claude no longer fills the gap by itself.
- **Characters:** when you choose to have Claude make new characters in Prepare, the Character step now really runs: Claude makes
  them and you approve them before the Storyboard (the step was skipped and the Storyboard drew them from words alone).
- **Your voice-over script:** Claude reads the whole brief (a long one was cut off part-way) and uses a script you wrote word for word;
  shortening it or moving lines to the screen is asked first, and the Voice screen says when lines are missing, with "Use your script".
- **Voice-over that could not be made:** the Voice box and the chat say why in plain words and the step says to try again (it went
  quietly back to "make the voice-over"); a dropped connection is tried once more by itself.
- **Motion Plan dialog:** it reads the plan again when the Motion Plan step changes, says it is loading instead of "0 planned
  motions", and says when the plan could not be loaded, with Retry (it showed an empty plan with no Approve).
- **Vietnamese marks:** a new Tech check names words on screen that are Vietnamese written without their marks ("NHAT KY" for
  "NHẬT KÝ"); the Build and the Review are told an ASCII or all-caps look is no reason to drop them, and a strip behind the text
  leaves them room.
- **Sound effects when the sound search is down:** keys, printers, teletypes, switches and bells get a close built-in sound, each
  search gives up after 7 s and the rest are not asked once it is down, an automatic sound (typing) fills where a named one found
  nothing, and a film style whose own sounds have no whoosh gets none from the app. The chat says what stands in and what is missing.
- **Files while Claude waits for your answer:** the app no longer writes to Claude in your name ("I added 1 file(s)… Use them and go
  on"), and files the app makes itself (the voice-over, music, sound effects, Claude's own) are never taken for files you added.
- **Voice-over voice:** the voice you chose stays chosen when you switch the source card and come back (it went back to the first
  voice in the list).
- **The ending:** a style author's own ending counts only when the Motion Plan names it and plays it in the last shot; otherwise the
  picture fades out with the music after the length you set. Tech checks now flag a film that stays lit to its last frame and cuts, in
  every style, with the time.
- **Shots:** the film's captions and a closing card laid over the last shots are no longer listed as shots in the Shots column and
  on the SHOTS lane (a film of 23 shots showed 25, the captions second).
- **Voice-over voices:** when the voice list cannot be read (a busy computer), it is tried again by itself after a few seconds, and
  Retry or a click on the chosen service's card reads it again (the dialog had to be closed and opened).
- **Voice-over dialog:** it keeps one height, so its close button stays in place when the transcript arrives (it jumped up and a
  click on the old place missed it).
- **Chat:** your own messages show as you typed them, with their line breaks; they are no longer read as markdown (an answer "1. …",
  a paragraph, then "2. …" showed as "1. … 1. …"). Claude's replies keep their formatting.
- **Film styles:** the "Vertical and social clips" and "Characters, mascots and story shorts" cards say "Social" and "Story" like the
  other HyperFrames cards, and a vertical demo shows whole on its card, in the details and in New project instead of a landscape strip.
- **Shots of a vertical or square film:** the Shots column's pictures take the film's shape; before the Build they are the approved
  storyboard's stills, never a white box.
- **New project, Length:** still typed as in After Effects ("1500" is 15 s; ":", "." or ";" between the parts); a length with
  anything else in it ("0:00:15:00a12000"), or an empty field, says so under the field and goes back to the last length when you
  leave it (it was kept as typed).
- **Claude's long thinking:** each step's reply has a limit that fits its work (the Build 96,000 tokens, not 128,000) and the steps
  are told to write as they go; a reply cut at its limit after minutes of thinking is said in the chat with its time and cost, and a
  step that stopped on one before its work was done is taken up again once by itself, in smaller pieces (Test 23's Build lost 21
  silent minutes).
- **Tech checks:** one kind of warning found in many shots is one line with its shots and a count; a warning the Review kept on
  purpose (a painting wider than the frame for the camera's pan) shows as "Meant this way" instead of a red warning, and a turning
  point measured far outside the frame is said plainly to be a slip of the measurement (Test 23 showed 26 red warnings for a film
  its Review scored 8/10).
- **Music step:** Claude writes its music choice into the film's notes again: the step reads the house rules and its film style's
  own file (not HyperFrames' whole build guide), and the app's check before the first edit tells it to make the same edit again once
  they are read (it took the check for a lock and left the notes without the music).
- **Estimates:** the Storyboard says about 22-33 min (it said about 10 and took 40) and the Motion Plan's price is fitted to recent
  films; while the Review runs, the countdown holds a likely second round and moves by a round at most, so it no longer jumps from
  5 to 39 min left.
- **New project, Brand Kit:** a Brand Kit you chose stays chosen when you pick a film style with its author's design; the box says
  "This style keeps its author's design. Claude will ask how to use your Brand Kit." (with Remove), and Prepare asks how to use it
  (the kit was dropped without a word).
- **Import assets, archives:** a .zip, .rar or .7z is unpacked and its files go in like any others (sorted by kind, the same names);
  one that cannot be opened stays as it came and the result says so ("Could not open X.rar; unpack it and add the files"). Programs
  inside are left out and named; an archive over 2,000 files or 4 GB unpacked, or with files pointing outside it, is not opened.
- **Editor title:** the film's name keeps the stacked marks of its capitals ("CHẤM" showed as "CHÂM") in both themes; so do the New
  project title in The Studio and the project cards.
- **Voice-over voices:** the ElevenLabs and Fish Audio voice lists wait up to 45 s for a slow service and are kept for 10 minutes, so
  opening the dialog again is instant; a list that cannot be read says which service and why, with Retry.
- **The app no longer freezes while it works:** drawing a film's character sheets, timing a voice-over's words, measuring the music's
  beats, the storyboard PDF, the library's previews and the setup downloads run beside the app instead of holding it, so every screen
  keeps answering (Test 27: each request took 20-60 s while the Character step drew its sheets).
- **Render on a busy computer:** the quick check before a render gets more time (10 min, more for a longer film) and tries once more
  by itself when it is stopped; if it still cannot finish, Render says "The quick check did not finish in time (the computer is
  busy). Try again." and waits for you with a Retry, also in the chat, instead of "The render is blocked · Composition files:
  hyperframes check gave no JSON" (Test 22 sat blocked for 70 min).
- **Pictures on a busy computer:** the storyboard's and the Review's pictures get time for the number of frames and try once more
  by themselves when they are stopped; if they still cannot finish, the Storyboard dialog and the chat say "The pictures could not be
  taken (the computer is busy). Try again." with a Retry, and no empty round is shown or scored (Tests 25 and 26 waited 11.5 min for none).
- **Time left:** the "about N min left" of the Build, the Review, the Storyboard and the Motion Plan counts down to the estimate the
  confirm gave and never grows; past it, the line says "taking longer than usual · N min so far" in both themes (Test 26's went from
  8 to 32 min left, and past the 77 min the confirm said).
- **Editor after the Build:** the film, its shots and the timeline load by themselves as soon as the Build is done, also when the chat
  misses it on a busy computer; the film no longer waits minutes for the app's preparation when the Editor opens, and the chat keeps
  reading after a read that failed (Test 26 showed "Not built yet" during the Review, and a reload hung).
- **Tech checks:** a check of the app's own (such as "A sound on every action") says in its row what the Render panel says: the
  second, the motion and the sound it lacks, instead of "Something here may look wrong" (Test 26).
- **Film style previews:** a square sample (Hand embroidery's hoop) is shown whole on its card, in its details and in New project, in
  both themes, as a vertical one is (it was cut to 16:9).
- **New project, Size:** picking a film style drawn at its own size sets Size to it (Hand embroidery: 1080 × 1080, 1:1), unless you
  set Size yourself; picking a style without one puts back its first size (it stayed 1920 × 1080).
- **Sound effects that fit what they name:** a cue sounds like its thing, not like something that shares its verb: a thread's pull
  rustles cloth (it was a plug pulled out of a socket, 12 times), a needle going into the linen is a soft cloth sound (it was 4 s of
  a birds loop), a small wooden box closes like a box lid, not a door, and a wooden spool rolls in light wood taps, not footsteps. A
  cue never gets an ambience loop or a long recording, and one the library has nothing close for gets a soft plain sound of its kind,
  or none, rather than a wrong one (Test 26).
- **Sound effects when the sound search does not answer:** every cue asks the app's own library first, and a cue of a known kind takes
  the library's sound of that kind instead of waiting on the search (Test 26 left out "thread tug", "thread knot", "wing flutter",
  "spool rattle" and "thread unspool", twice). When the search fails, the library's closest sound stands in and the chat says so;
  "Place them again" looks up again every cue left out or on a stand-in, and replaces an older pick the library would no longer give.
- **Sound effects, repeats:** one sound file plays at most three times in a film. Repeats vary over the files of their kind, and the ones
  past three are left out (the storyboard's named sounds kept first), so the moment can take the action's own sound instead (Test 26:
  one bee buzz and one plug sound played twelve times each). Sounds in the ending's fade now fade with the picture and the music.
- **Final Mix, sound effects:** the dialog says what the last placement left out and which sounds are on a close sound for now, and
  "Placing the sound effects…" while it runs; after "Place them again" it stays where you were, with "Where they are" still open (it
  jumped back to the top with the list closed, and said nothing when nothing changed).
- **The Studio, pipeline stations:** a click anywhere on a station opens what its title opens: "05 Final Mix" opened only from its
  underlined line (Tests 24 and 26).
- **Tech checks, "A sound on every action":** each warning names the motion that has no sound and the sound the app would give it
  ("Shot 4 at 11.45 s: "Chỉ giật lại" (a motion) has no sound…"), as Render does, instead of "Something here may look wrong" (Tests
  25 and 26).
- **Sound effects, less busy:** "Every action" stays the default, but a small move's sound is never within 0.3 s of another sound, and
  the bigger actions are placed first; two sounds of one kind at one moment are one (Test 25: 59 effects in 68 s felt busy, and two pops
  moved into the same pause after a word played on top of each other).
- **Sound effects for a body:** a stomach growl or rumble takes the library's gurgle instead of being left out while the search is down,
  and a chain slip and a pencil scribble take a chain jingle and a paper rustle (Test 25).
- **Sound effects that mean the same thing:** a word with another meaning no longer decides a sound: a rubber boot hops and squeaks as
  a step, not a computer starting up (ten times in Test 27); a fish turns with a small splash, not a page turn; a name whose only known
  word is its kind ("water swirl", "whoosh up", "door bell") gets that kind's plain sound instead of a boiling kettle, a drink or a
  sword; a plain click is never a camera's shutter, and the insects of a place are left to its ambience bed (Test 27).
- **Final Mix, new music:** "Ask Claude for 3 new tracks" starts Claude's search again; when it cannot start (the web is off for the
  project, Claude is busy or not signed in) the dialog says why instead of "Claude is looking on Mixkit" (Test 25: nothing started).
- **Smooth preview after the Final Mix:** a change made while the preview was being made is taken up once it ends, and a sound taken
  out is mixed onto the rendered picture in seconds instead of a full render; a preview out of date with nothing making it says "Out
  of date · Update", with the button (Test 25 said "Updating…" for good).
- **Chat while Claude works:** the chat stops showing Claude at work once the task has ended, also after a read a busy computer did
  not answer: that read is given up and asked again a little later (Test 25 kept "Drawing the storyboard pictures…" and Stop for 7 min).
- **Claude's language:** every step's notes and report are in the language you write in, the Build's too: the request and the app's
  tool answers remind Claude, and the app's own English requests to Claude no longer count as yours (Test 27's Build reported in English).
- **Editor, sounds from Assets:** a sound goes on the timeline at the playhead (it was 0:00), or where you drop it on a lane.
- **Music to the film's end:** a song shorter than the film plays again after itself, crossfaded on its beats, so the music and the
  picture fade out together (Test 22's 107 s song stopped 3.5 s before its 110 s film's end). When the song is far shorter, the Final
  Mix and the chat say "The song is shorter than the film; it repeats from 0:42", so you can pick a longer one.
- **A voice-over in one clip a line:** a voice the Build cut into one clip per line counts as the film's voice everywhere: sound effects
  still move off its spoken words, the ambience still dips under them, the levels and the voice check hear it, "Duck the music under
  the voice" makes room for every line, and taking one line off the timeline leaves the others (Test 22's check did not run).
- **The app keeps answering while it records a film's history:** the film's revisions (the save before each step, check and render,
  each hand edit and Final Mix change, Claude's tasks and their undo, the pipeline's own reads) run beside the app instead of holding
  it, one at a time per film, so its changes keep their order and two never collide (Test 22: on a busy computer every screen waited
  behind them).
- **Chat after the Final Mix:** messages to Claude work again (each one failed at once with "spawn ENAMETOOLONG"): Claude's rules for
  the film go to Claude Code in a file instead of on its command line, which Windows limits to 32,767 characters, and the character
  creator's description no longer goes there either; a request still too large to start says so in plain words (Test 27).
- **New version notice:** the app checks for a new version by itself (a minute after it starts, then every six hours, never during an
  update or a render) and shows "A new version is ready · Update" in the top bar, with a dot on Settings; Update opens Settings ›
  Update with what changed already listed, "Later" hides it until the next version, and the first start after an update says once
  "Updated to the version of …".

## 0.8.214 (2026-10-29)

The first version shared with invited users: a complete film pipeline on HyperFrames 0.8.214 ([`4719543`](https://github.com/heygen-com/hyperframes/tree/4719543e972548a261b8354f0a8dada479ae5d93)), 126 film styles
from seven authors, two themes and an After Effects port.

### Making films
- **One pipeline for every style:** Brief → Prepare → voice-over (optional) → Storyboard → Motion Plan → Build → Review → Final Mix →
  Tech checks → Render. Each step leaves a file in the project and waits for its prerequisites.
- **Stop and ask:** when the brief, the style and the assets disagree, or something is missing, Claude stops with options and a
  recommendation instead of guessing.
- **Storyboards as boards:** one option drawn shot by shot, with the reason for each shot; comments per panel (`@Panel_N: …`). In
  HyperFrames styles and the General Style, each still is taken at its frame's own moment, as HyperFrames' storyboard format specifies,
  and a retake replaces the right frame; other authors' boards keep their own rule of one frame a second.
- **Motion Plan in numbers:** timings, distances, easings and sound cues for every shot, approved before the build. The approval dialog
  estimates build time and Claude usage from measured runs.
- **Prepare follows the style's author:** HyperFrames styles follow HyperFrames 0.8.214's story steps (storylines, then `BRIEF.md`);
  other authors' styles use their own short brief.
- **Review in rounds:** Claude scores its own film out of 10 and fixes what it finds.
- **Films stay alive:** an app-wide rule and check that no frame holds still for more than two seconds.
- **Films end with a picture and music fade:** no film stops dead. The last shot keeps moving while the picture and the music fade
  out together (3-5 s on a film of 30 s or more, shorter on short films and after an end card). The fade is added after the length
  you set (a 60 s film is a 65 s file), and kept inside it only when the brief asks for exactly or at most that length; a style whose
  author gives its own ending keeps it, with the music faded. Tech checks flag a film that still ends on a hard cut.
- **Live progress:** the pipeline shows the running step and the time left; questions from Claude appear in the chat as soon as they are
  asked.

### Film styles
- General Style (Moworks), 8 HyperFrames styles (HeyGen: Slideshow and the seven film types of its skill), 66 Lemo-Opuscar styles
  (Lemomo; Memphis Diorama by EianLu), 14 mg-styles-15 styles (Vincentwei1021),
  35 Anidoodle media (Alex Greenshpun), Brush cartoon (John Heibel) and What If (FreshStack).
- Third-party style sources ship inside the repository, pinned at one commit and checked on every start; a changed file locks its style.
- Each style keeps its author's own frame rate and sizes; the gallery shows the author, licence, source commit and a demo film.
- Claude runs HyperFrames' own tools as shipped, from a fixed list: two scripts (`carve`, which dips only the frequency bands the voice
  uses in the music bed, and `locate`, which finds a point in an image; its automatic mode goes online and follows the project's web setting) and
  the CLI commands the pipeline needs (`capture`, `beats`, `lint`, `validate`, `inspect` and others). The app makes the voice-over,
  music and sound mix itself.

### Voice, music and sound
- Voice-overs with ElevenLabs or Fish Audio; voice samples play before you generate.
- Word timings with Whisper large-v3 turbo, on the CPU or an NVIDIA graphics card (optional download).
- Lyrics alignment for music films.
- Final Mix: three free Mixkit tracks to choose from, sound effects from Freesound (through Openverse) or HyperFrames' bundled set,
  mixed to −16 LUFS, with every track and sound credited in the film's `CREDITS.md`.

### Editor and output
- The Editor plays the film in HyperFrames' own player, with the shots and pipeline on the left, the timeline below and Claude in a chat
  column. Click an element in the film to make it Claude's target, or edit its words by hand.
- Render: Standard (web and social, bitrate-capped) and High; a separate Smooth copy with frequent keyframes for playback in the Editor.
- **Port to After Effects** with real text and shape layers; every style carries a badge (AE editable, AE partly editable, AE video only)
  measured on a demo film.

### Library and assets
- Motion Library: motions from Magic UI, Codrops and Motion Reference, 448 HyperFrames Blocks and 168 Motion Prompt terms. Each library
  store is kept per pinned source version, so an update never mixes old and new items; previews are reused only when an item's source
  link and code are unchanged.
- Brand Kits: a brand's colours, fonts and components, worn by a whole film. HyperFrames' 13 frame presets ship ready to use; your own
  are made from a brand guideline (PDF, PowerPoint or pictures).
- Characters: the Character maker, Anidoodle character rigs, and the brush character layer.
- Assets: PSD / PSB, PowerPoint, PDF, pictures, music, video, fonts and logos are copied into the project and read; your originals stay
  as they are.
- 26 bundled font families with Vietnamese letters, and a list of 543 Google Fonts families with Vietnamese, downloaded on demand.

### New project
- One wide dialog in two columns that end on one line. Left, the film's set-up: Title, Film style, Brand Kit, Characters, Format,
  System settings. Right: the Brief, which takes all the spare height, above Assets, which starts level with Format.
- The Assets box keeps its height: empty, its dashed drop zone fills the box and takes a file or a folder anywhere in it; with files, a
  compact drop row stays on top and the list scrolls inside. Both themes; The Studio draws it as a blue-pencil frame that lights up
  like the light table when a file is dragged over.
- A sample brief per style, a draft that is kept while you work, and a Create button that says what is still missing.

### App
- Two themes, **The Desk** and **The Studio**, chosen at the first start. In The Studio, handwriting in the Brief and on the Projects
  pitch card sits on the ruled paper's lines.
- First-run screen listing every component with its size, source and licence; most of it ships in the repository.
- Claude Code sign-in from the top bar; service keys encrypted with Windows DPAPI.
- No console windows: every helper process the app starts runs hidden, and a test checks every call that starts one.
- Settings › Update fast-forwards the app folder and rolls back if a step fails.
- Interface in English; films in any language, Vietnamese included.
- Automated test suite of about 670 tests.

### Retired with HyperFrames' skills
HyperFrames 0.8.185 replaced its fourteen workflow and domain skills with seven knowledge skills. Features that only those skills
provided are gone from the app:
- the six styles built on the old workflows (Explainer, Motion Graphics, Music / Lyrics, Product Launch, Talking-Head, Pull Request),
  replaced by the film types of HyperFrames' skill; a project made with one of them opens with no style;
- Art Direction and Colours (HyperFrames' former visual styles and palettes) and the route questions of New project;
- the music map's own beat analysis: the Music map sheet stays and now shows what HyperFrames' `beats` command measures on the track,
  with the lyric lines the app timed.

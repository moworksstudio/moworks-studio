# Changelog

One entry per version, newest first. The version is the HyperFrames version the app runs (0.8.214 runs HyperFrames 0.8.214); fixes to the
app alone on the same engine are 0.8.214.1, 0.8.214.2…

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

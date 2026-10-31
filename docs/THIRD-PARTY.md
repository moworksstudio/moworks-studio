# Third-party sources and licences

Every component that Moworks Studio bundles, downloads or adapts from outside, with its author, the exact source, its licence and how the
app uses it. "As shipped" means the files are used unchanged, pinned at one commit or version; "adapted" means the app changed them;
"written from the idea" means the app has its own code, informed by the source, with no code copied.

Pins live in `config/pins.json` (repositories, versions, SHA-256 of every downloaded file), `config/fonts.json` (bundled fonts) and
`bundle/MANIFEST.json` (what ships inside this repository). Each library item, film style and character also carries its own credit
(author, link at the commit, licence, date read, how it was made), shown in the app next to the item. Third-party files keep their own
`LICENSE` and `NOTICE` files beside them.

## Engine

| Component | Author | Source (pinned) | Licence | Use in the app |
|---|---|---|---|---|
| HyperFrames (CLI, producer, player, SDK, Studio) | HeyGen | npm `hyperframes` and `@hyperframes/*` **0.8.214**, [heygen-com/hyperframes @ `4719543`](https://github.com/heygen-com/hyperframes/tree/4719543e972548a261b8354f0a8dada479ae5d93) (tag `v0.8.214`) | Apache-2.0 | As shipped. Installed per version under `runtime/hf/` (not an npm dependency of the app); telemetry, update checks and automatic installs turned off. Composition format, lint and checks, renderer. The Editor plays films in HyperFrames' player and picks elements with its runtime picker; hand edits go through the functions HyperFrames Studio itself uses (`@hyperframes/studio-server`) |
| HyperFrames skills | HeyGen | [`skills/` @ `4719543`](https://github.com/heygen-com/hyperframes/tree/4719543e972548a261b8354f0a8dada479ae5d93/skills) | Apache-2.0 | As shipped in `bundle/hf/skills`: the seven skills HyperFrames publishes (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `slideshow`, `figma`, `remotion-to-hyperframes`), checked against its own `skills-manifest.json` (a changed skill locks the styles that use it). The eight HyperFrames styles (Slideshow and one per film type of `hyperframes/references/types`) and the references every style's steps read |
| HyperFrames registry (blocks and components) | HeyGen and contributors (Jake Moran, Miao Yang, Stronkter, Remocn, Tugra Avci, Joe Sai) | [`registry/` @ `4719543`](https://github.com/heygen-com/hyperframes/tree/4719543e972548a261b8354f0a8dada479ae5d93/registry) | Apache-2.0; Remocn items MIT (notice kept in each file) | As shipped in `bundle/hf/registry`: 448 Blocks in the Motion Library. The app maps CDN links of three.js blocks to its pinned local copies so they render offline |
| HyperFrames frame presets | HeyGen | [`skills/hyperframes/assets/frame-presets` @ `4719543`](https://github.com/heygen-com/hyperframes/tree/4719543e972548a261b8354f0a8dada479ae5d93/skills/hyperframes/assets/frame-presets) | Apache-2.0 | As shipped: the 13 frame presets offered on the Brand Kits page, beside the user's own (HyperFrames 0.8.185 retired the visual styles and palettes it shipped before) |
| Chromium headless shell | The Chromium Authors | 152.0.7977.30, downloaded by HyperFrames | BSD-3-Clause and others (Chromium's own notices) | Frame capture for previews, checks and renders |
| FFmpeg | FFmpeg developers; Windows build by Gyan Doshi | 9.0 full build, installed by the user with `winget install Gyan.FFmpeg` | GPL-3.0 (this build) | Encoding, audio mixing, media probing. Not bundled: the app calls the installed executable |
| Claude Code | Anthropic | installed by the user | Anthropic's terms | Runs every Claude task; signed in with the user's own account. Not bundled |

## Film styles

| Style set | Author | Source (pinned) | Licence | Use in the app |
|---|---|---|---|---|
| Lemo-Opuscar: 66 film styles + OPUSCAR 98 sample prompts | Lemomo (LemoLab, lemomo-ai); Memphis Diorama contributed by EianLu (https://x.com/EianLu) | [lemomo-ai/lemo-opuscar @ `ea34ff9`](https://github.com/lemomo-ai/lemo-opuscar/tree/ea34ff9546f675f9fd65a3c84e869a1da7471ad7) | MIT (prompts, code, docs); demo films and stills CC BY 4.0 (LemoLab); third-party items per the repo's `demo/CREDITS`; Poly Haven assets CC0 | As shipped in `bundle/styles/lemo-opuscar` (styles, core, styleboard, rule files). Posters, stills and OPUSCAR frames re-encoded to 960 px WebP for the gallery; no git history, no demo films (the gallery links the author's release). Films are built inside HyperFrames through the app's bridge (`packages/hf-edit/lemoPage.mjs`). Three voices the repo itself marks unsuitable are not offered. Lemo sound assets are not used |
| mg-styles-15: 15 motion-design styles | Vincentwei1021 | [Vincentwei1021/mg-styles-15 @ `49052d8`](https://github.com/Vincentwei1021/mg-styles-15/tree/49052d80bfaf9fa8412cc9710530e5e95a3b8d8c) | MIT; a few images CC0 / public domain | As shipped in `bundle/styles/mg-styles-15`: prompts, code libraries (no audio), demos, textures; gallery tiles re-encoded to 960 px WebP. Not bundled: videos, audio, VCSL samples (CC0), the HDRI and PLY mesh of style 04. Style 04 (3D render, needs Blender) is not offered |
| Anidoodle: 32 hand-drawn media + 3 house styles, character rigs | Alex Greenshpun (10x Company) | [alexgreensh/anidoodle @ `f746cbd`](https://github.com/alexgreensh/anidoodle/tree/f746cbd8a7032463bd0bc88ee8ff852599193b8c) (v0.9.6) | Apache-2.0 with `NOTICE` | As shipped in `bundle/styles/anidoodle`: engine source, references, `SKILL.md`, `LICENSE`, `NOTICE`. The author's code is unchanged; films are written in TypeScript the author's way and bundled with esbuild. Gallery cards are cut from the author's style sheet; previews are the author's own drawing films rendered by HyperFrames. The banned-move list of the author's `engine/tools/gate.mjs` is used verbatim by the app's contract check. Mira, Theo, Bit and the cheetah rig are available as shipped on the Characters page. The bridge returns a blank pixel to one per-frame canvas read the engine uses for timing, which keeps Chrome on the GPU (render time of a 30 s film: 245 s → 80 s). Not used: renderer, tools, Remotion, music and sound packs |
| Brush cartoon (ClaudeAnimationBase) | John Heibel | [JohnHeibel/ClaudeAnimationBase @ `0ac8bf2`](https://github.com/JohnHeibel/ClaudeAnimationBase/tree/0ac8bf2b31942376cb6b8c4074715595d512acd2) | MIT | `src/core.js`, `src/timeline.js` and the shared parts of `src/clawd.js` (eyes, mouth, hat, emotion marks, 31 emotions, jump, turn) used verbatim by the app's character layer (`packages/character-kit`), which draws every character from its definition. **Clawd**, Anthropic's mascot, appears only as a labelled demo on the Characters page and cannot be used in a film |
| What If animation | FreshStack (kelano86) | [kelano86/what-if-animation @ `3725a22`](https://github.com/kelano86/what-if-animation/tree/3725a22d2d101320cae5b7d761af8d75120c4987) | MIT, © 2026 FreshStack | The author's skill (`SKILL.md` and references) as shipped, plus its React + SVG engine bundled for HyperFrames (adapted). The 7-beat episode formula and script rules also inform the app-wide "What If episode" film kind (`config/rules/what-if`). No channel names, episodes or ElevenLabs audio from the source |
| React (What If engine) | Meta Platforms and contributors | React 19, bundled inside the What If engine | MIT | Runs the What If engine inside a film |
| General Style rules | Moworks | [moworksstudio/moworks-motion @ `30b7dcb`](https://github.com/moworksstudio/moworks-motion/tree/30b7dcb65808b2a5299ad6a3357280a12773395f) (v2.0.4) | MIT, © 2026 Moworks | Written for the app from the kit's skill and workflow files (`config/rules/general-style`, `moworks-studio`, `moworks-alive`, `moworks-qc`); `config/styles.json` records the kit files each pack derives from |

## Motion Library

| Source | Author | Source (pinned) | Licence | Use in the app |
|---|---|---|---|---|
| Motion Prompt: 168 motion terms (7 sets × 24) | Shohei Ohtaki (@showheyohtaki) | [showheyohtaki/motion-prompt @ `bd6bf08`](https://github.com/showheyohtaki/motion-prompt/tree/bd6bf08d8d412cc82c1bbc8f1a81638617a45cfb) | MIT, © 2026 Shohei Ohtaki | As shipped: the Vocabulary set of the Motion Library (names in English and Japanese, the author's Traditional Chinese, meanings, sample sentences, measurements, Canvas 2D functions). A vocabulary for directing Claude, not runnable motion; the motion-term table in `config/rules/motion-vocab` is generated from it. Not used: the author's skill and CLI, gallery, `make-your-own/`, `examples/found.json` |
| Magic UI: 79 items (62 motions, 17 blocks) | Magic UI (magicuidesign) | [magicuidesign/magicui @ `efe76fc`](https://github.com/magicuidesign/magicui/tree/efe76fc5755eca1142dd4f74c1d6f0ace2887e3c) | MIT | Adapted to HyperFrames compositions (`packages/intake-library`); full licence text in `packages/intake-library/LICENSES` and the library store |
| Codrops On-Scroll Typography Animations: 29 items | Codrops | [codrops/OnScrollTypographyAnimations @ `af28d61`](https://github.com/codrops/OnScrollTypographyAnimations/tree/af28d61d1f8d3d117f5d1e9b09d5209e20a1a212) | MIT | Adapted from scroll-driven to time-driven |
| Codrops Image Expansion Typography: 5 items | Codrops | [codrops/ImageExpansionTypography @ `0d61479`](https://github.com/codrops/ImageExpansionTypography/tree/0d614791f94198bcab655762b26a3cb85da851f4) | MIT | Adapted from scroll-driven to time-driven |
| cobe | Shu Ding | 0.6.4 | MIT | As shipped inside the Globe item |
| phenomenon | Colin van Eenige | 1.6.0 | MIT | As shipped inside cobe |
| canvas-confetti | Kiril Vatev | 1.9.3 | ISC | Confetti item; motion maths rewritten |
| world-atlas (Natural Earth 1:110m) | Mike Bostock; data Natural Earth | 2.0.2 | ISC; data public domain | 1,195 land dots of the Dotted Map item |

## Libraries copied into films

Downloaded once from jsDelivr's npm copies at pinned versions, every file checked by SHA-256 (`config/pins.json`), and copied into a
film that uses them so it plays and renders offline. Each keeps its `LICENSE` file.

| Library | Author | Version | Licence | Use |
|---|---|---|---|---|
| GSAP + MotionPathPlugin | GreenSock (Webflow) | 3.15.0 | GSAP Standard License (see below) | Animation runtime of every film |
| three.js | mrdoob and three.js authors | 0.184.0 ([r184 @ `e78e817`](https://github.com/mrdoob/three.js/tree/e78e81725013343d38ceb7b13070c9ff5b8dafbb)); 0.147.0, 0.170.0, 0.181.2 for registry blocks pinned to them; 0.186.1 for mg-styles-15 | MIT | 3D films and blocks; core plus selected addons |
| clipper-lib | Angus Johnson; JavaScript translation by Timo | 6.4.2 ([junmer/clipper-lib](https://github.com/junmer/clipper-lib)) | Boost Software License 1.0 | One HyperFrames block (`wireframe-portal-title`) |
| opentype.js | opentype.js contributors | 2.0.0 | MIT | mg-styles-15 films |
| simplex-noise | Jonas Wagner | 4.0.3 | MIT | mg-styles-15 films |
| d3 | Mike Bostock | 7.9.0 | ISC | mg-styles-15 films |
| topojson-client | Mike Bostock | 3.1.0 | ISC | mg-styles-15 films |
| p5.js | p5.js contributors (Processing Foundation) | 2.3.3 | LGPL-2.1 | Brush cartoon character layer |
| p5.brush | Alejandro Campos | 2.2.3 | MIT | Brush cartoon character layer |

## Fonts

| Fonts | Source (pinned) | Licence | Use |
|---|---|---|---|
| 26 families with Vietnamese letters (Anton, Archivo, Baloo 2, Barlow, Be Vietnam Pro, Inter, Lexend, Oswald, Patrick Hand, Playfair Display, Quicksand…; full list in `config/fonts.json`) | [google/fonts @ `47d54ca`](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33) | SIL OFL 1.1; `OFL.txt` beside each family | Bundled for films, because HyperFrames' embedded fonts are Latin-only. Every file passes a Vietnamese letter check |
| Google Fonts with Vietnamese: a list of 543 families | [google/fonts @ `e7db6ca`](https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0) | SIL OFL 1.1 (542), Apache-2.0 (Roboto Slab) | `config/google-fonts-vi.json`: downloaded on demand when a film or Brand Kit uses one; licence and credit travel with the film |
| Interface fonts: Be Vietnam Pro, M PLUS 1 Code, Saira Condensed, Agdasima | [google/fonts @ `c133902`](https://github.com/google/fonts/tree/c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1) | SIL OFL 1.1 | The Desk; details in `ui/src/fonts/README.md` |
| The Studio fonts: Fraunces, Bricolage Grotesque, DM Mono, Patrick Hand | [google/fonts @ `e7db6ca`](https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0) | SIL OFL 1.1 | The Studio theme only; details in `ui/src/fonts/studio/README.md` |

## Audio

| Source | Licence | Use |
|---|---|---|
| [Mixkit](https://mixkit.co/free-stock-music/) free stock music | [Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree): royalty-free, attribution not required; online use only (web, social media, YouTube, podcasts, online ads); **not** for TV / radio broadcast, CD / DVD or games | Final Mix offers three tracks; downloaded only from `*.mixkit.co` into the project; credit and limits written to the film's `CREDITS.md` |
| Freesound sounds through [Openverse](https://api.openverse.org/v1/audio/) | CC0 and CC BY only | Sound effects; each sound credited (title, author, page, licence, attribution line) in `.moworks/sfx.json` and `CREDITS.md` |
| Sounds from [SFXMint](https://sfxmint.com/license) ([API](https://sfxmint.com/api/openapi.json), read 31/10/2026), only when Openverse is down or finds nothing useful | CC0 1.0, as the site alone states it (its sounds are AI-generated, with no recording or author behind them to check it against) | Sound effects; only items stated as CC0 are taken; downloaded into the film that uses them, never shipped with the app; each sound credited (title, page, licence, date read) in `.moworks/sfx.json` and `CREDITS.md` |
| Sound effects bundled with HyperFrames' `media-use` skill | Pixabay Content License | Offline sound effects, credited to Pixabay |
| Sound effects bundled with the app (`bundle/sfx`): Kenney, OpenGameArt.org CC0 sets, Wikimedia Commons | CC0 1.0 and public domain | Offline sound effects for every cue (`packages/sfx/library.mjs`); every source in "Sound effects (bundled)" below |
| ElevenLabs | its own terms | Voice-overs, with the user's own API key |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987) (hexgrad): `kokoro-v1.0.onnx` and `voices-v1.0.bin` from [kokoro-onnx's release model-files-v1.0](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0) (tag at `6843c53`) | Apache-2.0 | The optional free voice: read through HyperFrames' own `hyperframes tts`. Never shipped with the app: downloaded only when the user chooses it, checked by size and SHA-256 (`packages/voice/kokoro.mjs`), into the models folder |
| Its Python parts, at fixed versions with their hashes: [kokoro-onnx 0.6.1](https://pypi.org/project/kokoro-onnx/0.6.1/) (thewh1teagle), [onnxruntime 1.31.1](https://pypi.org/project/onnxruntime/1.31.1/), [numpy 2.5.4](https://pypi.org/project/numpy/2.5.4/), [soundfile 0.14.0](https://pypi.org/project/soundfile/0.14.0/) and their small dependencies | MIT; MIT; BSD-3-Clause and others; BSD-3-Clause (each package's own) | Downloaded with the free voice, into its own folder |
| [phonemizer 3.4.0](https://pypi.org/project/phonemizer/3.4.0/) and eSpeak NG (through [espeakng-loader 0.2.4](https://pypi.org/project/espeakng-loader/0.2.4/)) | GPL-3.0 | Downloaded with the free voice, run in their own process to turn words into sounds. Not part of the app's code or its repository; removed with the voice |

No music library is bundled.

## Sound effects (bundled)

The offline sound-effect library in `bundle/sfx`: 250 sounds (231 one-shots and 19 ambience loops in 21 families), 7.1 MB, read by
`packages/sfx/library.mjs`. **Adapted:** each sound was cut from its pack, silence trimmed, loudness-normalised (one-shots -16 LUFS mono, loops
-28 LUFS stereo, true peak at most -1 dBTP) and re-encoded as Ogg Vorbis by `tools/make-sfx-library.mjs`. Only CC0 1.0 and public-domain sources:
Kenney (7 packs, 92 sounds), OpenGameArt.org CC0 sets (52 pages, 136 sounds) and Wikimedia Commons (19 files, 22 sounds; public-domain
recordings first published on pdsounds.org, and CC0 uploads). No credit is required; every sound carries one anyway (author, page, licence,
original file, how it was made) in `bundle/sfx/catalog.json` and `bundle/sfx/CREDITS.md`. Each download is pinned by size and SHA-256 in
`tools/sfx-library-packs.json` (read 30/10/2026). Not used: Pixabay (its own licence), Sonniss / GDC bundles (no redistribution), any CC BY-NC
or ND sound; Freesound originals need a login (its CC0 / CC BY sounds stay the online search, through Openverse).

| Source | Author | Page | Licence | Sounds: families |
|---|---|---|---|---|
| Kenney Casino Audio | Kenney (kenney.nl) | [kenney.nl/assets/casino-audio](https://kenney.nl/assets/casino-audio) | CC0 1.0 | 4: whoosh, paper |
| Kenney Digital Audio | Kenney (kenney.nl) | [kenney.nl/assets/digital-audio](https://kenney.nl/assets/digital-audio) | CC0 1.0 | 10: pop, whoosh, electronic |
| Kenney Impact Sounds | Kenney (kenney.nl) | [kenney.nl/assets/impact-sounds](https://kenney.nl/assets/impact-sounds) | CC0 1.0 | 26: impact, footstep, bell |
| Kenney Interface Sounds | Kenney (kenney.nl) | [kenney.nl/assets/interface-sounds](https://kenney.nl/assets/interface-sounds) | CC0 1.0 | 23: pop, whoosh, switch, bell, click, electronic |
| Kenney RPG Audio | Kenney (kenney.nl) | [kenney.nl/assets/rpg-audio](https://kenney.nl/assets/rpg-audio) | CC0 1.0 | 18: whoosh, footstep, cloth, paper, door, click |
| Kenney Sci-fi Sounds | Kenney (kenney.nl) | [kenney.nl/assets/sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0 1.0 | 9: whoosh, impact, door, mechanical, electronic |
| Kenney UI Audio | Kenney (kenney.nl) | [kenney.nl/assets/ui-audio](https://kenney.nl/assets/ui-audio) | CC0 1.0 | 2: switch, click |
| 10 Book Page Flips | StarNinjas | [opengameart.org/content/10-book-page-flips](https://opengameart.org/content/10-book-page-flips) | CC0 1.0 | 1: paper |
| 100 CC0 metal and wood SFX | rubberduck | [opengameart.org/content/100-cc0-metal-and-wood-sfx](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) | CC0 1.0 | 2: mechanical |
| 100 CC0 SFX | rubberduck | [opengameart.org/content/100-cc0-sfx](https://opengameart.org/content/100-cc0-sfx) | CC0 1.0 | 10: pop, impact, paper, switch, bell |
| 100 CC0 SFX #2 | rubberduck | [opengameart.org/content/100-cc0-sfx-2](https://opengameart.org/content/100-cc0-sfx-2) | CC0 1.0 | 9 (1 loop): whoosh, footstep, water, rain, mechanical, ambience |
| 20 Rustles of dry leaves | qubodup | [opengameart.org/content/20-rustles-dry-leaves](https://opengameart.org/content/20-rustles-dry-leaves) | CC0 1.0 | 2: cloth |
| 202 More Sound Effects | OwlishMedia | [opengameart.org/content/202-more-sound-effects](https://opengameart.org/content/202-more-sound-effects) | CC0 1.0 | 5: cloth, water, click |
| 30 CC0 SFX loops | rubberduck | [opengameart.org/content/30-cc0-sfx-loops](https://opengameart.org/content/30-cc0-sfx-loops) | CC0 1.0 | 2: mechanical |
| 40 CC0 water / splash / slime SFX | rubberduck | [opengameart.org/content/40-cc0-water-splash-slime-sfx](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) | CC0 1.0 | 6: pop, water |
| 42 Snow and Gravel Footsteps | Corsica_S (submitted by qubodup) | [opengameart.org/content/42-snow-and-gravel-footsteps](https://opengameart.org/content/42-snow-and-gravel-footsteps) | CC0 1.0 | 1: footstep |
| 50 CC0 retro / synth SFX | rubberduck | [opengameart.org/content/50-cc0-retro-synth-sfx](https://opengameart.org/content/50-cc0-retro-synth-sfx) | CC0 1.0 | 4: electronic, magic |
| 6 Short water splashes | ezwa (submitted by qubodup) | [opengameart.org/content/6-short-water-splashes](https://opengameart.org/content/6-short-water-splashes) | CC0 1.0 | 1: water |
| 80 CC0 creature SFX | rubberduck | [opengameart.org/content/80-cc0-creature-sfx](https://opengameart.org/content/80-cc0-creature-sfx) | CC0 1.0 | 5: animal |
| 80 CC0 RPG SFX | rubberduck | [opengameart.org/content/80-cc0-rpg-sfx](https://opengameart.org/content/80-cc0-rpg-sfx) | CC0 1.0 | 8: whoosh, impact, fire, magic |
| AMB Morning Sounds (Perfect Loop) | Kresiek The Furry | [opengameart.org/content/amb-morning-sounds-perfect-loop](https://opengameart.org/content/amb-morning-sounds-perfect-loop) | CC0 1.0 | 1 (1 loop): ambience |
| AMB Rain Loop 1 | Kresiek The Furry | [opengameart.org/content/amb-rain-loop-1](https://opengameart.org/content/amb-rain-loop-1) | CC0 1.0 | 1 (1 loop): rain |
| Applause in a large hall or church | eXpl0it3r | [opengameart.org/content/applause-in-a-large-hall-or-church](https://opengameart.org/content/applause-in-a-large-hall-or-church) | CC0 1.0 | 1: crowd |
| Beach Ocean Waves | jasinski (submitted by qubodup) | [opengameart.org/content/beach-ocean-waves](https://opengameart.org/content/beach-ocean-waves) | CC0 1.0 | 2: water |
| Bell dings/chimes | PWL | [opengameart.org/content/bell-dingschimes](https://opengameart.org/content/bell-dingschimes) | CC0 1.0 | 2: bell |
| boiling water loops | TinyWorlds | [opengameart.org/content/boiling-water-loops](https://opengameart.org/content/boiling-water-loops) | CC0 1.0 | 1: water |
| Bubble Sound Effects | BMacZero | [opengameart.org/content/bubble-sound-effects](https://opengameart.org/content/bubble-sound-effects) | CC0 1.0 | 2: pop |
| Cat Purr & Meow | Kerzoven | [opengameart.org/content/cat-purr-meow](https://opengameart.org/content/cat-purr-meow) | CC0 1.0 | 2: animal |
| cicada sounds | syncopika | [opengameart.org/content/cicada-sounds](https://opengameart.org/content/cicada-sounds) | CC0 1.0 | 1 (1 loop): ambience |
| Clock Wind Sounds | BMacZero | [opengameart.org/content/clock-wind-sounds](https://opengameart.org/content/clock-wind-sounds) | CC0 1.0 | 4: mechanical |
| Correct Bell | Fupi | [opengameart.org/content/correct-bell](https://opengameart.org/content/correct-bell) | CC0 1.0 | 1: bell |
| Crickets Ambient Noise - loopable | Wolfgang_ | [opengameart.org/content/crickets-ambient-noise-loopable](https://opengameart.org/content/crickets-ambient-noise-loopable) | CC0 1.0 | 1 (1 loop): ambience |
| Crowd Shouting/Speaking Ambience | StarNinjas | [opengameart.org/content/crowd-shoutingspeaking-ambience](https://opengameart.org/content/crowd-shoutingspeaking-ambience) | CC0 1.0 | 1: crowd |
| Cure Magic | Someoneman | [opengameart.org/content/cure-magic](https://opengameart.org/content/cure-magic) | CC0 1.0 | 3: magic |
| Door Open, Door Close Set | qubodup | [opengameart.org/content/door-open-door-close-set](https://opengameart.org/content/door-open-door-close-set) | CC0 1.0 | 2: door |
| Dripping water loop | Independent.nu (submitted by qubodup) | [opengameart.org/content/dripping-water-loop](https://opengameart.org/content/dripping-water-loop) | CC0 1.0 | 4 (1 loop): water, ambience |
| Electronic device loop | qubodup | [opengameart.org/content/electronic-device-loop](https://opengameart.org/content/electronic-device-loop) | CC0 1.0 | 1: electronic |
| Fire Crackling | AntumDeluge | [opengameart.org/content/fire-crackling](https://opengameart.org/content/fire-crackling) | CC0 1.0 | 1: fire |
| Fireplace Sound loop | PagDev | [opengameart.org/content/fireplace-sound-loop](https://opengameart.org/content/fireplace-sound-loop) | CC0 1.0 | 1 (1 loop): fire |
| Forest bird sounds | pauliuw | [opengameart.org/content/forest-bird-sounds](https://opengameart.org/content/forest-bird-sounds) | CC0 1.0 | 4 (1 loop): animal, ambience |
| High traffic road sounds | IgnasD | [opengameart.org/content/high-traffic-road-sounds](https://opengameart.org/content/high-traffic-road-sounds) | CC0 1.0 | 1 (1 loop): ambience |
| Horse Trotting | EZduzziteh | [opengameart.org/content/horse-trotting](https://opengameart.org/content/horse-trotting) | CC0 1.0 | 1: animal |
| Keyboard Soundpack #1 [Typing and Single Keystrokes] | unicaegames | [opengameart.org/content/keyboard-soundpack-1-typing-and-single-keystrokes](https://opengameart.org/content/keyboard-soundpack-1-typing-and-single-keystrokes) | CC0 1.0 | 8: typing |
| Machine shutting down | Cough-E | [opengameart.org/content/machine-shutting-down](https://opengameart.org/content/machine-shutting-down) | CC0 1.0 | 1: mechanical |
| Magic Words + Healing Sound Effect | Spring Spring | [opengameart.org/content/magic-words-healing-sound-effect](https://opengameart.org/content/magic-words-healing-sound-effect) | CC0 1.0 | 1: magic |
| Mild Wind Background Noise | Bashar3A | [opengameart.org/content/mild-wind-background-noise](https://opengameart.org/content/mild-wind-background-noise) | CC0 1.0 | 2 (1 loop): wind |
| Opening and Closing a Map Sounds | Spring Spring | [opengameart.org/content/opening-and-closing-a-map-sounds](https://opengameart.org/content/opening-and-closing-a-map-sounds) | CC0 1.0 | 2: paper |
| Power-Up Sound Effects | Spring Spring | [opengameart.org/content/power-up-sound-effects](https://opengameart.org/content/power-up-sound-effects) | CC0 1.0 | 1: electronic |
| Rain (loopable) | Ylmir | [opengameart.org/content/rain-loopable](https://opengameart.org/content/rain-loopable) | CC0 1.0 | 1 (1 loop): rain |
| Rain + Long Thunder | WuxiaScrub | [opengameart.org/content/rain-long-thunder](https://opengameart.org/content/rain-long-thunder) | CC0 1.0 | 1: rain |
| SFX - Plug In, Plug Out | CleytonKauffman | [opengameart.org/content/sfx-plug-in-plug-out](https://opengameart.org/content/sfx-plug-in-plug-out) | CC0 1.0 | 2: switch |
| Sheep Baa | AntumDeluge | [opengameart.org/content/sheep-baa](https://opengameart.org/content/sheep-baa) | CC0 1.0 | 1: animal |
| Static | xhunterko | [opengameart.org/content/static](https://opengameart.org/content/static) | CC0 1.0 | 2: electronic |
| Swishes Sound Pack | artisticdude | [opengameart.org/content/swishes-sound-pack](https://opengameart.org/content/swishes-sound-pack) | CC0 1.0 | 3: whoosh |
| Tape Recorder Opening and Closing Sound Effects | Spring Spring | [opengameart.org/content/tape-recorder-opening-and-closing-sound-effects](https://opengameart.org/content/tape-recorder-opening-and-closing-sound-effects) | CC0 1.0 | 2: mechanical |
| Ticking clock. | bart | [opengameart.org/content/ticking-clock](https://opengameart.org/content/ticking-clock) | CC0 1.0 | 1: click |
| Typewriter sounds | Cassie-OrbitGames | [opengameart.org/content/typewriter-sounds](https://opengameart.org/content/typewriter-sounds) | CC0 1.0 | 3: typing |
| Various Sound Effects | laleksic | [opengameart.org/content/various-sound-effects](https://opengameart.org/content/various-sound-effects) | CC0 1.0 | 10: paper, door, switch, water, fire, bell |
| wind whoosh loop | SketchMan3 | [opengameart.org/content/wind-whoosh-loop](https://opengameart.org/content/wind-whoosh-loop) | CC0 1.0 | 1: wind |
| 406243 stubb typewriter-ding-near-mono.wav | _stubb | [commons.wikimedia.org/wiki/File%3A406243_stubb_typewriter-ding-near-mono.wav](https://commons.wikimedia.org/wiki/File%3A406243_stubb_typewriter-ding-near-mono.wav) | CC0 1.0 | 1: typing |
| Ambient classroom mono.ogg | rcrossley | [commons.wikimedia.org/wiki/File%3AAmbient_classroom_mono.ogg](https://commons.wikimedia.org/wiki/File%3AAmbient_classroom_mono.ogg) | Public domain (pdsounds.org) | 1 (1 loop): crowd |
| Bell-ring.flac | qubodup | [commons.wikimedia.org/wiki/File%3ABell-ring.flac](https://commons.wikimedia.org/wiki/File%3ABell-ring.flac) | CC0 1.0 | 1: bell |
| Bicycle-bell-1.wav | Soundscape_Leuphana | [commons.wikimedia.org/wiki/File%3ABicycle-bell-1.wav](https://commons.wikimedia.org/wiki/File%3ABicycle-bell-1.wav) | CC0 1.0 | 1: bell |
| Church bells - Leverkusen, 2007.oga | natalie | [commons.wikimedia.org/wiki/File%3AChurch_bells_-_Leverkusen%2C_2007.oga](https://commons.wikimedia.org/wiki/File%3AChurch_bells_-_Leverkusen%2C_2007.oga) | Public domain (pdsounds.org) | 1: bell |
| Cow in Antefasy.wav | Gasybeaugosse2020 | [commons.wikimedia.org/wiki/File%3ACow_in_Antefasy.wav](https://commons.wikimedia.org/wiki/File%3ACow_in_Antefasy.wav) | CC0 1.0 | 1: animal |
| Food wrapper crumpling.ogg | stilgar | [commons.wikimedia.org/wiki/File%3AFood_wrapper_crumpling.ogg](https://commons.wikimedia.org/wiki/File%3AFood_wrapper_crumpling.ogg) | Public domain (pdsounds.org) | 2: paper |
| Gull 1.ogg | avphillips | [commons.wikimedia.org/wiki/File%3AGull_1.ogg](https://commons.wikimedia.org/wiki/File%3AGull_1.ogg) | Public domain (pdsounds.org) | 1: animal |
| Howling wind.ogg | Tvabutzku1234 | [commons.wikimedia.org/wiki/File%3AHowling_wind.ogg](https://commons.wikimedia.org/wiki/File%3AHowling_wind.ogg) | CC0 1.0 | 2 (1 loop): wind |
| James River Rapids 2.ogg | Jarrod stanley | [commons.wikimedia.org/wiki/File%3AJames_River_Rapids_2.ogg](https://commons.wikimedia.org/wiki/File%3AJames_River_Rapids_2.ogg) | CC0 1.0 | 1 (1 loop): ambience |
| Medium rooster crowing.ogg | alys | [commons.wikimedia.org/wiki/File%3AMedium_rooster_crowing.ogg](https://commons.wikimedia.org/wiki/File%3AMedium_rooster_crowing.ogg) | Public domain (pdsounds.org) | 1: animal |
| Ocean Waves on a Tropical Beach.ogg | Jarrod stanley | [commons.wikimedia.org/wiki/File%3AOcean_Waves_on_a_Tropical_Beach.ogg](https://commons.wikimedia.org/wiki/File%3AOcean_Waves_on_a_Tropical_Beach.ogg) | CC0 1.0 | 1 (1 loop): ambience |
| Pouring water bottles.ogg | stephan | [commons.wikimedia.org/wiki/File%3APouring_water_bottles.ogg](https://commons.wikimedia.org/wiki/File%3APouring_water_bottles.ogg) | Public domain (pdsounds.org) | 1: water |
| Pouring water in mug in sink.ogg | earthcalling | [commons.wikimedia.org/wiki/File%3APouring_water_in_mug_in_sink.ogg](https://commons.wikimedia.org/wiki/File%3APouring_water_in_mug_in_sink.ogg) | Public domain (pdsounds.org) | 1: water |
| Restaurant ambience.ogg | stephan | [commons.wikimedia.org/wiki/File%3ARestaurant_ambience.ogg](https://commons.wikimedia.org/wiki/File%3ARestaurant_ambience.ogg) | Public domain (pdsounds.org) | 1 (1 loop): crowd |
| Shopping mall less crowded.ogg | natalie | [commons.wikimedia.org/wiki/File%3AShopping_mall_less_crowded.ogg](https://commons.wikimedia.org/wiki/File%3AShopping_mall_less_crowded.ogg) | Public domain (pdsounds.org) | 1 (1 loop): crowd |
| Spring Peeper Frogs (Pseudacris crucifer) singing on night of April 21 of 2019 in North Pittston PA.ogg | JohnDziak | [commons.wikimedia.org/wiki/File%3ASpring_Peeper_Frogs_(Pseudacris_crucifer)_sing](https://commons.wikimedia.org/wiki/File%3ASpring_Peeper_Frogs_(Pseudacris_crucifer)_singing_on_night_of_April_21_of_2019_in_North_Pittston_PA.ogg) | CC0 1.0 | 1 (1 loop): ambience |
| Star-LC-10-printer-01.ogg | Priwo | [commons.wikimedia.org/wiki/File%3AStar-LC-10-printer-01.ogg](https://commons.wikimedia.org/wiki/File%3AStar-LC-10-printer-01.ogg) | Public domain (author, PD-self) | 2: mechanical |
| Sunday in the city street noise1.ogg | cori | [commons.wikimedia.org/wiki/File%3ASunday_in_the_city_street_noise1.ogg](https://commons.wikimedia.org/wiki/File%3ASunday_in_the_city_street_noise1.ogg) | Public domain (pdsounds.org) | 1 (1 loop): ambience |

## Speech and Python components

| Component | Source (pinned) | Licence | Use |
|---|---|---|---|
| Whisper large-v3 turbo (CTranslate2) | [deepdml/faster-whisper-large-v3-turbo-ct2 @ `4df90f7`](https://huggingface.co/deepdml/faster-whisper-large-v3-turbo-ct2/tree/4df90f75321148c3a29a9e2351b7ddf8f5b115a8) | MIT | Word timings of voice-overs; downloaded after the user confirms, checked by size and SHA-256 |
| faster-whisper (SYSTRAN) | PyPI | MIT | Runs Whisper on the CPU or an NVIDIA GPU |
| NVIDIA CUDA libraries: nvidia-cublas-cu12 12.9.2.10, nvidia-cudnn-cu12 9.27.0.42, nvidia-cuda-nvrtc-cu12 12.9.86 | PyPI (SHA-256 of each wheel in `packages/voice/cuda.mjs`) | NVIDIA proprietary (CUDA Toolkit EULA, cuDNN Software License Agreement), free to use | Optional, offered only on a computer with a suitable NVIDIA card and downloaded only on the user's yes |
| psd-tools 1.23.0 · python-pptx 1.0.2 · pypdfium2 5.14.0 · Pillow 12.3.0 · numpy 2.5.1 | PyPI | MIT · MIT · Apache-2.0 / BSD-3-Clause · MIT-CMU · BSD-3-Clause | Reading PSD / PSB, PowerPoint and PDF assets; installed into `runtime/python-libs`, never into the system Python |
| librosa 1.0.0 · soundfile 0.14.0 | PyPI | ISC · BSD-3-Clause | Music tempo and beats (the app's file scan and lyric timing) |
| playwright 1.63.0 · fonttools 4.66.1 | PyPI ([playwright-python](https://github.com/microsoft/playwright-python), [fonttools](https://github.com/fonttools/fonttools)) | Apache-2.0 · MIT | The After Effects export: Playwright drives the pinned Chromium (no browser download of its own), fontTools reads the film's fonts; installed into `runtime/python-libs`, never into the system Python |
| Lyrics alignment method | Moworks Motion kit (`engine/audio/align.py`) | MIT, © 2026 Moworks | Adapted in `tools/asr/align_lyrics.py` |
| After Effects port | Moworks Motion kit 2.0.4 (`engine/ae/`) | MIT, © 2026 Moworks | Adapted in `packages/ae-export`; changes listed in `packages/ae-export/PROVENANCE.md` |

## The app's own npm dependencies

| Package | Version | Licence |
|---|---|---|
| react, react-dom | 18.3.1 | MIT |
| lucide-react | 0.468.0 | ISC |
| esbuild | 0.24.2 | MIT |
| vite, @vitejs/plugin-react | 6.0.7, 4.3.4 | MIT |

Their own dependencies are listed in `package-lock.json`.

## Not used

Sources reviewed and deliberately not taken include PyMuPDF (AGPL-3.0; pypdfium2 is used instead), SF Pro (Apple's licence does not allow
bundling; Inter is used instead), react-bits (Commons Clause), typed.js (GPL-3.0), Adobe Fonts, and any remote demo media or brand logos.

## GSAP Standard License

GSAP is free to use, including for commercial work, under the [GSAP Standard License](https://gsap.com/standard-license). It permits use
in websites, web applications and digital interfaces, and prohibits use in tools that let users create animations through a visual,
no-code builder in competition with Webflow. The GSAP files keep their original headers. GSAP is not open-source software; anyone
redistributing a film or this app should read the licence.

## Apache-2.0 notices

HyperFrames and Anidoodle are licensed under the Apache License 2.0. Their `LICENSE` files ship in `bundle/hf/LICENSE` and
`bundle/styles/anidoodle/LICENSE`, and Anidoodle's `NOTICE` in `bundle/styles/anidoodle/NOTICE`. Files from these projects are used as
shipped unless this document says otherwise; where the app changes behaviour at run time (the Anidoodle canvas-read bridge, the CDN
remapping of registry blocks), the change lives in the app's own code, not in the third-party files.

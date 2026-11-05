---
name: kit-setup
description: Check, finish, repair, configure or update the 3D Cartoon Animation Toolkit installation — run the doctor and ask the user to install whatever is missing (Node.js, ffmpeg, uv, the npm packages, Remotion's headless Chrome, the sound kit), finish an interrupted setup ("set this up", "finish the setup", kit.config.json missing), switch modules on or off (Shorts, What-If, AI voice, Idea Lab, Character & Set Builder, fresh-eyes Review, Original Music), connect or switch a voice MCP, fix WebGL render errors, change the defaults (format, captions, review mode), render the setup demos, or update the kit from a newer 3D-CARTOON-ANIMATION-TOOLKIT.md. Use when the doctor shows ✗, something "doesn't work", the user asks what the kit can do, or gives a newer kit file.
---

# Kit setup & maintenance

## The tool check (start of every project; CLAUDE.md sends you here when the doctor shows ✗)
```bash
node tools/doctor.mjs
```
For each ✗, **ask the user to install it** in ONE message: name each missing item, say why it's needed, and give the
exact command for their system (the doctor prints it; the table below has all of them). Then wait.

| Missing | Why | macOS | Windows | Linux | Who installs |
|---|---|---|---|---|---|
| Node.js 20+ LTS | runs Remotion and every tool | `brew install node` | `winget install OpenJS.NodeJS.LTS` | nodejs.org installer, or nvm | the user |
| ffmpeg (+ ffprobe) | encodes the MP4, mixes and measures the sound, times the voice | `brew install ffmpeg` | `winget install Gyan.FFmpeg` | `sudo apt install ffmpeg` | the user |
| uv | runs the Python sound design, voice timing and review sheets with no Python setup | `brew install uv` | `winget install astral-sh.uv` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | the user |
| Homebrew (macOS) | the `brew` commands above | https://brew.sh (asks for their password) | — | — | the user |
| npm packages (Remotion, React, Three.js, the font loader) | the video engine and the 3D engine | `npm install` (in this folder) | same | same | you, after a yes |
| Remotion's headless Chrome | renders the frames with WebGL | `npx remotion browser ensure` | same | same (+ `sudo apt install libnss3 libatk-bridge2.0-0 libgbm1` if Chrome won't start) | you, after a yes |
| the sound kit | the code-made effects | `uv run --with numpy --with scipy python tools/sfx/build_sounds.py` | same | same | you, after a yes |

- Windows: after a winget install, a **new terminal** is needed before the tool is found; the user restarts the
  session if needed.
- Never run an installer that needs the user's password: give them the command.
- When they say it's done, run the doctor again. Continue only when it says **ready**.

## Finish the setup (interrupted, or "set this up" in an unpacked folder)
1. Say one line: "The setup isn't finished yet, so I'll complete it first."
2. Do the tool check above until the doctor says ready (the `kit.config.json` row aside).
3. If `kit.config.json` is missing, ask the setup questions (the installer's A2: modules, voice) in ONE message, then
   write it from `kit.config.example.json`: `version` from `package.json`, `setupDate` today, `modules` and
   `voiceGeneration` from the answers, `defaults.format` from the format modules they chose.
4. **Render the two demos** (proves the engine, both formats, the fonts and the sound):
   ```bash
   node tools/qa.mjs DemoTall
   node tools/qa.mjs DemoWide
   node tools/stills.mjs DemoTall out/setup-check/tall 0.3s 1.5s 2.6s 4.2s --sheet
   node tools/stills.mjs DemoWide out/setup-check/wide 0.3s 1.1s 2.5s 4.7s --sheet
   node tools/render.mjs DemoTall
   node tools/render.mjs DemoWide
   node tools/qc.mjs DemoTall
   node tools/qc.mjs DemoWide
   ```
   What you should see is in the installer's A5 (and in the demos' file headers). Each QA prints `COLLISION none`;
   each QC reports 5.00 s and about −14 LUFS.
5. Tell the user it's ready (the installer's A6). Give both demo paths and **offer to open them** in their player.
   Never play them yourself.

## Modules (what the user can switch on or off)
`kit.config.json → modules`. Everything is installed either way; a module that's off is simply not used, and the skill
for it says so and offers to switch it on. Switch one by editing the flag and telling the user in one line.

| Flag | Module | What the user gets | Default |
|---|---|---|---|
| `shorts` | **Story Shorts (9:16)** | 40–60 s narrated mini-stories in five formats (hidden system, mini-tale, sci-fi what-if, levels of X, detective), skill `cartoon-shorts` | on |
| `whatif` | **What-If Stories (16:9)** | 30–50 s What-If pieces and 8–12 min chaptered episodes, skill `cartoon-whatif` | on |
| `ideas` | **Idea Lab** | idea lists in the formats' topic buckets, fact research, titles, descriptions, tags, chapters, skill `idea-lab` | on |
| `builder` | **Character & Set Builder** | new original characters, costumes, props and reusable sets, skill `character-builder` | on |
| `review` | **Fresh-eyes Review** | a separate reviewer agent checks every finished video's frames before delivery (fast mode ~110–190 k tokens), skill `render-review` | on |
| `music` | **Original Music** | music composed in code, only when asked, skill `original-music` | off |

Always on (the core): the 3D engine, the cast, the office set, the looks, captions, the code-made sound kit, the
collision QA, stills, the render and loudness master, `cartoon-video` (any clip), `style-note`, and the own-recording
voice path. The **AI voice** is on when `voiceGeneration.provider` isn't `"none"`.

**Defaults** (`kit.config.json → defaults`): `format` (`short` = 9:16 / `long` = 16:9), `captions` (true/false: the
habit for new videos; each video's `vo.ts → CAPTIONS` decides), `review` (`fast` / `full`).

## Connect a voice MCP (the AI voice)
Follow `cartoon-video/references/VOICE.md` §2: discover the text-to-speech tool and read its schema, list the voices
and let the user pick (you can't listen), preflight the cost and ask before spending, generate ONE short test line,
record what worked in `kit.config.json → voiceGeneration`. If the MCP isn't connected yet, the user adds it in Claude's
connector settings (or with `claude mcp add` in a terminal, following the provider's instructions) and starts a new
session so its tools load. Never ask for or handle their API keys.

## Renders fail with a WebGL / GPU error
The frames are drawn with WebGL in Remotion's headless Chrome, using `kit.config.json → render.gl`:
1. `"angle"` (the default) works on Macs and most Windows machines.
2. If a still or render fails with a WebGL, GL or GPU error, or comes out black: set `"swangle"` (software rendering,
   slower but works everywhere) and retry a still.
3. On Linux with a GPU, `"egl"` or `"vulkan"` can be faster than `"swangle"`; try them on one still.
4. Record what worked in `kit.config.json → render.gl`. `render.concurrency` (null = half the CPU cores, at most 6)
   lowers the tabs if the machine runs out of memory.

## Rebuild the sounds
`uv run --with numpy --with scipy python tools/sfx/build_sounds.py` rebuilds the whole kit (deterministic, ~2 s).

## Update the kit from a newer kit file
1. Back up: `src/Root.tsx`, `src/soundtracks.ts`, `.claude/skills/cartoon-video/references/STYLE.md` (the user's
   notes), and any sounds the user added to `tools/sfx/build_sounds.py`.
2. Run `node tools/unpack.mjs "<new 3D-CARTOON-ANIMATION-TOOLKIT.md>" --force`. It overwrites the kit's own files. The
   user's work is never in the kit file: `src/videos/`, `src/sets/`, `src/cast.ts`, `projects/`, `public/videos/`,
   `public/music/`, `tools/music/`, `tools/sfx/build_<slug>.py`, `kit.config.json`.
3. Merge the backups back: re-register the videos between the `@videos` markers, restore the user's notes and added
   sounds.
4. Run `npm install`, rebuild the sounds, run the doctor, and render one demo still per format.

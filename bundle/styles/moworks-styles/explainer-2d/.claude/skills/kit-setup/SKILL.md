---
name: kit-setup
description: Check, finish, repair, configure or update the 2D Explainer Animation Toolkit installation — run the doctor and ask the user to install whatever is missing (Node.js 22+, ffmpeg with ffprobe, uv, the npm packages HyperFrames/GSAP/Figtree, HyperFrames' headless Chrome), finish an interrupted setup ("set this up", "finish the setup", kit.config.json missing), render the two setup demos, switch modules on or off (Shorts, Explainers 16:9, Idea help, Fresh-eyes Review), set the sound defaults, connect or switch a voice tool, fix render problems (sandbox hangs, Chrome download, missing fonts, Python/uv, ffmpeg filters, old Node, the esbuild notice), or update the kit from a newer kit file. Use when the doctor shows ✗, something "doesn't work", the user asks what the kit can do, or gives a newer kit file.
---

# Kit setup and maintenance

## The tool check (start of every project; CLAUDE.md sends you here when the doctor shows ✗)
```bash
node tools/doctor.mjs
```
It checks Node ≥ 22, ffmpeg and ffprobe (with libx264 and the filters the checks use), uv, the npm packages
(hyperframes 0.9.1, gsap 3.15.0, @fontsource/figtree), HyperFrames' Chrome, the speech model and `kit.config.json`,
and prints the fix and who runs it for every ✗ (`user`, `folder`, `cache` or `agent`). `--json` gives the same as
JSON.

For each ✗, **ask the user to install it** in ONE message: name each missing item, say why it's needed, and give the
exact command for their system (the doctor prints it; the table below has them). Then wait.

| Missing | Why | macOS | Windows | Linux | Who installs |
|---|---|---|---|---|---|
| Node.js 22+ LTS | runs HyperFrames and every tool | `brew install node` | `winget install OpenJS.NodeJS.LTS` | the nodejs.org installer, or nvm | the user |
| ffmpeg (+ ffprobe) | encodes the MP4, cleans the voice, measures loudness, freezes and cuts | `brew install ffmpeg` | `winget install Gyan.FFmpeg` | `sudo apt install ffmpeg` | the user |
| uv | runs the Python voice and sound tools with no Python setup (it fetches Python 3.12 and the pinned packages itself) | `brew install uv` | `winget install astral-sh.uv` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | the user |
| Homebrew (macOS) | the `brew` commands above | https://brew.sh (asks for their password) | — | — | the user |
| npm packages (HyperFrames, GSAP, Figtree) | the renderer, the timeline, the font | `npm install` (in this folder) | same | same | you, after a yes |
| HyperFrames' headless Chrome | draws the frames | `npm run browser` (the doctor prints it) | same | same (+ `sudo apt install libnss3 libatk-bridge2.0-0 libgbm1` if Chrome won't start) | you, after a yes |
| The speech model | times the voice and checks the final transcript | `npm run speech` (the doctor prints it) | same | same | you, after a yes |
| `kit.config.json` | the user's settings | "Finish the setup" below | same | same | you |

- Windows: after a winget install, a **new terminal** is needed before the tool is found; the user restarts the
  session if needed.
- Never run an installer that needs the user's password: give them the command.
- When they say it's done, run the doctor again. Continue only when it says **ready**.

## Finish the setup (interrupted, or "set this up" in an unpacked folder)
1. Say one line: "The setup isn't finished yet, so I'll complete it first."
2. Do the tool check above until the doctor says ready (the `kit.config.json` row aside).
3. Make sure every demo and the example have their engine copy:
   `node tools/sync-engine.mjs demos/demo-wide`, `node tools/sync-engine.mjs demos/demo-tall`,
   `node tools/sync-engine.mjs examples/where-the-needle-stops`.
4. If `kit.config.json` is missing, ask the setup questions (the installer's A2: formats, extras, voice) in ONE message,
   then write it from `kit.config.example.json`: `version` from `package.json`, `setupDate` today, `modules` from the
   answers, `voiceGeneration` from the voice answer, `defaults.format` = `"tall"` if only Shorts is on, else `"wide"`.
5. **Render the two demos** (they prove the engine, both formats, the font, Python and the mixer). Snapshots and renders
   need the sandbox disabled:
   ```bash
   node tools/sound.mjs demos/demo-wide
   node tools/snapshot.mjs demos/demo-wide --at 0.5,1.6,2.8,4.0 --out snaps/setup-check
   node tools/render.mjs demos/demo-wide
   node tools/sound.mjs demos/demo-tall
   node tools/snapshot.mjs demos/demo-tall --at 0.5,1.6,2.8,4.0 --out snaps/setup-check
   node tools/render.mjs demos/demo-tall
   ```
   What you should see is in the installer's A5. Each render ends with its QC: 300 frames (5.00 s at 60 fps).
6. Tell the user it's ready (the installer's A6). Give both demo paths and **offer to open them** in their player.
   Never play them yourself.

## Modules (what the user can switch on or off)
`kit.config.json → modules`. Everything is installed either way; a module that's off is simply not used, and its skill
says so and offers to switch it on. Switch one by editing the flag and telling the user in one line.

| Flag | Module | What the user gets | Default |
|---|---|---|---|
| `shorts` | **Shorts (9:16)** | 30–60 s vertical explainers, hook first, inside the platform safe zones (skill `explainer-shorts`) | on |
| `longform` | **Explainers (16:9)** | 2–12 minute explainers in chapters, built chapter by chapter (skill `explainer-longform`) | on |
| `ideas` | **Idea help** | about 5 topic ideas with a recommendation, titles, descriptions, YouTube chapters (`script-writer` §3–§4) | on |
| `review` | **Fresh-eyes Review** | a separate reviewer agent reads every finished film beat by beat before delivery; costs extra tokens per video (skill `render-review`) | on |

Always on (the core): any explainer in either format (`explainer-video`), scripts and fact sheets, the voice tools,
the sound kit, scene modules, snapshots, render and QC, `style-note`, and this skill.

**Sound defaults** (`kit.config.json → sound`): `music` and `sfx`, each `"generic"` or `"off"`. They're the defaults
for `tools/sound.mjs`; a film can still ask for the bespoke route.

**Defaults** (`kit.config.json → defaults`): `format` (`"wide"` = 16:9, `"tall"` = 9:16) and `fps` (60).

## Connect a voice tool
Follow the `voice-over` skill → "B · A text-to-speech tool": find the tool among your tools and read its schema, let the
user pick the voice (you can't listen), show the cost and ask before spending, record what worked in
`kit.config.json → voiceGeneration` (`provider`, `tool`, `notes`). If no such tool is connected, the user adds an MCP
connector for their text-to-speech service in Claude's settings (or with `claude mcp add` in a terminal, following the
provider's instructions) and starts a new session so its tools load. Never ask for or handle their API keys.

## Troubleshooting
| Problem | Cause | Fix |
|---|---|---|
| `snapshot`, `render`, `check` or `preview` hangs on "Waiting for root component to load" | headless Chrome can't start inside Claude Code's sandbox | rerun the command with the sandbox disabled (`dangerouslyDisableSandbox`), or ask the user to run it in a normal terminal and say when it's done. Transcription works inside the sandbox |
| The doctor says HyperFrames' Chrome is missing, or the download fails | first use, or a network or proxy problem | run `npm run browser` again (after a yes). On Linux, if Chrome downloads but won't start: `sudo apt install libnss3 libatk-bridge2.0-0 libgbm1` (the user runs it) |
| Text renders in a rounder or system-looking font | the Figtree files aren't in the video's `ex/fonts/` | `node tools/sync-engine.mjs <dir>`; if it reports a missing file, `npm install` (after a yes). A missing font can also stall the first frame, so a snapshot that times out may be this |
| A GPU or WebGL error | the house look is plain 2D canvas and needs no WebGL; something in a module uses it | rewrite that part of the module in 2D canvas |
| `uv` not found, or a Python error in the sound or voice tools | uv missing, or the first run couldn't download Python 3.12 or the packages | install uv (the user), check the network, rerun. Never `pip install` anything globally; the tools run through `node tools/py.mjs`, which pins everything |
| The doctor flags the H.264 encoder or an ffmpeg filter (ebur128, loudnorm, freezedetect, scdet, silencedetect, alimiter) | a minimal ffmpeg build | the user installs the full build: `brew install ffmpeg`, `winget install Gyan.FFmpeg`, or `sudo apt install ffmpeg` |
| `node -v` is below 22 | HyperFrames needs Node 22 or newer | the user installs the current LTS (table above); on Windows, then a new terminal |
| npm prints that an install script (esbuild) was not run | npm's script approval | ignore it unless `node tools/check.mjs` or HyperFrames fails; then run `npm approve-scripts esbuild` and `npm rebuild esbuild` |
| HyperFrames `check` warns about canvas content at the frame edge | expected: full-bleed scenes paint the whole canvas | nothing; mention it once so the user isn't worried |
| `[EX] missing cue` in the output, or an event at the very start of the film | a word in `story.js` isn't in `story/words.json` (wrong spelling or occurrence) | fix the cue word or its occurrence number; matching ignores case and punctuation |
| The voice timing stops with dropped or added words | the take doesn't say the script exactly | the `voice-over` skill → "When it fails" |
| The last frame is missing from the MP4 | an encode with `-shortest` | always encode through `node tools/render.mjs` (it uses the exact duration) |
| "Transcription is unavailable" | the speech model isn't installed | install it with the command the doctor (or time-voice) prints, after a yes; it downloads once |

## Update the kit from a newer kit file
1. Back up: `STYLE.md` (the Author notes), `SCRIPTING.md` if style notes changed it, `kit.config.json`, and any
   engine or tool file the user asked you to change for good.
2. Run `node tools/unpack.mjs "<the new kit file>" --force`. It overwrites the kit's own files. The user's work is never
   in the kit file: `videos/` and `kit.config.json` are untouched.
3. Merge the backups back: the Author notes rows and the rules they changed, any lasting engine changes.
4. Run `npm install`, `npm run browser` (only if the doctor asks for it), `node tools/sync-engine.mjs` for both demos
   and the example, then the doctor, then one demo snapshot per format.
5. Existing videos keep their own engine copy in `ex/`. Re-sync one only when the user wants it to pick up the new
   engine, then re-snapshot it before rendering.

## "What can this kit do?"
Answer from the modules table: narrated 2D explainers in the house look, 16:9 and 9:16 at 60 fps; any length from a
few seconds to 12 minutes (chapters); scripts with fact sheets; the user's own voice or a text-to-speech tool;
music and effects made in code; a fresh-eyes review. Offer the README's example requests.

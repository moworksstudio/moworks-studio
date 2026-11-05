---
name: kit-setup
description: Check, finish, repair or update the Story Animation Kit installation — run the doctor and ask the user to install whatever is missing (Node.js, ffmpeg, uv, Remotion and its headless Chrome, the two sound libraries), finish an interrupted setup ("set this up", "finish the setup", kit.config.json missing), render the two 5-second style demos, rebuild the sounds, connect a voice MCP for narrated videos, or update the kit from a newer STORY-ANIMATION-KIT.md. Use when the doctor shows ✗, something "doesn't work", or the user gives a newer kit file.
---

# Kit setup & maintenance

## The tool check (start of every project; CLAUDE.md sends you here when the doctor shows ✗)
```bash
node tools/doctor.mjs
```
For each ✗, **ask the user to install it**. Use one message that names each missing item, says why it's needed, and
gives the exact command for their system (the doctor prints it; the table below has all of them). Then wait.

| Missing | Why | macOS | Windows | Linux | Who installs |
|---|---|---|---|---|---|
| Node.js 20+ LTS | runs Remotion and every tool | `brew install node` | `winget install OpenJS.NodeJS.LTS` | nodejs.org installer, or nvm | the user |
| ffmpeg (+ ffprobe) | encodes the MP4, mixes and measures the sound | `brew install ffmpeg` | `winget install Gyan.FFmpeg` | `sudo apt install ffmpeg` | the user |
| uv | runs the Python sound design and transcription with no Python setup | `brew install uv` | `winget install astral-sh.uv` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | the user |
| Homebrew (macOS) | the `brew` commands above | https://brew.sh (asks for their password) | — | — | the user |
| Remotion (npm packages) | the video engine | `npm install` (in this folder) | same | same | you, after a yes |
| Remotion's headless Chrome | renders the frames | `npx remotion browser ensure` | same | same (+ `sudo apt install libnss3 libatk-bridge2.0-0 libgbm1` if Chrome won't start) | you, after a yes |
| Stickman Explainer sounds | the style's effects | `uv run --with numpy --with scipy python tools/sfx/build_stickman.py` | same | same | you, after a yes |
| Inner Voice Short sounds | the style's effects | `uv run --with numpy --with scipy python tools/sfx/build_inner_voice.py` | same | same | you, after a yes |

- Windows: after a winget install, a **new terminal** is needed before the tool is found. The user restarts the
  session if needed.
- Never run an installer that needs the user's password. Give them the command.
- When they say it's done, run the doctor again. Continue only when it says **ready**.

## Finish the setup (interrupted, or "set this up" in an unpacked folder)
1. Say one line: "The setup isn't finished yet, so I'll complete it first."
2. Do the tool check above, until the doctor says ready (the `kit.config.json` row aside).
3. Write `kit.config.json` from `kit.config.example.json`: `version` from `package.json`, `setupDate` today, plus
   what the doctor reported about fonts and the voice MCP.
4. **Render the two 5-second demos** (this proves both styles work):
   ```bash
   node tools/stills.mjs DemoStickman out/setup-check/stickman 0.3s 1.5s 2.5s 4.7s --sheet
   node tools/stills.mjs DemoInnerVoice out/setup-check/inner-voice 0.6s 1.3s 3.6s 4.7s --sheet
   node tools/render.mjs DemoStickman
   node tools/render.mjs DemoInnerVoice
   node tools/qc.mjs DemoStickman
   node tools/qc.mjs DemoInnerVoice
   ```
   Look at both sheets:
   - **Stickman Explainer:** a hero in a red hoodie at a bedroom window at dawn, papers flying, then flying over
     rooftops, and a pigeon with a "?".
   - **Inner Voice Short:** `DAY 1`, a cream character playing a guitar and wincing, a black shadow with a red glow,
     then the red "you sound awful." and "put it down."

   Each demo must QC at 5.00 s for audio and video and about −14 LUFS. The Stickman demo has one planned cut at
   1.75 s; the Inner Voice demo has none.
5. Tell the user it's ready (see the installer's A6). Name the two styles, give both demo paths, and **offer to open
   them** in their player. Never play them yourself.

## Connect a voice MCP (narrated Stickman Explainers)
Follow `.claude/skills/stickman-explainer/references/VOICE.md` §2:
1. Discover the TTS tool and read its schema. List the voices and let the user pick (you can't listen).
2. Preflight the cost and ask before spending. Generate ONE short test line, then record what worked in
   `kit.config.json → voiceGeneration`.

If the MCP isn't connected yet, the user adds it in Claude's connector settings and starts a new session. Never ask
for or handle their API keys.

## Rebuild the sounds
- `tools/sfx/build_stickman.py` and `tools/sfx/build_inner_voice.py` rebuild a whole library.
- `… build_stickman.py tag-d,boom` rebuilds just the named sounds.
- Sounds are deterministic (fixed seeds).

## Update the kit from a newer kit file
1. Back up these files:
   - `src/Root.tsx`
   - `src/soundtracks.ts`
   - both `STYLE.md` files (they hold the user's notes)
   - any sounds the user added to the two library scripts
2. Run `node tools/unpack.mjs "<new STORY-ANIMATION-KIT.md>" --force`. It overwrites the kit's own files. The
   user's videos are never in the kit file: `src/videos/`, `projects/`, `public/videos/`, `public/music/`,
   `tools/music/`, `tools/sfx/build_<slug>.py` and `kit.config.json`.
3. Merge the backups back in. Re-register the videos between the `@videos` markers, and restore the notes tables and
   added sounds.
4. Run `npm install`, rebuild both sound libraries, run the doctor, and render one demo still per style.

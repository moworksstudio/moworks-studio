---
name: kit-setup
description: Finish, check, repair or extend the Paper Collage Motion Kit installation — finish an interrupted setup ("set this up", "finish the setup", or kit.config.json / node_modules missing), run the doctor, reinstall missing tools, rebuild textures/sounds, connect (or switch) the image-generation or voice MCP and record what works, change the defaults (format, outputs, image inbox), or update the kit from a newer kit file. Use when something "doesn't work", when the user connects a new MCP ("I connected Higgsfield / ElevenLabs / …"), wants an image folder, or gives a newer PAPER-COLLAGE-MOTION-KIT.md.
---

# Kit setup & maintenance

## Finish the setup (it was interrupted, or the user says "set this up" in an unpacked folder)
1. Say one line: "The setup isn't finished yet, so I'll complete it first."
2. `node tools/doctor.mjs`. Install whatever is missing, **asking before each system install** (table below).
3. If `node_modules/` is missing: `npm install`, then `npx remotion browser ensure`.
4. If `public/textures/` or `public/sfx/kit/` is missing, run the two `uv run …` commands in the table below.
5. If `kit.config.json` is missing, ask the setup questions in ONE message:
   - **image folder or chat:** do they want an `images/` folder to drop pictures into, or will they give them in the chat?
   - **image MCP:** use the connected one? (Check your tools first and propose.) If there's none, recommend connecting one.
   - **voice MCP:** use the connected one? If there's none, they can give MP3s or connect one.
   - **default format:** square, vertical or horizontal.

   Then write it from `kit.config.example.json` (`version` from `package.json`, `setupDate` today,
   `defaults.outputs: ["mp4"]`), and create `images/` with a README if they chose it.
6. Prove it works: `node tools/stills.mjs Demo out/setup-check 0.4s 3.9s 6.2s 9.3s --sheet` (look at it), then
   `node tools/render.mjs Demo --mp4`. Give the user the MP4 path, but don't play it.
7. Test the chosen MCPs once each (asking before spending credits); see "Connect or switch an MCP" below.
8. Tell the user it's ready, with three example requests.

## Health check
```bash
node tools/doctor.mjs
```
Fix each ✗ with the command it prints. **Ask before installing system software** (Node.js, ffmpeg, uv), and give the
user the command to run themselves when it needs their password.

| Missing | macOS | Windows | Linux |
|---|---|---|---|
| Node.js 20+ LTS | `brew install node` | `winget install OpenJS.NodeJS.LTS` | nodejs.org installer / nvm |
| ffmpeg | `brew install ffmpeg` | `winget install Gyan.FFmpeg` (then a NEW terminal) | `sudo apt install ffmpeg` |
| uv (runs the Python) | `brew install uv` | `winget install astral-sh.uv` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Remotion | `npm install` then `npx remotion browser ensure` (in this folder) | same | same (+ `sudo apt install libnss3 libatk-bridge2.0-0 libgbm1` if Chrome won't start) |
| textures | `uv run --with numpy --with pillow python tools/textures.py` | same | same |
| sounds | `uv run --with numpy --with scipy python tools/sfx/build_kit.py` | same | same |

## Connect or switch an MCP
- **Images**: follow `motion-graphic/references/IMAGES.md` §2 (discover the tool, read the schema, preflight the cost,
  generate one test cut-out, clean it, show it), then write `kit.config.json → imageGeneration`.
- **Voice**: follow `motion-graphic/references/VOICE.md` §2 (discover, list voices, let the user pick, test one line),
  then write `kit.config.json → voiceGeneration`.
- If the MCP still needs connecting: the user adds it in Claude's connector / MCP settings (or with `claude mcp add`
  in a terminal, following the provider's instructions), then starts a new session so its tools load. You can't
  connect it for them, and never ask for or handle their API keys.

## Change the defaults
Edit `kit.config.json`:
- `defaults.format`: square / vertical / horizontal
- `defaults.outputs`: `["mp4"]` (keep it). GIFs and transparent renders are made only when the user asks for them
- `defaults.fps`
- `images.inbox`: a folder name, or null for chat only. Create the folder with a short README if it's new.

## Update the kit from a newer kit file
`node tools/unpack.mjs "<new kit file>.md" --force` overwrites the kit's own files. The user's graphics
(`src/graphics/`, `projects/`, `public/graphics/`, `public/library/`), `kit.config.json`, `src/Root.tsx`
registrations and their style notes are not in the kit file, but **back up `src/Root.tsx`,
`src/soundtracks.ts` and `.claude/skills/motion-graphic/references/STYLE.md` first and merge them back**.
Then run `npm install`, rebuild the sounds and textures, run the doctor, and render a Demo still.

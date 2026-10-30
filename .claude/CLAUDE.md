# Moworks Studio: installing it with Claude Code

This file is for Claude Code when someone pastes this repository's link and asks to install, update or run Moworks Studio. The app
installs most of itself: `Moworks Studio.bat` installs its npm packages and builds the interface, and the app's first-run screen downloads
everything else. Your job is only the steps before that. Windows 10 or 11 only. Ask before each install; say what it is and its size.

## 1. What must be on the computer first

Check each one and install what is missing, before `Moworks Studio.bat` (add `--accept-package-agreements
--accept-source-agreements` to each winget line):

| Needed | Check | Install | Why |
|---|---|---|---|
| Git | `git --version` | `winget install -e --id Git.Git` | cloning; the app keeps each film's history with git |
| Node.js 22 or newer | `node --version` | `winget install -e --id OpenJS.NodeJS.LTS` | the app itself |
| Claude Code | the PowerShell line below | see below | every Claude step in the app runs through it |

- After installing Git or Node, open a new terminal (or tell the user to) so PATH picks them up.
- FFmpeg 9.0 and Python 3.12: do not install them. The app's **Install** gets them with winget when they are missing, for this user only
  (on a computer without winget, its screen shows the lines to run).
- Claude Code: the app needs a `claude.exe`. The Claude desktop app already has one, which the app finds by itself, so with Claude
  desktop installed there is nothing to install. `where claude` and `claude --version` do not see that copy (it is not on PATH): check
  with this PowerShell line instead, which looks in the desktop app's folders (a version folder, then a build folder, holds the exe) and
  in the native install's `%USERPROFILE%\.local\bin`:

  ```powershell
  Get-ChildItem "$env:LOCALAPPDATA\Claude-Data\claude_*\claude-code", "$env:LOCALAPPDATA\Packages\Claude_*\LocalCache\Roaming\Claude\claude-code", "$env:APPDATA\Claude\claude-code", "$env:USERPROFILE\.local\bin" -Recurse -Filter claude.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  ```

  A path printed: Claude Code is there, go on. Nothing printed: install the native build with PowerShell,
  `irm https://claude.ai/install.ps1 | iex` (an npm install, `claude.cmd`, is not enough). The user signs in later, inside the app.

## 2. Clone and start

Clone into a folder of its own, on a local disk (not Google Drive, OneDrive or Dropbox: their sync locks files while films render).
The folder that holds `app` becomes the app's work folder (projects, library, downloads), unless the user picks another at first start.

```bat
mkdir "%USERPROFILE%\Moworks Studio"
git clone https://github.com/moworksstudio/moworks-studio.git "%USERPROFILE%\Moworks Studio\app"
"%USERPROFILE%\Moworks Studio\app\Moworks Studio.bat"
```

The first start runs `npm install` (about 80 MB) and builds the interface (under a minute), then opens the app window. Later starts open
it directly. To open it again, the user double-clicks `Moworks Studio.bat`.

## 3. Then the app takes over

Tell the user what the first start shows; they do it in the app, not you:

1. **Choose a look**: The Desk (dark) or The Studio (light table). Settings › General changes it later.
2. **Set up Moworks Studio**: the folder that stores the projects, then **Install**, which gets every component in one go: HyperFrames
   0.8.214 and its Chrome (about 550 MB), the Python components (up to 160 MB) and the speech-to-text model (about 1.7 GB with its
   engine); FFmpeg and Python 3.12 too when they are missing (with winget, for this user). Fonts, the library, HyperFrames' skills and the film-style sources come with the repository. On an NVIDIA graphics card,
   Settings › System offers Whisper on the card (about 1.3 GB, optional).
3. **Sign in to Claude** in the app (it runs `claude auth login` and opens the browser).

Settings › System shows the same components line later (Install again if something is missing).

## Updating and removing

- Update: Settings › Update in the app (it pulls, installs packages, rebuilds the interface and restarts). By hand instead: close the
  app, then in the app folder `git pull`, `npm install`, `npm run build`, and start `Moworks Studio.bat`.
- Remove: close the app (Exit, top right), then delete the app folder. The work folder next to it holds the user's projects and the
  downloaded components: ask before deleting it.

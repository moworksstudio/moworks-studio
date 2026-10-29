"""Moworks Studio environment for the AE port: what the kit's common.py / render/browser.py / audio/loudness.py gave port.py, from the app
instead (no import from the kit). Set by the Node side (packages/ae-export/index.mjs) through environment variables:

  MW_CHROMIUM      the pinned Chromium (config/pins.json; the same browser HF renders with)
  MW_FFMPEG_DIR    the pinned FFmpeg bin folder
  MW_AE_WORK       work root (default <app>/runtime/work/ae): never on Google Drive (Drive locks files while it syncs)
  MW_FONTS_DIR     the app's bundled fonts (runtime/fonts/bundled, from google/fonts; config/fonts.json), named in the port report for
                   fonts AE lacks
"""
import os, shutil, sys
from pathlib import Path

for _s in (sys.stdout, sys.stderr):                    # Windows consoles default to cp1252: Vietnamese text must not crash print
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
_libs = os.environ.get("MW_PYLIBS")                    # the app's own component folder (runtime/python-libs), first on the path
if _libs and os.path.isdir(_libs): sys.path.insert(0, _libs)

HERE = Path(__file__).resolve().parent
APP = HERE.parents[2]
WORK = Path(os.environ.get("MW_AE_WORK") or APP / "runtime" / "work" / "ae")
FONTS_DIR = Path(os.environ["MW_FONTS_DIR"]) if os.environ.get("MW_FONTS_DIR") else None


def bundled_font(stem):
    """The bundled font file with this name (any subfolder), or None."""
    if not FONTS_DIR or not FONTS_DIR.exists(): return None
    return next(iter(sorted(FONTS_DIR.rglob(stem + ".ttf"))), None)
OUT = {"dir": None}                                    # where the finished .aep, footage and audio go (set by run())

DRIVER = (HERE / "hf_driver.js").read_text(encoding="utf-8")
# one animation frame after a seek, before any screenshot (kit: a capture could show the frame painted before the seek)
PAINT = "new Promise(r => requestAnimationFrame(() => r()))"
TIMEOUT_MS = int(float(os.environ.get("MW_AE_TIMEOUT", "300")) * 1000)
# the kit port's Chromium flags (software GL, no LCD text, drawElement for canvas pictures)
LAUNCH = {"args": ["--use-gl=angle", "--use-angle=swiftshader", "--disable-gpu-compositing", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                   "--disable-lcd-text", "--enable-blink-features=CanvasDrawElement"]}


def say(*a):
    print(*a, flush=True)


def film_dir(p):
    return Path(p)


def film_name(p):
    return Path(p).resolve().name


def renders(p, kind):
    d = Path(OUT["dir"]) if OUT["dir"] else Path(p).parent / (Path(p).name + "_AE")
    d.mkdir(parents=True, exist_ok=True)
    return d


def page_timeouts(pg, ms=None):
    pg.set_default_timeout(ms or TIMEOUT_MS); pg.set_default_navigation_timeout(ms or TIMEOUT_MS)
    return pg


async def launch(pw):
    exe = os.environ.get("MW_CHROMIUM")
    if not exe or not Path(exe).is_file(): raise SystemExit(f"MW_CHROMIUM not set or missing: {exe!r} (the pinned Chromium, config/pins.json)")
    # the styles' After Effects badges (packages/style-ae) only read the layers: their size check may draw on the GPU (MW_AE_GPU=1), where a
    # heavy three.js demo (lemo hd-2d) took minutes a frame on SwiftShader; the export itself keeps SwiftShader (its check frames)
    if os.environ.get("MW_AE_GPU") == "1":
        return await pw.chromium.launch(executable_path=exe, args=[a for a in LAUNCH["args"] if "swiftshader" not in a and a != "--use-gl=angle" and a != "--disable-gpu-compositing"] + ["--use-angle=d3d11"])
    return await pw.chromium.launch(executable_path=exe, **LAUNCH)


def ffmpeg():
    d = os.environ.get("MW_FFMPEG_DIR")
    if d and (Path(d) / "ffmpeg.exe").is_file(): return str(Path(d) / "ffmpeg.exe")
    exe = shutil.which("ffmpeg")
    if exe: return exe
    raise SystemExit("ffmpeg not found (MW_FFMPEG_DIR, config/pins.json)")

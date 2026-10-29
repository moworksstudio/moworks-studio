// Magic UI warp-background (apps/www/registry/magicui/warp-background.tsx at efe76fc): a card in a CSS 3D tunnel: four grid walls
// (lines of --grid-color every --beam-size, 5 %) rotated -90° around the box in perspective 100 px (container-query units), and on each
// wall beamsPerSide (3) light beams at x = floor(i x (100 / 5) / 3) cells, width 5 %, aspect 1 / (1-10 random), linear-gradient(hsl(random
// hue 80 % 60 %), transparent), running y 100cqmax -> -100 % in beamDuration (3 s), linear, forever, after a random 0-3 s delay; the
// wrapper has padding 80 px, rounded, 1 px border. Port: the same CSS (container units kept); hues, aspects and delays seeded; beam
// positions from the film's time.
export default {
  id: "warp-background",
  kind: "motion",
  title: "Warp Background",
  sub: "Đường hầm lưới có tia sáng lao tới",
  desc: "A card sits inside a 3D tunnel of grid walls while coloured light beams race along the walls toward the viewer: a light 'warp speed' frame.",
  category: "Backgrounds",
  tags: ["warp", "tunnel", "3d", "beams", "grid", "speed", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/warp-background.tsx" },
  notes: "el is the wrapper (its child is the content, upstream's children). Upstream re-rolls a beam's hue on every render (Math.random in render): here it is fixed per beam.",
  options: { perspective: "px (100)", beamsPerSide: "3", beamSize: "% (5)", beamDelayMax: "s (3)", beamDelayMin: "s (0)", beamDuration: "s (3)", gridColor: "rgba(255,255,255,0.12)", hold: "seconds (10)", seed: "1" },
  defaults: { perspective: 100, beamsPerSide: 3, beamSize: 5, beamDelayMax: 3, beamDelayMin: 0, beamDuration: 3, gridColor: "rgba(255,255,255,0.12)", hold: 10, seed: 1 },
  uses: ["rand"],
  css: `.mw-warp-background { position: relative; border-radius: 6px; border: 1px solid var(--mw-wb-grid, rgba(255,255,255,0.12)); padding: 80px; }
.mw-warp-background > .mw-wb-3d { container-type: size; pointer-events: none; position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: hidden; clip-path: inset(0); transform-style: preserve-3d; }
.mw-wb-wall { container-type: inline-size; position: absolute; height: 100cqmax; background-size: var(--mw-wb-size) var(--mw-wb-size);
  background: linear-gradient(var(--mw-wb-grid) 0 1px, transparent 1px var(--mw-wb-size)) 50% -0.5px / var(--mw-wb-size) var(--mw-wb-size), linear-gradient(90deg, var(--mw-wb-grid) 0 1px, transparent 1px var(--mw-wb-size)) 50% 50% / var(--mw-wb-size) var(--mw-wb-size);
  transform-style: preserve-3d; }
.mw-wb-wall.top { z-index: 20; width: 100cqi; transform-origin: 50% 0%; transform: rotateX(-90deg); }
.mw-wb-wall.bottom { top: 100%; width: 100cqi; transform-origin: 50% 0%; transform: rotateX(-90deg); }
.mw-wb-wall.left { top: 0; left: 0; width: 100cqh; transform-origin: 0% 0%; transform: rotate(90deg) rotateX(-90deg); }
.mw-wb-wall.right { top: 0; right: 0; width: 100cqh; transform-origin: 100% 0%; transform: rotate(-90deg) rotateX(-90deg); }
.mw-wb-beam { position: absolute; top: 0; }
.mw-warp-background > .mw-wb-content { position: relative; }`,
  markup: `<div class="mw-warp-background"><div class="card">…</div></div>`,
  fn: function (el, tl, at, o) {
    el.style.setProperty("--mw-wb-grid", o.gridColor); el.style.setProperty("--mw-wb-size", o.beamSize + "%");
    var content = document.createElement("div"); content.className = "mw-wb-content";
    while (el.firstChild) content.appendChild(el.firstChild);
    var box = document.createElement("div"); box.className = "mw-wb-3d"; box.style.perspective = o.perspective + "px";
    el.appendChild(box); el.appendChild(content);
    var r = MW.rand(o.seed * 401), beams = [], cells = Math.floor(100 / o.beamSize), step = cells / o.beamsPerSide;
    ["top", "bottom", "left", "right"].forEach(function (side) {
      var wall = document.createElement("div"); wall.className = "mw-wb-wall " + side; box.appendChild(wall);
      for (var i = 0; i < o.beamsPerSide; i++) {
        var x = Math.floor(i * step), delay = r() * (o.beamDelayMax - o.beamDelayMin) + o.beamDelayMin, hue = Math.floor(r() * 360), ar = Math.floor(r() * 10) + 1;
        var b = document.createElement("div"); b.className = "mw-wb-beam";
        b.style.left = x * o.beamSize + "%"; b.style.width = o.beamSize + "%"; b.style.aspectRatio = "1 / " + ar; b.style.background = "linear-gradient(hsl(" + hue + " 80% 60%), transparent)";
        wall.appendChild(b); beams.push({ el: b, delay: delay });
      }
    });
    var s = { t: 0 }, D = o.beamDuration;
    var set = function () {
      for (var i = 0; i < beams.length; i++) {
        var u = s.t - beams[i].delay, f = u < 0 ? 0 : (u % D) / D;
        beams[i].el.style.transform = "translate(-50%, calc(100cqmax * " + (1 - f) + " - 100% * " + f + "))";
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 7,
    css: `.mw-warp-background { width: 1400px; height: 860px; display: flex; align-items: center; justify-content: center; }
.promo { width: 760px; padding: 54px; border-radius: 28px; background: #111114; border: 2px solid #27272a; }
.promo h3 { margin: 0 0 16px; font-size: 58px; } .promo p { margin: 0; font-size: 30px; opacity: .65; line-height: 1.4; }`,
    html: `<div class="center"><div class="mw-warp-background"><div class="promo"><h3>Tốc độ ánh sáng</h3><p>Từ ý tưởng tới video hoàn chỉnh trong vài phút, không cần dựng tay từng khung.</p></div></div></div>`,
    run: `MW.warpBackground(q(".mw-warp-background"), tl, 0, { gridColor: "rgba(255,255,255,0.14)", hold: 7 });`,
  },
};

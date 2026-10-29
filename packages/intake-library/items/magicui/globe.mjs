// Magic UI globe (apps/www/registry/magicui/globe.tsx at efe76fc): a WebGL dotted globe made with cobe 0.6.4 (Shu Ding, MIT): config
// 800 x 800 at devicePixelRatio 2, phi 0, theta 0.3, dark 0, diffuse 0.4, mapSamples 16000, mapBrightness 1.2, baseColor [1,1,1],
// markerColor [251/255, 100/255, 21/255], glowColor [1,1,1], ten city markers; it spins 0.005 rad a frame (0.3 rad/s) and fades in over
// 0.5 s; the pointer can drag it (spring). Port: cobe as shipped (assets/vendor/cobe-0.6.4.js, bundled with its dependency phenomenon,
// MIT); its own frame loop is stopped and the globe is drawn once per film frame with phi from the film's time; dragging is left out.
// mapBaseBrightness is passed as 0: Magic UI leaves it unset, cobe then sets that uniform to NaN, and the software WebGL HyperFrames
// renders with (SwiftShader) turns the whole globe black (a GPU happens to read it as 0).
import { readFileSync } from "node:fs";

export default {
  id: "globe",
  kind: "block",
  title: "Globe",
  sub: "Quả địa cầu chấm sáng xoay (WebGL)",
  desc: "An auto-rotating dotted globe with glowing location markers (WebGL, cobe): a staple for 'worldwide', fintech and SaaS shots.",
  category: "3D, camera & maps",
  tags: ["globe", "earth", "world", "map", "3d", "webgl", "markers", "magicui"],
  source: { path: "apps/www/registry/magicui/globe.tsx" },
  notes: "Needs assets/vendor/cobe-0.6.4.js in the film (it ships with the item). Markers are [lat, lon] with a size; colours are 0-1 RGB as cobe takes them. cobe's map texture is part of its MIT package.",
  thirdParty: [{ name: "cobe 0.6.4", author: "Shu Ding", licence: "MIT", link: "https://github.com/shuding/cobe", npm: "https://www.npmjs.com/package/cobe/v/0.6.4", made: "as shipped" },
    { name: "phenomenon 1.6.0", author: "Colin van Eenige", licence: "MIT", link: "https://github.com/vaneenige/phenomenon", npm: "https://www.npmjs.com/package/phenomenon/v/1.6.0", made: "as shipped" }],
  scripts: ["vendor/cobe-0.6.4.js"],
  async: "cobe's map texture",
  assets: [{ path: "vendor/cobe-0.6.4.js", data: readFileSync(new URL("./assets/cobe-0.6.4.js", import.meta.url)) }],
  options: { size: "px (600)", phi: "start angle (0)", speed: "rad/s (0.3)", theta: "0.3", dark: "0", diffuse: "0.4", mapSamples: "16000", mapBrightness: "1.2", mapBaseBrightness: "0 (passed explicitly: left unset, cobe sends NaN to its shader, which software WebGL draws black)", baseColor: "[1, 1, 1]",
    markerColor: "[251/255, 100/255, 21/255]", glowColor: "[1, 1, 1]", markers: "upstream's ten cities", fadeIn: "s (0.5)", hold: "seconds (10)" },
  defaults: { size: 600, phi: 0, speed: 0.3, theta: 0.3, dark: 0, diffuse: 0.4, mapSamples: 16000, mapBrightness: 1.2, mapBaseBrightness: 0, baseColor: [1, 1, 1], markerColor: [251 / 255, 100 / 255, 21 / 255], glowColor: [1, 1, 1],
    markers: [{ location: [14.5995, 120.9842], size: 0.03 }, { location: [19.076, 72.8777], size: 0.1 }, { location: [23.8103, 90.4125], size: 0.05 }, { location: [30.0444, 31.2357], size: 0.07 },
      { location: [39.9042, 116.4074], size: 0.08 }, { location: [-23.5505, -46.6333], size: 0.1 }, { location: [19.4326, -99.1332], size: 0.1 }, { location: [40.7128, -74.006], size: 0.1 },
      { location: [34.6937, 135.5022], size: 0.05 }, { location: [41.0082, 28.9784], size: 0.06 }], fadeIn: 0.5, hold: 10 },
  css: `.mw-globe { position: relative; aspect-ratio: 1; }
.mw-globe > canvas { width: 100%; height: 100%; contain: layout paint size; opacity: 0; }`,
  markup: `<div class="mw-globe" style="width:600px"></div>`,
  fn: function (el, tl, at, o) {
    var canvas = document.createElement("canvas"); el.appendChild(canvas);
    var state = { phi: o.phi };
    // cobe decodes its map texture from a data: image asynchronously: catch that image so the film waits for it (MW.pending)
    var Real = window.Image, caught = [];
    window.Image = function () { var img = new Real(); caught.push(img); return img; };
    var globe;
    try { globe = window.createGlobe(canvas, { devicePixelRatio: 2, width: o.size * 2, height: o.size * 2, phi: o.phi, theta: o.theta, dark: o.dark, diffuse: o.diffuse,
      mapSamples: o.mapSamples, mapBrightness: o.mapBrightness, mapBaseBrightness: o.mapBaseBrightness, baseColor: o.baseColor, markerColor: o.markerColor, glowColor: o.glowColor, markers: o.markers,
      context: { preserveDrawingBuffer: true }, onRender: function (st) { st.phi = state.phi; st.width = o.size * 2; st.height = o.size * 2; } }); }
    finally { window.Image = Real; }
    globe.toggle(false);                                    // no frame loop of its own: the film draws it
    var s = { t: 0 };
    var draw = function () {
      state.phi = o.phi + o.speed * s.t;
      canvas.style.opacity = Math.min(1, Math.max(0, s.t / o.fadeIn));
      globe.render(); globe.render();                        // cobe applies the state after a draw: the second draw shows it
    };
    draw();
    MW.pending = MW.pending || [];
    caught.forEach(function (img) {
      MW.pending.push(img.complete ? Promise.resolve() : new Promise(function (ok) { img.addEventListener("load", ok); img.addEventListener("error", ok); }).then(draw));
    });
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.wrap { position: relative; width: 1700px; height: 900px; display: flex; align-items: center; }
.copy { width: 760px; } .copy .h1 { text-align: left; font-size: 110px; } .copy .p { text-align: left; }
.mw-globe { position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 820px; }`,
    html: `<div class="center"><div class="wrap"><div class="copy"><div class="h1">Toàn cầu</div><div class="p">Khách hàng ở hơn 40 quốc gia tin dùng Moworks Studio.</div></div><div class="mw-globe"></div></div></div>`,
    run: `MW.globe(q(".mw-globe"), tl, 0, { size: 820, hold: 8 });`,
  },
};

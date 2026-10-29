// Magic UI video-text (apps/www/registry/magicui/video-text.tsx at efe76fc): large text used as a mask over a playing video: the holder
// gets mask-image = an SVG data URL with a <text> (font-size 20vw, bold, sans-serif, text-anchor middle, dominant-baseline middle),
// mask-size contain, centred, no repeat; inside, an autoplaying muted looping <video> with object-fit cover. Port: the same mask over the
// film's own <video> clip (HyperFrames seeks it frame by frame); the size is in px of the holder. The demo footage is drawn with FFmpeg's
// "gradients" source here (upstream's remote ocean clip is not taken).
export default {
  id: "video-text",
  kind: "motion",
  title: "Video Text",
  sub: "Video chạy bên trong nét chữ",
  desc: "Big text used as a window onto a video: the footage plays only inside the letters (bold, centred, fitted to the box).",
  category: "Text & titles",
  tags: ["video", "mask", "knockout", "title", "footage", "magicui"],
  source: { path: "apps/www/registry/magicui/video-text.tsx" },
  notes: "The <video> is a normal HyperFrames clip (class clip, data-start, data-duration, muted) inside an untimed holder. The mask is drawn with the font named in `font`, so give the film a font with Vietnamese letters.",
  options: { text: "the word (the holder's data-text)", fontSize: "px (fits the box: 0.8 x height)", fontWeight: "bold", font: "sans-serif family (Inter)" },
  defaults: { text: null, fontSize: null, fontWeight: "bold", font: "Inter, sans-serif" },
  css: `.mw-video-text { position: relative; overflow: hidden; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center; mask-position: center; }
.mw-video-text > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }`,
  markup: `<div class="mw-video-text" data-text="BIỂN" style="width:1600px;height:400px"><video id="vt-clip" class="clip" src="assets/clip.mp4" muted playsinline data-start="0" data-duration="6" data-track-index="1"></video></div>`,
  fn: function (el, tl, at, o) {
    var W = el.offsetWidth, H = el.offsetHeight, text = o.text || el.getAttribute("data-text") || "VIDEO", fs = o.fontSize || Math.round(H * 0.8);
    var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><text x="50%" y="50%" font-size="' + fs + 'px" font-weight="' + o.fontWeight +
      '" text-anchor="middle" dominant-baseline="middle" font-family="' + esc(o.font) + '">' + esc(text) + "</text></svg>";
    var url = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    el.style.webkitMaskImage = url; el.style.maskImage = url;
    return at;
  },
  assets: [{ path: "clip.mp4", ffmpeg: ["-f", "lavfi", "-i", "gradients=s=1280x720:c0=0x0369a1:c1=0x22d3ee:c2=0x14b8a6:c3=0x1e3a8a:n=4:speed=0.03:d=6:r=24:seed=7",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "veryfast", "-an"] }],
  demo: {
    duration: 6,
    css: `.cap { position: absolute; left: 0; right: 0; bottom: 170px; text-align: center; font-size: 40px; opacity: .55; }`,
    html: `<div class="center"><div class="mw-video-text" data-text="ĐẠI DƯƠNG" style="width:1700px;height:420px"><video id="vt-clip" class="clip" src="assets/clip.mp4" muted playsinline data-start="0" data-duration="6" data-track-index="1"></video></div></div>
<div class="cap">Chữ là cửa sổ nhìn vào video</div>`,
    run: `MW.videoText(q(".mw-video-text"), tl, 0, { fontSize: 300, fontWeight: 900 });`,
  },
};

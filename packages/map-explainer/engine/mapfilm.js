/* The Map Explainer style's engine: one continuous camera over the real ground (EOX's Sentinel-2 mosaics, or drawn in code with none) and a paper map, red marker on top, paper props in HTML.
   Generalised from the Test 33 film. Every frame is a function of film time only (hf-seek). World units: web mercator, 256 = the globe, 2^Z px per
   unit. A film supplies its story through MAPFILM.film({...}) in lib/film.js and one composition per shot; the rules are in the style's pack. */
(function () {
  'use strict';
  var W = 1920, H = 1080, TAU = Math.PI * 2;

  // --- the words of the voice (assets/_app/map/words.js, written by the app from transcript.json), so every move is keyed to a word ---
  var WORDS = (window.MAP_WORDS || []).map(function (w) { return { key: norm(w.text), start: +w.start, end: +w.end }; });
  function norm(s) { return String(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, ''); }
  function find(word, nth) {
    var k = norm(word), n = nth || 1;
    for (var i = 0; i < WORDS.length; i++) if (WORDS[i].key === k && --n === 0) return WORDS[i];
    console.warn('map film: no word "' + word + '" (occurrence ' + (nth || 1) + ') in the voice');
    return null;
  }
  /** The start of the nth occurrence of a word (the film's seconds). */
  function Wd(word, nth) { var w = find(word, nth); return w ? w.start : 0; }
  /** The end of the nth occurrence of a word. */
  function We(word, nth) { var w = find(word, nth); return w ? w.end : 0; }

  // --- seeded noise ---
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var G = new Float32Array(65536);
  function seedNoise(seed) { var R = rng(seed); for (var i = 0; i < 65536; i++) G[i] = R(); }
  seedNoise(2060);
  function vn(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy),
      x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) << 8, y1 = ((yi + 1) & 255) << 8, a = G[x0 | y0], b = G[x1 | y0], c = G[x0 | y1], d = G[x1 | y1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function S(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function quart(p) { p = clamp01(p); return p < .5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2; }
  function sineIO(p) { p = clamp01(p); return .5 - .5 * Math.cos(Math.PI * p); }
  function p2IO(p) { p = clamp01(p); return p < .5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p); }
  function p2In(p) { p = clamp01(p); return p * p; }

  var FILM = null, ROT = 0;          // ROT: the longitude at the middle of the map, so the story's region never meets the antimeridian cut
  function wrapLon(lon) { var d = (lon - ROT + 540) % 360; return (d < 0 ? d + 360 : d) - 180; }
  function worldX(lon) { return (wrapLon(lon) + 180) / 360 * 256; }
  function worldY(lat) { var p = lat * Math.PI / 180; return (1 - Math.log(Math.tan(Math.PI / 4 + p / 2)) / Math.PI) / 2 * 256; }
  function lonOf(x) { var l = x / 256 * 360 - 180 + ROT; return l > 180 ? l - 360 : l < -180 ? l + 360 : l; }
  function latOf(y) { return (2 * Math.atan(Math.exp((1 - y / 128) * Math.PI)) - Math.PI / 2) * 180 / Math.PI; }

  // --- the one camera: each key moves to (lon, lat, z) between two film seconds. kind: 'move' (quartic, a real zoom), 'hold' (pans and pushes
  //     a little, some speed from its first frame), 'open' (the first dolly in, settling) ---
  var START = null, KEYS = [], SHAKES = [], END_SHIFT = null;
  function holdEase(p) { return .35 * sineIO(p) + .65 * clamp01(p); }
  function easeOf(kind, p) { return kind === 'move' ? quart(p) : kind === 'open' ? .7 * (1 - (1 - p) * (1 - p)) + .3 * p : holdEase(p); }
  function camAt(t) {
    var a = START, k = KEYS[KEYS.length - 1], i;
    for (i = 0; i < KEYS.length; i++) { if (t < KEYS[i].to || i === KEYS.length - 1) { k = KEYS[i]; break; } a = [KEYS[i].lon, KEYS[i].lat, KEYS[i].z]; }
    var p = clamp01((t - k.from) / (k.to - k.from)), e = easeOf(k.kind, p),
      x0 = worldX(a[0]), y0 = worldY(a[1]), x1 = worldX(k.lon), y1 = worldY(k.lat), z = a[2] + (k.z - a[2]) * e, s = Math.pow(2, z), m = e;
    // A real zoom keeps its fixed point still on screen, so the centre moves with 1/s.
    if (Math.abs(k.z - a[2]) > .02) { var s0 = Math.pow(2, a[2]), s1 = Math.pow(2, k.z); m = (1 / s - 1 / s0) / (1 / s1 - 1 / s0); }
    var xc = x0 + (x1 - x0) * m, yc = y0 + (y1 - y0) * m;
    if (END_SHIFT && t >= END_SHIFT.at) xc = worldX(END_SHIFT.fromLon) + (worldX(END_SHIFT.lon) - worldX(END_SHIFT.fromLon)) * quart((t - END_SHIFT.at) / END_SHIFT.dur);
    return { xc: xc, yc: yc, z: z, s: s };
  }
  // Props lying on the map ride the hold's pan and are at their placed spot when it ends; the last key (the end card) has none.
  function rideAt(t, cam) {
    var i = 0; while (i < KEYS.length - 1 && t >= KEYS[i].to) i++;
    if (i === KEYS.length - 1) return { x: 0, y: 0 };
    var k = KEYS[i];
    if (k.kind !== 'move') return { x: (worldX(k.lon) - cam.xc) * cam.s, y: (worldY(k.lat) - cam.yc) * cam.s };
    var n = KEYS[i + 1], e = quart((t - k.from) / (k.to - k.from)), s1 = Math.pow(2, k.z);
    return { x: (worldX(n.lon) - worldX(k.lon)) * s1 * e, y: (worldY(n.lat) - worldY(k.lat)) * s1 * e };
  }
  function P(cam, lon, lat) { return [960 + (worldX(lon) - cam.xc) * cam.s, 540 + (worldY(lat) - cam.yc) * cam.s]; }
  function hand(t) {
    var x = 2 * (.5 * Math.sin(TAU * t / 2.9) + .3 * Math.sin(TAU * t / 4.3 + 1) + .2 * Math.sin(TAU * t / 6.7 + 2)),
      y = 2 * (.5 * Math.sin(TAU * t / 4.3 + 2.1) + .3 * Math.sin(TAU * t / 2.9 + .4) + .2 * Math.sin(TAU * t / 6.7 + 4)),
      r = .06 * (.6 * Math.sin(TAU * t / 6.7 + .7) + .4 * Math.sin(TAU * t / 2.9 + 3)) * Math.PI / 180;
    for (var i = 0; i < SHAKES.length; i++) { var d = t - SHAKES[i]; if (d >= 0 && d < 1) { var amp = 16 * Math.exp(-d * 8); x += amp * Math.sin(TAU * 11 * d + 1.2); y += amp * Math.cos(TAU * 14 * d); } }
    return { x: x, y: y, r: r };
  }

  // --- what the camera shows: the world box of each key's view, so a film only names its places ---
  function viewBox(lon, lat, z, margin) { var s = Math.pow(2, z), hw = (960 + margin) / s, hh = (540 + margin) / s, x = worldX(lon), y = worldY(lat); return [x - hw, y - hh, x + hw, y + hh]; }
  function unite(a, b) { return a ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : b.slice(); }
  function keysBox(test, margin) {
    var box = null;
    if (test(START[2])) box = unite(box, viewBox(START[0], START[1], START[2], margin));
    KEYS.forEach(function (k) { if (test(k.z)) box = unite(box, viewBox(k.lon, k.lat, k.z, margin)); });
    return box;
  }
  var MAX_SIDE = 4096;
  function layerAt(box, z) {
    var sc = Math.pow(2, z), w = (box[2] - box[0]) * sc, h = (box[3] - box[1]) * sc, big = Math.max(w, h);
    if (big > MAX_SIDE) { sc *= MAX_SIDE / big; w = (box[2] - box[0]) * sc; h = (box[3] - box[1]) * sc; }
    return { x0: box[0], y0: box[1], sc: sc, w: Math.ceil(w), h: Math.ceil(h) };
  }

  // --- map data: world-atlas 2.0.2 countries ---
  var GEO = { ready: false }, PALETTE = ['#E6C1A7', '#EEDAA4', '#D2DEB8', '#DCCFB2'];
  function decodeAtlas(topo, box) {
    var sc = topo.transform.scale, tr = topo.transform.translate, arcs = topo.arcs.map(function (a) {
      var x = 0, y = 0; return a.map(function (d) { x += d[0]; y += d[1]; return [x * sc[0] + tr[0], y * sc[1] + tr[1]]; });
    });
    var use = new Int32Array(arcs.length), owner = new Int32Array(arcs.length).fill(-1), geoms = topo.objects.countries.geometries, shapes = [], near = {};
    var pad = 24, X0 = box[0] - pad, Y0 = box[1] - pad, X1 = box[2] + pad, Y1 = box[3] + pad;
    function idx(i) { return i < 0 ? ~i : i; }
    function ringPts(r) { var out = []; r.forEach(function (i) { var a = arcs[idx(i)]; if (i < 0) a = a.slice().reverse(); for (var k = out.length ? 1 : 0; k < a.length; k++) out.push(a[k]); }); return out; }
    geoms.forEach(function (g, gi) {
      var polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
      var path = new Path2D(), any = false, name = g.properties && g.properties.name || '';
      polys.forEach(function (poly) { poly.forEach(function (r) {
        r.forEach(function (i) { var a = idx(i); use[a]++; if (owner[a] >= 0 && owner[a] !== gi) { (near[gi] = near[gi] || {})[owner[a]] = 1; (near[owner[a]] = near[owner[a]] || {})[gi] = 1; } owner[a] = gi; });
        // A polygon that reaches the pole, or wraps the map once turned, would paint land over the whole sea.
        if (name === 'Antarctica') return;
        var pts = ringPts(r), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        pts.forEach(function (p) { var x = worldX(p[0]), y = worldY(p[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
        if (x1 - x0 > 128 || x1 < X0 || x0 > X1 || y1 < Y0 || y0 > Y1) return;
        pts.forEach(function (p, i) { var x = worldX(p[0]), y = worldY(p[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); });
        path.closePath(); any = true;
      }); });
      if (any) shapes.push({ name: name, path: path, gi: gi });
    });
    var coast = new Path2D(), border = new Path2D();
    arcs.forEach(function (a, i) {
      var m = a[Math.floor(a.length / 2)], mx = worldX(m[0]), my = worldY(m[1]); if (mx < X0 || mx > X1 || my < Y0 || my > Y1) return;
      if (Math.abs(worldX(a[0][0]) - worldX(a[a.length - 1][0])) > 64) return;
      var path = use[i] > 1 ? border : coast, px = null;
      a.forEach(function (p, k) { var x = worldX(p[0]), y = worldY(p[1]); if (k && Math.abs(x - px) < 64) path.lineTo(x, y); else path.moveTo(x, y); px = x; });
    });
    // Neighbours never share a pastel; a colour the film names wins for that country.
    var given = FILM.colors || {}, colorOf = {};
    shapes.forEach(function (s) {
      if (given[s.name]) { colorOf[s.gi] = given[s.name]; return; }
      var taken = {}, n = near[s.gi] || {}; Object.keys(n).forEach(function (o) { if (colorOf[o]) taken[colorOf[o]] = 1; });
      var h = 0; for (var i = 0; i < s.name.length; i++) h = (h * 31 + s.name.charCodeAt(i)) | 0; h = Math.abs(h);
      for (var c = 0; c < 4; c++) { var col = PALETTE[(h + c) % (c < 3 ? 3 : 4)]; if (!taken[col]) { colorOf[s.gi] = col; return; } }
      colorOf[s.gi] = PALETTE[h % 3];
    });
    var land = new Path2D(), byName = {};
    shapes.forEach(function (s) { land.addPath(s.path); s.color = colorOf[s.gi]; byName[s.name] = s.path; });
    GEO.shapes = shapes; GEO.coast = coast; GEO.border = border; GEO.land = land; GEO.byName = byName;
  }
  // --- lakes: Natural Earth's polygons (the atlas's countries run across them), one path; an island's ring is a hole, so they fill even-odd ---
  function decodeLakes(data, box) {
    var path = new Path2D(), pad = 24;
    (data.lakes || []).forEach(function (lake) { lake.rings.forEach(function (r) {
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      r.forEach(function (p) { var x = worldX(p[0]), y = worldY(p[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      if (x1 - x0 > 128 || x1 < box[0] - pad || x0 > box[2] + pad || y1 < box[1] - pad || y0 > box[3] + pad) return;
      r.forEach(function (p, i) { var x = worldX(p[0]), y = worldY(p[1]); if (i) path.lineTo(x, y); else path.moveTo(x, y); });
      path.closePath();
    }); });
    GEO.lakes = path;
  }
  function newCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // --- paper map, drawn once at a level and laid out by the camera ---
  function buildPaper(box, z) {
    var L = layerAt(box, z), cv = L.cv = newCanvas(L.w, L.h), c = cv.getContext('2d'), sc = L.sc;
    c.fillStyle = '#A9C2C4'; c.fillRect(0, 0, L.w, L.h);
    c.setTransform(sc, 0, 0, sc, -L.x0 * sc, -L.y0 * sc); c.lineJoin = 'round'; c.lineCap = 'round';
    [[30, .16], [19, .2], [10, .26]].forEach(function (s) { c.strokeStyle = 'rgba(58,98,108,' + s[1] + ')'; c.lineWidth = s[0] / sc; c.stroke(GEO.coast); });
    c.fillStyle = '#ECE2CA'; c.fill(GEO.land);
    GEO.shapes.forEach(function (s) { c.fillStyle = s.color; c.fill(s.path); });
    if (GEO.lakes) { c.fillStyle = '#A9C2C4'; c.fill(GEO.lakes, 'evenodd'); }
    c.strokeStyle = '#7A5A3C'; c.lineWidth = 1.6 / sc; c.setLineDash([7 / sc, 6 / sc]); c.stroke(GEO.border); c.setLineDash([]);
    c.strokeStyle = 'rgba(90,70,50,.26)'; c.lineWidth = 1 / sc; c.beginPath();
    var X0 = box[0], X1 = box[2], Y0 = box[1], Y1 = box[3], l0 = Math.floor((X0 / 256 * 360 - 180) / 10) * 10, l1 = (X1 / 256 * 360 - 180);
    for (var d = l0; d <= l1; d += 10) { var x = (d + 180) / 360 * 256; c.moveTo(x, Y0); c.lineTo(x, Y1); }
    for (var lat = -80; lat <= 80; lat += 10) { var y = worldY(lat); if (y < Y0 || y > Y1) continue; c.moveTo(X0, y); c.lineTo(X1, y); }
    c.stroke();
    c.strokeStyle = '#4A3424'; c.lineWidth = 1.25 / sc; c.stroke(GEO.coast);
    if (GEO.lakes) { c.lineWidth = .9 / sc; c.stroke(GEO.lakes); }
    return L;
  }

  // --- the drawn ground: a function of the world, so every level shows the same place. The colours and the light are the Test 33 film's, as its owner
  //     accepted them; a biome changes only the colours. Its first sketch swirled like wood grain: only a small warp here, so nothing swirls. ---
  var BIOME = {
    desert:    { low: [204, 176, 134], mid: [152, 116, 84], high: [78, 60, 48], flow: [226, 208, 172] },
    savanna:   { low: [178, 160, 106], mid: [134, 122, 76], high: [78, 68, 50], flow: [204, 192, 146] },
    temperate: { low: [122, 138, 86], mid: [86, 106, 66], high: [92, 92, 74], flow: [70, 92, 72] },
    tropic:    { low: [78, 116, 62], mid: [48, 90, 50], high: [44, 66, 44], flow: [64, 96, 74] },
    tundra:    { low: [140, 132, 108], mid: [112, 106, 88], high: [214, 216, 216], flow: [176, 184, 184] },
    ice:       { low: [226, 232, 236], mid: [204, 214, 224], high: [176, 190, 206], flow: [190, 208, 224] },
  };
  function buildGround(box, z, oct, opts) {
    opts = opts || {};
    var B = BIOME[(FILM.ground && FILM.ground.biome) || 'desert'] || BIOME.desert;
    var L = layerAt(box, z), w = L.w, h = L.h, sc = L.sc, cv = L.cv = newCanvas(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h), d = img.data;
    var mk = newCanvas(w, h), mc = mk.getContext('2d', { willReadFrequently: true }); mc.setTransform(sc, 0, 0, sc, -L.x0 * sc, -L.y0 * sc); mc.fillStyle = '#fff'; mc.fill(GEO.land);
    if (GEO.lakes) { mc.globalCompositeOperation = 'destination-out'; mc.fill(GEO.lakes, 'evenodd'); mc.globalCompositeOperation = 'source-over'; }
    var m1 = newCanvas(w, h), m1c = m1.getContext('2d', { willReadFrequently: true }); m1c.filter = 'blur(1.5px)'; m1c.drawImage(mk, 0, 0); var M = m1c.getImageData(0, 0, w, h).data;
    var m2 = newCanvas(w, h), m2c = m2.getContext('2d', { willReadFrequently: true }); m2c.filter = 'blur(' + Math.max(4, .05 * sc).toFixed(1) + 'px)'; m2c.drawImage(mk, 0, 0); var Bl = m2c.getImageData(0, 0, w, h).data;
    // what changes slowly is read on a coarse grid
    var step = 8, cw = Math.ceil(w / step) + 2, ch = Math.ceil(h / step) + 2, A = new Float32Array(cw * ch), Bb = new Float32Array(cw * ch), Rg = new Float32Array(cw * ch), Tn = new Float32Array(cw * ch);
    var gx, gy, wx, wy, k;
    for (gy = 0; gy < ch; gy++) for (gx = 0; gx < cw; gx++) {
      wx = L.x0 + gx * step / sc; wy = L.y0 + gy * step / sc; k = gy * cw + gx;
      A[k] = vn(wx * 1.7 + 11, wy * 1.7 + 3) - .5; Bb[k] = vn(wx * 1.7 + 31, wy * 1.7 + 47) - .5;
      Rg[k] = vn(wx * .9 + 5, wy * .9 + 9); Tn[k] = vn(wx * 1.3 + 90, wy * 1.3 + 40) - .5;
    }
    var hh = new Float32Array(w * h), edge = opts.feather || 0, coastK = .02 * sc;
    for (var y = 0; y < h; y++) {
      var iy = y >> 3, fy = (y & 7) / 8;
      wy = L.y0 + y / sc;
      for (var x = 0; x < w; x++) {
        var ix = x >> 3, fx = (x & 7) / 8, k0 = iy * cw + ix, k1 = k0 + 1, k2 = k0 + cw, k3 = k2 + 1, w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        var a = A[k0] * w00 + A[k1] * w10 + A[k2] * w01 + A[k3] * w11, b = Bb[k0] * w00 + Bb[k1] * w10 + Bb[k2] * w01 + Bb[k3] * w11,
          region = Rg[k0] * w00 + Rg[k1] * w10 + Rg[k2] * w01 + Rg[k3] * w11, tone = Tn[k0] * w00 + Tn[k1] * w10 + Tn[k2] * w01 + Tn[k3] * w11;
        wx = L.x0 + x / sc;
        var j = (y * w + x) * 4, alpha = 255, landA = 1;
        var sx = x + Math.round(a * coastK * 2), sy = y + Math.round(b * coastK * 2), bn = Bl[(y * w + x) * 4 + 3];
        // Near the shore the coast breaks up finely, so the data does not read as straight lines.
        if (bn > 4 && bn < 250) { sx += Math.round(((vn(wx * 30 + 3, wy * 30 + 7) - .5) * .05 + (vn(wx * 90 + 9, wy * 90 + 1) - .5) * .018) * sc); sy += Math.round(((vn(wx * 30 + 21, wy * 30 + 13) - .5) * .05 + (vn(wx * 90 + 5, wy * 90 + 27) - .5) * .018) * sc); }
        sx = sx < 0 ? 0 : sx >= w ? w - 1 : sx; sy = sy < 0 ? 0 : sy >= h ? h - 1 : sy;
        var mv = M[(sy * w + sx) * 4 + 3] / 255; landA = S(.4, .6, mv);
        if (landA <= 0) { var bv = Bl[(y * w + x) * 4 + 3] / 255, halo = S(.02, .5, bv) * .8; d[j] = 42; d[j + 1] = 98; d[j + 2] = 116; d[j + 3] = halo * 255; hh[y * w + x] = -1; continue; }
        // Ridged noise, turned at every octave so no grid shows; only a small warp, so nothing swirls.
        var u = wx + a * .22, v = wy + b * .22, f = 5, amp = .5, sum = 0, ru = u, rv = v;
        for (var o = 0; o < oct; o++) { var n = vn(ru * f + o * 17 + sum * 1.7, rv * f + o * 31 - sum * 1.3), q = 1 - Math.abs(2 * n - 1); sum += (o < 2 ? n * .8 : q * q) * amp; f *= 2.03; amp *= .56; var tu = ru * .8 - rv * .6; rv = ru * .6 + rv * .8; ru = tu; }
        var hills = S(.36, .62, region), hgt = sum * (.2 + 1.05 * hills);
        // Dry channels follow the terrain's own roughness, so they meander and break.
        var kk = (sum - .5) * .55, w1 = Math.abs(vn(u * 4 + kk + 70, v * 4 + kk + 20) - .5), wadi = (1 - S(0, .014, w1)) * (1 - S(.28, .5, hgt)) * S(.4, .55, vn(u * 2.3 + 44, v * 2.3 + 12));
        var e1 = S(.14, .34, hgt), e2 = S(.34, .6, hgt), cr = B.low[0] + (B.mid[0] - B.low[0]) * e1, cg = B.low[1] + (B.mid[1] - B.low[1]) * e1, cb = B.low[2] + (B.mid[2] - B.low[2]) * e1;
        cr += (B.high[0] - cr) * e2; cg += (B.high[1] - cg) * e2; cb += (B.high[2] - cb) * e2; cr += tone * 30; cg += tone * 14; cb -= tone * 6;
        cr += (B.flow[0] - cr) * wadi * .6; cg += (B.flow[1] - cg) * wadi * .6; cb += (B.flow[2] - cb) * wadi * .6;
        if (edge) { var eg = Math.min(x, y, w - 1 - x, h - 1 - y) / edge; alpha = 255 * (eg < 0 ? 0 : eg > 1 ? 1 : eg); }
        d[j] = cr; d[j + 1] = cg; d[j + 2] = cb; d[j + 3] = alpha * landA; hh[y * w + x] = hgt;
      }
    }
    // Light from the north-west.
    var K = Math.max(1, Math.round(.002 * sc)), str = 2.6 * (.002 * sc) / K;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var i = y * w + x; if (hh[i] < 0) continue;
      var i0 = (y >= K && x >= K) ? i - K * w - K : i, i1 = (y < h - K && x < w - K) ? i + K * w + K : i, h0 = hh[i0] < 0 ? hh[i] : hh[i0], h1 = hh[i1] < 0 ? hh[i] : hh[i1],
        mult = 1 - Math.max(-.42, Math.min(.5, (h0 - h1) * str)); j = i * 4;
      d[j] *= mult; d[j + 1] *= mult; d[j + 2] *= mult;
    }
    c.putImageData(img, 0, 0);
    return L;
  }
  // --- real imagery (Sentinel-2 cloudless 2016 by EOX, fetched once by the app's map_imagery tool into assets/_app/map/imagery): the land is cut out of each mosaic and laid over
  //     the drawn sea. The atlas says where land surely is and surely is not; in the band between, land is what is redder than blue, so the real coast stands. ---
  function loadImage(src) { return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { no(new Error('no picture ' + src)); }; i.src = src; }); }
  function buildImagery(lv, base) {
    var L = { x0: lv.x0, y0: lv.y0, sc: lv.sc, w: lv.w, h: lv.h, z: lv.z }, w = L.w, h = L.h, sc = L.sc, feather = lv.feather || 0;
    return Promise.all(lv.pieces.map(function (p) { return loadImage(base + 'imagery/' + p.file); })).then(function (imgs) {
      var cv = L.cv = newCanvas(w, h), c = cv.getContext('2d', { willReadFrequently: true });
      imgs.forEach(function (im, i) { var p = lv.pieces[i]; c.drawImage(im, p.x, 0, p.w, h); });
      var img = c.getImageData(0, 0, w, h), d = img.data;
      var sm = newCanvas(w, h), sc2 = sm.getContext('2d', { willReadFrequently: true }); sc2.filter = 'blur(1.5px)'; sc2.drawImage(cv, 0, 0); var B = sc2.getImageData(0, 0, w, h).data;
      // The land mask runs past the mosaic: blurred at the mosaic's own edge it fades as if the coast were there, and the mosaic's rectangle shows in teal on a fast move.
      var blur = Math.max(4, .05 * sc), pad = Math.ceil(blur * 3);
      var mk = newCanvas(w + 2 * pad, h + 2 * pad), mc = mk.getContext('2d'); mc.setTransform(sc, 0, 0, sc, pad - L.x0 * sc, pad - L.y0 * sc); mc.fillStyle = '#fff'; mc.fill(GEO.land);
      var m2 = newCanvas(w + 2 * pad, h + 2 * pad), m2c = m2.getContext('2d', { willReadFrequently: true }); m2c.filter = 'blur(' + blur.toFixed(1) + 'px)'; m2c.drawImage(mk, 0, 0); var Bl = m2c.getImageData(pad, pad, w, h).data;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var j = (y * w + x) * 4, near = Bl[j + 3] / 255, red = B[j] - B[j + 2];
        var land = near > .94 ? 1 : near < .03 ? 0 : S(3, 7, red);
        if (land <= 0) { d[j] = 42; d[j + 1] = 98; d[j + 2] = 116; d[j + 3] = S(.02, .5, near) * .8 * 255; continue; }
        // The mosaic's bright sand burns out: bring it down and take a little of its yellow, under the paper it reads as print.
        var r = d[j], g = d[j + 1], b = d[j + 2], lum = .3 * r + .59 * g + .11 * b, k = lum > 150 ? 1 - (lum - 150) / 105 * .24 : 1;
        r = (r + (lum - r) * .14) * k * .98; g = (g + (lum - g) * .14) * k * .94; b = (b + (lum - b) * .14) * k * .92;
        var eg = feather ? Math.min(x, y, w - 1 - x, h - 1 - y) / feather : 1;
        d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255 * land * (eg < 0 ? 0 : eg > 1 ? 1 : eg);
      }
      c.putImageData(img, 0, 0);
      return L;
    });
  }
  function drawLayer(c, L, cam) {
    // Clip the source to the view, so a big level costs only what shows.
    var s = cam.s, k = s / L.sc, ox = 960 + (L.x0 - cam.xc) * s, oy = 540 + (L.y0 - cam.yc) * s, pad = 40;
    var dx0 = Math.max(-pad, ox), dy0 = Math.max(-pad, oy), dx1 = Math.min(W + pad, ox + L.w * k), dy1 = Math.min(H + pad, oy + L.h * k);
    if (dx1 <= dx0 || dy1 <= dy0) return;
    c.drawImage(L.cv, (dx0 - ox) / k, (dy0 - oy) / k, (dx1 - dx0) / k, (dy1 - dy0) / k, dx0, dy0, dx1 - dx0, dy1 - dy0);
  }

  // Paper up to Z 9.3, the drawn ground from Z 7.3, finer levels fading in as the camera gets close.
  function satAmount(z) { return S(7.3, 9.3, z); }
  function seaFill(c) { var g = c.createRadialGradient(960, 540, 0, 960, 540, 1180); g.addColorStop(0, '#14304A'); g.addColorStop(1, '#0B1E31'); return g; }
  function drawSample(c, cam) {
    var sat = satAmount(cam.z);
    c.globalAlpha = 1;
    if (sat < 1) {
      c.fillStyle = '#A9C2C4'; c.fillRect(-40, -40, W + 80, H + 80); c.imageSmoothingQuality = 'high';
      for (var p = 0; p < GEO.paper.length; p++) if (p === 0 || cam.z >= GEO.paper[p].fromZ) drawLayer(c, GEO.paper[p], cam);
    }
    if (sat > 0) {
      c.globalAlpha = sat; c.fillStyle = seaFill(c); c.fillRect(-40, -40, W + 80, H + 80);
      GEO.ground.forEach(function (L, i) { var am = i === 0 ? 1 : S(L.z - 1.1, L.z - .7, cam.z); if (am > 0) { c.globalAlpha = sat * am; drawLayer(c, L, cam); } });
      c.globalAlpha = 1;
    }
  }
  var buf = null;
  function blurSamples(t) {
    var a = camAt(t), b = camAt(t - 1 / 60), dz = Math.abs(a.z - b.z), dc = Math.hypot(a.xc - b.xc, a.yc - b.yc) * a.s, disp = dz * Math.LN2 * 1100 + dc;
    if (disp < .6) return 1;
    return Math.max(8, Math.min(40, Math.ceil(disp / 2.5)));
  }
  function camXform(c, h) { c.setTransform(1, 0, 0, 1, 0, 0); c.translate(960 + h.x, 540 + h.y); c.rotate(h.r); c.translate(-960, -540); }
  function drawMap(c, t) {
    var N = blurSamples(t), h = hand(t);
    if (N === 1) { camXform(c, h); drawSample(c, camAt(t)); return; }
    // Motion blur over half a frame: half-size samples, so 40 stay affordable.
    if (!buf) { buf = newCanvas(W / 2, H / 2); }
    var bc = buf.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingQuality = 'high';
    for (var i = 0; i < N; i++) {
      var ts = t - (i / N) * (1 / 60);
      bc.setTransform(.5, 0, 0, .5, 0, 0); drawSample(bc, camAt(ts));
      c.globalAlpha = 1 / (i + 1); c.drawImage(buf, h.x - 2, h.y - 2, W + 4, H + 4);
    }
    c.globalAlpha = 1;
  }

  // --- red marker: resampled every 26 px, wobbling, re-rolled 8 times a second ---
  function resample(pts, step) {
    var out = [pts[0].slice()], left = step;
    for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), at = left; while (at < d) { out.push([a[0] + (b[0] - a[0]) * at / d, a[1] + (b[1] - a[1]) * at / d]); at += step; } left = at - d; }
    out.push(pts[pts.length - 1].slice()); return out;
  }
  function smooth(c, p) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length - 1; i++) c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2); c.lineTo(p[p.length - 1][0], p[p.length - 1][1]); c.stroke(); }
  function boil(p, t, seed, amp) {
    var s = seed + Math.floor(t * 8) * 7, k = (amp || 1.5) / 1.5;
    return p.map(function (q, i) { return [q[0] + (Math.sin(i * .9 + s) * .7 + (vn(i * .37, s) - .5) * 1.6) * k, q[1] + (Math.cos(i * .8 + s) * .7 + (vn(s, i * .37) - .5) * 1.6) * k]; });
  }
  function mark(c, pts, w, t, prog, seed, o) {
    prog = prog === undefined ? 1 : prog; if (prog <= 0) return;
    var p = resample(pts, 26); if (prog < 1) { var f = prog * (p.length - 1), n = Math.floor(f), r = f - n, last = p[Math.min(n + 1, p.length - 1)], cur = p[n]; p = p.slice(0, n + 1); p.push([cur[0] + (last[0] - cur[0]) * r, cur[1] + (last[1] - cur[1]) * r]); }
    if (p.length < 2) return;
    p = boil(p, t, seed);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; if (o && o.dash) { c.setLineDash(o.dash); c.lineDashOffset = o.off || 0; }
    c.strokeStyle = '#8E1A12'; c.lineWidth = w + 1.6; smooth(c, p); c.strokeStyle = '#D9291D'; c.lineWidth = w; smooth(c, p);
    c.translate(-w * .16, -w * .18); c.strokeStyle = 'rgba(255,176,168,.3)'; c.lineWidth = w * .34; smooth(c, p); c.restore();
  }
  function ell(cx, cy, rx, ry, turns, start) { var out = [], T = (turns || 1.12) * TAU, a0 = start === undefined ? -2.4 : start; for (var i = 0; i <= 72; i++) { var u = i / 72, a = a0 + T * u, g = 1 + .035 * (u - .5); out.push([cx + Math.cos(a) * rx * g, cy + Math.sin(a) * ry * g]); } return out; }
  function tracePts(c, pts, close) { c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); if (close) c.closePath(); }
  function win(t, a, fadeIn, b, fadeOut) { return S(a, a + fadeIn, t) * (1 - S(b, b + fadeOut, t)); }
  function worldXform(c, cam, h) { camXform(c, h); c.translate(960 - cam.xc * cam.s, 540 - cam.yc * cam.s); c.scale(cam.s, cam.s); }
  function pathLen(pts) { var l = 0; for (var i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
  function pointsTo(pts, u) {
    var total = pathLen(pts), want = total * u, out = [pts[0]], acc = 0;
    for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + d >= want) { var k = (want - acc) / (d || 1); out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]); return out; } out.push(pts[i]); acc += d; }
    return out;
  }

  // --- what a film draws with, on the ground (film.under) and in marker (film.ink): lon/lat in, the camera taken care of ---
  function drawing(c, cam, t, h) {
    var M = {
      c: c, t: t, cam: cam, hand: h, W: Wd, E: We, S: S, win: win, ease: { quart: quart, sine: sineIO, p2IO: p2IO, p2In: p2In },
      P: function (lon, lat) { return P(cam, lon, lat); },
      geo: function (list) { return list.map(function (q) { return P(cam, q[0], q[1]); }); },
      /** Marker along lon/lat points. prog 0-1; seed keeps each stroke's own wobble; o.dash for a dashed line. */
      mark: function (list, w, prog, seed, o) { mark(c, M.geo(list), w, t, prog, seed, o); },
      /** Marker along screen points (a pointer from a word to its place). */
      markPx: function (pts, w, prog, seed, o) { mark(c, pts, w, t, prog, seed, o); },
      /** A marker ring around a place: rx, ry in screen px or, with o.world, in world units; 1.1-1.13 turns. */
      ring: function (lon, lat, rx, ry, prog, seed, o) { o = o || {}; var q = P(cam, lon, lat), k = o.world ? cam.s : 1; mark(c, ell(q[0], q[1], rx * k, ry * k, o.turns || 1.12), o.w || 9, t, prog, seed); },
      /** The cream outline of a place, dashed. */
      outline: function (list, close, w) { c.save(); c.strokeStyle = '#F6EEDC'; c.lineWidth = w || 4; c.setLineDash([18, 13]); tracePts(c, M.geo(list), close); c.stroke(); c.restore(); },
      /** Fill a place with a tint, spreading from a line to the far side as e goes 0 to 1 (from, to: lon/lat of the line's direction of travel). */
      tint: function (list, color, e, from, to) {
        if (e === undefined) e = 1; if (e <= 0) return;
        c.save(); tracePts(c, M.geo(list), true); c.clip(); c.fillStyle = color;
        if (e >= 1 || !from) c.fillRect(-40, -40, W + 80, H + 80);
        else { var a = P(cam, from[0], from[1]), b = P(cam, to[0], to[1]), dx = b[0] - a[0], dy = b[1] - a[1], nx = -dy, ny = dx; c.beginPath(); c.moveTo(a[0] - nx * 4, a[1] - ny * 4); c.lineTo(a[0] + nx * 4, a[1] + ny * 4); c.lineTo(a[0] + nx * 4 + dx * e, a[1] + ny * 4 + dy * e); c.lineTo(a[0] - nx * 4 + dx * e, a[1] - ny * 4 + dy * e); c.closePath(); c.fill(); }
        c.restore();
      },
      /** Run fn with drawing kept inside named countries (the atlas's names). */
      inside: function (names, fn) { c.save(); worldXform(c, cam, h); var p = new Path2D(); names.forEach(function (n) { if (GEO.byName[n]) p.addPath(GEO.byName[n]); else console.warn('map film: no country "' + n + '" on this map'); }); c.clip(p); camXform(c, h); fn(); c.restore(); },
      /** Hatch a place with strokes of the given colours, one stroke every `every` s from at. */
      hatch: function (list, colors, at, o) {
        o = o || {}; var n = o.n || 16, sp = o.gap || 74, every = o.every || .05, st = Math.floor((t - at) / every); if (t < at) return;
        var q = M.geo(list), x0 = 1e9, y1 = -1e9; q.forEach(function (p) { x0 = Math.min(x0, p[0]); y1 = Math.max(y1, p[1]); });
        c.save(); tracePts(c, q, true); c.clip();
        for (var i = 0; i < n && i <= st; i++) {
          var col = colors[i % colors.length], ox = x0 + i * sp - 200, oy = y1 + 60, dp = clamp01((t - at - i * every) / .07), pts = [[ox, oy], [ox + 1100 * dp, oy - 1100 * dp * .78]];
          c.strokeStyle = 'rgba(' + col + ',.5)'; c.lineWidth = 34; c.lineCap = 'round'; tracePts(c, pts); c.stroke();
          c.strokeStyle = 'rgb(' + col + ')'; c.lineWidth = 7; tracePts(c, boil(resample(pts, 26), t, i * 3 + 43)); c.stroke();
        }
        c.restore();
      },
      /** The frame split in two tinted sides along a latitude, wiping in as e goes 0 to 1. */
      split: function (lat, e, north, south, alpha) {
        if (e <= 0 || alpha <= 0) return; var y = P(cam, cam.xc, lat)[1], x0 = W + 40 - (W + 80) * e;
        c.save(); c.globalAlpha = alpha; c.fillStyle = north; c.fillRect(x0, -40, W + 80, y + 40); c.fillStyle = south; c.fillRect(x0, y, W + 80, H - y + 40);
        c.strokeStyle = '#F6EEDC'; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, y); c.lineTo(W + 40, y); c.stroke(); c.restore();
      },
      /** A dotted path with a moving marker: u 0-1 along the lon/lat points. Returns the head, for what rides on it. */
      route: function (list, u, breathe) {
        var went = pointsTo(M.geo(list), u), dots = resample(went, 26), head = went[went.length - 1], br = breathe ? 1 + .06 * Math.sin(TAU * t / 2.6) : 1;
        dots.forEach(function (d) { c.beginPath(); c.arc(d[0], d[1], 6.5, 0, TAU); c.fillStyle = '#D9291D'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#8E1A12'; c.stroke(); });
        c.beginPath(); c.arc(head[0], head[1], 19 * br, 0, TAU); c.fillStyle = '#F6EEDC'; c.fill(); c.beginPath(); c.arc(head[0], head[1], 13 * br, 0, TAU); c.fillStyle = '#D9291D'; c.fill();
        return head;
      },
      /** A line of the world by its name ('International Date Line', 'Equator', 'Tropic of Cancer', 'Tropic of Capricorn', 'Arctic Circle', 'Antarctic Circle'), as lists of lon/lat points. */
      lines: function (name) { return (GEO.lines && GEO.lines[name]) || []; },
    };
    return M;
  }

  // --- paper, grain ---
  function tile(size, paint) { var t = newCanvas(size, size); paint(t.getContext('2d'), size); return 'url(' + t.toDataURL('image/png') + ')'; }
  var paperUrl = tile(512, function (c, n) {
    c.fillStyle = 'rgb(246,238,224)'; c.fillRect(0, 0, n, n); var r = rng(1899);
    for (var i = 0; i < 1600; i++) { var x = r() * n, y = r() * n, a = r() * 6.28, l = 8 + r() * 34; c.strokeStyle = r() < .5 ? 'rgba(120,92,60,' + (.04 + r() * .1) + ')' : 'rgba(255,252,244,' + (.05 + r() * .12) + ')'; c.lineWidth = .5 + r() * .9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    var img = c.getImageData(0, 0, n, n), d = img.data; for (var k = 0; k < d.length; k += 4) { var px = (k / 4) % n, py = (k / 4 - px) / n, v = (vn(px * .012, py * .012) - .5) * 22 + (vn(px * .11, py * .11) - .5) * 12; d[k] += v; d[k + 1] += v; d[k + 2] += v; } c.putImageData(img, 0, 0);
  });
  var grainUrl = tile(256, function (c, n) { var img = c.createImageData(n, n), d = img.data, r = rng(1902); for (var k = 0; k < d.length; k += 4) { var v = r() * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; } c.putImageData(img, 0, 0); });
  document.documentElement.style.setProperty('--paper', paperUrl);
  document.documentElement.style.setProperty('--grain', grainUrl);

  // --- shots: the HTML props of one composition, moved by film time ---
  var SHOTS = [], spring = function (p) {
    if (p >= 1) return 1; var t = p * .6, z = .48, w = 19, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  };
  function fmtDMS(v, pos, neg) { var a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = Math.floor((mf - m) * 60); return d + '°' + ('0' + m).slice(-2) + '′' + ('0' + s).slice(-2) + '″' + (v >= 0 ? pos : neg); }
  // A typed line reveals letter by letter whatever the face's widths: Special Elite is not fixed-width.
  function letters(el) {
    if (el.__letters) return el.__letters;
    var txt = el.textContent, out = []; el.textContent = '';
    Array.from(txt).forEach(function (ch) { var sp = document.createElement('span'); sp.textContent = ch; sp.style.display = 'inline'; sp.style.visibility = 'hidden'; el.appendChild(sp); out.push(sp); });
    return (el.__letters = out);
  }
  function makeShot(id, start, dur) {
    var host = document.getElementById(id) || document.querySelector('[data-composition-id="' + id + '"]');
    var tl = gsap.timeline({ paused: true });
    var moves = new Map(), ticks = [], typed = [], labels = [];
    // The ground and the marker fill the frame on purpose, and the scribble canvas lies clear over the card.
    host.querySelectorAll('canvas.map, canvas.ink, .world').forEach(function (e) { e.setAttribute('data-layout-allow-overflow', ''); });
    function q(k) { var e = host.querySelector('[data-k="' + k + '"]'); if (!e) console.warn('map film: no prop ' + k + ' in ' + id); return e; }
    function moveOf(el) { var m = moves.get(el); if (!m) { m = { list: [] }; moves.set(el, m); } return m; }
    var s = {
      id: id, start: start, end: start + dur, dur: dur, tl: tl, q: q, host: host,
      map: host.querySelector('canvas.map'), ink: host.querySelector('canvas.ink'),
      world: host.querySelector('.world'), paper: host.querySelector('.fx-paper'), grain: host.querySelector('.fx-grain'), vig: host.querySelector('.fx-vig'),
      readout: host.querySelector('.readout'), drawn: host.querySelector('.drawn'),
      moves: moves, ticks: ticks, typed: typed, labels: labels,
      /** A word's start or end, in this shot's own seconds (for the timeline). */
      w: function (word, nth) { return Wd(word, nth) - start; }, we: function (word, nth) { return We(word, nth) - start; },
      hide: function (el) { gsap.set(el, { opacity: 0 }); return s; },
      // Spring (damping 0.48, 19 rad/s) from 55 % with a small rotation settle.
      pop: function (el, t, rotFrom, rotTo) {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: .03, ease: 'none' }, t);
        tl.fromTo(el, { scale: .55, rotation: rotFrom }, { scale: 1, rotation: rotTo, duration: .6, ease: spring }, t);
        return s;
      },
      // Exits shrink and fade in 0.22 s.
      out: function (el, t, rot, d) {
        d = d || .22;
        gsap.set(el, { rotation: rot || 0, scale: 1, opacity: 1 });
        tl.fromTo(el, { opacity: 1, scale: 1, rotation: rot || 0 }, { opacity: 0, scale: .8, rotation: rot || 0, duration: d, ease: 'power3.in', immediateRender: false }, t);
        return s;
      },
      fadeOut: function (el, t, d) { tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: d || .22, ease: 'power3.in', immediateRender: false }, t); return s; },
      fadeIn: function (el, t, d) { tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d || .3, ease: 'power2.out' }, t); return s; },
      // Handwriting comes out from the left, under a mask, with room for the marks.
      write: function (el, t, d, rot) {
        gsap.set(el, { rotation: rot || 0 });
        tl.fromTo(el, { clipPath: 'inset(-40% 100% -40% -6%)' }, { clipPath: 'inset(-40% -6% -40% -6%)', duration: d, ease: 'power1.inOut' }, t);
        return s;
      },
      // A typed line, letter by letter, by film time (tAbs: the film's seconds).
      type: function (el, tAbs, perChar) { var ls = letters(el); typed.push({ el: el, ls: ls, t: tAbs, per: perChar || .035, last: -1 }); return s; },
      swipe: function (el, t, d) { tl.fromTo(el, { '--hl': 0 }, { '--hl': 1, duration: d, ease: 'power2.out' }, t); return s; },
      // A number that counts up and then stands, in a box as wide as its last string.
      count: function (el, to, t0, d, fmt) {
        var fixed = 0; fmt = fmt || String;
        ticks.push(function (t) {
          if (!fixed) { el.textContent = fmt(to); fixed = el.offsetWidth; if (fixed) el.style.width = fixed + 'px'; }
          var p = clamp01((t - t0) / d), txt = fmt(Math.round(to * (1 - (1 - p) * (1 - p))));
          if (el.textContent !== txt) el.textContent = txt;
        });
        return s;
      },
      // A marker scribble over a number on its own small canvas; box in the canvas's px.
      scribble: function (cv, t0, d, seed) {
        ticks.push(function (t) {
          var c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); if (t < t0) return;
          var zig = [], w = cv.width, h = cv.height; for (var i = 0; i <= 12; i++) zig.push([20 + (i % 2 ? w - 70 : -8) + Math.sin(i) * 8, 30 + i * (h - 60) / 12]);
          mark(c, zig, 10, t, p2In((t - t0) / d), seed || 79);
        });
        return s;
      },
      // A float that ends where it began, so a prop hands over cleanly to the next shot.
      drift: function (el, tIn, tOut, ax, ay, ar, P1, ph) { moveOf(el).list.push({ tIn: tIn, tOut: tOut, ax: ax, ay: ay, ar: ar, P: P1, ph: ph || 0, win: true }); return s; },
      // A float tied to film time, for what stays across shots (the corner notes).
      loop: function (el, ax, ay, P1, ph) { moveOf(el).list.push({ ax: ax, ay: ay, ar: 0, P: P1, ph: ph || 0, win: false }); return s; },
      // Ink boil on handwriting: small jumps 8 times a second.
      boil: function (el, tIn, tOut, seed) { moveOf(el).list.push({ boil: true, tIn: tIn, tOut: tOut, seed: seed || 1 }); return s; },
      // A map label sits on its place; it may change place between two seconds (film time).
      label: function (el, ll, ll2, t0, t1) { labels.push({ el: el, ll: ll, ll2: ll2, t0: t0, t1: t1 }); return s; },
      labelsIn: function (list, t, gap, d) { list.forEach(function (k, i) { var el = q(k); gsap.set(el, { opacity: 0 }); tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d, ease: 'power2.out' }, t + i * gap); }); return s; },
      labelsOut: function (list, t, gap) { list.forEach(function (k, i) { tl.fromTo(q(k), { opacity: 1, '--ls': 1 }, { opacity: 0, '--ls': .8, duration: .22, ease: 'power3.in', immediateRender: false }, t + (gap || 0) * i); }); return s; },
      each: function (fn) { ticks.push(fn); return s; },
      // Corner notes float by film time, so they run on across every shot that has them.
      corner: function () { if (s.readout) s.loop(s.readout, 8, 3, 6.1); if (s.drawn) s.loop(s.drawn, 8, 0, 7.3, 1.1); return s; },
      done: function () { tl.set({}, {}, dur); SHOTS.push(s); SHOTS.sort(function (a, b) { return a.start - b.start; }); if (last !== null) tick(last); return tl; }
    };
    return s;
  }
  function moveShot(s, t, ride) {
    s.moves.forEach(function (m, el) {
      var x = 0, y = 0, r = 0;
      m.list.forEach(function (d) {
        if (d.boil) { if (t < d.tIn || t > d.tOut) return; var st = Math.floor(t * 8) + d.seed * 13; x += (vn(st * .77, 3.1) - .5) * 1.6; y += (vn(5.3, st * .77) - .5) * 1.6; r += (vn(st * .77, 9.7) - .5) * .6; return; }
        var w = d.win ? S(d.tIn, d.tIn + .5, t) * (1 - S(d.tOut - .5, d.tOut, t)) : 1, a = TAU * t / d.P + d.ph;
        x += d.ax * Math.sin(a) * w; y += d.ay * Math.sin(a * .83 + 1.3) * w; r += d.ar * Math.sin(a * .91 + .6) * w;
      });
      if (el === s.readout || el === s.drawn) { x -= ride.x; y -= ride.y; } // the corner notes stay in their corners
      el.style.translate = x.toFixed(2) + 'px ' + y.toFixed(2) + 'px'; el.style.rotate = r.toFixed(3) + 'deg';
    });
    s.typed.forEach(function (d) {
      var n = t < d.t ? 0 : Math.min(d.ls.length, Math.ceil((t - d.t) / d.per));
      if (n === d.last) return; d.last = n;
      d.ls.forEach(function (sp, i) { sp.style.visibility = i < n ? 'visible' : 'hidden'; });
    });
    s.ticks.forEach(function (fn) { fn(t); });
  }
  var last = null;
  function tick(t) {
    last = t;
    if (!GEO.ready || !SHOTS.length) return;
    var cur = null; for (var i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].start) cur = SHOTS[i]; if (!cur) return;
    var cam = camAt(t), h = hand(t), sat = satAmount(cam.z), ride = rideAt(t, cam);
    moveShot(cur, t, ride);
    cur.labels.forEach(function (d) {
      var ll = d.ll; if (d.ll2) { var e = quart((t - d.t0) / (d.t1 - d.t0)); ll = [d.ll[0] + (d.ll2[0] - d.ll[0]) * e, d.ll[1] + (d.ll2[1] - d.ll[1]) * e]; }
      var p = P(cam, ll[0], ll[1]); d.el.style.translate = (p[0] - ride.x).toFixed(1) + 'px ' + (p[1] - ride.y).toFixed(1) + 'px';
    });
    if (cur.world) { cur.world.style.translate = (h.x + ride.x).toFixed(2) + 'px ' + (h.y + ride.y).toFixed(2) + 'px'; cur.world.style.rotate = (h.r * 180 / Math.PI).toFixed(4) + 'deg'; }
    // Paper 85 % on the map, 22 % on the ground; 7 % grain re-seeded each frame; both ride the hand.
    if (cur.paper) { cur.paper.style.opacity = (.85 + (.22 - .85) * sat).toFixed(3); cur.paper.style.translate = h.x.toFixed(2) + 'px ' + h.y.toFixed(2) + 'px'; }
    if (cur.vig) cur.vig.style.translate = h.x.toFixed(2) + 'px ' + h.y.toFixed(2) + 'px';
    if (cur.grain) { var fr = Math.round(t * 30); cur.grain.style.backgroundPosition = ((fr * 137) % 512) + 'px ' + ((fr * 251) % 512) + 'px'; }
    if (cur.drawn && GEO.credit && cur.drawn.textContent !== GEO.credit) { cur.drawn.textContent = GEO.credit; cur.drawn.classList.add('credit'); }
    if (cur.readout) { var lon = lonOf(cam.xc - h.x / cam.s), lat = latOf(cam.yc - h.y / cam.s), txt = fmtDMS(lat, 'N', 'S') + ' ' + fmtDMS(lon, 'E', 'W'); if (cur.readout.textContent !== txt) cur.readout.textContent = txt; }
    if (cur.map) {
      var c = cur.map.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); drawMap(c, t);
      if (FILM.under) { camXform(c, h); FILM.under(drawing(c, cam, t, h)); }
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
    }
    if (cur.ink) {
      var k = cur.ink.getContext('2d'); k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, W, H);
      if (FILM.ink) { camXform(k, h); FILM.ink(drawing(k, cam, t, h)); }
      k.setTransform(1, 0, 0, 1, 0, 0); k.globalAlpha = 1;
    }
  }
  window.addEventListener('hf-seek', function (e) { tick(e.detail.time); });

  // --- build once: the data first, then the levels, before the first frame is taken ---
  function build(base) {
    var box = keysBox(function () { return true; }, 200), minZ = Math.min.apply(null, [START[2]].concat(KEYS.map(function (k) { return k.z; }))), maxZ = Math.max.apply(null, [START[2]].concat(KEYS.map(function (k) { return k.z; })));
    return fetch(base + 'data/geographic-lines.geojson').then(function (r) { return r.json(); }).then(function (g) {
      GEO.lines = {}; g.features.forEach(function (f) { GEO.lines[f.properties.name] = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates]; });
    }).catch(function () { GEO.lines = {}; }).then(function () { return fetch(base + 'data/countries-' + (FILM.atlas || '50m') + '.json'); }).then(function (r) { return r.json(); }).then(function (topo) {
      decodeAtlas(topo, box);
      return fetch(base + 'data/lakes-' + (FILM.atlas || '50m') + '.json').then(function (r) { return r.json(); }).then(function (data) { decodeLakes(data, box); }).catch(function () { GEO.lakes = null; });
    }).then(function () {
      // the paper map: one level at the widest view and, when the camera goes closer, one at the zoom's middle
      GEO.paper = [];
      if (minZ < 9.3) {
        var wide = keysBox(function (z) { return z < 9.3; }, 200); if (wide) { var p0 = buildPaper(wide, Math.min(minZ + .15, 7.5)); p0.fromZ = 0; GEO.paper.push(p0); }
        if (maxZ > minZ + 1.2) { var mid = keysBox(function (z) { return z >= minZ + 1.2; }, 500) || wide, p1 = buildPaper(mid, Math.min(minZ + 1.65, 8.6)); p1.fromZ = minZ + .95; GEO.paper.push(p1); }
      }
      // the ground: the real mosaics the app fetched, or, with none, a level every 2 zooms from 7.5 up to the camera's closest, each only where the camera goes that close
      GEO.ground = [];
      if (maxZ > 7.3 && FILM.imagery !== false) return fetch(base + 'imagery/imagery.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (im) {
        if (im && im.levels && im.levels.length && (im.center || 0) === ROT) return Promise.all(im.levels.map(function (lv) { return buildImagery(lv, base); })).then(function (ls) { GEO.ground = ls; GEO.credit = im.credit; });
        drawnGround(maxZ);
      }).then(function () { GEO.ready = true; if (last !== null) tick(last); else tick(0); });
      if (maxZ > 7.3) drawnGround(maxZ);
      GEO.ready = true;
      if (last !== null) tick(last); else tick(0);
    }).catch(function (e) { console.warn('map film: the map data did not load', e); });
  }
  function drawnGround(maxZ) {
    for (var z = 7.5, oct = 6; z < maxZ + 1.9; z += 2, oct += 2) {
        var zz = z;
        var b = keysBox(function (kz) { return kz >= zz - 1.2; }, 260 * (zz > 8 ? 1 : 2)); if (!b) continue;
        var lz = Math.min(z, maxZ + .25), L = buildGround(b, lz, oct, { feather: z > 7.5 ? 120 : 0 }); L.z = lz; GEO.ground.push(L);
        if (lz >= maxZ) break;
    }
  }

  window.MAPFILM = {
    /** The film's story: { atlas: '50m'|'10m', seed, center: lon (the map's middle), colors: {country: '#hex'}, ground: { biome, rock }, camera: { start: [lon, lat, z],
     *  keys: [[from, to, lon, lat, z, 'open'|'move'|'hold'], ...], shakes: [t, ...], endShift: { at, dur, fromLon, lon } }, under(M), ink(M) }. */
    film: function (cfg) {
      FILM = cfg; ROT = cfg.center || 0; if (cfg.seed) seedNoise(cfg.seed);
      START = cfg.camera.start; SHAKES = cfg.camera.shakes || []; END_SHIFT = cfg.camera.endShift || null;
      KEYS = cfg.camera.keys.map(function (k) { return { from: k[0], to: k[1], lon: k[2], lat: k[3], z: k[4], kind: k[5] || 'move' }; });
      var built = build(cfg.base || 'assets/_app/map/');
      window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {}; window.__hf.buildReady.mapfilm = built;
      return built;
    },
    shot: makeShot, W: Wd, E: We, words: WORDS, spring: spring,
    /** For a still of the map alone (the style's own test page). */
    _draw: function (c, t) { var cam = camAt(t), h = hand(t); drawMap(c, t); if (FILM.under) { camXform(c, h); FILM.under(drawing(c, cam, t, h)); } if (FILM.ink) { camXform(c, h); FILM.ink(drawing(c, cam, t, h)); } c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; },
    _ready: function () { return GEO.ready; },
  };
})();

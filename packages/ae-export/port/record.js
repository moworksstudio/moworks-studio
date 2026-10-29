/* Moworks Studio copy of the Moworks Motion kit's engine/ae/record.js (kit commit 30b7dcb, MIT, Moworks). Changes: see ../PROVENANCE.md
   (scenes = HF sub-composition hosts too; the page driver is ./hf_driver.js on HF's own page, not the kit's driver).
   Moworks Motion: After Effects recorder, runs inside a film page after window.__aimk.ready (engine/runtime/driver.js).
   Generic: it does not know any preset. It reads the DOM once (which elements become which AE layers) and then samples every
   layer's state over time: the 2D matrix from the layer to its comp, the layout box (transforms off), the transform origin, opacity
   (own x ancestors), visibility, blur, clip-path, text (and its baseline), and a hash of everything else that paints (to detect paint
   that changes over time, which AE gets as a PNG sequence). engine/ae/port.py fits the samples into sparse AE keyframes.

   Layer kinds:  text (an element with its own text), box (own paint: background, border, shadow, pseudo-elements), image (<img>),
                 raster (svg / canvas / video / text painted with background-clip:text: one picture of the whole element),
                 clip (an element that clips its descendants: overflow hidden or clip-path; becomes a track matte in AE)
   Comps (groups): "main" = the stage; one per top-level HyperFrames clip (data-start) = a scene, whose inner (.inner) is the container;
                   anything else inside the clip (transition overlays) belongs to main, gated by the clip's time. */
window.__aimkRec = (() => {
  const SKIP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "LINK", "META", "NOSCRIPT", "AUDIO"]);
  const RASTER = new Set(["svg", "CANVAS", "VIDEO", "IFRAME", "OBJECT", "EMBED"]);
  let NODES = [], GROUPS = [], ELS = [], stage = null;
  const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
  // the transforms AE keys are reset for a picture; the inside of an SVG keeps its own (a film drawn as one script-moved SVG,
  // Halftone Dossier, pictured its cat at the SVG's corner, CSS "transform: none" overriding the groups' transform attributes)
  const NT = "*:not(svg *),*:not(svg *)::before,*:not(svg *)::after{transform:none!important;translate:none!important;rotate:none!important;scale:none!important}";
  /* a kit HyperFrames block (iframe[data-aimk-block], ctx.hfFrame: a registry block, HF's caption pages) is read INSIDE (the
     words of HyperFrames' captions as text in AE, not a picture): its page's elements are layers like the film's own, the iframe a
     clip of its box. The page has its own document: parentOf() steps from its <html> to the iframe; styles, ranges and canvases come from
     the element's own document; layout boxes add the iframe's place (FRAMES, measured with transforms off in both documents). */
  const FRAMES = [];
  const getComputedStyle = (el, p) => (el.ownerDocument.defaultView || window).getComputedStyle(el, p);
  const inner = el => { try { const d = el.tagName === "IFRAME" && el.hasAttribute("data-aimk-block") && el.contentDocument; return d && d.documentElement ? d : null; } catch (e) { return null; } };
  const parentOf = x => x.parentElement || (x.ownerDocument !== document && x === x.ownerDocument.documentElement ? x.ownerDocument.defaultView.frameElement : null);
  const isSvg = el => (el.tagName || "").toLowerCase() === "svg" && el.namespaceURI === "http://www.w3.org/2000/svg";
  const docs = () => [document, ...FRAMES.map(f => f.contentDocument).filter(Boolean)];
  const addStyle = text => docs().map(d => { const s = d.createElement("style"); s.textContent = text; d.head.appendChild(s); return s; });

  function ownText(el) { if (el.dataset && el.dataset.aimkText) return true; for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) return true; return false; }
  function pseudo(el, w) { const c = getComputedStyle(el, w).content; return c && c !== "none" && c !== "normal"; }
  function paints(cs, el) {
    const bg = cs.backgroundColor, a = bg.startsWith("rgba") ? parseFloat(bg.split(",")[3]) : (bg === "transparent" ? 0 : 1);
    const bw = ["Top", "Right", "Bottom", "Left"].some(s => parseFloat(cs["border" + s + "Width"]) > 0 && cs["border" + s + "Style"] !== "none");
    return a > 0 || cs.backgroundImage !== "none" || bw || cs.boxShadow !== "none" || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || pseudo(el, "::before") || pseudo(el, "::after");
  }
  function idx(el) { let i = ELS.indexOf(el); if (i < 0) { i = ELS.length; ELS.push(el); el.dataset.aimkE = i; } return i; }

  // anc: the element indexes above this one inside its comp (outermost first): port.py precomposes by them (a bubble with its letters, a
  // film-level layer, the cells of one transition)
  function walk(el, g, clip, depth, anc) {
    if (SKIP.has(el.tagName)) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    anc = anc || [];
    const node = kind => NODES.push({ n: NODES.length, e: idx(el), kind, g, clip, depth, anc, id: el.id || "", tag: el.tagName.toLowerCase(), cls: el.className && el.className.baseVal === undefined ? String(el.className) : "" });
    const own = (cs.clipPath && cs.clipPath !== "none") || el.dataset.aimkClip === "1";
    const clipSelf = own ? NODES.length : clip;                       // clip-path cuts the element's own paint too
    if (own) NODES.push({ n: NODES.length, e: idx(el), kind: "clip", g, clip, depth, anc, id: el.id || "", how: "clip-path" });
    if (el.tagName === "IMG") { node("image"); NODES[NODES.length - 1].clip = clipSelf; NODES[NODES.length - 1].src = el.currentSrc || el.src; return; }
    const fd = inner(el);
    if (fd) {                                                         // a kit HF block: its page inside, cut to the iframe's box
      if (!FRAMES.includes(el)) FRAMES.push(el);
      const kc = NODES.length; NODES.push({ n: NODES.length, e: idx(el), kind: "clip", g, clip: clipSelf, depth, anc, id: el.id || "", how: "overflow" });
      walk(fd.documentElement, g, kc, depth + 1, anc.concat([idx(el)]));
      return;
    }
    if (RASTER.has(el.tagName) || isSvg(el)) { node("raster"); NODES[NODES.length - 1].clip = clipSelf; return; }
    if ((cs.webkitBackgroundClip || cs.backgroundClip) === "text") { node("raster"); NODES[NODES.length - 1].clip = clipSelf; return; }
    if (paints(cs, el) || el.dataset.aimkPaint) { node("box"); NODES[NODES.length - 1].clip = clipSelf; }
    if (ownText(el)) {
      // absolutely placed children are layers of their own (scramble overlays, badges); inline children stay part of this text
      const sep = [...el.children].filter(c => ["absolute", "fixed"].includes(getComputedStyle(c).position));
      node("text"); NODES[NODES.length - 1].clip = clipSelf; if (sep.length) { NODES[NODES.length - 1].direct = 1; el.dataset.aimkDirect = "1"; }
      for (const c of sep) walk(c, g, clipSelf, depth + 1, anc.concat([idx(el)]));
      return;
    }
    let kidClip = clipSelf;
    if (!own && (cs.overflowX !== "visible" || cs.overflowY !== "visible")) {        // with its own clip-path, that (tighter) shape clips the kids
      kidClip = NODES.length; NODES.push({ n: NODES.length, e: idx(el), kind: "clip", g, clip: clipSelf, depth, anc, id: el.id || "", how: "overflow",
                                           textMask: !!(el.dataset && el.dataset.aimkMask) });   // ctx.mask: a text-rise mask (vertical only)
    }
    for (const c of el.children) walk(c, g, kidClip, depth + 1, anc.concat([idx(el)]));
  }

  async function structure(sel, D) {
    stage = document.querySelector(sel); NODES = []; GROUPS = []; ELS = []; FRAMES.length = 0;
    // text that is empty at 0 s (typewriter, counters filled later): any element with its own text at some moment is a text layer
    // (the pages of HF blocks too: their elements are layers)
    const allIn = r => { const out = []; for (const x of r.querySelectorAll("*")) { out.push(x); const d = inner(x); if (d) out.push(d.documentElement, ...allIn(d.documentElement)); } return out; };
    const all = allIn(stage), step = Math.max(0.1, (D || 0) / 200);
    for (let t = 0; t <= (D || 0) + 1e-6; t += step) {
      await window.__aimk.seek(t);
      for (const el of all) {
        if (!el.dataset.aimkText) for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) { el.dataset.aimkText = "1"; break; }
        const ecs = getComputedStyle(el);
        if (!el.dataset.aimkPaint && paints(ecs, el)) el.dataset.aimkPaint = "1";      // paint that appears later (a shade fading in)
        // a clip-path the timeline sets later (a spotlight cone keyed from 4.7 s, none at 0 s, was no clip at all in AE:
        // the lit set covered the whole frame)
        if (!el.dataset.aimkClip && ecs.clipPath && ecs.clipPath !== "none") el.dataset.aimkClip = "1";
      }
    }
    await window.__aimk.seek(0);
    idx(stage);
    GROUPS.push({ g: 0, kind: "main", root: idx(stage), name: "main", start: 0, dur: +stage.getAttribute("data-duration") || window.__aimk.timeline.duration() });
    for (const c of stage.children) {
      // Moworks Studio: a scene is a kit clip (.clip with .inner) OR a mounted HF sub-composition (a host with data-composition-id, its
      // content in HF's [data-hf-inner-root]); HF's bundle keeps a host's length as data-hf-authored-duration
      const hfHost = c.hasAttribute("data-composition-id") || c.hasAttribute("data-composition-src");
      // a clip that is itself a picture (a Whiteboard film's one <canvas class="clip" data-start>) has no inside to make a scene of:
      // it was an empty scene comp (0 layers, nothing in AE); it is a raster layer of the main comp, shown by its own time like any layer
      const leaf = RASTER.has(c.tagName) || c.tagName === "IMG" || isSvg(c);
      if (c.hasAttribute("data-start") && c.tagName !== "AUDIO" && !leaf && (c.classList.contains("clip") || hfHost)) {
        const inner = c.querySelector(":scope > .inner") || (hfHost && c.querySelector(":scope > [data-hf-inner-root]")) || c;
        const g = GROUPS.length;
        GROUPS.push({ g, kind: "scene", clip: idx(c), root: idx(inner), name: c.getAttribute("data-name") || c.id || c.getAttribute("data-composition-id") || "scene " + g, id: c.id || "", at: NODES.length,
                      start: +c.getAttribute("data-start") || 0, dur: +c.getAttribute("data-duration") || +c.getAttribute("data-hf-authored-duration") || 0 });
        if (inner !== c) {
          const ics = getComputedStyle(inner);
          if (paints(ics, inner)) NODES.push({ n: NODES.length, e: idx(inner), kind: "box", g, clip: -1, depth: 0, id: inner.id || "", tag: "div", cls: "inner" });
          for (const k of inner.children) walk(k, g, -1, 1);
          for (const k of c.children) if (k !== inner) walk(k, 0, -1, 1);          // overlays of the clip: main comp, gated by the clip time
        } else for (const k of c.children) walk(k, g, -1, 1);
      } else walk(c, 0, -1, 1);
    }
    // every element's name for the port (precomp names) and a motion/image-sequence box's "source" (the client's original files)
    const els = ELS.map(e => ({ id: e.id || "", tag: e.tagName.toLowerCase(), cls: e.className && e.className.baseVal === undefined ? String(e.className).split(" ")[0] : "",
                               source: (e.dataset && e.dataset.aimkSource) || "" }));
    // paint order (colour bars with a lower z-index came out ABOVE their numbers in AE, layers followed page order):
    // a key per node, compared as lists (a key that is the start of another sorts first = paints below it). CSS 2.1 appendix E:
    //  - one level per true stacking context on the way down from the comp's root: [bucket, z-index, page order], bucket -1 negative z,
    //    1 positioned z auto / 0 (and opacity / transform / filter ... contexts, painted as z 0), 2 positive z;
    //  - the element itself: positioned or a context -> its own [bucket, z, order] in the nearest context; in flow -> [0, 0, order], or,
    //    under a positioned z-auto box of that context, [1, 0, box order] + [0, 0, order]: such a box paints its in-flow content WITH it
    //    (light-sweep-pass case: card text came out under the cards when it sorted as plain in-flow content).
    // tree order, a block's page in the place of its iframe
    const PRE = new Map(); { let i = 0; const visit = x => { PRE.set(x, i++); const d = inner(x); if (d) visit(d.documentElement); for (const c of x.children) visit(c); }; visit(stage); }
    const zinfo = x => {
      const cs = getComputedStyle(x), pos = cs.position !== "static", z = pos && cs.zIndex !== "auto" ? (parseInt(cs.zIndex, 10) || 0) : null;
      const sc = z !== null || cs.position === "fixed" || cs.position === "sticky" || +cs.opacity < 1 || cs.transform !== "none" || cs.filter !== "none"
        || cs.isolation === "isolate" || cs.mixBlendMode !== "normal" || (cs.clipPath && cs.clipPath !== "none") || (cs.maskImage && cs.maskImage !== "none")
        || (cs.perspective && cs.perspective !== "none") || /transform|opacity/.test(cs.willChange) || /paint|strict|content/.test(cs.contain || "");
      return { pos, sc, lvl: [z === null || z === 0 ? 1 : z < 0 ? -1 : 2, z || 0, PRE.get(x) || 0] };
    };
    const zkey = (el, root) => {
      const chain = []; for (let x = el; x && x !== root && x !== stage; x = parentOf(x)) chain.unshift(x);
      const key = []; let owner = null;                  // owner: the positioned z-auto box since the last context
      chain.forEach((x, i) => {
        const zi = zinfo(x), last = i === chain.length - 1;
        if (zi.sc) { key.push(zi.lvl); owner = null; }
        else if (last && zi.pos) key.push(zi.lvl);
        else if (last) { if (owner) key.push(owner); key.push([0, 0, PRE.get(x) || 0]); }
        else if (zi.pos) owner = zi.lvl;
      });
      return key;
    };
    for (const nd of NODES) nd.zk = zkey(ELS[nd.e], ELS[GROUPS[nd.g].root]);
    for (const G of GROUPS) if (G.kind === "scene") G.zk = zkey(ELS[G.clip], stage);
    // plain vector SVGs (paths and basic shapes, flat colours) become native AE shape layers. Their geometry is read once with the page's transforms off (the SVG's own inner transforms stay on).
    const nt = addStyle("*:not(svg *),*::before,*::after{transform:none!important;translate:none!important;rotate:none!important;scale:none!important}");
    for (const nd of NODES) if (nd.kind === "raster" && isSvg(ELS[nd.e])) { const v = vecOf(ELS[nd.e]); if (v) { nd.vec = v.out; VEC[nd.n] = v.car; } }
    nt.forEach(s => s.remove());
    return { groups: GROUPS, nodes: NODES, nEls: ELS.length, els };
  }

  /* ------------------------------------------------------------------ SVG -> AE shape data
     vecOf(svg) -> {out: {items: [{name, p: [{v, i, o, c}], f: [r, g, b, a] | null, r: "evenodd" | "nonzero", s: {c, w, cap, join} | null, u: stroke
     under the fill, so: static opacity, car: [carrier indexes]}]}, car: [elements]} or null when the SVG holds anything a shape layer cannot
     be (clip paths, masks, gradients, patterns, filters, text, images, <use>). Coordinates: the SVG element's own box px (vertices; tangents
     relative to their vertex, as AE's Shape takes them). Carriers: the elements with an id between a shape and the SVG: their opacity is
     sampled over time (expression / hand variants, the blink lid: hold keys on the shape group's opacity in AE). */
  const VEC = {};
  const DRAW = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]), OKTAG = new Set([...DRAW, "g", "title", "desc", "defs", "clippath"]);
  const r3 = v => Math.round(v * 1000) / 1000;
  function a2c(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
    const s = Math.sin(phi * Math.PI / 180), c = Math.cos(phi * Math.PI / 180);
    const xp = c * (x1 - x2) / 2 + s * (y1 - y2) / 2, yp = -s * (x1 - x2) / 2 + c * (y1 - y2) / 2;
    if ((xp === 0 && yp === 0) || !rx || !ry) return null;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = xp * xp / (rx * rx) + yp * yp / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    let rad = (rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp) / (rx * rx * yp * yp + ry * ry * xp * xp);
    rad = Math.sqrt(Math.max(0, rad)) * (fa === fs ? -1 : 1);
    const cxp = rad * rx / ry * yp, cyp = -rad * ry / rx * xp, cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const sg = ux * vy - uy * vx < 0 ? -1 : 1, d = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy)); return sg * Math.acos(Math.max(-1, Math.min(1, d))); };
    const v1x = (xp - cxp) / rx, v1y = (yp - cyp) / ry, v2x = (-xp - cxp) / rx, v2y = (-yp - cyp) / ry;
    const t1 = ang(1, 0, v1x, v1y); let dt = ang(v1x, v1y, v2x, v2y);
    if (!fs && dt > 0) dt -= 2 * Math.PI; if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2))), d = dt / n, out = [];
    const P = (ux, uy) => [c * ux * rx - s * uy * ry + cx, s * ux * rx + c * uy * ry + cy];
    for (let k = 0; k < n; k++) {
      const a1 = t1 + k * d, a2 = a1 + d, al = 4 / 3 * Math.tan(d / 4), c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
      out.push([...P(c1 - s1 * al, s1 + c1 * al), ...P(c2 + s2 * al, s2 - c2 * al), ...P(c2, s2)]);
    }
    return out;
  }
  function parsePath(d) {
    const tok = (d || "").match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
    const subs = []; let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, lc = null, lq = null, cur = null;
    const num = () => parseFloat(tok[i++]);
    const start = (px, py) => { cur = { v: [[px, py]], i: [[0, 0]], o: [[0, 0]], c: false }; subs.push(cur); };
    const need = () => { if (!cur || cur.c) start(x, y); };
    const line = (px, py) => { need(); cur.v.push([px, py]); cur.i.push([0, 0]); cur.o.push([0, 0]); x = px; y = py; };
    const cub = (x1, y1, x2, y2, px, py) => { need(); const n = cur.v.length - 1; cur.o[n] = [x1 - cur.v[n][0], y1 - cur.v[n][1]];
      cur.v.push([px, py]); cur.i.push([x2 - px, y2 - py]); cur.o.push([0, 0]); x = px; y = py; };
    while (i < tok.length) {
      if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++]; else if (!cmd) return null;
      const C = cmd.toUpperCase(), rel = cmd !== C, ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === "Z") { if (cur) { cur.c = true; const n = cur.v.length - 1;
          if (n > 0 && Math.abs(cur.v[n][0] - cur.v[0][0]) < 1e-3 && Math.abs(cur.v[n][1] - cur.v[0][1]) < 1e-3) { cur.i[0] = cur.i[n]; cur.v.pop(); cur.i.pop(); cur.o.pop(); } }
        x = sx; y = sy; lc = lq = null; continue; }
      if (i >= tok.length || /[a-zA-Z]/.test(tok[i])) continue;
      if (C === "M") { const px = num() + ox, py = num() + oy; start(px, py); x = sx = px; y = sy = py; cmd = rel ? "l" : "L"; lc = lq = null; }
      else if (C === "L") { line(num() + ox, num() + oy); lc = lq = null; }
      else if (C === "H") { line(num() + ox, y); lc = lq = null; }
      else if (C === "V") { line(x, num() + oy); lc = lq = null; }
      else if (C === "C") { const a = [num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy]; cub(...a); lc = [a[2], a[3]]; lq = null; }
      else if (C === "S") { const r = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y], a = [num() + ox, num() + oy, num() + ox, num() + oy]; cub(r[0], r[1], ...a); lc = [a[0], a[1]]; lq = null; }
      else if (C === "Q" || C === "T") {
        const q = C === "Q" ? [num() + ox, num() + oy] : (lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y]), px = num() + ox, py = num() + oy;
        cub(x + 2 / 3 * (q[0] - x), y + 2 / 3 * (q[1] - y), px + 2 / 3 * (q[0] - px), py + 2 / 3 * (q[1] - py), px, py); lq = q; lc = null;
      } else if (C === "A") {
        const rx = num(), ry = num(), ph = num(), fa = num(), fs = num(), px = num() + ox, py = num() + oy;
        const segs = a2c(x, y, px, py, fa ? 1 : 0, fs ? 1 : 0, rx, ry, ph);
        if (!segs) line(px, py); else for (const sg of segs) cub(...sg);
        lc = lq = null;
      } else return null;
    }
    return subs;
  }
  function geom(el, tag) {
    const A = n => { const a = el.getAttribute(n); return a == null ? 0 : parseFloat(a) || 0; };
    if (tag === "path") return parsePath(el.getAttribute("d"));
    if (tag === "circle" || tag === "ellipse") {
      const cx = A("cx"), cy = A("cy"), rx = tag === "circle" ? A("r") : A("rx"), ry = tag === "circle" ? A("r") : A("ry"), k = 0.5522847;
      if (!(rx > 0 && ry > 0)) return [];
      return [{ v: [[cx + rx, cy], [cx, cy + ry], [cx - rx, cy], [cx, cy - ry]], i: [[0, -k * ry], [k * rx, 0], [0, k * ry], [-k * rx, 0]],
                o: [[0, k * ry], [-k * rx, 0], [0, -k * ry], [k * rx, 0]], c: true }];
    }
    if (tag === "rect") {
      const x = A("x"), y = A("y"), w = A("width"), h = A("height"); let rx = A("rx"), ry = A("ry");
      if (!(w > 0 && h > 0)) return [];
      if (!el.hasAttribute("ry")) ry = rx; if (!el.hasAttribute("rx")) rx = ry; rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx || !ry) return [{ v: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], c: true }];
      return parsePath(`M${x + rx},${y} H${x + w - rx} A${rx},${ry} 0 0 1 ${x + w},${y + ry} V${y + h - ry} A${rx},${ry} 0 0 1 ${x + w - rx},${y + h} H${x + rx} A${rx},${ry} 0 0 1 ${x},${y + h - ry} V${y + ry} A${rx},${ry} 0 0 1 ${x + rx},${y} Z`);
    }
    if (tag === "line") return [{ v: [[A("x1"), A("y1")], [A("x2"), A("y2")]], i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], c: false }];
    const pts = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(parseFloat), v = [];
    for (let k = 0; k + 1 < pts.length; k += 2) v.push([pts[k], pts[k + 1]]);
    return v.length < 2 ? [] : [{ v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), c: tag === "polygon" }];
  }
  function rgbaOf(s, a) {
    const m = /rgba?\(([^)]*)\)/.exec(s || ""); if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return [r3(p[0] / 255), r3(p[1] / 255), r3(p[2] / 255), r3((p.length > 3 ? p[3] : 1) * a)];
  }
  /* the <clipPath> an element of the SVG is cut by (its own clip-path or a parent group's, inside the SVG): its one closed outline in the
     SVG box's px; null = no clip; false = a clip a shape layer cannot do (CSS shapes, objectBoundingBox units, several outlines, nested clips).
     The rig's shirt patterns (plaid, stripe, hem band: KI-12) are cut by the torso outline this way. */
  function clipOf(el, svg, box) {
    let ref = null, id = null;
    for (let x = el; x && x !== svg; x = x.parentElement) {
      const c = getComputedStyle(x).clipPath;
      if (!c || c === "none") continue;
      const m = /^url\(["']?#([^"')]+)["']?\)$/.exec(c);
      if (!m || ref) return false;
      ref = x; id = m[1];
    }
    if (!ref) return null;
    const cp = svg.querySelector("#" + CSS.escape(id));
    if (!cp || cp.tagName.toLowerCase() !== "clippath" || (cp.getAttribute("clipPathUnits") || "userSpaceOnUse") !== "userSpaceOnUse") return false;
    const R = ref.getScreenCTM(); if (!R) return false;
    const out = [];
    for (const ch of cp.children) {
      const tag = ch.tagName.toLowerCase(); if (!DRAW.has(tag)) return false;
      const subs = geom(ch, tag); if (!subs) return false;
      const t = ch.transform && ch.transform.baseVal.consolidate(), T = t ? t.matrix : null;
      const M = T ? new DOMMatrix([R.a, R.b, R.c, R.d, R.e, R.f]).multiply(new DOMMatrix([T.a, T.b, T.c, T.d, T.e, T.f])) : R;
      for (const s of subs) out.push({ v: s.v.map(q => [r3(M.a * q[0] + M.c * q[1] + M.e - box.left), r3(M.b * q[0] + M.d * q[1] + M.f - box.top)]),
                                      i: s.i.map(q => [r3(M.a * q[0] + M.c * q[1]), r3(M.b * q[0] + M.d * q[1])]),
                                      o: s.o.map(q => [r3(M.a * q[0] + M.c * q[1]), r3(M.b * q[0] + M.d * q[1])]), c: true });
    }
    return out.length === 1 ? out : false;
  }
  /* a stroked straight segment -> the filled quad it paints (butt / square caps), so it can be cut by Merge Paths (Intersect) in AE */
  function quadOf(a, b, w, cap) {
    let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy); if (!L) return null;
    dx /= L; dy /= L; const e = cap === "square" ? w / 2 : 0, nx = -dy * w / 2, ny = dx * w / 2;
    const A = [a[0] - dx * e, a[1] - dy * e], B = [b[0] + dx * e, b[1] + dy * e];
    const v = [[A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny], [A[0] - nx, A[1] - ny]].map(q => [r3(q[0]), r3(q[1])]);
    return { v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), c: true };
  }
  function vecOf(svg) {
    const box = svg.getBoundingClientRect(), items = [], car = [];
    for (const el of svg.querySelectorAll("*")) {
      const tag = el.tagName.toLowerCase();
      if (!OKTAG.has(tag)) return null;
      if (tag === "defs" || tag === "clippath" || el.closest("clipPath, defs")) continue;      // definitions: drawn only through what uses them
      const cs = getComputedStyle(el);
      if ((cs.maskImage && cs.maskImage !== "none") || (cs.filter && cs.filter !== "none") || cs.mixBlendMode !== "normal") return null;
      if (!DRAW.has(tag) || cs.display === "none") continue;
      if (/url\(/.test(cs.fill) || /url\(/.test(cs.stroke)) return null;
      const clip = clipOf(el, svg, box); if (clip === false) return null;
      const subs = geom(el, tag), M = el.getScreenCTM();
      if (!subs || !M) return null;
      if (!subs.length) continue;
      const P = (x, y) => [r3(M.a * x + M.c * y + M.e - box.left), r3(M.b * x + M.d * y + M.f - box.top)];
      const D = (x, y) => [r3(M.a * x + M.c * y), r3(M.b * x + M.d * y)];
      const p = subs.map(s => ({ v: s.v.map(q => P(q[0], q[1])), i: s.i.map(q => D(q[0], q[1])), o: s.o.map(q => D(q[0], q[1])), c: s.c }));
      let so = 1; const cr = [];
      for (let x = el; x && x !== svg; x = x.parentElement) {
        if (x.id) { let j = car.indexOf(x); if (j < 0) { j = car.length; car.push(x); } cr.push(j); }
        else so *= parseFloat(getComputedStyle(x).opacity);
      }
      const k = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)), sw = parseFloat(cs.strokeWidth) * k;
      // a straight two-point line paints no fill (the rig's plaid lines have the default black fill): no fill for it
      const line = p.every(s => !s.c && s.v.length === 2 && [...s.i, ...s.o].every(q => Math.abs(q[0]) < 1e-3 && Math.abs(q[1]) < 1e-3));
      const f = cs.fill === "none" || line ? null : rgbaOf(cs.fill, parseFloat(cs.fillOpacity));
      const st = cs.stroke === "none" || !(sw > 0) ? null : { c: rgbaOf(cs.stroke, parseFloat(cs.strokeOpacity)), w: r3(sw), cap: cs.strokeLinecap, join: cs.strokeLinejoin };
      if (!f && !st) continue;
      const name = el.id || el.closest("[id]") && el.closest("[id]") !== svg && el.closest("[id]").id || tag;
      if (clip) {                                      // cut by a clip outline: a fill of one closed outline, or straight strokes as quads
        if (f && !st && p.length === 1 && p[0].c) { items.push({ name, p, f, r: "nonzero", s: null, u: false, so: r3(so), car: cr, clip }); continue; }
        const straight = p.every(s => !s.c && [...s.i, ...s.o].every(q => Math.abs(q[0]) < 1e-3 && Math.abs(q[1]) < 1e-3));
        if (!f && st && straight && st.cap !== "round") {
          for (const s of p) for (let j = 0; j + 1 < s.v.length; j++) {
            const q = quadOf(s.v[j], s.v[j + 1], st.w, st.cap);
            if (q) items.push({ name, p: [q], f: st.c, r: "nonzero", s: null, u: false, so: r3(so), car: cr, clip });
          }
          continue;
        }
        return null;                                   // anything else cut by a clip stays a picture
      }
      items.push({ name, p, f, r: cs.fillRule === "evenodd" ? "evenodd" : "nonzero",
                   s: st, u: /^stroke/.test(cs.paintOrder || ""), so: r3(so), car: cr });
    }
    if (!items.length) return null;
    return { out: { items, nCar: car.length }, car };
  }
  const vecOpacity = n => VEC[n].map(x => { const o = x.style.opacity; return o === "" ? 1 : r3(parseFloat(o)); });

  /* per element: [list of ancestors (inside its group root, outermost first)] */
  function chain(e, rootEl) { const out = []; for (let x = e; x && x !== rootEl && x !== stage; x = parentOf(x)) out.unshift(x); return out; }
  function tf(cs) {
    let m = new DOMMatrix();
    if (cs.translate && cs.translate !== "none") { const p = cs.translate.split(" ").map(parseFloat); m = m.translate(p[0] || 0, p[1] || 0); }
    if (cs.rotate && cs.rotate !== "none") { const v = cs.rotate.split(" "); m = m.rotate(parseFloat(v[v.length - 1]) || 0); }
    if (cs.scale && cs.scale !== "none") { const p = cs.scale.split(" ").map(parseFloat); m = m.scale(p[0], p.length > 1 ? p[1] : p[0]); }
    if (cs.transform && cs.transform !== "none") m = m.multiply(new DOMMatrix(cs.transform));
    return m;
  }
  function blurOf(f) { const m = /blur\(([\d.]+)px\)/.exec(f || ""); return m ? +m[1] : 0; }
  let sigCv = null, sigN = 0;
  function canvasSig(el) {
    try {
      if (!el.width || !el.height) return "0";
      sigCv = sigCv || Object.assign(document.createElement("canvas"), { width: 32, height: 18 });
      const c = sigCv.getContext("2d", { willReadFrequently: true });
      c.clearRect(0, 0, 32, 18); c.drawImage(el, 0, 0, 32, 18);
      const d = c.getImageData(0, 0, 32, 18).data;
      let h = 2166136261; for (let i = 0; i < d.length; i += 2) h = Math.imul(h ^ d[i], 16777619);
      return (h >>> 0).toString(36);
    } catch (e) { return "x" + (++sigN); }
  }
  function sigOf(el, cs, n) {
    let s = [cs.backgroundImage,                                    // background colour: sampled on its own (shape fill keys) cs.backgroundPosition, cs.backgroundSize, cs.borderColor, cs.borderWidth, cs.borderRadius, cs.boxShadow,
             cs.color, cs.mixBlendMode].join("|");                       // filters are AE effects (keyed), not part of the picture
    for (const w of ["::before", "::after"]) if (pseudo(el, w)) { const p = getComputedStyle(el, w); s += "|" + [p.opacity, p.backgroundImage, p.backgroundColor, p.transform, p.width, p.height, p.left, p.top, p.boxShadow].join(","); }
    // a vector SVG (VEC) is signed by its geometry only: its groups' opacity is sampled on its own (vo) and keyed in AE
    // a canvas drawn by film code keeps the same HTML while its picture changes: sign it by its pixels (a 32 x 18 copy), or every
    // sample differs when they cannot be read (a tainted canvas). It used to become ONE still (the background world and
    // the light sweep were lost in AE). A video by its time.
    if (el.tagName === "CANVAS") s += "|" + canvasSig(el);
    // an SVG pictured as a whole (not a vector shape layer) changes inside: its children's attributes and styles (a
    // card drawn into a laptop inside one <svg> was signed by the <svg>'s own CSS only, became ONE still shot before it was drawn: empty)
    if (el.tagName.toLowerCase() === "svg" && !VEC[n]) s += "|" + fnv(el.innerHTML);
    if (el.tagName === "VIDEO") s += "|" + el.currentTime.toFixed(3);
    if (el.tagName !== "IMG" && (cs.webkitBackgroundClip || cs.backgroundClip) === "text") s += "|" + el.textContent;
    return fnv(s);
  }
  /* baseline start of every line of a text element, relative to its layout box (call with transforms off) */
  function lines(el, box) {
    const doc = el.ownerDocument;                                   // a block page's text: its own document (ranges, the marker, its fonts)
    const out = [], tn = []; const w = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (!el.dataset.aimkDirect || n.parentNode === el) tn.push(n);
    const cs = getComputedStyle(el);
    let cur = null;
    for (const t of tn) {
      // a span styled apart ("Open jobs <span 26px>(4 results)</span>"): its letters are a run [a, b, style] of
      // the line, AE sets them per letter (characterRange)
      const pc = t.parentNode === el ? null : getComputedStyle(t.parentNode);
      const k = pc && ["fontSize", "fontWeight", "fontStyle", "fontFamily", "color"].some(p => pc[p] !== cs[p])
        ? [parseFloat(pc.fontSize), pc.fontWeight, pc.fontStyle, pc.fontFamily, pc.color] : null;
      for (let i = 0; i < t.textContent.length; i++) {
        const r = doc.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); const rs = r.getClientRects(); if (!rs.length) continue;
        const q = rs[0], ch = t.textContent[i];
        // a new line starts below the current one's letters: a smaller letter on the same line sits lower (its middle stays inside)
        if (!cur || (q.top + q.bottom) / 2 > cur.bottom) { cur = { top: q.top, bottom: q.bottom, left: q.left, right: q.right, s: "", r: [] }; out.push(cur); }
        if (k) { const l = cur.r[cur.r.length - 1]; if (l && l[1] === cur.s.length && l[2] === k) l[1]++; else cur.r.push([cur.s.length, cur.s.length + 1, k]); }
        cur.s += ch; cur.right = Math.max(cur.right, q.right); cur.left = Math.min(cur.left, q.left); cur.bottom = Math.max(cur.bottom, q.bottom);
      }
    }
    // baseline: a zero-size inline-block at the start of the text sits on the first line's baseline
    const mk = doc.createElement("span"); mk.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0";
    const first = tn.find(t => t.textContent.trim());
    let base = null;
    if (first) { first.parentNode.insertBefore(mk, first); base = mk.getBoundingClientRect().bottom; mk.remove(); }
    // ink width of each line (canvas measureText, same font): AE's sourceRectAtTime measures ink, not advance boxes, so this is what the
    // AE port fits its tracking to (one-line text)
    const cvs = lines.cv || (lines.cv = new Map());                 // one canvas per document: a page's @font-face fonts are its own
    if (!cvs.has(doc)) cvs.set(doc, doc.createElement("canvas"));
    const cx = cvs.get(doc).getContext("2d");
    cx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; try { cx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing; } catch (e) {}
    const tt = s => cs.textTransform === "uppercase" ? s.toUpperCase() : cs.textTransform === "lowercase" ? s.toLowerCase() : s;
    const ink = s => { const m = cx.measureText(tt(s)); return +(m.actualBoundingBoxLeft + m.actualBoundingBoxRight).toFixed(2); };
    const runs = (l, n) => l.r.filter(r => r[0] < n).map(r => [r[0], Math.min(r[1], n), ...r[2]]);
    return { lines: out.map(l => { const s = l.s.replace(/\s+$/, ""), o = { s, x0: +(l.left - box.left).toFixed(2), x1: +(l.right - box.left).toFixed(2),
                                                                         top: +(l.top - box.top).toFixed(2), ink: ink(s) };
                                   if (runs(l, s.length).length) o.r = runs(l, s.length);
                                   return o; }),
             base: base == null ? null : +(base - box.top).toFixed(2) };
  }

  async function sample(times, opts) {
    const A = window.__aimk;
    const rootOf = g => ELS[GROUPS[g].root];
    // per tracked element: which elements' state we need (the element and its ancestors up to the group root)
    const need = new Set(), chains = {};
    for (const nd of NODES) { const el = ELS[nd.e], root = nd.g === 0 ? stage : rootOf(nd.g); chains[nd.e] = chains[nd.e] || chain(el, root); chains[nd.e].forEach(x => need.add(x)); need.add(el); }
    for (const G of GROUPS) if (G.kind === "scene") { const c = ELS[G.clip], i = ELS[G.root]; chains["g" + G.g] = chain(i, stage); chains["g" + G.g].forEach(x => need.add(x)); }
    const NEED = [...need];
    const out = { t: [], nodes: NODES.map(() => []), groups: GROUPS.map(() => []) };
    const lastText = {}, lastCol = {}, lastSrc = {}, lastVo = {};
    for (let k = 0; k < times.length; k++) {
      const t = times[k]; await A.seek(t);
      const st = new Map();
      for (const x of NEED) {
        const cs = getComputedStyle(x), o = cs.transformOrigin.split(" ").map(parseFloat);
        st.set(x, { m: tf(cs), o, op: parseFloat(cs.opacity), vis: cs.visibility === "visible", blur: blurOf(cs.filter), f: cs.filter === "none" ? "" : cs.filter.replace(/blur\([^)]*\)/g, "").trim(), cp: cs.clipPath, br: cs.borderRadius, ov: cs.overflowX + cs.overflowY });
      }
      const sigs = {}, texts = {}, cols = {}, srcs = {}, vos = {};
      const doSig = !opts.sigEvery || k % opts.sigEvery === 0;
      for (const nd of NODES) {
        const el = ELS[nd.e];
        if ((nd.kind === "box" || nd.kind === "raster" || nd.kind === "image") && doSig) sigs[nd.n] = sigOf(el, getComputedStyle(el), nd.n);
        if (VEC[nd.n]) { const v = vecOpacity(nd.n), key = v.join(","); if (key !== lastVo[nd.n]) { vos[nd.n] = v; lastVo[nd.n] = key; } }   // vector groups' opacity
        if (nd.kind === "text") texts[nd.n] = nd.direct ? [...el.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join("") : el.textContent;
        if (nd.kind === "text") { const c = getComputedStyle(el).color; if (c !== lastCol[nd.n]) { cols[nd.n] = c; lastCol[nd.n] = c; } }   // text colour changes (captions accent): recorded when it changes
        // a picture that swaps its file (motion/image-sequence: f0001.webp, f0002.webp...): the src, recorded when it changes
        // (port.py makes such an <img> one AE image-sequence footage with Time Remap keys instead of a still)
        if (nd.kind === "image") { const s = el.getAttribute("src") || ""; if (s !== lastSrc[nd.n]) { srcs[nd.n] = s; lastSrc[nd.n] = s; } }
      }
      const nt = addStyle(NT);
      const sr = stage.getBoundingClientRect(), off = new Map([[document, [-sr.left, -sr.top]]]);
      for (const f of FRAMES) { const r = f.getBoundingClientRect(); off.set(f.contentDocument, [r.left - sr.left + f.clientLeft, r.top - sr.top + f.clientTop]); }
      for (const x of NEED) { const r = x.getBoundingClientRect(), s = st.get(x), o = off.get(x.ownerDocument) || [0, 0];
                              s.L = [r.left + o[0], r.top + o[1], r.width, r.height]; s.shown = x.getClientRects().length > 0; }
      const tl = {};
      for (const nd of NODES) if (nd.kind === "text" && texts[nd.n] !== lastText[nd.n]) {
        const el = ELS[nd.e]; tl[nd.n] = lines(el, el.getBoundingClientRect()); lastText[nd.n] = texts[nd.n];
      }
      nt.forEach(s => s.remove());
      const world = (list) => {           // matrix from the layout space of the last element to the group space, opacity product
        let M = new DOMMatrix(), op = 1, vis = true, blur = 0, fl = "";
        for (const x of list) {
          const s = st.get(x);
          if (!s.m.isIdentity) { const ox = s.L[0] + s.o[0], oy = s.L[1] + s.o[1]; M = M.translate(ox, oy).multiply(s.m).translate(-ox, -oy); }
          op *= s.op; vis = vis && s.shown; blur += s.blur; if (s.f) fl += (fl ? " " : "") + s.f;
        }
        if (list.length) vis = vis && st.get(list[list.length - 1]).vis;     // empty list: the group root itself (its paint in its own comp)
        return { M, op, vis, blur, fl };
      };
      out.t.push(t);
      for (const nd of NODES) {
        const el = ELS[nd.e], ch = chains[nd.e], s = st.get(el);
        const w = world(ch), root = nd.g === 0 ? null : st.get(rootOf(nd.g));
        const L = s.L.slice(); if (root) { L[0] -= root.L[0]; L[1] -= root.L[1]; }
        // the group root's own layout offset: group space = root layout space
        let M = w.M; if (root) M = new DOMMatrix().translate(-root.L[0], -root.L[1]).multiply(M).translate(root.L[0], root.L[1]);
        const rec = [+M.a.toFixed(5), +M.b.toFixed(5), +M.c.toFixed(5), +M.d.toFixed(5), +M.e.toFixed(3), +M.f.toFixed(3),
                     +L[0].toFixed(3), +L[1].toFixed(3), +L[2].toFixed(3), +L[3].toFixed(3), +s.o[0].toFixed(3), +s.o[1].toFixed(3),
                     +(w.vis ? w.op : 0).toFixed(4), +s.blur.toFixed(3)];
        const extra = {};
        if (nd.kind === "clip") { extra.cp = s.cp; extra.br = s.br; }
        if (nd.kind === "text") { extra.tx = texts[nd.n]; if (tl[nd.n]) extra.ln = tl[nd.n]; if (cols[nd.n] !== undefined) extra.col = cols[nd.n]; }
        if (sigs[nd.n] !== undefined) extra.sig = sigs[nd.n];
        if (srcs[nd.n] !== undefined) extra.src = srcs[nd.n];
        if (vos[nd.n] !== undefined) extra.vo = vos[nd.n];
        if (nd.kind === "box") extra.bg = getComputedStyle(el).backgroundColor;
        if (w.fl) extra.fl = w.fl;
        out.nodes[nd.n].push(Object.keys(extra).length ? [rec, extra] : [rec]);
      }
      for (const G of GROUPS) if (G.kind === "scene") {
        const ch = chains["g" + G.g], w = world(ch), s = st.get(ELS[G.root]);
        out.groups[G.g].push([+w.M.a.toFixed(5), +w.M.b.toFixed(5), +w.M.c.toFixed(5), +w.M.d.toFixed(5), +w.M.e.toFixed(3), +w.M.f.toFixed(3),
                              +s.L[0].toFixed(3), +s.L[1].toFixed(3), +s.L[2].toFixed(3), +s.L[3].toFixed(3), +s.o[0].toFixed(3), +s.o[1].toFixed(3),
                              +(w.vis ? w.op : 0).toFixed(4), +w.blur.toFixed(3), s.cp, s.br, w.fl]);
      }
    }
    return out;
  }

  /* SVG filters (filter: url(#id)) of an element and of its parents up to the stage, own first: the PSD intake puts a layer group's stroke and
     drop shadow on the group's wrapper (KI-01: its text became plain text layers in AE, its pictures lost them too) */
  const svgUrls = el => {
    const out = [];
    for (let x = el; x; x = parentOf(x)) {
      for (const m of (getComputedStyle(x).filter || "").matchAll(/url\(["']?#([^"')]+)["']?\)/g)) out.push([m[1], x.ownerDocument]);
      if (x === stage) break;
    }
    return out;
  };
  /* one SVG filter -> { s: [radius, colour, opacity] (outer stroke) | null, sh: [[dx, dy, stdDeviation, colour, opacity]...], ok }: follows the
     primitives' in / result graph; a stroke is a flood kept inside a dilated alpha, a shadow a flood inside an offset / blurred alpha (or
     feDropShadow); anything else (colour matrix, turbulence...) is ok: false and stays baked into a picture */
  function svgFx([id, doc]) {
    const fe = doc.getElementById(id), out = { s: null, sh: [], ok: !!fe && fe.tagName.toLowerCase() === "filter" };
    if (!out.ok) return out;
    const R = {}, SRC = { k: "src" }; let prev = SRC;
    const get = n => !n ? prev : (n === "SourceGraphic" || n === "SourceAlpha") ? SRC : (R[n] || SRC);
    for (const p of fe.children) {
      const t = p.tagName.toLowerCase().replace(/^fe/, ""), a = n => p.getAttribute(n), cs = getComputedStyle(p);
      const num = (n, d) => { const v = parseFloat(a(n)); return isNaN(v) ? d : v; };
      let d;
      if (t === "morphology") d = a("operator") === "dilate" ? { k: "dilate", base: get(a("in")), r: num("radius", 0) } : { k: "bad" };
      else if (t === "offset") d = { k: "offset", base: get(a("in")), dx: num("dx", 0), dy: num("dy", 0) };
      else if (t === "gaussianblur") d = { k: "blur", base: get(a("in")), sd: num("stdDeviation", 0) };
      else if (t === "flood") d = { k: "flood", c: cs.floodColor, op: parseFloat(cs.floodOpacity) };
      else if (t === "composite") d = { k: "comp", top: get(a("in")), mask: get(a("in2")), op: a("operator") || "over" };
      else if (t === "merge") d = { k: "merge", parts: [...p.children].map(m => get(m.getAttribute("in"))) };
      else if (t === "dropshadow") d = { k: "ds", base: get(a("in")), dx: num("dx", 2), dy: num("dy", 2), sd: num("stdDeviation", 2), c: cs.floodColor, op: parseFloat(cs.floodOpacity) };
      else d = { k: "bad" };
      if (a("result")) R[a("result")] = d;
      prev = d;
    }
    const chain = d => { const c = { r: 0, dx: 0, dy: 0, sd: 0, ok: true };       // a mask's way back to the source (a merge = the layer so far)
      for (let x = d; x && x.k !== "src" && x.k !== "merge"; x = x.base) {
        if (x.k === "dilate") c.r += x.r; else if (x.k === "offset") { c.dx += x.dx; c.dy += x.dy; } else if (x.k === "blur") c.sd = Math.hypot(c.sd, x.sd);
        else { c.ok = false; break; } }
      return c; };
    const walk = d => {
      if (!d || d.k === "src" || !out.ok) return;
      if (d.k === "merge") { d.parts.forEach(walk); return; }
      if (d.k === "comp" && d.op === "in" && d.top && d.top.k === "flood") {
        const c = chain(d.mask);
        if (!c.ok) out.ok = false;
        else if (c.dx || c.dy || c.sd) out.sh.push([c.dx, c.dy, c.sd, d.top.c, d.top.op]);
        else if (c.r > 0 && !out.s) out.s = [c.r, d.top.c, d.top.op];
        else out.ok = false;
        return;
      }
      if (d.k === "ds") { const c = chain(d.base); if (!c.ok) { out.ok = false; return; } out.sh.push([d.dx + c.dx, d.dy + c.dy, Math.hypot(d.sd, c.sd), d.c, d.op]); return; }
      out.ok = false;
    };
    walk(prev);
    return out;
  }

  /* static info per node (fonts, colours, radii, blend) read once at a given time */
  function styles() {
    return NODES.map(nd => {
      const el = ELS[nd.e], cs = getComputedStyle(el);
      let blend = cs.mixBlendMode;                       // a blend mode on a container (no paint of its own) applies to what it holds
      for (let x = parentOf(el); blend === "normal" && x && x !== stage; x = parentOf(x)) blend = getComputedStyle(x).mixBlendMode;
      const o = { blend, radius: cs.borderRadius, bg: cs.backgroundColor, bgi: cs.backgroundImage, shadow: cs.boxShadow, filter: cs.filter,
                  bw: cs.borderTopWidth, bc: cs.borderTopColor, bs: cs.borderTopStyle, uniformBorder: ["Right", "Bottom", "Left"].every(s => cs["border" + s + "Width"] === cs.borderTopWidth && cs["border" + s + "Color"] === cs.borderTopColor),
                  pseudo: pseudo(el, "::before") || pseudo(el, "::after") };
      // SVG filters of the element and its groups (filter: url(#id): PSD layer / group stroke + drop shadow): a picture bakes them in
      // (isolate), so svgPad = how far they reach; a text layer gets them as AE text stroke + Drop Shadow (svgFx, port.py)
      const urls = svgUrls(el);
      if (urls.length) {
        let pad = 0;
        for (const [id, doc] of urls) { const fe = doc.getElementById(id); let r = 0, dx = 0, dy = 0, sd = 0;
          if (fe) for (const p of fe.querySelectorAll("*")) { r = Math.max(r, +(p.getAttribute("radius") || 0)); dx = Math.max(dx, Math.abs(+(p.getAttribute("dx") || 0)));
            dy = Math.max(dy, Math.abs(+(p.getAttribute("dy") || 0))); sd = Math.max(sd, +(p.getAttribute("stdDeviation") || 0)); }
          pad += r + Math.max(dx, dy) + 3 * sd + 2; }
        o.svgPad = Math.ceil(pad);
        const fx = urls.map(svgFx);
        o.svgFx = { ok: fx.every(f => f.ok), s: (fx.find(f => f.s) || {}).s || null, sh: [].concat(...fx.map(f => f.sh)) };
      }
      if (nd.kind === "text") Object.assign(o, { font: cs.fontFamily, weight: cs.fontWeight, style: cs.fontStyle, size: parseFloat(cs.fontSize), color: cs.color,
        ls: cs.letterSpacing, lh: cs.lineHeight, align: cs.textAlign, transform: cs.textTransform, shadowT: cs.textShadow, stroke: cs.webkitTextStrokeWidth, strokeC: cs.webkitTextStrokeColor, po: cs.paintOrder, decoration: cs.textDecorationLine });
      return o;
    });
  }

  /* make only one node's own paint visible, at its layout place, untransformed, full opacity (for a PNG of it); returns the box to shoot */
  let iso = null, isoF = null;
  function isolate(n, pad, margin, keepT, hideText) {
    const nd = NODES[n], el = ELS[nd.e];
    // the element's own static filter (glow, drop-shadow) is part of its picture; its blur is not (AE Gaussian Blur, keyed)
    // SVG filters stay in the picture (inline !important beats the hiding rule below): the element's own and its groups' (a stroked PSD
    // group: each picture inside gets the group's stroke + shadow, KI-01), read BEFORE the hiding rule sets every filter to none.
    // CSS filter functions (blur, drop-shadow...) stay AE effects.
    const fu = svgUrls(el).filter(u => u[1] === el.ownerDocument).map(([id]) => `url("#${id}")`);   // a filter of another document cannot be named here
    isoF = [el.style.getPropertyValue("filter"), el.style.getPropertyPriority("filter")];
    iso = document.createElement("style");
    const all = nd.kind === "raster" || nd.kind === "image";
    // keepT: the picture keeps the element's transforms (skew: AE layers cannot skew), except those of its comp root (the precomp layer has them)
    if (keepT) { const root = nd.g === 0 ? stage : ELS[GROUPS[nd.g].root]; for (let x = root; x; x = x.parentElement) x.dataset.aimkNt = "1"; }
    // the inside of an SVG keeps its own clip paths, opacities and masks (KI-12: the rig's shirt plaid, cut by a clipPath at 55 %
    // opacity, was pictured uncut and opaque): only HTML elements and the SVG element itself are reset
    iso.textContent = (keepT ? "[data-aimk-nt]{transform:none!important;translate:none!important;rotate:none!important;scale:none!important}" : NT) + `html,body{background:transparent!important;overflow:visible!important}
#${CSS.escape(stage.id || "stage")}, #${CSS.escape(stage.id || "stage")} *{visibility:hidden!important}
#${CSS.escape(stage.id || "stage")}, #${CSS.escape(stage.id || "stage")} *:not(svg *){opacity:1!important;overflow:visible!important;clip-path:none!important;filter:none!important;mix-blend-mode:normal!important;mask:none!important;-webkit-mask:none!important}
#${CSS.escape(stage.id || "stage")} [data-aimk-iso]{visibility:visible!important}` + (all ? `#${CSS.escape(stage.id || "stage")} [data-aimk-iso] *{visibility:visible!important}` : "")   // same id weight as the hiding rule, so these win
      + (hideText ? `#${CSS.escape(stage.id || "stage")} [data-aimk-iso]{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}` : "");   // the box only: its own text is a text layer
    // an element of a block's page: the iframe stays visible in the film, the page hides all but the element (same rules, its own document)
    const fr = el.ownerDocument !== document ? el.ownerDocument.defaultView.frameElement : null;
    if (fr) {
      fr.dataset.aimkIsoFrame = "1";
      iso.textContent += `#${CSS.escape(stage.id || "stage")} [data-aimk-iso-frame]{visibility:visible!important}`;
      isoIn = el.ownerDocument.createElement("style");
      isoIn.textContent = (keepT ? "" : NT) + `html,body{background:transparent!important;overflow:visible!important}
body,body *{visibility:hidden!important}
body,body *:not(svg *){opacity:1!important;overflow:visible!important;clip-path:none!important;filter:none!important;mix-blend-mode:normal!important;mask:none!important;-webkit-mask:none!important}
body [data-aimk-iso]{visibility:visible!important}` + (all ? "body [data-aimk-iso] *{visibility:visible!important}" : "")
        + (hideText ? "body [data-aimk-iso]{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}" : "");
      el.ownerDocument.head.appendChild(isoIn);
    }
    document.head.appendChild(iso);
    el.dataset.aimkIso = "1";
    if (fu.length) el.style.setProperty("filter", fu.join(" "), "important");
    // the stage moves `margin` px right and down inside a page that is 2 x margin larger: parts outside the frame get pictured too
    margin = margin || 0;
    if (margin) for (const [k, v] of [["position", "relative"], ["left", margin + "px"], ["top", margin + "px"]]) stage.style.setProperty(k, v, "important");
    const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), f0 = fr ? fr.getBoundingClientRect() : { left: 0, top: 0 };
    const box = [r.left + f0.left - sr.left - pad, r.top + f0.top - sr.top - pad, r.width + 2 * pad, r.height + 2 * pad];
    return { box, page: [box[0] + sr.left, box[1] + sr.top, box[2], box[3]], stage: [sr.left, sr.top] };
  }
  let isoIn = null;
  function restore(n) {
    const el = ELS[NODES[n].e]; delete el.dataset.aimkIso;
    for (const k of ["position", "left", "top"]) stage.style.removeProperty(k);
    for (const x of document.querySelectorAll("[data-aimk-nt]")) delete x.dataset.aimkNt;
    for (const x of document.querySelectorAll("[data-aimk-iso-frame]")) delete x.dataset.aimkIsoFrame;
    el.style.removeProperty("filter"); if (isoF && isoF[0]) el.style.setProperty("filter", isoF[0], isoF[1] || "");
    if (iso) iso.remove(); iso = null;
    if (isoIn) isoIn.remove(); isoIn = null;
  }
  return { structure, sample, styles, isolate, restore };
})();

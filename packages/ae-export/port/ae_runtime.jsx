/* Moworks Motion: After Effects port runtime (ExtendScript, ES3). engine/ae/port.py writes `var DATA = {...};` in front of this file.
   Based on the v1 runtime proven on a v1 client film (3 Oct 2026). Every comp, layer, key and effect stays native and editable.
   Keys: [time (comp time), value, inSpeed, outSpeed, hold]; value / speeds are numbers or arrays (per dimension); speeds in units per second.
   NEVER add app.executeCommand, openInViewer or layer styles here: AE froze for over an hour when a build script did. */
(function () {
  var LOG = [], T0 = new Date().getTime(), DONE = 0, TOTAL = 0;
  function log(s) {
    LOG.push(s);
    try { var p = new File(DATA.log + ".progress"); p.encoding = "UTF-8"; p.open("a"); p.writeln(((new Date().getTime() - T0) / 1000).toFixed(1) + " s  " + s); p.close(); } catch (e) {}
  }
  function finish(ok) {
    log((ok ? "OK" : "FAILED") + " in " + ((new Date().getTime() - T0) / 1000).toFixed(1) + " s");
    var f = new File(DATA.log); f.encoding = "UTF-8"; f.open("w"); f.write(LOG.join("\n")); f.close();
    var d = new File(DATA.done); d.encoding = "UTF-8"; d.open("w"); d.write(LOG.join("\n")); d.close();
  }
  var BLEND = { normal: BlendingMode.NORMAL, multiply: BlendingMode.MULTIPLY, screen: BlendingMode.SCREEN, overlay: BlendingMode.OVERLAY,
    "color-dodge": BlendingMode.COLOR_DODGE, "color-burn": BlendingMode.COLOR_BURN, "plus-lighter": BlendingMode.ADD, lighten: BlendingMode.LIGHTEN,
    darken: BlendingMode.DARKEN, "soft-light": BlendingMode.SOFT_LIGHT, "hard-light": BlendingMode.HARD_LIGHT, difference: BlendingMode.DIFFERENCE };

  var FOLDERS = {};
  function folder(path) {
    if (FOLDERS[path]) return FOLDERS[path];
    var parts = path.split("/"), parent = app.project.rootFolder, acc = "";
    for (var i = 0; i < parts.length; i++) {
      acc = acc ? acc + "/" + parts[i] : parts[i];
      if (!FOLDERS[acc]) { var f = app.project.items.addFolder(parts[i]); f.parentFolder = parent; if (i === 0) f.comment = "Moworks Motion port"; FOLDERS[acc] = f; }
      parent = FOLDERS[acc];
    }
    return FOLDERS[path];
  }
  var FOOT = {};
  function footage(src, seq, first) {
    if (FOOT[src]) return FOOT[src];
    // a path of its own (the client's original sequence, imported where it lies: motion/image-sequence "source") or one in the port's folder
    var path = /^([A-Za-z]:|\/)/.test(src) ? src : DATA.base + src, io;
    // a sequence folder: the kit's own PNG sequences, or a film's image sequence copied as it is (png, jpg, tif, psd...);
    // first: the sequence's first file when the folder holds other files too (other colours of a product render)
    if (seq && first) { io = new ImportOptions(new File(first)); io.sequence = true; io.forceAlphabetical = false; }
    else if (seq) { var fs = new Folder(path).getFiles(function (f) { return f instanceof File && /\.(png|jpe?g|tiff?|psd|tga|bmp|exr)$/i.test(f.name); });
      fs.sort(); io = new ImportOptions(fs[0]); io.sequence = true; io.forceAlphabetical = true; }
    else io = new ImportOptions(new File(path));
    var it = app.project.importFile(io);
    if (seq) it.mainSource.conformFrameRate = DATA.fps;
    it.parentFolder = folder(DATA.root + "/Footage");
    FOOT[src] = it; return it;
  }
  var COMPS = {};

  function prop(layer, path) {
    var p = layer;
    for (var i = 0; i < path.length; i++) { p = p.property(path[i]); if (!p) throw new Error("no property " + path.join(" > ") + " at " + path[i] + " on " + layer.name); }
    return p;
  }
  function easeCount(p) {
    var t = p.propertyValueType;
    if (t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL) return 1;
    return p.value instanceof Array ? p.value.length : 1;
  }
  function fitVal(p, v) {                                 // [x, y] onto a 3D value (anchor / scale of a 2D layer), scalar onto an array
    if (!(p.value instanceof Array)) return v instanceof Array ? v[0] : v;
    if (!(v instanceof Array)) { var a = []; for (var i = 0; i < p.value.length; i++) a.push(v); return a; }
    if (v.length < p.value.length) { var b = v.slice(0); while (b.length < p.value.length) b.push(p.matchName === "ADBE Scale" ? 100 : 0); return b; }
    return v;
  }
  // key speeds: a spatial property (2D / 3D position) takes one speed magnitude; every other property takes a SIGNED speed per dimension.
  // A scalar speed used to go through Math.abs: values that go down (x moving left, opacity fading out, rotation back) got their
  // tangents flipped and the curve bulged the wrong way between keys (curtain-reveal left folds 20-30 px off mid-motion; right side fine).
  function speeds(s, n, spatial) {
    if (!(s instanceof Array)) { var a = []; for (var i = 0; i < n; i++) a.push(spatial ? Math.abs(s) : s); return a; }
    if (n === 1) { var m = 0; for (var j = 0; j < s.length; j++) m += s[j] * s[j]; return [Math.sqrt(m)]; }
    var b = s.slice(0); while (b.length < n) b.push(b[b.length - 1]); return b;
  }
  function setKeys(p, keys) {
    for (var i = 0; i < keys.length; i++) p.setValueAtTime(keys[i][0], fitVal(p, keys[i][1]));
    var n = easeCount(p), sp = p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i], idx = p.nearestKeyIndex(k[0]), si = speeds(k[2], n, sp), so = speeds(k[3], n, sp), a = [], b = [];
      for (var d = 0; d < n; d++) { a.push(new KeyframeEase(si[d], 33.333)); b.push(new KeyframeEase(so[d], 33.333)); }
      // NOTE: setTemporalEaseAtKey turns a HOLD key back into Bezier, so the hold flag k[4] has always ended as a smooth key in
      // AE, and port.py's key fitting is tuned to that (making those holds real put two of the 18 AE cases 0.4-0.6 % further off). A REAL
      // switch (k[5]: a vector group shown / hidden by tl.set: the rig's expressions, hands, blink) is set to HOLD after the ease.
      try {
        p.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, k[4] ? KeyframeInterpolationType.HOLD : KeyframeInterpolationType.BEZIER);
        p.setTemporalEaseAtKey(idx, a, b);
        if (k[5]) p.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
      } catch (e) { log("ease " + p.name + " @" + k[0] + ": " + e); }
      if (p.isSpatial) { try { p.setSpatialTangentsAtKey(idx, [0, 0], [0, 0]); p.setRovingAtKey(idx, false); } catch (e2) {} }
    }
  }
  function applySet(L, path, v) { var p = prop(L, path); p.setValue(fitVal(p, v)); }

  function polyShape(verts) { var sh = new Shape(); sh.vertices = verts; sh.closed = true; return sh; }   // a CSS clip-path polygon
  // shape keys in ONE call, and linear only where AE did not make them so (a spotlight cone keyed every frame took 7 min
  // one key at a time)
  function shapeKeys(p, times, shapes) {
    p.setValuesAtTimes(times, shapes);
    for (var i = 1; i <= p.numKeys; i++)
      if (p.keyInInterpolationType(i) !== KeyframeInterpolationType.LINEAR || p.keyOutInterpolationType(i) !== KeyframeInterpolationType.LINEAR)
        p.setInterpolationTypeAtKey(i, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
  }
  function pathKeys(L, keys) {                          // a polygon that changes: one key where it changes, linear in between
    var p = prop(L, ["ADBE Root Vectors Group", 1, "ADBE Vectors Group", 1, "ADBE Vector Shape"]), t = [], v = [];
    for (var i = 0; i < keys.length; i++) { t.push(keys[i][0]); v.push(polyShape(keys[i][1])); }
    shapeKeys(p, t, v);
  }
  // a CSS clip-path: path() (port.py svg_path, KI-03): one shape per sub-path, Bezier tangents relative to their vertex
  function bezShape(P) { var sh = new Shape(); sh.vertices = P.v; sh.inTangents = P.i; sh.outTangents = P.o; sh.closed = P.c === true; return sh; }
  function bezKeys(L, keys) {                           // a path() that changes: one key per change on every sub-path, linear in between
    for (var q = 0; q < keys[0][1].length; q++) {
      var p = prop(L, ["ADBE Root Vectors Group", 1, "ADBE Vectors Group", q + 1, "ADBE Vector Shape"]), t = [], v = [];
      for (var i = 0; i < keys.length; i++) { t.push(keys[i][0]); v.push(bezShape(keys[i][1][q])); }
      shapeKeys(p, t, v);
    }
  }
  // a vector SVG (port.py svg_layer): one shape group per drawn element, added last-first so the SVG's last element ends on top of the
  // list (drawn in front); its paths keep their Bezier tangents; fill with the SVG's fill rule; stroke over the fill unless paint-order
  // put it under (the rig's outline style). Group opacity: a value, or hold keys set later through the layer's own paths (go<j>).
  var CAPS = { butt: 1, round: 2, square: 3 }, JOINS = { miter: 1, round: 2, bevel: 3 };
  function svgShape(L, s) {
    var root = L.property("ADBE Root Vectors Group");
    for (var j = s.items.length - 1; j >= 0; j--) {
      var it = s.items[j], g = root.addProperty("ADBE Vector Group"); g.name = it.name || ("part " + (j + 1));
      var v = g.property("ADBE Vectors Group");
      // cut by an SVG clipPath (the rig's shirt patterns, KI-12): the clip outline and the item's one outline, then Merge Paths
      // set to Intersect (4) keeps only what both cover; the fill below paints that
      var paths = it.clip ? it.clip.concat(it.paths) : it.paths;
      for (var q = 0; q < paths.length; q++) v.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(bezShape(paths[q]));
      if (it.clip) { var mg = v.addProperty("ADBE Vector Filter - Merge"); mg.property("ADBE Vector Merge Type").setValue(4); }
      var addFill = function (it, v) {
        if (!it.fill) return;
        var f = v.addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue([it.fill[0], it.fill[1], it.fill[2]]); f.property("ADBE Vector Fill Opacity").setValue(it.fill[3] * 100);
        var rule = 1; if (it.rule === "evenodd") rule = 2;
        try { f.property("ADBE Vector Fill Rule").setValue(rule); } catch (e) {}
      };
      var addStroke = function (it, v) {
        if (!it.stroke) return;
        var st = v.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").setValue([it.stroke.c[0], it.stroke.c[1], it.stroke.c[2]]);
        st.property("ADBE Vector Stroke Opacity").setValue(it.stroke.c[3] * 100); st.property("ADBE Vector Stroke Width").setValue(it.stroke.w);
        try { if (CAPS[it.stroke.cap]) st.property("ADBE Vector Stroke Line Cap").setValue(CAPS[it.stroke.cap]); } catch (e1) {}
        try { if (JOINS[it.stroke.join]) st.property("ADBE Vector Stroke Line Join").setValue(JOINS[it.stroke.join]); } catch (e2) {}
      };
      if (it.under) { addFill(it, v); addStroke(it, v); } else { addStroke(it, v); addFill(it, v); }
      if (it.op !== undefined && it.op < 1) g.property("ADBE Vector Transform Group").property("ADBE Vector Group Opacity").setValue(it.op * 100);
    }
  }
  function shape(L, s) {
    if (s.kind === "svg") { svgShape(L, s); return; }
    var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g.name = s.kind === "ellipse" ? "Ellipse" : "Box";
    var v = g.property("ADBE Vectors Group");
    if (s.kind === "ellipse") v.addProperty("ADBE Vector Shape - Ellipse");
    else if (s.kind === "path") { var pg = v.addProperty("ADBE Vector Shape - Group"); pg.property("ADBE Vector Shape").setValue(polyShape(s.verts)); g.name = "Polygon"; }
    else if (s.kind === "bez") {
      for (var q = 0; q < s.paths.length; q++) v.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(bezShape(s.paths[q]));
      g.name = "Path";
    }
    else { var r = v.addProperty("ADBE Vector Shape - Rect"); r.property("ADBE Vector Rect Roundness").setValue(s.radius || 0); }
    if (s.stroke) {
      var st = v.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(s.stroke.color); st.property("ADBE Vector Stroke Width").setValue(s.stroke.width);
    }
    if (s.fill) {
      var f = v.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue([s.fill[0], s.fill[1], s.fill[2]]);
      f.property("ADBE Vector Fill Opacity").setValue((s.fill[3] === undefined ? 1 : s.fill[3]) * 100);
      if (s.rule === "evenodd") { try { f.property("ADBE Vector Fill Rule").setValue(2); } catch (er) {} }
    }
  }
  var JUST = {};                                        // layer name -> justification (re-applied whenever a TextDocument is written back)
  function textStyle(L, t) {
    var tp = prop(L, ["ADBE Text Properties", "ADBE Text Document"]), td = tp.value;
    try { td.resetCharStyle(); td.resetParagraphStyle(); } catch (e) {}
    td.text = t.s; td.font = t.font; td.fontSize = t.size; td.applyFill = true; td.fillColor = t.fill; td.tracking = t.tracking; td.applyStroke = false;
    // an outer stroke from an SVG filter of the text or its group (feMorphology dilate r: port.py, KI-01): AE's text stroke is
    // centred on the outline, under the fill, so width 2r shows r outside the glyph like the browser. A -webkit-text-stroke: over = paint-order
    if (t.stroke) { td.applyStroke = true; td.strokeColor = t.stroke.c; td.strokeWidth = t.stroke.w; td.strokeOverFill = !!t.stroke.over; }
    // NO chained ?: in ExtendScript: it reads a ? b : c ? d : e as (a ? b : c) ? d : e, so "center" came out RIGHT_JUSTIFY (every centred
    // text in every AE port; found on the house/gallery-strip card labels)
    var J = ParagraphJustification.LEFT_JUSTIFY;
    if (t.just === "center") J = ParagraphJustification.CENTER_JUSTIFY;
    else if (t.just === "right") J = ParagraphJustification.RIGHT_JUSTIFY;
    td.justification = J; JUST[L.name] = J;
    if (t.leading) { try { td.autoLeading = false; td.leading = t.leading; } catch (e4) { log("leading on " + L.name + ": " + e4); } }
    try { td.fauxItalic = false; td.fauxBold = false; td.allCaps = false; } catch (e3) {}
    tp.setValue(td);
    var chk = tp.value; if (chk.font !== t.font) log("FONT not applied on " + L.name + ": wanted " + t.font + " got " + chk.font);
    if (chk.justification !== J) log("JUSTIFY not applied on " + L.name + ": wanted " + J + " got " + chk.justification);
    // letters styled apart (a <span> with its own size / font / colour): per-letter styles, AE 24.3+ (TextDocument.characterRange)
    if (t.runs) {
      try {
        var dr = tp.value;
        for (var r = 0; r < t.runs.length; r++) {
          var R = t.runs[r], cr = dr.characterRange(R[0], R[1]);
          if (R[2].size) cr.fontSize = R[2].size;
          if (R[2].font) cr.font = R[2].font;
          if (R[2].fill) { cr.applyFill = true; cr.fillColor = R[2].fill; }
        }
        dr.justification = J; tp.setValue(dr);
      } catch (e5) { log("letters styled apart on " + L.name + " not set (After Effects 24.3 or newer sets them): " + e5); }
    }
    // one-line text: tracking fitted so the line is as wide as in the browser. AE has named weights only (760 -> ExtraBold 800) and its text
    // came out about 3 % wider: words set as separate layers ran into each other. Two passes, at most +-80.
    if (t.fitW && t.s.length > 1) {
      for (var pass = 0; pass < 2; pass++) {
        var w = L.sourceRectAtTime(L.inPoint, false).width, n = t.s.replace(/\s+$/, "").length - 1;
        if (t.stroke) w -= t.stroke.w;                     // the stroke reaches w / 2 past each end; the browser's ink width has no stroke
        if (!(w > 0) || n < 1 || Math.abs(w - t.fitW) < 0.5) break;
        var d = tp.value, nt = Math.round(Math.max(t.tracking - 80, Math.min(t.tracking + 80, d.tracking + (t.fitW - w) / n / t.size * 1000)));
        if (nt === d.tracking) break;                     // AE tracking is a whole number of 1/1000 em
        // a TextDocument read back and written again came back RIGHT-justified (centred card labels, house/gallery-strip): set it again
        d.tracking = nt; d.justification = J; tp.setValue(d);
      }
      if (tp.value.tracking !== t.tracking) log("  tracking " + L.name + ": " + t.tracking + " -> " + tp.value.tracking + " (width " + t.fitW + ")");
    }
  }
  function textKeys(L, keys) {                          // one batch call: per-key setValueAtTime re-lays the text every time (slow)
    var tp = prop(L, ["ADBE Text Properties", "ADBE Text Document"]), times = [], vals = [], base = tp.value;
    for (var i = 0; i < keys.length; i++) { var td = tp.value; td.text = keys[i][1]; if (JUST[L.name] !== undefined) td.justification = JUST[L.name];
      if (keys[i][2]) { td.applyFill = true; td.fillColor = keys[i][2]; }      // [t, text, fill]: a colour switch (captions accent), hold keys like tl.set
      times.push(keys[i][0]); vals.push(td); }
    tp.setValuesAtTimes(times, vals);
  }
  function effects(L, list) {
    for (var i = 0; i < (list || []).length; i++) {
      var e = list[i], fx = L.property("ADBE Effect Parade").addProperty(e.m);
      if (e.name) fx.name = e.name;
      var idx = fx.propertyIndex;
      for (var k in e.set || {}) if (e.set.hasOwnProperty(k)) applySet(L, ["ADBE Effect Parade", idx, k], e.set[k]);
      for (k in e.keys || {}) if (e.keys.hasOwnProperty(k)) { try { setKeys(prop(L, ["ADBE Effect Parade", idx, k]), e.keys[k]); } catch (ek) { log("fx keys " + L.name + " > " + e.m + " > " + k + ": " + ek.toString()); } }
      // a value linked to another effect of the layer (the 2nd-4th "Skew (kit)" follow the first: port.py)
      for (k in e.expr || {}) if (e.expr.hasOwnProperty(k)) { try { prop(L, ["ADBE Effect Parade", idx, k]).expression = e.expr[k]; } catch (ex) { log("fx expression " + L.name + " > " + k + ": " + ex.toString()); } }
    }
  }
  function makeLayer(comp, s) {
    var L;
    if (s.type === "footage") L = comp.layers.add(footage(s.src, s.seq, s.seqFirst));
    else if (s.type === "comp") L = comp.layers.add(COMPS[s.src]);
    else if (s.type === "shape") L = comp.layers.addShape();
    else if (s.type === "solid") L = comp.layers.addSolid(s.color, s.name, comp.width, comp.height, 1);
    else if (s.type === "text") L = comp.layers.addText(s.text.s);
    else throw new Error("layer type " + s.type);
    L.name = s.name;
    return L;
  }

  function buildComp(c) {
    var comp = app.project.items.addComp(c.name, c.w, c.h, 1, c.dur, DATA.fps);
    comp.bgColor = c.bg || [0, 0, 0]; comp.parentFolder = folder(c.folder);
    comp.motionBlur = c.motionBlur === true;
    COMPS[c.name] = comp;
    var made = {}, list = c.layers, i, s, L;
    for (i = 0; i < list.length; i++) {            // bottom to top: each new layer goes on top
      s = list[i];
      try {
        if (DATA.timing) log("  make " + s.name);
        L = makeLayer(comp, s); made[s.name] = L;
        if (s.shape) shape(L, s.shape);
        if (s.text) textStyle(L, s.text);
      } catch (e0) { log("make " + c.name + " > " + s.name + ": " + e0.toString() + " (line " + e0.line + ")"); }
      DONE++;                                           // progress for the kit (port.py shows it while AE builds)
      if (DONE % 20 === 0) log("layers " + DONE + "/" + TOTAL);
    }
    for (i = 0; i < list.length; i++) {
      s = list[i]; L = made[s.name]; if (!L) continue;
      try {
        if (s.start !== undefined) L.startTime = s.start;
        if (s.seqStart !== undefined) L.startTime = s.seqStart;
        if (s.remap) {                                    // a film's image sequence (3D product render): the shown frame is a Time Remap key,
          L.timeRemapEnabled = true;                      // seconds into the footage (conformed to DATA.fps), LINEAR between keys
          var tr = L.property("ADBE Time Remapping"), rt = [], rv = [], rq, keep = {};
          for (rq = 0; rq < s.remap.length; rq++) { rt.push(s.remap[rq][0]); rv.push(s.remap[rq][1]); keep[s.remap[rq][0].toFixed(3)] = true; }
          // our keys FIRST, then the 2 default keys AE adds (layer in / footage end) go: AE turns Time Remap off when its last key is
          // removed, and setValuesAtTimes then fails ("the property or a parent property is hidden")
          tr.setValuesAtTimes(rt, rv);
          for (rq = tr.numKeys; rq >= 1; rq--) if (!keep[tr.keyTime(rq).toFixed(3)]) tr.removeKey(rq);
          for (rq = 1; rq <= tr.numKeys; rq++) tr.setInterpolationTypeAtKey(rq, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
        }
        if (s.sep) L.property("ADBE Transform Group").property("ADBE Position").dimensionsSeparated = true;
        var sets = s.set || {}, k;
        var PP = s.paths || {};                           // per-layer property paths (fill keys of a shape) over the shared ones
        for (k in sets) if (sets.hasOwnProperty(k)) applySet(L, PP[k] || DATA.paths[k], sets[k]);
        var keys = s.keys || {};
        for (k in keys) if (keys.hasOwnProperty(k)) { try { setKeys(prop(L, PP[k] || DATA.paths[k]), keys[k]); } catch (ek) { log("keys " + c.name + " > " + s.name + " > " + k + ": " + ek.toString()); } }
        if (s.textKeys) textKeys(L, s.textKeys);
        if (s.pathKeys) pathKeys(L, s.pathKeys);
        if (s.bezKeys) bezKeys(L, s.bezKeys);
        effects(L, s.fx);
        var ex = s.expr || {};
        for (k in ex) if (ex.hasOwnProperty(k)) { try { prop(L, DATA.paths[k]).expression = ex[k]; } catch (ee) { log("expression " + s.name + " > " + k + ": " + ee.toString()); } }
        if (s.blend && BLEND[s.blend] !== undefined) L.blendingMode = BLEND[s.blend];
        if (s.motionBlur) L.motionBlur = true;
        if (s.audioOff && L.hasAudio) L.audioEnabled = false;          // a canvas film's rendered video; its sound is the audio layers
        if (s.collapse) L.collapseTransformation = true;  // a precomp holding a blend mode: it keeps blending with the layers below
        if (s.inPoint !== undefined) L.inPoint = Math.max(s.inPoint, L.startTime);
        if (s.outPoint !== undefined) L.outPoint = s.outPoint;
      } catch (err) { log("layer " + c.name + " > " + s.name + ": " + err.toString() + " (line " + err.line + ")"); }
      if (DATA.timing) log("  " + s.name);
    }
    for (i = 0; i < list.length; i++) {
      s = list[i]; L = made[s.name]; if (!L) continue;
      try { if (s.matte && made[s.matte]) L.setTrackMatte(made[s.matte], TrackMatteType.ALPHA); } catch (err2) { log("matte " + c.name + " > " + s.name + ": " + err2.toString()); }
    }
    for (i = 0; i < list.length; i++) { s = list[i]; if (s.isMatte && made[s.name]) made[s.name].enabled = false; }
    log("comp " + c.name + ": " + list.length + " layers");
    return comp;
  }

  app.beginSuppressDialogs();
  app.beginUndoGroup(DATA.root + " (Moworks Motion port)");
  var ok = true;
  try {
    // saving a port: start from a clean project, but never throw away the user's work. A saved, unchanged project is swapped for a
    // new one (no prompt); an untitled project that only holds earlier kit ports (folder comment "Moworks Motion port", or "AI Motion Kit port" in older ports) is closed
    // without saving; anything else stops the build with a message.
    if (DATA.save) {
      var P = app.project, onlyKit = true;
      for (var q = 1; q <= P.rootFolder.numItems; q++) { var ri = P.rootFolder.item(q); if (!(ri instanceof FolderItem) || (ri.comment !== "Moworks Motion port" && ri.comment !== "AI Motion Kit port")) onlyKit = false; }
      // a port the kit itself saved in its work folder (.aimotionkit/work/ae, rebuilt by every port; the copy in the film's 04_Renders\AE is the
      // user's) may be closed even when changed, by design. Any other changed project stops the build.
      var kitFile = P.file !== null && DATA.workRoot && P.file.fsName.replace(/\\/g, "/").toLowerCase().indexOf(DATA.workRoot.toLowerCase()) === 0;
      if (P.file !== null && P.dirty && kitFile) { P.close(CloseOptions.DO_NOT_SAVE_CHANGES); app.newProject(); P = app.project; log("closed the kit's earlier port without saving: it is rebuilt every time"); }
      if (P.file !== null && P.dirty) throw new Error("After Effects has unsaved changes in " + P.file.name + ": save or close that project, then run the port again");
      if (P.file !== null || P.rootFolder.numItems === 0) { if (P.file !== null) app.newProject(); }
      else if (onlyKit) { P.close(CloseOptions.DO_NOT_SAVE_CHANGES); app.newProject(); }
      else throw new Error("After Effects has an unsaved untitled project with your own items: save or close it, then run the port again");
    }
    // AE keeps every earlier port's frames in its caches (25 GB after a few ports in a row, every comp built 3x slower):
    // empty them before building. ALL caches, Undo included: AE's Undo history from before the port is cleared (saved work is not touched;
    // the player and the skill tell the user to save first). Kept on purpose: the 3x speed was measured with this purge
    try { app.purge(PurgeTarget.ALL_CACHES); } catch (ep) { log("purge: " + ep); }
    // a re-run replaces the previous port (everything lives under one project folder)
    for (var i = app.project.numItems; i >= 1; i--) { var it = app.project.item(i); if (it instanceof FolderItem && it.name === DATA.root && it.parentFolder === app.project.rootFolder) it.remove(); }
    for (i = 0; i < DATA.comps.length; i++) TOTAL += DATA.comps[i].layers.length;
    for (i = 0; i < DATA.comps.length; i++) buildComp(DATA.comps[i]);
    if (DATA.save) { app.project.save(new File(DATA.save)); log("saved " + DATA.save); }
    if (DATA.renders) for (i = 0; i < DATA.renders.length; i++) {
      var r = DATA.renders[i]; try { COMPS[r.comp].resolutionFactor = [1, 1]; COMPS[r.comp].saveFrameToPng(r.t, new File(r.file)); } catch (er) { log("render " + r.comp + " @" + r.t + ": " + er); }
    }
    if (DATA.save && DATA.renders && DATA.renders.length) app.project.save(new File(DATA.save));   // the check renders leave the project changed
  } catch (e) { ok = false; log("ERROR " + e.toString() + " (line " + e.line + ")"); }
  app.endUndoGroup();
  app.endSuppressDialogs(false);
  finish(ok);
})();

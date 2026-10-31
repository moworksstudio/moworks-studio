// The preview's host page script, served by packages/hf-preview on the preview origin. It drives HF's own
// <hyperframes-player> and talks to the app's UI only by postMessage (checked against the UI's origin). A click on the frame picks the
// element under the pointer with HF's runtime picker (window.__HF_PICKER_API, the one HF Studio uses), and the page draws the app's own
// marks over the frame: the selection, the safe margins and a 3 x 3 grid. While the user types, the words and the style change in the
// frame at once (the file is written by the app's server when the field is left). Words animated letter by letter are one line: a click takes
// the line, and what is typed goes into its letters (splitText.js, loaded before this script; the server writes the file the same way).
// HF picker: https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/packages/core/src/runtime/picker.ts
(() => {
  const cfg = document.body.dataset;
  const UI = cfg.ui;
  const W = Number(cfg.w) || 1920, H = Number(cfg.h) || 1080;
  const p = document.getElementById("p");
  const ov = document.getElementById("ov");
  const marks = document.getElementById("marks");
  const split = globalThis.__mwSplitText;
  const send = (type, data) => parent.postMessage({ source: "mw-preview", type, ...data }, UI);
  const STYLE_KEYS = ["font-family", "font-size", "font-weight", "color", "background-color", "opacity", "transform", "left", "top", "width", "height"];
  let selected = [];          // [{ el, info }]
  let safe = false, grid = false, locked = false, srcN = 0, resumeAt = null;
  let last = 0;

  const frame = () => p.iframeElement;
  const doc = () => { try { return frame()?.contentDocument ?? null; } catch { return null; } };
  const win = () => { try { return frame()?.contentWindow ?? null; } catch { return null; } };
  /** Where the composition is drawn in this page, and its scale. */
  const geom = () => {
    const f = frame(); if (!f) return null;
    const r = f.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left, y: r.top, w: r.width, h: r.height, s: r.width / W };
  };

  // ---- preview quality (After Effects' Full / Half / Quarter, and Auto) ----
  // The scale goes to the composition's own window: a film that draws itself (a code film such as Brush cartoon) reads it and draws its
  // canvas at that size, the page's layout unchanged. A render never gets it (no value means 1). Auto lowers it only while playing and only
  // when this page draws fewer frames than the film's rate (the composition runs on this page's thread), one step at a time, and goes back
  // to Full on pause, a seek or a step.
  const LEVEL = { full: 1, half: 0.5, quarter: 0.25 };
  let qLevel = "full", qScale = 1, qSent = "", qWin = null, qHold = 0;
  const applyQuality = (scale) => {
    qScale = scale;
    const w = win(), d = doc();
    try {
      if (w) { w.__mwPreviewQuality = scale; if (d?.documentElement) d.documentElement.dataset.mwQuality = String(scale);
        w.dispatchEvent(new w.CustomEvent("mw:preview-quality", { detail: { scale, auto: qLevel === "auto" } })); }
    } catch { /* the composition is reloading */ }
    if (qSent !== `${qLevel}:${scale}`) { qSent = `${qLevel}:${scale}`; send("quality", { level: qLevel, scale }); }
  };
  const fullAgain = () => { qWin = null; if (qLevel === "auto" && qScale !== 1) applyQuality(1); };
  const watchRate = (now) => {
    if (qLevel !== "auto" || p.paused) { qWin = null; return; }
    if (!qWin) { qWin = { t0: now, n: 0 }; return; }
    qWin.n++;
    if (now - qWin.t0 < 1000) return;
    const fps = Number(p._runtimeFps) > 0 ? Number(p._runtimeFps) : 30;
    const drawn = (qWin.n * 1000) / (now - qWin.t0);
    qWin = { t0: now, n: 0 };
    if (now >= qHold && drawn < fps * 0.9 && qScale > 0.25) { applyQuality(qScale / 2); qHold = now + 1500; }
  };

  // ---- a code film's smooth preview (the proxy is made by packages/server/proxy.mjs) ----
  // A film painted by code draws one frame in up to seconds, so it cannot play live. While it plays, this page plays the app's MP4 of it
  // (at the film's own rate, with its sound) over the frame, the timeline following the video; on pause the page draws the exact frame again under
  // the paused video, which goes after a moment (a code film's frame takes that long) or at once on a seek or a step.
  const vid = document.createElement("video");
  vid.playsInline = true; vid.preload = "auto"; vid.setAttribute("aria-hidden", "true");
  vid.style.cssText = "position:fixed;display:none;object-fit:fill;pointer-events:none;background:#000";
  document.body.insertBefore(vid, ov);
  let proxy = null, onProxy = false, vidHide = null, vidLast = 0;
  const placeVid = () => { const g = geom(); if (g) Object.assign(vid.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${g.h}px` }); };
  const hideVid = () => { clearTimeout(vidHide); vid.style.display = "none"; };
  const proxyPlay = () => {
    const end = proxy.duration || p.duration || 0, start = p.rangeStart ?? 0;
    let t = p.currentTime || 0;
    if (end && t >= end - 0.05) t = start;
    clearTimeout(vidHide);
    vid.currentTime = t; vid.playbackRate = p.playbackRate || 1; vid.muted = !!p.muted;
    onProxy = true; placeVid(); vid.style.display = "block";
    vid.play().then(() => send("time", { time: vid.currentTime, paused: false })).catch(() => { onProxy = false; hideVid(); p.play(); });
  };
  const proxyStop = ({ live = true } = {}) => {
    if (!onProxy) return null;
    onProxy = false; vid.pause();
    const t = vid.currentTime;
    if (live) { p.seek(t); settle(t); clearTimeout(vidHide); vidHide = setTimeout(hideVid, 2500); } else hideVid();
    send("time", { time: t, paused: true });
    return t;
  };
  const followVid = (now) => {
    if (vid.style.display !== "none") placeVid();
    if (!onProxy) return;
    const t = vid.currentTime, end = p.rangeEnd ?? null;
    if (end != null && t >= end) { if (p.loop) vid.currentTime = p.rangeStart ?? 0; else { proxyStop(); return; } }
    if (now - vidLast > 40) { vidLast = now; send("time", { time: vid.currentTime, paused: false }); }
  };
  // Scrubbing (a "Smooth" preview still stuttered while dragging): a code film draws one frame in up to a second, so every seek drawn live
  // stutters. While seeks come with a fresh preview, this page shows the preview's frame at once (the video seeks, the page does not) and
  // draws the exact frame live SCRUB_MS after the last one; anything that needs the live frame (a click, play, a step, an edit) draws it at
  // once. A stale preview or none keeps the live seek.
  const SCRUB_MS = 250;
  let scrub = null;          // { t, timer }: the time shown from the preview, not yet drawn live
  const scrubTo = (t) => {
    if (onProxy) { onProxy = false; vid.pause(); }
    clearTimeout(vidHide); clearTimeout(scrub?.timer);
    vid.currentTime = Math.min(t, (vid.duration || proxy.duration || t + 1) - 0.001);
    placeVid(); vid.style.display = "block";
    scrub = { t, timer: setTimeout(() => scrubLive(), SCRUB_MS) };
  };
  /** The scrubbed frame drawn live now, under the preview's frame, which goes once the page has had time to draw it (as on pause). */
  const scrubLive = ({ hide = false } = {}) => {
    if (!scrub) return null;
    const { t, timer } = scrub;
    clearTimeout(timer); scrub = null;
    p.seek(t); settle(t);
    if (hide) hideVid(); else { clearTimeout(vidHide); vidHide = setTimeout(hideVid, 2500); }
    return t;
  };
  // a click on the film while the preview plays stops it first: picking and editing work on the live page, at that frame
  ov.addEventListener("pointerdown", () => { scrubLive(); if (onProxy) proxyStop(); }, true);
  vid.addEventListener("ended", () => {
    if (!onProxy) return;
    if (p.loop) { vid.currentTime = p.rangeStart ?? 0; vid.play().catch(() => {}); return; }
    const t = proxyStop(); send("ended", { time: t });
  });

  // ---- playback events ----
  p.addEventListener("ready", () => {
    send("ready", { duration: p.duration, width: p.compositionWidth || W, height: p.compositionHeight || H, fps: Number(p._runtimeFps) || null });
    applyQuality(qLevel === "auto" ? 1 : LEVEL[qLevel]);
    if (resumeAt != null) { p.seek(resumeAt); settle(resumeAt); resumeAt = null; }
    reselect();
  });
  // the film's pictures, video and fonts loaded, its scene transitions prepared: the app's own loading state ends. HF's own cards (its
  // logo, "Loading assets", "Preparing scene transitions") are off on this page: assets-loading-ui="none" and shader-loading="none", the
  // host options HF's player README documents; assetsready and shadertransitionstate fire either way
  p.addEventListener("assetsready", () => send("assets", { ready: true }));
  p.addEventListener("shadertransitionstate", (e) => { const s = e.detail?.state ?? {}; send("transitions", { loading: !!(s.loading && !s.ready) }); });
  p.addEventListener("durationchange", () => send("duration", { duration: p.duration }));
  // while the smooth preview plays or a scrub waits, the video's time is the film's time: the live player sits paused where it was and HF
  // still reports that time (the clock, the shot and the Play button flashed back to it between the video's times)
  const live = () => !onProxy && !scrub;
  p.addEventListener("timeupdate", () => { const n = performance.now(); if (live() && n - last > 40) { last = n; send("time", { time: p.currentTime, paused: p.paused }); } });
  p.addEventListener("play", () => send("time", { time: p.currentTime, paused: false }));
  p.addEventListener("pause", () => { if (live()) send("time", { time: p.currentTime, paused: true }); fullAgain(); });
  p.addEventListener("ended", () => send("ended", { time: p.currentTime }));
  p.addEventListener("error", (e) => send("error", { message: String((e.detail && (e.detail.message || e.detail)) || "Preview error") }));
  p.addEventListener("playbackerror", (e) => send("error", { message: String((e.detail && (e.detail.message || e.detail)) || "Playback error") }));

  // ---- picking ----
  /** The source of a picked element: its own HF id, or (for an element a script made) the nearest ancestor that has one. */
  function describe(el) {
    const own = el.getAttribute("data-hf-id");
    const anchor = own ? el : el.closest("[data-hf-id]");
    const mount = el.closest("[data-composition-src]");
    const file = mount ? mount.getAttribute("data-composition-src") : "index.html";
    const cs = win()?.getComputedStyle(el);
    const computedStyles = {};
    if (cs) for (const k of STYLE_KEYS) computedStyles[k] = cs.getPropertyValue(k);
    const r = rectOf(el);
    // the element named for Claude (never shown on screen: the UI says what it is in words)
    const label = el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.classList.length ? "." + [...el.classList].filter((c) => !c.startsWith("__hf")).slice(0, 2).join(".") : "");
    const line = lineOf(el);          // a line of letters reads as its words, however the letters are laid out or hidden at this moment
    return {
      hfId: anchor ? anchor.getAttribute("data-hf-id") : null, scriptMade: !own, file, tagName: el.tagName.toLowerCase(), id: el.id || null,
      label, textContent: (line ? split.read(line) : (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim()).slice(0, 400) || null,
      leaf: el.children.length === 0, boundingBox: { x: r.left, y: r.top, width: r.width, height: r.height }, computedStyles, currentTime: p.currentTime,
    };
  }
  /** The line of letters an element holds: itself, or the only child it wraps ("<h1><span class=in>letters…"), when one is there. */
  function lineOf(el) {
    for (let x = el, i = 0; x && i < 4; x = x.children.length === 1 && !split.hasText(x) ? x.firstElementChild : null, i++) if (split.isRun(x)) return x;
    return null;
  }
  /** A letter of a line stands for the whole line: the line itself, or (when the script made it) the nearest element around it that has an
   *  HF id, so the words can be edited in the file. Alt + click still reaches the single letter. */
  function wholeLine(el) {
    const run = split.runAround(el);
    if (!run) return el;
    let x = run;
    while (!x.getAttribute("data-hf-id") && x.parentElement && x.parentElement.children.length === 1 && !split.hasText(x.parentElement)) x = x.parentElement;
    return x;
  }
  function pickAt(clientX, clientY, add, deeper) {
    const g = geom(), w = win(), d = doc();
    if (!g || !w || !d) return;
    stopLooking();
    const api = w.__HF_PICKER_API;
    const cx = (clientX - g.x) / g.s, cy = (clientY - g.y) / g.s;
    if (cx < 0 || cy < 0 || cx > W || cy > H) return;
    const infos = api ? api.getCandidatesAtPoint(cx, cy, 8) : [];
    // a full-frame layer (background, grain) is never picked by a plain click: a click on the empty frame clears the selection
    // (click away to leave the text); Alt + click still reaches what lies under, backgrounds included
    const big = (i) => i.boundingBox.width * i.boundingBox.height > W * H * 0.8;
    // only what is seen under the pointer counts (hidden copies, see-through layers and empty boxes are passed over)
    const found = infos.map((i) => ({ i, el: resolve(d, i, cx, cy) })).filter((x) => x.el);
    const order = deeper ? [...found.filter((x) => !big(x.i)), ...found.filter((x) => big(x.i))] : found.filter((x) => !big(x.i));
    const pickN = deeper ? Math.min(order.length - 1, (selected.length ? order.findIndex((x) => x.el === selected[selected.length - 1].el) : -1) + 1) : 0;
    const hit = order[Math.max(0, pickN)]?.el ?? null;
    if (!hit) { if (!add) { selected = []; draw(); send("pick", { items: [] }); } return; }
    const el = deeper ? hit : wholeLine(hit);
    if (add) { const i = selected.findIndex((s) => s.el === el); if (i >= 0) selected.splice(i, 1); else selected.push({ el }); }
    else selected = [{ el }];
    draw();
    send("pick", { items: selected.map((s) => describe(s.el)), add: !!add, user: true });
  }
  const safeQuery = (d, sel) => { try { return d.querySelector(sel); } catch { return null; } };
  const safeQueryAll = (d, sel) => { try { return [...d.querySelectorAll(sel)]; } catch { return []; } };
  // A film may mount the same scene more than once (a finale that gathers every step): one HF id, several elements. The one meant is
  // the one the viewer sees, under the pointer (the box would otherwise sit on a hidden copy elsewhere, and live edits would go there)
  const byHf = (d, hf) => (hf ? safeQueryAll(d, '[data-hf-id="' + CSS.escape(hf) + '"]') : []);
  function seen(el) {
    const w = win(); if (!w) return false;
    for (let x = el; x && x.nodeType === 1; x = x.parentElement) {
      const cs = w.getComputedStyle(x);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.02) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  /** The element's box as drawn: for words, the box of the words themselves (a heading's line is wider than its text). */
  function rectOf(el) {
    const d = doc();
    if (d && (el.children.length === 0 || lineOf(el)) && (el.textContent || "").trim()) {
      try { const rg = d.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return r; } catch { /* the element's own box */ }
    }
    return el.getBoundingClientRect();
  }
  const inside = (r, x, y) => x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1;
  /** Of the elements a candidate names, the visible one under the point (the smallest when several are), else none. */
  function resolve(d, info, cx, cy) {
    const hf = info.dataAttributes && info.dataAttributes["data-hf-id"];
    const els = hf ? byHf(d, hf) : info.selector ? safeQueryAll(d, info.selector) : [];
    const hits = els.filter((el) => seen(el) && inside(el.getBoundingClientRect(), cx, cy));
    hits.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.width * ra.height - rb.width * rb.height; });
    return hits[0] || null;
  }
  /** After a reload the elements are new: find them again by their HF id. */
  // HF mounts its scenes after "ready", so what was picked is looked for a little while; meanwhile nothing is drawn and the UI keeps its target (the
  // edit card stays open, with its Reset). Once found the UI hears the words as they are now; an element that is gone clears the target.
  let looking = [], lookT = null;
  const stopLooking = () => { looking = []; clearTimeout(lookT); };
  function reselect() {
    if (selected.length) looking = selected.map((s) => ({ id: s.el.getAttribute?.("data-hf-id"), file: fileOf(s.el) }));
    selected = [];
    clearTimeout(lookT);
    if (!looking.length) return;
    const until = performance.now() + 15000;
    const look = () => {
      const d = doc();
      const found = d ? looking.map(({ id, file }) => { const all = byHf(d, id).filter((x) => fileOf(x) === file); return all.find(seen) || all[0] || null; }) : [];
      if (!(d && found.every(Boolean)) && performance.now() < until) { lookT = setTimeout(look, 200); return; }
      selected = found.filter(Boolean).map((el) => ({ el }));
      looking = [];
      draw();
      send("pick", { items: selected.map((s) => describe(s.el)), add: false });
    };
    look();
  }

  ov.addEventListener("click", (e) => { if (e.detail > 1) return; pickAt(e.clientX, e.clientY, e.shiftKey, e.altKey); });
  ov.addEventListener("dblclick", (e) => { e.preventDefault(); send("dblclick", {}); });
  addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "Escape", "KeyJ", "KeyK", "KeyL", "PageUp", "PageDown", "Home", "End"].includes(e.code)) {
      e.preventDefault();
      if (e.code === "Escape" && selected.length) { selected = []; draw(); send("pick", { items: [] }); return; }
      send("key", { code: e.code, shift: e.shiftKey, alt: e.altKey });
    }
  });

  // ---- marks drawn over the frame ----
  function box(cls, x, y, w, h, label) {
    const b = document.createElement("div"); b.className = cls;
    b.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h + "px";
    if (label) { const s = document.createElement("span"); s.textContent = label; b.appendChild(s); }
    marks.appendChild(b);
  }
  let lastBoxes = "";
  function draw() {
    marks.textContent = "";
    const g = geom(); if (!g) return;
    if (safe) { box("safe action", g.x + g.w * 0.035, g.y + g.h * 0.035, g.w * 0.93, g.h * 0.93); box("safe title", g.x + g.w * 0.05, g.y + g.h * 0.05, g.w * 0.9, g.h * 0.9); }
    if (grid) for (const k of [1, 2]) { box("grid", g.x + (g.w * k) / 3, g.y, 1, g.h); box("grid", g.x, g.y + (g.h * k) / 3, g.w, 1); }
    const boxes = [];
    selected.forEach((s, i) => {
      if (!s.el.isConnected) return;
      const r = rectOf(s.el);
      const x = g.x + r.left * g.s, y = g.y + r.top * g.s, w = r.width * g.s, h = r.height * g.s;
      box("sel" + (locked ? " locked" : ""), x, y, w, h, i === selected.length - 1 ? null : null);
      boxes.push([Math.round(x), Math.round(y), Math.round(w), Math.round(h)]);
    });
    const key = JSON.stringify(boxes);
    if (key !== lastBoxes) { lastBoxes = key; send("boxes", { boxes, frame: [Math.round(g.x), Math.round(g.y), Math.round(g.w), Math.round(g.h)] }); }
  }
  // follow the selection while the film plays or the window changes size
  const loop = (now) => { if (selected.length || safe || grid) draw(); watchRate(now); followVid(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  addEventListener("resize", draw);

  // ---- the UI's commands ----
  const fileOf = (el) => el.closest("[data-composition-src]")?.getAttribute("data-composition-src") ?? "index.html";
  // a line of letters while it is typed in: what it was made of, kept so a line typed short or empty loses no letter (the film's next load reads the file)
  const typed = new WeakMap();
  const typeLine = (el, text) => {
    if (!typed.has(el)) { const st = split.prepare(el); if (!st.kind) return false; typed.set(el, st); }
    return split.write(el, text, typed.get(el));
  };
  let stepT = null, stepWhen = 0;
  // HF builds each sub-composition's timeline when it has loaded; a seek before that lands on a frame without it (an empty ground, a shot
  // without its words). HF says the film is ready to draw any frame with window.__renderReady (its own snapshot waits for it,
  // packages/core/src/runtime/init.ts at 490ecaf); a paused seek made before that is made again once it is true.
  let settleT = null;
  const settle = (t) => {
    settleT = t;
    if (win()?.__renderReady === true) return;
    const until = performance.now() + 10000;
    const again = () => {
      if (settleT !== t || !p.paused) return;
      if (win()?.__renderReady === true) { p.seek(t); return; }
      if (performance.now() < until) setTimeout(again, 100);
    };
    setTimeout(again, 100);
  };
  addEventListener("message", (e) => {
    if (e.origin !== UI || !e.data || e.data.source !== "mw-ui") return;
    const m = e.data;
    // every command but another seek works on the live frame: a scrub waiting to be drawn is drawn first
    if (scrub && m.type !== "seek" && !["mute", "rate", "loop", "range", "marks", "lock", "quality", "proxy"].includes(m.type)) scrubLive({ hide: m.type !== "play" });
    if (m.type === "play") { if (proxy) proxyPlay(); else p.play(); }
    else if (m.type === "pause") { if (onProxy) proxyStop(); else p.pause(); }
    else if (m.type === "proxy") {          // the UI's view of the smooth preview: its URL while it is fresh, else none
      const next = m.url && m.fresh ? { url: m.url, duration: Number(m.duration) || null } : null;
      if (!next && onProxy) proxyStop();
      if (!next && scrub) scrubLive({ hide: true });
      if (next && vid.getAttribute("src") !== next.url) { if (scrub) scrubLive({ hide: true }); vid.src = next.url; }
      proxy = next;
    }
    else if (m.type === "seek") {
      const t = Math.max(0, +m.time || 0);
      fullAgain();
      // a fresh preview whose video can show a frame, and the film not playing live: the preview's frame now, the live one after
      if (proxy && vid.readyState >= 1 && p.paused) { scrubTo(t); send("time", { time: t, paused: true }); return; }
      proxyStop({ live: false }); hideVid(); p.seek(t); settle(t); send("time", { time: t, paused: p.paused });
    }
    else if (m.type === "quality") { qLevel = m.level === "auto" || LEVEL[m.level] ? m.level : "full"; qWin = null; applyQuality(qLevel === "auto" ? 1 : LEVEL[qLevel]); }
    else if (m.type === "step") {          // one frame back or on, at the film's own frame rate, from where the player really is
      const fps = Number(p._runtimeFps) > 0 ? Number(p._runtimeFps) : 30;
      // quick presses count from the last step (the player's own time arrives a moment after a seek)
      const vt = proxyStop({ live: false });          // from where the smooth preview was, when it played
      const base = vt ?? (stepT != null && performance.now() - stepWhen < 600 ? stepT : (p.currentTime || 0));
      const frame = Math.max(0, Math.round(base * fps) + Math.round(+m.frames || 0));
      const t = Math.min(frame / fps, p.duration || frame / fps);
      if (!p.paused) p.pause();
      hideVid(); fullAgain();
      p.seek(t); settle(t); stepT = t; stepWhen = performance.now(); send("time", { time: t, paused: true });
    }
    else if (m.type === "mute") { p.muted = !!m.muted; vid.muted = !!m.muted; }
    else if (m.type === "rate") { p.playbackRate = Number(m.rate) || 1; vid.playbackRate = p.playbackRate; }
    else if (m.type === "loop") p.loop = !!m.loop;
    else if (m.type === "range") { p.rangeStart = m.start == null ? null : Number(m.start); p.rangeEnd = m.end == null ? null : Number(m.end); }
    else if (m.type === "marks") { safe = !!m.safe; grid = !!m.grid; draw(); }
    else if (m.type === "lock") { locked = !!m.locked; draw(); }
    else if (m.type === "clear") { stopLooking(); selected = []; draw(); }
    else if (m.type === "select") {         // the UI selects by HF id (a word in "Words on screen")
      // the same id may be in another scene's file: the one asked for, when the UI says which
      const d = doc(); const all = d ? byHf(d, m.hfId).filter((x) => !m.file || fileOf(x) === m.file) : []; const el = all.find(seen) || all[0];
      if (el) { stopLooking(); selected = [{ el }]; draw(); send("pick", { items: [describe(el)], add: false, user: true }); }
    }
    else if (m.type === "describe") { if (selected.length) send("pick", { items: selected.map((s) => describe(s.el)), add: false }); }          // the words changed: the chat's target says the new ones
    else if (m.type === "live") {          // words or style shown at once, before the file is written
      const d = doc();
      // the copies in the picked element's own file (another file may hold an element with the same id; it is not the one edited)
      const mine = selected.length ? fileOf(selected[selected.length - 1].el) : looking.at(-1)?.file ?? null;
      const all = (d ? byHf(d, m.hfId) : []).filter((el) => mine == null || fileOf(el) === mine);
      for (const el of all) {          // every copy of the element, so the one on screen changes as the user types
        if (m.text != null && !typeLine(lineOf(el) ?? el, m.text)) { const t = el.children.length === 1 ? el.firstElementChild : el; t.textContent = m.text; }
        if (m.style) for (const k of Object.keys(m.style)) { if (m.style[k]) el.style.setProperty(k, m.style[k], "important"); else el.style.removeProperty(k); }
      }
      draw();
    }
    else if (m.type === "reload") {          // the files changed: load the film again where it was
      // while the smooth preview plays or a scrub waits, the live player still sits where it was: the film's time is the video's
      resumeAt = onProxy ? vid.currentTime : scrub ? scrub.t : p.currentTime || 0;
      if (onProxy) proxyStop({ live: false });
      send("assets", { ready: false });          // its pictures and fonts load again
      srcN += 1;
      p.setAttribute("src", cfg.src + "?v=" + srcN);
    }
  });
  send("loaded", {});
})();

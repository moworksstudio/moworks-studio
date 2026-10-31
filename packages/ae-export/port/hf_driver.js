/* Moworks Studio: page driver for the AE recorder (record.js) on HyperFrames' own page (packages/hf-page: HF's bundle + HF's render file
   server). It replaces the kit's engine/runtime/driver.js, which re-implemented HF's clip gating and could not run HF's runtime for mounted
   sub-compositions (registry blocks came out blank). Nothing is re-implemented here: every seek is HF's own
   (window.__hf.seek = the render bridge to __player.renderSeek), so clip gating, sub-compositions, media and fonts are HF's.
   Same interface as the kit driver, which record.js and port.py expect:
     await window.__aimk.ready      -> { contract: "hf", w, h, duration, markers, stage, fps }   or { error }
     await window.__aimk.seek(t)    -> HF has drawn the frame at film second t
     window.__aimk.timeline         -> { duration() }
     window.__aimk.bounds()         -> start / end second of every GSAP tween of every HF timeline, on the film clock (extra sample times)
     window.__aimk.audio()          -> the film's <audio> clips on the film clock (sub-compositions included)
   Readiness: HF's own condition (window.__hf.seek is a function and window.__hf.duration > 0, as the producer's frame capture polls it),
   then document.fonts.ready and every <img> decoded. */
(() => {
  if (window.__aimk) return;
  try { if (window.frameElement) return; } catch (e) { return; }      // a frame inside the film: HF's bridge seeks same-origin frames itself
  const A = (window.__aimk = {});
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await sleep(25); } return true; };
  let done;
  A.ready = new Promise(r => (done = r));
  const fail = msg => { A.error = msg; done({ error: msg }); };
  const settle = i => i.complete ? (i.decode ? i.decode().catch(() => {}) : null) : new Promise(r => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); });
  A.broken = () => [...document.images].filter(i => { const s = i.getAttribute("src") || ""; return s && !s.startsWith("data:") && i.complete && !i.naturalWidth; }).map(i => i.getAttribute("src"));

  // the film-clock start of an element: its own data-start plus every timed ancestor's (HF times a sub-composition's clips from its host)
  const startOf = el => { let s = 0; for (let x = el; x; x = x.parentElement) if (x.hasAttribute && x.hasAttribute("data-start")) s += parseFloat(x.getAttribute("data-start")) || 0; return s; };
  const hostOf = id => document.querySelector(`[data-composition-id="${CSS.escape(id)}"]`);

  A.bounds = () => {
    const out = new Set(), G = window.gsap;
    const walk = (t, off) => {
      for (const c of t.getChildren(false, true, true)) {
        const a = off + c.startTime();
        if (G && c instanceof G.core.Timeline) walk(c, a);
        else { out.add(+a.toFixed(5)); out.add(+(a + c.totalDuration()).toFixed(5));
               const r = (c.vars && c.vars.repeat) || 0, d = c.duration(); for (let i = 1; i <= Math.min(r, 200); i++) out.add(+(a + i * (d + ((c.vars && c.vars.repeatDelay) || 0))).toFixed(5)); }
      }
    };
    for (const [id, tl] of Object.entries(window.__timelines || {})) {
      const host = hostOf(id);
      try { if (tl && tl.getChildren) walk(tl, host ? startOf(host) : 0); } catch (e) {}
    }
    return [...out].sort((a, b) => a - b);
  };

  // what HF's mixer takes of a clip (engine audioMixer parseAudioElements): one it hides stays out; its volume lane goes on (data-automation);
  // speed, loop and effects are named so the port can say it does not carry them
  A.audio = () => [...document.querySelectorAll("audio[data-start]")].filter(a => !a.closest("[data-hidden]")).map(a => ({
    id: a.id || "", src: a.getAttribute("src") || "", start: +startOf(a).toFixed(5),
    dur: parseFloat(a.getAttribute("data-duration") || "0") || 0, media_start: parseFloat(a.getAttribute("data-media-start") || "0") || 0,
    volume: a.hasAttribute("data-volume") ? parseFloat(a.getAttribute("data-volume")) : 1,
    role: a.getAttribute("data-timeline-role") || a.getAttribute("data-role") || "",
    fade_in: parseFloat(a.getAttribute("data-fade-in") || "0") || 0, fade_out: parseFloat(a.getAttribute("data-fade-out") || "0") || 0,
    automation: a.getAttribute("data-automation") || "", rate: parseFloat(a.getAttribute("data-playback-rate") || "1") || 1,
    loop: a.hasAttribute("loop"), fx: !!a.getAttribute("data-fx-chain"),
  }));

  window.addEventListener("load", async () => {
    try {
      const root = document.querySelector("[data-composition-id]");
      if (!root) return fail("no HyperFrames composition root ([data-composition-id]) in the page");
      if (!(await until(() => window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0, 60000)))
        return fail("HyperFrames runtime not ready within 60 s (window.__hf.seek / duration)");
      await document.fonts.ready;
      await Promise.all([...document.images].map(settle));
      const D = +root.getAttribute("data-duration") || window.__hf.duration;
      A.timeline = { duration: () => D };
      A.seek = async t => { window.__hf.seek(Math.max(0, Math.min(t, D))); };
      if (!root.id) root.id = "__mw_root";
      const markers = [...root.children].filter(c => c.hasAttribute("data-start") && c.tagName !== "AUDIO")
        .map(c => [c.id || c.getAttribute("data-composition-id") || "clip", startOf(c)]).sort((a, b) => a[1] - b[1]);
      await A.seek(0);
      done({ contract: "hf", w: +root.getAttribute("data-width") || root.offsetWidth || 1920, h: +root.getAttribute("data-height") || root.offsetHeight || 1080,
             duration: D, markers, stage: "#" + CSS.escape(root.id), fps: window.__mwAeFps || 30 });
    } catch (e) { fail(String((e && e.stack) || e)); }
  });
})();

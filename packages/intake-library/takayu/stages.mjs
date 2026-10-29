// Demo stages for the TakayuStudio items (drawn here; nothing downloaded): two scenes for transitions, a subject for basic moves, a
// Vietnamese headline for text, three depth layers for camera moves. Each returns { css, html }; an item adds `run` and `duration`.
// Colours follow a neutral dark stage: ink #e8ebf3, violet and cyan accents, a warm third.
export const C = { ink: "#e8ebf3", acc: "#8b7bff", acc2: "#3dd6f5", warm: "#ffb547", rose: "#ff5d8f", mute: "#6c778b", card: "#151a24", line: "#262c3a", bg: "#0b0d12" };

const VARS = `#demo { --ink: ${C.ink}; --acc: ${C.acc}; --acc2: ${C.acc2}; --warm: ${C.warm}; --rose: ${C.rose}; --mute: ${C.mute}; --tk-card: ${C.card}; --tk-line: ${C.line}; background: ${C.bg}; color: var(--ink); }
.tk-stage { position: absolute; inset: 0; display: grid; place-items: center; }
.tk-cap { font-size: 30px; font-weight: 500; color: var(--mute); letter-spacing: 0.01em; }`;

/** Two full-frame scenes: A (dark, a circle) and B (violet, a square), B above A. The transition is called on B with from: A. */
export function scenes({ a = "Cảnh mở đầu", b = "Cảnh tiếp theo", markA = "circle", markB = "square", extra = "" } = {}) {
  return {
    css: `${VARS}
.tk-scene { position: absolute; inset: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 110px; }
.tk-a { background: radial-gradient(120% 120% at 30% 30%, #1b2440 0%, #10141f 55%, #0b0d12 100%); }
.tk-b { background: radial-gradient(120% 120% at 70% 30%, #a28cff 0%, #7a5cf5 50%, #5232d8 100%); }
.tk-mark { width: 340px; height: 340px; flex: none; }
.tk-mark.circle { border-radius: 50%; background: radial-gradient(circle at 35% 30%, #8ff0ff, #2bb7e6 60%, #1580b8); box-shadow: 0 40px 120px rgba(61, 214, 245, 0.25); }
.tk-mark.square { border-radius: 56px; background: linear-gradient(160deg, #ffffff, #e2dcff); box-shadow: 0 40px 120px rgba(20, 0, 80, 0.35); }
.tk-mark.coin { border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff1b0, #ffc633 60%, #d99400); }
.tk-sc-text { display: flex; flex-direction: column; gap: 18px; }
.tk-sc-letter { font-size: 260px; font-weight: 800; line-height: 0.85; letter-spacing: -0.04em; }
.tk-a .tk-sc-letter { color: #e8ebf3; } .tk-b .tk-sc-letter { color: #ffffff; }
.tk-sc-cap { font-size: 44px; font-weight: 600; }
.tk-a .tk-sc-cap { color: #8f9ab3; } .tk-b .tk-sc-cap { color: rgba(255, 255, 255, 0.82); }`,
    html: `<section class="tk-scene tk-a"><div class="tk-mark ${markA}"></div><div class="tk-sc-text"><div class="tk-sc-letter">A</div><div class="tk-sc-cap">${a}</div></div></section>
<section class="tk-scene tk-b"><div class="tk-mark ${markB}"></div><div class="tk-sc-text"><div class="tk-sc-letter">B</div><div class="tk-sc-cap">${b}</div></div></section>${extra}`,
  };
}

/** One subject in the middle: a card (default), a ball, a square, a pill button or a chip, with an optional label and floor line. */
export function subject({ kind = "card", label = "", floor = false, caption = "", size = null } = {}) {
  return {
    css: `${VARS}
.tk-obj { position: relative; display: grid; place-items: center; color: #fff; font-weight: 700; }
.tk-obj.card { width: ${size ?? 280}px; height: ${size ?? 280}px; border-radius: 56px; background: linear-gradient(150deg, #a693ff, #6a4cf0); box-shadow: 0 40px 100px rgba(106, 76, 240, 0.35); font-size: 64px; }
.tk-obj.ball { width: ${size ?? 220}px; height: ${size ?? 220}px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6 60%, #1278ad); box-shadow: 0 30px 80px rgba(61, 214, 245, 0.3); }
.tk-obj.square { width: ${size ?? 240}px; height: ${size ?? 240}px; border-radius: 28px; background: linear-gradient(150deg, #ffd27a, #ff9b3d); }
.tk-obj.pill { padding: 0 72px; height: 132px; border-radius: 66px; background: linear-gradient(180deg, #9c88ff, #7357f5); font-size: 48px; box-shadow: 0 24px 60px rgba(115, 87, 245, 0.35); }
.tk-obj.chip { width: ${size ?? 200}px; height: ${size ?? 200}px; border-radius: 40px; background: var(--tk-card); border: 3px solid var(--tk-line); font-size: 90px; }
.tk-floor { position: absolute; left: 560px; right: 560px; top: 760px; height: 4px; border-radius: 2px; background: var(--tk-line); }
.tk-under { position: absolute; left: 0; right: 0; top: 860px; text-align: center; }`,
    html: `${floor ? `<div class="tk-floor"></div>` : ""}<div class="tk-stage"><div class="tk-obj ${kind}">${label}</div></div>${caption ? `<div class="tk-under tk-cap">${caption}</div>` : ""}`,
  };
}

/** A Vietnamese headline in the middle (Inter 800), with an optional small line under it. */
export function headline(text = "Chuyển động có chủ đích", { size = 132, sub = "", weight = 800, font = "Inter", cls = "" } = {}) {
  return {
    css: `${VARS}
.tk-head { margin: 0; font-family: '${font}', sans-serif; font-size: ${size}px; font-weight: ${weight}; letter-spacing: -0.03em; line-height: 1.15; text-align: center; max-width: 1600px; }
.tk-sub { margin-top: 36px; text-align: center; }`,
    html: `<div class="tk-stage"><div><h1 class="tk-head ${cls}">${text}</h1>${sub ? `<div class="tk-sub tk-cap">${sub}</div>` : ""}</div></div>`,
  };
}

/** Depth layers for camera moves, each with data-depth: far (sky, sun) 0.2, middle (hills) 0.55, the subject (a card) 1, foreground
 *  (soft dark shapes at the edges) 1.6. The camera functions are called on .tk-cam. */
export function layers({ title = "Toàn cảnh", fore = true } = {}) {
  return {
    css: `${VARS}
.tk-cam { position: absolute; inset: 0; overflow: hidden; background: linear-gradient(180deg, #161c3a 0%, #2a2350 55%, #4a2d5c 100%); }
.tk-far, .tk-mid, .tk-near, .tk-fore { position: absolute; inset: -12%; }
.tk-fore .blob { position: absolute; border-radius: 50%; background: radial-gradient(circle, #191433 0%, #0d0b1c 60%, rgba(13,11,28,0) 72%); filter: blur(10px); opacity: 0.9; }
.tk-far .sun { position: absolute; left: 22%; top: 20%; width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, #ffe2a8, #ffb547 60%, rgba(255, 181, 71, 0)); }
.tk-far .star { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #fff; opacity: 0.7; }
.tk-mid svg { position: absolute; left: 0; bottom: 18%; width: 100%; height: 46%; }
.tk-near .card { position: absolute; left: 50%; top: 50%; width: 620px; height: 360px; margin: -180px 0 0 -310px; border-radius: 40px; background: rgba(21, 26, 36, 0.86); border: 2px solid rgba(255, 255, 255, 0.12);
  display: grid; place-items: center; font-size: 84px; font-weight: 800; letter-spacing: -0.03em; box-shadow: 0 50px 120px rgba(0, 0, 0, 0.45); }`,
    html: `<div class="tk-cam"><div class="tk-far" data-depth="0.2"><div class="sun"></div>${[[12, 14], [24, 30], [36, 10], [70, 18], [82, 34], [90, 12], [46, 22], [16, 40]].map(([x, y]) => `<div class="star" style="left:${x}%;top:${y}%"></div>`).join("")}</div>
<div class="tk-mid" data-depth="0.55"><svg viewBox="0 0 1000 300" preserveAspectRatio="none"><path d="M0 300 L0 170 Q120 90 240 150 T480 120 T720 160 T1000 110 L1000 300 Z" fill="#3b2f6b"/><path d="M0 300 L0 220 Q160 160 320 210 T640 190 T1000 200 L1000 300 Z" fill="#2a2150"/></svg></div>
<div class="tk-near" data-depth="1"><div class="card">${title}</div></div>${fore ? `
<div class="tk-fore" data-depth="1.6"><div class="blob" style="left:6%;top:62%;width:380px;height:380px"></div><div class="blob" style="left:80%;top:8%;width:300px;height:300px"></div><div class="blob" style="left:86%;top:70%;width:420px;height:420px"></div></div>` : ""}</div>`,
  };
}

/** UI pieces for interface motions: cards, buttons, rows, fields, pills, avatars, icons and a cursor (an arrow drawn in SVG). The item
 *  writes its own markup with these classes. */
export const CURSOR = `<svg class="ui-cursor" viewBox="0 0 32 32" width="64" height="64"><path d="M6 3 L6 25 L12 19.5 L16 28.5 L20 26.8 L16 18 L24 18 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
export function ui(html, css = "") {
  return {
    css: `${VARS}
.ui-wrap { position: absolute; inset: 0; display: grid; place-items: center; }
.ui-card { position: relative; background: var(--tk-card); border: 2px solid var(--tk-line); border-radius: 36px; padding: 48px 56px; box-shadow: 0 40px 100px rgba(0, 0, 0, 0.35); }
.ui-h { font-size: 46px; font-weight: 700; margin: 0 0 14px; } .ui-p { font-size: 30px; color: #9aa3b8; margin: 0; }
.ui-btn { display: inline-grid; place-items: center; height: 104px; padding: 0 64px; border-radius: 30px; background: linear-gradient(180deg, #9c88ff, #7357f5); color: #fff; font-size: 40px; font-weight: 700; box-shadow: 0 18px 40px rgba(115, 87, 245, 0.35); }
.ui-btn.ghost { background: transparent; border: 3px solid var(--tk-line); color: #c3cadb; box-shadow: none; }
.ui-row { display: flex; align-items: center; gap: 28px; height: 110px; padding: 0 34px; border-radius: 24px; background: #1b2130; margin: 14px 0; font-size: 34px; color: #c9d2ea; }
.ui-dot { width: 56px; height: 56px; border-radius: 16px; background: #2a3350; flex: none; }
.ui-field { width: 760px; height: 112px; border-radius: 26px; border: 3px solid #36405a; background: #10141d; display: flex; align-items: center; padding: 0 36px; font-size: 36px; color: #c9d2ea; }
.ui-pill { display: inline-grid; place-items: center; height: 96px; padding: 0 52px; border-radius: 48px; font-size: 34px; font-weight: 800; letter-spacing: 0.08em; }
.ui-avatar { width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #b8a9ff, #6a4cf0); display: grid; place-items: center; font-size: 84px; font-weight: 800; color: #fff; }
.ui-avatar.grey { background: #2a3142; color: #6c778b; }
.ui-icon { width: 200px; height: 200px; border-radius: 48px; display: grid; place-items: center; background: linear-gradient(160deg, #ffd27a, #ff9b3d); font-size: 110px; }
.ui-cursor { position: absolute; left: 0; top: 0; z-index: 20; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5)); }
${css}`,
    html: `<div class="ui-wrap">${html}</div>`,
  };
}

/** Join stages and extras into a demo: { ...stage, run, duration, css + extra css }. */
export const demo = (stage, run, duration = 3, css = "") => ({ css: `${stage.css}\n${css}`, html: stage.html, run, duration });

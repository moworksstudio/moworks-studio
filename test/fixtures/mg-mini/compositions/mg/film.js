// mg-mini's film: Bauhaus shapes on a grid moved by a d3 scale and simplex noise, over the author's paper grain, all a pure function of t
// (mg-styles-15's page contract: an async renderAt(t), window.__ready).
import { createNoise2D } from '/node_modules/simplex-noise/dist/esm/simplex-noise.js';

const W = 640, H = 360, ctx = document.getElementById('c').getContext('2d');
const noise = createNoise2D(() => 0.42);          // seeded
const x = window.d3.scaleLinear().domain([0, 1]).range([80, 560]);
const grain = new Image();
grain.src = '/assets/textures/grain/grain_fine_2048.png';
await grain.decode();
await document.fonts.load('800 40px "Inter"', 'FORM');

window.renderAt = async (t) => {
  ctx.fillStyle = '#F1E9DA'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.15; ctx.drawImage(grain, 0, 0, W, H); ctx.globalAlpha = 1;
  const k = Math.min(1, t / 0.8);
  ctx.fillStyle = '#E03C31'; ctx.beginPath(); ctx.arc(x(k), 150 + 20 * noise(t, 0), 50, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1E4FA3'; ctx.fillRect(x(1 - k) - 40, 220, 80, 80);
  ctx.fillStyle = '#111'; ctx.font = '800 40px "Inter"'; ctx.fillText('FORM', 40, 60);
};

await window.renderAt(0);
window.__ready = true;

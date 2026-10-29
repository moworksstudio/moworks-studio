import "./motion-extra.css";   // tooltip, toasts, queued bar; loaded after every other sheet
import "./tooltip.js";
// Sliding selection (from Emil Kowalski's find-animation-opportunities): when the pressed segment or the selected
// tab changes, a ghost of the highlight slides from the old one to the new one (FLIP: transform only, 160 ms, the app's ease-out), then
// the new one shows. One listener for every segmented control and tab row; nothing runs with reduced motion.
const GROUPS = [
  { group: ".segmented", item: 'button[aria-pressed="true"]', ghost: "seg-ghost" },
  { group: ".tabs", item: 'button[aria-selected="true"]', ghost: "tab-ghost" },
];
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("click", (e) => {
  // a keyboard-made click (detail 0: Enter or Space) does not animate (Emil: keyboard actions stay instant)
  if (still() || e.detail === 0 || !(e.target instanceof Element)) return;
  for (const g of GROUPS) {
    const box = e.target.closest(g.group);
    if (!box) continue;
    const before = box.querySelector(g.item);
    if (!before) return;
    const from = before.getBoundingClientRect();
    // two frames later React has re-rendered the group with the new selection
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const after = box.querySelector(g.item);
      if (!after || after === before || !box.isConnected) return;
      const to = after.getBoundingClientRect(), base = box.getBoundingClientRect();
      const ghost = document.createElement("span");
      ghost.className = g.ghost;
      Object.assign(ghost.style, { left: `${to.left - base.left - box.clientLeft}px`, top: `${to.top - base.top - box.clientTop}px`, width: `${to.width}px`, height: `${to.height}px` });
      box.appendChild(ghost);
      box.classList.add("sliding");
      const run = ghost.animate([{ transform: `translateX(${from.left - to.left}px) scaleX(${from.width / to.width})` }, { transform: "none" }],
        { duration: 160, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
      run.finished.catch(() => {}).finally(() => { ghost.remove(); box.classList.remove("sliding"); });
    }));
    return;
  }
}, true);

// Light under the pointer: buttons and clickable cards read --mx / --my (the pointer inside them, in px) for a soft
// spotlight and a lit edge. Mouse only, one write per frame, only on the element under the pointer.
const LIT = ".btn, .card.clickable, .theme-card";
const fine = matchMedia("(hover: hover) and (pointer: fine)");
let frame = 0, at = null;
document.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || !fine.matches) return;
  at = e;
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const el = at.target instanceof Element ? at.target.closest(LIT) : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${Math.round(at.clientX - r.left)}px`);
    el.style.setProperty("--my", `${Math.round(at.clientY - r.top)}px`);
  });
}, { passive: true });

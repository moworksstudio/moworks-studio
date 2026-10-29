// The mouse wheel scrolls galleries that run sideways: over a box that scrolls only left-right, the wheel's up-down turn moves it left-right. A box that
// also scrolls up-down keeps the wheel for that; Ctrl / Shift + wheel are left to the page (zoom, the browser's own sideways scroll).
function sideways(el) {
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    const cs = getComputedStyle(x);
    const canX = /(auto|scroll)/.test(cs.overflowX) && x.scrollWidth > x.clientWidth + 1;
    const canY = /(auto|scroll)/.test(cs.overflowY) && x.scrollHeight > x.clientHeight + 1;
    if (canY) return null;
    if (canX) return x;
  }
  return null;
}

addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.shiftKey || e.defaultPrevented || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
  const box = sideways(e.target);
  if (!box) return;
  const before = box.scrollLeft;
  box.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
  if (box.scrollLeft !== before) e.preventDefault();
}, { passive: false });

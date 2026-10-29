// Tooltips (from the Lucian "gliding tooltip" idea, written new; Emil's gate: tens of uses a day, so small and quick).
// One tooltip for the whole app, driven by what is already in the markup: a `title` (the browser's own tip is slow and unstyled, so
// it is held back while ours is up) or the `aria-label` of a control that shows no words of its own (icon buttons, the collapsed rail).
// The first tip waits a beat; moving to the next control while one is up, or just after one went, shows at once and glides over.
// Mouse and keyboard focus only. Nothing changes in the markup beyond a title being emptied for as long as the pointer rests on it.
const fine = matchMedia("(hover: hover) and (pointer: fine)");
const SEL = "[title], button[aria-label], a[aria-label], [role='button'][aria-label], summary[aria-label]";
const SHOW_AFTER = 450, FOCUS_AFTER = 120, WARM_FOR = 350;

let tip = null, timer = 0, current = null, quiet = null, held = null, lastHidden = 0;
const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

/** The text to show for a control, or "" when it has nothing to add (its visible words already say it). */
function read(el) {
  const title = (el.getAttribute("title") || (held && held.el === el ? held.title : "")).trim();
  const label = el.matches("button, a, [role='button'], summary") ? (el.getAttribute("aria-label") || "").trim() : "";
  const text = title || label;
  if (!text) return "";
  const words = norm(el.innerText);
  if (words === norm(text)) return "";
  if (!title && words) return "";           // an aria-label is a tip only for a control that shows no words
  return text;
}

/** Empty the title while the pointer rests on the control so the browser does not draw its own tip as well. */
function hold(el) {
  if (held && held.el === el) return;
  release();
  const title = el.getAttribute("title");
  if (!title) return;
  held = { el, title };
  el.setAttribute("title", "");
}
function release() {
  if (held && held.el.isConnected && !held.el.getAttribute("title")) held.el.setAttribute("title", held.title);
  held = null;
}

function ensure() {
  if (tip) return tip;
  tip = document.createElement("div");
  tip.className = "mw-tip";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  return tip;
}

function place(el) {
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 8, edge = 8;
  // a control can ask for its side (data-tip-side): a storyboard frame's title goes below, off the option's heading
  const asked = el.closest("[data-tip-side]")?.dataset.tipSide;
  const side = asked ?? (el.closest(".rail") ? "right" : r.top < h + gap + 12 ? "bottom" : "top");
  let x = r.left + r.width / 2 - w / 2, y = r.top - h - gap;
  if (side === "bottom") y = r.bottom + gap;
  if (side === "right") { x = r.right + gap; y = r.top + r.height / 2 - h / 2; }
  x = Math.max(edge, Math.min(x, innerWidth - w - edge));
  y = Math.max(edge, Math.min(y, innerHeight - h - edge));
  tip.style.setProperty("--tx", `${Math.round(x)}px`);
  tip.style.setProperty("--ty", `${Math.round(y)}px`);
}

function show(el) {
  if (current !== el || !el.isConnected) return;
  const text = read(el);
  if (!text) return;
  ensure().textContent = text;
  const gliding = tip.classList.contains("on");
  tip.classList.toggle("snap", !gliding);   // a tip that was not up appears in place; one that was up glides to the new control
  place(el);
  if (!gliding) void tip.offsetWidth;
  tip.classList.add("on");
}

function hide() {
  clearTimeout(timer);
  release();
  current = null;
  if (tip && tip.classList.contains("on")) { tip.classList.remove("on"); lastHidden = performance.now(); }
}

function over(el, delay) {
  if (el && el === quiet) return;
  quiet = null;
  if (el === current) return;
  clearTimeout(timer);
  if (!el || !read(el)) { hide(); return; }
  const up = tip && tip.classList.contains("on");
  release();
  current = el;
  hold(el);
  const wait = up || performance.now() - lastHidden < WARM_FOR ? 0 : delay;
  if (wait === 0) show(el); else timer = setTimeout(() => show(el), wait);
}

const target = (e) => (e.target instanceof Element && !e.target.closest(".mw-tip") ? e.target.closest(SEL) : null);

document.addEventListener("pointerover", (e) => { if (e.pointerType === "mouse" && fine.matches) over(target(e), SHOW_AFTER); });
document.addEventListener("pointerdown", (e) => { quiet = target(e); hide(); }, true);
document.addEventListener("focusin", (e) => { const el = target(e); if (el && el.matches(":focus-visible")) over(el, FOCUS_AFTER); });
document.addEventListener("focusout", () => hide());
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { quiet = current; } hide(); }, true);
document.addEventListener("scroll", () => hide(), true);
document.addEventListener("wheel", () => hide(), { passive: true });
document.documentElement.addEventListener("mouseleave", () => hide());
window.addEventListener("blur", () => hide());

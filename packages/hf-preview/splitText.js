// Words animated letter by letter ("<span class=ch>Đ</span><span class=ch>Ư</span>…", or letters inside word spans) read and written as one
// text: a click on the film takes the whole line, the Shots column lists it once, and a new line is written back into the letter spans, so
// the film's script still finds and animates them. One file for both sides, so they cannot disagree: the preview page loads it as a classic
// script (the live edit, on the film's DOM), the server imports it (the file, on HF's parsed document). It only uses DOM calls both have.
// Letters are counted as a reader sees them (Intl.Segmenter graphemes, after NFC): "Ư", "Ờ" and a letter with a combining mark are one letter.
(() => {
  const SKIP = new Set(["script", "style", "template", "svg", "defs", "filter", "audio", "video", "img", "source", "canvas", "iframe", "br", "hr"]);
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  /** The letters of a text as a reader counts them. */
  const graphemes = (s) => Array.from(seg.segment(String(s ?? "").normalize("NFC")), (x) => x.segment);
  const blank = (s) => /^\s*$/.test(String(s ?? ""));          // \s holds the no-break space too
  /** A line as the card and the file hold it: composed letters, single spaces. */
  const tidy = (s) => String(s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  const tagOf = (el) => String(el.tagName ?? "").toLowerCase();
  const nodes = (el) => Array.from(el.childNodes ?? []);
  const isElement = (n) => n.nodeType === 1;
  const hasWords = (all) => all.some((n) => n.nodeType === 3 && !blank(n.textContent));
  /** Words written directly in the element, beside its children. */
  const hasText = (el) => hasWords(nodes(el));
  /** Where a letter's text sits: the element itself, or the end of a chain of only children (a mask around each letter); null when it branches. */
  function leafOf(el) {
    let x = el;
    for (let i = 0; i < 6; i++) {
      if (SKIP.has(tagOf(x))) return null;
      const kids = x.children;
      if (kids.length === 0) return x;
      if (kids.length > 1 || hasText(x)) return null;
      x = kids[0];
    }
    return null;
  }
  /** "letter", "space" (a span holding only a space), "word" (more letters than one) or null (anything else). */
  function kindOf(el) {
    const leaf = leafOf(el);
    const text = leaf?.textContent ?? "";
    if (!text) return null;
    if (blank(text)) return "space";
    return graphemes(text.trim()).length === 1 ? "letter" : "word";
  }
  const classesOf = (el) => String(el.getAttribute("class") ?? "").split(/\s+/).filter((c) => c && c !== "clip" && !c.startsWith("__hf"));
  /** Do these elements look alike: the same tag, and one class in common (or none at all)? A highlighted letter ("ch hot") still counts. */
  function alike(els) {
    if (new Set(els.map(tagOf)).size > 1) return false;
    const sets = els.map(classesOf);
    if (sets.every((c) => !c.length)) return true;
    return sets[0].some((c) => sets.every((x) => x.includes(c)));
  }
  /** An element whose children are single letters (and spans holding a space): at least two letters, nothing else. */
  function isLetters(el) {
    if (SKIP.has(tagOf(el)) || hasText(el)) return false;
    const els = Array.from(el.children);
    if (els.length < 2) return false;
    const kinds = els.map(kindOf);
    if (kinds.some((k) => k !== "letter" && k !== "space")) return false;
    const letters = els.filter((_, i) => kinds[i] === "letter");
    return letters.length >= 2 && alike(letters);
  }
  /** An element whose children are words made of letters ("<span class=w><span class=ch>…"), with spans or spaces between them. */
  function isWords(el) {
    if (SKIP.has(tagOf(el)) || hasText(el)) return false;
    const els = Array.from(el.children);
    if (els.length < 2) return false;
    const words = els.filter((k) => kindOf(k) !== "space");
    if (!words.some(isLetters)) return false;
    return words.every((k) => isLetters(k) || (k.children.length === 1 && kindOf(k) === "letter")) && alike(words);
  }
  const isRun = (el) => isLetters(el) || isWords(el);
  /** The line this element is part of: itself when it is the line, the element holding its letters, or the words around them; else null. */
  function runAround(el) {
    if (!el) return null;
    const up = (run) => { const g = run.parentElement; return g && isWords(g) ? g : run; };
    if (isWords(el)) return el;
    if (isLetters(el)) return up(el);
    let x = el;
    for (let i = 0; x && i < 4; i++) {
      const p = x.parentElement;
      if (!p) return null;
      if (isWords(p)) return p;
      if (isLetters(p)) return up(p);
      if (p.children.length !== 1 || hasText(p)) return null;          // only wrappers around one letter are climbed
      x = p;
    }
    return null;
  }
  /** How spaces in the source sit between the letters: "none", "words" (only at a word's gap: they are its spaces), or "all" (between every two:
   *  the way the file is laid out, and how the letters look; kept). */
  function textGaps(all) {
    let pairs = 0, spaced = 0, seen = false, gap = false;
    for (const n of all) {
      if (isElement(n)) { if (seen) { pairs++; if (gap) spaced++; } seen = true; gap = false; }
      else if (n.nodeType === 3 && blank(n.textContent)) gap = true;
    }
    return !spaced ? "none" : spaced === pairs ? "all" : "words";
  }
  const leafText = (k) => leafOf(k)?.textContent ?? "";
  function readLetters(el) {
    const all = nodes(el), gaps = textGaps(all);
    let out = "";
    for (const n of all) {
      if (isElement(n)) out += kindOf(n) === "space" ? " " : leafText(n).trim();
      else if (gaps === "words" && n.nodeType === 3 && blank(n.textContent)) out += " ";
    }
    return tidy(out);
  }
  /** The line an element holds, as one text ("ĐƯỜNG BI"). */
  function read(el) {
    if (isLetters(el)) return readLetters(el);
    if (isWords(el)) return tidy(Array.from(el.children).filter((k) => kindOf(k) !== "space").map((k) => (k.children.length > 1 ? readLetters(k) : leafText(k).trim())).join(" "));
    return tidy(el.textContent);
  }
  /** A copy of a letter or a word for a line grown longer: no id of its own (the file's ids stay unique, HF stamps a new one). */
  function copyOf(el) {
    const c = el.cloneNode(true);
    for (const x of [c, ...Array.from(c.querySelectorAll("*"))]) { x.removeAttribute("id"); x.removeAttribute("data-hf-id"); }
    return c;
  }
  const setLeaf = (k, text) => { const leaf = leafOf(k); if (leaf) leaf.textContent = text; };
  function fill(el, seq) {
    while (el.firstChild) el.removeChild(el.firstChild);
    for (const n of seq) el.appendChild(n);
  }
  /** The letters written into an element's letter spans, in order: a letter span stays a letter span, a space goes into a span that held one; a
   *  longer line copies the last letter, a shorter one drops the last ones. */
  function writeLetters(el, text, all) {
    const doc = el.ownerDocument, els = all.filter(isElement);
    const letters = els.filter((k) => kindOf(k) !== "space"), spaces = els.filter((k) => kindOf(k) === "space");
    const gaps = textGaps(all), ws = all.find((n) => n.nodeType === 3 && blank(n.textContent))?.textContent ?? " ";
    const template = letters.at(-1);
    let li = 0, si = 0;
    const seq = [];
    const push = (n) => { if (gaps === "all" && seq.length) seq.push(doc.createTextNode(ws)); seq.push(n); };
    for (const g of graphemes(tidy(text))) {
      if (blank(g)) {
        if (gaps === "words") { seq.push(doc.createTextNode(" ")); continue; }
        const sp = spaces[si++] ?? copyOf(spaces[0] ?? template);
        if (!spaces.length) setLeaf(sp, " ");
        push(sp);
      } else {
        const k = letters[li++] ?? copyOf(template);
        setLeaf(k, g);
        push(k);
      }
    }
    fill(el, seq);
  }
  function writeWords(el, text, all) {
    const doc = el.ownerDocument, els = all.filter(isElement);
    const words = els.filter((k) => kindOf(k) !== "space"), spaces = els.filter((k) => kindOf(k) === "space");
    const ws = all.some((n) => n.nodeType === 3 && blank(n.textContent));
    const seq = [];
    let si = 0;
    tidy(text).split(" ").filter(Boolean).forEach((w, i) => {
      if (i) {
        if (spaces.length) seq.push(spaces[si++] ?? copyOf(spaces[0]));
        else if (ws) seq.push(doc.createTextNode(" "));
      }
      const k = words[i] ?? copyOf(words.at(-1));
      writeLetters(k, w, nodes(k));
      seq.push(k);
    });
    fill(el, seq);
  }
  /** What a line is made of, read before it is written: the live edit keeps this while the line is short or empty, so nothing is lost as it types. */
  const prepare = (el) => ({ kind: isWords(el) ? "words" : isLetters(el) ? "letters" : null, all: nodes(el) });
  /** A new line written into an element's letters; true when it is a line of letters. */
  function write(el, text, st = prepare(el)) {
    if (st.kind === "words") writeWords(el, text, st.all);
    else if (st.kind === "letters") writeLetters(el, text, st.all);
    return !!st.kind;
  }
  /** Its letters and words, counted: the film's script animates each, so a line with another count asks the film to load again. */
  const countOf = (el) => el.querySelectorAll("*").length;
  globalThis.__mwSplitText = { graphemes, tidy, hasText, leafOf, kindOf, isLetters, isWords, isRun, runAround, read, prepare, write, countOf };
})();

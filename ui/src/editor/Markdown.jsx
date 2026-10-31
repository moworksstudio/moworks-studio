// Chat text as people read it in a chat app: paragraphs, headings, lists, **bold**, *italic*, `code`, code blocks and
// links, built as React elements (never as HTML, so a reply cannot inject markup). Long words, paths and URLs wrap (no sideways scroll).
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|((?<![\w/\\.*])\*(?=[^\s*])(?:[^*\n]*[^\s*])?\*(?![\w*]))|(\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function inline(text, key = "", hooks = null) {
  const out = [];
  let last = 0, i = 0;
  const words = (t) => { if (hooks?.text) out.push(...hooks.text(t, `${key}-w${i++}`)); else out.push(t); };
  // matchAll works on its own copy of the pattern, so the nested call for **bold** cannot reset this loop
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) words(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(hooks?.code?.(m[1].slice(1, -1), k) ?? <code key={k}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{inline(m[2].slice(2, -2), k, hooks)}</strong>);
    else if (m[3]) out.push(<em key={k}>{m[3].slice(1, -1)}</em>);
    else if (m[4]) { const t = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(m[4]); out.push(<a key={k} href={t[2]} target="_blank" rel="noopener noreferrer">{t[1]}</a>); }
    else if (m[5]) out.push(<a key={k} href={m[5]} target="_blank" rel="noopener noreferrer">{m[5]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) words(text.slice(last));
  return out;
}

const ITEM = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;
const isNumber = (mark) => /\d/.test(mark);
/** The index of the next line that holds something, or lines.length. */
const nextFull = (lines, i) => { while (i < lines.length && !lines[i].trim()) i++; return i; };

/** Blocks: ``` fences, # headings, - / * / 1. lists, | tables (shown as aligned rows), paragraphs. A numbered line's bullets (indented or not, a
 *  blank line or none between them) are a list under it, so a question and its choices read as one and the next question keeps its number.
 *  hooks: { text(words, key), code(words, key) } draw plain words or code another way (a Brand Kit's tokens and sources). */
export default function Markdown({ text, className = "md", hooks = null }) {
  const inl = (t, k) => inline(t, k, hooks);
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length;) {
    const l = lines[i];
    if (/^\s*```/.test(l)) {
      const body = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++; blocks.push(<pre key={blocks.length}><code>{body.join("\n")}</code></pre>); continue;
    }
    const h = /^(#{1,4})\s+(.+)$/.exec(l);
    if (h) { const H = `h${Math.min(6, h[1].length + 3)}`; blocks.push(<H key={blocks.length}>{inl(h[2], `h${i}`)}</H>); i++; continue; }
    const first = ITEM.exec(l);
    if (first) {
      const ordered = isNumber(first[2]), base = first[1].length, items = [];
      for (;;) {
        const m = ITEM.exec(lines[i] ?? "");
        if (!m) { const n = nextFull(lines, i), after = ITEM.exec(lines[n] ?? ""); if (!after || (!ordered && isNumber(after[2]))) break; i = n; continue; }
        const under = items.length > 0 && (m[1].length > base || (ordered && !isNumber(m[2])));
        if (!under && isNumber(m[2]) !== ordered) break;
        if (under) items.at(-1).kids.push(m[3]); else items.push({ text: m[3], kids: [], n: parseInt(m[2], 10) });
        i++;
      }
      const L = ordered ? "ol" : "ul", from = ordered && items[0].n !== 1 ? { start: items[0].n } : null;
      blocks.push(<L key={blocks.length} {...from}>{items.map((x, j) => <li key={j}>{inl(x.text, `l${i}-${j}`)}
        {x.kids.length > 0 && <ul>{x.kids.map((t, k) => <li key={k}>{inl(t, `l${i}-${j}-${k}`)}</li>)}</ul>}</li>)}</L>); continue;
    }
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().slice(1, -1).split("|").map((c) => c.trim())); i++; }
      blocks.push(<div className="md-table" key={blocks.length}><table><tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, k) => (j === 0 ? <th key={k}>{inl(c, `t${j}${k}`)}</th> : <td key={k}>{inl(c, `t${j}${k}`)}</td>))}</tr>)}</tbody></table></div>);
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const para = [lines[i++]];          // always take the line, so a line no block rule accepts (e.g. "| a" without a closing bar) cannot stall the loop
    while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,4}\s|([-*•]|\d+[.)])\s|\|.*\|\s*$)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={blocks.length}>{para.map((t, j) => <span key={j}>{j > 0 && <br />}{inl(t, `p${i}-${j}`)}</span>)}</p>);
  }
  return <div className={className}>{blocks}</div>;
}

// Chat text as people read it in a chat app: paragraphs, headings, lists, **bold**, *italic*, `code`, code blocks and
// links, built as React elements (never as HTML, so a reply cannot inject markup). Long words, paths and URLs wrap (no sideways scroll).
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|((?<![\w/\\.*])\*(?=[^\s*])(?:[^*\n]*[^\s*])?\*(?![\w*]))|(\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function inline(text, key = "") {
  const out = [];
  let last = 0, i = 0;
  // matchAll works on its own copy of the pattern, so the nested call for **bold** cannot reset this loop
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<code key={k}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{inline(m[2].slice(2, -2), k)}</strong>);
    else if (m[3]) out.push(<em key={k}>{m[3].slice(1, -1)}</em>);
    else if (m[4]) { const t = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(m[4]); out.push(<a key={k} href={t[2]} target="_blank" rel="noopener noreferrer">{t[1]}</a>); }
    else if (m[5]) out.push(<a key={k} href={m[5]} target="_blank" rel="noopener noreferrer">{m[5]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Blocks: ``` fences, # headings, - / * / 1. lists, | tables (shown as aligned rows), paragraphs. */
export default function Markdown({ text, className = "md" }) {
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
    if (h) { const H = `h${Math.min(6, h[1].length + 3)}`; blocks.push(<H key={blocks.length}>{inline(h[2], `h${i}`)}</H>); i++; continue; }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]\s+/.test(l), items = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, "")); i++; }
      const L = ordered ? "ol" : "ul";
      blocks.push(<L key={blocks.length}>{items.map((t, j) => <li key={j}>{inline(t, `l${i}-${j}`)}</li>)}</L>); continue;
    }
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().slice(1, -1).split("|").map((c) => c.trim())); i++; }
      blocks.push(<div className="md-table" key={blocks.length}><table><tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, k) => (j === 0 ? <th key={k}>{inline(c, `t${j}${k}`)}</th> : <td key={k}>{inline(c, `t${j}${k}`)}</td>))}</tr>)}</tbody></table></div>);
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const para = [lines[i++]];          // always take the line, so a line no block rule accepts (e.g. "| a" without a closing bar) cannot stall the loop
    while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,4}\s|([-*•]|\d+[.)])\s|\|.*\|\s*$)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={blocks.length}>{para.map((t, j) => <span key={j}>{j > 0 && <br />}{inline(t, `p${i}-${j}`)}</span>)}</p>);
  }
  return <div className={className}>{blocks}</div>;
}

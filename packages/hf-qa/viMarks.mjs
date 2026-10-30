// G-VI-MARKS: Vietnamese on screen written without its marks. Test 24's ASCII / CRT film showed "NHAT KY · TRAM HON GIO", "CHUA GUI",
// "THONG BAO TU DAT LIEN" in its status strips, and neither the Build nor the Review caught it (moworks-studio §4: every diacritic on
// every frame; a style's ASCII look is no reason to drop them). A static read of the film's words, a warning (the Tech checks dialog and
// the Review's qc_sheets answer): each piece of on-screen text with no marked letter at all (an HTML text, a string or JSX text of the
// film's own code) whose words are Vietnamese words with their marks taken off. Which words those are comes from the film's own
// Vietnamese, written with marks (its brief, storyboard, words to read, transcript and on-screen text), and a short list of common
// words: "TRAM" counts once the film writes "TRẠM", and a word the film itself writes without marks in a marked sentence ("chiều nay",
// "bản tin") never counts. Two such words at least, half the text's words, one of four letters or more: an English line ("TO BE
// CONTINUED", "THE END") is not taken for one.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { docPath } from "../project-service/docs.mjs";
import { htmlFiles } from "../hf-edit/finalize.mjs";
import { scriptFiles } from "../hf-edit/vendorLibs.mjs";

const MARKED = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu;
/** A word with its Vietnamese marks taken off, in lower case ("TRẠM" → "tram", "đất" → "dat"). */
export const unmark = (w) => String(w).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const wordsOf = (s) => String(s).normalize("NFC").match(/[\p{L}]+/gu) ?? [];

// common Vietnamese words that carry marks, for a film whose own text is short (each one's unmarked form is what the check looks for)
const COMMON = `người được không những trong với một của các này đã để có là và đến từ về vào nhà năm ngày tháng giờ phút thời tiết thông báo
  đất liền chưa gửi nhật ký trạm chiều sáng tối đêm mới cũ lời chữ tiếng việt bản hệ thống phim cảm ơn đọc viết gió mưa nắng biển trời
  đảo cuối đầu tin tức mở đóng cửa máy tính điện thoại nhận gọi đi đâu sẽ rồi lại còn nữa cũng như thế nào vì sao bởi nhưng hay hoặc nếu
  thì mà đó đây kia ấy họ chúng tôi bạn mình ông bà cháu chị cô chú bác học trường lớp sách vở bàn ghế phòng đường phố thành phố làng
  quê nước sông núi rừng cây hoa lá trăng sao mặt trời ánh sáng bóng tối màu đỏ xanh vàng trắng đen tím hồng chạy đứng ngồi nằm ăn uống
  ngủ thức yêu thương nhớ quên biết hiểu nghĩ muốn cần phải nhỏ lớn dài ngắn cao thấp nhanh chậm nóng lạnh ấm mát đẹp xấu tốt vui buồn
  sợ giận khóc cười chờ đợi tìm thấy nghe nói hỏi trả lời bắt đầu kết thúc hôm qua mai sau trước giữa trên dưới ngoài bên cạnh lúc khi
  vẫn đang chỉ rất quá lắm hết tất cả mọi riêng chung tự động trực dự báo cấp độ nhiệt độ áp suất tàu thuyền cảng phao đèn hải đăng`;

/** The film's Vietnamese, as two sets: `lost` (a marked word's unmarked form) and `plain` (a word the film writes with no marks inside a
 *  marked sentence, e.g. "nay", "tin"), from texts that carry marks. */
export function vocabulary(texts) {
  const lost = new Set(), plain = new Set();
  for (const t of [COMMON, ...texts]) {
    for (const line of String(t ?? "").split(/\r?\n|[.!?;·•|]+/)) {
      if (t !== COMMON && !MARKED.test(line)) continue;          // a line written without marks says nothing about which words have them
      for (const w of wordsOf(line)) (MARKED.test(w) ? lost : plain).add(MARKED.test(w) ? unmark(w) : w.toLowerCase());
    }
  }
  for (const w of COMMON.split(/\s+/)) if (w && !MARKED.test(w)) plain.add(w);
  for (const w of plain) lost.delete(w);
  return { lost, plain };
}

/** The words of one on-screen text that are Vietnamese with their marks taken off; [] when the text has a marked letter, is one word,
 *  or does not read as such (see the file's head). */
export function unmarkedWords(text, vocab) {
  if (MARKED.test(text)) return [];
  const ws = wordsOf(text).filter((w) => /^[a-z]+$/i.test(w));
  if (ws.length < 2) return [];
  const hit = ws.filter((w) => vocab.lost.has(w.toLowerCase()));
  return hit.length >= 2 && hit.length * 2 >= ws.length && hit.some((w) => w.length >= 4) ? hit : [];
}

const read = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
const walk = (d, ok) => { const out = []; if (!existsSync(d)) return out; for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) { if (n !== "node_modules" && !n.startsWith(".")) out.push(...walk(f, ok)); } else if (ok(n)) out.push(f); } return out; };
const lineAt = (s, i) => s.slice(0, i).split("\n").length;
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", bull: "•", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m));

/** The texts a page shows: its text between tags (scripts, styles, its title and comments left out). */
function htmlTexts(html) {
  const out = [];
  const body = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " ")).replace(/<(script|style|title|template)\b[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, " "));
  for (const m of body.matchAll(/>([^<>]+)</g)) { const t = decode(m[1]).replace(/\s+/g, " ").trim(); if (t) out.push({ at: m.index + 1, text: t }); }
  return out;
}
/** The strings and JSX texts of a film's code (comments left out). */
function codeTexts(src) {
  const s = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)/g, (m, str) => (str ? m : m.replace(/[^\n]/g, " ")));
  const out = [];
  for (const m of s.matchAll(/"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])*)'|`((?:\\.|[^`\\])*)`/g)) {
    const t = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ").replace(/\\n/g, " ").trim();
    // words on screen have a space between them: a key, an id or a slug ("tram-hon-gio") and a path are not shown
    if (t && /\s/.test(t) && !/[/\\]/.test(t)) out.push({ at: m.index, text: t });
  }
  for (const m of s.matchAll(/>([^<>{}"'`=;]+)</g)) { const t = m[1].replace(/\s+/g, " ").trim(); if (/[a-z]/i.test(t)) out.push({ at: m.index + 1, text: t }); }
  return out;
}

/** The film's language: the project's own, else Vietnamese when its brief writes Vietnamese letters. */
export function filmIsVietnamese(projectDir) {
  let m = null; try { m = JSON.parse(read(join(projectDir, ".moworks", "project.json"))); } catch { return false; }
  if (m?.language?.id) return m.language.id === "vi";
  return MARKED.test(String(m?.brief?.text ?? ""));
}

/** The on-screen texts of the film (and of the storyboard's boards with `boards`) written in Vietnamese without its marks:
 *  { files, findings: [{ file, line, text, words }] }. Nothing when the film is not in Vietnamese. */
export function viMarks(projectDir, { boards = false } = {}) {
  if (!filmIsVietnamese(projectDir)) return { files: 0, findings: [] };
  const rel = (f) => relative(projectDir, f).split(sep).join("/");
  const files = [
    ...htmlFiles(projectDir).map((r) => ({ r, kind: "html" })),
    ...scriptFiles(projectDir).map((r) => ({ r, kind: "code" })),
    ...["whatif", "anidoodle"].flatMap((d) => walk(join(projectDir, d), (n) => /\.tsx?$/.test(n) && !/\.d\.ts$/.test(n)).map((f) => ({ r: rel(f), kind: "code" }))),
    ...(boards ? walk(join(projectDir, "boards"), (n) => /\.(html|m?js|tsx?)$/.test(n) && !/\.min\.js$/.test(n)).filter((f) => !/[\\/]rounds[\\/]/.test(f)).map((f) => ({ r: rel(f), kind: /\.html$/.test(f) ? "html" : "code" })) : []),
  ];
  const texts = files.map(({ r, kind }) => { const src = read(join(projectDir, ...r.split("/"))); return { r, src, items: kind === "html" ? htmlTexts(src) : codeTexts(src) }; });
  let transcript = ""; try { transcript = JSON.parse(read(join(projectDir, "transcript.json"))).map((w) => w.text).join(" "); } catch { /* none */ }
  let brief = ""; try { brief = JSON.parse(read(join(projectDir, ".moworks", "project.json")))?.brief?.text ?? ""; } catch { /* none */ }
  const vocab = vocabulary([brief, read(join(projectDir, "STORYBOARD.md")), read(docPath(projectDir, "VOICEOVER.md")), read(join(projectDir, "BRIEF.md")), transcript,
    ...texts.flatMap((x) => x.items.map((i) => i.text))]);
  const findings = [], seen = new Set();
  for (const { r, src, items } of texts) {
    for (const { at, text } of items) {
      const words = unmarkedWords(text, vocab);
      if (!words.length || seen.has(`${r}\n${text}`)) continue;
      seen.add(`${r}\n${text}`);
      findings.push({ file: r, line: lineAt(src, at), text: text.slice(0, 80), words });
    }
  }
  return { files: files.length, findings };
}

const message = (x) => `"${x.text}" is Vietnamese written without its marks (${x.words.join(", ")})`;

/** The Tech checks gate: a warning, never a block; null when the film is not in Vietnamese. */
export function gateViMarks(projectDir) {
  if (!filmIsVietnamese(projectDir)) return null;
  const r = viMarks(projectDir);
  return { id: "G-VI-MARKS", blocking: false, pass: r.findings.length === 0, warnings: r.findings.length,
    findings: r.findings.map((x) => ({ ...x, message: message(x) })) };
}

/** Lines for Claude's tool replies (qc_sheets, board_stills), or "" when nothing is found. */
export function viMarksText(r) {
  if (!r?.findings?.length) return "";
  return ["Vietnamese written without its marks (the app's check of the words on screen; moworks-studio §4: write each with every mark, whatever the style's look, and leave the marks room in any band behind it):",
    ...r.findings.slice(0, 12).map((x) => `- ${message(x)} (${x.file}:${x.line})`), ...(r.findings.length > 12 ? [`- and ${r.findings.length - 12} more`] : [])].join("\n");
}

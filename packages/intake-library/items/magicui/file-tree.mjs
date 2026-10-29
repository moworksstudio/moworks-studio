// Magic UI file-tree (apps/www/registry/magicui/file-tree.tsx at efe76fc): a file / folder tree (Radix accordion): rows with folder and file
// icons (lucide Folder / FolderOpen / File), children indented 20 px with a guide line, folders opening with the accordion height
// animation (0.2 s ease-out), the selected item highlighted (rounded, muted background). Port: the tree is given as data; folders open
// and items get selected at times on the film's timeline (each opening eases the measured height); icons drawn inline (lucide, ISC).
export default {
  id: "file-tree",
  kind: "block",
  title: "File Tree",
  sub: "Cây thư mục mở dần từng cấp",
  desc: "A file and folder tree whose folders open one level after another, with indentation guides and a highlighted selection: for developer-tool scenes.",
  category: "Code",
  tags: ["files", "folders", "tree", "explorer", "code", "developer", "magicui"],
  source: { path: "apps/www/registry/magicui/file-tree.tsx" },
  notes: "elements: [{ id, name, children? }]; opens: [[t, id], ...]; selects: [[t, id], ...]. Folders listed in `open` start open (upstream's initialExpandedItems).",
  options: { elements: "tree data", open: "[ids] open at the start", opens: "[[t, id], ...]", selects: "[[t, id], ...]" },
  defaults: { elements: [], open: [], opens: [], selects: [] },
  uses: ["bezier"],
  css: `.mw-file-tree { position: relative; overflow: hidden; padding: 8px; font-size: 14px; }
.mw-file-tree .mw-ft-row { display: flex; align-items: center; gap: 4px; padding: 2px 4px; border-radius: 6px; white-space: nowrap; }
.mw-file-tree .mw-ft-row svg { width: 16px; height: 16px; flex: none; }
.mw-file-tree .mw-ft-kids { position: relative; overflow: hidden; margin-left: 20px; display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
.mw-file-tree .mw-ft-kids::before { content: ""; position: absolute; left: 1.5px; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.12); }
.mw-file-tree .mw-ft-list { display: flex; flex-direction: column; gap: 4px; }`,
  markup: `<div class="mw-file-tree"></div>`,
  fn: function (el, tl, at, o) {
    var FOLDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
    var OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>';
    var FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
    var rows = {}, kids = {}, esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    var build = function (list, parent) {
      var box = document.createElement("div"); box.className = "mw-ft-list";
      list.forEach(function (it) {
        var row = document.createElement("div"); row.className = "mw-ft-row"; row.innerHTML = (it.children ? FOLDER : FILE) + "<span>" + esc(it.name) + "</span>"; box.appendChild(row); rows[it.id] = row;
        if (it.children) { var k = document.createElement("div"); k.className = "mw-ft-kids"; k.appendChild(build(it.children)); box.appendChild(k); kids[it.id] = k; }
      });
      return box;
    };
    el.appendChild(build(o.elements));
    // natural heights, then folders start closed unless listed in `open`
    var full = {}; Object.keys(kids).forEach(function (id) { full[id] = kids[id].offsetHeight; });
    var out = MW.bezier.apply(null, MW.CSS_EASE.easeOut), openAt = {};
    o.opens.forEach(function (p) { openAt[p[1]] = p[0]; });
    var s = { t: 0 }, set = function () {
      Object.keys(kids).forEach(function (id) {
        var isOpen = o.open.indexOf(id) >= 0, k = isOpen ? 1 : openAt[id] == null ? 0 : Math.max(0, Math.min(1, (s.t - openAt[id]) / 0.2));
        kids[id].style.height = k >= 1 ? "auto" : full[id] * out(k) + "px"; kids[id].style.paddingTop = kids[id].style.paddingBottom = k > 0 ? "4px" : "0"; kids[id].style.display = k > 0 ? "" : "none";
        var icon = k > 0 ? OPEN : FOLDER, cur = rows[id].querySelector("svg");
        if (cur.getAttribute("data-open") !== String(k > 0)) { cur.outerHTML = icon.replace("<svg ", '<svg data-open="' + (k > 0) + '" '); }
      });
      var sel = null; o.selects.forEach(function (p) { if (s.t >= p[0]) sel = p[1]; });
      Object.keys(rows).forEach(function (id) { rows[id].style.background = id === sel ? "rgba(255,255,255,0.1)" : "transparent"; });
    };
    set();
    var end = 0; o.opens.concat(o.selects).forEach(function (p) { end = Math.max(end, p[0] + 0.3); });
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 6,
    css: `.box { width: 760px; height: 820px; border-radius: 26px; border: 2px solid #27272a; padding: 30px; } .mw-file-tree { font-size: 40px; font-family: 'JetBrains Mono', monospace; }
.mw-file-tree .mw-ft-row { gap: 14px; padding: 6px 12px; border-radius: 12px; } .mw-file-tree .mw-ft-row svg { width: 40px; height: 40px; } .mw-file-tree .mw-ft-kids { margin-left: 44px; }`,
    html: `<div class="center"><div class="box"><div class="mw-file-tree"></div></div></div>`,
    run: `MW.fileTree(q(".mw-file-tree"), tl, 0.3, { elements: [{ id: "src", name: "src", children: [{ id: "lib", name: "lib", children: [{ id: "utils", name: "utils.ts" }] },
  { id: "app", name: "app", children: [{ id: "page", name: "page.tsx" }, { id: "layout", name: "layout.tsx" }] }, { id: "comps", name: "components", children: [{ id: "btn", name: "button.tsx" }, { id: "hdr", name: "header.tsx" }] }] }],
  open: ["src"], opens: [[0.6, "lib"], [1.4, "app"], [2.2, "comps"]], selects: [[1.0, "utils"], [1.8, "page"], [2.8, "btn"]] });`,
  },
};

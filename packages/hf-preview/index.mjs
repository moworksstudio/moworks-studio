// hf-preview: the preview origin. A second loopback server, a different origin from the UI, serves the project
// files, HF's <hyperframes-player> and HF's runtime, so composition scripts can never reach the UI's API or its token. Every URL carries a
// per-session preview key. The host page talks to the UI only through postMessage, checked against the UI's origin.
//   GET /<key>/player.js            HF player (pinned version)
//   GET /<key>/runtime.js           HF runtime (fallback for projects without an embedded runtime)
//   GET /<key>/host.js              the host page script (picking, marks, commands from the UI)
//   GET /<key>/split-text.js        words animated letter by letter as one line (read by host.js; the server's hand edits use the same file)
//   GET /<key>/p/<id>/__preview     host page with the player
//   GET /<key>/p/<id>/<file>        a project file (not .git, .claude, .moworks except its posters)
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";

const HOST_JS = join(import.meta.dirname, "host.js"), SPLIT_JS = join(import.meta.dirname, "splitText.js");

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
  ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };

/** The player and runtime files of the pinned HF version. */
export function playerFiles(version = null) {
  const rt = resolveRuntime(version);
  const nm = join(rt.dir, "node_modules", "@hyperframes");
  return { version: rt.version, player: join(nm, "player", "dist", "hyperframes-player.global.js"), runtime: join(nm, "core", "dist", "hyperframe.runtime.iife.js") };
}

/** The host page: HF's player filling the page, the overlay that takes clicks for picking and draws the app's marks, and host.js. */
function hostPage({ key, id, uiOrigin, width, height }) {
  const src = `/${key}/p/${id}/index.html`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Preview</title>
<style>html,body{margin:0;height:100%;background:#2b2b2d;overflow:hidden}hyperframes-player{display:block;width:100%;height:100%;background:#2b2b2d}
#ov{position:fixed;inset:0;cursor:default}#marks{position:fixed;inset:0;pointer-events:none}
#marks div{position:absolute;box-sizing:border-box}#marks .sel{border:2px solid #E4602A;box-shadow:0 0 0 1px rgba(0,0,0,.45)}
#marks .sel.locked{border-style:dashed;border-color:#A8A298}#marks .safe{border:1px dashed rgba(255,255,255,.75);mix-blend-mode:difference}#marks .safe.title{border-style:dotted}
#marks .grid{background:rgba(255,255,255,.6);mix-blend-mode:difference}</style>
<script src="/${key}/player.js"></script></head>
<body data-ui="${uiOrigin}" data-w="${width}" data-h="${height}" data-src="${src}">
<hyperframes-player id="p" src="${src}" runtime-src="/${key}/runtime.js" width="${width}" height="${height}" disable-click-to-play assets-loading-ui="none" shader-loading="none"></hyperframes-player>
<div id="ov" tabindex="0" aria-label="Film"></div><div id="marks"></div>
<script src="/${key}/split-text.js"></script><script src="/${key}/host.js"></script></body></html>`;
}

/** Start the preview origin. resolveProject(id) -> { dir, width, height } | null. uiOrigin: the UI's own origin (postMessage target). */
export function startPreviewServer({ resolveProject, uiOrigin, version = null, port = 0, key = randomBytes(12).toString("hex") }) {
  // looked up at the first request, not at start: on a new computer the app starts before HyperFrames is installed (first run)
  let found = null;
  const files = () => { try { return (found ??= playerFiles(version)); } catch { return null; } };
  const server = createServer((req, res) => {
    const addr = server.address();
    const own = [`127.0.0.1:${addr.port}`, `localhost:${addr.port}`];
    const deny = (s, m) => { res.writeHead(s, { "Content-Type": "text/plain; charset=utf-8" }); res.end(m); };
    if (!own.includes((req.headers.host ?? "").toLowerCase())) return deny(403, "Forbidden");
    if (req.method !== "GET" && req.method !== "HEAD") return deny(405, "Method not allowed");
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
    if (parts[0] !== key) return deny(404, "Not found");
    const sendFile = (file, extra = {}) => {
      if (!existsSync(file) || !statSync(file).isFile()) return deny(404, "Not found");
      const size = statSync(file).size, type = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
      const base = { "Content-Type": type, "Cache-Control": "no-store", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff", ...extra };
      if (range && (range[1] || range[2])) {
        const start = range[1] ? +range[1] : Math.max(0, size - +range[2]), end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
        if (start >= size || start > end) { res.writeHead(416, { "Content-Range": `bytes */${size}` }); return res.end(); }
        res.writeHead(206, { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
        return req.method === "HEAD" ? res.end() : createReadStream(file, { start, end }).pipe(res);
      }
      res.writeHead(200, { ...base, "Content-Length": size });
      return req.method === "HEAD" ? res.end() : createReadStream(file).pipe(res);
    };
    if (parts[1] === "player.js" || parts[1] === "runtime.js") {
      const f = files();
      if (!f) return deny(503, "HyperFrames is not installed yet");
      return sendFile(parts[1] === "player.js" ? f.player : f.runtime);
    }
    if (parts[1] === "host.js") return sendFile(HOST_JS);
    if (parts[1] === "split-text.js") return sendFile(SPLIT_JS);
    if (parts[1] === "p" && parts[2]) {
      const proj = resolveProject(parts[2]);
      if (!proj) return deny(404, "Project not found");
      if (parts[3] === "__preview") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
          "Content-Security-Policy": `frame-ancestors ${uiOrigin}`, "X-Content-Type-Options": "nosniff" });
        return res.end(hostPage({ key, id: parts[2], uiOrigin, width: proj.width ?? 1920, height: proj.height ?? 1080 }));
      }
      const rel = normalize(parts.slice(3).join("/"));
      const top = rel.split(/[\\/]/)[0];
      const postersOnly = top === ".moworks" && /^\.moworks\/(cache\/(posters|proxy|music-options)|qc)\//.test(rel.replace(/\\/g, "/"));          // posters, a code film's preview proxy, the QC sheets, the music to listen to
      if (!rel || [".git", ".claude"].includes(top) || (top === ".moworks" && !postersOnly)) return deny(403, "Forbidden");
      const file = resolve(proj.dir, rel);
      if (!file.startsWith(resolve(proj.dir) + sep)) return deny(403, "Forbidden");
      return sendFile(file);
    }
    return deny(404, "Not found");
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => {
    const p = server.address().port;
    // the app window keeps connections open here (the film's MP4 streaming, kept-alive requests): close() alone waited for
    // them and Exit hung about 4.5 min; they are cut first
    ok({ port: p, key, origin: `http://127.0.0.1:${p}`, base: `http://127.0.0.1:${p}/${key}`,
      close: () => new Promise((r) => { server.close(() => r()); server.closeAllConnections?.(); }) });
  }));
}

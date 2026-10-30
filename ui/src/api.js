// The UI's only door to the backend (UI -> backend API only). The session token comes from the launch URL (?t=...) and is kept
// for this tab only; it is removed from the address bar so it is not bookmarked or shared.
const KEY = "mw-token";
(() => {
  const u = new URL(location.href);
  const t = u.searchParams.get("t");
  if (t) { try { sessionStorage.setItem(KEY, t); } catch {} u.searchParams.delete("t"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
})();
const token = () => { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } };

export class ApiError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }

/** `keepalive`: the request outlives the page (a write sent as the window closes or reloads). `signal`: the caller gives the request up
 *  (a read a busy server does not answer in time): it is not asked again and never read as an answer. */
// One read the browser could not send (net::ERR_NO_BUFFER_SPACE, the service running) said the service was down; a
// read is asked twice more first (a write is never sent twice), and only a service that does not answer any of them is called down
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
const aborted = () => new ApiError(0, "ABORTED", "The app stopped waiting for this answer.");
export async function api(method, path, body, { keepalive = false, signal = undefined } = {}) {
  let r;
  for (let i = 0; ; i++) {
    try {
      r = await fetch(path, { method, keepalive, signal, headers: { "X-MW-Token": token(), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
      break;
    } catch {
      if (signal?.aborted) throw aborted();
      if (method === "GET" && i < 2) { await pause(i ? 1500 : 400); continue; }
      throw new ApiError(0, "OFFLINE", "Moworks Studio's local service is not running. Start the app again from its shortcut.");
    }
  }
  const j = await r.json().catch(() => ({}));
  if (signal?.aborted) throw aborted();          // a body the caller cut is no answer (it read as an empty one)
  if (!r.ok) throw new ApiError(r.status, j.error?.code ?? "ERROR", j.error?.message ?? `Request failed (${r.status})`);
  return j;
}

export const get = (p, opts) => api("GET", p, undefined, opts);
export const post = (p, b) => api("POST", p, b ?? {});
export const patch = (p, b) => api("PATCH", p, b);
export const put = (p, b) => api("PUT", p, b);
export const del = (p) => api("DELETE", p);

/** Upload a file as the request body (X-File-Name header), with progress 0..1. Resolves with the JSON answer. */
export function upload(path, file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", path);
    x.setRequestHeader("X-MW-Token", token());
    x.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    x.setRequestHeader("Content-Type", "application/octet-stream");
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      let j = {}; try { j = JSON.parse(x.responseText); } catch { /* not JSON */ }
      if (x.status >= 200 && x.status < 300) resolve(j); else reject(new ApiError(x.status, j.error?.code ?? "ERROR", j.error?.message ?? `Upload failed (${x.status})`));
    };
    x.onerror = () => reject(new ApiError(0, "OFFLINE", "Moworks Studio's local service is not running."));
    x.send(file);
  });
}

/** Import one asset into a project: the file is copied into the project by kind; role (audio, or a talking-head video):
 *  voiceover | music | sfx. Progress 0..1; abort() through the returned object. done resolves with { file, voice }. */
export function uploadAsset(projectId, file, { role = null, onProgress = () => {} } = {}) {
  const x = new XMLHttpRequest();
  const done = new Promise((resolve, reject) => {
    x.open("POST", `/api/projects/${projectId}/assets/upload`);
    x.setRequestHeader("X-MW-Token", token());
    x.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    if (role) x.setRequestHeader("X-Asset-Role", role);
    x.setRequestHeader("Content-Type", "application/octet-stream");
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      let j = {}; try { j = JSON.parse(x.responseText); } catch { /* not JSON */ }
      if (x.status >= 200 && x.status < 300) resolve(j); else reject(new ApiError(x.status, j.error?.code ?? "ERROR", j.error?.message ?? `Upload failed (${x.status})`));
    };
    x.onerror = () => reject(new ApiError(0, "OFFLINE", "Moworks Studio's local service is not running."));
    x.onabort = () => reject(new ApiError(0, "CANCELLED", "Cancelled"));
    x.send(file);
  });
  return { done, abort: () => x.abort() };
}

/** This window keeps one stream open to the service; when every app window has closed for ~10 s (a reload is not
 *  closing), the service stops all work and exits. While work runs, closing asks the browser's own "Leave site?" (the only prompt a
 *  browser allows; its words cannot be changed). */
let busy = false;
export const setBusy = (b) => { busy = !!b; };
export function holdPresence() {
  addEventListener("beforeunload", (e) => { if (busy) { e.preventDefault(); e.returnValue = ""; } });
  const open = async () => {
    try {
      const r = await fetch("/api/app/presence", { headers: { "X-MW-Token": token() }, cache: "no-store" });
      const rd = r.body.getReader();
      for (;;) { const { done } = await rd.read(); if (done) break; }
    } catch { /* the service restarted or stopped */ }
    setTimeout(open, 2000);
  };
  open();
}

/** A file from the API as a blob URL (media players cannot send the session token themselves). */
export async function blobUrl(path) {
  const r = await fetch(path, { headers: { "X-MW-Token": token() } });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new ApiError(r.status, j.error?.code ?? "ERROR", j.error?.message ?? `Request failed (${r.status})`); }
  return URL.createObjectURL(await r.blob());
}

/** Poll a background job until it ends; onUpdate gets every state. */
export function watchJob(id, onUpdate, every = 1000) {
  let alive = true;
  const tick = async () => {
    if (!alive) return;
    try { const j = await api("GET", `/api/jobs/${id}`); onUpdate(j); if (j.status !== "running") return; } catch (e) { onUpdate(null, e); return; }
    setTimeout(tick, every);
  };
  tick();
  return () => { alive = false; };
}

/** Download a file the API serves (the session token goes in the header, so a plain link cannot): saved under `name`. */
export async function download(path, name) {
  let r;
  try { r = await fetch(path, { headers: { "X-MW-Token": token() } }); } catch { throw new ApiError(0, "OFFLINE", "Moworks Studio's local service is not running."); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new ApiError(r.status, j.error?.code ?? "ERROR", j.error?.message ?? `Download failed (${r.status})`); }
  const u = URL.createObjectURL(await r.blob());
  const a = Object.assign(document.createElement("a"), { href: u, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}

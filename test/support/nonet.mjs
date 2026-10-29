// Preload: every non-loopback network call from Node fails and is logged to stderr.
import http from "node:http"; import https from "node:https"; import net from "node:net";
const local = (h) => !h || /^(localhost|127\.|\[?::1\]?$)/.test(String(h));
const note = (what, h) => process.stderr.write(`[NONET] blocked ${what} ${h}\n`);
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const u = new URL(typeof input === "string" ? input : input.url ?? String(input));
  if (!local(u.hostname)) { note("fetch", u.href); throw new TypeError("fetch failed (NONET)"); }
  return realFetch(input, init);
};
for (const mod of [http, https]) for (const fn of ["request", "get"]) {
  const real = mod[fn];
  mod[fn] = function (...args) { const a = args[0]; const h = typeof a === "string" || a instanceof URL ? new URL(a).hostname : a?.hostname ?? a?.host;
    if (!local(h)) { note(`${fn}`, h); throw new Error("NONET"); } return real.apply(this, args); };
}
const realConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) { const o = args[0]; const h = typeof o === "object" ? o.host : args[1];
  if (typeof o === "object" && o.path) return realConnect.apply(this, args);
  if (!local(h)) { note("socket", h); throw new Error("NONET"); } return realConnect.apply(this, args); };

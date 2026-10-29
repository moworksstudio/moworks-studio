// Claude sign-in for the whole app Claude no longer gates the app: the top-bar chip shows the state and
// signs in / out with Claude Code's own commands, and every Claude task (and a New project that starts one) is refused with
// CLAUDE_SIGNED_OUT while Claude Code is not signed in, so no task starts and then fails half-way. The app never sees a password:
// `claude auth login` opens the browser; when the browser shows a code instead, the user pastes it and it goes to Claude Code's stdin.
import { claudeLogin, claudeLogout, claudeStatusAsync } from "../system-status/index.mjs";

const TTL = 60000;           // a known state is trusted this long; Refresh, a sign-in, a sign-out or a task failing on sign-in read it again
const err = (code, message) => Object.assign(new Error(message), { code });
/** Claude Code's own words when a task ran without a valid sign-in (print mode). */
export const SIGNED_OUT_TEXT = /please run \/login|not logged in|invalid api key|oauth token (has )?expired|authentication_error/i;

export function claudeService(root) {
  let cache = null, reading = null, login = null;

  const read = () => (reading ??= claudeStatusAsync(root).then((v) => { cache = { at: Date.now(), value: v }; return v; }).finally(() => { reading = null; }));
  const loginState = () => (login ? { running: login.exitCode === undefined, url: login.l.url, startedAt: login.startedAt, exitCode: login.exitCode ?? null,
    error: login.exitCode && login.exitCode !== 0 && !login.cancelled ? String(login.l.output ?? "").split(/\r?\n/).filter(Boolean).slice(-2).join(" ").slice(0, 300) : null } : null);

  const service = {
    async status({ refresh = false } = {}) {
      const v = !refresh && cache && Date.now() - cache.at < TTL ? cache.value : await read();
      return { ...v, checkedAt: new Date(cache?.at ?? Date.now()).toISOString(), login: loginState() };
    },
    /** Throws NO_CLAUDE / CLAUDE_SIGNED_OUT unless Claude Code is installed and signed in (a stale "signed out" is read again first). */
    async requireSignedIn() {
      let s = await service.status();
      if (!s.loggedIn) s = await service.status({ refresh: true });
      if (!s.installed) throw err("NO_CLAUDE", "Claude Code was not found on this computer");
      if (!s.loggedIn) throw err("CLAUDE_SIGNED_OUT", "Claude is not connected. Sign in to Claude (the Claude chip in the top bar), then try again.");
      return s;
    },
    /** A task ended with Claude Code's sign-in error: forget the cached state so the chip and the next task see it. */
    signedOutSeen() { cache = null; },
    startLogin() {
      if (login && login.exitCode === undefined) return loginState();
      const cur = login = { l: claudeLogin(root), startedAt: new Date().toISOString(), exitCode: undefined };
      cur.l.process.on("close", (code) => { cur.exitCode = code ?? -1; cache = null; });
      return loginState();
    },
    /** The code the browser shows when it cannot hand the sign-in back by itself. */
    sendCode(code) {
      const c = String(code ?? "").trim();
      if (!c || c.length > 2000 || /[\r\n]/.test(c)) throw err("INVALID", "Paste the code the sign-in page shows");
      if (!login || login.exitCode !== undefined) throw err("INVALID", "Start the sign-in first");
      login.l.process.stdin.write(c + "\n");
      return loginState();
    },
    cancelLogin() {
      if (login && login.exitCode === undefined) { login.cancelled = true; login.l.process.kill(); }
      return loginState();
    },
    async logout() {
      if (login && login.exitCode === undefined) login.l.process.kill();
      const r = await claudeLogout(root);
      cache = null;
      return { ...r, status: await service.status({ refresh: true }) };
    },
    stop() { if (login && login.exitCode === undefined) login.l.process.kill(); },
  };
  return service;
}

// Claude sign-in for the whole app. Claude no longer gates the app: the top-bar chip shows the state in
// the status colours (green connected, yellow signing in, red not connected) and opens a popover with the account and plan (no version, no time),
// "Sign in to Claude" (Claude Code's own `claude auth login`, which opens the browser; when the browser shows a code instead, it is pasted
// here and goes to Claude Code) or "Sign out" (`claude auth logout`). New project and the chat read the same state and block while signed out.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, KeyRound, Loader2, LogIn, LogOut, RefreshCw } from "lucide-react";
import { get, post } from "../api.js";
import { useT } from "../i18n.jsx";
import { useToast } from "../lib.jsx";

const Ctx = createContext(null);

export function ClaudeProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const refresh = useCallback(async (force = true) => {
    try { const s = await get("/api/claude/status" + (force ? "?refresh=1" : "")); setStatus(s); setError(null); return s; }
    catch (e) { setError(e); setStatus((x) => x ?? { installed: false, loggedIn: false }); return null; }
  }, []);
  useEffect(() => { refresh(false); }, [refresh]);
  const signingIn = !!status?.login?.running;
  useEffect(() => {             // a known state is read again every minute; every 2 s while a sign-in runs in the browser
    const h = setTimeout(() => refresh(signingIn), signingIn ? 2000 : 60000);
    return () => clearTimeout(h);
  }, [status, signingIn, refresh]);
  const value = useMemo(() => ({
    status, error, refresh, signingIn, connected: !!status?.loggedIn,
    signIn: async () => { const l = await post("/api/claude/login"); setStatus((s) => ({ ...s, login: l })); return l; },
    sendCode: async (code) => { const l = await post("/api/claude/login/code", { code }); setStatus((s) => ({ ...s, login: l })); return l; },
    cancelSignIn: async () => { const l = await post("/api/claude/login/cancel"); setStatus((s) => ({ ...s, login: l })); },
    signOut: async () => { const r = await post("/api/claude/logout"); setStatus(r.status); return r; },
  }), [status, error, refresh, signingIn]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useClaude = () => useContext(Ctx);

const PLAN = { max: "Max", pro: "Pro", team: "Team", enterprise: "Enterprise", free: "Free" };

/** The sign-in steps: start Claude Code's sign-in, then the link (when the browser did not open) and the code field. */
export function SignInFlow({ compact = false, onDone }) {
  const t = useT();
  const toast = useToast();
  const c = useClaude();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);          // "Browser didn't open?": the sign-in page link and the code field
  const was = useRef(c?.connected);
  useEffect(() => { if (c?.connected && !was.current) { toast(t("Claude connected")); onDone?.(); } was.current = c?.connected; }, [c?.connected]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return null;
  const login = c.status?.login;
  const start = async () => { setBusy(true); try { await c.signIn(); } catch (e) { toast(e.message, "error"); } finally { setBusy(false); } };
  const send = async () => { setBusy(true); try { await c.sendCode(code); setCode(""); toast(t("Code sent to Claude Code")); setTimeout(() => c.refresh(true), 1500); } catch (e) { toast(e.message, "error"); } finally { setBusy(false); } };
  if (c.status && !c.status.installed) return <p className="hint">{t("Claude Code was not found on this computer. Install the Claude app (it brings Claude Code), then check again.")}</p>;
  if (!c.signingIn) return <div className="signin-flow">
    <button className={"btn primary" + (compact ? " sm" : "")} onClick={start} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <LogIn size={14} />}{t("Sign in to Claude")}</button>
    {login?.error && <span className="error-text">{t("The last sign-in did not finish:")} {login.error}</span>}
    {!compact && <span className="hint">{t("Opens the browser. The app never sees your password.")}</span>}
  </div>;
  // signing in: one line and Cancel; the page link and the code field wait behind a small link
  return <div className="signin-flow busy">
    <span className="signin-wait"><Loader2 size={13} className="spin" /><span>{t("Sign in in your browser, then come back.")}</span>
      <button type="button" className="clink" onClick={() => c.cancelSignIn()}>{t("Cancel")}</button></span>
    {!help ? <button type="button" className="clink signin-help" onClick={() => setHelp(true)}>{t("Browser didn't open?")}</button>
      : <div className="signin-more">
        {login?.url && <a className="clink" href={login.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} />{t("Open the sign-in page")}</a>}
        <div className="signin-code">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("Code from the page, if it shows one")} aria-label={t("Sign-in code")} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) send(); }} />
          <button className="btn sm" onClick={send} disabled={!code.trim() || busy}><KeyRound size={13} />{t("Send")}</button>
        </div></div>}
  </div>;
}

/** The top-bar chip and its popover. */
export function ClaudeChip() {
  const t = useT();
  const toast = useToast();
  const c = useClaude();
  const [open, setOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => { if (!open) setConfirmOut(false); }, [open]);
  if (!c) return null;
  const s = c.status;
  const state = !s ? "checking" : s.loggedIn ? "ok" : c.signingIn ? "busy" : "error";
  const label = !s ? t("Checking the Claude connection") : s.loggedIn ? t("Claude connected") : c.signingIn ? t("Signing in to Claude…") : t("Claude not connected");
  const head = !s ? t("Checking…") : s.loggedIn ? t("Connected") : c.signingIn ? t("Signing in") : t("Not connected");          // the chip says the rest
  const out = async () => { setBusy(true); try { await c.signOut(); toast(t("Signed out of Claude")); setConfirmOut(false); } catch (e) { toast(e.message, "error"); } finally { setBusy(false); } };
  return <div className="claude-chip" ref={ref}>
    <button className={"chip-status" + (state === "error" ? " stop" : "")} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} title={t("Claude connection")}>
      <span className={"dot " + (state === "ok" ? "ok" : state === "busy" || state === "checking" ? "busy" : "error")} />{label}</button>
    {open && <div className="claude-pop" role="dialog" aria-label={t("Claude connection")}>
      <div className="claude-pop-head"><span className={"dot " + (state === "ok" ? "ok" : state === "busy" ? "busy" : "error")} /><b>Claude <span>· {head}</span></b>
        <button className="btn ghost icon sm" onClick={() => c.refresh(true)} aria-label={t("Check again")} title={t("Check again")}><RefreshCw size={13} /></button></div>
      {s?.installed && s.loggedIn && <dl className="kv claude-kv">
        <dt>{t("Account")}</dt><dd>{s.email ?? "–"}</dd>
        <dt>{t("Subscription")}</dt><dd>{s.subscriptionType ? `Claude ${PLAN[s.subscriptionType] ?? s.subscriptionType}` : s.authMethod && s.authMethod !== "none" ? s.authMethod : "–"}</dd>
      </dl>}
      {s?.loggedIn ? (confirmOut
        ? <div className="claude-pop-confirm"><div className="dlg-lines"><p>{t("Sign out of Claude Code on this PC?")}</p><p className="dlg-warn">{t("Claude Code in the terminal signs out too.")}</p>
          <p className="hint">{t("New projects and the chat pause until you sign in again.")}</p></div>
          <div className="row"><button className="btn sm" onClick={() => setConfirmOut(false)}>{t("Cancel")}</button><button className="btn danger sm" onClick={out} disabled={busy}>{busy ? <Loader2 size={13} className="spin" /> : <LogOut size={13} />}{t("Sign out")}</button></div></div>
        : <button className="btn ghost sm" onClick={() => setConfirmOut(true)}><LogOut size={13} />{t("Sign out")}</button>)
        : <SignInFlow compact onDone={() => setOpen(false)} />}
    </div>}
  </div>;
}

/** A red line with the sign-in button, for places that need Claude (New project, the chat). */
export function NeedsClaude({ text }) {
  const t = useT();
  const c = useClaude();
  if (!c || c.connected || !c.status) return null;
  return <div className="needs-claude" role="alert"><span className="dot error" /><span className="t">{text ?? t("Claude is not connected")}</span><SignInFlow compact /></div>;
}

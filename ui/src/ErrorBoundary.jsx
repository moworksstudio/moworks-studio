// Catches a render error so one broken screen shows a message instead of a blank app (a screen that used a hook it had not
// imported turned the whole UI white). Wrap a screen, the Editor's panes or its sheets; `name` says which part broke. The key resets it:
// give it the route or the sheet, so moving on clears the message. The error stays in the console and in "Details" for the bug report.
import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { tr } from "./i18n.jsx";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(`[${this.props.name ?? "screen"}]`, error, info?.componentStack); }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <div className="err-boundary" role="alert">
      <AlertTriangle size={22} />
      <b>{tr("Something went wrong in {part}", { part: this.props.name ?? tr("this screen") })}</b>
      <p>{tr("The rest of the app still works, and everything is saved. Try again, or go on with something else.")}</p>
      <div className="err-actions">
        <button className="btn sm" onClick={() => this.setState({ error: null })}><RotateCcw size={14} />{tr("Try again")}</button>
        {this.props.onClose && <button className="btn ghost sm" onClick={() => { this.setState({ error: null }); this.props.onClose(); }}>{tr("Close")}</button>}
      </div>
      <details><summary>{tr("Details")}</summary><pre>{String(error?.stack ?? error?.message ?? error).slice(0, 1500)}</pre></details>
    </div>;
  }
}

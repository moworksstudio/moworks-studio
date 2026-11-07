// The Film Editor's Desk layout: three panes (audit/112c c2.2: the Editor's one function laid out both themes; the data and the elements stay in
// screens/Editor.jsx and come in as they are, so both layouts share them). Moved as it was.
import { Panes } from "../components.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import { NarrowEditor } from "./NarrowEditor.jsx";

// the columns' first proportions, as the user drew them (shots and pipeline ~14 %, Claude ~19 % of the width);
// "editor4": widths saved before are not reused; a double-click on a splitter comes back to these
const PANES = { left: 0.18, right: 0.19 };          // the Pipeline's column holds its lines and the steps' one row (owner 31/10, #698)

/** The Desk: the strip, then Shots & pipeline · the film · Claude in three panes (one at a time in a narrow window). */
export function EditorDesk({ askBar, centerPane, deskStyle, leaveDialog, leftPane, narrowTab, openingEl, rightPane, setNarrowTab, shape, sheetEl, strip, t, viewerEl, w }) {
  if (w < 900) return <NarrowEditor className="ed" shape={shape} style={deskStyle} head={<>{strip}{openingEl}</>} leftLabel="Shots & pipeline"
    left={leftPane} film={centerPane} claude={rightPane} tab={narrowTab} onTab={setNarrowTab} after={<>{sheetEl}{askBar}{leaveDialog}{viewerEl}</>} />;
  return <div className="ed" data-zone="editor" data-shape={shape} style={deskStyle}>{strip}{openingEl}<div className="ed-body"><Panes id="editor5" defaults={PANES} left={<ErrorBoundary name={t("Shots & pipeline")}>{leftPane}</ErrorBoundary>} center={<ErrorBoundary name={t("Film")}>{centerPane}</ErrorBoundary>}
    right={<ErrorBoundary name="Claude">{rightPane}</ErrorBoundary>} /></div>{sheetEl}{askBar}{leaveDialog}{viewerEl}</div>;
}

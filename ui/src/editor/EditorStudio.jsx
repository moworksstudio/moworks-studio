// The Film Editor's Studio layout: the light table (audit/112c c2.2: the Editor's one function laid out both themes; the data and the elements stay in
// screens/Editor.jsx and come in as they are, so both layouts share them). Moved as it was.
import { Plus } from "lucide-react";
import ErrorBoundary from "../ErrorBoundary.jsx";
import ClaudePanel from "./ClaudePanel.jsx";
import ShotList from "./ShotList.jsx";
import AssetsPanel from "./AssetsPanel.jsx";
import FilmCard from "./FilmCard.jsx";
import Pipeline, { currentStage } from "../workflow/Pipeline.jsx";
import { NarrowEditor } from "./NarrowEditor.jsx";

// The Studio: the station a sheet on the light table belongs to (lifted and lit on the rail); no sheet = Build and review, the film
const HERE = { brief: "prepare", character: "prepare", voice: "prepare", assets: "prepare", analysis: "prepare", doc: "prepare", storyboard: "storyboard",
  "motion-plan": "motion", "qc-review": "review", qa: "review", lyrics: "build", "music-map": "build", mix: "build" };

/** The Studio: the slate, the five stations on their rail, then Shots / Assets / This film · the light table · the conversation, the
 *  timeline under the first two. */
export function EditorStudio({ actions, askBar, assetFocus, assets, blankShot, castPicked, castable, centerRef, chatKey, chatShot, drawer, drawerEl, edStyle, fileUrl, filesChanged, filmAr, fit, fresh, ghost, hsplit, id, inject, leaveDialog, leftTab, loadTimeline, locked, missing, motionPick, narrowTab, notesOn, onClaudeChanged, openSheet, openingEl, p, pins, pipeline, playerEl, pv, qcWarnings, reloadAssets, reloadFilm, reloadPipeline, rendering, selection, setAsking, setCastPicked, setDismissed, setLeftTab, setNarrowTab, setPins, setShot, setViewer, shape, sharedEl, sheet, sheetEl, sheetRef, shot, shotPosters, shotStart, shots, showAssets, size, sizeTag, st, starting, strip, studio, switchSheet, t, tableRef, timelineEl, tlLength, tlTime, toggleDrawer, unbuilt, version, viewerEl, w }) {
  // a wide film keeps the table as it is
  const stStyle = { ...edStyle, "--film-ar": String(filmAr) };
  // The Studio (chat on the right, the timeline across the bottom, no vertical X-sheet): the slate, the five
  // stations on their rail, then Shots / Assets / This film · the light table · the conversation, and the timeline under the first two.
  // The sheet of a station lies on the table in the film's place; the film stays loaded under it (hidden), so it never reloads for that.
  const tab = ["shots", "assets", "film"].includes(leftTab) ? leftTab : "shots";
  const sidePane = <aside className="st-side" aria-label={t("Shots, assets and this film")}>
    <div className="ed-ltabs st-tabs" role="tablist" aria-label={t("Shots, assets and this film")}>
      <button role="tab" aria-selected={tab === "shots"} onClick={() => setLeftTab("shots")}>{t("Shots")}<span className="ed-count num">{shots?.length ?? ""}</span></button>
      <button role="tab" aria-selected={tab === "assets"} onClick={showAssets}>{t("Assets")}
        {missing > 0 ? <span className="ed-count stop" title={t("{n} missing file(s)", { n: missing })}>{t("{n} missing", { n: missing })}</span>
          : fresh > 0 ? <span className="ed-count new">{t("{n} new", { n: fresh })}</span> : <span className="ed-count num">{assets?.length ?? ""}</span>}</button>
      <button role="tab" aria-selected={tab === "film"} onClick={() => setLeftTab("film")}>{t("This film")}</button>
    </div>
    <section className="ed-tabbody" role="tabpanel">
      {tab === "assets" ? <>
        <div className="st-addfiles"><button className="btn sm" onClick={() => openSheet("assets")} disabled={rendering}
          title={rendering ? t("Wait until the render finishes") : t("Add files: pictures, video, audio, fonts, logos, PDF")}><Plus size={14} />{t("Add files")}</button>
          <span className="hint">{t("Files copied into the production's folder show up here too.")}</span></div>
        <AssetsPanel projectId={id} project={p} items={assets} reload={reloadAssets} fileUrl={fileUrl} locked={rendering} time={tlTime} length={tlLength} focus={assetFocus} onSeek={(s) => pv.send("seek", { time: s })}
          onTranscript={(path) => openSheet("voice", { path })} onTimelineChanged={() => { loadTimeline(); pv.send("reload"); }}
          onShot={(n) => { const s = shots?.find((x) => x.number === n); if (s) { setShot(s); pv.send("seek", { time: s.start }); setLeftTab("shots"); } }} /></>
        : tab === "film" ? <FilmCard id={id} project={p} locked={locked} onRestored={reloadFilm} />
          : <ShotList projectId={id} shots={unbuilt ? shots?.map((s) => ({ ...s, start: null })) : shots} blank={blankShot} posters={shotPosters} shot={shot} locked={locked} send={pv.send} version={version}
            onShot={(s) => { setShot(s); if (s) pv.send("seek", { time: shotStart(s, shots) }); }} onChanged={(structure) => filesChanged(!!structure)} />}
    </section>
  </aside>;
  const line = <Pipeline projectId={id} data={pipeline} starting={starting} onChanged={reloadPipeline} onOpen={openSheet} onAssets={showAssets} cast={p?.meta?.characters?.ids?.length > 0} music={!!p?.styleInfo?.music} warnings={qcWarnings}
    here={sheet ? (pipeline?.voiceWait && (sheet.kind === "voice" || sheet.kind === "lyrics") ? "storyboard" : HERE[sheet.kind] ?? null) : !st.build || st.build.status === "todo" ? (pipeline?.stages?.find((x) => x.status !== "done")?.id ?? null) : "build"} actions={actions} onPlayer={() => { if (sheetRef.current) switchSheet(null); }} />;
  const table = <section className="lt" ref={tableRef} aria-label={t("Light table")}>
    <div className={"lt-film" + (sheet ? " away" : "")} aria-hidden={sheet ? "true" : undefined}>{playerEl}</div>
    {sheetEl}
    {ghost && <div key={ghost.n} className="lt-ghost" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ghost.html }} />}
    {drawer && !sheet && <div className="lt-drawer">{drawerEl}</div>}          {/* it belongs to the film: under a sheet laid on the table it waits */}
  </section>;
  // the Motions and Sounds drawers belong to the film, so opening one lays the film back on the table first
  const openDrawer = (kind) => { if (drawer !== kind && sheetRef.current) switchSheet(null); toggleDrawer(kind); };
  const chat = <ClaudePanel projectId={id} editing={sizeTag ? size : null} version1={pipeline?.version1 ?? null} onVersionChanged={reloadPipeline} fps={pv.state.fps || 24} selectedShot={chatShot} selection={selection} onClearTarget={() => { setDismissed(selection?.key ?? null); pv.send("clear"); pv.setPicked([]); setShot(null); }}
    onChanged={onClaudeChanged} inject={inject} reloadKey={chatKey} motionPick={motionPick} onOpenMotions={() => openDrawer("motions")} motionsOpen={drawer === "motions"} onOpenSounds={() => openDrawer("sounds")} soundsOpen={drawer === "sounds"}
    onOpenCharacters={castable ? () => openDrawer("characters") : null} charactersOpen={drawer === "characters"} castPicked={castPicked} onCastPicked={setCastPicked}
    steps={pipeline?.steps} rendering={rendering} actions={[]} onWaiting={setAsking} stage={currentStage(pipeline?.stages)} interrupted={pipeline?.interrupted ?? null} onPlay={(path) => setViewer(path)} onOpenSheet={openSheet} checks={pipeline?.checks ?? null}
    waiting={pipeline?.stages?.find((s) => s.status === "waiting" && s.id !== "feedback") ?? null}
    pins={notesOn ? pins : null} onPinsSent={(ids) => setPins((x) => x.filter((p) => !ids.includes(p.id)))} onSeek={(s) => pv.send("seek", { time: s })} />;
  if (w < 900) return <NarrowEditor className="ed st-ed narrow" shape={shape} style={stStyle} head={<>{strip}{openingEl}{line}</>} leftLabel="Shots, assets and this film"
    left={sidePane} film={<>{table}{timelineEl}</>} claude={chat} tab={narrowTab} onTab={setNarrowTab} after={<>{narrowTab !== "claude" && askBar}{leaveDialog}{viewerEl}</>} />;
  return <div className="ed st-ed" data-zone="editor" data-shape={shape} style={stStyle}>{strip}{openingEl}{line}
    {/* with a sheet on the table a short window folds the timeline to its Shots row (CSS) */}
    <div className={"ed-body st-body" + (sheet ? " sheet-on" : "")} ref={centerRef} style={fit ? { "--st-side": `${fit.side}px`, "--st-chat": `${fit.chat}px` } : undefined}>
      <ErrorBoundary name={t("Shots, assets and this film")}>{sidePane}</ErrorBoundary>
      <ErrorBoundary name={t("Film")}>{table}</ErrorBoundary>
      {hsplit}
      <div className="st-tl"><ErrorBoundary name={t("Timeline")}>{timelineEl}</ErrorBoundary>{sharedEl}</div>
      <aside className="st-chat" aria-label={t("Conversation")}><ErrorBoundary name="Claude">{chat}</ErrorBoundary></aside>
    </div>{leaveDialog}{viewerEl}</div>;
}

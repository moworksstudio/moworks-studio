// Motion Library page: the whole library from the left rail, outside any project. Browse, preview, favourites
// and credits; Copy puts the motion's description on the clipboard, to paste into a project's Claude panel (inside a project, the
// Motion Library button in the Claude panel inserts it directly).
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { BackButton } from "../components.jsx";
import MotionLibrary from "../editor/MotionLibrary.jsx";
import { useThemeId } from "../theme.jsx";

export default function Library() {
  const t = useT();
  const toast = useToast();
  const copy = async (item) => {
    try { await navigator.clipboard.writeText(item.spec); toast(t("Copied “{title}”. Paste it into a project's Claude panel.", { title: item.title })); return true; }
    catch { toast(t("Could not copy to the clipboard"), "error"); return false; }
  };
  // The Studio: the same library as a cabinet of flipbooks in the room, the item in hand on the light table (studio-shell.css, .st-motionlib)
  if (useThemeId() === "studio") return <div className="page gal-page st-motionlib">
    <div className="st-head"><h1>{t("Motion Library")}</h1><span className="st-aside">{t("thumb a flipbook to see it move; Copy puts its text on the clipboard")}</span></div>
    <MotionLibrary page pickLabel={t("Copy")} onPick={copy} />
  </div>;
  return <div className="page gal-page">
    <div className="page-head"><div><BackButton /><h1>{t("Motion Library")}</h1>
      <p className="lead">{t("Motions and blocks, by author. Hover to play; Copy puts the text on the clipboard.")}</p></div></div>
    <MotionLibrary page pickLabel={t("Copy")} onPick={copy} />
  </div>;
}

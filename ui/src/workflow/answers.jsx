// The film's own questions in the Brief, asked once in New project (and the Brief sheet) so Claude does not ask them again in the chat.
// Keys match packages/project-service ANSWER_KEYS.
import { useT } from "../i18n.jsx";

// the film's kind: What If for every style (config/film-kinds.json); an anidoodle medium also offers its
// author's workflows (config/anidoodle-pipeline.json filmKinds)
const KIND = [["", "As the brief says"], ["whatIf", "What If episode"]];
const KIND_ANIDOODLE = [["", "Story film"], ["drawing", "A picture that draws itself"], ["launch", "Product launch film"], ["whatIf", "What If episode"]];
const isAnidoodle = (styleId) => /^anidoodle-[A-Za-z0-9]+$/.test(String(styleId ?? ""));

/** Which questions a style asks. */
export const questionsFor = () => ({
  filmKind: false,          // no Film kind question; What If is a film style "Coming soon"
});
/** Only the answers this style asks (the rest are dropped when the style changes). */
export const answersFor = (styleId, a) => Object.fromEntries(Object.entries(a ?? {}).filter(([k]) => questionsFor(styleId)[k]));

export default function StyleQuestions({ styleId, value = {}, onChange, idPrefix = "q" }) {
  const t = useT();
  const q = questionsFor(styleId);
  if (!Object.values(q).some(Boolean)) return null;
  const set = (k, v) => onChange({ ...value, [k]: v });
  const sel = (k, opts, label) => <label className="field" htmlFor={`${idPrefix}-${k}`}><span>{t(label)}</span>
    <select id={`${idPrefix}-${k}`} className="select" value={value[k] ?? opts[0][0]} onChange={(e) => set(k, e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select></label>;
  return <div className="np-grid np-questions">
    {q.filmKind && sel("filmKind", isAnidoodle(styleId) ? KIND_ANIDOODLE : KIND, "Film kind")}
  </div>;
}

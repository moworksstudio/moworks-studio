// The "AI" of "AI motion studio": drawn for Moworks, not a copy of anyone's mark. An open, sharp A (Λ, no bar) with a
// four-point accent spark where the bar would be, and a slim I with a square accent tittle. Sized in em so it sits in a line of text;
// strokes take currentColor and end on the text baseline (the box bottom), the spark and the tittle the theme's accent. pathLength 1 lets the intro draw the strokes on.
import "./ai-mark.css";

export default function AiMark({ className = "" }) {
  return (
    <svg className={"ai-mark " + className} viewBox="0 0 30 24" aria-hidden="true" focusable="false">
      <path className="ai-a" d="M2.2 22.4 L11 2.2 L19.8 22.4" pathLength="1" />
      <path className="ai-spark" d="M11 11.6 L12.25 15.25 L15.9 16.5 L12.25 17.75 L11 21.4 L9.75 17.75 L6.1 16.5 L9.75 15.25 Z" />
      <path className="ai-i" d="M26.6 9 V22.4" pathLength="1" />
      <rect className="ai-dot" x="24.8" y="2" width="3.6" height="3.6" />
    </svg>
  );
}

// The film's sizes the Editor can show, a plain function a test can load (audit/112c c8.3: in useSheets.js, which loads JSX, its test never ran).

/** The film's sizes the Editor can show (the Adaptation step): the master and every other size made; the one shown is remembered per
 *  film (owner 06/11, #1236). pref: usePref's [value, set] for it. */
export function filmSizes(pipeline, [viewSize, setViewSize]) {
  const sizeRows = pipeline?.sizes?.rows ?? [];
  const masterSize = pipeline?.sizes?.master ?? "16:9";
  const viewable = [masterSize, ...sizeRows.filter((r) => r.status === "ready" || r.status === "stale" || (r.status === "adapting" && r.madeFrom)).map((r) => r.aspect)];
  const size = viewable.includes(viewSize) ? viewSize : masterSize;
  const sizeTag = size !== masterSize ? size.replace(":", "x") : null;
  const sizeRow = sizeTag ? sizeRows.find((r) => r.aspect === size) ?? null : null;
  return { viewable, size, sizeTag, sizeRow, setViewSize };
}

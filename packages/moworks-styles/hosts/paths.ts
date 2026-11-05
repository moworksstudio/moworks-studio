// `@remotion/paths` for the owner's Paper Collage film style, which uses getLength (a marker path drawn on, collage.tsx): written from Remotion's
// public documentation (remotion.dev/docs/paths/get-length), never from its code; the browser measures the SVG path itself.
let svg: SVGSVGElement | null = null;
const measure = (d: string) => {
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden");
    svg.setAttribute("aria-hidden", "true");
    document.body.appendChild(svg);
  }
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  svg.appendChild(p);
  return p;
};
/** The length of an SVG path, in its own units. */
export const getLength = (d: string): number => {
  const p = measure(d), n = p.getTotalLength();
  p.remove();
  return n;
};
/** A point of the path at a length along it ({ x, y }). */
export const getPointAtLength = (d: string, length: number): { x: number; y: number } => {
  const p = measure(d), pt = p.getPointAtLength(length);
  p.remove();
  return { x: pt.x, y: pt.y };
};

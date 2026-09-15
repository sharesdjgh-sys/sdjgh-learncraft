type Point = { x: number; y: number };
export type DimensionCurve = [Point, Point, Point];
export type LabelBounds = { x: number; y: number; width: number; height: number };

export function dimensionStrokes(curve: DimensionCurve, box: LabelBounds) {
  const [a, c, b] = curve;
  const at = (t: number): Point => ({ x: (1 - t) ** 2 * a.x + 2 * t * (1 - t) * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * t * (1 - t) * c.y + t * t * b.y });
  const cuts = [0, 1];
  // Solve all intersections with the label rectangle exactly, including slanted curves.
  for (const axis of ["x", "y"] as const) {
    const lower = box[axis], upper = lower + (axis === "x" ? box.width : box.height);
    for (const edge of [lower, upper]) {
      const q = a[axis] - 2 * c[axis] + b[axis], r = 2 * (c[axis] - a[axis]), s = a[axis] - edge;
      const roots = Math.abs(q) < 1e-10 ? (Math.abs(r) < 1e-10 ? [] : [-s / r]) : r * r - 4 * q * s < 0 ? [] : [(-r - Math.sqrt(r * r - 4 * q * s)) / (2 * q), (-r + Math.sqrt(r * r - 4 * q * s)) / (2 * q)];
      cuts.push(...roots.filter((t) => t > 0 && t < 1));
    }
  }
  cuts.sort((x, y) => x - y);
  const intervals: [number, number][] = [];
  for (let i = 1; i < cuts.length; i++) {
    const start = cuts[i - 1], end = cuts[i];
    if (end - start < 1e-9) continue;
    const middle = at((start + end) / 2);
    if (box.width > 0 && box.height > 0 && middle.x > box.x && middle.x < box.x + box.width && middle.y > box.y && middle.y < box.y + box.height) continue;
    const previous = intervals.at(-1);
    if (previous && Math.abs(previous[1] - start) < 1e-9) previous[1] = end;
    else intervals.push([start, end]);
  }
  return intervals.flatMap(([start, end]) => {
    const from = at(start), to = at(end);
    const control = { x: from.x + (end - start) * ((1 - start) * (c.x - a.x) + start * (b.x - c.x)), y: from.y + (end - start) * ((1 - start) * (c.y - a.y) + start * (b.y - c.y)) };
    let length = 0, previous = from;
    for (let i = 1; i <= 64; i++) {
      const next = at(start + (end - start) * i / 64);
      length += Math.hypot(next.x - previous.x, next.y - previous.y);
      previous = next;
    }
    // A very short remainder would itself look like a stray fragment.
    if (length < 4) return [];
    const count = Math.max(1, Math.round((length + 4) / 10));
    const dash = 1 / (count + (count - 1) * 2 / 3);
    return [{ d: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`, dasharray: `${dash} ${dash * 2 / 3}`, count, start, end }];
  });
}

export function updateDimensionStrokes(dimension: Element, bounds: LabelBounds) {
  const curve = JSON.parse(dimension.getAttribute("data-dimension-curve") ?? "null") as DimensionCurve | null;
  if (!curve) return;
  const strokes = dimensionStrokes(curve, bounds);
  dimension.querySelectorAll("[data-dimension-stroke]").forEach((path, index) => {
    path.setAttribute("d", strokes[index]?.d ?? "");
    path.setAttribute("stroke-dasharray", strokes[index]?.dasharray ?? "none");
  });
}

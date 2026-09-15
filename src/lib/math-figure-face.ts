import type { MathFigureShape } from "./math-figure-lab";

type Position = { x: number; y: number };
type Project = (at: number[]) => Position;
const same = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-7;

// Share the exact stroke geometry with fills, including subsequent curve edits.
export function figureCurveControl(from: Position, to: Position, bend: number, scale: number): Position {
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
  return { x: (from.x + to.x) / 2 - dy / length * bend * scale * 2,
    y: (from.y + to.y) / 2 + dx / length * bend * scale * 2 };
}

export function figureFacePaths(face: Extract<MathFigureShape, { type: "polygon" }>, shapes: MathFigureShape[], project: Project, scale: number) {
  const start = project(face.points[0]);
  let fillPath = `M ${start.x} ${start.y}`;
  const outlinePaths: string[] = [];
  face.points.forEach((from, index) => {
    const to = face.points[(index + 1) % face.points.length];
    const matches = shapes.filter((shape): shape is Extract<MathFigureShape, {type: "line" | "curve"}> =>
      (shape.type === "line" || shape.type === "curve") &&
      ((same(shape.from, from) && same(shape.to, to)) || (same(shape.from, to) && same(shape.to, from))));
    const curves = matches.filter(shape => shape.type === "curve");
    const a = project(from), b = project(to);
    let edge = `L ${b.x} ${b.y}`;
    // Ambiguous coincident curves are not guessed. Keep the original straight face.
    if (curves.length === 1) {
      const curve = curves[0];
      const control = figureCurveControl(project(curve.from), project(curve.to), curve.bend, scale);
      edge = `Q ${control.x} ${control.y} ${b.x} ${b.y}`;
    }
    fillPath += ` ${edge}`;
    // Explicit strokes retain their own dashed style and remain individually editable.
    if (matches.length === 0) outlinePaths.push(`M ${a.x} ${a.y} ${edge}`);
  });
  return { fillPath: `${fillPath} Z`, outlinePaths };
}

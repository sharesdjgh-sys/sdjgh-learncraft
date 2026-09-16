import { mathFigureSpecSchema, type MathFigureShape, type MathFigureSpec } from "./math-figure-lab";

type Position = number[];
type Arc = Extract<MathFigureShape, { type: "arc" }>;
export type AngleBinding = { center: Position; start: Position; end: Position; startName: string; endName: string; degrees: number };
const distance = (a: Position, b: Position) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const same = (a: Position, b: Position) => distance(a, b) < 0.001;
const direction = (center: Position, p: Position) => Math.atan2(p[1] - center[1], p[0] - center[0]) * 180 / Math.PI;
const angularDistance = (a: number, b: number) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

function edges(spec: MathFigureSpec) {
  return spec.shapes.flatMap((shape) => shape.type === "line" ? [{ from: shape.from, to: shape.to }] : shape.type === "polygon" ? shape.points.map((from, index) => ({ from, to: shape.points[(index + 1) % shape.points.length] })) : []);
}

export function angleBinding(spec: MathFigureSpec, arc: Arc, collinearTolerance = 0.01): AngleBinding | null {
  const degrees = Math.abs(arc.endAngle - arc.startAngle);
  if (degrees < 0.1 || degrees >= 360) return null;
  const rays: Position[] = [];
  for (const edge of edges(spec)) {
    const length = distance(edge.from, edge.to);
    if (length < 0.001) continue;
    // Includes a vertex in the middle of an unsplit straight line.
    const cross = Math.abs((arc.center[0] - edge.from[0]) * (edge.to[1] - edge.from[1]) - (arc.center[1] - edge.from[1]) * (edge.to[0] - edge.from[0])) / length;
    if (cross > 0.001 || distance(edge.from, arc.center) + distance(arc.center, edge.to) > length + 0.002) continue;
    rays.push(...[edge.from, edge.to].filter((p) => !same(p, arc.center)));
  }
  const match = (angle: number) => {
    let endpoint = rays.filter((p) => angularDistance(direction(arc.center, p), angle) < 1).sort((a, b) => distance(b, arc.center) - distance(a, arc.center))[0];
    if (!endpoint) return undefined;
    const rayAngle = direction(arc.center, endpoint);
    for (let pass = 0; pass < spec.shapes.length; pass++) {
      const before = distance(arc.center, endpoint);
      for (const edge of edges(spec)) {
        for (const [near, far] of [[edge.from, edge.to], [edge.to, edge.from]]) {
          if (distance(arc.center, near) <= distance(arc.center, endpoint) + 0.001 && distance(arc.center, far) > distance(arc.center, endpoint) && angularDistance(direction(arc.center, near), rayAngle) < collinearTolerance && angularDistance(direction(arc.center, far), rayAngle) < collinearTolerance) endpoint = far;
        }
      }
      if (distance(arc.center, endpoint) <= before) break;
    }
    return endpoint;
  };
  const start = match(arc.startAngle), end = match(arc.endAngle);
  if (!start || !end || same(start, end)) return null;
  // A large outline arc is not a small angle marker.
  if (arc.radius > Math.min(distance(start, arc.center), distance(end, arc.center)) * 0.6) return null;
  const name = (p: Position) => spec.shapes.find((s): s is Extract<MathFigureShape, { type: "point" }> => s.type === "point" && same(s.at, p))?.label;
  const vertex = name(arc.center);
  return { center: arc.center, start, end, startName: vertex && name(start) ? `${vertex}${name(start)}` : "시작 변", endName: vertex && name(end) ? `${vertex}${name(end)}` : "끝 변", degrees };
}

export function resizeAngle(spec: MathFigureSpec, index: number, degrees: number, fixed: "start" | "end"): MathFigureSpec {
  const arc = spec.shapes[index];
  if (arc?.type !== "arc" || !Number.isFinite(degrees) || degrees < 1 || degrees > 359) throw new Error("각도는 1°부터 359°까지 입력해 주세요.");
  const binding = angleBinding(spec, arc);
  if (!binding) throw new Error("이 호의 양끝과 연결된 각의 변을 확인할 수 없습니다.");
  const sign = Math.sign(arc.endAngle - arc.startAngle) || 1;
  const startAngle = fixed === "start" ? direction(arc.center, binding.start) : direction(arc.center, binding.end) - sign * degrees;
  const endAngle = fixed === "end" ? direction(arc.center, binding.end) : direction(arc.center, binding.start) + sign * degrees;
  const moving = fixed === "start" ? binding.end : binding.start;
  const movingAngle = direction(arc.center, moving);
  const delta = ((fixed === "start" ? endAngle : startAngle) - movingAngle) * Math.PI / 180;
  const rotate = (p: Position): Position => {
    const x = p[0] - arc.center[0], y = p[1] - arc.center[1];
    return [arc.center[0] + x * Math.cos(delta) - y * Math.sin(delta), arc.center[1] + x * Math.sin(delta) + y * Math.cos(delta)];
  };
  const onMovingRay = (p: Position) => distance(arc.center, p) > 0.001 && distance(arc.center, p) <= distance(arc.center, moving) + 0.001 && angularDistance(direction(arc.center, p), movingAngle) < 0.01;
  const move = (p: Position) => onMovingRay(p) ? rotate(p) : p;
  const shiftLabel = (at: Position, label?: Position) => label ? [label[0] + move(at)[0] - at[0], label[1] + move(at)[1] - at[1]] : undefined;
  const containsVertex = (a: Position, b: Position) => !same(a, arc.center) && !same(b, arc.center) && Math.abs(distance(a, arc.center) + distance(arc.center, b) - distance(a, b)) < 0.001;
  const shapes = spec.shapes.map((shape, shapeIndex): MathFigureShape => {
    if (shapeIndex === index) {
      const normalizedStart = ((startAngle % 360) + 360) % 360;
      return { ...arc, startAngle: normalizedStart, endAngle: normalizedStart + (endAngle - startAngle) };
    }
    switch (shape.type) {
      case "line": case "curve": case "tick": case "dimension": return { ...shape, from: move(shape.from), to: move(shape.to) };
      case "polygon": return { ...shape, points: shape.points.flatMap((p, i) => {
        const next = shape.points[(i + 1) % shape.points.length];
        return containsVertex(p, next) && onMovingRay(p) !== onMovingRay(next) ? [move(p), arc.center] : [move(p)];
      }) };
      case "point": return { ...shape, at: move(shape.at), labelAt: shiftLabel(shape.at, shape.labelAt) };
      case "text": return shape; // Text is edited separately; never infer geometry from its value.
      case "rightAngle": {
        const vertex = move(shape.vertex), from = move(shape.from), to = move(shape.to);
        const originalAngle = angularDistance(direction(shape.vertex, shape.from), direction(shape.vertex, shape.to));
        const newAngle = angularDistance(direction(vertex, from), direction(vertex, to));
        if (spec.projection === "plane" && Math.abs(originalAngle - 90) < 0.01 && Math.abs(newAngle - 90) > 0.01) {
          const start = direction(vertex, from), end = direction(vertex, to);
          const sweep = ((end - start) % 360 + 540) % 360 - 180;
          return { type: "arc", color: shape.color, dashed: shape.dashed, center: vertex, radius: shape.size, startAngle: start, endAngle: start + sweep };
        }
        return { ...shape, vertex, from, to };
      }
      case "arc": {
        const other = angleBinding(spec, shape);
        const center = move(shape.center);
        if (!other) return { ...shape, center };
        const start = direction(center, move(other.start)), end = direction(center, move(other.end));
        const sweep = shape.endAngle >= shape.startAngle ? ((end - start) % 360 + 360) % 360 : -(((start - end) % 360 + 360) % 360);
        return { ...shape, center, startAngle: start, endAngle: start + sweep };
      }
      case "circle": case "ellipse": case "ellipticArc": return { ...shape, center: move(shape.center) };
    }
  });
  // Preserve a straight side when the angle vertex was inside an unsplit line.
  const extra: MathFigureShape[] = [];
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    const original = spec.shapes[i];
    if (shape.type !== "line" || original.type !== "line" || !containsVertex(original.from, original.to) || onMovingRay(original.from) === onMovingRay(original.to)) continue;
    shapes[i] = { ...shape, to: arc.center, arrow: false };
    extra.push({ ...shape, from: arc.center });
  }
  const movedEnd = rotate(moving);
  const marginX = (spec.xRange[1] - spec.xRange[0]) * 0.08, marginY = (spec.yRange[1] - spec.yRange[0]) * 0.08;
  return mathFigureSpecSchema.parse({ ...spec, shapes: [...shapes, ...extra], xRange: [Math.min(spec.xRange[0], movedEnd[0] - marginX), Math.max(spec.xRange[1], movedEnd[0] + marginX)], yRange: [Math.min(spec.yRange[0], movedEnd[1] - marginY), Math.max(spec.yRange[1], movedEnd[1] + marginY)] });
}

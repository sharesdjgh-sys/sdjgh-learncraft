import { mathFigureSpecSchema, type MathFigureShape, type MathFigureSpec } from "./math-figure-lab";
import { angleBinding } from "./math-figure-angle";

type Model = NonNullable<MathFigureSpec["hemisphereSection"]>;
type Position = number[];
type Ellipse = Extract<MathFigureShape, { type: "ellipse" | "ellipticArc" }>;
const rad = Math.PI / 180;
const distance = (a: Position, b: Position) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const direction = (a: Position, b: Position) => Math.atan2(b[1] - a[1], b[0] - a[0]) / rad;
const angleDifference = (a: number, b: number) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

// Orthographic projection: X -> axis, Y -> depthRatio*up, Z -> sqrt(1-depthRatio²)*up.
// The cutting plane passes through B=(R,0,0): sin(theta)*X + cos(theta)*Z = R*sin(theta).
export function hemisphereGeometry(model: Pick<Model, "center" | "radius" | "axis" | "depthRatio">, degrees: number) {
  const { center: o, radius: r, axis: axis, depthRatio: depth } = model;
  const up = [-axis[1], axis[0]], vertical = Math.sqrt(1 - depth * depth);
  const s = Math.sin(degrees * rad), c = Math.cos(degrees * rad);
  const project = (x: number, y: number, z: number): Position => [o[0] + axis[0] * x + up[0] * (depth * y + vertical * z), o[1] + axis[1] * x + up[1] * (depth * y + vertical * z)];
  const center = project(r * s * s, 0, r * s * c);
  const b = project(r, 0, 0), top = project(r * (s * s - c * c), 0, 2 * r * s * c);
  const u = [b[0] - center[0], b[1] - center[1]], v = [up[0] * depth * r * c, up[1] * depth * r * c];
  const xx = u[0] ** 2 + v[0] ** 2, yy = u[1] ** 2 + v[1] ** 2, xy = u[0] * u[1] + v[0] * v[1];
  const discriminant = Math.hypot(xx - yy, 2 * xy);
  const radiusX = Math.sqrt((xx + yy + discriminant) / 2), radiusY = Math.sqrt(Math.max(1e-12, (xx + yy - discriminant) / 2));
  const rotation = Math.atan2(2 * xy, xx - yy) / 2;
  const phase = Math.atan2((-u[0] * Math.sin(rotation) + u[1] * Math.cos(rotation)) / radiusY, (u[0] * Math.cos(rotation) + u[1] * Math.sin(rotation)) / radiusX) / rad;
  return { center, b, top, radiusX, radiusY, rotation: rotation / rad, phase, sectionRadius: r * c, point3d: (t: number) => [r * s * s + r * c * c * Math.cos(t), r * c * Math.sin(t), r * s * c * (1 - Math.cos(t))] };
}

function ellipsePointInfo(shape: Ellipse, p: Position) {
  const t = shape.rotation * rad, dx = p[0] - shape.center[0], dy = p[1] - shape.center[1];
  const x = (dx * Math.cos(t) + dy * Math.sin(t)) / shape.radiusX, y = (-dx * Math.sin(t) + dy * Math.cos(t)) / shape.radiusY;
  return { angle: Math.atan2(y, x) / rad, error: Math.abs(x * x + y * y - 1) };
}

export function isHemisphereAngle(spec: MathFigureSpec, index: number) {
  if (spec.projection !== "spatial") return false;
  if (/반구/.test(`${spec.title} ${spec.description}`)) return true;
  const selected = spec.shapes[index];
  if (selected?.type !== "arc") return false;
  return spec.shapes.some((base) => (base.type === "ellipse" || base.type === "ellipticArc") && base.radiusX > base.radiusY * 1.05 && Math.abs(distance(base.center, selected.center) - base.radiusX) < base.radiusX * 0.08 && spec.shapes.some((rim) => (rim.type === "circle" || rim.type === "arc") && distance(rim.center, base.center) < base.radiusX * 0.02 && Math.abs(rim.radius - base.radiusX) < base.radiusX * 0.08));
}

export function hemisphereBinding(spec: MathFigureSpec, angleIndex: number): Model | null {
  const saved = spec.hemisphereSection;
  if (saved?.angleIndex === angleIndex && spec.shapes[angleIndex]?.type === "arc" && saved.pieces.every((p) => ["ellipse", "ellipticArc"].includes(spec.shapes[p.index]?.type))) return saved;
  if (spec.projection !== "spatial") return null;
  const arc = spec.shapes[angleIndex];
  if (arc?.type !== "arc") return null;
  const binding = angleBinding(spec, arc, 0.5);
  if (!binding) return null;
  const ellipses = spec.shapes.flatMap((shape, index) => shape.type === "ellipse" || shape.type === "ellipticArc" ? [{ shape, index }] : []);
  // Tolerances are loosened from pixel-perfect matching: AI-reconstructed drawings are never exact,
  // and the follow-up resize always recomputes exact coordinates from the recognized model anyway.
  const bases = ellipses.filter(({ shape }) => shape.radiusX > shape.radiusY * 1.05 && ellipsePointInfo(shape, arc.center).error < 0.18 && Math.abs(distance(shape.center, arc.center) - shape.radiusX) < Math.max(0.002, shape.radiusX * 0.035) && spec.shapes.some((rim) => (rim.type === "circle" || rim.type === "arc") && distance(rim.center, shape.center) < Math.max(0.002, shape.radiusX * 0.02) && Math.abs(rim.radius - shape.radiusX) < shape.radiusX * 0.08));
  const uniqueBases = bases.filter((item, i) => !bases.slice(0, i).some((previous) => distance(previous.shape.center, item.shape.center) < 0.001 && Math.abs(previous.shape.radiusX - item.shape.radiusX) < 0.001));
  if (uniqueBases.length !== 1) return null;
  const base = uniqueBases[0].shape, r = base.radiusX;
  const tolerance = Math.max(0.002, r * 0.03);
  const baseAngle = direction(arc.center, base.center);
  const baseSide = angleDifference(direction(arc.center, binding.start), baseAngle) < 1 ? "start" : angleDifference(direction(arc.center, binding.end), baseAngle) < 1 ? "end" : null;
  if (!baseSide) return null;
  const top = binding[baseSide === "start" ? "end" : "start"];
  const axis = [Math.cos(base.rotation * rad), Math.sin(base.rotation * rad)];
  if ((arc.center[0] - base.center[0]) * axis[0] + (arc.center[1] - base.center[1]) * axis[1] < 0) { axis[0] *= -1; axis[1] *= -1; }
  const expectedB = [base.center[0] + axis[0] * r, base.center[1] + axis[1] * r];
  if (distance(expectedB, arc.center) > tolerance) return null;
  const up = [-axis[1], axis[0]];
  // This branch models an upper hemisphere with B at the right-hand end of its diameter.
  const height = (top[0] - base.center[0]) * up[0] + (top[1] - base.center[1]) * up[1];
  if (height <= 0) return null;
  const depthRatio = base.radiusY / base.radiusX;
  if (depthRatio < 0.01 || depthRatio > 0.95) return null;
  const x = (top[0] - base.center[0]) * axis[0] + (top[1] - base.center[1]) * axis[1];
  const degrees = Math.atan2(height / Math.sqrt(1 - depthRatio ** 2), r - x) / rad;
  if (degrees < 1 || degrees > 89) return null;
  const sectionCenter = [(arc.center[0] + top[0]) / 2, (arc.center[1] + top[1]) / 2];
  const feet = spec.shapes.filter((shape): shape is Extract<MathFigureShape, { type: "rightAngle" }> => shape.type === "rightAngle" && (distance(shape.from, base.center) < tolerance || distance(shape.to, base.center) < tolerance) && Math.abs(distance(arc.center, shape.vertex) + distance(shape.vertex, top) - distance(arc.center, top)) < tolerance);
  if (feet.length > 1) return null;
  const foot = feet[0]?.vertex;
  const candidates = ellipses.filter(({ shape }) => distance(shape.center, base.center) > r * 0.05 && distance(shape.center, sectionCenter) < r * 0.25 && ellipsePointInfo(shape, arc.center).error < 0.4 && ellipsePointInfo(shape, top).error < 0.4);
  if (!candidates.length) {
    const curves = spec.shapes.flatMap((shape, index) => {
      if (shape.type !== "curve") return [];
      const forward = distance(shape.from, arc.center) < tolerance && distance(shape.to, top) < tolerance;
      const reverse = distance(shape.to, arc.center) < tolerance && distance(shape.from, top) < tolerance;
      return (forward || reverse) && Math.abs(shape.bend) > 0.001 ? [{ index, side: Math.sign(shape.bend) * (forward ? -1 : 1) }] : [];
    });
    if (curves.length !== 2 || curves[0].side === curves[1].side) return null;
    return { center: base.center, radius: r, axis, depthRatio, degrees, angleIndex, baseSide, markerRadius: arc.radius, top, sectionCenter, anchor: arc.center, foot, pieces: curves.map(({ index, side }) => ({ index, start: side < 0 ? 0 : 180, end: side < 0 ? 180 : 360, closed: false })) };
  }
  const first = candidates[0].shape;
  if (candidates.some(({ shape }) => distance(shape.center, first.center) > r * 0.05 || Math.abs(shape.radiusX - first.radiusX) > r * 0.05 || Math.abs(shape.radiusY - first.radiusY) > r * 0.05 || angleDifference(shape.rotation, first.rotation) > 3)) return null;
  const total = candidates.reduce((sum, { shape }) => sum + (shape.type === "ellipse" ? 360 : Math.abs(shape.endAngle - shape.startAngle)), 0);
  if (Math.abs(total - 360) > 6) return null;
  return { center: base.center, radius: r, axis, depthRatio, degrees, angleIndex, baseSide, markerRadius: arc.radius, top, sectionCenter: first.center, anchor: arc.center, foot, pieces: candidates.map(({ shape, index }) => {
    const phase = ellipsePointInfo(shape, arc.center).angle;
    return { index, start: shape.type === "ellipse" ? 0 : shape.startAngle - phase, end: shape.type === "ellipse" ? 360 : shape.endAngle - phase, closed: shape.type === "ellipse" };
  }) };
}

export function resizeHemisphereSection(spec: MathFigureSpec, model: Model, degrees: number): MathFigureSpec {
  if (!Number.isFinite(degrees) || degrees < 1 || degrees > 89) throw new Error("반구 단면의 각도는 1°부터 89°까지 조절할 수 있습니다.");
  const geometry = hemisphereGeometry(model, degrees);
  const tolerance = Math.max(0.001, model.radius * 0.012);
  const oldB = model.anchor ?? [model.center[0] + model.axis[0] * model.radius, model.center[1] + model.axis[1] * model.radius];
  const oldFoot = model.foot ?? model.sectionCenter;
  const replacements = [{ before: oldB, after: geometry.b }, { before: model.top, after: geometry.top }, { before: oldFoot, after: geometry.center }, { before: model.sectionCenter, after: geometry.center }];
  const oldEllipse = spec.shapes[model.pieces[0].index];
  const move = (p: Position): Position => {
    const anchor = replacements.filter(({ before }) => distance(before, p) < tolerance).sort((a, b) => distance(a.before, p) - distance(b.before, p))[0];
    if (anchor) return anchor.after;
    for (const [from, to, nextFrom, nextTo] of [[oldB, model.top, geometry.b, geometry.top], [model.center, oldFoot, model.center, geometry.center]]) {
      const dx = to[0] - from[0], dy = to[1] - from[1], squared = dx * dx + dy * dy;
      if (squared < 1e-8) continue;
      const t = ((p[0] - from[0]) * dx + (p[1] - from[1]) * dy) / squared;
      if (t >= 0 && t <= 1 && distance(p, [from[0] + dx * t, from[1] + dy * t]) < 0.001) return [nextFrom[0] + (nextTo[0] - nextFrom[0]) * t, nextFrom[1] + (nextTo[1] - nextFrom[1]) * t];
    }
    if (oldEllipse?.type === "ellipse" || oldEllipse?.type === "ellipticArc") {
      const info = ellipsePointInfo(oldEllipse, p);
      if (info.error < 1e-5) {
        const t = (geometry.phase + info.angle - ellipsePointInfo(oldEllipse, oldB).angle) * rad, rotation = geometry.rotation * rad;
        return [geometry.center[0] + geometry.radiusX * Math.cos(t) * Math.cos(rotation) - geometry.radiusY * Math.sin(t) * Math.sin(rotation), geometry.center[1] + geometry.radiusX * Math.cos(t) * Math.sin(rotation) + geometry.radiusY * Math.sin(t) * Math.cos(rotation)];
      }
    }
    return p;
  };
  const pieces = new Map(model.pieces.map((p) => [p.index, p]));
  const shapes = spec.shapes.map((shape, index): MathFigureShape => {
    const piece = pieces.get(index);
    if (piece) {
      const common = { color: shape.color, dashed: shape.dashed, center: geometry.center, radiusX: geometry.radiusX, radiusY: geometry.radiusY, rotation: geometry.rotation };
      const startAngle = ((geometry.phase + piece.start) % 360 + 360) % 360;
      return piece.closed ? { type: "ellipse", ...common, fill: "fill" in shape ? shape.fill : "none" } : { type: "ellipticArc", ...common, startAngle, endAngle: startAngle + piece.end - piece.start };
    }
    if (index === model.angleIndex && shape.type === "arc") {
      const base = direction(geometry.b, model.center), cut = direction(geometry.b, geometry.top);
      const start = model.baseSide === "start" ? base : cut, end = model.baseSide === "start" ? cut : base;
      const sweep = ((end - start) % 360 + 540) % 360 - 180;
      return { ...shape, center: geometry.b, radius: Math.min(model.markerRadius, distance(geometry.b, geometry.top) * 0.35, model.radius * 0.35), startAngle: start, endAngle: start + sweep };
    }
    switch (shape.type) {
      case "line": case "curve": case "tick": case "dimension": return { ...shape, from: move(shape.from), to: move(shape.to) };
      case "polygon": return { ...shape, points: shape.points.map(move) };
      case "point": {
        const at = move(shape.at);
        return { ...shape, at, labelAt: shape.labelAt ? [shape.labelAt[0] + at[0] - shape.at[0], shape.labelAt[1] + at[1] - shape.at[1]] : undefined };
      }
      case "rightAngle": return { ...shape, vertex: move(shape.vertex), from: move(shape.from), to: move(shape.to) };
      default: return shape;
    }
  });
  return mathFigureSpecSchema.parse({ ...spec, shapes, hemisphereSection: { ...model, degrees, top: geometry.top, sectionCenter: geometry.center, anchor: geometry.b, foot: geometry.center } });
}

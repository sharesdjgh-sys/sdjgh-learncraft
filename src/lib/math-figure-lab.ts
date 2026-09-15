import { z } from "zod";
import { evaluateMeasurement } from "./math-expression";
import { angleBinding, resizeAngle } from "./math-figure-angle";
import { hemisphereBinding, resizeHemisphereSection } from "./math-figure-hemisphere";
import { constructionSchema, figureConstraintSchema } from "./math-figure-construction-schema";
import { enforceFigureConstraints } from "./math-figure-constraints";

const finiteCoordinate = z.number().finite().min(-1000).max(1000);
// Gemini structured output does not accept JSON Schema tuple prefixItems.
const coordinate = z.array(finiteCoordinate).length(2).describe("[x, y] 좌표");

const paint = {
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  dashed: z.boolean(),
};
const lineRole = z.enum(["axis", "vector", "segment"]);

export const mathFigureShapeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("line"), ...paint, from: coordinate, to: coordinate, arrow: z.boolean(), role: lineRole.optional() }),
  z.object({ type: z.literal("curve"), ...paint, from: coordinate, to: coordinate, bend: z.number().finite().min(-100).max(100) }),
  z.object({ type: z.literal("polygon"), ...paint, points: z.array(coordinate).min(3).max(40), fill: z.string().regex(/^(none|#[0-9a-f]{6})$/i) }),
  z.object({ type: z.literal("circle"), ...paint, center: coordinate, radius: z.number().positive().max(1000), fill: z.string().regex(/^(none|#[0-9a-f]{6})$/i) }),
  z.object({ type: z.literal("ellipse"), ...paint, center: coordinate, radiusX: z.number().positive().max(1000), radiusY: z.number().positive().max(1000), rotation: z.number().min(-360).max(360), fill: z.string().regex(/^(none|#[0-9a-f]{6})$/i) }),
  z.object({ type: z.literal("ellipticArc"), ...paint, center: coordinate, radiusX: z.number().positive().max(1000), radiusY: z.number().positive().max(1000), rotation: z.number().min(-360).max(360), startAngle: z.number().min(-720).max(720), endAngle: z.number().min(-720).max(720) }),
  z.object({ type: z.literal("arc"), ...paint, center: coordinate, radius: z.number().positive().max(1000), startAngle: z.number().min(-720).max(720), endAngle: z.number().min(-720).max(720) }),
  z.object({ type: z.literal("rightAngle"), ...paint, vertex: coordinate, from: coordinate, to: coordinate, size: z.number().positive().max(100) }),
  z.object({ type: z.literal("tick"), ...paint, from: coordinate, to: coordinate, count: z.number().int().min(1).max(3), size: z.number().positive().max(100) }),
  z.object({ type: z.literal("point"), ...paint, at: coordinate, label: z.string().max(20), labelAt: coordinate.optional(), filled: z.boolean(), fontSize: z.number().min(10).max(40).default(25) }),
  z.object({ type: z.literal("text"), ...paint, at: coordinate, text: z.string().min(1).max(40), fontSize: z.number().min(10).max(40), autoPosition: z.boolean().default(true) }),
  z.object({ type: z.literal("dimension"), ...paint, from: coordinate, to: coordinate, offset: z.number().min(-100).max(100), labelAt: coordinate.optional(), text: z.string().min(1).max(40), fontSize: z.number().min(10).max(40).default(22) }),
]);

export const mathFigureSpecSchema = z.object({
  construction: constructionSchema.optional(),
  constraints: z.array(figureConstraintSchema).max(30).optional(),
  hemisphereSection: z.object({
    center: coordinate, radius: z.number().positive().max(1000), axis: coordinate,
    depthRatio: z.number().min(0.01).max(0.95), degrees: z.number().min(1).max(89),
    angleIndex: z.number().int().nonnegative(), baseSide: z.enum(["start", "end"]), markerRadius: z.number().positive().max(1000),
    top: coordinate, sectionCenter: coordinate, anchor: coordinate.optional(), foot: coordinate.optional(),
    pieces: z.array(z.object({ index: z.number().int().nonnegative(), start: z.number().finite(), end: z.number().finite(), closed: z.boolean() })).min(1).max(240),
  }).optional(),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  projection: z.enum(["plane", "spatial"]),
  xRange: z.array(z.number().finite()).length(2),
  yRange: z.array(z.number().finite()).length(2),
  shapes: z.array(mathFigureShapeSchema).min(1).max(240),
  notes: z.array(z.string().trim().min(1).max(160)).max(8),
}).superRefine((spec, context) => {
  if (spec.xRange[1] <= spec.xRange[0] || spec.yRange[1] <= spec.yRange[0]) {
    context.addIssue({ code: "custom", message: "표시 범위의 최댓값은 최솟값보다 커야 합니다." });
  }
});

export type MathFigureSpec = z.infer<typeof mathFigureSpecSchema>;
export type MathFigureShape = z.infer<typeof mathFigureShapeSchema>;

type Coordinate = number[];

function splitLineAtPoints(shape: Extract<MathFigureShape, { type: "line" }>, candidates: Coordinate[]): MathFigureShape[] {
  const [dx, dy] = [shape.to[0] - shape.from[0], shape.to[1] - shape.from[1]];
  const lengthSquared = dx * dx + dy * dy;
  const length = Math.sqrt(lengthSquared);
  if (length < 0.0001) return [shape];
  const cuts = candidates.map((point) => {
    const ratio = ((point[0] - shape.from[0]) * dx + (point[1] - shape.from[1]) * dy) / lengthSquared;
    const projected = [shape.from[0] + ratio * dx, shape.from[1] + ratio * dy];
    return { point, ratio, distance: Math.hypot(point[0] - projected[0], point[1] - projected[1]) };
  }).filter((item) => item.ratio > 0.001 && item.ratio < 0.999 && item.distance <= Math.max(0.015, length * 0.012)).sort((a, b) => a.ratio - b.ratio);
  const ordered = [shape.from, ...cuts.filter((item, index) => index === 0 || item.ratio - cuts[index - 1].ratio > 0.001).map((item) => item.point), shape.to];
  return ordered.slice(0, -1).map((from, index) => ({ ...shape, from, to: ordered[index + 1], arrow: shape.arrow && index === ordered.length - 2 }));
}

function ellipseAngle(point: Coordinate, center: Coordinate, radiusX: number, radiusY: number, rotation: number) {
  const radians = rotation * Math.PI / 180;
  const dx = point[0] - center[0], dy = point[1] - center[1];
  const localX = dx * Math.cos(radians) + dy * Math.sin(radians);
  const localY = -dx * Math.sin(radians) + dy * Math.cos(radians);
  const boundaryError = Math.abs((localX / radiusX) ** 2 + (localY / radiusY) ** 2 - 1);
  const angle = (Math.atan2(localY / radiusY, localX / radiusX) * 180 / Math.PI + 360) % 360;
  return { angle, boundaryError };
}

function boundaryAngles(center: Coordinate, radiusX: number, radiusY: number, rotation: number, candidates: Coordinate[]) {
  return candidates.map((point) => ellipseAngle(point, center, radiusX, radiusY, rotation)).filter((item) => item.boundaryError <= 0.08).map((item) => item.angle).sort((a, b) => a - b).filter((angle, index, values) => index === 0 || angle - values[index - 1] > 0.8);
}

function splitClosedCurve(shape: Extract<MathFigureShape, { type: "circle" | "ellipse" }>, candidates: Coordinate[]): MathFigureShape[] {
  if (shape.fill !== "none") return [shape];
  const radiusX = shape.type === "circle" ? shape.radius : shape.radiusX;
  const radiusY = shape.type === "circle" ? shape.radius : shape.radiusY;
  const rotation = shape.type === "circle" ? 0 : shape.rotation;
  const angles = boundaryAngles(shape.center, radiusX, radiusY, rotation, candidates);
  if (angles.length < 2) return [shape];
  return angles.map((startAngle, index) => {
    const endAngle = index === angles.length - 1 ? angles[0] + 360 : angles[index + 1];
    if (shape.type === "circle") return { type: "arc" as const, color: shape.color, dashed: shape.dashed, center: shape.center, radius: shape.radius, startAngle, endAngle };
    return { type: "ellipticArc" as const, color: shape.color, dashed: shape.dashed, center: shape.center, radiusX: shape.radiusX, radiusY: shape.radiusY, rotation: shape.rotation, startAngle, endAngle };
  });
}

function splitOpenArc(shape: Extract<MathFigureShape, { type: "arc" | "ellipticArc" }>, candidates: Coordinate[]): MathFigureShape[] {
  const radiusX = shape.type === "arc" ? shape.radius : shape.radiusX;
  const radiusY = shape.type === "arc" ? shape.radius : shape.radiusY;
  const rotation = shape.type === "arc" ? 0 : shape.rotation;
  const span = shape.endAngle - shape.startAngle;
  if (Math.abs(span) < 0.001) return [shape];
  const cuts = boundaryAngles(shape.center, radiusX, radiusY, rotation, candidates).map((angle) => {
    let unwrapped = angle;
    if (span > 0) while (unwrapped < shape.startAngle) unwrapped += 360;
    if (span < 0) while (unwrapped > shape.startAngle) unwrapped -= 360;
    return { angle: unwrapped, progress: (unwrapped - shape.startAngle) / span };
  }).filter((item) => item.progress > 0.002 && item.progress < 0.998).sort((a, b) => a.progress - b.progress).filter((item, index, values) => index === 0 || item.progress - values[index - 1].progress > 0.002);
  const angles = [shape.startAngle, ...cuts.map((item) => item.angle), shape.endAngle];
  return angles.slice(0, -1).map((startAngle, index) => ({ ...shape, startAngle, endAngle: angles[index + 1] }));
}

const aiPaint = {
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#1f2937"),
  dashed: z.boolean().default(false),
};
const pointId = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,19}$/);
const pointReference = z.union([pointId, coordinate]);
const aiShapeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("line"), ...aiPaint, from: pointId, to: pointId, arrow: z.boolean().default(false), role: lineRole.optional() }),
  z.object({ type: z.literal("curve"), ...aiPaint, from: pointId, to: pointId, bend: z.number().finite().min(-100).max(100) }),
  z.object({ type: z.literal("polygon"), ...aiPaint, points: z.array(pointId).min(3).max(40), fill: z.string().regex(/^(none|#[0-9a-f]{6})$/i).default("none") }),
  z.object({ type: z.literal("circle"), ...aiPaint, center: pointReference, radius: z.number().positive().max(1000), fill: z.string().regex(/^(none|#[0-9a-f]{6})$/i).default("none") }),
  z.object({ type: z.literal("ellipse"), ...aiPaint, center: pointReference, radiusX: z.number().positive().max(1000), radiusY: z.number().positive().max(1000), rotation: z.number().min(-360).max(360).default(0), fill: z.string().regex(/^(none|#[0-9a-f]{6})$/i).default("none") }),
  z.object({ type: z.literal("ellipticArc"), ...aiPaint, center: pointReference, radiusX: z.number().positive().max(1000), radiusY: z.number().positive().max(1000), rotation: z.number().min(-360).max(360).default(0), startAngle: z.number().min(-720).max(720), endAngle: z.number().min(-720).max(720) }),
  z.object({ type: z.literal("arc"), ...aiPaint, center: pointReference, radius: z.number().positive().max(1000), startAngle: z.number().min(-720).max(720), endAngle: z.number().min(-720).max(720) }),
  z.object({ type: z.literal("rightAngle"), ...aiPaint, vertex: pointId, from: pointId, to: pointId, size: z.number().positive().max(100) }),
  z.object({ type: z.literal("tick"), ...aiPaint, from: pointId, to: pointId, count: z.number().int().min(1).max(3), size: z.number().positive().max(100) }),
  z.object({ type: z.literal("text"), ...aiPaint, at: coordinate, text: z.string().min(1).max(40), fontSize: z.number().min(10).max(40).default(18), autoPosition: z.boolean().default(true) }),
  z.object({ type: z.literal("dimension"), ...aiPaint, from: pointId, to: pointId, offset: z.number().min(-100).max(100), text: z.string().min(1).max(40), fontSize: z.number().min(10).max(40).default(22) }),
]);

export const aiMathFigureSpecSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  projection: z.enum(["plane", "spatial"]),
  xRange: z.array(z.number().finite()).length(2),
  yRange: z.array(z.number().finite()).length(2),
  points: z.array(z.object({
    id: pointId,
    at: coordinate,
    label: z.string().max(20).default(""),
    labelAt: coordinate.optional(),
    filled: z.boolean().default(false),
    fontSize: z.number().min(10).max(40).default(25),
  })).min(1).max(60),
  shapes: z.array(aiShapeSchema).min(1).max(100),
  notes: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
});

export function normalizeAiMathFigureSpec(input: z.input<typeof aiMathFigureSpecSchema>): MathFigureSpec {
  const parsed = aiMathFigureSpecSchema.parse(input);
  const points = new Map(parsed.points.map((item) => [item.id, item.at]));
  const at = (reference: string | number[]) => {
    if (Array.isArray(reference)) return reference;
    const value = points.get(reference);
    if (!value) throw new Error(`도형 요소가 존재하지 않는 점 ${reference}을 참조합니다.`);
    return value;
  };
  const normalizedShapes: MathFigureShape[] = parsed.shapes.map((shape) => {
    switch (shape.type) {
      case "line": return { ...shape, from: at(shape.from), to: at(shape.to) };
      case "curve": return { ...shape, from: at(shape.from), to: at(shape.to) };
      case "polygon": return { ...shape, points: shape.points.map(at) };
      case "circle": return { ...shape, center: at(shape.center) };
      case "ellipse": return { ...shape, center: at(shape.center) };
      case "ellipticArc": return { ...shape, center: at(shape.center) };
      case "arc": return { ...shape, center: at(shape.center) };
      case "rightAngle": return { ...shape, vertex: at(shape.vertex), from: at(shape.from), to: at(shape.to) };
      case "tick": return { ...shape, from: at(shape.from), to: at(shape.to) };
      case "text": return shape;
      case "dimension": return { ...shape, from: at(shape.from), to: at(shape.to) };
    }
  });
  const expandedShapes = normalizedShapes.flatMap((shape): MathFigureShape[] => {
    if (shape.type !== "polygon" || shape.fill !== "none") return [shape];
    return shape.points.map((from, index) => ({
      type: "line" as const,
      color: shape.color,
      dashed: shape.dashed,
      from,
      to: shape.points[(index + 1) % shape.points.length],
      arrow: false,
    }));
  });
  const splitPoints = parsed.points.map((item) => item.at);
  const shapes = expandedShapes.flatMap((shape): MathFigureShape[] => {
    if (shape.type === "line") return splitLineAtPoints(shape, splitPoints);
    if (shape.type === "circle" || shape.type === "ellipse") return splitClosedCurve(shape, splitPoints);
    if (shape.type === "arc" || shape.type === "ellipticArc") return splitOpenArc(shape, splitPoints);
    return [shape];
  });
  shapes.push(...parsed.points.filter((item) => item.filled || item.label).map((item) => ({
    type: "point" as const,
    color: "#1f2937",
    dashed: false,
    at: item.at,
    label: item.label,
    labelAt: item.labelAt,
    filled: item.filled,
    fontSize: item.fontSize,
  })));
  return mathFigureSpecSchema.parse({ ...parsed, shapes });
}

function sameCoordinate(a: Coordinate, b: Coordinate) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.001;
}

export function replaceSharedCoordinate(shape: MathFigureShape, before: Coordinate, after: Coordinate): MathFigureShape {
  const replace = (value: Coordinate) => sameCoordinate(value, before) ? after : value;
  switch (shape.type) {
    case "line": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "curve": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "polygon": return { ...shape, points: shape.points.map(replace) };
    case "circle": return { ...shape, center: replace(shape.center) };
    case "ellipse": return { ...shape, center: replace(shape.center) };
    case "ellipticArc": return { ...shape, center: replace(shape.center) };
    case "arc": return { ...shape, center: replace(shape.center) };
    case "rightAngle": return { ...shape, vertex: replace(shape.vertex), from: replace(shape.from), to: replace(shape.to) };
    case "tick": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "dimension": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "text": return { ...shape, at: replace(shape.at) };
    case "point": {
      if (!sameCoordinate(shape.at, before)) return shape;
      const delta = [after[0] - before[0], after[1] - before[1]];
      return { ...shape, at: after, labelAt: shape.labelAt ? [shape.labelAt[0] + delta[0], shape.labelAt[1] + delta[1]] : undefined };
    }
  }
}

export function reconcileVariationGeometry(spec: MathFigureSpec): MathFigureSpec {
  let next = spec;
  const warnings = [...spec.notes];
  const warn = (message: string) => { if (!warnings.includes(message)) warnings.push(message); };
  for (let index = 0; index < spec.shapes.length; index++) {
    const measurement = next.shapes[index];
    if (measurement.type !== "text" && measurement.type !== "dimension") continue;
    const { value, angle } = evaluateMeasurement(measurement.text);
    if (measurement.type === "text" && !angle) continue;
    if (value === null || value <= 0) { warn(`‘${measurement.text}’은 양의 수치로 계산할 수 없어 자동 변형하지 않았습니다.`); continue; }
    try {
      if (measurement.type === "dimension") {
        if (next.projection === "spatial") { warn("공간도형의 투영 길이를 실제 길이로 간주하지 않습니다. 계산 유형의 매개변수를 사용해 주세요."); continue; }
        const length = Math.hypot(measurement.to[0] - measurement.from[0], measurement.to[1] - measurement.from[1]);
        if (length < 0.001) { warn("길이가 0인 보조표시는 자동 변형하지 않았습니다."); continue; }
        const moved = measurement.from.map((v, i) => v + (measurement.to[i] - v) * value / length);
        next = enforceFigureConstraints(mathFigureSpecSchema.parse({ ...next, shapes: next.shapes.map(s => replaceSharedCoordinate(s, measurement.to, moved)) }));
      } else {
        const candidates = next.shapes.flatMap((s, i) => s.type === "arc" && Math.hypot(measurement.at[0] - s.center[0], measurement.at[1] - s.center[1]) <= s.radius * 3 && (angleBinding(next, s) || hemisphereBinding(next, i)) ? [i] : []);
        if (candidates.length !== 1) { warn("각도 라벨과 연결된 호가 불명확하여 자동 변형하지 않았습니다."); continue; }
        const arcIndex = candidates[0], hemisphere = hemisphereBinding(next, arcIndex);
        if (next.projection === "spatial" && !hemisphere) { warn("공간 각도의 실제 방향을 확인할 수 없어 자동 변형하지 않았습니다."); continue; }
        next = enforceFigureConstraints(hemisphere ? resizeHemisphereSection(next, hemisphere, value) : resizeAngle(next, arcIndex, value, "start"));
      }
    } catch { warn(`‘${measurement.text}’의 조건을 적용할 수 없어 해당 자동 변형을 취소했습니다.`); }
  }
  return mathFigureSpecSchema.parse({ ...next, notes: warnings.slice(-8) });
}

export const MATH_FIGURE_SYSTEM_PROMPT = `당신은 대한민국 수학 시험지용 도형을 복원하는 기하 도면 전문가입니다.
입력 이미지를 보고 제공된 JSON 스키마만 반환하세요. 원본의 배치, 비율, 투영 방향과 곡률을 충실히 유지하면서 점, 선, 원, 각, 직각, 합동 표시와 라벨을 깨끗한 흑백 벡터 도형으로 복원합니다. 수학적 의미를 추정해서 원본과 다른 모양으로 재설계하지 않습니다.

규칙:
- 원본에 보이는 정보만 그립니다. 답이나 보조선을 새로 만들지 않습니다.
- 복원 요청에서는 식이나 수치를 그림 좌표의 길이로 환산하여 재배치하지 않습니다. 공간도형도 원본에 보이는 2차원 투영을 그대로 옮기고 원근을 새로 계산하지 않습니다.
- 회색 면의 경계가 곡선이면 polygon의 points를 경계 순서대로 정의하고 해당 변의 같은 양 끝점 id를 사용하는 curve를 별도로 정의합니다. 렌더러는 그 곡선을 따라 면을 채우므로 곡선 아래에 직선 현이나 삼각분할 대각선을 추가하지 않습니다. 직선 경계도 별도 line으로 정의하면 개별 편집할 수 있습니다.
- 곡선 면은 꼭짓점만 잇는 다각형으로 단순화하지 않습니다. 굴곡이 달라지는 지점에서는 여러 curve로 나누고 polygon에도 같은 경계점을 순서대로 포함합니다. 원본에 없는 단면이나 두께 표현을 추가하지 않습니다.
- shapes 배열에는 뒤쪽 면부터 앞쪽 면 순서로 넣고, 모든 면을 넣은 다음 보이는 경계선과 곡선, 마지막으로 라벨을 넣어 선과 글자가 채움에 덮이지 않게 합니다. 가려진 선을 임의로 관통시키지 않습니다.
- 모든 선과 글자가 xRange/yRange 안에 있고 서로 불필요하게 겹치지 않게 배치합니다.
- 일반 선은 #1f2937과 dashed=false를 사용합니다. 원본의 점선, 숨은 선, 투영선은 반드시 dashed=true로 구분합니다. 채움은 기본 none입니다.
- 공간도형은 projection=spatial로 설정하고 가려진 모서리는 반드시 별도의 line과 dashed=true로 표시합니다. 실선과 점선이 섞인 외곽선은 하나의 polygon으로 합치지 않습니다.
- 구, 원의 원근 표현에는 ellipse 또는 ellipticArc를 사용합니다. rotation과 시작·끝 각도는 도 단위입니다.
- 각도 표시는 arc와 text를 함께 사용합니다. 직각은 실제 꼭짓점과 두 변을 참조하는 rightAngle을 사용합니다.
- 같은 길이 표시는 해당 선분을 from/to로 지정한 tick을 사용합니다.
- point의 labelAt을 적극 사용해 라벨이 선과 겹치지 않게 합니다. 점이 실제로 검게 표시된 경우만 filled=true입니다.
- 화면 좌표가 아니라 수학 좌표입니다. y가 클수록 위쪽입니다.
- 수치 변경 지시가 있으면 라벨만 바꾸지 말고, 가능한 범위에서 도형 배치도 해당 조건과 일관되게 조정합니다.
- 수치·조건 변형 요청에서는 숫자 문자열만 교체하는 결과를 절대 반환하지 않습니다. 각도가 바뀌면 대응하는 각도 호의 크기와 적어도 한쪽 변의 방향을 바꾸고, 길이가 바뀌면 해당 선분의 끝점과 그 점에 연결된 요소를 이동하여 새 조건이 눈으로도 구분되게 재구성합니다.
- 각도 수치 text는 해당 arc의 가운데 방향에 놓고 호와 글자가 맞닿지 않도록 반지름 바깥쪽에 충분한 간격을 둡니다.
- 제곱근, 로그, 분수, 지수, 아래첨자가 포함된 수치는 KaTeX 문법을 사용합니다. 예: \\sqrt{3}, \\log_{2}8, \\frac{a}{b}, x^{2}. JSON 문자열 안의 역슬래시는 올바르게 이스케이프합니다.
- 원본에서 두 점 사이의 길이를 나타내는 휘어진 점선과 수치가 함께 보이면 단순 text가 아니라 dimension(from,to,offset,text,fontSize)을 사용하고 dashed=true로 지정합니다. from/to는 길이를 재는 두 점이며 offset의 부호는 곡선이 휘는 방향, 절댓값은 휘어진 정도입니다. dimension은 곧은 실선 치수선이 아니라 두 점을 연결하는 점선 곡선으로 렌더링됩니다.
- 원본에서 수치만 선분 가까이에 적혀 있고 치수 보조선이 전혀 없을 때만 text를 사용합니다. 길이 수치 text는 대응하는 선분 중앙의 한쪽 바깥에 놓고 선, 점, 문자 라벨과 겹치지 않게 합니다.
- 원본의 원근 도식은 실제 축척과 다를 수 있으므로, 시각적으로만 추정한 관계는 notes에 명시합니다.
- 먼저 points에 도형 구성에 필요한 모든 점을 id와 [x,y] 좌표로 정의합니다. 선, 다각형, 원, 직각, 합동 표시는 좌표가 아니라 이 점 id를 참조합니다.
- 라벨이 없어도 선이 만나는 교차점, 선 위의 분기점, 호의 양 끝점은 P1, P2처럼 points에 반드시 정의합니다. label은 빈 문자열로 둡니다.
- 하나의 선 위에 점이 있으면 그 점을 지나가는 긴 선 하나로 만들지 말고 점을 경계로 각각 분리합니다. 예를 들어 A-O-B가 일직선이면 AB 하나가 아니라 AO와 OB 두 line을 만듭니다.
- 원이나 타원이 두 점 A, B를 지나고 위·아래 호를 따로 조절할 수 있어야 하면 전체 circle/ellipse 하나로 만들지 말고 A와 B를 경계로 한 arc/ellipticArc 두 개를 만듭니다. 실선 부분과 점선 부분도 반드시 별도 호로 분리합니다.
- 정확한 원호가 아니라 두 점 사이를 완만하게 잇는 일반 곡선이나 보조 곡선은 curve(from,to,bend)를 사용합니다. bend의 부호는 휘는 방향, 절댓값은 휘어짐 정도입니다.
- point의 labelAt은 "top" 같은 단어가 아니라 반드시 [x,y] 좌표입니다.
- 모든 직선은 type=line이며 role로 의미를 구분합니다. x/y/z 좌표축은 role=axis, 실제 수학 벡터는 role=vector, 일반 선분·함수 그래프의 직선 구간·좌표 보조선은 role=segment입니다. 화살표가 있다는 이유만으로 벡터로 판정하지 않습니다. 좌표축의 숫자·눈금·공점·폐점도 벡터가 아닙니다.
- arrow는 끝에 화살촉이 보일 때만 true이며 role과 독립적입니다. 좌표축을 분할해도 모든 조각은 role=axis를 유지하고 마지막 조각만 arrow=true입니다. dashed는 점선 여부입니다.
- 좌표축을 여러 line으로 나눌 때 화살표는 원본 화살촉이 있는 마지막 조각에만 둡니다. 중간 조각과 원점에는 화살표를 추가하지 않습니다.
- shapes의 종류와 필드는 다음만 사용합니다:
  line(from,to,arrow,role), curve(from,to,bend), polygon(points,fill), circle(center,radius,fill), ellipse(center,radiusX,radiusY,rotation,fill), arc(center,radius,startAngle,endAngle), ellipticArc(center,radiusX,radiusY,rotation,startAngle,endAngle), rightAngle(vertex,from,to,size), tick(from,to,count,size), text(at,text,fontSize), dimension(from,to,offset,text,fontSize).
- 모든 shape에는 color="#1f2937"와 dashed 값을 명시합니다. dashed는 원본이 실선이면 false, 점선이면 true입니다.
- 출력 예시: {"title":"삼각형 ABC","description":"점 A, B, C로 이루어진 삼각형","projection":"plane","xRange":[0,10],"yRange":[0,7],"points":[{"id":"A","at":[5,6],"label":"A","labelAt":[5,6.5],"filled":false},{"id":"B","at":[1,1],"label":"B","labelAt":[0.6,0.7],"filled":false},{"id":"C","at":[9,1],"label":"C","labelAt":[9.4,0.7],"filled":false}],"shapes":[{"type":"polygon","points":["A","B","C"],"color":"#1f2937","dashed":false,"fill":"none"}],"notes":[]}
- notes에는 인식이 불확실한 부분이나 사용자가 확인해야 할 수학 조건만 기록합니다.`;

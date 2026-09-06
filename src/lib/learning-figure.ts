export type Position = [number, number];
type Paint = { color: string; fill: string; dashed: boolean };
export type DiagramShape = Paint & (
  | { type: "line"; from: Position; to: Position; arrow: boolean }
  | { type: "polygon"; points: Position[] }
  | { type: "circle"; center: Position; radius: number }
  | { type: "arc"; center: Position; radius: number; startAngle: number; endAngle: number }
  | { type: "rightAngle"; vertex: Position; from: Position; to: Position; size: number }
  | { type: "point"; at: Position; label: string; labelAt?: Position }
  | { type: "text"; at: Position; text: string }
);
export type DiagramSpec = {
  kind: "diagram"; title: string; description: string;
  projection: "plane" | "spatial";
  xRange: Position; yRange: Position; shapes: DiagramShape[];
};
export type ChartSpec = {
  kind: "bar" | "line"; title: string; description: string;
  xLabel: string; yLabel: string; dataNote: string;
  labels: string[]; series: { name: string; values: number[]; color: string }[];
};
export type LearningFigureSpec = DiagramSpec | ChartSpec;
const COLORS = ["#4f46a5", "#218577", "#b56732", "#9b5487"];

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("그림 형식을 확인해 주세요.");
  return value as Record<string, unknown>;
}
function label(value: unknown, fallback = "", max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}
function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e9) throw new Error("그림의 수치가 올바르지 않아요.");
  return value;
}
function position(value: unknown): Position {
  if (!Array.isArray(value) || value.length !== 2) throw new Error("그림의 좌표가 올바르지 않아요.");
  return [number(value[0]), number(value[1])];
}
function range(value: unknown, fallback: Position): Position {
  const result = value === undefined ? fallback : position(value);
  if (result[1] - result[0] < 0.001 || result[1] - result[0] > 10000) throw new Error("그림의 표시 범위를 확인해 주세요.");
  return result;
}
function positive(value: unknown) {
  const result = number(value);
  if (result <= 0 || result > 10000) throw new Error("길이는 양수여야 해요.");
  return result;
}
function color(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
function shape(value: unknown, projection: DiagramSpec["projection"]): DiagramShape {
  const raw = record(value);
  const paint = { color: color(raw.color, "#374151"), fill: color(raw.fill, "none"), dashed: raw.dashed === true };
  switch (raw.type) {
    case "line": return { ...paint, type: "line", from: position(raw.from), to: position(raw.to), arrow: raw.arrow === true };
    case "polygon": {
      if (!Array.isArray(raw.points) || raw.points.length < 3 || raw.points.length > 40) throw new Error("다각형의 꼭짓점을 확인해 주세요.");
      return { ...paint, type: "polygon", points: raw.points.map(position) };
    }
    case "circle": return { ...paint, type: "circle", center: position(raw.center), radius: positive(raw.radius) };
    case "arc": {
      const startAngle = number(raw.startAngle), endAngle = number(raw.endAngle);
      if (Math.abs(endAngle - startAngle) >= 360 || endAngle === startAngle) throw new Error("호의 각도는 0도보다 크고 360도보다 작아야 해요.");
      return { ...paint, type: "arc", center: position(raw.center), radius: positive(raw.radius), startAngle, endAngle };
    }
    case "rightAngle": {
      const vertex = position(raw.vertex), from = position(raw.from), to = position(raw.to);
      const a = [from[0] - vertex[0], from[1] - vertex[1]];
      const b = [to[0] - vertex[0], to[1] - vertex[1]];
      const product = Math.hypot(...a) * Math.hypot(...b);
      if (!product) throw new Error("직각 표시의 두 변은 길이가 있어야 해요.");
      if (Math.abs(a[0] * b[1] - a[1] * b[0]) / product < 0.001) throw new Error("직각 표시의 두 변이 겹쳐 있어요. 그림의 시점을 바꿔 주세요.");
      // A spatial right angle generally appears oblique after projection.
      if (projection === "plane" && Math.abs(a[0] * b[0] + a[1] * b[1]) / product > 0.01) throw new Error("직각 표시와 도형의 각도가 일치하지 않아요.");
      return { ...paint, type: "rightAngle", vertex, from, to, size: raw.size === undefined ? 0.25 : positive(raw.size) };
    }
    case "point": return { ...paint, type: "point", at: position(raw.at), label: label(raw.label, "", 40), labelAt: raw.labelAt === undefined ? undefined : position(raw.labelAt) };
    case "text": return { ...paint, type: "text", at: position(raw.at), text: label(raw.text, "", 60) };
    default: throw new Error("지원하지 않는 그림 요소예요.");
  }
}

export function parseLearningFigure(source: string): LearningFigureSpec {
  if (source.length > 40000) throw new Error("그림 데이터가 너무 커요.");
  const raw = record(JSON.parse(source));
  const base = { title: label(raw.title, "문제 자료", 80), description: label(raw.description, "", 500) };
  if (!base.description) throw new Error("그림을 설명하는 문장이 필요해요.");
  if (raw.kind === "diagram") {
    if (!Array.isArray(raw.shapes) || !raw.shapes.length || raw.shapes.length > 80) throw new Error("그림 요소는 1~80개로 작성해 주세요.");
    if (raw.projection !== undefined && raw.projection !== "plane" && raw.projection !== "spatial") throw new Error("도형의 투영 형식을 확인해 주세요.");
    // Older answers have no projection field; retain recognizable spatial diagrams.
    const projection = raw.projection ?? (/삼수선|공간\s*도형|공간\s*좌표|입체\s*도형|사면체|직육면체|정육면체/.test(`${base.title} ${base.description}`) ? "spatial" : "plane");
    return { ...base, kind: "diagram", projection, xRange: range(raw.xRange, [0, 10]), yRange: range(raw.yRange, [0, 6]), shapes: raw.shapes.map((item) => shape(item, projection)) };
  }
  if (raw.kind !== "bar" && raw.kind !== "line") throw new Error("지원하지 않는 자료 형식이에요.");
  if (!Array.isArray(raw.labels) || !raw.labels.length || raw.labels.length > 12) throw new Error("자료 항목은 1~12개로 작성해 주세요.");
  const labels = raw.labels.map((value) => label(value, "", 32));
  if (labels.some((value) => !value)) throw new Error("자료 항목의 이름이 필요해요.");
  if (!Array.isArray(raw.series) || !raw.series.length || raw.series.length > 4) throw new Error("자료 계열은 1~4개로 작성해 주세요.");
  const series = raw.series.map((value, index) => {
    const item = record(value);
    if (!Array.isArray(item.values) || item.values.length !== labels.length) throw new Error("항목과 수치의 개수가 달라요.");
    return { name: label(item.name, `자료 ${index + 1}`, 40), values: item.values.map(number), color: color(item.color, COLORS[index]) };
  });
  const dataNote = label(raw.dataNote);
  if (!dataNote) throw new Error("자료의 출처 또는 가상 자료 표시가 필요해요.");
  return { ...base, kind: raw.kind, labels, series, xLabel: label(raw.xLabel, "", 40), yLabel: label(raw.yLabel, "", 40), dataNote };
}

import { z } from "zod";

/** 그림판 크기(그림 좌표 단위). 내보낼 때는 그린 부분만 잘라 냅니다. */
export const FIGURE_WIDTH = 960;
export const FIGURE_HEIGHT = 600;
export const GRID = 10;

export type Point = [number, number];

export const partGroups = ["전기 회로", "빛과 파동", "실험 기구", "힘과 운동", "지구와 우주"] as const;
export type PartGroup = typeof partGroups[number];

type PartSpec = {
  name: string;
  group: PartGroup;
  /** 부품이 차지하는 상자 크기(가운데가 원점). 선택 표시와 이름 자리 계산에 씁니다. */
  w: number;
  h: number;
  /** 도선을 이을 수 있는 단자(부품 좌표). 도선을 그리면 가까운 단자에 붙습니다. */
  terminals?: Point[];
  label?: string;
  /** 액체를 담을 수 있는 그릇이면 기본 높이(%)를 적습니다. */
  liquid?: number;
  keywords?: string;
};

export const partCatalog = {
  cell: { name: "전지", group: "전기 회로", w: 60, h: 44, terminals: [[-30, 0], [30, 0]], keywords: "건전지 배터리 전원" },
  battery: { name: "전지 2개", group: "전기 회로", w: 80, h: 44, terminals: [[-40, 0], [40, 0]], keywords: "건전지 직렬 전원" },
  dcSource: { name: "전원 장치", group: "전기 회로", w: 70, h: 50, terminals: [[-35, 0], [35, 0]], label: "전원 장치", keywords: "직류 전원" },
  resistor: { name: "저항", group: "전기 회로", w: 70, h: 20, terminals: [[-35, 0], [35, 0]], label: "R", keywords: "저항기" },
  resistorZigzag: { name: "저항(지그재그)", group: "전기 회로", w: 70, h: 20, terminals: [[-35, 0], [35, 0]], label: "R", keywords: "저항기" },
  variableResistor: { name: "가변 저항", group: "전기 회로", w: 70, h: 36, terminals: [[-35, 0], [35, 0]], label: "R", keywords: "가변저항 저항" },
  bulb: { name: "전구", group: "전기 회로", w: 60, h: 36, terminals: [[-30, 0], [30, 0]], keywords: "꼬마전구 램프" },
  switchOpen: { name: "스위치(열림)", group: "전기 회로", w: 60, h: 30, terminals: [[-30, 0], [30, 0]], label: "S", keywords: "스위치" },
  switchClosed: { name: "스위치(닫힘)", group: "전기 회로", w: 60, h: 20, terminals: [[-30, 0], [30, 0]], label: "S", keywords: "스위치" },
  ammeter: { name: "전류계", group: "전기 회로", w: 60, h: 40, terminals: [[-30, 0], [30, 0]], keywords: "암미터" },
  voltmeter: { name: "전압계", group: "전기 회로", w: 60, h: 40, terminals: [[-30, 0], [30, 0]], keywords: "볼트미터" },
  galvanometer: { name: "검류계", group: "전기 회로", w: 60, h: 40, terminals: [[-30, 0], [30, 0]], keywords: "갈바노미터" },
  diode: { name: "다이오드", group: "전기 회로", w: 60, h: 30, terminals: [[-30, 0], [30, 0]], keywords: "반도체 정류" },
  capacitor: { name: "축전기", group: "전기 회로", w: 50, h: 40, terminals: [[-25, 0], [25, 0]], label: "C", keywords: "콘덴서" },
  coil: { name: "코일", group: "전기 회로", w: 90, h: 30, terminals: [[-45, 0], [45, 0]], keywords: "솔레노이드 전자석" },
  junction: { name: "접점", group: "전기 회로", w: 12, h: 12, terminals: [[0, 0]], keywords: "점 연결" },

  convexLens: { name: "볼록 렌즈", group: "빛과 파동", w: 28, h: 150, keywords: "렌즈" },
  concaveLens: { name: "오목 렌즈", group: "빛과 파동", w: 30, h: 150, keywords: "렌즈" },
  planeMirror: { name: "평면거울", group: "빛과 파동", w: 16, h: 150, keywords: "거울 반사" },
  concaveMirror: { name: "오목 거울", group: "빛과 파동", w: 34, h: 150, keywords: "거울 반사" },
  convexMirror: { name: "볼록 거울", group: "빛과 파동", w: 34, h: 150, keywords: "거울 반사" },
  objectArrow: { name: "물체(화살표)", group: "빛과 파동", w: 20, h: 70, label: "물체", keywords: "물체 상" },
  candle: { name: "촛불", group: "빛과 파동", w: 26, h: 80, keywords: "양초 물체" },
  lightSource: { name: "광원", group: "빛과 파동", w: 44, h: 44, keywords: "빛 전구 레이저" },
  prism: { name: "프리즘", group: "빛과 파동", w: 100, h: 88, keywords: "굴절 분산" },
  screen: { name: "스크린", group: "빛과 파동", w: 14, h: 140, label: "스크린", keywords: "막" },
  doubleSlit: { name: "이중 슬릿", group: "빛과 파동", w: 12, h: 150, keywords: "간섭 영의 실험" },
  eye: { name: "눈", group: "빛과 파동", w: 50, h: 30, keywords: "관찰자" },
  point: { name: "점(초점 등)", group: "빛과 파동", w: 12, h: 12, label: "F", keywords: "초점 점 F" },

  beaker: { name: "비커", group: "실험 기구", w: 80, h: 90, liquid: 55 },
  flask: { name: "삼각 플라스크", group: "실험 기구", w: 80, h: 100, liquid: 35, keywords: "플라스크" },
  testTube: { name: "시험관", group: "실험 기구", w: 24, h: 100, liquid: 40 },
  graduatedCylinder: { name: "눈금실린더", group: "실험 기구", w: 34, h: 130, liquid: 50, keywords: "메스실린더" },
  gasJar: { name: "집기병", group: "실험 기구", w: 60, h: 90, liquid: 0, keywords: "기체" },
  trough: { name: "수조", group: "실험 기구", w: 170, h: 70, liquid: 65, keywords: "물통" },
  alcoholLamp: { name: "알코올램프", group: "실험 기구", w: 60, h: 76, keywords: "가열 램프" },
  stand: { name: "스탠드", group: "실험 기구", w: 110, h: 200, keywords: "링 클램프 거치대" },
  tripod: { name: "삼발이", group: "실험 기구", w: 100, h: 90, keywords: "가열 받침" },
  wireGauze: { name: "쇠그물", group: "실험 기구", w: 90, h: 10, keywords: "석면 가열" },
  thermometer: { name: "온도계", group: "실험 기구", w: 14, h: 130 },
  dropper: { name: "스포이트", group: "실험 기구", w: 18, h: 80, keywords: "피펫" },
  funnel: { name: "깔때기", group: "실험 기구", w: 70, h: 90, keywords: "거름 여과" },
  balance: { name: "전자저울", group: "실험 기구", w: 120, h: 50, keywords: "저울 질량" },

  cart: { name: "수레", group: "힘과 운동", w: 90, h: 50, label: "A", keywords: "역학수레" },
  block: { name: "물체(상자)", group: "힘과 운동", w: 60, h: 40, label: "A", keywords: "나무 도막 상자" },
  ball: { name: "공", group: "힘과 운동", w: 36, h: 36, keywords: "구" },
  incline: { name: "빗면", group: "힘과 운동", w: 240, h: 120, keywords: "경사면" },
  ground: { name: "지면", group: "힘과 운동", w: 240, h: 16, keywords: "바닥 수평면" },
  wall: { name: "벽", group: "힘과 운동", w: 16, h: 160, keywords: "고정" },
  ceiling: { name: "천장", group: "힘과 운동", w: 200, h: 16, keywords: "고정 매달기" },
  pulley: { name: "도르래", group: "힘과 운동", w: 50, h: 60, keywords: "고정 도르래" },
  spring: { name: "용수철", group: "힘과 운동", w: 120, h: 24, keywords: "스프링 탄성" },
  weight: { name: "추", group: "힘과 운동", w: 36, h: 50, label: "m", keywords: "질량 추" },

  sun: { name: "태양", group: "지구와 우주", w: 80, h: 80, label: "태양" },
  earth: { name: "지구", group: "지구와 우주", w: 60, h: 60, label: "지구" },
  moon: { name: "달", group: "지구와 우주", w: 30, h: 30, label: "달" },
  orbit: { name: "궤도", group: "지구와 우주", w: 300, h: 180, keywords: "공전 타원" },
} satisfies Record<string, PartSpec>;

export type PartKind = keyof typeof partCatalog;
export const partKinds = Object.keys(partCatalog) as PartKind[];
export function partSpec(kind: PartKind): PartSpec {
  return partCatalog[kind];
}

export const lineStyles = ["wire", "ray", "force", "arrow", "plain"] as const;
export type LineStyle = typeof lineStyles[number];
export const lineStyleNames: Record<LineStyle, string> = { wire: "도선", ray: "광선", force: "힘 화살표", arrow: "화살표", plain: "보조선" };

export const inkColors = [
  { name: "검정", value: "#1f2937" },
  { name: "빨강", value: "#e03131" },
  { name: "파랑", value: "#1c7ed6" },
  { name: "초록", value: "#2f9e44" },
  { name: "주황", value: "#e8590c" },
  { name: "보라", value: "#7048e8" },
  { name: "회색", value: "#868e96" },
] as const;
export const liquidColors = [
  { name: "물", value: "#a5d8ff" },
  { name: "붉은 용액", value: "#ffc9c9" },
  { name: "노란 용액", value: "#ffec99" },
  { name: "초록 용액", value: "#b2f2bb" },
  { name: "보라 용액", value: "#d0bfff" },
] as const;

export const lineDefaults: Record<LineStyle, { color: string; width: number; dashed: boolean }> = {
  wire: { color: "#1f2937", width: 2.5, dashed: false },
  ray: { color: "#e03131", width: 2, dashed: false },
  force: { color: "#1c7ed6", width: 3.5, dashed: false },
  arrow: { color: "#1f2937", width: 2.5, dashed: false },
  plain: { color: "#868e96", width: 1.8, dashed: true },
};

const coordinate = z.number().finite().min(-2000).max(4000);
const point = z.tuple([coordinate, coordinate]);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const text = z.string().max(40);

const partSchema = z.object({
  id: z.string().min(1).max(60),
  type: z.literal("part"),
  kind: z.enum(partKinds as [PartKind, ...PartKind[]]),
  x: coordinate,
  y: coordinate,
  rotation: z.number().finite().min(-360).max(360),
  scale: z.number().min(0.3).max(4),
  flip: z.boolean(),
  label: text,
  labelDx: z.number().finite().min(-400).max(400),
  labelDy: z.number().finite().min(-400).max(400),
  liquid: z.number().min(0).max(100).optional(),
  liquidColor: color.optional(),
});
const lineSchema = z.object({
  id: z.string().min(1).max(60),
  type: z.literal("line"),
  style: z.enum(lineStyles),
  points: z.array(point).min(2).max(60),
  color,
  width: z.number().min(1).max(8),
  dashed: z.boolean(),
  label: text,
  labelDx: z.number().finite().min(-400).max(400),
  labelDy: z.number().finite().min(-400).max(400),
});
const textSchema = z.object({
  id: z.string().min(1).max(60),
  type: z.literal("text"),
  x: coordinate,
  y: coordinate,
  text: z.string().min(1).max(80),
  size: z.number().min(10).max(72),
  color,
});

export const figureItemSchema = z.discriminatedUnion("type", [partSchema, lineSchema, textSchema]);
export const figureDocSchema = z.object({
  version: z.literal(1),
  title: z.string().max(80),
  items: z.array(figureItemSchema).max(400),
  options: z.object({ grid: z.boolean(), labelSize: z.number().min(12).max(40) }),
});

export type PartItem = z.infer<typeof partSchema>;
export type LineItem = z.infer<typeof lineSchema>;
export type TextItem = z.infer<typeof textSchema>;
export type FigureItem = z.infer<typeof figureItemSchema>;
export type FigureDoc = z.infer<typeof figureDocSchema>;

export function blankFigure(): FigureDoc {
  return { version: 1, title: "", items: [], options: { grid: true, labelSize: 18 } };
}

export function parseFigureDoc(value: unknown): FigureDoc | null {
  const parsed = figureDocSchema.safeParse(value);
  if (!parsed.success) return null;
  const ids = new Set(parsed.data.items.map((item) => item.id));
  return ids.size === parsed.data.items.length ? parsed.data : null;
}

export function snap(value: number, enabled = true) {
  return enabled ? Math.round(value / GRID) * GRID : Math.round(value * 10) / 10;
}

export function snapPoint([x, y]: Point, enabled = true): Point {
  return [snap(x, enabled), snap(y, enabled)];
}

export function createPart(kind: PartKind, id: string, at: Point): PartItem {
  const spec = partSpec(kind);
  return {
    id, type: "part", kind, x: at[0], y: at[1], rotation: 0, scale: 1, flip: false,
    label: spec.label ?? "", labelDx: 0, labelDy: 0,
    ...(spec.liquid !== undefined ? { liquid: spec.liquid, liquidColor: liquidColors[0].value } : {}),
  };
}

export function createLine(style: LineStyle, id: string, points: Point[]): LineItem {
  return { id, type: "line", style, points, ...lineDefaults[style], label: "", labelDx: 0, labelDy: 0 };
}

/** 부품 좌표를 그림 좌표로 바꿉니다(뒤집기 → 크기 → 회전 → 이동 순서). */
export function partToWorld(part: Pick<PartItem, "x" | "y" | "rotation" | "scale" | "flip">, [px, py]: Point): Point {
  const radians = (part.rotation * Math.PI) / 180;
  const x = (part.flip ? -px : px) * part.scale;
  const y = py * part.scale;
  return [
    Math.round((part.x + x * Math.cos(radians) - y * Math.sin(radians)) * 100) / 100,
    Math.round((part.y + x * Math.sin(radians) + y * Math.cos(radians)) * 100) / 100,
  ];
}

export function partTerminals(part: PartItem): Point[] {
  return (partSpec(part.kind).terminals ?? []).map((terminal) => partToWorld(part, terminal));
}

/** 회전한 부품을 감싸는 상자의 반쪽 너비·높이. */
export function partHalfExtent(part: Pick<PartItem, "kind" | "rotation" | "scale">) {
  const spec = partSpec(part.kind);
  const radians = (part.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    hw: ((spec.w * cos + spec.h * sin) / 2) * part.scale,
    hh: ((spec.w * sin + spec.h * cos) / 2) * part.scale,
  };
}

/** 부품 이름은 회전과 상관없이 부품 아래에 바로 서서 읽히게 둡니다. */
export function partLabelAnchor(part: PartItem, labelSize: number): Point {
  const { hh } = partHalfExtent(part);
  return [part.x + part.labelDx, part.y + hh + labelSize * 0.9 + part.labelDy];
}

/** 선의 이름 자리: 화살표는 끝 가까이, 나머지는 가장 긴 구간의 가운데. */
export function lineLabelAnchor(line: LineItem): Point {
  const points = line.points;
  let base: Point;
  if (line.style === "force" || line.style === "arrow") {
    const [from, to] = [points[points.length - 2], points[points.length - 1]];
    base = [from[0] + (to[0] - from[0]) * 0.8, from[1] + (to[1] - from[1]) * 0.8];
  } else {
    let longest = 0;
    base = points[0];
    for (let index = 1; index < points.length; index += 1) {
      const [a, b] = [points[index - 1], points[index]];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > longest) { longest = length; base = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    }
  }
  const [a, b] = line.style === "force" || line.style === "arrow" ? [points[points.length - 2], points[points.length - 1]] : [points[0], points[1]];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  // 선에서 조금 띄우되, 가로선이면 위쪽·세로선이면 오른쪽으로 둡니다(바닥 빗금과 겹치지 않게).
  let normal: Point = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
  if (normal[1] > 0.01 || (Math.abs(normal[1]) <= 0.01 && normal[0] < 0)) normal = [-normal[0], -normal[1]];
  return [base[0] + normal[0] * 16 + line.labelDx, base[1] + normal[1] * 16 + line.labelDy];
}

/** 가까운 단자에 붙이고, 없으면 격자에 맞춥니다. */
export function snapToTerminal(at: Point, items: FigureItem[], radius = 14, grid = true): { point: Point; terminal: boolean } {
  let best: Point | null = null;
  let bestDistance = radius;
  for (const item of items) {
    if (item.type !== "part") continue;
    for (const terminal of partTerminals(item)) {
      const distance = Math.hypot(terminal[0] - at[0], terminal[1] - at[1]);
      if (distance <= bestDistance) { best = terminal; bestDistance = distance; }
    }
  }
  return best ? { point: best, terminal: true } : { point: snapPoint(at, grid), terminal: false };
}

/** 도선은 가로·세로로만 꺾이게, 앞 점과 더 크게 벌어진 방향을 따릅니다. */
export function orthogonalPoint(previous: Point, next: Point): Point {
  return Math.abs(next[0] - previous[0]) >= Math.abs(next[1] - previous[1]) ? [next[0], previous[1]] : [previous[0], next[1]];
}

function onSegment(p: Point, a: Point, b: Point) {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  if (Math.abs(cross) > 0.5 * Math.hypot(b[0] - a[0], b[1] - a[1])) return false;
  const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1]);
  const lengthSquared = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  return dot > 1 && dot < lengthSquared - 1;
}

/** 도선이 갈라지는 곳(T자 연결, 세 도선 이상이 만나는 끝점)에 찍을 점. */
export function wireJunctions(items: FigureItem[]): Point[] {
  const wires = items.filter((item): item is LineItem => item.type === "line" && item.style === "wire");
  const counts = new Map<string, { point: Point; count: number }>();
  const add = (point: Point, weight: number) => {
    const key = `${Math.round(point[0])},${Math.round(point[1])}`;
    const entry = counts.get(key) ?? { point, count: 0 };
    entry.count += weight;
    counts.set(key, entry);
  };
  for (const wire of wires) {
    const ends = [wire.points[0], wire.points[wire.points.length - 1]];
    for (const end of ends) {
      add(end, 1);
      for (const other of wires) {
        for (let index = 1; index < other.points.length; index += 1) {
          if (onSegment(end, other.points[index - 1], other.points[index])) add(end, 2);
        }
      }
    }
    // 도선 가운데의 꺾인 점도 다른 도선 끝이 닿으면 갈림점입니다.
    for (const bend of wire.points.slice(1, -1)) add(bend, 2);
  }
  return [...counts.values()].filter((entry) => entry.count >= 3).map((entry) => entry.point);
}

/** 그림 전체를 감싸는 상자(이름 포함, 대략값). 내보낼 때 잘라 낼 범위를 정합니다. */
export function figureBounds(doc: FigureDoc) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const include = (x: number, y: number) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  for (const item of doc.items) {
    if (item.type === "part") {
      const { hw, hh } = partHalfExtent(item);
      include(item.x - hw, item.y - hh);
      include(item.x + hw, item.y + hh);
      if (item.label) {
        const [lx, ly] = partLabelAnchor(item, doc.options.labelSize);
        const half = (item.label.length * doc.options.labelSize) / 2;
        include(lx - half, ly - doc.options.labelSize);
        include(lx + half, ly + doc.options.labelSize * 0.3);
      }
    } else if (item.type === "line") {
      item.points.forEach(([x, y]) => include(x, y));
      if (item.label) {
        const [lx, ly] = lineLabelAnchor(item);
        const half = (item.label.length * doc.options.labelSize) / 2;
        include(lx - half, ly - doc.options.labelSize);
        include(lx + half, ly + doc.options.labelSize * 0.4);
      }
    } else {
      const half = (item.text.length * item.size) / 2;
      include(item.x - half, item.y - item.size);
      include(item.x + half, item.y + item.size * 0.4);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function moveItem(item: FigureItem, dx: number, dy: number): FigureItem {
  if (item.type === "line") return { ...item, points: item.points.map(([x, y]) => [x + dx, y + dy] as Point) };
  return { ...item, x: item.x + dx, y: item.y + dy };
}

export function searchParts(query: string) {
  const needle = query.trim().toLocaleLowerCase("ko");
  if (!needle) return partKinds;
  return partKinds.filter((kind) => {
    const spec = partSpec(kind);
    return `${spec.name} ${spec.keywords ?? ""} ${spec.group}`.toLocaleLowerCase("ko").includes(needle);
  });
}

/** 겹친 점과 한 직선 위의 가운데 점을 지웁니다(끝점은 그대로 둡니다). */
export function simplifyPath(points: Point[]): Point[] {
  const unique = points.filter((point, index) => index === 0 || Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]) >= 0.5);
  if (unique.length < 3) return unique.length >= 2 ? unique : points.slice(0, 1).concat(points.slice(-1));
  const result: Point[] = [unique[0]];
  for (let index = 1; index < unique.length - 1; index += 1) {
    const [a, b, c] = [result[result.length - 1], unique[index], unique[index + 1]];
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(cross) > 0.5) result.push(b);
  }
  result.push(unique[unique.length - 1]);
  return result;
}

export type WireAttachment = { lineId: string; end: "start" | "end"; terminal: number };

/** 부품 단자에 끝이 닿아 있는 도선들. 부품을 옮기거나 돌릴 때 함께 따라가게 합니다. */
export function attachedWires(items: FigureItem[], part: PartItem): WireAttachment[] {
  const terminals = partTerminals(part);
  const found: WireAttachment[] = [];
  for (const item of items) {
    if (item.type !== "line" || item.style !== "wire") continue;
    const ends: ["start" | "end", Point][] = [["start", item.points[0]], ["end", item.points[item.points.length - 1]]];
    for (const [end, point] of ends) {
      const terminal = terminals.findIndex((candidate) => Math.hypot(candidate[0] - point[0], candidate[1] - point[1]) < 1);
      if (terminal >= 0) found.push({ lineId: item.id, end, terminal });
    }
  }
  return found;
}

/**
 * 바뀐 부품의 단자 위치로 붙어 있던 도선 끝을 옮깁니다. 끝 바로 옆 꺾인 점도 같이 옮겨
 * 가로·세로 도선이 비스듬해지지 않게 합니다(양 끝만 있는 도선은 끝만 옮깁니다).
 */
export function followPart(items: FigureItem[], after: PartItem, attachments: WireAttachment[]): FigureItem[] {
  if (!attachments.length) return items.map((item) => item.id === after.id ? after : item);
  const terminals = partTerminals(after);
  return items.map((item) => {
    if (item.id === after.id) return after;
    if (item.type !== "line") return item;
    const mine = attachments.filter((attachment) => attachment.lineId === item.id);
    if (!mine.length) return item;
    // 양 끝만 있는 가로·세로 도선은 가운데에서 두 번 꺾어 반듯한 모양을 유지합니다.
    if (item.points.length === 2 && mine.length === 1 && terminals[mine[0].terminal]) {
      const target = terminals[mine[0].terminal];
      const [start, end] = item.points;
      const fixed = mine[0].end === "start" ? end : start;
      const horizontal = Math.abs(start[1] - end[1]) < 0.5;
      const vertical = Math.abs(start[0] - end[0]) < 0.5;
      const bent = (horizontal && Math.abs(target[1] - fixed[1]) >= 0.5) || (vertical && Math.abs(target[0] - fixed[0]) >= 0.5);
      if (bent) {
        const middle = horizontal ? snap((fixed[0] + target[0]) / 2) : snap((fixed[1] + target[1]) / 2);
        const path: Point[] = horizontal
          ? [fixed, [middle, fixed[1]], [middle, target[1]], target]
          : [fixed, [fixed[0], middle], [target[0], middle], target];
        return { ...item, points: simplifyPath(mine[0].end === "start" ? path.reverse() : path) };
      }
    }
    const points = item.points.map((point) => [...point] as Point);
    for (const attachment of mine) {
      const index = attachment.end === "start" ? 0 : points.length - 1;
      const neighbor = attachment.end === "start" ? 1 : points.length - 2;
      const target = terminals[attachment.terminal];
      if (!target) continue;
      const before = points[index];
      if (points.length >= 3) {
        const next = points[neighbor];
        if (Math.abs(next[0] - before[0]) < 0.5) next[0] = target[0];
        else if (Math.abs(next[1] - before[1]) < 0.5) next[1] = target[1];
      }
      points[index] = target;
    }
    return { ...item, points: simplifyPath(points) };
  });
}

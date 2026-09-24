import { z } from "zod";

/** [경도, 위도] 순서의 좌표입니다. */
export type LonLat = [number, number];
export type ProjectionKind = "mercator" | "naturalEarth" | "globe";
export type Tool = "move" | "paint" | "text" | "marker" | "arrow" | "line" | "area" | "measure";
export type MarkerSymbol = "dot" | "star" | "square" | "triangle";
export type CountryNameMode = "auto" | "all" | "filled" | "none";
export type MapTheme = "color" | "print";

export type TextNote = { id: string; kind: "text"; at: LonLat; text: string; size: number; color: number; bold: boolean };
export type MarkerNote = { id: string; kind: "marker"; at: LonLat; label: string; symbol: MarkerSymbol; color: number; size: number };
export type PathNote = { id: string; kind: "arrow" | "line"; points: LonLat[]; label: string; color: number; width: number; dashed: boolean; curved: boolean; size: number };
export type AreaNote = { id: string; kind: "area"; points: LonLat[]; label: string; color: number; size: number };
export type MeasureNote = { id: string; kind: "measure"; points: LonLat[]; color: number; size: number };
export type Annotation = TextNote | MarkerNote | PathNote | AreaNote | MeasureNote;

/** 나라(시대 지도에서는 'h:원래 이름' 열쇠의 옛 나라)마다 선생님이 바꾼 모양입니다. */
export type CountryStyle = { fill?: number; name?: string; hideName?: boolean; hideShape?: boolean; at?: LonLat };
export type MapView = { center: LonLat; scale: number };
export type MapOptions = {
  theme: MapTheme;
  borders: boolean;
  countryNames: CountryNameMode;
  textScale: number;
  placeNames: boolean;
  graticule: boolean;
  coordLabels: boolean;
  specialLines: boolean;
  legend: boolean;
};
export type MapDoc = {
  version: 1;
  title: string;
  projection: ProjectionKind;
  meridian: number;
  /** 시대 지도(history.ts의 id)입니다. null이면 오늘날의 국경을 보여 줘요. */
  era: string | null;
  view: MapView;
  countries: Record<string, CountryStyle>;
  legend: Record<string, string>;
  annotations: Annotation[];
  options: MapOptions;
};

/** 지도 그림(SVG) 좌표계 크기입니다. 16:10 화면(전자칠판·빔프로젝터)에 맞춥니다. */
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1000;
export const MIN_SCALE = 170;
export const MAX_SCALE = 90000;
/** 이 배율(1라디안당 화면 px)부터 자세한 해안선(1:1천만) 자료로 바꿉니다. */
export const DETAIL_SCALE = 2200;

/** 같은 번호의 색은 나라 색칠(연한 색)과 선·글자(진한 색)에 함께 쓰이고, 범례 이름도 공유합니다. */
export const palette = [
  { name: "빨강", fill: "#f4a3a0", ink: "#d23c3c" },
  { name: "주황", fill: "#fcc58a", ink: "#d8701a" },
  { name: "노랑", fill: "#fbe38e", ink: "#a57f00" },
  { name: "초록", fill: "#a9dcae", ink: "#2d8a4a" },
  { name: "파랑", fill: "#9fcdf2", ink: "#1f63c2" },
  { name: "보라", fill: "#c3b5f1", ink: "#6746c4" },
  { name: "분홍", fill: "#f5b3d2", ink: "#c2387f" },
  { name: "갈색", fill: "#d5bf9f", ink: "#86592d" },
  { name: "검정", fill: "#c4c7cc", ink: "#2c2f36" },
] as const;

export const projectionNames: Record<ProjectionKind, string> = { mercator: "메르카토르", naturalEarth: "세계 전도", globe: "지구본" };
export const projectionHelp: Record<ProjectionKind, string> = {
  mercator: "경선과 위선이 곧게 만나는 지도예요. 나라·지역을 크게 볼 때 알맞고, 고위도로 갈수록 실제보다 넓게 보여요.",
  naturalEarth: "세계 전체를 한눈에 보기 좋게 넓이와 모양을 고르게 줄인 지도예요. 세계사·세계 지리 수업에 알맞아요.",
  globe: "둥근 지구를 우주에서 본 모양이에요. 끌어서 돌리며 대륙과 바다의 실제 배치를 보여 줄 때 좋아요.",
};

export type Preset = { id: string; name: string; group: "우리나라" | "아시아" | "세계"; bounds: [LonLat, LonLat]; projection: ProjectionKind; meridian: number };
export const presets: Preset[] = [
  { id: "korea", name: "한반도", group: "우리나라", bounds: [[123.6, 33], [132.4, 43.1]], projection: "mercator", meridian: 130 },
  { id: "korea-south", name: "남한", group: "우리나라", bounds: [[125.6, 33.0], [131.95, 38.7]], projection: "mercator", meridian: 130 },
  { id: "east-asia", name: "동아시아", group: "아시아", bounds: [[97, 18], [148, 53]], projection: "mercator", meridian: 120 },
  { id: "southeast-asia", name: "동남아시아", group: "아시아", bounds: [[91, -11], [141, 24]], projection: "mercator", meridian: 120 },
  { id: "south-asia", name: "남부·중앙아시아", group: "아시아", bounds: [[48, 5], [98, 50]], projection: "mercator", meridian: 70 },
  { id: "west-asia", name: "서남아시아·북부 아프리카", group: "아시아", bounds: [[-10, 12], [65, 44]], projection: "mercator", meridian: 30 },
  { id: "world-pacific", name: "세계 (태평양 중심)", group: "세계", bounds: [[-180, -58], [180, 82]], projection: "naturalEarth", meridian: 150 },
  { id: "world-atlantic", name: "세계 (대서양 중심)", group: "세계", bounds: [[-180, -58], [180, 82]], projection: "naturalEarth", meridian: 0 },
  { id: "europe", name: "유럽", group: "세계", bounds: [[-24, 35], [45, 71]], projection: "mercator", meridian: 10 },
  { id: "mediterranean", name: "지중해", group: "세계", bounds: [[-10, 29], [42, 47]], projection: "mercator", meridian: 20 },
  { id: "africa", name: "아프리카", group: "세계", bounds: [[-19, -35], [52, 37]], projection: "mercator", meridian: 20 },
  { id: "north-america", name: "북아메리카", group: "세계", bounds: [[-168, 12], [-52, 72]], projection: "mercator", meridian: -100 },
  { id: "latin-america", name: "중·남아메리카", group: "세계", bounds: [[-118, -56], [-33, 30]], projection: "mercator", meridian: -70 },
  { id: "oceania", name: "오세아니아", group: "세계", bounds: [[110, -48], [180, 2]], projection: "mercator", meridian: 150 },
];

/**
 * 바다·섬 이름입니다. minScale보다 크게 볼 때, maxScale보다 작게 볼 때만 보여서 한 화면에 알맞은 이름만 남깁니다.
 * tier는 글자 크기(1: 대양, 2: 바다, 3: 작은 바다·섬)입니다.
 */
export type PlaceName = { name: string; at: LonLat; tier: 1 | 2 | 3; minScale: number; maxScale?: number; island?: boolean };
export const placeNames: PlaceName[] = [
  { name: "태 평 양", at: [-150, 8], tier: 1, minScale: 0, maxScale: 2400 },
  { name: "태 평 양", at: [165, 20], tier: 1, minScale: 0, maxScale: 2400 },
  { name: "대 서 양", at: [-38, 28], tier: 1, minScale: 0, maxScale: 2400 },
  { name: "대 서 양", at: [-18, -22], tier: 1, minScale: 0, maxScale: 2400 },
  { name: "인 도 양", at: [78, -22], tier: 1, minScale: 0, maxScale: 2400 },
  { name: "북 극 해", at: [60, 79], tier: 1, minScale: 0, maxScale: 2400 },
  { name: "남 극 해", at: [60, -60], tier: 1, minScale: 0, maxScale: 2400 },
  { name: "동해", at: [131.6, 39.4], tier: 2, minScale: 380 },
  { name: "황해", at: [123.9, 36.4], tier: 2, minScale: 380 },
  { name: "남해", at: [128.2, 34.05], tier: 3, minScale: 1400 },
  { name: "동중국해", at: [125.5, 29.3], tier: 2, minScale: 700 },
  { name: "남중국해", at: [114, 13.5], tier: 2, minScale: 450 },
  { name: "오호츠크해", at: [149, 54], tier: 2, minScale: 450 },
  { name: "필리핀해", at: [133, 18], tier: 2, minScale: 700 },
  { name: "베링해", at: [-177, 58], tier: 2, minScale: 500 },
  { name: "지중해", at: [18, 34.6], tier: 2, minScale: 450 },
  { name: "흑해", at: [34.5, 43.3], tier: 2, minScale: 600 },
  { name: "카스피해", at: [50.8, 41.8], tier: 3, minScale: 700 },
  { name: "홍해", at: [38.6, 20], tier: 3, minScale: 700 },
  { name: "페르시아만", at: [51.5, 27.2], tier: 3, minScale: 900 },
  { name: "아라비아해", at: [64, 15], tier: 2, minScale: 500 },
  { name: "벵골만", at: [89, 15], tier: 2, minScale: 500 },
  { name: "북해", at: [3, 56.3], tier: 3, minScale: 700 },
  { name: "발트해", at: [19.5, 57.5], tier: 3, minScale: 800 },
  { name: "카리브해", at: [-75, 15], tier: 2, minScale: 500 },
  { name: "멕시코만", at: [-90, 25.3], tier: 2, minScale: 500 },
  { name: "태즈먼해", at: [160, -38], tier: 2, minScale: 500 },
  { name: "제주도", at: [126.55, 33.38], tier: 3, minScale: 3000 },
  { name: "울릉도", at: [130.87, 37.5], tier: 3, minScale: 2600, island: true },
  { name: "독도", at: [131.869, 37.242], tier: 3, minScale: 2600, island: true },
];

/** 적도·회귀선·극권(위도)과 본초 자오선(경도)입니다. */
export const specialParallels = [
  { name: "적도", lat: 0 },
  { name: "북회귀선", lat: 23.44 },
  { name: "남회귀선", lat: -23.44 },
  { name: "북극권", lat: 66.56 },
  { name: "남극권", lat: -66.56 },
] as const;

export const defaultOptions: MapOptions = {
  theme: "color", borders: true, countryNames: "auto", textScale: 100, placeNames: true,
  graticule: false, coordLabels: false, specialLines: false, legend: true,
};

let idCounter = 0;
export const newId = () => `n${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/* ───────────── 좌표·거리 ───────────── */

const round = (value: number, digits = 1) => Number(value.toFixed(digits));
export const formatLat = (lat: number) => Math.abs(lat) < 0.05 ? "0°" : `${lat > 0 ? "북위" : "남위"} ${round(Math.abs(lat))}°`;
export const formatLon = (lon: number) => {
  const value = ((lon + 540) % 360) - 180;
  if (Math.abs(value) < 0.05 || Math.abs(Math.abs(value) - 180) < 0.05) return `${round(Math.abs(value), 0)}°`;
  return `${value > 0 ? "동경" : "서경"} ${round(Math.abs(value))}°`;
};
/** 경위선 눈금 글자(예: 120°E, 30°N)입니다. */
export const tickLabel = (value: number, axis: "lon" | "lat") => {
  const normalized = axis === "lon" ? ((value + 540) % 360) - 180 : value;
  const abs = Math.round(Math.abs(normalized) * 100) / 100;
  if (abs === 0 || (axis === "lon" && abs === 180)) return `${abs}°`;
  return `${abs}°${axis === "lon" ? (normalized > 0 ? "E" : "W") : (normalized > 0 ? "N" : "S")}`;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (degree: number) => degree * Math.PI / 180;
/** 두 지점 사이의 대권(가장 짧은 길) 거리(km)입니다. */
export function distanceKm(a: LonLat, b: LonLat) {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
export const formatDistance = (km: number) => km >= 100 ? `약 ${(Math.round(km / 10) * 10).toLocaleString("ko-KR")}km` : `약 ${round(km, km < 10 ? 1 : 0)}km`;

/** 경도를 기준 경선(meridian) 기준 -180~180 사이로 옮깁니다. */
export const relativeLon = (lon: number, meridian: number) => ((lon - meridian + 540) % 360) - 180;

/**
 * 평면 지도에서 선이 지도 가장자리(기준 경선의 반대편)를 넘어가면 두 조각으로 나눕니다.
 * 나누지 않으면 태평양을 건너는 선이 지도 전체를 가로질러 거꾸로 그려집니다.
 */
export function splitAtSeam(points: LonLat[], meridian: number): LonLat[][] {
  const parts: LonLat[][] = [];
  let current: LonLat[] = [];
  const edge = 179.999;
  points.forEach((point, index) => {
    if (index === 0) { current.push(point); return; }
    const prev = points[index - 1];
    const a = relativeLon(prev[0], meridian);
    let b = relativeLon(point[0], meridian);
    if (Math.abs(b - a) > 180) {
      b += b < a ? 360 : -360;
      const side = b > a ? edge : -edge;
      const t = (side - a) / (b - a);
      const lat = prev[1] + (point[1] - prev[1]) * t;
      current.push([side + meridian, lat]);
      parts.push(current);
      current = [[-side + meridian, lat]];
    }
    current.push(point);
  });
  parts.push(current);
  return parts.filter(part => part.length > 1);
}

/* ───────────── 화면 위 선 모양 ───────────── */

type Point = [number, number];
const fmt = (value: number) => Math.round(value * 10) / 10;
/** 점들을 부드러운 곡선(캣멀-롬)으로 잇습니다. 점이 둘이면 살짝 휘어진 곡선을 그립니다. */
export function curvePath(points: Point[], curved: boolean): { d: string; tail: Point } {
  if (points.length < 2) return { d: "", tail: points[0] ?? [0, 0] };
  if (!curved) return { d: `M${points.map(point => `${fmt(point[0])},${fmt(point[1])}`).join("L")}`, tail: points[points.length - 2] };
  if (points.length === 2) {
    const [a, b] = points;
    const control: Point = [(a[0] + b[0]) / 2 - (b[1] - a[1]) * 0.18, (a[1] + b[1]) / 2 + (b[0] - a[0]) * 0.18];
    return { d: `M${fmt(a[0])},${fmt(a[1])}Q${fmt(control[0])},${fmt(control[1])} ${fmt(b[0])},${fmt(b[1])}`, tail: control };
  }
  let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
  let tail: Point = points[0];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(p2[0])},${fmt(p2[1])}`;
    tail = c2;
  }
  return { d, tail };
}

/** from에서 to 방향을 향한 화살촉(삼각형) 꼭짓점입니다. */
export function arrowHead(from: Point, to: Point, size: number) {
  let dx = to[0] - from[0];
  let dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  dx /= length; dy /= length;
  const back: Point = [to[0] - dx * size, to[1] - dy * size];
  const half = size * 0.55;
  return `${fmt(to[0])},${fmt(to[1])} ${fmt(back[0] - dy * half)},${fmt(back[1] + dx * half)} ${fmt(back[0] + dy * half)},${fmt(back[1] - dx * half)}`;
}

export function starPoints(cx: number, cy: number, radius: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    return `${fmt(cx + Math.cos(angle) * r)},${fmt(cy + Math.sin(angle) * r)}`;
  }).join(" ");
}

/* ───────────── 파일 불러오기 검사 ───────────── */

const lonLat = z.tuple([z.number().min(-540).max(540), z.number().min(-90).max(90)]);
const colorIndex = z.number().int().min(0).max(palette.length - 1);
const text = (max: number) => z.string().max(max);
const annotationSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().max(40), kind: z.literal("text"), at: lonLat, text: text(200), size: z.number().min(8).max(120), color: colorIndex, bold: z.boolean().catch(true) }),
  z.object({ id: z.string().max(40), kind: z.literal("marker"), at: lonLat, label: text(80), symbol: z.enum(["dot", "star", "square", "triangle"]), color: colorIndex, size: z.number().min(8).max(120) }),
  z.object({ id: z.string().max(40), kind: z.enum(["arrow", "line"]), points: z.array(lonLat).min(2).max(200), label: text(80), color: colorIndex, width: z.number().min(1).max(20), dashed: z.boolean(), curved: z.boolean(), size: z.number().min(8).max(120) }),
  z.object({ id: z.string().max(40), kind: z.literal("area"), points: z.array(lonLat).min(3).max(300), label: text(80), color: colorIndex, size: z.number().min(8).max(120) }),
  z.object({ id: z.string().max(40), kind: z.literal("measure"), points: z.array(lonLat).length(2), color: colorIndex, size: z.number().min(8).max(120) }),
]);
const docSchema = z.object({
  version: z.literal(1),
  title: text(80).catch(""),
  projection: z.enum(["mercator", "naturalEarth", "globe"]).catch("mercator"),
  meridian: z.number().min(-180).max(180).catch(0),
  view: z.object({ center: lonLat, scale: z.number().min(0).max(MAX_SCALE) }),
  era: z.string().max(20).nullable().catch(null),
  countries: z.record(z.string().max(120), z.object({ fill: colorIndex.optional(), name: text(60).optional(), hideName: z.boolean().optional(), hideShape: z.boolean().optional(), at: lonLat.optional() })).catch({}),
  legend: z.record(z.string().max(4), text(40)).catch({}),
  annotations: z.array(annotationSchema).max(500),
  options: z.object({
    theme: z.enum(["color", "print"]).catch("color"),
    borders: z.boolean().catch(true),
    countryNames: z.enum(["auto", "all", "filled", "none"]).catch("auto"),
    textScale: z.number().min(50).max(250).catch(100),
    placeNames: z.boolean().catch(true),
    graticule: z.boolean().catch(false),
    coordLabels: z.boolean().catch(false),
    specialLines: z.boolean().catch(false),
    legend: z.boolean().catch(true),
  }).catch(defaultOptions),
});

/** 저장해 둔 초안이나 불러온 파일을 검사합니다. 형식이 맞지 않으면 null을 돌려줍니다. */
export function parseMapDoc(raw: unknown): MapDoc | null {
  const result = docSchema.safeParse(raw);
  return result.success ? result.data as MapDoc : null;
}

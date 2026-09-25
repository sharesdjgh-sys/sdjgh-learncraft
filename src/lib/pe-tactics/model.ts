import { z } from "zod";

/* 체육 전술 보드의 문서 형식과 계산입니다.
   위치는 모두 경기장 기준 미터 좌표(왼쪽 위가 0,0)로 저장해 전체·반쪽 보기를 바꿔도 그대로입니다.
   선수·공·콘은 단계마다 위치가 있고, 화살표는 단계마다 따로 그립니다. */

export type Point = [number, number];

export const courtKinds = ["soccer", "futsal", "basketball", "volleyball", "badminton", "handball", "dodgeball", "teeball", "floor"] as const;
export type CourtKind = (typeof courtKinds)[number];

export const courtInfo: Record<CourtKind, { name: string; w: number; h: number; margin: number; halfable: boolean; surface: "grass" | "indoor" | "floor"; ball: string; size: string }> = {
  soccer: { name: "축구", w: 105, h: 68, margin: 4, halfable: true, surface: "grass", ball: "#ffffff", size: "105 × 68 m" },
  futsal: { name: "풋살", w: 40, h: 20, margin: 2, halfable: true, surface: "indoor", ball: "#ffffff", size: "40 × 20 m" },
  basketball: { name: "농구", w: 28, h: 15, margin: 1.5, halfable: true, surface: "indoor", ball: "#f76707", size: "28 × 15 m (FIBA)" },
  volleyball: { name: "배구", w: 18, h: 9, margin: 2.5, halfable: false, surface: "indoor", ball: "#ffd43b", size: "18 × 9 m" },
  badminton: { name: "배드민턴", w: 13.4, h: 6.1, margin: 1.2, halfable: false, surface: "indoor", ball: "#ffffff", size: "13.4 × 6.1 m" },
  handball: { name: "핸드볼", w: 40, h: 20, margin: 2, halfable: true, surface: "indoor", ball: "#ffffff", size: "40 × 20 m" },
  dodgeball: { name: "피구", w: 20, h: 10, margin: 3, halfable: false, surface: "indoor", ball: "#ffffff", size: "20 × 10 m" },
  teeball: { name: "티볼", w: 70, h: 60, margin: 2, halfable: false, surface: "grass", ball: "#ffffff", size: "누 사이 18 m" },
  floor: { name: "무대 (표현 활동)", w: 12, h: 8, margin: 1.2, halfable: false, surface: "floor", ball: "#ffffff", size: "12 × 8 m" },
};

export const teamColors = [
  { name: "빨강", value: "#e03131", text: "#ffffff" },
  { name: "노랑", value: "#fab005", text: "#212529" },
  { name: "파랑", value: "#1c7ed6", text: "#ffffff" },
  { name: "초록", value: "#2f9e44", text: "#ffffff" },
  { name: "주황", value: "#f76707", text: "#ffffff" },
  { name: "보라", value: "#7048e8", text: "#ffffff" },
  { name: "검정", value: "#212529", text: "#ffffff" },
  { name: "흰색", value: "#ffffff", text: "#212529" },
] as const;
export const textOn = (color: string) => teamColors.find((item) => item.value === color)?.text ?? "#ffffff";

export const arrowStyles = ["run", "pass", "dribble", "shot", "screen"] as const;
export type ArrowStyle = (typeof arrowStyles)[number];
export const arrowInfo: Record<ArrowStyle, { name: string; help: string; key: string }> = {
  run: { name: "이동", help: "선수가 달려가는 길 (실선 화살표)", key: "R" },
  pass: { name: "패스", help: "공이 가는 길 (점선 화살표)", key: "P" },
  dribble: { name: "드리블", help: "공을 몰고 가는 길 (물결 화살표)", key: "D" },
  shot: { name: "슛", help: "골대·목표로 차거나 던지는 공 (굵은 화살표)", key: "S" },
  screen: { name: "스크린", help: "상대를 막아 서는 자리 (끝이 T자인 선)", key: "X" },
};

const point = z.tuple([z.number().min(-200).max(200), z.number().min(-200).max(200)]);
const itemSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(["player", "ball", "cone", "text"]),
  team: z.enum(["A", "B"]).optional(),
  label: z.string().max(24),
});
const arrowSchema = z.object({ id: z.string().min(1).max(40), style: z.enum(arrowStyles), from: point, to: point, bend: z.number().min(-60).max(60) });
const frameSchema = z.object({ id: z.string().min(1).max(40), note: z.string().max(200), pos: z.record(z.string(), point), arrows: z.array(arrowSchema).max(80) });
const teamSchema = z.object({ name: z.string().max(12), color: z.string().regex(/^#[0-9a-f]{6}$/i) });

export const tacticsDocSchema = z.object({
  version: z.literal(1),
  title: z.string().max(80),
  court: z.enum(courtKinds),
  half: z.boolean(),
  print: z.boolean(),
  playerSize: z.number().min(10).max(30),
  teams: z.object({ A: teamSchema, B: teamSchema }),
  items: z.array(itemSchema).max(60),
  frames: z.array(frameSchema).min(1).max(12),
});
export type TacticsDoc = z.infer<typeof tacticsDocSchema>;
export type TacticsItem = z.infer<typeof itemSchema>;
export type TacticsArrow = z.infer<typeof arrowSchema>;
export type TacticsFrame = z.infer<typeof frameSchema>;
export type Team = "A" | "B";

export const MAX_ITEMS = 60;
export const MAX_FRAMES = 12;

export function parseTacticsDoc(value: unknown): TacticsDoc | null {
  const parsed = tacticsDocSchema.safeParse(value);
  if (!parsed.success) return null;
  const doc = parsed.data;
  // 없는 선수의 위치는 버리고, 단계마다 모든 선수 위치가 있도록 채웁니다.
  return normalizeFrames(doc);
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function blankTactics(court: CourtKind = "soccer"): TacticsDoc {
  return {
    version: 1,
    title: "",
    court,
    half: false,
    print: false,
    playerSize: 16,
    teams: { A: { name: "우리 팀", color: teamColors[0].value }, B: { name: "상대 팀", color: teamColors[1].value } },
    items: [],
    frames: [{ id: "f1", note: "", pos: {}, arrows: [] }],
  };
}

export function normalizeFrames(doc: TacticsDoc): TacticsDoc {
  const ids = new Set(doc.items.map((item) => item.id));
  let previous: Record<string, Point> = {};
  const frames = doc.frames.map((frame) => {
    const pos: Record<string, Point> = {};
    for (const item of doc.items) pos[item.id] = frame.pos[item.id] ?? previous[item.id] ?? courtCenter(doc.court);
    for (const key of Object.keys(frame.pos)) if (!ids.has(key)) delete pos[key];
    previous = pos;
    return { ...frame, pos };
  });
  return { ...doc, frames };
}

export const courtCenter = (court: CourtKind): Point => [courtInfo[court].w / 2, courtInfo[court].h / 2];

/** 화면에 보이는 범위(미터). 반쪽 보기는 왼쪽 절반(왼쪽 골대·바스켓)만 보여 줍니다. */
export function viewBox(court: CourtKind, half: boolean) {
  const info = courtInfo[court];
  const w = half && info.halfable ? info.w / 2 : info.w;
  return { x: -info.margin, y: -info.margin, w: w + info.margin * (half && info.halfable ? 1.4 : 2), h: info.h + info.margin * 2 };
}

/** 보기 가로를 1000px로 맞춘 배율(미터당 px). */
export const pixelsPerMeter = (court: CourtKind, half: boolean) => 1000 / viewBox(court, half).w;

/** 선수를 누르거나 화살표 시작점을 선수에 붙일 때 쓰는 반경(미터). */
export const hitRadius = (doc: Pick<TacticsDoc, "court" | "half" | "playerSize">) => (doc.playerSize * 1.25) / pixelsPerMeter(doc.court, doc.half);

/* ───── 선수 ───── */

export function nextPlayerLabel(doc: TacticsDoc, team: Team) {
  const used = new Set(doc.items.filter((item) => item.kind === "player" && item.team === team).map((item) => item.label));
  for (let number = 1; number < 100; number += 1) if (!used.has(String(number))) return String(number);
  return "";
}

/** 새 항목을 넣으면 모든 단계에 같은 자리로 들어갑니다. */
export function addItem(doc: TacticsDoc, item: TacticsItem, at: Point): TacticsDoc {
  if (doc.items.length >= MAX_ITEMS) return doc;
  return { ...doc, items: [...doc.items, item], frames: doc.frames.map((frame) => ({ ...frame, pos: { ...frame.pos, [item.id]: at } })) };
}

export function removeItem(doc: TacticsDoc, id: string): TacticsDoc {
  return {
    ...doc,
    items: doc.items.filter((item) => item.id !== id),
    frames: doc.frames.map((frame) => { const pos = { ...frame.pos }; delete pos[id]; return { ...frame, pos }; }),
  };
}

/** 한 단계에서 옮긴 자리를 뒤 단계에도 이어 줍니다(뒤 단계에서 따로 옮긴 적이 없는 경우만). */
export function moveItem(doc: TacticsDoc, frameIndex: number, id: string, to: Point): TacticsDoc {
  const before = doc.frames[frameIndex].pos[id];
  return {
    ...doc,
    frames: doc.frames.map((frame, index) => {
      if (index < frameIndex) return frame;
      if (index > frameIndex) {
        const current = frame.pos[id];
        if (!before || !current || Math.hypot(current[0] - before[0], current[1] - before[1]) > 1e-6) return frame;
      }
      return { ...frame, pos: { ...frame.pos, [id]: to } };
    }),
  };
}

/* ───── 화살표와 다음 단계 ───── */

/** 곡선 화살표의 조절점: 양 끝 가운데에서 수직 방향으로 bend만큼. */
export function controlPoint(arrow: Pick<TacticsArrow, "from" | "to" | "bend">): Point {
  const [x1, y1] = arrow.from;
  const [x2, y2] = arrow.to;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  return [(x1 + x2) / 2 - ((y2 - y1) / length) * arrow.bend, (y1 + y2) / 2 + ((x2 - x1) / length) * arrow.bend];
}

/** 화살표 위의 점(t: 0~1)과 접선 방향. */
export function arrowPoint(arrow: Pick<TacticsArrow, "from" | "to" | "bend">, t: number): { at: Point; dir: Point } {
  const c = controlPoint(arrow);
  const [a, b] = [arrow.from, arrow.to];
  const at: Point = [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1]];
  const dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
  const dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
  const length = Math.hypot(dx, dy) || 1;
  return { at, dir: [dx / length, dy / length] };
}

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** 화살표 시작점에서 가장 가까운 항목(반경 안). 선수·공 순으로 찾습니다. */
export function itemAt(doc: TacticsDoc, frame: TacticsFrame, at: Point, radius: number, kinds: TacticsItem["kind"][] = ["player", "ball"]) {
  let best: { item: TacticsItem; d: number } | null = null;
  for (const item of doc.items) {
    if (!kinds.includes(item.kind)) continue;
    const pos = frame.pos[item.id];
    if (!pos) continue;
    const d = distance(pos, at);
    if (d <= radius && (!best || d < best.d)) best = { item, d };
  }
  return best?.item ?? null;
}

/**
 * 지금 단계의 화살표대로 움직인 다음 단계 위치를 만듭니다.
 * 이동·드리블·스크린은 시작점의 선수가 끝점으로, 패스·슛은 시작점 가까운 공이 끝점으로 갑니다.
 * 드리블은 선수 곁의 공도 함께 옮깁니다.
 */
export function positionsAfterArrows(doc: TacticsDoc, frame: TacticsFrame, radius: number): Record<string, Point> {
  const pos: Record<string, Point> = { ...frame.pos };
  const ball = doc.items.find((item) => item.kind === "ball");
  for (const arrow of frame.arrows) {
    if (arrow.style === "pass" || arrow.style === "shot") {
      const target = itemAt(doc, frame, arrow.from, radius, ["ball"]) ?? (ball && frame.pos[ball.id] && itemAt(doc, frame, arrow.from, radius, ["player"]) ? ball : null);
      if (target) pos[target.id] = arrow.to;
      continue;
    }
    const player = itemAt(doc, frame, arrow.from, radius, ["player"]);
    if (!player) continue;
    pos[player.id] = arrow.to;
    if (arrow.style === "dribble" && ball && frame.pos[ball.id] && distance(frame.pos[ball.id], frame.pos[player.id]) <= radius * 1.6) {
      const offset: Point = [frame.pos[ball.id][0] - frame.pos[player.id][0], frame.pos[ball.id][1] - frame.pos[player.id][1]];
      pos[ball.id] = [arrow.to[0] + offset[0], arrow.to[1] + offset[1]];
    }
  }
  return pos;
}

export function addFrame(doc: TacticsDoc, afterIndex: number, fromArrows: boolean, radius: number): TacticsDoc {
  if (doc.frames.length >= MAX_FRAMES) return doc;
  const base = doc.frames[afterIndex];
  const frame: TacticsFrame = { id: newId("f"), note: "", pos: fromArrows ? positionsAfterArrows(doc, base, radius) : { ...base.pos }, arrows: [] };
  const frames = [...doc.frames];
  frames.splice(afterIndex + 1, 0, frame);
  return { ...doc, frames };
}

export function removeFrame(doc: TacticsDoc, index: number): TacticsDoc {
  if (doc.frames.length <= 1) return doc;
  return { ...doc, frames: doc.frames.filter((_, at) => at !== index) };
}

export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** 두 단계 사이의 위치(t: 0~1). 재생 애니메이션에 씁니다. */
export function interpolate(from: Record<string, Point>, to: Record<string, Point>, t: number): Record<string, Point> {
  const k = ease(Math.max(0, Math.min(1, t)));
  const out: Record<string, Point> = {};
  for (const [id, a] of Object.entries(from)) {
    const b = to[id] ?? a;
    out[id] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }
  return out;
}

/* ───── 대형 ───── */

type Formation = { id: string; name: string; court: CourtKind; points: Point[]; labels?: string[]; half?: boolean };

const circle = (cx: number, cy: number, r: number, n: number, start = -90): Point[] => Array.from({ length: n }, (_, index) => {
  const angle = ((start + (index * 360) / n) * Math.PI) / 180;
  return [round(cx + Math.cos(angle) * r), round(cy + Math.sin(angle) * r)];
});
const round = (value: number) => Math.round(value * 100) / 100;

/** 대형은 왼쪽 끝(왼쪽 골대·바스켓·코트) 기준 좌표입니다. B팀에 쓰면 전체 보기에서는 좌우를 뒤집습니다. */
export const formations: Formation[] = [
  { id: "soccer-442", name: "4-4-2", court: "soccer", points: [[4, 34], [18, 10], [18, 26], [18, 42], [18, 58], [33, 10], [33, 26], [33, 42], [33, 58], [46, 26], [46, 42]] },
  { id: "soccer-433", name: "4-3-3", court: "soccer", points: [[4, 34], [18, 10], [18, 26], [18, 42], [18, 58], [32, 20], [32, 34], [32, 48], [46, 12], [46, 34], [46, 56]] },
  { id: "soccer-352", name: "3-5-2", court: "soccer", points: [[4, 34], [18, 18], [18, 34], [18, 50], [32, 8], [32, 22], [32, 34], [32, 46], [32, 60], [46, 26], [46, 42]] },
  { id: "futsal-121", name: "1-2-1 (다이아몬드)", court: "futsal", points: [[1.5, 10], [8, 10], [13, 4], [13, 16], [18, 10]] },
  { id: "futsal-22", name: "2-2 (상자)", court: "futsal", points: [[1.5, 10], [8, 6], [8, 14], [16, 6], [16, 14]] },
  { id: "basketball-122", name: "공격 1-2-2", court: "basketball", points: [[8.8, 7.5], [6.8, 3], [6.8, 12], [2.4, 5.2], [2.4, 9.8]] },
  { id: "basketball-5out", name: "공격 5아웃", court: "basketball", points: [[8.9, 7.5], [7, 2.4], [7, 12.6], [1.4, 1.3], [1.4, 13.7]] },
  { id: "basketball-23", name: "2-3 지역 방어", court: "basketball", points: [[6.2, 5.4], [6.2, 9.6], [2.3, 2.8], [2.3, 12.2], [1.9, 7.5]] },
  { id: "basketball-man", name: "대인 방어", court: "basketball", points: [[7.8, 7.5], [6, 3.6], [6, 11.4], [2.2, 6], [2.2, 9]] },
  { id: "volleyball-base", name: "기본 위치 (1~6번 자리)", court: "volleyball", points: [[2.5, 7], [7, 7], [7, 4.5], [7, 2], [2.5, 2], [2.5, 4.5]], labels: ["1", "2", "3", "4", "5", "6"] },
  { id: "volleyball-w", name: "서브 리시브 W", court: "volleyball", points: [[2, 7.4], [6, 7.2], [4.2, 4.5], [6, 1.8], [2, 1.6], [8.3, 5.6]], labels: ["1", "2", "3", "4", "5", "6"] },
  { id: "badminton-attack", name: "복식 공격 (앞뒤)", court: "badminton", points: [[5.2, 3.05], [2, 3.05]] },
  { id: "badminton-defense", name: "복식 수비 (좌우)", court: "badminton", points: [[3, 1.5], [3, 4.6]] },
  { id: "badminton-single", name: "단식 기본 자리", court: "badminton", points: [[3.4, 3.05]] },
  { id: "handball-60", name: "6-0 수비", court: "handball", points: [[0.8, 10], ...[-75, -45, -15, 15, 45, 75].map((angle): Point => [round(6.8 * Math.cos((angle * Math.PI) / 180)), round(10 + 6.8 * Math.sin((angle * Math.PI) / 180))])] },
  { id: "handball-51", name: "5-1 수비", court: "handball", points: [[0.8, 10], ...[-70, -35, 0, 35, 70].map((angle): Point => [round(6.8 * Math.cos((angle * Math.PI) / 180)), round(10 + 6.8 * Math.sin((angle * Math.PI) / 180))]), [10, 10]] },
  { id: "handball-33", name: "공격 3-3", court: "handball", points: [[1.5, 1.2], [10.5, 4], [11.5, 10], [10.5, 16], [1.5, 18.8], [6.8, 10]] },
  { id: "dodgeball-8", name: "내야 7 + 외야 1", court: "dodgeball", points: [[3, 2.5], [3, 7.5], [5.5, 5], [7.5, 2], [7.5, 8], [8.5, 5], [5.5, 1.2], [21.5, 5]] },
  { id: "teeball-field", name: "수비 위치 (9명)", court: "teeball", points: [[35, 45], [35, 59.2], [46, 45.5], [41, 36.5], [29, 36.5], [24, 45.5], [20, 27], [35, 20], [50, 27]], labels: ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF"] },
  { id: "floor-line", name: "한 줄", court: "floor", points: Array.from({ length: 8 }, (_, index): Point => [1.5 + index * 1.29, 4]) },
  { id: "floor-two", name: "두 줄 (엇갈리게)", court: "floor", points: Array.from({ length: 8 }, (_, index): Point => [2 + Math.floor(index / 2) * 2.4 + (index % 2) * 1.2, index % 2 ? 5 : 3]) },
  { id: "floor-circle", name: "원", court: "floor", points: circle(6, 4, 2.6, 8) },
  { id: "floor-v", name: "V자", court: "floor", points: [[6, 6.2], [5, 5], [7, 5], [4, 3.8], [8, 3.8], [3, 2.6], [9, 2.6], [6, 3.2]] },
  { id: "floor-triangle", name: "삼각형", court: "floor", points: [[6, 2], [5.2, 3.4], [6.8, 3.4], [4.4, 4.8], [6, 4.8], [7.6, 4.8], [3.6, 6.2], [8.4, 6.2]] },
];

export const formationsFor = (court: CourtKind) => formations.filter((item) => item.court === court);

/** 대형을 팀에 적용합니다. 팀 선수 수를 대형에 맞추고(모자라면 더하고 남으면 뺌), 지금 단계와 뒤 단계 위치를 바꿉니다. */
export function applyFormation(doc: TacticsDoc, frameIndex: number, team: Team, formation: Formation): TacticsDoc {
  const info = courtInfo[doc.court];
  const mirror = team === "B" && !(doc.half && info.halfable);
  const points = formation.points.map(([x, y]): Point => [mirror ? round(info.w - x) : x, mirror ? round(info.h - y) : y]);
  let next = doc;
  const players = () => next.items.filter((item) => item.kind === "player" && item.team === team);
  for (const extra of players().slice(points.length)) next = removeItem(next, extra.id);
  while (players().length < points.length && next.items.length < MAX_ITEMS) {
    next = addItem(next, { id: newId(team.toLowerCase()), kind: "player", team, label: nextPlayerLabel(next, team) }, points[players().length]);
  }
  players().forEach((player, index) => {
    if (formation.labels) next = { ...next, items: next.items.map((item) => item.id === player.id ? { ...item, label: formation.labels![index] } : item) };
    next = { ...next, frames: next.frames.map((frame, at) => at < frameIndex ? frame : { ...frame, pos: { ...frame.pos, [player.id]: points[index] } }) };
  });
  return next;
}

/** 기호 전용 자리(골대 안처럼 경기장 밖)를 포함해 항목이 보기 안에 있는지. */
export function insideView(doc: TacticsDoc, at: Point) {
  const box = viewBox(doc.court, doc.half);
  return at[0] >= box.x && at[0] <= box.x + box.w && at[1] >= box.y && at[1] <= box.y + box.h;
}

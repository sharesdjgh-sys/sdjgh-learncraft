/* 지구과학: 행성의 겉보기 운동(내행성·외행성의 위치 관계, 회합 주기, 최대 이각)과 일식·월식, 문제입니다. */
import { arrowSvg, num, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";
import { PLANETS } from "./gravity";

/** 회합 주기(년): 1/S = |1/1 − 1/P| */
export const synodic = (period: number) => 1 / Math.abs(1 - 1 / period);
/** 내행성의 최대 이각(°): sin θ = a */
export const maxElongation = (a: number) => (Math.asin(a) * 180) / Math.PI;

/** 태양·지구·행성의 위치 관계 그림입니다. 내행성은 내합·외합·최대 이각, 외행성은 충·합·구를 표시합니다. */
export function configurationSvg(a: number, options: { labels?: boolean } = {}) {
  const size = 440;
  const c = size / 2;
  const inner = a < 1;
  const earthR = inner ? 170 : 90;
  const planetR = inner ? 170 * a : Math.min(190, 90 * Math.min(a, 2.1));
  const earth: [number, number] = [c, c + earthR];
  const parts: string[] = [`<circle cx="${c}" cy="${c}" r="${earthR}" fill="none" stroke="#2563eb" stroke-dasharray="5 4"/><circle cx="${c}" cy="${c}" r="${planetR}" fill="none" stroke="#dc2626" stroke-dasharray="5 4"/>`];
  parts.push(`<circle cx="${c}" cy="${c}" r="14" fill="#fbbf24" stroke="#b45309"/>` + svgText(c, c + 4, "태양", { size: 10, anchor: "middle" }));
  parts.push(`<circle cx="${earth[0]}" cy="${earth[1]}" r="8" fill="#2563eb"/>` + svgText(earth[0] + 12, earth[1] + 16, "지구", { size: 11, color: "#1d4ed8", weight: 700 }));
  const place = (angle: number, label: string) => {
    // angle은 태양에서 본 방향(지구 쪽이 90°)
    const x = c + planetR * Math.cos((angle * Math.PI) / 180);
    const y = c + planetR * Math.sin((angle * Math.PI) / 180);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#dc2626"/>`);
    if (options.labels !== false) parts.push(svgText(x + (x > c ? 9 : -9), y + (y > c ? 16 : -8), label, { size: 11, anchor: x > c ? "start" : "end", weight: 700 }));
    return [x, y] as const;
  };
  if (inner) {
    place(90, "내합");
    place(270, "외합");
    // 최대 이각: 지구에서 행성 궤도에 그은 접선의 접점
    const theta = Math.acos(a) * (180 / Math.PI);
    const east = place(90 - theta, "서방 최대 이각");
    const west = place(90 + theta, "동방 최대 이각");
    for (const point of [east, west]) parts.push(`<line x1="${earth[0]}" y1="${earth[1]}" x2="${point[0].toFixed(1)}" y2="${point[1].toFixed(1)}" stroke="#64748b"/>`);
    parts.push(`<line x1="${earth[0]}" y1="${earth[1]}" x2="${c}" y2="${c}" stroke="#64748b" stroke-dasharray="3 3"/>` + svgText(earth[0] + 16, earth[1] - 40, `최대 이각 ${num(maxElongation(a), 1)}°`, { size: 11, color: "#475569" }));
  } else {
    place(90, "충");
    place(270, "합");
    // 구: 지구에서 본 태양과 행성이 90°. 지구 위치에서 태양 방향에 수직인 선이 행성 궤도와 만나는 점
    const dx = Math.sqrt(planetR ** 2 - earthR ** 2);
    for (const [sign, label] of [[1, "서구"], [-1, "동구"]] as [number, string][]) {
      const [x, y] = [earth[0] + sign * dx, earth[1]];
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#dc2626"/><line x1="${earth[0]}" y1="${earth[1]}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#64748b"/>`);
      if (options.labels !== false) parts.push(svgText(x + sign * 9, y + 16, label, { size: 11, anchor: sign > 0 ? "start" : "end", weight: 700 }));
    }
  }
  parts.push(arrowSvg(c + earthR * 0.7, c + earthR * 0.72, c + earthR * 0.78, c + earthR * 0.6, "#2563eb", 1.4) + svgText(10, 20, "공전 방향: 시계 반대 방향(북극 쪽에서 봄)", { size: 10.5, color: "#555" }));
  return svgWrap(size, size, parts.join(""));
}

/** 일식(삭)·월식(망)의 태양·달·지구 배열과 그림자입니다. */
export function eclipseSvg(kind: "solar" | "lunar") {
  const width = 560;
  const height = 200;
  const cy = 100;
  const parts: string[] = [`<circle cx="50" cy="${cy}" r="42" fill="#fbbf24" stroke="#b45309"/>` + svgText(50, cy + 62, "태양", { size: 11, anchor: "middle" })];
  if (kind === "solar") {
    parts.push(`<path d="M50 58 L332 94 L332 106 L50 142 Z" fill="rgba(15,23,42,.08)"/><path d="M300 92 L470 ${cy} L300 108 Z" fill="rgba(15,23,42,.35)"/>`);
    parts.push(`<circle cx="300" cy="${cy}" r="9" fill="#94a3b8" stroke="#334155"/>` + svgText(300, cy + 28, "달(삭)", { size: 11, anchor: "middle" }));
    parts.push(`<circle cx="470" cy="${cy}" r="30" fill="#bfdbfe" stroke="#1d4ed8"/>` + svgText(470, cy + 48, "지구", { size: 11, anchor: "middle" }) + svgText(440, 26, "본그림자 지역: 개기 일식, 반그림자 지역: 부분 일식", { size: 10.5, anchor: "end", color: "#475569" }));
  } else {
    parts.push(`<path d="M320 70 L540 ${cy - 10} L540 ${cy + 10} L320 130 Z" fill="rgba(15,23,42,.35)"/>`);
    parts.push(`<circle cx="320" cy="${cy}" r="30" fill="#bfdbfe" stroke="#1d4ed8"/>` + svgText(320, cy + 48, "지구", { size: 11, anchor: "middle" }));
    parts.push(`<circle cx="500" cy="${cy}" r="9" fill="#94a3b8" stroke="#334155"/>` + svgText(500, cy + 28, "달(망)", { size: 11, anchor: "middle" }) + svgText(540, 26, "달이 지구의 본그림자에 들어가면 개기 월식", { size: 10.5, anchor: "end", color: "#475569" }));
  }
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type PlanetAsk = "synodic" | "elongation" | "visibility" | "eclipse";
export const planetAsks: Record<PlanetAsk, string> = { synodic: "회합 주기", elongation: "최대 이각", visibility: "관측 시각·방향", eclipse: "일식과 월식" };

export function planetProblems(asks: PlanetAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 131 + 3);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 12, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "synodic") {
      const p = pick([0.5, 2, 3, 4, 1.5]);
      add(`공전 주기가 ${num(p)}년인 행성의 회합 주기를 구하시오. (지구의 공전 주기 1년)`, `${num(synodic(p), 3)}년 (1/S = |1 − 1/${num(p)}|)`);
    } else if (ask === "elongation") {
      const planet = pick(PLANETS.slice(0, 2));
      add(`${planet.name}의 궤도 반지름이 ${planet.a} AU일 때 ${planet.name}의 최대 이각을 구하시오. (원 궤도로 가정)`, `약 ${num(maxElongation(planet.a), 1)}° (sin θ = ${planet.a})`, { figure: configurationSvg(planet.a, { labels: false }) });
    } else if (ask === "visibility") {
      const which = pick([["동방 최대 이각", "초저녁 서쪽 하늘"], ["서방 최대 이각", "새벽 동쪽 하늘"], ["충", "한밤중 남쪽 하늘(밤새 보임)"]] as [string, string][]);
      add(`${which[0] === "충" ? "외행성" : "내행성"}이 ${which[0]}에 있을 때 우리나라에서 언제, 어느 쪽 하늘에서 볼 수 있는가?`, which[1], { space: 8 });
    } else {
      const kind = pick(["solar", "lunar"] as const);
      add(`그림과 같이 태양, 지구, 달이 배열될 때 일어나는 현상과 이때 달의 위상을 쓰시오.`, kind === "solar" ? "일식, 삭(달이 태양과 지구 사이)" : "월식, 망(지구가 태양과 달 사이)", { figure: eclipseSvg(kind), space: 8 });
    }
  }
  return [{ heading: "태양계 천체의 운동", problems }];
}

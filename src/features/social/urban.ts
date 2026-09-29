/* 지리·도시의 미래 탐구: 순위-규모 법칙과 종주 도시 지수, 도시화 곡선, 중력 모형(도시 간 상호 작용), 도시 내부 구조 모형과 지역별 특징, 문제입니다. 예시 국가·구는 가상 자료입니다. */
import { escapeHtml, grouped, num, plotSvg, problem, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetSection } from "./sheet";

export type UrbanCity = { name: string; population: number };
export const URBAN_PRESETS: { id: string; name: string; note: string; cities: UrbanCity[] }[] = [
  { id: "primate", name: "가국(종주 도시형)", note: "수위 도시 하나에 인구가 크게 몰려 있어요.", cities: [
    { name: "가1", population: 1000 }, { name: "가2", population: 250 }, { name: "가3", population: 180 }, { name: "가4", population: 120 }, { name: "가5", population: 90 }, { name: "가6", population: 70 }, { name: "가7", population: 55 }, { name: "가8", population: 40 },
  ] },
  { id: "rank", name: "나국(순위-규모형)", note: "n위 도시 인구가 1위 도시의 1/n에 가까워요.", cities: [
    { name: "나1", population: 500 }, { name: "나2", population: 250 }, { name: "나3", population: 167 }, { name: "나4", population: 125 }, { name: "나5", population: 100 }, { name: "나6", population: 83 }, { name: "나7", population: 71 }, { name: "나8", population: 63 },
  ] },
  { id: "binary", name: "다국(대도시 둘)", note: "비슷한 크기의 큰 도시 둘이 있어요.", cities: [
    { name: "다1", population: 600 }, { name: "다2", population: 540 }, { name: "다3", population: 150 }, { name: "다4", population: 110 }, { name: "다5", population: 90 }, { name: "다6", population: 70 },
  ] },
];

/** 인구가 많은 순으로 세우고, 순위-규모 법칙의 기대 인구(1위 ÷ 순위)를 붙입니다. */
export function rankCities(cities: UrbanCity[]) {
  const sorted = [...cities].filter(city => city.population > 0).sort((a, b) => b.population - a.population);
  const first = sorted[0]?.population ?? 0;
  return sorted.map((city, index) => ({ ...city, rank: index + 1, expected: first / (index + 1) }));
}
/** 종주 도시 지수 = 1위 도시 인구 ÷ 2위 도시 인구 */
export const primacyIndex = (cities: UrbanCity[]) => { const ranked = rankCities(cities); return ranked.length >= 2 ? ranked[0].population / ranked[1].population : 0; };

/** 순위-규모 그래프(가로·세로 모두 로그 눈금)입니다. 점선은 순위-규모 법칙의 기대 인구입니다. */
export function rankSizeSvg(cities: UrbanCity[], options: { width?: number } = {}) {
  const ranked = rankCities(cities);
  const width = options.width ?? 440;
  const height = 280;
  const pad = { left: 56, right: 20, top: 20, bottom: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxRank = Math.max(10, ranked.length);
  const values = ranked.flatMap(city => [city.population, city.expected]);
  const low = Math.floor(Math.log10(Math.max(0.1, Math.min(...values, 10))));
  const high = Math.ceil(Math.log10(Math.max(...values, 10)));
  const X = (rank: number) => pad.left + (Math.log10(rank) / Math.log10(maxRank)) * plotW;
  const Y = (value: number) => pad.top + plotH - ((Math.log10(value) - low) / (high - low || 1)) * plotH;
  const f = (value: number) => value.toFixed(1);
  const parts: string[] = [];
  for (let power = low; power <= high; power += 1) {
    for (const unit of [1, 2, 5]) {
      const value = unit * 10 ** power;
      if (value > 10 ** high) break;
      parts.push(`<line x1="${pad.left}" y1="${f(Y(value))}" x2="${pad.left + plotW}" y2="${f(Y(value))}" stroke="${unit === 1 ? "#d1d5db" : "#f1f5f9"}"/>`);
      if (unit === 1 || high - low <= 2) parts.push(svgText(pad.left - 5, Y(value) + 3.5, grouped(value, 1), { size: 9.5, anchor: "end", color: "#333" }));
    }
  }
  for (let rank = 1; rank <= maxRank; rank += 1) {
    parts.push(`<line x1="${f(X(rank))}" y1="${pad.top}" x2="${f(X(rank))}" y2="${pad.top + plotH}" stroke="#f1f5f9"/>`);
    if (rank <= 10 || rank % 5 === 0) parts.push(svgText(X(rank), pad.top + plotH + 14, String(rank), { size: 9.5, anchor: "middle", color: "#333" }));
  }
  parts.push(`<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="none" stroke="#111"/>`);
  if (ranked.length) parts.push(`<path d="${ranked.map((city, index) => `${index ? "L" : "M"}${f(X(city.rank))} ${f(Y(city.expected))}`).join("")}" stroke="#64748b" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>`);
  parts.push(`<path d="${ranked.map((city, index) => `${index ? "L" : "M"}${f(X(city.rank))} ${f(Y(city.population))}`).join("")}" stroke="#dc2626" stroke-width="2" fill="none"/>`);
  ranked.forEach(city => parts.push(`<circle cx="${f(X(city.rank))}" cy="${f(Y(city.population))}" r="3.4" fill="#dc2626"/>`));
  parts.push(svgText(pad.left + plotW / 2, height - 6, "도시 순위(로그 눈금)", { size: 10.5, anchor: "middle", italic: true }));
  parts.push(svgText(pad.left + 4, pad.top - 6, "인구(로그 눈금)", { size: 10.5, italic: true }));
  parts.push(`<line x1="${width - 150}" y1="${pad.top + 12}" x2="${width - 130}" y2="${pad.top + 12}" stroke="#dc2626" stroke-width="2"/>` + svgText(width - 126, pad.top + 16, "실제 인구", { size: 10 }));
  parts.push(`<line x1="${width - 150}" y1="${pad.top + 27}" x2="${width - 130}" y2="${pad.top + 27}" stroke="#64748b" stroke-width="1.6" stroke-dasharray="5 4"/>` + svgText(width - 126, pad.top + 31, "1위 ÷ 순위", { size: 10 }));
  return svgWrap(width, height, parts.join(""));
}

/* ───── 도시화 곡선 ───── */
/** 도시화 단계는 대략적 구분입니다(초기 30% 미만, 가속화 30~70%, 종착 70% 이상으로 봅니다). */
export const urbanStage = (rate: number) => rate < 30 ? "초기 단계" : rate < 70 ? "가속화 단계" : "종착 단계";
export const urbanStageNotes: Record<string, string> = {
  "초기 단계": "도시화율이 낮고 대부분 농촌에 살며 1차 산업 비중이 높아요.",
  "가속화 단계": "산업화로 이촌 향도가 활발해 도시화율이 빠르게 높아져요.",
  "종착 단계": "도시화율이 높고 증가 속도가 느려져요. 역도시화가 나타나기도 해요.",
};
export function urbanCurveSvg(rate?: number, options: { width?: number } = {}) {
  // S자 모양만 보여 주는 곡선이라 가로축(시간)에는 눈금 숫자를 적지 않습니다.
  const logistic = (t: number) => 2 + 96 / (1 + Math.exp(-(t - 50) / 10));
  const points: [number, number][] = [...Array(101).keys()].map(t => [t, logistic(t)]);
  const at = rate === undefined ? undefined : Math.min(97.3, Math.max(2.1, rate));
  const tAt = at === undefined ? undefined : Math.min(100, Math.max(0, 50 - 10 * Math.log(96 / (at - 2) - 1)));
  return plotSvg({
    xLabel: "시간", yLabel: "도시화율(%)", xMax: 100, yMin: 0, yMax: 100, xStep: 25, yStep: 10, hideTicks: true,
    series: [{ points, color: "#7c3aed", width: 2.6 }, { points: [[0, 30], [100, 30]], color: "#9ca3af", dash: true, width: 1 }, { points: [[0, 70], [100, 70]], color: "#9ca3af", dash: true, width: 1 }],
    dots: tAt !== undefined && at !== undefined ? [{ at: [tAt, at], color: "#dc2626", r: 5, label: `${num(rate ?? at, 1)}%` }] : [],
    extra: (sx, sy) => [0, 20, 40, 60, 80, 100].map(value => svgText(sx(0) - 5, sy(value) + 3.5, String(value), { size: 10, anchor: "end", color: "#333" })).join("")
      + svgText(sx(12), sy(16), "초기", { size: 11, anchor: "middle", weight: 700, color: "#4b5563" }) + svgText(sx(46), sy(50), "가속화", { size: 11, anchor: "end", weight: 700, color: "#4b5563" }) + svgText(sx(86), sy(84), "종착", { size: 11, anchor: "middle", weight: 700, color: "#4b5563" }),
    width: options.width ?? 420, height: 240,
  });
}

/* ───── 중력 모형 ───── */
/** 두 도시의 상호 작용 크기 ∝ P₁ × P₂ ÷ d² (비교용 상댓값) */
export const interaction = (p1: number, p2: number, distance: number) => distance > 0 ? (p1 * p2) / distance ** 2 : 0;

/* ───── 도시 내부 구조 ───── */
export type UrbanModel = "concentric" | "sector" | "nuclei";
export const urbanModels: Record<UrbanModel, { name: string; who: string; note: string; zones: string[] }> = {
  concentric: { name: "동심원 모형", who: "버제스", note: "도심을 중심으로 기능이 동심원 모양으로 배열돼요.", zones: ["중심 업무 지구(CBD)", "점이 지대", "저소득층 주거 지역", "중산층 주거 지역", "통근자 주거 지역"] },
  sector: { name: "선형 모형(부채꼴 모형)", who: "호이트", note: "교통로를 따라 같은 기능이 부채꼴 모양으로 뻗어 나가요.", zones: ["중심 업무 지구(CBD)", "도매·경공업 지구", "저급 주택 지구", "중급 주택 지구", "고급 주택 지구"] },
  nuclei: { name: "다핵심 모형", who: "해리스와 울만", note: "도시가 커지면 도심 말고도 여러 핵심을 중심으로 기능이 모여요.", zones: ["중심 업무 지구(CBD)", "도매·경공업 지구", "저급 주택 지구", "중급 주택 지구", "고급 주택 지구", "중공업 지구", "주변 업무 지구", "교외 주택 지구", "교외 공업 지구"] },
};
const ZONE_COLORS = ["#dc2626", "#f59e0b", "#fde68a", "#86efac", "#93c5fd", "#a78bfa", "#f472b6", "#bef264", "#94a3b8"];

/** 도시 내부 구조 모형 그림입니다. 칸 번호는 범례의 차례입니다. */
export function urbanModelSvg(model: UrbanModel, options: { legend?: boolean; title?: string } = {}) {
  const size = 240;
  const legend = options.legend !== false;
  const width = legend ? 460 : size + 20;
  const zones = urbanModels[model].zones;
  const cx = 130; const cy = size / 2 + 10;
  const f = (value: number) => value.toFixed(1);
  const parts: string[] = [];
  const label = (x: number, y: number, n: number) => `<circle cx="${f(x)}" cy="${f(y)}" r="8" fill="#fff" stroke="#111"/>` + svgText(x, y + 3.5, String(n), { size: 10, anchor: "middle", weight: 800 });
  if (model === "concentric") {
    [110, 88, 66, 44, 22].forEach((r, index) => parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ZONE_COLORS[4 - index]}" stroke="#111"/>`));
    [0, 33, 55, 77, 99].forEach((r, index) => parts.push(label(cx + r, cy, index + 1)));
  } else if (model === "sector") {
    const R = 110;
    // 각 칸(부채꼴)의 기능 번호입니다. CBD(1)는 가운데 원입니다.
    const sectors = [2, 3, 4, 5, 4, 3, 2, 3, 4, 3];
    const wedge = (from: number, to: number, r: number, color: string) => `<path d="M${cx} ${cy} L${f(cx + r * Math.cos(from))} ${f(cy + r * Math.sin(from))} A${r} ${r} 0 0 1 ${f(cx + r * Math.cos(to))} ${f(cy + r * Math.sin(to))} Z" fill="${color}" stroke="#111"/>`;
    sectors.forEach((zone, index) => {
      const from = (index / sectors.length) * Math.PI * 2 - Math.PI / 2;
      const to = ((index + 1) / sectors.length) * Math.PI * 2 - Math.PI / 2;
      parts.push(wedge(from, to, R, ZONE_COLORS[zone - 1]));
      const mid = (from + to) / 2;
      parts.push(label(cx + 72 * Math.cos(mid), cy + 72 * Math.sin(mid), zone));
    });
    parts.push(`<circle cx="${cx}" cy="${cy}" r="20" fill="${ZONE_COLORS[0]}" stroke="#111"/>` + label(cx, cy, 1));
  } else {
    const x0 = cx - 110; const y0 = cy - 110;
    const blocks: [number, number, number, number, number][] = [
      [3, 0, 0, 70, 80], [2, 70, 0, 60, 80], [4, 130, 0, 90, 80],
      [3, 0, 80, 50, 60], [1, 50, 80, 60, 60], [2, 110, 80, 40, 60], [5, 150, 80, 70, 60],
      [6, 0, 140, 60, 80], [7, 60, 140, 50, 40], [4, 110, 140, 50, 40], [8, 160, 140, 60, 80], [9, 60, 180, 100, 40],
    ];
    blocks.forEach(([zone, x, y, w, h]) => { parts.push(`<rect x="${x0 + x}" y="${y0 + y}" width="${w}" height="${h}" fill="${ZONE_COLORS[zone - 1]}" stroke="#111"/>`); parts.push(label(x0 + x + w / 2, y0 + y + h / 2, zone)); });
  }
  if (options.title !== "") parts.push(svgText(cx, 14, options.title ?? `${urbanModels[model].name}(${urbanModels[model].who})`, { size: 12, anchor: "middle", weight: 700 }));
  if (legend) zones.forEach((zone, index) => {
    const y = 30 + index * 22;
    parts.push(`<rect x="262" y="${y - 10}" width="14" height="14" fill="${ZONE_COLORS[index]}" stroke="#111"/>` + svgText(282, y + 1, `${index + 1} ${zone}`, { size: 11 }));
  });
  return svgWrap(width, size + 22, parts.join(""));
}

export type UrbanArea = "center" | "subcenter" | "middle" | "outer";
export const urbanAreaNames: Record<UrbanArea, string> = { center: "도심", subcenter: "부도심", middle: "중간 지역", outer: "주변 지역" };
/** 도시 내부 지역별 특징(교과서 일반화)입니다. */
export const URBAN_FEATURES: { label: string; values: Record<UrbanArea, string> }[] = [
  { label: "접근성", values: { center: "가장 높음", subcenter: "높음(교통 결절점)", middle: "중간", outer: "낮음" } },
  { label: "지대·지가", values: { center: "가장 높음", subcenter: "높음", middle: "중간", outer: "낮음" } },
  { label: "토지 이용", values: { center: "고층 건물, 집약적", subcenter: "상업·업무 집중", middle: "주거·상업·공업 혼재", outer: "주거·학교·녹지, 공업 단지" } },
  { label: "주요 기능", values: { center: "중심 업무·관청·금융 본사", subcenter: "도심 기능 분담", middle: "오래된 주택·소규모 공장", outer: "대규모 아파트 단지" } },
  { label: "상주 인구", values: { center: "적음", subcenter: "적은 편", middle: "많은 편", outer: "많음" } },
  { label: "주간 인구 지수", values: { center: "매우 높음(100보다 큼)", subcenter: "높음", middle: "100 안팎", outer: "낮음(100보다 작음)" } },
  { label: "인구 공동화", values: { center: "뚜렷함", subcenter: "나타남", middle: "약함", outer: "거의 없음" } },
];
/** 주간 인구 지수 = 주간 인구 ÷ 상주(야간) 인구 × 100 */
export const daytimeIndex = (daytime: number, resident: number) => resident > 0 ? (daytime / resident) * 100 : 0;

export function urbanFeatureTableHtml(blanks: Set<string> = new Set()) {
  const areas = Object.keys(urbanAreaNames) as UrbanArea[];
  return sheetTable(["구분", ...areas.map(area => urbanAreaNames[area])], URBAN_FEATURES.map(row => [escapeHtml(row.label), ...areas.map(area => blanks.has(`${row.label}:${area}`) ? "(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)" : escapeHtml(row.values[area]))]), { font: "9pt" });
}

/* ───── 문제 ───── */
export type UrbanAsk = "primacy" | "ranksize" | "stage" | "gravity" | "daytime" | "feature" | "model";
export const urbanAsks: Record<UrbanAsk, string> = { primacy: "종주 도시 지수", ranksize: "순위-규모 법칙", stage: "도시화 단계", gravity: "중력 모형", daytime: "주간 인구 지수", feature: "도시 내부 지역 특징", model: "도시 내부 구조 모형" };

export function urbanProblems(asks: UrbanAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 89 + 23);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems = [];
    for (let index = 0; index < perAsk; index += 1) {
      if (ask === "primacy") {
        const second = pick([100, 120, 150, 200, 250]);
        const factor = pick([1.2, 2, 2.5, 3, 4, 5]);
        const first = second * factor;
        const third = Math.round(second * 0.6);
        problems.push(problem(`어느 국가의 1~3위 도시 인구는 각각 ${grouped(first, 0)}만, ${grouped(second, 0)}만, ${grouped(third, 0)}만 명이다. 종주 도시 지수(1위 ÷ 2위)를 구하시오.`,
          `${num(factor, 2)} (${grouped(first, 0)} ÷ ${grouped(second, 0)}) — 값이 클수록 수위 도시에 인구가 몰려 있어요`, { space: 8 }));
      } else if (ask === "ranksize") {
        const first = pick([600, 840, 1200, 1800]);
        const rank = pick([2, 3, 4, 5, 6]);
        problems.push(problem(`순위-규모 법칙을 따르는 국가에서 1위 도시 인구가 ${grouped(first, 0)}만 명이면 ${rank}위 도시의 인구는 약 몇 만 명인지 구하시오.`,
          `약 ${grouped(first / rank, 1)}만 명 (1위 인구 ÷ 순위)`, { space: 8 }));
      } else if (ask === "stage") {
        const rate = pick([12, 25, 38, 55, 64, 78, 91]);
        const stage = urbanStage(rate);
        problems.push(problem(`도시화율이 ${rate}%인 국가는 도시화 곡선의 어느 단계에 해당하는지 쓰고, 그 단계의 특징을 설명하시오. (초기 30% 미만, 가속화 30~70%, 종착 70% 이상으로 본다.)`,
          `${stage} — ${escapeHtml(urbanStageNotes[stage])}`, { space: 12 }));
      } else if (ask === "gravity") {
        const [p1, p2] = [pick([10, 20, 40, 50]), pick([10, 20, 30, 60])];
        const [d1, d2] = [pick([10, 20, 30]), pick([20, 40, 60])];
        const [p3, p4] = [pick([20, 40, 80]), pick([10, 30, 50])];
        const first = interaction(p1, p2, d1);
        const second = interaction(p3, p4, d2);
        const ratio = first / second;
        problems.push(problem(`중력 모형(상호 작용 ∝ 두 도시 인구의 곱 ÷ 거리²)에 따를 때, 인구 ${p1}만·${p2}만 명이고 ${d1} km 떨어진 두 도시 (가)와 인구 ${p3}만·${p4}만 명이고 ${d2} km 떨어진 두 도시 (나) 중 상호 작용이 큰 쪽은 어디이며 몇 배인지 구하시오.`,
          ratio === 1 ? "두 쌍이 같음" : `${ratio > 1 ? "(가)" : "(나)"}가 ${num(Math.max(ratio, 1 / ratio), 2)}배 (가: ${grouped(first, 2)}, 나: ${grouped(second, 2)})`, { space: 14 }));
      } else if (ask === "daytime") {
        const districts = shuffled([
          { name: "A구", resident: 5, daytime: 30 }, { name: "B구", resident: 20, daytime: 26 }, { name: "C구", resident: 45, daytime: 36 }, { name: "D구", resident: 60, daytime: 42 },
        ], seed * 7 + index).map(district => ({ ...district, resident: district.resident + pick([0, 1, 2]), daytime: district.daytime + pick([0, 2, 4]) }));
        const indices = districts.map(district => daytimeIndex(district.daytime, district.resident));
        const top = districts[indices.indexOf(Math.max(...indices))];
        const low = districts[indices.indexOf(Math.min(...indices))];
        const table = sheetTable(["구", "상주 인구(만 명)", "주간 인구(만 명)"], districts.map(district => [district.name, num(district.resident, 0), num(district.daytime, 0)]));
        problems.push(problem(`다음은 어느 대도시 네 구의 인구 자료이다. 각 구의 주간 인구 지수를 구하고, 도심과 주변 지역(주거 지역)에 가까운 구를 고르시오.${table}`,
          `${districts.map((district, at) => `${district.name} ${num(indices[at], 1)}`).join(", ")} → 도심 ${top.name}, 주변 지역 ${low.name} (주간 인구 ÷ 상주 인구 × 100)`, { space: 14 }));
      } else if (ask === "feature") {
        const areas = Object.keys(urbanAreaNames) as UrbanArea[];
        const cells = URBAN_FEATURES.flatMap(row => areas.map(area => `${row.label}:${area}`));
        const blanks = new Set(shuffled(cells, seed * 13 + index).slice(0, 6));
        const answers = [...blanks].map(key => { const [label, area] = key.split(":"); return `${urbanAreaNames[area as UrbanArea]} ${label}: ${URBAN_FEATURES.find(row => row.label === label)!.values[area as UrbanArea]}`; });
        problems.push(problem(`다음 도시 내부 지역별 특징표의 빈칸을 채우시오.${urbanFeatureTableHtml(blanks)}`, answers.map(escapeHtml).join("<br>"), { space: 4 }));
      } else {
        const model = (Object.keys(urbanModels) as UrbanModel[])[(seed + index) % 3];
        problems.push(problem("다음 그림은 도시 내부 구조 모형이다. 모형의 이름과 제안한 사람을 쓰고, 이 모형의 특징을 설명하시오.",
          `${escapeHtml(urbanModels[model].name)}(${escapeHtml(urbanModels[model].who)}) — ${escapeHtml(urbanModels[model].note)}`, { figure: urbanModelSvg(model, { title: "" }), space: 12 }));
      }
    }
    sections.push({ heading: urbanAsks[ask], problems });
  }
  return sections;
}

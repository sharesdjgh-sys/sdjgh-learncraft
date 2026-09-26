/* 생명과학: 방형구법 군집 조사(밀도·빈도·피도·중요치)와 개체군 생장 곡선(J자·S자), 문제입니다. */
import { escapeHtml, num, plotSvg, seededRandom, shuffled, sheetTable, svgText, type SheetProblem, type SheetSection } from "./sheet";

export type Species = { name: string; individuals: number; quadrats: number; cover: number };
export type Survey = { quadratCount: number; quadratArea: number; species: Species[] };

export const DEFAULT_SURVEY: Survey = {
  quadratCount: 10, quadratArea: 1,
  species: [
    { name: "질경이", individuals: 40, quadrats: 8, cover: 2.4 },
    { name: "토끼풀", individuals: 60, quadrats: 6, cover: 3.2 },
    { name: "민들레", individuals: 20, quadrats: 5, cover: 1.2 },
    { name: "강아지풀", individuals: 30, quadrats: 3, cover: 1.2 },
  ],
};

/** 밀도 = 개체 수/전체 면적, 빈도 = 출현 방형구 수/전체 방형구 수, 피도 = 점유 면적/전체 면적, 상대값은 모든 종 합에 대한 %. */
export function surveyResult(survey: Survey) {
  const area = survey.quadratCount * survey.quadratArea;
  const rows = survey.species.map(item => ({ ...item, density: item.individuals / area, frequency: item.quadrats / survey.quadratCount, coverage: item.cover / area }));
  const sum = (key: "density" | "frequency" | "coverage") => rows.reduce((total, row) => total + row[key], 0) || 1;
  const [ds, fs, cs] = [sum("density"), sum("frequency"), sum("coverage")];
  const full = rows.map(row => {
    const rd = (row.density / ds) * 100;
    const rf = (row.frequency / fs) * 100;
    const rc = (row.coverage / cs) * 100;
    return { ...row, rd, rf, rc, importance: rd + rf + rc };
  });
  const dominant = full.reduce((best, row) => row.importance > best.importance ? row : best, full[0]);
  return { rows: full, dominant };
}
export function surveyTableHtml(survey: Survey, blank = false) {
  const result = surveyResult(survey);
  const cell = (value: number, digits = 1) => blank ? "" : num(value, digits);
  return sheetTable(["종", "개체 수", "출현 방형구 수", "점유 면적(m²)", "상대 밀도(%)", "상대 빈도(%)", "상대 피도(%)", "중요치"], result.rows.map(row => [escapeHtml(row.name), String(row.individuals), String(row.quadrats), num(row.cover, 2), cell(row.rd), cell(row.rf), cell(row.rc), cell(row.importance)]), { font: "9.5pt" });
}

/* ───── 개체군 생장 ───── */
export type Growth = { initial: number; rate: number; capacity: number; span: number };
export const exponential = (growth: Growth, t: number) => growth.initial * Math.exp(growth.rate * t);
export const logistic = (growth: Growth, t: number) => growth.capacity / (1 + ((growth.capacity - growth.initial) / growth.initial) * Math.exp(-growth.rate * t));
export function growthSvg(growth: Growth, options: { resistance?: boolean } = {}) {
  const points = (fn: (t: number) => number) => Array.from({ length: 121 }, (_, step) => { const t = (growth.span * step) / 120; return [t, fn(t)] as [number, number]; });
  const top = growth.capacity * 1.6;
  const j = points(t => exponential(growth, t)).filter(([, n]) => n <= top * 1.02);
  const s = points(t => logistic(growth, t));
  return plotSvg({
    xLabel: "시간", yLabel: "개체 수", xMax: growth.span * 1.05, yMin: 0, yMax: top, hideTicks: true,
    series: [{ points: j, color: "#dc2626", label: "이론적 생장(J자)" }, { points: s, color: "#2563eb", label: "실제 생장(S자)" }, { points: [[0, growth.capacity], [growth.span, growth.capacity]], color: "#64748b", dash: true, width: 1.2 }],
    areas: options.resistance === false ? undefined : [{ points: [...j, ...[...s].filter(([t]) => t <= j[j.length - 1][0]).reverse()], color: "rgba(220,38,38,.1)" }],
    extra: (sx, sy) => svgText(sx(growth.span) - 4, sy(growth.capacity) - 6, "환경 수용력(K)", { size: 10.5, anchor: "end", color: "#475569" }) + (options.resistance === false ? "" : svgText(sx(growth.span * 0.32), sy(growth.capacity * 1.05), "환경 저항", { size: 11, color: "#b91c1c", weight: 700 })),
    width: 480, height: 290,
  });
}

/* ───── 문제 ───── */
export type EcologyAsk = "survey" | "dominant" | "growth";
export const ecologyAsks: Record<EcologyAsk, string> = { survey: "방형구법 계산", dominant: "우점종 찾기", growth: "개체군 생장 곡선" };
const PLANTS = ["질경이", "토끼풀", "민들레", "강아지풀", "쑥", "명아주", "바랭이", "씀바귀"];

export function randomSurvey(random: () => number): Survey {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const names = shuffled(PLANTS, Math.floor(random() * 1e6)).slice(0, 3 + Math.floor(random() * 2));
  return { quadratCount: 10, quadratArea: 1, species: names.map(name => ({ name, individuals: pick([10, 20, 30, 40, 50, 60]), quadrats: pick([2, 4, 5, 6, 8, 10]), cover: pick([0.5, 1, 1.5, 2, 3]) })) };
}

export function ecologyProblems(asks: EcologyAsk[], perAsk: number, seed: number, custom: Survey | null): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 107 + 9);
  const problems: SheetProblem[] = [];
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    const survey = index === 0 && custom ? custom : randomSurvey(random);
    const result = surveyResult(survey);
    const lead = `면적이 ${survey.quadratArea} m²인 방형구 ${survey.quadratCount}개를 설치하여 식물 군집을 조사하였다.`;
    if (ask === "survey") problems.push({ html: `${lead} 표를 완성하시오.${surveyTableHtml(survey, true).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:8mm"></td>')}`, text: `${lead} ${survey.species.map(item => `${item.name}(개체 ${item.individuals}, 방형구 ${item.quadrats}, 점유 ${item.cover} m²)`).join(", ")}의 상대 밀도·빈도·피도와 중요치를 구하시오.`, answerHtml: surveyTableHtml(survey), answerText: result.rows.map(row => `${row.name} 중요치 ${num(row.importance, 1)}`).join(", ") });
    else if (ask === "dominant") problems.push({ html: `${lead} 이 군집의 우점종을 쓰고, 그렇게 판단한 까닭을 쓰시오.${surveyTableHtml(survey, true).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:7mm"></td>')}`, text: `${lead} 우점종과 그 까닭을 쓰시오.`, answerHtml: `${escapeHtml(result.dominant.name)} (중요치 ${num(result.dominant.importance, 1)}로 가장 큼)`, answerText: `${result.dominant.name}`, space: 10 });
    else problems.push({ html: "그림은 어떤 개체군의 이론적 생장 곡선과 실제 생장 곡선을 나타낸 것이다. 두 곡선의 차이가 생기는 까닭과 환경 수용력의 뜻을 쓰시오.", text: "이론적·실제 생장 곡선의 차이가 생기는 까닭과 환경 수용력의 뜻을 쓰시오.", figure: growthSvg({ initial: 10, rate: 0.5, capacity: 500, span: 20 }, { resistance: false }), answerHtml: "먹이·서식 공간 부족, 노폐물 축적, 천적·질병 등 환경 저항 때문에 실제 개체 수는 S자로 늘어난다. 환경 수용력은 그 환경에서 유지될 수 있는 최대 개체 수이다.", answerText: "환경 저항 때문, 환경 수용력은 최대 개체 수", space: 12 });
  }
  return [{ heading: "군집과 개체군", problems }];
}

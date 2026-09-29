/* 지구과학: 방사성 동위 원소의 반감기와 절대 연령 계산, 붕괴 곡선, 문제입니다. */
import { escapeHtml, grouped, num, plotSvg, seededRandom, type SheetProblem, type SheetSection } from "./sheet";

export type Isotope = { id: string; parent: string; daughter: string; halfLife: number; note: string };
/** 반감기는 년 단위입니다. 교과서는 어림값(예: ²³⁸U 약 45억 년)을 쓰기도 합니다. */
export const ISOTOPES: Isotope[] = [
  { id: "c14", parent: "¹⁴C", daughter: "¹⁴N", halfLife: 5730, note: "생물의 유해(수만 년 안쪽)" },
  { id: "k40", parent: "⁴⁰K", daughter: "⁴⁰Ar", halfLife: 1.25e9, note: "화성암, 교과서에 따라 13억 년" },
  { id: "u235", parent: "²³⁵U", daughter: "²⁰⁷Pb", halfLife: 7.04e8, note: "오래된 암석" },
  { id: "u238", parent: "²³⁸U", daughter: "²⁰⁶Pb", halfLife: 4.47e9, note: "지구와 운석의 나이, 교과서에 따라 45억 년" },
  { id: "rb87", parent: "⁸⁷Rb", daughter: "⁸⁷Sr", halfLife: 4.88e10, note: "매우 오래된 암석" },
];

/** 년을 억 년·만 년·년으로 알기 쉽게 적습니다. */
export function yearsText(years: number) {
  if (years >= 1e8) return `${grouped(years / 1e8, 2)}억 년`;
  if (years >= 1e5) return `${grouped(years / 1e4, 2)}만 년`;
  return `${grouped(years, 0)}년`;
}
/** 지구의 나이(약 46억 년)보다 오래된 답이 나오지 않게 합니다. */
const EARTH_AGE = 4.6e9;

/** 남은 모원소 비율(0~1)에서 지난 반감기 횟수와 나이를 구합니다. */
export function ageFromRemaining(remaining: number, halfLife: number) {
  const halfLives = Math.log2(1 / remaining);
  return { halfLives, age: halfLives * halfLife };
}
/** 모원소 : 자원소의 비에서 남은 비율을 구합니다(처음에 자원소가 없었다고 봅니다). */
export const remainingFromRatio = (parent: number, daughter: number) => parent / (parent + daughter);
export const remainingAfter = (halfLives: number) => 0.5 ** halfLives;

/** 붕괴 곡선. 가로축은 시간(반감기 단위나 실제 시간), 세로축은 모원소·자원소의 양(%)입니다. */
export function decaySvg(isotope: Pick<Isotope, "parent" | "daughter" | "halfLife">, options: { halfLives?: number; daughter?: boolean; realTime?: boolean; marker?: number; width?: number; height?: number } = {}) {
  const count = options.halfLives ?? 5;
  const scale = options.realTime ? isotope.halfLife : 1;
  const unit = options.realTime ? (isotope.halfLife >= 1e8 ? { div: 1e8, label: "시간(억 년)" } : isotope.halfLife >= 1e4 ? { div: 1e4, label: "시간(만 년)" } : { div: 1, label: "시간(년)" }) : { div: 1, label: "반감기 횟수" };
  const steps = 100;
  const parent: [number, number][] = [];
  const daughter: [number, number][] = [];
  for (let step = 0; step <= steps; step += 1) {
    const n = (count * step) / steps;
    const x = (n * scale) / unit.div;
    parent.push([x, 100 * 0.5 ** n]);
    daughter.push([x, 100 - 100 * 0.5 ** n]);
  }
  const dots = Array.from({ length: count + 1 }, (_, n) => ({ at: [(n * scale) / unit.div, 100 * 0.5 ** n] as [number, number] }));
  return plotSvg({
    xLabel: unit.label, yLabel: "양(%)", xMax: (count * scale) / unit.div, yMin: 0, yMax: 105, yStep: 25,
    xStep: (scale / unit.div),
    series: [{ points: parent, color: "#2563eb", label: `모원소 ${isotope.parent}` }, ...(options.daughter === false ? [] : [{ points: daughter, color: "#dc2626", dash: true, label: `자원소 ${isotope.daughter}` }])],
    dots: options.marker !== undefined ? [...dots, { at: [options.marker * scale / unit.div, 100 * 0.5 ** options.marker] as [number, number], label: `${num(100 * 0.5 ** options.marker, 1)}%` }] : dots,
    width: options.width ?? 420, height: options.height ?? 250,
  });
}

/* ───── 문제 ───── */
export type DatingAsk = "remaining" | "ratio" | "after" | "graph";
export const datingAsks: Record<DatingAsk, string> = { remaining: "남은 비율 → 나이", ratio: "모원소:자원소 비 → 나이", after: "시간 → 남은 비율", graph: "붕괴 곡선 읽기" };

export function datingProblems(asks: DatingAsk[], perAsk: number, seed: number, isotopes: Isotope[]): SheetSection[] {
  if (!asks.length || !isotopes.length) return [];
  const random = seededRandom(seed * 97 + 11);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const usable = isotopes.filter(isotope => isotope.halfLife <= EARTH_AGE);
  if (!usable.length) return [];
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    const isotope = pick(usable);
    const n = pick([1, 2, 3, 4].filter(count => count === 1 || count * isotope.halfLife <= EARTH_AGE));
    const half = yearsText(isotope.halfLife);
    const age = yearsText(n * isotope.halfLife);
    if (ask === "remaining") {
      const percent = 100 * 0.5 ** n;
      problems.push({
        html: `어떤 암석에 들어 있는 방사성 원소 ${escapeHtml(isotope.parent)}(반감기 ${half})의 양이 처음 양의 ${num(percent, 2)}%로 줄었다. 이 암석의 절대 연령을 구하시오.`,
        text: `어떤 암석에 들어 있는 방사성 원소 ${isotope.parent}(반감기 ${half})의 양이 처음 양의 ${num(percent, 2)}%로 줄었다. 이 암석의 절대 연령을 구하시오.`,
        answerHtml: `${age} (반감기 ${n}번: ${num(percent, 2)}% = (1/2)<sup>${n}</sup>)`, answerText: `${age} (반감기 ${n}번)`, space: 12,
      });
    } else if (ask === "ratio") {
      const parent = 1;
      const daughter = 2 ** n - 1;
      problems.push({
        html: `어떤 화성암에 들어 있는 모원소(${escapeHtml(isotope.parent)}) : 자원소(${escapeHtml(isotope.daughter)})의 비가 ${parent} : ${daughter}이다. 모원소의 반감기가 ${half}일 때 이 암석의 절대 연령을 구하시오. (처음에 자원소는 없었다.)`,
        text: `어떤 화성암에 들어 있는 모원소(${isotope.parent}) : 자원소(${isotope.daughter})의 비가 ${parent} : ${daughter}이다. 모원소의 반감기가 ${half}일 때 이 암석의 절대 연령을 구하시오. (처음에 자원소는 없었다.)`,
        answerHtml: `${age} (모원소가 처음의 1/${2 ** n} → 반감기 ${n}번)`, answerText: `${age} (반감기 ${n}번)`, space: 12,
      });
    } else if (ask === "after") {
      problems.push({
        html: `방사성 원소 ${escapeHtml(isotope.parent)}(반감기 ${half})의 양은 ${age}이 지나면 처음 양의 몇 %가 되는지 구하시오.`,
        text: `방사성 원소 ${isotope.parent}(반감기 ${half})의 양은 ${age}이 지나면 처음 양의 몇 %가 되는지 구하시오.`,
        answerHtml: `${num(100 * 0.5 ** n, 2)}% (반감기 ${n}번)`, answerText: `${num(100 * 0.5 ** n, 2)}%`, space: 10,
      });
    } else {
      const made = { parent: "X", daughter: "Y", halfLife: pick([1, 2, 3, 5]) * 1e8 };
      problems.push({
        html: `그림은 방사성 원소 X가 붕괴하여 Y가 되는 동안 X와 Y의 양을 시간에 따라 나타낸 것이다. X의 반감기와, X의 양이 처음의 ${num(100 * 0.5 ** n, 2)}%가 될 때까지 걸린 시간을 구하시오.`,
        text: `그림은 방사성 원소 X가 붕괴하여 Y가 되는 동안 X와 Y의 양을 시간에 따라 나타낸 것이다. X의 반감기와, X의 양이 처음의 ${num(100 * 0.5 ** n, 2)}%가 될 때까지 걸린 시간을 구하시오. (그림은 인쇄본 참고)`,
        figure: decaySvg(made, { realTime: true, halfLives: 4 }),
        answerHtml: `반감기 ${yearsText(made.halfLife)}, ${yearsText(n * made.halfLife)}`, answerText: `반감기 ${yearsText(made.halfLife)}, ${yearsText(n * made.halfLife)}`,
        space: 6,
      });
    }
  }
  return [{ heading: "방사성 동위 원소와 절대 연령", problems }];
}

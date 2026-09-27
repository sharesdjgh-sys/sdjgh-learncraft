/* 확률과 통계 Ⅲ. 확률분포: 이산확률변수의 확률분포표와 평균·분산·표준편차, aX+b, 이항분포 B(n, p)입니다. 확률은 기약분수로 정확히 계산합니다. */
import { mathProblem, plotSvg, q, qAdd, qEq, qMul, qNum, qSub, qTex, sheetTable, sqrtParts, svgText, tex, type Q, type SheetProblem, type SheetSection } from "./core";
import { comb, eachAsk, picker } from "./pg-common";

/** 확률분포표 한 칸: 값 x와 확률 p */
export type DistRow = { x: number; p: Q };
/** 확률분포표를 교사가 “공통 분모 + 분자”로 넣은 것을 분수로 바꿉니다. */
export const rowsFrom = (xs: number[], weights: number[], denominator: number): DistRow[] => xs.map((x, index) => ({ x, p: q(weights[index] ?? 0, denominator) }));

export function distStats(rows: DistRow[]) {
  const sum = rows.reduce((acc, row) => qAdd(acc, row.p), q(0));
  const mean = rows.reduce((acc, row) => qAdd(acc, qMul(q(row.x), row.p)), q(0));
  const square = rows.reduce((acc, row) => qAdd(acc, qMul(q(row.x * row.x), row.p)), q(0));
  const variance = qSub(square, qMul(mean, mean));
  return { sum, valid: qEq(sum, q(1)), mean, square, variance, sd: Math.sqrt(qNum(variance)) };
}
/** √(n/d)를 간단히 한 TeX. √(n/d) = √(nd)/d */
export function sqrtQTex(value: Q) {
  if (value.n < 0) return "\\text{—}";
  const { outside, inside } = sqrtParts(value.n * value.d);
  // √(n/d) = outside·√inside / d 를 약분합니다.
  const coef = q(outside, value.d);
  if (inside === 1) return qTex(coef);
  const root = `\\sqrt{${inside}}`;
  const top = coef.n === 1 ? root : `${coef.n}${root}`;
  return coef.d === 1 ? top : `\\frac{${top}}{${coef.d}}`;
}
/** aX+b의 평균·분산 */
export const linearStats = (mean: Q, variance: Q, a: number, b: number) => ({ mean: qAdd(qMul(q(a), mean), q(b)), variance: qMul(q(a * a), variance) });

/** 이항분포 B(n, p) */
export function binomial(n: number, p: Q) {
  const pNum = qNum(p);
  const probs = Array.from({ length: n + 1 }, (_, k) => comb(n, k) * pNum ** k * (1 - pNum) ** (n - k));
  const mean = qMul(q(n), p);
  const variance = qMul(mean, qSub(q(1), p));
  return { probs, mean, variance };
}
/** P(X = k)를 분수로(작은 n에서만) */
export const binomialExact = (n: number, p: Q, k: number) => qMul(q(comb(n, k)), qMul(q(p.n ** k, p.d ** k), q((p.d - p.n) ** (n - k), p.d ** (n - k))));

/** 확률분포표 HTML(학습지용). blank면 확률 하나를 빈칸 a로 */
export function distTableHtml(rows: DistRow[], blankIndex?: number) {
  return sheetTable(["X", ...rows.map(row => String(row.x)), "합계"], [["P(X = x)", ...rows.map((row, index) => (index === blankIndex ? "a" : tex(qTex(row.p)))), "1"]]);
}

/** 이산확률분포 막대그래프 */
export function distSvg(xs: number[], probs: number[], options: { title?: string; mean?: number } = {}) {
  const top = Math.max(0.05, ...probs) * 1.2;
  const xMin = Math.min(...xs) - 1;
  const xMax = Math.max(...xs) + 1;
  const bar = Math.min(0.6, 0.8 * (xs.length > 1 ? Math.min(...xs.slice(1).map((x, i) => x - xs[i])) : 1));
  return plotSvg({
    xLabel: "x", yLabel: "P(X=x)", xMin, xMax, yMin: 0, yMax: top, width: 420, height: 250, title: options.title,
    xStep: Math.max(1, Math.ceil((xMax - xMin) / 12)),
    areas: xs.map((x, index) => ({ points: [[x - bar / 2, 0], [x + bar / 2, 0], [x + bar / 2, probs[index]], [x - bar / 2, probs[index]]] as [number, number][], color: "#93c5fd" })),
    extra: (sx, sy) => options.mean === undefined ? "" : `<line x1="${sx(options.mean).toFixed(1)}" y1="${sy(0).toFixed(1)}" x2="${sx(options.mean).toFixed(1)}" y2="${sy(top * 0.95).toFixed(1)}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>${svgText(sx(options.mean) + 4, sy(top * 0.92), `평균 ${options.mean.toFixed(2).replace(/\.?0+$/, "")}`, { size: 10.5, color: "#dc2626" })}`,
  });
}

/* ───── 문제 ───── */
export type DistributionAsk = "table" | "blank" | "linear" | "binomial" | "binomialProb";
export const distributionAsks: Record<DistributionAsk, string> = {
  table: "평균·분산 구하기", blank: "확률분포표 빈칸", linear: "aX+b의 평균·분산", binomial: "이항분포 평균·분산", binomialProb: "이항분포 확률",
};

/** 평균·분산이 깔끔한 확률분포표 모음(분자, 공통 분모) */
const TABLES: { xs: number[]; weights: number[]; d: number }[] = [
  { xs: [0, 1, 2], weights: [1, 2, 1], d: 4 },
  { xs: [1, 2, 3], weights: [1, 1, 2], d: 4 },
  { xs: [0, 1, 2, 3], weights: [1, 3, 3, 1], d: 8 },
  { xs: [1, 2, 3, 4], weights: [1, 2, 3, 4], d: 10 },
  { xs: [-1, 0, 1], weights: [1, 2, 1], d: 4 },
  { xs: [0, 2, 4], weights: [1, 3, 1], d: 5 },
  { xs: [1, 3, 5], weights: [2, 1, 2], d: 5 },
  { xs: [0, 1, 2], weights: [3, 2, 1], d: 6 },
];
/** 평균·분산이 정수가 되는 이항분포 [n, p] */
const BINOMIALS: [number, Q][] = [[20, q(1, 2)], [36, q(1, 6)], [50, q(1, 5)], [48, q(1, 4)], [72, q(1, 3)], [100, q(1, 10)], [40, q(1, 2)], [90, q(1, 3)], [180, q(1, 6)]];

export function distributionProblems(asks: DistributionAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick, int } = picker(seed * 71 + 13);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, options: Partial<SheetProblem> = {}) => problems.push(mathProblem(html, answer, { space: 14, ...options }));
  eachAsk(asks, perAsk, ask => {
    const base = pick(TABLES);
    const rows = rowsFrom(base.xs, base.weights, base.d);
    const stats = distStats(rows);
    if (ask === "table") {
      add(`확률변수 X의 확률분포가 다음 표와 같을 때, ${tex("E(X)")}, ${tex("V(X)")}, ${tex("\\sigma(X)")}를 구하시오.`,
        `${tex(`E(X)=${qTex(stats.mean)},\\ V(X)=E(X^{2})-\\{E(X)\\}^{2}=${qTex(stats.square)}-\\left(${qTex(stats.mean)}\\right)^{2}=${qTex(stats.variance)},\\ \\sigma(X)=${sqrtQTex(stats.variance)}`)}`,
        { after: distTableHtml(rows) });
    } else if (ask === "blank") {
      const blank = int(0, rows.length - 1);
      add(`확률변수 X의 확률분포가 다음 표와 같을 때, 상수 a의 값과 ${tex("E(X)")}를 구하시오.`,
        `${tex(`a=${qTex(rows[blank].p)}`)} (확률의 합이 1), ${tex(`E(X)=${qTex(stats.mean)}`)}`, { after: distTableHtml(rows, blank) });
    } else if (ask === "linear") {
      const mean = int(-3, 8);
      const sd = int(1, 5);
      const a = pick([-3, -2, 2, 3, 4]);
      const b = int(-5, 5);
      const result = linearStats(q(mean), q(sd * sd), a, b);
      add(`확률변수 X에 대하여 ${tex(`E(X)=${mean},\\ \\sigma(X)=${sd}`)}일 때, 확률변수 ${tex(`Y=${a}X${b < 0 ? b : b ? `+${b}` : ""}`)}의 평균, 분산, 표준편차를 구하시오.`,
        `${tex(`E(Y)=${a}\\times${mean < 0 ? `(${mean})` : mean}${b < 0 ? b : `+${b}`}=${qTex(result.mean)},\\ V(Y)=${a * a}\\times${sd * sd}=${qTex(result.variance)},\\ \\sigma(Y)=|${a}|\\times${sd}=${Math.abs(a) * sd}`)}`);
    } else if (ask === "binomial") {
      const [n, p] = pick(BINOMIALS);
      const result = binomial(n, p);
      add(`확률변수 X가 이항분포 ${tex(`B\\left(${n},\\ ${qTex(p)}\\right)`)}를 따를 때, ${tex("E(X)")}, ${tex("V(X)")}, ${tex("\\sigma(X)")}를 구하시오.`,
        `${tex(`E(X)=np=${qTex(result.mean)},\\ V(X)=npq=${qTex(result.variance)},\\ \\sigma(X)=${sqrtQTex(result.variance)}`)}`);
    } else {
      const n = int(3, 5);
      const p = pick([q(1, 2), q(1, 3), q(2, 3), q(1, 4)]);
      const k = int(1, n - 1);
      const value = binomialExact(n, p, k);
      add(`한 번 던질 때 성공할 확률이 ${tex(qTex(p))}인 시행을 ${n}번 독립적으로 반복할 때, 정확히 ${k}번 성공할 확률을 구하시오.`,
        `${tex(`{}_{${n}}\\mathrm{C}_{${k}}\\left(${qTex(p)}\\right)^{${k}}\\left(${qTex(qSub(q(1), p))}\\right)^{${n - k}}=${qTex(value)}`)}`);
    }
  });
  return [{ heading: "확률분포", problems }];
}

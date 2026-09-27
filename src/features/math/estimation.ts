/* 확률과 통계 Ⅳ. 통계적 추정: 표본평균의 분포, 모평균·모비율의 신뢰구간과 신뢰구간의 길이, 필요한 표본의 크기입니다. */
import { mathProblem, num, radicalTex, tex, type SheetProblem, type SheetSection } from "./core";
import { eachAsk, picker } from "./pg-common";

/** 신뢰도별 z 값(교과서 값) */
export const CONFIDENCE = { 95: 1.96, 99: 2.58 } as const;
export type Confidence = keyof typeof CONFIDENCE;

/** 표본평균 X̄의 평균·표준편차 */
export const sampleMean = (mean: number, sd: number, n: number) => ({ mean, variance: (sd * sd) / n, sd: sd / Math.sqrt(n) });
/** 모평균의 신뢰구간 x̄ ± z·σ/√n */
export function meanInterval(xbar: number, sd: number, n: number, level: Confidence) {
  const half = (CONFIDENCE[level] * sd) / Math.sqrt(n);
  return { low: xbar - half, high: xbar + half, length: 2 * half, half };
}
/** 모비율의 신뢰구간 p̂ ± z·√(p̂q̂/n) */
export function proportionInterval(phat: number, n: number, level: Confidence) {
  const se = Math.sqrt((phat * (1 - phat)) / n);
  const half = CONFIDENCE[level] * se;
  return { low: phat - half, high: phat + half, length: 2 * half, se };
}
/** 신뢰구간의 길이가 length 이하가 되는 가장 작은 표본의 크기 */
export const sampleSizeFor = (sd: number, length: number, level: Confidence) => Math.ceil(((2 * CONFIDENCE[level] * sd) / length) ** 2 - 1e-9);

const fix = (value: number, digits = 2) => num(value, digits);

/* ───── 문제 ───── */
export type EstimationAsk = "sampleMean" | "meanCI" | "length" | "size" | "proportion";
export const estimationAsks: Record<EstimationAsk, string> = {
  sampleMean: "표본평균의 분포", meanCI: "모평균의 신뢰구간", length: "신뢰구간의 길이", size: "표본의 크기", proportion: "모비율의 추정",
};
/** σ/√n이 깔끔한 [σ, n] */
const MEAN_SETS: [number, number][] = [[10, 25], [8, 16], [12, 36], [5, 25], [6, 9], [20, 100], [15, 25], [14, 49], [9, 81]];
/** √(p̂q̂/n)이 깔끔한 [p̂, n] */
const PROPORTION_SETS: [number, number][] = [[0.5, 100], [0.2, 100], [0.4, 600], [0.9, 400], [0.6, 150], [0.8, 400], [0.5, 400], [0.1, 900]];

export function estimationProblems(asks: EstimationAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick, int } = picker(seed * 43 + 29);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string) => problems.push(mathProblem(html, answer, { space: 16 }));
  const note = `(단, Z가 표준정규분포를 따르는 확률변수일 때 ${tex("P(|Z|\\le 1.96)=0.95")}, ${tex("P(|Z|\\le 2.58)=0.99")}로 계산한다.)`;
  eachAsk(asks, perAsk, (ask, index) => {
    const [sd, n] = pick(MEAN_SETS);
    const level: Confidence = index % 2 ? 99 : 95;
    const z = CONFIDENCE[level];
    const xbar = pick([50, 64, 72, 100, 150, 250]) + int(0, 9) / 10;
    if (ask === "sampleMean") {
      const mean = pick([30, 50, 70, 100]);
      const result = sampleMean(mean, sd, n);
      add(`모평균이 ${mean}, 모표준편차가 ${sd}인 모집단에서 크기가 ${n}인 표본을 임의추출할 때, 표본평균 ${tex("\\bar{X}")}의 평균, 분산, 표준편차를 구하시오.`,
        `${tex(`E(\\bar{X})=${mean},\\ V(\\bar{X})=\\frac{${sd}^{2}}{${n}}=${fix(result.variance, 4)},\\ \\sigma(\\bar{X})=\\frac{${sd}}{\\sqrt{${n}}}=${fix(result.sd, 4)}`)}`);
    } else if (ask === "meanCI") {
      const interval = meanInterval(xbar, sd, n, level);
      add(`모표준편차가 ${sd}인 정규분포를 따르는 모집단에서 크기가 ${n}인 표본을 임의추출하여 구한 표본평균이 ${fix(xbar, 1)}일 때, 모평균 m에 대한 신뢰도 ${level}%의 신뢰구간을 구하시오. ${note}`,
        `${tex(`${fix(xbar, 1)}-${z}\\times\\frac{${sd}}{\\sqrt{${n}}}\\le m\\le ${fix(xbar, 1)}+${z}\\times\\frac{${sd}}{\\sqrt{${n}}}`)}, 곧 ${tex(`${fix(interval.low, 3)}\\le m\\le ${fix(interval.high, 3)}`)}`);
    } else if (ask === "length") {
      const interval = meanInterval(xbar, sd, n, level);
      add(`모표준편차가 ${sd}인 정규분포를 따르는 모집단에서 크기가 ${n}인 표본을 임의추출하여 모평균을 신뢰도 ${level}%로 추정할 때, 신뢰구간의 길이를 구하시오. ${note}`,
        `${tex(`2\\times${z}\\times\\frac{${sd}}{\\sqrt{${n}}}=${fix(interval.length, 3)}`)}`);
    } else if (ask === "size") {
      const k = pick([8, 10, 16, 20]);
      const sigma = pick([4, 5, 8, 10]);
      const length = (2 * z * sigma) / k;
      add(`모표준편차가 ${sigma}인 정규분포를 따르는 모집단에서 모평균을 신뢰도 ${level}%로 추정할 때, 신뢰구간의 길이가 ${fix(length, 3)} 이하가 되도록 하는 표본의 크기 n의 최솟값을 구하시오. ${note}`,
        `${k * k} (${tex(`2\\times${z}\\times\\frac{${sigma}}{\\sqrt{n}}\\le ${fix(length, 3)}`)}에서 ${tex(`\\sqrt{n}\\ge ${k}`)})`);
    } else {
      const [phat, size] = pick(PROPORTION_SETS);
      const interval = proportionInterval(phat, size, level);
      add(`어느 지역 주민 ${size}명을 임의추출하여 조사하였더니 ${Math.round(phat * size)}명이 찬성하였다. 이 지역 주민 전체의 찬성 비율 p에 대한 신뢰도 ${level}%의 신뢰구간을 구하시오. ${note}`,
        `${tex(`\\hat{p}=${fix(phat, 2)},\\ \\sqrt{\\frac{\\hat{p}\\hat{q}}{n}}=${fix(interval.se, 4)}`)}이므로 ${tex(`${fix(interval.low, 4)}\\le p\\le ${fix(interval.high, 4)}`)}`);
    }
  });
  return [{ heading: "통계적 추정", problems }];
}
/** σ/√n 을 TeX로(√n이 정수면 약분) */
export const seTex = (sd: number, n: number) => { const root = radicalTex(1, n); return /sqrt/.test(root) ? `\\frac{${sd}}{${root}}` : num(sd / Math.sqrt(n), 4); };

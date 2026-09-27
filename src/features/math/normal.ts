/* 확률과 통계 Ⅲ. 정규분포: 표준화, 표준정규분포표(erf 급수로 계산), 넓이 그래프, 이항분포의 정규분포 근사입니다. */
import { mathProblem, num, plotSvg, sheetTable, svgText, tex, type SheetProblem, type SheetSection } from "./core";
import { eachAsk, picker } from "./pg-common";

/** 오차 함수 erf(x). 테일러 급수로 |x| ≤ 4에서 소수 열째 자리까지 맞습니다. */
export function erf(x: number): number {
  if (x < 0) return -erf(-x);
  if (x > 4) return 1;
  let term = x;
  let sum = x;
  for (let n = 1; n < 200; n += 1) {
    term *= (-x * x) / n;
    const add = term / (2 * n + 1);
    sum += add;
    if (Math.abs(add) < 1e-16) break;
  }
  return (2 / Math.sqrt(Math.PI)) * sum;
}
/** P(0 ≤ Z ≤ z) */
export const zArea = (z: number) => 0.5 * erf(Math.abs(z) / Math.SQRT2) * Math.sign(z);
/** P(Z ≤ z) */
export const zCdf = (z: number) => 0.5 + zArea(z);
/** 표준정규분포표의 값(소수 넷째 자리) */
export const tableValue = (z: number) => Number(zArea(z).toFixed(4));
/** 표에서 쓰는 z 값: 0.0 ~ 3.0 (0.1 간격) */
export const TABLE_Z = Array.from({ length: 31 }, (_, index) => Number((index / 10).toFixed(1)));

/** 표준화 Z = (X − m)/σ */
export const standardize = (x: number, mean: number, sd: number) => (x - mean) / sd;
/** P(a ≤ X ≤ b), X ~ N(m, σ²) — a, b는 −Infinity·Infinity 가능 */
export const normalProb = (a: number, b: number, mean: number, sd: number) => zCdf(standardize(b, mean, sd)) - zCdf(standardize(a, mean, sd));

/** 정규분포 곡선과 색칠한 넓이 */
export function normalSvg(mean: number, sd: number, from: number, to: number, options: { title?: string; showZ?: boolean } = {}) {
  const density = (x: number) => Math.exp(-(((x - mean) / sd) ** 2) / 2) / (sd * Math.sqrt(2 * Math.PI));
  const lo = mean - 3.6 * sd;
  const hi = mean + 3.6 * sd;
  const peak = density(mean);
  const steps = 160;
  const curve: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => { const x = lo + ((hi - lo) * i) / steps; return [x, density(x)]; });
  const a = Math.max(lo, from);
  const b = Math.min(hi, to);
  const shade: [number, number][] = [];
  if (b > a) {
    shade.push([a, 0]);
    for (let i = 0; i <= 80; i += 1) { const x = a + ((b - a) * i) / 80; shade.push([x, density(x)]); }
    shade.push([b, 0]);
  }
  const marks = [-3, -2, -1, 0, 1, 2, 3];
  return plotSvg({
    xLabel: "x", yLabel: "", xMin: lo, xMax: hi, yMin: 0, yMax: peak * 1.2, width: 440, height: 230, hideTicks: true, title: options.title,
    series: [{ points: curve, color: "#1d4ed8", width: 2 }],
    areas: shade.length ? [{ points: shade, color: "#bfdbfe" }] : [],
    extra: (sx, sy) => marks.map(k => {
      const x = mean + k * sd;
      const label = options.showZ ? (k === 0 ? "0" : String(k)) : num(x, 2);
      return `<line x1="${sx(x).toFixed(1)}" y1="${sy(0).toFixed(1)}" x2="${sx(x).toFixed(1)}" y2="${(sy(0) + 4).toFixed(1)}" stroke="#111"/>${svgText(sx(x), sy(0) + 15, label, { size: 10, anchor: "middle", color: "#333" })}`;
    }).join("") + `<line x1="${sx(mean).toFixed(1)}" y1="${sy(0).toFixed(1)}" x2="${sx(mean).toFixed(1)}" y2="${sy(peak).toFixed(1)}" stroke="#94a3b8" stroke-dasharray="3 3"/>`,
  });
}

/** 표준정규분포표 HTML(z와 P(0 ≤ Z ≤ z)) — zs를 주면 그 값만 */
export function zTableHtml(zs: number[] = TABLE_Z) {
  const half = Math.ceil(zs.length / 2);
  const rows: string[][] = [];
  for (let i = 0; i < half; i += 1) {
    const right = zs[i + half];
    rows.push([num(zs[i], 1), tableValue(zs[i]).toFixed(4), right === undefined ? "" : num(right, 1), right === undefined ? "" : tableValue(right).toFixed(4)]);
  }
  return sheetTable(["z", "P(0 ≤ Z ≤ z)", "z", "P(0 ≤ Z ≤ z)"], rows, { font: "9.5pt" });
}
const smallTable = (zs: number[]) => {
  const unique = [...new Set(zs.map(z => Math.abs(z)))].sort((a, b) => a - b);
  return sheetTable(["z", ...unique.map(z => num(z, 1))], [["P(0 ≤ Z ≤ z)", ...unique.map(z => tableValue(z).toFixed(4))]], { font: "9.5pt" });
};

/* ───── 문제 ───── */
export type NormalAsk = "standardize" | "between" | "reverse" | "approx";
export const normalAsks: Record<NormalAsk, string> = { standardize: "표준화", between: "정규분포 확률", reverse: "확률로 값 구하기", approx: "이항분포의 정규분포 근사" };
const Z_VALUES = [0.5, 1, 1.5, 2, 2.5];
/** 평균·표준편차가 정수인 이항분포 [n, p분자, p분모, 평균, 표준편차] */
export const APPROX_SETS: [number, number, number, number, number][] = [[100, 1, 2, 50, 5], [400, 1, 5, 80, 8], [180, 1, 6, 30, 5], [900, 1, 10, 90, 9], [144, 1, 2, 72, 6], [192, 1, 4, 48, 6], [72, 1, 3, 24, 4]];
const fixed = (value: number) => value.toFixed(4);

export function normalProblems(asks: NormalAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick } = picker(seed * 59 + 17);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, options: Partial<SheetProblem> = {}) => problems.push(mathProblem(html, answer, { space: 16, ...options }));
  eachAsk(asks, perAsk, (ask, index) => {
    const mean = pick([50, 60, 65, 70, 80, 100, 170]);
    const sd = pick([2, 4, 5, 8, 10]);
    const z = pick(Z_VALUES);
    const X = `N\\left(${mean},\\ ${sd}^{2}\\right)`;
    if (ask === "standardize") {
      const x = mean + z * sd * (index % 2 ? -1 : 1);
      const up = index % 2 === 0;
      const value = up ? 0.5 - tableValue(z) : 0.5 - tableValue(z);
      add(`확률변수 X가 정규분포 ${tex(X)}를 따를 때, ${tex(up ? `P(X\\ge ${num(x, 1)})` : `P(X\\le ${num(x, 1)})`)}를 아래 표를 이용하여 구하시오.`,
        `${tex(`Z=\\frac{X-${mean}}{${sd}}`)}로 표준화하면 ${tex(up ? `P(Z\\ge ${num(z, 1)})` : `P(Z\\le -${num(z, 1)})`)} ${tex(`=0.5-${fixed(tableValue(z))}=${fixed(value)}`)}`,
        { after: smallTable([z]) });
    } else if (ask === "between") {
      const z1 = pick(Z_VALUES);
      const z2 = pick(Z_VALUES.filter(v => v !== z1));
      if (index % 2 === 0) {
        const value = tableValue(z1) + tableValue(z2);
        add(`확률변수 X가 정규분포 ${tex(X)}를 따를 때, ${tex(`P(${num(mean - z1 * sd, 1)}\\le X\\le ${num(mean + z2 * sd, 1)})`)}를 아래 표를 이용하여 구하시오.`,
          `${tex(`P(-${num(z1, 1)}\\le Z\\le ${num(z2, 1)})=${fixed(tableValue(z1))}+${fixed(tableValue(z2))}=${fixed(value)}`)}`, { after: smallTable([z1, z2]) });
      } else {
        const [small, big] = [Math.min(z1, z2), Math.max(z1, z2)];
        const value = tableValue(big) - tableValue(small);
        add(`확률변수 X가 정규분포 ${tex(X)}를 따를 때, ${tex(`P(${num(mean + small * sd, 1)}\\le X\\le ${num(mean + big * sd, 1)})`)}를 아래 표를 이용하여 구하시오.`,
          `${tex(`P(${num(small, 1)}\\le Z\\le ${num(big, 1)})=${fixed(tableValue(big))}-${fixed(tableValue(small))}=${fixed(value)}`)}`, { after: smallTable([small, big]) });
      }
    } else if (ask === "reverse") {
      const target = 0.5 - tableValue(z);
      const people = pick([500, 1000, 2000]);
      if (index % 2 === 0) add(`어느 학교 학생들의 시험 점수는 평균 ${mean}점, 표준편차 ${sd}점인 정규분포를 따른다. 점수가 상위 ${num(target * 100, 2)}% 안에 들려면 최소 몇 점 이상이어야 하는지 아래 표를 이용하여 구하시오.`,
        `${num(mean + z * sd, 1)}점 (${tex(`P(Z\\ge ${num(z, 1)})=${fixed(target)}`)}이므로 ${tex(`${mean}+${num(z, 1)}\\times${sd}`)})`, { after: smallTable([z]) });
      else add(`어느 과수원에서 수확한 사과 ${people}개의 무게는 평균 ${mean} g, 표준편차 ${sd} g인 정규분포를 따른다. 무게가 ${num(mean + z * sd, 1)} g 이상인 사과는 약 몇 개인지 아래 표를 이용하여 구하시오.`,
        `약 ${Math.round(people * target)}개 (${tex(`${people}\\times P(Z\\ge ${num(z, 1)})=${people}\\times${fixed(target)}`)})`, { after: smallTable([z]) });
    } else {
      const [n, top, bottom, m, s] = pick(APPROX_SETS);
      const k = pick([1, 1.5, 2]);
      const value = 0.5 - tableValue(k);
      add(`확률변수 X가 이항분포 ${tex(`B\\left(${n},\\ \\frac{${top}}{${bottom}}\\right)`)}를 따를 때, ${tex(`P(X\\ge ${num(m + k * s, 1)})`)}의 값을 정규분포를 이용하여 어림하시오. (아래 표 이용)`,
        `${tex(`E(X)=${m},\\ \\sigma(X)=${s}`)}이고 n이 충분히 크므로 X는 근사적으로 ${tex(`N(${m},\\ ${s}^{2})`)}를 따른다. ${tex(`P(Z\\ge ${num(k, 1)})=0.5-${fixed(tableValue(k))}=${fixed(value)}`)}`,
        { after: smallTable([k]) });
    }
  });
  return [{ heading: "정규분포", problems }];
}

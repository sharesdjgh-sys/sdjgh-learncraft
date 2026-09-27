/* 미적분Ⅰ Ⅲ: 적분. 부정적분·정적분(분수로 정확히), 곡선과 x축·두 곡선 사이의 넓이(부호가 바뀌는 곳에서 나눔), 속도와 위치 변화량·움직인 거리입니다. */
import { curvesSvg, intIn, nonZeroIn, P, pAnti, pDefinite, pDeriv, pEval, pFromRoots, pickOf, pSub, pTex, pVal, realRoots, yRange, type Poly } from "./calc-base";
import { mathProblem, num, q, qAdd, qFrom, qTex, seededRandom, tex, type Q, type SheetProblem, type SheetSection } from "./core";

const Qx = (value: number) => qFrom(value, 1000);
export const polyFrom = (coeffs: number[]) => P(...coeffs.map(Qx));

/** ∫|f(x)|dx on [a, b]: 구간 안의 근에서 나눠 더합니다. 근이 모두 유리수이면 정확한 값, 아니면 소수 값만 줍니다. */
export function absIntegral(poly: Poly, a: number, b: number) {
  const roots = realRoots(poly).filter(root => root.value > a + 1e-12 && root.value < b - 1e-12);
  const cuts = [Qx(a), ...roots.map(root => root.exact), Qx(b)];
  const exact = cuts.every(cut => cut !== null);
  const values = [a, ...roots.map(root => root.value), b];
  let approx = 0;
  let total: Q = q(0);
  const pieces: { from: number; to: number; signed: number }[] = [];
  for (let i = 0; i < values.length - 1; i += 1) {
    const F = pAnti(poly);
    const signed = pVal(F, values[i + 1]) - pVal(F, values[i]);
    approx += Math.abs(signed);
    pieces.push({ from: values[i], to: values[i + 1], signed });
    if (exact) { const piece = pDefinite(poly, cuts[i]!, cuts[i + 1]!); total = qAdd(total, piece.n < 0 ? q(-piece.n, piece.d) : piece); }
  }
  return { exact: exact ? total : null, approx, pieces, roots };
}
/** 두 곡선 y = f, y = g 사이의 넓이(구간 [a, b]); 구간을 주지 않으면 두 교점 사이 */
export function areaBetween(f: Poly, g: Poly, interval?: [number, number]) {
  const difference = pSub(f, g);
  const meets = realRoots(difference);
  const [a, b] = interval ?? (meets.length >= 2 ? [meets[0].value, meets[meets.length - 1].value] : [0, 0]);
  return { ...absIntegral(difference, a, b), a, b, meets };
}
/** 넓이 값 TeX */
export const areaTex = (result: { exact: Q | null; approx: number }) => result.exact ? qTex(result.exact) : `\\approx ${num(result.approx, 4)}`;

/** 곡선과 x축(또는 두 곡선) 사이를 색칠한 그림 */
export function areaSvg(f: Poly, g: Poly | null, a: number, b: number) {
  const other = g ?? P(0);
  const xMin = Math.floor(Math.min(a, -1) - 1); const xMax = Math.ceil(Math.max(b, 1) + 1);
  const sample: number[] = [];
  for (let x = xMin; x <= xMax; x += 0.1) sample.push(pVal(f, x), pVal(other, x));
  const [yMin, yMax] = yRange(sample.map(value => Math.max(-40, Math.min(40, value))));
  const steps = 120;
  const top: [number, number][] = []; const bottom: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) { const x = a + ((b - a) * i) / steps; top.push([x, pVal(f, x)]); bottom.unshift([x, pVal(other, x)]); }
  const curves = [{ f: (x: number) => pVal(f, x), color: "#2563eb", width: 2.4 }];
  if (g) curves.push({ f: (x: number) => pVal(g, x), color: "#dc2626", width: 2.2 });
  return curvesSvg(curves, { xMin, xMax, yMin, yMax, width: 420, height: 300, areas: b > a ? [{ points: [...top, ...bottom], color: "rgba(37,99,235,.18)" }] : undefined, legend: g ? [{ label: "y = f(x)", color: "#2563eb" }, { label: "y = g(x)", color: "#dc2626" }] : undefined });
}

/** 속도 v(t) 로 [0, T]의 위치 변화량과 움직인 거리 */
export function motionIntegral(velocity: Poly, t0: number, t1: number) {
  const displacement = pDefinite(velocity, Qx(t0), Qx(t1));
  const distance = absIntegral(velocity, t0, t1);
  return { displacement, distance };
}

/* ───── 문제 ───── */
export type IntegralAsk = "indefinite" | "fromDerivative" | "definite" | "symmetric" | "areaAxis" | "areaBetween" | "distance";
export const integralAsks: Record<IntegralAsk, string> = { indefinite: "부정적분", fromDerivative: "도함수로 함수 구하기", definite: "정적분", symmetric: "대칭 구간 정적분", areaAxis: "곡선과 x축 사이 넓이", areaBetween: "두 곡선 사이 넓이", distance: "속도와 거리" };
const randomPoly = (random: () => number, degree: number) => { const coeffs = Array.from({ length: degree + 1 }, () => intIn(random, -4, 5)); coeffs[degree] = nonZeroIn(random, -3, 4); return P(...coeffs); };

export function integralProblems(asks: IntegralAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 97 + 47);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 16, figure?: string) => problems.push(mathProblem(html, answer, { space, figure }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "indefinite") {
      // 계수가 정수로 떨어지게 원시함수를 먼저 정하고 미분합니다.
      const F = randomPoly(random, pickOf(random, [3, 3, 4]));
      const f = pDeriv(F);
      add(`부정적분 ${tex(`\\int(${pTex(f)})\\,dx`)}를 구하시오.`, `${tex(`${pTex(pSub(F, P(F[0])))}+C`)} (${tex("C")}는 적분상수)`, 10);
    } else if (ask === "fromDerivative") {
      const F = randomPoly(random, 3); const k = intIn(random, -1, 2);
      const f = pDeriv(F);
      add(`함수 ${tex("f(x)")}에 대하여 ${tex(`f'(x)=${pTex(f)}`)}이고 ${tex(`f(${k})=${qTex(pEval(F, k))}`)}일 때, ${tex("f(x)")}를 구하시오.`, `${tex(`f(x)=${pTex(F)}`)} &nbsp;(${tex(`f(x)=\\int f'(x)\\,dx`)}의 적분상수를 ${tex(`f(${k})`)}의 값으로 정함)`);
    } else if (ask === "definite") {
      const f = randomPoly(random, pickOf(random, [1, 2, 2, 3])); const a = intIn(random, -2, 1); const b = a + intIn(random, 1, 3);
      add(`정적분 ${tex(`\\int_{${a}}^{${b}}(${pTex(f)})\\,dx`)}의 값을 구하시오.`, `${tex(qTex(pDefinite(f, a, b)))} &nbsp;(${tex(`\\left[${pTex(pAnti(f))}\\right]_{${a}}^{${b}}`)})`);
    } else if (ask === "symmetric") {
      // ∫₋ₐᵃ 에서 홀수 차수 항은 0, 짝수 차수 항은 2∫₀ᵃ
      const f = P(intIn(random, -3, 4), nonZeroIn(random, -4, 4), intIn(random, 1, 3), nonZeroIn(random, -2, 2));
      const a = intIn(random, 1, 2);
      const even = P(f[0], 0, f[2]);
      add(`정적분 ${tex(`\\int_{-${a}}^{${a}}(${pTex(f)})\\,dx`)}의 값을 구하시오.`, `${tex(qTex(pDefinite(f, -a, a)))} &nbsp;(${tex(`=2\\int_{0}^{${a}}(${pTex(even)})\\,dx`)})`, 12);
    } else if (ask === "areaAxis") {
      const r1 = intIn(random, -2, 1); const r2 = r1 + intIn(random, 1, 3);
      const f = pFromRoots([r1, r2], pickOf(random, [1, -1, 3]));
      const [a, b] = random() < 0.5 ? [r1, r2] : [r1 - 1, r2];
      const result = absIntegral(f, a, b);
      add(`곡선 ${tex(`y=${pTex(f)}`)}와 ${tex("x")}축${a === r1 ? "으로 둘러싸인 부분" : ` 및 두 직선 ${tex(`x=${a}`)}, ${tex(`x=${b}`)}로 둘러싸인 부분`}의 넓이를 구하시오.`,
        `${tex(areaTex(result))} &nbsp;(${result.pieces.length > 1 ? `부호가 바뀌는 ${tex(`x=${r1}`)}에서 나누어 ` : ""}${tex(result.pieces.map(piece => `\\left|\\int_{${num(piece.from, 3).replace("−", "-")}}^{${num(piece.to, 3).replace("−", "-")}}f(x)\\,dx\\right|`).join("+"))})`, 16, areaSvg(f, null, a, b));
    } else if (ask === "areaBetween") {
      // y = x² + px + q 와 y = mx + n 이 x = α, β 에서 만나면 넓이 = (β − α)³ / 6
      const alpha = intIn(random, -2, 1); const beta = alpha + intIn(random, 1, 3);
      const m = intIn(random, -2, 2); const n = intIn(random, -2, 3);
      const line = P(n, m);
      const curve = pFromRoots([alpha, beta]);
      const f = P(qAdd(curve[0], q(n)), qAdd(curve[1], q(m)), curve[2]);
      const result = areaBetween(f, line);
      add(`곡선 ${tex(`y=${pTex(f)}`)}와 직선 ${tex(`y=${pTex(line)}`)}로 둘러싸인 부분의 넓이를 구하시오.`,
        `${tex(areaTex(result))} &nbsp;(교점의 ${tex(`x=${alpha},\\ ${beta}`)}, ${tex(`\\int_{${alpha}}^{${beta}}\\{(${pTex(line)})-(${pTex(f)})\\}dx`)})`, 16, areaSvg(f, line, alpha, beta));
    } else {
      // v(t) = (t − t₁)(t − t₂): 0 ~ T 사이 방향이 바뀝니다.
      const t1 = intIn(random, 1, 2); const t2 = t1 + intIn(random, 1, 2); const T = t2 + intIn(random, 0, 1);
      const v = pFromRoots([t1, t2]);
      const { displacement, distance } = motionIntegral(v, 0, T);
      add(`수직선 위를 움직이는 점 P의 시각 ${tex("t")}에서의 속도가 ${tex(`v(t)=${pTex(v, "t")}`)}일 때, ${tex(`t=0`)}에서 ${tex(`t=${T}`)}까지 점 P의 위치의 변화량과 움직인 거리를 구하시오.`,
        `위치의 변화량 ${tex(qTex(displacement))}, 움직인 거리 ${tex(areaTex(distance))} &nbsp;(움직인 거리는 ${tex(`\\int_{0}^{${T}}|v(t)|\\,dt`)}로, 속도의 부호가 바뀌는 ${tex(distance.roots.map(root => `t=${root.tex}`).join(",\\ "))}에서 나눔)`, 18);
    }
  }
  return [{ heading: "적분", problems }];
}

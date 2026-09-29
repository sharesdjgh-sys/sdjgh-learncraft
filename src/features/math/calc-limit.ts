/* 미적분Ⅰ Ⅰ: 함수의 극한과 연속. 구간별로 정의한 함수의 좌극한·우극한·함숫값·연속, 0/0·∞/∞ 꼴 극한, 극한값·연속으로 상수 정하기, 사잇값 정리입니다. */
import { casesTex, curvesSvg, intIn, nonZeroIn, openDot, P, pEval, pFromRoots, pickOf, pTex, pVal, realRoots, solidDot, yRange, type Poly } from "./calc-base";
import { mathProblem, num, q, qEq, qFrom, qNum, qTex, seededRandom, tex, type Q, type SheetProblem, type SheetSection } from "./core";

/** 한 점 x = a를 경계로 두 식을 붙인 함수: x < a 에서 left, x > a 에서 right, x = a 에서는 value(없으면 정의되지 않음) */
export type Piecewise = { a: number; left: number[]; right: number[]; value: number | null };
export const DEFAULT_PIECEWISE: Piecewise = { a: 1, left: [1, 0, 1], right: [3, -1, 0], value: 1 };
const polyOf = (coeffs: number[]) => P(...coeffs.map(value => qFrom(value, 1000)));
export function piecewiseFacts(piece: Piecewise) {
  const left = pEval(polyOf(piece.left), qFrom(piece.a, 1000));
  const right = pEval(polyOf(piece.right), qFrom(piece.a, 1000));
  const exists = qEq(left, right);
  const value = piece.value === null ? null : qFrom(piece.value, 1000);
  return { left, right, exists, value, continuous: exists && value !== null && qEq(value, left) };
}
/** f(x) = { … (x < a), … (x = a), … (x > a) } 를 cases 수식 HTML로 */
export function piecewiseHtml(piece: Piecewise) {
  const a = num(piece.a, 3).replace("−", "-");
  const rows: [string, string][] = [[pTex(polyOf(piece.left)), `x<${a}`]];
  if (piece.value !== null) rows.push([num(piece.value, 3).replace("−", "-"), `x=${a}`]);
  rows.push([pTex(polyOf(piece.right)), `x>${a}`]);
  return casesTex("f(x)=", rows);
}
export function piecewiseSvg(piece: Piecewise) {
  const left = polyOf(piece.left); const right = polyOf(piece.right);
  const xMin = Math.floor(piece.a - 4); const xMax = Math.ceil(piece.a + 4);
  const facts = piecewiseFacts(piece);
  const sample: number[] = [];
  for (let x = xMin; x <= xMax; x += 0.25) sample.push(x < piece.a ? pVal(left, x) : pVal(right, x));
  const [yMin, yMax] = yRange([...sample, qNum(facts.left), qNum(facts.right), piece.value ?? 0].map(value => Math.max(-30, Math.min(30, value))));
  return curvesSvg([
    { f: x => x < piece.a ? pVal(left, x) : NaN, color: "#2563eb", width: 2.4 },
    { f: x => x > piece.a ? pVal(right, x) : NaN, color: "#2563eb", width: 2.4 },
  ], {
    xMin, xMax, yMin, yMax, width: 400, height: 300,
    extra: (sx, sy) => {
      const dots: string[] = [];
      const l = qNum(facts.left); const r = qNum(facts.right);
      const filled = piece.value;
      // 함숫값과 같은 극한 쪽은 채운 점, 다르면 열린 점으로 그립니다.
      dots.push(filled !== null && Math.abs(filled - l) < 1e-9 ? solidDot(sx(piece.a), sy(l), "#2563eb") : openDot(sx(piece.a), sy(l), "#2563eb"));
      if (Math.abs(l - r) > 1e-9) dots.push(filled !== null && Math.abs(filled - r) < 1e-9 ? solidDot(sx(piece.a), sy(r), "#2563eb") : openDot(sx(piece.a), sy(r), "#2563eb"));
      if (filled !== null && Math.abs(filled - l) > 1e-9 && Math.abs(filled - r) > 1e-9) dots.push(solidDot(sx(piece.a), sy(filled), "#dc2626"));
      return dots.join("");
    },
  });
}

/* ───── 문제 ───── */
export type LimitAsk = "onesided" | "zero" | "radical" | "infinity" | "constant" | "continuous" | "ivt";
export const limitAsks: Record<LimitAsk, string> = { onesided: "좌극한·우극한", zero: "0/0 꼴", radical: "무리식의 극한", infinity: "∞/∞ 꼴", constant: "극한값과 미정계수", continuous: "연속과 상수", ivt: "사잇값 정리" };

const lim = (point: string) => `\\lim_{x\\to ${point}}`;
export function limitProblems(asks: LimitAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 79 + 37);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 14, figure?: string) => problems.push(mathProblem(html, answer, { space, figure }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "onesided") {
      const a = intIn(random, -1, 2);
      const piece: Piecewise = { a, left: [intIn(random, -2, 3), nonZeroIn(random, -2, 2), 0], right: [intIn(random, -2, 4), 0, pickOf(random, [0, 1, -1])], value: intIn(random, -2, 3) };
      const facts = piecewiseFacts(piece);
      const total = sumQ([facts.left, facts.right, q(piece.value!)]);
      add(`함수 ${piecewiseHtml(piece)}의 그래프가 그림과 같을 때, ${tex(`${lim(`${a}-`)}f(x)+${lim(`${a}+`)}f(x)+f(${a})`)}의 값을 구하시오.`,
        `${tex(qTex(total))} &nbsp;(${tex(`(${qTex(facts.left)})+(${qTex(facts.right)})+(${piece.value})`)})`, 10, piecewiseSvg(piece));
    } else if (ask === "zero") {
      // (x − a)(x − b)/(x − a) → a − b, 또는 (x³ − a³)/(x − a) → 3a²
      const a = nonZeroIn(random, -3, 3);
      if (random() < 0.6) {
        const b = pickOf(random, [-3, -2, -1, 1, 2, 3, 4].filter(value => value !== a));
        const top = pFromRoots([a, b]);
        add(`다음 극한값을 구하시오. ${tex(`${lim(String(a))}\\frac{${pTex(top)}}{${pTex(P(-a, 1))}}`)}`, `${tex(String(a - b))} &nbsp;(${tex(`\\frac{(${pTex(P(-a, 1))})(${pTex(P(-b, 1))})}{${pTex(P(-a, 1))}}=${pTex(P(-b, 1))}`)})`);
      } else {
        // (x³ − a³) / ((x − a)(x − b)) → 3a² / (a − b)
        const b = pickOf(random, [a + 1, a - 2, -a, a + 3].filter(value => value !== a));
        const bottom = pFromRoots([a, b]);
        const top = P(-(a ** 3), 0, 0, 1);
        add(`다음 극한값을 구하시오. ${tex(`${lim(String(a))}\\frac{${pTex(top)}}{${pTex(bottom)}}`)}`,
          `${tex(qTex(q(3 * a * a, a - b)))} &nbsp;(${tex(`\\frac{(${pTex(P(-a, 1))})(${pTex(P(a * a, a, 1))})}{(${pTex(P(-a, 1))})(${pTex(P(-b, 1))})}`)}로 약분)`);
      }
    } else if (ask === "radical") {
      // (√(x + k) − m)/(x − (m² − k)) → 1/(2m)
      const m = intIn(random, 1, 4); const k = intIn(random, -3, 5);
      const point = m * m - k;
      add(`다음 극한값을 구하시오. ${tex(`${lim(String(point))}\\frac{\\sqrt{${pTex(P(k, 1))}}-${m}}{${pTex(P(-point, 1))}}`)}`, `${tex(`\\frac{1}{${2 * m}}`)} &nbsp;(분자를 유리화: ${tex(`\\frac{1}{\\sqrt{${pTex(P(k, 1))}}+${m}}`)})`);
    } else if (ask === "infinity") {
      const degTop = pickOf(random, [1, 2, 2]); const degBottom = pickOf(random, [degTop, degTop, degTop + 1]);
      const make = (degree: number) => { const coeffs = Array.from({ length: degree + 1 }, () => intIn(random, -5, 5)); coeffs[degree] = nonZeroIn(random, -4, 5); return P(...coeffs); };
      const top = make(degTop); const bottom = make(degBottom);
      const value = degTop === degBottom ? q(top[degTop].n * bottom[degBottom].d, top[degTop].d * bottom[degBottom].n) : q(0);
      add(`다음 극한값을 구하시오. ${tex(`\\lim_{x\\to\\infty}\\frac{${pTex(top)}}{${pTex(bottom)}}`)}`, `${tex(qTex(value))} &nbsp;(분모의 최고차항 ${tex(degBottom === 1 ? "x" : `x^{${degBottom}}`)}으로 분자·분모를 나눔)`, 10);
    } else if (ask === "constant") {
      // lim_{x→c} (x² + ax + b)/(x − c) = L → c² + ac + b = 0, 2c + a = L
      const c = nonZeroIn(random, -3, 3); const L = nonZeroIn(random, -4, 6);
      const a = L - 2 * c; const b = -(c * c + a * c);
      add(`${tex(`${lim(String(c))}\\frac{x^{2}+ax+b}{${pTex(P(-c, 1))}}=${L}`)}일 때, 상수 ${tex("a,\\ b")}의 값을 구하시오.`,
        `${tex(`a=${a},\\ b=${b}`)} &nbsp;(분모 → 0이므로 분자 → 0: ${tex(`${c * c}${c === 1 ? "+" : c === -1 ? "-" : c > 0 ? `+${c}` : c}a+b=0`)}, 약분하면 ${tex(`${2 * c}+a=${L}`)})`, 16);
    } else if (ask === "continuous") {
      if (random() < 0.5) {
        const a = nonZeroIn(random, -2, 3); const b = pickOf(random, [-3, -1, 1, 2, 4].filter(value => value !== a));
        add(`함수 ${casesTex("f(x)=", [[`\\frac{${pTex(pFromRoots([a, b]))}}{${pTex(P(-a, 1))}}`, `x\\ne ${a}`], ["k", `x=${a}`]])}가 ${tex(`x=${a}`)}에서 연속일 때, 상수 ${tex("k")}의 값을 구하시오.`,
          `${tex(`k=${a - b}`)} &nbsp;(${tex(`${lim(String(a))}f(x)=f(${a})`)})`, 14);
      } else {
        const a = intIn(random, -1, 2); const m = nonZeroIn(random, -3, 3); const n = intIn(random, -3, 4);
        // x < a: x² + k,  x ≥ a: mx + n → a² + k = ma + n
        const k = m * a + n - a * a;
        add(`함수 ${casesTex("f(x)=", [["x^{2}+k", `x<${a}`], [pTex(P(n, m)), `x\\ge ${a}`]])}가 실수 전체의 집합에서 연속일 때, 상수 ${tex("k")}의 값을 구하시오.`,
          `${tex(`k=${k}`)} &nbsp;(${tex(`${a * a}+k=${m * a + n}`)})`, 12);
      }
    } else {
      // f(x) = x³ + px + q (p > 0이면 증가 함수라 실근이 하나) 의 실근이 정수가 아니게 고르고, 부호가 바뀌는 구간을 고르게 합니다.
      let poly: Poly = P(1, 1, 0, 1); let root = 0;
      for (let tries = 0; tries < 40; tries += 1) {
        const p = intIn(random, 1, 4); const c = intIn(random, -12, 12);
        poly = P(c, p, 0, 1);
        root = realRoots(poly)[0]?.value ?? 0;
        if (Math.abs(root - Math.round(root)) > 0.05 && root > -2 && root < 3) break;
      }
      const intervals = [[-2, -1], [-1, 0], [0, 1], [1, 2], [2, 3]];
      const right = intervals.findIndex(([lo, hi]) => root > lo && root < hi);
      const signs = intervals.map(([lo, hi]) => `${tex(`f(${lo})=${qTex(pEval(poly, lo))},\\ f(${hi})=${qTex(pEval(poly, hi))}`)}`);
      add(`방정식 ${tex(`${pTex(poly)}=0`)}의 실근이 존재하는 구간을 고르시오.<br>① ${tex("(-2,\\ -1)")} &nbsp; ② ${tex("(-1,\\ 0)")} &nbsp; ③ ${tex("(0,\\ 1)")} &nbsp; ④ ${tex("(1,\\ 2)")} &nbsp; ⑤ ${tex("(2,\\ 3)")}`,
        `${"①②③④⑤"[right]} (사잇값 정리: ${signs[right]}, 부호가 바뀜)`, 10);
    }
  }
  return [{ heading: "함수의 극한과 연속", problems }];
}
const sumQ = (values: Q[]) => values.reduce((acc, value) => q(acc.n * value.d + value.n * acc.d, acc.d * value.d), q(0));

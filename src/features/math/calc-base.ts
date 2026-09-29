/* 대수·미적분Ⅰ 도구가 함께 쓰는 다항식(정확한 분수 계수), 실근 찾기, 근호 표기, 함수 그래프 그리기와 문제 난수 도우미입니다. */
import katex from "katex";
import { escapeHtml, num, plotSvg, polyTex, q, qAdd, qDiv, qEq, qFrom, qMul, qNeg, qNum, qSub, qTex, sampleFunction, sqrtParts, texPlain, type PlotOptions, type PlotSeries, type Q } from "./core";

/* ───── 구간별 함수 표기 ───── */
/**
 * f(x) = { 식 (조건) … } 을 KaTeX cases로 그립니다. core의 tex()와 같은 자리 표시를 써서,
 * 한글에 붙여 넣을 때는 "f(x) = { x²+1 (x<1); 3−x (x≥1) }" 같은 글로 바뀝니다.
 */
export function casesTex(head: string, rows: [expression: string, condition: string][]) {
  const source = `${head}\\begin{cases}${rows.map(([expression, condition]) => `${expression} & (${condition})`).join("\\\\")}\\end{cases}`;
  const plain = `${texPlain(head)} { ${rows.map(([expression, condition]) => `${texPlain(expression)} (${texPlain(condition)})`).join("; ")} }`;
  const html = katex.renderToString(source, { throwOnError: false, output: "html", strict: "ignore" });
  return `<span class="mq" data-plain="${escapeHtml(plain)}">${html}</span><!--/mq-->`;
}

/* ───── 난수 도우미 ───── */
export const pickOf = <T,>(random: () => number, items: readonly T[]) => items[Math.floor(random() * items.length)];
export const intIn = (random: () => number, low: number, high: number) => low + Math.floor(random() * (high - low + 1));
export const nonZeroIn = (random: () => number, low: number, high: number) => { let value = 0; while (value === 0) value = intIn(random, low, high); return value; };

/* ───── 근호 ───── */
/** 음이 아닌 유리수 v의 제곱근 √v를 간단히 한 TeX입니다. 예: 12 → 2\sqrt{3}, 3/4 → \frac{\sqrt{3}}{2} */
export function sqrtQTex(value: Q) {
  if (value.n < 0) throw new Error("음수의 제곱근은 쓰지 않아요.");
  // √(n/d) = √(n·d) / d
  const { outside, inside } = sqrtParts(value.n * value.d);
  const coef = q(outside, value.d);
  if (inside === 1) return qTex(coef);
  const top = `${coef.n === 1 ? "" : coef.n}\\sqrt{${inside}}`;
  return coef.d === 1 ? top : `\\frac{${top}}{${coef.d}}`;
}
export const sqrtQ = (value: Q) => Math.sqrt(qNum(value));

/* ───── 다항식 ───── */
/** 계수 목록(poly[i]는 xⁱ의 계수)입니다. */
export type Poly = Q[];
const asQ = (value: number | Q): Q => typeof value === "number" ? qFrom(value) : value;
export function trim(poly: Poly): Poly {
  const out = [...poly];
  while (out.length > 1 && out[out.length - 1].n === 0) out.pop();
  return out.length ? out : [q(0)];
}
/** 낮은 차수부터 계수를 받습니다. 예: P(1, 0, 2) = 2x² + 1 */
export const P = (...coeffs: (number | Q)[]) => trim(coeffs.map(asQ));
export const deg = (poly: Poly) => { const t = trim(poly); return t.length === 1 && t[0].n === 0 ? -Infinity : t.length - 1; };
export function pAdd(a: Poly, b: Poly) { const out: Poly = []; for (let i = 0; i < Math.max(a.length, b.length); i += 1) out.push(qAdd(a[i] ?? q(0), b[i] ?? q(0))); return trim(out); }
export const pScale = (a: Poly, k: number | Q) => trim(a.map(c => qMul(c, asQ(k))));
export const pSub = (a: Poly, b: Poly) => pAdd(a, pScale(b, -1));
export function pMul(a: Poly, b: Poly) {
  const out: Poly = Array.from({ length: a.length + b.length - 1 }, () => q(0));
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = qAdd(out[i + j], qMul(x, y)); }));
  return trim(out);
}
/** 정확한 값 f(x) */
export const pEval = (poly: Poly, x: number | Q) => { const at = asQ(x); return poly.reduceRight((acc, c) => qAdd(qMul(acc, at), c), q(0)); };
/** 소수 값 f(x) */
export const pVal = (poly: Poly, x: number) => poly.reduceRight((acc, c) => acc * x + qNum(c), 0);
export const pDeriv = (poly: Poly) => trim(poly.slice(1).map((c, i) => qMul(c, q(i + 1))));
/** 부정적분(적분상수 0) */
export const pAnti = (poly: Poly) => trim([q(0), ...poly.map((c, i) => qDiv(c, q(i + 1)))]);
/** ∫ₐᵇ f(x)dx (정확한 값) */
export const pDefinite = (poly: Poly, a: number | Q, b: number | Q) => { const F = pAnti(poly); return qSub(pEval(F, b), pEval(F, a)); };
/** lead·(x − r₁)(x − r₂)… */
export const pFromRoots = (roots: (number | Q)[], lead: number | Q = 1) => roots.reduce<Poly>((acc, root) => pMul(acc, [qNeg(asQ(root)), q(1)]), [asQ(lead)]);
export const pTex = (poly: Poly, variable = "x") => polyTex(poly, variable);

/** 조립제법으로 (x − r)를 나눈 몫 */
function deflate(poly: Poly, root: Q) {
  const out: Q[] = [];
  let carry = q(0);
  for (let i = poly.length - 1; i >= 1; i -= 1) { carry = qAdd(qMul(carry, root), poly[i]); out.unshift(carry); }
  return trim(out);
}
const divisors = (value: number) => { const n = Math.abs(value); const out: number[] = []; for (let d = 1; d <= n && d <= 100000; d += 1) if (n % d === 0) out.push(d); return out; };

/** 실근 하나: 소수 값, TeX, 정확한 유리수(있으면), 중근 횟수 */
export type Root = { value: number; tex: string; exact: Q | null; multiplicity: number };
/** 다항식의 서로 다른 실근을 작은 순서로 찾습니다. 유리근과 이차식의 근은 정확히, 나머지는 소수로 구합니다. */
export function realRoots(input: Poly): Root[] {
  let poly = trim(input);
  if (deg(poly) <= 0) return [];
  const found: Root[] = [];
  const add = (root: Root) => {
    const same = found.find(item => Math.abs(item.value - root.value) < 1e-9);
    if (same) same.multiplicity += root.multiplicity; else found.push(root);
  };
  // 유리근 정리: 정수 계수로 바꾼 뒤 ±(상수항의 약수)/(최고차항의 약수)를 대입합니다.
  let changed = true;
  while (changed && deg(poly) >= 1) {
    changed = false;
    if (poly[0].n === 0) { add({ value: 0, tex: "0", exact: q(0), multiplicity: 1 }); poly = trim(poly.slice(1)); changed = true; continue; }
    const scale = poly.reduce((acc, c) => acc * c.d / gcdInt(acc, c.d), 1);
    const ints = poly.map(c => (c.n * scale) / c.d);
    const lead = ints[ints.length - 1];
    outer: for (const top of divisors(ints[0])) for (const bottom of divisors(lead)) for (const sign of [1, -1]) {
      const candidate = q(sign * top, bottom);
      if (pEval(poly, candidate).n === 0) { add({ value: qNum(candidate), tex: qTex(candidate), exact: candidate, multiplicity: 1 }); poly = deflate(poly, candidate); changed = true; break outer; }
    }
  }
  if (deg(poly) === 2) {
    const [c, b, a] = poly;
    const disc = qSub(qMul(b, b), qMul(q(4), qMul(a, c)));
    const center = qDiv(qNeg(b), qMul(q(2), a));
    if (disc.n === 0) add({ value: qNum(center), tex: qTex(center), exact: center, multiplicity: 2 });
    else if (disc.n > 0) {
      const half = qDiv(disc, qMul(q(4), qMul(a, a)));
      const shift = sqrtQTex(half);
      const lead = center.n === 0 ? "" : qTex(center);
      add({ value: qNum(center) - sqrtQ(half), tex: `${lead}-${shift}`, exact: null, multiplicity: 1 });
      add({ value: qNum(center) + sqrtQ(half), tex: center.n === 0 ? shift : `${lead}+${shift}`, exact: null, multiplicity: 1 });
    }
  } else if (deg(poly) === 1) {
    const root = qDiv(qNeg(poly[0]), poly[1]);
    add({ value: qNum(root), tex: qTex(root), exact: root, multiplicity: 1 });
  } else if (deg(poly) >= 3) {
    // 남은 식은 부호가 바뀌는 곳을 이분법으로 좁혀 소수로 구합니다.
    const leadAbs = Math.abs(qNum(poly[poly.length - 1]));
    const bound = 1 + Math.max(...poly.slice(0, -1).map(c => Math.abs(qNum(c)) / leadAbs));
    const steps = 4000;
    let prevX = -bound;
    let prevY = pVal(poly, prevX);
    for (let i = 1; i <= steps; i += 1) {
      const x = -bound + (2 * bound * i) / steps;
      const y = pVal(poly, x);
      if (prevY === 0) add({ value: prevX, tex: `${num(prevX, 3)}`, exact: null, multiplicity: 1 });
      else if (prevY * y < 0) {
        let lo = prevX; let hi = x;
        for (let k = 0; k < 80; k += 1) { const mid = (lo + hi) / 2; if (pVal(poly, lo) * pVal(poly, mid) <= 0) hi = mid; else lo = mid; }
        const value = (lo + hi) / 2;
        add({ value, tex: `${num(value, 3)}`, exact: null, multiplicity: 1 });
      }
      prevX = x; prevY = y;
    }
  }
  return found.sort((a, b) => a.value - b.value);
}
function gcdInt(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }

/* ───── 그래프 ───── */
export type Curve = { f: (x: number) => number; color?: string; dash?: boolean; width?: number; label?: string };
/** 여러 함수를 한 좌표평면에 그립니다(정의역 밖·범위 밖은 끊어 그림). */
export function curvesSvg(curves: Curve[], options: Omit<PlotOptions, "xLabel" | "yLabel"> & { xLabel?: string; yLabel?: string }) {
  const xMin = options.xMin ?? 0;
  const series: PlotSeries[] = [];
  for (const curve of curves) {
    const segments = sampleFunction(curve.f, xMin, options.xMax, { yMin: options.yMin, yMax: options.yMax });
    segments.forEach((points, index) => series.push({ points, color: curve.color, dash: curve.dash, width: curve.width, label: index === segments.length - 1 ? curve.label : undefined }));
  }
  return plotSvg({ xLabel: "x", yLabel: "y", width: 420, height: 300, ...options, series: [...series, ...(options.series ?? [])] });
}
/** 열린 점(속이 빈 동그라미) SVG 조각 — plotSvg의 extra에서 씁니다. */
export const openDot = (x: number, y: number, color = "#111") => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="#fff" stroke="${color}" stroke-width="1.6"/>`;
export const solidDot = (x: number, y: number, color = "#111") => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${color}"/>`;
/** 그래프가 들어갈 y 범위를 값들로 어림합니다(여유 15%). */
export function yRange(values: number[], fallback: [number, number] = [-5, 5]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return fallback;
  let low = Math.min(0, ...finite);
  let high = Math.max(0, ...finite);
  if (high - low < 1e-9) { low -= 1; high += 1; }
  const pad = (high - low) * 0.15;
  return [Math.floor(low - pad), Math.ceil(high + pad)];
}
export { qEq };

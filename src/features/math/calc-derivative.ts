/* 미적분Ⅰ Ⅱ: 미분. 다항함수의 도함수, 평균변화율과 미분계수, 접선의 방정식, 증감표·극값·그래프 개형, 닫힌구간의 최대·최소, 방정식의 실근 개수, 속도·가속도입니다. */
import { curvesSvg, intIn, nonZeroIn, P, pDeriv, pEval, pickOf, pSub, pTex, pVal, realRoots, solidDot, yRange, type Poly, type Root } from "./calc-base";
import { escapeHtml, mathProblem, num, q, qDiv, qFrom, qMul, qNum, qSub, qTex, seededRandom, tex, type Q, type SheetProblem, type SheetSection } from "./core";

/** 교사가 넣는 계수(낮은 차수부터, 소수 가능)를 정확한 다항식으로 바꿉니다. */
export const polyFrom = (coeffs: number[]) => P(...coeffs.map(value => qFrom(value, 1000)));
const Qx = (value: number) => qFrom(value, 1000);

/** 평균변화율 (f(b) − f(a)) / (b − a) */
export const averageRate = (poly: Poly, a: number, b: number) => qDiv(qSub(pEval(poly, Qx(b)), pEval(poly, Qx(a))), qSub(Qx(b), Qx(a)));
/** x = a 에서의 접선: 기울기 f′(a), y = f′(a)(x − a) + f(a) 를 y = mx + n 으로 */
export function tangentAt(poly: Poly, a: number) {
  const slope = pEval(pDeriv(poly), Qx(a));
  const value = pEval(poly, Qx(a));
  const intercept = qSub(value, qMul(slope, Qx(a)));
  return { slope, value, intercept, line: P(intercept, slope) };
}
export const lineTex = (line: Poly) => `y=${pTex(line)}`;

/* ───── 증감표 ───── */
export type Critical = { root: Root; value: Q | null; approx: number; kind: "max" | "min" | "none" };
/** f′(x) = 0 인 점마다 극대·극소를 가릅니다(f′의 부호 변화). */
export function criticalPoints(poly: Poly): Critical[] {
  const derivative = pDeriv(poly);
  const roots = realRoots(derivative);
  const eps = 1e-6;
  return roots.map(root => {
    const before = pVal(derivative, root.value - eps); const after = pVal(derivative, root.value + eps);
    const kind = before > 0 && after < 0 ? "max" : before < 0 && after > 0 ? "min" : "none";
    return { root, value: root.exact ? pEval(poly, root.exact) : null, approx: pVal(poly, root.value), kind };
  });
}
/** 증감표 HTML(학습지·화면 공통). */
export function signTableHtml(poly: Poly) {
  const points = criticalPoints(poly);
  const derivative = pDeriv(poly);
  const cell = (content: string, head = false) => `<${head ? "th" : "td"} style="border:1px solid #444;padding:1.2mm 2.4mm;text-align:center;${head ? "background:#f1f1f1" : ""}">${content}</${head ? "th" : "td"}>`;
  const xs = [cell(tex("x"), true)];
  const fp = [cell(tex("f'(x)"), true)];
  const fx = [cell(tex("f(x)"), true)];
  const gap = (x: number) => { const sign = pVal(derivative, x); xs.push(cell("⋯")); fp.push(cell(sign > 0 ? "+" : "−")); fx.push(cell(sign > 0 ? "↗" : "↘")); };
  const probe = [-Infinity, ...points.map(point => point.root.value), Infinity];
  for (let i = 0; i < probe.length - 1; i += 1) {
    const lo = probe[i]; const hi = probe[i + 1];
    gap(Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : Number.isFinite(lo) ? lo + 1 : Number.isFinite(hi) ? hi - 1 : 0);
    const point = points[i];
    if (point) {
      xs.push(cell(tex(point.root.tex)));
      fp.push(cell("0"));
      const valueTex = point.value ? qTex(point.value) : `\\approx ${num(point.approx, 3)}`;
      fx.push(cell(`${tex(valueTex)}${point.kind === "none" ? "" : `<br><span style="font-size:8.5pt">(${point.kind === "max" ? "극대" : "극소"})</span>`}`));
    }
  }
  return `<table style="border-collapse:collapse;margin:1.5mm 0;font-size:10pt"><tr>${xs.join("")}</tr><tr>${fp.join("")}</tr><tr>${fx.join("")}</tr></table>`;
}
/** 닫힌구간 [a, b]에서의 최댓값·최솟값(끝값과 극값 비교) */
export function extremaOn(poly: Poly, a: number, b: number) {
  const candidates = [a, b, ...realRoots(pDeriv(poly)).map(root => root.value).filter(x => x > a && x < b)];
  const values = candidates.map(x => ({ x, y: pVal(poly, x) }));
  const max = values.reduce((best, item) => item.y > best.y ? item : best);
  const min = values.reduce((best, item) => item.y < best.y ? item : best);
  return { max, min };
}
/** 방정식 f(x) = k 의 서로 다른 실근의 개수 */
export const rootCount = (poly: Poly, k: number) => realRoots(pSub(poly, P(Qx(k)))).length;

/** 그래프: 곡선, 접선(선택), 극점, y = k(선택), 닫힌구간(선택) */
export function derivativeSvg(poly: Poly, options: { tangent?: number; secant?: [number, number]; k?: number; interval?: [number, number]; extrema?: boolean } = {}) {
  const points = criticalPoints(poly);
  const keys = [...points.map(point => point.root.value), options.tangent ?? 0, ...(options.secant ?? []), ...(options.interval ?? [])];
  const xMin = Math.floor(Math.min(-3, ...keys) - 1.5); const xMax = Math.ceil(Math.max(3, ...keys) + 1.5);
  const sample: number[] = [];
  for (let x = Math.min(...keys, -2); x <= Math.max(...keys, 2); x += 0.1) sample.push(pVal(poly, x));
  const [yMin, yMax] = yRange([...sample, ...points.map(point => point.approx), options.k ?? 0].map(value => Math.max(-60, Math.min(60, value))));
  const curves = [{ f: (x: number) => pVal(poly, x), color: "#2563eb", width: 2.4 }];
  const legend: { label: string; color: string; dash?: boolean }[] = [];
  if (options.tangent !== undefined) { const line = tangentAt(poly, options.tangent).line; curves.push({ f: x => pVal(line, x), color: "#dc2626", width: 1.8 }); legend.push({ label: "접선", color: "#dc2626" }); }
  if (options.secant) {
    const [a, b] = options.secant;
    const slope = qNum(averageRate(poly, a, b)); const at = pVal(poly, a);
    curves.push({ f: x => at + slope * (x - a), color: "#16a34a", width: 1.6 }); legend.push({ label: "할선", color: "#16a34a" });
  }
  if (options.k !== undefined) { const k = options.k; curves.push({ f: () => k, color: "#7c3aed", width: 1.4 }); legend.push({ label: `y = ${num(k, 2)}`, color: "#7c3aed" }); }
  return curvesSvg(curves, {
    xMin, xMax, yMin, yMax, width: 440, height: 320, legend: legend.length ? legend : undefined,
    areas: options.interval ? [{ points: [[options.interval[0], yMin], [options.interval[0], yMax], [options.interval[1], yMax], [options.interval[1], yMin]], color: "rgba(250,204,21,.18)" }] : undefined,
    extra: (sx, sy) => (options.extrema === false ? [] : points.filter(point => point.kind !== "none")).map(point => solidDot(sx(point.root.value), sy(point.approx), point.kind === "max" ? "#dc2626" : "#16a34a")).join("")
      + (options.tangent !== undefined ? solidDot(sx(options.tangent), sy(pVal(poly, options.tangent)), "#dc2626") : ""),
  });
}

/* ───── 문제 ───── */
export type DerivAsk = "derivative" | "average" | "definition" | "tangent" | "slope";
export const derivAsks: Record<DerivAsk, string> = { derivative: "도함수", average: "평균변화율", definition: "미분계수의 정의", tangent: "접선의 방정식", slope: "기울기가 주어진 접선" };
export type UseAsk = "extremum" | "increasing" | "maxmin" | "roots" | "motion";
export const useAsks: Record<UseAsk, string> = { extremum: "극댓값·극솟값", increasing: "증가 조건", maxmin: "닫힌구간 최대·최소", roots: "실근의 개수", motion: "속도·가속도" };

/** f′(x) = 3a(x − p)(x − r) 가 되도록 f(x) = a(x³ − 3(p+r)/2·x² + 3pr·x) + c 를 만듭니다(p + r 은 짝수). */
function cubicWithCritical(random: () => number) {
  let p = 0; let r = 0;
  while (r - p < 2 || (p + r) % 2 !== 0) { p = intIn(random, -3, 2); r = intIn(random, -1, 4); }
  const a = pickOf(random, [1, 1, -1, 2]); const c = intIn(random, -4, 5);
  return { poly: P(c, 3 * a * p * r, (-3 * a * (p + r)) / 2, a), p, r, a };
}
const randomPoly = (random: () => number, degree: number) => { const coeffs = Array.from({ length: degree + 1 }, () => intIn(random, -4, 5)); coeffs[degree] = nonZeroIn(random, -2, 3); return P(...coeffs); };

export function derivProblems(asks: DerivAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 83 + 41);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 14) => problems.push(mathProblem(html, answer, { space }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "derivative") {
      const poly = randomPoly(random, pickOf(random, [3, 3, 4])); const k = intIn(random, -2, 3);
      add(`함수 ${tex(`f(x)=${pTex(poly)}`)}에 대하여 ${tex("f'(x)")}와 ${tex(`f'(${k})`)}의 값을 구하시오.`, `${tex(`f'(x)=${pTex(pDeriv(poly))},\\ f'(${k})=${qTex(pEval(pDeriv(poly), k))}`)}`, 12);
    } else if (ask === "average") {
      // 이차함수는 구간 [a, b]의 평균변화율 = f′((a+b)/2)
      const poly = randomPoly(random, 2); const a = intIn(random, -3, 1); const b = a + 2 * intIn(random, 1, 2);
      const rate = averageRate(poly, a, b);
      add(`함수 ${tex(`f(x)=${pTex(poly)}`)}에서 ${tex("x")}의 값이 ${tex(String(a))}에서 ${tex(String(b))}까지 변할 때의 평균변화율과, 이 값이 ${tex("f'(c)")}와 같아지는 ${tex("c")}의 값을 구하시오.`,
        `평균변화율 ${tex(qTex(rate))}, ${tex(`c=${(a + b) / 2}`)} &nbsp;(${tex(`\\frac{f(${b})-f(${a})}{${b}-${a < 0 ? `(${a})` : a}}`)}, 이차함수는 구간의 가운데에서 같아짐)`);
    } else if (ask === "definition") {
      const poly = randomPoly(random, 2); const a = intIn(random, -2, 3); const m = pickOf(random, [2, 3, -1]);
      const slope = pEval(pDeriv(poly), a);
      add(`함수 ${tex(`f(x)=${pTex(poly)}`)}에 대하여 다음 극한값을 구하시오. ${tex(`\\lim_{h\\to0}\\frac{f(${a}${m < 0 ? "-" : "+"}${Math.abs(m) === 1 ? "" : Math.abs(m)}h)-f(${a})}{h}`)}`,
        `${tex(qTex(qMul(slope, q(m))))} &nbsp;(${tex(`${m}f'(${a})=${m}\\times${slope.n < 0 ? `(${qTex(slope)})` : qTex(slope)}`)})`);
    } else if (ask === "tangent") {
      const poly = randomPoly(random, pickOf(random, [2, 3])); const a = intIn(random, -2, 2);
      const t = tangentAt(poly, a);
      add(`곡선 ${tex(`y=${pTex(poly)}`)} 위의 점 ${tex(`(${a},\\ ${qTex(t.value)})`)}에서의 접선의 방정식을 구하시오.`, `${tex(lineTex(t.line))} &nbsp;(기울기 ${tex(`f'(${a})=${qTex(t.slope)}`)})`);
    } else {
      // y = x² + bx + c 에 기울기 m 인 접선: 2x + b = m
      const b = intIn(random, -4, 4); const c = intIn(random, -3, 5); const x0 = intIn(random, -2, 3);
      const m = 2 * x0 + b;
      const poly = P(c, b, 1);
      const t = tangentAt(poly, x0);
      add(`곡선 ${tex(`y=${pTex(poly)}`)}에 접하고 기울기가 ${tex(String(m))}인 직선의 방정식을 구하시오.`, `${tex(lineTex(t.line))} &nbsp;(${tex(`y'=${pTex(pDeriv(poly))}=${m}`)}에서 접점의 ${tex(`x=${x0}`)})`);
    }
  }
  return [{ heading: "미분계수와 도함수", problems }];
}

export function useProblems(asks: UseAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 89 + 43);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 16, figure?: string) => problems.push(mathProblem(html, answer, { space, figure }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "extremum" || ask === "roots") {
      const { poly, p, r, a } = cubicWithCritical(random);
      const atP = pEval(poly, p); const atR = pEval(poly, r);
      const [maxX, maxV, minX, minV] = a > 0 ? [p, atP, r, atR] : [r, atR, p, atP];
      if (ask === "extremum") add(`함수 ${tex(`f(x)=${pTex(poly)}`)}의 극댓값과 극솟값을 구하시오.`,
        `극댓값 ${tex(`f(${maxX})=${qTex(maxV)}`)}, 극솟값 ${tex(`f(${minX})=${qTex(minV)}`)} &nbsp;(${tex(`f'(x)=${pTex(pDeriv(poly))}`)})<div>${signTableHtml(poly)}</div>`, 18);
      else {
        const count = Math.max(0, Math.ceil(qNum(maxV)) - Math.floor(qNum(minV)) - 1);
        add(`방정식 ${tex(`${pTex(poly)}=k`)}가 서로 다른 세 실근을 갖도록 하는 정수 ${tex("k")}의 개수를 구하시오.`,
          `${count}개 &nbsp;(극솟값 ${tex(qTex(minV))} ${tex("<k<")} 극댓값 ${tex(qTex(maxV))})`, 16, derivativeSvg(poly));
      }
    } else if (ask === "increasing") {
      // f(x) = x³ + ax² + bx 가 실수 전체에서 증가 ⇔ a² − 3b ≤ 0, b = 3k² 이면 −3k ≤ a ≤ 3k
      const k = intIn(random, 1, 3); const b = 3 * k * k;
      add(`함수 ${tex(`f(x)=x^{3}+ax^{2}+${b}x+1`)}이 실수 전체의 집합에서 증가하도록 하는 실수 ${tex("a")}의 값의 범위를 구하시오.`,
        `${tex(`-${3 * k}\\le a\\le ${3 * k}`)} &nbsp;(${tex(`f'(x)=3x^{2}+2ax+${b}\\ge0`)}이려면 ${tex(`\\frac{D}{4}=a^{2}-${3 * b}\\le0`)})`);
    } else if (ask === "maxmin") {
      const { poly, p, r } = cubicWithCritical(random);
      const lo = p - intIn(random, 1, 2); const hi = r + intIn(random, 0, 1);
      const { max, min } = extremaOn(poly, lo, hi);
      // 같은 값이 두 점에서 나오면 두 점을 모두 적습니다.
      const at = (value: number) => [lo, hi, p, r].filter((x, i, all) => x >= lo && x <= hi && all.indexOf(x) === i && Math.abs(pVal(poly, x) - value) < 1e-9).sort((s, t) => s - t).map(x => `x=${x}`).join(",\\ ");
      add(`닫힌구간 ${tex(`[${lo},\\ ${hi}]`)}에서 함수 ${tex(`f(x)=${pTex(poly)}`)}의 최댓값과 최솟값을 구하시오.`,
        `최댓값 ${tex(`${qTex(pEval(poly, qFrom(max.x)))}\\ (${at(max.y)})`)}, 최솟값 ${tex(`${qTex(pEval(poly, qFrom(min.x)))}\\ (${at(min.y)})`)} &nbsp;(끝값 ${tex(`f(${lo}),\\ f(${hi})`)}와 극값을 비교)`);
    } else {
      // x(t) = t³ − 3(t₁+t₂)/2·t² + 3t₁t₂·t,  v = 3(t − t₁)(t − t₂)
      let t1 = 0; let t2 = 0;
      while ((t1 + t2) % 2 !== 0 || t2 <= t1) { t1 = intIn(random, 1, 3); t2 = intIn(random, 2, 6); }
      const x = P(0, 3 * t1 * t2, (-3 * (t1 + t2)) / 2, 1);
      const v = pDeriv(x); const acc = pDeriv(v);
      const t = intIn(random, 1, t2 + 1);
      add(`수직선 위를 움직이는 점 P의 시각 ${tex("t\\ (t\\ge0)")}에서의 위치가 ${tex(`x(t)=${pTex(x, "t")}`)}일 때, 시각 ${tex(`t=${t}`)}에서 점 P의 속도와 가속도를 구하고, 점 P가 운동 방향을 바꾸는 시각을 모두 구하시오.`,
        `속도 ${tex(`v(${t})=${qTex(pEval(v, t))}`)}, 가속도 ${tex(`a(${t})=${qTex(pEval(acc, t))}`)}, 운동 방향을 바꾸는 시각 ${tex(`t=${t1},\\ ${t2}`)} &nbsp;(${tex(`v(t)=${pTex(v, "t")}=3(t-${t1})(t-${t2})`)})`, 18);
    }
  }
  return [{ heading: "도함수의 활용", problems }];
}

/** 화면용 계산 요약(증감표 아래 한 줄) */
export function criticalSummary(poly: Poly) {
  const points = criticalPoints(poly).filter(point => point.kind !== "none");
  if (!points.length) return escapeHtml("극값이 없어요(증가하거나 감소하기만 해요).");
  return points.map(point => `${point.kind === "max" ? "극댓값" : "극솟값"} ${tex(`f(${point.root.tex})=${point.value ? qTex(point.value) : `\\approx ${num(point.approx, 3)}`}`)}`).join(" · ");
}

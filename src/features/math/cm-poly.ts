/* 공통수학 1 · 다항식: 다항식의 연산(곱셈 공식), 조립제법, 나머지 정리, 인수 정리와 인수분해, 항등식의 미정계수입니다. 계수는 분수(Q)로 정확하게 다룹니다. */
import { escapeHtml, mathProblem, polyTex, q, qAdd, qDiv, qEq, qFrom, qMul, qNeg, qSub, qTex, tex, type Q, type SheetSection } from "./core";
import { buildSections, nTex, pTex, tj, type Rng } from "./cm-util";

/** 다항식: p[i]는 xⁱ의 계수입니다. */
export type Poly = Q[];
export const poly = (coeffs: number[]): Poly => trim(coeffs.map(value => qFrom(value)));
export function trim(p: Poly): Poly {
  const out = [...p];
  while (out.length > 1 && out[out.length - 1].n === 0) out.pop();
  return out.length ? out : [q(0)];
}
export const degree = (p: Poly) => trim(p).length - 1;
export function add(a: Poly, b: Poly): Poly { return trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => qAdd(a[i] ?? q(0), b[i] ?? q(0)))); }
export const scale = (a: Poly, k: Q): Poly => trim(a.map(c => qMul(c, k)));
export const sub = (a: Poly, b: Poly) => add(a, scale(b, q(-1)));
export function mul(a: Poly, b: Poly): Poly {
  const out: Q[] = Array.from({ length: a.length + b.length - 1 }, () => q(0));
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = qAdd(out[i + j], qMul(x, y)); }));
  return trim(out);
}
export const power = (a: Poly, n: number) => Array.from({ length: n }).reduce<Poly>(acc => mul(acc, a), [q(1)]);
/** f(a) — 호너 방법 */
export const evaluate = (p: Poly, x: Q) => [...p].reverse().reduce((acc, c) => qAdd(qMul(acc, x), c), q(0));
export const ptex = (p: Poly, variable = "x") => polyTex(p, variable);
/** (x − a) 인수 */
export const linear = (root: number | Q): Poly => [qNeg(typeof root === "number" ? q(root) : root), q(1)];

/** 조립제법: f(x)를 x − a로 나눈 몫과 나머지, 표에 적을 세 줄입니다. */
export function synthetic(p: Poly, a: Q) {
  const top = [...trim(p)].reverse();
  const bottom: Q[] = [];
  const middle: (Q | null)[] = [null];
  top.forEach((c, i) => {
    if (i === 0) { bottom.push(c); return; }
    const carried = qMul(bottom[i - 1], a);
    middle.push(carried);
    bottom.push(qAdd(c, carried));
  });
  const remainder = bottom[bottom.length - 1];
  const quotient = trim(bottom.slice(0, -1).reverse());
  return { top, middle, bottom, remainder, quotient: bottom.length > 1 ? quotient : [q(0)] };
}
/** 조립제법 표(HTML)입니다. 빈칸으로 두면 학습지에서 채우게 할 수 있습니다. */
export function syntheticHtml(p: Poly, a: Q, blank = false) {
  const { top, middle, bottom } = synthetic(p, a);
  const last = top.length - 1;
  // 윗줄: 나누는 수 a | 계수, 가운데 줄: 내려 곱한 값(아래에 가로줄), 아랫줄: 몫의 계수와 나머지(점선으로 나눔)
  const cell = (value: Q | null, index: number, style: string, hide: boolean) =>
    `<td style="padding:1.2mm 3mm;text-align:center;min-width:9mm;${style}${index === last ? "border-left:1px dashed #666;" : ""}">${value === null ? "" : hide ? "&nbsp;" : tex(qTex(value))}</td>`;
  const row = (values: (Q | null)[], style: string, first: string, hide: boolean) =>
    `<tr><td style="padding:1.2mm 3mm;text-align:center;border-right:1.5px solid #111;">${first}</td>${values.map((value, index) => cell(value, index, style, hide)).join("")}</tr>`;
  return `<table style="border-collapse:collapse;margin:1.5mm 0;font-size:10.5pt">${row(top, "", tex(qTex(a)), false)}${row(middle, "border-bottom:1.5px solid #111;", "", blank)}${row(bottom, "font-weight:700;", "", blank)}</table>`;
}

/** 정수 계수 다항식의 유리수 근을 모두 찾아 (x − 근)으로 나눕니다. 남은 인수는 rest에 둡니다. */
export function factorRational(p: Poly) {
  let rest = trim(p);
  const roots: Q[] = [];
  const candidates = () => {
    const constant = rest.find(c => c.n !== 0);
    const lead = rest[rest.length - 1];
    if (!constant || rest.some(c => c.d !== 1)) return [] as Q[];
    const divisors = (n: number) => { const out: number[] = []; for (let k = 1; k <= Math.abs(n); k += 1) if (n % k === 0) out.push(k); return out; };
    const list: Q[] = [];
    for (const top of divisors(constant.n)) for (const bottom of divisors(lead.n)) for (const sign of [1, -1]) list.push(q(sign * top, bottom));
    return list;
  };
  // 0이 근이면 먼저 x로 묶습니다.
  while (degree(rest) > 0 && rest[0].n === 0) { roots.push(q(0)); rest = trim(rest.slice(1)); }
  for (let guard = 0; guard < 8 && degree(rest) > 0; guard += 1) {
    const found = candidates().find(c => evaluate(rest, c).n === 0);
    if (!found) break;
    roots.push(found);
    rest = synthetic(rest, found).quotient;
  }
  return { roots, rest };
}
/** 인수분해 결과 TeX. 같은 근은 거듭제곱으로 묶고, 분수 근은 (2x − 1)처럼 정수 계수로 적습니다. */
export function factorTex(p: Poly) {
  const { roots, rest } = factorRational(p);
  if (!roots.length) return ptex(p);
  let lead = rest;
  const groups: { factor: string; count: number }[] = [];
  for (const root of roots) {
    // (x − n/d) = (dx − n)/d 이므로 남은 인수에서 1/d를 빼 줍니다.
    const factor = root.n === 0 ? "x" : `(${root.d === 1 ? "x" : `${root.d}x`}${root.n > 0 ? "-" : "+"}${Math.abs(root.n)})`;
    lead = scale(lead, q(1, root.d));
    const found = groups.find(group => group.factor === factor);
    if (found) found.count += 1; else groups.push({ factor, count: 1 });
  }
  const body = groups.map(group => `${group.factor}${group.count > 1 ? `^{${group.count}}` : ""}`).join("");
  if (degree(lead) === 0) {
    const c = lead[0];
    return qEq(c, q(1)) ? body : qEq(c, q(-1)) ? `-${body}` : `${qTex(c)}${body}`;
  }
  return `${body}(${ptex(lead)})`;
}

/* ───── 문제 ───── */
export type PolyAsk = "expand" | "divide" | "remainder" | "unknown" | "factor" | "identity";
export const polyAsks: Record<PolyAsk, string> = { expand: "곱셈 공식 전개", divide: "조립제법(몫·나머지)", remainder: "나머지 정리", unknown: "나머지로 미지수 구하기", factor: "인수분해(인수 정리)", identity: "항등식 미정계수" };

const t = tex;
function makePolyProblem(ask: PolyAsk, r: Rng) {
  if (ask === "expand") {
    const kind = r.pick(["cube", "cubeMinus", "three", "square3", "sumCubes"] as const);
    const a = r.pick([1, 2, 3]);
    const b = r.nonzero(-4, 4);
    let expr = "";
    let result: Poly;
    if (kind === "cube" || kind === "cubeMinus") {
      // (3x − 3)³처럼 공통인수가 있는 식은 피합니다.
      const bb = (kind === "cube" ? 1 : -1) * (Math.abs(b) % a === 0 && a > 1 ? Math.abs(b) + 1 : Math.abs(b));
      expr = `(${a === 1 ? "" : a}x${bb < 0 ? "-" : "+"}${Math.abs(bb)})^{3}`;
      result = power(poly([bb, a]), 3);
    } else if (kind === "three") {
      const [x1, x2, x3] = r.distinct(-5, 5, 3, [0]);
      expr = [x1, x2, x3].map(value => `(x${value < 0 ? "-" : "+"}${Math.abs(value)})`).join("");
      result = mul(mul(poly([x1, 1]), poly([x2, 1])), poly([x3, 1]));
    } else if (kind === "square3") {
      const c = r.nonzero(-3, 3);
      expr = `(x^{2}${b < 0 ? "-" : "+"}${Math.abs(b) === 1 ? "" : Math.abs(b)}x${c < 0 ? "-" : "+"}${Math.abs(c)})^{2}`;
      result = power(poly([c, b, 1]), 2);
    } else {
      const bb = Math.abs(b);
      const sign = r.pick([1, -1]);
      expr = `(x${sign < 0 ? "-" : "+"}${bb})(x^{2}${sign < 0 ? "+" : "-"}${bb}x+${bb * bb})`;
      result = mul(poly([sign * bb, 1]), poly([bb * bb, -sign * bb, 1]));
    }
    return mathProblem(`다음 식을 전개하시오. ${t(expr)}`, `${t(ptex(result))}`, { space: 12 });
  }
  if (ask === "divide" || ask === "remainder") {
    const deg = r.pick([3, 3, 4]);
    const coeffs = Array.from({ length: deg + 1 }, (_, i) => i === deg ? r.pick([1, 1, 2]) : r.int(-6, 6));
    const p = poly(coeffs);
    const a = q(r.nonzero(-3, 3));
    const { quotient, remainder } = synthetic(p, a);
    const divisor = `x${a.n < 0 ? "+" : "-"}${Math.abs(a.n)}`;
    if (ask === "divide") return mathProblem(`조립제법을 이용하여 다항식 ${tj(ptex(p), "을")} ${tj(divisor, "으로")} 나누었을 때의 몫과 나머지를 구하시오.`,
      `몫 ${t(ptex(quotient))}, 나머지 ${t(qTex(remainder))}`, { space: 22, answerFigure: syntheticHtml(p, a) });
    return mathProblem(`다항식 ${tj(`f(x)=${ptex(p)}`, "을")} ${tj(divisor, "으로")} 나누었을 때의 나머지를 구하시오.`, `${t(qTex(remainder))} (나머지 정리: ${t(`f(${nTex(a)})=${qTex(remainder)}`)})`, { space: 12 });
  }
  if (ask === "unknown") {
    // x³ + kx² + bx + c 를 x − a로 나눈 나머지가 R일 때 k: a³ + k a² + b a + c = R
    const a = r.nonzero(-2, 2);
    const k = r.nonzero(-4, 4);
    const b = r.int(-5, 5);
    const c = r.int(-6, 6);
    const remainder = a ** 3 + k * a * a + b * a + c;
    const known = `x^{3}+kx^{2}${b === 0 ? "" : `${b < 0 ? "-" : "+"}${Math.abs(b) === 1 ? "" : Math.abs(b)}x`}${c === 0 ? "" : `${c < 0 ? "-" : "+"}${Math.abs(c)}`}`;
    return mathProblem(`다항식 ${tj(known, "을")} ${tj(`x${a < 0 ? "+" : "-"}${Math.abs(a)}`, "으로")} 나누었을 때의 나머지가 ${t(nTex(remainder))}일 때, 상수 ${t("k")}의 값을 구하시오.`,
      `${t(`k=${k}`)} (${t(`${pTex(a)}^{3}+k\\cdot ${pTex(a)}^{2}${b === 0 ? "" : `${b < 0 ? "-" : "+"}${Math.abs(b)}\\cdot ${pTex(a)}`}${c === 0 ? "" : `${c < 0 ? "-" : "+"}${Math.abs(c)}`}=${remainder}`)})`, { space: 12 });
  }
  if (ask === "factor") {
    const deg = r.pick([3, 3, 4]);
    const roots = Array.from({ length: deg }, () => r.int(-4, 4));
    // 너무 뻔하지 않게 서로 다른 근이 두 개 이상 되도록 합니다.
    if (new Set(roots).size < 2) roots[0] = roots[0] === 1 ? -1 : 1;
    const p = roots.reduce<Poly>((acc, root) => mul(acc, linear(root)), [q(1)]);
    return mathProblem(`다음 식을 인수분해하시오. ${t(ptex(p))}`, `${t(factorTex(p))} (${t(`f(${roots[0]})=0`)}이므로 인수 정리에 의해 ${tj(roots[0] === 0 ? "x" : `x${roots[0] < 0 ? "+" : "-"}${Math.abs(roots[0])}`, "으로")} 나누어떨어진다.)`, { space: 14 });
  }
  // 항등식: x³ + ax² + bx + c = (x − r1)(x − r2)(x + k) 에서 a, b, k를 구합니다.
  const [r1, r2] = r.distinct(-4, 4, 2, [0]);
  const k = r.nonzero(-4, 4);
  const p = mul(mul(linear(r1), linear(r2)), poly([k, 1]));
  const [c0, c1, c2] = p.map(c => c.n);
  const right = `(x${r1 < 0 ? "+" : "-"}${Math.abs(r1)})(x${r2 < 0 ? "+" : "-"}${Math.abs(r2)})(x+c)`;
  return mathProblem(`등식 ${t(`x^{3}+ax^{2}+bx${c0 < 0 ? "-" : "+"}${Math.abs(c0)}=${right}`)}가 ${t("x")}에 대한 항등식일 때, 상수 ${t("a, b, c")}의 값을 구하시오.`,
    `${t(`a=${c2 ?? 0},\\ b=${c1 ?? 0},\\ c=${k}`)} (상수항 비교: ${t(`${pTex(-r1)}\\cdot${pTex(-r2)}\\cdot c=${c0}`)})`, { space: 14 });
}
export function polyProblems(asks: PolyAsk[], count: number, seed: number): SheetSection[] {
  return buildSections(asks, polyAsks, count, seed, (ask, r) => makePolyProblem(ask, r));
}

/** 교사가 쓴 계수 글(높은 차수부터, 쉼표·공백)을 다항식으로 읽습니다. */
export function parseCoefficients(text: string): Poly | null {
  const parts = text.split(/[,\s]+/).filter(Boolean);
  if (!parts.length || parts.length > 7) return null;
  const numbers = parts.map(part => part.includes("/") ? Number(part.split("/")[0]) / Number(part.split("/")[1]) : Number(part));
  if (numbers.some(value => !Number.isFinite(value))) return null;
  return trim(numbers.reverse().map(value => qFrom(value)));
}
export const coefficientsText = (p: Poly) => [...p].reverse().map(c => c.d === 1 ? String(c.n) : `${c.n}/${c.d}`).join(", ");
/** 두 다항식의 몫과 나머지(직접 나눗셈)입니다. */
export function divide(a: Poly, b: Poly) {
  let rest = trim(a);
  const d = degree(b);
  const lead = trim(b)[d];
  const quotient: Q[] = Array.from({ length: Math.max(1, degree(a) - d + 1) }, () => q(0));
  while (degree(rest) >= d && !(degree(rest) === 0 && rest[0].n === 0)) {
    const shift = degree(rest) - d;
    const c = qDiv(rest[degree(rest)], lead);
    quotient[shift] = c;
    rest = sub(rest, mul(b, [...Array.from({ length: shift }, () => q(0)), c]));
    if (d === 0) break;
  }
  return { quotient: trim(quotient), remainder: rest };
}
export const polyLabel = (p: Poly) => escapeHtml(coefficientsText(p));
export const qMinus = qSub;

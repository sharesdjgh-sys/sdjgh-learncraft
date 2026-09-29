/* 공통수학 1 · 방정식과 부등식(1): 복소수의 사칙연산, 이차방정식(판별식·근과 계수의 관계), 이차함수의 그래프·최대최소·직선과의 위치 관계, 이차부등식입니다. */
import { gcd, mathProblem, polyTex, q, qAdd, qDiv, qMul, qNeg, qNum, qSub, qTex, sqrtParts, tex, type Q, type SheetSection } from "./core";
import { buildSections, nTex, pTex, tj, type Rng } from "./cm-util";
import { above, below, between, intervalTex, planeSvg, type IntervalSet, type PlaneCurve } from "./cm-plane";

/* ───── 복소수 ───── */
export type Complex = { re: Q; im: Q };
export const cx = (re: number | Q, im: number | Q = 0): Complex => ({ re: typeof re === "number" ? q(re) : re, im: typeof im === "number" ? q(im) : im });
export const cAdd = (a: Complex, b: Complex) => cx(qAdd(a.re, b.re), qAdd(a.im, b.im));
export const cSub = (a: Complex, b: Complex) => cx(qSub(a.re, b.re), qSub(a.im, b.im));
export const cMul = (a: Complex, b: Complex) => cx(qSub(qMul(a.re, b.re), qMul(a.im, b.im)), qAdd(qMul(a.re, b.im), qMul(a.im, b.re)));
export const cConj = (a: Complex) => cx(a.re, qNeg(a.im));
export function cDiv(a: Complex, b: Complex) {
  // 분모의 켤레복소수를 곱합니다: (a)(b̄) / |b|²
  const top = cMul(a, cConj(b));
  const bottom = qAdd(qMul(b.re, b.re), qMul(b.im, b.im));
  return cx(qDiv(top.re, bottom), qDiv(top.im, bottom));
}
/** a + bi 꼴 TeX (분수 가능) */
export function cTex(z: Complex) {
  const re = z.re.n !== 0 ? qTex(z.re) : "";
  if (z.im.n === 0) return re || "0";
  const absIm = q(Math.abs(z.im.n), z.im.d);
  const imBody = absIm.n === 1 && absIm.d === 1 ? "i" : absIm.d === 1 ? `${absIm.n}i` : `\\frac{${absIm.n}}{${absIm.d}}i`;
  return `${re}${z.im.n < 0 ? "-" : re ? "+" : ""}${imBody}`;
}
const cParen = (z: Complex) => `(${cTex(z)})`;

/* ───── 이차방정식 ───── */

/** 정수 계수 ax² + bx + c = 0의 판별식과 근입니다. 근은 (p ± s√t)/d 꼴로 간단히 합니다(t < 0이면 허근, s√−t i). */
export function solveQuadratic(a: number, b: number, c: number) {
  const D = b * b - 4 * a * c;
  const kind = D > 0 ? "서로 다른 두 실근" : D === 0 ? "중근(서로 같은 두 실근)" : "서로 다른 두 허근";
  const { outside, inside } = sqrtParts(Math.abs(D));
  let top = -b;
  let bottom = 2 * a;
  let s = outside;
  // 분자·분모를 공약수로 나눕니다.
  const g = gcd(gcd(top, s), bottom);
  top /= g; s /= g; bottom /= g;
  if (bottom < 0) { top = -top; bottom = -bottom; }
  const unit = D < 0 ? (inside === 1 ? "i" : `\\sqrt{${inside}}i`) : inside === 1 ? "" : `\\sqrt{${inside}}`;
  let rootsTex: string;
  const numeric: number[] = D >= 0 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((x, y) => x - y) : [];
  if (D === 0) rootsTex = `x=${qTex(q(-b, 2 * a))}\\ (\\text{중근})`;
  else if (D > 0 && inside === 1) {
    const [r1, r2] = [q(-b - outside, 2 * a), q(-b + outside, 2 * a)].sort((x, y) => qNum(x) - qNum(y));
    rootsTex = `x=${qTex(r1)}\\ \\text{또는}\\ x=${qTex(r2)}`;
  } else {
    const sPart = `${s === 1 ? "" : s}${unit || "1"}`;
    rootsTex = bottom === 1 ? `x=${top === 0 ? "" : top}\\pm ${sPart}` : `x=\\frac{${top === 0 ? "" : top}\\pm ${sPart}}{${bottom}}`;
  }
  return { D, kind, rootsTex, numeric };
}
/** ax² + bx + c 의 TeX (정수 계수) */
export const quadTex = (a: number | Q, b: number | Q, c: number | Q, variable = "x") => polyTex([c, b, a], variable);

/* ───── 이차함수 ───── */
export type Parabola = { a: number; b: number; c: number };
export const vertex = ({ a, b, c }: Parabola) => ({ x: q(-b, 2 * a), y: qSub(q(c), q(b * b, 4 * a)) });
/** y = a(x − p)² + q 표준형 TeX */
export function standardTex(parabola: Parabola) {
  const v = vertex(parabola);
  const lead = parabola.a === 1 ? "" : parabola.a === -1 ? "-" : String(parabola.a);
  const inner = v.x.n === 0 ? "x^{2}" : `\\left(x${v.x.n < 0 ? "+" : "-"}${qTex(q(Math.abs(v.x.n), v.x.d))}\\right)^{2}`;
  const tail = v.y.n === 0 ? "" : `${v.y.n < 0 ? "-" : "+"}${qTex(q(Math.abs(v.y.n), v.y.d))}`;
  return `y=${lead}${inner}${tail}`;
}
export const valueAt = ({ a, b, c }: Parabola, x: Q) => qAdd(qAdd(qMul(q(a), qMul(x, x)), qMul(q(b), x)), q(c));
/** 닫힌 구간 [s, t]에서의 최댓값·최솟값 */
export function extremaOn(parabola: Parabola, s: number, t: number) {
  const v = vertex(parabola);
  const candidates: { x: Q; y: Q }[] = [{ x: q(s), y: valueAt(parabola, q(s)) }, { x: q(t), y: valueAt(parabola, q(t)) }];
  if (qNum(v.x) >= s && qNum(v.x) <= t) candidates.push(v);
  const sorted = [...candidates].sort((m, n) => qNum(m.y) - qNum(n.y));
  return { min: sorted[0], max: sorted[sorted.length - 1], vertexInside: candidates.length === 3 };
}
/** 이차함수의 그래프와 직선 y = mx + k의 위치 관계(판별식) */
export function lineRelation(parabola: Parabola, m: number, k: number) {
  const D = (parabola.b - m) ** 2 - 4 * parabola.a * (parabola.c - k);
  return { D, relation: D > 0 ? "서로 다른 두 점에서 만난다" : D === 0 ? "한 점에서 만난다(접한다)" : "만나지 않는다" };
}
/** ax² + bx + c (부등호) 0 의 해 */
export function quadraticInequality(parabola: Parabola, sign: "<" | "<=" | ">" | ">="): IntervalSet {
  const { a, b, c } = parabola;
  const D = b * b - 4 * a * c;
  // a < 0이면 양변에 −1을 곱해 부등호 방향을 바꿉니다.
  const flip = a < 0;
  const s = flip ? ({ "<": ">", "<=": ">=", ">": "<", ">=": "<=" } as const)[sign] : sign;
  const closed = s === "<=" || s === ">=";
  if (D < 0) return s === ">" || s === ">=" ? [{ lo: -Infinity, hi: Infinity, loIn: false, hiIn: false }] : [];
  const r1 = (-b - Math.sqrt(D)) / (2 * a);
  const r2 = (-b + Math.sqrt(D)) / (2 * a);
  const [lo, hi] = [Math.min(r1, r2), Math.max(r1, r2)];
  if (D === 0) {
    if (s === ">") return [below(lo, false), above(lo, false)];
    if (s === ">=") return [{ lo: -Infinity, hi: Infinity, loIn: false, hiIn: false }];
    if (s === "<") return [];
    return [between(lo, lo, true, true)];
  }
  return s === "<" || s === "<=" ? [between(lo, hi, closed, closed)] : [below(lo, closed), above(hi, closed)];
}
const signTex = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge" } as const;
export const inequalityTex = (parabola: Parabola, sign: keyof typeof signTex) => `${quadTex(parabola.a, parabola.b, parabola.c)}${signTex[sign]}0`;

/** 이차함수 그래프 SVG: 꼭짓점·축(점선)·y절편·x절편, 고른 범위, 직선, 부등식의 해를 표시합니다. */
export function parabolaSvg(parabola: Parabola, options: { range?: [number, number]; line?: { m: number; k: number }; inequality?: IntervalSet; hideTicks?: boolean } = {}) {
  const v = vertex(parabola);
  const vx = qNum(v.x);
  const vy = qNum(v.y);
  const f = (x: number) => parabola.a * x * x + parabola.b * x + parabola.c;
  const D = parabola.b ** 2 - 4 * parabola.a * parabola.c;
  const roots = D >= 0 ? [(-parabola.b - Math.sqrt(D)) / (2 * parabola.a), (-parabola.b + Math.sqrt(D)) / (2 * parabola.a)] : [];
  const xs = [vx, 0, ...roots, ...(options.range ?? [])];
  const xMin = Math.floor(Math.min(...xs, vx - 3) - 1);
  const xMax = Math.ceil(Math.max(...xs, vx + 3) + 1);
  const ys = [vy, parabola.c, 0, ...(options.range ?? []).map(f)];
  const reach = Math.max(2, Math.abs(parabola.a) * 9);
  const yMin = Math.floor(Math.min(...ys, parabola.a > 0 ? vy - 1 : vy - reach) - 1);
  const yMax = Math.ceil(Math.max(...ys, parabola.a > 0 ? vy + reach : vy + 1) + 1);
  const points = [{ x: vx, y: vy, label: `꼭짓점`, color: "#dc2626" }, { x: 0, y: parabola.c, label: "", color: "#111" }, ...roots.map(root => ({ x: root, y: 0, color: "#111" }))];
  const curves: PlaneCurve[] = [{ f, color: "#2563eb", width: 2.4 }];
  if (options.range) curves.push({ f, color: "#dc2626", width: 4.2, from: options.range[0], to: options.range[1] });
  return planeSvg({
    xMin: Math.max(xMin, -14), xMax: Math.min(xMax, 14), yMin: Math.max(yMin, -24), yMax: Math.min(yMax, 24), hideTicks: options.hideTicks,
    curves, points: options.range ? [...points, { x: options.range[0], y: f(options.range[0]), color: "#dc2626" }, { x: options.range[1], y: f(options.range[1]), color: "#dc2626" }] : points,
    segments: [{ from: [vx, Math.max(yMin, -24)], to: [vx, Math.min(yMax, 24)], color: "#888", dash: true, width: 1.2 }],
    lines: options.line ? [{ a: options.line.m, b: -1, c: options.line.k, color: "#16a34a" }] : [],
    xBands: (options.inequality ?? []).map(i => ({ from: i.lo, to: i.hi, color: "#f59e0b" })),
  });
}

/* ───── 문제 ───── */
export type QuadAsk = "complex" | "discriminant" | "solve" | "vieta" | "make";
export const quadAsks: Record<QuadAsk, string> = { complex: "복소수의 계산", discriminant: "판별식과 근의 판별", solve: "이차방정식 풀기", vieta: "근과 계수의 관계", make: "두 수를 근으로 하는 이차방정식" };
export type FunctionAsk = "vertex" | "extrema" | "line" | "inequality";
export const functionAsks: Record<FunctionAsk, string> = { vertex: "꼭짓점·표준형", extrema: "제한된 범위의 최대·최소", line: "직선과의 위치 관계", inequality: "이차부등식" };

const t = tex;
const eq = (a: number, b: number, c: number) => `${quadTex(a, b, c)}=0`;

function makeQuad(ask: QuadAsk, r: Rng) {
  if (ask === "complex") {
    const z = cx(r.int(-4, 5), r.nonzero(-4, 4));
    const w = cx(r.int(-3, 4), r.nonzero(-3, 3));
    const op = r.pick(["+", "-", "*", "/", "*"] as const);
    if (op === "/") {
      // 나누어떨어지게: (z·w) ÷ w
      const top = cMul(z, w);
      return mathProblem(`다음을 계산하여 ${t("a+bi")} 꼴로 나타내시오. (단, ${t("a, b")}는 실수) ${t(`\\frac{${cTex(top)}}{${cTex(w)}}`)}`, `${t(cTex(z))} (분모의 켤레복소수 ${tj(cTex(cConj(w)), "을")} 분모·분자에 곱한다)`, { space: 14 });
    }
    const result = op === "+" ? cAdd(z, w) : op === "-" ? cSub(z, w) : cMul(z, w);
    const opTex = op === "*" ? "" : op;
    return mathProblem(`다음을 계산하여 ${t("a+bi")} 꼴로 나타내시오. (단, ${t("a, b")}는 실수) ${t(`${cParen(z)}${opTex}${cParen(w)}`)}`, `${t(cTex(result))}${op === "*" ? ` (${t("i^{2}=-1")})` : ""}`, { space: 10 });
  }
  if (ask === "discriminant") {
    // x² + bx + k = 0이 (서로 다른 두 실근/중근/허근)을 가질 k의 범위·값
    const b = 2 * r.nonzero(-4, 4);
    const kind = r.pick(["real", "double", "imaginary"] as const);
    const edge = (b * b) / 4;
    const cond = kind === "real" ? "서로 다른 두 실근" : kind === "double" ? "중근" : "서로 다른 두 허근";
    const answer = kind === "real" ? `k<${edge}` : kind === "double" ? `k=${edge}` : `k>${edge}`;
    return mathProblem(`이차방정식 ${t(`x^{2}${b < 0 ? "-" : "+"}${Math.abs(b)}x+k=0`)}이 ${cond}을 가질 때, 실수 ${t("k")}의 ${kind === "double" ? "값을" : "값의 범위를"} 구하시오.`,
      `${t(answer)} (판별식 ${t(`D=${b * b}-4k${kind === "real" ? ">" : kind === "double" ? "=" : "<"}0`)})`, { space: 12 });
  }
  if (ask === "solve") {
    const kind = r.pick(["rational", "irrational", "imaginary"] as const);
    let a = 1, b = 0, c = 0;
    if (kind === "rational") { const [p, s] = [r.nonzero(-5, 5), r.nonzero(-5, 5)]; a = r.pick([1, 1, 2]); b = -a * (p + s); c = a * p * s; if (a === 2) { b = -(2 * p + s); c = p * s; } }
    else if (kind === "irrational") { const p = r.int(-3, 3); const s = r.pick([2, 3, 5, 6, 7]); b = -2 * p; c = p * p - s; }
    else { const p = r.int(-3, 3); const s = r.pick([1, 2, 4, 9]); b = -2 * p; c = p * p + s; }
    const solved = solveQuadratic(a, b, c);
    return mathProblem(`다음 이차방정식을 푸시오. ${t(eq(a, b, c))}`, `${t(solved.rootsTex)} (판별식 ${t(`D=${solved.D}`)})`, { space: 12 });
  }
  if (ask === "vieta") {
    const a = r.pick([1, 1, 2]);
    const s = r.nonzero(-6, 6);
    const p = r.nonzero(-6, 6);
    // x² − (α+β)x + αβ = 0 에 a를 곱한 식입니다.
    const b = -a * s;
    const c = a * p;
    const sum = q(-b, a);
    const prod = q(c, a);
    const kind = r.pick(["squares", "reciprocal", "cubes", "difference"] as const);
    const target = kind === "squares" ? "\\alpha^{2}+\\beta^{2}" : kind === "reciprocal" ? "\\frac{1}{\\alpha}+\\frac{1}{\\beta}" : kind === "cubes" ? "\\alpha^{3}+\\beta^{3}" : "(\\alpha-\\beta)^{2}";
    const value = kind === "squares" ? qSub(qMul(sum, sum), qMul(q(2), prod))
      : kind === "reciprocal" ? qDiv(sum, prod)
        : kind === "cubes" ? qSub(qMul(qMul(sum, sum), sum), qMul(q(3), qMul(prod, sum)))
          : qSub(qMul(sum, sum), qMul(q(4), prod));
    return mathProblem(`이차방정식 ${t(eq(a, b, c))}의 두 근을 ${t("\\alpha, \\beta")}라 할 때, ${t(target)}의 값을 구하시오.`,
      `${t(qTex(value))} (${t(`\\alpha+\\beta=${qTex(sum)},\\ \\alpha\\beta=${qTex(prod)}`)})`, { space: 12 });
  }
  // 두 수를 근으로 하는 이차방정식
  const kind = r.pick(["int", "irrational", "complex"] as const);
  let rootsTex: string;
  let sum: number;
  let prod: number;
  if (kind === "int") { const [x1, x2] = r.distinct(-6, 6, 2); rootsTex = `${x1},\\ ${x2}`; sum = x1 + x2; prod = x1 * x2; }
  else { const p = r.nonzero(-3, 4); const s = kind === "irrational" ? r.pick([2, 3, 5]) : r.pick([1, 2, 3]); const unit = kind === "irrational" ? `\\sqrt{${s}}` : s === 1 ? "i" : `${s}i`; rootsTex = `${p}+${unit},\\ ${p}-${unit}`; sum = 2 * p; prod = kind === "irrational" ? p * p - s : p * p + s * s; }
  return mathProblem(`두 수 ${tj(rootsTex, "을")} 근으로 하고 ${t("x^{2}")}의 계수가 1인 이차방정식을 구하시오.`, `${t(eq(1, -sum, prod))} (두 근의 합 ${t(nTex(sum))}, 곱 ${t(nTex(prod))})`, { space: 10 });
}

function makeFunction(ask: FunctionAsk, r: Rng) {
  if (ask === "vertex") {
    const a = r.pick([1, -1, 2, -2]);
    const p = r.int(-4, 4);
    const k = r.int(-5, 5);
    const parabola = { a, b: -2 * a * p, c: a * p * p + k };
    return mathProblem(`이차함수 ${tj(`y=${quadTex(parabola.a, parabola.b, parabola.c)}`, "을")} ${t("y=a(x-p)^{2}+q")} 꼴로 나타내고, 그래프의 꼭짓점의 좌표와 축의 방정식을 구하시오.`,
      `${t(standardTex(parabola))}, 꼭짓점 ${t(`(${p},\\ ${k})`)}, 축 ${t(`x=${p}`)}`, { space: 14, answerFigure: parabolaSvg(parabola) });
  }
  if (ask === "extrema") {
    const a = r.pick([1, -1, 2, -1]);
    const p = r.int(-2, 3);
    const k = r.int(-4, 4);
    const parabola = { a, b: -2 * a * p, c: a * p * p + k };
    const inside = r.random() < 0.6;
    const s = inside ? p - r.int(1, 3) : p + r.int(1, 2);
    const e = inside ? p + r.int(1, 3) : s + r.int(2, 3);
    const result = extremaOn(parabola, s, e);
    return mathProblem(`${t(`${s}\\le x\\le ${e}`)}에서 이차함수 ${t(`y=${quadTex(parabola.a, parabola.b, parabola.c)}`)}의 최댓값과 최솟값을 구하시오.`,
      `최댓값 ${t(qTex(result.max.y))} (${t(`x=${qTex(result.max.x)}`)}), 최솟값 ${t(qTex(result.min.y))} (${t(`x=${qTex(result.min.x)}`)})`, { space: 14, answerFigure: parabolaSvg(parabola, { range: [s, e] }) });
  }
  if (ask === "line") {
    // y = x² + bx + c 와 y = mx + k가 접하도록(또는 만나도록) k의 조건
    const b = r.int(-4, 4);
    const c = r.int(-3, 4);
    const m = r.int(-3, 3);
    const kind = r.pick(["tangent", "meet", "none"] as const);
    // x² + (b − m)x + (c − k) = 0 의 판별식: (b − m)² − 4(c − k) → k = c − (b − m)²/4
    const edge = qSub(q(c), q((b - m) ** 2, 4));
    const want = kind === "tangent" ? "접하도록" : kind === "meet" ? "서로 다른 두 점에서 만나도록" : "만나지 않도록";
    const answer = kind === "tangent" ? `k=${qTex(edge)}` : kind === "meet" ? `k>${qTex(edge)}` : `k<${qTex(edge)}`;
    const lineText = `y=${m === 0 ? "" : m === 1 ? "x" : m === -1 ? "-x" : `${m}x`}${m === 0 ? "k" : "+k"}`;
    return mathProblem(`이차함수 ${t(`y=${quadTex(1, b, c)}`)}의 그래프와 직선 ${tj(lineText, "이")} ${want} 하는 실수 ${t("k")}의 ${kind === "tangent" ? "값을" : "값의 범위를"} 구하시오.`,
      `${t(answer)} (${t(`${quadTex(1, b - m, c)}-k=0`)}의 판별식 ${t(`D${kind === "tangent" ? "=" : kind === "meet" ? ">" : "<"}0`)})`, { space: 14 });
  }
  const [x1, x2] = r.distinct(-5, 5, 2).sort((m, n) => m - n);
  const a = r.pick([1, 1, -1]);
  const parabola = { a, b: -a * (x1 + x2), c: a * x1 * x2 };
  const sign = r.pick(["<", "<=", ">", ">="] as const);
  const solution = quadraticInequality(parabola, sign);
  return mathProblem(`이차부등식 ${tj(inequalityTex(parabola, sign), "을")} 푸시오.`, `${t(intervalTex(solution))}`, { space: 12, answerFigure: parabolaSvg(parabola, { inequality: solution }) });
}

export function quadProblems(asks: QuadAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, quadAsks, count, seed, makeQuad); }
export function functionProblems(asks: FunctionAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, functionAsks, count, seed, makeFunction); }
export { pTex, tj };

/* 공통수학 1 · 방정식과 부등식(2): 삼차·사차방정식, 연립이차방정식, 연립일차부등식, 절댓값을 포함한 일차부등식, 연립이차부등식입니다. 해는 답에서 거꾸로 만들어 깔끔하게 떨어집니다. */
import { mathProblem, q, qNum, qTex, tex, type Q, type SheetSection } from "./core";
import { buildSections, casesTex, texAs, tj, type Rng } from "./cm-util";
import { above, below, between, intersect, intervalTex, numberLineSvg, type IntervalSet } from "./cm-plane";
import { factorTex, linear, mul, poly, ptex, type Poly } from "./cm-poly";
import { quadraticInequality, quadTex, solveQuadratic, type Parabola } from "./cm-quadratic";

export type EquationAsk = "higher" | "system" | "linearSystem" | "absolute" | "quadraticSystem";
export const equationAsks: Record<EquationAsk, string> = { higher: "삼차·사차방정식", system: "연립이차방정식", linearSystem: "연립일차부등식", absolute: "절댓값을 포함한 일차부등식", quadraticSystem: "연립이차부등식" };

const t = tex;
const signTex = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge" } as const;
type Sign = keyof typeof signTex;

/** ax + b (부등호) c 의 해 */
export function linearInequality(a: number, b: number, sign: Sign, c: number): IntervalSet {
  const bound = (c - b) / a;
  // a < 0이면 부등호 방향이 바뀝니다.
  const s: Sign = a < 0 ? ({ "<": ">", "<=": ">=", ">": "<", ">=": "<=" } as const)[sign] : sign;
  return [s === "<" || s === "<=" ? below(bound, s === "<=") : above(bound, s === ">=")];
}
/** |x − p| (부등호) k 의 해 (k > 0) */
export function absoluteInequality(p: number, sign: Sign, k: number): IntervalSet {
  if (sign === "<" || sign === "<=") return [between(p - k, p + k, sign === "<=", sign === "<=")];
  return [below(p - k, sign === ">="), above(p + k, sign === ">=")];
}
/** 연립방정식의 해 여러 쌍: {x=1, y=2} 또는 {x=2, y=1} */
const pairsTex = (pairs: [number, number][]) => texAs(pairs.map(([x, y]) => `\\begin{cases}x=${x}\\\\y=${y}\\end{cases}`).join(`\\ \\text{또는}\\ `), pairs.map(([x, y]) => `x=${x}, y=${y}`).join(" 또는 ").replace(/-/g, "−"));
const linTex = (a: number, b: number) => `${a === 1 ? "" : a === -1 ? "-" : a}x${b === 0 ? "" : b < 0 ? `-${-b}` : `+${b}`}`;
const qValue = (value: number) => qTex(qFromExact(value));
const qFromExact = (value: number): Q => { for (let d = 1; d <= 12; d += 1) if (Math.abs(Math.round(value * d) - value * d) < 1e-9) return q(Math.round(value * d), d); return q(Math.round(value)); };

/** 삼차·사차방정식 만들기: 정수 근, 또는 정수 근 하나와 허근 두 개 */
function higherEquation(r: Rng) {
  const kind = r.pick(["three", "complex", "biquadratic"] as const);
  if (kind === "three") {
    const roots = r.distinct(-4, 4, 3);
    const p = roots.reduce<Poly>((acc, root) => mul(acc, linear(root)), [q(1)]);
    const sorted = [...roots].sort((m, n) => m - n);
    return { p, factored: factorTex(p), answer: `x=${sorted.join(",\\ ")}` };
  }
  if (kind === "complex") {
    // (x − a)(x² + bx + c), 뒤 식은 판별식 < 0
    const a = r.nonzero(-3, 3);
    const b = r.int(-2, 2);
    const c = r.int(Math.floor((b * b) / 4) + 1, 5);
    const p = mul(linear(a), poly([c, b, 1]));
    const rest = solveQuadratic(1, b, c);
    return { p, factored: `(x${a < 0 ? "+" : "-"}${Math.abs(a)})(${quadTex(1, b, c)})`, answer: `x=${a}\\ \\text{또는}\\ ${rest.rootsTex}` };
  }
  // (x² − m²)(x² − n²) = 0 꼴의 복이차식
  const [m, n] = r.distinct(1, 4, 2);
  const p = mul(poly([-m * m, 0, 1]), poly([-n * n, 0, 1]));
  const roots = [-m, m, -n, n].sort((x, y) => x - y);
  return { p, factored: `(x^{2}-${m * m})(x^{2}-${n * n})`, answer: `x=${roots.join(",\\ ")}` };
}

function makeEquation(ask: EquationAsk, r: Rng) {
  if (ask === "higher") {
    const made = higherEquation(r);
    return mathProblem(`다음 방정식을 푸시오. ${t(`${ptex(made.p)}=0`)}`, `${t(made.answer)} (${t(`${made.factored}=0`)})`, { space: 14 });
  }
  if (ask === "system") {
    const kind = r.pick(["sumSquare", "sumProduct"] as const);
    const [x1, first] = r.distinct(-5, 5, 2, [0]);
    let y1 = first;
    if (kind === "sumSquare") {
      // (x₁, y₁)과 (−y₁, −x₁)이 같아지지 않게 합니다.
      if (x1 === -y1) y1 = y1 > 0 ? y1 - 1 || 2 : y1 + 1 || -2;
      // x − y = d, x² + y² = s  →  (x1, y1), (−y1, −x1)
      const d = x1 - y1;
      const s = x1 * x1 + y1 * y1;
      const other = [-y1, -x1];
      return mathProblem(`다음 연립방정식을 푸시오. ${casesTex([`x-y=${d}`, "x^{2}+y^{2}=" + s])}`,
        `${pairsTex([[x1, y1], [other[0], other[1]]])} (${tj(`y=x${d < 0 ? `+${-d}` : `-${d}`}`, "을")} 대입)`, { space: 18 });
    }
    // x + y = s, xy = p → x, y는 t² − st + p = 0의 두 근
    const s = x1 + y1;
    const p = x1 * y1;
    return mathProblem(`다음 연립방정식을 푸시오. ${casesTex([`x+y=${s}`, `xy=${p}`])}`,
      `${pairsTex([[x1, y1], [y1, x1]])} (${t("x, y")}는 이차방정식 ${t(`t^{2}${s === 0 ? "" : s > 0 ? `-${s}t` : `+${-s}t`}${p < 0 ? p : `+${p}`}=0`)}의 두 근)`, { space: 18 });
  }
  if (ask === "linearSystem") {
    // 해가 lo < x ≤ hi 가 되도록 두 일차부등식을 만듭니다.
    const lo = r.int(-5, 2);
    const hi = lo + r.int(2, 6);
    const [a1, a2] = [r.pick([2, 3, -2, 1]), r.pick([3, -1, 2, -3])];
    const b1 = r.int(-6, 6);
    const b2 = r.int(-6, 6);
    const s1: Sign = a1 > 0 ? ">" : "<";
    const s2: Sign = a2 > 0 ? "<=" : ">=";
    const first = linearInequality(a1, b1, s1, a1 * lo + b1);
    const second = linearInequality(a2, b2, s2, a2 * hi + b2);
    const solution = intersect(first, second);
    return mathProblem(`다음 연립부등식을 푸시오. ${casesTex([`${linTex(a1, b1)}${signTex[s1]}${a1 * lo + b1}`, `${linTex(a2, b2)}${signTex[s2]}${a2 * hi + b2}`])}`,
      `${t(intervalTex(solution))}`, { space: 16, answerFigure: numberLineSvg([{ set: first, color: "#2563eb", label: "①" }, { set: second, color: "#dc2626", label: "②" }], [lo, hi]) });
  }
  if (ask === "absolute") {
    const p = r.int(-4, 4);
    const k = r.int(1, 5);
    const sign = r.pick(["<", "<=", ">", ">="] as const);
    const scaleBy = r.pick([1, 1, 2]);
    // |ax − ap| < ak 꼴로 계수를 곱해 둡니다.
    const solution = absoluteInequality(p, sign, k);
    return mathProblem(`다음 부등식을 푸시오. ${t(`\\left|${linTex(scaleBy, -scaleBy * p)}\\right|${signTex[sign]}${scaleBy * k}`)}`, `${t(intervalTex(solution))}`,
      { space: 12, answerFigure: numberLineSvg([{ set: solution, color: "#2563eb" }], [p - k, p, p + k]) });
  }
  // 연립이차부등식: 일차부등식과 이차부등식(해가 있는 것만)
  for (let guard = 0; ; guard += 1) {
    const made = quadraticSystem(r);
    if (made.solution.length || guard > 8) return made.problem;
  }
}
function quadraticSystem(r: Rng) {
  const [x1, x2] = r.distinct(-4, 5, 2).sort((m, n) => m - n);
  const parabola: Parabola = { a: 1, b: -(x1 + x2), c: x1 * x2 };
  const sign = r.pick(["<", "<=", ">", ">="] as const);
  const second = quadraticInequality(parabola, sign);
  const bound = r.int(x1 - 2, x2 + 2);
  const a = r.pick([1, 2]);
  const b = r.int(-4, 4);
  const lineSign: Sign = r.pick([">", "<="]);
  const first = linearInequality(a, b, lineSign, a * bound + b);
  const solution = intersect(first, second);
  const problem = mathProblem(`다음 연립부등식을 푸시오. ${casesTex([`${linTex(a, b)}${signTex[lineSign]}${a * bound + b}`, `${quadTex(1, parabola.b, parabola.c)}${signTex[sign]}0`])}`,
    `${t(intervalTex(solution))}`, { space: 16, answerFigure: numberLineSvg([{ set: first, color: "#2563eb", label: "①" }, { set: second, color: "#dc2626", label: "②" }], [x1, x2, bound]) });
  return { problem, solution };
}

export function equationProblems(asks: EquationAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, equationAsks, count, seed, makeEquation); }

/** 계산기: 두 일차부등식(ax + b 부등호 c)과 선택한 이차부등식의 해를 함께 보여 줍니다. */
export function solveSystem(parts: { a: number; b: number; sign: Sign; c: number }[], quadratic?: { parabola: Parabola; sign: Sign }) {
  const sets = parts.filter(part => part.a !== 0).map(part => linearInequality(part.a, part.b, part.sign, part.c));
  if (quadratic && quadratic.parabola.a !== 0) sets.push(quadraticInequality(quadratic.parabola, quadratic.sign));
  const solution = sets.reduce((acc, set) => intersect(acc, set), [{ lo: -Infinity, hi: Infinity, loIn: false, hiIn: false }] as IntervalSet);
  const marks = sets.flatMap(set => set.flatMap(i => [i.lo, i.hi])).filter(Number.isFinite);
  return { sets, solution, marks, tex: intervalTex(solution, "x", qValue) };
}
export const inequalityPartTex = (part: { a: number; b: number; sign: Sign; c: number }) => `${linTex(part.a, part.b)}${signTex[part.sign]}${part.c}`;
export { signTex, qNum, qValue };
export type { Sign };

/* 공통수학 2 · 함수와 그래프: 대응과 함수(일대일함수·일대일대응), 합성함수, 역함수, 유리함수 y = k/(x − p) + q, 무리함수 y = ±√(a(x − p)) + q입니다. */
import { escapeHtml, mathProblem, q, qAdd, qDiv, qMul, qTex, svgWrap, tex, type Q, type SheetSection } from "./core";
import { buildSections, type Rng } from "./cm-util";
import { planeSvg } from "./cm-plane";

const t = tex;

/* ───── 대응 ───── */
export type Mapping = { from: number[]; to: string[]; arrows: [number, string][] };
export function classify(map: Mapping) {
  const images = map.from.map(x => map.arrows.filter(([a]) => a === x).map(([, b]) => b));
  const isFunction = images.every(list => list.length === 1);
  if (!isFunction) return { isFunction, name: images.some(list => list.length === 0) ? "함수가 아니다(대응하지 않는 원소가 있다)" : "함수가 아니다(두 개 이상에 대응하는 원소가 있다)" };
  const values = images.map(list => list[0]);
  const oneToOne = new Set(values).size === values.length;
  const onto = map.to.every(y => values.includes(y));
  const constant = new Set(values).size === 1;
  const name = oneToOne && onto ? "일대일대응" : oneToOne ? "일대일함수(일대일대응은 아니다)" : constant ? "상수함수" : "함수(일대일함수는 아니다)";
  return { isFunction, oneToOne, onto, constant, name };
}
/** X → Y 대응 그림(화살표) */
export function mappingSvg(map: Mapping) {
  const rows = Math.max(map.from.length, map.to.length);
  const height = 60 + rows * 34;
  const yFor = (index: number, count: number) => 40 + (index + 0.5) * ((height - 70) / count) + ((rows - count) * 0);
  const parts: string[] = [];
  const oval = (cx: number, label: string) => `<ellipse cx="${cx}" cy="${height / 2 + 6}" rx="44" ry="${(height - 50) / 2}" fill="none" stroke="#111" stroke-width="1.4"/><text x="${cx}" y="22" font-size="13" font-weight="700" text-anchor="middle">${label}</text>`;
  parts.push(oval(80, "X"), oval(260, "Y"));
  const fromY = new Map(map.from.map((x, i) => [x, yFor(i, map.from.length)]));
  const toY = new Map(map.to.map((y, i) => [y, yFor(i, map.to.length)]));
  for (const [x, y] of map.arrows) {
    const [y1, y2] = [fromY.get(x)!, toY.get(y)!];
    const angle = Math.atan2(y2 - y1, 150);
    const [ex, ey] = [238, y2];
    parts.push(`<line x1="100" y1="${y1.toFixed(1)}" x2="${ex - 6 * Math.cos(angle)}" y2="${(ey - 6 * Math.sin(angle)).toFixed(1)}" stroke="#2563eb" stroke-width="1.6"/><path d="M${ex} ${ey.toFixed(1)} l${(-9 * Math.cos(angle - 0.4)).toFixed(1)} ${(-9 * Math.sin(angle - 0.4)).toFixed(1)} l${(9 * Math.cos(angle - 0.4) - 9 * Math.cos(angle + 0.4)).toFixed(1)} ${(9 * Math.sin(angle - 0.4) - 9 * Math.sin(angle + 0.4)).toFixed(1)} z" fill="#2563eb"/>`);
  }
  map.from.forEach((x, i) => parts.push(`<text x="80" y="${(yFor(i, map.from.length) + 4).toFixed(1)}" font-size="13" text-anchor="middle">${x}</text>`));
  map.to.forEach((y, i) => parts.push(`<text x="260" y="${(yFor(i, map.to.length) + 4).toFixed(1)}" font-size="13" text-anchor="middle">${escapeHtml(y)}</text>`));
  return svgWrap(340, height, parts.join(""));
}
export const mappingText = (map: Mapping) => map.arrows.map(([x, y]) => `${x}→${y}`).join(", ");

/* ───── 일차함수의 합성·역함수 ───── */
export type Linear = { a: Q; b: Q }; // f(x) = ax + b
export const lin = (a: number, b: number): Linear => ({ a: q(a), b: q(b) });
export const linTex = (f: Linear, name = "x") => {
  const aPart = f.a.n === 0 ? "" : f.a.n === f.a.d ? name : f.a.n === -f.a.d ? `-${name}` : `${qTex(f.a)}${name}`;
  const bPart = f.b.n === 0 ? (aPart ? "" : "0") : `${f.b.n < 0 ? "-" : aPart ? "+" : ""}${qTex(q(Math.abs(f.b.n), f.b.d))}`;
  return `${aPart}${bPart}`;
};
export const linAt = (f: Linear, x: Q) => qAdd(qMul(f.a, x), f.b);
/** (g∘f)(x) = g(f(x)) */
export const compose = (g: Linear, f: Linear): Linear => ({ a: qMul(g.a, f.a), b: qAdd(qMul(g.a, f.b), g.b) });
/** 역함수: y = ax + b → x = (y − b)/a */
export const inverse = (f: Linear): Linear => ({ a: qDiv(q(1), f.a), b: qDiv(qMul(f.b, q(-1)), f.a) });

/* ───── 유리함수·무리함수 ───── */
export type Rational = { k: number; p: number; q: number }; // y = k/(x − p) + q
export const rationalTex = (f: Rational) => `y=\\frac{${f.k}}{x${f.p === 0 ? "" : f.p < 0 ? `+${-f.p}` : `-${f.p}`}}${f.q === 0 ? "" : f.q < 0 ? f.q : `+${f.q}`}`;
/** y = (qx + (k − pq)) / (x − p) 꼴 */
export const rationalFractionTex = (f: Rational) => { const c = f.k - f.p * f.q; return `y=\\frac{${f.q === 0 ? "" : f.q === 1 ? "x" : f.q === -1 ? "-x" : `${f.q}x`}${c === 0 ? "" : c < 0 ? c : f.q === 0 ? c : `+${c}`}}{x${f.p === 0 ? "" : f.p < 0 ? `+${-f.p}` : `-${f.p}`}}`; };
export const rationalSvg = (f: Rational) => planeSvg({
  xMin: f.p - 6, xMax: f.p + 6, yMin: f.q - 6, yMax: f.q + 6, unit: 22,
  curves: [{ f: x => f.k / (x - f.p) + f.q, color: "#2563eb", width: 2.4 }],
  segments: [{ from: [f.p, f.q - 6], to: [f.p, f.q + 6], color: "#dc2626", dash: true, width: 1.3 }, { from: [f.p - 6, f.q], to: [f.p + 6, f.q], color: "#dc2626", dash: true, width: 1.3 }],
});
export type Radical = { sign: 1 | -1; a: number; p: number; q: number }; // y = sign·√(a(x − p)) + q
export const radicalFnTex = (f: Radical) => {
  const shift = `x${f.p < 0 ? `+${-f.p}` : f.p === 0 ? "" : `-${f.p}`}`;
  // a = 1이면 괄호 없이 √(x − p)로 적습니다.
  const inside = f.a === 1 ? shift : `${f.a === -1 ? "-" : f.a}${f.p === 0 ? "x" : `(${shift})`}`;
  return `y=${f.sign < 0 ? "-" : ""}\\sqrt{${inside}}${f.q === 0 ? "" : f.q < 0 ? f.q : `+${f.q}`}`;
};
export const radicalDomain = (f: Radical) => f.a > 0 ? `\\{x\\mid x\\ge ${f.p}\\}` : `\\{x\\mid x\\le ${f.p}\\}`;
export const radicalRange = (f: Radical) => f.sign > 0 ? `\\{y\\mid y\\ge ${f.q}\\}` : `\\{y\\mid y\\le ${f.q}\\}`;
export const radicalSvg = (f: Radical) => planeSvg({
  xMin: Math.min(0, f.p) - 6, xMax: Math.max(0, f.p) + 6, yMin: Math.min(0, f.q) - 6, yMax: Math.max(0, f.q) + 6, unit: 22,
  // 정의역이 시작하는 곳부터 그립니다(끝점이 잘리지 않게).
  curves: [{ f: x => f.sign * Math.sqrt(Math.max(0, f.a * (x - f.p))) + f.q, from: f.a > 0 ? f.p : Math.min(0, f.p) - 6, to: f.a > 0 ? Math.max(0, f.p) + 6 : f.p, color: "#2563eb", width: 2.4 }],
  points: [{ x: f.p, y: f.q, label: `(${f.p}, ${f.q})`, color: "#dc2626" }],
});

/* ───── 문제 ───── */
export type FunctionAsk2 = "mapping" | "compose" | "inverse" | "rational" | "radical";
export const function2Asks: Record<FunctionAsk2, string> = { mapping: "함수·일대일대응 판정", compose: "합성함수", inverse: "역함수", rational: "유리함수의 점근선", radical: "무리함수의 정의역·치역" };

function randomMapping(r: Rng): Mapping {
  const kind = r.pick(["bijection", "injection", "function", "constant", "notFunction", "missing"] as const);
  const from = [1, 2, 3];
  const to = kind === "injection" ? ["a", "b", "c", "d"] : ["a", "b", "c"];
  const shuffle = (list: string[]) => [...list].sort(() => r.random() - 0.5);
  if (kind === "bijection" || kind === "injection") { const images = shuffle(to).slice(0, 3); return { from, to, arrows: from.map((x, i) => [x, images[i]]) }; }
  if (kind === "constant") { const y = r.pick(to); return { from, to, arrows: from.map(x => [x, y]) }; }
  if (kind === "function") return { from, to, arrows: [[1, "a"], [2, "a"], [3, r.pick(["b", "c"])]] };
  if (kind === "notFunction") return { from, to, arrows: [[1, "a"], [1, "b"], [2, "b"], [3, "c"]] };
  return { from, to, arrows: [[1, "b"], [2, "c"]] };
}
function makeFunction2(ask: FunctionAsk2, r: Rng) {
  if (ask === "mapping") {
    const map = randomMapping(r);
    return mathProblem(`집합 ${t(`X=\\{${map.from.join(",\\ ")}\\}`)}에서 집합 ${t(`Y=\\{${map.to.join(",\\ ")}\\}`)}로의 대응이 그림과 같다(${escapeHtml(mappingText(map))}). 이 대응이 함수인지 판단하고, 함수라면 일대일함수·일대일대응인지 말하시오.`,
      classify(map).name, { space: 10, figure: mappingSvg(map) });
  }
  if (ask === "compose") {
    const f = lin(r.nonzero(-3, 3), r.int(-5, 5));
    const g = lin(r.nonzero(-3, 3), r.int(-5, 5));
    const k = r.int(-3, 3);
    const gf = compose(g, f);
    return mathProblem(`두 함수 ${t(`f(x)=${linTex(f)},\\ g(x)=${linTex(g)}`)}에 대하여 ${t(`(g\\circ f)(x)`)}와 ${t(`(g\\circ f)(${k})`)}의 값을 구하시오.`,
      `${t(`(g\\circ f)(x)=${linTex(gf)}`)}, ${t(`(g\\circ f)(${k})=g(${qTex(linAt(f, q(k)))})=${qTex(linAt(gf, q(k)))}`)}`, { space: 12 });
  }
  if (ask === "inverse") {
    const f = lin(r.pick([2, 3, -2, 1, -1, 4]), r.int(-6, 6));
    const inv = inverse(f);
    // f(x₀) = y₀ 이면 f⁻¹(y₀) = x₀
    const x0 = r.int(-3, 3);
    const k = qTex(linAt(f, q(x0)));
    return mathProblem(`함수 ${t(`f(x)=${linTex(f)}`)}의 역함수 ${t("f^{-1}(x)")}를 구하고, ${t(`f^{-1}(${k})`)}의 값을 구하시오.`,
      `${t(`f^{-1}(x)=${linTex(inv)}`)}, ${t(`f^{-1}(${k})=${qTex(linAt(inv, linAt(f, q(x0))))}`)} (${t("y=f(x)")}를 ${t("x")}에 대하여 풀고 ${t("x")}와 ${t("y")}를 바꾼다)`, { space: 12 });
  }
  if (ask === "rational") {
    const f: Rational = { k: r.nonzero(-6, 6), p: r.int(-4, 4), q: r.int(-4, 4) };
    return mathProblem(`유리함수 ${t(rationalFractionTex(f))}의 그래프의 점근선의 방정식을 구하고, 정의역과 치역을 말하시오.`,
      `${t(rationalTex(f))} 이므로 점근선 ${t(`x=${f.p},\\ y=${f.q}`)}, 정의역 ${t(`\\{x\\mid x\\ne ${f.p}\\}`)}, 치역 ${t(`\\{y\\mid y\\ne ${f.q}\\}`)}`, { space: 12, answerFigure: rationalSvg(f) });
  }
  const f: Radical = { sign: r.pick([1, -1]), a: r.pick([1, 2, -1, -2]), p: r.int(-4, 4), q: r.int(-4, 4) };
  return mathProblem(`무리함수 ${t(radicalFnTex(f))}의 정의역과 치역을 구하시오.`, `정의역 ${t(radicalDomain(f))}, 치역 ${t(radicalRange(f))}`, { space: 10, answerFigure: radicalSvg(f) });
}
export function function2Problems(asks: FunctionAsk2[], count: number, seed: number): SheetSection[] { return buildSections(asks, function2Asks, count, seed, makeFunction2); }

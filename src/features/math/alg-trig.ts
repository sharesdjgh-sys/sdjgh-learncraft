/* 대수 Ⅱ: 삼각함수(호도법, 단위원, 특수각의 값, 그래프, 방정식·부등식)와 사인법칙·코사인법칙(삼각형 풀이, 넓이, 외접원)입니다.
   특수각(30°·45°의 배수)의 값은 a√m 꼴로 정확히 다룹니다. */
import { intIn, pickOf, sqrtQTex } from "./calc-base";
import { escapeHtml, mathProblem, num, plotSvg, q, qDiv, qMul, qNum, qSub, qTex, seededRandom, sampleFunction, svgText, svgWrap, tex, type PlotSeries, type Q, type SheetProblem, type SheetSection } from "./core";

/* ───── 정확한 값 c√m ───── */
/** c√m (m은 제곱 인수가 없는 자연수) */
export type Surd = { c: Q; m: number };
export const surd = (c: Q | number, m = 1): Surd => ({ c: typeof c === "number" ? q(c) : c, m });
export const surdValue = (value: Surd) => qNum(value.c) * Math.sqrt(value.m);
export const surdMul = (a: Surd, b: Surd): Surd => {
  // √m·√n = √(mn) 에서 제곱 인수를 밖으로 뺍니다.
  let inside = a.m * b.m;
  let outside = 1;
  for (let k = 2; k * k <= inside; k += 1) while (inside % (k * k) === 0) { inside /= k * k; outside *= k; }
  return { c: qMul(qMul(a.c, b.c), q(outside)), m: inside };
};
export function surdTex(value: Surd) {
  if (value.c.n === 0) return "0";
  if (value.m === 1) return qTex(value.c);
  const sign = value.c.n < 0 ? "-" : "";
  const top = Math.abs(value.c.n);
  const body = `${top === 1 ? "" : top}\\sqrt{${value.m}}`;
  return value.c.d === 1 ? `${sign}${body}` : `${sign}\\frac{${body}}{${value.c.d}}`;
}

/* ───── 각과 특수각 ───── */
/** 도 → 호도(π의 배수)를 TeX로: 120 → \frac{2}{3}\pi */
export function radianTex(degrees: number) {
  if (!Number.isInteger(degrees)) return num((degrees * Math.PI) / 180, 4);
  const ratio = q(degrees, 180);
  if (ratio.n === 0) return "0";
  const top = Math.abs(ratio.n);
  const sign = ratio.n < 0 ? "-" : "";
  return ratio.d === 1 ? `${sign}${top === 1 ? "" : top}\\pi` : `${sign}\\frac{${top === 1 ? "" : top}\\pi}{${ratio.d}}`;
}
/** 0° 이상 360° 미만으로 바꿉니다. */
export const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;
export const quadrant = (degrees: number) => { const d = normalize(degrees); return d % 90 === 0 ? 0 : Math.floor(d / 90) + 1; };

export type TrigName = "sin" | "cos" | "tan";
const BASE_SIN: Record<number, Surd> = { 0: surd(0), 30: surd(q(1, 2)), 45: surd(q(1, 2), 2), 60: surd(q(1, 2), 3), 90: surd(1) };
/** 30°·45°의 배수인 각의 삼각함수 값(정확한 값). tan이 정의되지 않으면 null입니다. 특수각이 아니면 undefined입니다. */
export function specialValue(name: TrigName, degrees: number): Surd | null | undefined {
  if (!Number.isInteger(degrees) || (degrees % 30 !== 0 && degrees % 45 !== 0)) return undefined;
  const d = normalize(degrees);
  const reference = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
  const sinSign = d > 180 ? -1 : 1;
  const cosSign = d > 90 && d < 270 ? -1 : 1;
  const sinValue = { c: qMul(BASE_SIN[reference].c, q(sinSign)), m: BASE_SIN[reference].m };
  const cosBase = BASE_SIN[90 - reference];
  const cosValue = { c: qMul(cosBase.c, q(cosSign)), m: cosBase.m };
  if (name === "sin") return sinValue;
  if (name === "cos") return cosValue;
  if (cosValue.c.n === 0) return null;
  // tan = sin / cos: √a/√b = √(ab)/b
  const ratio = qDiv(sinValue.c, cosValue.c);
  return surdMul({ c: qDiv(ratio, q(cosValue.m)), m: sinValue.m }, surd(1, cosValue.m));
}
export const trigValue = (name: TrigName, degrees: number) => { const r = (degrees * Math.PI) / 180; return name === "sin" ? Math.sin(r) : name === "cos" ? Math.cos(r) : Math.tan(r); };
/** 값 TeX: 특수각이면 정확한 값, 아니면 소수 넷째 자리까지 */
export function valueTex(name: TrigName, degrees: number) {
  const exact = specialValue(name, degrees);
  if (exact === null) return "\\text{정의되지 않음}";
  if (exact) return surdTex(exact);
  const value = trigValue(name, degrees);
  return Math.abs(Math.cos((degrees * Math.PI) / 180)) < 1e-12 && name === "tan" ? "\\text{정의되지 않음}" : `\\approx ${num(value, 4).replace("−", "-")}`;
}
export const SPECIAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

/** 단위원 위의 동경과 sin·cos 값을 그립니다. */
export function unitCircleSvg(degrees: number) {
  const size = 300; const c = size / 2; const r = 110;
  const angle = (degrees * Math.PI) / 180;
  const px = c + r * Math.cos(angle); const py = c - r * Math.sin(angle);
  const parts: string[] = [];
  parts.push(`<line x1="16" y1="${c}" x2="${size - 16}" y2="${c}" stroke="#111" stroke-width="1.2"/><line x1="${c}" y1="${size - 16}" x2="${c}" y2="16" stroke="#111" stroke-width="1.2"/>`);
  parts.push(`<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#6b7280" stroke-width="1.4"/>`);
  // 사분면 부호(sin, cos, tan 중 양수인 것)
  const signs = [["ALL(모두 +)", c + 62, c - 62], ["sin +", c - 62, c - 62], ["tan +", c - 62, c + 72], ["cos +", c + 62, c + 72]] as const;
  for (const [label, x, y] of signs) parts.push(svgText(x, y, label, { size: 10.5, anchor: "middle", color: "#9ca3af" }));
  // 회전한 각을 호로 표시합니다(여러 바퀴면 한 바퀴 안의 몫만).
  const sweep = normalize(degrees) === 0 && degrees !== 0 ? 360 : normalize(degrees);
  const arcR = 26;
  const end = (sweep * Math.PI) / 180;
  const large = sweep > 180 ? 1 : 0;
  if (sweep > 0 && sweep < 360) parts.push(`<path d="M${c + arcR} ${c} A${arcR} ${arcR} 0 ${large} 0 ${(c + arcR * Math.cos(end)).toFixed(1)} ${(c - arcR * Math.sin(end)).toFixed(1)}" fill="none" stroke="#7c3aed" stroke-width="1.6"/>`);
  parts.push(`<line x1="${c}" y1="${c}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="#7c3aed" stroke-width="2.4"/>`);
  parts.push(`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${px.toFixed(1)}" y2="${c}" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>`);
  parts.push(`<line x1="${c}" y1="${c}" x2="${px.toFixed(1)}" y2="${c}" stroke="#2563eb" stroke-width="2.6"/>`);
  parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="#7c3aed"/>`);
  parts.push(svgText(px + (Math.cos(angle) >= 0 ? 8 : -8), py + (Math.sin(angle) >= 0 ? -8 : 16), "P(cos θ, sin θ)", { size: 11, anchor: Math.cos(angle) >= 0 ? "start" : "end", weight: 700 }));
  parts.push(svgText(size - 18, c + 14, "x", { size: 12, italic: true }), svgText(c + 6, 26, "y", { size: 12, italic: true }), svgText(c - 6, c + 14, "O", { size: 11, anchor: "end" }));
  parts.push(svgText(c + r + 4, c + 14, "1", { size: 10.5 }), svgText(c - r - 4, c + 14, "−1", { size: 10.5, anchor: "end" }));
  return svgWrap(size, size, parts.join(""));
}

/* ───── 그래프 y = a·f(bx + c) + d ───── */
export type TrigGraph = { name: TrigName; a: number; b: number; c: number; d: number };
export const DEFAULT_TRIG_GRAPH: TrigGraph = { name: "sin", a: 2, b: 1, c: 0, d: 0 };
/** c는 π의 몇 배인지로 받습니다(예: c = 0.5 → π/2). */
export const trigGraphFunction = (graph: TrigGraph) => (x: number) => {
  const inside = graph.b * x + graph.c * Math.PI;
  const base = graph.name === "sin" ? Math.sin(inside) : graph.name === "cos" ? Math.cos(inside) : Math.tan(inside);
  return graph.a * base + graph.d;
};
const piMultipleTex = (value: number) => {
  const ratio = q(Math.round(value * 12), 12);
  if (Math.abs(qNum(ratio) - value) > 1e-9) return `${num(value, 3)}\\pi`;
  if (ratio.n === 0) return "0";
  const top = Math.abs(ratio.n);
  const sign = ratio.n < 0 ? "-" : "";
  return ratio.d === 1 ? `${sign}${top === 1 ? "" : top}\\pi` : `${sign}\\frac{${top === 1 ? "" : top}\\pi}{${ratio.d}}`;
};
export function trigGraphTex(graph: TrigGraph) {
  const coef = graph.a === 1 ? "" : graph.a === -1 ? "-" : num(graph.a, 3).replace("−", "-");
  const b = graph.b === 1 ? "x" : graph.b === -1 ? "-x" : `${num(graph.b, 3).replace("−", "-")}x`;
  const c = graph.c === 0 ? "" : graph.c > 0 ? `+${piMultipleTex(graph.c)}` : `-${piMultipleTex(-graph.c)}`;
  const d = graph.d === 0 ? "" : graph.d > 0 ? `+${num(graph.d, 3)}` : `-${num(-graph.d, 3)}`;
  return `y=${coef}\\${graph.name}\\left(${b}${c}\\right)${d}`;
}
export function trigGraphFacts(graph: TrigGraph) {
  const period = (graph.name === "tan" ? 1 : 2) / Math.abs(graph.b);
  return {
    period: piMultipleTex(period),
    max: graph.name === "tan" ? "\\text{없음}" : num(Math.abs(graph.a) + graph.d, 3).replace("−", "-"),
    min: graph.name === "tan" ? "\\text{없음}" : num(-Math.abs(graph.a) + graph.d, 3).replace("−", "-"),
  };
}
/** x축을 π/2 간격 눈금으로 그린 삼각함수 그래프입니다(−2π ~ 2π). */
export function trigGraphSvg(graph: TrigGraph, compare = true) {
  const f = trigGraphFunction(graph);
  const amplitude = graph.name === "tan" ? 4 : Math.abs(graph.a) + Math.abs(graph.d);
  const yMax = Math.max(2, Math.ceil(amplitude + 1));
  const yMin = -yMax;
  const xMin = -2 * Math.PI; const xMax = 2 * Math.PI;
  const series: PlotSeries[] = [];
  if (compare) {
    const plain = trigGraphFunction({ name: graph.name, a: 1, b: 1, c: 0, d: 0 });
    for (const points of sampleFunction(plain, xMin, xMax, { yMin, yMax, steps: 600 })) series.push({ points, color: "#9ca3af", width: 1.4, dash: true });
  }
  for (const points of sampleFunction(f, xMin, xMax, { yMin, yMax, steps: 800 })) series.push({ points, color: "#2563eb", width: 2.4 });
  return plotSvg({
    xLabel: "x", yLabel: "y", xMin, xMax, yMin, yMax, xStep: Math.PI / 2, yStep: yMax > 6 ? 2 : 1, width: 520, height: 300, hideTicks: true, series,
    legend: compare ? [{ label: graph.name === "tan" ? "y = tan x" : `y = ${graph.name} x`, color: "#9ca3af", dash: true }] : undefined,
    extra: (sx, sy) => {
      const labels: string[] = [];
      for (let k = -4; k <= 4; k += 1) if (k) labels.push(svgText(sx((k * Math.PI) / 2), sy(0) + 14, (k % 2 === 0 ? `${k / 2 === 1 ? "" : k / 2 === -1 ? "−" : String(k / 2).replace("-", "−")}π` : `${k < 0 ? "−" : ""}${Math.abs(k) === 1 ? "" : Math.abs(k)}π/2`), { size: 10, anchor: "middle", color: "#333" }));
      for (let y = yMin; y <= yMax; y += yMax > 6 ? 2 : 1) if (y) labels.push(svgText(sx(0) - 5, sy(y) + 3.5, String(y).replace("-", "−"), { size: 10, anchor: "end", color: "#333" }));
      return labels.join("");
    },
  });
}

/* ───── 삼각방정식·부등식 (0 ≤ x < 2π) ───── */
/** f(x) = value 인 특수각(15° 간격) 해를 찾습니다. */
export function solveSpecial(name: TrigName, value: Surd) {
  const target = surdValue(value);
  const out: number[] = [];
  for (let d = 0; d < 360; d += 15) {
    const exact = specialValue(name, d);
    if (exact && Math.abs(surdValue(exact) - target) < 1e-9) out.push(d);
  }
  return out;
}
/** f(x) > value (또는 <) 의 해를 구간으로 적습니다. */
export function inequalityTex(name: TrigName, value: Surd, greater: boolean) {
  const roots = solveSpecial(name, value);
  const target = surdValue(value);
  const holds = (d: number) => { const v = trigValue(name, d); return name === "tan" && Math.abs(Math.cos((d * Math.PI) / 180)) < 1e-9 ? false : greater ? v > target + 1e-12 : v < target - 1e-12; };
  // 해와 tan의 점근선(90°, 270°)으로 [0, 360)을 나누고, 가운데 값이 부등식을 만족하는 조각만 남깁니다. 부등호가 등호를 포함하지 않으므로 나눈 점은 빠집니다.
  const cuts = [...new Set([0, ...roots, ...(name === "tan" ? [90, 270] : []), 360])].sort((a, b) => a - b);
  const pieces: [number, number][] = [];
  for (let i = 0; i < cuts.length - 1; i += 1) if (holds((cuts[i] + cuts[i + 1]) / 2)) pieces.push([cuts[i], cuts[i + 1]]);
  // x = 0은 정의역의 끝이라, 만족하면 ≤로 적습니다.
  return pieces.map(([a, b]) => `${a === 0 && holds(0) ? "0\\le " : `${radianTex(a)}<`}x<${b === 360 ? "2\\pi" : radianTex(b)}`).join(",\\ ");
}

/* ───── 사인법칙·코사인법칙 ───── */
export type TriangleCase = "SSS" | "SAS" | "ASA" | "AAS" | "SSA";
export type TriangleInput = { case: TriangleCase; a: number; b: number; c: number; A: number; B: number; C: number };
export const DEFAULT_TRIANGLE: TriangleInput = { case: "SAS", a: 7, b: 5, c: 8, A: 60, B: 45, C: 60 };
export type Solved = { a: number; b: number; c: number; A: number; B: number; C: number; area: number; R: number };
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
function complete(a: number, b: number, c: number): Solved | null {
  if (!(a > 0 && b > 0 && c > 0) || a + b <= c || b + c <= a || a + c <= b) return null;
  const A = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
  const B = deg(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
  const C = 180 - A - B;
  return { a, b, c, A, B, C, area: 0.5 * b * c * Math.sin(rad(A)), R: a / (2 * Math.sin(rad(A))) };
}
/**
 * 주어진 조건으로 삼각형을 풉니다. SSA(두 변 a, b와 끼인각이 아닌 각 A)는 해가 0·1·2개일 수 있습니다.
 * 쓰는 값: SSS(a, b, c), SAS(b, c, A), ASA(A, c, B), AAS(A, B, a), SSA(a, b, A)
 */
export function solveTriangle(input: TriangleInput): Solved[] {
  const { a, b, c, A, B } = input;
  if (input.case === "SSS") { const s = complete(a, b, c); return s ? [s] : []; }
  if (input.case === "SAS") {
    if (!(A > 0 && A < 180)) return [];
    const side = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad(A)));
    const s = complete(side, b, c); return s ? [s] : [];
  }
  if (input.case === "ASA" || input.case === "AAS") {
    if (!(A > 0 && B > 0 && A + B < 180)) return [];
    const C = 180 - A - B;
    // 사인법칙: a/sinA = b/sinB = c/sinC = 2R
    const twoR = input.case === "ASA" ? c / Math.sin(rad(C)) : a / Math.sin(rad(A));
    const s = complete(twoR * Math.sin(rad(A)), twoR * Math.sin(rad(B)), twoR * Math.sin(rad(C))); return s ? [s] : [];
  }
  // SSA: sin B = b·sinA / a
  if (!(A > 0 && A < 180 && a > 0 && b > 0)) return [];
  const sinB = (b * Math.sin(rad(A))) / a;
  if (sinB > 1 + 1e-12) return [];
  const B1 = deg(Math.asin(Math.min(1, sinB)));
  const out: Solved[] = [];
  for (const angle of Math.abs(sinB - 1) < 1e-12 ? [90] : [B1, 180 - B1]) {
    if (A + angle >= 180 - 1e-9) continue;
    const C = 180 - A - angle;
    const s = complete(a, b, (a * Math.sin(rad(C))) / Math.sin(rad(A)));
    if (s && !out.some(item => Math.abs(item.c - s.c) < 1e-9)) out.push(s);
  }
  return out;
}
/** 풀린 삼각형을 그립니다. 변 a는 꼭짓점 A의 맞은편입니다. */
export function triangleSvg(solved: Solved, labels = true) {
  const width = 360; const height = 250;
  // B를 원점, C를 x축 위에 둡니다(BC = a).
  const Bp = [0, 0]; const Cp = [solved.a, 0];
  const Ap = [solved.c * Math.cos(rad(solved.B)), solved.c * Math.sin(rad(solved.B))];
  const xs = [Bp[0], Cp[0], Ap[0]]; const ys = [Bp[1], Cp[1], Ap[1]];
  const scale = Math.min((width - 80) / (Math.max(...xs) - Math.min(...xs)), (height - 70) / (Math.max(...ys) - Math.min(...ys) || 1));
  const ox = 40 - Math.min(...xs) * scale; const oy = height - 35;
  const P = ([x, y]: number[]) => [ox + x * scale, oy - y * scale];
  const [A, Bq, C] = [P(Ap), P(Bp), P(Cp)];
  const mid = (p: number[], r: number[]) => [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2];
  const centroid = [(A[0] + Bq[0] + C[0]) / 3, (A[1] + Bq[1] + C[1]) / 3];
  const away = (p: number[], distance: number) => { const dx = p[0] - centroid[0]; const dy = p[1] - centroid[1]; const len = Math.hypot(dx, dy) || 1; return [p[0] + (dx / len) * distance, p[1] + (dy / len) * distance]; };
  const f = (value: number) => value.toFixed(1);
  const parts = [`<path d="M${f(A[0])} ${f(A[1])} L${f(Bq[0])} ${f(Bq[1])} L${f(C[0])} ${f(C[1])} Z" fill="#eef2ff" stroke="#1e293b" stroke-width="2"/>`];
  const vertex = (p: number[], name: string, angle: number) => { const at = away(p, 16); parts.push(svgText(at[0], at[1] + 4, name, { size: 13, anchor: "middle", weight: 700 })); if (labels) { const inner = away(p, -24); parts.push(svgText(inner[0], inner[1] + 4, `${num(angle, 1)}°`, { size: 10, anchor: "middle", color: "#7c3aed" })); } };
  vertex(A, "A", solved.A); vertex(Bq, "B", solved.B); vertex(C, "C", solved.C);
  if (labels) {
    const side = (p: number[], r: number[], name: string, value: number) => { const m = away(mid(p, r), 14); parts.push(svgText(m[0], m[1] + 4, `${name} = ${num(value, 2)}`, { size: 10.5, anchor: "middle", color: "#2563eb" })); };
    side(Bq, C, "a", solved.a); side(A, C, "b", solved.b); side(A, Bq, "c", solved.c);
  }
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type TrigAsk = "convert" | "sector" | "value" | "identity" | "graph" | "equation" | "inequality";
export const trigAsks: Record<TrigAsk, string> = { convert: "호도법", sector: "부채꼴", value: "특수각의 값", identity: "삼각함수 사이의 관계", graph: "주기·최대·최소", equation: "삼각방정식", inequality: "삼각부등식" };
export type LawAsk = "sine" | "radius" | "cosine" | "cosAngle" | "area" | "ssa";
export const lawAsks: Record<LawAsk, string> = { sine: "사인법칙(변)", radius: "외접원의 반지름", cosine: "코사인법칙(변)", cosAngle: "코사인법칙(각)", area: "삼각형의 넓이", ssa: "삼각형의 개수" };

const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];
export function trigProblems(asks: TrigAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 67 + 23);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 12) => problems.push(mathProblem(html, answer, { space }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "convert") {
      const degrees = pickOf(random, [30, 45, 60, 72, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330, -60, 450]);
      if (random() < 0.5) add(`${tex(`${degrees}\\text{°}`)}를 호도법으로 나타내시오.`, tex(radianTex(degrees)), 8);
      else add(`${tex(radianTex(degrees))}를 육십분법으로 나타내시오.`, tex(`${degrees}\\text{°}`), 8);
    } else if (ask === "sector") {
      const r = intIn(random, 2, 8);
      const degrees = pickOf(random, [30, 45, 60, 90, 120, 135, 150]);
      const theta = q(degrees, 180);
      const arc = qMul(q(r), theta); const area = qMul(q(r * r, 2), theta);
      const piTex = (value: Q) => value.d === 1 ? `${value.n === 1 ? "" : value.n}\\pi` : `\\frac{${value.n === 1 ? "" : value.n}\\pi}{${value.d}}`;
      add(`반지름의 길이가 ${tex(String(r))}이고 중심각의 크기가 ${tex(radianTex(degrees))}인 부채꼴의 호의 길이와 넓이를 구하시오.`,
        `호의 길이 ${tex(`l=r\\theta=${piTex(arc)}`)}, 넓이 ${tex(`S=\\frac{1}{2}r^{2}\\theta=${piTex(area)}`)}`);
    } else if (ask === "value") {
      const name = pickOf(random, ["sin", "cos", "tan"] as const);
      const base = pickOf(random, SPECIAL_ANGLES.filter(d => !(name === "tan" && d % 180 === 90)));
      const turns = pickOf(random, [0, 0, 1, -1]);
      const degrees = base + 360 * turns;
      const shown = random() < 0.5 ? `${degrees}\\text{°}` : radianTex(degrees);
      add(`${tex(`\\${name}\\left(${shown}\\right)`)}의 값을 구하시오.`, `${tex(valueTex(name, degrees))}${turns ? ` &nbsp;(${tex(`${degrees}\\text{°}=${base}\\text{°}${turns > 0 ? "+" : "-"}360\\text{°}`)})` : ""}`, 8);
    } else if (ask === "identity") {
      if (random() < 0.5) {
        const [x, y, z] = pickOf(random, TRIPLES);
        const quad = pickOf(random, [2, 3, 4]);
        const sinSign = quad <= 2 ? 1 : -1; const cosSign = quad === 1 || quad === 4 ? 1 : -1;
        const sin = q(sinSign * y, z); const cos = q(cosSign * x, z);
        const range = quad === 2 ? "\\frac{\\pi}{2}<\\theta<\\pi" : quad === 3 ? "\\pi<\\theta<\\frac{3}{2}\\pi" : "\\frac{3}{2}\\pi<\\theta<2\\pi";
        add(`${tex(range)}이고 ${tex(`\\sin\\theta=${qTex(sin)}`)}일 때, ${tex("\\cos\\theta")}와 ${tex("\\tan\\theta")}의 값을 구하시오.`,
          `${tex(`\\cos\\theta=${qTex(cos)},\\ \\tan\\theta=${qTex(qDiv(sin, cos))}`)} &nbsp;(${tex("\\sin^{2}\\theta+\\cos^{2}\\theta=1")})`, 14);
      } else {
        const k = pickOf(random, [q(1, 2), q(1, 3), q(2, 3), q(1, 5), q(3, 4)]);
        const product = qDiv(qSub(qMul(k, k), q(1)), q(2));
        add(`${tex(`\\sin\\theta+\\cos\\theta=${qTex(k)}`)}일 때, ${tex("\\sin\\theta\\cos\\theta")}의 값을 구하시오.`, `${tex(qTex(product))} &nbsp;(양변을 제곱하면 ${tex(`1+2\\sin\\theta\\cos\\theta=${qTex(qMul(k, k))}`)})`);
      }
    } else if (ask === "graph") {
      const graph: TrigGraph = { name: pickOf(random, ["sin", "cos", "sin", "cos", "tan"] as const), a: pickOf(random, [1, 2, 3, -2, 0.5]), b: pickOf(random, [1, 2, 3, 0.5]), c: pickOf(random, [0, 0, 0.5, -0.25, 1]), d: intIn(random, -2, 2) };
      const facts = trigGraphFacts(graph);
      add(`함수 ${tex(trigGraphTex(graph))}의 주기${graph.name === "tan" ? "" : "와 최댓값, 최솟값"}을 구하시오.`,
        `주기 ${tex(facts.period)}${graph.name === "tan" ? " (최댓값·최솟값은 없음)" : `, 최댓값 ${tex(facts.max)}, 최솟값 ${tex(facts.min)}`}`, 10);
    } else {
      // 2 sin x = √3 처럼 특수각이 해가 되게 고릅니다.
      const name = pickOf(random, ["sin", "cos", "tan"] as const);
      const choices: Surd[] = name === "tan" ? [surd(1), surd(-1), surd(1, 3), surd(q(1, 3), 3), surd(-1, 3)] : [surd(q(1, 2)), surd(q(-1, 2)), surd(q(1, 2), 2), surd(q(1, 2), 3), surd(q(-1, 2), 3), surd(q(-1, 2), 2)];
      const value = pickOf(random, choices);
      const equation = name === "tan" ? `\\tan x=${surdTex(value)}` : value.m === 1 ? `2\\${name} x=${qTex(qMul(value.c, q(2)))}` : `2\\${name} x=${surdTex({ c: qMul(value.c, q(2)), m: value.m })}`;
      if (ask === "equation") {
        const roots = solveSpecial(name, value);
        add(`${tex("0\\le x<2\\pi")}일 때, 방정식 ${tex(equation)}의 해를 모두 구하시오.`, tex(roots.map(d => `x=${radianTex(d)}`).join(",\\ ")));
      } else {
        const greater = random() < 0.5;
        const inequality = equation.replace("=", greater ? ">" : "<");
        add(`${tex("0\\le x<2\\pi")}일 때, 부등식 ${tex(inequality)}의 해를 구하시오.`, tex(inequalityTex(name, value, greater)), 14);
      }
    }
  }
  return [{ heading: "삼각함수", problems }];
}

/** 2R·sinθ = R·(2 sinθ) 를 정확한 값으로 */
const sinSurd = (degrees: number) => specialValue("sin", degrees) as Surd;
export function lawProblems(asks: LawAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 71 + 29);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 14, figure?: string) => problems.push(mathProblem(html, answer, { space, figure }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "sine" || ask === "radius") {
      // A, B는 특수각, 외접원 반지름 R은 정수로 두고 a = 2R sinA, b = 2R sinB 를 정확히 씁니다.
      const pairs: [number, number][] = [[30, 45], [45, 60], [30, 60], [60, 45], [45, 30], [120, 30], [135, 30], [30, 120], [60, 30]];
      const [A, B] = pickOf(random, pairs);
      const R = intIn(random, 2, 6);
      const a = surdMul(surd(2 * R), sinSurd(A)); const b = surdMul(surd(2 * R), sinSurd(B));
      if (ask === "sine") add(`삼각형 ABC에서 ${tex(`A=${A}\\text{°},\\ B=${B}\\text{°},\\ b=${surdTex(b)}`)}일 때, ${tex("a")}의 값을 구하시오.`,
        `${tex(`a=${surdTex(a)}`)} &nbsp;(${tex(`\\frac{a}{\\sin ${A}\\text{°}}=\\frac{b}{\\sin ${B}\\text{°}}`)})`);
      else add(`삼각형 ABC에서 ${tex(`A=${A}\\text{°},\\ a=${surdTex(a)}`)}일 때, 외접원의 반지름의 길이 ${tex("R")}를 구하시오.`, `${tex(`R=${R}`)} &nbsp;(${tex(`\\frac{a}{\\sin A}=2R`)})`);
    } else if (ask === "cosine") {
      const A = pickOf(random, [60, 120, 90]);
      const b = intIn(random, 2, 8); const c = intIn(random, 2, 8);
      const square = b * b + c * c - (A === 60 ? b * c : A === 120 ? -b * c : 0);
      add(`삼각형 ABC에서 ${tex(`b=${b},\\ c=${c},\\ A=${A}\\text{°}`)}일 때, ${tex("a")}의 값을 구하시오.`,
        `${tex(`a=${sqrtQTex(q(square))}`)} &nbsp;(${tex(`a^{2}=${b}^{2}+${c}^{2}-2\\times${b}\\times${c}\\times\\cos ${A}\\text{°}=${square}`)})`);
    } else if (ask === "cosAngle") {
      // 코사인이 1/2, −1/2가 되는 세 변(특수각), 그 밖은 분수로 답합니다.
      const [a, b, c, angle] = pickOf(random, [[7, 5, 8, 60], [7, 3, 5, 120], [13, 7, 15, 60], [19, 5, 16, 120], [6, 4, 5, 0], [9, 7, 8, 0]] as const);
      const cos = q(b * b + c * c - a * a, 2 * b * c);
      add(`세 변의 길이가 ${tex(`a=${a},\\ b=${b},\\ c=${c}`)}인 삼각형 ABC에서 ${tex("\\cos A")}의 값${angle ? `과 ${tex("A")}의 크기` : ""}를 구하시오.`,
        `${tex(`\\cos A=\\frac{${b}^{2}+${c}^{2}-${a}^{2}}{2\\times${b}\\times${c}}=${qTex(cos)}`)}${angle ? `, ${tex(`A=${angle}\\text{°}`)}` : ""}`);
    } else if (ask === "area") {
      const C = pickOf(random, [30, 45, 60, 120, 135, 150]);
      const a = intIn(random, 2, 9); const b = intIn(random, 2, 9);
      const area = surdMul(surd(q(a * b, 2)), sinSurd(C));
      add(`삼각형 ABC에서 ${tex(`a=${a},\\ b=${b},\\ C=${C}\\text{°}`)}일 때, 삼각형 ABC의 넓이를 구하시오.`, `${tex(surdTex(area))} &nbsp;(${tex(`S=\\frac{1}{2}ab\\sin C`)})`);
    } else {
      // A = 30°, b = 2k 이면 높이 h = k: a < k → 0개, a = k → 1개, k < a < b → 2개, a ≥ b → 1개
      const k = intIn(random, 2, 5);
      const a = pickOf(random, [k - 1, k, k + 1, 2 * k - 1, 2 * k, 2 * k + 2].filter(value => value > 0));
      const count = a < k ? 0 : a === k ? 1 : a < 2 * k ? 2 : 1;
      add(`${tex(`A=30\\text{°},\\ b=${2 * k},\\ a=${a}`)}인 삼각형 ABC는 몇 개 만들어지는지 구하시오.`, `${count}개 &nbsp;(꼭짓점 C에서 변 AB까지의 거리 ${tex(`b\\sin A=${k}`)}와 ${tex(`a=${a}`)}${count === 2 ? `, ${tex(`b=${2 * k}`)}` : ""}를 비교)`, 10);
    }
  }
  return [{ heading: "사인법칙과 코사인법칙", problems }];
}

/** 특수각 값 표(학습지·화면용 HTML) */
export function specialTableHtml(angles = [0, 30, 45, 60, 90]) {
  const head = ["θ", ...angles.map(d => `${tex(radianTex(d))}<br><span style="font-size:8.5pt;color:#555">(${d}°)</span>`)];
  const rows = (["sin", "cos", "tan"] as const).map(name => [tex(`\\${name}\\theta`), ...angles.map(d => tex(valueTex(name, d).replace("\\text{정의되지 않음}", "\\times")))]);
  return `<table style="border-collapse:collapse;margin:1.5mm 0;font-size:10pt">${[head, ...rows].map((row, r) => `<tr>${row.map(cell => `<${r ? "td" : "th"} style="border:1px solid #444;padding:1.2mm 2.2mm;text-align:center;${r ? "" : "background:#f1f1f1"}">${cell}</${r ? "td" : "th"}>`).join("")}</tr>`).join("")}</table>`;
}
/** 풀이 결과 한 줄(화면용 HTML) */
export const solvedLine = (solved: Solved) => escapeHtml(`a = ${num(solved.a, 3)}, b = ${num(solved.b, 3)}, c = ${num(solved.c, 3)} · A = ${num(solved.A, 2)}°, B = ${num(solved.B, 2)}°, C = ${num(solved.C, 2)}°`);

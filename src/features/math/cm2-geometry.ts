/* 공통수학 2 · 도형의 방정식: 두 점 사이의 거리, 선분의 내분점, 직선의 방정식, 두 직선의 평행·수직, 점과 직선 사이의 거리, 원의 방정식과 접선, 평행이동·대칭이동입니다. */
import { mathProblem, q, qAdd, qDiv, qMul, qSub, qTex, radicalTex, sqrtParts, tex, type Q, type SheetSection } from "./core";
import { buildSections, lineTex, reduceInts, slopeTex, tj, type Rng } from "./cm-util";
import { fitRange, planeSvg, type PlaneLine } from "./cm-plane";

export type Pt = { x: number; y: number };
const t = tex;
const ptTex = (x: number | Q, y: number | Q) => `(${typeof x === "number" ? x : qTex(x)},\\ ${typeof y === "number" ? y : qTex(y)})`;

/** 두 점 사이의 거리 √(Δx² + Δy²)를 간단히 한 TeX */
export const distanceTex = (a: Pt, b: Pt) => radicalTex(1, (b.x - a.x) ** 2 + (b.y - a.y) ** 2);
/** 선분 AB를 m : n으로 내분하는 점 */
export const internal = (a: Pt, b: Pt, m: number, n: number) => ({ x: q(m * b.x + n * a.x, m + n), y: q(m * b.y + n * a.y, m + n) });
/** 두 점을 지나는 직선 ax + by + c = 0 (정수 계수) */
export function lineThrough(a: Pt, b: Pt): PlaneLine {
  const [la, lb, lc] = reduceInts([b.y - a.y, a.x - b.x, b.x * a.y - a.x * b.y]);
  return { a: la, b: lb, c: lc };
}
/** 직선 ax + by + c = 0을 y = mx + k로(세로선이면 null) */
export const slopeForm = (line: PlaneLine) => line.b === 0 ? null : { m: q(-line.a, line.b), k: q(-line.c, line.b) };
export const lineEquationTex = (line: PlaneLine) => { const form = slopeForm(line); return form ? slopeTex(form.m, form.k) : `x=${qTex(q(-line.c, line.a))}`; };
/** 점 (x₀, y₀)과 직선 ax + by + c = 0 사이의 거리 |ax₀ + by₀ + c| / √(a² + b²) — TeX와 값 */
export function pointLineDistance(p: Pt, line: PlaneLine) {
  const top = Math.abs(line.a * p.x + line.b * p.y + line.c);
  const square = line.a ** 2 + line.b ** 2;
  const { outside, inside } = sqrtParts(square);
  // top / (outside√inside) = top√inside / (outside·inside)
  const value = top / Math.sqrt(square);
  if (inside === 1) return { value, tex: qTex(q(top, outside)) };
  const frac = q(top, outside * inside);
  const coef = frac.n === 1 ? "" : String(frac.n);
  return { value, tex: top === 0 ? "0" : frac.d === 1 ? `${coef}\\sqrt{${inside}}` : `\\frac{${coef}\\sqrt{${inside}}}{${frac.d}}` };
}
/** 두 직선의 위치 관계 */
export function lineRelation(l1: PlaneLine, l2: PlaneLine) {
  const cross = l1.a * l2.b - l2.a * l1.b;
  if (cross === 0) return l1.a * l2.c === l2.a * l1.c && l1.b * l2.c === l2.b * l1.c ? "일치한다" : "평행하다";
  return l1.a * l2.a + l1.b * l2.b === 0 ? "수직으로 만난다" : "한 점에서 만난다";
}

/* ───── 원 ───── */
export type Circle = { cx: number; cy: number; r2: number }; // (x − cx)² + (y − cy)² = r2
export function circleStandardTex(c: Circle) {
  const part = (v: string, center: number) => center === 0 ? `${v}^{2}` : `(${v}${center < 0 ? "+" : "-"}${Math.abs(center)})^{2}`;
  return `${part("x", c.cx)}+${part("y", c.cy)}=${c.r2}`;
}
/** 일반형 x² + y² + Ax + By + C = 0 */
export function circleGeneralTex(c: Circle) {
  const A = -2 * c.cx;
  const B = -2 * c.cy;
  const C = c.cx ** 2 + c.cy ** 2 - c.r2;
  const term = (coef: number, name: string) => coef === 0 ? "" : `${coef < 0 ? "-" : "+"}${Math.abs(coef) === 1 && name ? "" : Math.abs(coef)}${name}`;
  return `x^{2}+y^{2}${term(A, "x")}${term(B, "y")}${term(C, "")}=0`;
}
export const radiusTex = (c: Circle) => radicalTex(1, c.r2);
/** 원과 직선의 위치 관계: 중심과 직선 사이의 거리 d와 반지름 r 비교 */
export function circleLine(c: Circle, line: PlaneLine) {
  const d2 = q((line.a * c.cx + line.b * c.cy + line.c) ** 2, line.a ** 2 + line.b ** 2);
  const cmp = d2.n - c.r2 * d2.d;
  return { d: pointLineDistance({ x: c.cx, y: c.cy }, line), relation: cmp < 0 ? "서로 다른 두 점에서 만난다" : cmp === 0 ? "한 점에서 만난다(접한다)" : "만나지 않는다" };
}
/** 원 위의 점 (x₁, y₁)에서의 접선: (x₁ − a)(x − a) + (y₁ − b)(y − b) = r² 를 ax + by + c = 0으로 */
export function tangentAt(c: Circle, p: Pt): PlaneLine {
  const [dx, dy] = [p.x - c.cx, p.y - c.cy];
  const [a, b, k] = reduceInts([dx, dy, -(dx * c.cx + dy * c.cy + c.r2)]);
  return { a, b, c: k };
}
/** 원 x² + y² = r²에 접하고 기울기가 m인 접선: y = mx ± r√(m² + 1) */
export const tangentSlopeTex = (r2: number, m: number) => `y=${m === 1 ? "" : m === -1 ? "-" : m}x\\pm ${radicalTex(1, r2 * (m * m + 1))}`;
export const circleSvg = (c: Circle, options: { lines?: PlaneLine[]; points?: Pt[] } = {}) => {
  const r = Math.sqrt(c.r2);
  const range = fitRange([[c.cx - r, c.cy - r], [c.cx + r, c.cy + r], ...(options.points ?? []).map(p => [p.x, p.y] as [number, number])]);
  return planeSvg({ ...range, circles: [{ cx: c.cx, cy: c.cy, r }], points: [{ x: c.cx, y: c.cy, label: "중심" }, ...(options.points ?? []).map(p => ({ ...p, label: `(${p.x}, ${p.y})` }))], lines: (options.lines ?? []).map(line => ({ ...line, color: "#2563eb" })) });
};

/* ───── 도형의 이동 ───── */
export type Move = "shift" | "xAxis" | "yAxis" | "origin" | "yx";
export const moveNames: Record<Move, string> = { shift: "평행이동", xAxis: "x축 대칭", yAxis: "y축 대칭", origin: "원점 대칭", yx: "직선 y = x 대칭" };
export function movePoint(p: Pt, move: Move, dx = 0, dy = 0): Pt {
  switch (move) {
    case "shift": return { x: p.x + dx, y: p.y + dy };
    case "xAxis": return { x: p.x, y: -p.y };
    case "yAxis": return { x: -p.x, y: p.y };
    case "origin": return { x: -p.x, y: -p.y };
    case "yx": return { x: p.y, y: p.x };
  }
}
/** 직선 ax + by + c = 0을 옮긴 식: x 대신 (역변환)을 넣습니다. */
export function moveLine(line: PlaneLine, move: Move, dx = 0, dy = 0): PlaneLine {
  switch (move) {
    case "shift": return { a: line.a, b: line.b, c: line.c - line.a * dx - line.b * dy };
    case "xAxis": return { a: line.a, b: -line.b, c: line.c };
    case "yAxis": return { a: -line.a, b: line.b, c: line.c };
    case "origin": return { a: -line.a, b: -line.b, c: line.c };
    case "yx": return { a: line.b, b: line.a, c: line.c };
  }
}
export const moveCircle = (c: Circle, move: Move, dx = 0, dy = 0): Circle => { const center = movePoint({ x: c.cx, y: c.cy }, move, dx, dy); return { cx: center.x, cy: center.y, r2: c.r2 }; };
/** 삼각형을 옮기기 전과 후를 함께 그립니다. */
export function moveSvg(points: Pt[], move: Move, dx = 0, dy = 0) {
  const moved = points.map(p => movePoint(p, move, dx, dy));
  const range = fitRange([...points, ...moved].map(p => [p.x, p.y] as [number, number]), 1.2, 6);
  const guide: PlaneLine[] = move === "yx" ? [{ a: 1, b: -1, c: 0, color: "#888", dash: true, label: "y=x" }] : [];
  return planeSvg({
    ...range, lines: guide,
    polygons: [{ points: points.map(p => [p.x, p.y]), color: "rgba(37,99,235,.18)", stroke: "#2563eb" }, { points: moved.map(p => [p.x, p.y]), color: "rgba(220,38,38,.18)", stroke: "#dc2626" }],
    points: [...points.map((p, i) => ({ ...p, label: "ABC"[i], color: "#2563eb" })), ...moved.map((p, i) => ({ ...p, label: `${"ABC"[i]}′`, color: "#dc2626" }))],
  });
}

/* ───── 문제 ───── */
export type LineAsk = "distance" | "divide" | "through" | "parallel" | "pointLine";
export const lineAsks: Record<LineAsk, string> = { distance: "두 점 사이의 거리", divide: "선분의 내분점", through: "두 점을 지나는 직선", parallel: "평행·수직인 직선", pointLine: "점과 직선 사이의 거리" };
export type CircleAsk = "standard" | "general" | "relation" | "tangentPoint" | "tangentSlope";
export const circleAsks: Record<CircleAsk, string> = { standard: "원의 방정식 구하기", general: "일반형 → 중심·반지름", relation: "원과 직선의 위치 관계", tangentPoint: "원 위의 점에서의 접선", tangentSlope: "기울기가 주어진 접선" };
export type MoveAsk = "point" | "line" | "circle";
export const moveAsks: Record<MoveAsk, string> = { point: "점의 이동", line: "직선의 이동", circle: "원의 이동" };

const pt = (r: Rng, range = 6): Pt => ({ x: r.int(-range, range), y: r.int(-range, range) });
function makeLine(ask: LineAsk, r: Rng) {
  if (ask === "distance") {
    // 피타고라스 수를 섞어 정수 거리도 나오게 합니다.
    const a = pt(r, 5);
    const [dx, dy] = r.random() < 0.5 ? r.pick([[3, 4], [6, 8], [5, 12], [4, 3]]) : [r.nonzero(-5, 5), r.nonzero(-5, 5)];
    const b = { x: a.x + dx * r.pick([1, -1]), y: a.y + dy * r.pick([1, -1]) };
    return mathProblem(`두 점 ${t(`A${ptTex(a.x, a.y)},\\ B${ptTex(b.x, b.y)}`)} 사이의 거리를 구하시오.`, `${t(distanceTex(a, b))} (${t(`\\sqrt{${(b.x - a.x) ** 2}+${(b.y - a.y) ** 2}}`)})`, { space: 10 });
  }
  if (ask === "divide") {
    const [m, n] = r.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 1]]);
    // 좌표가 정수가 되도록 B − A를 (m + n)의 배수로 잡습니다.
    const a = pt(r, 4);
    const b = { x: a.x + (m + n) * r.int(-2, 2), y: a.y + (m + n) * r.nonzero(-2, 2) };
    const p = internal(a, b, m, n);
    return mathProblem(`두 점 ${t(`A${ptTex(a.x, a.y)},\\ B${ptTex(b.x, b.y)}`)}에 대하여 선분 AB를 ${tj(`${m}:${n}`, "으로")} 내분하는 점의 좌표를 구하시오.`,
      `${t(ptTex(p.x, p.y))} (${t(`\\left(\\frac{${m}\\cdot${b.x < 0 ? `(${b.x})` : b.x}+${n}\\cdot${a.x < 0 ? `(${a.x})` : a.x}}{${m + n}},\\ \\frac{${m}\\cdot${b.y < 0 ? `(${b.y})` : b.y}+${n}\\cdot${a.y < 0 ? `(${a.y})` : a.y}}{${m + n}}\\right)`)})`, { space: 12 });
  }
  if (ask === "through") {
    const a = pt(r, 5);
    let b = pt(r, 5);
    if (b.x === a.x && b.y === a.y) b = { x: a.x + 2, y: a.y - 1 };
    const line = lineThrough(a, b);
    return mathProblem(`두 점 ${tj(`${ptTex(a.x, a.y)},\\ ${ptTex(b.x, b.y)}`, "을")} 지나는 직선의 방정식을 구하시오.`, `${t(lineEquationTex(line))} (${t(lineTex(line.a, line.b, line.c))})`, { space: 10, answerFigure: planeSvg({ ...fitRange([[a.x, a.y], [b.x, b.y]]), lines: [line], points: [a, b] }) });
  }
  if (ask === "parallel") {
    const m = q(r.nonzero(-3, 3), r.pick([1, 1, 2]));
    const k = r.int(-5, 5);
    const p = pt(r, 4);
    const perpendicular = r.random() < 0.5;
    const slope = perpendicular ? qDiv(q(-1), m) : m;
    const intercept = qSub(q(p.y), qMul(slope, q(p.x)));
    return mathProblem(`점 ${tj(ptTex(p.x, p.y), "을")} 지나고 직선 ${t(slopeTex(m, q(k)))}에 ${perpendicular ? "수직인" : "평행한"} 직선의 방정식을 구하시오.`,
      `${t(slopeTex(slope, intercept))} (${perpendicular ? "수직: 기울기의 곱이 −1" : "평행: 기울기가 같다"}, 기울기 ${t(qTex(slope))})`, { space: 10 });
  }
  // 점과 직선 사이의 거리: 3·4·5 같은 계수로 깔끔하게
  const [la, lb] = r.pick([[3, 4], [4, -3], [1, 1], [1, -2], [2, 1], [5, 12], [1, 0]]);
  const lc = r.int(-8, 8);
  const p = pt(r, 4);
  const line = { a: la, b: lb, c: lc };
  const d = pointLineDistance(p, line);
  return mathProblem(`점 ${tj(ptTex(p.x, p.y), "과")} 직선 ${t(lineTex(la, lb, lc))} 사이의 거리를 구하시오.`, `${t(d.tex)} (${t(`\\frac{|${la}\\cdot${p.x < 0 ? `(${p.x})` : p.x}+${lb < 0 ? `(${lb})` : lb}\\cdot${p.y < 0 ? `(${p.y})` : p.y}${lc < 0 ? lc : `+${lc}`}|}{\\sqrt{${la * la}+${lb * lb}}}`)})`, { space: 12 });
}

function makeCircle(ask: CircleAsk, r: Rng) {
  const c: Circle = { cx: r.int(-4, 4), cy: r.int(-4, 4), r2: r.pick([1, 4, 9, 16, 25, 2, 5, 8, 10]) };
  if (ask === "standard") {
    // 중심과 원 위의 한 점으로
    const [dx, dy] = r.pick([[3, 4], [0, 2], [1, 2], [2, 2], [4, 3], [0, 5], [1, 3]]);
    const on = { x: c.cx + dx, y: c.cy + dy };
    const circle = { ...c, r2: dx * dx + dy * dy };
    return mathProblem(`중심이 ${t(ptTex(c.cx, c.cy))}이고 점 ${tj(ptTex(on.x, on.y), "을")} 지나는 원의 방정식을 구하시오.`, `${t(circleStandardTex(circle))} (반지름 ${t(radiusTex(circle))})`, { space: 10, answerFigure: circleSvg(circle, { points: [on] }) });
  }
  if (ask === "general") return mathProblem(`원 ${t(circleGeneralTex(c))}의 중심의 좌표와 반지름의 길이를 구하시오.`, `중심 ${t(ptTex(c.cx, c.cy))}, 반지름 ${t(radiusTex(c))} (${t(circleStandardTex(c))})`, { space: 12 });
  if (ask === "relation") {
    const circle = { cx: 0, cy: 0, r2: r.pick([4, 5, 9, 10, 25]) };
    const [la, lb] = r.pick([[1, 1], [1, -1], [1, 2], [2, -1], [3, 4], [1, 3]]);
    const lc = r.int(-8, 8);
    const result = circleLine(circle, { a: la, b: lb, c: lc });
    return mathProblem(`원 ${tj(circleStandardTex(circle), "과")} 직선 ${t(lineTex(la, lb, lc))}의 위치 관계를 말하시오.`, `${result.relation} (중심과 직선 사이의 거리 ${t(result.d.tex)}, 반지름 ${t(radiusTex(circle))})`, { space: 12 });
  }
  if (ask === "tangentPoint") {
    const [dx, dy] = r.pick([[3, 4], [4, 3], [0, 2], [2, 0], [1, 2], [2, -1], [-3, 4], [1, 1]]);
    const circle = { ...c, r2: dx * dx + dy * dy };
    const p = { x: c.cx + dx, y: c.cy + dy };
    const line = tangentAt(circle, p);
    return mathProblem(`원 ${t(circleStandardTex(circle))} 위의 점 ${t(ptTex(p.x, p.y))}에서의 접선의 방정식을 구하시오.`, `${t(lineTex(line.a, line.b, line.c))} (${t(lineEquationTex(line))})`, { space: 12, answerFigure: circleSvg(circle, { lines: [line], points: [p] }) });
  }
  const r2 = r.pick([1, 2, 4, 5, 9]);
  const m = r.nonzero(-3, 3);
  return mathProblem(`원 ${t(`x^{2}+y^{2}=${r2}`)}에 접하고 기울기가 ${t(String(m))}인 직선의 방정식을 구하시오.`, `${t(tangentSlopeTex(r2, m))} (${t(`y=mx\\pm r\\sqrt{m^{2}+1}`)})`, { space: 10 });
}

function makeMove(ask: MoveAsk, r: Rng) {
  const move = r.pick(["shift", "xAxis", "yAxis", "origin", "yx"] as const);
  const [dx, dy] = [r.nonzero(-4, 4), r.nonzero(-4, 4)];
  const how = move === "shift" ? `${t("x")}축의 방향으로 ${t(String(dx))}만큼, ${t("y")}축의 방향으로 ${t(String(dy))}만큼 평행이동한` : `${move === "xAxis" ? t("x") + "축" : move === "yAxis" ? t("y") + "축" : move === "origin" ? "원점" : `직선 ${t("y=x")}`}에 대하여 대칭이동한`;
  if (ask === "point") {
    // 원점이나 직선 y = x 위의 점처럼 옮겨도 그대로인 점은 피합니다.
    const p = { x: r.nonzero(-5, 5), y: r.nonzero(-5, 5) };
    if (p.x === p.y) p.y = p.x > 0 ? -p.y : p.y - 1;
    const moved = movePoint(p, move, dx, dy);
    return mathProblem(`점 ${tj(ptTex(p.x, p.y), "을")} ${how} 점의 좌표를 구하시오.`, `${t(ptTex(moved.x, moved.y))}`, { space: 8 });
  }
  if (ask === "line") {
    const [la, lb] = r.pick([[1, -2], [2, 1], [1, 1], [3, -1], [2, -3]]);
    const line = { a: la, b: lb, c: r.int(-6, 6) };
    const moved = moveLine(line, move, dx, dy);
    return mathProblem(`직선 ${tj(lineTex(line.a, line.b, line.c), "을")} ${how} 직선의 방정식을 구하시오.`, `${t(lineTex(moved.a, moved.b, moved.c))}`, { space: 10 });
  }
  const c: Circle = { cx: r.int(-3, 3), cy: r.int(-3, 3), r2: r.pick([1, 4, 9, 2, 5]) };
  const moved = moveCircle(c, move, dx, dy);
  return mathProblem(`원 ${tj(circleStandardTex(c), "을")} ${how} 원의 방정식을 구하시오.`, `${t(circleStandardTex(moved))} (중심 ${t(ptTex(c.cx, c.cy))} → ${t(ptTex(moved.cx, moved.cy))}, 반지름은 그대로)`, { space: 10 });
}

export function lineProblems(asks: LineAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, lineAsks, count, seed, makeLine); }
export function circleProblems(asks: CircleAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, circleAsks, count, seed, makeCircle); }
export function moveProblems(asks: MoveAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, moveAsks, count, seed, makeMove); }
export { ptTex, qAdd };

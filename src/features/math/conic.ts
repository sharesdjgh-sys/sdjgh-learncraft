/* 기하 Ⅰ. 이차곡선: 포물선·타원·쌍곡선의 초점·준선·꼭짓점·점근선과 평행이동, 이차곡선의 접선의 방정식입니다. */
import { mathProblem, num, plotSvg, q, qDiv, qMul, qNeg, qTex, radicalTex, svgText, tex, type PlotSeries, type Q, type SheetProblem, type SheetSection } from "./core";
import { eachAsk, picker, signedText } from "./pg-common";

/**
 * 포물선: 'x' → (y−n)² = 4p(x−m), 'y' → (x−m)² = 4p(y−n)
 * 타원: x²/A + y²/B = 1 (A = a², B = b²)을 (m, n)만큼 평행이동
 * 쌍곡선: x²/A − y²/B = sign(±1)을 (m, n)만큼 평행이동
 */
export type Conic =
  | { kind: "parabola"; axis: "x" | "y"; p: number; m: number; n: number }
  | { kind: "ellipse"; A: number; B: number; m: number; n: number }
  | { kind: "hyperbola"; A: number; B: number; sign: 1 | -1; m: number; n: number };

const sq = (value: number) => Math.sqrt(value);
/** (x−m)² 꼴 TeX */
const shifted = (variable: string, shift: number) => shift === 0 ? `${variable}^{2}` : `(${variable}${shift > 0 ? "-" : "+"}${Math.abs(shift)})^{2}`;
const shiftedLinear = (variable: string, shift: number) => shift === 0 ? variable : `(${variable}${shift > 0 ? "-" : "+"}${Math.abs(shift)})`;

/** 곡선의 방정식 TeX */
export function conicTex(conic: Conic) {
  if (conic.kind === "parabola") {
    const coef = 4 * conic.p;
    return conic.axis === "x" ? `${shifted("y", conic.n)}=${num(coef, 3)}${shiftedLinear("x", conic.m)}` : `${shifted("x", conic.m)}=${num(coef, 3)}${shiftedLinear("y", conic.n)}`;
  }
  const left = `\\frac{${shifted("x", conic.m)}}{${conic.A}}`;
  const right = `\\frac{${shifted("y", conic.n)}}{${conic.B}}`;
  if (conic.kind === "ellipse") return `${left}+${right}=1`;
  return `${left}-${right}=${conic.sign}`;
}

/** 초점·꼭짓점·준선·점근선 등 특징. c는 TeX(근호 포함)와 수치로 함께 줍니다. */
export function conicInfo(conic: Conic) {
  const pt = (x: number, y: number) => `(${num(x, 3)},\\ ${num(y, 3)})`;
  if (conic.kind === "parabola") {
    const { p, m, n } = conic;
    const focus = conic.axis === "x" ? [p + m, n] : [m, p + n];
    return {
      foci: [focus as [number, number]],
      rows: [
        ["꼭짓점", tex(pt(m, n))],
        ["초점", tex(pt(focus[0], focus[1]))],
        ["준선", tex(conic.axis === "x" ? `x=${num(m - p, 3)}` : `y=${num(n - p, 3)}`)],
        ["축", tex(conic.axis === "x" ? `y=${num(n, 3)}` : `x=${num(m, 3)}`)],
      ],
    };
  }
  const { A, B, m, n } = conic;
  if (conic.kind === "ellipse") {
    const horizontal = A >= B;
    const c2 = Math.abs(A - B);
    const cTex = radicalTex(1, c2);
    const c = sq(c2);
    const foci: [number, number][] = horizontal ? [[m + c, n], [m - c, n]] : [[m, n + c], [m, n - c]];
    const major = 2 * sq(Math.max(A, B));
    const minor = 2 * sq(Math.min(A, B));
    const focusTex = horizontal ? `(${m ? `${m}\\pm ` : "\\pm "}${cTex},\\ ${n})` : `(${m},\\ ${n ? `${n}\\pm ` : "\\pm "}${cTex})`;
    return {
      foci,
      rows: [
        ["중심", tex(pt(m, n))],
        ["초점", tex(focusTex)],
        ["장축의 길이", tex(radicalTex(2, Math.max(A, B)))],
        ["단축의 길이", tex(radicalTex(2, Math.min(A, B)))],
        ["두 초점까지 거리의 합", `${tex(radicalTex(2, Math.max(A, B)))} (장축의 길이)`],
      ],
      major, minor,
    };
  }
  const horizontal = conic.sign === 1;
  const c2 = A + B;
  const cTex = radicalTex(1, c2);
  const c = sq(c2);
  const foci: [number, number][] = horizontal ? [[m + c, n], [m - c, n]] : [[m, n + c], [m, n - c]];
  const slope = `\\frac{${radicalTex(1, B)}}{${radicalTex(1, A)}}`;
  const vertex = horizontal ? radicalTex(1, A) : radicalTex(1, B);
  const focusTex = horizontal ? `(${m ? `${m}\\pm ` : "\\pm "}${cTex},\\ ${n})` : `(${m},\\ ${n ? `${n}\\pm ` : "\\pm "}${cTex})`;
  const vertexTex = horizontal ? `(${m ? `${m}\\pm ` : "\\pm "}${vertex},\\ ${n})` : `(${m},\\ ${n ? `${n}\\pm ` : "\\pm "}${vertex})`;
  return {
    foci,
    rows: [
      ["중심", tex(pt(m, n))],
      ["초점", tex(focusTex)],
      ["꼭짓점", tex(vertexTex)],
      ["주축의 길이", tex(radicalTex(2, horizontal ? A : B))],
      ["점근선", tex(`${shiftedLinear("y", n)}=\\pm ${slope}${shiftedLinear("x", m)}`)],
      ["두 초점까지 거리의 차", `${tex(radicalTex(2, horizontal ? A : B))} (주축의 길이)`],
    ],
  };
}

/** 곡선을 그릴 점 묶음(매개변수로 촘촘히) */
export function conicSeries(conic: Conic, range: number): PlotSeries[] {
  const color = "#1d4ed8";
  const steps = 240;
  if (conic.kind === "parabola") {
    const { p, m, n, axis } = conic;
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = -range * 1.2 + (2.4 * range * i) / steps;
      const along = (t * t) / (4 * p);
      points.push(axis === "x" ? [m + along, n + t] : [m + t, n + along]);
    }
    return [{ points, color }];
  }
  if (conic.kind === "ellipse") {
    const a = sq(conic.A);
    const b = sq(conic.B);
    return [{ points: Array.from({ length: steps + 1 }, (_, i) => { const t = (2 * Math.PI * i) / steps; return [conic.m + a * Math.cos(t), conic.n + b * Math.sin(t)] as [number, number]; }), color }];
  }
  const a = sq(conic.A);
  const b = sq(conic.B);
  const branch = (side: 1 | -1): [number, number][] => Array.from({ length: steps + 1 }, (_, i) => {
    const t = -3 + (6 * i) / steps;
    return conic.sign === 1 ? [conic.m + side * a * Math.cosh(t), conic.n + b * Math.sinh(t)] : [conic.m + a * Math.sinh(t), conic.n + side * b * Math.cosh(t)];
  });
  const k = b / a;
  const asymptote = (s: 1 | -1): [number, number][] => [[conic.m - range * 2, conic.n - s * k * range * 2], [conic.m + range * 2, conic.n + s * k * range * 2]];
  return [{ points: branch(1), color }, { points: branch(-1), color }, { points: asymptote(1), color: "#94a3b8", dash: true, width: 1.2 }, { points: asymptote(-1), color: "#94a3b8", dash: true, width: 1.2 }];
}

/** 이차곡선 그림(초점·준선, 접선을 더 그릴 수 있음) */
export function conicSvg(conic: Conic, options: { tangent?: { slope: number; intercept: number } | { vertical: number }; point?: [number, number]; title?: string } = {}) {
  const extent = conic.kind === "parabola" ? Math.max(6, Math.abs(conic.p) * 4) : Math.max(sq(conic.A), sq(conic.B)) * (conic.kind === "hyperbola" ? 2.2 : 1.4);
  const range = Math.ceil(extent + Math.max(Math.abs(conic.m), Math.abs(conic.n)));
  // 직선은 그림 안에 드는 부분만 남깁니다.
  const clip = (points: [number, number][]) => {
    const [[x0, y0], [x1, y1]] = points;
    return Array.from({ length: 201 }, (_, i) => [x0 + ((x1 - x0) * i) / 200, y0 + ((y1 - y0) * i) / 200] as [number, number]).filter(([x, y]) => Math.abs(x) <= range && Math.abs(y) <= range);
  };
  const series = conicSeries(conic, range).map(item => ({ ...item, points: item.points.filter(([x, y]) => Math.abs(x) <= range * 1.02 && Math.abs(y) <= range * 1.02) }));
  const info = conicInfo(conic);
  if (conic.kind === "parabola") {
    const d = conic.axis === "x" ? conic.m - conic.p : conic.n - conic.p;
    series.push({ points: conic.axis === "x" ? [[d, -range], [d, range]] : [[-range, d], [range, d]], color: "#16a34a", dash: true, width: 1.3 });
  }
  if (options.tangent) {
    const line = options.tangent;
    series.push({ points: clip("vertical" in line ? [[line.vertical, -range], [line.vertical, range]] : [[-range, line.slope * -range + line.intercept], [range, line.slope * range + line.intercept]]), color: "#dc2626", width: 1.8 });
  }
  return plotSvg({
    xLabel: "x", yLabel: "y", xMin: -range, xMax: range, yMin: -range, yMax: range, width: 360, height: 360, title: options.title,
    series: series.filter(item => item.points.length > 1),
    dots: [...info.foci.map(([x, y]) => ({ at: [x, y] as [number, number], label: "F", color: "#d97706", r: 3.5 })), ...(options.point ? [{ at: options.point, label: "P", color: "#dc2626", r: 3.5 }] : [])],
    extra: (sx, sy) => conic.kind === "parabola" ? svgText(sx(conic.axis === "x" ? conic.m - conic.p : range * 0.55) + 4, sy(conic.axis === "x" ? range * 0.85 : conic.n - conic.p) - 4, "준선", { size: 10.5, color: "#16a34a" }) : "",
  });
}

/* ───── 접선 ───── */
export type Line = { slope: Q; intercept: Q } | { vertical: Q };
export const lineTex = (line: Line) => "vertical" in line ? `x=${qTex(line.vertical)}` : `y=${line.slope.n === 0 ? "" : line.slope.n === line.slope.d ? "x" : line.slope.n === -line.slope.d ? "-x" : `${qTex(line.slope)}x`}${line.intercept.n === 0 ? (line.slope.n === 0 ? "0" : "") : `${line.intercept.n > 0 && line.slope.n !== 0 ? "+" : ""}${qTex(line.intercept)}`}`;
export const lineNumbers = (line: Line) => "vertical" in line ? { vertical: line.vertical.n / line.vertical.d } : { slope: line.slope.n / line.slope.d, intercept: line.intercept.n / line.intercept.d };

/** 원점이 중심(꼭짓점)인 곡선 위의 점 (x₁, y₁)에서의 접선 */
export function tangentAt(conic: Conic, x1: number, y1: number): Line {
  if (conic.kind === "parabola") {
    const p = q(conic.p * 4, 4);
    // y² = 4px: y₁y = 2p(x + x₁),  x² = 4py: x₁x = 2p(y + y₁)
    if (conic.axis === "x") return y1 === 0 ? { vertical: q(x1) } : { slope: qDiv(qMul(q(2), p), q(y1)), intercept: qDiv(qMul(qMul(q(2), p), q(x1)), q(y1)) };
    const twoP = qMul(q(2), p);
    return { slope: qDiv(q(x1), twoP), intercept: qNeg(q(y1)) };
  }
  const { A, B } = conic;
  const sign = conic.kind === "ellipse" ? 1 : -1;
  const rhs = conic.kind === "hyperbola" ? conic.sign : 1;
  // x₁x/A ± y₁y/B = rhs  →  y = −(±B x₁)/(A y₁)·x ± rhs·B/y₁
  if (y1 === 0) return { vertical: q(rhs * A, x1) };
  return { slope: q(-sign * B * x1, A * y1), intercept: q(sign * rhs * B, y1) };
}
/** 기울기가 m인 접선 두 개의 y절편(원점 중심). 없으면 null */
export function tangentsWithSlope(conic: Conic, slope: number): { interceptSquared: number; intercepts: number[] } | null {
  if (conic.kind === "parabola") return conic.axis === "x" && slope !== 0 ? { interceptSquared: NaN, intercepts: [conic.p / slope] } : conic.axis === "y" ? { interceptSquared: NaN, intercepts: [-conic.p * slope * slope] } : null;
  const value = conic.kind === "ellipse" ? conic.A * slope * slope + conic.B : conic.sign === 1 ? conic.A * slope * slope - conic.B : conic.B - conic.A * slope * slope;
  if (value <= 0) return null;
  return { interceptSquared: value, intercepts: [Math.sqrt(value), -Math.sqrt(value)] };
}

/* ───── 문제 ───── */
export type ConicAsk = "parabola" | "ellipse" | "hyperbola" | "shift" | "tangentPoint" | "tangentSlope";
export const conicAsks: Record<ConicAsk, string> = {
  parabola: "포물선의 초점·준선", ellipse: "타원의 초점·축", hyperbola: "쌍곡선의 초점·점근선", shift: "평행이동한 이차곡선", tangentPoint: "곡선 위의 점에서의 접선", tangentSlope: "기울기가 주어진 접선",
};
/** 초점이 정수가 되는 [a, b, c] */
const ELLIPSES: [number, number, number][] = [[5, 3, 4], [5, 4, 3], [13, 5, 12], [10, 6, 8], [10, 8, 6], [17, 8, 15]];
const HYPERBOLAS: [number, number, number][] = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [8, 15, 17]];
/** 정수점을 지나는 곡선 [A, B, x₁, y₁] */
const ELLIPSE_POINTS: [number, number, number, number][] = [[8, 2, 2, 1], [12, 4, 3, 1], [6, 3, 2, 1], [20, 5, 4, 1], [18, 9, 4, 1]];
const HYPERBOLA_POINTS: [number, number, number, number][] = [[2, 1, 2, 1], [4, 3, 4, 3], [8, 4, 4, 2], [12, 3, 4, 1]];
const PARABOLA_POINTS: [number, number, number][] = [[2, 2, 4], [1, 1, 2], [1, 4, 4], [3, 3, 6], [4, 1, 4]]; // [p, x₁, y₁]: y² = 4px
/** 기울기 접선이 깔끔한 [A, B, m] */
const ELLIPSE_SLOPES: [number, number, number][] = [[4, 5, 1], [8, 1, 1], [3, 1, 1], [5, 4, 1], [2, 1, 2], [4, 9, 2]];
const HYPERBOLA_SLOPES: [number, number, number][] = [[4, 3, 1], [5, 1, 1], [2, 1, 1], [8, 4, 1], [4, 7, 2]];

export function conicProblems(asks: ConicAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick } = picker(seed * 37 + 3);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, options: Partial<SheetProblem> = {}) => problems.push(mathProblem(html, answer, { space: 16, ...options }));
  eachAsk(asks, perAsk, (ask, index) => {
    if (ask === "parabola") {
      const p = pick([-3, -2, -1, 1, 2, 3, 4]);
      const conic: Conic = { kind: "parabola", axis: index % 2 ? "y" : "x", p, m: 0, n: 0 };
      add(`포물선 ${tex(conicTex(conic))}의 초점의 좌표와 준선의 방정식을 구하시오.`,
        `초점 ${tex(conic.axis === "x" ? `(${p},\\ 0)` : `(0,\\ ${p})`)}, 준선 ${tex(conic.axis === "x" ? `x=${-p}` : `y=${-p}`)} (${tex(`4p=${4 * p}`)}에서 ${tex(`p=${p}`)})`, { answerFigure: conicSvg(conic) });
    } else if (ask === "ellipse") {
      const [a, b, c] = pick(ELLIPSES);
      const vertical = index % 2 === 1;
      const conic: Conic = { kind: "ellipse", A: vertical ? b * b : a * a, B: vertical ? a * a : b * b, m: 0, n: 0 };
      add(`타원 ${tex(conicTex(conic))}의 두 초점의 좌표와 장축의 길이, 단축의 길이를 구하시오.`,
        `초점 ${tex(vertical ? `(0,\\ ${c}),\\ (0,\\ -${c})` : `(${c},\\ 0),\\ (-${c},\\ 0)`)}, 장축 ${2 * a}, 단축 ${2 * b} (${tex(`c^{2}=${a * a}-${b * b}=${c * c}`)})`, { answerFigure: conicSvg(conic) });
    } else if (ask === "hyperbola") {
      const [a, b, c] = pick(HYPERBOLAS);
      const sign: 1 | -1 = index % 2 ? -1 : 1;
      const conic: Conic = { kind: "hyperbola", A: a * a, B: b * b, sign, m: 0, n: 0 };
      const slope = qTex(q(b, a));
      add(`쌍곡선 ${tex(conicTex(conic))}의 두 초점의 좌표와 점근선의 방정식, 주축의 길이를 구하시오.`,
        `초점 ${tex(sign === 1 ? `(${c},\\ 0),\\ (-${c},\\ 0)` : `(0,\\ ${c}),\\ (0,\\ -${c})`)}, 점근선 ${tex(`y=\\pm ${slope}x`)}, 주축의 길이 ${2 * (sign === 1 ? a : b)} (${tex(`c^{2}=${a * a}+${b * b}=${c * c}`)})`, { answerFigure: conicSvg(conic) });
    } else if (ask === "shift") {
      const m = pick([-3, -2, -1, 1, 2, 3]);
      const n = pick([-2, -1, 1, 2, 3]);
      if (index % 2 === 0) {
        const p = pick([1, 2, 3]);
        const conic: Conic = { kind: "parabola", axis: "x", p, m, n };
        add(`포물선 ${tex(conicTex(conic))}의 꼭짓점과 초점의 좌표, 준선의 방정식을 구하시오.`,
          `꼭짓점 ${tex(`(${m},\\ ${n})`)}, 초점 ${tex(`(${m + p},\\ ${n})`)}, 준선 ${tex(`x=${m - p}`)} (포물선 ${tex(`y^{2}=${4 * p}x`)}를 x축의 방향으로 ${signedText(m)}만큼, y축의 방향으로 ${signedText(n)}만큼 평행이동)`, { answerFigure: conicSvg(conic) });
      } else {
        const [a, b, c] = pick(ELLIPSES.slice(0, 3));
        const conic: Conic = { kind: "ellipse", A: a * a, B: b * b, m, n };
        add(`타원 ${tex(conicTex(conic))}의 중심과 두 초점의 좌표를 구하시오.`,
          `중심 ${tex(`(${m},\\ ${n})`)}, 초점 ${tex(`(${m + c},\\ ${n}),\\ (${m - c},\\ ${n})`)}`, { answerFigure: conicSvg(conic) });
      }
    } else if (ask === "tangentPoint") {
      const kind = index % 3;
      if (kind === 0) {
        const [p, x1, y1] = pick(PARABOLA_POINTS);
        const conic: Conic = { kind: "parabola", axis: "x", p, m: 0, n: 0 };
        const line = tangentAt(conic, x1, y1);
        add(`포물선 ${tex(conicTex(conic))} 위의 점 ${tex(`(${x1},\\ ${y1})`)}에서의 접선의 방정식을 구하시오.`,
          `${tex(lineTex(line))} (${tex(`y_{1}y=2p(x+x_{1})`)}에서 ${tex(`${y1}y=${2 * p}(x+${x1})`)})`, { answerFigure: conicSvg(conic, { tangent: lineNumbers(line), point: [x1, y1] }) });
      } else if (kind === 1) {
        const [A, B, x1, y1] = pick(ELLIPSE_POINTS);
        const conic: Conic = { kind: "ellipse", A, B, m: 0, n: 0 };
        const line = tangentAt(conic, x1, y1);
        add(`타원 ${tex(conicTex(conic))} 위의 점 ${tex(`(${x1},\\ ${y1})`)}에서의 접선의 방정식을 구하시오.`,
          `${tex(lineTex(line))} (${tex(`\\frac{${x1}x}{${A}}+\\frac{${y1}y}{${B}}=1`)})`, { answerFigure: conicSvg(conic, { tangent: lineNumbers(line), point: [x1, y1] }) });
      } else {
        const [A, B, x1, y1] = pick(HYPERBOLA_POINTS);
        const conic: Conic = { kind: "hyperbola", A, B, sign: 1, m: 0, n: 0 };
        const line = tangentAt(conic, x1, y1);
        add(`쌍곡선 ${tex(conicTex(conic))} 위의 점 ${tex(`(${x1},\\ ${y1})`)}에서의 접선의 방정식을 구하시오.`,
          `${tex(lineTex(line))} (${tex(`\\frac{${x1}x}{${A}}-\\frac{${y1}y}{${B}}=1`)})`, { answerFigure: conicSvg(conic, { tangent: lineNumbers(line), point: [x1, y1] }) });
      }
    } else {
      const kind = index % 3;
      if (kind === 0) {
        const p = pick([1, 2, 3]);
        const m = pick([1, 2, -1]);
        const conic: Conic = { kind: "parabola", axis: "x", p, m: 0, n: 0 };
        const intercept = q(p, m);
        add(`포물선 ${tex(conicTex(conic))}에 접하고 기울기가 ${m}인 직선의 방정식을 구하시오.`,
          `${tex(lineTex({ slope: q(m), intercept }))} (${tex("y=mx+\\frac{p}{m}")}, ${tex(`p=${p}`)})`);
      } else if (kind === 1) {
        const [A, B, m] = pick(ELLIPSE_SLOPES);
        const root = Math.sqrt(A * m * m + B);
        add(`타원 ${tex(conicTex({ kind: "ellipse", A, B, m: 0, n: 0 }))}에 접하고 기울기가 ${m}인 직선의 방정식을 구하시오.`,
          `${tex(`y=${m === 1 ? "" : m}x\\pm ${num(root, 3)}`)} (${tex(`y=mx\\pm\\sqrt{a^{2}m^{2}+b^{2}}=${m === 1 ? "" : m}x\\pm\\sqrt{${A}\\times${m * m}+${B}}`)})`);
      } else {
        const [A, B, m] = pick(HYPERBOLA_SLOPES);
        const root = Math.sqrt(A * m * m - B);
        add(`쌍곡선 ${tex(conicTex({ kind: "hyperbola", A, B, sign: 1, m: 0, n: 0 }))}에 접하고 기울기가 ${m}인 직선의 방정식을 구하시오.`,
          `${tex(`y=${m === 1 ? "" : m}x\\pm ${num(root, 3)}`)} (${tex(`y=mx\\pm\\sqrt{a^{2}m^{2}-b^{2}}=${m === 1 ? "" : m}x\\pm\\sqrt{${A}\\times${m * m}-${B}}`)})`);
      }
    }
  });
  return [{ heading: "이차곡선", problems }];
}

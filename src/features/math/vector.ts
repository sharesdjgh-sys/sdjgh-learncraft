/* 기하 Ⅲ. 벡터: 평면벡터의 덧셈·뺄셈·실수배 그림, 성분과 크기, 내적과 이루는 각, 수직·평행 조건, 위치벡터와 내분점, 벡터로 나타낸 직선의 방정식입니다. */
import { arrowSvg, mathProblem, q, qTex, radicalTex, svgText, svgWrap, tex, type Q, type SheetProblem, type SheetSection } from "./core";
import { coefTerm, picker, ratioParticle } from "./pg-common";

export type V2 = [number, number];
export const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
export const scale = (k: number, a: V2): V2 => [k * a[0], k * a[1]];
export const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];
export const norm2 = (a: V2) => dot(a, a);
export const normTex = (a: V2) => radicalTex(1, norm2(a));
export const vecTex = (a: (number | Q)[]) => `(${a.map(v => (typeof v === "number" ? String(v) : qTex(v))).join(",\\ ")})`;
export const isPerpendicular = (a: V2, b: V2) => dot(a, b) === 0;
export const isParallel = (a: V2, b: V2) => a[0] * b[1] - a[1] * b[0] === 0;

/** cos θ = a·b / (|a||b|) 가 특수각이면 그 각(도), 아니면 null */
export function specialAngle(a: V2, b: V2): number | null {
  const d = dot(a, b);
  const product = norm2(a) * norm2(b);
  if (!product) return null;
  // cos²θ = d²/product 를 정확히 비교합니다(부호는 d로).
  const table: [number, number, number][] = [[1, 1, 0], [3, 4, 30], [1, 2, 45], [1, 4, 60], [0, 1, 90]];
  for (const [top, bottom, angle] of table) {
    if (d * d * bottom === top * product) {
      if (angle === 90) return 90;
      return d > 0 ? angle : 180 - angle;
    }
  }
  return null;
}
export const cosText = (a: V2, b: V2) => `\\cos\\theta=\\frac{${dot(a, b)}}{${normTex(a)}\\times${normTex(b)}}`;

/** 선분 AB를 m : n으로 내분하는 점의 위치벡터 (m b + n a)/(m + n) */
export const divide = (a: V2, b: V2, m: number, n: number): [Q, Q] => [q(m * b[0] + n * a[0], m + n), q(m * b[1] + n * a[1], m + n)];

/** 점 A를 지나고 방향벡터가 u인 직선의 방정식(표준형) TeX */
export function directionLineTex(point: V2, u: V2) {
  const part = (v: string, p: number) => (p === 0 ? v : `${v}${p > 0 ? "-" : "+"}${Math.abs(p)}`);
  if (u[0] === 0) return `x=${point[0]}`;
  if (u[1] === 0) return `y=${point[1]}`;
  const side = (v: string, p: number, k: number) => (k === 1 ? part(v, p) : `\\frac{${part(v, p)}}{${k}}`);
  return `${side("x", point[0], u[0])}=${side("y", point[1], u[1])}`;
}
/** 점 A를 지나고 법선벡터가 n인 직선 n₁x + n₂y + c = 0 */
export function normalLineTex(point: V2, n: V2) {
  const c = -dot(n, point);
  const term = (coef: number, v: string, first: boolean) => (coef === 0 ? "" : `${coef < 0 ? "-" : first ? "" : "+"}${Math.abs(coef) === 1 ? "" : Math.abs(coef)}${v}`);
  const head = `${term(n[0], "x", true)}${term(n[1], "y", n[0] === 0)}`;
  return `${head}${c === 0 ? "" : c > 0 ? `+${c}` : c}=0`;
}

/* ───── 그림 ───── */
export type VectorFigure = "sum" | "difference" | "scalar";
/** 격자 위에 원점에서 그린 벡터 a, b와 a+b(평행사변형), a−b, ka를 그립니다. */
export function vectorSvg(a: V2, b: V2, figure: VectorFigure, k = 2) {
  const shown = figure === "scalar" ? [a, scale(k, a)] : figure === "sum" ? [a, b, add(a, b)] : [a, b, sub(a, b)];
  const extent = Math.max(3, ...shown.flatMap(v => v.map(Math.abs))) + 1;
  const size = 300;
  const unit = (size / 2 - 20) / extent;
  const cx = size / 2;
  const cy = size / 2;
  const to = ([x, y]: V2): V2 => [cx + x * unit, cy - y * unit];
  const parts: string[] = [];
  for (let i = -extent; i <= extent; i += 1) {
    parts.push(`<line x1="${to([i, -extent])[0]}" y1="${to([i, -extent])[1]}" x2="${to([i, extent])[0]}" y2="${to([i, extent])[1]}" stroke="#eef0f3"/>`, `<line x1="${to([-extent, i])[0]}" y1="${to([-extent, i])[1]}" x2="${to([extent, i])[0]}" y2="${to([extent, i])[1]}" stroke="#eef0f3"/>`);
  }
  parts.push(`<line x1="${to([-extent, 0])[0]}" y1="${cy}" x2="${to([extent, 0])[0]}" y2="${cy}" stroke="#999"/>`, `<line x1="${cx}" y1="${to([0, -extent])[1]}" x2="${cx}" y2="${to([0, extent])[1]}" stroke="#999"/>`, svgText(cx - 12, cy + 14, "O", { size: 11, italic: true }));
  const arrow = (from: V2, v: V2, color: string, label: string, dash = false, width = 2.2) => {
    const [x1, y1] = to(from);
    const [x2, y2] = to(add(from, v));
    return arrowSvg(x1, y1, x2, y2, color, width, dash) + svgText((x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6, label, { size: 12.5, weight: 700, color, italic: true });
  };
  if (figure === "sum") {
    parts.push(arrow(a, b, "#93c5fd", "", true, 1.4), arrow(b, a, "#fca5a5", "", true, 1.4));
    parts.push(arrow([0, 0], a, "#dc2626", "a"), arrow([0, 0], b, "#2563eb", "b"), arrow([0, 0], add(a, b), "#7c3aed", "a+b"));
  } else if (figure === "difference") {
    parts.push(arrow([0, 0], a, "#dc2626", "a"), arrow([0, 0], b, "#2563eb", "b"), arrow(b, sub(a, b), "#7c3aed", "a−b"), arrow([0, 0], sub(a, b), "#c4b5fd", "", true, 1.4));
  } else {
    parts.push(arrow([0, 0], scale(k, a), "#7c3aed", `${k}a`, false, 3.2), arrow([0, 0], a, "#dc2626", "a"));
  }
  return svgWrap(size, size, parts.join(""));
}

/* ───── 문제 ───── */
export type VectorAsk = "components" | "dot" | "angle" | "magnitude" | "perpendicular" | "division" | "line";
export const vectorAsks: Record<VectorAsk, string> = {
  components: "성분 연산과 크기", dot: "내적(성분)", angle: "두 벡터가 이루는 각", magnitude: "내적과 크기(|a+b|)", perpendicular: "수직·평행 조건", division: "위치벡터와 내분점", line: "직선의 방정식",
};
/** 이루는 각이 특수각인 성분 쌍 */
const ANGLE_PAIRS: [V2, V2][] = [[[1, 0], [1, 1]], [[1, 2], [3, 1]], [[1, 3], [2, 1]], [[1, 1], [1, -1]], [[1, 0], [-1, 1]], [[1, 2], [-3, -1]], [[2, 0], [1, 1]], [[3, 1], [-1, 3]], [[2, 1], [-1, -3]]];

export function vectorProblems(asks: VectorAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick, int } = picker(seed * 53 + 7);
  const problems: SheetProblem[] = [];
  const put = (html: string, answer: string, options: Partial<SheetProblem> = {}) => problems.push(mathProblem(html, answer, { space: 14, ...options }));
  const vec = (): V2 => { let v: V2 = [int(-4, 4), int(-4, 4)]; while (!v[0] && !v[1]) v = [int(-4, 4), int(-4, 4)]; return v; };
  const va = "\\vec{a}";
  const vb = "\\vec{b}";
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "components") {
      const a = vec();
      const b = vec();
      const [m, n] = [pick([2, 3, -1]), pick([1, 2, -2])];
      const result = add(scale(m, a), scale(n, b));
      put(`두 벡터 ${tex(`${va}=${vecTex(a)},\\ ${vb}=${vecTex(b)}`)}에 대하여 벡터 ${tex(`${m === 1 ? "" : m === -1 ? "-" : m}${va}${n < 0 ? `${n === -1 ? "-" : n}` : `+${n === 1 ? "" : n}`}${vb}`)}의 성분과 크기를 구하시오.`,
        `성분 ${tex(vecTex(result))}, 크기 ${tex(normTex(result))}`, { answerFigure: vectorSvg(a, b, "sum") });
    } else if (ask === "dot") {
      const a = vec();
      const b = vec();
      put(`두 벡터 ${tex(`${va}=${vecTex(a)},\\ ${vb}=${vecTex(b)}`)}의 내적 ${tex(`${va}\\cdot${vb}`)}를 구하시오.`,
        `${tex(`${a[0]}\\times${b[0] < 0 ? `(${b[0]})` : b[0]}+${a[1]}\\times${b[1] < 0 ? `(${b[1]})` : b[1]}=${dot(a, b)}`)}`);
    } else if (ask === "angle") {
      const [a, b] = pick(ANGLE_PAIRS);
      put(`두 벡터 ${tex(`${va}=${vecTex(a)},\\ ${vb}=${vecTex(b)}`)}가 이루는 각의 크기 ${tex("\\theta")}를 구하시오. ${tex("(0°\\le\\theta\\le 180°)")}`,
        `${tex(`${cosText(a, b)}`)}이므로 ${tex(`\\theta=${specialAngle(a, b)}°`)}`);
    } else if (ask === "magnitude") {
      const [x, y] = [int(1, 4), int(1, 4)];
      const angle = pick([60, 90, 120] as const);
      const d = angle === 60 ? q(x * y, 2) : angle === 90 ? q(0) : q(-x * y, 2);
      const sum2 = q(2 * (x * x + y * y) + 4 * (d.n / d.d) * 1, 2);
      put(`두 벡터 ${tex(`${va},\\ ${vb}`)}에 대하여 ${tex(`|${va}|=${x},\\ |${vb}|=${y}`)}이고 두 벡터가 이루는 각의 크기가 ${angle}°일 때, ${tex(`${va}\\cdot${vb}`)}와 ${tex(`|${va}+${vb}|`)}를 구하시오.`,
        `${tex(`${va}\\cdot${vb}=${x}\\times${y}\\times\\cos ${angle}°=${qTex(d)}`)}, ${tex(`|${va}+${vb}|^{2}=${x}^{2}+2\\times${qTex(d).startsWith("-") ? `\\left(${qTex(d)}\\right)` : qTex(d)}+${y}^{2}=${qTex(sum2)}`)}이므로 ${tex(`|${va}+${vb}|=${radicalTex(1, sum2.n / sum2.d)}`)}`);
    } else if (ask === "perpendicular") {
      const a = vec();
      const k = int(-4, 4) || 1;
      if (index % 2 === 0) {
        // (a₁, a₂) ⊥ (t, k) → a₁t + a₂k = 0 이 되는 정수 t가 나오도록 a₁ = ±1, ±2 중에서 고릅니다.
        const first = pick([1, -1, 2, -2]);
        const second = int(-4, 4) || 3;
        const t = q(-second * k, first);
        put(`두 벡터 ${tex(`${va}=${vecTex([first, second])},\\ ${vb}=(t,\\ ${k})`)}가 서로 수직일 때, 실수 ${tex("t")}의 값을 구하시오.`,
          `${tex(`t=${qTex(t)}`)} (${tex(`${va}\\cdot${vb}=${coefTerm(first, "t")}${second * k >= 0 ? "+" : ""}${second * k}=0`)})`);
      } else {
        const m = pick([2, 3, -2]);
        if (!a[0]) a[0] = 1;
        const b: V2 = [a[0] * m, a[1] * m];
        put(`두 벡터 ${tex(`${va}=${vecTex(a)},\\ ${vb}=(${b[0]},\\ t)`)}가 서로 평행할 때, 실수 ${tex("t")}의 값을 구하시오.`,
          `${tex(`t=${b[1]}`)} (${tex(`${vb}=${m}${va}`)})`);
      }
    } else if (ask === "division") {
      const a = vec();
      const b = vec();
      const [m, n] = pick<[number, number]>([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [1, 1]]);
      put(`두 점 ${tex(`A${vecTex(a)},\\ B${vecTex(b)}`)}에 대하여 선분 AB를 ${tex(`${m}:${n}`)}${ratioParticle(n)} 내분하는 점 P의 위치벡터 ${tex("\\vec{p}")}의 성분을 구하시오.`,
        `${tex(`\\vec{p}=\\frac{${coefTerm(m, "\\vec{b}")}+${coefTerm(n, "\\vec{a}")}}{${m + n}}=${vecTex(divide(a, b, m, n))}`)}`);
    } else {
      const point = vec();
      const u: V2 = [pick([1, 2, 3, -1]), pick([1, 2, -2, 3])];
      if (index % 2 === 0) put(`점 ${tex(`A${vecTex(point)}`)}를 지나고 벡터 ${tex(`\\vec{u}=${vecTex(u)}`)}에 평행한 직선의 방정식을 구하시오.`, tex(directionLineTex(point, u)));
      else put(`점 ${tex(`A${vecTex(point)}`)}를 지나고 벡터 ${tex(`\\vec{n}=${vecTex(u)}`)}에 수직인 직선의 방정식을 구하시오.`, `${tex(normalLineTex(point, u))} (${tex(`${u[0]}(x-${point[0] < 0 ? `(${point[0]})` : point[0]})+${u[1]}(y-${point[1] < 0 ? `(${point[1]})` : point[1]})=0`)})`);
    }
  }
  return [{ heading: "벡터", problems }];
}

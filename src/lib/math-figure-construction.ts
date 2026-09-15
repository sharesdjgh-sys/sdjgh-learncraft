import { compileMathExpression } from "./math-expression";
import { constructionSchema, type FigureConstruction } from "./math-figure-construction-schema";
import { mathFigureSpecSchema, type MathFigureShape, type MathFigureSpec } from "./math-figure-lab";

const paint = { color: "#1f2937", dashed: false };
type P = number[];
const line = (from: P, to: P, dashed = false): MathFigureShape => ({ type: "line", ...paint, from, to, dashed, arrow: false });
const label = (at: P, text: string): MathFigureShape => ({ type: "text", ...paint, at, text, fontSize: 18, autoPosition: false });
const dimension = (from: P, to: P, text: string): MathFigureShape => ({ type: "dimension", ...paint, dashed: true, from, to, text, offset: -0.5, fontSize: 20 });
const pretty = (value: number) => String(Number(value.toPrecision(6)));

/** Fixed oblique projection; all inputs are world lengths, not screen lengths. */
export function projectSpatial([x, y, z]: P): P { return [x - 0.55 * y, z + 0.32 * y]; }
export function normalDensity(x: number, mean: number, sigma: number) { return Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI)); }
export function binomialProbability(n: number, p: number, k: number) {
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  let combination = 1;
  for (let i = 1; i <= k; i++) combination *= (n - i + 1) / i;
  return combination * p ** k * (1 - p) ** (n - k);
}

function axes(xRange: P, yRange: P): MathFigureShape[] {
  const shapes: MathFigureShape[] = [];
  if (yRange[0] <= 0 && yRange[1] >= 0) shapes.push({ ...line([xRange[0], 0], [xRange[1], 0]), arrow: true } as MathFigureShape);
  if (xRange[0] <= 0 && xRange[1] >= 0) shapes.push({ ...line([0, yRange[0]], [0, yRange[1]]), arrow: true } as MathFigureShape);
  const niceStep = (span: number) => { const raw = span / 6, power = 10 ** Math.floor(Math.log10(raw)), ratio = raw / power; return (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power; };
  const step = niceStep(xRange[1] - xRange[0]), tick = (yRange[1] - yRange[0]) * 0.012;
  if (yRange[0] <= 0 && yRange[1] >= 0) for (let i = Math.ceil(xRange[0]/step); i <= Math.floor(xRange[1]/step); i++) {
    const x = step * i;
    if (x <= xRange[0] || x >= xRange[1]) continue;
    shapes.push(line([x, -tick], [x, tick]), label([x, -tick * 4], pretty(x)));
  }
  const yStep = niceStep(yRange[1] - yRange[0]);
  if (xRange[0] <= 0 && xRange[1] >= 0) for (let i = Math.ceil(yRange[0]/yStep); i <= Math.floor(yRange[1]/yStep); i++) {
    const y = yStep * i, dx = (xRange[1] - xRange[0]) * 0.012;
    if (y === 0 || y <= yRange[0] || y >= yRange[1]) continue;
    shapes.push(line([-dx,y],[dx,y]),label([-dx*4.5,y],pretty(y)));
  }
  return shapes;
}

/** Bounded line approximation for the existing selectable/exportable SVG editor. */
export function sampleFunction(expression: string, xRange: P, yRange: P, count = 88): MathFigureShape[] {
  const fn = compileMathExpression(expression), result: MathFigureShape[] = [];
  const height = yRange[1] - yRange[0];
  for (let i = 0; i < count; i++) {
    const a = xRange[0] + (xRange[1] - xRange[0]) * i / count;
    const b = xRange[0] + (xRange[1] - xRange[0]) * (i + 1) / count;
    const ya = fn(a), yb = fn(b), ym = fn((a + b) / 2);
    if (![ya, yb, ym].every(Number.isFinite)) continue;
    // Never join across an asymptote or a detected jump. Clipped intervals are omitted.
    if ([ya, yb, ym].some(y => y < yRange[0] || y > yRange[1]) || Math.abs(ym - (ya + yb) / 2) > height / 16 || Math.abs(yb - ya) > height / 2) continue;
    result.push(line([a, ya], [b, yb]));
  }
  if (!result.length) throw new Error("표시 범위에 그릴 수 있는 함수 구간이 없습니다. 식과 범위를 확인해 주세요.");
  return result;
}

export function buildFigureConstruction(input: FigureConstruction): MathFigureSpec {
  const model = constructionSchema.parse(input);
  let shapes: MathFigureShape[] = [], title = "계산 도형", projection: "plane" | "spatial" = "plane";
  let xRange: P = [-5, 5], yRange: P = [-5, 5];
  const notes: string[] = [];
  if (model.kind === "function") {
    title = "함수 그래프"; xRange = model.xRange; yRange = model.yRange;
    shapes = axes(xRange, yRange);
    for (const [i, expression] of model.expressions.entries()) shapes.push(...sampleFunction(expression, xRange, yRange).map(s => ({ ...s, color: i ? "#64748b" : paint.color })));
    notes.push("함수식으로 계산한 표본점을 연결한 그래프입니다. 급격한 변화·불연속 부근은 생략될 수 있습니다. 삼각함수 입력 단위는 라디안입니다.");
  } else if (model.kind === "normal" || model.kind === "binomial") {
    if (model.kind === "normal") {
      if (model.lower >= model.upper) throw new Error("음영 구간의 상한은 하한보다 커야 합니다.");
      const { mean, sigma } = model;
      title = "정규분포와 확률 구간";
      xRange = [mean - 4 * sigma, mean + 4 * sigma];
      yRange = [-0.1 / sigma, 0.48 / sigma];
      const lo = Math.max(xRange[0], model.lower), hi = Math.min(xRange[1], model.upper);
      if (hi > lo) {
        const points = [[lo, 0], ...Array.from({ length: 36 }, (_, i) => { const x = lo + (hi - lo) * i / 35; return [x, normalDensity(x, mean, sigma)]; }), [hi, 0]];
        shapes.push({ type: "polygon", ...paint, points, fill: "#e2e8f0" });
      }
      shapes.push(...axes(xRange, yRange), ...sampleFunction(`exp(-0.5*((x-(${mean}))/${sigma})^2)/(${sigma}*sqrt(2*pi))`, xRange, yRange));
      notes.push("정규분포의 ±4σ 구간을 표시합니다. 음영은 화면 범위에서 잘리며 확률값 자체는 표시하지 않습니다.");
    } else {
      title = "이항분포"; xRange = [-1, model.n + 1];
      const probabilities = Array.from({ length: model.n + 1 }, (_, k) => binomialProbability(model.n, model.p, k));
      const maximum = Math.max(...probabilities);
      yRange = [-maximum * 0.15, maximum * 1.2]; shapes = axes(xRange, yRange);
      for (const [k, p] of probabilities.entries()) if (p > 0) shapes.push({ type: "polygon", ...paint, points: [[k - 0.35, 0], [k + 0.35, 0], [k + 0.35, p], [k - 0.35, p]], fill: "#e2e8f0" });
    }
  } else {
    projection = "spatial";
    if (model.kind === "cuboid") {
      title = "직육면체";
      const { width: w, depth: d, height: h } = model;
      const points = [[0,0,0],[w,0,0],[w,d,0],[0,d,0],[0,0,h],[w,0,h],[w,d,h],[0,d,h]].map(projectSpatial);
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      shapes = edges.map(([a,b],i) => line(points[a], points[b], [1,2,10].includes(i)));
      shapes.push(dimension(points[0], points[1], pretty(w)), dimension(points[1], points[2], pretty(d)), dimension(points[1], points[5], pretty(h)));
      xRange = [-d * .55 - 1, w + 1]; yRange = [-1, h + d * .32 + 1];
    } else if (model.kind === "sphereSection") {
      title = "구와 평행 절단면";
      const { radius: r, offset: h } = model;
      if (Math.abs(h) >= r) throw new Error("절단면 높이의 절댓값은 구의 반지름보다 작아야 합니다.");
      const section = Math.sqrt(r * r - h * h), depth = 0.32, z = Math.sqrt(1 - depth * depth);
      shapes = [{ type: "circle", ...paint, center: [0,0], radius: r, fill: "none" },
        { type: "ellipse", ...paint, dashed: true, center: [0,h*z], radiusX: section, radiusY: section*depth, rotation: 0, fill: "none" },
        line([0,0],[0,h*z],true), label([0.4,h*z/2], pretty(h)), label([0,-r-0.4], `R=${pretty(r)}`)];
      xRange = [-r-1,r+1]; yRange = [-r-1,r+1];
      notes.push("구의 수평 절단면: 단면 반지름은 √(R²−h²)로 계산합니다. 내부 단면 전체를 점선으로 표시합니다.");
    } else {
      const { radius: r, height: h } = model;
      title = model.kind === "cone" ? "원뿔" : "원기둥";
      const ellipse = (y: number): MathFigureShape => ({ type: "ellipse", ...paint, center: [0,y], radiusX: r, radiusY: r*0.32, rotation: 0, fill: "none" });
      shapes = [
        { type: "ellipticArc", ...paint, dashed: true, center: [0,0], radiusX: r, radiusY: r*0.32, rotation: 0, startAngle: 0, endAngle: 180 },
        { type: "ellipticArc", ...paint, center: [0,0], radiusX: r, radiusY: r*0.32, rotation: 0, startAngle: 180, endAngle: 360 },
      ];
      if (model.kind === "cone") {
        if (h <= r * 0.34) throw new Error("이 시점에서 원뿔 윤곽을 표시하려면 높이를 반지름의 0.34배보다 크게 해 주세요.");
        // Tangents from apex to the projected base ellipse, not arbitrary diameter endpoints.
        const y = (r * 0.32) ** 2 / h, x = r * Math.sqrt(1 - (y / (r*0.32)) ** 2);
        shapes.push(line([-x,y],[0,h]),line([x,y],[0,h]));
      } else shapes.push(ellipse(h), line([-r,0],[-r,h]),line([r,0],[r,h]));
      shapes.push(line([0,0],[0,h],true), label([0.35,h/2],pretty(h)), dimension([0,0],[r,0],pretty(r)));
      xRange = [-r-1,r+1]; yRange = [-r*0.32-1,h+r*0.32+1];
    }
    notes.push("고정 시점의 계산 도형입니다. 매개변수로 다시 계산하면 개별 선·라벨의 수동 변경은 초기화됩니다.");
  }
  return mathFigureSpecSchema.parse({ title, description: title, projection, xRange, yRange, shapes, notes, construction: model });
}

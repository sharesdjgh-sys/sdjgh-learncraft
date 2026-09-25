"use client";

import { useId } from "react";
import {
  activate, activationInfo, activationKinds, confusionMetrics, flattenTree, formatNumber, isSymbol, kMeans, layoutTree, linearRegression, nearestNeighbors, niceTicks,
  parseOutline, parsePoints, parseQuery, perceptronResult, pointClasses, splitNames, subscript, textWidth, unlabeled, visitOrder, wrapText,
  type ActivationKind, type ActivationSettings, type AiFigureDoc, type ConfusionSettings, type NetworkSettings, type PerceptronSettings, type ScatterSettings, type TreeSettings,
} from "@/lib/ai-figure/model";

/* AI 수업 그림을 설정값에서 SVG로 그립니다. 화면 미리 보기와 PNG·SVG 저장이 같은 그림을 씁니다. */

const sans = "Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
const serif = "'Times New Roman', Times, serif";

type Palette = ReturnType<typeof palette>;
function palette(mono: boolean) {
  return {
    mono,
    ink: "#212529",
    sub: "#495057",
    faint: "#868e96",
    edge: mono ? "#495057" : "#adb5bd",
    grid: "#e9ecef",
    input: mono ? { fill: "#ffffff", stroke: "#212529" } : { fill: "#e7f5ff", stroke: "#1c7ed6" },
    hidden: mono ? { fill: "#f1f3f5", stroke: "#212529" } : { fill: "#f3f0ff", stroke: "#7048e8" },
    output: mono ? { fill: "#ffffff", stroke: "#212529" } : { fill: "#fff4e6", stroke: "#e8590c" },
    leaf: mono ? { fill: "#f1f3f5", stroke: "#212529" } : { fill: "#ebfbee", stroke: "#2f9e44" },
    goal: mono ? { fill: "#dee2e6", stroke: "#212529" } : { fill: "#fff4e6", stroke: "#e8590c" },
    plain: { fill: "#ffffff", stroke: mono ? "#212529" : "#495057" },
    visited: mono ? { fill: "#e9ecef", stroke: "#212529" } : { fill: "#e7f5ff", stroke: "#1c7ed6" },
    accent: mono ? "#212529" : "#e8590c",
    badge: mono ? "#212529" : "#7048e8",
    good: mono ? "#dee2e6" : "#d3f9d8",
    bad: mono ? "#ffffff" : "#ffe3e3",
    classes: mono ? ["#212529", "#212529", "#212529", "#212529", "#212529"] : ["#1c7ed6", "#f08c00", "#2f9e44", "#ae3ec9", "#e03131"],
    classFill: mono ? ["#212529", "#ffffff", "#868e96", "#ffffff", "#212529"] : ["#1c7ed6", "#f08c00", "#2f9e44", "#ae3ec9", "#e03131"],
    curves: mono ? ["#212529", "#212529", "#212529", "#212529", "#212529"] : ["#1c7ed6", "#e8590c", "#2f9e44", "#ae3ec9", "#e03131"],
    dashes: mono ? [undefined, "8 4", "2 3", "8 3 2 3", "12 4"] : [undefined, undefined, undefined, undefined, undefined],
  };
}

type Ctx = { s: number; c: Palette; arrow: string; arrowInk: string; clip: string };
type Drawn = { width: number; height: number; node: React.ReactNode };

/** 글자 한 줄. x₁·w·b처럼 기호로 읽을 이름은 기울인 세리프체로 씁니다. */
function Txt({ x, y, text, size, anchor = "middle", weight = 600, fill = "#212529", math, rotate }: {
  x: number; y: number; text: string; size: number; anchor?: "start" | "middle" | "end"; weight?: number; fill?: string; math?: boolean; rotate?: number;
}) {
  const symbol = math ?? isSymbol(text);
  return <text x={x} y={y} dy="0.35em" textAnchor={anchor} fontSize={size} fontWeight={symbol ? 500 : weight} fill={fill}
    fontFamily={symbol ? serif : sans} fontStyle={symbol && isSymbol(text) ? "italic" : undefined} transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}>{text}</text>;
}

/** 글자 뒤에 흰 바탕을 깔아 선 위에서도 읽히게 합니다. */
function Tag({ x, y, text, size, fill, math }: { x: number; y: number; text: string; size: number; fill?: string; math?: boolean }) {
  const w = textWidth(text, size) + size * 0.5;
  return <g>
    <rect x={x - w / 2} y={y - size * 0.62} width={w} height={size * 1.24} rx={size * 0.25} fill="#ffffff" />
    <Txt x={x} y={y} text={text} size={size} fill={fill} math={math} />
  </g>;
}

function Line({ from, to, stroke, width = 1.4, dash, marker }: { from: [number, number]; to: [number, number]; stroke: string; width?: number; dash?: string; marker?: string }) {
  return <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={stroke} strokeWidth={width} strokeDasharray={dash} markerEnd={marker ? `url(#${marker})` : undefined} strokeLinecap="round" />;
}

/** 두 원의 가장자리끼리 잇는 선의 양 끝을 구합니다. */
function between(a: [number, number], b: [number, number], ra: number, rb: number): [[number, number], [number, number]] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return [[a[0] + ux * ra, a[1] + uy * ra], [b[0] - ux * rb, b[1] - uy * rb]];
}

const markerShapes = ["circle", "square", "triangle", "diamond", "cross"] as const;
function PointMark({ x, y, size, index, c, stroke }: { x: number; y: number; size: number; index: number; c: Palette; stroke?: string }) {
  const shape = markerShapes[index % markerShapes.length];
  const fill = c.classFill[index % c.classFill.length];
  const line = stroke ?? (c.mono ? c.ink : "#ffffff");
  const r = size;
  if (shape === "circle") return <circle cx={x} cy={y} r={r} fill={fill} stroke={line} strokeWidth={1.2} />;
  if (shape === "square") return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} fill={fill} stroke={c.mono ? c.ink : line} strokeWidth={1.2} />;
  if (shape === "triangle") return <path d={`M${x} ${y - r * 1.15} L${x + r * 1.05} ${y + r * 0.75} L${x - r * 1.05} ${y + r * 0.75} Z`} fill={fill} stroke={c.mono ? c.ink : line} strokeWidth={1.2} strokeLinejoin="round" />;
  if (shape === "diamond") return <path d={`M${x} ${y - r * 1.2} L${x + r * 1.2} ${y} L${x} ${y + r * 1.2} L${x - r * 1.2} ${y} Z`} fill={fill} stroke={c.mono ? c.ink : line} strokeWidth={1.2} strokeLinejoin="round" />;
  return <path d={`M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}`} stroke={c.classes[index % c.classes.length]} strokeWidth={2.4} strokeLinecap="round" />;
}

/* ───── 신경망 구조 ───── */

function drawNetwork(n: NetworkSettings, { s, c, arrow }: Ctx): Drawn {
  const layers = n.layers;
  const last = layers.length - 1;
  const r = s * 1.2;
  const gapY = r * 2 + s * 1.1;
  const gapX = s * 8.5;
  const inputs = splitNames(n.inputNames).slice(0, layers[0]);
  const outputs = splitNames(n.outputNames).slice(0, layers[last]);
  const nameSize = s * 0.9;
  const leftW = inputs.length ? Math.max(...inputs.map((name) => textWidth(name, nameSize))) + s * 0.7 : 0;
  const rightW = outputs.length ? Math.max(...outputs.map((name) => textWidth(name, nameSize))) + s * 0.7 : 0;
  const maxNodes = Math.max(...layers);
  const columnH = (maxNodes - 1) * gapY;
  const titleH = n.layerTitles ? s * 2.4 : 0;
  const top = titleH + (n.bias ? gapY : 0) + r;
  const x = (layer: number) => leftW + r + layer * gapX;
  const y = (layer: number, index: number) => top + (columnH - (layers[layer] - 1) * gapY) / 2 + index * gapY;
  const biasY = top - gapY;
  const hiddenCount = layers.length - 2;
  const title = (layer: number) => layer === 0 ? "입력층" : layer === last ? "출력층" : hiddenCount === 1 ? "은닉층" : `은닉층 ${layer}`;
  const nodeName = (layer: number, index: number) => {
    if (layer === 0) return n.symbols ? `x${subscript(index + 1)}` : "";
    if (layer === last) return n.symbols ? (layers[last] === 1 ? "y" : `y${subscript(index + 1)}`) : "";
    return n.hiddenSymbols ? `h${subscript(index + 1)}` : "";
  };
  const style = (layer: number) => layer === 0 ? c.input : layer === last ? c.output : c.hidden;
  const marker = n.arrows ? arrow : undefined;

  const edges: React.ReactNode[] = [];
  for (let layer = 0; layer < last; layer += 1) {
    for (let i = 0; i < layers[layer]; i += 1) {
      for (let j = 0; j < layers[layer + 1]; j += 1) {
        const [from, to] = between([x(layer), y(layer, i)], [x(layer + 1), y(layer + 1, j)], r, r + (n.arrows ? 1 : 0));
        edges.push(<Line key={`e${layer}-${i}-${j}`} from={from} to={to} stroke={c.edge} width={1.2} marker={marker} />);
      }
    }
    if (n.bias) {
      for (let j = 0; j < layers[layer + 1]; j += 1) {
        const [from, to] = between([x(layer), biasY], [x(layer + 1), y(layer + 1, j)], r * 0.8, r + (n.arrows ? 1 : 0));
        edges.push(<Line key={`b${layer}-${j}`} from={from} to={to} stroke={c.edge} width={1} dash="4 3" marker={marker} />);
      }
    }
  }
  const node = <g>
    {edges}
    {n.layerTitles && layers.map((_, layer) => <Txt key={`t${layer}`} x={x(layer)} y={s * 0.8} text={title(layer)} size={s * 0.9} weight={700} fill={c.sub} />)}
    {n.bias && layers.slice(0, last).map((_, layer) => <g key={`bias${layer}`}>
      <circle cx={x(layer)} cy={biasY} r={r * 0.8} fill="#ffffff" stroke={c.faint} strokeDasharray="3 2" strokeWidth={1.3} />
      <Txt x={x(layer)} y={biasY} text="+1" size={s * 0.8} fill={c.sub} math={false} />
    </g>)}
    {layers.map((count, layer) => Array.from({ length: count }, (_, index) => {
      const cx = x(layer);
      const cy = y(layer, index);
      const name = nodeName(layer, index);
      return <g key={`n${layer}-${index}`}>
        <circle cx={cx} cy={cy} r={r} fill={style(layer).fill} stroke={style(layer).stroke} strokeWidth={1.8} />
        {name && <Txt x={cx} y={cy} text={name} size={s * 0.95} />}
      </g>;
    }))}
    {inputs.map((name, index) => <Txt key={`in${index}`} x={x(0) - r - s * 0.5} y={y(0, index)} text={name} size={nameSize} anchor="end" fill={c.sub} />)}
    {outputs.map((name, index) => <Txt key={`out${index}`} x={x(last) + r + s * 0.5} y={y(last, index)} text={name} size={nameSize} anchor="start" fill={c.sub} />)}
  </g>;
  return { width: x(last) + r + rightW, height: top + columnH + r, node };
}

/* ───── 퍼셉트론 ───── */

const activationShort: Record<ActivationKind, string> = { step: "step", sigmoid: "sigmoid", tanh: "tanh", relu: "ReLU", leakyRelu: "LeakyReLU" };
const wrapNegative = (value: number) => value < 0 ? `(${formatNumber(value)})` : formatNumber(value);

/** 활성화 함수 모양을 작은 상자 안에 그립니다. */
function MiniCurve({ kind, x, y, w, h, stroke }: { kind: ActivationKind; x: number; y: number; w: number; h: number; stroke: string }) {
  const range = 4;
  const lo = kind === "tanh" ? -1 : kind === "leakyRelu" ? -0.4 : 0;
  const hi = kind === "relu" || kind === "leakyRelu" ? range : 1;
  const px = (value: number) => x + ((value + range) / (range * 2)) * w;
  const py = (value: number) => y + h - ((value - lo) / (hi - lo)) * h;
  if (kind === "step") return <path d={`M${px(-range)} ${py(0)} H${px(0)} V${py(1)} H${px(range)}`} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />;
  const points = Array.from({ length: 41 }, (_, index) => { const value = -range + (index / 40) * range * 2; return `${px(value)},${py(activate(kind, value))}`; }).join(" ");
  return <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />;
}

function drawPerceptron(p: PerceptronSettings, { s, c, arrowInk }: Ctx): Drawn {
  const result = perceptronResult(p);
  const n = p.inputs.length;
  const r = s * 1.3;
  const gapY = s * 3.4;
  const rSum = s * 1.6;
  const valueSize = s * 0.95;
  const values = p.inputs.map((input) => input.value.trim());
  const leftW = values.some(Boolean) ? Math.max(...values.map((value) => textWidth(value, valueSize))) + s * 0.8 : 0;
  const xIn = leftW + r;
  const xSum = xIn + s * 11;
  const columnH = (n - 1) * gapY;
  const y0 = Math.max(r, rSum + s * 4.4 - columnH / 2);
  const yIn = (index: number) => y0 + index * gapY;
  const ySum = y0 + columnH / 2;
  const boxW = s * 4.6;
  const boxH = s * 3.4;
  const boxX = xSum + rSum + s * 3.4;
  const xOut = boxX + boxW + s * 3.4 + r;
  const outText = result ? `= ${formatNumber(result.output)}` : "";
  const biasText = p.bias.trim() || "b";
  const biasTop = ySum - rSum - s * 3.2;

  const terms = p.inputs.map((input) => {
    const weight = input.weight.trim() || "w";
    const number = Number(weight.replace("−", "-"));
    return Number.isFinite(number) && weight !== "" ? `${wrapNegative(number)}${input.name}` : `${weight}${input.name}`;
  });
  const lines: string[] = [];
  if (p.formula) {
    lines.push(`z = ${[...terms, biasText.startsWith("-") || biasText.startsWith("−") ? `(${biasText.replace("-", "−")})` : biasText].join(" + ")}`);
    if (result) {
      lines.push(`z = ${[...result.values.map((value, index) => `${wrapNegative(result.weights[index])}×${wrapNegative(value)}`), wrapNegative(result.bias)].join(" + ")} = ${formatNumber(result.sum)}`);
      lines.push(`${p.output || "y"} = f(z) = ${activationShort[p.activation]}(${formatNumber(result.sum)}) = ${formatNumber(result.output)}`);
    } else lines.push(`${p.output || "y"} = f(z),  f: ${activationInfo[p.activation].name}`);
  }
  const lineSize = s * 0.95;
  const diagramBottom = Math.max(yIn(n - 1) + r, ySum + boxH / 2 + s * 1.8);
  const linesTop = diagramBottom + s * 1.6;
  const lineGap = s * 1.6;

  const node = <g>
    {p.inputs.map((input, index) => {
      const [from, to] = between([xIn, yIn(index)], [xSum, ySum], r, rSum + 1);
      const t = 0.42;
      const lx = from[0] + (to[0] - from[0]) * t;
      const ly = from[1] + (to[1] - from[1]) * t - s * 0.75;
      return <g key={`w${index}`}>
        <Line from={from} to={to} stroke={c.sub} width={1.5} marker={arrowInk} />
        <Tag x={lx} y={ly} text={input.weight.trim() || `w${subscript(index + 1)}`} size={s * 0.9} fill={c.mono ? c.ink : "#7048e8"} />
      </g>;
    })}
    <Line from={[xSum, biasTop]} to={[xSum, ySum - rSum - 1]} stroke={c.sub} width={1.5} marker={arrowInk} />
    <Txt x={xSum} y={biasTop - s * 0.8} text={biasText} size={s * 0.95} fill={c.mono ? c.ink : "#7048e8"} />
    <Line from={[xSum + rSum, ySum]} to={[boxX - 1, ySum]} stroke={c.sub} width={1.5} marker={arrowInk} />
    <Txt x={(xSum + rSum + boxX) / 2} y={ySum - s * 0.8} text={result ? `z = ${formatNumber(result.sum)}` : "z"} size={s * 0.85} math />
    <Line from={[boxX + boxW, ySum]} to={[xOut - r - 1, ySum]} stroke={c.sub} width={1.5} marker={arrowInk} />
    {p.inputs.map((input, index) => <g key={`x${index}`}>
      <circle cx={xIn} cy={yIn(index)} r={r} fill={c.input.fill} stroke={c.input.stroke} strokeWidth={1.8} />
      <Txt x={xIn} y={yIn(index)} text={input.name || `x${subscript(index + 1)}`} size={s} />
      {values[index] && <Txt x={xIn - r - s * 0.5} y={yIn(index)} text={values[index]} size={valueSize} anchor="end" fill={c.sub} math />}
    </g>)}
    <circle cx={xSum} cy={ySum} r={rSum} fill={c.hidden.fill} stroke={c.hidden.stroke} strokeWidth={1.8} />
    <Txt x={xSum} y={ySum} text="Σ" size={s * 1.35} math={false} weight={500} />
    <Txt x={xSum} y={ySum + rSum + s * 0.8} text="가중합" size={s * 0.75} fill={c.faint} />
    <rect x={boxX} y={ySum - boxH / 2} width={boxW} height={boxH} rx={s * 0.4} fill="#ffffff" stroke={c.hidden.stroke} strokeWidth={1.8} />
    <line x1={boxX + s * 0.5} y1={ySum + boxH / 2 - s * 0.6} x2={boxX + boxW - s * 0.5} y2={ySum + boxH / 2 - s * 0.6} stroke={c.grid} />
    <MiniCurve kind={p.activation} x={boxX + s * 0.5} y={ySum - boxH / 2 + s * 0.5} w={boxW - s} h={boxH - s * 1.1} stroke={c.mono ? c.ink : "#7048e8"} />
    <Txt x={boxX + boxW / 2} y={ySum + boxH / 2 + s * 0.8} text={activationInfo[p.activation].name} size={s * 0.75} fill={c.faint} />
    <circle cx={xOut} cy={ySum} r={r} fill={c.output.fill} stroke={c.output.stroke} strokeWidth={1.8} />
    <Txt x={xOut} y={ySum} text={p.output || "y"} size={s} />
    {outText && <Txt x={xOut + r + s * 0.4} y={ySum} text={outText} size={s * 0.95} anchor="start" math />}
    {lines.map((line, index) => <Txt key={`f${index}`} x={0} y={linesTop + index * lineGap} text={line} size={lineSize} anchor="start" math />)}
  </g>;
  const width = Math.max(xOut + r + (outText ? textWidth(outText, s * 0.95) + s * 0.6 : 0), ...lines.map((line) => textWidth(line, lineSize)));
  const height = lines.length ? linesTop + (lines.length - 1) * lineGap + s * 0.7 : diagramBottom;
  return { width, height, node };
}

/* ───── 트리 ───── */

function drawTree(t: TreeSettings, { s, c, arrow }: Ctx): Drawn {
  const roots = parseOutline(t.outline);
  if (!roots.length) return empty("트리 내용을 적어 주세요", s);
  const layout = layoutTree(roots, t.shape, s);
  const visits = visitOrder(roots, t.order, t.stopAtGoal);
  const byId = new Map(layout.boxes.map((box) => [box.node.id, box]));
  const circle = t.shape === "circle";
  const hasDepth = layout.boxes.some((box) => box.node.depth > 0);
  const style = (box: (typeof layout.boxes)[number]) => {
    if (box.node.goal) return c.goal;
    if (circle) return t.order !== "none" && visits.has(box.node.id) ? c.visited : c.plain;
    return hasDepth && !box.node.children.length ? c.leaf : c.input;
  };
  const edges: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  for (const box of layout.boxes) {
    for (const child of box.node.children) {
      const target = byId.get(child.id)!;
      let from: [number, number] = [box.x, box.y + box.h / 2];
      let to: [number, number] = [target.x, target.y - target.h / 2 - (t.arrows ? 1 : 0)];
      if (circle) [from, to] = between([box.x, box.y], [target.x, target.y], box.w / 2, target.w / 2 + (t.arrows ? 1 : 0));
      edges.push(<Line key={`e${child.id}`} from={from} to={to} stroke={c.sub} width={1.5} marker={t.arrows ? arrow : undefined} />);
      if (child.edge) labels.push(<Tag key={`l${child.id}`} x={(from[0] + to[0]) / 2} y={(from[1] + to[1]) / 2} text={child.edge} size={s * 0.8} fill={c.sub} />);
    }
  }
  const nodes = layout.boxes.map((box) => {
    const look = style(box);
    const order = visits.get(box.node.id);
    const textTop = box.y - ((box.lines.length - 1) * layout.lineHeight) / 2;
    return <g key={`n${box.node.id}`}>
      {circle
        ? <circle cx={box.x} cy={box.y} r={box.w / 2} fill={look.fill} stroke={look.stroke} strokeWidth={box.node.goal ? 2.6 : 1.8} />
        : <rect x={box.x - box.w / 2} y={box.y - box.h / 2} width={box.w} height={box.h} rx={s * 0.45} fill={look.fill} stroke={look.stroke} strokeWidth={box.node.goal ? 2.6 : 1.8} />}
      {box.lines.map((line, index) => <Txt key={index} x={box.x} y={textTop + index * layout.lineHeight} text={line} size={s} weight={box.node.goal ? 700 : 600} />)}
      {order !== undefined && <g>
        <circle cx={box.x + box.w / 2 - s * 0.15} cy={box.y - box.h / 2 + s * 0.15} r={s * 0.62} fill={c.badge} />
        <Txt x={box.x + box.w / 2 - s * 0.15} y={box.y - box.h / 2 + s * 0.15} text={String(order)} size={s * 0.7} fill="#ffffff" weight={800} math={false} />
      </g>}
    </g>;
  });
  let legend: string[] = [];
  if (t.order !== "none") {
    const ordered = flattenTree(roots).filter((node) => visits.has(node.id)).sort((a, b) => visits.get(a.id)! - visits.get(b.id)!);
    const goal = ordered.find((node) => node.goal);
    const text = `${t.order === "bfs" ? "너비 우선" : "깊이 우선"} 탐색 순서: ${ordered.map((node) => node.text).join(" → ")}${t.stopAtGoal && goal ? ` (목표 ${goal.text}에서 멈춤)` : ""}`;
    legend = wrapText(text, Math.max(layout.width, s * 24), s * 0.9, 4);
  }
  const pad = s * 0.6;
  const legendTop = layout.height + pad + s * 1.8;
  const node = <g transform={`translate(${pad} ${pad})`}>
    {edges}{labels}{nodes}
    {legend.map((line, index) => <Txt key={`g${index}`} x={0} y={legendTop + index * s * 1.4} text={line} size={s * 0.9} anchor="start" fill={c.sub} math={false} />)}
  </g>;
  const legendW = legend.length ? Math.max(...legend.map((line) => textWidth(line, s * 0.9))) : 0;
  return { width: Math.max(layout.width, legendW) + pad * 2, height: (legend.length ? legendTop + (legend.length - 1) * s * 1.4 + s * 0.7 : layout.height) + pad * 2, node };
}

/* ───── 데이터 산점도 ───── */

function drawScatter(d: ScatterSettings, { s, c, clip }: Ctx): Drawn {
  const points = parsePoints(d.points);
  if (!points.length) return empty("데이터를 ‘x, y, 무리’ 형식으로 적어 주세요", s);
  const query = d.overlay === "knn" ? parseQuery(d.query) : null;
  const classes = pointClasses(points);
  const xs = points.map((point) => point.x).concat(query ? [query.x] : []);
  const ys = points.map((point) => point.y).concat(query ? [query.y] : []);
  const spread = (values: number[]) => { const lo = Math.min(...values); const hi = Math.max(...values); const pad = (hi - lo || 1) * 0.06; return [lo - pad, hi + pad] as const; };
  const xt = niceTicks(...spread(xs));
  const yt = niceTicks(...spread(ys));
  const tick = s * 0.75;
  const yTickW = Math.max(...yt.ticks.map((value) => textWidth(formatNumber(value), tick)));
  const left = s * 1.8 + yTickW + s * 0.6;
  const plotW = s * 24;
  const plotH = s * 18;
  const top = s * 0.6;
  const toX = (value: number) => left + ((value - xt.min) / (xt.max - xt.min)) * plotW;
  const toY = (value: number) => top + plotH - ((value - yt.min) / (yt.max - yt.min)) * plotH;
  const markSize = s * 0.38;

  const knn = query ? nearestNeighbors(points, query, d.k) : null;
  const line = d.overlay === "regression" ? linearRegression(points) : null;
  const km = d.overlay === "kmeans" ? kMeans(points, d.clusters, d.iterations) : null;
  const classIndex = (label: string) => classes.indexOf(label);

  const legendItems: { draw: (x: number, y: number) => React.ReactNode; text: string }[] = [];
  const classMark = (index: number) => function drawClass(x: number, y: number) { return <PointMark x={x} y={y} size={markSize} index={index} c={c} />; };
  if (km) km.centroids.forEach((_, index) => legendItems.push({ draw: classMark(index), text: `군집 ${index + 1}` }));
  else if (classes.length > 1 || classes[0] !== unlabeled) classes.forEach((label, index) => legendItems.push({ draw: classMark(index), text: label }));
  if (knn) legendItems.push({ draw: (x, y) => <Star x={x} y={y} r={s * 0.55} c={c} />, text: "새 데이터" });
  if (km) legendItems.push({ draw: (x, y) => <Cross x={x} y={y} r={s * 0.45} stroke={c.ink} />, text: "중심" });
  if (line) legendItems.push({ draw: (x, y) => <line x1={x - s * 0.6} y1={y} x2={x + s * 0.6} y2={y} stroke={c.accent} strokeWidth={2.4} />, text: "회귀 직선" });
  const legendSize = s * 0.85;
  const legendX = left + plotW + s * 1.2;
  const legendW = legendItems.length ? s * 1.8 + Math.max(...legendItems.map((item) => textWidth(item.text, legendSize))) : 0;

  const info: string[] = [];
  if (knn) {
    const votes = [...knn.votes].sort((a, b) => b[1] - a[1]).map(([label, count]) => `${label} ${count}표`).join(", ");
    info.push(`k = ${Math.min(d.k, points.length)}: ${votes} → ‘${knn.prediction}’(으)로 분류`);
  }
  const equation = line ? `ŷ = ${formatNumber(line.slope, 3)}x ${line.intercept < 0 ? "−" : "+"} ${formatNumber(Math.abs(line.intercept), 3)}` : "";
  if (km) info.push(`k = ${km.centroids.length}, 반복 ${Math.min(d.iterations, km.trails[0]?.length ? km.trails[0].length - 1 : 0)}회${d.iterations === 0 ? " (처음 중심)" : km.converged ? " (중심이 더 움직이지 않음)" : " (아직 움직이는 중)"}`);
  const infoSize = s * 0.9;
  const bottom = top + plotH + s * 1.4 + s * 1.6;
  const infoTop = bottom + s * 1.2;

  const node = <g>
    <defs><clipPath id={clip}><rect x={left} y={top} width={plotW} height={plotH} /></clipPath></defs>
    {d.grid && xt.ticks.map((value) => <line key={`gx${value}`} x1={toX(value)} y1={top} x2={toX(value)} y2={top + plotH} stroke={c.grid} />)}
    {d.grid && yt.ticks.map((value) => <line key={`gy${value}`} x1={left} y1={toY(value)} x2={left + plotW} y2={toY(value)} stroke={c.grid} />)}
    <rect x={left} y={top} width={plotW} height={plotH} fill="none" stroke={c.faint} strokeWidth={1.2} />
    {xt.ticks.map((value) => <Txt key={`tx${value}`} x={toX(value)} y={top + plotH + s * 0.8} text={formatNumber(value)} size={tick} fill={c.sub} math={false} weight={500} />)}
    {yt.ticks.map((value) => <Txt key={`ty${value}`} x={left - s * 0.4} y={toY(value)} text={formatNumber(value)} size={tick} anchor="end" fill={c.sub} math={false} weight={500} />)}
    <Txt x={left + plotW / 2} y={top + plotH + s * 2.3} text={d.xLabel || "x"} size={s * 0.9} weight={700} />
    <Txt x={s * 0.7} y={top + plotH / 2} text={d.yLabel || "y"} size={s * 0.9} weight={700} rotate={isSymbol(d.yLabel) ? undefined : -90} />
    <g clipPath={`url(#${clip})`}>
      {line && d.residuals && points.map((point, index) => <line key={`r${index}`} x1={toX(point.x)} y1={toY(point.y)} x2={toX(point.x)} y2={toY(line.slope * point.x + line.intercept)} stroke={c.faint} strokeDasharray="3 3" strokeWidth={1.2} />)}
      {line && <line x1={toX(xt.min)} y1={toY(line.slope * xt.min + line.intercept)} x2={toX(xt.max)} y2={toY(line.slope * xt.max + line.intercept)} stroke={c.accent} strokeWidth={2.4} />}
      {knn && query && <g>
        <ellipse cx={toX(query.x)} cy={toY(query.y)} rx={(knn.radius / (xt.max - xt.min)) * plotW} ry={(knn.radius / (yt.max - yt.min)) * plotH} fill={c.mono ? "none" : "rgba(112,72,232,.06)"} stroke={c.sub} strokeDasharray="5 4" strokeWidth={1.2} />
        {knn.neighbors.map(({ point }, index) => <line key={`k${index}`} x1={toX(query.x)} y1={toY(query.y)} x2={toX(point.x)} y2={toY(point.y)} stroke={c.sub} strokeDasharray="2 3" strokeWidth={1.2} />)}
      </g>}
      {km && d.iterations > 0 && km.trails.map((trail, index) => <g key={`tr${index}`}>
        <polyline points={trail.map((point) => `${toX(point.x)},${toY(point.y)}`).join(" ")} fill="none" stroke={c.classes[index % 5]} strokeDasharray="4 3" strokeWidth={1.4} />
        {trail.slice(0, -1).map((point, step) => <circle key={step} cx={toX(point.x)} cy={toY(point.y)} r={s * 0.22} fill="#ffffff" stroke={c.classes[index % 5]} strokeWidth={1.3} />)}
      </g>)}
      {points.map((point, index) => <PointMark key={`p${index}`} x={toX(point.x)} y={toY(point.y)} size={markSize} index={km ? km.assignment[index] : classIndex(point.label)} c={c} />)}
      {knn && knn.neighbors.map(({ point }, index) => <circle key={`kn${index}`} cx={toX(point.x)} cy={toY(point.y)} r={markSize * 2} fill="none" stroke={c.ink} strokeWidth={1.3} />)}
      {km && km.centroids.map((point, index) => <Cross key={`c${index}`} x={toX(point.x)} y={toY(point.y)} r={s * 0.55} stroke={c.mono ? c.ink : c.classes[index % 5]} outline />)}
      {query && <Star x={toX(query.x)} y={toY(query.y)} r={s * 0.7} c={c} />}
    </g>
    {line && d.equation && <Tag x={left + s * 0.6 + textWidth(equation, s * 0.9) / 2} y={top + s * 1.1} text={equation} size={s * 0.9} math fill={c.accent} />}
    {legendItems.map((item, index) => <g key={`lg${index}`}>
      {item.draw(legendX + s * 0.6, top + s * 0.8 + index * s * 1.5)}
      <Txt x={legendX + s * 1.5} y={top + s * 0.8 + index * s * 1.5} text={item.text} size={legendSize} anchor="start" fill={c.sub} math={false} />
    </g>)}
    {info.map((text, index) => <Txt key={`i${index}`} x={left} y={infoTop + index * s * 1.4} text={text} size={infoSize} anchor="start" fill={c.sub} math={false} />)}
  </g>;
  const infoW = info.length ? left + Math.max(...info.map((text) => textWidth(text, infoSize))) : 0;
  return { width: Math.max(legendX + legendW, infoW, left + plotW), height: info.length ? infoTop + (info.length - 1) * s * 1.4 + s * 0.7 : bottom, node };
}

function Star({ x, y, r, c }: { x: number; y: number; r: number; c: Palette }) {
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 ? r * 0.45 : r;
    return `${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`;
  }).join(" ");
  return <polygon points={points} fill={c.mono ? "#ffffff" : "#ffd43b"} stroke={c.ink} strokeWidth={1.4} strokeLinejoin="round" />;
}

function Cross({ x, y, r, stroke, outline }: { x: number; y: number; r: number; stroke: string; outline?: boolean }) {
  const d = `M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}`;
  return <g strokeLinecap="round">
    {outline && <path d={d} stroke="#ffffff" strokeWidth={6} />}
    <path d={d} stroke={stroke} strokeWidth={3} />
  </g>;
}

/* ───── 혼동 행렬 ───── */

export function confusionLines(m: ConfusionSettings) {
  const { total, accuracy, precision, recall, f1 } = confusionMetrics(m);
  const show = (value: number | null) => value === null ? "계산할 수 없음" : `${formatNumber(value, 3)} (${formatNumber(value * 100, 1)}%)`;
  if (!m.formulas) return [`정확도 ${show(accuracy)}`, `정밀도 ${show(precision)}`, `재현율 ${show(recall)}`, `F1 점수 ${show(f1)}`];
  return [
    `정확도 = (TP + TN) / 전체 = (${m.tp} + ${m.tn}) / ${total} = ${show(accuracy)}`,
    `정밀도 = TP / (TP + FP) = ${m.tp} / ${m.tp + m.fp} = ${show(precision)}`,
    `재현율 = TP / (TP + FN) = ${m.tp} / ${m.tp + m.fn} = ${show(recall)}`,
    `F1 점수 = 2 × 정밀도 × 재현율 / (정밀도 + 재현율) = ${show(f1)}`,
  ];
}

function drawConfusion(m: ConfusionSettings, { s, c }: Ctx): Drawn {
  const cellW = s * 7.5;
  const cellH = s * 4.6;
  const nameSize = s * 0.9;
  const positive = m.positive || "양성";
  const negative = m.negative || "음성";
  const rowNameW = Math.max(textWidth(positive, nameSize), textWidth(negative, nameSize)) + s * 1.2;
  const x0 = s * 2 + rowNameW;
  const y0 = s * 3.8;
  const cells = [
    { row: 0, col: 0, value: m.tp, code: "TP", term: "참 양성", good: true },
    { row: 0, col: 1, value: m.fn, code: "FN", term: "거짓 음성", good: false },
    { row: 1, col: 0, value: m.fp, code: "FP", term: "거짓 양성", good: false },
    { row: 1, col: 1, value: m.tn, code: "TN", term: "참 음성", good: true },
  ];
  const lines = m.metrics ? confusionLines(m) : [];
  const lineSize = s * 0.9;
  const linesTop = y0 + cellH * 2 + s * 2;
  const node = <g>
    <Txt x={x0 + cellW} y={s * 0.8} text="예측" size={s} weight={800} />
    <Txt x={s * 0.8} y={y0 + cellH} text="실제" size={s} weight={800} rotate={-90} />
    {[positive, negative].map((name, index) => <Txt key={`c${index}`} x={x0 + cellW * (index + 0.5)} y={s * 2.6} text={name} size={nameSize} fill={c.sub} />)}
    {[positive, negative].map((name, index) => <Txt key={`r${index}`} x={x0 - s * 0.6} y={y0 + cellH * (index + 0.5)} text={name} size={nameSize} anchor="end" fill={c.sub} />)}
    {cells.map((cell) => {
      const x = x0 + cell.col * cellW;
      const y = y0 + cell.row * cellH;
      return <g key={cell.code}>
        <rect x={x} y={y} width={cellW} height={cellH} fill={cell.good ? c.good : c.bad} stroke={c.ink} strokeWidth={1.5} />
        <Txt x={x + cellW / 2} y={y + cellH * (m.terms ? 0.42 : 0.5)} text={String(cell.value)} size={s * 1.6} weight={800} math={false} />
        {m.terms && <Txt x={x + cellW / 2} y={y + cellH * 0.76} text={`${cell.code} · ${cell.term}`} size={s * 0.72} fill={c.sub} math={false} />}
      </g>;
    })}
    {lines.map((line, index) => <Txt key={`m${index}`} x={0} y={linesTop + index * s * 1.5} text={line} size={lineSize} anchor="start" fill={c.ink} math={false} weight={500} />)}
  </g>;
  const width = Math.max(x0 + cellW * 2, ...lines.map((line) => textWidth(line, lineSize)));
  return { width, height: lines.length ? linesTop + (lines.length - 1) * s * 1.5 + s * 0.7 : y0 + cellH * 2, node };
}

/* ───── 활성화 함수 ───── */

function drawActivation(a: ActivationSettings, { s, c }: Ctx): Drawn {
  const kinds = a.functions;
  const R = a.range;
  const overlay = a.layout === "overlay";
  const panelW = overlay ? s * 24 : s * 13;
  const panelH = overlay ? s * 16 : s * 11;
  const columns = overlay ? 1 : Math.min(3, kinds.length);
  const captionH = overlay ? 0 : s * (a.formula ? 3.2 : 1.9);
  const gap = s * 1.6;
  const colorOf = (kind: ActivationKind) => c.curves[activationKinds.indexOf(kind) % c.curves.length];
  const dashOf = (kind: ActivationKind) => c.dashes[activationKinds.indexOf(kind) % c.dashes.length];

  const panel = (list: ActivationKind[], ox: number, oy: number, key: string) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const kind of list) for (let index = 0; index <= 80; index += 1) { const value = activate(kind, -R + (index / 80) * 2 * R); lo = Math.min(lo, value); hi = Math.max(hi, value); }
    lo = Math.min(lo, 0);
    const pad = (hi - lo) * 0.18;
    const yt = niceTicks(lo - pad, hi + pad, overlay ? 6 : 4);
    const xt = niceTicks(-R, R, overlay ? 8 : 5);
    const toX = (value: number) => ox + ((value - xt.min) / (xt.max - xt.min)) * panelW;
    const toY = (value: number) => oy + panelH - ((value - yt.min) / (yt.max - yt.min)) * panelH;
    const tick = s * 0.7;
    return <g key={key}>
      {a.grid && xt.ticks.map((value) => <line key={`gx${value}`} x1={toX(value)} y1={oy} x2={toX(value)} y2={oy + panelH} stroke={c.grid} />)}
      {a.grid && yt.ticks.map((value) => <line key={`gy${value}`} x1={ox} y1={toY(value)} x2={ox + panelW} y2={toY(value)} stroke={c.grid} />)}
      <Line from={[ox, toY(0)]} to={[ox + panelW, toY(0)]} stroke={c.ink} width={1.3} marker={`${key}-axis`} />
      <Line from={[toX(0), oy + panelH]} to={[toX(0), oy]} stroke={c.ink} width={1.3} marker={`${key}-axis`} />
      <defs><marker id={`${key}-axis`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={s * 0.5} markerHeight={s * 0.5} markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={c.ink} /></marker></defs>
      <Txt x={ox + panelW - s * 0.2} y={toY(0) + s * 0.9} text="x" size={s * 0.85} anchor="end" />
      <Txt x={toX(0) + s * 0.5} y={oy + s * 0.4} text="y" size={s * 0.85} anchor="start" />
      <Txt x={toX(0) - s * 0.35} y={toY(0) + s * 0.7} text="O" size={tick} anchor="end" math={false} fill={c.sub} weight={500} />
      {xt.ticks.filter((value) => value !== 0 && value > xt.min && value < xt.max).map((value) => <g key={`tx${value}`}>
        <line x1={toX(value)} y1={toY(0) - 3} x2={toX(value)} y2={toY(0) + 3} stroke={c.ink} />
        <Txt x={toX(value)} y={toY(0) + s * 0.75} text={formatNumber(value)} size={tick} fill={c.sub} math={false} weight={500} />
      </g>)}
      {yt.ticks.filter((value) => value !== 0 && value > yt.min && value < yt.max).map((value) => <g key={`ty${value}`}>
        <line x1={toX(0) - 3} y1={toY(value)} x2={toX(0) + 3} y2={toY(value)} stroke={c.ink} />
        <Txt x={toX(0) - s * 0.35} y={toY(value)} text={formatNumber(value)} size={tick} anchor="end" fill={c.sub} math={false} weight={500} />
      </g>)}
      {list.map((kind) => {
        const stroke = colorOf(kind);
        if (kind === "step") return <g key={kind}>
          <path d={`M${toX(-R)} ${toY(0)} H${toX(0)} M${toX(0)} ${toY(1)} H${toX(R)}`} fill="none" stroke={stroke} strokeWidth={2.6} strokeDasharray={dashOf(kind)} />
          <circle cx={toX(0)} cy={toY(0)} r={s * 0.25} fill="#ffffff" stroke={stroke} strokeWidth={1.8} />
          <circle cx={toX(0)} cy={toY(1)} r={s * 0.25} fill={stroke} />
        </g>;
        const points = Array.from({ length: 161 }, (_, index) => { const value = -R + (index / 160) * 2 * R; return `${toX(value)},${toY(activate(kind, value))}`; }).join(" ");
        return <polyline key={kind} points={points} fill="none" stroke={stroke} strokeWidth={2.6} strokeDasharray={dashOf(kind)} strokeLinejoin="round" />;
      })}
    </g>;
  };

  const nodes: React.ReactNode[] = [];
  let width = 0;
  let height = 0;
  if (overlay) {
    nodes.push(panel(kinds, 0, 0, "all"));
    const legendTop = panelH + s * 1.6;
    kinds.forEach((kind, index) => {
      const y = legendTop + index * s * 1.5;
      const label = a.formula ? `${activationInfo[kind].name}   ${activationInfo[kind].formula}` : activationInfo[kind].name;
      nodes.push(<g key={`lg${kind}`}>
        <line x1={0} y1={y} x2={s * 1.6} y2={y} stroke={colorOf(kind)} strokeWidth={2.6} strokeDasharray={dashOf(kind)} />
        <Txt x={s * 2.2} y={y} text={label} size={s * 0.85} anchor="start" math={false} weight={600} />
      </g>);
      width = Math.max(width, s * 2.2 + textWidth(label, s * 0.85));
    });
    width = Math.max(width, panelW);
    height = legendTop + (kinds.length - 1) * s * 1.5 + s * 0.7;
  } else {
    kinds.forEach((kind, index) => {
      const ox = (index % columns) * (panelW + gap * 2);
      const oy = Math.floor(index / columns) * (panelH + captionH + gap);
      nodes.push(panel([kind], ox, oy, `p${kind}`));
      nodes.push(<Txt key={`n${kind}`} x={ox + panelW / 2} y={oy + panelH + s * 1.1} text={activationInfo[kind].name} size={s * 0.95} weight={800} math={false} />);
      if (a.formula) nodes.push(<Txt key={`f${kind}`} x={ox + panelW / 2} y={oy + panelH + s * 2.5} text={activationInfo[kind].formula} size={s * 0.8} math fill={c.sub} />);
      width = Math.max(width, ox + panelW, ox + panelW / 2 + textWidth(activationInfo[kind].formula, s * 0.8) / 2);
      height = Math.max(height, oy + panelH + captionH);
    });
  }
  return { width, height, node: <g>{nodes}</g> };
}

function empty(message: string, s: number): Drawn {
  return { width: s * 22, height: s * 8, node: <Txt x={s * 11} y={s * 4} text={message} size={s * 0.95} fill="#868e96" math={false} /> };
}

/** 문서 한 장을 SVG로 그립니다. 편집 표시가 없어 화면 그대로 저장합니다. */
export function AiFigureSvg({ doc, svgRef, className, fit }: { doc: AiFigureDoc; svgRef?: React.Ref<SVGSVGElement>; className?: string; fit?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const s = doc.textSize;
  const c = palette(doc.mono);
  const ctx: Ctx = { s, c, arrow: `${id}-arrow`, arrowInk: `${id}-arrow-ink`, clip: `${id}-clip` };
  const drawn = doc.kind === "network" ? drawNetwork(doc.network, ctx)
    : doc.kind === "perceptron" ? drawPerceptron(doc.perceptron, ctx)
      : doc.kind === "tree" ? drawTree(doc.tree, ctx)
        : doc.kind === "scatter" ? drawScatter(doc.scatter, ctx)
          : doc.kind === "confusion" ? drawConfusion(doc.confusion, ctx)
            : drawActivation(doc.activation, ctx);
  const pad = s * 1.4;
  const title = doc.title.trim();
  const titleSize = s * 1.25;
  const titleH = title ? titleSize * 2.2 : 0;
  const width = Math.ceil(Math.max(drawn.width, title ? textWidth(title, titleSize) : 0) + pad * 2);
  const height = Math.ceil(drawn.height + titleH + pad * 2);
  const offsetX = pad + (width - pad * 2 - drawn.width) / 2;
  return <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width={width} height={height} xmlns="http://www.w3.org/2000/svg" className={className} style={fit ? { width: `min(100%, ${Math.round(width * fit)}px)`, height: "auto" } : undefined} role="img" aria-label={title || "AI 수업 그림"}>
    <defs>
      <marker id={ctx.arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={s * 0.55} markerHeight={s * 0.55} markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={c.edge} /></marker>
      <marker id={ctx.arrowInk} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={s * 0.6} markerHeight={s * 0.6} markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={c.sub} /></marker>
    </defs>
    <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
    {title && <Txt x={width / 2} y={pad + titleSize * 0.6} text={title} size={titleSize} weight={800} math={false} />}
    <g transform={`translate(${offsetX} ${pad + titleH})`}>{drawn.node}</g>
  </svg>;
}

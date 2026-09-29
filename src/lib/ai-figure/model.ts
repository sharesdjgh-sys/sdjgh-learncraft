import { z } from "zod";

/* 인공지능 기초 수업 그림(신경망, 퍼셉트론, 트리, 산점도, 혼동 행렬, 활성화 함수)의 문서 형식과 계산입니다.
   그림은 설정값만 저장하고, 모양은 매번 설정에서 다시 계산해 그립니다. */

export const figureKinds = ["network", "perceptron", "tree", "scatter", "confusion", "activation"] as const;
export type AiFigureKind = typeof figureKinds[number];

export const figureKindInfo: Record<AiFigureKind, { name: string; unit: string; help: string }> = {
  network: { name: "신경망 구조", unit: "딥러닝", help: "층마다 노드 수를 정하면 입력층·은닉층·출력층을 잇는 인공 신경망 그림을 그려요." },
  perceptron: { name: "퍼셉트론", unit: "딥러닝", help: "입력·가중치·편향을 넣으면 가중합과 활성화 함수를 거쳐 출력이 나오는 과정을 그려요. 숫자를 넣으면 계산식도 보여요." },
  tree: { name: "트리", unit: "탐색·결정 트리", help: "들여쓰기로 적은 목록을 트리로 그려요. 탐색 트리의 방문 순서(너비·깊이 우선)나 결정 트리의 가지 이름을 넣을 수 있어요." },
  scatter: { name: "데이터 산점도", unit: "기계학습", help: "데이터 점을 찍고 k-최근접 이웃, 선형 회귀, k-평균 군집을 겹쳐 그려요." },
  confusion: { name: "혼동 행렬", unit: "기계학습", help: "분류 결과 개수로 혼동 행렬을 그리고 정확도·정밀도·재현율·F1 점수를 계산해요." },
  activation: { name: "활성화 함수", unit: "딥러닝", help: "계단·시그모이드·tanh·ReLU 함수 그래프를 한 그래프에 겹치거나 나란히 그려요." },
};

export const activationKinds = ["step", "sigmoid", "tanh", "relu", "leakyRelu"] as const;
export type ActivationKind = typeof activationKinds[number];
export const activationInfo: Record<ActivationKind, { name: string; formula: string }> = {
  step: { name: "계단 함수", formula: "f(x) = 1 (x ≥ 0), 0 (x < 0)" },
  sigmoid: { name: "시그모이드", formula: "f(x) = 1 / (1 + e⁻ˣ)" },
  tanh: { name: "tanh", formula: "f(x) = (eˣ − e⁻ˣ) / (eˣ + e⁻ˣ)" },
  relu: { name: "ReLU", formula: "f(x) = max(0, x)" },
  leakyRelu: { name: "Leaky ReLU", formula: "f(x) = max(0.1x, x)" },
};

export function activate(kind: ActivationKind, x: number) {
  if (kind === "step") return x >= 0 ? 1 : 0;
  if (kind === "sigmoid") return 1 / (1 + Math.exp(-x));
  if (kind === "tanh") return Math.tanh(x);
  if (kind === "relu") return Math.max(0, x);
  return x >= 0 ? x : 0.1 * x;
}

/* ───── 문서 형식 ───── */

const shortText = z.string().max(20);
const perceptronInput = z.object({ name: shortText, value: shortText, weight: shortText });

const networkSchema = z.object({
  layers: z.array(z.number().int().min(1).max(8)).min(2).max(6),
  inputNames: z.string().max(160),
  outputNames: z.string().max(160),
  symbols: z.boolean(),
  hiddenSymbols: z.boolean(),
  layerTitles: z.boolean(),
  bias: z.boolean(),
  arrows: z.boolean(),
});
const perceptronSchema = z.object({
  inputs: z.array(perceptronInput).min(1).max(5),
  bias: shortText,
  activation: z.enum(activationKinds),
  output: shortText,
  formula: z.boolean(),
});
const treeSchema = z.object({
  outline: z.string().max(4000),
  shape: z.enum(["box", "circle"]),
  order: z.enum(["none", "bfs", "dfs"]),
  stopAtGoal: z.boolean(),
  arrows: z.boolean(),
});
const scatterSchema = z.object({
  points: z.string().max(6000),
  xLabel: shortText,
  yLabel: shortText,
  overlay: z.enum(["none", "knn", "regression", "kmeans"]),
  query: z.string().max(30),
  k: z.number().int().min(1).max(15),
  clusters: z.number().int().min(2).max(5),
  iterations: z.number().int().min(0).max(10),
  equation: z.boolean(),
  residuals: z.boolean(),
  grid: z.boolean(),
});
const count = z.number().int().min(0).max(999999);
const confusionSchema = z.object({
  positive: shortText,
  negative: shortText,
  tp: count, fn: count, fp: count, tn: count,
  terms: z.boolean(),
  metrics: z.boolean(),
  formulas: z.boolean(),
});
const activationSchema = z.object({
  functions: z.array(z.enum(activationKinds)).min(1).max(activationKinds.length),
  layout: z.enum(["overlay", "panels"]),
  range: z.number().int().min(2).max(10),
  formula: z.boolean(),
  grid: z.boolean(),
});

export const aiFigureDocSchema = z.object({
  version: z.literal(1),
  kind: z.enum(figureKinds),
  title: z.string().max(80),
  /** 흑백 인쇄용: 색 대신 검정·회색과 모양으로 구분합니다. */
  mono: z.boolean(),
  textSize: z.number().min(12).max(28),
  network: networkSchema,
  perceptron: perceptronSchema,
  tree: treeSchema,
  scatter: scatterSchema,
  confusion: confusionSchema,
  activation: activationSchema,
});

export type AiFigureDoc = z.infer<typeof aiFigureDocSchema>;
export type NetworkSettings = z.infer<typeof networkSchema>;
export type PerceptronSettings = z.infer<typeof perceptronSchema>;
export type PerceptronInput = z.infer<typeof perceptronInput>;
export type TreeSettings = z.infer<typeof treeSchema>;
export type ScatterSettings = z.infer<typeof scatterSchema>;
export type ConfusionSettings = z.infer<typeof confusionSchema>;
export type ActivationSettings = z.infer<typeof activationSchema>;

export function parseAiFigureDoc(value: unknown): AiFigureDoc | null {
  const parsed = aiFigureDocSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const defaultTreeOutline = [
  "날씨가 맑은가?",
  "  [예] 습도가 높은가?",
  "    [예] 실내 활동",
  "    [아니요] 야외 활동",
  "  [아니요] 바람이 강한가?",
  "    [예] 실내 활동",
  "    [아니요] 야외 활동",
].join("\n");

export const defaultScatterPoints = [
  "2, 3, 고양이", "3, 2.5, 고양이", "2.5, 4, 고양이", "3.5, 3.5, 고양이", "1.5, 2, 고양이", "4, 2.8, 고양이",
  "6, 6.5, 강아지", "7, 6, 강아지", "6.5, 7.5, 강아지", "7.5, 7, 강아지", "5.5, 5.5, 강아지", "8, 6.2, 강아지",
].join("\n");

export function blankAiFigure(kind: AiFigureKind = "network"): AiFigureDoc {
  return {
    version: 1,
    kind,
    title: "",
    mono: false,
    textSize: 16,
    network: { layers: [3, 4, 2], inputNames: "", outputNames: "", symbols: true, hiddenSymbols: false, layerTitles: true, bias: false, arrows: true },
    perceptron: {
      inputs: [{ name: "x₁", value: "", weight: "w₁" }, { name: "x₂", value: "", weight: "w₂" }, { name: "x₃", value: "", weight: "w₃" }],
      bias: "b",
      activation: "step",
      output: "y",
      formula: true,
    },
    tree: { outline: defaultTreeOutline, shape: "box", order: "none", stopAtGoal: true, arrows: false },
    scatter: {
      points: defaultScatterPoints, xLabel: "귀 길이", yLabel: "몸무게", overlay: "knn", query: "4.8, 4.6", k: 3, clusters: 2, iterations: 3,
      equation: true, residuals: false, grid: true,
    },
    confusion: { positive: "스팸", negative: "정상", tp: 40, fn: 10, fp: 5, tn: 45, terms: true, metrics: true, formulas: true },
    activation: { functions: ["step", "sigmoid", "relu"], layout: "panels", range: 5, formula: true, grid: true },
  };
}

/* ───── 글자 ───── */

const subscriptDigits = "₀₁₂₃₄₅₆₇₈₉";
export const subscript = (value: number) => String(value).split("").map((digit) => subscriptDigits[Number(digit)] ?? digit).join("");

/** x₁, w₁₂, b, y처럼 수학 기호로 읽을 이름인지 봅니다(기울인 세리프체로 씁니다). */
export function isSymbol(text: string) {
  return /^[A-Za-zα-ωθλ](?:[₀-₉ᵢⱼₙ]+)?[′']?$/.test(text.trim());
}

/** 글자 폭을 어림합니다(한글·전각은 1em, 영문·숫자는 약 0.6em). 그림 배치에만 씁니다. */
export function textWidth(text: string, size: number) {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const wide = (code >= 0x1100 && code <= 0x11ff) || (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xff00 && code <= 0xff60);
    if (wide) width += 1;
    else if (char === " ") width += 0.3;
    else if (/[₀-₉]/.test(char)) width += 0.4;
    else if (/[A-ZMW%@]/.test(char)) width += 0.68;
    else width += 0.56;
  }
  return width * size;
}

/** 긴 이름을 여러 줄로 나눕니다. 띄어쓰기에서 먼저 나누고, 한 낱말이 너무 길면 글자 단위로 자릅니다. */
export function wrapText(text: string, maxWidth: number, size: number, maxLines = 3) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const push = (value: string) => { if (value) lines.push(value); };
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth) { line = candidate; continue; }
    push(line);
    line = "";
    let rest = word;
    while (textWidth(rest, size) > maxWidth) {
      let cut = 1;
      const chars = [...rest];
      while (cut < chars.length && textWidth(chars.slice(0, cut + 1).join(""), size) <= maxWidth) cut += 1;
      push(chars.slice(0, cut).join(""));
      rest = chars.slice(cut).join("");
    }
    line = rest;
  }
  push(line);
  if (lines.length <= maxLines) return lines.length ? lines : [""];
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
  return kept;
}

export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(/−/g, "-").replace(/,/g, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** 보기 좋은 자리수로 숫자를 씁니다. 음수는 수학 기호 −를 씁니다. */
export function formatNumber(value: number, digits = 3) {
  const rounded = Number(value.toFixed(digits));
  const text = String(Object.is(rounded, -0) ? 0 : rounded);
  return text.replace("-", "−");
}

export const splitNames = (text: string) => text.split(/[,，\n]/).map((name) => name.trim()).filter(Boolean);

/* ───── 퍼셉트론 ───── */

export function perceptronResult(settings: PerceptronSettings) {
  const values = settings.inputs.map((input) => parseNumber(input.value));
  const weights = settings.inputs.map((input) => parseNumber(input.weight));
  const bias = parseNumber(settings.bias);
  if (values.some((value) => value === null) || weights.some((weight) => weight === null) || bias === null) return null;
  const sum = values.reduce<number>((total, value, index) => total + value! * weights[index]!, 0) + bias;
  return { values: values as number[], weights: weights as number[], bias, sum, output: activate(settings.activation, sum) };
}

/* ───── 트리 ───── */

export type TreeNode = { id: number; text: string; edge: string; goal: boolean; depth: number; children: TreeNode[] };
export const MAX_TREE_NODES = 63;

/** 들여쓰기 목록을 트리로 읽습니다. 줄 앞의 [예]는 가지 이름, 줄 끝의 *는 목표(강조) 노드입니다. */
export function parseOutline(text: string) {
  const roots: TreeNode[] = [];
  const stack: { indent: number; node: TreeNode }[] = [];
  let id = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || id >= MAX_TREE_NODES) continue;
    const indent = raw.match(/^[ \t　]*/)![0].replace(/\t/g, "    ").replace(/　/g, "  ").length;
    let body = raw.trim().replace(/^[-•·]\s+/, "");
    let edge = "";
    const edgeMatch = body.match(/^\[([^\]]*)\]\s*/);
    if (edgeMatch) { edge = edgeMatch[1].trim().slice(0, 20); body = body.slice(edgeMatch[0].length); }
    const goal = /\s*\*$/.test(body);
    body = body.replace(/\s*\*$/, "").trim().slice(0, 40);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1]?.node;
    const node: TreeNode = { id: id++, text: body || " ", edge, goal, depth: parent ? parent.depth + 1 : 0, children: [] };
    (parent ? parent.children : roots).push(node);
    stack.push({ indent, node });
  }
  return roots;
}

export function flattenTree(roots: TreeNode[]) {
  const nodes: TreeNode[] = [];
  const walk = (node: TreeNode) => { nodes.push(node); node.children.forEach(walk); };
  roots.forEach(walk);
  return nodes;
}

/** 너비 우선·깊이 우선 방문 순서(1부터)를 매깁니다. 목표에서 멈추면 그 뒤 노드는 번호가 없습니다. */
export function visitOrder(roots: TreeNode[], order: TreeSettings["order"], stopAtGoal: boolean) {
  const visits = new Map<number, number>();
  if (order === "none") return visits;
  const pending = [...roots];
  while (pending.length) {
    const node = pending.shift()!;
    visits.set(node.id, visits.size + 1);
    if (stopAtGoal && node.goal) break;
    if (order === "bfs") pending.push(...node.children);
    else pending.unshift(...node.children);
  }
  return visits;
}

export type TreeBox = { node: TreeNode; x: number; y: number; w: number; h: number; lines: string[] };

/** 트리 노드 자리를 정합니다. 잎 노드를 왼쪽부터 늘어놓고, 부모는 자식들의 가운데에 둡니다. */
export function layoutTree(roots: TreeNode[], shape: TreeSettings["shape"], size: number) {
  const lineHeight = size * 1.3;
  const boxes = new Map<number, TreeBox>();
  const measure = (node: TreeNode) => {
    const lines = wrapText(node.text, shape === "circle" ? size * 5 : size * 7.5, size);
    const textW = Math.max(...lines.map((line) => textWidth(line, size)));
    const textH = lines.length * lineHeight;
    if (shape === "circle") {
      const d = Math.max(size * 2.6, Math.hypot(textW, textH) + size * 0.8);
      return { w: d, h: d, lines };
    }
    return { w: Math.max(size * 4, textW + size * 1.6), h: textH + size * 1.1, lines };
  };
  const nodes = flattenTree(roots);
  const sizes = new Map(nodes.map((node) => [node.id, measure(node)]));
  const gapX = size * 1.4;
  const hasEdgeLabels = nodes.some((node) => node.edge);
  const rowHeights: number[] = [];
  for (const node of nodes) rowHeights[node.depth] = Math.max(rowHeights[node.depth] ?? 0, sizes.get(node.id)!.h);
  const rowGap = size * (hasEdgeLabels ? 4.2 : 3);
  const rowY: number[] = [];
  rowHeights.forEach((height, depth) => { rowY[depth] = depth === 0 ? height / 2 : rowY[depth - 1] + rowHeights[depth - 1] / 2 + rowGap + height / 2; });

  const place = (node: TreeNode, left: number): number => {
    const own = sizes.get(node.id)!;
    let width = own.w;
    let x = left + own.w / 2;
    if (node.children.length) {
      const childWidths: number[] = [];
      let cursor = left;
      // 자식들을 먼저 놓아 본 뒤, 부모가 더 넓으면 가운데로 옮겨 다시 놓습니다.
      for (const child of node.children) { const w = place(child, cursor); childWidths.push(w); cursor += w + gapX; }
      const total = childWidths.reduce((sum, w) => sum + w, 0) + gapX * (node.children.length - 1);
      if (own.w > total) {
        cursor = left + (own.w - total) / 2;
        node.children.forEach((child, index) => { place(child, cursor); cursor += childWidths[index] + gapX; });
      }
      width = Math.max(own.w, total);
      const first = boxes.get(node.children[0].id)!;
      const last = boxes.get(node.children[node.children.length - 1].id)!;
      x = (first.x + last.x) / 2;
    }
    boxes.set(node.id, { node, x, y: rowY[node.depth], w: own.w, h: own.h, lines: own.lines });
    return width;
  };
  let cursor = 0;
  for (const root of roots) cursor += place(root, cursor) + gapX * 2;
  const all = [...boxes.values()];
  const width = all.length ? Math.max(...all.map((box) => box.x + box.w / 2)) : 0;
  const height = all.length ? Math.max(...all.map((box) => box.y + box.h / 2)) : 0;
  return { boxes: all, width, height, lineHeight };
}

/* ───── 산점도 ───── */

export type DataPoint = { x: number; y: number; label: string };
export const MAX_POINTS = 300;
export const unlabeled = "데이터";

/** 한 줄에 "x, y, 이름"을 적은 데이터를 읽습니다. 이름이 없으면 한 무리로 봅니다. */
export function parsePoints(text: string) {
  const points: DataPoint[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (points.length >= MAX_POINTS) break;
    const parts = raw.trim().split(/\s*[,\t]\s*|\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    const x = parseNumber(parts[0]);
    const y = parseNumber(parts[1]);
    if (x === null || y === null) continue;
    points.push({ x, y, label: parts.slice(2).join(" ").slice(0, 16) || unlabeled });
  }
  return points;
}

export function parseQuery(text: string) {
  const parts = text.trim().split(/\s*[,\t]\s*|\s+/).filter(Boolean);
  const x = parseNumber(parts[0] ?? "");
  const y = parseNumber(parts[1] ?? "");
  return x === null || y === null ? null : { x, y };
}

export const pointClasses = (points: DataPoint[]) => [...new Set(points.map((point) => point.label))];

export function linearRegression(points: DataPoint[]) {
  if (points.length < 2) return null;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const sxx = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (sxx === 0) return null;
  const sxy = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const slope = sxy / sxx;
  return { slope, intercept: meanY - slope * meanX };
}

export function nearestNeighbors(points: DataPoint[], query: { x: number; y: number }, k: number) {
  const neighbors = points.map((point) => ({ point, distance: Math.hypot(point.x - query.x, point.y - query.y) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.min(k, points.length));
  const votes = new Map<string, number>();
  for (const { point } of neighbors) votes.set(point.label, (votes.get(point.label) ?? 0) + 1);
  const best = Math.max(0, ...votes.values());
  // 표가 같으면 더 가까운 이웃이 속한 무리로 정합니다.
  const prediction = neighbors.find(({ point }) => votes.get(point.label) === best)?.point.label ?? null;
  return { neighbors, votes: [...votes.entries()], prediction, radius: neighbors[neighbors.length - 1]?.distance ?? 0 };
}

/** k-평균 군집. 첫 점에서 시작해 가장 먼 점을 차례로 첫 중심으로 삼아 결과가 늘 같습니다. */
export function kMeans(points: DataPoint[], k: number, iterations: number) {
  const count = Math.min(k, points.length);
  if (!count) return { centroids: [], assignment: [], initial: [], converged: true, trails: [] as { x: number; y: number }[][] };
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const initial = [{ x: points[0].x, y: points[0].y }];
  while (initial.length < count) {
    let far = points[0];
    let farDistance = -1;
    for (const point of points) {
      const nearest = Math.min(...initial.map((centroid) => distance(point, centroid)));
      if (nearest > farDistance) { far = point; farDistance = nearest; }
    }
    initial.push({ x: far.x, y: far.y });
  }
  const assign = (centroids: { x: number; y: number }[]) => points.map((point) => {
    let best = 0;
    centroids.forEach((centroid, index) => { if (distance(point, centroid) < distance(point, centroids[best])) best = index; });
    return best;
  });
  let centroids = initial;
  const trails = initial.map((centroid) => [centroid]);
  let converged = false;
  for (let step = 0; step < iterations; step += 1) {
    const assignment = assign(centroids);
    const next = centroids.map((centroid, index) => {
      const members = points.filter((_, pointIndex) => assignment[pointIndex] === index);
      return members.length
        ? { x: members.reduce((sum, point) => sum + point.x, 0) / members.length, y: members.reduce((sum, point) => sum + point.y, 0) / members.length }
        : centroid;
    });
    converged = next.every((centroid, index) => distance(centroid, centroids[index]) < 1e-9);
    centroids = next;
    next.forEach((centroid, index) => trails[index].push(centroid));
    if (converged) break;
  }
  return { centroids, assignment: assign(centroids), initial, converged, trails };
}

/** 축 눈금을 1·2·5 단위로 고릅니다. */
export function niceTicks(min: number, max: number, target = 6) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((unit) => unit * power).find((value) => value >= raw) ?? power * 10;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) ticks.push(Number(value.toFixed(10)));
  return { min: start, max: end, step, ticks };
}

/* ───── 혼동 행렬 ───── */

export function confusionMetrics({ tp, fn, fp, tn }: ConfusionSettings) {
  const total = tp + fn + fp + tn;
  const ratio = (top: number, bottom: number) => bottom ? top / bottom : null;
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const f1 = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
  return { total, accuracy: ratio(tp + tn, total), precision, recall, f1 };
}

/** 예시 데이터: 두 무리로 모인 점을 만듭니다(같은 seed는 같은 점). */
export function sampleClusters(seed: number, labels: [string, string] = ["A", "B"], perClass = 10) {
  let state = (seed >>> 0) || 1;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  const gaussian = () => Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random());
  const centers: [number, number][] = [[2.5 + random() * 1.5, 2.5 + random() * 1.5], [6 + random() * 1.5, 6 + random() * 1.5]];
  const lines: string[] = [];
  centers.forEach(([cx, cy], index) => {
    for (let n = 0; n < perClass; n += 1) {
      const x = Math.min(10, Math.max(0, cx + gaussian() * 1.1));
      const y = Math.min(10, Math.max(0, cy + gaussian() * 1.1));
      lines.push(`${formatNumber(x, 1).replace("−", "-")}, ${formatNumber(y, 1).replace("−", "-")}, ${labels[index]}`);
    }
  });
  return lines.join("\n");
}

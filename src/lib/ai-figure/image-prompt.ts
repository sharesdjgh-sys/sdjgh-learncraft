import {
  activationInfo, confusionMetrics, figureKindInfo, flattenTree, formatNumber, kMeans, linearRegression, nearestNeighbors, parseOutline, parsePoints, parseQuery,
  perceptronResult, pointClasses, splitNames, visitOrder, type AiFigureDoc,
} from "./model";

/* AI 수업 그림을 GPT 이미지 모델로 다시 그리거나 새로 만들 때 보낼 설명(프롬프트)을 만듭니다.
   글자는 한국어로, 숫자·기호는 그림 설정 그대로 쓰도록 분명히 적습니다. */

export const imageStyles = [
  { id: "textbook", name: "교과서 삽화", prompt: "a clean, modern flat vector illustration in the style of a Korean high school textbook, soft harmonious colors, generous white space, thin consistent outlines" },
  { id: "infographic", name: "인포그래픽", prompt: "a polished educational infographic with simple icons, clear visual hierarchy, rounded shapes and a calm color palette" },
  { id: "lineart", name: "흑백 선화", prompt: "crisp black-and-white line art suitable for photocopied worksheets and exams, no color, no gray gradients, pure white background" },
  { id: "cartoon", name: "친근한 만화", prompt: "a friendly, cute cartoon illustration that engages teenage students, with simple characters and bright but not saturated colors" },
  { id: "render3d", name: "입체 3D", prompt: "a soft, clean 3D rendered illustration with gentle lighting and matte materials on a white background" },
] as const;
export type ImageStyle = (typeof imageStyles)[number]["id"];

export const imageSizes = {
  landscape: { name: "가로", normal: "1536x1024", large: "2048x1360" },
  square: { name: "정사각형", normal: "1024x1024", large: "2048x2048" },
  portrait: { name: "세로", normal: "1024x1536", large: "1360x2048" },
} as const;
export type ImageSize = keyof typeof imageSizes;
export type ImageMode = "figure" | "free";

export const MAX_IMAGE_REQUEST = 1000;

const list = (items: string[]) => items.map((item) => `"${item}"`).join(", ");

/** 그림 설정을 GPT가 정확히 따라 그릴 수 있게 글로 풀어 씁니다. */
export function describeFigure(doc: AiFigureDoc): string {
  const lines: string[] = [`Figure type: ${figureKindInfo[doc.kind].name} (${figureKindInfo[doc.kind].unit}).`];
  if (doc.title.trim()) lines.push(`Title shown at the top: "${doc.title.trim()}".`);

  if (doc.kind === "network") {
    const n = doc.network;
    const last = n.layers.length - 1;
    lines.push(`A fully connected feed-forward neural network with ${n.layers.length} layers, left to right: ${n.layers.map((count, index) => `${index === 0 ? "input layer" : index === last ? "output layer" : `hidden layer ${index}`} = ${count} nodes`).join(", ")}.`);
    lines.push("Every node is connected by a line to every node of the next layer, and there are no other connections.");
    if (n.layerTitles) lines.push(`Layer captions above each column in Korean: ${list(n.layers.map((_, index) => index === 0 ? "입력층" : index === last ? "출력층" : n.layers.length === 3 ? "은닉층" : `은닉층 ${index}`))}.`);
    const inputs = splitNames(n.inputNames).slice(0, n.layers[0]);
    const outputs = splitNames(n.outputNames).slice(0, n.layers[last]);
    if (inputs.length) lines.push(`Labels written next to the input nodes (top to bottom): ${list(inputs)}.`);
    if (outputs.length) lines.push(`Labels written next to the output nodes (top to bottom): ${list(outputs)}.`);
    if (n.symbols) lines.push("Input nodes contain x₁, x₂, … and output nodes contain y (or y₁, y₂, …).");
    if (n.hiddenSymbols) lines.push("Hidden nodes contain h₁, h₂, ….");
    if (n.bias) lines.push("Each non-output layer also has a small dashed bias node labeled +1 connected to the next layer.");
    if (n.arrows) lines.push("Connections are drawn as arrows pointing to the right.");
  } else if (doc.kind === "perceptron") {
    const p = doc.perceptron;
    const result = perceptronResult(p);
    lines.push(`A single perceptron (artificial neuron). Inputs on the left: ${p.inputs.map((input) => `${input.name}${input.value.trim() ? ` = ${input.value.trim()}` : ""} with weight ${input.weight.trim() || "w"}`).join("; ")}.`);
    lines.push(`Each input arrow points to a summation node Σ (가중합); a bias ${p.bias.trim() || "b"} also enters Σ from above. Then an activation function box (${activationInfo[p.activation].name}, ${activationInfo[p.activation].formula}) with a small plot of its curve, then the output node ${p.output || "y"}.`);
    if (result) lines.push(`Computed values: weighted sum z = ${formatNumber(result.sum)}, output ${p.output || "y"} = ${formatNumber(result.output)}.`);
  } else if (doc.kind === "tree") {
    const t = doc.tree;
    const roots = parseOutline(t.outline);
    lines.push(`A tree diagram drawn top-down with ${t.shape === "circle" ? "circular" : "rounded rectangular"} nodes. Indented outline (children are indented under their parent; [text] before a node is the branch label on the edge; * marks the goal node):`);
    lines.push(t.outline.split(/\r?\n/).filter((line) => line.trim()).slice(0, 63).join("\n"));
    if (t.order !== "none") {
      const visits = visitOrder(roots, t.order, t.stopAtGoal);
      const ordered = flattenTree(roots).filter((node) => visits.has(node.id)).sort((a, b) => visits.get(a.id)! - visits.get(b.id)!);
      lines.push(`Show the ${t.order === "bfs" ? "breadth-first" : "depth-first"} search visiting order as small numbered badges on the nodes: ${ordered.map((node, index) => `${index + 1}=${node.text}`).join(", ")}.`);
    }
  } else if (doc.kind === "scatter") {
    const d = doc.scatter;
    const points = parsePoints(d.points);
    const classes = pointClasses(points);
    lines.push(`A scatter plot with x-axis "${d.xLabel || "x"}" and y-axis "${d.yLabel || "y"}", ${points.length} data points${classes.length > 1 ? ` in ${classes.length} groups (${classes.map((label) => `${label}: ${points.filter((point) => point.label === label).length} points`).join(", ")})` : ""}.`);
    lines.push(`Data (x, y, group): ${points.slice(0, 40).map((point) => `(${point.x}, ${point.y}${classes.length > 1 ? `, ${point.label}` : ""})`).join(" ")}${points.length > 40 ? " …" : ""}`);
    const query = parseQuery(d.query);
    if (d.overlay === "knn" && query) {
      const knn = nearestNeighbors(points, query, d.k);
      lines.push(`k-nearest neighbors: a new data point (star) at (${query.x}, ${query.y}) with a dashed circle around its ${d.k} nearest neighbors; it is classified as "${knn.prediction}".`);
    }
    const line = d.overlay === "regression" ? linearRegression(points) : null;
    if (line) lines.push(`Linear regression line ŷ = ${formatNumber(line.slope)}x ${line.intercept < 0 ? "−" : "+"} ${formatNumber(Math.abs(line.intercept))}${d.residuals ? ", with dashed vertical residual lines from each point to the line" : ""}.`);
    if (d.overlay === "kmeans") lines.push(`k-means clustering with k = ${d.clusters}: points colored by cluster, cluster centers marked with a large X (${kMeans(points, d.clusters, d.iterations).centroids.map((point) => `(${formatNumber(point.x, 2)}, ${formatNumber(point.y, 2)})`).join(", ")}).`);
  } else if (doc.kind === "confusion") {
    const m = doc.confusion;
    const metrics = confusionMetrics(m);
    const percent = (value: number | null) => value === null ? "-" : `${formatNumber(value * 100, 1)}%`;
    lines.push(`A 2×2 confusion matrix. Columns = 예측 (predicted): "${m.positive}", "${m.negative}". Rows = 실제 (actual): "${m.positive}", "${m.negative}".`);
    lines.push(`Cells: TP (참 양성) = ${m.tp}, FN (거짓 음성) = ${m.fn}, FP (거짓 양성) = ${m.fp}, TN (참 음성) = ${m.tn}. Correct cells (TP, TN) are highlighted differently from wrong cells.`);
    if (m.metrics) lines.push(`Metrics below: 정확도 ${percent(metrics.accuracy)}, 정밀도 ${percent(metrics.precision)}, 재현율 ${percent(metrics.recall)}, F1 점수 ${percent(metrics.f1)}.`);
  } else {
    const a = doc.activation;
    lines.push(`Graphs of activation functions on x from −${a.range} to ${a.range}, ${a.layout === "overlay" ? "overlaid on one set of axes with a legend" : "each in its own small panel side by side"}: ${a.functions.map((kind) => `${activationInfo[kind].name} (${activationInfo[kind].formula})`).join("; ")}.`);
  }
  if (doc.mono) lines.push("The original is drawn in black and white for printing.");
  return lines.join("\n");
}

const commonRules = [
  "Audience: Korean high school students in the course '인공지능 기초' (Introduction to AI).",
  "All visible words must be in Korean unless they are math symbols, variable names or numbers. Spell every Korean word exactly as given.",
  "Text must be sharp, large enough to read when printed, and never distorted. Do not invent extra labels, captions, watermarks, signatures or logos.",
  "Use a plain white background unless the teacher asks otherwise.",
];

/** 서버가 GPT에 보낼 최종 설명. figure 모드는 첨부한 그림을 정확히 다시 그리고, free 모드는 선생님이 적은 장면을 새로 그립니다. */
export function buildImagePrompt({ mode, style, request, doc }: { mode: ImageMode; style: ImageStyle; request: string; doc?: AiFigureDoc | null }) {
  const look = imageStyles.find((item) => item.id === style) ?? imageStyles[0];
  const wish = request.trim().slice(0, MAX_IMAGE_REQUEST);
  const parts: string[] = [];
  if (mode === "figure" && doc) {
    parts.push(`Redraw the attached teacher's diagram as ${look.prompt}, at high resolution.`);
    parts.push("The attached image is the exact specification: keep the same structure, the same number of nodes/cells/points, the same connections, the same labels and numbers, and the same overall layout. Only improve the visual quality.");
    parts.push(`Specification of the diagram:\n${describeFigure(doc)}`);
    if (wish) parts.push(`Additional requests from the teacher (follow them unless they contradict the specification): ${wish}`);
  } else {
    parts.push(`Create ${look.prompt}, for a classroom slide or worksheet.`);
    parts.push(`What to draw (written by the teacher in Korean): ${wish}`);
    parts.push("Make the AI concept visually accurate; if the concept is technical, prefer a clear diagram-like composition over decoration.");
  }
  parts.push(commonRules.join("\n"));
  return parts.join("\n\n");
}

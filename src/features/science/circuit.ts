/* 물리학: 저항의 직렬·병렬 연결 회로를 분수로 정확히 풀고, 회로도(SVG)와 문제를 만듭니다. */
import { objectParticle } from "@/features/language-sheet";
import { escapeHtml, gcd, num, seededRandom, sheetTable, subDigits, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 분수 ───── */
export type Frac = { n: number; d: number };
const frac = (n: number, d = 1): Frac => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
const add = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);
const inv = (a: Frac) => frac(a.d, a.n);
export const fracValue = (a: Frac) => a.n / a.d;
/** 소수 둘째 자리 안에서 끝나는 값인지(분모가 2와 5로만 이루어지고 100을 나누는지) 봅니다. */
const tidy = (a: Frac) => 100 % a.d === 0;
/** 끝나는 소수면 소수로, 아니면 분수(약 소수)로 적습니다. */
export const fracText = (a: Frac) => tidy(a) ? num(fracValue(a)) : `${a.n}/${a.d} (≈${num(fracValue(a))})`;

/* ───── 회로 구조 ───── */
export type CircuitNode = { kind: "R"; index: number } | { kind: "series" | "parallel"; children: CircuitNode[] };
const R = (index: number): CircuitNode => ({ kind: "R", index });
const S = (...children: CircuitNode[]): CircuitNode => ({ kind: "series", children });
const P = (...children: CircuitNode[]): CircuitNode => ({ kind: "parallel", children });

export const topologies = {
  s2: { name: "직렬 2개", node: S(R(0), R(1)), count: 2 },
  p2: { name: "병렬 2개", node: P(R(0), R(1)), count: 2 },
  s3: { name: "직렬 3개", node: S(R(0), R(1), R(2)), count: 3 },
  p3: { name: "병렬 3개", node: P(R(0), R(1), R(2)), count: 3 },
  sp: { name: "R₁ + (R₂ ∥ R₃)", node: S(R(0), P(R(1), R(2))), count: 3 },
  ps: { name: "(R₁ + R₂) ∥ R₃", node: P(S(R(0), R(1)), R(2)), count: 3 },
  pp: { name: "(R₁ ∥ R₂) + (R₃ ∥ R₄)", node: S(P(R(0), R(1)), P(R(2), R(3))), count: 4 },
} as const;
export type TopologyKey = keyof typeof topologies;
export const topologyKeys = Object.keys(topologies) as TopologyKey[];

export type Circuit = { topology: TopologyKey; voltage: number; resistors: number[] };
export type ResistorResult = { index: number; r: number; v: Frac; i: Frac; p: Frac };
export type CircuitResult = { total: Frac; current: Frac; power: Frac; resistors: ResistorResult[] };

function equivalent(node: CircuitNode, values: number[]): Frac {
  if (node.kind === "R") return frac(values[node.index]);
  const parts = node.children.map(child => equivalent(child, values));
  return node.kind === "series" ? parts.reduce(add) : inv(parts.map(inv).reduce(add));
}
/** 전압 V가 걸린 부분 회로에서 저항마다 전압·전류를 나눠 줍니다. */
function distribute(node: CircuitNode, values: number[], voltage: Frac, out: ResistorResult[]) {
  if (node.kind === "R") {
    const r = frac(values[node.index]);
    const i = div(voltage, r);
    out.push({ index: node.index, r: values[node.index], v: voltage, i, p: mul(voltage, i) });
    return;
  }
  if (node.kind === "parallel") { node.children.forEach(child => distribute(child, values, voltage, out)); return; }
  const current = div(voltage, equivalent(node, values));
  node.children.forEach(child => distribute(child, values, mul(current, equivalent(child, values)), out));
}

export function solveCircuit(circuit: Circuit): CircuitResult {
  const node = topologies[circuit.topology].node;
  const total = equivalent(node, circuit.resistors);
  const current = div(frac(circuit.voltage), total);
  const resistors: ResistorResult[] = [];
  distribute(node, circuit.resistors, frac(circuit.voltage), resistors);
  resistors.sort((a, b) => a.index - b.index);
  return { total, current, power: mul(frac(circuit.voltage), current), resistors };
}

const RESISTORS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30];
const VOLTAGES = [3, 6, 9, 12, 18, 24, 30, 36];
/** 전류·전압·전력이 모두 소수 둘째 자리 안에서 끝나는 회로를 고릅니다. 같은 seed면 같은 회로입니다. */
export function randomCircuit(topology: TopologyKey, seed: number): Circuit {
  const random = seededRandom(seed);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  let fallback: Circuit | null = null;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const circuit: Circuit = { topology, voltage: pick(VOLTAGES), resistors: Array.from({ length: topologies[topology].count }, () => pick(RESISTORS)) };
    const result = solveCircuit(circuit);
    const values = [result.total, result.current, ...result.resistors.flatMap(item => [item.v, item.i])];
    fallback ??= circuit;
    // 한 자리 소수까지만 나오는 회로를 먼저 찾고, 전류가 너무 작거나 큰 회로는 뺍니다.
    if (values.every(value => 10 % value.d === 0) && fracValue(result.current) >= 0.2 && fracValue(result.current) <= 12) return circuit;
  }
  return fallback!;
}

/* ───── 회로도 ───── */
type Box = { w: number; h: number; draw: (x: number, y: number) => string };
const RES_W = 60;
const RES_H = 22;
const GAP = 26;
const ROW = 70;
const line = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="2"/>`;

function layout(node: CircuitNode, labels: string[]): Box {
  if (node.kind === "R") {
    const w = RES_W + GAP * 2;
    return {
      w, h: ROW,
      draw: (x, y) => line(x, y, x + GAP, y) + line(x + GAP + RES_W, y, x + w, y)
        + `<rect x="${x + GAP}" y="${y - RES_H / 2}" width="${RES_W}" height="${RES_H}" fill="#fff" stroke="#111" stroke-width="2"/>`
        + `<text x="${x + w / 2}" y="${y - RES_H / 2 - 7}" text-anchor="middle" font-size="13" fill="#111">${escapeHtml(labels[node.index])}</text>`,
    };
  }
  const boxes = node.children.map(child => layout(child, labels));
  if (node.kind === "series") {
    return {
      w: boxes.reduce((sum, box) => sum + box.w, 0), h: Math.max(...boxes.map(box => box.h)),
      draw: (x, y) => { let at = x; return boxes.map(box => { const svg = box.draw(at, y); at += box.w; return svg; }).join(""); },
    };
  }
  const inner = Math.max(...boxes.map(box => box.w));
  const w = inner + 24;
  const h = boxes.reduce((sum, box) => sum + box.h, 0);
  return {
    w, h,
    draw: (x, y) => {
      let top = y - h / 2;
      const mids: number[] = [];
      const parts = boxes.map(box => {
        const mid = top + box.h / 2;
        mids.push(mid);
        top += box.h;
        const left = x + 12 + (inner - box.w) / 2;
        return line(x + 12, mid, left, mid) + box.draw(left, mid) + line(left + box.w, mid, x + 12 + inner, mid);
      });
      return line(x, y, x + 12, y) + line(x + 12 + inner, y, x + w, y)
        + line(x + 12, mids[0], x + 12, mids[mids.length - 1]) + line(x + 12 + inner, mids[0], x + 12 + inner, mids[mids.length - 1])
        + `<circle cx="${x + 12}" cy="${y}" r="3" fill="#111"/><circle cx="${x + 12 + inner}" cy="${y}" r="3" fill="#111"/>`
        + parts.join("");
    },
  };
}

/** 저항 연결 위에 두고, 아래 도선 가운데에 전지(긴 선 +, 짧은 선 −)를 둔 회로도입니다. */
export function circuitSvg(circuit: Circuit, options: { values?: boolean } = {}) {
  const labels = circuit.resistors.map((value, index) => `R${subDigits(String(index + 1))}${options.values === false ? "" : ` = ${value} Ω`}`);
  const box = layout(topologies[circuit.topology].node, labels);
  const margin = 30;
  const width = box.w + margin * 2;
  const top = margin + box.h / 2;
  const bottom = margin + box.h + 40;
  const height = bottom + 34;
  const cx = width / 2;
  const left = margin;
  const right = margin + box.w;
  const battery = line(left, top, left, bottom) + line(right, top, right, bottom)
    + line(left, bottom, cx - 8, bottom) + line(cx + 8, bottom, right, bottom)
    + `<line x1="${cx - 8}" y1="${bottom - 16}" x2="${cx - 8}" y2="${bottom + 16}" stroke="#111" stroke-width="2"/>`
    + `<line x1="${cx + 8}" y1="${bottom - 8}" x2="${cx + 8}" y2="${bottom + 8}" stroke="#111" stroke-width="4"/>`
    + `<text x="${cx}" y="${bottom + 32}" text-anchor="middle" font-size="13" fill="#111">${options.values === false ? "V" : `${circuit.voltage} V`}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width:100%;height:auto;font-family:'Malgun Gothic',sans-serif"><rect width="${width}" height="${height}" fill="#fff"/>${box.draw(left, top)}${battery}</svg>`;
}

/* ───── 학습지 ───── */
export type CircuitAsk = "total" | "current" | "each" | "power";
export const circuitAsks: Record<CircuitAsk, string> = { total: "합성 저항", current: "전체 전류", each: "저항별 전압·전류", power: "소비 전력" };

const rName = (index: number) => `R${subDigits(String(index + 1))}`;
export function circuitProblem(circuit: Circuit, asks: CircuitAsk[]): SheetProblem {
  const result = solveCircuit(circuit);
  const questions: string[] = [];
  const answers: string[] = [];
  if (asks.includes("total")) { questions.push("합성 저항"); answers.push(`합성 저항 ${fracText(result.total)} Ω`); }
  if (asks.includes("current")) { questions.push("전체 전류"); answers.push(`전체 전류 ${fracText(result.current)} A`); }
  const each = asks.includes("each") || asks.includes("power");
  const head = ["저항", ...(asks.includes("each") ? ["전압(V)", "전류(A)"] : []), ...(asks.includes("power") ? ["소비 전력(W)"] : [])];
  const row = (item: ResistorResult, blank: boolean) => [`${rName(item.index)} (${item.r} Ω)`, ...(asks.includes("each") ? [blank ? "" : fracText(item.v), blank ? "" : fracText(item.i)] : []), ...(asks.includes("power") ? [blank ? "" : fracText(item.p)] : [])];
  const intro = `그림과 같이 전압이 ${circuit.voltage} V인 전원에 저항을 연결하였다.`;
  const ask = [questions.length ? `${objectParticle(questions.join("과 "))} 구하고` : "", each ? "표를 완성하시오" : ""].filter(Boolean).join(", ");
  return {
    html: `${intro} ${ask || "회로를 해석하시오"}.`,
    after: each ? sheetTable(head, result.resistors.map(item => row(item, true))) : undefined,
    text: `${intro} ${ask || "회로를 해석하시오"}. (저항: ${circuit.resistors.map((value, index) => `${rName(index)} ${value} Ω`).join(", ")}, 연결: ${topologies[circuit.topology].name})`,
    figure: circuitSvg(circuit),
    answerHtml: `${answers.join(", ")}${each ? sheetTable(head, result.resistors.map(item => row(item, false))) : ""}`,
    answerText: [...answers, ...(each ? result.resistors.map(item => row(item, false).join(" ")) : [])].join(" / "),
    space: questions.length && !each ? 16 : 4,
  };
}

export function circuitSheet(topologyList: TopologyKey[], count: number, asks: CircuitAsk[], seed: number): SheetSection[] {
  if (!topologyList.length) return [];
  const problems = Array.from({ length: count }, (_, index) => circuitProblem(randomCircuit(topologyList[index % topologyList.length], seed * 101 + index), asks));
  return [{ heading: "저항의 연결", problems }];
}

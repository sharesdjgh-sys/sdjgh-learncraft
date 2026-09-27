/* 공통수학 2 · 집합과 명제: 벤 다이어그램, 집합의 연산, 원소의 개수, 부분집합의 개수, 조건과 진리집합, 역·대우, 필요조건·충분조건입니다. */
import { escapeHtml, mathProblem, svgWrap, tex, type SheetSection } from "./core";
import { buildSections, josa, texAs, type Rng } from "./cm-util";
import { above, between, intervalTex, subsetOf, type IntervalSet } from "./cm-plane";

const t = tex;
/** 원소나열법 TeX: {1, 2, 3} (빈 집합은 ∅) */
export const setTex = (items: number[]) => items.length ? `\\{${[...items].sort((a, b) => a - b).join(",\\ ")}\\}` : "\\varnothing";
const setPlain = (items: number[]) => items.length ? `{${[...items].sort((a, b) => a - b).join(", ")}}` : "∅";
/** 중괄호가 texPlain에서 빠지지 않게 글 표기를 따로 붙입니다. */
export const setMath = (name: string, items: number[]) => texAs(`${name ? `${name}=` : ""}${setTex(items)}`, `${name ? `${name}=` : ""}${setPlain(items)}`);

/* ───── 조건(자연수) ───── */
export type Rule = { kind: "multiple" | "divisor" | "odd" | "even" | "prime" | "atMost" | "atLeast"; k: number };
const isPrime = (n: number) => { if (n < 2) return false; for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false; return true; };
export const ruleTest = (rule: Rule) => (x: number) => rule.kind === "multiple" ? x % rule.k === 0 : rule.kind === "divisor" ? rule.k % x === 0 : rule.kind === "odd" ? x % 2 === 1 : rule.kind === "even" ? x % 2 === 0 : rule.kind === "prime" ? isPrime(x) : rule.kind === "atMost" ? x <= rule.k : x >= rule.k;
export const ruleText = (rule: Rule) => rule.kind === "multiple" ? `${rule.k}의 배수` : rule.kind === "divisor" ? `${rule.k}의 약수` : rule.kind === "odd" ? "홀수" : rule.kind === "even" ? "짝수" : rule.kind === "prime" ? "소수" : rule.kind === "atMost" ? `${rule.k} 이하의 수` : `${rule.k} 이상의 수`;
export const universe = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
export const truthSet = (rule: Rule, n: number) => universe(n).filter(ruleTest(rule));
export const union = (a: number[], b: number[]) => [...new Set([...a, ...b])].sort((x, y) => x - y);
export const intersection = (a: number[], b: number[]) => a.filter(x => b.includes(x));
export const difference = (a: number[], b: number[]) => a.filter(x => !b.includes(x));
export const complement = (a: number[], n: number) => universe(n).filter(x => !a.includes(x));
export const isSubset = (a: number[], b: number[]) => a.every(x => b.includes(x));

/** 벤 다이어그램(집합 2개 또는 3개). 원소를 들어가는 칸에 적습니다. */
export function vennSvg(sets: { name: string; items: number[] }[], all: number[], options: { hideItems?: boolean; shade?: (inside: boolean[]) => boolean } = {}) {
  const width = 360;
  const height = sets.length === 3 ? 280 : 210;
  const centers = sets.length === 3 ? [[140, 115], [220, 115], [180, 180]] : [[145, 108], [215, 108]];
  const radius = sets.length === 3 ? 72 : 74;
  const regionOf = (x: number) => sets.map(set => set.items.includes(x));
  const parts: string[] = [`<rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="none" stroke="#111" stroke-width="1.4"/>`, `<text x="18" y="28" font-size="12" font-weight="700">U</text>`];
  // 색칠: 칸마다 판정해 작은 격자 점으로 채웁니다(겹친 영역도 정확하게).
  if (options.shade) {
    const dots: string[] = [];
    for (let x = 12; x < width - 10; x += 5) for (let y = 12; y < height - 10; y += 5) {
      const inside = centers.map(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2);
      if (options.shade(inside)) dots.push(`<rect x="${x - 2.5}" y="${y - 2.5}" width="5" height="5"/>`);
    }
    parts.push(`<g fill="#fde68a">${dots.join("")}</g>`);
  }
  centers.forEach(([cx, cy], i) => parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${["#2563eb", "#dc2626", "#16a34a"][i]}" stroke-width="2"/>`));
  const labels = sets.length === 3 ? [[70, 60], [290, 60], [180, 272]] : [[78, 50], [282, 50]];
  sets.forEach((set, i) => parts.push(`<text x="${labels[i][0]}" y="${labels[i][1]}" font-size="14" font-weight="700" fill="${["#2563eb", "#dc2626", "#16a34a"][i]}" text-anchor="middle">${escapeHtml(set.name)}</text>`));
  if (!options.hideItems) {
    // 칸마다 원소를 모아 칸 가운데 부근에 줄지어 적습니다.
    const spots: Record<string, [number, number]> = sets.length === 3
      ? { "100": [112, 95], "010": [248, 95], "001": [180, 220], "110": [180, 88], "101": [140, 160], "011": [220, 160], "111": [180, 135], "000": [300, 250] }
      : { "10": [112, 108], "01": [248, 108], "11": [180, 108], "00": [300, 185] };
    const groups = new Map<string, number[]>();
    for (const x of all) { const key = regionOf(x).map(Number).join(""); groups.set(key, [...(groups.get(key) ?? []), x]); }
    for (const [key, items] of groups) {
      const [sx, sy] = spots[key];
      const perRow = key.includes("1") && key !== "111" ? 3 : 4;
      items.forEach((x, i) => parts.push(`<text x="${sx + ((i % perRow) - (Math.min(items.length, perRow) - 1) / 2) * 17}" y="${sy + Math.floor(i / perRow) * 15 - ((Math.ceil(items.length / perRow) - 1) * 15) / 2}" font-size="12" text-anchor="middle" fill="#111">${x}</text>`));
    }
  }
  return svgWrap(width, height, parts.join(""));
}

/* ───── 실수 조건(필요·충분조건) ───── */
export type RealCondition = { set: IntervalSet; tex: string };
/** 충분·필요·필요충분·둘 다 아님이 고르게 나오는 두 조건 */
function conditionPair(r: Rng): { p: RealCondition; q: RealCondition } {
  const target = r.pick(["sufficient", "necessary", "both", "neither"] as const);
  const a = r.int(-3, 3);
  const k = r.int(1, 3);
  const abs = (center: number, radius: number): RealCondition => ({ set: [between(center - radius, center + radius, false, false)], tex: `|x${center < 0 ? `+${-center}` : center === 0 ? "" : `-${center}`}|<${radius}` });
  const range = (lo: number, hi: number): RealCondition => ({ set: [between(lo, hi, false, false)], tex: `${lo}<x<${hi}` });
  const over = (value: number): RealCondition => ({ set: [above(value, false)], tex: `x>${value}` });
  if (target === "both") return { p: abs(a, k), q: range(a - k, a + k) };
  // 겹치지만 서로 포함하지 않는 두 구간
  if (target === "neither") return r.random() < 0.5 ? { p: range(a, a + k + 1), q: range(a + 1, a + k + 3) } : { p: abs(a, k), q: over(a) };
  // p ⊂ q (충분조건) 또는 q ⊂ p (필요조건)
  const small = r.random() < 0.5 ? abs(a, k) : range(a - k, a + k - 1);
  const big = r.random() < 0.5 ? over(a - k - r.int(1, 2)) : range(a - k - 1, a + k + 1);
  return target === "sufficient" ? { p: small, q: big } : { p: big, q: small };
}

/** 진리집합의 포함 관계(P ⊂ Q, Q ⊂ P)로 p가 q이기 위한 어떤 조건인지 정합니다. */
export const conditionName = (pq: boolean, qp: boolean) => pq && qp ? "필요충분조건" : pq ? "충분조건" : qp ? "필요조건" : "필요조건도 충분조건도 아니다";
export const conditionKind = (p: IntervalSet, q: IntervalSet) => conditionName(subsetOf(p, q), subsetOf(q, p));
export const conditionKindSets = (p: number[], q: number[]) => conditionName(isSubset(p, q), isSubset(q, p));

/* ───── 문제 ───── */
export type SetAsk = "list" | "operation" | "count" | "subsets";
export const setAsks: Record<SetAsk, string> = { list: "조건제시법 → 원소나열법", operation: "합집합·교집합·차집합·여집합", count: "원소의 개수 n(A∪B)", subsets: "부분집합의 개수" };
export type LogicAsk = "truth" | "converse" | "condition";
export const logicAsks: Record<LogicAsk, string> = { truth: "조건과 진리집합", converse: "역·대우의 참·거짓", condition: "필요조건·충분조건" };

const RULES: Rule[] = [
  ...[2, 3, 4, 5, 6].map((k): Rule => ({ kind: "multiple", k })),
  ...[12, 16, 18, 20, 24].map((k): Rule => ({ kind: "divisor", k })),
  { kind: "odd", k: 0 }, { kind: "even", k: 0 }, { kind: "prime", k: 0 },
];
const pickRule = (r: Rng, avoid?: Rule) => { for (;;) { const rule = r.pick(RULES); if (!avoid || ruleText(rule) !== ruleText(avoid)) return rule; } };

function makeSet(ask: SetAsk, r: Rng) {
  if (ask === "list") {
    const rule = pickRule(r);
    const n = r.pick([10, 12, 15, 20]);
    const items = rule.kind === "divisor" ? truthSet(rule, rule.k) : truthSet(rule, n);
    const condition = rule.kind === "divisor" ? `\\{x\\mid x\\text{는 ${ruleText(rule)}}\\}` : `\\{x\\mid x\\text{는 ${n} 이하의 자연수인 ${ruleText(rule)}}\\}`;
    const plain = rule.kind === "divisor" ? `{x | x는 ${ruleText(rule)}}` : `{x | x는 ${n} 이하의 자연수인 ${ruleText(rule)}}`;
    return mathProblem(`다음 집합을 원소나열법으로 나타내시오. ${texAs(condition, plain)}`, `${setMath("", items)} (원소 ${items.length}개)`, { space: 8 });
  }
  if (ask === "operation") {
    const n = r.pick([10, 12]);
    const ruleA = pickRule(r);
    const ruleB = pickRule(r, ruleA);
    const [A, B] = [truthSet(ruleA, n), truthSet(ruleB, n)];
    const op = r.pick(["cup", "cap", "minus", "comp"] as const);
    const result = op === "cup" ? union(A, B) : op === "cap" ? intersection(A, B) : op === "minus" ? difference(A, B) : complement(union(A, B), n);
    const opTex = op === "cup" ? "A\\cup B" : op === "cap" ? "A\\cap B" : op === "minus" ? "A-B" : "(A\\cup B)^{C}";
    return mathProblem(`전체집합 ${setMath("U", universe(n))}의 두 부분집합 ${t("A, B")}가 ${t("A")}는 ${ruleText(ruleA)}, ${t("B")}는 ${ruleText(ruleB)}의 집합일 때, ${texAs(opTex, op === "comp" ? "(A∪B)ᶜ" : op === "cup" ? "A∪B" : op === "cap" ? "A∩B" : "A−B")}를 구하시오.`,
      `${setMath("", result)} (${setMath("A", A)}, ${setMath("B", B)})`, { space: 10, answerFigure: vennSvg([{ name: "A", items: A }, { name: "B", items: B }], universe(n), { shade: ([a, b]) => op === "cup" ? a || b : op === "cap" ? a && b : op === "minus" ? a && !b : !(a || b) }) });
  }
  if (ask === "count") {
    const [a, b] = [r.int(8, 25), r.int(8, 25)];
    const both = r.int(2, Math.min(a, b) - 1);
    if (r.random() < 0.5) return mathProblem(`두 집합 ${t("A, B")}에 대하여 ${t(`n(A)=${a},\\ n(B)=${b},\\ n(A\\cap B)=${both}`)}일 때, ${t("n(A\\cup B)")}를 구하시오.`, `${a + b - both} (${t(`n(A\\cup B)=n(A)+n(B)-n(A\\cap B)=${a}+${b}-${both}`)})`, { space: 10 });
    return mathProblem(`어느 반 학생 중 수학을 좋아하는 학생은 ${a}명, 영어를 좋아하는 학생은 ${b}명, 둘 중 하나 이상을 좋아하는 학생은 ${a + b - both}명이다. 두 과목을 모두 좋아하는 학생 수를 구하시오.`, `${both}명 (${t(`n(A\\cap B)=${a}+${b}-${a + b - both}`)})`, { space: 10 });
  }
  const n = r.int(3, 6);
  const items = universe(n);
  const kind = r.pick(["all", "include", "proper"] as const);
  if (kind === "all") return mathProblem(`집합 ${setMath("A", items)}의 부분집합의 개수를 구하시오.`, `${2 ** n} (${t(`2^{${n}}`)})`, { space: 8 });
  if (kind === "proper") return mathProblem(`집합 ${setMath("A", items)}의 진부분집합의 개수를 구하시오.`, `${2 ** n - 1} (${t(`2^{${n}}-1`)})`, { space: 8 });
  const [inc, exc] = [r.int(1, 2), r.int(0, 1)];
  const incItems = items.slice(0, inc);
  const excItems = items.slice(inc, inc + exc);
  return mathProblem(`집합 ${setMath("A", items)}의 부분집합 중 ${incItems.join(", ")}${josa(incItems.join(", "), "을")} 반드시 원소로 갖${exc ? `고 ${excItems.join(", ")}${josa(excItems.join(", "), "은")} 원소로 갖지 않는` : "는"} 부분집합의 개수를 구하시오.`, `${2 ** (n - inc - exc)} (${t(`2^{${n}-${inc + exc}}`)})`, { space: 8 });
}

function makeLogic(ask: LogicAsk, r: Rng) {
  const n = 10;
  if (ask === "truth") {
    const rule = pickRule(r);
    return mathProblem(`전체집합 ${setMath("U", universe(n))}에서 조건 ${t("p")}: ${t("x")}는 ${ruleText(rule)}일 때, 조건 ${t("p")}와 ${t("\\sim p")}의 진리집합을 각각 구하시오.`,
      `${setMath("P", truthSet(rule, n))}, ${texAs(`P^{C}=${setTex(complement(truthSet(rule, n), n))}`, `Pᶜ=${setPlain(complement(truthSet(rule, n), n))}`)}`, { space: 10 });
  }
  if (ask === "converse") {
    // p → q (정수 조건): 원래 명제·역·대우의 참·거짓
    const pairs: [Rule, Rule][] = [[{ kind: "multiple", k: 4 }, { kind: "even", k: 0 }], [{ kind: "multiple", k: 6 }, { kind: "multiple", k: 3 }], [{ kind: "divisor", k: 6 }, { kind: "divisor", k: 12 }], [{ kind: "prime", k: 0 }, { kind: "odd", k: 0 }], [{ kind: "multiple", k: 2 }, { kind: "multiple", k: 4 }], [{ kind: "divisor", k: 8 }, { kind: "even", k: 0 }]];
    const [p, q] = r.pick(pairs);
    const P = truthSet(p, 20);
    const Q = truthSet(q, 20);
    const original = isSubset(P, Q);
    const converse = isSubset(Q, P);
    const truth = (value: boolean) => value ? "참" : "거짓";
    const why = (from: number[], to: number[]) => { const bad = from.find(x => !to.includes(x)); return bad === undefined ? "" : ` (반례 ${t(`x=${bad}`)})`; };
    return mathProblem(`${t("x")}는 20 이하의 자연수일 때, 명제 ‘${t("x")}가 ${ruleText(p)}이면 ${t("x")}는 ${ruleText(q)}이다.’의 참·거짓과, 그 역과 대우의 참·거짓을 각각 판별하시오.`,
      `명제 ${truth(original)}${why(P, Q)}, 역 ${truth(converse)}${why(Q, P)}, 대우 ${truth(original)} (대우는 원래 명제와 참·거짓이 같다)`, { space: 12 });
  }
  // 필요·충분조건(실수 조건): 네 경우가 고르게 나오도록 q를 p에서 만듭니다.
  const { p, q } = conditionPair(r);
  const kind = conditionKind(p.set, q.set);
  return mathProblem(`실수 ${t("x")}에 대한 두 조건 ${t(`p:\\ ${p.tex}`)}, ${t(`q:\\ ${q.tex}`)}에서 ${t("p")}는 ${t("q")}이기 위한 무슨 조건인지 말하시오.`,
    `${kind} (${t(`P:\\ ${intervalTex(p.set)}`)}, ${t(`Q:\\ ${intervalTex(q.set)}`)}${kind === "충분조건" ? `, ${t("P\\subset Q")}` : kind === "필요조건" ? `, ${t("Q\\subset P")}` : kind === "필요충분조건" ? `, ${t("P=Q")}` : ""})`, { space: 12 });
}

export function setProblems(asks: SetAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, setAsks, count, seed, makeSet); }
export function logicProblems(asks: LogicAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, logicAsks, count, seed, makeLogic); }
export { setPlain, RULES };

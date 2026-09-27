/* 대수 Ⅲ: 수열(등차·등비수열, 중항, Σ, 부분분수, 귀납적 정의, 수학적 귀납법)입니다. 값은 분수(Q)로 정확히 계산합니다. */
import { intIn, nonZeroIn, pickOf } from "./calc-base";
import { mathProblem, plotSvg, q, qAdd, qDiv, qMul, qNum, qSub, qTex, seededRandom, tex, type Q, type SheetProblem, type SheetSection } from "./core";

export type SeqKind = "arith" | "geo";
export type SeqSetup = { kind: SeqKind; first: number; step: number; n: number };
export const DEFAULT_SEQ: SeqSetup = { kind: "arith", first: 3, step: 4, n: 10 };
const Qn = (value: number) => q(Math.round(value * 1000), 1000);

/** 처음 count개 항 */
export function seqTerms(setup: SeqSetup, count: number): Q[] {
  const out: Q[] = [];
  let term = Qn(setup.first);
  for (let i = 0; i < count; i += 1) { out.push(term); term = setup.kind === "arith" ? qAdd(term, Qn(setup.step)) : qMul(term, Qn(setup.step)); }
  return out;
}
export const seqNth = (setup: SeqSetup, n: number) => seqTerms(setup, n)[n - 1];
export const seqSum = (setup: SeqSetup, n: number) => seqTerms(setup, n).reduce((acc, term) => qAdd(acc, term), q(0));
/** 일반항 TeX: aₙ = 4n − 1, aₙ = 3·2ⁿ⁻¹ */
export function generalTex(setup: SeqSetup) {
  const a = Qn(setup.first); const d = Qn(setup.step);
  if (setup.kind === "arith") {
    const constant = qSub(a, d);
    const coefficient = d.n === 0 ? "" : `${d.d === 1 && Math.abs(d.n) === 1 ? (d.n < 0 ? "-" : "") : qTex(d)}n`;
    const tail = constant.n === 0 ? "" : `${constant.n > 0 && coefficient ? "+" : ""}${qTex(constant)}`;
    return `a_{n}=${coefficient}${tail || (coefficient ? "" : "0")}`;
  }
  const ratio = qTex(d);
  const wrapped = d.n < 0 || d.d !== 1 ? `\\left(${ratio}\\right)` : ratio;
  return `a_{n}=${qNum(a) === 1 ? "" : `${qTex(a)}\\cdot `}${wrapped}^{n-1}`;
}
/** 합의 공식 TeX */
export const sumFormulaTex = (kind: SeqKind) => kind === "arith" ? "S_{n}=\\frac{n\\{2a+(n-1)d\\}}{2}" : "S_{n}=\\frac{a(r^{n}-1)}{r-1}\\ (r\\ne1)";
/** 항을 점으로 그린 그래프 */
export function seqSvg(setup: SeqSetup, count = 10) {
  const terms = seqTerms(setup, count).map(qNum);
  const low = Math.min(0, ...terms); const high = Math.max(0, ...terms);
  const pad = (high - low || 1) * 0.12;
  return plotSvg({ xLabel: "n", yLabel: "aₙ", xMin: 0, xMax: count + 1, yMin: low - pad, yMax: high + pad, xStep: count > 12 ? 2 : 1, width: 420, height: 260, dots: terms.map((value, index) => ({ at: [index + 1, value], r: 3.6, color: "#2563eb" })) });
}

/** Σ_{k=1}^{n} (p k² + r k + s) 의 값 */
export const sigmaQuadratic = (p: number, r: number, s: number, n: number) => q(p * (n * (n + 1) * (2 * n + 1)) / 6 + r * (n * (n + 1)) / 2 + s * n);

/** 귀납적으로 정의된 수열 aₙ₊₁ = p·aₙ + (r·n + s) 의 처음 몇 항 */
export type Recurrence = { first: number; p: number; r: number; s: number };
export const DEFAULT_RECURRENCE: Recurrence = { first: 1, p: 2, r: 0, s: 1 };
export function recurrenceTerms(rule: Recurrence, count: number): Q[] {
  const out = [Qn(rule.first)];
  for (let n = 1; n < count; n += 1) out.push(qAdd(qMul(Qn(rule.p), out[n - 1]), Qn(rule.r * n + rule.s)));
  return out;
}
export function recurrenceTex(rule: Recurrence) {
  const p = rule.p === 1 ? "" : rule.p === -1 ? "-" : String(rule.p);
  const tailParts: string[] = [];
  if (rule.r) tailParts.push(`${rule.r > 0 ? "+" : "-"}${Math.abs(rule.r) === 1 ? "" : Math.abs(rule.r)}n`);
  if (rule.s) tailParts.push(`${rule.s > 0 ? "+" : "-"}${Math.abs(rule.s)}`);
  return `a_{1}=${rule.first},\\ a_{n+1}=${rule.p === 0 ? "" : `${p}a_{n}`}${rule.p === 0 ? tailParts.join("").replace(/^\+/, "") || "0" : tailParts.join("")}\\ (n=1,2,3,\\cdots)`;
}

/* ───── 수학적 귀납법 증명 틀 ───── */
export type InductionProof = { id: string; claim: string; steps: { text: string; blank?: string }[] };
/** 빈칸 (가)·(나)·(다)… 이 있는 증명입니다. text 안의 {} 자리에 blank가 들어갑니다. */
export const INDUCTIONS: InductionProof[] = [
  { id: "sum", claim: "1+2+3+\\cdots+n=\\frac{n(n+1)}{2}", steps: [
    { text: "(i) n = 1일 때, (좌변) = 1, (우변) = {} 이므로 성립한다.", blank: "\\frac{1\\times2}{2}=1" },
    { text: "(ii) n = k일 때 성립한다고 가정하면 1+2+⋯+k = \\frac{k(k+1)}{2} 이다. 양변에 {}를 더하면", blank: "k+1" },
    { text: "1+2+⋯+k+(k+1) = \\frac{k(k+1)}{2}+(k+1) = {} 이므로 n = k+1일 때도 성립한다.", blank: "\\frac{(k+1)(k+2)}{2}" },
  ] },
  { id: "odd", claim: "1+3+5+\\cdots+(2n-1)=n^{2}", steps: [
    { text: "(i) n = 1일 때, (좌변) = 1, (우변) = {} 이므로 성립한다.", blank: "1^{2}=1" },
    { text: "(ii) n = k일 때 성립한다고 가정하면 1+3+⋯+(2k−1) = k^{2} 이다. 양변에 {}를 더하면", blank: "2k+1" },
    { text: "1+3+⋯+(2k−1)+(2k+1) = k^{2}+2k+1 = {} 이므로 n = k+1일 때도 성립한다.", blank: "(k+1)^{2}" },
  ] },
  { id: "square", claim: "1^{2}+2^{2}+\\cdots+n^{2}=\\frac{n(n+1)(2n+1)}{6}", steps: [
    { text: "(i) n = 1일 때, (좌변) = 1, (우변) = {} 이므로 성립한다.", blank: "\\frac{1\\times2\\times3}{6}=1" },
    { text: "(ii) n = k일 때 성립한다고 가정하고 양변에 {}을 더하면", blank: "(k+1)^{2}" },
    { text: "(우변) = \\frac{k(k+1)(2k+1)}{6}+(k+1)^{2} = \\frac{k+1}{6}\\times {} = \\frac{(k+1)(k+2)(2k+3)}{6} 이므로 n = k+1일 때도 성립한다.", blank: "(2k^{2}+7k+6)" },
  ] },
];
// 수식 부분만 KaTeX로: "\\"가 든 조각이나 ^·_가 든 조각을 수식으로 그립니다.
const mathInline = (text: string) => text.split(/(\s+)/).map(piece => /\\|\^|_|[=≥]/.test(piece) && !/[가-힣]/.test(piece) ? tex(piece) : piece.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]!)).join("");
const BLANKS = ["(가)", "(나)", "(다)", "(라)"];
export function inductionHtml(proof: InductionProof, withBlanks = true) {
  let blank = 0;
  return proof.steps.map(step => {
    const [before, after] = step.text.split("{}");
    const fill = step.blank === undefined ? "" : withBlanks ? `<b>${BLANKS[blank++]}</b>` : tex(step.blank);
    return `<div style="margin:0.6mm 0">${mathInline(before)}${after === undefined ? "" : `${fill}${mathInline(after)}`}</div>`;
  }).join("");
}

/* ───── 문제 ───── */
export type SeqAsk = "arith" | "geo" | "mean" | "sum" | "sigma" | "partial" | "recursive" | "induction";
export const seqAsks: Record<SeqAsk, string> = { arith: "등차수열", geo: "등비수열", mean: "등차·등비중항", sum: "수열의 합", sigma: "Σ의 계산", partial: "부분분수", recursive: "귀납적 정의", induction: "수학적 귀납법" };

export function seqProblems(asks: SeqAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 73 + 31);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 14) => problems.push(mathProblem(html, answer, { space }));
  let proofIndex = Math.floor(random() * INDUCTIONS.length);
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "arith") {
      const a = intIn(random, -5, 9); const d = nonZeroIn(random, -4, 6);
      const m = intIn(random, 2, 4); const k = m + intIn(random, 3, 6); const n = intIn(random, 10, 20);
      const setup: SeqSetup = { kind: "arith", first: a, step: d, n };
      add(`등차수열 ${tex("\\{a_{n}\\}")}에서 ${tex(`a_{${m}}=${qTex(seqNth(setup, m))},\\ a_{${k}}=${qTex(seqNth(setup, k))}`)}일 때, 일반항 ${tex("a_{n}")}과 ${tex(`a_{${n}}`)}을 구하시오.`,
        `${tex(generalTex(setup))}, ${tex(`a_{${n}}=${qTex(seqNth(setup, n))}`)} &nbsp;(공차 ${tex(`d=\\frac{a_{${k}}-a_{${m}}}{${k - m}}=${d}`)})`);
    } else if (ask === "geo") {
      const a = pickOf(random, [1, 2, 3, -2, 5]); const r = pickOf(random, [2, 3, -2, -3]);
      const m = intIn(random, 1, 2); const k = m + intIn(random, 2, 3); const n = intIn(random, 6, 8);
      const setup: SeqSetup = { kind: "geo", first: a, step: r, n };
      // 지수가 짝수이면 공비가 ±로 두 개 나오므로 aₘ₊₁의 부호를 함께 줍니다.
      add(`등비수열 ${tex("\\{a_{n}\\}")}에서 ${tex(`a_{${m}}=${qTex(seqNth(setup, m))},\\ a_{${k}}=${qTex(seqNth(setup, k))}`)}${(k - m) % 2 === 0 ? `, ${tex(`a_{${m + 1}}${qNum(seqNth(setup, m + 1)) > 0 ? ">" : "<"}0`)}` : ""}일 때, 공비 ${tex("r")}와 ${tex(`a_{${n}}`)}을 구하시오.`,
        `${tex(`r=${r},\\ a_{${n}}=${qTex(seqNth(setup, n))}`)} &nbsp;(${tex(`r^{${k - m}}=\\frac{a_{${k}}}{a_{${m}}}=${qTex(qDiv(seqNth(setup, k), seqNth(setup, m)))}`)})`);
    } else if (ask === "mean") {
      if (random() < 0.5) {
        const a = intIn(random, -3, 8); const d = nonZeroIn(random, 1, 6);
        add(`세 수 ${tex(`${a},\\ x,\\ ${a + 2 * d}`)}가 이 순서대로 등차수열을 이룰 때, ${tex("x")}의 값을 구하시오.`, `${tex(`x=${a + d}`)} &nbsp;(등차중항 ${tex(`2x=${a}+${a + 2 * d}`)})`, 8);
      } else {
        const a = pickOf(random, [1, 2, 3, 4]); const r = pickOf(random, [2, 3, 4]);
        add(`세 양수 ${tex(`${a},\\ x,\\ ${a * r * r}`)}가 이 순서대로 등비수열을 이룰 때, ${tex("x")}의 값을 구하시오.`, `${tex(`x=${a * r}`)} &nbsp;(등비중항 ${tex(`x^{2}=${a}\\times${a * r * r}`)})`, 8);
      }
    } else if (ask === "sum") {
      if (random() < 0.5) {
        const a = intIn(random, -5, 9); const d = nonZeroIn(random, -3, 5); const n = intIn(random, 10, 20);
        const setup: SeqSetup = { kind: "arith", first: a, step: d, n };
        add(`첫째항이 ${tex(String(a))}이고 공차가 ${tex(String(d))}인 등차수열의 첫째항부터 제${n}항까지의 합을 구하시오.`, `${tex(qTex(seqSum(setup, n)))} &nbsp;(${tex(`S_{${n}}=\\frac{${n}\\{2\\times(${a})+${n - 1}\\times(${d})\\}}{2}`)})`);
      } else {
        const a = pickOf(random, [1, 2, 3]); const r = pickOf(random, [2, 3, -2]); const n = intIn(random, 5, 8);
        const setup: SeqSetup = { kind: "geo", first: a, step: r, n };
        add(`첫째항이 ${tex(String(a))}이고 공비가 ${tex(String(r))}인 등비수열의 첫째항부터 제${n}항까지의 합을 구하시오.`, `${tex(qTex(seqSum(setup, n)))} &nbsp;(${tex(`S_{${n}}=\\frac{${a}\\{(${r})^{${n}}-1\\}}{${r}-1}`)})`);
      }
    } else if (ask === "sigma") {
      const p = pickOf(random, [0, 1, 2, 3]); const r = intIn(random, -3, 4); const s = intIn(random, -3, 5); const n = pickOf(random, [5, 8, 10, 12]);
      const body = `${p ? `${p === 1 ? "" : p}k^{2}` : ""}${r ? `${r > 0 && p ? "+" : r < 0 ? "-" : ""}${Math.abs(r) === 1 ? "" : Math.abs(r)}k` : ""}${s ? `${s > 0 && (p || r) ? "+" : s < 0 ? "-" : ""}${Math.abs(s)}` : ""}` || "1";
      const value = body === "1" ? q(n) : sigmaQuadratic(p, r, s, n);
      add(`다음 값을 구하시오. ${tex(`\\sum_{k=1}^{${n}}(${body})`)}`, `${tex(qTex(value))} &nbsp;(${tex("\\sum_{k=1}^{n}k=\\frac{n(n+1)}{2},\\ \\sum_{k=1}^{n}k^{2}=\\frac{n(n+1)(2n+1)}{6}")})`);
    } else if (ask === "partial") {
      const n = pickOf(random, [5, 9, 10, 15, 19, 20]);
      if (random() < 0.5) {
        const value = q(n, n + 1);
        add(`다음 값을 구하시오. ${tex(`\\sum_{k=1}^{${n}}\\frac{1}{k(k+1)}`)}`, `${tex(qTex(value))} &nbsp;(${tex("\\frac{1}{k(k+1)}=\\frac{1}{k}-\\frac{1}{k+1}")})`);
      } else {
        const value = q(n, 2 * n + 1);
        add(`다음 값을 구하시오. ${tex(`\\sum_{k=1}^{${n}}\\frac{1}{(2k-1)(2k+1)}`)}`, `${tex(qTex(value))} &nbsp;(${tex("\\frac{1}{(2k-1)(2k+1)}=\\frac{1}{2}\\left(\\frac{1}{2k-1}-\\frac{1}{2k+1}\\right)")})`);
      }
    } else if (ask === "recursive") {
      const rule: Recurrence = pickOf(random, [{ first: 1, p: 2, r: 0, s: 1 }, { first: 2, p: 1, r: 2, s: 0 }, { first: 1, p: 3, r: 0, s: -1 }, { first: 3, p: 1, r: 1, s: 1 }, { first: 1, p: -1, r: 0, s: 3 }, { first: 2, p: 2, r: 0, s: -1 }]);
      const n = intIn(random, 5, 6);
      const terms = recurrenceTerms(rule, n);
      add(`수열 ${tex("\\{a_{n}\\}")}이 ${tex(recurrenceTex(rule))}로 정의될 때, ${tex(`a_{${n}}`)}의 값을 구하시오.`, `${tex(qTex(terms[n - 1]))} &nbsp;(${tex(terms.map((term, at) => `a_{${at + 1}}=${qTex(term)}`).join(",\\ "))})`);
    } else {
      const proof = INDUCTIONS[proofIndex % INDUCTIONS.length];
      proofIndex += 1;
      const blanks = proof.steps.filter(step => step.blank !== undefined).map(step => step.blank!);
      add(`다음은 모든 자연수 ${tex("n")}에 대하여 ${tex(proof.claim)}이 성립함을 수학적 귀납법으로 증명한 것이다. (가), (나), (다)에 알맞은 것을 쓰시오.<div style="margin:1.5mm 0 0 3mm;padding:1.5mm 3mm;border:1px solid #999">${inductionHtml(proof)}</div>`,
        blanks.map((value, at) => `${BLANKS[at]} ${tex(value)}`).join(", "), 10);
    }
  }
  return [{ heading: "수열", problems }];
}

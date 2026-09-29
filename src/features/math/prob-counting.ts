/* 확률과 통계 Ⅰ. 경우의 수: 중복순열 ₙΠᵣ, 같은 것이 있는 순열, 중복조합 ₙHᵣ, 이항정리와 파스칼의 삼각형입니다. */
import { escapeHtml, mathProblem, polyTex, svgText, svgWrap, tex, type SheetProblem, type SheetSection } from "./core";
import { comb, eachAsk, factorial, picker } from "./pg-common";

// ₙΠᵣ의 Π는 한글 복사 때도 Π로 나오게 \mathrm{Π}로 적습니다.
export const piTex = (n: number | string, r: number | string) => `{}_{${n}}\\mathrm{Π}_{${r}}`;
export const hTex = (n: number | string, r: number | string) => `{}_{${n}}\\mathrm{H}_{${r}}`;
export const cTex = (n: number | string, r: number | string) => `{}_{${n}}\\mathrm{C}_{${r}}`;

/** 중복순열 ₙΠᵣ = nʳ */
export const repPerm = (n: number, r: number) => n ** r;
/** 중복조합 ₙHᵣ = ₙ₊ᵣ₋₁Cᵣ */
export const repComb = (n: number, r: number) => (n === 0 && r === 0 ? 1 : comb(n + r - 1, r));

/** 낱말의 글자를 모두 일렬로 늘어놓는 경우의 수와 같은 글자 묶음입니다. */
export function arrangements(word: string) {
  const letters = [...word.replace(/\s+/g, "")];
  const counts = new Map<string, number>();
  for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  const repeated = [...counts.entries()].filter(([, count]) => count > 1);
  const total = factorial(letters.length) / repeated.reduce((product, [, count]) => product * factorial(count), 1);
  return { length: letters.length, counts: [...counts.entries()], repeated, total: Math.round(total) };
}
/** 풀이 식 n!/(a!b!…)의 TeX */
export function arrangementTex(word: string) {
  const { length, repeated, total } = arrangements(word);
  if (!repeated.length) return `${length}! = ${total}`;
  return `\\frac{${length}!}{${repeated.map(([, count]) => `${count}!`).join("\\,")}} = ${total}`;
}

/** 방정식 x₁+…+x_k = n의 해의 개수. positive면 자연수해, 아니면 음이 아닌 정수해입니다. */
export function equationSolutions(k: number, n: number, positive: boolean) {
  const r = positive ? n - k : n;
  return r < 0 ? 0 : repComb(k, r);
}

/** (ax + b)ⁿ을 전개한 계수 목록(계수[차수])입니다. */
export function binomialCoefficients(a: number, b: number, n: number) {
  return Array.from({ length: n + 1 }, (_, k) => comb(n, k) * a ** k * b ** (n - k));
}
/** (ax + b)ⁿ의 TeX */
export function binomialBaseTex(a: number, b: number, n: number) {
  const inner = polyTex([b, a]);
  return `(${inner})^{${n}}`;
}
/** (ax + b)ⁿ의 전개식 TeX */
export const binomialExpansionTex = (a: number, b: number, n: number) => polyTex(binomialCoefficients(a, b, n));

/** 파스칼의 삼각형 SVG. highlight행을 칠하고, pick = [행, 자리]를 동그라미로 표시합니다. */
export function pascalSvg(rows: number, options: { highlight?: number; pick?: [number, number] } = {}) {
  const cell = 34;
  const width = Math.max(260, (rows + 1) * cell + 40);
  const height = (rows + 1) * 30 + 30;
  const parts: string[] = [];
  for (let n = 0; n <= rows; n += 1) {
    const y = 26 + n * 30;
    parts.push(svgText(8, y + 4, `n=${n}`, { size: 10, color: "#666" }));
    for (let r = 0; r <= n; r += 1) {
      const x = width / 2 + (r - n / 2) * cell;
      const value = comb(n, r);
      const hot = options.pick && options.pick[0] === n && options.pick[1] === r;
      const row = options.highlight === n;
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y}" r="13.5" fill="${hot ? "#fde68a" : row ? "#dbeafe" : "#fff"}" stroke="${hot ? "#d97706" : row ? "#2563eb" : "#bbb"}" stroke-width="${hot ? 2 : 1}"/>`);
      parts.push(svgText(x, y + 4, String(value), { size: value >= 100 ? 9 : 11, anchor: "middle", weight: row || hot ? 700 : 400 }));
    }
  }
  return svgWrap(width, height, parts.join(""));
}

/** 가로 m칸·세로 n칸 바둑판 길 그림(최단 경로 문제) */
export function gridSvg(m: number, n: number) {
  const size = Math.min(34, 240 / Math.max(m, n));
  const width = m * size + 60;
  const height = n * size + 50;
  const x0 = 30;
  const y0 = 20;
  const parts: string[] = [];
  for (let i = 0; i <= m; i += 1) parts.push(`<line x1="${x0 + i * size}" y1="${y0}" x2="${x0 + i * size}" y2="${y0 + n * size}" stroke="#333" stroke-width="1.3"/>`);
  for (let j = 0; j <= n; j += 1) parts.push(`<line x1="${x0}" y1="${y0 + j * size}" x2="${x0 + m * size}" y2="${y0 + j * size}" stroke="#333" stroke-width="1.3"/>`);
  parts.push(`<circle cx="${x0}" cy="${y0 + n * size}" r="3.5" fill="#111"/>`, svgText(x0 - 14, y0 + n * size + 16, "A", { size: 13, weight: 700 }));
  parts.push(`<circle cx="${x0 + m * size}" cy="${y0}" r="3.5" fill="#111"/>`, svgText(x0 + m * size + 6, y0 - 4, "B", { size: 13, weight: 700 }));
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type CountingAsk = "repPerm" | "same" | "grid" | "repComb" | "equation" | "binomial";
export const countingAsks: Record<CountingAsk, string> = {
  repPerm: "중복순열", same: "같은 것이 있는 순열", grid: "최단 경로", repComb: "중복조합", equation: "방정식의 정수해", binomial: "이항정리",
};
const WORDS = ["BANANA", "LETTER", "SCHOOL", "APPLE", "COFFEE", "SUCCESS", "COOKIE", "PEPPER", "BALLOON", "ACCESS"];

export function countingProblems(asks: CountingAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick, int } = picker(seed * 83 + 11);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, options: Partial<SheetProblem> = {}) => problems.push(mathProblem(html, answer, { space: 14, ...options }));
  eachAsk(asks, perAsk, (ask, index) => {
    if (ask === "repPerm") {
      const kind = (index + int(0, 2)) % 3;
      if (kind === 0) {
        const n = int(3, 5);
        const r = int(3, 4);
        add(`숫자 ${Array.from({ length: n }, (_, i) => i + 1).join(", ")} 중에서 중복을 허락하여 ${r}개를 택해 만들 수 있는 ${r}자리 자연수의 개수를 구하시오.`,
          `${tex(`${piTex(n, r)} = ${n}^{${r}} = ${repPerm(n, r)}`)}`);
      } else if (kind === 1) {
        const clubs = int(2, 4);
        const students = int(3, 5);
        add(`학생 ${students}명이 서로 다른 동아리 ${clubs}개 중에서 각자 하나씩 고르는 방법의 수를 구하시오. (아무도 고르지 않는 동아리가 있어도 된다.)`,
          `${tex(`${piTex(clubs, students)} = ${clubs}^{${students}} = ${repPerm(clubs, students)}`)} (학생마다 ${clubs}가지)`);
      } else {
        const n = int(3, 5);
        const r = int(3, 4);
        const digits = Array.from({ length: n }, (_, i) => i).join(", ");
        add(`숫자 ${digits} 중에서 중복을 허락하여 만들 수 있는 ${r}자리 자연수의 개수를 구하시오.`,
          `${(n - 1) * repPerm(n, r - 1)} (맨 앞자리는 0이 올 수 없으므로 ${tex(`${n - 1}\\times${piTex(n, r - 1)} = ${n - 1}\\times${n}^{${r - 1}}`)})`);
      }
    } else if (ask === "same") {
      if (index % 2 === 0) {
        const word = pick(WORDS);
        add(`${escapeHtml(word)}의 ${arrangements(word).length}개 문자를 모두 일렬로 나열하는 방법의 수를 구하시오.`, tex(arrangementTex(word)));
      } else {
        const counts = pick([[2, 3, 1], [2, 2, 2], [3, 1, 1], [2, 2, 1], [4, 2, 1]]);
        const items = counts.flatMap((count, digit) => Array(count).fill(digit + 1));
        add(`숫자 카드 ${items.length}장(${items.join(", ")})을 모두 일렬로 나열하는 방법의 수를 구하시오.`, tex(arrangementTex(items.join(""))));
      }
    } else if (ask === "grid") {
      const m = int(3, 5);
      const n = int(2, 4);
      add(`그림과 같은 바둑판 모양의 길이 있다. A 지점에서 B 지점까지 가는 최단 경로의 수를 구하시오.`,
        `${tex(`\\frac{${m + n}!}{${m}!\\,${n}!} = ${comb(m + n, m)}`)} (→ ${m}번, ↑ ${n}번을 나열)`, { figure: gridSvg(m, n) });
    } else if (ask === "repComb") {
      if (index % 2 === 0) {
        const kinds = int(3, 4);
        const count = int(4, 6);
        add(`서로 다른 ${kinds}종류의 과일 중에서 ${count}개를 사는 방법의 수를 구하시오. (같은 종류를 여러 개 사도 되고, 사지 않는 종류가 있어도 된다.)`,
          tex(`${hTex(kinds, count)} = ${cTex(kinds + count - 1, count)} = ${repComb(kinds, count)}`));
      } else {
        const boxes = int(3, 4);
        const balls = int(boxes + 1, boxes + 4);
        add(`같은 공 ${balls}개를 서로 다른 상자 ${boxes}개에 빈 상자가 없도록 나누어 넣는 방법의 수를 구하시오.`,
          `${tex(`${hTex(boxes, balls - boxes)} = ${cTex(balls - 1, balls - boxes)} = ${repComb(boxes, balls - boxes)}`)} (먼저 상자마다 1개씩 넣고 남은 ${balls - boxes}개를 나눔)`);
      }
    } else if (ask === "equation") {
      const k = pick([3, 3, 4]);
      const n = int(k + 2, k + 6);
      const positive = index % 2 === 1;
      const names = ["x", "y", "z", "w"].slice(0, k);
      add(`방정식 ${tex(`${names.join("+")}=${n}`)}의 ${positive ? "자연수" : "음이 아닌 정수"}해 ${tex(`(${names.join(", ")})`)}의 개수를 구하시오.`,
        positive
          ? `${tex(`${hTex(k, n - k)} = ${cTex(n - 1, n - k)} = ${equationSolutions(k, n, true)}`)} (${names.map(name => `${name}=${name}'+1`).join(", ")}로 바꾸면 ${tex(`${names.map(name => `${name}'`).join("+")}=${n - k}`)})`
          : tex(`${hTex(k, n)} = ${cTex(n + k - 1, n)} = ${equationSolutions(k, n, false)}`));
    } else {
      const kind = index % 3;
      if (kind === 0) {
        const a = pick([1, 2, 3]);
        const b = pick([-2, -1, 1, 2, 3]);
        const n = int(4, 6);
        const k = int(1, n - 1);
        const value = comb(n, k) * a ** k * b ** (n - k);
        add(`다항식 ${tex(binomialBaseTex(a, b, n))}의 전개식에서 ${tex(k === 1 ? "x" : `x^{${k}}`)}의 계수를 구하시오.`,
          `${tex(`${cTex(n, k)}\\times${a < 0 ? `(${a})` : a}^{${k}}\\times${b < 0 ? `(${b})` : b}^{${n - k}} = ${value}`)}`);
      } else if (kind === 1) {
        const n = pick([4, 6, 8]);
        const c = pick([1, 2]);
        const r = n / 2;
        add(`${tex(`\\left(x+\\frac{${c}}{x}\\right)^{${n}}`)}의 전개식에서 상수항을 구하시오.`,
          `${tex(`${cTex(n, r)}\\times${c}^{${r}} = ${comb(n, r) * c ** r}`)} (일반항 ${tex(`${cTex(n, "r")}\\,x^{${n}-r}\\left(\\frac{${c}}{x}\\right)^{r}`)}에서 ${tex(`${n}-2r=0`)})`);
      } else {
        const n = int(5, 10);
        add(`${tex(`${cTex(n, 0)}+${cTex(n, 1)}+${cTex(n, 2)}+\\cdots+${cTex(n, n)}`)}의 값을 구하시오.`, `${tex(`2^{${n}} = ${2 ** n}`)} (${tex(`(1+x)^{${n}}`)}에 ${tex("x=1")}을 대입)`);
      }
    }
  });
  return [{ heading: "경우의 수", problems }];
}

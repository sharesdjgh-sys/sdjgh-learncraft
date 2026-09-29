/* 확률과 통계 Ⅱ. 확률: 수학적 확률, 여사건, 덧셈정리, 조건부확률(분할표), 곱셈정리, 사건의 독립과 수형도입니다. 확률은 모두 기약분수로 정확히 다룹니다. */
import { escapeHtml, mathProblem, q, qAdd, qDiv, qEq, qMul, qNum, qSub, qTex, qText, sheetTable, svgText, svgWrap, tex, type Q, type SheetProblem, type SheetSection } from "./core";
import { comb, eachAsk, picker } from "./pg-common";

/* ───── 분할표 ───── */
/** 2×2 분할표: counts[i][j]는 (행 i, 열 j)에 속하는 수입니다. 행 0은 사건 A, 열 0은 사건 B입니다. */
export type Contingency = { rows: [string, string]; cols: [string, string]; counts: [[number, number], [number, number]] };
export const DEFAULT_TABLE: Contingency = { rows: ["1학년", "2학년"], cols: ["찬성", "반대"], counts: [[18, 12], [24, 26]] };

export function tableStats(table: Contingency) {
  const [[a, b], [c, d]] = table.counts;
  const total = a + b + c + d;
  const rowA = a + b;
  const colB = a + c;
  const safe = (top: number, bottom: number) => (bottom > 0 ? q(top, bottom) : null);
  const pA = safe(rowA, total);
  const pB = safe(colB, total);
  const pAB = safe(a, total);
  return {
    total, rowA, colB, pA, pB, pAB,
    /** P(B|A) = n(A∩B)/n(A) */
    bGivenA: safe(a, rowA),
    /** P(A|B) = n(A∩B)/n(B) */
    aGivenB: safe(a, colB),
    independent: total > 0 && a * total === rowA * colB,
  };
}
/** 분할표를 학습지 표로(합계 포함) */
export function tableHtml(table: Contingency, blank = false) {
  const [[a, b], [c, d]] = table.counts;
  const cell = (value: number) => (blank ? "" : String(value));
  return sheetTable(["구분", escapeHtml(table.cols[0]), escapeHtml(table.cols[1]), "합계"], [
    [escapeHtml(table.rows[0]), String(a), String(b), cell(a + b)],
    [escapeHtml(table.rows[1]), String(c), String(d), cell(c + d)],
    ["합계", cell(a + c), cell(b + d), cell(a + b + c + d)],
  ], { widths: ["28%", "24%", "24%", "24%"] });
}

/* ───── 수형도 ───── */
/** 주머니에서 공을 두 번 꺼내는 수형도. 가지 위에 확률을 적습니다(SVG에는 글로 적은 분수). */
export function treeSvg(red: number, blue: number, replace: boolean) {
  const total = red + blue;
  const first = [{ name: "빨강", p: q(red, total), red: red - (replace ? 0 : 1), blue }, { name: "파랑", p: q(blue, total), red, blue: blue - (replace ? 0 : 1) }];
  const width = 430;
  const height = 250;
  const parts: string[] = [];
  const root = { x: 30, y: height / 2 };
  parts.push(`<circle cx="${root.x}" cy="${root.y}" r="4" fill="#111"/>`);
  first.forEach((branch, i) => {
    const y1 = 62 + i * 126;
    const x1 = 170;
    parts.push(`<line x1="${root.x}" y1="${root.y}" x2="${x1 - 22}" y2="${y1}" stroke="#333" stroke-width="1.4"/>`);
    parts.push(svgText((root.x + x1) / 2 - 18, (root.y + y1) / 2 + (i ? 16 : -6), qText(branch.p), { size: 12, color: "#2563eb", weight: 700 }));
    parts.push(svgText(x1 - 18, y1 + 4, branch.name, { size: 12, color: i ? "#1d4ed8" : "#dc2626", weight: 700 }));
    const rest = branch.red + branch.blue;
    [["빨강", branch.red], ["파랑", branch.blue]].forEach(([name, count], j) => {
      const y2 = y1 - 32 + j * 64;
      const x2 = 330;
      const p = rest > 0 ? q(count as number, rest) : q(0);
      parts.push(`<line x1="${x1 + 16}" y1="${y1}" x2="${x2 - 22}" y2="${y2}" stroke="#333" stroke-width="1.2"/>`);
      parts.push(svgText((x1 + x2) / 2 - 12, (y1 + y2) / 2 + (j ? 14 : -4), qText(p), { size: 11, color: "#2563eb" }));
      parts.push(svgText(x2 - 18, y2 + 4, name as string, { size: 12, color: j ? "#1d4ed8" : "#dc2626", weight: 700 }));
      parts.push(svgText(x2 + 24, y2 + 4, `= ${qText(qMul(branch.p, p))}`, { size: 11, color: "#111" }));
    });
  });
  parts.push(svgText(width / 2, height - 6, replace ? "꺼낸 공을 다시 넣음(복원 추출)" : "꺼낸 공을 다시 넣지 않음(비복원 추출)", { size: 11, anchor: "middle", color: "#555" }));
  return svgWrap(width, height, parts.join(""));
}
/** 두 번 모두 빨간 공일 확률 */
export const bothRed = (red: number, blue: number, replace: boolean) => (replace ? qMul(q(red, red + blue), q(red, red + blue)) : qMul(q(red, red + blue), q(red - 1, red + blue - 1)));

/** 주사위 두 개의 눈의 합이 sum인 경우의 수(전수 조사) */
export function diceSumCount(sum: number) {
  let count = 0;
  for (let a = 1; a <= 6; a += 1) for (let b = 1; b <= 6; b += 1) if (a + b === sum) count += 1;
  return count;
}

/* ───── 문제 ───── */
export type ProbabilityAsk = "classic" | "complement" | "addition" | "conditional" | "multiply" | "independent";
export const probabilityAsks: Record<ProbabilityAsk, string> = {
  classic: "수학적 확률", complement: "여사건", addition: "덧셈정리", conditional: "조건부확률(분할표)", multiply: "곱셈정리", independent: "사건의 독립",
};
const t = (value: Q) => tex(qTex(value));

export function probabilityProblems(asks: ProbabilityAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick, int } = picker(seed * 97 + 5);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, options: Partial<SheetProblem> = {}) => problems.push(mathProblem(html, answer, { space: 14, ...options }));
  eachAsk(asks, perAsk, (ask, index) => {
    if (ask === "classic") {
      if (index % 2 === 0) {
        const sum = int(3, 11);
        const count = diceSumCount(sum);
        add(`서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 ${sum}일 확률을 구하시오.`, `${t(q(count, 36))} (합이 ${sum}인 경우 ${count}가지, 전체 36가지)`);
      } else {
        const white = int(2, 5);
        const black = int(2, 5);
        const total = white + black;
        const value = q(comb(white, 1) * comb(black, 1), comb(total, 2));
        add(`흰 공 ${white}개, 검은 공 ${black}개가 들어 있는 주머니에서 임의로 2개의 공을 동시에 꺼낼 때, 흰 공과 검은 공이 1개씩 나올 확률을 구하시오.`,
          `${tex(`\\frac{${white}\\times${black}}{${`{}_{${total}}\\mathrm{C}_{2}`}} = ${qTex(value)}`)}`);
      }
    } else if (ask === "complement") {
      if (index % 2 === 0) {
        const n = int(3, 5);
        add(`동전 ${n}개를 동시에 던질 때, 적어도 한 개는 앞면이 나올 확률을 구하시오.`, `${tex(`1-\\left(\\frac{1}{2}\\right)^{${n}} = ${qTex(q(2 ** n - 1, 2 ** n))}`)} (여사건: 모두 뒷면)`);
      } else {
        const white = int(2, 4);
        const black = int(3, 5);
        const k = pick([2, 3]);
        const value = qSub(q(1), q(comb(black, k), comb(white + black, k)));
        add(`흰 공 ${white}개, 검은 공 ${black}개가 들어 있는 주머니에서 임의로 ${k}개의 공을 동시에 꺼낼 때, 흰 공이 적어도 1개 나올 확률을 구하시오.`,
          `${tex(`1-\\frac{{}_{${black}}\\mathrm{C}_{${k}}}{{}_{${white + black}}\\mathrm{C}_{${k}}} = ${qTex(value)}`)} (여사건: 모두 검은 공)`);
      }
    } else if (ask === "addition") {
      const denominator = pick([6, 8, 10, 12]);
      const both = int(1, 2);
      const a = int(both + 1, Math.floor(denominator / 2));
      const b = int(both + 1, denominator - a);
      const [pA, pB, pAB] = [q(a, denominator), q(b, denominator), q(both, denominator)];
      if (index % 2 === 0) add(`두 사건 A, B에 대하여 ${tex(`P(A)=${qTex(pA)},\\ P(B)=${qTex(pB)},\\ P(A\\cap B)=${qTex(pAB)}`)}일 때, ${tex("P(A\\cup B)")}를 구하시오.`,
        `${tex(`P(A)+P(B)-P(A\\cap B) = ${qTex(qSub(qAdd(pA, pB), pAB))}`)}`);
      else add(`두 사건 A, B가 서로 배반사건이고 ${tex(`P(A)=${qTex(pA)},\\ P(A\\cup B)=${qTex(qAdd(pA, q(b - both, denominator)))}`)}일 때, ${tex("P(B)")}를 구하시오.`,
        `${tex(`P(B)=P(A\\cup B)-P(A) = ${qTex(q(b - both, denominator))}`)} (배반이면 ${tex("P(A\\cap B)=0")})`);
    } else if (ask === "conditional") {
      const table: Contingency = pick([
        { rows: ["남학생", "여학생"], cols: ["안경을 씀", "안경을 안 씀"], counts: [[int(6, 15), int(8, 20)], [int(6, 15), int(8, 20)]] },
        { rows: ["1학년", "2학년"], cols: ["찬성", "반대"], counts: [[int(10, 30), int(10, 30)], [int(10, 30), int(10, 30)]] },
        { rows: ["운동부", "운동부 아님"], cols: ["아침 식사함", "안 함"], counts: [[int(8, 20), int(4, 12)], [int(10, 25), int(8, 20)]] },
      ]);
      const stats = tableStats(table);
      const [row, col] = [escapeHtml(table.rows[0]), escapeHtml(table.cols[0])];
      if (index % 2 === 0) add(`다음은 어느 학교 학생 ${stats.total}명을 조사한 표이다. 이 학생 중 임의로 한 명을 뽑았더니 ${row}이었을 때, 이 학생이 ‘${col}’일 확률을 구하시오.`,
        `${tex(`P(B\\mid A)=\\frac{n(A\\cap B)}{n(A)}=\\frac{${table.counts[0][0]}}{${stats.rowA}} = ${qTex(stats.bGivenA!)}`)}`, { after: tableHtml(table) });
      else add(`다음 표에서 임의로 뽑은 한 명이 ‘${col}’이었을 때, 이 학생이 ${row}일 확률을 구하시오.`,
        `${tex(`P(A\\mid B)=\\frac{${table.counts[0][0]}}{${stats.colB}} = ${qTex(stats.aGivenB!)}`)}`, { after: tableHtml(table) });
    } else if (ask === "multiply") {
      const red = int(3, 6);
      const blue = int(2, 5);
      const replace = index % 2 === 1;
      add(`빨간 공 ${red}개, 파란 공 ${blue}개가 들어 있는 주머니에서 공을 한 개씩 두 번 꺼낸다. ${replace ? "꺼낸 공은 다시 넣는다" : "꺼낸 공은 다시 넣지 않는다"}. 두 번 모두 빨간 공이 나올 확률을 구하시오.`,
        `${tex(`\\frac{${red}}{${red + blue}}\\times\\frac{${replace ? red : red - 1}}{${replace ? red + blue : red + blue - 1}} = ${qTex(bothRed(red, blue, replace))}`)}`, { answerFigure: treeSvg(red, blue, replace) });
    } else {
      const pA = pick([q(1, 2), q(1, 3), q(2, 5), q(1, 4), q(3, 5)]);
      const pB = pick([q(1, 2), q(1, 3), q(1, 4), q(2, 3), q(3, 4)]);
      if (index % 2 === 0) {
        // [P(A), P(B), P(A∩B)] — 앞의 넷은 독립, 뒤의 넷은 종속입니다.
        const [a, b, both] = pick<[Q, Q, Q]>([
          [q(1, 2), q(1, 3), q(1, 6)], [q(2, 5), q(1, 2), q(1, 5)], [q(1, 4), q(2, 3), q(1, 6)], [q(3, 5), q(1, 3), q(1, 5)],
          [q(1, 2), q(1, 3), q(1, 4)], [q(2, 5), q(1, 2), q(1, 4)], [q(1, 3), q(1, 4), q(1, 6)], [q(3, 5), q(1, 2), q(1, 5)],
        ]);
        const isIndependent = qEq(both, qMul(a, b));
        add(`두 사건 A, B에 대하여 ${tex(`P(A)=${qTex(a)},\\ P(B)=${qTex(b)},\\ P(A\\cap B)=${qTex(both)}`)}일 때, 두 사건 A와 B는 서로 독립인지 종속인지 말하시오.`,
          `${isIndependent ? "독립" : "종속"} (${tex(`P(A)P(B)=${qTex(qMul(a, b))}`)}로 ${tex("P(A\\cap B)")}와 ${isIndependent ? "같음" : "다름"})`);
      } else {
        const union = qSub(qAdd(pA, pB), qMul(pA, pB));
        add(`두 사건 A, B가 서로 독립이고 ${tex(`P(A)=${qTex(pA)},\\ P(B)=${qTex(pB)}`)}일 때, ${tex("P(A\\cup B)")}를 구하시오.`,
          `${tex(`P(A)+P(B)-P(A)P(B) = ${qTex(union)}`)}`);
      }
    }
  });
  return [{ heading: "확률", problems }];
}
/** P(B|A)를 분할표 칸 이름으로 풀어 적은 TeX (화면 풀이용) */
export const conditionalTex = (table: Contingency) => {
  const stats = tableStats(table);
  return stats.bGivenA ? `P(B\\mid A)=\\frac{${table.counts[0][0]}}{${stats.rowA}}=${qTex(stats.bGivenA)}` : "P(B\\mid A)=\\text{정의되지 않음}";
};
/** 곱셈정리 P(A∩B) = P(A)·P(B|A) 를 분할표로 확인한 값 */
export const multiplyCheck = (table: Contingency) => {
  const stats = tableStats(table);
  return stats.pA && stats.bGivenA && stats.pAB ? qEq(qMul(stats.pA, stats.bGivenA), stats.pAB) && qEq(qDiv(stats.pAB, stats.pA), stats.bGivenA) : false;
};
export const probabilityValue = qNum;

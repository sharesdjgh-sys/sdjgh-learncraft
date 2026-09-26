/* 경제: 합리적 선택. 대안의 편익·명시적 비용으로 암묵적 비용·기회비용·순편익을 구하고, 한계 편익·한계 비용으로 최적 수량을 찾습니다. */
import { escapeHtml, grouped, particle, problem, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

/** benefit: 편익, cost: 명시적 비용(이 대안을 고르며 실제로 치르는 돈) */
export type Alternative = { name: string; benefit: number; cost: number };
export const DEFAULT_ALTERNATIVES: Alternative[] = [
  { name: "영화 보기", benefit: 30000, cost: 12000 },
  { name: "아르바이트", benefit: 50000, cost: 5000 },
  { name: "도서관에서 공부", benefit: 40000, cost: 0 },
];

/**
 * 암묵적 비용 = 포기한 대안 가운데 가장 큰 (편익 − 명시적 비용). 아무것도 하지 않는 경우(0)보다 작으면 0으로 봅니다.
 * 기회비용 = 명시적 비용 + 암묵적 비용, 순편익 = 편익 − 기회비용. 순편익이 0보다 큰 대안이 합리적 선택입니다.
 */
export function evaluateChoices(list: Alternative[]) {
  return list.map((alternative, index) => {
    const implicit = Math.max(0, ...list.filter((_, other) => other !== index).map(other => other.benefit - other.cost));
    const opportunity = alternative.cost + implicit;
    const net = alternative.benefit - opportunity;
    return { alternative, implicit, opportunity, net, rational: net > 0 };
  });
}

/** 한 단위씩 더 할 때의 한계 편익·한계 비용 표에서 총순편익이 가장 큰 수량 */
export function marginalTable(benefits: number[], costs: number[]) {
  const length = Math.min(benefits.length, costs.length);
  let totalBenefit = 0;
  let totalCost = 0;
  const rows = Array.from({ length }, (_, index) => {
    totalBenefit += benefits[index];
    totalCost += costs[index];
    return { quantity: index + 1, mb: benefits[index], mc: costs[index], totalBenefit, totalCost, net: totalBenefit - totalCost };
  });
  const best = rows.reduce((top, row) => row.net > top.net ? row : top, { quantity: 0, mb: 0, mc: 0, totalBenefit: 0, totalCost: 0, net: 0 });
  return { rows, best };
}

export function choiceTableHtml(list: Alternative[], unit = "원") {
  return sheetTable(["대안", `편익(${unit})`, `명시적 비용(${unit})`], list.map(item => [escapeHtml(item.name), grouped(item.benefit), grouped(item.cost)]), { font: "9.5pt" });
}

/* ───── 문제 ───── */
export type ChoiceAsk = "opportunity" | "rational" | "marginal" | "sunk";
export const choiceAsks: Record<ChoiceAsk, string> = { opportunity: "기회비용 구하기", rational: "합리적 선택", marginal: "한계 편익·한계 비용", sunk: "매몰 비용" };

const SETS = [
  ["축구 교실", "피아노 학원", "코딩 동아리"],
  ["놀이공원", "캠핑", "박물관 관람"],
  ["아르바이트", "봉사 활동", "도서관 공부"],
  ["분식집 창업", "카페 창업", "회사 취업"],
];

export function choiceProblems(asks: ChoiceAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 157 + 23);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const alternatives = () => {
    const names = pick(SETS);
    // 대안끼리 (편익 − 명시적 비용)이 겹치지 않게 만들어 답이 하나로 정해지게 합니다.
    for (let tries = 0; tries < 30; tries += 1) {
      const list = names.map(name => ({ name, benefit: (2 + Math.floor(random() * 8)) * 10000, cost: Math.floor(random() * 5) * 10000 }));
      const nets = list.map(item => item.benefit - item.cost);
      if (new Set(nets).size === nets.length && nets.every(value => value > 0)) return list;
    }
    return names.map((name, index) => ({ name, benefit: (5 + index * 2) * 10000, cost: index * 10000 }));
  };
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "opportunity") {
      const list = alternatives();
      const target = Math.floor(random() * list.length);
      const result = evaluateChoices(list)[target];
      problems.push(problem(`표는 선택할 수 있는 대안(하나만 고를 수 있음)의 편익과 명시적 비용이다. ‘${escapeHtml(list[target].name)}’${particle(list[target].name, "을", "를")} 선택할 때의 명시적 비용, 암묵적 비용, 기회비용과 순편익을 구하시오.`,
        `명시적 비용 ${grouped(result.alternative.cost)}원, 암묵적 비용 ${grouped(result.implicit)}원(포기한 대안 가운데 ‘편익 − 명시적 비용’이 가장 큰 값), 기회비용 ${grouped(result.opportunity)}원, 순편익 ${grouped(result.net)}원`, { after: choiceTableHtml(list), space: 14 }));
    } else if (ask === "rational") {
      const list = alternatives();
      const results = evaluateChoices(list);
      const best = results.find(item => item.rational) ?? results[0];
      problems.push(problem(`표의 대안 가운데 하나만 선택할 수 있을 때, 합리적인 선택은 무엇인지 쓰고 그 대안의 기회비용과 순편익을 구하시오.`,
        `${escapeHtml(best.alternative.name)} (기회비용 ${grouped(best.opportunity)}원, 순편익 ${grouped(best.net)}원 &gt; 0, 다른 대안은 순편익이 0보다 작아요)`, { after: choiceTableHtml(list), space: 12 }));
    } else if (ask === "marginal") {
      const length = 5;
      const start = pick([10, 12, 14]);
      const drop = pick([2, 3]);
      // 천 원 단위로 고른 뒤 원으로 적습니다.
      const mb = Array.from({ length }, (_, at) => (start - drop * at) * 1000);
      const cost = pick([2, 3, 4]);
      const rise = pick([1, 2]);
      const mc = Array.from({ length }, (_, at) => (cost + rise * at) * 1000);
      const { rows, best } = marginalTable(mb, mc);
      problems.push(problem(`표는 어떤 활동을 한 번 더 할 때마다 얻는 한계 편익과 드는 한계 비용(단위: 원)이다. 총순편익이 가장 큰 횟수와 그때의 총순편익을 구하시오.`,
        `${best.quantity}번, 총순편익 ${grouped(best.net)}원 (한계 편익 ≥ 한계 비용인 동안 늘려요)`,
        { after: sheetTable(["횟수", ...rows.map(row => `${row.quantity}번째`)], [["한계 편익", ...rows.map(row => grouped(row.mb))], ["한계 비용", ...rows.map(row => grouped(row.mc))]], { font: "9.5pt" }), space: 12 }));
    } else {
      const ticket = pick([3, 4, 5]) * 10000;
      const job = pick([4, 6, 8]) * 10000;
      const enjoy = pick([5, 7, 9]) * 10000;
      if (enjoy === job) continue;
      const go = enjoy > job;
      problems.push(problem(`민수는 환불이 안 되는 공연 표를 ${grouped(ticket)}원에 샀다. 공연 날 ${grouped(job)}원을 받는 아르바이트 제안을 받았다. 공연을 보는 편익은 ${grouped(enjoy)}원이다. 공연을 보는 것의 기회비용과 합리적 선택을 쓰시오.`,
        `표값 ${grouped(ticket)}원은 되돌릴 수 없는 매몰 비용이라 판단에서 뺍니다. 공연 관람의 기회비용 = 포기한 아르바이트 ${grouped(job)}원 → ${go ? "공연 관람" : "아르바이트"}이 합리적 (편익 ${grouped(enjoy)}원 ${go ? "&gt;" : "&lt;"} 기회비용 ${grouped(job)}원)`, { space: 12 }));
    }
  }
  return [{ heading: "합리적 선택과 기회비용", problems }];
}

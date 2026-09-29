/* 물질과 에너지: 기체 법칙(보일·샤를·아보가드로, 이상 기체 방정식)과 부분 압력, 그래프와 문제입니다. */
import { num, plotSvg, seededRandom, type SheetProblem, type SheetSection } from "./sheet";

export const R_GAS_ATM = 0.082;
/** PV = nRT에서 모르는 값 하나를 구합니다(atm, L, mol, K). */
export function idealGas(values: { p?: number; v?: number; n?: number; t?: number }) {
  const { p, v, n, t } = values;
  if (p === undefined && v && n && t) return { p: (n * R_GAS_ATM * t) / v };
  if (v === undefined && p && n && t) return { v: (n * R_GAS_ATM * t) / p };
  if (n === undefined && p && v && t) return { n: (p * v) / (R_GAS_ATM * t) };
  if (t === undefined && p && v && n) return { t: (p * v) / (n * R_GAS_ATM) };
  return {};
}

/** 보일 법칙(P-V 반비례 곡선), 또는 V-1/P 직선 그래프입니다. */
export function boyleSvg(pv: number, inverse = false) {
  const points = Array.from({ length: 81 }, (_, step) => { const p = 0.25 + (3.75 * step) / 80; return inverse ? [1 / p, pv / p] as [number, number] : [p, pv / p] as [number, number]; });
  return plotSvg({ xLabel: inverse ? "1/P(1/atm)" : "압력(atm)", yLabel: "부피(L)", xMax: inverse ? 4.2 : 4.2, yMin: 0, yMax: (pv / 0.25) * 1.05, series: [{ points, color: "#2563eb" }], width: 400, height: 260 });
}
/** 샤를 법칙: 부피-섭씨 온도 직선을 −273 ℃까지 늘여 그립니다. */
export function charlesSvg(v0: number) {
  const line = (t: number) => v0 * (1 + t / 273);
  return plotSvg({
    xLabel: "온도(℃)", yLabel: "부피(L)", xMin: -300, xMax: 300, xStep: 100, yMin: 0, yMax: line(300) * 1.1,
    series: [{ points: [[-273, 0], [0, line(0)]], color: "#94a3b8", dash: true }, { points: [[0, line(0)], [300, line(300)]], color: "#dc2626" }],
    dots: [{ at: [-273, 0], label: "−273 ℃", color: "#dc2626" }], width: 420, height: 260,
  });
}

/* ───── 문제 ───── */
export type GasAsk = "boyle" | "charles" | "ideal" | "partial";
export const gasAsks: Record<GasAsk, string> = { boyle: "보일 법칙", charles: "샤를 법칙", ideal: "이상 기체 방정식", partial: "부분 압력" };

export function gasProblems(asks: GasAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 83 + 7);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 14 });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "boyle") {
      const p1 = pick([1, 2]); const v1 = pick([6, 12, 24]); const p2 = pick([3, 4, 0.5]);
      add(`온도가 일정할 때 ${p1} atm에서 부피가 ${v1} L인 기체의 압력을 ${p2} atm으로 바꾸면 부피는 몇 L가 되는가?`, `${num((p1 * v1) / p2, 3)} L (P₁V₁ = P₂V₂)`);
    } else if (ask === "charles") {
      const t1 = pick([27, 0, 127]); const v1 = pick([3, 6, 10]); const t2 = pick([127, 327, 273]);
      add(`압력이 일정할 때 ${t1} ℃에서 부피가 ${v1} L인 기체를 ${t2} ℃로 가열하면 부피는 몇 L가 되는가?`, `${num((v1 * (t2 + 273)) / (t1 + 273), 3)} L (V/T 일정, 절대 온도로 계산)`);
    } else if (ask === "ideal") {
      const n = pick([0.5, 1, 2]); const t = pick([273, 300, 400]); const v = pick([10, 22.4, 24.6]);
      add(`${n} mol의 기체가 ${t} K, ${v} L 용기에 들어 있을 때 기체의 압력을 구하시오. (R = 0.082 atm·L/(mol·K))`, `${num(idealGas({ v, n, t }).p!, 3)} atm`);
    } else {
      const a = pick([1, 2, 3]); const b = pick([1, 2, 3]); const total = pick([1, 2, 3]);
      add(`질소 ${a} mol과 산소 ${b} mol이 섞인 기체의 전체 압력이 ${total} atm일 때 산소의 부분 압력을 구하시오.`, `${num((total * b) / (a + b), 3)} atm (몰 분율 ${b}/${a + b})`);
    }
  }
  return [{ heading: "기체의 성질", problems }];
}

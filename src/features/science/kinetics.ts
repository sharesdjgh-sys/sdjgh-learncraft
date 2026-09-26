/* 물질과 에너지: 반응 속도(농도-시간 그래프, 평균 속도, 반감기), 초기 속도로 속도 법칙 찾기, 분자 운동 에너지 분포, 문제입니다. */
import { num, plotSvg, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

/** 1차 반응: [A] = [A]₀ (1/2)^(t/t½). 생성물은 A 1몰당 ratio몰 생깁니다. */
export function firstOrder(initial: number, half: number, t: number) { return initial * 0.5 ** (t / half); }
export function concentrationSvg(initial: number, half: number, options: { product?: number; span?: number } = {}) {
  const span = options.span ?? half * 4;
  const reactant = Array.from({ length: 121 }, (_, step) => { const t = (span * step) / 120; return [t, firstOrder(initial, half, t)] as [number, number]; });
  const product = options.product ? reactant.map(([t, c]) => [t, (initial - c) * options.product!] as [number, number]) : null;
  const max = Math.max(initial, product ? initial * options.product! : 0) * 1.15;
  return plotSvg({
    xLabel: "시간(s)", yLabel: "농도(M)", xMax: span * 1.05, xStep: half, yMin: 0, yMax: max,
    series: [{ points: reactant, color: "#2563eb", label: "반응물" }, ...(product ? [{ points: product, color: "#dc2626", dash: true, label: "생성물" }] : [])],
    dots: Array.from({ length: Math.floor(span / half) + 1 }, (_, n) => ({ at: [n * half, initial * 0.5 ** n] as [number, number] })),
    width: 480, height: 280,
  });
}
export const averageRate = (initial: number, half: number, t1: number, t2: number) => (firstOrder(initial, half, t1) - firstOrder(initial, half, t2)) / (t2 - t1);

/** 분자의 운동 에너지 분포(맥스웰-볼츠만 모양)와 활성화 에너지 선입니다. 높은 온도에서 Ea를 넘는 분자가 많아집니다. */
export function distributionSvg(options: { t1: number; t2: number; activation: number; catalyst?: number }) {
  const curve = (temperature: number) => Array.from({ length: 121 }, (_, step) => { const e = (12 * step) / 120; return [e, 2 * Math.sqrt(e / Math.PI) * temperature ** -1.5 * Math.exp(-e / temperature) * 3] as [number, number]; });
  const c1 = curve(options.t1);
  const c2 = curve(options.t2);
  const shade = (points: [number, number][], from: number, color: string) => { const tail = points.filter(([e]) => e >= from); return tail.length ? { points: [[from, 0], ...tail, [tail[tail.length - 1][0], 0]] as [number, number][], color } : null; };
  const areas = [shade(c2, options.activation, "rgba(220,38,38,.18)"), shade(c1, options.activation, "rgba(37,99,235,.25)")].filter(Boolean) as { points: [number, number][]; color: string }[];
  const max = Math.max(...c1.map(([, value]) => value), ...c2.map(([, value]) => value)) * 1.15;
  return plotSvg({
    xLabel: "운동 에너지", yLabel: "분자 수", xMax: 12, yMin: 0, yMax: max, hideTicks: true, areas,
    series: [{ points: c1, color: "#2563eb", label: "T₁" }, { points: c2, color: "#dc2626", label: "T₂(높음)" }, { points: [[options.activation, 0], [options.activation, max * 0.9]], color: "#111", dash: true, width: 1.4, label: "Ea" }, ...(options.catalyst !== undefined ? [{ points: [[options.catalyst, 0], [options.catalyst, max * 0.75]] as [number, number][], color: "#16a34a", dash: true, width: 1.4, label: "촉매 Ea" }] : [])],
    width: 480, height: 280,
  });
}

/* ───── 속도 법칙 ───── */
export type RateLaw = { m: number; n: number; k: number; runs: { a: number; b: number; rate: number }[] };
export function randomRateLaw(random: () => number): RateLaw {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const m = pick([0, 1, 2]); const n = pick([1, 2, 0]);
  const k = pick([0.5, 1, 2, 4]);
  const base = [[0.1, 0.1], [0.2, 0.1], [0.1, 0.2]].map(([a, b]) => ({ a, b, rate: k * a ** m * b ** n }));
  return { m, n, k, runs: base };
}
export const rateTableHtml = (law: RateLaw) => sheetTable(["실험", "[A](M)", "[B](M)", "초기 반응 속도(M/s)"], law.runs.map((run, index) => [String(index + 1), num(run.a), num(run.b), Number(run.rate.toPrecision(3)).toExponential(1).replace(/e([+-])(\d+)/, (_, sign: string, power: string) => `×10<sup>${sign === "-" ? "−" : ""}${power}</sup>`)]));

/* ───── 문제 ───── */
export type KineticsAsk = "average" | "half" | "law" | "temperature";
export const kineticsAsks: Record<KineticsAsk, string> = { average: "평균 반응 속도", half: "반감기", law: "속도 법칙", temperature: "온도·촉매와 속도" };

export function kineticsProblems(asks: KineticsAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 97 + 13);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 14, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "average") {
      const initial = pick([0.8, 1.6]); const half = pick([10, 20]);
      add(`그림은 반응 A → 2B에서 A의 농도를 시간에 따라 나타낸 것이다. 0~${half * 2}초 동안 A의 평균 반응 속도와 B의 평균 생성 속도를 구하시오.`, `A ${num(averageRate(initial, half, 0, half * 2), 4)} M/s, B ${num(2 * averageRate(initial, half, 0, half * 2), 4)} M/s`, { figure: concentrationSvg(initial, half, { product: 2 }) });
    } else if (ask === "half") {
      const initial = pick([0.8, 1.6]); const half = pick([10, 20, 30]); const n = pick([2, 3]);
      add(`그림은 1차 반응에서 반응물의 농도를 시간에 따라 나타낸 것이다. 이 반응의 반감기와, 농도가 처음의 1/${2 ** n}이 될 때까지 걸린 시간을 구하시오.`, `반감기 ${half} s, ${half * n} s`, { figure: concentrationSvg(initial, half) });
    } else if (ask === "law") {
      const law = randomRateLaw(random);
      add(`표는 반응 A + B → C의 초기 농도와 초기 반응 속도이다. 반응 속도식 v = k[A]<sup>m</sup>[B]<sup>n</sup>에서 m, n과 k를 구하시오.${rateTableHtml(law)}`, `m = ${law.m}, n = ${law.n}, k = ${num(law.k)} (실험 1·2에서 [A] 2배 → 속도 ${2 ** law.m}배, 실험 1·3에서 [B] 2배 → 속도 ${2 ** law.n}배)`);
    } else {
      const statement = pick([
        ["온도를 높이면 활성화 에너지보다 큰 운동 에너지를 가진 분자 수가 많아진다.", "O"],
        ["정촉매는 반응 엔탈피(ΔH)를 작게 한다.", "X (ΔH는 그대로, 활성화 에너지만 낮춤)"],
        ["고체 반응물을 가루로 만들면 표면적이 넓어져 반응 속도가 빨라진다.", "O"],
        ["반응물의 농도를 높이면 단위 시간당 충돌 횟수가 늘어난다.", "O"],
        ["부촉매는 활성화 에너지를 낮춘다.", "X (부촉매는 활성화 에너지를 높임)"],
      ] as [string, string][]);
      add(`다음 설명이 옳으면 O, 틀리면 X를 쓰시오. ${statement[0]}`, statement[1], { space: 6 });
    }
  }
  return [{ heading: "반응 속도", problems }];
}

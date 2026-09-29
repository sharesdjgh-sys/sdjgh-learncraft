/* 경제: 두 나라·두 재화의 생산비로 절대 우위·비교 우위, 기회비용, 교역 조건 범위를 구하고 생산 가능 곡선과 무역 이익을 그립니다. */
import { escapeHtml, fraction, grouped, num, objectParticle, particle, plotSvg, problem, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

/** hours: 재화 1단위를 만드는 데 드는 노동량, output: 노동 1단위로 만드는 재화의 양 */
export type TradeMode = "hours" | "output";
export type TradeSetup = {
  countries: [string, string];
  goods: [string, string];
  mode: TradeMode;
  /** values[나라][재화] */
  values: [[number, number], [number, number]];
  /** 나라마다 가진 노동량 */
  labor: [number, number];
};
/** 리카도의 예: 옷감·포도주 1단위를 만드는 데 필요한 노동자 수 */
export const RICARDO: TradeSetup = { countries: ["영국", "포르투갈"], goods: ["옷감", "포도주"], mode: "hours", values: [[100, 120], [90, 80]], labor: [220, 170] };

/** 재화 1단위를 만드는 데 드는 노동량으로 바꿉니다. */
export const hoursPerUnit = (setup: TradeSetup, country: number, good: number) => setup.mode === "hours" ? setup.values[country][good] : 1 / setup.values[country][good];
export const maxOutput = (setup: TradeSetup, country: number, good: number) => setup.labor[country] / hoursPerUnit(setup, country, good);

export function analyzeTrade(setup: TradeSetup) {
  const hours = [0, 1].map(country => [0, 1].map(good => hoursPerUnit(setup, country, good)));
  /** cost[나라][재화]: 그 재화 1단위의 기회비용(다른 재화의 양) */
  const cost = hours.map(row => [row[0] / row[1], row[1] / row[0]]);
  const lower = (a: number, b: number) => Math.abs(a - b) < 1e-9 ? null : a < b ? 0 : 1;
  const absolute = [0, 1].map(good => lower(hours[0][good], hours[1][good]));
  const comparative = [0, 1].map(good => lower(cost[0][good], cost[1][good]));
  // 교역 조건: 첫째 재화 1단위와 바꾸는 둘째 재화의 양은 두 나라의 기회비용 사이여야 둘 다 이익입니다.
  const range = [Math.min(cost[0][0], cost[1][0]), Math.max(cost[0][0], cost[1][0])] as const;
  return { hours, cost, absolute, comparative, range };
}

/** 첫째 재화에 비교 우위가 있는 나라가 그 재화에, 다른 나라가 둘째 재화에 완전히 특화한 뒤 exportQty만큼을 rate(둘째 재화/첫째 재화 1단위)에 바꾼 소비점 */
export function tradeGains(setup: TradeSetup, exportQty: number, rate: number) {
  const { comparative } = analyzeTrade(setup);
  const first = comparative[0];
  if (first === null) return null;
  const second = 1 - first;
  const produce = [[0, 0], [0, 0]];
  produce[first] = [maxOutput(setup, first, 0), 0];
  produce[second] = [0, maxOutput(setup, second, 1)];
  const consume = [[0, 0], [0, 0]];
  consume[first] = [produce[first][0] - exportQty, exportQty * rate];
  consume[second] = [exportQty, produce[second][1] - exportQty * rate];
  // 소비점을 만드는 데 드는 노동이 가진 노동보다 많으면 생산 가능 곡선 밖(무역 이익)입니다.
  const beyond = [0, 1].map(country => consume[country][0] * hoursPerUnit(setup, country, 0) + consume[country][1] * hoursPerUnit(setup, country, 1) > setup.labor[country] + 1e-9);
  const feasible = consume.every(point => point[0] >= -1e-9 && point[1] >= -1e-9);
  return { first, second, produce, consume, beyond, feasible };
}

/** 한 나라의 생산 가능 곡선(직선)과 교역 후 소비점 */
export function ppfSvg(setup: TradeSetup, country: number, consume?: [number, number], options: { width?: number; height?: number; blank?: boolean } = {}) {
  const x = maxOutput(setup, country, 0);
  const y = maxOutput(setup, country, 1);
  const top = Math.max(x, y, consume?.[0] ?? 0, consume?.[1] ?? 0) * 1.2;
  const dots = options.blank ? [] : [{ at: [x, 0] as [number, number], label: num(x, 2), color: "#2563eb" }, { at: [0, y] as [number, number], label: num(y, 2), color: "#2563eb" }];
  if (consume && !options.blank) dots.push({ at: consume, label: `교역 후 (${num(consume[0], 2)}, ${num(consume[1], 2)})`, color: "#dc2626" });
  return plotSvg({
    title: `${setup.countries[country]}의 생산 가능 곡선`, xLabel: setup.goods[0], yLabel: setup.goods[1], xMax: top, yMin: 0, yMax: top,
    series: [{ points: [[0, y], [x, 0]], color: "#2563eb" }], dots, width: options.width ?? 320, height: options.height ?? 260, hideTicks: options.blank,
  });
}

const unitLabel = (mode: TradeMode) => mode === "hours" ? "1단위 생산에 드는 노동량" : "노동 1단위로 생산하는 양";
export function tradeTableHtml(setup: TradeSetup) {
  return sheetTable([`구분(${unitLabel(setup.mode)})`, escapeHtml(setup.goods[0]), escapeHtml(setup.goods[1])],
    [0, 1].map(country => [escapeHtml(setup.countries[country]), grouped(setup.values[country][0], 3), grouped(setup.values[country][1], 3)]), { font: "9.5pt" });
}
/** 기회비용을 분수로 정확히 적습니다(정수 자료일 때). */
export function costText(setup: TradeSetup, country: number, good: number) {
  const [a, b] = setup.mode === "hours" ? [setup.values[country][good], setup.values[country][1 - good]] : [setup.values[country][1 - good], setup.values[country][good]];
  return Number.isInteger(a) && Number.isInteger(b) ? fraction(a, b) : num(a / b, 3);
}

/* ───── 문제 ───── */
export type TradeAsk = "advantage" | "cost" | "terms" | "gains";
export const tradeAsks: Record<TradeAsk, string> = { advantage: "절대 우위·비교 우위", cost: "기회비용 표", terms: "교역 조건 범위", gains: "특화와 무역 이익" };

const PAIRS: [string, string][] = [["쌀", "자동차"], ["옷", "컴퓨터"], ["밀", "반도체"], ["커피", "의약품"], ["치즈", "시계"]];
const NAMES: [string, string][] = [["갑국", "을국"], ["A국", "B국"]];

/** 기회비용이 서로 다른 정수 생산비 표를 만듭니다. */
function randomSetup(random: () => number, mode: TradeMode): TradeSetup {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  for (let tries = 0; tries < 40; tries += 1) {
    const values: [[number, number], [number, number]] = [[pick([1, 2, 3, 4, 5, 6]), pick([1, 2, 3, 4, 5, 6])], [pick([1, 2, 3, 4, 5, 6]), pick([1, 2, 3, 4, 5, 6])]];
    if (values[0][0] * values[1][1] === values[0][1] * values[1][0]) continue;
    const scale = mode === "hours" ? 1 : 10;
    const scaled = values.map(row => row.map(value => value * scale)) as [[number, number], [number, number]];
    return { countries: pick(NAMES), goods: pick(PAIRS), mode, values: scaled, labor: [60, 60] };
  }
  return { ...RICARDO };
}
const who = (setup: TradeSetup, country: number | null) => country === null ? "없음(같음)" : escapeHtml(setup.countries[country]);

export function tradeProblems(asks: TradeAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 173 + 29);
  const problems: SheetProblem[] = [];
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    const mode: TradeMode = random() < 0.5 ? "hours" : "output";
    const setup = randomSetup(random, mode);
    const result = analyzeTrade(setup);
    const [g0, g1] = setup.goods.map(escapeHtml);
    const [c0, c1] = setup.countries.map(escapeHtml);
    const topic = (country: number) => `${escapeHtml(setup.countries[country])}${particle(setup.countries[country], "은", "는")}`;
    const intro = `표는 ${c0}${particle(c0, "과", "와")} ${c1}${particle(c1, "이", "가")} ${g0}${particle(g0, "과", "와")} ${objectParticle(g1)} 생산할 때 ${unitLabel(mode)}이다. (두 나라는 노동만으로 생산하며, 생산비는 일정하다.)`;
    const low = result.cost[0][0] < result.cost[1][0] ? 0 : 1;
    if (ask === "advantage") {
      problems.push(problem(`${intro} 각 재화의 절대 우위국과 비교 우위국을 쓰시오.`,
        `${g0}: 절대 우위 ${who(setup, result.absolute[0])}, 비교 우위 ${who(setup, result.comparative[0])} / ${g1}: 절대 우위 ${who(setup, result.absolute[1])}, 비교 우위 ${who(setup, result.comparative[1])}`, { after: tradeTableHtml(setup), space: 12 }));
    } else if (ask === "cost") {
      problems.push(problem(`${intro} 두 나라에서 각 재화 1단위 생산의 기회비용을 구하시오.`,
        [0, 1].map(country => `${escapeHtml(setup.countries[country])}: ${g0} 1단위 = ${g1} ${costText(setup, country, 0)}단위, ${g1} 1단위 = ${g0} ${costText(setup, country, 1)}단위`).join(" / "), { after: tradeTableHtml(setup), space: 14 }));
    } else if (ask === "terms") {
      problems.push(problem(`${intro} 두 나라가 비교 우위 재화에 특화하여 교환할 때, 두 나라 모두 이익을 얻을 수 있는 교역 조건(${g0} 1단위와 교환되는 ${g1}의 양)의 범위를 쓰시오.`,
        `${g1} ${costText(setup, low, 0)}단위보다 많고 ${costText(setup, 1 - low, 0)}단위보다 적어야 해요 (두 나라의 ${g0} 1단위 기회비용 사이)`, { after: tradeTableHtml(setup), space: 12 }));
    } else {
      const first = result.comparative[0]!;
      problems.push(problem(`${intro} 두 나라가 무역을 하면 각각 어느 재화에 특화해야 하는지 쓰고, 특화의 이익이 생기는 까닭을 비교 우위로 설명하시오.`,
        `${topic(first)} ${g0}, ${topic(1 - first)} ${g1}에 특화 — 각자 기회비용이 더 작은 재화를 만들어 바꾸면 두 나라 모두 생산 가능 곡선 밖에서 소비할 수 있어요 (${escapeHtml(setup.countries[first])}의 ${g0} 기회비용 ${costText(setup, first, 0)} &lt; ${escapeHtml(setup.countries[1 - first])} ${costText(setup, 1 - first, 0)})`, { after: tradeTableHtml(setup), space: 16 }));
    }
  }
  return [{ heading: "비교 우위와 무역", problems }];
}

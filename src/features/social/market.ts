/* 경제: 직선 수요·공급(Qd = α − βP, Qs = γ + δP)으로 균형과 이동, 소비자·생산자 잉여, 가격 규제, 물품세를 계산하고 그래프·문제를 만듭니다. */
import { escapeHtml, grouped, num, plotSvg, problem, seededRandom, sheetTable, type PlotSeries, type SheetProblem, type SheetSection } from "./sheet";

/** 수요량 Qd = α − βP, 공급량 Qs = γ + δP */
export type Market = { alpha: number; beta: number; gamma: number; delta: number };
export const DEFAULT_MARKET: Market = { alpha: 120, beta: 2, gamma: 0, delta: 2 };

export const demandQ = (market: Market, price: number) => market.alpha - market.beta * price;
export const supplyQ = (market: Market, price: number) => market.gamma + market.delta * price;
/** 수요량이 0이 되는 가격 */
export const chokePrice = (market: Market) => market.alpha / market.beta;
/** 공급량이 0이 되는 가격(0보다 작으면 0) */
export const lowestPrice = (market: Market) => Math.max(0, -market.gamma / market.delta);

export function equilibrium(market: Market) {
  const price = (market.alpha - market.gamma) / (market.beta + market.delta);
  return { price, quantity: demandQ(market, price) };
}
/** 균형 가격과 거래량이 양수인 시장인지 봅니다. */
export function marketValid(market: Market) {
  if (!(market.beta > 0 && market.delta > 0)) return false;
  const { price, quantity } = equilibrium(market);
  return price > lowestPrice(market) && quantity > 0 && price > 0;
}
/** 수요·공급 곡선이 오른쪽(+)·왼쪽(−)으로 옮겨 간 시장입니다(같은 가격에서 수량이 늘거나 줆). */
export const shifted = (market: Market, demand: number, supply: number): Market => ({ ...market, alpha: market.alpha + demand, gamma: market.gamma + supply });

/** 소비자 잉여 = 수요 곡선 아래·균형 가격 위, 생산자 잉여 = 균형 가격 아래·공급 곡선 위의 넓이 */
export function surplus(market: Market) {
  const { price } = equilibrium(market);
  const top = chokePrice(market);
  const low = lowestPrice(market);
  const consumer = market.alpha * (top - price) - (market.beta * (top ** 2 - price ** 2)) / 2;
  const producer = market.gamma * (price - low) + (market.delta * (price ** 2 - low ** 2)) / 2;
  return { consumer, producer, total: consumer + producer };
}

/** 가격을 price로 묶었을 때(상한제·하한제) 수요량·공급량과 초과량 */
export function priceControl(market: Market, price: number) {
  const demand = Math.max(0, demandQ(market, price));
  const supply = Math.max(0, supplyQ(market, price));
  return { demand, supply, traded: Math.min(demand, supply), gap: demand - supply };
}

/** 생산자에게 단위당 tax원의 물품세를 매길 때 */
export function unitTax(market: Market, tax: number) {
  const before = equilibrium(market);
  const buyer = (market.alpha - market.gamma + market.delta * tax) / (market.beta + market.delta);
  const quantity = demandQ(market, buyer);
  const seller = buyer - tax;
  return { buyer, seller, quantity, revenue: tax * quantity, consumerShare: buyer - before.price, producerShare: before.price - seller, deadweight: (tax * (before.quantity - quantity)) / 2 };
}

/** Qd = 120 − 2P 처럼 적습니다. */
export function equationText(kind: "demand" | "supply", market: Market) {
  const coef = (value: number) => value === 1 ? "" : num(value, 2);
  if (kind === "demand") return `Q<sub>d</sub> = ${num(market.alpha, 2)} − ${coef(market.beta)}P`;
  if (market.gamma === 0) return `Q<sub>s</sub> = ${coef(market.delta)}P`;
  return market.gamma > 0 ? `Q<sub>s</sub> = ${num(market.gamma, 2)} + ${coef(market.delta)}P` : `Q<sub>s</sub> = −${num(-market.gamma, 2)} + ${coef(market.delta)}P`;
}

/* ───── 이동 요인 ───── */
export type Curve = "demand" | "supply";
export const MARKET_FACTORS: { factor: string; curve: Curve; up: boolean }[] = [
  { factor: "소득 증가(정상재)", curve: "demand", up: true },
  { factor: "소득 증가(열등재)", curve: "demand", up: false },
  { factor: "대체재 가격 상승", curve: "demand", up: true },
  { factor: "대체재 가격 하락", curve: "demand", up: false },
  { factor: "보완재 가격 상승", curve: "demand", up: false },
  { factor: "보완재 가격 하락", curve: "demand", up: true },
  { factor: "소비자의 선호(기호) 증가", curve: "demand", up: true },
  { factor: "소비자 수 증가", curve: "demand", up: true },
  { factor: "소비자의 가격 상승 예상", curve: "demand", up: true },
  { factor: "생산 기술 발달", curve: "supply", up: true },
  { factor: "원자재 등 생산 요소 가격 상승", curve: "supply", up: false },
  { factor: "생산 요소 가격 하락", curve: "supply", up: true },
  { factor: "공급자(기업) 수 증가", curve: "supply", up: true },
  { factor: "생산자의 가격 상승 예상", curve: "supply", up: false },
  { factor: "생산자에 대한 보조금 지급", curve: "supply", up: true },
];
export const curveName = (curve: Curve) => curve === "demand" ? "수요" : "공급";

type Direction = "상승" | "하락" | "변화 없음" | "알 수 없음";
const direction = (a: number, b: number): Direction => {
  if (a === 0 && b === 0) return "변화 없음";
  if (a === 0) return b > 0 ? "상승" : "하락";
  if (b === 0 || Math.sign(a) === Math.sign(b)) return a > 0 ? "상승" : "하락";
  return "알 수 없음";
};
/** 수요(+1 증가·−1 감소·0)와 공급이 함께 바뀔 때 균형 가격·거래량의 변화 */
export function combine(demand: number, supply: number) {
  const price = direction(Math.sign(demand), -Math.sign(supply));
  const quantity = direction(Math.sign(demand), Math.sign(supply)).replace("상승", "증가").replace("하락", "감소");
  return { price, quantity };
}
export const combineRows = ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const).map(([demand, supply]) => ({ demand, supply, ...combine(demand, supply) }));
const changeText = (value: number, curve: Curve) => value === 0 ? "" : `${curveName(curve)} ${value > 0 ? "증가" : "감소"}`;
export const combineLabel = (demand: number, supply: number) => [changeText(demand, "demand"), changeText(supply, "supply")].filter(Boolean).join(" + ");

/* ───── 그래프 ───── */
export type MarketMode = "shift" | "surplus" | "control" | "tax";
export type MarketGraph = { mode: MarketMode; demandShift?: number; supplyShift?: number; price?: number; tax?: number; width?: number; height?: number; blank?: boolean };

function demandLine(market: Market, xMax: number, yMax: number): [number, number][] {
  const from = Math.max(0, (market.alpha - xMax) / market.beta);
  const to = Math.min(chokePrice(market), yMax);
  return to > from ? [[demandQ(market, from), from], [demandQ(market, to), to]] : [];
}
function supplyLine(market: Market, xMax: number, yMax: number): [number, number][] {
  const from = lowestPrice(market);
  const to = Math.min(yMax, (xMax - market.gamma) / market.delta);
  return to > from ? [[supplyQ(market, from), from], [supplyQ(market, to), to]] : [];
}
const guide = (quantity: number, price: number): PlotSeries[] => [{ points: [[0, price], [quantity, price], [quantity, 0]] as [number, number][], color: "#9ca3af", dash: true, width: 1.2 }];

/** 수요·공급 그래프(가로축 수량, 세로축 가격)입니다. */
export function marketSvg(market: Market, graph: MarketGraph) {
  const after = graph.mode === "shift" ? shifted(market, graph.demandShift ?? 0, graph.supplyShift ?? 0) : graph.mode === "tax" ? { ...market, gamma: market.gamma - market.delta * (graph.tax ?? 0) } : market;
  const e0 = equilibrium(market);
  const e1 = equilibrium(after);
  const xMax = Math.max(market.alpha, after.alpha, e0.quantity * 1.6, e1.quantity * 1.6) * 1.05;
  const yMax = Math.max(chokePrice(market), chokePrice(after), e0.price * 1.6) * 1.08;
  const series: PlotSeries[] = [
    ...(graph.blank ? [] : guide(e0.quantity, e0.price)),
    { points: demandLine(market, xMax, yMax), color: "#2563eb", label: "D" },
    { points: supplyLine(market, xMax, yMax), color: "#dc2626", label: "S" },
  ];
  const dots: { at: [number, number]; label?: string; color?: string }[] = graph.blank ? [] : [{ at: [e0.quantity, e0.price], label: "E₀", color: "#111" }];
  const areas: { points: [number, number][]; color: string }[] = [];
  const f = (value: number) => value.toFixed(1);
  let extra: ((sx: (x: number) => number, sy: (y: number) => number) => string) | undefined;
  if (graph.mode === "shift" && (after.alpha !== market.alpha || after.gamma !== market.gamma)) {
    if (after.alpha !== market.alpha) series.push({ points: demandLine(after, xMax, yMax), color: "#2563eb", label: "D′", dash: true });
    if (after.gamma !== market.gamma) series.push({ points: supplyLine(after, xMax, yMax), color: "#dc2626", label: "S′", dash: true });
    if (!graph.blank && marketValid(after)) { series.push(...guide(e1.quantity, e1.price)); dots.push({ at: [e1.quantity, e1.price], label: "E₁", color: "#7c3aed" }); }
  }
  if (graph.mode === "surplus" && !graph.blank) {
    const low = lowestPrice(market);
    const top = Math.min(chokePrice(market), yMax);
    areas.push({ points: [[0, e0.price], [e0.quantity, e0.price], [demandQ(market, top), top], [0, top]], color: "rgba(37,99,235,.18)" });
    areas.push({ points: [[0, e0.price], [e0.quantity, e0.price], [supplyQ(market, low), low], [0, low]], color: "rgba(220,38,38,.16)" });
    extra = (sx, sy) => `<text x="${f(sx(e0.quantity * 0.28))}" y="${f(sy((e0.price + top) / 2 - (top - e0.price) * 0.1))}" font-size="11" font-weight="700" fill="#1d4ed8">소비자 잉여</text><text x="${f(sx(e0.quantity * 0.28))}" y="${f(sy((e0.price + low) / 2 + (e0.price - low) * 0.1))}" font-size="11" font-weight="700" fill="#b91c1c">생산자 잉여</text>`;
  }
  if (graph.mode === "control" && graph.price !== undefined) {
    const control = priceControl(market, graph.price);
    series.push({ points: [[0, graph.price], [xMax * 0.98, graph.price]], color: "#059669", width: 2 });
    if (!graph.blank) {
      dots.push({ at: [control.supply, graph.price], color: "#dc2626" }, { at: [control.demand, graph.price], color: "#2563eb" });
      const label = control.gap > 0 ? `초과 수요 ${num(control.gap, 2)}` : control.gap < 0 ? `초과 공급 ${num(-control.gap, 2)}` : "초과량 없음";
      extra = (sx, sy) => `<text x="${f(sx((control.demand + control.supply) / 2))}" y="${f(sy(graph.price!) + (control.gap > 0 ? 14 : -6))}" text-anchor="middle" font-size="11" font-weight="700" fill="#047857">${escapeHtml(label)}</text>`;
    }
  }
  if (graph.mode === "tax" && graph.tax) {
    const result = unitTax(market, graph.tax);
    series.push({ points: supplyLine(after, xMax, yMax), color: "#dc2626", label: "S+세금", dash: true });
    if (!graph.blank && result.quantity > 0) {
      areas.push({ points: [[0, result.seller], [result.quantity, result.seller], [result.quantity, result.buyer], [0, result.buyer]], color: "rgba(234,179,8,.28)" });
      series.push(...guide(result.quantity, result.buyer), ...guide(result.quantity, result.seller));
      dots.push({ at: [result.quantity, result.buyer], label: "E₁", color: "#7c3aed" });
      extra = (sx, sy) => `<text x="${f(sx(result.quantity / 2))}" y="${f(sy((result.buyer + result.seller) / 2) + 4)}" text-anchor="middle" font-size="11" font-weight="700" fill="#854d0e">조세 수입</text>`;
    }
  }
  return plotSvg({ xLabel: "수량", yLabel: "가격", xMax, yMin: 0, yMax, series, dots, areas, extra, width: graph.width ?? 420, height: graph.height ?? 300, hideTicks: graph.blank });
}

/** 가격별 수요량·공급량 표(HTML) */
export function scheduleHtml(market: Market, prices: number[]) {
  return sheetTable(["가격(원)", ...prices.map(price => grouped(price, 2))], [
    ["수요량(개)", ...prices.map(price => grouped(Math.max(0, demandQ(market, price)), 2))],
    ["공급량(개)", ...prices.map(price => grouped(Math.max(0, supplyQ(market, price)), 2))],
  ], { font: "9.5pt" });
}

/* ───── 문제 ───── */
export type MarketAsk = "equilibrium" | "table" | "shift" | "surplus" | "control" | "tax";
export const marketAsks: Record<MarketAsk, string> = { equilibrium: "균형 가격·거래량(식)", table: "수요·공급 표", shift: "수요·공급 변화 판단", surplus: "소비자·생산자 잉여", control: "가격 상한제·하한제", tax: "물품세 부담" };

/** 균형 가격·거래량이 정수가 되는 시장을 고릅니다. */
function niceMarket(random: () => number, zeroSupply = false): Market {
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const price = pick([10, 20, 30, 40, 50]);
  const beta = pick([1, 2, 3, 4]);
  const delta = pick([1, 2, 3]);
  const quantity = zeroSupply ? delta * price : pick([40, 60, 80, 100, 120]);
  return { alpha: quantity + beta * price, beta, gamma: quantity - delta * price, delta };
}

export function marketProblems(asks: MarketAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 131 + 17);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "equilibrium") {
      const market = niceMarket(random);
      const { price, quantity } = equilibrium(market);
      problems.push(problem(`어떤 재화의 수요 함수와 공급 함수가 다음과 같다. 균형 가격과 균형 거래량을 구하시오. (P: 가격(원), Q: 수량(개))<br>${equationText("demand", market)}, &nbsp; ${equationText("supply", market)}`,
        `균형 가격 ${grouped(price, 2)}원, 균형 거래량 ${grouped(quantity, 2)}개 (Q<sub>d</sub> = Q<sub>s</sub>로 놓고 풉니다)`, { space: 16 }));
    } else if (ask === "table") {
      const market = niceMarket(random);
      const { price, quantity } = equilibrium(market);
      const step = pick([5, 10]);
      const prices = [-2, -1, 0, 1, 2].map(k => price + k * step).filter(value => value > 0);
      const high = price + step;
      const over = priceControl(market, high);
      problems.push(problem(`표는 가격에 따른 어떤 재화의 수요량과 공급량이다. (1) 균형 가격과 균형 거래량을 쓰고, (2) 가격이 ${grouped(high, 2)}원일 때 나타나는 현상과 그 양을 쓰시오.`,
        `(1) 균형 가격 ${grouped(price, 2)}원, 균형 거래량 ${grouped(quantity, 2)}개 (2) 초과 공급 ${grouped(-over.gap, 2)}개 (공급량 ${grouped(over.supply, 2)} − 수요량 ${grouped(over.demand, 2)}) → 가격이 내려가요`, { after: scheduleHtml(market, prices), space: 14 }));
    } else if (ask === "shift") {
      const demandFactor = pick(MARKET_FACTORS.filter(item => item.curve === "demand"));
      const supplyFactor = pick(MARKET_FACTORS.filter(item => item.curve === "supply"));
      const both = random() < 0.6;
      const useDemand = both || random() < 0.5;
      const factors = both ? [demandFactor, supplyFactor] : [useDemand ? demandFactor : supplyFactor];
      const d = factors.find(item => item.curve === "demand");
      const s = factors.find(item => item.curve === "supply");
      const dv = d ? (d.up ? 1 : -1) : 0;
      const sv = s ? (s.up ? 1 : -1) : 0;
      const result = combine(dv, sv);
      const good = pick(["커피", "라면", "자전거", "딸기", "운동화", "휴대 전화"]);
      problems.push(problem(`${escapeHtml(good)} 시장에서 다음 변화가 나타났다. 균형 가격과 균형 거래량은 어떻게 변하는지 쓰시오. (다른 조건은 일정하다.)<br>${factors.map(item => `· ${escapeHtml(item.factor)}`).join("<br>")}`,
        `${combineLabel(dv, sv)} → 가격 ${result.price}, 거래량 ${result.quantity}${result.price === "알 수 없음" || result.quantity === "알 수 없음" ? " (두 곡선이 움직인 크기에 따라 달라요)" : ""}`, { space: 12 }));
    } else if (ask === "surplus") {
      const market = niceMarket(random, true);
      const { price, quantity } = equilibrium(market);
      const result = surplus(market);
      problems.push(problem(`수요 함수가 ${equationText("demand", market)}, 공급 함수가 ${equationText("supply", market)}일 때 균형에서의 소비자 잉여와 생산자 잉여를 구하시오.`,
        `균형 (P = ${grouped(price, 2)}, Q = ${grouped(quantity, 2)}) → 소비자 잉여 ½ × ${grouped(quantity, 2)} × (${grouped(chokePrice(market), 2)} − ${grouped(price, 2)}) = ${grouped(result.consumer, 2)}, 생산자 잉여 ½ × ${grouped(quantity, 2)} × ${grouped(price, 2)} = ${grouped(result.producer, 2)}`,
        { space: 18, figure: marketSvg(market, { mode: "surplus", blank: true, width: 320, height: 230 }) }));
    } else if (ask === "control") {
      const market = niceMarket(random);
      const { price } = equilibrium(market);
      const ceiling = random() < 0.5;
      const gap = pick([5, 10]);
      const control = ceiling ? price - gap : price + gap;
      const result = priceControl(market, control);
      problems.push(problem(`${equationText("demand", market)}, ${equationText("supply", market)}인 시장에서 정부가 가격을 ${grouped(control, 2)}원으로 묶는 가격 ${ceiling ? "상한제" : "하한제"}를 실시하였다. 초과 ${ceiling ? "수요" : "공급"}량과 실제 거래량을 구하시오.`,
        `균형 가격 ${grouped(price, 2)}원 → 수요량 ${grouped(result.demand, 2)}, 공급량 ${grouped(result.supply, 2)} → 초과 ${ceiling ? "수요" : "공급"} ${grouped(Math.abs(result.gap), 2)}개, 거래량 ${grouped(result.traded, 2)}개 (${ceiling ? "암시장이 생길 수 있어요" : "팔리지 않는 물건이 남아요"})`, { space: 14 }));
    } else {
      const market = niceMarket(random);
      const tax = (market.beta + market.delta) * pick([1, 2, 5]);
      const result = unitTax(market, tax);
      if (result.quantity <= 0) continue;
      problems.push(problem(`${equationText("demand", market)}, ${equationText("supply", market)}인 시장에서 정부가 생산자에게 1개당 ${grouped(tax, 2)}원의 물품세를 부과하였다. 소비자가 내는 가격, 생산자가 받는 가격, 거래량, 조세 수입을 구하고, 세금을 누가 얼마나 부담하는지 쓰시오.`,
        `소비자 가격 ${grouped(result.buyer, 2)}원, 생산자 수취 가격 ${grouped(result.seller, 2)}원, 거래량 ${grouped(result.quantity, 2)}개, 조세 수입 ${grouped(result.revenue, 2)}원. 1개당 소비자 ${grouped(result.consumerShare, 2)}원·생산자 ${grouped(result.producerShare, 2)}원 부담 (가격에 덜 민감한 쪽이 더 많이 부담)`, { space: 18 }));
    }
  }
  return [{ heading: "수요와 공급", problems }];
}

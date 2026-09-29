/* 경제: 국민 경제 지표. 명목·실질 GDP와 GDP 디플레이터, 경제 성장률, 물가 지수, 고용 지표(실업률·고용률·경제 활동 참가율), 환율 변동과 환전 계산입니다. */
import { escapeHtml, grouped, num, percent, problem, seededRandom, sheetTable, won, type SheetProblem, type SheetSection } from "./sheet";

/** 한 재화의 기준 연도(1)와 비교 연도(2) 가격·생산량 */
export type Good = { name: string; p1: number; q1: number; p2: number; q2: number };
export const DEFAULT_GOODS: Good[] = [
  { name: "빵", p1: 1000, q1: 100, p2: 1200, q2: 110 },
  { name: "우유", p1: 2000, q1: 50, p2: 2000, q2: 60 },
];

/** 기준 연도는 1년 차입니다. 실질 GDP는 기준 연도 가격으로 계산합니다. */
export function gdp(goods: Good[]) {
  const sum = (value: (good: Good) => number) => goods.reduce((total, good) => total + value(good), 0);
  const nominal1 = sum(good => good.p1 * good.q1);
  const nominal2 = sum(good => good.p2 * good.q2);
  const real1 = nominal1;
  const real2 = sum(good => good.p1 * good.q2);
  const deflator1 = 100;
  const deflator2 = real2 ? (nominal2 / real2) * 100 : 0;
  return { nominal1, nominal2, real1, real2, deflator1, deflator2, growth: real1 ? real2 / real1 - 1 : 0, inflation: deflator2 / deflator1 - 1 };
}
export function gdpTableHtml(goods: Good[], blank = false) {
  return sheetTable(["재화", "1년 차 가격(원)", "1년 차 생산량", "2년 차 가격(원)", "2년 차 생산량"], goods.map(good => [escapeHtml(good.name), grouped(good.p1), grouped(good.q1), blank ? "" : grouped(good.p2), grouped(good.q2)]), { font: "9.5pt" });
}

/** 15세 이상 인구, 취업자, 실업자(만 명 등 같은 단위) */
export type Labor = { population: number; employed: number; unemployed: number };
export const DEFAULT_LABOR: Labor = { population: 1000, employed: 600, unemployed: 40 };
export function laborStats(labor: Labor) {
  const force = labor.employed + labor.unemployed;
  return {
    force, inactive: labor.population - force,
    unemployment: force ? labor.unemployed / force : 0,
    employment: labor.population ? labor.employed / labor.population : 0,
    participation: labor.population ? force / labor.population : 0,
  };
}
/** 경제 활동 인구·비경제 활동 인구에 드는 예(통계청 경제 활동 인구 조사 기준 개념) */
export const LABOR_EXAMPLES: { who: string; group: "취업자" | "실업자" | "비경제 활동 인구" }[] = [
  { who: "주 1시간 이상 돈을 벌려고 일한 아르바이트 대학생", group: "취업자" },
  { who: "일시적으로 휴직 중인 회사원", group: "취업자" },
  { who: "가족이 운영하는 가게에서 주 18시간 이상 무급으로 일한 사람", group: "취업자" },
  { who: "지난 4주 동안 구직 활동을 했고 바로 일할 수 있는 사람", group: "실업자" },
  { who: "일할 뜻 없이 집안일만 하는 전업주부", group: "비경제 활동 인구" },
  { who: "취업 준비 없이 학교에 다니는 학생", group: "비경제 활동 인구" },
  { who: "일자리를 찾다가 포기한 구직 단념자", group: "비경제 활동 인구" },
];

/* ───── 환율 ───── */
/** 원/달러 환율이 from에서 to로 바뀔 때 */
export function exchangeChange(from: number, to: number) {
  const change = to / from - 1;
  // 1원으로 살 수 있는 달러(원화 가치)의 변화율
  const wonValue = from / to - 1;
  return { change, wonValue, up: to > from };
}
/** 환율 상승(원화 가치 하락) 때의 영향. 환율 하락 때는 반대입니다. */
export const EXCHANGE_EFFECTS: { item: string; rise: string; fall: string }[] = [
  { item: "수출", rise: "수출품의 달러 표시 가격이 내려가 수출이 늘어나기 쉬워요", fall: "수출품의 달러 표시 가격이 올라 수출이 줄어들기 쉬워요" },
  { item: "수입", rise: "수입품의 원화 표시 가격이 올라 수입이 줄어들기 쉬워요", fall: "수입품의 원화 표시 가격이 내려가 수입이 늘어나기 쉬워요" },
  { item: "국내 물가", rise: "수입 원자재 가격이 올라 물가가 오르기 쉬워요", fall: "수입 원자재 가격이 내려가 물가 안정에 도움이 돼요" },
  { item: "외채 상환", rise: "달러로 빌린 돈을 갚는 원화 부담이 커져요", fall: "달러로 빌린 돈을 갚는 원화 부담이 줄어요" },
  { item: "해외여행·유학", rise: "우리 국민의 해외여행·유학 비용이 늘어나요", fall: "우리 국민의 해외여행·유학 비용이 줄어요" },
  { item: "외국인 관광객", rise: "외국인의 국내 여행 비용이 줄어 관광객이 늘기 쉬워요", fall: "외국인의 국내 여행 비용이 늘어나요" },
];

/* ───── 문제 ───── */
export type IndicatorAsk = "gdp" | "growth" | "price" | "labor" | "laborGroup" | "exchange";
export const indicatorAsks: Record<IndicatorAsk, string> = { gdp: "명목·실질 GDP", growth: "경제 성장률", price: "물가 지수·상승률", labor: "고용 지표 계산", laborGroup: "경제 활동 인구 구분", exchange: "환율 변동·환전" };

export function indicatorProblems(asks: IndicatorAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 211 + 37);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const goods = (): Good[] => [
    { name: pick(["쌀", "빵", "사과"]), p1: pick([10, 20]) * 100, q1: pick([10, 20]) * 10, p2: 0, q2: 0 },
    { name: pick(["옷", "신발", "책"]), p1: pick([20, 50]) * 100, q1: pick([5, 10]) * 10, p2: 0, q2: 0 },
  ].map(good => ({ ...good, p2: good.p1 * pick([1, 1.1, 1.2, 1.5]), q2: good.q1 * pick([1, 1.1, 1.2]) }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "gdp" || ask === "growth") {
      const list = goods();
      const result = gdp(list);
      if (ask === "gdp") problems.push(problem(`표는 두 재화만 생산하는 어느 나라의 자료이다. 1년 차를 기준 연도로 할 때 2년 차의 명목 GDP, 실질 GDP, GDP 디플레이터를 구하시오.`,
        `명목 GDP ${won(result.nominal2)} (2년 차 가격 × 2년 차 생산량), 실질 GDP ${won(result.real2)} (기준 연도 가격 × 2년 차 생산량), GDP 디플레이터 ${num(result.deflator2, 1)} (명목 ÷ 실질 × 100)`, { after: gdpTableHtml(list), space: 16 }));
      else problems.push(problem(`표의 자료로 1년 차를 기준 연도로 할 때 2년 차의 경제 성장률(실질 GDP 증가율)과 물가 상승률(GDP 디플레이터 기준)을 구하시오.`,
        `실질 GDP ${won(result.real1)} → ${won(result.real2)}, 경제 성장률 ${percent(result.growth)} / 디플레이터 100 → ${num(result.deflator2, 1)}, 물가 상승률 ${percent(result.inflation)}`, { after: gdpTableHtml(list), space: 16 }));
    } else if (ask === "price") {
      const base = pick([100, 102, 105, 110]);
      const next = base * pick([1.02, 1.03, 1.05, 1.1]);
      problems.push(problem(`어느 해 소비자 물가 지수가 ${num(base, 1)}이고 다음 해 ${num(next, 2)}이다. 물가 상승률을 구하고, 같은 돈으로 살 수 있는 물건의 양(화폐의 구매력)이 어떻게 되는지 쓰시오.`,
        `물가 상승률 = (${num(next, 2)} − ${num(base, 1)}) ÷ ${num(base, 1)} × 100 = ${num((next / base - 1) * 100, 1)}% → 화폐의 구매력이 떨어져요`, { space: 10 }));
    } else if (ask === "labor") {
      const population = pick([500, 800, 1000, 2000]);
      const force = population * pick([0.5, 0.6, 0.625, 0.75]);
      const unemployed = force * pick([0.04, 0.05, 0.08, 0.1]);
      const stats = laborStats({ population, employed: force - unemployed, unemployed });
      problems.push(problem(`어느 나라의 15세 이상 인구는 ${grouped(population)}만 명, 취업자는 ${grouped(force - unemployed, 1)}만 명, 실업자는 ${grouped(unemployed, 1)}만 명이다. 경제 활동 인구, 비경제 활동 인구, 실업률, 고용률, 경제 활동 참가율을 구하시오.`,
        `경제 활동 인구 ${grouped(stats.force, 1)}만 명, 비경제 활동 인구 ${grouped(stats.inactive, 1)}만 명, 실업률 ${percent(stats.unemployment)} (실업자 ÷ 경제 활동 인구), 고용률 ${percent(stats.employment)} (취업자 ÷ 15세 이상 인구), 참가율 ${percent(stats.participation)}`, { space: 16 }));
    } else if (ask === "laborGroup") {
      const item = pick(LABOR_EXAMPLES);
      problems.push(problem(`다음 사람은 취업자, 실업자, 비경제 활동 인구 가운데 어디에 속하는지 쓰시오. (15세 이상)<br>“${escapeHtml(item.who)}”`, item.group, { space: 6 }));
    } else {
      const from = pick([1100, 1200, 1300, 1400]);
      const to = from + pick([-200, -100, 100, 200]);
      const dollars = pick([100, 500, 1000]);
      const result = exchangeChange(from, to);
      problems.push(problem(`원/달러 환율이 ${grouped(from)}원에서 ${grouped(to)}원으로 바뀌었다. (1) 원화 가치는 어떻게 되었는지, (2) ${grouped(dollars)}달러짜리 수입품의 원화 가격 변화, (3) 우리나라 수출에 미치는 영향을 쓰시오.`,
        `(1) 원화 가치 ${result.up ? "하락(평가 절하)" : "상승(평가 절상)"} (2) ${won(dollars * from)} → ${won(dollars * to)} (3) ${result.up ? "수출품의 달러 표시 가격이 내려가 수출에 유리" : "수출품의 달러 표시 가격이 올라 수출에 불리"}`, { space: 14 }));
    }
  }
  return [{ heading: "국민 경제 지표와 환율", problems }];
}

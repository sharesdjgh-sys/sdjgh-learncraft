/* 사회 교과 도구 · 경제(수요와 공급, 기회비용, 비교 우위, 금융, 경제 지표)의 계산과 학습지를 확인합니다. npx tsx scripts/verify-social-economy.ts */
import assert from "node:assert/strict";
import { choiceAsks, choiceProblems, DEFAULT_ALTERNATIVES, evaluateChoices, marginalTable } from "../src/features/social/choice";
import { compoundTotal, financeAsks, financeProblems, interestSvg, loanSchedule, productTableHtml, realRate, rule72, savingsTotal, simpleTotal } from "../src/features/social/finance";
import { DEFAULT_GOODS, DEFAULT_LABOR, exchangeChange, gdp, indicatorAsks, indicatorProblems, laborStats } from "../src/features/social/indicators";
import { combine, DEFAULT_MARKET, equilibrium, marketAsks, marketProblems, marketSvg, priceControl, shifted, surplus, unitTax } from "../src/features/social/market";
import { problemSheetHtml, problemSheetText, type SheetSection } from "../src/features/social/sheet";
import { analyzeTrade, costText, ppfSvg, RICARDO, tradeAsks, tradeGains, tradeProblems } from "../src/features/social/trade";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
/** 학습지에 계산 오류(NaN 등)가 없고, 정답이 붙고, 한글 복사에는 그림이 빠지는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length || section.intro), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  const bad = (html + text).match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
  assert.ok(!bad, `${label}: 계산이 비었어요 → ${bad?.[0]}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 SVG를 넣지 않아요`);
  for (const section of sections) for (const problem of section.problems) assert.ok(problem.answerText.trim(), `${label}: 빈 정답`);
}
const seeds = [1, 2, 3, 7, 11];

check("수요와 공급: 균형·잉여·가격 규제·물품세·변화 판단", () => {
  const e = equilibrium(DEFAULT_MARKET);
  close(e.price, 30, "균형 가격"); close(e.quantity, 60, "균형 거래량");
  const s = surplus(DEFAULT_MARKET);
  close(s.consumer, 900, "소비자 잉여"); close(s.producer, 900, "생산자 잉여");
  // 공급 곡선이 가격 0보다 위에서 시작하는 경우(Qs = −20 + 2P): 생산자 잉여 = ½ × (P* − 10) × Q*
  const high = { alpha: 100, beta: 2, gamma: -20, delta: 2 };
  close(equilibrium(high).price, 30, "균형 가격 2"); close(surplus(high).producer, 0.5 * 20 * 40, "생산자 잉여 2");
  const ceiling = priceControl(DEFAULT_MARKET, 20);
  close(ceiling.gap, 40, "초과 수요"); close(ceiling.traded, 40, "상한제 거래량");
  close(priceControl(DEFAULT_MARKET, 40).gap, -40, "초과 공급");
  const tax = unitTax(DEFAULT_MARKET, 8);
  close(tax.buyer, 34, "소비자 가격"); close(tax.seller, 26, "생산자 가격"); close(tax.quantity, 52, "세후 거래량"); close(tax.revenue, 416, "조세 수입"); close(tax.deadweight, 32, "줄어든 잉여");
  close(tax.consumerShare + tax.producerShare, 8, "세금 부담 합");
  const moved = equilibrium(shifted(DEFAULT_MARKET, 20, 0));
  assert.ok(moved.price > e.price && moved.quantity > e.quantity, "수요 증가 → 가격·거래량 증가");
  assert.deepEqual(combine(1, -1), { price: "상승", quantity: "알 수 없음" });
  assert.deepEqual(combine(1, 1), { price: "알 수 없음", quantity: "증가" });
  assert.deepEqual(combine(0, -1), { price: "상승", quantity: "감소" });
  assert.deepEqual(combine(-1, 1), { price: "하락", quantity: "알 수 없음" });
  for (const mode of ["shift", "surplus", "control", "tax"] as const) assert.ok(marketSvg(DEFAULT_MARKET, { mode, demandShift: 20, supplyShift: -10, price: 20, tax: 8 }).startsWith("<svg"), mode);
  for (const seed of seeds) sheetOk(marketProblems(keys(marketAsks), 3, seed), `수요와 공급 ${seed}`);
});

check("기회비용·선택: 암묵적 비용·순편익·한계 분석", () => {
  const results = evaluateChoices(DEFAULT_ALTERNATIVES);
  const job = results[1];
  assert.equal(job.implicit, 40000); assert.equal(job.opportunity, 45000); assert.equal(job.net, 5000); assert.ok(job.rational);
  assert.equal(results.filter(row => row.rational).length, 1, "합리적 선택은 하나");
  assert.equal(results[0].net, 30000 - 12000 - 45000);
  const { best } = marginalTable([10, 8, 6, 4, 2], [2, 3, 4, 5, 6]);
  assert.equal(best.quantity, 3); assert.equal(best.net, 15);
  for (const seed of seeds) sheetOk(choiceProblems(keys(choiceAsks), 3, seed), `기회비용 ${seed}`);
});

check("비교 우위·무역: 리카도 예와 무역 이익", () => {
  const result = analyzeTrade(RICARDO);
  assert.deepEqual(result.absolute, [1, 1], "포르투갈이 두 재화 모두 절대 우위");
  assert.deepEqual(result.comparative, [0, 1], "영국 옷감, 포르투갈 포도주");
  close(result.range[0], 100 / 120, "교역 조건 아래"); close(result.range[1], 90 / 80, "교역 조건 위");
  assert.equal(costText(RICARDO, 0, 0), "5/6"); assert.equal(costText(RICARDO, 1, 0), "9/8");
  const gains = tradeGains(RICARDO, 1, 1)!;
  assert.deepEqual(gains.beyond, [true, true], "두 나라 모두 생산 가능 곡선 밖에서 소비");
  close(gains.consume[0][0], 1.2, "영국 옷감 소비"); close(gains.consume[1][1], 1.125, "포르투갈 포도주 소비");
  // 같은 노동으로 만드는 양으로 적어도 같은 결과
  const output = { ...RICARDO, mode: "output" as const, values: [[1 / 100, 1 / 120], [1 / 90, 1 / 80]] as [[number, number], [number, number]] };
  assert.deepEqual(analyzeTrade(output).comparative, [0, 1], "생산량 표시");
  assert.equal(analyzeTrade({ ...RICARDO, values: [[2, 4], [3, 6]] }).comparative[0], null, "기회비용이 같으면 비교 우위 없음");
  assert.ok(ppfSvg(RICARDO, 0, [1.2, 1]).startsWith("<svg"));
  for (const seed of seeds) sheetOk(tradeProblems(keys(tradeAsks), 3, seed), `비교 우위 ${seed}`);
});

check("금융: 단리·복리·적금·대출·실질 이자율", () => {
  close(simpleTotal(1_000_000, 0.05, 10), 1_500_000, "단리");
  close(compoundTotal(1_000_000, 0.1, 2), 1_210_000, "복리");
  close(rule72(6), 12, "72의 법칙");
  const savings = savingsTotal(100_000, 0.036, 12, "simple");
  close(savings.interest, 23_400, "적금 이자"); close(savings.afterTax, 1_200_000 + 23_400 * 0.846, "세후 수령액");
  assert.ok(savingsTotal(100_000, 0.036, 12, "compound").interest > savings.interest, "월 복리가 단리보다 많음");
  const flat = loanSchedule(12_000_000, 0.12, 12, "principal");
  close(flat.totalInterest, 780_000, "원금 균등 총이자"); close(flat.first, 1_120_000, "원금 균등 첫 달");
  close(loanSchedule(12_000_000, 0.12, 12, "bullet").totalInterest, 1_440_000, "만기 일시 총이자");
  const annuity = loanSchedule(12_000_000, 0.12, 12, "annuity");
  close(annuity.first, 1_066_185.5, "원리금 균등 월 상환액", 1);
  assert.ok(annuity.rows.every(row => Math.abs(row.payment - annuity.first) < 1e-6), "원리금 균등은 매달 같음");
  close(annuity.rows[annuity.rows.length - 1].balance, 0, "원리금 균등 잔액", 1e-3);
  assert.ok(flat.totalInterest < annuity.totalInterest && annuity.totalInterest < 1_440_000, "총이자 순서");
  close(realRate(0.05, 0.02).approx, 0.03, "실질 이자율");
  assert.ok(interestSvg(1_000_000, 0.05, 10).startsWith("<svg"));
  assert.ok(productTableHtml().includes("예금자 보호"));
  for (const seed of seeds) sheetOk(financeProblems(keys(financeAsks), 2, seed), `금융 ${seed}`);
});

check("경제 지표: GDP·디플레이터·고용·환율", () => {
  const result = gdp(DEFAULT_GOODS);
  close(result.nominal2, 252_000, "명목 GDP"); close(result.real2, 230_000, "실질 GDP");
  close(result.deflator2, (252_000 / 230_000) * 100, "디플레이터"); close(result.growth, 0.15, "경제 성장률");
  const stats = laborStats(DEFAULT_LABOR);
  close(stats.unemployment, 0.0625, "실업률"); close(stats.employment, 0.6, "고용률"); close(stats.participation, 0.64, "참가율"); close(stats.inactive, 360, "비경제 활동 인구");
  const exchange = exchangeChange(1300, 1400);
  assert.ok(exchange.up && exchange.wonValue < 0, "환율 상승 = 원화 가치 하락");
  close(exchange.change, 100 / 1300, "환율 변화율");
  for (const seed of seeds) sheetOk(indicatorProblems(keys(indicatorAsks), 2, seed), `경제 지표 ${seed}`);
});

console.log(`\n경제 도구 ${checks}개 항목을 확인했어요.`);

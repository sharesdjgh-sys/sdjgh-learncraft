"use client";

import { z } from "zod";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  afterTax, compoundTotal, DEPOSIT_PROTECTION, doublingYears, financeAsks, financeProblems, interestSvg, INTEREST_TAX, loanSchedule, productTableHtml, realRate, repaymentNames,
  repaymentNotes, rule72, savingsTotal, scheduleTableHtml, simpleTotal, type FinanceAsk, type Repayment,
} from "@/features/social/finance";
import { DEFAULT_GOODS, DEFAULT_LABOR, EXCHANGE_EFFECTS, exchangeChange, gdp, indicatorAsks, indicatorProblems, LABOR_EXAMPLES, laborStats, type IndicatorAsk } from "@/features/social/indicators";
import { grouped, num, percent, won } from "@/features/social/sheet";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, fieldClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";

/* ───── 금융·자산 관리 ───── */
const financeSchema = z.object({
  principal: z.number().positive().max(1e13).catch(1_000_000), rate: z.number().min(0).max(100).catch(5), years: z.number().int().min(1).max(50).catch(10),
  monthly: z.number().positive().max(1e10).catch(100_000), savingsRate: z.number().min(0).max(100).catch(3.6), months: z.number().int().min(1).max(120).catch(12), savingsKind: z.enum(["simple", "compound"]).catch("simple"),
  loan: z.number().positive().max(1e13).catch(12_000_000), loanRate: z.number().min(0).max(100).catch(12), loanMonths: z.number().int().min(1).max(480).catch(12), repayment: z.enum(["annuity", "principal", "bullet"]).catch("principal"),
  inflation: z.number().min(-50).max(100).catch(2),
  asks: asksSchema(financeAsks, ["interest", "rule72", "savings", "loan", "tax"]), sheet: sheetSchema(1),
});
export function FinanceView() {
  const [state, update] = useStored("learncraft_social_finance_v1", financeSchema);
  const rate = state.rate / 100;
  const savings = savingsTotal(state.monthly, state.savingsRate / 100, state.months, state.savingsKind);
  const loans = (["annuity", "principal", "bullet"] as Repayment[]).map(kind => ({ kind, ...loanSchedule(state.loan, state.loanRate / 100, state.loanMonths, kind) }));
  const chosen = loans.find(item => item.kind === state.repayment)!;
  const real = realRate(rate, state.inflation / 100);
  return (
    <ToolLayout aside={<>
      <Card title="예금(단리·복리)">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="원금" unit="원" value={state.principal} min={1} max={1e13} step={10000} onChange={principal => update({ principal })} />
          <NumberField label="연 이자율" unit="%" value={state.rate} min={0} max={100} step={0.1} onChange={value => update({ rate: value })} />
          <NumberField label="기간" unit="년" value={state.years} min={1} max={50} onChange={years => update({ years: Math.round(years) })} />
        </div>
        <NumberField className="mt-2" label="물가 상승률(실질 이자율)" unit="%" value={state.inflation} min={-50} max={100} step={0.1} onChange={inflation => update({ inflation })} />
      </Card>
      <Card title="정기 적금">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="매달" unit="원" value={state.monthly} min={1} max={1e10} step={10000} onChange={monthly => update({ monthly })} />
          <NumberField label="연 이자율" unit="%" value={state.savingsRate} min={0} max={100} step={0.1} onChange={savingsRate => update({ savingsRate })} />
          <NumberField label="기간" unit="개월" value={state.months} min={1} max={120} onChange={months => update({ months: Math.round(months) })} />
        </div>
        <div className="mt-2"><Segmented label="이자 계산" value={state.savingsKind} onChange={savingsKind => update({ savingsKind })} options={[{ value: "simple", label: "단리" }, { value: "compound", label: "월 복리" }]} /></div>
      </Card>
      <Card title="대출">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="빌린 돈" unit="원" value={state.loan} min={1} max={1e13} step={100000} onChange={loan => update({ loan })} />
          <NumberField label="연 이자율" unit="%" value={state.loanRate} min={0} max={100} step={0.1} onChange={loanRate => update({ loanRate })} />
          <NumberField label="기간" unit="개월" value={state.loanMonths} min={1} max={480} onChange={loanMonths => update({ loanMonths: Math.round(loanMonths) })} />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 금융 생활과 자산 관리)">
        <MultiChips options={financeAsks} value={state.asks} onChange={asks => update({ asks: asks as FinanceAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="단리와 복리" svg={interestSvg(state.principal, rate, state.years)} />
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={`단리 ${state.years}년 뒤`} value={won(simpleTotal(state.principal, rate, state.years))} />
            <Stat label={`복리 ${state.years}년 뒤`} value={won(compoundTotal(state.principal, rate, state.years))} />
            <Stat label="72의 법칙" value={rate > 0 ? `약 ${num(rule72(state.rate), 1)}년` : "—"} note={rate > 0 ? `실제 ${num(doublingYears(rate), 1)}년에 두 배` : "이자율을 넣어 주세요"} />
            <Stat label="실질 이자율" value={`${num(real.approx * 100, 2)}%`} note={`명목 ${num(state.rate, 2)}% − 물가 ${num(state.inflation, 2)}% (근삿값)`} />
          </div>
          <p className="text-[.74rem] leading-5 text-ink-4">단리는 원금에만, 복리는 원금과 이자에 다시 이자가 붙어요. 이자 소득세는 {num(INTEREST_TAX * 100, 1)}%(소득세 14% + 지방 소득세 1.4%)예요. 1년 복리 이자를 세후로 받으면 {won(afterTax(compoundTotal(state.principal, rate, 1) - state.principal))}이에요.</p>
        </div>
      </section>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-ink">정기 적금 만기</h2>
          <div className="grid grid-cols-3 gap-2"><Stat label="넣은 원금" value={won(savings.principal)} /><Stat label="세전 이자" value={won(savings.interest)} /><Stat label="세후 받는 돈" value={won(savings.afterTax)} /></div>
          <p className="text-[.74rem] leading-5 text-ink-4">매달 초에 넣는다고 보고, 첫 달에 넣은 돈은 {state.months}개월, 마지막 달에 넣은 돈은 1개월 치 이자를 받아요.</p>
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-ink">예금자 보호 제도</h2>
          <p className="text-[.8rem] leading-6 text-ink-3">금융 회사가 파산해도 예금 보험 공사가 <b className="text-ink">{DEPOSIT_PROTECTION.since}부터 금융 회사별 1인당 원금과 이자를 합해 {grouped(DEPOSIT_PROTECTION.limit / 1e8)}억 원</b>까지 돌려줘요(이전 {grouped(DEPOSIT_PROTECTION.before / 1e4)}만 원). 은행 예금·적금은 보호되지만 주식·채권·펀드 같은 투자 상품은 보호되지 않아요.</p>
        </div>
      </section>
      <section className={`${panelClass} space-y-3`}>
        <h2 className="text-sm font-extrabold text-ink">대출 상환 방식 비교</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">방식</th><th className="px-2 py-1.5">첫 달 상환액</th><th className="px-2 py-1.5">마지막 달 상환액</th><th className="px-2 py-1.5">총이자</th></tr></thead>
            <tbody>{loans.map(item => <tr key={item.kind} className={`border-t border-line text-center ${item.kind === state.repayment ? "bg-brand-page font-bold" : ""}`}>
              <td className="px-2 py-1 text-left"><button type="button" onClick={() => update({ repayment: item.kind })} className="underline-offset-2 hover:underline">{repaymentNames[item.kind]}</button></td>
              <td className="px-2 py-1">{won(item.first)}</td><td className="px-2 py-1">{won(item.rows[item.rows.length - 1].payment)}</td><td className="px-2 py-1">{won(item.totalInterest)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <Segmented label="상환표" value={state.repayment} onChange={repayment => update({ repayment })} options={(["annuity", "principal", "bullet"] as Repayment[]).map(value => ({ value, label: repaymentNames[value] }))} />
        <p className="text-[.78rem] text-ink-3">{repaymentNotes[state.repayment]}</p>
        <HtmlView html={scheduleTableHtml(chosen)} />
        <p className="text-[.72rem] text-ink-4">달 이자율은 연 이자율 ÷ 12로 계산했어요. 실제 대출은 날짜 수·수수료에 따라 조금 달라요.</p>
      </section>
      <section className={`${panelClass} space-y-2`}>
        <h2 className="text-sm font-extrabold text-ink">금융 상품의 특징 <span className="text-[.74rem] font-medium text-ink-4">교과서의 일반적인 비교예요. 상품마다 다를 수 있어요.</span></h2>
        <HtmlView html={productTableHtml()} />
        <p className="text-[.74rem] leading-5 text-ink-4">안전성(원금을 잃지 않을 가능성)과 수익성은 서로 반대로 움직이는 경향이 있어요. 유동성은 필요할 때 손실 없이 현금으로 바꾸기 쉬운 정도예요. 여러 상품에 나누어 투자하면(분산 투자) 위험을 줄일 수 있어요.</p>
      </section>
      <ProblemSheet id="social-finance-print" sections={financeProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "금융 생활과 자산 관리", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 경제 지표·환율 ───── */
const goodSchema = z.object({ name: z.string().max(20), p1: z.number().min(0).max(1e10), q1: z.number().min(0).max(1e10), p2: z.number().min(0).max(1e10), q2: z.number().min(0).max(1e10) });
const indicatorSchema = z.object({
  goods: z.array(goodSchema).min(1).max(5).catch(DEFAULT_GOODS),
  population: z.number().positive().max(1e10).catch(DEFAULT_LABOR.population), employed: z.number().min(0).max(1e10).catch(DEFAULT_LABOR.employed), unemployed: z.number().min(0).max(1e10).catch(DEFAULT_LABOR.unemployed),
  from: z.number().positive().max(1e6).catch(1300), to: z.number().positive().max(1e6).catch(1400), dollars: z.number().min(0).max(1e10).catch(100),
  asks: asksSchema(indicatorAsks, ["gdp", "growth", "labor", "exchange"]), sheet: sheetSchema(1),
});
export function IndicatorsView() {
  const [state, update] = useStored("learncraft_social_indicators_v1", indicatorSchema);
  const result = gdp(state.goods);
  const labor = { population: state.population, employed: state.employed, unemployed: state.unemployed };
  const stats = laborStats(labor);
  const laborValid = stats.force <= state.population;
  const exchange = exchangeChange(state.from, state.to);
  const setGood = (index: number, patch: Partial<(typeof state.goods)[number]>) => update({ goods: state.goods.map((good, at) => at === index ? { ...good, ...patch } : good) });
  return (
    <ToolLayout aside={<>
      <Card title="고용 자료" help="15세 이상 인구 = 경제 활동 인구(취업자 + 실업자) + 비경제 활동 인구예요." action={<Button variant="ghost" size="sm" onClick={() => update(DEFAULT_LABOR)}><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="15세 이상 인구" value={state.population} min={0.001} max={1e10} onChange={population => update({ population })} />
          <NumberField label="취업자" value={state.employed} min={0} max={1e10} onChange={employed => update({ employed })} />
          <NumberField label="실업자" value={state.unemployed} min={0} max={1e10} onChange={unemployed => update({ unemployed })} />
        </div>
        {!laborValid && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">취업자와 실업자를 더한 수가 15세 이상 인구보다 많아요.</p>}
      </Card>
      <Card title="환율(원/달러)">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="처음" unit="원" value={state.from} min={0.01} max={1e6} onChange={from => update({ from })} />
          <NumberField label="바뀐 뒤" unit="원" value={state.to} min={0.01} max={1e6} onChange={to => update({ to })} />
          <NumberField label="바꿀 돈" unit="달러" value={state.dollars} min={0} max={1e10} onChange={dollars => update({ dollars })} />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 국민 경제 지표)">
        <MultiChips options={indicatorAsks} value={state.asks} onChange={asks => update({ asks: asks as IndicatorAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-ink">GDP와 물가 <span className="text-[.74rem] font-medium text-ink-4">1년 차가 기준 연도예요</span></h2>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" disabled={state.goods.length >= 5} onClick={() => update({ goods: [...state.goods, { name: "새 재화", p1: 1000, q1: 10, p2: 1000, q2: 10 }] })}><Plus size={14} /> 재화 더하기</Button>
            <Button variant="ghost" size="sm" onClick={() => update({ goods: DEFAULT_GOODS })}><RotateCcw size={14} /> 처음대로</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">재화</th><th className="px-2 py-1.5">1년 차 가격</th><th className="px-2 py-1.5">1년 차 생산량</th><th className="px-2 py-1.5">2년 차 가격</th><th className="px-2 py-1.5">2년 차 생산량</th><th /></tr></thead>
            <tbody>{state.goods.map((good, index) => <tr key={index} className="border-t border-line">
              <td className="px-1 py-1"><input value={good.name} maxLength={20} onChange={event => setGood(index, { name: event.target.value })} aria-label="재화 이름" className={`${fieldClass} w-24 py-1 text-[.8rem]`} /></td>
              {(["p1", "q1", "p2", "q2"] as const).map(key => <td key={key} className="px-1 py-1"><NumberField label="" value={good[key]} min={0} max={1e10} onChange={value => setGood(index, { ...good, [key]: value })} className="w-24" /></td>)}
              <td className="px-1 py-1"><Button variant="ghost" size="icon" className="size-9" disabled={state.goods.length <= 1} onClick={() => update({ goods: state.goods.filter((_, at) => at !== index) })} aria-label={`${good.name} 지우기`}><Trash2 size={14} /></Button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat label="2년 차 명목 GDP" value={won(result.nominal2)} note={`1년 차 ${won(result.nominal1)}`} />
          <Stat label="2년 차 실질 GDP" value={won(result.real2)} note="기준 연도 가격 × 2년 차 생산량" />
          <Stat label="GDP 디플레이터" value={num(result.deflator2, 1)} note={`물가 상승률 ${percent(result.inflation)}`} />
          <Stat label="경제 성장률" value={percent(result.growth)} note="실질 GDP 증가율" />
        </div>
      </section>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-extrabold text-ink">고용 지표</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="실업률" value={percent(stats.unemployment)} note="실업자 ÷ 경제 활동 인구" />
            <Stat label="고용률" value={percent(stats.employment)} note="취업자 ÷ 15세 이상 인구" />
            <Stat label="경제 활동 참가율" value={percent(stats.participation)} note="경제 활동 인구 ÷ 15세 이상 인구" />
          </div>
          <p className="text-[.78rem] text-ink-3">경제 활동 인구 {grouped(stats.force, 2)} · 비경제 활동 인구 {grouped(stats.inactive, 2)}</p>
          <ul className="space-y-0.5 text-[.74rem] leading-5 text-ink-4">{LABOR_EXAMPLES.map(item => <li key={item.who}>· {item.who} → <b className="text-ink-3">{item.group}</b></li>)}</ul>
        </div>
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-extrabold text-ink">환율 변동과 환전</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="환율 변화" value={`${exchange.change >= 0 ? "+" : ""}${percent(exchange.change)}`} note={exchange.up ? "환율 상승" : state.to < state.from ? "환율 하락" : "그대로"} />
            <Stat label="원화 가치" value={state.to === state.from ? "그대로" : exchange.up ? "하락" : "상승"} note={`${exchange.wonValue >= 0 ? "+" : ""}${percent(exchange.wonValue)}`} />
            <Stat label={`${grouped(state.dollars, 2)}달러`} value={won(state.dollars * state.to)} note={`처음 ${won(state.dollars * state.from)}`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-[.78rem]">
              <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">분야</th><th className="px-2 py-1.5 text-left">환율 상승(원화 가치 하락)</th><th className="px-2 py-1.5 text-left">환율 하락(원화 가치 상승)</th></tr></thead>
              <tbody>{EXCHANGE_EFFECTS.map(row => <tr key={row.item} className="border-t border-line">
                <td className="px-2 py-1 font-semibold">{row.item}</td><td className={`px-2 py-1 ${exchange.up ? "bg-brand-page" : ""}`}>{row.rise}</td><td className={`px-2 py-1 ${state.to < state.from ? "bg-brand-page" : ""}`}>{row.fall}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>
      <ProblemSheet id="social-indicators-print" sections={indicatorProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "국민 경제 지표와 환율", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

"use client";

import { z } from "zod";
import { ArrowLeftRight, BarChart3, Landmark, PiggyBank, Plus, RotateCcw, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { choiceAsks, choiceProblems, DEFAULT_ALTERNATIVES, evaluateChoices, marginalTable, type ChoiceAsk } from "@/features/social/choice";
import {
  chokePrice, combineLabel, combineRows, curveName, DEFAULT_MARKET, equationText, equilibrium, MARKET_FACTORS, marketAsks, marketProblems, marketSvg, marketValid,
  priceControl, shifted, surplus, unitTax, type MarketAsk, type MarketMode,
} from "@/features/social/market";
import { grouped, num } from "@/features/social/sheet";
import { analyzeTrade, costText, maxOutput, ppfSvg, RICARDO, tradeAsks, tradeGains, tradeProblems, type TradeAsk, type TradeSetup } from "@/features/social/trade";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { SOCIAL_AREA } from "./social-lab-shared";
import { FinanceView, IndicatorsView } from "./social-economy-views";

export function SocialEconomyLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="economy" area={SOCIAL_AREA} subject="경제" title="경제 · 통합사회 시장경제·금융 도구" tabs={tabs}
      description="통합사회 ‘시장경제와 지속가능발전’ 단원과 세계시민과 지리·법과 사회의 경제 내용을 돕는 도구입니다. 수요·공급 그래프, 기회비용, 비교 우위, 금융 계산, 국민 경제 지표를 식으로 계산하고 문제는 정답과 함께 인쇄합니다."
      views={[
        { value: "market", label: "수요와 공급", icon: BarChart3, note: "직선 수요·공급으로 균형을 구하고, 곡선 이동·잉여·가격 상한제와 하한제·물품세를 그래프로 보여 줘요.", render: () => <MarketView /> },
        { value: "choice", label: "기회비용·선택", icon: Scale, note: "대안의 편익과 명시적 비용으로 암묵적 비용·기회비용·순편익을 구하고, 한계 편익·한계 비용으로 최적 수량을 찾아요.", render: () => <ChoiceView /> },
        { value: "trade", label: "비교 우위·무역", icon: ArrowLeftRight, note: "두 나라·두 재화의 생산비로 절대 우위·비교 우위와 교역 조건을 구하고, 생산 가능 곡선에 교역 후 소비점을 찍어요.", render: () => <TradeView /> },
        { value: "finance", label: "금융·자산 관리", icon: PiggyBank, note: "단리·복리, 72의 법칙, 적금 만기액, 대출 상환 방식, 세후 이자, 실질 이자율과 금융 상품의 특징을 다뤄요.", render: () => <FinanceView /> },
        { value: "indicators", label: "경제 지표·환율", icon: Landmark, note: "명목·실질 GDP와 경제 성장률, 물가 상승률, 고용 지표, 환율 변동의 영향과 환전을 계산해요.", render: () => <IndicatorsView /> },
      ]} />
  );
}

/* ───── 수요와 공급 ───── */
const marketSchema = z.object({
  alpha: z.number().positive().max(100000).catch(DEFAULT_MARKET.alpha), beta: z.number().positive().max(1000).catch(DEFAULT_MARKET.beta),
  gamma: z.number().min(-100000).max(100000).catch(DEFAULT_MARKET.gamma), delta: z.number().positive().max(1000).catch(DEFAULT_MARKET.delta),
  mode: z.enum(["shift", "surplus", "control", "tax"]).catch("shift"),
  demandShift: z.number().min(-100000).max(100000).catch(20), supplyShift: z.number().min(-100000).max(100000).catch(0),
  price: z.number().min(0).max(100000).catch(20), tax: z.number().min(0).max(100000).catch(8),
  asks: asksSchema(marketAsks, ["equilibrium", "table", "shift", "surplus"]), sheet: sheetSchema(2),
});
function MarketView() {
  const [state, update] = useStored("learncraft_social_market_v1", marketSchema);
  const market = { alpha: state.alpha, beta: state.beta, gamma: state.gamma, delta: state.delta };
  const valid = marketValid(market);
  const e0 = equilibrium(market);
  const after = shifted(market, state.demandShift, state.supplyShift);
  const e1 = equilibrium(after);
  const surplusValue = surplus(market);
  const control = priceControl(market, state.price);
  const tax = unitTax(market, state.tax);
  const step = Math.max(1, Math.round(e0.quantity / 3));
  const applyFactor = (curve: "demand" | "supply", up: boolean) => update(curve === "demand" ? { mode: "shift", demandShift: (up ? 1 : -1) * step, supplyShift: 0 } : { mode: "shift", supplyShift: (up ? 1 : -1) * step, demandShift: 0 });
  return (
    <ToolLayout aside={<>
      <Card title="수요·공급 함수" help="Qd는 수요량, Qs는 공급량, P는 가격이에요. 가격이 오르면 수요량은 줄고 공급량은 늘어요." action={<Button variant="ghost" size="sm" onClick={() => update(DEFAULT_MARKET)}><RotateCcw size={14} /> 처음대로</Button>}>
        <p className="mb-1 text-xs font-semibold text-ink-4">수요 Qd = α − βP</p>
        <div className="grid grid-cols-2 gap-2"><NumberField label="α" value={state.alpha} min={0.01} max={100000} onChange={alpha => update({ alpha })} /><NumberField label="β" value={state.beta} min={0.01} max={1000} step={0.5} onChange={beta => update({ beta })} /></div>
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">공급 Qs = γ + δP</p>
        <div className="grid grid-cols-2 gap-2"><NumberField label="γ" value={state.gamma} min={-100000} max={100000} onChange={gamma => update({ gamma })} /><NumberField label="δ" value={state.delta} min={0.01} max={1000} step={0.5} onChange={delta => update({ delta })} /></div>
        {!valid && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">균형 가격과 거래량이 0보다 크게 나오도록 값을 고쳐 주세요.</p>}
      </Card>
      <Card title="그래프">
        <Segmented label="그래프" value={state.mode} onChange={(mode: MarketMode) => update({ mode })} options={[{ value: "shift", label: "곡선 이동" }, { value: "surplus", label: "잉여" }, { value: "control", label: "가격 규제" }, { value: "tax", label: "물품세" }]} />
        {state.mode === "shift" && <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberField label="수요 이동(+ 오른쪽)" value={state.demandShift} min={-100000} max={100000} onChange={demandShift => update({ demandShift })} />
          <NumberField label="공급 이동(+ 오른쪽)" value={state.supplyShift} min={-100000} max={100000} onChange={supplyShift => update({ supplyShift })} />
        </div>}
        {state.mode === "control" && <NumberField className="mt-3" label={`규제 가격(균형 ${num(e0.price, 2)}원보다 낮으면 상한제, 높으면 하한제)`} unit="원" value={state.price} min={0} max={100000} onChange={price => update({ price })} />}
        {state.mode === "tax" && <NumberField className="mt-3" label="생산자에게 매기는 1개당 세금" unit="원" value={state.tax} min={0} max={100000} onChange={value => update({ tax: value })} />}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 시장 가격의 결정)">
        <MultiChips options={marketAsks} value={state.asks} onChange={asks => update({ asks: asks as MarketAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]`}>
        <div className="space-y-2">
          {valid ? <SvgView label="수요·공급 그래프" svg={marketSvg(market, { mode: state.mode, demandShift: state.demandShift, supplyShift: state.supplyShift, price: state.price, tax: state.tax })} /> : <p className="py-16 text-center text-[.86rem] text-ink-4">그래프를 그릴 수 없는 값이에요.</p>}
          <p className="text-center text-[.8rem] text-ink-3" dangerouslySetInnerHTML={{ __html: `${equationText("demand", market)} &nbsp;·&nbsp; ${equationText("supply", market)}` }} />
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2"><Stat label="균형 가격 E₀" value={`${grouped(e0.price, 2)}원`} /><Stat label="균형 거래량" value={`${grouped(e0.quantity, 2)}개`} /></div>
          {state.mode === "shift" && (marketValid(after)
            ? <div className="grid grid-cols-2 gap-2"><Stat label="새 균형 가격 E₁" value={`${grouped(e1.price, 2)}원`} note={e1.price > e0.price ? "상승" : e1.price < e0.price ? "하락" : "그대로"} /><Stat label="새 균형 거래량" value={`${grouped(e1.quantity, 2)}개`} note={e1.quantity > e0.quantity ? "증가" : e1.quantity < e0.quantity ? "감소" : "그대로"} /></div>
            : <p role="alert" className="text-[.78rem] font-semibold text-warn">이동한 뒤에는 균형이 없어요. 이동 크기를 줄여 주세요.</p>)}
          {state.mode === "surplus" && <div className="grid grid-cols-3 gap-2"><Stat label="소비자 잉여" value={grouped(surplusValue.consumer, 2)} /><Stat label="생산자 잉여" value={grouped(surplusValue.producer, 2)} /><Stat label="총잉여" value={grouped(surplusValue.total, 2)} /></div>}
          {state.mode === "control" && <div className="grid grid-cols-3 gap-2"><Stat label="수요량" value={grouped(control.demand, 2)} /><Stat label="공급량" value={grouped(control.supply, 2)} /><Stat label={control.gap > 0 ? "초과 수요" : control.gap < 0 ? "초과 공급" : "초과량"} value={grouped(Math.abs(control.gap), 2)} note={state.price < e0.price ? "가격 상한제" : state.price > e0.price ? "가격 하한제" : "균형 가격"} /></div>}
          {state.mode === "tax" && <div className="grid grid-cols-2 gap-2">
            <Stat label="소비자 지불 가격" value={`${grouped(tax.buyer, 2)}원`} note={`1개당 부담 ${grouped(tax.consumerShare, 2)}원`} /><Stat label="생산자 수취 가격" value={`${grouped(tax.seller, 2)}원`} note={`1개당 부담 ${grouped(tax.producerShare, 2)}원`} />
            <Stat label="거래량" value={`${grouped(tax.quantity, 2)}개`} /><Stat label="조세 수입" value={`${grouped(tax.revenue, 2)}원`} note={`줄어든 총잉여 ${grouped(tax.deadweight, 2)}`} />
          </div>}
          <p className="text-[.74rem] leading-5 text-ink-4">해당 재화의 가격이 바뀌면 곡선 위에서 움직이고(수요량·공급량 변화), 가격 밖의 요인이 바뀌면 곡선 자체가 움직여요(수요·공급 변화). 수요량이 0이 되는 가격은 {grouped(chokePrice(market), 2)}원이에요.</p>
        </div>
      </section>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div>
          <h2 className="mb-2 text-sm font-extrabold text-ink">수요·공급을 바꾸는 요인 <span className="text-[.74rem] font-medium text-ink-4">누르면 그래프에 반영돼요</span></h2>
          <div className="flex flex-wrap gap-1.5">{MARKET_FACTORS.map(item => <button key={item.factor} type="button" onClick={() => applyFactor(item.curve, item.up)} className={chipClass(false)}>{item.factor} → {curveName(item.curve)} {item.up ? "증가" : "감소"}</button>)}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">변화</th><th className="px-2 py-1.5">균형 가격</th><th className="px-2 py-1.5">균형 거래량</th></tr></thead>
            <tbody>{combineRows.map(row => <tr key={`${row.demand}${row.supply}`} className="border-t border-line"><td className="px-2 py-1">{combineLabel(row.demand, row.supply)}</td><td className="px-2 py-1 text-center">{row.price}</td><td className="px-2 py-1 text-center">{row.quantity}</td></tr>)}</tbody>
          </table>
          <p className="mt-1 text-[.72rem] text-ink-4">‘알 수 없음’은 두 곡선이 움직인 크기에 따라 달라지는 경우예요.</p>
        </div>
      </section>
      <ProblemSheet id="social-market-print" sections={marketProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "시장 가격의 결정과 변동", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 기회비용·선택 ───── */
const alternativeSchema = z.object({ name: z.string().max(30), benefit: z.number().min(0).max(1e12), cost: z.number().min(0).max(1e12) });
const choiceSchema = z.object({
  list: z.array(alternativeSchema).min(1).max(6).catch(DEFAULT_ALTERNATIVES),
  mb: z.array(z.number().min(-1e9).max(1e9)).min(1).max(8).catch([10, 8, 6, 4, 2]),
  mc: z.array(z.number().min(-1e9).max(1e9)).min(1).max(8).catch([2, 3, 4, 5, 6]),
  asks: asksSchema(choiceAsks, ["opportunity", "rational", "marginal", "sunk"]), sheet: sheetSchema(2),
});
function ChoiceView() {
  const [state, update] = useStored("learncraft_social_choice_v1", choiceSchema);
  const results = evaluateChoices(state.list);
  const setItem = (index: number, patch: Partial<(typeof state.list)[number]>) => update({ list: state.list.map((item, at) => at === index ? { ...item, ...patch } : item) });
  const length = Math.min(state.mb.length, state.mc.length);
  const marginal = marginalTable(state.mb, state.mc);
  const setMarginal = (key: "mb" | "mc", index: number, value: number) => {
    const next = state[key].map((item, at) => at === index ? value : item);
    update(key === "mb" ? { mb: next } : { mc: next });
  };
  return (
    <ToolLayout aside={<>
      <Card title="선택할 수 있는 대안" help="하나만 고를 수 있는 대안이에요. 편익은 얻는 만족(돈으로 환산), 명시적 비용은 실제로 내는 돈이에요." action={<Button variant="ghost" size="sm" onClick={() => update({ list: DEFAULT_ALTERNATIVES })}><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="space-y-2">
          {state.list.map((item, index) => (
            <div key={index} className="rounded-xl border border-line p-2">
              <div className="flex items-center gap-1.5">
                <input value={item.name} maxLength={30} onChange={event => setItem(index, { name: event.target.value })} aria-label="대안 이름" className={`${fieldClass} py-1.5 text-[.8rem]`} />
                <Button variant="ghost" size="icon" className="size-9 shrink-0" disabled={state.list.length <= 1} onClick={() => update({ list: state.list.filter((_, at) => at !== index) })} aria-label={`${item.name} 지우기`}><Trash2 size={14} /></Button>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2"><NumberField label="편익" unit="원" value={item.benefit} min={0} max={1e12} step={1000} onChange={benefit => setItem(index, { benefit })} /><NumberField label="명시적 비용" unit="원" value={item.cost} min={0} max={1e12} step={1000} onChange={cost => setItem(index, { cost })} /></div>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" disabled={state.list.length >= 6} onClick={() => update({ list: [...state.list, { name: "새 대안", benefit: 20000, cost: 0 }] })}><Plus size={14} /> 대안 더하기</Button>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 합리적 선택)">
        <MultiChips options={choiceAsks} value={state.asks} onChange={asks => update({ asks: asks as ChoiceAsk[] })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">대안</th><th className="px-2 py-1.5">편익</th><th className="px-2 py-1.5">명시적 비용</th><th className="px-2 py-1.5">암묵적 비용</th><th className="px-2 py-1.5">기회비용</th><th className="px-2 py-1.5">순편익</th><th className="px-2 py-1.5">판단</th></tr></thead>
            <tbody>{results.map((row, index) => (
              <tr key={index} className={`border-t border-line text-center ${row.rational ? "bg-brand-page font-bold" : ""}`}>
                <td className="px-2 py-1 text-left">{row.alternative.name}</td><td className="px-2 py-1">{grouped(row.alternative.benefit)}</td><td className="px-2 py-1">{grouped(row.alternative.cost)}</td>
                <td className="px-2 py-1">{grouped(row.implicit)}</td><td className="px-2 py-1">{grouped(row.opportunity)}</td><td className="px-2 py-1">{grouped(row.net)}</td><td className="px-2 py-1">{row.rational ? "합리적 선택" : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!results.some(row => row.rational) && <p className="mt-2 text-[.78rem] font-semibold text-warn">순편익이 0보다 큰 대안이 없어요. 가치가 같은 대안이 둘 이상이거나 모든 대안의 가치가 0 이하예요.</p>}
        <ul className="mt-3 grid gap-1 text-[.76rem] leading-5 text-ink-4 md:grid-cols-2">
          <li>암묵적 비용 = 포기한 대안 가운데 가장 큰 (편익 − 명시적 비용)</li>
          <li>기회비용 = 명시적 비용 + 암묵적 비용 · 순편익 = 편익 − 기회비용</li>
          <li>순편익이 0보다 큰 대안을 고르는 것이 합리적 선택이에요.</li>
          <li>매몰 비용(이미 써서 되돌릴 수 없는 비용)은 선택할 때 고려하지 않아요.</li>
        </ul>
      </section>
      <section className={panelClass}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-ink">한계 편익·한계 비용 <span className="text-[.74rem] font-medium text-ink-4">한 번 더 할 때 늘어나는 편익과 비용</span></h2>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" disabled={length >= 8} onClick={() => update({ mb: [...state.mb.slice(0, length), 0], mc: [...state.mc.slice(0, length), 0] })}><Plus size={14} /> 행 더하기</Button>
            <Button variant="ghost" size="sm" disabled={length <= 1} onClick={() => update({ mb: state.mb.slice(0, length - 1), mc: state.mc.slice(0, length - 1) })}><Trash2 size={14} /> 마지막 행 지우기</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5">횟수</th><th className="px-2 py-1.5">한계 편익</th><th className="px-2 py-1.5">한계 비용</th><th className="px-2 py-1.5">총편익</th><th className="px-2 py-1.5">총비용</th><th className="px-2 py-1.5">총순편익</th></tr></thead>
            <tbody>{marginal.rows.map((row, index) => (
              <tr key={index} className={`border-t border-line text-center ${marginal.best.quantity === row.quantity ? "bg-brand-page font-bold" : ""}`}>
                <td className="px-2 py-1">{row.quantity}</td>
                <td className="px-1 py-1"><NumberField label="" value={row.mb} min={-1e9} max={1e9} onChange={value => setMarginal("mb", index, value)} className="mx-auto w-24" /></td>
                <td className="px-1 py-1"><NumberField label="" value={row.mc} min={-1e9} max={1e9} onChange={value => setMarginal("mc", index, value)} className="mx-auto w-24" /></td>
                <td className="px-2 py-1">{grouped(row.totalBenefit)}</td><td className="px-2 py-1">{grouped(row.totalCost)}</td><td className="px-2 py-1">{grouped(row.net)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-2 text-[.8rem] text-ink-3">총순편익이 가장 큰 것은 <b className="text-ink">{marginal.best.quantity}번</b>이에요(총순편익 {grouped(marginal.best.net)}). 한계 편익이 한계 비용보다 크거나 같은 동안 늘리는 것이 합리적이에요.</p>
      </section>
      <ProblemSheet id="social-choice-print" sections={choiceProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "합리적 선택과 기회비용", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 비교 우위·무역 ───── */
const pair = <T extends z.ZodTypeAny>(item: T) => z.tuple([item, item]);
const tradeSchema = z.object({
  countries: pair(z.string().max(20)).catch(RICARDO.countries), goods: pair(z.string().max(20)).catch(RICARDO.goods),
  mode: z.enum(["hours", "output"]).catch("hours"),
  values: pair(pair(z.number().positive().max(1e6))).catch(RICARDO.values), labor: pair(z.number().positive().max(1e9)).catch(RICARDO.labor),
  exportQty: z.number().min(0).max(1e9).catch(1), rate: z.number().positive().max(1e6).catch(1),
  asks: asksSchema(tradeAsks, ["advantage", "cost", "terms", "gains"]), sheet: sheetSchema(1),
});
function TradeView() {
  const [state, update] = useStored("learncraft_social_trade_v1", tradeSchema);
  const setup: TradeSetup = { countries: state.countries, goods: state.goods, mode: state.mode, values: state.values, labor: state.labor };
  const result = analyzeTrade(setup);
  const gains = tradeGains(setup, state.exportQty, state.rate);
  const inRange = state.rate > result.range[0] && state.rate < result.range[1];
  const setValue = (country: number, good: number, value: number) => update({ values: state.values.map((row, at) => at === country ? row.map((cell, index) => index === good ? value : cell) : row) as TradeSetup["values"] });
  const name = (country: number | null) => country === null ? "없음(같음)" : setup.countries[country];
  return (
    <ToolLayout aside={<>
      <Card title="두 나라의 생산비" action={<Button variant="ghost" size="sm" onClick={() => update({ ...RICARDO, exportQty: 1, rate: 1 })} title="리카도의 옷감·포도주 예"><RotateCcw size={14} /> 리카도 예</Button>}>
        <Segmented label="생산비 표시" value={state.mode} onChange={mode => update({ mode })} options={[{ value: "hours", label: "1단위에 드는 노동량" }, { value: "output", label: "노동 1단위로 만드는 양" }]} />
        <div className="mt-3 grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] items-end gap-1.5">
          <span />
          {[0, 1].map(good => <input key={good} value={state.goods[good]} maxLength={20} aria-label={`재화 ${good + 1}`} onChange={event => update({ goods: state.goods.map((item, at) => at === good ? event.target.value : item) as [string, string] })} className={`${fieldClass} py-1.5 text-center text-[.8rem] font-bold`} />)}
          {[0, 1].map(country => [
            <input key={`c${country}`} value={state.countries[country]} maxLength={20} aria-label={`나라 ${country + 1}`} onChange={event => update({ countries: state.countries.map((item, at) => at === country ? event.target.value : item) as [string, string] })} className={`${fieldClass} px-2 py-1.5 text-[.8rem] font-bold`} />,
            ...[0, 1].map(good => <NumberField key={`${country}${good}`} label="" value={state.values[country][good]} min={0.001} max={1e6} onChange={value => setValue(country, good, value)} />),
          ])}
        </div>
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">나라마다 가진 노동량(생산 가능 곡선)</p>
        <div className="grid grid-cols-2 gap-2">{[0, 1].map(country => <NumberField key={country} label={state.countries[country]} value={state.labor[country]} min={0.001} max={1e9} onChange={value => update({ labor: state.labor.map((item, at) => at === country ? value : item) as [number, number] })} />)}</div>
      </Card>
      <Card title="특화와 교환" help={`${state.goods[0]}에 비교 우위가 있는 나라가 ${state.goods[0]}만, 다른 나라가 ${state.goods[1]}만 만든 뒤 바꿔요.`}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label={`수출하는 ${state.goods[0]}`} value={state.exportQty} min={0} max={1e9} step={0.5} onChange={exportQty => update({ exportQty })} />
          <NumberField label={`${state.goods[0]} 1단위당 ${state.goods[1]}`} value={state.rate} min={0.001} max={1e6} step={0.1} onChange={rate => update({ rate })} />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 비교 우위와 무역)">
        <MultiChips options={tradeAsks} value={state.asks} onChange={asks => update({ asks: asks as TradeAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[0, 1].map(good => [
            <Stat key={`a${good}`} label={`${setup.goods[good]} 절대 우위`} value={name(result.absolute[good])} />,
            <Stat key={`c${good}`} label={`${setup.goods[good]} 비교 우위`} value={name(result.comparative[good])} />,
          ])}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">기회비용</th><th className="px-2 py-1.5">{setup.goods[0]} 1단위</th><th className="px-2 py-1.5">{setup.goods[1]} 1단위</th><th className="px-2 py-1.5">최대 생산량</th></tr></thead>
            <tbody>{[0, 1].map(country => <tr key={country} className="border-t border-line text-center">
              <td className="px-2 py-1 text-left font-semibold">{setup.countries[country]}</td>
              <td className="px-2 py-1">{setup.goods[1]} {costText(setup, country, 0)}</td><td className="px-2 py-1">{setup.goods[0]} {costText(setup, country, 1)}</td>
              <td className="px-2 py-1">{setup.goods[0]} {num(maxOutput(setup, country, 0), 2)} 또는 {setup.goods[1]} {num(maxOutput(setup, country, 1), 2)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {result.comparative[0] === null
          ? <p role="alert" className="text-[.8rem] font-semibold text-warn">두 나라의 기회비용이 같아 비교 우위가 없어요. 무역의 이익이 생기지 않아요.</p>
          : <p className="rounded-xl bg-brand-page px-4 py-3 text-[.86rem] font-bold">교역 조건: {setup.goods[0]} 1단위 = {setup.goods[1]} {num(result.range[0], 3)}단위보다 많고 {num(result.range[1], 3)}단위보다 적을 때 두 나라 모두 이익이에요.</p>}
      </section>
      {gains && <section className={`${panelClass} space-y-2`}>
        <div className="grid gap-3 md:grid-cols-2">{[0, 1].map(country => <SvgView key={country} label={`${setup.countries[country]} 생산 가능 곡선`} svg={ppfSvg(setup, country, gains.consume[country] as [number, number])} />)}</div>
        <ul className="grid gap-1 text-[.8rem] text-ink-3 md:grid-cols-2">
          {[0, 1].map(country => <li key={country}><b className="text-ink">{setup.countries[country]}</b>: {setup.goods[country === gains.first ? 0 : 1]}에 특화 → 교역 후 {setup.goods[0]} {num(gains.consume[country][0], 2)}, {setup.goods[1]} {num(gains.consume[country][1], 2)} {gains.beyond[country] ? "(생산 가능 곡선 밖 — 무역 이익)" : "(곡선 안쪽이거나 위 — 이익 없음)"}</li>)}
        </ul>
        {!inRange && <p className="text-[.78rem] font-semibold text-warn">지금 교환 비율은 두 나라 모두 이익을 보는 범위를 벗어났어요.</p>}
        {!gains.feasible && <p role="alert" className="text-[.78rem] font-semibold text-warn">수출량이 생산량보다 많아요. 수출량이나 교환 비율을 줄여 주세요.</p>}
      </section>}
      <ProblemSheet id="social-trade-print" sections={tradeProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "비교 우위와 국제 무역", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

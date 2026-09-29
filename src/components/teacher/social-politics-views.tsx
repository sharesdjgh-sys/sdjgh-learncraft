"use client";

import { z } from "zod";
import { checksSvg, compareTableHtml, governmentAsks, governmentProblems, KOREA_ELEMENTS, type GovernmentAsk } from "@/features/social/government";
import { courtLevelsSvg, CRIMINAL_STEP_NOTES, CRIMINAL_STEPS, criminalFlowSvg, judiciaryAsks, judiciaryProblems, RIGHTS, trialDecision, trialKeys, TRIALS, trialsTableHtml, type JudiciaryAsk, type Trial } from "@/features/social/judiciary";
import { CONTRACT_ITEMS, DEFAULT_WORK, laborAsks, laborProblems, MINIMUM_WAGE, wageYears, weekPay, workChecks, type LaborAsk } from "@/features/social/labor";
import { grouped } from "@/features/social/sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";

/* ───── 정부 형태 ───── */
const governmentSchema = z.object({ asks: asksSchema(governmentAsks, ["identify", "statement", "korea"]), sheet: sheetSchema(2) });
export function GovernmentView() {
  const [state, update] = useStored("learncraft_social_government_v1", governmentSchema);
  return (
    <ToolLayout aside={<>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 민주 정치와 정부 형태)">
        <MultiChips options={governmentAsks} value={state.asks} onChange={asks => update({ asks: asks as GovernmentAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-4`}>
        <div><p className="mb-1 text-xs font-bold text-ink-3">대통령제와 의원 내각제(전형: 미국·영국)</p><HtmlView html={compareTableHtml()} /></div>
        <div className="grid gap-3 md:grid-cols-2">
          {(["pres", "parl"] as const).map(form => (
            <div key={form} className="rounded-xl bg-surface-2 p-3">
              <p className="mb-1 text-[.8rem] font-extrabold text-ink">우리나라의 {form === "pres" ? "대통령제" : "의원 내각제"} 요소</p>
              <ul className="list-disc space-y-0.5 pl-4 text-[.78rem] leading-5 text-ink-3">{KOREA_ELEMENTS.filter(item => item.form === form).map(item => <li key={item.text}>{item.text}</li>)}</ul>
            </div>
          ))}
        </div>
        <div><p className="mb-1 text-xs font-bold text-ink-3">권력 분립과 견제(우리나라)</p><SvgView label="권력 분립 관계도" svg={checksSvg()} /></div>
        <p className="text-[.72rem] leading-5 text-ink-4">헌법 재판소 재판관 9명은 대통령이 임명하되 국회가 3명을 선출하고 대법원장이 3명을 지명해요. 헌법 재판소장은 국회의 동의를 얻어 대통령이 임명해요.</p>
      </section>
      <ProblemSheet id="social-government-print" sections={governmentProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "민주 정치와 정부 형태", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 법원·헌법 재판 ───── */
const judiciarySchema = z.object({
  trial: z.enum(trialKeys as [Trial, ...Trial[]]).catch("review"), present: z.number().int().min(0).max(9).catch(9), favor: z.number().int().min(0).max(9).catch(5),
  asks: asksSchema(judiciaryAsks, ["trial", "quorum", "levels", "steps", "rights"]), sheet: sheetSchema(1),
});
export function JudiciaryView() {
  const [state, update] = useStored("learncraft_social_judiciary_v1", judiciarySchema);
  const favor = Math.min(state.favor, state.present);
  const decision = trialDecision(state.trial, state.present, favor);
  return (
    <ToolLayout aside={<>
      <Card title="헌법 재판소 결정 계산" help="재판관 9명 가운데 7명 이상이 심리에 참여해야 해요.">
        <div className="grid grid-cols-2 gap-1">{trialKeys.map(key => <button key={key} type="button" onClick={() => update({ trial: key })} className={chipClass(state.trial === key)}>{TRIALS[key].name}</button>)}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="참여 재판관" unit="명" value={state.present} min={0} max={9} onChange={present => update({ present: Math.round(present) })} />
          <NumberField label="인용 의견" unit="명" value={state.favor} min={0} max={9} onChange={value => update({ favor: Math.round(value) })} />
        </div>
        <p role="status" className={`mt-2 rounded-xl px-3 py-2 text-[.84rem] font-bold ${decision.ok ? "bg-brand-page text-brand-dark" : "bg-surface-2 text-ink-2"}`}>{decision.text}</p>
        <p className="mt-1 text-[.72rem] text-ink-4">{TRIALS[state.trial].quorum}. 판례를 바꿀 때도 6명 이상 찬성이 필요해요.</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 법원과 헌법 재판소)">
        <MultiChips options={judiciaryAsks} value={state.asks} onChange={asks => update({ asks: asks as JudiciaryAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-4`}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
          <div>
            <p className="mb-1 text-xs font-bold text-ink-3">심급 제도(민사·형사 사건의 3심제)</p>
            <SvgView label="심급 제도" svg={courtLevelsSvg()} />
            <p className="mt-1 text-[.72rem] leading-5 text-ink-4">교과서의 기본 구조예요. 소송 금액 등에 따라 항소 법원이 달라지는 예외가 있어요. 결정·명령에 대한 불복은 항고·재항고라고 해요.</p>
          </div>
          <div className="min-w-0"><p className="mb-1 text-xs font-bold text-ink-3">헌법 재판소의 권한</p><HtmlView html={trialsTableHtml()} /></div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-ink-3">형사 절차</p>
          <SvgView label="형사 절차" svg={criminalFlowSvg()} />
          <ol className="mt-1 grid gap-1 text-[.74rem] text-ink-4 sm:grid-cols-5">{CRIMINAL_STEPS.map((step, index) => <li key={step}><b className="text-ink-3">{step}</b> {CRIMINAL_STEP_NOTES[index]}</li>)}</ol>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[.78rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1 text-left">인권 보장 제도</th><th className="px-2 py-1">단계</th><th className="px-2 py-1 text-left">내용</th></tr></thead>
            <tbody>{RIGHTS.map(right => <tr key={right.name} className="border-t border-line align-top"><td className="whitespace-nowrap px-2 py-1 font-semibold">{right.name}</td><td className="whitespace-nowrap px-2 py-1 text-center">{right.when}</td><td className="px-2 py-1 text-ink-3">{right.text}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <ProblemSheet id="social-judiciary-print" sections={judiciaryProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "법원과 헌법 재판, 형사 절차", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 근로·임금 ───── */
const laborSchema = z.object({
  year: z.number().int().refine(year => year in MINIMUM_WAGE).catch(DEFAULT_WORK.year),
  wage: z.number().min(0).max(1e6).catch(DEFAULT_WORK.wage), days: z.number().int().min(1).max(7).catch(DEFAULT_WORK.days), hoursPerDay: z.number().min(0.5).max(24).catch(DEFAULT_WORK.hoursPerDay),
  overtime: z.number().min(0).max(80).catch(0), night: z.number().min(0).max(80).catch(0), holiday: z.number().min(0).max(8).catch(0), holidayOver: z.number().min(0).max(16).catch(0),
  perfect: z.boolean().catch(true), fivePlus: z.boolean().catch(true), age: z.number().int().min(13).max(99).catch(DEFAULT_WORK.age),
  asks: asksSchema(laborAsks, ["weekly", "premium", "minimum", "youth", "contract"]), sheet: sheetSchema(1),
});
export function LaborView() {
  const [state, update] = useStored("learncraft_social_labor_v1", laborSchema);
  const pay = weekPay(state);
  const checks = workChecks(state);
  const minimum = MINIMUM_WAGE[state.year];
  return (
    <ToolLayout aside={<>
      <Card title="근로 조건" help="1주를 기준으로 계산해요. 하루 8시간·1주 40시간을 넘는 계약 시간은 연장 근로로 봐요.">
        <p className="mb-1 text-xs font-semibold text-ink-4">최저 임금 연도</p>
        <Segmented label="최저 임금 연도" value={state.year} onChange={year => update({ year })} options={wageYears.map(year => ({ value: year, label: `${year}년 ${grouped(MINIMUM_WAGE[year], 0)}원` }))} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <NumberField label="시급" unit="원" value={state.wage} min={0} max={1e6} step={10} onChange={wage => update({ wage })} />
          <NumberField label="1주 근무일" unit="일" value={state.days} min={1} max={7} onChange={days => update({ days: Math.round(days) })} />
          <NumberField label="하루 근무" unit="시간" value={state.hoursPerDay} min={0.5} max={24} step={0.5} onChange={hoursPerDay => update({ hoursPerDay })} />
          <NumberField label="연장(더 일함)" unit="시간" value={state.overtime} min={0} max={80} step={0.5} onChange={overtime => update({ overtime })} />
          <NumberField label="그중 야간" unit="시간" value={state.night} min={0} max={80} step={0.5} onChange={night => update({ night })} />
          <NumberField label="나이" unit="세" value={state.age} min={13} max={99} onChange={age => update({ age: Math.round(age) })} />
          <NumberField label="휴일 근로" unit="시간" value={state.holiday} min={0} max={8} step={0.5} onChange={holiday => update({ holiday })} />
          <NumberField label="휴일 8시간 초과" unit="시간" value={state.holidayOver} min={0} max={16} step={0.5} onChange={holidayOver => update({ holidayOver })} />
        </div>
        <p className="mt-1 text-[.7rem] leading-5 text-ink-4">‘그중 야간’은 일한 시간 가운데 밤 10시~오전 6시 사이 시간이에요(50%만 더해요).</p>
        <Toggle label="그 주를 개근함" checked={state.perfect} onChange={perfect => update({ perfect })} />
        <Toggle label="상시 근로자 5명 이상 사업장" checked={state.fivePlus} onChange={fivePlus => update({ fivePlus })} help="4명 이하 사업장에는 연장·야간·휴일 가산 수당 규정이 적용되지 않아요." />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 근로자의 권리)" help="최저 임금 문제는 위에서 고른 연도를 써요.">
        <MultiChips options={laborAsks} value={state.asks} onChange={asks => update({ asks: asks as LaborAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="1주 소정 근로" value={`${grouped(pay.contract, 1)}시간`} note={pay.overtime ? `연장 ${grouped(pay.overtime, 1)}시간` : undefined} />
          <Stat label="주휴 수당" value={`${grouped(pay.weeklyRest, 0)}원`} note={pay.weeklyRestHours ? `${grouped(pay.weeklyRestHours, 1)}시간분` : pay.contract < 15 ? "소정 15시간 미만" : "개근하지 않음"} />
          <Stat label="가산 수당" value={`${grouped(pay.premium, 0)}원`} note={state.fivePlus ? "연장·야간·휴일" : "5명 미만: 적용 안 됨"} />
          <Stat label="1주 임금" value={`${grouped(pay.total, 0)}원`} note={`한 달 약 ${grouped(pay.month, 0)}원`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1 text-left">항목</th><th className="px-2 py-1 text-left">계산</th><th className="px-2 py-1 text-right">금액</th></tr></thead>
            <tbody>
              <tr className="border-t border-line"><td className="px-2 py-1">일한 시간 임금</td><td className="px-2 py-1 text-ink-3">{grouped(pay.worked, 1)}시간 × {grouped(state.wage, 0)}원</td><td className="px-2 py-1 text-right">{grouped(pay.base, 0)}원</td></tr>
              <tr className="border-t border-line"><td className="px-2 py-1">주휴 수당</td><td className="px-2 py-1 text-ink-3">{pay.weeklyRestHours ? `(${grouped(pay.contract, 1)} ÷ 40) × 8 = ${grouped(pay.weeklyRestHours, 1)}시간 × ${grouped(state.wage, 0)}원` : "1주 소정 15시간 이상 + 개근일 때만"}</td><td className="px-2 py-1 text-right">{grouped(pay.weeklyRest, 0)}원</td></tr>
              {state.fivePlus && <>
                <tr className="border-t border-line"><td className="px-2 py-1">연장 가산(50%)</td><td className="px-2 py-1 text-ink-3">{grouped(pay.overtime, 1)}시간 × {grouped(state.wage, 0)}원 × 0.5</td><td className="px-2 py-1 text-right">{grouped(pay.premiums.overtime, 0)}원</td></tr>
                <tr className="border-t border-line"><td className="px-2 py-1">야간 가산(50%)</td><td className="px-2 py-1 text-ink-3">{grouped(state.night, 1)}시간 × {grouped(state.wage, 0)}원 × 0.5</td><td className="px-2 py-1 text-right">{grouped(pay.premiums.night, 0)}원</td></tr>
                <tr className="border-t border-line"><td className="px-2 py-1">휴일 가산</td><td className="px-2 py-1 text-ink-3">8시간 이내 {grouped(state.holiday, 1)}시간 × 0.5 + 초과 {grouped(state.holidayOver, 1)}시간 × 1.0</td><td className="px-2 py-1 text-right">{grouped(pay.premiums.holiday + pay.premiums.holidayOver, 0)}원</td></tr>
              </>}
              <tr className="border-t-2 border-line font-bold"><td className="px-2 py-1">합계</td><td className="px-2 py-1 text-ink-3">월 환산 시간(주휴 포함) 약 {pay.monthHours}시간</td><td className="px-2 py-1 text-right">{grouped(pay.total, 0)}원</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="space-y-1 text-[.8rem]">
          {checks.map((check, index) => <li key={index} className={`rounded-lg px-3 py-1.5 ${check.ok ? "bg-surface-2 text-ink-3" : "bg-[#fff4e5] font-semibold text-[#9a3412]"}`}>{check.ok ? "✓" : "!"} {check.text}</li>)}
        </ul>
        <p className="text-[.72rem] leading-5 text-ink-4">{state.year}년 최저 임금은 시간당 {grouped(minimum, 0)}원, 주 40시간(월 209시간) 기준 월 {grouped(minimum * 209, 0)}원이에요. 근로 계약서에는 {CONTRACT_ITEMS.join(", ")}을 적어야 하고, 임금·소정 근로 시간·휴일·연차 유급 휴가는 서면으로 주어야 해요(근로기준법 제17조).</p>
      </section>
      <ProblemSheet id="social-labor-print" sections={laborProblems(state.asks, state.sheet.count, state.sheet.seed, state.year)} options={{ title: state.sheet.title || "근로자의 권리", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

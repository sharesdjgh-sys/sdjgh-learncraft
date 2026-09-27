"use client";

import { z } from "zod";
import { criticalSummary, derivativeSvg, extremaOn, polyFrom, rootCount, signTableHtml, useAsks, useProblems, type UseAsk } from "@/features/math/calc-derivative";
import { absIntegral, areaBetween, areaSvg, areaTex, integralAsks, integralProblems, motionIntegral, type IntegralAsk } from "@/features/math/calc-integral";
import { pAnti, pDefinite, pDeriv, pTex } from "@/features/math/calc-base";
import { num, qFrom, qTex, tex } from "@/features/math/core";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, HtmlView, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MathSheet } from "./math-lab-shared";

const MathHtml = ({ html, className }: { html: string; className?: string }) => <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;

/** 다항식 계수 입력칸(높은 차수부터). values[i]는 xⁱ의 계수입니다. */
export function CoefficientFields({ values, onChange, label = "f(x)" }: { values: number[]; onChange: (values: number[]) => void; label?: string }) {
  const powers = values.map((_, index) => index).reverse();
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-4">{label}의 계수</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {powers.map(power => <NumberField key={power} label={power === 0 ? "상수" : power === 1 ? "x" : `x${"⁰¹²³⁴⁵"[power]}`} value={values[power]} min={-1000} max={1000} onChange={value => onChange(values.map((item, at) => at === power ? value : item))} />)}
      </div>
    </div>
  );
}
export const coeffSchema = (length: number, fallback: number[]) => z.array(z.number().min(-1000).max(1000)).length(length).catch(fallback);

/* ───── 도함수의 활용 ───── */
const useSchema = z.object({
  coeffs: coeffSchema(5, [0, 9, -6, 1, 0]), lo: z.number().min(-50).max(50).catch(0), hi: z.number().min(-50).max(50).catch(4), interval: z.boolean().catch(true),
  k: z.number().min(-1000).max(1000).catch(2), showK: z.boolean().catch(true), motion: z.boolean().catch(false),
  asks: asksSchema(useAsks, ["extremum", "increasing", "maxmin", "roots", "motion"]), sheet: sheetSchema(1),
});
export function UseView() {
  const [state, update] = useStored("learncraft_math_use_v1", useSchema);
  const poly = polyFrom(state.coeffs);
  const intervalOk = state.interval && state.lo < state.hi;
  const extrema = intervalOk ? extremaOn(poly, state.lo, state.hi) : null;
  const variable = state.motion ? "t" : "x";
  return (
    <ToolLayout aside={<>
      <Card title={state.motion ? "위치 x(t)" : "함수 f(x)"}>
        <CoefficientFields label={state.motion ? "x(t)" : "f(x)"} values={state.coeffs} onChange={coeffs => update({ coeffs })} />
        <Toggle label="위치 함수로 보기(속도·가속도)" checked={state.motion} onChange={motion => update({ motion })} />
      </Card>
      <Card title="최대·최소와 실근">
        <Toggle label="닫힌구간 보기" checked={state.interval} onChange={interval => update({ interval })} />
        {state.interval && <div className="grid grid-cols-2 gap-2"><NumberField label="구간 시작" value={state.lo} min={-50} max={50} onChange={lo => update({ lo })} /><NumberField label="구간 끝" value={state.hi} min={-50} max={50} onChange={hi => update({ hi })} /></div>}
        <Toggle label="직선 y = k 보기" checked={state.showK} onChange={showK => update({ showK })} />
        {state.showK && <NumberField label="k" value={state.k} min={-1000} max={1000} onChange={k => update({ k })} />}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 도함수의 활용)">
        <MultiChips options={useAsks} value={state.asks} onChange={asks => update({ asks: asks as UseAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start`}>
        <SvgView label="함수의 그래프와 극점" svg={derivativeSvg(poly, { k: state.showK ? state.k : undefined, interval: intervalOk ? [state.lo, state.hi] : undefined })} />
        <div className="min-w-0 space-y-2 text-ink">
          <p className="overflow-x-auto text-[.95rem]"><MathHtml html={tex(`${state.motion ? "x(t)" : "f(x)"}=${pTex(poly, variable)}`)} /></p>
          <p className="overflow-x-auto text-[.95rem]"><MathHtml html={tex(`${state.motion ? "v(t)" : "f'(x)"}=${pTex(pDeriv(poly), variable)}`)} /></p>
          {state.motion && <p className="overflow-x-auto text-[.95rem]"><MathHtml html={tex(`a(t)=${pTex(pDeriv(pDeriv(poly)), "t")}`)} /></p>}
          <HtmlView html={signTableHtml(poly)} />
          <p className="text-[.86rem]"><MathHtml html={criticalSummary(poly)} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {extrema && <Stat label={`[${state.lo}, ${state.hi}]의 최댓값`} value={num(extrema.max.y, 3)} note={`x = ${num(extrema.max.x, 3)}`} />}
            {extrema && <Stat label={`[${state.lo}, ${state.hi}]의 최솟값`} value={num(extrema.min.y, 3)} note={`x = ${num(extrema.min.x, 3)}`} />}
            {state.showK && <Stat label={`f(x) = ${num(state.k, 3)}의 실근`} value={`${rootCount(poly, state.k)}개`} note="서로 다른 실근의 개수" />}
          </div>
          {state.interval && !intervalOk && <p role="alert" className="text-[.78rem] font-semibold text-warn">구간 끝이 시작보다 커야 해요.</p>}
          {state.motion && <p className="text-[.76rem] leading-5 text-ink-4">속도 v(t)의 부호가 바뀌는 시각에 운동 방향이 바뀌어요.</p>}
        </div>
      </section>
      <MathSheet id="math-use-print" sections={useProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "도함수의 활용", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 정적분과 넓이 ───── */
const integralSchema = z.object({
  mode: z.enum(["axis", "between", "motion"]).catch("axis"),
  f: coeffSchema(4, [0, 2, -1, 0]), g: coeffSchema(4, [0, 0, 0, 0]), a: z.number().min(-50).max(50).catch(0), b: z.number().min(-50).max(50).catch(3), meets: z.boolean().catch(true),
  asks: asksSchema(integralAsks, ["indefinite", "definite", "areaAxis", "areaBetween", "distance"]), sheet: sheetSchema(1),
});
export function IntegralView() {
  const [state, update] = useStored("learncraft_math_integral_v1", integralSchema);
  const f = polyFrom(state.f); const g = polyFrom(state.g);
  const valid = state.a < state.b;
  const variable = state.mode === "motion" ? "t" : "x";
  const between = state.mode === "between" ? areaBetween(f, g, state.meets ? undefined : [state.a, state.b]) : null;
  const [from, to] = between ? [between.a, between.b] : [state.a, state.b];
  const drawable = between ? between.b > between.a : valid;
  return (
    <ToolLayout aside={<>
      <Card title="보기">
        <Segmented label="보기" value={state.mode} onChange={mode => update({ mode })} options={[{ value: "axis", label: "x축과의 넓이" }, { value: "between", label: "두 곡선 사이" }, { value: "motion", label: "속도와 거리" }]} />
      </Card>
      <Card title={state.mode === "motion" ? "속도 v(t)" : "함수"}>
        <CoefficientFields label={state.mode === "motion" ? "v(t)" : "f(x)"} values={state.f} onChange={value => update({ f: value })} />
        {state.mode === "between" && <div className="mt-3"><CoefficientFields label="g(x)" values={state.g} onChange={value => update({ g: value })} /></div>}
        {state.mode === "between" && <Toggle label="두 곡선의 교점 사이로" checked={state.meets} onChange={meets => update({ meets })} />}
        {(state.mode !== "between" || !state.meets) && <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="아래끝" value={state.a} min={-50} max={50} onChange={a => update({ a })} /><NumberField label="위끝" value={state.b} min={-50} max={50} onChange={b => update({ b })} /></div>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 정적분과 넓이)">
        <MultiChips options={integralAsks} value={state.asks} onChange={asks => update({ asks: asks as IntegralAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        {drawable ? <SvgView label="넓이를 색칠한 그래프" svg={areaSvg(f, state.mode === "between" ? g : null, from, to)} /> : <p role="status" className="py-16 text-center text-[.86rem] text-ink-4">{between ? "두 곡선이 두 점에서 만나지 않아요. 구간을 직접 정해 주세요." : "위끝이 아래끝보다 커야 해요."}</p>}
        <div className="min-w-0 space-y-2 text-ink">
          <p className="overflow-x-auto text-[.95rem]"><MathHtml html={tex(`\\int(${pTex(f, variable)})\\,d${variable}=${pTex(pAnti(f), variable)}+C`)} /></p>
          {drawable && state.mode === "axis" && <>
            <p className="overflow-x-auto text-[.95rem]"><MathHtml html={tex(`\\int_{${num(from, 3)}}^{${num(to, 3)}}f(x)\\,dx=${qTex(pDefinite(f, qFrom(from), qFrom(to)))}`)} /></p>
            <Stat label="곡선과 x축 사이의 넓이" value={<MathHtml html={tex(areaTex(absIntegral(f, from, to)))} />} note="부호가 바뀌는 곳에서 나누어 더함" />
          </>}
          {drawable && between && <Stat label={`두 곡선 사이의 넓이 [${num(from, 3)}, ${num(to, 3)}]`} value={<MathHtml html={tex(areaTex(between))} />} note="|f(x) − g(x)|의 정적분" />}
          {drawable && state.mode === "motion" && (() => { const result = motionIntegral(f, from, to); return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Stat label="위치의 변화량" value={<MathHtml html={tex(qTex(result.displacement))} />} note="∫ v(t) dt" /><Stat label="움직인 거리" value={<MathHtml html={tex(areaTex(result.distance))} />} note="∫ |v(t)| dt" /></div>; })()}
          <p className="text-[.76rem] leading-5 text-ink-4">근이 모두 유리수이면 넓이를 분수로 정확히, 아니면 소수로 보여 줘요.</p>
        </div>
      </section>
      <MathSheet id="math-integral-print" sections={integralProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "정적분과 넓이", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

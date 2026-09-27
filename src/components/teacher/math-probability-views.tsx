"use client";

import { z } from "zod";
import { num, tex } from "@/features/math/core";
import { CONFIDENCE, estimationAsks, estimationProblems, meanInterval, proportionInterval, sampleMean, sampleSizeFor, type EstimationAsk } from "@/features/math/estimation";
import { normalAsks, normalProblems, normalProb, normalSvg, standardize, tableValue, zTableHtml, type NormalAsk } from "@/features/math/normal";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, HtmlView, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MathSheet } from "./math-lab-shared";

/** TeX 수식 한 줄을 KaTeX로 그립니다. 수식은 만드는 쪽에서 숫자·정해진 기호로만 짭니다. */
export function Tex({ source, display = false }: { source: string; display?: boolean }) {
  return <span dangerouslySetInnerHTML={{ __html: tex(source, display) }} />;
}

/* ───── 정규분포 ───── */
const normalSchema = z.object({
  mean: z.number().min(-10000).max(10000).catch(60), sd: z.number().positive().max(10000).catch(10),
  from: z.number().min(-100000).max(100000).catch(50), to: z.number().min(-100000).max(100000).catch(80),
  lower: z.boolean().catch(true), upper: z.boolean().catch(true), table: z.boolean().catch(true),
  asks: asksSchema(normalAsks, ["standardize", "between", "reverse", "approx"]), sheet: sheetSchema(1),
});
export function NormalView() {
  const [state, update] = useStored("learncraft_math_normal_v1", normalSchema);
  const a = state.lower ? Math.min(state.from, state.to) : -Infinity;
  const b = state.upper ? Math.max(state.from, state.to) : Infinity;
  const za = standardize(a, state.mean, state.sd);
  const zb = standardize(b, state.mean, state.sd);
  const value = normalProb(a, b, state.mean, state.sd);
  const bound = (z: number) => (Number.isFinite(z) ? num(z, 2) : z > 0 ? "\\infty" : "-\\infty");
  const sections = normalProblems(state.asks, state.sheet.count, state.sheet.seed);
  if (state.table) sections.push({ heading: "표준정규분포표", problems: [], intro: { html: zTableHtml(), text: "표준정규분포표 P(0 ≤ Z ≤ z)는 인쇄한 학습지를 보세요." } });
  return (
    <ToolLayout aside={<>
      <Card title="정규분포 N(m, σ²)">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="평균 m" value={state.mean} min={-10000} max={10000} onChange={mean => update({ mean })} />
          <NumberField label="표준편차 σ" value={state.sd} min={0.01} max={10000} onChange={sd => update({ sd })} />
        </div>
      </Card>
      <Card title="구할 확률 P(a ≤ X ≤ b)">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="a" value={state.from} min={-100000} max={100000} onChange={from => update({ from })} />
          <NumberField label="b" value={state.to} min={-100000} max={100000} onChange={to => update({ to })} />
        </div>
        <Toggle label="아래 끝 a 쓰기(끄면 −∞)" checked={state.lower} onChange={lower => update({ lower })} />
        <Toggle label="위 끝 b 쓰기(끄면 +∞)" checked={state.upper} onChange={upper => update({ upper })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 정규분포)">
        <MultiChips options={normalAsks} value={state.asks} onChange={asks => update({ asks: asks as NormalAsk[] })} />
        <Toggle label="표준정규분포표 붙이기" checked={state.table} onChange={table => update({ table })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="overflow-x-auto"><SvgView label="정규분포 곡선" svg={normalSvg(state.mean, state.sd, a, b)} /></div>
        <div className="space-y-2 text-[.86rem]">
          <p><Tex source={`Z=\\frac{X-${num(state.mean, 2)}}{${num(state.sd, 2)}}`} /></p>
          <p><Tex source={`P(${bound(a)}\\le X\\le ${bound(b)})=P(${bound(za)}\\le Z\\le ${bound(zb)})`} /></p>
          <p className="rounded-xl bg-brand-page px-4 py-3 text-[1.05rem] font-extrabold">≈ {value.toFixed(4)}</p>
          <p className="text-[.74rem] leading-5 text-ink-4">값은 표준정규분포를 식(오차 함수)으로 계산한 것이에요. 교과서 표는 z를 소수 둘째 자리까지 읽고 값을 넷째 자리까지 적어요. 예: P(0 ≤ Z ≤ 1) = {tableValue(1).toFixed(4)}, P(0 ≤ Z ≤ 2) = {tableValue(2).toFixed(4)}</p>
        </div>
      </section>
      <section className={panelClass}>
        <h2 className="mb-2 text-sm font-extrabold">표준정규분포표 P(0 ≤ Z ≤ z)</h2>
        <HtmlView html={zTableHtml()} className="max-w-2xl" />
      </section>
      <MathSheet id="math-normal-print" sections={sections} options={{ title: state.sheet.title || "정규분포", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 통계적 추정 ───── */
const estimationSchema = z.object({
  mean: z.number().min(-100000).max(100000).catch(50), sd: z.number().positive().max(100000).catch(10), n: z.number().int().min(1).max(100000).catch(25),
  xbar: z.number().min(-100000).max(100000).catch(64.8), level: z.union([z.literal(95), z.literal(99)]).catch(95),
  phat: z.number().min(0).max(1).catch(0.8), pn: z.number().int().min(1).max(1000000).catch(400), length: z.number().positive().max(100000).catch(2),
  asks: asksSchema(estimationAsks, ["sampleMean", "meanCI", "length", "size", "proportion"]), sheet: sheetSchema(1),
});
export function EstimationView() {
  const [state, update] = useStored("learncraft_math_estimation_v1", estimationSchema);
  const sample = sampleMean(state.mean, state.sd, state.n);
  const interval = meanInterval(state.xbar, state.sd, state.n, state.level);
  const proportion = proportionInterval(state.phat, state.pn, state.level);
  const z = CONFIDENCE[state.level];
  return (
    <ToolLayout aside={<>
      <Card title="모집단과 표본">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="모평균 m" value={state.mean} min={-100000} max={100000} onChange={mean => update({ mean })} />
          <NumberField label="모표준편차 σ" value={state.sd} min={0.01} max={100000} onChange={sd => update({ sd })} />
          <NumberField label="표본 크기 n" value={state.n} min={1} max={100000} onChange={n => update({ n })} />
        </div>
        <NumberField className="mt-2" label="표본평균 x̄" value={state.xbar} min={-100000} max={100000} step={0.1} onChange={xbar => update({ xbar })} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">신뢰도</p>
        <Segmented label="신뢰도" value={state.level} onChange={level => update({ level })} options={[{ value: 95, label: "95% (1.96)" }, { value: 99, label: "99% (2.58)" }]} />
      </Card>
      <Card title="모비율">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="표본비율 p̂" value={state.phat} min={0} max={1} step={0.01} onChange={phat => update({ phat })} />
          <NumberField label="표본 크기" value={state.pn} min={1} max={1000000} onChange={pn => update({ pn })} />
        </div>
        <NumberField className="mt-2" label="원하는 신뢰구간 길이(표본 크기 구하기)" value={state.length} min={0.0001} max={100000} step={0.1} onChange={length => update({ length })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 통계적 추정)">
        <MultiChips options={estimationAsks} value={state.asks} onChange={asks => update({ asks: asks as EstimationAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="space-y-2 text-[.86rem]">
          <h2 className="text-sm font-extrabold">표본평균의 분포</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="E(X̄)" value={num(sample.mean, 4)} />
            <Stat label="V(X̄) = σ²/n" value={num(sample.variance, 4)} />
            <Stat label="σ(X̄) = σ/√n" value={num(sample.sd, 4)} />
          </div>
          <h2 className="pt-2 text-sm font-extrabold">모평균의 신뢰구간 (신뢰도 {state.level}%)</h2>
          <p><Tex source={`${num(state.xbar, 4)}-${z}\\times\\frac{${num(state.sd, 4)}}{\\sqrt{${state.n}}}\\le m\\le ${num(state.xbar, 4)}+${z}\\times\\frac{${num(state.sd, 4)}}{\\sqrt{${state.n}}}`} /></p>
          <p className="rounded-xl bg-brand-page px-4 py-3 font-extrabold">{num(interval.low, 4)} ≤ m ≤ {num(interval.high, 4)} <span className="ml-1 text-[.8rem] font-semibold text-ink-3">길이 {num(interval.length, 4)}</span></p>
          <p className="text-[.8rem]">길이를 {num(state.length, 4)} 이하로 하려면 표본 크기 n ≥ <b>{sampleSizeFor(state.sd, state.length, state.level)}</b></p>
        </div>
        <div className="space-y-2 text-[.86rem]">
          <h2 className="text-sm font-extrabold">모비율의 신뢰구간 (신뢰도 {state.level}%)</h2>
          <p><Tex source={`\\hat{p}-${z}\\sqrt{\\frac{\\hat{p}\\hat{q}}{n}}\\le p\\le \\hat{p}+${z}\\sqrt{\\frac{\\hat{p}\\hat{q}}{n}}`} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="√(p̂q̂/n)" value={num(proportion.se, 5)} />
            <Stat label="신뢰구간" value={`${num(proportion.low, 4)} ~ ${num(proportion.high, 4)}`} />
          </div>
          <p className="text-[.74rem] leading-5 text-ink-4">표본의 크기가 충분히 크면 표본비율 p̂은 근사적으로 정규분포 N(p, pq/n)을 따르고, 모비율 p 대신 p̂을 넣어 계산해요.</p>
        </div>
      </section>
      <MathSheet id="math-estimation-print" sections={estimationProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "통계적 추정", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

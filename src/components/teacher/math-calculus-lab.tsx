"use client";

import { z } from "zod";
import { Activity, AreaChart, Infinity as InfinityIcon, TrendingUp } from "lucide-react";
import { averageRate, derivAsks, derivProblems, derivativeSvg, lineTex, polyFrom, tangentAt, type DerivAsk } from "@/features/math/calc-derivative";
import { DEFAULT_PIECEWISE, limitAsks, limitProblems, piecewiseFacts, piecewiseHtml, piecewiseSvg, type LimitAsk } from "@/features/math/calc-limit";
import { pDeriv, pTex } from "@/features/math/calc-base";
import { qTex, tex } from "@/features/math/core";
import { Card, Toggle } from "./tool-panel";
import { asksSchema, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MATH_AREA, MathSheet } from "./math-lab-shared";
import { CoefficientFields, coeffSchema, IntegralView, UseView } from "./math-calculus-views";

export function MathCalculusLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="calculus" area={MATH_AREA} subject="미적분Ⅰ" title="미적분Ⅰ · 극한·미분·적분 도구" tabs={tabs}
      description="함수의 극한과 연속, 미분계수와 도함수, 도함수의 활용, 정적분과 넓이 단원의 계산기와 학습지입니다. 다항함수를 넣으면 증감표·접선·넓이를 분수로 정확히 구하고, 문제는 답이 깔끔하게 떨어지도록 만들어 정답과 함께 인쇄합니다."
      views={[
        { value: "limit", label: "극한과 연속", icon: InfinityIcon, note: "구간별로 정의한 함수의 좌극한·우극한·함숫값으로 연속을 판단하고, 0/0·∞/∞ 꼴 극한과 미정계수, 사잇값 정리 문제를 만들어요.", render: () => <LimitView /> },
        { value: "derivative", label: "미분계수와 도함수", icon: TrendingUp, note: "다항함수의 도함수, 평균변화율과 미분계수, 곡선 위의 점에서의 접선을 그래프로 보여 줘요.", render: () => <DerivativeView /> },
        { value: "use", label: "도함수의 활용", icon: Activity, note: "증감표를 자동으로 만들고 극값·그래프 개형, 닫힌구간의 최대·최소, f(x) = k의 실근 개수, 속도·가속도를 다뤄요.", render: () => <UseView /> },
        { value: "integral", label: "정적분과 넓이", icon: AreaChart, note: "부정적분·정적분을 분수로 정확히 구하고, 곡선과 x축·두 곡선 사이의 넓이와 속도로 움직인 거리를 구해요.", render: () => <IntegralView /> },
      ]} />
  );
}

const MathHtml = ({ html, className }: { html: string; className?: string }) => <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;

/* ───── 극한과 연속 ───── */
const limitSchema = z.object({
  a: z.number().min(-20).max(20).catch(DEFAULT_PIECEWISE.a),
  left: coeffSchema(3, DEFAULT_PIECEWISE.left), right: coeffSchema(3, DEFAULT_PIECEWISE.right),
  defined: z.boolean().catch(true), value: z.number().min(-1000).max(1000).catch(DEFAULT_PIECEWISE.value ?? 0),
  asks: asksSchema(limitAsks, ["onesided", "zero", "infinity", "constant", "continuous"]), sheet: sheetSchema(1),
});
function LimitView() {
  const [state, update] = useStored("learncraft_math_limit_v1", limitSchema);
  const piece = { a: state.a, left: state.left, right: state.right, value: state.defined ? state.value : null };
  const facts = piecewiseFacts(piece);
  const yes = (value: boolean) => value ? "예" : "아니요";
  return (
    <ToolLayout aside={<>
      <Card title="구간별로 정의한 함수">
        <NumberField label="경계 x = a" value={state.a} min={-20} max={20} onChange={a => update({ a })} />
        <div className="mt-3 space-y-3">
          <CoefficientFields label="x < a 의 식" values={state.left} onChange={left => update({ left })} />
          <CoefficientFields label="x > a 의 식" values={state.right} onChange={right => update({ right })} />
        </div>
        <Toggle label="x = a 에서 함숫값 정하기" checked={state.defined} onChange={defined => update({ defined })} />
        {state.defined && <NumberField label="f(a)" value={state.value} min={-1000} max={1000} onChange={value => update({ value })} />}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 함수의 극한과 연속)">
        <MultiChips options={limitAsks} value={state.asks} onChange={asks => update({ asks: asks as LimitAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="구간별로 정의한 함수의 그래프" svg={piecewiseSvg(piece)} />
        <div className="min-w-0 space-y-2 text-ink">
          <p className="overflow-x-auto text-[.95rem]"><MathHtml html={piecewiseHtml(piece)} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="좌극한" value={<MathHtml html={tex(qTex(facts.left))} />} />
            <Stat label="우극한" value={<MathHtml html={tex(qTex(facts.right))} />} />
            <Stat label="극한값" value={facts.exists ? <MathHtml html={tex(qTex(facts.left))} /> : "없음"} note={`극한이 있나요? ${yes(facts.exists)}`} />
            <Stat label="함숫값" value={facts.value ? <MathHtml html={tex(qTex(facts.value))} /> : "정의되지 않음"} note={`연속인가요? ${yes(facts.continuous)}`} />
          </div>
          <p className="text-[.76rem] leading-5 text-ink-4">좌극한과 우극한이 같으면 극한값이 있고, 그 값이 함숫값과 같으면 x = a에서 연속이에요. 그래프의 빈 점은 그 값을 갖지 않는다는 뜻이에요.</p>
        </div>
      </section>
      <MathSheet id="math-limit-print" sections={limitProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "함수의 극한과 연속", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 미분계수와 도함수 ───── */
const derivSchema = z.object({
  coeffs: coeffSchema(5, [1, -2, 0, 1, 0]), point: z.number().min(-20).max(20).catch(1),
  from: z.number().min(-20).max(20).catch(0), to: z.number().min(-20).max(20).catch(2), secant: z.boolean().catch(true),
  asks: asksSchema(derivAsks, ["derivative", "average", "tangent", "slope"]), sheet: sheetSchema(2),
});
function DerivativeView() {
  const [state, update] = useStored("learncraft_math_derivative_v1", derivSchema);
  const poly = polyFrom(state.coeffs);
  const tangent = tangentAt(poly, state.point);
  const secantOk = state.from !== state.to;
  return (
    <ToolLayout aside={<>
      <Card title="함수 f(x)"><CoefficientFields values={state.coeffs} onChange={coeffs => update({ coeffs })} /></Card>
      <Card title="접선과 평균변화율">
        <NumberField label="접점의 x좌표 a" value={state.point} min={-20} max={20} onChange={point => update({ point })} />
        <Toggle label="평균변화율(할선) 보기" checked={state.secant} onChange={secant => update({ secant })} />
        {state.secant && <div className="grid grid-cols-2 gap-2"><NumberField label="구간 시작" value={state.from} min={-20} max={20} onChange={from => update({ from })} /><NumberField label="구간 끝" value={state.to} min={-20} max={20} onChange={to => update({ to })} /></div>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 미분계수와 도함수)">
        <MultiChips options={derivAsks} value={state.asks} onChange={asks => update({ asks: asks as DerivAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="함수와 접선의 그래프" svg={derivativeSvg(poly, { tangent: state.point, secant: state.secant && secantOk ? [state.from, state.to] : undefined })} />
        <div className="min-w-0 space-y-2 text-ink">
          <p className="overflow-x-auto text-[.95rem]"><MathHtml html={tex(`f(x)=${pTex(poly)}`)} /></p>
          <p className="overflow-x-auto text-[.95rem]"><MathHtml html={tex(`f'(x)=${pTex(pDeriv(poly))}`)} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="미분계수" value={<MathHtml html={tex(`f'(${state.point})=${qTex(tangent.slope)}`)} />} />
            <Stat label="접선" value={<MathHtml html={tex(lineTex(tangent.line))} />} />
            {state.secant && secantOk && <Stat label={`평균변화율 [${state.from}, ${state.to}]`} value={<MathHtml html={tex(qTex(averageRate(poly, state.from, state.to)))} />} note="할선의 기울기" />}
          </div>
          <p className="text-[.76rem] leading-5 text-ink-4">미분계수는 구간을 좁혀 갈 때 평균변화율이 다가가는 값이고, 접선의 기울기와 같아요.</p>
        </div>
      </section>
      <MathSheet id="math-derivative-print" sections={derivProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "미분계수와 도함수", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

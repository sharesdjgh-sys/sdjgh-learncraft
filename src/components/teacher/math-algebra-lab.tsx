"use client";

import { z } from "zod";
import { Calculator, Sigma, Spline, Triangle, Waves } from "lucide-react";
import { DEFAULT_EXPLOG, expLogAsks, expLogGraphAsks, expLogGraphProblems, expLogProblems, explogFacts, explogSvg, explogTex, explogValid, logCalcHtml, powerCalcHtml, type ExpLogAsk, type ExpLogGraphAsk } from "@/features/math/alg-explog";
import { q, tex } from "@/features/math/core";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MATH_AREA, MathSheet } from "./math-lab-shared";
import { LawView, SequenceView, TrigView } from "./math-algebra-views";

export function MathAlgebraLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="algebra" area={MATH_AREA} subject="대수" title="대수 · 지수·로그·삼각함수·수열 도구" tabs={tabs}
      description="지수와 로그, 지수함수·로그함수, 삼각함수, 사인법칙·코사인법칙, 수열 단원의 계산기와 학습지입니다. 식을 넣으면 바로 계산하고 그래프를 그리며, 문제는 답이 깔끔하게 떨어지도록 만들어 정답과 함께 인쇄합니다."
      views={[
        { value: "explog", label: "지수와 로그", icon: Calculator, note: "거듭제곱근, 유리수 지수, 로그의 성질과 밑의 변환, 상용로그를 계산하고 문제를 만들어요.", render: () => <ExpLogView /> },
        { value: "explogGraph", label: "지수·로그함수", icon: Spline, note: "y = aˣ⁻ᵖ + q, y = logₐ(x − p) + q 의 그래프와 점근선, 역함수를 보고 방정식·부등식 문제를 만들어요.", render: () => <ExpLogGraphView /> },
        { value: "trig", label: "삼각함수", icon: Waves, note: "호도법, 단위원 위의 삼각함수 값, 특수각 표, y = a sin(bx + c) + d 꼴의 그래프와 삼각방정식·부등식을 다뤄요.", render: () => <TrigView /> },
        { value: "law", label: "사인·코사인법칙", icon: Triangle, note: "조건(SSS·SAS·ASA·AAS·SSA)으로 삼각형을 풀고 넓이와 외접원의 반지름을 구해요. SSA는 삼각형이 0·1·2개인지 가려요.", render: () => <LawView /> },
        { value: "sequence", label: "수열", icon: Sigma, note: "등차·등비수열의 일반항과 합, Σ의 계산, 귀납적으로 정의된 수열, 수학적 귀납법 증명의 빈칸 문제를 만들어요.", render: () => <SequenceView /> },
      ]} />
  );
}

/** tex()로 만든 수식 HTML을 글자 색을 따라 보여 줍니다. */
export function MathHtml({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ───── 지수와 로그 ───── */
const expLogSchema = z.object({
  logBase: z.number().positive().max(1e6).catch(2), logValue: z.number().positive().max(1e12).catch(32),
  powBase: z.number().positive().max(1e6).catch(8), powTop: z.number().int().min(-99).max(99).catch(2), powBottom: z.number().int().min(1).max(99).catch(3),
  asks: asksSchema(expLogAsks, ["root", "exponent", "logprop", "change"]), sheet: sheetSchema(2),
});
function ExpLogView() {
  const [state, update] = useStored("learncraft_math_explog_v1", expLogSchema);
  const rules = [
    "\\log_{a}xy=\\log_{a}x+\\log_{a}y", "\\log_{a}\\frac{x}{y}=\\log_{a}x-\\log_{a}y", "\\log_{a}x^{k}=k\\log_{a}x",
    "\\log_{a}b=\\frac{\\log_{c}b}{\\log_{c}a}", "\\log_{a^{m}}b^{n}=\\frac{n}{m}\\log_{a}b", "a^{\\log_{a}b}=b",
  ];
  return (
    <ToolLayout aside={<>
      <Card title="로그 계산" help="밑은 0보다 크고 1이 아니어야 하고, 진수는 0보다 커야 해요.">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="밑 a" value={state.logBase} min={0.0001} max={1e6} step={0.5} onChange={logBase => update({ logBase })} />
          <NumberField label="진수 b" value={state.logValue} min={0.0001} max={1e12} onChange={logValue => update({ logValue })} />
        </div>
        <p className="mt-3 rounded-xl bg-brand-page px-3 py-2.5 text-[1rem] text-ink"><MathHtml html={logCalcHtml(state.logBase, state.logValue)} /></p>
      </Card>
      <Card title="유리수 지수 계산">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="밑" value={state.powBase} min={0.0001} max={1e6} onChange={powBase => update({ powBase })} />
          <NumberField label="지수 분자" value={state.powTop} min={-99} max={99} onChange={powTop => update({ powTop: Math.round(powTop) })} />
          <NumberField label="지수 분모" value={state.powBottom} min={1} max={99} onChange={powBottom => update({ powBottom: Math.max(1, Math.round(powBottom)) })} />
        </div>
        <p className="mt-3 rounded-xl bg-brand-page px-3 py-2.5 text-[1rem] text-ink"><MathHtml html={powerCalcHtml(state.powBase, q(state.powTop, state.powBottom))} /></p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 지수와 로그)">
        <MultiChips options={expLogAsks} value={state.asks} onChange={asks => update({ asks: asks as ExpLogAsk[] })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        <h2 className="mb-2 text-sm font-extrabold text-ink">로그의 성질 <span className="text-[.74rem] font-medium text-ink-4">(a &gt; 0, a ≠ 1, x &gt; 0, y &gt; 0)</span></h2>
        <ul className="grid gap-2 text-[.95rem] text-ink sm:grid-cols-2 xl:grid-cols-3">{rules.map(rule => <li key={rule} className="overflow-x-auto rounded-xl bg-surface-2 px-3 py-2"><MathHtml html={tex(rule)} /></li>)}</ul>
        <p className="mt-3 text-[.76rem] leading-5 text-ink-4">상용로그 문제는 교과서처럼 log 2 = 0.3010, log 3 = 0.4771을 주고 계산해요. 자릿수 문제는 근삿값으로 구한 자릿수가 참값과 같은 지수만 골라요.</p>
      </section>
      <MathSheet id="math-explog-print" sections={expLogProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "지수와 로그", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 지수함수·로그함수 ───── */
const graphSchema = z.object({
  kind: z.enum(["exp", "log"]).catch(DEFAULT_EXPLOG.kind), base: z.number().positive().max(100).catch(DEFAULT_EXPLOG.base),
  p: z.number().min(-20).max(20).catch(DEFAULT_EXPLOG.p), q: z.number().min(-20).max(20).catch(DEFAULT_EXPLOG.q), inverse: z.boolean().catch(false),
  asks: asksSchema(expLogGraphAsks, ["facts", "expeq", "expineq", "logeq", "logineq"]), sheet: sheetSchema(2),
});
function ExpLogGraphView() {
  const [state, update] = useStored("learncraft_math_explog_graph_v1", graphSchema);
  const setup = { kind: state.kind, base: state.base, p: state.p, q: state.q, inverse: state.inverse };
  const valid = explogValid(setup);
  const facts = explogFacts(setup);
  return (
    <ToolLayout aside={<>
      <Card title="함수">
        <Segmented label="함수의 종류" value={state.kind} onChange={kind => update({ kind })} options={[{ value: "exp", label: "지수함수" }, { value: "log", label: "로그함수" }]} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <NumberField label="밑 a" value={state.base} min={0.01} max={100} step={0.5} onChange={base => update({ base })} />
          <NumberField label="p (x축 이동)" value={state.p} min={-20} max={20} onChange={p => update({ p })} />
          <NumberField label="q (y축 이동)" value={state.q} min={-20} max={20} onChange={value => update({ q: value })} />
        </div>
        {!valid && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">밑은 0보다 크고 1이 아니어야 해요.</p>}
        <div className="mt-2"><Toggle label="역함수와 y = x 함께 보기" checked={state.inverse} onChange={inverse => update({ inverse })} /></div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 지수함수와 로그함수)">
        <MultiChips options={expLogGraphAsks} value={state.asks} onChange={asks => update({ asks: asks as ExpLogGraphAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        {valid ? <SvgView label="지수함수·로그함수의 그래프" svg={explogSvg(setup)} /> : <p className="py-16 text-center text-[.86rem] text-ink-4">그래프를 그릴 수 없는 밑이에요.</p>}
        {valid && <div className="min-w-0 space-y-2 text-[.9rem] text-ink">
          <p className="overflow-x-auto rounded-xl bg-brand-page px-3 py-2.5 text-[1.05rem]"><MathHtml html={tex(explogTex(setup))} /></p>
          <dl className="grid gap-1.5">
            {[["정의역", facts.domain], ["치역", facts.range], ["점근선", facts.asymptote], ["지나는 점", facts.point]].map(([label, value]) => <div key={label} className="flex flex-wrap items-baseline gap-2"><dt className="w-20 shrink-0 text-[.8rem] font-bold text-ink-3">{label}</dt><dd className="min-w-0"><MathHtml html={tex(value)} /></dd></div>)}
          </dl>
          <p className="text-[.78rem] text-ink-3">밑이 {state.base > 1 ? "1보다 커서 x가 커지면 y도 커져요(증가)." : "0과 1 사이라 x가 커지면 y는 작아져요(감소)."} 부등식을 풀 때 {state.base > 1 ? "부등호 방향은 그대로예요." : "부등호 방향이 바뀌어요."}</p>
        </div>}
      </section>
      <MathSheet id="math-explog-graph-print" sections={expLogGraphProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "지수함수와 로그함수", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

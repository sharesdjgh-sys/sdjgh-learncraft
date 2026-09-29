"use client";

import { z } from "zod";
import { BarChart3, Bell, Dices, ListOrdered, Target } from "lucide-react";
import { q, qTex } from "@/features/math/core";
import { binomial, distributionAsks, distributionProblems, distStats, distSvg, rowsFrom, sqrtQTex, type DistributionAsk } from "@/features/math/distribution";
import { comb } from "@/features/math/pg-common";
import { arrangements, arrangementTex, binomialBaseTex, binomialCoefficients, binomialExpansionTex, cTex, countingAsks, countingProblems, hTex, pascalSvg, piTex, repComb, repPerm, type CountingAsk } from "@/features/math/prob-counting";
import { bothRed, conditionalTex, DEFAULT_TABLE, probabilityAsks, probabilityProblems, tableStats, treeSvg, type ProbabilityAsk } from "@/features/math/probability";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, fieldClass, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MATH_AREA, MathSheet } from "./math-lab-shared";
import { EstimationView, NormalView, Tex } from "./math-probability-views";

export function MathProbabilityLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="probability" area={MATH_AREA} subject="확률과 통계" title="확률과 통계 · 경우의 수·확률·분포·추정 도구" tabs={tabs}
      description="중복순열·중복조합·이항정리, 조건부확률과 독립, 확률분포와 이항분포, 정규분포, 통계적 추정을 식으로 계산하고 그래프를 그립니다. 문제는 답이 깔끔하게 떨어지도록 만들고 정답과 함께 인쇄합니다."
      views={[
        { value: "counting", label: "경우의 수", icon: ListOrdered, note: "중복순열·같은 것이 있는 순열·중복조합·이항정리를 계산하고, 파스칼의 삼각형을 그려요.", render: () => <CountingView /> },
        { value: "probability", label: "확률", icon: Dices, note: "분할표로 조건부확률과 독립을 따지고, 공 꺼내기 수형도로 곱셈정리를 보여 줘요.", render: () => <ProbabilityView /> },
        { value: "distribution", label: "확률분포", icon: BarChart3, note: "확률분포표로 평균·분산·표준편차를 구하고, 이항분포 B(n, p)의 막대그래프를 그려요.", render: () => <DistributionView /> },
        { value: "normal", label: "정규분포", icon: Bell, note: "표준화하고 넓이를 색칠해 확률을 구해요. 표준정규분포표를 함께 인쇄할 수 있어요.", render: () => <NormalView /> },
        { value: "estimation", label: "통계적 추정", icon: Target, note: "표본평균의 분포와 모평균·모비율의 신뢰구간, 필요한 표본의 크기를 구해요.", render: () => <EstimationView /> },
      ]} />
  );
}

/* ───── 경우의 수 ───── */
const countingSchema = z.object({
  n: z.number().int().min(1).max(20).catch(4), r: z.number().int().min(0).max(20).catch(3),
  word: z.string().max(16).catch("BANANA"),
  a: z.number().int().min(-9).max(9).catch(2), b: z.number().int().min(-9).max(9).catch(1), power: z.number().int().min(1).max(10).catch(5), k: z.number().int().min(0).max(10).catch(2),
  rows: z.number().int().min(3).max(12).catch(7),
  asks: asksSchema(countingAsks, ["repPerm", "same", "repComb", "equation", "binomial"]), sheet: sheetSchema(2),
});
function CountingView() {
  const [state, update] = useStored("learncraft_math_counting_v1", countingSchema);
  const word = arrangements(state.word);
  const k = Math.min(state.k, state.power);
  const coefficient = binomialCoefficients(state.a, state.b, state.power)[k];
  return (
    <ToolLayout aside={<>
      <Card title="n과 r">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="n (서로 다른 것의 수)" value={state.n} min={1} max={20} onChange={n => update({ n })} />
          <NumberField label="r (택하는 수)" value={state.r} min={0} max={20} onChange={r => update({ r })} />
        </div>
      </Card>
      <Card title="같은 것이 있는 순열" help="낱말의 글자를 모두 일렬로 늘어놓는 방법의 수를 구해요. 빈칸은 빼고 셉니다.">
        <input value={state.word} maxLength={16} onChange={event => update({ word: event.target.value })} aria-label="낱말" className={fieldClass} />
      </Card>
      <Card title="이항정리 (ax + b)ⁿ">
        <div className="grid grid-cols-4 gap-2">
          <NumberField label="a" value={state.a} min={-9} max={9} onChange={a => update({ a })} />
          <NumberField label="b" value={state.b} min={-9} max={9} onChange={b => update({ b })} />
          <NumberField label="n" value={state.power} min={1} max={10} onChange={power => update({ power })} />
          <NumberField label="xᵏ의 k" value={state.k} min={0} max={10} onChange={value => update({ k: value })} />
        </div>
        <NumberField className="mt-2" label="파스칼의 삼각형 줄 수" value={state.rows} min={3} max={12} onChange={rows => update({ rows })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 여러 가지 순열과 조합)">
        <MultiChips options={countingAsks} value={state.asks} onChange={asks => update({ asks: asks as CountingAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label="중복순열" value={<Tex source={`${piTex(state.n, state.r)}=${state.n}^{${state.r}}=${repPerm(state.n, state.r)}`} />} note="서로 다른 n개에서 중복을 허락해 r개를 일렬로" />
          <Stat label="중복조합" value={<Tex source={`${hTex(state.n, state.r)}=${cTex(state.n + state.r - 1, state.r)}=${repComb(state.n, state.r)}`} />} note="서로 다른 n개에서 중복을 허락해 r개를 택함" />
          <Stat label="조합(비교)" value={<Tex source={`${cTex(state.n, state.r)}=${comb(state.n, state.r)}`} />} note="중복 없이 r개를 택함" />
        </div>
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-[.86rem]">
          <p className="font-bold">‘{state.word || "—"}’ 글자 {word.length}개 나열</p>
          {word.length ? <p className="mt-1"><Tex source={arrangementTex(state.word)} /> <span className="text-[.76rem] text-ink-4">{word.repeated.length ? `같은 글자: ${word.repeated.map(([letter, count]) => `${letter} ${count}개`).join(", ")}` : "같은 글자가 없어요."}</span></p> : <p className="mt-1 text-ink-4">낱말을 넣어 주세요.</p>}
        </div>
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-[.86rem]">
          <p className="break-all"><Tex source={`${binomialBaseTex(state.a, state.b, state.power)}=${binomialExpansionTex(state.a, state.b, state.power)}`} /></p>
          <p className="mt-1"><Tex source={k === 1 ? "x" : `x^{${k}}`} />의 계수: <Tex source={`${cTex(state.power, k)}\\,${state.a < 0 ? `(${state.a})` : state.a}^{${k}}\\,${state.b < 0 ? `(${state.b})` : state.b}^{${state.power - k}}=${coefficient}`} /></p>
        </div>
        <div className="overflow-x-auto"><SvgView label="파스칼의 삼각형" svg={pascalSvg(state.rows, { highlight: state.power <= state.rows ? state.power : undefined, pick: state.power <= state.rows ? [state.power, k] : undefined })} /></div>
        <p className="text-[.74rem] leading-5 text-ink-4">파스칼의 삼각형에서 n번째 줄은 (a + b)ⁿ의 전개식의 이항계수예요. 칠한 줄이 지금 n이고, 노란 칸이 xᵏ 항의 ₙCₖ예요.</p>
      </section>
      <MathSheet id="math-counting-print" sections={countingProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "여러 가지 순열과 조합", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 확률 ───── */
const probabilitySchema = z.object({
  rows: z.tuple([z.string().max(12), z.string().max(12)]).catch(DEFAULT_TABLE.rows),
  cols: z.tuple([z.string().max(12), z.string().max(12)]).catch(DEFAULT_TABLE.cols),
  counts: z.tuple([z.tuple([z.number().int().min(0).max(9999), z.number().int().min(0).max(9999)]), z.tuple([z.number().int().min(0).max(9999), z.number().int().min(0).max(9999)])]).catch(DEFAULT_TABLE.counts),
  red: z.number().int().min(1).max(20).catch(3), blue: z.number().int().min(1).max(20).catch(2), replace: z.boolean().catch(false),
  asks: asksSchema(probabilityAsks, ["classic", "complement", "addition", "conditional", "multiply", "independent"]), sheet: sheetSchema(1),
});
function ProbabilityView() {
  const [state, update] = useStored("learncraft_math_probability_v1", probabilitySchema);
  const table = { rows: state.rows, cols: state.cols, counts: state.counts };
  const stats = tableStats(table);
  const setCount = (i: 0 | 1, j: 0 | 1, value: number) => update({ counts: state.counts.map((row, at) => at === i ? row.map((cell, col) => col === j ? value : cell) : row) as typeof state.counts });
  const frac = (value: ReturnType<typeof q> | null) => value ? qTex(value) : "\\text{—}";
  return (
    <ToolLayout aside={<>
      <Card title="분할표" help="행 첫째 줄을 사건 A, 열 첫째 칸을 사건 B로 봐요.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[17rem] border-collapse text-[.8rem]">
            <thead><tr><th />{[0, 1].map(j => <th key={j} className="px-1 pb-1"><input value={state.cols[j]} maxLength={12} onChange={event => update({ cols: state.cols.map((item, at) => at === j ? event.target.value : item) as [string, string] })} aria-label={`열 ${j + 1} 이름`} className={`${fieldClass} py-1 text-[.78rem]`} /></th>)}</tr></thead>
            <tbody>{([0, 1] as const).map(i => <tr key={i}>
              <td className="pr-1"><input value={state.rows[i]} maxLength={12} onChange={event => update({ rows: state.rows.map((item, at) => at === i ? event.target.value : item) as [string, string] })} aria-label={`행 ${i + 1} 이름`} className={`${fieldClass} py-1 text-[.78rem]`} /></td>
              {([0, 1] as const).map(j => <td key={j} className="px-1 py-0.5"><NumberField label="" value={state.counts[i][j]} min={0} max={9999} onChange={value => setCount(i, j, value)} /></td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </Card>
      <Card title="공 꺼내기 수형도">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="빨간 공" value={state.red} min={1} max={20} onChange={red => update({ red })} />
          <NumberField label="파란 공" value={state.blue} min={1} max={20} onChange={blue => update({ blue })} />
        </div>
        <Toggle label="꺼낸 공을 다시 넣기" checked={state.replace} onChange={replace => update({ replace })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 확률의 계산)">
        <MultiChips options={probabilityAsks} value={state.asks} onChange={asks => update({ asks: asks as ProbabilityAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="space-y-2 text-[.86rem]">
          <h2 className="text-sm font-extrabold">분할표로 본 확률 <span className="text-[.74rem] font-medium text-ink-4">전체 {stats.total}명</span></h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label={`P(A) · ${state.rows[0]}`} value={<Tex source={frac(stats.pA)} />} />
            <Stat label={`P(B) · ${state.cols[0]}`} value={<Tex source={frac(stats.pB)} />} />
            <Stat label="P(A∩B)" value={<Tex source={frac(stats.pAB)} />} />
          </div>
          <p><Tex source={conditionalTex(table)} /></p>
          <p><Tex source={`P(A\\mid B)=${frac(stats.aGivenB)}`} /></p>
          <p className="rounded-xl bg-brand-page px-3 py-2 font-bold">{stats.total ? (stats.independent ? "P(A∩B) = P(A)P(B)이므로 A와 B는 서로 독립이에요." : "P(A∩B) ≠ P(A)P(B)이므로 A와 B는 서로 종속이에요.") : "표에 수를 넣어 주세요."}</p>
          <p className="text-[.74rem] leading-5 text-ink-4">곱셈정리: P(A∩B) = P(A)·P(B|A). 두 사건이 독립이면 P(B|A) = P(B)예요.</p>
        </div>
        <div className="space-y-2">
          <div className="overflow-x-auto"><SvgView label="수형도" svg={treeSvg(state.red, state.blue, state.replace)} /></div>
          <p className="text-center text-[.86rem]">두 번 모두 빨간 공: <Tex source={qTex(bothRed(state.red, state.blue, state.replace))} /></p>
        </div>
      </section>
      <MathSheet id="math-probability-print" sections={probabilityProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "확률의 계산", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 확률분포 ───── */
const distributionSchema = z.object({
  xs: z.array(z.number().min(-1000).max(1000)).min(1).max(8).catch([0, 1, 2, 3]),
  weights: z.array(z.number().int().min(0).max(1000)).min(1).max(8).catch([1, 3, 3, 1]),
  denominator: z.number().int().min(1).max(1000).catch(8),
  n: z.number().int().min(1).max(60).catch(10), top: z.number().int().min(0).max(100).catch(1), bottom: z.number().int().min(1).max(100).catch(2),
  mode: z.enum(["table", "binomial"]).catch("table"),
  asks: asksSchema(distributionAsks, ["table", "blank", "linear", "binomial", "binomialProb"]), sheet: sheetSchema(1),
});
function DistributionView() {
  const [state, update] = useStored("learncraft_math_distribution_v1", distributionSchema);
  const length = Math.min(state.xs.length, state.weights.length);
  const xs = state.xs.slice(0, length);
  const weights = state.weights.slice(0, length);
  const rows = rowsFrom(xs, weights, state.denominator);
  const stats = distStats(rows);
  const p = state.top <= state.bottom ? q(state.top, state.bottom) : q(1);
  const binom = binomial(state.n, p);
  const setAt = (key: "xs" | "weights", index: number, value: number) => update(key === "xs" ? { xs: state.xs.map((item, at) => at === index ? value : item) } : { weights: state.weights.map((item, at) => at === index ? value : item) });
  return (
    <ToolLayout aside={<>
      <Card title="보기">
        <Segmented label="보기" value={state.mode} onChange={mode => update({ mode })} options={[{ value: "table", label: "확률분포표" }, { value: "binomial", label: "이항분포" }]} />
      </Card>
      {state.mode === "table" ? <Card title="확률분포표" help="확률은 ‘분자 ÷ 공통 분모’로 넣어요. 분자의 합이 분모와 같아야 확률의 합이 1이에요.">
        <NumberField label="공통 분모" value={state.denominator} min={1} max={1000} onChange={denominator => update({ denominator })} />
        <div className="mt-2 space-y-1.5">
          {xs.map((x, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-1.5">
            <NumberField label={index ? "" : "X의 값"} value={x} min={-1000} max={1000} onChange={value => setAt("xs", index, value)} />
            <NumberField label={index ? "" : "확률 분자"} value={weights[index]} min={0} max={1000} onChange={value => setAt("weights", index, value)} />
            <button type="button" disabled={length <= 1} onClick={() => update({ xs: xs.filter((_, at) => at !== index), weights: weights.filter((_, at) => at !== index) })} className="min-h-9 rounded-lg px-2 text-xs text-ink-4 hover:text-danger disabled:opacity-40" aria-label="칸 지우기">빼기</button>
          </div>)}
        </div>
        <button type="button" disabled={length >= 8} onClick={() => update({ xs: [...xs, (xs.at(-1) ?? 0) + 1], weights: [...weights, 1] })} className="mt-2 text-xs font-bold text-brand-dark disabled:opacity-40">+ 칸 더하기</button>
      </Card> : <Card title="이항분포 B(n, p)">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="n" value={state.n} min={1} max={60} onChange={n => update({ n })} />
          <NumberField label="p 분자" value={state.top} min={0} max={100} onChange={top => update({ top })} />
          <NumberField label="p 분모" value={state.bottom} min={1} max={100} onChange={bottom => update({ bottom })} />
        </div>
        {state.top > state.bottom && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">확률 p는 1보다 클 수 없어요.</p>}
      </Card>}
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 확률분포와 이항분포)">
        <MultiChips options={distributionAsks} value={state.asks} onChange={asks => update({ asks: asks as DistributionAsk[] })} />
      </SheetCard>
    </>}>
      {state.mode === "table" ? <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="overflow-x-auto"><SvgView label="확률분포" svg={distSvg(xs, rows.map(row => row.p.n / row.p.d), { mean: stats.valid ? stats.mean.n / stats.mean.d : undefined })} /></div>
        <div className="space-y-2 text-[.86rem]">
          {!stats.valid && <p role="alert" className="font-semibold text-warn">확률의 합이 <Tex source={qTex(stats.sum)} />예요. 1이 되도록 고쳐 주세요.</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="E(X)" value={<Tex source={qTex(stats.mean)} />} />
            <Stat label="V(X)" value={<Tex source={qTex(stats.variance)} />} note="E(X²) − {E(X)}²" />
            <Stat label="σ(X)" value={<Tex source={sqrtQTex(stats.variance)} />} />
          </div>
          <p className="text-[.74rem] leading-5 text-ink-4">E(aX+b) = aE(X)+b, V(aX+b) = a²V(X), σ(aX+b) = |a|σ(X)</p>
        </div>
      </section> : <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="overflow-x-auto"><SvgView label="이항분포" svg={distSvg(binom.probs.map((_, k) => k), binom.probs, { mean: binom.mean.n / binom.mean.d, title: `B(${state.n}, ${p.d === 1 ? p.n : `${p.n}/${p.d}`})` })} /></div>
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="E(X) = np" value={<Tex source={qTex(binom.mean)} />} />
            <Stat label="V(X) = npq" value={<Tex source={qTex(binom.variance)} />} />
            <Stat label="σ(X)" value={<Tex source={sqrtQTex(binom.variance)} />} />
          </div>
          <p className="text-[.8rem]"><Tex source={`P(X=r)=${cTex(state.n, "r")}\\,p^{r}q^{${state.n}-r}`} /> (q = 1 − p)</p>
          <p className="text-[.74rem] text-ink-4">n이 커지면 막대그래프가 종 모양에 가까워져요(정규분포 근사).</p>
        </div>
      </section>}
      <MathSheet id="math-distribution-print" sections={distributionProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "확률분포와 이항분포", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

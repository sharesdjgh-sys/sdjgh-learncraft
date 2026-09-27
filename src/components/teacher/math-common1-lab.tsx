"use client";

import { z } from "zod";
import { Dices, Grid3x3, Sigma, Spline, SquareFunction, Variable } from "lucide-react";
import { q, qTex, qText, texPlain } from "@/features/math/core";
import { add, coefficientsText, factorRational, factorTex, mul, parseCoefficients, polyAsks, polyProblems, ptex, sub, synthetic, syntheticHtml, type PolyAsk } from "@/features/math/cm-poly";
import {
  cAdd, cDiv, cMul, cSub, cTex, cx, extremaOn, functionAsks, functionProblems, lineRelation, parabolaSvg, quadAsks, quadProblems, quadraticInequality, quadTex, solveQuadratic, standardTex, vertex,
  type FunctionAsk, type QuadAsk,
} from "@/features/math/cm-quadratic";
import { intervalTex } from "@/features/math/cm-plane";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, fieldClass, HtmlView, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MATH_AREA, MathSheet } from "./math-lab-shared";
import { CountingView, EquationView, MatrixView, Tex } from "./math-common1-views";

export function MathCommon1Lab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="common1" area={MATH_AREA} subject="공통수학 1" title="공통수학 1 · 다항식·방정식·경우의 수·행렬 도구" tabs={tabs}
      description="다항식의 연산과 조립제법, 복소수와 이차방정식, 이차함수, 여러 가지 방정식과 부등식, 경우의 수, 행렬을 식으로 계산하고 그래프를 그립니다. 문제는 답이 깔끔하게 떨어지도록 만들어 정답·풀이와 함께 인쇄합니다."
      views={[
        { value: "poly", label: "다항식", icon: Variable, note: "계수를 넣으면 곱·합, 조립제법 표, 나머지, 인수분해를 바로 보여 줘요. 곱셈 공식·나머지 정리·인수 정리·항등식 문제를 만들어요.", render: () => <PolyView /> },
        { value: "quadratic", label: "복소수·이차방정식", icon: Sigma, note: "복소수의 사칙연산, 판별식과 근의 판별, 근과 계수의 관계, 두 수를 근으로 하는 이차방정식을 다뤄요.", render: () => <QuadraticView /> },
        { value: "parabola", label: "이차함수", icon: Spline, note: "이차함수의 그래프와 꼭짓점, 제한된 범위의 최대·최소, 직선과의 위치 관계, 이차부등식의 해를 그래프로 보여 줘요.", render: () => <ParabolaView /> },
        { value: "equation", label: "방정식·부등식", icon: SquareFunction, note: "삼차·사차방정식, 연립이차방정식, 연립일차부등식, 절댓값을 포함한 부등식, 연립이차부등식을 수직선과 함께 풀어요.", render: () => <EquationView /> },
        { value: "counting", label: "경우의 수", icon: Dices, note: "합의 법칙·곱의 법칙, 순열 ₙPᵣ와 조합 ₙCᵣ, 약수의 개수를 계산하고 서기·뽑기 문제를 만들어요.", render: () => <CountingView /> },
        { value: "matrix", label: "행렬", icon: Grid3x3, note: "행렬을 고치면 덧셈·뺄셈·실수배·곱셈을 계산하고, 곱할 수 있는지도 알려 줘요.", render: () => <MatrixView /> },
      ]} />
  );
}

/* ───── 다항식 ───── */
const polySchema = z.object({
  f: z.string().max(60).catch("1, -2, -5, 6"), g: z.string().max(60).catch("1, -1"), a: z.number().min(-20).max(20).catch(1),
  asks: asksSchema(polyAsks, ["expand", "divide", "remainder", "factor"]), sheet: sheetSchema(2),
});
function PolyView() {
  const [state, update] = useStored("learncraft_math_poly_v1", polySchema);
  const f = parseCoefficients(state.f);
  const g = parseCoefficients(state.g);
  const a = q(Math.round(state.a));
  const division = f ? synthetic(f, a) : null;
  const factored = f ? factorRational(f) : null;
  return (
    <ToolLayout aside={<>
      <Card title="다항식" help="계수를 높은 차수부터 쉼표로 적어요. 예: 1, -2, -5, 6 → x³ − 2x² − 5x + 6 (빠진 차수는 0으로)">
        <label className="block text-xs font-semibold text-ink-4">f(x)의 계수<input value={state.f} maxLength={60} onChange={event => update({ f: event.target.value })} className={`${fieldClass} mt-1`} /></label>
        <label className="mt-2 block text-xs font-semibold text-ink-4">g(x)의 계수<input value={state.g} maxLength={60} onChange={event => update({ g: event.target.value })} className={`${fieldClass} mt-1`} /></label>
        {(!f || !g) && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">계수는 숫자(분수는 1/2)로 7개까지 적어 주세요.</p>}
        <NumberField className="mt-2" label="조립제법으로 나눌 식 x − a의 a (정수)" value={state.a} min={-20} max={20} onChange={value => update({ a: value })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 다항식의 연산과 인수분해)">
        <MultiChips options={polyAsks} value={state.asks} onChange={asks => update({ asks: asks as PolyAsk[] })} />
      </SheetCard>
    </>}>
      {f && g && division && factored && <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="min-w-0 space-y-2 text-[.9rem]">
          <p><Tex source={`f(x)=${ptex(f)}`} /></p>
          <p><Tex source={`g(x)=${ptex(g)}`} /></p>
          <div className="overflow-x-auto rounded-xl bg-surface-2 px-3 py-2 text-[.86rem] leading-8">
            <p><Tex source={`f+g=${ptex(add(f, g))}`} /></p>
            <p><Tex source={`f-g=${ptex(sub(f, g))}`} /></p>
            <p><Tex source={`fg=${ptex(mul(f, g))}`} /></p>
          </div>
          <p className="text-[.8rem] text-ink-3">인수분해: <Tex source={factored.roots.length ? factorTex(f) : ptex(f)} /> {factored.roots.length === 0 && <span className="text-ink-4">(유리수 근이 없어 인수 정리로 더 나누지 못해요)</span>}</p>
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-bold text-ink-3">조립제법: <Tex source={`f(x)\\div (x${a.n < 0 ? "+" : "-"}${Math.abs(a.n)})`} /></p>
          <HtmlView html={syntheticHtml(f, a)} className="rounded-xl border border-line bg-white px-3 py-2" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="몫" value={<Tex source={ptex(division.quotient)} />} />
            <Stat label={`나머지 = f(${a.n})`} value={<Tex source={qTex(division.remainder)} />} note={division.remainder.n === 0 ? "나누어떨어져요(인수 정리)" : undefined} />
          </div>
          <p className="text-[.74rem] leading-5 text-ink-4">나머지 정리: 다항식 f(x)를 x − a로 나눈 나머지는 f(a)예요. f(a) = 0이면 f(x)는 x − a를 인수로 가져요. 입력한 계수: {coefficientsText(f)}</p>
        </div>
      </section>}
      <MathSheet id="math-poly-print" sections={polyProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "다항식의 연산과 인수분해", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 복소수·이차방정식 ───── */
const quadraticSchema = z.object({
  a: z.number().int().min(-50).max(50).catch(1), b: z.number().int().min(-100).max(100).catch(-2), c: z.number().int().min(-500).max(500).catch(5),
  z: z.tuple([z.number().int(), z.number().int()]).catch([2, 3]), w: z.tuple([z.number().int(), z.number().int()]).catch([1, -1]),
  asks: asksSchema(quadAsks, ["complex", "discriminant", "solve", "vieta"]), sheet: sheetSchema(2),
});
function QuadraticView() {
  const [state, update] = useStored("learncraft_math_quadratic_v1", quadraticSchema);
  const valid = state.a !== 0;
  const solved = valid ? solveQuadratic(state.a, state.b, state.c) : null;
  const z1 = cx(state.z[0], state.z[1]);
  const w1 = cx(state.w[0], state.w[1]);
  const wZero = state.w[0] === 0 && state.w[1] === 0;
  return (
    <ToolLayout aside={<>
      <Card title="이차방정식 ax² + bx + c = 0">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="a" value={state.a} min={-50} max={50} onChange={value => update({ a: Math.round(value) })} />
          <NumberField label="b" value={state.b} min={-100} max={100} onChange={value => update({ b: Math.round(value) })} />
          <NumberField label="c" value={state.c} min={-500} max={500} onChange={value => update({ c: Math.round(value) })} />
        </div>
        {!valid && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">a는 0이 아니어야 이차방정식이에요.</p>}
      </Card>
      <Card title="복소수 z, w (정수부)">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="z의 실수부" value={state.z[0]} min={-99} max={99} onChange={value => update({ z: [Math.round(value), state.z[1]] })} />
          <NumberField label="z의 허수부" value={state.z[1]} min={-99} max={99} onChange={value => update({ z: [state.z[0], Math.round(value)] })} />
          <NumberField label="w의 실수부" value={state.w[0]} min={-99} max={99} onChange={value => update({ w: [Math.round(value), state.w[1]] })} />
          <NumberField label="w의 허수부" value={state.w[1]} min={-99} max={99} onChange={value => update({ w: [state.w[0], Math.round(value)] })} />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 복소수와 이차방정식)">
        <MultiChips options={quadAsks} value={state.asks} onChange={asks => update({ asks: asks as QuadAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        {solved ? <div className="min-w-0 space-y-2">
          <p className="text-[.95rem]"><Tex source={`${quadTex(state.a, state.b, state.c)}=0`} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="판별식 D = b² − 4ac" value={solved.D} note={solved.kind} />
            <Stat label="두 근의 합·곱" value={<Tex source={`${qTex(q(-state.b, state.a))},\\ ${qTex(q(state.c, state.a))}`} />} note="α + β = −b/a, αβ = c/a" />
          </div>
          <p className="overflow-x-auto rounded-xl bg-brand-page px-4 py-3 text-[1rem] font-bold"><Tex source={solved.rootsTex} /></p>
        </div> : <p className="py-10 text-center text-[.86rem] text-ink-4">이차방정식이 아니에요.</p>}
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-bold text-ink-3"><Tex source={`z=${cTex(z1)},\\ w=${cTex(w1)}`} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="z + w" value={<Tex source={cTex(cAdd(z1, w1))} />} />
            <Stat label="z − w" value={<Tex source={cTex(cSub(z1, w1))} />} />
            <Stat label="zw" value={<Tex source={cTex(cMul(z1, w1))} />} note="i² = −1" />
            <Stat label="z ÷ w" value={wZero ? "—" : <Tex source={cTex(cDiv(z1, w1))} />} note={wZero ? "0으로 나눌 수 없어요" : "분모의 켤레복소수를 곱해요"} />
          </div>
        </div>
      </section>
      <MathSheet id="math-quadratic-print" sections={quadProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "복소수와 이차방정식", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 이차함수 ───── */
const signs = [{ value: "<", label: "< 0" }, { value: "<=", label: "≤ 0" }, { value: ">", label: "> 0" }, { value: ">=", label: "≥ 0" }] as const;
type SignKey = (typeof signs)[number]["value"];
const parabolaSchema = z.object({
  a: z.number().int().min(-9).max(9).catch(1), b: z.number().int().min(-30).max(30).catch(-2), c: z.number().int().min(-60).max(60).catch(-3),
  show: z.enum(["range", "line", "inequality"]).catch("range"),
  s: z.number().int().min(-12).max(12).catch(-1), t: z.number().int().min(-12).max(12).catch(3),
  m: z.number().int().min(-9).max(9).catch(1), k: z.number().int().min(-40).max(40).catch(-5),
  sign: z.enum(["<", "<=", ">", ">="]).catch("<"),
  asks: asksSchema(functionAsks, ["vertex", "extrema", "line", "inequality"]), sheet: sheetSchema(2),
});
function ParabolaView() {
  const [state, update] = useStored("learncraft_math_parabola_v1", parabolaSchema);
  const parabola = { a: state.a || 1, b: state.b, c: state.c };
  const v = vertex(parabola);
  const [s, t] = [Math.min(state.s, state.t), Math.max(state.s, state.t)];
  const extrema = extremaOn(parabola, s, t);
  const relation = lineRelation(parabola, state.m, state.k);
  const solution = quadraticInequality(parabola, state.sign);
  const svg = parabolaSvg(parabola, state.show === "range" ? { range: [s, t] } : state.show === "line" ? { line: { m: state.m, k: state.k } } : { inequality: solution });
  return (
    <ToolLayout aside={<>
      <Card title="이차함수 y = ax² + bx + c">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="a (0 아님)" value={state.a} min={-9} max={9} onChange={value => update({ a: Math.round(value) || 1 })} />
          <NumberField label="b" value={state.b} min={-30} max={30} onChange={value => update({ b: Math.round(value) })} />
          <NumberField label="c" value={state.c} min={-60} max={60} onChange={value => update({ c: Math.round(value) })} />
        </div>
      </Card>
      <Card title="그래프에 표시할 것">
        <Segmented label="표시" value={state.show} onChange={show => update({ show })} options={[{ value: "range", label: "범위 최대·최소" }, { value: "line", label: "직선" }, { value: "inequality", label: "부등식" }]} />
        {state.show === "range" && <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="x의 범위 시작" value={state.s} min={-12} max={12} onChange={value => update({ s: Math.round(value) })} /><NumberField label="끝" value={state.t} min={-12} max={12} onChange={value => update({ t: Math.round(value) })} /></div>}
        {state.show === "line" && <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="직선 y = mx + k의 m" value={state.m} min={-9} max={9} onChange={value => update({ m: Math.round(value) })} /><NumberField label="k" value={state.k} min={-40} max={40} onChange={value => update({ k: Math.round(value) })} /></div>}
        {state.show === "inequality" && <div className="mt-2"><Segmented label="부등호" value={state.sign} onChange={(sign: SignKey) => update({ sign })} options={signs.map(item => ({ value: item.value, label: item.label }))} /></div>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 이차함수와 이차부등식)">
        <MultiChips options={functionAsks} value={state.asks} onChange={asks => update({ asks: asks as FunctionAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="이차함수의 그래프" svg={svg} />
        <div className="min-w-0 space-y-2">
          <p className="overflow-x-auto text-[.95rem]"><Tex source={`y=${quadTex(parabola.a, parabola.b, parabola.c)}`} /> → <Tex source={standardTex(parabola)} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="꼭짓점" value={<Tex source={`(${qTex(v.x)},\\ ${qTex(v.y)})`} />} note={`축 x = ${qText(v.x)}`} />
            <Stat label="y절편" value={parabola.c} note={parabola.a > 0 ? "아래로 볼록" : "위로 볼록"} />
            {state.show === "range" && <>
              <Stat label={`최댓값 (${s} ≤ x ≤ ${t})`} value={<Tex source={qTex(extrema.max.y)} />} note={`x = ${qText(extrema.max.x)}일 때`} />
              <Stat label="최솟값" value={<Tex source={qTex(extrema.min.y)} />} note={`x = ${qText(extrema.min.x)}일 때`} />
            </>}
            {state.show === "line" && <Stat label="직선과의 위치 관계" value={relation.relation} note={`ax² + (b − m)x + (c − k) = 0의 판별식 ${relation.D}`} />}
            {state.show === "inequality" && <Stat label="부등식의 해" value={<Tex source={intervalTex(solution)} />} note={`${texPlain(quadTex(parabola.a, parabola.b, parabola.c))} ${signs.find(item => item.value === state.sign)?.label}`} />}
          </div>
          <p className="text-[.74rem] leading-5 text-ink-4">빨간 점이 꼭짓점, 회색 점선이 축이에요. {state.show === "range" ? "빨간 굵은 부분이 고른 범위예요. 꼭짓점이 범위 안에 있으면 꼭짓점에서 최대 또는 최소가 돼요." : state.show === "inequality" ? "x축 위 주황색 부분이 부등식의 해예요." : "초록 직선과 포물선이 만나는 점의 개수는 판별식의 부호로 알 수 있어요."}</p>
        </div>
      </section>
      <MathSheet id="math-parabola-print" sections={functionProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "이차함수와 이차부등식", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

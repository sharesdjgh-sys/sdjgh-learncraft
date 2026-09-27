"use client";

import { z } from "zod";
import { qTex, tex } from "@/features/math/core";
import { degree, factorRational, factorTex, parseCoefficients, ptex } from "@/features/math/cm-poly";
import { quadTex, solveQuadratic } from "@/features/math/cm-quadratic";
import { equationAsks, equationProblems, inequalityPartTex, signTex, solveSystem, type EquationAsk, type Sign } from "@/features/math/cm-equation";
import { numberLineSvg } from "@/features/math/cm-plane";
import {
  canMultiply, combination, combinationTex, countingAsks, countingProblems, divisorCount, factorial, matAdd, matMul, matrixAsks, matrixProblems, matScale, matTex, permutation, permutationTex, productTex, sameSize,
  type CountingAsk, type Matrix, type MatrixAsk,
} from "@/features/math/cm-counting";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, fieldClass, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MathSheet } from "./math-lab-shared";

/** 화면 안의 수식 한 줄입니다(KaTeX). */
export function Tex({ source, className }: { source: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: tex(source) }} />;
}

const signOptions: { value: Sign; label: string }[] = [{ value: "<", label: "<" }, { value: "<=", label: "≤" }, { value: ">", label: ">" }, { value: ">=", label: "≥" }];
const partSchema = z.object({ a: z.number().int().min(-50).max(50), b: z.number().int().min(-100).max(100), sign: z.enum(["<", "<=", ">", ">="]), c: z.number().int().min(-500).max(500) });

/* ───── 방정식·부등식 ───── */
const equationSchema = z.object({
  poly: z.string().max(60).catch("1, 0, -7, 6"),
  parts: z.array(partSchema).length(2).catch([{ a: 2, b: -1, sign: ">", c: 3 }, { a: 1, b: 3, sign: "<=", c: 8 }]),
  useQuadratic: z.boolean().catch(false), quadratic: z.object({ a: z.number().int().min(-9).max(9), b: z.number().int().min(-30).max(30), c: z.number().int().min(-60).max(60), sign: z.enum(["<", "<=", ">", ">="]) }).catch({ a: 1, b: -1, c: -6, sign: "<" }),
  asks: asksSchema(equationAsks, ["higher", "system", "linearSystem", "absolute", "quadraticSystem"]), sheet: sheetSchema(2),
});
export function EquationView() {
  const [state, update] = useStored("learncraft_math_equation_v1", equationSchema);
  const p = parseCoefficients(state.poly);
  const factored = p && degree(p) >= 1 ? factorRational(p) : null;
  // 유리수 근을 빼고 남은 이차식은 근의 공식으로 풉니다(정수 계수일 때).
  const rest = factored && degree(factored.rest) === 2 && factored.rest.every(c => c.d === 1) ? solveQuadratic(factored.rest[2].n, factored.rest[1].n, factored.rest[0].n) : null;
  const roots = factored ? [...new Set(factored.roots.map(root => qTex(root)))] : [];
  const setPart = (index: number, patch: Partial<(typeof state.parts)[number]>) => update({ parts: state.parts.map((part, at) => at === index ? { ...part, ...patch } : part) });
  const quadratic = state.useQuadratic && state.quadratic.a !== 0 ? { parabola: { a: state.quadratic.a, b: state.quadratic.b, c: state.quadratic.c }, sign: state.quadratic.sign } : undefined;
  const system = solveSystem(state.parts, quadratic);
  const colors = ["#2563eb", "#dc2626", "#16a34a"];
  return (
    <ToolLayout aside={<>
      <Card title="고차방정식 f(x) = 0" help="계수를 높은 차수부터 쉼표로 적어요. 예: 1, 0, -7, 6 → x³ − 7x + 6">
        <input value={state.poly} maxLength={60} onChange={event => update({ poly: event.target.value })} aria-label="계수" className={fieldClass} />
        {!p && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">계수는 숫자로 7개까지 적어 주세요.</p>}
      </Card>
      <Card title="연립부등식">
        {state.parts.map((part, index) => (
          <div key={index} className="mb-2 grid grid-cols-[1fr_1fr_auto_1fr] items-end gap-1.5">
            <NumberField label={`${index + 1}) x의 계수`} value={part.a} min={-50} max={50} onChange={value => setPart(index, { a: Math.round(value) })} />
            <NumberField label="상수" value={part.b} min={-100} max={100} onChange={value => setPart(index, { b: Math.round(value) })} />
            <select aria-label="부등호" value={part.sign} onChange={event => setPart(index, { sign: event.target.value as Sign })} className="min-h-9 rounded-lg border border-line bg-surface px-1.5 text-sm">{signOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <NumberField label="오른쪽" value={part.c} min={-500} max={500} onChange={value => setPart(index, { c: Math.round(value) })} />
          </div>
        ))}
        <Toggle label="이차부등식도 넣기(연립이차부등식)" checked={state.useQuadratic} onChange={useQuadratic => update({ useQuadratic })} />
        {state.useQuadratic && <>
          <div className="grid grid-cols-3 gap-1.5">
            <NumberField label="a" value={state.quadratic.a} min={-9} max={9} onChange={value => update({ quadratic: { ...state.quadratic, a: Math.round(value) } })} />
            <NumberField label="b" value={state.quadratic.b} min={-30} max={30} onChange={value => update({ quadratic: { ...state.quadratic, b: Math.round(value) } })} />
            <NumberField label="c" value={state.quadratic.c} min={-60} max={60} onChange={value => update({ quadratic: { ...state.quadratic, c: Math.round(value) } })} />
          </div>
          <div className="mt-1.5"><Segmented label="이차부등식 부등호" value={state.quadratic.sign} onChange={(sign: Sign) => update({ quadratic: { ...state.quadratic, sign } })} options={signOptions.map(option => ({ value: option.value, label: `${option.label} 0` }))} /></div>
        </>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 여러 가지 방정식과 부등식)">
        <MultiChips options={equationAsks} value={state.asks} onChange={asks => update({ asks: asks as EquationAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-extrabold text-ink">고차방정식</h2>
          {p && factored ? <>
            <p className="overflow-x-auto"><Tex source={`${ptex(p)}=0`} /></p>
            <p className="overflow-x-auto"><Tex source={`${factorTex(p)}=0`} /></p>
            <p className="rounded-xl bg-brand-page px-4 py-3 text-[.95rem] font-bold">
              {roots.length ? <Tex source={`x=${roots.join(",\\ ")}`} /> : "유리수 근이 없어요"}
              {rest && <> {roots.length ? "또는 " : ""}<Tex source={rest.rootsTex} /></>}
            </p>
            {!rest && degree(factored.rest) >= 2 && <p className="text-[.74rem] text-ink-4">남은 인수 <Tex source={ptex(factored.rest)} />는 유리수 근이 없어 더 나누지 않았어요.</p>}
          </> : <p className="text-[.86rem] text-ink-4">계수를 확인해 주세요.</p>}
        </div>
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-extrabold text-ink">연립부등식</h2>
          <p className="overflow-x-auto text-[.86rem]">{state.parts.map((part, index) => <span key={index} className="mr-3" style={{ color: colors[index] }}>{index === 0 ? "①" : "②"} <Tex source={inequalityPartTex(part)} /></span>)}{quadratic && <span style={{ color: colors[2] }}>③ <Tex source={`${quadTex(quadratic.parabola.a, quadratic.parabola.b, quadratic.parabola.c)}${signTex[quadratic.sign]}0`} /></span>}</p>
          <SvgView label="수직선 위의 해" svg={numberLineSvg(system.sets.map((set, index) => ({ set, color: colors[index], label: ["①", "②", "③"][index] })), system.marks.length ? system.marks : [0])} />
          <p className="rounded-xl bg-brand-page px-4 py-3 text-[.95rem] font-bold"><Tex source={system.tex} /></p>
          <p className="text-[.74rem] text-ink-4">채운 점은 그 수를 포함, 빈 점은 포함하지 않아요. 모든 부등식이 겹치는 부분이 연립부등식의 해예요.</p>
        </div>
      </section>
      <MathSheet id="math-equation-print" sections={equationProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "여러 가지 방정식과 부등식", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 경우의 수 ───── */
const countingSchema = z.object({
  n: z.number().int().min(0).max(20).catch(7), r: z.number().int().min(0).max(20).catch(3), number: z.number().int().min(2).max(100000).catch(72),
  asks: asksSchema(countingAsks, ["sumRule", "productRule", "divisors", "line", "adjacent", "choose"]), sheet: sheetSchema(1),
});
export function CountingView() {
  const [state, update] = useStored("learncraft_math_counting_v1", countingSchema);
  const r = Math.min(state.r, state.n);
  const divisors = divisorCount(state.number);
  return (
    <ToolLayout aside={<>
      <Card title="순열과 조합">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="n (전체)" value={state.n} min={0} max={20} onChange={value => update({ n: Math.round(value) })} />
          <NumberField label="r (뽑는 수)" value={state.r} min={0} max={20} onChange={value => update({ r: Math.round(value) })} />
        </div>
        {state.r > state.n && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">r는 n보다 클 수 없어서 r = {state.n}로 계산했어요.</p>}
        <NumberField className="mt-3" label="약수의 개수를 셀 자연수" value={state.number} min={2} max={100000} onChange={value => update({ number: Math.round(value) })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 경우의 수)">
        <MultiChips options={countingAsks} value={state.asks} onChange={asks => update({ asks: asks as CountingAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label={`${state.n}!`} value={factorial(state.n).toLocaleString("ko-KR")} note="n! = n × (n − 1) × … × 1" />
          <Stat label={`${state.n}P${r} (일렬로 세우기)`} value={permutation(state.n, r).toLocaleString("ko-KR")} note="순서가 있어요" />
          <Stat label={`${state.n}C${r} (뽑기)`} value={combination(state.n, r).toLocaleString("ko-KR")} note="순서가 없어요" />
        </div>
        <div className="overflow-x-auto rounded-xl bg-surface-2 px-3 py-2 leading-9">
          <p><Tex source={permutationTex(state.n, r)} /></p>
          <p><Tex source={combinationTex(state.n, r)} /></p>
          <p><Tex source={`{}_{${state.n}}\\mathrm{C}_{${r}}=\\frac{{}_{${state.n}}\\mathrm{P}_{${r}}}{${r}!}=\\frac{${state.n}!}{${r}!\\,${state.n - r}!}`} /></p>
        </div>
        <p className="overflow-x-auto text-[.9rem]">{state.number}의 약수: <Tex source={`${state.number}=${divisors.factorTex}`} /> → 약수의 개수 <Tex source={`${divisors.countTex}=${divisors.count}`} /></p>
      </section>
      <MathSheet id="math-counting-print" sections={countingProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "경우의 수", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 행렬 ───── */
const matrixValue = z.array(z.array(z.number().int().min(-99).max(99)).min(1).max(3)).min(1).max(3);
const matrixSchema = z.object({
  a: matrixValue.catch([[1, 2], [3, 4]]), b: matrixValue.catch([[2, 0], [-1, 3]]), k: z.number().int().min(-9).max(9).catch(2),
  asks: asksSchema(matrixAsks, ["entry", "addScale", "product", "equal"]), sheet: sheetSchema(2),
});
function resize(m: Matrix, rows: number, cols: number): Matrix { return Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => m[i]?.[j] ?? 0)); }
function MatrixEditor({ label, value, onChange }: { label: string; value: Matrix; onChange: (value: Matrix) => void }) {
  const rows = value.length;
  const cols = value[0].length;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink-3">행렬 {label} ({rows}×{cols})</span>
        <span className="flex gap-1">
          <select aria-label={`${label}의 행 수`} value={rows} onChange={event => onChange(resize(value, Number(event.target.value), cols))} className="min-h-8 rounded-lg border border-line bg-surface px-1 text-xs">{[1, 2, 3].map(n => <option key={n} value={n}>{n}행</option>)}</select>
          <select aria-label={`${label}의 열 수`} value={cols} onChange={event => onChange(resize(value, rows, Number(event.target.value)))} className="min-h-8 rounded-lg border border-line bg-surface px-1 text-xs">{[1, 2, 3].map(n => <option key={n} value={n}>{n}열</option>)}</select>
        </span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {value.map((row, i) => row.map((cell, j) => <NumberField key={`${i}-${j}`} label="" value={cell} min={-99} max={99} onChange={next => onChange(value.map((line, at) => at === i ? line.map((old, col) => col === j ? Math.round(next) : old) : line))} />))}
      </div>
    </div>
  );
}
export function MatrixView() {
  const [state, update] = useStored("learncraft_math_matrix_v1", matrixSchema);
  const { a, b, k } = state;
  const same = sameSize(a, b);
  const multiply = canMultiply(a, b);
  return (
    <ToolLayout aside={<>
      <Card title="행렬 A, B">
        <MatrixEditor label="A" value={a} onChange={value => update({ a: value })} />
        <div className="mt-3"><MatrixEditor label="B" value={b} onChange={value => update({ b: value })} /></div>
        <NumberField className="mt-3" label="실수배 k" value={k} min={-9} max={9} onChange={value => update({ k: Math.round(value) })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 행렬과 그 연산)">
        <MultiChips options={matrixAsks} value={state.asks} onChange={asks => update({ asks: asks as MatrixAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-2 overflow-x-auto leading-[3.2rem]`}>
        <p><Tex source={`A=${matTex(a)},\\quad B=${matTex(b)}`} /></p>
        {same ? <>
          <p><Tex source={`A+B=${matTex(matAdd(a, b))},\\quad A-B=${matTex(matAdd(a, b, -1))}`} /></p>
        </> : <p className="text-[.84rem] font-semibold text-warn">A와 B의 꼴이 달라서 덧셈·뺄셈을 할 수 없어요.</p>}
        <p><Tex source={`${k}A=${matTex(matScale(a, k))}`} /></p>
        {multiply ? <p><Tex source={`AB=${productTex(a, b).split("=").slice(1).join("=")}`} /></p>
          : <p className="text-[.84rem] font-semibold text-warn">A의 열의 개수({a[0].length})와 B의 행의 개수({b.length})가 달라서 AB를 계산할 수 없어요.</p>}
        {canMultiply(b, a) && <p><Tex source={`BA=${matTex(matMul(b, a))}`} /></p>}
        <p className="text-[.74rem] leading-5 text-ink-4">곱 AB의 (i, j) 성분은 A의 i행과 B의 j열의 성분을 차례로 곱해 더한 값이에요. 일반적으로 AB와 BA는 같지 않아요.</p>
      </section>
      <MathSheet id="math-matrix-print" sections={matrixProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "행렬과 그 연산", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

"use client";

import { z } from "zod";
import { q, qTex } from "@/features/math/core";
import {
  complement, conditionKindSets, difference, intersection, isSubset, logicAsks, logicProblems, RULES, ruleText, setAsks, setProblems, setPlain, truthSet, union, universe, vennSvg,
  type LogicAsk, type Rule, type SetAsk,
} from "@/features/math/cm2-sets";
import {
  classify, compose, function2Asks, function2Problems, inverse, lin, linAt, linTex, mappingSvg, radicalDomain, radicalFnTex, radicalRange, radicalSvg, rationalFractionTex, rationalSvg, rationalTex,
  type FunctionAsk2, type Mapping,
} from "@/features/math/cm2-functions";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MathSheet } from "./math-lab-shared";
import { Tex } from "./math-common1-views";

const ruleKeys = RULES.map(ruleText);
const ruleOf = (text: string): Rule => RULES.find(rule => ruleText(rule) === text) ?? RULES[0];
function RulePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-semibold text-ink-4">{label}
      <select value={value} onChange={event => onChange(event.target.value)} className="mt-1 min-h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink">{ruleKeys.map(key => <option key={key} value={key}>{key}</option>)}</select>
    </label>
  );
}

/* ───── 집합 ───── */
const setSchema = z.object({
  n: z.number().int().min(5).max(20).catch(12), a: z.string().catch("2의 배수"), b: z.string().catch("3의 배수"), c: z.string().catch("12의 약수"), three: z.boolean().catch(false),
  shade: z.enum(["none", "cup", "cap", "minus", "comp"]).catch("cap"),
  asks: asksSchema(setAsks, ["list", "operation", "count", "subsets"]), sheet: sheetSchema(2),
});
export function SetView() {
  const [state, update] = useStored("learncraft_math_sets_v1", setSchema);
  const all = universe(state.n);
  const [A, B, C] = [truthSet(ruleOf(state.a), state.n), truthSet(ruleOf(state.b), state.n), truthSet(ruleOf(state.c), state.n)];
  const sets = [{ name: "A", items: A }, { name: "B", items: B }, ...(state.three ? [{ name: "C", items: C }] : [])];
  const shade = state.shade === "none" ? undefined : ([a, b]: boolean[]) => state.shade === "cup" ? a || b : state.shade === "cap" ? a && b : state.shade === "minus" ? a && !b : !a;
  const setText = (items: number[]) => setPlain(items);
  return (
    <ToolLayout aside={<>
      <Card title="전체집합과 부분집합">
        <NumberField label="전체집합 U = {1, 2, …, n}의 n" value={state.n} min={5} max={20} onChange={n => update({ n: Math.round(n) })} />
        <div className="mt-2 space-y-2">
          <RulePicker label="A: x는 …" value={state.a} onChange={a => update({ a })} />
          <RulePicker label="B: x는 …" value={state.b} onChange={b => update({ b })} />
          <Toggle label="집합 C도 넣기" checked={state.three} onChange={three => update({ three })} />
          {state.three && <RulePicker label="C: x는 …" value={state.c} onChange={c => update({ c })} />}
        </div>
      </Card>
      <Card title="색칠할 부분">
        <Segmented label="색칠" value={state.shade} onChange={shade => update({ shade })} options={[{ value: "none", label: "없음" }, { value: "cup", label: "A∪B" }, { value: "cap", label: "A∩B" }, { value: "minus", label: "A−B" }, { value: "comp", label: "Aᶜ" }]} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 집합의 연산)">
        <MultiChips options={setAsks} value={state.asks} onChange={asks => update({ asks: asks as SetAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="벤 다이어그램" svg={vennSvg(sets, all, { shade })} />
        <div className="grid min-w-0 grid-cols-1 gap-1.5 text-[.84rem]">
          <p>U = {setText(all)}</p>
          <p className="text-[#2563eb]">A = {setText(A)} <span className="text-ink-4">n(A) = {A.length}</span></p>
          <p className="text-[#dc2626]">B = {setText(B)} <span className="text-ink-4">n(B) = {B.length}</span></p>
          {state.three && <p className="text-[#16a34a]">C = {setText(C)}</p>}
          <p>A ∪ B = {setText(union(A, B))} <span className="text-ink-4">n = {union(A, B).length} = {A.length} + {B.length} − {intersection(A, B).length}</span></p>
          <p>A ∩ B = {setText(intersection(A, B))}</p>
          <p>A − B = {setText(difference(A, B))}, B − A = {setText(difference(B, A))}</p>
          <p>Aᶜ = {setText(complement(A, state.n))}</p>
          <p className="text-ink-3">A의 부분집합의 개수 2<sup>{A.length}</sup> = {2 ** A.length}{isSubset(A, B) ? " · A ⊂ B" : isSubset(B, A) ? " · B ⊂ A" : ""}</p>
        </div>
      </section>
      <MathSheet id="math-sets-print" sections={setProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "집합의 연산", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 명제 ───── */
const logicSchema = z.object({
  n: z.number().int().min(5).max(30).catch(20), p: z.string().catch("4의 배수"), q: z.string().catch("2의 배수"),
  asks: asksSchema(logicAsks, ["truth", "converse", "condition"]), sheet: sheetSchema(2),
});
export function LogicView() {
  const [state, update] = useStored("learncraft_math_logic_v1", logicSchema);
  const P = truthSet(ruleOf(state.p), state.n);
  const Q = truthSet(ruleOf(state.q), state.n);
  const original = isSubset(P, Q);
  const converse = isSubset(Q, P);
  const counter = P.find(x => !Q.includes(x));
  const counterConverse = Q.find(x => !P.includes(x));
  return (
    <ToolLayout aside={<>
      <Card title="조건 p, q (x는 n 이하의 자연수)">
        <NumberField label="n" value={state.n} min={5} max={30} onChange={n => update({ n: Math.round(n) })} />
        <div className="mt-2 space-y-2"><RulePicker label="p: x는 …" value={state.p} onChange={p => update({ p })} /><RulePicker label="q: x는 …" value={state.q} onChange={value => update({ q: value })} /></div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 명제와 조건)">
        <MultiChips options={logicAsks} value={state.asks} onChange={asks => update({ asks: asks as LogicAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="진리집합" svg={vennSvg([{ name: "P", items: P }, { name: "Q", items: Q }], universe(state.n))} />
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <Stat label="진리집합" value={<span className="text-[.82rem]">P = {setPlain(P)}, Q = {setPlain(Q)}</span>} />
          <Stat label={`명제 p → q: x가 ${state.p}이면 x는 ${state.q}이다`} value={original ? "참" : "거짓"} note={original ? "P ⊂ Q" : `반례 x = ${counter}`} />
          <Stat label="역 q → p" value={converse ? "참" : "거짓"} note={converse ? "Q ⊂ P" : `반례 x = ${counterConverse}`} />
          <Stat label="대우 ~q → ~p" value={original ? "참" : "거짓"} note="대우는 원래 명제와 참·거짓이 같아요" />
          <Stat label="p는 q이기 위한" value={conditionKindSets(P, Q)} />
        </div>
      </section>
      <MathSheet id="math-logic-print" sections={logicProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "명제와 조건", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 함수 ───── */
const targets = ["a", "b", "c", "d"];
const functionSchema = z.object({
  size: z.number().int().min(3).max(4).catch(3), images: z.array(z.array(z.string()).max(4)).length(4).catch([["b"], ["a"], ["c"], []]),
  f: z.tuple([z.number().int(), z.number().int()]).catch([2, 1]), g: z.tuple([z.number().int(), z.number().int()]).catch([-1, 3]), k: z.number().int().min(-9).max(9).catch(2),
  asks: asksSchema(function2Asks, ["mapping", "compose", "inverse"]), sheet: sheetSchema(2),
});
export function FunctionView() {
  const [state, update] = useStored("learncraft_math_function_v1", functionSchema);
  const from = [1, 2, 3].slice(0, 3);
  const to = targets.slice(0, state.size);
  const map: Mapping = { from, to, arrows: from.flatMap((x, i) => state.images[i].filter(y => to.includes(y)).map(y => [x, y] as [number, string])) };
  const result = classify(map);
  const toggle = (i: number, y: string) => update({ images: state.images.map((list, at) => at === i ? (list.includes(y) ? list.filter(item => item !== y) : [...list, y]) : list) });
  const f = lin(state.f[0] || 1, state.f[1]);
  const g = lin(state.g[0] || 1, state.g[1]);
  return (
    <ToolLayout aside={<>
      <Card title="대응 X → Y" help="X의 원소마다 대응하는 Y의 원소를 눌러요. 두 개를 누르거나 하나도 누르지 않으면 함수가 아니에요.">
        <Segmented label="Y의 원소 수" value={state.size} onChange={size => update({ size })} options={[{ value: 3, label: "Y = {a, b, c}" }, { value: 4, label: "Y = {a, b, c, d}" }]} />
        <div className="mt-2 space-y-1.5">{from.map((x, i) => <div key={x} className="flex items-center gap-1.5"><span className="w-8 text-sm font-bold">{x} →</span>{to.map(y => <button key={y} type="button" aria-pressed={state.images[i].includes(y)} onClick={() => toggle(i, y)} className={chipClass(state.images[i].includes(y))}>{y}</button>)}</div>)}</div>
      </Card>
      <Card title="일차함수 f, g">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="f(x) = ax + b의 a" value={state.f[0]} min={-9} max={9} onChange={a => update({ f: [Math.round(a), state.f[1]] })} />
          <NumberField label="b" value={state.f[1]} min={-20} max={20} onChange={b => update({ f: [state.f[0], Math.round(b)] })} />
          <NumberField label="g(x) = cx + d의 c" value={state.g[0]} min={-9} max={9} onChange={c => update({ g: [Math.round(c), state.g[1]] })} />
          <NumberField label="d" value={state.g[1]} min={-20} max={20} onChange={d => update({ g: [state.g[0], Math.round(d)] })} />
        </div>
        <NumberField className="mt-2" label="넣을 값 x" value={state.k} min={-9} max={9} onChange={k => update({ k: Math.round(k) })} />
        {(state.f[0] === 0 || state.g[0] === 0) && <p className="mt-2 text-[.76rem] text-ink-4">x의 계수가 0이면 역함수가 없어 1로 계산했어요.</p>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 함수와 합성함수)">
        <MultiChips options={function2Asks} value={state.asks} onChange={asks => update({ asks: asks as FunctionAsk2[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="min-w-0 space-y-2"><SvgView label="대응 그림" svg={mappingSvg(map)} className="max-w-sm" /><p className="rounded-xl bg-brand-page px-4 py-3 text-center text-[.95rem] font-bold">{result.name}</p></div>
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <Stat label="두 함수" value={<Tex source={`f(x)=${linTex(f)},\\ g(x)=${linTex(g)}`} />} />
          <Stat label="합성함수" value={<Tex source={`(g\\circ f)(x)=${linTex(compose(g, f))},\\ (f\\circ g)(x)=${linTex(compose(f, g))}`} />} note="일반적으로 g∘f와 f∘g는 같지 않아요" />
          <Stat label={`x = ${state.k}일 때`} value={<Tex source={`(g\\circ f)(${state.k})=g(${qTex(linAt(f, q(state.k)))})=${qTex(linAt(compose(g, f), q(state.k)))}`} />} />
          <Stat label="역함수" value={<Tex source={`f^{-1}(x)=${linTex(inverse(f))}`} />} note="y = f(x)를 x에 대하여 풀고 x와 y를 바꿔요" />
        </div>
      </section>
      <MathSheet id="math-function-print" sections={function2Problems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "함수와 합성함수·역함수", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 유리·무리함수 ───── */
const rationalSchema = z.object({
  kind: z.enum(["rational", "radical"]).catch("rational"),
  k: z.number().int().min(-20).max(20).catch(2), p: z.number().int().min(-8).max(8).catch(1), q: z.number().int().min(-8).max(8).catch(-1),
  sign: z.union([z.literal(1), z.literal(-1)]).catch(1), a: z.number().int().min(-9).max(9).catch(1),
  asks: asksSchema(function2Asks, ["rational", "radical"]), sheet: sheetSchema(2),
});
export function RationalView() {
  const [state, update] = useStored("learncraft_math_rational_v1", rationalSchema);
  const rational = { k: state.k || 1, p: state.p, q: state.q };
  const radical = { sign: state.sign, a: state.a || 1, p: state.p, q: state.q };
  return (
    <ToolLayout aside={<>
      <Card title="함수">
        <Segmented label="함수" value={state.kind} onChange={kind => update({ kind })} options={[{ value: "rational", label: "유리함수" }, { value: "radical", label: "무리함수" }]} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {state.kind === "rational" ? <NumberField label="k (0 아님)" value={state.k} min={-20} max={20} onChange={k => update({ k: Math.round(k) || 1 })} /> : <NumberField label="a (0 아님)" value={state.a} min={-9} max={9} onChange={a => update({ a: Math.round(a) || 1 })} />}
          <NumberField label="p" value={state.p} min={-8} max={8} onChange={p => update({ p: Math.round(p) })} />
          <NumberField label="q" value={state.q} min={-8} max={8} onChange={value => update({ q: Math.round(value) })} />
        </div>
        {state.kind === "radical" && <div className="mt-2"><Segmented label="부호" value={state.sign} onChange={sign => update({ sign })} options={[{ value: 1, label: "y = √( ) + q" }, { value: -1, label: "y = −√( ) + q" }]} /></div>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 유리함수와 무리함수)">
        <MultiChips options={function2Asks} value={state.asks} onChange={asks => update({ asks: asks as FunctionAsk2[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="그래프" svg={state.kind === "rational" ? rationalSvg(rational) : radicalSvg(radical)} className="max-w-md" />
        {state.kind === "rational" ? <div className="grid min-w-0 grid-cols-1 gap-2">
          <Stat label="식" value={<Tex source={`${rationalTex(rational)}\\ \\Leftrightarrow\\ ${rationalFractionTex(rational).replace("y=", "")}`} />} />
          <Stat label="점근선(빨간 점선)" value={<Tex source={`x=${rational.p},\\ y=${rational.q}`} />} />
          <Stat label="정의역·치역" value={<Tex source={`\\{x\\mid x\\ne ${rational.p}\\},\\ \\{y\\mid y\\ne ${rational.q}\\}`} />} note={rational.k > 0 ? "k > 0: 그래프가 제1·3사분면 쪽에 있어요(점근선 기준)" : "k < 0: 그래프가 제2·4사분면 쪽에 있어요(점근선 기준)"} />
        </div> : <div className="grid min-w-0 grid-cols-1 gap-2">
          <Stat label="식" value={<Tex source={radicalFnTex(radical)} />} note={`y = ${radical.sign < 0 ? "−" : ""}√(${radical.a === 1 ? "" : radical.a}x)의 그래프를 x축으로 ${radical.p}, y축으로 ${radical.q}만큼 평행이동`} />
          <Stat label="정의역" value={<Tex source={radicalDomain(radical)} />} />
          <Stat label="치역" value={<Tex source={radicalRange(radical)} />} note="그래프는 점 (p, q)에서 시작해요" />
        </div>}
      </section>
      <MathSheet id="math-rational-print" sections={function2Problems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "유리함수와 무리함수", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

"use client";

import { z } from "zod";
import {
  DEFAULT_TRIANGLE, DEFAULT_TRIG_GRAPH, lawAsks, lawProblems, radianTex, solveTriangle, specialTableHtml, trigAsks, trigGraphFacts, trigGraphSvg, trigGraphTex, trigProblems, triangleSvg, unitCircleSvg, valueTex,
  type LawAsk, type TriangleCase, type TrigAsk,
} from "@/features/math/alg-trig";
import {
  DEFAULT_RECURRENCE, DEFAULT_SEQ, generalTex, inductionHtml, INDUCTIONS, recurrenceTerms, recurrenceTex, seqAsks, seqNth, seqProblems, seqSum, seqSvg, seqTerms, sumFormulaTex, type SeqAsk,
} from "@/features/math/alg-sequence";
import { num, qTex, tex } from "@/features/math/core";
import { Card, Range, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, HtmlView, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MathSheet } from "./math-lab-shared";

const MathHtml = ({ html, className }: { html: string; className?: string }) => <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;

/* ───── 삼각함수 ───── */
const trigSchema = z.object({
  degrees: z.number().min(-720).max(720).catch(135),
  name: z.enum(["sin", "cos", "tan"]).catch(DEFAULT_TRIG_GRAPH.name), a: z.number().min(-10).max(10).catch(DEFAULT_TRIG_GRAPH.a), b: z.number().min(-6).max(6).catch(DEFAULT_TRIG_GRAPH.b),
  c: z.number().min(-2).max(2).catch(DEFAULT_TRIG_GRAPH.c), d: z.number().min(-10).max(10).catch(DEFAULT_TRIG_GRAPH.d), compare: z.boolean().catch(true),
  asks: asksSchema(trigAsks, ["convert", "value", "identity", "graph", "equation"]), sheet: sheetSchema(1),
});
export function TrigView() {
  const [state, update] = useStored("learncraft_math_trig_v1", trigSchema);
  const graph = { name: state.name, a: state.a, b: state.b === 0 ? 1 : state.b, c: state.c, d: state.d };
  const facts = trigGraphFacts(graph);
  return (
    <ToolLayout aside={<>
      <Card title="각 θ">
        <Range label="각의 크기" value={state.degrees} min={-360} max={720} step={15} suffix="°" onChange={degrees => update({ degrees })} />
        <NumberField className="mt-2" label="직접 넣기" unit="°" value={state.degrees} min={-720} max={720} onChange={degrees => update({ degrees })} />
      </Card>
      <Card title="그래프" help="y = a·f(bx + c) + d 꼴이에요. c는 π의 몇 배인지로 넣어요(예: 0.5 → π/2).">
        <Segmented label="함수" value={state.name} onChange={name => update({ name })} options={[{ value: "sin", label: "sin" }, { value: "cos", label: "cos" }, { value: "tan", label: "tan" }]} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          <NumberField label="a" value={state.a} min={-10} max={10} step={0.5} onChange={a => update({ a })} />
          <NumberField label="b" value={state.b} min={-6} max={6} step={0.5} onChange={b => update({ b })} />
          <NumberField label="c (×π)" value={state.c} min={-2} max={2} step={0.25} onChange={c => update({ c })} />
          <NumberField label="d" value={state.d} min={-10} max={10} onChange={d => update({ d })} />
        </div>
        {state.b === 0 && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">b가 0이면 주기가 없어요. b = 1로 그렸어요.</p>}
        <Toggle label="기본 그래프 함께 보기" checked={state.compare} onChange={compare => update({ compare })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 삼각함수)">
        <MultiChips options={trigAsks} value={state.asks} onChange={asks => update({ asks: asks as TrigAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:items-center`}>
        <SvgView label="단위원과 동경" svg={unitCircleSvg(state.degrees)} />
        <div className="min-w-0 space-y-2">
          <p className="text-[1rem] text-ink"><MathHtml html={tex(`\\theta=${state.degrees}\\text{°}=${radianTex(state.degrees)}`)} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["sin", "cos", "tan"] as const).map(name => <Stat key={name} label={`${name} θ`} value={<MathHtml html={tex(valueTex(name, state.degrees))} />} />)}
          </div>
          <p className="text-[.76rem] leading-5 text-ink-4">단위원 위의 점 P의 x좌표가 cos θ, y좌표가 sin θ, 기울기가 tan θ예요. 30°·45°의 배수는 정확한 값으로 보여 줘요.</p>
          <HtmlView html={specialTableHtml()} className="max-w-full" />
        </div>
      </section>
      <section className={`${panelClass} space-y-2`}>
        <SvgView label="삼각함수의 그래프" svg={trigGraphSvg(graph, state.compare)} />
        <p className="overflow-x-auto text-center text-[.95rem] text-ink"><MathHtml html={tex(trigGraphTex(graph))} /></p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label="주기" value={<MathHtml html={tex(facts.period)} />} />
          <Stat label="최댓값" value={<MathHtml html={tex(facts.max)} />} />
          <Stat label="최솟값" value={<MathHtml html={tex(facts.min)} />} />
        </div>
      </section>
      <MathSheet id="math-trig-print" sections={trigProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "삼각함수", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 사인법칙·코사인법칙 ───── */
const caseFields: Record<TriangleCase, { key: "a" | "b" | "c" | "A" | "B"; label: string }[]> = {
  SSS: [{ key: "a", label: "a" }, { key: "b", label: "b" }, { key: "c", label: "c" }],
  SAS: [{ key: "b", label: "b" }, { key: "c", label: "c" }, { key: "A", label: "A (°)" }],
  ASA: [{ key: "A", label: "A (°)" }, { key: "c", label: "c" }, { key: "B", label: "B (°)" }],
  AAS: [{ key: "A", label: "A (°)" }, { key: "B", label: "B (°)" }, { key: "a", label: "a" }],
  SSA: [{ key: "a", label: "a" }, { key: "b", label: "b" }, { key: "A", label: "A (°)" }],
};
const lawSchema = z.object({
  case: z.enum(["SSS", "SAS", "ASA", "AAS", "SSA"]).catch(DEFAULT_TRIANGLE.case),
  a: z.number().positive().max(1000).catch(DEFAULT_TRIANGLE.a), b: z.number().positive().max(1000).catch(DEFAULT_TRIANGLE.b), c: z.number().positive().max(1000).catch(DEFAULT_TRIANGLE.c),
  A: z.number().positive().max(179).catch(DEFAULT_TRIANGLE.A), B: z.number().positive().max(179).catch(DEFAULT_TRIANGLE.B),
  asks: asksSchema(lawAsks, ["sine", "cosine", "cosAngle", "area", "ssa"]), sheet: sheetSchema(2),
});
export function LawView() {
  const [state, update] = useStored("learncraft_math_law_v1", lawSchema);
  const solutions = solveTriangle({ ...state, C: 180 - state.A - state.B });
  return (
    <ToolLayout aside={<>
      <Card title="주어진 조건">
        <div className="grid grid-cols-5 gap-1">{(Object.keys(caseFields) as TriangleCase[]).map(key => <button key={key} type="button" aria-pressed={state.case === key} onClick={() => update({ case: key })} className={`${chipClass(state.case === key)} text-center`}>{key}</button>)}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {caseFields[state.case].map(field => <NumberField key={field.key} label={field.label} value={state[field.key]} min={0.01} max={field.key === "A" || field.key === "B" ? 179 : 1000} onChange={value => update({ [field.key]: value })} />)}
        </div>
        <p className="mt-2 text-[.74rem] leading-5 text-ink-4">변 a는 꼭짓점 A의 맞은편이에요. SSA는 두 변 a, b와 끼인각이 아닌 각 A로 풀어요.</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 사인법칙과 코사인법칙)">
        <MultiChips options={lawAsks} value={state.asks} onChange={asks => update({ asks: asks as LawAsk[] })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        {solutions.length === 0 && <p role="status" className="py-12 text-center text-[.9rem] font-semibold text-warn">이 조건으로는 삼각형이 만들어지지 않아요.</p>}
        {state.case === "SSA" && solutions.length > 0 && <p role="status" className="mb-2 text-[.86rem] font-bold text-ink">삼각형이 {solutions.length}개 만들어져요.</p>}
        <div className={`grid gap-4 ${solutions.length > 1 ? "xl:grid-cols-2" : ""}`}>
          {solutions.map((solved, index) => (
            <div key={index} className="min-w-0 space-y-2">
              <SvgView label={`삼각형 ${index + 1}`} svg={triangleSvg(solved)} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Stat label="변" value={`${num(solved.a, 2)} · ${num(solved.b, 2)} · ${num(solved.c, 2)}`} note="a · b · c" />
                <Stat label="넓이" value={num(solved.area, 3)} note="½ bc sin A" />
                <Stat label="외접원 반지름 R" value={num(solved.R, 3)} note="a ÷ (2 sin A)" />
              </div>
              <p className="text-center text-[.8rem] text-ink-3">A = {num(solved.A, 2)}°, B = {num(solved.B, 2)}°, C = {num(solved.C, 2)}°</p>
            </div>
          ))}
        </div>
        <ul className="mt-3 grid gap-1.5 text-[.9rem] text-ink sm:grid-cols-2">
          <li className="overflow-x-auto rounded-xl bg-surface-2 px-3 py-2"><MathHtml html={tex("\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}=2R")} /></li>
          <li className="overflow-x-auto rounded-xl bg-surface-2 px-3 py-2"><MathHtml html={tex("a^{2}=b^{2}+c^{2}-2bc\\cos A")} /></li>
        </ul>
      </section>
      <MathSheet id="math-law-print" sections={lawProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "사인법칙과 코사인법칙", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 수열 ───── */
const sequenceSchema = z.object({
  kind: z.enum(["arith", "geo"]).catch(DEFAULT_SEQ.kind), first: z.number().min(-1000).max(1000).catch(DEFAULT_SEQ.first), step: z.number().min(-100).max(100).catch(DEFAULT_SEQ.step),
  n: z.number().int().min(1).max(40).catch(DEFAULT_SEQ.n),
  rFirst: z.number().min(-100).max(100).catch(DEFAULT_RECURRENCE.first), rP: z.number().min(-5).max(5).catch(DEFAULT_RECURRENCE.p), rR: z.number().min(-10).max(10).catch(DEFAULT_RECURRENCE.r), rS: z.number().min(-20).max(20).catch(DEFAULT_RECURRENCE.s),
  proof: z.string().catch(INDUCTIONS[0].id), reveal: z.boolean().catch(false),
  asks: asksSchema(seqAsks, ["arith", "geo", "sum", "sigma", "partial"]), sheet: sheetSchema(1),
});
export function SequenceView() {
  const [state, update] = useStored("learncraft_math_sequence_v1", sequenceSchema);
  const setup = { kind: state.kind, first: state.first, step: state.step, n: state.n };
  // 등비수열은 항이 너무 커지면 표에서 앞의 몇 항만 봅니다.
  const shown = state.kind === "geo" && Math.abs(state.step) > 1 ? Math.min(state.n, 12) : Math.min(state.n, 20);
  const terms = seqTerms(setup, shown);
  const rule = { first: state.rFirst, p: state.rP, r: state.rR, s: state.rS };
  const proof = INDUCTIONS.find(item => item.id === state.proof) ?? INDUCTIONS[0];
  return (
    <ToolLayout aside={<>
      <Card title="등차·등비수열">
        <Segmented label="수열" value={state.kind} onChange={kind => update({ kind })} options={[{ value: "arith", label: "등차수열" }, { value: "geo", label: "등비수열" }]} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <NumberField label="첫째항 a" value={state.first} min={-1000} max={1000} onChange={first => update({ first })} />
          <NumberField label={state.kind === "arith" ? "공차 d" : "공비 r"} value={state.step} min={-100} max={100} step={0.5} onChange={step => update({ step })} />
          <NumberField label="n" value={state.n} min={1} max={40} onChange={n => update({ n: Math.round(n) })} />
        </div>
      </Card>
      <Card title="귀납적 정의" help="aₙ₊₁ = p·aₙ + (r·n + s) 꼴로 정해요.">
        <div className="grid grid-cols-4 gap-2">
          <NumberField label="a₁" value={state.rFirst} min={-100} max={100} onChange={rFirst => update({ rFirst })} />
          <NumberField label="p" value={state.rP} min={-5} max={5} onChange={rP => update({ rP })} />
          <NumberField label="r" value={state.rR} min={-10} max={10} onChange={rR => update({ rR })} />
          <NumberField label="s" value={state.rS} min={-20} max={20} onChange={rS => update({ rS })} />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 수열)">
        <MultiChips options={seqAsks} value={state.asks} onChange={asks => update({ asks: asks as SeqAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="수열의 항" svg={seqSvg(setup, shown)} />
        <div className="min-w-0 space-y-2 text-ink">
          <p className="overflow-x-auto text-[1rem]"><MathHtml html={tex(generalTex(setup))} /></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label={`제${state.n}항`} value={<MathHtml html={tex(qTex(seqNth(setup, state.n)))} />} />
            <Stat label={`첫째항부터 제${state.n}항까지의 합`} value={<MathHtml html={tex(qTex(seqSum(setup, state.n)))} />} />
          </div>
          <p className="overflow-x-auto text-[.86rem]"><MathHtml html={tex(sumFormulaTex(state.kind))} /></p>
          <p className="overflow-x-auto text-[.82rem] text-ink-3"><MathHtml html={tex(terms.map(qTex).join(",\\ ") + (shown < state.n ? ",\\ \\cdots" : ""))} /></p>
        </div>
      </section>
      <section className={`${panelClass} grid gap-4 lg:grid-cols-2`}>
        <div className="min-w-0">
          <h2 className="mb-1 text-sm font-extrabold text-ink">귀납적으로 정의된 수열</h2>
          <p className="overflow-x-auto text-[.9rem] text-ink"><MathHtml html={tex(recurrenceTex(rule))} /></p>
          <p className="mt-1 overflow-x-auto text-[.86rem] text-ink-2"><MathHtml html={tex(recurrenceTerms(rule, 8).map((term, index) => `a_{${index + 1}}=${qTex(term)}`).join(",\\ "))} /></p>
        </div>
        <div className="min-w-0">
          <h2 className="mb-1 text-sm font-extrabold text-ink">수학적 귀납법 증명 틀</h2>
          <div className="flex flex-wrap gap-1">{INDUCTIONS.map(item => <button key={item.id} type="button" aria-pressed={proof.id === item.id} onClick={() => update({ proof: item.id })} className={chipClass(proof.id === item.id)}><MathHtml html={tex(item.claim)} /></button>)}</div>
          <Toggle label="빈칸 대신 답 보기" checked={state.reveal} onChange={reveal => update({ reveal })} />
          <div className="rounded-xl border border-line bg-white p-3 text-[.86rem] leading-7 text-black" dangerouslySetInnerHTML={{ __html: inductionHtml(proof, !state.reveal) }} />
        </div>
      </section>
      <MathSheet id="math-sequence-print" sections={seqProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "수열", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

"use client";

import { z } from "zod";
import { num } from "@/features/math/core";
import { dist2, distTex, internal, mirror, mirrorNames, pointTex, projectionAreaTex, spaceAsks, spaceProblems, spaceSvg, sphereGeneralTex, sphereTex, threePerpendicularSvg, type Mirror, type P3, type SpaceAsk } from "@/features/math/space";
import { add, cosText, directionLineTex, divide, dot, isParallel, isPerpendicular, normalLineTex, normTex, scale, specialAngle, sub, vecTex, vectorAsks, vectorProblems, vectorSvg, type V2, type VectorAsk, type VectorFigure } from "@/features/math/vector";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, chipClass, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MathSheet } from "./math-lab-shared";
import { Tex } from "./math-probability-views";

const coord = z.number().int().min(-20).max(20);

/* ───── 공간좌표 ───── */
const spaceSchema = z.object({
  a: z.tuple([coord, coord, coord]).catch([2, -1, 3]), b: z.tuple([coord, coord, coord]).catch([-1, 3, 1]),
  m: z.number().int().min(1).max(20).catch(2), n: z.number().int().min(1).max(20).catch(1),
  mirror: z.enum(Object.keys(mirrorNames) as [Mirror, ...Mirror[]]).catch("xy"),
  area: z.number().positive().max(10000).catch(12), angle: z.union([z.literal(0), z.literal(30), z.literal(45), z.literal(60), z.literal(90)]).catch(60),
  asks: asksSchema(spaceAsks, ["distance", "division", "mirror", "sphere", "general", "projection"]), sheet: sheetSchema(1),
});
function PointFields({ label, value, onChange }: { label: string; value: P3; onChange: (value: P3) => void }) {
  return <div>
    <p className="mb-1 text-xs font-semibold text-ink-4">{label}</p>
    <div className="grid grid-cols-3 gap-2">{(["x", "y", "z"] as const).map((axis, index) => <NumberField key={axis} label={axis} value={value[index]} min={-20} max={20} onChange={next => onChange(value.map((item, at) => at === index ? next : item) as P3)} />)}</div>
  </div>;
}
export function SpaceView() {
  const [state, update] = useStored("learncraft_math_space_v1", spaceSchema);
  const a = state.a as P3;
  const b = state.b as P3;
  const mirrored = mirror(a, state.mirror);
  return (
    <ToolLayout aside={<>
      <Card title="두 점">
        <div className="space-y-2">
          <PointFields label="점 A" value={a} onChange={value => update({ a: value })} />
          <PointFields label="점 B" value={b} onChange={value => update({ b: value })} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="내분 비 m" value={state.m} min={1} max={20} onChange={m => update({ m })} />
          <NumberField label="내분 비 n" value={state.n} min={1} max={20} onChange={n => update({ n })} />
        </div>
      </Card>
      <Card title="점 A의 대칭점">
        <div className="flex flex-wrap gap-1.5">{(Object.keys(mirrorNames) as Mirror[]).map(key => <button key={key} type="button" aria-pressed={state.mirror === key} onClick={() => update({ mirror: key })} className={chipClass(state.mirror === key)}>{mirrorNames[key]}</button>)}</div>
      </Card>
      <Card title="정사영">
        <NumberField label="도형의 넓이 S" value={state.area} min={0.01} max={10000} onChange={area => update({ area })} />
        <p className="mb-1 mt-2 text-xs font-semibold text-ink-4">두 평면이 이루는 각</p>
        <Segmented label="각" value={state.angle} onChange={angle => update({ angle })} options={[0, 30, 45, 60, 90].map(value => ({ value: value as 0 | 30 | 45 | 60 | 90, label: `${value}°` }))} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 공간좌표)">
        <MultiChips options={spaceAsks} value={state.asks} onChange={asks => update({ asks: asks as SpaceAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="overflow-x-auto"><SvgView label="공간좌표" svg={spaceSvg([{ name: "A", at: a }, { name: "B", at: b }], { segment: [0, 1] })} /></div>
        <div className="space-y-2 text-[.86rem]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="선분 AB의 길이" value={<Tex source={distTex(a, b)} />} note={`√${dist2(a, b)}`} />
            <Stat label={`${state.m} : ${state.n} 내분점`} value={<Tex source={pointTex(internal(a, b, state.m, state.n))} />} />
            <Stat label={`A를 ${mirrorNames[state.mirror]}에 대칭`} value={<Tex source={pointTex(mirrored)} />} />
            <Stat label="중점" value={<Tex source={pointTex(internal(a, b, 1, 1))} />} />
          </div>
          <p className="text-[.8rem]">중심 A, 점 B를 지나는 구: <Tex source={sphereTex(a, dist2(a, b))} /></p>
          <p className="break-all text-[.8rem]">일반형: <Tex source={sphereGeneralTex(a, dist2(a, b))} /></p>
          <p className="text-[.8rem]">정사영의 넓이: <Tex source={`S\\cos\\theta=${num(state.area, 3)}\\cos ${state.angle}°=${Number.isInteger(state.area) ? projectionAreaTex(state.area, state.angle) : num(state.area * Math.cos((state.angle * Math.PI) / 180), 4)}`} /></p>
        </div>
      </section>
      <section className={`${panelClass} grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center`}>
        <div className="overflow-x-auto"><SvgView label="삼수선 정리" svg={threePerpendicularSvg()} /></div>
        <ul className="space-y-1 text-[.8rem] leading-6 text-ink-3">
          <li>① PO ⊥ α, OH ⊥ l 이면 PH ⊥ l</li>
          <li>② PO ⊥ α, PH ⊥ l 이면 OH ⊥ l</li>
          <li>③ PH ⊥ l, OH ⊥ l, PO ⊥ OH 이면 PO ⊥ α</li>
          <li className="text-[.74rem] text-ink-4">(P는 평면 α 밖의 점, O는 α 위의 점, l은 α 위의 직선, H는 l 위의 점)</li>
        </ul>
      </section>
      <MathSheet id="math-space-print" sections={spaceProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "공간좌표", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 벡터 ───── */
const small = z.number().int().min(-10).max(10);
const vectorSchema = z.object({
  a: z.tuple([small, small]).catch([3, 1]), b: z.tuple([small, small]).catch([1, 2]),
  figure: z.enum(["sum", "difference", "scalar"]).catch("sum"), k: z.number().int().min(-4).max(4).catch(2),
  point: z.tuple([small, small]).catch([1, -2]),
  asks: asksSchema(vectorAsks, ["components", "dot", "angle", "magnitude", "perpendicular", "division", "line"]), sheet: sheetSchema(1),
});
function VectorFields({ label, value, onChange }: { label: string; value: V2; onChange: (value: V2) => void }) {
  return <div>
    <p className="mb-1 text-xs font-semibold text-ink-4">{label}</p>
    <div className="grid grid-cols-2 gap-2">{(["x 성분", "y 성분"] as const).map((axis, index) => <NumberField key={axis} label={axis} value={value[index]} min={-10} max={10} onChange={next => onChange(value.map((item, at) => at === index ? next : item) as V2)} />)}</div>
  </div>;
}
export function VectorView() {
  const [state, update] = useStored("learncraft_math_vector_v1", vectorSchema);
  const a = state.a as V2;
  const b = state.b as V2;
  const angle = specialAngle(a, b);
  const zero = !dot(a, a) || !dot(b, b);
  const cos = zero ? 0 : dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b));
  return (
    <ToolLayout aside={<>
      <Card title="두 벡터">
        <div className="space-y-2">
          <VectorFields label="벡터 a" value={a} onChange={value => update({ a: value })} />
          <VectorFields label="벡터 b" value={b} onChange={value => update({ b: value })} />
        </div>
      </Card>
      <Card title="그림">
        <Segmented label="그림" value={state.figure} onChange={(figure: VectorFigure) => update({ figure })} options={[{ value: "sum", label: "a + b" }, { value: "difference", label: "a − b" }, { value: "scalar", label: "ka" }]} />
        {state.figure === "scalar" && <NumberField className="mt-2" label="실수 k" value={state.k} min={-4} max={4} onChange={k => update({ k })} />}
      </Card>
      <Card title="직선의 방정식" help="점 A를 지나고 a에 평행한 직선(방향벡터 a)과 a에 수직인 직선(법선벡터 a)을 구해요.">
        <VectorFields label="지나는 점 A" value={state.point as V2} onChange={point => update({ point })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 평면벡터)">
        <MultiChips options={vectorAsks} value={state.asks} onChange={asks => update({ asks: asks as VectorAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="overflow-x-auto"><SvgView label="벡터" svg={vectorSvg(a, b, state.figure, state.k)} /></div>
        <div className="space-y-2 text-[.86rem]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stat label="a + b" value={<Tex source={vecTex(add(a, b))} />} />
            <Stat label="a − b" value={<Tex source={vecTex(sub(a, b))} />} />
            <Stat label={`${state.k}a`} value={<Tex source={vecTex(scale(state.k, a))} />} />
            <Stat label="|a|, |b|" value={<Tex source={`${normTex(a)},\\ ${normTex(b)}`} />} />
            <Stat label="내적 a·b" value={String(dot(a, b))} note="x₁x₂ + y₁y₂" />
            <Stat label="이루는 각 θ" value={zero ? "—" : angle !== null ? `${angle}°` : `약 ${num((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI, 1)}°`} note={zero ? "영벡터가 있어요" : undefined} />
          </div>
          {!zero && <p className="text-[.8rem]"><Tex source={cosText(a, b)} /></p>}
          <p className="rounded-xl bg-brand-page px-3 py-2 font-bold">{zero ? "영벡터는 방향이 없어요." : isPerpendicular(a, b) ? "a·b = 0 이므로 두 벡터는 서로 수직이에요." : isParallel(a, b) ? "b = ka 꼴이므로 두 벡터는 서로 평행해요." : "두 벡터는 수직도 평행도 아니에요."}</p>
          <p className="text-[.8rem]">A, B를 위치벡터 a, b의 끝점으로 볼 때 AB의 중점: <Tex source={vecTex(divide(a, b, 1, 1))} /></p>
          {!zero && <p className="text-[.8rem]">점 A{`(${state.point.join(", ")})`}를 지나고 a에 평행: <Tex source={directionLineTex(state.point as V2, a)} />, a에 수직: <Tex source={normalLineTex(state.point as V2, a)} /></p>}
        </div>
      </section>
      <MathSheet id="math-vector-print" sections={vectorProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "평면벡터", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

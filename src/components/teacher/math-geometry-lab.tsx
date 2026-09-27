"use client";

import { z } from "zod";
import { Axis3d, MoveUpRight, Spline, TrendingUp } from "lucide-react";
import { num } from "@/features/math/core";
import { conicAsks, conicInfo, conicProblems, conicSvg, conicTex, lineNumbers, lineTex, tangentAt, tangentsWithSlope, type Conic, type ConicAsk } from "@/features/math/conic";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MATH_AREA, MathSheet } from "./math-lab-shared";
import { Tex } from "./math-probability-views";
import { SpaceView, VectorView } from "./math-geometry-views";

export function MathGeometryLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="geometry" area={MATH_AREA} subject="기하" title="기하 · 이차곡선·공간좌표·벡터 도구" tabs={tabs}
      description="포물선·타원·쌍곡선과 접선, 공간좌표와 구, 평면벡터의 연산과 내적을 식으로 계산하고 그림으로 보여 줍니다. 문제는 답이 깔끔하게 떨어지도록 만들고 정답과 함께 인쇄합니다."
      views={[
        { value: "conic", label: "이차곡선", icon: Spline, note: "포물선·타원·쌍곡선의 초점·준선·꼭짓점·점근선을 구하고 평행이동한 그래프를 그려요.", render: () => <ConicView /> },
        { value: "tangent", label: "이차곡선의 접선", icon: TrendingUp, note: "곡선 위의 점에서의 접선과 기울기가 주어진 접선을 공식으로 구하고 그림에 그려요.", render: () => <TangentView /> },
        { value: "space", label: "공간좌표", icon: Axis3d, note: "공간의 점을 그림에 찍고, 거리·내분점·대칭점·구의 방정식·정사영의 넓이를 구해요. 삼수선 정리 그림도 있어요.", render: () => <SpaceView /> },
        { value: "vector", label: "벡터", icon: MoveUpRight, note: "평면벡터의 덧셈·뺄셈·실수배를 그리고, 성분·크기·내적·이루는 각·수직과 평행·직선의 방정식을 구해요.", render: () => <VectorView /> },
      ]} />
  );
}

/* ───── 이차곡선 ───── */
const conicSchema = z.object({
  kind: z.enum(["parabola", "ellipse", "hyperbola"]).catch("ellipse"),
  axis: z.enum(["x", "y"]).catch("x"), p: z.number().min(-20).max(20).catch(2),
  A: z.number().positive().max(400).catch(25), B: z.number().positive().max(400).catch(9), sign: z.union([z.literal(1), z.literal(-1)]).catch(1),
  m: z.number().int().min(-10).max(10).catch(0), n: z.number().int().min(-10).max(10).catch(0),
  asks: asksSchema(conicAsks, ["parabola", "ellipse", "hyperbola", "shift"]), sheet: sheetSchema(1),
});
type ConicState = z.infer<typeof conicSchema>;
const toConic = (state: Pick<ConicState, "kind" | "axis" | "p" | "A" | "B" | "sign" | "m" | "n">): Conic =>
  state.kind === "parabola" ? { kind: "parabola", axis: state.axis, p: state.p || 1, m: state.m, n: state.n }
    : state.kind === "ellipse" ? { kind: "ellipse", A: state.A, B: state.B, m: state.m, n: state.n }
      : { kind: "hyperbola", A: state.A, B: state.B, sign: state.sign, m: state.m, n: state.n };

function ConicFields({ state, update, shift }: { state: ConicState; update: (patch: Partial<ConicState>) => void; shift: boolean }) {
  return <>
    <Segmented label="곡선" value={state.kind} onChange={kind => update({ kind })} options={[{ value: "parabola", label: "포물선" }, { value: "ellipse", label: "타원" }, { value: "hyperbola", label: "쌍곡선" }]} />
    {state.kind === "parabola" ? <div className="mt-3 space-y-2">
      <Segmented label="축" value={state.axis} onChange={axis => update({ axis })} options={[{ value: "x", label: "y² = 4px" }, { value: "y", label: "x² = 4py" }]} />
      <NumberField label="p (0이 아닌 수)" value={state.p} min={-20} max={20} step={0.5} onChange={p => update({ p })} />
    </div> : <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="x²의 분모 (a²)" value={state.A} min={0.01} max={400} onChange={A => update({ A })} />
        <NumberField label="y²의 분모 (b²)" value={state.B} min={0.01} max={400} onChange={B => update({ B })} />
      </div>
      {state.kind === "hyperbola" && <Segmented label="우변" value={state.sign} onChange={sign => update({ sign })} options={[{ value: 1, label: "= 1 (좌우)" }, { value: -1, label: "= −1 (위아래)" }]} />}
    </div>}
    {shift && <div className="mt-2 grid grid-cols-2 gap-2">
      <NumberField label="x축 방향 평행이동 m" value={state.m} min={-10} max={10} onChange={m => update({ m })} />
      <NumberField label="y축 방향 평행이동 n" value={state.n} min={-10} max={10} onChange={n => update({ n })} />
    </div>}
  </>;
}

function ConicView() {
  const [state, update] = useStored("learncraft_math_conic_v1", conicSchema);
  const conic = toConic(state);
  const info = conicInfo(conic);
  return (
    <ToolLayout aside={<>
      <Card title="이차곡선"><ConicFields state={state} update={update} shift /></Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 이차곡선)">
        <MultiChips options={conicAsks} value={state.asks} onChange={asks => update({ asks: asks as ConicAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="overflow-x-auto"><SvgView label="이차곡선" svg={conicSvg(conic)} /></div>
        <div className="space-y-2 text-[.86rem]">
          <p className="rounded-xl bg-brand-page px-4 py-3 text-[1.05rem]"><Tex source={conicTex(conic)} /></p>
          <table className="w-full border-collapse text-[.84rem]"><tbody>
            {info.rows.map(([label, html]) => <tr key={label} className="border-t border-line"><th className="w-40 py-1.5 pr-2 text-left font-semibold text-ink-3">{label}</th><td className="py-1.5" dangerouslySetInnerHTML={{ __html: html }} /></tr>)}
          </tbody></table>
          <p className="text-[.74rem] leading-5 text-ink-4">{conic.kind === "parabola" ? "포물선: 한 점(초점)과 한 직선(준선)에서 같은 거리에 있는 점의 자취예요." : conic.kind === "ellipse" ? "타원: 두 초점에서의 거리의 합이 일정한 점의 자취예요. c² = |a² − b²|" : "쌍곡선: 두 초점에서의 거리의 차가 일정한 점의 자취예요. c² = a² + b²"}</p>
        </div>
      </section>
      <MathSheet id="math-conic-print" sections={conicProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "이차곡선", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 이차곡선의 접선 ───── */
const tangentSchema = z.object({
  kind: z.enum(["parabola", "ellipse", "hyperbola"]).catch("ellipse"),
  axis: z.enum(["x", "y"]).catch("x"), p: z.number().min(-20).max(20).catch(2),
  A: z.number().positive().max(400).catch(8), B: z.number().positive().max(400).catch(2), sign: z.union([z.literal(1), z.literal(-1)]).catch(1),
  // 접선 보기는 원점 중심만 다룹니다(m, n은 이차곡선 보기와 입력 틀을 같이 쓰려고 둠).
  m: z.number().int().catch(0), n: z.number().int().catch(0),
  mode: z.enum(["point", "slope"]).catch("point"),
  x1: z.number().int().min(-50).max(50).catch(2), y1: z.number().int().min(-50).max(50).catch(1), slope: z.number().min(-20).max(20).catch(1),
  asks: asksSchema(conicAsks, ["tangentPoint", "tangentSlope"]), sheet: sheetSchema(2),
});
function TangentView() {
  const [state, update] = useStored("learncraft_math_tangent_v1", tangentSchema);
  const conic = toConic({ ...state, m: 0, n: 0 });
  const onCurve = (() => {
    const { x1, y1 } = state;
    if (conic.kind === "parabola") return conic.axis === "x" ? Math.abs(y1 * y1 - 4 * conic.p * x1) < 1e-9 : Math.abs(x1 * x1 - 4 * conic.p * y1) < 1e-9;
    const value = (x1 * x1) / conic.A + (conic.kind === "ellipse" ? 1 : -1) * (y1 * y1) / conic.B;
    return Math.abs(value - (conic.kind === "hyperbola" ? conic.sign : 1)) < 1e-9;
  })();
  const pointLine = onCurve && Number.isInteger(conic.kind === "parabola" ? conic.p * 4 : 1) ? tangentAt(conic, state.x1, state.y1) : null;
  const slopeLines = tangentsWithSlope(conic, state.slope);
  const formula = conic.kind === "parabola" ? (conic.axis === "x" ? "y_{1}y=2p(x+x_{1}),\\quad y=mx+\\frac{p}{m}" : "x_{1}x=2p(y+y_{1}),\\quad y=mx-pm^{2}")
    : conic.kind === "ellipse" ? "\\frac{x_{1}x}{a^{2}}+\\frac{y_{1}y}{b^{2}}=1,\\quad y=mx\\pm\\sqrt{a^{2}m^{2}+b^{2}}"
      : conic.sign === 1 ? "\\frac{x_{1}x}{a^{2}}-\\frac{y_{1}y}{b^{2}}=1,\\quad y=mx\\pm\\sqrt{a^{2}m^{2}-b^{2}}" : "\\frac{x_{1}x}{a^{2}}-\\frac{y_{1}y}{b^{2}}=-1,\\quad y=mx\\pm\\sqrt{b^{2}-a^{2}m^{2}}";
  const svg = state.mode === "point"
    ? conicSvg(conic, pointLine ? { tangent: lineNumbers(pointLine), point: [state.x1, state.y1] } : { point: [state.x1, state.y1] })
    : conicSvg(conic, slopeLines ? { tangent: { slope: state.slope, intercept: slopeLines.intercepts[0] } } : {});
  return (
    <ToolLayout aside={<>
      <Card title="곡선 (중심·꼭짓점이 원점)"><ConicFields state={state} update={update} shift={false} /></Card>
      <Card title="접선">
        <Segmented label="접선" value={state.mode} onChange={mode => update({ mode })} options={[{ value: "point", label: "곡선 위의 점" }, { value: "slope", label: "기울기" }]} />
        {state.mode === "point" ? <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="x₁" value={state.x1} min={-50} max={50} onChange={x1 => update({ x1 })} />
          <NumberField label="y₁" value={state.y1} min={-50} max={50} onChange={y1 => update({ y1 })} />
        </div> : <NumberField className="mt-2" label="기울기 m" value={state.slope} min={-20} max={20} step={0.5} onChange={slope => update({ slope })} />}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 이차곡선의 접선)">
        <MultiChips options={conicAsks} value={state.asks} onChange={asks => update({ asks: asks as ConicAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
        <div className="overflow-x-auto"><SvgView label="이차곡선과 접선" svg={svg} /></div>
        <div className="space-y-2 text-[.86rem]">
          <p className="rounded-xl bg-surface-2 px-4 py-3"><Tex source={conicTex(conic)} /></p>
          <p className="text-[.8rem] text-ink-3">공식 <Tex source={formula} /></p>
          {state.mode === "point"
            ? (onCurve
              ? <p className="rounded-xl bg-brand-page px-4 py-3 font-bold">접선 {pointLine ? <Tex source={lineTex(pointLine)} /> : "—"}</p>
              : <p role="alert" className="font-semibold text-warn">점 ({state.x1}, {state.y1})이 곡선 위에 있지 않아요. 곡선 위의 점을 넣어 주세요.</p>)
            : (slopeLines
              ? <p className="rounded-xl bg-brand-page px-4 py-3 font-bold">접선 {slopeLines.intercepts.map(intercept => `y = ${num(state.slope, 3)}x ${intercept < 0 ? "−" : "+"} ${num(Math.abs(intercept), 4)}`).join(",  ")}</p>
              : <p role="alert" className="font-semibold text-warn">이 기울기로는 접선이 없어요.{conic.kind === "hyperbola" ? " 쌍곡선은 점근선보다 가파른 기울기에서만 접선이 있어요." : ""}</p>)}
          <p className="text-[.74rem] leading-5 text-ink-4">그림에는 접선 가운데 하나를 빨간 선으로 그렸어요.</p>
        </div>
      </section>
      <MathSheet id="math-tangent-print" sections={conicProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "이차곡선의 접선", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

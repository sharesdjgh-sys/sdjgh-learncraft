"use client";

import { z } from "zod";
import { Circle as CircleIcon, FlipHorizontal2, Network, Ruler, Shapes, Sigma, Spline } from "lucide-react";
import { qTex } from "@/features/math/core";
import {
  circleAsks, circleGeneralTex, circleLine, circleProblems, circleStandardTex, circleSvg, distanceTex, internal, lineAsks, lineEquationTex, lineProblems, lineRelation, lineThrough, moveAsks, moveCircle, moveLine, moveNames, moveProblems, movePoint, moveSvg,
  pointLineDistance, radiusTex, tangentAt, type CircleAsk, type LineAsk, type Move, type MoveAsk, type Pt,
} from "@/features/math/cm2-geometry";
import { lineTex } from "@/features/math/cm-util";
import { fitRange, planeSvg } from "@/features/math/cm-plane";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, MultiChips, NumberField, panelClass, SheetCard, sheetSchema, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { MATH_AREA, MathSheet } from "./math-lab-shared";
import { Tex } from "./math-common1-views";
import { FunctionView, LogicView, RationalView, SetView } from "./math-common2-views";

export function MathCommon2Lab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="common2" area={MATH_AREA} subject="공통수학 2" title="공통수학 2 · 도형의 방정식·집합과 명제·함수 도구" tabs={tabs}
      description="점과 직선, 원의 방정식, 도형의 이동, 집합과 명제, 함수, 유리함수·무리함수를 좌표평면·벤 다이어그램·대응 그림으로 보여 주고 계산합니다. 문제는 정답·풀이와 함께 인쇄합니다."
      views={[
        { value: "line", label: "점과 직선", icon: Ruler, note: "두 점 사이의 거리, 선분의 내분점, 직선의 방정식, 두 직선의 평행·수직, 점과 직선 사이의 거리를 좌표평면에 그려요.", render: () => <LineView /> },
        { value: "circle", label: "원의 방정식", icon: CircleIcon, note: "표준형과 일반형, 원과 직선의 위치 관계(판별식과 거리), 원 위의 점에서의 접선을 다뤄요.", render: () => <CircleView /> },
        { value: "move", label: "도형의 이동", icon: FlipHorizontal2, note: "점·직선·원을 평행이동하거나 x축·y축·원점·직선 y = x에 대하여 대칭이동해요.", render: () => <MoveView /> },
        { value: "sets", label: "집합", icon: Shapes, note: "조건으로 집합을 만들어 벤 다이어그램에 원소를 적고, 합집합·교집합·차집합·여집합과 부분집합의 개수를 구해요.", render: () => <SetView /> },
        { value: "logic", label: "명제", icon: Sigma, note: "조건의 진리집합, 명제의 역·대우, 필요조건·충분조건을 진리집합의 포함 관계로 판정해요.", render: () => <LogicView /> },
        { value: "function", label: "함수", icon: Network, note: "대응 그림으로 함수·일대일함수·일대일대응을 가르고, 합성함수와 역함수를 구해요.", render: () => <FunctionView /> },
        { value: "rational", label: "유리·무리함수", icon: Spline, note: "y = k/(x − p) + q와 y = ±√(a(x − p)) + q의 그래프, 점근선, 정의역과 치역을 보여 줘요.", render: () => <RationalView /> },
      ]} />
  );
}

const pointSchema = z.object({ x: z.number().int().min(-20).max(20), y: z.number().int().min(-20).max(20) });
function PointFields({ label, value, onChange }: { label: string; value: Pt; onChange: (value: Pt) => void }) {
  return <div className="grid grid-cols-2 gap-2"><NumberField label={`${label}의 x좌표`} value={value.x} min={-20} max={20} onChange={x => onChange({ ...value, x: Math.round(x) })} /><NumberField label={`${label}의 y좌표`} value={value.y} min={-20} max={20} onChange={y => onChange({ ...value, y: Math.round(y) })} /></div>;
}

/* ───── 점과 직선 ───── */
const lineSchema = z.object({
  a: pointSchema.catch({ x: -2, y: 1 }), b: pointSchema.catch({ x: 4, y: 4 }), m: z.number().int().min(1).max(9).catch(2), n: z.number().int().min(1).max(9).catch(1),
  p: pointSchema.catch({ x: 3, y: -2 }),
  asks: asksSchema(lineAsks, ["distance", "divide", "through", "parallel", "pointLine"]), sheet: sheetSchema(2),
});
function LineView() {
  const [state, update] = useStored("learncraft_math_line_v1", lineSchema);
  const same = state.a.x === state.b.x && state.a.y === state.b.y;
  const line = same ? null : lineThrough(state.a, state.b);
  const divide = internal(state.a, state.b, state.m, state.n);
  const distance = line ? pointLineDistance(state.p, line) : null;
  // 점 P를 지나고 AB에 수직인 직선: b(x − x₀) − a(y − y₀) = 0
  const perpendicular = line ? { a: line.b, b: -line.a, c: -line.b * state.p.x + line.a * state.p.y } : null;
  return (
    <ToolLayout aside={<>
      <Card title="두 점과 한 점">
        <PointFields label="A" value={state.a} onChange={a => update({ a })} />
        <div className="mt-2"><PointFields label="B" value={state.b} onChange={b => update({ b })} /></div>
        <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="내분 m" value={state.m} min={1} max={9} onChange={m => update({ m: Math.round(m) })} /><NumberField label="n" value={state.n} min={1} max={9} onChange={n => update({ n: Math.round(n) })} /></div>
        <div className="mt-2"><PointFields label="P" value={state.p} onChange={p => update({ p })} /></div>
        {same && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">A와 B가 같은 점이면 직선을 정할 수 없어요.</p>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 평면좌표와 직선의 방정식)">
        <MultiChips options={lineAsks} value={state.asks} onChange={asks => update({ asks: asks as LineAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="좌표평면" svg={planeSvg({
          ...fitRange([[state.a.x, state.a.y], [state.b.x, state.b.y], [state.p.x, state.p.y]]),
          lines: [...(line ? [{ ...line, label: "AB" }] : []), ...(perpendicular ? [{ ...perpendicular, color: "#16a34a", dash: true }] : [])],
          points: [{ ...state.a, label: "A" }, { ...state.b, label: "B" }, { x: divide.x.n / divide.x.d, y: divide.y.n / divide.y.d, label: "내분점", color: "#dc2626" }, { ...state.p, label: "P", color: "#16a34a" }],
        })} />
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <Stat label="AB의 길이" value={<Tex source={distanceTex(state.a, state.b)} />} />
          <Stat label={`AB의 ${state.m} : ${state.n} 내분점`} value={<Tex source={`(${qTex(divide.x)},\\ ${qTex(divide.y)})`} />} />
          {line && <Stat label="직선 AB" value={<Tex source={lineEquationTex(line)} />} note={`일반형 ${lineTex(line.a, line.b, line.c).replace(/-/g, "−")}`} />}
          {distance && <Stat label="점 P와 직선 AB 사이의 거리" value={<Tex source={distance.tex} />} note="|ax₀ + by₀ + c| ÷ √(a² + b²)" />}
          {perpendicular && line && <Stat label="P를 지나고 AB에 수직인 직선(초록 점선)" value={<Tex source={lineEquationTex(perpendicular)} />} note={lineRelation(line, perpendicular)} />}
        </div>
      </section>
      <MathSheet id="math-line-print" sections={lineProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "평면좌표와 직선의 방정식", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 원의 방정식 ───── */
const circleSchema = z.object({
  cx: z.number().int().min(-10).max(10).catch(1), cy: z.number().int().min(-10).max(10).catch(-1), r2: z.number().int().min(1).max(100).catch(25),
  la: z.number().int().min(-20).max(20).catch(3), lb: z.number().int().min(-20).max(20).catch(4), lc: z.number().int().min(-99).max(99).catch(-24),
  on: pointSchema.catch({ x: 4, y: 3 }),
  asks: asksSchema(circleAsks, ["standard", "general", "relation", "tangentPoint"]), sheet: sheetSchema(2),
});
function CircleView() {
  const [state, update] = useStored("learncraft_math_circle_v1", circleSchema);
  const circle = { cx: state.cx, cy: state.cy, r2: state.r2 };
  const lineValid = state.la !== 0 || state.lb !== 0;
  const line = { a: state.la, b: state.lb, c: state.lc };
  const relation = lineValid ? circleLine(circle, line) : null;
  const onCircle = (state.on.x - state.cx) ** 2 + (state.on.y - state.cy) ** 2 === state.r2;
  const tangent = onCircle ? tangentAt(circle, state.on) : null;
  return (
    <ToolLayout aside={<>
      <Card title="원 (x − a)² + (y − b)² = r²">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="a" value={state.cx} min={-10} max={10} onChange={value => update({ cx: Math.round(value) })} />
          <NumberField label="b" value={state.cy} min={-10} max={10} onChange={value => update({ cy: Math.round(value) })} />
          <NumberField label="r²" value={state.r2} min={1} max={100} onChange={value => update({ r2: Math.round(value) })} />
        </div>
      </Card>
      <Card title="직선 ax + by + c = 0">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="a" value={state.la} min={-20} max={20} onChange={value => update({ la: Math.round(value) })} />
          <NumberField label="b" value={state.lb} min={-20} max={20} onChange={value => update({ lb: Math.round(value) })} />
          <NumberField label="c" value={state.lc} min={-99} max={99} onChange={value => update({ lc: Math.round(value) })} />
        </div>
      </Card>
      <Card title="접선을 그을 원 위의 점" help="원 위에 있는 점이어야 접선을 그려요.">
        <PointFields label="점" value={state.on} onChange={on => update({ on })} />
        {!onCircle && <p className="mt-2 text-[.76rem] text-ink-4">이 점은 원 위에 있지 않아요.</p>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 원의 방정식)">
        <MultiChips options={circleAsks} value={state.asks} onChange={asks => update({ asks: asks as CircleAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="원과 직선" svg={circleSvg(circle, { lines: [...(lineValid ? [line] : []), ...(tangent ? [{ ...tangent, color: "#16a34a" }] : [])], points: onCircle ? [state.on] : [] })} />
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <Stat label="표준형" value={<Tex source={circleStandardTex(circle)} />} />
          <Stat label="일반형" value={<Tex source={circleGeneralTex(circle)} />} />
          <Stat label="중심·반지름" value={<Tex source={`(${state.cx},\\ ${state.cy}),\\ ${radiusTex(circle)}`} />} />
          {relation && <Stat label="원과 직선" value={relation.relation} note={`중심과 직선 사이의 거리 ${relation.d.value.toFixed(2)}, 반지름 ${Math.sqrt(state.r2).toFixed(2)}`} />}
          {tangent && <Stat label={`(${state.on.x}, ${state.on.y})에서의 접선(초록)`} value={<Tex source={lineTex(tangent.a, tangent.b, tangent.c)} />} />}
        </div>
      </section>
      <MathSheet id="math-circle-print" sections={circleProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "원의 방정식", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 도형의 이동 ───── */
const moveSchema = z.object({
  move: z.enum(["shift", "xAxis", "yAxis", "origin", "yx"]).catch("shift"), dx: z.number().int().min(-10).max(10).catch(3), dy: z.number().int().min(-10).max(10).catch(-2),
  points: z.array(pointSchema).length(3).catch([{ x: 1, y: 1 }, { x: 4, y: 2 }, { x: 2, y: 4 }]),
  asks: asksSchema(moveAsks, ["point", "line", "circle"]), sheet: sheetSchema(2),
});
function MoveView() {
  const [state, update] = useStored("learncraft_math_move_v1", moveSchema);
  const move = state.move as Move;
  const [a] = state.points;
  const lineAB = lineThrough(state.points[0], state.points[1]);
  const moved = movePoint(a, move, state.dx, state.dy);
  const movedLine = moveLine(lineAB, move, state.dx, state.dy);
  const circle = { cx: a.x, cy: a.y, r2: 4 };
  const movedCircle = moveCircle(circle, move, state.dx, state.dy);
  return (
    <ToolLayout aside={<>
      <Card title="이동">
        <Segmented label="이동" value={state.move} onChange={value => update({ move: value })} options={(Object.keys(moveNames) as Move[]).map(key => ({ value: key, label: moveNames[key].replace(" 대칭", "").replace("직선 ", "") }))} />
        {move === "shift" && <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="x축 방향" value={state.dx} min={-10} max={10} onChange={dx => update({ dx: Math.round(dx) })} /><NumberField label="y축 방향" value={state.dy} min={-10} max={10} onChange={dy => update({ dy: Math.round(dy) })} /></div>}
      </Card>
      <Card title="삼각형 ABC">
        {state.points.map((point, index) => <div key={index} className={index ? "mt-2" : ""}><PointFields label={"ABC"[index]} value={point} onChange={value => update({ points: state.points.map((old, at) => at === index ? value : old) })} /></div>)}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 도형의 이동)">
        <MultiChips options={moveAsks} value={state.asks} onChange={asks => update({ asks: asks as MoveAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="도형의 이동" svg={moveSvg(state.points, move, state.dx, state.dy)} />
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <Stat label={`${moveNames[move]}${move === "shift" ? ` (${state.dx}, ${state.dy})` : ""}`} value={move === "shift" ? "(x, y) → (x + a, y + b)" : move === "xAxis" ? "(x, y) → (x, −y)" : move === "yAxis" ? "(x, y) → (−x, y)" : move === "origin" ? "(x, y) → (−x, −y)" : "(x, y) → (y, x)"} />
          <Stat label="점 A" value={<Tex source={`(${a.x},\\ ${a.y})\\to(${moved.x},\\ ${moved.y})`} />} />
          {(lineAB.a !== 0 || lineAB.b !== 0) && <Stat label="직선 AB" value={<Tex source={`${lineTex(lineAB.a, lineAB.b, lineAB.c)}\\to ${lineTex(movedLine.a, movedLine.b, movedLine.c)}`} />} note="도형의 방정식은 x, y 자리에 옮기기 전 좌표를 넣어 구해요." />}
          <Stat label="중심이 A, 반지름 2인 원" value={<Tex source={`${circleStandardTex(circle)}\\to ${circleStandardTex(movedCircle)}`} />} />
        </div>
      </section>
      <MathSheet id="math-move-print" sections={moveProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "도형의 이동", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

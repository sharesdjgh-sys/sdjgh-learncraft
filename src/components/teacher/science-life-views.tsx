"use client";

import { z } from "zod";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_SURVEY, ecologyAsks, ecologyProblems, growthSvg, surveyResult, surveyTableHtml, type EcologyAsk, type Survey } from "@/features/science/ecology";
import { enzymeAsks, enzymeProblems, inhibitors, phSvg, PH_ENZYMES, substrateSvg, temperatureSvg, type EnzymeAsk, type Inhibitor } from "@/features/science/enzyme";
import { dnaGraphSvg, meiosisAsks, meiosisProblems, stageCell, STAGES, stageTableHtml, type DivisionKind, type MeiosisAsk } from "@/features/science/meiosis";
import { blankableLabels, DIAGRAMS, diagramSvg, metabolismSheet, respirationTableHtml, type DiagramKind } from "@/features/science/metabolism";
import { actionPotentialSvg, DEFAULT_CURVE, nervePotentials, nerveSvg, neuronAsks, neuronProblems, type NeuronAsk } from "@/features/science/neuron";
import { num } from "@/features/science/sheet";
import { Card, Range, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";

/* ───── 세포 분열 ───── */
const divisionSchema = z.object({
  kind: z.enum(["mitosis", "meiosis"]).catch("meiosis"), n: z.number().int().min(1).max(4).catch(2),
  asks: asksSchema(meiosisAsks, ["table", "graph", "gametes", "compare"]), sheet: sheetSchema(1),
});
export function DivisionView() {
  const [state, update] = useStored("learncraft_science_division_v1", divisionSchema);
  const kind = state.kind as DivisionKind;
  return (
    <ToolLayout aside={<>
      <Card title="분열">
        <Segmented label="분열" value={kind} onChange={value => update({ kind: value })} options={[{ value: "mitosis", label: "체세포 분열" }, { value: "meiosis", label: "감수 분열" }]} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">체세포 염색체 수</p>
        <Segmented label="염색체 수" value={state.n} onChange={n => update({ n })} options={[1, 2, 3, 4].map(n => ({ value: n, label: `2n = ${2 * n}` }))} />
        <p className="mt-2 text-[.74rem] text-ink-4">빨강·파랑은 어머니·아버지에게서 받은 상동 염색체예요. X자 모양은 복제된 염색체(염색 분체 2개)입니다.</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[]} placeholder="학습지 제목 (예: 세포 분열)">
        <MultiChips options={meiosisAsks} value={state.asks} onChange={asks => update({ asks: asks as MeiosisAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAGES[kind].map((stage, index) => <div key={stage.name} className="text-center"><SvgView label={stage.name} svg={stageCell(kind, index, state.n)} className="mx-auto w-[130px]" /><p className="text-[.78rem] font-bold">{stage.name}</p><p className="text-[.72rem] text-ink-4">{stage.ploidy} · 염색체 {stage.chromosomes(state.n)}개</p></div>)}
        </div>
        <div className="grid gap-3 xl:grid-cols-2 xl:items-center">
          <SvgView label="DNA 상대량 그래프" svg={dnaGraphSvg(kind)} />
          <HtmlView html={stageTableHtml(kind, state.n)} />
        </div>
        {kind === "meiosis" && <p className="text-[.78rem]">생식세포의 염색체 조합: 2<sup>{state.n}</sup> = <b>{2 ** state.n}가지</b> (교차가 없을 때)</p>}
      </section>
      <ProblemSheet id="life-division-print" sections={meiosisProblems(state.asks, state.sheet.seed)} options={{ title: state.sheet.title || "세포 분열", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 흥분 전도 ───── */
const neuronSchema = z.object({
  curve: z.array(z.tuple([z.number().min(0).max(20), z.number().min(-120).max(80)])).min(3).max(10).catch(DEFAULT_CURVE),
  speed: z.number().positive().max(100).catch(2), time: z.number().min(0).max(50).catch(4),
  points: z.array(z.object({ name: z.string().max(4), distance: z.number().min(0).max(100) })).max(5).catch([{ name: "Ⅰ", distance: 2 }, { name: "Ⅱ", distance: 4 }, { name: "Ⅲ", distance: 6 }]),
  asks: asksSchema(neuronAsks, ["potential", "speed", "phase"]), sheet: sheetSchema(2),
});
export function NeuronView() {
  const [state, update] = useStored("learncraft_science_neuron_v1", neuronSchema);
  const curve = state.curve as [number, number][];
  const nerve = { speed: state.speed, points: state.points };
  const values = nervePotentials(nerve, state.time, curve);
  return (
    <ToolLayout aside={<>
      <Card title="막전위 변화(도달 뒤)" help="흥분이 도달한 뒤 경과 시간에 따른 막전위 점입니다. 교과서·문제에 맞게 고칠 수 있어요." action={<Button variant="ghost" size="sm" onClick={() => update({ curve: DEFAULT_CURVE })}><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="grid grid-cols-2 gap-1.5">
          {curve.map(([t, v], index) => (
            <div key={index} className="grid grid-cols-2 gap-1">
              <NumberField label={index === 0 ? "시간(ms)" : ""} value={t} min={0} max={20} step={0.5} onChange={value => update({ curve: curve.map((point, at) => at === index ? [value, point[1]] : point) })} />
              <NumberField label={index === 0 ? "mV" : ""} value={v} min={-120} max={80} onChange={value => update({ curve: curve.map((point, at) => at === index ? [point[0], value] : point) })} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="흥분의 전도">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="전도 속도" unit="cm/ms" value={state.speed} min={0.1} max={100} onChange={speed => update({ speed })} />
          <NumberField label="자극 후 시간" unit="ms" value={state.time} min={0} max={50} step={0.5} onChange={time => update({ time })} />
        </div>
        <div className="mt-2 space-y-1.5">
          {state.points.map((point, index) => (
            <div key={index} className="grid grid-cols-[3.5rem_1fr_auto] items-end gap-1.5">
              <input value={point.name} maxLength={4} aria-label="지점 이름" onChange={event => update({ points: state.points.map((item, at) => at === index ? { ...item, name: event.target.value } : item) })} className={`${fieldClass} py-1 text-center`} />
              <NumberField label="" unit="cm" value={point.distance} min={0} max={100} onChange={distance => update({ points: state.points.map((item, at) => at === index ? { ...item, distance } : item) })} />
              <Button variant="ghost" size="icon" className="size-9" onClick={() => update({ points: state.points.filter((_, at) => at !== index) })} aria-label={`${point.name} 지우기`}><Trash2 size={14} /></Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" disabled={state.points.length >= 5} onClick={() => update({ points: [...state.points, { name: "Ⅳ", distance: 8 }] })}><Plus size={14} /> 지점 더하기</Button>
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 흥분의 전도)">
        <MultiChips options={neuronAsks} value={state.asks} onChange={asks => update({ asks: asks as NeuronAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="grid gap-3 xl:grid-cols-2 xl:items-center">
          <SvgView label="막전위 변화" svg={actionPotentialSvg(curve)} />
          <div className="space-y-2">
            <SvgView label="신경" svg={nerveSvg(nerve)} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{values.map(value => <Stat key={value.name} label={`${value.name} (${num(value.distance)} cm)`} value={`${num(value.potential, 1)} mV`} note={value.elapsed < 0 ? "아직 도달 안 함" : `도달 뒤 ${num(value.elapsed, 2)} ms`} />)}</div>
          </div>
        </div>
        <p className="text-[.74rem] text-ink-4">자극 뒤 {num(state.time)} ms에서 자극점으로부터 d cm 떨어진 곳은 흥분이 도달한 뒤 ({num(state.time)} − d ÷ {num(state.speed)}) ms가 지났어요.</p>
      </section>
      <ProblemSheet id="life-neuron-print" sections={neuronProblems(state.asks, state.sheet.count, state.sheet.seed, curve)} options={{ title: state.sheet.title || "흥분의 발생과 전도", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 군집·개체군 ───── */
const ecologySchema = z.object({
  survey: z.object({ quadratCount: z.number().int().min(1).max(100), quadratArea: z.number().positive().max(100), species: z.array(z.object({ name: z.string().max(20), individuals: z.number().min(0).max(100000), quadrats: z.number().int().min(0).max(100), cover: z.number().min(0).max(10000) })).max(8) }).catch(DEFAULT_SURVEY),
  capacity: z.number().positive().max(100000).catch(500), growthRate: z.number().positive().max(5).catch(0.5), useCustom: z.boolean().catch(true),
  asks: asksSchema(ecologyAsks, ["survey", "dominant", "growth"]), sheet: sheetSchema(1),
});
export function EcologyView() {
  const [state, update] = useStored("learncraft_science_ecology_v1", ecologySchema);
  const survey = state.survey as Survey;
  const result = surveyResult(survey);
  const setSpecies = (index: number, patch: Partial<Survey["species"][number]>) => update({ survey: { ...survey, species: survey.species.map((item, at) => at === index ? { ...item, ...patch } : item) } });
  return (
    <ToolLayout aside={<>
      <Card title="방형구 조사" action={<Button variant="ghost" size="sm" onClick={() => update({ survey: DEFAULT_SURVEY })}><RotateCcw size={14} /> 예시</Button>}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="방형구 수" value={survey.quadratCount} min={1} max={100} onChange={quadratCount => update({ survey: { ...survey, quadratCount } })} />
          <NumberField label="방형구 하나 면적" unit="m²" value={survey.quadratArea} min={0.01} max={100} onChange={quadratArea => update({ survey: { ...survey, quadratArea } })} />
        </div>
        <div className="mt-2 space-y-1.5">
          {survey.species.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_3.4rem_3.4rem_3.4rem_auto] items-end gap-1">
              <input value={item.name} maxLength={20} aria-label="종 이름" onChange={event => setSpecies(index, { name: event.target.value })} className={`${fieldClass} px-2 py-1 text-[.8rem]`} />
              <NumberField label={index === 0 ? "개체" : ""} value={item.individuals} min={0} max={100000} onChange={individuals => setSpecies(index, { individuals })} />
              <NumberField label={index === 0 ? "방형구" : ""} value={item.quadrats} min={0} max={survey.quadratCount} onChange={quadrats => setSpecies(index, { quadrats })} />
              <NumberField label={index === 0 ? "면적" : ""} value={item.cover} min={0} max={10000} step={0.1} onChange={cover => setSpecies(index, { cover })} />
              <Button variant="ghost" size="icon" className="size-9" onClick={() => update({ survey: { ...survey, species: survey.species.filter((_, at) => at !== index) } })} aria-label={`${item.name} 지우기`}><Trash2 size={14} /></Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" disabled={survey.species.length >= 8} onClick={() => update({ survey: { ...survey, species: [...survey.species, { name: "새 종", individuals: 10, quadrats: 2, cover: 0.5 }] } })}><Plus size={14} /> 종 더하기</Button>
        </div>
      </Card>
      <Card title="개체군 생장">
        <Range label="환경 수용력 K" value={state.capacity} min={100} max={2000} step={50} onChange={capacity => update({ capacity })} />
        <Range label="생장률 r" value={state.growthRate} min={0.1} max={1.5} step={0.05} onChange={growthRate => update({ growthRate })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 군집 조사)">
        <MultiChips options={ecologyAsks} value={state.asks} onChange={asks => update({ asks: asks as EcologyAsk[] })} />
        <Toggle label="지금 조사 자료를 1번 문제로" checked={state.useCustom} onChange={useCustom => update({ useCustom })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <HtmlView html={surveyTableHtml(survey)} />
        {result.rows.length > 0 && <p className="text-[.86rem]">우점종: <b>{result.dominant.name}</b> (중요치 {num(result.dominant.importance, 1)})</p>}
        <p className="text-[.74rem] text-ink-4">밀도 = 개체 수 ÷ 전체 면적, 빈도 = 출현한 방형구 수 ÷ 전체 방형구 수, 피도 = 점유 면적 ÷ 전체 면적. 중요치 = 상대 밀도 + 상대 빈도 + 상대 피도.</p>
        <SvgView label="개체군 생장 곡선" svg={growthSvg({ initial: state.capacity / 50, rate: state.growthRate, capacity: state.capacity, span: 12 / state.growthRate })} className="max-w-xl" />
      </section>
      <ProblemSheet id="life-ecology-print" sections={ecologyProblems(state.asks, state.sheet.count, state.sheet.seed, state.useCustom ? survey : null)} options={{ title: state.sheet.title || "군집과 개체군", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 효소 ───── */
const inhibitorKeys = Object.keys(inhibitors) as Inhibitor[];
const enzymeSchema = z.object({
  shown: z.array(z.enum(inhibitorKeys as [Inhibitor, ...Inhibitor[]])).catch(["none", "competitive", "noncompetitive"]), optimum: z.number().min(10).max(70).catch(37),
  asks: asksSchema(enzymeAsks, ["substrate", "inhibitor", "temperature", "ph"]), sheet: sheetSchema(1),
});
export function EnzymeView() {
  const [state, update] = useStored("learncraft_science_enzyme_v1", enzymeSchema);
  return (
    <ToolLayout aside={<>
      <Card title="그래프">
        <MultiChips options={inhibitors} value={state.shown} onChange={shown => update({ shown })} />
        <Range label="최적 온도" value={state.optimum} min={20} max={70} onChange={optimum => update({ optimum })} suffix=" ℃" />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[]} placeholder="학습지 제목 (예: 효소의 작용)">
        <MultiChips options={enzymeAsks} value={state.asks} onChange={asks => update({ asks: asks as EnzymeAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div><p className="mb-1 text-xs font-bold text-ink-3">기질 농도와 반응 속도</p><SvgView label="기질 농도" svg={substrateSvg(1, 1, state.shown.length ? state.shown : ["none"])} /></div>
        <div><p className="mb-1 text-xs font-bold text-ink-3">온도와 반응 속도</p><SvgView label="온도" svg={temperatureSvg(state.optimum)} /></div>
        <div><p className="mb-1 text-xs font-bold text-ink-3">pH와 반응 속도</p><SvgView label="pH" svg={phSvg()} /></div>
        <ul className="space-y-1.5 self-center text-[.8rem] leading-5 text-ink-3">
          <li><b className="text-ink">경쟁적 저해제</b>: 기질과 활성 부위를 두고 경쟁 → 기질을 많이 넣으면 Vmax에 가까워짐(Km 커짐)</li>
          <li><b className="text-ink">비경쟁적 저해제</b>: 활성 부위가 아닌 곳에 붙어 효소 모양을 바꿈 → Vmax 자체가 낮아짐</li>
          <li><b className="text-ink">최적 pH</b>: {PH_ENZYMES.map(enzyme => `${enzyme.name} ${enzyme.optimum}`).join(", ")}</li>
        </ul>
      </section>
      <ProblemSheet id="life-enzyme-print" sections={enzymeProblems(state.asks, state.sheet.seed)} options={{ title: state.sheet.title || "효소", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 세포 호흡·광합성 ───── */
const diagramKeys = Object.keys(DIAGRAMS) as DiagramKind[];
const metabolismSchema = z.object({
  kind: z.enum(diagramKeys as [DiagramKind, ...DiagramKind[]]).catch("respiration"),
  blanks: z.object({ respiration: z.array(z.string()).max(10).catch(["glycolysis", "pyruvate", "acetyl", "citrate", "oaa"]), photosynthesis: z.array(z.string()).max(10).catch(["products", "rubp", "pga", "g3p"]) }).catch({ respiration: ["glycolysis", "pyruvate", "acetyl", "citrate", "oaa"], photosynthesis: ["products", "rubp", "pga", "g3p"] }),
  include: z.array(z.enum(diagramKeys as [DiagramKind, ...DiagramKind[]])).catch(["respiration", "photosynthesis"]), table: z.boolean().catch(true), sheet: sheetSchema(1),
});
export function MetabolismView() {
  const [state, update] = useStored("learncraft_science_metabolism_v1", metabolismSchema);
  const blanks = state.blanks[state.kind];
  const toggle = (id: string) => update({ blanks: { ...state.blanks, [state.kind]: blanks.includes(id) ? blanks.filter(item => item !== id) : [...blanks, id].slice(0, 10) } });
  return (
    <ToolLayout aside={<>
      <Card title="도식">
        <Segmented label="도식" value={state.kind} onChange={kind => update({ kind })} options={diagramKeys.map(key => ({ value: key, label: DIAGRAMS[key].name }))} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">빈칸으로 만들 칸 ({blanks.length}개, 10개까지)</p>
        <div className="flex flex-wrap gap-1">{blankableLabels(state.kind).map(label => <button key={label.id} type="button" aria-pressed={blanks.includes(label.id)} onClick={() => toggle(label.id)} className={chipClass(blanks.includes(label.id))}>{label.text}</button>)}</div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[]} placeholder="학습지 제목 (예: 세포 호흡과 광합성)">
        <p className="mb-1 text-xs font-semibold text-ink-4">학습지에 넣을 도식</p>
        <MultiChips options={{ respiration: "세포 호흡", photosynthesis: "광합성" }} value={state.include} onChange={include => update({ include })} />
        <Toggle label="세포 호흡 생성량 표" checked={state.table} onChange={table => update({ table })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <SvgView label={`${DIAGRAMS[state.kind].name} 도식`} svg={diagramSvg(state.kind)} />
        {state.kind === "respiration" && <HtmlView html={respirationTableHtml()} className="max-w-2xl" />}
        {state.kind === "photosynthesis" && <p className="text-[.78rem] text-ink-4">CO₂ 6분자를 고정해 포도당 1분자를 만들 때 캘빈 회로에서 ATP 18분자, NADPH 12분자를 써요.</p>}
      </section>
      <ProblemSheet id="life-metabolism-print" sections={metabolismSheet(state.include, state.blanks, state.table)} options={{ title: state.sheet.title || "세포 호흡과 광합성", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

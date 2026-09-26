"use client";

import { z } from "zod";
import { BarChart3, ClipboardList, Plus, Ruler, Trash2, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clipboardWrap, sheetHead } from "@/features/language-sheet";
import { dataGraphSvg, dataPresets, dataTableHtml, fitText, linearFit, reportHtml, SERIES_COLORS, seriesPoints, type DataSet, type ReportKind } from "@/features/science/datagraph";
import { num } from "@/features/science/sheet";
import { bitsTable, signalAsks, signalProblems, signalSvg, type SignalAsk } from "@/features/science/signal";
import { cleanNumber, convert, CONVERSIONS, DERIVED, siTableHtml, unitAsks, unitProblems, type ConversionKind, type UnitAsk } from "@/features/science/units";
import { Card, Range, Segmented, Toggle } from "./tool-panel";
import { chipClass, fieldClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";

export function ScienceIntegratedLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="integrated" subject="통합·탐구" title="탐구 데이터 · 보고서 · 단위 · 신호" tabs={tabs}
      description="통합과학과 과학탐구실험에서 함께 쓰는 도구입니다. 측정값으로 그래프와 추세선을 그리고, 실험 계획서·탐구 보고서 양식과 단위·유효숫자, 디지털 신호 학습지를 만듭니다."
      views={[
        { value: "data", label: "데이터 그래프", icon: BarChart3, note: "측정값 표를 넣으면 그래프와 추세선(최소 제곱법)을 그려요. 그래프 그리기 활동지(빈 격자)도 만들 수 있어요.", render: () => <DataView /> },
        { value: "report", label: "탐구 보고서 양식", icon: ClipboardList, note: "실험 계획서·탐구 보고서 양식을 만들어요. 채운 칸은 그대로 인쇄되고 비운 칸은 학생이 쓰는 칸이 돼요.", render: () => <ReportView /> },
        { value: "units", label: "단위·유효숫자", icon: Ruler, note: "SI 기본량·접두어 표와 단위 환산, 유효숫자, 과학적 표기 문제를 만들어요.", render: () => <UnitsView /> },
        { value: "signal", label: "디지털 신호", icon: Waves, note: "아날로그 신호를 표본화·양자화·부호화하는 과정을 그림으로 보여 주고 데이터 크기 문제를 만들어요.", render: () => <SignalView /> },
      ]} />
  );
}

/* ───── 데이터 그래프 ───── */
const columnSchema = z.object({ name: z.string().max(30), unit: z.string().max(15) });
const dataSchema = z.object({
  data: z.object({ x: columnSchema, ys: z.array(columnSchema).min(1).max(3), rows: z.array(z.array(z.number().nullable())).max(30) }).catch(dataPresets[0].data),
  kind: z.enum(["scatter", "line"]).catch("scatter"),
  fit: z.enum(["none", "linear", "origin"]).catch("linear"),
  title: z.string().max(100).catch(""),
  sheet: z.enum(["graph", "draw"]).catch("graph"),
});

function DataView() {
  const [state, update] = useStored("learncraft_science_datagraph_v1", dataSchema);
  const data = state.data as DataSet;
  const setData = (patch: Partial<DataSet>) => update({ data: { ...data, ...patch } });
  const setCell = (row: number, column: number, value: string) => {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && !Number.isFinite(parsed)) return;
    setData({ rows: data.rows.map((cells, at) => at === row ? cells.map((cell, index) => index === column ? parsed : cell) : cells) });
  };
  const graph = dataGraphSvg(data, { kind: state.kind, fit: state.fit });
  const fits = data.ys.map((_, index) => state.fit === "none" ? null : linearFit(seriesPoints(data, index), state.fit === "origin"));
  const title = state.title || (state.sheet === "draw" ? "그래프 그리기" : "탐구 결과 그래프");
  const sheetGraph = dataGraphSvg(data, { kind: state.kind, fit: state.sheet === "draw" ? "none" : state.fit, blank: state.sheet === "draw", width: 600, height: 380 });
  const sheet = sheetGraph ? clipboardWrap(sheetHead(title) + `<p style="margin:0 0 2mm">${state.sheet === "draw" ? "다음 측정 결과를 그래프로 나타내고, 두 양의 관계를 쓰시오." : "측정 결과와 그래프"}</p>` + dataTableHtml(data) + `<div style="margin:3mm 0">${sheetGraph}</div>`
    + (state.sheet === "draw" ? `<p style="margin:2mm 0">두 양의 관계:</p><div style="height:22mm;border-bottom:1px solid #999"></div>` : fits.some(Boolean) ? `<p style="margin:2mm 0;font-size:10pt">${data.ys.map((column, index) => fits[index] ? `${column.name}: ${fitText(fits[index]!)} (R² = ${num(fits[index]!.r2, 3)})` : "").filter(Boolean).join(" · ")}</p>` : ""), "screen") : null;
  return (
    <ToolLayout aside={<>
      <Card title="자료 예시">
        <div className="grid gap-1">{dataPresets.map(preset => <button key={preset.name} type="button" onClick={() => update({ data: preset.data })} className={chipClass(false)}>{preset.name}</button>)}</div>
      </Card>
      <Card title="그래프">
        <Segmented label="그래프 종류" value={state.kind} onChange={kind => update({ kind })} options={[{ value: "scatter", label: "점만(산점도)" }, { value: "line", label: "꺾은선" }]} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">추세선</p>
        <Segmented label="추세선" value={state.fit} onChange={fit => update({ fit })} options={[{ value: "none", label: "없음" }, { value: "linear", label: "직선" }, { value: "origin", label: "원점 지나는 직선" }]} />
      </Card>
      <Card title="학습지">
        <Segmented label="학습지 종류" value={state.sheet} onChange={sheet => update({ sheet })} options={[{ value: "graph", label: "결과 그래프" }, { value: "draw", label: "그래프 그리기(빈 격자)" }]} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="학습지 제목" className={`${fieldClass} mt-3`} />
      </Card>
    </>}>
      <section className={panelClass}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-ink">측정값</h2>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" disabled={data.ys.length >= 3} onClick={() => setData({ ys: [...data.ys, { name: `측정값 ${data.ys.length + 1}`, unit: data.ys[0]?.unit ?? "" }], rows: data.rows.map(row => [...row, null]) })}><Plus size={14} /> 계열 더하기</Button>
            <Button variant="ghost" size="sm" disabled={data.rows.length >= 30} onClick={() => setData({ rows: [...data.rows, Array(data.ys.length + 1).fill(null)] })}><Plus size={14} /> 행 더하기</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-[.8rem]">
            <thead>
              <tr>
                {[data.x, ...data.ys].map((column, index) => (
                  <th key={index} className="px-1 pb-1 align-bottom">
                    <div className="flex items-center gap-1">
                      {index > 0 && <span className="size-2.5 shrink-0 rounded-full" style={{ background: SERIES_COLORS[index - 1] }} />}
                      <input value={column.name} maxLength={30} aria-label="변인 이름" onChange={event => index === 0 ? setData({ x: { ...data.x, name: event.target.value } }) : setData({ ys: data.ys.map((item, at) => at === index - 1 ? { ...item, name: event.target.value } : item) })} className={`${fieldClass} w-32 py-1 text-[.78rem] font-bold`} />
                      {index > 0 && data.ys.length > 1 && <button type="button" aria-label={`${column.name} 계열 지우기`} onClick={() => setData({ ys: data.ys.filter((_, at) => at !== index - 1), rows: data.rows.map(row => row.filter((_, at) => at !== index)) })} className="text-ink-4 hover:text-danger"><Trash2 size={13} /></button>}
                    </div>
                    <input value={column.unit} maxLength={15} aria-label="단위" placeholder="단위" onChange={event => index === 0 ? setData({ x: { ...data.x, unit: event.target.value } }) : setData({ ys: data.ys.map((item, at) => at === index - 1 ? { ...item, unit: event.target.value } : item) })} className={`${fieldClass} mt-1 w-32 py-1 text-[.74rem]`} />
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, column) => <td key={`${column}-${cell}`} className="px-1 py-0.5"><input inputMode="decimal" defaultValue={cell ?? ""} aria-label={`${rowIndex + 1}행 ${column + 1}열`} onBlur={event => setCell(rowIndex, column, event.target.value)} className={`${fieldClass} w-32 py-1 text-[.8rem]`} /></td>)}
                  <td><button type="button" aria-label={`${rowIndex + 1}행 지우기`} onClick={() => setData({ rows: data.rows.filter((_, at) => at !== rowIndex) })} className="px-1 text-ink-4 hover:text-danger"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[.72rem] text-ink-4">칸에서 나가면 그래프에 반영돼요. 비운 칸은 그래프에서 빼요.</p>
      </section>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-center`}>
        {graph ? <SvgView label="데이터 그래프" svg={graph} /> : <p className="text-sm text-ink-3">측정값을 두 개 이상 넣어 주세요.</p>}
        <div className="space-y-2">
          {data.ys.map((column, index) => fits[index] && (
            <div key={index} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem]">
              <p className="font-bold" style={{ color: SERIES_COLORS[index] }}>{column.name}</p>
              <p>{fitText(fits[index]!)}</p>
              <p className="text-ink-4">기울기 {num(fits[index]!.slope, 4)} {column.unit && data.x.unit ? `${column.unit}/${data.x.unit}` : ""} · R² = {num(fits[index]!.r2, 4)}</p>
            </div>
          ))}
          <p className="text-[.72rem] leading-5 text-ink-4">R²가 1에 가까울수록 점들이 직선에 가까워요. 비례 관계면 ‘원점 지나는 직선’을 골라 보세요.</p>
        </div>
      </section>
      <SheetPreview id="integrated-data-print" html={sheet} empty="측정값을 두 개 이상 넣어 주세요." />
    </ToolLayout>
  );
}

/* ───── 탐구 보고서 양식 ───── */
const reportSchema = z.object({
  kind: z.enum(["plan", "report"]).catch("report"), title: z.string().max(100).catch(""),
  question: z.string().max(500).catch(""), hypothesis: z.string().max(500).catch(""),
  independent: z.string().max(200).catch(""), dependent: z.string().max(200).catch(""), controlled: z.string().max(300).catch(""),
  materials: z.string().max(500).catch(""), steps: z.string().max(1500).catch(""), safety: z.string().max(500).catch(""),
  trials: z.number().int().min(1).max(5).catch(3), rows: z.number().int().min(3).max(12).catch(5), useData: z.boolean().catch(false),
});
const REPORT_EXAMPLE = {
  title: "용수철의 늘어난 길이와 힘의 관계", question: "용수철에 매단 추의 무게와 용수철이 늘어난 길이 사이에는 어떤 관계가 있을까?",
  hypothesis: "추의 무게가 커질수록 용수철이 늘어난 길이는 비례하여 커질 것이다.",
  independent: "추의 무게", dependent: "용수철이 늘어난 길이", controlled: "같은 용수철, 추를 매다는 방법, 길이를 재는 위치",
  materials: "용수철, 스탠드, 추(50 g × 6개), 자, 모눈종이", steps: "1. 스탠드에 용수철을 매달고 처음 길이를 잰다.\n2. 추를 하나씩 더 매달며 용수철의 길이를 잰다.\n3. 같은 과정을 3번 반복하여 평균을 구한다.",
  safety: "추가 떨어지지 않게 조심하고, 용수철을 지나치게 늘이지 않는다.",
};

function ReportView() {
  const [state, update] = useStored("learncraft_science_report_v1", reportSchema);
  const [graphState] = useStored("learncraft_science_datagraph_v1", dataSchema);
  const data = state.useData ? graphState.data as DataSet : null;
  const graph = data ? dataGraphSvg(data, { kind: graphState.kind, fit: "none", blank: true, width: 560, height: 300 }) : null;
  const field = (key: "question" | "hypothesis" | "independent" | "dependent" | "controlled" | "materials" | "safety", label: string, rows = 2) => (
    <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">{label}</span><textarea rows={rows} value={state[key]} maxLength={500} onChange={event => update({ [key]: event.target.value })} placeholder="비우면 학생이 쓰는 칸" className={`${fieldClass} text-[.82rem]`} /></label>
  );
  return (
    <ToolLayout aside={<>
      <Card title="양식" action={<Button variant="ghost" size="sm" onClick={() => update(REPORT_EXAMPLE)}>예시 채우기</Button>}>
        <Segmented label="양식 종류" value={state.kind} onChange={kind => update({ kind: kind as ReportKind })} options={[{ value: "plan", label: "실험 계획서" }, { value: "report", label: "탐구 보고서" }]} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="탐구 제목" className={`${fieldClass} mt-3`} />
        <div className="mt-3 space-y-2">
          {field("question", "탐구 문제")}
          {field("hypothesis", "가설")}
          <div className="grid grid-cols-2 gap-2">{field("independent", "조작 변인", 1)}{field("dependent", "종속 변인", 1)}</div>
          {field("controlled", "통제 변인", 1)}
          {field("materials", "준비물")}
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">탐구 과정</span><textarea rows={4} value={state.steps} maxLength={1500} onChange={event => update({ steps: event.target.value })} placeholder="비우면 학생이 쓰는 칸" className={`${fieldClass} text-[.82rem]`} /></label>
          {state.kind === "plan" && field("safety", "안전 수칙")}
        </div>
      </Card>
      {state.kind === "report" && (
        <Card title="결과 칸">
          <Toggle label="데이터 그래프 탭의 표 쓰기" checked={state.useData} onChange={useData => update({ useData })} help="데이터 그래프 탭에 넣은 변인과 조작 변인 값으로 결과 표를 만들고, 그래프 칸에 축을 그려 둡니다." />
          {!state.useData && <>
            <Range label="반복 횟수" value={state.trials} min={1} max={5} onChange={trials => update({ trials })} suffix="회" />
            <Range label="측정 행 수" value={state.rows} min={3} max={12} onChange={rows => update({ rows })} suffix="행" />
          </>}
        </Card>
      )}
    </>}>
      <SheetPreview id="integrated-report-print" html={reportHtml(state, data, graph, "screen")} clipboard={() => ({ text: `${state.title || "탐구 보고서"}\n(양식은 인쇄본 참고)`, html: reportHtml(state, data, null, "clipboard") })} />
    </ToolLayout>
  );
}

/* ───── 단위·유효숫자 ───── */
const conversionKinds = Object.keys(CONVERSIONS) as ConversionKind[];
const unitsSchema = z.object({
  kind: z.enum(conversionKinds as [ConversionKind, ...ConversionKind[]]).catch("length"),
  value: z.number().catch(1), from: z.string().catch("km"), to: z.string().catch("m"),
  asks: z.array(z.enum(Object.keys(unitAsks) as [UnitAsk, ...UnitAsk[]])).catch(["convert", "sigCount", "sigCalc"]),
  kinds: z.array(z.enum(conversionKinds as [ConversionKind, ...ConversionKind[]])).catch(["length", "mass", "speed"]),
  table: z.boolean().catch(true),
  sheet: sheetSchema(4),
});

function UnitsView() {
  const [state, update] = useStored("learncraft_science_units_v1", unitsSchema);
  const units = CONVERSIONS[state.kind].units;
  const from = units.some(item => item.unit === state.from) ? state.from : units[0].unit;
  const to = units.some(item => item.unit === state.to) ? state.to : units[1].unit;
  const sections = unitProblems(state.asks, state.sheet.count, state.sheet.seed, state.kinds);
  if (state.table) sections.unshift({ heading: "SI 기본량과 접두어", problems: [], intro: { html: siTableHtml(), text: "(SI 기본량과 접두어 표는 인쇄본 참고)" } });
  return (
    <ToolLayout aside={<>
      <Card title="단위 바꾸기">
        <div className="grid grid-cols-4 gap-1">{conversionKinds.map(kind => <button key={kind} type="button" onClick={() => update({ kind, from: CONVERSIONS[kind].units[0].unit, to: CONVERSIONS[kind].units[1].unit })} className={`${chipClass(state.kind === kind)} text-center`}>{CONVERSIONS[kind].name}</button>)}</div>
        <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
          <NumberField label="값" value={state.value} onChange={value => update({ value })} />
          <select aria-label="처음 단위" value={from} onChange={event => update({ from: event.target.value })} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-sm">{units.map(item => <option key={item.unit}>{item.unit}</option>)}</select>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-ink-4">=</span><b className="text-[1.05rem]">{cleanNumber(convert(state.value, state.kind, from, to))}</b>
          <select aria-label="바꿀 단위" value={to} onChange={event => update({ to: event.target.value })} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-sm">{units.map(item => <option key={item.unit}>{item.unit}</option>)}</select>
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[3, 4, 6, 8]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 단위와 유효숫자)">
        <MultiChips options={unitAsks} value={state.asks} onChange={asks => update({ asks })} />
        {state.asks.includes("convert") && <><p className="mb-1 mt-3 text-xs font-semibold text-ink-4">환산할 양</p><MultiChips options={Object.fromEntries(conversionKinds.map(kind => [kind, CONVERSIONS[kind].name])) as Record<ConversionKind, string>} value={state.kinds} onChange={kinds => update({ kinds })} /></>}
        <Toggle label="SI 기본량·접두어 표 붙이기" checked={state.table} onChange={table => update({ table })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <HtmlView html={siTableHtml()} />
        <div>
          <h3 className="mb-1 text-xs font-bold text-ink-3">자주 쓰는 유도량</h3>
          <table className="w-full border-collapse text-[.8rem]"><tbody>{DERIVED.map(item => <tr key={item.quantity} className="border-t border-line"><td className="px-2 py-1 text-ink-3">{item.quantity}</td><td className="px-2 py-1 font-semibold">{item.unit}</td><td className="px-2 py-1 text-ink-4">{item.base}</td></tr>)}</tbody></table>
          <ul className="mt-3 space-y-1 text-[.76rem] leading-5 text-ink-4">
            <li>유효숫자: 0이 아닌 숫자, 그 사이의 0, 소수점 아래 끝의 0은 셉니다. 앞의 0은 세지 않아요.</li>
            <li>곱셈·나눗셈은 유효숫자가 가장 적은 값에, 덧셈·뺄셈은 소수점 아래 자리가 가장 적은 값에 맞춥니다.</li>
          </ul>
        </div>
      </section>
      <ProblemSheet id="integrated-units-print" sections={sections} options={{ title: state.sheet.title || "단위와 유효숫자", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 디지털 신호 ───── */
const signalSchema = z.object({
  samples: z.number().int().min(4).max(32).catch(12), bits: z.number().int().min(1).max(6).catch(3), wave: z.enum(["sine", "mixed"]).catch("sine"),
  asks: z.array(z.enum(Object.keys(signalAsks) as [SignalAsk, ...SignalAsk[]])).catch(["levels", "size", "quantize"]),
  sheet: sheetSchema(2),
});

function SignalView() {
  const [state, update] = useStored("learncraft_science_signal_v1", signalSchema);
  return (
    <ToolLayout aside={<>
      <Card title="표본화·양자화">
        <Segmented label="신호 모양" value={state.wave} onChange={wave => update({ wave })} options={[{ value: "sine", label: "사인파" }, { value: "mixed", label: "복잡한 파형" }]} />
        <div className="mt-3 space-y-2">
          <Range label="표본 수(표본화 주파수)" value={state.samples} min={4} max={32} onChange={samples => update({ samples })} suffix="개" />
          <Range label="양자화 비트 수" value={state.bits} min={1} max={6} onChange={bits => update({ bits })} suffix="비트" />
        </div>
        <p className="mt-2 text-[.74rem] text-ink-4">{bitsTable(state.bits)}</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 신호와 정보)">
        <MultiChips options={signalAsks} value={state.asks} onChange={asks => update({ asks })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        <SvgView label="아날로그 신호의 디지털 변환" svg={signalSvg(state)} />
        <div className="mt-3 grid grid-cols-3 gap-2"><Stat label="양자화 단계" value={`${2 ** state.bits}단계`} /><Stat label="표본 하나" value={`${state.bits}비트`} /><Stat label="이 신호 전체" value={`${state.samples * state.bits}비트`} /></div>
        <p className="mt-2 text-[.74rem] leading-5 text-ink-4">표본 수와 비트 수를 늘리면 원래 신호에 더 가까워지지만 데이터 크기도 커져요.</p>
      </section>
      <ProblemSheet id="integrated-signal-print" sections={signalProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "신호와 정보", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

"use client";

import { z } from "zod";
import { Columns3, GanttChart, Plus, RotateCcw, ScrollText, Trash2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { dynastyAsks, dynastyProblems, dynastySvg, dynastyTableHtml, PRESENT, ROWS, yearText, type DynastyAsk, type RowKey } from "@/features/social/dynasties";
import { EVENT_SETS, eventSetByKey, timelineAsks, timelineProblems, timelineSvg, type HistoryEvent, type TimelineAsk } from "@/features/social/timeline";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { SOCIAL_AREA } from "./social-lab-shared";
import { ConstitutionView, SourceView } from "./social-history-views";

export function SocialHistoryLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="history" area={SOCIAL_AREA} subject="역사" title="역사 · 한국사·세계사·동아시아 도구" tabs={tabs}
      description="한국사·세계사·동아시아 역사 기행 수업에 쓰는 연표와 동시대 비교표, 개헌 흐름, 사료 탐구 학습지를 만듭니다. 문제는 자료에서 바로 만들고 정답과 함께 인쇄합니다."
      views={[
        { value: "timeline", label: "연표·순서 문제", icon: GanttChart, note: "사건 모음을 고르고 고쳐 연표를 그리고, 빈칸 연표·순서 나열·‘(가)와 (나) 사이’ 문제를 만들어요.", render: () => <TimelineView /> },
        { value: "dynasty", label: "동시대 비교", icon: Columns3, note: "한국·중국·일본·서양·서아시아·인도의 왕조와 시대를 나란히 놓고 같은 시기를 비교해요.", render: () => <DynastyView /> },
        { value: "constitution", label: "개헌 흐름", icon: Landmark, note: "제헌 헌법(1948)부터 9차 개헌(1987)까지 대통령 선출 방법과 임기의 변화를 표·흐름도·문제로 봐요.", render: () => <ConstitutionView /> },
        { value: "source", label: "사료 탐구", icon: ScrollText, note: "사료 본문을 넣고 [낱말]로 빈칸을 만든 뒤, 탐구 질문을 골라 사료 탐구 학습지를 만들어요.", render: () => <SourceView /> },
      ]} />
  );
}

/* ───── 연표·순서 문제 ───── */
const setKeys = EVENT_SETS.map(set => set.key) as [string, ...string[]];
const defaultSet = EVENT_SETS[1];
const timelineSchema = z.object({
  set: z.enum(setKeys).catch(defaultSet.key),
  events: z.array(z.object({ name: z.string().max(60), year: z.number().int().min(-5000).max(2100) })).max(40).catch(defaultSet.events),
  scale: z.enum(["even", "linear"]).catch("even"),
  band: z.boolean().catch(true),
  asks: asksSchema(timelineAsks, ["blankYear", "order", "between"]),
  sheet: sheetSchema(2),
});
const sameEvents = (a: HistoryEvent[], b: HistoryEvent[]) => a.length === b.length && a.every((event, index) => event.name === b[index].name && event.year === b[index].year);

function TimelineView() {
  const [state, update] = useStored("learncraft_social_timeline_v1", timelineSchema);
  const [confirm, confirmDialog] = useConfirm();
  const preset = eventSetByKey(state.set) ?? defaultSet;
  const band = state.band ? preset.band : null;
  const setEvent = (index: number, patch: Partial<HistoryEvent>) => update({ events: state.events.map((event, at) => at === index ? { ...event, ...patch } : event) });
  async function loadSet(key: string, message: string) {
    const next = eventSetByKey(key);
    if (!next) return;
    if (!sameEvents(state.events, preset.events) && !await confirm({
      title: "사건 목록을 바꿀까요?", eyebrow: "연표 사건", confirmLabel: "바꾸기", tone: "danger",
      description: `지금 목록(사건 ${state.events.length}개)을 ‘${next.label}’ 사건 ${next.events.length}개로 바꿔요.`,
      note: `${message} 고친 사건은 되돌릴 수 없어요.`,
    })) return;
    update({ set: key, events: next.events });
  }
  return (
    <ToolLayout aside={<>
      <Card title="사건 모음">
        <div className="grid grid-cols-2 gap-1">
          {EVENT_SETS.map(set => <button key={set.key} type="button" aria-pressed={state.set === set.key} onClick={() => void loadSet(set.key, "직접 더하거나 고친 사건은 사라져요.")} className={chipClass(state.set === set.key)}>{set.label}<span className="block text-[.7rem] opacity-75">사건 {set.events.length}개</span></button>)}
        </div>
      </Card>
      <Card title="사건" help="연도는 기원전이면 음수로 적어요(예: −108 → 기원전 108년). 고친 내용은 연표와 학습지에 바로 반영돼요."
        action={<Button variant="ghost" size="sm" disabled={sameEvents(state.events, preset.events)} onClick={() => void loadSet(state.set, "처음 사건 목록으로 돌아가요.")} title="처음 사건 목록으로"><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="scrollbar-subtle max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
          {state.events.map((event, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_5.8rem_auto] items-end gap-1.5">
              <input value={event.name} maxLength={60} onChange={change => setEvent(index, { name: change.target.value })} aria-label="사건" className={`${fieldClass} py-1.5 text-[.8rem]`} />
              <NumberField label="" value={event.year} min={-5000} max={2100} onChange={year => setEvent(index, { year: Math.round(year) })} />
              <Button variant="ghost" size="icon" className="size-9" onClick={() => update({ events: state.events.filter((_, at) => at !== index) })} aria-label={`${event.name} 지우기`}><Trash2 size={14} /></Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" disabled={state.events.length >= 40} onClick={() => update({ events: [...state.events, { name: "새 사건", year: 1900 }] })}><Plus size={14} /> 사건 더하기</Button>
      </Card>
      <Card title="연표 모양">
        <Segmented label="간격" value={state.scale} onChange={scale => update({ scale })} options={[{ value: "even", label: "같은 간격" }, { value: "linear", label: "연도 비율" }]} />
        <Toggle label={`${ROWS.find(row => row.key === preset.band)?.label ?? ""} 왕조·시대 띠`} checked={state.band} onChange={value => update({ band: value })} help="연도 비율로 그릴 때만 띠를 깔아요." />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 근현대사 연표)" help="빈칸 연표는 문항 수의 두 배만큼 빈칸을 만들어요.">
        <MultiChips options={timelineAsks} value={state.asks} onChange={asks => update({ asks: asks as TimelineAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="overflow-x-auto"><SvgView label="연표" className="min-w-[640px]" svg={timelineSvg(state.events, { scale: state.scale, band })} /></div>
        {state.scale === "even" && state.band && <p className="text-[.74rem] text-ink-4">왕조·시대 띠는 ‘연도 비율’로 그릴 때 보여요.</p>}
        <p className="text-[.74rem] leading-5 text-ink-4">연도는 교과서에 실린 확정된 연도예요. 사건 이름과 연도는 수업에 맞게 고쳐 쓸 수 있어요. 같은 해의 사건은 순서 문제에 함께 나오지 않아요.</p>
      </section>
      <ProblemSheet id="social-timeline-print" sections={timelineProblems(state.asks, state.sheet.count, state.sheet.seed, state.events, { band, scale: state.scale })} options={{ title: state.sheet.title || `${preset.label} 연표`, answers: state.sheet.answers }} />
      {confirmDialog}
    </ToolLayout>
  );
}

/* ───── 동시대 비교 ───── */
const rowKeys = ROWS.map(row => row.key) as [RowKey, ...RowKey[]];
const RANGES = [
  { label: "고대", from: -800, to: 700 },
  { label: "중세", from: 500, to: 1500 },
  { label: "근세·근대", from: 1300, to: 1950 },
  { label: "전체", from: -800, to: PRESENT },
];
const dynastySchema = z.object({
  rows: z.array(z.enum(rowKeys)).min(1).catch(["korea", "china", "japan"]),
  from: z.number().int().min(-3000).max(PRESENT).catch(-300),
  to: z.number().int().min(-3000).max(PRESENT).catch(1950),
  mark: z.number().int().min(-3000).max(PRESENT).nullable().catch(null),
  table: z.boolean().catch(true),
  asks: asksSchema(dynastyAsks, ["founding", "overlap", "order"]),
  sheet: sheetSchema(2),
});
function DynastyView() {
  const [state, update] = useStored("learncraft_social_dynasty_v1", dynastySchema);
  const valid = state.to - state.from >= 50;
  const from = state.from;
  const to = valid ? state.to : state.from + 50;
  return (
    <ToolLayout aside={<>
      <Card title="줄(지역)">
        <div className="grid grid-cols-3 gap-1">
          {ROWS.map(row => <button key={row.key} type="button" aria-pressed={state.rows.includes(row.key)} disabled={state.rows.length === 1 && state.rows.includes(row.key)}
            onClick={() => update({ rows: state.rows.includes(row.key) ? state.rows.filter(key => key !== row.key) : rowKeys.filter(key => key === row.key || state.rows.includes(key)) })} className={chipClass(state.rows.includes(row.key))}>{row.label}</button>)}
        </div>
      </Card>
      <Card title="보이는 구간" help="기원전은 음수로 적어요. 구간은 50년 이상이어야 해요.">
        <div className="grid grid-cols-4 gap-1">{RANGES.map(range => <button key={range.label} type="button" aria-pressed={state.from === range.from && state.to === range.to} onClick={() => update({ from: range.from, to: range.to })} className={chipClass(state.from === range.from && state.to === range.to)}>{range.label}</button>)}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="시작" unit="년" value={state.from} min={-3000} max={PRESENT} onChange={value => update({ from: Math.round(value) })} />
          <NumberField label="끝" unit="년" value={state.to} min={-3000} max={PRESENT} onChange={value => update({ to: Math.round(value) })} />
        </div>
        {!valid && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">끝 연도가 시작보다 50년 이상 뒤여야 해요.</p>}
        <Toggle label="기준 연도 선" checked={state.mark !== null} onChange={on => update({ mark: on ? Math.round((from + to) / 2) : null })} />
        {state.mark !== null && <NumberField label="기준 연도" unit="년" value={state.mark} min={-3000} max={PRESENT} onChange={value => update({ mark: Math.round(value) })} />}
        <Toggle label="나라·기간 표" checked={state.table} onChange={table => update({ table })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 같은 시기 동아시아)" help="문제는 고른 줄과 보이는 구간 안의 나라로 만들어요. 건국 연도가 전승이거나 ‘무렵’인 나라는 문제에 쓰지 않아요.">
        <MultiChips options={dynastyAsks} value={state.asks} onChange={asks => update({ asks: asks as DynastyAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="overflow-x-auto"><SvgView label="동시대 비교 연표" className="min-w-[640px]" svg={dynastySvg(state.rows, from, to, { mark: state.mark ?? undefined })} /></div>
        {state.mark !== null && <p className="text-[.8rem] font-semibold">{yearText(state.mark)}: {state.rows.map(key => { const row = ROWS.find(item => item.key === key)!; const alive = row.items.filter(item => item.start <= state.mark! && state.mark! < (item.end ?? PRESENT)); return `${row.label} ${alive.length ? alive.map(item => item.name).join("·") : "—"}`; }).join(" / ")}</p>}
        <p className="text-[.74rem] leading-5 text-ink-4">연도는 교과서에서 쓰는 통설이에요. 점선 막대는 시작 연도가 『삼국사기』 전승이거나 ‘무렵’인 나라예요. 같은 줄에서 겹치는 나라는 아래 칸에 그렸어요.</p>
        {state.table && <HtmlView html={dynastyTableHtml(state.rows, from, to)} />}
      </section>
      <ProblemSheet id="social-dynasty-print" sections={dynastyProblems(state.asks, state.sheet.count, state.sheet.seed, state.rows, from, to)} options={{ title: state.sheet.title || "동시대 비교", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

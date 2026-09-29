"use client";

import { z } from "zod";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { AMENDMENTS, constitutionAsks, constitutionProblems, constitutionSvg, constitutionTableHtml, type ConstitutionAsk } from "@/features/social/constitution";
import { parseBlanks, SOURCE_PRESETS, sourceAsks, sourceBoxHtml, sourceSheet, type HistorySource, type SourceAsk } from "@/features/social/source-reading";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, SvgView, ToolLayout, useStored } from "./science-lab-shared";

/* ───── 개헌 흐름 ───── */
const constitutionSchema = z.object({
  hide: z.enum(["none", "election", "term"]).catch("none"),
  asks: asksSchema(constitutionAsks, ["order", "match", "blank"]),
  sheet: sheetSchema(2),
});
export function ConstitutionView() {
  const [state, update] = useStored("learncraft_social_constitution_v1", constitutionSchema);
  return (
    <ToolLayout aside={<>
      <Card title="흐름도" help="흐름도를 빈칸 활동지로 쓰려면 선출 방법이나 임기를 가려요.">
        <Segmented label="가리기" value={state.hide} onChange={hide => update({ hide })} options={[{ value: "none", label: "모두 보이기" }, { value: "election", label: "선출 방법 가리기" }, { value: "term", label: "임기 가리기" }]} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 개헌으로 보는 대한민국의 역사)" help="표 빈칸은 문항 수의 두 배만큼 칸을 비워요.">
        <MultiChips options={constitutionAsks} value={state.asks} onChange={asks => update({ asks: asks as ConstitutionAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="overflow-x-auto"><SvgView label="헌법 개정의 흐름" className="min-w-[640px]" svg={constitutionSvg({ hide: state.hide === "none" ? null : state.hide })} /></div>
        <HtmlView html={constitutionTableHtml()} />
        <ul className="grid gap-1 text-[.76rem] leading-5 text-ink-4 md:grid-cols-2">
          {AMENDMENTS.map(item => <li key={item.order}><b className="text-ink-3">{item.order === 0 ? "제헌" : `${item.order}차`}</b> {item.background}</li>)}
        </ul>
      </section>
      <ProblemSheet id="social-constitution-print" sections={constitutionProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "개헌으로 보는 대한민국의 역사", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 사료 탐구 ───── */
const first = SOURCE_PRESETS[0];
const sourceSchema = z.object({
  source: z.object({
    title: z.string().max(80), origin: z.string().max(120), body: z.string().max(3000),
    time: z.string().max(200), author: z.string().max(200), background: z.string().max(500),
  }).catch(first),
  blanks: z.boolean().catch(true),
  asks: asksSchema(sourceAsks, ["when", "who", "background", "trust"]),
  custom: z.string().max(1000).catch(""),
  space: z.number().int().min(10).max(60).catch(25),
  title: z.string().max(100).catch(""),
  answers: z.boolean().catch(true),
});
const sameSource = (a: HistorySource, b: HistorySource) => (Object.keys(a) as (keyof HistorySource)[]).every(key => a[key] === b[key]);
const empty: HistorySource = { title: "", origin: "", body: "", time: "", author: "", background: "" };

export function SourceView() {
  const [state, update] = useStored("learncraft_social_source_v1", sourceSchema);
  const [confirm, confirmDialog] = useConfirm();
  const source = state.source;
  const set = (patch: Partial<HistorySource>) => update({ source: { ...source, ...patch } });
  const blankCount = parseBlanks(source.body).filter(part => part.blank).length;
  const untouched = sameSource(source, empty) || SOURCE_PRESETS.some(preset => sameSource(preset, source));
  async function load(next: HistorySource, label: string) {
    if (!untouched && !await confirm({
      title: "사료를 바꿀까요?", eyebrow: "사료 탐구", confirmLabel: "바꾸기", tone: "danger",
      description: `지금 쓴 사료(${source.title || "제목 없음"}, ${source.body.length}자)를 ‘${label}’로 바꿔요.`,
      note: "지금 입력한 제목·출전·본문·참고 답은 되돌릴 수 없어요. 질문 고르기와 직접 쓴 질문은 그대로 남아요.",
    })) return;
    update({ source: next });
  }
  const custom = state.custom.split("\n");
  return (
    <ToolLayout aside={<>
      <Card title="예시 사료">
        <div className="grid grid-cols-2 gap-1">
          {SOURCE_PRESETS.map(preset => <button key={preset.title} type="button" aria-pressed={sameSource(preset, source)} onClick={() => void load(preset, preset.title)} className={chipClass(sameSource(preset, source))}>{preset.title}</button>)}
          <button type="button" onClick={() => void load(empty, "빈 사료")} className={chipClass(sameSource(empty, source))}>새 사료 쓰기</button>
        </div>
        <p className="mt-2 text-[.72rem] leading-5 text-ink-4">현대어 풀이·번역은 교과서마다 말이 조금씩 달라요. 쓰는 교과서에 맞게 고쳐 주세요.</p>
      </Card>
      <Card title="사료" help="본문에서 빈칸으로 만들 낱말을 [ ]로 묶어요. 예: 조선이 [독립]국임과">
        <div className="space-y-2">
          <input value={source.title} maxLength={80} onChange={event => set({ title: event.target.value })} placeholder="사료 제목" aria-label="사료 제목" className={fieldClass} />
          <input value={source.origin} maxLength={120} onChange={event => set({ origin: event.target.value })} placeholder="출전 (예: 『조선왕조실록』)" aria-label="출전" className={fieldClass} />
          <textarea value={source.body} maxLength={3000} rows={8} onChange={event => set({ body: event.target.value })} placeholder="사료 본문" aria-label="사료 본문" className={`${fieldClass} resize-y`} />
          <p className="text-[.72rem] text-ink-4">빈칸 {blankCount}개 · {source.body.length}/3000자</p>
        </div>
      </Card>
      <Card title="정답지 참고 답" help="‘언제 쓰였나·누가 왜 썼나·당시 배경’ 질문의 정답지에 (예시)로 실려요. 비워 두면 채점 안내만 실려요.">
        <div className="space-y-2">
          <input value={source.time} maxLength={200} onChange={event => set({ time: event.target.value })} placeholder="쓰인 시기" aria-label="쓰인 시기" className={fieldClass} />
          <input value={source.author} maxLength={200} onChange={event => set({ author: event.target.value })} placeholder="쓴 사람과 목적" aria-label="쓴 사람과 목적" className={fieldClass} />
          <textarea value={source.background} maxLength={500} rows={3} onChange={event => set({ background: event.target.value })} placeholder="당시 배경" aria-label="당시 배경" className={`${fieldClass} resize-y`} />
        </div>
      </Card>
      <Card title="학습지">
        <Toggle label="[ ] 낱말을 빈칸으로" checked={state.blanks} onChange={blanks => update({ blanks })} />
        <p className="mb-1 mt-2 text-xs font-semibold text-ink-4">탐구 질문</p>
        <MultiChips options={sourceAsks} value={state.asks} onChange={asks => update({ asks: asks as SourceAsk[] })} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">직접 쓰는 질문 (한 줄에 하나)</p>
        <textarea value={state.custom} maxLength={1000} rows={3} onChange={event => update({ custom: event.target.value })} placeholder="예: 세종이 새 문자를 만든 까닭을 오늘날의 말로 설명해 보시오." aria-label="직접 쓰는 질문" className={`${fieldClass} resize-y`} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">답 쓰는 칸</p>
        <Segmented label="답 쓰는 칸" value={state.space} onChange={space => update({ space })} options={[{ value: 15, label: "좁게" }, { value: 25, label: "보통" }, { value: 40, label: "넓게" }]} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="학습지 제목 (예: 사료로 읽는 3·1 운동)" className={`${fieldClass} mt-3`} />
        <Toggle label="정답지 붙이기" checked={state.answers} onChange={answers => update({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
      </Card>
    </>}>
      <section className={panelClass}>
        <HtmlView html={sourceBoxHtml(source, state.blanks)} className="text-[.9rem]" />
      </section>
      <ProblemSheet id="social-source-print" sections={source.body.trim() ? sourceSheet(source, { blanks: state.blanks, asks: state.asks, custom, space: state.space }) : []} options={{ title: state.title || `사료 탐구 — ${source.title || "사료"}`, answers: state.answers }} />
      {confirmDialog}
    </ToolLayout>
  );
}

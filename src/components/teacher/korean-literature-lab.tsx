"use client";

import { z } from "zod";
import { BookMarked, Feather, Sparkles } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DEVICES, deviceAsks, deviceGroups, deviceProblems, type DeviceAsk, type DeviceGroup } from "@/features/korean/devices";
import { formTableHtml, genreTableHtml, historyAsks, historyTableHtml, literaryHistoryProblems, POVS, type HistoryAsk } from "@/features/korean/literary-history";
import { blankWords, DEFAULT_ASKS, GENRE_ASKS, workAsks, workBoxHtml, workGenres, WORK_PRESETS, workSheet, type LiteraryWork, type WorkAsk, type WorkGenre } from "@/features/korean/literature";
import { Card, Segmented, Toggle } from "./tool-panel";
import { KOREAN_AREA } from "./korean-lab-shared";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, SubjectLab, ToolLayout, useStored } from "./science-lab-shared";

export function KoreanLiteratureLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="literature" area={KOREAN_AREA} subject="문학" title="문학 · 작품 분석·표현법·갈래·문학사 도구" tabs={tabs}
      description="공통국어와 문학 수업에서 쓰는 작품 분석 학습지, 표현법 사전과 문제, 갈래·고전 시가 형식·문학사·시점 자료입니다. 교과서 작품은 저작권 때문에 직접 붙여 넣어 쓰고, 예시는 저작권이 끝난 작품만 두었어요."
      views={[
        { value: "work", label: "작품 분석", icon: Feather, note: "작품을 붙여 넣고 [시어]로 빈칸을 만든 뒤, 갈래에 맞는 질문을 골라 작품 분석 학습지를 만들어요.", render: () => <WorkView /> },
        { value: "devices", label: "표현법", icon: Sparkles, note: "비유·강조·변화·심상 표현법의 뜻과 예를 보고, 표현법 찾기·반어와 역설 구별 문제를 만들어요.", render: () => <DevicesView /> },
        { value: "history", label: "갈래·문학사", icon: BookMarked, note: "갈래 특징, 고전 시가 형식, 시대별 문학사, 소설의 시점을 정리하고 문제를 만들어요.", render: () => <HistoryView /> },
      ]} />
  );
}

/* ───── 작품 분석 ───── */
const genreKeys = Object.keys(workGenres) as WorkGenre[];
const askKeys = Object.keys(workAsks) as WorkAsk[];
const first = WORK_PRESETS[0];
const workSchema = z.object({
  work: z.object({
    genre: z.enum(genreKeys as [WorkGenre, ...WorkGenre[]]), title: z.string().max(80), author: z.string().max(60), origin: z.string().max(120), body: z.string().max(6000),
    hints: z.partialRecord(z.enum(askKeys as [WorkAsk, ...WorkAsk[]]), z.string().max(400)),
  }).catch(first),
  blanks: z.boolean().catch(true), numbers: z.boolean().catch(false),
  asks: z.array(z.enum(askKeys as [WorkAsk, ...WorkAsk[]])).catch(DEFAULT_ASKS.poem),
  custom: z.string().max(1000).catch(""),
  space: z.number().int().min(10).max(60).catch(22),
  title: z.string().max(100).catch(""),
  answers: z.boolean().catch(true),
});
const sameWork = (a: LiteraryWork, b: LiteraryWork) => JSON.stringify(a) === JSON.stringify(b);
const emptyWork = (genre: WorkGenre): LiteraryWork => ({ genre, title: "", author: "", origin: "", body: "", hints: {} });

function WorkView() {
  const [state, update] = useStored("learncraft_korean_work_v1", workSchema);
  const [confirm, confirmDialog] = useConfirm();
  const work = state.work as LiteraryWork;
  const set = (patch: Partial<LiteraryWork>) => update({ work: { ...work, ...patch } });
  const allowed = GENRE_ASKS[work.genre];
  const asks = state.asks.filter(ask => allowed.includes(ask));
  const untouched = !work.body.trim() || WORK_PRESETS.some(preset => sameWork(preset, work));
  async function load(next: LiteraryWork, label: string) {
    if (!untouched && !await confirm({
      eyebrow: "작품 분석", title: "작품을 바꿀까요?", confirmLabel: "바꾸기", tone: "danger",
      description: `지금 쓴 작품(${work.title || "제목 없음"}, ${work.body.length}자)을 ‘${label}’로 바꿔요.`,
      note: "지금 입력한 본문과 참고 답은 되돌릴 수 없어요. 직접 쓴 질문과 학습지 설정은 그대로 남아요.",
    })) return;
    update({ work: next, asks: DEFAULT_ASKS[next.genre] });
  }
  const askOptions = Object.fromEntries(allowed.map(key => [key, workAsks[key]])) as Record<WorkAsk, string>;
  return (
    <ToolLayout aside={<>
      <Card title="예시 작품" help="저작권이 끝난 작품만 넣었어요. 교과서 작품은 ‘새 작품 쓰기’로 붙여 넣어 주세요.">
        <div className="grid grid-cols-2 gap-1">
          {WORK_PRESETS.map(preset => <button key={preset.title} type="button" aria-pressed={sameWork(preset, work)} onClick={() => void load(preset, preset.title)} className={chipClass(sameWork(preset, work))}>{preset.title}<span className="block text-[.7rem] opacity-75">{preset.author} · {workGenres[preset.genre]}</span></button>)}
          <button type="button" onClick={() => void load(emptyWork(work.genre), "새 작품")} className={chipClass(false)}>새 작품 쓰기</button>
        </div>
      </Card>
      <Card title="작품" help="빈칸으로 만들 시어·낱말을 [ ]로 묶어요. 시는 빈 줄로 연을 나눠요.">
        <Segmented label="갈래" value={work.genre} onChange={genre => update({ work: { ...work, genre }, asks: DEFAULT_ASKS[genre] })} options={genreKeys.map(key => ({ value: key, label: workGenres[key] }))} />
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={work.title} maxLength={80} onChange={event => set({ title: event.target.value })} placeholder="제목" aria-label="제목" className={fieldClass} />
            <input value={work.author} maxLength={60} onChange={event => set({ author: event.target.value })} placeholder="작가" aria-label="작가" className={fieldClass} />
          </div>
          <input value={work.origin} maxLength={120} onChange={event => set({ origin: event.target.value })} placeholder="출전 (예: 『진달래꽃』, 1925)" aria-label="출전" className={fieldClass} />
          <textarea value={work.body} maxLength={6000} rows={10} onChange={event => set({ body: event.target.value })} placeholder="작품 본문" aria-label="작품 본문" className={`${fieldClass} resize-y`} />
          <p className="text-[.72rem] text-ink-4">빈칸 {blankWords(work.body).length}개 · {work.body.length}/6000자</p>
        </div>
      </Card>
      <Card title="학습지">
        <Toggle label="[ ] 낱말을 빈칸으로" checked={state.blanks} onChange={blanks => update({ blanks })} help="끄면 [ ] 낱말에 밑줄만 그어요." />
        <Toggle label={work.genre === "poem" || work.genre === "classic" ? "행·연 번호 붙이기" : "문단 번호 붙이기"} checked={state.numbers} onChange={numbers => update({ numbers })} />
        <p className="mb-1 mt-2 text-xs font-semibold text-ink-4">{workGenres[work.genre]} 질문</p>
        <MultiChips options={askOptions} value={asks} onChange={next => update({ asks: next as WorkAsk[] })} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">직접 쓰는 질문 (한 줄에 하나)</p>
        <textarea value={state.custom} maxLength={1000} rows={3} onChange={event => update({ custom: event.target.value })} placeholder="예: 3연의 ‘사뿐히 즈려밟고’에 담긴 화자의 마음을 쓰시오." aria-label="직접 쓰는 질문" className={`${fieldClass} resize-y`} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">답 쓰는 칸</p>
        <Segmented label="답 쓰는 칸" value={state.space} onChange={space => update({ space })} options={[{ value: 14, label: "좁게" }, { value: 22, label: "보통" }, { value: 36, label: "넓게" }]} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder={`학습지 제목 (예: ${work.title || "작품"} 깊이 읽기)`} className={`${fieldClass} mt-3`} />
        <Toggle label="정답지 붙이기" checked={state.answers} onChange={answers => update({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
      </Card>
      {asks.length > 0 && <Card title="정답지 참고 답" help="고른 질문의 정답지에 (예시)로 실려요. 비워 두면 채점 안내만 실려요.">
        <div className="space-y-2">
          {asks.map(ask => <label key={ask} className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">{workAsks[ask]}</span><textarea rows={2} value={work.hints[ask] ?? ""} maxLength={400} onChange={event => set({ hints: { ...work.hints, [ask]: event.target.value } })} className={`${fieldClass} text-[.82rem]`} /></label>)}
        </div>
      </Card>}
    </>}>
      <section className={panelClass}><HtmlView html={workBoxHtml(work, { blanks: state.blanks, numbers: state.numbers })} className="text-[.92rem]" /></section>
      <ProblemSheet id="korean-work-print" sections={work.body.trim() ? workSheet(work, { blanks: state.blanks, numbers: state.numbers, asks, custom: state.custom.split("\n"), space: state.space }) : []} options={{ title: state.title || `${work.title || "작품"} 깊이 읽기`, answers: state.answers }} />
      {confirmDialog}
    </ToolLayout>
  );
}

/* ───── 표현법 ───── */
const groupKeys = Object.keys(deviceGroups) as DeviceGroup[];
const devicesSchema = z.object({
  groups: z.array(z.enum(groupKeys as [DeviceGroup, ...DeviceGroup[]])).catch(groupKeys),
  asks: asksSchema(deviceAsks, ["identify", "ironyParadox"]),
  sheet: sheetSchema(4),
});
function DevicesView() {
  const [state, update] = useStored("learncraft_korean_devices_v1", devicesSchema);
  const pool = DEVICES.filter(device => state.groups.includes(device.group));
  return (
    <ToolLayout aside={<>
      <Card title="표현법 묶음" help="학습지 문제는 고른 묶음의 표현법에서 내요.">
        <MultiChips options={deviceGroups} value={state.groups} onChange={groups => update({ groups })} />
        <p className="mt-2 text-[.72rem] text-ink-4">표현법 {pool.length}개</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 표현법 익히기)">
        <MultiChips options={deviceAsks} value={state.asks} onChange={asks => update({ asks: asks as DeviceAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-4`}>
        {groupKeys.filter(group => state.groups.includes(group)).map(group => (
          <div key={group}>
            <h2 className="mb-2 text-sm font-extrabold text-ink">{deviceGroups[group]}</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {DEVICES.filter(device => device.group === group).map(device => (
                <div key={device.id} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5">
                  <p className="font-extrabold text-ink">{device.name}</p>
                  <p className="text-ink-3">{device.meaning}</p>
                  <ul className="mt-1 space-y-0.5 text-ink-2">{device.examples.map(example => <li key={example.text}>· {example.text}{example.source && <span className="text-ink-4"> — {example.source}</span>}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!pool.length && <p className="text-[.84rem] text-ink-4">표현법 묶음을 하나 이상 골라 주세요.</p>}
        <p className="text-[.74rem] leading-5 text-ink-4">출전이 없는 예문은 교과서형으로 지은 예문이에요. 교과서마다 분류(예: 음성 상징어를 표현법에 넣는지)가 조금씩 다를 수 있어요.</p>
      </section>
      <ProblemSheet id="korean-devices-print" sections={deviceProblems(state.asks, pool, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "표현법 익히기", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 갈래·문학사 ───── */
const historySchema = z.object({
  show: z.enum(["genre", "form", "history", "pov"]).catch("genre"),
  asks: asksSchema(historyAsks, ["genre", "form", "history", "pov"]),
  sheet: sheetSchema(3),
});
function HistoryView() {
  const [state, update] = useStored("learncraft_korean_history_v1", historySchema);
  return (
    <ToolLayout aside={<>
      <Card title="자료 보기">
        <Segmented label="자료" value={state.show} onChange={show => update({ show })} options={[{ value: "genre", label: "갈래" }, { value: "form", label: "고전 시가" }, { value: "history", label: "문학사" }, { value: "pov", label: "시점" }]} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 갈래와 한국 문학사)" help="문학사 빈칸은 문항 수의 두 배만큼 칸을 비워요.">
        <MultiChips options={historyAsks} value={state.asks} onChange={asks => update({ asks: asks as HistoryAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        {state.show === "genre" && <HtmlView html={genreTableHtml()} />}
        {state.show === "form" && <HtmlView html={formTableHtml()} />}
        {state.show === "history" && <HtmlView html={historyTableHtml()} />}
        {state.show === "pov" && <div className="grid gap-2 md:grid-cols-2">{POVS.map(pov => <div key={pov.key} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5"><p className="font-extrabold text-ink">{pov.name}</p><p className="text-ink-3">{pov.narrator}</p><p className="text-ink-4">{pov.effect}</p></div>)}</div>}
        <p className="text-[.74rem] leading-5 text-ink-4">교과서에 실리는 통설로 정리했어요. 갈래 구분(예: 가사를 교술로 보는지)은 교과서마다 조금 다를 수 있어요. 시점 문제의 예문은 교과서형으로 지은 것이에요.</p>
      </section>
      <ProblemSheet id="korean-history-print" sections={literaryHistoryProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "갈래와 한국 문학사", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

"use client";

import { z } from "zod";
import { FileSearch, Network, NotebookPen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formSheetsHtml, formSheetsText } from "@/features/korean/form-sheet";
import { inquiryForms, inquirySheets, type InquiryForm } from "@/features/korean/inquiry";
import { blankWords } from "@/features/korean/literature";
import { passageBoxHtml, passageSheet, readingAsks, splitParagraphs, STRUCTURES, structureAsks, structureProblems, structureSvg, type ReadingAsk, type Structure, type StructureAsk } from "@/features/korean/reading";
import { Card, Segmented, Toggle } from "./tool-panel";
import { KOREAN_AREA } from "./korean-lab-shared";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";

export function KoreanReadingLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="reading" area={KOREAN_AREA} subject="독서" title="독서 · 지문 분석·글 구조·주제 탐구 독서 도구" tabs={tabs}
      description="공통국어와 주제 탐구 독서 수업에서 쓰는 지문 분석 학습지, 글의 구조도, 탐구 계획서·독서 일지·자료 점검표·보고서 양식입니다. 지문은 저작권 때문에 직접 붙여 넣어 써요."
      views={[
        { value: "passage", label: "지문 분석", icon: FileSearch, note: "지문을 붙여 넣으면 문단에 번호를 붙이고, 문단 요약·빈칸·읽기 방법별 질문·어휘 칸이 있는 학습지를 만들어요.", render: () => <PassageView /> },
        { value: "structure", label: "글의 구조", icon: Network, note: "비교·대조, 원인·결과, 문제·해결 같은 글의 짜임을 구조도로 그리고, 구조 찾기 문제를 만들어요.", render: () => <StructureView /> },
        { value: "inquiry", label: "주제 탐구 독서", icon: NotebookPen, note: "탐구 계획서, 독서 일지, 자료 신뢰성 점검표, 탐구 보고서, 발표 평가표를 골라 한 묶음으로 인쇄해요.", render: () => <InquiryView /> },
      ]} />
  );
}

/* ───── 지문 분석 ───── */
const readingKeys = Object.keys(readingAsks) as ReadingAsk[];
const passageSchema = z.object({
  passage: z.object({ title: z.string().max(80), origin: z.string().max(120), body: z.string().max(8000), summaries: z.array(z.string().max(300)).max(30), words: z.string().max(400) })
    .catch({ title: "", origin: "", body: "", summaries: [], words: "" }),
  blanks: z.boolean().catch(true), summary: z.boolean().catch(true), vocabulary: z.boolean().catch(true),
  asks: z.array(z.enum(readingKeys as [ReadingAsk, ...ReadingAsk[]])).catch(["literal", "inferential", "critical"]),
  perAsk: z.number().int().min(1).max(2).catch(1),
  custom: z.string().max(1000).catch(""),
  space: z.number().int().min(10).max(60).catch(20),
  title: z.string().max(100).catch(""),
  answers: z.boolean().catch(true),
});
function PassageView() {
  const [state, update] = useStored("learncraft_korean_passage_v1", passageSchema);
  const [confirm, confirmDialog] = useConfirm();
  const passage = state.passage;
  const set = (patch: Partial<typeof passage>) => update({ passage: { ...passage, ...patch } });
  const paragraphs = splitParagraphs(passage.body);
  async function clear() {
    if (!await confirm({ eyebrow: "지문 분석", title: "지문을 지울까요?", confirmLabel: "지우기", tone: "danger", description: `지금 지문(문단 ${paragraphs.length}개, ${passage.body.length}자)과 문단 요약·어휘를 지워요.`, note: "지운 지문은 되돌릴 수 없어요. 질문 고르기와 학습지 설정은 그대로 남아요." })) return;
    update({ passage: { title: "", origin: "", body: "", summaries: [], words: "" } });
  }
  return (
    <ToolLayout aside={<>
      <Card title="지문" help="문단은 빈 줄로 나눠요(빈 줄이 없으면 줄마다 한 문단). 빈칸으로 만들 낱말은 [ ]로 묶어요." action={passage.body && <Button variant="ghost" size="sm" onClick={() => void clear()}><RotateCcw size={14} /> 비우기</Button>}>
        <div className="space-y-2">
          <input value={passage.title} maxLength={80} onChange={event => set({ title: event.target.value })} placeholder="지문 제목 (없어도 돼요)" aria-label="지문 제목" className={fieldClass} />
          <input value={passage.origin} maxLength={120} onChange={event => set({ origin: event.target.value })} placeholder="출처 (예: 교과서 ○쪽)" aria-label="출처" className={fieldClass} />
          <textarea value={passage.body} maxLength={8000} rows={10} onChange={event => set({ body: event.target.value })} placeholder="지문을 붙여 넣으세요." aria-label="지문" className={`${fieldClass} resize-y`} />
          <p className="text-[.72rem] text-ink-4">문단 {paragraphs.length}개 · 빈칸 {blankWords(passage.body).length}개 · {passage.body.length}/8000자</p>
        </div>
      </Card>
      <Card title="학습지">
        <Toggle label="[ ] 낱말을 빈칸으로" checked={state.blanks} onChange={blanks => update({ blanks })} />
        <Toggle label="문단별 중심 내용 칸" checked={state.summary} onChange={summary => update({ summary })} />
        <Toggle label="어휘 칸" checked={state.vocabulary} onChange={vocabulary => update({ vocabulary })} />
        {state.vocabulary && <input value={passage.words} maxLength={400} onChange={event => set({ words: event.target.value })} placeholder="어휘 (쉼표로 나눠요: 편향, 상관관계)" aria-label="어휘" className={`${fieldClass} mt-1`} />}
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">읽기 방법별 질문</p>
        <MultiChips options={readingAsks} value={state.asks} onChange={asks => update({ asks: asks as ReadingAsk[] })} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">방법마다 질문 수</p>
        <Segmented label="방법마다 질문 수" value={state.perAsk} onChange={perAsk => update({ perAsk })} options={[{ value: 1, label: "1개" }, { value: 2, label: "2개" }]} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">직접 쓰는 질문 (한 줄에 하나)</p>
        <textarea value={state.custom} maxLength={1000} rows={3} onChange={event => update({ custom: event.target.value })} placeholder="예: [2] 문단의 예시가 주장을 어떻게 뒷받침하는지 쓰시오." aria-label="직접 쓰는 질문" className={`${fieldClass} resize-y`} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">답 쓰는 칸</p>
        <Segmented label="답 쓰는 칸" value={state.space} onChange={space => update({ space })} options={[{ value: 12, label: "좁게" }, { value: 20, label: "보통" }, { value: 32, label: "넓게" }]} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="학습지 제목 (예: 지문 깊이 읽기)" className={`${fieldClass} mt-3`} />
        <Toggle label="정답지 붙이기" checked={state.answers} onChange={answers => update({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
      </Card>
      {state.summary && paragraphs.length > 0 && <Card title="문단 요약 참고 답" help="정답지에 실려요. 비워 두면 채점 안내만 실려요.">
        <div className="space-y-2">
          {paragraphs.slice(0, 30).map((paragraph, index) => <label key={index} className="block"><span className="mb-1 block truncate text-xs font-semibold text-ink-4">[{index + 1}] {paragraph.replace(/[[\]]/g, "").slice(0, 30)}…</span><input value={passage.summaries[index] ?? ""} maxLength={300} onChange={event => { const summaries = [...passage.summaries]; while (summaries.length <= index) summaries.push(""); summaries[index] = event.target.value; set({ summaries }); }} className={`${fieldClass} text-[.82rem]`} /></label>)}
        </div>
      </Card>}
    </>}>
      {paragraphs.length > 0 && <section className={panelClass}><HtmlView html={passageBoxHtml(passage, state.blanks)} className="text-[.92rem]" /></section>}
      <ProblemSheet id="korean-passage-print" sections={passageSheet(passage, { blanks: state.blanks, summary: state.summary, asks: state.asks, perAsk: state.perAsk, custom: state.custom.split("\n"), vocabulary: state.vocabulary, space: state.space })} options={{ title: state.title || `지문 깊이 읽기${passage.title ? ` — ${passage.title}` : ""}`, answers: state.answers }} />
      {confirmDialog}
    </ToolLayout>
  );
}

/* ───── 글의 구조 ───── */
const structureKeys = Object.keys(STRUCTURES) as Structure[];
const structureSchema = z.object({
  kind: z.enum(structureKeys as [Structure, ...Structure[]]).catch("compare"),
  texts: z.partialRecord(z.enum(structureKeys as [Structure, ...Structure[]]), z.array(z.string().max(80)).max(5)).catch({}),
  asks: asksSchema(structureAsks, ["identify", "fill"]),
  sheet: sheetSchema(2),
});
function StructureView() {
  const [state, update] = useStored("learncraft_korean_structure_v1", structureSchema);
  const info = STRUCTURES[state.kind];
  const texts = state.texts[state.kind] ?? [];
  const setText = (index: number, value: string) => { const next = [...texts]; while (next.length < 5) next.push(""); next[index] = value; update({ texts: { ...state.texts, [state.kind]: next } }); };
  return (
    <ToolLayout aside={<>
      <Card title="구조 유형">
        <div className="grid grid-cols-2 gap-1">{structureKeys.map(key => <button key={key} type="button" aria-pressed={state.kind === key} onClick={() => update({ kind: key })} className={chipClass(state.kind === key)}>{STRUCTURES[key].name}</button>)}</div>
      </Card>
      <Card title="칸 채우기" help="비워 둔 칸은 학생이 쓰는 칸이 돼요. 구조도를 그림으로 수업 자료에 쓸 수 있어요.">
        <div className="space-y-1.5">{info.labels.map((label, index) => <label key={label} className="block"><span className="mb-0.5 block text-xs font-semibold text-ink-4">{label}</span><input value={texts[index] ?? ""} maxLength={80} onChange={event => setText(index, event.target.value)} className={`${fieldClass} py-1.5 text-[.82rem]`} /></label>)}</div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 글의 짜임 파악하기)">
        <MultiChips options={structureAsks} value={state.asks} onChange={asks => update({ asks: asks as StructureAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-2`}>
        <SvgView label={`${info.name} 구조도`} svg={structureSvg(state.kind, texts)} className="max-w-3xl" />
        <p className="text-[.84rem] text-ink-2"><b>{info.name}</b> — {info.meaning}</p>
        <p className="text-[.78rem] text-ink-4">자주 쓰는 표지: {info.signals}</p>
      </section>
      <ProblemSheet id="korean-structure-print" sections={structureProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "글의 짜임 파악하기", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 주제 탐구 독서 ───── */
const inquiryKeys = Object.keys(inquiryForms) as InquiryForm[];
const inquirySchema = z.object({
  field: z.string().max(40).catch("사회·문화"), topic: z.string().max(200).catch(""),
  forms: z.array(z.enum(inquiryKeys as [InquiryForm, ...InquiryForm[]])).catch(["plan", "log", "source"]),
  books: z.number().int().min(1).max(6).catch(3),
});
const FIELDS = ["인문·예술", "사회·문화", "과학·기술", "진로"];
function InquiryView() {
  const [state, update] = useStored("learncraft_korean_inquiry_v1", inquirySchema);
  const sheets = inquirySheets({ field: state.field, topic: state.topic, forms: state.forms, books: state.books });
  return (
    <ToolLayout aside={<>
      <Card title="탐구 분야와 주제">
        <div className="grid grid-cols-2 gap-1">{FIELDS.map(field => <button key={field} type="button" aria-pressed={state.field === field} onClick={() => update({ field })} className={chipClass(state.field === field)}>{field}</button>)}</div>
        <input value={state.field} maxLength={40} onChange={event => update({ field: event.target.value })} placeholder="분야 직접 쓰기" aria-label="탐구 분야" className={`${fieldClass} mt-2`} />
        <input value={state.topic} maxLength={200} onChange={event => update({ topic: event.target.value })} placeholder="탐구 주제 (비우면 학생이 써요)" aria-label="탐구 주제" className={`${fieldClass} mt-2`} />
      </Card>
      <Card title="양식" help="고른 양식을 쪽을 나눠 한 번에 인쇄해요.">
        <MultiChips options={inquiryForms} value={state.forms} onChange={forms => update({ forms: inquiryKeys.filter(key => forms.includes(key)) })} />
        {state.forms.includes("plan") && <>
          <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">책·자료 목록 칸 수</p>
          <Segmented label="책·자료 목록 칸 수" value={state.books} onChange={books => update({ books })} options={[2, 3, 4, 6].map(value => ({ value, label: `${value}칸` }))} />
        </>}
      </Card>
    </>}>
      <SheetPreview id="korean-inquiry-print" html={sheets.length ? formSheetsHtml(sheets, "screen") : null} empty="인쇄할 양식을 골라 주세요." clipboard={() => ({ text: formSheetsText(sheets), html: formSheetsHtml(sheets, "clipboard") })} />
    </ToolLayout>
  );
}

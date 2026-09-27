"use client";

import { z } from "zod";
import { BookOpen, ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DEFAULT_WORDS, parseWordList, wordAsks, wordLines, wordListHtml, wordListLayouts, wordListText, wordTestSections, type WordAsk, type WordEntry, type WordListLayout } from "@/features/english/wordlist";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, fieldClass, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, SubjectLab, ToolLayout, useStored } from "./science-lab-shared";
import { ENGLISH_AREA } from "./english-lab-shared";

// 단어 목록은 두 보기(시험지·단어장)가 함께 씁니다.
const listKey = "learncraft_english_wordlist_v1";
const entrySchema = z.object({ word: z.string().max(60), meaning: z.string().max(120), example: z.string().max(300) });
const listSchema = z.object({ entries: z.array(entrySchema).max(80).catch(DEFAULT_WORDS) });

export function EnglishWordsLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="words" area={ENGLISH_AREA} subject="단어 시험지" title="단어 시험지 · 교사 단어 목록으로 만드는 시험지" tabs={tabs}
      description="단원 단어를 ‘단어 - 뜻 - 예문’으로 붙여 넣으면 뜻 쓰기·철자·예문 빈칸·객관식 시험지와 단어장을 만듭니다. A형·B형은 ‘다른 문제로’로 순서를 바꿔 만들어요."
      views={[
        { value: "test", label: "시험지 만들기", icon: ListChecks, note: "단어 목록을 붙여 넣고 표에서 고친 뒤, 시험 유형을 골라요. 예문 빈칸은 -s·-ed·-ing 같은 변화형도 찾아요.", render: () => <TestView /> },
        { value: "list", label: "단어장 인쇄", icon: BookOpen, note: "같은 단어 목록으로 표·접어 외우기·카드형 단어장을 인쇄해요.", render: () => <ListView /> },
      ]} />
  );
}

/** 단어 목록 붙여 넣기와 표 편집입니다. 목록 상태는 보기가 갖고 내려 줍니다(미리보기와 같은 값을 쓰도록). */
function WordListEditor({ entries, onChange }: { entries: WordEntry[]; onChange: (entries: WordEntry[]) => void }) {
  const [confirm, confirmDialog] = useConfirm();
  const update = ({ entries: next }: { entries: WordEntry[] }) => onChange(next);
  const setEntry = (index: number, patch: Partial<WordEntry>) => update({ entries: entries.map((entry, at) => at === index ? { ...entry, ...patch } : entry) });
  async function replace(text: string, form: HTMLFormElement) {
    const parsed = parseWordList(text).slice(0, 80);
    if (!parsed.length) return;
    if (entries.length && !await confirm({
      title: "단어 목록을 바꿀까요?", eyebrow: "단어 시험지", confirmLabel: "바꾸기", tone: "danger",
      description: `지금 목록(${entries.length}개)을 붙여 넣은 단어 ${parsed.length}개로 바꿔요.`,
      note: "지금 목록에서 고친 뜻·예문은 되돌릴 수 없어요. 시험 유형과 제목은 그대로 남아요.",
    })) return;
    update({ entries: parsed });
    form.reset();
  }
  async function reset() {
    if (!await confirm({ title: "예시 목록으로 되돌릴까요?", eyebrow: "단어 시험지", confirmLabel: "되돌리기", tone: "danger", description: `지금 목록(${entries.length}개)을 예시 단어 ${DEFAULT_WORDS.length}개로 바꿔요.`, note: "지금 목록은 되돌릴 수 없어요." })) return;
    update({ entries: DEFAULT_WORDS });
  }
  return (
    <>
      <Card title="단어 붙여 넣기" help="한 줄에 하나씩 ‘단어 - 뜻 - 예문’으로 써요. 구분자는 탭, -, :, =, /, 쉼표를 알아봐요. 엑셀에서 복사한 표도 돼요.">
        <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; void replace(String(new FormData(form).get("words") ?? ""), form); }}>
          <textarea name="words" rows={5} maxLength={20000} placeholder={"consumer - 소비자 - Smart consumers compare prices.\nreduce\t줄이다"} aria-label="단어 목록" className={`${fieldClass} resize-y font-mono text-[.8rem]`} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button type="submit" size="sm">목록으로 바꾸기</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void reset()}><RotateCcw size={14} /> 예시 목록</Button>
          </div>
        </form>
      </Card>
      <Card title={`단어 목록 (${entries.length}개)`} action={<Button variant="ghost" size="sm" disabled={entries.length >= 80} onClick={() => update({ entries: [...entries, { word: "", meaning: "", example: "" }] })}><Plus size={14} /> 더하기</Button>}>
        <div className="scrollbar-subtle max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
          {entries.map((entry, index) => (
            <div key={index} className="rounded-lg border border-line p-1.5">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1">
                <input value={entry.word} maxLength={60} onChange={event => setEntry(index, { word: event.target.value })} placeholder="단어" aria-label={`${index + 1}번 단어`} className={`${fieldClass} py-1 text-[.8rem]`} />
                <input value={entry.meaning} maxLength={120} onChange={event => setEntry(index, { meaning: event.target.value })} placeholder="뜻" aria-label={`${index + 1}번 뜻`} className={`${fieldClass} py-1 text-[.8rem]`} />
                <Button variant="ghost" size="icon" className="size-9" onClick={() => update({ entries: entries.filter((_, at) => at !== index) })} aria-label={`${entry.word || `${index + 1}번`} 지우기`}><Trash2 size={14} /></Button>
              </div>
              <input value={entry.example} maxLength={300} onChange={event => setEntry(index, { example: event.target.value })} placeholder="예문 (선택)" aria-label={`${index + 1}번 예문`} className={`${fieldClass} mt-1 py-1 text-[.76rem]`} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[.72rem] text-ink-4">교과서 단어는 쓰는 교과서에서 옮겨 넣어 주세요. 예시 목록의 예문은 직접 쓴 문장이에요.</p>
      </Card>
      {confirmDialog}
    </>
  );
}

const testSchema = z.object({
  asks: asksSchema(wordAsks, ["enKo", "koEn", "example", "choice"]),
  sheet: sheetSchema(10),
});
function TestView() {
  const [list, setList] = useStored(listKey, listSchema);
  const [state, update] = useStored("learncraft_english_wordtest_v1", testSchema);
  const sections = wordTestSections(list.entries, { asks: state.asks, count: state.sheet.count, seed: state.sheet.seed });
  const withExample = list.entries.filter(entry => entry.example.trim()).length;
  return (
    <ToolLayout aside={<>
      <WordListEditor entries={list.entries} onChange={entries => setList({ entries })} />
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[5, 10, 15, 20]} countLabel="유형마다 문항 수" placeholder="시험지 제목 (예: Lesson 1 단어 시험 A형)" help="‘다른 문제로’를 누르면 단어 순서·보기가 바뀌어 B형을 만들 수 있어요.">
        <MultiChips options={wordAsks} value={state.asks} onChange={asks => update({ asks: asks as WordAsk[] })} />
        <p className="mt-2 text-[.72rem] leading-5 text-ink-4">예문이 있는 단어 {withExample}개 · 뜻 고르기는 뜻이 다른 단어가 4개 이상일 때 나와요.</p>
      </SheetCard>
    </>}>
      <ProblemSheet id="english-wordtest-print" sections={sections} options={{ title: state.sheet.title || "단어 시험", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

const listViewSchema = z.object({
  title: z.string().max(100).catch(""),
  layout: z.enum(Object.keys(wordListLayouts) as [WordListLayout, ...WordListLayout[]]).catch("fold"),
  examples: z.boolean().catch(true),
  hide: z.enum(["none", "word", "meaning"]).catch("none"),
});
function ListView() {
  const [list, setList] = useStored(listKey, listSchema);
  const [state, update] = useStored("learncraft_english_wordbook_v1", listViewSchema);
  const entries = list.entries.filter(entry => entry.word.trim());
  return (
    <ToolLayout aside={<>
      <WordListEditor entries={list.entries} onChange={entries => setList({ entries })} />
      <Card title="단어장">
        <p className="mb-1 text-xs font-semibold text-ink-4">모양</p>
        <Segmented label="모양" value={state.layout} onChange={layout => update({ layout })} options={(Object.keys(wordListLayouts) as WordListLayout[]).map(value => ({ value, label: wordListLayouts[value] }))} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">가리기</p>
        <Segmented label="가리기" value={state.hide} onChange={hide => update({ hide })} options={[{ value: "none", label: "모두 보이기" }, { value: "word", label: "영어 가리기" }, { value: "meaning", label: "뜻 가리기" }]} />
        <Toggle label="예문 넣기" checked={state.examples} onChange={examples => update({ examples })} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="단어장 제목 (예: Lesson 1 Words)" className={`${fieldClass} mt-2`} />
      </Card>
    </>}>
      <section className={`${panelClass} text-[.8rem] text-ink-3`}>
        단어 {entries.length}개 · 붙여 넣기용 목록: <code className="break-all text-[.74rem]">{wordLines(entries).split("\n").slice(0, 2).join(" / ")}{entries.length > 2 ? " …" : ""}</code>
      </section>
      <SheetPreview id="english-wordbook-print" empty="단어 목록에 단어를 넣어 주세요."
        html={entries.length ? wordListHtml(entries, state, "screen") : null}
        clipboard={() => ({ text: wordListText(entries, state), html: wordListHtml(entries, state, "clipboard") })} />
    </ToolLayout>
  );
}

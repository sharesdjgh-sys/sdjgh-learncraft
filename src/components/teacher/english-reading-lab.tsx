"use client";

import { useState } from "react";
import { z } from "zod";
import { BookOpenText, ClipboardCheck, Copy, ListOrdered, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { orderChunks, readingAsks, readingSections, SAMPLE_PASSAGE, splitSentences, stripBrackets, vocabListHtml, vocabListText, wordFrequency, type ReadingAsk } from "@/features/english/reading";
import { escapeHtml } from "@/features/english/sheet";
import { copyToClipboard } from "./hanmun-sheet";
import { Card, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, SubjectLab, ToolLayout, useStored } from "./science-lab-shared";
import { ENGLISH_AREA } from "./english-lab-shared";
import { AiStatus, useAiRequest } from "./ai-request";
import { requestWordFill } from "./english-word-tools";

// 지문은 두 보기(활동지·어휘 뽑기)가 함께 씁니다.
const passageKey = "learncraft_english_passage_v1";
const passageSchema = z.object({ text: z.string().max(8000).catch(SAMPLE_PASSAGE) });

export function EnglishReadingLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="reading" area={ENGLISH_AREA} subject="독해 학습지" title="독해 학습지 · 교사 지문으로 만드는 활동지" tabs={tabs}
      description="수업 지문을 붙여 넣으면 문장을 나눠 번호를 붙이고, 끊어 읽기·글의 순서·문장 넣기·무관한 문장·빈칸·요지 쓰기 활동지와 어휘 목록을 만듭니다."
      views={[
        { value: "sheet", label: "지문 활동지", icon: BookOpenText, note: "활동을 고르면 지문으로 바로 문제를 만들어요. 본문에서 빈칸으로 만들 낱말은 [ ]로 묶어요.", render: () => <SheetView /> },
        { value: "vocab", label: "어휘 뽑기", icon: ListOrdered, note: "지문에서 기능어를 뺀 낱말을 많이 나온 차례로 보여 줘요. 고른 낱말은 단어 시험지 탭에 붙여 넣을 수 있게 복사해요.", render: () => <VocabView /> },
      ]} />
  );
}

function PassageCard({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  const [confirm, confirmDialog] = useConfirm();
  const sentences = splitSentences(text);
  async function sample() {
    if (text.trim() && text !== SAMPLE_PASSAGE && !await confirm({ title: "예시 지문으로 바꿀까요?", eyebrow: "독해 학습지", confirmLabel: "바꾸기", tone: "danger", description: `지금 지문(${text.length}자)을 예시 지문으로 바꿔요.`, note: "지금 지문은 되돌릴 수 없어요." })) return;
    onChange(SAMPLE_PASSAGE);
  }
  return (
    <Card title="지문" help="교과서 지문은 쓰는 교과서에서 옮겨 넣어 주세요. 예시 지문은 직접 쓴 짧은 글이에요." action={<Button variant="ghost" size="sm" onClick={() => void sample()}><RotateCcw size={14} /> 예시 지문</Button>}>
      <textarea value={text} maxLength={8000} rows={9} onChange={event => onChange(event.target.value)} placeholder="영어 지문을 붙여 넣어 주세요." aria-label="지문" className={`${fieldClass} resize-y text-[.82rem]`} />
      <p className="mt-1 text-[.72rem] text-ink-4">문장 {sentences.length}개 · {text.length}/8000자</p>
      {confirmDialog}
    </Card>
  );
}

const sheetViewSchema = z.object({
  asks: asksSchema(readingAsks, ["chunk", "order", "insert", "vocab"]),
  orderIntro: z.number().int().min(1).max(20).catch(1),
  insertAt: z.number().int().min(0).max(60).catch(0),
  irrelevant: z.string().max(300).catch(""),
  irrelevantAfter: z.number().int().min(1).max(60).catch(3),
  vocabCount: z.number().int().min(3).max(30).catch(10),
  meanings: z.record(z.string(), z.string().max(80)).catch({}),
  sheet: sheetSchema(1),
});
function SheetView() {
  const [passage, setPassage] = useStored(passageKey, passageSchema);
  const [state, update] = useStored("learncraft_english_reading_v1", sheetViewSchema);
  const sentences = splitSentences(passage.text);
  const { head } = orderChunks(sentences, state.orderIntro);
  const vocab = wordFrequency(sentences.map(stripBrackets).join(" ")).slice(0, state.vocabCount);
  const has = (ask: ReadingAsk) => state.asks.includes(ask);
  const ai = useAiRequest();
  const missing = vocab.filter(item => !state.meanings[item.word]?.trim()).map(item => item.word);
  // 지문을 맥락으로 넘겨 그 글에서 쓰인 뜻을 받습니다. 기다리는 동안 교사가 적은 뜻은 그대로 둡니다.
  const fillMeanings = () => ai.run(async signal => {
    const { items, rejected } = await requestWordFill(missing, { meaning: true, example: false, context: sentences.map(stripBrackets).join(" ") }, signal);
    update(current => {
      const meanings = { ...current.meanings };
      for (const item of items) if (item.meaning && !meanings[item.word]?.trim()) meanings[item.word] = item.meaning.slice(0, 80);
      return { meanings };
    });
    return `낱말 ${items.filter(item => item.meaning).length}개의 뜻을 지문 맥락에 맞춰 채웠어요.${rejected ? ` 알맞지 않은 결과 ${rejected}개는 버렸어요.` : ""} 정답지에 싣기 전에 확인해 주세요.`;
  });
  return (
    <ToolLayout aside={<>
      <PassageCard text={passage.text} onChange={text => setPassage({ text })} />
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[]} placeholder="활동지 제목 (예: Lesson 1 Read)" help="‘다른 문제로’를 누르면 순서 배열·문장 넣기의 섞는 방식이 바뀌어요.">
        <MultiChips options={readingAsks} value={state.asks} onChange={asks => update({ asks: asks as ReadingAsk[] })} />
        {has("order") && <NumberField className="mt-3" label={`글의 순서: 주어진 글 문장 수 (지금 ${head.length}문장)`} value={state.orderIntro} min={1} max={20} onChange={orderIntro => update({ orderIntro })} />}
        {has("insert") && <NumberField className="mt-2" label="문장 넣기: 뺄 문장 번호 (0이면 알아서)" value={state.insertAt} min={0} max={60} onChange={insertAt => update({ insertAt })} />}
        {has("irrelevant") && <>
          <textarea value={state.irrelevant} maxLength={300} rows={2} onChange={event => update({ irrelevant: event.target.value })} placeholder="무관한 문장: 흐름과 관계없는 문장을 직접 써 주세요." aria-label="무관한 문장" className={`${fieldClass} mt-2 resize-y text-[.8rem]`} />
          <NumberField className="mt-1" label="몇 번째 문장 뒤에 넣을까요" value={state.irrelevantAfter} min={1} max={60} onChange={irrelevantAfter => update({ irrelevantAfter })} />
        </>}
        {has("vocab") && <NumberField className="mt-2" label="어휘 목록 낱말 수" value={state.vocabCount} min={3} max={30} onChange={vocabCount => update({ vocabCount })} />}
      </SheetCard>
      {has("vocab") && vocab.length > 0 && (
        <Card title="어휘 뜻 (정답지)" help="정답지에 실을 뜻을 넣어요. 비워 두면 ‘뜻을 넣어 주세요’로 실려요. ‘AI로 뜻 채우기’는 빈 칸만 지문에서 쓰인 뜻으로 채워요."
          action={<Button variant="ghost" size="sm" disabled={ai.busy || !missing.length} onClick={() => void fillMeanings()}>{ai.busy ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />} {ai.busy ? "채우는 중…" : "AI로 뜻 채우기"}</Button>}>
          <div className="scrollbar-subtle max-h-72 space-y-1 overflow-y-auto pr-1">
            {vocab.map(item => (
              <label key={item.word} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-1.5 text-[.8rem]">
                <span className="truncate font-semibold">{item.word} <span className="text-ink-4">×{item.count}</span></span>
                <input value={state.meanings[item.word] ?? ""} maxLength={80} onChange={event => update({ meanings: { ...state.meanings, [item.word]: event.target.value } })} aria-label={`${item.word} 뜻`} className={`${fieldClass} py-1 text-[.8rem]`} />
              </label>
            ))}
          </div>
          <AiStatus message={ai.message} error={ai.error} />
        </Card>
      )}
    </>}>
      <section className={panelClass}>
        <h2 className="mb-2 text-sm font-extrabold text-ink">문장 나누기 <span className="text-[.72rem] font-medium text-ink-4">약어(Mr. e.g.)와 소수점은 문장 끝으로 보지 않아요</span></h2>
        <ol className="space-y-1 text-[.82rem] leading-6">
          {sentences.map((sentence, index) => <li key={index} className="flex gap-2"><span className="w-6 shrink-0 text-right font-bold text-brand">{index + 1}</span><span className="min-w-0 break-words">{stripBrackets(sentence)}</span></li>)}
        </ol>
        {has("insert") && sentences.length < 6 && <p role="status" className="mt-2 text-[.76rem] font-semibold text-warn">문장 넣기는 문장이 6개 이상일 때 만들어요.</p>}
        {has("order") && sentences.length < 4 && <p role="status" className="mt-2 text-[.76rem] font-semibold text-warn">글의 순서는 문장이 4개 이상일 때 만들어요.</p>}
        {has("irrelevant") && !state.irrelevant.trim() && <p role="status" className="mt-2 text-[.76rem] font-semibold text-warn">무관한 문장을 써 주면 문제를 만들어요.</p>}
      </section>
      <ProblemSheet id="english-reading-print" sections={readingSections(passage.text, { ...state, seed: state.sheet.seed })} options={{ title: state.sheet.title || "독해 활동지", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

const vocabSchema = z.object({ keepStop: z.boolean().catch(false), picked: z.array(z.string().max(60)).max(200).catch([]), title: z.string().max(100).catch("") });
function VocabView() {
  const [passage, setPassage] = useStored(passageKey, passageSchema);
  const [state, update] = useStored("learncraft_english_passage_vocab_v1", vocabSchema);
  const [copied, setCopied] = useState(false);
  const words = wordFrequency(stripBrackets(passage.text), { keepStopWords: state.keepStop });
  const picked = state.picked.filter(word => words.some(item => item.word === word));
  // 뜻 쓰기 표에는 고른 낱말을, 고르지 않았으면 많이 나온 15개를 실어요.
  const sheetWords = picked.length ? words.filter(item => picked.includes(item.word)) : words.slice(0, 15);
  const toggle = (word: string) => update({ picked: picked.includes(word) ? picked.filter(item => item !== word) : [...picked, word] });
  async function copy() {
    const text = picked.join("\n");
    await copyToClipboard({ text, html: picked.map(word => `<div>${escapeHtml(word)}</div>`).join("") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <ToolLayout aside={<>
      <PassageCard text={passage.text} onChange={text => setPassage({ text })} />
      <Card title="어휘 고르기">
        <Toggle label="기능어(the, of, can …)도 보기" checked={state.keepStop} onChange={keepStop => update({ keepStop })} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => update({ picked: words.slice(0, 15).map(item => item.word) })}>많이 나온 15개</Button>
          <Button variant="ghost" size="sm" disabled={!picked.length} onClick={() => update({ picked: [] })}>모두 풀기</Button>
        </div>
        <Button className="mt-3 w-full" disabled={!picked.length} onClick={() => void copy()}>{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : `고른 ${picked.length}개 복사`}</Button>
        <p className="mt-2 text-[.72rem] leading-5 text-ink-4">한 줄에 하나씩 복사돼요. 단어 시험지 탭의 ‘단어 붙여 넣기’에 넣고 뜻을 채우면 돼요.</p>
      </Card>
    </>}>
      <section className={panelClass}>
        <h2 className="mb-2 text-sm font-extrabold text-ink">낱말 빈도 <span className="text-[.72rem] font-medium text-ink-4">{words.length}개 · 누르면 골라져요</span></h2>
        <div className="flex flex-wrap gap-1.5">
          {words.map(item => <button key={item.word} type="button" aria-pressed={picked.includes(item.word)} onClick={() => toggle(item.word)} className={chipClass(picked.includes(item.word))}>{item.word} <span className="text-[.7rem] opacity-70">×{item.count}</span></button>)}
        </div>
        {!words.length && <p className="text-[.8rem] text-ink-4">지문을 넣어 주세요.</p>}
      </section>
      <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="어휘표 제목 (예: Lesson 1 Read 어휘)" aria-label="어휘표 제목" className={fieldClass} />
      <SheetPreview id="english-passage-vocab-print" empty="지문을 넣어 주세요." html={sheetWords.length ? vocabListHtml(sheetWords, state.title, "screen") : null}
        clipboard={() => ({ text: vocabListText(sheetWords, state.title), html: vocabListHtml(sheetWords, state.title, "clipboard") })} />
    </ToolLayout>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, Circle, PencilLine, Plus, Trash2, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chunksOf, plainOf, posLabels, sentenceIssues, type JapaneseGrammar, type JapaneseSentence, type JapaneseWord } from "@/features/japanese/text";
import { IssueList } from "./hanmun-sentence";

export type EditableSentence = JapaneseSentence & { id: string; checked: boolean };

/** 일본어 한 문장을 후리가나·끊어 읽기를 골라 보여 줍니다. 수업 화면과 풀이 카드가 함께 씁니다. */
export function JapaneseLine({ ruby, furigana, spaced, className, accent = "text-brand-dark" }: { ruby: string; furigana: boolean; spaced: boolean; className?: string; accent?: string }) {
  const chunks = chunksOf(ruby);
  return (
    <p lang="ja" className={cn("font-ja break-all leading-[2.1] [&_rt]:text-[.45em] [&_rt]:font-normal [&_rt]:text-ink-4", className)}>
      {chunks.map((chunk, chunkIndex) => (
        <span key={chunkIndex} className="inline">
          {chunkIndex > 0 && spaced && <span aria-hidden="true" className={cn("mx-[.18em] font-sans font-light opacity-50", accent)}>/</span>}
          {chunk.map((token, tokenIndex) => token.kind === "ruby"
            ? furigana ? <ruby key={tokenIndex}>{token.base}<rt>{token.reading}</rt></ruby> : <span key={tokenIndex}>{token.base}</span>
            : <span key={tokenIndex}>{token.text}</span>)}
        </span>
      ))}
    </p>
  );
}

const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const labelClass = "block text-[.78rem] font-bold text-ink-3";
const emptyWord: JapaneseWord = { word: "", reading: "", meaning: "", pos: "명사" };
const emptyGrammar: JapaneseGrammar = { pattern: "", surface: "", meaning: "" };

function SentenceEditor({ sentence, onChange }: { sentence: EditableSentence; onChange: (next: EditableSentence) => void }) {
  const update = (patch: Partial<EditableSentence>) => onChange({ ...sentence, ...patch, checked: false });
  const setWord = (index: number, patch: Partial<JapaneseWord>) => update({ words: sentence.words.map((word, position) => position === index ? { ...word, ...patch } : word) });
  const setGrammar = (index: number, patch: Partial<JapaneseGrammar>) => update({ grammar: sentence.grammar.map((item, position) => position === index ? { ...item, ...patch } : item) });
  return (
    <div className="space-y-3 rounded-xl border border-brand/15 bg-brand-page/50 p-3.5">
      <label className={labelClass}>후리가나 표기 <span className="font-semibold text-ink-5">한자는 {"{"}漢字|かんじ{"}"}, 끊어 읽는 곳은 / 로</span>
        <textarea lang="ja" value={sentence.ruby} rows={2} maxLength={500} onChange={event => update({ ruby: event.target.value })} className={cn(fieldClass, "font-ja mt-1 resize-y text-[1.05rem]")} />
      </label>
      <label className={labelClass}>해석
        <textarea value={sentence.translation} rows={2} maxLength={500} onChange={event => update({ translation: event.target.value })} className={cn(fieldClass, "mt-1 resize-y")} />
      </label>
      <fieldset>
        <legend className={labelClass}>문법 <span className="font-semibold text-ink-5">쓰인 글자는 문장에 나온 그대로 적어야 빈칸 문제가 만들어져요</span></legend>
        <div className="mt-1 space-y-1.5">
          {sentence.grammar.map((item, index) => (
            <div key={index} className="grid grid-cols-[5.5rem_5.5rem_minmax(0,1fr)_auto] gap-1.5">
              <input aria-label="문형" placeholder="〜ています" value={item.pattern} maxLength={30} onChange={event => setGrammar(index, { pattern: event.target.value })} className={cn(fieldClass, "font-ja px-2")} />
              <input aria-label="쓰인 글자" placeholder="ています" value={item.surface} maxLength={20} onChange={event => setGrammar(index, { surface: event.target.value })} className={cn(fieldClass, "font-ja px-2")} />
              <input aria-label="뜻" value={item.meaning} maxLength={120} onChange={event => setGrammar(index, { meaning: event.target.value })} className={cn(fieldClass, "px-2")} />
              <button type="button" onClick={() => update({ grammar: sentence.grammar.filter((_, position) => position !== index) })} className="grid min-h-10 w-9 place-items-center rounded-xl text-ink-5 hover:bg-surface hover:text-danger" aria-label={`${item.pattern || "문법"} 지우기`}><X size={15} /></button>
            </div>
          ))}
          {sentence.grammar.length < 4 && <Button type="button" variant="ghost" size="sm" onClick={() => update({ grammar: [...sentence.grammar, emptyGrammar] })}><Plus size={14} /> 문법 추가</Button>}
        </div>
      </fieldset>
      <fieldset>
        <legend className={labelClass}>낱말</legend>
        <div className="mt-1 space-y-1.5">
          {sentence.words.map((word, index) => (
            <div key={index} className="grid grid-cols-[5rem_6rem_minmax(0,1fr)_5.2rem_auto] gap-1.5">
              <input aria-label="낱말" value={word.word} maxLength={20} onChange={event => setWord(index, { word: event.target.value })} className={cn(fieldClass, "font-ja px-2")} />
              <input aria-label="읽기" value={word.reading} maxLength={30} onChange={event => setWord(index, { reading: event.target.value })} className={cn(fieldClass, "font-ja px-2")} />
              <input aria-label="뜻" value={word.meaning} maxLength={80} onChange={event => setWord(index, { meaning: event.target.value })} className={cn(fieldClass, "px-2")} />
              <select aria-label="품사" value={word.pos} onChange={event => setWord(index, { pos: event.target.value as JapaneseWord["pos"] })} className={cn(fieldClass, "px-1.5 text-xs")}>
                {posLabels.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
              <button type="button" onClick={() => update({ words: sentence.words.filter((_, position) => position !== index) })} className="grid min-h-10 w-9 place-items-center rounded-xl text-ink-5 hover:bg-surface hover:text-danger" aria-label={`${word.word || "낱말"} 지우기`}><X size={15} /></button>
            </div>
          ))}
          {sentence.words.length < 8 && <Button type="button" variant="ghost" size="sm" onClick={() => update({ words: [...sentence.words, emptyWord] })}><Plus size={14} /> 낱말 추가</Button>}
        </div>
      </fieldset>
    </div>
  );
}

/** 풀이 한 문장을 보여 주고 고칠 수 있게 합니다. 고치면 검토 완료 표시가 풀립니다. */
export function SentenceCard({ sentence, number, onChange, onDelete, onSpeak }: { sentence: EditableSentence; number: number; onChange: (next: EditableSentence) => void; onDelete: () => void; onSpeak: (text: string) => void }) {
  // 새로 추가한 빈 문장은 바로 입력할 수 있게 열어 둡니다.
  const [editing, setEditing] = useState(!sentence.ruby.trim());
  const issues = sentenceIssues(sentence);
  const hasError = issues.some(issue => issue.level === "error");
  return (
    <article className={cn("space-y-3 rounded-[18px] border bg-surface p-4 shadow-[var(--lift-1)] sm:p-5", sentence.checked ? "border-ok/30" : "border-line")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-brand-page px-2.5 py-1 text-[.74rem] font-bold text-brand-dark">{number}번 문장</span>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => onSpeak(plainOf(sentence.ruby))} aria-label={`${number}번 문장 듣기`} title="문장 듣기"><Volume2 size={15} /></Button>
          <Button variant={editing ? "secondary" : "ghost"} size="sm" onClick={() => setEditing(value => !value)}><PencilLine size={15} /> {editing ? "고치기 닫기" : "고치기"}</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`${number}번 문장 지우기`}><Trash2 size={15} /></Button>
          <Button variant={sentence.checked ? "secondary" : "ghost"} size="sm" disabled={hasError && !sentence.checked} title={hasError ? "형식 오류를 먼저 고쳐 주세요" : undefined}
            onClick={() => onChange({ ...sentence, checked: !sentence.checked })} className={cn(sentence.checked && "border-ok/30 text-ok hover:text-ok")}>
            {sentence.checked ? <CheckCircle2 size={15} /> : <Circle size={15} />} 검토 완료
          </Button>
        </div>
      </div>
      <JapaneseLine ruby={sentence.ruby} furigana spaced={false} className="text-[1.55rem] text-ink" />
      <dl className="grid gap-x-4 gap-y-1.5 text-[.9rem] leading-7 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
        <dt className="font-bold text-ink-4">해석</dt><dd className="break-keep text-ink">{sentence.translation || <span className="text-ink-5">없음</span>}</dd>
        {sentence.grammar.length > 0 && <>
          <dt className="font-bold text-ink-4">문법</dt>
          <dd className="space-y-0.5">{sentence.grammar.map((item, index) => <p key={index} className="break-keep text-ink-2"><span lang="ja" className="font-ja font-bold text-brand-dark">{item.pattern || item.surface}</span> <span className="text-ink-3">{item.meaning}</span></p>)}</dd>
        </>}
      </dl>
      {sentence.words.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {sentence.words.map((word, index) => (
            <li key={index} className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 text-[.82rem] leading-5">
              <span lang="ja" className="font-ja text-[1.05rem] font-bold text-ink">{word.word}</span>
              {word.reading && word.reading !== word.word && <span lang="ja" className="font-ja ml-1 text-ink-4">{word.reading}</span>}
              <span className="ml-1.5 text-ink-2">{word.meaning}</span>
              <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[.68rem] font-bold text-ink-4">{word.pos}</span>
            </li>
          ))}
        </ul>
      )}
      <IssueList issues={issues} />
      {editing && <SentenceEditor sentence={sentence} onChange={onChange} />}
    </article>
  );
}

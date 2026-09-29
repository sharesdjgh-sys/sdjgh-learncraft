"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Circle, PencilLine, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { alignReading, hanjaOf, orderIssue, parseOrder, readingText, segmentsOf, sentenceIssues, wordKinds, type HanmunSentence, type HanmunWord, type Issue } from "@/features/hanmun/content";

export type EditableSentence = HanmunSentence & { id: string; checked: boolean };

type LineToken = { kind: "han"; text: string; reading?: string } | { kind: "to" | "mark"; text: string };

// 현토문을 화면에 그릴 조각으로 풉니다. 독음이 한자 수와 맞으면 글자마다 붙입니다.
function lineSegments(sentence: Pick<HanmunSentence, "hyeonto" | "reading">): LineToken[][] {
  const aligned = alignReading(sentence.hyeonto, sentence.reading);
  let index = 0;
  return segmentsOf(sentence.hyeonto).map(segment => segment.flatMap(token => token.kind === "han"
    ? [...token.text].map(char => ({ kind: "han" as const, text: char, reading: aligned?.[index++] }))
    : [token]));
}

/** 한문 한 문장을 끊어 읽기·토·독음을 골라 보여 줍니다. 수업 화면과 풀이 카드가 함께 씁니다. */
export function HanmunLine({ sentence, slash, to, reading, className, accent = "text-brand-dark" }: { sentence: Pick<HanmunSentence, "hyeonto" | "reading">; slash: boolean; to: boolean; reading: boolean; className?: string; accent?: string }) {
  const segments = lineSegments(sentence);
  return (
    <p lang="ko" className={cn("font-learning break-all leading-[2.1] tracking-[.04em] [&_rt]:font-sans [&_rt]:text-[.4em] [&_rt]:font-semibold [&_rt]:tracking-normal [&_rt]:text-ink-4", className)}>
      {segments.map((segment, segmentIndex) => (
        <span key={segmentIndex} className="inline">
          {segmentIndex > 0 && (slash ? <span aria-hidden="true" className={cn("mx-[.3em] font-sans font-light opacity-60", accent)}>/</span> : to ? " " : null)}
          <span className="whitespace-nowrap">
            {segment.map((token, tokenIndex) => token.kind === "han"
              ? reading && token.reading ? <ruby key={tokenIndex}>{token.text}<rt>{token.reading}</rt></ruby> : <span key={tokenIndex}>{token.text}</span>
              : token.kind === "to" ? (to ? <span key={tokenIndex} className={cn("font-sans text-[.58em] font-bold", accent)}>{token.text}</span> : null)
                : <span key={tokenIndex}>{token.text}</span>)}
          </span>
        </span>
      ))}
    </p>
  );
}

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="space-y-1">
      {issues.map(issue => (
        <li key={issue.text} className={cn("flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[.8rem] font-semibold leading-5", issue.level === "error" ? "bg-[var(--danger-page)] text-danger" : "bg-[var(--warn-page)] text-warn")}>
          {issue.level === "error" ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />} {issue.text}
        </li>
      ))}
    </ul>
  );
}

const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const labelClass = "block text-[.78rem] font-bold text-ink-3";
const emptyWord: HanmunWord = { term: "", reading: "", meaning: "", kind: "word" };

function SentenceEditor({ sentence, onChange }: { sentence: EditableSentence; onChange: (next: EditableSentence) => void }) {
  const [orderText, setOrderText] = useState(sentence.order?.join(" ") ?? "");
  const han = hanjaOf(sentence.hyeonto);
  const update = (patch: Partial<EditableSentence>) => onChange({ ...sentence, ...patch, checked: false });
  const orderInvalid = orderText.trim() && !parseOrder(orderText);
  const setWord = (index: number, patch: Partial<HanmunWord>) => update({ words: sentence.words.map((word, position) => position === index ? { ...word, ...patch } : word) });
  return (
    <div className="space-y-3 rounded-xl border border-brand/15 bg-brand-page/50 p-3.5">
      <label className={labelClass}>현토문 <span className="font-semibold text-ink-5">끊어 읽는 곳은 띄어 쓰고, 토는 한자 바로 뒤에 한글로</span>
        <textarea lang="ko" value={sentence.hyeonto} rows={2} maxLength={400} onChange={event => update({ hyeonto: event.target.value })} className={cn(fieldClass, "font-learning mt-1 resize-y text-[1.05rem]")} />
      </label>
      <label className={labelClass}>독음 <span className="font-semibold text-ink-5">한자 {han.length}자에 한글 한 글자씩 · 토는 빼고</span>
        <input value={sentence.reading} maxLength={400} onChange={event => update({ reading: event.target.value })} className={cn(fieldClass, "mt-1")} />
      </label>
      <label className={labelClass}>풀이 순서 <span className="font-semibold text-ink-5">(선택) 한자마다 번호를 띄어 쓰기 · 따로 풀지 않는 글자는 0</span>
        <input value={orderText} maxLength={200} placeholder="예: 2 1" onChange={event => { setOrderText(event.target.value); update({ order: parseOrder(event.target.value) }); }} className={cn(fieldClass, "mt-1 tabular-nums", orderInvalid && "border-danger/50")} />
      </label>
      {sentence.order && !orderIssue(sentence.order, han.length) && (
        <p className="font-learning flex flex-wrap gap-1.5 text-[.95rem]">{han.map((char, index) => <span key={index} className="rounded-md bg-surface px-1.5 py-0.5 shadow-[var(--lift-1)]">{char}<sub className="ml-0.5 font-sans text-[.7em] font-bold text-brand">{sentence.order![index] || "–"}</sub></span>)}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>직역
          <textarea value={sentence.literal} rows={2} maxLength={600} onChange={event => update({ literal: event.target.value })} className={cn(fieldClass, "mt-1 resize-y")} />
        </label>
        <label className={labelClass}>의역
          <textarea value={sentence.free} rows={2} maxLength={600} onChange={event => update({ free: event.target.value })} className={cn(fieldClass, "mt-1 resize-y")} />
        </label>
      </div>
      <label className={labelClass}>구조·구문 포인트
        <input value={sentence.point} maxLength={300} onChange={event => update({ point: event.target.value })} className={cn(fieldClass, "mt-1")} />
      </label>
      <fieldset>
        <legend className={labelClass}>어휘·허사</legend>
        <div className="mt-1 space-y-1.5">
          {sentence.words.map((word, index) => (
            <div key={index} className="grid grid-cols-[4.5rem_4rem_minmax(0,1fr)_auto_auto] gap-1.5">
              <input aria-label="한자" value={word.term} maxLength={12} onChange={event => setWord(index, { term: event.target.value })} className={cn(fieldClass, "font-learning px-2")} />
              <input aria-label="독음" value={word.reading} maxLength={12} onChange={event => setWord(index, { reading: event.target.value })} className={cn(fieldClass, "px-2")} />
              <input aria-label="뜻" value={word.meaning} maxLength={160} onChange={event => setWord(index, { meaning: event.target.value })} className={cn(fieldClass, "px-2")} />
              <button type="button" onClick={() => setWord(index, { kind: word.kind === "word" ? "function" : "word" })} title="어휘·허사 바꾸기"
                className={cn("min-h-10 rounded-xl border px-2.5 text-xs font-bold", word.kind === "function" ? "border-brand/30 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-3")}>{wordKinds[word.kind]}</button>
              <button type="button" onClick={() => update({ words: sentence.words.filter((_, position) => position !== index) })} className="grid min-h-10 w-9 place-items-center rounded-xl text-ink-5 hover:bg-surface hover:text-danger" aria-label={`${word.term || "어휘"} 지우기`}><X size={15} /></button>
            </div>
          ))}
          {sentence.words.length < 10 && <Button type="button" variant="ghost" size="sm" onClick={() => update({ words: [...sentence.words, emptyWord] })}><Plus size={14} /> 어휘 추가</Button>}
        </div>
      </fieldset>
    </div>
  );
}

/** 풀이 한 문장을 보여 주고 고칠 수 있게 합니다. 고치면 검토 완료 표시가 풀립니다. */
export function SentenceCard({ sentence, number, onChange, onDelete }: { sentence: EditableSentence; number: number; onChange: (next: EditableSentence) => void; onDelete: () => void }) {
  // 새로 추가한 빈 문장은 바로 입력할 수 있게 열어 둡니다.
  const [editing, setEditing] = useState(!sentence.hyeonto.trim());
  const issues = sentenceIssues(sentence);
  const hasError = issues.some(issue => issue.level === "error");
  const reading = readingText(sentence, true);
  return (
    <article className={cn("space-y-3 rounded-[18px] border bg-surface p-4 shadow-[var(--lift-1)] sm:p-5", sentence.checked ? "border-ok/30" : "border-line")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-brand-page px-2.5 py-1 text-[.74rem] font-bold text-brand-dark">{number}번 문장 · 한자 {hanjaOf(sentence.hyeonto).length}자</span>
        <div className="flex flex-wrap gap-1.5">
          <Button variant={editing ? "secondary" : "ghost"} size="sm" onClick={() => setEditing(value => !value)}><PencilLine size={15} /> {editing ? "고치기 닫기" : "고치기"}</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`${number}번 문장 지우기`}><Trash2 size={15} /></Button>
          <Button variant={sentence.checked ? "secondary" : "ghost"} size="sm" disabled={hasError && !sentence.checked} title={hasError ? "형식 오류를 먼저 고쳐 주세요" : undefined}
            onClick={() => onChange({ ...sentence, checked: !sentence.checked })} className={cn(sentence.checked && "border-ok/30 text-ok hover:text-ok")}>
            {sentence.checked ? <CheckCircle2 size={15} /> : <Circle size={15} />} 검토 완료
          </Button>
        </div>
      </div>
      <HanmunLine sentence={sentence} slash={false} to reading className="text-[1.65rem] text-ink" />
      <dl className="grid gap-x-4 gap-y-1.5 text-[.9rem] leading-7 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
        <dt className="font-bold text-ink-4">독음</dt><dd className="text-ink-2">{reading || <span className="text-ink-5">없음</span>}</dd>
        <dt className="font-bold text-ink-4">직역</dt><dd className="break-keep text-ink">{sentence.literal || <span className="text-ink-5">없음</span>}</dd>
        {sentence.free && sentence.free !== sentence.literal && <><dt className="font-bold text-ink-4">의역</dt><dd className="break-keep text-ink-2">{sentence.free}</dd></>}
        {sentence.point && <><dt className="font-bold text-ink-4">구조</dt><dd className="break-keep text-ink-3">{sentence.point}</dd></>}
      </dl>
      {sentence.words.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {sentence.words.map((word, index) => (
            <li key={index} className={cn("rounded-xl border px-2.5 py-1.5 text-[.82rem] leading-5", word.kind === "function" ? "border-brand/20 bg-brand-page" : "border-line bg-surface-2")}>
              <span className="font-learning text-[1.05rem] font-bold text-ink">{word.term}</span>
              {word.reading && <span className="ml-1 text-ink-4">{word.reading}</span>}
              <span className="ml-1.5 text-ink-2">{word.meaning}</span>
              {word.kind === "function" && <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[.68rem] font-bold text-brand-dark">허사</span>}
            </li>
          ))}
        </ul>
      )}
      <IssueList issues={issues} />
      {editing && <SentenceEditor sentence={sentence} onChange={onChange} />}
    </article>
  );
}

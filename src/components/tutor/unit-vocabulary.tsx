"use client";

import { useState } from "react";
import { ArrowDown, BookOpen, ChevronDown, Send } from "lucide-react";

type VocabularySection = { id: string; title: string; terms: string[] };

export function UnitVocabulary({ title, chapters, chapterId, sections, disabled, onChapter, onTerm, onQuestion }: {
  title: string; chapters: { id: string; chapterTitle: string }[]; chapterId: string;
  sections: VocabularySection[]; disabled: boolean;
  onChapter: (id: string) => void; onTerm: (term: string) => void; onQuestion: (term: string) => void;
}) {
  const [word, setWord] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const termCount = new Set(sections.flatMap(section => section.terms)).size;

  return <section aria-label="교과 핵심 어휘" className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm sm:rounded-3xl">
    <header className="border-b border-line px-5 pb-6 pt-6 sm:px-7 sm:pt-7">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-brand-dark">
        <BookOpen size={15} className="text-brand" aria-hidden="true" />
        <span>교과 핵심 어휘</span>
      </div>
      <h2 className="text-[1.4rem] font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-3">궁금하거나 잘 모르는 단어를 클릭해 뜻을 알아보세요.</p>
      <label className="mt-5 block max-w-md">
        <span className="mb-2 block text-xs font-semibold text-ink-4">다른 대단원 보기</span>
        <span className="relative block">
          <select aria-label="어휘를 볼 대단원" value={chapterId} disabled={disabled} onChange={event => onChapter(event.target.value)} className="min-h-12 w-full appearance-none rounded-xl border border-line bg-surface-2 py-3 pl-4 pr-10 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
            {chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.chapterTitle}</option>)}
          </select>
          <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-4" />
        </span>
      </label>
    </header>

    <div className="px-5 py-6 sm:px-7">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink">소단원별 주요 어휘</h3>
          <p className="mt-1 text-xs leading-5 text-ink-4">단어를 클릭하면 AI가 쉽게 설명해 줘요.</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-page px-2.5 py-1 text-xs font-semibold text-brand-dark">{termCount}개</span>
      </div>
      <ol aria-label={`${title} 주요 어휘`} className="space-y-1">
        {sections.map((section, index) => <li key={section.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
          {index < sections.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[.9375rem] top-8 w-px bg-line" />}
          <span className="relative z-[1] flex size-8 items-center justify-center rounded-full border border-brand/20 bg-brand-page text-xs font-bold tabular-nums text-brand-dark">{index + 1}</span>
          <div className="min-w-0 pt-1">
            <h4 className="text-sm font-semibold leading-6 text-ink-2">{section.title}</h4>
            {section.terms.length ? <div className="mt-2 flex flex-wrap gap-2">
              {section.terms.map(term => <button key={term} type="button" disabled={disabled} aria-pressed={selectedTerm === term}
                onClick={() => { setSelectedTerm(term); onTerm(term); }}
                className={`inline-flex min-h-10 items-center rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-[.98] focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50 ${selectedTerm === term ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:-translate-y-px hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark"}`}>
                {term}
              </button>)}
            </div> : <p className="mt-1 text-xs leading-5 text-ink-4">정리된 주요 어휘가 아직 없어요.</p>}
          </div>
        </li>)}
      </ol>
      {!sections.length && <p className="rounded-xl bg-surface-2 px-4 py-5 text-sm leading-6 text-ink-3">아직 정리된 어휘가 없어요. 아래에서 궁금한 단어를 물어보세요.</p>}
      {selectedTerm && <p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-brand-dark"><ArrowDown size={13} aria-hidden="true" />‘{selectedTerm}’ 설명은 아래 대화에서 확인하세요.</p>}
    </div>

    <form onSubmit={event => { event.preventDefault(); const term = word.trim(); if (!term || disabled) return; onQuestion(term); setWord(""); }} className="border-t border-line bg-surface-2 px-5 py-5 sm:px-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
        <label htmlFor="vocabulary-question" className="text-sm font-semibold text-ink-2">다른 단어가 궁금한가요?</label>
        <span className="text-xs text-ink-4">직접 질문은 질문 1회 사용</span>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
        <input id="vocabulary-question" aria-label="궁금한 단어" maxLength={80} value={word} onChange={event => setWord(event.target.value)} disabled={disabled} placeholder="궁금한 단어를 적어주세요" className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-4" />
        <button type="submit" disabled={disabled || !word.trim()} aria-label="단어 질문하기" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-brand px-3 text-white transition-colors hover:bg-brand-dark disabled:bg-surface-3 disabled:text-ink-4"><Send size={17} /></button>
      </div>
    </form>
  </section>;
}

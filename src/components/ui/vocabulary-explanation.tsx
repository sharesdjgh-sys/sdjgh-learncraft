import { Fragment } from "react";
import { AlertCircle, BookOpenText, ChevronDown, CircleHelp, Lightbulb, Sparkles } from "lucide-react";
import { LearningMath } from "@/components/ui/learning-math";

type VocabularyCardData = {
  term: string;
  oneLineMeaning: string;
  story: string;
  example: { sentence: string; meaning: string };
  memoryCue: string | null;
  caution: string | null;
  quickCheck: string;
  quickCheckAnswer: string;
};

function VocabularyText({ children }: { children: string }) {
  const parts = children.split(/(\$(?!\$)[^$\r\n]+\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      return <LearningMath key={`${index}:${part}`} expression={part.slice(1, -1).trim()} />;
    }
    return <Fragment key={`${index}:${part}`}>{part}</Fragment>;
  });
}

function isVocabularyCardData(value: unknown): value is VocabularyCardData {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<VocabularyCardData>;
  return typeof card.term === "string"
    && typeof card.oneLineMeaning === "string"
    && typeof card.story === "string"
    && typeof card.example?.sentence === "string"
    && typeof card.example.meaning === "string"
    && (card.memoryCue === null || typeof card.memoryCue === "string")
    && (card.caution === null || typeof card.caution === "string")
    && typeof card.quickCheck === "string"
    && typeof card.quickCheckAnswer === "string";
}

export function VocabularyExplanation({ source }: { source: string }) {
  let card: VocabularyCardData | null = null;
  try {
    const parsed: unknown = JSON.parse(source);
    if (isVocabularyCardData(parsed)) card = parsed;
  } catch {
    card = null;
  }

  if (!card) return <p className="my-3 leading-[1.82] text-ink-3">어휘 설명을 표시하지 못했어요. 다시 요청해 주세요.</p>;

  return (
    <section aria-label={`${card.term} 어휘 설명`} className="my-4 overflow-hidden rounded-2xl border border-brand/20 bg-surface shadow-[var(--lift-1)]">
      <header className="relative overflow-hidden bg-[linear-gradient(135deg,var(--brand-page),var(--surface))] px-5 py-5 sm:px-6">
        <div className="absolute -right-8 -top-10 size-28 rounded-full bg-brand/10 blur-2xl" />
        <p className="relative flex items-center gap-1.5 text-[.72rem] font-bold text-brand">
          <Sparkles size={14} aria-hidden="true" /> 한눈에 뜻잡기
        </p>
        <h2 className="relative mt-1.5 text-2xl font-extrabold tracking-[-0.03em] text-ink">{card.term}</h2>
        <p className="relative mt-3 max-w-3xl text-[.95rem] font-semibold leading-7 text-brand-dark sm:text-base"><VocabularyText>{card.oneLineMeaning}</VocabularyText></p>
      </header>

      <div className="grid gap-px bg-line sm:grid-cols-2">
        <article className="bg-surface px-5 py-4 sm:px-6">
          <p className="flex items-center gap-2 text-[.75rem] font-extrabold text-ink-3">
            <BookOpenText size={15} className="text-brand" aria-hidden="true" /> 머릿속에 그려 보기
          </p>
          <p className="mt-2 text-[.88rem] leading-6 text-ink-2"><VocabularyText>{card.story}</VocabularyText></p>
        </article>
        <article className="bg-surface px-5 py-4 sm:px-6">
          <p className="text-[.75rem] font-extrabold text-ink-3">단원 속 한 문장</p>
          <p className="mt-2 rounded-xl bg-brand-soft/55 px-3.5 py-3 text-[.88rem] font-bold leading-6 text-ink">“<VocabularyText>{card.example.sentence}</VocabularyText>”</p>
          <p className="mt-2 text-[.78rem] leading-5 text-ink-4">여기서는 <VocabularyText>{card.example.meaning}</VocabularyText></p>
        </article>
      </div>

      {(card.memoryCue || card.caution) && (
        <div className="grid gap-2 border-t border-line bg-surface-2 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {card.memoryCue && (
            <div className="rounded-xl border border-[#eadfb8] bg-[#fffaf0] px-4 py-3">
              <p className="flex items-center gap-1.5 text-[.72rem] font-extrabold text-[#806426]"><Lightbulb size={14} aria-hidden="true" /> 기억 단서</p>
              <p className="mt-1.5 text-[.8rem] leading-5 text-ink-3"><VocabularyText>{card.memoryCue}</VocabularyText></p>
            </div>
          )}
          {card.caution && (
            <div className="rounded-xl border border-[#ecd6d1] bg-[#fff7f5] px-4 py-3">
              <p className="flex items-center gap-1.5 text-[.72rem] font-extrabold text-[#9a5143]"><AlertCircle size={14} aria-hidden="true" /> 헷갈림 주의</p>
              <p className="mt-1.5 text-[.8rem] leading-5 text-ink-3"><VocabularyText>{card.caution}</VocabularyText></p>
            </div>
          )}
        </div>
      )}

      <footer className="border-t border-brand/15 bg-brand-page px-5 py-4 sm:px-6">
        <div className="flex gap-3">
          <CircleHelp size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[.72rem] font-extrabold text-brand-dark">30초 확인</p>
            <p className="mt-1 text-[.84rem] font-semibold leading-6 text-ink-2"><VocabularyText>{card.quickCheck}</VocabularyText></p>
          </div>
        </div>
        <details className="group mt-3 overflow-hidden rounded-xl border border-brand/15 bg-surface">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-[.78rem] font-bold text-brand-dark focus-visible:outline-2 focus-visible:outline-brand">
            <span>정답 보기</span>
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-line px-4 py-3 text-[.82rem] leading-6 text-ink-2">
            <VocabularyText>{card.quickCheckAnswer}</VocabularyText>
          </div>
        </details>
      </footer>
    </section>
  );
}

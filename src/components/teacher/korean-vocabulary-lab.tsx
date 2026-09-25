"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, BookA, BookOpenText, ChevronDown, Clock3, Lightbulb, LoaderCircle, MessageCircleQuestion, Mic, RefreshCw, Search, ShieldCheck, Sparkles, Stars } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { etymologyConfidenceLabels, type KoreanEtymology } from "@/features/vocabulary/etymology";

type Course = { code: string; title: string };
type Chapter = { id: string; title: string; sections: { id: string; title: string; terms: string[] }[] };
type Selection = { term: string; unitId?: string };

const endpoint = "/api/teacher/korean-vocabulary";
const textScales = [90, 100, 115, 130, 150] as const;
const defaultTextScale = 115;
const textScaleKey = "learncraft_etymology_text_scale";
const confidenceStyle: Record<KoreanEtymology["confidence"], string> = {
  certain: "border-[#cfe5d6] bg-[#f3fbf5] text-[#2f7048]",
  common: "border-brand/15 bg-brand-page text-brand-dark",
  disputed: "border-[#eadfb8] bg-[#fffaf0] text-[#806426]",
  uncertain: "border-[#ecd6d1] bg-[#fff7f5] text-[#9a5143]",
};

const textScaleListeners = new Set<() => void>();
let memoryTextScale: number = defaultTextScale;
function readTextScale() {
  try {
    const saved = Number(window.localStorage.getItem(textScaleKey));
    return (textScales as readonly number[]).includes(saved) ? saved : memoryTextScale;
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문 동안의 선택을 씁니다.
    return memoryTextScale;
  }
}
function subscribeTextScale(listener: () => void) {
  textScaleListeners.add(listener);
  return () => { textScaleListeners.delete(listener); };
}
function changeTextScale(next: number) {
  memoryTextScale = next;
  try { window.localStorage.setItem(textScaleKey, String(next)); } catch { /* 현재 화면에는 그대로 적용됩니다. */ }
  textScaleListeners.forEach(listener => listener());
}

async function readJson<T>(response: Response) {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}

function Section({ icon: Icon, title, children, className }: { icon: typeof BookA; title: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("bg-surface px-5 py-4 sm:px-6", className)}>
      <h3 className="flex items-center gap-2 text-[.8em] font-extrabold text-ink-3"><Icon size={15} className="text-brand" aria-hidden="true" /> {title}</h3>
      <div className="mt-2 break-keep text-[.94em] leading-[1.75] text-ink-2">{children}</div>
    </article>
  );
}

function EtymologyCard({ term, card }: { term: string; card: KoreanEtymology }) {
  return (
    <section aria-label={`${term} 어원 카드`} className="overflow-hidden rounded-2xl border border-brand/20 bg-surface shadow-[var(--lift-1)]">
      <header className="bg-[linear-gradient(135deg,var(--brand-page),var(--surface))] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[.74em] font-bold">
          <span className="rounded-full bg-brand px-2.5 py-1 text-white">{card.wordType}</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1", confidenceStyle[card.confidence])}><ShieldCheck size={13} aria-hidden="true" /> {etymologyConfidenceLabels[card.confidence]}</span>
        </div>
        <h2 className="mt-3 text-[2em] font-extrabold tracking-[-0.03em] text-ink">
          {term}{card.original && <span className="ml-3 text-[.7em] font-bold text-brand-dark">{card.original}</span>}
        </h2>
        {card.parts.length > 0 && (
          <ol aria-label="글자 풀이" className="mt-4 flex flex-wrap items-stretch gap-2">
            {card.parts.map((part, index) => (
              <li key={`${index}:${part.text}`} className="flex min-w-[4.5em] flex-col items-center rounded-xl border border-brand/15 bg-surface px-3 py-2 text-center shadow-[var(--lift-1)]">
                <span className="text-[1.6em] font-bold leading-tight text-ink">{part.text}</span>
                <span className="mt-1 text-[.78em] font-semibold text-brand-dark">{part.gloss}{part.sound ? ` ${part.sound}` : ""}</span>
              </li>
            ))}
          </ol>
        )}
      </header>

      <div className="grid gap-px bg-line">
        <Section icon={BookA} title="어원 요약">
          <p><strong className="text-ink">원래 뜻</strong> · {card.summary.originalMeaning}</p>
          <p className="mt-1.5"><strong className="text-ink">뜻의 변화</strong> · {card.summary.meaningShift}</p>
        </Section>
        {card.story && <Section icon={Clock3} title="역사 속 이야기"><p>{card.story}</p></Section>}
        <Section icon={BookOpenText} title="오늘날 쓰임">
          <p>{card.today.meaning}</p>
          <ul className="mt-2 space-y-1.5">
            {card.today.examples.map(example => <li key={example} className="rounded-xl bg-brand-soft/55 px-3.5 py-2.5 font-semibold text-ink">“{example}”</li>)}
          </ul>
        </Section>
        {card.points.length > 0 && (
          <Section icon={Lightbulb} title="알아두면 흥미로운 포인트">
            <ul className="list-disc space-y-1 pl-5 marker:text-brand">{card.points.map(point => <li key={point}>{point}</li>)}</ul>
          </Section>
        )}
        {card.relatedWords.length > 0 && (
          <Section icon={Stars} title="함께 보면 재미있는 단어들">
            <ul className="grid gap-2 sm:grid-cols-2">
              {card.relatedWords.map(item => (
                <li key={item.word} className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
                  <strong className="text-ink">{item.word}</strong>
                  <p className="mt-0.5 text-[.9em] leading-6 text-ink-3">{item.point}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <footer className="grid gap-px border-t border-brand/15 bg-line sm:grid-cols-2">
        <Section icon={MessageCircleQuestion} title="수업 도입 질문" className="bg-brand-page"><p className="font-semibold text-ink">{card.classroomHook}</p></Section>
        <Section icon={Mic} title="학생에게 이렇게 말해 보세요" className="bg-brand-page"><p>{card.teacherScript}</p></Section>
      </footer>
      <p className={cn("flex gap-2 border-t px-5 py-3 text-[.8em] leading-6 sm:px-6", confidenceStyle[card.confidence])}>
        <AlertCircle size={15} className="mt-1 shrink-0" aria-hidden="true" />
        <span>{card.confidenceNote} 수업 전에 표준국어대사전으로 한 번 더 확인해 주세요.</span>
      </p>
    </section>
  );
}

export function KoreanVocabularyLab() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [course, setCourse] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [listError, setListError] = useState("");
  const [word, setWord] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [card, setCard] = useState<KoreanEtymology | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textScale = useSyncExternalStore(subscribeTextScale, readTextScale, () => defaultTextScale);
  const requestRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(endpoint).then(readJson<{ courses: Course[] }>).then(data => {
      setCourses(data.courses);
      if (data.courses[0]) setCourse(data.courses[0].code);
    }).catch((reason: Error) => { setCourses([]); setListError(reason.message); });
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!course) return;
    let active = true;
    fetch(`${endpoint}?course=${encodeURIComponent(course)}`).then(readJson<{ chapters: Chapter[] }>).then(data => {
      if (!active) return;
      setChapters(data.chapters);
      setChapterId(data.chapters[0]?.id ?? "");
      setListError("");
    }).catch((reason: Error) => { if (active) { setChapters([]); setListError(reason.message); } });
    return () => { active = false; };
  }, [course]);

  async function lookup(next: Selection, regenerate = false) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSelection(next);
    // 새 어휘를 고르면 카드 첫머리로 이동합니다. 전역 smooth 스크롤은 로딩 중 높이 변화로 끊기므로 즉시 이동합니다.
    const top = resultRef.current?.getBoundingClientRect().top;
    if (!regenerate && top !== undefined && (top < 0 || top > window.innerHeight * 0.5)) {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - 96), behavior: "instant" });
    }
    setLoading(true);
    setError("");
    if (!regenerate) setCard(null);
    try {
      // 같은 어휘를 다른 선생님이 만드는 중이면(202) 잠시 뒤 다시 확인합니다.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ term: next.term, ...(next.unitId ? { course, unitId: next.unitId } : {}), regenerate: regenerate && attempt === 0 }), signal: controller.signal });
        const data = await readJson<{ status: "ready" | "pending"; etymology?: KoreanEtymology }>(response);
        if (data.status === "ready" && data.etymology) { setCard(data.etymology); return; }
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      throw new Error("어원 카드가 아직 준비되지 않았어요. 잠시 후 다시 눌러 주세요.");
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "어원 카드를 불러오지 못했습니다.");
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  }

  const chapter = chapters.find(item => item.id === chapterId);
  const scaleIndex = textScales.indexOf(textScale as (typeof textScales)[number]);
  const selectClass = "min-h-11 w-full appearance-none rounded-xl border border-line bg-surface-2 py-2.5 pl-3.5 pr-10 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><BookA size={16} /> 교사 지원실 · 국어</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">국어 어휘 어원 카드</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3">교과 핵심 어휘나 궁금한 단어를 고르면 어원, 뜻의 변화, 오늘날 쓰임, 함께 볼 단어를 수업에서 바로 쓸 수 있게 정리합니다.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>

      <section className="mt-6 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <aside className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)] lg:sticky lg:top-24">
          <form onSubmit={event => { event.preventDefault(); const term = word.trim(); if (term) void lookup({ term }); }} className="border-b border-line bg-surface-2 p-4">
            <label htmlFor="etymology-word" className="text-sm font-bold text-ink-2">어휘 직접 찾기</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
              <input id="etymology-word" maxLength={40} value={word} onChange={event => setWord(event.target.value)} placeholder="예: 모순, 어처구니" className="min-h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-4" />
              <button type="submit" disabled={!word.trim() || loading} aria-label="어원 찾기" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-dark disabled:bg-surface-3 disabled:text-ink-4"><Search size={17} /></button>
            </div>
          </form>

          <div className="space-y-3 p-4">
            <p className="text-sm font-bold text-ink-2">교과 핵심 어휘에서 고르기</p>
            {courses === null ? <p className="flex items-center gap-2 text-xs text-ink-4"><LoaderCircle size={14} className="animate-spin" /> 국어 과목을 불러오는 중…</p> : <>
              {courses.length === 0 && !listError && <p className="rounded-xl bg-surface-2 px-3 py-3 text-xs leading-5 text-ink-3">학교에 공개된 국어 과목이 없습니다. 위에서 어휘를 직접 찾아보세요.</p>}
              {courses.length > 0 && <>
                <span className="relative block">
                  <select aria-label="국어 과목" value={course} onChange={event => setCourse(event.target.value)} className={selectClass}>
                    {courses.map(item => <option key={item.code} value={item.code}>{item.title}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                </span>
                <span className="relative block">
                  <select aria-label="대단원" value={chapterId} disabled={!chapters.length} onChange={event => setChapterId(event.target.value)} className={selectClass}>
                    {chapters.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                </span>
              </>}
              {listError && <p className="text-xs text-danger">{listError}</p>}
              <div className="scrollbar-subtle max-h-[52vh] space-y-4 overflow-y-auto pr-1">
                {chapter?.sections.map(section => (
                  <div key={section.id}>
                    <h2 className="text-[.8rem] font-semibold leading-5 text-ink-3">{section.title}</h2>
                    {section.terms.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {section.terms.map(term => {
                        const active = selection?.term === term && selection.unitId === section.id;
                        return <button key={term} type="button" aria-pressed={active} onClick={() => void lookup({ term, unitId: section.id })}
                          className={cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.84rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand", active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark")}>{term}</button>;
                      })}
                    </div> : <p className="mt-1 text-xs text-ink-4">정리된 어휘가 없어요.</p>}
                  </div>
                ))}
              </div>
            </>}
          </div>
        </aside>

        <div ref={resultRef} className="min-w-0">
          {selection && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div role="group" aria-label="어원 카드 글자 크기" className="flex h-10 items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-[var(--lift-1)]">
                <button type="button" onClick={() => changeTextScale(textScales[scaleIndex - 1])} disabled={scaleIndex <= 0} aria-label="글자 작게" className="grid h-8 min-w-9 place-items-center rounded-full text-[.74rem] font-extrabold text-ink-3 hover:bg-brand-soft hover:text-brand disabled:opacity-25">가−</button>
                <button type="button" onClick={() => changeTextScale(defaultTextScale)} disabled={textScale === defaultTextScale} aria-label={`글자 크기 ${textScale}%, 기본 크기로 되돌리기`} className="h-8 min-w-11 rounded-full text-[.7rem] font-bold tabular-nums text-ink-4 hover:bg-brand-soft hover:text-brand disabled:hover:bg-transparent">{textScale}%</button>
                <button type="button" onClick={() => changeTextScale(textScales[scaleIndex + 1])} disabled={scaleIndex >= textScales.length - 1} aria-label="글자 크게" className="grid h-8 min-w-9 place-items-center rounded-full text-[.9rem] font-extrabold text-ink-3 hover:bg-brand-soft hover:text-brand disabled:opacity-25">가+</button>
              </div>
              <Button variant="secondary" size="sm" disabled={loading} onClick={() => void lookup(selection, true)}><RefreshCw size={15} className={cn(loading && "animate-spin")} /> 다시 만들기</Button>
            </div>
          )}
          <div style={{ fontSize: `${textScale / 100}rem` }}>
            {error && <p role="alert" className="mb-3 flex items-center gap-2 rounded-xl border border-danger/15 bg-[var(--danger-page)] px-4 py-3 text-[.86em] font-semibold text-danger"><AlertCircle size={16} /> {error}</p>}
            {card && selection ? <div className={cn("transition-opacity", loading && "opacity-50")}><EtymologyCard term={selection.term} card={card} /></div>
              : loading ? <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand/25 bg-brand-page text-[.9em] font-semibold text-brand-dark"><LoaderCircle size={26} className="animate-spin" /> ‘{selection?.term}’의 어원을 찾는 중이에요…</div>
                : !error && <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-6 text-center text-[.9em] text-ink-3"><Sparkles size={24} className="text-brand" /><p className="font-bold text-ink-2">어휘를 골라 어원 카드를 만들어 보세요.</p><p>한 번 만든 카드는 학교 안 선생님들이 함께 씁니다.</p></div>}
          </div>
        </div>
      </section>
    </div>
  );
}

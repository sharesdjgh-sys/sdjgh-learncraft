"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookOpen, LoaderCircle, NotebookTabs, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { Bookmark as BookmarkType } from "@/types";

const filters = ["ALL", "국어", "영어", "수학"] as const;

const answerModeLabels: Record<BookmarkType["answerMode"], string> = {
  QUESTION: "질문 답변",
  EASIER: "더 쉽게",
  DEEPER: "원리까지",
  REVEAL: "전체 풀이",
  QUIZ: "확인 문제",
};

function getPreview(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`$[\](){}\\|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRequestTitle(title: string) {
  const normalized = title.trim();
  return normalized.endsWith("학습 메모") ? null : normalized;
}

export function NotebookView() {
  const [items, setItems] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((response) => response.json())
      .then((data) => setItems(data.bookmarks ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesSubject = subject === "ALL" || item.subjectTitle === subject;
    const needle = query.toLowerCase();
    return matchesSubject && (!needle || item.title.toLowerCase().includes(needle) || item.answerMarkdown.toLowerCase().includes(needle));
  }), [items, query, subject]);

  const selectedItem = filtered.find((item) => item.id === selectedId) ?? null;

  async function remove(id: string) {
    const response = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => current === id ? null : current);
    }
  }

  function showDetail(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-7 lg:px-10 lg:py-14">
      <header className="grid gap-6 border-b border-line pb-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><NotebookTabs size={16} /> 내가 저장한 답변</p>
          <h1 className="font-learning mt-3 text-[2.2rem] font-bold tracking-[-0.045em] text-ink">학습 북마크</h1>
          <p className="mt-3 max-w-xl text-[.94rem] leading-7 text-ink-3">필요한 답변만 모아 두고, 시험 전에 과목과 단원별로 빠르게 다시 읽어 보세요.</p>
        </div>
        <p className="figure text-[.9rem] font-semibold text-ink-3"><span className="text-2xl text-brand">{items.length}</span>개 저장됨</p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="composer flex min-h-12 items-center gap-2.5 rounded-[12px] border border-line bg-surface px-4 shadow-[var(--lift-1)]">
          <Search size={17} className="text-brand" />
          <span className="sr-only">저장한 내용 검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목이나 답변 내용 검색" className="w-full border-0 bg-transparent text-[.9rem] outline-none placeholder:text-ink-5" />
        </label>
        <div className="flex gap-1 overflow-x-auto rounded-[12px] border border-line bg-surface-3 p-1">
          {filters.map((item) => (
            <button key={item} onClick={() => setSubject(item)} className={cn("min-h-10 shrink-0 rounded-[9px] px-4 text-[.82rem] font-semibold transition-all duration-300", subject === item ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-4 hover:bg-surface/50 hover:text-ink")}>
              {item === "ALL" ? "전체" : item}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 grid min-h-[21rem] place-items-center border-y border-dashed border-line px-6 text-center">
          <div><Bookmark size={25} className="mx-auto text-brand" /><h2 className="font-learning mt-4 text-lg font-bold">{items.length === 0 ? "아직 저장한 답변이 없어요" : "조건에 맞는 답변이 없어요"}</h2><p className="mt-2 max-w-sm text-[.9rem] leading-7 text-ink-3">{items.length === 0 ? "AI 튜터 답변 아래의 저장 버튼을 누르면 이곳에서 다시 볼 수 있어요." : "검색어를 바꾸거나 다른 과목을 선택해 보세요."}</p></div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, index) => (
              <article key={item.id} className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => showDetail(item.id)}
                  aria-pressed={selectedId === item.id}
                  aria-controls="bookmark-detail"
                  className={cn(
                    "group flex min-h-52 w-full cursor-pointer flex-col rounded-[14px] border p-4 pr-12 text-left transition-all duration-300",
                    selectedId === item.id
                      ? "border-brand/40 bg-brand-page shadow-[var(--lift-2)]"
                      : "border-line bg-surface hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[var(--lift-2)]",
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="figure text-[.72rem] font-semibold text-ink-5">{String(index + 1).padStart(2, "0")}</span>
                    <span className="flex items-center gap-1.5 text-[.78rem] font-bold text-brand"><BookOpen size={13} /> {item.subjectTitle}</span>
                    <span className="ml-auto rounded-full bg-brand-soft px-2 py-1 text-[.68rem] font-bold text-brand-dark">{answerModeLabels[item.answerMode]}</span>
                  </div>
                  <p className="font-learning mt-4 line-clamp-1 text-[.8rem] font-semibold text-ink-3">{item.unitTitle}</p>
                  {getRequestTitle(item.title) && (
                    <>
                      <p className="mt-2 text-[.68rem] font-bold tracking-[.06em] text-ink-5">저장한 요청</p>
                      <h2 className="font-learning mt-1 line-clamp-2 text-[1rem] font-bold leading-6 text-ink">{getRequestTitle(item.title)}</h2>
                    </>
                  )}
                  <p className="mt-2 line-clamp-3 text-[.82rem] leading-6 text-ink-4">{getPreview(item.answerMarkdown)}</p>
                  <p className="figure mt-auto pt-4 text-[.72rem] text-ink-5">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="북마크 삭제" className="absolute right-2 top-2 text-ink-4 hover:text-danger"><Trash2 size={16} /></Button>
              </article>
            ))}
          </div>

          {selectedItem && (
            <section ref={detailRef} id="bookmark-detail" className="mt-10 scroll-mt-6 border-t border-line pt-8">
              <header className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[.8rem] font-bold text-brand"><span className="flex items-center gap-1.5"><BookOpen size={14} /> {selectedItem.subjectTitle} · {selectedItem.unitTitle}</span><span className="rounded-full bg-brand-soft px-2 py-1 text-[.68rem] text-brand-dark">{answerModeLabels[selectedItem.answerMode]}</span></p>
                  {getRequestTitle(selectedItem.title) && (
                    <>
                      <p className="mt-4 text-[.7rem] font-bold tracking-[.06em] text-ink-5">이 답변을 요청한 내용</p>
                      <h2 className="font-learning mt-1 text-xl font-bold leading-8 text-ink">{getRequestTitle(selectedItem.title)}</h2>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label="상세 내용 닫기" className="shrink-0 text-ink-4"><X size={18} /></Button>
              </header>
              <div className="mt-5 rounded-[14px] border border-line bg-surface-2 p-5 sm:p-7">
                <Markdown>{selectedItem.answerMarkdown}</Markdown>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

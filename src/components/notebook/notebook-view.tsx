"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookOpen, LoaderCircle, NotebookTabs, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { Bookmark as BookmarkType } from "@/types";

const filters = ["ALL", "국어", "영어", "수학"] as const;

export function NotebookView() {
  const [items, setItems] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("ALL");

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

  async function remove(id: string) {
    const response = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id));
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
        <div className="mt-8 divide-y divide-line border-y border-line">
          {filtered.map((item, index) => (
            <article key={item.id} className="grid gap-5 py-7 lg:grid-cols-[3rem_13rem_minmax(0,1fr)_3rem] lg:gap-6">
              <span className="figure text-lg text-brand">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="flex items-center gap-1.5 text-[.8rem] font-bold text-brand"><BookOpen size={14} /> {item.subjectTitle}</p>
                <p className="font-learning mt-2 text-[.9rem] font-semibold leading-6 text-ink-2">{item.unitTitle}</p>
                <p className="figure mt-3 text-[.76rem] text-ink-5">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
              </div>
              <div className="min-w-0">
                <h2 className="font-learning text-lg font-bold text-ink">{item.title}</h2>
                <div className="mt-3 max-h-52 overflow-hidden rounded-[12px] border border-line bg-surface-2 p-4"><Markdown>{item.answerMarkdown}</Markdown></div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="북마크 삭제" className="justify-self-end text-ink-4 hover:text-danger"><Trash2 size={17} /></Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

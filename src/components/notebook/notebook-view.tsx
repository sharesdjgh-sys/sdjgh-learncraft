"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookOpen, LoaderCircle, NotebookTabs, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import type { Bookmark as BookmarkType } from "@/types";

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
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.12em] text-brand uppercase"><NotebookTabs size={16} /> My learning notes</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-ink">나만의 오답 노트</h1>
          <p className="mt-2 text-sm text-ink-soft">AI 답변 중 직접 저장한 내용만 모아 시험 전에 빠르게 복습하세요.</p>
        </div>
        <div className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink"><span className="text-brand">{items.length}</span>개 저장됨</div>
      </header>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 sm:flex-row">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl bg-surface-muted px-3.5">
          <Search size={17} className="text-ink-soft" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="저장한 내용 검색" className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-[#91a09c]" />
        </label>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1">
          {["ALL", "국어", "영어", "수학"].map((item) => <button key={item} onClick={() => setSubject(item)} className={`min-h-9 shrink-0 cursor-pointer rounded-lg px-3 text-xs font-bold ${subject === item ? "bg-white text-brand shadow-sm" : "text-ink-soft"}`}>{item === "ALL" ? "전체" : item}</button>)}
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 grid min-h-[22rem] place-items-center rounded-3xl border border-dashed border-[#c8d6d2] bg-white/50 px-6 text-center">
          <div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Bookmark size={24} /></span><h2 className="mt-4 text-lg font-extrabold">아직 저장한 답변이 없어요</h2><p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">AI 튜터의 답변 아래 북마크 버튼을 누르면 이곳에서 과목과 단원별로 다시 볼 수 있어요.</p></div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((item) => (
            <article key={item.id} className="surface-card group flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="flex items-center gap-1.5 text-xs font-bold text-brand"><BookOpen size={14} /> {item.subjectTitle} · {item.unitTitle}</p><h2 className="mt-2 font-extrabold text-ink">{item.title}</h2></div>
                <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="북마크 삭제" className="shrink-0 text-ink-soft hover:text-[#a6383b]"><Trash2 size={17} /></Button>
              </div>
              <div className="mt-4 max-h-56 flex-1 overflow-hidden rounded-xl bg-[#f8faf9] p-4"><Markdown>{item.answerMarkdown}</Markdown></div>
              <p className="mt-4 text-[.7rem] text-[#8a9b96]">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

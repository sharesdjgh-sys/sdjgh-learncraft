"use client";

import { useEffect, useState } from "react";
import { BookOpen, CircleCheck, LoaderCircle, NotebookPen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineMarkdown, Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { QuizMistake } from "@/types";

type MistakeFilter = "ALL" | "OPEN" | "RESOLVED";

const filters: Array<{ value: MistakeFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "OPEN", label: "복습 필요" },
  { value: "RESOLVED", label: "해결함" },
];

export function QuizMistakeList() {
  const [items, setItems] = useState<QuizMistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<MistakeFilter>("ALL");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/quiz-mistakes", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("오답 기록을 불러오지 못했습니다.");
        const data = await response.json() as { items?: QuizMistake[] };
        setItems(data.items ?? []);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function remove(id: string) {
    const response = await fetch(`/api/quiz-mistakes/${id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id));
  }

  const openCount = items.filter((item) => !item.resolvedAt).length;
  const visible = items.filter((item) => filter === "ALL" || (filter === "OPEN" ? !item.resolvedAt : item.resolvedAt));

  if (loading) return <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-brand" /></div>;
  if (failed) return <p className="mt-10 text-center text-[.9rem] font-semibold text-danger">오답 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(({ value, label }) => (
          <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={cn(
            "min-h-10 cursor-pointer rounded-full border px-3.5 text-[.8rem] font-bold transition",
            filter === value ? "border-brand/30 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-3 hover:border-brand/20 hover:text-ink",
          )}>
            {label}{value === "OPEN" && openCount > 0 ? ` ${openCount}` : ""}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 grid min-h-[18rem] place-items-center border-y border-dashed border-line px-6 text-center">
          <div>
            <NotebookPen size={25} className="mx-auto text-brand" />
            <h2 className="font-learning mt-4 text-lg font-bold">{items.length === 0 ? "아직 기록한 오답이 없어요" : "조건에 맞는 기록이 없어요"}</h2>
            <p className="mt-2 max-w-sm text-[.9rem] leading-7 text-ink-3">{items.length === 0 ? "확인 문제를 틀렸을 때 막힌 부분을 기록하면 이곳에 모여요." : "다른 필터를 선택해 보세요."}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {visible.map((item) => (
            <article key={item.id} className="relative rounded-[14px] border border-line bg-surface p-4 pr-12 sm:p-5 sm:pr-14">
              <div className="flex flex-wrap items-center gap-2 text-[.78rem] font-bold">
                <span className="flex items-center gap-1.5 text-brand"><BookOpen size={13} /> {item.subjectTitle ?? "학습"}{item.unitTitle ? ` · ${item.unitTitle}` : ""}</span>
                {item.resolvedAt
                  ? <span className="flex items-center gap-1 rounded-full bg-[var(--ok-page)] px-2 py-0.5 text-[.68rem] text-ok"><CircleCheck size={12} /> 다시 풀어서 해결</span>
                  : <span className="rounded-full bg-[var(--danger-page)] px-2 py-0.5 text-[.68rem] text-danger">복습 필요</span>}
                <span className="figure ml-auto text-[.7rem] font-medium text-ink-5">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</span>
              </div>

              {item.confusions.length > 0 && (
                <div className="mt-3">
                  <p className="text-[.7rem] font-bold tracking-[.04em] text-ink-5">막힌 부분</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.confusions.map((confusion) => <span key={confusion} className="rounded-full border border-brand/15 bg-brand-page px-2.5 py-1 text-[.76rem] font-semibold text-brand-dark">{confusion}</span>)}
                  </div>
                </div>
              )}
              {item.note && <p className="mt-3 rounded-[10px] bg-surface-2 px-3.5 py-2.5 text-[.86rem] leading-6 text-ink-2">{item.note}</p>}

              <dl className="mt-3 grid gap-1 text-[.82rem] text-ink-3 sm:grid-cols-2">
                <div className="flex gap-2"><dt className="shrink-0 font-bold text-danger">내 답</dt><dd className="min-w-0"><InlineMarkdown>{item.studentAnswer}</InlineMarkdown></dd></div>
                <div className="flex gap-2"><dt className="shrink-0 font-bold text-ok">정답</dt><dd className="min-w-0"><InlineMarkdown>{item.correctAnswer}</InlineMarkdown></dd></div>
              </dl>
              <p className="mt-1 text-[.72rem] text-ink-5">시도 {item.attempts}회 · 힌트 {item.hintsUsed}개 사용</p>

              <details className="mt-3 rounded-[11px] border border-line bg-surface-2">
                <summary className="min-h-10 cursor-pointer px-3.5 py-2.5 text-[.82rem] font-bold text-brand">문제 다시 보기</summary>
                <div className="border-t border-line p-4"><Markdown textSize="small">{item.problemMarkdown}</Markdown></div>
              </details>

              <Button variant="ghost" size="icon" onClick={() => void remove(item.id)} aria-label="오답 기록 삭제" className="absolute right-2 top-2 text-ink-4 hover:text-danger"><Trash2 size={16} /></Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

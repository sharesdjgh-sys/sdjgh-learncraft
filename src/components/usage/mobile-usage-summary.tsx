"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Clock, Sparkles, X } from "lucide-react";

type CourseUsage = {
  subjectTitle: string;
  courseTitle: string;
  count: number;
  firstUsedAt: string;
  lastUsedAt: string;
};

type UsageSummary = {
  count: number;
  completed: number;
  limit: number;
  remaining: number;
  date: string;
  byCourse: CourseUsage[];
};

export function MobileUsageSummary() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/usage", { cache: "no-store" });
      if (!response.ok) return;
      setUsage(await response.json() as UsageSummary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => void loadUsage(), 0);
    const updateRemaining = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail?.remaining !== "number") return;
      setUsage((current) => current ? { ...current, remaining: event.detail.remaining, count: current.limit - event.detail.remaining } : current);
    };
    const refreshOnFocus = () => void loadUsage();
    window.addEventListener("learncraft:usage-updated", updateRemaining);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearTimeout(initialLoadTimer);
      window.removeEventListener("learncraft:usage-updated", updateRemaining);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadUsage]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); void loadUsage(); }}
        className={`flex min-h-13 flex-col items-center justify-center gap-1 border-b-2 text-[.76rem] font-semibold transition active:scale-[.98] ${open ? "border-[#3217c9] text-[#3217c9]" : "border-transparent text-[#996bf5]"}`}
        aria-label={`오늘 남은 AI 질문 ${usage?.remaining ?? "-"}/${usage?.limit ?? "-"}회, 사용 내역 보기`}
      >
        <Sparkles size={17} strokeWidth={1.9} className={open ? "text-[#3217c9]" : "text-[#996bf5]"} aria-hidden="true" />
        <span className={`figure rounded-full px-1.5 py-px text-[.64rem] font-bold leading-4 text-white shadow-[0_2px_7px_rgba(82,57,157,.22)] ${open ? "bg-[#3217c9]" : "bg-[#8064ef]"}`}>{usage ? `${usage.remaining}/${usage.limit}회` : "확인 중"}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end bg-[#1f1938]/35 p-2 pt-[calc(3rem+env(safe-area-inset-top))] min-[1024px]:hidden" role="presentation" onClick={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="mobile-usage-title" className="mx-auto max-h-[82dvh] w-full max-w-lg overflow-y-auto rounded-[22px] border border-white/70 bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[var(--lift-3)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[.7rem] font-bold text-brand">오늘의 학습 기록</p>
                <h2 id="mobile-usage-title" className="font-learning mt-0.5 text-lg font-bold text-ink">AI 질문 사용 현황</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-[11px] text-ink-4 active:bg-surface-2" aria-label="사용 현황 닫기"><X size={18} /></button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-brand-page px-4 py-3">
                <p className="text-[.7rem] font-semibold text-ink-4">남은 질문</p>
                <p className="figure mt-1 text-xl font-bold text-brand-dark">{usage?.remaining ?? "-"}<span className="ml-1 text-[.74rem] text-ink-4">/ {usage?.limit ?? "-"}회</span></p>
              </div>
              <div className="rounded-[14px] bg-surface-2 px-4 py-3">
                <p className="text-[.7rem] font-semibold text-ink-4">오늘 질문</p>
                <p className="figure mt-1 text-xl font-bold text-ink">{usage?.completed ?? "-"}<span className="ml-1 text-[.74rem] text-ink-4">회</span></p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-[.78rem] font-bold text-ink"><Activity size={15} className="text-brand" /> 과목별 질문</div>
            {loading && !usage ? (
              <p className="py-8 text-center text-[.78rem] text-ink-5">사용 내역을 불러오고 있어요.</p>
            ) : usage?.byCourse.length ? (
              <div className="mt-2 grid gap-2">
                {usage.byCourse.map((item) => (
                  <div key={`${item.subjectTitle}-${item.courseTitle}`} className="flex items-center gap-3 rounded-[13px] border border-line bg-surface px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[.68rem] font-semibold text-ink-5">{item.subjectTitle}</p>
                      <p className="mt-0.5 truncate text-[.82rem] font-bold text-ink">{item.courseTitle}</p>
                      <p className="mt-1 flex items-center gap-1 text-[.68rem] text-ink-5"><Clock size={11} /> {item.firstUsedAt === item.lastUsedAt ? item.lastUsedAt : `${item.firstUsedAt}–${item.lastUsedAt}`}</p>
                    </div>
                    <span className="figure shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[.78rem] font-bold text-brand-dark">{item.count}회</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-[13px] border border-dashed border-line px-4 py-7 text-center text-[.78rem] text-ink-4">오늘 직접 질문한 기록이 아직 없어요.</div>
            )}
            <p className="mt-4 text-[.68rem] leading-5 text-ink-5">직접 입력해 전송한 AI 질문만 집계합니다. 이어서 학습하기 버튼은 질문 횟수에 포함되지 않아요.</p>
          </section>
        </div>
      )}
    </>
  );
}

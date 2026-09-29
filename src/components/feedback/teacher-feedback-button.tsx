"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, MessageSquareText } from "lucide-react";
import type { FeedbackToolLocation } from "@/features/feedback/model";
import { FeedbackForm } from "@/components/feedback/feedback-board";

// 교사 지원실 머리에 두는 피드백 버튼입니다. 누른 순간의 교과·도구·하위 탭을 함께 보냅니다.
export function TeacherFeedbackButton({ subject, tool, colorStyle }: { subject?: string; tool?: string; colorStyle?: CSSProperties }) {
  const pathname = usePathname();
  const [location, setLocation] = useState<FeedbackToolLocation | null>(null);
  const [sent, setSent] = useState(false);
  const [openedPath, setOpenedPath] = useState(pathname);
  // Leaving the page closes the dialog so it never reports a stale location.
  if (location && openedPath !== pathname) { setLocation(null); setSent(false); }

  useEffect(() => {
    if (!location) return;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setLocation(null); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", close); };
  }, [location]);

  function open() {
    // Sub-tool tabs mark the current tab with aria-current="page" (links) or aria-selected (tab buttons) inside [data-tool-tabs].
    const tab = document.querySelector("main [data-tool-tabs] [aria-current='page'], main [data-tool-tabs] [aria-selected='true']")?.textContent?.trim().slice(0, 60) || null;
    setLocation({ subject: subject ?? "교사 지원실", tool: tool ?? "공통", tab, path: `${window.location.pathname}${window.location.search}`.slice(0, 300) });
    setOpenedPath(pathname); setSent(false);
  }
  function close() { setLocation(null); setSent(false); }

  const label = subject ? `${subject} 도구 피드백 보내기` : "교사 지원실 피드백 보내기";
  return <>
    {/* 교과 색과 겹치지 않도록 피드백 화면과 같은 초록 계열을 옅은 그라데이션으로 씁니다. */}
    <button type="button" onClick={open} className="flex min-h-10 items-center gap-1.5 rounded-[11px] border border-[#bfe0d4] bg-[linear-gradient(135deg,#f7fcfa_0%,#e6f4ee_55%,#d5ece3_100%)] px-2.5 text-[.78rem] font-bold text-[#1d6258] shadow-[0_3px_10px_rgba(29,98,88,.10),inset_0_1px_0_#ffffffd9] transition hover:-translate-y-px hover:border-[#93c9b6] hover:bg-[linear-gradient(135deg,#eff9f5_0%,#d9efe6_60%,#c8e6da_100%)] hover:shadow-[0_6px_14px_rgba(29,98,88,.16),inset_0_1px_0_#ffffffe6] active:scale-[.97] sm:px-3" title={label} aria-label={label} aria-haspopup="dialog">
      <MessageSquareText size={16} aria-hidden="true" />
      <span className="hidden sm:inline lg:hidden xl:inline">피드백</span>
    </button>
    {location && createPortal(<div style={colorStyle} className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={sent ? "teacher-feedback-sent" : "new-feedback-title"} className="scrollbar-subtle max-h-[94dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[22px] sm:max-h-[90dvh] sm:rounded-[20px]">
        {sent ? <section className="rounded-t-[22px] border border-line bg-surface px-6 py-10 text-center shadow-[var(--lift-3)] sm:rounded-[20px]">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#edf7f3] text-[#246859]"><Check size={22} /></span>
          <h2 id="teacher-feedback-sent" className="font-learning mt-4 text-[1.2rem] font-bold text-ink">피드백을 보냈어요</h2>
          <p role="status" className="mx-auto mt-2 max-w-[24rem] break-keep text-[.84rem] leading-6 text-ink-4">{location.subject} · {location.tab ?? location.tool} 피드백이 학교 관리자에게 전달됐어요. 처리 상태와 답변은 내 피드백에서 확인할 수 있어요.</p>
          <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
            <button type="button" onClick={close} className="inline-flex min-h-11 items-center justify-center rounded-[13px] border border-line bg-surface px-5 text-sm font-semibold text-ink-3 transition hover:bg-surface-2">닫기</button>
            <Link href="/feedback" onClick={close} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[13px] bg-[#1d6258] px-5 text-sm font-bold text-white transition hover:bg-[#164f47]">내 피드백 보기 <ArrowRight size={15} /></Link>
          </div>
        </section> : <FeedbackForm toolLocation={location} onCreated={() => setSent(true)} onClose={close} />}
      </div>
    </div>, document.body)}
  </>;
}

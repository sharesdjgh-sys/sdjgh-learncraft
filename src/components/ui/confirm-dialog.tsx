"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleHelp, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* 브라우저 기본 확인 창(window.confirm) 대신 쓰는 확인 팝업입니다. 관리자 화면의 확인 팝업과 같은 모양입니다.
 * const [confirm, confirmDialog] = useConfirm(); … if (!await confirm({ … })) return; … {confirmDialog} */

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  eyebrow?: string;
  note?: string;
  /** danger는 지우거나 덮어써서 되돌릴 수 없는 작업입니다. */
  tone?: "danger" | "default";
};

function ConfirmDialog({ options, onAnswer }: { options: ConfirmOptions; onAnswer: (confirmed: boolean) => void }) {
  const danger = options.tone === "danger";
  const Icon = danger ? TriangleAlert : CircleHelp;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onAnswer(false); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onAnswer]);

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-[rgba(31,24,52,.38)] p-4 backdrop-blur-[4px]" onMouseDown={() => onAnswer(false)}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" onMouseDown={event => event.stopPropagation()}
        className="w-full max-w-[30rem] overflow-hidden rounded-[22px] border border-white/80 bg-surface shadow-[0_28px_80px_rgba(43,31,79,.3)]">
        <div className={cn("flex items-start justify-between gap-4 border-b px-6 py-5",
          danger ? "border-danger/10 bg-[linear-gradient(135deg,var(--danger-page),var(--surface))]" : "border-brand/10 bg-[linear-gradient(135deg,var(--brand-page),var(--surface))]")}>
          <div className="flex min-w-0 items-start gap-3.5">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-[13px] text-white", danger ? "bg-danger shadow-[0_8px_20px_rgba(183,70,87,.24)]" : "bg-brand shadow-[var(--lift-brand)]")}>
              <Icon size={21} />
            </span>
            <div className="min-w-0 pt-0.5">
              {options.eyebrow && <p className={cn("text-[.7rem] font-bold", danger ? "text-danger" : "text-brand")}>{options.eyebrow}</p>}
              <h2 id="confirm-dialog-title" className="mt-1 break-keep text-lg font-extrabold leading-6 tracking-[-0.025em]">{options.title}</h2>
            </div>
          </div>
          <button type="button" onClick={() => onAnswer(false)} className="grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-4 transition hover:bg-surface hover:text-ink" aria-label="팝업 닫기"><X size={17} /></button>
        </div>
        <div className="px-6 py-5">
          <p id="confirm-dialog-description" className="break-keep text-[.84rem] leading-6 text-ink-3">{options.description}</p>
          {options.note && (
            <div className={cn("mt-4 flex items-start gap-2 rounded-[11px] border px-3.5 py-3", danger ? "border-danger/15 bg-[var(--danger-page)] text-danger" : "border-brand/15 bg-brand-soft/55 text-brand-dark")}>
              {danger ? <TriangleAlert size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
              <p className="break-keep text-[.74rem] font-semibold leading-5">{options.note}</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface-2 px-6 py-4 sm:flex sm:justify-end">
          {/* 되돌릴 수 없는 작업이 많으므로 처음 초점은 취소에 둡니다. */}
          <Button type="button" variant="secondary" onClick={() => onAnswer(false)} autoFocus>취소</Button>
          <Button type="button" variant={danger ? "danger" : "primary"} onClick={() => onAnswer(true)}><Icon size={15} />{options.confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

/** 확인 팝업을 띄우고 답을 Promise로 돌려줍니다. 돌려받은 팝업 요소를 화면 어딘가에 그려 두어야 합니다. */
export function useConfirm() {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (confirmed: boolean) => void } | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ options, resolve })), []);
  const answer = useCallback((confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  }, [pending]);
  const dialog = pending ? <ConfirmDialog options={pending.options} onAnswer={answer} /> : null;
  return [confirm, dialog] as const;
}

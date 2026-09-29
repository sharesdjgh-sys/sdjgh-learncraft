"use client";

import { useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, CircleHelp, Lightbulb, ListChecks, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineMarkdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { MathProblemReview } from "@/lib/math-figure-review";

type Measurement = { kind: "angle" | "length"; label: string; value: number };

const verdictStyle = {
  valid: { label: "문제가 성립합니다", icon: CheckCircle2, className: "border-ok/25 bg-[var(--ok-page)] text-ok" },
  invalid: { label: "문제가 성립하지 않습니다", icon: AlertCircle, className: "border-danger/25 bg-[var(--danger-page)] text-danger" },
  uncertain: { label: "판단하기 어렵습니다", icon: CircleHelp, className: "border-warn/25 bg-[var(--warn-page)] text-warn" },
} as const;

const textScaleKey = "learncraft_review_text_scale";
const textScales = [100, 115, 130, 150, 175] as const;
type TextScale = (typeof textScales)[number];
const textScaleListeners = new Set<() => void>();
const defaultTextScale: TextScale = 115;
let memoryTextScale: TextScale = defaultTextScale;

function isTextScale(value: number): value is TextScale {
  return (textScales as readonly number[]).includes(value);
}

function readTextScale(): TextScale {
  try {
    const saved = Number(window.localStorage.getItem(textScaleKey));
    return isTextScale(saved) ? saved : memoryTextScale;
  } catch {
    // Storage may be unavailable; the in-memory choice still works for this visit.
    return memoryTextScale;
  }
}

function subscribeTextScale(listener: () => void) {
  textScaleListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    textScaleListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function changeTextScale(next: TextScale) {
  memoryTextScale = next;
  try {
    window.localStorage.setItem(textScaleKey, String(next));
  } catch {
    // The in-memory value still applies to the current visit.
  }
  textScaleListeners.forEach((listener) => listener());
}

function TextScaleControl({ value }: { value: TextScale }) {
  const index = textScales.indexOf(value);
  const buttonClass = "grid h-8 min-w-9 place-items-center rounded-full px-1.5 font-extrabold tracking-[-0.06em] text-ink-3 transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-25";
  return (
    <div role="group" aria-label="검토 결과 글자 크기" className="flex h-10 shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-[var(--lift-1)]">
      <button type="button" onClick={() => changeTextScale(textScales[index - 1])} disabled={index <= 0} aria-label="검토 결과 글자 작게" title="글자 작게" className={cn(buttonClass, "text-[.74rem]")}>가−</button>
      <button type="button" onClick={() => changeTextScale(defaultTextScale)} disabled={value === defaultTextScale} aria-label={`검토 결과 글자 크기 ${value}%, 기본 크기로 되돌리기`} title="기본 크기로 되돌리기" className="h-8 min-w-11 rounded-full px-1 text-[.7rem] font-bold tabular-nums text-ink-4 transition hover:bg-brand-soft hover:text-brand disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-ink-4">{value}%</button>
      <button type="button" onClick={() => changeTextScale(textScales[index + 1])} disabled={index >= textScales.length - 1} aria-label="검토 결과 글자 크게" title="글자 크게" className={cn(buttonClass, "text-[.9rem]")}>가+</button>
    </div>
  );
}

function formatValue(measurement: Measurement | undefined, value: number) {
  const rounded = Number(value.toFixed(4));
  return measurement?.kind === "angle" ? `${rounded}°` : String(rounded);
}

export function MathProblemReviewPanel({ review, measurements, stale, onApply, onClose }: {
  review: MathProblemReview;
  measurements: Measurement[] | null;
  stale: boolean;
  onApply: (values: MathProblemReview["recommendations"][number]["values"]) => void;
  onClose: () => void;
}) {
  const textScale = useSyncExternalStore(subscribeTextScale, readTextScale, () => defaultTextScale);
  const verdict = verdictStyle[review.verdict];
  const VerdictIcon = verdict.icon;
  return (
    <section className="mb-5 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-2)] sm:p-5" aria-label="문제 검토 결과" style={{ fontSize: `${textScale / 100}rem` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[.74em] font-bold text-brand"><ListChecks size={14} /> AI 문제 검토</p>
          <p className="mt-1.5 break-keep text-[.8em] leading-6 text-ink-3"><InlineMarkdown>{review.problem}</InlineMarkdown></p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
        <TextScaleControl value={textScale} />
        <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-5 hover:bg-surface-2 hover:text-ink" aria-label="검토 결과 닫기"><X size={16} /></button>
        </div>
      </div>

      {stale && <p className="mt-3 rounded-[10px] bg-[var(--warn-page)] px-3 py-2 text-[.74em] font-semibold text-warn">검토 후 수치가 바뀌었습니다. 현재 수치로 다시 확인해 주세요.</p>}

      <div className={cn("mt-3 rounded-[13px] border p-3.5", verdict.className)}>
        <strong className="flex items-center gap-2 text-[.86em]"><VerdictIcon size={16} /> {verdict.label}</strong>
        <p className="mt-1.5 break-keep text-[.78em] leading-6 text-ink-3"><InlineMarkdown>{review.verdictReason}</InlineMarkdown></p>
        {review.issues.length > 0 && <ul className="mt-2 space-y-1 text-[.76em] leading-5 text-ink-3">{review.issues.map((issue, index) => <li key={index}>· <InlineMarkdown>{issue}</InlineMarkdown></li>)}</ul>}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="text-[.82em] font-extrabold">변경한 수치로 푼 풀이</h3>
          <ol className="mt-2 space-y-2">
            {review.steps.map((step, index) => (
              <li key={index} className="flex gap-2.5 rounded-[10px] bg-surface-2 px-3 py-2.5 text-[.78em] leading-6 text-ink-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[.87em] font-bold text-brand-dark">{index + 1}</span>
                <span className="min-w-0 break-keep"><InlineMarkdown>{step}</InlineMarkdown></span>
              </li>
            ))}
          </ol>
          <dl className="mt-3 grid gap-1.5 text-[.78em]">
            {review.answer && <div className="flex gap-2"><dt className="shrink-0 font-bold text-ink">답</dt><dd className="min-w-0 text-ink-2"><InlineMarkdown>{review.answer}</InlineMarkdown></dd></div>}
            {review.originalAnswer && <div className="flex gap-2"><dt className="shrink-0 font-bold text-ink-4">원본 답</dt><dd className="min-w-0 text-ink-4"><InlineMarkdown>{review.originalAnswer}</InlineMarkdown></dd></div>}
            {review.check && <div className="flex gap-2"><dt className="shrink-0 font-bold text-ink-4">검산</dt><dd className="min-w-0 break-keep text-ink-4"><InlineMarkdown>{review.check}</InlineMarkdown></dd></div>}
          </dl>
        </div>

        <div className="min-w-0 space-y-4">
          {review.constraints.length > 0 && (
            <div>
              <h3 className="text-[.82em] font-extrabold">수치가 지켜야 할 조건</h3>
              <ul className="mt-2 space-y-1 text-[.76em] leading-5 text-ink-3">{review.constraints.map((item, index) => <li key={index}>· <InlineMarkdown>{item}</InlineMarkdown></li>)}</ul>
            </div>
          )}
          <div>
            <h3 className="flex items-center gap-1.5 text-[.82em] font-extrabold"><Lightbulb size={15} className="text-brand" /> 추천 수치</h3>
            {review.recommendations.length ? (
              <ul className="mt-2 space-y-2">
                {review.recommendations.map((item, index) => (
                  <li key={index} className="rounded-[12px] border border-brand/15 bg-brand-page/45 p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {item.values.map((value) => {
                        const measurement = measurements?.[value.index];
                        return <span key={value.index} className="rounded-full bg-white px-2.5 py-1 text-[.72em] font-bold text-ink-2">{measurement?.label ?? `수치 ${value.index + 1}`} = {formatValue(measurement, value.value)}</span>;
                      })}
                    </div>
                    <p className="mt-2 text-[.76em] text-ink-2"><strong>답</strong> <InlineMarkdown>{item.answer}</InlineMarkdown></p>
                    <p className="mt-1 break-keep text-[.74em] leading-5 text-ink-4"><InlineMarkdown>{item.reason}</InlineMarkdown></p>
                    {measurements && <Button variant="secondary" size="sm" className="mt-2.5" onClick={() => onApply(item.values)}>이 수치 적용</Button>}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-[.76em] leading-5 text-ink-4">추천할 수치 조합을 찾지 못했습니다.</p>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[.72em] leading-5 text-ink-5">AI 풀이는 틀릴 수 있습니다. 시험에 출제하기 전에 풀이와 답을 직접 확인해 주세요.</p>
    </section>
  );
}

"use client";

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, Copy, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineMarkdown, Markdown } from "@/components/ui/markdown";
import { checkLabels, reviewVerdict, verdictLabels, type ReviewOutput } from "@/features/math-review/model";
import { cn } from "@/lib/utils";
import { tabClass } from "./science-lab-shared";

const verdictStyles = {
  error: "bg-[var(--danger-page)] text-danger",
  uncertain: "bg-[var(--warn-page)] text-warn",
  clear: "bg-[var(--ok-page)] text-ok",
};
const statusLabels = { pass: "확인", fail: "오류", uncertain: "확인 필요", not_applicable: "해당 없음" };
const sizes = [{ label: "보통", value: "text-base/[1.8]" }, { label: "크게", value: "text-lg/[1.8]" }, { label: "더 크게", value: "text-xl/[1.8]" }];
type ResultTab = "issues" | "solution" | "checks";

// Preserve paragraphs, lists and display equations in report-length text.
// InlineMarkdown deliberately flattens those structures and is only for short labels.
function ReportText({ children }: { children: string }) {
  return <div className="min-w-0 [overflow-wrap:anywhere] [&>.learncraft-markdown]:[font-size:inherit] [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
    <Markdown>{children}</Markdown>
  </div>;
}

export function MathReviewResult({ label, review, onCopy, onEdit }: { label: string; review: ReviewOutput; onCopy: () => void; onEdit: () => void }) {
  const [size, setSize] = useState("text-lg/[1.8]");
  const [tab, setTab] = useState<ResultTab>(review.issues.length ? "issues" : "solution");
  const id = useId();
  const verdict = reviewVerdict(review);
  const Icon = verdict === "error" ? AlertTriangle : verdict === "uncertain" ? CircleHelp : CheckCircle2;
  const tabs: { value: ResultTab; label: string; count?: number }[] = [
    { value: "issues", label: "오류·수정안", count: review.issues.length },
    { value: "solution", label: "풀이·검산" },
    { value: "checks", label: "항목별 근거" },
  ];
  return <section aria-label="문항 오류 검토 결과" className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-[var(--lift-1)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-5 py-3 sm:px-8">
      <h2 className="min-w-0 break-words text-base font-bold text-ink">{label} 검토 결과</h2>
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit}><ScanText size={15} />인식문 수정</Button>
        <Button size="sm" variant="ghost" onClick={onCopy}><Copy size={15} />결과 복사</Button>
        <label className="ml-2 flex items-center gap-2 border-l border-line pl-3 text-xs text-ink-3">글자 크기<select aria-label="결과 글자 크기" value={size} onChange={event => setSize(event.target.value)} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/30">{sizes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>
    </div>
    <div aria-label="검토 보고서" className={cn("break-words text-ink", size)}>
      <header className="px-5 pt-7 sm:px-10 sm:pt-9">
        <div className="mx-auto max-w-[860px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", verdictStyles[verdict])}><Icon size={22} /></span>
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">{verdictLabels[verdict]}</h3>
          </div>
          <div className="mt-4"><ReportText>{review.summary}</ReportText></div>
          {review.limitations.length > 0 && <aside aria-label="검토의 한계" className="mt-5 border-l-2 border-warn/50 pl-4">
            <h4 className="text-sm font-bold text-warn">최종 판단 전에 확인해 주세요</h4>
            <ul className="mt-2 list-disc space-y-2 pl-5">{review.limitations.map((item, index) => <li key={index}><ReportText>{item}</ReportText></li>)}</ul>
          </aside>}
        </div>
      </header>
      <div className="mt-7 border-b border-line px-3 pb-4 sm:px-10">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="검토 결과 내용" className="grid w-full min-w-0 grid-cols-[1.3fr_1fr_1fr] gap-1 rounded-xl border border-line bg-surface-2 p-1 sm:flex sm:w-auto">
          {tabs.map((item, index) => <button key={item.value} id={id + "-" + item.value} type="button" role="tab" aria-selected={tab === item.value} aria-controls={id + "-panel"} tabIndex={tab === item.value ? 0 : -1}
            onClick={() => setTab(item.value)}
            onKeyDown={event => {
              const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault(); setTab(tabs[next].value);
              document.getElementById(id + "-" + tabs[next].value)?.focus();
            }}
            className={cn(tabClass(tab === item.value), "min-h-11 min-w-0 justify-center gap-1 whitespace-nowrap px-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:gap-2 sm:px-4 sm:text-sm", tab === item.value && "ring-1 ring-brand/20")}>
            {item.label}{item.count !== undefined && <span className={cn("grid min-w-5 shrink-0 place-items-center rounded-full px-1 text-[11px] leading-5 tabular-nums", tab === item.value ? "bg-brand-soft text-brand-dark" : "bg-surface-2 text-ink-3")}>{item.count}</span>}
          </button>)}
        </div>

        </div>
      </div>
      <div id={id + "-panel"} role="tabpanel" aria-labelledby={id + "-" + tab} tabIndex={0} className="px-5 py-7 focus-visible:outline-2 focus-visible:outline-brand sm:px-10 sm:py-9">
        <div className="mx-auto max-w-[860px]">
          {tab === "issues" && <div className="divide-y divide-line">
            {review.issues.length === 0 && <div className="py-4">
              <h4 className="font-bold">보고된 오류·수정안이 없습니다.</h4>
              <p className="mt-2 text-ink-3">풀이와 검산, 항목별 근거를 함께 확인해 주세요.</p>
              <Button className="mt-5" variant="secondary" onClick={() => setTab("solution")}>풀이·검산 보기</Button>
            </div>}
            {review.issues.map((issue, index) => <article key={index} className="py-8 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums text-ink-4">{String(index + 1).padStart(2, "0")}</span>
                <span className={cn("rounded-md px-2 py-1 text-xs font-bold", issue.certainty === "confirmed" ? verdictStyles.error : verdictStyles.uncertain)}>{issue.certainty === "confirmed" ? "오류 발견" : "확인 필요"}</span>
              </div>
              <h4 className="mt-3 text-[1.2em] font-extrabold leading-normal tracking-tight text-ink"><InlineMarkdown>{issue.title}</InlineMarkdown></h4>
              {issue.location && <div className="mt-4 border-l-2 border-line pl-4 text-ink-3"><p className="mb-1 text-xs font-bold text-ink-4">오류 위치</p><ReportText>{issue.location}</ReportText></div>}
              <dl className="mt-6 space-y-6">
                <div className="grid gap-2 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5">
                  <dt className="pt-1 text-sm font-bold text-ink-3">판단 근거</dt><dd className="min-w-0"><ReportText>{issue.evidence}</ReportText></dd>
                </div>
                {issue.suggestion && <div className="grid gap-2 rounded-xl bg-brand-page/60 p-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5 sm:p-5">
                  <dt className="pt-1 text-sm font-bold text-brand-dark">수정 제안</dt><dd className="min-w-0"><ReportText>{issue.suggestion}</ReportText></dd>
                </div>}
              </dl>
              {issue.afterFix && <details className="group mt-5 border-t border-dashed border-line pt-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-ink-3 [&::-webkit-details-marker]:hidden"><ChevronDown size={16} className="transition-transform group-open:rotate-180" />수정 후 검토 내용</summary>
                <div className="mt-4"><ReportText>{issue.afterFix}</ReportText></div>
              </details>}
            </article>)}
          </div>}
          {tab === "solution" && <section aria-label="풀이와 검산">
            <div className="flex flex-col gap-2 border-b border-line pb-6 sm:flex-row sm:items-baseline sm:gap-7"><h4 className="shrink-0 text-sm font-bold text-ink-3">원문에서의 답</h4><div className="min-w-0 text-[1.2em] font-semibold"><ReportText>{review.answer || "확정할 수 없음"}</ReportText></div></div>
            <h4 className="mt-7 text-base font-bold text-ink">풀이 과정</h4>
            <ol className="mt-5 space-y-6">{review.solution.map((step, index) => <li key={index} className="flex gap-4"><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-ink-3">{index + 1}</span><div className="min-w-0 flex-1"><ReportText>{step.replace(/^\s*\d+[.)]\s+/, "")}</ReportText></div></li>)}</ol>
            <dl className="mt-8 space-y-6 border-t border-line pt-6">
              <div className="grid gap-2 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5"><dt className="text-sm font-bold text-ink-3">검산</dt><dd className="min-w-0"><ReportText>{review.verification}</ReportText></dd></div>
              <div className="grid gap-2 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5"><dt className="text-sm font-bold text-ink-3">정답·해설 대조</dt><dd className="min-w-0"><ReportText>{review.answerComparison.detail}</ReportText></dd></div>
            </dl>
          </section>}
          {tab === "checks" && <section aria-label="항목별 검토 근거">
            <h4 className="text-base font-bold">검토 항목별 판단과 근거</h4>
            <p className="mt-1 text-sm text-ink-3">오류가 있거나 확인이 필요한 항목은 펼쳐 표시합니다.</p>
            <div className="mt-5 divide-y divide-line">{Object.entries(checkLabels).map(([key, name]) => {
              const check = review.checks[key as keyof typeof checkLabels];
              return <details key={key} className="group py-4" open={check.status === "fail" || check.status === "uncertain"}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><ChevronDown size={16} className="shrink-0 text-ink-4 transition-transform group-open:rotate-180" />{name}</span><span className={cn("shrink-0 rounded-md px-2 py-1 text-xs font-bold", check.status === "fail" ? verdictStyles.error : check.status === "uncertain" ? verdictStyles.uncertain : "bg-surface-2 text-ink-3")}>{statusLabels[check.status]}</span></summary>
                <div className="mt-4 pl-6"><ReportText>{check.detail}</ReportText></div>
              </details>;
            })}</div>
          </section>}
        </div>
      </div>
    </div>
    <footer className="border-t border-line bg-surface-2/50 px-5 py-4 text-xs leading-6 text-ink-3 sm:px-10">확인한 인식문을 기준으로 한 AI 검토입니다. 오류를 놓칠 수 있으므로 출제 전 판단 근거와 원문을 최종 확인해 주세요.</footer>
  </section>;
}

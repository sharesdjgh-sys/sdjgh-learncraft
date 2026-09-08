import { isIllustrationPending, tutorProgressLabels, type TutorProgressStage } from "@/lib/tutor-progress";
import { IllustrationDrawing } from "./illustration-drawing";

export function TutorProgress({ stage = "preparing", compact = false }: { stage?: TutorProgressStage; compact?: boolean }) {
  if (!compact && isIllustrationPending(stage)) return <IllustrationPendingStatus stage={stage} compact />;
  if (compact) return <span role="status" aria-live="polite" className="text-[.76rem] font-semibold text-brand">{tutorProgressLabels[stage]}</span>;
  return <div className="flex min-h-20 flex-col justify-center gap-3" role="status" aria-live="polite">
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(item => <span key={item} aria-hidden="true" className="thinking-dot size-2 shrink-0 rounded-full bg-brand" style={{ animationDelay: `${item * 150}ms` }} />)}
      <span className="ml-2 text-[.82rem] font-semibold text-ink-4">{tutorProgressLabels[stage]}</span>
    </div>
    <div aria-hidden="true" className="skeleton-shimmer h-2.5 w-[72%] rounded-full" />
    <div aria-hidden="true" className="skeleton-shimmer h-2.5 w-[48%] rounded-full" />
  </div>;
}

export function IllustrationPendingStatus({ stage, compact = false }: { stage: TutorProgressStage; compact?: boolean }) {
  return <div role="status" aria-live="polite" aria-busy="true"
    className={compact ? "flex items-center gap-3 py-2" : "flex h-full flex-col items-center justify-center gap-2 p-4 text-center sm:gap-3"}>
    <IllustrationDrawing compact={compact} />
    <div className={compact ? "min-w-0 flex-1" : "shrink-0"}>
      <div className={`flex items-center gap-2 ${compact ? "" : "justify-center"}`}>
        <span className="text-[.85rem] font-bold text-brand-dark">{tutorProgressLabels[stage]}</span>
        <span className="flex shrink-0 gap-1" aria-hidden="true">{[0, 1, 2].map(item => <span key={item} className="thinking-dot size-1 rounded-full bg-brand" style={{ animationDelay: `${item * 150}ms` }} />)}</span>
      </div>
      <p className="mt-2 text-[.78rem] leading-5 text-ink-3">설명을 먼저 읽어보세요.<br className={compact ? "hidden" : "sm:hidden"} /> 완성되면 그림이 여기에 나타나요.</p>
    </div>
  </div>;
}

export function PendingIllustration({ stage }: { stage: TutorProgressStage }) {
  return <div className="my-5 rounded-xl border border-brand/20 bg-brand-page p-4">
    <IllustrationPendingStatus stage={stage} compact />
  </div>;
}

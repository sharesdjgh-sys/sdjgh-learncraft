import { tutorProgressLabels, type TutorProgressStage } from "@/lib/tutor-progress";

export function TutorProgress({ stage = "preparing", compact = false }: { stage?: TutorProgressStage; compact?: boolean }) {
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

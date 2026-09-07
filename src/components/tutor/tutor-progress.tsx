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

export function PendingIllustration({ stage }: { stage: TutorProgressStage }) {
  return <div className="my-5 rounded-xl border border-brand/20 bg-brand-page p-4">
    <p className="mb-2 text-[.85rem] font-bold text-brand-dark">설명을 먼저 읽어보세요. 그림은 이어서 추가됩니다.</p>
    <TutorProgress stage={stage} compact />
    <p className="mt-2 text-[.78rem] leading-6 text-ink-3">생성·검수가 끝나면 관련 설명에 마련된 자리에 자동으로 나타나요. 다시 질문하지 않고 기다리셔도 됩니다.</p>
  </div>;
}

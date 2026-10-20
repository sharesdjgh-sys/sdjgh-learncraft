"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReviewProgressState = {
  kind: "review";
  message: string;
  startedAt: number;
  current: number;
  total: number;
  completed: number;
  hasDiagram: boolean;
};

function duration(seconds: number) {
  return seconds < 60 ? seconds + "초" : Math.floor(seconds / 60) + "분 " + seconds % 60 + "초";
}

export function MathReviewProgress({ progress, onCancel }: { progress: ReviewProgressState; onCancel: () => void }) {
  const [now, setNow] = useState(progress.startedAt);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);
  const elapsed = Math.max(0, Math.floor((now - progress.startedAt) / 1000));
  const failed = progress.current - 1 - progress.completed;
  const tasks = [
    ["조건의 모순·누락", "주어진 조건이 서로 양립하고 문제를 풀기에 충분한지"],
    ["독립 풀이·검산", "조건대로 풀었을 때 계산과 논리가 성립하는지"],
    ["정답·선택지", "정답을 확정할 수 있는지, 선택지에 오류가 없는지"],
    ...(progress.hasDiagram ? [["도형·그래프·표", "표시된 길이·각도·관계가 문장 조건과 일치하는지"]] : []),
  ];
  return <section aria-label="오류 검토 진행 상태" aria-busy="true" className="rounded-[18px] border border-brand/25 bg-surface p-5 shadow-[var(--lift-1)] sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Loader2 size={24} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 ref={heading} tabIndex={-1} className="scroll-mt-6 break-words text-xl font-extrabold outline-none" aria-live="polite">{progress.message}</h2>
          <p className="mt-2 text-base leading-7 text-ink-3">확인한 원문을 풀어 보고, 출제 오류와 수정이 필요한 부분을 살펴보고 있습니다.</p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onCancel}>검토 중단</Button>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-brand-page px-4 py-3 text-sm leading-7">
      <p className="flex items-center gap-2 font-bold text-brand-dark"><Clock3 size={17} />이 문항 경과 <span className="tabular-nums" aria-live="off">{duration(elapsed)}</span></p>
      <p className="text-ink-2">예상 소요 <strong>문항당 약 30초~2분</strong></p>
    </div>
    <p className="mt-2 text-sm leading-6 text-ink-4">{elapsed >= 120 ? "예상보다 오래 걸리고 있습니다. 아직 응답을 기다리는 중이며, 완료되면 결과가 자동으로 표시됩니다." : "예상 시간은 안내용 추정치입니다. 복잡한 도형이나 조건이 많으면 더 걸릴 수 있습니다."}</p>
    {progress.total > 1 && <div className="mt-5">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><strong>전체 {progress.total}문항 중 {progress.current}번째 검토</strong><span className="text-ink-3">완료 {progress.completed}개{failed > 0 && " · 재시도 필요 " + failed + "개"} · 대기 {progress.total - progress.current}개</span></div>
      <progress className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-surface-3 [&::-webkit-progress-value]:bg-brand [&::-moz-progress-bar]:bg-brand" aria-label="처리를 마친 문항 수" value={progress.current - 1} max={progress.total} />
      <p className="mt-1 text-sm text-ink-4">문항을 순서대로 검토합니다. 중단해도 완료한 결과는 유지됩니다.</p>
    </div>}
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-sm font-bold text-ink-3">이번 검토에서 확인하는 내용</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">{tasks.map(([title, detail]) => <li key={title} className="rounded-xl bg-surface-2 p-4">
        <p className="font-bold text-ink">{title}</p><p className="mt-1 text-sm leading-6 text-ink-3">{detail}</p>
      </li>)}</ul>
    </div>
  </section>;
}

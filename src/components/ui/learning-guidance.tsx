import { Info } from "lucide-react";

export const AI_ANSWER_NOTICE = "LearnCraft AI는 틀릴 수 있으며, 공식 정답이나 채점 기준을 대신하지 않습니다.";
export const EXAM_GUIDANCE = "시험의 정답과 채점 기준은 학교의 공식 해설과 담당 선생님의 안내를 확인하세요.";

export function LearningGuidance() {
  return (
    <aside aria-label="AI 학습 이용 안내" className="rounded-[14px] border border-danger/20 bg-[var(--danger-page)] p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[1rem] leading-6 font-bold text-danger">
        <Info size={19} className="shrink-0" aria-hidden="true" />
        AI와 함께 공부할 때 기억해 주세요
      </p>
      <p className="mt-2 break-keep text-[.9rem] leading-7 text-danger">
        <span className="block">{AI_ANSWER_NOTICE}</span><span className="block">{EXAM_GUIDANCE}</span>
      </p>
      <p className="mt-2 break-keep text-[.9rem] leading-7 text-danger">
        정답이 다르면 문제의 조건과 풀이를 먼저 비교해 보세요. AI 답변만으로 채점 오류를 판단하지 말고, 이해되지 않는 부분의 근거를 선생님께 질문해 주세요.
      </p>
    </aside>
  );
}

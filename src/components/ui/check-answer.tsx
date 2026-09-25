"use client";

import { useContext, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleX, LoaderCircle, PenLine, RotateCcw, Sparkles } from "lucide-react";
import { LearningQuizContext } from "@/components/ui/learning-quiz-context";
import { MistakeRecorderPanel, useMistakeRecord } from "@/components/ui/mistake-recorder";
import { RenderingStreamContext } from "@/components/ui/rendering-state";
import type { CheckAnswerResult } from "@/features/tutor/check-answer";
import { cn } from "@/lib/utils";

const maxAnswerLength = 1000;

const verdictView: Record<CheckAnswerResult["verdict"], { label: string; icon: typeof CircleCheck; tone: string }> = {
  correct: { label: "정답이에요!", icon: CircleCheck, tone: "border-ok/20 bg-[var(--ok-page)] text-ok" },
  partial: { label: "거의 맞았어요. 조금만 더 채워 볼까요?", icon: CircleAlert, tone: "border-[#eadfca] bg-[#fff9ed] text-[#735f35]" },
  incorrect: { label: "다시 생각해 볼까요?", icon: CircleX, tone: "border-danger/15 bg-[var(--danger-page)] text-danger" },
};

type CheckAnswerProps = {
  index: number;
  question: string;
  modelAnswer: string;
  renderInline: (text: string) => ReactNode;
  children: ReactNode;
};

/** Written-answer box shown above a folded "확인 정답" so students answer before peeking. */
export function CheckAnswer({ index, question, modelAnswer, renderInline, children }: CheckAnswerProps) {
  const context = useContext(LearningQuizContext);
  const streaming = useContext(RenderingStreamContext);
  const record = useMistakeRecord(context, context ? `${context.messageId}:c${index}` : "");
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<CheckAnswerResult | null>(null);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lastAnswer, setLastAnswer] = useState("");

  if (!context || streaming) return <>{children}</>;
  const currentContext = context;

  function saveRecord(resolved: boolean, studentAnswer = lastAnswer, attemptCount = attempts) {
    return record.save({ problemMarkdown: question, studentAnswer, correctAnswer: modelAnswer, attempts: attemptCount, hintsUsed: 0, resolved });
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const studentAnswer = answer.trim();
    if (!studentAnswer || grading) return;
    setGrading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: currentContext.unitId, question, modelAnswer, studentAnswer }),
      });
      const payload = await response.json().catch(() => null) as { result?: CheckAnswerResult; error?: string } | null;
      if (!response.ok || !payload?.result) throw new Error(payload?.error ?? "채점을 완료하지 못했어요. 다시 시도해 주세요.");
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setLastAnswer(studentAnswer);
      setResult(payload.result);
      if (payload.result.verdict === "correct" && record.saveState === "saved") void saveRecord(true, studentAnswer, nextAttempts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "채점을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setGrading(false);
    }
  }

  function submitWithShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void submit();
  }

  const view = result ? verdictView[result.verdict] : null;
  const canRecord = result !== null && result.verdict !== "correct";

  return (
    <div className="learncraft-check my-4">
      <div className="learncraft-pdf-exclude overflow-hidden rounded-[14px] border border-brand/20 bg-[linear-gradient(180deg,#fbfaff_0%,#ffffff_100%)] shadow-[0_6px_18px_rgba(86,58,194,.06)]">
        <form onSubmit={submit} className="p-4 sm:p-5">
          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 text-[.84rem] font-bold text-brand-dark"><PenLine size={15} /> 내 답 적어 보기</span>
            <textarea
              value={answer}
              onChange={(event) => { setAnswer(event.target.value); if (result) setResult(null); }}
              onKeyDown={submitWithShortcut}
              maxLength={maxAnswerLength}
              rows={3}
              placeholder="정답 보기를 열기 전에 내 말로 먼저 적어 보세요."
              className="composer w-full resize-y rounded-[11px] border border-line bg-surface px-3.5 py-2.5 text-[.92rem] leading-7 outline-none transition focus:border-brand/40"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="submit" disabled={!answer.trim() || grading} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[11px] border border-brand/25 bg-[linear-gradient(135deg,#ffffff_0%,#f0edff_48%,#e8e2ff_100%)] px-4 text-[.86rem] font-bold text-brand-dark shadow-[0_6px_16px_rgba(86,58,194,.12)] transition hover:-translate-y-px hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">
              {grading ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {grading ? "채점하는 중…" : result ? "고친 답 다시 채점" : "AI에게 채점 받기"}
            </button>
            <span className="text-[.74rem] text-ink-4">{attempts > 0 ? `시도 ${attempts}회 · ` : ""}질문 횟수는 쓰지 않아요</span>
            <span className="figure ml-auto text-[.72rem] text-ink-5">{answer.length}/{maxAnswerLength}</span>
          </div>

          {error && <p className="mt-3 text-[.82rem] font-semibold text-danger" role="alert">{error}</p>}

          {result && view && (
            <div className={cn("mt-4 rounded-[12px] border px-4 py-3.5", view.tone)} role="status">
              <p className="flex items-center gap-1.5 text-[.9rem] font-bold"><view.icon size={17} /> {view.label}</p>
              <p className="mt-2 text-[.88rem] leading-7 text-ink-2">{renderInline(result.feedback)}</p>
              {result.verdict !== "correct" && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[.78rem] text-ink-3">
                  <RotateCcw size={13} /> 답을 고쳐 다시 채점받거나, 아래 ‘정답 보기’로 모범 답안과 비교해 보세요.
                </p>
              )}
              {result.verdict === "correct" && record.saveState === "saved" && <p className="mt-2 text-[.78rem] font-semibold text-ok">오답 기록에 ‘다시 풀어서 해결’로 표시했어요.</p>}
            </div>
          )}
        </form>
        {canRecord && <MistakeRecorderPanel record={record} options={result.missing} onSave={() => void saveRecord(false)} />}
      </div>
      {children}
    </div>
  );
}

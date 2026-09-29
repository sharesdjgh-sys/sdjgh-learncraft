"use client";

import { Component, useContext, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Check, CircleCheck, CircleX, Eye, Lightbulb, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { LearningQuizContext } from "@/components/ui/learning-quiz-context";
import { MistakeRecorderPanel, useMistakeRecord } from "@/components/ui/mistake-recorder";
import { checkQuizAnswer, choiceMarks, parseLearningQuiz, quizAnswerLabel, quizProblemMarkdown } from "@/lib/learning-quiz";
import { cn } from "@/lib/utils";

const noAnswer = "(답을 입력하지 않음)";

type QuizStatus = "idle" | "wrong" | "correct";

type RenderInline = (text: string) => ReactNode;

type LearningQuizProps = { source: string; streaming?: boolean; renderInline: RenderInline };

class LearningQuizBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("learning_quiz_render_failed", error);
  }

  render() {
    if (this.state.failed) {
      return <p data-render-error="quiz" className="my-4 text-[.85rem] text-danger">정답 입력 칸을 표시하지 못했어요. 답을 질문창에 적어 보내면 튜터가 채점해 줄게요.</p>;
    }
    return this.props.children;
  }
}

/** Keeps a broken quiz card from blanking the whole tutor answer. */
export function LearningQuiz(props: LearningQuizProps) {
  return <LearningQuizBoundary><LearningQuizCard {...props} /></LearningQuizBoundary>;
}

function LearningQuizCard({ source, streaming = false, renderInline }: LearningQuizProps) {
  const quiz = useMemo(() => streaming ? null : parseLearningQuiz(source), [source, streaming]);
  const context = useContext(LearningQuizContext);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<QuizStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const [lastAnswer, setLastAnswer] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);
  const record = useMistakeRecord(context, context?.messageId ?? "");

  if (streaming) {
    return <p className="my-5 flex items-center gap-2 rounded-[12px] border border-dashed border-brand/25 bg-brand-page px-4 py-3 text-[.86rem] font-semibold text-brand-dark"><LoaderCircle size={15} className="animate-spin" /> 정답 입력 칸을 준비하고 있어요…</p>;
  }
  if (!quiz) {
    return <p data-render-error="quiz" className="my-4 text-[.85rem] text-danger">정답 입력 칸을 만들지 못했어요. 답을 질문창에 적어 보내면 튜터가 채점해 줄게요.</p>;
  }
  const currentQuiz = quiz;

  const solved = status === "correct";
  const finished = solved || answerShown;
  const canRecord = Boolean(context) && !solved && (status === "wrong" || answerShown);

  function saveRecord(resolved: boolean, answer = lastAnswer, attemptCount = attempts) {
    if (!context) return;
    return record.save({
      problemMarkdown: quizProblemMarkdown(context.markdown) || "확인 문제",
      studentAnswer: answer || noAnswer,
      correctAnswer: quizAnswerLabel(currentQuiz),
      attempts: attemptCount,
      hintsUsed: hintsShown,
      resolved,
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const answer = response.trim();
    if (!answer || finished) return;
    const nextAttempts = attempts + 1;
    const correct = checkQuizAnswer(currentQuiz, answer);
    const label = currentQuiz.type === "choice" ? `${choiceMarks[Number(answer) - 1]} ${currentQuiz.choices?.[Number(answer) - 1] ?? ""}`.trim() : answer;
    setAttempts(nextAttempts);
    setLastAnswer(label);
    setStatus(correct ? "correct" : "wrong");
    if (correct && record.saveState === "saved") void saveRecord(true, label, nextAttempts);
  }

  function retry() {
    setStatus("idle");
    setResponse("");
  }

  return (
    <section className="learncraft-quiz my-6 overflow-hidden rounded-[16px] border border-brand/20 bg-[linear-gradient(180deg,#fbfaff_0%,#ffffff_100%)] shadow-[0_8px_22px_rgba(86,58,194,.07)]" aria-label="확인 문제 답 입력">
      <form onSubmit={submit} className="p-4 sm:p-5">
        {currentQuiz.type === "choice" ? (
          <div>
            <p id={`${context?.messageId ?? "quiz"}-choices`} className="learncraft-pdf-exclude mb-3 text-[.84rem] font-bold text-brand-dark">알맞은 답을 고르세요</p>
            {/* Plain buttons avoid hidden-radio focus scrolling that can push the answer out of view on some browsers. */}
            <div role="radiogroup" aria-labelledby={`${context?.messageId ?? "quiz"}-choices`} className="grid gap-2">
              {currentQuiz.choices?.map((choice, index) => {
                const value = String(index + 1);
                const selected = response === value;
                const isAnswer = finished && value === currentQuiz.answer;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={finished}
                    onClick={() => { setResponse(value); if (status === "wrong") setStatus("idle"); }}
                    className={cn(
                      "flex min-h-11 w-full cursor-pointer items-start gap-2.5 rounded-[11px] border px-3.5 py-2.5 text-left text-[.93rem] leading-7 transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-default",
                      isAnswer ? "border-ok/35 bg-[var(--ok-page)] text-ink" : selected ? (status === "wrong" ? "border-danger/35 bg-[var(--danger-page)]" : "border-brand/40 bg-brand-soft") : "border-line bg-surface enabled:hover:border-brand/25 enabled:hover:bg-brand-page",
                    )}
                  >
                    <span className={cn("shrink-0 font-bold", isAnswer ? "text-ok" : "text-brand")}>{choiceMarks[index]}</span>
                    <span className="min-w-0 flex-1">{renderInline(choice)}</span>
                    {isAnswer && <Check size={17} className="mt-1.5 shrink-0 text-ok" aria-label="정답" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <label className="learncraft-pdf-exclude block">
            <span className="mb-2 block text-[.84rem] font-bold text-brand-dark">내 답 입력</span>
            <input
              value={response}
              onChange={(event) => { setResponse(event.target.value); if (status === "wrong") setStatus("idle"); }}
              disabled={finished}
              maxLength={200}
              placeholder="예: 3, 1/2, x=2"
              autoComplete="off"
              className="composer min-h-12 w-full rounded-[11px] border border-line bg-surface px-4 text-[.95rem] outline-none transition focus:border-brand/40 disabled:bg-surface-2 disabled:text-ink-3"
            />
          </label>
        )}

        <div className="learncraft-pdf-exclude mt-3 flex flex-wrap items-center gap-2">
          {!finished && (
            <button type="submit" disabled={!response.trim()} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[11px] border border-brand/25 bg-[linear-gradient(135deg,#ffffff_0%,#f0edff_48%,#e8e2ff_100%)] px-4 text-[.86rem] font-bold text-brand-dark shadow-[0_6px_16px_rgba(86,58,194,.12)] transition hover:-translate-y-px hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0">
              <Check size={16} /> 정답 확인
            </button>
          )}
          {!finished && hintsShown < currentQuiz.hints.length && (
            <button type="button" onClick={() => setHintsShown((count) => count + 1)} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[11px] border border-[#eadfca] bg-[#fff9ed] px-3.5 text-[.84rem] font-semibold text-[#735f35] transition hover:-translate-y-px hover:border-[#decda9] hover:bg-[#fff5df]">
              <Lightbulb size={15} /> {hintsShown === 0 ? "힌트 보기" : "다음 힌트"} <span className="text-[.74rem] font-normal">{hintsShown + 1}/{currentQuiz.hints.length}</span>
            </button>
          )}
          {!finished && (attempts > 0 || hintsShown > 0) && (
            <button type="button" onClick={() => setAnswerShown(true)} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[11px] border border-line bg-surface px-3.5 text-[.84rem] font-semibold text-ink-3 transition hover:-translate-y-px hover:border-[var(--line-2)] hover:text-ink">
              <Eye size={15} /> 정답 보기
            </button>
          )}
          {attempts > 0 && <span className="ml-auto text-[.74rem] text-ink-4">시도 {attempts}회{hintsShown > 0 ? ` · 힌트 ${hintsShown}개` : ""}</span>}
        </div>

        {hintsShown > 0 && (
          <ol className="learncraft-pdf-exclude mt-4 grid gap-2">
            {currentQuiz.hints.slice(0, hintsShown).map((hint, index) => (
              <li key={index} className="flex gap-2 rounded-[11px] bg-[#fff9ed] px-3.5 py-2.5 text-[.88rem] leading-7 text-[#5d4d2b]">
                <span className="shrink-0 font-bold text-[#8a6d2f]">힌트 {index + 1}</span>
                <span className="min-w-0">{renderInline(hint)}</span>
              </li>
            ))}
          </ol>
        )}

        {status === "wrong" && !answerShown && (
          <div className="learncraft-pdf-exclude mt-4 flex flex-wrap items-center gap-2 rounded-[11px] border border-danger/15 bg-[var(--danger-page)] px-3.5 py-3 text-[.88rem] text-danger" role="status">
            <CircleX size={17} className="shrink-0" />
            <span className="min-w-0 flex-1 font-semibold">아쉽지만 정답이 아니에요. {hintsShown < currentQuiz.hints.length ? "힌트를 보고 다시 풀어 보세요." : "조건을 한 번 더 확인해 보세요."}</span>
            <button type="button" onClick={retry} className="flex min-h-9 cursor-pointer items-center gap-1 rounded-[9px] border border-danger/20 bg-white px-3 text-[.8rem] font-semibold transition hover:border-danger/35"><RotateCcw size={14} /> 다시 풀기</button>
          </div>
        )}

        {finished && (
          <div className={cn("learncraft-pdf-exclude mt-4 rounded-[12px] border px-4 py-3.5", solved ? "border-ok/20 bg-[var(--ok-page)]" : "border-line bg-surface-2")} role="status">
            <p className={cn("flex items-center gap-1.5 text-[.9rem] font-bold", solved ? "text-ok" : "text-ink")}>
              {solved ? <><CircleCheck size={17} /> 정답이에요!</> : <><Eye size={16} /> 정답: {renderInline(quizAnswerLabel(currentQuiz))}</>}
            </p>
            {solved && currentQuiz.type === "short" && <p className="mt-1 text-[.82rem] text-ink-3">정답: {renderInline(currentQuiz.answer)}</p>}
            {currentQuiz.explanation && <p className="mt-2 text-[.88rem] leading-7 text-ink-2">{renderInline(currentQuiz.explanation)}</p>}
            {solved && record.saveState === "saved" && <p className="mt-2 text-[.78rem] font-semibold text-ok">오답 기록에 ‘다시 풀어서 해결’로 표시했어요.</p>}
            {context?.onRequestSolution && (
              <button type="button" onClick={context.onRequestSolution} className="mt-3 flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#cfe6df] bg-[#f1faf7] px-3.5 text-[.82rem] font-semibold text-[#356f65] transition hover:-translate-y-px hover:border-[#bddbd2]">
                <Sparkles size={15} /> 단계별 전체 풀이 보기
              </button>
            )}
          </div>
        )}
      </form>

      {canRecord && <MistakeRecorderPanel record={record} options={currentQuiz.concepts} onSave={() => void saveRecord(false)} />}
    </section>
  );
}

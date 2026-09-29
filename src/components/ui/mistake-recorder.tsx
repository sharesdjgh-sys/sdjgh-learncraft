"use client";

import { useState } from "react";
import { Check, LoaderCircle, NotebookPen } from "lucide-react";
import type { LearningQuizContextValue } from "@/components/ui/learning-quiz-context";
import { cn } from "@/lib/utils";

export const commonConfusions = ["문제가 무엇을 묻는지 모르겠어요", "개념이나 공식이 기억나지 않아요", "풀이 도중 계산·판단 실수를 했어요"] as const;

export type MistakeFields = {
  problemMarkdown: string;
  studentAnswer: string;
  correctAnswer: string;
  attempts: number;
  hintsUsed: number;
  resolved: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

/** Local note state plus the upsert call shared by quiz cards and check questions. */
export function useMistakeRecord(context: LearningQuizContextValue | null, clientQuizId: string) {
  const [confusions, setConfusions] = useState<string[]>([]);
  const [note, setNoteValue] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  function markDirty() {
    if (saveState === "saved" || saveState === "error") setSaveState("idle");
  }

  async function save(fields: MistakeFields) {
    if (!context) return;
    setSaveState("saving");
    try {
      const result = await fetch("/api/quiz-mistakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          clientQuizId,
          unitId: context.unitId,
          problemMarkdown: fields.problemMarkdown.slice(0, 6000),
          studentAnswer: fields.studentAnswer.slice(0, 1000),
          correctAnswer: fields.correctAnswer.slice(0, 3000),
          attempts: Math.max(1, fields.attempts),
          confusions,
          note: note.trim(),
        }),
      });
      if (!result.ok) throw new Error();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return {
    confusions,
    note,
    saveState,
    save,
    toggleConfusion(value: string) {
      setConfusions((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
      markDirty();
    },
    setNote(value: string) {
      setNoteValue(value);
      markDirty();
    },
  };
}

export type MistakeRecord = ReturnType<typeof useMistakeRecord>;

export function MistakeRecorderPanel({ record, options, onSave }: { record: MistakeRecord; options: string[]; onSave: () => void }) {
  const confusionOptions = [...new Set([...options, ...commonConfusions])];
  const { confusions, note, saveState } = record;

  return (
    <div className="learncraft-pdf-exclude border-t border-brand/10 bg-brand-page/60 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-[.88rem] font-bold text-ink"><NotebookPen size={16} className="text-brand" /> 어느 부분에서 막혔나요?</p>
      <p className="mt-1 text-[.78rem] leading-5 text-ink-4">막힌 부분을 기록해 두면 학습 북마크의 ‘오답 기록’에서 다시 확인할 수 있어요.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {confusionOptions.map((option) => {
          const selected = confusions.includes(option);
          return (
            <button key={option} type="button" onClick={() => record.toggleConfusion(option)} aria-pressed={selected} className={cn(
              "min-h-9 cursor-pointer rounded-full border px-3 text-left text-[.8rem] font-semibold transition",
              selected ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-3 hover:border-brand/25 hover:text-ink",
            )}>{option}</button>
          );
        })}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">막힌 부분 직접 적기</span>
        <textarea
          value={note}
          onChange={(event) => record.setNote(event.target.value)}
          maxLength={300}
          rows={2}
          placeholder="내 말로 적어 보기 (선택) · 예: 분모를 0으로 만드는 값을 빼는 걸 잊었어요"
          className="composer w-full resize-none rounded-[11px] border border-line bg-surface px-3.5 py-2.5 text-[.88rem] leading-6 outline-none transition focus:border-brand/40"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saveState === "saving" || saveState === "saved" || (confusions.length === 0 && !note.trim())}
          className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-brand/25 bg-surface px-3.5 text-[.84rem] font-bold text-brand-dark transition hover:-translate-y-px hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {saveState === "saving" ? <LoaderCircle size={15} className="animate-spin" /> : saveState === "saved" ? <Check size={15} /> : <NotebookPen size={15} />}
          {saveState === "saved" ? "기록했어요" : "오답 기록 저장"}
        </button>
        {saveState === "saved" && <a href="/notebook?tab=mistakes" className="text-[.8rem] font-semibold text-brand hover:underline">오답 기록 보기</a>}
        {saveState === "error" && <span className="text-[.8rem] font-semibold text-danger">저장하지 못했어요. 잠시 후 다시 시도해 주세요.</span>}
      </div>
    </div>
  );
}

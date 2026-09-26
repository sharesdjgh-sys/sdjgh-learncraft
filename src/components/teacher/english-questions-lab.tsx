"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, ClipboardCheck, Copy, Eye, EyeOff, FileQuestion, Lightbulb, ListChecks, LoaderCircle, PencilLine, ShieldCheck, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  circled, combinedReviewSchema, difficultyLabels, formatIssues, MAX_TYPES_PER_REQUEST, questionClipboard, questionSchema, questionTypeKeys, questionTypes, reviewDifficultyLabels, splitUnderlines,
  type CombinedReview, type Difficulty, type EnglishQuestion, type QuestionType,
} from "@/features/english-questions/content";

type Mode = "make" | "review";
type Draft = { type: QuestionType | null; instruction: string; intro: string; passage: string; box: string; choices: string[]; answer: number | null };
type ReviewState = { loading: boolean; review?: CombinedReview; error?: string };
type Generated = EnglishQuestion & { id: string };

const endpoint = "/api/teacher/english-questions";
const defaultInstructions: Record<QuestionType, string> = {
  topic: "다음 글의 제목으로 가장 적절한 것은?",
  blank: "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
  order: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?",
  insertion: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?",
  irrelevant: "다음 글에서 전체 흐름과 관계 없는 문장은?",
  grammar: "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?",
  vocabulary: "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
  summary: "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?",
  detail: "다음 글의 내용과 일치하지 않는 것은?",
};
const numberChoiceTypes = new Set<QuestionType>(["insertion", "irrelevant", "grammar", "vocabulary"]);
const emptyDraft: Draft = { type: null, instruction: "", intro: "", passage: "", box: "", choices: ["", "", "", "", ""], answer: null };
const verdictStyle = {
  valid: { label: "문제가 성립합니다", icon: CheckCircle2, className: "border-ok/25 bg-[var(--ok-page)] text-ok" },
  invalid: { label: "문제가 성립하지 않습니다", icon: AlertCircle, className: "border-danger/25 bg-[var(--danger-page)] text-danger" },
  uncertain: { label: "고쳐 보면 좋겠습니다", icon: CircleHelp, className: "border-warn/25 bg-[var(--warn-page)] text-warn" },
} as const;
const judgmentStyle = {
  correct: { label: "정답", className: "bg-[var(--ok-page)] text-ok" },
  incorrect: { label: "오답", className: "bg-surface-2 text-ink-4" },
  arguable: { label: "논란", className: "bg-[var(--warn-page)] text-warn" },
} as const;

// 만든 문제와 입력 중인 내용은 이 브라우저에만 저장합니다. 형식이 맞지 않는 항목은 버리고 기본값으로 시작합니다.
const storageKey = "learncraft_english_questions_v1";
const typeSchema = z.enum(questionTypeKeys as [QuestionType, ...QuestionType[]]);
const storedSchema = z.object({
  mode: z.enum(["make", "review"]).catch("make"),
  passage: z.string().max(20000).catch(""),
  source: z.string().max(100).catch(""),
  types: z.array(typeSchema).max(MAX_TYPES_PER_REQUEST).catch(["topic", "blank", "grammar"]),
  difficulty: z.enum(["basic", "standard", "challenge"]).catch("standard"),
  questions: z.array(questionSchema.extend({ id: z.string() })).max(MAX_TYPES_PER_REQUEST).catch([]),
  originalPassage: z.string().max(20000).catch(""),
  reviews: z.record(z.string(), combinedReviewSchema).catch({}),
  draft: z.object({
    type: typeSchema.nullable(), instruction: z.string(), intro: z.string(), passage: z.string(), box: z.string(),
    choices: z.array(z.string()).length(5), answer: z.number().int().min(1).max(5).nullable(),
  }).catch(emptyDraft),
  draftOriginal: z.string().max(20000).catch(""),
  draftReview: combinedReviewSchema.nullable().catch(null),
});
type Stored = z.infer<typeof storedSchema>;
const initialStored = storedSchema.parse({});
function readStored(): Stored {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? storedSchema.parse(JSON.parse(saved)) : initialStored;
  } catch {
    // 저장소를 쓸 수 없거나 내용이 깨졌으면 빈 화면으로 시작합니다.
    return initialStored;
  }
}
const noop = () => () => {};

const textScales = [90, 100, 115, 130, 150] as const;
const defaultTextScale = 100;
const textScaleKey = "learncraft_english_question_text_scale";
const textScaleListeners = new Set<() => void>();
let memoryTextScale: number = defaultTextScale;
function readTextScale() {
  try {
    const saved = Number(window.localStorage.getItem(textScaleKey));
    return (textScales as readonly number[]).includes(saved) ? saved : memoryTextScale;
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문 동안의 선택을 씁니다.
    return memoryTextScale;
  }
}
function subscribeTextScale(listener: () => void) {
  textScaleListeners.add(listener);
  return () => { textScaleListeners.delete(listener); };
}
function changeTextScale(next: number) {
  memoryTextScale = next;
  try { window.localStorage.setItem(textScaleKey, String(next)); } catch { /* 현재 화면에는 그대로 적용됩니다. */ }
  textScaleListeners.forEach(listener => listener());
}

async function readJson<T>(response: Response) {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}

async function copyToClipboard({ text, html }: { text: string; html: string }) {
  // HTML로 복사하면 한글·워드에 붙여 넣을 때 밑줄이 유지됩니다.
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]);
      return;
    } catch { /* 일반 텍스트 복사로 넘어갑니다. */ }
  }
  await navigator.clipboard.writeText(text);
}

function toDraft(question: EnglishQuestion): Draft {
  return { type: question.type, instruction: question.instruction, intro: question.intro ?? "", passage: question.passage, box: question.box ?? "", choices: [...question.choices], answer: question.answer };
}
function draftQuestion(draft: Draft) {
  return { type: draft.type, instruction: draft.instruction.trim(), intro: draft.intro.trim() || null, passage: draft.passage.trim(), box: draft.box.trim() || null, choices: draft.choices.map(choice => choice.trim()) };
}

function PassageText({ text, className }: { text: string; className?: string }) {
  return (
    <p lang="en" className={cn("whitespace-pre-line break-words", className)}>
      {splitUnderlines(text).map((piece, index) => piece.mark
        ? <Fragment key={index}>{piece.mark}<u className="decoration-ink-2 decoration-1 underline-offset-[5px]">{piece.text}</u></Fragment>
        : <Fragment key={index}>{piece.text}</Fragment>)}
    </p>
  );
}

function QuestionView({ question, number, showAnswer }: { question: ReturnType<typeof draftQuestion> & { answer?: number | null }; number: number; showAnswer?: boolean }) {
  const numberOnly = question.choices.every((choice, index) => choice === circled[index]);
  return (
    <div className="text-[1em] leading-[1.85] text-ink">
      <p className="break-keep font-bold">{number}. {question.instruction || <span className="text-ink-5">발문을 입력해 주세요.</span>}</p>
      {question.intro && <PassageText text={question.intro} className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3" />}
      {question.box && !question.intro && question.type !== "summary" && <PassageText text={question.box} className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3" />}
      <PassageText text={question.passage || " "} className="mt-3 rounded-xl border border-line px-4 py-3" />
      {question.box && (question.intro || question.type === "summary") && <PassageText text={question.box} className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3" />}
      {numberOnly
        ? <p className="mt-3 flex flex-wrap gap-x-8 gap-y-1">{circled.map((mark, index) => <span key={mark} className={cn("rounded-md px-1", showAnswer && question.answer === index + 1 && "bg-[var(--ok-page)] font-bold text-ok")}>{mark}</span>)}</p>
        : <ol className="mt-3 space-y-1">
          {question.choices.map((choice, index) => (
            <li key={index} className={cn("flex gap-2 rounded-lg px-2 py-0.5", showAnswer && question.answer === index + 1 && "bg-[var(--ok-page)] font-semibold text-ok")}>
              <span className="shrink-0">{circled[index]}</span><span lang="en" className="min-w-0 break-words">{choice || <span className="text-ink-5">선택지 {index + 1}</span>}</span>
            </li>
          ))}
        </ol>}
    </div>
  );
}

function ReviewResult({ review, onClose }: { review: CombinedReview; onClose?: () => void }) {
  const verdict = verdictStyle[review.verdict];
  const VerdictIcon = verdict.icon;
  return (
    <section aria-label="문제 성립 검토 결과" className="rounded-[16px] border border-line bg-surface p-4 text-[.92em] shadow-[var(--lift-1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[.8em] font-bold text-brand"><ListChecks size={14} /> AI 문제 성립 검토 · 체감 난이도 {reviewDifficultyLabels[review.difficulty]}</p>
          <p className="mt-1 break-keep text-[.86em] leading-6 text-ink-3">{review.task}</p>
        </div>
        {onClose && <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-5 hover:bg-surface-2 hover:text-ink" aria-label="검토 결과 닫기"><X size={16} /></button>}
      </div>
      <div className={cn("mt-3 rounded-[13px] border p-3.5", verdict.className)}>
        <strong className="flex items-center gap-2"><VerdictIcon size={16} /> {verdict.label}</strong>
        <p className="mt-1.5 break-keep text-[.9em] leading-6 text-ink-3">{review.verdictReason}</p>
        {review.issues.length > 0 && <ul className="mt-2 space-y-1 text-[.88em] leading-6 text-ink-3">{review.issues.map((issue, index) => <li key={index}>· {issue}</li>)}</ul>}
      </div>
      <dl className="mt-3 flex flex-wrap gap-2 text-[.86em]">
        <div className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5"><dt className="font-bold text-ink-3">AI가 푼 정답</dt><dd className="font-extrabold text-ink">{review.answer ? circled[review.answer - 1] : "정할 수 없음"}</dd></div>
        {review.intendedAnswer && <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5", review.match === false ? "bg-[var(--danger-page)] text-danger" : "bg-surface-2")}><dt className="font-bold text-ink-3">의도한 정답</dt><dd className="font-extrabold">{circled[review.intendedAnswer - 1]}</dd></div>}
      </dl>
      <ol className="mt-3 space-y-1.5">
        {review.choices.map((choice, index) => (
          <li key={index} className="flex gap-2.5 rounded-[10px] bg-surface-2 px-3 py-2 text-[.88em] leading-6">
            <span className="shrink-0 font-bold">{circled[index]}</span>
            <span className={cn("h-fit shrink-0 rounded-full px-2 py-0.5 text-[.82em] font-bold", judgmentStyle[choice.judgment].className)}>{judgmentStyle[choice.judgment].label}</span>
            <span className="min-w-0 break-keep text-ink-2">{choice.reason}</span>
          </li>
        ))}
      </ol>
      {review.evidence && <p className="mt-3 text-[.86em] leading-6 text-ink-3"><strong className="text-ink-2">정답 근거</strong> · <span lang="en">{review.evidence}</span></p>}
      {review.languageErrors.length > 0 && (
        <div className="mt-3">
          <h4 className="text-[.86em] font-extrabold">지문·선택지 표현 점검</h4>
          <ul className="mt-1 space-y-1 text-[.86em] leading-6 text-ink-3">{review.languageErrors.map((item, index) => <li key={index}>· {item}</li>)}</ul>
        </div>
      )}
      {review.fixes.length > 0 && (
        <div className="mt-3">
          <h4 className="flex items-center gap-1.5 text-[.86em] font-extrabold"><Lightbulb size={14} className="text-brand" /> 수정 제안</h4>
          <ul className="mt-1 space-y-1 text-[.86em] leading-6 text-ink-3">{review.fixes.map((item, index) => <li key={index}>· {item}</li>)}</ul>
        </div>
      )}
      <p className="mt-3 text-[.78em] leading-5 text-ink-5">AI 검토는 틀릴 수 있습니다. 시험에 출제하기 전에 직접 풀어 확인해 주세요.</p>
    </section>
  );
}

function FormatWarnings({ issues }: { issues: string[] }) {
  if (!issues.length) return null;
  return (
    <div className="rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.84em] leading-6 text-warn">
      <strong className="flex items-center gap-1.5"><AlertTriangle size={14} /> 형식 자동 점검</strong>
      <ul className="mt-0.5">{issues.map(issue => <li key={issue}>· {issue}</li>)}</ul>
    </div>
  );
}

function QuestionCard({ question, number, review, onReview, onEdit, onCloseReview }: {
  question: Generated; number: number; review?: ReviewState;
  onReview: () => void; onEdit: () => void; onCloseReview: () => void;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy(withAnswer: boolean) {
    await copyToClipboard(questionClipboard(question, number, withAnswer));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <article className="space-y-3 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-brand-page px-2.5 py-1 text-[.74rem] font-bold text-brand-dark">{questionTypes[question.type].label}</span>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowAnswer(value => !value)}>{showAnswer ? <EyeOff size={15} /> : <Eye size={15} />} {showAnswer ? "정답 숨기기" : "정답·해설"}</Button>
          <Button variant="ghost" size="sm" onClick={() => void copy(showAnswer)} title={showAnswer ? "정답·해설까지 복사" : "문제만 복사"}>{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "복사"}</Button>
          <Button variant="ghost" size="sm" onClick={onEdit}><PencilLine size={15} /> 고쳐서 검토</Button>
          <Button variant="secondary" size="sm" disabled={review?.loading} onClick={onReview}>{review?.loading ? <LoaderCircle size={15} className="animate-spin" /> : <ListChecks size={15} />} 성립 검토</Button>
        </div>
      </div>
      <QuestionView question={question} number={number} showAnswer={showAnswer} />
      <FormatWarnings issues={formatIssues(question)} />
      {showAnswer && (
        <div className="space-y-1.5 rounded-xl bg-brand-page px-4 py-3 text-[.9em] leading-7 text-ink-2">
          <p><strong className="text-ink">정답</strong> {circled[question.answer - 1]}</p>
          <p className="break-keep"><strong className="text-ink">해설</strong> {question.explanation}</p>
          {question.evidence && <p><strong className="text-ink">근거</strong> <span lang="en">{question.evidence}</span></p>}
          {question.intent && <p className="break-keep text-ink-3"><strong className="text-ink-2">출제 의도</strong> {question.intent}</p>}
        </div>
      )}
      {review?.error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-[var(--danger-page)] px-3.5 py-2.5 text-[.86em] font-semibold text-danger"><AlertCircle size={15} /> {review.error}</p>}
      {review?.review && <ReviewResult review={review.review} onClose={onCloseReview} />}
    </article>
  );
}

export function EnglishQuestionsLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <EnglishQuestionsEditor initial={readStored()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 변형 문제 도구를 준비하는 중…</div>;
}

function EnglishQuestionsEditor({ initial, tabs }: { initial: Stored; tabs?: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [passage, setPassage] = useState(initial.passage);
  const [source, setSource] = useState(initial.source);
  const [types, setTypes] = useState<QuestionType[]>(initial.types);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [questions, setQuestions] = useState<Generated[]>(initial.questions);
  const [originalPassage, setOriginalPassage] = useState(initial.originalPassage);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>(() => Object.fromEntries(Object.entries(initial.reviews).map(([id, review]) => [id, { loading: false, review }])));
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [draftOriginal, setDraftOriginal] = useState(initial.draftOriginal);
  const [draftReview, setDraftReview] = useState<ReviewState>({ loading: false, review: initial.draftReview ?? undefined });
  const textScale = useSyncExternalStore(subscribeTextScale, readTextScale, () => defaultTextScale);
  const controllers = useRef(new Set<AbortController>());
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    // 진행 중이던 요청이나 오류는 저장하지 않고 완료된 검토 결과만 남깁니다.
    const stored: Stored = {
      mode, passage, source, types, difficulty, questions, originalPassage, draft, draftOriginal,
      reviews: Object.fromEntries(Object.entries(reviews).flatMap(([id, state]) => state.review ? [[id, state.review]] : [])),
      draftReview: draftReview.review ?? null,
    };
    try { window.localStorage.setItem(storageKey, JSON.stringify(stored)); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [mode, passage, source, types, difficulty, questions, originalPassage, reviews, draft, draftOriginal, draftReview]);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach(controller => controller.abort());
  }, []);

  function track() {
    const controller = new AbortController();
    controllers.current.add(controller);
    return { signal: controller.signal, done: () => controllers.current.delete(controller) };
  }

  async function generate() {
    const request = track();
    setGenerating(true);
    setGenerateError("");
    try {
      const data = await readJson<{ questions: EnglishQuestion[]; missing: QuestionType[] }>(await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
        body: JSON.stringify({ passage, source, types, difficulty }),
      }));
      setQuestions(data.questions.map((question, index) => ({ ...question, id: `${Date.now()}-${index}` })));
      setOriginalPassage(passage.trim());
      setReviews({});
      if (data.missing.length) setGenerateError(`${data.missing.map(type => questionTypes[type].label).join(", ")} 유형은 만들지 못했어요. 다시 만들어 보세요.`);
    } catch (reason) {
      if (!request.signal.aborted) setGenerateError(reason instanceof Error ? reason.message : "문제를 만들지 못했습니다.");
    } finally {
      request.done();
      setGenerating(false);
    }
  }

  async function requestReview(question: ReturnType<typeof draftQuestion>, intendedAnswer: number | null, original: string, signal: AbortSignal) {
    const data = await readJson<{ review: CombinedReview }>(await fetch(`${endpoint}/review`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ question, intendedAnswer, originalPassage: original }),
    }));
    return data.review;
  }

  async function reviewGenerated(question: Generated) {
    const request = track();
    setReviews(current => ({ ...current, [question.id]: { loading: true } }));
    try {
      const review = await requestReview(draftQuestion(toDraft(question)), question.answer, originalPassage, request.signal);
      setReviews(current => ({ ...current, [question.id]: { loading: false, review } }));
    } catch (reason) {
      if (!request.signal.aborted) setReviews(current => ({ ...current, [question.id]: { loading: false, error: reason instanceof Error ? reason.message : "검토하지 못했습니다." } }));
    } finally {
      request.done();
    }
  }

  async function reviewDraft() {
    const request = track();
    setDraftReview({ loading: true });
    try {
      const review = await requestReview(draftQuestion(draft), draft.answer, draftOriginal.trim(), request.signal);
      setDraftReview({ loading: false, review });
    } catch (reason) {
      if (!request.signal.aborted) setDraftReview({ loading: false, error: reason instanceof Error ? reason.message : "검토하지 못했습니다." });
    } finally {
      request.done();
    }
  }

  function toggleType(type: QuestionType) {
    setTypes(current => current.includes(type) ? current.filter(item => item !== type)
      : current.length >= MAX_TYPES_PER_REQUEST ? current : questionTypeKeys.filter(key => key === type || current.includes(key)));
  }

  function changeDraftType(type: QuestionType | null) {
    setDraft(current => ({
      ...current, type,
      // 비어 있거나 기본 발문 그대로면 유형에 맞는 발문과 번호 선택지로 채웁니다.
      instruction: !current.instruction.trim() || Object.values(defaultInstructions).includes(current.instruction) ? (type ? defaultInstructions[type] : "") : current.instruction,
      choices: type && numberChoiceTypes.has(type) && current.choices.every(choice => !choice.trim() || circled.includes(choice.trim() as typeof circled[number])) ? [...circled] : current.choices,
    }));
  }

  function editQuestion(question: Generated) {
    setDraft(toDraft(question));
    setDraftOriginal(originalPassage);
    setDraftReview({ loading: false });
    setMode("review");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const passageLength = passage.trim().length;
  const canGenerate = passageLength >= 200 && passageLength <= 5000 && types.length > 0 && !generating;
  const draftValue = draftQuestion(draft);
  const canReviewDraft = Boolean(draftValue.instruction && draftValue.passage && draftValue.choices.every(Boolean)) && !draftReview.loading;
  const reviewingAll = questions.some(question => reviews[question.id]?.loading);
  const scaleIndex = textScales.indexOf(textScale as (typeof textScales)[number]);
  const fieldClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-ink-4 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
  const selectClass = "min-h-11 w-full appearance-none rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-10 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand";
  const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40",
    active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><FileQuestion size={16} /> 교사 지원실 · 영어 독해</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">변형 문제 만들기 · 성립 검토</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">영어 지문으로 수능형 5지선다 변형 문제를 만들고, AI가 정답을 모르는 상태에서 다시 풀어 정답이 하나로 정해지는지 검토합니다. 직접 만든 문제도 검토할 수 있어요.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
        <aside className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]">
          <div role="tablist" aria-label="작업 선택" className="grid grid-cols-2 gap-1 border-b border-line bg-surface-2 p-1.5">
            {([["make", "지문으로 만들기", Wand2], ["review", "직접 만든 문제 검토", ListChecks]] as const).map(([value, label, Icon]) => (
              <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)}
                className={cn("flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-[.84rem] font-bold transition-colors", mode === value ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}><Icon size={15} /> {label}</button>
            ))}
          </div>

          {mode === "make" ? (
            <form onSubmit={event => { event.preventDefault(); if (canGenerate) void generate(); }} className="space-y-4 p-4">
              <div>
                <label htmlFor="english-passage" className="flex items-baseline justify-between text-sm font-bold text-ink-2">영어 지문 <span className={cn("text-xs font-semibold tabular-nums", passageLength > 5000 ? "text-danger" : "text-ink-4")}>{passageLength.toLocaleString()} / 5,000자</span></label>
                <textarea id="english-passage" lang="en" value={passage} onChange={event => setPassage(event.target.value)} rows={12} spellCheck={false} placeholder="교과서 본문이나 모의고사 지문을 붙여 넣으세요. (200자 이상)" className={cn(fieldClass, "mt-2 resize-y")} />
              </div>
              <div>
                <label htmlFor="english-source" className="text-sm font-bold text-ink-2">출처 메모 <span className="text-xs font-semibold text-ink-4">(선택)</span></label>
                <input id="english-source" value={source} maxLength={100} onChange={event => setSource(event.target.value)} placeholder="예: 영어Ⅰ Lesson 1 본문" className={cn(fieldClass, "mt-2")} />
              </div>
              <fieldset>
                <legend className="flex w-full items-baseline justify-between text-sm font-bold text-ink-2">문제 유형 <span className="text-xs font-semibold text-ink-4">{types.length} / {MAX_TYPES_PER_REQUEST}개</span></legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {questionTypeKeys.map(type => {
                    const active = types.includes(type);
                    return <button key={type} type="button" aria-pressed={active} disabled={!active && types.length >= MAX_TYPES_PER_REQUEST} onClick={() => toggleType(type)} className={chipClass(active)}>{questionTypes[type].label}</button>;
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-bold text-ink-2">난이도</legend>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(Object.keys(difficultyLabels) as Difficulty[]).map(value => <button key={value} type="button" aria-pressed={difficulty === value} onClick={() => setDifficulty(value)} className={chipClass(difficulty === value)}>{difficultyLabels[value]}</button>)}
                </div>
              </fieldset>
              <Button type="submit" size="lg" className="w-full" disabled={!canGenerate}>{generating ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />} {generating ? "문제를 만드는 중… (최대 1~2분)" : "변형 문제 만들기"}</Button>
              {generateError && <p role="alert" className="flex items-start gap-2 text-xs font-semibold leading-5 text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {generateError}</p>}
            </form>
          ) : (
            <form onSubmit={event => { event.preventDefault(); if (canReviewDraft) void reviewDraft(); }} className="space-y-3.5 p-4">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <span className="relative block">
                  <select aria-label="문제 유형" value={draft.type ?? ""} onChange={event => changeDraftType(event.target.value ? event.target.value as QuestionType : null)} className={selectClass}>
                    <option value="">유형 선택 안 함</option>
                    {questionTypeKeys.map(type => <option key={type} value={type}>{questionTypes[type].label}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                </span>
                <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => { setDraft(emptyDraft); setDraftOriginal(""); setDraftReview({ loading: false }); }}>비우기</Button>
              </div>
              <label className="block text-sm font-bold text-ink-2">발문
                <input value={draft.instruction} maxLength={200} onChange={event => setDraft({ ...draft, instruction: event.target.value })} placeholder="예: 다음 글의 제목으로 가장 적절한 것은?" className={cn(fieldClass, "mt-1.5 font-normal")} />
              </label>
              {(draft.type === "order" || draft.intro) && (
                <label className="block text-sm font-bold text-ink-2">주어진 글
                  <textarea lang="en" value={draft.intro} rows={3} onChange={event => setDraft({ ...draft, intro: event.target.value })} className={cn(fieldClass, "mt-1.5 resize-y font-normal")} />
                </label>
              )}
              <label className="block text-sm font-bold text-ink-2">지문
                <textarea lang="en" value={draft.passage} rows={9} spellCheck={false} onChange={event => setDraft({ ...draft, passage: event.target.value })} placeholder="밑줄은 ①[표현], 빈칸은 __________, 삽입 위치는 ( ① )처럼 적어 주세요." className={cn(fieldClass, "mt-1.5 resize-y font-normal")} />
              </label>
              {(draft.type === "insertion" || draft.type === "summary" || draft.box) && (
                <label className="block text-sm font-bold text-ink-2">{draft.type === "summary" ? "요약문" : "주어진 문장"}
                  <textarea lang="en" value={draft.box} rows={2} onChange={event => setDraft({ ...draft, box: event.target.value })} className={cn(fieldClass, "mt-1.5 resize-y font-normal")} />
                </label>
              )}
              <fieldset>
                <legend className="text-sm font-bold text-ink-2">선택지</legend>
                <div className="mt-1.5 space-y-1.5">
                  {draft.choices.map((choice, index) => (
                    <label key={index} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center font-bold text-ink-3">{circled[index]}</span>
                      <input lang="en" value={choice} maxLength={300} aria-label={`선택지 ${index + 1}`} onChange={event => setDraft({ ...draft, choices: draft.choices.map((item, position) => position === index ? event.target.value : item) })} className={cn(fieldClass, "py-2")} />
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-bold text-ink-2">의도한 정답 <span className="text-xs font-semibold text-ink-4">(AI에게는 알려 주지 않고 비교만 해요)</span></legend>
                <div className="mt-1.5 grid grid-cols-6 gap-1.5">
                  <button type="button" aria-pressed={draft.answer === null} onClick={() => setDraft({ ...draft, answer: null })} className={chipClass(draft.answer === null)}>모름</button>
                  {circled.map((mark, index) => <button key={mark} type="button" aria-pressed={draft.answer === index + 1} onClick={() => setDraft({ ...draft, answer: index + 1 })} className={chipClass(draft.answer === index + 1)}>{mark}</button>)}
                </div>
              </fieldset>
              <details className="group rounded-xl border border-line bg-surface-2 px-3.5 py-2.5" open={Boolean(draftOriginal)}>
                <summary className="cursor-pointer text-sm font-bold text-ink-2">원문 지문 <span className="text-xs font-semibold text-ink-4">(선택 · 변형 오류 확인용)</span></summary>
                <textarea lang="en" value={draftOriginal} rows={5} spellCheck={false} onChange={event => setDraftOriginal(event.target.value)} className={cn(fieldClass, "mt-2 resize-y")} />
              </details>
              <Button type="submit" size="lg" className="w-full" disabled={!canReviewDraft}>{draftReview.loading ? <LoaderCircle size={17} className="animate-spin" /> : <ListChecks size={17} />} {draftReview.loading ? "AI가 직접 풀어 보는 중…" : "문제 성립 검토"}</Button>
            </form>
          )}
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="문제 글자 크기" className="flex h-10 items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-[var(--lift-1)]">
              <button type="button" onClick={() => changeTextScale(textScales[scaleIndex - 1])} disabled={scaleIndex <= 0} aria-label="글자 작게" className="grid h-8 min-w-9 place-items-center rounded-full text-[.74rem] font-extrabold text-ink-3 hover:bg-brand-soft hover:text-brand disabled:opacity-25">가−</button>
              <button type="button" onClick={() => changeTextScale(defaultTextScale)} disabled={textScale === defaultTextScale} aria-label={`글자 크기 ${textScale}%, 기본 크기로 되돌리기`} className="h-8 min-w-11 rounded-full text-[.7rem] font-bold tabular-nums text-ink-4 hover:bg-brand-soft hover:text-brand disabled:hover:bg-transparent">{textScale}%</button>
              <button type="button" onClick={() => changeTextScale(textScales[scaleIndex + 1])} disabled={scaleIndex >= textScales.length - 1} aria-label="글자 크게" className="grid h-8 min-w-9 place-items-center rounded-full text-[.9rem] font-extrabold text-ink-3 hover:bg-brand-soft hover:text-brand disabled:opacity-25">가+</button>
            </div>
            {mode === "make" && questions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Button variant="ghost" size="sm" disabled={generating || reviewingAll} onClick={async () => {
                  if (await confirm({ eyebrow: "변형 문제", title: "만든 문제를 지울까요?", tone: "danger", confirmLabel: "결과 지우기", description: `만든 문제 ${questions.length}개와 성립 검토 결과를 지웁니다.`, note: "입력한 지문과 출처 메모는 그대로 남아요. 지운 문제는 되돌릴 수 없어요." })) { setQuestions([]); setReviews({}); setGenerateError(""); }
                }}><Trash2 size={15} /> 결과 지우기</Button>
                <Button variant="secondary" size="sm" onClick={() => void copyToClipboard(joinClipboard(questions))}><Copy size={15} /> 전체 복사</Button>
                <Button variant="secondary" size="sm" disabled={reviewingAll} onClick={() => questions.forEach(question => void reviewGenerated(question))}>{reviewingAll ? <LoaderCircle size={15} className="animate-spin" /> : <ListChecks size={15} />} 모두 검토</Button>
              </div>
            )}
          </div>

          <div style={{ fontSize: `${textScale / 100}rem` }} className="space-y-4">
            {mode === "make" ? (
              questions.length ? questions.map((question, index) => (
                <QuestionCard key={question.id} question={question} number={index + 1} review={reviews[question.id]}
                  onReview={() => void reviewGenerated(question)} onEdit={() => editQuestion(question)}
                  onCloseReview={() => setReviews(current => { const next = { ...current }; delete next[question.id]; return next; })} />
              )) : generating
                ? <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand/25 bg-brand-page text-[.9em] font-semibold text-brand-dark"><LoaderCircle size={26} className="animate-spin" /> 지문을 분석해 문제를 만들고 스스로 다시 풀어 보는 중이에요…</div>
                : <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-6 text-center text-[.9em] text-ink-3"><Wand2 size={24} className="text-brand" /><p className="font-bold text-ink-2">지문을 붙여 넣고 유형을 골라 변형 문제를 만들어 보세요.</p><p>만든 문제는 ‘성립 검토’로 정답이 하나인지 확인하고, 복사해서 한글·워드에 붙여 넣을 수 있어요.</p><p className="text-[.9em] text-ink-4">입력한 지문과 만든 문제는 이 브라우저에 자동으로 저장돼요.</p></div>
            ) : (
              <>
                <article className="space-y-3 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)] sm:p-5">
                  <p className="text-[.74rem] font-bold text-ink-4">학생에게 보이는 모습 미리보기</p>
                  <QuestionView question={{ ...draftValue, answer: draft.answer }} number={1} />
                  <FormatWarnings issues={draftValue.passage ? formatIssues(draftValue) : []} />
                </article>
                {draftReview.error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-[var(--danger-page)] px-3.5 py-2.5 text-[.86em] font-semibold text-danger"><AlertCircle size={15} /> {draftReview.error}</p>}
                {draftReview.review && <ReviewResult review={draftReview.review} />}
              </>
            )}
          </div>
        </div>
      </section>
      {confirmDialog}
    </div>
  );
}

function joinClipboard(questions: Generated[]) {
  const parts = questions.map((question, index) => questionClipboard(question, index + 1, false));
  const answers = questions.map((question, index) => `${index + 1}. ${circled[question.answer - 1]}`).join("   ");
  return {
    text: `${parts.map(part => part.text).join("\n\n\n")}\n\n\n[정답] ${answers}`,
    html: `${parts.map(part => part.html).join("<br>")}<p>[정답] ${answers}</p>`,
  };
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  BookCopy,
  BookOpenCheck,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Eye,
  Gauge,
  Layers3,
  LibraryBig,
  Lightbulb,
  ListTree,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { subjects } from "@/data/curriculum";
import { cn } from "@/lib/utils";
import type { LearningLevel, LearningUnit, SubjectCode, TutorAction, TutorMessage } from "@/types";

const actionConfig: Array<{ action: TutorAction; label: string; shortLabel: string; description: string; icon: typeof Sparkles }> = [
  { action: "EASIER", label: "더 쉽게 설명", shortLabel: "더 쉽게", description: "비유와 작은 예제로 다시 설명해요", icon: Lightbulb },
  { action: "DEEPER", label: "원리까지 깊게", shortLabel: "더 깊게", description: "조건과 개념의 연결을 살펴봐요", icon: ListTree },
  { action: "REVEAL", label: "전체 풀이 보기", shortLabel: "풀이 보기", description: "중간 단계를 생략하지 않고 풀어요", icon: Eye },
  { action: "QUIZ", label: "확인 문제 풀기", shortLabel: "확인 문제", description: "방금 배운 내용을 바로 확인해요", icon: CircleHelp },
];

const levelConfig: Array<{ level: LearningLevel; label: string; description: string }> = [
  { level: "FOUNDATION", label: "기초", description: "용어부터 차근차근" },
  { level: "STANDARD", label: "표준", description: "개념과 대표 예제" },
  { level: "ADVANCED", label: "심화", description: "원리와 개념 연결" },
];

type SavedLearningSession = {
  unitId: string;
  grade?: 1 | 2 | 3;
  learningLevel: LearningLevel;
  messages: TutorMessage[];
};

function isLearningLevel(value: unknown): value is LearningLevel {
  return value === "FOUNDATION" || value === "STANDARD" || value === "ADVANCED";
}

function isSavedSession(value: unknown): value is SavedLearningSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedLearningSession>;
  return typeof candidate.unitId === "string"
    && (candidate.grade === undefined || candidate.grade === 1 || candidate.grade === 2 || candidate.grade === 3)
    && isLearningLevel(candidate.learningLevel)
    && Array.isArray(candidate.messages);
}

export function LearningWorkspace({ units, initialGrade, studentName, schoolName }: { units: LearningUnit[]; initialGrade: number; studentName: string; schoolName: string }) {
  const initialUnitId = units.find((unit) => unit.recommendedGrades.includes(initialGrade as 1 | 2 | 3) && unit.subjectCode === "MATH")?.id ?? units[0]?.id ?? "";
  const [grade, setGrade] = useState<1 | 2 | 3>(initialGrade as 1 | 2 | 3);
  const [subject, setSubject] = useState<SubjectCode>("MATH");
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId);
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("STANDARD");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [retryRequest, setRetryRequest] = useState<{ action: TutorAction; preset?: string } | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const filteredUnits = useMemo(
    () => units.filter((unit) => unit.recommendedGrades.includes(grade) && unit.subjectCode === subject),
    [units, grade, subject],
  );
  const selectedUnit = (units.find((unit) => unit.id === selectedUnitId) ?? filteredUnits[0] ?? units[0])!;

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let savedSession: SavedLearningSession | null = null;
    let savedUnit: LearningUnit | undefined;
    try {
      const raw = sessionStorage.getItem("learncraft_chat");
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (isSavedSession(saved)) {
          savedUnit = units.find((unit) => unit.id === saved.unitId);
          if (savedUnit) savedSession = saved;
        }
      }
    } catch {
      sessionStorage.removeItem("learncraft_chat");
    }

    const restoreTimer = window.setTimeout(() => {
      if (savedSession && savedUnit) {
        setSelectedUnitId(savedUnit.id);
        setGrade(savedSession.grade ?? savedUnit.grade);
        setSubject(savedUnit.subjectCode);
        setLearningLevel(savedSession.learningLevel);
        setMessages(savedSession.messages.filter((message) => Boolean(message?.id && message?.content)).slice(-20));
      }
      setSessionReady(true);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [units]);

  useEffect(() => {
    if (!sessionReady || !selectedUnitId) return;
    const completedMessages = messages.filter((message) => message.role === "user" || message.completed);
    sessionStorage.setItem("learncraft_chat", JSON.stringify({
      unitId: selectedUnitId,
      grade,
      learningLevel,
      messages: completedMessages.slice(-20),
    } satisfies SavedLearningSession));
  }, [grade, learningLevel, messages, selectedUnitId, sessionReady]);

  useEffect(() => {
    if (autoScrollRef.current) {
      messageEndRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth", block: "end" });
    }
  }, [loading, messages]);

  function trackScrollPosition() {
    const container = messageScrollRef.current;
    if (!container) return;
    autoScrollRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 140;
  }

  function resetConversation(showNotice = true) {
    setMessages([]);
    setRetryRequest(null);
    sessionStorage.removeItem("learncraft_chat");
    if (showNotice) {
      setNotice("새 학습 대화를 시작했어요.");
      window.setTimeout(() => setNotice(""), 2200);
    }
  }

  function selectUnit(unitId: string) {
    if (unitId === selectedUnitId) {
      setDrawerOpen(false);
      return;
    }
    setSelectedUnitId(unitId);
    resetConversation(false);
    setDrawerOpen(false);
  }

  function changeGrade(nextGrade: 1 | 2 | 3) {
    setGrade(nextGrade);
    const nextUnit = units.find((unit) => unit.recommendedGrades.includes(nextGrade) && unit.subjectCode === subject);
    if (nextUnit) selectUnit(nextUnit.id);
  }

  function changeSubject(nextSubject: SubjectCode) {
    setSubject(nextSubject);
    const nextUnit = units.find((unit) => unit.recommendedGrades.includes(grade) && unit.subjectCode === nextSubject);
    if (nextUnit) selectUnit(nextUnit.id);
  }

  async function ask(action: TutorAction = "QUESTION", preset?: string) {
    if (!selectedUnit || loading || remaining <= 0) return;
    const question = (preset ?? input).trim();
    if (action === "QUESTION" && !question) return;

    const actionLabel = actionConfig.find((item) => item.action === action)?.label ?? "질문";
    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: action === "QUESTION" ? question : actionLabel,
      action,
      completed: true,
    };
    const answerId = crypto.randomUUID();
    const assistantMessage: TutorMessage = { id: answerId, role: "assistant", content: "", action, completed: false };
    const recentMessages = messages
      .filter((message) => message.content && message.completed)
      .slice(-6)
      .map(({ role, content }) => ({ role, content: content.slice(0, 3000) }));

    setMessages((current) => [...current, userMessage, assistantMessage]);
    autoScrollRef.current = true;
    setInput("");
    if (textAreaRef.current) textAreaRef.current.style.height = "auto";
    setLoading(true);
    setRetryRequest(null);
    setNotice("");

    try {
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          unitId: selectedUnit.id,
          action,
          message: action === "QUESTION" ? question : undefined,
          learningLevel,
          recentMessages,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "AI 튜터와 연결할 수 없어요.");
      }

      const nextRemaining = Number(response.headers.get("X-Remaining-Usage"));
      if (Number.isFinite(nextRemaining)) setRemaining(nextRemaining);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("답변 스트림을 시작할 수 없어요.");

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          accumulated += decoder.decode();
          break;
        }
        accumulated += decoder.decode(value, { stream: true });
        const nextContent = accumulated;
        setMessages((current) => current.map((message) => message.id === answerId ? { ...message, content: nextContent } : message));
      }
      if (!accumulated.trim()) throw new Error("비어 있는 답변이 도착했어요.");
      setMessages((current) => current.map((message) => message.id === answerId ? { ...message, content: accumulated, completed: true } : message));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "답변을 불러오지 못했어요.";
      setMessages((current) => current.map((item) => item.id === answerId
        ? { ...item, content: item.content || `답변을 끝까지 불러오지 못했어요.\n\n> ${errorMessage}`, completed: false }
        : item));
      setRetryRequest({ action, preset });
    } finally {
      setLoading(false);
    }
  }

  async function bookmarkMessage(message: TutorMessage) {
    if (!selectedUnit || !message.completed || savedIds.has(message.id)) return;
    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientAnswerId: message.id,
        unitId: selectedUnit.id,
        answerMode: message.action ?? "QUESTION",
        title: `${selectedUnit.title} 학습 메모`,
        answerMarkdown: message.content,
      }),
    });
    if (response.ok) {
      setSavedIds((current) => new Set(current).add(message.id));
      setNotice("답변을 오답 노트에 저장했어요.");
      window.setTimeout(() => setNotice(""), 2400);
    }
  }

  return (
    <div className="app-enter h-dvh min-h-[40rem] xl:grid xl:grid-cols-[16.5rem_minmax(0,1fr)] 2xl:grid-cols-[16.5rem_minmax(0,1fr)_19rem]">
      <aside className="scrollbar-subtle hidden overflow-y-auto border-r border-line bg-white/72 px-4 py-6 backdrop-blur-sm xl:block">
        <CurriculumPicker
          grade={grade}
          subject={subject}
          units={filteredUnits}
          selectedUnitId={selectedUnit.id}
          onGrade={changeGrade}
          onSubject={changeSubject}
          onUnit={selectUnit}
        />
      </aside>

      <section className="flex h-full min-h-0 min-w-0 flex-col bg-white/24 pb-[calc(5.45rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="z-20 flex min-h-[4.7rem] shrink-0 items-center justify-between border-b border-line bg-white/88 px-4 backdrop-blur-xl sm:px-6">
          <div className="min-w-0">
            <button onClick={() => setDrawerOpen(true)} className="mb-1 flex cursor-pointer items-center gap-1.5 text-[.7rem] font-semibold text-brand xl:pointer-events-none" aria-label="학습 단원 선택 열기">
              <span className="sm:hidden">{schoolName} · {grade}학년</span>
              <span className="hidden sm:inline">{grade}학년 · {selectedUnit.courseTitle} · {selectedUnit.chapterTitle}</span>
              <ChevronDown size={14} className="xl:hidden" />
            </button>
            <h1 className="truncate text-[1.05rem] font-bold tracking-[-0.025em] text-ink sm:text-lg">{selectedUnit.title}</h1>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2">
            <label className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft sm:flex">
              <Target size={15} className="text-brand" />
              <span className="sr-only">설명 난이도</span>
              <select value={learningLevel} onChange={(event) => setLearningLevel(event.target.value as LearningLevel)} className="cursor-pointer bg-transparent font-semibold text-ink outline-none">
                {levelConfig.map((item) => <option key={item.level} value={item.level}>{item.label}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand-dark" title="오늘 남은 AI 학습 횟수">
              <Gauge size={15} /> <span className="tabular-nums">{remaining}회</span>
            </div>
            <button onClick={() => resetConversation()} disabled={loading || messages.length === 0} className="hidden size-9 cursor-pointer place-items-center rounded-xl text-ink-soft transition hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 md:grid" aria-label="새 대화 시작" title="새 대화">
              <Plus size={18} />
            </button>
            <button onClick={() => setConceptOpen(true)} className="grid size-9 cursor-pointer place-items-center rounded-xl text-ink-soft transition hover:bg-surface-muted hover:text-ink 2xl:hidden" aria-label="단원 핵심 개념 보기">
              <Layers3 size={18} />
            </button>
          </div>
        </header>

        <div ref={messageScrollRef} onScroll={trackScrollPosition} className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto flex min-h-full w-full max-w-[55rem] flex-col px-4 py-6 sm:px-7 sm:py-8">
            {messages.length === 0 ? (
              <Welcome unit={selectedUnit} studentName={studentName} learningLevel={learningLevel} onLevel={setLearningLevel} onQuestion={(question) => void ask("QUESTION", question)} />
            ) : (
              <div className="flex-1 space-y-7 pb-4">
                {messages.map((message, index) => (
                  <article key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "user" ? (
                      <div className="max-w-[88%] rounded-[1.25rem_1.25rem_.35rem_1.25rem] bg-ink px-4 py-3 text-[.93rem] leading-6 text-white shadow-[0_8px_22px_rgba(23,32,51,.12)] sm:max-w-[74%]">
                        {message.content}
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-2.5 flex items-center gap-2">
                          <span className="grid size-7 place-items-center rounded-lg bg-brand text-white"><Sparkles size={14} /></span>
                          <span className="text-xs font-bold text-ink">LearnCraft 튜터</span>
                          {!message.completed && message.content && <span className="text-[.68rem] font-medium text-ink-soft">답변 작성 중</span>}
                        </div>
                        <div className="rounded-[.35rem_1.25rem_1.25rem_1.25rem] border border-line bg-white px-4 py-5 shadow-[0_10px_36px_rgba(42,54,91,.055)] sm:px-6 sm:py-6">
                          {message.content ? <Markdown>{message.content}</Markdown> : <Thinking />}
                          {message.completed && (
                            <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
                              <span className="flex items-center gap-1.5 text-[.68rem] font-medium text-ink-soft"><Check size={13} className="text-brand" /> 답변 완료</span>
                              <button onClick={() => void bookmarkMessage(message)} className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-ink-soft transition hover:bg-brand-soft hover:text-brand-dark" aria-label="답변을 오답 노트에 저장">
                                {savedIds.has(message.id) ? <BookmarkCheck size={16} className="text-brand" /> : <Bookmark size={16} />}
                                <span className="hidden sm:inline">{savedIds.has(message.id) ? "저장됨" : "저장"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {message.completed && index === messages.length - 1 && (
                          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            {actionConfig.map(({ action, shortLabel, icon: Icon }) => (
                              <button key={action} onClick={() => void ask(action)} disabled={loading || remaining <= 0} className="flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-[#b9c2db] hover:text-ink hover:shadow-sm active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40">
                                <Icon size={15} className="text-brand" />{shortLabel}
                              </button>
                            ))}
                          </div>
                        )}
                        {!message.completed && message.content && retryRequest && index === messages.length - 1 && (
                          <button onClick={() => void ask(retryRequest.action, retryRequest.preset)} disabled={loading} className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-xs font-semibold text-ink transition hover:border-brand/35 hover:bg-brand-soft">
                            <RotateCcw size={15} className="text-brand" /> 답변 다시 받기
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-line bg-white/92 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto max-w-[55rem]">
            {remaining <= 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#efd3d5] bg-[#fff4f4] p-4 text-center text-sm font-semibold text-danger"><AlertCircle size={18} /> 오늘의 AI 학습 횟수를 모두 사용했어요. 내일 다시 이용해 주세요.</div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="rounded-[1.15rem] border border-[#cfd5e2] bg-white p-2 shadow-[0_12px_38px_rgba(42,54,91,.11)] transition focus-within:border-brand/55 focus-within:shadow-[0_14px_44px_rgba(56,88,201,.13)]">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textAreaRef}
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      event.currentTarget.style.height = "auto";
                      event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`;
                    }}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(); } }}
                    rows={1}
                    maxLength={1200}
                    placeholder={`${selectedUnit.title}에서 막힌 부분을 그대로 적어 보세요`}
                    className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-[.93rem] leading-6 text-ink outline-none placeholder:text-[#99a1b1]"
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || loading} aria-label="질문 보내기" className="rounded-[.85rem]"><Send size={18} /></Button>
                </div>
                <div className="flex items-center justify-between px-3 pb-0.5 pt-1 text-[.65rem] text-[#929bad]">
                  <span>Enter 전송 · Shift+Enter 줄바꿈</span><span className="tabular-nums">{input.length}/1200</span>
                </div>
              </form>
            )}
            <p className="mt-2 text-center text-[.64rem] text-[#929bad]">AI 답변은 틀릴 수 있어요. 중요한 내용은 교과서와 선생님께 다시 확인하세요.</p>
          </div>
        </div>
      </section>

      <aside className="scrollbar-subtle hidden overflow-y-auto border-l border-line bg-white/68 px-5 py-6 backdrop-blur-sm 2xl:block"><ConceptPanel unit={selectedUnit} /></aside>

      {drawerOpen && (
        <Sheet title="학습 단원 선택" onClose={() => setDrawerOpen(false)}>
          <CurriculumPicker grade={grade} subject={subject} units={filteredUnits} selectedUnitId={selectedUnit.id} onGrade={changeGrade} onSubject={changeSubject} onUnit={selectUnit} />
        </Sheet>
      )}
      {conceptOpen && (
        <Sheet title="단원 핵심 노트" onClose={() => setConceptOpen(false)} side="right">
          <ConceptPanel unit={selectedUnit} />
        </Sheet>
      )}

      {notice && <div className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-xl lg:bottom-6"><Check size={16} />{notice}</div>}
    </div>
  );
}

function CurriculumPicker({ grade, subject, units, selectedUnitId, onGrade, onSubject, onUnit }: {
  grade: 1 | 2 | 3;
  subject: SubjectCode;
  units: LearningUnit[];
  selectedUnitId: string;
  onGrade: (grade: 1 | 2 | 3) => void;
  onSubject: (subject: SubjectCode) => void;
  onUnit: (id: string) => void;
}) {
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? units[0];
  const courseOptions = useMemo(() => {
    const seen = new Set<string>();
    return units
      .filter((unit) => {
        if (seen.has(unit.courseCode)) return false;
        seen.add(unit.courseCode);
        return true;
      })
      .sort((a, b) => a.courseOrder - b.courseOrder);
  }, [units]);
  const selectedCourseCode = selectedUnit?.courseCode ?? courseOptions[0]?.courseCode ?? "";
  const courseUnits = useMemo(
    () => units.filter((unit) => unit.courseCode === selectedCourseCode),
    [selectedCourseCode, units],
  );
  const chapterGroups = useMemo(() => {
    const groups = new Map<number, { title: string; order: number; sections: Map<number, { title: string; order: number; units: LearningUnit[] }> }>();
    for (const unit of courseUnits) {
      const chapter = groups.get(unit.chapterOrder) ?? {
        title: unit.chapterTitle,
        order: unit.chapterOrder,
        sections: new Map(),
      };
      const section = chapter.sections.get(unit.sectionOrder) ?? {
        title: unit.sectionTitle,
        order: unit.sectionOrder,
        units: [],
      };
      section.units.push(unit);
      chapter.sections.set(unit.sectionOrder, section);
      groups.set(unit.chapterOrder, chapter);
    }
    return [...groups.values()]
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({
        ...chapter,
        sections: [...chapter.sections.values()]
          .sort((a, b) => a.order - b.order)
          .map((section) => ({ ...section, units: section.units.sort((a, b) => a.topicOrder - b.topicOrder) })),
      }));
  }, [courseUnits]);
  const selectedCourse = courseOptions.find((unit) => unit.courseCode === selectedCourseCode);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 text-sm font-bold text-ink"><LibraryBig size={18} className="text-brand" /> 교육과정 탐색</div>
      <p className="mt-1.5 px-1 text-[.72rem] leading-5 text-ink-soft">과목부터 세부 학습 주제까지 학교 진도에 맞춰 선택하세요.</p>
      <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
        {([1, 2, 3] as const).map((item) => <button key={item} onClick={() => onGrade(item)} className={cn("min-h-9 cursor-pointer rounded-lg text-xs font-semibold transition active:scale-[.97]", grade === item ? "bg-white text-brand-dark shadow-sm" : "text-ink-soft hover:text-ink")}>{item}학년</button>)}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {subjects.map((item) => <button key={item.code} onClick={() => onSubject(item.code)} className={cn("min-h-10 cursor-pointer rounded-xl border text-xs font-semibold transition active:scale-[.97]", subject === item.code ? "border-brand/25 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-soft hover:border-[#c3cad8] hover:text-ink")}>{item.title}</button>)}
      </div>

      {courseOptions.length > 0 ? (
        <div className="mt-6">
          <label className="block px-1 text-[.67rem] font-bold tracking-[.08em] text-[#929bad] uppercase" htmlFor={`course-${grade}-${subject}`}>수강 과목</label>
          <div className="relative mt-2.5">
            <BookCopy size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-brand" />
            <select
              id={`course-${grade}-${subject}`}
              value={selectedCourseCode}
              onChange={(event) => {
                const firstUnit = units.find((unit) => unit.courseCode === event.target.value);
                if (firstUnit) onUnit(firstUnit.id);
              }}
              className="min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-line bg-white py-2 pl-9 pr-9 text-sm font-bold text-ink outline-none"
            >
              {courseOptions.map((course) => (
                <option key={course.courseCode} value={course.courseCode}>
                  {course.courseTitle} · {units.filter((unit) => unit.courseCode === course.courseCode).length}개 주제
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          </div>

          {selectedCourse && (
            <div className={cn("mt-2.5 rounded-xl border px-3 py-2.5", selectedCourse.schoolAdopted ? "border-[#d8e4dc] bg-[#f4f8f5]" : "border-[#eadfd6] bg-accent-soft") }>
              <p className={cn("flex items-center gap-1.5 text-[.68rem] font-bold", selectedCourse.schoolAdopted ? "text-[#3d7055]" : "text-[#98572e]") }>
                {selectedCourse.schoolAdopted ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />}
                {selectedCourse.schoolAdopted ? "서대전여고 채택 교과서" : "비상교육 기준 참고 과정"}
              </p>
              <p className="mt-1 text-[.64rem] leading-4 text-ink-soft">
                비상교육 · {selectedCourse.curriculum}
                {!selectedCourse.schoolAdopted && selectedCourse.schoolPublisherName ? ` · 학교 채택본 ${selectedCourse.schoolPublisherName}` : ""}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-5">
            {chapterGroups.map((chapter) => (
              <section key={`${selectedCourseCode}-${chapter.order}`}>
                <div className="flex items-center gap-2 px-1">
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-ink text-[.62rem] font-bold text-white">{chapter.order}</span>
                  <h3 className="text-xs font-extrabold text-ink">{chapter.title}</h3>
                </div>
                <div className="mt-2.5 grid gap-3 border-l border-[#d9deea] pl-2.5">
                  {chapter.sections.map((section) => (
                    <div key={`${chapter.order}-${section.order}`}>
                      {(section.units.length > 1 || section.title !== section.units[0]?.title) && (
                        <p className="mb-1.5 px-1 text-[.66rem] font-bold text-[#7d8799]">{section.order}. {section.title}</p>
                      )}
                      <div className="grid gap-1">
                        {section.units.map((unit) => (
                          <button
                            key={unit.id}
                            onClick={() => onUnit(unit.id)}
                            className={cn(
                              "group flex min-h-[2.9rem] cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-left transition-all duration-200 active:scale-[.985]",
                              selectedUnitId === unit.id
                                ? "bg-ink text-white shadow-[0_8px_20px_rgba(23,32,51,.13)]"
                                : "text-ink-soft hover:bg-white hover:text-ink hover:shadow-sm",
                            )}
                          >
                            <span className={cn("grid size-6 shrink-0 place-items-center rounded-md text-[.58rem] font-bold", selectedUnitId === unit.id ? "bg-white/12 text-white" : "bg-brand-soft text-brand")}>{chapter.order}.{section.order}</span>
                            <span className="min-w-0 truncate text-[.76rem] font-semibold">{unit.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white/60 px-4 py-7 text-center">
          <p className="text-xs font-bold text-ink">이 학년에 공개된 과목이 없어요.</p>
          <p className="mt-1 text-[.68rem] leading-5 text-ink-soft">다른 학년이나 과목을 선택해 주세요.</p>
        </div>
      )}
    </div>
  );
}

function Welcome({ unit, studentName, learningLevel, onLevel, onQuestion }: { unit: LearningUnit; studentName: string; learningLevel: LearningLevel; onLevel: (level: LearningLevel) => void; onQuestion: (question: string) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-3 sm:py-8">
      <div className="max-w-[44rem]">
        <div className="flex items-center gap-2 text-xs font-bold text-brand"><span className="grid size-8 place-items-center rounded-xl bg-brand-soft"><BrainCircuit size={17} /></span>{unit.curriculum} · {unit.courseTitle} · {unit.chapterTitle}</div>
        <h2 className="mt-5 max-w-2xl text-balance text-[2rem] font-bold leading-[1.22] tracking-[-0.05em] text-ink sm:text-[2.65rem]">{studentName}님, <span className="text-brand">{unit.title}</span>에서 막힌 부분을 같이 풀어봐요.</h2>
        <p className="mt-4 max-w-[39rem] text-[.9rem] leading-7 text-ink-soft sm:text-[.98rem]">{unit.summary} 답만 알려 주는 대신, 지금 이해한 지점부터 설명하고 비슷한 문제를 혼자 풀 수 있게 도와드릴게요.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[.68rem] font-semibold">
          <span className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink-soft">{unit.publisherName} 기준</span>
          <span className={cn("rounded-lg px-2.5 py-1.5", unit.schoolAdopted ? "bg-[#edf6f0] text-[#3d7055]" : "bg-accent-soft text-[#98572e]")}>{unit.schoolAdopted ? "학교 채택 과정" : `학교 채택본 ${unit.schoolPublisherName ?? "별도 확인"}`}</span>
        </div>

        <div className="mt-7">
          <div className="mb-2.5 flex items-center justify-between"><p className="text-xs font-bold text-ink">오늘의 설명 난이도</p><p className="text-[.68rem] text-ink-soft">대화 중에도 바꿀 수 있어요</p></div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-white p-1.5 shadow-[0_8px_26px_rgba(42,54,91,.045)]">
            {levelConfig.map((item) => (
              <button key={item.level} onClick={() => onLevel(item.level)} className={cn("min-h-[3.75rem] cursor-pointer rounded-xl px-2 text-left transition-all duration-300 active:scale-[.98] sm:px-3", learningLevel === item.level ? "bg-brand text-white shadow-[0_8px_20px_rgba(56,88,201,.2)]" : "hover:bg-surface-muted")}>
                <span className="block text-xs font-bold">{item.label}</span><span className={cn("mt-1 block truncate text-[.63rem]", learningLevel === item.level ? "text-white/65" : "text-ink-soft")}>{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-2.5 sm:grid-cols-3">
          {unit.recommendedQuestions.map((question, index) => (
            <button key={question} onClick={() => onQuestion(question)} style={{ animationDelay: `${index * 70}ms` }} className="app-enter group min-h-[6.8rem] cursor-pointer rounded-2xl border border-line bg-white p-4 text-left transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#bdc5d8] hover:shadow-[0_15px_34px_rgba(42,54,91,.08)] active:scale-[.985]">
              <span className="mb-3 flex items-center justify-between"><CircleHelp size={17} className="text-brand" /><span className="text-[.62rem] font-semibold text-[#a0a7b5]">추천 질문 {index + 1}</span></span>
              <span className="text-[.83rem] font-semibold leading-5.5 text-ink">{question}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConceptPanel({ unit }: { unit: LearningUnit }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-bold"><BookOpenCheck size={18} className="text-brand" /> 단원 핵심 노트</div>
      <p className="mt-3 text-[.68rem] font-semibold leading-5 text-brand">{unit.courseTitle} · {unit.chapterTitle} · {unit.sectionTitle}</p>
      <p className="mt-4 text-sm leading-6 text-ink-soft">{unit.summary}</p>
      <div className="mt-6">
        <p className="text-[.67rem] font-bold tracking-[.08em] text-[#929bad] uppercase">꼭 알아야 할 개념</p>
        <ul className="mt-3 grid gap-2.5">
          {unit.keyPoints.map((point, index) => <li key={point} className="flex items-start gap-2.5 text-[.8rem] leading-5 text-ink"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-lg bg-brand-soft text-[.6rem] font-bold text-brand">{index + 1}</span>{point}</li>)}
        </ul>
      </div>
      {unit.prerequisites.length > 0 && (
        <div className="mt-6">
          <p className="text-[.67rem] font-bold tracking-[.08em] text-[#929bad] uppercase">먼저 확인할 선수 개념</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {unit.prerequisites.map((item) => <span key={item} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[.68rem] font-semibold text-ink-soft">{item}</span>)}
          </div>
        </div>
      )}
      {unit.formulas.length > 0 && <div className="mt-6 space-y-2.5">{unit.formulas.map((formula) => <div key={formula.name} className="rounded-2xl border border-line bg-white p-4 shadow-sm"><p className="text-xs font-bold text-brand">{formula.name}</p><div className="mt-2 overflow-x-auto text-[.78rem]"><Markdown>{`$$${formula.expression}$$`}</Markdown></div><p className="mt-2 text-[.72rem] leading-5 text-ink-soft">{formula.explanation}</p></div>)}</div>}
      {unit.examples[0] && <div className="mt-6 rounded-2xl border border-[#eadfd6] bg-accent-soft p-4"><p className="flex items-center gap-1.5 text-xs font-bold text-[#98572e]"><Lightbulb size={15} />{unit.examples[0].title}</p><p className="mt-2 text-[.76rem] leading-5 text-[#775b48]">{unit.examples[0].body}</p></div>}
      {unit.commonMistakes.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#efd8d9] bg-[#fff7f7] p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-danger"><TriangleAlert size={15} /> 자주 틀리는 지점</p>
          <ul className="mt-2.5 grid gap-2 text-[.72rem] leading-5 text-[#745052]">
            {unit.commonMistakes.map((mistake) => <li key={mistake} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-danger/65" />{mistake}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-6 border-t border-line pt-4">
        <div className="flex items-center justify-between text-xs text-ink-soft"><span>교육과정</span><span className="font-semibold text-ink">{unit.curriculum}</span></div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-ink-soft"><span>기준 교과서</span><span className="font-semibold text-ink">{unit.publisherName}</span></div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-ink-soft"><span>콘텐츠 상태</span><span className="inline-flex items-center gap-1.5 font-semibold text-brand"><span className="size-1.5 rounded-full bg-brand" /> 공식 목차 반영</span></div>
        {unit.sourceUrl && <a href={unit.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[.7rem] font-semibold text-ink-soft transition hover:border-brand/30 hover:text-brand"><ExternalLink size={13} /> 비상교육 목차 자료 보기</a>}
      </div>
    </div>
  );
}

function Sheet({ title, onClose, side = "bottom", children }: { title: string; onClose: () => void; side?: "bottom" | "right"; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 cursor-default bg-[#172033]/36 backdrop-blur-[2px]" onClick={onClose} aria-label={`${title} 닫기`} />
      <div className={cn("scrollbar-subtle absolute overflow-y-auto bg-white shadow-2xl", side === "right" ? "inset-y-0 right-0 w-[min(26rem,92vw)] px-5 py-5" : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[1.8rem] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 sm:left-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-[25rem] sm:rounded-none")}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label={`${title} 닫기`}><X size={20} /></Button></div>
        {children}
      </div>
    </div>
  );
}

function Thinking() {
  return <div className="flex min-h-20 flex-col justify-center gap-3" aria-label="AI 튜터가 답변을 준비하고 있습니다"><div className="flex items-center gap-1.5">{[0, 1, 2].map((item) => <span key={item} className="thinking-dot size-2 rounded-full bg-brand" style={{ animationDelay: `${item * 150}ms` }} />)}<span className="ml-2 text-xs font-semibold text-ink-soft">질문과 단원 내용을 연결하고 있어요</span></div><div className="skeleton-shimmer h-2.5 w-[72%] rounded-full" /><div className="skeleton-shimmer h-2.5 w-[48%] rounded-full" /></div>;
}

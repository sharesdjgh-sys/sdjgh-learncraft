"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  BookCopy,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Eye,
  Layers3,
  LibraryBig,
  Lightbulb,
  ListTree,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { StudentTopNavigation } from "@/components/layout/student-navigation";
import { subjects } from "@/data/curriculum";
import { cn } from "@/lib/utils";
import type { LearningLevel, LearningUnit, SubjectCode, TutorAction, TutorMessage } from "@/types";

const actionConfig: Array<{ action: TutorAction; label: string; shortLabel: string; description: string; icon: typeof Sparkles }> = [
  { action: "EASIER", label: "더 쉽게 설명", shortLabel: "더 쉽게", description: "비유와 작은 예제로 다시 설명해요", icon: Lightbulb },
  { action: "DEEPER", label: "원리까지 깊게", shortLabel: "더 깊게", description: "조건과 개념의 연결을 살펴봐요", icon: ListTree },
  { action: "REVEAL", label: "전체 풀이 보기", shortLabel: "풀이 보기", description: "중간 단계를 생략하지 않고 풀어요", icon: Eye },
  { action: "QUIZ", label: "확인 문제 풀기", shortLabel: "확인 문제", description: "방금 배운 내용을 바로 확인해요", icon: CircleHelp },
];

const followUpOrder: TutorAction[] = ["QUIZ", "EASIER", "DEEPER", "REVEAL"];

const levelConfig: Array<{ level: LearningLevel; label: string; description: string }> = [
  { level: "FOUNDATION", label: "기초", description: "용어부터 차근차근" },
  { level: "STANDARD", label: "표준", description: "개념과 대표 예제" },
  { level: "ADVANCED", label: "심화", description: "원리와 개념 연결" },
];

type SupportedGrade = 1 | 2;

function supportedGrade(grade: number): SupportedGrade {
  return grade === 2 ? 2 : 1;
}

type SavedLearningSession = {
  unitId: string;
  grade?: SupportedGrade;
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
    && (candidate.grade === undefined || candidate.grade === 1 || candidate.grade === 2)
    && isLearningLevel(candidate.learningLevel)
    && Array.isArray(candidate.messages);
}

export function LearningWorkspace({ units, initialGrade, studentName, schoolName }: { units: LearningUnit[]; initialGrade: number; studentName: string; schoolName: string }) {
  const normalizedInitialGrade = supportedGrade(initialGrade);
  const initialUnitId = units.find((unit) => unit.recommendedGrades.includes(normalizedInitialGrade) && unit.subjectCode === "MATH")?.id ?? units[0]?.id ?? "";
  const [grade, setGrade] = useState<SupportedGrade>(normalizedInitialGrade);
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
  const streamingAnswerRef = useRef(false);

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
        setGrade(savedSession.grade ?? supportedGrade(savedUnit.grade));
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
    if (streamingAnswerRef.current) {
      autoScrollRef.current = false;
      return;
    }
    autoScrollRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 140;
  }

  function scrollToMessageStart(messageId: string) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const container = messageScrollRef.current;
        const messageElement = document.getElementById(`tutor-message-${messageId}`);
        if (!container || !messageElement) return;
        const top = container.scrollTop
          + messageElement.getBoundingClientRect().top
          - container.getBoundingClientRect().top
          - 16;
        container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      });
    });
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

  function changeGrade(nextGrade: SupportedGrade) {
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

    streamingAnswerRef.current = true;
    autoScrollRef.current = false;
    setMessages((current) => [...current, userMessage, assistantMessage]);
    scrollToMessageStart(answerId);
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
      streamingAnswerRef.current = false;
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
    <div className="app-enter flex h-dvh min-h-[40rem] flex-col">
      <StudentTopNavigation actions={(
        <>
          <div className="flex items-center gap-2 rounded-full bg-surface-3 px-3 py-2" title="오늘 남은 AI 학습 횟수">
            <span className="hidden text-[.8rem] font-semibold text-ink-3 sm:inline">오늘 남은 질문</span>
            <span className="figure text-sm font-semibold text-ink">{remaining}<span className="text-[.78rem] text-ink-5">/20</span></span>
          </div>
          <button onClick={() => setConceptOpen(true)} className="flex min-h-10 items-center gap-2 rounded-full bg-brand-soft px-3 text-[.8rem] font-semibold text-brand-dark transition hover:bg-[var(--mark)] min-[1340px]:hidden" aria-label="단원 핵심 노트 보기">
            <Layers3 size={16} /><span className="hidden sm:inline">핵심 노트</span>
          </button>
          <button onClick={() => resetConversation()} disabled={loading || messages.length === 0} className="hidden min-h-10 items-center gap-2 rounded-full border border-line bg-white px-3 text-[.8rem] font-semibold text-ink-3 transition hover:border-[var(--line-2)] hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 sm:flex" aria-label="새 대화 시작">
            <Plus size={16} />새 대화
          </button>
        </>
      )} />
      <div className="relative grid min-h-0 flex-1 grid-cols-1 min-[1024px]:grid-cols-[286px_minmax(0,1fr)] min-[1340px]:grid-cols-[298px_minmax(0,1fr)_328px]">
      <aside className="scrollbar-subtle hidden overflow-y-auto border-r border-line bg-white/42 px-4 py-5 min-[1024px]:block">
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

      <section className="mx-0 flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white pb-[calc(4.45rem+env(safe-area-inset-bottom))] min-[1024px]:my-3 min-[1024px]:mr-1 min-[1024px]:rounded-[22px] min-[1024px]:pb-0 min-[1024px]:shadow-[var(--lift-3)]">
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface-2 px-4 py-2.5 min-[1024px]:hidden">
          <button onClick={() => setDrawerOpen(true)} className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 text-left shadow-[var(--lift-1)]" aria-label="학습 단원 선택 열기">
            <span className="figure shrink-0 text-[.78rem] text-brand">{selectedUnit.chapterOrder}.{selectedUnit.sectionOrder}</span>
            <span className="font-learning truncate text-[.88rem] font-semibold text-ink">{selectedUnit.title}</span>
            <ChevronDown size={14} className="ml-auto shrink-0 text-ink-5" />
          </button>
          <span className="hidden text-[.78rem] text-ink-4 sm:inline">{schoolName} · {grade}학년</span>
        </div>

        <div ref={messageScrollRef} onScroll={trackScrollPosition} className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto flex min-h-full w-full max-w-[45rem] flex-col px-4 py-6 sm:px-7 sm:py-9">
            {messages.length === 0 ? (
              <Welcome unit={selectedUnit} studentName={studentName} learningLevel={learningLevel} onLevel={setLearningLevel} onQuestion={(question) => void ask("QUESTION", question)} />
            ) : (
              <div className="flex-1 space-y-10 pb-5">
                {messages.map((message, index) => (
                  <article id={`tutor-message-${message.id}`} key={message.id} className={cn("flex scroll-mt-4", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "user" ? (
                      <div className="font-learning max-w-[88%] rounded-[22px_22px_8px_22px] bg-[linear-gradient(180deg,#8168d8,#6c50c5)] px-4 py-3 text-[1.01rem] leading-7 text-white shadow-[0_8px_20px_rgba(82,57,159,.18)] sm:max-w-[78%]">
                        {message.content}
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                          <span className="size-2.5 rounded-full bg-[#ff8fb8]" />
                          <span className="text-[.86rem] font-bold text-ink">LearnCraft 튜터</span>
                          <span className="text-[.82rem] text-ink-4">{levelConfig.find((item) => item.level === learningLevel)?.label} · {selectedUnit.publisherName} 기준</span>
                          {!message.completed && message.content && <span className="text-[.82rem] font-medium text-ink-4">답변 작성 중</span>}
                        </div>
                        <div>
                          {message.content ? <Markdown>{message.content}</Markdown> : <Thinking />}
                          {message.completed && (
                            <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                              <span className="text-[.8rem] text-ink-4">답변 완료 · 이 대화는 서버에 저장되지 않아요</span>
                              <button onClick={() => void bookmarkMessage(message)} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3.5 text-[.82rem] font-semibold text-ink-3 transition hover:border-[var(--line-2)] hover:text-ink" aria-label="답변을 오답 노트에 저장">
                                {savedIds.has(message.id) ? <BookmarkCheck size={16} className="text-brand" /> : <Bookmark size={16} />}
                                <span>{savedIds.has(message.id) ? "저장됨" : "오답 노트에 저장"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {message.completed && index === messages.length - 1 && (
                          <div className="mt-6">
                            <p className="mb-3 text-[.86rem] font-bold text-ink">이어서 학습하기</p>
                            <div className="flex flex-wrap gap-2">
                            {followUpOrder.map((action) => actionConfig.find((item) => item.action === action)!).map(({ action, label, icon: Icon }, actionIndex) => (
                              <button key={action} onClick={() => void ask(action)} disabled={loading || remaining <= 0} className={cn("flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[.88rem] font-semibold transition-all duration-300 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40", actionIndex === 0 ? "bg-[linear-gradient(180deg,#8168d8,#6c50c5)] text-white shadow-[var(--lift-brand)] hover:-translate-y-0.5" : "border border-line bg-white text-ink-2 hover:border-[var(--line-2)] hover:text-ink") }>
                                <Icon size={15} />{label}{actionIndex === 0 && <span className="text-[.78rem] text-white/65">권장</span>}
                              </button>
                            ))}
                            </div>
                          </div>
                        )}
                        {!message.completed && message.content && retryRequest && index === messages.length - 1 && (
                          <button onClick={() => void ask(retryRequest.action, retryRequest.preset)} disabled={loading} className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[.82rem] font-semibold text-ink transition hover:border-brand/35 hover:bg-brand-soft">
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

        <div className="shrink-0 bg-white px-3 pb-3 pt-2 sm:px-7 sm:pb-5">
          <div className="mx-auto max-w-[45rem]">
            {remaining <= 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#efd3d5] bg-[#fff4f4] p-4 text-center text-sm font-semibold text-danger"><AlertCircle size={18} /> 오늘의 AI 학습 횟수를 모두 사용했어요. 내일 다시 이용해 주세요.</div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="composer rounded-[20px] border-2 border-[rgba(126,101,181,.2)] bg-white p-1.5 shadow-[var(--lift-2)] transition">
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
                    className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 text-[1rem] leading-7 text-ink outline-none placeholder:text-ink-5"
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || loading} aria-label="질문 보내기" className="shrink-0 rounded-full"><Send size={18} /></Button>
                </div>
                <div className="flex items-center justify-between px-2.5 pb-1 pt-1 text-[.78rem] text-ink-5">
                  <span className="hidden sm:inline">Enter 전송 · Shift+Enter 줄바꿈</span><span className="figure ml-auto">{input.length} / 1200</span>
                </div>
              </form>
            )}
            <p className="mt-2 text-center text-[.78rem] text-ink-5">AI 답변은 교과서와 선생님께 다시 확인하세요.</p>
          </div>
        </div>
      </section>

      <aside className="scrollbar-subtle hidden overflow-y-auto border-l border-line bg-white/38 px-5 py-5 min-[1340px]:block"><ConceptPanel unit={selectedUnit} /></aside>

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

      {notice && <div className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-xl min-[1024px]:bottom-6"><Check size={16} />{notice}</div>}
      </div>
    </div>
  );
}

function CurriculumPicker({ grade, subject, units, selectedUnitId, onGrade, onSubject, onUnit }: {
  grade: SupportedGrade;
  subject: SubjectCode;
  units: LearningUnit[];
  selectedUnitId: string;
  onGrade: (grade: SupportedGrade) => void;
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
      <div className="flex items-center gap-2 px-1 text-[.86rem] font-bold text-ink"><LibraryBig size={17} className="text-brand" /> 교육과정</div>
      <p className="mt-1.5 px-1 text-[.78rem] leading-5 text-ink-4">학교 진도에 맞는 학습 주제를 고르세요.</p>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-[#ede7f8] p-1">
        {([1, 2] as const).map((item) => <button key={item} onClick={() => onGrade(item)} className={cn("min-h-9 cursor-pointer rounded-full text-[.82rem] font-semibold transition active:scale-[.97]", grade === item ? "bg-white text-ink shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>{item}학년</button>)}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {subjects.map((item) => <button key={item.code} onClick={() => onSubject(item.code)} className={cn("min-h-10 cursor-pointer rounded-full text-[.82rem] font-semibold transition active:scale-[.97]", subject === item.code ? "bg-[linear-gradient(180deg,#8168d8,#6c50c5)] text-white shadow-[0_4px_12px_rgba(107,80,197,.2)]" : "bg-white text-ink-3 hover:bg-surface-3 hover:text-ink")}>{item.title}</button>)}
      </div>

      {courseOptions.length > 0 ? (
        <div className="mt-6">
          <label className="block px-1 text-[.78rem] font-bold text-ink-4" htmlFor={`course-${grade}-${subject}`}>수강 과목</label>
          <div className="relative mt-2.5">
            <BookCopy size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-brand" />
            <select
              id={`course-${grade}-${subject}`}
              value={selectedCourseCode}
              onChange={(event) => {
                const firstUnit = units.find((unit) => unit.courseCode === event.target.value);
                if (firstUnit) onUnit(firstUnit.id);
              }}
              className="min-h-12 w-full cursor-pointer appearance-none rounded-[14px] border-0 bg-white py-2 pl-9 pr-9 text-[.92rem] font-bold text-ink shadow-[var(--lift-1)] outline-none"
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
            <div className={cn("mt-2.5 rounded-[14px] px-3 py-2.5", selectedCourse.schoolAdopted ? "bg-[var(--ok-page)]" : "bg-[var(--warn-page)]") }>
              <p className={cn("flex items-center gap-1.5 text-[.78rem] font-bold", selectedCourse.schoolAdopted ? "text-ok" : "text-warn") }>
                {selectedCourse.schoolAdopted ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />}
                {selectedCourse.schoolAdopted ? "서대전여고 채택 교과서" : "학교 채택본과 목차 기준이 다른 참고 과정"}
              </p>
              <p className="mt-1 text-[.76rem] leading-5 text-ink-3">
                {selectedCourse.publisherName} · {selectedCourse.curriculum}
                {!selectedCourse.schoolAdopted && selectedCourse.schoolPublisherName ? ` · 학교 채택본 ${selectedCourse.schoolPublisherName}` : ""}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-5">
            {chapterGroups.map((chapter) => (
              <section key={`${selectedCourseCode}-${chapter.order}`}>
                <div className="flex items-center gap-2 px-1">
                  <span className="figure shrink-0 text-[.82rem] font-semibold text-brand">{chapter.order}</span>
                  <h3 className="font-learning text-[.88rem] font-bold text-ink">{chapter.title}</h3>
                </div>
                <div className="mt-2 grid gap-3 border-l border-line pl-2.5">
                  {chapter.sections.map((section) => (
                    <div key={`${chapter.order}-${section.order}`}>
                      {(section.units.length > 1 || section.title !== section.units[0]?.title) && (
                        <p className="mb-1.5 px-1 text-[.76rem] font-semibold text-ink-5">{section.order}. {section.title}</p>
                      )}
                      <div className="grid gap-1">
                        {section.units.map((unit) => (
                          <button
                            key={unit.id}
                            onClick={() => onUnit(unit.id)}
                            className={cn(
                              "group flex min-h-[2.9rem] cursor-pointer items-start gap-2.5 rounded-[14px] px-2.5 py-2 text-left transition-all duration-200 active:scale-[.985]",
                              selectedUnitId === unit.id
                                ? "bg-brand-soft text-[#4a3e7a]"
                                : "text-ink-3 hover:bg-white hover:text-ink",
                            )}
                          >
                            <span className={cn("figure shrink-0 pt-0.5 text-[.76rem]", selectedUnitId === unit.id ? "text-brand" : "text-ink-5")}>{chapter.order}.{section.order}</span>
                            <span className={cn("min-w-0 text-[.83rem] leading-5", selectedUnitId === unit.id ? "font-learning font-bold" : "font-medium")}>{unit.title}</span>
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
          <p className="text-[.82rem] font-bold text-ink">이 학년에 공개된 과목이 없어요.</p>
          <p className="mt-1 text-[.8rem] leading-5 text-ink-3">다른 학년이나 과목을 선택해 주세요.</p>
        </div>
      )}
    </div>
  );
}

function Welcome({ unit, studentName, learningLevel, onLevel, onQuestion }: { unit: LearningUnit; studentName: string; learningLevel: LearningLevel; onLevel: (level: LearningLevel) => void; onQuestion: (question: string) => void }) {
  return (
    <div className="flex flex-1 flex-col py-2 sm:py-4">
      <div className="max-w-[44rem]">
        <p className="flex items-baseline gap-2 text-[.84rem] font-semibold leading-6 text-brand"><span className="figure text-ink-5">{unit.chapterOrder}.{unit.sectionOrder}</span>{unit.courseTitle} · {unit.chapterTitle} · {unit.sectionTitle}</p>
        <h2 className="font-learning mt-3 max-w-2xl text-balance text-[1.85rem] font-bold leading-[1.4] tracking-[-0.045em] text-ink sm:text-[2.25rem]"><span className="mark">{unit.title}</span>,<br className="hidden sm:block" /> 핵심부터 연결해 봐요.</h2>
        <p className="font-learning mt-4 max-w-[40rem] text-[1rem] leading-8 text-ink-2 sm:text-[1.08rem] sm:leading-9">{studentName}님이 지금 이해한 지점부터 시작할게요. {unit.summary}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-[.8rem] font-semibold">
          <span className="rounded-full bg-surface-3 px-3 py-1.5 text-ink-2">{unit.publisherName} · {unit.curriculum}</span>
          <span className={cn("rounded-full px-3 py-1.5", unit.schoolAdopted ? "bg-[var(--ok-page)] text-ok" : "bg-[var(--warn-page)] text-warn")}>{unit.schoolAdopted ? "학교 채택 과정" : `학교 채택본 ${unit.schoolPublisherName ?? "별도 확인"}`}</span>
          {unit.prerequisites.slice(0, 2).map((item) => <span key={item} className="rounded-full bg-surface-3 px-3 py-1.5 text-ink-3">선수 · {item}</span>)}
        </div>

        <div className="mt-8">
          <div className="mb-2.5 flex items-center justify-between"><p className="text-[.86rem] font-bold text-ink">설명 깊이</p><p className="text-[.8rem] text-ink-4">대화 중에도 바꿀 수 있어요</p></div>
          <div className="grid grid-cols-3 gap-2">
            {levelConfig.map((item) => (
              <button key={item.level} onClick={() => onLevel(item.level)} className={cn("min-h-[4rem] cursor-pointer rounded-[14px] px-3 text-left transition-all duration-300 active:scale-[.98]", learningLevel === item.level ? "bg-ink text-white shadow-[var(--lift-2)]" : "bg-surface-2 text-ink-2 hover:bg-surface-3")}>
                <span className="font-learning block text-[.95rem] font-bold">{item.label}</span><span className={cn("mt-1 block truncate text-[.78rem]", learningLevel === item.level ? "text-white/60" : "text-ink-4")}>{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="mb-2.5 text-[.86rem] font-bold text-ink">이렇게 물어볼 수 있어요</p>
          <div className="grid gap-1.5">
          {unit.recommendedQuestions.map((question, index) => (
            <button key={question} onClick={() => onQuestion(question)} style={{ animationDelay: `${index * 70}ms` }} className="app-enter group grid min-h-[4.25rem] cursor-pointer grid-cols-[2rem_1fr_1.25rem] items-center gap-3 rounded-[18px] bg-surface-2 px-4 py-3 text-left transition-all duration-300 ease-out hover:bg-surface-3 active:scale-[.985]">
              <span className="figure text-[1.02rem] text-brand">0{index + 1}</span>
              <span className="font-learning text-[.96rem] font-semibold leading-6 text-ink">{question}</span>
              <span className="text-lg text-ink-5 transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConceptPanel({ unit }: { unit: LearningUnit }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[.88rem] font-bold"><BookOpenCheck size={17} className="text-brand" /> 단원 핵심 노트</div>
      <p className="mt-3 text-[.8rem] font-semibold leading-5 text-brand">{unit.courseTitle} · {unit.chapterTitle} · {unit.sectionTitle}</p>
      <p className="font-learning mt-4 text-[.96rem] leading-7 text-ink-2">{unit.summary}</p>
      <div className="mt-6">
        <p className="text-[.8rem] font-bold text-ink-4">꼭 알아야 할 개념</p>
        <ul className="mt-3 grid gap-2.5">
          {unit.keyPoints.map((point, index) => <li key={point} className="grid grid-cols-[1.25rem_1fr] gap-2.5 rounded-[12px] bg-surface-2 px-2.5 py-2 text-[.9rem] leading-6 text-ink-2"><span className="figure text-[.78rem] text-ink-5">{index + 1}</span>{point}</li>)}
        </ul>
      </div>
      {unit.prerequisites.length > 0 && (
        <div className="mt-6">
          <p className="text-[.8rem] font-bold text-ink-4">먼저 확인할 선수 개념</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {unit.prerequisites.map((item) => <span key={item} className="rounded-[12px] bg-surface-3 px-2.5 py-1.5 text-[.8rem] font-semibold text-ink-3">{item}</span>)}
          </div>
        </div>
      )}
      {unit.formulas.length > 0 && <div className="mt-6 space-y-2.5">{unit.formulas.map((formula) => <div key={formula.name} className="rounded-[14px] bg-surface-2 p-4"><p className="text-[.8rem] font-bold text-brand">{formula.name}</p><div className="mt-2 overflow-x-auto text-[.82rem]"><Markdown>{`$$${formula.expression}$$`}</Markdown></div><p className="mt-2 text-[.82rem] leading-5 text-ink-3">{formula.explanation}</p></div>)}</div>}
      {unit.examples[0] && <div className="mt-6 rounded-[14px] bg-[var(--ok-page)] p-4"><p className="flex items-center gap-1.5 text-[.82rem] font-bold text-ok"><Lightbulb size={15} />{unit.examples[0].title}</p><p className="mt-2 text-[.84rem] leading-6 text-[#376f63]">{unit.examples[0].body}</p></div>}
      {unit.commonMistakes.length > 0 && (
        <div className="mt-6 rounded-[14px] bg-[var(--warn-page)] p-4">
          <p className="flex items-center gap-1.5 text-[.82rem] font-bold text-warn"><TriangleAlert size={15} /> 자주 틀리는 지점</p>
          <ul className="mt-2.5 grid gap-2 text-[.82rem] leading-5 text-warn">
            {unit.commonMistakes.map((mistake) => <li key={mistake} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-danger/65" />{mistake}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-6 border-t border-line pt-4">
        <div className="flex items-center justify-between text-[.8rem] text-ink-4"><span>교육과정</span><span className="font-semibold text-ink">{unit.curriculum}</span></div>
        <div className="mt-2.5 flex items-center justify-between text-[.8rem] text-ink-4"><span>기준 교과서</span><span className="font-semibold text-ink">{unit.publisherName}</span></div>
        <div className="mt-2.5 flex items-center justify-between text-[.8rem] text-ink-4"><span>콘텐츠 상태</span><span className="inline-flex items-center gap-1.5 font-semibold text-brand"><span className="size-1.5 rounded-full bg-brand" /> 공식 목차 반영</span></div>
        {unit.sourceUrl && <a href={unit.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-white text-[.8rem] font-semibold text-ink-3 transition hover:border-[var(--line-2)] hover:text-brand"><ExternalLink size={13} /> 비상교육 목차 자료 보기</a>}
      </div>
    </div>
  );
}

function Sheet({ title, onClose, side = "bottom", children }: { title: string; onClose: () => void; side?: "bottom" | "right"; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 cursor-default bg-[#2c2747]/42 backdrop-blur-[2px]" onClick={onClose} aria-label={`${title} 닫기`} />
      <div className={cn("scrollbar-subtle absolute overflow-y-auto bg-[#fbf9fe] shadow-[0_0_60px_rgba(83,61,130,.28)]", side === "right" ? "inset-y-0 right-0 w-[min(26rem,92vw)] px-5 py-5" : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[1.8rem] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:left-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-[25rem] sm:rounded-none")}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label={`${title} 닫기`}><X size={20} /></Button></div>
        {children}
      </div>
    </div>
  );
}

function Thinking() {
  return <div className="flex min-h-20 flex-col justify-center gap-3" aria-label="AI 튜터가 답변을 준비하고 있습니다"><div className="flex items-center gap-1.5">{[0, 1, 2].map((item) => <span key={item} className="thinking-dot size-2 rounded-full bg-brand" style={{ animationDelay: `${item * 150}ms` }} />)}<span className="ml-2 text-[.82rem] font-semibold text-ink-4">질문과 단원 내용을 연결하고 있어요</span></div><div className="skeleton-shimmer h-2.5 w-[72%] rounded-full" /><div className="skeleton-shimmer h-2.5 w-[48%] rounded-full" /></div>;
}

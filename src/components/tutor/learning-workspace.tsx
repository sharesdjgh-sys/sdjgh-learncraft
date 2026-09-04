"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  BookCopy,
  BookOpen,
  BookOpenCheck,
  Camera,
  CaseSensitive,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
  Globe2,
  ImagePlus,
  Languages,
  LibraryBig,
  Lightbulb,
  ListTree,
  Plus,
  Radical,
  RotateCcw,
  Send,
  Sparkles,
  Palette,
  Cpu,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineMarkdown, Markdown } from "@/components/ui/markdown";
import { StudentTopNavigation } from "@/components/layout/student-navigation";
import { LEARNING_ESSENTIALS_PROMPT } from "@/features/tutor/follow-up";
import { displayMathMarkdown } from "@/lib/math-notation";
import { cn } from "@/lib/utils";
import type { LearningLevel, LearningUnit, SubjectCode, TutorAction, TutorMessage } from "@/types";

const actionConfig: Array<{ action: TutorAction; label: string; shortLabel: string; description: string; icon: typeof Sparkles; tone: string }> = [
  { action: "EASIER", label: "더 쉽게 설명", shortLabel: "더 쉽게", description: "비유와 작은 예제로 다시 설명해요", icon: Lightbulb, tone: "border-[#eadfca] bg-[#fff9ed] text-[#735f35] shadow-[0_4px_12px_rgba(113,88,42,.06)] hover:border-[#decda9] hover:bg-[#fff5df]" },
  { action: "DEEPER", label: "원리까지 깊게", shortLabel: "더 깊게", description: "조건과 개념의 연결을 살펴봐요", icon: ListTree, tone: "border-[#ddd3f3] bg-[#f7f3ff] text-[#624b91] shadow-[0_4px_12px_rgba(98,75,145,.06)] hover:border-[#cfc1ec] hover:bg-[#f1ebff]" },
  { action: "REVEAL", label: "전체 풀이 보기", shortLabel: "풀이 보기", description: "중간 단계를 생략하지 않고 풀어요", icon: Eye, tone: "border-[#cfe6df] bg-[#f1faf7] text-[#356f65] shadow-[0_4px_12px_rgba(53,111,101,.06)] hover:border-[#bddbd2] hover:bg-[#e8f7f2]" },
  { action: "QUIZ", label: "확인 문제 풀기", shortLabel: "확인 문제", description: "방금 배운 내용을 바로 확인해요", icon: CircleHelp, tone: "border-[#cfc1ef] bg-[linear-gradient(135deg,#f7f3ff_0%,#eee8ff_100%)] text-[#594083] shadow-[0_7px_18px_rgba(91,65,143,.1)] hover:border-[#bfaee6] hover:bg-[linear-gradient(135deg,#f2ecff_0%,#e8deff_100%)]" },
];

const followUpOrder: TutorAction[] = ["QUIZ", "EASIER", "DEEPER", "REVEAL"];

const followUpRequestText: Record<Exclude<TutorAction, "QUESTION">, string> = {
  EASIER: "방금 설명한 내용 중 이해하기 어려운 개념과 용어를 쉬운 말로 바꾸고, 간단한 비유와 예시를 활용해 처음 배우는 학생도 이해할 수 있도록 다시 설명해 주세요.",
  DEEPER: "방금 설명한 내용의 핵심 원리와 개념이 성립하는 이유, 조건이 달라질 때의 변화, 다른 개념과의 연결을 단계적으로 더 깊이 설명해 주세요.",
  REVEAL: "방금 출제한 확인 문제의 조건을 정리하고, 적용할 개념부터 단계별 풀이, 최종 답, 검산 또는 확인 방법까지 빠짐없이 보여 주세요.",
  QUIZ: "방금 배운 내용을 제대로 이해했는지 확인할 수 있도록 현재 단원과 학습 수준에 맞는 문제를 한 개 내 주세요. 정답과 해설은 아직 보여 주지 말고, 필요한 경우 힌트만 제공해 주세요.",
};

type SubjectCatalogItem = {
  id: SubjectCode;
  title: string;
  icon: typeof BookOpen;
  code: SubjectCode;
};

const subjectCatalog: SubjectCatalogItem[] = [
  { id: "KOREAN", code: "KOREAN", title: "국어", icon: BookOpen },
  { id: "ENGLISH", code: "ENGLISH", title: "영어", icon: CaseSensitive },
  { id: "MATH", code: "MATH", title: "수학", icon: Radical },
  { id: "SOCIAL", code: "SOCIAL", title: "사회", icon: Globe2 },
  { id: "SCIENCE", code: "SCIENCE", title: "과학", icon: FlaskConical },
  { id: "ARTS", code: "ARTS", title: "예체능", icon: Palette },
  { id: "INFORMATICS", code: "INFORMATICS", title: "정보", icon: Cpu },
  { id: "TECHNOLOGY_HOME", code: "TECHNOLOGY_HOME", title: "기술·가정", icon: Cpu },
  { id: "SECOND_LANGUAGE", code: "SECOND_LANGUAGE", title: "제2외국어", icon: Languages },
  { id: "CAREER", code: "CAREER", title: "진로", icon: BookOpenCheck },
];

const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const maxImageCount = 3;
const maxSourceImageBytes = 15 * 1024 * 1024;
const maxPreparedImageBytes = 4 * 1024 * 1024;
const maxTotalImageBytes = 8 * 1024 * 1024;
const maxImageDimension = 1800;

type SupportedImageType = (typeof supportedImageTypes)[number];
type ImageAttachment = {
  id: string;
  name: string;
  mediaType: SupportedImageType;
  dataUrl: string;
  data: string;
  bytes: number;
};

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("이미지를 읽지 못했어요."));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

function loadBrowserImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이 이미지 형식을 표시할 수 없어요."));
    image.src = dataUrl;
  });
}

async function prepareImageAttachment(file: File): Promise<ImageAttachment> {
  if (!supportedImageTypes.includes(file.type as SupportedImageType)) {
    throw new Error("JPG, PNG, WEBP 이미지만 추가할 수 있어요.");
  }
  if (file.size > maxSourceImageBytes) {
    throw new Error("원본 이미지 한 장은 15MB 이하여야 해요.");
  }

  const source = await readImageFile(file);
  const image = await loadBrowserImage(source);
  const scale = Math.min(1, maxImageDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리하지 못했어요.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let mediaType: SupportedImageType = file.type === "image/png" ? "image/png" : "image/jpeg";
  let dataUrl = canvas.toDataURL(mediaType, mediaType === "image/png" ? undefined : 0.86);
  let data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  let bytes = Math.ceil(data.length * 0.75);
  if (bytes > maxPreparedImageBytes && mediaType === "image/png") {
    mediaType = "image/jpeg";
    dataUrl = canvas.toDataURL(mediaType, 0.82);
    data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    bytes = Math.ceil(data.length * 0.75);
  }
  if (bytes > maxPreparedImageBytes) {
    throw new Error("이미지 한 장은 처리 후 4MB 이하여야 해요.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 145) || "학습 이미지";
  return {
    id: crypto.randomUUID(),
    name: `${baseName}.${mediaType === "image/png" ? "png" : "jpg"}`,
    mediaType,
    dataUrl,
    data,
    bytes,
  };
}

const levelConfig: Array<{ level: LearningLevel; label: string; description: string }> = [
  { level: "SUMMARY", label: "빠른 요약", description: "핵심 답과 공식만 간결하게" },
  { level: "FOUNDATION", label: "개념부터", description: "용어와 선수 개념부터 차근차근" },
  { level: "STANDARD", label: "문제 적용", description: "대표 유형과 풀이 전략 중심" },
  { level: "ADVANCED", label: "원리 탐구", description: "이유·조건·개념 연결까지" },
];

function makeBookmarkTitle(messages: TutorMessage[], answer: TutorMessage) {
  const answerIndex = messages.findIndex((message) => message.id === answer.id);
  const earlierMessages = answerIndex >= 0 ? messages.slice(0, answerIndex) : messages;
  const source = [...earlierMessages].reverse().find((message) => message.role === "user" && message.action === "QUESTION")
    ?? [...earlierMessages].reverse().find((message) => message.role === "user");
  const imageCount = source?.imageNames?.length ?? 0;
  const normalized = source?.content.replace(/\s+/g, " ").trim() ?? "";
  const isImageOnly = !normalized || normalized === "첨부 이미지로 질문";
  const imageLabel = imageCount > 0 ? `이미지 ${imageCount}장` : "첨부 이미지";
  const suffix = imageCount > 0 && !isImageOnly ? ` · ${imageLabel}` : "";
  const availableLength = Math.max(24, 88 - suffix.length);
  const prompt = isImageOnly
    ? `${imageLabel}으로 질문한 내용`
    : normalized.length > availableLength
      ? `${normalized.slice(0, availableLength - 1)}…`
      : normalized;

  return `${prompt}${suffix}`.slice(0, 100);
}

function recommendedQuestionsFor(unit: LearningUnit, learningLevel: LearningLevel) {
  const firstKeyPoint = unit.keyPoints[0] ?? unit.title;
  const secondKeyPoint = unit.keyPoints[1];
  const prerequisite = unit.prerequisites[0];

  if (learningLevel === "SUMMARY") {
    return [
      `${unit.title}에서 꼭 알아야 할 내용만 짧게 정리해 주세요.`,
      `핵심 개념과 판단 기준을 한눈에 볼 수 있게 알려 주세요.`,
      `시험 전에 빠르게 확인할 내용을 세 가지로 정리해 주세요.`,
    ];
  }
  if (learningLevel === "FOUNDATION") {
    return [
      `${unit.title}을 처음 배우는 것처럼 쉽게 설명해 주세요.`,
      prerequisite ? `${prerequisite}에서 어떻게 이어지는지 알려 주세요.` : `${firstKeyPoint}의 뜻부터 차근차근 알려 주세요.`,
      `${firstKeyPoint}을 가장 쉬운 예시로 보여 주세요.`,
    ];
  }
  if (learningLevel === "ADVANCED") {
    return [
      `${unit.title}의 원리가 왜 성립하는지 설명해 주세요.`,
      `조건이 달라지면 결과가 어떻게 바뀌는지 알려 주세요.`,
      secondKeyPoint ? `${firstKeyPoint}과 ${secondKeyPoint}이 어떻게 연결되는지 깊게 설명해 주세요.` : `${firstKeyPoint}과 다른 개념의 연결을 설명해 주세요.`,
    ];
  }
  return unit.recommendedQuestions;
}

type SupportedGrade = 1 | 2 | 3;

const supportedGrades = [1, 2, 3] as const satisfies readonly SupportedGrade[];

function isSupportedGrade(grade: unknown): grade is SupportedGrade {
  return grade === 1 || grade === 2 || grade === 3;
}

function supportedGrade(grade: number): SupportedGrade {
  return isSupportedGrade(grade) ? grade : 1;
}

function availableGradesFor(units: LearningUnit[]) {
  return supportedGrades.filter((grade) => units.some((unit) => unit.grade === grade));
}

function compareCurriculumOrder(left: LearningUnit, right: LearningUnit) {
  return left.courseOrder - right.courseOrder
    || left.chapterOrder - right.chapterOrder
    || left.sectionOrder - right.sectionOrder
    || left.topicOrder - right.topicOrder
    || left.title.localeCompare(right.title, "ko");
}

function firstCurriculumUnit(
  units: LearningUnit[],
  matches: (unit: LearningUnit) => boolean,
) {
  return units.filter(matches).sort(compareCurriculumOrder)[0];
}

type SavedLearningSession = {
  unitId: string;
  grade?: SupportedGrade;
  learningLevel: LearningLevel;
  messages: TutorMessage[];
};

type CachedUnitSession = Pick<SavedLearningSession, "learningLevel" | "messages">;
type TutorRequestSource = "DIRECT" | "FOLLOW_UP";

type SavedLearningCache = {
  version: 2;
  activeUnitId: string;
  grade?: SupportedGrade;
  courseOverviewOpen?: boolean;
  sessions: Record<string, CachedUnitSession>;
};

const learningCacheKey = "learncraft_chat";
const maxCachedUnitSessions = 8;
const maxCachedMessagesPerUnit = 16;

function isLearningLevel(value: unknown): value is LearningLevel {
  return value === "SUMMARY" || value === "FOUNDATION" || value === "STANDARD" || value === "ADVANCED";
}

function isSavedSession(value: unknown): value is SavedLearningSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedLearningSession>;
  return typeof candidate.unitId === "string"
    && (candidate.grade === undefined || isSupportedGrade(candidate.grade))
    && isLearningLevel(candidate.learningLevel)
    && Array.isArray(candidate.messages);
}

function isCachedUnitSession(value: unknown): value is CachedUnitSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CachedUnitSession>;
  return isLearningLevel(candidate.learningLevel) && Array.isArray(candidate.messages);
}

function isSavedLearningCache(value: unknown): value is SavedLearningCache {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedLearningCache>;
  return candidate.version === 2
    && typeof candidate.activeUnitId === "string"
    && (candidate.grade === undefined || isSupportedGrade(candidate.grade))
    && (candidate.courseOverviewOpen === undefined || typeof candidate.courseOverviewOpen === "boolean")
    && Boolean(candidate.sessions)
    && typeof candidate.sessions === "object"
    && Object.values(candidate.sessions).every(isCachedUnitSession);
}

function completedSessionMessages(messages: TutorMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.completed)
    .slice(-maxCachedMessagesPerUnit);
}

function cacheUnitSession(cache: Map<string, CachedUnitSession>, unitId: string, session: CachedUnitSession) {
  cache.delete(unitId);
  cache.set(unitId, session);
  while (cache.size > maxCachedUnitSessions) {
    const oldestUnitId = cache.keys().next().value;
    if (typeof oldestUnitId !== "string") break;
    cache.delete(oldestUnitId);
  }
}

type LearningWorkspaceProps = {
  units: LearningUnit[];
  initialGrade: number;
  studentName: string;
  schoolName: string;
};

export function LearningWorkspace(props: LearningWorkspaceProps) {
  if (props.units.length === 0) {
    return <EmptyLearningWorkspace studentName={props.studentName} schoolName={props.schoolName} />;
  }
  return <LearningWorkspaceContent {...props} />;
}

function EmptyLearningWorkspace({ studentName, schoolName }: Pick<LearningWorkspaceProps, "studentName" | "schoolName">) {
  return (
    <div className="app-enter flex h-dvh min-h-0 flex-col overflow-hidden">
      <StudentTopNavigation user={{ name: studentName, schoolName }} />
      <main className="grid min-h-0 flex-1 place-items-center bg-surface px-5">
        <div className="max-w-md rounded-[18px] border border-line bg-surface p-7 text-center shadow-[var(--lift-2)]">
          <span className="mx-auto grid size-12 place-items-center rounded-[14px] bg-brand-soft text-brand"><AlertCircle size={23} /></span>
          <h1 className="mt-4 text-lg font-extrabold text-ink">학습 과정을 준비하고 있어요</h1>
          <p className="mt-2 text-[.84rem] leading-6 text-ink-4">학교 교육과정이 공개되면 여기에서 바로 학습을 시작할 수 있어요. 잠시 후 다시 확인해 주세요.</p>
        </div>
      </main>
    </div>
  );
}

function LearningWorkspaceContent({ units, initialGrade, studentName, schoolName }: LearningWorkspaceProps) {
  const availableGrades = availableGradesFor(units);
  const requestedInitialGrade = supportedGrade(initialGrade);
  const normalizedInitialGrade = availableGrades.includes(requestedInitialGrade) ? requestedInitialGrade : availableGrades[0] ?? requestedInitialGrade;
  const initialUnit = firstCurriculumUnit(units, (unit) => unit.grade === normalizedInitialGrade && unit.subjectCode === "MATH")
    ?? firstCurriculumUnit(units, (unit) => unit.grade === normalizedInitialGrade)
    ?? [...units].sort(compareCurriculumOrder)[0];
  const initialUnitId = initialUnit?.id ?? "";
  const [grade, setGrade] = useState<SupportedGrade>(normalizedInitialGrade);
  const [subject, setSubject] = useState<SubjectCode>(initialUnit?.subjectCode ?? "MATH");
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnitId);
  const [homeOpen, setHomeOpen] = useState(true);
  const [courseOverviewOpen, setCourseOverviewOpen] = useState(false);
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("STANDARD");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [preparingImages, setPreparingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(20);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [retryRequest, setRetryRequest] = useState<{ action: TutorAction; preset?: string; source: TutorRequestSource } | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const conceptTriggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imagePreparationRef = useRef(false);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const streamingAnswerRef = useRef(false);
  const unitSessionsRef = useRef<Map<string, CachedUnitSession>>(new Map());

  const filteredUnits = useMemo(
    () => units
      .filter((unit) => unit.grade === grade && unit.subjectCode === subject)
      .sort(compareCurriculumOrder),
    [units, grade, subject],
  );
  const selectedUnit = (units.find((unit) => unit.id === selectedUnitId) ?? filteredUnits[0] ?? units[0])!;
  const selectedCourseUnits = useMemo(
    () => filteredUnits.filter((unit) => unit.courseCode === selectedUnit.courseCode),
    [filteredUnits, selectedUnit.courseCode],
  );

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        if (typeof data.limit === "number") setDailyLimit(data.limit);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let savedSession: SavedLearningSession | null = null;
    let savedCache: SavedLearningCache | null = null;
    let savedUnit: LearningUnit | undefined;
    try {
      const raw = sessionStorage.getItem(learningCacheKey);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (isSavedLearningCache(saved)) {
          savedCache = saved;
          savedUnit = units.find((unit) => unit.id === saved.activeUnitId);
        } else if (isSavedSession(saved)) {
          savedUnit = units.find((unit) => unit.id === saved.unitId);
          if (savedUnit) savedSession = saved;
        }
      }
    } catch {
      sessionStorage.removeItem(learningCacheKey);
    }

    const restoreTimer = window.setTimeout(() => {
      if (savedCache) {
        for (const [unitId, session] of Object.entries(savedCache.sessions)) {
          if (!units.some((unit) => unit.id === unitId)) continue;
          cacheUnitSession(unitSessionsRef.current, unitId, {
            learningLevel: session.learningLevel,
            messages: completedSessionMessages(session.messages.filter((message) => Boolean(message?.id && message?.content))),
          });
        }
      } else if (savedSession && savedUnit) {
        cacheUnitSession(unitSessionsRef.current, savedUnit.id, {
          learningLevel: savedSession.learningLevel,
          messages: completedSessionMessages(savedSession.messages.filter((message) => Boolean(message?.id && message?.content))),
        });
      }

      setSessionReady(true);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [units]);

  useEffect(() => {
    if (!sessionReady || homeOpen || !selectedUnitId) return;
    if (!homeOpen && !courseOverviewOpen) {
      cacheUnitSession(unitSessionsRef.current, selectedUnitId, {
        learningLevel,
        messages: completedSessionMessages(messages),
      });
    }
    sessionStorage.setItem(learningCacheKey, JSON.stringify({
      version: 2,
      activeUnitId: selectedUnitId,
      grade,
      courseOverviewOpen,
      sessions: Object.fromEntries(unitSessionsRef.current),
    } satisfies SavedLearningCache));
  }, [courseOverviewOpen, grade, homeOpen, learningLevel, messages, selectedUnitId, sessionReady]);

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
    setConversationOpen(false);
    setAttachments([]);
    setAttachmentError("");
    setRetryRequest(null);
    if (showNotice) {
      setNotice("새 대화를 시작할 준비가 됐어요.");
      window.setTimeout(() => setNotice(""), 2200);
    }
  }

  function resumeConversation() {
    if (messages.length === 0) return;
    autoScrollRef.current = true;
    setConversationOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    });
  }

  function selectUnit(unitId: string) {
    autoScrollRef.current = true;
    setHomeOpen(false);
    setCourseOverviewOpen(false);
    window.requestAnimationFrame(() => {
      messageScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (unitId === selectedUnitId) {
      const currentSession = unitSessionsRef.current.get(unitId);
      setLearningLevel(currentSession?.learningLevel ?? learningLevel);
      setMessages(currentSession?.messages ?? messages);
      setConversationOpen(false);
      setDrawerOpen(false);
      return;
    }
    if (!homeOpen && !courseOverviewOpen) {
      cacheUnitSession(unitSessionsRef.current, selectedUnitId, {
        learningLevel,
        messages: completedSessionMessages(messages),
      });
    }
    const nextSession = unitSessionsRef.current.get(unitId);
    setSelectedUnitId(unitId);
    setLearningLevel(nextSession?.learningLevel ?? "STANDARD");
    setMessages(nextSession?.messages ?? []);
    setConversationOpen(false);
    setInput("");
    setAttachments([]);
    setAttachmentError("");
    setRetryRequest(null);
    setDrawerOpen(false);
  }

  function openCourseOverview(unitId: string) {
    if (!homeOpen && !courseOverviewOpen) {
      cacheUnitSession(unitSessionsRef.current, selectedUnitId, {
        learningLevel,
        messages: completedSessionMessages(messages),
      });
    }
    setSelectedUnitId(unitId);
    setHomeOpen(false);
    setCourseOverviewOpen(true);
    setLearningLevel("STANDARD");
    setMessages([]);
    setConversationOpen(false);
    setInput("");
    setAttachments([]);
    setAttachmentError("");
    setRetryRequest(null);
    setDrawerOpen(false);
    autoScrollRef.current = true;
    window.requestAnimationFrame(() => {
      messageScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function changeGrade(nextGrade: SupportedGrade) {
    setGrade(nextGrade);
    const nextUnit = firstCurriculumUnit(units, (unit) => unit.grade === nextGrade && unit.subjectCode === subject)
      ?? firstCurriculumUnit(units, (unit) => unit.grade === nextGrade);
    if (nextUnit) {
      setSubject(nextUnit.subjectCode);
      setSelectedUnitId(nextUnit.id);
      setHomeOpen(true);
      setCourseOverviewOpen(false);
      setDrawerOpen(false);
    }
  }

  function changeSubject(nextSubject: SubjectCode) {
    setSubject(nextSubject);
    const nextUnit = firstCurriculumUnit(
      units,
      (unit) => unit.grade === grade && unit.subjectCode === nextSubject,
    );
    if (nextUnit) {
      setSelectedUnitId(nextUnit.id);
      setHomeOpen(true);
      setCourseOverviewOpen(false);
      setDrawerOpen(false);
    }
  }

  const addImageFiles = useCallback(async (fileList: FileList | File[] | null) => {
    if (!fileList?.length || loading || imagePreparationRef.current) return;
    const availableSlots = maxImageCount - attachments.length;
    if (availableSlots <= 0) {
      setAttachmentError(`이미지는 최대 ${maxImageCount}장까지 추가할 수 있어요.`);
      return;
    }

    const selectedFiles = Array.from(fileList).slice(0, availableSlots);
    setAttachmentError("");
    imagePreparationRef.current = true;
    setPreparingImages(true);
    try {
      const prepared = await Promise.all(selectedFiles.map(prepareImageAttachment));
      const totalBytes = [...attachments, ...prepared].reduce((total, image) => total + image.bytes, 0);
      if (totalBytes > maxTotalImageBytes) {
        throw new Error("첨부 이미지 전체 용량은 8MB 이하여야 해요.");
      }
      setAttachments((current) => [...current, ...prepared]);
      if (fileList.length > availableSlots) {
        setAttachmentError(`이미지는 최대 ${maxImageCount}장까지 추가할 수 있어요.`);
      }
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "이미지를 추가하지 못했어요.");
    } finally {
      imagePreparationRef.current = false;
      setPreparingImages(false);
    }
  }, [attachments, loading]);

  useEffect(() => {
    function handleClipboardImage(event: ClipboardEvent) {
      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const clipboardFiles = Array.from(clipboard.files)
        .filter((file) => file.type.startsWith("image/"));
      const itemFiles = Array.from(clipboard.items)
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      const files = clipboardFiles.length > 0 ? clipboardFiles : itemFiles;

      if (files.length > 0) void addImageFiles(files);
    }

    window.addEventListener("paste", handleClipboardImage);
    return () => window.removeEventListener("paste", handleClipboardImage);
  }, [addImageFiles]);

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    setAttachmentError("");
  }

  async function ask(action: TutorAction = "QUESTION", preset?: string, source: TutorRequestSource = action === "QUESTION" ? "DIRECT" : "FOLLOW_UP") {
    const chargesUsage = source === "DIRECT";
    if (!selectedUnit || loading || preparingImages || (chargesUsage && remaining <= 0)) return;
    const question = (preset ?? input).trim();
    const currentAttachments = chargesUsage ? attachments : [];
    if (action === "QUESTION" && !question && currentAttachments.length === 0) return;

    const baseMessages = conversationOpen ? messages : [];
    const userMessage: TutorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: action === "QUESTION" ? question || "첨부 이미지로 질문" : followUpRequestText[action],
      imageNames: currentAttachments.map((attachment) => attachment.name),
      action,
      completed: true,
    };
    const answerId = crypto.randomUUID();
    const assistantMessage: TutorMessage = { id: answerId, role: "assistant", content: "", action, completed: false };
    const recentMessages = baseMessages
      .filter((message) => message.content && message.completed)
      .slice(-6)
      .map(({ role, content }) => ({ role, content: content.slice(0, 3000) }));

    streamingAnswerRef.current = true;
    autoScrollRef.current = false;
    setConversationOpen(true);
    setMessages([...baseMessages, userMessage, assistantMessage]);
    scrollToMessageStart(answerId);
    setInput("");
    setAttachments([]);
    setAttachmentError("");
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
          source,
          message: action === "QUESTION" ? question || undefined : undefined,
          images: currentAttachments.map(({ name, mediaType, data }) => ({ name, mediaType, data })),
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
      console.log("[LearnCraft AI 답변 완료]", {
        requestId: response.headers.get("X-Request-Id"),
        unit: selectedUnit.title,
        answer: accumulated,
      });
      setMessages((current) => current.map((message) => message.id === answerId ? { ...message, content: accumulated, completed: true } : message));
    } catch (error) {
      if (currentAttachments.length > 0) setAttachments(currentAttachments);
      const errorMessage = error instanceof Error ? error.message : "답변을 불러오지 못했어요.";
      setMessages((current) => current.map((item) => item.id === answerId
        ? { ...item, content: item.content || `답변을 끝까지 불러오지 못했어요.\n\n> ${errorMessage}`, completed: false }
        : item));
      setRetryRequest({ action, preset, source });
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
        title: makeBookmarkTitle(messages, message),
        answerMarkdown: message.content,
      }),
    });
    if (response.ok) {
      setSavedIds((current) => new Set(current).add(message.id));
      setNotice("답변을 학습 북마크에 저장했어요.");
      window.setTimeout(() => setNotice(""), 2400);
    }
  }

  async function copyMessage(message: TutorMessage) {
    if (!message.completed || !message.content) return;

    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = message.content;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      textArea.remove();
      if (!copied) {
        setNotice("답변을 복사하지 못했어요.");
        window.setTimeout(() => setNotice(""), 2400);
        return;
      }
    }

    setCopiedMessageId(message.id);
    setNotice("답변 내용을 복사했어요.");
    window.setTimeout(() => {
      setCopiedMessageId((current) => current === message.id ? null : current);
      setNotice("");
    }, 2400);
  }

  return (
    <div className="app-enter flex h-dvh min-h-0 flex-col overflow-hidden">
      <StudentTopNavigation user={{ name: studentName, schoolName }} />
      <div className="relative grid min-h-0 flex-1 grid-cols-1 min-[1024px]:grid-cols-[298px_minmax(0,1fr)]">
      <aside className="scrollbar-subtle hidden overflow-y-scroll border-r border-line bg-surface/55 px-4 py-5 [scrollbar-gutter:stable] min-[1024px]:block">
        <CurriculumPicker
          grade={grade}
          subject={subject}
          allUnits={units}
          units={filteredUnits}
          selectedCourseCode={homeOpen ? "" : selectedUnit.courseCode}
          selectedUnitId={homeOpen || courseOverviewOpen ? "" : selectedUnit.id}
          onGrade={changeGrade}
          onSubject={changeSubject}
          onCourse={openCourseOverview}
          onUnit={selectUnit}
        />
      </aside>

      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-surface pb-[calc(4.45rem+env(safe-area-inset-bottom))] min-[1024px]:pb-0">
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface-2 px-4 py-2.5 min-[1024px]:hidden">
          <button onClick={() => setDrawerOpen(true)} className="flex min-w-0 flex-1 items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2 text-left shadow-[var(--lift-1)]" aria-label="학습 단원 선택 열기">
            {homeOpen ? (
              <Sparkles size={15} className="shrink-0 text-brand" aria-hidden="true" />
            ) : courseOverviewOpen ? (
              <BookCopy size={15} className="shrink-0 text-brand" aria-hidden="true" />
            ) : (
              <span className="figure shrink-0 text-[.78rem] text-brand">{selectedUnit.chapterOrder}.{selectedUnit.sectionOrder}</span>
            )}
            <span className="font-learning truncate text-[.88rem] font-semibold text-ink">{homeOpen ? "LearnCraft 소개" : courseOverviewOpen ? `${selectedUnit.courseTitle} 과목 안내` : <InlineMarkdown>{selectedUnit.title}</InlineMarkdown>}</span>
            <ChevronDown size={14} className="ml-auto shrink-0 text-ink-5" />
          </button>
          <span className="shrink-0 text-[.78rem] font-semibold text-ink-4 sm:hidden">{studentName}</span>
          <span className="hidden text-[.78rem] text-ink-4 sm:inline">{schoolName} · {grade}학년</span>
        </div>

        <div ref={messageScrollRef} onScroll={trackScrollPosition} className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          <div className={cn(
            "mx-auto flex min-h-full w-full flex-col px-4 sm:px-7",
            homeOpen ? "max-w-[72rem] py-3 sm:py-5" : "max-w-[45rem] py-6 sm:py-9",
          )}>
            {homeOpen ? (
              <LearnCraftIntro studentName={studentName} onOpenCurriculum={() => setDrawerOpen(true)} />
            ) : courseOverviewOpen ? (
              <CourseOverview units={selectedCourseUnits} onOpenCurriculum={() => setDrawerOpen(true)} />
            ) : !conversationOpen || messages.length === 0 ? (
              <Welcome unit={selectedUnit} learningLevel={learningLevel} previousAnswerCount={messages.filter((message) => message.role === "assistant" && message.completed).length} onLevel={setLearningLevel} onQuestion={(question) => void ask("QUESTION", question)} onResume={resumeConversation} />
            ) : (
              <div className="flex-1 space-y-10 pb-5">
                {messages.map((message, index) => (
                  <article id={`tutor-message-${message.id}`} key={message.id} className={cn("flex scroll-mt-4", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "user" ? (
                      <div className="font-learning max-w-[88%] rounded-[16px_16px_4px_16px] border border-line border-r-brand/35 bg-brand-page px-4 py-3 text-[1.01rem] leading-7 text-ink shadow-[var(--lift-1)] sm:max-w-[78%]">
                        {message.imageNames && message.imageNames.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {message.imageNames.map((name, imageIndex) => (
                              <span key={`${message.id}-${imageIndex}-${name}`} className="inline-flex max-w-full items-center gap-1.5 rounded-[8px] border border-brand/15 bg-surface/70 px-2 py-1 text-[.74rem] font-semibold leading-5 text-brand-dark">
                                <ImagePlus size={13} className="shrink-0" />
                                <span className="max-w-44 truncate">{name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <div>{message.content}</div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-4 flex items-center gap-3">
                          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-brand/15 bg-[linear-gradient(145deg,#ffffff_0%,#f2edff_100%)] shadow-[0_6px_16px_rgba(82,57,157,.14)]" aria-hidden="true">
                            <Image src="/images/learncraft-tutor-avatar.png" alt="" width={420} height={418} className="size-[2.65rem] object-contain drop-shadow-[0_2px_4px_rgba(70,42,170,.18)]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[.88rem] font-extrabold text-ink">LearnCraft 튜터</span>
                              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[.67rem] font-bold text-brand-dark">AI 학습 파트너</span>
                              {!message.completed && message.content && <span className="text-[.76rem] font-semibold text-brand">답변 작성 중</span>}
                            </div>
                            <p className="mt-0.5 truncate text-[.78rem] text-ink-4">{levelConfig.find((item) => item.level === learningLevel)?.label} · {selectedUnit.publisherName} 기준</p>
                          </div>
                        </div>
                        <div>
                          {message.content ? <Markdown>{message.content}</Markdown> : <Thinking />}
                          {message.completed && (
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                              <span className="text-[.8rem] text-ink-4">답변 완료 · 이 대화는 서버에 저장되지 않아요</span>
                              <div className="ml-auto flex items-center gap-2">
                                {index === messages.length - 1 && (
                                  <button onClick={() => resetConversation()} disabled={loading} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[11px] border border-brand/20 bg-brand-page px-3.5 text-[.82rem] font-semibold text-brand-dark transition-all duration-300 hover:-translate-y-px hover:border-brand/35 hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40" aria-label="새 대화 시작">
                                    <Plus size={16} />
                                    <span>새 대화</span>
                                  </button>
                                )}
                                <button onClick={() => void copyMessage(message)} className={cn("flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[11px] border px-3.5 text-[.82rem] font-semibold transition-all duration-300 hover:-translate-y-px", copiedMessageId === message.id ? "border-ok/20 bg-[var(--ok-page)] text-ok" : "border-line text-ink-3 hover:border-[var(--line-2)] hover:text-ink")} aria-label="답변 내용 복사">
                                  {copiedMessageId === message.id ? <Check size={16} /> : <Copy size={16} />}
                                  <span>{copiedMessageId === message.id ? "복사됨" : "복사"}</span>
                                </button>
                                <button onClick={() => void bookmarkMessage(message)} className={cn("flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[11px] border px-3.5 text-[.82rem] font-semibold transition-all duration-300 hover:-translate-y-px", savedIds.has(message.id) ? "border-brand/25 bg-brand-soft text-brand-dark shadow-[var(--lift-1)]" : "border-line text-ink-3 hover:border-[var(--line-2)] hover:text-ink")} aria-label="답변을 학습 북마크에 저장" aria-pressed={savedIds.has(message.id)}>
                                  {savedIds.has(message.id) ? <BookmarkCheck size={16} className="text-brand" /> : <Bookmark size={16} />}
                                  <span>{savedIds.has(message.id) ? "저장됨" : "북마크"}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {message.completed && index === messages.length - 1 && (
                          <div className="mt-6">
                            <p className="mb-3 text-[.86rem] font-bold text-ink">이어서 학습하기</p>
                            <div className="flex flex-wrap gap-2">
                            {followUpOrder.map((action) => actionConfig.find((item) => item.action === action)!).map(({ action, label, icon: Icon, tone }) => {
                              const hasProblemToReveal = message.action === "QUIZ";
                              const showLearningEssentials = action === "REVEAL" && !hasProblemToReveal;
                              const FollowUpIcon = showLearningEssentials ? BookOpenCheck : Icon;
                              const followUpLabel = showLearningEssentials ? "꼭 알아야 할 내용" : label;

                              return (
                                <button
                                  key={action}
                                  onClick={() => void (showLearningEssentials
                                    ? ask("QUESTION", LEARNING_ESSENTIALS_PROMPT, "FOLLOW_UP")
                                    : ask(action))}
                                  disabled={loading}
                                  className={cn("flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[11px] border px-4 text-[.88rem] font-semibold transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-px active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40", tone)}
                                >
                                  <FollowUpIcon size={15} />{followUpLabel}{action === "QUIZ" && <span className="rounded-full bg-white/75 px-2 py-0.5 text-[.7rem] font-bold text-brand shadow-[0_1px_3px_rgba(82,57,157,.08)]">권장</span>}
                                </button>
                              );
                            })}
                            </div>
                          </div>
                        )}
                        {!message.completed && message.content && retryRequest && index === messages.length - 1 && (
                          <button onClick={() => void ask(retryRequest.action, retryRequest.preset, retryRequest.source)} disabled={loading} className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5 text-[.82rem] font-semibold text-ink transition hover:border-brand/35 hover:bg-brand-soft">
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

        {!homeOpen && !courseOverviewOpen && <div className="shrink-0 bg-surface px-3 pb-3 pt-2 sm:px-7 sm:pb-5">
          <div className="mx-auto max-w-[45rem]">
            {remaining <= 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#efd3d5] bg-[#fff4f4] p-4 text-center text-sm font-semibold text-danger"><AlertCircle size={18} /> 오늘의 AI 학습 횟수를 모두 사용했어요. 내일 다시 이용해 주세요.</div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="composer rounded-[16px] border border-line bg-surface p-1.5 shadow-[var(--lift-2)] transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  aria-label="이미지 파일 선택"
                  onChange={(event) => {
                    void addImageFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  aria-label="카메라 촬영 이미지 선택"
                  onChange={(event) => {
                    void addImageFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
                {attachments.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto px-1.5 pb-2 pt-1.5">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="group relative w-24 shrink-0 overflow-hidden rounded-[11px] border border-line bg-surface-2">
                        <Image
                          src={attachment.dataUrl}
                          alt={`${attachment.name} 미리보기`}
                          width={96}
                          height={64}
                          unoptimized
                          className="h-16 w-24 object-cover"
                        />
                        <p className="truncate px-2 py-1 text-[.68rem] font-medium text-ink-3">{attachment.name}</p>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/90 text-ink shadow-sm transition hover:bg-white hover:text-danger"
                          aria-label={`${attachment.name} 삭제`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {preparingImages && <p role="status" className="animate-pulse px-2.5 pb-1 text-[.76rem] font-semibold text-brand">이미지를 처리하고 있어요…</p>}
                {attachmentError && <p role="alert" className="px-2.5 pb-1 text-[.76rem] font-semibold text-danger">{attachmentError}</p>}
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
                  <Button
                    type="submit"
                    size="icon"
                    disabled={(!input.trim() && attachments.length === 0) || loading || preparingImages}
                    aria-label="질문 보내기"
                    className="shrink-0 rounded-[12px] border-white/80 bg-[linear-gradient(145deg,#ffffff_0%,#f1ecff_100%)] text-[#7253e8] shadow-[0_8px_20px_rgba(82,57,157,.23),0_2px_6px_rgba(45,34,77,.1)] hover:border-white hover:bg-[linear-gradient(145deg,#ffffff_0%,#ebe3ff_100%)] hover:text-[#6242d4] hover:shadow-[0_11px_24px_rgba(82,57,157,.29),0_3px_8px_rgba(45,34,77,.12)] focus-visible:ring-4 focus-visible:ring-[#8064ef]/20 disabled:translate-y-0 disabled:border-[#e7e1f2] disabled:bg-none disabled:bg-[#f3f0f8] disabled:text-[#b5acc8] disabled:shadow-none"
                  >
                    <Send size={19} strokeWidth={2.3} />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-1.5 pb-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || preparingImages || attachments.length >= maxImageCount}
                      className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-2 text-[.76rem] font-semibold text-ink-3 transition hover:bg-surface-2 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="이미지 파일 추가"
                    >
                      <ImagePlus size={15} /> 이미지
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={loading || preparingImages || attachments.length >= maxImageCount}
                      className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-2 text-[.76rem] font-semibold text-ink-3 transition hover:bg-surface-2 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 lg:hidden"
                      aria-label="사진 촬영"
                    >
                      <Camera size={15} /> 촬영
                    </button>
                  </div>
                  <div className="ml-auto flex min-w-0 items-center gap-2 text-[.74rem] text-ink-5">
                    {attachments.length > 0 ? (
                      <span className="truncate">이미지 {attachments.length}/{maxImageCount} · 답변 후 저장 안 됨</span>
                    ) : (
                      <span className="hidden sm:inline">이미지 Ctrl+V · Enter 전송</span>
                    )}
                    <span
                      className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border border-[#c9bbf4] bg-[#eee9ff] px-2.5 py-1 font-bold text-[#49328f] shadow-[0_2px_8px_rgba(73,50,143,.12)]"
                      title="오늘 사용할 수 있는 AI 질문 횟수"
                    >
                      <span aria-hidden="true">✨</span>
                      <span>오늘 AI 질문 가능 횟수</span>
                      <span className="figure rounded-full bg-white/85 px-1.5 py-0.5 text-[.78rem] font-extrabold text-[#4f32ad] shadow-[0_1px_3px_rgba(73,50,143,.12)]">
                        {remaining}/{dailyLimit}회
                      </span>
                    </span>
                    <span className="figure shrink-0 border-l border-line pl-2">{input.length} / 1200</span>
                  </div>
                </div>
              </form>
            )}
            <p className="mt-2 text-center text-[.78rem] text-ink-5">AI 답변은 교과서와 선생님께 다시 확인하세요.</p>
          </div>
        </div>}
      </section>

      {!homeOpen && !courseOverviewOpen && <button
        ref={conceptTriggerRef}
        type="button"
        onClick={() => setConceptOpen(true)}
        className={cn(
          "group fixed bottom-[calc(5.35rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-[4.35rem] cursor-pointer place-items-center overflow-visible rounded-[22px] border border-white/80 bg-[linear-gradient(145deg,#ffffff_0%,#f1ecff_100%)] shadow-[0_14px_32px_rgba(82,57,157,.27),0_4px_10px_rgba(45,34,77,.12)] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:scale-[1.035] hover:shadow-[0_18px_38px_rgba(82,57,157,.32),0_5px_12px_rgba(45,34,77,.14)] active:translate-y-0 active:scale-[.97] min-[1024px]:bottom-7 min-[1024px]:right-7 min-[1024px]:size-[4.8rem]",
          conceptOpen && "pointer-events-none scale-95 opacity-0",
        )}
        aria-label="단원 핵심 노트 열기"
        aria-expanded={conceptOpen}
        aria-controls="concept-note-sheet"
        title="단원 핵심 노트"
      >
        <Image src="/images/core-notes-icon.png" alt="" width={60} height={40} className="h-auto w-[3.7rem] select-none drop-shadow-[0_3px_5px_rgba(79,55,151,.2)] min-[1024px]:w-[4.05rem]" aria-hidden="true" priority />
        <span className="pointer-events-none absolute right-[calc(100%+.65rem)] hidden whitespace-nowrap rounded-[10px] border border-line bg-surface px-3 py-2 text-[.76rem] font-bold text-ink shadow-[var(--lift-2)] opacity-0 transition-all duration-200 group-hover:-translate-x-1 group-hover:opacity-100 min-[1024px]:block">단원 핵심 노트</span>
      </button>}

      {drawerOpen && (
        <Sheet title="학습 단원 선택" onClose={() => setDrawerOpen(false)}>
          <CurriculumPicker grade={grade} subject={subject} allUnits={units} units={filteredUnits} selectedCourseCode={homeOpen ? "" : selectedUnit.courseCode} selectedUnitId={homeOpen || courseOverviewOpen ? "" : selectedUnit.id} onGrade={changeGrade} onSubject={changeSubject} onCourse={openCourseOverview} onUnit={selectUnit} />
        </Sheet>
      )}
      <Sheet id="concept-note-sheet" title="단원 핵심 노트" open={conceptOpen} onClose={() => { setConceptOpen(false); window.requestAnimationFrame(() => conceptTriggerRef.current?.focus()); }} side="right">
        <ConceptPanel unit={selectedUnit} />
      </Sheet>

      {notice && <div className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[11px] border border-brand/20 bg-surface px-4 py-3 text-sm font-semibold text-brand-dark shadow-[var(--lift-3)] min-[1024px]:bottom-6"><Check size={16} />{notice}</div>}
      </div>
    </div>
  );
}

function CurriculumPicker({ grade, subject, allUnits, units, selectedCourseCode, selectedUnitId, onGrade, onSubject, onCourse, onUnit }: {
  grade: SupportedGrade;
  subject: SubjectCode;
  allUnits: LearningUnit[];
  units: LearningUnit[];
  selectedCourseCode: string;
  selectedUnitId: string;
  onGrade: (grade: SupportedGrade) => void;
  onSubject: (subject: SubjectCode) => void;
  onCourse: (firstUnitId: string) => void;
  onUnit: (id: string) => void;
}) {
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const subjectMenuRef = useRef<HTMLDivElement>(null);
  const courseMenuRef = useRef<HTMLDivElement>(null);
  const subjectMenuId = useId();
  const courseMenuId = useId();
  const selectedSubject = subjectCatalog.find((item) => item.code === subject) ?? subjectCatalog[0];
  const SelectedSubjectIcon = selectedSubject.icon;
  const availableGrades = useMemo(() => availableGradesFor(allUnits), [allUnits]);
  const availableSubjects = useMemo(() => {
    const codes = new Set(
      allUnits
        .filter((unit) => unit.grade === grade)
        .map((unit) => unit.subjectCode),
    );
    return subjectCatalog.filter((item) => codes.has(item.code));
  }, [allUnits, grade]);

  useEffect(() => {
    if (!subjectMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !subjectMenuRef.current?.contains(event.target)) {
        setSubjectMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSubjectMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [subjectMenuOpen]);

  useEffect(() => {
    if (!courseMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !courseMenuRef.current?.contains(event.target)) {
        setCourseMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCourseMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [courseMenuOpen]);

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
      <div className="mt-4 grid gap-1 rounded-[12px] border border-line bg-surface-3 p-1" style={{ gridTemplateColumns: `repeat(${availableGrades.length}, minmax(0, 1fr))` }}>
        {availableGrades.map((item) => <button key={item} onClick={() => onGrade(item)} className={cn("min-h-9 cursor-pointer rounded-[9px] text-[.82rem] font-semibold transition active:scale-[.97]", grade === item ? "bg-surface text-ink shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>{item}학년</button>)}
      </div>
      <div ref={subjectMenuRef} className="relative mt-2">
        <button
          type="button"
          onClick={() => {
            setCourseMenuOpen(false);
            setSubjectMenuOpen((open) => !open);
          }}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[11px] border border-line bg-surface px-3 text-left shadow-[var(--lift-1)] transition-all hover:border-[var(--line-2)] hover:bg-surface-2 active:scale-[.99]"
          aria-haspopup="menu"
          aria-expanded={subjectMenuOpen}
          aria-controls={subjectMenuId}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-brand-soft text-brand-dark">
            <SelectedSubjectIcon size={15} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[.7rem] font-semibold leading-4 text-ink-5">교과 선택</span>
            <span className="block text-[.84rem] font-bold leading-5 text-ink">{selectedSubject.title}</span>
          </span>
          <ChevronDown size={15} className={cn("shrink-0 text-ink-5 transition-transform duration-200", subjectMenuOpen && "rotate-180")} />
        </button>

        {subjectMenuOpen && (
          <div
            id={subjectMenuId}
            role="menu"
            aria-label="교과 선택"
            className="absolute left-0 right-0 top-[calc(100%+.45rem)] z-40 rounded-[14px] border border-line bg-surface p-2.5 shadow-[var(--lift-3)]"
          >
            <p className="mb-2 px-1 text-[.76rem] font-bold text-ink">{grade}학년 교과</p>
            <div className="grid grid-cols-3 gap-1.5">
              {availableSubjects.map((item) => {
                const SubjectIcon = item.icon;
                const active = item.code === subject;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitemradio"
                    onClick={() => {
                      onSubject(item.code);
                      setSubjectMenuOpen(false);
                    }}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border px-2 text-center text-[.76rem] font-bold transition-all active:scale-[.97]",
                      active
                        ? "cursor-pointer border-brand/25 bg-brand-soft text-brand-dark"
                        : "border-line bg-surface text-ink-3 hover:border-[var(--line-2)] hover:bg-surface-2 hover:text-ink",
                    )}
                    aria-checked={active}
                  >
                    <SubjectIcon size={15} strokeWidth={1.8} aria-hidden="true" />
                    <span>{item.title}</span>
                    {active && <Check size={12} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {courseOptions.length > 0 ? (
        <div className="mt-6">
          <p className="px-1 text-[.78rem] font-bold text-ink-4">수강 과목</p>
          <div ref={courseMenuRef} className="relative mt-2.5">
            <button
              type="button"
              onClick={() => {
                setSubjectMenuOpen(false);
                setCourseMenuOpen((open) => !open);
              }}
              className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-[11px] border border-line bg-surface px-3 text-left shadow-[var(--lift-1)] transition-all hover:border-[var(--line-2)] hover:bg-surface-2 active:scale-[.99]"
              aria-haspopup="menu"
              aria-expanded={courseMenuOpen}
              aria-controls={courseMenuId}
            >
              <BookCopy size={16} className="shrink-0 text-brand" aria-hidden="true" />
              <span className={cn("min-w-0 flex-1 truncate text-[.9rem] font-bold", selectedCourse ? "text-ink" : "text-ink-4")}>{selectedCourse?.courseTitle ?? "수강 과목을 선택하세요"}</span>
              {selectedCourse && <span className="shrink-0 text-[.68rem] font-semibold text-ink-5">{courseUnits.length}개</span>}
              <ChevronDown size={15} className={cn("shrink-0 text-ink-5 transition-transform duration-200", courseMenuOpen && "rotate-180")} />
            </button>

            {courseMenuOpen && (
              <div
                id={courseMenuId}
                role="menu"
                aria-label="수강 과목 선택"
                className="absolute left-0 right-0 top-[calc(100%+.45rem)] z-40 max-h-72 overflow-y-auto rounded-[14px] border border-line bg-surface p-2 shadow-[var(--lift-3)]"
              >
                <p className="mb-1.5 px-1.5 text-[.72rem] font-bold text-ink-4">{selectedSubject.title} 수강 과목</p>
                <div className="grid gap-1">
                  {courseOptions.map((course) => {
                    const active = course.courseCode === selectedCourseCode;
                    const topicCount = units.filter((unit) => unit.courseCode === course.courseCode).length;
                    return (
                      <button
                        key={course.courseCode}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          const firstUnit = firstCurriculumUnit(
                            units,
                            (unit) => unit.courseCode === course.courseCode,
                          );
                          if (firstUnit) onCourse(firstUnit.id);
                          setCourseMenuOpen(false);
                        }}
                        className={cn(
                          "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-left transition-all active:scale-[.99]",
                          active ? "bg-brand-soft text-brand-dark" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate text-[.8rem] font-bold"><InlineMarkdown>{course.courseTitle}</InlineMarkdown></span>
                        <span className="shrink-0 text-[.66rem] font-semibold text-ink-5">{topicCount}개 주제</span>
                        {active && <Check size={13} className="shrink-0 text-brand" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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

          {selectedCourse && <div className="mt-4 grid gap-3.5">
            {chapterGroups.map((chapter) => (
              <section key={`${selectedCourseCode}-${chapter.order}`}>
                <div className="flex items-center gap-2 px-1">
                  <span className="figure shrink-0 text-[.82rem] font-semibold text-brand">{chapter.order}</span>
                  <h3 className="font-learning text-[.88rem] font-bold text-ink"><InlineMarkdown>{chapter.title}</InlineMarkdown></h3>
                </div>
                <div className="mt-1.5 grid gap-1.5 border-l border-line pl-2">
                  {chapter.sections.map((section) => (
                    <div key={`${chapter.order}-${section.order}`}>
                      {section.title !== chapter.title && (section.units.length > 1 || section.title !== section.units[0]?.title) && (
                        <p className="mb-0.5 px-1 text-[.74rem] font-semibold leading-5 text-ink-5"><span className="figure">{section.order}.</span> <InlineMarkdown>{section.title}</InlineMarkdown></p>
                      )}
                      <div className="grid gap-0.5">
                        {section.units.map((unit) => (
                          <button
                            key={unit.id}
                            onClick={() => onUnit(unit.id)}
                            className={cn(
                              "group flex min-h-9 cursor-pointer items-start gap-1.5 rounded-[9px] px-1.5 py-1 text-left transition-all duration-200 active:scale-[.985] min-[1024px]:min-h-8",
                              selectedUnitId === unit.id
                                ? "bg-brand-soft text-[#4a3e7a]"
                                : "text-ink-3 hover:bg-surface hover:text-ink",
                            )}
                          >
                            <span className={cn("figure shrink-0 pt-0.5 text-[.76rem]", selectedUnitId === unit.id ? "text-brand" : "text-ink-5")}>{chapter.order}.{section.order}</span>
                            <span className={cn("min-w-0 text-[.83rem] leading-5", selectedUnitId === unit.id ? "font-learning font-bold" : "font-medium")}><InlineMarkdown>{unit.title}</InlineMarkdown></span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>}
        </div>
      ) : (
        <div className="mt-6 rounded-[13px] border border-dashed border-line bg-surface/60 px-4 py-7 text-center">
          <p className="text-[.82rem] font-bold text-ink">이 학년에 공개된 과목이 없어요.</p>
          <p className="mt-1 text-[.8rem] leading-5 text-ink-3">다른 학년이나 과목을 선택해 주세요.</p>
        </div>
      )}
    </div>
  );
}

function LearnCraftIntro({ studentName, onOpenCurriculum }: {
  studentName: string;
  onOpenCurriculum: () => void;
}) {
  const steps = [
    { number: "01", title: "과목 선택", description: "왼쪽 교육과정에서 수강 과목을 직접 선택해요.", icon: BookOpenCheck },
    { number: "02", title: "주제 선택", description: "교과서 목차에서 지금 공부할 주제를 골라요.", icon: ListTree },
    { number: "03", title: "이해까지 질문", description: "더 쉽게, 더 깊게, 문제로 이어서 물어봐요.", icon: CircleHelp },
  ] as const;
  const questionExamples = [
    "이 개념을 처음 배우는 것처럼 쉬운 예시로 설명해 줘.",
    "이 공식이 왜 성립하는지 중간 과정을 생략하지 말고 알려 줘.",
    "내 풀이에서 틀린 부분을 찾고, 비슷한 확인 문제도 만들어 줘.",
  ] as const;
  const studyTips = [
    "이해되지 않은 문장이나 풀이를 그대로 붙여 넣어도 괜찮아요.",
    "답변이 어렵다면 ‘더 쉽게’, 이유가 궁금하면 ‘더 깊게’를 선택하세요.",
    "다시 볼 설명은 북마크하고, 중요한 내용은 교과서와 함께 확인하세요.",
  ] as const;

  return (
    <div className="relative flex flex-1 flex-col py-1 sm:py-2">
      <section className="relative grid min-h-[26rem] items-center gap-9 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
        <div className="max-w-[38rem]">
          <p className="flex items-center gap-2 text-[.72rem] font-extrabold tracking-[.12em] text-brand"><Sparkles size={15} /> LEARNCRAFT</p>
          <p className="mt-6 text-[.86rem] font-semibold text-ink-3">안녕하세요, {studentName}님.</p>
          <h1 className="font-learning mt-2 break-keep text-balance text-[1.9rem] font-bold leading-[1.22] tracking-[-0.045em] text-ink sm:text-[2.35rem] lg:text-[2.75rem]">
            오늘 공부할 단원을 고르고,<br /><span className="text-brand-dark">궁금한 건 바로 질문하세요</span>
          </h1>
          <p className="mt-6 max-w-[34rem] break-keep text-[.94rem] leading-7 text-ink-3 sm:text-[1.02rem] sm:leading-8">
            학교 진도에 맞춰 준비된 교과서 목차에서 단원을 선택하세요. 사진 속 문제 풀이부터 쉬운 설명, 핵심 정리, 확인 문제까지 필요한 방식으로 이어서 배울 수 있어요.
          </p>
          <button type="button" onClick={onOpenCurriculum} className="group mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-brand bg-brand px-5 text-[.88rem] font-bold text-white shadow-[var(--lift-brand)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-brand-dark active:scale-[.98] min-[1024px]:hidden">
            <BookOpen size={18} /> 학습할 과목 선택하기 <ChevronDown size={15} className="-rotate-90 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="mt-7 hidden items-center gap-3 min-[1024px]:flex">
            <span className="grid size-10 place-items-center rounded-[12px] border border-line bg-surface text-brand shadow-[var(--lift-1)]"><BookOpen size={17} /></span>
            <p className="text-[.8rem] leading-5 text-ink-4"><strong className="block font-bold text-ink-2">왼쪽 교육과정에서 시작하세요</strong>학년과 교과를 확인한 뒤 수강 과목을 직접 선택해 주세요.</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[32rem] rounded-[20px] border border-line bg-surface p-2 shadow-[var(--lift-2)]">
          <div className="absolute inset-x-[12%] bottom-[-3%] h-[24%] rounded-[50%] bg-brand/10 blur-2xl" aria-hidden="true" />
          <video autoPlay loop muted playsInline disablePictureInPicture preload="metadata" poster="/images/learncraft-logo-animation-poster.webp" aria-label="움직이는 LearnCraft 로고" className="relative aspect-video w-full rounded-[14px] object-cover motion-reduce:hidden">
            <source src="/images/learncraft-logo-animation.mp4" type="video/mp4" />
          </video>
          <Image src="/images/learncraft-logo-animation-poster.webp" alt="LearnCraft" width={1280} height={720} priority className="relative hidden aspect-video w-full rounded-[14px] object-cover motion-reduce:block" />
          <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-2 text-[.7rem] font-bold text-brand-dark shadow-[var(--lift-2)]"><CheckCircle2 size={13} className="text-ok" /> 교육과정 기반 AI 튜터</div>
        </div>
      </section>

      <div className="relative mt-10 border-t border-line pt-8">
        <p className="text-[.75rem] font-bold tracking-[.06em] text-ink-4">학습은 이렇게 이어져요</p>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
          {steps.map(({ number, title, description, icon: Icon }, index) => (
            <li key={number} className={cn("flex items-start gap-3", index > 0 && "sm:pl-5", index < steps.length - 1 && "sm:pr-5")}>
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-line bg-surface-2 text-brand"><Icon size={17} /></span>
              <span className="min-w-0">
                <span className="figure text-[.65rem] font-bold text-brand/60">{number}</span>
                <strong className="font-learning ml-2 text-[.9rem] font-bold text-ink">{title}</strong>
                <span className="mt-1.5 block break-keep text-[.76rem] leading-5 text-ink-4">{description}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <section className="relative mt-12 grid gap-4 lg:grid-cols-[1.12fr_.88fr]">
        <div className="rounded-[18px] border border-line bg-surface p-5 shadow-[var(--lift-1)] sm:p-7">
          <p className="flex items-center gap-2 text-[.76rem] font-bold text-brand"><CircleHelp size={16} /> 무엇이든, 막힌 그대로 물어보세요</p>
          <h2 className="font-learning mt-2 break-keep text-[1.55rem] font-bold tracking-[-0.035em] text-ink sm:text-[1.8rem]">좋은 질문을 떠올리지 못해도 괜찮아요</h2>
          <p className="mt-2 max-w-[38rem] break-keep text-[.8rem] leading-6 text-ink-4">단원을 고르면 학습 수준에 맞는 질문을 먼저 제안해 드려요. 아래처럼 편하게 바꿔 물을 수도 있어요.</p>
          <div className="mt-5 grid gap-2.5">
            {questionExamples.map((question, index) => (
              <div key={question} className="group flex items-start gap-3 rounded-[12px] border border-transparent bg-surface-2 px-4 py-3.5 transition-all duration-300 hover:border-line hover:bg-surface hover:shadow-[var(--lift-1)]">
                <span className="figure mt-0.5 text-[.7rem] font-bold text-brand">0{index + 1}</span>
                <p className="font-learning break-keep text-[.82rem] font-semibold leading-6 text-ink-2">“{question}”</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-line bg-brand-page p-5 sm:p-7">
          <p className="flex items-center gap-2 text-[.76rem] font-bold text-brand"><BookmarkCheck size={16} /> 답변을 내 공부로 만드는 방법</p>
          <h2 className="font-learning mt-2 break-keep text-[1.4rem] font-bold tracking-[-0.035em] text-ink sm:text-[1.6rem]">한 번의 답보다, 이어지는 이해</h2>
          <ul className="mt-5 grid gap-4">
            {studyTips.map((tip, index) => (
              <li key={tip} className="flex items-start gap-3">
                <span className="figure grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface text-[.68rem] font-bold text-brand shadow-[var(--lift-1)]">{index + 1}</span>
                <p className="break-keep pt-0.5 text-[.79rem] leading-6 text-ink-3">{tip}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative mt-5 overflow-hidden rounded-[18px] border border-line bg-[linear-gradient(135deg,var(--brand-page),var(--surface-2))] px-5 py-7 shadow-[var(--lift-1)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full border-[32px] border-brand/[.045]" aria-hidden="true" />
        <div className="relative max-w-[48rem]">
          <p className="text-[.72rem] font-bold tracking-[.1em] text-brand">WHY LEARNCRAFT</p>
          <h2 className="font-learning mt-2 break-keep text-[1.5rem] font-bold tracking-[-0.035em] sm:text-[1.85rem]">스스로 설명할 수 있을 때, 비로소 내 지식이 됩니다.</h2>
          <p className="mt-3 max-w-[44rem] break-keep text-[.82rem] leading-6 text-ink-3 sm:text-[.88rem]">모르는 것을 편하게 묻고, 같은 내용을 여러 방식으로 다시 듣고, 결국 자신의 말로 설명할 수 있게 하는 것. 그것이 LearnCraft를 만든 이유입니다.</p>
        </div>
      </section>
    </div>
  );
}

function CourseOverview({ units, onOpenCurriculum }: {
  units: LearningUnit[];
  onOpenCurriculum: () => void;
}) {
  const course = units[0];
  if (!course) return null;

  const chapters = [...new Map(units.map((unit) => [unit.chapterOrder, {
    order: unit.chapterOrder,
    title: unit.chapterTitle,
  }])).values()].sort((left, right) => left.order - right.order);
  const overview = course.courseOverview?.trim()
    || `${course.courseTitle}에서는 ${chapters.slice(0, 3).map((chapter) => chapter.title).join(", ")}${chapters.length > 3 ? " 등" : ""}을 중심으로 핵심 개념과 활용 방법을 배웁니다. 아래 학습 흐름을 살펴본 뒤 목차에서 공부할 주제를 직접 선택해 주세요.`;

  return (
    <div className="flex flex-1 flex-col py-2 sm:py-4">
      <div className="max-w-[44rem]">
        <p className="flex items-center gap-2 text-[.8rem] font-bold text-brand"><BookOpenCheck size={16} /> {course.subjectTitle} · 과목 안내</p>
        <h2 className="font-learning mt-3 text-balance text-[2rem] font-bold leading-[1.3] tracking-[-0.05em] text-ink sm:text-[2.45rem]">{course.courseTitle}</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-[.74rem] font-semibold text-ink-4">
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5">{course.publisherName}</span>
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5">{course.curriculum}</span>
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5">{units.length}개 학습 주제</span>
        </div>

        <section className="mt-8 rounded-[18px] border border-brand/15 bg-brand-page px-5 py-5 sm:px-6">
          <p className="text-[.78rem] font-bold text-brand">이 과목에서 배우는 내용</p>
          <div className="font-learning mt-2 text-[1rem] leading-7 text-ink-2 sm:text-[1.06rem]"><Markdown>{overview}</Markdown></div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[.82rem] font-bold text-ink">학습 흐름</p>
              <p className="mt-1 text-[.78rem] leading-5 text-ink-4">대단원 순서를 확인하고 왼쪽 목차에서 학습 주제를 선택하세요.</p>
            </div>
            <span className="figure text-[.75rem] font-semibold text-ink-5">대단원 {chapters.length}개</span>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {chapters.map((chapter) => {
              const topicCount = units.filter((unit) => unit.chapterOrder === chapter.order).length;
              return (
                <li key={chapter.order} className="flex min-h-20 items-center gap-3 rounded-[14px] border border-line bg-surface-2 px-4 py-3">
                  <span className="figure grid size-9 shrink-0 place-items-center rounded-[11px] bg-brand-soft text-[.82rem] font-bold text-brand">{String(chapter.order).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-learning block text-[.9rem] font-bold leading-5 text-ink"><InlineMarkdown>{chapter.title}</InlineMarkdown></span>
                    <span className="mt-1 block text-[.72rem] font-medium text-ink-5">{topicCount}개 학습 주제</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-7 rounded-[15px] border border-dashed border-brand/25 bg-surface px-4 py-4 text-center">
          <p className="font-learning text-[.9rem] font-bold text-ink">아직 선택된 학습 주제가 없어요</p>
          <p className="mt-1 text-[.76rem] leading-5 text-ink-4">목차에서 원하는 주제를 고르면 단원 설명과 AI 질문 기능이 열립니다.</p>
          <button type="button" onClick={onOpenCurriculum} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-brand px-4 text-[.8rem] font-bold text-white shadow-[var(--lift-1)] transition hover:bg-brand-dark min-[1024px]:hidden">
            <ListTree size={15} /> 학습 주제 선택하기
          </button>
        </div>
      </div>
    </div>
  );
}

function Welcome({ unit, learningLevel, previousAnswerCount, onLevel, onQuestion, onResume }: { unit: LearningUnit; learningLevel: LearningLevel; previousAnswerCount: number; onLevel: (level: LearningLevel) => void; onQuestion: (question: string) => void; onResume: () => void }) {
  const selectedLevel = levelConfig.find((item) => item.level === learningLevel);
  const suggestedQuestions = recommendedQuestionsFor(unit, learningLevel);

  return (
    <div className="flex flex-1 flex-col py-2 sm:py-4">
      <div className="max-w-[44rem]">
        <p className="flex items-baseline gap-2 text-[.84rem] font-semibold leading-6 text-brand"><span className="figure text-ink-5">{unit.chapterOrder}.{unit.sectionOrder}</span><span><InlineMarkdown>{unit.chapterTitle}</InlineMarkdown> · <InlineMarkdown>{unit.sectionTitle}</InlineMarkdown></span></p>
        <h2 className="font-learning mt-3 max-w-2xl text-balance text-[1.85rem] font-bold leading-[1.35] tracking-[-0.045em] text-ink sm:text-[2.25rem]"><span className="mark"><InlineMarkdown>{unit.title}</InlineMarkdown></span></h2>
        <p className="mt-4 text-[.78rem] font-semibold text-ink-4">이번 단원 학습 목표</p>
        <div className="font-learning mt-1 max-w-[40rem] text-[1rem] text-ink-2 sm:text-[1.08rem]"><Markdown>{unit.summary}</Markdown></div>

        {unit.prerequisites.length > 0 && (
          unit.subjectCode === "MATH" ? (
            <section className="mt-5 border-y border-line py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-[.84rem] font-bold text-ink">학습 준비 확인</h3>
                <span className="text-[.75rem] font-medium text-ink-5">수학 개념은 앞 단원과 이어져 있어요</span>
              </div>
              <p className="mt-1.5 text-[.8rem] leading-5 text-ink-4">아래 개념을 설명하거나 간단한 문제에 적용할 수 있으면 이 단원을 바로 시작해도 좋아요.</p>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {unit.prerequisites.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onQuestion(`${item}을 ${unit.title} 공부에 필요한 부분 중심으로 다시 설명해 주세요.`)}
                    className="group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] bg-surface-2 px-3 py-2 text-left transition-all duration-200 hover:bg-brand-soft active:scale-[.985]"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-brand/25 text-[.68rem] font-bold text-brand">✓</span>
                    <span className="min-w-0 flex-1 font-learning text-[.84rem] font-semibold leading-5 text-ink-2"><InlineMarkdown>{item}</InlineMarkdown></span>
                    <span className="shrink-0 text-[.72rem] font-semibold text-ink-5 transition-colors group-hover:text-brand">복습하기</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-brand/25 pl-3">
              <span className="text-[.75rem] font-bold text-ink-4">먼저 확인할 개념</span>
              <span className="font-learning text-[.86rem] font-semibold leading-6 text-ink-2"><InlineMarkdown>{unit.prerequisites.slice(0, 2).join(" · ")}</InlineMarkdown></span>
            </div>
          )
        )}

        <div className="mt-8">
          <div className="mb-2.5 flex items-center justify-between gap-4"><p className="text-[.86rem] font-bold text-ink">답변 방식</p><p className="text-right text-[.8rem] text-ink-4">대화 중에도 바꿀 수 있어요</p></div>
          <div className="grid grid-cols-2 gap-2">
            {levelConfig.map((item) => (
              <button key={item.level} onClick={() => onLevel(item.level)} className={cn("min-h-[4.35rem] cursor-pointer rounded-[12px] border px-3.5 py-2.5 text-left transition-all duration-300 active:scale-[.98]", learningLevel === item.level ? "border-brand/30 bg-brand-soft text-brand-dark shadow-[var(--lift-1)]" : "border-line bg-surface-2 text-ink-2 hover:bg-surface-3")}>
                <span className="font-learning block text-[.95rem] font-bold">{item.label}</span><span className={cn("mt-1 block text-[.76rem] leading-5", learningLevel === item.level ? "text-brand/70" : "text-ink-4")}>{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="mb-2.5 text-[.86rem] font-bold text-ink">{selectedLevel?.label ?? "선택한 방식"}으로 물어보기 예시</p>
          <div className="grid gap-1.5">
          {suggestedQuestions.map((question, index) => (
            <button key={question} onClick={() => onQuestion(question)} style={{ animationDelay: `${index * 70}ms` }} className="app-enter group grid min-h-[4.25rem] cursor-pointer grid-cols-[2rem_1fr_1.25rem] items-center gap-3 rounded-[13px] border border-transparent bg-surface-2 px-4 py-3 text-left transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-px hover:border-line hover:bg-surface active:scale-[.985]">
              <span className="figure text-[1.02rem] text-brand">0{index + 1}</span>
              <span className="font-learning text-[.96rem] font-semibold leading-6 text-ink"><InlineMarkdown>{question}</InlineMarkdown></span>
              <span className="text-lg text-ink-5 transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          ))}
          </div>
        </div>

        {previousAnswerCount > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <button type="button" onClick={onResume} className="group flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[12px] border border-brand/15 bg-brand-page px-4 py-3 text-left transition-all duration-300 hover:-translate-y-px hover:border-brand/25 hover:bg-brand-soft active:scale-[.99]">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface text-brand shadow-[var(--lift-1)]"><RotateCcw size={16} /></span>
              <span className="min-w-0 flex-1"><span className="font-learning block text-[.9rem] font-bold text-brand-dark">이어서 대화하기</span><span className="mt-0.5 block text-[.76rem] leading-5 text-ink-4">이 단원에서 나눈 답변 {previousAnswerCount}개가 남아 있어요.</span></span>
              <span className="text-lg text-brand/55 transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConceptPanel({ unit }: { unit: LearningUnit }) {
  return (
    <div className="pb-10">
      <div className="rounded-[18px] border border-brand/15 bg-brand-page p-5">
        <p className="flex items-center gap-2 text-[.78rem] font-bold text-brand"><BookOpenCheck size={16} /> {unit.courseTitle} · {unit.chapterOrder}.{unit.sectionOrder}</p>
        <h3 className="font-learning mt-3 text-[1.35rem] font-bold leading-8 tracking-[-0.035em] text-ink"><InlineMarkdown>{unit.title}</InlineMarkdown></h3>
        <p className="mt-2 text-[.78rem] font-semibold leading-5 text-ink-4"><InlineMarkdown>{unit.chapterTitle}</InlineMarkdown> · <InlineMarkdown>{unit.sectionTitle}</InlineMarkdown></p>
        <div className="mt-4 border-t border-brand/10 pt-4">
          <p className="text-[.75rem] font-bold uppercase tracking-[.08em] text-brand/75">학습 목표</p>
          <div className="font-learning mt-2 text-[.96rem] text-ink-2"><Markdown>{unit.summary}</Markdown></div>
        </div>
      </div>

      {unit.prerequisites.length > 0 && (
        <section className="mt-7">
          <p className="text-[.82rem] font-bold text-ink">준비 · 먼저 확인할 선수 개념</p>
          <p className="mt-1.5 text-[.8rem] leading-5 text-ink-4">아래 개념이 낯설다면 먼저 뜻과 기본 성질을 짚고 시작하세요.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {unit.prerequisites.map((item) => <span key={item} className="rounded-[12px] bg-surface-3 px-2.5 py-1.5 text-[.8rem] font-semibold text-ink-3"><InlineMarkdown>{item}</InlineMarkdown></span>)}
          </div>
        </section>
      )}

      <section className="mt-7">
        <p className="text-[.82rem] font-bold text-ink">핵심 · 개념과 학습 흐름</p>
        <ol className="mt-3 grid gap-2.5">
          {unit.keyPoints.map((point, index) => (
            <li key={point} className="grid grid-cols-[2rem_1fr] gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-3.5 shadow-[var(--lift-1)]">
              <span className="figure grid size-8 place-items-center rounded-[10px] bg-brand-soft text-[.78rem] font-bold text-brand">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <div className="font-learning text-[.92rem] font-bold text-ink"><Markdown>{point}</Markdown></div>
                <p className="mt-1 text-[.78rem] leading-5 text-ink-4">{index === 0 ? "뜻과 성립 조건을 자신의 말로 설명해 보세요." : index === unit.keyPoints.length - 1 ? "문제에 적용한 뒤 결과가 조건에 맞는지 검산하세요." : "앞에서 배운 개념과 연결해 풀이 과정에 적용해 보세요."}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {unit.keywords.length > 0 && (
        <section className="mt-6 rounded-[14px] bg-surface-2 p-4">
          <p className="text-[.78rem] font-bold text-ink-4">핵심 키워드</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {unit.keywords.slice(0, 10).map((keyword) => <span key={keyword} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[.76rem] font-semibold text-ink-3">#<InlineMarkdown>{keyword}</InlineMarkdown></span>)}
          </div>
        </section>
      )}

      {unit.formulas.length > 0 && (
        <section className="mt-7">
          <p className="text-[.82rem] font-bold text-ink">공식 · 원리와 쓰임</p>
          <div className="mt-3 space-y-2.5">
            {unit.formulas.map((formula) => <div key={formula.name} className="rounded-[14px] border border-line bg-surface-2 p-4"><p className="text-[.8rem] font-bold text-brand"><InlineMarkdown>{formula.name}</InlineMarkdown></p><div className="mt-2 overflow-x-auto text-[.82rem]"><Markdown>{displayMathMarkdown(formula.expression)}</Markdown></div><div className="mt-2 text-[.82rem] text-ink-3"><Markdown>{formula.explanation}</Markdown></div></div>)}
          </div>
        </section>
      )}

      {unit.examples.length > 0 && (
        <section className="mt-7">
          <p className="text-[.82rem] font-bold text-ink">적용 · 예시로 연결하기</p>
          <div className="mt-3 grid gap-2.5">
            {unit.examples.map((example) => <div key={`${example.title}-${example.body}`} className="rounded-[14px] bg-[var(--ok-page)] p-4"><p className="flex items-center gap-1.5 text-[.82rem] font-bold text-ok"><Lightbulb size={15} /><InlineMarkdown>{example.title}</InlineMarkdown></p><div className="mt-2 text-[.84rem] text-[#376f63]"><Markdown>{example.body}</Markdown></div></div>)}
          </div>
        </section>
      )}

      {unit.commonMistakes.length > 0 && (
        <section className="mt-7 rounded-[14px] bg-[var(--warn-page)] p-4">
          <p className="flex items-center gap-1.5 text-[.82rem] font-bold text-warn"><TriangleAlert size={15} /> 자주 틀리는 지점과 확인법</p>
          <ul className="mt-3 grid gap-3 text-[.82rem] leading-5 text-warn">
            {unit.commonMistakes.map((mistake, index) => <li key={mistake} className="grid grid-cols-[1.4rem_1fr] gap-2"><span className="figure text-[.72rem] font-bold text-danger/75">{index + 1}</span><span><span className="font-semibold"><InlineMarkdown>{mistake}</InlineMarkdown></span><span className="mt-0.5 block text-[.76rem] opacity-75">조건을 표시한 식과 마지막 결과를 한 줄씩 대조해 확인하세요.</span></span></li>)}
          </ul>
        </section>
      )}

      {unit.recommendedQuestions.length > 0 && (
        <section className="mt-7">
          <p className="flex items-center gap-1.5 text-[.82rem] font-bold text-ink"><CircleHelp size={15} className="text-brand" /> 스스로 점검하기</p>
          <ul className="mt-3 grid gap-2">
            {unit.recommendedQuestions.map((question) => <li key={question} className="flex gap-2.5 rounded-[12px] border border-line px-3 py-2.5 text-[.82rem] leading-5 text-ink-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand" /><InlineMarkdown>{question}</InlineMarkdown></li>)}
          </ul>
        </section>
      )}

      {(unit.assessmentTags.length > 0 || unit.scopeExcluded.length > 0) && (
        <section className="mt-7 grid gap-3 rounded-[14px] border border-line bg-surface-2 p-4">
          {unit.assessmentTags.length > 0 && <div><p className="text-[.78rem] font-bold text-ink-4">평가 포인트</p><p className="mt-1.5 text-[.8rem] leading-5 text-ink-2"><InlineMarkdown>{unit.assessmentTags.join(" · ")}</InlineMarkdown></p></div>}
          {unit.scopeExcluded.length > 0 && <div><p className="text-[.78rem] font-bold text-ink-4">이 단원에서 다루지 않는 범위</p><p className="mt-1.5 text-[.8rem] leading-5 text-ink-3"><InlineMarkdown>{unit.scopeExcluded.join(" · ")}</InlineMarkdown></p></div>}
        </section>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <div className="flex items-center justify-between text-[.8rem] text-ink-4"><span>교육과정</span><span className="font-semibold text-ink">{unit.curriculum}</span></div>
        <div className="mt-2.5 flex items-center justify-between text-[.8rem] text-ink-4"><span>기준 교과서</span><span className="font-semibold text-ink">{unit.publisherName}</span></div>
        <div className="mt-2.5 flex items-center justify-between text-[.8rem] text-ink-4"><span>콘텐츠 상태</span><span className="inline-flex items-center gap-1.5 font-semibold text-brand"><span className="size-1.5 rounded-full bg-brand" /> 공식 목차 반영</span></div>
        {unit.sourceUrl && <a href={unit.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-surface text-[.8rem] font-semibold text-ink-3 transition hover:border-[var(--line-2)] hover:text-brand"><ExternalLink size={13} /> 출판사 목차 자료 보기</a>}
      </div>
    </div>
  );
}

function Sheet({ id, title, open = true, onClose, side = "bottom", children }: { id?: string; title: string; open?: boolean; onClose: () => void; side?: "bottom" | "right"; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVisible(open);
      if (open) {
        scrollContainerRef.current?.scrollTo({ top: 0, left: 0 });
        closeButtonRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div id={id} inert={!visible} className={cn("fixed inset-0 z-50 overflow-hidden transition-[visibility] duration-300", visible ? "visible pointer-events-auto" : "invisible pointer-events-none")} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!visible}>
      <button tabIndex={visible ? 0 : -1} className={cn("absolute inset-0 cursor-default bg-[#e4e3f1]/72 backdrop-blur-[3px] transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label={`${title} 닫기`} />
      <div ref={scrollContainerRef} className={cn("absolute overflow-y-auto border-line bg-surface shadow-[0_0_60px_rgba(42,35,31,.18)] transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]", side === "right" ? "scrollbar-hidden inset-y-0 right-0 w-[min(34rem,100vw)] border-l px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-7" : "scrollbar-subtle inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[1.35rem] border-t px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-[25rem] sm:rounded-none sm:border-l sm:border-t-0", visible ? (side === "right" ? "translate-x-0" : "translate-y-0 sm:translate-x-0") : (side === "right" ? "translate-x-full" : "translate-y-full sm:translate-x-full sm:translate-y-0"))}>
        <div className="sticky top-0 z-10 -mx-5 mb-5 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-4 backdrop-blur-md sm:-mx-7 sm:px-7"><h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2><button ref={closeButtonRef} type="button" onClick={onClose} aria-label={`${title} 닫기`} className="grid size-11 cursor-pointer place-items-center rounded-[11px] text-ink-3 transition-all duration-300 hover:bg-surface-3 hover:text-ink active:scale-[.98]"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

function Thinking() {
  return <div className="flex min-h-20 flex-col justify-center gap-3" aria-label="AI 튜터가 답변을 준비하고 있습니다"><div className="flex items-center gap-1.5">{[0, 1, 2].map((item) => <span key={item} className="thinking-dot size-2 rounded-full bg-brand" style={{ animationDelay: `${item * 150}ms` }} />)}<span className="ml-2 text-[.82rem] font-semibold text-ink-4">질문과 단원 내용을 연결하고 있어요</span></div><div className="skeleton-shimmer h-2.5 w-[72%] rounded-full" /><div className="skeleton-shimmer h-2.5 w-[48%] rounded-full" /></div>;
}

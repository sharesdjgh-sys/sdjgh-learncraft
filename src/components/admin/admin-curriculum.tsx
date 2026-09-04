"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileUp,
  LoaderCircle,
  Plus,
  Rocket,
  School,
  Trash2,
  TriangleAlert,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineMarkdown, Markdown } from "@/components/ui/markdown";
import { displayMathMarkdown } from "@/lib/math-notation";
import { cn } from "@/lib/utils";
import type {
  CurriculumManagementState,
  CurriculumOffering,
  CurriculumVersionStatus,
} from "@/types/curriculum-management";
import type { LearningUnit } from "@/types";

type ApiResponse = CurriculumManagementState & {
  error?: { message?: string };
};

type GeneratedContentDetail = {
  id: string;
  offeringId: string;
  status: "DRAFT" | "DEVELOPER_REVIEWED" | "TEACHER_REVIEWED" | "PUBLISHED";
  sourceModel: string | null;
  units: LearningUnit[];
  sources: Array<{
    kind: "NATIONAL_CURRICULUM" | "PUBLISHER_TOC";
    title: string;
    url: string;
  }>;
  updatedAt: string;
  courseTitle: string;
  subjectTitle: string;
  grade: number;
  error?: { message?: string };
};

type BatchGenerationFailure = {
  courseTitle: string;
  message: string;
};

type BatchGenerationProgress = {
  completed: number;
  total: number;
  currentTitle: string;
  currentGrade: number | null;
  currentPublisher: string;
  successCount: number;
  failures: BatchGenerationFailure[];
};

type ConfirmationDialogState = {
  tone: "brand" | "warning";
  icon: "publish" | "draft" | "replace" | "leave";
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
  confirmLabel: string;
  onConfirm: () => void;
};

const subjectCodeMap: Record<string, string> = {
  국어: "KOREAN",
  영어: "ENGLISH",
  수학: "MATH",
  사회: "SOCIAL",
  과학: "SCIENCE",
  예체능: "ARTS",
  정보: "INFORMATICS",
  기술가정: "TECHNOLOGY_HOME",
  제2외국어: "SECOND_LANGUAGE",
  진로: "CAREER",
};

function subjectCodeFor(title: string) {
  const compact = title.replace(/[\s·]/g, "").replace(/과$/, "");
  const match = Object.entries(subjectCodeMap).find(([label]) => compact.includes(label));
  return match?.[1] ?? `OTHER_${compact || "SUBJECT"}`;
}

const statusLabel: Record<CurriculumVersionStatus, string> = {
  DRAFT: "검토 중",
  PUBLISHED: "학생 공개",
  ARCHIVED: "이전 버전",
};

const generationPhases = [
  { title: "공식 출처 확인", note: "출판사 교과서와 국가 교육과정을 찾고 있습니다" },
  { title: "목차·성취기준 정리", note: "확인한 자료로 단원 구성과 학습 범위를 맞추고 있습니다" },
  { title: "단원 학습자료 작성", note: "단원별 설명, 예시와 추천 질문을 만들고 있습니다" },
] as const;

function generationPhaseIndex(elapsedSeconds: number) {
  return elapsedSeconds < 25 ? 0 : elapsedSeconds < 70 ? 1 : 2;
}

function generationEstimatedPercent(elapsedSeconds: number) {
  return Math.min(92, 12 + Math.round(elapsedSeconds * 0.8));
}

function elapsedTimeLabel(elapsedSeconds: number) {
  return `${Math.floor(elapsedSeconds / 60)}분 ${String(elapsedSeconds % 60).padStart(2, "0")}초`;
}

function stateError(data: ApiResponse, fallback: string) {
  return data.error?.message ?? fallback;
}

export function AdminCurriculum() {
  const [state, setState] = useState<CurriculumManagementState>({
    activeVersionId: null,
    selectedVersion: null,
    versions: [],
  });
  const [items, setItems] = useState<CurriculumOffering[]>([]);
  const [savedItems, setSavedItems] = useState<CurriculumOffering[]>([]);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [grade, setGrade] = useState<1 | 2 | 3>(1);
  const [subjectCode, setSubjectCode] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [onlyNeedsContent, setOnlyNeedsContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creatingReviewDraft, setCreatingReviewDraft] = useState(false);
  const [generatingOfferingId, setGeneratingOfferingId] = useState<string | null>(null);
  const [generationTarget, setGenerationTarget] = useState<CurriculumOffering | null>(null);
  const [batchGenerationOpen, setBatchGenerationOpen] = useState(false);
  const [batchGenerationItems, setBatchGenerationItems] = useState<CurriculumOffering[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchGenerationProgress | null>(null);
  const [contentPublishing, setContentPublishing] = useState(false);
  const [contentDetail, setContentDetail] = useState<GeneratedContentDetail | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function applyState(
    next: CurriculumManagementState,
    preferredSelection?: { grade: 1 | 2 | 3; subjectCode: string },
  ) {
    setState(next);
    const nextItems = next.selectedVersion?.items ?? [];
    setItems(nextItems);
    setSavedItems(nextItems);
    if (next.selectedVersion) setAcademicYear(next.selectedVersion.academicYear);
    const selected = preferredSelection
      ? nextItems.find((item) => (
        item.grade === preferredSelection.grade
        && item.subjectCode === preferredSelection.subjectCode
      ))
      : null;
    const fallback = selected ?? nextItems[0];
    if (fallback) {
      setGrade(fallback.grade);
      setSubjectCode(fallback.subjectCode);
    }
  }

  useEffect(() => {
    fetch("/api/admin/curriculum")
      .then(async (response) => {
        const data = await response.json() as ApiResponse;
        if (!response.ok) throw new Error(stateError(data, "교육과정 정보를 불러오지 못했습니다."));
        applyState(data);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "교육과정 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const selectedVersion = state.selectedVersion;
  const editable = selectedVersion?.status === "DRAFT";
  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems);
  const selectedItems = useMemo(() => items.filter((item) => item.enabled), [items]);
  const batchGenerationCandidates = useMemo(
    () => selectedItems.filter((item) => !item.contentCourseCode && !item.generatedContent),
    [selectedItems],
  );
  const contentReadyCount = selectedItems.filter((item) => item.contentCourseCode).length;
  const contentDraftCount = selectedItems.filter((item) => !item.contentCourseCode && item.generatedContent).length;
  const contentRemainingCount = selectedItems.filter((item) => !item.contentCourseCode && !item.generatedContent).length;
  const reviewCount = selectedItems.filter((item) => item.reviewRequired).length;
  const subjects = useMemo(() => {
    const available = new Map<string, string>();
    for (const item of items.filter((entry) => entry.grade === grade)) {
      available.set(item.subjectCode, item.subjectTitle);
    }
    return [...available].map(([code, title]) => ({ code, title }));
  }, [grade, items]);
  const visibleItems = useMemo(() => items.filter((item) => (
    item.grade === grade
    && (!subjectCode || item.subjectCode === subjectCode)
    && (!onlySelected || item.enabled)
    && (!onlyNeedsContent || (item.enabled && !item.contentCourseCode))
  )), [grade, items, onlyNeedsContent, onlySelected, subjectCode]);

  function clearNotice() {
    setMessage("");
    setError("");
  }

  function updateItem(rowKey: string, patch: Partial<CurriculumOffering>) {
    clearNotice();
    setItems((current) => current.map((item) => item.rowKey === rowKey ? { ...item, ...patch } : item));
  }

  function changeGrade(nextGrade: 1 | 2 | 3) {
    setGrade(nextGrade);
    const first = items.find((item) => item.grade === nextGrade);
    setSubjectCode(first?.subjectCode ?? "");
  }

  function focusContentWork() {
    const next = selectedItems.find((item) => !item.contentCourseCode);
    if (!next) return;
    setGrade(next.grade);
    setSubjectCode(next.subjectCode);
    setOnlySelected(true);
    setOnlyNeedsContent(true);
    document.getElementById("curriculum-course-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadVersion(versionId: string) {
    setLoading(true);
    clearNotice();
    try {
      const response = await fetch(`/api/admin/curriculum?versionId=${encodeURIComponent(versionId)}`);
      const data = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(stateError(data, "교육과정 버전을 불러오지 못했습니다."));
      applyState(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "교육과정 버전을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function chooseVersion(versionId: string) {
    if (!dirty) {
      void loadVersion(versionId);
      return;
    }
    setConfirmation({
      tone: "warning",
      icon: "leave",
      eyebrow: "저장하지 않은 변경사항",
      title: "다른 버전으로 이동할까요?",
      description: "현재 검토 중인 수정 내용은 저장되지 않고 사라집니다.",
      note: "변경사항을 유지하려면 취소한 뒤 먼저 ‘초안 저장’을 눌러 주세요.",
      confirmLabel: "저장하지 않고 이동",
      onConfirm: () => void loadVersion(versionId),
    });
  }

  async function refreshVersion(
    versionId: string,
    preferredSelection = { grade, subjectCode },
  ) {
    const response = await fetch(`/api/admin/curriculum?versionId=${encodeURIComponent(versionId)}`);
    const data = await response.json() as ApiResponse;
    if (!response.ok) throw new Error(stateError(data, "교육과정 정보를 새로 불러오지 못했습니다."));
    applyState(data, preferredSelection);
  }

  async function upload(file: File) {
    if (!file.name.toLocaleLowerCase("en-US").endsWith(".pdf")) {
      setError("PDF 파일만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    clearNotice();
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("academicYear", String(academicYear));
      const response = await fetch("/api/admin/curriculum/import", { method: "POST", body: form });
      const data = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(stateError(data, "PDF를 분석하지 못했습니다."));
      applyState(data);
      setMessage(`${data.selectedVersion?.items.length ?? 0}개 과목을 찾았습니다. 내용을 확인한 뒤 저장해 주세요.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "PDF를 분석하지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function saveDraft(showMessage = true) {
    if (!selectedVersion || !editable) return false;
    setSaving(true);
    clearNotice();
    try {
      const response = await fetch("/api/admin/curriculum", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: selectedVersion.id, items }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(stateError(data, "교육과정 초안을 저장하지 못했습니다."));
      applyState(data, { grade, subjectCode });
      if (showMessage) setMessage("검토한 교육과정 초안을 저장했습니다.");
      return data;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "교육과정 초안을 저장하지 못했습니다.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function performPublish() {
    if (!selectedVersion || !editable) return;
    setPublishing(true);
    clearNotice();
    try {
      if (dirty && !(await saveDraft(false))) return;
      const response = await fetch(
        `/api/admin/curriculum/versions/${encodeURIComponent(selectedVersion.id)}/publish`,
        { method: "POST" },
      );
      const data = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(stateError(data, "교육과정을 공개하지 못했습니다."));
      applyState(data, { grade, subjectCode });
      setMessage("교육과정을 공개했습니다. 학생의 다음 학습 화면부터 반영됩니다.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "교육과정을 공개하지 못했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  function publish() {
    if (!selectedVersion || !editable) return;
    setConfirmation({
      tone: "brand",
      icon: "publish",
      eyebrow: "학생 화면 공개",
      title: `${selectedVersion.academicYear}학년도 교육과정을 공개할까요?`,
      description: "선택한 과목과 연결된 학습 콘텐츠가 학생의 다음 학습 화면부터 적용됩니다.",
      note: "현재 공개 중인 교육과정은 이전 버전으로 안전하게 보관됩니다.",
      confirmLabel: "교육과정 공개",
      onConfirm: () => void performPublish(),
    });
  }

  async function performCreateReviewDraft() {
    if (!selectedVersion || editable) return;
    setCreatingReviewDraft(true);
    clearNotice();
    try {
      const response = await fetch(
        `/api/admin/curriculum/versions/${encodeURIComponent(selectedVersion.id)}/review-draft`,
        { method: "POST" },
      );
      const data = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(stateError(data, "수정용 검토본을 만들지 못했습니다."));
      applyState(data, { grade, subjectCode });
      setOnlySelected(false);
      setOnlyNeedsContent(false);
      setMessage("수정용 검토본을 열었습니다. 과목을 선택하거나 해제한 뒤 콘텐츠를 준비해 주세요.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "수정용 검토본을 만들지 못했습니다.");
    } finally {
      setCreatingReviewDraft(false);
    }
  }

  function createReviewDraft() {
    if (!selectedVersion || editable) return;
    setConfirmation({
      tone: "brand",
      icon: "draft",
      eyebrow: "새 검토본 만들기",
      title: "교육과정 수정을 시작할까요?",
      description: "현재 버전을 복사해 과목 선택과 콘텐츠를 수정할 수 있는 새 검토본을 만듭니다.",
      note: "지금 학생에게 공개된 교육과정은 새 검토본을 공개하기 전까지 그대로 유지됩니다.",
      confirmLabel: "검토본 만들기",
      onConfirm: () => void performCreateReviewDraft(),
    });
  }

  async function openGeneratedContent(offeringId: string) {
    clearNotice();
    try {
      const response = await fetch(`/api/admin/curriculum/content/${encodeURIComponent(offeringId)}`);
      const data = await response.json() as GeneratedContentDetail;
      if (!response.ok) throw new Error(data.error?.message ?? "생성된 콘텐츠를 불러오지 못했습니다.");
      setContentDetail(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "생성된 콘텐츠를 불러오지 못했습니다.");
    }
  }

  async function generateContent(item: CurriculumOffering, refreshSources = false) {
    if (!item.id || !selectedVersion || !editable) return;
    setGeneratingOfferingId(item.id);
    clearNotice();
    try {
      if (dirty && !(await saveDraft(false))) return;
      const response = await fetch(
        `/api/admin/curriculum/content/${encodeURIComponent(item.id)}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshSources }),
        },
      );
      const data = await response.json() as GeneratedContentDetail;
      if (!response.ok) throw new Error(data.error?.message ?? "AI 콘텐츠를 만들지 못했습니다.");
      setContentDetail(data);
      await refreshVersion(selectedVersion.id, {
        grade: item.grade,
        subjectCode: item.subjectCode,
      });
      setMessage(`${data.units.length}개 단원 초안을 만들었습니다. 내용을 확인한 뒤 콘텐츠를 공개해 주세요.`);
      setGenerationTarget(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 콘텐츠를 만들지 못했습니다.");
      setGenerationTarget(null);
    } finally {
      setGeneratingOfferingId(null);
    }
  }

  async function generateSelectedContent() {
    if (!selectedVersion || !editable || batchGenerating) return;
    setBatchGenerating(true);
    clearNotice();
    setContentDetail(null);

    try {
      let sourceItems = items;
      if (dirty) {
        const savedState = await saveDraft(false);
        if (!savedState) return;
        sourceItems = savedState.selectedVersion?.items ?? [];
      }

      const targets = sourceItems.filter((item) => (
        item.enabled
        && item.id
        && !item.contentCourseCode
        && !item.generatedContent
      ));
      if (targets.length === 0) {
        setBatchGenerationOpen(false);
        setBatchGenerationItems([]);
        setBatchProgress(null);
        setMessage("일괄 생성할 과목이 없습니다. 선택 과목의 콘텐츠 상태를 확인해 주세요.");
        return;
      }

      let successCount = 0;
      const failures: BatchGenerationFailure[] = [];
      setBatchProgress({
        completed: 0,
        total: targets.length,
        currentTitle: targets[0].courseTitle,
        currentGrade: targets[0].grade,
        currentPublisher: targets[0].publisherName,
        successCount: 0,
        failures: [],
      });

      for (const [index, item] of targets.entries()) {
        setGeneratingOfferingId(item.id!);
        setBatchProgress({
          completed: index,
          total: targets.length,
          currentTitle: item.courseTitle,
          currentGrade: item.grade,
          currentPublisher: item.publisherName,
          successCount,
          failures: [...failures],
        });

        try {
          const response = await fetch(
            `/api/admin/curriculum/content/${encodeURIComponent(item.id!)}/generate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshSources: false }),
            },
          );
          const data = await response.json() as GeneratedContentDetail;
          if (!response.ok) throw new Error(data.error?.message ?? "AI 콘텐츠를 만들지 못했습니다.");
          successCount += 1;
        } catch (reason) {
          failures.push({
            courseTitle: item.courseTitle,
            message: reason instanceof Error ? reason.message : "AI 콘텐츠를 만들지 못했습니다.",
          });
        }

        setBatchProgress({
          completed: index + 1,
          total: targets.length,
          currentTitle: index + 1 < targets.length ? targets[index + 1].courseTitle : "",
          currentGrade: index + 1 < targets.length ? targets[index + 1].grade : null,
          currentPublisher: index + 1 < targets.length ? targets[index + 1].publisherName : "",
          successCount,
          failures: [...failures],
        });
      }

      await refreshVersion(selectedVersion.id, { grade, subjectCode });
      if (failures.length === 0) {
        setMessage(`선택한 ${successCount}개 과목의 단원 학습자료 초안을 모두 만들었습니다.`);
      } else {
        setError(`${successCount}개 과목 생성 완료 · ${failures.length}개 과목 생성 실패`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "일괄 생성을 마치지 못했습니다.");
    } finally {
      setGeneratingOfferingId(null);
      setBatchGenerating(false);
    }
  }

  function regenerateContent() {
    if (!contentDetail || !editable) return;
    const item = items.find((entry) => entry.id === contentDetail.offeringId);
    if (!item) {
      setError("재생성할 과목 정보를 찾지 못했습니다.");
      return;
    }
    setConfirmation({
      tone: "warning",
      icon: "replace",
      eyebrow: "AI 콘텐츠 재생성",
      title: `‘${contentDetail.courseTitle}’ 초안을 교체할까요?`,
      description: "공식 출처를 웹에서 다시 검색한 뒤 전체 단원 콘텐츠를 새로 생성합니다.",
      note: "현재 목차와 작성된 초안은 새 결과로 교체되며 되돌릴 수 없습니다.",
      confirmLabel: "다시 검색하고 재생성",
      onConfirm: () => void generateContent(item, true),
    });
  }

  async function performPublishContent() {
    if (!contentDetail || !selectedVersion) return;
    setContentPublishing(true);
    clearNotice();
    try {
      const response = await fetch(
        `/api/admin/curriculum/content/${encodeURIComponent(contentDetail.offeringId)}/publish`,
        { method: "POST" },
      );
      const data = await response.json() as GeneratedContentDetail;
      if (!response.ok) throw new Error(data.error?.message ?? "AI 콘텐츠를 공개하지 못했습니다.");
      setContentDetail(data);
      const item = items.find((entry) => entry.id === contentDetail.offeringId);
      await refreshVersion(selectedVersion.id, item ? {
        grade: item.grade,
        subjectCode: item.subjectCode,
      } : undefined);
      setMessage("AI 콘텐츠를 공개하고 학교 과목에 연결했습니다.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 콘텐츠를 공개하지 못했습니다.");
    } finally {
      setContentPublishing(false);
    }
  }

  function publishContent() {
    if (!contentDetail || !selectedVersion) return;
    setConfirmation({
      tone: "brand",
      icon: "publish",
      eyebrow: "AI 콘텐츠 공개",
      title: `‘${contentDetail.courseTitle}’ 콘텐츠를 공개할까요?`,
      description: "검토한 AI 콘텐츠를 이 학교 과목에 연결하고 공개 상태로 전환합니다.",
      note: "학생 화면에는 교육과정까지 최종 공개한 뒤 나타납니다.",
      confirmLabel: "콘텐츠 공개 및 연결",
      onConfirm: () => void performPublishContent(),
    });
  }

  function addCourse() {
    const subjectTitle = subjects.find((subject) => subject.code === subjectCode)?.title ?? "기타";
    const next: CurriculumOffering = {
      rowKey: crypto.randomUUID(),
      grade,
      subjectCode: subjectCode || "OTHER_SUBJECT",
      subjectTitle,
      courseTitle: "",
      publisherName: "",
      textbookTitle: null,
      contentCourseCode: null,
      enabled: true,
      confidence: 0,
      reviewRequired: true,
      displayOrder: items.length,
    };
    setItems((current) => [...current, next]);
  }

  return (
    <>
      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-7">
        <div>
          <p className="flex items-center gap-2 text-[.8rem] font-bold text-brand"><School size={15} /> 학교 교육과정 관리</p>
          <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.045em]">연도별 교과·과목 등록</h1>
          <p className="mt-2 max-w-3xl text-[.88rem] leading-6 text-ink-3">학교 선정 자료를 PDF로 불러와 검토한 뒤 학생 학습 화면에 공개할 수 있어요.</p>
        </div>
        {state.activeVersionId && (
          <div className="rounded-[12px] border border-ok/20 bg-[var(--ok-page)] px-4 py-3">
            <p className="text-[.68rem] font-bold text-ok">현재 학생 공개</p>
            <p className="mt-1 text-[.82rem] font-extrabold text-ink">{state.versions.find((version) => version.id === state.activeVersionId)?.title}</p>
          </div>
        )}
      </header>

      <section className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="rounded-[16px] border border-line bg-surface p-5 shadow-[var(--lift-1)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-brand-soft text-brand"><FileUp size={20} /></span>
            <div>
              <h2 className="text-[.96rem] font-extrabold">새 교육과정 자료 가져오기</h2>
              <p className="mt-1 text-[.76rem] leading-5 text-ink-4">텍스트를 선택할 수 있는 PDF · 최대 10MB · 30페이지 이하</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-11 items-center gap-2 rounded-[11px] border border-line bg-surface-2 px-3 text-[.78rem] font-bold text-ink-3">
              <span>학년도</span>
              <input type="number" min={2020} max={2100} value={academicYear} onChange={(event) => setAcademicYear(Number(event.target.value))} className="w-24 bg-transparent text-right font-semibold text-ink outline-none" />
            </label>
            <label className={cn("flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-dashed border-brand/35 bg-brand-page px-4 text-[.8rem] font-bold text-brand-dark transition hover:border-brand hover:bg-brand-soft", uploading && "pointer-events-none opacity-60")}>
              {uploading ? <LoaderCircle size={17} className="animate-spin" /> : <FileUp size={17} />}
              {uploading ? "PDF 표를 분석하고 있어요" : "PDF 선택하고 분석하기"}
              <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }} />
            </label>
          </div>
        </div>

        <div className="rounded-[16px] border border-line bg-surface p-5 shadow-[var(--lift-1)]">
          <p className="text-[.72rem] font-bold text-ink-4">교육과정 버전</p>
          <div className="mt-3 max-h-32 space-y-1 overflow-y-auto">
            {state.versions.length ? state.versions.map((version) => (
              <button key={version.id} type="button" onClick={() => void chooseVersion(version.id)} className={cn("flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left transition", selectedVersion?.id === version.id ? "bg-brand-soft text-brand-dark" : "hover:bg-surface-2")}>
                {version.status === "PUBLISHED" ? <CheckCircle2 size={14} className="text-ok" /> : version.status === "ARCHIVED" ? <Archive size={14} className="text-ink-5" /> : <FileCheck2 size={14} className="text-brand" />}
                <span className="min-w-0 flex-1 truncate text-[.74rem] font-bold">{version.academicYear}학년도 · {version.revision}차</span>
                <span className="text-[.62rem] text-ink-5">{statusLabel[version.status]}</span>
                <ChevronRight size={13} />
              </button>
            )) : <p className="py-5 text-center text-[.74rem] text-ink-5">등록된 버전이 없습니다.</p>}
          </div>
        </div>
      </section>

      {selectedVersion && (
        <>
          <section className="mt-5 grid divide-y divide-line rounded-[16px] border border-line bg-surface shadow-[var(--lift-1)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <Summary label="선택 과목" value={selectedItems.length} note={`전체 ${items.length}개 중`} />
            <Summary label="학생 화면 연결" value={contentReadyCount} note="학습 콘텐츠 준비 완료" />
            <Summary label="확인 필요" value={reviewCount} note="공개 전 검토할 항목" warning={reviewCount > 0} />
            <Summary label="현재 상태" value={statusLabel[selectedVersion.status]} note={selectedVersion.sourceFileName ?? "직접 등록"} text />
          </section>

          <section className="mt-5 overflow-hidden rounded-[16px] border border-brand/20 bg-[linear-gradient(135deg,var(--surface)_0%,var(--brand-page)_100%)] shadow-[var(--lift-2)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand/10 px-5 py-5 sm:px-7">
              <div>
                <p className="flex items-center gap-1.5 text-[.72rem] font-bold text-brand"><WandSparkles size={14} /> AI 학습 콘텐츠 준비</p>
                <h2 className="mt-1.5 text-lg font-extrabold tracking-[-0.025em]">과목을 선택한 뒤, AI 초안을 검토하고 공개하세요</h2>
                <p className="mt-1 max-w-3xl text-[.76rem] leading-5 text-ink-4">AI가 과목별 단원 목차, 핵심 개념, 수식·예시, 선수 개념, 추천 질문과 튜터 지침을 초안으로 만듭니다. 관리자가 내용을 확인하고 교육과정을 최종 공개하기 전까지 학생에게는 보이지 않습니다.</p>
              </div>
              {editable ? (
                selectedItems.length === 0 ? (
                  <span className="rounded-[9px] bg-surface px-3 py-2 text-[.7rem] font-bold text-ink-4">운영 과목을 먼저 선택해 주세요</span>
                ) : batchGenerationCandidates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={focusContentWork}>개별 작업 보기</Button>
                    <Button
                      onClick={() => {
                        setBatchGenerationItems(batchGenerationCandidates);
                        setBatchProgress(null);
                        setBatchGenerationOpen(true);
                      }}
                      disabled={batchGenerating || generatingOfferingId !== null}
                    >
                      <WandSparkles size={15} />선택 과목 {batchGenerationCandidates.length}개 일괄 생성
                    </Button>
                  </div>
                ) : contentReadyCount < selectedItems.length ? (
                  <Button onClick={focusContentWork}><FileCheck2 size={15} />생성 초안 검토하기</Button>
                ) : (
                  <span className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] bg-[var(--ok-page)] px-3.5 text-[.72rem] font-bold text-ok"><CheckCircle2 size={15} />최종 공개 준비 완료</span>
                )
              ) : <Button variant="secondary" onClick={() => void createReviewDraft()} disabled={creatingReviewDraft}>{creatingReviewDraft ? <LoaderCircle size={15} className="animate-spin" /> : <FileCheck2 size={15} />}{creatingReviewDraft ? "검토본 만드는 중" : "수정용 검토본 만들기"}</Button>}
            </div>
            <div className="grid divide-y divide-brand/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <WorkflowStep number="1" title="운영 과목 선택" value={`${selectedItems.length}개`} note="학생에게 제공할 과목" complete={selectedItems.length > 0} />
              <WorkflowStep number="2" title="AI 생성·관리자 검토" value={`${contentReadyCount}/${selectedItems.length}개`} note={contentDraftCount > 0 ? `검토 대기 ${contentDraftCount}개 · 생성 전 ${contentRemainingCount}개` : `생성 전 ${contentRemainingCount}개`} complete={selectedItems.length > 0 && contentReadyCount === selectedItems.length} active={editable && contentReadyCount < selectedItems.length} />
              <WorkflowStep number="3" title="학생 화면에 공개" value={selectedVersion.status === "PUBLISHED" ? "공개 중" : "대기"} note="모든 콘텐츠 검토 후 가능" complete={selectedVersion.status === "PUBLISHED"} />
            </div>
          </section>

          <section id="curriculum-course-list" className="mt-5 scroll-mt-5 overflow-hidden rounded-[16px] border border-line bg-surface shadow-[var(--lift-2)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold">{selectedVersion.title}</h2>
                  <span className={cn("rounded-full px-2 py-1 text-[.64rem] font-bold", selectedVersion.status === "PUBLISHED" ? "bg-[var(--ok-page)] text-ok" : selectedVersion.status === "DRAFT" ? "bg-brand-soft text-brand-dark" : "bg-surface-3 text-ink-4")}>{statusLabel[selectedVersion.status]}</span>
                </div>
                <p className="mt-1 text-[.76rem] text-ink-4">{editable ? "왼쪽 체크 버튼으로 실제 운영할 과목을 선택하거나 해제하세요." : "공개 버전은 학생에게 서비스 중이라 직접 수정하지 않습니다. 수정용 검토본을 만들면 과목 선택을 바꿀 수 있습니다."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editable && <button type="button" onClick={() => setOnlyNeedsContent((value) => !value)} className={cn("min-h-9 rounded-[9px] border px-3 text-[.72rem] font-bold transition", onlyNeedsContent ? "border-brand/25 bg-brand-soft text-brand-dark" : "border-line text-ink-3 hover:bg-surface-2")}>{onlyNeedsContent ? "모든 준비 상태 보기" : "콘텐츠 작업만 보기"}</button>}
                <button type="button" onClick={() => setOnlySelected((value) => !value)} className={cn("min-h-9 rounded-[9px] border px-3 text-[.72rem] font-bold transition", onlySelected ? "border-brand/25 bg-brand-soft text-brand-dark" : "border-line text-ink-3 hover:bg-surface-2")}>{onlySelected ? "전체 과목 보기" : "선택 과목만 보기"}</button>
              </div>
            </div>

            <div className="grid min-h-[32rem] lg:grid-cols-[13rem_1fr]">
              <aside className="border-b border-line bg-surface-2 p-4 lg:border-b-0 lg:border-r">
                <div className="grid grid-cols-3 gap-1 rounded-[11px] border border-line bg-surface-3 p-1">
                  {([1, 2, 3] as const).map((item) => <button key={item} type="button" onClick={() => changeGrade(item)} className={cn("min-h-9 rounded-[8px] text-[.76rem] font-bold transition", grade === item ? "bg-surface text-ink shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>{item}학년</button>)}
                </div>
                <nav className="mt-4 grid grid-cols-3 gap-1.5 lg:grid-cols-1">
                  {subjects.map((subject) => {
                    const count = items.filter((item) => item.grade === grade && item.subjectCode === subject.code && item.enabled).length;
                    return <button key={subject.code} type="button" onClick={() => setSubjectCode(subject.code)} className={cn("flex min-h-10 items-center justify-between rounded-[9px] px-3 text-[.77rem] font-bold transition", subjectCode === subject.code ? "bg-brand-soft text-brand-dark" : "text-ink-3 hover:bg-surface hover:text-ink")}><span>{subject.title}</span><span className="figure text-[.66rem] text-ink-5">{count}</span></button>;
                  })}
                </nav>
              </aside>

              <div className="min-w-0 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[.94rem] font-extrabold">{grade}학년 · {subjects.find((subject) => subject.code === subjectCode)?.title ?? "교과"}</h3>
                    <p className="mt-1 text-[.73rem] text-ink-4">운영할 과목을 고르고, 필요한 정보만 짧게 확인하거나 수정하세요.</p>
                  </div>
                  {editable && <Button size="sm" variant="secondary" onClick={addCourse}><Plus size={15} /> 과목 직접 추가</Button>}
                </div>

                {loading ? <div className="grid min-h-72 place-items-center"><LoaderCircle size={24} className="animate-spin text-brand" /></div> : visibleItems.length ? (
                  <div className="mt-5 space-y-2">
                    {visibleItems.map((item) => (
                      <article key={item.rowKey} className={cn("grid gap-x-3 gap-y-2.5 rounded-[12px] border p-3.5 transition sm:grid-cols-[1.25rem_4.5rem_minmax(7.5rem,1fr)_minmax(10rem,1.5fr)] xl:grid-cols-[1.25rem_4.5rem_7.5rem_minmax(10rem,14rem)_8.5rem_minmax(12rem,1fr)]", item.enabled ? "border-brand/20 bg-brand-page" : "border-line bg-surface-2 opacity-70")}>
                        <button type="button" disabled={!editable} onClick={() => updateItem(item.rowKey, { enabled: !item.enabled })} aria-label={item.enabled ? "과목 선택 해제" : "과목 선택"} title={!editable ? "수정용 검토본에서 선택을 변경할 수 있습니다" : item.enabled ? "운영 과목에서 제외" : "운영 과목으로 선택"} className={cn("mt-2 grid size-5 place-items-center rounded-[6px] border transition", item.enabled ? "border-brand bg-brand text-white" : "border-[var(--line-2)] bg-surface", !editable && "cursor-not-allowed opacity-50")}>{item.enabled && <Check size={12} strokeWidth={2.6} />}</button>
                        <label className="min-w-0">
                          <span className="mb-1 block text-[.66rem] font-bold text-ink-5">학년</span>
                          <select disabled={!editable} value={item.grade} onChange={(event) => updateItem(item.rowKey, { grade: Number(event.target.value) as 1 | 2 | 3, reviewRequired: true })} className="h-9 w-full rounded-[8px] border border-line bg-surface px-2 text-[.76rem] font-bold text-ink outline-none focus:border-brand disabled:bg-transparent">
                            <option value={1}>1학년</option><option value={2}>2학년</option><option value={3}>3학년</option>
                          </select>
                        </label>
                        <label className="min-w-0">
                          <span className="mb-1 block text-[.66rem] font-bold text-ink-5">교과</span>
                          <input disabled={!editable} value={item.subjectTitle} onChange={(event) => updateItem(item.rowKey, { subjectTitle: event.target.value, reviewRequired: true })} onBlur={(event) => updateItem(item.rowKey, { subjectCode: subjectCodeFor(event.target.value) })} className="h-9 w-full rounded-[8px] border border-line bg-surface px-2.5 text-[.78rem] font-bold text-ink outline-none transition focus:border-brand disabled:bg-transparent" />
                        </label>
                        <label className="min-w-0">
                          <span className="mb-1 block text-[.66rem] font-bold text-ink-5">과목명</span>
                          <input disabled={!editable} value={item.courseTitle} onChange={(event) => updateItem(item.rowKey, { courseTitle: event.target.value, reviewRequired: true })} className="h-9 w-full rounded-[8px] border border-line bg-surface px-2.5 text-[.8rem] font-bold text-ink outline-none transition focus:border-brand disabled:bg-transparent" />
                        </label>
                        <label className="min-w-0 sm:col-start-2 xl:col-start-auto">
                          <span className="mb-1 block text-[.66rem] font-bold text-ink-5">출판사</span>
                          <input disabled={!editable} value={item.publisherName} onChange={(event) => updateItem(item.rowKey, { publisherName: event.target.value, reviewRequired: true })} className="h-9 w-full rounded-[8px] border border-line bg-surface px-2.5 text-[.78rem] text-ink-3 outline-none transition focus:border-brand disabled:bg-transparent" />
                        </label>
                        <label className="min-w-0 sm:col-start-3 sm:col-end-5 xl:col-start-auto xl:col-end-auto">
                          <span className="mb-1 block text-[.66rem] font-bold text-ink-5">교과서명 · 대표 저자 <span className="font-medium text-ink-5">(선택)</span></span>
                          <input disabled={!editable} value={item.textbookTitle ?? ""} onChange={(event) => updateItem(item.rowKey, { textbookTitle: event.target.value || null, reviewRequired: true })} placeholder="예: 일반 선택 지리 부도 (정성훈)" className="h-9 w-full rounded-[8px] border border-line bg-surface px-2.5 text-[.75rem] text-ink-3 outline-none transition placeholder:text-ink-5 focus:border-brand disabled:bg-transparent" />
                        </label>
                        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:col-span-4 xl:col-start-2 xl:col-end-7">
                          {item.reviewRequired && <span className="mb-2 inline-flex items-center gap-1 whitespace-nowrap text-[.66rem] font-bold text-warn"><TriangleAlert size={12} />확인 필요</span>}
                          {item.contentCourseCode && item.generatedContent && item.id ? (
                            <button type="button" onClick={() => void openGeneratedContent(item.id!)} className="mb-1 inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-[8px] px-2 text-[.68rem] font-bold text-ok hover:bg-[var(--ok-page)]"><CheckCircle2 size={13} />생성 콘텐츠 보기</button>
                          ) : item.contentCourseCode ? (
                            <span className="mb-1 inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-[8px] px-2 text-[.68rem] font-bold text-ok"><CheckCircle2 size={13} />기존 학습 콘텐츠 연결됨</span>
                          ) : item.generatedContent && item.id ? (
                            <button type="button" onClick={() => void openGeneratedContent(item.id!)} className="mb-1 inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-[8px] bg-brand-soft px-2.5 text-[.68rem] font-bold text-brand-dark hover:bg-brand-page"><WandSparkles size={13} />생성 초안 검토</button>
                          ) : editable && item.enabled && item.id ? (
                            <button type="button" disabled={generatingOfferingId !== null} onClick={() => setGenerationTarget(item)} title="단원 목차, 핵심 개념, 수식·예시, 선수 개념, 추천 질문과 튜터 지침을 생성합니다" className="mb-1 inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-[8px] border border-brand/20 bg-surface px-2.5 text-[.68rem] font-bold text-brand transition hover:bg-brand-soft disabled:opacity-45">{generatingOfferingId === item.id ? <LoaderCircle size={13} className="animate-spin" /> : <WandSparkles size={13} />}{generatingOfferingId === item.id ? "단원 콘텐츠 생성 중" : "단원 학습자료 생성"}</button>
                          ) : <span className="mb-2 text-[.66rem] font-bold text-ink-5">{item.enabled ? "콘텐츠 준비 전" : "미선택 과목"}</span>}
                          {editable && item.reviewRequired && <button type="button" onClick={() => updateItem(item.rowKey, { reviewRequired: false, confidence: 100 })} className="mb-1 min-h-8 whitespace-nowrap rounded-[8px] px-2 text-[.68rem] font-bold text-brand hover:bg-brand-soft">검토 완료</button>}
                          {editable && <button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.rowKey !== item.rowKey))} className="mb-1 grid size-8 place-items-center rounded-[8px] text-ink-5 hover:bg-[var(--danger-page)] hover:text-danger" aria-label="과목 삭제"><Trash2 size={14} /></button>}
                        </div>
                      </article>
                    ))}
                    {contentDetail && visibleItems.some((item) => item.id === contentDetail.offeringId) && (
                      <GeneratedContentReview
                        content={contentDetail}
                        publishing={contentPublishing}
                        regenerating={generatingOfferingId === contentDetail.offeringId}
                        canRegenerate={editable}
                        onClose={() => setContentDetail(null)}
                        onPublish={() => void publishContent()}
                        onRegenerate={() => void regenerateContent()}
                      />
                    )}
                  </div>
                ) : <div className="mt-5 rounded-[12px] border border-dashed border-line py-16 text-center text-[.8rem] text-ink-4">현재 조건에 표시할 과목이 없습니다.</div>}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-surface-2 px-5 py-4 sm:px-7">
              <div className="min-h-5">{error ? <p role="alert" className="flex items-center gap-1.5 text-[.76rem] font-semibold text-danger"><TriangleAlert size={14} />{error}</p> : message ? <p role="status" className="flex items-center gap-1.5 text-[.76rem] font-semibold text-ok"><CheckCircle2 size={14} />{message}</p> : editable ? <p className="text-[.74rem] text-ink-4">{contentReadyCount < selectedItems.length ? `선택 과목 ${selectedItems.length - contentReadyCount}개의 콘텐츠 생성·검토가 남았습니다.` : "모든 선택 과목의 콘텐츠가 준비되었습니다."}</p> : null}</div>
              {editable && <div className="flex gap-2">
                <Button variant="secondary" onClick={() => void saveDraft()} disabled={saving || publishing || !dirty}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <BookOpenCheck size={16} />}초안 저장</Button>
                <Button onClick={() => void publish()} disabled={saving || publishing || reviewCount > 0 || selectedItems.length === 0 || contentReadyCount < selectedItems.length}>{publishing ? <LoaderCircle size={16} className="animate-spin" /> : <Rocket size={16} />}{publishing ? "공개 중" : "학생 화면에 공개"}</Button>
              </div>}
            </div>
          </section>
        </>
      )}
      </div>
      {generationTarget && (
        <GenerationConfirmDialog
          item={generationTarget}
          running={generatingOfferingId === generationTarget.id}
          onClose={() => {
            if (generatingOfferingId === generationTarget.id) return;
            setGenerationTarget(null);
          }}
          onConfirm={() => void generateContent(generationTarget)}
        />
      )}
      {batchGenerationOpen && (
        <BatchGenerationDialog
          items={batchGenerationItems}
          running={batchGenerating}
          progress={batchProgress}
          onClose={() => {
            if (batchGenerating) return;
            setBatchGenerationOpen(false);
            setBatchGenerationItems([]);
            setBatchProgress(null);
          }}
          onConfirm={() => void generateSelectedContent()}
        />
      )}
      {confirmation && (
        <ConfirmationDialog
          config={confirmation}
          onClose={() => setConfirmation(null)}
        />
      )}
    </>
  );
}

function ConfirmationDialog({ config, onClose }: {
  config: ConfirmationDialogState;
  onClose: () => void;
}) {
  const Icon = config.icon === "publish"
    ? Rocket
    : config.icon === "draft"
      ? FileCheck2
      : config.icon === "replace"
        ? WandSparkles
        : TriangleAlert;
  const warning = config.tone === "warning";

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  function handleConfirm() {
    const action = config.onConfirm;
    onClose();
    action();
  }

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-[rgba(31,24,52,.38)] p-4 backdrop-blur-[4px]"
      onMouseDown={onClose}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[30rem] overflow-hidden rounded-[22px] border border-white/80 bg-surface shadow-[0_28px_80px_rgba(43,31,79,.3)]"
      >
        <div className={cn(
          "flex items-start justify-between gap-4 border-b px-6 py-5",
          warning
            ? "border-warn/10 bg-[linear-gradient(135deg,var(--warn-page),var(--surface))]"
            : "border-brand/10 bg-[linear-gradient(135deg,var(--brand-page),var(--surface))]",
        )}>
          <div className="flex min-w-0 items-start gap-3.5">
            <span className={cn(
              "grid size-11 shrink-0 place-items-center rounded-[13px] text-white",
              warning
                ? "bg-warn shadow-[0_8px_20px_rgba(162,95,85,.24)]"
                : "bg-brand shadow-[var(--lift-brand)]",
            )}>
              <Icon size={21} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-[.7rem] font-bold", warning ? "text-warn" : "text-brand")}>{config.eyebrow}</p>
              <h2 id="confirmation-dialog-title" className="mt-1 text-lg font-extrabold leading-6 tracking-[-0.025em]">{config.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-4 transition hover:bg-surface hover:text-ink"
            aria-label="팝업 닫기"
          >
            <X size={17} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p id="confirmation-dialog-description" className="text-[.84rem] leading-6 text-ink-3">{config.description}</p>
          {config.note && (
            <div className={cn(
              "mt-4 flex items-start gap-2 rounded-[11px] border px-3.5 py-3",
              warning
                ? "border-warn/15 bg-[var(--warn-page)] text-warn"
                : "border-brand/15 bg-brand-soft/55 text-brand-dark",
            )}>
              {warning ? <TriangleAlert size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
              <p className="text-[.72rem] font-semibold leading-5">{config.note}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface-2 px-6 py-4 sm:flex sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} autoFocus>취소</Button>
          <Button type="button" variant={warning ? "danger" : "primary"} onClick={handleConfirm}>
            <Icon size={15} />{config.confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function BatchGenerationDialog({ items, running, progress, onClose, onConfirm }: {
  items: CurriculumOffering[];
  running: boolean;
  progress: BatchGenerationProgress | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const finished = Boolean(progress && progress.total > 0 && progress.completed === progress.total);
  const progressPercent = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const [currentElapsedSeconds, setCurrentElapsedSeconds] = useState(0);
  const activePhase = generationPhaseIndex(currentElapsedSeconds);
  const currentEstimatedPercent = generationEstimatedPercent(currentElapsedSeconds);

  useEffect(() => {
    setCurrentElapsedSeconds(0);
    if (!running || !progress?.currentTitle || finished) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setCurrentElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [finished, progress?.completed, progress?.currentTitle, running]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !running) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, running]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(31,24,52,.34)] p-4 backdrop-blur-[3px]" onMouseDown={() => { if (!running) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="batch-generation-dialog-title" onMouseDown={(event) => event.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-[42rem] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-surface shadow-[0_28px_80px_rgba(43,31,79,.3)]">
        <div className="flex items-start justify-between gap-4 border-b border-line bg-[linear-gradient(135deg,var(--brand-page),var(--surface))] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-brand text-white shadow-[var(--lift-brand)]"><WandSparkles size={21} /></span>
            <div className="min-w-0">
              <p className="text-[.7rem] font-bold text-brand">AI 학습자료 일괄 생성</p>
              <h2 id="batch-generation-dialog-title" className="mt-1 text-lg font-extrabold tracking-[-0.025em]">선택한 {items.length}개 과목의 초안을 만들까요?</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={running} className="grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-4 transition hover:bg-surface hover:text-ink disabled:opacity-35" aria-label="팝업 닫기"><X size={17} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {progress ? (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[.76rem] font-bold text-ink">{finished ? "일괄 생성이 끝났습니다" : "전체 과목 진행률"}</p>
                  <p className="mt-1 text-[.7rem] text-ink-4">성공 {progress.successCount}개 · 실패 {progress.failures.length}개 · 진행 중 {finished ? 0 : 1}개 · 대기 {Math.max(0, progress.total - progress.completed - (finished ? 0 : 1))}개</p>
                </div>
                <span className="figure text-[.78rem] font-bold text-brand">{progress.completed}/{progress.total} · {progressPercent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
              {!finished && progress.currentTitle && (
                <div className="mt-5 rounded-[14px] border border-brand/20 bg-brand-page/55 p-4" aria-live="polite">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[.67rem] font-extrabold text-brand">현재 {progress.completed + 1}번째 과목</p>
                      <p className="mt-1 truncate text-base font-extrabold text-ink">{progress.currentTitle}</p>
                      <p className="mt-1 text-[.68rem] text-ink-4">{progress.currentGrade}학년 · {progress.currentPublisher || "출판사 미입력"}</p>
                    </div>
                    <span className="figure shrink-0 rounded-full border border-brand/15 bg-surface px-2.5 py-1 text-[.68rem] font-bold text-brand-dark">{elapsedTimeLabel(currentElapsedSeconds)}</span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[.76rem] font-extrabold text-ink">{generationPhases[activePhase].title}</p>
                      <p className="mt-1 text-[.68rem] leading-5 text-ink-4">{generationPhases[activePhase].note}</p>
                    </div>
                    <span className="figure shrink-0 text-[.68rem] font-bold text-brand">예상 {currentEstimatedPercent}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${currentEstimatedPercent}%` }} />
                  </div>

                  <ol className="mt-4 grid gap-2 sm:grid-cols-3">
                    {generationPhases.map((phase, index) => {
                      const complete = index < activePhase;
                      const active = index === activePhase;
                      return (
                        <li key={phase.title} className={cn("flex items-center gap-2 rounded-[10px] border px-2.5 py-2.5", active ? "border-brand/25 bg-surface" : "border-line bg-surface/65", index > activePhase && "opacity-50")}>
                          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[.6rem] font-extrabold", complete ? "bg-[var(--ok-page)] text-ok" : active ? "bg-brand text-white" : "bg-surface-3 text-ink-5")}>{complete ? <Check size={11} /> : active ? <LoaderCircle size={11} className="animate-spin" /> : index + 1}</span>
                          <span className="min-w-0 truncate text-[.66rem] font-bold text-ink" title={phase.title}>{phase.title}</span>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-3 text-[.64rem] text-ink-5">과목 분량과 공식 자료 검색 시간에 따라 단계별 소요 시간은 달라질 수 있습니다.</p>
                </div>
              )}
              {progress.failures.length > 0 && (
                <div className="mt-4 max-h-36 overflow-y-auto rounded-[11px] border border-[var(--danger)]/15 bg-[var(--danger-page)] px-3.5 py-3">
                  <p className="text-[.7rem] font-bold text-danger">생성하지 못한 과목</p>
                  <ul className="mt-2 space-y-1.5">
                    {progress.failures.map((failure) => <li key={failure.courseTitle} className="text-[.68rem] leading-5 text-ink-3"><strong className="text-ink-2">{failure.courseTitle}</strong> · {failure.message}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-[.82rem] leading-6 text-ink-3">아직 학습자료가 없는 운영 과목을 순서대로 생성합니다. 기존 초안과 공개 콘텐츠는 변경하지 않습니다.</p>
              <div className="mt-4 max-h-48 overflow-y-auto rounded-[12px] border border-line bg-surface-2 p-2">
                {items.map((item, index) => (
                  <div key={item.rowKey} className="flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[.76rem]">
                    <span className="figure text-[.68rem] font-bold text-brand">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate font-bold text-ink">{item.courseTitle}</span>
                    <span className="shrink-0 text-[.68rem] text-ink-4">{item.grade}학년 · {item.publisherName || "출판사 미입력"}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[11px] border border-line bg-surface px-4 py-3">
                <p className="flex items-center gap-1.5 text-[.72rem] font-bold text-ink"><CheckCircle2 size={14} className="text-ok" />한 과목이 실패해도 다음 과목을 계속 생성합니다</p>
                <p className="mt-1 text-[.7rem] leading-5 text-ink-4">작업 중에는 이 창과 브라우저를 닫지 마세요. 생성된 초안은 과목별로 검토한 뒤 공개할 수 있습니다.</p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4">
          {finished ? (
            <Button type="button" onClick={onClose}>확인</Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={running}>취소</Button>
              <Button type="button" onClick={onConfirm} disabled={running || items.length === 0}>
                {running ? <LoaderCircle size={15} className="animate-spin" /> : <WandSparkles size={15} />}
                {running ? "순서대로 생성 중" : `${items.length}개 과목 생성 시작`}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function GenerationConfirmDialog({ item, running, onClose, onConfirm }: {
  item: CurriculumOffering;
  running: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !running) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, running]);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [running]);

  const outputs = ["단원 구성", "핵심 개념", "수식·예시", "선수 개념", "추천 질문", "AI 튜터 지침"];
  const activePhase = generationPhaseIndex(elapsedSeconds);
  const estimatedPercent = generationEstimatedPercent(elapsedSeconds);
  const elapsedLabel = elapsedTimeLabel(elapsedSeconds);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(31,24,52,.34)] p-4 backdrop-blur-[3px]" onMouseDown={() => { if (!running) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="generation-dialog-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-[31rem] overflow-hidden rounded-[22px] border border-white/80 bg-surface shadow-[0_28px_80px_rgba(43,31,79,.3)]">
        <div className="flex items-start justify-between gap-4 border-b border-line bg-[linear-gradient(135deg,var(--brand-page),var(--surface))] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-brand text-white shadow-[0_8px_20px_rgba(103,76,190,.25)]"><WandSparkles size={21} /></span>
            <div className="min-w-0">
              <p className="text-[.7rem] font-bold text-brand">AI 학습자료 초안</p>
              <h2 id="generation-dialog-title" className="mt-1 truncate text-lg font-extrabold tracking-[-0.025em]">{running ? `${item.courseTitle} 자료를 만들고 있어요` : `${item.courseTitle} 콘텐츠를 만들까요?`}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={running} className="grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-4 transition hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-30" aria-label="팝업 닫기"><X size={17} /></button>
        </div>
        <div className="px-6 py-5">
          {running ? (
            <div aria-live="polite">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[.8rem] font-extrabold text-ink">{generationPhases[activePhase].title}</p>
                  <p className="mt-1 text-[.71rem] leading-5 text-ink-4">{generationPhases[activePhase].note}</p>
                </div>
                <span className="figure shrink-0 text-[.72rem] font-bold text-brand">{elapsedLabel}</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3" aria-label="예상 진행률">
                <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${estimatedPercent}%` }} />
              </div>
              <p className="mt-2 text-[.65rem] text-ink-5">예상 진행 표시 · 과목 분량에 따라 보통 1~3분 정도 걸립니다.</p>
              <ol className="mt-5 space-y-2.5">
                {generationPhases.map((phase, index) => {
                  const complete = index < activePhase;
                  const active = index === activePhase;
                  return (
                    <li key={phase.title} className={cn("flex items-start gap-3 rounded-[11px] border px-3.5 py-3 transition", active ? "border-brand/25 bg-brand-soft/70" : "border-line bg-surface-2", index > activePhase && "opacity-55")}>
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[.65rem] font-extrabold", complete ? "bg-[var(--ok-page)] text-ok" : active ? "bg-brand text-white" : "bg-surface-3 text-ink-5")}>{complete ? <Check size={13} /> : active ? <LoaderCircle size={13} className="animate-spin" /> : index + 1}</span>
                      <div><p className="text-[.72rem] font-bold text-ink">{phase.title}</p><p className="mt-0.5 text-[.66rem] leading-5 text-ink-4">{phase.note}</p></div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <>
              <p className="text-[.82rem] leading-6 text-ink-3">AI가 교육과정과 과목명을 바탕으로 다음 내용을 초안으로 구성합니다.</p>
              <div className="mt-4 flex flex-wrap gap-2">{outputs.map((output) => <span key={output} className="rounded-full border border-brand/15 bg-brand-soft px-3 py-1.5 text-[.7rem] font-bold text-brand-dark">{output}</span>)}</div>
              <div className="mt-5 rounded-[11px] border border-line bg-surface-2 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[.72rem] font-bold text-ink"><CheckCircle2 size={14} className="text-ok" />학생에게 바로 공개되지 않습니다</p>
                <p className="mt-1 text-[.7rem] leading-5 text-ink-4">생성 후 관리자가 단원별 내용을 펼쳐 확인하고, 별도로 콘텐츠 공개를 눌러야 연결됩니다.</p>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={running}>{running ? "작업 중에는 닫을 수 없음" : "취소"}</Button>
          <Button type="button" onClick={onConfirm} disabled={running}>{running ? <LoaderCircle size={15} className="animate-spin" /> : <WandSparkles size={15} />}{running ? "단원 자료 생성 중" : "초안 생성 시작"}</Button>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value, note, warning = false, text = false }: { label: string; value: number | string; note: string; warning?: boolean; text?: boolean }) {
  return <div className="min-w-0 px-5 py-5"><p className="text-[.72rem] font-semibold text-ink-4">{label}</p><p className={cn("mt-1 font-semibold text-ink", text ? "text-lg" : "figure text-2xl", warning && "text-warn")}>{value}</p><p className="mt-1 truncate text-[.68rem] text-ink-5" title={note}>{note}</p></div>;
}

function WorkflowStep({ number, title, value, note, complete = false, active = false }: {
  number: string;
  title: string;
  value: string;
  note: string;
  complete?: boolean;
  active?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-3 px-5 py-4 sm:px-6", active && "bg-brand-soft/55")}>
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[.68rem] font-extrabold", complete ? "bg-[var(--ok-page)] text-ok" : active ? "bg-brand text-white" : "bg-surface-3 text-ink-4")}>{complete ? <Check size={14} /> : number}</span>
      <div className="min-w-0">
        <p className="text-[.72rem] font-bold text-ink-4">{title}</p>
        <p className="mt-0.5 text-base font-extrabold text-ink">{value}</p>
        <p className="mt-0.5 truncate text-[.66rem] text-ink-5" title={note}>{note}</p>
      </div>
    </div>
  );
}

function GeneratedContentReview({
  content,
  publishing,
  regenerating,
  canRegenerate,
  onClose,
  onPublish,
  onRegenerate,
}: {
  content: GeneratedContentDetail;
  publishing: boolean;
  regenerating: boolean;
  canRegenerate: boolean;
  onClose: () => void;
  onPublish: () => void;
  onRegenerate: () => void;
}) {
  const published = content.status === "PUBLISHED";
  return (
    <section className="mt-5 rounded-[16px] border border-brand/20 bg-surface p-5 shadow-[var(--lift-2)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[.7rem] font-bold text-brand"><WandSparkles size={14} /> AI 생성 콘텐츠 검토</p>
          <h3 className="mt-2 text-lg font-extrabold">{content.grade}학년 · {content.courseTitle}</h3>
          <p className="mt-1 text-[.72rem] text-ink-4">{content.units.length}개 단원 · {content.sourceModel ?? "AI 모델"} · {published ? "콘텐츠 공개됨" : "관리자 검토 대기"}</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-[9px] text-ink-4 hover:bg-surface-2" aria-label="콘텐츠 검토 닫기"><X size={17} /></button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[.72rem]">
        <span className="font-bold text-ink-3">생성 근거</span>
        {content.sources.map((source) => (
          <a
            key={`${source.kind}:${source.url}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-semibold text-brand hover:border-brand/30"
          >
            {source.kind === "PUBLISHER_TOC" ? "교과서 목차" : "국가 교육과정"} · {source.title}
          </a>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {content.units.map((unit) => (
          <details key={unit.id} className="group rounded-[11px] border border-line bg-surface-2 px-4 py-3">
            <summary className="cursor-pointer list-none text-[.8rem] font-extrabold text-ink">
              <span className="figure mr-2 text-brand">{unit.chapterOrder}.{unit.sectionOrder}</span><InlineMarkdown>{unit.title}</InlineMarkdown>
              <span className="ml-2 text-[.68rem] font-medium text-ink-5"><InlineMarkdown>{unit.chapterTitle}</InlineMarkdown></span>
            </summary>
            <div className="mt-3 border-t border-line pt-3">
              <div className="text-[.78rem] text-ink-3"><Markdown>{unit.summary}</Markdown></div>
              <ReviewList title="핵심 개념" items={unit.keyPoints} />
              {unit.formulas.length > 0 && <div className="mt-4"><p className="text-[.7rem] font-extrabold text-ink">수식·원리</p><div className="mt-2 space-y-2">{unit.formulas.map((formula) => <div key={`${formula.name}:${formula.expression}`} className="rounded-[8px] border border-line bg-surface px-3 py-2 text-[.72rem] leading-5"><p className="font-bold text-ink"><InlineMarkdown>{formula.name}</InlineMarkdown></p><div className="overflow-x-auto"><Markdown>{displayMathMarkdown(formula.expression)}</Markdown></div><div className="text-ink-4"><Markdown>{formula.explanation}</Markdown></div></div>)}</div></div>}
              {unit.examples.length > 0 && <div className="mt-4"><p className="text-[.7rem] font-extrabold text-ink">학습 예시</p><div className="mt-2 space-y-2">{unit.examples.map((example) => <div key={example.title} className="rounded-[8px] bg-surface px-3 py-2 text-[.72rem] leading-5"><p className="font-bold text-ink"><InlineMarkdown>{example.title}</InlineMarkdown></p><div className="text-ink-4"><Markdown>{example.body}</Markdown></div></div>)}</div></div>}
              <div className="grid gap-x-5 sm:grid-cols-2">
                <ReviewList title="선수 개념" items={unit.prerequisites} />
                <ReviewList title="자주 하는 실수" items={unit.commonMistakes} />
                <ReviewList title="추천 질문" items={unit.recommendedQuestions} />
                <ReviewList title="범위에서 제외" items={unit.scopeExcluded} />
              </div>
              <div className="mt-4 rounded-[8px] border border-brand/15 bg-brand-soft/50 px-3 py-2"><p className="text-[.7rem] font-extrabold text-brand-dark">AI 튜터 지침</p><div className="mt-1 text-[.72rem] text-ink-4"><Markdown>{unit.tutorInstructions}</Markdown></div></div>
            </div>
          </details>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[.72rem] leading-5 text-ink-4">콘텐츠를 공개한 뒤 교육과정까지 공개해야 학생 화면에 나타납니다.</p>
        <div className="flex flex-wrap gap-2">
          {canRegenerate && (
            <Button variant="secondary" onClick={onRegenerate} disabled={publishing || regenerating}>
              {regenerating ? <LoaderCircle size={15} className="animate-spin" /> : <WandSparkles size={15} />}
              {regenerating ? "공식 자료 다시 검색 중" : "목차 다시 검색 · 재생성"}
            </Button>
          )}
          {!published && <Button onClick={onPublish} disabled={publishing || regenerating}>{publishing ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{publishing ? "콘텐츠 공개 중" : "검토 완료 · 콘텐츠 공개"}</Button>}
        </div>
      </div>
    </section>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div className="mt-4"><p className="text-[.7rem] font-extrabold text-ink">{title}</p><ul className="mt-1.5 space-y-1 text-[.72rem] leading-5 text-ink-4">{items.map((item) => <li key={item} className="grid grid-cols-[auto_1fr] gap-1"><span>·</span><Markdown>{item}</Markdown></li>)}</ul></div>;
}

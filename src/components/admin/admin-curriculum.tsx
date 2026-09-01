"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Check,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  School,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SchoolCourseCatalogItem, SchoolSubjectGroup } from "@/data/school-course-catalog";

type CurriculumItem = SchoolCourseCatalogItem & {
  selected: boolean;
  contentReady: boolean;
};

type CurriculumResponse = {
  academicYear: number;
  selectedKeys: string[];
  items: CurriculumItem[];
  error?: { message?: string };
};

const subjectOrder: SchoolSubjectGroup[] = ["KOREAN", "ENGLISH", "MATH", "SOCIAL", "SCIENCE", "ARTS"];

export function AdminCurriculum() {
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [grade, setGrade] = useState<1 | 2>(1);
  const [subject, setSubject] = useState<SchoolSubjectGroup>("KOREAN");
  const [onlySelected, setOnlySelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/curriculum")
      .then(async (response) => {
        const data = await response.json() as CurriculumResponse;
        if (!response.ok) throw new Error(data.error?.message ?? "교육과정 정보를 불러오지 못했습니다.");
        const nextKeys = new Set(data.selectedKeys);
        setItems(data.items);
        setSelectedKeys(nextKeys);
        setSavedKeys(new Set(nextKeys));
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "교육과정 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const gradeItems = useMemo(() => items.filter((item) => item.grade === grade), [grade, items]);
  const subjects = useMemo(() => {
    const available = new Map<SchoolSubjectGroup, string>();
    for (const item of gradeItems) available.set(item.subjectCode, item.subjectTitle);
    return subjectOrder.flatMap((code) => available.has(code) ? [{ code, title: available.get(code)! }] : []);
  }, [gradeItems]);
  const visibleItems = useMemo(
    () => gradeItems.filter((item) => item.subjectCode === subject && (!onlySelected || selectedKeys.has(item.key))),
    [gradeItems, onlySelected, selectedKeys, subject],
  );
  const selectedItems = useMemo(() => items.filter((item) => selectedKeys.has(item.key)), [items, selectedKeys]);
  const selectedSubjectCount = new Set(selectedItems.map((item) => `${item.grade}:${item.subjectCode}`)).size;
  const studentVisibleCount = selectedItems.filter((item) => item.contentReady).length;
  const dirty = selectedKeys.size !== savedKeys.size || [...selectedKeys].some((key) => !savedKeys.has(key));

  function changeGrade(nextGrade: 1 | 2) {
    setGrade(nextGrade);
    const firstSubject = subjectOrder.find((code) => items.some((item) => item.grade === nextGrade && item.subjectCode === code));
    if (firstSubject) setSubject(firstSubject);
  }

  function toggle(key: string) {
    setMessage("");
    setError("");
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setCurrentGroup(selected: boolean) {
    const keys = gradeItems.filter((item) => item.subjectCode === subject).map((item) => item.key);
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (selected) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/curriculum", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedKeys: [...selectedKeys] }),
      });
      const data = await response.json() as CurriculumResponse;
      if (!response.ok) throw new Error(data.error?.message ?? "교육과정 설정을 저장하지 못했습니다.");
      const nextKeys = new Set(data.selectedKeys);
      setItems(data.items);
      setSelectedKeys(nextKeys);
      setSavedKeys(new Set(nextKeys));
      setMessage("학생 대시보드에 교육과정 설정을 반영했습니다.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "교육과정 설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <header className="border-b border-line pb-8">
        <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><School size={15} /> 학교 교육과정 관리</p>
        <h1 className="mt-3 text-[2.1rem] font-extrabold tracking-[-0.045em]">교과 및 수강 과목</h1>
        <p className="mt-3 max-w-3xl text-[.92rem] leading-7 text-ink-3">학교에서 실제 운영하는 과목만 선택해 학생 학습 화면에 공개합니다. 2026학년도 검인정 교과서 선정 결과를 기준으로 구성했습니다.</p>
      </header>

      <section className="mt-7 grid divide-y divide-line rounded-[16px] border border-line bg-surface shadow-[var(--lift-1)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Summary label="등록 과목" value={`${selectedItems.length}개`} note="학교에서 선택한 전체 과목" />
        <Summary label="학년별 교과" value={`${selectedSubjectCount}개`} note="학년과 교과 조합 기준" />
        <Summary label="학생 화면 연결" value={`${studentVisibleCount}개`} note="학습 콘텐츠가 준비된 과정" />
      </section>

      <section className="mt-8 overflow-hidden rounded-[16px] border border-line bg-surface shadow-[var(--lift-2)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <p className="flex items-center gap-2 text-[.78rem] font-bold text-brand"><ClipboardList size={15} /> 현재 등록 정보</p>
            <h2 className="mt-2 text-lg font-extrabold">학년별 과목 선택</h2>
            <p className="mt-1 text-[.8rem] leading-5 text-ink-4">체크된 과목이 학교 교육과정으로 저장됩니다.</p>
          </div>
          <button type="button" onClick={() => setOnlySelected((value) => !value)} className={cn("min-h-10 rounded-[10px] border px-3 text-[.76rem] font-bold transition", onlySelected ? "border-brand/25 bg-brand-soft text-brand-dark" : "border-line text-ink-3 hover:bg-surface-2")}>{onlySelected ? "전체 과목 보기" : "등록된 과목만 보기"}</button>
        </div>

        <div className="grid min-h-[34rem] lg:grid-cols-[13rem_1fr]">
          <aside className="border-b border-line bg-surface-2 p-4 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-1 rounded-[11px] border border-line bg-surface-3 p-1">
              {([1, 2] as const).map((item) => <button key={item} type="button" onClick={() => changeGrade(item)} className={cn("min-h-9 rounded-[8px] text-[.78rem] font-bold transition", grade === item ? "bg-surface text-ink shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>{item}학년</button>)}
            </div>
            <nav className="mt-4 grid grid-cols-3 gap-1.5 lg:grid-cols-1" aria-label="교과 선택">
              {subjects.map((item) => {
                const count = gradeItems.filter((course) => course.subjectCode === item.code && selectedKeys.has(course.key)).length;
                return <button key={item.code} type="button" onClick={() => setSubject(item.code)} className={cn("flex min-h-10 items-center justify-between rounded-[9px] px-3 text-[.78rem] font-bold transition", subject === item.code ? "bg-brand-soft text-brand-dark" : "text-ink-3 hover:bg-surface hover:text-ink")}><span>{item.title}</span><span className="figure text-[.66rem] text-ink-5">{count}</span></button>;
              })}
            </nav>
          </aside>

          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[.95rem] font-extrabold">{grade}학년 · {subjects.find((item) => item.code === subject)?.title}</h3>
                <p className="mt-1 text-[.76rem] text-ink-4">과목과 채택 출판사를 확인하고 필요한 항목만 선택하세요.</p>
              </div>
              <div className="flex gap-1.5"><button type="button" onClick={() => setCurrentGroup(true)} className="min-h-8 rounded-[8px] px-2.5 text-[.7rem] font-bold text-brand hover:bg-brand-soft">모두 선택</button><button type="button" onClick={() => setCurrentGroup(false)} className="min-h-8 rounded-[8px] px-2.5 text-[.7rem] font-bold text-ink-4 hover:bg-surface-2">선택 해제</button></div>
            </div>

            {loading ? (
              <div className="grid min-h-80 place-items-center text-ink-4"><LoaderCircle className="animate-spin" size={24} /></div>
            ) : visibleItems.length > 0 ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {visibleItems.map((item) => {
                  const selected = selectedKeys.has(item.key);
                  return (
                    <button key={item.key} type="button" onClick={() => toggle(item.key)} className={cn("flex min-h-[5.2rem] cursor-pointer items-start gap-3 rounded-[12px] border p-3.5 text-left transition-all active:scale-[.99]", selected ? "border-brand/30 bg-brand-page shadow-[var(--lift-1)]" : "border-line bg-surface hover:border-[var(--line-2)] hover:bg-surface-2") } aria-pressed={selected}>
                      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border", selected ? "border-brand bg-brand text-white" : "border-[var(--line-2)] bg-surface")}><Check size={12} strokeWidth={2.5} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[.84rem] font-extrabold text-ink">{item.courseTitle}</span>
                        <span className="mt-1 block text-[.74rem] text-ink-4">{item.publisherName}</span>
                        <span className={cn("mt-2 inline-flex items-center gap-1 text-[.66rem] font-bold", item.contentReady ? "text-ok" : "text-ink-5")}>{item.contentReady ? <CheckCircle2 size={12} /> : <TriangleAlert size={12} />}{item.contentReady ? "학생 화면 연결 가능" : "학습 콘텐츠 준비 중"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[12px] border border-dashed border-line px-4 py-16 text-center text-[.82rem] text-ink-4">현재 조건에 표시할 과목이 없습니다.</div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-surface-2 px-5 py-4 sm:px-7">
          <div>{error ? <p role="alert" className="text-[.78rem] font-semibold text-danger">{error}</p> : message ? <p role="status" className="flex items-center gap-1.5 text-[.78rem] font-semibold text-ok"><CheckCircle2 size={14} />{message}</p> : <p className="text-[.76rem] text-ink-4">저장하면 학생이 다음에 학습 화면을 열 때 반영됩니다.</p>}</div>
          <Button onClick={save} disabled={loading || saving || !dirty}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <BookOpenCheck size={16} />}{saving ? "저장 중" : "교육과정 저장"}</Button>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="px-5 py-5 sm:px-6"><p className="text-[.74rem] font-semibold text-ink-4">{label}</p><p className="figure mt-1 text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-[.7rem] text-ink-5">{note}</p></div>;
}

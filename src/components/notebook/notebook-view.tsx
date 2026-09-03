"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookOpen, LibraryBig, ListTree, LoaderCircle, NotebookTabs, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { Bookmark as BookmarkType, LearningUnit } from "@/types";

const ALL_SCOPE = "ALL";

type BookmarkOutlineUnit = {
  id: string;
  title: string;
  number: string;
  order: number;
  count: number;
};

type BookmarkOutlineCourse = {
  key: string;
  title: string;
  order: number;
  count: number;
  units: BookmarkOutlineUnit[];
};

type BookmarkOutlineSubject = {
  key: string;
  title: string;
  count: number;
  courses: BookmarkOutlineCourse[];
};

const answerModeLabels: Record<BookmarkType["answerMode"], string> = {
  QUESTION: "질문 답변",
  EASIER: "더 쉽게",
  DEEPER: "원리까지",
  REVEAL: "전체 풀이",
  QUIZ: "확인 문제",
};

function getPreview(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`$[\](){}\\|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRequestTitle(title: string) {
  const normalized = title.trim();
  return normalized.endsWith("학습 메모") ? null : normalized;
}

function bookmarkMatchesScope(item: BookmarkType, scope: string, unitById: Map<string, LearningUnit>) {
  if (scope === ALL_SCOPE) return true;
  const unit = unitById.get(item.unitId);
  if (scope.startsWith("subject:")) return (unit?.subjectCode ?? item.subjectTitle) === scope.slice(8);
  if (scope.startsWith("course:")) return (unit?.courseCode ?? `unknown:${item.subjectTitle}`) === scope.slice(7);
  if (scope.startsWith("unit:")) return item.unitId === scope.slice(5);
  return true;
}

function buildBookmarkOutline(items: BookmarkType[], unitById: Map<string, LearningUnit>) {
  const subjects = new Map<string, {
    title: string;
    count: number;
    courses: Map<string, {
      title: string;
      order: number;
      count: number;
      units: Map<string, BookmarkOutlineUnit>;
    }>;
  }>();

  for (const item of items) {
    const unit = unitById.get(item.unitId);
    const subjectKey = unit?.subjectCode ?? item.subjectTitle;
    const courseKey = unit?.courseCode ?? `unknown:${item.subjectTitle}`;
    const subject = subjects.get(subjectKey) ?? { title: item.subjectTitle, count: 0, courses: new Map() };
    const course = subject.courses.get(courseKey) ?? {
      title: unit?.courseTitle ?? item.subjectTitle,
      order: unit?.courseOrder ?? Number.MAX_SAFE_INTEGER,
      count: 0,
      units: new Map(),
    };
    const outlineUnit = course.units.get(item.unitId) ?? {
      id: item.unitId,
      title: item.unitTitle,
      number: unit ? `${unit.chapterOrder}.${unit.sectionOrder}` : "",
      order: unit ? unit.chapterOrder * 10_000 + unit.sectionOrder * 100 + unit.topicOrder : Number.MAX_SAFE_INTEGER,
      count: 0,
    };
    outlineUnit.count += 1;
    course.units.set(item.unitId, outlineUnit);
    course.count += 1;
    subject.courses.set(courseKey, course);
    subject.count += 1;
    subjects.set(subjectKey, subject);
  }

  return [...subjects.entries()]
    .map(([key, subject]): BookmarkOutlineSubject => ({
      key,
      title: subject.title,
      count: subject.count,
      courses: [...subject.courses.entries()]
        .map(([courseKey, course]): BookmarkOutlineCourse => ({
          key: courseKey,
          title: course.title,
          order: course.order,
          count: course.count,
          units: [...course.units.values()].sort((left, right) => left.order - right.order),
        }))
        .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "ko")),
    }))
    .sort((left, right) => left.title.localeCompare(right.title, "ko"));
}

export function NotebookView() {
  const [items, setItems] = useState<BookmarkType[]>([]);
  const [units, setUnits] = useState<LearningUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(ALL_SCOPE);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    Promise.all([fetch("/api/bookmarks"), fetch("/api/curriculum")])
      .then(async ([bookmarkResponse, curriculumResponse]) => {
        const [bookmarkData, curriculumData] = await Promise.all([
          bookmarkResponse.json(),
          curriculumResponse.json(),
        ]);
        setItems(bookmarkData.bookmarks ?? []);
        setUnits(curriculumData.units ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mobileOutlineOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOutlineOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOutlineOpen]);

  const unitById = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);
  const outline = useMemo(() => buildBookmarkOutline(items, unitById), [items, unitById]);
  const activeScope = scope === ALL_SCOPE || items.some((item) => bookmarkMatchesScope(item, scope, unitById))
    ? scope
    : ALL_SCOPE;
  const filtered = useMemo(() => items.filter((item) => {
    const needle = query.toLowerCase();
    return bookmarkMatchesScope(item, activeScope, unitById)
      && (!needle
        || item.title.toLowerCase().includes(needle)
        || item.unitTitle.toLowerCase().includes(needle)
        || item.answerMarkdown.toLowerCase().includes(needle));
  }), [activeScope, items, query, unitById]);

  const selectedItem = filtered.find((item) => item.id === selectedId) ?? null;

  async function remove(id: string) {
    const response = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => current === id ? null : current);
    }
  }

  function showDetail(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
  }

  function selectScope(nextScope: string) {
    setScope(nextScope);
    setSelectedId(null);
    setMobileOutlineOpen(false);
  }

  return (
    <>
      <div className="grid h-[calc(100dvh-8.8rem-env(safe-area-inset-bottom))] min-h-0 overflow-hidden min-[1024px]:h-[calc(100dvh-4rem)] min-[1024px]:grid-cols-[298px_minmax(0,1fr)]">
        <aside className="scrollbar-subtle hidden h-full min-h-0 overflow-y-scroll border-r border-line bg-surface/55 px-4 py-5 [scrollbar-gutter:stable] min-[1024px]:block">
          <BookmarkOutline groups={outline} itemCount={items.length} loading={loading} scope={activeScope} onSelect={selectScope} />
        </aside>

        <main className="scrollbar-subtle h-full min-h-0 min-w-0 overflow-y-scroll [scrollbar-gutter:stable]">
          <div className="mx-auto w-full max-w-[1180px] px-4 py-9 sm:px-7 lg:px-10 lg:py-14">
            <header className="grid gap-6 border-b border-line pb-8 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><NotebookTabs size={16} /> 내가 저장한 답변</p>
                <h1 className="font-learning mt-3 text-[2.2rem] font-bold tracking-[-0.045em] text-ink">학습 북마크</h1>
                <p className="mt-3 max-w-xl text-[.94rem] leading-7 text-ink-3">필요한 답변만 모아 두고, 시험 전에 과목과 단원별로 빠르게 다시 읽어 보세요.</p>
              </div>
              <p className="figure text-[.9rem] font-semibold text-ink-3"><span className="text-2xl text-brand">{items.length}</span>개 저장됨</p>
            </header>

            <div className="mt-6 flex gap-2.5">
              <label className="composer flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[12px] border border-line bg-surface px-4 shadow-[var(--lift-1)]">
                <Search size={17} className="shrink-0 text-brand" />
                <span className="sr-only">저장한 내용 검색</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 단원이나 답변 내용 검색" className="w-full min-w-0 border-0 bg-transparent text-[.9rem] outline-none placeholder:text-ink-5" />
              </label>
              <Button type="button" variant="secondary" onClick={() => setMobileOutlineOpen(true)} className="shrink-0 min-[1024px]:hidden"><ListTree size={16} />목차</Button>
            </div>

            {activeScope !== ALL_SCOPE && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-[11px] border border-brand/10 bg-brand-page px-3.5 py-2.5">
                <p className="text-[.76rem] font-semibold text-brand-dark">선택한 목차에서 북마크 {filtered.length}개를 보고 있어요.</p>
                <button type="button" onClick={() => selectScope(ALL_SCOPE)} className="shrink-0 text-[.72rem] font-bold text-brand hover:underline">전체 보기</button>
              </div>
            )}

            {loading ? (
              <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-brand" /></div>
            ) : filtered.length === 0 ? (
              <div className="mt-10 grid min-h-[21rem] place-items-center border-y border-dashed border-line px-6 text-center">
                <div><Bookmark size={25} className="mx-auto text-brand" /><h2 className="font-learning mt-4 text-lg font-bold">{items.length === 0 ? "아직 저장한 답변이 없어요" : "조건에 맞는 답변이 없어요"}</h2><p className="mt-2 max-w-sm text-[.9rem] leading-7 text-ink-3">{items.length === 0 ? "AI 튜터 답변 아래의 저장 버튼을 누르면 이곳에서 다시 볼 수 있어요." : "검색어를 바꾸거나 목차에서 다른 항목을 선택해 보세요."}</p></div>
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((item, index) => (
                    <article key={item.id} className="relative min-w-0">
                      <button
                        type="button"
                        onClick={() => showDetail(item.id)}
                        aria-pressed={selectedId === item.id}
                        aria-controls="bookmark-detail"
                        className={cn(
                          "group flex min-h-52 w-full cursor-pointer flex-col rounded-[14px] border p-4 pr-12 text-left transition-all duration-300",
                          selectedId === item.id
                            ? "border-brand/40 bg-brand-page shadow-[var(--lift-2)]"
                            : "border-line bg-surface hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[var(--lift-2)]",
                        )}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="figure text-[.72rem] font-semibold text-ink-5">{String(index + 1).padStart(2, "0")}</span>
                          <span className="flex items-center gap-1.5 text-[.78rem] font-bold text-brand"><BookOpen size={13} /> {item.subjectTitle}</span>
                          <span className="ml-auto rounded-full bg-brand-soft px-2 py-1 text-[.68rem] font-bold text-brand-dark">{answerModeLabels[item.answerMode]}</span>
                        </div>
                        <p className="font-learning mt-4 line-clamp-1 text-[.8rem] font-semibold text-ink-3">{item.unitTitle}</p>
                        {getRequestTitle(item.title) && (
                          <>
                            <p className="mt-2 text-[.68rem] font-bold tracking-[.06em] text-ink-5">저장한 요청</p>
                            <h2 className="font-learning mt-1 line-clamp-2 text-[1rem] font-bold leading-6 text-ink">{getRequestTitle(item.title)}</h2>
                          </>
                        )}
                        <p className="mt-2 line-clamp-3 text-[.82rem] leading-6 text-ink-4">{getPreview(item.answerMarkdown)}</p>
                        <p className="figure mt-auto pt-4 text-[.72rem] text-ink-5">{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="북마크 삭제" className="absolute right-2 top-2 text-ink-4 hover:text-danger"><Trash2 size={16} /></Button>
                    </article>
                  ))}
                </div>

                {selectedItem && (
                  <section ref={detailRef} id="bookmark-detail" className="mt-10 scroll-mt-6 border-t border-line pt-8">
                    <header className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[.8rem] font-bold text-brand"><span className="flex items-center gap-1.5"><BookOpen size={14} /> {selectedItem.subjectTitle} · {selectedItem.unitTitle}</span><span className="rounded-full bg-brand-soft px-2 py-1 text-[.68rem] text-brand-dark">{answerModeLabels[selectedItem.answerMode]}</span></p>
                        {getRequestTitle(selectedItem.title) && (
                          <>
                            <p className="mt-4 text-[.7rem] font-bold tracking-[.06em] text-ink-5">이 답변을 요청한 내용</p>
                            <h2 className="font-learning mt-1 text-xl font-bold leading-8 text-ink">{getRequestTitle(selectedItem.title)}</h2>
                          </>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label="상세 내용 닫기" className="shrink-0 text-ink-4"><X size={18} /></Button>
                    </header>
                    <div className="mt-5 rounded-[14px] border border-line bg-surface-2 p-5 sm:p-7">
                      <Markdown>{selectedItem.answerMarkdown}</Markdown>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {mobileOutlineOpen && (
        <div className="fixed inset-0 z-50 min-[1024px]:hidden" role="dialog" aria-modal="true" aria-label="북마크 목차">
          <button type="button" className="absolute inset-0 cursor-default bg-[#e4e3f1]/72 backdrop-blur-[3px]" onClick={() => setMobileOutlineOpen(false)} aria-label="북마크 목차 닫기" />
          <aside className="scrollbar-subtle absolute inset-y-0 left-0 w-[min(22rem,88vw)] overflow-y-scroll border-r border-line bg-surface px-5 py-5 shadow-[0_0_60px_rgba(46,43,90,.2)] [scrollbar-gutter:stable]">
            <BookmarkOutline groups={outline} itemCount={items.length} loading={loading} scope={activeScope} onSelect={selectScope} onClose={() => setMobileOutlineOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

function BookmarkOutline({ groups, itemCount, loading, scope, onSelect, onClose }: {
  groups: BookmarkOutlineSubject[];
  itemCount: number;
  loading: boolean;
  scope: string;
  onSelect: (scope: string) => void;
  onClose?: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start gap-3 border-b border-line px-1 pb-4">
        <Image
          src="/images/sdj-school-logo.webp"
          alt="서대전여자고등학교"
          width={1415}
          height={224}
          className="mt-1 h-auto min-w-0 flex-1"
        />
        {onClose && <Button type="button" variant="ghost" size="icon" onClick={onClose} className="-mr-1 -mt-1 size-9 shrink-0" aria-label="북마크 목차 닫기"><X size={17} /></Button>}
      </div>

      <div className="flex items-center gap-2 px-1 text-[.86rem] font-bold text-ink"><LibraryBig size={17} className="text-brand" /> 북마크 목차</div>
      <p className="mt-1.5 px-1 text-[.78rem] leading-5 text-ink-4">저장한 답변을 과목과 단원별로 모아 보세요.</p>

      <button
        type="button"
        onClick={() => onSelect(ALL_SCOPE)}
        aria-pressed={scope === ALL_SCOPE}
        className={cn(
          "mt-4 flex min-h-11 w-full items-center gap-2.5 rounded-[11px] border px-3 text-left transition-all duration-200 active:scale-[.99]",
          scope === ALL_SCOPE
            ? "border-brand/25 bg-brand-soft text-brand-dark shadow-[var(--lift-1)]"
            : "border-line bg-surface text-ink-2 hover:border-brand/15 hover:bg-brand-page",
        )}
      >
        <Bookmark size={15} className="shrink-0 text-brand" />
        <span className="flex-1 text-[.82rem] font-bold">전체 북마크</span>
        <span className="figure rounded-full bg-surface px-2 py-0.5 text-[.68rem] font-semibold text-ink-4">{itemCount}</span>
      </button>

      {loading ? (
        <div className="grid min-h-40 place-items-center"><LoaderCircle size={19} className="animate-spin text-brand" /></div>
      ) : groups.length === 0 ? (
        <div className="mt-5 rounded-[12px] border border-dashed border-line bg-surface/60 px-3 py-7 text-center">
          <Bookmark size={19} className="mx-auto text-brand" />
          <p className="mt-3 text-[.78rem] font-bold text-ink">저장된 목차가 없어요</p>
          <p className="mt-1 text-[.72rem] leading-5 text-ink-4">학습 답변을 저장하면 이곳에 정리됩니다.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map((subject) => {
            const subjectValue = `subject:${subject.key}`;
            return (
              <section key={subject.key}>
                <button
                  type="button"
                  onClick={() => onSelect(subjectValue)}
                  aria-pressed={scope === subjectValue}
                  className={cn(
                    "flex min-h-8 w-full items-center gap-2 rounded-[8px] px-1.5 text-left transition hover:bg-brand-page",
                    scope === subjectValue ? "text-brand-dark" : "text-ink",
                  )}
                >
                  <span className="min-w-0 flex-1 text-[.8rem] font-extrabold">{subject.title}</span>
                  <span className="figure text-[.66rem] font-semibold text-ink-5">{subject.count}</span>
                </button>

                <div className="mt-1.5 space-y-2 border-l border-line pl-2">
                  {subject.courses.map((course) => {
                    const courseValue = `course:${course.key}`;
                    return (
                      <div key={course.key}>
                        <button
                          type="button"
                          onClick={() => onSelect(courseValue)}
                          aria-pressed={scope === courseValue}
                          className={cn(
                            "flex min-h-9 w-full items-center gap-2 rounded-[9px] px-2 text-left transition-all duration-200 active:scale-[.99]",
                            scope === courseValue
                              ? "bg-brand-soft text-brand-dark"
                              : "text-ink-2 hover:bg-surface hover:text-ink",
                          )}
                        >
                          <BookOpen size={13} className="shrink-0 text-brand" />
                          <span className="min-w-0 flex-1 truncate text-[.76rem] font-bold">{course.title}</span>
                          <span className="figure text-[.64rem] font-semibold text-ink-5">{course.count}</span>
                        </button>

                        <div className="mt-0.5 grid gap-0.5 pl-2">
                          {course.units.map((unit) => {
                            const unitValue = `unit:${unit.id}`;
                            return (
                              <button
                                key={unit.id}
                                type="button"
                                onClick={() => onSelect(unitValue)}
                                aria-pressed={scope === unitValue}
                                className={cn(
                                  "flex min-h-8 w-full items-start gap-1.5 rounded-[8px] px-1.5 py-1 text-left transition-all duration-200 active:scale-[.985]",
                                  scope === unitValue
                                    ? "bg-brand-soft text-brand-dark"
                                    : "text-ink-3 hover:bg-surface hover:text-ink",
                                )}
                              >
                                {unit.number && <span className={cn("figure shrink-0 pt-0.5 text-[.68rem]", scope === unitValue ? "text-brand" : "text-ink-5")}>{unit.number}</span>}
                                <span className={cn("min-w-0 flex-1 text-[.75rem] leading-5", scope === unitValue ? "font-bold" : "font-medium")}>{unit.title}</span>
                                {unit.count > 1 && <span className="figure shrink-0 pt-0.5 text-[.62rem] font-semibold text-ink-5">{unit.count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

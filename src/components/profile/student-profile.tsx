"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, BookOpenCheck, CalendarDays, GraduationCap, LockKeyhole, RefreshCw, School, Sparkles } from "lucide-react";
import Link from "next/link";
import type { StudentUsageInsights, UsagePeriod } from "@/features/usage/insights";
import type { SessionUser } from "@/types";
import { cn } from "@/lib/utils";

const chartColors = ["#7959dc", "#4698b0", "#b185cd", "#70a994", "#d09a66", "#8b96ba"];
const number = (value: number | undefined) => value === undefined ? "—" : value.toLocaleString("ko-KR");
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

export function StudentProfile({ user }: { user: SessionUser }) {
  const [days, setDays] = useState<UsagePeriod>(7);
  const [data, setData] = useState<StudentUsageInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showAllCourses, setShowAllCourses] = useState(false);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/usage/insights?days=${days}`, { cache: "no-store", signal: current.signal });
        if (!response.ok) throw new Error("Usage request failed");
        const result = await response.json() as StudentUsageInsights;
        if (active && !current.signal.aborted) setData(result);
      } catch {
        if (active && !current.signal.aborted) { setData(null); setError(true); }
      } finally {
        if (active && !current.signal.aborted) setLoading(false);
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(onVisible, 60_000);
    window.addEventListener("focus", onVisible);
    window.addEventListener("learncraft:usage-updated", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("learncraft:usage-updated", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [days, attempt]);

  const usage = data?.usage;
  const history = data?.days === days ? data.history : undefined;
  const pending = usage ? Math.max(0, usage.count - usage.completed) : 0;
  const usedPercent = usage ? Math.min(100, usage.count / Math.max(1, usage.limit) * 100) : 0;
  const busiestCourse = history?.byCourse[0];
  const grade = (value: number | null) => value ? `${value}학년` : "미설정";

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-7">
        <div>
          <p className="flex items-center gap-2 text-[.78rem] font-bold text-brand"><Activity size={16} /> 나만의 학습 공간</p>
          <h1 className="font-learning mt-3 text-[2rem] font-bold tracking-[-0.045em]">내 정보와 학습 기록</h1>
          <p className="mt-2 text-[.88rem] leading-6 text-ink-3">어떤 과목에 질문이 쌓였는지, 나의 학습 흐름을 확인해 보세요.</p>
        </div>
        <button type="button" onClick={() => setAttempt((value) => value + 1)} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-[11px] border border-line bg-surface px-4 text-[.8rem] font-bold text-ink-3 transition hover:bg-surface-2 disabled:opacity-50">
          <RefreshCw size={14} className={cn(loading && "animate-spin")} /> 새로고침
        </button>
      </header>

      {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-[var(--danger-page)] px-4 py-3 text-sm text-danger">
        <p>학습 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-11 font-bold underline underline-offset-4">다시 시도</button>
      </div>}

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0 space-y-7">
          <section aria-labelledby="today-usage-title" className="rounded-[18px] border border-line bg-brand-page p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="today-usage-title" className="flex items-center gap-2 text-[.92rem] font-bold"><Sparkles size={17} className="text-brand" /> 오늘의 AI 질문</h2>
              <span className="text-[.72rem] text-ink-4">{data ? `${shortDate(data.date)} · ${data.timeZone === "Asia/Seoul" ? "한국 시간" : data.timeZone} 기준` : "사용량 확인 중"}</span>
            </div>
            <dl className="mt-5 grid grid-cols-3 divide-x divide-brand/10">
              {[{ label: "질문 완료", value: usage?.completed }, { label: "남은 질문", value: usage?.remaining }, { label: "일일 한도", value: usage?.limit }].map(({ label, value }) => (
                <div key={label} className="px-2 first:pl-0 sm:px-4">
                  <dt className="text-[.72rem] font-semibold text-ink-3 sm:text-[.8rem]">{label}</dt>
                  <dd className="figure mt-2 text-[1.65rem] font-bold text-brand-dark sm:text-[2rem]">{number(value)}<span className="ml-1 text-[.72rem] font-medium text-ink-4">회</span></dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-brand/10" role="progressbar" aria-label="오늘 질문 한도 사용률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usage ? Math.round(usedPercent) : undefined}>
              <div className="h-full rounded-full bg-brand/70 transition-[width] duration-300" style={{ width: `${usedPercent}%` }} />
            </div>
            <p className="mt-3 text-[.73rem] leading-5 text-ink-4">{pending > 0 ? `답변 대기 중인 질문 ${pending}회가 남은 횟수에 반영되어 있어요. 실패하거나 취소되면 반환됩니다.` : "직접 보낸 질문만 차감되며, 이어서 학습하기는 횟수에 포함되지 않아요."}</p>
          </section>

          <section aria-labelledby="learning-history-title" aria-busy={loading}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="learning-history-title" className="font-learning text-xl font-bold">질문으로 보는 나의 학습</h2>
              <div className="flex gap-1 rounded-xl bg-surface-3 p-1" aria-label="통계 기간">
                {([7, 30] as const).map((period) => <button key={period} type="button" aria-pressed={days === period} onClick={() => { setDays(period); setShowAllCourses(false); }} className={cn("min-h-10 rounded-lg px-4 text-[.78rem] font-bold transition", days === period ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>최근 {period}일</button>)}
              </div>
            </div>
            {!history ? (
              <div role="status" className="mt-5 rounded-[16px] border border-dashed border-line px-5 py-16 text-center text-sm text-ink-4">{error ? "기록을 다시 불러오면 통계를 볼 수 있어요." : "나의 학습 기록을 불러오고 있어요…"}</div>
            ) : <>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4">
                {[{ label: "완료한 질문", value: `${number(history.total)}회` }, { label: "질문한 날", value: `${history.activeDays}일` }, { label: "학습한 과목", value: `${history.courseCount}개` }].map(({ label, value }) => <div key={label}><dt className="text-[.72rem] text-ink-4">{label}</dt><dd className="figure mt-1 text-lg font-bold sm:text-xl">{value}</dd></div>)}
              </dl>
              {history.total === 0 && <div className="mt-5 rounded-xl bg-surface-2 px-5 py-5 text-sm leading-6 text-ink-3">
                최근 {days}일 동안 완료한 질문이 아직 없어요. 궁금한 내용을 질문하면 이곳에 학습 기록이 쌓여요.
                <Link href="/learn" className="mt-2 flex min-h-10 w-fit items-center gap-1 font-bold text-brand">학습 시작하기 <ArrowUpRight size={15} /></Link>
              </div>}
              <DailyQuestions days={days} history={history} />
              <section className="mt-5 rounded-[16px] border border-line bg-surface/80 p-5 sm:p-6" aria-labelledby="course-questions-title">
                <h3 id="course-questions-title" className="text-[.95rem] font-bold">어떤 과목에 많이 질문했을까요?</h3>
                <p className="mt-1 text-[.76rem] leading-5 text-ink-4">{busiestCourse ? `${busiestCourse.title}에 ${busiestCourse.count}회 질문했어요. 전체 질문의 ${Math.round(busiestCourse.count / history.total * 100)}%예요.` : "과목별 질문 비중이 여기에 표시돼요."}</p>
                <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(showAllCourses ? history.byCourse : history.byCourse.slice(0, 6)).map((course, index) => {
                    const percent = course.count / history.total * 100;
                    return <li key={course.id} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface-2/50 p-4">
                      <div className="mb-4 min-w-0 text-[.82rem]"><span className="text-[.69rem] text-ink-4">{course.subjectTitle}</span><p className="mt-1 break-words font-semibold">{course.title}</p></div>
                      <div className="figure mb-2 mt-auto flex items-center justify-between gap-3">
                        <span className="text-[.82rem] font-bold">{course.count}회</span>
                        <span className="text-[.7rem] text-ink-4">{Math.round(percent)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: chartColors[index % chartColors.length] }} /></div>
                    </li>;
                  })}
                </ol>
                {history.byCourse.length > 6 && <button type="button" aria-expanded={showAllCourses} onClick={() => setShowAllCourses((value) => !value)} className="mt-5 min-h-11 w-full rounded-lg border border-line text-[.78rem] font-semibold text-brand hover:bg-brand-page">{showAllCourses ? "상위 6개 과목만 보기" : `전체 ${history.byCourse.length}개 과목 보기`}</button>}
              </section>
              <p className="mt-3 text-[.7rem] leading-5 text-ink-4">질문을 보낸 날짜를 기준으로 답변이 완료된 기록을 집계해요. 실패·취소·답변 대기 중인 질문은 통계에 포함되지 않아요.</p>
            </>}
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-[16px] border border-line bg-surface/80 p-5">
            <div className="flex items-center gap-3 border-b border-line pb-5"><span className="font-learning grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-xl font-bold text-brand-dark">{user.name.slice(0, 1)}</span><div><h2 className="text-lg font-bold">{user.name}</h2><p className="mt-0.5 text-[.74rem] text-ink-4">{user.externalId} · {user.role === "TEACHER" ? "선생님" : "학생"}</p></div></div>
            <dl className="mt-4 space-y-4">
              {[{ icon: School, label: "소속 학교", value: user.schoolName }, { icon: GraduationCap, label: "공식 학년", value: grade(user.officialGrade) }, { icon: BookOpenCheck, label: "현재 학습 학년", value: grade(user.learningGrade ?? user.officialGrade) }].map(({ icon: Icon, label, value }) => <div key={label}><dt className="flex items-center gap-2 text-[.72rem] text-ink-4"><Icon size={14} />{label}</dt><dd className="mt-1.5 break-words text-[.84rem] font-semibold">{value}</dd></div>)}
            </dl>
          </section>
          <section className="rounded-[16px] bg-surface-2 p-5">
            <LockKeyhole size={19} className="text-brand" />
            <h2 className="mt-3 text-[.9rem] font-bold">내 대화는 나에게만</h2>
            <p className="mt-2 text-[.78rem] leading-6 text-ink-3">이 통계는 질문 내용이 아닌 사용 횟수로 만들어요. 일반 질문과 AI 답변은 서버에 저장하지 않습니다.</p>
            <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer py-1 text-[.76rem] font-semibold text-brand">학습 데이터 보관 안내</summary><p className="mt-2 text-[.75rem] leading-6 text-ink-4">단원별 사용 횟수, 모델 토큰과 예상 비용을 운영 목적으로 기록해요. 직접 고른 답변만 학습 북마크에 남으며, 관리자와 교사는 북마크 내용을 볼 수 없어요.</p></details>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DailyQuestions({ days, history }: { days: UsagePeriod; history: StudentUsageInsights["history"] }) {
  const maximum = Math.max(0, ...history.dailyTrend.map((day) => day.count));
  const scale = Math.max(1, maximum);
  return <figure className="mt-5 rounded-[16px] border border-line bg-surface/80 p-5 sm:p-6">
    <figcaption className="flex items-center gap-2 text-[.95rem] font-bold"><CalendarDays size={16} className="text-brand" /> 날짜별 질문 횟수</figcaption>
    <p className="mt-1 text-[.74rem] text-ink-4">{shortDate(history.dailyTrend[0].date)}–{shortDate(history.dailyTrend.at(-1)!.date)} · 가장 많이 질문한 날 {maximum}회</p>
    <ol className="mt-6 flex h-36 items-end gap-1 sm:gap-2" aria-label={`최근 ${days}일의 날짜별 질문 횟수`}>
      {history.dailyTrend.map((day, index) => <li key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${day.date}: ${day.count}회`}>
        <span className="sr-only">{day.date}: {day.count}회</span>
        <div className="flex min-h-0 w-full flex-1 items-end justify-center border-b border-line" aria-hidden="true">
          <div className={cn("relative w-full max-w-10 rounded-t-[4px]", day.count ? "bg-brand/65" : "bg-surface-3")} style={{ height: day.count ? `${Math.max(4, day.count / scale * 85)}%` : "2px" }}>
            {days === 7 && day.count > 0 && <span className="figure absolute -top-5 left-1/2 -translate-x-1/2 text-[.68rem] font-semibold text-brand-dark">{day.count}</span>}
          </div>
        </div>
        <span aria-hidden="true" className="figure mt-2 h-4 whitespace-nowrap text-[.6rem] text-ink-4">{days === 7 || index === 0 || index === days - 1 || index % 5 === 0 ? shortDate(day.date) : ""}</span>
      </li>)}
    </ol>
    <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer text-[.73rem] text-ink-4">날짜별 숫자 보기</summary><dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">{history.dailyTrend.map((day) => <div key={day.date} className="flex justify-between gap-2 text-[.72rem]"><dt className="text-ink-4">{shortDate(day.date)}</dt><dd className="figure font-semibold">{day.count}회</dd></div>)}</dl></details>
  </figure>;
}

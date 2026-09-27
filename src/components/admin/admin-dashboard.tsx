"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Download, RefreshCw } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dateRange, summarizeSchoolUsage, type SchoolUsageData } from "@/features/usage/school-insights";
import { cn, formatNumber, formatUsd } from "@/lib/utils";

const control = "min-h-10 rounded-lg border border-line bg-surface px-3 text-sm";
const shiftDate = (date: string, days: number) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
const roleName = (role: string) => role === "STUDENT" ? "학생" : "교사";
const change = (current: number, previous: number) => previous ? `${((current - previous) / previous * 100) >= 0 ? "+" : ""}${((current - previous) / previous * 100).toFixed(1)}%` : current ? "비교 기간 사용 없음" : "변동 없음";

export function AdminDashboard() {
  const [data, setData] = useState<SchoolUsageData | null>(null);
  const [period, setPeriod] = useState<{ days: number; start?: string; end?: string }>({ days: 30 });
  const [draft, setDraft] = useState({ start: "", end: "" });
  const [filters, setFilters] = useState({ role: "ALL", grade: "ALL", subject: "ALL" });
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [updated, setUpdated] = useState("");
  const [search, setSearch] = useState("");
  const [rankingRole, setRankingRole] = useState("STUDENT");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setLoading(true);
      try {
        const query = period.start && period.end ? `start=${period.start}&end=${period.end}` : `days=${period.days}`;
        const response = await fetch(`/api/admin/metrics?${query}`, { cache: "no-store", signal: current.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? "통계 조회 권한 또는 연결 상태를 확인해 주세요.");
        if (active && !current.signal.aborted) {
          setData(result);
          setError("");
          setUpdated(new Intl.DateTimeFormat("ko-KR", { timeZone: result.timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
        }
      } catch (reason) {
        if (active && !current.signal.aborted) setError(reason instanceof Error ? reason.message : "통계를 불러오지 못했습니다.");
      } finally {
        if (active && !current.signal.aborted) setLoading(false);
      }
    }
    const initial = window.setTimeout(() => void refresh(), 0);
    const onVisible = () => { if (auto && document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(onVisible, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; controller?.abort(); clearTimeout(initial); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [period, attempt, auto]);

  const metrics = useMemo(() => data ? summarizeSchoolUsage(data, filters) : null, [data, filters]);
  const previous = useMemo(() => {
    if (!data) return null;
    const days = dateRange(data.start, data.end).length;
    return summarizeSchoolUsage({ ...data, start: shiftDate(data.start, -days), end: shiftDate(data.start, -1) }, filters);
  }, [data, filters]);
  const subjects = useMemo(() => [...new Set(data?.activities.map((row) => row.subject))].sort((a, b) => a.localeCompare(b, "ko")), [data]);
  const people = metrics?.people.filter((user) => user.role === rankingRole && user.name.includes(search.trim())) ?? [];
  const pages = Math.max(1, Math.ceil(people.length / 15));
  const currentPage = Math.min(page, pages);
  const selected = metrics?.people.find((user) => user.id === selectedUser);
  const selectedDaily = useMemo(() => {
    if (!data || !selectedUser) return [];
    const daily = new Map(dateRange(data.start, data.end).map((date) => [date, 0]));
    for (const row of data.activities) if (row.userId === selectedUser && row.status === "SUCCEEDED" && daily.has(row.date) && (filters.subject === "ALL" || row.subject === filters.subject)) daily.set(row.date, daily.get(row.date)! + row.requests);
    return [...daily].map(([date, requests]) => ({ date, requests }));
  }, [data, selectedUser, filters.subject]);

  function exportCsv() {
    if (!metrics || !data) return;
    const cell = (value: unknown) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const rows: unknown[][] = [["조회 시작", data.start, "조회 종료", data.end, "시간대", data.timeZone], ["역할", filters.role, "학년", filters.grade, "과목", filters.subject], ["사용자 ID", "이름", "역할", "학년", "성공 요청", "활동일", "토큰", "예상 텍스트 비용 USD"], ...metrics.people.map((user) => [user.id, user.name, roleName(user.role), user.grade ?? "", user.requests, user.activeDays, user.tokens, user.cost]), [], ["날짜", "학생 요청", "교사 요청", "합계"], ...metrics.dailyTrend.map((row) => [row.date, row.students, row.teachers, row.requests]), [], ["시간", "학생 요청", "교사 요청", "합계"], ...metrics.hourly.map((row) => [row.hour, row.students, row.teachers, row.requests])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `학교-사용현황-${data.start}-${data.end}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const heatMax = Math.max(1, ...metrics?.heatmap.flat() ?? []);
  return <div className="mx-auto max-w-[1600px] space-y-7 px-4 py-8 sm:px-7 lg:px-10">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-7">
      <div><p className="flex items-center gap-2 text-sm font-bold text-brand"><Activity size={16} />학교 운영 데이터</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">학교 사용 현황</h1><p className="mt-3 text-sm text-ink-3">교사와 학생의 이용 추이부터 요청 상태까지, 학교 AI 사용 모니터링</p></div>
      <div className="flex flex-wrap items-center gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} />60초 자동 갱신</label><button className={control} onClick={() => setAttempt((value) => value + 1)} disabled={loading} aria-label="통계 새로고침"><RefreshCw size={16} className={cn(loading && "animate-spin")} /></button><button className={cn(control, "flex items-center gap-2 disabled:opacity-40")} disabled={!data?.available || loading || !!error} onClick={exportCsv}><Download size={16} />CSV 내보내기</button></div>
    </header>
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-5" aria-label="통계 조회 조건">
      <div className="flex flex-wrap items-center gap-2">{[1, 7, 30, 90].map((days) => <button key={days} aria-pressed={!period.start && period.days === days} className={cn(control, !period.start && period.days === days && "bg-brand-soft font-bold text-brand")} onClick={() => { setData(null); setPeriod({ days }); setPage(1); setDateError(""); }}>{days === 1 ? "오늘" : `최근 ${days}일`}</button>)}<span className="mx-2 text-xs text-ink-4">직접 지정 · 최대 93일</span><input aria-label="조회 시작일" className={control} type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /><span>~</span><input aria-label="조회 종료일" className={control} type="date" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /><button className={control} onClick={() => { try { dateRange(draft.start, draft.end); setDateError(""); setData(null); setPage(1); setPeriod({ days: 0, ...draft }); } catch (reason) { setDateError((reason as Error).message); } }}>기간 적용</button></div>
      {dateError && <p role="alert" className="text-sm text-warn">{dateError}</p>}
      <div className="flex flex-wrap items-center gap-3"><select aria-label="사용자 역할" className={control} value={filters.role} onChange={(event) => { setFilters({ ...filters, role: event.target.value, grade: "ALL" }); setPage(1); }}><option value="ALL">교사 + 학생</option><option value="STUDENT">학생</option><option value="TEACHER">교사</option></select><select aria-label="학생 학년" className={control} disabled={filters.role === "TEACHER"} value={filters.grade} onChange={(event) => { setFilters({ ...filters, grade: event.target.value }); setPage(1); }}><option value="ALL">전체 학년</option>{[1, 2, 3].map((grade) => <option key={grade} value={grade}>{grade}학년 학생</option>)}</select><select aria-label="과목" className={control} value={filters.subject} onChange={(event) => { setFilters({ ...filters, subject: event.target.value }); setPage(1); }}><option value="ALL">전체 과목</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select><p className="text-xs text-ink-4" aria-live="polite">{loading ? "통계 갱신 중…" : data ? `${data.start} ~ ${data.end} · ${data.timeZone} · ${updated} 갱신` : ""}</p></div>
    </section>
    {error && <div role="alert" className="rounded-xl border border-warn p-4 text-sm text-warn">{error}{data && " 아래는 마지막으로 성공한 조회 결과입니다."}<button className="ml-3 underline" onClick={() => setAttempt((value) => value + 1)}>다시 시도</button></div>}
    {!data && loading && <p role="status" className="py-16 text-center text-ink-4">학교 사용 기록을 집계하고 있습니다.</p>}
    {data && !data.available && <Panel title="실제 통계 연결이 필요합니다" note="데이터베이스가 연결되지 않아 운영 기록을 조회할 수 없습니다. 예시 수치는 표시하지 않습니다." />}
    {data?.available && metrics && previous && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="성공한 AI 요청" value={`${formatNumber(metrics.total)}건`} note={`직전 동일 길이 기간 대비 ${change(metrics.total, previous.total)}`} />
        {metrics.roles.map((role) => <Metric key={role.role} label={`이용 ${roleName(role.role)}`} value={`${role.active}명`} note={`성공 요청 ${formatNumber(role.requests)}건 · 활성 계정 ${role.registered}명 중 ${role.activeRegistered}명 (${role.rate === null ? "—" : `${role.rate.toFixed(1)}%`})`} />)}
        <Metric label="가장 많이 사용하는 시간" value={metrics.total ? `${metrics.busiestHour.hour}시 ~ ${metrics.busiestHour.hour + 1}시` : "—"} note={`선택 기간 누적 ${formatNumber(metrics.busiestHour.requests)}건`} />
      </section>
      <Panel title="요청 상태 모니터링" note="선택 기간에 시작된 요청의 현재 상태입니다. 실패율 = 실패 ÷ (성공 + 실패), 응답 시간은 성공 요청 중 측정된 기록 기준입니다.">
        <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-6"><Metric label="전체 요청" value={`${formatNumber(metrics.attempts)}건`} /><Metric label="실패율" value={metrics.failureRate === null ? "—" : `${metrics.failureRate.toFixed(1)}%`} note={`실패 ${metrics.failed}건`} /><Metric label="처리 중 / 미완료" value={`${metrics.pending}건`} note="완료 상태가 기록되지 않은 요청" /><Metric label="취소" value={`${metrics.cancelled}건`} /><Metric label="평균 응답 시간" value={metrics.averageLatency === null ? "—" : `${(metrics.averageLatency / 1000).toFixed(1)}초`} note={`최대 ${(metrics.latencyMax / 1000).toFixed(1)}초`} /><Metric label="예상 텍스트 비용" value={formatUsd(metrics.cost)} note="이미지 비용 제외 · 실제 청구와 다름" /></div>
        {metrics.errors.length > 0 && <details className="mt-5 rounded-lg border border-line p-4 text-sm"><summary className="cursor-pointer font-semibold">실패 원인별 집계 ({metrics.failed}건)</summary><ul className="mt-3 space-y-2">{metrics.errors.map((error) => <li key={error.code} className="flex justify-between gap-4"><span className="break-all font-mono text-xs">{error.code}</span><strong className="shrink-0">{error.count}건</strong></li>)}</ul></details>}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4 text-sm" role="status">{metrics.failureRate !== null && metrics.failureRate >= 5 && <span className="rounded-lg bg-[var(--warn-page)] px-3 py-2 text-warn">확인 필요: 실패율 5% 이상 ({metrics.failed}건)</span>}{previous.total > 0 && metrics.total >= previous.total * 2 && <span className="rounded-lg bg-brand-soft px-3 py-2 text-brand">사용량 증가: 직전 기간의 {(metrics.total / previous.total).toFixed(1)}배</span>}<span className="py-2 text-ink-4">화면 내 점검 기준 · 비교 기간 {shiftDate(data.start, -dateRange(data.start, data.end).length)} ~ {shiftDate(data.start, -1)} · 오늘은 진행 중인 날짜입니다.</span></div>
      </Panel>
      {metrics.total === 0 && <p role="status" className="rounded-xl bg-surface-2 p-5 text-sm">선택 조건에 해당하는 성공 요청이 없습니다. 기간이나 필터를 변경해 보세요.</p>}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="일별 이용 추이" note={`학생·교사 성공 요청 · 일평균 ${metrics.average.toFixed(1)}건 · 요청이 없는 날짜도 포함`}><div className="mt-5 h-72"><ResponsiveContainer><AreaChart data={metrics.dailyTrend} margin={{ left: -20, right: 12 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Area name="학생" dataKey="students" stackId="usage" stroke="#245ac1" fill="#245ac1" fillOpacity={0.2} /><Area name="교사" dataKey="teachers" stackId="usage" stroke="#087573" fill="#087573" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div></Panel>
        <Panel title="사용 집중 날짜" note="사용량 상위 5일 · 배수는 선택 기간 일평균 대비"><ol className="mt-4 divide-y divide-line">{metrics.peaks.map((day, index) => <li key={day.date} className="flex items-center justify-between gap-3 py-4 text-sm"><span><span className="mr-3 text-ink-4">{index + 1}</span>{day.date}</span><strong>{formatNumber(day.requests)}건 <span className="ml-2 text-brand">{(day.requests / metrics.average).toFixed(1)}배</span></strong></li>)}</ol><p className="mt-4 text-xs leading-6 text-ink-4">시험 전후 기간을 직접 지정해 집중도를 비교할 수 있습니다. 시험 일정은 연동되어 있지 않아 사용 증가의 원인을 자동 판정하지 않습니다.</p></Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="시간대별 이용량" note="선택 기간의 같은 시간대를 합산합니다."><div className="mt-5 h-64"><ResponsiveContainer><BarChart data={metrics.hourly} margin={{ left: -20 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="hour" tickFormatter={(value) => `${value}시`} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={(label) => `${label}시`} /><Legend /><Bar name="학생" dataKey="students" stackId="usage" fill="#245ac1" /><Bar name="교사" dataKey="teachers" stackId="usage" fill="#087573" /></BarChart></ResponsiveContainer></div></Panel>
        <Panel title="요일 × 시간대 집중도" note="색이 진할수록 성공 요청이 많습니다. 각 칸에 마우스를 올리거나 초점을 맞추면 건수가 표시됩니다."><div className="mt-6 overflow-x-auto"><div className="grid min-w-[510px] gap-1" style={{ gridTemplateColumns: "24px repeat(24, minmax(0, 1fr))" }}><span />{metrics.hourly.map((row) => <span key={row.hour} className="text-center text-[10px] text-ink-4">{row.hour % 3 === 0 ? row.hour : ""}</span>)}{metrics.heatmap.map((hours, day) => <HeatRow key={day} day={day} hours={hours} max={heatMax} />)}</div></div><p className="mt-4 text-xs text-ink-4">누적 건수 기준 · 기간에 포함된 요일 수에 따라 차이가 날 수 있습니다.</p></Panel>
      </div>
      <Panel title="사용자별 상세 현황" note="성공 요청 수 기준 순위입니다. 이용량은 학습 성취도를 의미하지 않습니다.">
        <div className="my-5 flex flex-wrap items-center gap-3">{["STUDENT", "TEACHER"].map((role) => <button key={role} className={cn(control, rankingRole === role && "bg-brand-soft font-bold text-brand")} aria-pressed={rankingRole === role} onClick={() => { setRankingRole(role); setPage(1); setSelectedUser(null); }}>{roleName(role)} 순위</button>)}<input className={control} placeholder="이름으로 검색" aria-label="사용자 이름 검색" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><span className="text-sm text-ink-4">{people.length}명</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-y border-line bg-surface-2 text-ink-4"><tr>{["순위", "이름", "학년", "성공 요청", "활동일", "토큰", "예상 비용"].map((label) => <th className="px-3 py-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{people.slice((currentPage - 1) * 15, currentPage * 15).map((user, index) => <tr key={user.id}><td className="px-3 py-4">{(currentPage - 1) * 15 + index + 1}</td><td className="px-3 py-4"><button className="font-bold text-brand underline underline-offset-4" onClick={() => setSelectedUser(user.id)}>{user.name}</button>{!user.active && <span className="ml-2 text-xs text-ink-4">비활성 계정</span>}</td><td className="px-3 py-4">{user.grade ? `${user.grade}학년` : "—"}</td><td className="px-3 py-4 font-bold">{formatNumber(user.requests)}건</td><td className="px-3 py-4">{user.activeDays}일</td><td className="px-3 py-4">{formatNumber(user.tokens)}</td><td className="px-3 py-4">{formatUsd(user.cost)}</td></tr>)}{!people.length && <tr><td colSpan={7} className="py-10 text-center text-ink-4">조건에 맞는 이용자가 없습니다.</td></tr>}</tbody></table></div>
        <div className="mt-4 flex items-center justify-end gap-3 text-sm"><button className={control} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>이전</button><span>{currentPage} / {pages}</span><button className={control} disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>다음</button></div>
        {selected && <div className="mt-5 rounded-xl border border-line p-4"><div className="flex justify-between"><h3 className="font-bold">{selected.name} · 일별 요청 ({selected.requests}건)</h3><button className="text-sm text-ink-4 underline" onClick={() => setSelectedUser(null)}>닫기</button></div><div className="mt-4 h-48"><ResponsiveContainer><BarChart data={selectedDaily}><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar name="성공 요청" dataKey="requests" fill="#245ac1" /></BarChart></ResponsiveContainer></div></div>}
      </Panel>
      <Panel title="질문이 집중된 단원" note="성공 요청 기준 상위 8개 단원"><div className="mt-4 grid gap-4 sm:grid-cols-2">{metrics.units.map((unit) => <div key={`${unit.subject}:${unit.unit}`} className="flex items-center justify-between gap-3 border-b border-line py-3 text-sm"><span><span className="mr-2 text-ink-4">{unit.subject}</span>{unit.unit}</span><strong className="shrink-0">{formatNumber(unit.requests)}건</strong></div>)}</div></Panel>
      <footer className="space-y-2 text-xs leading-6 text-ink-4"><p>집계 범위: 사용 기록에 저장된 AI 직접 질문 및 이미지 재시도 요청. 이어 묻기, 페이지 열람, 체류 시간, 교사용 콘텐츠 제작 도구는 포함하지 않습니다. 관리자 활동도 제외합니다. 개인 대화 원문은 이 화면에서 조회하지 않습니다.</p><p>이용률: 현재 활성 계정 중 선택 조건에 맞는 성공 요청이 있는 계정 비율입니다. 역할·학년은 현재 사용자 정보 기준이며, 비활성 계정의 과거 요청은 사용량에 포함됩니다. 현재 필터와 조회 기간은 모든 통계에 공통 적용됩니다.</p></footer>
    </>}
  </div>;
}

function Panel({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">{title}</h2><p className="mt-2 text-xs leading-6 text-ink-4">{note}</p>{children}</section>;
}
function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="min-w-0 rounded-xl border border-line bg-surface p-4"><p className="text-xs font-semibold text-ink-4">{label}</p><p className="figure mt-3 text-2xl font-bold tracking-tight">{value}</p>{note && <p className="mt-2 text-xs leading-5 text-ink-4">{note}</p>}</div>;
}
function HeatRow({ day, hours, max }: { day: number; hours: number[]; max: number }) {
  const label = ["월", "화", "수", "목", "금", "토", "일"][day];
  return <><span className="self-center text-xs text-ink-4">{label}</span>{hours.map((count, hour) => <span key={hour} tabIndex={0} role="img" aria-label={`${label}요일 ${hour}시: ${count}건`} title={`${label}요일 ${hour}시: ${count}건`} className="h-6 rounded-sm focus:outline-2 focus:outline-brand" style={{ backgroundColor: count ? `rgba(36, 90, 193, ${0.15 + count / max * 0.85})` : "var(--surface-2)" }} />)}</>;
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Download, Info, RefreshCw } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { actionLabels, dateRange, flagLabels, levelLabels, previousRange, summarizeGroups, summarizeSchoolUsage, summarizeUsers, type ActivityLevel, type SchoolUsageData, type UserFlag, type UserSummary } from "@/features/usage/school-insights";
import { cn, formatNumber, formatUsd } from "@/lib/utils";
import { initialView, PeopleTab, type PeopleView } from "./dashboard-people";
import { Change, LevelBar, Metric, Panel, ShareBars, chip, control, percent, roleColors, roleName } from "./dashboard-ui";

type Tab = "overview" | "STUDENT" | "TEACHER" | "patterns" | "system";
type Role = "STUDENT" | "TEACHER";
type Summary = ReturnType<typeof summarizeSchoolUsage>;
type Alert = { key: string; tone: "danger" | "warn" | "info"; title: string; detail: string; go?: () => void };
const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "개요" }, { key: "STUDENT", label: "학생" }, { key: "TEACHER", label: "교사" },
  { key: "patterns", label: "이용 패턴" }, { key: "system", label: "시스템 상태" },
];
const toneOrder = { danger: 0, warn: 1, info: 2 };

export function AdminDashboard() {
  const [data, setData] = useState<SchoolUsageData | null>(null);
  const [period, setPeriod] = useState<{ days: number; start?: string; end?: string }>({ days: 30 });
  const [draft, setDraft] = useState({ start: "", end: "" });
  const [subject, setSubject] = useState("ALL");
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [updated, setUpdated] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [views, setViews] = useState<Record<Role, PeopleView>>({ STUDENT: initialView, TEACHER: initialView });
  const [pattern, setPattern] = useState({ role: "ALL", grade: "ALL" });

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

  const all = useMemo(() => ({ role: "ALL", grade: "ALL", subject }), [subject]);
  const range = useMemo(() => data ? previousRange(data.start, data.end) : null, [data]);
  const metrics = useMemo(() => data ? summarizeSchoolUsage(data, all) : null, [data, all]);
  const previous = useMemo(() => data && range ? summarizeSchoolUsage({ ...data, start: range.start, end: range.end }, all) : null, [data, range, all]);
  const roster = useMemo(() => data ? summarizeUsers(data, all) : [], [data, all]);
  const groups = useMemo(() => summarizeGroups(roster), [roster]);
  const patternMetrics = useMemo(() => data ? summarizeSchoolUsage(data, { ...pattern, subject }) : null, [data, pattern, subject]);
  const subjects = useMemo(() => [...new Set(data?.activities.map((row) => row.subject))].sort((a, b) => a.localeCompare(b, "ko")), [data]);

  function updateView(role: Role, next: Partial<PeopleView>) { setViews((current) => ({ ...current, [role]: { ...current[role], ...next } })); }
  function openPeople(role: Role, next: Partial<PeopleView>) {
    setViews((current) => ({ ...current, [role]: { ...initialView, sort: current[role].sort, ...next } }));
    setTab(role);
  }
  function changePeriod(next: typeof period) {
    setData(null); setPeriod(next); setDateError("");
    setViews((current) => ({ STUDENT: { ...current.STUDENT, page: 1 }, TEACHER: { ...current.TEACHER, page: 1 } }));
  }

  const alerts = metrics && previous ? buildAlerts(metrics, previous, roster, openPeople, () => setTab("system")) : [];

  function exportCsv() {
    if (!metrics || !data) return;
    const cell = (value: unknown) => `"${String(value ?? "").replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const rows: unknown[][] = [
      ["조회 시작", data.start, "조회 종료", data.end, "시간대", data.timeZone, "과목", subject === "ALL" ? "전체" : subject],
      ["사용자 ID", "학번", "이름", "역할", "학년", "계정", "활동 수준", "점검 표시", "성공 요청", "직전 기간 요청", "활동일", "실패", "마지막 사용", "마지막 로그인", "주 과목", "토큰", "예상 텍스트 비용 USD"],
      ...roster.map((user) => [user.id, user.externalId ?? "", user.name, roleName(user.role), user.grade ?? "", user.active ? "활성" : "비활성", levelLabels[user.level], user.flags.map((flag) => flagLabels[flag]).join(" "), user.requests, user.prevRequests, user.activeDays, user.failed, user.lastAt ?? "", user.lastLoginAt ?? "", user.subjects[0]?.subject ?? "", user.tokens, user.cost]),
      [], ["구분", "활성 계정", "이용자", "이용률 %", "성공 요청", "직전 기간 요청", "이용자 1인당"],
      ...groups.map((group) => [group.label, group.registered, group.using, group.rate?.toFixed(1) ?? "", group.requests, group.prevRequests, group.perUser.toFixed(1)]),
      [], ["날짜", "학생 요청", "교사 요청", "합계"], ...metrics.dailyTrend.map((row) => [row.date, row.students, row.teachers, row.requests]),
      [], ["시간", "학생 요청", "교사 요청", "합계"], ...metrics.hourly.map((row) => [row.hour, row.students, row.teachers, row.requests]),
    ];
    const url = URL.createObjectURL(new Blob(["﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `학교-사용현황-${data.start}-${data.end}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const days = range?.days ?? 0;
  const tabBadge: Partial<Record<Tab, number>> = {
    STUDENT: roster.filter((user) => user.role === "STUDENT" && user.flags.some((flag) => flag === "DROPPED" || flag === "FAILURES")).length,
    TEACHER: roster.filter((user) => user.role === "TEACHER" && user.flags.some((flag) => flag === "DROPPED" || flag === "FAILURES")).length,
    system: metrics && metrics.failureRate !== null && metrics.failureRate >= 5 ? 1 : 0,
  };

  return <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-7 lg:px-10">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="flex items-center gap-2 text-sm font-bold text-brand"><Activity size={16} />학교 운영 데이터</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">학교 사용 현황</h1><p className="mt-3 text-sm text-ink-3">점검이 필요한 항목부터 학생·교사 한 명 한 명의 이용 현황까지 모니터링합니다.</p></div>
      <div className="flex flex-wrap items-center gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} />60초 자동 갱신</label><button type="button" className={control} onClick={() => setAttempt((value) => value + 1)} disabled={loading} aria-label="통계 새로고침"><RefreshCw size={16} className={cn(loading && "animate-spin")} /></button><button type="button" className={cn(control, "flex items-center gap-2 disabled:opacity-40")} disabled={!data?.available || loading || !!error} onClick={exportCsv}><Download size={16} />CSV 내보내기</button></div>
    </header>

    <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4" aria-label="통계 조회 조건">
      {[1, 7, 30, 90].map((value) => <button type="button" key={value} className={chip} aria-pressed={!period.start && period.days === value} onClick={() => changePeriod({ days: value })}>{value === 1 ? "오늘" : `최근 ${value}일`}</button>)}
      <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
      <input aria-label="조회 시작일" className={control} type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /><span className="text-ink-4">~</span><input aria-label="조회 종료일" className={control} type="date" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} />
      <button type="button" className={cn(chip, period.start && "border-brand bg-brand-soft font-bold text-brand-dark")} onClick={() => { try { dateRange(draft.start, draft.end); changePeriod({ days: 0, ...draft }); } catch (reason) { setDateError((reason as Error).message); } }}>기간 적용</button>
      <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
      <select aria-label="과목" className={control} value={subject} onChange={(event) => setSubject(event.target.value)}><option value="ALL">전체 과목</option>{subjects.map((name) => <option key={name}>{name}</option>)}</select>
      <p className="ml-auto text-xs text-ink-4" aria-live="polite">{loading ? "통계 갱신 중…" : data ? `${data.start} ~ ${data.end} (${days}일) · 비교 ${range?.start} ~ ${range?.end} · ${updated} 갱신` : ""}</p>
      {dateError && <p role="alert" className="w-full text-sm text-warn">{dateError} <span className="text-ink-4">최대 93일까지 지정할 수 있습니다.</span></p>}
    </section>

    {error && <div role="alert" className="rounded-xl border border-warn p-4 text-sm text-warn">{error}{data && " 아래는 마지막으로 성공한 조회 결과입니다."}<button type="button" className="ml-3 underline" onClick={() => setAttempt((value) => value + 1)}>다시 시도</button></div>}
    {!data && loading && <p role="status" className="py-16 text-center text-ink-4">학교 사용 기록을 집계하고 있습니다.</p>}
    {data && !data.available && <Panel title="실제 통계 연결이 필요합니다" note="데이터베이스가 연결되지 않아 운영 기록을 조회할 수 없습니다. 예시 수치는 표시하지 않습니다." />}

    {data?.available && metrics && previous && patternMetrics && <>
      <nav className="flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--line)]" role="tablist" aria-label="통계 보기">
        {tabs.map((item) => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={cn("flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition", tab === item.key ? "border-brand text-brand-dark" : "border-transparent text-ink-4 hover:text-ink")} onClick={() => setTab(item.key)}>
          {item.label}{!!tabBadge[item.key] && <span className="rounded-full bg-[var(--danger-page)] px-1.5 text-[11px] font-bold text-danger" aria-label={`점검 ${tabBadge[item.key]}건`}>{tabBadge[item.key]}</span>}
        </button>)}
      </nav>

      {tab === "overview" && <Overview metrics={metrics} previous={previous} groups={groups} alerts={alerts} onGroup={(key) => key === "TEACHER" ? openPeople("TEACHER", {}) : openPeople("STUDENT", { grade: key === "G0" ? "ALL" : key.slice(1) })} />}
      {(tab === "STUDENT" || tab === "TEACHER") && <PeopleTab key={tab} role={tab} data={data} roster={roster} view={views[tab]} onView={(next) => updateView(tab, next)} subject={subject} days={days} />}
      {tab === "patterns" && <Patterns metrics={patternMetrics} filter={pattern} onFilter={setPattern} />}
      {tab === "system" && <SystemStatus metrics={metrics} roster={roster} onPerson={(user) => openPeople(user.role === "TEACHER" ? "TEACHER" : "STUDENT", { selected: user.id, flag: "FAILURES" })} />}

      <footer className="space-y-2 border-t border-line pt-5 text-xs leading-6 text-ink-4">
        <p>집계 범위: 사용 기록에 저장된 AI 직접 질문 및 이미지 재시도 요청. 이어 묻기, 페이지 열람, 체류 시간, 교사용 콘텐츠 제작 도구는 포함하지 않습니다. 관리자 활동도 제외합니다. 개인 대화 원문은 이 화면에서 조회하지 않습니다.</p>
        <p>이용률: 현재 활성 계정 중 선택 조건에 맞는 성공 요청이 있는 계정 비율입니다. 역할·학년은 현재 사용자 정보 기준이며, 비활성 계정의 과거 요청은 사용량에 포함됩니다. 직전 기간은 조회 기간과 같은 길이의 바로 앞 기간이며, 오늘은 진행 중인 날짜입니다.</p>
      </footer>
    </>}
  </div>;
}

function buildAlerts(metrics: Summary, previous: Summary, roster: UserSummary[], openPeople: (role: Role, next: Partial<PeopleView>) => void, openSystem: () => void) {
  const alerts: Alert[] = [];
  if (metrics.failureRate !== null && metrics.failureRate >= 5) alerts.push({ key: "failure", tone: "danger", title: `요청 실패율 ${percent(metrics.failureRate)}`, detail: `실패 ${formatNumber(metrics.failed)}건 · 점검 기준 5% 이상`, go: openSystem });
  const rules: { flag?: UserFlag; level?: ActivityLevel; tone: Alert["tone"]; detail: string }[] = [
    { flag: "FAILURES", tone: "danger", detail: "선택 기간 실패 요청이 3건 이상입니다." },
    { flag: "DROPPED", tone: "warn", detail: "직전 기간 5건 이상에서 30% 이하로 줄었습니다." },
    { level: "NONE", tone: "warn", detail: "활성 계정이지만 선택 기간 성공 요청이 없습니다." },
    { flag: "NEVER_LOGGED_IN", tone: "info", detail: "활성 계정이지만 로그인한 기록이 없습니다." },
    { flag: "SURGE", tone: "info", detail: "20건 이상이면서 직전 기간의 3배 이상입니다." },
  ];
  for (const role of ["STUDENT", "TEACHER"] as Role[]) {
    const members = roster.filter((user) => user.role === role && user.active);
    for (const rule of rules) {
      const count = members.filter((user) => rule.flag ? user.flags.includes(rule.flag) : user.level === rule.level).length;
      if (!count) continue;
      const name = rule.flag ? flagLabels[rule.flag] : levelLabels[rule.level!];
      const tone = role === "TEACHER" && rule.tone === "warn" ? "info" : rule.tone;
      const detail = rule.level ? `${rule.detail} (활성 ${roleName(role)} ${members.length}명 중)` : rule.detail;
      alerts.push({ key: `${role}:${name}`, tone, title: `${name} ${roleName(role)} ${count}명`, detail, go: () => openPeople(role, rule.flag ? { flag: rule.flag } : { level: rule.level }) });
    }
  }
  if (metrics.pending > 0) alerts.push({ key: "pending", tone: "info", title: `완료 기록이 없는 요청 ${formatNumber(metrics.pending)}건`, detail: "처리 중이거나 중간에 끊긴 요청입니다.", go: openSystem });
  if (previous.total > 0 && metrics.total >= previous.total * 2) alerts.push({ key: "surge", tone: "info", title: `전체 사용량 ${(metrics.total / previous.total).toFixed(1)}배 증가`, detail: `직전 기간 ${formatNumber(previous.total)}건 → ${formatNumber(metrics.total)}건` });
  if (previous.total >= 20 && metrics.total <= previous.total * 0.5) alerts.push({ key: "drop", tone: "warn", title: `전체 사용량 ${((1 - metrics.total / previous.total) * 100).toFixed(0)}% 감소`, detail: `직전 기간 ${formatNumber(previous.total)}건 → ${formatNumber(metrics.total)}건` });
  return alerts.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);
}

function Overview({ metrics, previous, groups, alerts, onGroup }: { metrics: Summary; previous: Summary; groups: ReturnType<typeof summarizeGroups>; alerts: Alert[]; onGroup: (key: string) => void }) {
  const role = (key: Role) => metrics.roles.find((item) => item.role === key)!;
  const before = (key: Role) => previous.roles.find((item) => item.role === key)!;
  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="성공한 AI 요청" value={`${formatNumber(metrics.total)}건`} note={<>직전 기간 대비 <Change current={metrics.total} previous={previous.total} /> · 일평균 {metrics.average.toFixed(1)}건</>} />
      {(["STUDENT", "TEACHER"] as Role[]).map((key) => <Metric key={key} label={`${roleName(key)} 이용률`} value={percent(role(key).rate)} note={<>{role(key).activeRegistered} / {role(key).registered}명 이용 · 직전 {percent(before(key).rate)}<br />성공 요청 {formatNumber(role(key).requests)}건</>} />)}
      <Metric label="요청 실패율" value={percent(metrics.failureRate)} tone={metrics.failureRate !== null && metrics.failureRate >= 5 ? "danger" : undefined} note={`실패 ${formatNumber(metrics.failed)}건 · 평균 응답 ${metrics.averageLatency === null ? "—" : `${(metrics.averageLatency / 1000).toFixed(1)}초`}`} />
    </section>

    <Panel title="점검이 필요한 항목" note="항목을 누르면 해당하는 학생·교사 명단으로 이동합니다.">
      {alerts.length ? <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{alerts.map((alert) => <li key={alert.key}><AlertCard alert={alert} /></li>)}</ul>
        : <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--ok-page)] p-4 text-sm text-ok"><CheckCircle2 size={17} />선택 기간에 점검 기준에 걸린 항목이 없습니다.</p>}
    </Panel>

    <Panel title="학년·교사별 요약" note="행을 누르면 명단으로 이동합니다. 활동 분포 막대는 활발·보통·저조·미사용 인원 비율입니다.">
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-y border-line bg-surface-2 text-xs text-ink-4"><tr>{["구분", "활성 계정", "이용자 (이용률)", "활동 분포", "성공 요청", "직전 대비", "이용자 1인당"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{groups.map((group) => <tr key={group.key} className="cursor-pointer hover:bg-brand-page" onClick={() => onGroup(group.key)}>
          <td className="px-3 py-3"><button type="button" className="font-bold text-brand-dark hover:underline" onClick={(event) => { event.stopPropagation(); onGroup(group.key); }}>{group.label}</button></td>
          <td className="px-3 py-3 tabular-nums">{group.registered}명</td>
          <td className="px-3 py-3 tabular-nums">{group.using}명 <span className="text-ink-4">({percent(group.rate)})</span></td>
          <td className="w-48 px-3 py-3"><LevelBar levels={group.levels} /><span className="mt-1 block text-[11px] text-ink-4">미사용 {group.levels.NONE}명 · 저조 {group.levels.LOW}명</span></td>
          <td className="px-3 py-3 font-bold tabular-nums">{formatNumber(group.requests)}건</td>
          <td className="px-3 py-3 text-xs tabular-nums"><Change current={group.requests} previous={group.prevRequests} /></td>
          <td className="px-3 py-3 tabular-nums">{group.perUser.toFixed(1)}건</td>
        </tr>)}</tbody>
      </table></div>
    </Panel>

    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <Panel title="일별 이용 추이" note="학생·교사 성공 요청 · 요청이 없는 날짜도 포함"><div className="mt-5 h-72"><ResponsiveContainer><AreaChart data={metrics.dailyTrend} margin={{ left: -20, right: 12 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Area name="학생" dataKey="students" stackId="usage" stroke={roleColors.STUDENT} fill={roleColors.STUDENT} fillOpacity={0.2} /><Area name="교사" dataKey="teachers" stackId="usage" stroke={roleColors.TEACHER} fill={roleColors.TEACHER} fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div></Panel>
      <Panel title="사용 집중 날짜" note="사용량 상위 5일 · 배수는 선택 기간 일평균 대비">
        {metrics.peaks.length ? <ol className="mt-4 divide-y divide-line">{metrics.peaks.map((day, index) => <li key={day.date} className="flex items-center justify-between gap-3 py-3.5 text-sm"><span><span className="mr-3 text-ink-4">{index + 1}</span>{day.date}</span><strong className="tabular-nums">{formatNumber(day.requests)}건 <span className="ml-2 text-brand">{(day.requests / metrics.average).toFixed(1)}배</span></strong></li>)}</ol> : <p className="mt-4 text-sm text-ink-4">성공 요청이 없습니다.</p>}
        <p className="mt-4 text-xs leading-6 text-ink-4">시험 일정은 연동되어 있지 않아 사용 증가의 원인을 자동 판정하지 않습니다.</p>
      </Panel>
    </div>
  </div>;
}

function AlertCard({ alert }: { alert: Alert }) {
  const Icon = alert.tone === "info" ? Info : AlertTriangle;
  const body = <>
    <Icon size={18} className={cn("mt-0.5 shrink-0", alert.tone === "danger" ? "text-danger" : alert.tone === "warn" ? "text-warn" : "text-brand")} />
    <span className="min-w-0 flex-1"><strong className="block text-sm">{alert.title}</strong><span className="mt-1 block text-xs leading-5 text-ink-4">{alert.detail}</span></span>
    {alert.go && <ArrowRight size={16} className="mt-0.5 shrink-0 text-ink-4" />}
  </>;
  const className = cn("flex h-full w-full items-start gap-3 rounded-xl border p-4 text-left transition", alert.tone === "danger" ? "border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-page)]" : alert.tone === "warn" ? "border-[color-mix(in_srgb,var(--warn)_30%,white)] bg-[var(--warn-page)]" : "border-line bg-surface-2", alert.go && "hover:border-brand");
  return alert.go ? <button type="button" className={className} onClick={alert.go}>{body}</button> : <div className={className}>{body}</div>;
}

function Patterns({ metrics, filter, onFilter }: { metrics: Summary; filter: { role: string; grade: string }; onFilter: (next: { role: string; grade: string }) => void }) {
  const heatMax = Math.max(1, ...metrics.heatmap.flat());
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="이용 패턴 대상">
      {[["ALL", "교사 + 학생"], ["STUDENT", "학생"], ["TEACHER", "교사"]].map(([value, text]) => <button key={value} type="button" className={chip} aria-pressed={filter.role === value} onClick={() => onFilter({ role: value, grade: "ALL" })}>{text}</button>)}
      {filter.role === "STUDENT" && <select aria-label="학년" className={control} value={filter.grade} onChange={(event) => onFilter({ ...filter, grade: event.target.value })}><option value="ALL">전체 학년</option>{[1, 2, 3].map((grade) => <option key={grade} value={grade}>{grade}학년</option>)}</select>}
      <span className="text-sm text-ink-4">성공 요청 {formatNumber(metrics.total)}건 기준</span>
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="시간대별 이용량" note={metrics.total ? `선택 기간의 같은 시간대를 합산합니다. 가장 많은 시간 ${metrics.busiestHour.hour}시 ~ ${metrics.busiestHour.hour + 1}시 (${formatNumber(metrics.busiestHour.requests)}건)` : "선택 기간의 같은 시간대를 합산합니다."}><div className="mt-5 h-64"><ResponsiveContainer><BarChart data={metrics.hourly} margin={{ left: -20 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="hour" tickFormatter={(value) => `${value}시`} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={(label) => `${label}시`} /><Legend /><Bar name="학생" dataKey="students" stackId="usage" fill={roleColors.STUDENT} /><Bar name="교사" dataKey="teachers" stackId="usage" fill={roleColors.TEACHER} /></BarChart></ResponsiveContainer></div></Panel>
      <Panel title="요일 × 시간대 집중도" note="색이 진할수록 성공 요청이 많습니다. 칸에 마우스를 올리거나 초점을 맞추면 건수가 표시됩니다."><div className="mt-6 overflow-x-auto"><div className="grid min-w-[510px] gap-1" style={{ gridTemplateColumns: "24px repeat(24, minmax(0, 1fr))" }}><span />{metrics.hourly.map((row) => <span key={row.hour} className="text-center text-[10px] text-ink-4">{row.hour % 3 === 0 ? row.hour : ""}</span>)}{metrics.heatmap.map((hours, day) => <HeatRow key={day} day={day} hours={hours} max={heatMax} />)}</div></div><p className="mt-4 text-xs text-ink-4">누적 건수 기준 · 기간에 포함된 요일 수에 따라 차이가 날 수 있습니다.</p></Panel>
    </div>
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel title="과목별 이용" note="성공 요청 기준"><div className="mt-5"><ShareBars items={metrics.subjects.map((item) => ({ key: item.subject, label: <>{item.subject} <span className="text-xs text-ink-4">학생 {formatNumber(item.students)} · 교사 {formatNumber(item.teachers)}</span></>, value: item.requests }))} /></div></Panel>
      <Panel title="요청 유형" note="질문 답변·더 쉽게·원리까지·전체 풀이·확인 문제"><div className="mt-5"><ShareBars items={metrics.actions.map((item) => ({ key: item.action, label: actionLabels[item.action] ?? item.action, value: item.requests }))} /></div></Panel>
      <Panel title="질문이 집중된 단원" note="성공 요청 기준 상위 10개">{metrics.units.length ? <ol className="mt-4 divide-y divide-line text-sm">{metrics.units.map((unit, index) => <li key={`${unit.subject}:${unit.unit}`} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0 truncate"><span className="mr-2 text-ink-4">{index + 1}</span><span className="mr-1.5 text-xs text-ink-4">{unit.subject}</span>{unit.unit}</span><strong className="shrink-0 tabular-nums">{formatNumber(unit.requests)}건</strong></li>)}</ol> : <p className="mt-4 text-sm text-ink-4">기록이 없습니다.</p>}</Panel>
    </div>
  </div>;
}

function SystemStatus({ metrics, roster, onPerson }: { metrics: Summary; roster: UserSummary[]; onPerson: (user: UserSummary) => void }) {
  const failing = roster.filter((user) => user.failed > 0).sort((a, b) => b.failed - a.failed).slice(0, 10);
  const high = metrics.failureRate !== null && metrics.failureRate >= 5;
  return <div className="space-y-6">
    <Panel title="요청 상태" note="선택 기간에 시작된 요청의 현재 상태입니다. 실패율 = 실패 ÷ (성공 + 실패), 응답 시간은 성공 요청 중 측정된 기록 기준입니다.">
      <div className="mt-5 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="전체 요청" value={`${formatNumber(metrics.attempts)}건`} note={`성공 ${formatNumber(metrics.total)}건`} />
        <Metric label="실패율" value={percent(metrics.failureRate)} tone={high ? "danger" : undefined} note={`실패 ${formatNumber(metrics.failed)}건 · 기준 5%`} />
        <Metric label="처리 중 / 미완료" value={`${formatNumber(metrics.pending)}건`} note="완료 상태가 기록되지 않은 요청" />
        <Metric label="취소" value={`${formatNumber(metrics.cancelled)}건`} />
        <Metric label="평균 응답 시간" value={metrics.averageLatency === null ? "—" : `${(metrics.averageLatency / 1000).toFixed(1)}초`} note={`최대 ${(metrics.latencyMax / 1000).toFixed(1)}초`} />
        <Metric label="예상 텍스트 비용" value={formatUsd(metrics.cost)} note="이미지 비용 제외 · 실제 청구와 다름" />
      </div>
    </Panel>
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="실패 원인별 집계" note={`실패 ${formatNumber(metrics.failed)}건`}><div className="mt-4">{metrics.errors.length ? <ShareBars items={metrics.errors.map((item) => ({ key: item.code, label: <span className="font-mono text-xs">{item.code}</span>, value: item.count, color: "var(--danger)" }))} /> : <p className="flex items-center gap-2 text-sm text-ok"><CheckCircle2 size={16} />실패한 요청이 없습니다.</p>}</div></Panel>
      <Panel title="실패가 많은 사용자" note="실패 요청이 있는 사용자 상위 10명 · 누르면 상세로 이동합니다.">{failing.length ? <ol className="mt-4 divide-y divide-line text-sm">{failing.map((user) => <li key={user.id}><button type="button" className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-brand-dark" onClick={() => onPerson(user)}><span className="min-w-0 truncate"><b>{user.name}</b> <span className="text-xs text-ink-4">{roleName(user.role)}{user.grade ? ` · ${user.grade}학년` : ""}{user.externalId ? ` · ${user.externalId}` : ""}</span></span><span className="shrink-0 tabular-nums"><b className="text-danger">{user.failed}건</b> <span className="text-xs text-ink-4">/ 성공 {user.requests}건</span></span></button></li>)}</ol> : <p className="mt-4 text-sm text-ink-4">해당하는 사용자가 없습니다.</p>}</Panel>
    </div>
  </div>;
}

function HeatRow({ day, hours, max }: { day: number; hours: number[]; max: number }): ReactNode {
  const label = ["월", "화", "수", "목", "금", "토", "일"][day];
  return <><span className="self-center text-xs text-ink-4">{label}</span>{hours.map((count, hour) => <span key={hour} tabIndex={0} role="img" aria-label={`${label}요일 ${hour}시: ${count}건`} title={`${label}요일 ${hour}시: ${count}건`} className="h-6 rounded-sm focus:outline-2 focus:outline-brand" style={{ backgroundColor: count ? `rgba(36, 90, 193, ${0.15 + count / max * 0.85})` : "var(--surface-2)" }} />)}</>;
}

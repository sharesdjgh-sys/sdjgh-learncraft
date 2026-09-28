"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ChevronRight, Download, Gauge, GraduationCap, Info, LayoutDashboard, RotateCcw, School, UsersRound } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { actionLabels, dateRange, flagLabels, levelLabels, previousRange, summarizeGroups, summarizeSchoolUsage, summarizeUsers, type ActivityLevel, type SchoolUsageData, type UserFlag, type UserSummary } from "@/features/usage/school-insights";
import { formatNumber, formatUsd } from "@/lib/utils";
import styles from "./accounts.module.css";
import d from "./dashboard.module.css";
import { initialView, PeopleTab, PersonDrawer, type PeopleView } from "./dashboard-people";
import { Avatar, Card, Change, FlagBadge, ShareBars, Stat, cx, levelColors, percent, roleColors, roleName, seconds } from "./dashboard-ui";

type Tab = "overview" | "STUDENT" | "TEACHER" | "patterns" | "system";
type Role = "STUDENT" | "TEACHER";
type Summary = ReturnType<typeof summarizeSchoolUsage>;
type Groups = ReturnType<typeof summarizeGroups>;
const tabs: { key: Tab; label: string; icon: typeof School; color: string; soft: string }[] = [
  { key: "overview", label: "개요", icon: LayoutDashboard, color: "#4a31bb", soft: "#efebff" },
  { key: "STUDENT", label: "학생", icon: UsersRound, color: "#245ac1", soft: "#e7efff" },
  { key: "TEACHER", label: "교사", icon: GraduationCap, color: "#087573", soft: "#e0f4f1" },
  { key: "patterns", label: "이용 패턴", icon: BarChart3, color: "#6943b9", soft: "#eee7fb" },
  { key: "system", label: "시스템 상태", icon: Gauge, color: "#a0620f", soft: "#fff4df" },
];
const presets = [{ days: 1, label: "오늘" }, { days: 7, label: "7일" }, { days: 30, label: "30일" }, { days: 90, label: "90일" }];
const axis = { tick: { fontSize: 11, fill: "#8a90a0" }, tickLine: false } as const;
const watchFlags: UserFlag[] = ["FAILURES", "DROPPED", "SURGE"];
const levelOrder: ActivityLevel[] = ["HIGH", "NORMAL", "LOW", "NONE"];

export function AdminDashboard() {
  const [data, setData] = useState<SchoolUsageData | null>(null);
  const [period, setPeriod] = useState<{ days: number; start?: string; end?: string }>({ days: 30 });
  const [custom, setCustom] = useState(false);
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
  // 계정 관리에서 ?user=로 넘어오면 해당 사람의 상세를 바로 엽니다. 목록은 클라이언트에서만 그려져 서버 값과 어긋나지 않습니다.
  const [selectedId, setSelectedId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("user"));

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
  const selected = roster.find((user) => user.id === selectedId) ?? null;
  const days = range?.days ?? 0;

  function updateView(role: Role, next: Partial<PeopleView>) { setViews((current) => ({ ...current, [role]: { ...current[role], ...next } })); }
  function openPeople(role: Role, next: Partial<PeopleView>) {
    setViews((current) => ({ ...current, [role]: { ...initialView, sort: current[role].sort, ...next } }));
    setTab(role);
  }
  function changePeriod(next: typeof period) {
    setData(null); setPeriod(next); setDateError("");
    setViews((current) => ({ STUDENT: { ...current.STUDENT, page: 1 }, TEACHER: { ...current.TEACHER, page: 1 } }));
  }
  function applyDates() {
    try { dateRange(draft.start, draft.end); changePeriod({ days: 0, ...draft }); }
    catch (reason) { setDateError((reason as Error).message); }
  }

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

  const watchCount = (role: Role) => roster.filter((user) => user.role === role && user.flags.some((flag) => flag === "FAILURES" || flag === "DROPPED")).length;
  const badges: Partial<Record<Tab, number>> = {
    STUDENT: watchCount("STUDENT"), TEACHER: watchCount("TEACHER"),
    system: metrics && metrics.failureRate !== null && metrics.failureRate >= 5 ? 1 : 0,
  };

  return <div className={styles.page}>
    <div className={styles.container}>
      <header className={d.headRow}>
        <div>
          <p className={styles.eyebrow}><School size={14} />학교 관리<span className="mx-1 text-slate-300">/</span>사용 현황</p>
          <h1 className={styles.heading}>학교 사용 현황</h1>
          <p className={styles.description}>학생과 선생님의 AI 튜터 이용을 살피고, 확인이 필요한 사람과 시스템 문제를 먼저 찾아보세요.</p>
        </div>
        <p className={d.live} aria-live="polite"><span className={d.dot} data-paused={!auto} data-loading={loading} aria-hidden="true" />{loading ? "갱신 중…" : updated ? `${updated} 갱신` : ""}<label className="ml-2 flex items-center gap-1.5"><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} />1분마다 자동 갱신</label></p>
      </header>

      <div className={styles.toolbar}>
        <div className={cx(styles.tabs, d.tabsScroll)} role="group" aria-label="통계 보기">
          {tabs.map(({ key, label, icon: Icon, color, soft }) => <button key={key} type="button" aria-pressed={tab === key} className={cx(styles.tab, "shrink-0")} style={{ "--tab-color": color, "--tab-soft": soft } as CSSProperties} onClick={() => setTab(key)}>
            <Icon size={16} />{label}{!!badges[key] && <span className={d.tabBadge} aria-label={`점검 ${badges[key]}건`}>{badges[key]}</span>}
          </button>)}
        </div>
        <div className={styles.actions}>
          <button type="button" className={cx(styles.secondary, d.plain)} disabled={loading} onClick={() => setAttempt((value) => value + 1)}><RotateCcw size={15} className={loading ? "animate-spin" : ""} />새로고침</button>
          <button type="button" className={styles.secondary} disabled={!data?.available || loading || !!error} onClick={exportCsv}><Download size={15} />CSV 내보내기</button>
        </div>
      </div>

      <div className={d.filterbar} role="group" aria-label="조회 조건">
        <div className={d.segment} role="group" aria-label="조회 기간">
          {presets.map((preset) => <button key={preset.days} type="button" aria-pressed={!custom && !period.start && period.days === preset.days} onClick={() => { setCustom(false); changePeriod({ days: preset.days }); }}>{preset.label}</button>)}
          <button type="button" aria-pressed={custom || !!period.start} onClick={() => setCustom(true)}>직접 지정</button>
        </div>
        {(custom || period.start) && <div className={d.dates}><input aria-label="조회 시작일" type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />~<input aria-label="조회 종료일" type="date" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /><button type="button" className={cx(styles.secondary, d.small)} onClick={applyDates}>적용</button></div>}
        <select aria-label="과목" className={d.subject} value={subject} onChange={(event) => setSubject(event.target.value)}><option value="ALL">전체 과목</option>{subjects.map((name) => <option key={name}>{name}</option>)}</select>
        {data && range && <p className={d.range}><b>{data.start} ~ {data.end}</b> ({days}일) · 비교 {range.start} ~ {range.end}</p>}
        {dateError && <p role="alert" className={d.dateError}>{dateError}</p>}
      </div>

      {error && <p role="alert" className={styles.alert}>{error}{data && " 아래는 마지막으로 성공한 조회 결과입니다."} <button type="button" className="font-semibold underline" onClick={() => setAttempt((value) => value + 1)}>다시 시도</button></p>}
      {!data && loading && <div className="space-y-4" role="status" aria-label="통계를 불러오는 중"><div className={d.stats}>{[0, 1, 2, 3].map((n) => <div key={n} className={styles.skeleton} style={{ height: 92 }} />)}</div><div className={styles.skeleton} style={{ height: 320 }} /></div>}
      {data && !data.available && <section className={styles.card}><div className={styles.empty}><Info size={26} className={styles.emptyIcon} /><h3>실제 통계 연결이 필요합니다</h3><p>데이터베이스가 연결되지 않아 운영 기록을 조회할 수 없습니다. 예시 수치는 표시하지 않습니다.</p></div></section>}

      {data?.available && metrics && previous && patternMetrics && <div aria-busy={loading}>
        {tab === "overview" && <Overview metrics={metrics} previous={previous} roster={roster} groups={groups} onSelect={setSelectedId} onPeople={openPeople} onTab={setTab} />}
        {(tab === "STUDENT" || tab === "TEACHER") && <PeopleTab key={tab} role={tab} roster={roster} view={views[tab]} onView={(next) => updateView(tab, next)} onSelect={setSelectedId} selectedId={selectedId} subject={subject} days={days} />}
        {tab === "patterns" && <Patterns metrics={patternMetrics} filter={pattern} onFilter={setPattern} />}
        {tab === "system" && <SystemStatus metrics={metrics} roster={roster} onSelect={setSelectedId} />}
        <p className={d.note}><Info size={13} /><span>AI 직접 질문과 이미지 재시도 요청을 집계합니다. 이어 묻기, 페이지 열람, 체류 시간, 교사용 제작 도구와 관리자 활동은 포함하지 않으며 대화 원문은 조회하지 않습니다. 이용률은 현재 활성 계정 중 성공 요청이 있는 계정의 비율이고, 역할·학년은 현재 계정 정보 기준입니다. 오늘은 진행 중인 날짜입니다.</span></p>
      </div>}
      {data?.available && <PersonDrawer user={selected} data={data} subject={subject} days={days} onClose={() => setSelectedId(null)} />}
    </div>
  </div>;
}

function Overview({ metrics, previous, roster, groups, onSelect, onPeople, onTab }: {
  metrics: Summary; previous: Summary; roster: UserSummary[]; groups: Groups;
  onSelect: (id: string) => void; onPeople: (role: Role, next: Partial<PeopleView>) => void; onTab: (tab: Tab) => void;
}) {
  const role = (key: Role) => metrics.roles.find((item) => item.role === key)!;
  const before = (key: Role) => previous.roles.find((item) => item.role === key)!;
  const failureHigh = metrics.failureRate !== null && metrics.failureRate >= 5;
  const watch = roster.filter((user) => user.flags.some((flag) => watchFlags.includes(flag)))
    .map((user) => ({ user, flag: watchFlags.find((flag) => user.flags.includes(flag))! }))
    .sort((a, b) => watchFlags.indexOf(a.flag) - watchFlags.indexOf(b.flag) || b.user.failed - a.user.failed || Math.abs(b.user.requests - b.user.prevRequests) - Math.abs(a.user.requests - a.user.prevRequests));
  const reason = ({ user, flag }: (typeof watch)[number]) => flag === "FAILURES" ? `실패 ${user.failed}건 · 성공 ${user.requests}건`
    : `직전 ${formatNumber(user.prevRequests)}건 → 이번 ${formatNumber(user.requests)}건`;
  const active = (key: Role) => roster.filter((user) => user.role === key && user.active);
  const summaries = [
    ...(["STUDENT", "TEACHER"] as Role[]).flatMap((key) => [
      { key: `${key}-none`, count: active(key).filter((user) => user.level === "NONE").length, text: `이 기간 사용하지 않은 ${roleName(key)}`, extra: `활성 ${active(key).length}명 중`, unit: "명", go: () => onPeople(key, { level: "NONE" }) },
      { key: `${key}-login`, count: active(key).filter((user) => user.flags.includes("NEVER_LOGGED_IN")).length, text: `로그인한 적 없는 ${roleName(key)}`, extra: "계정 안내 필요", unit: "명", go: () => onPeople(key, { flag: "NEVER_LOGGED_IN" }) },
    ]),
    { key: "pending", count: metrics.pending, text: "완료 기록이 없는 요청", extra: "처리 중이거나 끊긴 요청", unit: "건", go: () => onTab("system") },
  ].filter((item) => item.count > 0);

  return <>
    <div className={d.stats}>
      <Stat label="성공한 AI 요청" value={formatNumber(metrics.total)} unit="건" tone={d.toneBrand} note={<>직전 대비 <Change current={metrics.total} previous={previous.total} /> · 하루 평균 {metrics.average.toFixed(1)}건</>} />
      {(["STUDENT", "TEACHER"] as Role[]).map((key) => <Stat key={key} label={`${roleName(key)} 이용률`} value={percent(role(key).rate)} tone={key === "STUDENT" ? d.toneStudent : d.toneTeacher} note={`${role(key).activeRegistered} / ${role(key).registered}명 이용 · 직전 ${percent(before(key).rate)}`} onClick={() => onPeople(key, {})} />)}
      <Stat label={<>{failureHigh ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}요청 실패율</>} value={percent(metrics.failureRate)} tone={failureHigh ? d.toneDanger : d.toneOk} note={`실패 ${formatNumber(metrics.failed)}건 · 평균 응답 ${seconds(metrics.averageLatency)}`} onClick={() => onTab("system")} />
    </div>

    <div className={cx(d.grid, d.split)}>
      <Card title={<>확인이 필요한 사용자<span className={d.count}>{watch.length}명</span></>} note="실패가 잦거나(3건 이상), 직전 기간보다 사용이 크게 줄거나 늘어난 사람입니다. 누르면 상세가 열립니다." label="확인이 필요한 사용자">
        {watch.length ? <ul className={d.watch}>{watch.slice(0, 8).map((item) => <li key={item.user.id}><button type="button" className={d.watchRow} onClick={() => onSelect(item.user.id)}>
          <Avatar name={item.user.name} role={item.user.role} />
          <span className="min-w-0"><span className={d.watchName}><b>{item.user.name}</b><span>{roleName(item.user.role)}{item.user.grade ? ` · ${item.user.grade}학년` : ""}{item.user.externalId ? ` · ${item.user.externalId}` : ""}</span></span><span className={d.watchReason}>{reason(item)}</span></span>
          <span className={d.badges}><FlagBadge flag={item.flag} /><ChevronRight size={15} className={d.chev} /></span>
        </button></li>)}</ul> : <p className={d.good}><CheckCircle2 size={16} />실패가 잦거나 사용이 급변한 사람이 없습니다.</p>}
        {watch.length > 8 && <div className={d.more}>{(["STUDENT", "TEACHER"] as Role[]).map((key) => watch.some((item) => item.user.role === key) && <button key={key} type="button" className={d.link} onClick={() => onPeople(key, { sort: "change" })}>{roleName(key)} 전체 보기<ChevronRight size={14} /></button>)}</div>}
        {summaries.length > 0 && <div className={d.summaryRows}>{summaries.map((item) => <button key={item.key} type="button" className={d.summaryRow} onClick={item.go}><span>{item.text} <b>{formatNumber(item.count)}{item.unit}</b> <span className={d.muted}>· {item.extra}</span></span><ChevronRight size={15} className={d.chev} /></button>)}</div>}
      </Card>

      <Card title="학년·교사별 이용률" note="막대는 활동 수준별 인원 비율입니다. 누르면 명단으로 이동합니다." label="학년·교사별 이용률">
        <div className={d.groups}>{groups.map((group) => <button key={group.key} type="button" className={d.groupRow} onClick={() => group.key === "TEACHER" ? onPeople("TEACHER", {}) : onPeople("STUDENT", { grade: group.key === "G0" ? "ALL" : group.key.slice(1) })}>
          <b>{group.label}</b>
          <span className="min-w-0">
            <span className={d.stackBar} role="img" aria-label={levelOrder.map((level) => `${levelLabels[level]} ${group.levels[level]}명`).join(", ")}>{levelOrder.map((level) => group.levels[level] > 0 && <span key={level} style={{ width: `${group.levels[level] / (group.registered || 1) * 100}%`, background: levelColors[level] }} />)}</span>
            <span className={d.sub}>성공 {formatNumber(group.requests)}건 · 1인당 {group.perUser.toFixed(1)}건 · <Change current={group.requests} previous={group.prevRequests} /></span>
          </span>
          <span className={d.groupRate}><b>{percent(group.rate)}</b>{group.using} / {group.registered}명</span>
        </button>)}</div>
        <div className={d.legend}>{levelOrder.map((level) => <span key={level}><i style={{ background: levelColors[level] }} />{levelLabels[level]}</span>)}</div>
      </Card>
    </div>

    <div className={d.gap}><Card title="일별 이용 추이" note={metrics.peaks[0] ? `가장 많이 쓴 날 ${metrics.peaks[0].date} (${formatNumber(metrics.peaks[0].requests)}건, 하루 평균의 ${(metrics.peaks[0].requests / metrics.average).toFixed(1)}배) · 요청이 없는 날도 포함` : "요청이 없는 날도 포함합니다."} label="일별 이용 추이">
      <div className={d.chart}><ResponsiveContainer><AreaChart data={metrics.dailyTrend} margin={{ left: 0, right: 8, top: 4 }}><CartesianGrid vertical={false} stroke="#eef0f4" /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} {...axis} axisLine={{ stroke: "#e2e4ea" }} minTickGap={20} /><YAxis allowDecimals={false} {...axis} axisLine={false} width={36} /><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Area name="학생" dataKey="students" stackId="usage" stroke={roleColors.STUDENT} fill={roleColors.STUDENT} fillOpacity={0.14} strokeWidth={1.6} /><Area name="교사" dataKey="teachers" stackId="usage" stroke={roleColors.TEACHER} fill={roleColors.TEACHER} fillOpacity={0.2} strokeWidth={1.6} /></AreaChart></ResponsiveContainer></div>
    </Card></div>
  </>;
}

function Patterns({ metrics, filter, onFilter }: { metrics: Summary; filter: { role: string; grade: string }; onFilter: (next: { role: string; grade: string }) => void }) {
  const heatMax = Math.max(1, ...metrics.heatmap.flat());
  return <>
    <div className={d.filterbar} role="group" aria-label="이용 패턴 대상">
      <div className={d.segment}>{[["ALL", "교사 + 학생"], ["STUDENT", "학생"], ["TEACHER", "교사"]].map(([value, text]) => <button key={value} type="button" aria-pressed={filter.role === value} onClick={() => onFilter({ role: value, grade: "ALL" })}>{text}</button>)}</div>
      {filter.role === "STUDENT" && <select aria-label="학년" className={d.subject} value={filter.grade} onChange={(event) => onFilter({ ...filter, grade: event.target.value })}><option value="ALL">전체 학년</option>{[1, 2, 3].map((grade) => <option key={grade} value={grade}>{grade}학년</option>)}</select>}
      <p className={d.range}>성공 요청 <b>{formatNumber(metrics.total)}건</b> 기준{metrics.total > 0 && ` · 가장 많은 시간 ${metrics.busiestHour.hour}시`}</p>
    </div>
    <div className={cx(d.grid, d.halves)}>
      <Card title="시간대별 이용량" note="조회 기간의 같은 시간대를 합산합니다.">
        <div className={d.chart}><ResponsiveContainer><BarChart data={metrics.hourly} margin={{ left: 0, right: 8 }}><CartesianGrid vertical={false} stroke="#eef0f4" /><XAxis dataKey="hour" tickFormatter={(value) => `${value}시`} {...axis} axisLine={{ stroke: "#e2e4ea" }} interval={2} /><YAxis allowDecimals={false} {...axis} axisLine={false} width={36} /><Tooltip cursor={{ fill: "#f3f4f8" }} labelFormatter={(label) => `${label}시`} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar name="학생" dataKey="students" stackId="usage" fill={roleColors.STUDENT} /><Bar name="교사" dataKey="teachers" stackId="usage" fill={roleColors.TEACHER} radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
      <Card title="요일 × 시간대 집중도" note="색이 진할수록 요청이 많습니다. 칸에 마우스를 올리면 건수가 보입니다.">
        <div className={d.heatWrap}><div className={d.heat}><span />{metrics.hourly.map((row) => <span key={row.hour}>{row.hour % 3 === 0 ? row.hour : ""}</span>)}{metrics.heatmap.map((hours, day) => {
          const label = ["월", "화", "수", "목", "금", "토", "일"][day];
          return [<span key={`d${day}`} className={d.heatDay}>{label}</span>, ...hours.map((count, hour) => <span key={`${day}-${hour}`} tabIndex={0} role="img" aria-label={`${label}요일 ${hour}시 ${count}건`} title={`${label}요일 ${hour}시 · ${count}건`} className={d.heatCell} style={{ background: count ? `rgba(36, 90, 193, ${0.12 + count / heatMax * 0.88})` : "#f2f3f7" }} />)];
        })}</div></div>
      </Card>
    </div>
    <div className={cx(d.grid, d.thirds, d.gap)}>
      <Card title="과목별 이용" note="성공 요청 기준"><div className={d.cardBody}><ShareBars items={metrics.subjects.map((item) => ({ key: item.subject, label: item.subject, note: `학생 ${formatNumber(item.students)} · 교사 ${formatNumber(item.teachers)}`, value: item.requests }))} /></div></Card>
      <Card title="요청 유형" note="어떤 도움을 요청했는지"><div className={d.cardBody}><ShareBars items={metrics.actions.map((item) => ({ key: item.action, label: actionLabels[item.action] ?? item.action, value: item.requests, color: "#8a78d4" }))} /></div></Card>
      <Card title="질문이 집중된 단원" note="성공 요청 상위 10개"><div className={d.cardBody}>{metrics.units.length ? <ol className={d.ranked}>{metrics.units.map((unit, index) => <li key={`${unit.subject}:${unit.unit}`}><span><span className={d.rank}>{index + 1}</span><span className={d.tag}>{unit.subject}</span>{unit.unit}</span><b className={d.num}>{formatNumber(unit.requests)}건</b></li>)}</ol> : <p className={d.empty}>기록이 없습니다.</p>}</div></Card>
    </div>
  </>;
}

function SystemStatus({ metrics, roster, onSelect }: { metrics: Summary; roster: UserSummary[]; onSelect: (id: string) => void }) {
  const failing = roster.filter((user) => user.failed > 0).sort((a, b) => b.failed - a.failed).slice(0, 10);
  const high = metrics.failureRate !== null && metrics.failureRate >= 5;
  return <>
    <div className={cx(d.stats, d.stats5)}>
      <Stat label="전체 요청" value={formatNumber(metrics.attempts)} unit="건" tone={d.toneBrand} note={`성공 ${formatNumber(metrics.total)} · 취소 ${formatNumber(metrics.cancelled)}`} />
      <Stat label={<>{high ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}실패율</>} value={percent(metrics.failureRate)} tone={high ? d.toneDanger : d.toneOk} note={`실패 ${formatNumber(metrics.failed)}건 · 점검 기준 5%`} />
      <Stat label="완료 기록 없음" value={formatNumber(metrics.pending)} unit="건" tone={metrics.pending ? d.toneWarn : d.toneMuted} note="처리 중이거나 끊긴 요청" />
      <Stat label="평균 응답 시간" value={seconds(metrics.averageLatency)} tone={d.toneStudent} note={`가장 느린 응답 ${seconds(metrics.latencyMax)}`} />
      <Stat label="예상 텍스트 비용" value={formatUsd(metrics.cost)} tone={d.toneMuted} note="이미지 제외 · 실제 청구와 다름" />
    </div>
    <div className={cx(d.grid, d.halves)}>
      <Card title="실패 원인" note={`실패 요청 ${formatNumber(metrics.failed)}건 · 실패율 = 실패 ÷ (성공 + 실패)`}><div className={d.cardBody}>{metrics.errors.length ? <ShareBars items={metrics.errors.map((item) => ({ key: item.code, label: <code className={d.code}>{item.code}</code>, value: item.count, color: "#c86b78" }))} /> : <p className={d.goodInline}><CheckCircle2 size={15} />실패한 요청이 없습니다.</p>}</div></Card>
      <Card title="실패가 많은 사용자" note="실패 요청이 있는 사용자 상위 10명 · 누르면 상세가 열립니다.">
        {failing.length ? <ul className={d.watch}>{failing.map((user) => <li key={user.id}><button type="button" className={d.watchRow} onClick={() => onSelect(user.id)}>
          <Avatar name={user.name} role={user.role} />
          <span className="min-w-0"><span className={d.watchName}><b>{user.name}</b><span>{roleName(user.role)}{user.grade ? ` · ${user.grade}학년` : ""}{user.externalId ? ` · ${user.externalId}` : ""}</span></span><span className={d.watchReason}>성공 {formatNumber(user.requests)}건</span></span>
          <b className={cx(d.num, d.down)}>실패 {user.failed}건</b>
        </button></li>)}</ul> : <p className={d.good}><CheckCircle2 size={16} />실패한 요청이 있는 사용자가 없습니다.</p>}
      </Card>
    </div>
  </>;
}

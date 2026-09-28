"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { actionLabels, flagLabels, levelLabels, levelRule, userDetail, type ActivityLevel, type SchoolUsageData, type UserFlag, type UserSummary } from "@/features/usage/school-insights";
import { formatNumber, formatUsd } from "@/lib/utils";
import styles from "./accounts.module.css";
import d from "./dashboard.module.css";
import { Avatar, Change, FlagBadge, LevelBadge, ShareBars, Spark, Stat, cx, roleColors, roleName, seconds, shortTime } from "./dashboard-ui";

export type SortKey = "requests" | "fewest" | "change" | "recent" | "failed" | "name";
export type PeopleView = { grade: string; level: "ALL" | ActivityLevel; flag: "ALL" | UserFlag; q: string; sort: SortKey; page: number };
export const initialView: PeopleView = { grade: "ALL", level: "ALL", flag: "ALL", q: "", sort: "requests", page: 1 };

const pageSize = 20;
const sortLabels: Record<SortKey, string> = { requests: "요청 많은 순", fewest: "요청 적은 순", change: "감소 큰 순", recent: "최근 사용 순", failed: "실패 많은 순", name: "이름 순" };
const levels: ActivityLevel[] = ["HIGH", "NORMAL", "LOW", "NONE"];
const flags: UserFlag[] = ["FAILURES", "DROPPED", "SURGE", "NEVER_LOGGED_IN", "INACTIVE_ACCOUNT"];
const levelTones: Record<ActivityLevel, string> = { HIGH: d.toneOk, NORMAL: d.toneStudent, LOW: d.toneWarn, NONE: d.toneMuted };
const levelNotes: Record<ActivityLevel, string> = {
  HIGH: `활동일 ${levelRule.high * 100}% 이상`, NORMAL: `활동일 ${levelRule.low * 100}~${levelRule.high * 100}%`,
  LOW: `활동일 ${levelRule.low * 100}% 미만`, NONE: "성공 요청 없음",
};
const byName = (a: UserSummary, b: UserSummary) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id);
const sorters: Record<SortKey, (a: UserSummary, b: UserSummary) => number> = {
  requests: (a, b) => b.requests - a.requests || byName(a, b),
  fewest: (a, b) => a.requests - b.requests || byName(a, b),
  change: (a, b) => (a.requests - a.prevRequests) - (b.requests - b.prevRequests) || byName(a, b),
  recent: (a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? "") || byName(a, b),
  failed: (a, b) => b.failed - a.failed || byName(a, b),
  name: byName,
};
const who = (user: UserSummary) => [user.externalId, user.role === "STUDENT" && user.grade ? `${user.grade}학년` : ""].filter(Boolean).join(" · ");

export function PeopleTab({ role, roster, view, onView, onSelect, selectedId, subject, days }: {
  role: "STUDENT" | "TEACHER"; roster: UserSummary[]; view: PeopleView; onView: (next: Partial<PeopleView>) => void;
  onSelect: (id: string) => void; selectedId: string | null; subject: string; days: number;
}) {
  const label = roleName(role);
  const color = roleColors[role];
  const base = useMemo(() => roster.filter((user) => user.role === role && (view.grade === "ALL" || String(user.grade) === view.grade)), [roster, role, view.grade]);
  const levelCounts = useMemo(() => Object.fromEntries(levels.map((level) => [level, base.filter((user) => user.level === level).length])) as Record<ActivityLevel, number>, [base]);
  const flagCounts = useMemo(() => Object.fromEntries(flags.map((flag) => [flag, base.filter((user) => user.flags.includes(flag)).length])) as Record<UserFlag, number>, [base]);
  const list = useMemo(() => {
    const q = view.q.trim().toLowerCase();
    return base.filter((user) => (view.level === "ALL" || user.level === view.level)
      && (view.flag === "ALL" || user.flags.includes(view.flag))
      && (!q || user.name.toLowerCase().includes(q) || (user.externalId ?? "").toLowerCase().includes(q)))
      .sort(sorters[view.sort]);
  }, [base, view.level, view.flag, view.q, view.sort]);
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const page = Math.min(view.page, pages);
  const rows = list.slice((page - 1) * pageSize, page * pageSize);
  const filtered = view.flag !== "ALL" || view.q.trim() !== "";

  return <>
    <div className={cx(d.stats, d.stats5)} role="group" aria-label="활동 수준으로 거르기">
      <Stat label={`전체 ${label}`} value={formatNumber(base.length)} unit="명" note={`이용 ${base.length - levelCounts.NONE}명 · ${role === "STUDENT" && view.grade !== "ALL" ? `${view.grade}학년` : "비활성 계정 일부 포함"}`} tone={role === "STUDENT" ? d.toneStudent : d.toneTeacher} pressed={view.level === "ALL"} onClick={() => onView({ level: "ALL", page: 1 })} />
      {levels.map((level) => <Stat key={level} label={levelLabels[level]} value={formatNumber(levelCounts[level])} unit="명" note={levelNotes[level]} tone={levelTones[level]} pressed={view.level === level} onClick={() => onView({ level: view.level === level ? "ALL" : level, page: 1 })} />)}
    </div>

    <section className={styles.card} aria-label={`${label} 이용 명단`}>
      <div className={styles.searchbar}>
        <label className={styles.search}><Search size={17} className="shrink-0" /><span className="sr-only">이름 또는 학번 검색</span><input type="search" value={view.q} maxLength={40} placeholder="이름·학번으로 검색" onChange={(event) => onView({ q: event.target.value, page: 1 })} /></label>
        <div className="flex flex-wrap items-center gap-2">
          {role === "STUDENT" && <label className={styles.filter}><SlidersHorizontal size={15} /><select aria-label="학년" value={view.grade} onChange={(event) => onView({ grade: event.target.value, page: 1 })}><option value="ALL">전체 학년</option>{[1, 2, 3].map((grade) => <option key={grade} value={grade}>{grade}학년</option>)}</select></label>}
          <label className={styles.filter}><select aria-label="점검 표시" value={view.flag} onChange={(event) => onView({ flag: event.target.value as PeopleView["flag"], page: 1 })}><option value="ALL">점검 표시 전체</option>{flags.map((flag) => <option key={flag} value={flag}>{flagLabels[flag]} ({flagCounts[flag]})</option>)}</select></label>
          <label className={styles.filter}><select aria-label="정렬" value={view.sort} onChange={(event) => onView({ sort: event.target.value as SortKey, page: 1 })}>{Object.entries(sortLabels).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
        </div>
      </div>
      {view.flag !== "ALL" && <p className={d.chip}>{flagLabels[view.flag]}인 {label}만 보는 중<button type="button" aria-label="점검 표시 필터 해제" onClick={() => onView({ flag: "ALL", page: 1 })}><X size={13} /></button></p>}
      <div className={styles.listmeta}><span>{filtered || view.level !== "ALL" ? "조건에 맞는 " : ""}{label} <strong>{formatNumber(list.length)}명</strong>{subject !== "ALL" && ` · ${subject} 과목 기준`}</span><span>최근 추이: 조회 기간 {days}일의 일별 성공 요청</span></div>

      <div className={d.tableWrap}>
        <table className={cx(styles.table, d.table)}>
          <thead><tr>{["이름", ...(role === "STUDENT" ? ["학년"] : []), "상태", "최근 추이", "성공 요청", "직전 대비", "활동일", "마지막 사용", "주 과목"].map((heading) => <th key={heading} className="whitespace-nowrap">{heading}</th>)}</tr></thead>
          <tbody>
            {rows.map((user) => <tr key={user.id} aria-selected={selectedId === user.id} onClick={() => onSelect(user.id)}>
              <td><button type="button" className={cx(styles.person, d.nameButton)} onClick={(event) => { event.stopPropagation(); onSelect(user.id); }}><Avatar name={user.name} role={user.role} /><span><span className={styles.personName}>{user.name}</span><span className={cx(styles.loginId, "block")}>{user.externalId ?? ""}</span></span></button></td>
              {role === "STUDENT" && <td className={d.num}>{user.grade ? `${user.grade}학년` : "—"}</td>}
              <td><div className={d.badges}><LevelBadge level={user.level} />{user.flags.map((flag) => <FlagBadge key={flag} flag={flag} />)}</div></td>
              <td><Spark values={user.daily} color={color} label={`${user.name} 일별 성공 요청, 최대 ${Math.max(...user.daily)}건`} /></td>
              <td className={d.num}><span className={d.strong}>{formatNumber(user.requests)}건</span>{user.failed > 0 && <span className={cx(d.sub, d.down)}>실패 {user.failed}건</span>}</td>
              <td className={d.num}><Change current={user.requests} previous={user.prevRequests} /><span className={d.sub}>직전 {formatNumber(user.prevRequests)}건</span></td>
              <td className={d.num}>{user.activeDays}<span className={d.muted}> / {days}일</span></td>
              <td className={d.num}>{shortTime(user.lastAt)}</td>
              <td className="max-w-36 truncate">{user.subjects[0]?.subject ?? <span className={d.muted}>—</span>}{user.subjects.length > 1 && <span className={d.muted}> 외 {user.subjects.length - 1}</span>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <ul className={styles.mobileList}>{rows.map((user) => <li key={user.id}><button type="button" className={cx(styles.mobileRow, "w-full text-left")} onClick={() => onSelect(user.id)}>
        <div className={styles.person}><Avatar name={user.name} role={user.role} /><div className="min-w-0"><div className={styles.personName}>{user.name}</div><div className={styles.loginId}>{who(user) || roleName(user.role)}</div><div className={cx(d.badges, "mt-1.5")}><LevelBadge level={user.level} />{user.flags.map((flag) => <FlagBadge key={flag} flag={flag} />)}</div></div></div>
        <div className="shrink-0 text-right"><b className={d.num}>{formatNumber(user.requests)}건</b><span className={d.sub}><Change current={user.requests} previous={user.prevRequests} /></span></div>
      </button></li>)}</ul>
      {!rows.length && <div className={styles.empty}><h3>조건에 맞는 {label}이 없습니다</h3><p>검색어나 필터를 바꿔 보세요.</p><button type="button" className={styles.secondary} onClick={() => onView({ ...initialView, grade: view.grade, sort: view.sort })}>조건 초기화</button></div>}
      {list.length > pageSize && <nav className={d.pager} aria-label={`${label} 명단 페이지`}><span>{page} / {pages} 페이지</span><div><button type="button" className={styles.secondary} disabled={page <= 1} onClick={() => onView({ page: page - 1 })}>이전</button><button type="button" className={styles.secondary} disabled={page >= pages} onClick={() => onView({ page: page + 1 })}>다음</button></div></nav>}
    </section>
  </>;
}

export function PersonDrawer({ user, data, subject, days, onClose }: { user: UserSummary | null; data: SchoolUsageData; subject: string; days: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (user && !element.open) element.showModal();
    if (!user && element.open) element.close();
  }, [user]);
  return <dialog ref={dialog} className={styles.drawer} aria-labelledby="usage-person-title" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    {user && <PersonDetail user={user} data={data} subject={subject} days={days} onClose={() => dialog.current?.close()} />}
  </dialog>;
}

function PersonDetail({ user, data, subject, days, onClose }: { user: UserSummary; data: SchoolUsageData; subject: string; days: number; onClose: () => void }) {
  const detail = useMemo(() => userDetail(data, user.id, subject), [data, user.id, subject]);
  const color = roleColors[user.role === "TEACHER" ? "TEACHER" : "STUDENT"];
  const busiest = [...detail.hourly].sort((a, b) => b.requests - a.requests)[0];
  const facts: [string, ReactNode][] = [
    ["성공 요청", <>{formatNumber(user.requests)}건<small><Change current={user.requests} previous={user.prevRequests} /></small></>],
    ["직전 기간", `${formatNumber(user.prevRequests)}건`],
    ["활동일", `${user.activeDays} / ${days}일`],
    ["활동일 하루 평균", user.activeDays ? `${(user.requests / user.activeDays).toFixed(1)}건` : "—"],
    ["마지막 사용", shortTime(user.lastAt)],
    ["마지막 로그인", user.lastLoginAt ? shortTime(user.lastLoginAt) : user.lastLoginAt === null ? "기록 없음" : "—"],
    ["실패 요청", <span key="failed" className={user.failed ? d.down : undefined}>{user.failed}건</span>],
    ["평균 응답 · 예상 비용", `${seconds(detail.averageLatency)} · ${formatUsd(user.cost)}`],
  ];
  return <>
    <header className={styles.drawerHeader}>
      <div className="min-w-0">
        <p className={styles.eyebrow}>{roleName(user.role)} 이용 현황{who(user) && ` / ${who(user)}`}</p>
        <h2 id="usage-person-title">{user.name}</h2>
        <div className={cx(d.badges, "mt-2.5")}><LevelBadge level={user.level} />{user.flags.map((flag) => <FlagBadge key={flag} flag={flag} />)}</div>
      </div>
      <button type="button" className={styles.iconButton} aria-label="상세 닫기" onClick={onClose}><X size={19} /></button>
    </header>
    <div className={styles.drawerBody}>
      <p className={styles.drawerDescription}>{data.start} ~ {data.end} ({days}일){subject !== "ALL" && ` · ${subject} 과목`} · 성공 요청 기준. 대화 원문은 보여 주지 않습니다.</p>
      <dl className={d.kv}>{facts.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>

      <section className={d.section}><h3>일별 성공 요청</h3>
        <div className={d.chartSmall}><ResponsiveContainer><BarChart data={detail.daily} margin={{ left: -26, right: 4, top: 4 }}><CartesianGrid vertical={false} stroke="#eef0f4" /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 10, fill: "#8a90a0" }} minTickGap={18} tickLine={false} axisLine={{ stroke: "#e2e4ea" }} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8a90a0" }} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: "#f3f4f8" }} /><Bar name="성공 요청" dataKey="requests" fill={color} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className={d.section}><h3>시간대<small>{user.requests ? `가장 많은 시간 ${busiest.hour}시` : ""}</small></h3>
        <div className={d.chartTiny}><ResponsiveContainer><BarChart data={detail.hourly} margin={{ left: -26, right: 4 }}><XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#8a90a0" }} interval={2} tickLine={false} axisLine={{ stroke: "#e2e4ea" }} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8a90a0" }} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: "#f3f4f8" }} labelFormatter={(value) => `${value}시`} /><Bar name="성공 요청" dataKey="requests" fill={color} fillOpacity={0.7} radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className={d.section}><h3>과목별</h3><ShareBars items={detail.subjects.slice(0, 6).map((item) => ({ key: item.subject, label: item.subject, value: item.requests, color }))} /></section>
      <section className={d.section}><h3>요청 유형</h3><ShareBars items={detail.actions.map((item) => ({ key: item.action, label: actionLabels[item.action] ?? item.action, value: item.requests, color: "#8a78d4" }))} /></section>
      <section className={d.section}><h3>자주 질문한 단원</h3>
        {detail.units.length ? <ol className={d.ranked}>{detail.units.map((unit, index) => <li key={`${unit.subject}:${unit.unit}`}><span><span className={d.rank}>{index + 1}</span><span className={d.tag}>{unit.subject}</span>{unit.unit}</span><b className={d.num}>{unit.requests}건</b></li>)}</ol> : <p className={d.empty}>기록이 없습니다.</p>}
      </section>
      {detail.errors.length > 0 && <section className={d.section}><h3>실패 원인</h3><ul className={d.errorList}>{detail.errors.map((error) => <li key={error.code}><code>{error.code}</code><b className={d.num}>{error.requests}건</b></li>)}</ul></section>}
      <p className={d.note}>이용량은 학습 성취도를 뜻하지 않습니다. 활동 수준과 점검 표시는 이 화면의 모니터링 기준입니다.</p>
    </div>
  </>;
}

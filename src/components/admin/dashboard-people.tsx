"use client";

import { useMemo, useRef } from "react";
import { Search, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { actionLabels, flagLabels, levelLabels, levelRule, userDetail, type ActivityLevel, type SchoolUsageData, type UserFlag, type UserSummary } from "@/features/usage/school-insights";
import { cn, formatNumber, formatUsd } from "@/lib/utils";
import { Change, FlagBadge, LevelBadge, Metric, Panel, ShareBars, chip, control, roleColors, roleName, shortTime } from "./dashboard-ui";

export type SortKey = "requests" | "fewest" | "change" | "recent" | "failed" | "name";
export type PeopleView = { grade: string; level: "ALL" | ActivityLevel; flag: "ALL" | UserFlag; q: string; sort: SortKey; page: number; selected: string | null };
export const initialView: PeopleView = { grade: "ALL", level: "ALL", flag: "ALL", q: "", sort: "requests", page: 1, selected: null };

const pageSize = 20;
const sortLabels: Record<SortKey, string> = { requests: "성공 요청 많은 순", fewest: "성공 요청 적은 순", change: "직전 대비 감소 큰 순", recent: "최근 사용 순", failed: "실패 많은 순", name: "이름 순" };
const levels: ActivityLevel[] = ["HIGH", "NORMAL", "LOW", "NONE"];
const flags: UserFlag[] = ["DROPPED", "SURGE", "FAILURES", "NEVER_LOGGED_IN", "INACTIVE_ACCOUNT"];
const byName = (a: UserSummary, b: UserSummary) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id);
const sorters: Record<SortKey, (a: UserSummary, b: UserSummary) => number> = {
  requests: (a, b) => b.requests - a.requests || byName(a, b),
  fewest: (a, b) => a.requests - b.requests || byName(a, b),
  change: (a, b) => (a.requests - a.prevRequests) - (b.requests - b.prevRequests) || byName(a, b),
  recent: (a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? "") || byName(a, b),
  failed: (a, b) => b.failed - a.failed || byName(a, b),
  name: byName,
};

export function PeopleTab({ role, data, roster, view, onView, subject, days }: {
  role: "STUDENT" | "TEACHER"; data: SchoolUsageData; roster: UserSummary[]; view: PeopleView;
  onView: (next: Partial<PeopleView>) => void; subject: string; days: number;
}) {
  const detailRef = useRef<HTMLDivElement>(null);
  const label = roleName(role);
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
  const selected = roster.find((user) => user.id === view.selected && user.role === role);
  const using = base.filter((user) => user.requests > 0);
  const requests = using.reduce((sum, user) => sum + user.requests, 0);
  const filtered = view.level !== "ALL" || view.flag !== "ALL" || view.q.trim() !== "";

  function select(id: string) {
    onView({ selected: id });
    if (window.matchMedia("(max-width: 1279px)").matches) window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label={`활성 ${label} 계정`} value={`${formatNumber(base.filter((user) => user.active).length)}명`} note={role === "STUDENT" && view.grade !== "ALL" ? `${view.grade}학년 기준` : "현재 사용 가능한 계정"} />
      <Metric label="이 기간 이용자" value={`${formatNumber(using.length)}명`} note={`미사용 ${levelCounts.NONE}명 · 저조 ${levelCounts.LOW}명`} tone={levelCounts.NONE > 0 && levelCounts.NONE >= base.length / 2 ? "warn" : undefined} />
      <Metric label="성공 요청" value={`${formatNumber(requests)}건`} note={<>직전 기간 대비 <Change current={requests} previous={base.reduce((sum, user) => sum + user.prevRequests, 0)} /></>} />
      <Metric label="이용자 1인당" value={`${using.length ? (requests / using.length).toFixed(1) : "0"}건`} note={`활동일 평균 ${using.length ? (using.reduce((sum, user) => sum + user.activeDays, 0) / using.length).toFixed(1) : "0"}일 / ${days}일`} />
    </section>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel title={`${label}별 이용 현황`} note={`활동 수준: 활동일 ÷ 조회 일수 ${levelRule.high * 100}% 이상 활발, ${levelRule.low * 100}% 이상 보통, 그 미만 저조, 성공 요청이 없으면 미사용. 이용량은 학습 성취도를 뜻하지 않습니다.`}>
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="활동 수준으로 거르기">
            <button type="button" className={chip} aria-pressed={view.level === "ALL"} onClick={() => onView({ level: "ALL", page: 1 })}>전체 <b>{base.length}</b></button>
            {levels.map((level) => <button key={level} type="button" className={chip} aria-pressed={view.level === level} onClick={() => onView({ level: view.level === level ? "ALL" : level, page: 1 })}>{levelLabels[level]} <b>{levelCounts[level]}</b></button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="점검 표시로 거르기">
            <span className="text-xs font-semibold text-ink-4">점검 표시</span>
            {flags.filter((flag) => flagCounts[flag] > 0 || view.flag === flag).map((flag) => <button key={flag} type="button" className={cn(chip, "min-h-8 text-xs")} aria-pressed={view.flag === flag} onClick={() => onView({ flag: view.flag === flag ? "ALL" : flag, page: 1 })}>{flagLabels[flag]} <b>{flagCounts[flag]}</b></button>)}
            {flags.every((flag) => flagCounts[flag] === 0) && <span className="text-xs text-ink-4">해당하는 {label}이 없습니다.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {role === "STUDENT" && <select aria-label="학년" className={control} value={view.grade} onChange={(event) => onView({ grade: event.target.value, page: 1 })}><option value="ALL">전체 학년</option>{[1, 2, 3].map((grade) => <option key={grade} value={grade}>{grade}학년</option>)}</select>}
            <label className={cn(control, "flex min-w-52 flex-1 items-center gap-2")}><Search size={15} className="shrink-0 text-ink-4" /><span className="sr-only">이름 또는 학번 검색</span><input type="search" className="min-w-0 flex-1 bg-transparent outline-none" placeholder="이름·학번으로 검색" value={view.q} onChange={(event) => onView({ q: event.target.value, page: 1 })} /></label>
            <select aria-label="정렬" className={control} value={view.sort} onChange={(event) => onView({ sort: event.target.value as SortKey, page: 1 })}>{Object.entries(sortLabels).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
            {filtered && <button type="button" className={cn(control, "text-ink-4")} onClick={() => onView({ level: "ALL", flag: "ALL", q: "", page: 1 })}>조건 초기화</button>}
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-4" aria-live="polite"><strong className="text-ink">{list.length}명</strong> {filtered ? "조건에 맞음" : "표시 중"}{subject !== "ALL" && ` · ${subject} 과목 기준`}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-line bg-surface-2 text-xs text-ink-4"><tr>
              {["이름", ...(role === "STUDENT" ? ["학년"] : []), "상태", "성공 요청", "직전 대비", "활동일", "마지막 사용", "주 과목", "실패"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {list.slice((page - 1) * pageSize, page * pageSize).map((user) => <tr key={user.id} className={cn("cursor-pointer hover:bg-brand-page", selected?.id === user.id && "bg-brand-soft/60")} onClick={() => select(user.id)}>
                <td className="px-3 py-3"><button type="button" className="text-left font-bold text-brand-dark underline-offset-4 hover:underline" aria-current={selected?.id === user.id} onClick={(event) => { event.stopPropagation(); select(user.id); }}>{user.name}</button>{user.externalId && <span className="block text-xs text-ink-4">{user.externalId}</span>}</td>
                {role === "STUDENT" && <td className="whitespace-nowrap px-3 py-3">{user.grade ? `${user.grade}학년` : "—"}</td>}
                <td className="px-3 py-3"><div className="flex flex-wrap gap-1"><LevelBadge level={user.level} />{user.flags.map((flag) => <FlagBadge key={flag} flag={flag} />)}</div></td>
                <td className="whitespace-nowrap px-3 py-3 font-bold tabular-nums">{formatNumber(user.requests)}건</td>
                <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums"><Change current={user.requests} previous={user.prevRequests} /><span className="block text-ink-4">직전 {formatNumber(user.prevRequests)}건</span></td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">{user.activeDays}<span className="text-ink-4"> / {days}일</span></td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">{shortTime(user.lastAt)}</td>
                <td className="max-w-40 truncate px-3 py-3">{user.subjects[0]?.subject ?? "—"}{user.subjects.length > 1 && <span className="text-xs text-ink-4"> 외 {user.subjects.length - 1}</span>}</td>
                <td className={cn("whitespace-nowrap px-3 py-3 tabular-nums", user.failed > 0 ? "font-semibold text-danger" : "text-ink-4")}>{user.failed}</td>
              </tr>)}
              {!list.length && <tr><td colSpan={9} className="py-12 text-center text-ink-4">조건에 맞는 {label}이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && <nav className="mt-4 flex items-center justify-end gap-3 text-sm" aria-label={`${label} 목록 페이지`}><button type="button" className={control} disabled={page <= 1} onClick={() => onView({ page: page - 1 })}>이전</button><span className="tabular-nums">{page} / {pages}</span><button type="button" className={control} disabled={page >= pages} onClick={() => onView({ page: page + 1 })}>다음</button></nav>}
      </Panel>

      <div ref={detailRef} className="scroll-mt-4 xl:sticky xl:top-4">
        {selected ? <PersonDetail user={selected} data={data} subject={subject} days={days} onClose={() => onView({ selected: null })} />
          : <aside className="rounded-2xl border border-dashed border-line bg-surface-2 p-8 text-center text-sm leading-7 text-ink-4">목록에서 {label}을 고르면<br />일별 이용, 과목·단원, 요청 유형, 시간대를<br />자세히 볼 수 있습니다.</aside>}
      </div>
    </div>
  </div>;
}

function PersonDetail({ user, data, subject, days, onClose }: { user: UserSummary; data: SchoolUsageData; subject: string; days: number; onClose: () => void }) {
  const detail = useMemo(() => userDetail(data, user.id, subject), [data, user.id, subject]);
  const color = roleColors[user.role === "STUDENT" ? "STUDENT" : "TEACHER"];
  const busiest = [...detail.hourly].sort((a, b) => b.requests - a.requests)[0];
  return <section className="rounded-2xl border border-line bg-surface p-5" aria-label={`${user.name} 상세 통계`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-4">{roleName(user.role)}{user.grade ? ` · ${user.grade}학년` : ""}{user.externalId ? ` · ${user.externalId}` : ""}</p>
        <h3 className="mt-1 text-xl font-extrabold">{user.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1"><LevelBadge level={user.level} />{user.flags.map((flag) => <FlagBadge key={flag} flag={flag} />)}</div>
      </div>
      <button type="button" className="rounded-lg p-2 text-ink-4 hover:bg-surface-2" aria-label="상세 닫기" onClick={onClose}><X size={18} /></button>
    </div>
    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {[
        ["성공 요청", <><b>{formatNumber(user.requests)}건</b> <span className="text-xs"><Change current={user.requests} previous={user.prevRequests} /></span></>],
        ["직전 기간", `${formatNumber(user.prevRequests)}건`],
        ["활동일", `${user.activeDays} / ${days}일`],
        ["활동일 하루 평균", user.activeDays ? `${(user.requests / user.activeDays).toFixed(1)}건` : "—"],
        ["마지막 사용", shortTime(user.lastAt)],
        ["마지막 로그인", user.lastLoginAt === undefined ? "—" : user.lastLoginAt ? shortTime(user.lastLoginAt) : "기록 없음"],
        ["실패 요청", <span key="failed" className={user.failed ? "font-semibold text-danger" : undefined}>{user.failed}건</span>],
        ["평균 응답 · 예상 비용", `${detail.averageLatency === null ? "—" : `${(detail.averageLatency / 1000).toFixed(1)}초`} · ${formatUsd(user.cost)}`],
      ].map(([term, value]) => <div key={String(term)} className="min-w-0"><dt className="text-xs text-ink-4">{term}</dt><dd className="mt-0.5 truncate tabular-nums">{value}</dd></div>)}
    </dl>

    <h4 className="mt-6 text-sm font-bold">일별 성공 요청</h4>
    <div className="mt-2 h-36"><ResponsiveContainer><BarChart data={detail.daily} margin={{ left: -28, right: 4, top: 4 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 10 }} minTickGap={16} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar name="성공 요청" dataKey="requests" fill={color} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>

    <h4 className="mt-5 text-sm font-bold">시간대 <span className="font-normal text-ink-4">{user.requests ? `· 가장 많은 시간 ${busiest.hour}시` : ""}</span></h4>
    <div className="mt-2 h-24"><ResponsiveContainer><BarChart data={detail.hourly} margin={{ left: -28, right: 4 }}><XAxis dataKey="hour" tickFormatter={(value) => `${value}`} tick={{ fontSize: 10 }} interval={2} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(value) => `${value}시`} /><Bar name="성공 요청" dataKey="requests" fill={color} fillOpacity={0.75} /></BarChart></ResponsiveContainer></div>

    <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
      <div><h4 className="mb-3 text-sm font-bold">과목별</h4><ShareBars items={detail.subjects.slice(0, 6).map((item) => ({ key: item.subject, label: item.subject, value: item.requests, color }))} /></div>
      <div><h4 className="mb-3 text-sm font-bold">요청 유형</h4><ShareBars items={detail.actions.map((item) => ({ key: item.action, label: actionLabels[item.action] ?? item.action, value: item.requests, color: "var(--brand)" }))} /></div>
    </div>
    <h4 className="mt-5 text-sm font-bold">자주 질문한 단원</h4>
    {detail.units.length ? <ol className="mt-2 divide-y divide-line text-sm">{detail.units.map((unit, index) => <li key={`${unit.subject}:${unit.unit}`} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate"><span className="mr-2 text-ink-4">{index + 1}</span><span className="mr-1.5 text-xs text-ink-4">{unit.subject}</span>{unit.unit}</span><b className="shrink-0 tabular-nums">{unit.requests}건</b></li>)}</ol> : <p className="mt-2 text-sm text-ink-4">기록이 없습니다.</p>}
    {detail.errors.length > 0 && <><h4 className="mt-5 text-sm font-bold text-danger">실패 원인</h4><ul className="mt-2 space-y-1.5 text-sm">{detail.errors.map((error) => <li key={error.code} className="flex justify-between gap-3"><span className="break-all font-mono text-xs">{error.code}</span><b className="shrink-0">{error.requests}건</b></li>)}</ul></>}
  </section>;
}

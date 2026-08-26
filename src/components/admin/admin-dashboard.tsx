"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, CalendarDays, CircleDollarSign, Clock3, Gauge, UsersRound } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dailyTrend, studentUsage, unitRanking } from "@/data/admin-metrics";
import { formatNumber, formatUsd } from "@/lib/utils";

const ranges = ["오늘", "최근 7일", "최근 30일"];

export function AdminDashboard() {
  const [range, setRange] = useState("최근 7일");
  const [metrics, setMetrics] = useState({
    summary: { requests: 1606, students: 264, estimatedCostUsd: 7.84, averageLatencyMs: 2400 },
    dailyTrend,
    unitRanking,
    studentUsage,
  });

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((response) => response.json())
      .then((data) => {
        if (data.summary) setMetrics(data);
      })
      .catch(() => undefined);
  }, []);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="flex items-center gap-2 text-xs font-extrabold tracking-[.12em] text-brand uppercase"><Activity size={15} /> Live operation</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em]">학교 사용 현황</h1><p className="mt-2 text-sm text-ink-soft">학생 개인 대화 내용 없이 사용량과 학습 집중 단원을 확인합니다.</p></div>
        <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl border border-line bg-white p-1">{ranges.map((item) => <button key={item} onClick={() => setRange(item)} className={`min-h-9 cursor-pointer rounded-lg px-3 text-xs font-bold ${range === item ? "bg-brand text-white" : "text-ink-soft hover:bg-surface-muted"}`}>{item}</button>)}</div><select className="min-h-11 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink"><option>전체 학년</option><option>1학년</option><option>2학년</option><option>3학년</option></select><select className="min-h-11 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink"><option>전체 과목</option><option>국어</option><option>영어</option><option>수학</option></select></div>
      </header>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Gauge} label="AI 요청" value={formatNumber(metrics.summary.requests)} note="지난 7일" delta="12.4%" />
        <Metric icon={UsersRound} label="이용 학생" value={`${formatNumber(metrics.summary.students)}명`} note="기간 내 활성 학생" delta="5.8%" />
        <Metric icon={Clock3} label="평균 응답 시간" value={`${(metrics.summary.averageLatencyMs / 1000).toFixed(1)}초`} note="목표 3초 이내" />
        <Metric icon={CircleDollarSign} label="예상 API 비용" value={formatUsd(metrics.summary.estimatedCostUsd)} note="실제 청구와 다를 수 있음" delta="8.1%" accent />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="surface-card min-w-0 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">일별 학습 활동</h2><p className="mt-1 text-xs text-ink-soft">성공한 AI 요청과 이용 학생 수</p></div><CalendarDays size={19} className="text-ink-soft" /></div><div className="mt-6 h-[270px] w-full"><ResponsiveContainer><AreaChart data={metrics.dailyTrend} margin={{ left: -20, right: 5 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0c6e5d" stopOpacity={0.3} /><stop offset="100%" stopColor="#0c6e5d" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e8efec" vertical={false} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#7a8d87", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#7a8d87", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dce6e2", boxShadow: "0 10px 30px rgba(20,50,43,.1)" }} /><Area type="monotone" dataKey="requests" stroke="#0c6e5d" strokeWidth={2.5} fill="url(#activityFill)" /></AreaChart></ResponsiveContainer></div></div>
        <div className="surface-card min-w-0 p-5 sm:p-6"><div><h2 className="font-extrabold">질문 집중 단원</h2><p className="mt-1 text-xs text-ink-soft">보완 수업이 필요한 단원 순위</p></div><div className="mt-6 h-[270px] w-full"><ResponsiveContainer><BarChart data={metrics.unitRanking} layout="vertical" margin={{ left: 6, right: 12 }}><CartesianGrid stroke="#edf2f0" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="unit" type="category" axisLine={false} tickLine={false} width={105} tick={{ fill: "#4e625c", fontSize: 11 }} /><Tooltip cursor={{ fill: "#f4f7f5" }} contentStyle={{ borderRadius: 12, border: "1px solid #dce6e2" }} /><Bar dataKey="requests" fill="#e98b48" radius={[0, 6, 6, 0]} barSize={16} /></BarChart></ResponsiveContainer></div></div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white"><div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6"><div><h2 className="font-extrabold">학생별 사용량</h2><p className="mt-1 text-xs text-ink-soft">질문 원문은 수집하거나 표시하지 않습니다.</p></div><button className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-brand hover:bg-brand-soft">전체 보기 <ArrowUpRight size={15} /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left"><thead className="bg-[#f8faf9] text-[.68rem] font-bold tracking-wide text-[#7d8f89] uppercase"><tr><th className="px-6 py-3">학생</th><th className="px-4 py-3">학년</th><th className="px-4 py-3">오늘 사용량</th><th className="px-4 py-3">토큰</th><th className="px-4 py-3">예상 비용</th><th className="px-6 py-3 text-right">상태</th></tr></thead><tbody className="divide-y divide-line">{metrics.studentUsage.map((student) => <tr key={student.name} className="text-sm hover:bg-[#fbfcfc]"><td className="px-6 py-4 font-bold">{student.name}</td><td className="px-4 py-4 text-ink-soft">{student.grade}학년</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted"><div className={`h-full rounded-full ${student.requests >= 18 ? "bg-accent" : "bg-brand"}`} style={{ width: `${(student.requests / student.limit) * 100}%` }} /></div><span className="text-xs font-bold">{student.requests}/{student.limit}</span></div></td><td className="px-4 py-4 text-ink-soft">{formatNumber(student.tokens)}</td><td className="px-4 py-4 font-semibold">{formatUsd(student.cost)}</td><td className="px-6 py-4 text-right"><span className={`rounded-full px-2.5 py-1 text-[.68rem] font-bold ${student.requests >= 18 ? "bg-accent-soft text-[#9a552a]" : "bg-brand-soft text-brand"}`}>{student.requests >= 18 ? "한도 임박" : "정상"}</span></td></tr>)}</tbody></table></div></section>
      <p className="mt-4 text-right text-[.68rem] text-[#8a9b96]">예상 비용은 토큰 사용량과 등록 단가로 계산되며 실제 청구액과 다를 수 있습니다.</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, delta, accent = false }: { icon: typeof Gauge; label: string; value: string; note: string; delta?: string; accent?: boolean }) {
  return <div className="surface-card p-5"><div className="flex items-center justify-between"><span className={`grid size-10 place-items-center rounded-xl ${accent ? "bg-accent-soft text-accent" : "bg-brand-soft text-brand"}`}><Icon size={19} /></span>{delta && <span className="flex items-center gap-1 text-[.68rem] font-bold text-brand"><ArrowUpRight size={13} />{delta}</span>}</div><p className="mt-4 text-xs font-semibold text-ink-soft">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-[-0.035em]">{value}</p><p className="mt-1 text-[.68rem] text-[#8b9a96]">{note}</p></div>;
}

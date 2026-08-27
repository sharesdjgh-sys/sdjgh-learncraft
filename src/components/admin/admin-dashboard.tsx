"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, CircleDollarSign, Clock3, Gauge, UsersRound } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dailyTrend, studentUsage, unitRanking } from "@/data/admin-metrics";
import { formatNumber, formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
      .then((data) => { if (data.summary) setMetrics(data); })
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <header className="grid gap-6 border-b border-line pb-8 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Activity size={15} /> 학교 운영 데이터</p>
          <h1 className="mt-3 text-[2.1rem] font-extrabold tracking-[-0.045em]">학교 사용 현황</h1>
          <p className="mt-3 text-[.92rem] leading-7 text-ink-3">학생 개인 대화 내용 없이 사용량과 학습이 집중되는 단원을 확인합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[12px] border border-line bg-surface-3 p-1">{ranges.map((item) => <button key={item} onClick={() => setRange(item)} className={cn("min-h-10 rounded-[9px] px-4 text-[.8rem] font-bold transition-all duration-300", range === item ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>{item}</button>)}</div>
          <select className="min-h-12 rounded-[11px] border border-line bg-surface px-3 text-[.82rem] font-bold text-ink"><option>전체 학년</option><option>1학년</option><option>2학년</option><option>3학년</option></select>
          <select className="min-h-12 rounded-[11px] border border-line bg-surface px-3 text-[.82rem] font-bold text-ink"><option>전체 과목</option><option>국어</option><option>영어</option><option>수학</option></select>
        </div>
      </header>

      <section className="mt-7 grid divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        <Metric icon={Gauge} label="AI 요청" value={formatNumber(metrics.summary.requests)} note="지난 7일" delta="12.4%" />
        <Metric icon={UsersRound} label="이용 학생" value={`${formatNumber(metrics.summary.students)}명`} note="기간 내 활성 학생" delta="5.8%" />
        <Metric icon={Clock3} label="평균 응답 시간" value={`${(metrics.summary.averageLatencyMs / 1000).toFixed(1)}초`} note="목표 3초 이내" />
        <Metric icon={CircleDollarSign} label="예상 API 비용" value={formatUsd(metrics.summary.estimatedCostUsd)} note="실제 청구와 다를 수 있음" delta="8.1%" />
      </section>

      <section className="mt-9 grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-[16px] border border-line bg-surface p-5 shadow-[var(--lift-2)] sm:p-7">
          <div><h2 className="text-lg font-extrabold">일별 학습 활동</h2><p className="mt-1 text-[.82rem] text-ink-4">성공한 AI 요청 추세</p></div>
          <div className="mt-7 h-[280px] w-full"><ResponsiveContainer><AreaChart data={metrics.dailyTrend} margin={{ left: -20, right: 5 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#765f82" stopOpacity={0.2} /><stop offset="100%" stopColor="#765f82" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="rgba(54,47,58,.1)" vertical={false} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#857d88", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#857d88", fontSize: 12 }} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(54,47,58,.14)", boxShadow: "0 12px 28px rgba(42,35,31,.08)" }} /><Area type="monotone" dataKey="requests" stroke="#765f82" strokeWidth={2.5} fill="url(#activityFill)" /></AreaChart></ResponsiveContainer></div>
        </article>
        <article className="rounded-[16px] border border-line bg-surface p-5 shadow-[var(--lift-2)] sm:p-7">
          <div><h2 className="text-lg font-extrabold">질문 집중 단원</h2><p className="mt-1 text-[.82rem] text-ink-4">보완 수업이 필요한 단원 순위</p></div>
          <div className="mt-7 h-[280px] w-full"><ResponsiveContainer><BarChart data={metrics.unitRanking} layout="vertical" margin={{ left: 6, right: 12 }}><CartesianGrid stroke="rgba(54,47,58,.08)" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="unit" type="category" axisLine={false} tickLine={false} width={108} tick={{ fill: "#665f69", fontSize: 11.5 }} /><Tooltip cursor={{ fill: "#f7f5f0" }} contentStyle={{ borderRadius: 10, border: "1px solid rgba(54,47,58,.14)" }} /><Bar dataKey="requests" fill="#765f82" radius={[0, 5, 5, 0]} barSize={16} /></BarChart></ResponsiveContainer></div>
        </article>
      </section>

      <section className="mt-9 overflow-hidden rounded-[16px] border border-line bg-surface shadow-[var(--lift-2)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-7"><div><h2 className="text-lg font-extrabold">학생별 사용량</h2><p className="mt-1 text-[.82rem] text-ink-4">질문 원문은 수집하거나 표시하지 않습니다.</p></div><button className="flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-[.82rem] font-bold text-brand transition hover:bg-brand-soft">전체 보기 <ArrowUpRight size={15} /></button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left"><thead className="bg-surface-2 text-[.76rem] font-bold text-ink-4"><tr><th className="px-7 py-3">학생</th><th className="px-4 py-3">학년</th><th className="px-4 py-3">오늘 사용량</th><th className="px-4 py-3">토큰</th><th className="px-4 py-3">예상 비용</th><th className="px-7 py-3 text-right">상태</th></tr></thead><tbody className="divide-y divide-line">{metrics.studentUsage.map((student) => <tr key={student.name} className="text-[.88rem] hover:bg-surface-2"><td className="px-7 py-4 font-bold">{student.name}</td><td className="px-4 py-4 text-ink-3">{student.grade}학년</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3"><div className={cn("h-full rounded-full", student.requests >= 18 ? "bg-warn" : "bg-brand")} style={{ width: `${(student.requests / student.limit) * 100}%` }} /></div><span className="figure text-[.8rem] font-semibold">{student.requests}/{student.limit}</span></div></td><td className="figure px-4 py-4 text-ink-3">{formatNumber(student.tokens)}</td><td className="figure px-4 py-4 font-semibold">{formatUsd(student.cost)}</td><td className="px-7 py-4 text-right"><span className={cn("rounded-full px-2.5 py-1 text-[.76rem] font-bold", student.requests >= 18 ? "bg-[var(--warn-page)] text-warn" : "bg-[var(--ok-page)] text-ok")}>{student.requests >= 18 ? "한도 임박" : "정상"}</span></td></tr>)}</tbody></table></div>
      </section>
      <p className="mt-4 text-right text-[.78rem] text-ink-5">예상 비용은 등록 단가로 계산되며 실제 청구액과 다를 수 있습니다.</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, delta }: { icon: typeof Gauge; label: string; value: string; note: string; delta?: string }) {
  return <div className="px-3 py-6 sm:px-6"><div className="flex items-center justify-between"><Icon size={18} className="text-brand" strokeWidth={1.8} />{delta && <span className="flex items-center gap-1 text-[.76rem] font-bold text-brand"><ArrowUpRight size={13} />{delta}</span>}</div><p className="mt-5 text-[.82rem] font-semibold text-ink-4">{label}</p><p className="figure mt-1 text-2xl font-semibold tracking-[-0.03em]">{value}</p><p className="mt-1 text-[.76rem] text-ink-5">{note}</p></div>;
}

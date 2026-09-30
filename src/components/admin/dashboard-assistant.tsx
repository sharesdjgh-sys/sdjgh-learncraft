"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { summarizeAssistant, type AssistantUsageData } from "@/features/teacher-assistant/insights";
import { formatNumber } from "@/lib/utils";
import styles from "./accounts.module.css";
import d from "./dashboard.module.css";
import { Avatar, Card, ShareBars, Stat, cx, percent, seconds, shortTime } from "./dashboard-ui";

const axis = { tick: { fontSize: 11, fill: "#8a90a0" }, tickLine: false } as const;
const OFF_TOPIC_WATCH = 30;

// 교사 지원실 AI 도우미 통계 탭입니다. 학교 사용 현황과 같은 조회 기간을 쓰고, 질문 내용은 조회하지 않습니다.
export function AssistantTab({ start, end, refresh }: { start: string; end: string; refresh: number }) {
  const [result, setResult] = useState<{ key: string; data?: AssistantUsageData; error?: string }>({ key: "" });
  const key = `${start}|${end}|${refresh}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/teacher-assistant?start=${start}&end=${end}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "AI 도우미 통계를 불러오지 못했습니다.");
        setResult({ key, data: body });
      })
      .catch((reason) => { if (!controller.signal.aborted) setResult({ key, error: reason instanceof Error ? reason.message : "AI 도우미 통계를 불러오지 못했습니다." }); });
    return () => controller.abort();
  }, [start, end, refresh, key]);

  const data = result.key === key ? result.data : undefined;
  const summary = useMemo(() => data ? summarizeAssistant(data) : null, [data]);
  if (result.key === key && result.error) return <p role="alert" className={styles.alert}>{result.error}</p>;
  if (!data || !summary) return <div className="space-y-4" role="status" aria-label="AI 도우미 통계를 불러오는 중"><div className={d.stats}>{[0, 1, 2, 3].map((n) => <div key={n} className={styles.skeleton} style={{ height: 92 }} />)}</div><div className={styles.skeleton} style={{ height: 280 }} /></div>;
  if (!data.available) return <section className={styles.card}><div className={styles.empty}><Info size={26} className={styles.emptyIcon} /><h3>실제 통계 연결이 필요합니다</h3><p>데이터베이스가 연결되지 않아 운영 기록을 조회할 수 없습니다.</p></div></section>;

  const offTopicHigh = summary.offTopicRate !== null && summary.offTopicRate >= OFF_TOPIC_WATCH;
  return <>
    <div className={d.stats}>
      <Stat label="AI 도우미 질문" value={formatNumber(summary.total)} unit="건" tone={d.toneBrand} note={`하루 평균 ${summary.average.toFixed(1)}건 · 이용자 1인당 ${summary.perUser.toFixed(1)}건`} />
      <Stat label="이용한 선생님" value={formatNumber(summary.users)} unit="명" tone={d.toneTeacher} note={`교사 계정 ${formatNumber(summary.registered)}명 중 이용률 ${percent(summary.useRate)}`} />
      <Stat label={<>{offTopicHigh ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}교육 범위 밖 질문</>} value={formatNumber(summary.offTopic)} unit="건" tone={offTopicHigh ? d.toneWarn : d.toneOk} note={`전체의 ${percent(summary.offTopicRate)} · AI가 정중히 사양한 질문`} />
      <Stat label="실패율 · 평균 응답" value={percent(summary.failureRate)} tone={summary.failureRate !== null && summary.failureRate >= 5 ? d.toneDanger : d.toneMuted} note={`실패 ${formatNumber(summary.failed)}건 · 평균 ${seconds(summary.averageLatency)} · 토큰 ${formatNumber(summary.tokens)}`} />
    </div>

    <div className={cx(d.grid, d.halves, d.gap)}>
      <Card title="일별 질문 추이" note="요청이 없는 날도 포함합니다. 선은 교육 범위 밖 질문입니다." label="AI 도우미 일별 질문 추이">
        <div className={d.chart}><ResponsiveContainer><AreaChart data={summary.daily} margin={{ left: 0, right: 8, top: 4 }}><CartesianGrid vertical={false} stroke="#eef0f4" /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} {...axis} axisLine={{ stroke: "#e2e4ea" }} minTickGap={20} /><YAxis allowDecimals={false} {...axis} axisLine={false} width={36} /><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Area name="질문" dataKey="requests" stroke="#6943b9" fill="#6943b9" fillOpacity={0.14} strokeWidth={1.6} /><Area name="범위 밖" dataKey="offTopic" stroke="#d69a3c" fill="#d69a3c" fillOpacity={0.2} strokeWidth={1.6} /></AreaChart></ResponsiveContainer></div>
      </Card>
      <Card title="교과별 질문" note="질문한 화면의 교과 기준 · 교과 없는 화면은 ‘공통’" label="AI 도우미 교과별 질문">
        <div className={d.cardBody}><ShareBars items={summary.subjects.map((item) => ({ key: item.subject, label: item.subject, note: item.offTopic ? `범위 밖 ${formatNumber(item.offTopic)}` : undefined, value: item.requests, color: "#8a78d4" }))} empty="AI 도우미 질문 기록이 없습니다." /></div>
      </Card>
    </div>

    <div className={d.gap}><Card title="선생님별 이용" note={summary.watch.length ? `교육 범위 밖 질문이 ${OFF_TOPIC_WATCH}% 이상인 선생님이 ${summary.watch.length}명 있습니다. 질문 내용은 저장하지 않으므로 필요하면 직접 안내해 주세요.` : "질문 수 순 · 질문 내용은 저장하지 않고 횟수만 집계합니다."} label="선생님별 AI 도우미 이용">
      {summary.people.length ? <div className={d.tableWrap}><table className={cx(styles.table, d.table)}>
        <thead><tr><th scope="col">선생님</th><th scope="col" className={d.num}>질문</th><th scope="col" className={d.num}>범위 밖</th><th scope="col" className={d.num}>활동일</th><th scope="col">마지막 사용</th></tr></thead>
        <tbody>{summary.people.map((person) => <tr key={person.id}>
          <td><span className="flex items-center gap-2"><Avatar name={person.name} role="TEACHER" /><span><b>{person.name}</b>{person.role === "ADMIN" && <small className="ml-1.5 text-[.7rem] text-ink-4">관리자</small>}</span></span></td>
          <td className={d.num}>{formatNumber(person.requests)}건</td>
          <td className={d.num}>{person.offTopic ? <b className={summary.watch.includes(person) ? d.down : undefined}>{formatNumber(person.offTopic)}건 ({person.offTopicRate.toFixed(0)}%)</b> : "—"}</td>
          <td className={d.num}>{person.activeDays}일</td>
          <td>{shortTime(person.lastAt)}</td>
        </tr>)}</tbody>
      </table></div> : <p className={d.empty}>AI 도우미를 사용한 선생님이 없습니다.</p>}
    </Card></div>
    <p className={d.note}><Info size={13} /><span>교사 지원실 AI 도우미의 대화를 성공 기준으로 집계합니다. 하루 사용 횟수는 제한하지 않으며, 질문과 답변 내용은 저장·조회하지 않습니다. ‘교육 범위 밖’은 AI가 교육과 무관하다고 판단해 정중히 사양한 질문이며 완벽한 분류는 아닙니다. 관리자 계정의 사용도 합계에 포함됩니다.</span></p>
  </>;
}

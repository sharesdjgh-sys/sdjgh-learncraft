import { dateRange } from "@/features/usage/school-insights";

/* 교사 지원실 AI 도우미 통계를 계산합니다. 서버(집계 조회)와 관리자 화면이 함께 씁니다. */

export type AssistantUsageRow = {
  userId: string; date: string; subject: string | null; tool: string | null; status: string; offTopic: boolean;
  requests: number; inputTokens: number; outputTokens: number; latencyTotal: number; latencyCount: number; lastAt: string;
};
export type AssistantTeacher = { id: string; name: string; role: string; active: boolean };
export type AssistantUsageData = {
  available: boolean; start: string; end: string; timeZone: string;
  teachers: AssistantTeacher[]; rows: AssistantUsageRow[];
};

/** 교과 없이 쓴 화면(예: 교사 지원실 첫 화면)은 ‘공통’으로 묶습니다. */
export const COMMON_SUBJECT = "공통";

export function summarizeAssistant(data: AssistantUsageData) {
  const dates = dateRange(data.start, data.end);
  const daily = new Map(dates.map((date) => [date, { date, requests: 0, offTopic: 0 }]));
  const teachers = new Map(data.teachers.map((teacher) => [teacher.id, teacher]));
  const subjects = new Map<string, { subject: string; requests: number; offTopic: number }>();
  const people = new Map<string, { id: string; name: string; role: string; active: boolean; requests: number; offTopic: number; tokens: number; days: Set<string>; lastAt: string }>();
  let total = 0, offTopic = 0, failed = 0, cancelled = 0, tokens = 0, latencyTotal = 0, latencyCount = 0;
  for (const row of data.rows) {
    const day = daily.get(row.date);
    const teacher = teachers.get(row.userId);
    if (!day || !teacher) continue;
    if (row.status === "FAILED") failed += row.requests;
    if (row.status === "CANCELLED") cancelled += row.requests;
    if (row.status !== "SUCCEEDED") continue;
    total += row.requests;
    day.requests += row.requests;
    tokens += row.inputTokens + row.outputTokens;
    latencyTotal += row.latencyTotal;
    latencyCount += row.latencyCount;
    const label = row.subject ?? COMMON_SUBJECT;
    const subject = subjects.get(label) ?? { subject: label, requests: 0, offTopic: 0 };
    subject.requests += row.requests;
    const person = people.get(row.userId) ?? { id: teacher.id, name: teacher.name, role: teacher.role, active: teacher.active, requests: 0, offTopic: 0, tokens: 0, days: new Set<string>(), lastAt: "" };
    person.requests += row.requests;
    person.tokens += row.inputTokens + row.outputTokens;
    person.days.add(row.date);
    if (row.lastAt > person.lastAt) person.lastAt = row.lastAt;
    if (row.offTopic) { offTopic += row.requests; day.offTopic += row.requests; subject.offTopic += row.requests; person.offTopic += row.requests; }
    subjects.set(label, subject);
    people.set(row.userId, person);
  }
  const ranked = [...people.values()].map(({ days, ...person }) => ({ ...person, activeDays: days.size, offTopicRate: person.requests ? person.offTopic / person.requests * 100 : 0 }))
    .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
  // 이용률은 교사 계정 기준입니다. 관리자가 쓴 기록은 합계와 순위에는 들어가지만 이용률에서는 뺍니다.
  const registered = data.teachers.filter((teacher) => teacher.role === "TEACHER" && teacher.active).length;
  return {
    total, offTopic, failed, cancelled, tokens,
    offTopicRate: total ? offTopic / total * 100 : null,
    failureRate: total + failed ? failed / (total + failed) * 100 : null,
    averageLatency: latencyCount ? latencyTotal / latencyCount : null,
    average: total / dates.length,
    registered, users: ranked.length,
    useRate: registered ? ranked.filter((person) => person.role === "TEACHER" && person.active).length / registered * 100 : null,
    perUser: ranked.length ? total / ranked.length : 0,
    daily: [...daily.values()],
    subjects: [...subjects.values()].sort((a, b) => b.requests - a.requests || a.subject.localeCompare(b.subject, "ko")),
    people: ranked,
    /** 교육과 무관한 질문이 눈에 띄게 많은 선생님(질문 5건 이상이고 30% 이상) */
    watch: ranked.filter((person) => person.requests >= 5 && person.offTopicRate >= 30),
  };
}
export type AssistantSummary = ReturnType<typeof summarizeAssistant>;

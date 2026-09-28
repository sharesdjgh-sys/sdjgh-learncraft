export type SchoolUser = {
  id: string; name: string; role: string; grade: number | null; active: boolean;
  externalId?: string; lastLoginAt?: string | null;
};
export type SchoolActivity = {
  userId: string; date: string; hour: number; subject: string; unit: string;
  requests: number; tokens: number; cost: number; status: string;
  latencyTotal: number; latencyCount: number; latencyMax: number; errorCode: string | null;
  /** tutor_action. 예전 응답에는 없을 수 있습니다. */
  action?: string;
  /** 학교 시간대 기준 마지막 요청 시각 `YYYY-MM-DD HH:MM` */
  lastAt?: string;
};
export type SchoolUsageData = {
  available: boolean; start: string; end: string; timeZone: string;
  users: SchoolUser[]; activities: SchoolActivity[];
};
export type SchoolUsageFilters = { role: string; grade: string; subject: string };

export function dateRange(start: string, end: string): string[] {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end)) throw new Error("올바른 날짜를 선택해 주세요.");
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (days < 1 || days > 93) throw new Error("조회 기간은 1일부터 93일까지 선택할 수 있습니다.");
  return Array.from({ length: days }, (_, index) => new Date(Date.parse(start) + index * 86400000).toISOString().slice(0, 10));
}

export function summarizeSchoolUsage(data: SchoolUsageData, filters: SchoolUsageFilters) {
  const dates = dateRange(data.start, data.end);
  const users = data.users.filter((user) => ["STUDENT", "TEACHER"].includes(user.role)
    && (filters.role === "ALL" || user.role === filters.role)
    && (filters.grade === "ALL" || (user.role === "STUDENT" && String(user.grade) === filters.grade)));
  const userMap = new Map(users.map((user) => [user.id, user]));
  const daily = new Map(dates.map((date) => [date, { date, students: 0, teachers: 0, requests: 0 }]));
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, students: 0, teachers: 0, requests: 0 }));
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const ranking = new Map<string, SchoolUser & { requests: number; tokens: number; cost: number; days: Set<string> }>();
  const units = new Map<string, { unit: string; subject: string; requests: number }>();
  const subjects = new Map<string, { subject: string; students: number; teachers: number; requests: number }>();
  const actions = new Map<string, number>();
  const errors = new Map<string, number>();
  let attempts = 0, failed = 0, pending = 0, cancelled = 0, latencyTotal = 0, latencyCount = 0, latencyMax = 0;
  for (const row of data.activities) {
    const user = userMap.get(row.userId);
    const day = daily.get(row.date);
    if (!user || !day || (filters.subject !== "ALL" && row.subject !== filters.subject)) continue;
    attempts += row.requests;
    if (row.status === "FAILED") {
      failed += row.requests;
      const code = row.errorCode ?? "UNKNOWN";
      errors.set(code, (errors.get(code) ?? 0) + row.requests);
    }
    if (row.status === "RESERVED") pending += row.requests;
    if (row.status === "CANCELLED") cancelled += row.requests;
    if (row.status !== "SUCCEEDED") continue;
    latencyTotal += row.latencyTotal;
    latencyCount += row.latencyCount;
    latencyMax = Math.max(latencyMax, row.latencyMax);
    const role = user.role === "STUDENT" ? "students" : "teachers";
    day[role] += row.requests;
    day.requests += row.requests;
    hourly[row.hour][role] += row.requests;
    hourly[row.hour].requests += row.requests;
    heatmap[(new Date(`${row.date}T00:00:00Z`).getUTCDay() + 6) % 7][row.hour] += row.requests;
    const person = ranking.get(user.id) ?? { ...user, requests: 0, tokens: 0, cost: 0, days: new Set<string>() };
    person.requests += row.requests;
    person.tokens += row.tokens;
    person.cost += row.cost;
    person.days.add(row.date);
    ranking.set(user.id, person);
    const key = JSON.stringify([row.subject, row.unit]);
    const unit = units.get(key) ?? { unit: row.unit, subject: row.subject, requests: 0 };
    unit.requests += row.requests;
    units.set(key, unit);
    const subject = subjects.get(row.subject) ?? { subject: row.subject, students: 0, teachers: 0, requests: 0 };
    subject[role] += row.requests;
    subject.requests += row.requests;
    subjects.set(row.subject, subject);
    const action = row.action ?? "QUESTION";
    actions.set(action, (actions.get(action) ?? 0) + row.requests);
  }
  const people = [...ranking.values()].map(({ days, ...user }) => ({ ...user, activeDays: days.size }))
    .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
  const roles = ["STUDENT", "TEACHER"].map((role) => {
    const registered = users.filter((user) => user.role === role && user.active).length;
    const active = people.filter((user) => user.role === role);
    const activeRegistered = active.filter((user) => user.active).length;
    return { role, registered, active: active.length, activeRegistered,
      rate: registered ? activeRegistered / registered * 100 : null,
      requests: active.reduce((sum, user) => sum + user.requests, 0) };
  });
  const dailyTrend = [...daily.values()];
  const total = people.reduce((sum, user) => sum + user.requests, 0);
  const peaks = [...dailyTrend].filter((day) => day.requests > 0).sort((a, b) => b.requests - a.requests || a.date.localeCompare(b.date)).slice(0, 5);
  return { total, people, roles, dailyTrend, hourly, heatmap, peaks, attempts, failed, pending, cancelled,
    errors: [...errors].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
    failureRate: total + failed ? failed / (total + failed) * 100 : null,
    averageLatency: latencyCount ? latencyTotal / latencyCount : null, latencyMax,
    average: total / dates.length,
    cost: people.reduce((sum, user) => sum + user.cost, 0),
    units: [...units.values()].sort((a, b) => b.requests - a.requests).slice(0, 10),
    subjects: [...subjects.values()].sort((a, b) => b.requests - a.requests),
    actions: [...actions].map(([action, requests]) => ({ action, requests })).sort((a, b) => b.requests - a.requests),
    busiestHour: [...hourly].sort((a, b) => b.requests - a.requests)[0],
  };
}

export const actionLabels: Record<string, string> = {
  QUESTION: "질문 답변", EASIER: "더 쉽게", DEEPER: "원리까지", REVEAL: "전체 풀이", QUIZ: "확인 문제",
};

export type ActivityLevel = "HIGH" | "NORMAL" | "LOW" | "NONE";
export type UserFlag = "DROPPED" | "SURGE" | "FAILURES" | "NEVER_LOGGED_IN" | "INACTIVE_ACCOUNT";
export const levelLabels: Record<ActivityLevel, string> = { HIGH: "활발", NORMAL: "보통", LOW: "저조", NONE: "미사용" };
export const flagLabels: Record<UserFlag, string> = {
  DROPPED: "사용 급감", SURGE: "사용 급증", FAILURES: "실패 잦음", NEVER_LOGGED_IN: "로그인 기록 없음", INACTIVE_ACCOUNT: "비활성 계정",
};
/** 활동일 비율(활동일 ÷ 조회 일수) 기준입니다. 바꾸면 화면의 설명 문구도 함께 바뀝니다. */
export const levelRule = { high: 0.4, low: 0.15 };

export function previousRange(start: string, end: string) {
  const days = dateRange(start, end).length;
  const shift = (value: string, offset: number) => new Date(Date.parse(value) + offset * 86400000).toISOString().slice(0, 10);
  return { start: shift(start, -days), end: shift(start, -1), days };
}

/**
 * 역할·학년·과목 조건에 맞는 모든 계정(미사용자 포함)의 기간 통계입니다.
 * 비활성 계정은 조회 기간이나 직전 기간에 요청이 있을 때만 포함합니다.
 */
export function summarizeUsers(data: SchoolUsageData, filters: SchoolUsageFilters) {
  const dates = new Set(dateRange(data.start, data.end));
  const previous = previousRange(data.start, data.end);
  const previousDates = new Set(dateRange(previous.start, previous.end));
  const stats = new Map<string, { requests: number; prevRequests: number; failed: number; tokens: number; cost: number;
    days: Set<string>; lastAt: string; subjects: Map<string, number> }>();
  const matches = (user: SchoolUser) => ["STUDENT", "TEACHER"].includes(user.role)
    && (filters.role === "ALL" || user.role === filters.role)
    && (filters.grade === "ALL" || (user.role === "STUDENT" && String(user.grade) === filters.grade));
  for (const row of data.activities) {
    if (filters.subject !== "ALL" && row.subject !== filters.subject) continue;
    const current = dates.has(row.date);
    if (!current && !previousDates.has(row.date)) continue;
    const item = stats.get(row.userId) ?? { requests: 0, prevRequests: 0, failed: 0, tokens: 0, cost: 0, days: new Set<string>(), lastAt: "", subjects: new Map<string, number>() };
    stats.set(row.userId, item);
    if (!current) {
      if (row.status === "SUCCEEDED") item.prevRequests += row.requests;
      continue;
    }
    if (row.status === "FAILED") item.failed += row.requests;
    if (row.status !== "SUCCEEDED") continue;
    item.requests += row.requests;
    item.tokens += row.tokens;
    item.cost += row.cost;
    item.days.add(row.date);
    const lastAt = row.lastAt ?? row.date;
    if (lastAt > item.lastAt) item.lastAt = lastAt;
    item.subjects.set(row.subject, (item.subjects.get(row.subject) ?? 0) + row.requests);
  }
  return data.users.filter((user) => matches(user) && (user.active || stats.has(user.id))).map((user) => {
    const item = stats.get(user.id);
    const requests = item?.requests ?? 0;
    const prevRequests = item?.prevRequests ?? 0;
    const failed = item?.failed ?? 0;
    const activeDays = item?.days.size ?? 0;
    const ratio = activeDays / dates.size;
    const level: ActivityLevel = !requests ? "NONE" : ratio >= levelRule.high ? "HIGH" : ratio >= levelRule.low ? "NORMAL" : "LOW";
    const flags: UserFlag[] = [];
    if (prevRequests >= 5 && requests <= prevRequests * 0.3) flags.push("DROPPED");
    if (requests >= 20 && requests >= Math.max(1, prevRequests) * 3) flags.push("SURGE");
    if (failed >= 3) flags.push("FAILURES");
    if (user.active && user.lastLoginAt === null) flags.push("NEVER_LOGGED_IN");
    if (!user.active) flags.push("INACTIVE_ACCOUNT");
    const subjects = [...item?.subjects ?? []].map(([subject, count]) => ({ subject, requests: count })).sort((a, b) => b.requests - a.requests);
    return { ...user, requests, prevRequests, failed, tokens: item?.tokens ?? 0, cost: item?.cost ?? 0,
      activeDays, lastAt: item?.lastAt || null, subjects, level, flags };
  }).sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
}
export type UserSummary = ReturnType<typeof summarizeUsers>[number];

/** 학년별 학생과 교사 전체의 등록·이용 요약입니다. 이용률은 활성 계정 기준입니다. */
export function summarizeGroups(users: UserSummary[]) {
  const groups = [
    ...[1, 2, 3].map((grade) => ({ key: `G${grade}`, label: `${grade}학년`, members: users.filter((user) => user.role === "STUDENT" && user.grade === grade) })),
    { key: "G0", label: "학년 미지정", members: users.filter((user) => user.role === "STUDENT" && ![1, 2, 3].includes(user.grade ?? 0)) },
    { key: "TEACHER", label: "교사", members: users.filter((user) => user.role === "TEACHER") },
  ];
  return groups.filter((group) => group.members.length > 0).map(({ key, label, members }) => {
    const registered = members.filter((user) => user.active);
    const using = registered.filter((user) => user.requests > 0).length;
    const requests = members.reduce((sum, user) => sum + user.requests, 0);
    const users = members.filter((user) => user.requests > 0).length;
    const levels = { HIGH: 0, NORMAL: 0, LOW: 0, NONE: 0 } as Record<ActivityLevel, number>;
    for (const user of registered) levels[user.level] += 1;
    return { key, label, registered: registered.length, using, rate: registered.length ? using / registered.length * 100 : null,
      requests, prevRequests: members.reduce((sum, user) => sum + user.prevRequests, 0),
      perUser: users ? requests / users : 0, levels };
  });
}

/** 한 사람의 조회 기간 상세입니다(성공 요청 기준, 과목 필터 적용). */
export function userDetail(data: SchoolUsageData, userId: string, subject: string) {
  const daily = new Map(dateRange(data.start, data.end).map((date) => [date, 0]));
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, requests: 0 }));
  const subjects = new Map<string, number>();
  const units = new Map<string, { subject: string; unit: string; requests: number }>();
  const actions = new Map<string, number>();
  const errors = new Map<string, number>();
  let latencyTotal = 0, latencyCount = 0;
  for (const row of data.activities) {
    if (row.userId !== userId || !daily.has(row.date) || (subject !== "ALL" && row.subject !== subject)) continue;
    if (row.status === "FAILED") {
      const code = row.errorCode ?? "UNKNOWN";
      errors.set(code, (errors.get(code) ?? 0) + row.requests);
    }
    if (row.status !== "SUCCEEDED") continue;
    daily.set(row.date, daily.get(row.date)! + row.requests);
    hourly[row.hour].requests += row.requests;
    subjects.set(row.subject, (subjects.get(row.subject) ?? 0) + row.requests);
    const key = JSON.stringify([row.subject, row.unit]);
    const unit = units.get(key) ?? { subject: row.subject, unit: row.unit, requests: 0 };
    unit.requests += row.requests;
    units.set(key, unit);
    const action = row.action ?? "QUESTION";
    actions.set(action, (actions.get(action) ?? 0) + row.requests);
    latencyTotal += row.latencyTotal;
    latencyCount += row.latencyCount;
  }
  const sorted = <T extends { requests: number }>(values: T[]) => values.sort((a, b) => b.requests - a.requests);
  return {
    daily: [...daily].map(([date, requests]) => ({ date, requests })), hourly,
    subjects: sorted([...subjects].map(([name, requests]) => ({ subject: name, requests }))),
    units: sorted([...units.values()]).slice(0, 6),
    actions: sorted([...actions].map(([action, requests]) => ({ action, requests }))),
    errors: sorted([...errors].map(([code, requests]) => ({ code, requests }))),
    averageLatency: latencyCount ? latencyTotal / latencyCount : null,
  };
}

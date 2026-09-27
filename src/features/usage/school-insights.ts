export type SchoolUser = { id: string; name: string; role: string; grade: number | null; active: boolean };
export type SchoolActivity = {
  userId: string; date: string; hour: number; subject: string; unit: string;
  requests: number; tokens: number; cost: number; status: string;
  latencyTotal: number; latencyCount: number; latencyMax: number; errorCode: string | null;
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
    units: [...units.values()].sort((a, b) => b.requests - a.requests).slice(0, 8),
    busiestHour: [...hourly].sort((a, b) => b.requests - a.requests)[0],
  };
}

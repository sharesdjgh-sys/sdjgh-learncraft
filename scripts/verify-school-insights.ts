import assert from "node:assert/strict";
import { dateRange, previousRange, summarizeGroups, summarizeSchoolUsage, summarizeUsers, userDetail, type SchoolActivity, type SchoolUsageData } from "../src/features/usage/school-insights";

const base: SchoolActivity = { userId: "student-a", date: "2026-09-21", hour: 23, subject: "수학", unit: "함수", requests: 3, tokens: 90, cost: 0.01, status: "SUCCEEDED", latencyTotal: 6000, latencyCount: 3, latencyMax: 2500, errorCode: null };
const data: SchoolUsageData = {
  available: true, start: "2026-09-21", end: "2026-09-27", timeZone: "Asia/Seoul",
  users: [
    { id: "student-a", name: "동명이인", grade: 1, role: "STUDENT", active: true },
    { id: "student-b", name: "동명이인", grade: 2, role: "STUDENT", active: true },
    { id: "inactive", name: "이전 학생", grade: 1, role: "STUDENT", active: false },
    { id: "unused", name: "미사용 학생", grade: 1, role: "STUDENT", active: true },
    { id: "teacher", name: "선생님", grade: null, role: "TEACHER", active: true },
    { id: "admin", name: "관리자", grade: null, role: "ADMIN", active: true },
  ],
  activities: [base,
    { ...base, userId: "student-b", requests: 6, date: "2026-09-22", hour: 0 },
    { ...base, userId: "teacher", requests: 5, subject: "영어" },
    { ...base, userId: "inactive", requests: 1 },
    { ...base, userId: "admin", requests: 100 },
    { ...base, userId: "outside-school", requests: 100 },
    { ...base, date: "2026-09-20", requests: 100 },
    { ...base, requests: 2, status: "FAILED", errorCode: "AI_PROVIDER_ERROR" },
    { ...base, requests: 1, status: "RESERVED" },
    { ...base, requests: 1, status: "CANCELLED" },
  ],
};
const all = { role: "ALL", grade: "ALL", subject: "ALL" };
const result = summarizeSchoolUsage(data, all);
assert.equal(result.total, 15);
assert.equal(result.attempts, 19);
assert.equal(result.failed, 2);
assert.equal(result.pending, 1);
assert.equal(result.cancelled, 1);
assert.equal(result.failureRate, 2 / 17 * 100);
assert.equal(result.averageLatency, 2000);
assert.equal(result.people.length, 4);
assert.equal(result.people[0].id, "student-b");
assert.equal(result.people.filter((user) => user.name === "동명이인").length, 2);
assert.equal(result.roles[0].registered, 3);
assert.equal(result.roles[0].active, 3);
assert.equal(result.roles[0].rate, 2 / 3 * 100);
assert.equal(result.roles[1].rate, 100);
assert.equal(result.dailyTrend.length, 7);
assert.equal(result.dailyTrend[6].requests, 0);
assert.equal(result.hourly.length, 24);
assert.equal(result.heatmap[0][23], 9);
assert.equal(result.heatmap[1][0], 6);
assert.equal(result.hourly.reduce((sum, hour) => sum + hour.requests, 0), result.total);
assert.equal(result.peaks[0].date, "2026-09-21");
assert.deepEqual(result.errors, [{ code: "AI_PROVIDER_ERROR", count: 2 }]);
assert.equal(summarizeSchoolUsage(data, { ...all, grade: "1" }).total, 4);
assert.equal(summarizeSchoolUsage(data, { ...all, role: "TEACHER" }).total, 5);
assert.equal(summarizeSchoolUsage(data, { ...all, subject: "수학" }).total, 10);
const empty = summarizeSchoolUsage({ ...data, activities: [] }, all);
assert.equal(empty.total, 0);
assert.equal(empty.failureRate, null);
assert.equal(empty.averageLatency, null);
assert.deepEqual(empty.peaks, []);
assert.equal(dateRange("2026-12-31", "2027-01-01").length, 2);
assert.equal(dateRange("2024-02-28", "2024-03-01").length, 3);
for (const [start, end] of [["2026-02-30", "2026-03-01"], ["invalid", "2026-09-27"], ["2026-09-27", "2026-09-21"], ["2026-01-01", "2026-12-31"]]) assert.throws(() => dateRange(start, end));
// 사용자별 통계: 미사용자 포함, 직전 기간 비교, 활동 수준과 점검 표시
const withHistory: SchoolUsageData = {
  ...data,
  users: [...data.users.map((user) => ({ ...user, externalId: `ID-${user.id}`, lastLoginAt: user.id === "unused" ? null : "2026-09-27 08:00" }))],
  activities: [...data.activities.filter((row) => row.date >= "2026-09-21"),
    { ...base, date: "2026-09-15", requests: 10, action: "QUIZ" },
    { ...base, userId: "teacher", date: "2026-09-14", requests: 1 },
    { ...base, userId: "teacher", date: "2026-09-23", requests: 30, subject: "영어", action: "DEEPER", lastAt: "2026-09-23 10:15" },
    { ...base, userId: "student-b", status: "FAILED", requests: 3, errorCode: "TIMEOUT" },
  ],
};
assert.deepEqual(previousRange("2026-09-21", "2026-09-27"), { start: "2026-09-14", end: "2026-09-20", days: 7 });
const roster = summarizeUsers(withHistory, all);
const byId = new Map(roster.map((user) => [user.id, user]));
assert.equal(roster.length, 5, "active accounts plus inactive accounts with usage; admins excluded");
assert.equal(byId.get("unused")?.level, "NONE");
assert.ok(byId.get("unused")?.flags.includes("NEVER_LOGGED_IN"));
assert.ok(byId.get("inactive")?.flags.includes("INACTIVE_ACCOUNT"));
assert.equal(byId.get("student-a")?.prevRequests, 10);
assert.equal(byId.get("student-a")?.requests, 3);
assert.ok(byId.get("student-a")?.flags.includes("DROPPED"));
assert.equal(byId.get("student-a")?.level, "LOW");
assert.equal(byId.get("student-b")?.failed, 3);
assert.ok(byId.get("student-b")?.flags.includes("FAILURES"));
assert.ok(byId.get("teacher")?.flags.includes("SURGE"));
assert.equal(byId.get("teacher")?.lastAt, "2026-09-23 10:15");
assert.equal(byId.get("teacher")?.level, "NORMAL");
assert.equal(byId.get("teacher")?.subjects[0].subject, "영어");
assert.equal(summarizeUsers(withHistory, { ...all, subject: "수학" }).find((user) => user.id === "teacher")?.requests, 0);
const groups = summarizeGroups(roster);
const grade1 = groups.find((group) => group.key === "G1")!;
assert.equal(grade1.registered, 2);
assert.equal(grade1.using, 1);
assert.equal(grade1.rate, 50);
assert.equal(grade1.levels.NONE, 1);
assert.equal(groups.find((group) => group.key === "TEACHER")?.requests, 35);
const detail = userDetail(withHistory, "teacher", "ALL");
assert.equal(detail.daily.length, 7);
assert.equal(detail.daily.reduce((sum, day) => sum + day.requests, 0), 35);
assert.equal(detail.actions[0].action, "DEEPER");
assert.equal(detail.subjects[0].subject, "영어");
assert.deepEqual(userDetail(withHistory, "student-b", "ALL").errors, [{ code: "TIMEOUT", requests: 3 }]);
const summary = summarizeSchoolUsage(withHistory, all);
assert.equal(summary.subjects.reduce((sum, item) => sum + item.requests, 0), summary.total);
assert.equal(summary.actions.reduce((sum, item) => sum + item.requests, 0), summary.total);
console.log("School monitoring people: roster with non-users, previous period, levels, flags, groups and detail passed.");
console.log("School monitoring: totals, filters, distinct users, statuses, latency, heatmap, empty periods and date validation passed.");

async function verifyApi(baseUrl: string) {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
  assert.equal((await fetch(`${baseUrl}/api/admin/metrics`)).status, 403);
  const login = await fetch(`${baseUrl}/api/auth/dev-login`, { method: "POST" });
  assert.equal(login.status, 200, "Local development admin login must be enabled for API checks.");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  for (const query of ["days=1", "days=7", "days=30", "days=365", "start=2026-02-30&end=2026-03-01", "end=invalid"]) {
    const response: Response = await fetch(`${baseUrl}/api/admin/metrics?${query}`, { headers: { Cookie: cookie } });
    const valid = ["days=1", "days=7", "days=30"].includes(query);
    assert.equal(response.status, valid ? 200 : 400, query);
    if (valid) {
      const body = await response.json() as SchoolUsageData;
      assert.equal(dateRange(body.start, body.end).length, Number(query.split("=")[1]));
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const summary = summarizeSchoolUsage(body, all);
      assert.equal(summary.dailyTrend.reduce((sum, day) => sum + day.requests, 0), summary.total);
      assert.equal(summary.total + summary.failed + summary.pending + summary.cancelled, summary.attempts);
    }
  }
  console.log("School monitoring API: authorization, periods, totals, validation and no-store headers passed.");
}
if (process.argv[2]) verifyApi(process.argv[2]).catch((error) => { console.error(error); process.exitCode = 1; });

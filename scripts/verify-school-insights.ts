import assert from "node:assert/strict";
import { dateRange, summarizeSchoolUsage, type SchoolActivity, type SchoolUsageData } from "../src/features/usage/school-insights";

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
console.log("School monitoring: totals, filters, distinct users, statuses, latency, heatmap, empty periods and date validation passed.");

async function verifyApi(baseUrl: string) {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
  assert.equal((await fetch(`${baseUrl}/api/admin/metrics`)).status, 403);
  const login = await fetch(`${baseUrl}/api/auth/dev-login`, { method: "POST" });
  assert.equal(login.status, 200, "Local development admin login must be enabled for API checks.");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  for (const query of ["days=1", "days=7", "days=30", "days=365", "start=2026-02-30&end=2026-03-01", "end=invalid"]) {
    const response = await fetch(`${baseUrl}/api/admin/metrics?${query}`, { headers: { Cookie: cookie } });
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

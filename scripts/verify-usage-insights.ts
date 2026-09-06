import assert from "node:assert/strict";
import { periodDates, summarizeUsage, type StudentUsageInsights } from "../src/features/usage/insights";
import { sampleStudentAccounts } from "../src/data/student-accounts";

const dates = periodDates("2026-01-03", 7);
assert.deepEqual(dates, ["2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03"]);
assert.equal(periodDates("2024-03-01", 7)[5], "2024-02-29");
assert.equal(periodDates("2026-09-06", 30).length, 30);
const summary = summarizeUsage([
  { date: "2025-12-28", courseId: "math-1", courseTitle: "Math", subjectTitle: "Math", count: 2 },
  { date: "2026-01-01", courseId: "math-1", courseTitle: "Math", subjectTitle: "Math", count: 3 },
  { date: "2026-01-02", courseId: "math-2", courseTitle: "Math", subjectTitle: "Math", count: 1 },
  { date: "2026-01-02", courseId: "english", courseTitle: "English", subjectTitle: "English", count: 4 },
  { date: "2025-12-27", courseId: "outside", courseTitle: "Outside", subjectTitle: "Outside", count: 100 },
], dates);
assert.equal(summary.total, 10);
assert.equal(summary.activeDays, 3);
assert.equal(summary.courseCount, 3, "Different courses with the same title must remain separate.");
assert.deepEqual(summary.dailyTrend.map((day) => day.count), [2, 0, 0, 0, 3, 5, 0]);
assert.deepEqual(summary.byCourse.map((course) => [course.id, course.count]), [["math-1", 5], ["english", 4], ["math-2", 1]]);
assert.equal(summarizeUsage([], dates).total, 0);
assert.equal(summarizeUsage([], dates).dailyTrend.length, 7);
console.log("Usage aggregation checks passed.");

async function checkApi(baseUrl: string) {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
  const anonymous = await fetch(`${baseUrl}/api/usage/insights`);
  assert.equal(anonymous.status, 401);
  const account = sampleStudentAccounts[0];
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId: account.loginId, password: account.initialPassword }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const headers = { Cookie: cookie };
  const invalid = await fetch(`${baseUrl}/api/usage/insights?days=365`, { headers });
  assert.equal(invalid.status, 400);
  const usageResponse = await fetch(`${baseUrl}/api/usage`, { headers });
  assert.equal(usageResponse.status, 200);
  const usage = await usageResponse.json();
  for (const days of [7, 30]) {
    const response = await fetch(`${baseUrl}/api/usage/insights?days=${days}`, { headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
    const data = await response.json() as StudentUsageInsights;
    assert.equal(data.days, days);
    assert.equal(data.history.dailyTrend.length, days);
    assert.equal(data.history.dailyTrend.at(-1)?.date, data.date);
    for (const key of ["count", "completed", "limit", "remaining"] as const) assert.equal(data.usage[key], usage[key]);
    assert.equal(data.history.total, data.history.dailyTrend.reduce((sum, day) => sum + day.count, 0));
    assert.equal(data.history.total, data.history.byCourse.reduce((sum, course) => sum + course.count, 0));
    const scopedResponse = await fetch(`${baseUrl}/api/usage/insights?days=${days}&studentId=${sampleStudentAccounts[1].user.id}`, { headers });
    assert.equal(scopedResponse.status, 200);
    assert.deepEqual(await scopedResponse.json(), data, "Query parameters must not change the authenticated student.");
    console.log({ days, limit: data.usage.limit, completedToday: data.usage.completed, total: data.history.total, courses: data.history.courseCount });
  }
  console.log("Authenticated usage API checks passed.");
}

if (process.argv[2]) checkApi(process.argv[2]).catch((error) => { console.error(error); process.exitCode = 1; });

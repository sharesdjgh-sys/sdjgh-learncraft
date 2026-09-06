import assert from "node:assert/strict";
import { sampleStudentAccounts } from "../src/data/student-accounts";
import type { LearningUnit } from "../src/types";
import { expandLearningOutline, type LearningOutline } from "../src/lib/learning-outline";

// Use a local development server: sample login does not update a real account.
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));

async function main() {
  const anonymous = await fetch(`${baseUrl}/api/curriculum?view=outline`);
  assert.equal(anonymous.status, 401);
  const account = sampleStudentAccounts[0];
  const started = performance.now();
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId: account.loginId, password: account.initialPassword }),
  });
  assert.equal(login.status, 200, "Enable development sample login for this check.");
  assert.equal((await login.json()).redirectTo, "/learn");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const headers = { Cookie: cookie };
  const loginMs = Math.round(performance.now() - started);
  const pageStarted = performance.now();
  const page = await fetch(`${baseUrl}/learn`, { headers });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes("학습 자료를 불러오고 있어요"), "Render the initial screen before fetching curriculum.");
  assert.ok(!html.includes('summaryMarkdown'), "Do not embed full curriculum in the initial document.");
  const pageMs = Math.round(performance.now() - pageStarted);

  async function curriculum(query: string) {
    const response = await fetch(`${baseUrl}/api/curriculum${query}`, { headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
    const body = await response.text();
    const payload = JSON.parse(body) as { units: LearningUnit[]; outline?: LearningOutline };
    const units = payload.outline ? expandLearningOutline(payload.outline) : payload.units;
    return { data: { units }, bytes: Buffer.byteLength(body) };
  }
  const outline = await curriculum("?view=outline");
  assert.ok(outline.data.units.length > 0, "Test school needs published courses.");
  for (const unit of outline.data.units) {
    assert.equal(unit.summary, "");
    assert.equal(unit.courseOverview, "");
    assert.equal(unit.tutorInstructions, "");
    for (const key of ["keyPoints", "formulas", "examples", "recommendedQuestions", "keywords", "prerequisites", "commonMistakes", "scopeExcluded", "assessmentTags"] as const) {
      assert.deepEqual(unit[key], [], `${key} must not be included in the outline.`);
    }
  }
  const courseCode = outline.data.units[0].courseCode;
  const detail = await curriculum(`?course=${encodeURIComponent(courseCode)}`);
  assert.deepEqual(
    detail.data.units.map((unit) => unit.id).sort(),
    outline.data.units.filter((unit) => unit.courseCode === courseCode).map((unit) => unit.id).sort(),
  );
  assert.ok(detail.data.units.every((unit) => unit.courseCode === courseCode));
  assert.ok(detail.data.units.some((unit) => unit.summary.length > 0));
  const full = await curriculum("");
  assert.equal(outline.data.units.length, full.data.units.length);
  const fullById = new Map(full.data.units.map((unit) => [unit.id, unit]));
  for (const unit of outline.data.units) {
    const original = fullById.get(unit.id);
    assert.ok(original);
    for (const key of ["title", "chapterTitle", "sectionTitle", "chapterOrder", "sectionOrder", "topicOrder", "courseCode", "courseTitle", "grade", "recommendedGrades", "subjectCode", "publisherName", "schoolAdopted"] as const) {
      assert.deepEqual(unit[key], original[key], `Outline must preserve ${key} for ${unit.id}.`);
    }
  }
  assert.deepEqual(detail.data.units, full.data.units.filter((unit) => unit.courseCode === courseCode));
  assert.ok(outline.bytes < full.bytes, "Outline must be smaller than the full curriculum.");
  const missing = await curriculum("?course=__missing_course__");
  assert.deepEqual(missing.data.units, [], "Unknown course must not fall back to all school data.");
  console.log({ loginMs, pageMs, outlineUnits: outline.data.units.length, outlineBytes: outline.bytes, fullCurriculumBytes: full.bytes, selectedCourseUnits: detail.data.units.length, selectedCourseBytes: detail.bytes });
  console.log("Deferred curriculum API checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

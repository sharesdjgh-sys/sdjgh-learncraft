import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as orm from "drizzle-orm";
import * as crypto from "node:crypto";
import type { SessionUser } from "../src/types";
import type * as Repository from "../src/features/learning-progress/repository";
import { reflectionSchema, summarizeProgress, type Reflection } from "../src/features/learning-progress/model";
import { periodDates } from "../src/features/usage/insights";

const reflection: Reflection = { id: "r1", unitId: "reflection-only", unitTitle: "함수", courseTitle: "수학", learningDate: "2026-09-26", minutes: 20, confidence: 2, learned: "기울기의 뜻", difficulty: "부호", nextStep: "세 문제 풀기", updatedAt: "2026-09-26T12:00:00Z" };
const result = summarizeProgress({
  units: [{ unitId: "questions-only", unitTitle: "생명", courseTitle: "과학", questions: 100, lastStudied: "2026-09-27" }],
  mistakes: [{ unitId: "mistakes-only", unitTitle: "문법", courseTitle: "국어", count: 4, unresolved: 2, hints: 3, attempts: 6, confusions: [] }],
  reflections: [reflection, { ...reflection, id: "r2", learningDate: "2026-09-27", confidence: 4, minutes: 30 }],
});
assert.equal(result.length, 3, "Include units even with no questions");
assert.equal(result[0].unitId, "mistakes-only", "Prioritize evidence of unresolved difficulties");
assert.equal(result[0].resolved, 2);
assert.equal(result.find(r => r.unitId === "questions-only")!.needsReview, false, "Many questions do not imply weakness");
assert.equal(result.find(r => r.unitId === "questions-only")!.confidence, null, "No invented mastery score");
assert.equal(result.find(r => r.unitId === "reflection-only")!.minutes, 50);
assert.equal(result.find(r => r.unitId === "reflection-only")!.confidence, 4, "Latest dated reflection wins");
assert.equal(result.find(r => r.unitId === "reflection-only")!.needsReview, false, "Old low confidence does not override newer confidence");
assert.equal(summarizeProgress({ units: [], mistakes: [], reflections: [reflection] })[0].needsReview, true);
assert.deepEqual(summarizeProgress({ units: [], mistakes: [], reflections: [] }), []);
assert.ok(reflectionSchema.safeParse(reflection).success);
for (const override of [{ confidence: 0 }, { confidence: 6 }, { minutes: 0 }, { minutes: 721 }, { minutes: 1.5 }, { learningDate: "2026-02-30" }, { learned: " " }, { nextStep: "" }, { difficulty: "a".repeat(501) }]) {
  assert.equal(reflectionSchema.safeParse({ ...reflection, ...override }).success, false, JSON.stringify(override));
}
assert.deepEqual(periodDates("2026-01-03", 7), ["2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03"]);
console.log("Learning progress: evidence-based review, latest confidence, time totals, empty records and validation passed.");

async function verifyPersistence() {
  const exports: Record<string, unknown> = {};
  const source = ts.transpileModule(readFileSync("src/features/learning-progress/repository.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mocks: Record<string, unknown> = {
    "drizzle-orm": orm, "@/db": { db: null }, "@/db/schema": {},
    "@/lib/env": { env: { APP_TIMEZONE: "Asia/Seoul", GEMINI_PRIMARY_MODEL_ID: "test" } },
    "@/features/usage/insights": { periodDates },
    "@/features/usage/repository": { getDemoLearningActivity: () => [] },
    "@/features/quiz-mistakes/repository": { listStudentQuizMistakes: async () => [] },
  };
  vm.runInNewContext(source, { exports, crypto, console, require: (id: string) => { assert.ok(id in mocks, id); return mocks[id]; } });
  const repository = exports as typeof Repository;
  const user = { id: "one", schoolId: "school-a" } as SessionUser;
  const other = { id: "two", schoolId: "school-a" } as SessionUser;
  const anotherSchool = { id: "one", schoolId: "school-b" } as SessionUser;
  const input = { ...reflection, learningDate: repository.learningToday() };
  await repository.saveReflection(user, input, { unitTitle: "함수", courseTitle: "수학" });
  await repository.saveReflection(user, { ...input, minutes: 45 }, { unitTitle: "함수", courseTitle: "수학" });
  const data = await repository.getLearningProgress(user, 7);
  assert.equal(data.reflections.length, 1, "Same date/unit saves replace instead of double counting");
  assert.equal(data.reflections[0].minutes, 45);
  assert.equal((await repository.getLearningProgress(other, 7)).reflections.length, 0);
  assert.equal((await repository.getLearningProgress(anotherSchool, 7)).reflections.length, 0);
  assert.equal(await repository.deleteReflection(other, data.reflections[0].id), false);
  assert.equal(await repository.deleteReflection(anotherSchool, data.reflections[0].id), false);
  assert.equal(await repository.deleteReflection(user, data.reflections[0].id), true);
  assert.equal((await repository.getLearningProgress(user, 7)).reflections.length, 0);
  const claims = await Promise.all([repository.claimReport(user, 7, input.learningDate), repository.claimReport(user, 7, input.learningDate)]);
  assert.equal(claims.filter(Boolean).length, 1, "Concurrent analysis requests have one owner");
  await repository.finishReport(user, 7, input.learningDate, "wrong-owner", null);
  assert.equal(await repository.claimReport(user, 7, input.learningDate), null, "Other owners cannot release a claim");
  await repository.finishReport(user, 7, input.learningDate, claims.find(Boolean)!, null);
  const reportOwner = await repository.claimReport(user, 7, input.learningDate);
  assert.ok(reportOwner, "Failed analysis releases its claim for retry");
  const content = { summary: "나만의 분석", strengths: [], review: [], reflectionQuestion: "다음 목표는?", limitations: "자기보고" };
  await repository.finishReport(other, 7, input.learningDate, reportOwner, content);
  await repository.finishReport(anotherSchool, 7, input.learningDate, reportOwner, content);
  assert.equal((await repository.getLearningProgress(user, 7)).report, null, "Other users/schools cannot complete someone else's report");
  await repository.finishReport(user, 7, input.learningDate, reportOwner, content);
  assert.equal((await repository.getLearningProgress(user, 7)).report?.content.summary, "나만의 분석");
  assert.equal((await repository.getLearningProgress(other, 7)).report, null, "Another student cannot read a completed report");
  assert.equal((await repository.getLearningProgress(anotherSchool, 7)).report, null, "Another school cannot read a completed report");
  assert.equal(await repository.claimReport(user, 7, input.learningDate), null, "Completed reports cannot regenerate on the same day/period");
  console.log("Learning progress persistence: upsert, student/school isolation, deletion ownership and concurrent report claims passed (isolated memory store).");
}
void verifyPersistence();

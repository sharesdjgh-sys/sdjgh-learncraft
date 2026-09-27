import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { PgDialect } from "drizzle-orm/pg-core";
import * as orm from "drizzle-orm";
import * as schema from "../src/db/schema";
import * as model from "../src/features/learning-progress/model";
import { buildLearningReportInput } from "../src/features/learning-progress/report-input";
import { periodDates } from "../src/features/usage/insights";
import type { SessionUser } from "../src/types";
import type * as Repository from "../src/features/learning-progress/repository";

const user = { id: "student-one", schoolId: "school-one", name: "가상학생", externalId: "10501", schoolName: "가상학교", role: "STUDENT" } as SessionUser;
const content: model.LearningReport = { summary: "본인 기록 기반 분석", strengths: [], review: [], reflectionQuestion: "무엇을 배웠나요?", limitations: "저장한 기록에 한정" };
const data: model.ProgressData = { date: "2026-09-27", days: 7, timeZone: "Asia/Seoul", persistent: true, units: [], mistakes: [], report: null,
  reflections: [{ id: "private-record-id", unitId: "private-unit-id", unitTitle: "함수", courseTitle: "수학", learningDate: "2026-09-27", minutes: 20, confidence: 2,
    learned: `${user.name} ${user.externalId} ${user.schoolName} 기울기를 배웠어요`, difficulty: "부호", nextStep: "연습 3문제", updatedAt: "2026-09-27T00:00:00Z" }] };
const prompt = JSON.stringify(buildLearningReportInput(data, user));
for (const secret of [user.id, user.schoolId, user.name, user.externalId, user.schoolName, "private-record-id", "private-unit-id"]) assert.ok(!prompt.includes(secret), `Exclude ${secret}`);
assert.ok(prompt.includes("기울기를 배웠어요"), "Retain relevant reflection evidence");

function loadModule(path: string, mocks: Record<string, unknown>) {
  const exports: Record<string, unknown> = {};
  const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, console: { info() {} }, Response, Request, AbortSignal, crypto,
    require: (id: string) => { assert.ok(id in mocks, `Unexpected import: ${id}`); return mocks[id]; } });
  return exports;
}

async function verifyEndpoint() {
  let session: SessionUser | null = null;
  let generationCalls = 0;
  let reads = 0;
  let cache: model.ProgressData["report"] = null;
  let fail = false;
  let claimed = true;
  let configured = true;
  let allowed = true;
  const finishes: Array<model.LearningReport | null> = [];
  const envMock = { env: { GEMINI_API_KEY: "test", GEMINI_PRIMARY_MODEL_ID: "test-model" }, get isGeminiConfigured() { return configured; } };
  const endpoint = loadModule("src/app/api/learning-progress/analyze/route.ts", {
    zod: { z }, "@/lib/auth": { requireLearner: async () => session }, "@/lib/env": envMock,
    "@/features/learning-progress/model": model,
    "@/features/learning-progress/report-input": { buildLearningReportInput },
    "@/lib/rate-limit": { requestIp: () => "test", checkRequestRateLimit: async () => ({ allowed }) },
    "@ai-sdk/google": { createGoogleGenerativeAI: () => () => "test-model" },
    ai: { Output: { object: (value: unknown) => value }, generateText: async (options: { prompt: string }) => {
      generationCalls++;
      assert.equal(options.prompt, prompt);
      if (fail) throw new Error("Simulated provider failure");
      return { output: content, usage: {} };
    } },
    "@/features/learning-progress/repository": {
      getLearningProgress: async (owner: SessionUser, days: number) => { reads++; assert.equal(owner, user); assert.equal(days, 7); return { ...data, report: cache }; },
      claimReport: async (owner: SessionUser) => { assert.equal(owner, user); return claimed ? "lease" : null; },
      finishReport: async (owner: SessionUser, days: number, date: string, id: string, report: model.LearningReport | null) => {
        assert.equal(owner, user); assert.equal(days, 7); assert.equal(date, data.date); assert.equal(id, "lease"); finishes.push(report);
      },
    },
  }) as { POST: (request: Request) => Promise<Response> };
  const request = (body: unknown) => new Request("http://localhost/api/learning-progress/analyze?studentId=someone-else", { method: "POST", body: JSON.stringify(body) });
  assert.equal((await endpoint.POST(request({ days: 7 }))).status, 401);
  assert.equal(reads, 0); assert.equal(generationCalls, 0);
  session = user;
  for (const extra of [{ studentId: "other" }, { schoolId: "other" }, { userId: "other" }, { reflections: [] }]) {
    assert.equal((await endpoint.POST(request({ days: 7, ...extra }))).status, 400);
  }
  assert.equal(reads, 0, "Reject client-selected identity/data before any read");
  assert.equal((await endpoint.POST(request({ days: 365 }))).status, 400);
  const success = await endpoint.POST(request({ days: 7 }));
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "private, no-store");
  assert.equal((await success.json()).content.summary, content.summary);
  assert.equal(finishes.length, 1);
  assert.equal(generationCalls, 1);
  cache = { content, createdAt: "2026-09-27T00:00:00Z" };
  assert.equal((await endpoint.POST(request({ days: 7 }))).status, 200);
  assert.equal(generationCalls, 1, "Reuse own cached report without provider call");
  cache = null; claimed = false;
  assert.equal((await endpoint.POST(request({ days: 7 }))).status, 409);
  assert.equal(generationCalls, 1);
  claimed = true; configured = false;
  assert.equal((await endpoint.POST(request({ days: 7 }))).status, 503);
  configured = true; allowed = false;
  assert.equal((await endpoint.POST(request({ days: 7 }))).status, 429);
  allowed = true; fail = true;
  assert.equal((await endpoint.POST(request({ days: 7 }))).status, 502);
  assert.equal(finishes.at(-1), null, "Failed generations release only the current user's lease");
  console.log("Analysis API: session-only identity, identity injection rejection, minimized payload, cache, concurrency, rate limit and failure recovery passed (mock provider).");
}

async function verifyDatabaseScope() {
  const dialect = new PgDialect();
  const conditions: orm.SQL[] = [];
  const builder = {
    from() { return this; }, innerJoin() { return this; }, orderBy() { return this; }, limit() { return this; },
    where(condition: orm.SQL) { conditions.push(condition); return this; }, set() { return this; },
    then(resolve: (value: unknown[]) => unknown) { return Promise.resolve([]).then(resolve); },
  };
  const database = { select: () => builder, update: () => builder, delete: () => builder,
    execute: async (query: orm.SQL) => { conditions.push(query); return { rows: [] }; } };
  const repository = loadModule("src/features/learning-progress/repository.ts", {
    "drizzle-orm": orm, "@/db": { db: database }, "@/db/schema": schema,
    "@/lib/env": { env: { APP_TIMEZONE: "Asia/Seoul" } },
    "@/features/usage/insights": { periodDates }, "@/features/usage/repository": {}, "@/features/quiz-mistakes/repository": {},
  }) as typeof Repository;
  await repository.getLearningProgress(user, 7);
  await repository.finishReport(user, 7, data.date, "lease", content);
  await repository.finishReport(user, 7, data.date, "lease", null);
  assert.equal(conditions.length, 6);
  for (const condition of conditions) {
    const query = dialect.sqlToQuery(condition);
    assert.ok(query.params.includes(user.id), "Every read/write must constrain the current student");
    assert.ok(query.params.includes(user.schoolId), "Every read/write must constrain the current school");
    assert.ok(query.sql.includes("student_id") && query.sql.includes("school_id"));
  }
  console.log("Analysis database scope: usage, mistakes, reflections, report reads, completion and cleanup all constrain student AND school.");
}
void (async () => { await verifyEndpoint(); await verifyDatabaseScope(); })();

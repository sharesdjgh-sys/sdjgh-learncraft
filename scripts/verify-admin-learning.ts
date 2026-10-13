import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { periodDates, summarizeUsage } from "../src/features/usage/insights";
import type { SessionUser } from "../src/types";
import type * as UsageRepository from "../src/features/usage/repository";
import type * as AssistantRepository from "../src/features/teacher-assistant/repository";

const admin: SessionUser = {
  id: "admin", externalId: "admin", schoolId: "school", schoolName: "School",
  name: "Admin", role: "ADMIN", officialGrade: null, learningGrade: null,
};

function load<T>(path: string, modules: Record<string, unknown>) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, console, require: (id: string) => {
    assert.ok(id in modules, `Unexpected dependency: ${id}`);
    return modules[id];
  } });
  return exports as T;
}

async function main() {
  for (const configured of [false, true]) {
    let count = 0, completed = 0;
    const forbiddenDb = new Proxy({}, { get: () => { throw new Error("Administrator usage must not access the database"); } });
    const repo = load<typeof UsageRepository>("src/features/usage/repository.ts", {
      "drizzle-orm": {}, "next/cache": { unstable_cache: <T,>(fn: T) => fn },
      "@/db": { db: configured ? forbiddenDb : null }, "@/db/schema": {},
      "@/lib/env": { env: { APP_TIMEZONE: "Asia/Seoul" } },
      "@/features/tutor/prompt": { TUTOR_PROMPT_VERSION: "test" },
      "@/data/curriculum": { getUnit: () => null },
      "./insights": { periodDates, summarizeUsage },
      "@/data/demo-store": {
        getUsage: () => ({ count, completed, limit: 20 }),
        reserveUsage: () => { count++; return { ok: true, remaining: 20 - count }; },
        completeUsage: () => { completed++; },
        refundUsage: () => { count--; },
      },
    });
    const reserve = (user: SessionUser, requestId: string) => repo.reserveAiUsage({
      user, requestId, unitId: "unit", action: "QUESTION", modelId: "test",
    });
    // Repeated testing never consumes the daily allowance or persists statistics.
    for (let i = 0; i < 25; i++) {
      const reservation = await reserve(admin, `test-${i}`);
      assert.equal(reservation.ok, true);
      assert.ok(reservation.remaining > 0);
      await repo.completeAiUsage(admin, `test-${i}`);
    }
    await repo.completeAiUsageWithTokens(admin, "tokens", "test", { inputTokens: 100, outputTokens: 50 }, 2000);
    await repo.switchAiUsageModel(admin, "fallback", "other-model");
    await repo.refundAiUsage(admin, "failed");
    await repo.refundAiUsage(admin, "cancelled", "CLIENT_ABORTED", true);
    const usage = await repo.getStudentUsage(admin, undefined, true);
    assert.equal(usage.count, 0);
    assert.equal(usage.completed, 0);
    assert.equal(usage.byCourse.length, 0);
    assert.equal((await repo.getStudentUsageInsights(admin, 7)).history.total, 0);
    assert.equal(repo.getDemoLearningActivity(admin, periodDates(usage.date, 7)).length, 0);
    assert.equal(count, 0);
    assert.equal(completed, 0);

    if (!configured) {
      // Student and teacher reservations, duplicate protection and refunds still work.
      for (const role of ["STUDENT", "TEACHER"] as const) {
        const user = { ...admin, id: role, role };
        assert.equal((await reserve(user, "success")).ok, true);
        assert.equal((await reserve(user, "success")).duplicate, true);
        await repo.completeAiUsageWithTokens(user, "success", "test", {}, 10);
        assert.equal((await reserve(user, "failure")).ok, true);
        await repo.refundAiUsage(user, "failure");
      }
      assert.equal(count, 2);
      assert.equal(completed, 2);
    }
  }

  let writes = 0;
  const assistant = load<typeof AssistantRepository>("src/features/teacher-assistant/repository.ts", {
    "server-only": {}, "drizzle-orm": {}, "@/db/schema": {},
    "@/db": { db: { insert: () => ({ values: async () => { writes++; } }) } },
  });
  for (const status of ["SUCCEEDED", "FAILED", "CANCELLED"] as const) {
    await assistant.recordAssistantEvent({ schoolId: "school", userId: "admin", role: "ADMIN", subject: null, tool: null, status, offTopic: false, modelId: "test" });
  }
  assert.equal(writes, 0);
  await assistant.recordAssistantEvent({ schoolId: "school", userId: "teacher", role: "TEACHER", subject: null, tool: null, status: "SUCCEEDED", offTopic: false, modelId: "test" });
  assert.equal(writes, 1);
  console.log("Administrator learning: usage exclusion in database/demo modes and normal learner accounting passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

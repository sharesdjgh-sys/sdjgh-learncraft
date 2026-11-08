import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { canUseLearning, canUseTeacherTools, homeForRole } from "../src/lib/roles";
import type { SessionUser, UserRole } from "../src/types";

async function main() {
  let role: UserRole | null = null;
  const modules: Record<string, unknown> = {
    "server-only": {}, "node:crypto": crypto,
    "next/headers": { cookies: async () => ({ get: () => role ? { value: "signed-session" } : undefined }) },
    "next/server": { after: () => undefined },
    "next/cache": { revalidateTag: () => undefined, unstable_cache: <T,>(fn: T) => fn },
    "jose": { jwtDecrypt: async () => ({ payload: { user: { id: "test-user", schoolId: "test-school", schoolName: "School", role } } }) },
    "drizzle-orm": {}, "@/data/student-accounts": { sampleStudentAccounts: [] },
    "@/db": { db: null }, "@/db/schema": {}, "@/lib/env": { env: {} },
    "@/lib/password": {}, "@/lib/roles": { canUseLearning, canUseTeacherTools },
    // SSO 검증 모듈은 기존 역할 시험의 자체 로그인 가상 세션에서 호출되지 않는다.
    "@/lib/smart-campus-proof": {}, "@/lib/smart-campus-binding": {},
    "@/lib/smart-campus-native-policy": { nativeAccountAllowed: async () => true },
  };
  const exported: Record<string, () => Promise<SessionUser | null>> = {};
  const compiled = ts.transpileModule(readFileSync("src/lib/auth.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports: exported, TextEncoder,
    process: { env: { NODE_ENV: "test" } },
    require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  for (const current of [null, "STUDENT", "TEACHER", "ADMIN"] as const) {
    role = current;
    assert.equal(Boolean(await exported.requireAdmin()), role === "ADMIN");
    assert.equal(Boolean(await exported.requireStudent()), role === "STUDENT");
    assert.equal(Boolean(await exported.requireLearner()), role === "STUDENT" || role === "TEACHER" || role === "ADMIN");
    assert.equal(Boolean(await exported.requireTeacherTools()), role === "TEACHER" || role === "ADMIN");
  }
  assert.equal(homeForRole("STUDENT"), "/learn");
  assert.equal(homeForRole("TEACHER"), "/learn");
  assert.equal(homeForRole("ADMIN"), "/learn");
  console.log("Student / teacher / admin authorization and login destinations passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

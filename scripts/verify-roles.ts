import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { canUseLearning, homeForRole } from "../src/lib/roles";
import type { SessionUser, UserRole } from "../src/types";

async function main() {
  let role: UserRole | null = null;
  const modules: Record<string, unknown> = {
    "server-only": {}, "node:crypto": {},
    "next/headers": { cookies: async () => ({ get: () => role ? { value: "signed-session" } : undefined }) },
    "next/server": {},
    "jose": { jwtVerify: async () => ({ payload: { user: { id: "test-user", schoolId: "test-school", schoolName: "School", role } } }) },
    "drizzle-orm": {}, "@/data/student-accounts": { sampleStudentAccounts: [] },
    "@/db": { db: null }, "@/db/schema": {}, "@/lib/env": { env: {} },
    "@/lib/password": {}, "@/lib/roles": { canUseLearning },
  };
  const exported: Record<string, () => Promise<SessionUser | null>> = {};
  const compiled = ts.transpileModule(readFileSync("src/lib/auth.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports: exported, TextEncoder, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  for (const current of [null, "STUDENT", "TEACHER", "ADMIN"] as const) {
    role = current;
    assert.equal(Boolean(await exported.requireAdmin()), role === "ADMIN");
    assert.equal(Boolean(await exported.requireStudent()), role === "STUDENT");
    assert.equal(Boolean(await exported.requireLearner()), role === "STUDENT" || role === "TEACHER");
  }
  assert.equal(homeForRole("STUDENT"), "/learn");
  assert.equal(homeForRole("TEACHER"), "/learn");
  assert.equal(homeForRole("ADMIN"), "/admin/dashboard");
  console.log("Student / teacher / admin authorization and login destinations passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

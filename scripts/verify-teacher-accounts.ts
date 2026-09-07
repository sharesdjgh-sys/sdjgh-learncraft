import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { accountsFromCsv, registrationSchema, statusSchema, type AccountRole } from "../src/features/accounts/model";

async function main() {
  const teacher = { name: "김민수", loginId: "", initialPassword: "teacher-pass" };
  const student = { name: "김하늘", loginId: "10501", initialPassword: "student-pass" };
  assert.equal(accountsFromCsv("\uFEFF아이디,이름,초기비밀번호\r\n,김민수,teacher-pass\r\n", "TEACHER")[0].loginId, "김민수");
  assert.equal(accountsFromCsv('학번,이름,초기비밀번호\n10501,김하늘," pass,word "', "STUDENT")[0].initialPassword, " pass,word ");
  for (const csv of ["아이디,이름,초기비밀번호\n,김민수,123456\n김민수,김민수,123456", "아이디,이름,초기비밀번호\nTEACHER,김민수,123456\nteacher,김민수,123456", '아이디,이름,초기비밀번호\n"broken', "아이디,이름,초기비밀번호\n10501,김민수,123456", "아이디,이름,초기비밀번호\n,김민수,123456,extra"]) {
    assert.throws(() => accountsFromCsv(csv, "TEACHER"));
  }
  assert.throws(() => accountsFromCsv("학번,이름,초기비밀번호\n김민수,김민수,123456", "STUDENT"));
  assert.equal(registrationSchema("TEACHER").safeParse({ accounts: [{ ...teacher, role: "ADMIN" }] }).success, false);
  let actor: { schoolId: string; externalId: string } | null = null;
  let existing: Record<string, unknown>[] = [];
  type Write = { table: string; data: Record<string, unknown>[]; conflict?: { set: Record<string, unknown> } };
  let writes: Write[] = [], batchError: unknown;
  const database = {
    select: () => ({ from: () => ({ where: async () => existing }) }),
    insert: (table: string) => ({ values: (data: Record<string, unknown>[]) => {
      const result = { table, data, onConflictDoUpdate: (conflict: Write["conflict"]) => ({ table, data, conflict }) };
      return result;
    } }),
    batch: async (queries: Write[]) => { if (batchError) throw batchError; writes = queries; },
  };
  const modules: Record<string, unknown> = {
    "node:crypto": { randomUUID: () => crypto.randomUUID() },
    "next/server": { NextResponse: { json: (data: unknown, options?: ResponseInit) => Response.json(data, options) } },
    "drizzle-orm": { and: () => null, desc: () => null, eq: () => null, ilike: () => null, inArray: () => null, or: () => null, sql: () => null },
    "@/db": { db: database }, "@/db/schema": { users: "users", accountCredentials: "credentials" },
    "@/lib/auth": { requireAdmin: async () => actor }, "@/lib/env": { env: { AUTH_ADMIN_ID: "configured-admin" } },
    "@/lib/password": { hashPassword: async () => "hashed-password" }, "./model": { registrationSchema, statusSchema },
  };
  const exported: Record<string, (request: Request, role: AccountRole) => Promise<Response>> = {};
  const source = ts.transpileModule(readFileSync("src/features/accounts/handlers.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports: exported, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const post = (body: unknown, role: AccountRole) => exported.registerAccounts(new Request("http://localhost/api/admin/accounts", { method: "POST", body: JSON.stringify(body) }), role);
  assert.equal((await post(teacher, "TEACHER")).status, 403);
  assert.equal(writes.length, 0);
  actor = { schoolId: "admin-school", externalId: "admin" };
  for (const [role, input] of [["TEACHER", teacher], ["STUDENT", student]] as const) {
    existing = [];
    const response = await post(input, role);
    assert.equal(response.status, 201);
    assert.equal(writes.length, 2);
    assert.equal(writes[0].data[0].role, role);
    assert.equal(writes[0].data[0].schoolId, actor.schoolId);
    assert.equal(writes[1].data[0].userId, writes[0].data[0].id);
    assert.equal(writes[1].data[0].passwordHash, "hashed-password");
    assert.equal(JSON.stringify(await response.json()).includes(input.initialPassword), false);
    existing = [{ id: crypto.randomUUID(), loginId: input.loginId || input.name, schoolId: actor.schoolId, role, active: false }];
    assert.equal((await post(input, role)).status, 409);
    assert.equal((await post({ accounts: [input], updateExisting: true }, role)).status, 200);
    assert.equal(writes[0].data[0].id, existing[0].id, "Updates preserve account identity and learning history");
    assert.equal(writes[0].data[0].active, false);
    assert.equal("active" in writes[0].conflict!.set, false, "CSV must not reactivate transferred accounts");
    assert.equal("role" in writes[0].conflict!.set, false, "CSV must not change account roles");
    existing[0].schoolId = "other-school";
    assert.equal((await post({ accounts: [input], updateExisting: true }, role)).status, 409);
    existing[0].schoolId = actor.schoolId; existing[0].role = "ADMIN";
    assert.equal((await post({ accounts: [input], updateExisting: true }, role)).status, 409);
  }
  existing = [];
  assert.equal((await post({ accounts: [teacher, { ...teacher, name: "이영희" }] }, "TEACHER")).status, 200);
  assert.equal(writes[0].data.length, 2);
  assert.equal((await post({ ...teacher, loginId: "configured-admin" }, "TEACHER")).status, 409);
  batchError = { cause: { code: "23505" } };
  assert.equal((await post(teacher, "TEACHER")).status, 409);
  batchError = new Error("database unavailable");
  assert.equal((await post(teacher, "TEACHER")).status, 500);
  console.log("Account checks passed: student/teacher individual and CSV registration, atomic save, duplicate protection, role/school isolation, preserved inactive state.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

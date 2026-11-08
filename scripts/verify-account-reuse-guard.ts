import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

type Case = { role: "STUDENT" | "TEACHER"; bound?: boolean; bindingUnavailable?: boolean };

// 실제 등록 함수를 가상 DB와 함께 실행한다. 운영 Neon에는 연결하지 않는다.
function harness(testCase: Case) {
  const schema = { users: { externalId: "externalId" }, smartCampusUserBindings: {
    schoolId: "schoolId", userId: "userId",
  } };
  let batches = 0;
  const db = {
    select: () => ({ from: (table: unknown) => ({ where: () => table === schema.users
      ? [{ id: "existing-id", loginId: "10501", role: testCase.role, schoolId: "school-1", active: true }]
      : { async limit() {
        if (testCase.bindingUnavailable) throw Error("binding table unavailable");
        return testCase.bound ? [{ userId: "existing-id" }] : [];
      } },
    }) }),
    batch: async () => { batches++; },
  };
  const source = readFileSync("src/features/accounts/handlers.ts", "utf8");
  const javascript = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports: Record<string, unknown> = {};
  const sql = () => "lower-external-id";
  const mocks: Record<string, unknown> = {
    "node:crypto": { randomUUID: () => "new-id" },
    "next/server": { NextResponse: { json: (body: unknown, init?: { status?: number }) =>
      ({ body, status: init?.status ?? 200 }) } },
    "drizzle-orm": { and: () => null, eq: () => null, inArray: () => null, sql },
    "@/db": { db },
    "@/db/schema": { ...schema, accountCredentials: {} },
    "@/lib/auth": { requireAdmin: async () => ({ externalId: "admin", schoolId: "school-1" }), invalidateAccountStatusCache: () => {} },
    "@/lib/env": { env: { AUTH_ADMIN_ID: "admin" } },
    "@/lib/password": { hashPassword: async () => "fictional-hash" },
    "./model": { registrationSchema: () => ({ safeParse: (input: unknown) => ({ success: true,
      data: input && typeof input === "object" && "accounts" in input ? input : { accounts: [input], updateExisting: false },
    }) }) },
  };
  vm.runInNewContext(javascript, { exports, console,
    require(name: string) {
      if (!(name in mocks)) throw Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
  }, { filename: "src/features/accounts/handlers.ts" });
  const input = { accounts: [{ loginId: "10501", name: "가상 학생", initialPassword: "fictional-pass" }], updateExisting: true };
  const request = { json: async () => input } as Request;
  type Response = { status: number; body: unknown };
  return { register: exports.registerAccounts as (request: Request, role: Case["role"]) => Promise<Response>, request,
    batches: () => batches };
}

async function main() {
  for (const testCase of [{ role: "STUDENT" }, { role: "TEACHER", bound: true },
    { role: "TEACHER", bindingUnavailable: true }] as Case[]) {
    const current = harness(testCase);
    const response = await current.register(current.request, testCase.role);
    assert.equal(response.status, testCase.bindingUnavailable ? 503 : 409);
    assert.equal(current.batches(), 0, "기존 학생 또는 중앙 연결 교사는 DB 배치 쓰기 전에 거부해야 한다");
  }
  console.log("계정 재사용 차단 가상 라우트 3/3 통과");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

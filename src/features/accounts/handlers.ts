import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountCredentials, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { registrationSchema, statusSchema, type AccountRole } from "./model";

const fail = (message: string, status: number, code = "ACCOUNT_ERROR") => NextResponse.json({ error: { code, message } }, { status });
const projection = { id: users.id, loginId: users.externalId, name: users.name, grade: users.officialGrade, active: users.active };

export async function listAccounts(request: Request, role: AccountRole) {
  const admin = await requireAdmin();
  if (!admin) return fail("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  if (!db) return fail("계정 관리를 사용하려면 데이터베이스 연결이 필요합니다.", 503);
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const status = new URL(request.url).searchParams.get("status");
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const accounts = await db.select(projection).from(users).where(and(
    eq(users.schoolId, admin.schoolId), eq(users.role, role),
    q ? or(ilike(users.externalId, pattern), ilike(users.name, pattern)) : undefined,
    status === "active" ? eq(users.active, true) : status === "inactive" ? eq(users.active, false) : undefined,
  )).orderBy(desc(users.updatedAt), users.id).limit(201);
  return NextResponse.json({ accounts: accounts.slice(0, 200), hasMore: accounts.length > 200 });
}

export async function registerAccounts(request: Request, role: AccountRole) {
  const admin = await requireAdmin();
  if (!admin) return fail("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  if (!db) return fail("계정 등록을 사용하려면 데이터베이스 연결이 필요합니다.", 503);
  const body = await request.json().catch(() => null);
  const single = body && typeof body === "object" && !Array.isArray(body) && !("accounts" in body);
  const parsed = registrationSchema(role).safeParse(single ? { accounts: [body] } : body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row = typeof issue.path[1] === "number" && !single ? `${issue.path[1] + 2}행: ` : "";
    return fail(row + issue.message, 400, "VALIDATION_ERROR");
  }
  const { accounts, updateExisting } = parsed.data;
  const loginIds = accounts.map((account) => account.loginId);
  const reserved = [env.AUTH_ADMIN_ID, "lifeprof", admin.externalId].filter(Boolean).map((id) => id!.trim().toLocaleLowerCase("en-US"));
  if (loginIds.some((id) => reserved.includes(id))) return fail("관리자 아이디는 등록하거나 갱신할 수 없습니다.", 409, "DUPLICATE_LOGIN_ID");
  // Login has no school selector, so IDs belonging to another school cannot be reused.
  const existing = await db.select({ id: users.id, loginId: users.externalId, role: users.role, schoolId: users.schoolId, active: users.active }).from(users)
    .where(inArray(sql`lower(${users.externalId})`, loginIds));
  if (existing.some((account) => account.role !== role || account.schoolId !== admin.schoolId)) {
    return fail("다른 권한 또는 학교에서 사용 중인 아이디가 포함되어 있습니다. 다른 아이디를 사용해 주세요.", 409, "DUPLICATE_LOGIN_ID");
  }
  if (existing.length && !updateExisting) return fail("이미 등록된 학번 또는 아이디가 있습니다. CSV의 ‘기존 계정 정보·비밀번호 갱신’을 선택하거나 다른 아이디를 사용해 주세요.", 409, "DUPLICATE_LOGIN_ID");
  const byId = new Map(existing.map((account) => [account.loginId.toLocaleLowerCase("en-US"), account]));
  const hashes = new Array<string>(accounts.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, accounts.length) }, async () => {
    while (cursor < accounts.length) { const i = cursor++; hashes[i] = await hashPassword(accounts[i].initialPassword); }
  }));
  const records = accounts.map((account) => {
    const previous = byId.get(account.loginId);
    const grade = role === "STUDENT" && /^[123]/.test(account.loginId) ? Number(account.loginId[0]) : null;
    return { id: previous?.id ?? randomUUID(), schoolId: admin.schoolId, externalId: previous?.loginId ?? account.loginId, name: account.name, role, officialGrade: grade, learningGrade: grade, active: previous?.active ?? true };
  });
  try {
    const insert = db.insert(users).values(records);
    await db.batch([
      updateExisting ? insert.onConflictDoUpdate({
        target: [users.schoolId, users.externalId],
        set: { name: sql`excluded.name`, officialGrade: sql`excluded.official_grade`, updatedAt: new Date() },
        setWhere: eq(users.role, role),
      }) : insert,
      db.insert(accountCredentials).values(records.map((account, i) => ({ userId: account.id, passwordHash: hashes[i], passwordUpdatedAt: new Date() })))
        .onConflictDoUpdate({ target: accountCredentials.userId, set: { passwordHash: sql`excluded.password_hash`, passwordUpdatedAt: new Date() } }),
    ]);
  } catch (error) {
    const failure = error as { code?: string; cause?: { code?: string } };
    const code = failure.code ?? failure.cause?.code;
    if (code === "23505" || code === "23503") return fail("등록 정보가 다른 요청과 겹쳤습니다. 목록을 새로고침하고 다시 확인해 주세요.", 409, "DUPLICATE_LOGIN_ID");
    return fail("계정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
  return NextResponse.json({ total: records.length, created: records.length - existing.length, updated: existing.length,
    account: single ? { id: records[0].id, loginId: records[0].externalId, name: records[0].name, grade: records[0].officialGrade, active: records[0].active } : undefined,
  }, { status: single ? 201 : 200 });
}

export async function changeAccountStatus(request: Request, role: AccountRole) {
  const admin = await requireAdmin();
  if (!admin) return fail("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  if (!db) return fail("계정 관리를 사용하려면 데이터베이스 연결이 필요합니다.", 503);
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("변경할 계정과 상태를 확인해 주세요.", 400);
  const [account] = await db.update(users).set({ active: parsed.data.active, updatedAt: new Date() })
    .where(and(eq(users.id, parsed.data.id), eq(users.schoolId, admin.schoolId), eq(users.role, role))).returning(projection);
  if (!account) return fail("해당 계정을 찾을 수 없습니다.", 404);
  return NextResponse.json({ account });
}

import { NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accountCredentials, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const accountSchema = z.object({
  loginId: z.string().trim().regex(/^\d{4,12}$/, "학번은 숫자 4~12자리여야 합니다."),
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(40),
  initialPassword: z.string().min(6, "초기 비밀번호는 6자 이상이어야 합니다.").max(100),
});

const importSchema = z.object({
  accounts: z.array(accountSchema).min(1).max(300),
});

function gradeFromLoginId(loginId: string): 1 | 2 | 3 | null {
  const grade = Number(loginId[0]);
  return grade === 1 || grade === 2 || grade === 3 ? grade : null;
}

async function hashAccounts(accounts: z.infer<typeof accountSchema>[]) {
  const results = new Array<{ loginId: string; passwordHash: string }>(accounts.length);
  let cursor = 0;

  async function worker() {
    while (cursor < accounts.length) {
      const index = cursor++;
      const account = accounts[index];
      results[index] = {
        loginId: account.loginId,
        passwordHash: await hashPassword(account.initialPassword),
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, accounts.length) }, () => worker()));
  return results;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  if (!db) {
    return NextResponse.json(
      { error: { code: "DATABASE_REQUIRED", message: "계정 등록을 사용하려면 DATABASE_URL 설정이 필요합니다." } },
      { status: 503 },
    );
  }

  const accounts = await db
    .select({
      loginId: users.externalId,
      name: users.name,
      grade: users.officialGrade,
      active: users.active,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(eq(users.schoolId, admin.schoolId), eq(users.role, "STUDENT")))
    .orderBy(desc(users.updatedAt))
    .limit(200);

  return NextResponse.json({ accounts: accounts.filter((account) => account.loginId !== admin.externalId) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  if (!db) {
    return NextResponse.json(
      { error: { code: "DATABASE_REQUIRED", message: "계정 등록을 사용하려면 DATABASE_URL 설정이 필요합니다." } },
      { status: 503 },
    );
  }

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: issue?.message ?? "CSV 내용을 확인해 주세요." } },
      { status: 400 },
    );
  }

  const loginIds = parsed.data.accounts.map((account) => account.loginId);
  if (new Set(loginIds).size !== loginIds.length) {
    return NextResponse.json(
      { error: { code: "DUPLICATE_LOGIN_ID", message: "CSV에 중복된 학번이 있습니다." } },
      { status: 400 },
    );
  }

  const existing = await db
    .select({ loginId: users.externalId })
    .from(users)
    .where(and(eq(users.schoolId, admin.schoolId), inArray(users.externalId, loginIds)));
  const existingIds = new Set(existing.map((account) => account.loginId));
  const hashedAccounts = await hashAccounts(parsed.data.accounts);

  const savedUsers = await db
    .insert(users)
    .values(parsed.data.accounts.map((account) => {
      const grade = gradeFromLoginId(account.loginId);
      return {
        schoolId: admin.schoolId,
        externalId: account.loginId,
        name: account.name,
        role: "STUDENT" as const,
        officialGrade: grade,
        learningGrade: grade,
        active: true,
      };
    }))
    .onConflictDoUpdate({
      target: [users.schoolId, users.externalId],
      set: {
        name: sql`excluded.name`,
        role: "STUDENT",
        officialGrade: sql`excluded.official_grade`,
        learningGrade: sql`excluded.learning_grade`,
        active: true,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id, loginId: users.externalId });

  const userIdByLoginId = new Map(savedUsers.map((user) => [user.loginId, user.id]));
  await db
    .insert(accountCredentials)
    .values(hashedAccounts.map((account) => ({
      userId: userIdByLoginId.get(account.loginId)!,
      passwordHash: account.passwordHash,
      passwordUpdatedAt: new Date(),
    })))
    .onConflictDoUpdate({
      target: accountCredentials.userId,
      set: {
        passwordHash: sql`excluded.password_hash`,
        passwordUpdatedAt: new Date(),
      },
    });

  return NextResponse.json({
    total: parsed.data.accounts.length,
    created: loginIds.filter((loginId) => !existingIds.has(loginId)).length,
    updated: loginIds.filter((loginId) => existingIds.has(loginId)).length,
  });
}

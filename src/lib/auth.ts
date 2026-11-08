import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { revalidateTag, unstable_cache } from "next/cache";
import { after } from "next/server";
import { EncryptJWT, jwtDecrypt } from "jose";
import { and, eq, or, sql } from "drizzle-orm";
import { sampleStudentAccounts } from "@/data/student-accounts";
import { db } from "@/db";
import { accountCredentials, schools, smartCampusUserBindings, users } from "@/db/schema";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { verifyCurrentSmartCampusSession } from "@/lib/smart-campus-proof";
import { matchesCurrentSmartCampusSessionBinding } from "@/lib/smart-campus-binding";
import { nativeAccountAllowed as decideNativeAccess } from "@/lib/smart-campus-native-policy";
import { canUseLearning, canUseTeacherTools } from "@/lib/roles";
import type { SessionUser } from "@/types";

const COOKIE_NAME = "learncraft_session";
// 기존 서명 전용 쿠키에는 SSO 출처가 없어 운영 전환 때 한 번 모두 재로그인한다.
// 새 쿠키는 앱별 증명이 브라우저에서 읽히지 않도록 AES-GCM으로 암호화한다.
const secret = createHash("sha256")
  .update(env.AUTH_SECRET ?? "learncraft-local-development-secret-key")
  .digest();
type SsoSession = { platformUserId: string; platformRole: string;
  platformRegistrationId?: string; platformUid?: string; verificationToken: string };

function assertSessionSecret() {
  if (process.env.NODE_ENV === "production" && !env.AUTH_SECRET) throw new Error("AUTH_SECRET_REQUIRED");
}

const adminUser: SessionUser = {
  id: "22222222-2222-4222-8222-222222222222",
  externalId: "lifeprof",
  schoolId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  schoolName: "서대전여자고등학교",
  name: "LearnCraft 관리자",
  role: "ADMIN",
  officialGrade: null,
  learningGrade: null,
};

export function isDevLoginAvailable() {
  return env.AUTH_DEV_LOGIN_ENABLED === "true" && process.env.VERCEL_ENV !== "production";
}

export function isLocalAdminLoginAvailable() {
  return isDevLoginAvailable() && process.env.NODE_ENV === "development";
}

type LoginCredential = {
  loginId: string;
  password: string;
  user: SessionUser;
};

function configuredCredentials(): LoginCredential[] {
  const credentials: LoginCredential[] = [];

  if (env.AUTH_ADMIN_ID && env.AUTH_ADMIN_PASSWORD) {
    credentials.push({
      loginId: env.AUTH_ADMIN_ID,
      password: env.AUTH_ADMIN_PASSWORD,
      user: adminUser,
    });
  }

  if (isDevLoginAvailable()) {
    credentials.push(...sampleStudentAccounts.map((account) => ({
      loginId: account.loginId,
      password: account.initialPassword,
      user: account.user,
    })));

    if (!(env.AUTH_ADMIN_ID && env.AUTH_ADMIN_PASSWORD)) {
      credentials.push({ loginId: "lifeprof", password: "aitutor87&", user: adminUser });
    }
  }

  return credentials;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function authenticateCredentials(loginId: string, password: string) {
  const normalizedLoginId = loginId.trim().toLocaleLowerCase("en-US");

  for (const credential of configuredCredentials()) {
    const idMatches = safeEqual(
      normalizedLoginId,
      credential.loginId.trim().toLocaleLowerCase("en-US"),
    );
    const passwordMatches = safeEqual(password, credential.password);
    if (idMatches && passwordMatches) {
      const user = await activeSessionUser(credential.user);
      return user && await nativeAccountAllowed(user) ? user : null;
    }
  }

  if (db) {
    const [account] = await db
      .select({
        id: users.id,
        externalId: users.externalId,
        schoolId: users.schoolId,
        schoolName: schools.name,
        name: users.name,
        role: users.role,
        officialGrade: users.officialGrade,
        learningGrade: users.learningGrade,
        passwordHash: accountCredentials.passwordHash,
      })
      .from(users)
      .innerJoin(schools, eq(schools.id, users.schoolId))
      .innerJoin(accountCredentials, eq(accountCredentials.userId, users.id))
      .where(and(
        sql`lower(${users.externalId}) = ${normalizedLoginId}`,
        eq(users.active, true),
        eq(schools.active, true),
      ))
      .limit(1);

    if (account && await verifyPassword(password, account.passwordHash)) {
      if (!await nativeAccountAllowed(account)) return null;
      const database = db;
      const loggedInAt = new Date();
      after(async () => {
        try {
          await database.update(users).set({ lastLoginAt: loggedInAt }).where(eq(users.id, account.id));
        } catch {
          console.error("Failed to record last login time");
        }
      });
      return {
        id: account.id,
        externalId: account.externalId,
        schoolId: account.schoolId,
        schoolName: account.schoolName,
        name: account.name,
        role: account.role,
        officialGrade: account.officialGrade as 1 | 2 | 3 | null,
        learningGrade: account.learningGrade as 1 | 2 | 3 | null,
      } satisfies SessionUser;
    }
  }

  return null;
}

export function getSampleStudentAccountPreviews() {
  if (!isDevLoginAvailable()) return [];
  return sampleStudentAccounts.map(({ loginId, user }) => ({ loginId, name: user.name }));
}

export async function createSession(user: SessionUser, options: { embedded?: boolean; sso?: SsoSession } = {}) {
  assertSessionSecret();
  const token = await new EncryptJWT({ user, ...(options.sso ? { sso: options.sso } : {}) })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .encrypt(secret);
  const embeddedCookie = options.embedded === true && process.env.NODE_ENV === "production";
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: embeddedCookie ? "none" : "lax",
    partitioned: embeddedCookie,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function createLocalAdminSession() {
  if (!isLocalAdminLoginAvailable()) return false;
  await createSession(adminUser);
  return true;
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

// Recheck persisted status on every authenticated request so disabling an
// account also blocks an already-issued session, not just the next login.
const readActiveAccount = unstable_cache(async (
  userId: string,
  schoolId: string,
  externalId: string,
  configured: boolean,
) => {
  if (!db) return null;
  const [account] = await db.select({
    id: users.id, externalId: users.externalId, schoolId: users.schoolId,
    name: users.name, schoolName: schools.name, role: users.role,
    officialGrade: users.officialGrade, learningGrade: users.learningGrade,
    active: users.active, schoolActive: schools.active,
  }).from(users).innerJoin(schools, eq(schools.id, users.schoolId)).where(and(
    eq(users.schoolId, schoolId),
    or(eq(users.id, userId), configured ? eq(users.externalId, externalId) : undefined),
  )).limit(1);
  return account ?? null;
}, ["active-account-v1"], { revalidate: 60, tags: ["account-status"] });

export function invalidateAccountStatusCache() {
  revalidateTag("account-status", { expire: 0 });
}

async function activeSessionUser(user: SessionUser): Promise<SessionUser | null> {
  if (!db) return user;
  const configured = configuredCredentials().some((credential) => credential.user.id === user.id && credential.user.schoolId === user.schoolId);
  const account = await readActiveAccount(user.id, user.schoolId, user.externalId, configured);
  if (!account) return configured ? user : null;
  if (!account.active || !account.schoolActive) return null;
  return {
    id: account.id, externalId: account.externalId, schoolId: account.schoolId,
    name: account.name, schoolName: account.schoolName, role: account.role,
    officialGrade: account.officialGrade as 1 | 2 | 3 | null,
    learningGrade: account.learningGrade as 1 | 2 | 3 | null,
  };
}

async function currentSmartCampusBinding(user: SessionUser, sso: Partial<SsoSession>): Promise<boolean> {
  if (!db || !sso.platformRegistrationId || !sso.platformUserId || !sso.platformRole) return false;
  // 등록 세대와 앱 PK·역할이 바뀌면, 중앙 proof가 살아 있어도 예전 기록을 열지 않는다.
  const rows = await db.select({ schoolId: smartCampusUserBindings.schoolId,
    platformUserId: smartCampusUserBindings.platformUserId,
    registrationId: smartCampusUserBindings.registrationId,
    userId: smartCampusUserBindings.userId, role: users.role, active: users.active })
    .from(smartCampusUserBindings)
    .innerJoin(users, and(eq(users.id, smartCampusUserBindings.userId),
      eq(users.schoolId, smartCampusUserBindings.schoolId)))
    .where(and(eq(smartCampusUserBindings.schoolId, user.schoolId),
      eq(smartCampusUserBindings.platformUserId, sso.platformUserId)))
    .limit(2);
  return rows.length === 1 && matchesCurrentSmartCampusSessionBinding(rows[0], {
    schoolId: user.schoolId, platformUserId: sso.platformUserId,
    registrationId: sso.platformRegistrationId, userId: user.id,
    role: user.role, platformRole: sso.platformRole,
  });
}

async function nativeAccountAllowed(user: Pick<SessionUser, "id" | "schoolId">): Promise<boolean> {
  return decideNativeAccess(user.id, user.schoolId,
    env.LEARNCRAFT_BOUND_ACCOUNTS_SSO_ONLY === "true", async (userId, schoolId) => {
      if (!db) throw new Error("DATABASE_REQUIRED");
      // 중앙 연결 계정만 자체 비밀번호 경로에서 거부한다. 독립 PK는 계속 허용한다.
      const rows = await db.select({ userId: smartCampusUserBindings.userId })
        .from(smartCampusUserBindings)
        .where(and(eq(smartCampusUserBindings.schoolId, schoolId),
          eq(smartCampusUserBindings.userId, userId))).limit(1);
      return rows.length > 0;
    });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    assertSessionSecret();
    const { payload } = await jwtDecrypt(token, secret);
    const user = payload.user as SessionUser;
    if (!user || typeof user.id !== "string" || typeof user.role !== "string") return null;
    if (payload.sso !== undefined) {
      const sso = payload.sso as Partial<SsoSession>;
      if (!sso || typeof sso.platformUserId !== "string" || !sso.platformUserId ||
          typeof sso.platformRole !== "string" || !sso.platformRole ||
          typeof sso.verificationToken !== "string" || !sso.verificationToken ||
          (env.SMART_CAMPUS_REQUIRE_REGISTRATION_BINDING === "true" &&
            (!sso.platformRegistrationId || typeof sso.platformUid !== "string")) ||
          !await verifyCurrentSmartCampusSession(sso.verificationToken,
            { userId: sso.platformUserId, role: sso.platformRole,
              registrationId: sso.platformRegistrationId, uid: sso.platformUid }, env.SMART_CAMPUS_VERIFY_URL)) return null;
      if (sso.platformRegistrationId) {
        if (!await currentSmartCampusBinding(user, sso)) return null;
      }
    } else if (!await nativeAccountAllowed(user)) {
      return null;
    }
    return await activeSessionUser({
      ...user,
      schoolName: user.schoolName ?? "서대전여자고등학교",
    });
  } catch {
    return null;
  }
}

// 스트림 응답을 반환한 뒤에는 Next 요청 컨텍스트의 cookies()를 다시 읽지 않는다.
// 요청 시작 시 암호화된 쿠키의 중앙 증명을 캡처하고, 이후에는 이 증명만 중앙에서
// 재검증한다. 앱 자체 비밀번호 세션에는 중앙 재발급 정책을 적용하지 않는다.
export async function captureSmartCampusStreamVerifier(user: SessionUser): Promise<(() => Promise<boolean>) | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return async () => false;
  try {
    assertSessionSecret();
    const { payload } = await jwtDecrypt(token, secret);
    const stored = payload.user as SessionUser | undefined;
    if (!stored || stored.id !== user.id || stored.schoolId !== user.schoolId || stored.role !== user.role) {
      return async () => false;
    }
    if (payload.sso === undefined) {
      // 진행 중인 자체 로그인 스트림도 연결표가 바뀌면 다음 주기 검사에서 닫는다.
      return env.LEARNCRAFT_BOUND_ACCOUNTS_SSO_ONLY === "true"
        ? async () => nativeAccountAllowed(user) : null;
    }
    const sso = payload.sso as Partial<SsoSession>;
    if (!sso || typeof sso.platformUserId !== "string" || !sso.platformUserId ||
        typeof sso.platformRole !== "string" || !sso.platformRole ||
        typeof sso.verificationToken !== "string" || !sso.verificationToken ||
        (env.SMART_CAMPUS_REQUIRE_REGISTRATION_BINDING === "true" &&
          (!sso.platformRegistrationId || typeof sso.platformUid !== "string"))) {
      return async () => false;
    }
    const expected = { userId: sso.platformUserId, role: sso.platformRole,
      registrationId: sso.platformRegistrationId, uid: sso.platformUid };
    const proof = sso.verificationToken;
    return async () => {
      try {
        if (!await verifyCurrentSmartCampusSession(proof, expected, env.SMART_CAMPUS_VERIFY_URL)) return false;
        // 이미 시작된 응답도 연결 해제·역할 변경을 다음 주기 검사에서 감지한다.
        return sso.platformRegistrationId ? await currentSmartCampusBinding(user, sso) : true;
      }
      catch { return false; }
    };
  } catch { return async () => false; }
}

export async function requireStudent() {
  const user = await getSession();
  return user?.role === "STUDENT" ? user : null;
}

export async function requireAdmin() {
  const user = await getSession();
  return user?.role === "ADMIN" ? user : null;
}

export async function requireLearner() {
  const user = await getSession();
  return user && canUseLearning(user.role) ? user : null;
}

export async function requireTeacherTools() {
  const user = await getSession();
  return user && canUseTeacherTools(user.role) ? user : null;
}

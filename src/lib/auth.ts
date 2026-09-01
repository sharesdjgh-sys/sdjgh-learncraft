import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, sql } from "drizzle-orm";
import { sampleStudentAccounts } from "@/data/student-accounts";
import { db } from "@/db";
import { accountCredentials, schools, users } from "@/db/schema";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import type { SessionUser } from "@/types";

const COOKIE_NAME = "learncraft_session";
const secret = new TextEncoder().encode(
  env.AUTH_SECRET ?? "learncraft-local-development-secret-key",
);

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
    if (idMatches && passwordMatches) return credential.user;
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
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, account.id));
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

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const user = payload.user as SessionUser;
    return {
      ...user,
      schoolName: user.schoolName ?? "서대전여자고등학교",
    };
  } catch {
    return null;
  }
}

export async function requireStudent() {
  const user = await getSession();
  return user?.role === "STUDENT" ? user : null;
}

export async function requireAdmin() {
  const user = await getSession();
  return user?.role === "ADMIN" ? user : null;
}

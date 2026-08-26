import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { SessionUser } from "@/types";

const COOKIE_NAME = "learncraft_session";
const secret = new TextEncoder().encode(
  env.AUTH_SECRET ?? "learncraft-local-development-secret-key",
);

export const demoUsers: SessionUser[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    externalId: "student-2026-001",
    schoolId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    schoolName: "서대전여자고등학교",
    name: "김서윤",
    role: "STUDENT",
    officialGrade: 1,
    learningGrade: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    externalId: "admin-2026-001",
    schoolId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    schoolName: "서대전여자고등학교",
    name: "박지현 선생님",
    role: "ADMIN",
    officialGrade: null,
    learningGrade: null,
  },
];

export function isDevLoginAvailable() {
  return env.AUTH_DEV_LOGIN_ENABLED === "true" && process.env.VERCEL_ENV !== "production";
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

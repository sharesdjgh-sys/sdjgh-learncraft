import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { schools, users } from "@/db/schema";
import { env } from "@/lib/env";
import {
  inferOfficialGrade,
  mapSmartCampusRole,
  primarySmartCampusExternalId,
  smartCampusExternalIdCandidates,
  type SmartCampusUser,
} from "@/lib/smart-campus-identity";
import type { SessionUser } from "@/types";

type VerifyResponse = {
  valid?: boolean;
  user?: Partial<SmartCampusUser>;
};

export class SmartCampusSsoError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

export async function verifySmartCampusToken(token: string): Promise<SmartCampusUser> {
  let response: Response;
  try {
    response = await fetch(env.SMART_CAMPUS_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new SmartCampusSsoError("PLATFORM_UNAVAILABLE", 503);
  }

  const payload = await response.json().catch(() => null) as VerifyResponse | null;
  if (!response.ok || !payload?.valid || !payload.user) {
    throw new SmartCampusSsoError("INVALID_PLATFORM_TOKEN", 401);
  }

  const user = payload.user;
  if (
    typeof user.userId !== "string"
    || typeof user.uid !== "string"
    || typeof user.name !== "string"
    || typeof user.role !== "string"
  ) {
    throw new SmartCampusSsoError("INVALID_PLATFORM_IDENTITY", 401);
  }
  return { userId: user.userId, uid: user.uid, name: user.name, role: user.role };
}

export async function resolveSmartCampusUser(identity: SmartCampusUser): Promise<SessionUser> {
  if (!db) throw new SmartCampusSsoError("DATABASE_REQUIRED", 503);

  const role = mapSmartCampusRole(identity.role);
  if (!role) throw new SmartCampusSsoError("ROLE_NOT_ALLOWED", 403);

  const externalId = primarySmartCampusExternalId(identity);
  if (!externalId) throw new SmartCampusSsoError("IDENTIFIER_REQUIRED", 403);

  const [school] = await db
    .select({ id: schools.id, name: schools.name, active: schools.active })
    .from(schools)
    .where(eq(schools.name, env.SMART_CAMPUS_SCHOOL_NAME))
    .limit(1);
  if (!school?.active) throw new SmartCampusSsoError("SCHOOL_UNAVAILABLE", 403);

  const candidates = smartCampusExternalIdCandidates(identity);
  const existing = await db
    .select({
      id: users.id,
      externalId: users.externalId,
      active: users.active,
      officialGrade: users.officialGrade,
      learningGrade: users.learningGrade,
    })
    .from(users)
    .where(and(eq(users.schoolId, school.id), inArray(users.externalId, candidates)));
  const matched = candidates
    .map((candidate) => existing.find((account) => account.externalId === candidate))
    .find(Boolean);

  if (matched && !matched.active) throw new SmartCampusSsoError("ACCOUNT_DISABLED", 403);

  const now = new Date();
  if (matched) {
    await db.update(users).set({ name: identity.name, role, lastLoginAt: now, updatedAt: now })
      .where(and(eq(users.id, matched.id), eq(users.schoolId, school.id)));
    return {
      id: matched.id,
      externalId: matched.externalId,
      schoolId: school.id,
      schoolName: school.name,
      name: identity.name,
      role,
      officialGrade: matched.officialGrade as 1 | 2 | 3 | null,
      learningGrade: matched.learningGrade as 1 | 2 | 3 | null,
    };
  }

  const grade = role === "STUDENT" ? inferOfficialGrade(externalId) : null;
  const [inserted] = await db.insert(users).values({
    schoolId: school.id,
    externalId,
    name: identity.name,
    role,
    officialGrade: grade,
    learningGrade: grade,
    active: true,
    lastLoginAt: now,
  }).onConflictDoNothing({ target: [users.schoolId, users.externalId] }).returning({ id: users.id });

  const [account] = inserted ? [inserted] : await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.schoolId, school.id), eq(users.externalId, externalId)))
    .limit(1);
  if (!account) throw new SmartCampusSsoError("ACCOUNT_PROVISION_FAILED", 503);

  return {
    id: account.id,
    externalId,
    schoolId: school.id,
    schoolName: school.name,
    name: identity.name,
    role,
    officialGrade: grade,
    learningGrade: grade,
  };
}

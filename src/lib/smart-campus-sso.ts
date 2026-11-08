import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { schools, smartCampusUserBindings, users } from "@/db/schema";
import { invalidateAccountStatusCache } from "@/lib/auth";
import { env } from "@/lib/env";
import { SmartCampusSsoError, verifyPlatformCredential } from "@/lib/smart-campus-proof";
export { SmartCampusSsoError } from "@/lib/smart-campus-proof";
import { matchesSmartCampusBinding, selectLegacySmartCampusAccount } from "@/lib/smart-campus-binding";
import {
  inferOfficialGrade,
  mapSmartCampusRole,
  primarySmartCampusExternalId,
  smartCampusExternalIdCandidates,
  type SmartCampusUser,
} from "@/lib/smart-campus-identity";
import type { SessionUser } from "@/types";

const registrationPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function verifySmartCampusToken(token: string): Promise<{
  user: SmartCampusUser;
  sessionToken: string;
}> {
  const result = await verifyPlatformCredential(token, env.SMART_CAMPUS_VERIFY_URL);
  const user = result.user;
  if (
    typeof user.userId !== "string"
    || typeof user.uid !== "string"
    || typeof user.name !== "string"
    || typeof user.role !== "string"
  ) {
    throw new SmartCampusSsoError("INVALID_PLATFORM_IDENTITY", 401);
  }
  const registrationId = user.registrationId;
  // 보안 기능을 켠 중앙 플랫폼은 증명과 등록 세대를 함께 보낸다. 둘 중 하나만
  // 오면 예전 학번 기반 연결로 후퇴하지 않고 인증을 중단한다.
  if ((result.sessionProof && (typeof registrationId !== "string" || !registrationPattern.test(registrationId))) ||
      (registrationId !== undefined && (!result.sessionProof || typeof registrationId !== "string" ||
        !registrationPattern.test(registrationId))) ||
      (!result.sessionProof && env.SMART_CAMPUS_REQUIRE_REGISTRATION_BINDING === "true")) {
    throw new SmartCampusSsoError("REGISTRATION_BINDING_REQUIRED", 403);
  }
  return {
    user: { userId: user.userId, uid: user.uid, name: user.name, role: user.role,
      ...(typeof registrationId === "string" ? { registrationId } : {}) },
    // 기능 OFF에서는 증명이 없으므로 원래 JWT를 매 요청 중앙 재확인에 쓴다.
    // 기능 ON 후에는 이 JWT가 자격 버전으로 거부되거나 앱 전용 증명을 받는다.
    sessionToken: result.sessionProof ?? token,
  };
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

  if (identity.registrationId) {
    // 등록 세대가 있는 중앙 계정은 사전에 감사·확정한 연결만 허용한다.
    // 연결이 없거나 다른 세대이면 새 사용자를 만들거나 5자리 학번으로 찾지 않는다.
    const [binding] = await db.select({
      schoolId: smartCampusUserBindings.schoolId,
      platformUserId: smartCampusUserBindings.platformUserId,
      userId: smartCampusUserBindings.userId,
      registrationId: smartCampusUserBindings.registrationId,
      externalId: users.externalId,
      name: users.name,
      role: users.role,
      active: users.active,
      officialGrade: users.officialGrade,
      learningGrade: users.learningGrade,
    }).from(smartCampusUserBindings)
      .innerJoin(users, and(eq(users.id, smartCampusUserBindings.userId),
        eq(users.schoolId, smartCampusUserBindings.schoolId)))
      .where(and(eq(smartCampusUserBindings.schoolId, school.id),
        eq(smartCampusUserBindings.platformUserId, identity.userId))).limit(1);
    if (!matchesSmartCampusBinding(binding, {
      schoolId: school.id, platformUserId: identity.userId,
      registrationId: identity.registrationId,
    })) {
      throw new SmartCampusSsoError("REGISTRATION_BINDING_REQUIRED", 403);
    }
    const now = new Date();
    // 등록 UUID는 사람을, 현재 uid는 올해의 학년을 가리킨다. 학년이 바뀌어도
    // 기존 PK와 기록은 유지하고 공식 학년만 중앙 명부의 현재 값으로 맞춘다.
    // 학습 학년은 학생이 선택한 별도 설정이므로 자동으로 덮어쓰지 않는다.
    const officialGrade = role === "STUDENT" ? inferOfficialGrade(identity.uid) : null;
    // 명시적으로 연결된 SSO 계정만 중앙 권한을 따라가게 한다. 별도 PK의 독립 계정 역할은 유지한다.
    await db.update(users).set({ name: identity.name, role, officialGrade, lastLoginAt: now, updatedAt: now })
      .where(and(eq(users.id, binding.userId), eq(users.schoolId, school.id)));
    // 보호 요청은 계정 상태·역할을 캐시해 읽는다. 중앙에서 이름·권한·학년이
    // 바뀐 로그인 직후에는 이전 값을 내보내지 않도록 해당 캐시를 무효화한다.
    if (binding.name !== identity.name || binding.role !== role || binding.officialGrade !== officialGrade) {
      invalidateAccountStatusCache();
    }
    return {
      id: binding.userId, externalId: binding.externalId, schoolId: school.id,
      schoolName: school.name, name: identity.name, role,
      officialGrade,
      learningGrade: binding.learningGrade as 1 | 2 | 3 | null,
    };
  }

  if (env.SMART_CAMPUS_REQUIRE_REGISTRATION_BINDING === "true") {
    throw new SmartCampusSsoError("REGISTRATION_BINDING_REQUIRED", 403);
  }

  const candidates = smartCampusExternalIdCandidates(identity);
  const existing = await db
    .select({
      id: users.id,
      externalId: users.externalId,
      role: users.role,
      active: users.active,
      officialGrade: users.officialGrade,
      learningGrade: users.learningGrade,
    })
    .from(users)
    .where(and(eq(users.schoolId, school.id), inArray(users.externalId, candidates)));
  const selection = selectLegacySmartCampusAccount(candidates, existing, role);
  if (selection.kind === "ambiguous") throw new SmartCampusSsoError("ACCOUNT_LINK_AMBIGUOUS", 403);
  if (selection.kind === "role_mismatch") throw new SmartCampusSsoError("ACCOUNT_ROLE_MISMATCH", 403);
  const matched = selection.kind === "matched" ? selection.account : undefined;

  if (matched && !matched.active) throw new SmartCampusSsoError("ACCOUNT_DISABLED", 403);

  const now = new Date();
  if (matched) {
    // 역할이 다른 기존 계정은 위에서 차단한다. 로그인만으로 역할을 덮어쓰지 않는다.
    await db.update(users).set({ name: identity.name, lastLoginAt: now, updatedAt: now })
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

  // 최초 조회와 INSERT 사이에 같은 외부 ID가 만들어졌다면 충돌 계정의 상태·역할을
  // 다시 확인한다. 첫 조회에서의 역할 검사만 믿고 다른 계정으로 로그인시키지 않는다.
  const [account] = inserted ? [{ id: inserted.id, role, active: true }] : await db
    .select({ id: users.id, role: users.role, active: users.active })
    .from(users)
    .where(and(eq(users.schoolId, school.id), eq(users.externalId, externalId)))
    .limit(1);
  if (!account) throw new SmartCampusSsoError("ACCOUNT_PROVISION_FAILED", 503);
  if (!account.active) throw new SmartCampusSsoError("ACCOUNT_DISABLED", 403);
  if (account.role !== role) throw new SmartCampusSsoError("ACCOUNT_ROLE_MISMATCH", 403);

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

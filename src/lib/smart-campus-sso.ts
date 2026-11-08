import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { schools, smartCampusUserBindings, users } from "@/db/schema";
import { invalidateAccountStatusCache } from "@/lib/auth";
import { env } from "@/lib/env";
import { SmartCampusSsoError, verifyPlatformCredential } from "@/lib/smart-campus-proof";
export { SmartCampusSsoError } from "@/lib/smart-campus-proof";
import { matchesSmartCampusBinding, resolveLinkedRole,
  selectLegacySmartCampusAccount } from "@/lib/smart-campus-binding";
import { hasPossibleOwnerOverlap, planLearnCraftAutoProvision } from "@/lib/smart-campus-provisioning";
import {
  inferOfficialGrade,
  mapSmartCampusRole,
  primarySmartCampusExternalId,
  smartCampusExternalIdCandidates,
  type SmartCampusUser,
} from "@/lib/smart-campus-identity";
import type { SessionUser } from "@/types";

const registrationPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type Db = NonNullable<typeof db>;
function resultRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? rows as Record<string, unknown>[] : [];
}
// drizzle `sql` 템플릿은 JS 배열을 `($1, $2, ...)`로 펼치므로 키 목록은 JSON 문자열 하나로 넘긴다.
const keyList = (keys: string[]) => sql`(SELECT jsonb_array_elements_text(${JSON.stringify(keys)}::jsonb))`;

/**
 * 안전한 자동 생성: 연결이 없고 이 사람의 것일 수 있는 연결 없는 기존 계정이 없을 때만
 * 새 계정과 바인딩을 한 SQL 문장으로 만든다(Neon HTTP 드라이버에는 대화형 거래가 없다).
 * 문장 안에서 같은 중앙 ID·등록 UUID의 바인딩, 연결 없는 겹침 계정, 같은 외부 ID를 다시
 * 확인하고 하나라도 있으면 아무 행도 쓰지 않는다. 바인딩 삽입이 실패하면 사용자 삽입도 취소된다.
 */
async function provisionSmartCampusAccount(database: Db, schoolId: string,
  identity: SmartCampusUser & { registrationId: string }, role: "STUDENT" | "TEACHER" | "ADMIN"):
  Promise<string | null> {
  if (env.SMART_CAMPUS_AUTO_PROVISION === "false") return null;
  const plan = planLearnCraftAutoProvision(identity, role);
  if (plan.kind !== "create") return null;
  const candidates = resultRows(await database.execute(sql`
    SELECT u.id::text AS id, u.external_id AS "externalId",
      EXISTS (SELECT 1 FROM public.smart_campus_user_bindings b WHERE b.user_id = u.id) AS bound
    FROM public.users u
    WHERE u.school_id = ${schoolId}::uuid AND lower(u.external_id) IN ${keyList(plan.keys)}
    LIMIT 50`)).map(row => ({ id: String(row.id), externalId: String(row.externalId ?? ""),
    bound: row.bound === true }));
  if (hasPossibleOwnerOverlap(plan, candidates)) return null;
  const { account } = plan;
  const inserted = resultRows(await database.execute(sql`
    WITH blocked AS (
      SELECT 1 FROM public.smart_campus_user_bindings b
      WHERE b.school_id = ${schoolId}::uuid
        AND (b.platform_user_id = ${identity.userId}::text OR b.registration_id = ${identity.registrationId}::uuid)
      UNION ALL
      SELECT 1 FROM public.users u
      WHERE u.school_id = ${schoolId}::uuid AND lower(u.external_id) IN ${keyList(plan.keys)}
        AND NOT EXISTS (SELECT 1 FROM public.smart_campus_user_bindings x WHERE x.user_id = u.id)
      UNION ALL
      SELECT 1 FROM public.users u
      WHERE u.school_id = ${schoolId}::uuid AND lower(u.external_id) = lower(${account.externalId}::text)
    ), new_user AS (
      -- INSERT ... SELECT의 타입 미지정 인자는 text로 해석되므로 열 타입으로 명시 변환한다.
      INSERT INTO public.users (school_id, external_id, name, role, official_grade, learning_grade,
        active, last_login_at)
      SELECT ${schoolId}::uuid, ${account.externalId}::text, ${account.name}::text,
        ${account.role}::user_role, ${account.officialGrade}::integer, ${account.officialGrade}::integer,
        true, now()
      WHERE NOT EXISTS (SELECT 1 FROM blocked)
      RETURNING id, school_id
    )
    INSERT INTO public.smart_campus_user_bindings (school_id, platform_user_id, registration_id, user_id)
    SELECT school_id, ${identity.userId}::text, ${identity.registrationId}::uuid, id FROM new_user
    RETURNING user_id::text AS user_id`));
  return inserted.length === 1 ? String(inserted[0].user_id) : null;
}

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
    // 등록 세대가 있는 중앙 계정은 사전에 감사·확정한 연결을 쓴다. 연결이 없으면
    // 겹칠 수 있는 연결 없는 기존 계정이 없을 때만 새 계정을 만들고(5자리 학번으로 찾지 않음),
    // 다른 세대로 연결돼 있거나 겹침이 있으면 이유 코드로 거부한다.
    const database = db;
    const findBinding = () => database.select({
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
    let [binding] = await findBinding();
    if (!binding) {
      const createdUserId = await provisionSmartCampusAccount(database, school.id,
        { ...identity, registrationId: identity.registrationId }, role);
      if (!createdUserId) throw new SmartCampusSsoError("BINDING_REVIEW_REQUIRED", 403);
      [binding] = await findBinding();
      if (binding?.userId !== createdUserId) throw new SmartCampusSsoError("BINDING_REVIEW_REQUIRED", 403);
    }
    if (binding.registrationId !== identity.registrationId) {
      throw new SmartCampusSsoError("REGISTRATION_CHANGED", 403);
    }
    if (!binding.active) throw new SmartCampusSsoError("ACCOUNT_DISABLED", 403);
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
    // 연결된 SSO 계정의 역할: 중앙 학생은 STUDENT, 중앙 교직원은 앱 TEACHER/ADMIN 역할을 유지한다.
    // 별도 PK의 독립 계정 역할은 바꾸지 않는다.
    const linkedRole = resolveLinkedRole(binding.role, role) as typeof role;
    await db.update(users).set({ name: identity.name, role: linkedRole, officialGrade, lastLoginAt: now,
      updatedAt: now })
      .where(and(eq(users.id, binding.userId), eq(users.schoolId, school.id)));
    // 보호 요청은 계정 상태·역할을 캐시해 읽는다. 중앙에서 이름·권한·학년이
    // 바뀐 로그인 직후에는 이전 값을 내보내지 않도록 해당 캐시를 무효화한다.
    if (binding.name !== identity.name || binding.role !== linkedRole || binding.officialGrade !== officialGrade) {
      invalidateAccountStatusCache();
    }
    return {
      id: binding.userId, externalId: binding.externalId, schoolId: school.id,
      schoolName: school.name, name: identity.name, role: linkedRole,
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

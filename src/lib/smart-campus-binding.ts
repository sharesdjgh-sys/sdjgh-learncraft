import { mapSmartCampusRole } from "./smart-campus-identity";

/**
 * 연결된 앱 계정의 역할. 중앙 학생은 항상 STUDENT로 맞춘다.
 * 중앙 교직원은 앱 계정이 이미 TEACHER/ADMIN이면 앱 역할을 그대로 둔다
 * (예: 중앙 '교사'로 등록된 사람의 LearnCraft ADMIN 권한을 낮추지 않는다).
 */
export function resolveLinkedRole(appRole: string, centralRole: string): string {
  if (centralRole === "STUDENT") return "STUDENT";
  if (appRole === "TEACHER" || appRole === "ADMIN") return appRole;
  return centralRole;
}

/** 검토된 중앙 계정과 LearnCraft 기존 계정의 정확한 연결만 허용한다. */
export function matchesSmartCampusBinding(
  binding: {
    schoolId: string;
    platformUserId: string;
    registrationId: string;
    active: boolean;
  } | undefined,
  expected: { schoolId: string; platformUserId: string; registrationId: string },
): boolean {
  return Boolean(binding?.active && binding.schoolId === expected.schoolId &&
    binding.platformUserId === expected.platformUserId &&
    binding.registrationId === expected.registrationId);
}

/** 발급된 SSO 쿠키가 현재도 같은 앱 계정과 역할을 가리킬 때만 기록 접근을 허용한다. */
export function matchesCurrentSmartCampusSessionBinding(
  binding: { schoolId: string; platformUserId: string; registrationId: string;
    userId: string; role: string; active: boolean } | undefined,
  expected: { schoolId: string; platformUserId: string; registrationId: string;
    userId: string; role: string; platformRole: string },
): boolean {
  const currentRole = mapSmartCampusRole(expected.platformRole);
  // 세션 역할은 연결된 앱 계정의 현재 역할과 같고, 그 역할이 중앙 역할에서 허용되는 값이어야 한다.
  return Boolean(binding?.active && currentRole && binding.role === expected.role &&
    resolveLinkedRole(binding.role, currentRole) === expected.role &&
    binding.schoolId === expected.schoolId &&
    binding.platformUserId === expected.platformUserId &&
    binding.registrationId === expected.registrationId &&
    binding.userId === expected.userId);
}

/** 구형 SSO의 식별자 후보가 여럿일 때 기존 기록 계정을 임의 선택하지 않는다. */
export function selectLegacySmartCampusAccount<T extends {
  id: string; externalId: string; role: string;
}>(candidates: string[], accounts: T[], expectedRole: string):
  { kind: "none" | "ambiguous" | "role_mismatch"; account?: never } |
  { kind: "matched"; account: T } {
  const matching = accounts.filter(account => candidates.includes(account.externalId));
  if (new Set(matching.map(account => account.id)).size > 1) return { kind: "ambiguous" };
  const account = matching[0];
  if (!account) return { kind: "none" };
  if (account.role !== expectedRole) return { kind: "role_mismatch" };
  return { kind: "matched", account };
}

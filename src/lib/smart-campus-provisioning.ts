import { smartCampusExternalIdCandidates, type SmartCampusUser } from "./smart-campus-identity";
import type { UserRole } from "@/types";

// 연결 없는 중앙 계정의 안전한 자동 생성 규칙(PyRun·타자연습과 같은 원칙, DB 접근 없음).
// - 연결이 없고, 이 사람의 것일 수 있는 "연결 없는" 기존 계정이 없을 때만 새 계정을 만든다.
// - 기존 PK에는 자동으로 붙이지 않는다. 특수 형식 학생은 사람별 검토 대상이라 만들지 않는다.

export type LearnCraftNewAccount = {
  externalId: string; name: string; role: UserRole; officialGrade: number | null;
};

export type LearnCraftAutoProvisionPlan =
  | { kind: "create"; account: LearnCraftNewAccount; keys: string[] }
  | { kind: "review" };

export type LearnCraftCandidate = { id: string; externalId: string; bound: boolean };

const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
const COHORT_ACCOUNT = /^(\d{2})-\d{5}$/;
const CURRENT_NUMBER = /^(?:(\d{2}|\d{4})-)?(\d{5})$/;

/**
 * 계획기(scripts/plan-smart-campus-provisioning.ts)의 create와 같은 외부 ID를 만든다.
 * 일반 학생: `입학연도-5자리`, 공식 학년 1~3. 교직원: `sc-<등록 UUID>`.
 */
export function planLearnCraftAutoProvision(identity: Required<Pick<SmartCampusUser,
  "userId" | "uid" | "name" | "registrationId">>, role: UserRole): LearnCraftAutoProvisionPlan {
  const name = typeof identity.name === "string" ? identity.name.trim() : "";
  if (!name || !identity.userId || !identity.registrationId) return { kind: "review" };
  let account: LearnCraftNewAccount;
  if (role === "STUDENT") {
    const cohort = COHORT_ACCOUNT.exec(identity.userId)?.[1];
    const current = CURRENT_NUMBER.exec(identity.uid ?? "");
    if (!cohort || !current || (current[1] && current[1] !== cohort && current[1] !== `20${cohort}`)) {
      return { kind: "review" };
    }
    const grade = Number(current[2].slice(0, 1));
    if (grade < 1 || grade > 3) return { kind: "review" };
    account = { externalId: `${cohort}-${current[2]}`, name, role, officialGrade: grade };
  } else {
    account = { externalId: `sc-${identity.registrationId}`, name, role, officialGrade: null };
  }
  const keys = [...new Set([...smartCampusExternalIdCandidates(identity), account.externalId]
    .map(normalize).filter(Boolean))];
  return { kind: "create", account, keys };
}

/** 연결 없는 기존 계정 중 이 사람의 것일 수 있는 계정이 있으면 true. */
export function hasPossibleOwnerOverlap(plan: Extract<LearnCraftAutoProvisionPlan, { kind: "create" }>,
  candidates: LearnCraftCandidate[]): boolean {
  const keys = new Set(plan.keys);
  // 이미 다른 중앙 계정에 연결된 PK는 그 사람의 것이므로 겹침이 아니다.
  return candidates.some(row => !row.bound && keys.has(normalize(row.externalId)));
}

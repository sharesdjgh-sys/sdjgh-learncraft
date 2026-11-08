import type { Binding, LocalUser, RosterSnapshot } from "./audit-smart-campus-bindings";
import { mapSmartCampusRole, smartCampusExternalIdCandidates } from "../src/lib/smart-campus-identity";

// 비공개 검토 결과의 구조만 확인한다. 이 파일은 Neon에 접속하거나 행을 쓰지 않는다.
const REGISTRATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const STUDENT_NUMBER = /^(?:\d{2,4}-)?(\d{5})$/;
// 중앙 명부의 실제 학생 B열 ID는 `입학연도-5자리 번호` 형식이다.
const COHORT_ACCOUNT = /^(\d{2})-\d{5}$/;
const normalizeId = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("en-US");

type Decision = { platformUserId: string; registrationId: string;
  kind: "existing" | "create" | "hold"; localUserId?: string;
  excludedLocalUserIds?: string[]; distinctPersonEvidenceRef?: string;
  retiredAccountEvidenceRef?: string;
  specialStudentEvidenceRef?: string;
  reviewedBy?: string; evidenceRef?: string };
type Action = { kind: "existing" | "create"; platformUserId: string;
  registrationId: string; localUserId?: string; externalId?: string;
  name?: string; role: string; officialGrade?: number };

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function planLearnCraftProvisioning(snapshot: RosterSnapshot, schoolId: string,
  localUsers: LocalUser[], decisions: Decision[], bindings: Binding[] = []) {
  if (!Array.isArray(snapshot?.headers) || snapshot.headers.length !== 10 ||
      snapshot.headers[1] !== "ID" || snapshot.headers[3] !== "이름" ||
      !snapshot.headers[4].includes("학번") || snapshot.headers[5] !== "권한" ||
      snapshot.headers[6] !== "상태" || !Array.isArray(snapshot.rows) ||
      !Array.isArray(snapshot.registrationIds) || snapshot.rows.length !== snapshot.registrationIds.length ||
      snapshot.rows.length > 100000 || snapshot.rows.some(row => !Array.isArray(row) || row.length > 10) ||
      !schoolId || !Array.isArray(localUsers) || !Array.isArray(decisions) || !Array.isArray(bindings)) {
    throw Error("invalid_provisioning_input");
  }
  const active = snapshot.rows.map((row, index) => ({ row, index,
    role: mapSmartCampusRole(String(row[5] ?? "")) })).filter(item =>
    item.row[6] === "Active" && item.role);
  const ids = countBy(active.map(item => String(item.row[1] ?? "")));
  const registrations = countBy(active.map(item => String(snapshot.registrationIds[item.index] ?? "")));
  const numbers = countBy(active.filter(item => item.role === "STUDENT")
    .map(item => STUDENT_NUMBER.exec(String(item.row[4] ?? ""))?.[1] ?? "").filter(Boolean));
  const schoolUsers = localUsers.filter(user => user.school_id === schoolId);
  const usersById = new Map(schoolUsers.map(user => [user.id, user]));
  const decisionsById = new Map<string, Decision[]>();
  for (const decision of decisions) {
    const list = decisionsById.get(decision?.platformUserId) ?? [];
    list.push(decision);
    decisionsById.set(decision?.platformUserId, list);
  }
  const boundByPlatform = new Map(bindings.filter(binding => binding.school_id === schoolId)
    .map(binding => [binding.platform_user_id, binding]));
  const boundByUser = new Set(bindings.map(binding => binding.user_id));
  const usedUsers = new Set<string>();
  const actions: Action[] = [];
  const counts = { active: active.length, existing: 0, create: 0, hold: 0,
    missingDecision: 0, invalidDecision: 0, collision: 0, existingBinding: 0 };
  const activeIds = new Set(active.map(item => item.row[1]));
  const extraneousDecisions = decisions.filter(decision => !activeIds.has(decision?.platformUserId)).length;

  for (const { row, index, role } of active) {
    const platformUserId = row[1];
    const registrationId = snapshot.registrationIds[index];
    const group = decisionsById.get(String(platformUserId ?? "")) ?? [];
    if (!group.length) { counts.missingDecision++; continue; }
    if (group.length !== 1 || typeof platformUserId !== "string" || !platformUserId ||
        platformUserId !== platformUserId.trim() || platformUserId.length > 200 ||
        ids.get(platformUserId) !== 1 || !REGISTRATION_ID.test(String(registrationId ?? "")) ||
        registrations.get(String(registrationId)) !== 1) { counts.invalidDecision++; continue; }
    const decision = group[0];
    if (decision.registrationId !== registrationId ||
        !["existing", "create", "hold"].includes(decision.kind)) {
      counts.invalidDecision++; continue;
    }
    if (decision.kind === "hold") { counts.hold++; continue; }
    // 문자열 표시는 신원 확인의 증거가 아니다. 독립 검토 자료를 요구하고 나중에
    // 실제 적용 시에도 최신 명부·DB·증거를 다시 대조해야 한다.
    if (!decision.reviewedBy?.trim() || !decision.evidenceRef?.trim()) {
      counts.invalidDecision++; continue;
    }
    const prior = boundByPlatform.get(platformUserId);
    if (prior) {
      const boundUser = usersById.get(prior.user_id);
      if (decision.kind === "existing" && prior.registration_id === registrationId &&
          prior.user_id === decision.localUserId && boundUser?.active) counts.existingBinding++;
      else counts.collision++;
      continue;
    }
    if (decision.kind === "existing") {
      const user = usersById.get(String(decision.localUserId ?? ""));
      // 중앙 권한은 바인딩된 PK의 SSO 로그인에서 동기화한다. 이전 역할만으로
      // 사람이 직접 검토한 B ID·등록 UUID·PK 연결을 무효화하지 않는다.
      if (!user?.active || usedUsers.has(user.id) || boundByUser.has(user.id)) {
        counts.collision++; continue;
      }
      usedUsers.add(user.id);
      counts.existing++;
      actions.push({ kind: "existing", platformUserId, registrationId: String(registrationId),
        localUserId: user.id, role: String(role) });
      continue;
    }
    const uid = String(row[4] ?? "");
    const number = STUDENT_NUMBER.exec(uid)?.[1];
    const cohort = COHORT_ACCOUNT.exec(platformUserId)?.[1];
    const externalId = cohort && number ? `${cohort}-${number}` : null;
    const grade = number ? Number(number.slice(0, 1)) : NaN;
    const legacyCandidates = new Set(smartCampusExternalIdCandidates({ uid, userId: platformUserId }));
    const candidateIds = schoolUsers.filter(user => legacyCandidates.has(normalizeId(user.external_id)))
      .map(user => user.id).sort();
    const excluded = decision.excludedLocalUserIds;
    const reviewedIds = Array.isArray(excluded) ? [...excluded].sort() : [];
    const generatedId = `sc-${registrationId}`;
    const candidateReviewMissing = candidateIds.length !== reviewedIds.length ||
      candidateIds.some((id, candidateIndex) => id !== reviewedIds[candidateIndex]) ||
      (candidateIds.length > 0 && !decision.distinctPersonEvidenceRef?.trim() &&
        !decision.retiredAccountEvidenceRef?.trim());
    const invalidName = typeof row[3] !== "string" || !row[3].trim();
    // 교직원은 학년·학번 대신 중앙 등록 세대로 새 외부 ID를 만든다.
    // 기존 PK를 연결할지 새 PK를 만들지는 비공개 개별 결정으로만 정한다.
    if (role === "TEACHER" || role === "ADMIN") {
      if (invalidName || candidateReviewMissing ||
          schoolUsers.some(user => normalizeId(user.external_id) === normalizeId(generatedId))) {
        counts.collision++; continue;
      }
      counts.create++;
      actions.push({ kind: "create", platformUserId, registrationId: String(registrationId),
        externalId: generatedId, name: row[3] as string, role });
      continue;
    }
    // 특수 형식 학생에게 학년을 추정해 넣지 않는다. 등록 UUID 기반 새 앱 PK만
    // 발급하고 기존 이름·학번과 닮은 앱 계정의 기록은 승계하지 않는다.
    const specialFormat = !cohort || !number || grade < 1 || grade > 3;
    if (role === "STUDENT" && specialFormat && decision.specialStudentEvidenceRef?.trim()) {
      if (invalidName || candidateReviewMissing ||
          schoolUsers.some(user => normalizeId(user.external_id) === normalizeId(generatedId))) {
        counts.collision++; continue;
      }
      counts.create++;
      actions.push({ kind: "create", platformUserId, registrationId: String(registrationId),
        externalId: generatedId, name: row[3] as string, role });
      continue;
    }
    if (role !== "STUDENT" || !number || numbers.get(number) !== 1 || !externalId ||
        (uid.includes("-") && !uid.startsWith(`${cohort}-`)) || grade < 1 || grade > 3 ||
        invalidName ||
        schoolUsers.some(user => normalizeId(user.external_id) === normalizeId(externalId)) ||
        candidateReviewMissing) {
      counts.collision++; continue;
    }
    counts.create++;
    actions.push({ kind: "create", platformUserId, registrationId: String(registrationId),
      externalId, name: row[3] as string, role, officialGrade: grade });
  }
  return { mode: "plan-only" as const, applied: false as const, counts,
    extraneousDecisions, actions, structurallyReady: counts.missingDecision === 0 &&
      counts.invalidDecision === 0 && counts.collision === 0 && counts.hold === 0 &&
      extraneousDecisions === 0 };
}

export function publicProvisioningSummary(plan: ReturnType<typeof planLearnCraftProvisioning>) {
  // actions에는 학생 식별자가 있으므로 로그·채팅에는 집계만 사용한다.
  return { mode: plan.mode, applied: false, counts: plan.counts,
    extraneousDecisions: plan.extraneousDecisions,
    structurallyReady: plan.structurallyReady,
    note: "구조 검증은 동일인 확인이나 운영 승인과 다릅니다." };
}

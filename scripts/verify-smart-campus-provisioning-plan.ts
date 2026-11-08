import assert from "node:assert/strict";
import test from "node:test";
import { planLearnCraftProvisioning, publicProvisioningSummary } from
  "./plan-smart-campus-provisioning";
import type { LocalUser, RosterSnapshot } from "./audit-smart-campus-bindings";

const schoolId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const registrationId = "11111111-1111-4111-8111-111111111111";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const account = "24-10415";
const headers = ["구글 계정", "ID", "비밀번호", "이름", "2026 학번", "권한", "상태",
  "가입일시", "비번변경필요", "업무담당자앱"];
const snapshot = (uid = "24-10201"): RosterSnapshot => ({ headers,
  rows: [["", account, "PRIVATE_PASSWORD", "합성 학생", uid, "학생", "Active"]],
  registrationIds: [registrationId] });
const reviewed = (kind: "existing" | "create") => ({ platformUserId: account,
  registrationId, kind, reviewedBy: "합성 검토자", evidenceRef: "비공개 합성 근거" });
const user: LocalUser = { id: userId, school_id: schoolId, external_id: "10201",
  name: "합성 학생", role: "STUDENT", active: true };

test("검토된 기존 PK를 유지하고 공개 집계에는 개인 값을 내보내지 않는다", () => {
  const plan = planLearnCraftProvisioning(snapshot(), schoolId, [user],
    [{ ...reviewed("existing"), localUserId: userId }]);
  assert.equal(plan.structurallyReady, true);
  assert.equal(plan.actions[0].localUserId, userId);
  assert.doesNotMatch(JSON.stringify(publicProvisioningSummary(plan)),
    /s_school|10201|합성 학생|PRIVATE_PASSWORD|bbbbbbbb/);
});

test("신규 외부 ID는 입학연도와 현재 학번을 묶고 기존 행을 쓰지 않는다", () => {
  const plan = planLearnCraftProvisioning(snapshot(), schoolId, [], [reviewed("create")]);
  assert.equal(plan.structurallyReady, true);
  assert.equal(plan.actions[0].externalId, "24-10201");
  assert.equal(plan.actions[0].officialGrade, 1);
  assert.equal(plan.applied, false);
});

test("기존 외부 ID·등록 세대 충돌과 검토 근거 누락은 신규 생성 차단", () => {
  const found = planLearnCraftProvisioning(snapshot(), schoolId, [user], [reviewed("create")]);
  assert.equal(found.counts.collision, 1);
  const unreviewed = planLearnCraftProvisioning(snapshot(), schoolId, [],
    [{ ...reviewed("create"), evidenceRef: "" }]);
  assert.equal(unreviewed.counts.invalidDecision, 1);
  const changed = planLearnCraftProvisioning(snapshot(), schoolId, [user],
    [{ ...reviewed("existing"), localUserId: userId }], [{ school_id: schoolId,
      platform_user_id: account, registration_id: "22222222-2222-4222-8222-222222222222",
      user_id: userId }]);
  assert.equal(changed.counts.collision, 1);
});

test("과거 5자리 계정이 다른 사람임을 검토하면 기존 PK를 건드리지 않고 새 계정을 계획한다", () => {
  const oldAccount = { ...user, name: "합성 과거 사용자" };
  const approved = { ...reviewed("create"), excludedLocalUserIds: [userId],
    distinctPersonEvidenceRef: "비공개 세대별 신원 검토의 합성 항목" };
  const plan = planLearnCraftProvisioning(snapshot(), schoolId, [oldAccount], [approved]);
  assert.equal(plan.structurallyReady, true);
  assert.equal(plan.actions[0].kind, "create");
  assert.equal(plan.actions[0].externalId, "24-10201");
  assert.equal(planLearnCraftProvisioning(snapshot(), schoolId, [oldAccount],
    [{ ...approved, distinctPersonEvidenceRef: "",
      retiredAccountEvidenceRef: "과거 계정 정리 결정의 합성 근거" }]).structurallyReady, true);
  assert.equal(planLearnCraftProvisioning(snapshot(), schoolId, [oldAccount],
    [{ ...approved, distinctPersonEvidenceRef: "" }]).structurallyReady, false);
  const sameExternalId = { ...oldAccount, external_id: "24-10201" };
  assert.equal(planLearnCraftProvisioning(snapshot(), schoolId, [sameExternalId],
    [{ ...approved, excludedLocalUserIds: [] }]).structurallyReady, false);
});

test("명부 입학연도 불일치와 잘못된 머리글은 실패 폐쇄한다", () => {
  const mismatched = planLearnCraftProvisioning(snapshot("25-10201"), schoolId, [],
    [reviewed("create")]);
  assert.equal(mismatched.counts.collision, 1);
  assert.throws(() => planLearnCraftProvisioning({ ...snapshot(), headers: [] }, schoolId,
    [], [reviewed("create")]), /invalid_provisioning_input/);
});

test("승인된 특수 형식 학생은 등록 UUID 기반의 새 앱 계정을 받는다", () => {
  const exceptional: RosterSnapshot = { ...snapshot("7001"),
    rows: [["", "합성-특수", "PRIVATE_PASSWORD", "합성 학생", "7001", "학생", "Active"]] };
  const decision = { ...reviewed("create"), platformUserId: "합성-특수" };
  assert.equal(planLearnCraftProvisioning(exceptional, schoolId, [], [decision]).structurallyReady, false);
  const plan = planLearnCraftProvisioning(exceptional, schoolId, [], [{ ...decision,
    specialStudentEvidenceRef: "비공개 특수 학생 승인" }]);
  assert.equal(plan.structurallyReady, true);
  assert.equal(plan.actions[0].externalId, `sc-${registrationId}`);
  assert.equal(plan.actions[0].officialGrade, undefined);
});

test("다른 학교 사용자는 거부하고 검토된 연결의 중앙 권한 변경은 허용한다", () => {
  const wrongSchool = planLearnCraftProvisioning(snapshot(), schoolId,
    [{ ...user, school_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }],
    [{ ...reviewed("existing"), localUserId: userId }]);
  assert.equal(wrongSchool.counts.collision, 1);
  const wrongRole = planLearnCraftProvisioning(snapshot(), schoolId,
    [{ ...user, role: "TEACHER" }], [{ ...reviewed("existing"), localUserId: userId }],
    [{ school_id: schoolId, platform_user_id: account,
      registration_id: registrationId, user_id: userId }]);
  assert.equal(wrongRole.counts.collision, 0);
  assert.equal(wrongRole.counts.existingBinding, 1);
  assert.equal(wrongRole.structurallyReady, true);
  const reviewedRoleChange = planLearnCraftProvisioning(snapshot(), schoolId,
    [{ ...user, role: "TEACHER" }], [{ ...reviewed("existing"), localUserId: userId }]);
  assert.equal(reviewedRoleChange.counts.existing, 1);
  assert.equal(reviewedRoleChange.structurallyReady, true);
});

test("교사는 E열 학번이 달라도 검토된 B열 ID와 앱 PK로 연결한다", () => {
  const teacherId = "합성교사ID";
  const teacherSnapshot: RosterSnapshot = { ...snapshot("T-015"),
    rows: [["", teacherId, "PRIVATE_PASSWORD", "합성 교사", "T-015", "교사", "Active"]] };
  const teacher = { ...user, external_id: teacherId, name: "합성 교사", role: "TEACHER" };
  const plan = planLearnCraftProvisioning(teacherSnapshot, schoolId, [teacher],
    [{ ...reviewed("existing"), platformUserId: teacherId, localUserId: userId }]);
  assert.equal(plan.structurallyReady, true);
  assert.equal(plan.actions[0].localUserId, userId);
  assert.equal(plan.actions[0].kind, "existing");
});

test("검토된 교사·관리자는 학번 없이 SSO 전용 계정을 계획하고 기존 PK 충돌은 보류한다", () => {
  for (const role of ["교사", "관리자"]) {
    const staffId = `합성${role}ID`;
    const staff: RosterSnapshot = { ...snapshot(""),
      rows: [["", staffId, "PRIVATE_PASSWORD", `합성 ${role}`, "", role, "Active"]] };
    const decision = { ...reviewed("create"), platformUserId: staffId };
    const plan = planLearnCraftProvisioning(staff, schoolId, [], [decision]);
    assert.equal(plan.structurallyReady, true);
    assert.equal(plan.actions[0].externalId, `sc-${registrationId}`);
    assert.equal(plan.actions[0].officialGrade, undefined);
    assert.equal(plan.actions[0].role, role === "교사" ? "TEACHER" : "ADMIN");
    const old = { ...user, external_id: staffId, role: "TEACHER" };
    assert.equal(planLearnCraftProvisioning(staff, schoolId, [old], [decision]).structurallyReady,
      false);
    assert.equal(planLearnCraftProvisioning(staff, schoolId, [old], [{ ...decision,
      excludedLocalUserIds: [userId], retiredAccountEvidenceRef: "비공개 퇴역 결정" }])
      .structurallyReady, true);
  }
});

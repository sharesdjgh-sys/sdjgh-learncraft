import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { auditBindings, readPrivateSnapshotFromStdin, summarizeRecordCounts,
  type Binding, type LocalUser, type RosterSnapshot } from
  "./audit-smart-campus-bindings";

const schoolId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const firstRegistration = "11111111-1111-4111-8111-111111111111";
const secondRegistration = "22222222-2222-4222-8222-222222222222";
const firstUser = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const row = (id: string, name: string, uid: string, role = "학생") =>
  ["", id, "PRIVATE_PASSWORD", name, uid, role, "Active", "", "", ""];
const snapshot = (rows: RosterSnapshot["rows"], registrations: string[]): RosterSnapshot => ({
  headers: ["구글 계정", "ID", "비밀번호", "이름", "2026 학번", "권한", "상태",
    "가입일시", "비번변경필요", "업무담당자앱"],
  rows, registrationIds: registrations,
});
const local: LocalUser = { id: firstUser, school_id: schoolId, external_id: "10101",
  name: "합성 학생", role: "STUDENT", active: true };
const binding: Binding = { school_id: schoolId, platform_user_id: "first@example.test",
  registration_id: firstRegistration, user_id: firstUser };

test("GPG 파이프 입력은 평문 파일 없이 받고 빈 입력·용량 초과는 차단한다", async () => {
  const input = snapshot([row("first@example.test", "합성 학생", "24-10101")],
    [firstRegistration]);
  assert.deepEqual(await readPrivateSnapshotFromStdin(
    Readable.from([Buffer.from(JSON.stringify(input))])), input);
  await assert.rejects(readPrivateSnapshotFromStdin(Readable.from([])), /invalid_audit_input/);
  await assert.rejects(readPrivateSnapshotFromStdin(
    Readable.from([Buffer.alloc(20 * 1024 * 1024 + 1)])), /invalid_audit_input/);
});

test("기록 집계는 연결 행이 없는 소유 계정 건수만 추가하고 식별값을 숨긴다", () => {
  const result = summarizeRecordCounts([
    { source: "bookmarks", user_id: firstUser, record_count: 3 },
    { source: "bookmarks", user_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", record_count: 2 },
    { source: "feedback", user_id: firstUser, record_count: 1 },
  ], [binding]);
  assert.deepEqual(result.bookmarks, { totalRecords: 5, holderAccounts: 2,
    recordsWithoutBindingRow: 2, holdersWithoutBindingRow: 1 });
  assert.equal(result.feedback.recordsWithoutBindingRow, 0);
  assert.equal(result.learningReports.totalRecords, 0);
  assert.doesNotMatch(JSON.stringify(result), /bbbbbbbb|cccccccc|user_id/);
  assert.throws(() => summarizeRecordCounts([
    { source: "bookmarks", user_id: firstUser, record_count: 1 },
    { source: "bookmarks", user_id: firstUser, record_count: 1 },
  ], []), /unexpected_database_schema/);
});

test("다른 입학 기수의 5자리 충돌을 집계하고 개인 값을 출력하지 않는다", () => {
  const result = auditBindings(snapshot([
    row("first@example.test", "합성 학생", "24-10101"),
    row("second@example.test", "다른 학생", "25-10101"),
  ], [firstRegistration, secondRegistration]), schoolId, [local], [binding], true);
  assert.equal(result.counts.activeStudentRows, 2);
  assert.equal(result.counts.centralFiveDigitCollisionRows, 2);
  assert.equal(result.counts.oneLegacyCandidateRows, 2);
  assert.equal(result.counts.exactBindings, 1);
  assert.equal(result.counts.unboundRows, 1);
  assert.ok(result.blockers.includes("legacy_candidate_collision_review"));
  assert.ok(result.blockers.includes("private_manual_binding_review"));
  assert.doesNotMatch(JSON.stringify(result),
    /first@example|second@example|합성 학생|다른 학생|10101|PRIVATE_PASSWORD|bbbbbbbb/);
});

test("후보가 둘이거나 등록 UUID가 바뀌면 정확 연결로 세지 않는다", () => {
  const secondLocal: LocalUser = { ...local, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    external_id: "24-10101" };
  const ambiguous = auditBindings(snapshot([
    row("first@example.test", "합성 학생", "24-10101"),
  ], [firstRegistration]), schoolId, [local, secondLocal], [], false);
  assert.equal(ambiguous.counts.multipleLegacyCandidateRows, 1);
  assert.equal(ambiguous.counts.exactBindings, 0);
  assert.ok(ambiguous.blockers.includes("binding_table_missing"));

  const stale = auditBindings(snapshot([
    row("first@example.test", "합성 학생", "24-10101"),
  ], [secondRegistration]), schoolId, [local], [binding], true);
  assert.equal(stale.counts.staleOrConflictingBindings, 1);
  assert.equal(stale.counts.exactBindings, 0);
  assert.ok(stale.blockers.includes("binding_conflict_review"));
});

test("교직원과 비활성 로컬 계정도 바인딩 감사에 포함한다", () => {
  const teacher: LocalUser = { ...local, role: "TEACHER", active: false, external_id: "staff@example.test" };
  const result = auditBindings(snapshot([
    row("staff@example.test", "합성 교사", "", "교사"),
  ], [firstRegistration]), schoolId, [teacher], [{ ...binding,
    platform_user_id: "staff@example.test" }], true);
  assert.equal(result.counts.activeStaffRows, 1);
  assert.equal(result.counts.invalidStudentUidRows, 0);
  assert.equal(result.counts.exactBindings, 0);
  assert.equal(result.counts.staleOrConflictingBindings, 1);
});

test("E열 단독 5자리 학번과 연도 접두 학번을 같은 충돌 집합으로 센다", () => {
  const result = auditBindings(snapshot([
    row("first@example.test", "합성 학생", "10101"),
    row("second@example.test", "다른 학생", "25-10101"),
  ], [firstRegistration, secondRegistration]), schoolId, [local], [], true);
  assert.equal(result.counts.invalidStudentUidRows, 0);
  assert.equal(result.counts.centralFiveDigitCollisionRows, 2);
  assert.equal(result.counts.oneLegacyCandidateRows, 2);
});

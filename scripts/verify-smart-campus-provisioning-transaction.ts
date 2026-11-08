import assert from "node:assert/strict";
import test from "node:test";
import { applyLearnCraftProvisioning } from "./apply-smart-campus-provisioning";
import { planLearnCraftProvisioning, rosterFingerprint } from "./plan-smart-campus-provisioning";
import type { LocalUser, RosterSnapshot } from "./audit-smart-campus-bindings";

const schoolId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const existingAccount = "24-10101";
const newAccount = "24-10415";
const existingUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const newUserId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const snapshot: RosterSnapshot = { headers: ["구글 계정", "ID", "비밀번호", "이름",
  "2026 학번", "권한", "상태", "가입일시", "비번변경필요", "업무담당자앱"],
rows: [
  ["", existingAccount, "PRIVATE", "합성 기존", "24-10101", "학생", "Active"],
  ["", newAccount, "PRIVATE", "합성 신규", "24-10201", "학생", "Active"],
], registrationIds: [first, second] };
const decisions = [
  { platformUserId: existingAccount, registrationId: first, kind: "existing" as const,
    localUserId: existingUserId, reviewedBy: "합성 검토자", evidenceRef: "비공개 합성 근거" },
  { platformUserId: newAccount, registrationId: second, kind: "create" as const,
    reviewedBy: "합성 검토자", evidenceRef: "비공개 합성 근거" },
];
const loadLatestRoster = async () => snapshot;
const fingerprint = rosterFingerprint(snapshot);
const reviewedLocalUsers: LocalUser[] = [{ id: existingUserId, school_id: schoolId,
  external_id: "10101", name: "합성 기존", role: "STUDENT", active: true }];

function fakeClient(failSecondBinding = false, currentUsers: LocalUser[] = reviewedLocalUsers) {
  const calls: { sql: string; params?: unknown[] }[] = [];
  let bindings = 0;
  async function runQuery(sql: string, params?: unknown[]) {
    calls.push({ sql, params });
    if (sql.startsWith("BEGIN") || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
    if (sql.includes("FROM public.schools")) return { rows: [{ id: schoolId }] };
    if (sql.includes("FROM public.users")) return { rows: currentUsers };
    if (sql.includes("FROM public.smart_campus_user_bindings")) return { rows: [] };
    if (sql.includes("INSERT INTO public.users")) return { rows: [{ id: newUserId }] };
    if (sql.includes("INSERT INTO public.smart_campus_user_bindings")) {
      bindings++;
      if (failSecondBinding && bindings === 2) throw Error("synthetic_unique_conflict");
      return { rows: [{ user_id: params?.[3] }] };
    }
    throw Error("unexpected_sql");
  }
  const pool = { calls, released: 0,
    async connect() { return { query: runQuery,
      release() { pool.released++; } }; },
    async query() { throw Error("pooled_query_used"); } };
  return pool;
}

test("기존 PK 유지와 신규 사용자·바인딩 삽입이 한 트랜잭션에서 끝난다", async () => {
  const client = fakeClient();
  const result = await applyLearnCraftProvisioning(client, { schoolId,
    schoolName: "합성 학교", expectedRosterFingerprint: fingerprint, snapshot, decisions, reviewedLocalUsers, reviewedBindings: [], loadLatestRoster });
  assert.equal(result.applied, true);
  assert.equal(result.createdUsers, 1);
  assert.equal(result.insertedBindings, 2);
  assert.equal(client.calls.at(-1)?.sql, "COMMIT");
  assert.equal(client.released, 1);
  assert.equal(client.calls.filter(call => call.sql.includes("INSERT INTO public.users")).length, 1);
  assert.ok(client.calls.every(call => !/^\s*(?:UPDATE|DELETE)\b/.test(call.sql)));
  assert.doesNotMatch(JSON.stringify(result), /s_school|10101|합성/);
});

test("두 번째 바인딩 실패 시 기존 연결과 새 사용자 모두 롤백한다", async () => {
  const client = fakeClient(true);
  await assert.rejects(applyLearnCraftProvisioning(client, { schoolId,
    schoolName: "합성 학교", expectedRosterFingerprint: fingerprint, snapshot, decisions, reviewedLocalUsers, reviewedBindings: [], loadLatestRoster }), /synthetic_unique_conflict/);
  assert.equal(client.calls.at(-1)?.sql, "ROLLBACK");
  assert.equal(client.released, 1);
  assert.equal(client.calls.some(call => call.sql === "COMMIT"), false);
});

test("검토 뒤 등록 UUID가 달라지면 새 사용자와 연결을 삽입하지 않는다", async () => {
  const client = fakeClient();
  const newer = { ...snapshot, registrationIds: [second, first] };
  await assert.rejects(applyLearnCraftProvisioning(client, { schoolId,
    schoolName: "합성 학교", expectedRosterFingerprint: fingerprint, snapshot, decisions, reviewedLocalUsers, reviewedBindings: [],
    loadLatestRoster: async () => newer }), /roster_snapshot_stale/);
  assert.equal(client.calls.at(-1)?.sql, "ROLLBACK");
  assert.equal(client.released, 1);
  assert.equal(client.calls.some(call => call.sql.includes("INSERT INTO")), false);
});

test("최신 명부 읽기 함수가 없으면 거래를 시작하지 않는다", async () => {
  const client = fakeClient();
  await assert.rejects(applyLearnCraftProvisioning(client, { schoolId,
    schoolName: "합성 학교", expectedRosterFingerprint: fingerprint, snapshot, decisions, reviewedLocalUsers, reviewedBindings: [],
    loadLatestRoster: undefined as never }), /invalid_provisioning_input/);
  assert.equal(client.calls.length, 0);
  assert.equal(client.released, 0);
});

test("query만 있는 객체를 넘기면 거래를 시작하지 않는다", async () => {
  const client = fakeClient();
  await assert.rejects(applyLearnCraftProvisioning({
    query: client.query.bind(client),
  } as never, { schoolId, schoolName: "합성 학교", expectedRosterFingerprint: fingerprint, snapshot, decisions, reviewedLocalUsers, reviewedBindings: [],
    loadLatestRoster }), /invalid_provisioning_input/);
  assert.equal(client.calls.length, 0);
});


test("검토 후 앱 DB 사용자가 바뀌면 새 사용자와 바인딩을 삽입하지 않는다", async () => {
  const client = fakeClient(false, [{ ...reviewedLocalUsers[0], external_id: "reassigned" }]);
  await assert.rejects(applyLearnCraftProvisioning(client, { schoolId,
    schoolName: "합성 학교", expectedRosterFingerprint: fingerprint, snapshot, decisions, reviewedLocalUsers, reviewedBindings: [],
    loadLatestRoster }), /database_snapshot_stale/);
  assert.equal(client.calls.at(-1)?.sql, "ROLLBACK");
  assert.equal(client.calls.some(call => call.sql.includes("INSERT INTO")), false);
});


// ---- 11월 8일 실패 회귀 시험: 명부 거르기·결정 누락·명시적 거부 ----
const staffSnapshot: RosterSnapshot = { headers: snapshot.headers, rows: [
  ...snapshot.rows,
  ["", "합성교사ID", "PRIVATE", "합성 교사", "T-015", "교사", "Active"],
  ["", "합성퇴직ID", "PRIVATE", "합성 퇴직", "T-099", "교사", "Inactive"],
], registrationIds: [first, second, "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444"] };

test("결정 없는 활성 교직원이 있으면 계획이 거부되고 커버리지 부족을 알린다", () => {
  const plan = planLearnCraftProvisioning(staffSnapshot, schoolId, reviewedLocalUsers, decisions);
  assert.equal(plan.counts.missingDecision, 1);
  assert.deepEqual(plan.coverage, { active: 3, decided: 2, complete: false });
  assert.equal(plan.structurallyReady, false);
  const deny = { platformUserId: "합성교사ID", registrationId: "33333333-3333-4333-8333-333333333333",
    kind: "deny" as const, reviewedBy: "합성 검토자", evidenceRef: "비공개 합성 근거" };
  const denied = planLearnCraftProvisioning(staffSnapshot, schoolId, reviewedLocalUsers, [...decisions, deny]);
  assert.equal(denied.counts.deny, 1);
  assert.deepEqual(denied.coverage, { active: 3, decided: 3, complete: true });
  assert.equal(denied.structurallyReady, true);
  assert.equal(denied.actions.length, 2);
  const unreviewed = planLearnCraftProvisioning(staffSnapshot, schoolId, reviewedLocalUsers,
    [...decisions, { ...deny, evidenceRef: "" }]);
  assert.equal(unreviewed.counts.invalidDecision, 1);
});

test("명부 지문은 C열과 무관하고 행 거르기에는 달라진다", () => {
  const otherSecret = { ...staffSnapshot,
    rows: staffSnapshot.rows.map(row => row.map((cell, column) => column === 2 ? "OTHER" : cell)) };
  assert.equal(rosterFingerprint(otherSecret), rosterFingerprint(staffSnapshot));
  const filtered = { headers: snapshot.headers, rows: staffSnapshot.rows.slice(0, 2),
    registrationIds: staffSnapshot.registrationIds.slice(0, 2) };
  assert.notEqual(rosterFingerprint(filtered), rosterFingerprint(staffSnapshot));
});

test("결정 행만 남긴 명부는 DB 연결 전에 거부하고, 전체 명부의 결정 누락은 롤백한다", async () => {
  const filtered = { headers: snapshot.headers, rows: staffSnapshot.rows.slice(0, 2),
    registrationIds: staffSnapshot.registrationIds.slice(0, 2) };
  const client = fakeClient();
  await assert.rejects(applyLearnCraftProvisioning(client, { schoolId, schoolName: "합성 학교",
    expectedRosterFingerprint: rosterFingerprint(staffSnapshot), snapshot: filtered, decisions,
    reviewedLocalUsers, reviewedBindings: [], loadLatestRoster: async () => filtered }),
  /roster_fingerprint_mismatch/);
  assert.equal(client.calls.length, 0);
  assert.equal(client.released, 0);
  const full = fakeClient();
  await assert.rejects(applyLearnCraftProvisioning(full, { schoolId, schoolName: "합성 학교",
    expectedRosterFingerprint: rosterFingerprint(staffSnapshot), snapshot: staffSnapshot, decisions,
    reviewedLocalUsers, reviewedBindings: [], loadLatestRoster: async () => staffSnapshot }),
  /provisioning_coverage_incomplete/);
  assert.equal(full.calls.at(-1)?.sql, "ROLLBACK");
  assert.equal(full.calls.some(call => call.sql.includes("INSERT INTO")), false);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  inferOfficialGrade,
  mapSmartCampusRole,
  primarySmartCampusExternalId,
  smartCampusExternalIdCandidates,
} from "../src/lib/smart-campus-identity";
import { matchesCurrentSmartCampusSessionBinding, matchesSmartCampusBinding, resolveLinkedRole,
  selectLegacySmartCampusAccount } from "../src/lib/smart-campus-binding";
import { hasPossibleOwnerOverlap, planLearnCraftAutoProvision } from "../src/lib/smart-campus-provisioning";
import { nativeAccountAllowed } from "../src/lib/smart-campus-native-policy";
import { verifyCurrentSmartCampusSession, verifyPlatformCredential } from "../src/lib/smart-campus-proof";

assert.equal(mapSmartCampusRole("학생"), "STUDENT");
assert.equal(mapSmartCampusRole("교사"), "TEACHER");
assert.equal(mapSmartCampusRole("업무담당자"), "TEACHER");
assert.equal(mapSmartCampusRole("관리자"), "ADMIN");
assert.equal(mapSmartCampusRole("외부사용자"), null);

const student = { uid: "26-10101", userId: "student@example" };
assert.equal(primarySmartCampusExternalId(student), "10101");
assert.deepEqual(smartCampusExternalIdCandidates(student), ["10101", "26-10101", "student@example"]);
assert.equal(inferOfficialGrade("10101"), 1);
assert.equal(inferOfficialGrade("20501"), 2);
assert.equal(inferOfficialGrade("2026-20501"), 2);
assert.equal(inferOfficialGrade("30101"), 3);
assert.equal(inferOfficialGrade("teacher"), null);

// 현재 5자리 학번이 같아도 입학연도 또는 등록 세대가 다르면 학습 계정을 열 수 없다.
const bound = { schoolId: "fictional-school", platformUserId: "s_school_24-10101",
  registrationId: "11111111-1111-4111-8111-111111111111", role: "STUDENT", active: true };
assert.equal(matchesSmartCampusBinding(bound, { ...bound }), true);
assert.equal(matchesSmartCampusBinding(bound, { ...bound, platformUserId: "s_school_27-10101" }), false);
assert.equal(matchesSmartCampusBinding(bound, { ...bound,
  registrationId: "22222222-2222-4222-8222-222222222222" }), false);
// 중앙 권한이 바뀌어도 같은 등록 세대의 명시적 연결은 유지한다.
const changedCentralRole = { ...bound, role: "TEACHER" };
assert.equal(matchesSmartCampusBinding(bound, changedCentralRole), true);
assert.equal(matchesSmartCampusBinding({ ...bound, active: false }, bound), false);

// 이미 발급된 쿠키는 로그인 뒤 연결 해제·PK 이동·역할 변경을 각각 감지해야 한다.
const currentBinding = { ...bound, userId: "fictional-app-pk" };
const expectedSession = { schoolId: bound.schoolId, platformUserId: bound.platformUserId,
  registrationId: bound.registrationId, userId: currentBinding.userId,
  role: "STUDENT", platformRole: "학생" };
assert.equal(matchesCurrentSmartCampusSessionBinding(currentBinding, expectedSession), true);
assert.equal(matchesCurrentSmartCampusSessionBinding(undefined, expectedSession), false);
assert.equal(matchesCurrentSmartCampusSessionBinding({ ...currentBinding,
  userId: "different-app-pk" }, expectedSession), false);
assert.equal(matchesCurrentSmartCampusSessionBinding({ ...currentBinding,
  registrationId: "22222222-2222-4222-8222-222222222222" }, expectedSession), false);
assert.equal(matchesCurrentSmartCampusSessionBinding({ ...currentBinding,
  role: "ADMIN" }, expectedSession), false);
assert.equal(matchesCurrentSmartCampusSessionBinding({ ...currentBinding,
  active: false }, expectedSession), false);
assert.equal(matchesCurrentSmartCampusSessionBinding(currentBinding,
  { ...expectedSession, role: "ADMIN" }), false);

// 교직원 앱 역할 유지: 중앙 학생은 STUDENT, 중앙 교직원은 앱 TEACHER/ADMIN을 그대로 둔다.
assert.equal(resolveLinkedRole("ADMIN", "TEACHER"), "ADMIN");
assert.equal(resolveLinkedRole("TEACHER", "ADMIN"), "TEACHER");
assert.equal(resolveLinkedRole("ADMIN", "STUDENT"), "STUDENT");
assert.equal(resolveLinkedRole("STUDENT", "TEACHER"), "TEACHER");
// 앱 ADMIN 계정이 중앙 '교사'에 연결돼 있어도 기존 세션은 매 요청 폐기되지 않는다.
const staffBinding = { ...currentBinding, role: "ADMIN" };
const staffSession = { ...expectedSession, role: "ADMIN", platformRole: "교사" };
assert.equal(matchesCurrentSmartCampusSessionBinding(staffBinding, staffSession), true);
// 중앙에서 학생으로 바뀌면 ADMIN 세션은 더 쓸 수 없다(다음 로그인에서 STUDENT로 맞춘다).
assert.equal(matchesCurrentSmartCampusSessionBinding(staffBinding, { ...staffSession, platformRole: "학생" }), false);
// 앱 역할과 세션 역할이 다르면(역할 변경 후 옛 쿠키) 거부한다.
assert.equal(matchesCurrentSmartCampusSessionBinding({ ...staffBinding, role: "TEACHER" }, staffSession), false);

// 안전한 자동 생성 계획: 계획기 create와 같은 외부 ID를 쓰고 특수 형식 학생은 만들지 않는다.
const registration = "77777777-7777-4777-8777-777777777777";
const freshman = planLearnCraftAutoProvision({ userId: "27-10101", uid: "27-10101", name: "가상 신입생",
  registrationId: registration }, "STUDENT");
assert.equal(freshman.kind, "create");
if (freshman.kind === "create") {
  assert.equal(freshman.account.externalId, "27-10101");
  assert.equal(freshman.account.officialGrade, 1);
  assert.deepEqual([...freshman.keys].sort(), ["10101", "27-10101"]);
  // 같은 5자리 계정이 연결 없이 남아 있으면 이 사람의 옛 계정일 수 있어 만들지 않는다.
  assert.equal(hasPossibleOwnerOverlap(freshman, [{ id: "a", externalId: "10101", bound: false }]), true);
  // 이미 다른 중앙 계정에 연결된 계정은 겹침이 아니다.
  assert.equal(hasPossibleOwnerOverlap(freshman, [{ id: "a", externalId: "10101", bound: true }]), false);
}
assert.equal(planLearnCraftAutoProvision({ userId: "special-id", uid: "90101", name: "가상 특수",
  registrationId: registration }, "STUDENT").kind, "review");
assert.equal(planLearnCraftAutoProvision({ userId: "27-10101", uid: "26-10101", name: "가상 다른 기수",
  registrationId: registration }, "STUDENT").kind, "review");
const newTeacher = planLearnCraftAutoProvision({ userId: "teacher-b", uid: "T-007", name: "가상 교사",
  registrationId: registration }, "TEACHER");
assert.equal(newTeacher.kind === "create" && newTeacher.account.externalId, `sc-${registration}`);
assert.equal(newTeacher.kind === "create" && newTeacher.account.officialGrade, null);

// 같은 중앙 식별자가 앱 계정 둘을 가리키거나 앱 역할이 다르면 옛 SSO에서도 거부한다.
const legacyTeacher = { id: "fictional-teacher", externalId: "teacher-code", role: "TEACHER" };
const legacyAdmin = { id: "fictional-admin", externalId: "admin-code", role: "ADMIN" };
assert.deepEqual(selectLegacySmartCampusAccount(["teacher-code"], [legacyTeacher], "TEACHER"),
  { kind: "matched", account: legacyTeacher });
assert.deepEqual(selectLegacySmartCampusAccount(["missing"], [legacyTeacher], "TEACHER"),
  { kind: "none" });
assert.deepEqual(selectLegacySmartCampusAccount(["admin-code"], [legacyAdmin], "TEACHER"),
  { kind: "role_mismatch" });
assert.deepEqual(selectLegacySmartCampusAccount(["teacher-code", "admin-code"],
  [legacyTeacher, legacyAdmin], "TEACHER"), { kind: "ambiguous" });

async function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const bridge = await readFile(`${root}/src/components/auth/smart-campus-sso.tsx`, "utf8");
  const route = await readFile(`${root}/src/app/api/auth/sso/route.ts`, "utf8");
  const config = await readFile(`${root}/next.config.ts`, "utf8");
  const auth = await readFile(`${root}/src/lib/auth.ts`, "utf8");
  const guard = await readFile(`${root}/src/components/auth/sso-session-guard.tsx`, "utf8");
  const resolver = await readFile(`${root}/src/lib/smart-campus-sso.ts`, "utf8");
  const migration = await readFile(`${root}/drizzle/0018_violet_puff_adder.sql`, "utf8");

  assert.match(bridge, /event\.origin !== parentOrigin/);
  assert.match(bridge, /event\.source !== window\.parent/);
  assert.match(bridge, /postMessage\(\{ type: "sso:ready" \}, parentOrigin\)/);
  assert.doesNotMatch(bridge, /\?token=/);
  assert.match(route, /verifySmartCampusToken/);
  assert.match(route, /createSession\(user, \{ embedded: true,/);
  assert.match(route, /platformUid: identity\.uid/);
  assert.match(config, /frame-ancestors https:\/\/platform\.sdjgh-ai\.kr/);
  assert.match(auth, /partitioned: embeddedCookie/);
  assert.match(auth, /jwtDecrypt\(token, secret\)/);
  assert.match(auth, /verifyCurrentSmartCampusSession/);
  assert.match(auth, /smartCampusUserBindings/);
  assert.match(resolver, /identity\.registrationId/);
  assert.match(resolver, /officialGrade = role === "STUDENT" \? inferOfficialGrade\(identity\.uid\) : null/);
  assert.match(resolver, /const linkedRole = resolveLinkedRole\(binding\.role, role\)/);
  assert.match(resolver, /set\(\{ name: identity\.name, role: linkedRole, officialGrade, lastLoginAt: now,/);
  assert.match(resolver, /BINDING_REVIEW_REQUIRED/);
  assert.match(resolver, /REGISTRATION_CHANGED/);
  assert.match(route, /smart_campus_sso_denied/);
  // 화면은 401(중앙 검증 실패)에만 sso:expired를 보낸다. 연결 문제(403)는 재로그인을 유도하지 않는다.
  assert.match(bridge, /if \(response\.status === 401\) window\.parent\.postMessage\(\{ type: "sso:expired" \}/);
  assert.match(migration, /UNIQUE INDEX "smart_campus_bindings_user_idx"/);
  assert.match(guard, /15_000/);

  const registrationId = "11111111-1111-4111-8111-111111111111";
  const issued = { valid: true, user: { userId: "fictional-b-id", uid: "24-10101", name: "가상 학생", role: "학생", registrationId },
    sessionProof: "fictional-app-proof" };
  const calls: Array<{ token: string; appId: string }> = [];
  const fetcher = (async (_url: string | URL | Request, options?: RequestInit) => {
    calls.push(JSON.parse(String(options?.body)));
    return Response.json(calls.length < 5 ? issued : { valid: false }, { status: calls.length < 5 ? 200 : 401 });
  }) as typeof fetch;
  const exchange = await verifyPlatformCredential("fictional-platform-jwt", "https://platform.example/verify", fetcher);
  assert.equal(exchange.sessionProof, "fictional-app-proof");
  assert.equal(await verifyCurrentSmartCampusSession(exchange.sessionProof!,
    { userId: "fictional-b-id", role: "학생", registrationId, uid: "24-10101" }, "https://platform.example/verify", fetcher), true);
  assert.equal(await verifyCurrentSmartCampusSession(exchange.sessionProof!,
    { userId: "fictional-b-id", role: "학생", registrationId, uid: "24-20101" },
    "https://platform.example/verify", fetcher), false);
  assert.equal(await verifyCurrentSmartCampusSession(exchange.sessionProof!,
    { userId: "fictional-b-id", role: "학생", registrationId: "22222222-2222-4222-8222-222222222222" },
    "https://platform.example/verify", fetcher), false);
  await assert.rejects(verifyCurrentSmartCampusSession(exchange.sessionProof!,
    { userId: "fictional-b-id", role: "학생", registrationId }, "https://platform.example/verify", fetcher),
  (error: unknown) => error instanceof Error && error.message === "INVALID_PLATFORM_TOKEN");
  assert.deepEqual(calls.map(call => call.appId), ["learncraft", "learncraft", "learncraft", "learncraft", "learncraft"]);
  assert.deepEqual(calls.map(call => call.token),
    ["fictional-platform-jwt", "fictional-app-proof", "fictional-app-proof", "fictional-app-proof", "fictional-app-proof"]);

  // 정책 OFF는 현재 접근을 유지하고, ON은 연결된 PK의 새 로그인·기존 세션을 함께 막는다.
  assert.equal(await nativeAccountAllowed("app-pk", "school", false, async () => true), true);
  assert.equal(await nativeAccountAllowed("app-pk", "school", true, async () => true), false);
  assert.equal(await nativeAccountAllowed("independent-pk", "school", true, async () => false), true);
  assert.equal(await nativeAccountAllowed("app-pk", "school", true,
    async () => { throw new Error("binding unavailable"); }), false);

  console.log("Smart Campus SSO mapping, proof revocation, cookie, and framing checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  inferOfficialGrade,
  mapSmartCampusRole,
  primarySmartCampusExternalId,
  smartCampusExternalIdCandidates,
} from "../src/lib/smart-campus-identity";
import { matchesCurrentSmartCampusSessionBinding, matchesSmartCampusBinding,
  selectLegacySmartCampusAccount } from "../src/lib/smart-campus-binding";
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
  assert.match(resolver, /set\(\{ name: identity\.name, role, officialGrade, lastLoginAt: now, updatedAt: now \}\)/);
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

import assert from "node:assert/strict";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { SignJWT } from "jose";
import type { SessionUser } from "../src/types";

async function main() {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../src/db");
  const { schools, users, accountCredentials } = await import("../src/db/schema");
  assert.ok(db);
  const origin = process.argv[2] ?? "http://localhost:3000";
  assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
  const schoolIds = [crypto.randomUUID(), crypto.randomUUID()];
  const adminIds = [crypto.randomUUID(), crypto.randomUUID()];
  const suffix = crypto.randomUUID().slice(0, 8);
  const teacherLogin = `검증선생님${suffix}`;
  const studentLogin = `1${Date.now().toString().slice(-10)}`;
  const teacherInput = { loginId: teacherLogin, name: "테스트 선생님", initialPassword: "test-teacher-pass" };
  const studentInput = { loginId: studentLogin, name: "테스트 학생", initialPassword: "test-student-pass" };
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "learncraft-local-development-secret-key");
  const admin = (i: number): SessionUser => ({ id: adminIds[i], schoolId: schoolIds[i], externalId: `test-admin-${suffix}-${i}`, name: "계정 검증 관리자", schoolName: "계정 검증 전용", role: "ADMIN", officialGrade: null, learningGrade: null });
  async function cookie(user: SessionUser) { return `learncraft_session=${await new SignJWT({ user }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(secret)}`; }
  async function request(path: string, session: string | null, method = "GET", body?: unknown) {
    return fetch(`${origin}${path}`, { method, headers: { "Content-Type": "application/json", ...(session ? { Cookie: session } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  async function login(loginId: string, password: string) {
    const response = await request("/api/auth/login", null, "POST", { loginId, password });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).redirectTo, "/learn");
    const session = response.headers.get("set-cookie")?.split(";")[0]; assert.ok(session); return session;
  }
  try {
    await db.insert(schools).values(schoolIds.map((id) => ({ id, name: "계정 기능 임시 검증 학교" })));
    await db.insert(users).values([admin(0), admin(1)].map(({ id, schoolId, externalId, name, role }) => ({ id, schoolId, externalId, name, role })));
    const adminCookie = await cookie(admin(0)), otherCookie = await cookie(admin(1));
    assert.equal((await request("/api/admin/accounts", null, "POST", studentInput)).status, 403);
    const studentResponse = await request("/api/admin/accounts", adminCookie, "POST", studentInput);
    assert.equal(studentResponse.status, 201, await studentResponse.clone().text());
    const studentAccount = (await studentResponse.json()).account;
    const teacherResponse = await request("/api/admin/teachers", adminCookie, "POST", { accounts: [teacherInput, { ...teacherInput, loginId: `${teacherLogin}2` }] });
    assert.equal(teacherResponse.status, 200, await teacherResponse.clone().text());
    assert.equal((await teacherResponse.json()).created, 2);
    const teacherList = await request(`/api/admin/teachers?q=${encodeURIComponent(teacherLogin)}`, adminCookie);
    const teacherAccounts = (await teacherList.json()).accounts;
    assert.equal(teacherAccounts.length, 2);
    const teacherAccount = teacherAccounts.find((item: { loginId: string }) => item.loginId === teacherLogin);
    assert.ok(teacherAccount);
    const teacherCookie = await login(teacherLogin, teacherInput.initialPassword);
    const studentCookie = await login(studentLogin, studentInput.initialPassword);
    for (const session of [teacherCookie, studentCookie]) {
      assert.equal((await request("/api/bookmarks", session)).status, 200);
      assert.equal((await request("/api/admin/accounts", session, "POST", studentInput)).status, 403);
      assert.equal((await request("/api/admin/teachers", session, "PATCH", { id: teacherAccount.id, active: false })).status, 403);
    }
    assert.equal((await request("/api/admin/accounts", otherCookie, "PATCH", { id: studentAccount.id, active: false })).status, 404);
    assert.equal((await request("/api/admin/accounts", adminCookie, "PATCH", { id: adminIds[0], active: false })).status, 404);
    assert.equal((await request("/api/admin/teachers", adminCookie, "PATCH", { id: studentAccount.id, active: false })).status, 404);
    for (const [path, account, input, session] of [["/api/admin/accounts", studentAccount, studentInput, studentCookie], ["/api/admin/teachers", teacherAccount, teacherInput, teacherCookie]] as const) {
      assert.equal((await request(path, adminCookie, "PATCH", { id: account.id, active: false })).status, 200);
      assert.equal((await request("/api/bookmarks", session)).status, 401, "Existing sessions stop working after deactivation");
      assert.equal((await request("/api/auth/login", null, "POST", { loginId: input.loginId, password: input.initialPassword })).status, 401);
      const updatedPassword = input.initialPassword + "2";
      const updated = await request(path, adminCookie, "POST", { accounts: [{ ...input, initialPassword: updatedPassword }], updateExisting: true });
      assert.equal(updated.status, 200, await updated.clone().text());
      const [saved] = await db.select().from(users).where(eq(users.id, account.id));
      assert.equal(saved.active, false, "CSV update must preserve inactive status and identity");
      assert.equal((await request(path, adminCookie, "PATCH", { id: account.id, active: true })).status, 200);
      await login(input.loginId, updatedPassword);
    }
    const duplicateBatch = await request("/api/admin/teachers", adminCookie, "POST", { accounts: [{ ...teacherInput, loginId: `${teacherLogin}new` }, teacherInput] });
    assert.equal(duplicateBatch.status, 409);
    assert.equal((await db.select().from(users).where(eq(users.externalId, `${teacherLogin}new`))).length, 0, "Failed batch must not partially register accounts");
    console.log("Live account lifecycle passed: registration, CSV, login, admin isolation, cross-school protection, session revocation, inactive CSV updates, reactivation, batch rollback.");
  } finally {
    const testUsers = await db.select({ id: users.id }).from(users).where(inArray(users.schoolId, schoolIds));
    if (testUsers.length) {
      await db.delete(accountCredentials).where(inArray(accountCredentials.userId, testUsers.map((user) => user.id)));
      await db.delete(users).where(inArray(users.schoolId, schoolIds));
    }
    await db.delete(schools).where(inArray(schools.id, schoolIds));
    console.log("Temporary verification accounts and schools removed.");
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

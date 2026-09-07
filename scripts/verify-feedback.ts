import assert from "node:assert/strict";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";
import { SignJWT } from "jose";
import sharp from "sharp";
import type { SessionUser } from "../src/types";
import { createFeedbackSchema, updateFeedbackSchema } from "../src/features/feedback/model";

async function main() {
  const databaseTest = process.argv.includes("--database");
  if (databaseTest) config({ path: ".env.local", quiet: true });
  else process.env.DATABASE_URL = "";
  const { db } = await import("../src/db");
  const { feedback, users, schools } = await import("../src/db/schema");
  const { createFeedback, listFeedback, updateFeedback } = await import("../src/features/feedback/repository");
  if (databaseTest) assert.ok(db, "Database configuration is required");
  const schoolIds = [crypto.randomUUID(), crypto.randomUUID()];
  const makeUser = (role: SessionUser["role"], schoolId = schoolIds[0]): SessionUser => ({ id: crypto.randomUUID(), externalId: `feedback-test-${crypto.randomUUID()}`, name: "피드백 자동검증", schoolId, schoolName: "피드백 검증용 학교", role, officialGrade: 1, learningGrade: 1 });
  const student = makeUser("STUDENT"), otherStudent = makeUser("STUDENT"), admin = makeUser("ADMIN"), otherAdmin = makeUser("ADMIN", schoolIds[1]);
  const teacher = makeUser("TEACHER");
  const actors = [student, otherStudent, admin, otherAdmin, teacher];
  const input = { requestId: crypto.randomUUID(), category: "BUG" as const, title: "피드백 기능 자동검증", content: "등록, 권한 및 처리 상태를 검증하기 위한 임시 자료입니다." };
  const query = { page: 1, status: "ALL" as const };
  try {
    if (db) {
      await db.insert(schools).values(schoolIds.map((id) => ({ id, name: "피드백 자동검증 전용" })));
      await db.insert(users).values(actors.map((actor) => ({ id: actor.id, schoolId: actor.schoolId, externalId: actor.externalId, name: actor.name, role: actor.role })));
    }
    assert.ok(createFeedbackSchema.safeParse(input).success);
    for (const invalid of [{ ...input, title: " " }, { ...input, content: "x".repeat(3001) }, { ...input, schoolId: schoolIds[1] }, { ...input, category: "UNKNOWN" }]) assert.equal(createFeedbackSchema.safeParse(invalid).success, false);
    assert.equal(updateFeedbackSchema.safeParse({ status: "UNKNOWN", reply: "", version: 1 }).success, false);
    const first = await createFeedback(student, input);
    assert.equal(first.status, "RECEIVED");
    assert.equal((await createFeedback(student, input)).id, first.id, "Retry must not duplicate feedback");
    assert.equal((await listFeedback(student, query)).items.length, 1);
    assert.equal((await listFeedback(otherStudent, query)).items.length, 0);
    assert.equal((await listFeedback(otherAdmin, query)).items.length, 0);
    assert.equal((await listFeedback(admin, query)).items[0].studentName, student.name);
    await assert.rejects(updateFeedback(student, first.id, { status: "COMPLETED", reply: "", version: 1 }), /FORBIDDEN/);
    assert.equal(await updateFeedback(otherAdmin, first.id, { status: "COMPLETED", reply: "", version: 1 }), "NOT_FOUND");
    assert.equal(await updateFeedback(admin, first.id, { status: "IN_PROGRESS", reply: "확인 중입니다.", version: 1 }), "OK");
    assert.equal(await updateFeedback(admin, first.id, { status: "COMPLETED", reply: "이전 버전", version: 1 }), "CONFLICT");
    assert.equal(await updateFeedback(admin, first.id, { status: "COMPLETED", reply: "수정했습니다.", version: 2 }), "OK");
    const completed = (await listFeedback(student, { page: 1, status: "COMPLETED" })).items[0];
    assert.equal(completed.reply, "수정했습니다.");
    assert.ok(completed.completedAt);
    assert.equal(completed.version, 3);
    assert.equal(await updateFeedback(admin, first.id, { status: "IN_PROGRESS", reply: "추가 확인 중입니다.", version: 3 }), "OK");
    assert.equal((await listFeedback(student, query)).items[0].completedAt, null);
    assert.equal((await listFeedback(student, { page: 1, status: "COMPLETED" })).items.length, 0);
    await Promise.all(Array.from({ length: 20 }, (_, i) => createFeedback(student, { ...input, requestId: crypto.randomUUID(), title: `페이지 검증 ${i}` })));
    const page1 = await listFeedback(student, query), page2 = await listFeedback(student, { ...query, page: 2 });
    assert.equal(page1.items.length, 20); assert.equal(page1.hasMore, true);
    assert.equal(page2.items.length, 1); assert.equal(page2.hasMore, false);
    assert.equal(new Set([...page1.items, ...page2.items].map((item) => item.id)).size, 21);

    const teacherFeedback = await createFeedback(teacher, { ...input, requestId: crypto.randomUUID() });
    assert.equal((await listFeedback(teacher, query)).items.length, 1);
    assert.equal((await listFeedback(teacher, query)).items[0].id, teacherFeedback.id);
    const { findFeedback, deleteFeedback } = await import("../src/features/feedback/repository");
    assert.equal(await findFeedback(teacher, first.id), null);
    assert.equal(await findFeedback(student, teacherFeedback.id), null);
    assert.equal(await deleteFeedback(teacher, first.id), false);
    await assert.rejects(updateFeedback(teacher, teacherFeedback.id, { status: "COMPLETED", reply: "", version: 1 }), /FORBIDDEN/);
    assert.equal(await deleteFeedback(teacher, teacherFeedback.id), true);

    const httpIndex = process.argv.indexOf("--http");
    if (httpIndex >= 0) {
      assert.ok(db, "HTTP tests require the same configured database as the development server");
      const origin = process.argv[httpIndex + 1];
      assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/);
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "learncraft-local-development-secret-key");
      async function request(path: string, actor?: SessionUser, method = "GET", body?: unknown) {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (actor) headers.Cookie = `learncraft_session=${await new SignJWT({ user: actor }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(secret)}`;
        return fetch(`${origin}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      }
      assert.equal((await request("/api/feedback")).status, 401);
      const createBody = { ...input, requestId: crypto.randomUUID(), title: "HTTP 자동검증" };
      assert.equal((await request("/api/feedback", student, "POST", { ...createBody, studentId: otherStudent.id })).status, 400);
      assert.equal((await request("/api/feedback", admin, "POST", createBody)).status, 401);
      const createdResponse = await request("/api/feedback", student, "POST", createBody);
      assert.equal(createdResponse.status, 201);
      const created = (await createdResponse.json()).item;
      const retry = await request("/api/feedback", student, "POST", createBody);
      assert.equal((await retry.json()).item.id, created.id);
      const update = { status: "COMPLETED", reply: "HTTP 처리 완료", version: 1 };
      assert.equal((await request(`/api/admin/feedback/${created.id}`, student, "PATCH", update)).status, 403);
      assert.equal((await request(`/api/admin/feedback/${created.id}`, otherAdmin, "PATCH", update)).status, 404);
      assert.equal((await request(`/api/admin/feedback/${created.id}`, admin, "PATCH", update)).status, 200);
      assert.equal((await request(`/api/admin/feedback/${created.id}`, admin, "PATCH", update)).status, 409);
      const result = await request("/api/feedback?status=COMPLETED", student);
      assert.match(result.headers.get("cache-control") ?? "", /no-store/);
      assert.equal((await result.json()).items[0].reply, update.reply);
      assert.equal((await (await request(`/api/feedback?studentId=${student.id}`, otherStudent)).json()).items.length, 0);
      assert.equal((await (await request(`/api/feedback?schoolId=${student.schoolId}`, otherAdmin)).json()).items.length, 0);
      assert.equal((await request("/api/feedback?page=-1", student)).status, 400);
      const imageBytes = await sharp({ create: { width: 1800, height: 900, channels: 3, background: "#6955ee" } }).png().toBuffer();
      async function upload(files: Blob[], requestId = crypto.randomUUID()) {
        const form = new FormData();
        form.append("payload", JSON.stringify({ ...input, requestId }));
        files.forEach((file) => form.append("images", file, "test.png"));
        const token = await new SignJWT({ user: student }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(secret);
        return fetch(`${origin}/api/feedback`, { method: "POST", headers: { Cookie: `learncraft_session=${token}` }, body: form });
      }
      const png = new Blob([new Uint8Array(imageBytes)], { type: "image/png" });
      assert.equal((await upload([png, png, png, png])).status, 400);
      assert.equal((await upload([new Blob(["not an image"], { type: "image/png" })])).status, 400);
      assert.equal((await upload([new Blob([new Uint8Array(1024 * 1024 + 1)], { type: "image/png" })])).status, 400);
      const imageRequestId = crypto.randomUUID();
      const uploaded = await upload([png, png, png], imageRequestId);
      assert.equal(uploaded.status, 201);
      const imageItem = (await uploaded.json()).item;
      assert.equal(imageItem.images.length, 3);
      assert.equal(imageItem.images[0].width, 1600);
      assert.equal(imageItem.images[0].height, 800);
      assert.equal(imageItem.images[0].key, undefined, "Storage paths must not be disclosed");
      const retried = (await (await upload([png], imageRequestId)).json()).item;
      assert.deepEqual(retried.images, imageItem.images);
      const imagePath = `/api/feedback/${imageItem.id}/images/${imageItem.images[0].id}`;
      assert.equal((await request(imagePath)).status, 401);
      assert.equal((await request(imagePath, otherStudent)).status, 404);
      assert.equal((await request(imagePath, otherAdmin)).status, 404);
      const imageResponse = await request(imagePath, student);
      assert.equal(imageResponse.status, 200);
      assert.equal(imageResponse.headers.get("content-type"), "image/webp");
      assert.match(imageResponse.headers.get("cache-control") ?? "", /no-store/);
      const metadata = await sharp(Buffer.from(await imageResponse.arrayBuffer())).metadata();
      assert.equal(metadata.format, "webp"); assert.equal(metadata.width, 1600);
      assert.equal((await request(imagePath, admin)).status, 200);
      assert.equal((await request(`/api/feedback/${imageItem.id}`, otherStudent, "DELETE")).status, 404);
      const { findFeedback } = await import("../src/features/feedback/repository");
      const stored = await findFeedback(student, imageItem.id);
      assert.ok(stored);
      assert.equal((await request(`/api/feedback/${imageItem.id}`, student, "DELETE")).status, 200);
      assert.equal((await request(imagePath, student)).status, 404);
      const { readImage } = await import("../src/features/feedback/image-storage");
      for (const image of stored.images) assert.equal(await readImage(image), null, "Deleted images must be removed from storage");
      console.log("이미지 검증 통과: 3장 제한·형식/용량 검사·WebP 변환·리사이즈·재시도·비공개 접근·파일 삭제");
      console.log("HTTP 검증 통과: 등록·중복 방지·관리자 처리·학생 답변 조회·401/403/404/409·학교/작성자 격리");
    }
    console.log(`피드백 ${db ? "DB" : "데모"} 검증 통과: 저장·상태 전환·완료일·중복 방지·동시 수정·페이지 분할·권한 격리`);
  } finally {
    if (db) {
      const { deleteFeedback } = await import("../src/features/feedback/repository");
      const remaining = await db.select({ id: feedback.id }).from(feedback).where(inArray(feedback.schoolId, schoolIds));
      for (const row of remaining) await deleteFeedback(admin, row.id);
      await db.delete(feedback).where(inArray(feedback.schoolId, schoolIds));
      await db.delete(users).where(inArray(users.id, actors.map((actor) => actor.id)));
      await db.delete(schools).where(inArray(schools.id, schoolIds));
    }
  }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "Feedback verification failed"); process.exitCode = 1; });

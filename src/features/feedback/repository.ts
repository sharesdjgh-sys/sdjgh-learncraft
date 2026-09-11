import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedback, users } from "@/db/schema";
import type { SessionUser } from "@/types";
import type { z } from "zod";
import type { createFeedbackSchema, updateFeedbackSchema, feedbackQuerySchema, FeedbackItem, FeedbackPage, StoredFeedbackImage } from "./model";

type Row = typeof feedback.$inferSelect;
type Stored = Row & { studentName: string; studentExternalId: string };
const globalStore = globalThis as typeof globalThis & { learncraftFeedback?: Stored[] };
const demo = () => globalStore.learncraftFeedback ??= [];
const pageSize = 20;
const visible = (row: Row, user: SessionUser) => row.schoolId === user.schoolId && (user.role === "ADMIN" || row.studentId === user.id);
const dto = (row: Stored): FeedbackItem => ({
  images: row.images.map(({ id, width, height, size }) => ({ id, width, height, size })),
  curriculumLocation: row.curriculumLocation,
  id: row.id, category: row.category, title: row.title, content: row.content, status: row.status, reply: row.reply, version: row.version,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null,
  studentName: row.studentName, studentExternalId: row.studentExternalId,
});

export async function listFeedback(user: SessionUser, query: z.infer<typeof feedbackQuerySchema>): Promise<FeedbackPage> {
  const offset = (query.page - 1) * pageSize;
  const rows: Stored[] = db
    ? await db.select({ ...feedbackColumns, studentName: users.name, studentExternalId: users.externalId }).from(feedback)
      .innerJoin(users, and(eq(users.id, feedback.studentId), eq(users.schoolId, feedback.schoolId)))
      .where(and(eq(feedback.schoolId, user.schoolId), user.role !== "ADMIN" ? eq(feedback.studentId, user.id) : undefined, query.status === "ALL" ? undefined : eq(feedback.status, query.status)))
      .orderBy(desc(feedback.createdAt), desc(feedback.id)).limit(pageSize + 1).offset(offset)
    : demo().filter((row) => visible(row, user) && (query.status === "ALL" || row.status === query.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)).slice(offset, offset + pageSize + 1);
  return { items: rows.slice(0, pageSize).map(dto), page: query.page, hasMore: rows.length > pageSize };
}

export async function createFeedback(user: SessionUser, input: z.infer<typeof createFeedbackSchema>, images: StoredFeedbackImage[] = []) {
  if (user.role !== "STUDENT" && user.role !== "TEACHER") throw new Error("FORBIDDEN");
  if (!db) {
    const existing = demo().find((row) => row.requestId === input.requestId && row.studentId === user.id && row.schoolId === user.schoolId);
    if (existing) return dto(existing);
    const row: Stored = { ...input, images, id: crypto.randomUUID(), schoolId: user.schoolId, studentId: user.id, studentName: user.name, studentExternalId: user.externalId,
      status: "RECEIVED", reply: "", handledBy: null, completedAt: null, version: 1, createdAt: new Date(), updatedAt: new Date() };
    demo().push(row);
    return dto(row);
  }
  const [created] = await db.insert(feedback).values({ ...input, images, schoolId: user.schoolId, studentId: user.id }).onConflictDoNothing({ target: [feedback.studentId, feedback.requestId] }).returning();
  const row = created ?? (await db.select().from(feedback).where(and(eq(feedback.studentId, user.id), eq(feedback.schoolId, user.schoolId), eq(feedback.requestId, input.requestId))).limit(1))[0];
  if (!row) throw new Error("CREATE_FAILED");
  return dto({ ...row, studentName: user.name, studentExternalId: user.externalId });
}

export async function updateFeedback(user: SessionUser, id: string, input: z.infer<typeof updateFeedbackSchema>) {
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  const updates = { status: input.status, reply: input.reply, handledBy: user.id, updatedAt: new Date(), version: input.version + 1 };
  if (!db) {
    const row = demo().find((item) => item.id === id && visible(item, user));
    if (!row) return "NOT_FOUND";
    if (row.version !== input.version) return "CONFLICT";
    Object.assign(row, updates, { completedAt: input.status === "COMPLETED" ? row.completedAt ?? new Date() : null });
    return "OK";
  }
  const [existing] = await db.select({ version: feedback.version, completedAt: feedback.completedAt }).from(feedback).where(and(eq(feedback.id, id), eq(feedback.schoolId, user.schoolId))).limit(1);
  if (!existing) return "NOT_FOUND";
  const rows = await db.update(feedback).set({ ...updates, completedAt: input.status === "COMPLETED" ? existing.completedAt ?? new Date() : null })
    .where(and(eq(feedback.id, id), eq(feedback.schoolId, user.schoolId), eq(feedback.version, input.version))).returning({ id: feedback.id });
  return rows.length ? "OK" : "CONFLICT";
}

// Explicit projection keeps internal ownership and idempotency fields out of responses.
const feedbackColumns = {
  images: feedback.images,
  curriculumLocation: feedback.curriculumLocation,
  id: feedback.id, requestId: feedback.requestId, schoolId: feedback.schoolId, studentId: feedback.studentId,
  category: feedback.category, title: feedback.title, content: feedback.content, status: feedback.status, reply: feedback.reply,
  handledBy: feedback.handledBy, completedAt: feedback.completedAt, version: feedback.version, createdAt: feedback.createdAt, updatedAt: feedback.updatedAt,
};

export async function findFeedback(user: SessionUser, id: string, byRequest = false) {
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(user.role)) return null;
  if (!db) return demo().find((row) => (byRequest ? row.requestId : row.id) === id && visible(row, user)) ?? null;
  return (await db.select().from(feedback).where(and(
    eq(byRequest ? feedback.requestId : feedback.id, id), eq(feedback.schoolId, user.schoolId),
    user.role !== "ADMIN" ? eq(feedback.studentId, user.id) : undefined,
  )).limit(1))[0] ?? null;
}

export async function deleteFeedback(user: SessionUser, id: string) {
  const row = await findFeedback(user, id);
  if (!row) return false;
  // Keep metadata until all objects are deleted, so a failed deletion can be retried.
  const { removeImage } = await import("./image-storage");
  for (const image of row.images) await removeImage(image);
  if (db) await db.delete(feedback).where(and(eq(feedback.id, id), eq(feedback.schoolId, user.schoolId), user.role !== "ADMIN" ? eq(feedback.studentId, user.id) : undefined));
  else globalStore.learncraftFeedback = demo().filter((item) => item.id !== id);
  return true;
}

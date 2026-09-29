import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { feedback, users } from "@/db/schema";
import type { SessionUser } from "@/types";
import type { z } from "zod";
import type { createFeedbackSchema, updateFeedbackSchema, feedbackQuerySchema, FeedbackCounts, FeedbackItem, FeedbackPage, StoredFeedbackImage } from "./model";

type Row = typeof feedback.$inferSelect;
type Author = { studentName: string; studentExternalId: string; authorRole: FeedbackItem["authorRole"]; authorGrade: number | null; handlerName: string | null };
type Stored = Row & Author;
type Query = z.infer<typeof feedbackQuerySchema>;
const globalStore = globalThis as typeof globalThis & { learncraftFeedback?: Stored[] };
const demo = () => globalStore.learncraftFeedback ??= [];
const pageSize = 20;
const handlers = alias(users, "feedback_handlers");
const visible = (row: Row, user: SessionUser) => row.schoolId === user.schoolId && (user.role === "ADMIN" || row.studentId === user.id);
const authorRole = (role: SessionUser["role"]): FeedbackItem["authorRole"] => role === "TEACHER" ? "TEACHER" : "STUDENT";
const dto = (row: Stored): FeedbackItem => ({
  images: row.images.map(({ id, width, height, size }) => ({ id, width, height, size })),
  curriculumLocation: row.curriculumLocation,
  toolLocation: row.toolLocation ?? null,
  id: row.id, category: row.category, title: row.title, content: row.content, status: row.status, reply: row.reply, version: row.version,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null,
  studentName: row.studentName, studentExternalId: row.studentExternalId,
  authorId: row.studentId, authorRole: row.authorRole, authorGrade: row.authorGrade, handlerName: row.handlerName,
});

export async function listFeedback(user: SessionUser, input: Pick<Query, "page" | "status"> & Partial<Query>): Promise<FeedbackPage> {
  const query: Query = { category: "ALL", role: "ALL", source: "ALL", q: "", sort: "new", ...input };
  const offset = (query.page - 1) * pageSize;
  const counts: FeedbackCounts = { ALL: 0, RECEIVED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  if (!db) {
    const q = query.q.toLocaleLowerCase();
    const matched = demo().filter((row) => visible(row, user)
      && (query.category === "ALL" || row.category === query.category)
      && (query.role === "ALL" || row.authorRole === query.role)
      && (query.source === "ALL" || (query.source === "TEACHER_TOOLS") === Boolean(row.toolLocation))
      && (!query.authorId || row.studentId === query.authorId)
      && (!q || [row.title, row.content, row.studentName, row.studentExternalId].some((value) => value.toLocaleLowerCase().includes(q))));
    for (const row of matched) { counts.ALL += 1; counts[row.status] += 1; }
    const direction = query.sort === "old" ? -1 : 1;
    const rows = matched.filter((row) => query.status === "ALL" || row.status === query.status)
      .sort((a, b) => direction * (b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)));
    return { items: rows.slice(offset, offset + pageSize).map(dto), page: query.page, hasMore: rows.length > offset + pageSize, total: query.status === "ALL" ? counts.ALL : counts[query.status], counts };
  }
  const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
  const filters: (SQL | undefined)[] = [
    eq(feedback.schoolId, user.schoolId),
    user.role !== "ADMIN" ? eq(feedback.studentId, user.id) : undefined,
    query.category === "ALL" ? undefined : eq(feedback.category, query.category),
    query.role === "ALL" ? undefined : eq(users.role, query.role),
    // The column defaults to JSON null, so check for an object rather than SQL NULL.
    query.source === "ALL" ? undefined : query.source === "TEACHER_TOOLS" ? sql`jsonb_typeof(${feedback.toolLocation}) = 'object'` : sql`jsonb_typeof(${feedback.toolLocation}) is distinct from 'object'`,
    query.authorId ? eq(feedback.studentId, query.authorId) : undefined,
    query.q ? or(ilike(feedback.title, pattern), ilike(feedback.content, pattern), ilike(users.name, pattern), ilike(users.externalId, pattern)) : undefined,
  ];
  const author = and(eq(users.id, feedback.studentId), eq(users.schoolId, feedback.schoolId));
  const order = query.sort === "old" ? [asc(feedback.createdAt), asc(feedback.id)] : [desc(feedback.createdAt), desc(feedback.id)];
  const [rows, grouped] = await Promise.all([
    db.select({ ...feedbackColumns, studentName: users.name, studentExternalId: users.externalId, role: users.role, authorGrade: users.officialGrade, handlerName: handlers.name }).from(feedback)
      .innerJoin(users, author).leftJoin(handlers, eq(handlers.id, feedback.handledBy))
      .where(and(...filters, query.status === "ALL" ? undefined : eq(feedback.status, query.status)))
      .orderBy(...order).limit(pageSize + 1).offset(offset),
    db.select({ status: feedback.status, value: count() }).from(feedback).innerJoin(users, author).where(and(...filters)).groupBy(feedback.status),
  ]);
  for (const { status, value } of grouped) { counts[status] = value; counts.ALL += value; }
  return {
    items: rows.slice(0, pageSize).map(({ role, ...row }) => dto({ ...row, authorRole: authorRole(role) })),
    page: query.page, hasMore: rows.length > pageSize, total: query.status === "ALL" ? counts.ALL : counts[query.status], counts,
  };
}

export async function createFeedback(user: SessionUser, input: z.infer<typeof createFeedbackSchema>, images: StoredFeedbackImage[] = []) {
  if (user.role !== "STUDENT" && user.role !== "TEACHER") throw new Error("FORBIDDEN");
  if (!db) {
    const existing = demo().find((row) => row.requestId === input.requestId && row.studentId === user.id && row.schoolId === user.schoolId);
    if (existing) return dto(existing);
    const row: Stored = { ...input, images, id: crypto.randomUUID(), schoolId: user.schoolId, studentId: user.id, ...authorOf(user),
      status: "RECEIVED", reply: "", handledBy: null, completedAt: null, version: 1, createdAt: new Date(), updatedAt: new Date() };
    demo().push(row);
    return dto(row);
  }
  const [created] = await db.insert(feedback).values({ ...input, images, schoolId: user.schoolId, studentId: user.id })
    .onConflictDoNothing({ target: [feedback.studentId, feedback.requestId] })
    .returning({
      id: feedback.id, status: feedback.status, reply: feedback.reply, handledBy: feedback.handledBy,
      completedAt: feedback.completedAt, version: feedback.version, createdAt: feedback.createdAt, updatedAt: feedback.updatedAt,
    });
  const row: Row | undefined = created ? {
    ...input, images, schoolId: user.schoolId, studentId: user.id, ...created,
  } : (await db.select(feedbackColumns).from(feedback).where(and(
    eq(feedback.studentId, user.id), eq(feedback.schoolId, user.schoolId), eq(feedback.requestId, input.requestId),
  )).limit(1))[0];
  if (!row) throw new Error("CREATE_FAILED");
  return dto({ ...row, ...authorOf(user) });
}

export async function updateFeedback(user: SessionUser, id: string, input: z.infer<typeof updateFeedbackSchema>) {
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  const updates = { status: input.status, reply: input.reply, handledBy: user.id, updatedAt: new Date(), version: input.version + 1 };
  if (!db) {
    const row = demo().find((item) => item.id === id && visible(item, user));
    if (!row) return "NOT_FOUND";
    if (row.version !== input.version) return "CONFLICT";
    Object.assign(row, updates, { handlerName: user.name, completedAt: input.status === "COMPLETED" ? row.completedAt ?? new Date() : null });
    return "OK";
  }
  const [existing] = await db.select({ version: feedback.version, completedAt: feedback.completedAt }).from(feedback).where(and(eq(feedback.id, id), eq(feedback.schoolId, user.schoolId))).limit(1);
  if (!existing) return "NOT_FOUND";
  const rows = await db.update(feedback).set({ ...updates, completedAt: input.status === "COMPLETED" ? existing.completedAt ?? new Date() : null })
    .where(and(eq(feedback.id, id), eq(feedback.schoolId, user.schoolId), eq(feedback.version, input.version))).returning({ id: feedback.id });
  return rows.length ? "OK" : "CONFLICT";
}

function authorOf(user: SessionUser): Author {
  return { studentName: user.name, studentExternalId: user.externalId, authorRole: authorRole(user.role), authorGrade: user.officialGrade, handlerName: null };
}

// Explicit projection keeps internal ownership and idempotency fields out of responses.
const feedbackColumns = {
  images: feedback.images,
  curriculumLocation: feedback.curriculumLocation,
  toolLocation: feedback.toolLocation,
  id: feedback.id, requestId: feedback.requestId, schoolId: feedback.schoolId, studentId: feedback.studentId,
  category: feedback.category, title: feedback.title, content: feedback.content, status: feedback.status, reply: feedback.reply,
  handledBy: feedback.handledBy, completedAt: feedback.completedAt, version: feedback.version, createdAt: feedback.createdAt, updatedAt: feedback.updatedAt,
};

export async function findFeedback(user: SessionUser, id: string, byRequest = false) {
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(user.role)) return null;
  if (!db) return demo().find((row) => (byRequest ? row.requestId : row.id) === id && visible(row, user)) ?? null;
  return (await db.select({
    id: feedback.id,
    requestId: feedback.requestId,
    schoolId: feedback.schoolId,
    studentId: feedback.studentId,
    images: feedback.images,
  }).from(feedback).where(and(
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

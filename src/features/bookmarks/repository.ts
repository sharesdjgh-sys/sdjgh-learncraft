import { and, desc, eq } from "drizzle-orm";
import { addBookmark as addDemoBookmark, deleteBookmark as deleteDemoBookmark, listBookmarks as listDemoBookmarks } from "@/data/demo-store";
import { getUnit } from "@/data/curriculum";
import { db } from "@/db";
import { bookmarks as bookmarkTable } from "@/db/schema";
import type { Bookmark } from "@/types";

export async function listStudentBookmarks(studentId: string): Promise<Bookmark[]> {
  if (!db) return listDemoBookmarks(studentId);
  const rows = await db.select().from(bookmarkTable).where(eq(bookmarkTable.studentId, studentId)).orderBy(desc(bookmarkTable.createdAt));
  return rows.map((row) => {
    const unit = getUnit(row.unitId);
    return {
      id: row.id,
      studentId: row.studentId,
      unitId: row.unitId,
      clientAnswerId: row.clientAnswerId,
      answerMarkdown: row.answerMarkdown,
      answerMode: row.answerMode,
      title: row.title,
      subjectTitle: unit?.subjectTitle ?? "과목",
      unitTitle: unit?.title ?? "단원",
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export async function createStudentBookmark(input: Omit<Bookmark, "id" | "createdAt">) {
  if (!db) return addDemoBookmark(input);
  const [created] = await db.insert(bookmarkTable).values({
    schoolId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    studentId: input.studentId,
    unitId: input.unitId,
    clientAnswerId: input.clientAnswerId,
    answerMarkdown: input.answerMarkdown,
    answerMode: input.answerMode,
    title: input.title,
  }).onConflictDoNothing().returning();
  const row = created ?? (await db.select().from(bookmarkTable).where(and(eq(bookmarkTable.studentId, input.studentId), eq(bookmarkTable.clientAnswerId, input.clientAnswerId))).limit(1))[0];
  return { ...input, id: row.id, createdAt: row.createdAt.toISOString() };
}

export async function deleteStudentBookmark(studentId: string, bookmarkId: string) {
  if (!db) return deleteDemoBookmark(studentId, bookmarkId);
  const deleted = await db.delete(bookmarkTable).where(and(eq(bookmarkTable.id, bookmarkId), eq(bookmarkTable.studentId, studentId))).returning({ id: bookmarkTable.id });
  return deleted.length > 0;
}

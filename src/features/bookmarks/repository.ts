import { and, desc, eq } from "drizzle-orm";
import { addBookmark as addDemoBookmark, deleteBookmark as deleteDemoBookmark, listBookmarks as listDemoBookmarks } from "@/data/demo-store";
import { getSchoolLearningUnits } from "@/data/school-curriculum";
import { db } from "@/db";
import { bookmarks as bookmarkTable, courses, subjects, units } from "@/db/schema";
import type { Bookmark, BookmarkUnitContext, SubjectCode } from "@/types";

export type StudentBookmarkCollection = {
  bookmarks: Bookmark[];
  units: BookmarkUnitContext[];
};

export async function listStudentBookmarks(studentId: string, schoolId: string): Promise<StudentBookmarkCollection> {
  if (!db) {
    const bookmarks = listDemoBookmarks(studentId);
    const bookmarkUnitIds = new Set(bookmarks.map((bookmark) => bookmark.unitId));
    const schoolUnits = await getSchoolLearningUnits(schoolId, { outlineOnly: true });
    return {
      bookmarks,
      units: schoolUnits.filter((unit) => bookmarkUnitIds.has(unit.id)),
    };
  }

  const rows = await db.select({
    bookmark: bookmarkTable,
    unit: {
      id: units.id,
      title: units.title,
      chapterOrder: units.chapterOrder,
      sectionTitle: units.sectionTitle,
      sectionOrder: units.sectionOrder,
      topicOrder: units.topicOrder,
      courseCode: courses.code,
      courseTitle: courses.title,
      courseOrder: courses.displayOrder,
      subjectCode: subjects.code,
      subjectTitle: subjects.title,
    },
  })
    .from(bookmarkTable)
    .innerJoin(units, eq(units.id, bookmarkTable.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .where(and(
      eq(bookmarkTable.studentId, studentId),
      eq(bookmarkTable.schoolId, schoolId),
    ))
    .orderBy(desc(bookmarkTable.createdAt));

  const unitById = new Map<string, BookmarkUnitContext>();
  const bookmarks = rows.map(({ bookmark: row, unit }) => {
    unitById.set(unit.id, {
      id: unit.id,
      title: unit.title,
      subjectCode: unit.subjectCode as SubjectCode,
      courseCode: unit.courseCode,
      courseTitle: unit.courseTitle,
      courseOrder: unit.courseOrder,
      chapterOrder: unit.chapterOrder,
      sectionTitle: unit.sectionTitle,
      sectionOrder: unit.sectionOrder,
      topicOrder: unit.topicOrder,
    });
    return {
      id: row.id,
      studentId: row.studentId,
      unitId: row.unitId,
      clientAnswerId: row.clientAnswerId,
      answerMarkdown: row.answerMarkdown,
      answerMode: row.answerMode,
      title: row.title,
      subjectTitle: unit.subjectTitle,
      unitTitle: unit.title,
      createdAt: row.createdAt.toISOString(),
    };
  });
  return { bookmarks, units: [...unitById.values()] };
}

export async function createStudentBookmark(
  input: Omit<Bookmark, "id" | "createdAt">,
  schoolId: string,
) {
  if (!db) return addDemoBookmark(input);
  const [created] = await db.insert(bookmarkTable).values({
    schoolId,
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

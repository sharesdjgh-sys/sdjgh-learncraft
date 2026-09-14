import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import {
  addBookmark as addDemoBookmark,
  deleteBookmark as deleteDemoBookmark,
  listBookmarks as listDemoBookmarks,
} from "@/data/demo-store";
import { db } from "@/db";
import { bookmarks as bookmarkTable, courses, subjects, units } from "@/db/schema";
import type {
  Bookmark,
  BookmarkOutlineUnit,
  BookmarkPage,
  BookmarkSummary,
  SubjectCode,
} from "@/types";
import { bookmarkPreview, containsInlineImageData } from "@/lib/bookmark-content";

const cursorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BookmarkListOptions = {
  limit: number;
  cursor?: string;
  query?: string;
  subjectCode?: string;
  courseCode?: string;
  unitId?: string;
};

function encodeCursor(item: { createdAt: Date | string; id: string }) {
  const createdAt = item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt;
  return Buffer.from(JSON.stringify([createdAt, item.id])).toString("base64url");
}

export function decodeBookmarkCursor(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== "string"
      || typeof parsed[1] !== "string" || !cursorIdPattern.test(parsed[1])) throw new Error();
    const createdAt = new Date(parsed[0]);
    if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== parsed[0]) throw new Error();
    return { createdAt, id: parsed[1] };
  } catch {
    throw new Error("INVALID_BOOKMARK_CURSOR");
  }
}

function matchesDemoBookmark(item: Bookmark, options: BookmarkListOptions, unitById: Map<string, BookmarkOutlineUnit>) {
  const unit = unitById.get(item.unitId);
  const needle = options.query?.trim().toLocaleLowerCase("ko") ?? "";
  return (!options.unitId || item.unitId === options.unitId)
    && (!options.courseCode || unit?.courseCode === options.courseCode)
    && (!options.subjectCode || unit?.subjectCode === options.subjectCode)
    && (!needle || item.title.toLocaleLowerCase("ko").includes(needle) || bookmarkPreview(item.answerMarkdown).toLocaleLowerCase("ko").includes(needle));
}

export async function listStudentBookmarkOutline(studentId: string, schoolId: string): Promise<BookmarkOutlineUnit[]> {
  if (!db) {
    const counts = new Map<string, number>();
    for (const bookmark of listDemoBookmarks(studentId)) counts.set(bookmark.unitId, (counts.get(bookmark.unitId) ?? 0) + 1);
    const { getSchoolLearningUnits } = await import("@/data/school-curriculum");
    return (await getSchoolLearningUnits(schoolId, { outlineOnly: true }))
      .filter((unit) => counts.has(unit.id))
      .map((unit) => ({
        id: unit.id,
        title: unit.title,
        subjectCode: unit.subjectCode,
        subjectTitle: unit.subjectTitle,
        courseCode: unit.courseCode,
        courseTitle: unit.courseTitle,
        courseOrder: unit.courseOrder,
        chapterOrder: unit.chapterOrder,
        sectionTitle: unit.sectionTitle,
        sectionOrder: unit.sectionOrder,
        topicOrder: unit.topicOrder,
        count: counts.get(unit.id) ?? 0,
      }));
  }
  const rows = await db.select({
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
    count: sql<number>`count(*)::int`,
  }).from(bookmarkTable)
    .innerJoin(units, eq(units.id, bookmarkTable.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .where(and(eq(bookmarkTable.studentId, studentId), eq(bookmarkTable.schoolId, schoolId)))
    .groupBy(units.id, courses.id, subjects.id)
    .orderBy(courses.displayOrder, units.chapterOrder, units.sectionOrder, units.topicOrder);
  return rows.map((row) => ({ ...row, subjectCode: row.subjectCode as SubjectCode }));
}

export async function listStudentBookmarks(
  studentId: string,
  schoolId: string,
  options: BookmarkListOptions,
): Promise<BookmarkPage> {
  const cursor = options.cursor ? decodeBookmarkCursor(options.cursor) : undefined;
  if (!db) {
    const outline = await listStudentBookmarkOutline(studentId, schoolId);
    const unitById = new Map(outline.map((unit) => [unit.id, unit]));
    let bookmarks = listDemoBookmarks(studentId).filter((item) => matchesDemoBookmark(item, options, unitById));
    if (cursor) bookmarks = bookmarks.filter((item) => item.createdAt < cursor.createdAt.toISOString()
      || (item.createdAt === cursor.createdAt.toISOString() && item.id < cursor.id));
    const page = bookmarks.slice(0, options.limit + 1);
    const items: BookmarkSummary[] = page.slice(0, options.limit).map((item) => ({
      id: item.id, unitId: item.unitId, title: item.title,
      preview: bookmarkPreview(item.answerMarkdown) || item.title, createdAt: item.createdAt,
    }));
    return { items, nextCursor: page.length > options.limit ? encodeCursor(items.at(-1)!) : null };
  }
  const pattern = options.query ? `%${options.query.replace(/[\\%_]/g, "\\$&")}%` : undefined;
  const rows = await db.select({
    id: bookmarkTable.id,
    unitId: bookmarkTable.unitId,
    title: bookmarkTable.title,
    preview: bookmarkTable.previewText,
    createdAt: bookmarkTable.createdAt,
  }).from(bookmarkTable)
    .innerJoin(units, eq(units.id, bookmarkTable.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .where(and(
      eq(bookmarkTable.studentId, studentId),
      eq(bookmarkTable.schoolId, schoolId),
      options.unitId ? eq(bookmarkTable.unitId, options.unitId) : undefined,
      options.courseCode ? eq(courses.code, options.courseCode) : undefined,
      options.subjectCode ? eq(subjects.code, options.subjectCode) : undefined,
      pattern ? or(ilike(bookmarkTable.title, pattern), ilike(bookmarkTable.previewText, pattern)) : undefined,
      cursor ? or(
        lt(bookmarkTable.createdAt, cursor.createdAt),
        and(eq(bookmarkTable.createdAt, cursor.createdAt), lt(bookmarkTable.id, cursor.id)),
      ) : undefined,
    ))
    .orderBy(desc(bookmarkTable.createdAt), desc(bookmarkTable.id))
    .limit(options.limit + 1);
  const items = rows.slice(0, options.limit).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  return { items, nextCursor: rows.length > options.limit ? encodeCursor(rows[options.limit - 1]) : null };
}

export async function getStudentBookmark(studentId: string, schoolId: string, bookmarkId: string): Promise<Bookmark | null> {
  if (!db) return listDemoBookmarks(studentId).find((item) => item.id === bookmarkId) ?? null;
  const [row] = await db.select({
    id: bookmarkTable.id,
    studentId: bookmarkTable.studentId,
    unitId: bookmarkTable.unitId,
    clientAnswerId: bookmarkTable.clientAnswerId,
    answerMarkdown: bookmarkTable.answerMarkdown,
    answerMode: bookmarkTable.answerMode,
    title: bookmarkTable.title,
    subjectTitle: subjects.title,
    unitTitle: units.title,
    createdAt: bookmarkTable.createdAt,
  }).from(bookmarkTable)
    .innerJoin(units, eq(units.id, bookmarkTable.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .where(and(
      eq(bookmarkTable.id, bookmarkId),
      eq(bookmarkTable.studentId, studentId),
      eq(bookmarkTable.schoolId, schoolId),
    )).limit(1);
  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}

export async function createStudentBookmark(
  input: Omit<Bookmark, "id" | "createdAt">,
  schoolId: string,
): Promise<{ bookmark: BookmarkSummary; created: boolean }> {
  if (containsInlineImageData(input.answerMarkdown)) {
    throw new Error("INLINE_IMAGE_NOT_ALLOWED");
  }
  if (!db) {
    const item = addDemoBookmark(input);
    return { bookmark: { id: item.id, unitId: item.unitId, title: item.title, preview: bookmarkPreview(item.answerMarkdown) || item.title, createdAt: item.createdAt }, created: true };
  }
  const preview = bookmarkPreview(input.answerMarkdown) || input.title;
  const [created] = await db.insert(bookmarkTable).values({
    schoolId,
    studentId: input.studentId,
    unitId: input.unitId,
    clientAnswerId: input.clientAnswerId,
    answerMarkdown: input.answerMarkdown,
    previewText: preview,
    answerMode: input.answerMode,
    title: input.title,
  }).onConflictDoNothing().returning({ id: bookmarkTable.id, createdAt: bookmarkTable.createdAt });
  const row = created ?? (await db.select({ id: bookmarkTable.id, createdAt: bookmarkTable.createdAt })
    .from(bookmarkTable)
    .where(and(
      eq(bookmarkTable.studentId, input.studentId),
      eq(bookmarkTable.schoolId, schoolId),
      eq(bookmarkTable.clientAnswerId, input.clientAnswerId),
    )).limit(1))[0];
  if (!row) throw new Error("BOOKMARK_CREATE_FAILED");
  return {
    bookmark: { id: row.id, unitId: input.unitId, title: input.title, preview, createdAt: row.createdAt.toISOString() },
    created: Boolean(created),
  };
}

export async function deleteStudentBookmark(studentId: string, schoolId: string, bookmarkId: string) {
  if (!db) {
    const bookmark = listDemoBookmarks(studentId).find((item) => item.id === bookmarkId);
    if (!bookmark || !deleteDemoBookmark(studentId, bookmarkId)) return null;
    return bookmark.answerMarkdown;
  }
  const deleted = await db.delete(bookmarkTable).where(and(
    eq(bookmarkTable.id, bookmarkId),
    eq(bookmarkTable.studentId, studentId),
    eq(bookmarkTable.schoolId, schoolId),
  )).returning({ answerMarkdown: bookmarkTable.answerMarkdown });
  return deleted[0]?.answerMarkdown ?? null;
}

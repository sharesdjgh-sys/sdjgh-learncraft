import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schoolCourseSelections } from "@/db/schema";
import { learningUnits } from "@/data/curriculum";
import {
  defaultSelectedSchoolCourseKeys,
  schoolCourseCatalog,
} from "@/data/school-course-catalog";

const academicYear = 2026;

declare global {
  var __learncraftSchoolCourseSelections: Map<string, Set<string>> | undefined;
}

const fallbackSelections = globalThis.__learncraftSchoolCourseSelections ?? new Map<string, Set<string>>();
globalThis.__learncraftSchoolCourseSelections = fallbackSelections;

function defaultSelection() {
  return new Set(defaultSelectedSchoolCourseKeys);
}

async function selectedKeysForSchool(schoolId: string) {
  if (!db) return new Set(fallbackSelections.get(schoolId) ?? defaultSelection());

  const rows = await db
    .select({ catalogKey: schoolCourseSelections.catalogKey, enabled: schoolCourseSelections.enabled })
    .from(schoolCourseSelections)
    .where(and(
      eq(schoolCourseSelections.schoolId, schoolId),
      eq(schoolCourseSelections.academicYear, academicYear),
    ));

  if (rows.length === 0) return defaultSelection();
  return new Set(rows.filter((row) => row.enabled).map((row) => row.catalogKey));
}

export async function getSchoolCurriculumState(schoolId: string) {
  const selectedKeys = await selectedKeysForSchool(schoolId);
  return {
    academicYear,
    selectedKeys: [...selectedKeys],
    items: schoolCourseCatalog.map((item) => ({
      ...item,
      selected: selectedKeys.has(item.key),
      contentReady: Boolean(item.contentCourseCode),
    })),
  };
}

export async function saveSchoolCurriculumSelection(schoolId: string, selectedKeys: string[]) {
  const allowedKeys = new Set(schoolCourseCatalog.map((item) => item.key));
  const uniqueSelectedKeys = [...new Set(selectedKeys)].filter((key) => allowedKeys.has(key));
  const selectedSet = new Set(uniqueSelectedKeys);
  const hasStudentContent = schoolCourseCatalog.some(
    (item) => selectedSet.has(item.key) && Boolean(item.contentCourseCode),
  );

  if (!hasStudentContent) {
    throw new Error("학생 화면에 표시할 콘텐츠 준비 과목을 하나 이상 선택해 주세요.");
  }

  if (!db) {
    fallbackSelections.set(schoolId, selectedSet);
    return getSchoolCurriculumState(schoolId);
  }

  await db
    .insert(schoolCourseSelections)
    .values(schoolCourseCatalog.map((item) => ({
      schoolId,
      catalogKey: item.key,
      academicYear: item.academicYear,
      grade: item.grade,
      subjectCode: item.subjectCode,
      courseTitle: item.courseTitle,
      publisherName: item.publisherName,
      contentCourseCode: item.contentCourseCode ?? null,
      enabled: selectedSet.has(item.key),
    })))
    .onConflictDoUpdate({
      target: [
        schoolCourseSelections.schoolId,
        schoolCourseSelections.academicYear,
        schoolCourseSelections.catalogKey,
      ],
      set: {
        grade: sql`excluded.grade`,
        subjectCode: sql`excluded.subject_code`,
        courseTitle: sql`excluded.course_title`,
        publisherName: sql`excluded.publisher_name`,
        contentCourseCode: sql`excluded.content_course_code`,
        enabled: sql`excluded.enabled`,
        updatedAt: new Date(),
      },
    });

  return getSchoolCurriculumState(schoolId);
}

export async function getSchoolLearningUnits(schoolId: string) {
  const selectedKeys = await selectedKeysForSchool(schoolId);
  const enabledCourseCodes = new Set(
    schoolCourseCatalog
      .filter((item) => selectedKeys.has(item.key) && item.contentCourseCode)
      .map((item) => item.contentCourseCode!),
  );
  return learningUnits.filter((unit) => enabledCourseCodes.has(unit.courseCode));
}

import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseSourceDocuments,
  curriculumVersions,
  generatedCourseContents,
  schoolCourseOfferings,
  schoolCurriculumVersions,
  subjects,
  unitContents,
  units,
  users,
} from "@/db/schema";
import type { GeneratedCourseDraft } from "@/features/admin/generate-course-content";
import { curriculumTitle } from "@/lib/curriculum-title";
import type { LearningUnit, SubjectCode } from "@/types";

function stableUuid(seed: string) {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const value = hex.join("");
  return value.slice(0, 8) + "-" + value.slice(8, 12) + "-" + value.slice(12, 16) + "-" + value.slice(16, 20) + "-" + value.slice(20);
}

async function actorId(schoolId: string, adminId: string) {
  if (!db) return null;
  const [actor] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.id, adminId), eq(users.schoolId, schoolId))).limit(1);
  return actor?.id ?? null;
}

export async function getOfferingForGeneration(schoolId: string, offeringId: string) {
  if (!db) throw new Error("AI 콘텐츠 생성에는 데이터베이스 연결이 필요합니다.");
  const [row] = await db.select({
    id: schoolCourseOfferings.id,
    versionId: schoolCourseOfferings.versionId,
    academicYear: schoolCurriculumVersions.academicYear,
    versionStatus: schoolCurriculumVersions.status,
    grade: schoolCourseOfferings.grade,
    subjectCode: schoolCourseOfferings.subjectCode,
    subjectTitle: schoolCourseOfferings.subjectTitle,
    courseTitle: schoolCourseOfferings.courseTitle,
    publisherName: schoolCourseOfferings.publisherName,
    textbookTitle: schoolCourseOfferings.textbookTitle,
    enabled: schoolCourseOfferings.enabled,
  }).from(schoolCourseOfferings)
    .innerJoin(schoolCurriculumVersions, eq(schoolCurriculumVersions.id, schoolCourseOfferings.versionId))
    .where(and(
      eq(schoolCourseOfferings.id, offeringId),
      eq(schoolCurriculumVersions.schoolId, schoolId),
    )).limit(1);
  if (!row) throw new Error("과목 정보를 찾지 못했습니다.");
  if (row.versionStatus !== "DRAFT") throw new Error("교육과정 초안에 있는 과목만 콘텐츠를 만들 수 있습니다.");
  if (!row.enabled) throw new Error("수강 과목으로 선택한 과목만 콘텐츠를 만들 수 있습니다.");
  return row;
}

export async function saveGeneratedCourseDraft(input: {
  schoolId: string;
  offering: Awaited<ReturnType<typeof getOfferingForGeneration>>;
  draft: GeneratedCourseDraft;
  modelId: string;
  usage: { inputTokens: number; outputTokens: number };
}) {
  if (!db) throw new Error("AI 콘텐츠 생성에는 데이터베이스 연결이 필요합니다.");
  const versionCode = "SCHOOL_AI_" + input.offering.academicYear;
  const [curriculumVersion] = await db.insert(curriculumVersions).values({
    code: versionCode,
    title: input.offering.academicYear + "학년도 학교 AI 교육과정",
    active: true,
  }).onConflictDoUpdate({
    target: curriculumVersions.code,
    set: { title: input.offering.academicYear + "학년도 학교 AI 교육과정", active: true },
  }).returning({ id: curriculumVersions.id });
  if (!curriculumVersion) throw new Error("교육과정 버전을 저장하지 못했습니다.");

  const [subject] = await db.insert(subjects).values({
    code: input.offering.subjectCode,
    title: input.offering.subjectTitle,
    displayOrder: 100,
  }).onConflictDoUpdate({
    target: subjects.code,
    set: { title: input.offering.subjectTitle },
  }).returning({ id: subjects.id });
  if (!subject) throw new Error("교과 정보를 저장하지 못했습니다.");

  const courseCode = "GEN-" + input.offering.id.replaceAll("-", "").slice(0, 16).toUpperCase();
  const [course] = await db.insert(courses).values({
    curriculumVersionId: curriculumVersion.id,
    subjectId: subject.id,
    grade: input.offering.grade,
    code: courseCode,
    title: input.offering.courseTitle,
    overview: input.draft.courseOverview,
    publisherName: input.offering.publisherName,
    sourceUrl: input.draft.units[0]?.sourceUrl ?? null,
    displayOrder: 100,
    active: false,
  }).onConflictDoUpdate({
    target: [courses.curriculumVersionId, courses.code],
    set: {
      subjectId: subject.id,
      grade: input.offering.grade,
      title: input.offering.courseTitle,
      overview: input.draft.courseOverview,
      publisherName: input.offering.publisherName,
      sourceUrl: input.draft.units[0]?.sourceUrl ?? null,
      active: false,
    },
  }).returning({ id: courses.id });
  if (!course) throw new Error("과목 콘텐츠를 저장하지 못했습니다.");

  const learningUnits: LearningUnit[] = [];
  for (const [index, unit] of input.draft.units.entries()) {
    const aiCode = unit.code.toUpperCase().replace(/[^A-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "UNIT";
    const unitCode = (courseCode + "-" + String(index + 1).padStart(2, "0") + "-" + aiCode).slice(0, 100);
    const unitId = stableUuid(input.offering.id + ":" + unitCode);
    await db.insert(units).values({
      id: unitId,
      courseId: course.id,
      code: unitCode,
      title: unit.title,
      chapterTitle: unit.chapterTitle,
      chapterOrder: unit.chapterOrder,
      sectionTitle: unit.sectionTitle,
      sectionOrder: unit.sectionOrder,
      topicOrder: unit.topicOrder,
      displayOrder: index + 1,
      scopeIncluded: unit.keyPoints,
      scopeExcluded: unit.scopeExcluded,
      prerequisites: unit.prerequisites,
      recommendedQuestions: unit.recommendedQuestions,
      keywords: unit.keywords,
      commonMistakes: unit.commonMistakes,
      assessmentTags: unit.assessmentTags,
      sourceUrl: unit.sourceUrl,
      tutorPrompt: unit.tutorInstructions,
      promptVersion: 1,
      status: "DRAFT",
    }).onConflictDoUpdate({
      target: units.id,
      set: {
        courseId: course.id,
        code: unitCode,
        title: unit.title,
        chapterTitle: unit.chapterTitle,
        chapterOrder: unit.chapterOrder,
        sectionTitle: unit.sectionTitle,
        sectionOrder: unit.sectionOrder,
        topicOrder: unit.topicOrder,
        displayOrder: index + 1,
        scopeIncluded: unit.keyPoints,
        scopeExcluded: unit.scopeExcluded,
        prerequisites: unit.prerequisites,
        recommendedQuestions: unit.recommendedQuestions,
        keywords: unit.keywords,
        commonMistakes: unit.commonMistakes,
        assessmentTags: unit.assessmentTags,
        sourceUrl: unit.sourceUrl,
        tutorPrompt: unit.tutorInstructions,
        status: "DRAFT",
        updatedAt: new Date(),
      },
    });
    await db.insert(unitContents).values({
      unitId,
      version: 1,
      summaryMarkdown: unit.summary,
      keyPoints: unit.keyPoints,
      formulas: unit.formulas,
      examples: unit.examples,
      sourceModel: input.modelId,
      status: "DRAFT",
    }).onConflictDoUpdate({
      target: [unitContents.unitId, unitContents.version],
      set: {
        summaryMarkdown: unit.summary,
        keyPoints: unit.keyPoints,
        formulas: unit.formulas,
        examples: unit.examples,
        sourceModel: input.modelId,
        status: "DRAFT",
        updatedAt: new Date(),
      },
    });
    learningUnits.push({
      id: unitId,
      code: unitCode,
      title: unit.title,
      subjectCode: input.offering.subjectCode as SubjectCode,
      subjectTitle: input.offering.subjectTitle,
      courseCode,
      courseTitle: input.offering.courseTitle,
      courseCategory: "GENERAL",
      courseOrder: 100,
      chapterTitle: unit.chapterTitle,
      chapterOrder: unit.chapterOrder,
      sectionTitle: unit.sectionTitle,
      sectionOrder: unit.sectionOrder,
      topicOrder: unit.topicOrder,
      grade: input.offering.grade as 1 | 2 | 3,
      recommendedGrades: [input.offering.grade as 1 | 2 | 3],
      curriculum: input.offering.academicYear + "학년도 학교 교육과정",
      publisherCode: "GENERIC",
      publisherName: input.offering.publisherName || "학교 교육과정",
      schoolAdopted: true,
      schoolPublisherName: input.offering.publisherName || undefined,
      sourceUrl: unit.sourceUrl,
      summary: unit.summary,
      keyPoints: unit.keyPoints,
      formulas: unit.formulas,
      examples: unit.examples,
      recommendedQuestions: unit.recommendedQuestions,
      keywords: unit.keywords,
      prerequisites: unit.prerequisites,
      commonMistakes: unit.commonMistakes,
      scopeExcluded: unit.scopeExcluded,
      assessmentTags: unit.assessmentTags,
      tutorInstructions: unit.tutorInstructions,
    });
  }

  await db.insert(generatedCourseContents).values({
    schoolId: input.schoolId,
    offeringId: input.offering.id,
    courseId: course.id,
    unitsJson: learningUnits,
    status: "DRAFT",
    sourceModel: input.modelId,
    promptVersion: 1,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    errorMessage: null,
  }).onConflictDoUpdate({
    target: generatedCourseContents.offeringId,
    set: {
      courseId: course.id,
      unitsJson: learningUnits,
      status: "DRAFT",
      sourceModel: input.modelId,
      promptVersion: 1,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      reviewerId: null,
      reviewedAt: null,
      publishedAt: null,
      errorMessage: null,
      updatedAt: new Date(),
    },
  });
  return getGeneratedCourseContent(input.schoolId, input.offering.id);
}

export async function getGeneratedCourseContent(schoolId: string, offeringId: string) {
  if (!db) throw new Error("데이터베이스 연결이 필요합니다.");
  const [content] = await db.select({
    id: generatedCourseContents.id,
    offeringId: generatedCourseContents.offeringId,
    courseId: generatedCourseContents.courseId,
    status: generatedCourseContents.status,
    sourceModel: generatedCourseContents.sourceModel,
    units: generatedCourseContents.unitsJson,
    updatedAt: generatedCourseContents.updatedAt,
    courseTitle: schoolCourseOfferings.courseTitle,
    subjectTitle: schoolCourseOfferings.subjectTitle,
    grade: schoolCourseOfferings.grade,
  }).from(generatedCourseContents)
    .innerJoin(schoolCourseOfferings, eq(schoolCourseOfferings.id, generatedCourseContents.offeringId))
    .where(and(
      eq(generatedCourseContents.schoolId, schoolId),
      eq(generatedCourseContents.offeringId, offeringId),
    )).limit(1);
  if (!content) throw new Error("생성된 콘텐츠를 찾지 못했습니다.");
  const sources = await db.select({
    kind: courseSourceDocuments.kind,
    title: courseSourceDocuments.title,
    url: courseSourceDocuments.url,
  }).from(courseSourceDocuments).where(eq(courseSourceDocuments.offeringId, offeringId));
  return {
    ...content,
    units: content.units.map((unit) => ({
      ...unit,
      title: curriculumTitle(unit.title),
      chapterTitle: curriculumTitle(unit.chapterTitle),
      sectionTitle: curriculumTitle(unit.sectionTitle),
    })),
    sources,
    updatedAt: content.updatedAt.toISOString(),
  };
}

export async function publishGeneratedCourseContent(schoolId: string, adminId: string, offeringId: string) {
  if (!db) throw new Error("데이터베이스 연결이 필요합니다.");
  const content = await getGeneratedCourseContent(schoolId, offeringId);
  if (content.status === "PUBLISHED") return content;
  if (content.units.length === 0) throw new Error("공개할 단원 콘텐츠가 없습니다.");
  const unitIds = content.units.map((unit) => unit.id);
  const reviewerId = await actorId(schoolId, adminId);
  const publishedAt = new Date();
  await db.update(units).set({
    status: "PUBLISHED",
    reviewerName: "학교 관리자",
    reviewedAt: publishedAt,
    publishedAt,
    updatedAt: publishedAt,
  }).where(inArray(units.id, unitIds));
  await db.update(unitContents).set({
    status: "PUBLISHED",
    reviewerName: "학교 관리자",
    reviewedAt: publishedAt,
    publishedAt,
    updatedAt: publishedAt,
  }).where(inArray(unitContents.unitId, unitIds));
  await db.update(courses).set({ active: true }).where(eq(courses.id, content.courseId));
  const [course] = await db.select({ code: courses.code }).from(courses).where(eq(courses.id, content.courseId)).limit(1);
  if (!course) throw new Error("연결할 과목 콘텐츠를 찾지 못했습니다.");
  await db.update(generatedCourseContents).set({
    status: "PUBLISHED",
    reviewerId,
    reviewedAt: publishedAt,
    publishedAt,
    updatedAt: publishedAt,
  }).where(eq(generatedCourseContents.id, content.id));
  await db.update(schoolCourseOfferings).set({
    contentCourseId: content.courseId,
    contentCourseCode: course.code,
    updatedAt: publishedAt,
  }).where(eq(schoolCourseOfferings.id, offeringId));
  return getGeneratedCourseContent(schoolId, offeringId);
}

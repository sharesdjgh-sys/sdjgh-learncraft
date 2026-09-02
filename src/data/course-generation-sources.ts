import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courseAchievementStandards,
  courseSourceDocuments,
  courseTocEntries,
} from "@/db/schema";
import { curriculumTitle } from "@/lib/curriculum-title";

export type CourseSourceIdentity = {
  academicYear: number;
  grade: number;
  subjectTitle: string;
  courseTitle: string;
  publisherName: string;
  textbookTitle: string | null;
};

export type CourseSourceBundle = {
  documents: Array<{
    kind: "NATIONAL_CURRICULUM" | "PUBLISHER_TOC";
    title: string;
    url: string;
  }>;
  tocEntries: Array<{
    chapterTitle: string;
    chapterOrder: number;
    sectionTitle: string;
    sectionOrder: number;
    topicTitle: string;
    topicOrder: number;
  }>;
  achievementStandards: Array<{
    code: string;
    content: string;
    displayOrder: number;
  }>;
};

export function courseSourceFingerprint(input: CourseSourceIdentity) {
  return createHash("sha256").update(JSON.stringify({
    academicYear: input.academicYear,
    grade: input.grade,
    subjectTitle: input.subjectTitle.trim(),
    courseTitle: input.courseTitle.trim(),
    publisherName: input.publisherName.trim(),
    textbookTitle: input.textbookTitle?.trim() || null,
  })).digest("hex");
}

export async function getCourseSourceBundle(
  offeringId: string,
  identity: CourseSourceIdentity,
): Promise<CourseSourceBundle | null> {
  if (!db) throw new Error("공식 교육과정 자료 조회에는 데이터베이스 연결이 필요합니다.");
  const fingerprint = courseSourceFingerprint(identity);
  const documents = await db.select({
    kind: courseSourceDocuments.kind,
    title: courseSourceDocuments.title,
    url: courseSourceDocuments.url,
    sourceFingerprint: courseSourceDocuments.sourceFingerprint,
  }).from(courseSourceDocuments).where(eq(courseSourceDocuments.offeringId, offeringId));
  if (
    documents.length < 2
    || documents.some((document) => document.sourceFingerprint !== fingerprint)
    || !documents.some((document) => document.kind === "PUBLISHER_TOC")
    || !documents.some((document) => document.kind === "NATIONAL_CURRICULUM")
  ) return null;

  const [tocEntries, achievementStandards] = await Promise.all([
    db.select({
      chapterTitle: courseTocEntries.chapterTitle,
      chapterOrder: courseTocEntries.chapterOrder,
      sectionTitle: courseTocEntries.sectionTitle,
      sectionOrder: courseTocEntries.sectionOrder,
      topicTitle: courseTocEntries.topicTitle,
      topicOrder: courseTocEntries.topicOrder,
    }).from(courseTocEntries)
      .where(eq(courseTocEntries.offeringId, offeringId))
      .orderBy(
        asc(courseTocEntries.chapterOrder),
        asc(courseTocEntries.sectionOrder),
        asc(courseTocEntries.topicOrder),
      ),
    db.select({
      code: courseAchievementStandards.code,
      content: courseAchievementStandards.content,
      displayOrder: courseAchievementStandards.displayOrder,
    }).from(courseAchievementStandards)
      .where(eq(courseAchievementStandards.offeringId, offeringId))
      .orderBy(asc(courseAchievementStandards.displayOrder)),
  ]);
  if (tocEntries.length === 0 || achievementStandards.length === 0) return null;
  return {
    documents,
    tocEntries: tocEntries.map((entry) => ({
      ...entry,
      chapterTitle: curriculumTitle(entry.chapterTitle),
      sectionTitle: curriculumTitle(entry.sectionTitle),
      topicTitle: curriculumTitle(entry.topicTitle),
    })),
    achievementStandards,
  };
}

export async function replaceCourseSourceBundle(input: {
  offeringId: string;
  identity: CourseSourceIdentity;
  sourceModel: string;
  researchExcerpt: string;
  bundle: CourseSourceBundle;
}) {
  if (!db) throw new Error("공식 교육과정 자료 저장에는 데이터베이스 연결이 필요합니다.");
  const fingerprint = courseSourceFingerprint(input.identity);
  const documents = input.bundle.documents.map((document) => ({
    id: randomUUID(),
    offeringId: input.offeringId,
    kind: document.kind,
    title: document.title,
    url: document.url,
    publisherName: document.kind === "PUBLISHER_TOC" ? input.identity.publisherName : null,
    excerpt: input.researchExcerpt.slice(0, 20_000),
    sourceFingerprint: fingerprint,
    sourceModel: input.sourceModel,
  }));
  const tocSourceId = documents.find((document) => document.kind === "PUBLISHER_TOC")?.id;
  const curriculumSourceId = documents.find((document) => document.kind === "NATIONAL_CURRICULUM")?.id;
  if (!tocSourceId || !curriculumSourceId) throw new Error("공식 출처 문서를 저장하지 못했습니다.");

  await db.batch([
    db.delete(courseSourceDocuments).where(eq(courseSourceDocuments.offeringId, input.offeringId)),
    db.insert(courseSourceDocuments).values(documents),
    db.insert(courseTocEntries).values(input.bundle.tocEntries.map((entry) => ({
      offeringId: input.offeringId,
      sourceDocumentId: tocSourceId,
      ...entry,
      chapterTitle: curriculumTitle(entry.chapterTitle),
      sectionTitle: curriculumTitle(entry.sectionTitle),
      topicTitle: curriculumTitle(entry.topicTitle),
    }))),
    db.insert(courseAchievementStandards).values(input.bundle.achievementStandards.map((standard) => ({
      offeringId: input.offeringId,
      sourceDocumentId: curriculumSourceId,
      ...standard,
    }))),
  ]);
}

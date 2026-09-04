import "server-only";

import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courseAchievementStandards,
  courseSourceDocuments,
  courseTocEntries,
  sharedCourseSourceBundles,
} from "@/db/schema";
import {
  legacyCourseSourceFingerprint,
  sharedCourseSourceFingerprint,
  type CourseSourceCacheIdentity,
} from "@/lib/course-source-cache-key";
import { curriculumTitle } from "@/lib/curriculum-title";

export type CourseSourceIdentity = CourseSourceCacheIdentity;

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

type StoredOfferingBundle = {
  bundle: CourseSourceBundle;
  sourceFingerprint: string;
  sourceModel: string | null;
  researchExcerpt: string;
  retrievedAt: Date;
};

export const courseSourceFingerprint = sharedCourseSourceFingerprint;

function isCompleteBundle(bundle: CourseSourceBundle) {
  return bundle.documents.length >= 2
    && bundle.documents.some((document) => document.kind === "PUBLISHER_TOC")
    && bundle.documents.some((document) => document.kind === "NATIONAL_CURRICULUM")
    && bundle.tocEntries.length > 0
    && bundle.achievementStandards.length > 0;
}

function normalizeBundle(bundle: CourseSourceBundle): CourseSourceBundle {
  return {
    ...bundle,
    tocEntries: bundle.tocEntries.map((entry) => ({
      ...entry,
      chapterTitle: curriculumTitle(entry.chapterTitle),
      sectionTitle: curriculumTitle(entry.sectionTitle),
      topicTitle: curriculumTitle(entry.topicTitle),
    })),
  };
}

async function getOfferingSourceBundle(
  offeringId: string,
  acceptedFingerprints: Set<string>,
): Promise<StoredOfferingBundle | null> {
  if (!db) throw new Error("공식 교육과정 자료 조회에는 데이터베이스 연결이 필요합니다.");
  const documents = await db.select({
    kind: courseSourceDocuments.kind,
    title: courseSourceDocuments.title,
    url: courseSourceDocuments.url,
    excerpt: courseSourceDocuments.excerpt,
    sourceFingerprint: courseSourceDocuments.sourceFingerprint,
    sourceModel: courseSourceDocuments.sourceModel,
    retrievedAt: courseSourceDocuments.retrievedAt,
  }).from(courseSourceDocuments).where(eq(courseSourceDocuments.offeringId, offeringId));
  const sourceFingerprint = documents[0]?.sourceFingerprint;
  if (
    !sourceFingerprint
    || !acceptedFingerprints.has(sourceFingerprint)
    || documents.some((document) => document.sourceFingerprint !== sourceFingerprint)
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
  const bundle: CourseSourceBundle = {
    documents: documents.map(({ kind, title, url }) => ({ kind, title, url })),
    tocEntries,
    achievementStandards,
  };
  if (!isCompleteBundle(bundle)) return null;
  return {
    bundle: normalizeBundle(bundle),
    sourceFingerprint,
    sourceModel: documents[0]?.sourceModel ?? null,
    researchExcerpt: documents[0]?.excerpt ?? "",
    retrievedAt: documents.reduce(
      (latest, document) => document.retrievedAt > latest ? document.retrievedAt : latest,
      documents[0].retrievedAt,
    ),
  };
}

async function replaceOfferingSourceBundle(input: {
  offeringId: string;
  identity: CourseSourceIdentity;
  fingerprint: string;
  sourceModel: string | null;
  researchExcerpt: string;
  bundle: CourseSourceBundle;
}) {
  if (!db) throw new Error("공식 교육과정 자료 저장에는 데이터베이스 연결이 필요합니다.");
  const documents = input.bundle.documents.map((document) => ({
    id: randomUUID(),
    offeringId: input.offeringId,
    kind: document.kind,
    title: document.title,
    url: document.url,
    publisherName: document.kind === "PUBLISHER_TOC" ? input.identity.publisherName : null,
    excerpt: input.researchExcerpt.slice(0, 20_000),
    sourceFingerprint: input.fingerprint,
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

async function upsertSharedSourceBundle(input: {
  identity: CourseSourceIdentity;
  fingerprint: string;
  sourceModel: string | null;
  researchExcerpt: string;
  bundle: CourseSourceBundle;
}) {
  if (!db) throw new Error("공유 교과서 캐시 저장에는 데이터베이스 연결이 필요합니다.");
  const now = new Date();
  const values = {
    curriculumRevision: "2022",
    courseTitle: input.identity.courseTitle,
    publisherName: input.identity.publisherName,
    textbookTitle: input.identity.textbookTitle,
    bundleJson: normalizeBundle(input.bundle),
    sourceModel: input.sourceModel,
    researchExcerpt: input.researchExcerpt.slice(0, 20_000),
    retrievedAt: now,
    updatedAt: now,
  };
  await db.insert(sharedCourseSourceBundles).values({
    sourceFingerprint: input.fingerprint,
    ...values,
  }).onConflictDoUpdate({
    target: sharedCourseSourceBundles.sourceFingerprint,
    set: values,
  });
}

export async function getCourseSourceBundle(
  offeringId: string,
  identity: CourseSourceIdentity,
): Promise<CourseSourceBundle | null> {
  if (!db) throw new Error("공식 교육과정 자료 조회에는 데이터베이스 연결이 필요합니다.");
  const fingerprint = sharedCourseSourceFingerprint(identity);
  const legacyFingerprint = legacyCourseSourceFingerprint(identity);
  const [sharedRows, offeringBundle] = await Promise.all([
    db.select().from(sharedCourseSourceBundles)
      .where(eq(sharedCourseSourceBundles.sourceFingerprint, fingerprint))
      .limit(1),
    getOfferingSourceBundle(offeringId, new Set([fingerprint, legacyFingerprint])),
  ]);
  const shared = sharedRows[0];
  if (shared && isCompleteBundle(shared.bundleJson)) {
    const sharedBundle = normalizeBundle(shared.bundleJson);
    if (
      !offeringBundle
      || offeringBundle.sourceFingerprint !== fingerprint
      || offeringBundle.retrievedAt < shared.retrievedAt
    ) {
      await replaceOfferingSourceBundle({
        offeringId,
        identity,
        fingerprint,
        sourceModel: shared.sourceModel,
        researchExcerpt: shared.researchExcerpt,
        bundle: sharedBundle,
      });
    }
    return sharedBundle;
  }

  if (!offeringBundle) return null;
  await upsertSharedSourceBundle({
    identity,
    fingerprint,
    sourceModel: offeringBundle.sourceModel,
    researchExcerpt: offeringBundle.researchExcerpt,
    bundle: offeringBundle.bundle,
  });
  if (offeringBundle.sourceFingerprint !== fingerprint) {
    await replaceOfferingSourceBundle({
      offeringId,
      identity,
      fingerprint,
      sourceModel: offeringBundle.sourceModel,
      researchExcerpt: offeringBundle.researchExcerpt,
      bundle: offeringBundle.bundle,
    });
  }
  return offeringBundle.bundle;
}

export async function replaceCourseSourceBundle(input: {
  offeringId: string;
  identity: CourseSourceIdentity;
  sourceModel: string;
  researchExcerpt: string;
  bundle: CourseSourceBundle;
}) {
  const fingerprint = sharedCourseSourceFingerprint(input.identity);
  const bundle = normalizeBundle(input.bundle);
  await upsertSharedSourceBundle({
    identity: input.identity,
    fingerprint,
    sourceModel: input.sourceModel,
    researchExcerpt: input.researchExcerpt,
    bundle,
  });
  await replaceOfferingSourceBundle({
    offeringId: input.offeringId,
    identity: input.identity,
    fingerprint,
    sourceModel: input.sourceModel,
    researchExcerpt: input.researchExcerpt,
    bundle,
  });
}

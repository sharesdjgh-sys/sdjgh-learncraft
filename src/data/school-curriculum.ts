import "server-only";

import { and, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseAchievementStandards,
  courseSourceDocuments,
  courseTocEntries,
  curriculumImports,
  curriculumVersions,
  generatedCourseContents,
  schoolCourseOfferings,
  schoolCourseSelections,
  schoolCurriculumVersions,
  subjects,
  unitContents,
  units,
  users,
} from "@/db/schema";
import { learningUnits } from "@/data/curriculum";
import {
  defaultSelectedSchoolCourseKeys,
  schoolCourseCatalog,
} from "@/data/school-course-catalog";
import { findContentCourseCode } from "@/lib/course-content-match";
import { curriculumTitle } from "@/lib/curriculum-title";
import type {
  CurriculumManagementState,
  CurriculumOffering,
  CurriculumVersionDetail,
  CurriculumVersionSummary,
} from "@/types/curriculum-management";

type MemoryVersion = CurriculumVersionDetail & { schoolId: string };

declare global {
  var __learncraftCurriculumVersions: Map<string, MemoryVersion[]> | undefined;
}

const memoryVersions = globalThis.__learncraftCurriculumVersions ?? new Map<string, MemoryVersion[]>();
globalThis.__learncraftCurriculumVersions = memoryVersions;

function nowIso() {
  return new Date().toISOString();
}

function defaultItems(): CurriculumOffering[] {
  const selected = new Set(defaultSelectedSchoolCourseKeys);
  return schoolCourseCatalog.map((item, displayOrder) => ({
    rowKey: item.key,
    grade: item.grade,
    subjectCode: item.subjectCode,
    subjectTitle: item.subjectTitle,
    courseTitle: item.courseTitle,
    publisherName: item.publisherName,
    textbookTitle: item.textbookTitle ?? null,
    contentCourseCode: item.contentCourseCode ?? null,
    enabled: selected.has(item.key),
    confidence: 100,
    reviewRequired: false,
    displayOrder,
  }));
}

function summary(version: CurriculumVersionDetail): CurriculumVersionSummary {
  return {
    id: version.id,
    academicYear: version.academicYear,
    revision: version.revision,
    title: version.title,
    status: version.status,
    sourceFileName: version.sourceFileName,
    courseCount: version.items.length,
    selectedCount: version.items.filter((item) => item.enabled).length,
    contentReadyCount: version.items.filter((item) => item.enabled && item.contentCourseCode).length,
    publishedAt: version.publishedAt,
    updatedAt: version.updatedAt,
  };
}

function ensureMemoryDefault(schoolId: string) {
  if (memoryVersions.has(schoolId)) return;
  const timestamp = nowIso();
  const items = defaultItems();
  memoryVersions.set(schoolId, [{
    schoolId,
    id: crypto.randomUUID(),
    academicYear: 2026,
    revision: 1,
    title: "2026학년도 교육과정",
    status: "PUBLISHED",
    sourceFileName: "2026학년도 서대전여고 검인정 교과서 선정결과.pdf",
    publishedAt: timestamp,
    updatedAt: timestamp,
    courseCount: items.length,
    selectedCount: items.filter((item) => item.enabled).length,
    contentReadyCount: items.filter((item) => item.enabled && item.contentCourseCode).length,
    items,
  }]);
}

function sanitizeOffering(item: CurriculumOffering, index: number): CurriculumOffering {
  return {
    ...item,
    rowKey: item.rowKey || crypto.randomUUID(),
    grade: Math.min(3, Math.max(1, Number(item.grade))) as 1 | 2 | 3,
    subjectCode: item.subjectCode.trim().slice(0, 60) || "OTHER_SUBJECT",
    subjectTitle: item.subjectTitle.trim().slice(0, 60) || "기타",
    courseTitle: item.courseTitle.trim().slice(0, 160),
    publisherName: item.publisherName.trim().slice(0, 160),
    textbookTitle: item.textbookTitle?.trim().slice(0, 200) || null,
    contentCourseCode: findContentCourseCode(Number(item.grade), item.courseTitle),
    confidence: Math.min(100, Math.max(0, Number(item.confidence) || 0)),
    displayOrder: index,
  };
}

async function knownAdminId(schoolId: string, adminId: string) {
  if (!db) return null;
  const [actor] = await db.select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, adminId), eq(users.schoolId, schoolId)))
    .limit(1);
  return actor?.id ?? null;
}

async function databaseState(schoolId: string, selectedVersionId?: string) {
  if (!db) return null;
  const versionRows = await db
    .select()
    .from(schoolCurriculumVersions)
    .where(eq(schoolCurriculumVersions.schoolId, schoolId))
    .orderBy(desc(schoolCurriculumVersions.academicYear), desc(schoolCurriculumVersions.revision));
  if (versionRows.length === 0) {
    return { activeVersionId: null, selectedVersion: null, versions: [] } satisfies CurriculumManagementState;
  }

  const offeringRows = await db
    .select()
    .from(schoolCourseOfferings)
    .where(inArray(schoolCourseOfferings.versionId, versionRows.map((version) => version.id)))
    .orderBy(schoolCourseOfferings.displayOrder);
  const generatedRows = offeringRows.length > 0
    ? await db.select({
        offeringId: generatedCourseContents.offeringId,
        status: generatedCourseContents.status,
        sourceModel: generatedCourseContents.sourceModel,
        units: generatedCourseContents.unitsJson,
        updatedAt: generatedCourseContents.updatedAt,
      }).from(generatedCourseContents)
        .where(inArray(generatedCourseContents.offeringId, offeringRows.map((row) => row.id)))
    : [];
  const generatedByOffering = new Map(generatedRows.map((row) => [row.offeringId, row]));
  const itemsByVersion = new Map<string, CurriculumOffering[]>();
  for (const row of offeringRows) {
    const items = itemsByVersion.get(row.versionId) ?? [];
    const generated = generatedByOffering.get(row.id);
    items.push({
      id: row.id,
      rowKey: row.rowKey,
      grade: row.grade as 1 | 2 | 3,
      subjectCode: row.subjectCode,
      subjectTitle: row.subjectTitle,
      courseTitle: row.courseTitle,
      publisherName: row.publisherName,
      textbookTitle: row.textbookTitle,
      contentCourseCode: row.contentCourseCode,
      enabled: row.enabled,
      confidence: row.confidence,
      reviewRequired: row.reviewRequired,
      displayOrder: row.displayOrder,
      generatedContent: generated ? {
        status: generated.status,
        unitCount: generated.units.length,
        sourceModel: generated.sourceModel,
        updatedAt: generated.updatedAt.toISOString(),
      } : null,
    });
    itemsByVersion.set(row.versionId, items);
  }

  const details: CurriculumVersionDetail[] = versionRows.map((row) => {
    const items = itemsByVersion.get(row.id) ?? [];
    return {
      id: row.id,
      academicYear: row.academicYear,
      revision: row.revision,
      title: row.title,
      status: row.status,
      sourceFileName: row.sourceFileName,
      courseCount: items.length,
      selectedCount: items.filter((item) => item.enabled).length,
      contentReadyCount: items.filter((item) => item.enabled && item.contentCourseCode).length,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      items,
    };
  });
  const active = details.find((version) => version.status === "PUBLISHED") ?? null;
  const selected = details.find((version) => version.id === selectedVersionId)
    ?? details.find((version) => version.status === "DRAFT")
    ?? active
    ?? details[0];
  return {
    activeVersionId: active?.id ?? null,
    selectedVersion: selected,
    versions: details.map(summary),
  } satisfies CurriculumManagementState;
}

export async function getCurriculumManagementState(schoolId: string, selectedVersionId?: string) {
  const stored = await databaseState(schoolId, selectedVersionId);
  if (stored) return stored;
  ensureMemoryDefault(schoolId);
  const versions = memoryVersions.get(schoolId)!;
  const active = versions.find((version) => version.status === "PUBLISHED") ?? null;
  const selected = versions.find((version) => version.id === selectedVersionId)
    ?? versions.find((version) => version.status === "DRAFT")
    ?? active
    ?? versions[0];
  return {
    activeVersionId: active?.id ?? null,
    selectedVersion: selected,
    versions: versions.map(summary),
  } satisfies CurriculumManagementState;
}

export async function createCurriculumDraft(input: {
  schoolId: string;
  adminId: string;
  academicYear: number;
  fileName: string;
  fileSize: number;
  fileHash: string;
  pageCount: number;
  items: CurriculumOffering[];
}) {
  const items = input.items.map(sanitizeOffering);
  if (!db) {
    ensureMemoryDefault(input.schoolId);
    const versions = memoryVersions.get(input.schoolId)!;
    const revision = Math.max(0, ...versions.filter((item) => item.academicYear === input.academicYear).map((item) => item.revision)) + 1;
    const timestamp = nowIso();
    const version: MemoryVersion = {
      schoolId: input.schoolId,
      id: crypto.randomUUID(),
      academicYear: input.academicYear,
      revision,
      title: `${input.academicYear}학년도 교육과정`,
      status: "DRAFT",
      sourceFileName: input.fileName,
      publishedAt: null,
      updatedAt: timestamp,
      courseCount: items.length,
      selectedCount: items.filter((item) => item.enabled).length,
      contentReadyCount: items.filter((item) => item.enabled && item.contentCourseCode).length,
      items,
    };
    versions.unshift(version);
    return getCurriculumManagementState(input.schoolId, version.id);
  }

  const duplicate = await db
    .select({ versionId: curriculumImports.versionId })
    .from(curriculumImports)
    .where(and(
      eq(curriculumImports.schoolId, input.schoolId),
      eq(curriculumImports.academicYear, input.academicYear),
      eq(curriculumImports.fileHash, input.fileHash),
    ))
    .limit(1);
  if (duplicate[0]) return getCurriculumManagementState(input.schoolId, duplicate[0].versionId);

  const existing = await db
    .select({ revision: schoolCurriculumVersions.revision })
    .from(schoolCurriculumVersions)
    .where(and(
      eq(schoolCurriculumVersions.schoolId, input.schoolId),
      eq(schoolCurriculumVersions.academicYear, input.academicYear),
    ))
    .orderBy(desc(schoolCurriculumVersions.revision));
  const revision = (existing[0]?.revision ?? 0) + 1;
  const actorId = await knownAdminId(input.schoolId, input.adminId);
  const [version] = await db.insert(schoolCurriculumVersions).values({
    schoolId: input.schoolId,
    academicYear: input.academicYear,
    revision,
    title: `${input.academicYear}학년도 교육과정`,
    status: "DRAFT",
    sourceFileName: input.fileName,
    createdBy: actorId,
  }).returning({ id: schoolCurriculumVersions.id });
  if (!version) throw new Error("교육과정 초안을 만들지 못했습니다.");

  await db.insert(curriculumImports).values({
    schoolId: input.schoolId,
    versionId: version.id,
    academicYear: input.academicYear,
    fileName: input.fileName,
    fileSize: input.fileSize,
    fileHash: input.fileHash,
    pageCount: input.pageCount,
    extractedCount: items.length,
    status: "REVIEW",
    uploadedBy: actorId,
  });
  await db.insert(schoolCourseOfferings).values(items.map((item) => ({
    versionId: version.id,
    ...item,
    id: undefined,
  })));
  return getCurriculumManagementState(input.schoolId, version.id);
}

export async function saveCurriculumDraft(
  schoolId: string,
  versionId: string,
  items: CurriculumOffering[],
) {
  let cleanItems = items.map(sanitizeOffering).filter((item) => item.courseTitle);
  if (cleanItems.length === 0) throw new Error("등록할 과목을 하나 이상 입력해 주세요.");
  if (!db) {
    ensureMemoryDefault(schoolId);
    const version = memoryVersions.get(schoolId)!.find((item) => item.id === versionId);
    if (!version || version.status !== "DRAFT") throw new Error("수정할 수 있는 교육과정 초안이 아닙니다.");
    version.items = cleanItems;
    version.updatedAt = nowIso();
    return getCurriculumManagementState(schoolId, versionId);
  }

  const [version] = await db.select({ status: schoolCurriculumVersions.status })
    .from(schoolCurriculumVersions)
    .where(and(eq(schoolCurriculumVersions.id, versionId), eq(schoolCurriculumVersions.schoolId, schoolId)))
    .limit(1);
  if (!version || version.status !== "DRAFT") throw new Error("수정할 수 있는 교육과정 초안이 아닙니다.");
  const currentRows = await db.select({
    rowKey: schoolCourseOfferings.rowKey,
    contentCourseId: schoolCourseOfferings.contentCourseId,
    contentCourseCode: schoolCourseOfferings.contentCourseCode,
  }).from(schoolCourseOfferings).where(eq(schoolCourseOfferings.versionId, versionId));
  const currentByKey = new Map(currentRows.map((row) => [row.rowKey, row]));
  cleanItems = cleanItems.map((item) => {
    const current = currentByKey.get(item.rowKey);
    return current?.contentCourseId
      ? { ...item, contentCourseCode: current.contentCourseCode }
      : item;
  });
  await db.insert(schoolCourseOfferings).values(cleanItems.map((item) => ({
    versionId,
    rowKey: item.rowKey,
    grade: item.grade,
    subjectCode: item.subjectCode,
    subjectTitle: item.subjectTitle,
    courseTitle: item.courseTitle,
    publisherName: item.publisherName,
    textbookTitle: item.textbookTitle,
    contentCourseCode: item.contentCourseCode,
    enabled: item.enabled,
    confidence: item.confidence,
    reviewRequired: item.reviewRequired,
    displayOrder: item.displayOrder,
  }))).onConflictDoUpdate({
    target: [schoolCourseOfferings.versionId, schoolCourseOfferings.rowKey],
    set: {
      grade: sql`excluded.grade`,
      subjectCode: sql`excluded.subject_code`,
      subjectTitle: sql`excluded.subject_title`,
      courseTitle: sql`excluded.course_title`,
      publisherName: sql`excluded.publisher_name`,
      textbookTitle: sql`excluded.textbook_title`,
      contentCourseCode: sql`excluded.content_course_code`,
      enabled: sql`excluded.enabled`,
      confidence: sql`excluded.confidence`,
      reviewRequired: sql`excluded.review_required`,
      displayOrder: sql`excluded.display_order`,
      updatedAt: new Date(),
    },
  });
  const keptKeys = cleanItems.map((item) => item.rowKey);
  if (keptKeys.length > 0) {
    await db.delete(schoolCourseOfferings).where(and(
      eq(schoolCourseOfferings.versionId, versionId),
      notInArray(schoolCourseOfferings.rowKey, keptKeys),
    ));
  }
  await db.update(schoolCurriculumVersions)
    .set({ updatedAt: new Date() })
    .where(eq(schoolCurriculumVersions.id, versionId));
  return getCurriculumManagementState(schoolId, versionId);
}

export async function createReviewDraftFromVersion(
  schoolId: string,
  adminId: string,
  sourceVersionId: string,
) {
  const state = await getCurriculumManagementState(schoolId, sourceVersionId);
  const source = state.selectedVersion?.id === sourceVersionId ? state.selectedVersion : null;
  if (!source || source.status === "DRAFT") throw new Error("공개 또는 보관된 교육과정에서만 새 검토본을 만들 수 있습니다.");

  const existingDraft = state.versions.find((version) => (
    version.status === "DRAFT" && version.academicYear === source.academicYear
  ));
  if (existingDraft) return getCurriculumManagementState(schoolId, existingDraft.id);

  if (!db) {
    ensureMemoryDefault(schoolId);
    const versions = memoryVersions.get(schoolId)!;
    const timestamp = nowIso();
    const revision = Math.max(...versions.filter((item) => item.academicYear === source.academicYear).map((item) => item.revision)) + 1;
    const draft: MemoryVersion = {
      ...source,
      schoolId,
      id: crypto.randomUUID(),
      revision,
      status: "DRAFT",
      publishedAt: null,
      updatedAt: timestamp,
      items: source.items.map((item) => ({ ...item, id: undefined, generatedContent: item.generatedContent ? { ...item.generatedContent } : null })),
    };
    versions.unshift(draft);
    return getCurriculumManagementState(schoolId, draft.id);
  }

  const revision = Math.max(...state.versions.filter((item) => item.academicYear === source.academicYear).map((item) => item.revision)) + 1;
  const [draft] = await db.insert(schoolCurriculumVersions).values({
    schoolId,
    academicYear: source.academicYear,
    revision,
    title: source.title,
    status: "DRAFT",
    sourceFileName: source.sourceFileName,
    createdBy: await knownAdminId(schoolId, adminId),
  }).returning({ id: schoolCurriculumVersions.id });
  if (!draft) throw new Error("수정용 검토본을 만들지 못했습니다.");

  const sourceRows = await db.select().from(schoolCourseOfferings)
    .where(eq(schoolCourseOfferings.versionId, sourceVersionId))
    .orderBy(schoolCourseOfferings.displayOrder);
  if (sourceRows.length > 0) {
    const copiedRows = await db.insert(schoolCourseOfferings).values(sourceRows.map((item) => ({
      versionId: draft.id,
      rowKey: item.rowKey,
      grade: item.grade,
      subjectCode: item.subjectCode,
      subjectTitle: item.subjectTitle,
      courseTitle: item.courseTitle,
      publisherName: item.publisherName,
      textbookTitle: item.textbookTitle,
      contentCourseCode: item.contentCourseCode,
      contentCourseId: item.contentCourseId,
      enabled: item.enabled,
      confidence: item.confidence,
      reviewRequired: false,
      displayOrder: item.displayOrder,
    }))).returning({ id: schoolCourseOfferings.id, rowKey: schoolCourseOfferings.rowKey });
    const copiedByKey = new Map(copiedRows.map((item) => [item.rowKey, item.id]));
    const sourceById = new Map(sourceRows.map((item) => [item.id, item]));
    const sourceDocuments = await db.select().from(courseSourceDocuments)
      .where(inArray(courseSourceDocuments.offeringId, sourceRows.map((item) => item.id)));
    if (sourceDocuments.length > 0) {
      const copiedDocumentIds = new Map<string, string>();
      for (const document of sourceDocuments) {
        const sourceOffering = sourceById.get(document.offeringId);
        const offeringId = sourceOffering ? copiedByKey.get(sourceOffering.rowKey) : undefined;
        if (!offeringId) continue;
        const [copiedDocument] = await db.insert(courseSourceDocuments).values({
          offeringId,
          kind: document.kind,
          title: document.title,
          url: document.url,
          publisherName: document.publisherName,
          excerpt: document.excerpt,
          sourceFingerprint: document.sourceFingerprint,
          sourceModel: document.sourceModel,
          retrievedAt: document.retrievedAt,
        }).returning({ id: courseSourceDocuments.id });
        if (copiedDocument) copiedDocumentIds.set(document.id, copiedDocument.id);
      }
      const sourceDocumentIds = sourceDocuments.map((document) => document.id);
      const [tocRows, standardRows] = await Promise.all([
        db.select().from(courseTocEntries)
          .where(inArray(courseTocEntries.sourceDocumentId, sourceDocumentIds)),
        db.select().from(courseAchievementStandards)
          .where(inArray(courseAchievementStandards.sourceDocumentId, sourceDocumentIds)),
      ]);
      if (tocRows.length > 0) {
        await db.insert(courseTocEntries).values(tocRows.flatMap((entry) => {
          const sourceDocumentId = copiedDocumentIds.get(entry.sourceDocumentId);
          const sourceOffering = sourceById.get(entry.offeringId);
          const offeringId = sourceOffering ? copiedByKey.get(sourceOffering.rowKey) : undefined;
          return sourceDocumentId && offeringId ? [{
            offeringId,
            sourceDocumentId,
            chapterTitle: entry.chapterTitle,
            chapterOrder: entry.chapterOrder,
            sectionTitle: entry.sectionTitle,
            sectionOrder: entry.sectionOrder,
            topicTitle: entry.topicTitle,
            topicOrder: entry.topicOrder,
          }] : [];
        }));
      }
      if (standardRows.length > 0) {
        await db.insert(courseAchievementStandards).values(standardRows.flatMap((standard) => {
          const sourceDocumentId = copiedDocumentIds.get(standard.sourceDocumentId);
          const sourceOffering = sourceById.get(standard.offeringId);
          const offeringId = sourceOffering ? copiedByKey.get(sourceOffering.rowKey) : undefined;
          return sourceDocumentId && offeringId ? [{
            offeringId,
            sourceDocumentId,
            code: standard.code,
            content: standard.content,
            displayOrder: standard.displayOrder,
          }] : [];
        }));
      }
    }
    const generatedRows = await db.select().from(generatedCourseContents)
      .where(inArray(generatedCourseContents.offeringId, sourceRows.map((item) => item.id)));
    if (generatedRows.length > 0) {
      await db.insert(generatedCourseContents).values(generatedRows.flatMap((content) => {
        const sourceOffering = sourceById.get(content.offeringId);
        const offeringId = sourceOffering ? copiedByKey.get(sourceOffering.rowKey) : undefined;
        if (!offeringId) return [];
        return [{
          schoolId,
          offeringId,
          courseId: content.courseId,
          unitsJson: content.unitsJson,
          status: content.status,
          sourceModel: content.sourceModel,
          promptVersion: content.promptVersion,
          inputTokens: content.inputTokens,
          outputTokens: content.outputTokens,
          reviewerId: content.reviewerId,
          reviewedAt: content.reviewedAt,
          publishedAt: content.publishedAt,
          errorMessage: content.errorMessage,
        }];
      }));
    }
  }
  return getCurriculumManagementState(schoolId, draft.id);
}

export async function publishCurriculumVersion(schoolId: string, adminId: string, versionId: string) {
  const state = await getCurriculumManagementState(schoolId, versionId);
  const target = state.selectedVersion?.id === versionId ? state.selectedVersion : null;
  if (!target || target.status !== "DRAFT") throw new Error("공개할 수 있는 교육과정 초안이 아닙니다.");
  const selectedItems = target.items.filter((item) => item.enabled);
  if (selectedItems.length === 0) {
    throw new Error("학생에게 공개할 과목을 하나 이상 선택해 주세요.");
  }
  if (selectedItems.some((item) => !item.contentCourseCode)) {
    throw new Error("선택한 모든 과목의 콘텐츠를 생성하고 검토·공개한 후 교육과정을 공개해 주세요.");
  }
  if (selectedItems.some((item) => item.reviewRequired)) {
    throw new Error("확인 필요 표시가 있는 과목을 검토한 후 공개해 주세요.");
  }

  if (!db) {
    const versions = memoryVersions.get(schoolId)!;
    for (const version of versions) {
      if (version.status === "PUBLISHED") version.status = "ARCHIVED";
    }
    const version = versions.find((item) => item.id === versionId)!;
    version.status = "PUBLISHED";
    version.publishedAt = nowIso();
    version.updatedAt = nowIso();
    return getCurriculumManagementState(schoolId, versionId);
  }

  await db.update(schoolCurriculumVersions)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(and(
      eq(schoolCurriculumVersions.schoolId, schoolId),
      eq(schoolCurriculumVersions.status, "PUBLISHED"),
      ne(schoolCurriculumVersions.id, versionId),
    ));
  await db.update(schoolCurriculumVersions).set({
    status: "PUBLISHED",
    publishedBy: await knownAdminId(schoolId, adminId),
    publishedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(schoolCurriculumVersions.id, versionId), eq(schoolCurriculumVersions.schoolId, schoolId)));
  await db.update(curriculumImports)
    .set({ status: "COMPLETED", updatedAt: new Date() })
    .where(eq(curriculumImports.versionId, versionId));
  return getCurriculumManagementState(schoolId, versionId);
}

async function legacyContentCodes(schoolId: string) {
  const defaultCodes = () => new Set(defaultItems()
    .filter((item) => item.enabled)
    .map((item) => item.contentCourseCode)
    .filter((code): code is string => Boolean(code)));
  if (!db) {
    return defaultCodes();
  }
  const rows = await db.select({ contentCourseCode: schoolCourseSelections.contentCourseCode })
    .from(schoolCourseSelections)
    .where(and(eq(schoolCourseSelections.schoolId, schoolId), eq(schoolCourseSelections.enabled, true)));
  if (rows.length === 0) return defaultCodes();
  return new Set(rows.map((row) => row.contentCourseCode).filter((code): code is string => Boolean(code)));
}

export async function getSchoolLearningUnits(schoolId: string) {
  let enabledCourseCodes: Set<string>;
  let generatedUnits: typeof learningUnits = [];
  if (!db) {
    ensureMemoryDefault(schoolId);
    const active = memoryVersions.get(schoolId)!.find((version) => version.status === "PUBLISHED");
    enabledCourseCodes = new Set(active?.items
      .filter((item) => item.enabled)
      .map((item) => item.contentCourseCode)
      .filter((code): code is string => Boolean(code)) ?? []);
  } else {
    const [active] = await db.select({ id: schoolCurriculumVersions.id })
      .from(schoolCurriculumVersions)
      .where(and(
        eq(schoolCurriculumVersions.schoolId, schoolId),
        eq(schoolCurriculumVersions.status, "PUBLISHED"),
      ))
      .orderBy(desc(schoolCurriculumVersions.publishedAt))
      .limit(1);
    if (!active) enabledCourseCodes = await legacyContentCodes(schoolId);
    else {
      const rows = await db.select({ contentCourseCode: schoolCourseOfferings.contentCourseCode })
        .from(schoolCourseOfferings)
        .where(and(
          eq(schoolCourseOfferings.versionId, active.id),
          eq(schoolCourseOfferings.enabled, true),
        ));
      enabledCourseCodes = new Set(rows
        .map((row) => row.contentCourseCode)
        .filter((code): code is string => Boolean(code)));
      const generatedRows = await db.select({
        id: units.id,
        code: units.code,
        title: units.title,
        chapterTitle: units.chapterTitle,
        chapterOrder: units.chapterOrder,
        sectionTitle: units.sectionTitle,
        sectionOrder: units.sectionOrder,
        topicOrder: units.topicOrder,
        courseCode: courses.code,
        courseTitle: courses.title,
        courseOverview: courses.overview,
        courseOrder: courses.displayOrder,
        grade: courses.grade,
        curriculum: curriculumVersions.title,
        subjectCode: subjects.code,
        subjectTitle: subjects.title,
        publisherName: courses.publisherName,
        sourceUrl: units.sourceUrl,
        summary: unitContents.summaryMarkdown,
        keyPoints: unitContents.keyPoints,
        formulas: unitContents.formulas,
        examples: unitContents.examples,
        recommendedQuestions: units.recommendedQuestions,
        keywords: units.keywords,
        prerequisites: units.prerequisites,
        commonMistakes: units.commonMistakes,
        scopeExcluded: units.scopeExcluded,
        assessmentTags: units.assessmentTags,
        tutorInstructions: units.tutorPrompt,
      })
        .from(generatedCourseContents)
        .innerJoin(
          schoolCourseOfferings,
          eq(schoolCourseOfferings.id, generatedCourseContents.offeringId),
        )
        .innerJoin(courses, eq(courses.id, generatedCourseContents.courseId))
        .innerJoin(subjects, eq(subjects.id, courses.subjectId))
        .innerJoin(curriculumVersions, eq(curriculumVersions.id, courses.curriculumVersionId))
        .innerJoin(units, eq(units.courseId, courses.id))
        .innerJoin(unitContents, and(
          eq(unitContents.unitId, units.id),
          eq(unitContents.version, 1),
        ))
        .where(and(
          eq(generatedCourseContents.schoolId, schoolId),
          eq(generatedCourseContents.status, "PUBLISHED"),
          eq(schoolCourseOfferings.versionId, active.id),
          eq(schoolCourseOfferings.enabled, true),
          eq(units.status, "PUBLISHED"),
          eq(unitContents.status, "PUBLISHED"),
        ));
      generatedUnits = generatedRows.map((row) => ({
        ...row,
        title: curriculumTitle(row.title),
        chapterTitle: curriculumTitle(row.chapterTitle),
        sectionTitle: curriculumTitle(row.sectionTitle),
        subjectCode: row.subjectCode as typeof learningUnits[number]["subjectCode"],
        courseCategory: "GENERAL" as const,
        grade: row.grade as 1 | 2 | 3,
        recommendedGrades: [row.grade as 1 | 2 | 3],
        publisherCode: "GENERIC" as const,
        publisherName: row.publisherName || "학교 교육과정",
        schoolAdopted: true,
        schoolPublisherName: row.publisherName || undefined,
        sourceUrl: row.sourceUrl || undefined,
      }));
    }
  }
  const staticUnits = learningUnits.filter((unit) => enabledCourseCodes.has(unit.courseCode));
  const seen = new Set(staticUnits.map((unit) => unit.id));
  return [...staticUnits, ...generatedUnits.filter((unit) => !seen.has(unit.id))];
}

export async function getSchoolLearningUnit(schoolId: string, unitId: string) {
  return (await getSchoolLearningUnits(schoolId)).find((unit) => unit.id === unitId);
}

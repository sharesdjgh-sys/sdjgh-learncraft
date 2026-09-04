import { createHash } from "node:crypto";

export type CourseSourceCacheIdentity = {
  academicYear: number;
  grade: number;
  subjectTitle: string;
  courseTitle: string;
  publisherName: string;
  textbookTitle: string | null;
};

const SHARED_SOURCE_CACHE_VERSION = 1;
const CURRICULUM_REVISION = "2022";

function normalizeCacheText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/주식회사|㈜|\(주\)/g, "")
    .replace(/[\s()[\]{}·ㆍ_.\-/]/g, "")
    .trim();
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Shared across schools because scheduling year and grade do not identify a textbook. */
export function sharedCourseSourceFingerprint(input: CourseSourceCacheIdentity) {
  return hash({
    version: SHARED_SOURCE_CACHE_VERSION,
    curriculumRevision: CURRICULUM_REVISION,
    canonicalTextbookTitle: normalizeCacheText(input.textbookTitle || input.courseTitle),
    publisherName: normalizeCacheText(input.publisherName),
  });
}

/** Reads offering-scoped cache rows created before shared caching was introduced. */
export function legacyCourseSourceFingerprint(input: CourseSourceCacheIdentity) {
  return hash({
    academicYear: input.academicYear,
    grade: input.grade,
    subjectTitle: input.subjectTitle.trim(),
    courseTitle: input.courseTitle.trim(),
    publisherName: input.publisherName.trim(),
    textbookTitle: input.textbookTitle?.trim() || null,
  });
}

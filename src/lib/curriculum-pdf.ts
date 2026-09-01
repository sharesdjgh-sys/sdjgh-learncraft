import { createHash } from "node:crypto";
import { extractTextItems, getDocumentProxy } from "unpdf";
import { findContentCourseCode, normalizeCourseName } from "@/lib/course-content-match";
import type { CurriculumOffering } from "@/types/curriculum-management";

const SUBJECT_CODES: Record<string, string> = {
  국어: "KOREAN",
  수학: "MATH",
  영어: "ENGLISH",
  사회: "SOCIAL",
  역사: "SOCIAL",
  도덕: "SOCIAL",
  과학: "SCIENCE",
  예체능: "ARTS",
  체육: "ARTS",
  음악: "ARTS",
  미술: "ARTS",
  기술가정: "TECHNOLOGY_HOME",
  정보: "INFORMATICS",
  제2외국어: "SECOND_LANGUAGE",
  한문: "SECOND_LANGUAGE",
  진로: "CAREER",
};

const HEADER_LABELS = new Set(["학년", "교과", "과목", "과목명", "출판사", "교재명"]);

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalized(value: string) {
  return normalizeCourseName(clean(value));
}

function subjectFromLabel(label: string) {
  const title = clean(label).replace(/교과$/, "").replace(/과$/, "");
  const compact = title.replace(/\s/g, "");
  const known = Object.entries(SUBJECT_CODES).find(([name]) => compact.includes(name));
  return { code: known?.[1] ?? `OTHER_${compact || "SUBJECT"}`, title: title || "기타" };
}

function rowKeyFor(
  grade: number,
  subjectCode: string,
  courseTitle: string,
  publisherName: string,
  order: number,
) {
  return createHash("sha256")
    .update(`${grade}:${subjectCode}:${normalized(courseTitle)}:${normalized(publisherName)}:${order}`)
    .digest("hex")
    .slice(0, 24);
}

type PositionedItem = {
  str: string;
  x: number;
  y: number;
  hasEOL: boolean;
};

export async function parseCurriculumPdf(data: Uint8Array) {
  const pdf = await getDocumentProxy(data, { maxImageSize: 16_777_216 });
  if (pdf.numPages > 30) throw new Error("교육과정 자료는 30페이지 이하의 PDF만 업로드할 수 있습니다.");

  const { totalPages, items: pages } = await extractTextItems(pdf);
  const offerings: CurriculumOffering[] = [];
  let grade: 1 | 2 | 3 | null = null;
  let subject = { code: "OTHER_SUBJECT", title: "기타" };
  let pendingCourse = "";
  let pendingY: number | null = null;

  const addOffering = (publisherName: string) => {
    const courseTitle = clean(pendingCourse);
    const publisher = clean(publisherName).replace(/^㈜/, "");
    pendingCourse = "";
    pendingY = null;
    if (!grade || !courseTitle || HEADER_LABELS.has(courseTitle) || /전년과\s*동일/.test(courseTitle)) return;
    const contentCourseCode = findContentCourseCode(grade, courseTitle);
    const reviewRequired = subject.code.startsWith("OTHER_") || !publisher;
    const displayOrder = offerings.length;
    offerings.push({
      rowKey: rowKeyFor(grade, subject.code, courseTitle, publisher, displayOrder),
      grade,
      subjectCode: subject.code,
      subjectTitle: subject.title,
      courseTitle,
      publisherName: publisher,
      textbookTitle: null,
      contentCourseCode,
      enabled: true,
      confidence: reviewRequired ? 70 : 95,
      reviewRequired,
      displayOrder,
    });
  };

  for (const page of pages as PositionedItem[][]) {
    const meaningful = page.filter((item) => clean(item.str));
    const headerCourseX = meaningful.find((item) => ["과목", "과목명"].includes(clean(item.str)))?.x;
    const headerPublisherX = meaningful.find((item) => clean(item.str) === "출판사")?.x;
    const courseStart = headerCourseX ? headerCourseX - 45 : 235;
    const publisherStart = headerPublisherX ? (headerCourseX! + headerPublisherX) / 2 : 350;

    for (const item of meaningful) {
      const value = clean(item.str);
      if (HEADER_LABELS.has(value)) continue;

      const gradeMatch = value.match(/^([1-3])학년(?:\s|$)/);
      if (gradeMatch) {
        if (pendingCourse) addOffering("");
        grade = Number(gradeMatch[1]) as 1 | 2 | 3;
        continue;
      }

      if (item.x > 140 && item.x < courseStart && !/전년과\s*동일/.test(value)) {
        if (pendingCourse) addOffering("");
        subject = subjectFromLabel(value);
        continue;
      }

      if (item.x >= publisherStart) {
        if (pendingCourse) addOffering(value);
        continue;
      }

      if (item.x >= courseStart) {
        if (pendingCourse && pendingY !== null && Math.abs(item.y - pendingY) > 5) addOffering("");
        pendingCourse = clean(`${pendingCourse} ${value}`);
        pendingY = item.y;
      }
    }
  }

  if (pendingCourse) addOffering("");
  if (offerings.length === 0) {
    throw new Error("표에서 과목 정보를 찾지 못했습니다. 텍스트를 선택할 수 있는 PDF인지 확인해 주세요.");
  }

  return { totalPages, offerings };
}

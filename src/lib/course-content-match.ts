import { schoolCourseCatalog } from "@/data/school-course-catalog";

export function normalizeCourseName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[㈜()·\s]/g, "")
    .replace(/[Ⅰⅰ]/g, "1")
    .replace(/[Ⅱⅱ]/g, "2")
    .replace(/[Ⅲⅲ]/g, "3")
    .toLocaleLowerCase("ko-KR");
}

export function findContentCourseCode(grade: number, courseTitle: string) {
  const target = normalizeCourseName(courseTitle);
  const exact = schoolCourseCatalog.find(
    (item) => item.grade === grade && normalizeCourseName(item.courseTitle) === target,
  );
  return exact?.contentCourseCode ?? null;
}


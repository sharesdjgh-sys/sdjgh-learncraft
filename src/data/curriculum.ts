import { languageLearningUnits } from "@/data/language-curriculum";
import { mathLearningUnits } from "@/data/math-curriculum";
import type { LearningUnit, SubjectCode } from "@/types";

export const subjects: Array<{ code: SubjectCode; title: string; short: string }> = [
  { code: "KOREAN", title: "국어", short: "국" },
  { code: "ENGLISH", title: "영어", short: "영" },
  { code: "MATH", title: "수학", short: "수" },
];

const SUPPORTED_MATH_COURSES = new Set(["CM1", "CM2", "ALG", "PSTAT", "CALC1", "GEO"]);

const supportedMathLearningUnits = mathLearningUnits.filter((unit) => SUPPORTED_MATH_COURSES.has(unit.courseCode));

export const learningUnits: LearningUnit[] = [
  ...supportedMathLearningUnits,
  ...languageLearningUnits,
];

export function getUnit(unitId: string) {
  return learningUnits.find((unit) => unit.id === unitId);
}

export function getUnits(grade?: number, subjectCode?: SubjectCode, courseCode?: string) {
  if (grade !== undefined && grade !== 1 && grade !== 2) return [];
  return learningUnits.filter((unit) => (
    (!grade || unit.recommendedGrades.includes(grade as 1 | 2 | 3))
    && (!subjectCode || unit.subjectCode === subjectCode)
    && (!courseCode || unit.courseCode === courseCode)
  ));
}

export function getCourseOptions(grade?: number, subjectCode?: SubjectCode) {
  const seen = new Set<string>();
  return getUnits(grade, subjectCode)
    .filter((unit) => {
      if (seen.has(unit.courseCode)) return false;
      seen.add(unit.courseCode);
      return true;
    })
    .map((unit) => ({
      code: unit.courseCode,
      title: unit.courseTitle,
      category: unit.courseCategory,
      order: unit.courseOrder,
      publisherName: unit.publisherName,
      schoolAdopted: unit.schoolAdopted,
      schoolPublisherName: unit.schoolPublisherName,
      topicCount: getUnits(grade, subjectCode, unit.courseCode).length,
    }))
    .sort((a, b) => a.order - b.order);
}

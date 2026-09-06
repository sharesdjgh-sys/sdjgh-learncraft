import type { LearningUnit } from "@/types";

type OutlineTopic = Pick<LearningUnit,
  "id" | "code" | "title" | "chapterTitle" | "chapterOrder" | "sectionTitle" | "sectionOrder" | "topicOrder"
>;
type OutlineCourse = Pick<LearningUnit,
  "courseCode" | "courseTitle" | "courseCategory" | "courseOrder" | "grade" | "recommendedGrades"
  | "subjectCode" | "subjectTitle" | "curriculum" | "publisherCode" | "publisherName"
  | "schoolAdopted" | "schoolPublisherName"
>;

export type LearningOutline = Array<{ course: OutlineCourse; topics: OutlineTopic[] }>;

// Course metadata is shared by every topic; transmit it once per course.
export function packLearningOutline(units: LearningUnit[]): LearningOutline {
  const groups = new Map<string, LearningOutline[number]>();
  for (const unit of units) {
    let group = groups.get(unit.courseCode);
    if (!group) {
      group = {
        course: {
          courseCode: unit.courseCode,
          courseTitle: unit.courseTitle,
          courseCategory: unit.courseCategory,
          courseOrder: unit.courseOrder,
          grade: unit.grade,
          recommendedGrades: unit.recommendedGrades,
          subjectCode: unit.subjectCode,
          subjectTitle: unit.subjectTitle,
          curriculum: unit.curriculum,
          publisherCode: unit.publisherCode,
          publisherName: unit.publisherName,
          schoolAdopted: unit.schoolAdopted,
          schoolPublisherName: unit.schoolPublisherName,
        },
        topics: [],
      };
      groups.set(unit.courseCode, group);
    }
    group.topics.push({
      id: unit.id,
      code: unit.code,
      title: unit.title,
      chapterTitle: unit.chapterTitle,
      chapterOrder: unit.chapterOrder,
      sectionTitle: unit.sectionTitle,
      sectionOrder: unit.sectionOrder,
      topicOrder: unit.topicOrder,
    });
  }
  return [...groups.values()];
}

export function expandLearningOutline(outline: LearningOutline): LearningUnit[] {
  return outline.flatMap(({ course, topics }) => topics.map((topic) => ({
    ...course,
    ...topic,
    courseOverview: "",
    summary: "",
    keyPoints: [],
    formulas: [],
    examples: [],
    recommendedQuestions: [],
    keywords: [],
    prerequisites: [],
    commonMistakes: [],
    scopeExcluded: [],
    assessmentTags: [],
    tutorInstructions: "",
  })));
}

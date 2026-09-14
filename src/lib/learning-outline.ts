import type { LearningUnit } from "@/types";

type OutlineTopic = Pick<LearningUnit, "id" | "title" | "topicOrder">;
type OutlineSection = { title: string; order: number; topics: OutlineTopic[] };
type OutlineChapter = { title: string; order: number; sections: OutlineSection[] };
type OutlineCourse = Pick<LearningUnit,
  "courseCode" | "courseTitle" | "courseCategory" | "courseOrder" | "grade" | "recommendedGrades"
  | "subjectCode" | "subjectTitle" | "curriculum" | "publisherCode" | "publisherName"
  | "schoolAdopted" | "schoolPublisherName"
>;

export type LearningOutline = Array<{ course: OutlineCourse; chapters: OutlineChapter[] }>;
export type ExpandedOutlineTopic = OutlineTopic & Pick<LearningUnit,
  "chapterTitle" | "chapterOrder" | "sectionTitle" | "sectionOrder"
>;

// Chapter and section names are transmitted once instead of being repeated for every topic.
export function packLearningOutline(units: LearningUnit[]): LearningOutline {
  const courses = new Map<string, LearningOutline[number]>();
  for (const unit of units) {
    let group = courses.get(unit.courseCode);
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
        chapters: [],
      };
      courses.set(unit.courseCode, group);
    }
    let chapter = group.chapters.find((item) => item.order === unit.chapterOrder);
    if (!chapter) {
      chapter = { title: unit.chapterTitle, order: unit.chapterOrder, sections: [] };
      group.chapters.push(chapter);
    }
    let section = chapter.sections.find((item) => item.order === unit.sectionOrder);
    if (!section) {
      section = { title: unit.sectionTitle, order: unit.sectionOrder, topics: [] };
      chapter.sections.push(section);
    }
    section.topics.push({ id: unit.id, title: unit.title, topicOrder: unit.topicOrder });
  }
  return [...courses.values()];
}

export function flattenOutlineTopics(item: LearningOutline[number]): ExpandedOutlineTopic[] {
  return item.chapters.flatMap((chapter) => chapter.sections.flatMap((section) => section.topics.map((topic) => ({
    ...topic,
    chapterTitle: chapter.title,
    chapterOrder: chapter.order,
    sectionTitle: section.title,
    sectionOrder: section.order,
  }))));
}

export function expandLearningOutline(outline: LearningOutline): LearningUnit[] {
  return outline.flatMap((item) => flattenOutlineTopics(item).map((topic) => ({
    ...item.course,
    ...topic,
    code: "",
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

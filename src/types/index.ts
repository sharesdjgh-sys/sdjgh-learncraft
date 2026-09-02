export type UserRole = "STUDENT" | "ADMIN";
export type SubjectCode =
  | "KOREAN"
  | "ENGLISH"
  | "MATH"
  | "SOCIAL"
  | "SCIENCE"
  | "ARTS"
  | "TECHNOLOGY_HOME"
  | "INFORMATICS"
  | "SECOND_LANGUAGE"
  | "CAREER"
  | `OTHER_${string}`;
export type TutorAction = "QUESTION" | "EASIER" | "DEEPER" | "REVEAL" | "QUIZ";
export type LearningLevel = "SUMMARY" | "FOUNDATION" | "STANDARD" | "ADVANCED";
export type CourseCategory = "COMMON" | "GENERAL" | "CAREER" | "LEGACY";
export type PublisherCode = "VISANG" | "DONGA" | "MIRAE" | "JIHAKSA" | "CHANGBI" | "HAENAM" | "GENERIC";

export type SessionUser = {
  id: string;
  externalId: string;
  schoolId: string;
  name: string;
  schoolName: string;
  role: UserRole;
  officialGrade: 1 | 2 | 3 | null;
  learningGrade: 1 | 2 | 3 | null;
};

export type LearningUnit = {
  id: string;
  code: string;
  title: string;
  subjectCode: SubjectCode;
  subjectTitle: string;
  courseCode: string;
  courseTitle: string;
  courseOverview?: string;
  courseCategory: CourseCategory;
  courseOrder: number;
  chapterTitle: string;
  chapterOrder: number;
  sectionTitle: string;
  sectionOrder: number;
  topicOrder: number;
  grade: 1 | 2 | 3;
  recommendedGrades: Array<1 | 2 | 3>;
  curriculum: string;
  publisherCode: PublisherCode;
  publisherName: string;
  schoolAdopted: boolean;
  schoolPublisherName?: string;
  sourceUrl?: string;
  summary: string;
  keyPoints: string[];
  formulas: Array<{ name: string; expression: string; explanation: string }>;
  examples: Array<{ title: string; body: string }>;
  recommendedQuestions: string[];
  keywords: string[];
  prerequisites: string[];
  commonMistakes: string[];
  scopeExcluded: string[];
  assessmentTags: string[];
  tutorInstructions: string;
};

export type Bookmark = {
  id: string;
  studentId: string;
  unitId: string;
  clientAnswerId: string;
  answerMarkdown: string;
  answerMode: TutorAction;
  title: string;
  subjectTitle: string;
  unitTitle: string;
  createdAt: string;
};

export type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageNames?: string[];
  action?: TutorAction;
  completed?: boolean;
};

export type TutorContextMessage = Pick<TutorMessage, "role" | "content">;

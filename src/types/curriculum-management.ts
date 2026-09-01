export type CurriculumVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CurriculumOffering = {
  id?: string;
  rowKey: string;
  grade: 1 | 2 | 3;
  subjectCode: string;
  subjectTitle: string;
  courseTitle: string;
  publisherName: string;
  textbookTitle?: string | null;
  contentCourseCode?: string | null;
  enabled: boolean;
  confidence: number;
  reviewRequired: boolean;
  displayOrder: number;
  generatedContent?: {
    status: "DRAFT" | "DEVELOPER_REVIEWED" | "TEACHER_REVIEWED" | "PUBLISHED";
    unitCount: number;
    sourceModel: string | null;
    updatedAt: string;
  } | null;
};

export type CurriculumVersionSummary = {
  id: string;
  academicYear: number;
  revision: number;
  title: string;
  status: CurriculumVersionStatus;
  sourceFileName: string | null;
  courseCount: number;
  selectedCount: number;
  contentReadyCount: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type CurriculumVersionDetail = CurriculumVersionSummary & {
  items: CurriculumOffering[];
};

export type CurriculumManagementState = {
  activeVersionId: string | null;
  selectedVersion: CurriculumVersionDetail | null;
  versions: CurriculumVersionSummary[];
};

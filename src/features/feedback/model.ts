import { z } from "zod";

export const categories = { BUG: "버그 신고", IMPROVEMENT: "개선 제안", QUESTION: "이용 문의" } as const;
export const statuses = { RECEIVED: "접수", IN_PROGRESS: "처리 중", COMPLETED: "처리 완료" } as const;
export const feedbackCurriculumLocationSchema = z.object({
  unitId: z.string().trim().min(1).max(200),
  courseCode: z.string().trim().min(1).max(100),
  courseTitle: z.string().trim().min(1).max(160),
  subjectTitle: z.string().trim().min(1).max(60),
  grade: z.number().int().min(1).max(3),
  chapterTitle: z.string().trim().min(1).max(200),
  sectionTitle: z.string().trim().min(1).max(200),
  unitTitle: z.string().trim().min(1).max(240),
}).strict();
/** Where in 교사 지원실 a teacher was when sending feedback; `tab` is the active sub-tool, if the page has tabs. */
export const feedbackToolLocationSchema = z.object({
  subject: z.string().trim().min(1).max(20),
  tool: z.string().trim().min(1).max(40),
  tab: z.string().trim().min(1).max(60).nullable().default(null),
  path: z.string().trim().max(300).regex(/^\/teacher(?:[/?]|$)/),
}).strict();
export const createFeedbackSchema = z.object({
  requestId: z.string().uuid(),
  category: z.enum(["BUG", "IMPROVEMENT", "QUESTION"]),
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(3000),
  curriculumLocation: feedbackCurriculumLocationSchema.nullable().optional().default(null),
  toolLocation: feedbackToolLocationSchema.nullable().optional().default(null),
}).strict();
export const updateFeedbackSchema = z.object({
  status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED"]),
  reply: z.string().trim().max(3000),
  version: z.number().int().positive(),
}).strict();
export const feedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  status: z.enum(["ALL", "RECEIVED", "IN_PROGRESS", "COMPLETED"]).default("ALL"),
  category: z.enum(["ALL", "BUG", "IMPROVEMENT", "QUESTION"]).default("ALL"),
  role: z.enum(["ALL", "STUDENT", "TEACHER"]).default("ALL"),
  source: z.enum(["ALL", "LEARNING", "TEACHER_TOOLS"]).default("ALL"),
  authorId: z.string().uuid().optional(),
  q: z.string().trim().max(80).default(""),
  sort: z.enum(["new", "old"]).default("new"),
});
export type FeedbackItem = {
  images: { id: string; width: number; height: number; size: number }[];
  curriculumLocation: FeedbackCurriculumLocation | null;
  toolLocation: FeedbackToolLocation | null;
  id: string; category: keyof typeof categories; title: string; content: string;
  status: keyof typeof statuses; reply: string; version: number;
  createdAt: string; updatedAt: string; completedAt: string | null;
  studentName: string; studentExternalId: string;
  authorId: string; authorRole: "STUDENT" | "TEACHER"; authorGrade: number | null; handlerName: string | null;
};
export type FeedbackCurriculumLocation = z.infer<typeof feedbackCurriculumLocationSchema>;
export type FeedbackToolLocation = z.infer<typeof feedbackToolLocationSchema>;
export type FeedbackCounts = Record<"ALL" | keyof typeof statuses, number>;
/** `counts` ignore the status filter so every status tab can show its total under the other filters. */
export type FeedbackPage = { items: FeedbackItem[]; page: number; hasMore: boolean; total: number; counts: FeedbackCounts };

export type StoredFeedbackImage = FeedbackItem["images"][number] & { key: string; provider: "local" | "blob" };

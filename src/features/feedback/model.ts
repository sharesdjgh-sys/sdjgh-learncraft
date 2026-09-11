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
export const createFeedbackSchema = z.object({
  requestId: z.string().uuid(),
  category: z.enum(["BUG", "IMPROVEMENT", "QUESTION"]),
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(3000),
  curriculumLocation: feedbackCurriculumLocationSchema.nullable().optional().default(null),
}).strict();
export const updateFeedbackSchema = z.object({
  status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED"]),
  reply: z.string().trim().max(3000),
  version: z.number().int().positive(),
}).strict();
export const feedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  status: z.enum(["ALL", "RECEIVED", "IN_PROGRESS", "COMPLETED"]).default("ALL"),
});
export type FeedbackItem = {
  images: { id: string; width: number; height: number; size: number }[];
  curriculumLocation: FeedbackCurriculumLocation | null;
  id: string; category: keyof typeof categories; title: string; content: string;
  status: keyof typeof statuses; reply: string; version: number;
  createdAt: string; updatedAt: string; completedAt: string | null;
  studentName: string; studentExternalId: string;
};
export type FeedbackCurriculumLocation = z.infer<typeof feedbackCurriculumLocationSchema>;
export type FeedbackPage = { items: FeedbackItem[]; page: number; hasMore: boolean };

export type StoredFeedbackImage = FeedbackItem["images"][number] & { key: string; provider: "local" | "blob" };

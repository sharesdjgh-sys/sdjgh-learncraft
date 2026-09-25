import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolLearningUnit } from "@/data/school-curriculum";
import { requireLearner } from "@/lib/auth";
import { containsInlineImageData } from "@/lib/bookmark-content";
import { observedJson } from "@/lib/observability";
import { listStudentQuizMistakes, saveStudentQuizMistake } from "@/features/quiz-mistakes/repository";

const saveSchema = z.object({
  // A quiz card uses its answer id; a check question adds its position, e.g. "<uuid>:c0".
  clientQuizId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?::c\d{1,2})?$/i),
  unitId: z.string().min(1).max(100),
  problemMarkdown: z.string().trim().min(1).max(6000)
    .refine((value) => !containsInlineImageData(value), "INLINE_IMAGE_NOT_ALLOWED"),
  studentAnswer: z.string().trim().min(1).max(1000),
  correctAnswer: z.string().trim().min(1).max(3000),
  attempts: z.number().int().min(1).max(99),
  hintsUsed: z.number().int().min(0).max(3),
  confusions: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  note: z.string().trim().max(300).default(""),
  resolved: z.boolean().default(false),
});

export async function GET() {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const items = await listStudentQuizMistakes(user.id, user.schoolId);
  return observedJson({ items }, { route: "quiz-mistakes.list", budgetBytes: 400_000, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "기록할 내용을 확인해 주세요." } }, { status: 400 });
  }
  const unit = await getSchoolLearningUnit(user.schoolId, parsed.data.unitId);
  if (!unit) return NextResponse.json({ error: { code: "UNIT_NOT_AVAILABLE" } }, { status: 404 });
  const item = await saveStudentQuizMistake(user.id, user.schoolId, parsed.data);
  return observedJson({ item }, { route: "quiz-mistakes.save", budgetBytes: 12_000 });
}

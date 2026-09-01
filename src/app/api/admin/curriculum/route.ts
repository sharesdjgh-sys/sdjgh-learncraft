import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurriculumManagementState, saveCurriculumDraft } from "@/data/school-curriculum";
import { requireAdmin } from "@/lib/auth";

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  rowKey: z.string().min(1).max(120),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  subjectCode: z.string().min(1).max(60),
  subjectTitle: z.string().min(1).max(60),
  courseTitle: z.string().min(1).max(160),
  publisherName: z.string().max(160),
  textbookTitle: z.string().max(200).nullable().optional(),
  contentCourseCode: z.string().max(60).nullable().optional(),
  enabled: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  reviewRequired: z.boolean(),
  displayOrder: z.number().int().min(0),
});

const updateSchema = z.object({
  versionId: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(300),
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const versionId = new URL(request.url).searchParams.get("versionId") ?? undefined;
  return NextResponse.json(await getCurriculumManagementState(admin.schoolId, versionId));
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "과목 정보를 다시 확인해 주세요." } },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await saveCurriculumDraft(
      admin.schoolId,
      parsed.data.versionId,
      parsed.data.items,
    ));
  } catch (error) {
    return NextResponse.json({
      error: {
        code: "CURRICULUM_SAVE_FAILED",
        message: error instanceof Error ? error.message : "교육과정 초안을 저장하지 못했습니다.",
      },
    }, { status: 400 });
  }
}

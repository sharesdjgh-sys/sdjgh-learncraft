import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSchoolCurriculumState,
  saveSchoolCurriculumSelection,
} from "@/data/school-curriculum";
import { requireAdmin } from "@/lib/auth";

const inputSchema = z.object({
  selectedKeys: z.array(z.string().min(1).max(120)).max(100),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  return NextResponse.json(await getSchoolCurriculumState(admin.schoolId));
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "선택한 과목 정보를 확인해 주세요." } },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await saveSchoolCurriculumSelection(admin.schoolId, parsed.data.selectedKeys),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "CURRICULUM_SELECTION_INVALID",
          message: error instanceof Error ? error.message : "교육과정 설정을 저장하지 못했습니다.",
        },
      },
      { status: 400 },
    );
  }
}

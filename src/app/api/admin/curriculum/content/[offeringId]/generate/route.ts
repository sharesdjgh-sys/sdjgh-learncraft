import { NextResponse } from "next/server";
import {
  getOfferingForGeneration,
  saveGeneratedCourseDraft,
} from "@/data/generated-course-content";
import { generateCourseContent } from "@/features/admin/generate-course-content";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ offeringId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const { offeringId } = await params;
  try {
    const body = await request.json().catch(() => null) as { refreshSources?: unknown } | null;
    const refreshSources = body?.refreshSources === true;
    const offering = await getOfferingForGeneration(admin.schoolId, offeringId);
    const generated = await generateCourseContent(offering, { refreshSources });
    return NextResponse.json(await saveGeneratedCourseDraft({
      schoolId: admin.schoolId,
      offering,
      ...generated,
    }));
  } catch (error) {
    console.error("Course content generation failed", {
      offeringId,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json({ error: {
      code: "CONTENT_GENERATION_FAILED",
      message: error instanceof Error && error.message.includes("response did not match schema")
        ? "AI 응답의 일부 항목이 콘텐츠 형식에 맞지 않았습니다. 다시 생성해 주세요."
        : error instanceof Error ? error.message : "AI 콘텐츠를 만들지 못했습니다.",
    } }, { status: 502 });
  }
}

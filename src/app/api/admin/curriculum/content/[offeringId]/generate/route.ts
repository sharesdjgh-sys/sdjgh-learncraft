import { NextResponse } from "next/server";
import {
  getOfferingForGeneration,
  saveGeneratedCourseDraft,
} from "@/data/generated-course-content";
import { generateCourseContent } from "@/features/admin/generate-course-content";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ offeringId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const { offeringId } = await params;
  try {
    const offering = await getOfferingForGeneration(admin.schoolId, offeringId);
    const generated = await generateCourseContent(offering);
    return NextResponse.json(await saveGeneratedCourseDraft({
      schoolId: admin.schoolId,
      offering,
      ...generated,
    }));
  } catch (error) {
    return NextResponse.json({ error: {
      code: "CONTENT_GENERATION_FAILED",
      message: error instanceof Error ? error.message : "AI 콘텐츠를 만들지 못했습니다.",
    } }, { status: 502 });
  }
}


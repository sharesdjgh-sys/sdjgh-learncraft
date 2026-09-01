import { NextResponse } from "next/server";
import { publishGeneratedCourseContent } from "@/data/generated-course-content";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ offeringId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const { offeringId } = await params;
  try {
    return NextResponse.json(
      await publishGeneratedCourseContent(admin.schoolId, admin.id, offeringId),
    );
  } catch (error) {
    return NextResponse.json({ error: {
      code: "CONTENT_PUBLISH_FAILED",
      message: error instanceof Error ? error.message : "AI 콘텐츠를 공개하지 못했습니다.",
    } }, { status: 400 });
  }
}


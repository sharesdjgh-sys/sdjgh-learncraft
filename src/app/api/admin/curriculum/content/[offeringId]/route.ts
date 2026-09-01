import { NextResponse } from "next/server";
import { getGeneratedCourseContent } from "@/data/generated-course-content";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ offeringId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const { offeringId } = await params;
  try {
    return NextResponse.json(await getGeneratedCourseContent(admin.schoolId, offeringId));
  } catch (error) {
    return NextResponse.json({ error: {
      code: "CONTENT_NOT_FOUND",
      message: error instanceof Error ? error.message : "생성된 콘텐츠를 찾지 못했습니다.",
    } }, { status: 404 });
  }
}


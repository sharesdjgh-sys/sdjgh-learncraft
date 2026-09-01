import { NextResponse } from "next/server";
import { createReviewDraftFromVersion } from "@/data/school-curriculum";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const { versionId } = await params;
  try {
    return NextResponse.json(
      await createReviewDraftFromVersion(admin.schoolId, admin.id, versionId),
    );
  } catch (error) {
    return NextResponse.json({
      error: {
        code: "CURRICULUM_REVIEW_DRAFT_FAILED",
        message: error instanceof Error ? error.message : "수정용 검토본을 만들지 못했습니다.",
      },
    }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { listStudentBookmarkOutline } from "@/features/bookmarks/repository";
import { requireLearner } from "@/lib/auth";
import { observedJson } from "@/lib/observability";

export async function GET() {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  return observedJson({ units: await listStudentBookmarkOutline(user.id, user.schoolId) }, {
    route: "bookmarks.outline", budgetBytes: 128_000, headers: { "Cache-Control": "private, no-store" },
  });
}
